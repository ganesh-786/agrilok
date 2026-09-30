"""Database access helpers: the async pool and vector encoding.

Vectors travel as pgvector's text form ('[0.1,0.2,...]') cast with ::vector,
which needs no extra client library.
"""

from __future__ import annotations

import asyncio
import math
import sys
from collections.abc import Callable, Coroutine, Sequence
from typing import Any

from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool

from agrilok_core.settings import Settings

type Conn = AsyncConnection[DictRow]
type Pool = AsyncConnectionPool[AsyncConnection[DictRow]]


async def open_pool(settings: Settings, *, max_size: int | None = None) -> Pool:
    pool: Pool = AsyncConnectionPool(
        conninfo=settings.database_url,
        connection_class=AsyncConnection[DictRow],
        min_size=1,
        max_size=max_size or settings.database_pool_size,
        open=False,
        kwargs={"autocommit": True, "row_factory": dict_row},
    )
    await pool.open(wait=True, timeout=30)
    return pool


async def connect(settings: Settings) -> Conn:
    """A single connection for command-line tools."""
    return await AsyncConnection.connect(
        settings.database_url, autocommit=True, row_factory=dict_row
    )


def l2_normalize(vector: Sequence[float]) -> list[float]:
    """Unit length, so cosine distance and inner product agree.

    gemini-embedding-001 only normalises its full 3072-dimension output; the
    768-dimension vectors this project stores are not unit length.
    """
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0:
        raise ValueError("cannot normalise a zero vector")
    return [x / norm for x in vector]


def vector_literal(vector: Sequence[float]) -> str:
    return "[" + ",".join(f"{x:.8g}" for x in vector) + "]"


def parse_vector(text: str) -> list[float]:
    body = text.strip().removeprefix("[").removesuffix("]")
    return [float(x) for x in body.split(",")] if body else []


def run_sync[T](main: Callable[[], Coroutine[Any, Any, T]]) -> T:
    """Run an async entry point from a CLI.

    psycopg's async driver cannot use Windows' default Proactor event loop, so
    command-line tools use a selector loop there.
    """
    if sys.platform == "win32":
        return asyncio.run(main(), loop_factory=asyncio.SelectorEventLoop)
    return asyncio.run(main())
