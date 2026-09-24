"""Retrieval and the ask pipeline against a real Postgres, with a scripted fake model.

Each test proves one property from tests/README.md: levels never mix, the
review gate cannot be bypassed, refusals cost no generation call, a fabrication
is withheld, invented citations are refused, personal data never reaches the
model, quota exhaustion degrades visibly while the cache keeps serving, and a
cached answer dies when its source changes.
"""

from __future__ import annotations

import math
from collections.abc import AsyncIterator, Iterator

import pytest
from pydantic import SecretStr

from agrilok_core.levels import ExamLevel
from agrilok_core.pipeline import Stage, ask
from agrilok_core.retrieval import Filters, retrieve
from agrilok_core.runtime import Runtime, open_runtime
from agrilok_core.settings import Settings
from agrilok_core.testing import (
    FakeGemini,
    add_chunk,
    add_document,
    generation_response,
    reset,
    unit,
)
from agrilok_infra.testing import admin_url, temporary_database

SOIL = unit((0, 1.0))
DATA = unit((1, 1.0))
FOOD = unit((2, 1.0))
ELSEWHERE = unit((5, 1.0))


@pytest.fixture(scope="session")
def db_url() -> Iterator[str]:
    server = admin_url()
    if server is None:
        pytest.skip("no Postgres reachable; start one with `agrilok-db start`")
    with temporary_database(server) as url:
        yield url


async def _no_sleep(_: float) -> None:
    return None


