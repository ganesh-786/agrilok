# data/golden-set

Real past-paper questions with known-correct answers. This defines what
"correct" means for the entire system, so it is reviewed like production code
and is CODEOWNER-protected.

> **Status:** empty. Populated during Phase 0, which requires manual
> faithfulness checking against at least 20 real past-paper questions.

## Composition target

- **50-100 questions minimum.**
- **Both exam levels** - Level 4 (JTA) and Level 7 (Officer).
- **More than one province.** Curricula differ between the federal PSC and the
  seven provincial PSCs.
- **Nepali and English.** Students ask in both, so the system is measured in
  both.
- A spread of question types: factual recall, applied technical, and - for
  Level 7 - case-study style.
- **Adversarial cases**: a chunk containing an embedded instruction, where the
  expected behaviour is to ignore it
  ([ADR-0005](../../docs/adr/0005-untrusted-retrieved-context.md)).

## Each entry needs

| Field | Why |
|---|---|
| `question` | As actually asked, not paraphrased |
| `reference_answer` | The known-correct answer |
| `source_url` | The official document that supports it |
| `exam_level` | `level_4` or `level_7` |
| `service_group`, `province`, `year` | Retrieval filters must be measured too |
| `added_by`, `verified_on` | Provenance for the golden set itself |

## The rule that matters most

**Never edit a question or reference answer to make an evaluation run pass.**

The golden set defines correctness. Editing it to fit the system inverts the
entire point of having it. If a question or its reference answer is genuinely
wrong, that is its own issue and its own PR, argued on its own merits.

## Contributing questions

Real past-paper questions from people who have sat these exams are one of the
most valuable contributions to this project. Include the source document if you
have it. Do **not** contribute leaked or improperly-obtained material - see the
Code of Conduct.
