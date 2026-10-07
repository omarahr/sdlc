# Run isolation, step-boundary pause, and Simplified Technical English

Date: 2026-10-07
Status: approved design, implementation pending

## Intent

Three operational requirements from the plugin's owner:

1. **The loop always runs in a worktree.** Today the loop's agents work directly in the owner's checkout: implementers and verifiers check out slice branches there, the integrator checks out `<defaultBranch>`, and every merge happens in the owner's working tree. A run therefore takes over the project's checkout for days, and any uncommitted owner state is exposed to agents and can collide with slice work.
2. **The stop signal pauses at the last running agent.** Today `.sdlc/STOP` is checked once per iteration (`next-action.py` action A), so the current iteration — often a whole slice: plan → tests → implement → verify → review → gate → integrate — finishes before the run exits. The owner's words: "stop should pause after the last current running agent."
3. **All prompting and agent communications use Simplified Technical English (ASD-STE100 rule set).** Prompt files today mix prose styles; the owner wants the discipline of STE rules (imperative, active voice, one instruction per sentence, short sentences, no idioms) across all agent-facing and status-facing text.

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Worktree model | One worktree per run: `.claude/worktrees/sdlc-run` on branch `sdlc/run-<n>`; relaunches reuse it; removed when the run ends done/stopped/stuck/livelock |
| Pause granularity | After the last currently-running agent finishes; no new agent starts |
| Stop signal | One signal (`/sdlc stop` → `.sdlc/STOP`) now means pause-at-step; resume is `/sdlc <spec>` (existing flow) |
| STE strictness | Style-level: the STE rule set, not the licensed word list; measurable rules test-enforced |
| STE coverage | Agent-facing prompts, loop log lines, STATUS.md, hub/report text, and agent-written outputs (reports, ADRs). Code comments, commit messages, and test names stay normal English |

### Non-goals

- Shipping the full ASD-STE100 word list as a linter data file (it is an ASD-licensed document; we adopt the rule set, not the list).
- Remote-branch sweeping by the janitor (local only, as decided in the janitor review).
- Changing `gitMode` semantics for `pr`, `mr`, and `stack` (only `direct` changes mechanically, by necessity of the worktree).

## Design

### 1. Worktree per run

