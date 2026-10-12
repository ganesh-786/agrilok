"""Run the golden set through the production pipeline.

    python -m evaluation.run --report reports/summary.json --markdown reports/summary.md

Every question goes through `agrilok_core.pipeline.ask` with the cache off and
nothing stored, so a run measures the pipeline, not yesterday's answers, and
leaves the student-facing cache untouched.

This checks **mechanics**: did each question answer or refuse as expected,
and did an injected instruction leak into an answer. It does not check
**faithfulness**. For every answered row, a person reads the cited source and
judges whether the answer follows from it; the Markdown report has a line for
that judgment (docs/evaluation.md, ADR-0006).

Use the evaluation key, never the production one (services/evaluation/README.md).
"""

from __future__ import annotations

import argparse
import contextlib
import json
import math
import sys
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from agrilok_core.db import run_sync
from agrilok_core.pipeline import AskResult, ask
from agrilok_core.prompt import PROMPT_VERSION
from agrilok_core.quota import QuotaExceededError
from agrilok_core.runtime import Runtime, open_runtime
from evaluation.golden import DEFAULT_PATH, GoldenQuestion, load

HERE = Path(__file__).resolve().parents[2]


@dataclass
class Row:
    id: str
    tier: str
    question: str
    level: str
    level_from_file: bool
    province: str | None
    expected: str | None
    got: str | None = None
    matched: bool = False
    stage: str | None = None
    detail: str | None = None
    answer_text: str | None = None
    citations: list[dict[str, Any]] = field(default_factory=list)
    consulted: list[dict[str, Any]] = field(default_factory=list)
    withheld_answer: str | None = None
    support_check: list[dict[str, Any]] | None = None
    model: str | None = None
    fallback_from: list[dict[str, Any]] = field(default_factory=list)
    forbidden_found: bool = False
    error: str | None = None
    reference_answer: str | None = None
    # Milliseconds per stage and what the provider counted, as the pipeline
    # recorded them for this question (agrilok_core.pipeline.AskResult).
    timings: dict[str, int] = field(default_factory=dict)
    usage: dict[str, int] = field(default_factory=dict)


def _row(q: GoldenQuestion) -> Row:
    return Row(
        id=q.id,
        tier=q.tier,
        question=q.question,
        level=q.level.value,
        level_from_file=q.level_from_file,
        province=q.province,
        expected=q.expected,
        reference_answer=q.reference_answer,
    )


def _fill(row: Row, q: GoldenQuestion, result: AskResult) -> None:
    row.timings = result.timings
    row.usage = result.usage
    # Quota and outages are not the question's answer; they are errors of the
    # run, so they can never count as a correct refusal.
    if result.stage is not None and result.stage.value in {"quota", "unavailable", "model_error"}:
        row.error = f"{result.stage.value}: {result.detail or ''}".strip()
        row.stage = result.stage.value
        return
    row.got = "answer" if result.status == "answered" else "refuse"
    row.stage = result.stage.value if result.stage else None
    row.detail = result.detail
    row.answer_text = result.answer_text
    row.citations = result.citations
    row.consulted = result.consulted
    row.withheld_answer = result.withheld_answer
    row.support_check = result.support_check
    row.model = result.model
    row.fallback_from = result.fallback_from
    if q.must_not_contain:
        row.forbidden_found = q.must_not_contain.lower() in (result.answer_text or "").lower()
    row.matched = (q.expected is None or row.got == q.expected) and not row.forbidden_found


