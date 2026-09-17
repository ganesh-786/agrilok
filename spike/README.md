# Phase 0 validation spike

> **This code is throwaway.** Per [docs/roadmap.md](../docs/roadmap.md), Phase 0
> exists to find out whether retrieval-grounded answers are actually faithful
> to real Loksewa agriculture syllabi before any production infrastructure is
> written. Nothing here is meant to become Phase 1 code. When the spike has
> answered that question, this directory gets deleted, not refactored into
> `services/`.

## Why Node, not the project's Python stack

[docs/architecture.md](../docs/architecture.md) specifies Python for the real
pipeline, and that stands for Phase 1. This spike is Node.js because that is
what is actually installed and runnable in the environment this was built in —
no working Python interpreter was available, Node was. A spike that cannot be
executed and checked is worse than no spike, so runnable-now won over
stack-consistency for code that is deleted in one to two weeks regardless.

## What this proves or disproves

The single question: **when the pipeline retrieves real syllabus text and
generates an answer only from it, is that answer actually faithful to the
source** — checked by hand against known-correct answers, per the go/no-go
gate in [docs/roadmap.md](../docs/roadmap.md#gono-go-gate).

It is not testing scale, latency, cost, or UI. Those are Phase 1+ concerns.

## Pipeline

```
corpus/sources.yaml (18 verified documents, provenance recorded)
  -> download.mjs      fetch each PDF, save raw, record checksum + fetch date
  -> extract.mjs       pdftotext (text layer first) + corruption detection
  -> chunk.mjs          ~400 tokens, 15% overlap, metadata carried through
  -> embed.mjs          gemini-embedding-001 -> local vector store (JSON)
  -> ask.mjs             retrieve (vector + metadata filter) -> fence as
                          untrusted data -> Gemini Flash -> cited answer
  -> evaluate.mjs        run golden_set/questions.yaml, write reports/ for
                          manual faithfulness review
```

Every stage mirrors the shape of [docs/rag-pipeline.md](../docs/rag-pipeline.md)
deliberately — not because this code will be reused, but because a spike that
tests a different shape than the real architecture proves less. The parts that
do NOT carry over: pgvector (a JSON file is enough for ~20 documents), Scrapy
(these 18 were fetched by hand per the roadmap), FastAPI (a CLI is enough).

## The two rules that still apply, even in a throwaway spike

These are not being relaxed for expedience — testing them IS the point of
Phase 0:

1. **Retrieved text is fenced as untrusted data, never as instructions**
   ([ADR-0005](../docs/adr/0005-untrusted-retrieved-context.md)). If the spike
   skipped this to save time, it would not be testing the thing Phase 1
   actually needs to know works.
2. **The model refuses rather than answers when retrieval is empty or weak**
   ([ADR-0003](../docs/adr/0003-retrieval-grounded-answers-only.md)). Same
   reasoning.

## Setup

```bash
cd spike
npm install
cp .env.example .env    # fill in GEMINI_API_KEY
```

Get a free key at <https://aistudio.google.com/apikey>. Nothing else needs to
run — no database, no Docker.

## Running it

```bash
node download.mjs         # fetch the 18 source PDFs (one-time, ~6 MB total)
node extract.mjs          # text-layer extraction + corruption report
node chunk.mjs             # chunk + attach metadata
node embed.mjs             # call the embedding API, build the vector store
node ask.mjs "your question" [--level 7] [--province lumbini]
node evaluate.mjs          # run golden_set/questions.yaml, write reports/
```

Each step writes its output to `corpus/` so you can inspect intermediate
results — this is a spike, not a black box.

## Known, honest gaps

- **The golden set is not yet 20 real past-paper questions.** See
  [golden_set/README.md](golden_set/README.md) for exactly what's in there
  right now and why. Do not treat a clean `evaluate.mjs` run as satisfying the
  go/no-go gate until that file says otherwise.
- **OCR fallback is not implemented.** All 18 source PDFs have a usable text
  layer, so [ADR-0002](../docs/adr/0002-text-layer-before-ocr.md)'s OCR path
  was never exercised. `extract.mjs` flags any document where extraction looks
  degraded rather than silently ingesting garbage — see its report for what
  "degraded" caught in practice.
- **No hybrid keyword search.** Retrieval is vector-only plus a hard metadata
  filter (level / province / group). Good enough to test faithfulness; not a
  claim that vector-only is sufficient for Phase 1.
