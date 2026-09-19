# ADR-0008: Choose the generation model tier for live and pre-generated answers

- **Status:** Proposed
- **Date:** 2026-09-19
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none

## Context

Three facts from the Phase 0 spike, all measured, pull in different directions.

1. **The cheap tier fabricates where a stronger one refuses.** On real question
   `PP-01`, `gemini-3.1-flash-lite` answered "secondary data" from two adjacent
   syllabus headings that never state it, cited real chunks as if they did, and
   was wrong against the exam's own marked answer. The prompt was corrected (a
   dropped "do not use outside knowledge" instruction was restored, and the rule
   was rewritten as one general test) and `PP-01` still failed on this model.
   Sending the identical prompt and identical retrieved context to
   `gemini-3-flash-preview` and `gemini-3.5-flash` gave a correct refusal from
   both. That rules out the prompt as the remaining variable.
2. **The stronger tier is very small on the free tier.** The AI Studio quota
   dashboard for this account on 2026-09-18 showed every full-tier Flash model
   (3, 3.5, 3.6, 3.7, 3.8) at 20 requests per day and both Lite models checked
   (3.1 and 3.5) at 500. The spike used up a full model's 20 in a handful of
   calls the same day.
3. **Models are sunset without notice.** `gemini-2.5-flash`, which this project
   deliberately pinned, returned "no longer available to new users" from the API
   even though the model list still advertised it. Pinning a dated model does
   not protect against removal, and a rolling alias would have hidden the change
   by silently swapping behaviour.

[ADR-0004](0004-cache-first-serving.md) already shapes the answer: most traffic
should be pre-generated, reviewed content, with live generation reserved for
genuinely novel questions.

## Options considered

### Option A - Lite tier for everything, rely on review

500 requests a day, workable for a pilot. Keeps the known weakness on the live
path, where nothing reviews the answer before a student sees it.

### Option B - Full tier for everything

Best measured faithfulness. Twenty requests a day, project-wide, is not enough
for any real pilot, and would be exhausted by evaluation runs alone.

### Option C - Lite tier plus a non-model check on the live path

Keep the cheap model for live answers and add a deterministic check before
display: every claim's cited chunk must contain the words or numbers the claim
depends on, and an answer failing the check is downgraded to a refusal. No extra
model calls. Cannot catch every unsupported inference, so it lowers the risk
rather than removing it.

### Option D - Full tier for offline pre-generation, Lite tier for live answers

Twenty calls a day is enough to pre-generate a reviewed explanation per syllabus
topic over weeks, which is exactly ADR-0004's first layer, and a human reviews
each one anyway. The live path then serves only what is not cached. This puts the
strongest model where quality matters most and volume is lowest.

## Decision

**Proposed: Option D combined with Option C. Not yet accepted.**

- Use the strongest available model to pre-generate topic explanations, one call
  per topic, each reviewed by a named person before it is marked verified.
- Serve live novel questions on the Lite tier, behind the deterministic support
  check, with refusal as the default when the check fails.
- Treat the model as configuration that can disappear: a startup check that the
  configured model actually answers, an explicit failure (not a silent fallback)
  when it does not, and a golden-set run required on every model or prompt
  change, per [ADR-0006](0006-golden-set-evaluation.md).
- Record the free-tier numbers as dated observations, not constants. They
  changed once already and the limits page publishes no figures.

## Consequences

### Good

- Faithfulness effort goes where it is cheapest to get right: offline, reviewed.
- The live path degrades toward refusal, which is the designed safe behaviour.
- The design survives a model being retired, because nothing assumes it exists.

### Bad

- Pre-generation depends on the corpus containing explanatory text, so this
  decision is only useful once [ADR-0007](0007-primary-reference-documents-in-the-corpus.md)
  has content to explain.
- The deterministic check will both miss some unsupported answers and reject
  some good ones; its threshold needs tuning against the golden set.
- Two model tiers means two behaviours to evaluate.
- Twenty full-model calls a day is a hard ceiling on how fast the corpus can be
  covered.

### Neutral

- Embedding has its own limits (30,000 tokens a minute and 1,000 requests a day
  on the dashboard), separate from generation, which limit how fast the corpus
  can be re-embedded.

## Verification

Wrong if the live path shows a confirmed fabrication that the support check
passed, if reviewers reject a large share of pre-generated explanations, or if
the daily full-model ceiling makes topic coverage slower than the roadmap allows.

Track: unsupported-claim rate on the golden set per model; live refusal rate;
support-check false positives and negatives; reviewer rejection rate; days to
cover the syllabus at 20 topics a day.

## References

- `docs/evaluation.md`, section "Chasing PP-01"
- `docs/free-tier-budget.md`
- [ADR-0003](0003-retrieval-grounded-answers-only.md), [ADR-0004](0004-cache-first-serving.md), [ADR-0006](0006-golden-set-evaluation.md)