async def evaluate(runtime: Runtime, questions: list[GoldenQuestion]) -> list[Row]:
    rows: list[Row] = []
    for index, q in enumerate(questions, start=1):
        row = _row(q)
        print(f"[{index}/{len(questions)}] {q.id} ", end="", flush=True)
        try:
            result = await ask(
                runtime,
                question=q.question,
                level=q.level,
                province=q.province,
                use_cache=False,
                store=False,
            )
            _fill(row, q, result)
        except QuotaExceededError as exc:
            row.error = f"quota: {exc}"
        except Exception as exc:
            row.error = f"{type(exc).__name__}: {exc}"
        rows.append(row)
        if row.error:
            print(f"ERROR {row.error}")
        else:
            mark = "ok" if row.matched else "MISMATCH"
            print(f"{row.got} (expected {q.expected}) {mark} [{row.model or '-'}]")
        if row.error and row.error.startswith("quota"):
            for rest in questions[index:]:
                skipped = _row(rest)
                skipped.error = "not attempted: quota used up earlier in this run"
                rows.append(skipped)
            print("Stopping: the quota is used up; the remaining questions were not attempted.")
            break
    return rows


def latency(rows: list[Row]) -> dict[str, dict[str, int]]:
    """Time per stage: how many questions ran it, the median, the 90th percentile, the worst.

    Exact milliseconds, unlike the bucketed daily counts, because a run has
    every question's own numbers. Errors are left out: an outage is not how
    long answering takes. With the cache off every question is asked live, so
    this is the time a new question costs, not what a student usually waits.
    """
    by_stage: dict[str, list[int]] = {}
    for row in rows:
        if row.error is None:
            for stage, ms in row.timings.items():
                by_stage.setdefault(stage, []).append(ms)
    report = {}
    for stage, values in sorted(by_stage.items()):
        values.sort()
        report[stage] = {
            "count": len(values),
            "median_ms": values[(len(values) - 1) // 2],
            "p90_ms": values[math.ceil(len(values) * 0.9) - 1],
            "max_ms": values[-1],
        }
    return report


def summarise(rows: list[Row], runtime: Runtime | None = None) -> dict[str, Any]:
    by_tier: dict[str, dict[str, int]] = {}
    for row in rows:
        tier = by_tier.setdefault(row.tier, {"total": 0, "matched": 0, "errors": 0})
        tier["total"] += 1
        tier["matched"] += int(row.matched)
        tier["errors"] += int(row.error is not None)
    settings = runtime.settings if runtime else None
    return {
        "generated_at": datetime.now(tz=UTC).isoformat(),
        "prompt_version": PROMPT_VERSION,
        "settings": {
            "generation_models": settings.generation_models if settings else None,
            "retrieval_top_k": settings.retrieval_top_k if settings else None,
            "retrieval_min_score": settings.retrieval_min_score if settings else None,
            "retrieval_keyword_min_score": settings.retrieval_keyword_min_score
            if settings
            else None,
        },
        "models": dict(Counter(r.model for r in rows if r.model)),
        "latency_ms": latency(rows),
        "usage": dict(sum((Counter(r.usage) for r in rows), Counter())),
        "by_tier": by_tier,
        "matched": sum(int(r.matched) for r in rows),
        "total": len(rows),
        "results": [asdict(r) for r in rows],
    }


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        f"# Golden-set run, {summary['generated_at']}",
        "",
        f"Prompt `{summary['prompt_version']}`, models {summary['settings']['generation_models']}, "
        f"top {summary['settings']['retrieval_top_k']}, "
        f"floor {summary['settings']['retrieval_min_score']}.",
        "",
        f"**{summary['matched']} of {summary['total']} matched expected behaviour.** "
        "Unverified model questions never count toward the gate.",
        "",
        "| Tier | Matched | Total | Errors |",
        "|---|---|---|---|",
    ]
    for tier, counts in summary["by_tier"].items():
        lines.append(f"| {tier} | {counts['matched']} | {counts['total']} | {counts['errors']} |")
    if summary.get("latency_ms"):
        lines += [
            "",
            (
                "Time per stage, in milliseconds, for questions that did not error. The cache "
                "is off, so this is what a new question costs."
            ),
            "",
            "| Stage | Questions | Median | 90th percentile | Slowest |",
            "|---|---|---|---|---|",
        ]
        for stage, t in summary["latency_ms"].items():
            lines.append(
                f"| {stage} | {t['count']} | {t['median_ms']} | {t['p90_ms']} | {t['max_ms']} |"
            )
    if summary.get("usage"):
        spent = ", ".join(f"{name} {count}" for name, count in sorted(summary["usage"].items()))
        lines += ["", f"Counted by the provider over the run: {spent}."]
    lines += [
        "",
        (
            "This checks mechanics only. For every answered row, read the cited source and "
            "write a judgment: FAITHFUL, PARTIALLY FAITHFUL, NOT FAITHFUL or CANNOT ASSESS."
        ),
        "",
    ]
    for r in summary["results"]:
        lines += [f"## {r['id']} ({r['tier']})", "", f"**Question:** {r['question']}", ""]
        scope = r["level"] + (f", {r['province']}" if r["province"] else "")
        if not r["level_from_file"]:
            scope += " (no level in the golden entry; asked at Level 7)"
        lines.append(f"**Asked at:** {scope}")
        lines.append(
            f"**Expected:** {r['expected']}  **Got:** {r['got'] or 'error'}  "
            + ("ok" if r["matched"] else "**MISMATCH**")
        )
        if r["reference_answer"]:
            lines.append(f"**Reference answer:** {r['reference_answer']}")
        if r["model"]:
            lines.append(f"**Model:** {r['model']}")
        lines.append("")
        if r["error"]:
            lines += [f"**ERROR:** {r['error']}", ""]
        elif r["got"] == "answer":
            lines += ["> " + (r["answer_text"] or "").replace("\n", "\n> "), ""]
            for c in r["citations"]:
                lines.append(
                    f"- [{c['n']}] `{c['chunk_id']}` {c['document_title']}, fetched "
                    f"{c['fetched_at']}: {c['resolvable_url']}"
                )
                for quote in c.get("quotes") or []:
                    lines.append(f"  > {quote}")
            lines += ["", "**Faithfulness (by hand):** ____________", ""]
        else:
            lines.append(f"**Refused** at `{r['stage']}`. {r['detail'] or ''}")
            if r["withheld_answer"]:
                lines += ["", "Withheld (never shown to a student):", ""]
                lines.append("> " + r["withheld_answer"].replace("\n", "\n> "))
            lines.append("")
        lines += ["---", ""]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        with contextlib.suppress(AttributeError, ValueError):
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    parser = argparse.ArgumentParser(prog="python -m evaluation.run")
    parser.add_argument("--questions", default=str(DEFAULT_PATH))
    parser.add_argument("--report", default=str(HERE / "reports" / "summary.json"))
    parser.add_argument("--markdown", default=str(HERE / "reports" / "summary.md"))
    parser.add_argument("--only", help="comma-separated question ids")
    args = parser.parse_args(argv)

    questions = load(Path(args.questions))
    if args.only:
        wanted = {i.strip() for i in args.only.split(",")}
        questions = [q for q in questions if q.id in wanted]

    async def run() -> dict[str, Any]:
        runtime = await open_runtime()
        try:
            if not runtime.gemini.configured:
                raise SystemExit("GEMINI_API_KEY is not set; use the evaluation key")
            rows = await evaluate(runtime, questions)
            return summarise(rows, runtime)
        finally:
            await runtime.close()

    summary = run_sync(run)
    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str), "utf-8")
    Path(args.markdown).write_text(render_markdown(summary), "utf-8")
    print(f"\n{summary['matched']} of {summary['total']} matched expected behaviour.")
    for tier, counts in summary["by_tier"].items():
        print(f"  {tier}: {counts['matched']}/{counts['total']} ({counts['errors']} errors)")
    print(f"Answered by model: {summary['models']}")
    print(f"Reports: {report} and {args.markdown}")
    print("Next: read every answered row against its source and judge faithfulness by hand.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
