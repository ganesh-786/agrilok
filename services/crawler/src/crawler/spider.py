"""One spider per whitelisted source, allowed to go nowhere its entry does not name.

Pages inside `allowed_paths` are read for links. A document link is fetched
only if it is on the same host and inside an approved path too; anything else
is recorded and skipped. In particular a ministry page's PDF on a shared
government CDN is reported as "host not approved", because the CDN is not the
authority and has no whitelist entry of its own (ADR-0007).
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any
from urllib.parse import urldefrag, urljoin, urlsplit

import scrapy
from scrapy.http import Response

from crawler.archive import RawArchive
from crawler.whitelist import Source

DOCUMENT_SUFFIXES = (".pdf",)


class WhitelistedSpider(scrapy.Spider):
    name = "whitelisted"

    def __init__(
        self,
        source: Source,
        archive: RawArchive,
        results: list[dict[str, Any]],
        **kwargs: Any,
    ) -> None:
        super().__init__(name=f"source-{source.id}", **kwargs)
        self.source = source
        self.archive = archive
        self.results = results
        self.allowed_domains = [source.domain]
        self.start_urls = source.start_urls()

    @staticmethod
    def is_document(url: str) -> bool:
        return urldefrag(url)[0].lower().endswith(DOCUMENT_SUFFIXES)

    def parse(self, response: Response, **_: Any) -> Iterator[scrapy.Request]:
        content_type = (response.headers.get("Content-Type") or b"").decode("latin-1").lower()
        if "pdf" in content_type:
            yield from self._save(response, referring_page=None)
            return
        if "html" not in content_type:
            return
        for href in response.css("a::attr(href)").getall():
            url = urldefrag(urljoin(response.url, href.strip()))[0]
            if not url.startswith(("http://", "https://")):
                continue
            if self.is_document(url):
                if self.source.permits(url):
                    yield scrapy.Request(
                        url,
                        callback=self.save_document,
                        cb_kwargs={"referring_page": response.url},
                    )
                else:
                    host = (urlsplit(url).hostname or "").lower().removeprefix("www.")
                    reason = (
                        "path not approved"
                        if host == self.source.domain.removeprefix("www.")
                        else "host not approved"
                    )
                    self.results.append(
                        {
                            "kind": "skipped",
                            "url": url,
                            "referring_page": response.url,
                            "reason": reason,
                        }
                    )
            elif self.source.permits(url):
                yield response.follow(url, callback=self.parse)

    def save_document(self, response: Response, referring_page: str) -> Iterator[Any]:
        yield from self._save(response, referring_page=referring_page)

    def _save(self, response: Response, referring_page: str | None) -> Iterator[Any]:
        content_type = (response.headers.get("Content-Type") or b"").decode("latin-1")
        entry = self.archive.store(
            source_id=self.source.id,
            url=response.url,
            body=response.body,
            content_type=content_type,
            referring_page=referring_page,
        )
        self.results.append({"kind": "fetched", **entry.__dict__})
        return iter(())
