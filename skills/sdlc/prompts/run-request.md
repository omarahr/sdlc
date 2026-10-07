# The run's merge request (`mr` mode)

In `mr` mode the slices are committed to the working branch (`config.defaultBranch`) exactly as in `direct` mode, and the whole run is delivered as **one** merge request (or pull request) from that branch into `config.targetBranch`. A human reviews and merges it; you never merge it.

Read `forge`, `defaultBranch`, `targetBranch`, `runRequest` and `commitFormat` from `.sdlc/config.json`.

Publishing is best effort. A problem here never changes the result of the slice, which is already committed on the working branch: fix what you can, append a `note` line to log.jsonl for what you cannot (`"run MR: <what went wrong>"`), and carry on.

## Commands by forge
| Step | `gitlab` | `github` |
|---|---|---|
| Find the open request | `glab mr list --source-branch <defaultBranch> -F json` | `gh pr list --head <defaultBranch> --state open --json number,url` |
| Create it as a draft | `glab mr create --source-branch <defaultBranch> --target-branch <targetBranch> --title "<title>" --description-file <file> --draft --yes` | `gh pr create --head <defaultBranch> --base <targetBranch> --title "<title>" --body-file <file> --draft` |
| Update its description | `glab mr update <n> --description-file <file>` | `gh pr edit <n> --body-file <file>` |
| Wait for the pipeline | `glab ci status --branch <defaultBranch> --wait` | `gh pr checks <n> --watch` |
| Read a failed job | `glab ci trace <job>` | `gh run view <run> --log-failed` |
| Mark it ready | `glab mr update <n> --ready` | `gh pr ready <n>` |

Flags differ between CLI versions. If one is refused, read the command's `--help` and use the equivalent.

## Publish (integrator, after the slice is committed on the working branch)
1. **Push:** `git push -u origin <defaultBranch>`. Never force-push it.
   - If the remote has commits you do not have, `git pull --no-rebase origin <defaultBranch>`, run `config.commands.test` again, and push.
   - If a push rule rejects a commit message, do not rewrite history: note the rule's message and stop publishing for this slice.
2. **Find or create the request.**
   - If `runRequest.url` is set, or an open request for the branch exists, use it. Otherwise create it as a draft.
   - The title names the spec (its first heading), in `commitFormat` when that is set.
   - The description is written to a temp file and regenerated every time: the spec path, requirements done and total, one line per finished slice (id, title, commit), parked slices with the reason, the count of ADRs in DECISIONS.md, and where the slice reports are (`.sdlc/reports/<id>/REPORT.md`). End it with a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
   - When you created it, set `runRequest: {"url": "<url>", "number": <n>}` in config.json, do a default-branch commit (commit-state.md) with "run merge request", and push.
3. **Pipeline:** wait for the pipeline of the commit you pushed, in the background as "Long commands" in _common.md says.
   - No pipeline: note "no pipeline on the run MR" once, and continue.
   - Still running after about 60 minutes: note it and continue; the next slice's integrator sees the result.
   - Failed: read the failed job's log, fix it on the working branch (you may edit product code for CI-only failures), run the local `config.commands.test`, commit `fix(<id>): CI <what>`, push, and wait again. Allow up to 3 fix cycles. A job that passes when retried once counts as flaky: add a seed `{title: "flaky: <job>", ...}`.
   - Still red after 3 cycles: note "run MR: pipeline red: <job> — <first error>".

## Finish (the `/sdlc` driver, when the run is done)
Push the working branch, update the description one last time, and mark the request ready for review.
