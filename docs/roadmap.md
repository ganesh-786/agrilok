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
      **Not yet.** A throwaway spike (deleted once this gate resolves; see
      [ADR-0003](adr/0003-retrieval-grounded-answers-only.md) and
      [docs/evaluation.md](evaluation.md#phase-0)) ran 13 hand-written smoke
      test questions, not real past-paper ones, against a real 18-document
      corpus and a live model, read by hand against the actual cited text.
      Zero fabrications across 13 questions - a genuinely encouraging signal,
      not gate evidence. Two findings recorded in
      [docs/evaluation.md](evaluation.md#phase-0) either way. Still needed:
      the same review against real past-paper questions.
- [ ] Current, **in-force** syllabus PDFs confirmed for both levels - verified
      against the freshest official notice, not a third-party blog or summary.
      Syllabi get revised; anything cited during research needs a fresh check.
- [ ] Free-tier capacity math redone with **real pilot numbers** once a waitlist
      exists. A back-of-envelope estimate is not a plan.
- [ ] Content review workflow **decided before the crawler goes live**.
      Publishing unreviewed scraped content straight to students defeats the
      entire trust premise of the project.
- [ ] **One person named** as owner of the trusted-source whitelist, so it
      cannot silently grow to include unreliable sites.

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
