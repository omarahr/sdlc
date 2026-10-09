import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync, realpathSync, symlinkSync, copyFileSync, chmodSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MODULE = process.env.S014_MODULE
assert.ok(MODULE, 'set S014_MODULE to the path of branches.py under test')
const TESTKIT = process.env.S014_TESTKIT
const { rng, defaultSeed } = await import(join(TESTKIT, 'property.mjs'))

const ROOT = realpathSync(mkdtempSync(join(tmpdir(), 'verify-s014-')))
let counter = 0
const fresh = (p) => { const d = join(ROOT, `${p}-${++counter}`); mkdirSync(d, { recursive: true }); return d }

function makeRepo(config) {
  const repo = fresh('repo')
  mkdirSync(join(repo, '.sdlc'))
  if (config !== undefined) writeFileSync(join(repo, '.sdlc', 'config.json'), typeof config === 'string' ? config : JSON.stringify(config))
  return repo
}

function toolBin(names) {
  const bin = fresh('bin')
  for (const n of names) {
    copyFileSync(join(HERE, 'shim.sh'), join(bin, n))
    chmodSync(join(bin, n), 0o755)
  }
  return bin
}

function drive(cases, { names = ['glab', 'gh'], timeout, pathExtra = true } = {}) {
  const bin = toolBin(names)
  const caseDir = fresh('case')
  const callLog = join(fresh('log'), 'calls')
  const sys = ['/usr/bin', '/bin']
  const PATH = [bin, ...sys].join(':')
  const r = spawnSync('python3', ['-I', join(HERE, 'driver.py')], {
    input: JSON.stringify({ module: MODULE, cases, caseDir, callLog, ...(timeout ? { timeout } : {}) }),
    encoding: 'utf8',
    cwd: fresh('cwd'),
    env: { PATH, CASE_DIR: caseDir, CALL_LOG: callLog, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', HOME: fresh('home') },
    maxBuffer: 256 * 1024 * 1024,
  })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const PREFIX = 'rules unknown on gitlab: '
const ARGV = '[api][projects/:fullpath/push_rule]'

function model({ samples, stdout, stderr = '', exit = 0 }) {
  if (exit !== 0) return { rules: [], by_sample: {}, notes: [PREFIX + (stderr.trim() || `glab exited with status ${exit}`)], unchecked: true }
  let body
  try { body = JSON.parse(stdout) } catch { return { fail: true } }
  const rule = body !== null && typeof body === 'object' && !Array.isArray(body) && typeof body.branch_name_regex === 'string' && body.branch_name_regex !== ''
    ? [{ source: 'gitlab', kind: 'regex', pattern: body.branch_name_regex, negate: false, label: 'push rule' }]
    : []
  const by_sample = {}
  for (const s of samples) by_sample[s] = rule
  return { rules: rule, by_sample, notes: [], unchecked: false }
}

const KEYS = ['source', 'kind', 'pattern', 'negate', 'label']

test('verify contract VS-1: one glab call, fixed argv, cwd is the repo (1, 3, 50 samples)', () => {
  for (const n of [0, 1, 3, 50]) {
    const repo = makeRepo({ forge: 'gitlab' })
    const samples = Array.from({ length: n }, (_, i) => `feat/--version-${i}`)
    const [o] = drive([{ repo, samples, stdout: '{"branch_name_regex":"^a$"}' }])
    assert.equal(o.error, null)
    assert.equal(o.calls.length, 1, `n=${n}`)
    assert.equal(o.calls[0], `${realpathSync(repo)}|${ARGV}`)
    assert.equal(Object.keys(o.result.by_sample).length, n)
    assert.ok(!o.calls[0].includes('feat/'))
  }
})

test('verify contract VS-1: property, call count and argv for random sample sets', () => {
  const seed = defaultSeed(); const r = rng(seed).next; const runs = 1000
  const cases = []
  const repo = makeRepo({ forge: 'gitlab' })
  for (let i = 0; i < runs; i++) {
    const n = Math.floor(r() * 8)
    cases.push({ repo, samples: Array.from({ length: n }, () => 'b' + Math.floor(r() * 1e6) + '/x y'), stdout: 'null' })
  }
  const out = drive(cases)
  out.forEach((o, i) => {
    assert.equal(o.calls.length, 1, `case ${i}`)
    assert.equal(o.calls[0], `${realpathSync(repo)}|${ARGV}`)
  })
  console.log(`property-run VS-1 seed=${seed} runs=${runs}`)
})

test('verify contract VS-2: regex body gives one rule with exactly five keys', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const samples = ['a', 'feat/b', 'c d']
  const [o] = drive([{ repo, samples, stdout: '{"branch_name_regex":"^feat/.*$","commit_message_regex":"x"}' }])
  const rule = { source: 'gitlab', kind: 'regex', pattern: '^feat/.*$', negate: false, label: 'push rule' }
  assert.deepEqual(o.result.rules, [rule])
  assert.deepEqual(Object.keys(o.result.rules[0]).sort(), [...KEYS].sort())
  assert.deepEqual(o.result.by_sample, { a: [rule], 'feat/b': [rule], 'c d': [rule] })
  assert.equal(o.result.unchecked, false)
  assert.deepEqual(o.result.notes, [])
  assert.deepEqual(Object.keys(o.result).sort(), ['by_sample', 'forge', 'notes', 'rules', 'unchecked'])
  assert.equal(o.result.forge, 'gitlab')
})

test('verify contract VS-3: null, {}, null regex, empty regex give no rule', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const samples = ['a', 'b']
  const bodies = ['null', '{}', '{"branch_name_regex":null}', '{"branch_name_regex":""}']
  const out = drive(bodies.map((stdout) => ({ repo, samples, stdout })))
  out.forEach((o, i) => {
    assert.deepEqual(o.result.rules, [], bodies[i])
    assert.deepEqual(o.result.notes, [], bodies[i])
    assert.equal(o.result.unchecked, false, bodies[i])
    assert.deepEqual(o.result.by_sample, { a: [], b: [] }, bodies[i])
  })
})

