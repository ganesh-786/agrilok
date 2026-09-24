"""Read-only views of the library: what documents exist, what they contain, what they say.

Two limits hold throughout (NOTICE, fair dealing):

- A document page shows a table of contents (the top-level units), never the
  whole text. The full document is one click away, on the authority's site.
- Search returns short snippets around the matching words, never whole chunks.

Only admitted, not superseded documents appear. A queued document does not
exist as far as students are concerned (ADR-0012).
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from agrilok_api.schemas import (
    DocumentDetail,
    DocumentSummary,
    Label,
    LevelLabel,
    LibraryStats,
    OutlineEntry,
    Review,
    SearchHit,
)
from agrilok_core.citations import truncate_on_word
from agrilok_core.dates import nepal_date
from agrilok_core.db import Conn
from agrilok_core.levels import ExamLevel
from agrilok_core.retrieval import Filters, retrieve
from agrilok_core.text import search_terms

SNIPPET_CHARS = 280

_DOC_COLUMNS = """
    d.id, d.title, d.authority, d.doc_class, d.doc_type, d.exam_level, d.province,
    d.service_groups, d.fetched_at, d.resolvable_url, d.source_url, d.review_state,
    d.reviewed_by, d.reviewed_at, d.self_review, d.extraction_confidence, d.superseded,
    (select count(*) from chunks c where c.document_id = d.id) as chunk_count
