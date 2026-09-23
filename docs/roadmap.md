# Roadmap

## Where the project is now

**Phase 0 - validation spike. Not started.**

There is no application code. The repository is scaffolding: structure,
governance, agent context and CI. The gate below has **not** been cleared, and
production pipeline code does not begin until it is.

---

## Phase 0 - validation spike (1-2 weeks)

**Do not build the crawler yet.** This phase exists to find out whether the core
idea works before any infrastructure is written.

1. Collect **by hand** 20-30 real official documents: current Level 4 (JTA) and
   Level 7 (Agriculture / Veterinary Officer) syllabi, federal plus at least two
   provinces.
2. Build a **throwaway** RAG prototype against the free Gemini API. A notebook
   is fine. It is meant to be deleted.
3. Test it against at least 20 real past-paper questions and check faithfulness
   **by hand** - does each answer actually follow from the retrieved text?

**If faithfulness is weak even with good retrieval, that is a signal to fix the
approach, not a reason to ship and hope.** That is the entire point of doing
this before the crawler.

## Go/no-go gate

Production code does not start until every box is genuinely ticked, with
evidence.

- [ ] Phase 0 spike completed, faithfulness manually checked against **at least
      20** real past-paper questions.
      **Numeric target met; gate not clear.** A throwaway spike (deleted
      once this gate resolves; see
      [ADR-0003](adr/0003-retrieval-grounded-answers-only.md) and
      [docs/evaluation.md](evaluation.md#phase-0)) first ran 13 hand-written
      smoke tests twice (18, then 40 documents), zero fabrications, and fixed
      one real failure mode plus a citation-extraction bug in the harness.
      It then ran 20 real past-paper questions (Koshi Province, Level 4,
      Agriculture Extension, corroborated against a live PSC exam-result
      notice - see [docs/evaluation.md](evaluation.md#phase-0) for exactly
      what that corroboration does and does not establish) for the first
      time. 18 of 20 correctly refuse, and one answer is confirmed faithful.
      **One, `PP-01`, is a confirmed fabrication**: a wrong answer built by
      combining two unrelated adjacent syllabus headings, cited as if they
      supported it, checked against the real exam's own marked correct
      answer. Investigated to a root cause, not just patched: fixing a
      dropped ADR-0003 instruction and restructuring the prompt fixed a
      second, related case (`PP-17`) outright, but `PP-01` itself held even
      under the corrected prompt on `gemini-3.1-flash-lite` specifically -
      confirmed a model-capability ceiling, not a prompt gap, by sending the
      identical prompt and context to two other models in the same family,
      both of which correctly refused. Per [CLAUDE.md](../CLAUDE.md),
      faithfulness never regresses - a drop is a blocking bug, not a
      trade-off, and hitting the count of questions the gate names does not
      override a confirmed failure sitting inside that count. Still needed: a
      real Level 7 past paper (this batch is Level 4 only) and a named
      decision on generation model tier
      ([ADR-0008](adr/0008-generation-model-tier.md), Proposed) before this
      box is checked. Two compiled Officer-level MCQ sets (about 100
      questions) were reviewed and do **not** meet the bar for a real
      past-paper entry: one is a coaching institute's retyped set whose
      claimed federal sitting could not be corroborated, the other has no
      source at all and an answer key that contradicts its own note. They
      are kept in a separate unverified tier that is never counted here.
- [ ] Current, **in-force** syllabus PDFs confirmed for both levels - verified
      against the freshest official notice, not a third-party blog or summary.
      Syllabi get revised; anything cited during research needs a fresh check.
      **Not confirmed, one new piece of evidence.** The most recent federal
      Level 7 syllabus found is FED-09 (effective 2082/07/20). A 2083/05/20
      Officer paper (unverified) matches its format (100 one-mark MCQs,
      1h30m), and about 15 questions spot-checked against it map to FED-09's
      technical headings, which is consistent with FED-09 being in force. It
      is not proof: the paper's header uses the term "एकीकृत" (integrated
      group) that FED-09 does not, and it cites NTIS 2023 where FED-09 lists
      2016. PSC's course list is rendered by JavaScript and cannot be read by
      search, so a person has to browse it for anything dated after
      2082/07/20.
- [ ] Free-tier capacity math redone with **real pilot numbers** once a waitlist
      exists. A back-of-envelope estimate is not a plan.
      **Partial, real data, not yet a plan.** The live AI Studio quota
      dashboard for this account (2026-09-18) shows every full-tier Flash
      model capped at 20 requests per day and both Lite-tier models checked
      at 500 requests per day - a real, structural constraint, not an
      estimate. That is a data point this math needs, not the math itself:
      still no waitlist, no pilot, and no per-feature call budget built from
      it. Embedding has its own limits on the same dashboard (30,000 tokens
      per minute, 1,000 requests per day), and Devanagari chunks are
      token-heavy, so adding a long document is throttled by tokens. See
      [docs/evaluation.md](evaluation.md#phase-0),
      [docs/free-tier-budget.md](free-tier-budget.md) and
      [ADR-0008](adr/0008-generation-model-tier.md).
- [x] Content review workflow **decided before the crawler goes live**.
      Publishing unreviewed scraped content straight to students defeats the
      entire trust premise of the project.
      **Decided 2026-09-23:** [ADR-0009](adr/0009-content-review-workflow.md),
      accepted. One review item per source document, a hard OCR gate before
      scanned text can enter review, and self-review recorded as self-review
      while there is one reviewer. The tooling that opens review items does not
      exist yet; that is Phase 1 work.
- [ ] **One person named** as owner of the trusted-source whitelist, so it
      cannot silently grow to include unreliable sites.
      **Evidence exists; box left for the owner to tick.** @ganesh-786 is
      named as the single whitelist owner in `data/sources/whitelist.yml` and
      in [docs/data-governance.md](data-governance.md#roles). The first
      vetting round (`moald.gov.np`, `lawcommission.gov.np`, `narc.gov.np`)
      returned three "needs a human decision" verdicts, now waiting on that
      owner; see [ADR-0007](adr/0007-primary-reference-documents-in-the-corpus.md).

Check the current state with `/gate`.

---

## Phase 1 - MVP (4-6 weeks)

- Crawler for federal PSC + NARC + one or two provinces.
- Ingestion pipeline with the human review queue actually in the path.
- Web app: syllabus browser; "Ask AI" with **mandatory** citations.
- Level 4 and Level 7 separated from the database schema upward.

**Exit criterion:** golden-set faithfulness meets the threshold in
[evaluation.md](evaluation.md), and the evaluation workflow is a required status
check.

## Phase 2 - V1 (6-8 weeks)

- Mock tests matching the real paper format: objective practice for both levels,
  subjective-answer practice with AI feedback for Level 7.
- Spaced-repetition review queue.
- Agriculture-specific current-affairs digest, auto-summarised from crawled
  policy sources and **human-reviewed before publishing**.
- Offline PWA caching and downloadable topic packs.
- Basic analytics - including cache hit rate and quota burn, which are the
  difference between "free forever" and a surprise bill.

## Phase 3 - V2 (ongoing)

- All seven provinces.
- Community flagging and correction workflow - with review, never auto-publish.
- Public evaluation dashboard tracking metrics over time.
- Sustainability: optional donations. **Core study content is never paywalled.**

---

## Principles that outlast the phases

- Retrieval-grounded answers only. No exceptions bought with convenience.
- Human review before anything is marked verified.
- Faithfulness regressions block merges.
- Free tier survived structurally, through caching, not patched later.
- Built for a phone on intermittent rural bandwidth.
