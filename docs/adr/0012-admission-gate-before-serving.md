# ADR-0012: Admit documents by a named person before they can answer

- **Status:** Proposed
- **Date:** 2026-09-24
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none. Makes precise how
  [ADR-0009](0009-content-review-workflow.md) and
  [docs/architecture.md](../architecture.md) fit together.

## Context

Two statements in the project pull against each other once there is code:

1. [docs/architecture.md](../architecture.md): "Low-confidence extractions and
   any document from a newly-added source go to a review queue **before** they
   are allowed to answer anything."
2. [docs/review-checklist.md](../review-checklist.md): "When in doubt, leave it
   `ai_assisted_pending_review`. Unreviewed and labelled honestly is safe."
   The product brief also promises students can "see plainly whether a human
   has checked that content or not", which only means something if unchecked
   content can be shown.

Read literally, (1) says nothing unreviewed may answer, and (2) says
unreviewed content is served with a label. Both are right about different
things. Meanwhile CLAUDE.md forbids a third review state.

Phase 1 also starts with 43 hand-collected documents from Phase 0, every one of
them from a source that is new to the running system.

## Options considered

### Option A - Serve nothing until it is `verified`

Simplest reading of (1). Nothing answers until the full seven-point checklist
has been done by a person for every document, which on 43 documents with one
reviewer is weeks. The `ai_assisted_pending_review` label would never appear
on source text at all.

### Option B - A pipeline admission gate, separate from the review state

A document enters the queue on ingestion and cannot answer anything until a
named person **admits** it. Admission is a pipeline decision (the extraction is
fit to serve, the tags are right), recorded with who and when. It is not a
review state. Once admitted, its chunks serve with the visible
`ai_assisted_pending_review` label until someone completes the full checklist
and marks it `verified`. OCR output and low-confidence extractions cannot be
admitted without a recorded comparison against the source PDF.

### Option C - Admit text-layer documents automatically

Fastest. It is exactly "published by omission", which data governance names as
a bug of the highest severity. Rejected.

## Decision

**Option B.**

- `documents.admission` is `queued`, `admitted` or `rejected`. It defaults to
  `queued`. Only admitted documents are retrieved. This is a pipeline gate and
  is never shown to a student as a review state.
- `review_state` keeps exactly two values, `verified` and
  `ai_assisted_pending_review`, default `ai_assisted_pending_review`, on both
  documents and chunks. A check constraint requires a reviewer, a date and a
  self-review flag on anything `verified`.
- Admission requires `--by <handle>`. It is refused unless
  `--compared-against-pdf` is also given when the extraction came from OCR or
  scored below `OCR_MIN_CONFIDENCE`.
- Bulk admission exists for the Phase 0 corpus, but it lists what it will
  admit and needs an explicit confirmation. Nothing is admitted by an import,
  a migration or a default.
- Every admission, rejection and verification is written to the review item
  for that document (ADR-0009), with self-review recorded as self-review.

## Consequences

### Good

- (1) holds: nothing from a new source answers until a person has looked at it
  and said so on the record.
- (2) holds: admitted, not-yet-verified text is served with its honest label.
- No third review state; the gate lives in a different column with a
  different meaning.

### Bad

- "Admitted" is a lighter check than "verified", and a hurried admission could
  let a bad extraction answer questions. The label still says pending review,
  but students may not read it.
- One more concept for contributors to learn, and one more thing the admin
  tooling must get right.

### Neutral

- The ingestion CLI needs `review admit`, `review verify`, `review reject`,
  and a way to open the ADR-0009 review item.

## Verification

Wrong if a document reaches retrieval without an admission record, if an OCR
document is admitted without the PDF comparison flag, or if a student-facing
page ever shows admission status as though it were a review state.

Track: admitted-but-not-verified document count and age; confirmed content
errors traced to admitted documents.

## References

- [ADR-0009](0009-content-review-workflow.md), [ADR-0002](0002-text-layer-before-ocr.md)
- [docs/review-checklist.md](../review-checklist.md), [docs/data-governance.md](../data-governance.md)
