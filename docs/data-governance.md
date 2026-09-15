# Data governance

What may be ingested, what may be published, who decides, and how long anything
is kept.

## Roles

| Role | Holder | Owns |
|---|---|---|
| **Source whitelist owner** | @ganesh-786 | The only person who may approve an entry in `data/sources/whitelist.yml`. Exists as a single named role so the whitelist cannot silently grow to include unreliable sites. |
| **Content reviewer** | Any approved contributor | Asserts, by name and date, that a piece of content matches its cited source. |
| **Maintainer** | @ganesh-786 | Takedown requests, privacy questions, security reports. |

A role held by one person today is still a role. When a second person takes one
on, they are added here - not assumed.

## What may be ingested

**Eligible:** official sources only - the federal Public Service Commission, the
seven Provincial Public Service Commissions, NARC, the ministry responsible for
agriculture and its agencies, the Nepal Gazette, and public university or
institute curricula where they are the authority on a syllabus.

**Not eligible,** regardless of accuracy: coaching-centre notes, exam-prep
blogs, PDF aggregators, Facebook groups, YouTube channels, Telegram channels.

The test is **not** whether the content is correct. It is whether a student can
verify it against an authority. That is the product.

## Classification

| Class | Examples | Handling |
|---|---|---|
| **Public official** | Curricula, vacancy notices, past papers, gazette entries | Ingested, summarised, cited. Never republished wholesale. |
| **Derived** | Chunks, embeddings, summaries, generated explanations, mock questions | Project-authored, CC BY-SA 4.0, but only publishable with provenance and a review state. |
| **Evaluation** | Golden-set questions and reference answers | Committed and reviewed like production code - it defines what "correct" means. |
| **Operational** | Logs, metrics, cache entries | No personal data. Retention below. |
| **Personal** | Anything identifying a student | Minimised, never sent to a third-party model. See [privacy.md](privacy.md). |

## What may be published

Publishable only when all of these hold:

1. It cites a whitelisted source with a resolvable link and a fetch date.
2. It carries a review state - `verified` or `ai_assisted_pending_review` - and
   that state is **visible to the student**.
3. It does not republish a government document wholesale.
4. It does not imply official endorsement.
5. Its exam level, service group and province tags are correct.

**Nothing is published by omission.** A pipeline that publishes because a review
step was skipped is a bug of the highest severity - see
[SECURITY.md](../SECURITY.md), which treats wrongly-verified content as a
security issue rather than a data-quality one.

## Raw corpus

- Kept **exactly as published**, unmodified, with source URL, fetch timestamp
  and checksum.
- Stored in `data/raw/`, which is **gitignored** and never committed.
- Not redistributed as a dataset. It is evidence of what a government body
  published, held so claims can be checked - not a mirror.
- Never edited. Corrections happen downstream, in derived content, with a note.

## Change detection and staleness

- Sources are re-crawled on a schedule; checksum changes open a review issue.
- A changed source document **never** auto-publishes. It queues for review.
- Every syllabus page shows a "last verified on" date. Curricula are revised
  without announcement and the ministry landscape itself has shifted, so
  staleness must be visible rather than inferred.

## Retention

| Data | Retention |
|---|---|
| Raw fetched documents | Indefinite while the source is whitelisted - provenance evidence |
| Derived chunks and embeddings | Regenerated freely; no independent value |
| Crawl reports | 30 days (CI artifacts) |
| Evaluation reports | 90 days (CI artifacts), summary metrics indefinitely |
| Operational logs | Short, and scrubbed of anything identifying |
| Student data | Minimised; see [privacy.md](privacy.md) |

## Takedown

A request from a rights holder or source operator is **honoured first and
discussed afterwards**. Contact: ganeshchaudhary4400@gmail.com.

On receipt: stop crawling the source, remove the derived content, record the
request and the action in the whitelist entry. No argument, no delay pending
review of whether the request is well-founded.

The fair-dealing boundary this project operates inside is set out in
[NOTICE](../NOTICE). Crawling mechanics and the promises made to source
operators are in [crawl-policy.md](crawl-policy.md).
