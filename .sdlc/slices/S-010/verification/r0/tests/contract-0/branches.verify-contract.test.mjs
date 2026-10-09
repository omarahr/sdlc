import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.S010_WT
const KIT = join(WT, 'skills/sdlc/test/testkit')
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const { rng, callPython, defaultSeed, BRANCHES } = await import(join(KIT, 'property.mjs'))
const { load } = await import(join(KIT, 'attack-corpus.mjs'))

const r = cliRunner()
const SKILL = join(WT, 'skills/sdlc')

function refsInto(repo, names) {
  const head = r.git(repo, 'rev-parse', 'HEAD')
  const input = names.map((n) => `create refs/heads/${n} ${head}\n`).join('')
  const p = spawnSync('git', ['-C', repo, 'update-ref', '--stdin'], { input, encoding: 'utf8', env: r.env })
  assert.equal(p.status, 0, p.stderr)
}
const list = (repo, kind, extra = []) => r.run('branches.py', ['list', '--repo', repo, '--kind', kind, ...extra])
const names = (t) => t.json.branches.map((b) => b.branch)

test('verify contract: surface of branches.py as a consumer imports it', () => {
  const code = `
import sys, json, inspect
sys.path.insert(0, ${JSON.stringify(SKILL)})
import branches
out = {n: str(inspect.signature(o)) for n, o in vars(branches).items() if inspect.isfunction(o) and o.__module__ == 'branches' and not n.startswith('_')}
print(json.dumps(out, indent=1, sort_keys=True))
`
  const p = spawnSync('python3', ['-c', code], { cwd: r.dir('consumer'), encoding: 'utf8', env: r.env })
  assert.equal(p.status, 0, p.stderr)
  const sigs = JSON.parse(p.stdout)
  console.log('SURFACE ' + JSON.stringify(sigs))
  assert.equal(sigs.list_kind, '(repo, fmt, kind)')
  assert.equal(sigs.parse, '(fmt, branch, ids=None)')
  assert.equal(sigs.name, '(fmt, kind, **parts)')
})

test('verify contract: module imports only the standard library', () => {
  const code = `
import ast, sys
src = open(${JSON.stringify(join(SKILL, 'branches.py'))}).read()
mods = set()
for n in ast.walk(ast.parse(src)):
    if isinstance(n, ast.Import): mods |= {a.name.split('.')[0] for a in n.names}
    if isinstance(n, ast.ImportFrom): mods.add((n.module or '').split('.')[0])
print(sorted(m for m in mods if m not in sys.stdlib_module_names))
print(sorted(mods))
`
  const p = spawnSync('python3', ['-c', code], { encoding: 'utf8' })
  const [nonstd, all] = p.stdout.trim().split('\n')
  console.log('IMPORTS ' + all)
  assert.equal(nonstd, '[]')
})

const FIXTURE = [
  'sdlc/S-002', 'sdlc/S-001', 'sdlc/S-fix-M-1-2', 'sdlc/M-1', 'sdlc/run-1', 'sdlc/state-20261008101500',
  'sdlc/S-001-attempt-1', 'sdlc/S-001-v0-http-api-0', 'sdlc/feature-x', 'sdlc/M-1-e2e', 'sdlc/M-1-e2e-api',
]

test('verify contract VS-1: spec example, slice kind only and sorted by name', () => {
  const repo = r.gitRepo({ branches: [...FIXTURE, 'zeta', 'sdlc/S-010'] })
  const t = list(repo, 'slice')
  console.log('EX VS-1 ' + JSON.stringify(t.json))
  assert.equal(t.status, 0)
  assert.deepEqual(names(t), ['sdlc/S-001', 'sdlc/S-002', 'sdlc/S-010', 'sdlc/S-fix-M-1-2'])
  for (const b of t.json.branches) {
    assert.equal(b.kind, 'slice')
    assert.equal(b.id, b.branch.slice('sdlc/'.length))
    assert.equal(b.tail, b.id)
  }
  assert.ok(t.treeUnchanged)
})

