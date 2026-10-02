# UI redesign review

Review date: 2026-10-01. This records implementation evidence, not a claim that
student usability or the whole production service has been certified.

## Fourth pass: the stale page, a filled block with a photograph, subject marks

Night of 2026-10-01 into 2026-10-02, against the working tree of branch
`feat/web-student-experience` (nothing committed). The owner opened the third
pass in their own browser and reported two console errors, a black block in
the light theme with the button and the progress line touching, a Practice
page of plain text, and an exam bar that still did not hide. Scripts and raw
output are in `.local/ui-review/2026-10-01-organise/` (git-ignored).

### One cause behind most of the report

The owner's screenshots showed the third pass's HTML drawn with the second
pass's stylesheet and older scripts. Their Brave profiles hold a service worker
registered for `localhost:3000` (read from the profiles' service-worker
database: 1 and 5 records), left by an earlier production preview on that
address. That worker answered everything under `/_next/static` from its cache
first and for ever, and a development server reuses file names, so:

| What the owner saw | Why |
|---|---|
| "Hydration failed", server and client disagree about Home | New HTML from the server, an old script bundle from the worker's cache |
| "Encountered a script tag while rendering React component" | After a hydration failure React builds the page again in the browser and reports the theme script it meets |
| A black block, an invisible "Open topic", a bar touching the button | New markup, old stylesheet: the old one painted that block in ink and had none of the new spacing classes |
| The exam bar did not hide | The old script bundle had no such behaviour |

Reproduced before fixing (`stale-cache-repro.mjs`): one browser, the old
worker registered as a production page registered it, the stylesheet then
edited on disk. The page kept the old stylesheet.

### What changed

- **Service worker, version 2.** Keeps a build file only when the server marks
  it `immutable`; icons, photographs and pages are network first with the last
  copy as a fallback. Replacing an older version deletes its files and reloads
  the pages it took over.
- **Development removes any worker** it finds, with its asset cache, and
  reloads once if the page had been under one.
- **Theme script.** Rendered through `InlineScript`, the pattern Next.js
  documents, so React no longer reports it when it rebuilds a page; the saved
  theme is re-applied in a layout effect after a development remount.
- **The filled block** is the exam's colour, not a wash and not black, with a
  photograph of Nepali terraces along one edge that drifts slowly. Progress is
  a labelled 9px bar with its share in percent, and the button sits 30px below
  it.
- **Practice.** Every subject has its own icon and a bar of how many of its
  questions this device last answered right. The same icons head the subjects
  in the syllabus.
- **Theme change** sweeps out from the toggle as a circle (View Transitions).
- **Photographs** are back: three of the five Wikimedia Commons files that an
  earlier version shipped, restored from git with their credits; author and
  licence re-read from each Commons page.

### Defects found and corrected

1. The stale-asset fault above.
2. The first version of the new worker reloaded the page from inside its own
   activation and deadlocked: the reloaded page asked the worker for its HTML,
   and a worker answers nothing until activation ends. The page hung and the
   server never saw the request. Found by the new worker test; the reload now
   starts after activation.
3. A development page under an old worker needed two visits to recover. It now
   reloads once by itself.
4. The offline test passed with the worker keeping nothing, because the
   browser's own cache also holds an immutable file. It now reads the worker's
   store directly (found by breaking the worker on purpose).
5. An empty progress bar drew a dot at 0%. It now draws nothing.
6. The first economics icon read as a database. Replaced with a rising line.
7. The change-of-exam notice could stay on screen for good. It paused whenever
   a pointer was over it, and on a phone layout the button that changes the
   exam sits where the notice then appears, so the pointer that pressed it
   was already there. It now pauses only when the pointer moves onto it or the
   keyboard enters it, and leaves after 20 seconds however it is held. Found
   as an intermittent failure of its own test.
8. Docs and one script named authoring tools and linked to files the
   repository ignores. The names are gone and the design record now lives in
   [design-system.md](design-system.md).

