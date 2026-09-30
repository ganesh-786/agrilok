"""The support check against the real cases that shaped it.

Every case here is a live finding from the Phase 0 spike (docs/evaluation.md).
If one of these starts failing, the check has regressed on a known
fabrication or started withholding a known-good answer.
"""

from __future__ import annotations

from agrilok_core.support_check import SupportResult, best_window_match, check_support

PP01_QUESTION = (
    "बालीको क्रप कटिङ गरी उत्पादनको विवरण स्थानीय तहले प्रदेशलाई पठाउने गर्दछ, "
    "यस्तो तथ्याङ्क प्रदेशका लागि के हो?"
)
# The exact quote the model gave on the live run that got past the first
# version of the check: one unbroken span across items 6.9 and 6.10.
PP01_LIVE_QUOTE = (
    "6.9. प्राथनमक तथ्यािंक (Primary data) र सहायक तथ्यािंक (Secondary data) को पररचय "
    "तथा श्रोतहरु एविं\n\nतथ्यािंक सिंकलन गदाग ध्यान द्वदन\n\nु\n\nपने क\n\nु\n\nराहरु\n\n"
    "6.10. िाली कटानी (Crop Cutting) र यसको महत्व"
)
QUOTE_69 = "6.9. प्राथनमक तथ्यािंक (Primary data) र सहायक तथ्यािंक (Secondary data) को पररचय"
QUOTE_610 = "6.10. िाली कटानी (Crop Cutting) र यसको महत्व"


def _check(
    excerpts: dict[str, str], chunk_id: str, claim: str, quote: str, question: str = ""
) -> SupportResult:
    return check_support(
        [{"claim": claim, "source_id": chunk_id, "quote": quote}],
        {chunk_id: excerpts[chunk_id]},
        question=question,
    )


def test_pp01_live_span_nepali_claim_is_withheld(excerpts: dict[str, str]) -> None:
    result = _check(
        excerpts,
        "LUM-03-011",
        "स्थानीय तहले बाली कटिङ (Crop Cutting) गरी पठाएको तथ्याङ्क प्रदेशका लागि "
        "सहायक तथ्याङ्क (Secondary data) हो",
        PP01_LIVE_QUOTE,
        PP01_QUESTION,
    )
    assert not result.supported
    assert "neighbouring numbered item" in (result.reason or "")


def test_pp01_live_span_english_claim_is_withheld(excerpts: dict[str, str]) -> None:
    result = _check(
        excerpts,
        "LUM-03-011",
        "Crop cutting data sent by local levels is secondary data for the province.",
        PP01_LIVE_QUOTE,
        PP01_QUESTION,
    )
    assert not result.supported


def test_pp01_quoting_only_the_data_item_is_withheld(excerpts: dict[str, str]) -> None:
    result = _check(
        excerpts, "LUM-03-011", "Crop cutting data is secondary data.", QUOTE_69, PP01_QUESTION
    )
    assert not result.supported


def test_pp01_quoting_only_the_crop_cutting_item_is_withheld(excerpts: dict[str, str]) -> None:
    result = _check(
        excerpts, "LUM-03-011", "Crop cutting data is secondary data.", QUOTE_610, PP01_QUESTION
    )
    assert not result.supported


def test_invented_quote_is_withheld(excerpts: dict[str, str]) -> None:
    result = _check(
        excerpts,
        "LUM-03-011",
        "Crop cutting gives secondary data.",
        "Crop cutting data is secondary data for the province",
    )
    assert not result.supported
    assert result.results[0].reason == "quote is not one passage of the cited chunk"


def test_number_not_in_the_quote_is_withheld(excerpts: dict[str, str]) -> None:
    result = _check(excerpts, "LUM-03-011", "Crop cutting is item 6.12 of the syllabus.", QUOTE_610)
    assert not result.supported
    assert "6.12" in (result.reason or "")


def test_true_claims_about_single_items_pass(excerpts: dict[str, str]) -> None:
    about_610 = _check(
        excerpts,
        "LUM-03-011",
        "The syllabus covers crop cutting and its importance.",
        QUOTE_610,
    )
    about_69 = _check(
        excerpts,
        "LUM-03-011",
        "The syllabus introduces primary data and secondary data.",
        QUOTE_69,
    )
    assert about_610.supported
    assert about_69.supported


