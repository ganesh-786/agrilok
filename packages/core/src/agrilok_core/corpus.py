"""Writing chunks and their BM25 terms. The one place text becomes retrievable.

Ingestion, the Phase 0 import and the tests all go through these functions, so
a chunk is always indexed with the same tokeniser that queries use
(ADR-0013). Admission is not decided here; a chunk of a queued document is
stored but never retrieved (ADR-0012).
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence

from agrilok_core.db import Conn, l2_normalize, vector_literal
from agrilok_core.text import search_terms


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def replace_terms(conn: Conn, chunk_id: str, text: str) -> int:
    terms = search_terms(text)
    await conn.execute("delete from chunk_terms where chunk_id = %s", (chunk_id,))
    if terms:
        async with conn.cursor() as cur:
            await cur.executemany(
                "insert into chunk_terms (chunk_id, term, tf) values (%s, %s, %s)",
                [(chunk_id, term, tf) for term, tf in terms.items()],
            )
    total = sum(terms.values())
    await conn.execute("update chunks set term_count = %s where id = %s", (total, chunk_id))
    return total


async def insert_chunk(
    conn: Conn,
    *,
    chunk_id: str,
    document_id: str,
    chunk_index: int,
    text: str,
    approx_tokens: int,
    section_heading: str | None,
    embedding: Sequence[float] | None,
    embedding_model: str | None,
) -> None:
    vector = l2_normalize(embedding) if embedding is not None else None
    await conn.execute(
        """
        insert into chunks (
            id, document_id, chunk_index, text, content_hash, approx_tokens, section_heading,
            embedding, embedding_model, embedding_dimensions
        ) values (
            %(id)s, %(doc)s, %(idx)s, %(text)s, %(hash)s, %(tokens)s, %(heading)s,
            %(vector)s::vector, %(model)s, %(dims)s
        )
        """,
        {
            "id": chunk_id,
            "doc": document_id,
            "idx": chunk_index,
            "text": text,
            "hash": content_hash(text),
            "tokens": approx_tokens,
            "heading": section_heading,
            "vector": vector_literal(vector) if vector is not None else None,
            "model": embedding_model if vector is not None else None,
            "dims": len(vector) if vector is not None else None,
        },
    )
    await replace_terms(conn, chunk_id, text)


async def set_embedding(conn: Conn, chunk_id: str, embedding: Sequence[float], model: str) -> None:
    vector = l2_normalize(embedding)
    await conn.execute(
        "update chunks set embedding = %s::vector, embedding_model = %s, embedding_dimensions = %s "
        "where id = %s",
        (vector_literal(vector), model, len(vector), chunk_id),
    )
