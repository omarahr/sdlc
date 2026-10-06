---
name: sdlc
description: Use when the user runs /sdlc to implement an approved spec end-to-end autonomously through an adversarial SDLC loop (plan, tests first, implement, adversarial verify and review, integrate, final audit, bar raiser), relaunching the sdlc-loop workflow until done. Also handles "/sdlc status" and "/sdlc stop".
---

# /sdlc: autonomous spec-to-product loop

Invoking this skill is the user's explicit opt-in to running the `sdlc-loop` Workflow, repeatedly, until it finishes. Do not ask the user questions during the loop: the workflow never blocks on a human, and neither do you.

## Commands

- `/sdlc <spec-path> [--git pr|direct|mr|stack] [--commit-format "<format>"] [--max-iterations N] [--bar-raiser N]`: start or resume.
  - `--git mr` commits the slices to the branch you are on and keeps one merge request for the whole run open against the remote's default branch (GitLab with `glab`, or GitHub with `gh`).
  - `--git stack` builds the run on a branch of its own: the tool creates `sdlc/run-<n>` from the default branch and pushes it, cuts a `sdlc/M-<n>` branch per milestone from it, and cuts each slice branch from its milestone branch with a pull request targeting that milestone. When a milestone's behavior campaign verifies, its branch opens a pull request against the default branch; that is the unit you review and merge. GitHub only.
  - `--commit-format` sets the subject of every commit and the merge-request title, with the placeholders `{type}`, `{id}` and `{subject}`, for example `"{type}: [PROJ-123] {subject}"`. Without it, the run uses a format only when the repo enforces one.
  - `--bar-raiser N` allows up to N quality-polish rounds **in total** after the spec is complete and audited. Default 0: the run ends at spec-complete. To polish a finished project later, re-run with a higher N than the rounds already done (see `rounds` in `.sdlc/barraiser.json`).
- `/sdlc status`: print `.sdlc/STATUS.md` from the repo root. If it is missing, say "No SDLC run in this repo."
- `/sdlc tracker`: build the progress tracker, serve it (see **Tracker** below), and give the user the url it printed.
- `/sdlc stop`: `touch "$(git rev-parse --show-toplevel)/.sdlc/STOP"`. Tell the user that the current iteration finishes first, then the run exits, and that `/sdlc <spec>` resumes it.

For heartbeat protection on long runs, recommend starting it as `/loop /sdlc <spec-path>`.

## Start or resume

1. **Pre-flight.** Every check must pass. If one fails, report which one and end.
   - `REPO=$(git rev-parse --show-toplevel)` must succeed. Use the absolute path.
   - The spec exists. Resolve it relative to the current directory, then store it relative to `$REPO`.
   - `git -C "$REPO" status --porcelain -- . ':!.sdlc'` is empty. Uncommitted user work is theirs; do not touch it.
   - If `$REPO/.sdlc/config.json` exists and its `specPath` differs from the argument, report both and end.
   - **Git mode:**
     - Use the `--git` flag if given.
     - Otherwise use `config.json`'s `gitMode`.
     - Otherwise use `stack` before `pr`: when the user gave `--git stack`, or when `config.json` has `gitMode: stack`, keep `stack`.
     - Otherwise use `pr` when `git -C "$REPO" remote -v` shows github.com.
     - Otherwise use `mr` when `glab auth status --hostname <the remote's host>` succeeds and the current branch is not the remote's default branch.
     - Otherwise use `direct`.

     In `pr` mode, `gh auth status` must succeed. In `mr` mode, the forge's CLI must be signed in (`glab auth status --hostname <host>`, or `gh auth status` for GitHub), and the current branch must not be the remote's default branch: tell the user to start from a feature branch. On GitLab, also read the push rule (`glab api "projects/:fullpath/push_rule"`): if it has a `branch_name_regex` that the current branch does not match, the push would be rejected, so report the pattern, ask the user to rename the branch, and end. A project with no push rule (an error or an empty answer) passes this check.

     In `stack` mode `gh auth status` must succeed, and `git -C "$REPO" remote -v` must show github.com. Without one, report why and end rather than falling back: stack mode's contract is that a milestone is reviewed and merged by you. On resume, `git -C "$REPO" checkout <config.runBranch>` first — the run branch is authoritative, not the current branch.
   - **Branch name (first run only):** if `$REPO/.sdlc/config.json` does not exist and the current branch name starts with `sdlc/`, report that the workflow keeps that prefix for its own branches, ask the user to rename the branch (`git branch -m <new-name>`), and end. This check is first run only: on a resume the current branch is normally `runBranch`, which starts with `sdlc/` and is correct. When `config.json` exists, trust `config.runBranch`.
   - `rm -f "$REPO/.sdlc/STOP"`.