test('verify contract VS-3: whitespace-only regex is recorded', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const [o] = drive([{ repo, samples: ['a'], stdout: '{"branch_name_regex":"   "}' }])
  console.log('whitespace-only regex ->', JSON.stringify(o.result))
  assert.equal(o.error, null)
})

test('verify contract VS-4: exit 0 JSON error body is no rule; non-zero exit is a note', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const body = '{"message": "404 Project Not Found"}'
  const out = drive([
    { repo, samples: ['a'], stdout: body },
    ...[1, 2, 127].map((exit) => ({ repo, samples: ['a'], stdout: body, stderr: 'denied', exit })),
  ])
  assert.deepEqual(out[0].result, { forge: 'gitlab', rules: [], by_sample: { a: [] }, notes: [], unchecked: false })
  for (const o of out.slice(1)) {
    assert.deepEqual(o.result.notes, [PREFIX + 'denied'])
    assert.equal(o.result.unchecked, true)
    assert.deepEqual(o.result.rules, [])
    assert.deepEqual(o.result.by_sample, {})
  }
})

test('verify contract VS-5: failing glab gives exactly one note and unchecked samples', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const [o] = drive([{ repo, samples: ['a', 'b', 'c'], stdout: '', stderr: 'boom', exit: 1 }])
  assert.deepEqual(o.result, { forge: 'gitlab', rules: [], by_sample: {}, notes: [PREFIX + 'boom'], unchecked: true })
  assert.equal(o.calls.length, 1)
})

test('verify contract VS-5: empty, multi-line, long, control and NUL stderr never raise', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const stderrs = ['', '\n\n', 'line1\nline2\nline3', 'x'.repeat(200000), '\u0007\u001b[31mred\u001b[0m', 'a\u0000b', '😀 emoji é', '� bad']
  const out = drive(stderrs.map((stderr) => ({ repo, samples: ['a'], stdout: '', stderr, exit: 1 })))
  const report = []
  out.forEach((o, i) => {
    assert.equal(o.error, null, `stderr #${i}`)
    assert.equal(o.result.notes.length, 1)
    assert.ok(o.result.notes[0].startsWith(PREFIX))
    assert.equal(o.result.unchecked, true)
    report.push({ i, len: o.result.notes[0].length, lines: o.result.notes[0].split('\n').length })
  })
  console.log('stderr lengths', JSON.stringify(report))
  const empty = out[0].result.notes[0]
  assert.ok(empty.length > PREFIX.length, 'empty stderr still gives a reason')
})

test('verify contract VS-5: note is one line and bounded (spec-silent, recorded)', () => {
  const repo = makeRepo({ forge: 'gitlab' })
  const out = drive([
    { repo, samples: ['a'], stdout: '', stderr: 'line1\nline2', exit: 1 },
    { repo, samples: ['a'], stdout: '', stderr: 'x'.repeat(100000), exit: 1 },
  ])
  console.log('multi-line note', JSON.stringify(out[0].result.notes[0]), 'long note length', out[1].result.notes[0].length)
})

