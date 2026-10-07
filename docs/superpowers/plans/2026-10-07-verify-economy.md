# Verify Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the sdlc loop's verification into two tiers — slice-scoped regression during build rounds, an explicit full-suite gate before integrate — with infra-failure semantics, a test-promotion gate, artifact retention, and an efficacy ledger.

**Architecture:** All loop changes live in `skills/sdlc/sdlc-loop.js` (compiled as one async function by the test harness in `skills/sdlc/test/harness.mjs`; pure helpers are exported via `INTERNALS`). Agent behavior changes are prompt edits in `skills/sdlc/prompts/`. Two new scripts: `skills/sdlc/impact.py` (diff → affected tests/packages) and two `suite-receipt.py` subcommands (suite slot). State additions go in `prompts/state-schema.md`; tracker economics panel in `tracker/hub.py`.

**Tech Stack:** Node ≥ 20 (`node --test skills/sdlc/test/*.test.mjs`), Python 3 stdlib only for scripts.

**Spec:** `docs/superpowers/specs/2026-10-07-verify-economy-design.md` — read it first; this plan argues from it.

## Global Constraints

- The loop file must keep the `return await main() // @entry` line and the `INTERNALS` export block intact (the harness replaces the entry line; tests read internals from it).
- Every loop change keeps `counters` persisted via `persist(id, { counters })` so relaunches resume correctly.
- Schema additions are additive: existing `.sdlc/` state from running projects (formengine, formengine-liveness) must still parse. New fields are optional with safe defaults in `normalizeCounters`.
- Prompt files state *rules*, not explanations; match the existing terse imperative style. Every prompt edit must keep the exact `Return {...}` contract line updated to match the schema the loop reads.
- Tests run with `npm test` (node:test). Each test file gets one scratch root via `harness.scratch()`.
- Scripts are Python 3 stdlib only; they print JSON on stdout and never print secrets.
- Git: work on a feature branch; never commit straight to `main`.

## Review Focus

1. **Stale receipt**: a slice merges although the full suite never passed on its final commit. Expect: gate receipt commit hash ≠ slice HEAD (and not a `.sdlc/`-only commit) → not valid. Pinned by Task 4's regate test and Task 5's receipt-check test.
2. **Infra masking a real bug**: a round with both a timeout and a genuine failing test must refute, not retry. Expect: any refuting vote wins over infra classification. Pinned by Task 1's mixed-outcome test.
3. **Impact-mapping gap**: the diff→test mapping misses an affected test file, so slice-scoped regression passes while the full suite would fail. Expect: the gate (full suite) is the only merge authority, so a gap delays but never skips detection. Pinned by Task 3's mapping test + Task 11's lifecycle test asserting the gate runs.
4. **Verifier test leak**: a verifier-written test lands in the committed suite without a held refutation or explicit promotion. Expect: collector never cherry-picks; promotion only via implementer with a named evidence source. Pinned by Task 6's collector test + Task 7's promotion test.
5. **Resume loses the gate**: a relaunched run skips a pending gate or replays an already-paid one. Expect: slice `phase: 'gate'` + persisted `counters.gateCommit` are the resume truth. Pinned by Task 4's resume test.

---

### Task 1: Outcome classification and the infra economy

**Files:**
- Modify: `skills/sdlc/sdlc-loop.js` (schemas `VOTE`/`PVOTE` ~line 60/576, helpers ~line 67, `tallyVerify` ~line 71, `profileVote` ~line 146, `normalizeCounters` ~line 212, `buildLoop` ~line 686)
- Test: `skills/sdlc/test/economy.test.mjs` (create), update `skills/sdlc/test/verify.test.mjs` (blocked → infra assertions)

**Interfaces:**
- Consumes: nothing new.
- Produces: `isInfra(v)` — vote → boolean; `tallyVerify(votes, lenses)` returns `{ pass, refutations, failingTests, infra }`; `normalizeCounters` includes `infraRetries: 0`; `VOTE`/`PVOTE` accept optional `outcome: 'verified'|'refuted'|'infra'`.

- [ ] **Step 1: Write the failing tests**

Create `skills/sdlc/test/economy.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadInternals } from './harness.mjs'

const clear = { refuted: false, evidence: 'holds' }

test('an infra vote never counts as a refutation, but stops the round from passing', async () => {
  const rt = await loadInternals()
  const votes = [clear, { refuted: false, evidence: 'timed out', outcome: 'infra' }, clear]
  const t = rt.I.tallyVerify(votes, ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(t.refutations, 0)
  assert.equal(t.pass, false)
  assert.equal(t.infra, true)
})

test('a refuting vote wins over infra classification (infra must not mask a real bug)', async () => {
  const rt = await loadInternals()
  const votes = [clear, { refuted: false, evidence: 'cut off', outcome: 'infra' }, { refuted: true, evidence: 'x', failingTest: 't — a — R-1' }]
  const t = rt.I.tallyVerify(votes, ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(t.pass, false)
  assert.equal(t.refutations, 1)
  assert.equal(t.infra, false)
})

test('profileVote folds blocked scenarios and silent agents into infra, not refutation', async () => {
  const rt = await loadInternals()
  const groups = [{ profile: 'ui', part: 0, scenarioIds: ['VS-1'] }]
  const silent = rt.I.profileVote([null], groups)
  assert.equal(silent.refuted, false)
  assert.equal(silent.outcome, 'infra')
  const blocked = rt.I.profileVote([{ refuted: false, evidence: 'env', blocked: [{ scenarioId: 'VS-1', reason: 'no chromium' }] }], groups)
  assert.equal(blocked.refuted, false)
  assert.equal(blocked.outcome, 'infra')
  const failing = rt.I.profileVote([{ refuted: true, evidence: 'bug', failingTest: 't — b — R-1', blocked: [{ scenarioId: 'VS-1', reason: 'also no chromium' }] }], groups)
  assert.equal(failing.refuted, true)
  assert.equal(failing.outcome, 'refuted')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test 2>&1 | grep -E 'economy|fail' ` — the three new tests fail (no `outcome` in schemas, `profileVote` refutes on blocked, no `infra` in tally).

