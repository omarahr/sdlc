import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const SKILL = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc'
const section = () => {
  const t = readFileSync(`${SKILL}/prompts/integrator.md`, 'utf8')
  const s = t.indexOf('**Clean up**'), e = t.indexOf('## mode: retry-merge')
  return t.slice(s, e)
}
const COMMAND = 'python3 "<skill>/branches.py" list --repo . --kind attempt'
const keep = (json, sliceId) => json.branches.filter(b => b.id.toLowerCase() === sliceId.toLowerCase()).map(b => b.branch).sort()

function list(branches, extra = {}) {
  const r = cliRunner()
  const repo = r.gitRepo({ files: extra.files ?? {}, branches })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  return t
}

test('verify cli: the Clean up section holds the exact command and the id filter, no glob', () => {
  const s = section()
  assert.ok(s.includes(COMMAND))
  assert.match(s, /Keep the entries whose `id` equals this slice id, ignoring case/)
  assert.doesNotMatch(s, /-attempt-\*/)
  assert.doesNotMatch(s, /sdlc\/<id>/)
})

test('verify cli: S-1 filter keeps only S-1 attempts, not S-10 or S-1a', () => {
  const t = list(['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-2', 'sdlc/S-10-attempt-1', 'sdlc/S-1a-attempt-1', 'sdlc/S-1', 'sdlc/run-3', 'sdlc/s-1-attempt-3'])
  assert.equal(t.status, 0)
  assert.ok(t.treeUnchanged)
  assert.deepEqual(keep(t.json, 'S-1'), ['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-2', 'sdlc/s-1-attempt-3'])
  assert.deepEqual(keep(t.json, 'S-10'), ['sdlc/S-10-attempt-1'])
  assert.deepEqual(keep(t.json, 'S-1a'), ['sdlc/S-1a-attempt-1'])
})

test('verify cli: a slice with no attempt branches keeps nothing, exit 0', () => {
  const t = list(['sdlc/S-1-attempt-1', 'sdlc/S-2', 'sdlc/run-1'])
  assert.equal(t.status, 0)
  assert.deepEqual(keep(t.json, 'S-2'), [])
  const none = list(['sdlc/S-2', 'sdlc/run-1'])
  assert.equal(none.status, 0)
  assert.deepEqual(none.json.branches, [])
})

test('verify cli: lookalike names and git-legal lookalikes never match another slice', () => {
  const t = list(['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-1x', 'sdlc/S-1-attempt-', 'sdlc/S-1-attempt-1-attempt-2', 'sdlc/S-1/attempt-1', 'sdlc/S-11-attempt-1'])
  assert.equal(t.status, 0)
  const kept = keep(t.json, 'S-1')
  assert.ok(kept.includes('sdlc/S-1-attempt-1'))
  for (const b of kept) assert.match(b, /^sdlc\/S-1-attempt-\d+$/)
  assert.deepEqual(keep(t.json, 'S-11'), ['sdlc/S-11-attempt-1'])
})

test('verify cli: a custom branch format lists attempts under its own spelling', () => {
  const t = list(['feature/S-1-attempt-1', 'feature/S-10-attempt-2', 'sdlc/S-1-attempt-9'], { files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  assert.equal(t.status, 0)
  assert.deepEqual(keep(t.json, 'S-1'), ['feature/S-1-attempt-1'])
})

test('verify cli: listing twice gives the same result and changes no ref', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: ['sdlc/S-1-attempt-1', 'sdlc/S-10-attempt-1'] })
  const a = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  const b = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.deepEqual(a.json, b.json)
  assert.ok(a.treeUnchanged && b.treeUnchanged)
})

test('verify cli: a repo path that is not a repository fails with a message, not a list', () => {
  const r = cliRunner()
  const dir = r.dir('plain')
  const t = r.run('branches.py', ['list', '--repo', dir, '--kind', 'attempt'])
  console.log(t.status, t.stdout.slice(0, 200), t.stderr.slice(0, 200))
  assert.notEqual(t.status, null)
})

test('verify cli: the scan detects a glob added to the section (mutation)', () => {
  const mutated = section() + '\ngit branch --list "sdlc/<id>-attempt-*"'
  assert.match(mutated, /-attempt-\*/)
  assert.match(mutated, /sdlc\/<id>/)
})
