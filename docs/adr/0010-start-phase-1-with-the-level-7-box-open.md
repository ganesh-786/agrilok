# ADR-0010: Start Phase 1 while the Level 7 past-paper box is still open

- **Status:** Accepted (2026-09-24)
- **Date:** 2026-09-24
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none. Records an exception to the go/no-go
  gate in [docs/roadmap.md](../roadmap.md#gono-go-gate); it does not rewrite
  the gate.

## Context

The roadmap says production code does not start until every gate box is
ticked. On 2026-09-24 three of five were ticked or deferred on the record:

- Syllabus currency: ticked on the owner's check of both commissions' lists.
- Content review workflow: ticked ([ADR-0009](0009-content-review-workflow.md)).
- Whitelist owner: ticked.
- Free-tier capacity from a real pilot: deferred by the owner, unticked, risk
  accepted knowingly.
- **Real past-paper faithfulness: still open.** All 20 real questions are
  Level 4. `PP-01`, the one confirmed fabrication, is now withheld 3 of 3 by
  the support check, and the golden set scores 35 of 37 with every shown
  answer checked by hand. What is missing is a single real **Level 7** past
  paper with an official answer key. The only Officer paper found so far is a
  coaching centre's retyped copy, which does not meet the bar.

The owner decided to start Phase 1 now instead of waiting for that paper. This
ADR exists so that decision is visible and bounded, not quietly absorbed.

## Options considered

### Option A - Wait for the Level 7 paper

Keeps the gate exactly as written. Nothing in Phase 1 depends on code that
cannot be written without it, so waiting costs calendar time only. But the
paper's availability is outside the project's control, and the owner judged
the delay not worth it.

### Option B - Start Phase 1, keep the box open, bound the risk

Build the MVP now. The box stays unticked, the Level 7 path is labelled as not
yet measured against a real Level 7 paper, and closing the box stays a named
task. The support check (ADR-0008) guards the live path at both levels.

## Decision

**Option B.** Phase 1 starts on 2026-09-24 with the Level 7 past-paper box open.

- The box is **not** ticked and the roadmap says so.
- The Level 7 area of the web app states plainly that its answers have not yet
  been measured against a real Level 7 past paper.
- When an official Level 7 answer key is found, its questions go into the
  golden set as `real_past_paper` entries, the set is run, and the box is
  closed or the finding is reported, before any public launch is announced.
- Nothing about the live path is relaxed to compensate: refusal stays the
  default, the support check stays on, and review states stay visible.

## Consequences

### Good

- Phase 1 work (review queue, retrieval, the web app) starts now instead of
  waiting on a document the project cannot produce itself.
- The exception is written down with its conditions, so it cannot drift into
  "the gate was cleared".

### Bad

- Level 7 answers reach testers before their faithfulness has been measured on
  a real Level 7 paper. If Level 7 questions fail in a way Level 4 questions do
  not, the first evidence may come from a user, not from the golden set.
- Two gate boxes are open or deferred at once, which makes it easier for a
  third exception to feel normal. It should not.

### Neutral

- The golden set needs Level 7 entries before the Phase 1 exit criterion
  (golden-set faithfulness as a required status check) can mean much for
  Level 7.

## Verification

This decision was wrong if a confirmed Level 7 fabrication reaches a student
through the live path, or if Phase 1 reaches its exit criterion with the
Level 7 box still open and no one looking for the paper.

Track: count of real Level 7 entries in the golden set; Level 7 live refusal
and support-check failure rates, separately from Level 4.

## References

- [docs/roadmap.md](../roadmap.md#gono-go-gate)
- [ADR-0006](0006-golden-set-evaluation.md), [ADR-0008](0008-generation-model-tier.md)
- `spike/golden_set/README.md` (why the coaching-centre Officer set is kept unverified)
