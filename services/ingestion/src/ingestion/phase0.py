"""Import the Phase 0 corpus: the hand-collected documents the golden set was measured on.

Reuses the spike's extraction, chunks and embeddings instead of recomputing
them, for two reasons: the golden-set baseline was measured on exactly these
chunks, and re-embedding ~500 token-heavy Devanagari chunks would spend a day
of embedding quota for nothing (docs/free-tier-budget.md, "Embeddings count too").

Provenance is recomputed, not copied: every checksum comes from the raw PDF on
disk. A document without its raw file is not imported, because its citation
could not be backed by evidence of what was published.

Everything imported is `queued`. Nothing answers a question until a named
person admits it (ADR-0012). This module never admits.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agrilok_core.corpus import content_hash, insert_chunk
from agrilok_core.db import Conn
from ingestion.extract import file_facts
from ingestion.manifest import ManifestError, OutOfScopeError, load_entries, parse_entry
from ingestion.store import (
    ensure_source,
    existing_checksum,
    insert_document,
    known_service_groups,
    open_review_item,
)

SOURCE_ID = "manual-phase0"
SOURCE_NAME = "Collected by hand in Phase 0 from official portals"
SOURCE_NOTE = (
    "Downloaded one by one from each commission's or authority's own website during the "
    "Phase 0 spike (spike/corpus/sources.yaml), before any crawler existed. Not crawled."
)


@dataclass
class ImportReport:
    imported: list[str] = field(default_factory=list)
    skipped: list[tuple[str, str]] = field(default_factory=list)
    chunks: int = 0
    embedded: int = 0
    unembedded: int = 0


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


async def import_phase0(conn: Conn, spike_dir: Path) -> ImportReport:
    corpus = spike_dir / "corpus"
    entries = load_entries(corpus / "sources.yaml")
    extraction = {r["id"]: r for r in _load_json(corpus / "extracted" / "extraction-report.json")}
    chunks_by_doc: dict[str, list[dict[str, Any]]] = {}
    for chunk in _load_json(corpus / "chunks" / "chunks.json"):
        chunks_by_doc.setdefault(chunk["sourceId"], []).append(chunk)
    store = _load_json(corpus / "chunks" / "vectors.json")
    vectors: dict[str, list[float]] = store.get("vectors", {})
    hashes: dict[str, str] = store.get("hashes", {})
    model = str(store.get("model", "gemini-embedding-001"))

    report = ImportReport()
    groups = await known_service_groups(conn)
    await ensure_source(conn, SOURCE_ID, SOURCE_NAME, "manual", SOURCE_NOTE)

    for entry in entries:
        doc_id = str(entry.get("id"))
        try:
            manifest = parse_entry(entry)
        except OutOfScopeError as exc:
            report.skipped.append((doc_id, str(exc)))
            continue
        except ManifestError as exc:
            report.skipped.append((doc_id, f"invalid manifest entry: {exc}"))
            continue

        unknown = [g for g in manifest.service_groups if g not in groups]
        if unknown:
            report.skipped.append((doc_id, f"unknown service group(s): {', '.join(unknown)}"))
            continue
        extracted = extraction.get(doc_id)
        if not extracted or extracted.get("status") != "extracted":
            status = extracted.get("status") if extracted else "not extracted"
            report.skipped.append((doc_id, f"{status}: needs OCR with review (ADR-0009)"))
            continue
        raw = corpus / "raw" / f"{doc_id}.pdf"
        if not raw.is_file():
            report.skipped.append((doc_id, "raw PDF missing, so its checksum cannot be backed"))
            continue
        doc_chunks = sorted(chunks_by_doc.get(doc_id, []), key=lambda c: c["chunkIndex"])
        if not doc_chunks:
            report.skipped.append((doc_id, "no chunks"))
            continue

        facts = file_facts(raw)
        already = await existing_checksum(conn, doc_id)
        if already == facts.checksum:
            report.skipped.append((doc_id, "already imported"))
            continue
        if already is not None:
            report.skipped.append(
                (doc_id, "imported earlier from a different file; a new version needs review")
            )
            continue

        confidence = round(1.0 - float(extracted.get("gibberishLineShare") or 0.0), 3)
        dropped = int(doc_chunks[0].get("gibberishLinesDroppedFromSource") or 0)
        async with conn.transaction():
            await insert_document(
                conn,
                manifest,
                source_id=SOURCE_ID,
                checksum=facts.checksum,
                size=facts.bytes,
                extraction_method="text_layer",
                extraction_backend=str(extracted.get("backend") or "pdf-parse"),
                extraction_confidence=confidence,
                gibberish_lines_dropped=dropped,
            )
            for chunk in doc_chunks:
                text = chunk["text"]
                vector = vectors.get(chunk["chunkId"])
                # A vector only counts if it was computed from this exact text.
                fresh = vector is not None and hashes.get(chunk["chunkId"]) == content_hash(text)
                await insert_chunk(
                    conn,
                    chunk_id=chunk["chunkId"],
                    document_id=doc_id,
                    chunk_index=int(chunk["chunkIndex"]),
                    text=text,
                    approx_tokens=int(chunk.get("approxTokens") or 0),
                    section_heading=chunk.get("sectionHeading"),
                    embedding=vector if fresh else None,
                    embedding_model=model if fresh else None,
                )
                report.chunks += 1
                if fresh:
                    report.embedded += 1
                else:
                    report.unembedded += 1
            await open_review_item(
                conn, "document", doc_id, note="Imported from the Phase 0 corpus; queued."
            )
        report.imported.append(doc_id)
    return report
