"""A small async client for the Gemini REST API: embeddings and structured generation.

No SDK, on purpose: the surface needed is three endpoints, and a thin client
keeps exactly what is sent visible (ADR-0005 depends on knowing what reaches
the model). Behaviour carried over from the spike, each rule learned from a
real failure (see spike/lib/gemini.mjs):

- A 429 is not one thing. A per-minute limit clears in seconds and is retried;
  a daily quota does not clear before the process exits and is not.
- Retry-After is honoured, but capped, so a daily reset can never stall a request.
- Overload and quota errors move generation to the next model in the chain;
  "model not found" does not, because a retired model must fail loudly.
- The API key is sent in a header, never in a URL, and never logged.
- Our own ceiling limits how many requests start in a minute, not how far
  apart they are. Spacing them out made every question wait for nothing.
- A question has one time budget (agrilok_core.deadline). A request never
  waits, runs or retries past it.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from collections import Counter, deque
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

from agrilok_core.deadline import Clock, Deadline

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
MAX_RETRIES = 4
MAX_BACKOFF_SECONDS = 20.0
# Google documents no maximum per batchEmbedContents call. 25 is chosen to sit
# comfortably under anything plausible, not measured against a real ceiling.
EMBED_BATCH_SIZE = 25
RATE_WINDOW_SECONDS = 60.0
# An attempt given less than this cannot finish, so it is not started.
MIN_ATTEMPT_SECONDS = 1.0

TaskType = Literal["RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY"]
RequestKind = Literal["generate", "embed"]
BeforeRequest = Callable[[RequestKind], Awaitable[None]]
Sleep = Callable[[float], Awaitable[None]]

log = logging.getLogger(__name__)


class GeminiNotConfiguredError(RuntimeError):
    """No API key is set. Cached and pre-generated content still serves."""


class GeminiError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status: int,
        google_status: str | None = None,
        exhausted: bool = False,
        per_minute: bool = False,
        retry_after_seconds: float | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.google_status = google_status
        self.exhausted = exhausted
        self.per_minute = per_minute
        self.retry_after_seconds = retry_after_seconds

    @property
    def retryable(self) -> bool:
        return self.status in RETRYABLE_STATUS and not self.exhausted

    @property
    def overload_or_quota(self) -> bool:
        return self.status in {429, 500, 503, 504}


class GeminiDeadlineError(GeminiError):
    """The question's time budget ran out before the provider answered.

    Never retried and never a reason to try the next model: there is no time
    left for either.
    """

    def __init__(self, message: str) -> None:
        super().__init__(message, status=504)

    @property
    def retryable(self) -> bool:
        return False

    @property
    def overload_or_quota(self) -> bool:
        return False


_RETRY_HINT = re.compile(r"retry in ([0-9.]+)s", re.IGNORECASE)


def parse_api_error(
    status: int, raw_text: str, label: str, retry_after_header: str | None
) -> GeminiError:
    """Turn a non-2xx response into an error that says whether to retry.

    Parses Google's structured error body instead of truncating it: a blind cut
    once landed just before the line naming which quota was hit.
    """
    message = raw_text
    google_status: str | None = None
    quota_detail: str | None = None
    try:
        parsed = json.loads(raw_text)
        api_error = parsed.get("error") if isinstance(parsed, dict) else None
        if isinstance(api_error, dict):
            message = str(api_error.get("message") or message)
            google_status = api_error.get("status")
            for detail in api_error.get("details") or []:
                if "QuotaFailure" in str(detail.get("@type", "")):
                    violation = (detail.get("violations") or [{}])[0]
                    quota_detail = (
                        f"quotaId={violation.get('quotaId', '?')} "
                        f"quotaMetric={violation.get('quotaMetric', '?')}"
                    )
                    break
    except (json.JSONDecodeError, AttributeError, TypeError):
        # Not JSON, or not Google's error shape (a proxy's HTML error page, for
        # one). The raw text is still the most useful message, so keep it.
        pass

    # Not every RESOURCE_EXHAUSTED is a daily quota. The embedding model has a
    # tokens-per-minute cap that Devanagari chunks hit quickly; it clears in
    # under a minute. Only a quota that is not per-minute is unrecoverable.
    per_minute = bool(quota_detail and re.search("PerMinute", quota_detail, re.IGNORECASE))
    exhausted = not per_minute and (
        google_status == "RESOURCE_EXHAUSTED"
        or re.search("exceeded your current quota", message, re.IGNORECASE) is not None
    )
    retry_after: float | None = None
    if retry_after_header:
        try:
            retry_after = float(retry_after_header)
        except ValueError:
            retry_after = None
    else:
        hinted = _RETRY_HINT.search(message)
        if hinted:
            retry_after = float(hinted.group(1))
    text = f"{label} failed: HTTP {status}"
    if google_status:
        text += f" ({google_status})"
    text += f" - {message}"
    if quota_detail:
        text += f" [{quota_detail}]"
    return GeminiError(
        text,
        status=status,
        google_status=google_status,
        exhausted=exhausted,
        per_minute=per_minute,
        retry_after_seconds=retry_after,
    )


class _SlidingWindow:
    """At most `limit` request starts in any `window` seconds.

    It replaces a gate that started one request every 60 / limit seconds. That
    kept the same ceiling, but it also made a lone question wait six seconds
    between its embedding and its generation, with nothing else in the queue.
    Here a request starts at once while the window has room, and waits only
    for the oldest start to leave the window when it does not.

    A start is booked the moment it is asked for, possibly in the future, so
    callers cannot overtake one another and nothing is held while they sleep.
    Booked starts never decrease, and start number i + limit is always at
    least one window after start number i, which is the whole guarantee.

    Like the gate before it, this lives in one process. Several API instances
    each have their own, so the daily ceiling in the database (quota.reserve)
    stays the limit that all of them share.
    """

    def __init__(self, limit: int, window: float = RATE_WINDOW_SECONDS) -> None:
        self._limit = max(1, limit)
        self._window = window
        self._starts: deque[float] = deque(maxlen=self._limit)

    def book(self, now: float, max_wait: float | None = None) -> float | None:
        """Seconds to wait before starting, or None if that is longer than `max_wait`.

        A refused booking takes no slot.
        """
        has_room = len(self._starts) < self._limit
        start = now if has_room else max(now, self._starts[0] + self._window)
        wait = start - now
        if max_wait is not None and wait > max_wait:
            return None
        self._starts.append(start)  # when full, the oldest start drops off the left
        return wait


@dataclass
class CallStats:
    """What one question cost at the provider. Counts only, never text (docs/privacy.md)."""

    # HTTP attempts per kind, retries included: what the provider's quota saw.
    attempts: Counter[str] = field(default_factory=Counter)
    # Time held back by our own limiter, as distinct from the provider being slow.
    waited_seconds: float = 0.0
    # Token counts as the provider reported them, keyed "<kind>.<what>".
    tokens: Counter[str] = field(default_factory=Counter)


# Our name for each count the provider reports with a generation.
_GENERATION_USAGE = {
    "promptTokenCount": "generate.prompt",
    "cachedContentTokenCount": "generate.cached",
    "candidatesTokenCount": "generate.output",
    "thoughtsTokenCount": "generate.thinking",
}


def _count(usage: Any, name: str) -> int:
    value = usage.get(name) if isinstance(usage, dict) else None
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else 0


@dataclass
class Generation:
    text: str | None
    model: str
    blocked: bool = False
    block_reason: str | None = None
    finish_reason: str | None = None
    skipped: list[dict[str, Any]] = field(default_factory=list)
    # Token counts for this generation, keyed as in CallStats.tokens.
    usage: dict[str, int] = field(default_factory=dict)


class GeminiClient:
    def __init__(
        self,
        *,
        api_key: str | None,
        embedding_model: str,
        embedding_dimensions: int,
        timeout_seconds: float,
        requests_per_minute: int,
        embed_requests_per_minute: int | None = None,
        before_request: BeforeRequest | None = None,
        http: httpx.AsyncClient | None = None,
        sleep: Sleep = asyncio.sleep,
        clock: Clock = time.monotonic,
    ) -> None:
        self._api_key = api_key
        self._embedding_model = embedding_model
        self._embedding_dimensions = embedding_dimensions
        self._before_request = before_request
        self._sleep = sleep
        self._clock = clock
        self._timeout_seconds = timeout_seconds
        # The provider counts each model against its own allowance, so
        # embeddings and generation each get a window. Sharing one made a
        # question's embedding use up a generation slot.
        self._gates: dict[RequestKind | None, _SlidingWindow] = {
            "generate": _SlidingWindow(requests_per_minute),
            "embed": _SlidingWindow(embed_requests_per_minute or requests_per_minute),
            # Metadata calls (does the model exist, count these tokens) draw
            # on no quota we meter, and must not take a slot from an answer.
            None: _SlidingWindow(requests_per_minute),
        }
        self._owns_http = http is None
        self._http = http or httpx.AsyncClient(timeout=httpx.Timeout(timeout_seconds))

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    # --- transport ------------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        if not self._api_key:
            raise GeminiNotConfiguredError("GEMINI_API_KEY is not set")
        return {"x-goog-api-key": self._api_key, "Content-Type": "application/json"}

    async def _request(
        self,
        method: str,
        path: str,
        label: str,
        kind: RequestKind | None,
        body: dict[str, Any] | None = None,
        max_retries: int = MAX_RETRIES,
        *,
        deadline: Deadline | None = None,
        stats: CallStats | None = None,
    ) -> dict[str, Any]:
        headers = self._headers()
        gate = self._gates[kind]
        attempt = 0
        while True:
            attempt += 1
            left = deadline.remaining() if deadline is not None else None
            if left is not None and left < MIN_ATTEMPT_SECONDS:
                raise GeminiDeadlineError(f"{label} ran out of time")
            wait = gate.book(self._clock(), max_wait=left)
            if wait is None:
                raise GeminiDeadlineError(f"{label} found no free request slot in time")
            if wait > 0:
                if stats is not None:
                    stats.waited_seconds += wait
                await self._sleep(wait)
            if self._before_request is not None and kind is not None:
                # Every HTTP attempt counts against the provider's quota,
                # retries included, so every attempt is reserved here.
                # Metadata calls (kind None) draw on no generation quota.
                await self._before_request(kind)
            if stats is not None and kind is not None:
                stats.attempts[kind] += 1
            # With a deadline, an attempt gets what is left of it, never the
            # full per-request timeout. The HTTP timeout bounds each wait on
            # the network, not the attempt as a whole, so a reply that keeps
            # trickling in could outlast it. The second bound is on the clock.
            timeout: Any = httpx.USE_CLIENT_DEFAULT
            cut_off: float | None = None
            if deadline is not None:
                cut_off = max(MIN_ATTEMPT_SECONDS, deadline.remaining())
                timeout = min(self._timeout_seconds, cut_off)
            try:
                async with asyncio.timeout(cut_off):
                    response = await self._http.request(
                        method, f"{API_BASE}/{path}", headers=headers, json=body, timeout=timeout
                    )
                if response.status_code >= 400:
                    raise parse_api_error(
                        response.status_code,
                        response.text,
                        label,
                        response.headers.get("retry-after"),
                    )
                payload = response.json()
                if not isinstance(payload, dict):
                    raise GeminiError(f"{label} returned a non-object body", status=502)
                return payload
            except (httpx.TimeoutException, TimeoutError):
                error = GeminiError(f"{label} timed out", status=504)
            except httpx.TransportError as exc:
                error = GeminiError(f"{label} network error: {type(exc).__name__}", status=503)
            except GeminiError as exc:
                error = exc
            if not error.retryable or attempt > max_retries:
                raise error
            backoff = error.retry_after_seconds
            if backoff is None:
                backoff = 2**attempt + random.random() * 0.5  # noqa: S311 - jitter, not crypto
            backoff = min(backoff, MAX_BACKOFF_SECONDS)
            if deadline is not None and backoff + MIN_ATTEMPT_SECONDS > deadline.remaining():
                # No time to wait and try again: report the failure that
                # happened, not a retry that could not.
                raise error
            log.warning(
                "gemini %s got HTTP %s, retrying in %.0fs (attempt %d/%d)",
                label,
                error.status,
                backoff,
                attempt,
                max_retries,
            )
            await self._sleep(backoff)

    # --- embeddings -------------------------------------------------------------

    def _embed_request(self, text: str, task_type: TaskType) -> dict[str, Any]:
        return {
            "model": f"models/{self._embedding_model}",
            "content": {"parts": [{"text": text}]},
            "taskType": task_type,
            "outputDimensionality": self._embedding_dimensions,
        }

    async def embed(
        self,
        text: str,
        task_type: TaskType,
        *,
        deadline: Deadline | None = None,
        stats: CallStats | None = None,
    ) -> list[float]:
        payload = await self._request(
            "POST",
            f"models/{self._embedding_model}:embedContent",
            "embed",
            "embed",
            self._embed_request(text, task_type),
            deadline=deadline,
            stats=stats,
        )
        values = (payload.get("embedding") or {}).get("values")
        if not isinstance(values, list) or not values:
            raise GeminiError("embed returned no embedding values", status=502)
        if stats is not None:
            stats.tokens["embed.prompt"] += _count(payload.get("usageMetadata"), "promptTokenCount")
        return [float(v) for v in values]

    async def embed_query(
        self, text: str, *, deadline: Deadline | None = None, stats: CallStats | None = None
    ) -> list[float]:
        return await self.embed(text, "RETRIEVAL_QUERY", deadline=deadline, stats=stats)

    async def count_tokens(self, text: str, model: str | None = None) -> int:
        """How many tokens `model` (the embedding model by default) makes of `text`.

        A metadata call: it generates nothing and draws on no quota this
        project meters. Whether the provider's tokeniser endpoint accepts a
        given model is the provider's decision. A refusal comes back as a
        GeminiError and is never papered over with an estimate.
        """
        name = model or self._embedding_model
        payload = await self._request(
            "POST",
            f"models/{name}:countTokens",
            f"count_tokens[{name}]",
            None,
            {"contents": [{"parts": [{"text": text}]}]},
        )
        total = payload.get("totalTokens")
        if not isinstance(total, int) or isinstance(total, bool) or total < 0:
            raise GeminiError("count_tokens returned no totalTokens", status=502)
        return total

    async def embed_batch(
        self,
        items: Sequence[tuple[str, str]],
        task_type: TaskType = "RETRIEVAL_DOCUMENT",
        *,
        batch_size: int = EMBED_BATCH_SIZE,
        on_group_done: Callable[[dict[str, list[float]]], Awaitable[None]] | None = None,
    ) -> dict[str, list[float]]:
        """Embed many (id, text) pairs, one request per batch.

        A failed batch is split in half and retried, so one bad item costs a
        few extra requests instead of the whole batch. `on_group_done` lets the
        caller write vectors as they arrive, so a run that stops partway keeps
        what it already paid for.
        """
        results: dict[str, list[float]] = {}

        async def embed_group(group: Sequence[tuple[str, str]]) -> None:
            if not group:
                return
            if len(group) == 1:
                item_id, text = group[0]
                vector = await self.embed(text, task_type)
                results[item_id] = vector
                if on_group_done is not None:
                    await on_group_done({item_id: vector})
                return
            try:
                payload = await self._request(
                    "POST",
                    f"models/{self._embedding_model}:batchEmbedContents",
                    f"embed_batch[{len(group)}]",
                    "embed",
                    {"requests": [self._embed_request(text, task_type) for _, text in group]},
                )
                embeddings = payload.get("embeddings")
                if not isinstance(embeddings, list) or len(embeddings) != len(group):
                    raise GeminiError("batch returned the wrong number of embeddings", status=502)
                done: dict[str, list[float]] = {}
                for (item_id, _), emb in zip(group, embeddings, strict=True):
                    values = emb.get("values") if isinstance(emb, dict) else None
                    if not isinstance(values, list) or not values:
                        raise GeminiError(f"batch item {item_id} has no values", status=502)
                    done[item_id] = [float(v) for v in values]
                results.update(done)
                if on_group_done is not None:
                    await on_group_done(done)
            except GeminiError as exc:
                if exc.exhausted:
                    raise
                mid = (len(group) + 1) // 2
                log.warning("embed batch of %d failed (%s); splitting", len(group), exc.status)
                await embed_group(group[:mid])
                await embed_group(group[mid:])

        for start in range(0, len(items), batch_size):
            await embed_group(items[start : start + batch_size])
        return results

    # --- generation -------------------------------------------------------------

    async def generate(
        self,
        *,
        system_instruction: str,
        user_text: str,
        response_schema: dict[str, Any],
        models: Sequence[str],
        temperature: float = 0.1,
        max_output_tokens: int = 4096,
        deadline: Deadline | None = None,
        stats: CallStats | None = None,
    ) -> Generation:
        """Generate structured JSON, falling back along `models` on overload or quota only."""
        if not models:
            raise ValueError("no generation model configured")
        body = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_text}]}],
            "generationConfig": {
                "temperature": temperature,
                # Each claim carries a verbatim quote and Devanagari quotes are
                # token-heavy; 2048 cut JSON off mid-object on a real run.
                "maxOutputTokens": max_output_tokens,
                "responseMimeType": "application/json",
                "responseSchema": response_schema,
            },
        }
        skipped: list[dict[str, Any]] = []
        payload: dict[str, Any] | None = None
        used_model = models[0]
        for index, model in enumerate(models):
            is_last = index == len(models) - 1
            try:
                # With a fallback available, give up on an overloaded model after
                # one retry: waiting 30s on a model that is down is worse than
                # asking one that is up.
                payload = await self._request(
                    "POST",
                    f"models/{model}:generateContent",
                    f"generate[{model}]",
                    "generate",
                    body,
                    max_retries=MAX_RETRIES if is_last else 1,
                    deadline=deadline,
                    stats=stats,
                )
                used_model = model
                break
            except GeminiError as exc:
                if is_last or not exc.overload_or_quota:
                    raise
                skipped.append({"model": model, "status": exc.status})
                log.warning("gemini %s unavailable (HTTP %s), falling back", model, exc.status)
        assert payload is not None  # noqa: S101 - the loop either breaks with a payload or raises

        reported = payload.get("usageMetadata")
        usage = {ours: _count(reported, theirs) for theirs, ours in _GENERATION_USAGE.items()}
        if stats is not None:
            stats.tokens.update(usage)

        candidates = payload.get("candidates") or []
        if not candidates:
            feedback = payload.get("promptFeedback") or {}
            block_reason = feedback.get("blockReason")
            if block_reason:
                return Generation(
                    text=None,
                    model=used_model,
                    blocked=True,
                    block_reason=str(block_reason),
                    skipped=skipped,
                    usage=usage,
                )
            raise GeminiError("generate returned no candidates", status=502)
        candidate = candidates[0]
        parts = (candidate.get("content") or {}).get("parts") or []
        text = "".join(str(p.get("text", "")) for p in parts if isinstance(p, dict))
        return Generation(
            text=text,
            model=used_model,
            finish_reason=candidate.get("finishReason"),
            skipped=skipped,
            usage=usage,
        )

    async def model_exists(self, model: str) -> bool:
        """ADR-0008 startup check: does the configured model still answer?"""
        try:
            await self._request("GET", f"models/{model}", f"models.get[{model}]", None, None, 1)
        except GeminiError as exc:
            if exc.status == 404:
                return False
            raise
        return True
