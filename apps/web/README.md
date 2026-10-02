# apps/web - student-facing PWA

> **Status: student-experience prototype.** The current branch focuses on a
> responsive study flow for Level 4 and Level 7 on phones and laptops: syllabus,
> practice, mistake review, updates, guidance, offline reading and cited Ask.
> Demo content is labelled and must not be used as exam material.

Next.js (App Router) with Tailwind, built as a Progressive Web App. Nepali is
the default language; English is one tap away.

## What belongs here

Everything a student sees: exam setup, the study home, official syllabus
structure, practice and review, updates, guidance, Ask with citations, source
pages, and offline saving.

## What does not

- **Any secret.** No Gemini key, no Supabase service-role key. Only
  `NEXT_PUBLIC_*` values reach the browser, and those are public by definition.
- Retrieval or generation logic. That lives in `apps/api`.
- Content authoring. Content comes from the pipeline with provenance attached.

## Design constraints

These are requirements, not preferences:

- **Phones and laptops both matter, including intermittent bandwidth.**
  Text-first, small payloads, minimal images. Test narrow and wide screens;
  preserve offline reading and graceful network failures.
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
- **Preferences are cookies or device-local settings, not accounts.**
  `agrilok_lang` picks Nepali or English. The light/dark choice is stored only
  in `localStorage` and never identifies the student.
- **Offline.** [`public/service-worker.js`](public/service-worker.js) serves
  pages network-first and static assets cache-first, and never touches a POST.
  "Save for offline reading" asks [`app/api/offline-pack`](app/api/offline-pack/route.ts)
  for one level's pages (its syllabi, documents and prepared answers) and
  caches them.
- **Security headers** come from [`next.config.ts`](next.config.ts), and the
  content security policy with a per-request nonce from [`proxy.ts`](proxy.ts).

## Design

- **Colour** is ink on paper. Text and every button are one blue-black ink,
  so a colour means exactly one thing: Level 4 blue, Level 7 violet, correct,
  wrong, or pending review, each also written in words. The terrace logo is
  the one green thing on the page. Semantic tokens in
  [`app/globals.css`](app/globals.css) define all light and dark pairs, and
  [`lib/design.test.ts`](lib/design.test.ts) measures their contrast.
- **Type** uses two self-hosted families from the Noto Devanagari project:
  Noto Sans Devanagari (variable) for text and the interface, and Noto Serif
  Devanagari (one static weight, 600) for headings and question stems, the way
  a printed question paper sets them. Nepali body text is 18px, English 17px.
  Fonts load from this origin and require no build-time CDN request. Credits
  include the actual fonts and license.
- **Layout** uses ruled sections instead of a stack of cards, one filled block
  per screen for the next study action, narrow reading columns, and five
  labelled destinations: a bottom bar below 1024px, tabs in the masthead above.
- **The exam bar** on every study page names the exam in its level colour and
  opens three labelled native selects to change level, commission or service
  group in place. Deeper pages carry a breadcrumb back to their destination.
- **Navigation feedback.** Study pages render on request, so a tapped tab
  marks itself at once and a hairline runs across the top until the page
  arrives. An exam without a syllabus gets a page per destination that says
  what is missing, and Updates keeps working.
- **Task priority** puts quick/mock practice choices before subject browsing,
  free Ask tools before its phone form, and a usable study action on Home with
  JavaScript disabled. Source metadata and the compact demo warning remain
  visible; native disclosures hold additional detail.
- **Imagery** is intentionally non-essential. Three openly licensed
  photographs of Nepali fields decorate the main block on Home and Practice
  and the setup page; every page reads the same without them. Credits are in
  `content/photos.ts` and on `/credits`.
- **The service worker** keeps only files the server marks immutable, so it
  can never serve an old stylesheet over a new page. In development the app
  removes any worker left by an earlier production preview and reloads once.
- **Motion** answers an action: a press (120ms), a result or the pending
  navigation hairline (180ms), a panel or dialog that opens (240ms). Nothing
  animates on page load or scroll, and all of it is off under
  `prefers-reduced-motion`, where the hairline becomes a still line.

The colours, type, layout and motion as built, with what was measured and what
was dropped, are recorded in
[docs/design-system.md](../../docs/design-system.md).

## Setup

Node is pinned in [`.nvmrc`](../../.nvmrc). The API must be running first; see
[apps/api](../api/README.md).

```sh
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

Configuration is read from the environment on the server:

| Variable               | Default                 | What it is                                                                                                         |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `AGRILOK_API_URL`      | `http://127.0.0.1:8000` | Where the API listens                                                                                              |
| `API_INTERNAL_TOKEN`   | empty                   | Shared with the API. With it set, the API rate-limits per student instead of treating the web server as one client |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public address, used in share links, the sitemap and the manifest                                                  |
| `AGRILOK_DEMO_BANNER`  | off                     | Set to `1` to show the "demo content" band on every study page. Turn it on before a build with demo content is shared |

## Scripts

| Script                        | What it does                                              |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                 | Development server on port 3000                           |
| `npm run build` / `npm start` | Production build and server                               |
| `npm run lint`                | ESLint                                                    |
| `npm run typecheck`           | Generates route types, then `tsc --noEmit`                |
| `npm test`                    | Vitest unit tests                                         |
| `npm run test:e2e`            | Playwright desktop and Pixel 5 browser tests              |
| `npm run test:e2e:ui`         | Playwright UI runner for local debugging                  |
| `npm run format:check`        | Prettier (Markdown is wrapped by hand and excluded)       |
| `npm run icons`               | Re-renders the app icons after a change to `app/icon.svg` |

Install the Playwright browser once with `npx playwright install chromium`.
Run lint, typecheck, unit tests, Playwright tests, format check and build before
a pull request. Check a changed page at 390px wide in both themes.

The development badge is switched off in [`next.config.ts`](next.config.ts):
on a phone-width screen it sat on the Home tab and swallowed the tap. Compile
and runtime errors still appear.
