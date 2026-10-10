import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const BRANCH_SKILL = process.env.VERIFY_BRANCH_SKILL
const MAIN_SKILL = process.env.VERIFY_MAIN_SKILL
const SPEC = '# Spec\n'
const hash = createHash('sha256').update(SPEC).digest('hex')
const slice = (id, status = 'todo', extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', ...extra })
const pr = (head, extra = {}) => ({ number: 7, headRefName: head, url: 'https://x.test/' + head, mergeable: 'MERGEABLE', reviewDecision: '', statusCheckRollup: [], ...extra })

function build(r, { mode, fmt, slices, branches = [], current = 'main' }) {
  const cfg = { specPath: 'spec.md', specHash: hash, overridesSeen: 0, gitMode: mode, defaultBranch: 'main' }
  if (fmt !== 'absent') cfg.branchFormat = fmt
  const repo = r.gitRepo({ files: {
    'spec.md': SPEC,
    '.sdlc/config.json': JSON.stringify(cfg), '.sdlc/requirements.json': '[]', '.sdlc/slices.json': JSON.stringify(slices),
    '.sdlc/milestones.json': '[]', '.sdlc/DECISIONS.md': '# D\n',
  } })
  for (const b of branches) {
    r.git(repo, 'checkout', '-q', '-b', b.name)
    if (b.slices) writeFileSync(join(repo, '.sdlc/slices.json'), JSON.stringify(b.slices))
    r.git(repo, 'commit', '-q', '-a', '--allow-empty', '-m', b.name)
    r.git(repo, 'checkout', '-q', 'main')
  }
  if (current !== 'main') r.git(repo, 'checkout', '-q', current)
  return repo
}

const cases = []
for (const mode of ['pr', 'stack', 'direct']) {
  const heads = ['sdlc/S-1', 'sdlc/S-fix-M-1-1', 'sdlc/S-013a', 'sdlc/state-20260101', 'sdlc/state-abc', 'sdlc/state-', 'sdlc/M-1-e2e', 'sdlc/M-1', 'sdlc/M-2', 'sdlc/s-1', 'sdlc/S-9', 'sdlc/foo', 'feature/S-1', 'other', '']
  for (const h of heads) {
    for (const extra of [{}, { mergeable: 'CONFLICTING' }, { reviewDecision: 'REVIEW_REQUIRED' }]) {
      cases.push({ name: mode + ' open ' + JSON.stringify(h) + ' ' + JSON.stringify(extra), mode, prs: { open: [pr(h, extra)] }, slices: [slice('S-1', 'awaiting-merge', { pr: 'u' }), slice('S-fix-M-1-1', 'awaiting-merge'), slice('S-013a', 'awaiting-merge'), slice('S-2')] })
    }
    cases.push({ name: mode + ' merged ' + JSON.stringify(h), mode, prs: { merged: [pr(h)] }, slices: [slice('S-1', 'awaiting-merge', { pr: 'u' }), slice('S-fix-M-1-1', 'awaiting-merge'), slice('S-013a', 'awaiting-merge'), slice('S-2')] })
  }
  cases.push({ name: mode + ' mixed', mode, prs: { open: [pr('sdlc/state-20260101', { number: 1 }), pr('sdlc/M-1-e2e', { number: 2 }), pr('sdlc/M-3', { number: 3 }), pr('sdlc/S-1', { number: 4 })] }, slices: [slice('S-1', 'awaiting-merge'), slice('S-2')] })
  cases.push({ name: mode + ' active branch', mode, slices: [slice('S-1'), slice('S-2')], branches: [{ name: 'sdlc/S-1', slices: [slice('S-1', 'in_progress', { phase: 'implement' }), slice('S-2')] }, { name: 'sdlc/foo', slices: [slice('foo', 'in_progress')] }, { name: 'sdlc/state-1', slices: [slice('state-1', 'in_progress')] }, { name: 'other', slices: [slice('other', 'in_progress')] }] })
  cases.push({ name: mode + ' active branch checked out', mode, slices: [slice('S-1'), slice('S-2')], current: 'sdlc/S-2', branches: [{ name: 'sdlc/S-1', slices: [slice('S-1', 'in_progress')] }, { name: 'sdlc/S-2', slices: [slice('S-1'), slice('S-2', 'in_progress')] }] })
  cases.push({ name: mode + ' active branch with fix id', mode, slices: [slice('S-fix-M-1-1')], branches: [{ name: 'sdlc/S-fix-M-1-1', slices: [slice('S-fix-M-1-1', 'in_progress')] }] })
  cases.push({ name: mode + ' no branches no prs', mode, slices: [slice('S-1')] })
}

test('verify cli: default format decisions equal main for absent, empty and null branchFormat', () => {
  const diffs = []
  let n = 0
  for (const c of cases.filter(c => !process.env.VERIFY_ONLY || c.name.includes(process.env.VERIFY_ONLY))) {
    for (const fmt of ['absent', '', null]) {
      const r = cliRunner()
      const repo = build(r, { ...c, fmt })
      const args = ['--repo', repo]
      { const f = join(r.dir('prs'), 'prs.json'); writeFileSync(f, JSON.stringify({ open: [], merged: [], ...(c.prs ?? {}) })); args.push('--prs', f) }
      const a = r.run('next-action.py', args, { skillDir: MAIN_SKILL })
      const b = r.run('next-action.py', args, { skillDir: BRANCH_SKILL })
      n++
      const sa = a.status + '|' + a.stdout.replaceAll(repo, '<repo>'), sb = b.status + '|' + b.stdout.replaceAll(repo, '<repo>')
      if (sa !== sb) diffs.push({ case: c.name, fmt, main: sa.slice(0, 300), branch: sb.slice(0, 300), stderr: b.stderr.slice(0, 200) })
    }
  }
  console.log('compared', n, 'differences', diffs.length)
  if (diffs.length) console.log(JSON.stringify(diffs, null, 1))
  assert.equal(diffs.length, 0)
})

test('verify cli: a milestone branch carrying an in-progress entry is no longer read as a slice branch (intentional change)', () => {
  const r = cliRunner()
  const repo = build(r, { mode: 'direct', fmt: 'absent', slices: [slice('S-fix-M-1-1')], branches: [{ name: 'sdlc/S-fix-M-1-1', slices: [slice('S-fix-M-1-1', 'in_progress')] }, { name: 'sdlc/M-1', slices: [slice('M-1', 'in_progress')] }] })
  const f = join(r.dir('prs'), 'prs.json'); writeFileSync(f, '{"open":[],"merged":[]}')
  const b = r.run('next-action.py', ['--repo', repo, '--prs', f], { skillDir: BRANCH_SKILL })
  assert.equal(b.json.next.sliceId, 'S-fix-M-1-1')
  assert.equal(b.json.checkout, 'sdlc/S-fix-M-1-1')
})
