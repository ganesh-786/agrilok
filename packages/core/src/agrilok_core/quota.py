"""The quota governor (ADR-0004) and aggregate usage metrics.

Every model request, retries included, reserves one unit against a daily
ceiling that is set below the provider's quota. The reservation is a single
atomic upsert, so several API instances share one honest count. When the
ceiling is reached the system degrades visibly: cached and pre-generated
answers keep serving, live generation stops with a clear message, and nothing
ever falls back to answering from model memory (ADR-0003).

No personal data is stored here: only counts per day (docs/privacy.md).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from agrilok_core.db import Conn, Statement

Kind = Literal["generate", "embed"]

# The provider's per-day quota resets at midnight Pacific time. Counting on the
# same clock means our ceiling and theirs roll over together.
PROVIDER_TZ = ZoneInfo("America/Los_Angeles")
LOCAL_TZ = ZoneInfo("Asia/Kathmandu")


class QuotaExceededError(RuntimeError):
    def __init__(self, kind: Kind, limit: int) -> None:
        super().__init__(f"daily {kind} ceiling of {limit} reached")
        self.kind = kind
        self.limit = limit


def provider_day(now: datetime | None = None) -> date:
    return (now or datetime.now(tz=PROVIDER_TZ)).astimezone(PROVIDER_TZ).date()


def next_reset(now: datetime | None = None) -> datetime:
    current = (now or datetime.now(tz=PROVIDER_TZ)).astimezone(PROVIDER_TZ)
    tomorrow = current.date() + timedelta(days=1)
    return datetime.combine(tomorrow, time(0, 0), tzinfo=PROVIDER_TZ)


def local_day(now: datetime | None = None) -> date:
    return (now or datetime.now(tz=LOCAL_TZ)).astimezone(LOCAL_TZ).date()


async def reserve(conn: Conn, kind: Kind, limit: int) -> int:
    """Take one unit of today's allowance, or raise QuotaExceededError."""
    if limit <= 0:
        raise QuotaExceededError(kind, limit)
    cur = await conn.execute(
        """
        insert into quota_usage (day, kind, count) values (%(day)s, %(kind)s, 1)
        on conflict (day, kind) do update
            set count = quota_usage.count + 1
            where quota_usage.count < %(limit)s
        returning count
        """,
        {"day": provider_day(), "kind": kind, "limit": limit},
    )
    row = await cur.fetchone()
    if row is None:
        raise QuotaExceededError(kind, limit)
    return int(row["count"])


@dataclass(frozen=True)
class QuotaStatus:
    kind: Kind
    used: int
    limit: int
    resets_at: datetime

    @property
    def available(self) -> bool:
        return self.used < self.limit


async def status(conn: Conn, kind: Kind, limit: int) -> QuotaStatus:
    cur = await conn.execute(
        "select count from quota_usage where day = %s and kind = %s", (provider_day(), kind)
    )
    row = await cur.fetchone()
    used = int(row["count"]) if row is not None else 0
    return QuotaStatus(kind=kind, used=used, limit=limit, resets_at=next_reset())


_BUMP_SQL = """
insert into usage_daily (day, metric, count)
select %(day)s, t.metric, t.count
from unnest(%(metrics)s::text[], %(counts)s::bigint[]) as t(metric, count)
on conflict (day, metric) do update set count = usage_daily.count + excluded.count
"""


def bump_statement(counts: Mapping[str, int]) -> Statement:
    """One statement that adds to any number of daily metrics.

    A question used to write each of its counts as its own statement. Written
    as one, they cost one round trip however many there are, and they can ride
    along with another statement (db.fetch_together).
    """
    kept = sorted((metric, count) for metric, count in counts.items() if count > 0)
    return (
        _BUMP_SQL,
        {"day": local_day(), "metrics": [m for m, _ in kept], "counts": [c for _, c in kept]},
    )


async def bump(conn: Conn, metric: str, by: int = 1) -> None:
    """Add to an aggregate daily metric, such as a cache hit or a refusal."""
    await conn.execute(*bump_statement({metric: by}))
