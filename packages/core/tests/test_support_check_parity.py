"""The Python support check must give the same verdict as the JavaScript one it ports.

The JavaScript version in spike/lib/support-check.mjs is what the golden set
was measured with. This test replays claims through both and compares every
verdict and reason. Sources of claims:

- the fixture cases in this directory (always present);
- every claim in the spike's saved evaluation reports, with the full chunk
  texts, when the spike corpus exists locally (it is gitignored).

Skipped when Node or the spike code is not available, for example in a
checkout without the spike.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

from agrilok_core.support_check import check_support

REPO = Path(__file__).resolve().parents[3]
SPIKE = REPO / "spike"
JS_CHECK = SPIKE / "lib" / "support-check.mjs"

_NODE_RUNNER = """
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [modulePath, inputPath] = process.argv.slice(2);
const { checkSupport } = await import(pathToFileURL(modulePath).href);
const cases = JSON.parse(readFileSync(inputPath, "utf8"));
const out = cases.map((c) => {
  const r = checkSupport(
    c.claims,
    new Map(Object.entries(c.chunks)),
    undefined,
    c.question,
    new Map(Object.entries(c.meta)),
  );
  const results = r.results.map((x) => ({ ok: x.ok, reason: x.reason ?? null }));
  return { supported: r.supported, results };
});
process.stdout.write(JSON.stringify(out));
"""


def _fixture_cases(excerpts: dict[str, str]) -> list[dict[str, Any]]:
    chunk = excerpts["LUM-03-011"]
    quotes = [
        "6.9. प्राथनमक तथ्यािंक (Primary data) र सहायक तथ्यािंक (Secondary data) को पररचय",
        "6.10. िाली कटानी (Crop Cutting) र यसको महत्व",
        "6.10 crop cutting is secondary",
    ]
    claims = [
        "Crop cutting data is secondary data.",
        "The syllabus covers crop cutting and its importance.",
        "Item 6.12 covers crop cutting.",
    ]
    cases = []
    for quote in quotes:
        for claim in claims:
            cases.append(
                {
                    "claims": [{"claim": claim, "source_id": "LUM-03-011", "quote": quote}],
                    "chunks": {"LUM-03-011": chunk},
                    "question": "Crop cutting data is what kind of data?",
                    "meta": {},
                }
            )
    # English claims over Nepali rows the chunk glosses elsewhere, right and
    # wrong, so both implementations are compared on the gloss rule too.
    gloss_quotes = [
        "प्रथम नलखखत परीक्षा २००",
        "अखन्तम साम ू वहक परीक्षण र अन्तवागताग ४०",
    ]
    gloss_claims = [
        "The written examination (First Phase) carries 200 marks.",
        "The final phase, a group test and an interview, carries 40 marks.",
        "The interview is worth 200 marks.",
        "The written examination is worth 40 marks.",
    ]
    for quote in gloss_quotes:
        for claim in gloss_claims:
            cases.append(
                {
                    "claims": [{"claim": claim, "source_id": "KOSHI-01-000", "quote": quote}],
                    "chunks": {"KOSHI-01-000": excerpts["KOSHI-01-000"]},
                    "question": "What are the full marks of Level 7?",
                    "meta": {},
                }
            )
    return cases


def _report_cases() -> list[dict[str, Any]]:
    chunks_file = SPIKE / "corpus" / "chunks" / "chunks.json"
    reports = sorted((SPIKE / "reports").glob("evaluation-*.json"))
    if not chunks_file.is_file() or not reports:
        return []
    chunks = {c["chunkId"]: c for c in json.loads(chunks_file.read_text(encoding="utf-8"))}
    cases = []
    for report in reports:
        for entry in json.loads(report.read_text(encoding="utf-8")):
            result = entry.get("result") or {}
            support = result.get("supportCheck")
            if not support:
                continue
            claims = [
                {"claim": c.get("claim"), "source_id": c.get("source_id"), "quote": c.get("quote")}
                for c in support
            ]
            ids = {c["source_id"] for c in claims if c.get("source_id") in chunks}
            cases.append(
                {
                    "claims": claims,
                    "chunks": {i: chunks[i]["text"] for i in ids},
                    "question": entry.get("question", ""),
                    "meta": {
                        i: " ".join(
                            [
                                chunks[i].get("sourceTitle", ""),
                                chunks[i].get("province", ""),
                                *(chunks[i].get("serviceGroups") or []),
                            ]
                        )
                        for i in ids
                    },
                }
            )
    return cases


def test_python_port_matches_javascript(tmp_path: Path, excerpts: dict[str, str]) -> None:
    node = shutil.which("node")
    if node is None or not JS_CHECK.is_file():
        pytest.skip("needs Node and spike/lib/support-check.mjs")
    cases = _fixture_cases(excerpts) + _report_cases()
    input_path = tmp_path / "cases.json"
    input_path.write_text(json.dumps(cases, ensure_ascii=False), encoding="utf-8")
    runner = tmp_path / "runner.mjs"
    runner.write_text(_NODE_RUNNER, encoding="utf-8")
    completed = subprocess.run(  # noqa: S603 - fixed arguments, local files
        [node, str(runner), str(JS_CHECK), str(input_path)],
        capture_output=True,
        check=True,
        encoding="utf-8",
    )
    expected = json.loads(completed.stdout)
    assert len(expected) == len(cases)

    mismatches = []
    for case, js in zip(cases, expected, strict=True):
        py = check_support(
            case["claims"], case["chunks"], question=case["question"], meta_by_id=case["meta"]
        )
        if py.supported != js["supported"]:
            mismatches.append((case["claims"], js, py.reason))
            continue
        for py_claim, js_claim in zip(py.results, js["results"], strict=True):
            if py_claim.ok != js_claim["ok"] or py_claim.reason != js_claim["reason"]:
                mismatches.append((py_claim.claim, js_claim, py_claim.reason))
    assert not mismatches, f"{len(mismatches)} of {len(cases)} cases differ: {mismatches[:3]}"
