import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.env.VERIFY_REPO
const MAIN_SCRIPT = process.env.VERIFY_MAIN_SCRIPT
const TK = `${ROOT}/skills/sdlc/test/testkit`
const { rng, callPython } = await import(`${TK}/property.mjs`)
const SCRIPT = join(ROOT, 'skills/sdlc/next-action.py')
const SEED = Number.parseInt(process.env.TESTKIT_SEED ?? '20261010', 10)
const root = mkdtempSync(join(tmpdir(), 'verify-contract-'))
process.on('exit', () => rmSync(root, { recursive: true, force: true }))
let counter = 0
const SPEC = '# Spec\n'
const specHash = createHash('sha256').update(SPEC).digest('hex')
const slice = (id, status = 'todo', extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', ...extra })
const pr = (head, extra = {}) => ({ number: 7, headRefName: head, url: `https://example.test/pr/${head}`, mergeable: 'MERGEABLE', reviewDecision: '', statusCheckRollup: [], ...extra })

function fixture({ slices = [], gitMode = 'pr', config = {}, rawConfig = null } = {}) {
  const repo = join(root, `f${counter++}`)
  const s = join(repo, '.sdlc')
  mkdirSync(s, { recursive: true })
  writeFileSync(join(repo, 'spec.md'), SPEC)
  const cfg = rawConfig ?? { specPath: 'spec.md', specHash, overridesSeen: 0, gitMode, defaultBranch: 'main', ...config }
  writeFileSync(join(s, 'config.json'), typeof cfg === 'string' ? cfg : JSON.stringify(cfg))
  writeFileSync(join(s, 'requirements.json'), '[]')
  writeFileSync(join(s, 'slices.json'), JSON.stringify(slices))
  writeFileSync(join(s, 'milestones.json'), '[]')
  writeFileSync(join(s, 'DECISIONS.md'), '# Decisions\n')
  return repo
}
function prsFile(repo, prs) {
  const f = join(repo, 'prs.json')
  writeFileSync(f, JSON.stringify({ open: [], merged: [], ...prs }))
  return f
}
function cli(script, repo, prs) {
  const args = [script, '--repo', repo, '--bar-raiser-rounds', '0']
  if (prs) args.push('--prs', prsFile(repo, prs))
  const r = spawnSync('python3', args, { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: root, PYTHONDONTWRITEBYTECODE: '1' } })
  let json = null
  try { json = JSON.parse(r.stdout) } catch {}
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json }
}
const git = (repo, ...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: root, GIT_AUTHOR_NAME: 'v', GIT_AUTHOR_EMAIL: 'v@x', GIT_COMMITTER_NAME: 'v', GIT_COMMITTER_EMAIL: 'v@x' } })
function inProgressOn(repo, branch, id = 'S-1') {
  git(repo, 'init', '-q', '-b', 'main'); git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'b')
  git(repo, 'checkout', '-q', '-b', branch)
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify([slice(id, 'in_progress', { phase: 'implement' })]))
  git(repo, 'commit', '-q', '-am', 's'); git(repo, 'checkout', '-q', 'main')
}
const LOWER = 'feature/PROJ-1-{name:lower}'
const CUSTOM = 'feature/PROJ-1-{name}'
const snapshot = repo => readFileSync(join(repo, '.sdlc', 'slices.json'), 'utf8') + readFileSync(join(repo, '.sdlc', 'config.json'), 'utf8')

test('verify contract VS-3: examples verbatim', () => {
  const open = fixture({ slices: [slice('S-1')], config: { branchFormat: LOWER } })
  const o = cli(SCRIPT, open, { open: [pr('feature/proj-1-s-1')] }).json.next
  assert.equal(o.action, 'retryMerge'); assert.equal(o.sliceId, 'S-1'); assert.equal(o.slice.status, 'awaiting-merge')

  const merged = fixture({ slices: [slice('S-1', 'awaiting-merge', { pr: 'u' })], config: { branchFormat: LOWER } })
  const m = cli(SCRIPT, merged, { merged: [{ number: 4, headRefName: 'feature/proj-1-s-1', url: 'https://example.test/pr/4' }] }).json.next
  assert.equal(m.action, 'retryMerge'); assert.equal(m.sliceId, 'S-1'); assert.equal(m.slice.pr, 'https://example.test/pr/4')
})

