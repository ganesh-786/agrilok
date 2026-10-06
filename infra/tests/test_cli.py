"""agrilok-db ends cleanly when it is interrupted or cannot reach the database.

None of these need a running Postgres. Each one is a way the command used to
end in a traceback, which scripts/dev.mjs then reported as "Migrations
failed", whatever had actually happened.
"""

from __future__ import annotations

import socket
import subprocess
import sys
import time
from collections.abc import Iterator

import psycopg
import pytest

from agrilok_infra import cli
from agrilok_infra import migrate as migrate_module

PASSWORD = "hunter2-not-a-real-password"  # noqa: S105


# Run in a fresh interpreter, because the point is what happens before main()
# is reached: the interrupt arrives while the command is still importing the
# database driver, which is where the reported failure landed.
_INTERRUPTED_WHILE_IMPORTING_THE_DRIVER = """
import sys


class CtrlC:
    def find_spec(self, fullname, path, target=None):
        if fullname == "psycopg":
            raise KeyboardInterrupt
        return None


sys.meta_path.insert(0, CtrlC())
from agrilok_infra.cli import main

raise SystemExit(main(["migrate", "--url", "postgresql://nobody@127.0.0.1:1/none"]))
"""


def _main(argv: list[str]) -> int:
    try:
        return cli.main(argv)
    except KeyboardInterrupt:
        # Without this a regression would abort the whole test session.
        pytest.fail("the interrupt escaped main() as a traceback")


@pytest.fixture
def closed_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port: int = probe.getsockname()[1]
    return port


@pytest.fixture
def silent_port() -> Iterator[int]:
    """A server that accepts the connection and then never says anything."""
    with socket.socket() as server:
        server.bind(("127.0.0.1", 0))
        server.listen(4)
        yield server.getsockname()[1]


def test_ctrl_c_while_the_driver_loads_is_one_line_and_status_130() -> None:
    result = subprocess.run(  # noqa: S603
        [sys.executable, "-c", _INTERRUPTED_WHILE_IMPORTING_THE_DRIVER],
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )

    assert result.returncode == cli.EXIT_INTERRUPTED == 130
    assert result.stderr.startswith("Stopped.")
    assert "Traceback" not in result.stderr


def test_ctrl_c_during_a_migration_is_one_line_and_status_130(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def interrupted(url: str, *, seed: bool = True) -> list[str]:
        raise KeyboardInterrupt

    monkeypatch.setattr(migrate_module, "migrate", interrupted)

    status = _main(["migrate", "--url", "postgresql://nobody@127.0.0.1:1/none"])

    captured = capsys.readouterr()
    assert status == 130
    assert "rolled back" in captured.err
    assert "Traceback" not in captured.err


def test_an_unreachable_database_is_an_error_message_not_a_traceback(
    closed_port: int, capsys: pytest.CaptureFixture[str]
) -> None:
    url = f"postgresql://someone:{PASSWORD}@127.0.0.1:{closed_port}/none?connect_timeout=2"

    status = cli.main(["migrate", "--url", url])

    captured = capsys.readouterr()
    assert status == 1
    assert f"could not connect to the database at 127.0.0.1:{closed_port}" in captured.err
    assert "Nothing was applied" in captured.err
    assert "Traceback" not in captured.err
    assert PASSWORD not in captured.err
    assert PASSWORD not in captured.out


def test_a_database_that_never_answers_is_given_up_on(
    silent_port: int, capsys: pytest.CaptureFixture[str]
) -> None:
    # Two seconds is the shortest wait the driver allows.
    url = f"postgresql://someone@127.0.0.1:{silent_port}/none?connect_timeout=2"

    started = time.monotonic()
    status = cli.main(["migrate", "--url", url])
    elapsed = time.monotonic() - started

    assert status == 1
    assert "could not connect" in capsys.readouterr().err
    assert elapsed < 10


def test_a_malformed_url_is_an_error_that_does_not_repeat_the_url(
    capsys: pytest.CaptureFixture[str],
) -> None:
    # No scheme, so the driver would quote the whole string, password included.
    status = cli.main(["migrate", "--url", f"someone:{PASSWORD}@db.example/none"])

    captured = capsys.readouterr()
    assert status == 1
    assert "not a valid PostgreSQL connection string" in captured.err
    assert PASSWORD not in captured.err


@pytest.mark.parametrize(
    ("url", "env_timeout", "expected"),
    [
        ("postgresql://u@db.example/d", None, migrate_module.CONNECT_TIMEOUT_SECONDS),
        ("postgresql://u@db.example/d?connect_timeout=40", None, None),
        ("postgresql://u@db.example/d", "40", None),
    ],
)
def test_the_default_wait_applies_only_when_the_developer_chose_none(
    monkeypatch: pytest.MonkeyPatch, url: str, env_timeout: str | None, expected: int | None
) -> None:
    passed: dict[str, object] = {}

    def fake_connect(conninfo: str, **kwargs: object) -> None:
        passed.update(kwargs)
        raise psycopg.OperationalError("stopped here, before any network use")

    monkeypatch.setattr(psycopg, "connect", fake_connect)
    if env_timeout is None:
        monkeypatch.delenv("PGCONNECT_TIMEOUT", raising=False)
    else:
        monkeypatch.setenv("PGCONNECT_TIMEOUT", env_timeout)

    with pytest.raises(migrate_module.DatabaseUnreachableError):
        migrate_module.migrate(url)

    assert passed.get("connect_timeout") == expected
