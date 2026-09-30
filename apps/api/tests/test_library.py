from __future__ import annotations

from agrilok_api.library import outline_from_chunks


def test_the_outline_keeps_real_units_and_drops_damaged_fragments() -> None:
    # Lines as the extraction left them in a real Level 7 syllabus (LUM-01).
    chunk = "\n".join(
        [
            "Section (B) - 25 Marks",
            "3. Soil Science",
            "3 वस्त",  # no full stop: not a unit at all
            "3. वस्त",  # the end of a wrapped line, three letters
            "4. \u093fह",  # starts with a vowel sign: a dotted circle on screen
            "1. नलम्खत परीक्षाको माध्यम भ\u093e\u093fा न",  # two vowel signs in a row
            "१. बाली विज्ञान",
        ]
    )
    entries = [(e.label, e.text) for e in outline_from_chunks([chunk])]
    assert entries == [
        ("", "Section (B) - 25 Marks"),
        ("3", "Soil Science"),
        ("१", "बाली विज्ञान"),
    ]
