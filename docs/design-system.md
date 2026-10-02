# Design system: the student workspace

Decision date: 2026-10-01 (fourth pass, late the same day; the earlier passes
are described in [the redesign review](ui-redesign-review.md)). Scope: the complete student website,
including setup, Home, syllabus and reading, practice/review, updates, guidance,
Ask, sources, documents and supporting pages. Routes, destinations and visual
values below describe the current implementation and may evolve within the
user's task. Use [the quality contract](ui-quality-contract.md) for decisions and
acceptance gates. This is a record of what is built and why, not a rule that
freezes it.

## Direction: ink on paper, the exam's colour for what can be pressed

Text is one blue-black ink. Buttons, links and selected controls take the
colour of the exam on screen: Level 4 blue, Level 7 violet. Outside an exam
(setup, sources, how it works) they take the brand green of the logo. Correct,
wrong and waiting for review each keep one colour of their own, and every
meaning is also written in words. Headings and question stems are set in a
serif, the way a printed question paper sets them apart from its instructions.

Ink buttons were dropped at the owner's direction (2026-10-01): a black button
gave a student nothing to aim at. The colour did not have to be invented. The
five meanings already in use (two exams, correct, wrong, pending) leave no free
hue for a sixth, so the action takes the exam's own. A student lives in one
exam for months and sees one action colour throughout; the other exam looks
different at a glance, which is rule 3 of the project (Level 4 and Level 7
never mix) carried by the interface itself.

Four things carry the hierarchy, and nothing else competes with them:

1. **The exam bar**, a band in the level's colour under the masthead on every
   study page. It names the exam and is the only place the exam is changed.