test('verify contract VS-1: sort is by name even when creation order differs', () => {
  const order = ['sdlc/S-9', 'sdlc/S-100', 'sdlc/S-10', 'sdlc/S-1', 'sdlc/S-a', 'sdlc/S-B', 'sdlc/S-fix-M-2-1', 'sdlc/S-fix-M-1-1']
  const repo = r.gitRepo({ branches: order })
  const t = list(repo, 'slice')
  assert.deepEqual(names(t), [...order].sort())
})

test('verify contract VS-2: run and attempt sort by n as integers', () => {
  const runs = ['sdlc/run-10', 'sdlc/run-2', 'sdlc/run-100', 'sdlc/run-1', 'sdlc/run-007', 'sdlc/run-0']
  const att = ['sdlc/S-002-attempt-2', 'sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-1', 'sdlc/S-002-attempt-10', 'sdlc/S-001-attempt-100']
  const repo = r.gitRepo({ branches: [...runs, ...att] })
  const a = list(repo, 'run')
  console.log('EX VS-2 run ' + JSON.stringify(a.json.branches.map((b) => [b.branch, b.n])))
  assert.deepEqual(a.json.branches.map((b) => b.n), [0, 1, 2, 7, 10, 100])
  assert.ok(a.json.branches.every((b) => Number.isInteger(b.n) && typeof b.n === 'number'))
  assert.ok(!a.stdout.includes('"n": "'))
  const b = list(repo, 'attempt')
  console.log('EX VS-2 attempt ' + JSON.stringify(b.json.branches.map((x) => [x.branch, x.n])))
  assert.deepEqual(names(b), [
    'sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-002-attempt-2',
    'sdlc/S-001-attempt-10', 'sdlc/S-002-attempt-10', 'sdlc/S-001-attempt-100',
  ])
  assert.ok(names(b).indexOf('sdlc/S-001-attempt-2') < names(b).indexOf('sdlc/S-001-attempt-10'))
  assert.ok(b.json.branches.every((x) => Number.isInteger(x.n) && typeof x.id === 'string'))
})

test('verify contract VS-2/VS-6: huge n sorts as an integer and stays exact in the output', () => {
  const big = '9'.repeat(40)
  const bigger = '1' + '0'.repeat(40)
  const repo = r.gitRepo({ branches: [`sdlc/run-${bigger}`, `sdlc/run-${big}`, 'sdlc/run-5', 'sdlc/run-0000000000000000000000000000000000000000000003'] })
  const t = list(repo, 'run')
  assert.equal(t.status, 0)
  assert.deepEqual(names(t), ['sdlc/run-0000000000000000000000000000000000000000000003', 'sdlc/run-5', `sdlc/run-${big}`, `sdlc/run-${bigger}`])
  assert.ok(t.stdout.includes(`"n": ${bigger}`))
  const digits = '7'.repeat(200)
  const repo2 = r.gitRepo({ branches: [`sdlc/run-${digits}`, 'sdlc/run-1'] })
  const u = list(repo2, 'run')
  console.log(`EX VS-6 200-digit n: status=${u.status} stdoutBytes=${u.stdout.length} stderr=${JSON.stringify(u.stderr.slice(0, 200))}`)
  assert.equal(u.status, 0, u.stderr)
  assert.deepEqual(names(u), ['sdlc/run-1', `sdlc/run-${digits}`])
})

