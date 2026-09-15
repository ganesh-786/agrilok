# Contributing to agrilok

Thank you for considering a contribution. This project exists so that Loksewa
agriculture aspirants can study for free from material they can actually
verify. That mission sets the review bar, and this document explains it.

**Content review is as valuable as code here.** If you have sat the Level 4
(JTA) or Level 7 (Officer) exam, your eyes on the review queue are worth more
to this project than another pull request.

---

## Table of contents

- [Ground rules](#ground-rules)
- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Branching and commits](#branching-and-commits)
- [Pull requests](#pull-requests)
- [The content review bar](#the-content-review-bar)
- [Adding a new source](#adding-a-new-source)
- [Changing the retrieval pipeline](#changing-the-retrieval-pipeline)
- [Architecture decisions](#architecture-decisions)
- [Code style](#code-style)
- [What we will not merge](#what-we-will-not-merge)

---

## Ground rules

1. **Everything student-facing cites a source.** No exceptions, no "this is
   obviously true", no "the model knows this". See [the one rule](README.md#the-one-rule).
2. **Never mark unreviewed content as verified.** The two states are
   `verified` and `ai_assisted_pending_review`. Blurring them destroys the only
   thing that differentiates this project.
3. **Never republish a government document wholesale.** Summarize, quote what
   the question needs, and link back. The fair-dealing boundary this project
   operates inside is set out in [NOTICE](NOTICE) and
   [docs/data-governance.md](docs/data-governance.md).
4. **Level 4 and Level 7 stay separate.** They are different exams for
   different qualifications. Do not let content leak between them, at any layer
   from schema to UI.
5. **Secrets stay server-side.** The Gemini API key never reaches
   `apps/web` client code, a commit, a log line, or an error report.
6. **No personal data into the model.** Free-tier Gemini content may be used by
   the provider to improve its products and may be seen by human reviewers. Public
   syllabus text is fine; a student's name, phone number or email is not.

Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

| You want to | Start here |
|---|---|
| Report a wrong fact in study content | Open a **Content error** issue — this is the highest-value report we get |
| Suggest an official source we are missing | Open a **Source request** issue |
| Review queued content against its source | Comment on the review issue; see [the content review bar](#the-content-review-bar) |
| Fix a bug | Open a **Bug report**, then a PR |
| Propose a feature | Open a **Feature request** first — please do not build it blind |
| Improve docs | Straight to a PR |
| Add past-paper questions to the golden set | See [data/golden-set/README.md](data/golden-set/README.md) |

Good entry points are labelled
[good first issue](https://github.com/ganesh-786/agrilok/labels/good%20first%20issue)
and [help wanted](https://github.com/ganesh-786/agrilok/labels/help%20wanted).

## Development setup

**Prerequisites:** Node 20.18 (see `.nvmrc`), Python 3.12 (see
`.python-version`), PostgreSQL 15+ with `pgvector`, and a free
[Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/ganesh-786/agrilok.git
cd agrilok
cp .env.example .env    # fill in GEMINI_API_KEY and DATABASE_URL
```

Per-component setup lives in each component's README:
[apps/web](apps/web/README.md), [apps/api](apps/api/README.md),
[services/crawler](services/crawler/README.md),
[services/ingestion](services/ingestion/README.md),
[services/evaluation](services/evaluation/README.md).

> The project is at Phase 0. Most components are directory stubs. If the setup
> steps for the part you want to work on do not exist yet, say so in your issue
> — writing them is itself a welcome contribution.

## Branching and commits

**Never push to `main`, and never commit on it.** Every change goes through a
branch and a pull request. Never force push.

Enable the hooks once per clone so this is enforced and not just stated:

```bash
git config core.hooksPath .githooks
```

See [.githooks/README.md](.githooks/README.md).

Branch off `main`:

```
feat/<short-slug>      new capability
fix/<short-slug>       bug fix
docs/<short-slug>      documentation only
chore/<short-slug>     tooling, deps, CI
data/<short-slug>      source whitelist, golden set, content
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

feat(api): add province filter to retrieval
fix(ingestion): fall back to OCR when text layer is empty
docs(adr): record the cache-first serving decision
data(sources): add Gandaki PSC curriculum index
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `data`, `ci`.
Scopes: `web`, `api`, `crawler`, `ingestion`, `eval`, `infra`, `sources`,
`content`, `adr`, `claude`.

Breaking changes get a `!` (`feat(api)!: ...`) and a `BREAKING CHANGE:` footer.

**No AI or tool attribution in a commit message.** No co-author line naming a
model or assistant, no generated-with note, no mention of an assistant. The
author of a commit is the person who owns the change.

**No `--` and no long dashes in a commit message.** Use a comma, a full stop, or
split the sentence. Command line flags inside a fenced block are fine.

## Pull requests

Four sections, nothing else. See
[the template](.github/PULL_REQUEST_TEMPLATE.md).

```
## Topic              one line, which part of the system this touches
## What it solves     two or three plain sentences on the problem
## How it solves it   bullet points, one idea per bullet
## What changes       an ASCII diagram of the flow before and after
```

Write it the way you would explain the change to a teammate at their desk. Plain
sentences, no marketing voice. No AI attribution. No `--` and no long dashes.

Before you open it:

1. Open or link an issue first for anything beyond a typo.
2. Keep it small and single-purpose. A PR that changes retrieval *and* redesigns
   the UI will be asked to split.
3. CI must pass.
4. Work the list below before anyone else reads it.

Review turnaround is best-effort; this is a volunteer project.

### What a reviewer checks

The PR body stays short, so these live in the review conversation rather than as
boxes in the template. They still gate the merge, and an honest "not done yet"
is always better than a claim that does not hold.

**Anything, always**

- No secret, API key or credential in the diff, including examples, fixtures,
  test data and comments.
- No personally identifiable data added to any prompt, log, fixture or error
  report.
- Docs updated if behaviour changed. `CHANGELOG.md` updated if the change is
  user-visible, and a corrected fact is user-visible.

**Student-facing content**

- Every claim cites a source on [`data/sources/whitelist.yml`](data/sources/whitelist.yml).
- Each citation resolves and points at the original official document, not a
  blog or aggregator.
- The fetch or verification date is recorded.
- Exam level, service group and province tags are correct, and Level 4 and
  Level 7 content does not leak across.
- The source is current, not a superseded syllabus.
- Nothing is republished wholesale, per [NOTICE](NOTICE).
- Nothing is marked `verified` that a human has not checked against its source.
  Say who reviewed it and when.

**Retrieval, chunking, embeddings or prompts**

- Golden-set numbers before and after: faithfulness, answer relevancy, context
  precision, context recall.
- **Faithfulness did not drop.** A drop is a blocking bug, not a trade-off.
- Retrieved content is still fenced as untrusted data.
- The system still refuses rather than answering from model memory when
  retrieval returns nothing relevant.
- Citations are still emitted and still resolve.

**Crawler or sources**

- The domain is whitelisted and owner-approved.
- `robots.txt` still permits those paths, with the date checked.
- Rate limiting and crawl delay are unchanged or more conservative.
- The identifying user-agent and contact address are intact.
- Raw fetches keep source URL, fetch date and checksum.

**Quota or caching**

- States the effect on daily Gemini request volume.
- No new per-student live call on a path that could be served from a
  pre-generated or cached answer.
- Quota exhaustion degrades visibly, not silently.

**Database or migrations**

- Forward-only and single-concern.
- Level 4 and Level 7 separation preserved at the schema level.
- Provenance columns are not weakened or made nullable.
- Rollback plan stated, or explicitly not required and why.

## The content review bar

When you review a piece of queued content, you are asserting that a student can
rely on it. Check, in order:

- [ ] The cited source is on the whitelist in [data/sources/whitelist.yml](data/sources/whitelist.yml).
- [ ] The citation link resolves, and it points at the *original* official
      document rather than a blog or aggregator.
- [ ] The content actually says what the source says. If the extraction came
      from OCR, compare against the source PDF directly — Devanagari OCR
      misreads are the single most likely way a wrong fact enters this system.
- [ ] The exam level tag is right (Level 4 vs Level 7), as is the service group
      and province.
- [ ] The source is current. A superseded syllabus is worse than no syllabus.
      Record the date you verified it.
- [ ] Nothing has been republished wholesale.

If any check fails, send it back rather than fixing it silently — the failure
mode is usually systematic and worth a pipeline fix.

## Adding a new source

Sources are not added casually. Each one is a trust commitment to students.

1. Open a **Source request** issue with the domain, what it publishes, and why
   it is authoritative.
2. Confirm `https://<domain>/robots.txt` permits crawling of the paths we want,
   and paste what it currently says into the issue.
3. Check the site's terms of use for anything that overrides robots.txt.
4. The [source whitelist owner](docs/data-governance.md#roles) approves or
   declines. The whitelist has a single named owner precisely so it cannot
   quietly grow to include unreliable sites.
5. On approval, add the entry to `data/sources/whitelist.yml` with its rate
   limit, the robots.txt check date, and the approving owner.

Never crawl a domain that is not in that file.

## Changing the retrieval pipeline

Retrieval is where RAG systems fail most often, so changes to chunking,
embeddings, retrieval parameters, reranking or prompt assembly carry an extra
requirement:

1. Run the golden set before your change. Record the numbers.
2. Make the change.
3. Run it again. Put both sets of numbers in the PR.
4. **A drop in faithfulness is a blocking bug, not a trade-off.** Answer
   relevancy and latency may be traded; faithfulness may not.

See [docs/evaluation.md](docs/evaluation.md) for thresholds and how to run the
harness.

## Architecture decisions

Anything that would be expensive to reverse — a datastore, a model, a
cross-cutting pattern, a policy — gets an ADR in [docs/adr/](docs/adr/). Copy
[docs/adr/template.md](docs/adr/template.md), number it sequentially, and open
it as its own PR so the decision can be debated separately from the code.

## Code style

| Area | Tooling |
|---|---|
| Python | `ruff` (lint + format), `mypy` for type checking, 100-col lines |
| TypeScript | `eslint` + `prettier`, strict `tsconfig` |
| SQL migrations | forward-only, one concern per migration, reversible where practical |
| Everything | `.editorconfig` is authoritative for whitespace |

Write comments that explain *why*, not *what*. This codebase has genuinely
non-obvious constraints — free-tier quotas, Devanagari OCR behaviour, fair-dealing
limits — and those deserve a comment. Restating the code does not.

## What we will not merge

- Content that cannot name its source.
- A crawler change that ignores `robots.txt`, removes the rate limit, or strips
  the identifying user-agent.
- Anything that sends personal data to a third-party model.
- A hardcoded API key, even in an example.
- Auto-publishing scraped or generated content straight to students with no
  review step. This defeats the entire premise of the project.
- A feature that paywalls core study content.
