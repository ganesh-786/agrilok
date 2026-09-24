from __future__ import annotations

import asyncio
import json
import sys
from collections.abc import Callable, Mapping
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def pytest_asyncio_loop_factories(
    config: pytest.Config, item: pytest.Item
) -> Mapping[str, Callable[[], asyncio.AbstractEventLoop]]:
    # psycopg's async driver cannot run on Windows' default Proactor loop.
    if sys.platform == "win32":
        return {"selector": asyncio.SelectorEventLoop}
    return {"default": asyncio.new_event_loop}


@pytest.fixture(scope="session")
def excerpts() -> dict[str, str]:
    """Short passages from three real syllabus and Constitution chunks.

    Kept short on purpose (NOTICE: quote only what is needed). The text is
    exactly as extracted, damage included, because the damage is what the
    support check has to cope with.
    """
    data: dict[str, str] = json.loads(
        (FIXTURES / "syllabus_excerpts.json").read_text(encoding="utf-8")
    )
    return data
