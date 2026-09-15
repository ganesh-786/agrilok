# Architecture

> Status: design, not implementation. Phase 0 has not been cleared - see
> [roadmap.md](roadmap.md). Everything below is the intended shape; deviations
> discovered during the spike should update this document.

## The shape of the system

```
whitelisted sources -> crawler -> raw archive -> extraction -> clean + tag
   -> HUMAN REVIEW -> chunk -> embed -> pgvector
   -> hybrid retrieval -> prompt assembly -> Gemini -> answer + citation
```

Stage contracts are in
[docs/rag-pipeline.md](rag-pipeline.md), which is
the normative version. This document explains *why* the shape is what it is.

## Why this shape

### The AI does not know things; it reads things

Answers come only from retrieved, reviewed source text. Two reasons, and both
are measured rather than assumed:

1. **Stakes.** A vacancy for a given post and province can be years apart. A
   wrong memorised fact can cost a cycle.
2. **Model limits in Nepali.** Gemini measurably underperforms in Nepali versus
   English on public benchmarks. Its parametric knowledge is not a trustworthy
   base for study material.

Recorded as [ADR-0003](adr/0003-retrieval-grounded-answers-only.md).

### Provenance is structural, not decorative

Every fetched file is kept **as published**, with source URL, fetch timestamp
and checksum, so the project can always demonstrate "this is exactly what the
government published on this date". Every chunk carries that provenance forward,
and every answer surfaces it to the student.

This is what lets a student check us. Without it the product is just another
chatbot asking to be trusted.

### Human review sits in the path, not beside it

Low-confidence extractions and any document from a newly-added source go to a
review queue **before** they are allowed to answer anything. Content carries
exactly one of two visible states - `verified` or
`ai_assisted_pending_review` - and they are never blurred.

Auto-publishing scraped or generated content straight to students would defeat
the premise of the project, so the pipeline is built so that it cannot happen by
omission.

### Extraction reads before it guesses

Parse the PDF's existing text layer first; use OCR only when there is genuinely
no text layer. Devanagari OCR on poor scans degrades badly, and government
archives are full of old scans. Every extraction carries a confidence score, and
low confidence routes to review.
[ADR-0002](adr/0002-text-layer-before-ocr.md).

### Retrieval is hybrid because the queries are multilingual

Students search in Nepali, in English, and in romanised Nepali. Vector-only
search misses exact terms - document numbers, act names, scientific names -
while keyword-only search misses paraphrase. Retrieval combines both and then
filters hard on `exam_level`, `service_group` and `province`.

Level is a **filter**, not a display hint: officer-level policy content is the
wrong depth for a JTA candidate, and the reverse.

### Retrieved text is data, never instruction

Crawled content enters a model context. Text inside a document that reads like
an instruction is never followed. Risk is low on government domains today and
rises the moment the whitelist widens, so the defence is built in from the
start. [ADR-0005](adr/0005-untrusted-retrieved-context.md).

### The free tier is survived by caching, not by luck

Exam preparation is unusually repetitive: thousands of students ask
near-identical questions about a fixed syllabus. Topic explanations are
pre-generated once and served to everyone; near-duplicate questions reuse a
cached answer; live calls are reserved for genuinely novel questions.

Before any new feature adds a per-student live model call, it must be shown that
the work cannot be pre-generated.
[ADR-0004](adr/0004-cache-first-serving.md).

### Delivery assumes a phone on a bad connection

Most of Nepal's population is rural, with inconsistent usable bandwidth. The web
app is a PWA: text-first, small payloads, minimal images, downloadable offline
topic packs. A heavy always-online app would underserve exactly the students who
need this most.

## Components

| Component | Responsibility |
|---|---|
| `services/crawler` | Fetch whitelisted sources politely; detect change; never publish |
| `services/ingestion` | Extract, score confidence, clean, tag, queue for review, chunk, embed |
| `services/evaluation` | Golden-set harness and the faithfulness gate |
| `apps/api` | Retrieval, prompt assembly, generation, quota governor, citations |
| `apps/web` | Student-facing PWA |
| `infra` | Postgres + pgvector schema and migrations |

## Data model essentials

Every chunk carries: `source_id`, `source_url`, `fetched_at`, `checksum`,
`exam_level`, `service_group`, `province`, `year`, `doc_type`,
`extraction_method`, `extraction_confidence`, `review_state`, `reviewed_by`,
`reviewed_at`, `section_heading`, `chunk_index`.

These are not optional columns. Retrieval filtering, citation rendering, staleness
detection and the review workflow all depend on them, so migrations must not
weaken them or make them nullable.

## Technology choices

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js + Tailwind, as a PWA | Offline caching, small payloads, wide ecosystem |
| Backend | Python + FastAPI | Same language as crawler, ingestion and evaluation - one small team maintains it end to end |
| Crawler | Scrapy | Mature, efficient on mostly-static sites, honours robots.txt natively |
| Extraction | Text-layer parser first, Tesseract (`nep+eng`) as fallback | Matches the measured behaviour on Devanagari PDFs |
| Database | PostgreSQL | One system for relational data and vectors |
| Vector search | pgvector, in the same Postgres | No separate paid service at this corpus size |
| Generation | Gemini Flash tier | Free, multilingual, large context |
| Embeddings | `gemini-embedding-001` | Nepali support, same account and quota accounting |
| Cache | Redis, or a Postgres cache table | Essential to surviving free-tier limits |
| Observability | Sentry + structured logs | Cache hit rate and quota burn must be measured, not assumed |

## What is deliberately not here

- No microservice split. One small team, one deployment boundary per app.
- No separate vector database. pgvector is sufficient at this scale, and a second
  datastore is a second thing to keep consistent.
- No user-generated content published without review.
- No paywall on core study content.
