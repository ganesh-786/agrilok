# Evaluation

How this project knows whether it is working, rather than whether it feels fine.

## Why this is first-class

Retrieval-augmented systems fail quietly. An answer that is fluent, well-cited
in appearance, and wrong looks exactly like an answer that is right. The only
defence is measurement against known-correct answers, run every time the
pipeline changes.

Production analyses of RAG systems consistently find that when they return
something wrong, **retrieval - not generation - is usually the cause**. That is
why the metrics below separate the two, and why regression triage starts at
retrieval.

## The golden set

A curated set of **real past-paper questions** with known-correct answers,
living in [`data/golden-set/`](../data/golden-set/).

- Target: 50-100 questions minimum, covering **both** Level 4 and Level 7, and
  more than one province.
- Each entry: the question (as asked), the reference answer, the official
  source that supports it, the exam level, service group, province and year.
- Questions in Nepali **and** English, because students ask in both and the
  system must work in both.
- It is committed, and it is reviewed like production code - it defines what
  "correct" means for everything else.

**The golden set is never edited to make a run pass.** If a question or its
reference answer is genuinely wrong, that is its own issue and its own PR, argued
on its own merits.

## Metrics

| Metric | Question it answers | Failure looks like |
|---|---|---|
| **Faithfulness** | Is the answer actually supported by the retrieved text? | The model added something plausible that no source says |
| **Answer relevancy** | Does the answer address the question asked? | Correct, sourced, and about something else |
| **Context precision** | Were the retrieved chunks relevant? | The right chunk drowned among noise |
| **Context recall** | Was the needed information retrieved at all? | The right chunk was never fetched |

## The gate

**Faithfulness is a hard floor.** A drop is a blocking bug, not a trade-off.
Answer relevancy and latency may be traded against each other; faithfulness may
not - an unfaithful answer is precisely the failure this project exists to
prevent.

Thresholds are set from the first full baseline run in Phase 1 and recorded
here. Until that baseline exists, **no threshold is stated**, because a number
invented in advance is not a measurement.

Once the harness exists, `evaluate.yml` becomes a required status check on
`main`.

## When to run it

Any change to:

- chunking (size, overlap, header handling)
- the embedding model or its dimensions
- retrieval parameters, filters, hybrid weighting or reranking
- prompt assembly or system instructions
- the ingestion path that produces the corpus

Run it **before and after**, and put both sets of numbers in the PR. One
post-change number proves nothing.

## Diagnosing a regression

In this order, because this is the order in which these systems actually fail:

1. Was the right chunk retrieved at all? (context recall)
2. Was it drowned by irrelevant chunks? (context precision)
3. Were the level / group / province filters correct?
4. Was the source text itself wrong or misextracted - OCR, staleness?
5. Only then: did generation misuse correct context? (faithfulness)

Report the **named failing questions**, not just the aggregate. An average hides
the one question that is now catastrophically wrong, and that one question is
somebody's exam.

## Phase 0

The harness does not exist yet. Until it does, faithfulness is checked **by
hand** against at least 20 real past-paper questions, as required by the
[go/no-go gate](roadmap.md#gono-go-gate). Record the results; they become the
first baseline.

## Operational metrics

Separate from answer quality, and measured from the first deployment:

- **Cache hit rate** - the mechanism the free tier depends on
- **Daily API request burn** against the configured ceiling
- **Review queue depth and age** - a queue that grows unboundedly means content
  is either not being reviewed or is being waved through
- **Share of content in each review state** - if `verified` is not growing, the
  trust premise is not being delivered

These are not vanity metrics. The first two are the difference between "free
forever" and a surprise bill; the last two are the difference between a reviewed
product and a chatbot with extra steps.
