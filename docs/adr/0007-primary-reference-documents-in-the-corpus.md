# ADR-0007: Add primary reference documents to the corpus, in stages

- **Status:** Accepted (2026-09-23)
- **Date:** 2026-09-19
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none. Answers the open question in
  `spike/reports/syllabus-scope-finding.md`.

## Context

A syllabus names topics. It does not teach them. The Phase 0 spike measured what
that means in practice:

- Of 20 real Level 4 past-paper questions, 18 correctly refuse, because the
  facts they test (years, percentages, varieties, named regulations) are not in
  any syllabus. The pipeline is behaving as ADR-0003 intends, and the product
  cannot help a student study with it.
- Two compiled Officer-level MCQ sets (about 100 questions, provenance
  unverified, see the golden-set README) show the same shape, and many of their
  questions name the document they draw on: the Constitution of Nepal, the
  Pesticide Management Regulation 2081, the Food Hygiene and Quality Act 2081,
  the National Agriculture Policy 2061, the Agriculture Development Strategy
  2015-2035, the NARC Strategic Vision 2011-2030, and several guidelines.

So the question is whether those primary documents can legitimately be added.
Adding them was tried as an experiment on four documents. What it found:

1. **Format is the first cost, not the whitelist.** Of four documents fetched,
   only one had a usable text layer. Two (a 91-page regulation and a 51-page
   Act) are scanned images with no text at all. One (the National Agriculture
   Policy) is legacy Preeti font and extracts as gibberish. The fourth, the
   Constitution, has a real Unicode text layer, but with systematic character
   loss (for example "हक" extracts as "िक"). ADR-0002 already says OCR is a
   fallback that needs mandatory review; this puts a number on how often it
   will be needed for this kind of source.
2. **The extraction step hid it.** `extract.mjs` reported "OK - 0 chars" for the
   two scanned files, so a document could enter the corpus, produce no chunks,
   and raise no warning. Fixed in the spike: it now reports `NO TEXT LAYER`.
3. **The authority page and the file live on different hosts.** The ministry
   page vouches for a file that is stored on a shared government CDN
   (`giwmscdnone.gov.np`, `giwmscdntwo.gov.np`) that also serves other
   agencies. Both CDN hosts return 404 for `robots.txt`, meaning none is
   published. A whitelist entry for the ministry domain alone does not cover
   the files, and the CDN cannot be treated as the authority.
4. **Vetting produced three "needs a human decision" verdicts, not three
   approvals.** `moald.gov.np` and `lawcommission.gov.np` declare a 10 second
   crawl delay; `narc.gov.np` declares none. No terms of use or reuse statement
   was found on any of them (the vetters read summarised landing pages, so the
   owner should check the footers by hand), which leaves fair dealing under
   `NOTICE` as the only basis. The
   ministry's pages carry a publisher line reading "Ministry of Agriculture,
   Forest and Environment" while the site is `moald.gov.np`. The Law Commission
   is not among the bodies `docs/data-governance.md` names as eligible, and its
   pages show no amendment history. The vision document URL suggested by search
   results returned the NARC homepage, not a PDF.
5. **Currency is a live risk.** A search summary claims the 2061 agriculture
   policy has been replaced by a 2083 one. Unverified, but a syllabus-era
   question set still asks about the 2061 policy, and no source in this list
   marks an "as of" date a student can see.
6. **Level scoping breaks.** A regulation applies to every exam level. The
   retrieval filter matched `examLevel` exactly, so a level-agnostic document
   would be silently excluded from every level-filtered question. The spike
   adds a `reference` document class that carries no level and is included
   under any level filter.
7. **Embedding is limited by tokens per minute, and Devanagari is token-heavy.**
   Embedding 250 new chunks stopped after about 40 with a quota error. The
   first reading was a daily cap; it was wrong. A batch of 25 succeeded minutes
   later, and the quota dashboard lists a 30,000 tokens-per-minute limit for the
   embedding model (alongside a 1,000-request daily limit, whose unit, per item
   or per batch, was not established). The tool had treated every
   `RESOURCE_EXHAUSTED` as unrecoverable and gave up on a limit that clears in
   under a minute; the spike now tells them apart. Growth of several hundred
   chunks per document has to be throttled by tokens, not requests.
8. **Chunking can lose parent headings.** A clause and the sub-heading that
   names its policy can land in different chunks. In test `U-03` the heading
   and the clause happened to fall in adjacent chunks that were both retrieved;
   that is luck, not design.
