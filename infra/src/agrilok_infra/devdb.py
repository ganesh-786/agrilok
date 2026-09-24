"""A local PostgreSQL + pgvector server for development, with no Docker and no admin rights.

Uses the binaries bundled in the `pgembed` wheel. Data lives in `.local/pgdata`
at the repository root (gitignored). The server listens on 127.0.0.1 only,
with trust authentication, which is acceptable for a developer machine and
nothing else: never point this at a network interface.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import psycopg
from psycopg import sql

from agrilok_infra.paths import LOCAL_DATABASE, LOCAL_DIR, LOCAL_PORT, LOCAL_URL

DATA_DIR = LOCAL_DIR / "pgdata"
LOG_FILE = LOCAL_DIR / "postgres.log"


class DevDatabaseError(RuntimeError):
    pass


def _bin_dir() -> Path:
    try:
        import pgembed
    except ImportError as exc:
        raise DevDatabaseError(
            "The local database needs the optional 'local' extra: "
            "uv sync --all-packages --all-extras"
        ) from exc
    # The wheel ships its binaries next to the package. Located by path rather
    # than a private attribute so a pgembed upgrade fails here, loudly.
    candidate = Path(pgembed.__file__).resolve().parent / "pginstall" / "bin"
    if not candidate.is_dir():
        raise DevDatabaseError(f"pgembed binaries not found at {candidate}")
    return candidate


def _exe(name: str) -> str:
    suffix = ".exe" if sys.platform == "win32" else ""
    return str(_bin_dir() / f"{name}{suffix}")


def _run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=False)  # noqa: S603


def is_initialised() -> bool:
    return (DATA_DIR / "PG_VERSION").is_file()


def is_running() -> bool:
    if not is_initialised():
        return False
    result = _run([_exe("pg_ctl"), "-D", str(DATA_DIR), "status"])
    return result.returncode == 0


def initialise() -> None:
    LOCAL_DIR.mkdir(exist_ok=True)
    result = _run(
        [
            _exe("initdb"),
            "-D",
            str(DATA_DIR),
            "-U",
            "postgres",
            "--auth=trust",
            "-E",
            "UTF8",
            "--locale=C",
        ]
    )
    if result.returncode != 0:
        raise DevDatabaseError(f"initdb failed:\n{result.stderr}")


def start() -> str:
    """Start the server if needed, make sure the database exists, return its URL."""
    if not is_initialised():
        initialise()
    if not is_running():
        # Output goes to the log file, never to a pipe: on Windows the server
        # inherits pipe handles from pg_ctl, and capturing its output would
        # block until the server exits.
        flags = subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        result = subprocess.run(  # noqa: S603
            [
                _exe("pg_ctl"),
                "-D",
                str(DATA_DIR),
                "-l",
                str(LOG_FILE),
                "-w",
                "-t",
                "60",
                "-o",
                f"-p {LOCAL_PORT} -h 127.0.0.1",
                "start",
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=flags,
            check=False,
        )
        if result.returncode != 0:
            raise DevDatabaseError(f"pg_ctl start failed; see {LOG_FILE}")
    _ensure_database()
    return LOCAL_URL


def _ensure_database() -> None:
    admin_url = f"postgresql://postgres@127.0.0.1:{LOCAL_PORT}/postgres"
    deadline = time.monotonic() + 30
    while True:
        try:
            with psycopg.connect(admin_url, autocommit=True) as conn:
                exists = conn.execute(
                    "select 1 from pg_database where datname = %s", (LOCAL_DATABASE,)
                ).fetchone()
                if not exists:
                    conn.execute(
                        sql.SQL("create database {}").format(sql.Identifier(LOCAL_DATABASE))
                    )
            return
        except psycopg.OperationalError:
            if time.monotonic() > deadline:
                raise
            time.sleep(0.5)


def stop() -> None:
    if is_running():
        result = _run([_exe("pg_ctl"), "-D", str(DATA_DIR), "-w", "-m", "fast", "stop"])
        if result.returncode != 0:
            raise DevDatabaseError(f"pg_ctl stop failed:\n{result.stderr}")
