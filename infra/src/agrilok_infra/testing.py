"""Throwaway, fully migrated databases for tests.

Tests that need Postgres create their own database, migrate it, and drop it
afterwards, so they never touch the development database or each other.

The server comes from AGRILOK_TEST_DATABASE_URL (a URL to any database on a
server where the user may create databases; CI sets it to a pgvector service
container). Without it, the local development server on port 54329 is used if
it is running. If neither is reachable, callers should skip.
"""

from __future__ import annotations

import os
import secrets
from collections.abc import Iterator
from contextlib import contextmanager
from urllib.parse import urlsplit, urlunsplit

import psycopg
from psycopg import sql

from agrilok_infra.migrate import migrate
from agrilok_infra.paths import LOCAL_PORT

ENV_VAR = "AGRILOK_TEST_DATABASE_URL"
_LOCAL_ADMIN = f"postgresql://postgres@127.0.0.1:{LOCAL_PORT}/postgres"


def admin_url() -> str | None:
    """A reachable server to create test databases on, or None."""
    candidates = [os.environ[ENV_VAR]] if os.environ.get(ENV_VAR) else [_LOCAL_ADMIN]
    for url in candidates:
        try:
            with psycopg.connect(url, connect_timeout=3):
                return url
        except psycopg.OperationalError:
            continue
    return None


def _with_database(url: str, database: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{database}", parts.query, parts.fragment))


@contextmanager
def temporary_database(server_url: str) -> Iterator[str]:
    name = f"agrilok_test_{secrets.token_hex(6)}"
    with psycopg.connect(server_url, autocommit=True) as conn:
        conn.execute(sql.SQL("create database {}").format(sql.Identifier(name)))
    url = _with_database(server_url, name)
    try:
        migrate(url)
        yield url
    finally:
        with psycopg.connect(server_url, autocommit=True) as conn:
            conn.execute(
                sql.SQL("drop database if exists {} with (force)").format(sql.Identifier(name))
            )
