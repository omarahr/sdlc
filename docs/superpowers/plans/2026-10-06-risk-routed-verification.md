# Risk-Routed Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slices rated `low` by the slicer skip the per-slice verification battery (planner, toolsmith, profiles, spec-fidelity, regression, collector), with the review phase able to demand it back.

**Architecture:** `risk`/`riskReason` live on the slice in `slices.json`, flow to the loop via `next-action.py`'s `slim_slice`, and gate `verifyPhase` in `buildLoop`. A reviewer report with `needsVerify: true` persists `counters.verifyDemanded`, turning the battery on for the same round (clean review) or the next (blocking findings first). The milestone campaign covers deferred slices prompt-side; the integrator's existing no-receipt fallback covers the suite.

**Tech Stack:** JavaScript workflow script (`sdlc-loop.js`, node:test with the scripted fake runtime), Python 3 stdlib (`next-action.py`), Markdown prompts.

**Spec:** `docs/superpowers/specs/2026-10-06-risk-routed-verification-design.md`

## Global Constraints

- An unrated slice (no `risk` field — old runs, `S-fix-*` slices) ALWAYS gets the full battery. This is the safe default and must be pinned by a test.
- The existing `happy()` happy-path test in slice.test.mjs must stay green unchanged — it is the unrated-slice pin.
- Schema and prompt must agree exactly: a field the prompt asks for but the schema strips never reaches the loop.
- Counters spread (`normalizeCounters` keeps unknown keys), but new keys are still documented in `state-schema.md`.
- Comments match the codebase style: lowercase sentence explaining *why*.
- Tests: `npm test` (`node --test skills/sdlc/test/*.test.mjs`); the loop is tested through `runMain`/`loadInternals` with `scripted(...)` fake agents from `test/harness.mjs`.

## Review Focus

1. **Resume mid-run**: a low slice resuming at phase `implement` must still skip the battery — routing reads `risk` fresh from `slim_slice` every launch (Task 2 test).
2. **A demanded battery that refutes** must send the slice into a normal fix round carrying the verify evidence, not loop or ship (Task 2 test).
3. **Schema/prompt drift on `needsVerify`**: the reviewer prompt asks for it; if the FINDINGS schema dropped it the loop would never see it — pinned by a source-level assertion plus behavior tests (Task 2).
4. **An old `slices.json` whose entries have no `risk`** must route to the battery and never crash `slim_slice` (Task 1 test).
5. **The integrator note must not weaken the receipt rule for rated slices** — the prompt line scopes strictly to low-risk slices (Task 3 test asserts the scoping wording).

---

### Task 1: Risk on the slice

