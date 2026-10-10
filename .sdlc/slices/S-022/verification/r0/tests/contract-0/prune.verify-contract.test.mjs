import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const KIT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'
const { rng, defaultSeed, callPython } = await import(KIT)
const STATE = join(WT, 'skills/sdlc/state-write.py')

function openPr(calls) {
  const out = execFileSync('python3', ['-I', '-c', `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("sw", sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
res = []
for repo, fmt in json.load(sys.stdin):
    try:
        v = m.milestone_branches_with_open_slice_pr(repo, fmt)
        res.append({"outcome": "return", "value": sorted(v), "isSet": isinstance(v, set)})
    except m.Fail as e:
        res.append({"outcome": "Fail", "message": str(e)})
    except BaseException as e:
        res.append({"outcome": "exception", "type": type(e).__name__, "message": str(e)})
print(json.dumps(res))
`, STATE], { input: JSON.stringify(calls), encoding: 'utf8', maxBuffer: 1 << 28 })
  return JSON.parse(out)
}
const RUNS = 1500
const SEED = defaultSeed()
console.log(`property-run seed=${SEED} runs=${RUNS}`)

const PREFIXES = ['sdlc/', 'feature/PROJ-1-', 'team/x/', 'a.b-', '', 'Feature/', 'v1_']
const SUFFIXES = ['', '-end', '/tip', '.x']
const NUMS = ['0', '1', '2', '7', '10', '007', '00', '123456789012345678901234567890', '١', '١٢', '1٢']

function genFormat(r) {
  const lower = r.bool(0.4)
  return { prefix: r.pick(PREFIXES), suffix: r.pick(SUFFIXES), lower, text: null }
}
const fmtText = f => `${f.prefix}${f.lower ? '{name:lower}' : '{name}'}${f.suffix}`

function genMiddle(r) {
  const n = r.pick(NUMS)
  return r.pick([
    `M-${n}`, `M-${n}`, `M-${n}`, `M-${n}-e2e`, `M-${n}-e2e-area`, `S-${r.pick(['001', '12', 'fix-M-1-1'])}`, `run-${n}`,
    `state-20260101000000`, `m-${n}`, `M-`, `M${n}`, `M-${n}x`, `xM-${n}`, `M-${n}/`, `M-${n}/y`, `M--${n}`, `M- ${n}`,
    `S-001-v1-unit-0`, `M-1-attempt-2`, '', 'M', 'M-' + '9'.repeat(r.int(1, 200)), `Μ-${n}`, `M−${n}`,
  ])
}

function genCase(r) {
  const f = genFormat(r)
  const middle = genMiddle(r)
  let branch = f.prefix + middle + f.suffix
  const mut = r.int(0, 9)
  if (mut === 0) branch = 'x' + branch
  else if (mut === 1) branch = branch.slice(1)
  else if (mut === 2) branch = branch + 'z'
  else if (mut === 3 && f.lower) branch = branch.toUpperCase()
  else if (mut === 4 && f.lower) branch = branch.toLowerCase()
  else if (mut === 5) branch = f.prefix.toUpperCase() + middle + f.suffix
  return { fmt: f, branch }
}

function modelIsMilestone({ fmt, branch }) {
  const norm = s => (fmt.lower ? s.toLowerCase() : s)
  if (branch.length < fmt.prefix.length + fmt.suffix.length) return false
  if (norm(branch.slice(0, fmt.prefix.length)) !== norm(fmt.prefix)) return false
  if (fmt.suffix && norm(branch.slice(branch.length - fmt.suffix.length)) !== norm(fmt.suffix)) return false
  const middle = branch.slice(fmt.prefix.length, branch.length - fmt.suffix.length)
  return (fmt.lower ? /^M-\p{Nd}+$/iu : /^M-\p{Nd}+$/u).test(middle)
}

