# packages/core - shared retrieval, generation and safety code

One library, used by [apps/api](../../apps/api/README.md),
[services/ingestion](../../services/ingestion/README.md) and
[services/evaluation](../../services/evaluation/README.md), so the pipeline a
student hits, the pipeline that fills the corpus and the pipeline the golden
set measures are the same code.

## What lives here

| Module | Responsibility |
|---|---|
| `settings` | Configuration from the environment and `.env`. Secrets are `SecretStr`. |
| `text` | Script-aware normalisation (Devanagari skeletons, Nepali stems, digits) and BM25 search terms |
| `support_check` | The deterministic support check (ADR-0008), ported line for line from the spike |
| `prompt` | The system instruction, response schema and source fencing (ADR-0003, ADR-0005) |
| `gemini` | A small async REST client: embeddings, structured generation, model fallback |
| `quota` | The quota governor and aggregate usage counts (ADR-0004) |
| `retrieval` | Hybrid vector + BM25 retrieval with hard level, province and group filters (ADR-0013) |
| `cache` | Exact and near-duplicate answer reuse, invalidated when a cited document changes |
| `citations` | Numbered citations; an invented citation makes the whole answer unsupported |
| `pii` | Stops email addresses and phone numbers before they reach the model |
| `pipeline` | The whole ask path, in the order the ADRs require |

## Rules that bind this package

- **Never answer from model memory.** Every failure path ends in a refusal or
  "temporarily unavailable", never in a softer answer ([ADR-0003](../../docs/adr/0003-retrieval-grounded-answers-only.md)).
- **The support check and the prompt are measured artefacts.** They are copied
  from the version the golden set scored 35 of 37 with. Changing either means
  running the golden set before and after, and bumping `PROMPT_VERSION`.
- **Level 4 and Level 7 never mix.** The level filter is in the SQL, not
  applied afterwards.
- **No personal data in a prompt, a log line or a cache row.**

## Tests

```bash
uv run --package agrilok-core pytest packages/core
```

`tests/test_support_check_parity.py` replays real spike answers through both
the JavaScript and the Python support check and requires the same verdict for
every claim. It runs when Node and the spike's saved reports are present, and
is skipped otherwise.
