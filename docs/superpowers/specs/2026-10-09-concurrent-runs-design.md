# Concurrent runs: several loops on one repo, each in its own session, none able to touch another

Date: 2026-10-09
Status: approved design, implementation pending

## Intent

A user who wants two features built at once opens two Claude sessions on the same checkout and runs `/sdlc <spec-a>` in one and `/sdlc <spec-b>` in the other. Today the second launch is refused, and if it were not, the two runs would corrupt each other. Everything the loop keeps outside the slice branches is keyed by the repo, not by the run:

| Shared thing | Where it is spelled | What two runs would do to each other |
|---|---|---|
| The run worktree | `SKILL.md` sets `WT="$REPO/.claude/worktrees/sdlc-run"`, one path | The second spec hits "config.json's `specPath` differs" and ends. Nothing else below is ever reached |
| The stop file | `/sdlc stop` touches `$REPO/.sdlc/STOP`; every agent's preamble (`sdlc-loop.js`, `run()`) and `next-action.py` read that one path | `/sdlc stop` in either session pauses every run on the repo |
| The committed state | `.sdlc/config.json`, `slices.json`, `requirements.json`, `milestones.json`, `STATUS.md`, `log.jsonl` and the slice folders, committed to the default branch; `next-action.py` reads `config.json` from `origin/<defaultBranch>` | Run A's reader sees run B's `specPath` and re-bootstraps. Both runs commit the same files |
| Slice branches | `sdlc/<sliceId>`, and slice ids restart at `S-001` in every run | Run B checks out run A's `sdlc/S-001`, or fails to create its own |
| The janitor | `janitor.py` deletes every `sdlc/<id>-v*` branch whose id is not in its own `slices.json` | Run A's janitor deletes run B's live verify branches, round after round |
| The driver file and the tracker | `$REPO/.sdlc/tracker/driver.json`, `watch.pid`, `poke`, `url`, `index.html`; "a new watcher replaces the old one"; loop-end cleanup runs `--stop-watch` and `git worktree remove "$WT"` | Each run's watcher kills the other's; each run's cleanup removes the other's page and counters |
| Scratch directories | `$TMPDIR/sdlc-<sliceId>-<lens>-r<round>` and the other `$TMPDIR/sdlc-<id>…` names | Two `S-001` slices share one directory |
| The suite slot | `suite-receipt.py slot` locks `<repo>/.sdlc/suite.lock`, where `<repo>` is the run worktree | Two full suites run at once. The test-time budget compares a contended run against an uncontended baseline and refutes a good slice |

A Workflow belongs to its session, so closing one session does not stop the other's workflow. The damage is in the shared files, not in the process model. A second clone does not help either in `pr` mode: the branch names collide on the remote, and both clones push state to the same default branch.

**What the user asked for** (resolved in conversation): "run multiple sdlc loops on the same repo for different features in different sessions … frictionless multiple loops in separate claude sessions without impacting each other." The assumption "stopping one session stops all other runs" was checked and holds for `/sdlc stop`, with the wider list above.

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Approach | Run-scoped everything: one id per run drives the worktree, the state directory, the branch namespace, the stop file, the driver file, the tracker, the scratch names and a lock |
| Run id | A short slug of the spec's file name: `2026-10-08-branch-format-design.md` becomes `branch-format`. `--run <id>` overrides it on the first launch. Stable, so a resume needs no registry lookup by number |
| Where state lands | Still on the default branch, under `.sdlc/runs/<id>/`, so reports stay browsable on the forge and the single-run story is unchanged. Not run-branch only |
| Runs started before this change | Keep today's layout and names until they end, as the run with the empty id. No migration |
| Branch names | One rule added to the branch-format spec's `branches.py`: a run segment in every tail. Not a second naming scheme |
| The suite slot | Shared by every run of a repo, through the git common dir, so two gates take turns |

**Assumptions:**
- The branch-format spec (2026-10-08) is implemented first: `branches.py` owns every name, and this spec adds a parameter to it. If this spec lands first, the run segment is applied where the names are spelled today and moves into `branches.py` with that spec.
- The loop-economy spec (2026-10-08) adds `ship-prune` and `collect-verification` to `state-write.py`; they take the same `--run` argument as every other operation there.
- The two features a user runs side by side touch mostly different code. The loop does not resolve conflicts between them beyond what the integrator does today for a default branch that moved under the run.

### Non-goals