"""


def _as_date(value: object) -> date:
    if isinstance(value, datetime | date):
        result = nepal_date(value)
        if result is not None:
            return result
    raise TypeError(f"not a date: {value!r}")


def summary(row: dict[str, Any]) -> DocumentSummary:
    return DocumentSummary(
        id=row["id"],
        title=row["title"],
        authority=row["authority"],
        doc_class=row["doc_class"],
        doc_type=row["doc_type"],
        exam_level=row["exam_level"],
        province=row["province"],
        service_groups=list(row["service_groups"] or []),
        fetched_on=_as_date(row["fetched_at"]),
        resolvable_url=row["resolvable_url"],
        source_url=row["source_url"],
        archived=row["resolvable_url"] != row["source_url"],
        review=Review(
            state=row["review_state"],
            reviewed_by=row["reviewed_by"],
            reviewed_at=row["reviewed_at"],
            self_review=row["self_review"],
        ),
        chunk_count=int(row["chunk_count"]),
        extraction_confidence=float(row["extraction_confidence"]),
        superseded=bool(row["superseded"]),
    )


async def reference_codes(conn: Conn) -> dict[str, set[str]]:
    codes: dict[str, set[str]] = {}
    for table in ("provinces", "service_groups"):
        cur = await conn.execute(f"select code from {table}")  # noqa: S608 - fixed table names
        codes[table] = {row["code"] for row in await cur.fetchall()}
    return codes


async def labels(conn: Conn) -> tuple[list[LevelLabel], list[Label], list[Label]]:
    cur = await conn.execute(
        "select code, name_en, name_ne, post_en, post_ne from exam_levels order by sort_order"
    )
    levels = [LevelLabel(**row) for row in await cur.fetchall()]
    cur = await conn.execute("select code, name_en, name_ne from provinces order by sort_order")
    provinces = [Label(**row) for row in await cur.fetchall()]
    cur = await conn.execute(
        "select code, name_en, name_ne from service_groups order by sort_order"
    )
    groups = [Label(**row) for row in await cur.fetchall()]
    return levels, provinces, groups


async def stats(conn: Conn) -> LibraryStats:
    cur = await conn.execute(
        """
        select
            count(*) as documents,
            count(*) filter (where doc_class = 'syllabus' and exam_level = 'level_4') as l4,
            count(*) filter (where doc_class = 'syllabus' and exam_level = 'level_7') as l7,
            count(*) filter (where doc_class = 'reference') as reference,
            count(*) filter (where review_state = 'verified') as verified,
            max(fetched_at) as last_fetched,
            coalesce(array_agg(distinct province) filter (where doc_class = 'syllabus'), '{}')
                as provinces
        from documents
        where admission = 'admitted' and not superseded
        """
    )
    row = await cur.fetchone()
    if row is None:  # pragma: no cover - aggregate always returns a row
        raise RuntimeError("no stats row")
    return LibraryStats(
        documents=int(row["documents"]),
        syllabi_by_level={"level_4": int(row["l4"]), "level_7": int(row["l7"])},
        reference_documents=int(row["reference"]),
        verified_documents=int(row["verified"]),
        provinces=sorted(row["provinces"] or []),
        last_fetched_on=_as_date(row["last_fetched"]) if row["last_fetched"] else None,
    )


async def level_documents(
    conn: Conn, level: ExamLevel, province: str | None, group: str | None
) -> tuple[list[DocumentSummary], list[DocumentSummary]]:
    cur = await conn.execute(
        f"""
        select {_DOC_COLUMNS}
        from documents d
        join provinces p on p.code = d.province
        where d.admission = 'admitted' and not d.superseded
          and (
            (d.doc_class = 'syllabus' and d.exam_level = %(level)s
               and (%(province)s::text is null or d.province = %(province)s)
               and (%(group)s::text is null or %(group)s = any(d.service_groups)))
            or d.doc_class = 'reference'
          )
        order by d.doc_class desc, p.sort_order, d.title
        """,  # noqa: S608 - _DOC_COLUMNS is a constant; values are bound parameters
        {"level": level.value, "province": province, "group": group},
    )
    rows = [summary(row) for row in await cur.fetchall()]
    return [r for r in rows if r.doc_class == "syllabus"], [
        r for r in rows if r.doc_class == "reference"
    ]


# Top-level units only: "Section (B) - 25 Marks", "3. Soil Science",
# "Paper II: Technical Subject". A table of contents, not the syllabus.
_UNIT = re.compile(
    r"^(?:(?P<section>(?:Section|Part)\s*\(?[A-Z0-9IVX]+\)?\s*[-–:]?\s*.{0,60})"
    r"|(?P<num>[0-9]{1,2}|[०-९]{1,2})\.\s+(?P<title>\S.{1,78})"
    r"|(?P<paper>(?:Paper|पत्र)\s*[-–:]?\s*[IVX0-9०-९]+.{0,60}))$"
)


def outline_from_chunks(texts: list[str], limit: int = 30) -> list[OutlineEntry]:
    entries: list[OutlineEntry] = []
    seen: set[str] = set()
    for text in texts:
        for raw in text.split("\n"):
            line = " ".join(raw.split())
            if not line or len(line) > 90:
                continue
            match = _UNIT.match(line)
            if not match:
                continue
            if match.group("num"):
                label, body = match.group("num"), match.group("title")
            else:
                label, body = "", line
            key = f"{label}|{body}".lower()
            if key in seen:
                continue
            seen.add(key)
            entries.append(OutlineEntry(label=label, text=body))
            if len(entries) >= limit:
                return entries
    return entries


async def document_detail(conn: Conn, doc_id: str) -> DocumentDetail | None:
    cur = await conn.execute(
        f"""
        select {_DOC_COLUMNS}, d.referring_page, d.checksum, d.bytes, d.extraction_method,
               d.gibberish_lines_dropped, d.admission_at, d.as_of,
               s.acquisition, s.name as source_name
        from documents d join sources s on s.id = d.source_id
        where d.id = %s and d.admission = 'admitted'
        """,  # noqa: S608 - _DOC_COLUMNS is a constant
        (doc_id,),
    )
    row = await cur.fetchone()
    if row is None:
        return None
    cur = await conn.execute(
        "select text from chunks where document_id = %s order by chunk_index", (doc_id,)
    )
    texts = [r["text"] for r in await cur.fetchall()]
    base = summary(row)
    return DocumentDetail(
        **base.model_dump(),
        referring_page=row["referring_page"],
        checksum=row["checksum"],
        bytes=int(row["bytes"]),
        acquisition=row["acquisition"],
        source_name=row["source_name"],
        extraction_method=row["extraction_method"],
        gibberish_lines_dropped=int(row["gibberish_lines_dropped"]),
        admitted_at=row["admission_at"],
        as_of=row["as_of"],
        outline=outline_from_chunks(texts),
    )


def snippet(text: str, terms: set[str]) -> str:
    """The passage around the best-matching line, at most SNIPPET_CHARS long."""
    lines = [" ".join(line.split()) for line in text.split("\n")]
    lines = [line for line in lines if line]
    if not lines:
        return ""
    scores = [len(terms & set(search_terms(line))) for line in lines]
    best = max(range(len(lines)), key=lambda i: (scores[i], -i))
    parts = [lines[best]]
    # Pull in the lines after it while there is room, so a heading comes with
    # the item under it.
    for line in lines[best + 1 :]:
        if len(" · ".join([*parts, line])) > SNIPPET_CHARS:
            break
        parts.append(line)
    return truncate_on_word(" · ".join(parts), SNIPPET_CHARS)


async def search(
    conn: Conn, level: ExamLevel, query: str, province: str | None, group: str | None, limit: int
) -> tuple[list[str], list[SearchHit]]:
    """Keyword search only. No embedding call, so no quota is spent on browsing."""
    result = await retrieve(
        conn,
        question=query,
        query_vector=None,
        filters=Filters(level=level, province=province, service_group=group),
        top_k=limit,
        min_score=1.0,
        keyword_min_score=1.0,
    )
    terms = set(result.keyword_terms)
    hits = []
    for cand in result.results:
        d = cand.details
        if not d:
            continue
        hits.append(
            SearchHit(
                chunk_id=cand.chunk_id,
                document_id=cand.document_id,
                document_title=d["title"],
                doc_class=d["doc_class"],
                exam_level=d["exam_level"],
                province=d["province"],
                section_heading=d.get("section_heading"),
                snippet=snippet(cand.text, terms),
                resolvable_url=d["resolvable_url"],
                fetched_on=_as_date(d["fetched_at"]),
                review_state=d["chunk_review_state"],
            )
        )
    return sorted(terms), hits


async def common_questions(conn: Conn, level: ExamLevel, limit: int = 12) -> list[dict[str, Any]]:
    """Pre-generated answers first, then the answers students asked for most."""
    cur = await conn.execute(
        """
        select id, question, province, served_count, review_state, reviewed_by, reviewed_at,
               self_review
        from answers
        where invalidated_at is null and status = 'answered' and exam_level = %(level)s
          and (origin = 'pregenerated' or served_count >= 3)
        order by (origin = 'pregenerated') desc, served_count desc, created_at
        limit %(limit)s
        """,
        {"level": level.value, "limit": limit},
    )
    return [dict(row) for row in await cur.fetchall()]
