import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { load, plantDecoy, decoyFired, equalsForm } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const LOG_DIR = process.env.VERIFY_LOG_DIR
const r = cliRunner()
const BRANCHES = join(r.skillDir, 'branches.py')

function logTo(name, text) {
  if (LOG_DIR) writeFileSync(join(LOG_DIR, name), text)
}

function findPwned(dirs) {
  const hits = []
  const walk = (d) => {
    let names
    try { names = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of names) {
      if (e.name === '.git') continue
      const p = join(d, e.name)
      if (e.name.includes('pwned')) hits.push(p)
      if (e.isDirectory()) walk(p)
    }
  }
  for (const d of dirs) walk(d)
  return hits
}

function contractViolations(t) {
  const out = []
  if (t.spawnError) return [`spawnError ${t.spawnError}`]
  if (t.status !== 0 && t.status !== 2) out.push(`exit ${t.status}`)
  const lines = t.stdout.replace(/\n$/, '').split('\n')
  if (lines.length !== 1) out.push(`stdout has ${lines.length} lines`)
  if (t.json === null || typeof t.json !== 'object' || Array.isArray(t.json)) out.push('stdout is not one JSON object')
  else {
    if (t.status === 0 && t.json.ok !== true) out.push('exit 0 without ok true')
    if (t.status === 2 && (t.json.ok !== false || typeof t.json.error !== 'string' || !t.json.error)) out.push('exit 2 without ok false and an error')
  }
  if (t.stderr.includes('Traceback')) out.push('Traceback on stderr')
  if (t.stderr !== '') out.push(`stderr not empty: ${t.stderr.slice(0, 200)}`)
  if (!t.treeUnchanged) out.push('tree changed: ' + JSON.stringify(Object.values(t.tree).map((d) => d.diff)))
  return out
}

function pyApi(calls) {
  const code = [
    'import importlib.util, json, sys',
    's = importlib.util.spec_from_file_location("b", sys.argv[1])',
    'm = importlib.util.module_from_spec(s)',
    's.loader.exec_module(m)',
    'out = []',
    'for kind, parts in json.loads(sys.argv[2]):',
    '    parts = {k: (True if v == "<True>" else v) for k, v in parts.items()}',
    '    try:',
    '        out.append({"outcome": "return", "value": m.tail(kind, **parts)})',
    '    except m.Fail as e:',
    '        out.append({"outcome": "Fail", "message": str(e)})',
    '    except BaseException as e:',
    '        out.append({"outcome": "exception", "type": type(e).__name__, "message": str(e)[:200]})',
    'print(json.dumps(out))',
  ].join('\n')
  const t = r.exec('python3', ['-I', '-c', code, BRANCHES, JSON.stringify(calls)])
  assert.equal(t.status, 0, t.text())
  return JSON.parse(t.stdout)
}

function pyInts(values) {
  const code = [
    'import json, sys',
    'out = []',
    'for v in json.loads(sys.argv[1]):',
    '    try:',
    '        out.append(str(int(v)))',
    '    except BaseException as e:',
    '        out.append(None)',
    'print(json.dumps(out))',
  ].join('\n')
  const t = r.exec('python3', ['-I', '-c', code, JSON.stringify(values)])
  return JSON.parse(t.stdout)
}

function refOk(branch) {
  const t = r.exec('git', ['check-ref-format', '--branch', branch])
  return t.status === 0
}

test('verify security: VS-3 a missing or empty part exits 2 with one JSON error that names the part', () => {
  const repo = r.gitRepo()
  const cases = [
    { args: ['--kind', 'run'], part: 'n' },
    { args: ['--kind', 'milestone'], part: 'id' },
    { args: ['--kind', 'milestone', '--id', ''], part: 'id' },
    { args: ['--kind', 'e2e'], part: 'id' },
    { args: ['--kind', 'e2e', '--id', ''], part: 'id' },
    { args: ['--kind', 'e2e-area', '--id', 'M-1'], part: 'area' },
    { args: ['--kind', 'e2e-area', '--id', 'M-1', '--area', ''], part: 'area' },
    { args: ['--kind', 'e2e-area', '--area', 'api'], part: 'id' },
    { args: ['--kind', 'run', '--id', '1'], part: 'n' },
    { args: ['--kind', 'milestone', '--n', '1'], part: 'id' },
    { args: ['--kind', 'e2e', '--n', '1', '--area', 'api'], part: 'id' },
  ]
  const transcripts = []
  for (const c of cases) {
    const t = r.run('branches.py', ['name', '--repo', repo, ...c.args])
    transcripts.push(t.text())
    assert.deepEqual(contractViolations(t), [], t.text())
    assert.equal(t.status, 2, t.text())
    assert.match(t.json.error, new RegExp(`non-empty ${c.part}$`), t.text())
    assert.equal(findPwned([repo, t.cwd]).length, 0)
  }
  logTo('security-0-vs3-cli.txt', transcripts.join('\n\n'))
})

