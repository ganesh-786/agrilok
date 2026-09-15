# ADR-0006: Measure faithfulness against a golden set, and gate on it

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** @ganesh-786

## Context

Retrieval-augmented systems fail quietly. An answer that is fluent, plausibly
cited and wrong is indistinguishable, at a glance, from one that is right. There
is no compiler error for a wrong fact.

This project's entire premise is that a student can rely on what it says, and a
change to chunking, embeddings, retrieval parameters or prompts can degrade
answer quality without breaking a single test. "It seems fine" is not a control.

Two further facts shape the response:

- Production analyses of RAG systems find that when they return something wrong,
  **retrieval** is usually the cause, not generation. Measurement must therefore
  separate the two, or every regression gets misdiagnosed as a prompt problem.
- Building evaluation in from the start is now standard practice for production
  RAG systems, and retrofitting it means having shipped changes that were never
  measured.

## Options considered

### Option A - Manual spot-checking

Zero infrastructure. But it is not repeatable, does not catch slow drift, does
not scale past a handful of questions, and is skipped exactly when it matters
most - under deadline. Rejected as the primary control, though it is what
Phase 0 uses before the harness exists.

### Option B - Unit tests over retrieval outputs

Cheap and deterministic, but tests exact chunk IDs rather than answer quality.
It breaks on harmless changes and passes on harmful ones. Useful as a supplement,
insufficient as the control.

### Option C - A golden set with faithfulness, relevancy, precision and recall

Real cost: curating real past-paper questions with verified reference answers,
plus API quota to run it. In exchange, regressions become visible and
attributable to a pipeline stage.

## Decision

Maintain a golden set in `data/golden-set/` of **real past-paper questions** with
known-correct answers, covering both exam levels, more than one province, and
questions in both Nepali and English. Target 50-100 minimum.

Measure four metrics: **faithfulness**, **answer relevancy**, **context
precision**, **context recall**.

- Any change to chunking, embeddings, retrieval parameters, reranking, prompts,
  or the ingestion path runs the set **before and after**, with both sets of
  numbers in the PR.
- **Faithfulness is a hard gate.** A drop is a blocking bug, not a trade-off.
  Relevancy and latency may be traded against each other; faithfulness may not.
- Regression triage follows the stage order in
  [evaluation.md](../evaluation.md), starting at retrieval.
- Named failing questions are reported, not just aggregates.
- **The golden set is never edited to make a run pass.** It defines correctness;
  editing it to fit the system inverts the point. A genuinely wrong question is
  its own issue and its own PR.
- Once the harness exists, `evaluate.yml` becomes a required status check on
  `main`.
- Evaluation uses a **separate API key** so a run can never exhaust the quota
  students depend on.

Thresholds are set from the first full baseline in Phase 1. Until then no
threshold is stated, because a number invented in advance is not a measurement.

## Consequences

### Good

- Regressions are caught before students see them.
- Disagreements about whether a change helped are settled with numbers.
- Per-stage metrics point at the actual cause instead of prompting a prompt
  rewrite for a retrieval bug.
- The golden set doubles as living documentation of what the system is expected
  to handle.

### Bad

- Curating it is slow, manual work requiring real subject knowledge - and it is
  needed **before** it pays off, which makes it easy to under-invest in.
- Runs consume API quota, which is the scarcest resource this project has.
- Metrics computed with a model judge carry their own noise; small deltas may not
  be meaningful, and over-reading them wastes effort.
- A gate that blocks merges will, eventually, block a change someone is sure is
  correct. That friction is the price of the guarantee.

### Neutral

- The golden set becomes trust-critical itself, so it is CODEOWNER-protected and
  reviewed like production code.

## Verification

This decision is wrong if content-error reports from students are consistently
about cases the golden set does not represent - meaning the set is measuring the
wrong things and needs to be extended from real reports rather than from
intuition.

Track: golden-set metrics over time, and student-reported content errors
cross-referenced against whether a similar case exists in the set.

## References

- [docs/evaluation.md](../evaluation.md)
- RAGAS evaluation framework
- Production RAG failure-mode analyses