**Files:**
- Modify: `skills/sdlc/next-action.py` (`slim_slice`, ~line 228)
- Modify: `skills/sdlc/prompts/slicer.md` (the appending rules)
- Modify: `skills/sdlc/prompts/state-schema.md` (the slices.json section)
- Test: `skills/sdlc/test/next-action.test.mjs`, `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `slim_slice` returns `risk` (string) only when the slice has one — Task 2 routes on `s.risk === 'low'`. `slices.json` entries may carry `risk` (`"low"|"medium"|"high"`) and `riskReason` (string).

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/next-action.test.mjs` (the file already has `slice`, `fixture`, `decide`, `next` helpers — `slice(id, status, extra)` merges extra fields onto the slice, `fixture({'slices.json': [...]})` builds a repo, `next(repo)` returns the decision's `next`):

```js
test('slim_slice passes a slice\'s risk through to the loop, and old slices stay unrated', opts, () => {
  const low = fixture({ 'slices.json': [slice('S-1', 'todo', { risk: 'low', riskReason: 'pure deletion' })] })
  const n1 = next(low)
  assert.equal(n1.action, 'slice')
  assert.equal(n1.slice.risk, 'low', 'the loop routes on this')
  const old = fixture({ 'slices.json': [slice('S-1', 'todo')] })
  const n2 = next(old)
  assert.equal(n2.action, 'slice')
  assert.equal('risk' in n2.slice, false, 'no risk key at all: an unrated slice is explicit')
})
```

Note for the implementer: if the fixture needs more state for a `slice` decision (requirements the slice lists, etc.), copy the smallest working `slice`-action fixture from an existing test in the file and add `risk` to it — the assertion targets are `n.slice.risk` and `'risk' in n.slice`, nothing else.

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('the slicer rates each slice\'s verification risk, low only for harmless changes', () => {
  const slicer = readFileSync(join(SKILL_DIR, 'prompts', 'slicer.md'), 'utf8')
  assert.match(slicer, /`risk` is `low`, `medium` or `high`/)
  assert.match(slicer, /riskReason/)
  assert.match(slicer, /[Ww]hen in doubt, (rate )?`medium`/)
  const schema = readFileSync(join(SKILL_DIR, 'prompts', 'state-schema.md'), 'utf8')
  assert.match(schema, /"risk": ""/)
  assert.match(schema, /"riskReason": ""/)
  assert.match(schema, /no `risk`[\s\S]{0,200}full (verification )?battery|unrated[\s\S]{0,200}full (verification )?battery/i)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/next-action.test.mjs skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — `'risk' in n1.slice` is false today; the prompt regexes don't match.

- [ ] **Step 3: Implement**

In `skills/sdlc/next-action.py`, `slim_slice`:

```python
def slim_slice(s):
    # the workflow script uses only these fields; the agents read the rest from slices.json
    out = {
        "id": s["id"], "kind": s.get("kind", "spec"), "status": s.get("status", "todo"), "phase": s.get("phase", "plan"),
        "counters": counters(s), "seeds": s.get("seeds") or [], "pr": s.get("pr", ""),
    }
    # absent, not null: an unrated slice must route to the full battery, and only absence says so
    if s.get("risk"):
        out["risk"] = s["risk"]
    return out
```

In `skills/sdlc/prompts/slicer.md`, extend the "Appending" bullet list (after the `branch: sdlc/<id>` bullet):

```markdown
   - Rate each new slice's verification risk: `risk` is `low`, `medium` or `high`, with the reason in one sentence (`riskReason`). `low` is only for changes whose worst case is a build or test failure: pure deletions of grep-proven dead code, dead config, docs, renames with no runtime readers. Anything crossing an I/O boundary, or touching boot, auth, concurrency or data mutation, is at least `medium`. When in doubt, rate `medium` — a `low` slice skips its verification battery entirely, and a wrong skip is only caught later, at the milestone's behavior campaign.
```

In `skills/sdlc/prompts/state-schema.md`, in the `slices.json` entry's JSON example, add after `"pr": "",`:

```json
    "risk": "",
    "riskReason": "",
```

and after the bullet explaining `kind`, add:

```markdown
- `risk` is `low`, `medium` or `high`, assigned by the slicer. A `low` slice skips the per-slice verification battery (the milestone's behavior campaign still covers it, and a reviewer can demand the battery back). A slice with no `risk` — written before this field existed, or a fix slice — is unrated and always gets the full battery.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test skills/sdlc/test/next-action.test.mjs skills/sdlc/test/prompts.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/sdlc/next-action.py skills/sdlc/prompts/slicer.md skills/sdlc/prompts/state-schema.md skills/sdlc/test/next-action.test.mjs skills/sdlc/test/prompts.test.mjs
git commit -m "feat(verify): the slicer rates each slice's verification risk"
```

### Task 2: The routing — skip the battery, and let review demand it back

**Files:**
- Modify: `skills/sdlc/sdlc-loop.js` (FINDINGS schema, `reviewPhase`, `buildLoop`, `normalizeCounters`, `sliceAction`)
- Modify: `skills/sdlc/prompts/reviewer.md`
- Test: `skills/sdlc/test/slice.test.mjs`, `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: `s.risk` from Task 1's `slim_slice`.
- Produces: `buildLoop(id, counters, s)` — third parameter is the slim slice object; `reviewPhase` returns `{ blocking, seeds, needsVerify }`; `counters.verifyDemanded` (boolean, persisted).

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/slice.test.mjs` (`sliceNext(phase, extra)` merges extra onto the slice; overriding `state-reader` in `happy(overrides)` replaces the default slice):

```js
test('a low-risk slice skips the verify battery and ships on a clean review', async () => {
  const rt = await runMain(happy({
    'state-reader': [sliceNext('plan', { risk: 'low' }), { action: 'stop', reason: 'test end' }],
  }))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.roles().some(r => r.startsWith('verify-')), false, 'no planner, profiles or collector')
  assert.equal(rt.roles().includes('verifier'), false, 'no spec-fidelity or regression lens')
  assert.equal(rt.calls.filter(c => c.role === 'reviewer').length, 3, 'the three review lenses still run')
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.sliceId, 'S-1', 'a clean review ships it')
})

test('a low-risk slice resumed at implement still skips the battery', async () => {
  const rt = await runMain(happy({
    'state-reader': [sliceNext('implement', { risk: 'low' }), { action: 'stop', reason: 'test end' }],
  }))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.roles().some(r => r === 'verifier' || r.startsWith('verify-')), false)
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.sliceId, 'S-1')
})

test('a reviewer demanding verification turns the battery on for the same round', async () => {
  const rt = await runMain(happy({
    'state-reader': [sliceNext('plan', { risk: 'low' }), { action: 'stop', reason: 'test end' }],
    reviewer: () => ({ findings: [], needsVerify: true }),
  }))
  assert.deepEqual(rt.errors, [])
  assert.deepEqual(rt.roles().filter(r => r.startsWith('verify-')), ['verify-planner', 'verify-http-api', 'verify-security', 'verify-collector'])
  assert.deepEqual(rt.calls.filter(c => c.role === 'verifier').map(c => c.inputs.lens).sort(), ['regression', 'spec-fidelity'])
  assert.equal(rt.calls.filter(c => c.role === 'reviewer').length, 3, 'the demanding review is reused, not re-run')
  const patches = rt.calls.filter(c => c.role === 'state-writer').map(c => c.inputs.patch)
  assert.ok(patches.some(p => p.counters && p.counters.verifyDemanded === true), 'the demand is persisted with the counters')
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.sliceId, 'S-1', 'a clear battery still ships the slice')
})

test('a demanding review with blocking findings fixes first; the battery judges the fix', async () => {
  let n = 0
  const rt = await runMain(happy({
    'state-reader': [sliceNext('plan', { risk: 'low' }), { action: 'stop', reason: 'test end' }],
    reviewer: () => (n++ === 0
      ? { findings: [{ title: 'boundary bug', detail: 'crosses I/O', blocking: true }], needsVerify: true }
      : { findings: [] }),
  }))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.roles().filter(r => r === 'verify-planner').length, 1, 'the battery ran once')
  assert.equal(rt.calls.find(c => c.role === 'verify-planner').inputs.round, 1, 'on the round after the fix, not before it')
  assert.deepEqual(rt.calls.filter(c => c.role === 'implementer').map(c => c.inputs.fixRound), [0, 1])
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.sliceId, 'S-1')
})

test('a demanded battery that refutes sends the slice into a fix round with the verify evidence', async () => {
  const rt = await runMain(happy({
    'state-reader': [sliceNext('plan', { risk: 'low' }), { action: 'stop', reason: 'test end' }],
    reviewer: (c, calls) => (calls.filter(x => x.role === 'reviewer').length <= 3 ? { findings: [], needsVerify: true } : { findings: [] }),
    // refute only in the round the demand created; the fix round must verify clean
    'verify-http-api': (c) => (c.inputs.round === 0 ? { refuted: true, evidence: 'GET /x 500s' } : clear()),
  }))
  assert.deepEqual(rt.errors, [])
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2, 'the refutation cost a fix round')
  assert.ok(impls[1].inputs.evidence.some(e => /GET \/x 500s/.test(e)), 'the implementer gets the verify evidence')
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.sliceId, 'S-1', 'the second round verifies clean and ships')
})
```

(The last test's reviewer demands on the first round's three lens calls and stops demanding afterwards — the demand is persisted, so round 1 runs the battery without a new demand; the second battery passes and the alongside review is clean.)

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('the reviewer can demand the verification battery for a mis-rated slice, and the schema passes the flag', () => {
  const reviewer = readFileSync(join(SKILL_DIR, 'prompts', 'reviewer.md'), 'utf8')
  assert.match(reviewer, /needsVerify/)
  assert.match(reviewer, /riskier than (that|the) (label|rating)|mis-rated/)
  const loop = readFileSync(join(SKILL_DIR, 'sdlc-loop.js'), 'utf8')
  const findings = loop.match(/const FINDINGS = \{[\s\S]*?\n\}/)[0]
  assert.match(findings, /needsVerify/, 'a flag the schema strips never reaches the loop')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/slice.test.mjs skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — the low slice still runs the battery (existing behavior), the prompt regexes don't match.

- [ ] **Step 3: Implement `sdlc-loop.js`**

a. FINDINGS schema (currently at line ~491) gains the optional flag:

```js
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: { type: 'object', properties: { title: str, detail: str, file: str, blocking: { type: 'boolean' } }, required: ['title', 'detail', 'blocking'] },
    },
    // a reviewer sets this when the code is riskier than the slice's low rating; the loop runs the battery
    needsVerify: { type: 'boolean' },
  },
  required: ['findings'],
}
```

b. `reviewPhase` returns the OR of the lenses' demands — change its last line from `return { blocking: [...missing, ...held], seeds }` to:

```js
  return { blocking: [...missing, ...held], seeds, needsVerify: reports.some(r => r && r.needsVerify) }
```

c. `normalizeCounters` gains the default:

```js
  return { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, verifyDemanded: false, ...(c || {}) }
```

d. `buildLoop` — new signature `async function buildLoop(id, counters, s = {})`, and restructure the green-implementer branch. Replace this block:

```js
    } else {
      const { votes, lenses, next, review: early } = await verifyPhase(id, round, prevVerify, reviewFix, () => reviewPhase(id, round))
      prevVerify = next
      reviewFix = false
```

with:

```js
    } else {
      // a low-risk slice skips the battery until a reviewer demands it; the review runs first,
      // so its verdict can switch the battery on for this same round
      let early = null
      if (!(s.risk !== 'low' || counters.verifyDemanded)) {
        early = await reviewPhase(id, round)
        log(`${id} review r${round}: ${early.blocking.length} blocking, ${early.seeds.length} seed(s); low-risk, no verify battery`)
        if (early.needsVerify) {
          counters.verifyDemanded = true
          log(`${id} review r${round}: a reviewer demanded verification; the battery runs now and from here on`)
        }
        if (early.blocking.length) {
          // fix first; the demanded battery judges the fix from the next round
          evidence = early.blocking.map(reviewEvidence)
          reviewFix = true
          counters.fixRounds++
          await persist(id, { counters })
          continue
        }
        if (!early.needsVerify) return { ok: true, seeds: [...early.seeds, ...verifySeeds], lastEvidence: [] }
      }
      const { votes, lenses, next, review: earlyReview } = await verifyPhase(id, round, prevVerify, reviewFix, early ? () => early : () => reviewPhase(id, round))
      prevVerify = next
      reviewFix = false
      // the review that demanded this battery is already in hand; verifyPhase may not have run it alongside
      const review0 = earlyReview || early
```

and in the rest of the branch, replace the two uses of the old `early` variable accordingly:

- in the `!v.pass` branch, `if (early && early.blocking.length)` becomes `if (review0 && review0.blocking.length)`, `log(...)` and `evidence.push(...early.blocking.map(reviewEvidence))` use `review0`;
- in the pass branch, `const review = early || await reviewPhase(id, round)` becomes `const review = review0 || await reviewPhase(id, round)`.

e. `sliceAction` passes the slice: `const b = await buildLoop(id, counters)` becomes `const b = await buildLoop(id, counters, s)`.

- [ ] **Step 4: Implement `reviewer.md`**

Append to `skills/sdlc/prompts/reviewer.md`, replacing the final return-contract line:

```markdown
The slice may be rated `low`-risk in slices.json and so skip the verification battery. When the code you are reading is riskier than that rating — it crosses an I/O boundary, touches boot, auth, concurrency or data mutation, or a mistake in it would be loud — set `needsVerify: true` and add a non-blocking finding saying why. That is the correction for a mis-rated slice: the full verification battery runs on it from this round. Use it sparingly — not as a way to ask for more testing of a well-rated slice.

Return `{findings: [{title, detail, file, blocking}], needsVerify}`. `detail` states the concrete problem and the fix. Return an empty `findings` array when clean; `needsVerify` defaults to false.
```

(The old line being replaced is: `` Return `{findings: [{title, detail, file, blocking}]}`. `detail` states the concrete problem and the fix. Return `[]` when clean. ``)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test skills/sdlc/test/slice.test.mjs skills/sdlc/test/verify.test.mjs skills/sdlc/test/prompts.test.mjs`
Expected: PASS, including the untouched happy-path test (the unrated-slice pin).

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add skills/sdlc/sdlc-loop.js skills/sdlc/prompts/reviewer.md skills/sdlc/test/slice.test.mjs skills/sdlc/test/prompts.test.mjs
git commit -m "feat(verify): low-risk slices skip the battery unless a reviewer demands it"
```

### Task 3: The nets — campaign coverage and the integrator note

**Files:**
- Modify: `skills/sdlc/prompts/scenario-planner.md` (step 1 and step 3)
- Modify: `skills/sdlc/prompts/integrator.md` (the final-check item)
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: the `risk` field on slices from Task 1.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('the campaign covers slices that skipped verification, and the integrator receipt note is scoped to them', () => {
  const planner = readFileSync(join(SKILL_DIR, 'prompts', 'scenario-planner.md'), 'utf8')
  assert.match(planner, /`risk`[\s\S]{0,200}`low`/, 'the planner reads the slices\' risk')
  assert.match(planner, /skipped (its|the per-slice) verification battery/)
  const integrator = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  assert.match(integrator, /low-risk/)
  assert.match(integrator, /never (carries|carry) a receipt|no receipt[\s\S]{0,80}expected/)
  // the note must not weaken the receipt rule for rated slices
  assert.match(integrator, /suite-receipt\.py" check/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — the new regexes don't match.

- [ ] **Step 3: Implement `scenario-planner.md`**

In `skills/sdlc/prompts/scenario-planner.md`, add to the step-1 "Read:" list, after the member-slices bullet:

```markdown
   - each member slice's `risk` in slices.json: a slice rated `low` skipped its verification battery, so its corners have had no adversarial look yet;
```

and in step 3 ("Cover, for every requirement:"), append:

```markdown
For each member slice rated `low`, treat its corners as mandatory: its code was never verified at its boundaries, so the campaign is the only adversarial look it gets before the audit. Hunt its failure modes with the same rigor as a `high`-rated slice's.
```

- [ ] **Step 4: Implement `integrator.md`**

In `skills/sdlc/prompts/integrator.md`, in the "Final check" item, after the sentence ending "...they passed: do not run them again, and note the receipt's commit in evidence.md.", add:

```markdown
A slice rated low-risk never carries a receipt — it skips the regression verifier by design — so for it the `valid: false` answer is expected, not a symptom of a broken verifier: run the suite yourself.
```

- [ ] **Step 5: Run the tests to verify they pass, then the full suite**

Run: `node --test skills/sdlc/test/prompts.test.mjs && npm test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add skills/sdlc/prompts/scenario-planner.md skills/sdlc/prompts/integrator.md skills/sdlc/test/prompts.test.mjs
git commit -m "feat(verify): the campaign and the integrator absorb low-risk slices"
```
