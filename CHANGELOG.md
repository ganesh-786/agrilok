# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Because this project ships study content as well as code, changes are recorded
in two groups where relevant:

- **Code** for application, pipeline and tooling changes.
- **Content & sources** for additions or corrections to study material, the
  source whitelist, or the golden set. A corrected fact is a user-visible change
  and belongs here.

## [Unreleased]

### Added
- Repository scaffolding: monorepo layout, dual licensing (MIT for code,
  CC BY-SA 4.0 for content), NOTICE covering government source material.
- Contributor governance: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT.
- GitHub templates for pull requests and for bug, feature, content-error and
  source-request issues; CODEOWNERS; Dependabot.
- CI workflow skeleton, CodeQL analysis, scheduled-crawl workflow scaffold, and
  a golden-set evaluation workflow scaffold.
- Architecture decision records 0001 to 0006 covering the foundational choices.
- Git workflow rules: no pushes to `main`, no AI or tool attribution in commits
  or pull requests, and a fixed four-section pull request format.
- `.githooks/` with `pre-push` and `commit-msg` hooks enforcing those rules
  locally. Enable with `git config core.hooksPath .githooks`.

### Notes
- No application code yet. The project is at Phase 0 (validation spike) and the
  go/no-go gate in [docs/roadmap.md](docs/roadmap.md) has not been cleared.

[Unreleased]: https://github.com/ganesh-786/agrilok/commits/main