test('verify contract VS-4: format changes what list returns', () => {
  const repo = r.gitRepo({
    files: { '.sdlc/config.json': { branchFormat: 'team/{name}' } },
    branches: ['sdlc/S-001', 'team/S-002', 'feature/PROJ-1-S-001', 'feature/proj-1-s-003', 'feature/PROJ-1-S-004'],
  })
  const cfg = list(repo, 'slice')
  assert.equal(cfg.json.format, 'team/{name}')
  assert.deepEqual(names(cfg), ['team/S-002'])
  const flag = list(repo, 'slice', ['--format', 'feature/PROJ-1-{name}'])
  assert.equal(flag.json.format, 'feature/PROJ-1-{name}')
  assert.deepEqual(names(flag), ['feature/PROJ-1-S-001', 'feature/PROJ-1-S-004'])
  const low = list(repo, 'slice', ['--format', 'feature/PROJ-1-{name:lower}'])
  console.log('EX VS-4 lower ' + JSON.stringify(low.json.branches.map((b) => [b.branch, b.id])))
  assert.deepEqual(names(low), ['feature/PROJ-1-S-001', 'feature/PROJ-1-S-004', 'feature/proj-1-s-003'].sort())
  const dflt = list(r.gitRepo({ branches: ['sdlc/S-001', 'team/S-002'] }), 'slice')
  assert.equal(dflt.json.format, 'sdlc/{name}')
  assert.deepEqual(names(dflt), ['sdlc/S-001'])
  const other = list(repo, 'slice', ['--format', 'zzz/{name}'])
  assert.deepEqual(other.json.branches, [])
  const suffixed = r.gitRepo({ branches: ['sdlc/S-001-x', 'sdlc/S-001', 'sdlc/S-002-x'] })
  assert.deepEqual(names(list(suffixed, 'slice', ['--format', 'sdlc/{name}-x'])), ['sdlc/S-001-x', 'sdlc/S-002-x'])
})

test('verify contract VS-4: invalid format gives the error that name and parse give', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  for (const bad of ['sdlc/x', 'sdlc/{name}/{name}', 'a b/{name}', 'a..b/{name}', '{name}{name:lower}', 'a/{name}}', '']) {
    const l = list(repo, 'slice', ['--format', bad])
    const p = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'x', '--format', bad])
    console.log(`EX VS-4 invalid ${JSON.stringify(bad)} list=${l.status} ${l.stdout.trim()} parse=${p.status}`)
    assert.equal(l.status, 2)
    assert.equal(p.status, 2)
    assert.equal(l.json.ok, false)
    assert.equal(l.json.error, p.json.error)
    assert.equal(l.stderr, '')
  }
  const cfgRepo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'no-placeholder' } } })
  const t = list(cfgRepo, 'slice')
  assert.equal(t.status, 2)
  assert.equal(t.json.ok, false)
})

const KIND_CASES = {
  milestone: ['sdlc/M-1', { kind: 'milestone', id: 'M-1', tail: 'M-1' }],
  run: ['sdlc/run-1', { kind: 'run', n: 1, tail: 'run-1' }],
  state: ['sdlc/state-20261008101500', { kind: 'state', ts: '20261008101500', tail: 'state-20261008101500' }],
  verify: ['sdlc/S-001-v0-http-api-0', { kind: 'verify', id: 'S-001', round: 0, profile: 'http-api', part: 0 }],
  attempt: ['sdlc/S-001-attempt-1', { kind: 'attempt', id: 'S-001', n: 1 }],
  e2e: ['sdlc/M-1-e2e', { kind: 'e2e', id: 'M-1' }],
  'e2e-area': ['sdlc/M-1-e2e-api', { kind: 'e2e-area', id: 'M-1', area: 'api' }],
  slice: ['sdlc/S-fix-M-1-2', { kind: 'slice', id: 'S-fix-M-1-2' }],
}

test('verify contract VS-7: each kind returns its parts and the output keys', () => {
  const repo = r.gitRepo({ branches: FIXTURE })
  for (const [kind, [branch, parts]] of Object.entries(KIND_CASES)) {
    const t = list(repo, kind)
    assert.equal(t.status, 0, `${kind} ${t.stderr}`)
    assert.deepEqual(Object.keys(t.json), ['ok', 'command', 'format', 'kind', 'branches'])
    assert.equal(t.json.ok, true)
    assert.equal(t.json.command, 'list')
    assert.equal(t.json.kind, kind)
    assert.equal(t.json.format, 'sdlc/{name}')
    const hit = t.json.branches.find((b) => b.branch === branch)
    assert.ok(hit, `${kind}: ${branch} missing from ${JSON.stringify(t.json.branches)}`)
    for (const [k, v] of Object.entries(parts)) assert.deepEqual(hit[k], v, `${kind}.${k}`)
    assert.equal(hit.known, null)
    assert.equal(typeof hit.branch, 'string')
    assert.ok(typeof hit.tail === 'string')
    const p = r.run('branches.py', ['parse', '--repo', repo, '--branch', branch])
    for (const [k, v] of Object.entries(hit)) if (k !== 'branch') assert.deepEqual(p.json[k], v, `parse agreement ${kind}.${k}`)
    console.log(`EX VS-7 ${kind} ` + JSON.stringify(hit))
  }
  const noneE = list(r.gitRepo({ branches: ['sdlc/S-001'] }), 'e2e')
  assert.deepEqual(noneE.json.branches, [])
  assert.equal(noneE.status, 0)
})