test('verify contract VS-6: no forge makes no call and returns unchecked true', () => {
  const configs = [{ forge: '' }, {}, { forge: null }, { forge: 'bitbucket' }, { forge: 5 }, { forge: [] }, undefined, '{not json', '[]', 'null']
  const report = []
  for (const config of configs) {
    const repo = makeRepo(config)
    const [o] = drive([{ repo, samples: ['a', 'b'], stdout: '{"branch_name_regex":"^x$"}' }])
    report.push({ config: typeof config === 'string' ? config : JSON.stringify(config), error: o.error, result: o.result, calls: o.calls.length })
  }
  console.log(JSON.stringify(report, null, 1))
  for (const x of report) assert.equal(x.calls, 0, x.config)
  for (const x of report.filter((r) => r.config !== '{not json')) {
    assert.equal(x.error, null, x.config)
    assert.deepEqual(x.result.rules, [])
    assert.deepEqual(x.result.notes, [])
    assert.deepEqual(x.result.by_sample, {})
    assert.equal(x.result.unchecked, true)
  }
})

test('verify contract VS-6: no .sdlc directory makes no call', () => {
  const repo = fresh('bare')
  const [o] = drive([{ repo, samples: ['a'], stdout: 'null' }])
  assert.equal(o.error, null)
  assert.equal(o.calls.length, 0)
  assert.equal(o.result.unchecked, true)
})

test('verify contract VS-2/3/4/5: property against the spec reference model', () => {
  const seed = defaultSeed(); const r = rng(seed).next; const runs = 1500
  const pick = (a) => a[Math.floor(r() * a.length)]
  const regexes = ['^feat/.*$', '.*', '\\d+', '[', '(?P<x>a)', '^(a|b)$', 'é', ' ', '\u0000', '😀', 'a'.repeat(5000), '^[a-z]+/\\w+$']
  const bodies = () => pick([
    () => 'null', () => '{}', () => '[]', () => '"str"', () => '5', () => 'true',
    () => JSON.stringify({ branch_name_regex: pick(regexes) }),
    () => JSON.stringify({ branch_name_regex: pick(regexes), commit_message_regex: 'zz', deny_delete_tag: true }),
    () => JSON.stringify({ branch_name_regex: '' }),
    () => JSON.stringify({ branch_name_regex: null }),
    () => JSON.stringify({ branch_name_regex: pick([1, 1.5, true, [], ['a'], {}, { a: 1 }]) }),
    () => JSON.stringify({ message: '404 Project Not Found' }),
    () => '', () => '{', () => 'not json',
  ])()
  const repo = makeRepo({ forge: 'gitlab' })
  const specs = []
  for (let i = 0; i < runs; i++) {
    const n = Math.floor(r() * 6)
    const samples = Array.from({ length: n }, () => pick(['a', 'feat/x', 'é/ü', 'with space', '-x', '😀', 'A/B']))
    const exit = pick([0, 0, 0, 0, 1, 2, 127, 255])
    specs.push({ repo, samples, stdout: bodies(), stderr: pick(['', 'boom', ' padded \n', 'x y z']), exit })
  }
  const out = drive(specs)
  const failures = []
  out.forEach((o, i) => {
    const s = specs[i]
    const m = model(s)
    if (o.error) { failures.push({ i, s, why: 'raised ' + o.error }); return }
    if (o.calls.length !== 1) { failures.push({ i, why: 'calls ' + o.calls.length }); return }
    if (m.fail) {
      if (!(o.result.unchecked === true && o.result.notes.length === 1 && o.result.notes[0].startsWith(PREFIX) && o.result.rules.length === 0)) failures.push({ i, s, why: 'bad json not a failure note', got: o.result })
      return
    }
    const { forge, ...rest } = o.result
    try { assert.deepEqual(rest, m) } catch (e) { failures.push({ i, s: { ...s, stdout: s.stdout.slice(0, 80) }, why: 'model mismatch', got: rest, want: m }) }
    for (const rule of rest.rules) {
      assert.deepEqual(Object.keys(rule), KEYS)
      assert.equal(typeof rule.pattern, 'string')
    }
  })
  console.log(`property-run VS-2..5 seed=${seed} runs=${runs} failures=${failures.length}`)
  if (failures.length) console.log(JSON.stringify(failures.slice(0, 5), null, 1))
  assert.equal(failures.length, 0)
})
