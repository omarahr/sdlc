import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { callPython } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const MOD = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py'
const rx = (pattern, negate = false, label = 'r') => ({ kind: 'regex', pattern, label, negate })
const one = (fn, args) => callPython(MOD, fn, [args])[0]

test('verify security: uncompilable patterns give unevaluated and never raise', () => {
  for (const p of ['(', '[a-', '*', 'a{2,1}', '(?P<', '\\']) {
    for (const neg of [false, true]) {
      const r = one('judge', [[rx(p, neg, 'ruleset 7')], 'sdlc/S-001'])
      assert.equal(r.outcome, 'return', p)
      assert.equal(r.value.result, 'unevaluated')
      assert.match(r.value.notes[0], /^cannot evaluate ruleset 7: /)
    }
  }
})

test('verify security: a bad pattern beside a passing rule does not block', () => {
  const r = one('judge', [[{ kind: 'starts_with', pattern: 'sdlc/', label: 'a' }, rx('(')], 'sdlc/S-001'])
  assert.equal(r.value.result, 'unevaluated')
})

test('verify security: deeply nested balanced pattern does not raise (R-035 never blocks)', () => {
  const p = '('.repeat(900) + ')'.repeat(900)
  const r = one('judge', [[rx(p, false, 'deep')], 'sdlc/S-001'])
  assert.equal(r.outcome, 'return', `${r.type}: ${r.message}`)
})

test('verify security: unbalanced deep nesting does not raise', () => {
  const r = one('judge', [[rx('('.repeat(5000), false, 'deep')], 'sdlc/S-001'])
  assert.equal(r.outcome, 'return', `${r.type}: ${r.message}`)
})

test('verify security: every invalid ref fails with git check-ref-format and a valid one passes', () => {
  const bad = ['bad..name', 'a~b', 'a^b', 'a:b', 'a?b', 'a*b', 'a[b', 'a\\b', '/lead', 'x.lock', 'a/', 'a.', '', 'a b', 'a\u0001b', '-x', '--help', '-', '@{-1}']
  for (const s of bad) {
    const r = one('judge', [[], s])
    assert.equal(r.outcome, 'return', JSON.stringify(s))
    assert.deepEqual([r.value.result, r.value.rule], ['fail', 'git check-ref-format'], JSON.stringify(s))
  }
  for (const s of ['sdlc/S-001', 'feature/PROJ-1-sdlc-foo']) assert.equal(one('judge', [[], s]).value.result, 'pass')
})

test('verify security: NUL and surrogate samples give Fail or a verdict, not a traceback', () => {
  for (const s of ['a\u0000b', '\ud800']) {
    const r = one('judge', [[], s])
    assert.ok(['return', 'Fail'].includes(r.outcome), `${r.type}: ${r.message}`)
  }
})

test('verify security: attack corpus samples never produce an exception outcome', () => {
  const bad = []
  for (const fam of ['flag-like-values', 'injection', 'traversal', 'unicode-confusables', 'unicode-whitespace', 'control-chars', 'format-strings']) {
    for (const e of load(fam, { argv: true })) {
      const r = one('judge', [[], e.value])
      if (!['return', 'Fail'].includes(r.outcome)) bad.push(`${fam}/${e.id}: ${r.type}`)
      if (r.outcome === 'return' && r.value.result === 'pass' && /^-/.test(e.value)) bad.push(`${fam}/${e.id}: leading dash passed`)
    }
  }
  assert.deepEqual(bad, [])
})

test('verify security: a flag-like sample is never read as a git option', () => {
  for (const s of ['--help', '-h', '--version', '--branch', '-x']) {
    const r = one('ref_format_error', [s])
    assert.equal(r.outcome, 'return')
    assert.match(String(r.value), /not a valid branch name/)
  }
})

test('verify security: with git off the PATH the call raises Fail and writes nothing', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vsec-'))
  const code = `import importlib.util,sys;s=importlib.util.spec_from_file_location("b","${MOD}");m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
try: m.judge([],"sdlc/S-001");print("returned")
except m.Fail as e: print("Fail")
except BaseException as e: print("other",type(e).__name__)`
  const r = spawnSync('/opt/homebrew/bin/python3', ['-I', '-c', code], { cwd, env: { PATH: '/nonexistent' }, encoding: 'utf8' })
  assert.equal(r.stdout.trim(), 'Fail')
  assert.deepEqual(readdirSync(cwd), [])
})

test('verify security SEED out-of-scope: the verdict does not depend on repo state for @{-1}', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vsec-repo-'))
  const g = (...a) => spawnSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=a', ...a], { cwd: dir, encoding: 'utf8' })
  g('init', '-q', '-b', 'main'); g('commit', '-q', '--allow-empty', '-m', 'i'); g('checkout', '-q', '-b', 'f1'); g('checkout', '-q', 'main')
  const r = callPython(MOD, 'judge', [[[], '@{-1}']], { cwd: dir })[0]
  assert.equal(r.value.result, 'fail')
})

test('verify security SEED out-of-scope: sample "@" is refused', () => {
  assert.equal(one('judge', [[], '@']).value.result, 'fail')
})

test('verify security: a repetition count too large for re gives unevaluated, not OverflowError (R-035 never blocks)', () => {
  for (const p of ['a{4294967296}', 'a{99999999999999999999}', 'a{0,4294967296}', '(ab){4294967296}']) {
    for (const neg of [false, true]) {
      const r = one('judge', [[rx(p, neg, 'big')], 'sdlc/S-001'])
      assert.equal(r.outcome, 'return', `${p}: ${r.type}: ${r.message}`)
      assert.equal(r.value.result, 'unevaluated', p)
      assert.match(r.value.notes[0], /^cannot evaluate big: /)
    }
  }
})

test('verify security: regex_error and evaluate do not raise on an oversized repetition', () => {
  for (const fn of [['regex_error', ['a{4294967296}']], ['evaluate', [rx('a{4294967296}'), 'sdlc/S-001']]]) {
    const r = one(fn[0], fn[1])
    assert.equal(r.outcome, 'return', `${fn[0]}: ${r.type}: ${r.message}`)
  }
})

test('verify security: very deep nesting stays unevaluated after the r1 fix', () => {
  for (const p of ['('.repeat(900) + ')'.repeat(900), '('.repeat(5000), '('.repeat(100000) + ')'.repeat(100000), '(?:'.repeat(3000) + 'a' + ')'.repeat(3000)]) {
    for (const neg of [false, true]) {
      const r = one('judge', [[rx(p, neg, 'deep')], 'sdlc/S-001'])
      assert.equal(r.outcome, 'return', `${r.type}: ${r.message}`)
      assert.equal(r.value.result, 'unevaluated')
      assert.match(r.value.notes[0], /^cannot evaluate deep: /)
    }
  }
})

test('verify security: a bad rule with no label does not take the label of the git check', () => {
  const r = one('judge', [[{ kind: 'starts_with', pattern: 'feature/' }], 'bad..name'])
  assert.equal(r.outcome, 'return')
  assert.equal(r.value.result, 'fail')
  assert.equal(r.value.rule, null)
})
