"""The schema itself refuses the failures this project exists to prevent.

These run against a real Postgres with every migration applied. Each test
tries to break one invariant directly in SQL, the way a careless script or a
future migration might, and expects the database to say no.
"""

from __future__ import annotations

from collections.abc import Iterator

import psycopg
import pytest

from agrilok_infra.migrate import migrate
from agrilok_infra.testing import admin_url, temporary_database

CHECKSUM = "a" * 64


@pytest.fixture(scope="module")
def db_url() -> Iterator[str]:
    server = admin_url()
    if server is None:
        pytest.skip("no Postgres reachable; start one with `agrilok-db start`")
    with temporary_database(server) as url:
        yield url


@pytest.fixture
def conn(db_url: str) -> Iterator[psycopg.Connection]:
    with psycopg.connect(db_url) as connection:
        connection.execute(
            "insert into sources (id, name, acquisition) values ('t', 'test', 'manual') "
            "on conflict do nothing"
        )
        yield connection
        connection.rollback()


def _document(**overrides: object) -> dict[str, object]:
    doc: dict[str, object] = {
        "id": "DOC-1",
        "source_id": "t",
        "title": "A syllabus",
        "authority": "A commission",
        "doc_class": "syllabus",
        "doc_type": "curriculum",
        "exam_level": "level_7",
        "level_basis": "stated",
        "province": "lumbini",
        "source_url": "https://example.gov.np/a.pdf",
        "resolvable_url": "https://example.gov.np/a.pdf",
        "fetched_at": "2026-09-16T00:00:00+05:45",
        "checksum": CHECKSUM,
        "bytes": 1000,
        "extraction_method": "text_layer",
        "extraction_backend": "test",
        "extraction_confidence": 0.99,
    }
    doc.update(overrides)
    return doc


def _insert(conn: psycopg.Connection, doc: dict[str, object]) -> None:
    columns = ", ".join(doc)
    placeholders = ", ".join(f"%({k})s" for k in doc)
    conn.execute(f"insert into documents ({columns}) values ({placeholders})", doc)  # noqa: S608


def test_migrations_are_idempotent(db_url: str) -> None:
    assert migrate(db_url) == []


def test_new_content_defaults_to_pending_review_never_verified(conn: psycopg.Connection) -> None:
    _insert(conn, _document())
    row = conn.execute(
        "select review_state, admission from documents where id = 'DOC-1'"
    ).fetchone()
    assert row == ("ai_assisted_pending_review", "queued")


def test_only_level_4_and_level_7_exist(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        conn.execute(
            "insert into exam_levels (code, name_en, name_ne, post_en, post_ne, sort_order) "
            "values ('level_5', 'Level 5', 'पाँचौं तह', 'x', 'x', 5)"
        )


def test_a_syllabus_must_have_a_level(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        _insert(conn, _document(exam_level=None))


def test_a_reference_document_has_no_level(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        _insert(conn, _document(doc_class="reference", doc_type="statute", level_basis="stated"))


def test_verified_needs_a_named_reviewer(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        _insert(
            conn,
            _document(
                review_state="verified",
                admission="admitted",
                admission_by="@someone",
                admission_at="2026-09-24T00:00:00Z",
            ),
        )


def test_admission_needs_a_named_person(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        _insert(conn, _document(admission="admitted"))


def test_ocr_output_cannot_be_admitted_without_a_pdf_comparison(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        _insert(
            conn,
            _document(
                extraction_method="ocr",
                admission="admitted",
                admission_by="@someone",
                admission_at="2026-09-24T00:00:00Z",
            ),
        )


def test_provenance_cannot_be_missing(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.NotNullViolation):
        _insert(conn, _document(checksum=None))


def test_an_answer_without_citations_cannot_be_stored(conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        conn.execute(
            "insert into answers (id, exam_level, question, question_norm, question_hash, status, "
            "answer_text, prompt_version, corpus_revision, origin) values "
            "('a1', 'level_7', 'q', 'q', %s, 'answered', 'text', 'v', 0, 'live')",
            (CHECKSUM,),
        )