test('verify contract VS-3: unknown ids stay ignored, and the lower format is the only case-folding one', () => {
  const unknown = fixture({ slices: [slice('S-1')], config: { branchFormat: LOWER } })
  const u = cli(SCRIPT, unknown, { open: [pr('feature/proj-1-s-99')], merged: [pr('feature/proj-1-s-98')] }).json.next
  assert.notEqual(u.action, 'retryMerge'); assert.equal(u.action, 'slice')
  const exact = fixture({ slices: [slice('S-1')], config: { branchFormat: CUSTOM } })
  const e = cli(SCRIPT, exact, { open: [pr('feature/PROJ-1-s-1')] }).json.next
  assert.equal(e.action, 'slice', 'a lowercased head must not resolve under a format without :lower')
  const e2 = cli(SCRIPT, exact, { open: [pr('feature/proj-1-S-1')] }).json.next
  assert.equal(e2.action, 'slice', 'the prefix is case sensitive without :lower')
  const e3 = cli(SCRIPT, exact, { open: [pr('feature/PROJ-1-S-1')] }).json.next
  assert.equal(e3.action, 'retryMerge')
})

test('verify contract VS-3: ledger ids that differ only in case', () => {
  const repo = fixture({ slices: [slice('S-a'), slice('S-A')], config: { branchFormat: LOWER } })
  const out = cli(SCRIPT, repo, { open: [pr('feature/proj-1-s-a')] })
  assert.equal(out.status, 0, out.stderr)
  assert.equal(out.json.next.action, 'retryMerge')
  assert.ok(['S-a', 'S-A'].includes(out.json.next.sliceId))
  console.log('case-only-differing ledger ids ->', out.json.next.sliceId)
  const again = cli(SCRIPT, repo, { open: [pr('feature/proj-1-s-a')] })
  assert.deepEqual(again.json, out.json)
})

test('verify contract VS-3: active branch resolves through case folding and rejects foreign shapes', () => {
  const repo = fixture({ slices: [slice('S-1')], gitMode: 'direct', config: { branchFormat: LOWER } })
  inProgressOn(repo, 'feature/proj-1-s-1')
  const before = snapshot(repo)
  const d = cli(SCRIPT, repo)
  assert.equal(d.json.checkout, 'feature/proj-1-s-1')
  assert.equal(snapshot(repo), before)
  const foreign = fixture({ slices: [slice('S-1')], gitMode: 'direct', config: { branchFormat: LOWER } })
  inProgressOn(foreign, 'feature/proj-1-s-2')
  const f = cli(SCRIPT, foreign)
  assert.ok(!f.json.checkout, `no checkout expected, got ${f.json.checkout}`)
})

test('verify contract VS-3: unicode and hostile heads never resolve and never crash', () => {
  const repo = fixture({ slices: [slice('S-1'), slice('S-12')], config: { branchFormat: LOWER } })
  const heads = ['feature/proj-1-s-１', 'feature/proj-1-s-1 ', 'feature/proj-1-s-1\u0000x', 'feature/proj-1-s-ı', 'feature/PROJ-1-S-1/..', '--force', '', 'feature/proj-1-' + 's-1'.repeat(5000), 'feature/proj-1-s-1😀', 'feature/proj-1-K']
  for (const h of heads) {
    const r = cli(SCRIPT, repo, { open: [pr(h)], merged: [pr(h)] })
    assert.equal(r.status, 0, `${JSON.stringify(h.slice(0, 40))} crashed: ${r.stderr.slice(-300)}`)
    assert.notEqual(r.json.next.action, 'retryMerge', JSON.stringify(h.slice(0, 40)))
  }
})

