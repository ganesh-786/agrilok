# Golden set — honest status

**This is not yet the 20 real past-paper questions the go/no-go gate
requires.** Read this before treating an `evaluate.mjs` run as evidence the
gate is satisfied.

## What's actually in `questions.yaml`

10 questions I constructed myself, directly from syllabus topics I confirmed
present in the corpus while reading it during research (the soil science,
agronomy, horticulture, plant protection and extension sections of LUM-01 in
particular — read in full during the document research, not guessed at).
Every question is tagged `type: pipeline_smoke_test`.

They test whether the **mechanics** work:

- Does a question grounded in real syllabus content retrieve the right chunk
  and produce a cited, faithful answer?
- Does a question outside the corpus's coverage (wrong province, wrong
  domain entirely) produce an honest refusal instead of a guess?
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
