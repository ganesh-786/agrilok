# data

Four different kinds of data with four different rules. The distinction matters
legally as well as technically - see [NOTICE](../NOTICE).

| Path | What it is | Committed? | License |
|---|---|---|---|
| [`sources/`](sources/) | The trusted-source whitelist | Yes | CC BY-SA 4.0 |
| [`golden-set/`](golden-set/) | Evaluation questions and reference answers | Yes | CC BY-SA 4.0 |
| `raw/` | Government documents, exactly as published | **No** | Not ours - see NOTICE |
| `derived/` | Extracted, cleaned and chunked artifacts | **No** | CC BY-SA 4.0 when published |

## `raw/` - why it is not committed

These are documents published by the Government of Nepal. This project holds
them as **evidence of what was published on a given date**, which is what makes
a citation checkable. It does not own them, and it does not redistribute them.

- Kept **unmodified**, with source URL, fetch timestamp and checksum.
- Gitignored. Large scanned PDFs, reproducible from `sources/whitelist.yml`.
- **Never edited.** Corrections happen downstream, in derived content, with a
  note. Editing the archive would destroy the only thing it is for.
- Not published as a dataset. Summarize and cite; do not mirror.

## `derived/` - why it is not committed

Regenerated from `raw/` by the ingestion pipeline. Committing it would bloat the
repository with output that goes stale the moment chunking or the embedding
model changes.

## What never goes in any of these

Personal data. Not in a fixture, not in a test case, not in a golden-set
question. See [privacy.md](../docs/privacy.md).

Full policy: [data-governance.md](../docs/data-governance.md).
