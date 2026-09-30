"""Who is asking, for rate limiting only, without storing who anyone is.

The web server calls the API on the student's behalf, so the connecting IP is
the web server's. A request that carries the shared internal token may pass
the browser's id along; any other request is identified by its own address.
Either way the id is hashed with a salt that exists only in this process's
memory, so it cannot be reversed from a log or a crash report, and nothing is
written to disk (docs/privacy.md).
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from collections import deque
from dataclasses import dataclass, field

from fastapi import Request

INTERNAL_HEADER = "x-agrilok-internal"
CLIENT_HEADER = "x-agrilok-client"

_SALT = secrets.token_bytes(32)


def client_key(request: Request, internal_token: str | None) -> str:
    raw: str | None = None
    if internal_token:
        offered = request.headers.get(INTERNAL_HEADER, "")
        if offered and hmac.compare_digest(offered, internal_token):
            raw = request.headers.get(CLIENT_HEADER)
    if not raw:
        raw = request.client.host if request.client else "unknown"
    return hashlib.sha256(_SALT + raw.encode("utf-8")).hexdigest()[:32]


@dataclass
class _Window:
    events: deque[float] = field(default_factory=deque)


class RateLimiter:
    """Sliding-window limits per client, in memory.

    This protects the shared daily quota from one abusive client; it is not how
    the free tier is rationed (ADR-0004 rejected per-student rationing). Limits
    are per API instance; with several instances each keeps its own count.
    """

    def __init__(self, limits: list[tuple[int, float]]) -> None:
        self._limits = limits  # (max events, window seconds)
        self._windows: dict[str, _Window] = {}
        self._longest = max(seconds for _, seconds in limits)

    def hit(self, key: str, now: float | None = None) -> float | None:
        """Record an event. Returns seconds to wait if over a limit, else None."""
        now = time.monotonic() if now is None else now
        window = self._windows.setdefault(key, _Window())
        events = window.events
        while events and now - events[0] > self._longest:
            events.popleft()
        for limit, seconds in self._limits:
            recent = [t for t in events if now - t <= seconds]
            if len(recent) >= limit:
                return max(1.0, seconds - (now - recent[0]))
        events.append(now)
        if len(self._windows) > 50_000:
            self._windows.clear()  # bounded memory; losing counts is the safe direction
        return None
