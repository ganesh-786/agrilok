# Runbook: crawl failure

> The default response to any doubt about whether we are being a good citizen is
> **stop crawling, then investigate** - never the reverse. A stalled corpus
> costs students a day of freshness. A bad crawl costs the project its legitimacy.

## Symptoms

The scheduled `crawl.yml` run failed, or a source returned errors, or the crawl
report is empty when documents were expected.

## Triage

### 1. What kind of failure?

Check the workflow run and the uploaded crawl report artifact.

| Signal | Meaning | Action |
|---|---|---|
| `403`, `401` | We are being blocked | **Stop.** Go to section 2. |
| `429`, `Retry-After` | We are crawling too fast | **Stop.** Go to section 3. |
| `503`, timeouts | The source is struggling or down | Back off, retry on the next scheduled run. Do not retry immediately. |
| `404` on a known document | The site reorganised | Fix the spider path; check whether the document moved or was withdrawn. |
| robots.txt changed | Permission changed | Go to section 4. |
| Parse or extraction error | Our bug | Fix the spider or extractor. No urgency for the source. |
| Empty result, no error | Selector drift after a redesign | Fix the spider. Verify against a saved fixture first. |

### 2. Blocked (`403` / `401`)

1. **Stop crawling that source immediately.** Disable its whitelist entry.
2. Verify our user-agent is being sent correctly and identifies the project.
3. Re-read the site's robots.txt and terms of use. Something may have changed.
4. If we appear to have been blocked deliberately, **treat it as a request to
   stop.** Email the site operator via the contact address, explain what the
   project is, and ask whether they want us to stop or to change how we crawl.
   Do not resume while waiting.
5. Never route around a block - no alternate user-agent, no proxy, no slower
   retry hoping to slip through.

### 3. Rate limited (`429`)

1. Stop the current run.
2. Honour `Retry-After` exactly.
3. Increase `download_delay_seconds` for that source in the whitelist entry.
   Permanently, not for one run.
4. Reduce `recrawl_interval_days` frequency if the source is small.
5. Record what changed in the whitelist entry.

### 4. robots.txt changed

1. Stop crawling that source.
2. Read the new file carefully - it may narrow rather than forbid.
3. Update the whitelist entry with the new contents, the date, and who checked.
4. If it now disallows paths we need, **that is the end of it.** Remove or
   restrict the entry. No workaround. This is a published promise in
   [crawl-policy.md](../crawl-policy.md).

## After any failure

- Update the whitelist entry with what happened and what changed.
- If the failure was ours, add a regression fixture so it is caught in CI next
  time.
- If a source document changed rather than failed, remember it **queues for
  review** - changed content never auto-publishes.

## Escalation

Anything involving a source operator objecting, a legal question, or a takedown
goes to the maintainer immediately: ganeshchaudhary4400@gmail.com. Honour first,
discuss after.
