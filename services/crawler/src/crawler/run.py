"""python -m crawler.run: crawl the whitelisted sources, or show what would be crawled.

    DRY_RUN=true  (the default)  fetch nothing; print and record the plan
    DRY_RUN=false                crawl, politely, into data/raw; report changes
    SOURCE_FILTER=<id>           one source only

Dry run is the default because a crawl is a request against someone else's
infrastructure: the live path has to be asked for by name. Anything fetched
goes to the raw archive and a report for review; the crawler never publishes
(services/crawler/README.md).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from crawler.archive import RawArchive
from crawler.settings import CrawlConfigError, for_source
from crawler.spider import WhitelistedSpider
from crawler.whitelist import Source, WhitelistError, load

HERE = Path(__file__).resolve().parents[2]
REPORTS = HERE / "reports"


def plan(sources: list[Source]) -> list[dict[str, Any]]:
    return [
        {
            "source": s.id,
            "domain": s.domain,
            "start_urls": s.start_urls(),
            "delay_seconds": s.download_delay_seconds,
            "crawlable": bool(s.allowed_paths),
            "note": "" if s.allowed_paths else "no approved paths yet; nothing will be fetched",
        }
        for s in sources
    ]


def changed_markdown(results: list[dict[str, Any]]) -> str:
    fetched = [r for r in results if r.get("kind") == "fetched" and r["status"] != "unchanged"]
    if not fetched:
        return ""
    lines = [
        "Documents that are new or changed since the last crawl. None of them reaches a",
        "student until it is ingested, admitted and labelled (ADR-0012).",
        "",
        "| Source | Status | URL | SHA-256 |",
        "|---|---|---|---|",
    ]
    for r in fetched:
        lines.append(f"| {r['source_id']} | {r['status']} | {r['url']} | `{r['sha256'][:16]}…` |")
    return "\n".join(lines) + "\n"


def crawl(sources: list[Source], archive: RawArchive) -> list[dict[str, Any]]:
    """Crawl sources one after another in a single Twisted reactor."""
    from scrapy.crawler import CrawlerRunner
    from scrapy.utils.reactor import install_reactor

    install_reactor("twisted.internet.asyncioreactor.AsyncioSelectorReactor")
    from twisted.internet import defer
    from twisted.internet import reactor as installed_reactor

    reactor: Any = installed_reactor  # the module attribute is typed as a bare callable

    results: list[dict[str, Any]] = []
    runner = CrawlerRunner()

    @defer.inlineCallbacks
    def run_all() -> Any:
        for source in sources:
            spider_cls = type(
                f"Spider_{source.id.replace('-', '_')}",
                (WhitelistedSpider,),
                {"custom_settings": for_source(source)},
            )
            yield runner.crawl(spider_cls, source=source, archive=archive, results=results)
        reactor.stop()

    run_all()
    reactor.run()
    return results


def main() -> int:
    dry_run = os.environ.get("DRY_RUN", "true").strip().lower() != "false"
    only = (os.environ.get("SOURCE_FILTER") or "").strip()
    try:
        sources = load()
    except WhitelistError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    if only:
        sources = [s for s in sources if s.id == only]
        if not sources:
            print(f"error: no whitelisted source {only!r}", file=sys.stderr)
            return 1

    REPORTS.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {"dry_run": dry_run, "plan": plan(sources), "results": []}
    crawlable = [s for s in sources if s.allowed_paths]
    for item in report["plan"]:
        state = "would crawl" if item["crawlable"] else "skip"
        print(f"{item['source']:<20} {state:<12} {', '.join(item['start_urls']) or item['note']}")

    if dry_run:
        print("\nDry run: nothing was fetched. Set DRY_RUN=false to crawl.")
    else:
        try:
            for source in crawlable:
                for_source(source)  # fail before any request if the settings are unsafe
        except CrawlConfigError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        report["results"] = crawl(crawlable, RawArchive())
        skipped = [r for r in report["results"] if r["kind"] == "skipped"]
        pushback = [r for r in report["results"] if r["kind"] == "pushback"]
        fetched = [r for r in report["results"] if r["kind"] == "fetched"]
        print(
            f"\nFetched {len(fetched)}, skipped {len(skipped)} links outside the whitelist, "
            f"{len(pushback)} source(s) stopped by server pushback."
        )
        (REPORTS / "changed.md").write_text(changed_markdown(report["results"]), encoding="utf-8")

    (REPORTS / "crawl-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
