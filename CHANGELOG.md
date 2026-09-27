# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Because this project ships study content as well as code, changes are recorded
in two groups where relevant:

- **Code** for application, pipeline and tooling changes.
- **Content & sources** for additions or corrections to study material, the
  source whitelist, or the golden set. A corrected fact is a user-visible change
  and belongs here.

## [Unreleased]

### Added
- Repository scaffolding: monorepo layout, dual licensing (MIT for code,
  CC BY-SA 4.0 for content), NOTICE covering government source material.
- Contributor governance: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT.
- GitHub templates for pull requests and for bug, feature, content-error and
  source-request issues; CODEOWNERS; Dependabot.
- CI workflow skeleton, CodeQL analysis, scheduled-crawl workflow scaffold, and
  a golden-set evaluation workflow scaffold.
- Architecture decision records 0001 to 0006 covering the foundational choices.
- Git workflow rules: no pushes to `main`, no AI or tool attribution in commits
  or pull requests, and a fixed four-section pull request format.
- `.githooks/` with `pre-push` and `commit-msg` hooks enforcing those rules
  locally. Enable with `git config core.hooksPath .githooks`.
- The Phase 1 MVP. It runs locally or against hosted Postgres; nothing is
  deployed yet.
  - Schema: eight forward-only migrations on Postgres with pgvector. The
    constraints refuse a third exam level, content marked `verified` without
    a named reviewer, admission without a named person, OCR text admitted
    without a PDF comparison, and an answer without citations.
  - Ingestion (`agrilok-ingest`): imports the Phase 0 corpus as queued and
    recomputes every checksum from the raw PDF. Nothing is retrievable until
    a named person admits it ([ADR-0012](docs/adr/0012-admission-gate-before-serving.md)).
    Rejecting a document withdraws every cached answer that cites it.
  - Retrieval: pgvector similarity plus a BM25 term index in plain Postgres,
    with level, province and service group filtered inside the SQL
    ([ADR-0013](docs/adr/0013-keyword-retrieval-as-a-bm25-term-index.md)).
  - Answers are written only from fenced source text and pass a
    deterministic support check before they are shown
    ([ADR-0008](docs/adr/0008-generation-model-tier.md)). When the sources do
    not support an answer, the student sees an honest refusal.
  - An answer cache, exact and near duplicate, and a quota governor that
    keeps live model calls under a daily ceiling set below the free quota
    ([ADR-0004](docs/adr/0004-cache-first-serving.md)).
  - API (FastAPI): the library, keyword search, and answers with numbered
    citations and fetch dates. Logs carry no question, query string or IP
    address.
  - Web app (Next.js PWA): Nepali first with English one tap away, syllabi
    by level and province, search, cited answers with their review state,
    and offline reading. Enter asks and Shift + Enter starts a new line.
  - Crawler: one polite spider per whitelisted source, robots.txt always
    obeyed, dry run by default. It has never run against a live site.
  - Evaluation: the golden set runs through the same pipeline students use,
    and a gate fails the run on any regression.
  - `node scripts/dev.mjs` starts the API and the web app with one command.
  - Container images for the API and the web app.
- Architecture decision records 0010 to 0013.
- `.env.example` sections for Supabase (hosted Postgres) and Upstash Redis,
  with the setup steps. No code reads the Redis setting yet.

### Changed
- CI builds, lints, type checks and tests every component against a pgvector
  Postgres service. The evaluation workflow runs the golden set when its
  secrets are configured, and warns that a person must check by hand when
  they are not.
- Setup needs uv and Node 24. Postgres comes embedded for development.

### Content & sources
- The golden set moved to `data/golden-set`: 13 pipeline smoke tests, 20 real
  Level 4 past-paper questions and 4 unverified model questions, with a
  baseline of 13 of 13 and 20 of 20 on the gated tiers.
- Common questions to pre-generate answers for, in
  `data/pregenerate/common-questions.yaml`.

### Notes
- Phase 1 is under way; its exit conditions are in
  [docs/roadmap.md](docs/roadmap.md). Open before any student relies on it: an
  answer can say more than the claims the support check verifies, and the
  check cannot match dotted numbers such as section 3.1. No real Level 7 past
  paper is in the golden set yet, and no document is `verified`.

[Unreleased]: https://github.com/ganesh-786/agrilok/commits/main
