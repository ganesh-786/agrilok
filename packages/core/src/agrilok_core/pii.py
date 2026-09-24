"""Keep personal data out of the model (CLAUDE.md rule 7, docs/privacy.md).

Free-tier Gemini content may be used by the provider and read by human
reviewers. A question that carries an email address or a phone number is
stopped here, before it reaches the model or the answer cache, and the student
is asked to remove it. This cannot recognise a name; the interface tells
students not to type personal details, and this catches what it can.
"""

from __future__ import annotations

import re

from agrilok_core.text import to_ascii_digits

_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# Nepali mobile numbers (98x, 97x, 96x), with or without +977, allowing the
# spaces and dashes people type. Landlines with an area code (01-4xxxxxx).
_MOBILE = re.compile(r"(?<![0-9])(?:\+?977[\s-]?)?9[6-8][0-9](?:[\s-]?[0-9]){7}(?![0-9])")
_LANDLINE = re.compile(r"(?<![0-9])0[1-9][0-9]?[\s-][0-9]{6,7}(?![0-9])")


def find_personal_data(text: str) -> list[str]:
    """Kinds of personal data found, for example ["email", "phone"]. Empty if none."""
    ascii_text = to_ascii_digits(text)
    found: list[str] = []
    if _EMAIL.search(ascii_text):
        found.append("email")
    if _MOBILE.search(ascii_text) or _LANDLINE.search(ascii_text):
        found.append("phone")
    return found
