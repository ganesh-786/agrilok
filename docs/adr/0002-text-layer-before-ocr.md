# ADR-0002: Parse the PDF text layer before falling back to OCR

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** @ganesh-786

## Context

The corpus is government PDFs: curricula, vacancy notices, past papers, gazette
entries. They arrive in two very different forms:

- **Born-digital PDFs**, which contain an embedded text layer.
- **Scans**, which are images of paper, common in older archives.

Devanagari OCR accuracy is strongly dependent on scan quality. Published
measurements show accuracy falling sharply from clean scans to poor ones. A
misread Devanagari character does not produce obvious garbage - it can produce a
different, valid word. That is precisely the failure mode this project cannot
tolerate, because it puts a wrong fact in front of a student with no visible
signal that anything went wrong.

Comparative work on Nepali PDF extraction finds that parsing an existing text
layer outperforms running OCR over the same document.

## Options considered

### Option A - OCR everything, uniformly

One code path, no branching, no detection logic. But it throws away perfect text
in born-digital PDFs and replaces it with a lossy guess, and it makes every
document carry OCR's error rate. Rejected outright - it degrades the documents
we have the best data for.

### Option B - Text layer only, skip scans

Highest accuracy, but it discards a large part of the historical archive,
including many past papers. Rejected: those documents are among the most useful
to aspirants.

### Option C - Text layer first, OCR as a scored fallback

Detect whether a usable text layer exists. Use it if so. Otherwise OCR with
`nep+eng`, attach a confidence score, and route low-confidence output to
mandatory human review.

## Decision

Extraction tries the PDF text layer first and falls back to OCR only when there
is genuinely no usable text layer.

- OCR runs with `nep+eng` together, not `nep` alone - these documents mix scripts,
  especially for technical and scientific terms.
- Every extraction records `extraction_method` (`text_layer` | `ocr`) and
  `extraction_confidence`.
- Below `OCR_MIN_CONFIDENCE`, the document goes to the human review queue before
  it may answer anything.
- **OCR-derived content cannot be cleared by reading the extraction.** A reviewer
  compares against the source PDF itself. Reviewing OCR output against OCR output
  proves nothing.

## Consequences

### Good

- The best-quality documents are extracted losslessly.
- The error-prone path is explicitly labelled and gated behind human review.
- `extraction_method` on every chunk makes the risky content queryable, so it can
  be audited as a group rather than discovered one wrong answer at a time.

### Bad

- Two code paths to maintain and test.
- "Usable text layer" is a judgement call. Some PDFs have a text layer that is
  itself the output of bad OCR - detection must consider quality, not just
  presence, and this will get it wrong sometimes.
- OCR is slow and adds a Tesseract dependency with Devanagari language data.
- Review load concentrates on the older, scanned, often most-wanted documents.

### Neutral

- Library choice is deliberately swappable. PyMuPDF is fast but **AGPL-3.0**,
  which has real licensing implications for anyone deploying a fork privately
  (see [NOTICE](../../NOTICE)); pdfplumber and pypdfium2 are permissive
  alternatives. The extraction interface keeps this a configuration decision.

## Verification

This decision is wrong if:

- A significant share of text-layer extractions turn out to be bad OCR passed
  through as trustworthy - detectable as content errors reported against chunks
  with `extraction_method = text_layer`.
- OCR confidence scores do not correlate with actual review outcomes, meaning
  the gate is not selecting the right documents.

Track content-error reports segmented by `extraction_method`. If the two rates
converge, the distinction is not earning its complexity.

## References

- Comparative study of Nepali PDF text extraction versus OCR
- Tesseract Devanagari preprocessing accuracy measurements
- [docs/nepali-devanagari.md](../nepali-devanagari.md)
