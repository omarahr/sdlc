import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const { cliRunner } = await import(`${WT}/skills/sdlc/test/testkit/cli-runner.mjs`)

const CUSTOM = 'feature/PROJ-1-{name}'
const P = 'feature/PROJ-1-'
const r = cliRunner()
const g = (repo, ...a) => r.git(repo, ...a)
const sl = (id, extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function write(repo, files) {
  mkdirSync(join(repo, '.sdlc'), { recursive: true })
  for (const [n, v] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', n), typeof v === 'string' ? v : JSON.stringify(v, null, 2))
  g(repo, 'add', '-A')
  g(repo, 'commit', '-q', '--allow-empty', '-m', 'state')
}
const cfg = (run, prefix, fmt, extra = {}) => ({ specPath: 'spec.md', gitMode: 'stack', defaultBranch: 'main', commitFormat: '', runBranch: `${prefix}run-${run}`, ...(fmt ? { branchFormat: fmt } : {}), ...extra })
const exists = (repo, b) => g(repo, 'branch', '--list', b).trim() !== ''

function base({ prefix, fmt, shipped = [], others = [], slices = [sl('S-001')], milestones = [{ id: 'M-1', title: 'x', status: 'pending', slices: ['S-001'], fixSlices: [] }] }) {
  const repo = r.dir('repo')
  g(repo, 'init', '-q', '-b', 'main')
  writeFileSync(join(repo, 'spec.md'), '# s\n')
  write(repo, { 'config.json': cfg(1, prefix, fmt), 'requirements.json': [], 'slices.json': slices, 'milestones.json': milestones })
  const bare = r.dir('bare')
  g(bare, 'init', '-q', '--bare', '-b', 'main')
  g(repo, 'remote', 'add', 'origin', bare)
  g(repo, 'push', '-q', '-u', 'origin', 'main')
  g(repo, 'checkout', '-q', '-b', `${prefix}run-1`)
  g(repo, 'push', '-q', '-u', 'origin', `${prefix}run-1`)
  for (const id of shipped) {
    g(repo, 'checkout', '-q', '-b', `${prefix}${id}`, `${prefix}run-1`)
    writeFileSync(join(repo, `${id}.txt`), id)
    g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', id)
    g(repo, 'push', '-q', '-u', 'origin', `${prefix}${id}`)
    g(repo, 'checkout', '-q', 'main')
    g(repo, 'merge', '-q', '--squash', `${prefix}${id}`)
    g(repo, 'commit', '-q', '-m', `${id} (#1)`)
    g(repo, 'push', '-q', 'origin', 'main')
    g(repo, 'push', '-q', 'origin', '--delete', `${prefix}${id}`)
  }
  g(repo, 'checkout', '-q', 'main')
  for (const o of others) g(repo, 'branch', o, 'origin/main')
  g(repo, 'fetch', '-q', '--prune', 'origin')
  return repo
}

function run2(repo, prefix, fmt, files = {}) {
  g(repo, 'checkout', '-q', 'main')
  g(repo, 'checkout', '-q', '-b', `${prefix}run-2`)
  write(repo, { 'config.json': cfg(2, prefix, fmt), ...files })
}

const patch = (repo, slice = 'S-001') => r.run('state-write.py', ['patch-slice', '--repo', repo, '--slice', slice], { input: JSON.stringify({ status: 'in_progress' }) })
const heads = (repo) => g(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/').split('\n').filter(Boolean).sort()

test('verify cli TC-cli-1: prune under custom format deletes only parsed milestone branches', () => {
  const others = ['sdlc/M-2', `${P}M-3-e2e`, `${P}S-001`, `${P}M-10`, `${P}М-5`, `${P}M-１`, `${P}M-01`, `${P}m-7`]
  const repo = base({ prefix: P, fmt: CUSTOM, shipped: ['M-1'], others })
  run2(repo, P, CUSTOM, { 'slices.json': [sl('S-020')], 'milestones.json': [{ id: 'M-4', title: 't', status: 'pending', slices: ['S-020'], fixSlices: [] }] })
  const before = heads(repo)
  const t = patch(repo, 'S-020')
  console.log(t.text())
  console.log('before', before, '\nafter', heads(repo))
  assert.equal(t.status, 0, t.stdout)
  const after = heads(repo)
  assert.ok(!after.includes(`${P}M-1`), 'shipped M-1 should go')
  for (const b of ['main', 'sdlc/M-2', `${P}M-3-e2e`, `${P}S-001`, `${P}run-1`, `${P}run-2`, `${P}М-5`, `${P}m-7`]) assert.ok(after.includes(b), `${b} must stay`)
  assert.ok(!after.includes(`${P}M-10`), 'M-10 parses to milestone and is shipped: it goes')
  console.log('OBSERVED lookalikes deleted as milestone:', [`${P}M-01`, `${P}M-１`].filter((b) => !after.includes(b)))
})

const leftoverVariants = (prefix, fmt, runBranchValue, rawConfig) => {
  const repo = base({ prefix, fmt })
  g(repo, 'checkout', '-q', '-b', `${prefix}M-1`)
  const c = rawConfig !== undefined ? rawConfig : (runBranchValue === undefined ? (() => { const x = cfg(1, prefix, fmt); delete x.runBranch; return x })() : cfg(1, prefix, fmt, { runBranch: runBranchValue }))
  write(repo, { 'config.json': c })
  writeFileSync(join(repo, 'unshipped.txt'), 'work\n')
  g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'M-1 work')
  g(repo, 'push', '-q', '-u', 'origin', `${prefix}M-1`)
  run2(repo, prefix, fmt)
  g(repo, 'fetch', '-q', 'origin')
  return repo
}

const probe = (prefix, fmt, value, raw) => {
  const repo = leftoverVariants(prefix, fmt, value, raw)
  const tip = g(repo, 'rev-parse', `${prefix}M-1`)
  const t = patch(repo)
  const survived = exists(repo, `${prefix}M-1`) && g(repo, 'rev-parse', `${prefix}M-1`) === tip
  return { t, survived, refused: /belongs to run/.test(t.stdout), traceback: /Traceback/.test(t.stderr) }
}

test('verify cli TC-cli-2/3: stored run name that is foreign is not taken as run, branch survives', () => {
  const out = []
  const foreign = [['custom', P, CUSTOM, 'main'], ['custom', P, CUSTOM, 'sdlc/run-1'], ['custom', P, CUSTOM, 'release/x'], ['custom', P, CUSTOM, ''], ['custom', P, CUSTOM, undefined], ['custom', P, CUSTOM, 123], ['custom', P, CUSTOM, ['a']], ['custom', P, CUSTOM, { a: 1 }], ['custom', P, CUSTOM, null], ['custom', P, CUSTOM, `${P}S-001`], ['custom', P, CUSTOM, `${P}M-1`], ['default', 'sdlc/', undefined, 'main'], ['default', 'sdlc/', undefined, `${P}run-1`], ['default', 'sdlc/', '', 'release/x']]
  for (const [label, prefix, fmt, v] of foreign) {
    const o = probe(prefix, fmt, v)
    out.push(`${label} runBranch=${JSON.stringify(v)} exit=${o.t.status} refused=${o.refused} survived=${o.survived} traceback=${o.traceback} stdout=${o.t.stdout.trim().slice(0, 120)}`)
    assert.equal(o.refused, false, `${label} ${JSON.stringify(v)} was refused as a real run`)
    assert.equal(o.survived, true, `${label} ${JSON.stringify(v)} lost its branch`)
    assert.equal(o.traceback, false, o.t.stderr)
  }
  console.log(out.join('\n'))
})

test('verify cli TC-cli-4: another real run branch still refuses', () => {
  const out = []
  for (const [label, prefix, fmt, v] of [['custom', P, CUSTOM, `${P}run-1`], ['custom', P, CUSTOM, `${P}run-7`], ['default', 'sdlc/', undefined, 'sdlc/run-1'], ['default', 'sdlc/', '', 'sdlc/run-9']]) {
    const o = probe(prefix, fmt, v)
    out.push(`${label} runBranch=${v} exit=${o.t.status} refused=${o.refused} survived=${o.survived} stdout=${o.t.stdout.trim().slice(0, 200)}`)
    assert.equal(o.t.status, 2)
    assert.equal(o.refused, true)
    assert.equal(o.survived, true)
  }
  console.log(out.join('\n'))
})

test('verify cli TC-cli-2b: malformed committed config on the leftover branch gives no traceback', () => {
  const out = []
  for (const raw of ['not json', '[1]', '"str"', '5', 'null', '{"runBranch": ']) {
    const o = probe(P, CUSTOM, undefined, raw)
    out.push(`raw=${raw} exit=${o.t.status} traceback=${o.traceback} survived=${o.survived} stdout=${o.t.stdout.trim().slice(0, 100)} stderr=${o.t.stderr.trim().split('\n').slice(-6).join(' | ')}`)
  }
  console.log(out.join('\n'))
  for (const l of out) assert.ok(/survived=true/.test(l), l)
})

const janitor = (config, branchesList, withConfig = true) => {
  const repo = r.dir('jrepo')
  g(repo, 'init', '-q', '-b', 'main')
  writeFileSync(join(repo, 'f'), 'x')
  const files = { 'slices.json': [sl('S-001', { status: 'done' }), sl('S-002'), sl('S-003', { status: 'rejected' })] }
  if (withConfig) files['config.json'] = config
  write(repo, files)
  for (const b of branchesList) g(repo, 'branch', b)
  const t = r.run('janitor.py', ['--repo', repo, '--days', '9999'])
  return { t, left: heads(repo) }
}
const V = (id) => `${id}-v0-http-api-0`

test('verify cli TC-cli-5: janitor under custom format', () => {
  const list = [`${P}${V('S-001')}`, `sdlc/${V('S-001')}`, `${P}${V('S-002')}`, `${P}${V('S-099')}`, `${P}${V('S-003')}`, `${P}S-001`]
  const { t, left } = janitor({ branchFormat: CUSTOM }, list)
  console.log(t.text(), left)
  assert.equal(t.status, 0)
  assert.ok(!left.includes(`${P}${V('S-001')}`))
  assert.ok(!left.includes(`${P}${V('S-099')}`) && !left.includes(`${P}${V('S-003')}`), 'ids absent from the ledger or rejected go, per the janitor contract')
  for (const b of [`sdlc/${V('S-001')}`, `${P}${V('S-002')}`, `${P}S-001`, 'main']) assert.ok(left.includes(b), `${b} must stay`)
})

test('verify cli TC-cli-6: janitor under default format when branchFormat absent, empty or config missing', () => {
  const list = [`${P}${V('S-001')}`, `sdlc/${V('S-001')}`, `sdlc/${V('S-002')}`, `sdlc/${V('S-099')}`]
  const out = []
  for (const [label, c, wc] of [['absent', {}, true], ['empty', { branchFormat: '' }, true], ['nofile', null, false]]) {
    const { t, left } = janitor(c, list, wc)
    out.push(`${label}: exit=${t.status} stdout=${t.stdout.trim()} left=${left.join(',')}`)
    assert.equal(t.status, 0)
    assert.ok(!left.includes(`sdlc/${V('S-001')}`), label)
    for (const b of [`${P}${V('S-001')}`, `sdlc/${V('S-002')}`, 'main']) assert.ok(left.includes(b), `${label}: ${b} must stay`)
    assert.ok(!left.includes(`sdlc/${V('S-099')}`), `${label}: ledger-absent id goes`)
  }
  console.log(out.join('\n'))
})
