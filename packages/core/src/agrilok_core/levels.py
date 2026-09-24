"""The two exams. Level is a hard filter everywhere, never a display hint."""

from __future__ import annotations

from enum import StrEnum


class ExamLevel(StrEnum):
    LEVEL_4 = "level_4"
    LEVEL_7 = "level_7"


class ReviewState(StrEnum):
    """Exactly two states (CLAUDE.md rule 2). Do not add a third."""

    VERIFIED = "verified"
    PENDING = "ai_assisted_pending_review"
