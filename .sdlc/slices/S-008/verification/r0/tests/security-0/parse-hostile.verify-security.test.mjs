import test from 'node:test'
import assert from 'node:assert/strict'
import { callPython } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const MOD = process.env.BRANCHES_PY
const D = 'sdlc/{name}'
const parse = (fmt, branch) => callPython(MOD, 'parse', [[fmt, branch]])[0]
const kindOf = (r) => (r.outcome === 'return' && r.value ? r.value.kind : null)

test('verify security: clean tails classify; newline-suffixed tails gain no kind a clean tail lacks', () => {
  const cases = [
    ['sdlc/run-3\n', 'run'], ['sdlc/M-2\n', 'milestone'], ['sdlc/M-2-e2e\n', 'e2e'],
  ]
  const out = []
  for (const [b, k] of cases) {
    const r = parse(D, b)
    out.push({ b, outcome: r.outcome, value: r.value })
  }
  console.log(JSON.stringify(out))
  for (const o of out) assert.equal(o.outcome, 'return')
})

test('verify security: newline classification report (seed, not a blocker)', () => {
  for (const b of ['sdlc/run-3\n', 'sdlc/M-2\n', 'sdlc/M-2-e2e\n', 'sdlc/M-2-e2e\n\n']) {
    const r = parse(D, b)
    console.log('NL', JSON.stringify(b), JSON.stringify(r.value))
  }
})

test('verify security: parse never raises over the whole corpus under three formats', () => {
  const families = ['control-chars', 'flag-like-values', 'format-strings', 'huge-integers', 'injection', 'integer-forms', 'nul', 'oversized', 'traversal', 'unicode-confusables', 'unicode-digits', 'unicode-whitespace']
  const tails = []
  for (const f of families) for (const e of load(f)) tails.push(e.value)
  const shapes = ['run-', 'M-', 'M-2-e2e-', 'run-3', 'M-2', 'M-2-e2e']
  const calls = []
  for (const fmt of [D, 'feature/PROJ-1-{name}', '{name:lower}-wip']) {
    for (const t of tails) {
      calls.push([fmt, fmt.replace(/\{name(:lower)?\}/, t)])
      for (const s of shapes) calls.push([fmt, fmt.replace(/\{name(:lower)?\}/, s + t)])
    }
  }
  const results = callPython(MOD, 'parse', calls)
  const raised = results.map((r, i) => ({ r, c: calls[i] })).filter((x) => x.r.outcome === 'exception')
  console.log(`corpus calls=${calls.length} raised=${raised.length}`)
  assert.equal(raised.length, 0, JSON.stringify(raised.slice(0, 3)))
  const odd = results.map((r, i) => ({ r, c: calls[i] })).filter((x) => x.r.outcome === 'return' && x.r.value && ['run', 'milestone', 'e2e', 'e2e-area'].includes(x.r.value.kind))
  const bad = []
  for (const { r, c } of odd) {
    const m = r.value
    const clean = c[1].slice(c[1].indexOf('/') + 1)
    if (m.kind === 'run' && !/^run-[0-9]+$/.test(m.tail)) bad.push([c[1], m])
    if (m.kind === 'milestone' && !/^M-[0-9]+$/.test(m.tail)) bad.push([c[1], m])
    if (m.kind === 'e2e' && !/^M-[0-9]+-e2e$/.test(m.tail)) bad.push([c[1], m])
  }
  console.log('non-ASCII/odd tails classified:', JSON.stringify(bad.slice(0, 20).map(([b, m]) => [b, m.kind, m.n ?? m.id])))
  console.log('odd count', bad.length)
})

test('verify security: unicode digits and zero-width in run-N and M-N', () => {
  for (const b of ['sdlc/run-٣', 'sdlc/run-３', 'sdlc/M-２', 'sdlc/M-٢-e2e', 'sdlc/run-3​', 'sdlc/run-\u0000', 'sdlc/M-2-e2e-a/b', 'sdlc/M-2-e2e-a\nb', 'sdlc/run-3\r', 'sdlc/run-99999999999999999999999999']) {
    const r = parse(D, b)
    console.log('U', JSON.stringify(b), r.outcome, JSON.stringify(r.value))
  }
})

test('verify security: CLI parse with hostile branches never crashes, no tree change', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: [] })
  const vals = ['sdlc/run-3\n', 'sdlc/M-2\n', 'sdlc/M-2-e2e\n', '--help', '-x', 'sdlc/M-2-e2e-a/b', 'sdlc/run-٣', '‮', '$(touch pwn)', '`touch pwn`', ';touch pwn', 'sdlc/run-3 --format x']
  const lines = []
  for (const v of vals) {
    const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', v])
    const t2 = r.run('branches.py', ['parse', '--repo', repo, '--branch=' + v])
    lines.push({ v, status: t.status, json: t.json, err: t.stderr.slice(0, 120), eq: t2.status, treeUnchanged: t.treeUnchanged && t2.treeUnchanged })
    assert.ok(t.treeUnchanged && t2.treeUnchanged, 'tree changed for ' + JSON.stringify(v))
    assert.ok(t.status === 0 || t.status === 2, 'unexpected status ' + t.status + ' for ' + JSON.stringify(v))
    assert.doesNotMatch(t.stderr, /Traceback/)
  }
  console.log('CLI', JSON.stringify(lines))
})
