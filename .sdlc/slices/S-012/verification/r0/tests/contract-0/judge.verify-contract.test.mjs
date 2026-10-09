import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const KIT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit'
const { callPython, check, assertProperty, rng, defaultSeed, checkLoadFormat, arb } = await import(`${KIT}/property.mjs`)
const { load } = await import(`${KIT}/attack-corpus.mjs`)

const WT = process.env.VERIFY_WT
const MODULE = join(WT, 'skills/sdlc/branches.py')
const MAIN_MODULE = process.env.VERIFY_MAIN_MODULE
const SEED = defaultSeed()

const call = (fn, calls, module = MODULE) => callPython(module, fn, calls)
const judge = (rules, sample) => {
  const [r] = call('judge', [[rules, sample]])
  assert.equal(r.outcome, 'return', JSON.stringify(r))
  return r.value
}
const rule = (kind, pattern, label, negate) => ({ kind, pattern, label, ...(negate === undefined ? {} : { negate }) })
const gitRefusal = (ref) => {
  const r = spawnSync('git', ['check-ref-format', '--branch', ref], { encoding: 'utf8' })
  return r.status !== 0
}

test('verify contract: surface lists judge, ref_format_error, regex_error, evaluate', () => {
  const r = spawnSync('python3', ['-I', '-c', `
import importlib.util,inspect
s=importlib.util.spec_from_file_location("b","${MODULE}");m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
for n in ("judge","ref_format_error","regex_error","evaluate","validate_format"):
    print(n, inspect.signature(getattr(m,n)))
`], { encoding: 'utf8', cwd: '/' })
  console.log(r.stdout)
  assert.match(r.stdout, /judge \(rules, sample\)/)
  assert.match(r.stdout, /ref_format_error \(ref\)/)
})

test('verify contract: VS-1 bad patterns never raise and note equals regex_error', () => {
  const bad = ['(', '[a-', '*', 'a{2,1}', '(?P<', '(?P<n>', '\\', '(?<=a*)b', '(?i', '+', '?', 'a**', '\\1', '(?P=x)']
  for (const negate of [true, false, undefined]) for (const p of bad) {
    const v = judge([rule('regex', p, 'push rule', negate)], 'sdlc/S-001')
    const [re] = call('regex_error', [[p]])
    assert.equal(re.outcome, 'return')
    assert.ok(re.value, `pattern ${p.slice(0, 20)} should be bad`)
    assert.equal(v.result, 'unevaluated', p.slice(0, 20))
    assert.equal(v.rule, null)
    assert.deepEqual(v.notes, [`cannot evaluate push rule: ${re.value}`])
  }
})
test('verify contract: VS-1 bad pattern beside passing rule is unevaluated; unknown kind note', () => {
  const v = judge([rule('starts_with', 'sdlc/', 'a'), rule('regex', '(', 'b')], 'sdlc/S-001')
  assert.equal(v.result, 'unevaluated')
  const u = judge([rule('glob', 'x', 'g1')], 'sdlc/S-001')
  assert.deepEqual(u, { result: 'unevaluated', rule: null, notes: ['cannot evaluate g1: unknown kind glob'] })
  const u2 = judge([{ pattern: 'x', label: 'g2' }], 'sdlc/S-001')
  assert.equal(u2.result, 'unevaluated')
  console.log('missing kind note', JSON.stringify(u2.notes))
})
test('verify contract: VS-1 catastrophic pattern finishes', () => {
  const t = Date.now()
  const v = judge([rule('regex', '(a+)+$', 'cat')], 'sdlc/' + 'a'.repeat(22) + '!')
  console.log('catastrophic ms', Date.now() - t, JSON.stringify(v))
  assert.ok(v.result)
})

test('verify contract: VS-2 combination examples', () => {
  const T = (l) => rule('starts_with', 'sdlc/', l)
  const F = (l) => rule('starts_with', 'zzz/', l)
  const N = (l) => rule('regex', '(', l)
  const s = 'sdlc/S-001'
  assert.deepEqual(judge([T('a'), F('b'), T('c')], s), { result: 'fail', rule: 'b', notes: [] })
  assert.equal(judge([F('x'), F('y')], s).rule, 'x')
  assert.deepEqual(judge([T('a'), T('b'), T('c')], s), { result: 'pass', rule: null, notes: [] })
  assert.deepEqual(judge([], s), { result: 'pass', rule: null, notes: [] })
  assert.equal(judge([T('a'), N('n')], s).result, 'unevaluated')
  const nf = judge([N('n'), F('f')], s)
  assert.equal(nf.result, 'fail'); assert.equal(nf.rule, 'f')
  assert.equal(judge([rule('starts_with', 'sdlc/', 'm', true)], s).result, 'fail')
  assert.equal(judge([rule('starts_with', 'zzz/', 'm', true)], s).result, 'pass')
  assert.equal(judge([rule('regex', '(', 'm', true)], s).result, 'unevaluated')
  assert.deepEqual(Object.keys(judge([], s)).sort(), ['notes', 'result', 'rule'])
  console.log('missing-label first failing rule then labelled one ->', JSON.stringify(judge([{ kind: 'starts_with', pattern: 'zzz/' }, F('b')], s)))
  assert.equal(judge([F('d'), F('d')], s).rule, 'd')
})

