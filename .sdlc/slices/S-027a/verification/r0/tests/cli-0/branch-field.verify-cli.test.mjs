import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const REPO = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const KIT = `${REPO}/skills/sdlc/test/testkit`
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { load, families } = await import(`${KIT}/attack-corpus.mjs`)

const r = cliRunner({ skillDir: process.env.VERIFY_SKILL_DIR || `${REPO}/skills/sdlc` })

const slice = (id, over = {}) => ({
  id, title: `slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan',
  branch: `sdlc/${id}`, pr: '', risk: 'medium', riskReason: 'x', seeds: [], ideaKeys: [], notes: '',
  counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, verifyDemanded: false, infraRetries: 0, gateCommit: '' },
  ...over,
})
const base = () => [slice('S-001', { status: 'done', phase: 'done' }), slice('S-002', { status: 'in_progress', phase: 'tests' }), slice('S-003', { dependsOn: ['S-002'] })]

const strip = v => Array.isArray(v) ? v.map(strip)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'branch' && k !== 'commit').map(([k, x]) => [k, strip(x)]))
  : typeof v === 'string' ? v.replace(/\b[0-9a-f]{7,40}\b/g, '<sha>') : v

function observe(apply) {
  const slices = base().map(s => apply(s))
  const repo = r.gitRepo({ files: {
    'spec.md': '# Spec\n',
    '.sdlc/config.json': { specPath: 'spec.md', specHash: createHash('sha256').update('# Spec\n').digest('hex'), overridesSeen: 0, gitMode: 'direct', defaultBranch: 'main', runBranch: '', commitFormat: '', branchFormat: 'sdlc/{name}' },
    '.sdlc/requirements.json': REQS, '.sdlc/slices.json': slices, '.sdlc/milestones.json': [], '.sdlc/DECISIONS.md': '# Decisions\n',
  } })
  const out = {}
  const call = (name, script, args, input) => {
    const t = r.run(script, args, { cwd: repo, input })
    out[name] = { status: t.status, stdout: strip(t.json ?? t.stdout), stderr: strip(t.stderr) }
    return t
  }
  call('next', 'next-action.py', ['--repo', repo])
  call('status', 'state-write.py', ['status', '--repo', repo])
  call('base', 'state-write.py', ['base-branch', '--repo', repo, '--slice', 'S-003'])
  call('patch', 'state-write.py', ['patch-slice', '--repo', repo, '--slice', 'S-002'], JSON.stringify({ phase: 'implement' }))
  call('janitor', 'janitor.py', ['--repo', repo, '--days', '36500'])
  out.state = strip(JSON.parse(readFileSync(join(repo, '.sdlc/slices.json'), 'utf8')))
  out.status_md = existsSync(join(repo, '.sdlc/STATUS.md')) ? readFileSync(join(repo, '.sdlc/STATUS.md'), 'utf8').replace(/Updated: .*/, 'Updated: <t>').replace(/^- \S+ /gm, '- <ts> ') : null
  return out
}

const REQS = [{ id: 'R-001', specRef: '§1', quote: 'q', acceptance: 'a', status: 'todo', flags: [], adrs: [], evidence: { files: [], tests: [], commit: '' }, notes: '' }]
const original = observe(s => s)

const variants = [
  ['removed', s => { const c = { ...s }; delete c.branch; return c }],
  ['null', s => ({ ...s, branch: null })],
  ['number', s => ({ ...s, branch: 42 })],
  ['bool', s => ({ ...s, branch: true })],
  ['list', s => ({ ...s, branch: ['sdlc/x', 1] })],
  ['object', s => ({ ...s, branch: { a: { b: 1 } } })],
  ['empty', s => ({ ...s, branch: '' })],
  ['newline', s => ({ ...s, branch: 'sdlc/S-1\nmain\r\n' })],
  ['traversal', s => ({ ...s, branch: '../../../etc/passwd' })],
  ['main', s => ({ ...s, branch: 'main' })],
  ['other-slice', s => ({ ...s, branch: 'sdlc/S-001' })],
  ['huge', s => ({ ...s, branch: 'x'.repeat(2_000_000) })],
  ['flaglike', s => ({ ...s, branch: '--delete' })],
  ...families().flatMap(f => load(f).slice(0, 2).map(e => [`corpus-${e.id}`, s => ({ ...s, branch: e.value })])),
]

test('verify cli: baseline scripts all exit 0 on the original', () => {
  for (const k of ['next', 'status', 'base', 'patch', 'janitor']) assert.equal(original[k].status, 0, `${k}: ${JSON.stringify(original[k])}`)
})

for (const [name, apply] of variants) {
  test(`verify cli: slice branch value ${name} changes no script output or state`, () => {
    assert.deepEqual(observe(apply), original)
  })
}

test('verify cli: a hostile branch on only one slice changes nothing', () => {
  assert.deepEqual(observe(s => s.id === 'S-002' ? { ...s, branch: 'refs/heads/\u0000;rm -rf /' } : s), original)
})

test('verify cli: baseline outputs are substantive', () => {
  console.log(JSON.stringify({ next: original.next.stdout, base: original.base.stdout, patch: original.patch.stdout, janitor: original.janitor.stdout }).slice(0, 900))
  assert.ok(original.next.stdout.next.action)
  assert.ok(original.state.length === 3)
})
