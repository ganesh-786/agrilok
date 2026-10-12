"""Daily counts and timings, and sending statements to the database together."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator

import psycopg
import pytest

from agrilok_core import metrics, quota
from agrilok_core.db import Conn, connect, fetch_together
from agrilok_core.settings import Settings
from agrilok_infra.testing import admin_url, temporary_database

# --- metrics: no database needed ----------------------------------------------------


def test_a_duration_is_counted_in_the_bucket_it_falls_in() -> None:
    assert metrics.timing_metric("generate", 0) == "ms.generate.50"
    assert metrics.timing_metric("generate", 50) == "ms.generate.50"
    assert metrics.timing_metric("generate", 51) == "ms.generate.100"
    assert metrics.timing_metric("generate", 2400) == "ms.generate.2500"
    assert metrics.timing_metric("generate", 60_001) == "ms.generate.over"


def test_percentiles_read_back_are_the_upper_edge_of_a_bucket() -> None:
    # 100 questions: 90 took up to 2.5 s, 8 up to 5 s, 2 up to 10 s.
    day = {"ms.generate.2500": 90, "ms.generate.5000": 8, "ms.generate.10000": 2}

    timing = metrics.read(day).timings["generate"]

    assert timing.count == 100
    assert timing.p50_ms == 2500
    assert timing.p95_ms == 5000


def test_a_percentile_past_the_last_bucket_is_reported_as_unknown_not_as_a_number() -> None:
    timing = metrics.read({"ms.generate.1000": 1, "ms.generate.over": 9}).timings["generate"]

    assert timing.p50_ms is None
    assert timing.p95_ms is None


def test_one_slow_question_in_a_small_sample_is_not_hidden() -> None:
    # With three samples, p95 has to be the slowest one, never the middle.
    timing = metrics.read({"ms.total_live.1000": 2, "ms.total_live.30000": 1}).timings["total_live"]

    assert timing.p50_ms == 1000
    assert timing.p95_ms == 30000


def test_a_day_is_taken_apart_into_outcomes_timings_tokens_and_attempts() -> None:
    usage = metrics.read(
        {
            "ask": 12,
            "cache_hit_exact": 9,
            "ms.total_exact.50": 9,
            "tokens.generate.output": 1800,
            "attempts.embed": 3,
        }
    )

    assert usage.counts == {"ask": 12, "cache_hit_exact": 9}
    assert set(usage.timings) == {"total_exact"}
    assert usage.tokens == {"generate.output": 1800}
    assert usage.attempts == {"embed": 3}


# --- batches: against a real Postgres ------------------------------------------------


@pytest.fixture(scope="module")
def db_url() -> Iterator[str]:
    server = admin_url()
    if server is None:
        pytest.skip("no Postgres reachable; start one with `agrilok-db start`")
    with temporary_database(server) as url:
        yield url


@pytest.fixture
async def conn(db_url: str) -> AsyncIterator[Conn]:
    connection = await connect(Settings(database_url=db_url))
    await connection.execute("truncate usage_daily")
    yield connection
    await connection.close()


async def _today(conn: Conn) -> dict[str, int]:
    cur = await conn.execute("select metric, count from usage_daily")
    return {row["metric"]: int(row["count"]) for row in await cur.fetchall()}


async def test_statements_sent_together_each_return_their_own_rows_in_order(conn: Conn) -> None:
    first, second, third = await fetch_together(
        conn,
        [
            ("select 1 as n union all select 2 order by n", None),
            ("select %s::text as word", ("soil",)),
            ("select 1 as n where false", None),
        ],
    )

    assert [row["n"] for row in first] == [1, 2]
    assert second == [{"word": "soil"}]
    assert third == []


async def test_a_statement_that_returns_no_rows_can_travel_with_one_that_does(conn: Conn) -> None:
    written, read = await fetch_together(
        conn, [quota.bump_statement({"ask": 1}), ("select 7 as n", None)]
    )

    assert written == []
    assert read == [{"n": 7}]
    assert await _today(conn) == {"ask": 1}


async def test_one_statement_alone_needs_no_batch(conn: Conn) -> None:
    assert await fetch_together(conn, [("select 3 as n", None)]) == [[{"n": 3}]]
    assert await fetch_together(conn, []) == []


async def test_statements_sent_together_fail_together_and_the_connection_survives(
    conn: Conn,
) -> None:
    with pytest.raises(psycopg.errors.DivisionByZero):
        await fetch_together(conn, [quota.bump_statement({"ask": 1}), ("select 1 / 0 as n", None)])

    # The count sent with the failed statement was rolled back with it.
    assert await _today(conn) == {}
    assert await fetch_together(conn, [("select 5 as n", None)]) == [[{"n": 5}]]


async def test_many_counts_are_written_as_one_statement_and_add_up(conn: Conn) -> None:
    await conn.execute(
        *quota.bump_statement({"ask": 1, "answered": 1, "tokens.generate.output": 640})
    )
    await conn.execute(
        *quota.bump_statement({"ask": 1, "tokens.generate.output": 60, "nothing": 0})
    )
    await quota.bump(conn, "ask")

    assert await _today(conn) == {"ask": 3, "answered": 1, "tokens.generate.output": 700}
