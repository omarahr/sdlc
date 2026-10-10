import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { up, down, sh, skillDir } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { mark, since } from '../helpers/logs.mjs'
import { gitRepo, refs } from '../helpers/repo.mjs'
import { requests, clearRequests } from '../helpers/fakes.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
stack.dirs.tmp = path.join(stack.dirs.root, 'tmp')
fs.mkdirSync(stack.dirs.tmp, { recursive: true })
const evidence = {}
test.after(() => {
  if (process.env.E2E_EVIDENCE_FILE) fs.writeFileSync(process.env.E2E_EVIDENCE_FILE, JSON.stringify(evidence, null, 2))
  down(stack)
})
const note = (id, label, value) => {
  evidence[id] = evidence[id] || []
  evidence[id].push({ label, value })
}

const SPEC = '# spec\n'
const CUSTOM = 'feature/PROJ-1-{name}'
const LOWER = 'feature/p-1-{name:lower}'
const DEFAULT = 'sdlc/{name}'
let remoteCounter = 0

const walk = (dir, base = dir, out = {}) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, base, out)
    else out[path.relative(base, full)] = fs.readFileSync(full, 'utf8')
  }
  return out
}
const refMap = (repo) => repo.git('for-each-ref', '--format=%(refname) %(objectname)')
const snap = (repo) => JSON.stringify({ refs: refMap(repo), files: walk(repo.dir) })
const sdlcFiles = (repo, names) => JSON.stringify(names.map((n) => {
  try { return fs.readFileSync(path.join(repo.dir, '.sdlc', n), 'utf8') } catch { return null }
}))
const heads = (remote) => sh(stack, 'git', ['ls-remote', '--heads', remote]).stdout
const singleObject = (t) => {
  try { JSON.parse(t.stdout) } catch { return false }
  return t.json !== null && typeof t.json === 'object' && !Array.isArray(t.json)
}
const noTrace = (t) => !t.stderr.includes('Traceback')
const probe = (code, args = [], opts = {}) =>
  sh(stack, stack.env.E2E_PYTHON, ['-I', '-c', `import sys;sys.path.insert(0,${JSON.stringify(skillDir)});${code}`, ...args], opts)
const parseAll = (fmt, names) => {
  const p = probe('import branches,json;print(json.dumps([branches.parse(sys.argv[1], b) for b in sys.argv[2:]]))', [fmt, ...names])
  assert.equal(p.status, 0, p.stderr)
  return JSON.parse(p.stdout)
}
const nameCli = (repo, kind, parts, fmt) => api(stack, 'branches.py', ['name', '--repo', repo.dir, '--kind', kind, ...parts, '--format', fmt])
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex')