- [ ] **Step 3: Implement**

In `sdlc-loop.js`:

1. `VOTE` and `PVOTE` gain `outcome: { type: 'string', enum: ['verified', 'refuted', 'infra'] }` in `properties` (not `required` — old reports lack it).
2. New helper next to `isRefuting`:

```js
// an infra outcome proves nothing about the slice: timeouts, saturation, silent agents. It is retried
// outside the round economy and never refutes (2026-10-07 verify-economy spec, Section 2)
function isInfra(v) {
  return !!v && v.outcome === 'infra'
}
```

3. `tallyVerify` becomes:

```js
function tallyVerify(votes, lenses = []) {
  const failingTests = votes.filter(v => v && v.failingTest).map(v => v.failingTest)
  votes.forEach((v, i) => {
    if (lenses[i] === 'regression' && isRefuting(v) && !isInfra(v) && !(v && v.failingTest)) failingTests.push(`regression: ${v ? v.evidence : 'verifier failed to report'}`)
  })
  const refutations = votes.filter(v => isRefuting(v) && !isInfra(v)).length
  const infra = !refutations && failingTests.length === 0 && votes.some(isInfra)
  // each vote looks at something the others do not, so one refutation is enough: the spec-fidelity verifier
  // often has no failing test to name, and a majority rule would let the other two outvote it
  return { pass: failingTests.length === 0 && refutations === 0 && !infra, refutations, failingTests, infra }
}
```

4. `profileVote`: a silent agent or a blocked scenario is infra unless a failing test or refuting evidence exists. Replace the final return and the blocked bookkeeping:

```js
  votes.forEach((v, i) => {
    const g = groups[i]
    const tag = `[${g.profile}${g.part ? `#${g.part}` : ''}]`
    if (!v) {
      infra.push(...g.scenarioIds.map(id => `${tag} ${id}: profile verifier failed to report`))
      return
    }
    if (v.failingTest) failing.push(`${tag} ${v.failingTest}`)
    for (const b of v.blocked || []) infra.push(`${tag} ${b.scenarioId}: ${b.reason}`)
    if (isRefuting(v) && !isInfra(v)) refuters.push(`${tag} ${v.evidence}`)
  })
```

with `const infra = []` declared next to `failing`, and the return:

```js
  const failingTest = [...failing, ...infra.map(b => `blocked: ${b}`)].join(' | ')
  const refuted = failing.length > 0 || refuters.length > 0
  const evidence = groups.length
    ? votes.map((v, i) => `[${groups[i].profile}${groups[i].part ? `#${groups[i].part}` : ''}] ${v ? `${v.refuted ? 'REFUTED' : 'ok'}: ${v.evidence}` : 'failed to report'}`).join(' ; ')
    : 'no scenarios to verify'
  const seeds = votes.filter(Boolean).flatMap(v => v.seeds || [])
  const outcome = refuted ? 'refuted' : infra.length || votes.some(isInfra) ? 'infra' : 'verified'
  return { refuted, outcome, evidence, failingTest, seeds }
```

5. `normalizeCounters` gains `infraRetries: 0`.
6. `INTERNALS` gains `isInfra`.

`buildLoop` infra economy — replace the block after `const v = tallyVerify(votes, lenses)`:

```js
      const v = tallyVerify(votes, lenses)
      verifySeeds.push(...votes.filter(Boolean).flatMap(x => x.seeds || []))
      log(`${id} verify r${round}: ${v.refutations}/${votes.length} refuted, ${v.failingTests.length} failing test(s)${v.infra ? ', infra retry' : ''}`)
      if (v.infra && !v.refutations) {
        // an inconclusive round proves nothing, so it is replayed at the same fix round; the counter is
        // reset by any round with a verdict. Three consecutive infra failures park the slice as infra debt.
        counters.infraRetries++
        if (counters.infraRetries >= 3) {
          log(`${id}: ${counters.infraRetries} consecutive infra failures; parking with infra debt`)
          await persist(id, { status: 'parked', infraDebt: true, counters })
          return { ok: false, infraDebt: true, seeds: [], lastEvidence: evidence }
        }
        await persist(id, { counters })
        continue
      }
      counters.infraRetries = 0
```

The existing `if (!v.pass) { … }` block stays below it, unchanged in behavior for real refutations.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`. New tests pass; update `verify.test.mjs` assertions that expected blocked → refuted (the first test's `votes[1].refuted === true` becomes `outcome === 'infra'`; the collector-refutes test changes in Task 6).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(loop): infra outcomes never refute and never consume a fix round"`

