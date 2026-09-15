# Context: the free-tier budget

Load this before adding, moving or removing any call to the Gemini API.

## The constraint

The platform runs on the Gemini free tier. Free-tier quotas are low, are
measured per minute and per day, and **change without notice** - the published
limits at https://ai.google.dev/gemini-api/docs/rate-limits are the only
authority. Do not trust a number in this file, in a blog post, or in your own
memory as current.

Configured ceilings live in `.env` (`GEMINI_MAX_REQUESTS_PER_MINUTE`,
`GEMINI_MAX_REQUESTS_PER_DAY`) and are deliberately set **below** the published
quota so the system degrades before the provider cuts it off.

## Why this is survivable

Exam preparation is unusually repetitive: thousands of students ask
near-identical questions about the same fixed syllabus. That repetition is the
asset the architecture is built on.

Three layers, in order of preference:

1. **Pre-generated content.** For every syllabus topic, one reviewed
   explanation is generated **once** and served to everyone. One API call,
   unlimited students.
2. **Semantic cache.** A new question that is highly similar to one already
   answered reuses the cached, already-reviewed answer. Threshold:
   `SEMANTIC_CACHE_SIMILARITY_THRESHOLD`.
3. **Live generation.** Reserved for genuinely novel questions.

## The rule for any new feature

> Before adding a per-student live model call, prove it cannot be
> pre-generated or served from cache.

If it can be pre-generated, pre-generate it. A feature that makes one API call
per student per question does not scale on this budget and will be sent back in
review.

## Degradation

When the daily ceiling is close, the system must degrade **visibly**:

- Serve cached and pre-generated content normally - it costs nothing.
- Queue or defer live generation with a clear, honest message.
- Never fail silently, and never fall back to answering from model memory. An
  ungrounded answer is worse than no answer. ([ADR-0003](adr/0003-retrieval-grounded-answers-only.md))

## Embeddings count too

Embedding calls draw on quota as well. Bulk re-embedding of the corpus - after
a chunking change or a model change - is a scheduled maintenance operation, not
something to trigger casually during development. Estimate the call count
first.

## Measure, do not assume

Any capacity estimate is a guess until it is instrumented. Cache hit rate and
daily quota burn are first-class metrics from the first deployment: the gap
between "free forever" and a surprise bill is exactly this number.

Related: [ADR-0004](adr/0004-cache-first-serving.md).
