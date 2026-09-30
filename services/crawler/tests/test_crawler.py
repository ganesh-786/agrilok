"""The crawler's promises (docs/crawl-policy.md), tested without touching the network.

A debugging loop can generate more requests in ten minutes than a month of
scheduled crawling, so nothing here makes a real request. Pages are fixtures.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest
import yaml
from scrapy.exceptions import IgnoreRequest
from scrapy.http import HtmlResponse, Request, Response

from crawler import run
from crawler.archive import RawArchive
from crawler.middleware import StopOnPushback
from crawler.settings import CrawlConfigError, for_source
from crawler.spider import WhitelistedSpider
from crawler.whitelist import Source, WhitelistError, load

UA = "agrilok-crawler/0.1 (+https://github.com/ganesh-786/agrilok; contact: test@example.org)"


@pytest.fixture
def moald() -> Source:
    return next(s for s in load() if s.id == "moald-policy")


def test_the_real_whitelist_loads_and_is_narrow() -> None:
    sources = {s.id: s for s in load()}
    assert set(sources) == {"moald-policy", "lawcommission-np", "narc"}
    assert sources["narc"].allowed_paths == ()  # approved, but no path confirmed yet
    assert sources["moald-policy"].download_delay_seconds == 10


def test_a_source_permits_only_its_own_host_and_paths(moald: Source) -> None:
    assert moald.permits("https://moald.gov.np/content/215/pestise/")
    assert not moald.permits("https://moald.gov.np/content/999/other/")
    assert not moald.permits("https://giwmscdnone.gov.np/media/pdf_upload/x.pdf")
    assert not moald.permits("https://evil.moald.gov.np/content/215/")
    assert not moald.permits("ftp://moald.gov.np/content/215/")


def _write_whitelist(tmp_path: Path, **source_overrides: Any) -> Path:
    source = {
        "id": "x",
        "name": "X",
        "domain": "x.gov.np",
        "allowed_paths": ["/a/"],
        "robots_txt": {"permits_our_paths": True},
        "download_delay_seconds": 5,
        "approved_by": "@owner",
        "approved_on": "2026-09-23",
    }
    source.update(source_overrides)
    path = tmp_path / "whitelist.yml"
    path.write_text(
        yaml.safe_dump(
            {
                "defaults": {"respect_robots_txt": True, "download_delay_seconds": 3},
                "sources": [source],
            }
        ),
        encoding="utf-8",
    )
    return path


@pytest.mark.parametrize(
    "override",
    [
        {"respect_robots_txt": False},
        {"robots_txt": {"permits_our_paths": None}},
        {"download_delay_seconds": 1},
        {"allowed_paths": ["a/"]},
    ],
)
def test_unsafe_entries_are_refused(tmp_path: Path, override: dict[str, Any]) -> None:
    with pytest.raises(WhitelistError):
        load(_write_whitelist(tmp_path, **override))


def test_politeness_is_fixed_in_code(monkeypatch: pytest.MonkeyPatch, moald: Source) -> None:
    monkeypatch.setenv("CRAWLER_USER_AGENT", UA)
    settings = for_source(moald)
    assert settings["ROBOTSTXT_OBEY"] is True
    assert settings["CONCURRENT_REQUESTS_PER_DOMAIN"] == 1
    assert settings["DOWNLOAD_DELAY"] == 10
    assert settings["RETRY_ENABLED"] is False
    assert settings["USER_AGENT"] == UA


def test_an_anonymous_user_agent_is_refused(monkeypatch: pytest.MonkeyPatch, moald: Source) -> None:
    monkeypatch.setenv("CRAWLER_USER_AGENT", "Mozilla/5.0")
    with pytest.raises(CrawlConfigError):
        for_source(moald)


def test_robots_cannot_be_switched_off(monkeypatch: pytest.MonkeyPatch, moald: Source) -> None:
    monkeypatch.setenv("CRAWLER_USER_AGENT", UA)
    monkeypatch.setenv("CRAWLER_RESPECT_ROBOTS_TXT", "false")
    with pytest.raises(CrawlConfigError):
        for_source(moald)


PAGE = b"""<html><body>
<a href="/content/215/pestise/page-2/">next page, allowed</a>
<a href="/content/999/elsewhere/">outside the allowed paths</a>
<a href="https://giwmscdnone.gov.np/media/pdf_upload/regulation.pdf">the PDF, on the CDN</a>
<a href="/content/215/files/regulation.pdf">a PDF inside the allowed path</a>
<a href="https://facebook.com/x">elsewhere entirely</a>
</body></html>"""


def test_the_spider_follows_only_what_the_whitelist_names(moald: Source, tmp_path: Path) -> None:
    results: list[dict[str, Any]] = []
    spider = WhitelistedSpider(source=moald, archive=RawArchive(tmp_path), results=results)
    response = HtmlResponse(
        url="https://moald.gov.np/content/215/pestise/",
        body=PAGE,
        headers={"Content-Type": "text/html"},
    )
    requested = [r.url for r in spider.parse(response)]
    assert requested == [
        "https://moald.gov.np/content/215/pestise/page-2/",
        "https://moald.gov.np/content/215/files/regulation.pdf",
    ]
    assert results == [
        {
            "kind": "skipped",
            "url": "https://giwmscdnone.gov.np/media/pdf_upload/regulation.pdf",
            "referring_page": "https://moald.gov.np/content/215/pestise/",
            "reason": "host not approved",
        }
    ]


def test_the_archive_keeps_bytes_as_published_and_detects_change(tmp_path: Path) -> None:
    archive = RawArchive(tmp_path)
    kwargs = {
        "source_id": "s",
        "url": "https://x.gov.np/a.pdf",
        "content_type": "application/pdf",
        "referring_page": None,
    }
    first = archive.store(body=b"%PDF v1", **kwargs)  # type: ignore[arg-type]
    same = archive.store(body=b"%PDF v1", **kwargs)  # type: ignore[arg-type]
    changed = archive.store(body=b"%PDF v2", **kwargs)  # type: ignore[arg-type]
    assert (first.status, same.status, changed.status) == ("new", "unchanged", "changed")
    assert (tmp_path / first.path).read_bytes() == b"%PDF v1"
    assert (tmp_path / changed.path).read_bytes() == b"%PDF v2"


def test_pushback_stops_the_crawl_for_that_source() -> None:
    crawler = MagicMock()
    middleware = StopOnPushback(crawler)
    spider = MagicMock(results=[])
    request = Request("https://x.gov.np/a/")
    response = Response("https://x.gov.np/a/", status=429, headers={"Retry-After": "3600"})
    with pytest.raises(IgnoreRequest):
        middleware.process_response(request, response, spider)
    crawler.engine.close_spider.assert_called_once()
    assert spider.results[0]["retry_after"] == "3600"


def test_a_dry_run_fetches_nothing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.delenv("DRY_RUN", raising=False)
    monkeypatch.setattr(run, "REPORTS", tmp_path)

    def no_crawling(*_: Any) -> None:
        raise AssertionError("a dry run must not crawl")

    monkeypatch.setattr(run, "crawl", no_crawling)
    assert run.main() == 0
    assert (tmp_path / "crawl-report.json").is_file()
