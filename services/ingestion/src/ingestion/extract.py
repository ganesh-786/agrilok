"""PDF text extraction: the text layer first, never OCR by default (ADR-0002).

pypdfium2 recovers the same Devanagari as the spike's pdf.js-based extractor on
the real corpus (checked on four documents, counts identical), and its
license carries no copyleft obligation, unlike PyMuPDF (NOTICE).

OCR is not implemented. A PDF with no text layer is reported as needing OCR
and is not ingested, rather than entering the corpus as an empty document that
"extracted successfully" with no chunks, which the spike found happening
silently to a 91-page regulation and a 51-page Act.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

import pypdfium2 as pdfium

from ingestion.legacy_font import TextAnalysis, analyze_text

# Nothing real is shorter than this; a scanned PDF extracts to almost nothing.
MIN_TEXT_LAYER_CHARS = 200
BACKEND = "pypdfium2"


class NoTextLayerError(RuntimeError):
    """The PDF is a scanned image. It needs OCR with mandatory review (ADR-0002, ADR-0009)."""


@dataclass(frozen=True)
class Extraction:
    text: str
    pages: int
    analysis: TextAnalysis
    backend: str = BACKEND


@dataclass(frozen=True)
class FileFacts:
    checksum: str
    bytes: int


def file_facts(path: Path) -> FileFacts:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
            size += len(block)
    return FileFacts(checksum=digest.hexdigest(), bytes=size)


def extract_text_layer(path: Path) -> Extraction:
    pdf = pdfium.PdfDocument(str(path))
    try:
        pages = []
        for index in range(len(pdf)):
            page = pdf[index]
            textpage = page.get_textpage()
            pages.append(textpage.get_text_range())
            textpage.close()
            page.close()
        count = len(pdf)
    finally:
        pdf.close()
    # Page breaks become blank lines, which the chunker treats as paragraph
    # boundaries, as it did with the spike's extractor.
    text = "\n\n".join(p.replace("\r\n", "\n").replace("\r", "\n") for p in pages)
    analysis = analyze_text(text)
    if analysis.total_chars < MIN_TEXT_LAYER_CHARS:
        raise NoTextLayerError(
            f"{path.name}: {analysis.total_chars} characters from {count} pages. "
            "Almost certainly a scanned image; it needs OCR with a mandatory comparison "
            "against the PDF before it can be admitted (ADR-0009). OCR is not implemented yet."
        )
    return Extraction(text=text, pages=count, analysis=analysis)