test('verify security: VS-3 tail raises only Fail for a missing part and keeps 0 as a value', () => {
  const calls = [
    ['run', {}], ['run', { n: null }], ['run', { n: '' }], ['run', { id: '1' }],
    ['milestone', {}], ['milestone', { id: '' }], ['milestone', { id: null }], ['milestone', { n: 1 }],
    ['e2e', {}], ['e2e', { id: null }], ['e2e', { id: '' }],
    ['e2e-area', { id: 'M-1' }], ['e2e-area', { area: 'api' }], ['e2e-area', { id: 'M-1', area: '' }],
    ['run', { n: 0 }],
  ]
  const res = pyApi(calls)
  logTo('security-0-vs3-api.json', JSON.stringify(calls.map((c, i) => ({ call: c, result: res[i] })), null, 2))
  for (let i = 0; i < calls.length - 1; i++) assert.equal(res[i].outcome, 'Fail', JSON.stringify([calls[i], res[i]]))
  assert.deepEqual(res.at(-1), { outcome: 'return', value: 'run-0' })
})

test('verify security: VS-4 every --n form gives exit 0 with run-<int> or exit 2 with one JSON error', () => {
  const repo = r.gitRepo()
  const entries = [
    ...load('integer-forms', { argv: true }),
    ...load('huge-integers', { argv: true }),
    ...load('unicode-digits', { argv: true }),
    ...['0', '1', '12', '-1', '1.5', 'abc', ' 1', '+1', '0x1', '1_000'].map((v) => ({ id: `plan-${v}`, family: 'plan', value: v })),
  ]
  const expected = pyInts(entries.map((e) => e.value))
  const rows = []
  for (const [i, e] of entries.entries()) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', equalsForm('--n', e.value)])
    const v = contractViolations(t)
    const row = { id: `${e.family}/${e.id}`, value: e.value.length > 40 ? `${e.value.slice(0, 20)}…(${e.value.length} chars)` : e.value, status: t.status, out: t.status === 0 ? t.json.branch.slice(0, 60) : t.json?.error?.slice(0, 80), violations: v }
    rows.push(row)
    assert.deepEqual(v, [], `${row.id}\n${t.text().slice(0, 2000)}`)
    if (t.status === 0) {
      assert.notEqual(expected[i], null, `${row.id} accepted a value Python int() refuses`)
      assert.equal(t.json.branch, `sdlc/run-${expected[i]}`, row.id)
      if (!expected[i].startsWith('-')) assert.ok(refOk(t.json.branch), `${row.id} gives a branch git refuses`)
    } else {
      assert.match(t.json.error, /--n/, row.id)
    }
  }
  logTo('security-0-vs4-cli.jsonl', rows.map((x) => JSON.stringify(x)).join('\n'))
})

test('verify security: VS-4 tail run accepts True, "7" and 7 as a string tail or Fail', () => {
  const calls = [['run', { n: '<True>' }], ['run', { n: '7' }], ['run', { n: 7 }], ['run', { n: 0 }]]
  const res = pyApi(calls)
  logTo('security-0-vs4-api.json', JSON.stringify(calls.map((c, i) => ({ call: c, result: res[i] })), null, 2))
  for (const x of res) assert.ok(x.outcome === 'Fail' || (x.outcome === 'return' && typeof x.value === 'string'), JSON.stringify(x))
  assert.deepEqual(res.map((x) => x.value), ['run-True', 'run-7', 'run-7', 'run-0'])
})

