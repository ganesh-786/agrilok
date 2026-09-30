"""Scrapy settings built from a whitelist entry, with the politeness rules fixed in code.

None of these may be loosened by configuration (docs/crawl-policy.md):
robots.txt is obeyed, one request at a time per domain, a delay at least as
long as the entry asks for, an identifying user agent with a contact address,
no cookies, and a hard cap on pages per run. A 429 or 503 stops the crawl for
that source: treat it as an instruction, not an obstacle.
"""

from __future__ import annotations

import os
from typing import Any

from crawler.whitelist import Source

MAX_PAGES_PER_SOURCE = 200
MAX_DEPTH = 2


class CrawlConfigError(RuntimeError):
    pass


def user_agent() -> str:
    agent = os.environ.get("CRAWLER_USER_AGENT", "").strip()
    if "agrilok" not in agent or "contact:" not in agent:
        raise CrawlConfigError(
            "CRAWLER_USER_AGENT must name the project and give a contact address, e.g. "
            "'agrilok-crawler/0.1 (+https://github.com/ganesh-786/agrilok; contact: ...)'"
        )
    return agent


def for_source(source: Source) -> dict[str, Any]:
    if os.environ.get("CRAWLER_RESPECT_ROBOTS_TXT", "true").lower() != "true":
        raise CrawlConfigError("CRAWLER_RESPECT_ROBOTS_TXT must stay true; this is not negotiable")
    return {
        "USER_AGENT": user_agent(),
        "ROBOTSTXT_OBEY": True,
        "ROBOTSTXT_USER_AGENT": user_agent(),
        "DOWNLOAD_DELAY": source.download_delay_seconds,
        "RANDOMIZE_DOWNLOAD_DELAY": False,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_START_DELAY": source.download_delay_seconds,
        "AUTOTHROTTLE_MAX_DELAY": max(60.0, source.download_delay_seconds * 6),
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.0,
        "COOKIES_ENABLED": False,
        "DEPTH_LIMIT": MAX_DEPTH,
        "CLOSESPIDER_PAGECOUNT": MAX_PAGES_PER_SOURCE,
        "DOWNLOAD_MAXSIZE": 100 * 1024 * 1024,
        "DOWNLOAD_TIMEOUT": 60,
        # No retries into a struggling server: a failure is reported, and the
        # next scheduled run tries again.
        "RETRY_ENABLED": False,
        "HTTPERROR_ALLOWED_CODES": [],
        "DOWNLOADER_MIDDLEWARES": {"crawler.middleware.StopOnPushback": 550},
        "TELNETCONSOLE_ENABLED": False,
        "LOG_LEVEL": "INFO",
        "REQUEST_FINGERPRINTER_IMPLEMENTATION": "2.7",
    }