### Verification of this revision

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 44 passed across 3 files, including refusing a phone number or an email in a question, and keeping Level 4 and Level 7 questions and notices apart |
| Browser suite, 3 workers, against `next dev` | 104 passed, 4 skipped (gestures that belong to the other device profile), twice in a row |
| `npm run format:check` | Passed |
| `npm run build` | Passed |
| Stale browser heals by itself (`stale-cache-repro.mjs`, dev server) | Before the fix: stylesheet on disk "one", page drawn with the old one. After: fresh stylesheet, no worker, no console errors, without clearing anything |
| The worker by itself (`tests/e2e/service-worker.spec.ts`, its own small server) | A file not marked immutable is never kept; a browser left with version 1 heals when version 2 arrives; build files, icons and visited pages open with the server gone; a POST is never answered from a cache |
| Script warning (`script-warning-check.mjs`) | With a hydration error forced on purpose: the old `<script>` logs the React error, `InlineScript` logs nothing |
| Offline, production build, server stopped (`offline-smoke.mjs`) | Saved topic and its practice open from cache with version 2; an unsaved page shows the offline page; all fonts load |
| The owner's report, production build (`production-check-2.mjs`) | 9 of 9: clean console on five pages; the filled block is `rgb(63,29,130)` light and `rgb(59,37,133)` dark with text at 10.7:1 or more, bar to button 30px, photograph loaded as AVIF at 27.8 kB; nine subjects with nine different marks and a bar each; the exam bar hides going down and returns going up on a laptop (Practice, Updates) and a phone; the theme change runs one view transition, and none under reduced motion |
| Exam bar, frame by frame (`final-shots.mjs`) | Visible height under the masthead while leaving: 50, 42, 12, 5, 3, 3 px; while returning: 12, 34, 44, 48, 50, 51 px |
| `git diff --check` | Passed |

**The checks were checked.** Thirteen more behaviours were broken on purpose
(`mutate-2.mjs`) and each was caught: the worker keeping everything, not
reloading, not deleting old files, keeping nothing; a black block; the button
under the bar; a photograph without its credit; one icon for every subject; a
subject bar that never moves; the theme sweep under reduced motion and its
leftover marker; a fill too pale for its text; a broad icon rule ahead of a
narrow one. One was missed at first (defect 4) and its test was strengthened.

Measured on the production build, cold cache, 390px viewport, this machine
(transfer in kB; a lab reading, not field data):

| | Third pass | Fourth pass |
|---|---|---|
| Home, Nepali / English | 409 / 231 | 446 / 270 |
| Practice, Nepali / English | 402 / 226 | 434 / 260 |
| Other pages | 392 to 410 / 216 to 347 | 401 to 414 / 225 to 347 |
| JavaScript | 146 to 155 | 151 to 161 |
| CSS | 11.5 | 12.3 |
| Layout shift (CLS) | 0 | 0 |
| Largest contentful paint | 176 to 392 ms | 160 to 456 ms |

The photograph costs Home and Practice about 30 kB and `next/image` about
6 kB of script on the pages that use it.

### Nepali interface copy for review

- Photograph credit: "फोटो: {name}"
- Credits page: "सबै फोटो Wikimedia Commons मा खुला इजाजतपत्रमा उपलब्ध छन्।
  वेबका लागि आकार घटाइएको र फेरि सङ्कुचन गरिएको मात्र हो; अरू केही बदलिएको छैन।"

A Nepali reader has not reviewed these strings.

### Not verified, and known limits

- The owner's own browser was not driven. That it holds the old worker was
  read from its profile; that such a browser heals was shown in a test
  browser put into the same state. If theirs does not heal on the next load,
  DevTools, Application, Service workers, Unregister, then a reload, does it.
- No student has used this. A photograph and filled colour answer the owner's
  taste; nothing here shows they help anyone study.
- One engine only: Chromium. The theme sweep needs View Transitions; without
  them the theme changes at once, which was checked only by the reduced-motion
  path.
- No real phone and no slow network. The photograph's 28 kB was measured on a
  laptop; a phone asks for a different width.
- The photograph is decoration and adds weight on the two busiest pages. It
  is not saved for offline: a saved page opens without it, on the flat fill.
- The subject icon is chosen from English title words. A subject titled in a
  way no rule knows gets the book.
- Licences were read from Wikimedia Commons pages on 2026-10-01 through a
  summarising fetch, not from the files' own metadata.
- No screen reader was run.

## Third pass: one place for the exam, organised Home, coloured actions

