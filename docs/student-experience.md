# Student experience: screen map, journeys and states

> **Status: current prototype baseline, updated 2026-10-01.** This records the
> implemented architecture while the app runs on demo data. Flows, visual
> decisions and navigation can evolve within the user's task under the
> [shared quality contract](ui-quality-contract.md). Record implemented changes
> here and validate with [students](usability-testing.md) when possible; testing
> is not a prerequisite for repairing a known defect. The real API is connected
> only after the core flow is stable.

The promise, in one line:

> Open agrilok, know what to study, practise it, understand mistakes, and ask
> for help with reliable sources.

Everything below serves one daily loop:

```
Choose exam profile ─► Home ─► Open a syllabus topic ─► Read the study note
      ─► Practise ─► Review mistakes ─► Check updates and guidance ─► Ask, with sources
```

---

## 1. Screen map

Every study screen lives inside an **exam context**:
`/{level}/{province}/{group}`. The context is part of the URL, so a page can
never show one exam's content under another exam's name, a shared link opens
exactly the exam it was shared from, and the offline cache stores each
context's pages separately.

```
/                                        redirect: saved profile ─► its Home, otherwise ─► /start
/start                                   Profile setup
/level-4, /level-7                       redirect into the saved context for that level, or /start
/{level}/{province}/{group}              Home
  /syllabus                              Syllabus: paper ─► section ─► subject ─► topic
  /syllabus/{topic}                      Study topic
  /practice                              Practice hub
  /practice/session?mode=…               Practice or mock session
  /practice/review                       Mistakes to review
  /practice/question/{id}                Question review
  /updates                               Updates, with filters
  /updates/{notice}                      Notice
  /guide                                 Guidance
  /ask                                   Ask
/sources, /documents/{id}, /answers/{id} The live library and stored answers (real API)
/how-it-works, /privacy, /credits, /offline
/prototype                               Prototype tools for test facilitators (demo mode only)
```

`level` is `level-4` or `level-7`. `province` is `federal` or one of the seven
provinces. `group` is a service group code with hyphens (`agri-extension`).
An unknown value is a 404, never a guess.

## 2. Navigation model

- **Five destinations** as a bottom bar below 1024px: Home, Syllabus, Practice,
  Updates, Ask. On a laptop the same five sit as tabs in the masthead. A pressed
  destination marks itself at once, before the server has answered.
- **Guidance is not a sixth tab.** It opens from Home (what to study first,
  your plan), from Syllabus (how to use the syllabus) and from Practice (how to
  revise mistakes).
- **The exam context lives in the exam bar** under the masthead on every
  study screen, in the level's colour and in words:
  `Level 4 · Lumbini · Agriculture Extension`. *Change exam* opens three
  labelled selects in place (level, commission, service group), with *Open
  this exam*, *Cancel* and a *Make this my exam* box. The student stays in the
  same destination of the new exam. Setup is still there for the exam date.
  Nothing else on a page names or changes the exam.
- **The exam bar steps aside while reading.** Scrolling down slides it out of
  the way and the first scroll up brings it back; a sliver of its colour stays
  on screen. The masthead on a laptop and the bottom bar on a phone stay put.
- **Passing messages are toasts** that leave by themselves: a change of exam,
  back online. A state that is still true (offline) stays on the page.
- **Breadcrumbs** on pages below a destination (a topic, a notice, a practice
  session, guidance): `Home › Syllabus › 5. Crop protection › 5.3`. Each
  ancestor is a real page; the exam is not a crumb.
- **One main action per screen**, the only solid button, in the exam's own
  colour. Second choices are outlines in the same colour.
- **Back** follows the hierarchy (topic ─► syllabus) through the breadcrumb, not
  the browser history, so a student who arrived from a shared link is never
  stranded. The browser's own Back and Forward still work.

## 3. Exam profile model

```ts
type ExamProfile = {
  level: "level_4" | "level_7";
  province: "federal" | "koshi" | "madhesh" | "bagmati" | "gandaki" | "lumbini" | "karnali" | "sudurpaschim";
  group: ServiceGroupCode;       // the 13 service groups in infra/seed/reference_data.sql
  examDate: string | null;       // ISO date, optional
};
```

- Stored in one cookie on the device. No account, no name, no phone number.
- Validated on every read. A value that does not parse is ignored and the
  student is sent to `/start`, never shown a mixed context.
- Setup marks which choices have a syllabus in the library, so a student is
  not led into an empty exam.

