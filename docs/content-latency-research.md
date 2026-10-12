# Content loading and Nepali-to-English research

Research date: 2026-10-01. Scope: the current working tree, local browser measurements,
the API and ingestion code, and primary-source technical documentation. This is an
investigation and proposed design, not an implemented fix or production certification.
Existing application changes were left intact.

## Implemented follow-up: the provider queue and the question deadline (2026-10-06)

Two of the mechanisms under [Why minutes are possible](#why-minutes-are-possible)
are fixed, so that section describes the code as it was on the research date.
The shared rate gate that spaced requests six seconds apart is replaced by a
ceiling on how many start in a minute, per kind. A question now has one
deadline for waiting, attempts and retries together. The measurements are in
[evaluation.md](evaluation.md#speed-what-was-measured-without-a-model-2026-10-06).
Read pages that wait on the API, and the rest of that section, are unchanged.

## Implemented follow-up: the app's language button and Sources

The owner confirmed that the slow control is agrilok's English/Nepali button,
not Chrome's translation menu. Repository and network inspection found no
Google Translate library/script/request. `tr()` reads the stored `text[lang]`;
the language action sets a cookie and redirects. Neither that operation nor
Sources calls Gemini. The earlier discussion of generation delays concerns a
different path and does not explain this button's conversion work.

The reproduced defect is dependency coupling: Sources waited for `/meta` and
both document catalogues, with a 120-second upstream read timeout. A language
switch rerendered Sources and could wait on the same dependencies. A controlled
12-second catalogue failure produced a 12.248-second page load and a 13.061-second
language switch, with no external browser requests. This proves the failure
mechanism, not what stalled the backend during the owner's original incident.

Changes now implemented:

- [API read transport](../apps/web/lib/api-read.ts) enforces a five-second read
  budget across headers and JSON-body consumption, even with a caller's signal.
  It handles timeout, transport and malformed-body failures as unavailable, while
  preserving a genuine 404. The live Ask timeout is separate and unchanged.
- [Server API adapter](../apps/web/lib/api.ts) explicitly memoizes shared record
  reads for one server render with React `cache`. Timeout signals opt fetch out
  of automatic request memoization; metadata and page rendering now share a read.
  Existing persistent data-cache lifetimes remain in place.
- [Sources](../apps/web/app/(site)/sources/page.tsx) uses the existing bilingual
  taxonomy for labels, removing `/meta` and its unrelated quota/statistics reads.
  Catalogues still load in parallel. A failed level is unavailable rather than
  falsely empty, while successful levels remain visible. Shared reference documents
  can come from either successful catalogue. Review states, dates and official
  links still come from API records.

No translation service, generated English content, dependency or background
worker was added. Source titles and document outlines remain original API text;
changing interface language does not translate a field that has no English variant.
Waiting longer cannot produce a missing translation.

### Production verification of this follow-up

Tests used empty catalogue fixtures on an isolated local upstream; no real database,
government site or model was needed. The baseline used a production build with
`next start`; the final regression used the production standalone server with static
assets copied as in the Dockerfile. A fresh upstream origin avoids earlier Next
data-cache entries. A prior warm-cache result was excluded from the failure comparison.

| Check | Observed result |
| --- | --- |
| Sources, injected 12-second Level 7 failure | Before: 12.248 s; final: 5.413 s including rendering/load overhead |
| Sources language switch during that failure | Before: 13.061 s; final: 6.018 s including action/render overhead |
| Healthy Sources language switch | 195 ms |
| Syllabus language switch | 431 ms; zero API reads |
| Ask prototype language switch | 207 ms; zero API reads |
| Sources `/meta` calls | Zero, including the language switch |
| Document metadata plus page, missing record | One upstream record request; genuine HTTP 404 |
| Partial catalogue failure | Healthy Level 4 remains visible |
| Native language form with JavaScript disabled | Passed in the production browser |
| External browser request hosts | None |
| Sources reflow at 390, 768 and 1440 px, both themes | No horizontal overflow in the tested fixture state |
| Focused transport and existing web unit tests | 27 passed, including stalled headers/body and caller cancellation |
| Type check and production build | Passed |
| Changed-file ESLint and formatting | Passed |

The full web unit suite reported 29 passing and four failures in the existing
design contrast tests, which require a missing `on-action` token. Those tests and
the stylesheet were not modified by this fix. Full lint reported no errors and
one unrelated unused `fmt` warning in exam Home. These results do not certify
production readiness or real-student usability.

Repeat the isolated browser regression from `apps/web`:

```powershell
npm.cmd run build
node scripts/verify-content-loading.mjs
npm.cmd exec vitest -- run lib/api-read.test.ts lib/web.test.ts
```

[The regression script](../apps/web/scripts/verify-content-loading.mjs) starts
and stops its own local production server on port 3101 and its own mock upstream.
It writes measurements to `.local/content-latency-after-regression.json`.
The transport tests use a real local HTTP server, including responses that send
headers and then never finish the body.

Remaining limits: no trace from the original minutes-long incident; no production
deployment or field percentiles; no guarantee of English versions for original
source text. The five-second budget prevents prolonged dependency waiting, but a
cold read during an outage can still take that budget plus rendering overhead.
The offline-cache findings and proposed ingestion work below remain unimplemented.
Below this follow-up, descriptions of 120-second reads and Sources' metadata
dependency document the pre-fix baseline.

## Finding

There is no single translation bottleneck across the application. Three different
paths have to be diagnosed separately:

1. The current study prototype reads stored bilingual demo data. Language switching
   selects existing English text; it does not translate Nepali through a model.
2. Sources, document detail and saved-answer pages still call the real API. Their
   dependency failures can hold a page for up to the configured 120-second fetch deadline.
3. The separate live-answer pipeline performs external embedding and generation.
   A shared rate gate and retries can accumulate minutes without an overall deadline.

The reported minutes-long incident was **not reproduced** on the sampled local routes.
The exact affected URL, action, browser/network conditions and incident trace remain
unknown. The code establishes failure mechanisms, not which one occurred in that incident.

For accuracy, there is concrete historical evidence: 785 legacy-font lines in 10 of
18 sampled government PDFs. Extraction can produce text successfully while producing
unreadable Preeti/Kalimati bytes. Translation cannot reliably recover meaning from
missing or incorrectly decoded source material. See
[the measured extraction record](../spike/reports/extraction-notes.md).

## Current paths and evidence

```text
Study prototype
  page -> lib/data -> stored {ne, en} demo content -> server-rendered page
  language form -> setLanguage -> cookie -> redirect/render -> stored English

API-backed library pages
  Sources / documents / saved answers -> Next server -> FastAPI -> Postgres

Separate real Ask pipeline
  privacy check -> exact answer cache
    miss -> rate gate -> external query embedding -> semantic answer cache
      miss -> filtered keyword/vector retrieval -> rate gate -> generation
        -> JSON parse -> support/citation checks -> store -> response

Current ingestion
  local PDF -> text-layer extraction -> legacy-font detection/line removal
    -> chunk -> admission/review and embedding -> searchable corpus
  scan without useful text -> reported as needing OCR; OCR is not implemented
```

The diagram separates responsibilities, not a claim that every step is automatically
connected. Ingestion commands and review are currently operated manually.

| Evidence | What it establishes |
| --- | --- |
| [Data adapter](../apps/web/lib/data/index.ts) | `DATA_MODE` is `demo`; current written Ask uses `answerFromLibrary`, not the real generation pipeline |
| [Bilingual contract](../apps/web/lib/contracts.ts), [dictionaries](../apps/web/lib/i18n/index.ts) | Study text and interface strings already exist in both languages |
| [Language action](../apps/web/app/actions.ts), [preferences](../apps/web/lib/preferences.ts) | Language switching writes a cookie and redirects; no translation request |
| [API client](../apps/web/lib/api.ts) | Read fetch deadline is 120 seconds; real Ask deadline is 180 seconds |
| [Provider settings](../packages/core/src/agrilok_core/settings.py) | Default rate ceiling is 10 calls/minute and per-operation HTTP timeout setting is 90 seconds |
| [Provider client](../packages/core/src/agrilok_core/gemini.py) | Embeddings, generation, retries and metadata use one client rate gate; four retries are allowed on the default path |
| [Runtime](../packages/core/src/agrilok_core/runtime.py) | One provider client is shared within each runtime; daily attempt reservation uses Postgres |
| [Pipeline](../packages/core/src/agrilok_core/pipeline.py) | Embedding precedes semantic-cache lookup; generation is sequential after retrieval; no overall question deadline |
| [Extractor](../services/ingestion/src/ingestion/extract.py), [legacy detection](../services/ingestion/src/ingestion/legacy_font.py) | OCR and a legacy-font decoder are absent; unreadable lines can be removed |
| [Answer schema](../apps/api/src/agrilok_api/schemas.py), [prompt](../packages/core/src/agrilok_core/prompt.py) | Live API accepts no answer-language parameter and returns one `answer_text`; changing interface language does not guarantee a translated live answer |

## Local measurements

Headless Chromium through the installed Playwright package, a fresh browser context,
loopback connection to the already-running server, normal network, no CPU throttling.
Each Nepali page was loaded twice with `page.goto`, waiting for `load`. Timings below
are wall-clock milliseconds around navigation; TTFB is from the Navigation Timing API.
An isolated browser context exercised the language form. No live model request or
government crawl was made.

| Route/action | First load | Repeat load | TTFB first/repeat |
| --- | ---: | ---: | ---: |
| `/level-4/lumbini/agri-extension` | 740 ms | 424 ms | 225 / 233 ms |
| `/level-4/lumbini/agri-extension/syllabus` | 807 ms | 766 ms | 649 / 611 ms |
| `/level-4/lumbini/agri-extension/ask` | 427 ms | 399 ms | 273 / 216 ms |
| `/sources` | 792 ms | 727 ms | 593 / 540 ms |
| Syllabus language form, Nepali to English | 678 ms | Not repeated | Not collected |

The language measurement ended when the root HTML language became `en`, at the same
syllabus URL. No page JavaScript errors were observed in that run. A second fresh
English context loaded Syllabus in 930 ms and Ask in 439 ms. Development resources
were present and no service worker controlled that context: these are development
server measurements, not production or offline evidence. First request in this
browser does not mean the server's route compiler or API cache was cold.

Independent API reads returned: health 27 ms, metadata 382 ms, Level 4 document list
77 ms, all HTTP 200. These are single observations, not latency percentiles.

Not measured: the incident itself, a fresh-server cold compile, live model timings,
queue depth, production build, database query plans, phone network, field Core Web
Vitals, translation accuracy or production offline behavior.

## Why minutes are possible

### 1. A shared provider queue consumes the interactive budget

`_RateGate` holds an async lock while waiting and spaces calls by `60 / 10 = 6`
seconds with the default setting. It limits request starts, not concurrent HTTP
execution, and has no queue length limit or queue-wait deadline.

A cache-miss answer normally needs at least two starts, embedding and generation.
That gives a theoretical ceiling near five novel answers/minute per runtime,
before retries, metadata or batch embedding consume slots. This is a capacity
calculation, not a measured provider quota or guaranteed throughput. Ten embeddings
arriving together can place the tenth start roughly 54 seconds after the first;
generation requests then compete for subsequent starts. Sustainable arrivals above
capacity make the queue grow.

An isolated request can also wait nearly six seconds between embedding and generation
if embedding and retrieval finish quickly. A semantic-cache hit still needs an external
embedding; only an exact valid answer hit bypasses the model entirely.

The configured limiter is local to a client instance. Increasing API replicas can
multiply request starts without increasing a project's provider allowance. Google
documents limits by project, model and tier, with RPM, TPM and RPD dimensions; inspect
the actual account rather than assuming old free-tier numbers remain valid.
[Gemini rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits).

### 2. Retries have an attempt timeout but no operation deadline

The transport allows four retries, meaning five attempts, with backoff capped at
20 seconds. Generation allows two attempts on a non-final fallback candidate and
five on the final candidate. Embedding also has its own retry loop.

Illustrative failure scenario: five embedding attempts each stall for approximately
90 seconds. That alone spends about 450 seconds plus backoff and rate-gate waits,
before generation begins. This is an example of a permitted slow path, not an observed
timing or strict upper bound. HTTPX timeouts apply to connect/read/write/pool phases;
the configured number is not a complete end-to-end wall-clock deadline.

Meanwhile, the web server gives up on real Ask after 180 seconds. Aborting that fetch
does not by itself establish cancellation of FastAPI work. The API may continue
consuming attempts and storing a result after the student sees failure. The existing
[system review](system-design.md) already records the deadline gap as R-10.

Use one retry owner, a bounded attempt budget and jitter. If `Retry-After` exceeds
the remaining deadline, return a retryable unavailable state rather than retrying
earlier just because a backoff cap is shorter.
[AWS guidance on retry backoff](https://aws.amazon.com/blogs/compute/building-well-architected-serverless-applications-building-in-resiliency-part-1/).

### 3. Some read pages wait on the API

Sources and document/answer detail retain real API dependencies while the study
prototype serves local data. A blackholed or stalled upstream can wait near the
120-second read deadline. A refused localhost connection ordinarily fails quickly;
the timeout setting is not a fixed delay on every request.

Use route-specific read budgets and honest error states. Instrument metadata and
body fetching before assuming duplicate `generateMetadata`/page reads are duplicate
network calls: framework fetch memoization may reuse them.

### 4. Development compilation and dynamic rendering add separate costs

The running server includes development assets. Next documents that `next dev`
compiles routes as they are opened. Cold compilation, filesystem work and Windows
resource contention are credible hypotheses for intermittent slow first navigation.
They were not measured as the incident cause here.
[Next local development guide](https://nextjs.org/docs/app/guides/local-development).

The language action adds a server round trip and rerender. Cookies and request headers
are read in the root layout, and CSP uses a new nonce per request. This architecture
requires dynamic HTML. It is not appropriate to promise static/CDN-cached HTML by
simply adding a cache header. Cache content records and immutable assets while
preserving CSP and request-specific rendering.
[Next CSP requirements](https://nextjs.org/docs/app/guides/content-security-policy).

The local fonts already use WOFF2 subsets, `display: swap` and no preload. Font
downloads may affect appearance and layout, but they do not translate text and the
existing configuration does not explain minutes of missing content by itself.

### 5. Offline reads can wait too long and reuse the wrong language

The production service worker uses network-first navigation with no timeout; a
network that stalls without rejecting can postpone the saved-page fallback.
Its page cache keys use the URL, while language is selected by cookie at the same
URL. Nepali and English HTML can overwrite each other in that cache.

These are code-level findings, not reproduced production failures. Introduce explicit
locale-aware offline keys and a bounded network wait. Any stale content must disclose
its saved date and expired review/source status. Retest nonce behavior on restored
HTML; do not casually apply stale-while-revalidate to request-specific HTML.
[Service-worker and HTTP-cache interaction](https://web.dev/articles/service-worker-caching-and-http-caching).

## Why exact English needs a different pipeline

There are three operations, each with its own correctness conditions:

- **Decoding:** legacy font bytes to Unicode Nepali. This needs the correct font
  mapping and character reordering. A Latin-looking token is not necessarily English.
- **OCR:** page pixels to text. This needs script-aware recognition, layout handling
  and comparison with the original PDF. The current text-presence threshold is not
  a complete mixed-page scan detector.
- **Translation:** readable Nepali to meaning-equivalent English. It needs context,
  terminology and review. Translation cannot restore omitted passages safely.

The current `confidence` is a readable-line-share heuristic, not an OCR probability
or a calibrated translation accuracy score. Treat these quality measures separately.
Unicode NFC normalization also does not repair legacy-font encoding. Preserve an
immutable raw extraction alongside any normalized working text, since citation
checks depend on verifiable original passages.

The generation prompt requests an answer, claims and verbatim source quotes, up to
4096 output tokens. The settings record historical cutoffs for long Devanagari
responses. This makes output length a plausible latency contributor; measure actual
token counts rather than estimating by characters. Capture provider usage metadata
without logging question/source text. Thinking configuration may also affect latency,
depending on the supported model; it is a benchmark candidate, not a confirmed cause.
[Gemini token guide](https://ai.google.dev/gemini-api/docs/tokens),
[Gemini latency troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).

No machine translation should be described as guaranteed exact. For exam material,
check marks, units, dates, section numbers, lists, negation and technical terms.
Keep the original Nepali quotation and page/section locator. An English translation
is a separate derived field, never a replacement verbatim quotation. A source being
verified does not automatically verify its English translation.

## Proposed production design

```text
CONTENT PREPARATION, outside page requests
  approved archive, checksum + URL + fetch date
    -> durable work queue
    -> page/span classification
       -> usable Unicode text: extract with page/span locators
       -> known legacy font: tested decoder, ambiguous spans sent to review
       -> scan/unrecoverable mapping: OCR only affected pages or regions
    -> quality checks against PDF + admission review
    -> versioned Nepali excerpts/study records
    -> English derivation using reviewed glossary
    -> number/unit/structure checks + translation review
    -> chunk/embed original admitted sources + aligned language records
    -> publish permitted bilingual study material atomically

READ REQUEST
  browser -> Next server -> versioned content cache/Postgres -> requested language
  immutable assets -> browser/CDN cache
  offline packs -> locale + exam scope + content version

NEW QUESTION
  browser -> Next -> privacy check -> valid exact answer cache
    miss -> bounded admission + shared provider budgets
      -> cached question embedding or external embedding
      -> measured semantic cache policy -> filtered original-source retrieval
      -> generation within remaining deadline
      -> completed support/citation validation -> result cache -> response
```

Start with the existing Next/FastAPI/Postgres architecture. A Postgres job table
and one ingestion worker are sufficient for a pilot; introduce Redis or a dedicated
broker only when measured contention or operating requirements justify them.
No Kafka or microservice split is needed to fix these failure mechanisms.

### Durable preparation and publication

Store job id, source checksum, stage, attempt count, next retry time, lease expiry,
failure reason and output version. Workers claim a lease transactionally; expired
leases allow crash recovery. Set concurrency limits per extraction/OCR/provider
stage. Resume completed stages rather than redoing the entire document.

Use idempotency keys based on source checksum and stage implementation version.
Publish new content only when the required outputs and embeddings are ready, then
advance the corpus revision. Keep the previous admitted version available unless
it has been superseded or invalidated. No automatic job retry may grant verification.

Job lifecycle states are operational metadata; the content review states remain
exactly `verified` and `ai_assisted_pending_review`. Translation review is tracked
separately with those same permitted values and a named reviewer/version.

Internally retain source/alignment evidence needed for verification. Publicly serve
permitted excerpts, citations and derived study material; do not republish complete
government documents or their complete translations.

### Bilingual records and cache correctness

A derived segment should identify source document/checksum, page/span locator,
source text version, target locale, glossary version, translation method/model,
translation version, review state and reviewer. Use a unique key across these
dimensions to prevent duplicate work and accidental reuse after a source update.

Precompute commonly read Nepali and English study material before students request
it. Missing English should produce an explicit availability state or original text
with a clear label; page loading must not invoke whole-document translation.
Maintain a reviewed agriculture/exam terminology glossary. Glossary mechanisms
support consistent domain terms, but do not prove overall translation fidelity.
Provider choice and Nepali support must be evaluated before adoption.
[Cloud Translation glossary design](https://cloud.google.com/translate/docs/advanced/glossary).

For live Ask, add an explicit target-language contract and include locale in answer
cache identity. Do not simply translate a previously checked answer and inherit its
verification. Every newly derived answer must retain original-source support and
the appropriate review label. Existing cache keys contain exam scope and question,
but not target language.

Embedding-cache keys can use a normalized question hash plus embedding model/version.
Answer keys additionally need exam scope, target locale and relevant corpus/prompt/
validation versions. Source/checksum invalidation must apply to all language variants,
saved-answer links and prepared-question lists.

### Bounded online work

Proposed initial engineering budgets, to benchmark and revise rather than claim as
achieved SLOs:

| Operation | Initial budget/target |
| --- | --- |
| Ordinary server read | 3-5 seconds total before a recoverable error |
| Provider queue wait | At most 2 seconds on the synchronous interactive path |
| Novel synchronous Ask | 25 seconds total API budget, including queue/retries/checks |
| Web Ask fetch | 30 seconds, leaving room above the API budget |
| Offline saved-page recovery | 2-3 second network budget, then labelled cached fallback |
| Reading experience | Measure LCP, INP and CLS against the existing UI-quality contract |

Propagate a monotonic deadline through the operation. Recompute remaining budget
before queue admission, DB work, each provider attempt, backoff and validation.
Set shorter connect/pool/DB limits within that budget. Preserve enough time for
validation; never release an answer just because generation finished at the deadline.
HTTPX phase timeouts remain useful beneath an outer cancellation/deadline scope.

If generation cannot fit consistently, use an explicit durable async job with an
opaque result identifier and bounded polling, or return an honest unavailable state
with retry guidance. A detached in-process background task is not durable. A plain
server-rendered status page can preserve the no-JavaScript flow.

Separate provider budgets by model and operation according to actual project limits,
with a shared limiter across replicas. Reserve capacity for interactive requests;
pause background work when interactive capacity is constrained. Apply RPM, token and
daily constraints. Never increase the local rate above an assumed quota to hide delay.

Coalesce concurrent identical safe questions with a scoped single-flight lease;
still apply privacy and abuse checks per incoming request. Waiters get their own
deadline. Cancellation or lease expiry must not strand all waiters or duplicate work.

Use a circuit breaker for sustained overload and a bounded retry policy within the
total budget. Emit progress stages without exposing source or student text. Streaming
unvalidated prose to students would bypass the support gate; stream status only, then
release the validated answer. Rendering a pending indicator alone does not fix latency.

For OCR, benchmark Nepali/English language data, page segmentation, deskew and image
quality on real approved fixtures. Rendering around 300 DPI is a candidate baseline,
not a universal optimum. Preserve small marks, tables and conjuncts, and process only
the pages that need it.
[Tesseract quality guidance](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html).

## Measurement and rollout order

1. **Capture the affected path.** Record URL, action, language, request id, browser
   waterfall and server timing. Distinguish compile time, time to first byte, response
   download, hydration, font swap, queue wait and provider execution. Repeat on a
   production build in isolation from ongoing development.
2. **Add stage telemetry.** Existing API logs report total request milliseconds but
   not stage breakdowns. Record pool wait, cache lookup/hit type, rate-gate wait,
   embedding, retrieval, generation attempts/backoff/model, validation and persistence.
   Record queue depth, token counts and completion after client abandonment. Log no
   questions, source passages, addresses or secrets. Propagate an internal trace id.
3. **Bound read and Ask lifetimes.** Add overall deadlines, bounded admission and
   dependency failure states. Verify cancellation and async persistence semantics.
   Test overload, stalled provider, long Retry-After and DB pool exhaustion using fakes.
4. **Repair locale/offline identity.** Test Nepali save, English save at the same
   route, refresh, offline reopen and both directions of language switching in a
   production build. Preserve drafts, focus, exam context and no-JavaScript behavior.
5. **Recover readable source text.** Evaluate legacy decoding and OCR against fixed
   PDF fixtures and human transcription. Retain locators and the raw evidence. Do not
   silently delete meaningful unreadable content and claim the document is complete.
6. **Prepare reviewed bilingual records.** Build the glossary and aligned translation
   fixtures. Record critical number/unit/negation errors and reviewer disagreement.
   Keep low-confidence or unreviewed derivatives honestly labelled.
7. **Tune only measured bottlenecks.** Benchmark shorter outputs/model settings,
   embedding cache and pregeneration coverage. Consider vector indexes only after
   query plans and corpus growth demonstrate need. Approximate retrieval, prompt,
   model or cache-policy changes require before/after golden-set and faithfulness
   evidence, separately for Levels 4 and 7 and both languages.

Measure p50/p95/p99 by route, locale, cache state and outcome, with sample counts.
Keep completed-answer latency separate from timeout/rejection rates; rejecting work
quickly must not manufacture an apparent improvement in successful-answer latency.
Benchmark warm/cold caches and 1/5/10 concurrent requests with provider fakes before
spending live quota. Choose sustainable capacity using observed cache hit rates and
actual provider quotas. Do not extrapolate the single local run to real students.

The first implementation priority is deadline/queue observability and bounded waits.
The first content priority is readable, traceable Nepali extraction. Precomputed,
reviewed English then makes language switching a read operation. Neither a larger
timeout nor a more fluent model alone resolves both problems.
