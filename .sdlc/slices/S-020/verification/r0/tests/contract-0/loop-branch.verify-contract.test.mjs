import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const WT = '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-020-v0-contract-0'
const { loadInternals, runMain, scripted, ok, clear, SKILL_DIR, scratch, scriptSource } = await import(WT + '/skills/sdlc/test/harness.mjs')
const { cliRunner } = await import('/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs')

const SEED = Number(process.env.TESTKIT_SEED || 20261010)
let s = SEED >>> 0
const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = a => a[Math.floor(rnd() * a.length)]
const ALPHA = 'abcXYZ019-_.é漢😀ß'.split('')
const tailGen = () => Array.from({ length: Math.floor(rnd() * 12) }, () => pick(ALPHA)).join('')
const FORMATS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}', '{name}', '{name:lower}', 'a/b/{name:lower}-x', 'ns/{name}/end']
const model = (fmt, tail) => fmt.includes('{name:lower}') ? fmt.split('{name:lower}').join(tail.toLowerCase()) : fmt.split('{name}').join(tail)
const RUNS = 1500
console.log('property seed=' + SEED + ' runs=' + RUNS)

test('verify contract VS-1: BRANCH_FORMAT default, empty and prefixed; INTERNALS types', async () => {
  for (const [args, want] of [[{}, 'sdlc/{name}'], [{ branchFormat: '' }, 'sdlc/{name}'], [{ branchFormat: null }, 'sdlc/{name}'], [{ branchFormat: 'feature/PROJ-1-{name}' }, 'feature/PROJ-1-{name}']]) {
    const rt = await loadInternals(undefined, args)
    assert.equal(typeof rt.I.BRANCH_FORMAT, 'string')
    assert.equal(typeof rt.I.branchName, 'function')
    assert.equal(rt.I.BRANCH_FORMAT, want)
  }
})

test('verify contract VS-2: examples', async () => {
  const cases = [
    ['sdlc/{name}', 'S-001', 'sdlc/S-001'],
    ['feature/PROJ-1-{name}', 'S-001', 'feature/PROJ-1-S-001'],
    ['feature/PROJ-1-{name:lower}', 'S-001-v0-Http-0', 'feature/PROJ-1-s-001-v0-http-0'],
    ['sdlc/{name}', '', 'sdlc/'],
    ['feature/{name:lower}', '', 'feature/'],
    ['static-branch', 'S-1', 'static-branch'],
    ['a/{name}/b', 'x/y', 'a/x/y/b'],
    ['sdlc/{name}', 'ÀÉ', 'sdlc/ÀÉ'],
    ['sdlc/{name:lower}', 'ÀÉ', 'sdlc/àé'],
    ['sdlc/{name:lower}', 'İ', 'sdlc/' + 'İ'.toLowerCase()],
  ]
  for (const [fmt, tail, want] of cases) {
    const rt = await loadInternals(undefined, { branchFormat: fmt })
    assert.equal(rt.I.branchName(tail), want, JSON.stringify([fmt, tail]))
  }
})

test('verify contract VS-2: property against a split/join reference model', async () => {
  const rts = {}
  for (const f of FORMATS) rts[f] = await loadInternals(undefined, { branchFormat: f })
  for (let i = 0; i < RUNS; i++) {
    const f = pick(FORMATS), tail = tailGen()
    assert.equal(rts[f].I.branchName(tail), model(f, tail), 'seed=' + SEED + ' ' + JSON.stringify([f, tail]))
    assert.equal(rts[f].I.branchName(tail), rts[f].I.branchName(tail))
  }
})

test('verify contract VS-2: format with both placeholders (observed)', async () => {
  const rt = await loadInternals(undefined, { branchFormat: 'a-{name}-{name:lower}' })
  console.log('both placeholders ->', rt.I.branchName('AB'))
})