test('verify contract VS-7: id key presence per kind', () => {
  const repo = r.gitRepo({ branches: FIXTURE })
  const without = []
  for (const kind of Object.keys(KIND_CASES)) {
    const t = list(repo, kind)
    for (const b of t.json.branches) if (!('id' in b)) without.push(kind)
  }
  console.log('SEED-INFO kinds whose entries lack id: ' + JSON.stringify([...new Set(without)]))
  for (const kind of ['slice', 'milestone', 'e2e', 'e2e-area', 'verify', 'attempt']) {
    for (const b of list(repo, kind).json.branches) assert.equal(typeof b.id, 'string', kind)
  }
})

test('verify contract VS-6: hostile branch names drop out or classify, and list never crashes', () => {
  const nd = []
  for (let cp = 0x30; cp < 0x20000; cp++) {
    const ch = String.fromCodePoint(cp)
    if (/\p{Nd}/u.test(ch) && !/[0-9]/.test(ch)) nd.push(ch)
  }
  assert.ok(nd.length > 400)
  const hostile = [
    'sdlc/attempt-0', 'sdlc/S-001-attempt-', 'sdlc/S-001-attempt-x', 'sdlc/S-001-attempt-1x', 'sdlc/-attempt-1',
    'sdlc/S-001-attempt-007', 'sdlc/S-001-attempt-0', 'sdlc/run-', 'sdlc/run--1', 'sdlc/run-1.5', 'sdlc/run-1e3', 'sdlc/run-+1',
    'sdlc/run-\u0661\u0662', 'sdlc/run-\uff11\uff10', 'sdlc/S-001-attempt-\u0663', 'sdlc/S-\u0430', 'sdlc/\u0405-001', 'sdlc/\u0455-001',
    'sdlc/state-2026100810150\u0660', 'sdlc/S-001-v\u0660-http-0', 'sdlc/M-\u0661', 'sdlc/S-001\u200b', 'sdlc/S\u2011001', 'sdlc/S-0\u00e901',
    'sdlc/run-1\u0301', 'sdlc/\u{1f600}', 'sdlc/S-001-v0--0', 'sdlc/S-001-v-x-0', 'sdlc/M-1-e2e-', 'sdlc//x',
    '-sdlc/S-001', '-S-001', 'sdlc/--help', 'sdlc/-', 'sdlc/S-', 'sdlc/-run-1', 'SDLC2/S-001', 'sdlc/s-001', 'sdlc/RUN-1',
    'sdlc/S-001%00', 'sdlc/S-001%s', 'sdlc/S-001{name}', 'sdlc/S-001$(id)', 'sdlc/S-001;ls', 'sdlc/S-001`id`',
    ...nd.slice(0, 40).map((d) => `sdlc/run-${d}`),
  ]
  const repo = r.gitRepo({})
  const ok = []
  for (const h of hostile) {
    const p = spawnSync('git', ['-C', repo, 'update-ref', `refs/heads/${h}`, r.git(repo, 'rev-parse', 'HEAD')], { encoding: 'utf8', env: r.env })
    if (p.status === 0) ok.push(h)
  }
  console.log(`EX VS-6 created ${ok.length}/${hostile.length} hostile refs`)
  assert.ok(ok.length > 40)
  const results = {}
  for (const kind of Object.keys(KIND_CASES)) {
    const t = list(repo, kind)
    assert.equal(t.status, 0, `${kind}: ${t.stderr.slice(0, 300)}`)
    assert.ok(t.json && t.json.ok === true, `${kind} stdout not one JSON object`)
    assert.equal(t.stderr, '')
    assert.equal(t.stdout.trim().split('\n').length, 1)
    for (const b of t.json.branches) {
      assert.ok(ok.includes(b.branch), `unexpected ${kind} ${JSON.stringify(b.branch)} ${[...b.branch].map((c) => c.codePointAt(0).toString(16)).join(' ')}`)
      if (b.n !== undefined) assert.ok(Number.isInteger(b.n))
    }
    results[kind] = t.json.branches.map((b) => b.branch)
    assert.ok(t.treeUnchanged)
  }
  console.log('EX VS-6 classified ' + JSON.stringify(results))
  const bad = ['sdlc/attempt-0', 'sdlc/run-', 'sdlc/run--1', 'sdlc/-attempt-1', 'sdlc/s-001', 'sdlc/RUN-1', 'SDLC2/S-001', 'sdlc/S-', 'sdlc/run-1.5', 'sdlc/run-1e3', 'sdlc/run-+1']
  const all = Object.values(results).flat()
  for (const b of bad) assert.ok(!all.includes(b), `${b} classified`)
  for (const b of ['sdlc/S-001-attempt-', 'sdlc/S-001-attempt-x', 'sdlc/S-001-attempt-1x']) assert.ok(!results.attempt.includes(b), `${b} classified as attempt`)
  console.log('SEED-INFO malformed attempt names classified as slice: ' + JSON.stringify(results.slice.filter((b) => b.includes('attempt'))))
  assert.ok(results.attempt.includes('sdlc/S-001-attempt-007') && results.attempt.includes('sdlc/S-001-attempt-0'))
  const unicodeRuns = results.run.filter((b) => /[^\x00-\x7f]/.test(b))
  const unicodeAttempt = results.attempt.filter((b) => /[^\x00-\x7f]/.test(b))
  const nonAscii = [...unicodeRuns, ...unicodeAttempt, ...results.state.filter((b) => /[^\x00-\x7f]/.test(b)), ...results.milestone.filter((b) => /[^\x00-\x7f]/.test(b)), ...results.verify.filter((b) => /[^\x00-\x7f]/.test(b))]
  console.log('SEED-INFO non-ASCII digit names classified as loop branches: ' + JSON.stringify(nonAscii.slice(0, 8)) + ` (${nonAscii.length})`)
})

