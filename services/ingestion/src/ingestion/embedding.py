"""Embed chunks that have no vector yet, slowly enough for the free tier.

Embedding draws on its own quota (1,000 requests a day and 30,000 tokens a
minute on the 2026-09-18 dashboard), and Devanagari chunks are token-heavy.
Batches are small and paced, every request is metered by the quota governor,
and each finished batch is written at once, so a run that stops partway keeps
what it already paid for. Estimate before you run: the command prints the
request count first.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from dataclasses import dataclass

from agrilok_core.corpus import set_embedding
from agrilok_core.runtime import Runtime


@dataclass
class EmbedPlan:
    chunk_ids: list[str]
    batches: int


async def plan(
    runtime: Runtime, *, include_queued: bool, batch_size: int, limit: int | None
) -> EmbedPlan:
    async with runtime.pool.connection() as conn:
        cur = await conn.execute(
            """
            select c.id from chunks c join documents d on d.id = c.document_id
            where c.embedding is null
              and (%(queued)s or d.admission = 'admitted')
              and d.admission <> 'rejected'
            order by c.id
            limit %(limit)s
            """,
            {"queued": include_queued, "limit": limit},
        )
        ids = [row["id"] for row in await cur.fetchall()]
    return EmbedPlan(chunk_ids=ids, batches=-(-len(ids) // batch_size) if ids else 0)


async def embed_missing(
    runtime: Runtime,
    chunk_ids: list[str],
    *,
    batch_size: int,
    pause_seconds: float,
    report: Callable[[str], None] = print,
) -> int:
    done = 0
    model = runtime.settings.gemini_embedding_model
    for start in range(0, len(chunk_ids), batch_size):
        ids = chunk_ids[start : start + batch_size]
        async with runtime.pool.connection() as conn:
            cur = await conn.execute("select id, text from chunks where id = any(%s)", (ids,))
            items = [(row["id"], row["text"]) for row in await cur.fetchall()]

        async def write(vectors: dict[str, list[float]]) -> None:
            async with runtime.pool.connection() as conn:
                for chunk_id, vector in vectors.items():
                    await set_embedding(conn, chunk_id, vector, model)

        vectors = await runtime.gemini.embed_batch(
            items, "RETRIEVAL_DOCUMENT", batch_size=batch_size, on_group_done=write
        )
        done += len(vectors)
        report(f"embedded {done}/{len(chunk_ids)}")
        if start + batch_size < len(chunk_ids) and pause_seconds > 0:
            # Tokens per minute, not requests, is the limit that bites on
            # Devanagari; a pause between batches keeps well under it.
            await asyncio.sleep(pause_seconds)
    return done
