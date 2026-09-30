"""The review queue: admit, verify and reject documents; verify cached answers.

The rules (ADR-0009, ADR-0012, docs/review-checklist.md):

- Every decision names a person. There is no default reviewer.
- Admission lets a document answer questions, labelled pending review. It is
  refused without `compared_against_pdf` when the text came from OCR or its
  extraction confidence is below OCR_MIN_CONFIDENCE, and refused for an
  inferred exam level until someone confirms the level.
- Verification is the full seven-point checklist. The reviewer must say
  whether it was self-review; while there is one maintainer it usually is,
  and that is recorded, not hidden.
- Rejecting an admitted document removes it from retrieval at once and
  invalidates every cached answer that cites it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from agrilok_core.cache import bump_corpus_revision, invalidate_citing
from agrilok_core.db import Conn
from ingestion.store import add_event, close_review_item, document_row, open_review_item

_HANDLE = re.compile(r"^@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")


class ReviewError(RuntimeError):
    pass


def check_handle(handle: str) -> str:
    if not _HANDLE.match(handle):
        raise ReviewError(f"{handle!r} is not a handle like @ganesh-786; decisions need a name")
    return handle


@dataclass(frozen=True)
class Blocker:
    code: str
    message: str


def admission_blockers(
    doc: dict[str, Any],
    *,
    ocr_min_confidence: float,
    compared_against_pdf: bool,
    level_confirmed: bool,
) -> list[Blocker]:
    blockers: list[Blocker] = []
    if doc["admission"] != "queued":
        blockers.append(Blocker("not_queued", f"it is already {doc['admission']}"))
    if int(doc.get("chunk_count") or 0) == 0:
        blockers.append(Blocker("no_chunks", "it has no chunks to serve"))
    needs_pdf = (
        doc["extraction_method"] == "ocr"
        or float(doc["extraction_confidence"]) < ocr_min_confidence
    )
    if needs_pdf and not compared_against_pdf:
        reason = (
            "its text came from OCR"
            if doc["extraction_method"] == "ocr"
            else f"its extraction confidence is {float(doc['extraction_confidence']):.2f}, "
            f"below {ocr_min_confidence:.2f}"
        )
        blockers.append(
            Blocker(
                "needs_pdf_comparison",
                f"{reason}; compare the text against the PDF itself, then pass "
                "--compared-against-pdf",
            )
        )
    if doc["level_basis"] == "inferred" and not level_confirmed:
        blockers.append(
            Blocker(
                "level_inferred",
                "its exam level was inferred, not stated; confirm it against the document, "
                "then pass --level-confirmed",
            )
        )
    return blockers


async def list_documents(conn: Conn, admission: str | None = None) -> list[dict[str, Any]]:
    cur = await conn.execute(
        """
        select d.id, d.title, d.doc_class, d.exam_level, d.province, d.admission,
               d.review_state, d.extraction_method, d.extraction_confidence, d.level_basis,
               d.admission_by, d.reviewed_by, d.self_review,
               (select count(*) from chunks c where c.document_id = d.id) as chunk_count,
               (select count(*) from chunks c where c.document_id = d.id
                  and c.embedding is not null) as embedded_count
        from documents d
        where %(admission)s::text is null or d.admission = %(admission)s
        order by d.admission, d.exam_level nulls last, d.province, d.id
        """,
        {"admission": admission},
    )
    return [dict(r) for r in await cur.fetchall()]


async def _require(conn: Conn, doc_id: str) -> dict[str, Any]:
    doc = await document_row(conn, doc_id)
    if doc is None:
        raise ReviewError(f"no document {doc_id}")
    return doc


async def admit(
    conn: Conn,
    doc_id: str,
    *,
    by: str,
    ocr_min_confidence: float,
    self_review: bool,
    compared_against_pdf: bool = False,
    level_confirmed: bool = False,
    note: str = "",
) -> None:
    check_handle(by)
    async with conn.transaction():
        doc = await _require(conn, doc_id)
        blockers = admission_blockers(
            doc,
            ocr_min_confidence=ocr_min_confidence,
            compared_against_pdf=compared_against_pdf,
            level_confirmed=level_confirmed,
        )
        if blockers:
            raise ReviewError(
                f"{doc_id} cannot be admitted: " + "; ".join(b.message for b in blockers)
            )
        await conn.execute(
            """
            update documents
            set admission = 'admitted', admission_by = %s, admission_at = now(),
                admission_note = %s, compared_against_pdf = %s, updated_at = now()
            where id = %s
            """,
            (by, note or None, compared_against_pdf, doc_id),
        )
        item = await open_review_item(conn, "document", doc_id)
        await add_event(
            conn,
            item,
            "admitted",
            by,
            self_review=self_review,
            compared_against_pdf=compared_against_pdf,
            note=note,
        )
        await bump_corpus_revision(conn)


async def verify(
    conn: Conn,
    doc_id: str,
    *,
    by: str,
    self_review: bool,
    checklist_done: bool,
    note: str = "",
) -> None:
    check_handle(by)
    if not checklist_done:
        raise ReviewError(
            "verification asserts the seven-point checklist in docs/review-checklist.md was "
            "done by you; pass --checklist-done only if it was"
        )
    async with conn.transaction():
        doc = await _require(conn, doc_id)
        if doc["admission"] != "admitted":
            raise ReviewError(f"{doc_id} must be admitted before it can be verified")
        if doc["review_state"] == "verified":
            raise ReviewError(f"{doc_id} is already verified by {doc['reviewed_by']}")
        await conn.execute(
            """
            update documents
            set review_state = 'verified', reviewed_by = %s, reviewed_at = now(),
                self_review = %s, updated_at = now()
            where id = %s
            """,
            (by, self_review, doc_id),
        )
        await conn.execute(
            """
            update chunks
            set review_state = 'verified', reviewed_by = %s, reviewed_at = now(), self_review = %s
            where document_id = %s
            """,
            (by, self_review, doc_id),
        )
        item = await open_review_item(conn, "document", doc_id)
        await add_event(conn, item, "verified", by, self_review=self_review, note=note)
        await close_review_item(conn, item)


async def reject(conn: Conn, doc_id: str, *, by: str, note: str) -> int:
    """Reject a document. Returns how many cached answers were invalidated."""
    check_handle(by)
    if not note.strip():
        raise ReviewError("say why, in --note; a rejection without a reason cannot be acted on")
    async with conn.transaction():
        doc = await _require(conn, doc_id)
        was_admitted = doc["admission"] == "admitted"
        await conn.execute(
            """
            update documents
            set admission = 'rejected', admission_by = %s, admission_at = now(),
                admission_note = %s, review_state = 'ai_assisted_pending_review',
                reviewed_by = null, reviewed_at = null, self_review = null, updated_at = now()
            where id = %s
            """,
            (by, note, doc_id),
        )
        await conn.execute(
            """
            update chunks
            set review_state = 'ai_assisted_pending_review', reviewed_by = null,
                reviewed_at = null, self_review = null
            where document_id = %s
            """,
            (doc_id,),
        )
        item = await open_review_item(conn, "document", doc_id)
        await add_event(conn, item, "rejected", by, note=note)
        await close_review_item(conn, item)
        invalidated = 0
        if was_admitted:
            await bump_corpus_revision(conn)
            invalidated = await invalidate_citing(conn, doc_id, f"{doc_id} was rejected: {note}")
        return invalidated


async def verify_answer(
    conn: Conn, answer_id: str, *, by: str, self_review: bool, note: str = ""
) -> None:
    check_handle(by)
    async with conn.transaction():
        cur = await conn.execute(
            "select status, review_state, invalidated_at from answers where id = %s", (answer_id,)
        )
        row = await cur.fetchone()
        if row is None:
            raise ReviewError(f"no answer {answer_id}")
        if row["status"] != "answered":
            raise ReviewError("only an answer can be verified; a refusal has nothing to check")
        if row["invalidated_at"] is not None:
            raise ReviewError("that answer was invalidated; it is no longer served")
        await conn.execute(
            "update answers set review_state = 'verified', reviewed_by = %s, reviewed_at = now(), "
            "self_review = %s where id = %s",
            (by, self_review, answer_id),
        )
        item = await open_review_item(conn, "answer", answer_id)
        await add_event(conn, item, "verified", by, self_review=self_review, note=note)
        await close_review_item(conn, item)


CHECKLIST = """\
### 1. Source is legitimate
- [ ] The cited source is official and eligible (docs/data-governance.md).