test('verify security: VS-5 hostile --id and --area values never run a shell, write a file, import a planted module or expand a format', () => {
  const families = ['traversal', 'control-chars', 'flag-like-values', 'injection', 'format-strings', 'unicode-whitespace', 'unicode-confusables', 'oversized']
  const entries = families.flatMap((f) => load(f, { argv: true }))
  const repo = r.gitRepo({ files: { 'json.py': 'raise SystemExit(97)\n', 'subprocess.py': 'raise SystemExit(97)\n' } })
  const cwd = r.dir('cwd')
  const decoys = ['json', 're', 'argparse', 'subprocess', 'os'].map((module) => plantDecoy(cwd, { module }))
  const shapes = [
    { kind: 'milestone', args: (v) => [equalsForm('--id', v)], tail: (v) => v },
    { kind: 'e2e', args: (v) => [equalsForm('--id', v)], tail: (v) => `${v}-e2e` },
    { kind: 'e2e-area', args: (v) => ['--id', 'M-1', equalsForm('--area', v)], tail: (v) => `M-1-e2e-${v}` },
    { kind: 'e2e-area', args: (v) => [equalsForm('--id', v), '--area', 'api'], tail: (v) => `${v}-e2e-api` },
  ]
  const rows = []
  const gitRefused = []
  for (const e of entries) {
    for (const s of shapes) {
      const t = r.run('branches.py', ['name', '--repo', repo, '--kind', s.kind, ...s.args(e.value)], { cwd })
      const v = contractViolations(t)
      const pwned = findPwned([repo, cwd, r.home])
      const row = { id: `${e.family}/${e.id}`, kind: s.kind, field: s.args('X')[0].startsWith('--area') || s.args('X')[2]?.startsWith('--area') ? 'area' : 'id', status: t.status, violations: v, pwned }
      rows.push(row)
      if (t.spawnError) continue
      assert.deepEqual(v, [], `${row.id} ${s.kind}\n${t.text().slice(0, 2000)}`)
      assert.deepEqual(pwned, [], row.id)
      assert.notEqual(t.status, 97, row.id)
      if (e.value === '') {
        assert.equal(t.status, 2, row.id)
        assert.match(t.json.error, /needs a non-empty (id|area)$/, row.id)
        continue
      }
      assert.equal(t.status, 0, `${row.id} ${s.kind} was refused: ${t.json?.error}`)
      assert.equal(t.json.branch, `sdlc/${s.tail(e.value)}`, `${row.id} ${s.kind} tail is not literal`)
      if (!refOk(t.json.branch)) gitRefused.push(`${s.kind} ${row.field} ${row.id}: ${JSON.stringify(t.json.branch.length > 60 ? t.json.branch.slice(0, 60) + '…' : t.json.branch)}`)
    }
  }
  for (const d of decoys) assert.equal(decoyFired(d), null, `decoy ${d.path} was imported`)
  logTo('security-0-vs5-cli.jsonl', rows.map(({ violations, pwned, ...x }) => JSON.stringify({ ...x, clean: !violations.length && !pwned.length })).join('\n'))
  logTo('security-0-vs5-git-refused.txt', gitRefused.join('\n'))
  assert.ok(rows.filter((x) => x.status === 0).length > 0)
})

test('verify security: VS-5 a format-string id under a lowercase format stays literal and is not re-expanded', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name:lower}' } } })
  const cases = [
    ['milestone', '{NAME}', 'feature/{name}'],
    ['e2e', '{name:lower}', 'feature/{name:lower}-e2e'],
    ['milestone', '%S%N', 'feature/%s%n'],
    ['e2e', '{0.__CLASS__}', 'feature/{0.__class__}-e2e'],
  ]
  const transcripts = []
  for (const [kind, id, branch] of cases) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', kind, equalsForm('--id', id)])
    transcripts.push(t.text())
    assert.deepEqual(contractViolations(t), [], t.text())
    assert.equal(t.json.branch, branch, t.text())
  }
  logTo('security-0-vs5-lower.txt', transcripts.join('\n\n'))
})

test('verify security: VS-5 a value after a space-form flag that looks like a flag is refused with one JSON error', () => {
  const repo = r.gitRepo()
  const transcripts = []
  for (const v of ['--help', '-h', '--', '--repo', '--format=x/{name}']) {
    for (const args of [['--kind', 'milestone', '--id', v], ['--kind', 'e2e-area', '--id', 'M-1', '--area', v]]) {
      const t = r.run('branches.py', ['name', '--repo', repo, ...args])
      transcripts.push(t.text())
      assert.deepEqual(contractViolations(t), [], t.text())
      assert.equal(t.status, 2, t.text())
      assert.ok(!t.stdout.includes('usage:'), t.text())
    }
  }
  logTo('security-0-vs5-flaglike.txt', transcripts.join('\n\n'))
  assert.ok(existsSync(repo))
})
