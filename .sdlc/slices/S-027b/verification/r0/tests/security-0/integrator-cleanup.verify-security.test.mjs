import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const { cliRunner } = await import(`${ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { load } = await import(`${ROOT}/skills/sdlc/test/testkit/attack-corpus.mjs`)

const SLICE = 'S-001'

function listAttempts(r, repo) {
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.equal(t.status, 0, t.stderr)
  return t.json.branches
}

function cleanup(r, repo, slice) {
  const kept = listAttempts(r, repo).filter((e) => e.id.toLowerCase() === slice.toLowerCase())
  for (const e of kept) {
    const d = r.exec('git', ['branch', '-D', e.branch], { cwd: repo })
    assert.equal(d.status, 0, d.stderr)
  }
  return kept.map((e) => e.branch)
}

function branches(repo) {
  const o = spawnSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], { cwd: repo, encoding: 'utf8' })
  return o.stdout.split('\n').filter(Boolean).sort()
}

const survivors = [
  'sdlc/S-002-attempt-1', 'sdlc/S-0010-attempt-1', 'sdlc/S-001a-attempt-1', 'sdlc/S-001-v0', 'sdlc/S-001-v0-security-0',
  'sdlc/S-001', 'sdlc/run-3', 'user/S-001-attempt-1', 'sdlc/S-001-attempt-1-attempt-2', 'sdlc/S-001-attempt-3-extra',
  'sdlc/S-001-attempt-1-v0-x', 'sdlc/S-001-attempt-', 'sdlc/S-001-attempt-x', 'feature/S-001-attempt-1', 'S-001-attempt-1', 'sdlc/S-0001-attempt-1',
]

test('verify security: other slices, non-attempt and foreign branches survive the cleanup', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: [...survivors, 'sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2'] })
  const deleted = cleanup(r, repo, SLICE)
  assert.deepEqual(deleted, ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2'])
  const left = branches(repo)
  for (const s of survivors) assert.ok(left.includes(s), `${s} was deleted`)
})

test('verify security: hostile branch names of other slices survive and never run a shell', () => {
  const r = cliRunner()
  const entries = [...load('injection'), ...load('flag-like-values'), ...load('format-strings'), ...load('unicode-confusables'), ...load('traversal')]
  const repo = r.gitRepo({})
  const made = []
  for (const e of entries) {
    const name = `sdlc/${e.value}-attempt-1`
    const c = spawnSync('git', ['branch', name], { cwd: repo, encoding: 'utf8' })
    if (c.status === 0) made.push(name)
  }
  spawnSync('git', ['branch', 'sdlc/S-001-attempt-1'], { cwd: repo })
  assert.ok(made.length > 5, `only ${made.length} hostile names made`)
  const deleted = cleanup(r, repo, SLICE)
  assert.deepEqual(deleted, ['sdlc/S-001-attempt-1'])
  const left = branches(repo)
  for (const n of made) assert.ok(left.includes(n), `${JSON.stringify(n)} was deleted`)
  assert.equal(existsSync(join(repo, 'pwned')), false)
})

test('verify security: the listed branch names are inert JSON data even for hostile ids', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/$(touch${IFS}pwned)-attempt-1', 'sdlc/x;touch${IFS}pwned-attempt-2', 'sdlc/`touch${IFS}pwned`-attempt-3'] })
  const list = listAttempts(r, repo)
  assert.equal(list.length, 3)
  assert.equal(cleanup(r, repo, SLICE).length, 0)
  assert.equal(branches(repo).length, 4)
  assert.equal(existsSync(join(repo, 'pwned')), false)
})

test('verify security: delete with the listed name as one argument and a leading dash cannot become a flag', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: '{name}' } }, branches: ['S-001-attempt-1', 'main2'] })
  const list = listAttempts(r, repo)
  assert.deepEqual(list.map((e) => e.branch), ['S-001-attempt-1'])
  assert.equal(r.exec('git', ['check-ref-format', '--branch', '-D'], { cwd: repo }).status !== 0, true)
  assert.equal(cleanup(r, repo, SLICE).length, 1)
  assert.ok(branches(repo).includes('main2'))
})

test('verify security: unicode lookalike ids are not the slice under lower-casing', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/\u017f-001-attempt-1', 'sdlc/S\u2010001-attempt-1', 'sdlc/\u212a-001-attempt-1'] })
  const list = listAttempts(r, repo)
  assert.equal(list.length, 3)
  assert.deepEqual(cleanup(r, repo, SLICE), [])
  assert.equal(branches(repo).length, 4)
  const upper = list.filter((e) => e.id.toUpperCase() === SLICE.toUpperCase()).map((e) => e.branch)
  assert.deepEqual(upper, ['sdlc/\u017f-001-attempt-1'])
})

test('verify security: arabic-indic digit attempt number still belongs to the same slice only', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-001-attempt-١', 'sdlc/S-002-attempt-١'] })
  const deleted = cleanup(r, repo, SLICE)
  assert.deepEqual(deleted, ['sdlc/S-001-attempt-١'])
  assert.ok(branches(repo).includes('sdlc/S-002-attempt-١'))
})