Evening of 2026-10-01, against the working tree of branch
`feat/web-student-experience` (nothing committed). It answers the owner's
report after using the second pass: sections could not be told apart without
reading them, the exam was named in several places and its bar should leave
while scrolling down, Home was unorganised, notices stayed on screen, black
buttons made no sense, and the footer's "Software and fonts" link and the demo
warning were not wanted before deployment. Scripts, raw output and before/after
screenshots are kept locally in `.local/ui-review/2026-10-01-organise/`
(git-ignored). The reference products read for it are in
[the research record](ui-quality-research.md#third-pass-what-established-learning-products-do).

### What was seen before changing anything

Brave, headless, the same screens later captured again (`before/` and
`after/`).

| Report | What the screenshots showed |
|---|---|
| Sections cannot be told apart | Home was seven sections with the same serif heading, a hairline above and grey text below; three of them were empty states. No icon, no container, no group |
| The exam is duplicated | After browsing to another exam the page named it three times: the exam bar, a warning box ("You are looking at another exam", with two buttons) and an information box ("Now showing…"). A page for an exam without a syllabus carried a second full set of pickers |
| Notices stay | The "Now showing" box stayed until the student left the page, and came back on refresh because its marker stayed in the address |
| Black buttons | Every button, link and selected control was the same ink as the text |
| Warnings and footer | A yellow band on every study page, and four footer links including "Software and fonts" |

### What changed

- **Colour.** What can be pressed is drawn in the exam's own colour (Level 4
  blue, Level 7 violet) and in the brand green outside an exam. Two directions
  were rendered on the same screens before choosing; see [the design system record](design-system.md).
- **Home.** One next step with the page's only solid button and a meter of
  topics studied on this device, then named groups of panels: *Your progress*
  (study plan, weak topics), *Your exam* (papers and marks, latest notice, how
  to prepare), and a strip for studying offline. Each panel has an icon and a
  name. Practice uses the same panels.
- **The exam bar** tucks away while scrolling down and returns on the first
  scroll up, on keyboard focus, or when its editor is opened; a 3px sliver of
  its colour stays. 320ms in, 220ms out, no movement under reduced motion.
- **One place for the exam.** The warning box became a "Viewing only" label in
  the bar, with the saved exam and the way back inside the editor. The in-page
  pickers became a button that opens the bar's editor.
- **Toasts.** A change of exam and "back online" appear over the corner, leave
  after 4 to 10 seconds by length, pause under the pointer or keyboard, can be
  closed, and remove their marker from the address. The "picked up where you
  left off" line in a practice session now leaves after six seconds.
- **Removed from study pages.** The demo band (kept behind
  `AGRILOK_DEMO_BANNER=1`; every demo item keeps its label) and the "Software
  and fonts" footer link (the page is linked from How it works).

### Defects found and corrected

1. The exam named and changeable in up to four places on one page (above).
2. A notice that never left, and replayed on refresh (above).
3. Dark Level 7 violet `#7050CF` was 2.71:1 against the sunken surface, under
   the 3:1 a solid fill needs. Now `#7A5BD8` (3.13:1; white text 4.87:1). The
   unit test did not check fills against every surface; it does now.
4. Practice said "1 questions".
5. Opening the exam editor from a button further down the page did not move
   the keyboard into it: a control inside a disclosure cannot take focus in
   the task that opens it (measured: 0 ms fails, 20 ms works). It now asks
   again each frame until the focus lands.
6. The second pass's test "the exam bar stays in view" used a viewport check,
   which also passes for a bar sitting behind the masthead. The new tests ask
   what is actually painted at the label's position.
7. Days to the exam were set large by cutting the number out of the sentence,
   which would have put the Nepali number in the wrong place. The number is
   now enlarged where the sentence has it.

### Verification of this revision

| Check | Result |
|---|---|
| `npm run lint` | Passed, no errors or warnings |
| `npm run typecheck` | Passed |
| `npm test` | 37 passed across 3 files |
| Browser suite (`@playwright/test`, 3 workers, against `next dev`) | 92 passed, 4 skipped (each skip is a gesture that belongs to the other project: wheel and hover on desktop, touch on the phone) |
| `npm run format:check` | Passed |
| `npm run build` | Passed |
| The owner's five reports, production build, real gestures (`production-check.mjs`) | 6 of 6: the bar hides going down and returns going up on a laptop and on a phone; one exam editor, no band, no warning box, three footer links, on a supported and an unsupported exam; the notice left after 7.2 s without moving the page and cleaned the address; solid buttons are `rgb(26,109,192)` in Level 4, `rgb(63,29,130)` in Level 7 and `rgb(27,94,69)` in setup, none of them the ink. No console errors. Run on the build made before defect 4 (one string) was fixed |
| Demo band switch | `AGRILOK_DEMO_BANNER=1`: band present; unset: absent (two production servers) |
| Reduced motion, 200% text, keyboard (`a11y-probe.mjs`) | Reduced motion: bar hides and returns with a 0 s transition, toast appears without animation and still leaves. 200% text at 390px: bars flow with the page, nothing tucked, no sideways overflow. Keyboard: focusing the tucked bar shows it, Enter opens the editor |
| Contrast (`contrast.mjs` and unit test) | 148 pairs meet their WCAG threshold, 0 failing |
| `git diff --check` | Passed |

