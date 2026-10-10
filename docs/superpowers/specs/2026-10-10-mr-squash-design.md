# MR squash: one commit for the run before the merge request is ready

Date: 2026-10-10
Status: approved design, implementation pending

## Intent

In `mr` mode the run commits every slice onto the working branch, pushes after each slice, and keeps one draft merge request open for the whole run. When the loop returns `done`, the driver pushes the branch, updates the description and marks the request ready. The request then carries every commit the run made: one squash commit per slice, one `chore(sdlc): commit sha` per slice, CI fixes, bootstrap and audit state. A reviewer of a ten-slice run sees twenty or more commits for one spec.

The plugin's owner wants the run's commits squashed into one commit before the merge request is ready for review.

**What the user asked for** (resolved in conversation): "all the run commits need to be squashed before creating the final MR."

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| When the squash happens | At Finish, after the loop returns `done`. The per-slice pushes, the draft request and its pipeline feedback stay as they are |
| How the squash reaches the remote | One force-push with lease of the working branch, at Finish only |
| Which commits are folded | Every commit after the working branch's tip at bootstrap: slice commits, state commits, CI fixes. Commits made before the run stay as they are |
| Who performs it | The `/sdlc` driver, through a new script `run-squash.py` |
| What a failed squash does | Nothing to the run's result. The driver notes why, pushes the branch as it is, and marks the request ready |
| The other modes | Unchanged |

**Assumptions:**

- The remote lets the working branch be force-pushed. A feature branch normally is. A branch that a push rule protects rejects the force-push, and the fallback applies.
- The tree of the squash commit is the tree of the last pushed tip. A pipeline that passed on that tip passes on the squash commit, unless it is flaky.
- The owner's checkout holds the working branch. The run never checks it out and never advances its local ref when there is a remote, as today. After Finish the owner catches up with a reset, not a pull.

### Non-goals

- Squashing in `pr`, `direct` or `stack` mode. `pr` and `stack` already squash-merge per slice or per milestone. `direct` has no request to tidy.
- Folding the owner's own commits. Only what the run committed is folded.
- Rewriting the per-slice shas recorded in `requirements.json` `evidence.commit` and in the slice reports. They name commits that the squash removes from the branch. The squash commit's body keeps the mapping.
- Keeping the branch at one commit during the run. The branch is rewritten once, at Finish.
- A second commit after the squash. Finish writes no state after the squash, so the branch holds exactly one run commit.

## Design

### 1. `runStart` in `config.json` (`env-detector.md`, `state-schema.md`)

A new field, `runStart`. In `mr` mode it is the sha of the working branch's tip before the run's first commit. In every other mode it is `""`.

The env-detector writes it on the first run: `git rev-parse HEAD` in the run worktree, before any `.sdlc/` commit. The worktree was cut from the working branch, so that sha is the working branch's tip. On a resume the env-detector keeps the existing value, the way it keeps `runRequest`.

`state-schema.md` documents the field beside `runRequest`: "`runStart` is `""` outside `mr` mode. In `mr` mode it is the sha of the working branch's tip when the run began. Finish folds every commit after it into one."

### 2. `run-squash.py`

A new script beside `branches.py`. It owns the git mechanics of the squash and reports what it did. The driver composes the subject and the body; the script does not read the spec or the slices.

```
python3 "<skill>/run-squash.py" --repo <path> --subject "<subject>" --body-file <file>
```

It reads `gitMode`, `defaultBranch` and `runStart` from `.sdlc/config.json`. It prints one JSON object and exits 0 on every outcome it handled, and exits non-zero only when it could not read its inputs:

```json
{ "squashed": true, "pushed": true, "commit": "<sha>", "folded": 14, "before": "<sha>", "notes": "" }
```

Steps:

