"""agrilok-db: run migrations, and start or stop the local development database.

agrilok-db start      start the local Postgres + pgvector (development only)
agrilok-db stop       stop it
agrilok-db status     is it running, and where
agrilok-db migrate    apply migrations and reference data to DATABASE_URL
"""

from __future__ import annotations

import argparse
import sys

from agrilok_infra.paths import LOCAL_URL, database_url

# What a command stopped by Ctrl+C exits with: 128 + SIGINT, the shell
# convention. scripts/dev.mjs reads it as "stopped by you", not "failed".
EXIT_INTERRUPTED = 130


def _redacted(url: str) -> str:
    # Never print a password, even to the developer's own terminal: terminal
    # output ends up in screenshots, issues and CI logs.
    if "@" not in url or "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    credentials, host = rest.split("@", 1)
    user = credentials.split(":", 1)[0]
    return f"{scheme}://{user}:***@{host}" if ":" in credentials else url


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="agrilok-db", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("start", help="start the local development database")
    sub.add_parser("stop", help="stop the local development database")
    sub.add_parser("status", help="show whether the local database is running")
    mig = sub.add_parser("migrate", help="apply migrations and reference data")
    mig.add_argument("--url", help="database URL (default: DATABASE_URL, then .env)")
    mig.add_argument("--no-seed", action="store_true", help="skip reference data")
    args = parser.parse_args(argv)

    try:
        return _run(args)
    except KeyboardInterrupt:
        # One line, not a traceback. A traceback through the database driver
        # reads like a broken install when all that happened was Ctrl+C.
        if args.command == "migrate":
            # Each migration is one transaction, so this holds wherever the
            # interrupt landed, including before the connection was made.
            print(
                "Stopped. Migrations that had finished stay applied; "
                "one that was still running was rolled back.",
                file=sys.stderr,
            )
        else:
            print("Stopped.", file=sys.stderr)
        return EXIT_INTERRUPTED


def _run(args: argparse.Namespace) -> int:
    # Imported here, not at the top of the file: loading the database driver
    # is the slowest part of starting up, and a Ctrl+C that lands during it
    # has to reach the handler in main() like any other.
    from agrilok_infra import devdb
    from agrilok_infra.migrate import MigrationError, migrate

    try:
        if args.command == "start":
            url = devdb.start()
            print(f"Local database running: {url}")
            print("Set DATABASE_URL to that value in .env, then run: agrilok-db migrate")
        elif args.command == "stop":
            devdb.stop()
            print("Local database stopped.")
        elif args.command == "status":
            running = devdb.is_running()
            print(f"Local database: {'running at ' + LOCAL_URL if running else 'not running'}")
        elif args.command == "migrate":
            url = args.url or database_url()
            applied = migrate(url, seed=not args.no_seed)
            target = _redacted(url)
            if applied:
                print(f"Applied {len(applied)} migration(s) to {target}: {', '.join(applied)}")
            else:
                print(f"No pending migrations on {target}.")
            if not args.no_seed:
                print("Reference data is up to date.")
    except (devdb.DevDatabaseError, MigrationError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
