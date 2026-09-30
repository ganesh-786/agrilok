"""agrilok-ingest: bring documents in, and run the review queue.

    agrilok-ingest import-phase0              import the Phase 0 corpus (queued)
    agrilok-ingest add --manifest F --id D --pdf P
    agrilok-ingest status                     corpus and review queue at a glance
    agrilok-ingest review list | show | admit | verify | reject | issue
    agrilok-ingest embed                      embed admitted chunks that have no vector
    agrilok-ingest answers list | show | verify
    agrilok-ingest pregenerate --file F       answer common questions once, for everyone

Every review decision names a person (--by @handle) and says whether it was
self-review. Nothing here admits or verifies anything by default.
"""

from __future__ import annotations

import argparse
import contextlib
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from agrilok_core.db import Conn, connect, run_sync
from agrilok_core.gemini import GeminiNotConfiguredError
from agrilok_core.quota import QuotaExceededError
from agrilok_core.runtime import open_runtime
from agrilok_core.settings import get_settings
from ingestion import review as rv
from ingestion.add import AddError, add_document
from ingestion.embedding import embed_missing, plan
from ingestion.manifest import ManifestError, load_entries, parse_entry
from ingestion.phase0 import import_phase0
from ingestion.pregenerate import load_questions, pregenerate
from ingestion.store import ensure_source

REPO = Path(__file__).resolve().parents[4]


def _utf8_console() -> None:
    # Windows consoles default to a code page that cannot print Devanagari.
    for stream in (sys.stdout, sys.stderr):
        with contextlib.suppress(AttributeError, ValueError):
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]


def _table(rows: list[dict[str, Any]], columns: list[tuple[str, str]]) -> str:
    if not rows:
        return "(none)"
    cells = [
        [str(r.get(key, "") if r.get(key) is not None else "") for key, _ in columns] for r in rows
    ]
    widths = [max(len(title), *(len(c[i]) for c in cells)) for i, (_, title) in enumerate(columns)]
    head = "  ".join(title.ljust(widths[i]) for i, (_, title) in enumerate(columns))
    lines = ["  ".join(c[i].ljust(widths[i]) for i in range(len(columns))) for c in cells]
    return "\n".join([head, "  ".join("-" * w for w in widths), *lines])


def _with_conn(fn: Callable[[Conn], Awaitable[int]]) -> int:
    async def main() -> int:
        conn = await connect(get_settings())
        try:
            return await fn(conn)
        finally:
            await conn.close()

    return run_sync(main)


# --- commands -------------------------------------------------------------------


