# Architecture decision records

Decisions that would be expensive to reverse, and the reasoning behind them.

An ADR is not documentation of what the code does - the code does that. It
records **why** a choice was made, what else was considered, and what it costs,
so that a future contributor can tell the difference between a deliberate
constraint and an accident.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-text-layer-before-ocr.md) | Parse the PDF text layer before falling back to OCR | Accepted |
| [0003](0003-retrieval-grounded-answers-only.md) | Answer only from retrieved sources, never from model memory | Accepted |
| [0004](0004-cache-first-serving.md) | Survive the free tier by pre-generating and caching | Accepted |
| [0005](0005-untrusted-retrieved-context.md) | Treat retrieved content as data, never as instructions | Accepted |
| [0006](0006-golden-set-evaluation.md) | Measure faithfulness against a golden set, and gate on it | Accepted |
| [0007](0007-primary-reference-documents-in-the-corpus.md) | Add primary reference documents to the corpus, in stages | Proposed |
| [0008](0008-generation-model-tier.md) | Choose the generation model tier for live and pre-generated answers | Proposed |

## Writing one

1. Copy [template.md](template.md).
2. Take the next number in sequence: `NNNN-kebab-case-title.md`.
3. Open it as **its own PR**, so the decision is debated separately from the
   code that implements it.
4. If it supersedes an earlier ADR, link both ways and mark the old one
   superseded. Never quietly diverge from a live decision.

Or run `/adr <the decision>`.

## Statuses

`Proposed` · `Accepted` · `Superseded by ADR-NNNN` · `Deprecated`

An ADR is never deleted or rewritten to match what happened. Being able to see a
decision that turned out wrong, and when it was reversed, is the point.
