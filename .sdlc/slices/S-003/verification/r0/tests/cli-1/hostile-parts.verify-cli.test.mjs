import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(process.env.VERIFY_REPO ?? join(HERE, '..', '..', '..', '..', '..', '..', '..'))
const TESTKIT = join(REPO, 'skills', 'sdlc', 'test', 'testkit')
const { cliRunner } = await import(join(TESTKIT, 'cli-runner.mjs'))
const { load, plantDecoy, decoyFired, equalsForm } = await import(join(TESTKIT, 'attack-corpus.mjs'))

const LOG_DIR = process.env.VERIFY_LOG_DIR
const KEYS = ['branch', 'command', 'format', 'kind', 'ok']

function record(caseId, t, note = '') {
  if (!LOG_DIR) return
  mkdirSync(LOG_DIR, { recursive: true })
  const text = t.text()
  const clipped = text.length > 4000 ? text.slice(0, 4000) + `\n…(${text.length - 4000} more chars)` : text
  appendFileSync(join(LOG_DIR, `cli-1-${caseId}.txt`), `${note ? '# ' + note + '\n' : ''}${clipped}\n\n`)
}

function oneJsonObject(t) {
  const lines = t.stdout.split('\n')
  assert.equal(lines.at(-1), '', `stdout must end with one newline: ${JSON.stringify(t.stdout.slice(0, 200))}`)
  assert.equal(lines.length, 2, `stdout must hold one line: ${JSON.stringify(t.stdout.slice(0, 200))}`)
  assert.equal(typeof t.json, 'object')
  assert.notEqual(t.json, null)
  assert.ok(!Array.isArray(t.json))
}

function contract(t, label) {
  assert.ok(t.status === 0 || t.status === 2, `${label}: exit ${t.status}\n${t.text().slice(0, 1500)}`)
  oneJsonObject(t)
  assert.ok(!/Traceback/.test(t.stderr), `${label}: traceback on stderr`)
  assert.equal(t.stderr, '', `${label}: stderr not empty: ${t.stderr.slice(0, 300)}`)
  assert.ok(t.treeUnchanged, `${label}: tree changed ${JSON.stringify(Object.values(t.tree).map((d) => d.diff))}`)
  if (t.status === 0) {
    assert.equal(t.json.ok, true)
    assert.deepEqual(Object.keys(t.json).sort(), KEYS)
  } else {
    assert.equal(t.json.ok, false)
    assert.equal(typeof t.json.error, 'string')
    assert.ok(t.json.error.length > 0)
    assert.deepEqual(Object.keys(t.json).sort(), ['error', 'ok'])
  }
}

const PART_FAMILIES = ['control-chars', 'flag-like-values', 'format-strings', 'injection', 'oversized', 'traversal', 'unicode-confusables', 'unicode-whitespace', 'unicode-digits', 'integer-forms']

const r = cliRunner()
const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
const lowerRepo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name:lower}' } } })

test('verify cli: TC-cli-101 a hostile --id reaches the slice tail as literal text', () => {
  const cwd = r.dir('cwd-101')
  const results = []
  for (const e of PART_FAMILIES.flatMap((f) => load(f, { argv: true }))) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', equalsForm('--id', e.value)], { cwd })
    record('TC-cli-101', t, `${e.family}/${e.id}`)
    contract(t, `${e.family}/${e.id}`)
    if (e.value === '') {
      assert.equal(t.status, 2, `${e.id}: an empty id must fail`)
      assert.match(t.json.error, /\bid\b/)
    } else {
      assert.equal(t.status, 0, `${e.family}/${e.id}: ${t.stdout.slice(0, 300)}`)
      assert.equal(t.json.branch, 'sdlc/' + e.value, `${e.family}/${e.id}: the part must stay literal`)
      assert.equal(t.json.format, 'sdlc/{name}')
    }
    results.push(`${e.family}/${e.id} exit=${t.status}`)
  }
  assert.ok(results.length > 100)
})

test('verify cli: TC-cli-102 a hostile --area reaches the e2e-area tail as literal text', () => {
  const cwd = r.dir('cwd-102')
  for (const e of PART_FAMILIES.flatMap((f) => load(f, { argv: true }))) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e-area', '--id', 'M-1', equalsForm('--area', e.value)], { cwd })
    record('TC-cli-102', t, `${e.family}/${e.id}`)
    contract(t, `${e.family}/${e.id}`)
    if (e.value === '') {
      assert.equal(t.status, 2)
      assert.match(t.json.error, /\barea\b/)
    } else {
      assert.equal(t.status, 0, `${e.family}/${e.id}: ${t.stdout.slice(0, 300)}`)
      assert.equal(t.json.branch, `sdlc/M-1-e2e-${e.value}`, `${e.family}/${e.id}`)
    }
  }
})