### Task 2: `impact.py` — diff → affected tests and packages

**Files:**
- Create: `skills/sdlc/impact.py`
- Test: `skills/sdlc/test/scripts.test.mjs` (append a describe-style section per the file's existing conventions)

**Interfaces:**
- Produces: `python3 "<skill>/impact.py" --repo . --base <ref> --head <ref>` → stdout JSON `{changed: [files], testFiles: [files], packages: [dirs]}`. Exit 0 even on fallback (mapping best effort); stderr carries a one-line note when the graph was not built.

- [ ] **Step 1: Write the failing test**

Append to `scripts.test.mjs` (follow the file's fixture-repo helper style):

```js
test('impact maps a changed source file to its package tests and reverse-dependency packages', async () => {
  const repo = makeFixtureRepo() // git repo: packages/a/{src/x.ts,test/x.test.ts,package.json}, packages/b/{package.json src/y.ts}, packages/b/package.json depends on "@f/a"
  writeJson(join(repo, 'pnpm-workspace.yaml'), 'packages/*\n')
  sh(repo, 'git add -A && git commit -m init && git checkout -b feat')
  write(repo, 'packages/a/src/x.ts', 'export const x = 2\n')
  sh(repo, 'git commit -am change')
  const out = runPython('impact.py', ['--repo', repo, '--base', 'main', '--head', 'feat'])
  assert.deepEqual(out.packages, ['packages/a', 'packages/b'])
  assert.deepEqual(out.testFiles, ['packages/a/test/x.test.ts'])
})
```

- [ ] **Step 2: Run it, verify it fails** (`node --test skills/sdlc/test/scripts.test.mjs`)
- [ ] **Step 3: Implement `impact.py`** — stdlib only:

1. `changed = git diff --name-only <base>...<head>` (run with `cwd=repo`).
2. Package roots: dirs containing `package.json` (npm) or `go.mod` (Go), discovered under workspace globs from `pnpm-workspace.yaml`/root `package.json` `workspaces`, else the repo root.
3. `packages` = packages containing changed files, plus packages whose `package.json` dependencies name a changed package (match by package `name` field), plus Go reverse deps via `go list -f '{{.Dir}}|{{.Imports}}' ./...` when `go.mod` exists (tolerate failure → note on stderr).
4. `testFiles` = files under those package dirs matching `*.test.*`, `*.spec.*`, `*_test.go` — intersected with `git ls-files` so generated/untracked noise is excluded. Always include test files in changed paths even if the package graph failed.
5. Print `json.dumps({changed, testFiles, packages})`.

- [ ] **Step 4: Tests pass** (`npm test`)
- [ ] **Step 5: Commit** — `git commit -m "feat(scripts): impact.py maps a diff to affected tests and packages"`

### Task 3: Slice-scoped regression lens (prompt)

**Files:**
- Modify: `skills/sdlc/prompts/verifier.md` (regression lens section, lines 28–37)
- Modify: `skills/sdlc/prompts/state-schema.md` (document the `scope` input)
- Test: `skills/sdlc/test/prompts.test.mjs` (assert the new rules exist)

**Interfaces:**
- Consumes: Task 2's `impact.py`; the verifier's new `scope` input (`'slice'` during build rounds, `'full'` at the gate — wired in Tasks 4/5).
- Produces: verifier.md rules that Task 10's suite-slot step and the gate prompt reference.

- [ ] **Step 1: Write failing assertions in prompts.test.mjs** — the file's `regression lens` section must contain: `impact.py`, `scope`, and "budget" only under the full-scope rule. (Follow the file's existing string-assertion style.)
- [ ] **Step 2: Verify they fail** (`node --test skills/sdlc/test/prompts.test.mjs`)
- [ ] **Step 3: Edit verifier.md.** Replace the regression lens bullets with:

```markdown
- **Lens `regression` (scope from your inputs: `slice` during build rounds, `full` at the gate):**
  - **`slice` scope:** map the diff to what it can break: `python3 "<skill>/impact.py" --repo . --base <defaultBranch> --head sdlc/<id>`. Run the mapped test files and packages with the repo's own test runner, plus build and typecheck if `config.commands` defines them (they are cheap and catch cross-package breakage). For every `done` requirement whose `evidence.files` intersects this diff, run its `evidence.tests`. Anything the mapping cannot name is the gate's job, not yours.
  - **`full` scope:** run the full `config.commands` test, lint, typecheck and build; run `config.commands.e2e` when it is set (it skips the scenarios in `e2e/pending.json`); run conformance or fixture suites if the repo has them; and for every `done` requirement whose `evidence.files` intersects this diff, run its `evidence.tests`.
  - Run the long commands in the background as "Long commands" in _common.md says. A command that could not run to completion is not a failure and never refutes; return `outcome: "infra"` and re-run.
  - **Test-time budget (full scope only):** compare the branch's `config.commands.test` wall time with the default branch's. Ask for the baseline first: `python3 "<skill>/suite-receipt.py" baseline --repo . --ref <defaultBranch>`. When it prints `"valid": true`, use its `seconds` and do not run the baseline. Only when it prints `"valid": false`, time `config.commands.test` on the default branch in a second worktree (sequentially, not at the same time as the branch run) and record it with `python3 "<skill>/suite-receipt.py" baseline-write --repo . --ref <defaultBranch> --seconds <n>`. If the slice adds more than max(60 s, 20 %) of wall time, refute it with `failingTest: "<test command> — test time <branch>s vs <base>s"` and list the slowest added test files with their durations.
  - **Receipt (full scope only):** when test, lint, typecheck and build all ran to completion, record the run: `python3 "<skill>/suite-receipt.py" write --repo . --slice <id> --ref <the commit you tested> --seconds <wall time of the test command> --result <pass|fail>`. `pass` means every one of them passed with no failing test at all. The gate and the next slice's baseline consume this receipt, so never write `pass` for a run you did not see finish green.
  - Any genuine failure refutes the slice. Set `failingTest` to `<the failing command> — <first failing test or error>`, so a single regression refutation fails verification. Classify the run: all-timeout/worker-crash/process-kill failures with no assertion failure are `outcome: "infra"`, never a refutation.
```

Also: delete the "**Known failing verification tests**" bullet (profile verifier tests are no longer folded into the branch — Task 6) and change the first paragraph's sentence "The regression lens runs after them, once the verify-collector has folded their tests into `sdlc/<id>`" to "The regression lens runs after them; it tests the suite, not the verification tests (which live in `.sdlc/slices/<id>/verification/r<round>/tests/`)".

Update the `Return` contract line to `{refuted, evidence, failingTest, seeds, outcome}`.

- [ ] **Step 4: prompts tests pass**, then **Step 5: Commit** — `git commit -m "feat(prompts): slice-scoped regression lens with outcome classification"`

### Task 4: The gate phase

**Files:**
- Modify: `skills/sdlc/sdlc-loop.js` (`PHASE_ORDER` line 402, `INTEGRATE` schema line 503, `sliceAction` line 456, new `gatePhase`, `buildLoop` signature, `integrate` regate handling, `INTERNALS`)
- Modify: `skills/sdlc/prompts/gate.md` (create), `skills/sdlc/prompts/state-schema.md` (phase enum + `gateCommit`)
- Modify: `skills/sdlc/test/slice.test.mjs` (`happy` gains a `gate` responder), `skills/sdlc/test/economy.test.mjs`

**Interfaces:**
- Produces: `gatePhase(id, counters)` → `'pass' | 'fail' | 'infra'`; `PHASE_ORDER = ['plan', 'tests', 'implement', 'gate', 'integrate']`; `INTEGRATE.state` enum gains `'regate'`; gate role prompt `gate.md`; slice state `counters.gateCommit`.

- [ ] **Step 1: Failing tests** in `economy.test.mjs`:

```js
test('a battery slice runs the gate before integrate, and a gate fail goes back to the build loop', async () => {
  let gates = 0
  const rt = await runMain(happy({
    gate: () => (gates++ === 0 ? { state: 'fail', failingTest: 'e2e — SC-9 — R-2', commit: 'c1' } : { state: 'pass', commit: 'c2' }),
    implementer: () => ({ green: true, notes: 'fixed for the gate' }),
    verifier: () => clear(),
    'verify-planner': () => ({ scenarios: [], tools: [], risk: 'high' }),
  }, 'plan'))
  assert.deepEqual(rt.phases, ['Plan', 'Tests first', 'Implement', 'Verify', 'Review', 'Gate', 'Implement', 'Verify', 'Review', 'Gate', 'Integrate'])
  const gateCalls = rt.calls.filter(c => c.role === 'gate')
  assert.equal(gateCalls.length, 2)
  assert.ok(rt.roles().indexOf('gate') < rt.roles().indexOf('integrator'))
})

test('a slice already at phase gate resumes at the gate, not the build loop', async () => {
  const rt = await runMain(happy({ gate: () => ({ state: 'pass', commit: 'c2' }) }, 'gate'))
  assert.equal(rt.calls.filter(c => c.role === 'implementer').length, 0)
  assert.equal(rt.calls.filter(c => c.role === 'gate').length, 1)
  assert.ok(rt.roles().includes('integrator'))
})

test('the integrator sending regate re-runs the gate', async () => {
  let n = 0
  const rt = await runMain(happy({
    gate: () => ({ state: 'pass', commit: 'c2' }),
    integrator: () => (n++ === 0 ? { state: 'regate', notes: 'CI fix changed product code after the gate' } : { state: 'merged', commit: 'abc' }),
  }, 'gate'))
  assert.equal(rt.calls.filter(c => c.role === 'gate').length, 2)
  assert.equal(rt.calls.filter(c => c.role === 'integrator').length, 2)
})
```

Note: `happy(..., 'gate')` — extend `sliceNext` usage in `slice.test.mjs` so the fixture slice carries `phase: 'gate'` and `counters: { fixRounds: 0, gateCommit: '' }`.

- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Implement in `sdlc-loop.js`:**

1. `PHASE_ORDER = ['plan', 'tests', 'implement', 'gate', 'integrate']`; `INTEGRATE.state` enum: `['merged', 'awaiting-merge', 'failed', 'inconclusive', 'regate']`.
2. New gate schema and phase (place before `integrate`):

```js
const GATE = {
  type: 'object',
  properties: { state: { type: 'string', enum: ['pass', 'fail', 'infra'] }, failingTest: str, commit: str, seconds: { type: 'number' }, notes: str },
  required: ['state'],
}

// the gate: the full-repo regression lens runs once, here, on the exact final commit, and the receipt it
// writes is the only merge authority. A commit after a passed gate invalidates it (the integrator asks for
// a regate); a real failing test sends the slice back to the build loop; infra retries outside the economy.
async function gatePhase(id, counters) {
  phase('Gate')
  let g = await run('gate', { sliceId: id }, { schema: GATE, phase: 'Gate', label: id })
  if (!g) g = { state: 'infra', notes: 'gate agent failed to report' }
  // the return is {verdict, failingTest} so sliceAction can hand the gate's failing test to the build loop
  if (g.state === 'pass') {
    counters.gateCommit = g.commit || ''
    counters.infraRetries = 0
    await persist(id, { counters })
    return { verdict: 'pass', failingTest: '' }
  }
  if (g.state === 'infra') {
    counters.infraRetries++
    await persist(id, { counters })
    if (counters.infraRetries >= 3) {
      log(`${id}: ${counters.infraRetries} consecutive infra failures at the gate; parking with infra debt`)
      await persist(id, { status: 'parked', infraDebt: true, counters })
      return { verdict: 'infra-debt', failingTest: '' }
    }
    return { verdict: 'infra', failingTest: '' }
  }
  return { verdict: 'fail', failingTest: g.failingTest || '' }
}
```

3. `buildLoop` gains an `initialEvidence = []` parameter: `let evidence = [...initialEvidence]` on line 687.
4. `sliceAction` restructure (replace lines 477–486):

```js
  let seeds = s.seeds || []
  if (at === 2) {
    const b = await buildLoop(id, counters, s, gateEvidence)
    if (b.paused) return `${id} paused: agent cap`
    if (b.infraDebt) return `${id} parked with infra debt: ${b.lastEvidence.join(' | ').slice(0, 200)}`
    if (!b.ok) return escalate(id, s, counters, `fix rounds exhausted: ${b.lastEvidence.join(' | ').slice(0, 600)}`)
    seeds = b.seeds
    await persist(id, { phase: 'gate', counters, seeds })
    at = 3
  }
  if (at === 3) {
    const gate = await gatePhase(id, counters)
    if (gate.verdict === 'infra') return `${id} gate inconclusive (infra): the run retries it on the next iteration`
    if (gate.verdict === 'infra-debt') return `${id} parked with infra debt at the gate`
    if (gate.verdict === 'fail') {
      // a real failing test at the gate costs a fix round, like any refutation
      counters.fixRounds++
      await persist(id, { phase: 'implement', counters })
      log(`${id} gate failed: back to the build loop`)
      return sliceAction({ ...next, slice: { ...s, phase: 'implement', counters } }, [`[gate] failing test: ${gate.failingTest}`])
    }
    await persist(id, { phase: 'integrate', counters })
    at = 4
  }
  return integrate(id, s, counters, seeds)
```

`sliceAction(next, gateEvidence = [])` gains the second parameter; `lastGateFailingTest` is returned by `gatePhase` — simplest: have `gatePhase` return `{ verdict, failingTest }` instead of a bare string and adapt the calls (`gate.verdict === 'pass'` etc., `gate.failingTest` for the evidence). Do that; the test strings above stay valid.

5. `integrate()`: after the inconclusive handling, add:

```js
  if (r && r.state === 'regate') {
    await persist(id, { phase: 'gate' })
    return `${id} must re-gate: code changed after the passed gate (${r.notes || ''})`
  }
```

6. `INTERNALS` gains `gatePhase`, `GATE`.
7. `parkedRetry` (line 782) — an infra-debt park resumes where it was instead of re-planning:

```js
async function parkedRetry(next) {
  const s = next.slice || {}
  if (s.infraDebt) {
    const counters = normalizeCounters(s.counters)
    await run('state-writer', { op: 'unpark', sliceId: next.sliceId }, { schema: OK, effort: 'low', label: next.sliceId })
    return sliceAction({ ...next, slice: { ...s, status: 'in_progress', counters } })
  }
  const counters = { ...normalizeCounters(s.counters), planRevisions: 0, fixRounds: 0, ladderStep: 0 }
  await run('state-writer', { op: 'unpark', sliceId: next.sliceId }, { schema: OK, effort: 'low', label: next.sliceId })
  return sliceAction({ ...next, slice: { ...s, status: 'in_progress', phase: 'plan', counters } })
}
```

- [ ] **Step 4: Create `prompts/gate.md`:**

```markdown
# Role: gate

Run the full-repo regression lens on the slice's final commit and write the receipt that authorizes its merge.

Inputs: `sliceId`.

1. `git checkout sdlc/<id>`; confirm clean status. Diff with `git diff <defaultBranch>...HEAD`.
2. Hold the suite slot so no other full-suite run competes: `python3 "<skill>/suite-receipt.py" slot --repo .` (blocks until free). Release it with `slot-release` when done, in every exit path.
3. Run the **full** regression lens from `verifier.md` — full `config.commands` test, lint, typecheck and build; `config.commands.e2e` when set; conformance/fixture suites; the test-time budget; the receipt. Follow every rule there verbatim, including `outcome: "infra"` classification and the "cut off is not failed" rule.
4. Write your report to `.sdlc/slices/<id>/gate-r0.md` in the `## Suites` format of verifier.md's regression lens, plus the receipt confirmation line.

Return `{state: "pass" | "fail" | "infra", failingTest, commit, seconds, notes}`.
- `pass` only when every command finished green and the receipt was written with `--result pass` on the exact HEAD commit.
- `fail` only for a genuine failing test; `failingTest` names it as `<command> — <test>`.
- `infra` when the run could not produce a verdict; `notes` say what happened.
```

- [ ] **Step 5: Update `state-schema.md`:** `phase` enum gains `gate`; `counters` gains `gateCommit` (string, the commit the receipt covers) and `infraRetries` (number); slice fields gain `infraDebt` (boolean, optional) and `ledger` (array, Task 9). Note the retention rule: `gate-r0.md` and the receipt are kept at merge (Task 5's table).
- [ ] **Step 6: Tests pass** (`npm test`), **Step 7: Commit** — `git commit -m "feat(loop): explicit gate phase owns the full-repo regression and its receipt"`

### Task 5: Integrator — receipt authority, regate, retention, reports dir

**Files:**
- Modify: `skills/sdlc/prompts/integrator.md` (final check + cleanup), `skills/sdlc/prompts/test-reporter.md` (REPORT.md path)
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: gate receipt (`counters.gateCommit`, `suite-receipt.py check`).
- Produces: `.sdlc/reports/<id>/` layout that Task 9's tracker panel counts.

- [ ] **Step 1: Failing assertions in prompts.test.mjs** — integrator.md must contain `regate`, `reports/`, the prune list, and must NOT contain "run the full `config.commands` test, lint, typecheck and build yourself" for battery slices.
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Edit integrator.md.** Replace ship step 1 (Final check) with:

```markdown
1. **Final check (receipt is the merge authority):** `git checkout sdlc/<id>` and `git status` is clean. The gate wrote a receipt covering the final commit: `python3 "<skill>/suite-receipt.py" check --repo . --slice <id> --ref sdlc/<id>`. When it prints `"valid": true`, the full suite passed on this exact code — do not run anything. When it prints `"valid": false`, the code changed after the gate (commits that only touch `.sdlc/` do not count): return `{state: "regate", notes: "code changed after the passed gate"}`. A slice whose `counters.gateCommit` is empty and whose `risk` is `low` never carried a receipt by design: run build and typecheck plus the impact-mapped slice tests yourself (Task: `impact.py`) — they are the low-risk gate. If any fails, return `{state: "failed", notes}`; if one could not run to completion, return `{state: "inconclusive", notes}` and change nothing.
```

Replace the mode-ship step 6 CI-fix rule's product-code clause: after committing a product-code CI fix, the integrator returns `{state: "regate", notes}` instead of continuing (pr/mr/stack modes) — the loop re-gates and re-integrates.

Add to **Clean up** (before returning `merged`, every mode):

```markdown
0. **Retention prune (idempotent):** under `.sdlc/slices/<id>/`, delete `verification/` (logs, per-agent JSON and md parts, assets, unpromoted `tests/`). Move to `.sdlc/reports/<id>/`: the suite receipt, `gate-r0.md`, and the regression logs' final copies. Keep `plan.md`, `tests.md`, `failures.md`, `evidence.md`, every `verify-*.md` and `review-*.md`, ADRs and ledger rows. Skip the prune entirely when `config.json` has `"keepEvidence": true`.
1. **Stale-branch sweep:** `git branch --list 'sdlc/*'` — delete every `sdlc/<id>-v*` and `sdlc/<id>-attempt-*` branch not deleted by its owner. Never delete a branch of a slice that is not finished.
```

Edit `test-reporter.md`: REPORT.md is written to `.sdlc/reports/<id>/REPORT.md` (create the dir; copy the path into STATUS.md links as before).

- [ ] **Step 4: prompts tests pass**, **Step 5: Commit** — `git commit -m "feat(prompts): integrator trusts the gate receipt, prunes bulk at merge, reports live in .sdlc/reports/"`

### Task 6: Collector — evidence, not product

**Files:**
- Modify: `skills/sdlc/prompts/verify-collector.md` (rewrite), `skills/sdlc/sdlc-loop.js` (verifyPhase collector failure block, lines ~657–665), `skills/sdlc/prompts/verify-profile-common.md` (test destination)
- Test: `skills/sdlc/test/verify.test.mjs`, `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Produces: `.sdlc/slices/<id>/verification/r<round>/tests/<profile>-<part>/` — verifier test files, referenced by Task 7's promotion.

- [ ] **Step 1: Failing tests.** In `verify.test.mjs`: the "collector that cannot fold the profile branches refutes the round" test becomes "a collector failure is logged, never refutes":

```js
test('a collector that fails only logs; the round still fails or passes on the verifiers alone', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['http-api']),
    verifier: () => clear(),
    'verify-http-api': () => clear(),
    'verify-collector': () => ({ ok: false, notes: 'worktree busy' }),
  }))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(votes[1].refuted, false)
  assert.equal(rt.I.tallyVerify(votes, lenses).pass, true)
  assert.ok(rt.logs.some(l => /verify-collector/.test(l)))
})
```

- [ ] **Step 2: Verify it fails.**
- [ ] **Step 3: Loop change.** In `verifyPhase`, replace the collector block:

```js
  if (groups.length) {
    const c = await run('verify-collector', { sliceId: id, round, branches: groups.map(branch) }, { schema: OK, phase: 'Verify', label: `${id}:r${round}` })
    // cleanup is infra, not evidence: a collector failure never refutes; the branch sweep at the gate catches leftovers
    if (!c || !c.ok) log(`${id} verify r${round}: verify-collector did not finish cleanup (${c ? c.notes || '' : 'no report'})`)
  }
```

(profile agents now write their tests into the main tree themselves — see the prompt change — so nothing is folded and a pending re-run of pairs still works via `pendingPairs` on the profile votes.)

- [ ] **Step 4: Rewrite `verify-collector.md`:**

```markdown
# Role: verify-collector

Close out a verification round: file the profile agents' tests as evidence and remove their scratch. You fold nothing into the slice branch.

Inputs: `sliceId`, `round`, `branches` (one per profile agent: `sdlc/<id>-v<round>-<profile>-<part>`).

1. For each profile group, move the test files its agent wrote from its worktree/branch into `.sdlc/slices/<id>/verification/r<round>/tests/<profile>-<part>/` in the main tree. Their expected results are the cases in `.sdlc/slices/<id>/verification/r<round>/<profile>-<part>.json` — copy them unmodified, do not run them, do not fix them.
2. Delete every branch in the list (`git branch -D`; a missing branch is fine) and prune worktrees (`git worktree prune`).
3. List in `notes` every test file filed and every branch deleted.

Return `{ok, notes}`. `ok: false` only when test files could not be filed (they stay in the worktree; say where).
```

Edit `verify-profile-common.md`: profile agents write test files **directly into the main tree** at `.sdlc/slices/<id>/verification/r<round>/tests/<profile>-<part>/` (create dirs; these are evidence, never committed to `sdlc/<id>`); commit nothing to their branch; still remove their own worktree. Add the fast-test rule: "A verification test runs in milliseconds-to-seconds. Anything needing containers, servers or a browser belongs to the scenario, not the test file; never invoke the repo's test command from a test."

- [ ] **Step 5: tests pass**, **Step 6: Commit** — `git commit -m "feat(verify): verifier tests are evidence under verification/, collector only files and cleans"`

### Task 7: Test promotion on held refutations

**Files:**
- Modify: `skills/sdlc/prompts/implementer.md`, `skills/sdlc/prompts/test-checker.md`, `skills/sdlc/prompts/reviewer.md` (test-quality lens)
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: `.sdlc/slices/<id>/verification/r<round>/tests/` (Task 6) and `failingTest` paths in evidence (Task 1/3).

- [ ] **Step 1: Failing assertions in prompts.test.mjs** — implementer.md must contain "Promotion"; test-checker.md must contain "suite-count"; reviewer.md test-quality section must contain "serial-pass" and "nested".
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Edit implementer.md** — add a section:

```markdown
## Promotion (after a held refutation is fixed)

When your evidence names a failing test from `.sdlc/slices/<id>/verification/r<round>/tests/`, that test demonstrated the defect you just fixed: promote it into the suite as part of the fix. Place it where the repo's convention puts such tests, adapt imports, and make it pass. Before promoting: deduplicate against existing coverage (drop it if an existing test already pins the behavior), and apply the bar — no suite-count or inventory assertions, no wall-clock/timing assertions unless the behavior genuinely is timing, no test depending on a specific test *file* inventory. Record promoted files in tests.md. Never promote a seed or an ambiguous finding's test.
```

Edit `test-checker.md`: the checker additionally flags promoted tests that assert suite inventory (`**/*.test.*` counts, file listings) or wall-clock behavior.

Edit `reviewer.md` (test-quality lens): blocking when a committed test (a) invokes the repo's test command from inside a test (nested suite run), (b) asserts on timing without being a timing test (serial-pass admission: a file joins the serial pass only when it genuinely asserts durations/races, not when it merely logs `Date.now()`), (c) duplicates coverage an existing test already pins, or (d) was committed from verifier evidence without a promotion record in tests.md.

- [ ] **Step 4: prompts tests pass**, **Step 5: Commit** — `git commit -m "feat(prompts): verifier tests promote into the suite only with a demonstrated catch, under a quality bar"`

### Task 8: Suite slot in `suite-receipt.py`

**Files:**
- Modify: `skills/sdlc/suite-receipt.py`
- Test: `skills/sdlc/test/scripts.test.mjs`

**Interfaces:**
- Produces: `python3 "<skill>/suite-receipt.py" slot --repo . [--timeout N]` — blocks (flock on `.sdlc/suite.lock`) until the slot is free, holds it, exits 0; `slot-release --repo .` releases. `slot --timeout 0` exits 1 when busy.

- [ ] **Step 1: Failing test** — two concurrent `slot` calls: the second with `--timeout 0` exits non-zero while the first holds it; `slot-release` frees it. Follow scripts.test.mjs fixture style.
- [ ] **Step 2: Verify it fails.**
- [ ] **Step 3: Implement** with `fcntl.flock` (`LOCK_EX | LOCK_NB` retry loop; `--timeout` default 0 for the probe, blocking wait when no timeout given); the lock file lives at `<repo>/.sdlc/suite.lock` (create `.sdlc/` if missing).
- [ ] **Step 4: Tests pass**, **Step 5: Commit** — `git commit -m "feat(scripts): suite-receipt slot serializes full-suite runs"`

### Task 9: Efficacy ledger and tracker panel

**Files:**
- Modify: `skills/sdlc/sdlc-loop.js` (buildLoop + gatePhase append rows), `skills/sdlc/prompts/state-schema.md` (ledger schema), `skills/sdlc/tracker/hub.py` (economics panel), `skills/sdlc/tracker/template.html` (panel markup)
- Test: `skills/sdlc/test/hub.test.mjs`, `skills/sdlc/test/economy.test.mjs`

**Interfaces:**
- Produces: slice `ledger` rows `{kind: 'verify'|'gate', round, outcome: 'verified'|'refuted'|'infra', refutations, failingTests}` (numbers); hub panel "Verify economics": per-run refutation→fix rate (a `refuted` row followed later by a `verified` row for the same slice at a higher round), infra-retry counts, fix-round distribution, agents-per-verify-round from the journal.

- [ ] **Step 1: Failing tests.** Hub: feed a `status.json`/slices fixture with ledger rows (refuted r0 → verified r1, two infra rows) and assert the panel counts; economy: after a verify round, a `state-writer` patch with `ledger` was sent (assert `rt.calls` contains a persist whose patch.ledger last row matches the round's outcome).
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Loop change.** In `buildLoop`, after `counters.infraRetries = 0` / after computing `v`:

```js
      const row = { kind: 'verify', round, outcome: v.pass ? 'verified' : v.infra && !v.refutations ? 'infra' : 'refuted', refutations: v.refutations, failingTests: v.failingTests.length }
      await persist(id, { counters, ledger: [...(s.ledger || []), row] })
```

(fold into the existing `persist(id, { counters })` calls in the round path so only one state-write happens per round; `gatePhase` appends `{ kind: 'gate', round: 0, outcome, refutations: g.state === 'fail' ? 1 : 0, failingTests: g.state === 'fail' ? 1 : 0 }` the same way.)
- [ ] **Step 4: hub.py panel** — read `ledger` arrays from slices.json, compute the four numbers, render into template.html's status board next to the existing counts (match the existing server-side rendering pattern in hub.py).
- [ ] **Step 5: Tests pass**, **Step 6: Commit** — `git commit -m "feat(tracker): verify-economics ledger and hub panel"`

### Task 10: Wire the slot and gate into the regression prompts + SKILL.md/meta updates

**Files:**
- Modify: `skills/sdlc/prompts/verifier.md` (slot step in the full-scope rule), `skills/sdlc/SKILL.md` (phase list), `sdlc-loop.js` `meta.phases` (add `{ title: 'Gate' }`)
- Test: `skills/sdlc/test/prompts.test.mjs`, `skills/sdlc/test/core.test.mjs` (meta.phases)

- [ ] **Step 1: Failing assertions** — verifier.md full-scope rule contains `suite-receipt.py" slot`; meta.phases contains `Gate` between Implement/Verify group and Integrate.
- [ ] **Step 2: Verify they fail.**
- [ ] **Step 3: Edit** — add to verifier.md full scope: "Hold the suite slot first: `python3 "<skill>/suite-receipt.py" slot --repo .` (blocks until free); release it with `slot-release` in every exit path." Add `{ title: 'Gate' }` to `meta.phases` after `{ title: 'Verify' }`; SKILL.md phase list gains Gate with a one-line description.
- [ ] **Step 4: Tests pass**, **Step 5: Commit** — `git commit -m "docs(loop): gate phase and suite slot documented and wired"`

### Task 11: Lifecycle fixture test

**Files:**
- Test: `skills/sdlc/test/economy.test.mjs` (append)

**Interfaces:** Consumes Tasks 1–9. This is the Review Focus #3 and #4 net.

- [ ] **Step 1: Write the test** — a full `runMain` slice with scripted roles: implementer green, one profile verifier refutes with `failingTest: '.sdlc/slices/S-1/verification/r0/tests/http-api-0/replay.test.ts — x — R-1'`, collector ok, implementer fixes + promotes (assert the second implementer call's inputs carry the failingTest in evidence), verifier/profile clear, review clear, gate pass with `commit`, integrator merged with receipt-valid notes. Assert: roles order contains `gate` between the last review and `integrator`; the ledger patch rows appear; no cherry-pick role exists anywhere.
- [ ] **Step 2: Verify it passes with the whole suite** (`npm test`) — fix whatever the lifecycle exposes.
- [ ] **Step 3: Commit** — `git commit -m "test(loop): slice lifecycle through gate, promotion and ledger"`

### Task 12: Docs and state-schema consistency pass

**Files:**
- Modify: `skills/sdlc/prompts/state-schema.md` (full pass: phases, counters, ledger, infraDebt, reports/ layout, retention table), `skills/sdlc/SKILL.md`, `README.md` if it describes phases
- Test: `skills/sdlc/test/prompts.test.mjs`, `skills/sdlc/test/next-action.test.mjs`

- [ ] **Step 1: Failing assertions** — state-schema.md names `gate` in the phase enum, `gateCommit`/`infraRetries` in counters, `infraDebt`/`ledger` on slices, `.sdlc/reports/<id>/` and the keep/drop table; next-action tests still pass unchanged (routing is phase-agnostic).
- [ ] **Step 2: Verify they fail**, **Step 3: Edit the docs** to match exactly what Tasks 1–10 implemented (no aspirational text).
- [ ] **Step 4: Full suite green** (`npm test`), **Step 5: Commit** — `git commit -m "docs(sdlc): verify-economy state schema and phase docs"`