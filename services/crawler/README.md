# services/crawler - fetching official sources

> **Status: not implemented.** Phase 1, and **not before the Phase 0 gate is
> cleared**. See [roadmap](../../docs/roadmap.md#gono-go-gate).

Scrapy. One spider per source domain.

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

## When it breaks

[runbooks/crawl-failure.md](../../docs/runbooks/crawl-failure.md). The default
response to doubt is stop crawling, then investigate.
