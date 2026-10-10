import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const COMMON = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/prompts/_common.md'
const text = readFileSync(COMMON, 'utf8')
const rows = Object.fromEntries(
  text.split('\n').filter((l) => /^\s*\| `</.test(l)).map((l) => {
    const c = l.split('|').map((s) => s.trim())
    return [c[1].replace(/`/g, ''), c[2]]
  }),
)
const PLACEHOLDERS = ['<run branch>', '<slice branch>', '<milestone branch>', '<e2e branch>', '<e2e area branch>', '<state branch>', '<attempt branch>', '<verify branch>']
const SAMPLE = { '<sliceId>': 'S-025', '<milestoneId>': 'M-1', '<areaId>': 'api', '<n>': '2' }

function commandArgs(cell) {
  const m = cell.match(/`branches\.py (name [^`]*)`/)
  if (!m) return null
  return m[1].split(/\s+/).map((a) => SAMPLE[a] ?? a)
}
function repoWith(r, format, branches = []) {
  return r.gitRepo({ files: { '.sdlc/config.json': format ? { branchFormat: format } : {} }, branches })
}

test('verify cli: table has eight placeholders and each holds a command or source', () => {
  assert.deepEqual(Object.keys(rows), PLACEHOLDERS)
  for (const p of PLACEHOLDERS) assert.ok(rows[p].length > 3, p)
})

for (const p of PLACEHOLDERS.filter((x) => !['<run branch>', '<verify branch>'].includes(x))) {
  test(`verify cli: ${p} command runs and prints a formatted name`, () => {
    const r = cliRunner()
    const repo = repoWith(r, 'feature/{name}')
    const args = commandArgs(rows[p])
    assert.ok(args, rows[p])
    const t = r.run('branches.py', [...args.slice(0, 1), '--repo', repo, ...args.slice(1)])
    assert.equal(t.status, 0, t.text())
    assert.equal(t.json.ok, true)
    assert.match(t.json.branch, /^feature\//)
    assert.equal(t.treeUnchanged, true)
    if (p === '<slice branch>') assert.equal(t.json.branch, 'feature/S-025')
  })
}

test('verify cli: slice command with default format gives sdlc/ prefix', () => {
  const r = cliRunner()
  const t = r.run('branches.py', ['name', '--repo', repoWith(r, null), '--kind', 'slice', '--id', 'S-025'])
  assert.equal(t.status, 0)
  assert.equal(t.json.branch, 'sdlc/S-025')
})

test('verify cli: slice command without --id fails with an error and non-zero exit', () => {
  const r = cliRunner()
  const t = r.run('branches.py', ['name', '--repo', repoWith(r, null), '--kind', 'slice'])
  assert.notEqual(t.status, 0)
  assert.doesNotMatch(t.stdout, /"branch"/)
})

test('verify cli: e2e-area without --area fails', () => {
  const r = cliRunner()
  const t = r.run('branches.py', ['name', '--repo', repoWith(r, null), '--kind', 'e2e-area', '--id', 'M-1'])
  assert.notEqual(t.status, 0)
})

test('verify cli: run row names list --kind run and last entry', () => {
  assert.match(rows['<run branch>'], /config\.runBranch/)
  assert.match(rows['<run branch>'], /stack/)
  assert.match(rows['<run branch>'], /branches\.py list --kind run/)
  assert.match(rows['<run branch>'], /last entry/)
})

test('verify cli: list --kind run last entry is the newest, numeric order', () => {
  const r = cliRunner()
  const repo = repoWith(r, null, ['sdlc/run-1', 'sdlc/run-2', 'sdlc/run-10', 'sdlc/S-3', 'other/run-99'])
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run'])
  assert.equal(t.status, 0, t.text())
  const names = Object.values(t.json).find(Array.isArray).map((e) => e.branch)
  assert.deepEqual(names, ['sdlc/run-1', 'sdlc/run-2', 'sdlc/run-10'])
  assert.equal(names[names.length - 1], 'sdlc/run-10')
})

test('verify cli: list --kind run with custom format and with none', () => {
  const r = cliRunner()
  const repo = repoWith(r, 'feature/{name}', ['feature/run-4', 'sdlc/run-9'])
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run'])
  assert.equal(t.status, 0, t.text())
  assert.deepEqual(Object.values(t.json).find(Array.isArray).map((e) => e.branch), ['feature/run-4'])
  const none = r.run('branches.py', ['list', '--repo', repoWith(r, null, [], 'none'), '--kind', 'run'])
  assert.equal(none.status, 0, none.text())
  assert.deepEqual(Object.values(none.json).find(Array.isArray), [])
})

test('verify cli: parse row text and loop vs foreign branch', () => {
  assert.match(text, /branches\.py parse --repo \. --branch <name>/)
  assert.match(text, /`null`/)
  const r = cliRunner()
  const repo = repoWith(r, 'feature/{name}', ['feature/S-025', 'sdlc/S-025', 'dev', 'feature/run-2'])
  const loop = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'feature/S-025'])
  assert.equal(loop.status, 0)
  assert.equal(loop.json.kind ?? loop.json.parsed?.kind, 'slice', loop.stdout)
  for (const b of ['sdlc/S-025', 'dev', 'main']) {
    const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', b])
    assert.equal(t.status, 0, t.text())
    assert.equal(t.json.kind, null, b)
  }
})

const hostile = ['flag-like-values', 'traversal', 'control-chars', 'unicode-confusables', 'unicode-whitespace', 'injection', 'oversized', 'format-strings']
for (const fam of hostile) {
  test(`verify cli: parse of ${fam} names neither crashes nor claims a loop kind`, () => {
    const r = cliRunner()
    const repo = repoWith(r, 'feature/{name}', ['feature/S-1'])
    for (const e of load(fam, { argv: true })) {
      const t = r.run('branches.py', ['parse', '--repo', repo, `--branch=${e.value}`])
      assert.equal(t.spawnError ?? null, null, e.id)
      assert.ok(t.status === 0 || t.status === 2, `${e.id} status ${t.status} ${t.stderr.slice(0, 200)}`)
      assert.doesNotMatch(t.stderr, /Traceback/, e.id)
      if (t.status === 0) assert.equal(t.json?.kind, null, `${e.id} ${JSON.stringify(e.value).slice(0, 60)} -> ${t.stdout.slice(0, 120)}`)
    }
  })
}

test('verify cli: parse with NUL argument cannot reach the process', () => {
  const r = cliRunner()
  const repo = repoWith(r, null)
  const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/S-1\0x'])
  assert.equal(t.status, null)
  assert.ok(t.spawnError)
})