**Rules that stop mixing:**

| Situation | What happens |
|---|---|
| The URL's context differs from the saved profile (a shared link) | The exam bar says *Viewing only* beside the exam's name. Its editor names the saved exam with *Go to my exam*, and *Make this my exam* is unticked. Nothing switches silently. |
| The student changes province, group or level | The new context opens at the same destination with a toast naming it; a topic, notice or question falls back to its destination and the toast says why. Progress, unfinished practice and Ask drafts are kept per context, so Level 4 answers never count towards Level 7. |
| The student only looks at another exam | With *Make this my exam* unticked the saved profile does not change, and the bar says *Viewing only*. |
| An exam is adopted from a study page | Ticking *Make this my exam* and pressing *Open this exam*, with or without changing a choice, saves the profile. An exam date belongs to one exam, so it is kept only when the exam itself has not changed. |
| A context has no syllabus in the library | Each destination keeps its own title and says what it cannot do and why, links the commission's official site, offers nearby exams that have a syllabus, and has a button that opens the exam bar's editor. Updates works as usual, because notices need no syllabus. Another exam is never shown in its place. |

## 4. Syllabus structure

```
Syllabus    commission, title, official PDF, approval date, fetch date, review state,
 │          how laws are counted, negative marking, exam stages
 ├─ Paper   format (objective or subjective), full marks, pass marks, time
 │   └─ Section   marks or question count
 │        └─ weight of each subject in this section
 └─ Subject (unit)   number, title
      └─ Topic       code as printed in the syllabus (5.3), title
                     ─► study note, questions, progress
```

A subject is defined once and weighted per paper, because the same unit can
carry 4 multiple-choice questions in Paper I and 15 marks in Paper II.

The prototype uses the real structure of two official syllabi: Lumbini
Level 4 agriculture (LUM-03, approved 2082/10/26) and Lumbini Level 7
agriculture (LUM-01, approved 2080/12/20). It shows a selection of their
topics and says so; the official PDF is linked from every syllabus screen.

## 5. Journeys

### 5.1 First visit

```
/ ─► /start ─► choose level ─► choose federal or province ─► choose group
   ─► exam date (optional) ─► Save ─► Home of that context
```

### 5.2 Study

```
Home ─► "Start here" or "Continue" ─► Study topic
Syllabus ─► subject ─► topic ─► Study topic
Study topic ─► Practise this topic ─► session
            ─► Ask about this topic
            ─► Save for offline
```

### 5.3 Practice

```
Practice hub ─► Quick practice (10 mixed, weighted by the syllabus)
             ─► By subject ─► session
             ─► By topic (from a topic page) ─► session
             ─► Mock test (the paper's real format, timer, negative marking)
             ─► Previous papers (empty until an official paper exists)
             ─► Mistakes to review ─► session
session ─► answer ─► Check ─► correct answer, explanation, why yours was wrong, source
        ─► Next … ─► Summary ─► Review mistakes ─► Question review
```

In a practice session feedback comes after each answer. In a mock test it
comes only at the end, a question can be skipped without penalty, and the
score applies the syllabus's negative marking.

### 5.4 Updates

```
Updates ─► filter by kind (vacancy, exam, syllabus, policy, result)
        ─► scope (my exam, all commissions)
        ─► Notice ─► official page (verified official address only)
                  (adding the deadline to a calendar is not built yet)
```

Every notice shows its publication date and, where there is one, its deadline
with *open*, *closing soon* or *closed*. Notices are listed automatically and
labelled *not yet checked by a person* until someone checks them.

### 5.5 Ask

```
Ask ─► a tool: Explain this topic · Explain this question · Find it in my syllabus
               · Practice questions on a topic · Make a study plan · Show the official source
    ─► or a written question ─► answer with numbered sources and review state
                             ─► or "not in the library", with what to do next
```

In this prototype nothing on these pages calls a model. A written question is
answered from the syllabus and the demo study notes, or refused; the live
pipeline in `packages/core` takes over that one path when the API is
connected, and it will be the only live call. The six tools answer from content
that already exists: study notes, question explanations, the syllabus, the
practice bank and a rule-based plan. That keeps them free and instant, and
available when live answers are paused.

### 5.6 Offline

```
Topic, syllabus or practice set ─► Save for offline ─► pages stored on the phone
Network drops ─► banner: what still works ─► saved pages and practice keep working
Ask while offline ─► the question is kept and can be sent when back online
```

Home always shows what is saved, when it was saved, and whether offline
reading is available in this browser.

