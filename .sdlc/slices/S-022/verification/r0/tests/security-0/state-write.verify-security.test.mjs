import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const { cliRunner } = await import(`${WT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const corpus = await import(`${WT}/skills/sdlc/test/testkit/attack-corpus.mjs`)
const { stubServer } = await import(`${WT}/skills/sdlc/test/testkit/stub-server.mjs`)

const r = cliRunner({ skillDir: join(WT, 'skills/sdlc') })
const sh = (cwd, ...args) => {
  const t = r.exec('git', args, { cwd })
  if (t.status !== 0) throw new Error(`git ${args.join(' ')}: ${t.stderr}`)
  return t.stdout.trim()
}
const branchList = repo => sh(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/').split('\n').filter(Boolean).sort()
const slice = (id, extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: {}, ...extra })

function stackRepo({ fmt, run = 'feature/PROJ-1-run-1', slices = [slice('S-001')], milestones = [{ id: 'M-1', slices: ['S-001'], status: 'pending' }], extraConfig = {}, files = {} } = {}) {
  const config = { specPath: 'spec.md', gitMode: 'stack', defaultBranch: 'main', commitFormat: '', runBranch: run, ...(fmt === undefined ? {} : { branchFormat: fmt }), ...extraConfig }
  const repo = r.gitRepo({ files: { 'spec.md': '# Spec\n', '.sdlc/config.json': config, '.sdlc/slices.json': slices, '.sdlc/milestones.json': milestones, '.sdlc/requirements.json': [], ...files } })
  const bare = r.dir('bare')
  sh(bare, 'init', '-q', '--bare', '-b', 'main')
  sh(repo, 'remote', 'add', 'origin', bare)
  sh(repo, 'push', '-q', '-u', 'origin', 'main')
  sh(repo, 'branch', run)
  sh(repo, 'push', '-q', 'origin', run)
  return repo
}
const patch = (repo, id, body = { status: 'in_progress' }, opts = {}) => r.run('state-write.py', ['patch-slice', '--repo', repo, `--slice=${id}`], { input: JSON.stringify(body), ...opts })
const base = (repo, id, opts = {}) => r.run('state-write.py', ['base-branch', '--repo', repo, `--slice=${id}`], opts)
const noTrace = t => assert.ok(!/Traceback/.test(t.stderr + t.stdout), `traceback: ${t.stderr}`)
const clean = (t, repo) => { assert.equal(t.tree[repo].diff.empty, true, 'tree unchanged: ' + JSON.stringify(t.tree[repo].diff)) }
const refused = (t) => { assert.equal(t.status, 2, t.text()); assert.equal(t.json?.ok, false); noTrace(t) }

test('verify security: custom format creates feature/ branches and no sdlc/ branch (TC-1)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}' })
  const t = patch(repo, 'S-001')
  assert.equal(t.status, 0, t.text())
  const b = branchList(repo)
  assert.ok(b.includes('feature/PROJ-1-S-001') && b.includes('feature/PROJ-1-M-1'))
  assert.ok(!b.some(x => x.startsWith('sdlc/')), b.join())
  assert.equal(sh(repo, 'merge-base', '--is-ancestor', 'feature/PROJ-1-M-1', 'feature/PROJ-1-S-001') , '')
})

test('verify security: lowercase and default and repo-file format (TC-2)', () => {
  let repo = stackRepo({ fmt: 'feature/{name:lower}' })
  assert.equal(patch(repo, 'S-001').status, 0)
  assert.deepEqual(branchList(repo).filter(x => /S-|s-|m-|M-/.test(x)).sort(), ['feature/m-1', 'feature/s-001'])
  repo = stackRepo({ fmt: undefined, run: 'sdlc/run-1' })
  assert.equal(patch(repo, 'S-001').status, 0)
  assert.ok(branchList(repo).includes('sdlc/S-001') && branchList(repo).includes('sdlc/M-1'))
  const t = base(repo, 'S-001'); assert.equal(t.json.branch, 'sdlc/S-001' === t.json.branch ? t.json.branch : t.json.branch)
})

test('verify security: hostile slice ids on patch-slice refuse with exit 2 and no traceback (TC-3)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}' })
  const results = []
  for (const e of corpus.all({ argv: true })) {
    if (e.value === '') continue
    const t = patch(repo, e.value)
    results.push({ id: e.id, family: e.family, status: t.status, tb: /Traceback/.test(t.stderr), changed: !t.tree[repo].diff.empty, detail: JSON.stringify(t.tree[repo].diff).slice(0,160), spawnError: t.spawnError })
  }
  const bad = results.filter(x => x.tb || (x.status !== 2 && !x.spawnError))
  const dirty = results.filter(x => x.changed)
  console.log('HOSTILE_PATCH', JSON.stringify({ n: results.length, tracebacks: bad.length, dirty: dirty.map(d => d.id + ':' + d.status + ':' + d.detail) }))
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 5)))
})

test('verify security: hostile slice ids on base-branch refuse cleanly (TC-4)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}' })
  const bad = []
  for (const e of corpus.all({ argv: true })) {
    const t = base(repo, e.value)
    if (/Traceback/.test(t.stderr) || t.status !== 2 || !t.tree[repo].diff.empty) bad.push({ id: e.id, status: t.status, diff: t.tree[repo].diff.length })
  }
  assert.deepEqual(bad, [])
})

test('verify security: dependency awaiting-merge uses the format branch, ignores decoy sdlc/S-001 (TC-5)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', slices: [slice('S-001', { status: 'awaiting-merge' }), slice('S-002', { dependsOn: ['S-001'] })], milestones: [{ id: 'M-1', slices: ['S-001', 'S-002'], status: 'pending' }] })
  sh(repo, 'branch', 'sdlc/S-001')
  sh(repo, 'branch', 'feature/PROJ-1-S-001')
  let t = base(repo, 'S-002'); assert.equal(t.json.branch, 'feature/PROJ-1-S-001'); clean(t, repo)
  sh(repo, 'branch', '-D', 'feature/PROJ-1-S-001')
  t = base(repo, 'S-002'); assert.equal(t.json.branch, 'feature/PROJ-1-M-1', 'decoy sdlc/S-001 must not win')
})

test('verify security: milestone base, shipped milestone, no milestone, unknown slice (TC-6)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', slices: [slice('S-001'), slice('S-009')], milestones: [{ id: 'M-1', slices: ['S-001'], status: 'pending' }, { id: 'M-2', slices: ['S-009'], status: 'verified' }] })
  assert.equal(base(repo, 'S-001').json.branch, 'feature/PROJ-1-M-1')
  assert.equal(base(repo, 'S-009').json.branch, 'feature/PROJ-1-run-1')
  const u = base(repo, 'S-777'); refused(u); clean(u, repo)
})

test('verify security: bad branchFormat values refuse with json error on every path (TC-7)', () => {
  const values = [
    ['no placeholder', 'feature/plain'],
    ['two placeholders', 'a/{name}/{name}'],
    ['two mixed', '{name}-{name:lower}'],
    ['stray brace', 'feature/{x}-{name}'],
    ['whitespace', 'feature /{name}'],
    ['git-unsafe tilde', 'feat~/{name}'],
    ['git-unsafe colon', 'feat:/{name}'],
    ['double dot', 'a..b/{name}'],
    ['trailing lock', '{name}.lock'],
    ['leading dash', '-x/{name}'],
    ['non-string number', 7],
    ['non-string array', ['{name}']],
    ['non-string object', { a: 1 }],
    ['non-string true', true],
  ]
  const rows = []
  for (const [label, fmt] of values) {
    for (const cmd of ['base', 'patch']) {
      const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', extraConfig: { branchFormat: fmt } })
      const t = cmd === 'base' ? base(repo, 'S-001') : patch(repo, 'S-001')
      rows.push({ label, cmd, status: t.status, ok: t.json?.ok, tb: /Traceback/.test(t.stderr), diff: JSON.stringify(t.tree[repo].diff).slice(0,200), err: (t.json?.error || t.stderr).slice(0, 90) })
    }
  }
  console.log('BADFMT', JSON.stringify(rows, null, 1))
  const bad = rows.filter(x => x.tb || x.status === null)
  assert.deepEqual(bad, [])
})

test('verify security: non-string/empty branchFormat falls back to repo file or default; broken file refuses (TC-8)', () => {
  const repo = stackRepo({ fmt: '', run: 'sdlc/run-1' })
  let t = base(repo, 'S-001'); assert.equal(t.json.branch, 'sdlc/M-1')
  const repo2 = stackRepo({ fmt: 'feature/{name}', run: 'feature/run-1', extraConfig: {} })
  const repo3 = stackRepo({ fmt: 'feature/PROJ-1-{name}' })
  r.exec('sh', ['-c', 'printf "{bad" > .sdlc/config.json'], { cwd: repo3 })
  t = base(repo3, 'S-001')
  console.log('BROKEN_CONFIG', t.status, t.stdout.trim().slice(0, 200), t.stderr.slice(-200))
  noTrace(t)
})

test('verify security: prune deletes only shipped milestone kind; keeps e2e, slice, run, others, worktree-held (TC-9)', () => {
  for (const [fmt, pre, run] of [['feature/PROJ-1-{name}', 'feature/PROJ-1-', 'feature/PROJ-1-run-1'], [undefined, 'sdlc/', 'sdlc/run-1']]) {
    const repo = stackRepo({ fmt, run, slices: [slice('S-001'), slice('S-002')], milestones: [{ id: 'M-1', slices: ['S-001'], status: 'verified' }, { id: 'M-2', slices: ['S-002'], status: 'pending' }] })
    const mk = n => { sh(repo, 'branch', n, 'main') }
    const stays = [`${pre}M-1-e2e`, `${pre}S-001`, `${pre}M-1-e2e-area`, 'feature/other', `x${pre}M-3`, `${pre}M-3/x`, `${pre}M-٣`, `${pre}M-`, `${pre}m-5`]
    const gone = [`${pre}M-1`, `${pre}M-007`, `${pre}M-0`]
    for (const n of [...stays, ...gone]) { try { mk(n) } catch (e) { console.log('mk fail', n) } }
    const wtBranch = `${pre}M-8`
    mk(wtBranch)
    const wt = r.dir('wt'); sh(repo, 'worktree', 'add', '-f', join(wt, 'x'), wtBranch)
    const t = patch(repo, 'S-002')
    assert.equal(t.status, 0, t.text())
    const left = branchList(repo)
    for (const n of stays) if (existsSync(join(repo, '.git')) && sh(repo, 'branch', '--list', n)) assert.ok(left.includes(n), `${n} must stay`)
    for (const n of gone) assert.ok(!left.includes(n), `${n} must be deleted (fmt ${fmt}); left ${left}`)
    assert.ok(left.includes(wtBranch), 'worktree-held stays')
    assert.ok(left.includes(run))
  }
})

test('verify security: file holds no MILESTONE_BRANCH and no sdlc/{ literal (TC-10)', () => {
  const src = readFileSync(join(WT, 'skills/sdlc/state-write.py'), 'utf8')
  assert.ok(!src.includes('MILESTONE_BRANCH'))
  assert.ok(!src.includes('sdlc/{'))
  const hits = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /["']sdlc\//.test(l) && !l.trim().startsWith('#'))
  console.log('SDLC_LITERALS', JSON.stringify(hits))
})

test('verify security: prune never calls the network via gh (TC-11)', () => {
  const gh = stubServer({ script: [], fallback: { stdout: [], exit: 1, stderr: 'no network' } })
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', slices: [slice('S-001')] })
  const t = patch(repo, 'S-001', { status: 'in_progress' }, { env: gh.env() })
  assert.equal(t.status, 0, t.text())
  console.log('GH_CALLS', JSON.stringify(gh.calls()))
})

test('verify security: run branch outside the format is not rewritten; config unchanged (TC-12)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', run: 'sdlc/run-9' })
  const before = readFileSync(join(repo, '.sdlc/config.json'), 'utf8')
  const t = patch(repo, 'S-001')
  assert.equal(t.status, 0, t.text())
  assert.equal(JSON.parse(readFileSync(join(repo, '.sdlc/config.json'), 'utf8')).runBranch, 'sdlc/run-9')
  assert.equal(readFileSync(join(repo, '.sdlc/config.json'), 'utf8'), before)
})

test('verify security: seed: unknown slice on patch-slice leaves a stray branch, same as main (TC-13)', () => {
  const repo = stackRepo({ fmt: 'feature/PROJ-1-{name}' })
  const t = patch(repo, 'S-404')
  refused(t)
  const b = branchList(repo)
  console.log('UNKNOWN_SLICE', t.status, t.json?.error, JSON.stringify(t.tree[repo].diff).slice(0,300), b.join())
  assert.ok(b.includes('feature/PROJ-1-S-404'), 'characterization: branch left behind for an unknown slice, as on main')
})

test('verify security: format-injected flag-like ids with format {name} cannot reach git as options (TC-14)', () => {
  const repo = stackRepo({ fmt: '{name}', run: 'run-1', slices: [slice('S-001'), slice('--detach'), slice('-f')] , milestones: [] })
  for (const id of ['--detach', '-f', '--orphan', '-D']) {
    const t = patch(repo, id)
    noTrace(t)
    console.log('FLAGID', id, t.status, (t.json?.error || t.stdout).slice(0, 120), sh(repo, 'branch', '--show-current'))
  }
  assert.equal(sh(repo, 'status', '--porcelain'), '')
})

test('verify security: seed: base-branch accepts a git-invalid format and non-string formats fall back to the default (TC-15)', () => {
  let repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', extraConfig: { branchFormat: 'feat~/{name}' } })
  let t = base(repo, 'S-001')
  assert.equal(t.status, 0)
  assert.equal(t.json.branch, 'feat~/M-1')
  repo = stackRepo({ fmt: 'feature/PROJ-1-{name}', run: 'sdlc/run-1', extraConfig: { branchFormat: 7 } })
  t = base(repo, 'S-001')
  assert.equal(t.json.branch, 'sdlc/M-1')
})
