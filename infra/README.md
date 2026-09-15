# infra - database schema and migrations

> **Status: not implemented.** Phase 1.

PostgreSQL with the `pgvector` extension. One datastore for relational data and
vectors - see the reasoning in [architecture.md](../docs/architecture.md).

## Layout

| Path | Contents |
|---|---|
| `migrations/` | Forward-only, single-concern schema migrations |
| `seed/` | Reference data - provinces, exam levels, service groups, document types |

## Migration rules

- **Forward-only**, one concern per migration, reversible where practical.
- **Preserve the Level 4 / Level 7 separation at the schema level.** It is a
  structural guarantee, not a UI filter.
- **Never weaken provenance columns** - `source_id`, `source_url`, `fetched_at`,
  `checksum` - and never make them nullable. Without them a citation cannot be
  built, and an uncitable chunk must not exist.
- **Never default `review_state` to `verified`.** The default is
  `ai_assisted_pending_review`. A migration that flips this would silently mark
  unreviewed content as checked, which is the failure this project exists to
  prevent.
- State a rollback plan in the PR, or say explicitly why none is needed.

## Reference data belongs here

Provinces, exam levels, service groups and document types are seeded, not
hardcoded in application code. The source landscape moves - ministries are
restructured, curricula are revised - and currency must be data, not a constant
someone has to remember to change.
