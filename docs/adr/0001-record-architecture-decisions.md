# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** @ganesh-786

## Context

This project has several constraints that are non-obvious and, worse, look
arbitrary to anyone encountering them cold:

- Answers must come only from retrieved sources, which is slower and more
  limited than letting the model answer directly.
- OCR is a fallback rather than the default extraction path.
- Content cannot be published without a human review step.
- Features are shaped around a free-tier request ceiling.

Every one of these will, at some point, look like an obstacle to someone trying
to ship something. Without a record of why they exist, they will be worked
around individually, each time for a locally reasonable reason, until the
product is a generic chatbot with a Nepali flag on it.

The project is also expected to be maintained by very few people, possibly one.
Institutional memory that lives only in a maintainer's head is a single point of
failure - for the project and for the students relying on it.

## Options considered

### Option A - No formal record; rely on code comments and PR discussion

Cheapest. But PR discussion is effectively unsearchable a year later, and
comments explain a line rather than a choice. Rejected.

### Option B - A single long "design decisions" document

Better than nothing, but it accumulates edits until the original reasoning is
overwritten by the current state. It cannot show that a decision was reversed,
or when, or why.

### Option C - Numbered, immutable ADRs

Each decision is a dated file that is superseded rather than rewritten. Slightly
more ceremony per decision; a durable, reviewable trail in exchange.

## Decision

Use numbered architecture decision records in `docs/adr/`, following
[template.md](template.md).

An ADR is required for anything expensive to reverse: a datastore, a model, a
cross-cutting pattern, or a policy that binds contributors.

ADRs are opened as their own PR, so the decision can be debated separately from
the code implementing it. They are never deleted or rewritten to match what
happened - a superseded ADR stays, marked superseded, linked to its replacement.

## Consequences

### Good

- A contributor who thinks a rule is arbitrary can find out whether it is.
- Reversing a decision becomes a deliberate act with a written rationale, not a
  silent drift.
- Onboarding cost drops sharply for a project whose constraints are unusual.

### Bad

- Ceremony. Some decisions will be made without an ADR and that is fine; over-
  applying this would be worse than under-applying it.
- ADRs can go stale if a decision is reversed in code but not in the record.
  `/adr` and the PR template both prompt for this, but it depends on discipline.

### Neutral

- `docs/adr/README.md` carries the index and must be updated with each new record.

## Verification

This decision is working if a disagreement about a foundational choice gets
resolved by reading an ADR rather than by re-arguing it. It has failed if the
code contradicts a live ADR and nobody noticed.

## References

- Michael Nygard, "Documenting Architecture Decisions"
- [CONTRIBUTING.md](../../CONTRIBUTING.md#architecture-decisions)
