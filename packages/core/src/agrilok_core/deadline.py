"""One time budget for a whole question.

Each model request has its own timeout, and a failed request is retried, so
without a budget for the question as a whole the waits add up: five attempts
of 90 seconds each were allowed, while the web server gives up after 180. The
student was told "unavailable" and the API kept working, and kept spending
quota, on an answer nobody was waiting for (docs/system-design.md, R-10).

A Deadline is created once per question and handed to every step that can
wait. A step asks how long is left, never how long it would like.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass

Clock = Callable[[], float]


@dataclass(frozen=True)
class Deadline:
    expires_at: float
    clock: Clock = time.monotonic

    @classmethod
    def after(cls, seconds: float, clock: Clock = time.monotonic) -> Deadline:
        return cls(expires_at=clock() + seconds, clock=clock)

    def remaining(self) -> float:
        """Seconds left. Zero or less once the budget is spent."""
        return self.expires_at - self.clock()

    @property
    def expired(self) -> bool:
        return self.remaining() <= 0
