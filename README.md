<div align="center">

# agrilok

**A free, source-cited study platform for Nepal's Loksewa agriculture exams.**

Study for Level 4 (JTA) and Level 7 (Officer) exams using official documents,
clear citations, and content that is reviewed before it is treated as trusted.

[![Status](https://img.shields.io/badge/status-Phase%201%20MVP%20under%20test-orange)](docs/roadmap.md)
[![CI](https://github.com/ganesh-786/agrilok/actions/workflows/ci.yml/badge.svg)](https://github.com/ganesh-786/agrilok/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Content: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg)](LICENSE-CONTENT)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-Contributor%20Covenant%202.1-purple.svg)](CODE_OF_CONDUCT.md)

</div>

> [!WARNING]
> **agrilok is in Phase 1 MVP testing and is not deployed.** It currently runs
> locally against the Phase 0 document set. Some documents are still waiting
> for human review, and the Level 7 evaluation gate is still open. Always
> check the cited government document before relying on study material.

## What agrilok does

Loksewa agriculture study material is spread across federal and provincial
government websites. The same post can have different curricula by province,
and Level 4 and Level 7 candidates need different depth and exam formats.

agrilok brings that material together in a text-first, rural-friendly web app.
It is designed to help students:

- browse agriculture syllabi and reference documents by exam level;
- search the available source material without spending model quota;
- ask questions and receive answers with numbered citations;
- read prepared answers from a cache when a question has already been covered;
- save a level for offline reading; and
- use Nepali first, with English available when needed.

The project is not affiliated with the Public Service Commission of Nepal,
any Provincial Public Service Commission, or the Government of Nepal.

## The trust model

The central rule is simple:

> **The AI never answers from what it thinks it knows.**

Student-facing answers are built from retrieved text with recorded provenance.
The source must come from the approved whitelist, and every answer must link
back to the original document and its fetch date. When the available material
does not support an answer, the system is designed to say so.

Content also carries an explicit review state:

| State | Meaning |
| --- | --- |
| **Verified** | A person checked the content against the cited source on a stated date. |
| **AI-assisted, pending review** | The content is available for review but has not yet been human-checked. |

The review state is never hidden or silently changed. Level 4 and Level 7
content stays separate from the database schema through to the user interface.

## Current status

Phase 1 MVP work is running locally. The project currently includes:

- a FastAPI API and Next.js PWA;
- a syllabus library, keyword search, cited Ask flow, and saved answers;
- a cache-first quota governor for the Gemini API;
- ingestion with a human admission gate before content becomes retrievable;
- a crawler restricted to approved sources and dry-run by default; and
- a golden-set evaluation harness that runs through the same pipeline as the
  student-facing flow.

The project is not production-ready yet. Before Phase 1 can exit, the team
still needs to close the remaining evaluation gaps, complete the Level 7
golden-set evidence, establish the operational capacity plan, admit and review
the initial content, and choose a hosting and monitoring setup. The current
record is maintained in the [roadmap](docs/roadmap.md).

## How the system works

```text
Approved government sources
        |
        v
Crawler: polite, rate-limited, robots.txt compliant
        |
        v
Raw archive: original file, URL, fetch date, checksum
        |
        v
Extraction: text layer first; scanned PDFs are flagged for OCR work
        |
        v
Clean, tag, and review: level, group, province, year, review state
        |
        v
Chunk and embed: pgvector in PostgreSQL
        |
        v
Retrieve: keyword and vector search with level filters
        |
        v
Generate: answer only from retrieved text, with a support check
        |
        v
Student: answer, review state, and link to the original source
```

Several safeguards are built into this flow:

- **Provenance is preserved.** Source URL, fetch date, checksum, and review
  details travel with the material so a citation can be checked.
- **Retrieved documents are treated as data.** Instructions inside a source
  document are never treated as instructions for the model.
- **Caching protects the free tier.** Repeated questions use prepared answers
  where possible, leaving live model calls for genuinely new questions.
- **Faithfulness is a release gate.** A regression in the golden set blocks a
  change until it is understood and fixed.
- **Privacy is limited by design.** Secrets remain server-side, and personal
  information must not be sent to the model.

More detail is available in the [architecture](docs/architecture.md) and the
architecture decision records in [docs/adr](docs/adr/README.md).

## Repository layout

```text
agrilok/
|-- apps/
|   |-- web/              Next.js PWA for students
|   `-- api/              FastAPI HTTP layer
|-- packages/
|   `-- core/             Retrieval, generation, support checks, quota, cache
|-- services/
|   |-- crawler/          Whitelisted source fetching
|   |-- ingestion/        Extract, clean, review, chunk, embed
|   `-- evaluation/       Golden-set evaluation and release gate
|-- infra/                PostgreSQL and pgvector migrations and seed data
|-- data/
|   |-- sources/          Approved source registry
|   |-- golden-set/       Questions used to measure faithfulness
|   |-- raw/              Fetched originals, gitignored
|   `-- derived/          Generated artifacts, gitignored
|-- docs/                 Architecture, policy, runbooks, and ADRs
|-- scripts/              Developer and operations scripts
`-- tests/                Cross-cutting integration tests
```

Each major directory has its own README with local guidance.

## Quick start

### Prerequisites

- [uv](https://docs.astral.sh/uv/) for the Python workspace;
- Python 3.12, pinned by `.python-version`;
- Node 24, pinned by `.nvmrc`; and
- a [Gemini API key](https://aistudio.google.com/apikey) for live answers and
  embeddings.

PostgreSQL with pgvector is provided through the local development database
command. You do not need to install PostgreSQL separately.

### Install and prepare the local environment

```bash
git clone https://github.com/ganesh-786/agrilok.git
cd agrilok
cp .env.example .env                  # PowerShell: Copy-Item .env.example .env
uv sync --all-packages --all-extras
uv run agrilok-db start
uv run agrilok-db migrate
uv run agrilok-ingest import-phase0   # imports the corpus into the review queue
```

Nothing becomes retrievable until it is admitted by a named reviewer. To
prepare eligible local content for a personal development run:

```bash
uv run agrilok-ingest review admit --all-eligible --by @you --self-review --yes
uv run agrilok-ingest embed --yes
```

Start the API and web app together:

```bash
node scripts/dev.mjs
```

The web app is available at `http://localhost:3000` and the API health check is
available at `http://127.0.0.1:8000/v1/health`. Without a Gemini key, the
library and search still work, but live answers are disabled.

For component-specific commands and configuration, see:

- [apps/web](apps/web/README.md)
- [apps/api](apps/api/README.md)
- [services/crawler](services/crawler/README.md)
- [services/ingestion](services/ingestion/README.md)
- [services/evaluation](services/evaluation/README.md)
- [infra](infra/README.md)

## Testing and evaluation

Before opening a pull request, run the checks for every component you touched.
The standard Python checks are:

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy .
uv run pytest -q
```

For the web app:

```bash
cd apps/web
npm install
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
```

Changes to retrieval, ingestion, chunking, generation, or support checks must
also run the golden set. It is the project's safety bar, not an optional
benchmark:

```bash
uv run python -m evaluation.run \
  --report services/evaluation/reports/summary.json \
  --markdown services/evaluation/reports/summary.md
uv run python -m evaluation.gate \
  --report services/evaluation/reports/summary.json
```

Read [docs/evaluation.md](docs/evaluation.md) before interpreting a result.
A green automated gate shows that known machine-checkable behaviour did not
regress. It does not replace a person reading the cited sources.

## Contributing

Contributions are welcome. Content review is especially valuable: someone who
understands the Level 4 or Level 7 exam can improve the project in ways that a
code-only contribution cannot.

Please start with [CONTRIBUTING.md](CONTRIBUTING.md). In particular:

- cite an approved official source for student-facing content;
- never mark unreviewed content as verified;
- never republish a government document wholesale;
- keep Level 4 and Level 7 content separate; and
- keep secrets and personal information out of client code, logs, commits, and
  model prompts.

Report security vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Licensing and source material

| Material | License or status |
| --- | --- |
| Source code, configuration, and tooling | [MIT](LICENSE) |
| Documentation, study content, and curated datasets | [CC BY-SA 4.0](LICENSE-CONTENT) |
| Government documents collected by the project | Not owned by agrilok; see [NOTICE](NOTICE) |

The project summarizes and cites government material rather than republishing
it in full. Read [NOTICE](NOTICE) and
[docs/data-governance.md](docs/data-governance.md) before adding or sharing
source material.

## Accuracy disclaimer

Government notices, curricula, vacancies, and policies can change. The latest
official notice always takes priority over anything in agrilok. Verify the
source and publication date before using material for exam preparation.
