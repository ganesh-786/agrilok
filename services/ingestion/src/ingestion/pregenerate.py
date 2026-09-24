"""Pre-generate answers to common questions once, and serve them to everyone (ADR-0004).

This is the first and cheapest layer of the cache-first design: one model call
per question, unlimited students. Per ADR-0008 these run on the strongest
configured model with no fallback, because a pre-generated answer is served
to everyone and deserves the best model the free tier allows. They go through
the same pipeline as a live question (retrieval, support check, citations), so
a pre-generated answer can still be a refusal, and it is stored as one.

Every pre-generated answer is `ai_assisted_pending_review` until a named
person verifies it with `agrilok-ingest answers verify`.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from agrilok_core.levels import ExamLevel
from agrilok_core.pipeline import AskResult, ask
from agrilok_core.runtime import Runtime


@dataclass(frozen=True)
class CommonQuestion:
    level: ExamLevel
    question: str
    province: str | None = None
    service_group: str | None = None


def load_questions(path: Path) -> list[CommonQuestion]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    entries = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(entries, list):
        raise ValueError(f"{path}: expected a top-level `questions:` list")
    questions = []
    for entry in entries:
        questions.append(
            CommonQuestion(
                level=ExamLevel(entry["level"]),
                question=str(entry["question"]),
                province=entry.get("province"),
                service_group=entry.get("service_group"),
            )
        )
    return questions


async def pregenerate(runtime: Runtime, question: CommonQuestion, model: str) -> AskResult:
    return await ask(
        runtime,
        question=question.question,
        level=question.level,
        province=question.province,
        service_group=question.service_group,
        use_cache=True,
        origin="pregenerated",
        models=[model],
    )
