"""Add one new document from a local PDF and its manifest entry.

The path for a document fetched by the crawler or downloaded by hand after
Phase 0: extract the text layer, drop unreadable legacy-font lines (and count
them), chunk, store as `queued`, open its review item. No embeddings are
made here: that spends quota, and a queued document may never be admitted.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from agrilok_core.corpus import insert_chunk
from agrilok_core.db import Conn
from ingestion.chunking import approx_tokens, chunk_text
from ingestion.extract import BACKEND, extract_text_layer, file_facts
from ingestion.legacy_font import remove_gibberish_lines
from ingestion.manifest import DocumentManifest
from ingestion.store import (
    existing_checksum,
    insert_document,
    known_service_groups,
    open_review_item,
)


class AddError(RuntimeError):
    pass


@dataclass(frozen=True)
class AddReport:
    doc_id: str
    pages: int
    chunks: int
    confidence: float
    dropped_lines: int


async def add_document(
    conn: Conn,
    manifest: DocumentManifest,
    pdf: Path,
    *,
    source_id: str,
    target_tokens: int,
    overlap_ratio: float,
) -> AddReport:
    unknown = [g for g in manifest.service_groups if g not in await known_service_groups(conn)]
    if unknown:
        raise AddError(f"unknown service group(s): {', '.join(unknown)}")
    facts = file_facts(pdf)
    if (await existing_checksum(conn, manifest.id)) is not None:
        raise AddError(
            f"{manifest.id} already exists; a changed document is a new version with its own review"
        )
    extraction = extract_text_layer(pdf)
    clean, dropped = remove_gibberish_lines(extraction.text)
    chunks = chunk_text(clean, target_tokens=target_tokens, overlap_ratio=overlap_ratio)
    if not chunks:
        raise AddError(f"{manifest.id}: nothing readable left after removing legacy-font lines")
    async with conn.transaction():
        await insert_document(
            conn,
            manifest,
            source_id=source_id,
            checksum=facts.checksum,
            size=facts.bytes,
            extraction_method="text_layer",
            extraction_backend=BACKEND,
            extraction_confidence=extraction.analysis.confidence,
            gibberish_lines_dropped=dropped,
        )
        for index, chunk in enumerate(chunks):
            await insert_chunk(
                conn,
                chunk_id=f"{manifest.id}-{index:03d}",
                document_id=manifest.id,
                chunk_index=index,
                text=chunk.text,
                approx_tokens=approx_tokens(chunk.text),
                section_heading=chunk.section_heading,
                embedding=None,
                embedding_model=None,
            )
        await open_review_item(conn, "document", manifest.id, note=f"Added from {pdf.name}.")
    return AddReport(
        doc_id=manifest.id,
        pages=extraction.pages,
        chunks=len(chunks),
        confidence=extraction.analysis.confidence,
        dropped_lines=dropped,
    )
