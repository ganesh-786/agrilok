# ADR-0003: Answer only from retrieved sources, never from model memory

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** @ganesh-786

## Context

This is the decision the product is built on. Everything else is downstream.

Three forces:

1. **Stakes.** A Loksewa vacancy for a specific post and province can be years
   apart. A wrong fact memorised from here does not cost a few marks; it can cost
   a cycle. The tolerance for a confidently wrong answer is effectively zero.
2. **The model is weaker in Nepali.** Gemini measurably underperforms in Nepali
   compared with English on public benchmarks. Its parametric knowledge of a
   Nepali-language, Nepal-specific, frequently-revised syllabus is not a safe
   base for study material.
3. **The differentiator.** AI study tools for Loksewa already exist. What does
   not exist is one that can show a student the government document an answer
   came from. Verifiability, not fluency, is the product.

There is also a standing temptation to defeat: when retrieval returns nothing,
the model can always produce *something*, and that something will look helpful.

## Options considered

### Option A - Model-first, retrieval as enrichment

Let the model answer and use retrieval to add supporting links. Fast, fluent,
handles any question. But the answer is not actually derived from the cited
document, so citations become decoration - and decorative citations are worse
than none, because they manufacture unearned trust. Rejected.

### Option B - Retrieval-grounded, with a model fallback when retrieval is empty

Covers more questions. But the fallback is exactly the high-risk path: it fires
precisely when the corpus lacks coverage, which is when the model is least likely
to be right about a niche Nepali syllabus. It also degrades silently - the
student cannot tell which mode produced their answer. Rejected.

### Option C - Retrieval-grounded only; refuse when context is insufficient

Narrower coverage. Refusals will frustrate some users. In exchange, every answer
shown is traceable to a document the student can open.

## Decision

The system answers **only** from retrieved, reviewed source text.

- Every substantive claim carries a citation resolving to the original
  government document, with a fetch date.
- When retrieval returns nothing sufficient, the system **says so**. That is the
  designed behaviour, not a failure path, and never a cue to answer from memory.
- Gaps are fixed by improving the corpus or retrieval - never by relaxing this
  rule.
- This holds under load and under quota exhaustion. Degradation means queueing
  or declining, never answering ungrounded.

## Consequences

### Good

- Students can verify us. That is the entire value proposition.
- Wrong answers become traceable to a wrong or misread *source*, which is fixable
  systematically, instead of to model behaviour, which is not.
- Hallucination risk collapses to a bounded set: bad source, bad extraction, bad
  retrieval - all of which are inspectable.
- Nepali-language weakness stops being a correctness risk and becomes a fluency
  one.

### Bad

- **Coverage is limited by the corpus.** Early on the system will refuse a lot,
  and that will feel worse than a competitor confidently answering everything.
  This is the correct trade and it will still be unpopular.
- Refusals need careful wording, or students read them as the product being
  broken.
- Corpus quality becomes the bottleneck for the whole product.
- Retrieval quality now determines answer quality, so it needs constant
  measurement - [ADR-0006](0006-golden-set-evaluation.md).

### Neutral

- Retrieval must be good enough that refusals mean "we do not have this" and not
  "we failed to find this". Those look identical to a student.

## Verification

This decision is wrong if the golden set shows high faithfulness but users
consistently cannot get answers to reasonable in-syllabus questions - meaning we
have optimised for not being wrong at the cost of not being useful.

Track: refusal rate, and the share of refusals that are genuine corpus gaps
versus retrieval failures. A rising refusal rate driven by retrieval failures is
a bug. Driven by corpus gaps, it is a roadmap item.

## References

- [docs/product-brief.md](../product-brief.md)
- [docs/nepali-devanagari.md](../nepali-devanagari.md)
- Research on RAG and citation grounding versus larger-model scaling
