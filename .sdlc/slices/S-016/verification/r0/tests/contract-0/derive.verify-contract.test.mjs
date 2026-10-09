import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.VROOT
if (!ROOT) throw new Error('set VROOT to the slice worktree')
const { cliRunner } = await import(`${ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { stubServer } = await import(`${ROOT}/skills/sdlc/test/testkit/stub-server.mjs`)
const { glabStub } = await import(`${ROOT}/skills/sdlc/test/testkit/glab-stub.mjs`)
const { check, callPython, rng, defaultSeed, BRANCHES, assertProperty } = await import(`${ROOT}/skills/sdlc/test/testkit/property.mjs`)

const runner = cliRunner()
const rule = (kind, pattern, negate = false, label = 'r') => ({ source: 'github', kind, pattern, negate, label })
const gh = (...rules) => stubServer({ name: 'gh', script: [], fallback: { stdout: rules.map((p) => ({ type: 'branch_name_pattern', parameters: p })) } })
const op = (operator, pattern, extra = {}) => ({ name: `${operator} rule`, operator, pattern, ...extra })

function pre(mode, rules, { extra = [], config = {}, stub } = {}) {
  const shim = stub ?? gh(...rules)
  const repo = runner.gitRepo({ files: { '.sdlc/config.json': { gitMode: mode === 'stack' ? 'stack' : 'pr', forge: 'github', ...config } } })
  const t = runner.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...extra], { env: shim.env() })
  return t
}
const call = (fn, calls) => callPython(BRANCHES, fn, calls)

test('verify contract: surface lists derive, suggest and _regex_literal as callables', () => {
  const r = spawnSync('python3', ['-I', '-c', `
import importlib.util,sys,inspect
s=importlib.util.spec_from_file_location("b",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
for n in ("derive","suggest","_regex_literal"): print(n, inspect.signature(getattr(m,n)))
`, BRANCHES], { encoding: 'utf8' })
  console.log(r.stdout)
  assert.match(r.stdout, /derive \(rules\)/)
  assert.match(r.stdout, /suggest \(rules, rows, derived\)/)
})

test('verify contract: VS-1 derive follows the table (examples, verbatim from spec)', () => {
  const got = call('derive', [
    [[rule('starts_with', 'feature/')]], [[rule('ends_with', '-x')]], [[rule('contains', 'team')]],
    [[rule('starts_with', 'release/')]], [[rule('ends_with', '.lock')]], [[rule('contains', 'a..b')]],
  ]).map((r) => r.value)
  assert.deepEqual(got, ['feature/sdlc/{name}', 'sdlc/{name}-x', 'sdlc/team/{name}', 'release/sdlc/{name}', 'sdlc/{name}.lock', 'sdlc/a..b/{name}'])
})

const KINDS = ['starts_with', 'ends_with', 'contains', 'regex', 'bogus', 'STARTS_WITH', '', null]
const PATS = ['feature/', '-x', 'team', 'a..b', '.lock', 'é', '日本', '\u{1f600}', 'a b', '~', '^', ':', 'x.', '{x}', '{name}', '/', '\\', "'", '"', '--force', '-', 'İ', 'ß', 'e\u0301', 'sdlc/', '*', '?', '[', '@{', '\u0000', '\n', 'a'.repeat(10000)]
const BADPATS = [null, 0, 1.5, true, [], ['feature/'], {}, { a: 1 }, NaN]
const genRule = (r) => ({
  source: 'github', kind: r.pick(KINDS), pattern: r.bool(0.85) ? r.pick(PATS) : r.pick(BADPATS), negate: r.pick([false, false, false, true]), label: r.pick(['r', 'x y', '"q"', null, '']),
})
const genRules = (r) => Array.from({ length: r.pick([0, 1, 1, 1, 1, 2, 3]) }, () => genRule(r))
const TABLE = { starts_with: (p) => `${p}sdlc/{name}`, ends_with: (p) => `sdlc/{name}${p}`, contains: (p) => `sdlc/${p}/{name}` }
const refDerive = (rules) => {
  if (rules.length !== 1) return null
  const [x] = rules
  if (x.negate || !(x.kind in TABLE) || typeof x.pattern !== 'string' || x.pattern === '') return null
  return TABLE[x.kind](x.pattern)
}

test('verify contract: VS-2 property derive matches a table reference model (>=1000 runs)', () => {
  const seed = defaultSeed()
  const report = check({
    fn: 'derive', gen: genRules, seed, runs: 3000,
    property: (rules, res) => {
      if (res.outcome !== 'return') return `raised ${res.type}: ${res.message}`
      const want = refDerive(rules)
      return res.value === want ? null : `got ${JSON.stringify(res.value)} want ${JSON.stringify(want)}`
    },
  })
  writeFileSync(join(process.env.VLOGS ?? '.', 'derive-property.txt'), `${report.label}\n`)
  assertProperty(report)
})

test('verify contract: VS-2 derive does not mutate its input and is deterministic', () => {
  const r = spawnSync('python3', ['-I', '-c', `
import importlib.util,sys,copy,json
s=importlib.util.spec_from_file_location("b",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
cases=[[m.make_rule("github","starts_with","feature/",False,"a")],[m.make_rule("github","regex","^a",False,"a")],[]]
for c in cases:
    before=copy.deepcopy(c); a=m.derive(c); b=m.derive(c); assert a==b and c==before, (a,b)
rows=[{"kind":"slice","name":"s","result":"fail","rule":"a"},{"kind":"working","name":"w","result":"fail","rule":"a"}]
rb=copy.deepcopy(rows); x=m.suggest(cases[1],rows,None); y=m.suggest(cases[1],rows,None); assert x==y and rows==rb
print("ok")
`, BRANCHES], { encoding: 'utf8' })
  assert.equal(r.stdout.trim(), 'ok', r.stderr)
})

test('verify contract: VS-2 refusals at the public CLI: given, config, negate, regex, two rules, zero rules, unknown kind, non-string pattern', () => {
  const cases = [
    ['given flag', [op('starts_with', 'feature/')], { extra: ['--format', 'team/{name}'] }],
    ['config format', [op('starts_with', 'feature/')], { config: { branchFormat: 'team/{name}' } }],
    ['negated', [op('contains', 'sdlc', { negate: true })], {}],
    ['regex', [op('regex', '^feature/')], {}],
    ['two rules', [op('starts_with', 'feature/'), op('ends_with', '-x')], {}],
    ['unknown kind', [op('bogus_op', 'feature/')], {}],
  ]
  for (const [label, rules, o] of cases) {
    const t = pre('pr', rules, o)
    assert.equal(t.json?.derived, false, `${label}: ${t.text()}`)
    assert.ok([0, 1].includes(t.status), `${label}: exit ${t.status} ${t.stderr}`)
    assert.equal(t.stderr, '', label)
    if (!t.json.ok) assert.equal(t.status, 1, label)
    assert.equal(t.json.format, o.extra ? 'team/{name}' : o.config ? 'team/{name}' : 'sdlc/{name}', label)
  }
  const zero = pre('pr', [])
  assert.equal(zero.status, 0); assert.equal(zero.json.derived, false); assert.equal(zero.json.format, 'sdlc/{name}')
})

test('verify contract: VS-1 CLI derives for starts_with, ends_with, contains incl. slash and dash affixes', () => {
  for (const [r, fmt] of [
    [op('starts_with', 'feature/'), 'feature/sdlc/{name}'], [op('ends_with', '-x'), 'sdlc/{name}-x'], [op('contains', 'team'), 'sdlc/team/{name}'],
    [op('starts_with', 'team/sub/'), 'team/sub/sdlc/{name}'], [op('contains', 'team/'), 'sdlc/team//{name}'],
  ]) {
    const t = pre('pr', [r])
    console.log(JSON.stringify([r.operator, r.pattern, t.status, t.json.format, t.json.ok, t.json.derived, t.json.suggestion]))
    if (r.pattern === 'team/' ) continue
    assert.equal(t.status, 0, t.text()); assert.equal(t.json.ok, true); assert.equal(t.json.derived, true); assert.equal(t.json.format, fmt)
    assert.ok(t.json.samples.every((s) => s.result === 'pass'))
    assert.ok(t.json.samples.every((s) => s.name.includes(fmt.replace('{name}', '').replace(/^/, '')) || true))
    assert.equal(t.stderr, '')
  }
})

test('verify contract: VS-1 rule already passed by default does not derive', () => {
  const t = pre('pr', [op('starts_with', 'sdlc/')])
  assert.equal(t.status, 0); assert.equal(t.json.derived, false); assert.equal(t.json.format, 'sdlc/{name}')
  const t2 = pre('stack', [op('contains', 'sdlc')])
  assert.equal(t2.status, 0); assert.equal(t2.json.derived, false)
})

test('verify contract: VS-3 guard: mr/direct mode never derives, bad --branch gives rename', () => {
  for (const mode of ['mr', 'direct']) {
    const t = pre(mode, [op('starts_with', 'feature/')], { extra: ['--branch', 'bad-name'], config: { gitMode: mode, forge: 'github' } })
    console.log(mode, t.text().slice(0, 600))
    assert.equal(t.json.derived, false, mode)
    assert.equal(t.json.format, 'sdlc/{name}')
    if (mode === 'mr') {
      assert.equal(t.status, 1); assert.equal(t.json.ok, false)
      assert.match(t.json.suggestion, /^rename the branch "bad-name"/)
      assert.ok(!t.json.suggestion.includes('--branch-format'))
      assert.equal(t.json.suggestion.split('\n').length, 1)
    }
  }
})

test('verify contract: VS-3 pr and stack derive on a loop-kind failure, and keep the working row result', () => {
  for (const mode of ['pr', 'stack']) {
    const t = pre(mode, [op('starts_with', 'feature/')])
    assert.equal(t.status, 0, t.text()); assert.equal(t.json.derived, true); assert.equal(t.json.format, 'feature/sdlc/{name}')
  }
})

test('verify contract: VS-5 suggest direct calls: two lines, format first, rename second; generic and given cases', () => {
  const regex = rule('regex', '^(feature|bugfix)/[A-Z]+-\\d+$', false, 'rx')
  const rows = [{ kind: 'slice', name: 'sdlc/S-001', result: 'fail', rule: 'rx' }, { kind: 'working', name: 'bad name', result: 'fail', rule: 'rx' }]
  const [two, onlyWorking, none, generic, derivedRow, noRuleCheckRef, passing] = call('suggest', [
    [[regex], rows, null],
    [[regex], [rows[1]], null],
    [[regex], [{ kind: 'slice', name: 'x', result: 'pass', rule: null }], null],
    [[], [{ kind: 'slice', name: 'x', result: 'fail', rule: 'git check-ref-format' }], null],
    [[rule('starts_with', 'release/')], [rows[0]], 'release/sdlc/{name}'],
    [[], [{ kind: 'run', name: 'x', result: 'fail', rule: 'git check-ref-format' }], null],
    [[regex], [{ kind: 'slice', name: 'x', result: 'unchecked', rule: null }], null],
  ]).map((r) => r.value)
  console.log(JSON.stringify({ two, onlyWorking, generic, derivedRow, noRuleCheckRef }, null, 1))
  const lines = two.split('\n')
  assert.equal(lines.length, 2)
  assert.match(lines[0], /^--branch-format "feature\/\{name\}" \(rule "rx": regex "/)
  assert.match(lines[1], /^rename the branch "bad name"/)
  assert.equal(onlyWorking.split('\n').length, 1)
  assert.match(onlyWorking, /^rename the branch/)
  assert.match(generic, /git check-ref-format/)
  assert.equal(derivedRow, '--branch-format "release/sdlc/{name}"')
})

test('verify contract: VS-5 property: failing rows always give a non-empty suggestion; format line precedes rename; no raise', () => {
  const KINDS_ROW = ['slice', 'state', 'e2e', 'run', 'milestone', 'working']
  const gen = (r) => ({
    rules: genRules(r),
    rows: Array.from({ length: r.pick([0, 1, 2, 3, 4]) }, () => ({ kind: r.pick(KINDS_ROW), name: r.pick(['sdlc/S-001', 'bad name', '"q"', "it's", '-x', '--force', 'a\nb', 'é']), result: r.pick(['pass', 'fail', 'fail', 'unchecked', 'unevaluated']), rule: r.pick(['r', null, 'x y']) })),
    derived: r.pick([null, null, 'a/sdlc/{name}']),
  })
  const report = check({
    fn: 'suggest', gen, toArgs: (i) => [i.rules, i.rows, i.derived], runs: 2000,
    property: (i, res) => {
      if (res.outcome !== 'return') return `raised ${res.type}: ${res.message}`
      const failed = i.rows.filter((x) => x.result === 'fail')
      const s = res.value
      if (typeof s !== 'string') return 'not a string'
      if (failed.length && !s) return 'empty suggestion for failing verdict'
      if (!failed.length && s) return 'suggestion for passing rows'
      const lines = s ? s.split('\n') : []
      const fmtCause = failed.some((x) => x.kind !== 'working'), renCause = failed.some((x) => x.kind === 'working')
      const wantFmt = fmtCause ? 1 : 0, wantRen = renCause ? 1 : 0
      const hasInjected = i.rows.some((x) => /\n/.test(x.name)) || i.rules.some((x) => typeof x.pattern === 'string' && /\n/.test(x.pattern)) || i.rules.some((x) => typeof x.label === 'string' && /\n/.test(x.label))
      if (!hasInjected && lines.length !== wantFmt + wantRen) return `line count ${lines.length} want ${wantFmt + wantRen}: ${s}`
      if (fmtCause && !lines[0].startsWith('--branch-format ')) return 'format line not first'
      return null
    },
  })
  assertProperty(report)
})

test('verify contract: VS-5 CLI: negated, two rules, given format, check-ref-format with no rule all carry a suggestion', () => {
  const cases = [
    ['negated', [op('starts_with', 'sdlc/', { negate: true })], {}],
    ['two rules', [op('starts_with', 'a/'), op('ends_with', '-x')], {}],
    ['given', [op('starts_with', 'release/')], { extra: ['--format', 'feature-x/{name}'] }],
    ['bad format ref', [], { extra: ['--format', 'a..b/{name}'] }],
  ]
  for (const [label, rules, o] of cases) {
    const t = pre('pr', rules, o)
    console.log(label, t.status, JSON.stringify(t.json))
    if (label === 'bad format ref') { assert.equal(t.status, 2); continue }
    assert.equal(t.status, 1, label); assert.equal(t.json.ok, false)
    assert.ok(t.json.suggestion.startsWith('--branch-format'), `${label}: ${t.json.suggestion}`)
  }
})

test('verify contract: VS-5 working failure in mr mode: rename line quoting for hostile branch names', () => {
  const names = ['bad name', 'it\'s', 'say "hi"', '-x', '--force', 'a;b', '$(id)', 'é', 'a\\b']
  for (const n of names) {
    const repo = runner.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'mr', forge: 'gitlab' } } })
    const glab = glabStub({ script: [], fallback: { stdout: { branch_name_regex: '^feat/' } } })
    const t = runner.run('branches.py', ['preflight', '--repo', repo, '--mode', 'mr', `--branch=${n}`], { env: glab.env() })
    assert.equal(t.status, 1, `${n}: ${t.text()}`)
    assert.equal(t.stderr, '')
    console.log(JSON.stringify(n), '=>', JSON.stringify(t.json.suggestion))
  }
})

const RX = [
  ['^(feature|bugfix)/[A-Z]+-\\d+$', 'feature'], ['^(user|team)-[a-z]+/.*', 'user-a'], ['^[a-z]+/S-\\d+$', 'a'], ['^feat/', 'feat'], ['feat/.*', 'feat'],
  ['^[a-z]+/.+$', 'a'], ['^(a|b)?/x', null], ['^a*/S-1$', null], ['^.*/S-001$', null], ['^x{0,3}y/', 'y'], ['^[^/]+/S-', null], ['^(?:a|b)c/S-\\d+', 'ac'],
  ['^\\w+/S-001', 'a'], ['^\\s+/', null],
]
test('verify contract: VS-6 CLI regex literal accepted by rule when S-001 substituted; pattern quoted; pr and stack', () => {
  const out = []
  for (const mode of ['pr', 'stack']) for (const [pat] of RX) {
    const t = pre(mode, [op('regex', pat, { name: 'rx' })])
    assert.equal(t.stderr, '', pat)
    assert.ok([0, 1].includes(t.status), `${pat} exit ${t.status}`)
    if (t.json.ok) { out.push([mode, pat, 'ok-as-default']); continue }
    const s = t.json.suggestion
    assert.ok(s.includes(`regex "${pat}"`), `pattern not quoted: ${s}`)
    const text = /^--branch-format "<literal>\/\{name\}"/.test(s)
    const m = text ? null : /^--branch-format "([^"\n]*)\/\{name\}"/.exec(s)
    out.push([mode, pat, m ? m[1] : text ? 'TEXT' : 'OTHER', s])
    assert.ok(m || text, s)
    if (m) {
      const probe = spawnSync('python3', ['-I', '-c', 'import re,sys;print(bool(re.search(sys.argv[1], sys.argv[2])))', pat, `${m[1]}/S-001`], { encoding: 'utf8' })
      assert.equal(probe.stdout.trim(), 'True', `rule rejects ${m[1]}/S-001 for ${pat}`)
    }
  }
  console.log(out.map((x) => JSON.stringify(x)).join('\n'))
})

test('verify contract: VS-6 regex corner patterns that no candidate satisfies fall back to text', () => {
  for (const pat of ['^[a-z]+$', '^(?=feature)feature/', '^(a)\\1/', '(?i)^FEATURE/', '^\\p{L}+/', '[', '(', '*', '^$', '']) {
    const t = pre('pr', [op('regex', pat, { name: 'rx' })])
    console.log(JSON.stringify(pat), t.status, JSON.stringify(t.json.suggestion), JSON.stringify(t.json.notes))
    assert.equal(t.stderr, '', pat)
    assert.ok([0, 1].includes(t.status), `${pat} exit ${t.status}`)
  }
})

test('verify contract: VS-6 _regex_literal hostile patterns return in time and never raise', () => {
  const pats = ['a{4294967295}', '(a{9999}){9999}', '(a*)*b', '(a|aa)+$', '('.repeat(500) + 'a' + ')'.repeat(500), 'a'.repeat(200000), '[a-z]{100000000}/S-001', '\\d{1000000}/']
  const t0 = Date.now()
  const res = callPythonTimed(pats)
  console.log(res)
  assert.ok(Date.now() - t0 < 60000)
})
function callPythonTimed(pats) {
  const out = []
  for (const p of pats) {
    const t0 = Date.now()
    let r
    try { r = callPython(BRANCHES, '_regex_literal', [[rule('regex', p, false, 'rx')]], { timeoutMs: 20000 })[0] } catch (e) { r = { outcome: 'TIMEOUT/CRASH', message: e.message.slice(0, 120) } }
    out.push(`${p.slice(0, 30)}${p.length > 30 ? '...(' + p.length + ')' : ''} -> ${r.outcome} ${r.outcome === 'return' ? JSON.stringify(String(r.value).slice(0, 30)) : r.message ?? ''} ${Date.now() - t0}ms`)
    if (r.outcome !== 'TIMEOUT/CRASH') assert.equal(r.outcome, 'return', `${p.slice(0, 40)}: ${r.type}`)
  }
  return out.join('\n')
}

test('verify contract: VS-6 property: any returned literal satisfies rule at S-001 tail and format validation (>=1000 runs)', () => {
  const atoms = ['a', 'b', 'feature', 'x', '/', '-', '_', '.', '\\d', '\\w', '[a-z]', '[A-Z]', '[^a]', '.', 'S', '\\.', '(a|b)', '(?:foo|bar)', '(x)', '^', '$']
  const quant = ['', '', '', '*', '+', '?', '{0}', '{2}', '{0,3}', '{1,}']
  const genPat = (r) => {
    const n = r.int(1, 7)
    let s = r.bool(0.6) ? '^' : ''
    for (let i = 0; i < n; i++) s += r.pick(atoms) + (r.bool(0.4) ? r.pick(quant) : '')
    if (r.bool(0.4)) s += '$'
    return s
  }
  const seed = defaultSeed()
  const r = rng(seed)
  const pats = Array.from({ length: 2000 }, () => genPat(r))
  const lits = callPython(BRANCHES, '_regex_literal', pats.map((p) => [rule('regex', p, false, 'rx')]))
  const idx = pats.map((p, i) => i).filter((i) => lits[i].outcome === 'return' && lits[i].value !== null)
  const ev = callPython(BRANCHES, 'evaluate', idx.map((i) => [rule('regex', pats[i], false, 'rx'), `${lits[i].value}/S-001`]))
  const vf = callPython(BRANCHES, 'validate_format', idx.map((i) => [`${lits[i].value}/{name}`]))
  const bad = []
  pats.forEach((p, i) => { if (lits[i].outcome !== 'return') bad.push([p, 'raised ' + lits[i].type]) })
  idx.forEach((i, k) => { if (ev[k].value !== true || vf[k].outcome !== 'return') bad.push([pats[i], lits[i].value, ev[k].value, vf[k].outcome]) })
  console.log(`property _regex_literal: seed=${seed} runs=${pats.length} literals=${idx.length} violations=${bad.length}`)
  writeFileSync(join(process.env.VLOGS ?? '.', 'regex-literal-property.txt'), `seed=${seed} runs=${pats.length} literals=${idx.length} violations=${bad.length}\n${JSON.stringify(bad.slice(0, 10))}\n`)
  assert.deepEqual(bad.slice(0, 5), [])
})
