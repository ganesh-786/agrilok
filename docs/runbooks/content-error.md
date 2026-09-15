# Runbook: a student reports wrong content

This is the highest-priority class of report this project receives. A wrong fact
memorised from here can cost an aspirant an entire exam cycle.

Treat it as a **security-class incident**, not a data-quality ticket - see the
threat model in [SECURITY.md](../../SECURITY.md).

## 1. Contain (minutes)

1. **Find the content** and check its `review_state`.
2. **If it is marked `verified`, demote it immediately** to
   `ai_assisted_pending_review`. Do this before investigating. A student reading
   it right now is the priority, and "verified but wrong" is the exact failure
   the product exists to prevent.
3. **Check whether it is cached or pre-generated.** If so, the same wrong answer
   is being served to everyone - invalidate that cache entry now. This is the
   known cost of cache-first serving
   ([ADR-0004](../adr/0004-cache-first-serving.md)).
4. Thank the reporter. Someone telling us we are wrong is doing the project a
   favour, and often under exam stress.

## 2. Verify (same day)

Work the bar in
[docs/review-checklist.md](../review-checklist.md),
or run `/review-content`.

Establish which of these it actually is:

| Cause | Signal | Scope |
|---|---|---|
| Source itself is superseded | Citation resolves, but a newer syllabus exists | Everything from that document |
| OCR misread | `extraction_method = ocr`, garbled or subtly wrong Devanagari | Potentially every chunk from that scan |
| Wrong tags | Content is true but for another level, group or province | Every chunk sharing the mis-tag |
| Retrieval error | Correct sources exist; the wrong one was used | A class of questions, not one chunk |
| Generation error | Retrieved context was right; the answer does not follow | A faithfulness bug - highest severity |
| Reporter is mistaken | Source supports the content | Close kindly, with the citation |

## 3. Assess the blast radius

**A single bad chunk is usually the visible end of a systematic problem.** Before
fixing the instance, ask what else shares its cause:

- Same source document? Same scan?
- Same `extraction_method` and a similar confidence score?
- Same tag, applied by the same rule?
- Same reviewer, same session?

Query for the cohort. Fix the cohort.

## 4. Fix

1. Correct the content, or remove it if it cannot be sourced.
2. Fix the pipeline cause, not just the instance.
3. Re-review the affected cohort before restoring anything to `verified`.
4. Invalidate every affected cache entry.
5. **Add the case to the golden set** so the class of error is measured from now
   on. This is how reports make the system permanently better rather than
   momentarily correct.

## 5. Close the loop

- Reply to the reporter with what was wrong, what was fixed, and how far it
  reached. They earned a real answer.
- Record it in `CHANGELOG.md` under **Content & sources** - a corrected fact is a
  user-visible change.
- If the cause was a process failure rather than a bug, fix the process and say
  so in the issue.

## Never

- Quietly edit content and close the issue.
- Argue with a reporter about whether it was "technically" wrong.
- Restore `verified` without a fresh human check against the source.
- Leave a cached wrong answer in place while investigating.