2. **Launch.**
   - **Other instructions first.** The workflow relays the user message that triggered the launch to every agent in the run, word for word. If that message asks for anything besides running `/sdlc` (a new branch, a commit, a config change), do it yourself now, before launching, and tell the user that a plain `/sdlc <spec>` is the cleanest way to start or resume a run.
   - **Counters.** Read `$REPO/.sdlc/tracker/driver.json` (see **Driver file** below). If it is missing or unreadable, the counters are `lastKey: ""`, `streak: 0`, `stalledRuns: 0`.
   - `SKILL_DIR` is this skill's base directory, shown as "Base directory for this skill" when it loads. Use that absolute path.
   - Call `Workflow({ scriptPath: "<SKILL_DIR>/sdlc-loop.js", args: { specPath, repoRoot: REPO, skillDir: "<SKILL_DIR>", gitMode, commitFormat, maxIterations, barRaiserRounds, lastKey, streak, stalledRuns } })`. Omit `commitFormat` unless `--commit-format` was given. The three counters always come from the driver file, never from memory. Omit `maxIterations` unless it was given. `barRaiserRounds` is the `--bar-raiser` value, or 0.
   - Remember the launch result's transcript dir: the run's journal is `<transcript dir>/journal.jsonl`.
   - Start the tracker watcher (see **Tracker**).
   - Tell the user in one line: live progress is in `/workflows`, the tracker page at `.sdlc/tracker/index.html`, the text dashboard via `/sdlc status`, and they can stop with `/sdlc stop`.
3. **On the workflow's completion notification,** read `state` and `reason`:
   - **First, save the counters:** write the result's `lastKey`, `streak` and `stalledRuns` to the driver file, so the no-progress guards survive across runs and across a lost conversation.
   - **`continue`** (the run did work, then hit its agent cap or could not go on): if `$REPO/.sdlc/STOP` exists, treat it as `stopped`. If the user gave `--max-iterations` and the reason is `max iterations … reached`, report STATUS.md and end: that flag is a smoke run, not a pacing hint. Otherwise launch again.
   - **`waiting`** (only PRs awaiting human review remain) **or `stalled`** (the run made no progress: it completed nothing, or it repeated the same outcome): back off for 30 minutes, then launch again.
     - Under `/loop`, call `ScheduleWakeup({delaySeconds: 1800, prompt: <the same /loop input>, reason: "sdlc <state>: <reason>", noop: false})`.
     - Without `/loop`, tell the user the state and reason, and that re-running `/sdlc <spec>` resumes it.
   - **`stuck`** (24 stalled runs in a row, about 12 hours without progress): print the top of STATUS.md and the result's `reason`, and say that `/sdlc <spec>` starts it again. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **`stopped`:** print the top of STATUS.md (everything through the Recent section) and end.
   - **`done`:** if `config.json` has `gitMode: "mr"`, finish the run's merge request as "Finish" in `<SKILL_DIR>/prompts/run-request.md` says (push the working branch, update the description, mark it ready), and give the user its link; a failure here is reported, never retried in a loop. Then print STATUS.md, then point to DECISIONS.md (autonomous choices to skim), SPEC-PROPOSALS.md (product ideas waiting for them) and any `external-stub` requirements. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **`livelock`:** print STATUS.md and the "smallest human decision" lines from `.sdlc/STUCK.md`. Under `/loop`, call `ScheduleWakeup({stop: true})`.
   - **A missing result or a workflow error:** launch once more. If that also fails, retry with `resumeFromRunId` set to the failed run id and the same `scriptPath`. If it still fails, report the error, and say that `/sdlc <spec>` resumes from `.sdlc/`.
   - **Whenever the loop ends** (`stuck`, `stopped`, `done`, `livelock`, a `--max-iterations` smoke run, or a `waiting` or `stalled` result without `/loop`), delete the driver file, and stop the tracker watcher with a final build (see **Tracker**). A later `/sdlc <spec>` then starts with fresh counters.
