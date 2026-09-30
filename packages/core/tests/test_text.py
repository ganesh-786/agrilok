from __future__ import annotations

from agrilok_core.text import compact, normalize, question_key, search_terms, skeleton, stem


def test_normalize_reduces_devanagari_to_consonants_and_ascii_digits() -> None:
    assert normalize("धारा ३६ (Article 36)") == "धर 36 article 36"


def test_compact_rejoins_words_split_by_extraction() -> None:
    assert compact("क ृ षि प्रसार") == compact("कृषि प्रसार")


def test_stem_meets_the_same_noun_with_different_endings() -> None:
    assert stem(skeleton("संघमा")) == stem(skeleton("संघको"))


def test_search_terms_match_damaged_and_clean_spellings() -> None:
    damaged = search_terms("4.1 क ृ षि प्रसार र सञ्चार")
    clean = search_terms("कृषि प्रसार")
    assert set(clean) <= set(damaged)


def test_search_terms_keep_article_numbers_and_drop_list_numbering() -> None:
    terms = search_terms("Article 36 of the Constitution, item 1")
    assert "36" in terms
    assert "1" not in terms
    assert "the" not in terms


def test_search_terms_leave_standalone_conjunctions_alone() -> None:
    # "र" (and) is a word, not a fragment of the next one.
    assert "रसरवत" not in search_terms("माटो र सरसफाइ")


def test_question_key_ignores_case_spacing_digits_and_trailing_marks() -> None:
    assert question_key("  What is Article ३६?  ") == question_key("what is  article 36")
    assert question_key("के हो ।") == question_key("के हो")
