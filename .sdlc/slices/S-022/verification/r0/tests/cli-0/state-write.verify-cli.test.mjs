import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const { cliRunner } = await import(`${WT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { load } = await import(`${WT}/skills/sdlc/test/testkit/attack-corpus.mjs`)
const { stubServer } = await import(`${WT}/skills/sdlc/test/testkit/stub-server.mjs`)

const LOG = process.env.VERIFY_LOG
const note = (id, t) => { if (LOG) appendFileSync(LOG, `### ${id}\n${t.text()}\n\n`) }
const slice = (id, extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function stack(r, { cfg = {}, slices = [slice('S-001')], milestones = [{ id: 'M-1', slices: ['S-001', 'S-002'], status: 'pending' }], run = 'sdlc/run-1', repoFile } = {}) {
  const repo = r.gitRepo({ name: 'repo', files: { 'src/app.txt': 'v1\n', 'spec.md': '# s\n' } })
  const bare = r.dir('bare')
  r.git(bare, 'init', '-q', '--bare', '-b', 'main')
  r.git(repo, 'remote', 'add', 'origin', bare)
  r.git(repo, 'push', '-q', '-u', 'origin', 'main')
  r.git(repo, 'checkout', '-q', '-b', run)
  const config = { specPath: 'spec.md', gitMode: 'stack', defaultBranch: 'main', commitFormat: '', runBranch: run, ...cfg }
  mkdirSync(join(repo, '.sdlc'), { recursive: true })
  const files = { 'config.json': config, 'requirements.json': [], 'slices.json': slices, 'milestones.json': milestones }
  for (const [n, v] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', n), JSON.stringify(v, null, 2))
  writeFileSync(join(repo, '.sdlc', 'log.jsonl'), '')
  writeFileSync(join(repo, '.sdlc', 'DECISIONS.md'), '# D\n')
  if (repoFile !== undefined) writeFileSync(join(repo, '.sdlc', 'branch-format'), repoFile)
  r.git(repo, 'add', '-A')
  r.git(repo, 'commit', '-q', '-m', 'bootstrap')
  r.git(repo, 'push', '-q', '-u', 'origin', run)
  return { repo, bare }
}
const branchesOf = (r, repo) => r.git(repo, 'branch', '--format=%(refname:short)').split('\n').filter(Boolean).sort()
const patch = (r, repo, id, body = { phase: 'tests' }, opts = {}) => r.run('state-write.py', ['patch-slice', '--repo', repo, '--slice', id], { input: JSON.stringify(body), ...opts })
const base = (r, repo, id) => r.run('state-write.py', ['base-branch', '--repo', repo, '--slice', id])

test('verify cli VS-1: patch-slice cuts slice from milestone under custom format', () => {
  const r = cliRunner()
  const { repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' } })
  const t = patch(r, repo, 'S-001')
  note('TC-cli-1', t)
  assert.equal(t.status, 0)
  assert.equal(t.json.branch, 'feature/PROJ-1-S-001')
  const b = branchesOf(r, repo)
  assert.ok(b.includes('feature/PROJ-1-S-001') && b.includes('feature/PROJ-1-M-1'))
  assert.ok(!b.some(x => x === 'sdlc/S-001' || x === 'sdlc/M-1'))
  r.git(repo, 'merge-base', '--is-ancestor', 'feature/PROJ-1-M-1', 'feature/PROJ-1-S-001')
  const rb = r.git(repo, 'ls-remote', '--heads', 'origin').split('\n').map(l => l.split('\t')[1])
  assert.ok(rb.includes('refs/heads/feature/PROJ-1-M-1'), rb.join(','))
})

test('verify cli VS-1: lowercase format and default format and repo file', () => {
  let r = cliRunner()
  let { repo } = stack(r, { cfg: { branchFormat: 'feature/{name:lower}' } })
  let t = patch(r, repo, 'S-001'); note('TC-cli-2 lower', t)
  assert.equal(t.json.branch, 'feature/s-001')
  assert.ok(branchesOf(r, repo).includes('feature/m-1'))
  r = cliRunner(); ({ repo } = stack(r))
  t = patch(r, repo, 'S-001'); note('TC-cli-2 default', t)
  assert.equal(t.json.branch, 'sdlc/S-001')
  assert.ok(branchesOf(r, repo).includes('sdlc/M-1'))
  r = cliRunner(); ({ repo } = stack(r, { repoFile: 'team/{name}\n' }))
  t = patch(r, repo, 'S-001'); note('TC-cli-2 repofile', t)
  console.log('repofile', t.status, JSON.stringify(t.json), branchesOf(r, repo))
})

test('verify cli VS-1: hostile slice ids refused cleanly, tree unchanged', () => {
  const r = cliRunner()
  const { repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' } })
  const vals = ['traversal', 'flag-like-values', 'unicode-digits', 'control-chars', 'injection', 'unicode-whitespace', 'oversized'].flatMap(f => load(f, { argv: true }))
  let n = 0
  const leaked = []
  for (const e of vals) {
    for (const cmd of ['patch', 'base']) {
      const t = cmd === 'patch' ? patch(r, repo, e.value) : base(r, repo, e.value)
      n++
      assert.ok(!/Traceback/.test(t.stderr), `${e.id} ${cmd}: traceback ${t.stderr.slice(-200)}`)
      assert.notEqual(t.status, 0, `${e.id} ${cmd} exit`)
      assert.ok((t.json && t.json.ok === false) || /^usage:/.test(t.stderr), `${e.id} ${cmd} json ${t.stdout} ${t.stderr}`)
      if (cmd === 'base') assert.equal(t.tree[repo].diff.empty, true, `${e.id} base tree`)
      else if (!t.tree[repo].diff.empty) leaked.push(`${e.id}: ${t.tree[repo].diff.added.join(',')}`)
      if (!t.tree[repo].diff.empty) r.git(repo, 'checkout', '-q', 'sdlc/run-1')
    }
  }
  console.log('hostile cases', n, 'leaked branches from patch-slice of unknown ids:', JSON.stringify(leaked))
})

test('verify cli VS-1: slice in slices.json with hostile id', () => {
  const r = cliRunner()
  const ids = ['S-001/../../x', 'S-1 2', 'S-001..x', '-S', 'S-٣', 'S-001\u0000']
  for (const id of ids) {
    const { repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' }, slices: [slice(id)], milestones: [] })
    const before = branchesOf(r, repo)
    const t = patch(r, repo, id); const b = base(r, repo, id)
    note(`TC-cli-3 ${JSON.stringify(id)}`, t)
    console.log(JSON.stringify(id), t.status, t.stdout.trim().slice(0, 120), '|', b.status, b.stdout.trim().slice(0, 100))
    assert.ok(!/Traceback/.test(t.stderr + b.stderr))
    if (t.status !== 0) assert.deepEqual(branchesOf(r, repo), before)
  }
})

test('verify cli VS-2: awaiting-merge dep branch via format; decoy; fallbacks', () => {
  const r = cliRunner()
  const mk = (depStatus, depBranch) => {
    const s = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' }, slices: [slice('S-001', { status: depStatus }), slice('S-002', { dependsOn: ['S-001'] })] })
    if (depBranch) r.git(s.repo, 'branch', depBranch, 'sdlc/run-1')
    r.git(s.repo, 'branch', 'sdlc/S-001', 'sdlc/run-1')
    return s.repo
  }
  let repo = mk('awaiting-merge', 'feature/PROJ-1-S-001')
  r.git(repo, 'checkout', '-q', 'feature/PROJ-1-S-001'); writeFileSync(join(repo, 'src/dep.txt'), 'dep\n'); r.git(repo, 'add', '-A'); r.git(repo, 'commit', '-q', '-m', 'dep work'); r.git(repo, 'checkout', '-q', 'sdlc/run-1')
  let b = base(r, repo, 'S-002'); note('TC-cli-4 base', b)
  assert.equal(b.json.branch, 'feature/PROJ-1-S-001')
  let t = patch(r, repo, 'S-002'); note('TC-cli-4 patch', t)
  assert.equal(t.json.branch, 'feature/PROJ-1-S-002')
  assert.ok(r.exec('git', ['-C', repo, 'cat-file', '-e', 'feature/PROJ-1-S-002:src/dep.txt']).status === 0, 'cut from dep branch')
  repo = mk('in_progress', 'feature/PROJ-1-S-001')
  b = base(r, repo, 'S-002'); note('TC-cli-5 not awaiting', b)
  assert.equal(b.json.branch, 'feature/PROJ-1-M-1')
  repo = mk('awaiting-merge', null)
  b = base(r, repo, 'S-002'); note('TC-cli-6 branch gone', b)
  assert.equal(b.json.branch, 'feature/PROJ-1-M-1')
  t = patch(r, repo, 'S-002'); assert.equal(t.json.branch, 'feature/PROJ-1-S-002')
  assert.ok(!branchesOf(r, repo).includes('feature/PROJ-1-S-001'))
})

test('verify cli VS-3: base-branch milestone, lower, shipped, no milestone, unknown, bad format', () => {
  const r = cliRunner()
  let { repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' } })
  let b = base(r, repo, 'S-001'); note('TC-cli-7', b)
  assert.equal(b.json.branch, 'feature/PROJ-1-M-1'); assert.equal(b.treeUnchanged, true)
  ;({ repo } = stack(r, { cfg: { branchFormat: 'feature/{name:lower}' } }))
  assert.equal(base(r, repo, 'S-001').json.branch, 'feature/m-1')
  ;({ repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}', runBranch: 'feature/PROJ-1-run-1' }, run: 'feature/PROJ-1-run-1', milestones: [{ id: 'M-1', slices: ['S-001'], status: 'verified' }] }))
  b = base(r, repo, 'S-001'); note('TC-cli-8 shipped', b)
  assert.equal(b.json.branch, 'feature/PROJ-1-run-1')
  ;({ repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' }, milestones: [] }))
  b = base(r, repo, 'S-001'); assert.equal(b.json.branch, 'sdlc/run-1')
  b = base(r, repo, 'S-999'); note('TC-cli-9 unknown', b)
  assert.notEqual(b.status, 0); assert.equal(b.json.ok, false); assert.ok(!/Traceback/.test(b.stderr))
  for (const bad of ['feature/none', 'a/{name}/{name}', 'a/{name:lower}{name}', 'has space/{name}', 'x~/{name}', 'a/{name}.lock', '{x}/{name}', '/{name}', 'a//{name}', '{name}']) {
    ;({ repo } = stack(r, { cfg: { branchFormat: bad } }))
    for (const [nm, t] of [['base', base(r, repo, 'S-001')], ['patch', patch(r, repo, 'S-001')]]) {
      note(`TC-cli-10 ${bad} ${nm}`, t)
      console.log('badfmt', JSON.stringify(bad), nm, t.status, t.stdout.trim().slice(0, 140), /Traceback/.test(t.stderr) ? 'TRACEBACK' : '')
      assert.ok(!/Traceback/.test(t.stderr), `${bad} ${nm} traceback`)
    }
  }
})

test('verify cli VS-3/7: non-string, empty, broken repo file', () => {
  const r = cliRunner()
  for (const [label, cfg, repoFile] of [['number', { branchFormat: 5 }], ['list', { branchFormat: ['a'] }], ['empty->repo file', { branchFormat: '' }, 'team/{name}\n'], ['empty->default', { branchFormat: '' }], ['broken file', {}, 'no placeholder\n'], ['broken file2', {}, '{name}{name}\n'], ['empty file', {}, '']]) {
    const { repo } = stack(r, { cfg, repoFile })
    const bb = base(r, repo, 'S-001'); const t = patch(r, repo, 'S-001')
    note(`TC-cli-11 ${label}`, t)
    console.log('fmt', label, '| base', bb.status, bb.stdout.trim().slice(0, 130), '| patch', t.status, t.stdout.trim().slice(0, 130), '| tree', t.treeUnchanged, branchesOf(r, repo).join(','))
    assert.ok(!/Traceback/.test(bb.stderr + t.stderr), label)
  }
})

test('verify cli VS-4/5: prune keeps milestone with open slice PR', () => {
  const r = cliRunner()
  const f = 'feature/PROJ-1-{name}'
  const s = stack(r, { cfg: { branchFormat: f, runBranch: 'feature/PROJ-1-run-2' }, run: 'feature/PROJ-1-run-2', slices: [slice('S-001', { status: 'awaiting-merge' }), slice('S-002'), slice('S-003')], milestones: [{ id: 'M-1', slices: ['S-001'], status: 'pending' }, { id: 'M-2', slices: ['S-002'], status: 'pending' }, { id: 'M-3', slices: ['S-003'], status: 'pending' }] })
  const { repo } = s
  const decoy = {}
  // shipped branches: M-1, M-2 pushed, merged into main via squash
  r.git(repo, 'checkout', '-q', 'main')
  const mkShipped = (name, file) => {
    r.git(repo, 'checkout', '-q', '-b', name, 'main'); writeFileSync(join(repo, 'src', file), file + '\n'); r.git(repo, 'add', '-A'); r.git(repo, 'commit', '-q', '-m', name); r.git(repo, 'push', '-q', '-u', 'origin', name)
  }
  const names = ['feature/PROJ-1-M-1', 'feature/PROJ-1-M-2']
  names.forEach((n, i) => mkShipped(n, `f${i}.txt`))
  const extras = ['feature/PROJ-1-M-1-e2e', 'feature/PROJ-1-S-001-x', 'feature/PROJ-1-run-1', 'feature/other', 'feature/PROJ-1-M-1/extra', 'xfeature/PROJ-1-M-2', 'feature/PROJ-1-M-0x', 'feature/PROJ-1-M-1-x']
  r.git(repo, 'checkout', '-q', 'main')
  for (const e of extras) try { r.git(repo, 'branch', e, 'main') } catch (err) { console.log('cannot create', e) }
  // make main contain shipped work: squash merge locally and push
  r.git(repo, 'merge', '-q', '--squash', names[0]); r.git(repo, 'commit', '-q', '-m', 'M-1 sq')
  r.git(repo, 'merge', '-q', '--squash', names[1]); r.git(repo, 'commit', '-q', '-m', 'M-2 sq')
  r.git(repo, 'push', '-q', 'origin', 'main')
  r.git(repo, 'checkout', '-q', 'feature/PROJ-1-run-2')
  r.git(repo, 'fetch', '-q', 'origin')
  const before = branchesOf(r, repo)
  const t = patch(r, repo, 'S-003'); note('TC-cli-12 prune', t)
  const after = branchesOf(r, repo)
  console.log('status', t.status, t.stdout.slice(0, 200), t.stderr.slice(0, 300))
  console.log('before', before.join(' '))
  console.log('after ', after.join(' '))
  assert.equal(t.status, 0)
  assert.ok(after.includes('feature/PROJ-1-M-1'), 'M-1 kept (open slice PR)')
  assert.ok(!after.includes('feature/PROJ-1-M-2'), 'M-2 deleted')
  for (const e of extras) if (before.includes(e)) assert.ok(after.includes(e), `${e} kept`)
  assert.ok(after.includes('feature/PROJ-1-M-3'), 'M-3 created')
})

test('verify cli VS-5: default format prune; worktree-held branch stays; file has no regex', () => {
  const r = cliRunner()
  const { repo } = stack(r, { run: 'sdlc/run-2', cfg: { runBranch: 'sdlc/run-2' }, slices: [slice('S-001'), slice('S-002')], milestones: [{ id: 'M-1', slices: ['S-001'], status: 'pending' }, { id: 'M-2', slices: ['S-002'], status: 'pending' }] })
  r.git(repo, 'checkout', '-q', 'main')
  const mk = (n, f) => { r.git(repo, 'checkout', '-q', '-b', n, 'main'); writeFileSync(join(repo, 'src', f), f); r.git(repo, 'add', '-A'); r.git(repo, 'commit', '-q', '-m', n); r.git(repo, 'push', '-q', '-u', 'origin', n); r.git(repo, 'checkout', '-q', 'main') }
  mk('sdlc/M-1', 'a'); mk('sdlc/M-5', 'b')
  r.git(repo, 'branch', 'sdlc/M-1-e2e', 'main')
  r.git(repo, 'merge', '-q', '--squash', 'sdlc/M-1'); r.git(repo, 'commit', '-q', '-m', 'sq1')
  r.git(repo, 'merge', '-q', '--squash', 'sdlc/M-5'); r.git(repo, 'commit', '-q', '-m', 'sq5')
  r.git(repo, 'push', '-q', 'origin', 'main')
  const wt = r.dir('wt'); r.exec('rm', ['-rf', wt]); r.git(repo, 'worktree', 'add', wt, 'sdlc/M-5')
  r.git(repo, 'checkout', '-q', 'sdlc/run-2'); r.git(repo, 'fetch', '-q', 'origin')
  const t = patch(r, repo, 'S-002'); note('TC-cli-13', t)
  const after = branchesOf(r, repo)
  console.log('after', after.join(' '))
  assert.equal(t.status, 0)
  assert.ok(!after.includes('sdlc/M-1'), 'M-1 deleted')
  assert.ok(after.includes('sdlc/M-1-e2e'), 'e2e kept')
  assert.ok(after.includes('sdlc/M-5'), 'worktree branch kept')
  const src = readFileSync(`${WT}/skills/sdlc/state-write.py`, 'utf8')
  assert.ok(!src.includes('MILESTONE_BRANCH') && !src.includes('sdlc/{'))
})

test('verify cli VS-6: run branch stays full name and is advanced', () => {
  for (const [fmt, run] of [['feature/PROJ-1-{name}', 'feature/PROJ-1-run-1'], [null, 'sdlc/run-1'], ['feature/PROJ-1-{name}', 'other/odd-run']]) {
    const r = cliRunner()
    const cfg = fmt ? { branchFormat: fmt } : {}
    const { repo } = stack(r, { cfg: { ...cfg, runBranch: run }, run })
    const pub = r.dir('pub'); r.exec('rm', ['-rf', pub]); r.exec('git', ['clone', '-q', r.git(repo, 'remote', 'get-url', 'origin'), pub])
    r.git(pub, 'config', 'user.email', 't@e.x'); r.git(pub, 'config', 'user.name', 'T')
    writeFileSync(join(pub, 'moved.txt'), 'm'); r.git(pub, 'add', '-A'); r.git(pub, 'commit', '-q', '-m', 'main moved'); r.git(pub, 'push', '-q', 'origin', 'HEAD:main')
    const cfgBefore = readFileSync(join(repo, '.sdlc/config.json'), 'utf8')
    const t = patch(r, repo, 'S-001'); note(`TC-cli-14 ${run}`, t)
    const mname = fmt ? 'feature/PROJ-1-M-1' : 'sdlc/M-1'
    console.log(run, t.status, t.stdout.trim().slice(0, 150), t.stderr.slice(0, 200), branchesOf(r, repo).join(','))
    assert.equal(t.status, 0)
    assert.equal(readFileSync(join(repo, '.sdlc/config.json'), 'utf8'), cfgBefore)
    const runTip = r.git(repo, 'rev-parse', run)
    const mainTip = r.git(pub, 'rev-parse', 'HEAD')
    console.log('run branch contains moved main:', r.exec('git', ['-C', repo, 'merge-base', '--is-ancestor', mainTip, run]).status === 0, 'M contains main:', r.exec('git', ['-C', repo, 'merge-base', '--is-ancestor', mainTip, mname]).status === 0)
  }
})

test('verify cli: gh-free (no network) - prune uses no gh', () => {
  const gh = stubServer({ script: [] })
  const r = cliRunner()
  const { repo } = stack(r, { cfg: { branchFormat: 'feature/PROJ-1-{name}' } })
  const t = patch(r, repo, 'S-001', { phase: 'tests' }, { env: gh.env() })
  assert.equal(t.status, 0)
  console.log('gh calls', gh.calls().length)
})
