# .githooks

Local enforcement of the rules in
[docs/git-workflow.md](../docs/git-workflow.md).
Documentation is advisory. These hooks are not.

## Enable them

Once per clone:

```bash
git config core.hooksPath .githooks
```

Git does not do this for you, and it does not travel with the repository, so
every contributor runs it themselves.

## What they do

| Hook | Blocks |
|---|---|
| `pre-push` | Any push whose target branch is `main` |
| `commit-msg` | AI or tool attribution in the message, and long dashes used as punctuation |

`commit-msg` allows `--force` and other flags inside a message. It rejects a
spaced ` -- `, an en dash and an em dash, because those are the ones that show up
in prose.

## If a hook is wrong

Fix the hook, in a PR, with a reason. Do not reach for `--no-verify`. A hook that
gets bypassed routinely is worse than no hook, because it stops being a signal.
