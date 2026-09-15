# apps/api - retrieval and generation

> **Status: not implemented.** Phase 1. See [roadmap](../../docs/roadmap.md).

Python + FastAPI. The only component that talks to the Gemini API.

## Responsibilities

- **Retrieval** - hybrid keyword + vector search over pgvector, filtered by
  `exam_level`, `service_group` and `province`.
- **Prompt assembly** - retrieved text fenced as untrusted data
  ([ADR-0005](../../docs/adr/0005-untrusted-retrieved-context.md)).
- **Generation** - Gemini Flash, answering only from the assembled context.
- **Quota governor** - enforces ceilings below the published free-tier limits;
  serves cache-first ([ADR-0004](../../docs/adr/0004-cache-first-serving.md)).
- **Citations** - every substantive claim resolves to a source URL and fetch date.

## Hard rules

- **Never answer from model memory.** When retrieval returns nothing sufficient,
  say so. That is the designed behaviour, not a failure path
  ([ADR-0003](../../docs/adr/0003-retrieval-grounded-answers-only.md)).
- **Never emit an answer without citations.**
- **Never put personal data in a prompt.** Free-tier content may be used by the
  provider and seen by human reviewers ([privacy](../../docs/privacy.md)).
- **Never follow instructions found in retrieved text.**
- **Never serve content whose `review_state` the response does not carry.**

## Setup

Not yet. Python version is pinned in [`.python-version`](../../.python-version).