test('verify contract VS-3: property against a spec-text reference model', () => {
  const r = rng(SEED)
  const RUNS = 1000
  const variants = [
    { fmt: 'feature/PROJ-1-{name:lower}', pre: 'feature/PROJ-1-', suf: '', fold: true },
    { fmt: 'x/{name:lower}', pre: 'x/', suf: '', fold: true },
    { fmt: 'team/{name:lower}-run', pre: 'team/', suf: '-run', fold: true },
    { fmt: 'feature/PROJ-1-{name}', pre: 'feature/PROJ-1-', suf: '', fold: false },
    { fmt: 'sdlc/{name}', pre: 'sdlc/', suf: '', fold: false },
  ]
  const idPool = ['S-1', 'S-2', 'S-12', 'S-021', 'S-3a', 'S-X-1', 'S-fix-1', 'S-fix-M-1-2']
  const mixCase = s => [...s].map(c => (r.bool(0.5) ? c.toUpperCase() : c.toLowerCase())).join('')
  const cases = []
  for (let i = 0; i < RUNS; i++) {
    const v = r.pick(variants)
    const n = r.int(1, 4)
    const ids = [...new Set(Array.from({ length: n }, () => r.pick(idPool)))]
    const heads = []
    const k = r.int(1, 3)
    for (let j = 0; j < k; j++) {
      const kind = r.pick(['known', 'known', 'unknown', 'foreign'])
      if (kind === 'known') {
        const id = r.pick(ids)
        const cased = r.bool(0.4) ? id : r.bool(0.5) ? id.toLowerCase() : mixCase(id)
        const pre = v.fold && r.bool(0.3) ? mixCase(v.pre) : v.pre
        heads.push(pre + cased + v.suf)
      } else if (kind === 'unknown') heads.push(v.pre + r.pick(['S-77', 's-88', 'S-1x', 'S-']) + v.suf)
      else heads.push(r.pick(['feature/PROJ-1-sdlc-foo', 'sdlc/S-1', 'other/S-1', 'feature/PROJ-1-xyz']))
    }
    const expected = new Set()
    for (const h of heads) for (const id of ids) {
      const target = v.pre + id + v.suf
      if (v.fold ? h.toLowerCase() === target.toLowerCase() : h === target) expected.add(id)
    }
    cases.push({ v, ids, heads, expected })
  }
  const repos = cases.map(c => {
    const repo = fixture({ slices: c.ids.map(id => slice(id)), config: { branchFormat: c.v.fmt } })
    return { repo, prsPath: prsFile(repo, { open: c.heads.map((h, i) => pr(h, { number: 100 + i })) }) }
  })
  const results = callPython(SCRIPT, 'decide', repos.map(x => [x.repo, null, 0, x.prsPath]))
  const bad = []
  results.forEach((res, i) => {
    const c = cases[i]
    if (res.outcome !== 'return') { bad.push({ c, res }); return }
    const next = res.value.next
    if (!next) { bad.push({ c, value: res.value }); return }
    if (c.expected.size === 0) { if (next.action === 'retryMerge') bad.push({ c, next }); return }
    const ledgerOrder = c.ids.filter(id => c.expected.has(id))
    if (next.action !== 'retryMerge' || !c.expected.has(next.sliceId) || next.sliceId !== ledgerOrder[0]) bad.push({ c, next })
  })
  console.log(`property-run seed=${SEED} runs=${RUNS} violations=${bad.length}`)
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 3), null, 1))
})

