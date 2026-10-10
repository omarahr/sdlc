---
name: sdlc
description: Use when the user runs /sdlc to implement an approved spec end-to-end autonomously through an adversarial SDLC loop (plan, tests first, implement, adversarial verify and review, full-suite Gate, integrate, final audit, bar raiser), relaunching the sdlc-loop workflow until done. Also handles "/sdlc status" and "/sdlc stop".
---

# /sdlc: autonomous spec-to-product loop

Invoking this skill is the user's explicit opt-in to running the `sdlc-loop` Workflow, repeatedly, until it finishes. Do not ask the user questions during the loop: the workflow never blocks on a human, and neither do you.

## Commands

- `/sdlc <spec-path> [--git pr|direct|mr|stack] [--commit-format "<format>"] [--branch-format "<format>"] [--max-iterations N] [--bar-raiser N]`: start or resume.
  - `--git mr` commits the slices to the branch you are on and keeps one merge request for the whole run open against the remote's default branch (GitLab with `glab`, or GitHub with `gh`).
  - `--git stack` builds the run on a branch of its own: the tool creates `sdlc/run-<n>` from the default branch and pushes it, cuts a `sdlc/M-<n>` branch per milestone from it, and cuts each slice branch from its milestone branch with a pull request targeting that milestone. When a milestone's behavior campaign verifies, its branch opens a pull request against the default branch; that is the unit you review and merge. GitHub only.
  - `--commit-format` sets the subject of every commit and the merge-request title, with the placeholders `{type}`, `{id}` and `{subject}`, for example `"{type}: [PROJ-123] {subject}"`. Without it, the run uses a format only when the repo enforces one.
  - `--branch-format` sets the format of every branch name the loop makes, with the placeholder `{name}`. The default is `sdlc/{name}`. An example is `"feature/PROJ-1-{name}"`. Without it, the run uses the format in `config.json`, or derives one when the repo enforces a branch-name rule.
  - `--bar-raiser N` allows up to N quality-polish rounds **in total** after the spec is complete and audited. Default 0: the run ends at spec-complete. To polish a finished project later, re-run with a higher N than the rounds already done (see `rounds` in the run worktree's `.sdlc/barraiser.json`).
- `/sdlc status`: print the run worktree's `.sdlc/STATUS.md` (`$REPO/.claude/worktrees/sdlc-run/.sdlc/STATUS.md`); without a run worktree, print `.sdlc/STATUS.md` from the repo root. If it is missing, say "No SDLC run in this repo."
- `/sdlc tracker`: build the progress tracker, serve it (see **Tracker** below), and give the user the url it printed.
- `/sdlc stop`: `touch "$(git rev-parse --show-toplevel)/.sdlc/STOP"`. Tell the user that the current agent finishes first, then the run pauses, and that `/sdlc <spec>` resumes it.

For heartbeat protection on long runs, recommend starting it as `/loop /sdlc <spec-path>`.

## Start or resume

1. **Pre-flight.** Every check must pass. If one fails, report which one and end.
   - `REPO=$(git rev-parse --show-toplevel)` must succeed. Use the absolute path.
   - The spec exists. Resolve it relative to the current directory, then store it relative to `$REPO`.
   - `git -C "$REPO" status --porcelain -- . ':!.sdlc'` is empty. Uncommitted user work is theirs; do not touch it.
   - **Run worktree:** the loop works in a run worktree, never in the owner's checkout, and the run's state (`.sdlc/`) lives in the worktree — every later read of run state goes through `WT`. Set `WT="$REPO/.claude/worktrees/sdlc-run"`. First make sure `.claude/worktrees/` is git-ignored: if `$REPO/.gitignore` does not cover it, add `.claude/worktrees/` to it and report that you did. Then ensure the run worktree exists at `$WT` on branch `sdlc/run-<n>`, where `<n>` is (count of `sdlc/run-*` branches) + 1: create it with `git -C "$REPO" worktree add "$WT" -b sdlc/run-<n>`; on a relaunch it already exists — keep it, put its HEAD back on the run branch with `git -C "$WT" checkout sdlc/run-<n>` (a pause can leave it on a slice or state branch, and the merge below is a run-branch operation), and update it with `git -C "$WT" merge --ff-only origin/<defaultBranch>`, or `git -C "$WT" pull --ff-only` when the repo has no remote; if that fails, report that the run branch diverged and end — the owner decides. If the worktree is dirty (`git -C "$WT" status --porcelain` is not empty), report and end: uncommitted work there is the owner's, and it is never reset without their say-so.
   - **Default branch:** resolve it in `$REPO`, never in the worktree, where the current branch is `sdlc/run-<n>` and would corrupt every push target. `DEFAULT_BRANCH=$(git -C "$REPO" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || true)`; when that is empty, `DEFAULT_BRANCH=$(git -C "$REPO" branch --show-current)` — the branch the owner's checkout is on, direct mode's working branch; when that is empty too (detached HEAD), report and end. Also set `BASE_BRANCH=$(git -C "$REPO" branch --show-current)`: the branch the owner's checkout is on, which `pr` hands to the workflow. `<defaultBranch>` below means `DEFAULT_BRANCH`.
   - If `$WT/.sdlc/config.json` exists and its `specPath` differs from the argument, report both and end.
   - **Git mode:**
     - Use the `--git` flag if given.
     - Otherwise use `config.json`'s `gitMode`.
     - Otherwise use `stack` before `pr`: when the user gave `--git stack`, or when `config.json` has `gitMode: stack`, keep `stack`.
     - Otherwise use `pr` when `git -C "$REPO" remote -v` shows github.com.
     - Otherwise use `mr` when `glab auth status --hostname <the remote's host>` succeeds and the current branch is not the remote's default branch.
     - Otherwise use `direct`.

     In `pr` mode, `gh auth status` must succeed. In `mr` mode, the forge's CLI must be signed in (`glab auth status --hostname <host>`, or `gh auth status` for GitHub), and the current branch must not be the remote's default branch: tell the user to start from a feature branch.

     In `stack` mode `gh auth status` must succeed, and `git -C "$REPO" remote -v` must show github.com. Without one, report why and end rather than falling back: stack mode's contract is that a milestone is reviewed and merged by you. On resume the run worktree already sits on `config.runBranch`; never move the owner's checkout to the run branch.
   - **Branch format:** the loop names every branch it makes from one format (`branches.py`, placeholder `{name}`; default `sdlc/{name}`). Take the format from `--branch-format` when given, else from `$REPO/.sdlc/config.json` `branchFormat` when that file exists (a finished run leaves it on the default branch), else none. On a resume, the `config.json` `branchFormat` gives the same value without `--branch-format`. Run `python3 "$SKILL_DIR/branches.py" preflight --repo "$REPO" --mode <gitMode>` with `--format "<format>"` when you have one, and with `--branch "$BASE_BRANCH"` in `mr` mode. It reads the forge's branch-name rules, tests the names this mode will push, and prints a verdict. When `ok` is false, print its `samples` that failed with their `rule`, its `notes` and its `suggestion`, and end. When `ok` is true, `FMT` is its `format`; when `derived` is true, tell the user the format you derived and that it is now in config.json. A `working` sample that failed names the user's own branch: ask them to rename it and end. Then, when `$BASE_BRANCH` parses as one of the loop's kinds (`python3 "$SKILL_DIR/branches.py" parse --repo "$REPO" --format "$FMT" --branch "$BASE_BRANCH"` prints a kind), report that the workflow keeps those names for its own branches, ask the user to rename the branch (`git branch -m <new-name>`), and end. This check is first run only: on a resume the current branch is normally the run branch.
   - After the worktree exists, when `$WT/.sdlc/config.json` holds a `branchFormat` that differs from `$FMT`, report both and end: a run in progress keeps its names.
   - `rm -f "$REPO/.sdlc/STOP"`.
2. **Launch.**
   - **Other instructions first.** The workflow relays the user message that triggered the launch to every agent in the run, word for word. If that message asks for anything besides running `/sdlc` (a new branch, a commit, a config change), do it yourself now, before launching, and tell the user that a plain `/sdlc <spec>` is the cleanest way to start or resume a run.
   - **Counters.** Read `$REPO/.sdlc/tracker/driver.json` (see **Driver file** below). If it is missing or unreadable, the counters are `lastKey: ""`, `streak: 0`, `stalledRuns: 0`.
   - `SKILL_DIR` is this skill's base directory, shown as "Base directory for this skill" when it loads. Use that absolute path.
   - Call `Workflow({ scriptPath: "<SKILL_DIR>/sdlc-loop.js", args: { specPath, repoRoot: "<worktree path>", mainRoot: REPO, skillDir: "<SKILL_DIR>", gitMode, commitFormat, branchFormat, maxIterations, barRaiserRounds, lastKey, streak, stalledRuns } })`. The loop's repo is the run worktree: pass `WT` as `repoRoot`. `mainRoot` is the owner's checkout (`REPO`): the stop probe reads `.sdlc/STOP` there, since the worktree never has it. `defaultBranch` is passed per mode (see **Default branch**): in `direct` and `stack` pass `defaultBranch: "$DEFAULT_BRANCH"`; in `pr` pass `defaultBranch: "$BASE_BRANCH"` — the branch the owner's checkout is on, the one the run builds on; in `mr` omit it entirely: `mr`'s `defaultBranch` is the working branch (run-request.md), and a value naming the remote's default branch would equal `targetBranch` and wrongly downgrade the run to `direct`. Omit `commitFormat` unless `--commit-format` was given. `branchFormat` is `$FMT`; pass it on every launch. The three counters always come from the driver file, never from memory. Omit `maxIterations` unless it was given. `barRaiserRounds` is the `--bar-raiser` value, or 0.
   - Remember the launch result's transcript dir: the run's journal is `<transcript dir>/journal.jsonl`.
   - Start the tracker watcher (see **Tracker**).
   - Tell the user in one line: live progress is in `/workflows`, the tracker page at `.sdlc/tracker/index.html`, the text dashboard via `/sdlc status`, and they can stop with `/sdlc stop`.
3. **On the workflow's completion notification,** read `state` and `reason`. Every run-state file below (`STATUS.md`, `STUCK.md`, `DECISIONS.md`, `SPEC-PROPOSALS.md`, `config.json`) is the run worktree's (`$WT`), since `.sdlc/` lives there:
   - **First, save the counters:** write the result's `lastKey`, `streak` and `stalledRuns` to the driver file, so the no-progress guards survive across runs and across a lost conversation.
   - **`continue`** (the run did work, then hit its agent cap or could not go on): if `$REPO/.sdlc/STOP` exists, treat it as `stopped`. If the user gave `--max-iterations` and the reason is `max iterations … reached`, report STATUS.md and end: that flag is a smoke run, not a pacing hint. Otherwise launch again.
   - **`waiting`** (only PRs awaiting human review remain) **or `stalled`** (the run made no progress: it completed nothing, or it repeated the same outcome): back off for 30 minutes, then launch again.
     - Under `/loop`, call `ScheduleWakeup({delaySeconds: 1800, prompt: <the same /loop input>, reason: "sdlc <state>: <reason>", noop: false})`.
     - Without `/loop`, tell the user the state and reason, and that re-running `/sdlc <spec>` resumes it.
   - **`stuck`** (24 stalled runs in a row, about 12 hours without progress): print the top of STATUS.md and the result's `reason`, and say that `/sdlc <spec>` starts it again. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **`stopped`:** print the top of STATUS.md (everything through the Recent section) and end.
   - **`paused`:** the owner asked to stop: print the top of STATUS.md, keep the worktree, end. `/sdlc <spec>` resumes. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **`done`:** if `config.json` has `gitMode: "mr"`, finish the run's merge request as "Finish" in `<SKILL_DIR>/prompts/run-request.md` says (push the working branch, update the description, mark it ready), and give the user its link; a failure here is reported, never retried in a loop. Then print STATUS.md, then point to DECISIONS.md (autonomous choices to skim), SPEC-PROPOSALS.md (product ideas waiting for them) and any `external-stub` requirements. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **`livelock`:** print STATUS.md and the "smallest human decision" lines from `.sdlc/STUCK.md`. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **A missing result or a workflow error:** launch once more. If that also fails, retry with `resumeFromRunId` set to the failed run id and the same `scriptPath`. If it still fails, report the error, and say that `/sdlc <spec>` resumes from `.sdlc/`.
   - **Whenever the loop ends** (`stuck`, `stopped`, `done`, `livelock`, a `--max-iterations` smoke run, or a `waiting` or `stalled` result without `/loop`), delete the driver file, remove the run worktree (`git worktree remove "$WT"`), delete the run branch (`git branch -d sdlc/run-<n>` — safe: slice state is committed to `<defaultBranch>`; a refusal means unmerged work, or this checkout has not caught up: report, keep both, end), and stop the tracker watcher with a final build (see **Tracker**). A later `/sdlc <spec>` then starts with fresh counters.
4. **Heartbeat** (only under `/loop`): after each launch, call `ScheduleWakeup({delaySeconds: 1800, prompt: <the same /loop input>, reason: "sdlc heartbeat while run is active", noop: true})`.
   - On a heartbeat wake-up, if you launched a run and have not yet received its completion notification, start the tracker watcher again (see **Tracker**), schedule another heartbeat, and do nothing else.
   - Otherwise resume from step 3 using the last result, or from step 1.

## Driver file

`$REPO/.sdlc/tracker/driver.json` holds `{"lastKey": "...", "streak": 0, "stalledRuns": 0}`: the counters the workflow returned last. It exists only while the loop is waiting to relaunch, and stays on the owner's checkout — driver state never lives in the worktree.

Before writing it, make sure it cannot be committed: `mkdir -p "$REPO/.sdlc/tracker"`, and if `$REPO/.sdlc/tracker/.gitignore` is missing, create it containing `*`.

## Tracker

A self-contained HTML page with the live run, progress, milestones (with their behavior-campaign status), ETAs, pace, recent events and what is waiting for a human. Build it with:

```
python3 "<SKILL_DIR>/tracker/collect.py" --repo "$WT" --out "$REPO/.sdlc/tracker" --journal "<journal.jsonl of the active run, if known>" --run-label "Run <n>"
```

It reads the run's `.sdlc/` state from `--repo` (the run worktree) and writes `.sdlc/tracker/index.html` and `status.json` (gitignored) to `--out` in the owner's checkout. With a journal, the page leads with the run: its elapsed time, the agents going now, and a rail of every phase sized by the agent time spent in it. The full agent list is under "Agents in this run". Without a journal the numbers lead instead.

**While a run is active,** keep the page live with a watcher that also publishes it through the machine's sdlc hub, so the user opens a url rather than a file. `--publish` implies `--watch 60`; run it detached so it does not block you and does not notify you when it exits:

```
nohup python3 "<SKILL_DIR>/tracker/collect.py" --repo "$WT" --out "$REPO/.sdlc/tracker" --journal "<journal.jsonl>" --run-label "Run <n>" --publish >/dev/null 2>&1 &
```

The hub is one fixed address on the machine — `http://localhost:8787` — shared by every project: its index lists all running (and recently finished) workflows, and each run's page lives at `http://localhost:8787/r/<run-id>/`. The watcher spawns the hub if it is absent, registers the run, and writes the run's url to `.sdlc/tracker/url` once there is a page behind it. Read that file and give the user the url, along with the index url. If 8787 is held by something that is not the hub, the watcher says so and builds the page without serving it — it never moves to another port.

Start the watcher after every launch and on every heartbeat. A new watcher replaces the old one, and a watcher exits by itself once the run folder has been quiet for 45 minutes, taking its url with it; its entry on the hub's index greys and is pruned a day later. **Whenever the loop ends** (the same cases as for deleting the driver file), run the command once with `--stop-watch` instead of `--publish`: it stops the watcher, withdraws the url, and builds the final page.

The watcher rebuilds the whole page every minute, and the page reloads itself every minute. In between, it rewrites `.sdlc/tracker/live.js` (the workflow view alone) within a second of a poke, and every 5 s without one. The open page reads that file every 2 s and redraws only its workflow card. The plugin's hook (`hooks/hooks.json`) pokes the watcher by touching `.sdlc/tracker/poke` when an agent starts or stops, and only while `watch.pid` exists, so you never run it yourself. To share the page, give the user the url, or point them at the file. A tracker failure never stops the loop: report it once and carry on.