- Resolving code conflicts between two features.
- Running one spec in two sessions at once. That is refused, with the lock below.
- Migrating a run that is in flight when this ships. It finishes under the old layout.
- Coordinating runs across repos. The hub already lists them; nothing else is shared.
- Several runs inside one session.
- Windows paths.

## Design

### 1. The run id

`runId` is the run's name. It matches `^[a-z0-9][a-z0-9-]{0,39}$`, is written to the run's `config.json` by the env-detector at bootstrap, and never changes.

**Derivation** from the spec path: the file name without its extension, lowercased, every run of characters outside `[a-z0-9]` collapsed to one `-`, then a leading `YYYY-MM-DD-` and a trailing `-design` stripped, then leading and trailing `-` trimmed. An empty result is `run`.

| Spec file | Run id |
|---|---|
| `2026-10-08-branch-format-design.md` | `branch-format` |
| `Tracker Hub v2.md` | `tracker-hub-v2` |
| `design.md` | `design` |
| `.md` | `run` |

`--run <id>` on the first launch replaces the derived id. It is validated against the pattern above. A `--run` on a resume that names a different run than the spec's is refused, with both ids.

**Collision.** When the derived id already names a run of this checkout (section 4, the registry) or a landed `.sdlc/runs/<id>/config.json` on the default branch, and that run's `specPath` differs, the id becomes `<id>-<first 6 hex of sha1(specPath)>`, and the driver says so. When the `specPath` is the same, it is the same run: a resume, or a re-run of a finished spec with a higher `--bar-raiser`.

**The empty id.** A run that has no id (started before this change, recognized by a root-level `.sdlc/config.json` in the run worktree `sdlc-run`, or in the owner's checkout when no worktree exists) keeps every path and name it has today. Each rule below says what the empty id gives. There is one code path, and the empty id is its default.

### 2. Where things live

| Thing | Empty id (today) | With `runId` |
|---|---|---|
| Run worktree | `$REPO/.claude/worktrees/sdlc-run` | `$REPO/.claude/worktrees/sdlc-<runId>` |
| State directory `<sdlc>` (committed, in the worktree and on the default branch) | `.sdlc` | `.sdlc/runs/<runId>` |
| Stop file | `$REPO/.sdlc/STOP` | `$REPO/.sdlc/runs/<runId>/STOP` |
| Driver side (never committed): driver file, lock, run file, tracker page | `$REPO/.sdlc/tracker/` | `$REPO/.sdlc/runs/<runId>/tracker/` |
| Scratch prefix `<scratch>` | `$TMPDIR/sdlc-` | `$TMPDIR/sdlc-<runId>-` |
| Suite slot lock | `<worktree>/.sdlc/suite.lock` | `$(git rev-parse --git-common-dir)/sdlc-suite.lock`, for every run of the repo, empty id included |
| Hub entry id | `<worktree dir name>-<spec slug>` | `<owner repo dir name>-<runId>` |

The owner's checkout holds `$REPO/.sdlc/runs/<runId>/` in two roles: the committed state as it lands on the default branch, and the untracked `STOP` and `tracker/`. That is the arrangement `.sdlc/` has today, one level down. The tracker directory keeps its own `.gitignore` containing `*` (today's rule). The env-detector adds `.sdlc/runs/*/STOP` and `.sdlc/runs/*/tracker/` to the repo's `.gitignore` beside today's two lines, so a `git add` from the owner's checkout can never pick up a stop file.

The run worktree of run A receives `.sdlc/runs/b/…` whenever it syncs the default branch after run B landed state there. It never writes those files, and its state commits stage `<sdlc>` and `.gitignore` only.

### 3. The owner module: `skills/sdlc/runs.py`

Python 3 standard library only. Importable by the other scripts (they insert the script directory into `sys.path`) and runnable. Every command prints one JSON object; exit 2 with `{"ok": false, "error": "..."}` on bad input.

```
runs.py id       --spec PATH [--run ID]
runs.py paths    --repo DIR --run ID
runs.py list     --repo DIR
runs.py resolve  --repo DIR (--spec PATH | --run ID) [--run ID]
runs.py write-run-file --repo DIR --run ID --spec PATH --base BRANCH
```

**Python API**