**The checks were checked.** Fifteen behaviours were broken on purpose, one at
a time (`mutate.mjs`), and each time the guarding test failed: the bar not
tucking (laptop, phone), not returning, the toast not leaving, not cleaning the
address, not pausing under the pointer, the demo band switched on, pickers
added to a page, the "Viewing only" label removed, ink buttons, the licence
link back in the footer, a second solid button on Home, a panel without its
icon, the dim dark violet, and a wash too dark for text.

Measured on the production build, cold cache, 390px viewport, this machine
(transfer in kB; a lab reading, not field data):

| | Second pass | Third pass |
|---|---|---|
| Nepali pages, total | 393 to 408 | 392 to 410 |
| English pages, total | 217 to 232; 346 on a topic that quotes Nepali source text | 216 to 234; 347 on that topic |
| Fonts, Nepali / English | 211 / 38 | 211 / 38 |
| JavaScript | 146 to 153 | 146 to 155 |
| CSS | 10.6 | 11.5 |
| Layout shift (CLS) | 0 | 0 |
| Largest contentful paint | 156 to 516 ms | 176 to 392 ms |

### Nepali interface copy for review

New in this pass, with English counterparts in the typed dictionaries:

- Exam bar: "हेर्न मात्र" (Viewing only); "तपाईंको सुरक्षित परीक्षा {mine} हो।"
- Toast: "अब {context} देखाउँदै"; "हरेक परीक्षाको प्रगति छुट्टाछुट्टै राखिन्छ।"
- Home: "तपाईंको प्रगति", "पत्र र अङ्क", "पछिल्लो सूचना", "अफलाइन पढाइ",
  "{total} मध्ये {n} विषय पढिसकेको"

A Nepali reader has not reviewed these strings.

### Not verified, and known limits

- No student has used this. The reorganised Home answers one person's report;
  nothing here shows that students find things faster.
- One engine only: Chromium (Playwright's build for the suite, Brave for
  screenshots and probes). Firefox and Safari were not opened.
- No real phone. The bar's hiding was driven by wheel steps and by setting the
  scroll position, not by a finger with momentum or a browser's own collapsing
  address bar.
- No screen reader was run. The toast is added to a `role="status"` region
  that exists from the first paint; that it is announced was not heard.
- Without JavaScript the change-of-exam message does not appear at all (it is
  inside a streamed boundary that needs script to show). The bar's label is
  then the only confirmation. This was already so in the second pass.
- With the bar tucked, the exam's name is off screen until the student scrolls
  up; only its colour stays. That is the behaviour the owner asked for, and it
  trades away part of "the exam is always visible".
- The demo band is off. A build with demo content must not be shared without
  `AGRILOK_DEMO_BANNER=1`.
- The brand green and the "correct" green are close (CIEDE2000 8 to 11). They
  do not meet today because nothing is marked right or wrong outside an exam.
- Colour-blind distances are simulated (Machado 2009), not observed.
- Sources, document and stored-answer pages need the API, which was not
  running; they take the new colours through shared classes and were not seen
  with content.

## Second pass: navigation repair, exam bar, breadcrumbs, ink on paper

Later on 2026-10-01, against the working tree of branch
`feat/web-student-experience` (nothing committed). It answers the owner's
report that the navigation buttons sometimes do not work, that the screens are
not organised, and that the look is not professional. Scripts, raw output and
before/after screenshots are kept locally in
`.local/ui-review/2026-10-01-ink/` (git-ignored).

### What was reproduced before changing anything

Brave, headless, driven over its DevTools protocol, tapping real coordinates.

| Finding | Evidence | Cause |
|---|---|---|
| The Home tab does nothing on a phone | At 390x844 in `next dev`, a tap on the centre of the Home tab changed nothing in 8 s, twice out of two contexts. The top element at that point was `<nextjs-portal>`, a 40x40 badge at x 22, y 786. | The Next.js development badge sits bottom left, on top of the first tab. Development only; a production build has no badge. |
| Tabs change nothing in some exams | In Level 4, Karnali, Fisheries all five destinations changed the URL and the current marker and showed the same heading and body. | Every study page returned one shared "no syllabus" component, Updates included, although notices need no syllabus. |
| A tap gets no answer while loading | 0 of 20 taps showed any pending state. First visits in `next dev` took 446 to 970 ms, warm ones 60 to 265 ms, on this machine. | Study pages render on request and have no loading boundary (removed in the first pass because it hid the page without JavaScript), so nothing changes until the server answers. |

