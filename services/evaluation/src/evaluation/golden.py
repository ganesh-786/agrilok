"""Load the golden set (data/golden-set/questions.yaml).

The file defines what "correct" means and is never edited to make a run pass
(data/golden-set/README.md). This loader only reads it and maps its filters
onto the production pipeline's arguments.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from agrilok_core.levels import ExamLevel

REPO = Path(__file__).resolve().parents[4]
DEFAULT_PATH = REPO / "data" / "golden-set" / "questions.yaml"

# Tiers. Unverified model questions never count toward the gate.
REAL = "real_past_paper"
SMOKE = "pipeline_smoke_test"
UNVERIFIED = "unverified_model_question"
GATED_TIERS = (SMOKE, REAL)

_LEVELS = {4: ExamLevel.LEVEL_4, 7: ExamLevel.LEVEL_7}


@dataclass(frozen=True)
class GoldenQuestion:
    id: str
    tier: str
    question: str
    expected: str | None  # "answer" | "refuse"
    level: ExamLevel
    level_from_file: bool
    province: str | None
    must_not_contain: str | None
    reference_answer: str | None

    @property
    def gated(self) -> bool:
        return self.tier in GATED_TIERS


def _question(entry: dict[str, Any]) -> GoldenQuestion:
    filters = entry.get("filters") or {}
    raw_level = filters.get("level")
    # The production pipeline always has a level. A golden entry written
    # without one (the spike allowed that) is asked at Level 7, and the report
    # says so, rather than silently choosing.
    level = _LEVELS.get(int(raw_level)) if raw_level is not None else None
    return GoldenQuestion(
        id=str(entry["id"]),
        tier=str(entry.get("type", "")),
        question=str(entry["question"]),
        expected=entry.get("expected_behavior"),
        level=level or ExamLevel.LEVEL_7,
        level_from_file=level is not None,
        province=filters.get("province"),
        must_not_contain=entry.get("must_not_contain"),
        reference_answer=entry.get("reference_answer"),
    )


def load(path: Path = DEFAULT_PATH) -> list[GoldenQuestion]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    entries = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(entries, list):
        raise ValueError(f"{path}: expected a top-level `questions:` list")
    questions = [_question(e) for e in entries]
    ids = [q.id for q in questions]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{path}: duplicate question ids")
    return questions
