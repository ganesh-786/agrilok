# services/ingestion - raw documents to retrievable chunks

> **Status: not implemented.** Phase 1. See [roadmap](../../docs/roadmap.md).

```
raw file -> extract -> clean + tag -> HUMAN REVIEW -> chunk -> embed -> pgvector
```

## Stage responsibilities

| Stage | Must guarantee |
|---|---|
| **extract** | PDF text layer first; OCR (`nep+eng`) only when there is no text layer; confidence score attached ([ADR-0002](../../docs/adr/0002-text-layer-before-ocr.md)) |
| **clean + tag** | deduped, boilerplate stripped, tagged `{exam_level, service_group, province, year, doc_type}` |
| **review** | low-confidence extractions and anything from a newly-added source are checked by a human **before** they can answer a student |
| **chunk** | `CHUNK_TARGET_TOKENS` with `CHUNK_OVERLAP_RATIO` overlap; section headers preserved as metadata |
| **embed** | `gemini-embedding-001`; model and dimensions recorded alongside the vector |

## Hard rules

- **Human review is in the path, not beside it.** A pipeline that publishes
  because a review step was skipped is a bug of the highest severity.
- **Never modify the raw file.** Corrections happen downstream, in derived
  content, with a note.
- **Carry provenance through every stage.** `source_id`, `source_url`,
  `fetched_at`, `checksum` must survive to the chunk, or the citation a student
  sees cannot be built.
- **OCR output cannot be cleared by reading the OCR output.** Review compares
  against the source PDF. Garbled Devanagari is the most likely route for a wrong
  fact into this system.
- **Measure chunk size in tokens, never characters.** Devanagari tokenises
  differently from English.

## Required chunk metadata

`source_id`, `source_url`, `fetched_at`, `checksum`, `exam_level`,
`service_group`, `province`, `year`, `doc_type`, `extraction_method`,
`extraction_confidence`, `review_state`, `reviewed_by`, `reviewed_at`,
`section_heading`, `chunk_index`.

None of these are optional - retrieval filtering, citations, staleness detection
and the review workflow all depend on them.

## Note on dependencies

PyMuPDF is fast but **AGPL-3.0**, with real implications for private forks. The
extraction interface keeps the library swappable. See [NOTICE](../../NOTICE).

## Changing anything here

Extraction and chunking changes alter the corpus and therefore every answer.
Run the golden set before and after: [evaluation.md](../../docs/evaluation.md).
