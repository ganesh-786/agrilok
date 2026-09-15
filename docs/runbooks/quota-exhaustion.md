# Runbook: API quota exhaustion

## Symptoms

Gemini requests returning `429` / quota errors, the quota governor refusing live
generation, or daily burn approaching the configured ceiling before peak study
hours.

## First principle

**Never resolve a quota problem by answering from model memory.** An ungrounded
answer is the failure this project exists to prevent
([ADR-0003](../adr/0003-retrieval-grounded-answers-only.md)). Degrading is
correct; guessing is not.

## Immediate response

1. **Confirm cached and pre-generated content is still serving.** It costs no
   quota. If it is not serving, that is the actual incident - the cache path
   should be independent of the live path.
2. **Check the governor is doing its job.** Ceilings
   (`GEMINI_MAX_REQUESTS_PER_MINUTE`, `GEMINI_MAX_REQUESTS_PER_DAY`) are set
   below the published limits so we degrade on our own terms. Hitting a provider
   `429` before hitting our own ceiling means the ceiling is misconfigured or
   not enforced on some path.
3. **Make the degradation visible.** Students see an honest message that live
   answers are queued, not a spinner, a silent failure, or a wrong answer.

## Diagnose

| Cause | How to tell | Fix |
|---|---|---|
| Cache hit rate collapsed | Hit-rate metric dropped | Find what invalidated the cache - a re-embed, a deploy, a source change cascade |
| A new feature added a live call per student | Recent deploy, burn jumped | Revert or convert to pre-generation ([ADR-0004](../adr/0004-cache-first-serving.md)) |
| Bulk embedding ran unscheduled | Burn spike with no user growth | Embedding draws on the same quota. Reschedule to off-peak, as maintenance |
| Real growth | Burn rose with active users | Genuine capacity problem - see below |
| Provider changed the quota | `429` well below expected volume | Re-read the published limits; update the ceilings |
| Retry storm | Many requests, few distinct questions | Check backoff; a retry loop can burn a day's quota in minutes |

## If it is real growth

This is a good problem, handled in this order:

1. **Raise the cache hit rate first.** Which questions are going live that could
   have been pre-generated? Pre-generate those topics.
2. **Widen semantic cache coverage.** Review the similarity threshold - carefully,
   since a loose threshold serves near-miss answers.
3. **Then** look at capacity: education or nonprofit credit programmes, or a
   funded tier. Investigate these **before** they are needed, not during an
   outage.

Core study content is never paywalled to solve a quota problem.

## Prevention

- Cache hit rate and daily burn are dashboard metrics, watched, not queried
  after an incident.
- Alert on burn rate, not on exhaustion. Exhaustion is too late.
- Every PR states its effect on request volume - the PR template asks for it.
- Evaluation runs use a separate key, so a run can never exhaust the quota
  students depend on.

## References

- [ADR-0004](../adr/0004-cache-first-serving.md)
- [docs/free-tier-budget.md](../free-tier-budget.md)
- https://ai.google.dev/gemini-api/docs/rate-limits