- `derive_id(spec_path)`: section 1's derivation.
- `validate_id(run_id)`: the pattern, or `Fail`. The empty string is valid and means the empty id.
- `state_dir(run_id)`: `.sdlc/runs/<run_id>`, or `.sdlc` for the empty id. Relative to a checkout root.
- `worktree_dir(repo, run_id)`: `<repo>/.claude/worktrees/sdlc-<run_id>`, or `…/sdlc-run` for the empty id.
- `scratch_prefix(run_id)`: `sdlc-<run_id>-`, or `sdlc-` for the empty id.
- `paths(repo, run_id)`: `{runId, stateDir, worktree, stopFile, trackerDir, driverFile, lockFile, runFile, scratchPrefix}`, every path absolute except `stateDir`.
- `list_runs(repo)`: every run this checkout knows, from three sources, merged by id:
  1. the registered worktrees (`git worktree list --porcelain`) whose path is `worktree_dir(repo, id)` for some id, the empty id included;
  2. the run files `<repo>/.sdlc/runs/*/tracker/run.json` and `<repo>/.sdlc/tracker/run.json`;
  3. the landed configs `<repo>/.sdlc/runs/*/config.json` and `<repo>/.sdlc/config.json`.

  Each run is `{runId, specPath, worktree: <path or null>, lock: <"live" | "stale" | null>, landed: <bool>}`. `specPath` comes from the worktree's `<sdlc>/config.json`, else the run file, else the landed config. `lock` is `live` when the lock file exists and its journal directory was written within the last 45 minutes (section 4.3), `stale` when it exists and was not, `null` when there is none.
- `resolve(repo, spec_path=None, run_id=None)`: the run for a launch or a command. With `spec_path`: the run whose `specPath` matches it (repo-relative, normalized), else a new run whose id is `run_id` when given, else `derive_id` with the collision rule. With `run_id` only: the run of that id from `list_runs`, else `Fail`. The answer is `paths(...)` plus `specPath`, `found` (`"worktree"`, `"run-file"`, `"landed"` or `null` for a new run), `lock`, and `legacy` (true for the empty id).
- `write_run_file(repo, run_id, spec_path, base_branch)`: writes `runFile` as `{"runId", "specPath", "baseBranch", "createdAt"}`, creating the tracker directory and its `.gitignore` first. The driver calls this when it creates the worktree, so a run that has not bootstrapped yet is still found by its spec, and a `--run` override need not be repeated.

### 4. The driver (`SKILL.md`)

#### 4.1 Commands

- `/sdlc <spec-path> [--run <id>] [--git …] […]`: `--run` names the run on its first launch. The Commands table gains it beside `--branch-format`.
- `/sdlc status [<spec>|<id>]`, `/sdlc stop [<spec>|<id>]`, `/sdlc tracker [<spec>|<id>]`: the argument is a spec path when a file exists at it, else a run id. Resolve it with `runs.py resolve`. Without an argument, `runs.py list` decides: one run with a worktree is the run; none is "No SDLC run in this repo."; several is the list below, and for `stop` and `tracker` the driver then asks which one. That question is outside the loop, which still never asks.
- `/sdlc status` with several runs and no argument prints one line per run: the id, the spec path, `live` (a session holds its lock), `paused` (a worktree, no live lock) or `finished` (no worktree), and the first non-heading line of its `STATUS.md`.
- `/sdlc status` for one run prints `$WT/$STATE/STATUS.md` while the worktree exists, else `$REPO/$STATE/STATUS.md`.
- `/sdlc stop` touches `stopFile` from `resolve`, and says what it says today, naming the run.

#### 4.2 Pre-flight

The **Run worktree** bullet is replaced by two bullets, and the `specPath` check moves into the first:

```markdown
   - **Run:** `RUN=$(python3 "$SKILL_DIR/runs.py" resolve --repo "$REPO" --spec "<spec>")`, adding `--run "<id>"` when the user gave one. It prints the run's id and every path below: `runId`, `stateDir`, `worktree`, `stopFile`, `trackerDir`, `driverFile`, `lockFile`, `runFile`, `found`, `lock`, `legacy`. Set `RUN_ID`, `STATE`, `WT`, `STOP` and `TRACKER` from it. When `found` is not null and `--run` names a different id than `runId`, report both and end: a run keeps its id. When `found` is null and `runId` carries a hash suffix, tell the user the id and why. When `lock` is `live`, report that this spec is running in another session, with the lock's `launchedAt` and how long ago its journal was written, say that `/sdlc stop <id>` there pauses it and that deleting `lockFile` frees it when that session is gone, and end. A new run (`found` null) gets its run file once the worktree exists (next bullet).
   - **Run worktree:** the loop works in `$WT`, never in the owner's checkout, and the run's state (`$STATE/`) lives there. First make sure `.claude/worktrees/` is git-ignored, as today. The run branch is `RUN_BRANCH=$(python3 "$SKILL_DIR/branches.py" name --repo "$REPO" --format "$FMT" --kind run --run "$RUN_ID")`; with an empty `RUN_ID` the branch-format spec's count rule applies. Ensure the worktree exists at `$WT` on `$RUN_BRANCH`, create it with `git -C "$REPO" worktree add "$WT" -b "$RUN_BRANCH"` when it does not, then `python3 "$SKILL_DIR/runs.py" write-run-file --repo "$REPO" --run "$RUN_ID" --spec "<spec>" --base "$BASE_BRANCH"`. On a relaunch, put the worktree back on `$RUN_BRANCH` and fast-forward it, as today. A dirty worktree ends the launch, as today.
```

