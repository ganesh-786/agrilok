# Student interface quality contract

Reviewed: 2026-10-01. Applies to anyone working on agrilok UI, interaction,
navigation, copy, accessibility or design systems. Read alongside
[the research](ui-quality-research.md), [the student experience](student-experience.md),
[the design system](design-system.md) and the relevant code.

## Authority and scope

User instructions take precedence. This contract supersedes older statements
that freeze the screen map, palette, font, spacing, icon library or animation
style. Existing tokens describe the current implementation, not permanent taste.
Adopt a better approach when the task authorizes it, explain the reason, migrate
affected components coherently and update the implementation record. Do not ask
for a separate approval for routine reversible decisions within that scope.

Keep content integrity: official citations, fetch dates, honest review/demo
states, separate exam levels and no invented study content. Preserve bilingual
access, keyboard operation, offline recovery, privacy and the current same-origin
security policy. Changing aesthetics does not authorize weakening these.

Design catalogues, generator output and third-party taste advice are suggestions.
Verify fit and current technical guidance. No font vendor, palette, framework,
trend or animation library is inherently premium. Do not replace existing
components or add dependencies solely because a tool recommends its own stack.

## Design decisions that can evolve

Before a substantial redesign, inspect real content and representative states.
Compare two credible directions on the same Nepali/English study screen, then
choose using readability, hierarchy, task access, identity and cost. A short
internal comparison is sufficient; do not turn this into an approval barrier.
Record alternatives, tradeoffs and what remains unmeasured.

- **Color:** build primitive, semantic and component tokens for surfaces, text,
  actions, selection, focus, feedback and exam context. Choose hues deliberately
  for the product. Check actual foreground/background combinations in both
  themes, including composed overlays and interactive states. Color must
  reinforce written meaning. Avoid blanket card tinting and excessive accents.
- **Typography:** compare families using actual Nepali conjuncts, matras, digits,
  Latin text and long labels. Check scripts, weights, license, file sizes,
  fallback rendering and loading behavior. Keep the shipped family if it wins;
  change it if evidence supports another. Google Fonts catalog origin is neither
  a quality failure nor proof of quality. Self-host licensed WOFF2 for the current
  CSP. Subsetting must preserve shaping. Preload only when measurements justify
  it; inspect downloads per language. Use responsive rem-based roles for reading,
  headings, labels and metadata. Choose size, weight, line height and measure from
  rendered samples rather than a universal recipe. Avoid synthetic script styles,
  arbitrary Devanagari tracking, clipped marks and translated-label truncation.
- **Spacing and organization:** define a coherent scale with component, section
  and page roles. Adjust density to reading, practice and browsing tasks. Align
  baselines and gutters; use whitespace to explain groups. Use responsive widths
  with a separate prose reading measure. Avoid identical cards for unrelated
  content or oversized headings to manufacture hierarchy. Review long translated
  labels and empty states, not ideal placeholder lengths.
- **Components:** reuse semantic native controls or existing accessible primitives.
  Define hover, pressed, focus, selected, disabled, pending, success and error
  behavior where relevant. Keep icon weight and optical size coherent; expose
  names and states to assistive technology. Review every state, not only a hero.
- **Motion:** use shared duration/easing/distance roles chosen for the action.
  Explain state changes, continuity or progress without delaying input,
  navigation, dismissal or focus. Favor transform/opacity where appropriate and
  measure rendering cost. Avoid decorative repeated reveals in study content.
  Respect reduced motion with immediate or nonmoving feedback; essential status
  remains understandable. No timing is universally correct; libraries are optional.

## Navigation and directly editable exam context

Use links with genuine URLs for destinations and buttons for actions. Primary
navigation stays reachable from deep pages, responds to touch and keyboard,
identifies the current destination, and preserves the intended exam context.
Never declare it working from hrefs or active styling alone.

