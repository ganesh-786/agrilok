"""Locations inside the repository, and the database URL to use."""

from __future__ import annotations

import os
from pathlib import Path

# infra/src/agrilok_infra/paths.py -> repository root is four levels up.
REPO_ROOT = Path(__file__).resolve().parents[3]
_PACKAGE_DIR = Path(__file__).resolve().parent


def _bundled_or_repo(name: str) -> Path:
    # A built wheel carries the SQL inside the package (see pyproject.toml,
    # force-include), because an installed package cannot see the repository.
    # A development checkout reads it from infra/ directly.
    bundled = _PACKAGE_DIR / name
    return bundled if bundled.is_dir() else REPO_ROOT / "infra" / name


MIGRATIONS_DIR = _bundled_or_repo("migrations")
SEED_DIR = _bundled_or_repo("seed")
LOCAL_DIR = REPO_ROOT / ".local"

LOCAL_PORT = 54329
LOCAL_DATABASE = "agrilok"
LOCAL_URL = f"postgresql://postgres@127.0.0.1:{LOCAL_PORT}/{LOCAL_DATABASE}"


def database_url() -> str:
    """DATABASE_URL from the environment, then the repository .env, then the local default.

    Only the DATABASE_URL line of .env is read. Nothing from it is printed.
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    env_file = REPO_ROOT / ".env"
    if env_file.is_file():
        for raw in env_file.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("DATABASE_URL="):
                value = line.split("=", 1)[1].split(" #", 1)[0].strip().strip('"').strip("'")
                if value:
                    return value
    return LOCAL_URL
