# Product brief

The problem analysis this project is built on.

> **Provenance of this document.** These findings come from the project's
> pre-build research. They were accurate to that research and they are what the
> design assumes - but exam curricula, competitor products, API quotas and
> ministry structures all change. **Re-verify anything here before encoding it
> as a constant, a schema default, or a claim shown to a student.** The
> [go/no-go gate](roadmap.md#gono-go-gate) requires exactly that re-verification
> for the syllabus facts.

## Who this is for

Two distinct groups, often treated as one:

- **Level 4 (JTA) candidates** - diploma or certificate holders, sitting two
  papers with heavier field and practical technical content.
- **Level 7 (Officer) candidates** - degree holders, sitting an objective Paper
  1, a subjective Paper 2 with case studies, and an interview.

They need different material at different depth. Conflating them wastes the one
resource an aspirant cannot get more of: study time.

## The problems

### 1. Source fragmentation

There is no single place to get the current, correct syllabus and past papers
for a specific post **and** province. Curricula are published separately by the
federal PSC and by seven provincial PSCs, on eight portals, with no
cross-linking. Finding the right document is itself a research task before any
studying begins.

### 2. Level 4 and Level 7 treated as one blob

Generic Loksewa platforms serve diploma-level candidates officer-level policy and
administration content, and the reverse. This is a fixable waste.

### 3. Trust, specifically

A vacancy for a given post and province can be years apart. A wrong fact
memorised from an unverified social post - or from a confidently wrong chatbot -
does not cost a few marks. It can cost a cycle. The accuracy bar here is far
above a general-purpose consumer assistant.

### 4. Language and script are real technical constraints

- Devanagari OCR accuracy degrades sharply on low-quality scans, and government
  archives contain many old scans rather than born-digital PDFs.
- Gemini measurably underperforms in Nepali versus English on public benchmarks.

Together these mean the system cannot lean on the model's own knowledge. It must
retrieve, every time. This is the technical origin of
[ADR-0003](adr/0003-retrieval-grounded-answers-only.md).

### 5. The free tier has a real ceiling

Free-tier quotas are low, measured per minute and per day, and change without
notice. A few hundred students each asking a handful of questions during evening
study hours is enough to matter. The answer cannot be "patch it later" - it has
to be architectural, which is [ADR-0004](adr/0004-cache-first-serving.md).

### 6. Connectivity

Most of Nepal's population is rural, and usable speed and data affordability are
inconsistent even where mobile broadband is nominally available. A heavy,
always-online app underserves exactly the students who need this most.

## The competitive landscape - honestly

**"AI for Loksewa" already exists.** Anyone claiming an empty market has not
looked. What exists, broadly:

| Category | What it does | What it does not do |
|---|---|---|
| Offline agriculture MCQ apps | Large question banks, notes, past papers, genuinely useful, well-rated | No AI, static content, no personalisation, no citations, no updates when a syllabus changes |
| Agriculture Loksewa content sites | Past questions and prep guidance | Content blogs - no app, no interactivity, no AI |
| General Loksewa AI platforms | Real RAG tutors, study plans, gap analysis, mock tests | General PSC focus - constitution, GK, current affairs - not agriculture depth; free tiers are trials, not sustained free products |

**The actual gap** is the intersection of three things, not any one of them:

1. Agriculture-service depth at **both** exam levels, kept distinct.
2. **Sustainably** free AI - not a three-question trial.
3. Answers that **cite a real government document** rather than asking to be
   trusted.

That intersection is narrow and defensible. It is not "nobody has built AI for
Loksewa", and the project should not tell that story.

## What the evidence says about whether this can work

- **Intelligent tutoring systems** show a moderate positive effect for adult and
  college-level learners, stronger over a sustained study period than in
  one-off sessions. Loksewa preparation is months of sustained study, which is
  the regime where these systems do best. This argues for streaks, spaced
  repetition and daily use - not a one-shot Q&A widget.
- **RAG measurably improves citation grounding** and reduces hallucination
  relative to simply using a larger model. But it is not magic: production
  analyses find retrieval, not generation, is the usual cause of failure. Hence
  the design effort concentrated on retrieval quality and the evaluation
  harness.
- **Indirect prompt injection** is a real risk for any system that feeds crawled
  web content to a model. Low on government domains today; rising the moment the
  whitelist widens. Defended from the start rather than retrofitted -
  [ADR-0005](adr/0005-untrusted-retrieved-context.md).

## What success looks like

Not signups. A student can:

1. Find the syllabus for **their** level, group and province, with a visible
   "last verified" date.
2. Ask a question and get an answer that names the government document it came
   from, with a link that resolves.
3. See plainly whether a human has checked that content or not.
4. Do all of it for free, on a phone, on a bad connection.

## What would make this the wrong project

Stated up front so it can be recognised rather than rationalised:

- The Phase 0 spike shows retrieval-grounded answers are not faithful enough
  even with good retrieval.
- Official sources become uncrawlable and no permitted route exists.
- The free tier tightens beyond what caching can absorb, and no
  education or nonprofit credit route is available.
- An existing product closes the gap properly - in which case contributing to it
  serves aspirants better than competing with it.