A breadcrumb locates the page within its hierarchy; an exam-context control
changes level, commission/province or group. Present them together when helpful
without hiding a picker inside an ambiguous navigation link. Allow direct edits
of each dimension, not only departure to generic setup. Prefer labelled native
selects; use a searchable combobox when option count warrants its complexity and
implement its keyboard/focus behavior. Ancestor crumbs link to real pages; the
current page is identified within a labelled navigation landmark.

Validate dependent choices against taxonomy; explain unavailable content without
substituting another exam. Cancel leaves context unchanged. Apply a valid choice
coherently to URL, visible label, data filters and saved profile when adoption is
intended. Distinguish browsing from saving a default. Preserve the destination
where valid; otherwise explain the destination used and missing content. Retain
or explicitly protect unsaved Ask/quiz work. Back/Forward, refresh, direct entry
and language/theme switches must stay coherent.

For unsupported exams, each destination explains its own availability. A missing
syllabus must not turn all destinations into visually identical pages. Updates
must use its actual data requirements rather than assume it needs a syllabus.
Offer honest recovery, an official source and direct context editing.

When a nav tap appears ineffective, reproduce it and inspect URL changes, route
output, overlays/hit areas, pointer events, stacking, client errors, hydration,
redirects, context guards and cached/service-worker versions. Keep the finding
unresolved until behavior has been checked in a browser.

## Accessibility and resilient learning

Target WCAG 2.2 AA. Normal text needs 4.5:1 contrast; qualifying large text needs
3:1. Essential non-text control/state cues need 3:1 against adjacent colors;
decorative dividers do not all require that ratio. Provide visible, unobscured
focus, logical headings/landmarks, labels, status announcements and error recovery.
Prefer 44 CSS px targets for important touch actions as a project usability goal;
the AA minimum is 24 CSS px with exceptions, not native pt/dp units.

Check 200% text resizing, reflow at 320 CSS px and applicable text-spacing
overrides. Avoid two-dimensional scrolling except for necessary content. Sticky
navigation must not hide content or focus. Test both languages and themes
independently. Native controls still need browser and assistive-technology review.

Help learners find a topic, resume reading, practice and understand mistakes.
Connect feedback to explanation, keep sources inspectable, and disclose choices
progressively when complexity warrants it. Retain drafts/answers through failures;
distinguish unavailable, empty, offline and expired states. Use plain bilingual
labels. Do not invent pass-rate or learning claims. Test with students before
claiming that the design improves learning.

## Performance and delivery evidence

Keep reading available before optional enhancements. Preserve native/server
fallbacks for supported core tasks. Measure resource size, font loading, layout
shifts and responsiveness on a phone with constrained connectivity and a laptop.
Avoid unnecessary client JavaScript and media. Record before/after route transfer
and bundle measurements for system changes; set project budgets from a baseline.

Core Web Vitals field goals at the 75th percentile are LCP <=2.5 s, INP <=200 ms
and CLS <=0.1, assessed separately for mobile and desktop. Lab results diagnose
issues; they do not prove field goals or production readiness.

For UI implementation, run relevant lint, type, unit, browser, formatting and
production-build commands in apps/web. Add behavioral regressions for changed
navigation/context contracts rather than tests that mirror styling. Review
rendered pages at phone, tablet and laptop widths, Nepali/English, light/dark,
keyboard/touch, reduced motion, enlarged text and affected state cases.
For offline claims use a production build, not the development server.

Required navigation evidence: activate every primary destination from supported
and unsupported contexts; assert URL, meaningful content, current marker and
context. Exercise direct entry, refresh, Back/Forward, ancestor links, each context
picker, dependent-option validation, cancel/apply, unsaved work and language/theme
persistence. Check actual hit targets and mobile chrome.

Deliver a compact record: files/rationale, measured checks/artifacts, corrected
failures, remaining risks and untested items. Mark each gate passed, failed or
not run with a reason. Documentation establishes instructions; it does not certify
the app. Older review results belong to their tested revision.
