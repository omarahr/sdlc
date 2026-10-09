import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const SKILL = process.env.VERIFY_SKILL_DIR
const r = cliRunner({ skillDir: SKILL })
const list = (repo, kind, extra = []) => r.run('branches.py', ['list', '--repo', repo, '--kind', kind, ...extra])
const names = (t) => t.json.branches.map((b) => b.branch)
const KEYS = ['branches', 'command', 'format', 'kind', 'ok']

const wide = () => r.gitRepo({ branches: [
  'sdlc/S-002', 'sdlc/S-001', 'sdlc/S-fix-M-1-2', 'sdlc/M-1', 'sdlc/run-1', 'sdlc/state-20261008101500',
  'sdlc/S-001-attempt-1', 'sdlc/S-001-v0-http-api-0', 'sdlc/feature-x', 'sdlc/M-1-e2e', 'sdlc/M-1-e2e-api', 'other/S-009', 'S-003',
] })

test('verify cli TC-cli-1: list --kind slice returns only slices sorted by name', () => {
  const repo = wide()
  const t = list(repo, 'slice')
  console.log(t.text())
  assert.equal(t.status, 0)
  assert.equal(t.stderr, '')
  assert.deepEqual(Object.keys(t.json).sort(), KEYS)
  assert.deepEqual(names(t), ['sdlc/S-001', 'sdlc/S-002', 'sdlc/S-fix-M-1-2'])
  for (const b of t.json.branches) { assert.equal(b.kind, 'slice'); assert.equal(b.id, b.tail); assert.equal(b.known, null) }
  assert.ok(t.treeUnchanged)
})

test('verify cli TC-cli-2: run and attempt sort by n as integers, ties by branch name', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-100', 'sdlc/run-10', 'sdlc/run-2', 'sdlc/run-1',
    'sdlc/S-002-attempt-2', 'sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-100', 'sdlc/S-003-attempt-1'] })
  const run = list(repo, 'run')
  console.log(run.text())
  assert.deepEqual(run.json.branches.map((b) => b.n), [1, 2, 10, 100])
  for (const b of run.json.branches) assert.equal(typeof b.n, 'number')
  assert.match(run.stdout, /"n": 10,/)
  const att = list(repo, 'attempt')
  console.log(att.text())
  assert.deepEqual(names(att), ['sdlc/S-001-attempt-1', 'sdlc/S-003-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-002-attempt-2', 'sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-100'])
  for (const b of att.json.branches) assert.ok(Number.isInteger(b.n) && b.id)
})

test('verify cli TC-cli-3: remote refs, tags, detached HEAD and foreign branches never appear', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001', 'main2'] })
  const head = r.git(repo, 'rev-parse', 'HEAD')
  r.git(repo, 'update-ref', 'refs/remotes/origin/sdlc/S-009', head)
  r.git(repo, 'tag', 'sdlc/S-008')
  r.git(repo, 'tag', 'sdlc/S-001')
  r.git(repo, 'tag', 'heads/sdlc/S-001')
  r.git(repo, 'update-ref', 'refs/notes/sdlc/S-007', head)
  r.git(repo, 'update-ref', 'refs/stash2/sdlc/S-006', head)
  const t = list(repo, 'slice')
  console.log(t.text())
  assert.deepEqual(names(t), ['sdlc/S-001'])
  r.git(repo, 'checkout', '-q', '--detach')
  const d = list(repo, 'slice')
  console.log(d.text())
  assert.deepEqual(names(d), ['sdlc/S-001'])
  assert.equal(d.status, 0)
})

