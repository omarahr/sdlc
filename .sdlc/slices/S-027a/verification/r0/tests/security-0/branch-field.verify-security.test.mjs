import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = process.env.VERIFY_REPO || '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const SKILL = join(REPO, 'skills/sdlc')
const KIT = join(SKILL, 'test/testkit/attack-corpus.mjs')
const { all } = await import(KIT)

const slice = (id, over = {}) => ({
  id, title: `slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan',
  branch: `sdlc/${id}`, pr: '', risk: 'medium', riskReason: 'x', seeds: [], ideaKeys: [], notes: '',
  counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, verifyDemanded: false, infraRetries: 0, gateCommit: '' },
  ...over,
})
const base = [slice('S-001', { status: 'done', phase: 'done' }), slice('S-002', { status: 'in_progress', phase: 'tests' }), slice('S-003', { dependsOn: ['S-002'] })]

const strip = v => Array.isArray(v) ? v.map(strip)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'branch' && k !== 'commit').map(([k, v2]) => [k, strip(v2)])) : v

function observe(branchValue, mode) {
  const parent = mkdtempSync(join(tmpdir(), 'sdlc-vsec-'))
  const repo = join(parent, 'repo')
  mkdirSync(repo)
  const git = (...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8' })
  git('init', '-q', '-b', 'main'); git('config', 'user.email', 't@e.com'); git('config', 'user.name', 'T')
  writeFileSync(join(repo, 'spec.md'), '# Spec\n')
  mkdirSync(join(repo, '.sdlc'))
  const slices = base.map(s => { const c = { ...s }; if (mode === 'set') c.branch = branchValue; if (mode === 'removed') delete c.branch; return c })
  const files = {
    'config.json': { specPath: 'spec.md', specHash: '', overridesSeen: 0, gitMode: 'direct', defaultBranch: 'main', runBranch: '', commitFormat: '', branchFormat: 'sdlc/{name}' },
    'requirements.json': [], 'slices.json': slices, 'milestones.json': [],
  }
  for (const [n, v] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', n), JSON.stringify(v, null, 2))
  writeFileSync(join(repo, '.sdlc', 'DECISIONS.md'), '# Decisions\n')
  git('add', '-A'); git('commit', '-q', '-m', 'bootstrap')
  const py = (script, args, input) => {
    const r = spawnSync('python3', ['-I', join(SKILL, script), ...args], { encoding: 'utf8', input, cwd: repo })
    let out = null
    try { out = strip(JSON.parse(r.stdout || 'null')) } catch { out = r.stdout }
    return { status: r.status, stdout: out, stderr: r.stderr }
  }
  const next = py('next-action.py', ['--repo', repo])
  const patched = py('state-write.py', ['patch-slice', '--repo', repo, '--slice', 'S-002'], JSON.stringify({ phase: 'implement' }))
  const status = py('state-write.py', ['status', '--repo', repo])
  const janitor = py('janitor.py', ['--repo', repo, '--days', '36500'])
  const state = strip(JSON.parse(readFileSync(join(repo, '.sdlc', 'slices.json'), 'utf8')))
  const refs = git('for-each-ref', '--format=%(refname)').stdout
  const statusMd = readFileSync(join(repo, '.sdlc', 'STATUS.md'), 'utf8').replace(/^Updated:.*$/m, '')
  const outside = readdirSync(parent).sort()
  return { next, patched, status: { ...status, stderr: status.stderr }, janitor, state, refs, statusMd, outside }
}

const original = observe(null, 'original')
test('verify security: baseline runs clean', () => {
  assert.equal(original.next.status, 0, original.next.stderr)
  assert.equal(original.patched.status, 0, original.patched.stderr)
  assert.equal(original.janitor.status, 0, original.janitor.stderr)
  assert.deepEqual(original.outside, ['repo'])
})

test('verify security: field removed gives identical outputs and state', () => {
  assert.deepEqual(observe(null, 'removed'), original)
})

const nonStrings = [null, 0, -1, 1e308, 12345678901234567890, true, [], ['a', 'b'], { a: 1 }, [[[[[[[]]]]]]], '', ' ', 'x'.repeat(1_000_000)]
nonStrings.forEach((v, i) => test(`verify security: non-string/huge branch value #${i} changes nothing`, () => {
  assert.deepEqual(observe(v, 'set'), original)
}))

const entries = all()
for (const e of entries) {
  test(`verify security: corpus ${e.family}/${e.id} as branch value changes nothing`, () => {
    assert.deepEqual(observe(e.value, 'set'), original)
  })
}