### What changed

- **Navigation.** The development badge is off. A pressed tab marks itself at
  once and a hairline runs across the top from any internal link press until
  the next page is on screen. Tabs move to the masthead at 1024px instead of
  768px, so the masthead is one row at every width.
- **Exams without a syllabus.** Home, Syllabus, Practice, Ask and Guidance each
  keep their own title and say what they cannot do and why, with the
  commission's official site, nearby exams that have a syllabus (opening the
  same destination) and the exam pickers in the page. Updates is no longer
  gated. Guidance still shows the advice that needs no syllabus.
- **Exam bar.** The exam is named in its level colour under the masthead and
  edited in place with three labelled native selects, Open, Cancel and a
  "make this my exam" box. It posts to a Server Action and works without
  JavaScript. The destination is kept; a deeper page falls back to its
  destination with a reason. Browsing does not change the saved profile.
- **Breadcrumbs** on topic, notice, practice session, mistake review, question
  review and guidance pages, replacing three differently styled back links.
- **Visual system.** Ink on paper: tokens, serif headings, ruled sections, one
  filled block per screen, motion roles. Two directions were rendered on the
  same topic screen before choosing; see [the design system record](design-system.md).
- **Removed.** An unused component (`Button`), a second set of review and
  level badges that duplicated `Tag`, the shared no-syllabus component, the
  photo-era image and `sharp` tracing config, 22 dictionary strings nothing
  read (in both languages), unused CSS classes and tokens, an unused helper.

### Defects found and corrected

1. The development badge covered the Home tab (above).
2. One shared page under all five tabs of an unsupported exam (above).
3. No feedback between a tap and the server's answer (above).
4. The report dialog's form was nested inside the practice answer form, which
   HTML forbids. The browser logged it as a hydration error, and sending a
   report bubbled into the answer form's submit handler. The two are now
   separate forms.
5. Saving a topic for offline stored the practice page's HTML but not the
   scripts it needs, so with the server stopped the saved practice opened as a
   skeleton that never filled. The first pass's offline check used the
   browser's offline switch, which does not reach requests made by a service
   worker, and passed for that reason. Saving now also stores each saved
   page's scripts and styles.
6. `lib/enter-to-ask.ts` and its tests existed but the Ask form did not use
   them: on a touch screen Enter sent the question, where a phone keyboard has
   no other way to start a new line. The form now uses the tested rule.
7. `adoptContext` carried an exam date to a different exam, which would count
   a study plan down to the wrong day. A date is now kept only for the exam
   it was set for.
8. A colour token named `lead` collided with the `text-lead` type size, so
   Tailwind coloured every lead paragraph with it; invisible in light mode,
   near-invisible in dark. Renamed `block`.
9. English pages downloaded the 121 kB Devanagari font to draw one word, the
   language switch. That word now uses the device's own Devanagari face.
10. Topic codes and subject numbers showed Latin digits on Nepali pages while
    their citations showed Devanagari ones. Both now use the page's digits.
11. The syllabus said "1 questions"; the notice page used a button's label as
    its section heading and derived field labels by cutting a sentence
    template; `NOTICE` credited fonts and photographs the app no longer ships.

### Verification of this revision

| Check | Result |
|---|---|
| `npm run lint` | Passed, no errors or warnings |
| `npm run typecheck` | Passed |
| `npm test` | 28 passed across 2 files |
| `npm run test:e2e -- --workers=3` | 77 passed, 1 skipped (a phone-only assertion skipped on desktop, as before) |
| `npm run format:check` | Passed |
| `npm run build` | Passed |
| Navigation taps, production build | 20 of 20: each of five destinations, supported and unsupported exam, 390px touch and 1280px mouse, reached its own URL and heading in 156 to 187 ms on this machine; no console errors |
| Offline, production build, server stopped | Saved topic, its breadcrumb, exam bar and all four font files opened from cache; its practice set opened; an unsaved page showed the offline page |
| Contrast | 108 foreground and background pairs meet their WCAG threshold (script and unit test) |
| `git diff --check` | Passed |

What the browser suite now asserts, on a desktop and a Pixel 5 project:
every destination from a supported and an unsupported exam (URL, heading,
current marker, exam label, and that the five pages differ); tab size and that
nothing covers a tab's centre; pending feedback with the next page held back;
direct entry, refresh, Back and Forward; breadcrumb ancestors and current page
on five page types; the exam editor by keyboard; Cancel and Escape; browsing
against adopting; fallback from a topic to its section; an exam without a
syllabus opened as itself; an Ask draft surviving a change of exam and back;
language and theme through a change of exam; the bar sticky while reading and
static while editing; the same change of exam with JavaScript disabled; no
console errors on fifteen pages; the answer and report forms separate; reflow
at 320, 360, 390, 768, 1024 and 1440px in both languages and themes.

