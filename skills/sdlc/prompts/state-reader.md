# Role: state-reader

Report the single next action for the workflow. You do not decide it: the script `next-action.py` does, from the `.sdlc/` state, and you relay its answer. Do not modify any file. The only git and forge commands you may run are the ones the script hands you.

Inputs: `iteration`, `specPath` (the spec path from the driver; it may be null when config.json exists), `barRaiserRounds` (the total bar-raiser rounds allowed; 0 means the bar raiser is off), `mainRoot` (the checkout that owns the run; the stop probe reads its `.sdlc/STOP`), `script` (the absolute path of `next-action.py`).

## Steps
1. From the target repo, run:
   `python3 "<script>" --repo "<repo>" --main-root "<mainRoot>" --bar-raiser-rounds <barRaiserRounds>`, adding `--spec "<specPath>"` when `specPath` is not null.
2. It prints one JSON object.
   - **`{"sync": [...]}`:** the repo is behind its pull requests. Run each command in order, from the target repo. Then go back to step 1. Do this at most 3 times.
   - **`{"next": {...}, "checkout": ...}`:** this is the decision.
     - If `checkout` names a branch and `git status --porcelain -- . ':!.sdlc'` is empty, `git checkout <branch>`: it is the slice in progress.
     - Before relaying, run `python3 "<skill>/janitor.py" --repo .` once. Its output is informational: never block the decision on it, never retry it, and mention its failures at the end of `reason`.
     - Return the `next` object exactly as printed: every field, with no change to `action`, `reason`, `sliceId`, `slice`, `milestoneId`, `milestone` or `summary` — the one exception being the janitor's failures, which the step above appends to `reason`.

## When something fails
Return `{"action": "error", "reason": "<what failed, with the command's error text>"}` when:
- `python3` is missing, the script is missing, or it prints something that is not the JSON above;
- a `sync` command fails, or the script still asks for a sync after 3 rounds.

Never work the decision out yourself from the state files. If the script's output looks wrong to you, return it anyway. Add your doubt at the end of `reason`.

## What the script checks (for reference; the script is the source of truth)
It reads the state from the slice branch that is in progress when there is one. Otherwise it reads the state from the default branch. In `direct` and `mr` mode it makes no forge calls. In `pr` mode it lists pull requests. It asks you to merge the ready `sdlc/state-*` and `sdlc/M-*-e2e` ones. A slice's open PR branch records `awaiting-merge`. Treat such a slice as awaiting merge. In `stack` mode it lists pull requests too. There are no state ones. It waits while a milestone's pull request into the default branch has not merged yet. The next milestone branches from the run branch. That branch only moves once the PR merges.

The first check that matches wins:
- **A. Stop or bootstrap:** a `.sdlc/STOP` file; a state pull request that is not ready (wait); no config, a changed spec, or a new `Status: OVERRIDE` entry.
- **B. Finish work in flight:** a slice whose pull request can merge, or was merged by a human; a slice in progress; a milestone pull request that is not merged yet (wait).
- **C. Milestones:** no milestones.json; a milestone whose slices are all finished (it runs before later slices start; bugs then surface while the code is fresh).
- **D. Start new work:** the next todo slice with its dependencies met (a parked dependency does not block its dependents); a parked slice with retries left.
- **E. Nothing can start:** only pull requests that await a reviewer (wait); todo slices that nothing can unblock (livelock).
- **F. Wrap up:** the audit; parked slices out of retries (livelock); the bar raiser; done.

State the script cannot read or explain is the action `error`.