test('verify cli TC-cli-4: format override, config format, lower placeholder, invalid format', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001', 'feature/PROJ-1-S-001', 'feature/lo-s-001', 'feature/PROJ-1-S-002'] })
  const over = list(repo, 'slice', ['--format', 'feature/PROJ-1-{name}'])
  console.log(over.text())
  assert.deepEqual(names(over), ['feature/PROJ-1-S-001', 'feature/PROJ-1-S-002'])
  assert.equal(over.json.format, 'feature/PROJ-1-{name}')
  const low = list(repo, 'slice', ['--format', 'feature/lo-{name:lower}'])
  console.log(low.text())
  assert.deepEqual(names(low), ['feature/lo-s-001'])
  const cfgRepo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name}' } }, branches: ['sdlc/S-001', 'feature/PROJ-1-S-001'] })
  const cfg = list(cfgRepo, 'slice')
  console.log(cfg.text())
  assert.deepEqual(names(cfg), ['feature/PROJ-1-S-001'])
  const ov2 = list(cfgRepo, 'slice', ['--format', 'sdlc/{name}'])
  assert.deepEqual(names(ov2), ['sdlc/S-001'])
  const def = list(r.gitRepo({ branches: ['sdlc/S-001'] }), 'slice')
  assert.equal(def.json.format, 'sdlc/{name}')
  const bad = list(repo, 'slice', ['--format', 'no-placeholder'])
  const badB = list(repo, 'slice', ['--format', 'x/{name}{'])
  console.log(bad.text(), badB.text())
  for (const b of [bad, badB]) { assert.equal(b.status, 2); assert.equal(b.json.ok, false); assert.doesNotMatch(b.stderr, /Traceback/) }
  const parseBad = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'x', '--format', 'no-placeholder'])
  assert.equal(parseBad.status, bad.status)
  assert.equal(parseBad.json.error, bad.json.error)
  const badCfg = r.gitRepo({ files: { '.sdlc/config.json': '{nope' }, branches: [] })
  const bc = list(badCfg, 'slice')
  console.log(bc.text())
  assert.equal(bc.status, 2); assert.doesNotMatch(bc.stderr, /Traceback/)
})

test('verify cli TC-cli-5: empty repo and non-git paths give defined results, tree unchanged', () => {
  const empty = r.dir('empty'); r.git(empty, 'init', '-q', '-b', 'main')
  const e = list(empty, 'slice'); console.log(e.text())
  assert.equal(e.status, 0); assert.deepEqual(e.json.branches, []); assert.ok(e.treeUnchanged)
  const unborn = r.dir('unborn'); r.git(unborn, 'init', '-q', '-b', 'main'); r.git(unborn, 'checkout', '-q', '-b', 'sdlc/S-001')
  const u = list(unborn, 'slice'); console.log(u.text())
  assert.equal(u.status, 0)
  console.log('unborn branch listed:', JSON.stringify(names(u)))
  const plain = r.dir('plain')
  const p = list(plain, 'slice'); console.log(p.text())
  assert.equal(p.status, 2); assert.equal(p.json.ok, false); assert.match(p.json.error, /not a git repository/); assert.doesNotMatch(p.stderr, /Traceback/); assert.ok(p.treeUnchanged)
  const missing = join(r.root, 'does-not-exist')
  const m = list(missing, 'slice'); console.log(m.text())
  assert.equal(m.status, 2); assert.equal(m.json.ok, false); assert.doesNotMatch(m.stderr, /Traceback/)
  const file = join(plain, 'afile'); writeFileSync(file, 'x')
  const f = list(file, 'slice'); console.log(f.text())
  assert.equal(f.status, 2); assert.equal(f.json.ok, false); assert.doesNotMatch(f.stderr, /Traceback/)
  const bare = r.dir('bare'); r.git(bare, 'init', '-q', '--bare', '-b', 'main')
  const src = r.gitRepo({ branches: ['sdlc/S-001'] })
  r.git(src, 'push', '-q', bare, 'sdlc/S-001')
  const b = list(bare, 'slice'); console.log(b.text())
  assert.doesNotMatch(b.stderr, /Traceback/)
  assert.ok([0, 2].includes(b.status)); assert.ok(b.json)
  if (b.status === 0) assert.deepEqual(names(b), ['sdlc/S-001'])
  const unk = list(src, 'nope'); console.log(unk.text())
  assert.equal(unk.status, 2); assert.equal(unk.json.ok, false)
  const noKind = r.run('branches.py', ['list', '--repo', src]); assert.equal(noKind.status, 2); assert.ok(noKind.json)
  const noRepo = r.run('branches.py', ['list', '--kind', 'slice']); assert.equal(noRepo.status, 2); assert.ok(noRepo.json)
  const extra = list(src, 'slice', ['--bogus', 'x']); assert.equal(extra.status, 2); assert.ok(extra.json)
  const emptyRepoArg = list('', 'slice'); console.log(emptyRepoArg.text())
  assert.doesNotMatch(emptyRepoArg.stderr, /Traceback/); assert.ok(emptyRepoArg.json)
})

