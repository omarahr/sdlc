import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const SKILL = process.env.VERIFY_SKILL_DIR
const transcripts = []

function setup(r, configText, dep = false) {
  const files = {
    'src/app.txt': 'v1\n',
    '.sdlc/slices.json': [
      { id: 'S-000', title: 'dep', requirements: [], dependsOn: [], status: dep ? 'awaiting-merge' : 'done', phase: 'integrate' },
      { id: 'S-001', title: 't', requirements: [], dependsOn: dep ? ['S-000'] : [], status: 'todo', phase: 'plan' },
    ],
    '.sdlc/milestones.json': [{ id: 'M-1', title: 'm', slices: ['S-001'], status: 'pending' }],
    '.sdlc/requirements.json': [],
  }
  const repo = r.gitRepo({ files })
  r.writeFiles(repo, { '.sdlc/config.json': configText })
  r.git(repo, 'add', '-A')
  r.git(repo, 'commit', '-q', '-m', 'state')
  r.git(repo, 'branch', 'sdlc/run-1')
  const bare = r.dir('bare')
  r.git(bare, 'init', '-q', '--bare', '-b', 'main')
  r.git(repo, 'remote', 'add', 'origin', bare)
  r.git(repo, 'push', '-q', 'origin', 'main', 'sdlc/run-1')
  return repo
}

const configOf = (extra) => ({ specPath: 'spec.md', gitMode: 'stack', defaultBranch: 'main', commitFormat: '', runBranch: 'sdlc/run-1', ...extra })

function attempt(id, extra, { raw, expect }) {
  for (const [cmd, dep] of [['patch-slice', false], ['base-branch', false], ['base-branch-dependency', true]]) {
    test(`verify cli: ${id} ${cmd}`, () => {
      const r = cliRunner({ skillDir: SKILL })
      const repo = setup(r, raw ?? configOf(extra), dep)
      if (dep) r.git(repo, 'branch', 'sdlc/S-000')
      const args = [cmd.replace('-dependency', ''), '--repo', repo, '--slice', 'S-001']
      const t = r.run('state-write.py', args, { input: cmd === 'patch-slice' ? '{"notes":"x"}' : '' })
      transcripts.push({ id: `${id} ${cmd}`, argv: t.argv ?? args, status: t.status, stdout: t.stdout, stderr: t.stderr, unchanged: t.treeUnchanged, diff: t.tree[repo].diff })
      if (expect === 'git-unsafe') {
        assert.ok(!/Traceback/.test(t.stderr + t.stdout), t.text())
        if (cmd === 'patch-slice') {
          assert.equal(t.status, 2, t.text())
          assert.equal(t.json.ok, false)
          const d = t.tree[repo].diff
          const moved = [...d.added, ...d.changed, ...d.removed].filter((x) => !['ref:HEAD', 'ref:refs/remotes/origin/HEAD'].includes(x))
          assert.deepEqual(moved, [], t.text())
        } else {
          assert.equal(t.status, 0, t.text())
          assert.ok(t.treeUnchanged)
        }
        return
      }
      if (expect === 'preexisting-crash') {
        assert.ok(t.treeUnchanged)
        assert.equal(t.status, 1, t.text())
        assert.match(t.stderr, /AttributeError/)
        return
      }
      assert.ok(!/Traceback/.test(t.stderr + t.stdout), t.text())
      if (expect === 'refuse') {
        assert.equal(t.status, 2, t.text())
        assert.equal(t.json.ok, false, t.text())
        assert.equal(typeof t.json.error, 'string')
        assert.ok(t.treeUnchanged, JSON.stringify(t.tree[repo].diff))
      } else {
        assert.equal(t.status, 0, t.text())
        if (cmd === 'patch-slice') assert.equal(t.json.branch, 'sdlc/S-001', t.text())
        if (cmd === 'base-branch') assert.equal(t.json.branch, 'sdlc/M-1', t.text())
        if (cmd === 'base-branch-dependency') assert.equal(t.json.branch, 'sdlc/S-000', t.text())
      }
    })
  }
}

attempt('no placeholder', { branchFormat: 'feature/PROJ-1' }, { expect: 'refuse' })
attempt('two placeholders', { branchFormat: 'feature/{name}/{name}' }, { expect: 'refuse' })
attempt('mixed placeholders', { branchFormat: '{name}-{name:lower}' }, { expect: 'refuse' })
attempt('unknown placeholder', { branchFormat: 'feature/{id}' }, { expect: 'refuse' })
attempt('git-unsafe dotdot', { branchFormat: 'feature/..{name}' }, { expect: 'git-unsafe' })
attempt('git-unsafe lock suffix', { branchFormat: 'feature/{name}.lock' }, { expect: 'git-unsafe' })
attempt('git-unsafe space', { branchFormat: 'feat ure/{name}' }, { expect: 'git-unsafe' })
attempt('git-unsafe tilde', { branchFormat: 'feature~/{name}' }, { expect: 'git-unsafe' })
attempt('git-unsafe leading dash', { branchFormat: '-{name}' }, { expect: 'git-unsafe' })
attempt('broken config file', null, { raw: '{not json', expect: 'refuse' })
attempt('config is a list', null, { raw: '[]', expect: 'preexisting-crash' })
attempt('non-string number', { branchFormat: 5 }, { expect: 'ok' })
attempt('non-string list', { branchFormat: ['a'] }, { expect: 'ok' })
attempt('empty string', { branchFormat: '' }, { expect: 'ok' })

test.after(() => {
  const out = process.env.VERIFY_LOG
  if (out) writeFileSync(out, JSON.stringify(transcripts, null, 2))
})
