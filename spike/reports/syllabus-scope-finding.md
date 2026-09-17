# A syllabus names topics. It does not teach them.

Committed alongside [extraction-notes.md](extraction-notes.md) because this
is a Phase 0 result that bears on the product, not only on this spike's code.

## What happened

The first live query to the pipeline was:

> What are the main soil forming processes? (level 7)

It refused: "The retrieved source material does not contain enough
information to answer this question."

The obvious explanation was corruption, because four of the six retrieved
chunks came from LUM-06, a document with legacy-font lines. That explanation
is wrong. Two of those four (`LUM-06-012`, `LUM-06-013`) are clean English
soil science text. Only `LUM-06-021` is gibberish.

The actual reason is simpler. Across every Level 7 chunk in the corpus, the
phrase "soil forming process" appears only as an outline heading:

```
3.1. General Introduction
3.1.1. Definition of soil
3.1.2. Soil forming process
3.1.3. Physical properties of soils (texture, structure, density, ...)
```

No chunk mentions weathering, eluviation, illuviation, or any process by
name. The model had the relevant chunk (`LUM-01-012` was retrieved) and read
it correctly. A heading is not an answer, so it refused. That is
[ADR-0003](../../docs/adr/0003-retrieval-grounded-answers-only.md) behaving
exactly as intended, for the right reason.

## Why it matters

This corpus can answer questions **about the exam**:

- which topics a section covers
- whether a topic is on the syllabus at a given level
- how many marks a section carries
- what the exam stages are

It cannot answer questions **about agriculture**:

- what the soil forming processes are
- how biological control works
- what biopesticides are

Checked directly: no Level 7 chunk contains an explanation of soil forming
processes or a definition of biopesticides.

A student studying for the exam mostly needs the second kind. Grounding
answers only in retrieved text, and grounding retrieval only in syllabi,
means the product can tell a student what to study but not help them study
it. Nothing in the pipeline is broken; the source material is the wrong
shape for most of the questions a student will ask.

## What changed in the smoke tests

Five of the original ten smoke tests asked content-shaped questions and
expected an answer. They could never have passed honestly. Against this
corpus the correct result for all five is a refusal, so they now expect one.
Five syllabus-shaped questions were added that expect an answer, and each was
checked against the current chunks before being written. See
[golden_set/questions.yaml](../golden_set/questions.yaml).

The injection test (SMOKE-13) also changed. Its legitimate half used to ask
for soil forming processes, so a refusal would have looked the same whether
the injection was blocked or not. It now asks a question the corpus can
answer, and `evaluate.mjs` fails the test if the answer contains the injected
word at all.

## Open question for the roadmap, not decided here

The architecture in [docs/architecture.md](../../docs/architecture.md) and
the source whitelist assume official syllabi, vacancy notices and gazette
entries are the corpus. This result says that corpus supports a syllabus
browser well and a study assistant poorly.

Options worth weighing before Phase 1, each with real trade-offs:

1. **Add content sources** such as NARC publications, ministry technical
   manuals, or university course material. Keeps ADR-0003 intact, but widens
   the whitelist and the review burden, and raises licensing questions under
   [NOTICE](../../NOTICE).
2. **Narrow the product** to what syllabi support: topic browsing, marks,
   level and province comparison. Honest and cheap, but a smaller product than
   the one proposed.
3. **Relax ADR-0003** to allow model knowledge for explanations. Directly
   contradicts the project's central rule and its reason for existing, and is
   listed only so it is rejected on purpose rather than drifted into.

This needs an ADR and a decision from the project owner. It should not be
resolved inside a spike PR.
