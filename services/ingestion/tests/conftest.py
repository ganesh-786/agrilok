from __future__ import annotations

import asyncio
import sys
from collections.abc import AsyncIterator, Callable, Iterator, Mapping

import pytest

from agrilok_core.db import Conn
from agrilok_core.settings import Settings
from agrilok_core.testing import reset
from agrilok_infra.testing import admin_url, temporary_database


def pytest_asyncio_loop_factories(
    config: pytest.Config, item: pytest.Item
) -> Mapping[str, Callable[[], asyncio.AbstractEventLoop]]:
    # psycopg's async driver cannot run on Windows' default Proactor loop.
    if sys.platform == "win32":
        return {"selector": asyncio.SelectorEventLoop}
    return {"default": asyncio.new_event_loop}


@pytest.fixture(scope="session")
def db_url() -> Iterator[str]:
    server = admin_url()
    if server is None:
        pytest.skip("no Postgres reachable; start one with `agrilok-db start`")
    with temporary_database(server) as url:
        yield url


@pytest.fixture
async def conn(db_url: str) -> AsyncIterator[Conn]:
    from agrilok_core.db import connect

    connection = await connect(Settings(database_url=db_url))
    await reset(connection)
    yield connection
    await connection.close()
