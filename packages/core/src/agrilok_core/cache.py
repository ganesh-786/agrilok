"""The answer cache (ADR-0004): exact and near-duplicate questions reuse a stored answer.

An answer is only reused while it is still true to its sources:

- an answered question is reused only if every document it cites is still
  admitted, not superseded, and has the same checksum it was cited at;
- a refusal is reused only at the corpus revision it was made at, because a
  newly admitted document may answer what used to be refused, and only if the
  same version of the support check made it, because a changed check may
  answer what an older one withheld.

Near-duplicate reuse applies to answered questions only, never to refusals: a
refusal for "Article 36" must not be served for "Article 63". The matched
question is always returned, so the student can see what was actually asked.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from typing import Any

from agrilok_core.db import Conn, vector_literal
from agrilok_core.support_check import SUPPORT_CHECK_VERSION
from agrilok_core.text import question_key


def question_hash(level: str, province: str | None, group: str | None, question: str) -> str:
    key = f"{level}|{province or ''}|{group or ''}|{question_key(question)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


async def corpus_revision(conn: Conn) -> int:
    cur = await conn.execute("select revision from corpus_state where id = 1")
    row = await cur.fetchone()
    return int(row["revision"]) if row else 0


async def bump_corpus_revision(conn: Conn) -> int:
    cur = await conn.execute(
        "update corpus_state set revision = revision + 1, updated_at = now() "
        "where id = 1 returning revision"
    )
    row = await cur.fetchone()
    return int(row["revision"]) if row else 0


async def _still_valid(conn: Conn, row: dict[str, Any]) -> bool:
    if row["status"] == "refused":
        if row.get("check_version") != SUPPORT_CHECK_VERSION:
            return False
        return int(row["corpus_revision"]) == await corpus_revision(conn)
    cited: dict[str, str] = row.get("cited_documents") or {}
    if not cited:
        return False
    cur = await conn.execute(
        "select id, checksum from documents "
        "where id = any(%(ids)s) and admission = 'admitted' and not superseded",
        {"ids": list(cited)},
    )
    current = {r["id"]: r["checksum"] for r in await cur.fetchall()}
    return all(current.get(doc_id) == checksum for doc_id, checksum in cited.items())


async def invalidate(conn: Conn, answer_id: str, reason: str) -> None:
    await conn.execute(
        "update answers set invalidated_at = now(), invalidated_reason = %s "
        "where id = %s and invalidated_at is null",
        (reason, answer_id),
    )


async def invalidate_citing(conn: Conn, document_id: str, reason: str) -> int:
    """Invalidate every live answer that cites a document. Returns how many."""
    cur = await conn.execute(
        "update answers set invalidated_at = now(), invalidated_reason = %s "
        "where invalidated_at is null and cited_documents ? %s",
        (reason, document_id),
    )
    return cur.rowcount


async def lookup_exact(conn: Conn, qhash: str) -> dict[str, Any] | None:
    cur = await conn.execute(
        "select * from answers where question_hash = %s and invalidated_at is null "
        "order by created_at desc limit 1",
        (qhash,),
    )
    row = await cur.fetchone()
    if row is None:
        return None
    if not await _still_valid(conn, row):
        await invalidate(conn, row["id"], "a cited document changed or the corpus grew")
        return None
    return dict(row)


async def lookup_similar(
    conn: Conn,
    *,
    level: str,
    province: str | None,
    group: str | None,
    query_vector: Sequence[float],
    threshold: float,
) -> tuple[dict[str, Any], float] | None:
    cur = await conn.execute(
        """
        select *, 1 - (question_embedding <=> %(qv)s::vector) as similarity
        from answers
        where invalidated_at is null
          and status = 'answered'
          and question_embedding is not null
          and exam_level = %(level)s
          and province is not distinct from %(province)s
          and service_group is not distinct from %(group)s
        order by question_embedding <=> %(qv)s::vector
        limit 1
        """,
        {
            "qv": vector_literal(query_vector),
            "level": level,
            "province": province,
            "group": group,
        },
    )
    row = await cur.fetchone()
    if row is None or float(row["similarity"]) < threshold:
        return None
    if not await _still_valid(conn, row):
        await invalidate(conn, row["id"], "a cited document changed")
        return None
    return dict(row), float(row["similarity"])


async def record_hit(conn: Conn, answer_id: str) -> int:
    cur = await conn.execute(
        "update answers set served_count = served_count + 1, last_served_at = now() "
        "where id = %s returning served_count",
        (answer_id,),
    )
    row = await cur.fetchone()
    return int(row["served_count"]) if row else 0