test('verify contract VS-6: corpus values for --repo, --kind and --format give one JSON object and exit 0 or 2', () => {
  const repo = r.gitRepo({ branches: FIXTURE })
  const families = ['control-chars', 'flag-like-values', 'format-strings', 'huge-integers', 'injection', 'integer-forms', 'oversized', 'traversal', 'unicode-confusables', 'unicode-digits', 'unicode-whitespace']
  let n = 0
  const odd = []
  for (const fam of families) {
    for (const e of load(fam, { argv: true })) {
      const variants = [
        ['list', '--repo', e.value, '--kind', 'slice'],
        ['list', '--repo', repo, '--kind', e.value],
        ['list', '--repo', repo, '--kind', 'slice', '--format', e.value],
        ['list', `--repo=${repo}`, '--kind', 'slice', `--format=${e.value}`],
        ['list', '--repo', repo, `--kind=${e.value}`],
      ]
      for (const argv of variants) {
        const t = r.run('branches.py', argv, { watch: [repo] })
        n++
        const label = `${fam}/${e.id} ${JSON.stringify(argv).slice(0, 160)}`
        assert.ok([0, 2].includes(t.status), `${label} exit ${t.status} ${t.stderr.slice(0, 200)}`)
        assert.ok(!t.stderr.includes('Traceback'), `${label} traceback`)
        assert.ok(t.json && typeof t.json === 'object', `${label} not JSON: ${t.stdout.slice(0, 200)}`)
        assert.equal(t.stdout.trim().split('\n').length, 1, label)
        assert.equal(t.json.ok, t.status === 0, label)
        if (t.status === 2) assert.equal(typeof t.json.error, 'string')
        if (t.status === 0 && argv.includes('--format') === false && fam !== 'x') {}
        assert.ok(t.treeUnchanged, `${label} mutated the tree`)
        if (t.status === 0 && !(argv[1] === repo || argv[1] === `--repo=${repo}`)) odd.push(label)
      }
    }
  }
  console.log(`EX VS-6 corpus invocations=${n} unexpected-success=${JSON.stringify(odd.slice(0, 5))}`)
})

