# Evaluation

How this project knows whether it is working, rather than whether it feels fine.

## Why this is first-class

Retrieval-augmented systems fail quietly. An answer that is fluent, well-cited
in appearance, and wrong looks exactly like an answer that is right. The only
defence is measurement against known-correct answers, run every time the
pipeline changes.

Production analyses of RAG systems consistently find that when they return
something wrong, **retrieval - not generation - is usually the cause**. That is
why the metrics below separate the two, and why regression triage starts at
retrieval.

## The golden set

A curated set of **real past-paper questions** with known-correct answers,
living in [`data/golden-set/`](../data/golden-set/).

- Target: 50-100 questions minimum, covering **both** Level 4 and Level 7, and
  more than one province.
- Each entry: the question (as asked), the reference answer, the official
  source that supports it, the exam level, service group, province and year.
- Questions in Nepali **and** English, because students ask in both and the
  system must work in both.
- It is committed, and it is reviewed like production code - it defines what
  "correct" means for everything else.

**The golden set is never edited to make a run pass.** If a question or its
reference answer is genuinely wrong, that is its own issue and its own PR, argued
on its own merits.

## Metrics

| Metric | Question it answers | Failure looks like |
|---|---|---|
| **Faithfulness** | Is the answer actually supported by the retrieved text? | The model added something plausible that no source says |
| **Answer relevancy** | Does the answer address the question asked? | Correct, sourced, and about something else |
| **Context precision** | Were the retrieved chunks relevant? | The right chunk drowned among noise |
| **Context recall** | Was the needed information retrieved at all? | The right chunk was never fetched |

## The gate

**Faithfulness is a hard floor.** A drop is a blocking bug, not a trade-off.
Answer relevancy and latency may be traded against each other; faithfulness may
not - an unfaithful answer is precisely the failure this project exists to
prevent.

Thresholds are set from the first full baseline run in Phase 1 and recorded
here. Until that baseline exists, **no threshold is stated**, because a number
invented in advance is not a measurement.

Once the harness exists, `evaluate.yml` becomes a required status check on
`main`.

## When to run it

Any change to:

- chunking (size, overlap, header handling)
- the embedding model or its dimensions
- retrieval parameters, filters, hybrid weighting or reranking
- prompt assembly or system instructions
- the ingestion path that produces the corpus

Run it **before and after**, and put both sets of numbers in the PR. One
post-change number proves nothing.

## Diagnosing a regression

In this order, because this is the order in which these systems actually fail:

1. Was the right chunk retrieved at all? (context recall)
2. Was it drowned by irrelevant chunks? (context precision)
3. Were the level / group / province filters correct?
4. Was the source text itself wrong or misextracted - OCR, staleness?
5. Only then: did generation misuse correct context? (faithfulness)

Report the **named failing questions**, not just the aggregate. An average hides
the one question that is now catastrophically wrong, and that one question is
somebody's exam.

## Phase 0