**The checks were checked.** Eight behaviours were broken on purpose, one at a
time, and in each case the test guarding it failed: pending feedback removed;
an unsupported Syllabus tab showing Home's text; browsing saving the profile;
a topic carried into the other exam; Cancel keeping the abandoned choice;
Enter sending on a touch screen; the report form nested again; the
development badge switched back on. One test (nothing covers a tab) passed
with the badge on at first, because the badge draws itself late; it now waits
for the page to settle and fails as it should.

Measured on the production build, cold cache, 390px viewport, this machine
(transfer in kB; a lab reading, not field data):

| | Before | After |
|---|---|---|
| Nepali pages, total | 325 to 338 | 393 to 408 |
| English pages, total | 322 to 334 | 217 to 232; 346 on a topic that quotes Nepali source text |
| Fonts, Nepali / English | 144 / 144 | 211 / 38 |
| JavaScript | 146 to 151 | 146 to 153 |
| CSS | 10.1 | 10.6 |
| Layout shift (CLS) | 0 | 0 |
| Largest contentful paint | 168 to 496 ms | 156 to 516 ms |

The cost of the serif is 67 kB on a first Nepali visit; it is not preloaded,
text shows at once in a fallback face, and the files are cached afterwards.

### Nepali interface copy for review

New in this pass, with English counterparts in the typed dictionaries:

- Exam bar: “परीक्षा बदल्नुहोस्”, “बदल्नुहोस्”, “यो परीक्षा खोल्नुहोस्”, “खोल्दै…”,
  “यसैलाई मेरो परीक्षा बनाउनुहोस्”
- “नछाने यो परीक्षा हेर्न मात्र खुल्छ; तपाईंको सुरक्षित परीक्षा बदलिँदैन।”
- “यो परीक्षाको पाठ्यक्रम पुस्तकालयमा छ।”
- “यो परीक्षाको पाठ्यक्रम पुस्तकालयमा अहिलेसम्म छैन। सूचना र आयोगको आधिकारिक
  साइट भने खुल्छन्।”
- “हरेक परीक्षाको प्रगति, अधूरो अभ्यास र प्रश्नको मस्यौदा छुट्टाछुट्टै राखिन्छ।”
- “परीक्षाको मिति र पूरा सेटअप”
- “अघिल्लो पृष्ठ अर्कै परीक्षाको भएकाले यो परीक्षाको सम्बन्धित खण्ड खोलिएको छ।”
- Breadcrumb landmark: “यो पृष्ठ कहाँ छ”
- Unavailable exam: “{context} को आधिकारिक पाठ्यक्रम हामीले अहिलेसम्म थपेका
  छैनौं।” and one reason each for Home, Syllabus, Practice, Ask and Guidance
  (`unavailable` in `apps/web/lib/i18n/ne.ts`); “अहिले के खुल्छ”, “यो तहका
  सूचना”, “अर्को परीक्षा छान्नुहोस्”
- Notice page labels: “सारांश”, “प्रकाशित”, “म्याद”, “मिति”
- Ask on a touch screen: “लेखिसकेपछि “सोध्नुहोस्” थिच्नुहोस्।”

A Nepali reader has not reviewed these strings.

### Not verified, and known limits

- No student has used this. Nothing here shows that it helps anyone study.
- No screen reader was run. Roles, names, focus order and the keyboard paths
  were checked through the accessibility tree and key presses in Chromium.
- One engine only: Chromium (Playwright's build for the suite, Brave for the
  reproduction and screenshots). Firefox and Safari were not opened. The
  disclosure animation uses `::details-content`, which other engines may not
  support; there the panel opens without animating. The exam bar relies on
  `:has()` to stop being sticky while open.
- No real phone and no throttled network. Timings are from one laptop.
- Colour-blind distances are simulated (Machado 2009), not observed. Two pairs
  are weak and rely on icons and words; see [the design system record](design-system.md).
- With JavaScript disabled the exam pickers do not say whether the chosen
  exam has a syllabus before it is opened; the page that opens says so.
- The serif ships in one weight. Text that asks for a bolder serif gets the
  same weight, by design.
