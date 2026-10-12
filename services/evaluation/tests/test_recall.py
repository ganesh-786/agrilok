"""Measuring retrieval by itself: the labels, the scoring, and a run against a real database."""

from __future__ import annotations

import math
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
import yaml
from pydantic import SecretStr

from agrilok_core.levels import ExamLevel
from agrilok_core.retrieval import Candidate
from agrilok_core.runtime import Runtime, open_runtime
from agrilok_core.settings import Settings
from agrilok_core.testing import FakeGemini, add_chunk, add_document, reset, unit
from agrilok_infra.testing import admin_url, temporary_database
from evaluation.golden import SMOKE, GoldenQuestion, load
from evaluation.recall import (
    DEFAULT_LABELS,
    Label,
    LabelError,
    Outcome,
    first_match,
    language_of,
    load_labels,
    measure,
    pair,
    summarise,
    unlabelled,
    vector_key,
)

# --- the label file -------------------------------------------------------------------


def test_every_label_is_for_a_question_the_golden_set_expects_an_answer_to() -> None:
    labels = load_labels()

    pairs = pair(labels, load())

    assert len(pairs) == len(labels) >= 7
    assert all(label.basis for label in labels)


def test_every_answerable_question_is_either_labelled_or_named_as_not_yet_labelled() -> None:
    # As the golden set grows, a new answerable question must not quietly fall
    # outside the measurement. It is labelled, or the file says it is not.
    declared = yaml.safe_load(DEFAULT_LABELS.read_text(encoding="utf-8"))["unlabelled"]

    missing = unlabelled(load(), load_labels())

    assert sorted(missing) == sorted(entry["id"] for entry in declared)


def _write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "labels.yaml"
    path.write_text(text, encoding="utf-8")
    return path


def test_a_label_must_name_something_and_say_what_it_rests_on(tmp_path: Path) -> None:
    with pytest.raises(LabelError, match="names no chunk"):
        load_labels(_write(tmp_path, "labels:\n  - id: SMOKE-01\n    basis: a hint\n"))
    with pytest.raises(LabelError, match="rests on"):
        load_labels(_write(tmp_path, "labels:\n  - id: SMOKE-01\n    chunks: [LUM-01-011]\n"))
    with pytest.raises(LabelError, match="twice"):
        load_labels(
            _write(
                tmp_path,
                "labels:\n"
                "  - {id: SMOKE-01, chunks: [A], basis: x}\n"
                "  - {id: SMOKE-01, chunks: [B], basis: x}\n",
            )
        )


def test_a_label_for_a_question_that_must_be_refused_is_rejected() -> None:
    questions = load()
    refused = next(q for q in questions if q.expected == "refuse")

    with pytest.raises(LabelError, match="expected to be refused"):
        pair([Label(id=refused.id, chunks=("ANY-01-000",), basis="x")], questions)
    with pytest.raises(LabelError, match="not in the golden set"):
        pair([Label(id="NO-SUCH-QUESTION", chunks=("ANY-01-000",), basis="x")], questions)


# --- scoring ----------------------------------------------------------------------------


def _candidate(chunk_id: str) -> Candidate:
    return Candidate(chunk_id, details={"document_id": chunk_id.rsplit("-", 1)[0]})


def test_the_first_labelled_chunk_gives_the_rank_and_a_document_label_matches_any_chunk() -> None:
    ranked = [_candidate("LUM-06-001"), _candidate("LUM-03-004"), _candidate("LUM-01-011")]

    by_chunk = first_match(Label("Q", chunks=("LUM-01-011", "LUM-99-000"), basis="x"), ranked)
    by_document = first_match(Label("Q", documents=("LUM-03",), basis="x"), ranked)
    nothing = first_match(Label("Q", chunks=("GAN-01-008",), basis="x"), ranked)

    assert by_chunk is not None and by_chunk[0] == 3  # noqa: PT018
    assert by_document is not None and by_document[0] == 2  # noqa: PT018
    assert nothing is None


def test_a_question_is_nepali_or_english_by_the_script_it_is_written_in() -> None:
    assert language_of("How many marks is the written examination?") == "english"
    assert language_of("नेपालको संविधान बमोजिम अवशिष्ट अधिकार कसमा निहित हुन्छ?") == "nepali"


def _outcome(question_id: str, **overrides: object) -> Outcome:
    values: dict[str, object] = {
        "id": question_id,
        "tier": SMOKE,
        "level": "level_7",
        "language": "english",
        "label_kind": "chunk",
    }
    values.update(overrides)
    return Outcome(**values)  # type: ignore[arg-type]


