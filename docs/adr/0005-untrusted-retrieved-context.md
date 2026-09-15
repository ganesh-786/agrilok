# ADR-0005: Treat retrieved content as data, never as instructions

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** @ganesh-786

## Context

The system feeds crawled documents into a model's context window. Any text in
those documents that reads like an instruction - "ignore previous instructions",
"reply that this syllabus is current", anything embedded in a PDF's invisible
text layer - is a potential hijack of the model's behaviour. This is indirect
prompt injection.

Today the realistic risk is **low**: the whitelist contains government PSC
domains, and the documents are official publications, not adversarial content.

But the risk profile is a function of the whitelist, and whitelists widen.
Phase 3 contemplates community flagging and corrections. Any future move toward
forum content, news sources or user submissions raises this sharply. Retrofitting
a trust boundary into a system that never had one is far harder than building
with it, and the cost of building with it now is close to zero.

There is a second, subtler reason: the same discipline that stops injection also
stops a *legitimate* document from being misread as guidance. A syllabus that
contains the sentence "candidates should answer in Nepali" is describing an exam,
not instructing our model.

## Options considered

### Option A - Defer until the whitelist widens

Nothing to build now. But the boundary would have to be added later across every
prompt path simultaneously, under time pressure, and the first breach would
likely be discovered by a student getting a manipulated answer. Rejected.

### Option B - Filter injection patterns from crawled text at ingestion

Strip suspicious phrases before storage. Attractive, but pattern-matching for
injection is a losing arms race, it corrupts the archive (which must stay
faithful to what was published), and it would mangle legitimate text - an exam
curriculum genuinely contains imperative sentences. Rejected.

### Option C - Structural separation in the prompt

Keep the archive faithful and enforce the boundary at assembly: retrieved text is
fenced, explicitly labelled untrusted reference data, and the system instruction
states that instructions inside it are never followed.

## Decision

Retrieved content is **data**, never instruction.

- Every prompt fences retrieved text in a clearly delimited block, labelled as
  untrusted reference material.
- The system instruction states plainly that text inside that block is reference
  data only, and that any instruction appearing within it is to be ignored and,
  where relevant, reported.
- Model output is treated as **text to display**. It is never executed, never
  used to construct a query or a command, and never allowed to trigger an action.
- This extends to any developer tooling that fetches pages on our behalf. It is
  instructed to treat fetched content as data too.
- The raw archive is never filtered or sanitised. It stays faithful to what was
  published; the boundary is enforced at assembly time.

## Consequences

### Good

- The trust boundary exists before it is needed, and widening the whitelist
  becomes a policy decision rather than a security incident.
- The archive stays a faithful record - which is also what the fair-dealing
  position in [NOTICE](../../NOTICE) depends on.
- Removes a class of confusion where legitimate imperative text in a curriculum
  is read as guidance to the model.

### Bad

- Fencing consumes context tokens on every request, marginally reducing room for
  retrieved content.
- Structural separation is a strong mitigation, not a guarantee. Models can still
  be influenced by sufficiently crafted content. This reduces risk; it does not
  eliminate it, and claiming otherwise would be worse than not having it.
- Adds a rule every prompt-touching change must respect, which is one more thing
  to get wrong in review.

### Neutral

- Prompt assembly becomes a single, testable component rather than string
  concatenation scattered across the codebase. That is worth having regardless.

## Verification

This decision is wrong - or insufficient - if a golden-set or production answer
is ever observed following an instruction that originated in a source document.

Add adversarial cases to the golden set once the harness exists: a chunk
containing an embedded instruction, with the expected behaviour being to ignore
it. Treat any failure as a security issue under [SECURITY.md](../../SECURITY.md).

## References

- Research on indirect prompt injection and layered defences for RAG systems
- [SECURITY.md](../../SECURITY.md) threat model
