# infra - database schema and migrations

> **Status: Phase 1 MVP.** Seven migrations, reference data, and a local
> development database.

PostgreSQL with the `pgvector` extension. One datastore for relational data and
vectors - see the reasoning in [architecture.md](../docs/architecture.md).

## Layout

| Path | Contents |
|---|---|
| `migrations/` | Forward-only, single-concern schema migrations |
| `seed/` | Reference data - provinces, exam levels, service groups, document types |
| `src/agrilok_infra/` | The `agrilok-db` command: migrate, and the local database |
| `tests/` | Schema invariants: level separation, provenance, review defaults |

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

## Running it

```sh
uv run agrilok-db start     # Postgres 17 + pgvector on 127.0.0.1:54329
uv run agrilok-db migrate   # apply migrations, then reference data
uv run agrilok-db status
uv run agrilok-db stop
```

`start` runs an embedded PostgreSQL with pgvector from the `pgembed` wheel
(the `local` extra), with its data in `.local/pgdata`. Nothing to install, and
it works the same on Windows, macOS and Linux. It is for development only;
production points `DATABASE_URL` at a hosted Postgres with pgvector and never
installs it.

`migrate` records each file's checksum in `schema_migrations` and refuses to
run if an applied migration was edited afterwards. Fix a mistake with a new
migration, never by changing an old one.

Tests that need Postgres create and drop their own scratch database, so they
never touch your development data. They use `AGRILOK_TEST_DATABASE_URL` if it
is set (CI points it at a pgvector service container), otherwise the local
server on port 54329 if it is running, and skip if neither is reachable. A run
that reports skips has not tested the database.