2. **One filled block per screen** for the next study action (Home's next
   step, Practice's quick practice). It is filled with the exam's colour, with
   a photograph of Nepali fields along one edge that fades into the fill, so
   the words always sit on flat colour. Its one button is reversed out of it,
   white lettered in the exam's colour. The owner asked for filled, saturated
   colour after seeing a pale wash (third pass) and a black block (a stale
   stylesheet, see the review); the wash is kept for quieter blocks: a result,
   an exam with no syllabus.
3. **Named groups** on a screen that holds several kinds of thing (Home,
   Practice): a serif heading and the space above it.
4. **Panels**: one box for one object, with an icon that says what kind of
   thing it is, its name in bold sans, and at most one link out. The icon and
   the name are read before the content, so a student finds a panel by looking,
   not by reading the page.

Ruled sections without a box remain for reading pages (a topic, guidance, the
syllabus list), where the content is one continuous thing.

Two colour directions were rendered on the same screens before choosing
(`.local/ui-review/2026-10-01-organise/a2/`, Home and a checked practice
question, Nepali and English):

| | A. The exam's colour acts (chosen) | B. Brand green acts everywhere |
|---|---|---|
| With the exam bar | One hue family per page | Green buttons under a violet or blue bar: two unrelated hues |
| In practice | "Next question" is blue or violet beside a green "correct" | "Next question" and "correct answer" are the same green |
| Across exams | The two exams look different throughout | Only the bar differs |
| Cost | Three action sets to keep in contrast | One |

The earlier comparison (ink on paper against a green workspace) is in
`.local/ui-review/2026-10-01-ink/direction-comparison.png`.

Laptop Home:

```text
logo            five destinations            theme / language
[ Level 4 · Lumbini · Agriculture Extension        Change exam v ]   level colour
Today
[ next step: filled, photo, progress, button ]  [ today's practice ]
Your progress
[ study plan ]                                  [ weak topics ]
Your exam                                                 full guidance
[ papers and marks, with the negative-marking rule ]   [ latest notice ]
                                                        [ how to prepare ]
[ study offline: what is saved ................ save this exam ]
```

Phone: the same panels in the same order, one column, the exam bar at the top
and the five destinations fixed at the bottom with safe-area space. The
masthead scrolls away with the page. Below a destination (a topic, a notice, a
practice session, guidance) a breadcrumb names the page and links back to Home
and to its destination.

## Palette

| Role | Light | Dark |
|---|---|---|
| Canvas (paper) | `#FFFFFF` | `#0F141B` |
| Surface (raised) | `#FFFFFF` | `#161C26` |
| Sunken (band) | `#F1F3F6` | `#1E2633` |
| Ink / ink 2 / ink 3 | `#0E1726` `#39465C` `#5A667B` | `#EEF1F5` `#C3CAD5` `#9AA4B4` |
| Line / control boundary | `#DDE2E8` `#77839A` | `#2A3442` `#6F7C90` |
| Focus ring | `#1D5FD6` | `#8AB4FF` |
| Brand: solid / hover / text / wash | `#1B5E45` `#134A36` `#1B5E45` `#E6F2EC` | `#8CDDB0` `#ABE8C6` `#8CDDB0` `#16302A` |
| Level 4: solid / hover / text / wash | `#1A6DC0` `#155A9F` `#175FA8` `#E8F1FB` | `#7FB6F0` `#A3CBF5` `#7FB6F0` `#172A40` |
| Level 7: solid / hover / text / wash | `#3F1D82` `#532DA3` `#3F1D82` `#EFEBF9` | `#7A5BD8` `#6A4AC9` `#B9A5F2` `#251D44` |
| Filled block: brand / Level 4 / Level 7 | `#1B5E45` `#175FA8` `#3F1D82` | `#1F5C46` `#1B4F86` `#3B2585` |
| Words on the filled block / quieter words | `#FFFFFF` `#E3E9F2` | `#F2F5F9` `#C9D2DF` |
| Correct or checked | `#19703F` on `#E2F2E7` | `#7AD4C0` on `#14302B` |
| Wrong | `#B3261E` on `#FDE9E6` | `#F4A197` on `#3A1F1C` |
| Pending or caution | `#8A5300` on `#FCEFD6` | `#F2C46C` on `#35290F` |

`--color-action`, `-hover`, `-ink`, `-tint` and `--color-on-action` are what
components use. They point at the brand set by default and at the level set
inside `[data-level]`. A component never names `l4`, `l7` or `brand` directly
except the level tag and the logo.

Measured from `apps/web/app/globals.css` on 2026-10-01 with
`.local/ui-review/2026-10-01-organise/contrast.mjs` (it checks itself against a
known failing pair and two published CIEDE2000 reference pairs):

- The filled block: its words are 6.4:1 or more on every fill and its
  quieter words 5.1:1 or more, in both themes; the reversed button has the
  same ratios. In a dark theme the fill is a deep shade of the exam's colour
  rather than the pale one the exam bar uses, because a large pale block on a
  dark page glares. `lib/design.test.ts` checks all of them.
- 148 foreground and background pairs across the two themes meet their WCAG
  threshold: 4.5:1 for text, 3:1 for control boundaries, the focus ring, and a
  solid fill (button, meter, exam bar) against every surface and against its
  own wash. `lib/design.test.ts` repeats these on every test run, for all four
  theme blocks.
- Dark Level 7 moved from `#7050CF` to `#7A5BD8`: the darker one was 2.71:1
  against the sunken surface, under the 3:1 a solid fill needs. White text on
  the new one is 4.87:1.
- Level 4 against Level 7, CIEDE2000: 28.1 with normal vision, 21.0 protan,
  17.5 deutan in light; 28.6, 23.7, 22.0 in dark.
- The action colours against the state colours they sit beside in practice:
  Level 4 or Level 7 against correct, 35.5 or more, except dark Level 4
  (27.4 normal, 25.9 protan, 19.8 deutan); against wrong, 30.9 or more.
- Brand green against "correct" is 8.0 to 11.1: the same family. They do not
  meet, because the brand green acts only outside an exam, where nothing is
  marked right or wrong.
- Known weak pairs, where words and icons do the work colour cannot: wrong
  against pending in light under deuteranopia (1.9), and correct against wrong
  under protanopia (10.2 light, 9.1 dark). Every one of these states carries a
  check, a cross or a clock and its name.

Tried and not used, so they are not retried without new evidence: ink for
every button (the owner could not tell actions apart from text); brand green as
the action inside an exam (direction B above); a pale wash for the main block
(the owner asked for filled, saturated colour); a carousel that moves by itself
for the main block (Nielsen Norman Group: auto-forwarding carousels are read as
advertisements, hide all but one item, and outrun slow readers; Home has one
next step, not several to rotate); a crimson danger colour; the earlier Level 4
green and Level 7 plum pair; a pale filled block in dark mode (glare).

All four theme declarations must be kept in step; the test fails if they are
not. A colour token must not share a name with a type size: Tailwind reads
`text-lead` as both.

## Type, spacing and interaction

- Two self-hosted families from the Noto Devanagari project, both OFL 1.1 and
  unmodified from upstream. Noto Sans Devanagari (variable; 25 kB Latin,
  121 kB Devanagari) sets text, the interface and panel names. Noto Serif
  Devanagari (static 600; 13 kB Latin, 55 kB Devanagari) sets page titles,
  group headings, question stems, topic codes and marks. `display: swap`, no
  preload, split by script so a page without a Nepali heading never fetches
  the Devanagari serif. No external font request and no build-time download.
- Only one serif weight ships, so headings set `font-synthesis: none`: a
  synthesized bold would smear the Devanagari head line.
- Three heading steps on a screen: page title (display serif), group (title
  serif), panel (bold sans). Root 17px; Nepali body 18px, English 17px; body
  leading 1.7. Metadata roles are at least 14px. No tracking on Devanagari, no
  fabricated italic, no caps, no clipped matras, no truncation of translated
  labels. A number set large inside a sentence (days to the exam) stays where
  the sentence has it, so the word order of each language is left alone.
- Topic codes and subject numbers use the page's own digits (५.३ in Nepali),
  as the official syllabus prints them. Search accepts either.
- 4px spacing grid; 17/25.5/34px gutters; width cap 1258px including gutters;
  a narrow reading column for prose. Controls 8.5px radius, panels 12.75px,
  the filled block 17px, filter chips fully round. A panel carries a hairline
  border and a one-pixel shadow; a panel that is itself one link lifts a pixel
  on hover.
- **Photographs.** Three, of Nepali fields, from Wikimedia Commons under
  CC BY 4.0 and CC BY-SA 4.0 (`apps/web/content/photos.ts`; author and
  licence read from each Commons page on 2026-10-01). They are decoration:
  empty alt, never the thing a page waits for, credited on the photograph and
  on `/credits`. `next/image` sends AVIF at the width the screen needs (28 kB
  for Home's on a laptop) with a blurred preview first. On setup the
  photograph is shown on a laptop only. Nothing was generated or bought.
- **Subject marks.** Each subject has an icon chosen from its English title
  (`lib/subject-icon.ts`), shown in Practice and in the syllabus, with the
  book as the fallback for a subject no rule knows. Practice also shows how
  many of a subject's questions this device last answered right.
- Buttons 51px minimum, smaller controls 44 to 47px. Solid for the one main
  action, outline in the same colour for the second, underlined text for the
  third. Native radios, selects and date fields; a `.choice` row makes a whole
  radio or checkbox tappable.
- Motion roles: 120ms press and colour, 180ms result and pending navigation,
  240ms panel and dialog, and for the exam bar 320ms to slide in and 220ms to
  slide out. A change of theme opens as a circle from the toggle over 420ms
  (View Transitions, where the browser has them). The photograph in the filled
  block drifts very slowly (32s each way), the one thing that moves without
  being asked; it runs on the compositor. Transform and opacity for movement; disclosures grow open where
  the browser supports `::details-content` and open at once where it does not.
  No page-load or scroll choreography and no carousel. Under reduced motion
  everything is off: the exam bar appears and disappears without sliding, the
  theme changes at once, the photograph is still and the navigation hairline
  becomes a still line.

## Navigation and exam context

- **Five destinations**: a bottom bar below 1024px, tabs in the masthead from
  1024px. The current one is marked in the exam's colour.
- **A tap is answered at once.** Study pages are rendered on request and have
  no streaming fallback (it hid the page without JavaScript), so the pressed
  tab marks itself with `useLinkStatus` and a hairline runs across the top
  from any internal link press until the next page is on screen. It waits
  120ms, so an instant navigation never flashes it.
- **The exam bar** is a native disclosure. Open, it holds three labelled
  native selects (level, commission, service group), a line saying whether
  that exam's syllabus is in the library, a "make this my exam" box, Open and
  Cancel. It is a plain form posting to a Server Action, so it works without
  JavaScript. Cancel and Escape put the choices back and return focus. The
  student stays in the same destination of the new exam; a topic, notice or
  question falls back to its destination and a message says why. The saved
  profile changes only when the box is ticked, and an exam date is never
  carried to a different exam.
- **One place for the exam.** Nothing else on a page names or changes the
  exam. When the exam on screen is not the saved one, the bar itself says
  "Viewing only" beside the name, and its editor names the saved exam with a
  link back to it. An exam opened from a shared link is adopted by ticking the
  box and pressing Open without changing a choice. A page for an exam without
  a syllabus has a button that opens the bar's editor, not pickers of its own.
- **The bar steps aside while reading.** Scrolling down slides it out of the
  way; the first scroll up, a keyboard focus inside it, or opening its editor
  brings it back. A 3px sliver of its colour stays, so the exam is never
  entirely off screen. It is not tucked within two bar heights of the top,
  while its editor is open, or when enlarged text has put the bars back into
  the page's flow. The masthead on a laptop and the bottom bar on a phone do
  not move.
- **Passing messages are toasts.** A change of exam and "back online" appear
  over the bottom corner (above the bottom bar on a phone), count down on a
  thin line, pause under the pointer or the keyboard, can be closed, and leave
  by themselves after 4 to 10 seconds depending on their length
  (`lib/reading-time.ts`). The change-of-exam marker is then removed from the
  address, so a refresh does not replay it. A state that is still true, such
  as being offline, is not a toast and stays on the page.
- **Breadcrumbs** on pages below a destination: every ancestor is a link to a
  real page and the current page is named, not linked. The exam is not a
  crumb; it is changed with the bar above.
- **An exam without a syllabus** gets a page per destination with that
  destination's own title and reason, the commission's official site, nearby
  exams that have a syllabus (opening the same destination), and the button
  that opens the exam editor. Updates is not gated at all: notices need no
  syllabus.
- Sticky chrome: the exam bar on a phone; the masthead and the exam bar on a
  laptop. When enlarged text or a short viewport would leave too little room,
  measured heights put every bar back into the page's flow. Without JavaScript
  nothing is sticky and the bar never hides.

## The offline worker and stale pages

The service worker (`apps/web/public/service-worker.js`) keeps a build file
only when the server itself marks it `immutable`. A production build does, for
everything under `/_next/static`, because those names carry a hash of their
contents; a development server does not and reuses names, so nothing of it is
kept. Icons, photographs and pages come from the network first, with the last
copy kept for when there is none. In development the app removes any worker it
finds and reloads once.

This exists because version 1 kept everything under `/_next/static` for ever.
A browser that had once opened a production build on `localhost:3000` then drew
every later development page with an old stylesheet and old scripts over new
HTML: a black block, an invisible button, a bar that did not hide, and a
hydration error. A browser in that state heals by itself on its next visit:
the new worker replaces the old, deletes its files and reloads the page.
`tests/e2e/service-worker.spec.ts` holds all of this in place.

## What a study page no longer carries

At the owner's direction (2026-10-01), while the app runs only on its
developers' machines:

- The band that said the content is demo material. Every demo item keeps its
  own "Demo" label, and review states are untouched. The band is one
  environment variable away: `AGRILOK_DEMO_BANNER=1`. It must be on, or the
  demo content gone, before anyone outside the team can reach a build.
- The "Software and fonts" link in the footer. The page still exists and is
  linked from How it works; the licences themselves are in `NOTICE`.
- The warning box for an exam that is not the saved one (now the bar's own
  label) and the boxed notice after a change of exam (now a toast).

## Evidence

Nothing in this system was taken from a catalogue or a generator. Its palette
was measured, its directions were rendered and compared on real screens, and
its navigation changes follow from browser reproductions recorded in
[the redesign review](ui-redesign-review.md). The only runtime assets beyond
the framework are two font families and three photographs.

Reference products and the sources read are listed in
[the research record](ui-quality-research.md#third-pass-what-established-learning-products-do).
Standards used throughout: the [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/),
the [WAI-ARIA breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)
and the [GOV.UK error summary component](https://design-system.service.gov.uk/components/error-summary/).
These sources support interaction requirements; they do not validate this
site's visual taste or student usability.

## Acceptance and launch boundary

Check 360px, 390px and laptop layouts in Nepali/English and both themes;
keyboard focus, 200% text scaling/reflow, reduced motion, unavailable sources,
unsupported contexts, invalid forms, quiz feedback, mock behavior and offline
reading. Run lint, typecheck, unit tests, browser tests, formatting and build.
Record actual results in [the redesign review](ui-redesign-review.md).

This work improves and validates the interface. Demo material remains demo.
Real student usability results, reviewed production study content, deployed
API behavior, hosting/network budgets and release monitoring require their
own evidence before a public production launch.
