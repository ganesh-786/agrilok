# Extraction findings — a real Phase 0 result, not a hypothesis

This file is committed (unlike the rest of `reports/`) because it documents a
finding that should feed back into [ADR-0002](../../docs/adr/0002-text-layer-before-ocr.md)
and [docs/nepali-devanagari.md](../../docs/nepali-devanagari.md), not just
describe one run of the spike.

## The finding

**8 of the 18 verified source documents (44%) have a text layer that
extracts without error but is unreadable Devanagari** — not because the PDF
is a scan, but because the Devanagari content is encoded in a legacy 8-bit
font (Preeti, Kalimati, or similar) rather than Unicode. Neither extraction
backend tested (pdf-parse / pdf.js, or this environment's pdftotext, an xpdf
4.06 build) can recover real text from these — the bytes that come out are
literal, not a decoding bug on the tool's part. `प्रदेश लोक सेवा आयोग`
("Provincial Public Service Commission") extracts as `k|b]z nf]s ;]jf cfof]u`.

Affected: LUM-05, LUM-06, LUM-07, LUM-08, LUM-09, LUM-10, SUD-02, SUD-04.

Not affected — these extracted genuine Devanagari Unicode cleanly: LUM-01,
LUM-02, LUM-03, LUM-04, SUD-01, SUD-03, GAN-01, GAN-03, GAN-04. GAN-02 is a
borderline mixed case (real Devanagari present, some elevated symbol density
alongside it — see the detector below); not flagged, but worth a manual
glance before trusting it fully.

## Why this matters beyond this spike

[ADR-0002](../../docs/adr/0002-text-layer-before-ocr.md) frames extraction as
a two-way branch: text layer present → parse it; no text layer (a scan) → OCR
it. This finding shows a third case the ADR doesn't name: **text layer
present, extracts cleanly, and is still wrong** — because it isn't Unicode
text at all, just bytes that render correctly only through a specific
non-standard font. A pipeline that only checks "did extraction produce
output" would ingest this silently and correctly, with no error, no low
"confidence" score from an OCR engine — nothing to catch it except actually
looking at what came out.

This is exactly the mechanism [docs/nepali-devanagari.md](../../docs/nepali-devanagari.md)
warns about in the abstract ("Devanagari OCR on poor scans degrades badly");
this spike found the same failure mode with **zero OCR involved** and on
**44% of a small, real sample** — a materially higher rate than a general
"handle it if it comes up" plan would suggest is needed. Phase 1's ingestion
service should detect this class of file specifically, not fold it into the
generic OCR-confidence path.

## The detector, and why the first version of it was wrong

`extract.mjs`'s `analyzeExtraction()` flags a document when more than 1% of
its non-whitespace characters are drawn from a small set of symbols
(`] [ | ^ ~ { } \`) that are near-absent from real prose but appear
constantly when a Preeti/Kalimati-encoded byte stream is read as text — the
font maps Devanagari matras and conjuncts onto exactly those ASCII code
points.

The first version of this detector used "low Devanagari ratio AND low
English-word count" instead, and it missed all 8 corrupted documents on the
first real run. The reason: several of these files genuinely mix real
English phrases (`Written Examination`, `Group Test`, `Interview`) with
Preeti-gibberish Nepali in the same document, so the English-word count
alone was high enough to suppress the flag. The fix came from actually
running the detector against the real corpus and reading what it missed —
not from reasoning about it in the abstract. Measured symbol density: clean
documents 0.0000–0.0001, corrupted documents 0.0084–0.0849 (one clear
outlier at the low end noted above, GAN-02, left unflagged deliberately).

## What this means for retrieval faithfulness testing

Chunks from the 8 flagged documents are **not excluded** from this spike's
corpus — excluding them would hide the finding rather than test its
consequences. Any golden-set answer that cites one of these documents should
be treated with extra scepticism during the manual faithfulness review:
either the retrieved chunk is genuinely unreadable (in which case a faithful
model should struggle to answer from it at all, which is itself informative)
or it happens to be an English-language passage within an otherwise
corrupted document.
