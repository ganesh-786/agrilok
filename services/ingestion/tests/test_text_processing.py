from __future__ import annotations

import pytest

from ingestion.chunking import approx_tokens, chunk_text
from ingestion.legacy_font import analyze_text, is_gibberish_line, remove_gibberish_lines
from ingestion.manifest import ManifestError, OutOfScopeError, parse_entry


@pytest.mark.parametrize(
    "line",
    [
        "k|b]z nf]s ;]jf cfof]u, n'lDagL k|b]z",  # Preeti-encoded heading
        "o; kf7\\oqmd of]hgfnfO{ b'O{ r/0fdf ljefhg ul/Psf] 5",
    ],
)
def test_legacy_font_lines_are_detected(line: str) -> None:
    assert is_gibberish_line(line)


@pytest.mark.parametrize(
    "line",
    [
        "Section A– 30 Marks",
        "Agriculture Extension/Horticulture/Agronomy/Plant Protection",
        "प्रदेश लोक सेवा आयोग, लुम्बिनी प्रदेश",
        "3.1.3 Physical properties of soils (texture, structure, density)",
    ],
)
def test_real_text_is_kept(line: str) -> None:
    assert not is_gibberish_line(line)


def test_dropped_lines_are_counted_not_hidden() -> None:
    text = "Section (B) - 25 Marks\nk|b]z nf]s ;]jf cfof]u, n'lDagL k|b]z\n3. Soil Science"
    clean, dropped = remove_gibberish_lines(text)
    assert dropped == 1
    assert "Soil Science" in clean
    assert analyze_text(text).gibberish_lines == 1


def test_chunks_stay_near_the_target_with_word_overlap() -> None:
    paragraphs = [f"{i}. Topic number {i} " + "word " * 40 for i in range(1, 30)]
    chunks = chunk_text("\n\n".join(paragraphs), target_tokens=120, overlap_ratio=0.15)
    assert len(chunks) > 5
    for chunk in chunks:
        assert approx_tokens(chunk.text) <= 120 + 70  # one paragraph may overshoot the cut
    tail = chunks[0].text.split()[-10:]
    assert " ".join(tail) in chunks[1].text  # overlap carried forward


def test_numbered_headings_are_recorded() -> None:
    chunks = chunk_text("3.1 General Introduction\n\n3.1.1 Definition of soil", 400, 0.15)
    assert chunks[-1].section_heading == "3.1.1 Definition of soil"


def _entry(**overrides: object) -> dict[str, object]:
    entry: dict[str, object] = {
        "id": "LUM-01",
        "title": "Officer Level 7 syllabus",
        "url": "https://ppsc.lumbini.gov.np/media/list/agri_7th.pdf",
        "province": "lumbini",
        "level": 7,
        "groups": ["agronomy"],
        "doc_type": "curriculum",
        "verified_on": "2026-09-16",
    }
    entry.update(overrides)
    return entry


def test_a_syllabus_maps_to_its_level_and_commission() -> None:
    manifest = parse_entry(_entry())
    assert manifest.exam_level == "level_7"
    assert manifest.authority == "Lumbini Province Public Service Commission"
    assert manifest.resolvable_url == manifest.url


def test_levels_outside_the_product_are_out_of_scope() -> None:
    with pytest.raises(OutOfScopeError):
        parse_entry(_entry(level=8))


def test_a_reference_document_takes_its_authority_from_the_referring_page() -> None:
    manifest = parse_entry(
        _entry(
            id="REF-04",
            level=None,
            doc_class="reference",
            doc_type="statute",
            province="federal",
            groups=[],
            referring_page="https://lawcommission.gov.np/content/13437/nepal-s-constitution/",
        )
    )
    assert manifest.exam_level is None
    assert manifest.level_basis == "not_applicable"
    assert manifest.authority == "Nepal Law Commission"


def test_a_reference_document_cannot_carry_a_level() -> None:
    with pytest.raises(ManifestError):
        parse_entry(_entry(doc_class="reference", doc_type="statute", level=7))


def test_an_archived_document_links_students_to_the_archive_copy() -> None:
    manifest = parse_entry(_entry(archived_via="https://web.archive.org/web/2024/x.pdf"))
    assert manifest.resolvable_url.startswith("https://web.archive.org/")
    assert manifest.url.startswith("https://ppsc.lumbini.gov.np/")
