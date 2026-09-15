# apps/web - student-facing PWA

> **Status: not implemented.** Phase 1. See [roadmap](../../docs/roadmap.md).

Next.js + Tailwind, built as a Progressive Web App.

## What belongs here

Everything a student sees: syllabus browser, Ask-AI with citations, mock tests,
spaced-repetition review, offline topic packs.

## What does not

- **Any secret.** No Gemini key, no Supabase service-role key. Only
  `NEXT_PUBLIC_*` values reach the browser, and those are public by definition.
- Retrieval or generation logic. That lives in `apps/api`.
- Content authoring. Content comes from the pipeline with provenance attached.

## Design constraints

These are requirements, not preferences:

- **Assume a phone on intermittent rural bandwidth.** Text-first, small
  payloads, minimal images. Test at phone width and on a throttled connection.
- **Offline-capable.** Students download topic packs and study without a
  connection.
- **Citations are never optional UI.** Every answer shows its source document
  and fetch date, and the link resolves.
- **The review state is always visible** - `verified` or `AI-assisted, pending
  review`. Never blur them, never hide the second one because it looks worse.
- **Nepali and English are both first-class.** Do not assume English input or
  English rendering. Do not truncate Devanagari naively.
- **Level 4 and Level 7 never mix**, in routing, filters or navigation.

## Setup

Not yet. Node version is pinned in [`.nvmrc`](../../.nvmrc).
