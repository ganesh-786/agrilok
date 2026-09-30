"""Detect legacy-font Devanagari (Preeti, Kalimati) extracted as if it were Unicode.

A PDF typed in a legacy 8-bit Nepali font has a text layer that extracts
without error into plausible-looking garbage ("k|b]z nf]s ;]jf cfof]u"). Found
in 10 of the first 18 real documents, so it is the common case, not an edge
case (spike/reports/extraction-notes.md).

Works per line, not per document: "corrupted" documents contain long runs of
clean English, and one "clean" document contained genuine gibberish lines.
Ported from spike/lib/corruption.mjs; every constant was measured there.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_DEVANAGARI = re.compile("[ऀ-ॿ]")
# Punctuation stripped from token edges. Dashes are included because
# "Section A– 30 Marks" was a real false positive without them.
_EDGE = re.compile("^[()\\[\\]{},.;:\"'`!?–—-]+|[()\\[\\]{},.;:\"'`!?–—-]+$")
_CLEAN_WORD = re.compile(r"^[A-Za-z][a-z]{2,}$|^[A-Z]{2,}$")
# Latin-1 characters Preeti emits but English syllabus text does not. Leaves
# out the three that do appear in clean documents: °, µ and ×.
_PREETI_ONLY = re.compile("[¡-¯±-´¶-ÖØ-ÿ]")
_LATIN = re.compile("[A-Za-z]")
_NOT_WORD_OR_NUMBER = re.compile("[^A-Za-z0-9.]")
_NON_LETTERS = re.compile("[^A-Za-z]+")

# Share of a line's tokens that must look like Preeti fragments for the line to
# count as gibberish. At 0.3 there were zero false positives on real English
# or Unicode Devanagari lines across 18 documents.
GIBBERISH_TOKEN_RATIO = 0.3
MIN_LINE_CHARS = 15


def _is_gibberish_token(raw: str) -> bool:
    token = _EDGE.sub("", raw)
    if not token:
        return False
    if _PREETI_ONLY.search(token):
        return True
    if not _LATIN.search(token):
        return False  # numbers and punctuation are neutral
    if not _NOT_WORD_OR_NUMBER.search(token):
        return False  # an ordinary word or number
    # An internal symbol. English does this for pairs of real words
    # ("Extension/Horticulture"); Preeti does it with fragments ("k|b]z").
    parts = [p for p in _NON_LETTERS.split(token) if p]
    return not all(_CLEAN_WORD.match(p) for p in parts)


def is_gibberish_line(line: str) -> bool:
    if len(re.sub(r"\s", "", line)) < MIN_LINE_CHARS:
        return False
    # Legacy-font output never contains a real Devanagari code point.
    if _DEVANAGARI.search(line):
        return False
    tokens = [t for t in line.split() if _EDGE.sub("", t)]
    if len(tokens) < 2:
        return False
    bad = sum(1 for t in tokens if _is_gibberish_token(t))
    return bad / len(tokens) >= GIBBERISH_TOKEN_RATIO


def remove_gibberish_lines(text: str) -> tuple[str, int]:
    """The text without gibberish lines, and how many were dropped, to record, not hide."""
    kept: list[str] = []
    dropped = 0
    for line in text.split("\n"):
        if is_gibberish_line(line):
            dropped += 1
        else:
            kept.append(line)
    return "\n".join(kept), dropped


@dataclass(frozen=True)
class TextAnalysis:
    total_chars: int
    devanagari_count: int
    substantial_lines: int
    gibberish_lines: int

    @property
    def gibberish_line_share(self) -> float:
        return self.gibberish_lines / self.substantial_lines if self.substantial_lines else 0.0

    @property
    def confidence(self) -> float:
        """The share of substantial lines that are readable text."""
        return round(1.0 - self.gibberish_line_share, 3)


def analyze_text(text: str) -> TextAnalysis:
    substantial = 0
    gibberish = 0
    for line in text.split("\n"):
        if len(re.sub(r"\s", "", line)) < MIN_LINE_CHARS:
            continue
        substantial += 1
        if is_gibberish_line(line):
            gibberish += 1
    return TextAnalysis(
        total_chars=len(re.sub(r"\s", "", text)),
        devanagari_count=len(_DEVANAGARI.findall(text)),
        substantial_lines=substantial,
        gibberish_lines=gibberish,
    )
