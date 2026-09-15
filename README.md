<div align="center">

# agrilok

**A free, source-cited AI study platform for Nepal's Loksewa agriculture exams — Level 4 (JTA) and Level 7 (Officer).**

[![Status](https://img.shields.io/badge/status-Phase%200%20%C2%B7%20scaffolding-orange)](docs/roadmap.md)
[![CI](https://github.com/ganesh-786/agrilok/actions/workflows/ci.yml/badge.svg)](https://github.com/ganesh-786/agrilok/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Content: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg)](LICENSE-CONTENT)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-Contributor%20Covenant%202.1-purple.svg)](CODE_OF_CONDUCT.md)

</div>

---

> [!WARNING]
> **This repository is scaffolding. There is no working application yet.**
> Phase 0 — a throwaway spike that must prove retrieval-grounded answers are
> actually faithful to real past papers — has not been completed. Production
> code does not begin until the [go/no-go gate](docs/roadmap.md#gono-go-gate)
> is signed off. Do not study from anything here yet.

---

## Why this exists

A Loksewa vacancy for a specific agriculture post and province can be **years**
apart. A candidate who memorises a wrong fact from an unverified Facebook post
or a confidently-wrong chatbot does not lose a few marks — they can lose an
entire cycle. That puts the accuracy bar far above ordinary consumer chat.

Three concrete problems this project targets:

1. **Source fragmentation.** There is no single place to get the current,
   correct syllabus and past papers for your exact post *and* province. Nepal
   has a federal Public Service Commission plus **seven separate provincial
   PSCs**, each publishing its own curriculum PDFs for nominally the same post.
2. **Level 4 and Level 7 are treated as one blob.** Generic platforms feed
   diploma-level JTA candidates officer-level policy content meant for
   degree-holders, and the reverse. Study time spent at the wrong depth is a
   real and fixable waste.
3. **Unverifiable answers.** AI study tools for Loksewa already exist. What does
   not exist is one that is agriculture-specific at *both* levels, sustainably
   free rather than a three-question trial, and **able to show you the
   government document each answer came from.**

That intersection is the whole product. Full problem analysis and competitive
landscape: [docs/product-brief.md](docs/product-brief.md).

## The one rule

> **The AI never answers from what it thinks it knows.**

Every answer is generated *only* from retrieved text that was crawled from a
whitelisted official source, extracted, human-reviewed, and stored with its
provenance. Every answer shows a resolvable link back to the original
government document and the date it was fetched.

This is not a stylistic preference. Gemini measurably underperforms in Nepali
compared with English on public benchmarks, and Devanagari OCR on low-quality
government scans degrades badly. The model's own recall is therefore not
trustworthy enough to study from — retrieval is what makes it safe. Recorded as
[ADR-0003](docs/adr/0003-retrieval-grounded-answers-only.md).

Student-facing content carries exactly one of two visible states, never blurred:

| State | Meaning |
|---|---|
| **Verified** | A human checked it against the cited source on a stated date. |
| **AI-assisted, pending review** | Generated and retrievable, not yet human-checked. |

## Architecture

```
OFFICIAL SOURCES  (whitelist only - data/sources/whitelist.yml)
psc.gov.np | 7 provincial PSCs | narc.gov.np | agriculture ministry | Nepal Gazette
      |
      |  scheduled, polite crawl - robots.txt respected, rate-limited, identified
      v
  CRAWLER  (Scrapy)                                     services/crawler/
      |
      v
  RAW ARCHIVE  - file kept as-is + source URL + fetch date + checksum
      |           so we can always prove "this is exactly what was published"
      v
  EXTRACTION  - PDF text layer first -> OCR only when there is no text layer
      |           every extraction carries a confidence score        [ADR-0002]
      v
  CLEAN + TAG  - dedupe, strip boilerplate, tag {level, group, province, year}
      |
      v
  HUMAN REVIEW QUEUE  - low-confidence or new-source docs are checked by a
      |                  person BEFORE they may answer a student's question
      v
  CHUNK  (~400 tokens, 15% overlap, section headers kept as metadata)
      |
      v
  EMBED  (gemini-embedding-001)  ->  VECTOR STORE  (pgvector in Postgres)
      |
      v
  RETRIEVE  - hybrid keyword + vector, filtered by level / group / province
      |
      v
  PROMPT ASSEMBLY  - retrieved text is fenced as DATA, never as instructions
      |                                                              [ADR-0005]
      v
  GEMINI  (Flash tier, free)  - answers only from the retrieved text
      |
      v
  STUDENT  - the answer + a link to the original government document
```

Two constraints shape everything above:

- **Free-tier survival is structural, not a patch.** Exam questions repeat
  heavily across thousands of students. Topic explanations are **pre-generated
  once and cached**, and near-duplicate questions reuse a cached answer, so one
  API call serves many students. Live calls are reserved for genuinely novel
  questions. [ADR-0004](docs/adr/0004-cache-first-serving.md).
- **Rural-first delivery.** Most of Nepal's population is rural with
  inconsistent bandwidth. The web app is a PWA: text-first, small payloads,
  downloadable offline topic packs.

Full detail: [docs/architecture.md](docs/architecture.md).

## Repository layout

```
agrilok/
├── .github/              PR/issue templates, CI, scheduled crawl, CODEOWNERS
├── .githooks/            blocks pushes to main, checks commit messages
├── apps/
│   ├── web/              Next.js PWA - student-facing
│   └── api/              FastAPI - retrieval, generation, quota governor
├── services/
│   ├── crawler/          Scrapy spiders, one per source domain
│   ├── ingestion/        extract -> clean -> tag -> review -> chunk -> embed
│   └── evaluation/       RAGAS-style golden-set harness            [ADR-0006]
├── infra/                DB migrations (incl. pgvector), seed data
├── data/
│   ├── sources/          whitelist.yml - the trusted-source registry
│   ├── golden-set/       real past-paper Q&A used to measure faithfulness
│   ├── raw/              fetched originals (gitignored, reproducible)
│   └── derived/          extracted/chunked artifacts (gitignored)
├── docs/                 architecture, ADRs, governance, policy, runbooks
├── scripts/              developer and operations scripts
└── tests/                cross-cutting integration tests
```

Every directory has its own `README.md` stating what belongs there and what
does not.

## Quick start

> Nothing is implemented yet, so these steps set up the *environment*, not a
> running app. They grow as Phase 1 lands.

**Prerequisites:** Node 20.18 (`.nvmrc`), Python 3.12 (`.python-version`),
PostgreSQL 15+ with the `pgvector` extension, and a free
[Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/ganesh-786/agrilok.git
cd agrilok
cp .env.example .env     # then fill in GEMINI_API_KEY and DATABASE_URL
```

Read these three before writing any code:

1. [docs/architecture.md](docs/architecture.md) — how the pieces fit
2. [docs/data-governance.md](docs/data-governance.md) — what may be ingested and published
3. [CONTRIBUTING.md](CONTRIBUTING.md) — workflow, review bar, commit format

## Roadmap

| Phase | What ships | Gate |
|---|---|---|
| **0 — Validation spike** | ~20–30 real syllabus/past-paper PDFs collected by hand; throwaway RAG notebook; faithfulness checked by hand on ≥20 real questions | **Do not build the crawler until this passes.** Weak faithfulness here means fix the approach, not ship anyway. |
| **1 — MVP** | Crawler for federal PSC + NARC + 2 provinces; ingestion with human review queue; syllabus browser; Ask-AI with mandatory citations; Level 4 / Level 7 separated at the schema level | Golden-set faithfulness meets the threshold in [docs/evaluation.md](docs/evaluation.md) |
| **2 — V1** | Mock tests in real paper format (objective both levels, subjective feedback for L7); spaced repetition; agriculture current-affairs digest (human-reviewed); offline PWA packs | |
| **3 — V2** | All 7 provinces; community error flagging with review; public evaluation dashboard; sustainability that never paywalls core content | |

Detail and the full gate: [docs/roadmap.md](docs/roadmap.md).

## Contributing

Contributions are welcome, and **content review is as valuable as code** — if
you have sat these exams, your eyes on the review queue are worth more than
another pull request. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the
[good first issues](https://github.com/ganesh-786/agrilok/labels/good%20first%20issue).

Non-negotiables for any change touching student-facing content:

- It cites a whitelisted official source, with a fetch date.
- It does not republish a government document wholesale.
- It does not mark unreviewed content as verified.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities
privately via [SECURITY.md](SECURITY.md).

## Licensing

This repository is deliberately **dual-licensed**, because it holds three
different kinds of material:

| Material | License |
|---|---|
| Source code, config, tooling | [MIT](LICENSE) |
| Documentation, study content, curated datasets | [CC BY-SA 4.0](LICENSE-CONTENT) |
| Government documents it ingests | **Not ours to license** — see [NOTICE](NOTICE) |

ShareAlike on the content is deliberate: this material exists so aspirants can
study for free, and derivatives should stay free too.

**[NOTICE](NOTICE) is required reading before you fork or redistribute.** It
sets out the fair-dealing rules this project binds itself to under Nepal's
Copyright Act, 2059 — summarize and cite, always link back, never republish in
full, honour takedowns immediately.

## Accuracy disclaimer

agrilok is **not affiliated with or endorsed by** the Public Service Commission
of Nepal, any Provincial Public Service Commission, or any ministry of the
Government of Nepal. Curricula, vacancy notices and the ministries themselves
change — the ministry responsible for agriculture policy was restructured in
2026, and syllabi are revised without warning.

**The official notice always governs. Verify before you rely on anything here.**
