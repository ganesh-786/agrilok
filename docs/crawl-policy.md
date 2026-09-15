# Crawl policy

What this project promises the operators of the sites it fetches from. These are
public commitments, and they are enforced in code review and CI, not left to
good intentions.

## The promises

1. **We crawl only whitelisted domains.** Nothing outside
   [`data/sources/whitelist.yml`](../data/sources/whitelist.yml) is ever
   fetched. Adding a domain requires vetting and named approval.
2. **We honour `robots.txt`.** Always, for our own user-agent and for `*`. We do
   not use an alternate user-agent to route around a disallow, and we do not
   make exceptions "for testing". `CRAWLER_RESPECT_ROBOTS_TXT` is `true` in
   `.env.example` and in the scheduled workflow.
3. **We identify ourselves.** Every request carries a user-agent naming the
   project, linking to the repository, and giving a contact address:

   ```
   agrilok-crawler/0.1 (+https://github.com/ganesh-786/agrilok; contact: ganeshchaudhary4400@gmail.com)
   ```

   An operator who wants us to stop can find out who we are in one look.
4. **We crawl slowly.** Default three seconds between requests, one concurrent
   request per domain, off-peak scheduling (02:30 Asia/Kathmandu). An entry may
   be more conservative than the default; never less.
5. **We honour `Retry-After` and back off on errors.** Repeated failures stop
   the crawl rather than retrying into a struggling server.
6. **We never run two crawls at once.** The scheduled workflow uses a single
   concurrency group with `cancel-in-progress: false`.
7. **We fetch what we need, once.** Change detection is by checksum. An
   unchanged document is not re-downloaded on every pass.
8. **We do not republish.** Documents are summarised and cited, with a link back
   to the original. The raw corpus is not redistributed.
9. **We stop when asked.** A request from a site operator is honoured
   immediately and without argument.

## Before a source is added

- Fetch `https://<domain>/robots.txt`, read it, and record it **verbatim** with
  the date and who checked.
- Read the site's terms of use for anything that overrides what robots.txt
  permits.
- Confirm the body is an authority on what it publishes.
- Propose a politeness budget; default to more conservative than seems necessary.
  These are small government sites, not CDNs.
- The whitelist owner approves or declines.

If robots.txt disallows the paths we would need: **that is the end of it.** Note
the outcome in the issue and move on.

## Ongoing obligations

- Re-check `robots.txt` on a recurring basis and on any crawl failure. A site
  that adds a disallow gets it honoured from that moment.
- Watch for `429` and `503`. Treat them as instructions, not obstacles.
- If a source's structure changes such that we are fetching more than we need,
  fix the spider rather than absorbing the extra load on the source.

## Development

- **Do not point the crawler at live government sites during development.** Use
  fixtures. A debugging loop can generate more requests in ten minutes than a
  month of scheduled crawling.
- If you use an AI assistant, configure it so crawl commands require explicit
  confirmation. The same reasoning applies to any automation you write.

## If something goes wrong

See [runbooks/crawl-failure.md](runbooks/crawl-failure.md). The default response
to any doubt about whether we are being a good citizen is **stop crawling, then
investigate** - never the reverse.

## Why this is written down

The legal basis for this project's ingestion is fair dealing for private study,
research and teaching under Nepal's Copyright Act, 2059 - which is conditioned
on not harming the rights holder's interests. Polite, identified, minimal
crawling is part of staying inside that boundary. The full position is in
[NOTICE](../NOTICE).
