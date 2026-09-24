"""Turn the model's [chunk_id] citations into numbered, checkable references.

ADR-0003: never an answer without citations, never an invented one. A bracket
that names a chunk the model was not given is not dropped quietly; it makes
the whole answer unsupported, because a claim was pinned to a source that does
not exist.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Collection
from dataclasses import dataclass

_BRACKET = re.compile(r"\[([^\[\]\n]{1,200})\]")
# Chunk ids look like "LUM-01-005" or "REF-04-031".
_CHUNK_ID = re.compile(r"^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-[0-9]{3}$")


class InventedCitationError(ValueError):
    def __init__(self, ids: list[str]) -> None:
        super().__init__(f"the answer cites sources it was not given: {', '.join(ids)}")
        self.ids = ids


@dataclass(frozen=True)
class NumberedAnswer:
    text: str
    order: list[str]  # chunk ids in order of first citation


def number_citations(answer: str, known_ids: Collection[str]) -> NumberedAnswer:
    """Replace "[LUM-01-005, REF-04-031]" with "[1][2]", numbered by first appearance."""
    order: dict[str, int] = {}
    invented: list[str] = []

    def replace(match: re.Match[str]) -> str:
        tokens = [t.strip() for t in match.group(1).split(",")]
        if not any(_CHUNK_ID.match(t) for t in tokens):
            return match.group(0)  # an ordinary bracket, not a citation
        markers = []
        for token in tokens:
            if token in known_ids:
                order.setdefault(token, len(order) + 1)
                markers.append(f"[{order[token]}]")
            elif _CHUNK_ID.match(token):
                invented.append(token)
        return "".join(markers)

    text = _BRACKET.sub(replace, answer)
    if invented:
        raise InventedCitationError(sorted(set(invented)))
    return NumberedAnswer(text=text.strip(), order=list(order))


def truncate_on_word(text: str, limit: int = 300) -> str:
    """Shorten a quote at a word boundary.

    Never cuts inside a word: a Devanagari conjunct or vowel sign split in
    half changes what the text says (docs/nepali-devanagari.md). Quotes are
    kept short on purpose, to quote only what the question needs (NOTICE).
    """
    clean = " ".join(text.split())
    if len(clean) <= limit:
        return clean
    cut = clean.rfind(" ", 0, limit)
    if cut <= 0:
        # One unbroken run: back off until the cut is not inside a cluster
        # (before a vowel sign or other mark, or right after a virama).
        cut = limit
        while cut > 1 and (
            unicodedata.category(clean[cut]).startswith("M") or clean[cut - 1] == "्"
        ):
            cut -= 1
    return clean[:cut].rstrip(" ,;:") + " …"
