# services/evaluation - the golden-set harness

> **Status: not implemented.** Phase 1. Until it exists, faithfulness is checked
> **by hand** against at least 20 real past-paper questions, as the Phase 0 gate
> requires.

Measures whether the system is actually right, rather than whether it feels
right. Full policy: [evaluation.md](../../docs/evaluation.md) and
[ADR-0006](../../docs/adr/0006-golden-set-evaluation.md).

## Metrics

| Metric | Question it answers |
|---|---|
| **Faithfulness** | Is the answer actually supported by the retrieved text? |
| **Answer relevancy** | Does it address the question asked? |
| **Context precision** | Were the retrieved chunks relevant? |
| **Context recall** | Was the needed information retrieved at all? |

## The gate

**Faithfulness is a hard floor.** A drop is a blocking bug, not a trade-off.
Relevancy and latency may be traded; faithfulness may not.

Thresholds come from the first full baseline run in Phase 1. No threshold is
stated before then, because a number invented in advance is not a measurement.

## Rules

- **Never edit a golden-set question or reference answer to make a run pass.**
  The golden set defines correctness; editing it to fit the system inverts the
  entire point. A genuinely wrong question is its own issue and its own PR.
- **Always run a baseline.** One post-change number proves nothing.
- **Report named failing questions**, not just aggregates. An average hides the
  one question that is now catastrophically wrong, and that one question is
  somebody's exam.
- **Use the evaluation API key**, never the production one, so a run can never
  exhaust the quota students depend on.
- Diagnose regressions starting at retrieval - it is the usual cause, not
  generation.

`reports/` is gitignored; CI uploads runs as artifacts.