test('verify cli: TC-cli-103 a placeholder inside a part is never expanded, with a flag or config format', () => {
  const cwd = r.dir('cwd-103')
  for (const e of load('format-strings', { argv: true }).filter((x) => x.value !== '')) {
    const viaFlag = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--format', 'team/{name}-x', equalsForm('--id', e.value)], { cwd })
    record('TC-cli-103', viaFlag, `flag ${e.id}`)
    contract(viaFlag, `flag ${e.id}`)
    assert.equal(viaFlag.status, 0)
    assert.equal(viaFlag.json.branch, `team/${e.value}-x`)
    const viaConfig = r.run('branches.py', ['name', '--repo', lowerRepo, '--kind', 'slice', equalsForm('--id', e.value)], { cwd })
    record('TC-cli-103', viaConfig, `config lower ${e.id}`)
    contract(viaConfig, `config lower ${e.id}`)
    assert.equal(viaConfig.status, 0)
    assert.equal(viaConfig.json.branch, `feature/${e.value.toLowerCase()}`)
  }
  const both = r.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e-area', '--id', '{name}', '--area', '{name:lower}'], { cwd })
  record('TC-cli-103', both, 'id and area both placeholders')
  contract(both, 'both')
  assert.equal(both.json.branch, 'sdlc/{name}-e2e-{name:lower}')
})

test('verify cli: TC-cli-104 a flag-like value in the separate form gives one JSON error, never help text', () => {
  const cwd = r.dir('cwd-104')
  const cases = [
    ['--kind', 'slice', '--id', '--help'],
    ['--kind', 'slice', '--id', '-h'],
    ['--kind', 'slice', '--id', '--format'],
    ['--kind', 'slice', '--id', '--repo'],
    ['--kind', 'e2e-area', '--id', 'M-1', '--area', '--format'],
    ['--kind', 'e2e-area', '--id', 'M-1', '--area', '--help'],
    ['--kind', 'e2e-area', '--id', 'M-1', '--area', '-h'],
  ]
  for (const args of cases) {
    const t = r.run('branches.py', ['name', '--repo', repo, ...args], { cwd })
    record('TC-cli-104', t, args.join(' '))
    contract(t, args.join(' '))
    assert.equal(t.status, 2, args.join(' '))
  }
  const literal = r.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e-area', '--id', 'M-1', '--area=--format'], { cwd })
  record('TC-cli-104', literal, '--area=--format')
  contract(literal, '--area=--format')
  assert.equal(literal.status, 0)
  assert.equal(literal.json.branch, 'sdlc/M-1-e2e---format')
  assert.equal(literal.json.format, 'sdlc/{name}')
})

test('verify cli: TC-cli-105 the integer flags refuse non-integers with one JSON error and keep the branch for integers', () => {
  const cwd = r.dir('cwd-105')
  const entries = [...load('integer-forms', { argv: true }), ...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true })]
  const accepted = []
  for (const flag of ['--n', '--round', '--part']) {
    for (const e of entries) {
      const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', equalsForm(flag, e.value)], { cwd })
      record('TC-cli-105', t, `${flag} ${e.family}/${e.id}`)
      contract(t, `${flag} ${e.family}/${e.id}`)
      let isInt = true
      try { execFileSync('python3', ['-I', '-c', 'import sys; int(sys.argv[1])', e.value], { stdio: 'ignore' }) } catch { isInt = false }
      if (isInt) {
        assert.equal(t.status, 0, `${flag} ${e.id}`)
        assert.equal(t.json.branch, 'sdlc/S-001')
        accepted.push(`${flag}=${e.id}`)
      } else {
        assert.equal(t.status, 2, `${flag} ${e.id} must be refused`)
        assert.match(t.json.error, /invalid int value/)
      }
    }
  }
  if (LOG_DIR) writeFileSync(join(LOG_DIR, 'cli-1-TC-cli-105-accepted.txt'), accepted.join('\n') + '\n')
})

test('verify cli: TC-cli-106 no hostile part creates a git ref or a file, and a second run gives the same result', () => {
  const cwd = r.dir('cwd-106')
  const refsBefore = r.git(repo, 'for-each-ref', '--format=%(refname)')
  for (const e of load('injection', { argv: true })) {
    const first = r.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e-area', equalsForm('--id', e.value), equalsForm('--area', e.value)], { cwd })
    const second = r.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e-area', equalsForm('--id', e.value), equalsForm('--area', e.value)], { cwd })
    record('TC-cli-106', first, `first ${e.id}`)
    contract(first, e.id)
    contract(second, e.id)
    assert.equal(second.stdout, first.stdout)
  }
  assert.equal(r.git(repo, 'for-each-ref', '--format=%(refname)'), refsBefore)
  assert.equal(r.git(repo, 'status', '--porcelain'), '')
})

