"""Split extracted text into overlapping chunks with their section headings.

Ported from spike/chunk.mjs, which produced the corpus the golden set was
measured on, so chunks built here match the chunks being searched.

Token counts are an approximation (words / 0.75). That is not a real
tokeniser, and it is measurably wrong for Devanagari, which tokenises less
efficiently (docs/nepali-devanagari.md). It decides where to cut, nothing
that must fit a hard limit; replacing it is a measured change.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

WORDS_PER_TOKEN = 0.75

# Numbered outline markers ("1.2.3", "Section (B)", "३.") that these syllabi
# use heavily. Best effort: metadata for a human skimming results.
# `[0-9]`, not `\d`: Python's `\d` also matches Devanagari digits, which the
# spike's JavaScript pattern did not.
_HEADING = re.compile(r"^(?:[0-9]+(?:\.[0-9]+)*\.?\s+\S|Section\s*\([A-Z]\)|[०-९]+\.)")
_BLANK_LINES = re.compile(r"\n{2,}")
_INLINE_SPACE = re.compile(r"[ \t]+")


def approx_tokens(text: str) -> int:
    return round(len(text.split()) / WORDS_PER_TOKEN)


@dataclass(frozen=True)
class Chunk:
    text: str
    section_heading: str | None


def _paragraphs(text: str, target_tokens: int) -> list[str]:
    blocks = [b.strip() for b in _BLANK_LINES.split(text) if b.strip()]
    paragraphs: list[str] = []
    for block in blocks:
        collapsed = _INLINE_SPACE.sub(" ", block).strip()
        if approx_tokens(collapsed) <= target_tokens:
            paragraphs.append(collapsed)
            continue
        # Blank lines in extracted PDFs mostly mark page breaks, not
        # paragraphs, so an oversized block is split on single newlines.
        for line in block.split("\n"):
            cleaned = _INLINE_SPACE.sub(" ", line).strip()
            if cleaned:
                paragraphs.append(cleaned)
    return paragraphs


def chunk_text(text: str, target_tokens: int = 400, overlap_ratio: float = 0.15) -> list[Chunk]:
    chunks: list[Chunk] = []
    current: list[str] = []
    current_tokens = 0
    heading: str | None = None

    def flush() -> None:
        if current:
            chunks.append(Chunk(text="\n\n".join(current), section_heading=heading))

    for para in _paragraphs(text, target_tokens):
        if _HEADING.match(para) and len(para) < 120:
            heading = para
        para_tokens = approx_tokens(para)
        if current_tokens + para_tokens > target_tokens and current:
            flush()
            # Overlap: carry the last overlap_ratio of the target forward, cut
            # at word level. Carrying whole paragraphs made near-duplicate
            # chunks that crowded several retrieval slots at once.
            overlap_words = round(target_tokens * overlap_ratio * WORDS_PER_TOKEN)
            tail = " ".join("\n\n".join(current).split()[-overlap_words:]) if overlap_words else ""
            current = [tail] if tail else []
            current_tokens = approx_tokens(tail)
        current.append(para)
        current_tokens += para_tokens
    flush()
    return chunks