- **Creation (driver):** before launching the loop, the `/sdlc` driver ensures the run worktree exists: `git worktree add .claude/worktrees/sdlc-run -b sdlc/run-<n>` (`<n>` = run counter + 1; reuse the existing worktree on relaunch, after `git -C <worktree> rebase <defaultBranch>` — a failed rebase falls back to `git pull --ff-only`, and a dirty worktree is reset only with the owner's consent). The driver passes `REPO = <worktree path>` to the loop via its `args`.
- **Default-branch hygiene:** the loop's agents treat the worktree as the only working tree. The owner's checkout is never touched by agents.
- **Merging (direct mode, integrator prompt change):** the integrator no longer runs `git checkout <defaultBranch>` inside the run worktree (git forbids checking out a branch another worktree holds — the owner's checkout owns `<defaultBranch>`). Instead:
  1. sync the run branch onto the default-branch tip: `git fetch origin <defaultBranch>` and `git merge --ff-only origin/<defaultBranch>` (abort the merge and report when this fails);
  2. `git merge --squash sdlc/<id>` and commit as today;
  3. update the default branch: `git push origin HEAD:<defaultBranch>` (a fast-forward by construction after step 1) — origin is the source of truth and the owner's checkout fast-forwards on its next pull; the `"pending"`-replacement evidence commit is a second push of the same shape;
  4. **no-remote fallback:** when `origin` does not exist, update the ref in place — `git update-ref refs/heads/<defaultBranch> HEAD` — and append a `note` log line telling the owner their checkout must run `git pull --ff-only` (and that a dirty checkout may need to stash first). The branch-ref move is refused by git for a branch another worktree holds only via `git branch -f`; `update-ref` deliberately bypasses it and the note covers the owner's working tree.
- **Merging (pr/mr/stack):** unchanged — they push `sdlc/<id>` and merge remotely.
- **`stack` mode:** the milestone branch replaces `<defaultBranch>` in the rules above, exactly as the current prompt already says.
- **Cleanup (driver):** when a run exits with reason `done`, `stopped`, `stuck`, or `livelock`, the driver removes the run worktree (`git worktree remove`) and deletes `sdlc/run-<n>` (slice state is committed to `<defaultBranch>`; the run branch holds nothing unique). Exits `stalled`, `waiting`, or `paused` keep the worktree for the relaunch.
- **State paths:** `.sdlc/` is committed, so the worktree holds a full copy; `tracker/` is per-checkout (git-ignored) and stays with the owner's checkout — the tracker watch runs there, not in the worktree.

### 2. Stop = pause after the last running agent

- **Constraint:** a workflow script has no filesystem access, so the loop cannot probe `.sdlc/STOP` itself. The probe rides the agents, with the existing iteration-top check as the cheap fast path.
- **Check points:**
  1. **Iteration top (existing):** the state-reader runs `next-action.py`, which returns `action: 'stop'` when the STOP file exists (`next-action.py:245`). The loop passes the main checkout root (`A.mainRoot`) to the script so the check resolves against the owner's checkout, not the worktree (STOP is git-ignored; the worktree never has it).
  2. **Agent start (new):** every agent's prompt preamble (from `run()`) and `_common.md` say: check for `.sdlc/STOP` under `<mainRoot>` before starting work. If it exists, do nothing and return your normal result shape with `stopRequested: true`. Every loop schema gains the optional boolean property `stopRequested`.
- **Signal path:** `run()` sees `stopRequested` in a result, sets a run-wide `stopHit` flag, and returns `null` (parallel() swallows exceptions — the flag, not a throw, carries the signal past it). Every site that consumes agent results (`verifyPhase`, `reviewPhase`, `planPhase`, `testsPhase`, `buildLoop` round paths, `milestoneAction`, `audit`, `barRaiserRound`) calls a `checkStop()` guard immediately after each await; the guard throws a stop sentinel that unwinds through the action to `main()`, which catches it and returns `finish('paused', 'stop requested; last agent finished', history)`. No counter is persisted and no fix round is spent on the unwind path (the guards run before any counter increment or persist).
- **Semantics the owner sees:** the agents already running when `/sdlc stop` lands finish their real work normally (they checked STOP before their start). Agents asked to start after the file appears return immediately as `stopRequested` no-ops. Nothing new starts after the last already-running agent ends.
- **State consistency:** counters persist at round ends (existing rule), so the slice resumes at its persisted phase. In-memory round state (the verify plan, pending pairs) is dropped — a resumed run replans, which is today's resume rule already. One no-op agent may be spent per pause; it is recorded in the journal like any agent.
- **Driver semantics (SKILL.md):** `/sdlc stop` still only touches `.sdlc/STOP`; its user-facing description changes from "the current iteration finishes first" to "the current agent finishes first, then the run pauses". The `paused` reason joins `stalled`/`waiting` in the keep-the-worktree set, and the driver does not auto-relaunch a `paused` run (the owner asked to stop); `/sdlc <spec>` resumes.
- **Interaction with `wait`:** a paused run and a waiting run are different reasons; both keep the worktree; neither auto-relaunches on a stop file.

### 3. Simplified Technical English rules

- **Rule source:** `prompts/ste-style.md` — the STE rule set in one page: write in imperative mood; use active voice; one instruction per sentence; keep sentences to 20 words or fewer; no idioms, humor, hyperbole, or emphasis; no rhetorical questions; use the verb's procedural meaning (`check` for verification with evidence, `confirm` for reading a result), permit technical nouns (STE's Technical Names rule); no emphasis punctuation (`!`, ALL-CAPS words).
- **Applies to:**
  - every agent-facing prompt file (`prompts/*.md`) — rewritten in one mechanical pass;
  - the loop's `log()` strings (they appear in STATUS.md and the tracker) — rewritten to STE;
  - STATUS.md and the hub's rendered text (`tracker/hub.py`, `template.html`, `reports.py`) — rewritten to STE;
  - agent-written outputs (verify/review reports, REPORT.md, ADRs, evidence notes) — `_common.md` gains one rule: "Write all reports, notes and status text in the style of ste-style.md."
- **Enforcement:** `ste-check.py` lints every prompt file for the measurable rules: sentence length > 20 words, `!` emphasis, ALL-CAPS words (outside code spans and defined terms), a banned-pattern list (idioms, "please", rhetorical markers), multiple imperative verbs in one sentence (heuristic: count unquoted verb-initial clauses). It runs in `prompts.test.mjs` on every prompt file. Log strings and hub text get the same lint in their respective tests. The linter fails the suite with the file, line, and rule.
- **Style guide for contributors:** the plan and PR template note that new prompt text follows `ste-style.md`; the linter makes that mechanical.

## Testing

- Worktree: driver-level unit (run worktree creation/reuse/cleanup matrix by exit reason); integrator direct-mode merge flow against a fixture remote (rebase → squash → `push origin HEAD:<defaultBranch>`; owner's checkout fast-forwards); loop wiring (`REPO` passed through, STOP resolved at the main root).
- Pause: `run()` stop-probe fires before dispatch (no new agent starts; the running one completes); unwind produces `paused` with the role in the reason; resume replans (existing tests cover); driver keeps the worktree on `paused`.
- STE: `ste-check.py` unit (each rule's positive and negative case); prompt-file lint passes over all rewritten files; log-string and hub-text lint; `_common.md` rule present.
- Existing suites stay green: prompt rewrites update `prompts.test.mjs` assertions, loop rewrites update the economy/slice/verify expectations that quote log text.

## Consequences for existing runs

- A mid-flight run (formengine) resumes under the new driver: on the next `/sdlc <spec>` launch the worktree is created and the loop continues from persisted state; no migration is needed.
- The integrator's direct-mode change applies only to runs launched after this change; an in-flight slice that already merged is unaffected.
