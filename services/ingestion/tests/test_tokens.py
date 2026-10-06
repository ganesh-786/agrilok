"""Counting each chunk's real tokens against the embedding model's input limit."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx
import pytest
from pydantic import SecretStr

from agrilok_core.db import Conn
from agrilok_core.gemini import GeminiError
from agrilok_core.runtime import Runtime, open_runtime
from agrilok_core.settings import Settings
from agrilok_core.testing import add_chunk, add_document, unit
from ingestion.tokens import UnknownLimitError, audit, limit_for

VECTOR = unit((0, 1.0))


async def _no_sleep(_: float) -> None:
    return None


class Tokeniser:
    """Stands in for the provider's tokeniser.

    Three tokens for a Devanagari character and a quarter for a Latin one:
    not real figures, only far enough apart that a word count cannot stand in
    for either.
    """

    def __init__(self) -> None:
        self.paths: list[str] = []
        self.refuse = False

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.paths.append(request.url.path)
        if self.refuse:
            return httpx.Response(404, json={"error": {"message": "countTokens is not supported"}})
        text = json.loads(request.content)["contents"][0]["parts"][0]["text"]
        tokens = sum(3 if ord(ch) > 0x900 else 0.25 for ch in text)
        return httpx.Response(200, json={"totalTokens": round(tokens)})


@pytest.fixture
def tokeniser() -> Tokeniser:
    return Tokeniser()


@pytest.fixture
async def rt(db_url: str, conn: Conn, tokeniser: Tokeniser) -> AsyncIterator[Runtime]:
    # `conn` resets the database before each test.
    await add_document(conn, "DOC")
    await add_document(conn, "QUEUED", admission="queued")
    await add_chunk(conn, "DOC-01-000", "DOC", "Definition of soil " * 40, VECTOR)
    await add_chunk(conn, "DOC-01-001", "DOC", "माटोको परिभाषा " * 60, VECTOR, index=1)
    await add_chunk(conn, "DOC-01-002", "DOC", "Short heading", VECTOR, index=2)
    await add_chunk(conn, "QUEUED-01-000", "QUEUED", "कृषि प्रसार " * 30, None)
    settings = Settings(
        database_url=db_url,
        gemini_api_key=SecretStr("test-key"),
        gemini_max_requests_per_minute=6000,
    )
    runtime = await open_runtime(
        settings,
        http=httpx.AsyncClient(transport=httpx.MockTransport(tokeniser.handler)),
        sleep=_no_sleep,
    )
    yield runtime
    await runtime.close()


async def test_a_chunk_the_embedding_model_cannot_read_whole_is_found(rt: Runtime) -> None:
    result = await audit(rt, longest=None, limit=2048, report=lambda _: None)

    assert [c.chunk_id for c in result.over] == ["DOC-01-001"]
    assert result.largest is not None
    assert result.largest.chunk_id == "DOC-01-001"
    # The chunker's estimate (words) and the real count are far apart for
    # Devanagari, which is why the estimate cannot be what is checked.
    assert result.largest.tokens > 10 * result.largest.approx_tokens
    assert len(result.counted) == result.chunks_in_corpus == 4
    assert result.longest_uncounted_octets == 0


async def test_the_longest_chunks_are_counted_first_and_the_rest_is_bounded_not_hidden(
    rt: Runtime, tokeniser: Tokeniser
) -> None:
    result = await audit(rt, longest=2, limit=2048, report=lambda _: None)

    # Longest in bytes, queued documents included: they are embedded before admission.
    assert [c.chunk_id for c in result.counted] == ["DOC-01-001", "QUEUED-01-000"]
    assert len(tokeniser.paths) == 2
    assert result.chunks_in_corpus == 4
    assert result.longest_uncounted_octets == len(("Definition of soil " * 40).encode())
    assert result.uncounted_could_reach > 0


async def test_counting_spends_no_quota_and_uses_the_embedding_model_by_default(
    rt: Runtime, tokeniser: Tokeniser
) -> None:
    await audit(rt, longest=1, limit=2048, report=lambda _: None)
    async with rt.pool.connection() as conn:
        reserved = await (await conn.execute("select count(*) as n from quota_usage")).fetchone()

    assert tokeniser.paths == ["/v1beta/models/gemini-embedding-001:countTokens"]
    assert reserved == {"n": 0}


async def test_a_provider_that_will_not_count_is_an_error_not_a_guess(
    rt: Runtime, tokeniser: Tokeniser
) -> None:
    tokeniser.refuse = True

    with pytest.raises(GeminiError):
        await audit(rt, longest=1, limit=2048, report=lambda _: None)


def test_the_limit_comes_from_the_model_and_an_unknown_model_must_be_told() -> None:
    assert limit_for("gemini-embedding-001") == 2048
    assert limit_for("gemini-embedding-2") == 8192
    assert limit_for("some-future-model", override=4096) == 4096
    with pytest.raises(UnknownLimitError, match="--limit-tokens"):
        limit_for("some-future-model")