test('verify contract VS-5: absent, empty and null branchFormat match each other, the explicit default and main', () => {
  const run = (cfg, extra = {}) => {
    const out = {}
    const slices = [slice('S-1'), slice('S-2')]
    let repo = fixture({ slices, config: cfg })
    out.slicePr = cli(SCRIPT, repo, { open: [pr('sdlc/S-1')] }).json
    repo = fixture({ slices, config: cfg })
    out.statePr = cli(SCRIPT, repo, { open: [pr('sdlc/state-20261010000000', { number: 12 }), pr('sdlc/M-1-e2e', { number: 13 }), pr('sdlc/M-1-e2e-ui', { number: 14 }), pr('feature/x', { number: 15 })] }).json
    repo = fixture({ slices: [slice('S-1', 'awaiting-merge', { pr: 'u' })], config: cfg })
    out.merged = cli(SCRIPT, repo, { merged: [{ number: 4, headRefName: 'sdlc/S-1', url: 'https://example.test/pr/4' }] }).json
    repo = fixture({ slices, gitMode: 'stack', config: { ...cfg, runBranch: 'sdlc/run-1' } })
    out.hold = cli(SCRIPT, repo, { open: [pr('sdlc/M-1')] }).json
    out.noHold = cli(SCRIPT, repo, { open: [pr('sdlc/M-1-e2e')] }).json
    repo = fixture({ slices, gitMode: 'direct', config: cfg })
    inProgressOn(repo, 'sdlc/S-1')
    out.active = cli(SCRIPT, repo).json
    return out
  }
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'string' ? v.replace(/\/[^\s"]*f\d+/g, '<repo>') : v)))
  const absent = strip(run({}))
  assert.equal(absent.active.checkout, 'sdlc/S-1')
  assert.equal(absent.slicePr.next.action, 'retryMerge')
  assert.equal(absent.hold.next.action, 'wait')
  assert.equal(absent.noHold.next.action, 'slice')
  assert.equal(absent.statePr.sync.filter(c => c.startsWith('gh pr merge')).length, 2)
  for (const cfg of [{ branchFormat: '' }, { branchFormat: null }, { branchFormat: 'sdlc/{name}' }]) assert.deepEqual(strip(run(cfg)), absent, JSON.stringify(cfg))
  if (MAIN_SCRIPT) {
    const orig = SCRIPT
    const mainRun = run.toString()
    const saved = globalThis.__swap
    const main = {}
    const slices = [slice('S-1'), slice('S-2')]
    let repo = fixture({ slices })
    main.slicePr = cli(MAIN_SCRIPT, repo, { open: [pr('sdlc/S-1')] }).json
    assert.deepEqual(strip(main.slicePr), absent.slicePr)
    repo = fixture({ slices })
    main.statePr = cli(MAIN_SCRIPT, repo, { open: [pr('sdlc/state-20261010000000', { number: 12 }), pr('sdlc/M-1-e2e', { number: 13 }), pr('sdlc/M-1-e2e-ui', { number: 14 }), pr('feature/x', { number: 15 })] }).json
    assert.deepEqual(strip(main.statePr), absent.statePr)
    repo = fixture({ slices, gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
    main.hold = cli(MAIN_SCRIPT, repo, { open: [pr('sdlc/M-1')] }).json
    main.noHold = cli(MAIN_SCRIPT, repo, { open: [pr('sdlc/M-1-e2e')] }).json
    assert.deepEqual(strip(main.hold), absent.hold)
    assert.deepEqual(strip(main.noHold), absent.noHold)
    repo = fixture({ slices, gitMode: 'direct' })
    inProgressOn(repo, 'sdlc/S-1')
    assert.deepEqual(strip(cli(MAIN_SCRIPT, repo).json), absent.active)
  }
})

test('verify contract VS-5: default format property against main for generated sdlc heads', () => {
  const r = rng(SEED + 1)
  const pool = ['sdlc/S-1', 'sdlc/S-2', 'sdlc/s-1', 'sdlc/S-9', 'sdlc/state-20261010000000', 'sdlc/state-1', 'sdlc/M-1', 'sdlc/M-1-e2e', 'sdlc/M-2-e2e-ui', 'sdlc/run-1', 'sdlc/S-1-attempt-2', 'sdlc/S-1-v1-http-api-0', 'feature/S-1', 'S-1', 'sdlc/', 'sdlc/S-1/x', 'sdlc/state-', 'sdlc/M-', 'sdlc/M-1-', 'sdlc/M-1/x']
  const RUNS = 1000
  const cases = []
  for (let i = 0; i < RUNS; i++) {
    const mode = r.pick(['pr', 'pr', 'stack', 'direct'])
    const heads = Array.from({ length: r.int(1, 4) }, () => r.pick(pool))
    const statuses = [r.pick(['todo', 'todo', 'awaiting-merge', 'done']), r.pick(['todo', 'in_progress', 'done'])]
    cases.push({ mode, heads, statuses, merged: r.bool(0.3) })
  }
  const prep = cases.map(c => {
    const slices = [slice('S-1', c.statuses[0], c.statuses[0] === 'awaiting-merge' ? { pr: 'u' } : {}), slice('S-2', c.statuses[1])]
    const repo = fixture({ slices, gitMode: c.mode, config: c.mode === 'stack' ? { runBranch: 'sdlc/run-1' } : {} })
    const body = c.merged ? { merged: c.heads.map((h, i) => pr(h, { number: 50 + i })) } : { open: c.heads.map((h, i) => pr(h, { number: 50 + i })) }
    return [repo, null, 0, prsFile(repo, body)]
  })
  const norm = o => JSON.stringify(o, (k, v) => (typeof v === 'string' ? v.replace(/\/[^\s"]*f\d+/g, '<repo>') : v))
  const mine = callPython(SCRIPT, 'decide', prep)
  const base = MAIN_SCRIPT ? callPython(MAIN_SCRIPT, 'decide', prep) : null
  let diff = []
  mine.forEach((m, i) => {
    if (m.outcome !== 'return' && !(base && base[i].outcome === m.outcome && base[i].message === m.message)) diff.push({ i, case: cases[i], m })
    else if (base && norm(m.value) !== norm(base[i].value)) diff.push({ i, case: cases[i], mine: m.value, base: base[i].value })
  })
  console.log(`property-run seed=${SEED + 1} runs=${RUNS} differences-from-main=${diff.length}`)
  const heads = [...new Set(diff.flatMap(d => d.case.heads))].sort()
  const modes = [...new Set(diff.map(d => d.case.mode))]
  writeFileSync(join(process.env.VERIFY_LOGS, 'contract-0-default-diff.json'), JSON.stringify({ differences: diff.length, modes, heads, sample: diff.slice(0, 4) }, null, 1))
  const intended = new Set(['sdlc/M-2-e2e-ui', 'sdlc/M-1-', 'sdlc/M-', 'sdlc/M-1/x'])
  const unexplained = diff.filter(d => !(d.case.mode === 'stack' && d.case.heads.some(h => intended.has(h))))
  assert.equal(unexplained.length, 0, JSON.stringify(unexplained.slice(0, 2), null, 1))
})

test('verify contract VS-5: invalid or non-string branchFormat fails clearly, never with a trace', () => {
  const bad = [7, true, ['sdlc/{name}'], { a: 1 }, 'x', 'sdlc/{name', 'a b/{name}', '{name}{name}', 'a/{name}/{name:lower}', 'feature/{name}\u0000', 1.5, 'sdlc/{id}']
  const rows = []
  for (const value of bad) {
    const slices = [slice('S-1')]
    const repoPr = fixture({ slices, config: { branchFormat: value } })
    const withPrs = cli(SCRIPT, repoPr, { open: [pr('sdlc/S-1')] })
    const repoNone = fixture({ slices, gitMode: 'direct', config: { branchFormat: value } })
    inProgressOn(repoNone, 'sdlc/S-1')
    const noPrs = cli(SCRIPT, repoNone)
    rows.push({ value, withPrs: [withPrs.status, withPrs.stderr.split('\n').slice(-3).join(' | '), withPrs.json?.next?.action], noPrs: [noPrs.status, noPrs.stderr.split('\n').slice(-3).join(' | '), noPrs.json?.next?.action] })
  }
  writeFileSync(join(process.env.VERIFY_LOGS, 'contract-0-invalid-format.json'), JSON.stringify(rows, null, 2))
  const traces = rows.filter(r => /Traceback/.test(r.withPrs[1]) || /Traceback/.test(r.noPrs[1]))
  assert.equal(traces.length, 0, JSON.stringify(traces.slice(0, 3), null, 1))
})

test('verify contract VS-3: probe, a head with a trailing newline (git refuses such a name)', () => {
  const repo = fixture({ slices: [slice('S-1')], config: { branchFormat: LOWER } })
  const r = cli(SCRIPT, repo, { open: [pr('feature/proj-1-s-1\n')] })
  const mainRepo = fixture({ slices: [slice('S-1')] })
  const m = cli(MAIN_SCRIPT, mainRepo, { open: [pr('sdlc/S-1\n')] })
  console.log('probe newline head: custom format ->', r.json.next.action, '; main default ->', m.json.next.action)
  assert.equal(r.status, 0)
})
