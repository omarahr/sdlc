import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { callPython } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const MODULE = process.env.VERIFY_STATE_WRITE ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/state-write.py'
const r = cliRunner()
const side = (repo, fmt, id) => callPython(MODULE, 'slice_side_branches', [[repo, fmt, id]])[0]
const repoWith = (names) => r.gitRepo({ files: { '.sdlc/config.json': {} }, branches: names })
const OK = (res) => res.outcome === 'return' || res.outcome === 'Fail'

const DEFAULT = 'sdlc/{name}'
const NAMES = [
  'sdlc/S-001', 'sdlc/S-001-v0-security-0', 'sdlc/S-001-v1-http-api-2', 'sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-12',
  'sdlc/S-0011-v0-cli-0', 'sdlc/S-0011-attempt-1', 'sdlc/S-010-attempt-3', 'sdlc/S-010-v0-cli-0',
  'other/S-001-attempt-1', 'sdlc/S-001-attempt-', 'sdlc/S-001-attemptX-1', 'sdlc/S-001-v-cli-0', 'sdlc/S-001-v0-CLI-0',
  'sdlc/S-001-attempt-1-attempt-2', 'xsdlc/S-001-attempt-1', 'sdlc/S‑001-attempt-1', 'sdlc/S-١-attempt-1',
]

test('verify security: only verify and attempt tails of S-001, sorted', () => {
  const repo = repoWith(NAMES)
  const res = side(repo, DEFAULT, 'S-001')
  assert.equal(res.outcome, 'return')
  assert.deepEqual(res.value, ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-12', 'sdlc/S-001-v0-security-0', 'sdlc/S-001-v1-http-api-2'])
})

test('verify security: S-0011 and S-010 do not leak into S-001, and S-001 not into S-0011', () => {
  const repo = repoWith(NAMES)
  assert.deepEqual(side(repo, DEFAULT, 'S-0011').value, ['sdlc/S-0011-attempt-1', 'sdlc/S-0011-v0-cli-0'])
  assert.deepEqual(side(repo, DEFAULT, 'S-010').value, ['sdlc/S-010-attempt-3', 'sdlc/S-010-v0-cli-0'])
})

test('verify security: custom format with prefix and suffix', () => {
  const fmt = 'feature/PROJ-1-{name}-wip'
  const repo = repoWith(['feature/PROJ-1-S-001-wip', 'feature/PROJ-1-S-001-attempt-2-wip', 'feature/PROJ-1-S-001-v0-cli-0-wip', 'feature/PROJ-1-S-001-attempt-2', 'feature/PROJ-1-S-002-attempt-2-wip', 'sdlc/S-001-attempt-2'])
  assert.deepEqual(side(repo, fmt, 'S-001').value, ['feature/PROJ-1-S-001-attempt-2-wip', 'feature/PROJ-1-S-001-v0-cli-0-wip'])
})

test('verify security: lowercase format matches case-insensitively, case-sensitive format does not', () => {
  const lower = 'f/{name:lower}'
  const repo = repoWith(['f/s-001-attempt-1', 'f/S-001-attempt-3', 'f/s-002-attempt-1'])
  assert.deepEqual(side(repo, lower, 'S-001').value, ['f/S-001-attempt-3', 'f/s-001-attempt-1'])
  const upper = side(repo, 'f/{name}', 'S-001')
  assert.deepEqual(upper.value, ['f/S-001-attempt-3'])
})

test('verify security: hostile slice ids never raise an uncaught exception and match nothing unrelated', () => {
  const repo = repoWith(NAMES)
  const bad = []
  const entries = ['unicode-digits', 'unicode-confusables', 'flag-like-values', 'traversal', 'injection', 'control-chars', 'nul', 'format-strings', 'oversized', 'unicode-whitespace', 'integer-forms', 'huge-integers']
    .flatMap((f) => load(f)).filter((e) => !/[\ud800-\udfff]/.test(e.value))
  const results = callPython(MODULE, 'slice_side_branches', entries.map((e) => [repo, DEFAULT, e.value]))
  entries.forEach((e, i) => {
    const res = results[i]
    if (!OK(res)) bad.push(`${e.id}: raised ${res.type}: ${res.message}`)
    else if (res.outcome === 'return' && res.value.length && e.value !== 'S-001' && e.value !== 'S-0011' && e.value !== 'S-010') {
      bad.push(`${e.id}: ${JSON.stringify(e.value).slice(0, 40)} matched ${JSON.stringify(res.value)}`)
    }
  })
  assert.deepEqual(bad, [])
  assert.ok(entries.length > 50, `corpus entries used: ${entries.length}`)
})

test('verify security: slice id with regex metacharacters matches only itself', () => {
  const repo = repoWith(['sdlc/S-a.b-attempt-1', 'sdlc/S-aXb-attempt-1', 'sdlc/S-001-attempt-1'])
  assert.deepEqual(side(repo, DEFAULT, 'S-a.b').value, ['sdlc/S-a.b-attempt-1'])
  assert.deepEqual(side(repo, DEFAULT, 'S-.*').value, [])
  assert.deepEqual(side(repo, DEFAULT, '.*').value, [])
  assert.deepEqual(side(repo, DEFAULT, '').value, [])
})

test('verify security: refusals have no side effect on the repo', () => {
  const repo = repoWith(NAMES)
  const t = r.exec('python3', ['-I', '-c', `import importlib.util,sys;s=importlib.util.spec_from_file_location('sw',${JSON.stringify(MODULE)});m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.slice_side_branches(sys.argv[1],'sdlc/{name}','../../etc'))`, repo], { cwd: repo })
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.treeUnchanged, true)
})

test('verify security: invalid format and non-repo give a clean Fail', () => {
  const repo = repoWith(NAMES)
  const res = callPython(MODULE, 'slice_side_branches', [[repo, 'no-placeholder', 'S-001'], [repo, '{name}{name}', 'S-001'], [repo, '../{name}', 'S-001'], ['/nonexistent-dir-xyz', DEFAULT, 'S-001']])
  for (const x of res) assert.ok(OK(x), `${x.type}: ${x.message}`)
})