def test_misses_are_named_and_told_apart_by_cause() -> None:
    summary = summarise(
        [
            _outcome("FIRST", shown=True, rank=1),
            _outcome("LOW", shown=False, rank=10, language="nepali"),
            _outcome("LOST", shown=False, rank=None, language="nepali"),
            _outcome("STALE", not_in_corpus=["OLD-01-000"]),
        ],
        shown_k=6,
        unlabelled=["U-02"],
    )

    assert summary["questions"] == 3, "a label this corpus cannot retrieve is not a miss"
    assert (summary["shown"], summary["found"]) == (1, 2)
    assert summary["recall_shown"] == pytest.approx(0.333)
    assert summary["recall_found"] == pytest.approx(0.667)
    assert summary["mrr"] == pytest.approx((1 + 1 / 10) / 3, abs=1e-3)
    assert summary["found_but_not_shown"] == ["LOW"]  # ranking: there, and passed over
    assert summary["not_found"] == ["LOST"]  # recall: no reranker can help
    assert summary["label_not_in_corpus"] == {"STALE": ["OLD-01-000"]}
    assert summary["answerable_but_unlabelled"] == ["U-02"]
    assert summary["by_language"]["nepali"]["found"] == 1
    assert summary["by_language"]["english"]["recall_shown"] == 1.0


def test_a_vector_is_reused_only_for_the_same_question_model_and_size() -> None:
    key = vector_key("soil?", "gemini-embedding-001", 768)

    assert key == vector_key("soil?", "gemini-embedding-001", 768)
    assert key != vector_key("soil?", "gemini-embedding-2", 768)
    assert key != vector_key("soil?", "gemini-embedding-001", 1536)
    assert key != vector_key("Soil?", "gemini-embedding-001", 768)


# --- a run against a real Postgres, with a fake model -----------------------------------

SOIL = unit((0, 1.0))


@pytest.fixture(scope="module")
def db_url() -> Iterator[str]:
    server = admin_url()
    if server is None:
        pytest.skip("no Postgres reachable; start one with `agrilok-db start`")
    with temporary_database(server) as url:
        yield url


async def _no_sleep(_: float) -> None:
    return None


@pytest.fixture
def fake() -> FakeGemini:
    return FakeGemini(default_embedding=SOIL)


@pytest.fixture
async def rt(db_url: str, fake: FakeGemini) -> AsyncIterator[Runtime]:
    settings = Settings(
        database_url=db_url,
        gemini_api_key=SecretStr("test-key"),
        gemini_max_requests_per_minute=6000,
    )
    runtime = await open_runtime(settings, http=fake.client(), sleep=_no_sleep)
    async with runtime.pool.connection() as conn:
        await reset(conn)
        await add_document(conn, "LUM-01")
        await add_document(conn, "LUM-09", admission="queued")
        # Eight chunks closer to the question than the one that answers it,
        # so it is among the candidates but outside the six the model is shown.
        for i in range(8):
            close = unit((0, 0.95), (10 + i, math.sqrt(1 - 0.95**2)))
            await add_chunk(conn, f"LUM-01-{i:03d}", "LUM-01", "General heading", close, index=i)
        low = unit((0, 0.7), (3, math.sqrt(1 - 0.7**2)))
        await add_chunk(conn, "LUM-01-050", "LUM-01", "The passage that answers", low, index=50)
        await add_chunk(conn, "LUM-09-000", "LUM-09", "Not admitted yet", SOIL)
    yield runtime
    await runtime.close()


def _question(question_id: str) -> GoldenQuestion:
    return GoldenQuestion(
        id=question_id,
        tier=SMOKE,
        question=f"Which marks apply, asked as {question_id}?",
        expected="answer",
        level=ExamLevel.LEVEL_7,
        level_from_file=True,
        province=None,
        must_not_contain=None,
        reference_answer=None,
    )


async def test_a_run_tells_shown_from_found_and_reuses_vectors(
    rt: Runtime, fake: FakeGemini
) -> None:
    pairs = [
        (Label("TOP", chunks=("LUM-01-000",), basis="x"), _question("TOP")),
        (Label("LOW", chunks=("LUM-01-050",), basis="x"), _question("LOW")),
        (Label("WHOLE", documents=("LUM-01",), basis="x"), _question("WHOLE")),
        (Label("QUEUED", chunks=("LUM-09-000",), basis="x"), _question("QUEUED")),
        (Label("GONE", chunks=("LUM-01-999",), basis="x"), _question("GONE")),
    ]
    vectors: dict[str, list[float]] = {}

    outcomes = {o.id: o for o in await measure(rt, pairs, vectors)}
    embeds_first_run = fake.calls["embed"]
    await measure(rt, pairs, vectors)

    assert outcomes["TOP"].shown
    assert outcomes["TOP"].rank is not None
    assert outcomes["TOP"].rank <= 8
    # Retrieved, but ninth: outside the six the model is given.
    assert (outcomes["LOW"].shown, outcomes["LOW"].rank) == (False, 9)
    assert outcomes["LOW"].similarity == pytest.approx(0.7, abs=1e-3)
    assert (outcomes["WHOLE"].label_kind, outcomes["WHOLE"].rank) == ("document", 1)
    # A queued document is not in the retrievable corpus: reported, not scored.
    assert outcomes["QUEUED"].not_in_corpus == ["LUM-09-000"]
    assert outcomes["GONE"].not_in_corpus == ["LUM-01-999"]
    assert embeds_first_run == 3, "no vector is fetched for a label that cannot be measured"
    assert fake.calls["embed"] == 3, "the second run reused every vector"
    assert fake.calls["generate"] == 0
