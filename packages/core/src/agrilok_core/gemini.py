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
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
MAX_RETRIES = 4
MAX_BACKOFF_SECONDS = 20.0
# Google documents no maximum per batchEmbedContents call. 25 is chosen to sit
# comfortably under anything plausible, not measured against a real ceiling.
EMBED_BATCH_SIZE = 25

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


class _RateGate:
    """Space requests out so our own ceiling is hit before the provider's."""

    def __init__(self, per_minute: int) -> None:
        self._interval = 60.0 / max(1, per_minute)
        self._lock = asyncio.Lock()
        self._last = -self._interval

    async def wait(self, sleep: Sleep) -> None:
        async with self._lock:
            delay = self._interval - (time.monotonic() - self._last)
            if delay > 0:
                await sleep(delay)
            self._last = time.monotonic()


@dataclass
class Generation:
    text: str | None
    model: str
    blocked: bool = False
    block_reason: str | None = None
    finish_reason: str | None = None
    skipped: list[dict[str, Any]] = field(default_factory=list)


class GeminiClient:
    def __init__(
        self,
        *,
        api_key: str | None,
        embedding_model: str,
        embedding_dimensions: int,
        timeout_seconds: float,
        requests_per_minute: int,
        before_request: BeforeRequest | None = None,
        http: httpx.AsyncClient | None = None,
        sleep: Sleep = asyncio.sleep,
    ) -> None:
        self._api_key = api_key
        self._embedding_model = embedding_model
        self._embedding_dimensions = embedding_dimensions
        self._before_request = before_request
        self._sleep = sleep
        self._gate = _RateGate(requests_per_minute)
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
    ) -> dict[str, Any]:
        headers = self._headers()
        attempt = 0
        while True:
            attempt += 1
            await self._gate.wait(self._sleep)
            if self._before_request is not None and kind is not None:
                # Every HTTP attempt counts against the provider's quota,
                # retries included, so every attempt is reserved here.
                # Metadata calls (kind None) draw on no generation quota.
                await self._before_request(kind)
            try:
                response = await self._http.request(
                    method, f"{API_BASE}/{path}", headers=headers, json=body
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
            except httpx.TimeoutException:
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

    async def embed(self, text: str, task_type: TaskType) -> list[float]:
        payload = await self._request(
            "POST",
            f"models/{self._embedding_model}:embedContent",
            "embed",
            "embed",
            self._embed_request(text, task_type),
        )
        values = (payload.get("embedding") or {}).get("values")
        if not isinstance(values, list) or not values:
            raise GeminiError("embed returned no embedding values", status=502)
        return [float(v) for v in values]

    async def embed_query(self, text: str) -> list[float]:
        return await self.embed(text, "RETRIEVAL_QUERY")

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
                )
                used_model = model
                break
            except GeminiError as exc:
                if is_last or not exc.overload_or_quota:
                    raise
                skipped.append({"model": model, "status": exc.status})
                log.warning("gemini %s unavailable (HTTP %s), falling back", model, exc.status)
        assert payload is not None  # noqa: S101 - the loop either breaks with a payload or raises

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
