"""The rate limiter, the question's time budget, and what a question cost.

Time is faked: sleeping moves the clock, nothing really waits, and a test can
say exactly when each request started. No real API calls, no quota spent.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import pytest

from agrilok_core.deadline import Deadline
from agrilok_core.gemini import (
    CallStats,
    GeminiClient,
    GeminiDeadlineError,
    GeminiError,
    _SlidingWindow,
)


class FakeTime:
    def __init__(self) -> None:
        self.now = 1000.0
        self.slept: list[float] = []

    def clock(self) -> float:
        return self.now

    async def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.now += seconds


def _embedding() -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "embedding": {"values": [1.0, 0.0, 0.0, 0.0]},
            "usageMetadata": {"promptTokenCount": 9},
        },
    )


def _generation(text: str = '{"sufficient": false, "answer": "", "claims": []}') -> httpx.Response:
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]})


def _answering(request: httpx.Request) -> httpx.Response:
    return _embedding() if request.url.path.endswith(":embedContent") else _generation()


def _client(handler: Any, time: FakeTime, **kwargs: Any) -> GeminiClient:
    options: dict[str, Any] = {"requests_per_minute": 10, "timeout_seconds": 90}
    options.update(kwargs)
    return GeminiClient(
        api_key="test-key",
        embedding_model="gemini-embedding-001",
        embedding_dimensions=4,
        http=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        sleep=time.sleep,
        clock=time.clock,
        **options,
    )


async def _generate(client: GeminiClient, **kwargs: Any) -> Any:
    return await client.generate(
        system_instruction="s", user_text="u", response_schema={}, models=["m"], **kwargs
    )


# --- the limiter ------------------------------------------------------------------


async def test_a_lone_question_is_not_made_to_wait_between_its_two_requests() -> None:
    # The gate this replaced spaced every request 60 / 10 = 6 seconds apart,
    # so a question alone in the queue still waited 6 seconds for nothing.
    time = FakeTime()
    client = _client(_answering, time)

    await client.embed_query("q")
    await _generate(client)

    assert time.slept == []


def test_no_more_than_the_limit_start_in_any_minute() -> None:
    window = _SlidingWindow(limit=3, window=60.0)
    starts = []
    for arrival in [0.0, 0.0, 0.0, 0.0, 1.0, 2.0, 59.0, 61.0, 61.0, 200.0, 200.0, 200.0, 200.0]:
        wait = window.book(arrival)
        assert wait is not None
        starts.append(arrival + wait)

    assert starts == sorted(starts), "a later request never starts before an earlier one"
    for i in range(len(starts) - 3):
        assert starts[i + 3] - starts[i] >= 60.0, f"four starts within a minute at {starts[i]}"
    # Room in the window means no wait at all. A full one waits for the oldest to leave.
    assert starts[:4] == [0.0, 0.0, 0.0, 60.0]


async def test_a_full_minute_makes_the_next_request_wait_for_the_oldest_to_leave() -> None:
    time = FakeTime()
    client = _client(_answering, time, requests_per_minute=2)

    for _ in range(2):
        await client.embed_query("q")
    assert time.slept == []
    time.now += 20  # twenty seconds pass
    await client.embed_query("q")

    assert time.slept == [pytest.approx(40.0)]


async def test_embedding_does_not_use_up_a_generation_slot() -> None:
    time = FakeTime()
    client = _client(_answering, time, requests_per_minute=1, embed_requests_per_minute=1)

    await client.embed_query("q")
    await _generate(client)

    assert time.slept == []


# --- the question's time budget ---------------------------------------------------


async def test_a_request_that_cannot_start_in_time_is_refused_without_spending_quota() -> None:
    time = FakeTime()
    metered: list[str] = []
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return _embedding()

    async def meter(kind: str) -> None:
        metered.append(kind)

    client = _client(handler, time, requests_per_minute=1, before_request=meter)
    await client.embed_query("first")

    with pytest.raises(GeminiDeadlineError):
        # The next free slot is 60 seconds away. This question has 30.
        await client.embed_query("second", deadline=Deadline.after(30, time.clock))

    assert len(seen) == 1
    assert metered == ["embed"]
    assert time.slept == []
    # The refused request took no slot: one with enough time gets the next one.
    await client.embed_query("third", deadline=Deadline.after(90, time.clock))
    assert time.slept == [pytest.approx(60.0)]


async def test_retries_stop_when_the_question_runs_out_of_time() -> None:
    time = FakeTime()
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        time.now += 10  # every attempt takes ten seconds and fails
        return httpx.Response(503, json={"error": {"message": "overloaded"}})

    client = _client(handler, time, requests_per_minute=600)

    with pytest.raises(GeminiError) as excinfo:
        await client.embed_query("q", deadline=Deadline.after(25, time.clock))

    # Without a deadline this is five attempts. With 25 seconds there is one
    # attempt (10 s), a short backoff, a second attempt, and no time for a third.
    assert excinfo.value.status == 503, "the failure that happened is reported"
    assert attempts == 2
    assert time.now - 1000.0 <= 25


async def test_without_a_deadline_the_old_retry_count_is_unchanged() -> None:
    time = FakeTime()
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(503, json={"error": {"message": "overloaded"}})

    with pytest.raises(GeminiError):
        await _client(handler, time, requests_per_minute=600).embed_query("q")

    assert attempts == 5


async def test_an_attempt_is_given_only_the_time_the_question_has_left() -> None:
    time = FakeTime()
    timeouts: list[Any] = []

    def handler(request: httpx.Request) -> httpx.Response:
        timeouts.append(request.extensions["timeout"]["read"])
        return _embedding()

    client = _client(handler, time, timeout_seconds=90)
    await client.embed_query("q", deadline=Deadline.after(12, time.clock))
    await client.embed_query("q", deadline=Deadline.after(500, time.clock))

    assert timeouts == [pytest.approx(12.0), pytest.approx(90.0)]


async def test_a_reply_still_arriving_when_the_budget_ends_is_cut_off() -> None:
    # Real clock, on purpose: this is the one bound that has to hold on the
    # wall, whatever the HTTP library's own timeouts are doing.
    attempts = 0

    async def slow(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        await asyncio.sleep(30)
        return _embedding()

    client = GeminiClient(
        api_key="test-key",
        embedding_model="gemini-embedding-001",
        embedding_dimensions=4,
        timeout_seconds=90,
        requests_per_minute=600,
        http=httpx.AsyncClient(transport=httpx.MockTransport(slow)),
    )
    started = time.monotonic()

    with pytest.raises(GeminiError) as excinfo:
        await client.embed_query("q", deadline=Deadline.after(1.2))

    assert excinfo.value.status == 504
    assert attempts == 1, "no time for a second attempt"
    assert time.monotonic() - started < 5


async def test_running_out_of_time_does_not_move_on_to_the_next_model() -> None:
    time = FakeTime()
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path.rsplit("/", 1)[-1])
        time.now += 30
        return httpx.Response(503, json={"error": {"message": "overloaded"}})

    client = _client(handler, time, requests_per_minute=600)
    with pytest.raises(GeminiError):
        await client.generate(
            system_instruction="s",
            user_text="u",
            response_schema={},
            models=["primary", "backup"],
            deadline=Deadline.after(30, time.clock),
        )

    # One attempt used the whole budget. The fallback model is never asked.
    assert calls == ["primary:generateContent"]


# --- what a question cost ---------------------------------------------------------


async def test_what_a_question_cost_is_counted_without_keeping_any_text() -> None:
    time = FakeTime()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith(":embedContent"):
            return _embedding()
        return httpx.Response(
            200,
            json={
                "candidates": [{"content": {"parts": [{"text": "{}"}]}}],
                "usageMetadata": {
                    "promptTokenCount": 5200,
                    "candidatesTokenCount": 640,
                    "thoughtsTokenCount": 120,
                    "totalTokenCount": 5960,
                },
            },
        )

    client = _client(handler, time)
    stats = CallStats()
    await client.embed_query("a private question", stats=stats)
    generation = await _generate(client, stats=stats)

    assert dict(stats.attempts) == {"embed": 1, "generate": 1}
    assert stats.tokens["embed.prompt"] == 9
    assert stats.tokens["generate.prompt"] == 5200
    assert stats.tokens["generate.output"] == 640
    assert stats.tokens["generate.thinking"] == 120
    assert generation.usage["generate.output"] == 640
    assert "private" not in repr(stats)


async def test_retries_are_counted_as_the_attempts_they_are() -> None:
    time = FakeTime()
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(500, json={"error": {"message": "blip"}})
        return _embedding()

    stats = CallStats()
    await _client(handler, time, requests_per_minute=600).embed_query("q", stats=stats)

    assert stats.attempts["embed"] == 2


async def test_time_spent_waiting_for_a_slot_is_recorded_as_our_own_wait() -> None:
    time = FakeTime()
    client = _client(_answering, time, requests_per_minute=1)
    stats = CallStats()

    await client.embed_query("q")
    await client.embed_query("q", stats=stats)

    assert stats.waited_seconds == pytest.approx(60.0)


async def test_a_provider_that_reports_no_usage_counts_as_zero_not_an_error() -> None:
    time = FakeTime()
    stats = CallStats()

    await _generate(_client(lambda _: _generation("{}"), time), stats=stats)

    assert stats.tokens["generate.prompt"] == 0


async def test_counting_tokens_is_a_metadata_call_that_reserves_no_quota() -> None:
    time = FakeTime()
    metered: list[str] = []
    paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        return httpx.Response(200, json={"totalTokens": 1830})

    async def meter(kind: str) -> None:
        metered.append(kind)

    client = _client(handler, time, before_request=meter)

    assert await client.count_tokens("some chunk text") == 1830
    assert paths[0].endswith("models/gemini-embedding-001:countTokens")
    assert metered == []


async def test_a_tokeniser_refusal_is_an_error_not_an_estimate() -> None:
    time = FakeTime()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": {"message": "countTokens is not supported"}})

    with pytest.raises(GeminiError) as excinfo:
        await _client(handler, time).count_tokens("text")
    assert excinfo.value.status == 404
