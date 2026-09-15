# tests

Cross-cutting integration tests - the ones that span more than one component.

Unit tests live with their component (`apps/api/tests/`,
`services/ingestion/tests/`, and so on). This directory is for behaviour that no
single component owns.

> **Status:** empty. Phase 1.

## What belongs here

- **End-to-end pipeline**: a fixture PDF in, a retrievable, correctly-tagged,
  citable chunk out.
- **Provenance survival**: `source_id`, `source_url`, `fetched_at` and `checksum`
  make it from the raw file all the way to a rendered citation. An uncitable
  chunk must not be able to exist.
- **Review gate**: unreviewed content cannot be served as `verified` through any
  path. This is the project's central invariant and deserves a test that tries
  hard to break it.
- **Level separation**: no query, filter or route can return Level 4 content to a
  Level 7 context or the reverse.
- **Refusal behaviour**: when retrieval returns nothing sufficient, the system
  says so and does not answer from model memory
  ([ADR-0003](../docs/adr/0003-retrieval-grounded-answers-only.md)).
- **Injection resistance**: a chunk containing an embedded instruction is treated
  as data ([ADR-0005](../docs/adr/0005-untrusted-retrieved-context.md)).
- **Quota degradation**: at the ceiling, cached content still serves and live
  generation degrades visibly rather than silently.

## What does not belong here

- Answer-quality measurement. That is the golden set, in
  `services/evaluation/` - a different kind of check with a different gate.
- Anything that hits a live government site. Use fixtures.
- Anything that spends real API quota in CI without a deliberate reason.

## Fixtures

Use real document *shapes* - born-digital PDFs, poor scans, mixed
Devanagari/Latin text, multi-column layouts - because those are what actually
break extraction. Never commit a fixture containing personal data.
