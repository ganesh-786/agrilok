# UI quality research

Research date: 2026-10-01. Scope: the owner's screenshots and concerns, the
navigation and font code as it stood, and primary-source web research. Later
sections record the research done for each further pass.

## Findings from the code

| Evidence | Finding | Consequence |
| --- | --- | --- |
| `apps/web/app/fonts.ts` | Licensed Noto Sans Devanagari WOFF2 is already local, variable and script-split, with swap and preload disabled | This is not a live font CDN dependency; compare rendered candidates before replacing it |
| `apps/web/components/shell/StudyNav.tsx` and the exam `layout.tsx` | Real links target distinct URLs; active state derives from the pathname | Reading hrefs cannot establish that taps work |
| Exam Home, Syllabus, Practice, Updates and Ask `page.tsx` files | Each returned the same component when the exam had no syllabus | A strong explanation for navigation that looked ineffective; a browser reproduction was still required |
| Exam `layout.tsx` | The exam was shown as a label and a Change link | Editing each part of the exam in place was a new requirement, not something already shipped |
| [The redesign review](ui-redesign-review.md) | Earlier checks exist | Earlier checks cannot certify a later design or reproduce a newly reported fault |

The first screenshot supported a review of large chrome, heading dominance and
repeated empty-state content. It did not establish computed contrast, input
behavior, loading speed or student learning. Those require measurements or
observation.

## Primary-source research and decisions

These links were opened during the review. Standards define measurable floors;
they do not certify aesthetic quality. Recommendations below distinguish the
source's scope from our product decisions.

