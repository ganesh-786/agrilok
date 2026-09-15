# Glossary

## Exam domain

| Term | Meaning |
|---|---|
| **Loksewa** | Nepal's public service commission examinations, and colloquially the whole preparation culture around them |
| **PSC** | Public Service Commission - the federal body, psc.gov.np |
| **Provincial PSC** | One of seven provincial commissions (Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpaschim), each publishing its own curricula for nominally the same post |
| **Level 4 / JTA** | Junior Technical Assistant - diploma or certificate-level technical post. Two papers, heavier on field and practical content |
| **Level 7 / Officer** | Sakha Adhikrit - degree-level. Paper 1 objective, Paper 2 subjective with case studies, then an interview |
| **Service group** | Agronomy, Horticulture, Agri-Extension, Soil Science, Agri-Economics & Marketing, Veterinary |
| **Curriculum / syllabus** | The official published scope of an exam for a specific post, level and province |
| **Vacancy notice** | The official announcement opening applications for a post |
| **NARC** | Nepal Agricultural Research Council |
| **AFU / IAAS** | Agriculture and Forestry University / Institute of Agriculture and Animal Science |
| **Bikram Sambat (BS)** | Nepal's official calendar. Appears alongside Gregorian dates in official documents, sometimes in the same document |

## System

| Term | Meaning |
|---|---|
| **RAG** | Retrieval-augmented generation - answering from retrieved documents rather than model memory |
| **Chunk** | A retrievable unit of source text, ~400 tokens, with metadata and provenance attached |
| **Provenance** | Source URL + fetch timestamp + checksum, carried from the raw file through to the citation a student sees |
| **Review state** | `verified` (a human checked it against the source) or `ai_assisted_pending_review`. Never blurred, never a third value |
| **Whitelist** | `data/sources/whitelist.yml` - the only domains the crawler may fetch |
| **Golden set** | Curated real past-paper questions with known-correct answers; defines "correct" |
| **Faithfulness** | Whether an answer is actually supported by the text that was retrieved |
| **Answer relevancy** | Whether the answer addresses the question that was asked |
| **Context precision** | Whether the retrieved chunks were relevant |
| **Context recall** | Whether the needed information was retrieved at all |
| **Semantic cache** | Reusing a previously-generated answer for a sufficiently similar new question |
| **Pre-generation** | Generating a topic explanation once and serving it to everyone - one API call, many students |
| **Quota governor** | The component that keeps request volume below the configured free-tier ceiling and degrades visibly |
| **Text layer** | Embedded text in a PDF. Present in born-digital PDFs, absent in scans - which is where OCR comes in |
| **Indirect prompt injection** | Instructions hidden in retrieved content that try to hijack the model. Defended against by fencing retrieved text as data |

## Project

| Term | Meaning |
|---|---|
| **Phase 0** | The validation spike that must pass before production code begins |
| **Go/no-go gate** | The five checks in [roadmap.md](roadmap.md#gono-go-gate) |
| **ADR** | Architecture decision record, in [adr/](adr/) |
| **Whitelist owner** | The single named person who may approve a new source |
| **Fair dealing** | The provision in Nepal's Copyright Act, 2059 permitting use for private study, research, teaching and citation - the basis on which this project ingests government documents |