test('verify contract: branch_kind equals milestone exactly when the middle is M-<digits> (VS-5)', () => {
  const r = rng(SEED)
  const cases = Array.from({ length: RUNS }, () => genCase(r))
  const results = callPython(STATE, 'branch_kind', cases.map(c => [fmtText(c.fmt), c.branch]))
  const bad = []
  let milestones = 0
  cases.forEach((c, i) => {
    const res = results[i]
    if (res.outcome !== 'return') { bad.push({ c, res }); return }
    const got = res.value === 'milestone'
    if (got) milestones++
    if (got !== modelIsMilestone(c)) bad.push({ c, got, expected: !got })
  })
  console.log(`branch_kind milestones=${milestones}/${RUNS} violations=${bad.length}`)
  assert.ok(milestones > 100, 'generator reaches the milestone class')
  assert.deepEqual(bad.slice(0, 5), [])
})

test('verify contract: old sdlc/M-<digits> regex and branch_kind agree under the default format (VS-5)', () => {
  const r = rng(SEED + 1)
  const cases = Array.from({ length: RUNS }, () => 'sdlc/' + genMiddle(r)).concat(['main', 'feature/other', 'sdlc/M-1/x', 'sdlc/sdlc/M-1', 'sdlc/M-0', 'sdlc/M-007', 'sdlc/M-١'])
  const results = callPython(STATE, 'branch_kind', cases.map(b => ['sdlc/{name}', b]))
  const old = /^sdlc\/M-\p{Nd}+$/u
  const bad = cases.flatMap((b, i) => ((results[i].value === 'milestone') !== old.test(b) ? [{ b, got: results[i].value }] : []))
  console.log(`regex-agreement cases=${cases.length} disagreements=${bad.length}`)
  assert.deepEqual(bad.slice(0, 5), [])
})