4. **Heartbeat** (only under `/loop`): after each launch, call `ScheduleWakeup({delaySeconds: 1800, prompt: <the same /loop input>, reason: "sdlc heartbeat while run is active", noop: true})`.
   - On a heartbeat wake-up, if you launched a run and have not yet received its completion notification, start the tracker watcher again (see **Tracker**), schedule another heartbeat, and do nothing else.
   - Otherwise resume from step 3 using the last result, or from step 1.

## Driver file

`$REPO/.sdlc/tracker/driver.json` holds `{"lastKey": "...", "streak": 0, "stalledRuns": 0}`: the counters the workflow returned last. It exists only while the loop is waiting to relaunch.

Before writing it, make sure it cannot be committed: `mkdir -p "$REPO/.sdlc/tracker"`, and if `$REPO/.sdlc/tracker/.gitignore` is missing, create it containing `*`.

## Tracker

A self-contained HTML page with the live run, progress, milestones (with their behavior-campaign status), ETAs, pace, recent events and what is waiting for a human. Build it with:

```
python3 "<SKILL_DIR>/tracker/collect.py" --repo "$REPO" --journal "<journal.jsonl of the active run, if known>" --run-label "Run <n>"
```

It writes `.sdlc/tracker/index.html` and `status.json` (gitignored). With a journal, the page leads with the run: its elapsed time, the agents going now, and a rail of every phase sized by the agent time spent in it. The full agent list is under "Agents in this run". Without a journal the numbers lead instead.

**While a run is active,** keep the page live with a watcher that also publishes it through the machine's sdlc hub, so the user opens a url rather than a file. `--publish` implies `--watch 60`; run it detached so it does not block you and does not notify you when it exits:

```
nohup python3 "<SKILL_DIR>/tracker/collect.py" --repo "$REPO" --journal "<journal.jsonl>" --run-label "Run <n>" --publish >/dev/null 2>&1 &
```

The hub is one fixed address on the machine — `http://localhost:8787` — shared by every project: its index lists all running (and recently finished) workflows, and each run's page lives at `http://localhost:8787/r/<run-id>/`. The watcher spawns the hub if it is absent, registers the run, and writes the run's url to `.sdlc/tracker/url` once there is a page behind it. Read that file and give the user the url, along with the index url. If 8787 is held by something that is not the hub, the watcher says so and builds the page without serving it — it never moves to another port.

Start the watcher after every launch and on every heartbeat. A new watcher replaces the old one, and a watcher exits by itself once the run folder has been quiet for 45 minutes, taking its url with it; its entry on the hub's index greys and is pruned a day later. **Whenever the loop ends** (the same cases as for deleting the driver file), run the command once with `--stop-watch` instead of `--publish`: it stops the watcher, withdraws the url, and builds the final page.

The watcher rebuilds the whole page every minute, and the page reloads itself every minute. In between, it rewrites `.sdlc/tracker/live.js` (the workflow view alone) within a second of a poke, and every 5 s without one. The open page reads that file every 2 s and redraws only its workflow card. The plugin's hook (`hooks/hooks.json`) pokes the watcher by touching `.sdlc/tracker/poke` when an agent starts or stops, and only while `watch.pid` exists, so you never run it yourself. To share the page, give the user the url, or point them at the file. A tracker failure never stops the loop: report it once and carry on.