## 6. State inventory

Every important action has each of these states designed, not left to the
browser.

| State | Where it appears | What the student sees | What they can do |
|---|---|---|---|
| **Loading** | Every screen, practice start, Ask | A skeleton of the real layout, never a blank page | Wait; nothing jumps when content arrives |
| **Success** | Every action | The result, and the next step | Continue |
| **Empty** | No syllabus for the context; topic without a study note; topic without questions; no mistakes yet; nothing saved; no notices for a filter; no previous papers; no weak topics yet; search with no match | One sentence on why, and the nearest useful action | Follow that action |
| **Offline** | Any screen | A banner naming what still works | Open saved pages; keep practising |
| **Expired** | A closed notice; a saved copy older than its source; an exam date in the past | The date, marked *closed* or *may be out of date* | Open the current notice; refresh the copy; update the date |
| **Permission denied** | Storage blocked (private mode, full disk) | Saving and progress are off on this device | Keep studying without saving |
| **Validation error** | Profile setup; exam date; Ask; issue report | The field, and what to fix, in words | Fix and resend |
| **Source unavailable** | A citation whose address is not a verified official one, or whose page is down | The source is named, the link withheld, and why | Open the publisher's official site instead |
| **AI unavailable** | Ask, when the daily limit is used or the service is down | Live answers paused, until when, and that the tools still work | Use the tools; come back later |
| **Unsupported answer** | Ask, when the library cannot support an answer | Not answered, why, and what was searched | Search the syllabus; practise the topic; open the official source |

Scenarios tested by hand before each round: no syllabus found; no practice
questions found; a notice expired; the network drops during study; the AI
limit is used up; a citation link is unavailable; the student changes
province; the student switches from Level 4 to Level 7.

## 7. Design system

**Direction (2026-10-01, third pass).** Ink on paper, with the exam's colour
for what can be pressed: text is one blue-black ink; buttons, links and
selected controls take the colour of the exam on screen, and the brand green
outside an exam. The second pass of the same day drew every button in ink;
the owner could not tell actions from text, so that was dropped. See
[the design system record](design-system.md) for
the tokens, the two directions that were compared, what was measured and what
was tried and dropped.

- **Colour.** Paper `#FFFFFF`, band `#F1F3F6`, ink `#0E1726`. Level 4 is
  blue `#1A6DC0` and Level 7 violet `#3F1D82`, always with the level in
  words; inside an exam its colour draws the solid button, outline buttons,
  links, the current tab and selected choices. Outside an exam the brand
  green `#1B5E45` does. Green means correct or checked, red wrong, amber
  pending or caution, each with an icon and its name. Dark mode has its own
  values rather than an inversion.
- **Type.** Noto Sans Devanagari for text and the interface; Noto Serif
  Devanagari 600 for headings, question stems, topic codes and marks. Both
  self-hosted with `next/font/local`, split into Latin and Devanagari files.
  Body text is 18px Nepali / 17px English with 1.7 line height. Metadata is at
  least 14px; controls at least 16px. No artificial slant, bold, letter
  spacing or clipping.
- **Layout.** A screen that holds several kinds of thing (Home, Practice) is
  named groups of panels: each panel is one object with an icon, a name and
  at most one link out. Reading pages keep ruled sections. One filled block
  per screen, in the exam's colour with a photograph along one edge, holds the
  next study action, how far along the student is, and the screen's one main
  button, reversed out of the fill. Gutters are 17px phone, 25.5px tablet and 34px
  laptop at the default 17px root; the workspace is capped at 1258px including
  gutters; reading columns stay narrow.
- **Home**, top to bottom: the next step and today's practice; *Your
  progress* (study plan, weak topics); *Your exam* (papers and marks with the
  negative-marking rule, latest notice, how to prepare); a strip for studying
  offline.
- **Setup** is one labelled form, with level radios and native commission and
  service-group selects. Validation retains values, focuses a linked error
  summary and keeps errors beside their fields.
- **Navigation.** Five labelled destinations: a bottom bar below 1024px, tabs
  in the masthead above. The exam bar under the masthead names the exam and
  edits it in place (section 2). Pages below a destination have a breadcrumb.
  A pressed tab marks itself at once and a hairline runs across the top until
  the next page arrives. Controls have 44 to 51px minimum targets.
- **Bars that stay on screen.** On a phone the bottom navigation; on a laptop
  the masthead. The exam bar is with them at the top of a page and whenever
  the student scrolls up, and steps aside while they scroll down. If enlarged
  text or a short viewport makes the bars too tall, they flow with the page.
  Without JavaScript nothing is sticky.
