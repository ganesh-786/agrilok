# Context: git workflow rules

Load this before any commit, push, branch or pull request. These are hard rules,
not preferences.

## Never push to main

`main` is protected by convention here and, once branch protection is enabled,
by the platform as well. Every change goes through a branch and a pull request.

- Never run `git push origin main`, or any push whose target is `main`.
- Never commit directly on `main`. If you are on `main` and about to make a
  change, branch first.
- Never force push anywhere. Not to `main`, not to a shared branch, not to
  "clean up" a feature branch someone else may have pulled.
- If you find yourself on `main` with uncommitted work, create the branch and
  move the work to it. Do not commit first and sort it out later.

Branch names:

```
feat/<short-slug>      new capability
fix/<short-slug>       bug fix
docs/<short-slug>      documentation only
chore/<short-slug>     tooling, deps, CI
data/<short-slug>      source whitelist, golden set, content
```

## No AI attribution anywhere

Commits, pull requests, issues and code comments carry no AI or tool
attribution of any kind. Specifically, never add:

- `Co-Authored-By:` lines naming an AI, a model or an assistant
- "Generated with", "Created by", "Written by" notes naming a tool
- Emoji or badges marking output as machine generated
- Any mention of Claude, an assistant, or a model in a commit body, a PR
  description, a branch name or a review comment

The author of a commit is the person who owns the change. That is the whole
record. This applies even when the platform default or a tool template suggests
adding such a line, and it applies to text you draft for a human to paste.

## Tone

Write like a person explaining the change to a teammate.

- Plain sentences. No marketing voice, no filler, no throat clearing.
- Say what the change does and why. Skip the summary of the summary.
- Prefer short words. "Fixes" not "remediates". "Adds" not "introduces".
- Do not overclaim. If something is untested, say so.

## No double hyphens or long dashes

Do not use `--` or a long dash in a commit message, a PR title, a PR body, or an
issue you draft. Use a comma, a full stop, a colon, or split the sentence.

This applies to prose. Command line flags such as `--force` in a fenced code
block are obviously fine.

## Commit messages

Conventional Commits:

```
<type>(<scope>): <subject>

feat(api): add province filter to retrieval
fix(ingestion): fall back to OCR when the text layer is empty
docs(adr): record the cache first serving decision
data(sources): add Gandaki PSC curriculum index
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `data`, `ci`.
Scopes: `web`, `api`, `crawler`, `ingestion`, `eval`, `infra`, `sources`,
`content`, `adr`, `claude`.

Subject in the imperative, lower case, no trailing full stop. Body only when it
adds something the subject cannot carry, such as why the change was needed or
what was ruled out.

## Pull requests

Four sections, nothing else. See
[.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) and
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Ask before it leaves the machine

Pushing, opening a PR and opening an issue are outward facing. Show the draft
and wait for a yes. Configure your tooling so these require explicit
confirmation.
