"""What a golden-set run reports about time and cost, alongside right and wrong."""

from __future__ import annotations

from evaluation.golden import SMOKE
from evaluation.run import Row, latency, render_markdown, summarise


def _row(question_id: str, **overrides: object) -> Row:
    values: dict[str, object] = {
        "id": question_id,
        "tier": SMOKE,
        "question": f"question {question_id}",
        "level": "level_7",
        "level_from_file": True,
        "province": None,
        "expected": "answer",
        "got": "answer",
        "matched": True,
    }
    values.update(overrides)
    return Row(**values)  # type: ignore[arg-type]


def test_latency_is_reported_per_stage_in_exact_milliseconds() -> None:
    rows = [
        _row(f"Q{i}", timings={"generate": ms, "total": ms + 100})
        for i, ms in enumerate([900, 1100, 1000, 1200, 1300, 1400, 1500, 1600, 1700, 9000])
    ]

    report = latency(rows)

    assert report["generate"] == {"count": 10, "median_ms": 1300, "p90_ms": 1700, "max_ms": 9000}
    assert report["total"]["max_ms"] == 9100


def test_a_stage_only_some_questions_ran_is_counted_over_those_questions() -> None:
    rows = [
        _row("LIVE", timings={"embed": 200, "generate": 3000, "total": 3300}),
        _row("NO-SOURCES", timings={"embed": 180, "total": 240}),
    ]

    report = latency(rows)

    assert report["embed"]["count"] == 2
    assert report["generate"]["count"] == 1


def test_an_outage_is_not_counted_as_how_long_answering_takes() -> None:
    rows = [
        _row("OK", timings={"total": 4000}),
        _row("DOWN", error="unavailable: this took too long", timings={"total": 150_000}),
    ]

    assert latency(rows)["total"] == {
        "count": 1,
        "median_ms": 4000,
        "p90_ms": 4000,
        "max_ms": 4000,
    }


def test_the_report_adds_up_what_the_provider_counted_and_shows_both_tables() -> None:
    rows = [
        _row(
            "A",
            timings={"total": 1000},
            usage={"tokens.generate.output": 600, "attempts.generate": 1},
        ),
        _row(
            "B",
            timings={"total": 2000},
            usage={"tokens.generate.output": 400, "attempts.generate": 2},
        ),
    ]

    summary = summarise(rows)
    markdown = render_markdown(summary)

    assert summary["usage"] == {"tokens.generate.output": 1000, "attempts.generate": 3}
    assert "| total | 2 | 1000 | 2000 | 2000 |" in markdown
    assert "tokens.generate.output 1000" in markdown


def test_a_report_from_before_timings_existed_still_renders() -> None:
    summary = summarise([_row("OLD")])
    del summary["latency_ms"]
    del summary["usage"]

    assert "# Golden-set run" in render_markdown(summary)
