# scripts

Developer and operations scripts. Small, single-purpose, and runnable from the
repository root.

| Script | Purpose |
|---|---|
| [`check-licenses.sh`](check-licenses.sh) | Regenerate dependency license info and flag copyleft licenses. Run before a release and on any `needs-license-check` PR. |

## Conventions

- `#!/usr/bin/env bash` and `set -euo pipefail`.
- `cd` to the repository root at the top so the script works from anywhere.
- Say what the script does, and **why it exists**, in a header comment. Several
  of this project's constraints are non-obvious.
- Exit non-zero on failure, and print something useful when the tooling a script
  needs is not installed rather than failing cryptically.
- Never hardcode a secret. Read from the environment, and fail with a clear
  message when a required variable is missing.
- Keep them cross-platform where practical. Contributors are on Windows and
  Linux; `.gitattributes` keeps `*.sh` at LF.

## What does not belong here

- Anything that crawls live government sites without an explicit, deliberate
  invocation. See [crawl-policy.md](../docs/crawl-policy.md).
- One-off migrations. Those go in `infra/migrations/`.
- Anything that publishes content without passing the review queue.
