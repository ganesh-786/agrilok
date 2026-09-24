"""Deterministic support check (ADR-0008, Option C). Runs after generation, before display.

No model calls. The model returns, for every factual claim, the id of ONE
source chunk and a quote copied from it. Each claim is checked for three
things:

1. the quote exists in that chunk as one contiguous passage, not stitched
   together from separate places;
2. every number in the claim appears in the quote (or the heading above it,
   or the question);
3. enough of the claim's key words appear in the quote itself, and none are
   taken from the numbered item next door.

Any failing claim downgrades the whole answer to a refusal.

This is a line-for-line port of `spike/lib/support-check.mjs`, the version the
golden set was measured with (35 of 37, PP-01 withheld 3 of 3 live). Every
threshold and rule below was set by a real failure; the comments say which.
`tests/test_support_check_parity.py` replays saved spike answers through both
implementations and requires identical verdicts, so do not "tidy" a rule here
without re-measuring it.

Why a quote and not plain word overlap: in PP-01 the cited chunk contains both
"Crop Cutting" and "Secondary data", in two separate numbered syllabus items.
A check that only asks "are the claim's words somewhere in the chunk" passes
it. Requiring one passage that states the whole claim does not.

Known limits, measured rather than assumed away: a claim in English over a
Nepali quote cannot be word-checked (only the quote and its numbers are), so a
mistranslated label can still pass. A heading with exactly two items, quoted
whole, with a claim that wrongly relates them, still passes.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

from agrilok_core.text import compact, decode_escapes, normalize, skeleton, stem, to_ascii_digits

_EN_STOPWORDS = frozenset(
    [
        "the",
        "a",
        "an",
        "of",
        "and",
        "or",
        "to",
        "in",
        "on",
        "for",
        "from",
        "by",
        "with",
        "as",
        "at",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "this",
        "that",
        "these",
        "those",
        "it",
        "its",
        "which",
        "what",
        "who",
        "whom",
        "whose",
        "how",
        "why",
        "when",
        "where",
        "according",
        "source",
        "sources",
        "provided",
        "material",
        "states",
        "stated",
        "under",
        "section",
        "article",
        "nepal",
        "nepali",
        "constitution",
        "also",
        "such",
        "any",
        "all",
        "not",
        "no",
    ]
)

# Common Nepali function words, compared on their skeletons. Structural words
# (article, sub-article, clause, schedule) label where a provision sits; they
# are not part of what it says.
_NE_STOPWORDS = frozenset(
    skeleton(w)
    for w in [
        "र",
        "को",
        "का",
        "की",
        "मा",
        "ले",
        "लाई",
        "हो",
        "छ",
        "छन",
        "हुने",
        "हुन्छ",
        "गर्ने",
        "गरी",
        "भएको",
        "यो",
        "त्यो",
        "पनि",
        "वा",
        "तथा",
        "सम्बन्धी",
        "अनुसार",
        "बमोजिम",
        "लागि",
        "रहेको",
        "गरिएको",
        "छ",
        "धारा",
        "उपधारा",
        "खण्ड",
        "अनुसूची",
        "परिच्छेद",
        "भाग",
    ]
)

_DEVANAGARI = re.compile("[ऀ-ॿ]")
_NUMBER = re.compile(r"[0-9]+(?:\.[0-9]+)?")
_LEADING_ZEROS = re.compile(r"^0+(?=[0-9])")

# How far above the quoted passage a heading number may sit (characters of
# normalised text).
HEADING_WINDOW = 600

# Numbered items: dotted numerals ("6.10.", "3.1.1"), parenthesised numerals
# ("(१२)" after digit conversion) and Devanagari letter items ("(क)", "ख)").
# JavaScript's `(?<=^|\s)` becomes `(?<!\S)`: Python needs fixed-width
# lookbehind, and "start or whitespace" is the same thing.
_MARKER = re.compile(
    r"(?<![0-9.])([0-9]+(?:\.[0-9]+)*)\.(?=\s)"
    r"|(?<![0-9.])([0-9]+(?:\.[0-9]+)+)(?=\s)"
    r"|\(([0-9]+)\)"
    r"|\(([क-ह])\)"
    r"|(?<!\S)([क-ह])\)"
)


@dataclass(frozen=True)
class Thresholds:
    # Share of the quote's trigrams found in one window of the chunk. Of 37
    # genuine quotes on a live run, 36 scored 0.87 or higher; stitched quotes
    # scored 0.55 and invented ones 0.27.
    quote_match: float = 0.85
    # A claim term the cited chunk contains, but outside the quoted passage.
    # At or above this share of checkable terms, the claim is taken to be
    # assembled from separate places.
    stitched_share: float = 0.34


THRESHOLDS = Thresholds()


@dataclass(frozen=True)
class Term:
    term: str
    devanagari: bool


@dataclass
class ClaimResult:
    claim: str
    source_id: str
    quote: str
    ok: bool
    reason: str | None = None
    quote_match: float | None = None
    stitched: list[str] = field(default_factory=list)
    note: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "claim": self.claim,
            "source_id": self.source_id,
            "quote": self.quote,
            "ok": self.ok,
            "reason": self.reason,
            "quote_match": self.quote_match,
            "stitched": list(self.stitched),
            "note": self.note,
        }


@dataclass
class SupportResult:
    supported: bool
    reason: str | None
    results: list[ClaimResult]


def _numbers_in(text: str) -> list[str]:
    """Numbers in order of first appearance (JavaScript Set semantics)."""
    seen: dict[str, None] = {}
    for n in _NUMBER.findall(to_ascii_digits(str(text))):
        seen.setdefault(_LEADING_ZEROS.sub("", n), None)
    return list(seen)


def _key_terms(text: str) -> list[Term]:
    out: list[Term] = []
    for raw in normalize(text).split(" "):
        if not raw or (raw[0].isascii() and raw[0].isdigit()):
            continue
        devanagari = _DEVANAGARI.search(raw) is not None
        if devanagari:
            # A stem under 3 consonants ("जव") matches unrelated words by
            # chance; on a live run it flagged a correct PP-16 answer.
            if len(stem(raw)) < 3 or raw in _NE_STOPWORDS:
                continue
        elif len(raw) < 4 or raw in _EN_STOPWORDS:
            continue
        out.append(Term(raw, devanagari))
    return out


def _trigrams(s: str) -> set[str]:
    padded = f" {s} "
    return {padded[i : i + 3] for i in range(len(padded) - 2)}


def _plain_trigrams(s: str) -> set[str]:
    return {s[i : i + 3] for i in range(len(s) - 2)}


@dataclass(frozen=True)
class WindowMatch:
    score: float
    window: str


def best_window_match(quote: str, chunk: str) -> WindowMatch:
    """Best contiguous match of `quote` inside `chunk`.

    Slides a window the length of the quote across the chunk and takes the
    highest trigram containment. A quote assembled from two distant passages
    cannot score well in any single window.
    """
    q = compact(quote)
    c = compact(chunk)
    if not q:
        return WindowMatch(0.0, "")
    if q in c:
        return WindowMatch(1.0, q)
    q_grams = _trigrams(q)
    length = len(q)
    best = WindowMatch(0.0, "")
    step = max(1, length // 10)
    last_start = max(0, len(c) - math.floor(length * 0.8))
    for start in range(0, last_start + 1, step):
        for size in (math.floor(length * 0.9), length, math.ceil(length * 1.15)):
            window = c[start : start + size]
            w_grams = _trigrams(window)
            hit = sum(1 for g in q_grams if g in w_grams)
            score = hit / len(q_grams)
            if score > best.score:
                best = WindowMatch(score, window)
    return best


def _term_present(t: Term, text: str) -> bool:
    """A term counts as present if it, or something close to it, appears in the text.

    Devanagari is compared with spaces removed, because extraction splits
    words ("स ं विधान"), and on stems. Latin is compared word by word.
    """
    if t.devanagari:
        flat = text.replace(" ", "")
        s = stem(t.term)
        if s in flat:
            return True
        if len(s) < 4:
            return False
        tg = _plain_trigrams(s)
        fg = _plain_trigrams(flat)
        hit = sum(1 for g in tg if g in fg)
        # 0.66, not 0.67: a damaged word that keeps two of its three trigrams
        # scores 0.667 and must count (PP-16, "बायोग्यासको" extracted without ब).
        return hit / len(tg) >= 0.66
    words = text.split(" ")
    bare = t.term[:-1] if t.term.endswith("s") else t.term
    return any(w == t.term or (w[:-1] if w.endswith("s") else w) == bare for w in words)


@dataclass(frozen=True)
class _Marker:
    index: int
    key: str
    label: str
    dotted: str | None


def _markers_in(raw_text: str) -> list[_Marker]:
    out: list[_Marker] = []
    text = to_ascii_digits(raw_text)
    for m in _MARKER.finditer(text):
        dotted = m.group(1) or m.group(2)
        if dotted:
            parts = dotted.split(".")
            key = f"n{len(parts)}:{'.'.join(parts[:-1])}"
            label = dotted
        elif m.group(3):
            key, label = "p", f"({m.group(3)})"
        elif m.group(4):
            key, label = "pl", f"({m.group(4)})"
        else:
            key, label = "l", f"{m.group(5)})"
        out.append(_Marker(m.start(), key, label, dotted))
    return out


@dataclass(frozen=True)
class _Siblings:
    segments: list[str]
    items: list[str]
    preamble: str
    siblings: bool


def _sibling_segments(raw_quote: str) -> _Siblings:
    """Split a quote at sibling items (6.9 then 6.10).

    Two items at the same level are siblings, and being next to each other
    does not connect them. On a live run PP-01 quoted "6.9 ... Secondary data"
    and "6.10 Crop Cutting" as one unbroken passage, so a contiguity check
    passed a claim neither item makes.
    """
    marks = _markers_in(raw_quote)
    counts: dict[str, int] = {}
    for m in marks:
        counts[m.key] = counts.get(m.key, 0) + 1
    splits = [m.index for m in marks if counts[m.key] >= 2]
    if len(splits) < 2:
        return _Siblings([raw_quote], [], "", False)
    text = to_ascii_digits(raw_quote)
    preamble = text[: splits[0]]
    items = [
        text[start : splits[i + 1] if i + 1 < len(splits) else len(text)]
        for i, start in enumerate(splits)
    ]
    return _Siblings([preamble + " " + item for item in items], items, preamble, True)


def _parent_heading(raw_quote: str, raw_chunk: str) -> str:
    """The headings above the quote's first item, looked up in the source.

    "3.1" and "3" above "3.1.1", "6" above "6.10", or the article ("36.")
    above a clause "(३)". A claim may restate them ("the General Introduction
    of Soil Science", "Article 36") without that counting as borrowed words.
    All ancestors, not just the parent: SMOKE-01 names heading 3 while quoting
    3.1.1.
    """
    marks = _markers_in(raw_quote)
    if not marks:
        return ""
    first = marks[0]
    chunk = to_ascii_digits(raw_chunk)
    at = chunk.find(first.dotted if first.dotted is not None else first.label)
    if at < 0:
        return ""
    before = chunk[:at]
    ancestors: list[str | None] = []
    if first.dotted and "." in first.dotted:
        parts = first.dotted.split(".")
        ancestors.extend(".".join(parts[:n]) for n in range(len(parts) - 1, 0, -1))
    else:
        ancestors.append(None)
    out: list[str] = []
    for a in ancestors:
        # A bare top-level number needs its dot, or "3 घण्टा" (3 hours) would
        # pass for heading 3.
        if a:
            optional_dot = "?" if "." in a else ""
            pattern = re.compile(rf"(?<![0-9.]){re.escape(a)}\.{optional_dot}(?=\s)")
        else:
            pattern = re.compile(r"(?<![0-9.])[0-9]+\.(?=\s)")
        last = -1
        for m in pattern.finditer(before):
            last = m.start()
        if last >= 0:
            out.append(chunk[last : min(at, last + 200)])
    return " ".join(out)


def _neighbour_items(raw_quote: str, raw_chunk: str) -> str:
    """The items directly before and after the quoted one, as source text.

    A claim word the quote lacks but a neighbouring item has is the PP-01
    pattern exactly ("crop cutting" from 6.10 pinned onto "secondary data" in
    6.9), so it fails however small a share of the claim it is. A flat,
    stricter share was tried first and withheld correct answers (SMOKE-01,
    PP-16), because common words recur far from the quote.
    """
    quote_marks = _markers_in(raw_quote)
    if not quote_marks:
        return ""
    chunk = to_ascii_digits(raw_chunk)
    chunk_marks = _markers_in(chunk)
    labels = {m.label for m in quote_marks}
    out: list[str] = []
    for key in dict.fromkeys(m.key for m in quote_marks):
        same = [m for m in chunk_marks if m.key == key]
        idx = [i for i, m in enumerate(same) if m.label in labels]
        if not idx:
            continue
        for i in (min(idx) - 1, max(idx) + 1):
            # JavaScript's same[-1] is undefined; Python's is the last item.
            if not 0 <= i < len(same):
                continue
            m = same[i]
            nxt = next((n for n in chunk_marks if n.index > m.index), None)
            end = min(nxt.index if nxt else len(chunk), m.index + 300)
            out.append(chunk[m.index : end])
    return " ".join(out)


def check_support(
    claims: list[dict[str, Any]] | None,
    chunk_text_by_id: dict[str, str],
    *,
    question: str = "",
    meta_by_id: dict[str, str] | None = None,
    thresholds: Thresholds = THRESHOLDS,
) -> SupportResult:
    """Check every claim against the one chunk it cites.

    `meta_by_id` holds, per chunk, its source title, province and service
    groups. The model is shown these in each <source> tag, so a claim that
    names the province or group a passage belongs to is using given context,
    not stitching (SMOKE-03 on a live run: "Veterinary Group" from the title).
    """
    meta = meta_by_id or {}
    # Numbers the question already contains ("Level 7", "Article 36") are
    # context the answer may restate, not facts it must quote.
    question_numbers = set(_numbers_in(question))
    if not isinstance(claims, list) or not claims:
        return SupportResult(False, "no claims were given to check", [])

    results = [
        _check_claim(c, chunk_text_by_id, meta, question, question_numbers, thresholds)
        for c in claims
    ]
    failed = [r for r in results if not r.ok]
    reason = "; ".join(f"{f.source_id}: {f.reason}" for f in failed) if failed else None
    return SupportResult(not failed, reason, results)


def _check_claim(
    c: dict[str, Any],
    chunk_text_by_id: dict[str, str],
    meta: dict[str, str],
    question: str,
    question_numbers: set[str],
    thresholds: Thresholds,
) -> ClaimResult:
    claim = str(c.get("claim") or "")
    source_id = str(c.get("source_id") or "")
    quote = str(c.get("quote") or "")
    chunk = chunk_text_by_id.get(source_id)
    if not chunk:
        return ClaimResult(
            claim, source_id, quote, False, f"cites {source_id}, which was not retrieved"
        )
    if not quote.strip():
        return ClaimResult(claim, source_id, quote, False, "no quote given")

    match = best_window_match(quote, chunk)
    score = round(match.score, 2)
    if match.score < thresholds.quote_match:
        return ClaimResult(
            claim, source_id, quote, False, "quote is not one passage of the cited chunk", score
        )

    passage = match.window
    # A number may also come from the heading just above the quoted passage:
    # quoting clause (3) of Article 36 and calling it "Article 36" is right
    # (U-02 on a live run). The window is limited to the text before the
    # passage, so a number from an unrelated later item still fails.
    chunk_norm = compact(chunk)
    at = chunk_norm.find(passage)
    heading = chunk_norm[max(0, at - HEADING_WINDOW) : at] if at > 0 else ""
    allowed = {*_numbers_in(passage), *_numbers_in(heading), *question_numbers}
    missing = [n for n in _numbers_in(claim) if n not in allowed]
    if missing:
        return ClaimResult(
            claim,
            source_id,
            quote,
            False,
            f"numbers not in the quoted passage: {', '.join(missing)}",
            score,
        )

    # Checkable terms are the claim's words that occur somewhere in the cited
    # chunk. Words that occur nowhere in it (a paraphrase, a translation, or a
    # word the lossy extraction mangled) cannot tell us anything, so they are
    # left out rather than counted as failures. Words from the source's title,
    # province and groups, or from the headings above the quote, are given
    # context and not counted either. Words from the question are context for
    # the share rule below ("agriculture officer syllabus", SMOKE-01), but
    # never for the neighbouring-item rule: PP-01's question itself says "crop
    # cutting", and exempting it there lets PP-01 through.
    decoded_quote = decode_escapes(quote)
    context_norm = compact(f"{meta.get(source_id, '')} {_parent_heading(decoded_quote, chunk)}")
    checkable = [
        t
        for t in _key_terms(claim)
        if _term_present(t, chunk_norm) and not _term_present(t, context_norm)
    ]
    if not checkable:
        return ClaimResult(
            claim,
            source_id,
            quote,
            True,
            quote_match=score,
            note="no claim words occur in the chunk; only the quote and numbers were checked",
        )

    # The claim must be stated inside one item. Without sibling items the
    # whole quoted passage is that item.
    sib = _sibling_segments(decoded_quote)
    # One exception: a quote that includes the heading the items sit under,
    # and a claim that names every item under it, is listing them ("the second
    # stage is a group test and an interview", SMOKE-03). That is a statement
    # about the heading, which the quote contains.
    enumeration = (
        sib.siblings
        and len(_key_terms(sib.preamble)) > 0
        and all(any(_term_present(t, compact(it)) for t in checkable) for it in sib.items)
    )
    siblings = sib.siblings and not enumeration
    candidates = [compact(s) for s in sib.segments] if siblings else [passage]
    # min() keeps the first of equally short lists, like the strict `<` it ports.
    best = min(
        ([t.term for t in checkable if not _term_present(t, cand)] for cand in candidates),
        key=len,
    )

    # Other items inside the quote count as neighbours too. The best item is
    # included harmlessly: by definition it lacks every missing word.
    in_quote = " ".join(sib.segments) if siblings else ""
    neighbour_norm = compact(f"{_neighbour_items(decoded_quote, chunk)} {in_quote}")
    from_neighbour = [
        t.term for t in checkable if t.term in best and _term_present(t, neighbour_norm)
    ]
    if from_neighbour:
        return ClaimResult(
            claim,
            source_id,
            quote,
            False,
            "the claim takes words from the neighbouring numbered item, not the quoted one: "
            + ", ".join(from_neighbour),
            score,
            best,
        )

    question_norm = compact(question)
    share_terms = [t for t in checkable if not _term_present(t, question_norm)]
    share_term_names = {t.term for t in share_terms}
    share_stitched = [term for term in best if term in share_term_names]
    share = len(share_stitched) / len(share_terms) if share_terms else 0.0
    if share >= thresholds.stitched_share:
        reason = (
            "the claim joins separate numbered items; no single item states it "
            f"(missing from the best item: {', '.join(best)})"
            if siblings
            else "the claim uses words from elsewhere in the chunk, not from the quoted passage: "
            + ", ".join(best)
        )
        return ClaimResult(claim, source_id, quote, False, reason, score, best)
    return ClaimResult(claim, source_id, quote, True, quote_match=score, stitched=best)
