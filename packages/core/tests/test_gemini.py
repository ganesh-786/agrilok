"""The Gemini client, against a fake transport. No real API calls, no quota spent."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from agrilok_core.gemini import GeminiClient, GeminiError, parse_api_error


async def _no_sleep(_: float) -> None:
    return None


def _client(handler: Any, **kwargs: Any) -> GeminiClient:
    return GeminiClient(
        api_key="test-key",
        embedding_model="gemini-embedding-001",
        embedding_dimensions=4,
        timeout_seconds=5,
        requests_per_minute=6000,
        http=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        sleep=_no_sleep,
        **kwargs,
    )


def _ok_generation(text: str) -> httpx.Response:
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]})


def test_daily_quota_is_not_retried_but_per_minute_is() -> None:
    daily = parse_api_error(
        429,
        json.dumps(
            {"error": {"status": "RESOURCE_EXHAUSTED", "message": "exceeded your current quota"}}
        ),
        "generate",
        None,
    )
    per_minute = parse_api_error(
        429,
        json.dumps(
            {
                "error": {
                    "status": "RESOURCE_EXHAUSTED",
                    "message": "Please retry in 12.5s",
                    "details": [
                        {
                            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                            "violations": [{"quotaId": "EmbedContentTokensPerMinute"}],
                        }
                    ],
                }
            }
        ),
        "embed",
        None,
    )
    assert daily.exhausted
    assert not daily.retryable
    assert per_minute.per_minute
    assert per_minute.retryable
    assert per_minute.retry_after_seconds == 12.5


async def test_generation_falls_back_on_overload_and_records_it() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if "primary" in request.url.path:
            return httpx.Response(503, json={"error": {"message": "overloaded"}})
        return _ok_generation('{"sufficient": false, "answer": "", "claims": []}')

    client = _client(handler)
    result = await client.generate(
        system_instruction="s", user_text="u", response_schema={}, models=["primary", "backup"]
    )
    assert result.model == "backup"
    assert result.skipped == [{"model": "primary", "status": 503}]
    # One retry on the primary before falling back, then the backup.
    assert sum("primary" in c for c in calls) == 2


async def test_a_missing_model_fails_loudly_instead_of_falling_back() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if "primary" in request.url.path:
            return httpx.Response(404, json={"error": {"message": "model not found"}})
        return _ok_generation("{}")

    client = _client(handler)
    with pytest.raises(GeminiError) as excinfo:
        await client.generate(
            system_instruction="s", user_text="u", response_schema={}, models=["primary", "backup"]
        )
    assert excinfo.value.status == 404


async def test_every_attempt_is_metered_including_retries() -> None:
    attempts = 0
    metered: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(500, json={"error": {"message": "blip"}})
        return httpx.Response(200, json={"embedding": {"values": [3.0, 4.0, 0.0, 0.0]}})

    async def meter(kind: str) -> None:
        metered.append(kind)

    client = _client(handler, before_request=meter)
    assert await client.embed_query("q") == [3.0, 4.0, 0.0, 0.0]
    assert metered == ["embed", "embed"]


async def test_the_key_goes_in_a_header_never_the_url() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"embedding": {"values": [1.0, 0.0, 0.0, 0.0]}})

    await _client(handler).embed_query("q")
    assert seen[0].headers["x-goog-api-key"] == "test-key"
    assert "test-key" not in str(seen[0].url)