| Primary source | Supported guidance | Decision for agrilok |
| --- | --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility success criteria across perception, operation and comprehension | AA is the target; automated checks alone are insufficient |
| [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Different requirements apply to text and essential graphical/control cues | Measure actual theme/state combinations; decorative borders are not all essential cues |
| [Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | AA minimum is 24 CSS px, with specified exceptions | Prefer 44 CSS px for important touch controls as a stronger local goal; keep web/native units distinct |
| [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Content generally works at a 320 CSS px equivalent width without two-dimensional scrolling | Add this alongside phone/laptop screenshots and enlarged-text review |
| [Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) | Ancestor links, a labelled navigation landmark and current-page semantics | Use genuine hierarchical links; adjacent labelled pickers handle exam editing |
| [Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | Custom searchable selection needs explicit keyboard, focus and state behavior | Prefer native selects for short lists; custom search must justify its complexity |
| [Devanagari layout requirements](https://www.w3.org/International/ilreq/devanagari/) | Script shaping, punctuation and line-breaking need script-specific treatment | Test real Nepali samples and preserve clusters; this draft guidance is not font certification |
| [Font best practices](https://web.dev/articles/font-best-practices) | Fonts affect text rendering and layout stability; WOFF2, subsetting and selective preload can reduce cost; self-hosting speed depends on delivery | Keep local licensed delivery for CSP/offline needs and measure it. Compare families on readability and payload, not catalog prestige |
| [Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Disabling nonessential interaction-triggered animation is an AAA criterion | Adopt reduced-motion support as a local requirement without mislabelling this particular criterion AA |
| [Clear steps, cognitive accessibility](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/) | Visible location and clear process steps help people resume tasks | Keep exam context, location and next action understandable; this supplemental advice is not a measured learning outcome |
| [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) and [INP optimization](https://web.dev/articles/optimize-inp) | Field goals: LCP <=2.5 s, INP <=200 ms, CLS <=0.1 at the 75th percentile | Collect representative measurements and distinguish local diagnostics from real-user results |

## Design judgment rather than fixed recipes

Premium quality here means a considered visual identity supported by readable
bilingual typography, coherent grouping, disciplined emphasis and reliable
interaction. This is a product judgment, not a scientific definition of premium.

Compare plausible directions using the same study screen and state cases.
Record the choice and tradeoffs rather than prescribing blue, plum, Noto,
glassmorphism, serif headings, a specific corner radius or one animation duration
forever. Current values can remain if they perform well. Tokens provide coherence
while allowing those decisions to evolve.

Use the existing student-testing plan to check findability, switching, recovery,
practice feedback and source comprehension. Add tasks for direct context editing
and navigation in unsupported exams. Record completion, errors and observed
confusion; do not claim improved retention or pass rates without suitable study
evidence. No student session was conducted for this task.

## Limits of the first research

The work this section first listed has since been done and checked in a
browser. The reported tap failure was reproduced: a development badge covered
the Home tab at phone width, and an exam without a syllabus showed one page
under all five tabs. Results, including what was not verified, are in
[the redesign review](ui-redesign-review.md).

Student usability and field performance have not been measured. They need
sessions with students and measurements from a deployed build.

## Third pass: what established learning products do

Research date: 2026-10-01, for the owner's report that Home was "everything on
the plate", that sections could not be told apart, that the exam was named in
several places, that notices stayed on screen, and that black buttons gave
nothing to aim at. Seven pages, in six of the rows below, were opened and read during
the task; the other four rows rest on search-result summaries or on a page that
would not render, and each says so.
They are references to learn from, not designs to copy, and none of them is
evidence that this app helps anyone study.

| Source | What it says | What agrilok took from it |
| --- | --- | --- |
| Khan Academy, [How we rebuilt Khan Academy's color system](https://blog.khanacademy.org/how-we-rebuilt-khan-academys-color-system-from-the-ground-up) and the [Wonder Blocks tokens](https://github.com/Khan/wonder-blocks) (`color.ts`: blue `#1865f2`, green `#00a60e`, red `#d92916`, gold `#ffb100`) | Colour is assigned by role: one "instructive" colour for the actions that move a learner forward; success, warning and critical each have their own; core tokens were checked for contrast | Actions get a colour of their own, separate from correct, wrong and pending. Ink buttons were dropped |
| Coursera design system, as documented by [a third-party extraction](https://www.shadcn.io/design/coursera) (not Coursera's own page; search summary only, not opened) | One blue fills every primary call to action | One solid button style, one per screen |
| Duolingo, [the redesigned home screen](https://blog.duolingo.com/new-duolingo-home-screen-design/) | Learners kept asking whether they were using it "the right way", so the home screen became one path and secondary features were folded into it. The post reports no outcome data | Home leads with one next step; everything else is grouped below it |
| Khan Academy, [the new classroom experience](https://blog.khanacademy.org/meet-the-new-khan-academy-classroom-experience/) (search summary only; the student help article returned 403 and was not read) | The learner dashboard shows what to work on next, then progress | The same order: next step, then progress, then reference |
| ustwo, [Brilliant.org case study](https://ustwo.com/work/brilliant/), as summarised in search results (the page itself was not fetched) | Learning paths are colour-coded by topic | An exam's colour runs through its pages |
| Nielsen Norman Group, [Sticky headers: 5 ways to make them better](https://www.nngroup.com/articles/sticky-headers/) | Keep a sticky header small and opaque; a "partially persistent" header hides on the way down and returns on the way up; a slide of roughly 300 to 400 ms feels natural | The exam bar tucks away going down and returns going up, 320 ms in and 220 ms out. The masthead and the bottom bar stay |
| Nielsen Norman Group, [The principle of common region](https://www.nngroup.com/articles/common-region/) | A border or background makes its contents one group; use one when whitespace alone does not show the grouping; too many boxes add clutter | Whitespace alone had failed here (the owner's report), so each object on Home is a panel. Reading pages keep ruled sections |
| Nielsen Norman Group, [Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) | Contrast in saturation, not hue alone, creates emphasis; about three sizes; squint to check | Three heading steps; one saturated button on a wash; icons in a tint |
| W3C, [Understanding 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) | A message that disappears does not set a time limit when the same information stays available another way | Only news the page already shows (the exam bar names the exam) is a toast. It also pauses under the pointer or keyboard and can be closed |
| Material Design 3, [Snackbar](https://m3.material.io/components/snackbar/guidelines) (the page did not render for the fetcher; the 4 to 10 second range is from search results quoting it) | A message with no action dismisses itself after 4 to 10 seconds | 4 to 10 seconds, by word count |

Added for the fourth pass (both pages opened and read):

| Source | What it says | What agrilok took from it |
| --- | --- | --- |
| Nielsen Norman Group, [Auto-forwarding carousels and accordions annoy users and reduce visibility](https://www.nngroup.com/articles/auto-forwarding/) | A panel that changes by itself is taken for an advertisement, shows each item only part of the time, and moves on before slow readers, non-native readers and people with motor difficulties have finished | The owner offered "a carousel or other premium video-like effect". Home has one next step, not several to rotate, so it gets a still block with a photograph that drifts slowly, and no carousel |
| Next.js 16.3 documentation, "How to prevent flash before hydration" (shipped in `node_modules/next/dist/docs`) | An inline script sets the theme before the first paint; React complains when it has to build a `<script>` in the browser, which a helper avoids by marking it `text/plain` there; in development Strict Mode drops attributes the script set on `<html>`, which a layout effect restores | `components/InlineScript.tsx` and the layout effect in `ThemeToggle.tsx`, as documented |

Not taken: Duolingo's streaks, hearts and mascot (the owner's product
principles rule out invented numbers and decorative reward loops); a reference
product's exact blue (it would have collided with Level 4); stat tiles with
large numbers (Home has one real number worth setting large, the days to the
exam, and it is shown only when the student has given a date).

What this research cannot show: whether students find things faster on the
new Home, or prefer coloured buttons. Only the owner's own report stands behind
"could not tell what is what", and only a student round can confirm the fix.
