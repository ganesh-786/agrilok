"""Test helpers: seed documents and chunks, and fake the Gemini API.

Used by the tests of every component that runs the pipeline. Not imported by
production code. The fake answers from a script and records every request, so
a test can assert that a path made no model call at all, which is how most of
the cost and safety properties of the pipeline are proven.
"""

from __future__ import annotations

import json
from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

import httpx

from agrilok_core.corpus import insert_chunk
from agrilok_core.db import Conn

DIM = 768
SOURCE_ID = "test-source"
CHECKSUM = "0" * 64


def unit(*components: tuple[int, float]) -> list[float]:
    """A 768-dimension vector from a few (index, weight) components."""
    vector = [0.0] * DIM
    for index, weight in components:
        vector[index] = weight
    return vector


async def reset(conn: Conn) -> None:
    await conn.execute(
        "truncate chunk_terms, chunks, review_events, review_items, answers, documents, "
        "sources, quota_usage, usage_daily cascade"
    )
    await conn.execute("update corpus_state set revision = 0")
    await conn.execute(
        "insert into sources (id, name, acquisition) values (%s, 'Test source', 'manual')",
        (SOURCE_ID,),
    )


async def add_document(
    conn: Conn,
    doc_id: str,
    *,
    level: str | None = "level_7",
    doc_class: str = "syllabus",
    province: str = "lumbini",
    groups: Sequence[str] = ("agronomy",),
    admission: str = "admitted",
    superseded: bool = False,
    title: str | None = None,
    checksum: str = CHECKSUM,
) -> None:
    await conn.execute(
        """
        insert into documents (
            id, source_id, title, authority, doc_class, doc_type, exam_level, level_basis,
            province, service_groups, source_url, resolvable_url, fetched_at, checksum, bytes,
            extraction_method, extraction_backend, extraction_confidence, superseded,
            admission, admission_by, admission_at
        ) values (
            %(id)s, %(source)s, %(title)s, 'Test authority', %(class)s, %(type)s, %(level)s,
            %(basis)s, %(province)s, %(groups)s, %(url)s, %(url)s, '2026-09-16T00:00:00+05:45',
            %(checksum)s, 1000, 'text_layer', 'test', 0.99, %(superseded)s,
            %(admission)s, %(by)s, %(at)s
        )
        """,
        {
            "id": doc_id,
            "source": SOURCE_ID,
            "title": title or f"Document {doc_id}",
            "class": doc_class,
            "type": "curriculum" if doc_class == "syllabus" else "statute",
            "level": level,
            "basis": "stated" if doc_class == "syllabus" else "not_applicable",
            "province": province,
            "groups": list(groups),
            "url": f"https://example.gov.np/{doc_id}.pdf",
            "checksum": checksum,
            "superseded": superseded,
            "admission": admission,
            "by": None if admission == "queued" else "@tester",
            "at": None if admission == "queued" else "2026-09-24T00:00:00Z",
        },
    )


async def add_chunk(
    conn: Conn,
    chunk_id: str,
    doc_id: str,
    text: str,
    vector: Sequence[float] | None,
    *,
    index: int = 0,
    heading: str | None = None,
) -> None:
    await insert_chunk(
        conn,
        chunk_id=chunk_id,
        document_id=doc_id,
        chunk_index=index,
        text=text,
        approx_tokens=len(text.split()),
        section_heading=heading,
        embedding=vector,
        embedding_model="test-embedding" if vector is not None else None,
    )


def generation_response(payload: dict[str, Any]) -> dict[str, Any]:
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}


@dataclass
class FakeGemini:
    """Scripted stand-in for the Gemini REST API."""

    embeddings: dict[str, list[float]] = field(default_factory=dict)
    default_embedding: list[float] | None = None
    generations: list[dict[str, Any]] = field(default_factory=list)
    calls: Counter[str] = field(default_factory=Counter)
    prompts: list[str] = field(default_factory=list)
    on_generate: Callable[[dict[str, Any]], httpx.Response] | None = None

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        body = json.loads(request.content or b"{}")
        if path.endswith(":embedContent"):
            self.calls["embed"] += 1
            text = body["content"]["parts"][0]["text"]
            vector = self.embeddings.get(text, self.default_embedding)
            if vector is None:
                return httpx.Response(500, json={"error": {"message": f"no fake vector: {text}"}})
            return httpx.Response(200, json={"embedding": {"values": vector}})
        if path.endswith(":generateContent"):
            self.calls["generate"] += 1
            self.prompts.append(body["contents"][0]["parts"][0]["text"])
            if self.on_generate is not None:
                return self.on_generate(body)
            if not self.generations:
                return httpx.Response(500, json={"error": {"message": "no scripted generation"}})
            return httpx.Response(200, json=self.generations.pop(0))
        self.calls["other"] += 1
        return httpx.Response(200, json={"name": path.rsplit("/", 1)[-1]})

    def client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self.handler))
