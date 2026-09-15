#!/usr/bin/env bash
#
# Regenerate and check third-party dependency licenses.
#
# NOTICE lists dependency licenses as a convenience, but the lockfiles are
# authoritative. Run this before any release, and whenever a dependency PR
# carries the `needs-license-check` label.
#
# Flags copyleft licenses loudly. PyMuPDF in particular is AGPL-3.0: linking it
# into a network-served backend can oblige this project to offer that backend's
# complete corresponding source under the AGPL. agrilok is open source, so that
# is survivable - but it is a real constraint on anyone forking it privately,
# and it should never arrive by surprise. See NOTICE and
# docs/adr/0002-text-layer-before-ocr.md.
#
# Usage: scripts/check-licenses.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# Licenses that must be a deliberate choice, never an accident.
COPYLEFT_PATTERN='AGPL|GPL-3|GPLv3|GPL-2|GPLv2|SSPL|BUSL|Commons Clause'

found_any=0
flagged=0

echo "=== Python components ==="
if command -v pip-licenses >/dev/null 2>&1; then
  for component in apps/api services/crawler services/ingestion services/evaluation; do
    [ -f "$component/pyproject.toml" ] || continue
    found_any=1
    echo ""
    echo "--- $component ---"
    ( cd "$component" && pip-licenses --format=markdown --with-urls ) || true
  done
else
  echo "pip-licenses not installed. Install it with:"
  echo "    pip install pip-licenses"
fi

echo ""
echo "=== Node components ==="
if [ -f apps/web/package.json ]; then
  found_any=1
  if command -v license-checker >/dev/null 2>&1; then
    ( cd apps/web && license-checker --summary ) || true
  else
    echo "license-checker not installed. Install it with:"
    echo "    npm install -g license-checker"
  fi
else
  echo "apps/web has no package.json yet."
fi

if [ "$found_any" -eq 0 ]; then
  echo ""
  echo "No dependency manifests found yet - the project is at Phase 0."
  echo "Nothing to check. Re-run once components have dependencies."
  exit 0
fi

echo ""
echo "=== Copyleft check ==="
# Re-run the collectors and grep their output rather than trusting NOTICE.
{
  if command -v pip-licenses >/dev/null 2>&1; then
    for component in apps/api services/crawler services/ingestion services/evaluation; do
      [ -f "$component/pyproject.toml" ] || continue
      ( cd "$component" && pip-licenses --format=plain ) || true
    done
  fi
  if [ -f apps/web/package.json ] && command -v license-checker >/dev/null 2>&1; then
    ( cd apps/web && license-checker --csv ) || true
  fi
} | { grep -Ei "$COPYLEFT_PATTERN" || true; } | sort -u | while read -r line; do
  echo "  FLAGGED: $line"
  flagged=1
done

echo ""
echo "Review anything flagged above against NOTICE."
echo "A copyleft dependency is allowed only as a deliberate, documented choice."
