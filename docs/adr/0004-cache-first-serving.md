# ADR-0004: Survive the free tier by pre-generating and caching

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** @ganesh-786

## Context

The platform commits to being free for students, and it runs on the Gemini free
tier. Free-tier quotas are low, measured per minute and per day, and change
without notice.

The naive architecture - one model call per student per question - does not
survive contact with a few hundred students studying on the same evening. Worse,
the failure is concentrated exactly at peak study hours.

The saving grace is the shape of the demand. Exam preparation over a **fixed
published syllabus** is unusually repetitive: thousands of students ask
near-identical questions about the same topics. Treating each of those as a
novel request wastes the structure of the problem.

## Options considered

### Option A - Live generation per request, add paid capacity when it breaks

Simplest to build. But it breaks the free promise the moment usage is real, and
retrofitting caching into a system designed around live calls means reworking
the request path, the content model and the review workflow at once. Rejected.

### Option B - Rate-limit students individually

Cap each student's questions per day. Preserves the free tier, but rations the
product hardest for the most engaged users - the ones actually studying. It also
does nothing about the underlying waste of answering the same question a
thousand times. Rejected.

### Option C - Pre-generate and cache; reserve live calls for novel questions

Exploit the repetition. More upfront work on the content model and the cache,
plus a quota governor. In exchange, one API call can serve many students.

## Decision

Serve cache-first, in three layers:

1. **Pre-generated content.** For every syllabus topic, one reviewed explanation
   is generated **once** and served to everyone. One call, unlimited students.
2. **Semantic cache.** A question sufficiently similar to one already answered
   reuses the cached, already-reviewed answer
   (`SEMANTIC_CACHE_SIMILARITY_THRESHOLD`).
3. **Live generation.** Only for genuinely novel questions.

A **quota governor** enforces ceilings set deliberately below the published
limits (`GEMINI_MAX_REQUESTS_PER_MINUTE`, `GEMINI_MAX_REQUESTS_PER_DAY`), so the
system degrades on its own terms before the provider cuts it off.

**The standing rule for every new feature:** before adding a per-student live
model call, prove it cannot be pre-generated or cached. If it can be, it is.

Degradation is **visible**: cached and pre-generated content keeps serving,
live generation queues with an honest message. It never fails silently, and it
never falls back to answering from model memory
([ADR-0003](0003-retrieval-grounded-answers-only.md)).

## Consequences

### Good

- The free promise is structurally supported rather than hoped for.
- Pre-generated content is reviewed **once** and then trusted by everyone -
  caching and the human review workflow reinforce each other rather than
  competing.
- Cached answers are faster, which matters more on rural connections than raw
  model latency ever would.

### Bad

- Real added complexity: a cache layer, a similarity threshold to tune, a quota
  governor, and cache invalidation when a source document changes.
- **A cached wrong answer propagates to everyone.** The blast radius of an error
  is larger than with per-request generation. This is an argument for review, not
  against caching, but it is a genuine cost.
- Near-duplicate detection will sometimes serve a slightly-off answer to a
  subtly different question. The threshold is a real trade-off with no perfect
  setting.
- Personalised features are constrained by design.

### Neutral

- Embedding calls draw on the same quota. Bulk re-embedding after a chunking or
  model change is scheduled maintenance, not a casual dev action.
- Cache invalidation is tied to source change detection, so the crawler and the
  cache are coupled.

## Verification

Instrument from the first deployment: **cache hit rate** and **daily request
burn** against the ceiling. The capacity estimate behind this decision is a
guess until those numbers exist - and the gap between "free forever" and a
surprise bill is exactly this measurement.

This decision is wrong if hit rate stays low in real use, meaning student
questions are far more varied than the fixed-syllabus assumption predicts. That
would call for a different approach, not a bigger cache.

## References

- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- [docs/free-tier-budget.md](../free-tier-budget.md)
