"""Database writes for documents and the review queue.

A document always enters as `queued` with a review item open (ADR-0009,
ADR-0012). Nothing in this module admits or verifies; that is review.py, and
it always needs a named person.
"""

from __future__ import annotations

from datetime import datetime, time
from typing import Any
from zoneinfo import ZoneInfo

from agrilok_core.db import Conn
from ingestion.manifest import DocumentManifest

KATHMANDU = ZoneInfo("Asia/Kathmandu")
PIPELINE_ACTOR = "agrilok-ingest"


async def ensure_source(conn: Conn, source_id: str, name: str, acquisition: str, note: str) -> None:
    await conn.execute(
        """
        insert into sources (id, name, acquisition, note) values (%s, %s, %s, %s)
        on conflict (id) do update set name = excluded.name, note = excluded.note
        """,
        (source_id, name, acquisition, note),
    )


async def known_service_groups(conn: Conn) -> set[str]:
    cur = await conn.execute("select code from service_groups")
    return {row["code"] for row in await cur.fetchall()}


async def existing_checksum(conn: Conn, doc_id: str) -> str | None:
    cur = await conn.execute("select checksum from documents where id = %s", (doc_id,))
    row = await cur.fetchone()
    return str(row["checksum"]) if row else None


async def insert_document(
    conn: Conn,
    manifest: DocumentManifest,
    *,
    source_id: str,
    checksum: str,
    size: int,
    extraction_method: str,
    extraction_backend: str,
    extraction_confidence: float,
    gibberish_lines_dropped: int,
    fetched_at: datetime | None = None,
) -> None:
    # A date-only record ("verified on 2026-09-16") is stored as that day's
    # start in Kathmandu and only ever shown as a date.
    when = fetched_at or datetime.combine(manifest.fetched_on, time(0, 0), tzinfo=KATHMANDU)
    await conn.execute(
        """
        insert into documents (
            id, source_id, title, authority, doc_class, doc_type, exam_level, level_basis,
            province, service_groups, source_url, resolvable_url, referring_page, fetched_at,
            checksum, bytes, extraction_method, extraction_backend, extraction_confidence,
            gibberish_lines_dropped, as_of
        ) values (
            %(id)s, %(source)s, %(title)s, %(authority)s, %(class)s, %(type)s, %(level)s,
            %(basis)s, %(province)s, %(groups)s, %(url)s, %(resolvable)s, %(referring)s,
            %(fetched)s, %(checksum)s, %(bytes)s, %(method)s, %(backend)s, %(confidence)s,
            %(dropped)s, %(as_of)s
        )
        """,
        {
            "id": manifest.id,
            "source": source_id,
            "title": manifest.title,
            "authority": manifest.authority,
            "class": manifest.doc_class,
            "type": manifest.doc_type,
            "level": manifest.exam_level,
            "basis": manifest.level_basis,
            "province": manifest.province,
            "groups": list(manifest.service_groups),
            "url": manifest.url,
            "resolvable": manifest.resolvable_url,
            "referring": manifest.referring_page,
            "fetched": when,
            "checksum": checksum,
            "bytes": size,
            "method": extraction_method,
            "backend": extraction_backend,
            "confidence": extraction_confidence,
            "dropped": gibberish_lines_dropped,
            "as_of": manifest.as_of,
        },
    )


async def open_review_item(conn: Conn, subject_kind: str, subject_id: str, note: str = "") -> int:
    existing = await open_item_id(conn, subject_kind, subject_id)
    if existing is not None:
        return existing
    cur = await conn.execute(
        "insert into review_items (subject_kind, subject_id) values (%s, %s) returning id",
        (subject_kind, subject_id),
    )
    row = await cur.fetchone()
    if row is None:  # pragma: no cover - insert ... returning always returns
        raise RuntimeError("could not open a review item")
    item_id = int(row["id"])
    await add_event(conn, item_id, "opened", PIPELINE_ACTOR, note=note)
    return item_id


async def open_item_id(conn: Conn, subject_kind: str, subject_id: str) -> int | None:
    cur = await conn.execute(
        "select id from review_items where subject_kind = %s and subject_id = %s "
        "and status = 'open'",
        (subject_kind, subject_id),
    )
    row = await cur.fetchone()
    return int(row["id"]) if row else None


async def add_event(
    conn: Conn,
    item_id: int,
    action: str,
    actor: str,
    *,
    self_review: bool | None = None,
    compared_against_pdf: bool | None = None,
    note: str = "",
) -> None:
    await conn.execute(
        """
        insert into review_events
            (review_item_id, action, actor, self_review, compared_against_pdf, note)
        values (%s, %s, %s, %s, %s, %s)
        """,
        (item_id, action, actor, self_review, compared_against_pdf, note),
    )


async def close_review_item(conn: Conn, item_id: int) -> None:
    await conn.execute(
        "update review_items set status = 'closed', closed_at = now() where id = %s", (item_id,)
    )


async def document_row(conn: Conn, doc_id: str) -> dict[str, Any] | None:
    cur = await conn.execute(
        """
        select d.*, (select count(*) from chunks c where c.document_id = d.id) as chunk_count,
               (select count(*) from chunks c where c.document_id = d.id
                  and c.embedding is not null) as embedded_count
        from documents d where d.id = %s
        """,
        (doc_id,),
    )
    row = await cur.fetchone()
    return dict(row) if row else None