test('verify contract: option-like values after end-of-options and as repo', () => {
  const repo = r.gitRepo({ branches: FIXTURE })
  for (const argv of [
    ['list', '--repo', '--kind', '--kind', 'slice'],
    ['list', '--repo', repo, '--kind', '--help'],
    ['list', '--repo', repo, '--kind', '-h'],
    ['list', '--', '--repo', repo, '--kind', 'slice'],
    ['list', '--repo', repo, '--kind', 'slice', '--kind', 'run'],
    ['list', '--repo', repo, '--kind', 'slice', '--rep', repo],
    ['list', '--repo', repo, '--kin', 'slice'],
    ['list', '--repo', repo, '--kind', 'slice', '--branch', 'x'],
    ['list', '--repo', repo],
    ['list', '--kind', 'slice'],
    ['list'],
  ]) {
    const t = r.run('branches.py', argv, { watch: [repo] })
    console.log(`EX VS-6 argv ${JSON.stringify(argv.map((a) => (a === repo ? '<repo>' : a)))} -> ${t.status} ${t.stdout.trim().slice(0, 140)}`)
    assert.ok([0, 2].includes(t.status))
    assert.ok(t.json)
    assert.ok(!t.stderr.includes('Traceback'))
    assert.ok(t.treeUnchanged)
  }
})

test('verify contract: determinism, purity and cwd independence through the public entry point', () => {
  const repo = r.gitRepo({ branches: FIXTURE })
  const calls = Array.from({ length: 5 }, () => [repo, 'sdlc/{name}', 'slice'])
  const out = callPython(BRANCHES, 'list_kind', calls)
  assert.ok(out.every((x) => x.outcome === 'return'))
  assert.deepEqual(out.map((x) => x.value), Array(5).fill(out[0].value))
  const before = r.snapshot(repo)
  const again = callPython(BRANCHES, 'list_kind', calls)
  const after = r.snapshot(repo)
  assert.deepEqual(r.diffSnapshots(before, after).empty, true)
  assert.deepEqual(again[0].value, out[0].value)
  const t = list(repo, 'slice')
  assert.deepEqual(t.json.branches, out[0].value)
  const cwdOther = r.run('branches.py', ['list', '--repo', repo, '--kind', 'slice'], { cwd: r.dir('elsewhere') })
  assert.deepEqual(cwdOther.json, t.json)
  const rel = r.run('branches.py', ['list', '--repo', '.', '--kind', 'slice'], { cwd: repo })
  assert.deepEqual(rel.json.branches, t.json.branches)
  const sub = r.run('branches.py', ['list', '--repo', join(repo, '.sdlc'), '--kind', 'slice'], { cwd: repo })
  console.log('EX subdir-repo ' + sub.status + ' ' + sub.stdout.trim().slice(0, 120))
})

test('verify contract: list_kind with an unknown kind through the API', () => {
  const repo = r.gitRepo({ branches: FIXTURE })
  const [res] = callPython(BRANCHES, 'list_kind', [[repo, 'sdlc/{name}', 'nonsense']])
  console.log('SEED-INFO list_kind unknown kind via API: ' + JSON.stringify(res).slice(0, 200))
  assert.notEqual(res.outcome, 'exception')
})

