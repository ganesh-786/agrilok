# Cleanup audit, 2026-10-01

This audit covers the agrilok checkout, not other projects or computer-wide installations. No cleanup was applied during the audit.

## Findings

- The project has a Next.js student app, FastAPI API, shared Python retrieval and answer pipeline, ingestion, crawling, evaluation, and PostgreSQL infrastructure. All six Python components are workspace members and CI targets.
- Build output, tool caches, incremental compiler state, debug logs, and generated browser-test results are regenerable. `clean-generated.ps1` targets these explicitly.
- `graphify-out/` is an ignored generated repository graph and report. It is optional analysis output, not an application dependency. Removing it discards the saved analysis; opt in with `-IncludeGraphify`.
- There are substantial staged, unstaged, and untracked changes to the student app. Untracked files cannot be treated as junk.

## Keep

| Path | Evidence |
| --- | --- |
| `.local/pgdata/` | `infra/src/agrilok_infra/devdb.py` uses this as the actual development database. |
| `spike/`, including corpus and reports | `services/ingestion/src/ingestion/phase0.py` imports raw PDFs, extracted text, chunks, and saved embeddings. `packages/core/tests/test_support_check_parity.py` compares against the spike implementation and can replay saved reports. ADRs cite spike findings. |
| `data/raw/`, `data/derived/`, golden sets, source registry | Source evidence and pipeline/evaluation inputs; regeneration can require fetching sources and spending embedding quota. |
| `.local/study-design/`, `.local/ui-review/` and review scripts | Saved redesign evidence cited by `docs/ui-redesign-review.md`; usage frequency is unknown. |
| `.venv/`, `node_modules/`, lockfiles | Installed development dependencies and reproducible version records. Removing the environments would require reinstalling to resume development. |
| `.github/`, `.githooks/`, governance files | CI, release checks, push safeguards, and required repository policy files. |

## Source and dependency review

A read-only TypeScript AST import traversal inspected 126 web source/script files. Starting from Next.js route conventions, configuration files, public scripts, scripts, and tests reached 125 files. The sole unreachable candidate was `apps/web/components/ui/Button.tsx`, an untracked reusable component. It is preserved: static unreachability does not establish that a component in ongoing work is unwanted. The traversal detects literal static imports, exports, dynamic imports, and `require`; it is not a complete runtime proof.

Web dependencies are referenced by imports, package scripts, or configuration. Python component membership and CI usage were checked. This audit establishes no package as safely removable; it is not a symbol-by-symbol Python dead-code proof.


## Usage

Stop the web dev server and running checks first. Preview:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\clean-generated.ps1 -WhatIf
```

Apply:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\clean-generated.ps1
```

Optionally add `-IncludeGraphify` to either command. `-ExecutionPolicy Bypass` applies only to this PowerShell process; no persistent execution policy is changed. It is needed here because direct script execution was disabled.

The script checks checkout boundaries, tracked files, and symbolic links/junctions. It reports access-denied or locked paths and does not change permissions or take ownership. The preview ran successfully for accessible artifacts, skipped six inaccessible component `.pytest_cache` directories, and returned an error listing those skips. No deletion was performed.

The web build must be regenerated before `npm run start` after deleting `.next`. Generated test results can include failure traces and screenshots; cleanup discards those diagnostics.
