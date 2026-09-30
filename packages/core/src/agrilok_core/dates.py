"""Dates as a student in Nepal reads them.

A fetch date recorded as "2026-09-16" is stored as that day's start in
Kathmandu. Read back in UTC it is still the evening of the 15th, so taking
`.date()` of the raw timestamp shows the wrong day, on every citation and in
the prompt. Every date shown or sent to the model goes through here.
"""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

KATHMANDU = ZoneInfo("Asia/Kathmandu")


def nepal_date(value: datetime | date | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.date()
        return value.astimezone(KATHMANDU).date()
    return value
