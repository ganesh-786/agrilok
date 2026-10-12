"""Wiring: settings, the database pool and a Gemini client whose every request is metered."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

import httpx

from agrilok_core import quota
from agrilok_core.db import Pool, open_pool
from agrilok_core.gemini import GeminiClient, RequestKind, Sleep
from agrilok_core.settings import Settings, get_settings


@dataclass
class Runtime:
    settings: Settings
    pool: Pool
    gemini: GeminiClient

    async def close(self) -> None:
        await self.gemini.aclose()
        await self.pool.close()


async def open_runtime(
    settings: Settings | None = None,
    *,
    pool_size: int | None = None,
    http: httpx.AsyncClient | None = None,
    sleep: Sleep = asyncio.sleep,
) -> Runtime:
    """Open the pool and a Gemini client. `http` and `sleep` exist for tests."""
    settings = settings or get_settings()
    pool = await open_pool(settings, max_size=pool_size)

    async def before_request(kind: RequestKind) -> None:
        limit = (
            settings.gemini_max_requests_per_day
            if kind == "generate"
            else settings.gemini_max_embed_requests_per_day
        )
        async with pool.connection() as conn:
            await quota.reserve(conn, kind, limit)

    api_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else None
    gemini = GeminiClient(
        api_key=api_key or None,
        embedding_model=settings.gemini_embedding_model,
        embedding_dimensions=settings.gemini_embedding_dimensions,
        timeout_seconds=settings.gemini_request_timeout_seconds,
        requests_per_minute=settings.gemini_max_requests_per_minute,
        embed_requests_per_minute=settings.gemini_max_embed_requests_per_minute,
        before_request=before_request,
        http=http,
        sleep=sleep,
    )
    return Runtime(settings=settings, pool=pool, gemini=gemini)