### 2. Citation resolves
- [ ] The link loads and points at the original official document.
- [ ] The fetch date is recorded and the archived checksum matches.

### 3. Content matches the source
- [ ] The extracted text says what the PDF says. Compared against the **PDF itself**, not
      against the extraction.
- [ ] Nothing was added that the source does not support.

### 4. Tagging is correct
- [ ] `exam_level`, `service_group`, `province`, `year` and `doc_type` are right. Level 4
      and Level 7 do not leak across.

### 5. Currency
- [ ] This is the in-force version, not a superseded one.

### 6. Legal boundary
- [ ] Nothing is republished wholesale; quotation stays limited (NOTICE).

### 7. State
- [ ] Mark `verified` only if you did all of the above. Record whether it was self-review.
"""


def issue_markdown(doc: dict[str, Any]) -> tuple[str, str]:
    """Title and body for the ADR-0009 review issue of one document."""
    title = f"[review] {doc['id']}: {doc['title']}"
    level = doc["exam_level"] or "any level (reference document)"
    ocr = (
        "This text came from **OCR**. It cannot be admitted until someone compares it against "
        "the PDF directly (ADR-0009)."
        if doc["extraction_method"] == "ocr"
        else "Text layer, not OCR."
    )
    extraction = (
        f"{doc['extraction_backend']}, confidence {float(doc['extraction_confidence']):.3f}, "
        f"{doc['gibberish_lines_dropped']} unreadable legacy-font lines dropped"
    )
    body = f"""## Document

| Field | Value |
|---|---|
| Id | `{doc["id"]}` |
| Title | {doc["title"]} |
| Authority | {doc["authority"]} |
| Class / type | {doc["doc_class"]} / {doc["doc_type"]} |
| Exam level | {level} ({doc["level_basis"]}) |
| Province | {doc["province"]} |
| Service groups | {", ".join(doc["service_groups"]) or "none"} |
| Official URL | {doc["source_url"]} |
| Linked for students | {doc["resolvable_url"]} |
| Fetched | {doc["fetched_at"]:%Y-%m-%d} |
| SHA-256 | `{doc["checksum"]}` |
| Extraction | {extraction} |
| Chunks | {doc["chunk_count"]} |
| Admission | {doc["admission"]} |

{ocr}

## Checklist (docs/review-checklist.md)

{CHECKLIST}
## Recording the decision

```
agrilok-ingest review admit {doc["id"]} --by @you --self-review
agrilok-ingest review verify {doc["id"]} --by @you --self-review --checklist-done
agrilok-ingest review reject {doc["id"]} --by @you --note "why"
```
"""
    return title, body
