import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const SKILL = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc'
const LEDGER = [{ id: 'S-001', status: 'done' }, { id: 'S-002', status: 'in_progress' }]
const BR = ['sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-001-v0-http-api-0', 'sdlc/S-002-v0-cli-0', 'feature/PROJ-1-S-002-v0-cli-0', 'sdlc/S-009-v0-x-0', 'feature/PROJ-1-run-1', 'sdlc/run-1', 'feature/PROJ-1-M-1']
const heads = (r, repo) => r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').sort()

function sweep(config, { rawConfig } = {}) {
  const r = cliRunner()
  const files = { '.sdlc/slices.json': LEDGER }
  if (config !== undefined) files['.sdlc/config.json'] = config
  const repo = r.gitRepo({ files, branches: BR })
  if (rawConfig !== undefined) { writeFileSync(`${repo}/.sdlc/config.json`, rawConfig) }
  const before = heads(r, repo)
  const t = r.run('janitor.py', ['--repo', repo, '--days', '36500'])
  const after = heads(r, repo)
  return { t, before, after, gone: before.filter((b) => !after.includes(b)), out: t.json }
}

test('verify cli: VS-7 janitor reads no sdlc/ literal outside prose and calls load_format', () => {
  const src = readFileSync(`${SKILL}/janitor.py`, 'utf8')
  assert.ok(src.includes('branches.load_format(repo)'))
  const code = src.replace(/"""[\s\S]*?"""/g, '').split('\n').filter((l) => !l.trim().startsWith('#'))
  assert.deepEqual(code.filter((l) => /(^|[^.])sdlc\//.test(l) && !/slices\.json/.test(l)), [])
})

test('verify cli: VS-7 custom format sweeps feature/ branch only', () => {
  const s = sweep({ branchFormat: 'feature/PROJ-1-{name}' })
  assert.equal(s.t.status, 0)
  assert.deepEqual(s.gone.sort(), ['feature/PROJ-1-S-001-v0-http-api-0', 'feature/PROJ-1-S-009-v0-x-0'].filter((b) => s.before.includes(b)))
})

const REPORTED = [
  ['no placeholder', 'feature/fixed'],
  ['unbalanced open', 'feature/{name'],
  ['unbalanced close', 'feature/name}'],
  ['two placeholders', '{name}/{name}'],
  ['unknown placeholder', 'x/{id}'],
]
const SILENT = [
  ['extra braces', 'a{b}/{name}'],
  ['git-unsafe space', 'feat ure/{name}'],
  ['git-unsafe tilde', 'feature~/{name}'],
  ['git-unsafe colon', 'f:x/{name}'],
  ['double dot', 'a..b/{name}'],
  ['leading dash', '-x/{name}'],
  ['lock suffix', '{name}.lock'],
]
for (const [label, fmt] of REPORTED) {
  test(`verify cli: VS-7 malformed format (${label}) deletes no branch and reports`, () => {
    const s = sweep({ branchFormat: fmt })
    assert.equal(s.t.status, 0)
    assert.deepEqual(s.gone, [], `deleted ${s.gone}`)
    assert.ok(s.out.notes.some((n) => /format/.test(n)), JSON.stringify(s.out))
  })
}
for (const [label, fmt] of SILENT) {
  test(`verify cli: VS-7 git-unsafe or odd format (${label}) deletes no branch`, () => {
    const s = sweep({ branchFormat: fmt })
    assert.equal(s.t.status, 0)
    assert.deepEqual(s.gone, [], `deleted ${s.gone}`)
  })
}

test('verify cli: VS-7 non-string branchFormat counts as absent and sweeps under sdlc/{name}', () => {
  for (const v of [123, ['feature/{name}'], { a: 1 }, true]) {
    const s = sweep({ branchFormat: v })
    assert.deepEqual(s.gone.sort(), ['sdlc/S-001-v0-http-api-0', 'sdlc/S-009-v0-x-0'], `value ${JSON.stringify(v)}`)
  }
})

test('verify cli: VS-7 invalid JSON config deletes no branch and reports', () => {
  const s = sweep(undefined, { rawConfig: '{not json' })
  assert.equal(s.t.status, 0)
  assert.deepEqual(s.gone, [])
  assert.ok(s.out.notes.length > 0)
})
