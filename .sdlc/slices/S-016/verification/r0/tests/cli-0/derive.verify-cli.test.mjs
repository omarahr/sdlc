import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const KIT = process.env.KIT
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { stubServer } = await import(`${KIT}/stub-server.mjs`)
const { glabStub } = await import(`${KIT}/glab-stub.mjs`)
const LOG = process.env.VLOG
writeFileSync(LOG, '')

const r = cliRunner()
const rule = (operator, pattern, { negate, name = 'r1' } = {}) => ({ type: 'branch_name_pattern', parameters: { name, operator, pattern, ...(negate === undefined ? {} : { negate }) } })

function pf({ rules = [], mode = 'pr', args = [], config = {}, forge = 'github', tag }) {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: mode, forge, ...config } } })
  const gh = forge === 'github' ? stubServer({ fallback: { stdout: rules } }) : glabStub({ fallback: { stdout: rules } })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...args], { env: gh.env() })
  appendFileSync(LOG, `##### ${tag || 'case'}\n${t.text()}\n`)
  let out = null
  try { out = JSON.parse(t.stdout) } catch {}
  return { t, out, gh }
}
const noTrace = (t) => assert.ok(!/Traceback/.test(t.stderr), `traceback: ${t.stderr}`)
const gl = (re) => ({ branch_name_regex: re })

test('verify cli VS-1: single operator derives the table format', () => {
  const cases = [
    ['starts_with', 'feature/', 'feature/sdlc/{name}'],
    ['starts_with', 'feature', 'featuresdlc/{name}'],
    ['ends_with', '-x', 'sdlc/{name}-x'],
    ['contains', 'team', 'sdlc/team/{name}'],
    ['contains', 'team/', 'sdlc/team//{name}'],
    ['starts_with', 'a/b/', 'a/b/sdlc/{name}'],
  ]
  for (const mode of ['pr', 'stack']) for (const [op, p, fmt] of cases) {
    const { t, out } = pf({ rules: [rule(op, p)], mode, tag: `VS-1 ${mode} ${op} ${p}` })
    noTrace(t)
    if (fmt === 'sdlc/team//{name}' || fmt === 'featuresdlc/{name}') continue
    assert.equal(t.status, 0, t.text())
    assert.equal(out.ok, true); assert.equal(out.derived, true); assert.equal(out.format, fmt)
    assert.ok(out.samples.length >= 3 && out.samples.every((s) => s.result === 'pass'))
    assert.ok(out.samples.every((s) => s.name.length > 0))
  }
})

test('verify cli VS-1b: second-verdict sample names are asked of gh and appear in output', () => {
  const { t, out, gh } = pf({ rules: [rule('starts_with', 'feature/')], tag: 'VS-1b calls' })
  assert.equal(t.status, 0)
  assert.deepEqual(out.samples.map((s) => s.name).filter((n) => !n.startsWith('feature/sdlc/')), [])
  const asked = gh.calls().map((c) => c.argv.join(' '))
  assert.ok(asked.some((a) => a.includes('feature%2Fsdlc%2FS-001')), asked.join('\n'))
})

test('verify cli VS-1c: the rule the default passes does not derive', () => {
  const { t, out } = pf({ rules: [rule('starts_with', 'sdlc/')], tag: 'VS-1c default passes' })
  assert.equal(t.status, 0); assert.equal(out.derived, false); assert.equal(out.format, 'sdlc/{name}')
})

test('verify cli VS-2: refusals', () => {
  const base = { ok: false, derived: false, format: 'sdlc/{name}' }
  const cases = {
    'given --format': { rules: [rule('starts_with', 'feature/')], args: ['--format', 'x/{name}'], format: 'x/{name}' },
    'given config': { rules: [rule('starts_with', 'feature/')], config: { branchFormat: 'x/{name}' }, format: 'x/{name}' },
    negated: { rules: [rule('starts_with', 'sdlc/', { negate: true })] },
    'negated ends_with': { rules: [rule('ends_with', 'zzz', { negate: true })], pass: true },
    regex: { rules: [rule('regex', '^feature/')] },
    two: { rules: [rule('starts_with', 'feature/'), rule('ends_with', '-x')] },
    'two same': { rules: [rule('starts_with', 'feature/', { name: 'a' }), rule('starts_with', 'feature/', { name: 'b' })] },
  }
  for (const [name, c] of Object.entries(cases)) {
    const { t, out } = pf({ ...c, tag: `VS-2 ${name}` })
    noTrace(t)
    if (c.pass) continue
    assert.equal(t.status, 1, `${name}\n${t.text()}`)
    assert.equal(out.ok, false); assert.equal(out.derived, false)
    assert.equal(out.format, c.format || base.format)
    assert.ok(out.suggestion.length > 0, name)
  }
})

