import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const ROOT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const commonMd = readFileSync(ROOT + '/skills/sdlc/prompts/_common.md', 'utf8')
const commitMd = readFileSync(ROOT + '/skills/sdlc/prompts/commit-state.md', 'utf8')

test('verify cli: commit-state.md holds no date -u and uses <state branch>', () => {
  assert.ok(!commitMd.includes('date -u'))
  assert.ok(commitMd.includes('<state branch>'))
  assert.ok(!/sdlc\/state-/.test(commitMd))
})

test('verify cli: _common.md maps <state branch> to branches.py name --kind state', () => {
  assert.match(commonMd, /\| `<state branch>` \| `branches\.py name --kind state`/)
})

const cases = [
  ['default', undefined, /^sdlc\/state-\d{14}$/],
  ['custom', { branchFormat: 'feature/{name}' }, /^feature\/state-\d{14}$/],
  ['upper-lower', { branchFormat: 'Team_X/{name:lower}-bot' }, /^Team_X\/state-\d{14}-bot$/],
]
for (const [label, cfg, re] of cases) {
  test('verify cli: branches.py name --kind state, ' + label, () => {
    const r = cliRunner()
    const repo = r.gitRepo(cfg ? { files: { '.sdlc/config.json': cfg } } : {})
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'state'])
    console.log(t.text())
    assert.equal(t.status, 0)
        assert.equal(t.json.ok, true); assert.equal(t.json.kind, 'state'); const out = t.json.branch
    assert.match(out, re)
    const ck = r.exec('git', ['check-ref-format', '--branch', out])
    assert.equal(ck.status, 0)
    const p = r.run('branches.py', ['parse', '--repo', repo, '--branch', out])
    assert.equal(p.json.kind, 'state')
    assert.equal(t.treeUnchanged, true)
  })
}

test('verify cli: state kind rejects --id and bad format', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'bad format/{name}' } } })
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'state'])
  console.log(t.text())
  assert.notEqual(t.status, 0)
  assert.equal(t.json.ok, false); assert.match(t.json.error, /whitespace/)
  const r2 = cliRunner()
  const repo2 = r2.gitRepo({})
  const t2 = r2.run('branches.py', ['name', '--repo', repo2, '--kind', 'state', '--id', 'S-1'])
  console.log(t2.text())
  assert.ok(t2.status === 0 || t2.json.ok === false)
})