def _settings(db_url: str, **overrides: object) -> Settings:
    values: dict[str, object] = {
        "database_url": db_url,
        "gemini_api_key": SecretStr("test-key"),
        "gemini_generation_model": "lite-primary",
        "gemini_generation_fallbacks": "",
        "gemini_max_requests_per_minute": 6000,
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


@pytest.fixture
def fake() -> FakeGemini:
    return FakeGemini()


@pytest.fixture
async def rt(db_url: str, fake: FakeGemini) -> AsyncIterator[Runtime]:
    runtime = await open_runtime(_settings(db_url), http=fake.client(), sleep=_no_sleep)
    async with runtime.pool.connection() as conn:
        await reset(conn)
    yield runtime
    await runtime.close()


async def _ids(rt: Runtime, level: ExamLevel, vector: list[float], **kw: str) -> set[str]:
    async with rt.pool.connection() as conn:
        result = await retrieve(
            conn,
            question="soil",
            query_vector=vector,
            filters=Filters(
                level=level, province=kw.get("province"), service_group=kw.get("group")
            ),
            top_k=10,
            min_score=0.55,
            keyword_min_score=0.45,
        )
    return {c.chunk_id for c in result.results}


# --- retrieval --------------------------------------------------------------------


async def test_level_4_and_level_7_never_mix(rt: Runtime) -> None:
    async with rt.pool.connection() as conn:
        await add_document(conn, "L7", level="level_7")
        await add_document(conn, "L4", level="level_4")
        await add_document(conn, "REF", level=None, doc_class="reference", province="federal")
        await add_chunk(conn, "L7-01-000", "L7", "Definition of soil", SOIL)
        await add_chunk(conn, "L4-01-000", "L4", "Definition of soil", SOIL)
        await add_chunk(conn, "REF-01-000", "REF", "Soil and land law", unit((0, 0.8), (2, 0.6)))

    assert await _ids(rt, ExamLevel.LEVEL_7, SOIL) == {"L7-01-000", "REF-01-000"}
    assert await _ids(rt, ExamLevel.LEVEL_4, SOIL) == {"L4-01-000", "REF-01-000"}


async def test_queued_and_superseded_documents_are_never_retrieved(rt: Runtime) -> None:
    async with rt.pool.connection() as conn:
        await add_document(conn, "QUEUED", admission="queued")
        await add_document(conn, "OLD", superseded=True)
        await add_document(conn, "OK")
        await add_chunk(conn, "QUEUED-01-000", "QUEUED", "Definition of soil", SOIL)
        await add_chunk(conn, "OLD-01-000", "OLD", "Definition of soil", SOIL)
        await add_chunk(conn, "OK-01-000", "OK", "Definition of soil", SOIL)

    assert await _ids(rt, ExamLevel.LEVEL_7, SOIL) == {"OK-01-000"}


async def test_province_and_group_filter_syllabi_but_not_reference_documents(rt: Runtime) -> None:
    async with rt.pool.connection() as conn:
        await add_document(conn, "LUM", province="lumbini", groups=["agronomy"])
        await add_document(conn, "FED", province="federal", groups=["veterinary"])
        await add_document(conn, "REF", level=None, doc_class="reference", province="federal")
        await add_chunk(conn, "LUM-01-000", "LUM", "Definition of soil", SOIL)
        await add_chunk(conn, "FED-01-000", "FED", "Definition of soil", SOIL)
        await add_chunk(conn, "REF-01-000", "REF", "Soil law", SOIL)

    lumbini = await _ids(rt, ExamLevel.LEVEL_7, SOIL, province="lumbini")
    veterinary = await _ids(rt, ExamLevel.LEVEL_7, SOIL, group="veterinary")
    assert lumbini == {"LUM-01-000", "REF-01-000"}
    assert veterinary == {"FED-01-000", "REF-01-000"}


async def test_a_strong_keyword_match_is_rescued_from_a_weak_vector_score(rt: Runtime) -> None:
    weak = unit((0, 0.5), (3, math.sqrt(0.75)))  # cosine 0.5 with SOIL
    async with rt.pool.connection() as conn:
        await add_document(conn, "D")
        await add_chunk(conn, "D-01-000", "D", "Seeds Act 2045 registration of varieties", weak)
        await add_chunk(conn, "D-01-001", "D", "Unrelated heading about fisheries", weak, index=1)
        result = await retrieve(
            conn,
            question="Seeds Act 2045",
            query_vector=SOIL,
            filters=Filters(level=ExamLevel.LEVEL_7),
            top_k=6,
            min_score=0.55,
            keyword_min_score=0.45,
        )
    assert [c.chunk_id for c in result.results] == ["D-01-000"]


async def test_keyword_matches_never_push_out_a_stronger_vector_match(rt: Runtime) -> None:
    # Golden set U-03: an English question about the Constitution. English
    # syllabus headings that merely mention "constitution" win the keyword
    # side; the Nepali Constitution text wins the vector side. The text that
    # actually answers must still reach the model.
    near = unit((0, 0.71), (4, math.sqrt(1 - 0.71**2)))
    heading = unit((0, 0.67), (5, math.sqrt(1 - 0.67**2)))
    async with rt.pool.connection() as conn:
        await add_document(conn, "REF", level=None, doc_class="reference", province="federal")
        await add_chunk(conn, "REF-01-031", "REF", "(१२) कृषि क्षेत्रमा लगानी अभिवृद्धि गर्दै", near)
        await add_document(conn, "SYL")
        for i in range(4):
            await add_chunk(
                conn,
                f"SYL-01-00{i}",
                "SYL",
                "4.1 Agriculture sector policy in the current constitution",
                heading,
                index=i,
            )
        result = await retrieve(
            conn,
            question="Which constitution policy covers the agriculture sector?",
            query_vector=SOIL,
            filters=Filters(level=ExamLevel.LEVEL_7),
            top_k=3,
            min_score=0.55,
            keyword_min_score=0.45,
        )
    assert result.results[0].chunk_id == "REF-01-031"


# --- the ask pipeline ---------------------------------------------------------------


async def test_nothing_relevant_refuses_without_calling_the_model(
    rt: Runtime, fake: FakeGemini
) -> None:
    async with rt.pool.connection() as conn:
        await add_document(conn, "D")
        await add_chunk(conn, "D-01-000", "D", "Definition of soil", SOIL)
    fake.embeddings["What is the capital of Nepal?"] = ELSEWHERE

    first = await ask(rt, question="What is the capital of Nepal?", level=ExamLevel.LEVEL_7)
    again = await ask(rt, question="what is the capital of nepal", level=ExamLevel.LEVEL_7)

    assert first.stage is Stage.NO_SOURCES
    assert first.answer_text is None
    assert fake.calls["generate"] == 0
    assert again.cache.hit
    assert again.cache.kind == "exact"
    assert fake.calls["embed"] == 1  # the repeat cost nothing at all


async def test_pp01_fabrication_is_withheld(
    rt: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    question = "Crop cutting data sent by local levels is what kind of data for the province?"
    async with rt.pool.connection() as conn:
        await add_document(conn, "LUM-03", level="level_4")
        await add_chunk(conn, "LUM-03-011", "LUM-03", excerpts["LUM-03-011"], DATA)
    fake.embeddings[question] = DATA
    fake.generations.append(
        generation_response(
            {
                "sufficient": True,
                "answer": "Crop cutting data is secondary data for the province [LUM-03-011].",
                "claims": [
                    {
                        "claim": "Crop cutting data is secondary data for the province.",
                        "source_id": "LUM-03-011",
                        "quote": "6.9. प्राथनमक तथ्यािंक (Primary data) र सहायक तथ्यािंक "
                        "(Secondary data) को पररचय तथा श्रोतहरु एविं\n\nतथ्यािंक सिंकलन गदाग "
                        "ध्यान द्वदन\n\nु\n\nपने क\n\nु\n\nराहरु\n\n6.10. िाली कटानी "
                        "(Crop Cutting) र यसको महत्व",
                    }
                ],
            }
        )
    )

    result = await ask(rt, question=question, level=ExamLevel.LEVEL_4)

    assert result.status == "refused"
    assert result.stage is Stage.SUPPORT_CHECK
    assert result.answer_text is None
    assert result.withheld_answer is not None  # kept for a reviewer, never shown


async def test_a_supported_answer_is_numbered_cached_and_reused(
    rt: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    question = "How many marks is the written examination?"
    paraphrase = "What are the full marks of the written exam?"
    async with rt.pool.connection() as conn:
        await add_document(conn, "LUM-01")
        await add_chunk(conn, "LUM-01-000", "LUM-01", excerpts["LUM-01-000"], SOIL)
    fake.embeddings[question] = SOIL
    fake.embeddings[paraphrase] = unit((0, 0.99), (9, math.sqrt(1 - 0.99**2)))
    fake.generations.append(
        generation_response(
            {
                "sufficient": True,
                "answer": "The written examination carries 200 marks [LUM-01-000].",
                "claims": [
                    {
                        "claim": "The written examination carries 200 marks.",
                        "source_id": "LUM-01-000",
                        "quote": "प्रथम चरण :- नलम्खत परीक्षा (Written Examination) प\n\nू\n\n"
                        "णागङ्क :- 200",
                    }
                ],
            }
        )
    )

    first = await ask(rt, question=question, level=ExamLevel.LEVEL_7)
    exact = await ask(rt, question=question, level=ExamLevel.LEVEL_7)
    similar = await ask(rt, question=paraphrase, level=ExamLevel.LEVEL_7)

    assert first.status == "answered"
    assert first.answer_text == "The written examination carries 200 marks [1]."
    assert first.citations[0]["document_id"] == "LUM-01"
    assert first.citations[0]["quotes"]
    assert first.review_state == "ai_assisted_pending_review"
    assert exact.cache.kind == "exact"
    assert similar.cache.kind == "similar"
    assert similar.cache.matched_question == question
    assert fake.calls["generate"] == 1


async def test_the_same_question_at_the_other_level_is_not_served_from_cache(
    rt: Runtime, fake: FakeGemini
) -> None:
    async with rt.pool.connection() as conn:
        await add_document(conn, "D")
        await add_chunk(conn, "D-01-000", "D", "Definition of soil", SOIL)
    fake.default_embedding = ELSEWHERE
    await ask(rt, question="Define soil please", level=ExamLevel.LEVEL_7)
    other_level = await ask(rt, question="Define soil please", level=ExamLevel.LEVEL_4)
    assert not other_level.cache.hit


async def test_an_invented_citation_is_refused(
    rt: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    question = "How many marks is the written examination?"
    async with rt.pool.connection() as conn:
        await add_document(conn, "LUM-01")
        await add_chunk(conn, "LUM-01-000", "LUM-01", excerpts["LUM-01-000"], SOIL)
    fake.embeddings[question] = SOIL
    fake.generations.append(
        generation_response(
            {
                "sufficient": True,
                "answer": "It carries 200 marks [LUM-01-000] as stated in [FED-09-004].",
                "claims": [
                    {
                        "claim": "It carries 200 marks.",
                        "source_id": "LUM-01-000",
                        "quote": "नलम्खत परीक्षा (Written Examination) प\n\nू\n\nणागङ्क :- 200",
                    }
                ],
            }
        )
    )
    result = await ask(rt, question=question, level=ExamLevel.LEVEL_7)
    assert result.stage is Stage.SUPPORT_CHECK
    assert "FED-09-004" in (result.detail or "")


async def test_personal_data_never_reaches_the_model(rt: Runtime, fake: FakeGemini) -> None:
    result = await ask(
        rt, question="My number is 9841234567, what is IPM?", level=ExamLevel.LEVEL_7
    )
    assert result.stage is Stage.PERSONAL_DATA
    assert sum(fake.calls.values()) == 0


async def test_quota_exhaustion_degrades_visibly_and_the_cache_keeps_serving(
    db_url: str, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    runtime = await open_runtime(
        _settings(db_url, gemini_max_requests_per_day=1), http=fake.client(), sleep=_no_sleep
    )
    try:
        async with runtime.pool.connection() as conn:
            await reset(conn)
            await add_document(conn, "LUM-01")
            await add_chunk(conn, "LUM-01-000", "LUM-01", excerpts["LUM-01-000"], SOIL)
        fake.embeddings["Written exam marks?"] = SOIL
        # Relevant to the chunk, but not close enough to the first question to
        # be served from the near-duplicate cache, so it needs a live call.
        fake.embeddings["Group test marks?"] = unit((0, 0.9), (7, math.sqrt(0.19)))
        fake.generations.append(
            generation_response(
                {
                    "sufficient": True,
                    "answer": "The written examination carries 200 marks [LUM-01-000].",
                    "claims": [
                        {
                            "claim": "The written examination carries 200 marks.",
                            "source_id": "LUM-01-000",
                            "quote": "नलम्खत परीक्षा (Written Examination) प\n\nू\n\nणागङ्क :- 200",
                        }
                    ],
                }
            )
        )
        answered = await ask(runtime, question="Written exam marks?", level=ExamLevel.LEVEL_7)
        blocked = await ask(runtime, question="Group test marks?", level=ExamLevel.LEVEL_7)
        cached = await ask(runtime, question="Written exam marks?", level=ExamLevel.LEVEL_7)
    finally:
        await runtime.close()

    assert answered.status == "answered"
    assert blocked.stage is Stage.QUOTA
    assert blocked.quota_resets_at is not None
    assert cached.status == "answered"
    assert cached.cache.hit


async def test_a_cached_answer_dies_when_its_source_changes(
    rt: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    question = "How many marks is the written examination?"
    async with rt.pool.connection() as conn:
        await add_document(conn, "LUM-01")
        await add_chunk(conn, "LUM-01-000", "LUM-01", excerpts["LUM-01-000"], SOIL)
    fake.embeddings[question] = SOIL
    reply = generation_response(
        {
            "sufficient": True,
            "answer": "The written examination carries 200 marks [LUM-01-000].",
            "claims": [
                {
                    "claim": "The written examination carries 200 marks.",
                    "source_id": "LUM-01-000",
                    "quote": "नलम्खत परीक्षा (Written Examination) प\n\nू\n\nणागङ्क :- 200",
                }
            ],
        }
    )
    fake.generations.extend([reply, reply])
    await ask(rt, question=question, level=ExamLevel.LEVEL_7)
    async with rt.pool.connection() as conn:
        await conn.execute("update documents set checksum = %s where id = 'LUM-01'", ("f" * 64,))
    after_change = await ask(rt, question=question, level=ExamLevel.LEVEL_7)

    assert not after_change.cache.hit
    assert fake.calls["generate"] == 2
