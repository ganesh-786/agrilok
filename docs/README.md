# Documentation

## Start here

| Document | Read it when |
|---|---|
| [architecture.md](architecture.md) | You want to know how the pieces fit, and why |
| [roadmap.md](roadmap.md) | You want to know what is built, what is next, and what the Phase 0 gate requires |
| [product-brief.md](product-brief.md) | You want the problem analysis and the honest competitive picture |

## Working on the system

| Document | Covers |
|---|---|
| [rag-pipeline.md](rag-pipeline.md) | The stage-by-stage contract and the metadata every chunk must carry. Normative. |
| [free-tier-budget.md](free-tier-budget.md) | Quota reality, and the cache-first rule every new feature has to clear |
| [nepali-devanagari.md](nepali-devanagari.md) | OCR, tokenisation, script and date handling |
| [exam-domain.md](exam-domain.md) | What level, service group and province mean, and why eight authorities publish curricula |
| [review-checklist.md](review-checklist.md) | The content review bar, in order |
| [git-workflow.md](git-workflow.md) | Branching, attribution, tone, commit and pull request rules |

## Policy and governance

| Document | Covers |
|---|---|
| [data-governance.md](data-governance.md) | What may be ingested, what may be published, who decides, retention, takedown |
| [crawl-policy.md](crawl-policy.md) | The promises this project makes to the sites it fetches from |
| [privacy.md](privacy.md) | What is collected, and why no personal data reaches the model |
| [evaluation.md](evaluation.md) | How quality is measured and what blocks a merge |

Legal position on government source material: [NOTICE](../NOTICE).

## Decisions

[adr/](adr/) holds numbered architecture decision records. Read these before
changing a foundation. If a change contradicts one, write a superseding ADR
rather than diverging quietly.

## Operations

[runbooks/](runbooks/) is what to do when something breaks:

- [crawl-failure.md](runbooks/crawl-failure.md)
- [quota-exhaustion.md](runbooks/quota-exhaustion.md)
- [content-error.md](runbooks/content-error.md)

## Reference

- [glossary.md](glossary.md) for exam-domain and system terms
- [../CONTRIBUTING.md](../CONTRIBUTING.md) for the workflow and the review bar

## Writing docs here

- Explain **why**, not what. The code says what.
- State the constraint that makes a decision non-obvious: quota, Devanagari OCR,
  fair dealing, rural bandwidth. Without it, every rule here reads as arbitrary.
- Do not state a measurement that has not been measured. "Not yet measured" is a
  legitimate and useful sentence.
- Mark status honestly. Most of this describes a system that does not exist yet,
  and every such document says so at the top.
