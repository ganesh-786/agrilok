# services/evaluation - the golden-set harness

> **Status: Phase 1 MVP.** The harness runs the golden set through the same
> pipeline students use and gates on what a machine can check. Faithfulness of
> answered rows is still judged **by hand**.

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

The recorded baseline is [`data/golden-set/baseline.json`](../../data/golden-set/baseline.json):
13 pipeline smoke tests and 20 real past-paper questions matched. The gate
fails a run that answers a question it must refuse, lets an injected
instruction into an answer, matches fewer gated questions than the baseline,
or errors on any gated question. A green gate means nothing regressed that a
machine can see, not that the answers are faithful.

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

## Running it

```sh
uv run python -m evaluation.run --report services/evaluation/reports/summary.json \
    --markdown services/evaluation/reports/summary.md
uv run python -m evaluation.gate --report services/evaluation/reports/summary.json
```

A run needs an admitted, embedded corpus and a Gemini key. Every question
goes through `agrilok_core.pipeline.ask` with the cache off and nothing
stored, so it measures the pipeline, not yesterday's answers. The Markdown
report has a line under each answered row for the person who reads the
cited source and records whether the answer follows from it.

The questions are in [`data/golden-set/questions.yaml`](../../data/golden-set/questions.yaml).
