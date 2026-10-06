"""Forward-only migrations, then idempotent reference data.

Each file in infra/migrations runs once, in order, inside its own transaction,
and its checksum is recorded. Editing a migration after it has been applied is
an error, not a silent re-run: the fix for a bad migration is a new migration
(infra/README.md, "Migration rules").
"""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, LiteralString

import psycopg
from psycopg.conninfo import conninfo_to_dict

from agrilok_infra.paths import MIGRATIONS_DIR, SEED_DIR

_MIGRATION_NAME = re.compile(r"^\d{4}_[a-z0-9_]+\.sql$")

# Seconds to wait for the database to answer, per address the host resolves
# to. Left to itself the driver waits 130 seconds per address and prints
# nothing, so a dropped connection or a paused hosted database looks like a
# hang rather than an error. On Windows it waits that long even when the
# connection is refused outright (measured with psycopg 3.3.6), so there this
# is also what bounds "nothing is listening on that port".
CONNECT_TIMEOUT_SECONDS = 15


class MigrationError(RuntimeError):
    pass


class DatabaseUnreachableError(MigrationError):
    """No connection was made, so nothing was applied or changed."""


def _connect(url: str) -> psycopg.Connection[tuple[Any, ...]]:
    try:
        params = conninfo_to_dict(url)
    except psycopg.ProgrammingError:
        # The driver's own message can quote part of the string, and the part
        # it quotes can be the password, so it is not passed on.
        raise DatabaseUnreachableError(
            "the database URL is not a valid PostgreSQL connection string. "
            "It should look like postgresql://user:password@host:5432/database"
        ) from None
    # A timeout the developer chose, in the URL or in PGCONNECT_TIMEOUT, wins.
    chosen = "connect_timeout" in params or "PGCONNECT_TIMEOUT" in os.environ
    try:
        if chosen:
            return psycopg.connect(url, autocommit=True)
        return psycopg.connect(url, autocommit=True, connect_timeout=CONNECT_TIMEOUT_SECONDS)
    except psycopg.OperationalError as exc:
        where = f"{params.get('host') or 'the default host'}:{params.get('port') or 5432}"
        raise DatabaseUnreachableError(
            f"could not connect to the database at {where}. Nothing was applied.\n"
            f"{str(exc).strip()}\n"
            "Check the network and DATABASE_URL in .env. To wait longer on a slow "
            "connection, set PGCONNECT_TIMEOUT to a number of seconds."
        ) from exc


@dataclass(frozen=True)
class Migration:
    version: str
    path: Path
    sql: str
    checksum: str


def discover(directory: Path = MIGRATIONS_DIR) -> list[Migration]:
    migrations: list[Migration] = []
    for path in sorted(directory.glob("*.sql")):
        if not _MIGRATION_NAME.match(path.name):
            raise MigrationError(f"{path.name}: migrations are named NNNN_snake_case.sql")
        sql = path.read_text(encoding="utf-8")
        migrations.append(
            Migration(
                version=path.stem,
                path=path,
                sql=sql,
                checksum=hashlib.sha256(sql.encode("utf-8")).hexdigest(),
            )
        )
    versions = [m.version[:4] for m in migrations]
    if len(versions) != len(set(versions)):
        raise MigrationError("two migrations share a number")
    return migrations


def _trusted(sql: str) -> LiteralString:
    # Migration and seed files are repository content reviewed like code, not
    # user input, so running them as literal SQL is the intent.
    return sql


def migrate(url: str, *, seed: bool = True) -> list[str]:
    """Apply pending migrations and the seed files. Returns the versions applied."""
    applied_now: list[str] = []
    # Autocommit, so each `conn.transaction()` below is a real BEGIN/COMMIT and
    # one migration's failure leaves the ones before it applied and recorded.
    with _connect(url) as conn:
        conn.execute(
            "create table if not exists schema_migrations ("
            " version text primary key,"
            " checksum text not null,"
            " applied_at timestamptz not null default now())"
        )
        rows = conn.execute("select version, checksum from schema_migrations").fetchall()
        applied: dict[str, str] = {str(r[0]): str(r[1]) for r in rows}
        for migration in discover():
            recorded = applied.get(migration.version)
            if recorded is not None:
                if recorded != migration.checksum:
                    raise MigrationError(
                        f"{migration.version} was edited after it was applied. "
                        "Migrations are forward-only: add a new one instead."
                    )
                continue
            with conn.transaction():
                conn.execute(_trusted(migration.sql))
                conn.execute(
                    "insert into schema_migrations (version, checksum) values (%s, %s)",
                    (migration.version, migration.checksum),
                )
            applied_now.append(migration.version)
        if seed:
            for seed_file in sorted(SEED_DIR.glob("*.sql")):
                with conn.transaction():
                    conn.execute(_trusted(seed_file.read_text(encoding="utf-8")))
    return applied_now