test('verify contract VS-2: hostile dollar tails stay literal', async () => {
  const bad = []
  for (const f of ['sdlc/{name}', 'p-{name:lower}']) {
    const rt = await loadInternals(undefined, { branchFormat: f })
    for (const t of ['$&', '$1', '$$', "$'", '$`', 'a$&b']) {
      const got = rt.I.branchName(t), want = model(f, t)
      if (got !== want) bad.push({ f, t, got, want })
    }
  }
  console.log('hostile mismatches', JSON.stringify(bad))
  assert.deepEqual(bad, [])
})

test('verify contract VS-3: loop and branches.py agree on the verify branch', async () => {
  const r = cliRunner()
  const repo = r.gitRepo({})
  const ids = ['S-001', 'S-12', 'S-fix-M-1-2', 'S-013a']
  const profiles = ['http-api', 'ui', 'Http-API', 'contract', 'i18n']
  let n = 0
  for (const fmt of ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}']) {
    const rt = await loadInternals(undefined, { branchFormat: fmt })
    for (const id of ids) for (const round of [0, 1, 7]) for (const profile of profiles) for (const part of [0, 3]) {
      const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', id, '--round', String(round), '--profile', profile, '--part', String(part), '--format', fmt])
      assert.equal(t.status, 0, t.stderr + t.stdout)
      assert.equal(rt.I.branchName(id + '-v' + round + '-' + profile + '-' + part), t.json.branch, JSON.stringify([fmt, id, round, profile, part]))
      n++
    }
  }
  console.log('compared', n)
})

const plan = profiles => () => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles }], tools: [], risk: 'high' })

test('verify contract VS-4: verifyPhase branches go through the format', async () => {
  for (const [fmt, a, b] of [[undefined, 'sdlc/S-1-v2-ui-0', 'sdlc/S-1-v2-i18n-0'], ['feature/PROJ-1-{name:lower}', 'feature/PROJ-1-s-1-v2-ui-0', 'feature/PROJ-1-s-1-v2-i18n-0'], ['x/{name}', 'x/S-1-v2-ui-0', 'x/S-1-v2-i18n-0']]) {
    const rt = await loadInternals(scripted({
      'verify-planner': plan(['ui', 'i18n']), verifier: () => clear(), 'verify-ui': () => clear(), 'verify-i18n': () => clear(), 'verify-collector': () => ok(),
    }), fmt ? { branchFormat: fmt } : {})
    await rt.I.verifyPhase('S-1', 2)
    assert.equal(rt.calls.find(c => c.role === 'verify-ui').inputs.branch, a)
    assert.equal(rt.calls.find(c => c.role === 'verify-i18n').inputs.branch, b)
    assert.deepEqual(rt.calls.find(c => c.role === 'verify-collector').inputs.branches, [a, b])
  }
})

test('verify contract VS-4: source holds no sdlc/ template literal with substitution', () => {
  const src = scriptSource()
  const hits = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /`sdlc\/\$\{/.test(l) || /['"]sdlc\/['"]\s*\+/.test(l))
  console.log('hits', JSON.stringify(hits))
  assert.deepEqual(hits, [])
})

test('verify contract VS-5: env-detector inputs', async () => {
  const keys = ['specPath', 'gitMode', 'commitFormat', 'defaultBranch', 'branchFormat']
  for (const [bf, want] of [[undefined, null], ['', null], [null, null], ['feature/PROJ-1-{name}', 'feature/PROJ-1-{name}'], ['  odd {name:lower} ', '  odd {name:lower} ']]) {
    const args = { specPath: 'docs/spec.md', gitMode: 'direct' }
    if (bf !== undefined) args.branchFormat = bf
    const rt = await runMain(scripted({
      'state-reader': [{ action: 'bootstrap', reason: 'no config' }, { action: 'stop', reason: 'test end' }], 'env-detector': [{ gitMode: 'direct', commands: {} }], 'requirements-extractor': [{ added: 1 }],
      'completeness-critic': () => ({ added: 0 }), slicer: [{ added: 1 }], 'state-writer': () => ok(),
    }), args)
    const inp = rt.calls.find(c => c.role === 'env-detector').inputs
    assert.deepEqual(Object.keys(inp).sort(), [...keys].sort())
    assert.equal(inp.branchFormat, want)
  }
})