- Sources, document and stored-answer pages need the API, which was not
  running; they were restyled and type-checked but only their failure state
  was seen in a browser.

## First pass: blue workspace (earlier on 2026-10-01)

The record below belongs to the revision it tested. Its visual system has been
replaced, and its offline result is superseded by defect 5 above.

### Implemented

- Third-party design catalogues were treated as suggestions. Their broad
  marketing and children's-product recommendations were rejected after
  checking their fit; targeted accessibility and interaction guidance was used.
- A shared light/dark system: blue actions, deep-blue next study step, neutral
  reading surfaces, labelled green/plum exam levels and the terrace/sun logo.
  Self-hosted Noto Sans Devanagari remains; type hierarchy, line height,
  metadata size, responsive gutters, corners and interaction states were rebuilt.
- Setup, Home, syllabus/topic reading, practice/quiz/review, Updates/notices,
  Guidance, Ask, Sources and public pages have responsive layouts. Laptop
  workspaces and phone task order receive distinct treatment.
- Sources retain publisher hostname, fetch date and review state; unsafe
  addresses are withheld. Demo labels remain. Exam/province/group context and
  the five destinations remain separate and explicit.
- Native controls, linked error summaries, retained form values, pending
  feedback, IME-safe Enter, source/result focus, reduced motion, offline status
  and tab-local Ask drafts cover actual student actions.
- Tall side rails scroll. Header/navigation become normal document flow when
  enlarged text or a short viewport would obstruct content. The five top
  destinations then remain available on phones. Dialog controls have generous
  targets and scroll within short viewports.
- A further rendered-page review refined task access: compact expandable demo
  notice, shorter Home introduction, smaller phone topic heading, native
  commission select, quick/mock choices before subject browsing, full-width
  subject grid, six compact Ask tools and a direct writing jump. Long selected
  question text wraps below the native picker with its actual demo status.
- Syllabus now keeps source hostname/link, fetch date, review and partial-data
  warning visible in a compact section; further citation detail expands natively.
  Reading actions and Updates filters use quieter, more compact layouts.
- Native dialog opening/backdrop and disclosure feedback use the shared motion
  tokens. Reduced motion disables the backdrop too; Escape and focus restoration
  do not wait for animation.

### Verification

- Shared contrast tests compute WCAG relative luminance for 19 text pairs and
  control/focus boundaries in all four theme blocks; explicit/system themes
  must agree. Text threshold 4.5:1, control/focus threshold 3:1.
- Primary tasks are checked at 360, 390, 768, 1024 and 1440px in both languages
  and themes, with one visible page title, five destinations, an active
  destination and no horizontal overflow.
- Additional browser/screenshot reviews covered study topics with and without
  notes, empty contexts, notice details, Guidance comparisons, practice/review,
  Ask, setup and public pages. Local artifacts are under `.local/ui-review/`,
  `.local/study-design/`.
- Interaction checks covered setup validation and repeated correction,
  no-JavaScript setup and Ask submission, syllabus search without JavaScript,
  quiz missing-choice errors, feedback and source reveal, mock end-only results,
  Ask validation/success/offline draft retention, theme persistence, language
  switching, skip-to-main, enlarged text and reduced motion.
- Additional regressions cover Home's real initial-topic action without
  JavaScript, setup commission error-link focus and availability, a working
  question picker before any mistakes exist, full selected-stem wrapping, native
  picker GET, mock overview keyboard jumps/retained choices/next unanswered,
  empty-review recovery, and dialog Escape/reopening/reduced-motion focus.
- A production build saved a topic, reopened it offline and answered its
  saved topic practice without first opening that practice route online.
  Production setup saved the correct Level 7 context and language switching
  retained it. A separate server with an intentionally unreachable backend
  confirmed Sources keeps policy content visible and offers retry.

Final command results:

| Check | Result |
|---|---|
| `npm run lint` | Passed, no lint errors/warnings |
| `npm run typecheck` | Passed |
| `npm test` | 22 passed across 2 files |
| `npm run test:e2e -- --workers=2` | 39 passed; 1 intentionally skipped desktop duplicate of a phone-only assertion |
| `npm run format:check` | Passed |
| `npm run build` | Passed, optimized Next.js production build |
| Production smoke checks | Saved reading/practice offline, profile/language, enlarged text restoration and keyboard dialog checks passed |
| Sources outage check | Policy content and retry visible with an intentionally unreachable backend |
| `git diff --check` | Passed |

The production preview runs locally at `http://localhost:3000`. It is not a
deployment. The existing standalone Docker packaging and actual hosting were
not changed by this UI work.

