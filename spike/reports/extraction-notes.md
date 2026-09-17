# Extraction findings — a real Phase 0 result, not a hypothesis

This file is committed (unlike the rest of `reports/`) because it documents a
finding that should feed back into [ADR-0002](../../docs/adr/0002-text-layer-before-ocr.md)
and [docs/nepali-devanagari.md](../../docs/nepali-devanagari.md), not just
describe one run of the spike.

## The finding

**Much of the Devanagari in these official documents extracts without error
and is still unreadable** — not because the PDF is a scan, but because it is
encoded in a legacy 8-bit font (Preeti, Kalimati, or similar) rather than
Unicode. Neither extraction backend tested (pdf-parse / pdf.js, or this
environment's pdftotext, an xpdf 4.06 build) can recover real text from it —
the bytes that come out are literal, not a decoding bug on the tool's part.
`प्रदेश लोक सेवा आयोग` ("Provincial Public Service Commission") extracts as
`k|b]z nf]s ;]jf cfof]u`.

Measured per line, across all 18 documents: **785 legacy-font lines in 10
documents.**

| Document | Gibberish lines / substantial lines |
|---|---|
| SUD-04 | 195 / 234 |
| SUD-02 | 192 / 229 |
| LUM-08 | 135 / 162 |
| LUM-06 | 59 / 505 |
| LUM-05 | 52 / 420 |
| LUM-07 | 42 / 217 |
| LUM-09 | 42 / 231 |
| LUM-10 | 42 / 241 |
| GAN-02 | 25 / 338 |
| GAN-04 | 1 / 43 |

The other 8 (LUM-01 to LUM-04, SUD-01, SUD-03, GAN-01, GAN-03) contain none.

Three documents are almost entirely unreadable. The rest are mostly clean
English with Preeti Nepali mixed in, which is why document-level detection
turned out to be the wrong unit — see below.

## Why this matters beyond this spike

[ADR-0002](../../docs/adr/0002-text-layer-before-ocr.md) frames extraction as
a two-way branch: text layer present → parse it; no text layer (a scan) → OCR
it. This finding shows a third case the ADR doesn't name: **text layer
present, extracts cleanly, and is still wrong** — because it isn't Unicode
text at all, just bytes that render correctly only through a specific
non-standard font. A pipeline that only checks "did extraction produce
output" would ingest this silently, with no error and no low confidence score
from an OCR engine — nothing to catch it except actually looking at what came
out.

[docs/nepali-devanagari.md](../../docs/nepali-devanagari.md) warns about
Devanagari degrading under OCR. This spike found the same outcome with **zero
OCR involved**, in 10 of 18 real documents. Phase 1's ingestion service should
detect this class of text specifically, not fold it into the generic
OCR-confidence path.

## The detector, and the two versions that were wrong

The current detector is `lib/corruption.mjs`. It works per line: a line is
gibberish when it has no real Devanagari code point and at least 30% of its
tokens look like Preeti fragments — symbols embedded inside a token
(`k|b]z`, `t/sf/L`) or Latin-1 characters Preeti emits and English syllabus
text does not (`Í å ÷ §`).

It got there through two wrong versions, both found by running against the
real corpus rather than by reasoning about it:

1. **Low Devanagari ratio and low English-word count, per document.** Missed
   every affected document on its first run, because they mix real English
   phrases (`Written Examination`, `Group Test`) with Preeti in the same file.
2. **Symbol density above 1%, per document.** Correctly flagged 8 documents,
   but the document was the wrong unit in both directions. It flagged LUM-06
   as corrupted, yet LUM-06's soil science section is clean English that a
   student query should be able to use. And it missed GAN-02 and GAN-04,
   which contain real gibberish lines under a low overall density.

Measured accuracy of the line-level version on this corpus:

- **No false positives** on genuine English or Unicode Devanagari. Every line
  it flags in a "clean" document is real gibberish. One false positive found
  during tuning (`Section A– 30 Marks`, caused by an en dash) was fixed.
- **About 5.5% of kept lines in affected documents still carry a Preeti
  marker.** These are mixed lines where the English half carries meaning,
  such as `k|yd kq (Paper I): General Subject`, and they are kept on purpose.

## What happens to these lines now

`extract.mjs` writes the extracted text unmodified — it is the evidence of
what the PDF contained — and reports the counts above. `chunk.mjs` removes the
gibberish lines before chunking and records the number on every chunk from
that source, in `gibberishLinesDroppedFromSource`.

Before this, gibberish took retrieval slots. The first live query, "What are
the main soil forming processes?", returned `LUM-06-021` as one of its six
chunks, and that chunk is nothing but Preeti bytes. Removing gibberish does
not by itself explain or fix that query's refusal; it only stops unreadable
text from competing for the slots.