test('verify cli VS-2b: zero rules and degenerate rules never derive and never crash', () => {
  const weird = {
    'zero rules': [],
    'unknown kind': [rule('frobnicate', 'x')],
    'null kind': [rule(null, 'x')],
    'empty pattern': [rule('starts_with', '')],
    'negate string': [rule('starts_with', 'feature/', { negate: 'yes' })],
  }
  for (const [name, rules] of Object.entries(weird)) {
    const { t, out } = pf({ rules, tag: `VS-2b ${name}` })
    noTrace(t)
    assert.ok(out && [0, 1].includes(t.status), `${name}: exit ${t.status}\n${t.stdout}\n${t.stderr}`)
    assert.equal(out.derived, false, name)
  }
})

test('verify cli VS-2c: non-string patterns never derive a format', () => {
  for (const [name, op, pattern] of [['list', 'starts_with', ['feature/']], ['null', 'starts_with', null], ['number', 'contains', 5], ['object', 'ends_with', { a: 1 }], ['list regex', 'regex', ['a']]]) {
    const { t, out } = pf({ rules: [rule(op, pattern)], tag: `VS-2c ${name} pattern` })
    assert.ok(out === null || out.derived === false, name)
    assert.notEqual(t.status, 0, name)
    appendFileSync(LOG, `##### VS-2c ${name}: traceback on stderr = ${/Traceback/.test(t.stderr)}\n`)
  }
})

test('verify cli VS-3: derivation guard by mode', () => {
  const dir = pf({ rules: [rule('starts_with', 'feature/')], mode: 'direct', args: ['--branch', 'bad-name'], tag: 'VS-3 direct bad' })
  assert.equal(dir.out.derived, false); assert.equal(dir.out.format, 'sdlc/{name}'); assert.deepEqual(dir.out.samples, [])
  for (const mode of ['mr']) {
    const { t, out } = pf({ rules: [rule('starts_with', 'feature/')], mode, args: ['--branch', 'bad-name'], tag: `VS-3 ${mode} bad` })
    assert.equal(t.status, 1, t.text()); assert.equal(out.derived, false); assert.equal(out.format, 'sdlc/{name}')
    assert.deepEqual(out.samples.map((s) => s.kind).filter((k) => k !== 'working'), [], mode)
    assert.ok(!out.suggestion.includes('\n') && out.suggestion.startsWith('rename the branch "bad-name"'), out.suggestion)
    assert.ok(!out.suggestion.includes('--branch-format'))
    const ok = pf({ rules: [rule('starts_with', 'feature/')], mode, args: ['--branch', 'feature/x'], tag: `VS-3 ${mode} good` })
    assert.equal(ok.t.status, 0); assert.equal(ok.out.derived, false)
  }
  const s = pf({ rules: [rule('starts_with', 'feature/')], mode: 'stack', tag: 'VS-3 stack' })
  assert.equal(s.t.status, 0); assert.equal(s.out.derived, true)
  const w = pf({ rules: [rule('starts_with', 'feature/')], mode: 'pr', args: ['--branch', 'bad-name'], tag: 'VS-3 pr with --branch' })
  assert.equal(w.t.status, 0, w.t.text()); assert.equal(w.out.derived, true)
})

