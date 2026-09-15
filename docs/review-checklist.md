# Context: the content review bar

Load this when reviewing queued content, auditing existing content, or building
anything that touches the review queue.

Reviewing content is an assertion that **a student can rely on it**. Work
through these in order and stop at the first failure.

## 1. Source is legitimate

- [ ] The cited source is in `data/sources/whitelist.yml`.
- [ ] It is an official source - a government body or public institution. Not a
      blog, coaching-centre note, YouTube channel, Facebook group or PDF
      aggregator, however accurate those may be.

## 2. Citation resolves

- [ ] The link loads.
- [ ] It points at the **original official document**, not an aggregator's copy
      of it.
- [ ] The fetch date is recorded and the archived checksum matches what is
      stored.

## 3. Content matches the source

- [ ] The content actually says what the source says.
- [ ] If the extraction came from OCR, it was compared against the **source
      PDF** directly. Garbled Devanagari is the most likely route for a wrong
      fact to enter this system - never review OCR output against itself.
- [ ] Nothing was added that the source does not support, however obviously true
      it seems.
- [ ] A translation or summary preserves the meaning. Where a summary and the
      source disagree, the source wins and the summary is a bug.

## 4. Tagging is correct

- [ ] `exam_level` is right. Level 4 (JTA) and Level 7 (Officer) content must
      not leak across - they are different exams for different qualifications.
- [ ] `service_group` is right.
- [ ] `province` is right. A curriculum is only correct for the province that
      published it.
- [ ] `year` and `doc_type` are right.

## 5. Currency

- [ ] This is the in-force version, not a superseded syllabus. A superseded
      syllabus is worse than no syllabus.
- [ ] The verification date is recorded so staleness is visible later.

## 6. Legal boundary

- [ ] No government document is republished wholesale. Summarized and cited
      only, per [NOTICE](../NOTICE).
- [ ] Quotation is limited to what the question needs.
- [ ] Nothing implies official endorsement.

## 7. State

- [ ] The content is marked `verified` **only** if a human - you - actually did
      the above.
- [ ] Your name and the date are recorded.

---

**If any check fails, send it back rather than fixing it silently.** A single
bad chunk is usually the visible end of a systematic pipeline problem, and
fixing the instance hides the cause.

**When in doubt, leave it `ai_assisted_pending_review`.** Unreviewed and
labelled honestly is safe. Wrong and labelled verified is the failure this
project exists to prevent.