1. **Preconditions.** `gitMode` is `mr`. `runStart` is set. `git status --porcelain` is empty. The current branch is the run branch. When one fails: `{squashed: false, pushed: false, notes: "<which>"}`.
2. **Fetch the tip.** `git fetch origin <defaultBranch>`. Record `expected = git rev-parse origin/<defaultBranch>`. When the fetch fails: `{squashed: false, pushed: false, notes}`.
3. **Ancestry.** `git merge-base --is-ancestor <runStart> HEAD` must succeed. When it does not, the branch was rewritten during the run: `{squashed: false, pushed: false, notes: "runStart is not an ancestor of HEAD"}`.
4. **Count.** `git rev-list --count <runStart>..HEAD`. When it is 0 or 1 there is nothing to fold: `{squashed: false, pushed: false, folded: <count>, notes: "nothing to squash"}`. One commit after `runStart` is a one-slice run, or a squash that already happened. Both are done.
5. **Squash.** Record `before = git rev-parse HEAD`. `git reset --soft <runStart>`, then `git commit -F <message file>`, where the message is the subject, a blank line and the body file's contents. The tree of the new commit equals the tree of `before`; the script checks `git rev-parse HEAD^{tree}` against `git rev-parse <before>^{tree}` and restores with `git reset --hard <before>` when they differ.
6. **Push.** `git push --force-with-lease=<defaultBranch>:<expected> origin HEAD:<defaultBranch>`. This is the only force-push `mr` mode allows, and it moves only the working branch. On success: `{squashed: true, pushed: true, commit, folded, before}`.
7. **Rejected push.** The remote moved after the fetch, or a rule forbids the force-push. `git reset --hard <before>` puts the run branch back on the pushed history. Return `{squashed: false, pushed: false, before, notes: "<git's message>"}`. The driver falls back to the plain push.

The script never pushes any other branch, never uses `--force` without a lease, and never touches the owner's checkout.

### 3. Finish (`run-request.md`)

The Finish section becomes:

1. **Sync.** `git checkout sdlc/run-<n>`, then `git fetch origin <defaultBranch> && git merge --ff-only origin/<defaultBranch>`. On failure, note "run MR: finish: run branch diverged" and stop at step 5 with the plain push.
2. **Compose the message.** The subject is the request's title: the spec's first heading, in `commitFormat` when that is set. The body, written to a temp file: one line per finished slice as `<id> <title> (<original sha, 7 chars>)`, one line per parked slice with its reason, then `Folds <n> commits after <runStart, 7 chars>.`, a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
3. **Squash.** Run `run-squash.py` as section 2 says. Read its JSON.
4. **Pipeline.** When `pushed` is true, wait for the pipeline of `commit` once, in the background as "Long commands" in `_common.md` says. A red pipeline is noted as "run MR: pipeline red after squash: <job>" and not fixed: the tree is the one the last slice's pipeline passed. No fix cycles.
5. **Publish.** When `pushed` is false, note "run MR: not squashed: <notes>" and `git push -u origin <defaultBranch>` as the Publish step does. Then update the description one last time and mark the request ready, as today. The description gains one line: "History: one commit, squashed at finish" or "History: <n> commits, not squashed: <notes>".
6. **Tell the owner.** Append a `note` line to log.jsonl: "the working branch was rewritten: run `git status` (it must be clean), then `git fetch origin && git reset --hard origin/<defaultBranch>`". The driver repeats that instruction in its final message, beside the request's link.

The Publish section's rule "Never force-push it" gains the clause: "Finish's squash is the one exception, and `run-squash.py` performs it with a lease."

### 4. The driver (`SKILL.md`)

- The `done` bullet says: in `mr` mode, finish the run's merge request as "Finish" in `run-request.md` says: squash the run's commits into one, push, update the description, mark it ready. Give the user its link and the catch-up command. A failure here is reported, never retried in a loop.
- The "Whenever the loop ends" bullet gains, for `mr` mode: when `git rev-parse sdlc/run-<n>` equals `git rev-parse origin/<defaultBranch>`, delete the run branch with `git branch -D sdlc/run-<n>`. The remote holds every commit of it. `-d` would refuse, because the owner's local working branch does not contain the squash commit yet. In every other case the existing `-d` rule and its refusal report apply.

### 5. README

The `--git mr` bullet gains: "When the run is done it squashes the run's commits into one commit, force-pushes the branch with a lease, and marks the merge request ready. Your local branch is behind the rewritten remote: catch up with `git fetch origin && git reset --hard origin/<branch>` on a clean checkout."