The harness does not exist yet. Until it does, faithfulness is checked **by
hand** against at least 20 real past-paper questions, as required by the
[go/no-go gate](roadmap.md#gono-go-gate). Record the results; they become the
first baseline.

A first, smaller pass ran 13 hand-written smoke-test questions (not yet the 20
real past-paper questions the gate needs - see the spike's own
`golden_set/README.md`) against a real corpus and a live model. Read by hand,
chunk by chunk, against the actual cited text, not just checked for a
refuse/answer match. Two findings worth carrying into the real evaluation,
neither of them a fabrication, both real:

**A model can substantively refuse without using the exact refusal phrase
the prompt asked for.** One answer said, in its own words, that the source
only listed topic headings rather than explaining them - a correct, honest
refusal - but didn't match the single phrase the system instruction
requested, so string-matching against it undercounted refusals. Broadened,
but not solved: matching prose to recover a yes/no signal is inherently
fragile, and the same fragility already broke citation extraction once. A
harness relying on regex-matched prose for either signal should expect more
of this, not treat this instance as the last one.

**A faithful answer can still blur real structural boundaries.** One answer
correctly cited only real syllabus headings - nothing fabricated - but
grouped headings from genuinely separate, separately-scored syllabus
sections under one invented thematic label, with connecting prose that read
as more explanatory than the source's bare list actually supports. Faithful
to the facts, but not faithful to the source's own structure - worth a
distinct check in the real evaluation, since "does every claim trace to the
source" does not catch "does the answer imply an organisation the source
doesn't have."

A second pass ran the same 13 smoke-test questions again after the corpus
grew from 18 to 40 documents (adding federal `psc.gov.np` content for the
first time, across levels 4, 5, 7, 8 and 9). Zero fabrication held at the
larger, more heterogeneous scale. Two things were confirmed, not just
suspected:

**The regex-matched refusal signal undercounted a real refusal a third
time.** One answer explicitly said the sources did not contain enough
information to explain the topic asked about - a correct, honest refusal in
substance - but used a third distinct phrasing that neither existing pattern
matched, so it was mechanically counted as "answered". Each of the three
times this has now happened, the model found an honest way to say
"insufficient" that no fixed pattern anticipated in advance. Fixed at the
root rather than patched a fourth time: `lib/prompt.mjs` now requires a
structured JSON response (`{sufficient: boolean, answer: string}` via
Gemini's `responseSchema`) instead of prose the pipeline then has to
regex-match for a yes/no signal. `sufficient` is a field the model commits
to directly; it is not something a new phrasing can slip past.

**A new failure mode, worse than a plain refusal miss: restating a bare
heading as if it were an explanation.** Asked to explain two different
topics (seed technology; ICT's role in agricultural extension) where the
source only lists the topic as a syllabus heading with no elaboration, the
model did not fabricate new facts - but it also did not say the explanation
was missing. It repackaged the heading itself in different words and
presented that restatement as the answer. Nothing in it fails a citation
check, and a student could easily come away believing they had learned
something they had not. This is a real product-trust risk, not a formatting
quirk. Fixed by adding an explicit rule to the system instruction: a bare
topic heading naming a subject is not sufficient to explain, define or
describe it, even though the model can see and repeat the heading's name;
if the question asks for an explanation and the source only has the
heading, `sufficient` must be `false` for that part. Verified with a
standalone test against the exact failing question before re-running the
full smoke set, and the full set was then re-run clean: all 13 questions
matched expected behaviour, and every "answer" row was re-read by hand
against its cited chunks and judged faithful.

A citation-extraction bug was also found and fixed during this pass, not a
model behaviour issue: `extractCitations()` in `lib/pipeline.mjs` matched
only a single id per bracket (`[LUM-01-016]`), so any answer citing several
sources in one bracket (`[LUM-01-016, BAG-01-012]` - the model's normal
style) had all of those citations silently dropped from the report. One
answer with a dozen visible citations was reported as "Cited: (none)". This
made the "retrieved but never cited" signal, which exists specifically to
flag chunks worth a reviewer's attention, actively misleading. Fixed by
matching the whole bracket and splitting on comma.

None of this is gate evidence on its own - still smoke tests, not the 20
real past-paper questions the gate requires - but it is a second, larger,
independent confirmation of zero fabrication, and it converted two
suspected weaknesses into two fixed, verified ones plus one newly-found
one, rather than leaving them as open questions for the real evaluation to
rediscover from scratch.

### The first 20 real past-paper questions

The golden set now has 20 `real_past_paper` entries (`golden_set/questions.yaml`,
`PP-01` through `PP-20`), the number the go/no-go gate asks for. Read what
that number does and does not mean before treating it as the gate cleared.

**Source and how it was corroborated.** A scanned objective (MCQ) exam paper,
Koshi Province Public Service Commission, Local Agriculture Service,
Agriculture Extension / Crop Protection group, Assistant Level 4, dated
2082/01/27 BS, redistributed by a coaching service with printed answer
highlighting. A live Koshi PSC notice
(`psc.koshi.gov.np/content/1297/mnmn/`) confirms a written-exam-result
notice exists for the exact same vacancy, service, group and level named on
the paper's own letterhead - confirming a real exam for this exact post
happened. That is meaningfully stronger evidence than an unverified
coaching-site question set, and it is also a different, weaker kind of
verification than the syllabi have: a live government URL with a byte-exact
match. Documented at exactly that confidence level, not stretched to look
equivalent.

**This batch is Level 4, Koshi Province only.** The gate's "Level 4 and
Level 7" language is not satisfied by this batch alone - no verified real
Level 7 past paper has been found yet.

**What running them found - three faithfulness outcomes, not one.** Each
question was run against the live pipeline before its expected behaviour was
written, the same discipline as the smoke tests. 17 of 20 correctly refuse:
the syllabus corpus genuinely does not contain the specific facts these MCQs
test (scientific names, exact percentages, named regulations), so refusal is
the correct, faithful result, not a shortfall. Three produced an answer worth
naming individually, because the aggregate pass count would otherwise hide
the one that matters most:

- **`PP-01` is a confirmed fabrication, not a hypothetical one.** Asked what
  kind of data province-bound crop-cutting figures are, the pipeline
  answered "secondary data", citing real chunks - which only list "6.9
  Primary/Secondary data" and "6.10 Crop Cutting" as two separate, adjacent,
  unexplained syllabus headings. Neither states which category crop-cutting
  data falls under. The real exam's own marked answer is primary data. The
  model combined two adjacent headings into a classification the source
  never makes, cited real chunk ids as if they supported it, and got it
  wrong. This is the clearest evidence yet found that ADR-0003 can be
  violated in practice, not just in theory, and it was found precisely
  because a real question came with a real, independently known correct
  answer to check against - something the smoke tests, self-written and
  without an external answer key, structurally could not do.
- **`PP-17` answers correctly but the provenance is not clean.** Asked what
  corrects acidic soil, the pipeline said agricultural lime, matching the
  real exam's answer - but the cited chunk lists lime and gypsum as one
  combined heading without stating that lime specifically treats acidic
  soil. A right answer that cannot be shown to come from the retrieved text
  is not evidence the system is working; it is a coin flip that landed
  right this time. Recorded as `refuse` in expected behaviour for the same
  reason as `PP-01`, not because the surface answer was wrong.
- **`PP-16` held up as genuinely faithful**: the cited chunk explicitly lists
  organic and chemical fertilisers as two differentiated, named categories
  that directly match all four options in the question.

**What this means for the gate.** The numeric target (20 real past-paper
questions, faithfulness checked by hand) is met. Per
[CLAUDE.md](../CLAUDE.md)'s own rule, "faithfulness never regresses - a drop
is a blocking bug, not a trade-off", and `PP-01` is exactly that: a
confirmed, reproducible faithfulness failure on real exam content, now
recorded as a live regression case rather than a one-off anecdote. Hitting
the number of questions the gate names is not the same as the gate being
clear - a confirmed fabrication sitting in the golden set is a blocking
finding regardless of what the pass count reads.

### Chasing `PP-01`: a prompt fix, a dropped instruction, and a model ceiling

Investigating `PP-01` further, in that order, found three distinct things,
not one:

**A real, missing instruction.** The structured-output migration (above)
rewrote the system instruction's rule 1 around the heading-versus-explanation
distinction and, in doing so, silently dropped the original, load-bearing
sentence: "do not use anything you know about agriculture, Nepal, or these
exams from your own training." That is ADR-0003's actual instruction, not a
nice-to-have, and it went missing for one full round of testing without
anyone noticing until this investigation. Restored, and rule 1 now states an
explicit, general test ("could you point to one specific place in the source
that states this?") rather than accumulating one-off examples, after an
earlier attempt at a second illustrative example was found to *weaken* the
first one - adding a second concrete case measurably regressed the first,
confirmed by three identical repeated runs, not variance. A single general
test with short illustrative bullets underneath it fixed both `PP-01` and
`PP-17` without that interference. `PP-17` is now confirmed fixed. `PP-16` is
unaffected, still correctly answers.

**A model capability ceiling the prompt cannot fix.** `PP-01` itself did not
move under the corrected prompt. Investigated by retrieving and reading all
six chunks the query actually returns: none of them state whether
crop-cutting data is primary or secondary. The pipeline confidently answers
"secondary data" anyway - a real fact about agricultural statistics
methodology that the model plainly already knows, dressed in a citation to
chunks that never say it. Sent the identical system instruction and identical
retrieved context to two other models in the same family
(`gemini-3-flash-preview`, `gemini-3.5-flash`): both correctly refused,
identifying the same gap in the source that `gemini-3.1-flash-lite` talks
past. Same prompt, same input, different result by model - this rules out
the prompt as the remaining variable and identifies it as a `gemini-3.1-flash-lite`-specific weakness.

**Why the model is not simply being swapped for a better one.** Checked
against the real, live AI Studio quota dashboard (2026-09-18, this account):
every full-tier Flash model (`gemini-3`, `3.5`, `3.6`, `3.7`, `3.8`) is capped
at **20 requests per day**, while both Lite-tier models checked
(`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`) get **500 requests per
day** - a consistent, deliberate 25x gap across the whole model family, not
one model's quirk. Twenty requests a day, project-wide, is very likely fatal
to a real pilot regardless of this bug; the spike itself burned through
`gemini-3.6-flash`'s 20 RPD in a handful of test calls earlier the same day.
Staying on the Lite tier for continued testing is the considered choice, not
an oversight - see [docs/free-tier-budget.md](free-tier-budget.md) for why
volume matters this much. The residual risk this leaves is bounded by the
rest of the architecture, not eliminated by it: `verified` content only
reaches a student after human review (non-negotiable rule 2 in
[CLAUDE.md](../CLAUDE.md)), and [ADR-0004](adr/0004-cache-first-serving.md)'s
cache-first design means most traffic is pre-generated and reviewed, never
live. This specific weakness lives in the minority, uncached, genuinely-novel
live query path - real, and not the whole product's exposure.

**What Phase 1 actually needs from this.** Not a fix inside this spike. A
named decision, ideally its own ADR, on generation model tier: accept the
Lite tier's residual faithfulness gap and rely on the review gate to catch
it, add a lightweight non-model verification layer (for example, checking
lexical overlap between an answer's claims and its cited chunk text before
ever showing it), or accept the ~20 RPD ceiling of a full model and redesign
the capacity plan around it. All three are real options with real costs;
none should be drifted into by default.

### Do primary documents change the answer? A four-document experiment

The syllabus-only corpus can only refuse most real questions. To see what
primary documents would change, four government reference documents were added
by hand to the spike corpus (never to the crawler or the whitelist) and the
golden set was run again. Details and the vetting results are in
[ADR-0007](adr/0007-primary-reference-documents-in-the-corpus.md); this section
records what the run showed, judged by hand against the cited text, not by the
harness's pass count.

**Only one of the four was usable as fetched.** The Constitution has a real
Unicode text layer (with systematic character loss). The 91-page Pesticide
Management Regulation and the 51-page Food Hygiene and Quality Act are scanned
images with no text at all, and the National Agriculture Policy is legacy
Preeti font. So this was an experiment on one document, the Constitution, and
the format problem is itself a finding.

**Existing questions did not regress.** All 13 smoke tests and every real
question that refused before still refuse. Adding 228 reference chunks under the
level filter did not disturb them.

| Question | Outcome, judged against the cited chunk |
|---|---|
| `PP-18` (real, Level 4: who holds residual power) | Was a refusal; now a **faithful, correct answer** citing Article 58. The first of the 20 real questions to be answered because a primary document was added. |
| `U-02` (Nepali: which article contains the food sovereignty right) | **Faithful and correct**, Article 36 clause (3), cited to the chunk that contains it. |
| `U-03` (which policy contains the food sovereignty clause) | **Faithful and correct**, the Article 51(ज) heading and clause 12 fell in adjacent chunks and both were retrieved. |
| `U-01` (same as `U-02`, asked in English) | **Refused, because retrieval missed it.** The Article 36 chunk exists but an English query over a Nepali-only corpus retrieved neighbouring chunks. A recall failure, the "we failed to find this" refusal ADR-0003 warns about, not a faithfulness failure. |
| `U-04` (which right is suspended in an emergency) | **Not faithful**, and the harness scored it as a pass. The answer says "Article 16 (Right to live with dignity)" is excluded from suspension, but the cited chunk lists article numbers only; the label is not in it. The model supplied it from outside the source, and its statement that the other rights are "not listed" misreads a list of unlabelled numbers. It should have refused. |

What this supports and does not:

- Adding a primary document does turn refusals into faithful, cited answers, on
  one real question and two unverified ones. That is the first evidence for
  ADR-0007 and it is small: one document, four questions, one real.
- It does not fix recall. Cross-language retrieval is a separate problem, and
  `PP-20` (the annual report of a provincial commission) is probably answerable
  from the Constitution but still refuses; that was not verified because the
  extraction's character loss defeats a plain text search.
- A mechanical "answered as expected" can hide an unsupported claim. `U-04` is
  why the by-hand read stays mandatory.
- The unverified tier stays out of the gate. Its questions have unknown
  provenance; only its answers were checked, against the primary text.

**Two defects in my own recording, corrected.** `U-01` and `U-02` were first
written without their four MCQ options, which changed what was being asked; the
options are restored and the results above are from the corrected questions. The
same omission applies to the 20 real questions already merged: they were
recorded without their options, so "exactly as asked" is not met for them. That
needs re-transcribing from the original paper, which is not in the repository.

**Tooling fixed on the way.** `extract.mjs` reported "OK - 0 chars" for scanned
files and now reports `NO TEXT LAYER`. Quota errors were all treated as
unrecoverable, so an embedding run stopped on a per-minute limit that clears in
under a minute; per-minute and per-day quotas are now told apart.

### The support check and model fallback (ADR-0008)

**What was built.** Every claim in an answer now carries one verbatim quote
from one source. Before the answer is shown, a deterministic check (no model
calls) confirms the quote is one contiguous passage of the cited chunk, that
the claim's numbers are in it, and that the claim does not borrow words from
elsewhere in the chunk. A failed check withholds the answer as a refusal. A
plain "are the words in the chunk" check, as ADR-0008 first described it,
would not have caught `PP-01`: both "crop cutting" and "secondary data" are in
that chunk, in two separate numbered items. Requiring one passage does.

Generation also falls back from `gemini-3.1-flash-lite` to
`gemini-3.5-flash-lite` on overload or quota errors, never on "model not
found", and every answer records which model produced it.

**What the live run showed (2026-09-23), judged by hand, not by pass count.**
The primary model was overloaded for the whole run, so 32 of 37 questions were
answered by the fallback. This is therefore not a clean like-for-like
comparison with the previous baseline (35/37 on the primary, no check).

- **Faithfulness did not drop.** No new unfaithful answer appeared. `U-04`,
  unfaithful last run, now refuses.
- **The check caught a real error.** `SMOKE-03`'s answer attributed interview
  marks to the "Veterinary Group" while citing the multi-group syllabus that is
  not the veterinary one. The model had mixed two documents. Withheld.
- **The first version of the check was too strict**, and three good answers
  were withheld: numbers and words the question itself contains ("Level 7",
  "Article 36"), a number from the article heading just above the quoted clause,
  and quotes the model copied from damaged legacy-font text with in-word spaces
  or literal escape codes. Each was fixed and re-checked against the saved
  answers, with every fabrication test still rejected.
- **One genuine answer is still withheld**, `SMOKE-05`. Its quote scores 0.74
  against a bar of 0.85 because the source has lost letters in extraction. Of 37
  genuine quotes, 36 scored 0.87 or higher; the fabrication tests score 0.55
  (stitched) and 0.27 (invented). The bar stays at 0.85. A wrongly withheld
  answer is the safe failure, and the fix belongs in extraction.
- **The fallback model refuses more.** `SMOKE-13`, `PP-16`, `U-01` and `U-04`
  were refused by `gemini-3.5-flash-lite` itself, before any check ran.

Re-scored on the saved answers: **31 of 37 match**, against 35 of 37 before.
The drop is in how often the system answers, not in faithfulness.

**First live test on the primary model (2026-09-24): the check missed
`PP-01`.** With `gemini-3.1-flash-lite` back, `PP-01` was shown to the student
again. The model quoted one unbroken span covering item 6.9 ("Primary data and
Secondary data") and item 6.10 ("Crop Cutting"). That span is genuinely one
contiguous passage, so the contiguity check passed it. The offline tests had
only tried quotes that skipped the text between the items, which is why they
passed while the live case failed.

**Fix: a claim must be stated inside one numbered item.**

- A quote that crosses sibling items (6.9 then 6.10, (१) then (२), क) then ख))
  is split at them.
- A claim word the quoted item lacks, but the neighbouring item has, fails the
  claim outright, however small a share of the claim it is.
- A flat, stricter share was tried first and withheld two correct answers
  (`SMOKE-01`, `PP-16`), because common words recur far from the quote.
- One exception: a quote that includes its own heading, with a claim naming
  every item under it, is a list ("the second stage is a group test and an
  interview", `SMOKE-03`).
- Headings above the quote ("3 Soil Science", "3.1 General Introduction")
  count as context.
- Words from the question count as context for the share rule, never for the
  neighbouring-item rule, because `PP-01`'s own question says "crop cutting".
- Separately, a false alarm on `PP-16` (a two-letter Nepali stem matching by
  chance) was fixed.

**Result, primary model, fallback off:**

- **`PP-01` was run live 3 times and withheld all 3.** The model still
  fabricates; the check now stops it reaching a student.
- **The full golden set scored 34 of 37 live.** All 37 questions were answered
  by `gemini-3.1-flash-lite`.
- **One of the 3 mismatches, `SMOKE-01`, was a false alarm** from the first
  version of the fix, since corrected. The check is deterministic, so
  replaying it on that run's saved answers gives the exact result the fixed
  version would have: **35 of 37**.
- **The other two, `U-01` and `U-04`, were refused by the model itself.** They
  are unverified questions and never count toward the gate.
- **Every answer the run showed was read against its quote by hand, and all
  are faithful.**
- **Every form of the `PP-01` answer is withheld:** the live span in Nepali
  and in English, a quote of 6.9 alone, 6.10 alone, an invented quote, and a
  wrong item number. True claims about 6.9 and 6.10 on their own are still
  shown.

**Known limit.** A heading with exactly two items under it, quoted whole, with
a claim that wrongly relates the two items, still passes. The check cannot
tell "A and B are listed" from "A is a kind of B" without understanding the
sentence, and that is a job for the human review queue, not a word check.

## Operational metrics

Separate from answer quality, and measured from the first deployment:

- **Cache hit rate** - the mechanism the free tier depends on
- **Daily API request burn** against the configured ceiling
- **Review queue depth and age** - a queue that grows unboundedly means content
  is either not being reviewed or is being waved through
- **Share of content in each review state** - if `verified` is not growing, the
  trust premise is not being delivered

These are not vanity metrics. The first two are the difference between "free
forever" and a surprise bill; the last two are the difference between a reviewed
product and a chatbot with extra steps.
