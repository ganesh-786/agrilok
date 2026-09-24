from __future__ import annotations

import asyncio
import json
import sys
from collections.abc import AsyncIterator, Callable, Iterator, Mapping
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr

from agrilok_api.main import create_app
from agrilok_core.runtime import Runtime, open_runtime
from agrilok_core.settings import Settings
from agrilok_core.testing import FakeGemini, reset
from agrilok_infra.testing import admin_url, temporary_database

EXCERPTS = (
    Path(__file__).resolve().parents[3] / "packages/core/tests/fixtures/syllabus_excerpts.json"
)


def pytest_asyncio_loop_factories(
    config: pytest.Config, item: pytest.Item
) -> Mapping[str, Callable[[], asyncio.AbstractEventLoop]]:
    # psycopg's async driver cannot run on Windows' default Proactor loop.
    if sys.platform == "win32":
        return {"selector": asyncio.SelectorEventLoop}
    return {"default": asyncio.new_event_loop}


@pytest.fixture(scope="session")
def excerpts() -> dict[str, str]:
    data: dict[str, str] = json.loads(EXCERPTS.read_text(encoding="utf-8"))
    return data


@pytest.fixture(scope="session")
def db_url() -> Iterator[str]:
    server = admin_url()
    if server is None:
        pytest.skip("no Postgres reachable; start one with `agrilok-db start`")
    with temporary_database(server) as url:
        yield url


async def _no_sleep(_: float) -> None:
    return None


@pytest.fixture
def fake() -> FakeGemini:
    return FakeGemini()


@pytest.fixture
def settings(db_url: str) -> Settings:
    return Settings(
        database_url=db_url,
        gemini_api_key=SecretStr("test-key"),
        gemini_generation_model="lite-primary",
        gemini_generation_fallbacks="",
        gemini_max_requests_per_minute=6000,
        api_internal_token=SecretStr("internal-secret"),
    )


@pytest.fixture
async def runtime(settings: Settings, fake: FakeGemini) -> AsyncIterator[Runtime]:
    rt = await open_runtime(settings, http=fake.client(), sleep=_no_sleep)
    async with rt.pool.connection() as conn:
        await reset(conn)
    yield rt
    await rt.close()


@pytest.fixture
async def client(settings: Settings, runtime: Runtime) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(settings, runtime=runtime)
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http,
    ):
        yield http