## Edge cases

- **A one-slice run.** It commits bootstrap state, the slice and its evidence sha, so the count is above 1 and the squash happens. Count 1 occurs only when Finish runs twice: the second run finds the squash commit and does nothing. Finish is idempotent.
- **A human pushed a commit to the working branch during the run.** The integrator's Publish step pulled it in with `--no-rebase`, so it sits after `runStart` and is folded. Its subject is not in the body's slice list; the `Folds <n> commits` line is the only trace. The alternative, refusing to squash when a foreign author appears, hides the owner's own fixes behind a note. The fold is the simpler rule, and the request's history before Finish is in the forge's activity log.
- **A human rebased or reset the working branch during the run.** `runStart` is no longer an ancestor. The script skips, the driver pushes as it is and notes why. Nothing is lost.
- **The lease fails.** Someone pushed between the fetch and the push. The script restores `before` and the driver falls back to the plain push, which then needs the same `git pull --no-rebase` the Publish step uses. The request is marked ready with the unsquashed history and a note.
- **The push rule rejects the squash commit's subject.** The subject is the request's title in `commitFormat`, the same format every slice commit passed. A rejection is reported like any other push failure: restore, plain push, note.
- **A resume after `done`.** The run worktree is removed at loop end. A later `/sdlc <spec>` on the same branch starts a new run with a new `runStart`, which is the squash commit. The earlier squash commit is a pre-run commit for the new run and stays.
- **`direct`, `pr`, `stack`.** `runStart` is `""`. The script's first precondition fails. The driver never calls it in those modes.
- **No remote.** `mr` mode needs a forge, so there is no `mr` run without a remote. The script's fetch precondition covers a remote that disappeared: it skips.

## Testing

In `skills/sdlc/test/scripts.test.mjs`, with the file's `fixture({ remote: true })` and a config in `mr` mode:

- Three commits after `runStart` on the run branch, pushed, then the script: the branch has one commit after `runStart`, its tree equals the old tip's tree, the remote's working branch is at that commit, and the JSON says `squashed: true, pushed: true, folded: 3`.
- Two commits before `runStart` and three after: the two stay, the three fold.
- The bare remote carries a `pre-receive` hook that rejects every push: the push is rejected, the branch is back on `before`, the remote's working branch is unchanged, and the JSON says `squashed: false, pushed: false` with the hook's message in `notes`.
- One commit after `runStart`: `squashed: false, notes: "nothing to squash"`, the branch is unchanged.
- `runStart` not an ancestor of HEAD: `squashed: false`, the branch is unchanged.
- A dirty worktree, a mode other than `mr`, an empty `runStart`: `squashed: false`, nothing moves.
- The script never runs `git push` for any ref other than `HEAD:<defaultBranch>`: the bare remote has no other branch changed after the run.

In `skills/sdlc/test/prompts.test.mjs`, following the file's existing pattern:

- `run-request.md` Finish names `run-squash.py`, the lease, the one-pipeline-wait rule, the fallback plain push and the catch-up command.
- `run-request.md` Publish still says "Never force-push it" and names Finish as the exception.
- `env-detector.md` writes `runStart` in `mr` mode and keeps it on resume.
- `state-schema.md` documents `runStart` and shows it in the config example.
- `SKILL.md` `done` bullet names the squash, and the loop-end bullet names the `-D` rule for `mr` mode.
- `README.md` `--git mr` bullet names the squash and the catch-up command.
- The STE check (`ste-check.py`) over the changed prompt files stays green.

## Files

- `skills/sdlc/run-squash.py`: new.
- `skills/sdlc/prompts/run-request.md`: the Finish section, the force-push exception.
- `skills/sdlc/prompts/env-detector.md`: `runStart`.
- `skills/sdlc/prompts/state-schema.md`: `runStart` in the example and the field list.
- `skills/sdlc/SKILL.md`: the `done` bullet and the loop-end bullet.
- `README.md`: the `--git mr` bullet.
- `skills/sdlc/test/scripts.test.mjs`: the script tests above.
- `skills/sdlc/test/prompts.test.mjs`: the prompt tests above.
