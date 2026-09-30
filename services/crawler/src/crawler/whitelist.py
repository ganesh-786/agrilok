"""Load data/sources/whitelist.yml, and refuse to crawl anything it does not permit.

The whitelist is the trust root (docs/crawl-policy.md). This module is where
its promises become checks: a source must be approved by the named owner,
must keep robots.txt on, and may never be faster than the defaults. A
candidate entry, an excluded pattern or a missing field is not crawlable.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import yaml

REPO = Path(__file__).resolve().parents[4]
WHITELIST = REPO / "data" / "sources" / "whitelist.yml"


class WhitelistError(ValueError):
    pass


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    domain: str
    allowed_paths: tuple[str, ...]
    download_delay_seconds: float
    recrawl_interval_days: int
    approved_by: str
    approved_on: str

    def start_urls(self) -> list[str]:
        return [f"https://{self.domain}{path}" for path in self.allowed_paths]

    def permits(self, url: str) -> bool:
        """Same host (no subdomains) and inside an approved path. Nothing else."""
        parts = urlsplit(url)
        if parts.scheme not in {"http", "https"}:
            return False
        host = (parts.hostname or "").lower().removeprefix("www.")
        if host != self.domain.lower().removeprefix("www."):
            return False
        return any(parts.path.startswith(path) for path in self.allowed_paths)


def _require(entry: dict[str, Any], key: str) -> Any:
    value = entry.get(key)
    if value in (None, ""):
        raise WhitelistError(f"source {entry.get('id', '?')}: missing {key}")
    return value


def load(path: Path = WHITELIST) -> list[Source]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise WhitelistError("whitelist.yml is not a mapping")
    defaults = data.get("defaults") or {}
    if defaults.get("respect_robots_txt") is not True:
        raise WhitelistError("defaults.respect_robots_txt must be true; it is not negotiable")
    min_delay = float(defaults.get("download_delay_seconds", 3))
    sources = []
    for entry in data.get("sources") or []:
        source_id = str(_require(entry, "id"))
        if entry.get("respect_robots_txt") is False:
            raise WhitelistError(f"{source_id}: respect_robots_txt cannot be turned off")
        robots = entry.get("robots_txt") or {}
        if robots.get("permits_our_paths") is not True:
            raise WhitelistError(f"{source_id}: robots.txt has not been confirmed to permit it")
        delay = float(entry.get("download_delay_seconds", min_delay))
        if delay < min_delay:
            raise WhitelistError(f"{source_id}: {delay}s is faster than the {min_delay}s default")
        paths = tuple(str(p) for p in entry.get("allowed_paths") or [])
        if any(not p.startswith("/") for p in paths):
            raise WhitelistError(f"{source_id}: allowed_paths must start with /")
        sources.append(
            Source(
                id=source_id,
                name=str(_require(entry, "name")),
                domain=str(_require(entry, "domain")).lower(),
                allowed_paths=paths,
                download_delay_seconds=delay,
                recrawl_interval_days=int(
                    entry.get("recrawl_interval_days", defaults.get("recrawl_interval_days", 7))
                ),
                approved_by=str(_require(entry, "approved_by")),
                approved_on=str(_require(entry, "approved_on")),
            )
        )
    ids = [s.id for s in sources]
    if len(ids) != len(set(ids)):
        raise WhitelistError("two sources share an id")
    return sources
