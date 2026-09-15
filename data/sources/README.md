# data/sources

[`whitelist.yml`](whitelist.yml) is the **trust root of this project**. The
crawler fetches nothing that is not listed under `sources:` in that file.

## Why this has a single named owner

So it cannot quietly grow. Every entry is two things at once: a promise to
students that what they read came from an authority, and a request against
someone else's infrastructure. A whitelist that anyone can extend stops being a
whitelist.

Current owner: **@ganesh-786** ([roles](../../docs/data-governance.md#roles)).

## Adding a source

1. Open a [Source request issue](../../.github/ISSUE_TEMPLATE/source_request.yml).
2. Fetch `https://<domain>/robots.txt`, read it, and paste it **verbatim** with
   the date. Do not assume - check.
3. Read the site's terms of use for anything that overrides robots.txt.
4. Confirm the body is genuinely an authority on what it publishes.
5. The owner approves or declines.
6. On approval, add the entry with its politeness budget, the robots.txt check
   date, and the approver.

Or run `/add-source <domain>`, which walks the vetting and drafts the entry -
but never writes it.

## Eligibility

**Only official sources.** Government bodies and public institutions.

Blogs, coaching-centre notes, PDF aggregators, Facebook groups and YouTube
channels are excluded **regardless of accuracy**. The test is not whether the
content is correct; it is whether a student can verify it against an authority.
That is the product.

## If robots.txt disallows what we need

That is the end of it. Note the outcome and move on. No alternate user-agent, no
proxy, no "just for testing". This is a published promise in
[crawl-policy.md](../../docs/crawl-policy.md).

## `candidates:` is not permission

Domains under `candidates:` are known and expected to be needed. They have
**not** been vetted and are **not** crawlable. `robots_txt_checked: null` means
exactly that - nobody has checked.
