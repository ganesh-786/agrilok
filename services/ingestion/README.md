# services/ingestion - raw documents to retrievable chunks

> **Status: Phase 1 MVP.** Text-layer extraction, the review queue with its
> admission gate, chunking, embedding and answer pre-generation. **OCR is not
> implemented**: a scanned PDF is reported as needing OCR and is not ingested.
> See [roadmap](../../docs/roadmap.md).

```
raw file -> extract -> clean + tag -> HUMAN REVIEW -> chunk -> embed -> pgvector
```

## Stage responsibilities

| Stage | Must guarantee |
|---|---|
| **extract** | PDF text layer first (pypdfium2); OCR (`nep+eng`) only when there is no text layer; confidence score attached ([ADR-0002](../../docs/adr/0002-text-layer-before-ocr.md)). Legacy-font Devanagari (Preeti and similar) is detected and flagged for review |
| **clean + tag** | deduped, boilerplate stripped, tagged `{exam_level, service_group, province, year, doc_type}` |
| **review** | nothing is retrievable until a named person admits it; low-confidence extractions need a recorded comparison against the PDF first ([ADR-0012](../../docs/adr/0012-admission-gate-before-serving.md)) |
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
`service_groups`, `province`, `year`, `doc_type`, `extraction_method`,
`extraction_confidence`, `review_state`, `reviewed_by`, `reviewed_at`,
`section_heading`, `chunk_index`.

None of these are optional - retrieval filtering, citations, staleness detection
and the review workflow all depend on them.

## Note on dependencies

Extraction uses pypdfium2 (Apache-2.0 / BSD-3-Clause). It recovers the same
Devanagari as the spike's extractor on the real corpus. PyMuPDF was not used:
it is fast but **AGPL-3.0**, with real implications for private forks. The
extraction interface keeps the library swappable. See [NOTICE](../../NOTICE).

## Changing anything here

Extraction and chunking changes alter the corpus and therefore every answer.
Run the golden set before and after: [evaluation.md](../../docs/evaluation.md).

## Running it

The command is `agrilok-ingest`. Every review decision names a person with
`--by @handle` and says whether it was a self-review; nothing is admitted or
verified by default.

```sh
uv run agrilok-ingest import-phase0          # the Phase 0 corpus, queued
uv run agrilok-ingest status                 # corpus and review queue
uv run agrilok-ingest review list
uv run agrilok-ingest review show <doc-id>
uv run agrilok-ingest review admit <doc-id> --by @you --self-review
uv run agrilok-ingest embed --yes            # vectors for admitted chunks
uv run agrilok-ingest pregenerate --file data/pregenerate/common-questions.yaml
uv run agrilok-ingest answers list           # review pre-generated answers
```

`add --manifest F --id D --pdf P` brings in one new document. `review issue`
drafts a review issue for a document, and `--create` opens it with `gh`.
Both `embed` and `pregenerate` spend Gemini quota. `embed` only says what it
would do until it gets `--yes`; `pregenerate --dry-run` lists the questions
without calling the model.

Chunk size is counted in approximate tokens (words / 0.75), ported from the
spike so the chunks match what the golden set measured. It undercounts
Devanagari. Replacing it with a real tokeniser is a measured change.
