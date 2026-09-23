# ADR-0009: The content review workflow, as an actual mechanism

- **Status:** Accepted (2026-09-23)
- **Date:** 2026-09-23
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none. Makes concrete what
  [docs/data-governance.md](../data-governance.md) and
  [docs/review-checklist.md](../review-checklist.md) already state as
  principle.

## Context

The principles already exist and are not being reopened here: two review
states, `verified` and `ai_assisted_pending_review`, never blurred; nothing
published by omission; a seven-point checklist for what a reviewer checks,
including the explicit rule to compare OCR output against the source PDF, not
against itself. `CONTRIBUTING.md` names a mechanism in one line - "Review
queued content against its source: comment on the review issue" - and never
defines it further. No code exists yet to create that issue, decide what goes
in it, or track its state. This is the go/no-go gate's own item: content
review decided before the crawler goes live.

Two things sharpen this now, both found in this session's work, not assumed:

1. **Scanned documents are not rare.** Testing four government reference
   documents for [ADR-0007](0007-primary-reference-documents-in-the-corpus.md),
   two of four had no text layer at all - a 91-page regulation and a 51-page
   Act, both scanned images. `extract.mjs` used to report these as a
   successful extraction with zero characters; that silent failure is fixed,
   but the review workflow still has to decide what happens to a document
   OCR turns into text of unknown reliability, and it has to happen before
   that text is chunked, embedded, or shown to anyone.
2. **There is one person.** `docs/data-governance.md` names the content
   reviewer role as "any approved contributor," and today that is a
   single-maintainer project. A reviewer checking their own ingestion work is
   not independent review, and pretending otherwise would be exactly the kind
   of blurring rule 2 already forbids. A workflow designed as if a review
   team exists, when it does not, is not decided, it is deferred.

## Options considered

### Option A - GitHub issues, one per source document

Ingestion opens one issue per document, following the review checklist as a
template, closed when a person marks it `verified`. Cheap, uses existing
tooling, visible history. An Act with forty distinct clauses gets reviewed as
one unit, so a reviewer can pass the whole document on a skim and miss one
wrong clause.

### Option B - GitHub issues, one per chunk

Same mechanism, at the grain the pipeline actually serves answers from. Matches
the unit of risk - a single bad chunk is a single wrong answer. A single
syllabus document already produces dozens of chunks; a handful of long
reference documents would produce hundreds of open issues, which is a queue
nobody can see the shape of.

### Option C - A review table in the corpus itself, no GitHub issues

A structured file next to the corpus tracking `chunk_id`, state, reviewer,
date, note. Scales to the chunk count without spamming Issues, diffable, fits
existing tooling (the spike already does something like this by hand in
`sources.yaml`). Loses GitHub's notification and discussion affordances,
and needs its own small tool to work with instead of a page everyone already
knows how to use.

### Option D - Defer the mechanism, keep principles only, until a second
reviewer exists

Honest about current capacity. But this is the literal thing the gate asks to
have decided before the crawler goes live, and the crawler is Phase 1's first
piece of code. Deferring it defers Phase 1.

## Decision

**Accepted 2026-09-23: document-level review (Option A) for now, revisited at chunk
volume where it stops working.**

- Ingestion opens one review item per source document, pre-filled with the
  seven-point checklist from `docs/review-checklist.md`, the document's
  `doc_class`, and, for anything that went through OCR, the raw OCR output
  alongside a link to the original PDF page images - never just the text.
- **A document that needed OCR cannot reach `ai_assisted_pending_review`
  until a person has compared the OCR output against the source PDF
  directly**, per the existing checklist rule. This is a hard gate before the
  normal review state, not a note inside it, because ADR-0002 already treats
  OCR as the higher-risk path and this session found it is not the rare case.
- **Self-review is recorded as exactly that.** While there is one approved
  contributor, a `verified` entry names the reviewer and states plainly that
  no second person checked it. This is not solved by process; it is a real,
  visible limitation until a second reviewer exists, and hiding it behind a
  role label that implies independence would itself violate rule 2.
- Revisit the mechanism (toward Option B or C) when reference-document
  chunk counts make one-issue-per-document too coarse to catch a single wrong
  clause, or when open review items exceed what one person can keep current -
  see `docs/evaluation.md`'s "review queue depth and age" metric, which
  already exists to catch exactly this.

## Consequences

### Good

- Turns a one-line intention into something the crawler can actually depend
  on before Phase 1 starts.
- The OCR gate directly answers this session's own finding: two of four real
  documents tried needed it.
- Naming self-review honestly is cheap now and expensive to retrofit once
  content has already shipped under a `verified` label that implied more than
  it delivered.

### Bad

- Document-level review will miss a single wrong clause inside an otherwise
  good document. This is a known, accepted gap until volume forces Option B
  or C.
- The OCR gate adds real reviewer time on exactly the source class - primary
  reference documents - this project most wants to add next.
- Self-review, however honestly labelled, is still not independent review.
  The product's core promise rests partly on trust the workflow cannot fully
  deliver until a second reviewer exists.

### Neutral

- Implies ingestion tooling that does not exist yet: opening the review item,
  attaching OCR output and source images, and flipping state on merge of a
  review decision. Phase 1 scope, not this ADR.

## Verification

Wrong if review queue age grows unbounded (a queue nobody can clear is not a
review process), if a `verified` document is later found to contain a claim
its source does not support (the checklist or the gate failed, not the
person), or if an OCR document reaches a student without the direct-against-PDF
comparison ADR-0002 and this ADR both require.

Track: review queue depth and age (already named in `docs/evaluation.md`),
share of `verified` content that is self-reviewed, and any confirmed
content-error issue traced back to a document that skipped or shortcut the
OCR gate.

## References

- `docs/data-governance.md`, `docs/review-checklist.md`, `CONTRIBUTING.md`
- [ADR-0002](0002-text-layer-before-ocr.md), [ADR-0007](0007-primary-reference-documents-in-the-corpus.md)
- `docs/roadmap.md`, go/no-go gate item "Content review workflow decided before the crawler goes live"