9. **The experiment worked, in a small way.** With the Constitution added, one
   real Level 4 question that had to refuse (`PP-18`) became a faithful, cited
   answer, and two of four unverified questions did too, with no regression on
   the existing 33. It also showed the limits: an English query over a
   Nepali-only corpus missed the right chunk (`U-01`), and a question needing a
   list of article numbers plus their titles produced an answer with a label the
   cited chunk does not contain (`U-04`). Recall and multi-step questions are
   not solved by adding documents. See `docs/evaluation.md`.

## Options considered

### Option A - Stay syllabus-only and narrow the product

A syllabus browser: which topics, how many marks, how the levels and provinces
compare. Honest, cheap, and fully verifiable today. It is a smaller product than
the one proposed, and a student still has to go elsewhere to learn anything.

### Option B - Add primary reference documents, in staged, gated tiers

Add Acts, regulations, national policies and strategies as a `reference` class,
starting with a short named list drawn from what real exams cite. Each document
must pass a gate before it is embedded: a text layer, or OCR with mandatory human
review; a stated "as of" date and a currency check against the authority; the
authority page recorded separately from the file host; and owner approval per
source. Keeps ADR-0003 intact and keeps every answer traceable to an official
text. Costs OCR, review time, and ongoing currency work.

### Option C - Add explanatory technical material (NARC bulletins, manuals,
university notes) immediately

The only route to answering "how does biological control work". It widens the
whitelist and the review burden the most, raises licensing questions under
`NOTICE`, and mixes authority levels. Better decided after Option B's evidence
than before it.

### Option D - Relax ADR-0003 to allow model knowledge for explanations

Rejected, and listed only so it stays rejected on purpose. The PP-01 fabrication
shows what a model does with a gap when it is allowed to.

## Decision

**Accepted 2026-09-23: Option B, in stages.**

- Stage 1 is a named list of legal and policy documents that real exam
  questions demonstrably cite, starting with the Constitution (the only
  document in the experiment with a usable text layer). No explanatory
  technical content yet.
- A source enters only after the owner approves it through the Source request
  process. The vetting reports for `moald.gov.np`, `lawcommission.gov.np` and
  `narc.gov.np` are inputs to that decision, not approvals.
- Every reference document carries `doc_class: reference`, a `referring_page`
  (the authority) separate from the file `url` (the store), an "as of" date, and
  a review state. A scanned or legacy-font file is not embedded until OCR or
  conversion has been reviewed by a person.
- The CDN hosts are not whitelisted as authorities. If they are fetched at all,
  it is under an entry that names the referring authority and the file, with the
  crawl delay of the referring site.
- Level scoping for reference documents stays an open design question, decided
  before Phase 1 code: either include them under every level (as the spike
  does), or tag each with the levels whose syllabus names it.

## Consequences

### Good

- Real questions become answerable with a citation to an official text, which
  is the first way to test answer faithfulness, not only refusal.
- The exam itself tells us which documents matter, so the list is evidence-led
  and short, not a crawl.
- Every answer stays traceable to a document a student can open.

### Bad

- OCR and legacy-font conversion become a standing cost, with mandatory
  human review, for the documents that matter most. Two of the four fetched
  documents needed it.
- Currency work never ends. Superseded policies and amended Acts must be
  detected, dated and shown as such.
- Several authoritative hosts will not publish reuse terms, so the project
  relies on fair dealing and must enforce summarise-and-cite-only itself.
- Chunking must preserve heading context, or clauses become unanswerable.
- Embedding is throttled by tokens per minute, so a large document takes
  minutes to embed, and re-embedding the corpus is a scheduled operation.

### Neutral

- Implies a decision on the generation model tier: [ADR-0008](0008-generation-model-tier.md).
- Implies structure-aware chunking and a documented currency field.

## Verification

Wrong if, after Stage 1, real questions that cite an included document are still
refused at nearly the same rate (retrieval or chunking, not corpus, is the
bottleneck), or if faithfulness on the existing golden set falls, or if any
reference document is shown to a student while superseded without saying so.

Track: share of real and unverified questions citing an included document that
are answered with a correct citation; refusal rate for those questions;
documents needing OCR; documents found superseded; reviewer minutes per document.

## References

- `spike/reports/syllabus-scope-finding.md`
- `spike/golden_set/README.md` and `docs/evaluation.md`
- [ADR-0002](0002-text-layer-before-ocr.md), [ADR-0003](0003-retrieval-grounded-answers-only.md), [ADR-0004](0004-cache-first-serving.md)
- `docs/data-governance.md`, `docs/crawl-policy.md`, `NOTICE`
