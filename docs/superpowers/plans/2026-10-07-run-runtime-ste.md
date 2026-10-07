# Run Isolation, Step-Boundary Pause, and STE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The sdlc loop always runs in a run-owned worktree, the stop signal pauses after the last running agent, and all prompt/status text follows the ASD-STE100 rule set.

**Architecture:** Driver changes live in `skills/sdlc/SKILL.md` (the /sdlc skill is the driver loop). Loop changes live in `skills/sdlc/sdlc-loop.js` (a Workflow script — **no filesystem access**: every STOP probe rides an agent's structured output plus the existing iteration-top `next-action.py` check). Integrator merge mechanics change in `skills/sdlc/prompts/integrator.md`. STE is a new rule file (`prompts/ste-style.md`), a linter (`skills/sdlc/ste-check.py`), and a three-batch rewrite of all prompt files plus loop log strings and tracker text.

**Tech Stack:** Node ≥ 20 (`npm test`), Python 3 stdlib.

**Spec:** `docs/superpowers/specs/2026-10-07-run-runtime-ste-design.md` — read it first.

## Global Constraints

- Keep the loop's `return await main() // @entry` line and `INTERNALS` export intact; keep the meta.phases list in sync with any `phase()` change.
- Workflow scripts have **no filesystem access**: never add `fs`/shell calls to `sdlc-loop.js`. STOP reaches the loop only via agent results (`stopRequested`) and via `next-action.py` at iteration top.
- Every loop schema change is additive (`stopRequested` is optional, never in `required`).
- Prompt rewrites must preserve semantics exactly: every rule, threshold, Return contract, and input name stays; only sentence structure and wording change to STE. Code spans, `<placeholders>`, and file paths are untouched. `prompts.test.mjs` assertions that quote exact text must be updated to the new wording with the same semantic pin.
- STE style rules (from `prompts/ste-style.md`, created in Task 5): imperative mood; active voice; one instruction per sentence; sentences ≤ 20 words; no idioms, humor, hyperbole, or emphasis (`!`, ALL-CAPS); no rhetorical questions; technical nouns permitted. Applies to prompt text, loop `log()` strings, STATUS/hub text, and agent-written outputs (via a new `_common.md` rule). Does NOT apply to code comments, commit messages, or test names.
- Tests run with `npm test` (node --test). Work on the feature branch; never commit to `main` directly.

## Review Focus

1. **Stop corrupts round state:** a pause must never persist a counter increment or spend a fix round. `checkStop()` guards must run after every agent-consuming await, before any counter/persist logic. Pinned by Task 2's unwind tests (blocked round mid-pause → no fixRounds change in persisted state).
2. **STOP resolves in the wrong tree:** after worktree isolation, the STOP file exists only in the owner's checkout. `next-action.py` must read it from `--main-root`, never from `--repo`. Pinned by Task 1's test (STOP at main root, worktree repo without it → stop action).
3. **Default branch hijack:** the integrator in a worktree must never `git checkout <defaultBranch>` (the owner's checkout owns it). Pinned by Task 4's fixture test: direct-mode merge happens via `push origin HEAD:<defaultBranch>` with the owner's checkout on `<defaultBranch>` untouched and fast-forwardable.
4. **STE rewrite loses a rule:** a prompt rewrite that drops a threshold, an input name, or a Return contract breaks agents silently. Every batch's review diffs each rewritten file against the original rule-by-rule; the linter pins style, the reviewer pins semantics. Pinned per batch by updated `prompts.test.mjs` assertions.
5. **Resume determinism after worktree reuse:** a relaunched run reuses the worktree after syncing it to the default-branch tip; a stale worktree (behind default) must never produce a slice branch from an old tip. The driver is skill text, so the pin is an exact-wording assertion in Task 3 (the executor Claude is the one that follows it); the loop-side half (STOP at main root, counters from the driver file) is pinned by Tasks 1-2's tests.

---

### Task 1: Main-root plumbing — STOP resolves at the owner's checkout

**Files:**
- Modify: `skills/sdlc/next-action.py` (argparse + the STOP check at lines 245-246)
- Modify: `skills/sdlc/prompts/state-reader.md` (run next-action.py with `--main-root`), `skills/sdlc/sdlc-loop.js` (state-reader vars gain `mainRoot`)
- Test: `skills/sdlc/test/next-action.test.mjs`, `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Produces: `next-action.py --repo <worktree> --main-root <owner checkout>` — the STOP check reads `<main-root>/.sdlc/STOP` when `--main-root` is given (missing arg: falls back to `--repo`, preserving old behavior); the loop passes `mainRoot: A.mainRoot` in the state-reader's vars.

- [ ] **Step 1: Failing tests.** next-action.test.mjs: STOP file at main root + `--repo` at a second (worktree) dir + `--main-root` → stop action; same setup without `--main-root` → no stop (fallback to repo). prompts.test.mjs: state-reader.md mentions `--main-root`.
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Implement** — add the `--main-root` argparse option (default None; `repo_for_stop = main_root or repo` in the STOP check); state-reader.md's script invocation line gains the flag with the `mainRoot` input; `run('state-reader', { ..., mainRoot: A.mainRoot || A.repoRoot || '.' })` in `main()`.
- [ ] **Step 4: `npm test` green.**
- [ ] **Step 5: Commit** — `git commit -m "feat(loop): the stop probe resolves at the owner's checkout"`

### Task 2: Stop = pause after the last running agent (loop mechanics)

**Files:**
- Modify: `skills/sdlc/sdlc-loop.js` (all loop schemas, `run()` ~243, consume sites, `main()` ~1140, `INTERNALS`)
- Test: `skills/sdlc/test/economy.test.mjs`, `skills/sdlc/test/slice.test.mjs`

**Interfaces:**
- Produces: optional `stopRequested: { type: 'boolean' }` on every loop schema; `run()` sets a run-wide `stopHit` flag and returns `null` when a result carries `stopRequested: true`; exported `checkStop()` throws `{ stop: true }` when the flag is set; `main()` catches the sentinel around `act(next)` and returns `finish('paused', 'stop requested; the last agent finished', history)`; no persist or counter increment happens after the flag is set on the unwind path.

- [ ] **Step 1: Failing tests** (economy.test.mjs):
  1. "a stopRequested implementer pauses the run without spending a fix round": scripted implementer returns `{stopRequested: true, green: false}` (schema-valid); run ends with state `paused`; the state-writer receives NO patch with `phase` or counters after the implementer's call; `fixRounds` unchanged.
  2. "an agent already running finishes, the next one does not start": first implementer green, then verify-planner returns `{stopRequested: true}`; assert no verify-http-api/verifier agents were dispatched, state `paused`, and the persisted counters still show the phase from before the round's persist.
  3. "a stopRequested agent deep in a parallel group unwinds cleanly": profile agents in the same parallel batch return normal + stopRequested; no collector/regression agents run after the fold; state `paused`.
  4. Existing iteration-top stop test (action A) still ends `stopped`, not `paused` — distinguish the two reasons.
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Implement** in `sdlc-loop.js`:
  - Add `stopRequested: { type: 'boolean' }` to `properties` of every schema the loop reads from agents (OK, COUNT, NEXT, ENV, PLAN, TESTCHECK, FINDINGS, INTEGRATE, VPLAN, TOOLS, PVOTE, VOTE, GATE, SCENARIO_PLAN, HARNESS, SCENARIO_RESULTS, JUDGED, MS_WRITE, AUDIT_PLAN, AUDIT, PROPOSAL, DECISION, IDEAS, BR_STATE — keep it out of `required` everywhere).
  - New run state + guard:

```js
// the stop signal cannot be a throw crossing parallel(): parallel swallows thunk errors into null. The
// flag carries it instead; every site that consumes agent results calls checkStop() before it counts
// anything, so a pause never persists state and never spends a round (2026-10-07 run-runtime spec, §2)
let stopHit = false
function checkStop() {
  if (stopHit) throw { stop: true }
}
```

  - In `run()`: after a successful result, `if (out && out.stopRequested === true) { stopHit = true; return null }` (before the `modelFails` bookkeeping).
  - `checkStop()` calls immediately after every `await` that consumed agent results, before any logic that counts, persists, or increments: in `sliceAction` (after planPhase/testsPhase/buildLoop returns), `planPhase` (after planner run, after critics parallel, after decision panels), `testsPhase` (after each run), `reviewPhase` (after the reports parallel and after each refuter batch), `verifyPhase` (after the toolsmith run, after the main parallel, after the collector run, after the regression/review await), `buildLoop` (after the implementer run and after the verify/review awaits), `gatePhase` (after the gate run), `integrate` (after each integrator run), `milestoneAction` (after harness, each runner batch, judges), `audit` (after planner, each auditor chunk), `barRaiserRound` (after reader, finders, judges, writer), `bootstrap` (after each run), `testReport`, `parkedRetry` (after unpark), `livelock` (after stuck-writer).
  - `main()`: wrap `const outcome = await act(next)` — catch the sentinel:

```js
    let outcome
    try {
      outcome = await act(next)
    } catch (e) {
      if (e && e.stop) return finish('paused', 'stop requested; the last agent finished', history)
      throw e
    }
```

  - Export `checkStop` in `INTERNALS` (tests drive the flag via scripted agents).
- [ ] **Step 4: `npm test` green** (existing tests unaffected — no agent returns `stopRequested` in old fixtures).
- [ ] **Step 5: Commit** — `git commit -m "feat(loop): the stop signal pauses after the last running agent"`

### Task 3: Driver — run worktree, cleanup matrix, paused semantics

**Files:**
- Modify: `skills/sdlc/SKILL.md` (commands, pre-flight, launch args, completion handling, "Whenever the loop ends")
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: Task 1's `mainRoot` arg; Task 2's `paused` state.
- Produces: driver step "ensure the run worktree" (`.claude/worktrees/sdlc-run` on branch `sdlc/run-<n>`; reuse + `git -C <wt> merge --ff-only origin/<defaultBranch>` on relaunch — dirty worktree is never reset without the owner's say-so); `Workflow` args gain `repoRoot: <worktree>, mainRoot: REPO`; cleanup matrix: remove worktree + delete run branch on `done`/`stopped`/`stuck`/`livelock`/smoke-run/`waiting`-or-`stalled` without `/loop`; keep on `paused` and on `waiting`/`stalled` under `/loop`; `/sdlc stop` description becomes "the current agent finishes first, then the run pauses".

- [ ] **Step 1: Failing assertions** in prompts.test.mjs (SKILL.md is text — pin: `sdlc-run` worktree path, `mainRoot`, the paused-keeps-worktree rule, the stop wording "the current agent finishes first").
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Edit SKILL.md:**
  - `/sdlc stop` line: "touch `$REPO/.sdlc/STOP`. Tell the user that the current agent finishes first, then the run pauses, and that `/sdlc <spec>` resumes it."
  - Pre-flight gains: ensure `.claude/worktrees/` is git-ignored (report and add to `.gitignore` if not); ensure the run worktree (create with `git worktree add .claude/worktrees/sdlc-run -b sdlc/run-<n>` where `<n>` = (count of `sdlc/run-*` branches) + 1; on relaunch reuse it and `git -C <wt> merge --ff-only origin/<defaultBranch>` or `git -C <wt> pull --ff-only`; if the worktree is dirty, report and end — uncommitted work there is the owner's).
  - Launch args: `repoRoot: "<worktree path>", mainRoot: REPO`.
  - Completion handling: `paused` (new bullet): "the owner asked to stop: print the top of STATUS.md, keep the worktree, end. `/sdlc <spec>` resumes. Under `/loop`, call `ScheduleWakeup({stop: true})`." The "Whenever the loop ends" bullet gains: remove the run worktree (`git worktree remove .claude/worktrees/sdlc-run`) and delete the run branch (`git branch -D sdlc/run-<n>` — safe: slice state is committed to `<defaultBranch>`; a refusal means unmerged work: report, keep both, end).
- [ ] **Step 4: tests green.**
- [ ] **Step 5: Commit** — `git commit -m "feat(driver): the loop runs in a run-owned worktree; paused keeps it"`

### Task 4: Integrator — direct-mode merge from inside the worktree

**Files:**
- Modify: `skills/sdlc/prompts/integrator.md` (direct-mode ship steps; the low-risk Final check's build/typecheck stay as-is), `skills/sdlc/prompts/state-schema.md` (document `mainRoot` input)
- Test: `skills/sdlc/test/prompts.test.mjs`, `skills/sdlc/test/git-modes.test.mjs`

**Interfaces:**
- Consumes: the run worktree (Task 3).
- Produces: direct-mode merge = sync run branch to `<defaultBranch>` tip (`git fetch origin <defaultBranch>` + `git merge --ff-only origin/<defaultBranch>`; on failure report and return `{state: 'inconclusive'}`), `git merge --squash sdlc/<id>`, commit, `git push origin HEAD:<defaultBranch>`; evidence-sha commit and second push; no-remote fallback: `git update-ref refs/heads/<defaultBranch> HEAD` + a `note` log line telling the owner to run `git pull --ff-only` in their checkout.

- [ ] **Step 1: Failing tests.** prompts.test.mjs: integrator.md direct-mode block contains `HEAD:<defaultBranch>` push, the ff-only sync, the `update-ref` fallback, and does NOT contain `git checkout <defaultBranch>`. (git-modes.test.mjs just stays green — it tests the loop's mode plumbing, not the prompt text.)
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Edit integrator.md** — replace the `direct` mode steps 1-2 merge mechanics with the sync → squash → `push origin HEAD:<defaultBranch>` flow (spec §1); keep the commit message formats, branch deletion, and every other rule; note the owner's checkout fast-forwards on its next pull.
- [ ] **Step 4: tests green.**
- [ ] **Step 5: Commit** — `git commit -m "feat(prompts): direct-mode merges push from the run worktree"`

### Task 5: STE rule source + linter

**Files:**
- Create: `skills/sdlc/prompts/ste-style.md`, `skills/sdlc/ste-check.py`
- Modify: `skills/sdlc/prompts/_common.md` (one rule: all reports, notes and status text follow ste-style.md)
- Test: `skills/sdlc/test/scripts.test.mjs` (ste-check unit), `skills/sdlc/test/prompts.test.mjs` (_common rule pin)

**Interfaces:**
- Produces: `python3 ste-check.py <files...>` → exit 0 clean / exit 1 with `file:line: rule — text` per violation; rules: sentence > 20 words; `!` emphasis; ALL-CAPS words outside code spans (`` ` ``) and defined placeholders (`<skill>`, `<defaultBranch>`, `<n>`, `<id>`, `<lens>`, `<round>`, `<profile>`, `<part>`, `<baseBranch>`, `<milestoneId>`, `<sliceId>`, `<state>`, `<file>`, `<spec>`); banned patterns (`please`, `simply`, `just`, `obviously`, `of course`, `nice`, `great`, `!important` prose idioms like `keep in mind`, `make sure`); multiple imperative clauses per sentence (heuristic: > 2 finite verbs outside code spans). `_common.md` gains: "Write all reports, notes and status text in the style of `ste-style.md`."

- [ ] **Step 1: Failing tests** — ste-check unit cases: each rule's clean line and dirty line; a real prompt file sample. prompts.test.mjs: `_common.md` mentions ste-style.
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Implement** `ste-style.md` (the one-page rule set from the spec §3, written IN STE style) and `ste-check.py` (stdlib; sentence splitter over the markdown minus code spans; print one line per violation; exit 1 if any).
- [ ] **Step 4: tests green** (ste-check passes on ste-style.md itself and on _common.md — fix _common.md's new rule text to comply).
- [ ] **Step 5: Commit** — `git commit -m "feat(prompts): STE style rules and ste-check linter"`

### Task 6: STE rewrite — verify family

**Files:** rewrite to STE: `prompts/verifier.md`, `prompts/verify-{async,cli,collector,concurrency,contract,data,http-api,i18n,limits,planner,profile-common,security}.md`, `prompts/gate.md` (14 files); update every `prompts.test.mjs` assertion quoting their text.
- [ ] **Step 1:** For each file: rewrite sentence-by-sentence per the Global Constraints rule; keep every rule, threshold, input, and Return contract; keep ALL-CAPS placeholders inside backticks only.
- [ ] **Step 2:** `python3 ste-check.py` over all 14 — exit 0.
- [ ] **Step 3:** `npm test` green (prompts assertions updated to the new wording, same pins).
- [ ] **Step 4: Commit** — `git commit -m "refactor(prompts): verify family in STE style"`

### Task 7: STE rewrite — build/integrate/state family

**Files:** `prompts/{planner,plan-critic,slicer,implementer,test-writer,test-checker,reviewer,finding-refuter,escalator,decision-judge,decision-proposer,stuck-writer,commit-state,integrator,state-reader,state-writer,state-schema}.md` (17 files) + their assertions.
- [ ] Same step shape as Task 6. **Commit** — `git commit -m "refactor(prompts): build and state family in STE style"`

### Task 8: STE rewrite — bootstrap/behavior/bar family + enforcement wiring

**Files:** `prompts/{_common,audit-planner,auditor,barraiser-reader,barraiser-writer,behavior-judge,completeness-critic,coverage-critic,e2e-harness,env-detector,milestone-planner,milestone-writer,requirements-extractor,run-request,scenario-planner,scenario-runner,bar-finder,bar-judge}.md` (18 files) + assertions.
- [ ] Same shape, **plus**: add the lint gate — `prompts.test.mjs` runs `ste-check.py` over every file in `prompts/` (glob) and fails the suite on any violation. **Commit** — `git commit -m "refactor(prompts): remaining prompts in STE style; the lint gate runs on all of them"`

### Task 9: STE for loop log strings and tracker text

**Files:**
- Modify: `skills/sdlc/sdlc-loop.js` (`log()` string literals only — roles, labels, and schemas untouched), `skills/sdlc/tracker/hub.py`, `skills/sdlc/tracker/template.html`, `skills/sdlc/tracker/reports.py`
- Test: `skills/sdlc/test/economy.test.mjs`, `skills/sdlc/test/slice.test.mjs`, `skills/sdlc/test/hub.test.mjs`, `skills/sdlc/test/tracker.test.mjs` (assertions quoting log/hub text updated; add a lint of rendered hub/report snapshots through ste-check where the test structure allows, else assert the strings directly)

- [ ] **Step 1: Failing tests** — a sample of log-text assertions reworded to STE.
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3:** Rewrite log strings to STE (e.g. `"fix rounds exhausted: ..."` → `"fix rounds: no fix passed: ..."`; `"planner judged too big for one reviewable change"` stays compliant — audit every literal; keep interpolations). Rewrite hub/template/reports rendered text to STE. Keep `log()` message keys that tests match on (role names, slice ids) intact.
- [ ] **Step 4: `npm test` green.**
- [ ] **Step 5: Commit** — `git commit -m "refactor(loop): run logs and tracker text in STE style"`

### Task 10: Docs

**Files:** `skills/sdlc/SKILL.md` (stop wording — done in Task 3; worktree flow), `README.md` (worktree model, pause semantics, STE note)
- [ ] **Step 1:** Failing assertions (README mentions the run worktree, pause, STE). **Step 2:** fail. **Step 3:** edit. **Step 4:** `npm test` green. **Step 5: Commit** — `git commit -m "docs(sdlc): worktree runs, step-boundary pause, STE"`

## Self-review notes (already applied)

- Stop-as-pause mechanism verified against the Workflow script API: no filesystem access, parallel() swallows thunk exceptions — hence the flag + checkStop() design (spec §2 updated before planning).
- The integrator direct-mode change is forced by git's two-worktree rule; `update-ref` fallback covers remote-less repos and is explicit in the owner-facing note.
- Tasks 6-8 change text that agents execute: each batch's review diffs rule-by-rule against the original (Review Focus 4).