test('verify contract: a tag or remote ref that shares a branch name changes nothing', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001', 'sdlc/S-002'] })
  r.git(repo, 'tag', 'sdlc/S-001')
  r.git(repo, 'tag', 'sdlc/S-003')
  r.git(repo, 'update-ref', 'refs/remotes/origin/sdlc/S-009', r.git(repo, 'rev-parse', 'HEAD'))
  const t = list(repo, 'slice')
  assert.deepEqual(names(t), ['sdlc/S-001', 'sdlc/S-002'])
})

test('verify contract PROPERTY: list_kind equals the reference model for random repos', () => {
  const seed = defaultSeed()
  const runs = 1200
  const rn = rng(seed)
  const repo = r.gitRepo({})
  const KINDS = ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state', 'verify', 'attempt']
  const sliceId = () => rn.pick(['S-' + rn.int(1, 120), 'S-fix-M-' + rn.int(1, 9) + '-' + rn.int(1, 12), 'S-' + rn.int(1, 30) + 'a', 'S-' + rn.int(1, 9) + 'b'])
  const gen = (kind) => {
    switch (kind) {
      case 'run': { const n = rn.pick([rn.int(0, 12), rn.int(0, 300), rn.int(0, 100000)]); return { tail: `run-${n}`, parts: { n } } }
      case 'slice': { const id = sliceId(); return { tail: id, parts: { id } } }
      case 'milestone': { const id = 'M-' + rn.int(1, 40); return { tail: id, parts: { id } } }
      case 'e2e': { const id = 'M-' + rn.int(1, 40); return { tail: `${id}-e2e`, parts: { id } } }
      case 'e2e-area': { const id = 'M-' + rn.int(1, 40); const area = rn.pick(['api', 'ui', 'cli-tools', 'a', 'Data-Plane', 'x-1-y']); return { tail: `${id}-e2e-${area}`, parts: { id, area } } }
      case 'state': { const ts = String(rn.int(20260000, 20269999)) + String(rn.int(100000, 235959)); return { tail: `state-${ts}`, parts: { ts } } }
      case 'verify': { const id = sliceId(); const round = rn.int(0, 12); const profile = rn.pick(['http-api', 'cli', 'contract', 'ui', 'a1', 'x-y-z']); const part = rn.int(0, 12); return { tail: `${id}-v${round}-${profile}-${part}`, parts: { id, round, profile, part } } }
      case 'attempt': { const id = sliceId(); const n = rn.pick([rn.int(0, 12), rn.int(0, 300)]); return { tail: `${id}-attempt-${n}`, parts: { id, n } } }
    }
  }
  const FOREIGN_TAILS = ['run-', 'run-x', 'run-1x', 'M-1x', 'M-', 'm-', 'state-123', 'state-1234567890123x', 'S-', 'X-1', 'feature-x', 'attempt-1', '-v1-x-0', 'M-1-e2e-', 'misc', 'run--3']
  const PRE = ['', 'feature/', 'team/PROJ-9-', 'a.b/c/']
  const SUF = ['', '', '-end', '.x']
  const world = []
  const allNames = []
  for (let i = 0; i < runs; i++) {
    const lower = rn.bool(0.35)
    const prefix = `p${i}/${rn.pick(PRE)}`
    const suffix = rn.pick(SUF)
    const fmt = `${prefix}{${lower ? 'name:lower' : 'name'}}${suffix}`
    const count = rn.int(0, 14)
    const items = []
    const seen = new Set()
    for (let k = 0; k < count; k++) {
      const kind = rn.pick(KINDS)
      const g = gen(kind)
      const branch = prefix + (lower ? g.tail.toLowerCase() : g.tail) + suffix
      if (seen.has(branch)) continue
      seen.add(branch)
      items.push({ kind, branch, parts: g.parts, tail: lower ? g.tail.toLowerCase() : g.tail })
    }
    const foreign = []
    for (let k = 0; k < rn.int(0, 5); k++) {
      const choice = rn.int(0, 3)
      const b = choice === 0 ? prefix + rn.pick(FOREIGN_TAILS) + suffix
        : choice === 1 ? `zz${i}/` + gen(rn.pick(KINDS)).tail
        : choice === 2 ? `p${i}x/` + gen(rn.pick(KINDS)).tail
        : prefix + gen(rn.pick(KINDS)).tail + suffix + 'Z'
      if (seen.has(b)) continue
      if (choice === 3 && suffix === '' ) continue
      seen.add(b)
      foreign.push(b)
    }
    const queryKind = rn.pick(KINDS)
    world.push({ fmt, lower, items, foreign, queryKind })
    for (const b of seen) allNames.push(b)
  }
  const GROUP = 100
  const results = []
  for (let g = 0; g < runs; g += GROUP) {
    const grp = world.slice(g, g + GROUP)
    const grepo = r.gitRepo({ name: `prop-${g}` })
    refsInto(grepo, grp.flatMap((w) => [...w.items.map((x) => x.branch), ...w.foreign]))
    results.push(...callPython(BRANCHES, 'list_kind', grp.map((w) => [grepo, w.fmt, w.queryKind]), { timeoutMs: 600000 }))
    world.slice(g, g + GROUP).forEach((w) => { w.repo = grepo })
  }
  console.log(`PROPERTY setup seed=${seed} worlds=${runs} branches=${allNames.length}`)
  const violations = []
  world.forEach((w, i) => {
    const res = results[i]
    if (res.outcome !== 'return') { violations.push({ i, why: `${res.outcome} ${res.message}` }); return }
    const expected = w.items.filter((x) => x.kind === w.queryKind).map((x) => ({ branch: x.branch, ...x.parts, kind: x.kind, tail: x.tail, known: null }))
    const norm = (p) => {
      const o = { ...p }
      if (w.lower && typeof o.id === 'string') o.id = o.id.toLowerCase()
      if (w.lower && typeof o.area === 'string') o.area = o.area.toLowerCase()
      if (w.lower && typeof o.profile === 'string') o.profile = o.profile.toLowerCase()
      return o
    }
    const exp = expected.map(norm)
    const numeric = w.queryKind === 'run' || w.queryKind === 'attempt'
    exp.sort((a, b) => (numeric && a.n !== b.n ? a.n - b.n : a.branch < b.branch ? -1 : a.branch > b.branch ? 1 : 0))
    const got = res.value
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
    try {
      assert.deepEqual(got.map((g) => g.branch), exp.map((e) => e.branch), 'branch list or order')
      for (let j = 0; j < exp.length; j++) {
        for (const [k, v] of Object.entries(strip(exp[j]))) assert.deepEqual(got[j][k], v, `entry ${j} part ${k}`)
      }
      for (const f of w.foreign) assert.ok(!got.some((g) => g.branch === f), `foreign ${f} leaked`)
    } catch (e) {
      violations.push({ i, fmt: w.fmt, kind: w.queryKind, why: e.message.split('\n')[0], got: got.map((g) => g.branch).slice(0, 6), exp: exp.map((g) => g.branch).slice(0, 6) })
    }
  })
  const nonEmpty = world.filter((w, i) => results[i].value?.length).length
  const sizes = world.map((w, i) => results[i].value?.length ?? 0)
  console.log(`property-run list_kind-vs-model: seed=${seed} runs=${runs} violations=${violations.length} nonEmptyResults=${nonEmpty} maxEntries=${Math.max(...sizes)} lowerWorlds=${world.filter((w) => w.lower).length}`)
  if (violations.length) console.log('VIOLATIONS ' + JSON.stringify(violations.slice(0, 5), null, 1))
  assert.equal(violations.length, 0)

  const sample = rng(seed ^ 0x5bd1e995)
  let cli = 0
  for (let k = 0; k < 120; k++) {
    const i = sample.int(0, runs - 1)
    const w = world[i]
    const t = list(w.repo, w.queryKind, ['--format', w.fmt])
    assert.equal(t.status, 0, t.stderr)
    assert.deepEqual(t.json.branches, results[i].value, `cli vs api world ${i}`)
    assert.equal(t.json.format, w.fmt)
    cli++
  }
  console.log(`property-run cli-agrees-with-api: seed=${seed} runs=${cli} violations=0`)
})