The **Git mode** bullet gains one sentence for `mr`: when `runs.py list` shows another run of this checkout with `gitMode: mr` and the same working branch (`baseBranch` in its run file, or `defaultBranch` in its config), report it and end. `mr` mode's output is the working branch, and one branch cannot carry two runs.

Every later mention of `$REPO/.sdlc/STOP` in `SKILL.md` becomes `$STOP`, every `$REPO/.sdlc/tracker/…` becomes `$TRACKER/…`, every `$WT/.sdlc/…` becomes `$WT/$STATE/…`, and the run branch is `$RUN_BRANCH`. The **Branch format** bullet passes `--run "$RUN_ID"` to `branches.py preflight`, so the samples carry the run segment.

#### 4.3 The lock

`lockFile` is `$TRACKER/lock`, `{"journal": "<the launch result's transcript dir>", "launchedAt": "<UTC ISO>"}`. The driver writes it right after every launch, when it learns the transcript dir, and rewrites it on every relaunch. The driver removes it whenever the loop ends (the same cases that delete the driver file) and whenever it hands a `paused`, `waiting`, `stalled` or `stuck` run back to the user without scheduling a relaunch. Under `/loop` the lock stays through the 30-minute backoff.

A lock is `live` while the newest file in its journal directory (`workflow.newest_mtime`, the watcher's own measure) is younger than 45 minutes, the watcher's idle rule and longer than the backoff. A lock whose journal directory is missing or older is `stale`, and a launch takes it over by writing its own. A session that crashed therefore frees its run within 45 minutes without anyone deleting a file, and a session that is merely between agents never loses its run.

#### 4.4 Launch, heartbeat and cleanup

- The workflow args gain `runId: "$RUN_ID"`.
- The watcher runs with `--repo "$WT" --run "$RUN_ID" --main-root "$REPO" --out "$TRACKER" --run-label "$RUN_ID"` (`--run-label "Run <n>"` with the empty id). `--stop-watch` takes the same arguments.
- The driver file is `$TRACKER/driver.json`.
- **Whenever the loop ends**, the driver removes `$WT`, deletes `$RUN_BRANCH`, deletes `driverFile` and `lockFile`, and stops its watcher. It never lists or touches another run's worktree, branch, files or watcher. The run file stays: it is what lets `/sdlc status` call the run `finished`.

### 5. The loop script

```js
// the run's identity, and the two paths the script spells itself: the stop file every agent probes, and
// the state directory the preamble names. Empty id: today's paths exactly.
const RUN_ID = A.runId || ''
const STATE_DIR = RUN_ID ? `.sdlc/runs/${RUN_ID}` : '.sdlc'
const STOP_FILE = `${A.mainRoot || A.repoRoot || '.'}/${STATE_DIR}/STOP`
```

- The `run()` preamble gains two lines after `Target repo`: `Run id: ${RUN_ID || '(none)'}` and `State dir: ${STATE_DIR}`, and its stop check names `STOP_FILE` instead of the literal path.
- `branchName(tail)` (branch-format spec, section 6) prefixes the run segment before the format substitution: `const t = RUN_ID ? \`${RUN_ID}/${tail}\` : tail`.
- The `failures.md` and `spike.md` context line uses `${STATE_DIR}/slices/${id}/…`.
- `main()`'s pause test matches `${STATE_DIR}/STOP` in the reader's reason instead of `.sdlc/STOP`.
- The state-reader call gains `runId: RUN_ID`.
- `INTERNALS` exports `RUN_ID`, `STATE_DIR` and `STOP_FILE`.

### 6. The scripts

Every script that reads `.sdlc/` gains `--run ID` (default `""`) and resolves `sdlc = runs.state_dir(run_id)` once. The prompts pass `--run "<runId>"` on every call (section 7).

**`branches.py`** (the branch-format spec's module)
- `tail(kind, run="", **parts)`: with a non-empty `run`, the `run` kind's tail is `<run>/run` and takes no `n`, and every other kind's tail is `<run>/` followed by today's tail. With the empty run, today's tails.
- `parse(fmt, branch, ids=None)`: after the prefix and suffix are stripped, a tail containing `/` is split at its first `/` into the run segment and the rest, and the rest is classified by the table, in which the `run` kind matches `^run$` when a run segment is present and `^run-(\d+)$` when it is not. The result gains `run` (`""` without a segment). A run segment that fails `validate_id` is not a loop branch.
- `list_kind(repo, fmt, kind, run=None)`: with `run` given, the empty string included, only branches whose `run` equals it.
- `load_format(repo, run="")` reads `<state_dir(run)>/config.json`.
- Every command gains `--run ID`. `preflight` samples carry the segment.
- `validate_format` keeps its `S-001` sample; it also checks `name(fmt, "slice", run="a-b", id="S-001")` with `git check-ref-format --branch`.

**`next-action.py`**
- `sdlc` is the state directory; the stop check reads `<main-root>/<sdlc>/STOP`, and its reason is `A: <sdlc>/STOP exists`.
- Every `branches` call passes `run=run_id`, so `active_branch`, the pull-request heads and the stack milestone hold see this run's branches only.
- The spec-hash and override checks are unchanged; they already read through `sdlc`.

**`state-write.py`**
- Every `.sdlc` join goes through `sdlc`. `branch_run` reads `<branch>:<sdlc>/config.json`. `ensure_slice_branch`, `ensure_milestone_branch`, the dependency branch and `prune_stale_milestone_branches` pass `run=run_id` to `branches`.
- Commits stage `sdlc` and `.gitignore`, never `.sdlc` as a whole.
- `ship-prune` and `collect-verification` (loop-economy spec) take `--run` and list through `branches.list_kind(..., run=run_id)`.

**`janitor.py`**
- `slices.json` comes from the state directory. The sweep keeps only branches whose parsed `run` equals this run's id, so a janitor with the empty id never deletes a namespaced branch and a namespaced janitor never deletes a legacy one. Scratch reaping is unchanged: `sdlc-*` directories older than `janitorDays`, which covers every run's prefix.

**`suite-receipt.py`**
- `receipt_path` and the baseline path go through the state directory.
- `lock_path(repo)` is `<git rev-parse --git-common-dir>/sdlc-suite.lock`, resolved from `repo`; when `repo` is not a git repository, today's path. `slot` and `slot-release` are otherwise unchanged. The loop-economy spec's gate still holds the slot with `--repo "<repo>"`; where the file lands no longer depends on which worktree asks.

**`tracker/collect.py`**
- `--run ID` and `--main-root DIR`. The state is read from `<repo>/<sdlc>`; the default `--out` is `<repo>/<sdlc>/tracker`; the poke, pid and url files are under `--out`, as today.
- The hub entry id is `<basename(main-root)>-<runId>` with a run id, and today's derivation without one. The registration's `repo` field is `main-root`. The 6-character suffix for two repos with the same name and run id stays.
- `reports.py` reads `<repo>/<sdlc>` and defaults its output to `<out>/reports`.

**`hooks/live-poke.py`**
- At each ancestor of the hook's cwd, poke `.sdlc/tracker/poke` when `.sdlc/tracker/watch.pid` exists, and every `.sdlc/runs/*/tracker/poke` whose `watch.pid` exists. Stop climbing at the first ancestor that had any. A poke a watcher did not need costs one `live.js` rebuild.

### 7. The prompts

`_common.md` changes its stop-check bullet and gains three bullets:

```markdown
- **Stop check:** your prompt names the stop file's path, as "Stop check". Before you start work, check whether that file is there. When it is, do nothing. Return your normal result shape with `stopRequested: true`.
- **State directory:** `<sdlc>` is the run's state directory. Your prompt names it as "State dir". It is `.sdlc/runs/<runId>` for a run with an id, and `.sdlc` for a run without one. Every path in these files that starts with `<sdlc>/` is under it.
- **Scratch names:** `<scratch>` is `$TMPDIR/sdlc-<runId>-` for a run with an id, and `$TMPDIR/sdlc-` for a run without one. Name every scratch directory and file `<scratch><rest>`.
- **Scripts:** every call of a script in `<skill>` carries `--run "<runId>"`. Your prompt names the run id as "Run id"; pass an empty string for `(none)`.
```

Every prompt that spells `.sdlc/` today writes `<sdlc>/` instead, and every `$TMPDIR/sdlc-` writes `<scratch>`. The literals, by count: 117 state paths across 45 prompt files and 7 scratch names (`_common.md`'s long-command log and exit files, `auditor.md`, `finding-refuter.md`, `scenario-runner.md`, `verifier.md`, `verify-profile-common.md`). Two files keep literals, and the prompts test allows exactly these: `_common.md`'s definitions above, and `env-detector.md`'s `.gitignore` lines.

Specific edits:
- `env-detector.md`: step 1 creates `<sdlc>/` and `<sdlc>/slices/`; step 2 checks `.gitignore` for `.sdlc/STOP`, `.sdlc/tracker/`, `.sdlc/runs/*/STOP` and `.sdlc/runs/*/tracker/`; the inputs gain `runId`; the config section gains "`runId`: the `runId` input. A resume keeps it. A `runId` input that differs from an existing `config.runId` is an error: report it and stop."
- `state-schema.md`: `config.json` gains `"runId": ""`, described as "the run's name (section 1 of the concurrent-runs design); `""` for a run started before run ids existed". The STOP and tracker paragraphs name `<sdlc>/STOP` and `<sdlc>/tracker/`.
- `commit-state.md`: `git add <sdlc> .gitignore` at both sites. In the `direct` and `mr` arm with no remote, `git update-ref refs/heads/<defaultBranch> HEAD` becomes a compare-and-swap: read `OLD=$(git rev-parse <defaultBranch>)` before the `--ff-only` merge, then `git update-ref refs/heads/<defaultBranch> HEAD "$OLD"`. When it fails, the branch moved under you: merge `--ff-only <defaultBranch>` once more and retry once; then report and stop.
- `integrator.md`: the same compare-and-swap at its `update-ref` site.
- `state-reader.md`: the script call carries `--run "<runId>"`, and so does the janitor call. The input list gains `runId`.
- `slicer.md`: the informational `branch` field is `<slice branch>` (branch-format spec), which now carries the run segment.

### 8. Documentation

- `README.md`: "The run worktree" becomes "Runs": one worktree per run at `.claude/worktrees/sdlc-<id>`, state under `.sdlc/runs/<id>/`, the id derivation with one example, `--run`, the lock, and that `/sdlc stop`, `status` and `tracker` take a spec or an id. The Usage table gains `--run <id>` and the optional argument on the three commands. "What it writes to your repo" lists `.sdlc/runs/<id>/`. The Development tree lists `runs.py`. The two sentences that quote `.claude/worktrees/sdlc-run` are updated.
- `prompts/ste-style.md` is unchanged; every prompt edit passes `ste-check.py`.

## Edge cases

- **The same spec in two sessions.** The second launch sees a `live` lock and ends with the message in 4.2. No worktree is touched.
- **A session crashed mid-run.** Its lock goes `stale` 45 minutes after the last journal write. The next `/sdlc <spec>` anywhere takes the run over. The user can delete the lock file to skip the wait.
- **`/loop` backoff.** A `waiting` or `stalled` run relaunches after 30 minutes; its journal is at most about 31 minutes old then, under the 45-minute rule, so nobody takes it over in between.
- **Two specs with the same file name.** The second gets a hash suffix. `/sdlc stop <id>` with the full id, or with the spec path, reaches it.
- **A run in flight from before this change, and a new run beside it.** The legacy run uses `.sdlc`, `sdlc-run`, `sdlc/S-001`, `$REPO/.sdlc/STOP` and `$REPO/.sdlc/tracker/`; the new run uses `.sdlc/runs/<id>`, `sdlc-<id>`, `sdlc/<id>/S-001`, `$REPO/.sdlc/runs/<id>/STOP` and `$REPO/.sdlc/runs/<id>/tracker/`. The legacy janitor's sweep stops at the first `/` after the prefix, and the new janitor sweeps its segment only. Both can run.
- **A finished run's state at the root of `.sdlc/`** (as this repository has today): a legacy run that is `finished`. A new spec is a new run under `.sdlc/runs/<id>/`. The root files stay as history.
- **`--run` on a resume naming a different id.** Refused with both ids by the driver, and by the env-detector should a stale driver reach it.
- **The default branch moves under run A because run B merged a slice.** Run A's state reader fetches and reads `origin/<defaultBranch>` as today; `.sdlc/runs/b/` appears in its worktree and is never staged by its commits. A rejected push is the existing "sync, then retry" path.
- **`direct` mode with no remote.** The compare-and-swap in section 7 turns a lost race into one retry, never a silently dropped commit from the other run.
- **`mr` mode from the same working branch twice.** Refused at pre-flight (4.2). Two `mr` runs need two feature branches, one per session.
- **`stack` mode.** Two run branches `sdlc/a/run` and `sdlc/b/run`, milestone branches `sdlc/a/M-1` and `sdlc/b/M-1`, each advancing onto the default branch on its own. `advance_run_branch` is unchanged.
- **A forge rule that forbids `/`.** The branch-format pre-flight's samples carry the run segment and fail before launch, with the rule and a suggestion. A format like `feature/{name}` gives `feature/branch-format/S-001`, which most "starts with feature/" rules accept.
- **Two gates at once.** The second blocks on the shared slot until the first releases it, the existing wait. An agent cut off while waiting reports `infra`, which is retried outside the round economy.
- **The hook's cwd is the owner's checkout.** It cannot know which run's agent fired, so it pokes every live watcher under the checkout. A watcher rebuilds `live.js` from its own journal.
- **A paused run's scratch directories older than `janitorDays`.** Reaped by any run's janitor, as today for the same run. A resumed verifier recreates its worktree.
- **`git worktree remove` at loop end.** It names `$WT` only. `git worktree prune` in the janitor removes registrations of deleted directories, which is harmless to a live worktree.

## Testing

**`test/runs.test.mjs`** (new; runs `runs.py` through `execFileSync` and imports it in a probe for the Python API)
- `derive_id strips the date and the design suffix and slugs the rest`: the four rows of section 1's table, plus `Foo--Bar.md` giving `foo-bar`.
- `validate_id accepts the empty id and rejects uppercase, a leading dash and 41 characters`.
- `state_dir, worktree_dir and scratch_prefix give today's values for the empty id`.
- `resolve finds a run by spec through its worktree, through its run file before bootstrap, and by id`: fixtures with a registered worktree holding `config.json`; with a run file only; by `--run`.
- `resolve suffixes a colliding id and keeps a same-spec id`: an existing `runs/branch-format/config.json` with another `specPath` gives `branch-format-<6 hex>`; with the same `specPath` gives `branch-format`.
- `list reports worktree, lock liveness and landed state`: a lock whose journal dir was touched now is `live`; one touched 46 minutes ago is `stale`; a missing journal dir is `stale`.
- `write-run-file creates the tracker dir with its .gitignore`.

**`test/branches.test.mjs`** (branch-format spec)
- `tail, name and parse round-trip every kind with a run segment`: for each kind under `sdlc/{name}` and `feature/PROJ-1-{name:lower}`, with `run="a-b"`; `parse` returns `run: "a-b"`.
- `the run kind is run-<n> without a segment and run with one`: `sdlc/run-1` parses to `run`, `n: 1`, `run: ""`; `sdlc/a-b/run` parses to `run`, `run: "a-b"`; `sdlc/a-b/run-1` is not a loop branch.
- `list --run filters to one run, the empty one included`.
- `preflight samples carry the segment`: with `--run a-b`, every sample name contains `a-b/`.

**`test/next-action.test.mjs`**
- `a second run's config on the default branch does not re-bootstrap this one`: `origin/main` holds `.sdlc/runs/a/config.json` and `.sdlc/runs/b/config.json` with different specs; `--run a` decides from `a`'s state.
- `one run's stop file stops that run only`: `<main>/.sdlc/runs/a/STOP` present; `--run a` gives `stop` with reason `A: .sdlc/runs/a/STOP exists`; `--run b` does not stop. The existing legacy STOP tests pass unchanged.
- `the active slice branch is this run's`: branches `sdlc/a/S-001` and `sdlc/b/S-001`, each in progress on its own ledger; `--run a` checks out `sdlc/a/S-001`.

**`test/scripts.test.mjs`**
- `two runs' janitors leave each other's branches alone`: branches `sdlc/a/S-001-v1-ui-0`, `sdlc/b/S-001-v1-ui-0` and legacy `sdlc/S-001-v1-ui-0`, ledgers where none knows the others' ids; `--run a` deletes only its own; `--run ""` deletes only the legacy one.
- `state-write stages the run's state directory only`: a commit from a worktree holding `.sdlc/runs/a/` and `.sdlc/runs/b/` changes stages `a`'s files.
- `the suite slot is shared by two worktrees of one repo`: `slot --repo <wt-a>` held; `slot --repo <wt-b> --timeout 0` prints `busy`; `slot-release --repo <wt-b>` frees it.
- `receipts and the baseline live under the state directory`.

**`test/tracker.test.mjs`**
- `two watchers with two out dirs run side by side`: distinct pid files; neither exits when the other starts.
- `the default out dir and the hub entry id follow the run`: `--run a --main-root /x/repo` gives `<repo>/.sdlc/runs/a/tracker` and the entry id `repo-a`; the empty id gives today's.

**`test/hooks.test.mjs`**
- `the hook pokes every live watcher under the checkout`: `.sdlc/tracker/watch.pid`, `.sdlc/runs/a/tracker/watch.pid` and `.sdlc/runs/b/tracker/` without a pid file; the first two `poke` files are touched, the third is not.

**`test/economy.test.mjs`**
- `the run id reaches the stop path, the state dir and the verify branches`: `runId: 'a'` with `mainRoot: '/owner/checkout'`; every prompt matches `/owner/checkout/.sdlc/runs/a/STOP` and `State dir: .sdlc/runs/a`; the verify branch labels carry `a/`; a reader reason containing `.sdlc/runs/a/STOP` finishes `paused`. The existing legacy assertions pass with no `runId`.

**`test/prompts.test.mjs`**
- `no prompt spells the state directory or a scratch prefix literally`: for every prompt file, no `.sdlc/` or `.sdlc` outside the allowed definitions in `_common.md` and the `.gitignore` lines in `env-detector.md`; no `$TMPDIR/sdlc-`.
- `_common.md defines the state directory, the scratch prefix and the script argument`: `<sdlc>`, `<scratch>`, `--run "<runId>"`.
- `SKILL.md resolves the run before the worktree and never names the fixed paths`: matches `runs.py" resolve`, `sdlc-<runId>` or `$WT`, `$STOP`, `$TRACKER/lock`, `/sdlc stop [<spec>|<id>]`; no `worktrees/sdlc-run` and no `$REPO/.sdlc/STOP`.
- `README.md describes runs`: matches `.claude/worktrees/sdlc-<id>`, `.sdlc/runs/<id>/`, `--run <id>`.
- The existing STE test covers every edited prompt.

## Files

| File | Change |
|---|---|
| `skills/sdlc/runs.py` | new: the run id, the paths, the registry and the lock liveness |
| `skills/sdlc/branches.py` | the run segment in `tail`, `parse`, `list_kind`, `load_format`, `preflight` |
| `skills/sdlc/SKILL.md` | the **Run** bullet, the per-run worktree, the lock, `--run`, the three commands' argument, per-run cleanup |
| `skills/sdlc/sdlc-loop.js` | `RUN_ID`, `STATE_DIR`, `STOP_FILE`, the preamble lines, `branchName`, the pause match, `INTERNALS` |
| `skills/sdlc/next-action.py`, `state-write.py`, `janitor.py`, `suite-receipt.py` | `--run`; the state directory; run-filtered branch calls; the shared slot lock |
| `skills/sdlc/tracker/collect.py`, `reports.py` | `--run`, `--main-root`; the state directory; the entry id |
| `hooks/live-poke.py` | pokes every live watcher under the checkout |
| `skills/sdlc/prompts/_common.md` | the four bullets of section 7 |
| `skills/sdlc/prompts/env-detector.md`, `state-schema.md`, `commit-state.md`, `integrator.md`, `state-reader.md` | the specific edits of section 7 |
| every prompt in `skills/sdlc/prompts/` | `<sdlc>/` for `.sdlc/`, `<scratch>` for `$TMPDIR/sdlc-` |
| `README.md` | the Runs section, the Usage table, the tree |
| `skills/sdlc/test/runs.test.mjs` (new), `branches.test.mjs`, `next-action.test.mjs`, `scripts.test.mjs`, `tracker.test.mjs`, `hooks.test.mjs`, `economy.test.mjs`, `prompts.test.mjs` | the cases above |

## How to verify

On one checkout with two approved specs, open two sessions. Run `/sdlc docs/a.md` in the first and `/sdlc docs/b.md` in the second. Both launch: two worktrees under `.claude/worktrees/`, two entries on the hub's index, two state directories under `.sdlc/runs/`. Run `/sdlc stop a` in the second session: the first run pauses after its current agent, the second keeps going, and `/sdlc status` lists `a` as `paused` and `b` as `live`. Run `/sdlc docs/a.md` in the second session while the first still holds the run: it is refused with the lock message. Let the first session resume `a`; both finish; the default branch holds `.sdlc/runs/a/` and `.sdlc/runs/b/`, and `git branch --list 'sdlc/*'` is empty.