def test_listing_every_item_under_a_quoted_heading_passes(excerpts: dict[str, str]) -> None:
    # SMOKE-03: the quote includes its heading and the claim names both items
    # under it. A list, not a relation between siblings.
    quote = (
        "द्वितीय चरण:- क) साम\n\nू\n\nषहक परीक्षण (Group Test) प\n\nू\n\nणागङ्क :- 10\n\n"
        "ख) अन्तवागताग (Interview) प\n\nू\n\nणागङ्क :- 30"
    )
    result = _check(
        excerpts,
        "LUM-01-000",
        "The second stage consists of a group test (10 marks) and an interview (30 marks).",
        quote,
    )
    assert result.supported, result.reason


def test_article_number_may_come_from_the_heading_above(excerpts: dict[str, str]) -> None:
    # U-02: quoting clause (3) and calling it Article 36 is correct.
    result = _check(
        excerpts,
        "REF-04-019",
        "Article 36 (3) gives every citizen the right to food sovereignty in accordance with law.",
        "(३) प्रत्य\n\nे\n\nक नागररकलाई कानून बमोजजम खाद्य सम्प्रभुिाको िक ि\n\nु\n\nन\n\nे\n\nछ ।",
    )
    assert result.supported, result.reason


def test_citing_a_chunk_that_was_not_retrieved_fails(excerpts: dict[str, str]) -> None:
    result = check_support(
        [{"claim": "Anything", "source_id": "LUM-99-000", "quote": "anything"}],
        {"LUM-03-011": excerpts["LUM-03-011"]},
    )
    assert not result.supported
    assert "was not retrieved" in (result.reason or "")


def test_no_claims_is_unsupported() -> None:
    assert not check_support([], {}).supported
    assert not check_support(None, {}).supported


def test_window_match_survives_split_devanagari_words() -> None:
    # SMOKE-05: the model writes "कृषि" where extraction split it as "क ृ षि".
    chunk = "4.1 क ृ षि प्रसार र सञ्चार"
    assert best_window_match("कृषि प्रसार", chunk).score == 1.0


# --- English words the source glosses itself -----------------------------------------

# The Nepali-only summary rows of KOSHI-01-000. The chunk's own English glosses,
# "(Written Examination)" and "(Group Test & Interview)", sit further down.
KOSHI_WRITTEN_ROW = "प्रथम नलखखत परीक्षा २००"
KOSHI_FINAL_ROW = "अखन्तम साम ू वहक परीक्षण र अन्तवागताग ४०"
KOSHI_QUESTION = "what are the full marks of the level 7"


def test_english_claims_over_a_self_glossed_nepali_row_pass(excerpts: dict[str, str]) -> None:
    # Live on 2026-09-27: a correct answer withheld because the claim's
    # English words were found in the chunk's glosses, outside the quote.
    result = check_support(
        [
            {
                "claim": "The total marks for the written examination (First Phase) are 200.",
                "source_id": "KOSHI-01-000",
                "quote": KOSHI_WRITTEN_ROW,
            },
            {
                "claim": "The final phase, consisting of a group test and an interview, "
                "has a total of 40 marks.",
                "source_id": "KOSHI-01-000",
                "quote": KOSHI_FINAL_ROW,
            },
        ],
        {"KOSHI-01-000": excerpts["KOSHI-01-000"]},
        question=KOSHI_QUESTION,
    )
    assert result.supported, result.reason
    assert "written" in (result.results[0].note or "")
    assert "interview" in (result.results[1].note or "")


def test_a_gloss_does_not_excuse_words_from_another_row(excerpts: dict[str, str]) -> None:
    # The glosses exist, but the Nepali they translate is not in the quote.
    wrong = [
        ("The interview is worth 200 marks.", KOSHI_WRITTEN_ROW),
        ("The group test carries 200 marks.", KOSHI_WRITTEN_ROW),
        ("The written examination is worth 40 marks.", KOSHI_FINAL_ROW),
    ]
    for claim, quote in wrong:
        result = _check(excerpts, "KOSHI-01-000", claim, quote, KOSHI_QUESTION)
        assert not result.supported, claim
        assert "elsewhere in the chunk" in (result.reason or ""), claim


def test_a_gloss_is_read_back_to_the_start_of_its_phrase(excerpts: dict[str, str]) -> None:
    # "प्रथम चरण :- नलम्खत परीक्षा (Written Examination)": the gloss translates
    # the two words after ":-", so a quote that stops before the gloss still
    # supports "written examination".
    result = _check(
        excerpts,
        "LUM-01-000",
        "The first phase is the written examination.",
        "प्रथम चरण :- नलम्खत परीक्षा",
    )
    assert result.supported, result.reason
    assert result.results[0].note is not None
