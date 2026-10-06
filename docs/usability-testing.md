# Usability testing with students

> **Status: ready to run on the prototype.** Task-based testing with real
> Level 4 and Level 7 aspirants, run before the real API is connected. The
> screen map it tests is [student-experience.md](student-experience.md).

We test whether students can do the job, not whether they like the look.
Opinions are collected last and weighed least.

## Who

- 5 to 8 students per round, actually preparing for the exam.
- At least two Level 4 and two Level 7 candidates, from at least two
  provinces.
- At least one who studies mainly on a phone with a slow or metered
  connection, and one who prefers English.

No personal data is recorded: no name, phone number or photo. Each session is
a code (`R1-S3`), a level and a province.

## Setup

- Run a production build (`npm run build && npm start` in `apps/web`), not the
  dev server. Offline saving only works in a production build.
- Use the student's own Android phone where possible. If not, a phone at
  360 px width with Chrome's network throttled to *Slow 4G*.
- Clear the demo state first: `/prototype`, *Reset demo progress*.
- Tell the student it is a prototype with demo questions and notes, that
  nothing they do is graded, and that confusion is the product's fault, not
  theirs.

## Tasks

Include these navigation regressions in the next round: activate each primary
destination for an exam without a syllabus; describe where you arrived; edit
level, commission/province and group directly; cancel a change; apply another;
use Back and resume a draft or practice attempt. Record confusion, task completion
and unintended loss of work. These are planned checks, not completed evidence.

Read each task aloud once. Do not point at the screen. If the student is
stuck for two minutes, note it as a failure and move on.

| # | Task | Done when |
|---|---|---|
| 1 | Find the current syllabus for your exam. | The syllabus screen for their level, province and group is open |
| 2 | Find one horticulture or agriculture topic. | A topic page in that subject is open |
| 3 | Start a ten-question practice set. | The first question of a quick or subject set is on screen |
| 4 | Review one incorrect answer. | A question review showing the correct answer and why theirs was wrong |
| 5 | Find the latest notice relevant to you. | The newest notice for their exam is open |
| 6 | Find what to study this week. | The plan in Guidance, or the plan card on Home, is on screen |
| 7 | Ask a question about a topic you find difficult. | An answer or a clear "not in the library" state is on screen |
| 8 | Save something to study later without internet. | A topic or practice set shows as saved |

Then turn on airplane mode and ask them to open what they saved.

## What to record for each task

| Measure | How |
|---|---|
| Completed | Yes, with help, or no |
| Time | Seconds from the end of the instruction to *done* |
| Hesitation | Where they paused more than five seconds, and on which screen |
| Misunderstanding | What they thought something meant, in their words |
| Expected but missing | What they looked for and did not find |
| Trust | After tasks 4 and 7: "Would you rely on this? Why?" |

## Sorting the feedback

Every observation goes in exactly one bucket:

| Category | Example |
|---|---|
| **Missing feature** | Looked for a bookmark list and there was none |
| **Confusing interaction** | Tapped the context bar expecting a menu |
| **Untrusted content** | Did not believe an answer because the source name was unfamiliar |
| **Performance or accessibility problem** | Text too small; a page too slow on the throttled connection |

Severity: **blocker** (task failed), **major** (completed with help or more
than twice the median time), **minor** (noticed, did not slow them down).

## After the round

1. Group observations by category and count how many students hit each one.
2. Fix blockers first, then majors seen by two or more students.
3. Remove what nobody used, rather than explaining it better.
4. Simplify navigation where students took a detour.
5. Run the same tasks again with new students.
6. Freeze the information architecture when two rounds in a row have no
   blocker, and record the freeze in [student-experience.md](student-experience.md).
7. Connect the real API only after that.

## Session sheet

```
Session: R_-S_     Level: 4 / 7     Province: ________     Device: ________
Task  Done (Y/H/N)  Time (s)  Hesitated at            Misunderstood / expected
1
2
3
4     Trust: ______________________________________________
5
6
7     Trust: ______________________________________________
8     Offline reopen worked: Y / N
Notes (category · severity):
```
