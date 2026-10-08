# Loop economy: bootstrap guards, a lighter implementer, the reporter beside the gate, early-exit votes, scripted bookkeeping

Date: 2026-10-08
Status: approved design, implementation pending

## Intent

The verify-economy change (2026-10-07) fixed the loop's biggest cost: the full suite now runs once per slice, at the gate. Measured on the runs since, the next costs are serial agents that do not need to be serial, agents that repeat work the gate already owns, three-voter panels that could settle on two votes, mechanical roles doing by hand what a script does in seconds, and one failure mode that burned a whole day.

Evidence, from the workflow journals (`subagents/workflows/wf_*/journal.jsonl` plus the `agent-*.jsonl` transcripts beside it, read with `tracker/workflow.py`):

1. **formengine, 2026-10-06** (`claude-opus-5-5`, plugin 0.4.0, before the gate): 51.2 wall-hours, 634 agents, parallelism 1.18x. Verify took 70% of wall time; the regression verifier's p90 was 81 min. Implement took 18%: the implementer's median was 15 min, and in a sampled transcript it spent 522 s running the full suite and 689 s timing the base branch, 20 of its 23 minutes. Both runs are now the gate's job, so the implementer repeats them for nothing.
2. **formengine-liveness, 2026-10-08** (`glm-5.3-flash`, main HEAD with the gate): 21.1 wall-hours, 352 agents, parallelism 1.82x. The gate works: the regression verifier's p90 fell to 10 min and the gate's median is 6 min. What remains: Review took 18% of wall time, with 45 finding-refuter agents (6.4 agent-hours) judging 15 blocking findings three voters each; the test-reporter (median 16 min) sits on the critical path between the gate and the integrator although it only reads recorded evidence; the integrator (median 14.5 min) and the verify-collector (median 3.2 min) spend their time on deterministic bookkeeping. A slice whose full suite runs in 22 s still took 2.6 to 8.4 hours.
3. **formengine, 2026-10-08**: 11 identical bootstraps in a row, 7.9 wall-hours and 110 agents. The bootstrap ledger commit could not reach `main` (the repo's pre-push hook refuses direct pushes, and the run is in `direct` mode), so every iteration read the old `config.json` from `origin/main`, saw the same OVERRIDE count mismatch, and bootstrapped again. The no-progress streak never fired, because the bootstrap outcome string carries the extractor's and slicer's counts, which differed each time. Each re-bootstrap of an unchanged spec also grew the ledger: 448 to 485 requirements and 163 to 177 slices in one day, which lengthens the run and is scope creep, not coverage.

**What the user asked for** (resolved in conversation): "check if we can speed up the sdlc without impacting the quality", then "write this as a spec in the sdlc repo, with as much detail as possible so that the agents don't need to think much about what they need to do."

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Scope | Loop economy only: the five changes below plus a measurement script. Two lanes (parallel slices) and a per-role model map are follow-up specs |
| Bootstrap guard | Two layers: a ledger that did not land ends the run as livelock; three identical re-bootstraps stall it. An override-only bootstrap skips the critics |
| Implementer | Slice tests, the impact set, lint, typecheck, build. No full suite, no base-branch timing: the gate owns both |
| Reporter | Runs beside the gate; the gate moves into its own worktree so the reporter's commit is the only git write in the target repo during that window |
| Majority votes | Two voters first, the third only when the two cannot fix the verdict; verdicts identical to the three-voter panel by construction |
| Bookkeeping | Deterministic steps of the integrator and the verify-collector move into `state-write.py` subcommands; the agents keep judgment, merging and forge work |
| Measurement | `tracker/stats.py` prints the per-phase and per-role table from a run's journal, so the next run shows whether this paid off |

**Assumptions:**
- `impact.py`, `suite-receipt.py` (`slot`, `slot-release`, `baseline`, `write`, `check`) and the gate phase exist as the verify-economy spec left them.
- `state-write.py` keeps its conventions: one JSON object on stdout, exit 2 with `{"ok": false, "error": ...}` when nothing was changed, Python 3 standard library only.
- The test harness compiles `sdlc-loop.js` as one async function and reads pure helpers from `INTERNALS`; `parallel` in tests is `Promise.all` over thunks.

### Non-goals

- Running two slices at once (lanes). It is the next structural lever and gets its own spec after this one is measured.
- A per-role model map in the workflow args. Only useful where the session's gateway can serve a second model.
- Changing `PROFILE_BATCH`, the profile verifiers' time limits, or any verifier prompt.
- Anything in a target repo (suite speed, CI, hooks). The formengine hook conflict is fixed by running that repo in `stack` mode or with its hook's override variable; the loop only has to stop cleanly when it happens.
- Changing the report format of REPORT.md, STATUS.md or the tracker pages, beyond one Appendix line.
- A release or version bump. That is a separate PR.

## Design

### 1. Bootstrap guards

#### 1.1 The decision names its kind

`next-action.py` already has three bootstrap arms. Each gains a `bootstrapKind` field:

| Arm (`decide`, section A) | `bootstrapKind` | `reason` (unchanged) |
|---|---|---|
| `config.json` missing | `"fresh"` | `A: .sdlc/config.json is missing` |
| spec hash differs | `"spec-changed"` | `A: the spec <path> changed since the last bootstrap` |
| OVERRIDE count differs | `"override"` | `A: DECISIONS.md has <n> OVERRIDE entries, config has seen <m>` |

The loop's `NEXT` schema gains `bootstrapKind: { type: 'string', enum: ['fresh', 'spec-changed', 'override'] }`, optional. A decision without it (an older script) behaves as `fresh`.

#### 1.2 An override-only bootstrap reconciles; it does not re-extract

An `OVERRIDE` ADR changes no spec text. The critics' job is spec coverage, which they already did, so they do not run again. `bootstrap(next)` in `sdlc-loop.js` becomes:

```js
async function bootstrap(next) {
  const P = 'Bootstrap'
  phase(P)
  const kind = next.bootstrapKind || 'fresh'
  const env = await run('env-detector', { specPath: A.specPath || null, gitMode: A.gitMode || null, commitFormat: A.commitFormat || null, defaultBranch: A.defaultBranch || '' }, { schema: ENV, phase: P })
  checkStop()
  if (!env) return 'bootstrap aborted: env-detector failed'
  const ext = await run('requirements-extractor', { reason: next.reason, mode: kind === 'override' ? 'reconcile' : 'extract' }, { schema: COUNT, phase: P })
  checkStop()
  if (!ext) return 'bootstrap aborted: requirements-extractor failed'
  // an override changes no spec text, so the critics' coverage check from the last bootstrap stands
  let dry = kind === 'override'
  let round = 0
  while (!dry && round < CRITIC_ROUND_LIMIT) {
    const outs = await parallel(CRITIC_LENSES.map(lens => () =>
      run('completeness-critic', { round, lens }, { schema: COUNT, phase: P, label: `r${round}:${lens}` })))
    checkStop()
    round++
    dry = outs.every(c => c && c.added === 0)
  }
  if (!dry) log(`completeness critics stopped at the ${CRITIC_ROUND_LIMIT}-round limit without a dry round`)
  // the slicer groups unsliced requirements; an override that added or reopened none leaves it nothing to do
  let sl = { added: 0 }
  if (kind !== 'override' || (ext.added || 0) > 0 || (ext.reopened || 0) > 0) {
    sl = await run('slicer', {}, { schema: COUNT, phase: P })
    checkStop()
    if (!sl) return 'bootstrap aborted: slicer failed'
  }
  const w = await run('state-writer', { op: 'bootstrap-complete' }, { schema: OK, effort: 'low', phase: P })
  checkStop()
  // a ledger that only exists on a branch the next run does not read is the loop of 2026-10-08: stop for a human
  if (w && (w.ok === false || w.landed === false)) return { livelock: `bootstrap ledger did not land: ${w.notes || 'no notes'}` }
  return `bootstrap (${kind}): ${ext.added} extracted, ${ext.reopened || 0} reopened, ${round} critic rounds, ${sl.added} slices added${w ? '' : ' (ledger commit unconfirmed)'}`
}
```

`requirements-extractor.md` gains the `mode` input. Replace its `Inputs` line and add one block before "Do not commit":

```markdown
Inputs: `reason`, `mode` (`extract` or `reconcile`).

**`mode: reconcile`** (a human override arrived; the spec text did not change):
- Read `.sdlc/DECISIONS.md` and the ledger. Do not read the spec for coverage.
- An override is applied when every requirement its `Affects` line names carries the note `override <ADR id> applied`.
- Apply every `OVERRIDE` ADR that is not applied yet, with the "Existing ledger" rules above. Add that note to each requirement you touched.
- Add a new requirement only for a behavior the override states and no entry covers.
- The critics do not run in this mode.
```

The `extract` mode is today's behavior, unchanged.

#### 1.3 The ledger must land, or the run stops for a human

`state-writer.md`, op `bootstrap-complete`, gains a fourth step and a stricter return:

```markdown
4. Report where the commit landed. `landed` is `true` only when the ledger reached the branch `next-action.py` reads:
   - `direct` and `mr` mode: the push to `<defaultBranch>` succeeded, or the `update-ref` with no remote succeeded;
   - `pr` mode: the state pull request was created;
   - `stack` mode: the commit on `runBranch` succeeded.
   When a push or a pull request fails, retry it once. When it fails again, return `{ok: false, landed: false, notes: "<the command and its error text>"}`. The loop then stops the run for a human. Never return `ok: true` for a ledger that exists only on a local branch the run does not read.
```

The `OK` schema in the loop gains `landed: { type: 'boolean' }`, optional. A `null` answer from the state-writer (it failed to report twice) is not a livelock: the outcome string says `ledger commit unconfirmed` and the streak guard (1.4) covers a repeat.

`main()` learns the livelock sentinel. Right after `outcome = await act(next)` and its `catch`:

```js
    // an action that cannot go on without a human returns { livelock }: STUCK.md names the decision, the driver ends
    if (outcome && outcome.livelock) {
      const reason = outcome.livelock
      history.push({ action: next.action, sliceId: next.sliceId || null, outcome: reason })
      return finish('livelock', await livelock({ reason, summary: reason }), history)
    }
```

`livelock(next)` already runs the stuck-writer and returns `next.summary || next.reason`. `stuck-writer.md` gains the new case. Add after its first paragraph:

```markdown
Inputs: `reason`.

When `reason` starts with `bootstrap ledger did not land`, the run stopped because its state could not be committed where the next run reads it. Then STUCK.md starts with that reason, the command and the error it quotes, and the smallest human decision: allow the push (for example a hook override variable), start the run with a different `--git` mode, or merge the run branch by hand. The parked-slice sections below follow, one per parked slice, when there are any. When your own commit cannot be pushed, keep it local and say so in `notes`: the driver prints STUCK.md from the worktree.
```

The driver (`SKILL.md`) already prints STUCK.md on `livelock`, removes the worktree and ends the loop. Nothing changes there.

#### 1.4 The streak sees a repeated bootstrap

The no-progress key for a bootstrap drops the outcome text, whose counts vary, and uses the kind:

```js
    const key = next.action === 'bootstrap'
      ? `bootstrap|${next.bootstrapKind || 'fresh'}`
      : `${next.action}|${next.sliceId || next.milestoneId || ''}|${outcome}`
```

Three consecutive bootstraps of the same kind with no other action between them reach `STREAK_LIMIT` and `stall()` as any other repeat does. A landed bootstrap is followed by a slice or milestone action, which resets the streak, so a legitimate second bootstrap never stalls.

`state-reader.md` tightens one line so decorated reasons stop varying: replace "mention its failures at the end of `reason`" with "Append the janitor's failures to the end of `reason`, and only those. When the janitor ran clean, append nothing."

### 2. The implementer runs the slice set

The gate is the only full-suite run and the only test-time budget check (verify-economy spec, sections 1 and 2). The implementer repeats neither. In `implementer.md`, replace step 5 and its paragraph with:

```markdown
5. **Run all of these**, and fix until every command is green:
   - the slice's tests from tests.md;
   - the impact set. Print it with `python3 "<skill>/impact.py" --repo . --base <baseBranch> --head HEAD`. Run every file in `testFiles` and every package in `packages` with the repo's test runner. When the script fails or prints nothing usable, run the test files of the packages the diff touches. Name them from `git diff --name-only <baseBranch>...HEAD`;
   - `evidence.tests` of every `done` requirement whose `evidence.files` intersect the diff;
   - `lint`, `typecheck` and `build`, when `config.commands` sets them.

   Do not run the full `config.commands.test`, and do not time the suite. The gate runs the full suite on the final commit. It refutes the slice when the suite grows by more than max(60 s, 20 %) of wall time. Write tests with that budget in mind: tests that need an expensive setup share it across cases. The setup can be installs, builds, packing or containers. Use one fixture per file, `beforeAll`, or a cached sandbox.

   `<baseBranch>` is what this command prints: `python3 "<skill>/state-write.py" base-branch --repo . --slice <id>`. Use the branch it returns, never one chosen from `gitMode`. If this is the scaffolding slice, fill in the empty `config.commands` first.
```

The return contract changes one phrase: `green` is true only if you ran every command in step 5 after your last change and all passed. `inconclusive` keeps its meaning; a `rerun: "inconclusive"` input re-runs the unfinished commands from step 5. The "Long commands" rule in `_common.md` still applies to a cold build or an e2e run the impact set names.

What this does not change: the slice-scoped regression lens still runs the same impact set adversarially in its own worktree each round; the gate still runs the full suite on the final commit. A cross-package breakage the impact map misses reaches the gate instead of the round and costs one fix round there, the price the verify-economy spec already accepted for the regression lens.

### 3. The gate in its own worktree, the reporter beside it

#### 3.1 The loop

The test-reporter reads recorded evidence and writes REPORT.md; the gate runs commands. They share nothing but the branch. `gatePhase` runs them together and persists only after both returned, so the reporter's commit never races the state-writer's on the one working tree:

```js
async function gatePhase(id, counters, ledger = []) {
  phase('Gate')
  // the test-reporter reads evidence already on disk and commits REPORT.md in the target repo; the gate runs
  // the suite in a worktree of its own. The state-write below waits for both, so nothing commits beside the reporter
  const [out] = await parallel([
    () => run('gate', { sliceId: id }, { schema: GATE, phase: 'Gate', label: id }),
    () => testReport(id, 'ship'),
  ])
  checkStop()
  let g = out
  if (!g) g = { state: 'infra', notes: 'gate agent failed to report' }
  // ... the rest of today's gatePhase, unchanged: pushRow, pass / infra / fail
}
```

`integrate()` loses its first line (`if (mode === 'ship') await testReport(id, 'ship')`). `testReport(id, 'park')` in `escalate()` is unchanged. In `sliceAction`, the gate-fail log line becomes `${id} gate failed: the build loop resumes; REPORT.md is stale until the next gate`.

Consequences the loop accepts:
- A resume at `phase: 'gate'` and a `regate` from the integrator both re-run the pair; the reporter overwrites REPORT.md. The code changed, so the report should change too.
- After a gate fail, REPORT.md says `RELEASED` while the slice is back in the build loop. STATUS.md and the tracker show the slice as in progress; the next gate re-runs the reporter. Accepted, and logged.
- The `phases` sequence seen by tests is unchanged: `Gate`, then `Report` (pushed when the reporter's thunk starts), then `Integrate`.

#### 3.2 The gate prompt

`gate.md` is replaced whole:

```markdown
# Role: gate

Run the full-repo regression lens on the slice's final commit. Write the receipt that authorizes its merge.

Inputs: `sliceId`.

`<repo>` below is the target repo your prompt names. Never check out a branch there: the test-reporter commits there while you run.

1. Confirm the slice branch is clean in `<repo>`: `git status --porcelain -- . ':!.sdlc'` prints nothing. Record the commit: `COMMIT=$(git rev-parse sdlc/<id>)`.
2. Make your scratch worktree. When `$TMPDIR/sdlc-<id>-gate` exists from a crashed attempt, run `git worktree remove --force "$TMPDIR/sdlc-<id>-gate"` first. Then `git worktree add --detach "$TMPDIR/sdlc-<id>-gate" sdlc/<id>`. Run `config.commands.install` inside it when it is set. Run every command of step 4 inside it.
3. Hold the suite slot against `<repo>`, never against the worktree: `python3 "<skill>/suite-receipt.py" slot --repo "<repo>"` (blocks until free). Run it in the background; it keeps holding until `slot-release`. Release it with `python3 "<skill>/suite-receipt.py" slot-release --repo "<repo>"` on every exit path. If the hold blocks across attempts, a previous holder was orphaned: run `slot-release` once and hold again.
4. Run the **full** regression lens from verifier.md inside the worktree. Skip its slot step: you hold the slot from step 3. Run the full `config.commands` test, lint, typecheck and build. Run `config.commands.e2e` when it is set. Run the conformance and fixture suites. Run the test-time budget and the receipt steps with `--repo "<repo>"` and `--ref $COMMIT`. The baseline timing fallback uses a second worktree, as verifier.md says. Follow every other rule there verbatim, including `outcome: "infra"` and the "cut off is not failed" rule.
5. Write your report to `<repo>/.sdlc/slices/<id>/gate-r0.md`, in the `## Suites` format of verifier.md's regression lens, plus the receipt confirmation line. Do not commit it.
6. Remove the worktree on every exit path: `git worktree remove --force "$TMPDIR/sdlc-<id>-gate"`, then `git worktree prune`.

Return `{state: "pass" | "fail" | "infra", failingTest, commit, seconds, notes}`. `commit` is `$COMMIT`.
- `pass` only when every command finished green and the receipt was written with `--result pass` for `$COMMIT`.
- `fail` only for a genuine failing test; `failingTest` names it as `<command> — <test>`.
- `infra` when the run could not produce a verdict; `notes` say what happened.
```

Why `--repo "<repo>"`: `suite-receipt.py` keeps the slot's flock at `<repo>/.sdlc/suite.lock` and the receipt at `<repo>/.sdlc/slices/<id>/verification/suite-receipt.json`. Run from the worktree, both would land in the worktree's own `.sdlc/` and vanish with it. The receipt's `code_id` hashes `git ls-tree <commit>`, which the target repo can answer for any commit the worktree checked out.

#### 3.3 The reporter prompt

`test-reporter.md`, section `## Appendix`, gains one line:

```markdown
- the gate's report: link `gate-r0.md` relative to the report folder. The gate runs beside you and writes the file in the slice folder; the integrator moves it to the report folder at merge. Link it without reading it.
```

Nothing else in the reporter changes. It still commits REPORT.md on `sdlc/<id>`; that commit touches only `.sdlc/`, so the gate's receipt stays valid for the slice (`suite-receipt.py` ignores `.sdlc/` when comparing trees).

### 4. Majority votes with early exit

Four panels decide by majority of three: finding-refuters (`reviewPhase`), behavior-judges (`milestoneAction`), bar-judges (`barRaiserRound`) and auditors (`audit`). Each runs two voters first and the third only when the two cannot fix the verdict. The verdict is the one the full panel would give, by construction: a voter is skipped only when its vote could not change the result.

#### 4.1 Helpers

Add to the pure helpers and export both through `INTERNALS`:

```js
// a verdict that needs a majority of n voters: the first floor(n/2)+1 run together, and each later voter
// runs only while the verdict can still change. The result is what the full panel would have decided
async function majority(voter, settled, n = 3) {
  const first = Math.floor(n / 2) + 1
  const votes = await parallel([...Array(first).keys()].map(k => () => voter(k)))
  while (votes.length < n && !settled(votes, n)) votes.push(await voter(votes.length))
  return votes
}

// true when the count of votes `isYes` accepts cannot change sides, whatever the missing voters say
function decided(votes, n, isYes) {
  const yes = votes.filter(isYes).length
  const left = n - votes.length
  return yes * 2 > n || (yes + left) * 2 <= n
}
const refutes = v => !!v && v.refuted === true
const holds = v => !!v && v.refuted === false
```

`voter(k)` returns the promise of one vote; a failed agent is `null`, as today. The existing predicates (`refutedByMajority`, `survives`, `tallyAudit`, `dismissalClass`) are applied to the returned array unchanged. They compare against `votes.length`, and for the two-vote cases the helper stops on, that gives the same answer as three votes (tables in 4.3).

#### 4.2 The four call sites

Finding-refuters, in `reviewPhase`, replacing the inner `parallel([0, 1, 2].map(...))`:

```js
      const votes = await majority(
        k => run('finding-refuter', { sliceId: id, finding: f, voter: k }, { schema: VOTE, phase: 'Review', label: `${id}:f${at + i}v${k}` }),
        (v, n) => decided(v, n, refutes))
      return refutedByMajority(votes) ? null : f
```

Behavior-judges, in `milestoneAction`. A dismissal carries a classification, so two refuting votes that disagree on it do not settle: the third runs and `dismissalClass` sees all three, as today.

```js
    const votes = await majority(
      k => run('behavior-judge', { milestoneId: mid, result: f, voter: k }, { schema: JUDGED, phase: 'Behavior judge', label: `${mid}:f${fi}v${k}` }),
      (v, n) => decided(v, n, refutes) && (!refutedByMajority(v) || new Set(v.filter(refutes).map(x => x.classification || 'test-bug')).size === 1))
```

Bar-judges, in `barRaiserRound`. Three outcomes, so both counts must be decided:

```js
    const votes = await majority(
      k => run('bar-judge', { idea, voter: k, round }, { schema: VOTE, phase: P, label: `i${i}v${k}` }),
      (v, n) => decided(v, n, refutes) && decided(v, n, holds))
```

Auditors, in `audit`. A chunk is settled when every requirement in it is decided; a dead auditor counts as a reason against every id, as `tallyAudit` already does:

```js
  const perChunk = await pipeline(
    plan.chunks,
    (ids, _item, i) => majority(
      k => run('auditor', { requirementIds: ids, voter: k }, { schema: AUDIT, phase: P, label: `c${i}v${k}` }),
      (res, n) => ids.every(id => decided(res, n, r => !r || (r.refuted || []).some(x => x.id === id)))),
    (results, ids) => tallyAudit(ids, results))
```

Labels keep their `v<k>` suffix, so the tracker shows which voters ran.

#### 4.3 Decision tables (n = 3)

After the first two votes, with `R` = refutes, `H` = holds (`refuted: false`), `-` = failed to report:

| Votes | Refuters, behavior-judges, auditors (`refutedByMajority`) | Bar-judges (`survives` / `refutedByMajority`) |
|---|---|---|
| R R | dismissed, third skipped (behavior-judges: skipped only when both name one class) | rejected, third skipped |
| H H | held, third skipped | accepted, third skipped |
| - - | held, third skipped (one more R cannot reach two) | unjudged, third skipped (neither count can reach two) |
| H - or - H | held, third skipped | third runs (one more H would accept) |
| R H, H R, R -, - R | third runs | third runs |

With the third vote present, every predicate behaves exactly as today. The expected number of voters per verdict is `2 + 2p(1 - p)` where `p` is the refute probability: between 2 and 2.5 instead of 3. Wall time is unchanged when the first two agree and one agent longer on a split; agent count falls by 17% to 33%, which also lowers rate-limit and CPU contention on the run.

### 5. Scripted bookkeeping

Deterministic steps move from prompts into `state-write.py`, following its conventions: one JSON object on stdout, exit 2 with `{"ok": false, "error": "..."}` when nothing was changed, standard library only. The agents keep judgment calls, merging and forge interaction.

#### 5.1 `record-evidence`

```
state-write.py record-evidence --repo DIR --slice ID [--external-stub]
  stdin (optional): {"seeds": [{title, detail, file}], "benchmarks": "<markdown or empty>"}
```

Steps, in order; any failure before step 6 changes nothing:
1. Fail unless the current branch is `sdlc/<id>` and `git status --porcelain -- . ':!.sdlc'` is empty.
2. `base` is `slice_base(...)`, the branch `base-branch` prints. `diffBase` is `origin/<base>` when `config.gitMode` is `pr` or `direct` and `git rev-parse -q --verify refs/remotes/origin/<base>` succeeds; otherwise `<base>`. (In `stack` mode the milestone branch already holds the milestone's earlier slices, so the local ref lists only this slice's files, as the integrator prompt says today.)
3. `files` is `git diff --name-only <diffBase>...HEAD`, minus paths under `.sdlc/`, sorted.
4. `tests` is the union, in order, of: the test id of every line of `.sdlc/slices/<id>/tests.md` that is not blank and does not start with `#` (the text before the first ` — `; the whole trimmed line when there is no separator); then the `test` field of every case with `"result": "pass"` in `.sdlc/slices/<id>/verification/r<last>/<profile>-<part>.json`, where `<last>` is the highest `r<n>` directory holding at least one such file. Duplicates are dropped. A missing tests.md is a note, not a failure.
5. `adrs`: parse `.sdlc/DECISIONS.md`. A header line `### ADR-<rest>: <title>` starts an entry whose id is the text from `ADR-` to the first `:`. Its `- Affects:` line is scanned for tokens matching `R-\d+` and `S-[A-Za-z0-9-]+`. For each requirement of the slice, the ADR ids whose `Affects` names that requirement id or the slice id are appended to its `adrs`, without duplicates.
6. For every id in the slice's `requirements`: `status: "done"`, `evidence: {files, tests, commit: "pending"}`, `adrs` from step 5, and `external-stub` added to `flags` when `--external-stub` was given. An id the ledger does not have is a note.
7. Write `.sdlc/slices/<id>/evidence.md`: a title `# Evidence for <id>`, a table `| Requirement | Spec says | Tests |` with one row per requirement (the quote cut at 120 characters with `…`), a `## Files` list, and a `## Benchmarks` section holding the stdin `benchmarks` text when it is not empty.
8. When the slice's `kind` is `spec` or `fix` and stdin carries `seeds`, append them to `barraiser.json` `seeds` (creating the file in its documented shape when missing). Improvement slices drop their seeds, as today.
9. Patch the slice: `status: "done"`, `phase: "integrate"`.
10. Append to log.jsonl: `{"ts": <now>, "type": "slice-merged", "slice": "<id>", "detail": "<k> requirement(s) done: <ids>; evidence commit pending"}`.
11. `write_status`, `git add .sdlc`, commit with `subject(config, "chore", "record evidence [<id>]")`.
12. Print `{"ok": true, "commit": "<short sha>", "files": <n>, "tests": <n>, "adrs": <n>, "requirements": [ids], "notes": [...]}`.

#### 5.2 `ship-prune`

```
state-write.py ship-prune --repo DIR --slice ID [--remote]
```

Runs after the merge and before the state commit that records the merge sha, in every mode, so that commit carries the prune. It stages and commits nothing itself.
1. **Retention prune**, skipped whole when `config.keepEvidence` is `true`. Under `.sdlc/slices/<id>/`: create `.sdlc/reports/<id>/`; copy `verification/suite-receipt.json` to `.sdlc/reports/<id>/suite-receipt.json` when present (the original stays: `suite-receipt.py` reads it there); move `gate-r0.md` to `.sdlc/reports/<id>/gate-r0.md` when present; move every `verification/r<last>/logs/*.log` to `.sdlc/reports/<id>/logs/`, where `<last>` is the highest round directory that has a `logs/` directory; then delete everything under `verification/` except `suite-receipt.json`, removing empty directories. A second run finds nothing to do.
2. **Branch sweep**: `git worktree prune`, then for every branch from `git for-each-ref --format=%(refname:short) refs/heads/sdlc/` matching `sdlc/<id>-v*` or `sdlc/<id>-attempt-*`: when a worktree still holds it, `git worktree remove --force` that worktree first; then `git branch -D`. With `--remote`, also `git push origin --delete <name>` for every `sdlc/<id>-attempt-*` name; a name the remote does not have is not an error.
3. **Parent chain**: strip one trailing lowercase letter at a time (`S-013ab` → `S-013a` → `S-013`). For each parent that exists in slices.json with `status: "rejected"` and is finished (`next-action.py`'s `settled(parent, by_id, ("done", "parked"))`, imported from the script beside this one), delete its `sdlc/<parent>-attempt-*` branches the same way. Stop at the first parent that is not a finished rejected slice.
4. `git add -A .sdlc`, so the caller's next commit carries the prune.
5. Print `{"ok": true, "pruned": <bool>, "moved": [paths], "deletedBranches": [...], "remoteDeleted": [...], "notes": [...]}`. A failed deletion or move is a note and never changes `ok`; exit 2 only when `.sdlc/slices/<id>/` is missing or slices.json cannot be read.

`sdlc/<id>` itself is never touched: the integrator deletes it (direct) or `--delete-branch` does (pr, stack), as today.

#### 5.3 `collect-verification`

```
state-write.py collect-verification --repo DIR --slice ID --round N --branches a,b,c
```

1. Read `git worktree list --porcelain` into a map from branch to path.
2. For each branch `sdlc/<id>-v<N>-<profile>-<part>`: `dest` is `.sdlc/slices/<id>/verification/r<N>/tests/<profile>-<part>/`. When the branch has a worktree and `<worktree>/<dest>` exists, copy every file under it that `<repo>/<dest>` lacks; never overwrite. Then `git worktree remove --force <worktree>`. Then `git branch -D <branch>`; a missing branch is fine.
3. `git worktree prune`.
4. Print `{"ok": <bool>, "filed": [paths], "removedWorktrees": [...], "deletedBranches": [...], "notes": [...]}`. `ok` is `false` only when a copy failed; the note says where the files remain. Exit 2 only for unreadable inputs.

`verify-collector.md` is replaced whole:

````markdown
# Role: verify-collector

Close out a verification round: file the profile agents' tests as evidence and remove their scratch. You fold nothing into the slice branch.

Inputs: `sliceId`, `round`, `branches` (one per profile agent: `sdlc/<id>-v<round>-<profile>-<part>`).

Run one command, and read nothing else first:
```
python3 "<skill>/state-write.py" collect-verification --repo . --slice <sliceId> --round <round> --branches <branches joined with commas>
```
It files each agent's test files under `.sdlc/slices/<id>/verification/r<round>/tests/<profile>-<part>/`, removes the agents' worktrees, deletes their branches and prunes worktrees. Return its `ok` and its `notes`.

When the script cannot run, do the same by hand:
1. For each profile group, file the test files its agent wrote under `.sdlc/slices/<id>/verification/r<round>/tests/<profile>-<part>/` in the main tree. Move them in from its worktree only when it left them there. Copy them unmodified. Do not run them. Do not fix them.
2. Delete every branch in the list (`git branch -D`; a missing branch is fine) and prune worktrees (`git worktree prune`).
3. List in `notes` every test file filed and every branch deleted.

Return `{ok, notes}`. `ok: false` only when test files could not be filed (they stay in the worktree; say where).
````

In the loop, the collector's `run` gains `effort: 'low'`.

#### 5.4 The integrator prompt

`integrator.md`, mode `ship`: steps 2 to 5 are replaced by one script call with the old steps kept as the by-hand fallback, and the clean-up's steps 0 to 3 become one script call placed before the sha commit.

Replace steps 2 to 5 with:

````markdown
2. **Record evidence** with one command. Decide `--external-stub` first: pass it when failures.md or an ADR says an external system was replaced by a local fake. For an improvement slice, put the before and after numbers of every benchmark in `benchmarks` as Markdown; otherwise leave it empty. Then:
   ```
   python3 "<skill>/state-write.py" record-evidence --repo . --slice <id> [--external-stub] <<'JSON'
   {"seeds": <the seeds input, as JSON>, "benchmarks": ""}
   JSON
   ```
   It sets each requirement of the slice to `done` with `evidence.files` (the diff against the base branch), `evidence.tests` (tests.md plus the passing final-round cases), `evidence.commit: "pending"` and the ADRs that name the requirement or the slice. It writes evidence.md, appends the seeds for `spec` and `fix` slices, sets the slice to `done` at phase `integrate`, appends the `slice-merged` log line, regenerates STATUS.md and commits on the slice branch: `chore(sdlc): record evidence [<id>]`.
3. Return the worktree's HEAD to the run branch: `git checkout sdlc/run-<n>`.

   **By hand**, only when the script exits non-zero (read its error first):
   <the current steps 2, 3, 4 and 5, verbatim, renumbered a to d>
````

In step 6 of every mode, insert before the commit that replaces `"pending"` with the merge sha: "Run `python3 "<skill>/state-write.py" ship-prune --repo . --slice <id>` first (add `--remote` in `pr`, `mr` and `stack` mode). It prunes the slice's evidence unless `keepEvidence` is set, moves the receipt copy, `gate-r0.md` and the final logs to `.sdlc/reports/<id>/`, deletes the slice's `-v*` and `-attempt-*` branches and the finished rejected parents' attempt branches, and stages the result. The sha commit then carries the prune. Its `notes` list failed deletions; they never change your result."

Replace the **Clean up** block's steps 0 to 3 with: "The `ship-prune` call in step 6 did the retention prune, the stale-branch sweep, the attempt-branch deletion and the parent chain. When it could not run, do them by hand:" followed by the current steps 0 to 3 verbatim. Step 4 ("Never delete a branch of a slice that is not finished...") stays. In `retry-merge`, "Then **Clean up**" becomes "Then run `ship-prune` as step 6 says, before the sha commit".

### 6. Run statistics

`skills/sdlc/tracker/stats.py` prints where a run's time went, from the same files the tracker reads:

```
python3 "<skill>/tracker/stats.py" --journal <run folder>/journal.jsonl [--json]
```

- It uses `workflow.read_run(journal, live=False)`; agents without a start time or a duration are skipped and counted in a `skipped` number.
- **Wall time** of a set of agents is the length of the union of their `[start, start + seconds]` intervals, so agents running together count once. **Agent time** is the sum of their seconds. **Parallelism** is agent time over wall time.
- Text output, three tables and a header line: the run span in hours, agent-hours, busy wall-hours, parallelism; then per phase (`n`, agent-hours, wall-hours, share of the run's wall time, million tokens), sorted by wall-hours; then per role (the label's text before the first `:`; `n`, agent-hours, wall-hours, median minutes, p90 minutes, million tokens); then per slice (the first `S-...` token in the label; agents, wall-hours, and the per-phase wall-hours).
- `--json` prints one object: `{"run": {"startedAt", "endedAt", "agents", "skipped", "agentSeconds", "wallSeconds", "parallelism"}, "phases": [{"phase", "n", "agentSeconds", "wallSeconds", "tokens"}], "roles": [{"role", "n", "agentSeconds", "wallSeconds", "medianSeconds", "p90Seconds", "tokens"}], "slices": [{"slice", "n", "wallSeconds", "phases": {"<phase>": wallSeconds}}]}`.
- A missing or unreadable journal prints one line to stderr and exits 1. Python 3 standard library only.

The README's "Track progress in the browser" section gains two lines naming the command and what it answers.

### 7. Documentation

- `README.md`: in "A slice: plan, tests first, build loop, integrate", the diagram shows `REP` and `GATE` side by side feeding `INT`; the paragraph "The full suite runs twice per round, not four times" becomes "The full suite runs once per slice, at the gate; the implementer and the regression lens run the slice's impact set"; the bootstrap diagram notes that an override-only bootstrap skips the critics; the escalation and driver sections mention that a ledger that cannot land ends the run as livelock; the "Development" tree lists `tracker/stats.py`.
- `prompts/state-schema.md`: `log.jsonl` keeps its types; `reports/<id>/` lists `logs/` and `gate-r0.md`; the `slices/<id>/` owner table says the test-reporter runs beside the gate.
- `prompts/ste-style.md` is unchanged. Every prompt edit above must pass `ste-check.py`, which `npm test` runs on every prompt file.

## Edge cases

- **An older `next-action.py`** without `bootstrapKind`: the loop treats the bootstrap as `fresh` and runs everything, as today.
- **Override bootstrap that adds nothing**: the slicer is skipped; the outcome string says `0 slices added`.
- **Override bootstrap that reopens a requirement of a done slice**: the extractor sets it `todo`, the slicer runs and creates a new slice for it (its existing rule).
- **State-writer silent on `bootstrap-complete`**: no livelock; the outcome says `ledger commit unconfirmed`; a repeat stalls through the streak.
- **Stuck-writer's own commit cannot push**: STUCK.md is on disk in the worktree; the driver prints it from there.
- **Implementer where `impact.py` prints nothing**: the fallback runs the touched packages' test files; `green` still requires lint, typecheck and build.
- **Scaffolding slice**: the impact set is everything the diff touches; the fallback covers it.
- **Gate worktree left by a crash**: the gate removes a stale `$TMPDIR/sdlc-<id>-gate` before adding; `janitor.py` reaps any `sdlc-*` scratch older than seven days.
- **Repo without `install`**: the gate skips the install step; the suite runs on the checked-out tree.
- **Reporter fails to report** while the gate passes: logged, never blocks; the slice integrates without a fresh report, as today.
- **Gate fails, then passes**: two reporter runs; the second overwrites the first.
- **Two refuting behavior-judges, different classes**: the third voter runs; the class is the majority or the first refuting voter's, as today.
- **Two dead voters**: settled as "not dismissed" (refuters) or "unjudged" (bar-judges); the third is skipped because it could not reach two.
- **`record-evidence` with a requirement id the ledger lacks**: noted, the rest proceeds.
- **`record-evidence` on the wrong branch or a dirty tree**: exit 2, nothing changed.
- **`ship-prune` with `keepEvidence`**: no prune; the sweep and the parent chain still run.
- **`ship-prune` where a branch is held by a worktree**: the worktree is removed with `--force` first; a failure there is a note.
- **`collect-verification` where an agent wrote its tests in the main tree already**: nothing to copy; the worktree and branch are still removed.

## Testing

Every test file keeps the repo's style: loop tests run the compiled script against `scripted` or `happy` responders and inspect `rt.calls`, `rt.roles()`, `rt.phases` and `rt.result`; prompt tests read the files and assert with regexes; script tests build a fixture repo under `scratch()` and run the Python scripts with `execFileSync`.

**`test/bootstrap.test.mjs`**
- `an override bootstrap runs the extractor in reconcile mode and skips the critics`: state-reader returns `{action: 'bootstrap', bootstrapKind: 'override'}`; assert no `completeness-critic` call, the extractor's `inputs.mode === 'reconcile'`, and the outcome matches `/bootstrap \(override\)/`.
- `an override bootstrap skips the slicer when the extractor added and reopened nothing, and runs it otherwise`: two runs, extractor `{added: 0}` then `{added: 0, reopened: 1}`; assert `slicer` calls 0 then 1.
- `a spec-changed bootstrap runs the critics`: `bootstrapKind: 'spec-changed'`; assert three critic calls in round 0 and `inputs.mode === 'extract'`.
- `a decision without bootstrapKind runs everything`: as the existing first test, which keeps passing unchanged.
- `a ledger that did not land ends the run as livelock through the stuck-writer`: state-writer answers `{ok: false, landed: false, notes: 'push refused'}`; assert `rt.result.state === 'livelock'`, `rt.result.reason` matches `/bootstrap ledger did not land: push refused/`, a `stuck-writer` call with that reason, and `rt.result.iterations.length === 1`.
- `a state-writer that fails to report on bootstrap-complete does not livelock`: state-writer returns `null`; assert state `stopped` (the scripted reader's stop follows) and the outcome matches `/ledger commit unconfirmed/`.
- `three identical re-bootstraps stall the run although their outcome counts differ`: reader returns the override decision three times, extractor adds 1, 2, 3; state-writer `ok`; assert `rt.result.state === 'stalled'` and `rt.result.reason` matches `/bootstrap\|override/`.
- `the NEXT schema carries bootstrapKind`: read the state-reader call's `opts.schema.properties.bootstrapKind.enum` and assert `['fresh', 'spec-changed', 'override']`.

**`test/next-action.test.mjs`**
- `each bootstrap arm names its kind`: fixtures for the missing config, a changed spec hash and an override count mismatch; assert `next.bootstrapKind` is `fresh`, `spec-changed`, `override`.

**`test/economy.test.mjs`**
- `the test-reporter runs beside the gate and the integrator does not run it again`: `happy()`; assert exactly one `test-reporter` call for a passing slice, that it starts before the gate's `state-writer` call, and that `gate` and `test-reporter` both precede `integrator` in `rt.roles()`.
- `a gate fail re-runs the reporter at the next gate`: the existing gate-fail test gains `assert.equal(rt.calls.filter(c => c.role === 'test-reporter').length, 2)`; its `phases` assertion is unchanged.
- `a parked slice still gets its park report`: an escalation to park; assert one `test-reporter` call with `inputs.mode === 'park'`.
- `the collector runs at low effort`: assert the `verify-collector` call's `opts.effort === 'low'`.

**`test/majority.test.mjs`** (new)
- `decided follows the table`: for n = 3, every row of section 4.3.
- `majority stops at two on agreement and runs the third on a split`: a voter that records calls; assert 2 calls for `[R, R]` and `[H, H]`, 3 for `[R, H]`, and never more than n.
- `early exit gives the three-voter verdict for every combination`: enumerate all 27 triples over `{R, H, -}`; for each panel (refuters via `refutedByMajority`, bar-judges via `survives` and `refutedByMajority`, auditors via `tallyAudit` on two ids with per-id answers), the verdict from `majority` with voters answering the triple in order equals the verdict from all three votes.
- `two refuting behavior-judges with different classes call the third`: votes `[{refuted: true, classification: 'flaky'}, {refuted: true, classification: 'test-bug'}, ...]`; assert 3 calls, and 2 when the classes agree.
- `reviewPhase judges a blocking finding with two refuters when they agree`: through `happy()` with one blocking finding and refuters answering `clear()`; assert two `finding-refuter` calls for that finding, labels ending `v0` and `v1`.

**`test/audit.test.mjs`**, **`test/barraiser.test.mjs`**, **`test/milestone.test.mjs`**
- One test each: two voters when they agree, three on a split, final verdict unchanged. The existing tests that script three voters keep passing because the third answer is simply left unused.

**`test/prompts.test.mjs`**
- `the implementer runs the slice set, not the full suite`: implementer.md matches `/impact\.py/` and `/Do not run the full `config\.commands\.test`/`, and does not match `/Time the base/`.
- `the gate works in its own worktree against the target repo's slot and receipt`: gate.md matches `/worktree add --detach/`, `/slot --repo "<repo>"/`, `/--ref \$COMMIT/`, `/worktree remove --force/`, and `/Never check out a branch there/`.
- `the reporter links the gate report without reading it`: test-reporter.md matches `/gate-r0\.md/`.
- `the collector, the integrator and the state-writer use the scripts`: verify-collector.md matches `/collect-verification/`; integrator.md matches `/record-evidence/` and `/ship-prune/`; state-writer.md matches `/landed/`.
- `the extractor has a reconcile mode and the stuck-writer knows the ledger case`: requirements-extractor.md matches `/`mode: reconcile`/`; stuck-writer.md matches `/bootstrap ledger did not land/`.
- `the state-reader appends only janitor failures`: state-reader.md matches `/When the janitor ran clean, append nothing/`.
- The existing STE test covers every edited prompt.

**`test/scripts.test.mjs`**
- `record-evidence sets requirements done with files, tests and ADRs, and commits on the slice branch`: fixture with a slice branch holding a product change, `tests.md` (two ids), `verification/r1/http-api-0.json` (one pass with a `test`, one fail), DECISIONS.md with an ADR whose `Affects` names `R-001`; assert `requirements.json` entries `done`, `evidence.files` without `.sdlc/` paths, `evidence.tests` equal to the two ids plus the passing case's test, `adrs` containing the ADR id, `evidence.commit === 'pending'`, the slice `done` at phase `integrate`, a `slice-merged` log line, `evidence.md` present, and the last commit subject `chore(sdlc): record evidence [S-001]`.
- `record-evidence appends seeds for spec and fix slices only and honours --external-stub`.
- `record-evidence refuses a wrong branch or a dirty tree with exit 2 and no commit`.
- `ship-prune moves the receipt copy, gate report and final logs, deletes the rest, sweeps branches, and is idempotent`: assert `reports/<id>/suite-receipt.json`, `reports/<id>/gate-r0.md`, `reports/<id>/logs/*.log`; `verification/` holds only `suite-receipt.json`; `sdlc/S-001-v1-ui-0` and `sdlc/S-001-attempt-1` gone; `git diff --cached --name-only` lists the moves; no new commit; a second run reports `moved: []` and `deletedBranches: []`.
- `ship-prune skips the prune with keepEvidence and still sweeps`.
- `ship-prune deletes a finished rejected parent's attempt branches and stops at an unfinished one`.
- `ship-prune --remote deletes attempt branches on the remote`: a `fixture({remote: true})` with a pushed attempt branch.
- `collect-verification copies missing test files from a worktree, removes it and deletes the branches`: a worktree on `sdlc/S-001-v1-ui-0` holding `tests/ui-0/a.test.ts`; assert the file is in the main tree, the worktree is gone, both branches are gone, and a listed branch that never existed is not an error.

**`test/tracker.test.mjs`**
- `stats.py sums agent time and unions wall time`: a `runFolder` fixture with two agents of 60 s that overlap fully; assert `--json` gives `agentSeconds: 120`, `wallSeconds: 60`, `parallelism: 2`, one phase row and two role rows.
- `stats.py exits 1 on a missing journal`.

## Files

| File | Change |
|---|---|
| `skills/sdlc/next-action.py` | `bootstrapKind` on the three bootstrap arms |
| `skills/sdlc/sdlc-loop.js` | `NEXT` and `OK` schemas; `bootstrap()`; livelock sentinel and bootstrap streak key in `main()`; `gatePhase` runs gate and reporter together; `integrate()` drops the reporter; `majority`, `decided`, `refutes`, `holds` and the four call sites; collector at low effort; `INTERNALS` exports |
| `skills/sdlc/state-write.py` | `record-evidence`, `ship-prune`, `collect-verification` subcommands; imports `settled` and `children` from `next-action.py` |
| `skills/sdlc/tracker/stats.py` | new |
| `skills/sdlc/prompts/requirements-extractor.md` | `mode` input, reconcile rules |
| `skills/sdlc/prompts/state-writer.md` | `bootstrap-complete` reports `landed` |
| `skills/sdlc/prompts/stuck-writer.md` | the ledger case |
| `skills/sdlc/prompts/state-reader.md` | janitor failures only |
| `skills/sdlc/prompts/implementer.md` | step 5 and the return contract |
| `skills/sdlc/prompts/gate.md` | replaced whole |
| `skills/sdlc/prompts/test-reporter.md` | Appendix line |
| `skills/sdlc/prompts/verify-collector.md` | replaced whole |
| `skills/sdlc/prompts/integrator.md` | steps 2 to 5, step 6's prune call, Clean up, retry-merge |
| `skills/sdlc/prompts/state-schema.md` | `reports/<id>/` contents; reporter timing |
| `README.md` | diagrams and paragraphs named in section 7; `stats.py` |
| `skills/sdlc/test/bootstrap.test.mjs`, `next-action.test.mjs`, `economy.test.mjs`, `majority.test.mjs` (new), `audit.test.mjs`, `barraiser.test.mjs`, `milestone.test.mjs`, `prompts.test.mjs`, `scripts.test.mjs`, `tracker.test.mjs` | the cases above |

## How to verify the gain

After the release, run `stats.py` on the next run's journal and compare with the two runs in the Intent:
- Implement's share of wall time falls, and the implementer's median no longer carries a full-suite run.
- `test-reporter` wall time overlaps the gate's: the per-slice table shows Report inside the Gate window.
- `finding-refuter` agents per blocking finding sit between 2 and 2.5.
- `integrator` and `verify-collector` medians fall to about a minute on any model.
- No run shows more than two consecutive `Bootstrap` phases.