### Issues found and corrected

1. The shared streaming loading boundary hid study content behind a skeleton
   when JavaScript was disabled. Removing it restored complete server-rendered
   study pages and native Ask POST. Client loading/pending feedback remains.
2. Repeated failed setup actions triggered native radio reset. The form now
   retains choices through failures and still redirects on successful save.
3. Laptop navigation overflowed when text doubled. Wrapping and adaptive chrome
   preserve reflow. Tall sticky rails previously kept focused links outside the
   viewport; the rails now scroll and keyboard regression tests cover them.
4. Small legacy badges fell below the metadata size floor and could not wrap.
   They now use the shared caption role with generous leading.
5. Notice date captions displayed template placeholders. They now show actual
   formatted dates. Source/review/demo details and hostname remain visible.
6. Credits described removed photographs and different fonts. They now credit
   the shipped font and describe the current image-free interface.
7. Home's device-progress placeholders stayed permanently visible without
   JavaScript. The initial-topic card now renders natively; the enhanced view
   still waits for device progress before choosing Start or Continue.
8. The long demo explanation and repeated Home intro delayed the study action.
   The warning stays visible while its explanation expands natively. Setup's
   commission tiles delayed Save: at 360px Nepali its intro fell from 330 to
   145px, and Save moved 576px earlier in the document.
9. Mock practice came after the entire phone subject list. Quick/mock choices
   now come first, with a balanced subject grid on larger screens.
10. Explain this question sent new students to an empty mistakes list. A native
    picker now opens an actual question from the current exam's bank; it works
    without JavaScript. The written-question jump avoids scrolling through tools.
11. Mock sessions only allowed sequential navigation. A question overview now
    exposes actual answered status, direct keyboard jumps and the next unanswered
    question. Answers remain hidden until the mock is submitted.

The refinement's rendered study checks covered 36 route/language/theme/width
combinations with no overflow. At 390px, the first Syllabus topic moved up
445px and the first Updates notice moved up 185px; the note summary now starts
within the viewport. Practice/Ask's expanded-state review covered 72 cases
without overflow or browser errors. These are local browser measurements,
not results from student testing.

### Nepali interface copy for review

New or corrected copy, with English counterparts in the typed dictionaries:

- Setup error summary: “यी विवरण सच्याउनुहोस्”
- Setup pending: “सेभ गर्दै…”
- Home lead originally added: “आजको अध्ययन, अभ्यास र अर्को कदम — आफ्नै परीक्षाअनुसार।”
  The repeated sentence is now omitted from Home's layout.
- Compact demo warning: “नमूना सामग्री हो। परीक्षाको तयारीमा प्रयोग नगर्नुहोस्।”
- Mock overview: “प्रश्नहरू”
- Mock overview help: “हेर्न वा उत्तर बदल्न कुनै पनि प्रश्न खोल्नुहोस्। सही उत्तर परीक्षा बुझाएपछि मात्र देखिन्छ।”
- Mock answered state: “उत्तर दिइएको”
- Mock unanswered state: “उत्तर नदिइएको”
- Mock next unanswered: “उत्तर नदिएको अर्को प्रश्न”
- Empty review action: “अभ्यास सुरु गर्नुहोस्”
- Ask writing jump: “प्रश्न लेख्नुहोस्”
- Singular practice count uses the existing Nepali wording: “{n} प्रश्न”
- Credits title: “श्रेय”
- Photograph record: “हालको वेबसाइटमा फोटो प्रयोग गरिएको छैन।”
- Font record: “Noto Sans Devanagari (The Noto Project Authors), SIL Open Font
  License 1.1 अन्तर्गत। नेपाली र अङ्ग्रेजीका फन्ट फाइल यही वेबसाइटबाट लोड हुन्छन्।”
- Local draft record: “अधूरो प्रश्न यही ट्याबमा अस्थायी रूपमा राखिन्छ, ताकि पृष्ठ
  फेरि खोल्दा हराओस् भन्ने नहोस्। ट्याब बन्द भएपछि यो मस्यौदा हट्छ।”

### Limits before public launch

No student usability round has run. Keyboard/contrast/reflow checks are evidence
for specific requirements, not a full assistive-technology conformance audit.
Demo content is not production study material. Live API-backed document/answer
details still require validation against a running backend; frontend smoke
checks do not certify generation quality, content review or service reliability.
Hosting, real-device/slow-network performance and release monitoring need their
own measurements. No production deployment or commit was made in this task.

The design contract at the time of this first pass has since been replaced;
the current one is [the design system record](design-system.md).
