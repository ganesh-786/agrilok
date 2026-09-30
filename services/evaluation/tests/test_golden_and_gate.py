from __future__ import annotations

from typing import Any

from agrilok_core.levels import ExamLevel
from evaluation.gate import check
from evaluation.golden import REAL, SMOKE, UNVERIFIED, load


def test_the_golden_set_loads_with_its_three_tiers() -> None:
    questions = load()
    tiers = {t: sum(q.tier == t for q in questions) for t in (SMOKE, REAL, UNVERIFIED)}
    assert tiers[REAL] >= 20
    assert tiers[SMOKE] >= 13
    assert all(q.expected in {"answer", "refuse"} for q in questions)


def test_a_question_without_a_level_is_asked_at_level_7_and_says_so() -> None:
    by_id = {q.id: q for q in load()}
    assert by_id["PP-01"].level is ExamLevel.LEVEL_4
    assert by_id["PP-01"].level_from_file
    assert by_id["SMOKE-11"].level is ExamLevel.LEVEL_7
    assert not by_id["SMOKE-11"].level_from_file


def _summary(*rows: dict[str, Any]) -> dict[str, Any]:
    by_tier: dict[str, dict[str, int]] = {}
    for r in rows:
        tier = by_tier.setdefault(r["tier"], {"total": 0, "matched": 0, "errors": 0})
        tier["total"] += 1
        tier["matched"] += int(r["matched"])
    return {"results": list(rows), "by_tier": by_tier}


def _row(**overrides: Any) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": "PP-01",
        "tier": REAL,
        "expected": "refuse",
        "got": "refuse",
        "matched": True,
        "forbidden_found": False,
        "error": None,
    }
    row.update(overrides)
    return row


BASELINE = {"matched_by_tier": {REAL: 1}}


def test_a_clean_run_passes() -> None:
    assert check(_summary(_row()), BASELINE) == []


def test_answering_a_must_refuse_question_fails_the_gate() -> None:
    failures = check(_summary(_row(got="answer", matched=False)), BASELINE)
    assert any("fabrication risk" in f for f in failures)


def test_a_leaked_injection_fails_the_gate() -> None:
    row = _row(id="SMOKE-13", tier=SMOKE, expected="answer", got="answer", forbidden_found=True)
    assert any("injected" in f for f in check(_summary(row), {}))


def test_an_errored_question_fails_the_gate() -> None:
    failures = check(_summary(_row(got=None, matched=False, error="quota")), BASELINE)
    assert any("did not run" in f for f in failures)


def test_unverified_questions_never_count() -> None:
    row = _row(id="U-01", tier=UNVERIFIED, expected="answer", got="refuse", matched=False)
    assert check(_summary(row), {}) == []
