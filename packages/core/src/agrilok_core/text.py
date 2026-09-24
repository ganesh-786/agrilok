"""Script-aware text normalisation shared by retrieval, the cache and the support check.

Devanagari extraction in this corpus is lossy: matras are misplaced or lost,
letters drop out ("हक" extracts as "िक"), and words are split by stray spaces
("क ृ षि"). Comparing raw strings misses the same word written two ways, so
words are compared on a consonant skeleton: vowel signs and other marks are
dropped, digits are ASCII, and everything that is not a letter or digit is a
space. See docs/nepali-devanagari.md.

Python note for anyone editing the patterns: `\\d` in Python matches
Devanagari digits too, unlike in JavaScript, where these rules were first
measured. Digit classes here are written `[0-9]` on purpose.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter

DEVANAGARI_DIGITS = "०१२३४५६७८९"
_TO_ASCII = str.maketrans({d: str(i) for i, d in enumerate(DEVANAGARI_DIGITS)})

# Signs, vowel marks, nukta, virama and joiners: U+0900-0903, U+093A-094F,
# U+0951-0957, U+0962-0963, ZWNJ and ZWJ.
DROP_MARKS = re.compile("[ऀ-ःऺ-ॏ॑-ॗॢॣ‌‍]")
# Everything that is not a-z, 0-9 or a Devanagari letter (U+0904-0939,
# U+0958-0961, U+0972-097F).
_NON_WORD = re.compile("[^a-z0-9ऄ-हक़-ॡॲ-ॿ]+")
DEVANAGARI = re.compile("[ऀ-ॿ]")
_JOIN_SPLIT_DEVANAGARI = re.compile("([ऀ-ॿ]) (?=[ऀ-ॿ])")
_UNICODE_ESCAPE = re.compile(r"\\u([0-9a-fA-F]{4})")
_BYTE_ESCAPE = re.compile(r"\\x[0-9a-fA-F]{2}")

# Nepali case endings and postpositions, on their skeletons (मा -> म, को -> क,
# लाई -> ल, बाट -> बट, हरू -> हर). The same noun turns up as संघमा in one
# text and संघको in another; comparing stems lets them meet. Order matters:
# longer endings first.
NE_SUFFIXES = ("हरक", "हरल", "हरम", "बट", "सग", "हर", "म", "क", "ल")


def to_ascii_digits(text: str) -> str:
    return text.translate(_TO_ASCII)


def skeleton(word: str) -> str:
    return DROP_MARKS.sub("", to_ascii_digits(word))


def normalize(text: str) -> str:
    """Lowercase, ASCII digits, Devanagari reduced to consonants, punctuation to spaces."""
    lowered = to_ascii_digits(str(text).lower())
    return _NON_WORD.sub(" ", DROP_MARKS.sub("", lowered)).strip()


def decode_escapes(text: str) -> str:
    """Undo literal escape codes a model writes for characters it cannot reproduce."""
    decoded = _UNICODE_ESCAPE.sub(lambda m: chr(int(m.group(1), 16)), str(text))
    return _BYTE_ESCAPE.sub("", decoded)


def compact(text: str) -> str:
    """Matching form: escapes decoded, normalised, and split Devanagari words rejoined."""
    return _JOIN_SPLIT_DEVANAGARI.sub(r"\1", normalize(decode_escapes(text)))


def stem(term: str) -> str:
    for suffix in NE_SUFFIXES:
        if term.endswith(suffix) and len(term) - len(suffix) >= 2:
            return term[: -len(suffix)]
    return term


def is_devanagari(token: str) -> bool:
    return DEVANAGARI.search(token) is not None


# --- Search terms (BM25 index and queries, ADR-0013) --------------------------

_EN_SEARCH_STOPWORDS = frozenset(
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
        "do",
        "does",
        "did",
        "can",
        "could",
        "should",
        "would",
        "will",
        "shall",
        "may",
        "might",
        "must",
        "has",
        "have",
        "had",
        "not",
        "no",
        "yes",
        "any",
        "all",
        "also",
        "such",
        "than",
        "then",
        "there",
        "their",
        "them",
        "they",
        "we",
        "you",
        "your",
        "our",
        "i",
        "me",
        "my",
        "he",
        "she",
        "his",
        "her",
        "about",
        "into",
        "over",
        "under",
    ]
)
# Function words, on their skeletons. A single-letter fragment is only glued to
# the next token when it is not one of these standalone words.
_NE_SEARCH_STOPWORDS = frozenset(
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
        "के",
        "कुन",
        "कति",
        "किन",
        "कसरी",
        "कहाँ",
        "कसको",
        "हुन्",
        "हुन्",
    ]
)
_STANDALONE_SINGLE = frozenset({"र", "व", "छ", "न", "त"})


def _merge_split_fragments(tokens: list[str]) -> list[str]:
    """Rejoin a word that extraction broke apart at a vowel sign.

    "क ृ षि" normalises to the tokens "क", "ष". A lone Devanagari consonant is
    almost never a word by itself, so it is glued to the token that follows.
    Genuine one-letter words ("र", and) are left alone.
    """
    merged: list[str] = []
    carry = ""
    for token in tokens:
        if carry:
            if is_devanagari(token):
                token = carry + token
            else:
                merged.append(carry)
            carry = ""
        if is_devanagari(token) and len(token) == 1 and token not in _STANDALONE_SINGLE:
            carry = token
            continue
        merged.append(token)
    if carry:
        merged.append(carry)
    return merged


def search_terms(text: str) -> Counter[str]:
    """Index terms for BM25: the same function for chunks and for questions."""
    terms: Counter[str] = Counter()
    for token in _merge_split_fragments(normalize(text).split()):
        if is_devanagari(token):
            if token in _NE_SEARCH_STOPWORDS:
                continue
            stemmed = stem(token)
            if len(stemmed) < 2:
                continue
            terms[stemmed] += 1
        elif token.isdigit():
            # Article numbers, years and marks matter ("Article 36", "2045");
            # single digits are mostly list numbering.
            if len(token) >= 2:
                terms[token.lstrip("0") or "0"] += 1
        else:
            if len(token) < 2 or token in _EN_SEARCH_STOPWORDS:
                continue
            if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
                token = token[:-1]
            terms[token] += 1
    return terms


# --- Question normalisation for the exact-match cache ---------------------------

_TRAILING_PUNCT = re.compile(r"[\s?？!.।॥]+$")
_SPACES = re.compile(r"\s+")


def question_key(question: str) -> str:
    """A light normalisation for exact cache hits.

    Deliberately lighter than `normalize`: two questions only count as the same
    question here if they differ in case, spacing, digit script or trailing
    punctuation. Anything looser is the semantic cache's job, and it shows the
    student which question it matched.
    """
    text = unicodedata.normalize("NFC", to_ascii_digits(question)).lower()
    return _TRAILING_PUNCT.sub("", _SPACES.sub(" ", text)).strip()