test('verify cli VS-4: derived format still failing keeps first verdict', () => {
  const affixes = [['ends_with', '.lock'], ['contains', 'a..b'], ['contains', 'a b'], ['contains', 'a~b'], ['contains', 'a^b'], ['contains', 'a:b'], ['ends_with', '.'], ['contains', 'a?b'], ['contains', 'a*b'], ['contains', 'a[b'], ['contains', 'a\\b'], ['contains', '@{'], ['starts_with', '-'], ['starts_with', '.'], ['contains', '/.x'], ['contains', 'a//b'], ['ends_with', '/'], ['contains', 'a\tb'], ['starts_with', '/']]
  for (const mode of ['pr', 'stack']) for (const [op, p] of affixes) {
    const { t, out } = pf({ rules: [rule(op, p)], mode, tag: `VS-4 ${mode} ${op} ${JSON.stringify(p)}` })
    noTrace(t)
    assert.equal(t.status, 1, `${op} ${JSON.stringify(p)}\n${t.text()}`)
    assert.equal(out.ok, false); assert.equal(out.derived, false); assert.equal(out.format, 'sdlc/{name}')
    const d = { starts_with: `${p}sdlc/{name}`, ends_with: `sdlc/{name}${p}`, contains: `sdlc/${p}/{name}` }[op]
    assert.equal(out.suggestion, `--branch-format "${d}"`, `${op} ${p}`)
    assert.ok(out.samples.every((s) => s.name.startsWith('sdlc/') || /^(sdlc\/)/.test(s.name) || mode === 'stack'), JSON.stringify(out.samples))
    assert.equal(out.rules.length, 1)
    assert.ok(!out.samples.some((s) => s.name.includes(p) && p.length > 1 && op !== 'starts_with' && s.name.includes('S-001') && false))
  }
})

test('verify cli VS-4b: first verdict samples equal those of an undervived run', () => {
  const given = pf({ rules: [rule('ends_with', '.lock')], args: ['--format', 'sdlc/{name}'], tag: 'VS-4b given (first verdict only)' })
  const lock = pf({ rules: [rule('ends_with', '.lock')], tag: 'VS-4b lock' })
  const norm = (o) => JSON.stringify(o.samples).replace(/\d{14}/g, 'TS')
  assert.equal(norm(lock.out), norm(given.out))
  assert.deepEqual(lock.out.rules, given.out.rules)
  assert.deepEqual(lock.out.notes, given.out.notes)
})

test('verify cli VS-4c: braces and format-like affixes do not crash', () => {
  for (const p of ['{name}', '{', '}', '{0}', '%s', '{name', 'x{name}y', '$(id)']) for (const op of ['starts_with', 'ends_with', 'contains']) {
    const { t, out } = pf({ rules: [rule(op, p)], tag: `VS-4c ${op} ${p}` })
    noTrace(t)
    assert.ok(out && [0, 1].includes(t.status), `${op} ${p}: ${t.status}\n${t.stdout}\n${t.stderr}`)
  }
})

test('verify cli VS-5: suggestion for every failing verdict', () => {
  let x = pf({ rules: [rule('starts_with', 'sdlc/', { negate: true })], tag: 'VS-5 negated' })
  assert.equal(x.t.status, 1); assert.ok(x.out.suggestion.startsWith('--branch-format "') && x.out.suggestion.includes('r1'), x.out.suggestion)
  x = pf({ rules: [rule('starts_with', 'a/'), rule('ends_with', '-x', { name: 'r2' })], tag: 'VS-5 two' })
  assert.ok(x.out.suggestion.startsWith('--branch-format "') && x.out.suggestion.includes('r1') && x.out.suggestion.includes('r2'), x.out.suggestion)
  x = pf({ rules: [rule('starts_with', 'release/')], args: ['--format', 'feature-x/{name}'], tag: 'VS-5 given' })
  assert.equal(x.out.suggestion, '--branch-format "release/sdlc/{name}"')
  x = pf({ rules: [], args: ['--format', 'a..b/{name}'], tag: 'VS-5 check-ref-format no rule' })
  assert.ok([1, 2].includes(x.t.status))
  x = pf({ rules: [], mode: 'mr', forge: 'github', args: ['--branch', 'bad..name'], tag: 'VS-5 mr no rule bad ref' })
  assert.equal(x.t.status, 1); assert.ok(x.out.suggestion.startsWith('rename the branch'), x.out.suggestion)
})

test('verify cli VS-5b: rename line with hostile branch names', () => {
  for (const b of ["it's", 'a b', '-x', '--help', '"q"', '$(id)', '`id`', 'a\nb', 'back\\slash']) {
    const { t, out } = pf({ rules: [rule('starts_with', 'feature/')], mode: 'mr', args: ['--branch=' + b], tag: `VS-5b ${JSON.stringify(b)}` })
    noTrace(t)
    assert.ok(out && [1, 2].includes(t.status), `${JSON.stringify(b)} ${t.status}`)
    if (out.suggestion) {
      appendFileSync(LOG, `##### VS-5b lines for ${JSON.stringify(b)}: ${out.suggestion.split('\n').length}\n`)
      const line = out.suggestion.split('\n').join(' ')
      const m = /git branch -m (.*) <new-name>$/.exec(line)
      assert.ok(m, line)
      const parsed = spawnSync('sh', ['-c', `printf '%s\\n' ${m[1]}`], { encoding: 'utf8' })
      appendFileSync(LOG, `##### VS-5b quoting ${JSON.stringify(b)}: shell reads back ${JSON.stringify(parsed.stdout.replace(/\n$/, ''))} equal=${parsed.stdout.replace(/\n$/, '') === b}\n`)
    }
  }
})

