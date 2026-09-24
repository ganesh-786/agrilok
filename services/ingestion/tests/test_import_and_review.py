"""The Phase 0 import and the review queue against a real database.

The central invariant (tests/README.md, "Review gate"): nothing reaches a
student without a named person deciding it may, and nothing is `verified`
unless someone asserted the checklist. These tests try the ways it could slip.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest
import yaml

from agrilok_core.cache import corpus_revision
from agrilok_core.db import Conn
from agrilok_core.testing import add_chunk, add_document, unit
from ingestion import review as rv
from ingestion.phase0 import import_phase0


def _write_spike(root: Path) -> None:
    corpus = root / "corpus"
    for sub in ("raw", "extracted", "chunks"):
        (corpus / sub).mkdir(parents=True)
    documents: list[dict[str, Any]] = [
        {
            "id": "LUM-01",
            "title": "Officer Level 7 syllabus",
            "url": "https://ppsc.lumbini.gov.np/media/list/agri_7th.pdf",
            "province": "lumbini",
            "level": 7,
            "groups": ["agronomy"],
            "doc_type": "curriculum",
            "verified_on": "2026-09-16",
        },
        {
            "id": "FED-11",
            "title": "Level 8 syllabus",
            "url": "https://psc.gov.np/x.pdf",
            "province": "federal",
            "level": 8,
            "groups": ["plant_protection"],
            "doc_type": "curriculum",
            "verified_on": "2026-09-17",
        },
        {
            "id": "REF-01",
            "title": "A scanned regulation",
            "url": "https://giwmscdnone.gov.np/x.pdf",
            "referring_page": "https://moald.gov.np/content/215/pestise/",
            "province": "federal",
            "level": None,
            "groups": [],
            "doc_class": "reference",
            "doc_type": "regulation",
            "verified_on": "2026-09-19",
        },
    ]
    (corpus / "sources.yaml").write_text(
        yaml.safe_dump({"documents": documents}, allow_unicode=True), encoding="utf-8"
    )
    for doc in documents:
        (corpus / "raw" / f"{doc['id']}.pdf").write_bytes(f"%PDF-1.4 {doc['id']}".encode())
    report = [
        {"id": "LUM-01", "status": "extracted", "backend": "pdf-parse", "gibberishLineShare": 0.0},
        {"id": "FED-11", "status": "extracted", "backend": "pdf-parse", "gibberishLineShare": 0.0},
        {"id": "REF-01", "status": "no_text_layer"},
    ]
    (corpus / "extracted" / "extraction-report.json").write_text(json.dumps(report))
    texts = ["3.1.1 Definition of soil", "3.1.2 Soil forming process"]
    chunks = [
        {
            "chunkId": f"LUM-01-00{i}",
            "sourceId": "LUM-01",
            "chunkIndex": i,
            "text": text,
            "approxTokens": 5,
            "sectionHeading": text,
            "gibberishLinesDroppedFromSource": 0,
        }
        for i, text in enumerate(texts)
    ]
    (corpus / "chunks" / "chunks.json").write_text(json.dumps(chunks, ensure_ascii=False))
    vectors = {
        "model": "gemini-embedding-001",
        "dimensions": 768,
        "vectors": {"LUM-01-000": unit((0, 1.0)), "LUM-01-001": unit((1, 1.0))},
        # Only the first vector was computed from the chunk's current text.
        "hashes": {
            "LUM-01-000": hashlib.sha256(texts[0].encode()).hexdigest(),
            "LUM-01-001": "stale",
        },
    }
    (corpus / "chunks" / "vectors.json").write_text(json.dumps(vectors))


async def test_phase0_import_queues_everything_and_admits_nothing(
    conn: Conn, tmp_path: Path
) -> None:
    _write_spike(tmp_path)
    report = await import_phase0(conn, tmp_path)

    assert report.imported == ["LUM-01"]
    reasons = dict(report.skipped)
    assert "outside Level 4 and Level 7" in reasons["FED-11"]
    assert "needs OCR" in reasons["REF-01"]
    assert (report.embedded, report.unembedded) == (1, 1)  # the stale vector is not trusted

    cur = await conn.execute("select admission, review_state, checksum from documents")
    doc = await cur.fetchone()
    assert doc is not None
    assert doc["admission"] == "queued"
    assert doc["review_state"] == "ai_assisted_pending_review"
    raw = (tmp_path / "corpus" / "raw" / "LUM-01.pdf").read_bytes()
    assert doc["checksum"] == hashlib.sha256(raw).hexdigest()
    cur = await conn.execute("select count(*) as n from review_items where status = 'open'")
    open_items = await cur.fetchone()
    assert open_items is not None
    assert open_items["n"] == 1

    again = await import_phase0(conn, tmp_path)
    assert again.imported == []
    assert dict(again.skipped)["LUM-01"] == "already imported"


async def test_admission_needs_a_named_person(conn: Conn) -> None:
    await add_document(conn, "D", admission="queued")
    await add_chunk(conn, "D-01-000", "D", "text", unit((0, 1.0)))
    with pytest.raises(rv.ReviewError):
        await rv.admit(conn, "D", by="someone", ocr_min_confidence=0.8, self_review=True)


async def test_low_confidence_needs_a_pdf_comparison_before_admission(conn: Conn) -> None:
    await add_document(conn, "D", admission="queued")
    await add_chunk(conn, "D-01-000", "D", "text", unit((0, 1.0)))
    await conn.execute("update documents set extraction_confidence = 0.4 where id = 'D'")
    with pytest.raises(rv.ReviewError, match="compare the text against the PDF"):
        await rv.admit(conn, "D", by="@tester", ocr_min_confidence=0.8, self_review=True)
    await rv.admit(
        conn, "D", by="@tester", ocr_min_confidence=0.8, self_review=True, compared_against_pdf=True
    )


async def test_admission_makes_a_document_servable_and_bumps_the_revision(conn: Conn) -> None:
    await add_document(conn, "D", admission="queued")
    await add_chunk(conn, "D-01-000", "D", "text", unit((0, 1.0)))
    before = await corpus_revision(conn)
    await rv.admit(conn, "D", by="@tester", ocr_min_confidence=0.8, self_review=True)
    cur = await conn.execute("select admission, admission_by, review_state from documents")
    row = await cur.fetchone()
    assert row == {
        "admission": "admitted",
        "admission_by": "@tester",
        "review_state": "ai_assisted_pending_review",
    }
    assert await corpus_revision(conn) == before + 1


async def test_verification_asserts_the_checklist_and_records_self_review(conn: Conn) -> None:
    await add_document(conn, "D", admission="queued")
    await add_chunk(conn, "D-01-000", "D", "text", unit((0, 1.0)))
    with pytest.raises(rv.ReviewError, match="must be admitted"):
        await rv.verify(conn, "D", by="@tester", self_review=True, checklist_done=True)
    await rv.admit(conn, "D", by="@tester", ocr_min_confidence=0.8, self_review=True)
    with pytest.raises(rv.ReviewError, match="checklist"):
        await rv.verify(conn, "D", by="@tester", self_review=True, checklist_done=False)
    await rv.verify(conn, "D", by="@tester", self_review=True, checklist_done=True)

    cur = await conn.execute("select review_state, self_review from chunks where id = 'D-01-000'")
    assert await cur.fetchone() == {"review_state": "verified", "self_review": True}


async def test_rejecting_an_admitted_document_withdraws_its_cached_answers(conn: Conn) -> None:
    await add_document(conn, "D", admission="queued")
    await add_chunk(conn, "D-01-000", "D", "text", unit((0, 1.0)))
    await rv.admit(conn, "D", by="@tester", ocr_min_confidence=0.8, self_review=True)
    await conn.execute(
        """
        insert into answers (id, exam_level, question, question_norm, question_hash, status,
            answer_text, citations, prompt_version, corpus_revision, cited_documents, origin)
        values ('a1', 'level_7', 'q', 'q', %s, 'answered', 't [1]', '[{"n": 1}]', 'v', 1,
            '{"D": "x"}', 'live')
        """,
        ("0" * 64,),
    )
    withdrawn = await rv.reject(conn, "D", by="@tester", note="wrong province")
    assert withdrawn == 1
    cur = await conn.execute("select invalidated_at is not null as gone from answers")
    assert await cur.fetchone() == {"gone": True}


async def test_a_refusal_cannot_be_verified(conn: Conn) -> None:
    await conn.execute(
        """
        insert into answers (id, exam_level, question, question_norm, question_hash, status,
            refusal_stage, prompt_version, corpus_revision, origin)
        values ('r1', 'level_7', 'q', 'q', %s, 'refused', 'no_sources', 'v', 0, 'live')
        """,
        ("0" * 64,),
    )
    with pytest.raises(rv.ReviewError, match="refusal"):
        await rv.verify_answer(conn, "r1", by="@tester", self_review=True)
