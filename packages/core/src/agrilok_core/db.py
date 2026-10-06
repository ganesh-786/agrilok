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

from psycopg import AsyncConnection, Pipeline
from psycopg.abc import Params
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool

from agrilok_core.settings import Settings

type Conn = AsyncConnection[DictRow]
type Pool = AsyncConnectionPool[AsyncConnection[DictRow]]
# SQL text and its parameters, built in one place and run in another.
type Statement = tuple[str, Params | None]


async def fetch_together(conn: Conn, statements: Sequence[Statement]) -> list[list[DictRow]]:
    """Run independent statements in one network round trip. Returns each one's rows.

    Sent one at a time, every statement costs a round trip to the database,
    and a question made about a dozen. Once the API and the database are in
    different places, that is most of what a cached answer waits for. libpq's
    pipeline mode sends several statements together.

    Results are read only after the batch has closed, and a batch is never
    opened inside another. Both rules are measured, not style: through a link
    with 50 ms of delay, three statements took about one round trip this way,
    two and a half when read inside the batch, and nearly four when nested.

    The server runs a batch as one implicit transaction. If a statement in it
    fails, the ones sent with it are rolled back and the error is raised, so
    only put statements together that may share that fate.
    """
    if len(statements) < 2 or not Pipeline.is_supported():
        cursors = [await conn.execute(query, params) for query, params in statements]
    else:
        async with conn.pipeline():
            cursors = [await conn.execute(query, params) for query, params in statements]
    # A statement that returns no rows (an insert, an update) has no description.
    return [list(await cur.fetchall()) if cur.description is not None else [] for cur in cursors]


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
