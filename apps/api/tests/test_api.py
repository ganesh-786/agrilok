"""The HTTP surface, end to end against a real database and a scripted fake model."""

from __future__ import annotations

import httpx

from agrilok_api.routes import ASK_LIMITS
from agrilok_core.runtime import Runtime
from agrilok_core.testing import FakeGemini, add_chunk, add_document, generation_response, unit

SOIL = unit((0, 1.0))


async def _seed(runtime: Runtime, excerpts: dict[str, str]) -> None:
    async with runtime.pool.connection() as conn:
        await add_document(conn, "LUM-01", level="level_7", title="Officer Level 7 syllabus")
        await add_document(conn, "LUM-03", level="level_4", title="Assistant Level 4 syllabus")
        await add_document(conn, "QUEUED", level="level_7", admission="queued")
        await add_document(
            conn,
            "REF-04",
            level=None,
            doc_class="reference",
            province="federal",
            title="Constitution of Nepal",
        )
        await add_chunk(conn, "LUM-01-000", "LUM-01", excerpts["LUM-01-000"], SOIL)
        await add_chunk(
            conn,
            "LUM-01-001",
            "LUM-01",
            "Section (B) - 25 Marks\n3. Soil Science\n3.1 General Introduction\n"
            "3.1.1 Definition of soil",
            unit((1, 1.0)),
            index=1,
        )
        await add_chunk(conn, "LUM-03-000", "LUM-03", "3.1.1 Definition of soil", SOIL)
        await add_chunk(conn, "QUEUED-01-000", "QUEUED", "3.1.1 Definition of soil", SOIL)
        await add_chunk(conn, "REF-04-019", "REF-04", excerpts["REF-04-019"], unit((2, 1.0)))


async def test_health_and_security_headers(client: httpx.AsyncClient) -> None:
    response = await client.get("/v1/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert "x-request-id" in response.headers


async def test_meta_counts_only_admitted_documents(
    client: httpx.AsyncClient, runtime: Runtime, excerpts: dict[str, str]
) -> None:
    await _seed(runtime, excerpts)
    meta = (await client.get("/v1/meta")).json()
    assert [level["code"] for level in meta["levels"]] == ["level_4", "level_7"]
    assert meta["library"]["syllabi_by_level"] == {"level_4": 1, "level_7": 1}
    assert meta["library"]["reference_documents"] == 1
    assert meta["live"]["available"] is True


async def test_a_level_library_never_lists_the_other_level_or_queued_documents(
    client: httpx.AsyncClient, runtime: Runtime, excerpts: dict[str, str]
) -> None:
    await _seed(runtime, excerpts)
    body = (await client.get("/v1/levels/level_7/documents")).json()
    assert [d["id"] for d in body["syllabi"]] == ["LUM-01"]
    assert [d["id"] for d in body["reference"]] == ["REF-04"]
    assert body["syllabi"][0]["review"]["state"] == "ai_assisted_pending_review"


async def test_a_queued_document_does_not_exist_for_students(
    client: httpx.AsyncClient, runtime: Runtime, excerpts: dict[str, str]
) -> None:
    await _seed(runtime, excerpts)
    assert (await client.get("/v1/documents/QUEUED")).status_code == 404
    detail = (await client.get("/v1/documents/LUM-01")).json()
    assert {"label": "3", "text": "Soil Science"} in detail["outline"]
    assert len(detail["checksum"]) == 64


async def test_an_unknown_level_or_province_is_rejected(client: httpx.AsyncClient) -> None:
    assert (await client.get("/v1/levels/level_5/documents")).status_code == 422
    response = await client.get("/v1/levels/level_7/documents", params={"province": "mars"})
    assert response.status_code == 422


async def test_search_is_keyword_only_and_costs_no_quota(
    client: httpx.AsyncClient, runtime: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    await _seed(runtime, excerpts)
    body = (await client.get("/v1/levels/level_7/search", params={"q": "soil definition"})).json()
    assert {h["document_id"] for h in body["hits"]} <= {"LUM-01", "REF-04"}
    assert body["hits"]
    assert all(len(h["snippet"]) <= 290 for h in body["hits"])
    assert sum(fake.calls.values()) == 0


async def test_asking_returns_numbered_citations_and_a_permalink(
    client: httpx.AsyncClient, runtime: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    await _seed(runtime, excerpts)
    question = "How many marks is the written examination?"
    fake.embeddings[question] = SOIL
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
    body = (await client.post("/v1/levels/level_7/ask", json={"question": question})).json()
    assert body["status"] == "answered"
    assert body["answer_text"].endswith("[1].")
    assert body["citations"][0]["document_id"] == "LUM-01"
    assert body["citations"][0]["fetched_on"] == "2026-09-16"
    assert body["review"]["state"] == "ai_assisted_pending_review"

    again = (await client.get(f"/v1/answers/{body['id']}")).json()
    assert again["answer_text"] == body["answer_text"]


async def test_personal_data_is_refused_before_the_model(
    client: httpx.AsyncClient, fake: FakeGemini
) -> None:
    body = (
        await client.post(
            "/v1/levels/level_7/ask", json={"question": "email me at ram@example.com about IPM"}
        )
    ).json()
    assert body["status"] == "refused"
    assert body["reason"] == {"code": "personal_data", "detail": "email"}
    assert sum(fake.calls.values()) == 0


async def test_a_nonsense_question_is_a_validation_error(client: httpx.AsyncClient) -> None:
    response = await client.post("/v1/levels/level_7/ask", json={"question": "??"})
    assert response.status_code == 422


async def test_asking_too_fast_is_rate_limited(client: httpx.AsyncClient) -> None:
    ASK_LIMITS._windows.clear()
    headers = {"x-agrilok-internal": "internal-secret", "x-agrilok-client": "one-browser"}
    statuses = []
    for _ in range(9):
        response = await client.post(
            "/v1/levels/level_7/ask",
            json={"question": "my phone is 9841234567"},
            headers=headers,
        )
        statuses.append(response.status_code)
    assert statuses[:8] == [200] * 8
    assert statuses[8] == 429
    ASK_LIMITS._windows.clear()


async def test_status_reports_how_long_questions_took_and_what_they_cost(
    client: httpx.AsyncClient, runtime: Runtime, fake: FakeGemini, excerpts: dict[str, str]
) -> None:
    ASK_LIMITS._windows.clear()
    await _seed(runtime, excerpts)
    question = "How many marks is the written examination?"
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
    reply["usageMetadata"] = {"promptTokenCount": 5200, "candidatesTokenCount": 640}
    fake.generations.append(reply)

    first = (await client.post("/v1/levels/level_7/ask", json={"question": question})).json()
    again = (await client.post("/v1/levels/level_7/ask", json={"question": question})).json()
    status = (await client.get("/v1/status")).json()

    assert (first["status"], again["cache"]["kind"]) == ("answered", "exact")
    # A student's response carries the answer, never how it was measured.
    assert "timings" not in first
    assert "usage" not in first
    assert status["today"] == {"ask": 2, "answered": 1, "cache_hit_exact": 1}
    assert status["cache_hit_rate_today"] == 0.5
    assert status["tokens_today"] == {"generate.prompt": 5200, "generate.output": 640}
    assert status["attempts_today"] == {"embed": 1, "generate": 1}
    timings = status["timings_today"]
    assert timings["total_live"]["count"] == 1
    assert timings["total_exact"]["count"] == 1
    assert timings["generate"]["count"] == 1
    assert timings["cache"]["count"] == 2, "both questions looked in the cache"
    assert timings["total_exact"]["p95_ms"] is not None
    ASK_LIMITS._windows.clear()
