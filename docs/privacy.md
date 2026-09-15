# Privacy

Written to be read, not to be survived. If anything here is buried, vague or
technically-true-but-misleading, that is a bug - please report it.

> Status: the product does not exist yet, so nothing described here is currently
> collected from anyone. This is the commitment the product will be built to.

## The short version

- We do not put your personal information into the AI model. Ever.
- We collect as little as possible.
- We do not sell anything, and there are no advertising trackers.
- Core study content is free and is never paywalled.

## The AI model and your data

Study answers are generated using Google's Gemini API on its **free tier**.

**This matters and we are not going to bury it:** content sent to the free tier
may be used by Google to improve its products, and may be seen by human
reviewers. That is Google's published policy for that tier, not a rumour.

So the rule is absolute:

> **No personally identifiable information is ever placed in a prompt.**

What goes to the model is the public syllabus text we retrieved plus your study
question. What never goes is your name, email, phone number, location, or
anything that identifies you.

If you type personal details into a question, they would be sent as part of that
question - so please do not. We will design the interface to discourage it, but
we cannot filter what we cannot recognise.

## What we collect

| Data | Why | Notes |
|---|---|---|
| Account identifier (if you create an account) | To save your progress | Only if you choose to create one |
| Study progress - topics seen, questions attempted | Spaced repetition, so review works | Tied to your account, never sent to the model |
| Error reports | To fix crashes | Scrubbed of identifying data |
| Aggregate usage counts | To know whether we can stay within the free tier | Not tied to individuals |

We do not collect: your exam results, your identity documents, your payment
details (there are no payments for core content), or your contacts.

## What we do not do

- No advertising trackers.
- No selling or sharing of personal data.
- No dark patterns to push a paid tier. Core content is free.
- No claiming an answer is verified when no human has checked it.

## Your data, your call

- Use the app without an account where possible.
- Ask for your data, or for your account and its data to be deleted, at
  ganeshchaudhary4400@gmail.com. Deletion means deletion.
- Reading study content does not require an account.

## Processors

| Who | What they handle |
|---|---|
| Google (Gemini API) | Your study question and retrieved public source text - **no personal data** |
| Supabase | Account and progress data, if you create an account |
| Sentry | Error reports, scrubbed |
| Hosting providers | Standard request logs |

## Children

Not directed at children. Loksewa aspirants are adults.

## Changes

Material changes will be recorded in [CHANGELOG.md](../CHANGELOG.md) rather than
quietly swapped in. Contact: ganeshchaudhary4400@gmail.com.

## For contributors

This is not only a user-facing promise - it is a build rule:

- Never add personal data to a prompt, a log line, a test fixture, or an error
  report.
- Never log a full question body together with an account identifier.
- Treat any change that widens data collection as needing explicit discussion in
  its own issue, not a line in a larger PR.
