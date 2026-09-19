# Golden set — honest status

**This is not yet the 20 real past-paper questions the go/no-go gate
requires.** Read this before treating an `evaluate.mjs` run as evidence the
gate is satisfied.

## What's actually in `questions.yaml`

13 questions I constructed myself, all tagged `type: pipeline_smoke_test`.
Every question that expects an answer was checked against the current chunks
before it was written, and the chunk ids that answer it are recorded in
`expected_source_hint`.

The corpus is syllabus documents, which list topics and marks but do not
explain topics. So the questions come in two shapes that expect opposite
results (see [reports/syllabus-scope-finding.md](../reports/syllabus-scope-finding.md)):

- **Syllabus-shaped** (SMOKE-01 to 05): which topics, how many marks, what
  exam stages. Expect a cited answer.
- **Content-shaped** (SMOKE-06 to 09): explain a process, define a term.
  Expect a refusal, because no chunk contains the explanation.

The rest test refusal outside the corpus (SMOKE-10 to 12) and prompt
injection in the question text (SMOKE-13, which also fails if the answer
contains the injected word).

They test whether the **mechanics** work:

- Does a syllabus-shaped question retrieve the right chunk and produce a
  cited, faithful answer?
- Does a content-shaped question, or one outside the corpus, produce an
  honest refusal instead of a guess?
- Does a direct prompt-injection attempt in the question text fail to
  override the system instruction?

They do **not** test whether the system reproduces the same reasoning or
answer depth a real exam expects — that needs real past-paper questions with
known-correct answers, matched against real past-exam performance. A
synthetic question I derived from the same document the system retrieves is
close to the easiest possible case; it says little about a genuinely
independent question a real examiner wrote.

## What still needs to happen before the gate is satisfied

Per [docs/roadmap.md](../../docs/roadmap.md#gono-go-gate):

> Phase 0 spike completed and faithfulness manually checked against ≥20 real
> past-paper questions

That requires **actual questions asked in real past Loksewa agriculture
papers** — Level 4 and Level 7, ideally spanning more than one province and
more than one sitting. Two honest paths to get there:

1. **You supply them.** If you or someone you know has sat these exams, real
   past papers (official PDFs, or hand-transcribed questions with the source
   sitting noted) are the single most valuable input this spike can receive.
2. **Further research.** The same rigor applied to finding the 18 syllabus
   documents — verify each question against a real, dated past-paper source,
   never invent one and label it real — would need to be applied to finding
   genuine past papers. This was explicitly deferred this session ("later we
   can do more research").

**Something to settle first.** Real past-paper questions are mostly
content-shaped ("Explain the soil forming processes"). Against a
syllabus-only corpus, a faithful pipeline will refuse nearly all of them.
Twenty refusals would show the refusal path works, not that answers are
faithful. The corpus question in
[reports/syllabus-scope-finding.md](../reports/syllabus-scope-finding.md)
needs a decision before real past papers can test what the gate means them
to test.

## A third tier: unverified model questions

`type: unverified_model_question` holds compiled MCQs whose own provenance
cannot be established (a coaching institute's retyped set, an untitled
compilation with numbering gaps and a key that contradicts its own notes).
They are **never counted toward the gate**, and `evaluate.mjs` reports them
in a separate count so they cannot be mistaken for it.

They exist because their *answer* side can be verified even when their
*question* side cannot: a reference answer is checked against a primary
government document in the corpus, never against the compiler's key. That
makes them a fair test of whether the pipeline answers faithfully once the
primary text is present, or over-refuses. `answer_verified_against` names the
document and the place.

The bar for a `real_past_paper` entry did not move: an official PSC-hosted
file, or a scan of the physical booklet showing the PSC header, KEY and date,
ideally with a live notice for the same vacancy.

## Format for real entries, when they arrive

```yaml
- id: PP-001
  type: real_past_paper        # not pipeline_smoke_test
  question: "..."               # exactly as asked
  reference_answer: "..."       # the known-correct answer
  source: "..."                 # which paper/sitting this came from, and how you know
  exam_level: 7
  province: lumbini             # or federal, or unknown if not stated
  service_group: soil_science
  added_by: "..."
  verified_on: "YYYY-MM-DD"
```

**Never edit a real entry's question or reference answer to make a run pass.**
Per [docs/evaluation.md](../../docs/evaluation.md), the golden set defines
correctness — editing it to fit the system inverts the entire point.
