"""Stop crawling a source the moment it pushes back.

docs/crawl-policy.md, promise 5: honour Retry-After and back off; repeated
failures stop the crawl rather than retrying into a struggling server. The
simplest honest form of that is to stop at the first 429 or 503, record what
the server asked for, and let the next scheduled run try again.
"""

from __future__ import annotations

from typing import Any

from scrapy.exceptions import IgnoreRequest

PUSHBACK = {429, 503}


class StopOnPushback:
    def __init__(self, crawler: Any) -> None:
        self.crawler = crawler

    @classmethod
    def from_crawler(cls, crawler: Any) -> StopOnPushback:
        return cls(crawler)

    def process_response(self, request: Any, response: Any, spider: Any) -> Any:
        if response.status in PUSHBACK:
            retry_after = response.headers.get("Retry-After", b"").decode("latin-1") or None
            spider.results.append(
                {
                    "kind": "pushback",
                    "url": request.url,
                    "status": response.status,
                    "retry_after": retry_after,
                }
            )
            self.crawler.engine.close_spider(spider, reason=f"server pushback {response.status}")
            raise IgnoreRequest(f"stopping: {response.status} from {request.url}")
        return response