test('verify cli TC-cli-6: each kind returns its parts and the branch and id keys', () => {
  const repo = wide()
  const want = {
    slice: { n: 3, key: { id: 'S-001' } },
    milestone: { n: 1, key: { id: 'M-1' } },
    run: { n: 1, key: { n: 1 } },
    state: { n: 1, key: { ts: '20261008101500' } },
    verify: { n: 1, key: { id: 'S-001', round: 0, profile: 'http-api', part: 0 } },
    attempt: { n: 1, key: { id: 'S-001', n: 1 } },
    e2e: { n: 1, key: { id: 'M-1' } },
    'e2e-area': { n: 1, key: { id: 'M-1', area: 'api' } },
  }
  for (const [kind, w] of Object.entries(want)) {
    const t = list(repo, kind)
    console.log(kind, t.stdout.trim())
    assert.equal(t.status, 0)
    assert.deepEqual(Object.keys(t.json).sort(), KEYS)
    assert.equal(t.json.kind, kind)
    assert.equal(t.json.branches.length, w.n)
    for (const b of t.json.branches) {
      assert.equal(typeof b.branch, 'string'); assert.equal(b.kind, kind); assert.equal(b.known, null)
      if (kind !== 'run' && kind !== 'state') assert.equal(typeof b.id, 'string')
    }
    assert.deepEqual(Object.fromEntries(Object.keys(w.key).map((k) => [k, t.json.branches[0][k]])), w.key)
    const parse = r.run('branches.py', ['parse', '--repo', repo, '--branch', t.json.branches[0].branch])
    const { ok, command, format, branch, ...parts } = parse.json
    assert.deepEqual(parts, (({ branch: _b, ...rest }) => rest)(t.json.branches[0]))
  }
  const empty = r.gitRepo({})
  for (const k of ['e2e', 'e2e-area', 'slice', 'run']) assert.deepEqual(list(empty, k).json.branches, [])
})

test('verify cli TC-cli-7: help, idempotency, spaces and unicode in the repo path, equals-form flags', () => {
  const h = r.run('branches.py', ['list', '--help']); console.log(h.text())
  assert.equal(h.status, 0)
  const repo = wide()
  const a = list(repo, 'slice'), b = list(repo, 'slice')
  assert.equal(a.stdout, b.stdout)
  const base = r.dir('sp ace ünï'); const sub = join(base, 'rép o'); mkdirSync(sub)
  r.git(sub, 'init', '-q', '-b', 'main'); r.git(sub, 'commit', '-q', '--allow-empty', '-m', 'i'); r.git(sub, 'branch', 'sdlc/S-001')
  const s = list(sub, 'slice'); console.log(s.text())
  assert.deepEqual(names(s), ['sdlc/S-001'])
  const eq = r.run('branches.py', ['list', `--repo=${repo}`, '--kind=slice']); assert.equal(eq.stdout, a.stdout)
  const cwdRel = r.run('branches.py', ['list', '--repo', '.', '--kind', 'slice'], { cwd: repo }); assert.equal(cwdRel.status, 0); assert.deepEqual(names(cwdRel), names(a))
})

test('verify cli TC-cli-8: many branches stay fast and correct', () => {
  const repo = r.gitRepo({})
  const lines = []
  const head = r.git(repo, 'rev-parse', 'HEAD')
  for (let i = 1; i <= 3000; i++) lines.push(`create refs/heads/sdlc/run-${i} ${head}`)
  r.exec('git', ['-C', repo, 'update-ref', '--stdin'], { input: lines.join('\n') + '\n', cwd: repo })
  const t = list(repo, 'run'); console.log('duration ms', t.durationMs, 'count', t.json.branches.length)
  assert.equal(t.json.branches.length, 3000)
  assert.deepEqual(t.json.branches.slice(0, 3).map((b) => b.n), [1, 2, 3])
  assert.equal(t.json.branches[2999].n, 3000)
})
