# Context: Nepali and Devanagari specifics

Load this when working on extraction, OCR, chunking, embeddings, prompts, or
anything that displays Nepali text.

## The model is weaker in Nepali than in English

Public benchmarks show a measurable accuracy gap for Gemini between English and
Nepali. The model is usable for Nepali - it is not equally reliable in it.

**Consequence:** the system cannot lean on the model's own knowledge. It must
lean on retrieval every time. This is one of the two main reasons for
[ADR-0003](adr/0003-retrieval-grounded-answers-only.md); the other is
that a wrong fact can cost a student an exam cycle.

## OCR on Devanagari degrades badly on poor scans

Published measurements show Devanagari OCR accuracy falling sharply from clean
scans to low-quality ones. Government archive PDFs are frequently old scans
rather than born-digital text.

**Consequences, all enforced in the pipeline:**

- Parse the PDF text layer first. Use OCR only when there is genuinely no text
  layer. ([ADR-0002](adr/0002-text-layer-before-ocr.md))
- Every extraction carries a confidence score. Below `OCR_MIN_CONFIDENCE`, the
  document goes to human review before it may answer anything.
- Garbled Devanagari is the single most likely route for a wrong fact to enter
  the system. Reviewers compare against the source PDF directly, not against the
  extracted text.
- `nep+eng` together, not `nep` alone - these documents mix scripts, especially
  in technical and scientific terms.

## Text handling

- **UTF-8 everywhere**, no exceptions. `.gitattributes` keeps data files as
  LF-normalised UTF-8 text.
- **Do not naively truncate** Devanagari strings by byte or by code point.
  Combining marks and conjuncts break, sometimes changing the meaning of a word.
- **Token counts differ from English.** Devanagari is less token-efficient in
  most tokenisers, so a chunk that is 400 tokens in English is fewer words in
  Nepali. Measure chunk size in tokens, never in characters.
- **Search must be script-aware.** Students type queries in Nepali, in English,
  and in romanised Nepali. Keyword search that only matches one of those will
  silently miss. This is a large part of why retrieval is hybrid rather than
  vector-only.
- **Numerals.** Devanagari digits and ASCII digits both appear in these
  documents, including in dates and years. Normalise deliberately and record
  which form the source used.
- **Dates.** Sources use Bikram Sambat and Gregorian, sometimes in one document.
  Never convert silently; store what the source said plus the interpretation.

## Language in the product

Nepali and English are both first-class for students and for contributors. Do
not build anything that assumes English input, and do not mark a Nepali-language
issue report as lower quality.