const KINDS = ['starts_with', 'ends_with', 'contains', 'regex']
const SAMPLES = ['sdlc/S-001', 'feature/PROJ-1-x', 'a/b', 'sdlc/S-001-attempt-2', 'x.y/z', 'run-3', 'é/ß']
const PATS = ['sdlc/', 'feature/', '-001', 'S-', 'x', '', 'é', '^sdlc', 'S-\\d+$', '(', '[a-', '^feature/.*-x$']
function modelRule(r, s) {
  let res
  if (r.kind === 'starts_with') res = s.startsWith(r.pattern)
  else if (r.kind === 'ends_with') res = s.endsWith(r.pattern)
  else if (r.kind === 'contains') res = s.includes(r.pattern)
  else {
    if (['(', '[a-'].includes(r.pattern)) return null
    res = new RegExp(r.pattern, 'u').test(s)
  }
  return r.negate ? !res : res
}
function modelJudge(rules, s) {
  const outs = rules.map((r) => modelRule(r, s))
  const failIdx = outs.indexOf(false)
  const ref = gitRefusal(s)
  if (failIdx >= 0) return { result: 'fail', rule: rules[failIdx].label }
  if (ref) return { result: 'fail', rule: 'git check-ref-format' }
  if (outs.includes(null)) return { result: 'unevaluated', rule: null }
  return { result: 'pass', rule: null }
}
test('verify contract: VS-2/VS-4 property judge vs reference model (1500 runs)', () => {
  const r = rng(SEED)
  const inputs = Array.from({ length: 1500 }, () => {
    const n = r.int(0, 5)
    const rules = Array.from({ length: n }, (_, i) => ({ kind: r.pick(KINDS), pattern: r.pick(PATS), label: r.bool(0.1) ? 'dup' : `L${i}`, negate: r.bool(0.3) }))
    return { rules, sample: r.bool(0.15) ? r.pick(['bad..name', 'a~b', 'x.lock', '/lead', 'a b', 'sdlc/']) : r.pick(SAMPLES) }
  })
  const out = call('judge', inputs.map((i) => [i.rules, i.sample]))
  const bad = []
  inputs.forEach((i, k) => {
    const o = out[k]
    const m = modelJudge(i.rules, i.sample)
    if (o.outcome !== 'return' || o.value.result !== m.result || o.value.rule !== m.rule || JSON.stringify(Object.keys(o.value).sort()) !== '["notes","result","rule"]') bad.push({ i, o, m })
  })
  console.log(`property-run judge seed=${SEED} runs=1500 violations=${bad.length}`)
  if (bad.length) console.log(JSON.stringify(bad.slice(0, 3)))
  assert.equal(bad.length, 0)
})
test('verify contract: judge does not mutate rules and is deterministic', () => {
  const rules = [rule('regex', '(', 'a'), rule('starts_with', 'zz', 'b')]
  const before = JSON.stringify(rules)
  const [a, b] = call('judge', [[rules, 'sdlc/S-001'], [rules, 'sdlc/S-001']])
  assert.deepEqual(a.value, b.value)
  assert.equal(JSON.stringify(rules), before)
})

