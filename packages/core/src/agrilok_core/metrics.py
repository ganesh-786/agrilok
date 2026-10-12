"""How long questions take and what they cost, as counts per day.

Until this existed nothing recorded where a question's time went, so neither
"the answers are slow" nor "this change made them faster" could be shown.

Everything here lands in `usage_daily`, which may hold counts per day and
nothing else (docs/privacy.md, migration 0007). So there is no row per
question, no question text, no client and no exact timestamp. A duration is
recorded by adding one to the bucket it falls in, the way a Prometheus
histogram does, which is also why several API instances can share it.

The cost of that choice: a percentile read back from buckets is the upper
edge of a bucket, not an exact number. "p95 2500" means 95 in 100 took 2.5
seconds or less. The exact time of a single question is in the API's own log
line for it, and nowhere else.

The total recorded for a question stops just before its last database write,
because that write is what carries these counts.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass

# Upper edges, in milliseconds. Wide enough for a database statement at one
# end and a slow generation at the other.
BUCKETS_MS = (50, 100, 250, 500, 1000, 2500, 5000, 10_000, 30_000, 60_000)
OVER = "over"

_TIMING = "ms."
_TOKENS = "tokens."
_ATTEMPTS = "attempts."


def timing_metric(stage: str, ms: float) -> str:
    for edge in BUCKETS_MS:
        if ms <= edge:
            return f"{_TIMING}{stage}.{edge}"
    return f"{_TIMING}{stage}.{OVER}"


def token_metric(name: str) -> str:
    return f"{_TOKENS}{name}"


def attempt_metric(kind: str) -> str:
    return f"{_ATTEMPTS}{kind}"


@dataclass(frozen=True)
class StageTiming:
    count: int
    # The upper edge of the bucket the percentile falls in. None means it fell
    # past the last edge: slower than BUCKETS_MS[-1].
    p50_ms: int | None
    p95_ms: int | None


def _percentile(buckets: Mapping[str, int], share: float) -> int | None:
    total = sum(buckets.values())
    wanted = max(1, math.ceil(total * share))
    seen = 0
    for edge in BUCKETS_MS:
        seen += buckets.get(str(edge), 0)
        if seen >= wanted:
            return edge
    return None


@dataclass(frozen=True)
class Usage:
    """One day's `usage_daily`, taken apart."""

    counts: dict[str, int]  # outcomes: asks, cache hits, answers, refusals
    timings: dict[str, StageTiming]  # per stage
    tokens: dict[str, int]  # as the provider reported them, e.g. "generate.output"
    attempts: dict[str, int]  # requests sent to the provider, retries included


def read(day: Mapping[str, int]) -> Usage:
    counts: dict[str, int] = {}
    tokens: dict[str, int] = {}
    attempts: dict[str, int] = {}
    by_stage: dict[str, dict[str, int]] = {}
    for metric, count in day.items():
        if metric.startswith(_TIMING):
            stage, _, edge = metric.removeprefix(_TIMING).rpartition(".")
            by_stage.setdefault(stage, {})[edge] = count
        elif metric.startswith(_TOKENS):
            tokens[metric.removeprefix(_TOKENS)] = count
        elif metric.startswith(_ATTEMPTS):
            attempts[metric.removeprefix(_ATTEMPTS)] = count
        else:
            counts[metric] = count
    timings = {
        stage: StageTiming(
            count=sum(buckets.values()),
            p50_ms=_percentile(buckets, 0.50),
            p95_ms=_percentile(buckets, 0.95),
        )
        for stage, buckets in sorted(by_stage.items())
    }
    return Usage(counts=counts, timings=timings, tokens=tokens, attempts=attempts)
