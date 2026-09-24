# apps/web - student-facing PWA

> **Status: Phase 1 MVP.** Syllabus library, keyword search and cited answers
> for Level 4 and Level 7. Mock tests and spaced repetition are later phases.
> See [roadmap](../../docs/roadmap.md).

Next.js (App Router) with Tailwind, built as a Progressive Web App. Nepali is
the default language; English is one tap away.

## What belongs here

Everything a student sees: the level pages with their official syllabi, the
document pages that link back to the government PDF, search, Ask with
citations, the prepared answers, and offline saving.

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

## How it is put together

- **The browser never talks to the API.** Pages are server components that
  call `apps/api` from the Next.js server ([`lib/api.ts`](lib/api.ts)), so the
  API address and the shared token stay server-side. Asking a question is a
  server action, so it works with JavaScript switched off.
- **Level is part of the URL** (`/level-4`, `/level-7`), never a query option.
- **Preferences are cookies, not accounts.** `agrilok_lang` picks Nepali or
  English. `agrilok_lite` hides photos, and so does a `Save-Data: on` header,
  which many Android phones send in data saver mode.
- **Offline.** [`public/service-worker.js`](public/service-worker.js) serves
  pages network-first and static assets cache-first, and never touches a POST.
  "Save for offline reading" asks [`app/api/offline-pack`](app/api/offline-pack/route.ts)
  for one level's pages (its syllabi, documents and prepared answers) and
  caches them.
- **Security headers** come from [`next.config.ts`](next.config.ts), and the
  content security policy with a per-request nonce from [`proxy.ts`](proxy.ts).

## Design

- **Colour** comes from the photographs: terrace green, clay soil, mustard, and
  the warm paper of a printed syllabus. Level 4 is always green and Level 7
  always clay. Tokens live in [`app/globals.css`](app/globals.css); every text
  pair meets WCAG AA in both light and dark themes. Add a colour there, with
  its dark value, rather than in a component.
- **Type** is Mukta for text and Martel for headings, both designed for
  Devanagari and Latin together. The base size is 17px because Devanagari
  needs a little more size than Latin to read well on a phone.
- **Photos** are real Nepali farms, in [`assets/photos`](assets/photos), with
  their licence and author in [`content/photos.ts`](content/photos.ts). The
  `/credits` page is built from that file, so a photo without a credit entry
  cannot be used. Next.js serves them resized, as AVIF where the phone supports it.
- **Motion** is kept to hover and focus states, and is off entirely under
  `prefers-reduced-motion`.

## Setup

Node is pinned in [`.nvmrc`](../../.nvmrc). The API must be running first; see
[apps/api](../api/README.md).

```sh
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

Configuration is read from the environment on the server:

| Variable | Default | What it is |
|---|---|---|
| `AGRILOK_API_URL` | `http://127.0.0.1:8000` | Where the API listens |
| `API_INTERNAL_TOKEN` | empty | Shared with the API. With it set, the API rate-limits per student instead of treating the web server as one client |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public address, used in share links, the sitemap and the manifest |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run format:check` | Prettier (Markdown is wrapped by hand and excluded) |
| `npm run icons` | Re-renders the app icons after a change to `app/icon.svg` |

Run lint, typecheck, test, format check and build before a pull request.
Check a changed page at 390px wide in both themes.