def cmd_import_phase0(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        report = await import_phase0(conn, Path(args.spike_dir))
        print(
            f"Imported {len(report.imported)} document(s), {report.chunks} chunks "
            f"({report.embedded} with embeddings, {report.unembedded} without)."
        )
        for doc_id, reason in report.skipped:
            print(f"  skipped {doc_id}: {reason}")
        if report.imported:
            print(
                "\nEverything imported is queued. Nothing answers a question until a person "
                "admits it (ADR-0012):\n  agrilok-ingest review list --admission queued"
            )
        return 0

    return _with_conn(run)


def cmd_add(args: argparse.Namespace) -> int:
    settings = get_settings()
    entries = {str(e.get("id")): e for e in load_entries(Path(args.manifest))}
    if args.id not in entries:
        print(f"error: {args.id} is not in {args.manifest}", file=sys.stderr)
        return 1
    manifest = parse_entry(entries[args.id])

    async def run(conn: Conn) -> int:
        await ensure_source(conn, args.source_id, args.source_name, args.acquisition, "")
        report = await add_document(
            conn,
            manifest,
            Path(args.pdf),
            source_id=args.source_id,
            target_tokens=settings.chunk_target_tokens,
            overlap_ratio=settings.chunk_overlap_ratio,
        )
        print(
            f"Added {report.doc_id}: {report.pages} pages, {report.chunks} chunks, "
            f"extraction confidence {report.confidence:.3f}, "
            f"{report.dropped_lines} legacy-font lines dropped. Queued for review."
        )
        return 0

    return _with_conn(run)


def cmd_status(_: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        cur = await conn.execute(
            """
            select admission, review_state, count(*) as documents,
                   sum((select count(*) from chunks c where c.document_id = d.id)) as chunks
            from documents d group by admission, review_state order by admission, review_state
            """
        )
        print("Documents")
        print(
            _table(
                [dict(r) for r in await cur.fetchall()],
                [
                    ("admission", "admission"),
                    ("review_state", "review state"),
                    ("documents", "documents"),
                    ("chunks", "chunks"),
                ],
            )
        )
        cur = await conn.execute(
            "select count(*) filter (where status = 'open') as open, "
            "min(opened_at) filter (where status = 'open') as oldest from review_items"
        )
        row = await cur.fetchone()
        if row:
            oldest = f"{row['oldest']:%Y-%m-%d}" if row["oldest"] else "n/a"
            print(f"\nOpen review items: {row['open']} (oldest opened {oldest})")
        cur = await conn.execute(
            "select status, review_state, count(*) as answers, sum(served_count) as served "
            "from answers where invalidated_at is null group by status, review_state"
        )
        print("\nCached answers")
        print(
            _table(
                [dict(r) for r in await cur.fetchall()],
                [
                    ("status", "status"),
                    ("review_state", "review state"),
                    ("answers", "answers"),
                    ("served", "times served"),
                ],
            )
        )
        return 0

    return _with_conn(run)


def cmd_review_list(args: argparse.Namespace) -> int:
    settings = get_settings()

    async def run(conn: Conn) -> int:
        docs = await rv.list_documents(conn, args.admission)
        for d in docs:
            blockers = rv.admission_blockers(
                d,
                ocr_min_confidence=settings.ocr_min_confidence,
                compared_against_pdf=False,
                level_confirmed=False,
            )
            d["needs"] = ", ".join(b.code for b in blockers if b.code != "not_queued") or "-"
            d["level"] = d["exam_level"] or "reference"
            d["confidence"] = f"{float(d['extraction_confidence']):.2f}"
        print(
            _table(
                docs,
                [
                    ("id", "id"),
                    ("level", "level"),
                    ("province", "province"),
                    ("admission", "admission"),
                    ("review_state", "review state"),
                    ("chunk_count", "chunks"),
                    ("embedded_count", "embedded"),
                    ("confidence", "confidence"),
                    ("needs", "before admission"),
                ],
            )
        )
        return 0

    return _with_conn(run)


def cmd_review_show(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        from ingestion.store import document_row

        doc = await document_row(conn, args.doc_id)
        if doc is None:
            print(f"error: no document {args.doc_id}", file=sys.stderr)
            return 1
        title, body = rv.issue_markdown(doc)
        print(f"# {title}\n\n{body}")
        return 0

    return _with_conn(run)


def cmd_review_admit(args: argparse.Namespace) -> int:
    settings = get_settings()

    async def run(conn: Conn) -> int:
        if args.all_eligible:
            docs = await rv.list_documents(conn, "queued")
            eligible = [
                d
                for d in docs
                if not rv.admission_blockers(
                    d,
                    ocr_min_confidence=settings.ocr_min_confidence,
                    compared_against_pdf=False,
                    level_confirmed=False,
                )
            ]
            print(
                f"{len(eligible)} of {len(docs)} queued document(s) can be admitted without a "
                "PDF comparison or a level confirmation:"
            )
            print(
                _table(
                    eligible,
                    [
                        ("id", "id"),
                        ("exam_level", "level"),
                        ("province", "province"),
                        ("chunk_count", "chunks"),
                        ("title", "title"),
                    ],
                )
            )
            if not args.yes:
                print(
                    "\nNothing admitted. Read the list, check each document, then re-run with "
                    "--yes to admit them as yourself."
                )
                return 0
            ids = [d["id"] for d in eligible]
        else:
            ids = args.doc_ids
            if not ids:
                print("error: name the document(s), or use --all-eligible", file=sys.stderr)
                return 1
        for doc_id in ids:
            await rv.admit(
                conn,
                doc_id,
                by=args.by,
                ocr_min_confidence=settings.ocr_min_confidence,
                self_review=args.self_review,
                compared_against_pdf=args.compared_against_pdf,
                level_confirmed=args.level_confirmed,
                note=args.note,
            )
            print(
                f"admitted {doc_id} by {args.by}" + (" (self-review)" if args.self_review else "")
            )
        return 0

    return _with_conn(run)


def cmd_review_verify(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        await rv.verify(
            conn,
            args.doc_id,
            by=args.by,
            self_review=args.self_review,
            checklist_done=args.checklist_done,
            note=args.note,
        )
        print(
            f"verified {args.doc_id} by {args.by}" + (" (self-review)" if args.self_review else "")
        )
        return 0

    return _with_conn(run)


def cmd_review_reject(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        invalidated = await rv.reject(conn, args.doc_id, by=args.by, note=args.note)
        print(
            f"rejected {args.doc_id}; {invalidated} cached answer(s) that cited it were withdrawn"
        )
        return 0

    return _with_conn(run)


def cmd_review_issue(args: argparse.Namespace) -> int:
    found: dict[str, Any] = {}

    async def load(conn: Conn) -> int:
        from ingestion.store import document_row

        doc = await document_row(conn, args.doc_id)
        if doc is not None:
            found["doc"] = doc
        return 0

    _with_conn(load)
    if "doc" not in found:
        print(f"error: no document {args.doc_id}", file=sys.stderr)
        return 1
    title, body = rv.issue_markdown(found["doc"])
    if not args.create:
        print(f"{title}\n\n{body}\nPrinted only. Pass --create to open it on GitHub with gh.")
        return 0
    # Opening an issue publishes to GitHub, so it only ever happens on an
    # explicit --create, and runs outside the event loop.
    gh = shutil.which("gh")
    if gh is None:
        print("error: the GitHub CLI (gh) is not installed", file=sys.stderr)
        return 1
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(body)
        body_path = Path(f.name)
    try:
        completed = subprocess.run(  # noqa: S603 - fixed program, arguments from our own data
            [
                gh,
                "issue",
                "create",
                "--title",
                title,
                "--label",
                "content-review",
                "--body-file",
                str(body_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
    finally:
        body_path.unlink(missing_ok=True)
    if completed.returncode != 0:
        print(f"error: gh issue create failed:\n{completed.stderr}", file=sys.stderr)
        return 1
    url = completed.stdout.strip().splitlines()[-1]
    number = int(url.rstrip("/").rsplit("/", 1)[-1])

    async def record(conn: Conn) -> int:
        from ingestion.store import add_event, open_review_item

        item = await open_review_item(conn, "document", args.doc_id)
        await conn.execute(
            "update review_items set github_issue = %s where id = %s", (number, item)
        )
        await add_event(conn, item, "issue_linked", "agrilok-ingest", note=url)
        return 0

    _with_conn(record)
    print(url)
    return 0


def cmd_embed(args: argparse.Namespace) -> int:
    async def main() -> int:
        runtime = await open_runtime()
        try:
            work = await plan(
                runtime,
                include_queued=args.include_queued,
                batch_size=args.batch_size,
                limit=args.limit,
            )
            print(
                f"{len(work.chunk_ids)} chunk(s) without a vector: {work.batches} request(s) "
                f"in batches of {args.batch_size}, {args.pause:.0f}s apart."
            )
            if not work.chunk_ids:
                return 0
            if not args.yes:
                print("Nothing embedded. This spends embedding quota; re-run with --yes.")
                return 0
            done = await embed_missing(
                runtime, work.chunk_ids, batch_size=args.batch_size, pause_seconds=args.pause
            )
            print(f"Embedded {done} chunk(s).")
            return 0
        except QuotaExceededError as exc:
            print(f"stopped: {exc}. Whatever finished is saved; run again after the reset.")
            return 2
        except GeminiNotConfiguredError:
            print("error: GEMINI_API_KEY is not set in .env", file=sys.stderr)
            return 1
        finally:
            await runtime.close()

    return run_sync(main)


def cmd_answers_list(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        cur = await conn.execute(
            """
            select id, exam_level, status, refusal_stage, origin, review_state, served_count,
                   left(question, 70) as question
            from answers
            where invalidated_at is null
              and (not %(pending)s or (status = 'answered'
                   and review_state = 'ai_assisted_pending_review'))
            order by served_count desc, created_at desc
            limit %(limit)s
            """,
            {"pending": args.pending, "limit": args.limit},
        )
        print(
            _table(
                [dict(r) for r in await cur.fetchall()],
                [
                    ("id", "id"),
                    ("exam_level", "level"),
                    ("status", "status"),
                    ("refusal_stage", "why refused"),
                    ("origin", "origin"),
                    ("review_state", "review state"),
                    ("served_count", "served"),
                    ("question", "question"),
                ],
            )
        )
        return 0

    return _with_conn(run)


def cmd_answers_show(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        cur = await conn.execute("select * from answers where id = %s", (args.answer_id,))
        row = await cur.fetchone()
        if row is None:
            print(f"error: no answer {args.answer_id}", file=sys.stderr)
            return 1
        print(f"Question ({row['exam_level']}): {row['question']}")
        print(
            f"Status: {row['status']} {row['refusal_stage'] or ''}  Review: {row['review_state']}"
        )
        print(f"Model: {row['model']}  Prompt: {row['prompt_version']}  Origin: {row['origin']}\n")
        if row["answer_text"]:
            print(row["answer_text"] + "\n")
        for c in row["citations"] or []:
            print(
                f"[{c['n']}] {c['document_title']} ({c['document_id']}), fetched {c['fetched_at']}"
            )
            print(f"    {c['resolvable_url']}")
            for quote in c.get("quotes") or []:
                print(f"    > {quote}")
        if row["withheld_answer"]:
            print(f"\nWithheld (never shown to a student):\n{row['withheld_answer']}")
        return 0

    return _with_conn(run)


def cmd_answers_verify(args: argparse.Namespace) -> int:
    async def run(conn: Conn) -> int:
        await rv.verify_answer(
            conn, args.answer_id, by=args.by, self_review=args.self_review, note=args.note
        )
        print(f"verified answer {args.answer_id} by {args.by}")
        return 0

    return _with_conn(run)


def cmd_pregenerate(args: argparse.Namespace) -> int:
    questions = load_questions(Path(args.file))
    settings = get_settings()
    model = args.model or settings.gemini_pregeneration_model
    print(
        f"{len(questions)} question(s) on {model}. Each uncached question costs one embedding "
        "and at most one generation request."
    )
    if args.dry_run:
        for q in questions:
            print(f"  [{q.level.value}{'/' + q.province if q.province else ''}] {q.question}")
        return 0

    async def main() -> int:
        runtime = await open_runtime()
        try:
            for q in questions:
                try:
                    result = await pregenerate(runtime, q, model)
                except QuotaExceededError as exc:
                    print(f"stopped: {exc}")
                    return 2
                outcome = (
                    "cached already"
                    if result.cache.hit
                    else (
                        "answered" if result.status == "answered" else f"refused ({result.stage})"
                    )
                )
                print(f"  {outcome:<32} {q.question}")
            return 0
        finally:
            await runtime.close()

    return run_sync(main)


# --- parser ---------------------------------------------------------------------------


def _reviewer(parser: argparse.ArgumentParser, *, self_review_required: bool = True) -> None:
    parser.add_argument("--by", required=True, help="your handle, for example @ganesh-786")
    group = parser.add_mutually_exclusive_group(required=self_review_required)
    group.add_argument(
        "--self-review",
        dest="self_review",
        action="store_true",
        help="you are checking work you did yourself (recorded as such)",
    )
    group.add_argument(
        "--independent",
        dest="self_review",
        action="store_false",
        help="someone else ingested this; you are an independent reviewer",
    )
    parser.add_argument("--note", default="", help="anything a later reviewer should know")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="agrilok-ingest", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("import-phase0", help="import the Phase 0 corpus as queued documents")
    p.add_argument("--spike-dir", default=str(REPO / "spike"))
    p.set_defaults(func=cmd_import_phase0)

    p = sub.add_parser("add", help="add one document from a local PDF")
    p.add_argument("--manifest", required=True)
    p.add_argument("--id", required=True)
    p.add_argument("--pdf", required=True)
    p.add_argument("--source-id", default="manual")
    p.add_argument("--source-name", default="Downloaded by hand from an official portal")
    p.add_argument("--acquisition", choices=["manual", "crawled"], default="manual")
    p.set_defaults(func=cmd_add)

    p = sub.add_parser("status", help="corpus and review queue at a glance")
    p.set_defaults(func=cmd_status)

    review = sub.add_parser("review", help="the document review queue").add_subparsers(
        dest="review_command", required=True
    )
    p = review.add_parser("list")
    p.add_argument("--admission", choices=["queued", "admitted", "rejected"])
    p.set_defaults(func=cmd_review_list)
    p = review.add_parser("show")
    p.add_argument("doc_id")
    p.set_defaults(func=cmd_review_show)
    p = review.add_parser("admit")
    p.add_argument("doc_ids", nargs="*")
    p.add_argument("--all-eligible", action="store_true")
    p.add_argument("--yes", action="store_true")
    p.add_argument("--compared-against-pdf", action="store_true")
    p.add_argument("--level-confirmed", action="store_true")
    _reviewer(p)
    p.set_defaults(func=cmd_review_admit)
    p = review.add_parser("verify")
    p.add_argument("doc_id")
    p.add_argument("--checklist-done", action="store_true")
    _reviewer(p)
    p.set_defaults(func=cmd_review_verify)
    p = review.add_parser("reject")
    p.add_argument("doc_id")
    p.add_argument("--by", required=True)
    p.add_argument("--note", required=True)
    p.set_defaults(func=cmd_review_reject)
    p = review.add_parser("issue")
    p.add_argument("doc_id")
    p.add_argument("--create", action="store_true", help="open it on GitHub (uses gh)")
    p.set_defaults(func=cmd_review_issue)

    p = sub.add_parser("embed", help="embed admitted chunks that have no vector")
    p.add_argument("--include-queued", action="store_true")
    p.add_argument("--limit", type=int)
    p.add_argument("--batch-size", type=int, default=10)
    p.add_argument("--pause", type=float, default=20.0, help="seconds between batches")
    p.add_argument("--yes", action="store_true")
    p.set_defaults(func=cmd_embed)

    answers = sub.add_parser("answers", help="cached answers").add_subparsers(
        dest="answers_command", required=True
    )
    p = answers.add_parser("list")
    p.add_argument("--pending", action="store_true", help="answered, not yet verified")
    p.add_argument("--limit", type=int, default=30)
    p.set_defaults(func=cmd_answers_list)
    p = answers.add_parser("show")
    p.add_argument("answer_id")
    p.set_defaults(func=cmd_answers_show)
    p = answers.add_parser("verify")
    p.add_argument("answer_id")
    _reviewer(p)
    p.set_defaults(func=cmd_answers_verify)

    p = sub.add_parser("pregenerate", help="answer common questions once, for everyone")
    p.add_argument("--file", default=str(REPO / "data" / "pregenerate" / "common-questions.yaml"))
    p.add_argument("--model", help="defaults to GEMINI_PREGENERATION_MODEL")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_pregenerate)
    return parser


def main(argv: list[str] | None = None) -> int:
    _utf8_console()
    args = build_parser().parse_args(argv)
    try:
        result: int = args.func(args)
        return result
    except (rv.ReviewError, AddError, ManifestError, FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
