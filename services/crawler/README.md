# services/crawler - fetching official sources

> **Status: Phase 1 MVP.** One whitelisted spider, dry run by default, never
> yet run against a live site. See [roadmap](../../docs/roadmap.md).

Scrapy. One spider class, configured per source entry in the whitelist.

## Responsibilities

Fetch documents from whitelisted sources, politely, and store them **exactly as
published** with source URL, fetch timestamp and checksum. Detect change. Hand
off to ingestion.

## What it must never do

- Fetch a domain absent from [`data/sources/whitelist.yml`](../../data/sources/whitelist.yml).
- Ignore `robots.txt`, for any reason, under any user-agent.
- Remove or weaken the rate limit, the crawl delay, or the identifying
  user-agent.
- Publish anything. The crawler feeds the review queue; it never reaches students.
- Modify a fetched file. The raw archive is evidence of what a government body
  published.

## Politeness

Defaults: 3s delay, 1 concurrent request per domain, `Retry-After` honoured,
off-peak scheduling, single global concurrency group. A source entry may be more
conservative; never less.

The full set of promises this project makes to source operators is in
[crawl-policy.md](../../docs/crawl-policy.md). They are public commitments.

## Development

**Do not point this at live government sites while developing.** Use fixtures - a
debugging loop can generate more requests in ten minutes than a month of
scheduled crawling. If you use an AI assistant, configure it so crawl
commands require explicit confirmation.

```sh
uv run python -m crawler.run                  # dry run: print and record the plan
SOURCE_FILTER=<id> uv run python -m crawler.run
uv run pytest services/crawler               # fixtures only, no network
```

A live crawl needs `DRY_RUN=false`, asked for by name. It follows links only
inside an entry's allowed host and paths; a PDF on a host that is not
approved, such as a shared government CDN, is reported and not fetched. It
obeys robots.txt, makes one request at a time at the entry's delay, and
stops a source on a 429 or 503. Fetched files go to `data/raw` with a
checksum, and a report of changed documents goes to `reports/` for review.

## When it breaks

[runbooks/crawl-failure.md](../../docs/runbooks/crawl-failure.md). The default
response to doubt is stop crawling, then investigate.