test('verify cli: TC-cli-107 branches.py imports no module from the cwd', () => {
  const modules = ['branches', 'json', 'argparse', 're', 'subprocess', 'datetime', 'os', 'sys']
  const cwd = r.dir('cwd-107')
  const decoys = modules.map((m) => plantDecoy(cwd, { module: m, marker: join(cwd, 'decoy-imports.txt') }))
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'], { cwd, watch: [repo] })
  record('TC-cli-107', t, `decoys in cwd: ${modules.join(', ')}`)
  assert.equal(t.status, 0, t.text())
  assert.equal(t.json.branch, 'sdlc/S-001')
  assert.equal(t.stderr, '')
  for (const d of decoys) assert.equal(decoyFired(d), null, `decoy ${d.path} was imported`)
  const area = r.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e-area', '--id', 'M-1'], { cwd, watch: [repo] })
  record('TC-cli-107', area, 'error path with decoys in cwd')
  assert.equal(area.status, 2)
  for (const d of decoys) assert.equal(decoyFired(d), null, `decoy ${d.path} was imported on the error path`)
})

test('verify cli: TC-cli-110 zero-valued integer parts are accepted for slice and e2e-area', () => {
  const cwd = r.dir('cwd-110')
  const cases = [
    [['--kind', 'slice', '--id', 'S-001', '--n', '0', '--part', '0', '--round', '0'], 'sdlc/S-001'],
    [['--kind', 'slice', '--id', 'S-001', '--n=0', '--round=0', '--part=0', '--profile', 'x'], 'sdlc/S-001'],
    [['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api', '--n', '0', '--round', '0', '--part', '0'], 'sdlc/M-1-e2e-api'],
    [['--kind', 'slice', '--id', 'S-001', '--n', '-0', '--part', '00', '--round', '+0'], 'sdlc/S-001'],
  ]
  for (const [args, branch] of cases) {
    const t = r.run('branches.py', ['name', '--repo', repo, ...args], { cwd })
    record('TC-cli-110', t, args.join(' '))
    contract(t, args.join(' '))
    assert.equal(t.status, 0)
    assert.equal(t.json.branch, branch)
  }
  const state = r.run('branches.py', ['name', '--repo', repo, '--kind', 'state', '--n', '0', '--part', '0', '--round', '0'], { cwd })
  record('TC-cli-110', state, 'state with zero parts')
  contract(state, 'state')
  assert.match(state.json.branch, /^sdlc\/state-\d{14}$/)
})

test('verify cli: TC-cli-111 a zero-valued string part is kept, not dropped as absent', () => {
  const cwd = r.dir('cwd-111')
  const cases = [
    [['--kind', 'slice', '--id', '0'], 'sdlc/0'],
    [['--kind', 'e2e-area', '--id', '0', '--area', '0'], 'sdlc/0-e2e-0'],
    [['--kind', 'e2e-area', '--id', 'M-1', '--area', '0'], 'sdlc/M-1-e2e-0'],
    [['--kind', 'slice', '--id', '0', '--format', 'x/{name:lower}'], 'x/0'],
  ]
  for (const [args, branch] of cases) {
    const t = r.run('branches.py', ['name', '--repo', repo, ...args], { cwd })
    record('TC-cli-111', t, args.join(' '))
    contract(t, args.join(' '))
    assert.equal(t.status, 0)
    assert.equal(t.json.branch, branch)
  }
})

test('verify cli: TC-cli-112 the name part filter passes a zero n, round and part to a row that needs them', () => {
  const cwd = r.dir('cwd-112')
  const branches = join(r.skillDir, 'branches.py')
  const probe = [
    'import importlib.util, json, sys',
    `spec = importlib.util.spec_from_file_location("b", ${JSON.stringify(branches)})`,
    'b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)',
    'b.TAILS["verify"] = (("n", "round", "part"), lambda p: f"{p[\'n\']!r}-{p[\'round\']!r}-{p[\'part\']!r}")',
    'sys.exit(b.main(sys.argv[1:]))',
  ].join('\n')
  const t = r.exec('python3', ['-I', '-c', probe, 'name', '--repo', repo, '--kind', 'verify', '--n', '0', '--round', '0', '--part', '0'], { cwd })
  record('TC-cli-112', t, 'probe row verify needs n, round and part')
  assert.equal(t.status, 0, t.text())
  assert.equal(t.json.branch, 'sdlc/0-0-0')
})