const INVALID = ['bad..name', 'a~b', 'a^b', 'a:b', 'a?b', 'a*b', 'a[b', 'a\\b', '/lead', 'x.lock', 'trail/', 'trail.', '', 'a b', 'a\x01b', 'a\x7fb', '-lead', 'a@{b', '.hidden', 'a//b', 'a/.b', 'a.lock/b']
const VALID = ['sdlc/S-001', 'feature/PROJ-1-sdlc-foo', 'é/ß', 'a.b/c', '😀/x']
test('verify contract: VS-3 invalid refs fail with git rule, valid pass', () => {
  for (const s of INVALID) {
    const v = judge([], s)
    assert.equal(v.result, 'fail', JSON.stringify(s))
    assert.equal(v.rule, 'git check-ref-format', JSON.stringify(s))
    const [e] = call('ref_format_error', [[s]])
    assert.ok(e.outcome === 'return' && typeof e.value === 'string' && e.value.length > 0, JSON.stringify([s, e]))
  }
  for (const s of VALID) {
    assert.equal(judge([], s).result, 'pass', s)
    const [e] = call('ref_format_error', [[s]])
    assert.equal(e.value, null)
  }
})
test('verify contract: VS-3 @{-1}, NUL, non-string, flag-like never raise a traceback', () => {
  const odd = ['@{-1}', '@{-1}/x', '\u0000', 'a\u0000b', '\ud800', 'a\ud800', null, 5, [], {}, true, 1.5]
  const res = call('ref_format_error', odd.map((s) => [s]))
  const jres = call('judge', odd.map((s) => [[], s]))
  odd.forEach((s, i) => console.log('odd', JSON.stringify(s), 'ref_format_error', res[i].outcome, res[i].type ?? '', JSON.stringify(res[i].value ?? res[i].message)?.slice(0, 80), '| judge', jres[i].outcome, jres[i].type ?? '', JSON.stringify(jres[i].value ?? jres[i].message)?.slice(0, 80)))
  for (const [i, s] of odd.entries()) {
    if (typeof s !== 'string') continue
    assert.ok(['return', 'Fail'].includes(res[i].outcome), `ref_format_error ${JSON.stringify(s)}: ${res[i].type} ${res[i].message}`)
    assert.ok(['return', 'Fail'].includes(jres[i].outcome), `judge ${JSON.stringify(s)}: ${jres[i].type} ${jres[i].message}`)
  }
  assert.equal(res[0].outcome, 'return')
})
test('verify contract: VS-3 flag-like samples are not read as git options', () => {
  for (const s of ['--help', '-h', '--', '-1', '--format=x', '-x/y', '--stdin']) {
    const v = judge([], s)
    assert.equal(v.result, 'fail', s)
    assert.equal(v.rule, 'git check-ref-format', s)
  }
})
test('verify contract: VS-3 attack corpus never raises', () => {
  const fams = ['control-chars', 'flag-like-values', 'format-strings', 'injection', 'oversized', 'traversal', 'unicode-confusables', 'unicode-whitespace']
  const vals = fams.flatMap((f) => load(f, { argv: true }).map((e) => e.value)).filter((v) => typeof v === 'string')
  const out = call('judge', vals.map((v) => [[], v]))
  const bad = out.map((o, i) => [o, vals[i]]).filter(([o]) => o.outcome !== 'return')
  console.log(`corpus samples=${vals.length} non-return=${bad.length}`, JSON.stringify(bad.slice(0, 3)).slice(0, 400))
  const wrong = out.map((o, i) => [o, vals[i]]).filter(([o, v]) => o.outcome === 'return' && (o.value.result === 'pass') === gitRefusal(v))
  console.log('judge disagrees with git oracle on', wrong.length)
  assert.equal(bad.length, 0)
  assert.equal(wrong.length, 0)
})
test('verify contract: VS-3 property ref_format_error matches git oracle (1000 runs)', () => {
  const pieces = ['a', 'b', '/', '.', '..', '~', '^', ':', '?', '*', '[', '\\', ' ', '.lock', '@', '@{', '-', '\t', 'é', '\u0001', '\u007f', '//', 'S-001', 'sdlc']
  const r = rng(SEED)
  const inputs = Array.from({ length: 1000 }, () => Array.from({ length: r.int(0, 5) }, () => r.pick(pieces)).join(''))
  const out = call('ref_format_error', inputs.map((s) => [s]))
  const bad = inputs.map((s, i) => [s, out[i]]).filter(([s, o]) => {
    if (o.outcome !== 'return') return true
    const refused = gitRefusal(s)
    return refused ? !(typeof o.value === 'string' && o.value.length) : o.value !== null
  })
  console.log(`property-run ref_format_error seed=${SEED} runs=1000 violations=${bad.length}`, JSON.stringify(bad.slice(0, 3)))
  assert.equal(bad.length, 0)
})
test('verify contract: VS-3 no cwd or repo dependence', () => {
  const dirs = ['/', '/var/empty', process.env.TMPDIR]
  for (const cwd of dirs) {
    const out = callPython(MODULE, 'judge', [[[], 'sdlc/S-001'], [[], 'bad..name']], { cwd })
    assert.equal(out[0].value.result, 'pass'); assert.equal(out[1].value.rule, 'git check-ref-format')
  }
})

test('verify contract: VS-4 forge label wins over git ref check', () => {
  assert.equal(judge([rule('starts_with', 'feature/', 'forge')], 'bad..name').rule, 'forge')
  assert.equal(judge([rule('starts_with', 'bad', 'forge')], 'bad..name').rule, 'git check-ref-format')
  assert.deepEqual(judge([rule('regex', '(', 'r')], 'bad..name').result, 'fail')
  assert.equal(judge([rule('regex', '(', 'r')], 'bad..name').rule, 'git check-ref-format')
  assert.equal(judge([], 'bad..name').rule, 'git check-ref-format')
})