function fixture({ mode = 'pr', format, slices = [], milestones = [], extra = {}, branches = [], remote = false, checkout, files = {}, rawConfig, rawSlices } = {}) {
  const config = { specPath: 'docs/spec.md', specHash: hash(SPEC), overridesSeen: 0, gitMode: mode, forge: 'github', defaultBranch: 'main', runBranch: '', targetBranch: '', commitFormat: '', commands: { test: 'true' }, environment: [], ...extra }
  if (format !== undefined) config.branchFormat = format
  const repo = gitRepo(stack, {
    files: {
      'docs/spec.md': SPEC,
      '.sdlc/config.json': rawConfig !== undefined ? rawConfig : config,
      '.sdlc/slices.json': rawSlices !== undefined ? rawSlices : slices,
      '.sdlc/milestones.json': milestones,
      '.sdlc/requirements.json': [],
      '.sdlc/DECISIONS.md': '',
      '.sdlc/log.jsonl': '',
      ...files,
    },
  })
  repo.remote = null
  if (remote) {
    repo.remote = path.join(stack.dirs.root, 'remotes', `r-${++remoteCounter}.git`)
    fs.mkdirSync(path.dirname(repo.remote), { recursive: true })
    sh(stack, 'git', ['init', '-q', '--bare', '-b', 'main', repo.remote])
    repo.git('remote', 'add', 'origin', repo.remote)
    repo.git('push', '-q', 'origin', 'main')
    repo.git('fetch', '-q', 'origin')
  }
  for (const b of branches) repo.git('branch', b)
  if (checkout) repo.git('checkout', '-q', checkout)
  return repo
}
const slice = (id, status, extra = {}) => ({ id, status, title: id, dependsOn: [], requirements: [], ...extra })
const writeJson = (repo, rel, value) => fs.writeFileSync(path.join(repo.dir, rel), JSON.stringify(value, null, 2))
const commitAll = (repo, msg = 'fixture') => { repo.git('add', '-A'); repo.git('commit', '-q', '-m', msg) }
const prsFile = (repo, prs) => {
  const file = path.join(stack.dirs.root, `prs-${Math.random().toString(36).slice(2)}.json`)
  fs.writeFileSync(file, JSON.stringify(prs))
  return file
}
const pr = (number, head, extra = {}) => ({ number, headRefName: head, url: `https://example.invalid/pull/${number}`, mergeable: 'MERGEABLE', reviewDecision: null, statusCheckRollup: [], ...extra })
const nextAction = (repo, prs, id, extra = []) => {
  const t = api(stack, 'next-action.py', ['--repo', repo.dir, '--prs', prsFile(repo, prs), ...extra])
  note(id, `next-action ${JSON.stringify(prs)}`, { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
  return t
}
const stateWrite = (repo, args, input, id) => {
  const t = api(stack, 'state-write.py', [...args, '--repo', repo.dir], { input: input === undefined ? undefined : JSON.stringify(input) })
  note(id, `state-write ${args.join(' ')} ${input === undefined ? '' : JSON.stringify(input)}`, { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
  return t
}
const janitor = (repo, id) => {
  const t = api(stack, 'janitor.py', ['--repo', repo.dir], { env: { TMPDIR: stack.dirs.tmp } })
  note(id, 'janitor', { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
  return t
}

const ledgerOn = (repo, branch, slices) => {
  repo.git('checkout', '-q', branch)
  writeJson(repo, '.sdlc/slices.json', slices)
  commitAll(repo, `ledger on ${branch}`)
  repo.git('checkout', '-q', 'main')
}

scenario('SC-M-1-039', 'next-action reads slice, state and e2e heads through the format', () => {
  const id = 'SC-M-1-039'
  const slices = [slice('S-001', 'in_progress'), slice('S-002', 'todo'), slice('S-003', 'awaiting-merge')]
  const repo = fixture({ mode: 'pr', format: CUSTOM, slices: [slice('S-001', 'todo'), slice('S-002', 'todo'), slice('S-003', 'todo')], milestones: [{ id: 'M-1', status: 'pending', slices: ['S-001', 'S-002', 'S-003'] }], branches: ['feature/PROJ-1-S-001', 'sdlc/S-002'] })
  ledgerOn(repo, 'sdlc/S-002', [slice('S-001', 'todo'), slice('S-002', 'in_progress'), slice('S-003', 'awaiting-merge')])
  ledgerOn(repo, 'feature/PROJ-1-S-001', slices)
  const before = snap(repo)
  clearRequests(stack, 'gh')
  const offset = mark(stack, id)
  const noPrs = { open: [], merged: [] }
  const onMain = nextAction(repo, noPrs, id)
  assert.ok(singleObject(onMain)); assert.ok(noTrace(onMain)); assert.equal(onMain.stderr, '')
  assert.equal(onMain.json.checkout, 'feature/PROJ-1-S-001', 'checkout names the active slice branch')
  assert.equal(onMain.json.next.sliceId, 'S-001')
  assert.equal(onMain.json.next.action, 'slice')

  const statePr = nextAction(repo, { open: [pr(11, 'feature/PROJ-1-state-20261008101500')], merged: [] }, id)
  assert.ok(statePr.json.sync && statePr.json.sync.some((c) => c.startsWith('gh pr merge 11 ')), 'state PR recognized')
  const e2ePr = nextAction(repo, { open: [pr(12, 'feature/PROJ-1-M-1-e2e')], merged: [] }, id)
  assert.ok(e2ePr.json.sync && e2ePr.json.sync.some((c) => c.startsWith('gh pr merge 12 ')), 'e2e PR recognized')
  const areaPr = nextAction(repo, { open: [pr(13, 'feature/PROJ-1-M-1-e2e-api')], merged: [] }, id)
  assert.equal(areaPr.json.sync, undefined, 'e2e-area head is not an e2e PR')
  const lowerPr = nextAction(repo, { open: [pr(14, 'feature/PROJ-1-s-001')], merged: [] }, id)
  assert.ok(singleObject(lowerPr)); assert.ok(noTrace(lowerPr))
  const foreignPr = nextAction(repo, { open: [pr(15, 'sdlc/S-002'), pr(16, 'sdlc/state-20261008101500')], merged: [] }, id)
  assert.equal(foreignPr.json.sync, undefined, 'sdlc/ heads are foreign')
  assert.equal(foreignPr.json.checkout, 'feature/PROJ-1-S-001')
  const merged = nextAction(repo, { open: [], merged: [{ number: 20, headRefName: 'feature/PROJ-1-S-003', url: 'https://example.invalid/pull/20' }] }, id)
  assert.equal(merged.json.next.action, 'retryMerge')
  assert.equal(merged.json.next.sliceId, 'S-003')
  const wrongName = nextAction(repo, { open: [], merged: [{ number: 21, headRefName: 'sdlc/S-003', url: 'https://example.invalid/pull/21' }] }, id)
  assert.notEqual(wrongName.json.next.action, 'retryMerge')
  for (const t of [statePr, e2ePr, areaPr, lowerPr, foreignPr, merged, wrongName]) {
    assert.ok(singleObject(t)); assert.ok(noTrace(t)); assert.equal(t.stderr, '')
  }
  repo.git('checkout', '-q', 'feature/PROJ-1-S-001')
  const checkedOut = nextAction(repo, noPrs, id)
  assert.equal(checkedOut.json.next.sliceId, 'S-001')
  assert.equal(checkedOut.json.checkout, null)
  repo.git('checkout', '-q', 'main')
  assert.equal(snap(repo), before, 'files and refs are byte-equal')
  assert.deepEqual(requests(stack, 'gh'), [], 'no gh call')
  note(id, 'log lines', since(stack, offset).length)
})

scenario('SC-M-1-040', 'next-action keeps the old sdlc/ behavior with no branchFormat or an empty one', () => {
  const id = 'SC-M-1-040'
  for (const format of [undefined, '']) {
    const repo = fixture({ mode: 'pr', format, slices: [slice('S-001', 'todo'), slice('S-002', 'todo')], branches: ['sdlc/S-001', 'feature/PROJ-1-S-001'] })
    ledgerOn(repo, 'sdlc/S-001', [slice('S-001', 'in_progress'), slice('S-002', 'todo')])
    const before = snap(repo)
    const prs = { open: [pr(5, 'sdlc/state-20261008101500')], merged: [] }
    const none = { open: [], merged: [] }
    const a = nextAction(repo, none, id)
    const b = nextAction(repo, none, id)
    assert.equal(a.stdout, b.stdout)
    assert.equal(a.json.checkout, 'sdlc/S-001')
    assert.equal(a.json.next.sliceId, 'S-001')
    const c = nextAction(repo, prs, id)
    const d = nextAction(repo, prs, id)
    assert.equal(c.stdout, d.stdout)
    assert.ok(c.json.sync.some((x) => x.startsWith('gh pr merge 5 ')))
    for (const t of [a, b, c, d]) { assert.ok(singleObject(t)); assert.ok(noTrace(t)); assert.equal(t.stderr, '') }
    assert.equal(snap(repo), before)
  }
})

const stackSlices = () => [
  slice('S-001', 'awaiting-merge', { branch: 'feature/PROJ-1-S-001' }),
  slice('S-002', 'todo', { dependsOn: ['S-001'], branch: 'feature/PROJ-1-S-002' }),
]
const stackFixture = (format, extra = {}) => {
  const run = format === undefined || format === DEFAULT ? 'sdlc/run-1' : 'feature/PROJ-1-run-1'
  const repo = fixture({
    mode: 'stack', format, slices: stackSlices(), remote: true, extra: { runBranch: run, ...extra },
    milestones: [{ id: 'M-1', status: 'pending', slices: ['S-001', 'S-002'] }],
    branches: [run],
  })
  repo.git('push', '-q', 'origin', run)
  return { repo, run }
}

scenario('SC-M-1-041', 'state-write names slice and milestone branches through the format', () => {
  const id = 'SC-M-1-041'
  const { repo } = stackFixture(CUSTOM)
  const calls = []
  calls.push(stateWrite(repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }, id))
  calls.push(stateWrite(repo, ['patch-slice', '--slice', 'S-001'], { status: 'awaiting-merge' }, id))
  calls.push(stateWrite(repo, ['patch-slice', '--slice', 'S-002'], { status: 'in_progress' }, id))
  const base = stateWrite(repo, ['base-branch', '--slice', 'S-002'], undefined, id)
  for (const t of [...calls, base]) {
    assert.equal(t.status, 0, t.stdout + t.stderr)
    assert.ok(singleObject(t)); assert.equal(t.json.ok, true); assert.ok(noTrace(t)); assert.equal(t.stderr, '')
  }
  assert.equal(base.json.branch, 'feature/PROJ-1-S-001')
  const list = repo.git('branch', '--list', '--format=%(refname:short)').split('\n').filter(Boolean)
  note(id, 'local branches', list)
  for (const want of ['feature/PROJ-1-M-1', 'feature/PROJ-1-S-001', 'feature/PROJ-1-S-002']) assert.ok(list.includes(want), want)
  assert.deepEqual(list.filter((b) => b.startsWith('sdlc/')), [])
  const ledger = JSON.parse(repo.git('show', 'feature/PROJ-1-S-002:.sdlc/slices.json'))
  const first = JSON.parse(repo.git('show', 'feature/PROJ-1-S-001:.sdlc/slices.json'))
  assert.equal(first.find((s) => s.id === 'S-001').status, 'awaiting-merge')
  assert.equal(ledger.find((s) => s.id === 'S-002').status, 'in_progress')
  for (const s of ledger) assert.equal(s.branch, `feature/PROJ-1-${s.id}`)
  assert.deepEqual(ledger.find((s) => s.id === 'S-001'), stackSlices()[0])
  const bad = stateWrite(repo, ['patch-slice', '--slice', 'S-999'], { status: 'in_progress' }, id)
  assert.equal(bad.status, 2)
  assert.ok(singleObject(bad)); assert.equal(bad.json.ok, false); assert.ok(bad.json.error.length > 0); assert.ok(noTrace(bad))
})

scenario('SC-M-1-042', 'milestone pruning only deletes branches that parse as milestone', () => {
  const id = 'SC-M-1-042'
  const build = () => {
    const run = 'feature/PROJ-1-run-1'
    const repo = fixture({
      mode: 'stack', format: CUSTOM, remote: true, extra: { runBranch: run },
      slices: [slice('S-001', 'done'), slice('S-004', 'todo')],
      milestones: [{ id: 'M-1', status: 'pending', slices: ['S-001', 'S-004'] }],
      branches: ['feature/PROJ-1-M-2', 'feature/PROJ-1-S-001', 'sdlc/M-3', run],
    })
    repo.git('checkout', '-q', '-b', 'feature/PROJ-1-M-1')
    fs.writeFileSync(path.join(repo.dir, 'unshipped.txt'), 'work\n')
    commitAll(repo, 'unshipped milestone work')
    repo.git('checkout', '-q', 'main')
    return { repo, run }
  }
  const { repo, run } = build()
  repo.git('checkout', '-q', 'feature/PROJ-1-M-1')
  repo.git('checkout', '-q', 'main')
  const before = {
    slices: sdlcFiles(repo, ['slices.json']), log: sdlcFiles(repo, ['log.jsonl']), config: sdlcFiles(repo, ['config.json']),
  }
  const refsBefore = refs(repo)
  const call = probe(`
import importlib.util, json
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(path.join(skillDir, 'state-write.py'))})
sw = importlib.util.module_from_spec(spec); spec.loader.exec_module(sw)
repo = sys.argv[1]
config = sw.read_json(repo + "/.sdlc/config.json")
print(json.dumps(sw.prune_stale_milestone_branches(repo, config, "feature/PROJ-1-M-1", "feature/PROJ-1-{name}")))
`, [repo.dir])
  note(id, 'direct prune call', { status: call.status, stdout: call.stdout.trim(), stderr: call.stderr.trim() })
  assert.equal(call.status, 0, call.stderr)
  const pruned = JSON.parse(call.stdout)
  assert.deepEqual(pruned, ['feature/PROJ-1-M-2'])
  const after = refs(repo)
  const gone = refsBefore.filter((r) => !after.includes(r))
  assert.deepEqual(gone, ['refs/heads/feature/PROJ-1-M-2'])
  for (const keep of ['sdlc/M-3', 'feature/PROJ-1-S-001', 'main', run, 'feature/PROJ-1-M-1']) assert.ok(after.includes(`refs/heads/${keep}`), keep)
  assert.deepEqual({ slices: sdlcFiles(repo, ['slices.json']), log: sdlcFiles(repo, ['log.jsonl']), config: sdlcFiles(repo, ['config.json']) }, before)
  assert.equal(JSON.parse(fs.readFileSync(path.join(repo.dir, '.sdlc/config.json'), 'utf8')).runBranch, run)
  assert.ok(noTrace(call)); assert.equal(call.stderr, '')

  const second = build()
  const cli = stateWrite(second.repo, ['patch-slice', '--slice', 'S-004'], { status: 'in_progress' }, id)
  assert.equal(cli.status, 0, cli.stdout + cli.stderr)
  const list = second.repo.git('for-each-ref', '--format=%(refname:short)', 'refs/heads/').split('\n').filter(Boolean)
  note(id, 'branches after cli patch', list)
  assert.ok(!list.includes('feature/PROJ-1-M-2'))
  for (const keep of ['sdlc/M-3', 'feature/PROJ-1-S-001', 'main', second.run, 'feature/PROJ-1-M-1']) assert.ok(list.includes(keep), keep)
  assert.equal(JSON.parse(fs.readFileSync(path.join(second.repo.dir, '.sdlc/config.json'), 'utf8')).runBranch, second.run)
  assert.ok(noTrace(cli)); assert.equal(cli.stderr, '')
  note(id, 'cli printed result lists pruned branches', cli.json)
})

scenario('SC-M-1-043', 'ship-prune and collect-verification are not applicable when the commands are absent', () => {
  const id = 'SC-M-1-043'
  const src = fs.readFileSync(path.join(skillDir, 'state-write.py'), 'utf8')
  const present = ['ship-prune', 'collect-verification'].filter((c) => src.includes(c))
  note(id, 'commands found in state-write.py', present)
  const repo = fixture({ mode: 'pr', format: CUSTOM, slices: [slice('S-001', 'done')], branches: ['feature/PROJ-1-S-001-v0-cli-0', 'feature/PROJ-1-S-001-attempt-1'] })
  for (const cmd of ['ship-prune', 'collect-verification']) {
    const before = snap(repo)
    const t = stateWrite(repo, [cmd], undefined, id)
    assert.notEqual(t.status, 0)
    assert.ok(noTrace(t))
    assert.equal(snap(repo), before)
  }
  assert.deepEqual(present, [])
})

const janitorFixture = (format, slices, names, current) => {
  const remoteRepo = fixture({ mode: 'pr', format, slices, remote: true, branches: names })
  if (current) remoteRepo.git('checkout', '-q', current)
  return remoteRepo
}
const noForge = (repo, remoteHeads) => {
  assert.deepEqual(requests(stack, 'gh'), [])
  assert.deepEqual(requests(stack, 'glab'), [])
  assert.equal(heads(repo.remote), remoteHeads)
}

scenario('SC-M-1-044', 'janitor sweeps only finished or unknown verify branches under a custom format', () => {
  const id = 'SC-M-1-044'
  const names = [
    'feature/p-1-s-001-v0-http-api-0', 'feature/p-1-s-002-v0-cli-0', 'feature/p-1-s-009-v0-cli-0', 'feature/p-1-run-1',
    'feature/p-1-s-001-attempt-1', 'feature/p-1-s-001', 'sdlc/S-001-v0-http-api-0',
  ]
  const repo = janitorFixture(LOWER, [slice('S-001', 'done'), slice('S-002', 'todo'), slice('S-003', 'in_progress')], names)
  clearRequests(stack, 'gh'); clearRequests(stack, 'glab')
  const remoteHeads = heads(repo.remote)
  const refsBefore = refs(repo)
  const files = sdlcFiles(repo, ['log.jsonl', 'slices.json'])
  const t = janitor(repo, id)
  assert.equal(t.status, 0)
  assert.ok(singleObject(t)); assert.ok(noTrace(t))
  assert.deepEqual([...t.json.removedBranches].sort(), ['feature/p-1-s-001-v0-http-api-0', 'feature/p-1-s-009-v0-cli-0'])
  const after = refs(repo)
  for (const keep of names.filter((n) => !t.json.removedBranches.includes(n)).concat(['main'])) assert.ok(after.includes(`refs/heads/${keep}`), keep)
  for (const gone of t.json.removedBranches) assert.ok(!after.includes(`refs/heads/${gone}`))
  assert.equal(refsBefore.length - after.length, 2)
  assert.equal(sdlcFiles(repo, ['log.jsonl', 'slices.json']), files)
  assert.deepEqual(t.json.notes, [])
  noForge(repo, remoteHeads)
})

scenario('SC-M-1-045', 'janitor sweeps under the default format and keeps attempt-shaped and checked-out branches', () => {
  const id = 'SC-M-1-045'
  const names = ['sdlc/S-001-v0-cli-0', 'sdlc/S-001-attempt-2-v0-cli-0', 'sdlc/S-001-attempt-3', 'sdlc/run-1', 'sdlc/S-001-v1-cli-0']
  const repo = janitorFixture(undefined, [slice('S-001', 'done')], names, 'sdlc/S-001-v1-cli-0')
  clearRequests(stack, 'gh'); clearRequests(stack, 'glab')
  const remoteHeads = heads(repo.remote)
  const files = sdlcFiles(repo, ['log.jsonl', 'slices.json'])
  const t = janitor(repo, id)
  assert.equal(t.status, 0)
  assert.ok(singleObject(t)); assert.ok(noTrace(t))
  assert.deepEqual(t.json.removedBranches, ['sdlc/S-001-v0-cli-0'])
  const after = refs(repo)
  for (const keep of ['sdlc/S-001-attempt-2-v0-cli-0', 'sdlc/S-001-attempt-3', 'sdlc/run-1', 'sdlc/S-001-v1-cli-0']) assert.ok(after.includes(`refs/heads/${keep}`), keep)
  assert.ok(!after.includes('refs/heads/sdlc/S-001-v0-cli-0'))
  assert.ok(t.json.notes.some((n) => n.includes('sdlc/S-001-v1-cli-0')), 'the checked-out branch has a note')
  assert.equal(repo.git('branch', '--show-current').trim(), 'sdlc/S-001-v1-cli-0')
  assert.equal(sdlcFiles(repo, ['log.jsonl', 'slices.json']), files)
  noForge(repo, remoteHeads)
})

scenario('SC-M-1-046', 'janitor deletes nothing when the ledger, the format or the state tree is unusable', () => {
  const id = 'SC-M-1-046'
  const victim = 'sdlc/S-009-v0-cli-0'
  const variants = {
    'invalid slices.json': () => fixture({ mode: 'pr', rawSlices: '{not json', remote: true, branches: [victim] }),
    'invalid branchFormat': () => fixture({ mode: 'pr', format: 'no placeholder', slices: [slice('S-001', 'done')], remote: true, branches: [victim, 'no-placeholder-S-001-v0-cli-0'] }),
    'no .sdlc': () => {
      const repo = gitRepo(stack, { branches: [victim] })
      return repo
    },
  }
  for (const [label, build] of Object.entries(variants)) {
    const repo = build()
    if (!repo.remote) {
      repo.remote = path.join(stack.dirs.root, 'remotes', `r-${++remoteCounter}.git`)
      fs.mkdirSync(path.dirname(repo.remote), { recursive: true })
      sh(stack, 'git', ['init', '-q', '--bare', '-b', 'main', repo.remote])
      repo.git('remote', 'add', 'origin', repo.remote)
      repo.git('push', '-q', 'origin', 'main')
    }
    clearRequests(stack, 'gh'); clearRequests(stack, 'glab')
    const remoteHeads = heads(repo.remote)
    const before = snap(repo)
    const t = janitor(repo, id)
    note(id, label, t.json)
    assert.equal(t.status, 0, label)
    assert.ok(singleObject(t), label); assert.ok(noTrace(t), label)
    assert.deepEqual(t.json.removedBranches, [], label)
    assert.ok(t.json.notes.length > 0, label)
    assert.equal(snap(repo), before, label)
    noForge(repo, remoteHeads)
  }
})

const loadHarness = async () => import(pathToFileURL(path.join(skillDir, 'test', 'harness.mjs')).href)
const FORMATS = [DEFAULT, CUSTOM, LOWER]

scenario('SC-M-1-047', 'rt.I.branchName equals branches.py name for each format', async () => {
  const id = 'SC-M-1-047'
  const { loadInternals } = await loadHarness()
  const repo = gitRepo(stack)
  const tail = 'S-001-v0-http-api-0'
  for (const fmt of FORMATS) {
    const rt = await loadInternals(undefined, { branchFormat: fmt })
    const cli = nameCli(repo, 'verify', ['--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'], fmt)
    note(id, `format ${fmt}`, { js: rt.I.branchName(tail), py: cli.stdout.trim(), BRANCH_FORMAT: rt.I.BRANCH_FORMAT })
    assert.equal(cli.status, 0, cli.stderr)
    assert.equal(rt.I.branchName(tail), cli.json.branch)
    assert.equal(rt.I.BRANCH_FORMAT, fmt)
    assert.equal(cli.stderr, ''); assert.ok(singleObject(cli))
    assert.deepEqual(rt.errors, [])
  }
  const none = await loadInternals()
  assert.equal(none.I.BRANCH_FORMAT, 'sdlc/{name}')
  assert.equal(none.I.branchName(tail), 'sdlc/S-001-v0-http-api-0')
  assert.equal(typeof none.I.branchName, 'function')
})

scenario('SC-M-1-048', 'branchName keeps replacement patterns in the tail literal', async () => {
  const id = 'SC-M-1-048'
  const { loadInternals } = await loadHarness()
  const repo = gitRepo(stack)
  const tails = ['S-001$&x', 'S-001$1', 'S-001$`y', 'S-001$$z', 'S-001{name}x', 'S-001$&$1$`$$']
  const diffs = []
  for (const fmt of FORMATS) {
    const rt = await loadInternals(undefined, { branchFormat: fmt })
    for (const tail of tails) {
      const js = rt.I.branchName(tail)
      const cli = nameCli(repo, 'slice', ['--id', tail], fmt)
      note(id, `${fmt} ${tail}`, { js, py: cli.json ? cli.json.branch : cli.stdout.trim(), status: cli.status })
      const lower = fmt.includes(':lower')
      const literal = fmt.replace(lower ? '{name:lower}' : '{name}', () => (lower ? tail.toLowerCase() : tail))
      assert.equal(js, literal, `${fmt} ${tail} literal`)
      const refused = cli.status === 2 && cli.json && cli.json.ok === false
      if (!refused && !(cli.status === 0 && cli.json && cli.json.branch === js)) diffs.push({ fmt, tail, js, py: cli.stdout.trim() })
    }
  }
  note(id, 'differences from branches.py name', diffs)
  assert.deepEqual(diffs, [])
})

scenario('SC-M-1-049', 'the bootstrap passes branchFormat to the env-detector', async () => {
  const id = 'SC-M-1-049'
  const { runMain, scripted, ok } = await loadHarness()
  const repo = fixture({ mode: 'pr' })
  const before = snap(repo)
  const seen = {}
  for (const [label, args] of [['set', { branchFormat: CUSTOM }], ['unset', {}]]) {
    const rt = await runMain(scripted({
      'state-reader': [{ action: 'bootstrap', reason: 'no config' }, { action: 'stop', reason: 'test end' }],
      'env-detector': [{ gitMode: 'direct', commands: {} }],
      'requirements-extractor': [{ added: 1 }],
      'completeness-critic': () => ({ added: 0 }),
      slicer: [{ added: 1 }],
      'state-writer': () => ok(),
    }), { specPath: 'docs/spec.md', gitMode: 'direct', ...args })
    assert.deepEqual(rt.errors, [])
    seen[label] = rt.calls.find((c) => c.role === 'env-detector').inputs
    assert.ok(!rt.logs.join('\n').includes('Traceback'))
  }
  note(id, 'env-detector inputs', seen)
  assert.equal(seen.set.branchFormat, CUSTOM)
  assert.equal(seen.unset.branchFormat, null)
  assert.equal(snap(repo), before)
})

const classify = (fmt, names, ids) => parseAll(fmt, names).map((p, i) => ({ name: names[i], kind: p && p.kind }))

scenario('SC-M-1-050', 'no script path pushes a verify, e2e-area or attempt branch or opens a PR for one', () => {
  const id = 'SC-M-1-050'
  const combos = [['pr', undefined], ['pr', CUSTOM], ['stack', undefined], ['stack', CUSTOM], ['mr', CUSTOM], ['direct', undefined]]
  for (const [mode, format] of combos) {
    const fmt = format || DEFAULT
    const label = `${mode} ${fmt}`
    const nm = (kind, parts) => nameCli(gitRepo(stack), kind, parts, fmt).json.branch
    const verify = nm('verify', ['--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'])
    const area = nm('e2e-area', ['--id', 'M-1', '--area', 'api'])
    const attempt = nm('attempt', ['--id', 'S-001', '--n', '1'])
    const run = nm('run', ['--n', '1'])
    const extra = mode === 'stack' ? { runBranch: run } : {}
    const repo = fixture({
      mode, format, remote: true, extra,
      slices: [slice('S-001', 'todo', { branch: nm('slice', ['--id', 'S-001']) }), slice('S-002', 'todo', { dependsOn: ['S-001'] })],
      milestones: [{ id: 'M-1', status: 'pending', slices: ['S-001', 'S-002'] }],
      branches: [verify, area, attempt, run],
    })
    if (mode === 'stack') repo.git('push', '-q', 'origin', run)
    clearRequests(stack, 'gh'); clearRequests(stack, 'glab')
    const calls = []
    for (const status of ['in_progress', 'awaiting-merge', 'done']) calls.push(stateWrite(repo, ['patch-slice', '--slice', 'S-001'], { status }, id))
    calls.push(stateWrite(repo, ['patch-slice', '--slice', 'S-002'], { status: 'in_progress' }, id))
    for (const t of calls) { assert.ok(singleObject(t), label); assert.ok(noTrace(t), label) }
    const syncPrs = { open: [pr(31, nm('state', [])), pr(32, nm('e2e', ['--id', 'M-1'])), pr(33, verify), pr(34, area), pr(35, attempt)], merged: [] }
    const na = nextAction(repo, syncPrs, id)
    assert.ok(singleObject(na), label)
    for (const command of na.json.sync || []) {
      const ran = sh(stack, 'sh', ['-c', command], { cwd: repo.dir })
      note(id, `${label} sync ${command}`, { status: ran.status, stderr: ran.stderr.trim() })
    }
    janitor(repo, id)
    const remoteNames = heads(repo.remote).split('\n').filter(Boolean).map((l) => l.split('\t')[1].replace('refs/heads/', ''))
    note(id, `${label} remote heads`, remoteNames)
    for (const c of classify(fmt, remoteNames)) {
      assert.ok(!['verify', 'e2e-area', 'attempt'].includes(c.kind), `${label}: ${c.name} is ${c.kind}`)
    }
    for (const name of [verify, area, attempt]) assert.ok(!remoteNames.includes(name), `${label}: ${name} pushed`)
    const ghCalls = requests(stack, 'gh')
    note(id, `${label} gh calls`, ghCalls.map((r) => r.args.join(' ')))
    for (const r of ghCalls) {
      const text = r.args.join(' ')
      if (/\bpr create\b/.test(text)) assert.ok(![verify, area, attempt].some((b) => text.includes(b)), `${label}: ${text}`)
    }
    const ledger = JSON.parse(fs.readFileSync(path.join(repo.dir, '.sdlc/slices.json'), 'utf8'))
    for (const s of ledger) {
      if (!s.branch) continue
      const kind = classify(fmt, [s.branch])[0].kind
      assert.ok(kind !== 'verify', `${label}: ${s.branch}`)
      if (remoteNames.length) assert.ok(kind === 'slice' || kind === null || kind === 'milestone', label)
    }
  }
})

scenario('SC-M-1-074', 'state-write derives the format from the config once and rejects an invalid one', () => {
  const id = 'SC-M-1-074'
  const mk = (format) => {
    const run = format === CUSTOM ? 'feature/PROJ-1-run-1' : 'sdlc/run-1'
    const repo = fixture({
      mode: 'stack', format, remote: true, extra: { runBranch: run },
      slices: [slice('S-001', 'todo'), slice('S-002', 'todo')],
      milestones: [{ id: 'M-1', status: 'pending', slices: ['S-001', 'S-002'] }], branches: [run],
    })
    repo.git('push', '-q', 'origin', run)
    return repo
  }
  const custom = mk(CUSTOM)
  const a = stateWrite(custom, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }, id)
  assert.equal(a.status, 0, a.stdout + a.stderr)
  assert.equal(a.json.branch, 'feature/PROJ-1-S-001')
  const customList = custom.git('branch', '--list', '--format=%(refname:short)').split('\n').filter(Boolean)
  assert.ok(customList.includes('feature/PROJ-1-M-1')); assert.ok(customList.includes('feature/PROJ-1-S-001'))
  assert.deepEqual(customList.filter((b) => b.startsWith('sdlc/')), [])

  const plain = mk(undefined)
  const b = stateWrite(plain, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }, id)
  assert.equal(b.status, 0, b.stdout + b.stderr)
  assert.equal(b.json.branch, 'sdlc/S-001')
  const plainList = plain.git('branch', '--list', '--format=%(refname:short)').split('\n').filter(Boolean)
  assert.ok(plainList.includes('sdlc/M-1'))

  const bad = mk('{name}{name}')
  const before = snap(bad)
  for (const args of [['patch-slice', '--slice', 'S-001'], ['base-branch', '--slice', 'S-001']]) {
    const t = stateWrite(bad, args, args[0] === 'patch-slice' ? { status: 'in_progress' } : undefined, id)
    assert.equal(t.status, 2, args[0])
    assert.ok(singleObject(t)); assert.equal(t.json.ok, false); assert.ok(t.json.error && t.json.error.length > 0)
    assert.ok(noTrace(t))
  }
  assert.equal(refMap(bad), JSON.parse(before).refs)
  assert.equal(snap(bad), before)

  const src = fs.readFileSync(path.join(skillDir, 'state-write.py'), 'utf8')
  const mainBody = src.slice(src.indexOf('def main():'))
  note(id, 'format_of calls in main()', (mainBody.match(/format_of\(/g) || []).length)
})
