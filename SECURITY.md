# Security Policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through either channel:

1. **GitHub Security Advisories** — [Report a vulnerability](https://github.com/ganesh-786/agrilok/security/advisories/new)
   (preferred; keeps the discussion attached to the repo and private).
2. **Email** — ganeshchaudhary4400@gmail.com with `[SECURITY]` in the subject.

Please include: what you found, how to reproduce it, what an attacker could do
with it, and any suggested fix. If you have a proof of concept, describe it
rather than running it against live infrastructure.

**Response targets** (best-effort; this is a volunteer project):

| Stage | Target |
|---|---|
| Acknowledgement | 72 hours |
| Initial assessment | 7 days |
| Fix or mitigation for a confirmed high-severity issue | 30 days |

We will credit you in the advisory unless you prefer otherwise. We do not run a
paid bounty programme.

## Supported versions

The project is pre-release (Phase 0). Only `main` is supported. Once tagged
releases exist, this table will list the supported ones.

## Scope

**In scope**

- This repository's source code, workflows and configuration.
- The deployed web app and API, once they exist.
- Exposure of secrets, student data, or the admin/review surface.
- Prompt injection reaching the model through crawled content or user input.
- Anything that lets unreviewed content be presented to students as verified.

**Out of scope**

- Vulnerabilities in the Government of Nepal's websites. Report those to the
  site operator, not to us. Do not test against them.
- Denial of service achieved by exhausting our free-tier API quota. We know the
  quota is finite; that is a capacity problem, documented in
  [ADR-0004](docs/adr/0004-cache-first-serving.md). Report it if you find a way
  to burn it *disproportionately* (an amplification bug), not merely by
  sending many requests.
- Findings from automated scanners with no demonstrated impact.
- Social engineering of maintainers or contributors.

## Threat model

The risks this project actually carries, in priority order:

### 1. Wrong content presented as verified

The highest-impact failure is not a breach — it is a student memorising a wrong
fact from something labelled "verified" and losing an exam cycle. Treat any
path that lets unreviewed, tampered or misextracted content reach the
`verified` state as a **security** issue, not merely a data-quality one.

Controls: mandatory human review before verification, confidence-scored
extraction, provenance (source URL + fetch date + checksum) on every chunk,
visible state labels, golden-set faithfulness monitoring.

### 2. Indirect prompt injection via crawled content

The system feeds crawled documents into a model's context. Text inside those
documents that reads as an instruction must never be followed. The risk is low
on government PSC domains today and rises the moment the whitelist is widened.

Controls: retrieved text is fenced and labelled as untrusted reference data,
never as instructions ([ADR-0005](docs/adr/0005-untrusted-retrieved-context.md));
the whitelist is closed, owned by a named person, and limited to official
domains; model output is treated as text to display, never as a command to run.

### 3. Secret exposure

A leaked Gemini key or Supabase service-role key is a direct compromise.

Controls: `.env` and `.env.*` are gitignored and never read by tooling; keys are server-side only and never reach `apps/web` client
bundles; secrets live in GitHub Actions secrets for CI; Sentry is configured to
scrub.

### 4. Student data in third-party models

Free-tier Gemini content may be used by the provider to improve its products
and may be reviewed by humans.

Control: personally identifiable data is never placed in a prompt. This is a
hard rule in [CONTRIBUTING.md](CONTRIBUTING.md) and stated plainly in
[docs/privacy.md](docs/privacy.md) rather than buried.

### 5. Supply chain

Controls: Dependabot on all ecosystems, lockfiles committed, CodeQL on `main`
and PRs, GitHub Actions pinned and least-privilege by default.

## Secret handling

If you believe a secret has been committed:

1. **Rotate it first.** Revoke the key at the provider before anything else —
   git history removal is slower and less important than invalidation.
2. Report it privately per the process above.
3. Do not rewrite public history without coordinating with the maintainer.

## Responsible testing

Please do not test against the Government of Nepal's websites, against
production student data, or in any way that degrades service for someone
studying for an exam. A local deployment is always the right place to prove a
finding.