test('verify contract: milestone_branches_with_open_slice_pr equals the reference set (VS-4)', () => {
  const r = rng(SEED + 2)
  const { mkdtempSync, mkdirSync, writeFileSync } = require_fs()
  const root = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'vc-'))
  const cases = []
  for (let i = 0; i < RUNS; i++) {
    const nm = r.int(0, 4)
    const milestones = Array.from({ length: nm }, (_, k) => ({ id: `M-${k + 1}`, slices: [], fixSlices: [] }))
    const slices = []
    const expected = new Set()
    const f = genFormat(r)
    const text = fmtText(f)
    const ns = r.int(0, 6)
    for (let k = 0; k < ns; k++) {
      const sid = `S-${String(k + 1).padStart(3, '0')}`
      const status = r.pick(['awaiting-merge', 'awaiting-merge', 'todo', 'done', 'in_progress', 'parked'])
      slices.push({ id: sid, status })
      if (nm && r.bool(0.7)) {
        const m = r.pick(milestones)
        m[r.bool(0.8) ? 'slices' : 'fixSlices'].push(sid)
        if (status === 'awaiting-merge') expected.add(f.prefix + (f.lower ? m.id.toLowerCase() : m.id) + f.suffix)
      }
    }
    if (r.bool(0.1)) slices.push({ id: 'S-900', status: 'awaiting-merge' })
    const dir = join(root, String(i))
    mkdirSync(join(dir, '.sdlc'), { recursive: true })
    writeFileSync(join(dir, '.sdlc', 'slices.json'), JSON.stringify(slices))
    writeFileSync(join(dir, '.sdlc', 'milestones.json'), JSON.stringify(milestones))
    cases.push({ dir, text, expected: [...expected].sort(), f })
  }
  const results = openPr(cases.map(c => [c.dir, c.text]))
  const bad = []
  cases.forEach((c, i) => {
    const res = results[i]
    const got = res.outcome === 'return' ? res.value : res
    const want = c.expected
    if (JSON.stringify(got) !== JSON.stringify(want.sort())) bad.push({ text: c.text, got, want })
  })
  console.log(`open-slice-pr cases=${cases.length} nonEmpty=${cases.filter(c => c.expected.length).length} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 5), [])
})

test('verify contract: documented example sets are exact (VS-4)', () => {
  const root = mkdtempSync2()
  const w = (name, v) => { mkdirSync2(join(root, '.sdlc')); writeFileSync2(join(root, '.sdlc', name), JSON.stringify(v)) }
  w('slices.json', [{ id: 'S-001', status: 'awaiting-merge' }, { id: 'S-002', status: 'done' }])
  w('milestones.json', [{ id: 'M-1', slices: ['S-001'] }, { id: 'M-2', slices: ['S-002'] }])
  const run = f => openPr([[root, f]])[0]
  assert.deepEqual(run('feature/PROJ-1-{name}').value, ['feature/PROJ-1-M-1'])
  assert.deepEqual(run('feature/{name:lower}').value, ['feature/m-1'])
  assert.deepEqual(run('sdlc/{name}').value, ['sdlc/M-1'])
  w('slices.json', [{ id: 'S-001', status: 'todo' }, { id: 'S-003', status: 'awaiting-merge' }])
  assert.deepEqual(run('feature/PROJ-1-{name}').value, [], 'no pending slice, and a pending slice with no milestone')
})

test('verify contract: bad format becomes the module Fail, not another exception (VS-4, VS-5)', () => {
  const root = mkdtempSync2()
  mkdirSync2(join(root, '.sdlc'))
  writeFileSync2(join(root, '.sdlc', 'slices.json'), JSON.stringify([{ id: 'S-001', status: 'awaiting-merge' }]))
  writeFileSync2(join(root, '.sdlc', 'milestones.json'), JSON.stringify([{ id: 'M-1', slices: ['S-001'] }]))
  for (const bad of ['', 'nope', '{name}{name}', '{name}/{name:lower}', null, 5, ['a'], 'a/{name}\u0000', 'a/{id}']) {
    const a = openPr([[root, bad]])[0]
    const b = callPython(STATE, 'branch_kind', [[bad, 'sdlc/M-1']])[0]
    for (const [label, res] of [['open_slice_pr', a], ['branch_kind', b]]) {
      assert.ok(res.outcome === 'Fail' || res.outcome === 'return', `${label}(${JSON.stringify(bad)}) raised ${res.type}: ${res.message}`)
    }
  }
})

test('verify contract: consumer surface and dependency rules (VS-5)', () => {
  const src = readFileSync(STATE, 'utf8')
  assert.doesNotMatch(src, /MILESTONE_BRANCH/)
  assert.ok(!src.includes('sdlc/{'))
  const out = execFileSync('python3', ['-I', '-c', `
import importlib.util, inspect, json, sys
spec = importlib.util.spec_from_file_location("sw", sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
names = ["format_of","branch_name","branch_kind","milestone_branches_with_open_slice_pr","prune_stale_milestone_branches","ensure_milestone_branch","ensure_slice_branch","slice_base","awaiting_merge_base"]
print(json.dumps({n: str(inspect.signature(getattr(m, n))) for n in names} | {"MILESTONE_BRANCH": hasattr(m, "MILESTONE_BRANCH")}))
`, STATE], { encoding: 'utf8' })
  console.log('surface ' + out.trim())
  const sig = JSON.parse(out)
  assert.equal(sig.MILESTONE_BRANCH, false)
  assert.equal(sig.milestone_branches_with_open_slice_pr, '(repo, fmt)')
  assert.equal(sig.prune_stale_milestone_branches, '(repo, config, keep, fmt)')
  assert.equal(sig.slice_base, '(repo, config, slices, milestones, slice_id, fmt)')
  assert.equal(sig.awaiting_merge_base, '(repo, slices, slice_id, fmt)')
})

import * as fs from 'node:fs'
function require_fs() { return fs }
const mkdtempSync2 = () => fs.mkdtempSync(join(process.env.TMPDIR || '/tmp', 'vc2-'))
const mkdirSync2 = p => fs.mkdirSync(p, { recursive: true })
const writeFileSync2 = (p, t) => fs.writeFileSync(p, t)