- **Motion** answers an action: 120ms press and colour, 180ms result and
  pending navigation, 240ms panel and dialog, 320ms for the exam bar to slide
  back and 220ms to slide away. No page-load choreography, and all of it is
  off for reduced-motion preferences.
- Ask drafts are retained in this tab's session storage, scoped to the exam,
  and the privacy page describes that local retention. On a touch screen Enter
  is a new line and the Ask button sends; on a keyboard Enter sends and
  Shift + Enter is a new line. Full study pages render without a streaming
  loading boundary, so they are complete without JavaScript.
- Without JavaScript Home renders the initial-topic action instead of
  permanent loading placeholders.
- Practice puts quick/mock choices first and subjects in a responsive grid.
  Mock sessions have a question overview with answered status and direct jumps;
  correct answers still appear only after submission. The answer form and the
  report form are separate forms. Ask's six tools precede its phone form.
- Syllabus source hostname, fetch date, review state and partial-selection
  warning stay visible; further reference details expand natively. Topic codes
  are shown in the page's own digits.
- WCAG 2.2 AA is the accessibility target in both themes. Contrast, focus,
  keyboard order, reflow and actual interactions must be checked; a
  recommendation alone does not establish conformance.
- Three photographs of Nepali fields, openly licensed and credited, sit in
  the filled block on Home and Practice and beside the setup form on a laptop
  (owner, 2026-10-01). They are decoration: no essential flow depends on an
  image, and a page reads the same without one. No bought stock, no generated
  images, no decorative gradients, no generic AI chat visuals, no carousel,
  and no new runtime design dependency.
- Each subject has an icon of its own in Practice and the syllabus, and
  Practice shows how much of each subject has been answered right.
- Changing theme sweeps the new colours out from the toggle.

**Tokens** live in `apps/web/app/globals.css`: colour (surfaces, ink, lines,
action, filled block, level marks, success, warning, danger, focus), type
scale, radius, motion. Components use the `action` tokens, which the study
shell points at the exam's colour.

**Components** live in `apps/web/components/ui` and
`apps/web/components/shell`: buttons, choice rows, fields, ruled sections,
groups and panels, filter chips, progress meter, source citation, status
label, bottom navigation and tabs, exam bar and switcher, breadcrumbs,
navigation progress, toast, sheet, empty state, skeleton. Each is designed for 360px and
wider, Nepali and English, both themes, keyboard use, and loading, error and
offline states. Browser evidence and outstanding launch requirements are
recorded in the design review, not assumed.

## 8. Demo data rules

The prototype runs on typed demo contracts in `apps/web/lib/data`, so the UI
does not wait for the backend and exposes what the backend will need.

- Every demo item carries a visible *Demo* label: study notes, questions,
  notices, Ask answers.
- A band on every study screen saying it is a prototype with demo content is
  built and switched off while the app runs only on its developers' machines
  (owner, 2026-10-01). `AGRILOK_DEMO_BANNER=1` switches it on. It must be on,
  or the demo content gone, before anyone outside the team can reach a build.
- Exam structure, marks, time, negative marking, approval dates and topic
  titles come from the official Lumbini syllabi, and cite them.
- A demo item never claims a real passage. Its citation says it is a
  placeholder and links only to the publisher's official site.
- Links open only when the address is a verified official domain (the source
  whitelist, and the commission and agency sites confirmed in research). Any
  other address is shown, not linked, with the reason.
- No lorem ipsum, and no content that could be mistaken for a real vacancy or
  a real deadline.

## 9. Ready for backend integration when

- A new student can begin studying without instructions.
- The exam profile is clear on every relevant screen.
- Level 4 and Level 7 content never appears mixed.
- A syllabus topic can be reached in a few taps.
- Every practice question has a clear answer and explanation.
- Every source is visible and understandable.
- Notices show publication dates and relevance.
- The student always knows what to do next.
- Offline status is obvious.
- It works at narrow Android widths.
- Nepali input and rendering work correctly.
- No essential flow depends on images.
- Loading, error, empty and offline states are designed.
- The UI exposes no secret and never calls the API from the browser.

## 10. Deferred

Social groups, leaderboards, payments, accounts and complex profiles, push
notifications, a voice tutor, native Android packaging, AI-generated study
plans and decorative landing sections all wait until the core loop is
validated with students.