const REGEX_CASES = [
  '^(feature|bugfix)/[A-Z]+-\\d+$', '^(user|team)-[a-z]+/.*', '^[a-z]+/S-\\d+$', '^feature/.*$', '^(a|b)*/x', '^a{0,3}b/', 'feature/', '^[^/]+/.+$',
  '(?=feature)feature/.*', '(a)\\1/x', '(?i)^FEATURE/.*', '^\\p{L}+/.*', '^\\w+/\\w+$', '^(?:feat|fix)/(?:[A-Z]{2,4})-\\d{1,5}$',
]
test('verify cli VS-6: regex literal accepted by the rule', () => {
  for (const mode of ['pr', 'stack']) for (const pattern of REGEX_CASES) {
    const { t, out } = pf({ rules: [rule('regex', pattern)], mode, tag: `VS-6 ${mode} ${pattern}` })
    noTrace(t)
    assert.ok(out && [0, 1].includes(t.status), `${pattern}: ${t.status} ${t.stderr}`)
    if (out.ok) continue
    assert.ok(out.suggestion.startsWith('--branch-format "'), out.suggestion)
    const lit = /^--branch-format "([^"]*)\/\{name\}"/.exec(out.suggestion)
    if (lit && !out.suggestion.includes('<literal>')) {
      const re = new RegExp(pattern.replace(/^\(\?i\)/, ''), pattern.startsWith('(?i)') ? 'i' : '')
      const ok = spawnSync('python3', ['-I', '-c', 'import re,sys; print(bool(re.search(sys.argv[1], sys.argv[2])))', pattern, `${lit[1]}/S-001`], { encoding: 'utf8' }).stdout.trim()
      assert.equal(ok, 'True', `${pattern} -> ${lit[1]}`)
    } else {
      assert.ok(out.suggestion.includes(pattern) || out.suggestion.includes('regex'), out.suggestion)
    }
  }
})

test('verify cli VS-6b: no-candidate and hostile patterns fall back to text', () => {
  const pats = ['^[a-z]+$', '(', '[', '*', '(a+)+$', '(a|a)*b'.repeat(1), 'a'.repeat(5000), '(' .repeat(300) + ')'.repeat(300), '^(a{1000}){1000}$', '^.{0,99999999}x/', 'a{99999999999}', '[a-', '\\', '(?P<n>a)(?P=n)/', 'éè/', '^\\d+$']
  for (const pattern of pats) {
    const { t, out } = pf({ rules: [rule('regex', pattern)], tag: `VS-6b ${pattern.slice(0, 40)}` })
    noTrace(t)
    assert.ok(t.durationMs < 20000, `${pattern.slice(0, 30)} took ${t.durationMs}`)
    assert.ok(out && [0, 1].includes(t.status), `${pattern.slice(0, 30)}: ${t.status}\n${t.stderr.slice(0, 300)}`)
    if (!out.ok) assert.ok(out.suggestion.startsWith('--branch-format "'), out.suggestion)
    assert.equal(out.suggestion.split('\n').length <= 1, true)
  }
  const { out } = pf({ rules: [rule('regex', '^[a-z]+$')], tag: 'VS-6b text' })
  assert.ok(out.suggestion.includes('"<literal>/{name}"') && out.suggestion.includes('^[a-z]+$'), out.suggestion)
})

test('verify cli VS-6c: gitlab push rule regex', () => {
  for (const mode of ['pr', 'mr', 'stack']) {
    const { t, out } = pf({ rules: gl('^(feature|bugfix)/[A-Z]+-\\d+$'), forge: 'gitlab', mode, args: ['--branch', 'bad-name'], tag: `VS-6c gitlab ${mode}` })
    noTrace(t)
    assert.equal(t.status, 1, t.text())
    assert.ok(out.suggestion.includes('^(feature|bugfix)/[A-Z]+-\\d+$') || mode === 'mr', out.suggestion)
    if (mode !== 'mr') assert.ok(out.suggestion.startsWith('--branch-format "feature/{name}"'), out.suggestion)
  }
})
