# ADR-0011: Reference documents apply to every exam level and province

- **Status:** Proposed
- **Date:** 2026-09-24
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none. Answers the open question left in
  [ADR-0007](0007-primary-reference-documents-in-the-corpus.md): "Level scoping
  for reference documents stays an open design question, decided before
  Phase 1 code."

## Context

A syllabus belongs to one exam level and one publishing commission. A
reference document (the Constitution, an Act, a regulation, a national policy)
does not: the Constitution's Article 36 is the same text for a Level 4 JTA
candidate in Koshi and a Level 7 Officer candidate in Lumbini.

Level is a hard retrieval filter, and so is province. Applied naively to a
document with no level, the filter silently removes it from every question,
which the spike found the hard way. Two ways to scope it were named in
ADR-0007.

## Options considered

### Option A - Include reference documents under every level and province

A reference chunk is eligible for any level filter and any province filter.
This is what the spike did from the start of ADR-0007's experiment, and it is
what the 35-of-37 golden-set result was measured with. It cannot leak Level 4
syllabus content into Level 7 or the reverse, because reference documents are
not syllabus content for either level. The cost is that an Officer-depth policy
document is also offered to JTA questions.

### Option B - Tag each reference document with the levels whose syllabus names it

Closer to "the right depth for the right exam". But it needs a person to map
every Act to syllabus lines by hand, the mapping goes stale when either side is
revised, and a missing tag fails silently: the document disappears from a
level where a real exam question cites it.

## Decision

**Option A, with conditions.**

- In the schema, `exam_level` is `NULL` only when `doc_class = 'reference'`,
  and a check constraint enforces it. A syllabus without a level cannot exist.
- Retrieval includes reference chunks under any level, any province and any
  service-group filter. Syllabus chunks stay strictly filtered on all three.
- Every citation of a reference document says it is a reference document, not
  a syllabus, so a student never mistakes an Act for their curriculum.
- A reference document marked superseded is not retrieved.

## Consequences

### Good

- Matches the configuration the golden set was measured with, so no retrieval
  change is smuggled in with Phase 1.
- A missing tag cannot hide a document; there is no tag to miss.

### Bad

- A JTA candidate can receive an answer drawn from policy text that their own
  syllabus never asks about. The citation labels it, but the depth may be
  wrong for them.
- If a genuinely level-specific reference document appears (a directive that
  only concerns officer posts, say), this rule has no way to express it. That
  would need a new ADR, not an exception in code.

### Neutral

- Implies a `doc_class` column on documents and a label in the citation UI.

## Verification

Wrong if golden-set or user reports show Level 4 answers leaning on
officer-only policy content that a Level 4 candidate does not need, or if a
level-specific reference document is added and has nowhere correct to go.

Track: share of Level 4 answers whose only citations are reference documents.

## References

- [ADR-0007](0007-primary-reference-documents-in-the-corpus.md)
- `spike/lib/retrieve.mjs` (the rule as the spike implemented it)
- [docs/exam-domain.md](../exam-domain.md)
