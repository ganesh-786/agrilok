"""Measure retrieval by itself: is the chunk that holds the answer found, and how high?

    python -m evaluation.recall --report reports/recall.json
    python -m evaluation.recall --candidates U-02

The golden-set run (evaluation.run) says whether a question was answered. It
cannot say why one was refused: the right chunk never retrieved, or retrieved
and not used. When this project's answers have been wrong or missing, the
cause has mostly been retrieval (docs/rag-pipeline.md), and until now nothing
measured it.

For each golden question that has a label (data/golden-set/retrieval-labels.yaml)
this reports two things:

- **shown**: is a labelled chunk among the chunks the model would be given, at
  the production settings (top k and both score floors)?
- **found**: is it among the top 20 candidates at all, with the floors off,
  and at what rank?

A question that is found but not shown is a ranking problem: the chunk is
there and something else was preferred. One that is not found is a recall
problem, and no reranker can help it.

No answer is generated and no model judges anything, so the numbers are
exactly repeatable. The provider is needed once per question, for its vector.
Vectors are kept in reports/ (gitignored) and reused, so a second run spends
no quota.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import sys
from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from agrilok_core.db import l2_normalize, run_sync
from agrilok_core.retrieval import Candidate, Filters, retrieve
from agrilok_core.runtime import Runtime, open_runtime
from agrilok_core.text import is_devanagari
from evaluation.golden import DEFAULT_PATH, REPO, GoldenQuestion, load

HERE = Path(__file__).resolve().parents[2]
DEFAULT_LABELS = REPO / "data" / "golden-set" / "retrieval-labels.yaml"
DEFAULT_VECTORS = HERE / "reports" / "question-vectors.json"
# How deep "found" looks. The vector side proposes 20 candidates
# (retrieval.CANDIDATES_PER_SIDE), so this is everything it can offer.
WIDE_K = 20


class LabelError(ValueError):
    pass


@dataclass(frozen=True)
class Label:
    id: str
    chunks: tuple[str, ...] = ()
    documents: tuple[str, ...] = ()
    basis: str = ""

    @property
    def kind(self) -> str:
        return "chunk" if self.chunks else "document"

    def matches(self, chunk_id: str, document_id: str) -> bool:
        return chunk_id in self.chunks or document_id in self.documents


@dataclass
class Outcome:
    id: str
    tier: str
    level: str
    language: str  # "nepali" or "english", by the script the question is written in
    label_kind: str
    shown: bool = False
    rank: int | None = None  # 1 is best; None means not in the top WIDE_K
    similarity: float | None = None
    # Labelled chunks or documents that are not retrievable in this corpus. A
    # question with any is reported apart and never counted as a miss.
    not_in_corpus: list[str] = field(default_factory=list)


def load_labels(path: Path = DEFAULT_LABELS) -> list[Label]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    entries = data.get("labels") if isinstance(data, dict) else None
    if not isinstance(entries, list):
        raise LabelError(f"{path}: expected a top-level `labels:` list")
    labels = []
    for entry in entries:
        label = Label(
            id=str(entry["id"]),
            chunks=tuple(str(c) for c in entry.get("chunks") or ()),
            documents=tuple(str(d) for d in entry.get("documents") or ()),
            basis=str(entry.get("basis") or ""),
        )
        if not label.chunks and not label.documents:
            raise LabelError(f"{path}: {label.id} names no chunk and no document")
        if not label.basis:
            raise LabelError(f"{path}: {label.id} does not say what its label rests on")
        labels.append(label)
    ids = [label.id for label in labels]
    if len(ids) != len(set(ids)):
        raise LabelError(f"{path}: a question is labelled twice")
    return labels


def pair(
    labels: Sequence[Label], questions: Sequence[GoldenQuestion]
) -> list[tuple[Label, GoldenQuestion]]:
    """Match each label to its question, refusing a label that cannot be right."""
    by_id = {q.id: q for q in questions}
    pairs = []
    for label in labels:
        question = by_id.get(label.id)
        if question is None:
            raise LabelError(f"label {label.id} is for a question that is not in the golden set")
        if question.expected != "answer":
            # A question the corpus cannot answer has no chunk that answers it.
            raise LabelError(f"label {label.id} is for a question that is expected to be refused")
        pairs.append((label, question))
    return pairs


def language_of(question: str) -> str:
    return "nepali" if is_devanagari(question) else "english"


def first_match(label: Label, candidates: Sequence[Candidate]) -> tuple[int, Candidate] | None:
    for rank, candidate in enumerate(candidates, start=1):
        if label.matches(candidate.chunk_id, candidate.document_id):
            return rank, candidate
    return None


def _share(part: int, whole: int) -> float | None:
    return round(part / whole, 3) if whole else None


def _scores(outcomes: Sequence[Outcome]) -> dict[str, Any]:
    n = len(outcomes)
    return {
        "questions": n,
        "shown": sum(o.shown for o in outcomes),
        "found": sum(o.rank is not None for o in outcomes),
        "recall_shown": _share(sum(o.shown for o in outcomes), n),
        "recall_found": _share(sum(o.rank is not None for o in outcomes), n),
        # Mean reciprocal rank: 1.0 if the right chunk is always first.
        "mrr": round(sum(1 / o.rank for o in outcomes if o.rank) / n, 3) if n else None,
    }


def summarise(
    outcomes: Sequence[Outcome], *, shown_k: int, unlabelled: Sequence[str] = ()
) -> dict[str, Any]:
    measured = [o for o in outcomes if not o.not_in_corpus]
    return {
        "generated_at": datetime.now(tz=UTC).isoformat(),
        "shown_k": shown_k,
        "found_k": WIDE_K,
        **_scores(measured),
        "by_language": {
            language: _scores([o for o in measured if o.language == language])
            for language in sorted({o.language for o in measured})
        },
        "by_label_kind": {
            kind: _scores([o for o in measured if o.label_kind == kind])
            for kind in sorted({o.label_kind for o in measured})
        },
        # Named, never only counted: an average hides the one question that fails.
        "found_but_not_shown": [o.id for o in measured if o.rank is not None and not o.shown],
        "not_found": [o.id for o in measured if o.rank is None],
        "label_not_in_corpus": {o.id: o.not_in_corpus for o in outcomes if o.not_in_corpus},
        "answerable_but_unlabelled": list(unlabelled),
        "results": [asdict(o) for o in outcomes],
    }


def vector_key(question: str, model: str, dimensions: int) -> str:
    return hashlib.sha256(f"{model}|{dimensions}|RETRIEVAL_QUERY|{question}".encode()).hexdigest()


def load_vectors(path: Path) -> dict[str, list[float]]:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


async def _vector(runtime: Runtime, question: str, vectors: dict[str, list[float]]) -> list[float]:
    settings = runtime.settings
    key = vector_key(
        question, settings.gemini_embedding_model, settings.gemini_embedding_dimensions
    )
    if key not in vectors:
        vectors[key] = await runtime.gemini.embed_query(question)
    return l2_normalize(vectors[key])


async def _missing_from_corpus(runtime: Runtime, label: Label) -> list[str]:
    """The labelled ids that retrieval could never return in this corpus."""
    async with runtime.pool.connection() as conn:
        cur = await conn.execute(
            "select c.id, c.document_id from chunks c join documents d on d.id = c.document_id "
            "where d.admission = 'admitted' and not d.superseded and c.embedding is not null "
            "and (c.id = any(%(chunks)s) or c.document_id = any(%(documents)s))",
            {"chunks": list(label.chunks), "documents": list(label.documents)},
        )
        rows = await cur.fetchall()
    present = {row["id"] for row in rows} | {row["document_id"] for row in rows}
    return [name for name in (*label.chunks, *label.documents) if name not in present]


async def _both(
    runtime: Runtime, question: GoldenQuestion, vector: list[float]
) -> tuple[list[Candidate], list[Candidate]]:
    settings = runtime.settings
    filters = Filters(level=question.level, province=question.province)
    async with runtime.pool.connection() as conn:
        shown = await retrieve(
            conn,
            question=question.question,
            query_vector=vector,
            filters=filters,
            top_k=settings.retrieval_top_k,
            min_score=settings.retrieval_min_score,
            keyword_min_score=settings.retrieval_keyword_min_score,
        )
        wide = await retrieve(
            conn,
            question=question.question,
            query_vector=vector,
            filters=filters,
            top_k=WIDE_K,
            min_score=0.0,
            keyword_min_score=0.0,
        )
    return shown.results, wide.results


async def measure(
    runtime: Runtime,
    pairs: Sequence[tuple[Label, GoldenQuestion]],
    vectors: dict[str, list[float]],
) -> list[Outcome]:
    outcomes = []
    for label, question in pairs:
        outcome = Outcome(
            id=question.id,
            tier=question.tier,
            level=question.level.value,
            language=language_of(question.question),
            label_kind=label.kind,
            not_in_corpus=await _missing_from_corpus(runtime, label),
        )
        if not outcome.not_in_corpus:
            shown, wide = await _both(
                runtime, question, await _vector(runtime, question.question, vectors)
            )
            outcome.shown = first_match(label, shown) is not None
            found = first_match(label, wide)
            if found is not None:
                outcome.rank, candidate = found
                outcome.similarity = (
                    round(candidate.similarity, 3) if candidate.similarity is not None else None
                )
        outcomes.append(outcome)
    return outcomes


def unlabelled(questions: Sequence[GoldenQuestion], labels: Sequence[Label]) -> list[str]:
    """Questions that should be answered and that this measurement cannot see."""
    labelled = {label.id for label in labels}
    return [q.id for q in questions if q.expected == "answer" and q.id not in labelled]


def _print(summary: Mapping[str, Any]) -> None:
    n = summary["questions"]
    print(f"\nRetrieval on {n} labelled question(s).")
    print(f"  shown (top {summary['shown_k']}, production floors): {summary['shown']} of {n}")
    print(f"  found (top {summary['found_k']}, floors off):          {summary['found']} of {n}")
    print(f"  mean reciprocal rank: {summary['mrr']}")
    for language, scores in summary["by_language"].items():
        print(
            f"  {language}: shown {scores['shown']} of {scores['questions']}, "
            f"found {scores['found']} of {scores['questions']}"
        )
    for title, key in (
        ("Found but not shown (ranking)", "found_but_not_shown"),
        ("Not found at all (recall)", "not_found"),
        ("Answerable but not labelled, so not measured", "answerable_but_unlabelled"),
    ):
        if summary[key]:
            print(f"  {title}: {', '.join(summary[key])}")
    for question_id, missing in summary["label_not_in_corpus"].items():
        print(
            f"  {question_id}: label names what this corpus cannot retrieve: {', '.join(missing)}"
        )


async def _candidates(
    runtime: Runtime, question: GoldenQuestion, vectors: dict[str, list[float]]
) -> None:
    _, wide = await _both(runtime, question, await _vector(runtime, question.question, vectors))
    print(f"{question.id}: {question.question}\n")
    for rank, candidate in enumerate(wide, start=1):
        text = " ".join(candidate.text.split())[:160]
        print(f"{rank:>2}. {candidate.chunk_id}  {candidate.similarity or 0:.3f}  {text}")


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        with contextlib.suppress(AttributeError, ValueError):
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    parser = argparse.ArgumentParser(prog="python -m evaluation.recall")
    parser.add_argument("--questions", default=str(DEFAULT_PATH))
    parser.add_argument("--labels", default=str(DEFAULT_LABELS))
    parser.add_argument("--vectors", default=str(DEFAULT_VECTORS))
    parser.add_argument("--report", default=str(HERE / "reports" / "recall.json"))
    parser.add_argument("--candidates", help="list what retrieval returns for one question id")
    args = parser.parse_args(argv)

    questions = load(Path(args.questions))
    labels = load_labels(Path(args.labels))
    pairs = pair(labels, questions)
    vectors_path = Path(args.vectors)
    vectors = load_vectors(vectors_path)
    known = len(vectors)

    async def run() -> dict[str, Any] | None:
        runtime = await open_runtime()
        try:
            if args.candidates:
                wanted = [q for q in questions if q.id == args.candidates]
                if not wanted:
                    raise SystemExit(f"no golden question has the id {args.candidates}")
                await _candidates(runtime, wanted[0], vectors)
                return None
            outcomes = await measure(runtime, pairs, vectors)
            return summarise(
                outcomes,
                shown_k=runtime.settings.retrieval_top_k,
                unlabelled=unlabelled(questions, labels),
            )
        finally:
            await runtime.close()

    try:
        summary = run_sync(run)
    finally:
        if len(vectors) > known:
            vectors_path.parent.mkdir(parents=True, exist_ok=True)
            vectors_path.write_text(json.dumps(vectors), "utf-8")
    if summary is None:
        return 0
    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(summary, ensure_ascii=False, indent=2), "utf-8")
    _print(summary)
    print(f"Report: {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