test('verify contract: VS-5 validate_format equals main on messages and Fail', () => {
  const fmts = ['sdlc/{name}', 'feature/{name}', '{name}', 'x/{name:lower}', 'a..b/{name}', 'a~/{name}', '/{name}', '{name}.lock', 'a b/{name}', 'a{/{name}', '-x/{name}', '@/{name}', '', 'é/{name}', 'a:{name}', '{name}/', 'x/{name}/y', 'x/{name}.']
  const a = call('validate_format', fmts.map((f) => [f]))
  const b = call('validate_format', fmts.map((f) => [f]), MAIN_MODULE)
  fmts.forEach((f, i) => assert.deepEqual([a[i].outcome, a[i].value, a[i].message], [b[i].outcome, b[i].value, b[i].message], JSON.stringify(f)))
})
test('verify contract: VS-5 property validate_format has no new exception (1000 runs) and equals main', () => {
  const rep = check({ fn: 'validate_format', gen: arb.format, runs: 1000, seed: SEED })
  assertProperty(rep)
  const inputs = rep.cases.map((c) => [c.input])
  const b = call('validate_format', inputs, MAIN_MODULE)
  const diff = rep.cases.filter((c, i) => c.result.outcome !== b[i].outcome || c.result.message !== b[i].message || JSON.stringify(c.result.value) !== JSON.stringify(b[i].value))
  console.log(`property-run validate_format vs main seed=${SEED} runs=1000 diffs=${diff.length}`, JSON.stringify(diff.slice(0, 2)).slice(0, 500))
  assert.equal(diff.length, 0)
})
test('verify contract: VS-5 git missing from PATH', () => {
  const run = (modulePath) => spawnSync('/usr/bin/env', ['-i', 'PATH=/nonexistent', 'PYTHONUTF8=1', '/usr/bin/python3', '-I', '-c', `
import importlib.util
s=importlib.util.spec_from_file_location("b","${modulePath}");m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def t(f,*a):
    try: print(repr(f(*a)))
    except m.Fail as e: print("Fail:",e)
    except BaseException as e: print("EXC",type(e).__name__,e)
t(m.validate_format,"sdlc/{name}")
t(m.ref_format_error,"sdlc/S-001")
if hasattr(m,"judge"): t(m.judge,[],"sdlc/S-001")
`], { encoding: 'utf8', cwd: '/' }).stdout
  const a = run(MODULE), b = run(MAIN_MODULE)
  console.log('PR branch:\n' + a + 'main:\n' + b)
  assert.equal(a.split('\n')[0], b.split('\n')[0])
  assert.match(a, /^Fail: cannot check the branch format/)
  assert.doesNotMatch(a, /EXC/)
})
test('verify contract: determinism and no forbidden imports', () => {
  const src = readFileSync(MODULE, 'utf8')
  const imports = [...src.matchAll(/^(?:import|from)\s+(\S+)/gm)].map((m) => m[1])
  console.log('imports', imports.join(','))
  const main = readFileSync(MAIN_MODULE, 'utf8')
  const mainImports = [...main.matchAll(/^(?:import|from)\s+(\S+)/gm)].map((m) => m[1])
  assert.deepEqual(imports, mainImports)
})

test('verify contract: VS-1 deeply nested pattern that re.compile rejects never raises out of judge', () => {
  const cases = { open2000: '('.repeat(2000), balanced1000: '('.repeat(1000) + 'a' + ')'.repeat(1000), balanced300: '('.repeat(300) + 'a' + ')'.repeat(300) }
  const out = call('judge', Object.values(cases).map((p) => [[rule('regex', p, 'deep')], 'sdlc/S-001']))
  const py = spawnSync('python3', ['-I', '-c', 'import re,sys\nfor n in (2000,1000,300):\n    try: re.compile("("*n+"a"+")"*n); print(n,"ok")\n    except BaseException as e: print(n,type(e).__name__)'], { encoding: 'utf8' }).stdout
  console.log('re.compile on nested', py.replace(/\n/g, ' '), 'python', spawnSync('python3', ['-V'], { encoding: 'utf8' }).stdout.trim())
  Object.keys(cases).forEach((k, i) => console.log('deep', k, out[i].outcome, out[i].type ?? '', JSON.stringify(out[i].value ?? out[i].message)))
  Object.keys(cases).forEach((k, i) => assert.equal(out[i].outcome, 'return', `${k}: ${out[i].type} ${out[i].message}`))
})
