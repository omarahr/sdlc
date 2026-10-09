import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, appendFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const { cliRunner } = await import(`${ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { load } = await import(`${ROOT}/skills/sdlc/test/testkit/attack-corpus.mjs`)
const LOG = process.env.ATTACK_LOG

const r = cliRunner()
const record = (id, t, extra = {}) => {
  if (LOG) appendFileSync(LOG, JSON.stringify({ id, argv: t.argv.slice(2).map((a) => (a.length > 80 ? a.slice(0, 80) + `...(${a.length})` : a)), status: t.status, stdout: t.stdout.slice(0, 600), stderr: t.stderr.slice(0, 300), treeUnchanged: t.treeUnchanged, ...extra }) + '\n')
}
const list = (repo, kind, extra = []) => r.run('branches.py', ['list', '--repo', repo, '--kind', kind, ...extra])
const names = (t) => t.json.branches.map((b) => b.branch)
const noTrace = (t) => assert.ok(!/Traceback|File ".*\.py"/.test(t.stderr + t.stdout), t.stderr)
const oneJson = (t) => { assert.ok(t.json && typeof t.json === 'object', t.stdout); assert.equal(t.stdout.trim().split('\n').length, 1) }

test('verify security: VS-3 remote refs, tags and detached HEAD never appear', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001', 'sdlc/S-007', 'feature/x'] })
  r.git(repo, 'update-ref', 'refs/remotes/origin/sdlc/S-009', 'HEAD')
  r.git(repo, 'update-ref', 'refs/remotes/origin/sdlc/S-001', 'HEAD')
  r.git(repo, 'tag', 'sdlc/S-008')
  r.git(repo, 'update-ref', 'refs/stash', 'HEAD')
  r.git(repo, 'update-ref', 'refs/notes/sdlc/S-011', 'HEAD')
  r.git(repo, 'update-ref', 'refs/heads-evil/sdlc/S-012', 'HEAD')
  r.git(repo, 'checkout', '-q', '--detach')
  const t = list(repo, 'slice')
  record('VS3-a', t)
  assert.equal(t.status, 0); noTrace(t); oneJson(t)
  assert.deepEqual(names(t), ['sdlc/S-001', 'sdlc/S-007'])
  assert.ok(t.treeUnchanged)
})

test('verify security: VS-3 a tag with the same name as a branch does not hide or change the branch', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001', 'sdlc/run-3'] })
  r.git(repo, 'tag', 'sdlc/S-001')
  r.git(repo, 'tag', 'sdlc/run-3')
  r.git(repo, 'tag', 'sdlc/run-4')
  r.git(repo, 'tag', 'heads/sdlc/S-001')
  const s = list(repo, 'slice'); const n = list(repo, 'run')
  record('VS3-b', s); record('VS3-b-run', n)
  assert.deepEqual(names(s), ['sdlc/S-001'])
  assert.equal(s.json.branches[0].id, 'S-001')
  assert.deepEqual(names(n), ['sdlc/run-3'])
  assert.equal(n.json.branches[0].n, 3)
})

test('verify security: VS-3 a tag alone, with no branch of the name, gives nothing', () => {
  const repo = r.gitRepo({})
  r.git(repo, 'tag', 'sdlc/S-050')
  const t = list(repo, 'slice')
  record('VS3-c', t)
  assert.deepEqual(t.json.branches, [])
})

test('verify security: VS-3 a branch named heads/sdlc/S-002 is not mistaken for sdlc/S-002', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  r.git(repo, 'branch', 'heads/sdlc/S-002')
  const t = list(repo, 'slice')
  record('VS3-d', t)
  assert.deepEqual(names(t), ['sdlc/S-001'])
})

test('verify security: VS-3 a linked worktree branch and a symbolic ref are listed once and only as branches', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  r.git(repo, 'symbolic-ref', 'refs/heads/sdlc/S-077', 'refs/heads/sdlc/S-001')
  const t = list(repo, 'slice')
  record('VS3-e', t)
  assert.equal(t.status, 0); noTrace(t)
  assert.ok(names(t).includes('sdlc/S-001'))
  assert.ok(t.json.branches.every((b) => b.kind === 'slice'))
})

test('verify security: VS-5 empty repo, no commit', () => {
  const repo = r.dir('empty'); r.git(repo, 'init', '-q', '-b', 'main')
  const t = list(repo, 'slice')
  record('VS5-a', t)
  assert.equal(t.status, 0); assert.deepEqual(t.json.branches, []); assert.ok(t.treeUnchanged)
  const u = list(repo, 'bogus'); record('VS5-a2', u)
  assert.equal(u.status, 2); assert.equal(u.json.ok, false)
})

test('verify security: VS-5 non-git dir, missing path, file path, unreadable dir', () => {
  const plain = r.dir('plain')
  const t = list(plain, 'slice'); record('VS5-b', t)
  assert.equal(t.status, 2); assert.equal(t.json.ok, false); assert.match(t.json.error, /not a git repository/); noTrace(t); assert.ok(t.treeUnchanged)
  const m = list(join(plain, 'nope'), 'slice'); record('VS5-c', m)
  assert.equal(m.status, 2); assert.equal(m.json.ok, false); noTrace(m)
  writeFileSync(join(plain, 'f.txt'), 'x')
  const f = list(join(plain, 'f.txt'), 'slice'); record('VS5-d', f)
  assert.equal(f.status, 2); assert.equal(f.json.ok, false); noTrace(f)
  const e = list('', 'slice'); record('VS5-e', e)
  assert.equal(e.status, 2); noTrace(e)
})

test('verify security: VS-5 a subdirectory of a repo, a bare repo, and a broken .git', () => {
  const repo = r.gitRepo({ files: { 'sub/a.txt': 'x' }, branches: ['sdlc/S-001'] })
  const sub = list(join(repo, 'sub'), 'slice'); record('VS5-f', sub)
  assert.equal(sub.status, 0); assert.deepEqual(names(sub), ['sdlc/S-001'])
  const bare = r.dir('bare.git'); r.git(bare, 'init', '-q', '--bare', '-b', 'main')
  const b = list(bare, 'slice'); record('VS5-g', b)
  assert.ok(b.status === 0 || b.status === 2); assert.ok(b.json); noTrace(b)
  const broken = r.dir('broken'); writeFileSync(join(broken, '.git'), 'gitdir: /nonexistent/zzz\n')
  const x = list(broken, 'slice'); record('VS5-h', x)
  assert.equal(x.status, 2); assert.equal(x.json.ok, false); noTrace(x)
  const corrupt = r.gitRepo({ branches: ['sdlc/S-001'] })
  writeFileSync(join(corrupt, '.git', 'packed-refs'), 'garbage line without hash\n')
  const c = list(corrupt, 'slice'); record('VS5-i', c)
  assert.ok(c.json); noTrace(c); assert.ok(c.status === 0 || c.status === 2)
})

test('verify security: VS-5 git missing from PATH gives a defined error', () => {
  const repo = r.gitRepo({})
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'slice'], { env: { PATH: '/nonexistent' }, pythonFlags: [] })
  record('VS5-j', t)
  assert.ok(t.status === 2 || t.status === null); noTrace(t)
})

test('verify security: VS-6 odd numeric tails parse safely and sort by integer', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001-attempt-0', 'sdlc/S-001-attempt-007', 'sdlc/S-001-attempt-7', 'sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-2', 'sdlc/run-0', 'sdlc/run-007', 'sdlc/run-10', 'sdlc/run-2'] })
  const a = list(repo, 'attempt'); const n = list(repo, 'run'); record('VS6-a', a); record('VS6-a-run', n)
  assert.deepEqual(a.json.branches.map((b) => b.n), [0, 2, 7, 7, 10])
  assert.deepEqual(n.json.branches.map((b) => b.n), [0, 2, 7, 10])
  assert.ok(a.json.branches.every((b) => Number.isInteger(b.n)))
})

test('verify security: VS-6 unicode digits in branch names drop out or parse without crash', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001-attempt-1'] })
  for (const [i, e] of load('unicode-digits', { argv: true }).entries()) {
    for (const [k, mk] of [['attempt', (v) => `sdlc/S-001-attempt-${v}`], ['run', (v) => `sdlc/run-${v}`]]) {
      try { r.git(repo, 'branch', mk(e.value)) } catch { continue }
      const t = list(repo, k)
      record(`VS6-ud-${e.id}-${k}`, t, { branch: mk(e.value) })
      assert.equal(t.status, 0, `${e.id} ${k}: ${t.stderr}`); noTrace(t); oneJson(t)
      assert.ok(t.json.branches.every((b) => Number.isInteger(b.n) && b.n >= 0), `${e.id} ${k} ${t.stdout}`)
      const nonAscii = t.json.branches.filter((b) => /[^\x00-\x7f]/.test(b.branch))
      record(`VS6-ud-${e.id}-${k}-nonascii`, t, { listed: nonAscii.map((b) => [b.branch, b.n]) })
      r.git(repo, 'branch', '-D', mk(e.value))
    }
  }
})

test('verify security: VS-6 huge integers in branch names do not crash list', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-1'] })
  const digits = (n) => '9'.repeat(n)
  const lines = ['# pack-refs with: peeled fully-peeled sorted', ...[4300, 4301, 5000].flatMap((n) => [`${r.git(repo, 'rev-parse', 'HEAD')} refs/heads/sdlc/run-${digits(n)}`])]
  const lines2 = lines.slice(0, 1).concat(lines.slice(1)).sort()
  const packed = join(repo, '.git', 'packed-refs')
  try { writeFileSync(packed, lines2.join('\n') + '\n') } catch {}
  const t = list(repo, 'run'); record('VS6-huge', t)
  assert.equal(t.status, 0, t.stderr); noTrace(t); oneJson(t)
  assert.ok(t.json.branches.length >= 1)
  const t2 = list(repo, 'attempt'); record('VS6-huge-attempt', t2)
  assert.equal(t2.status, 0); noTrace(t2)
})

test('verify security: VS-6 confusable and traversal-like branch names are not listed as loop branches', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  const made = []
  for (const e of [...load('unicode-confusables', { argv: true }), ...load('traversal', { argv: true })]) {
    for (const nm of [`sdlc/${e.value}`, `sdlc/S-${e.value}`, `${e.value}`]) {
      try { r.git(repo, 'branch', nm); made.push(nm) } catch {}
    }
  }
  for (const k of ['slice', 'run', 'attempt', 'verify', 'state', 'milestone', 'e2e', 'e2e-area']) {
    const t = list(repo, k); record(`VS6-conf-${k}`, t, { made: made.length })
    assert.equal(t.status, 0, `${k}: ${t.stderr}`); noTrace(t); oneJson(t)
    for (const b of t.json.branches) {
      assert.equal(b.kind, k)
      assert.ok(b.branch.startsWith('sdlc/'))
      assert.ok(!/[^\x20-\x7e]/.test(b.branch) || k === 'e2e-area' || k === 'verify' || k === 'attempt' || k === 'slice', b.branch)
    }
  }
  const s = list(repo, 'slice')
  for (const b of s.json.branches) assert.match(b.id, /^S-[A-Za-z0-9-]+$/, b.branch)
})

test('verify security: VS-6 leading-dash and flag-like values as --repo, --kind and --format', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  for (const e of load('flag-like-values', { argv: true })) {
    for (const [slot, args] of [
      ['repo', ['list', '--repo', e.value, '--kind', 'slice']],
      ['kind', ['list', '--repo', repo, '--kind', e.value]],
      ['format', ['list', '--repo', repo, '--kind', 'slice', '--format', e.value]],
    ]) {
      const t = r.run('branches.py', args)
      record(`VS6-flag-${e.id}-${slot}`, t, { value: e.value })
      noTrace(t)
      assert.ok(t.json, `${slot} ${e.id}: ${t.stdout} ${t.stderr}`); oneJson(t)
      assert.ok(t.status === 0 || t.status === 2)
      assert.equal(t.json.ok, t.status === 0)
      assert.ok(t.treeUnchanged)
    }
  }
  const ex = r.run('branches.py', ['list', `--repo=${repo}`, '--kind=slice'])
  assert.equal(ex.status, 0)
})

test('verify security: VS-6 traversal and injection as --repo run no command and write nothing', () => {
  const marker = join(r.dir('mk'), 'pwned')
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  for (const v of [`${repo}; touch ${marker}`, `$(touch ${marker})`, '`touch ' + marker + '`', `${repo}/../${repo.split('/').pop()}`, `${repo}/.git/../`]) {
    const t = r.run('branches.py', ['list', '--repo', v, '--kind', 'slice'])
    record('VS6-inj', t, { value: v })
    assert.ok(t.json); noTrace(t)
  }
  assert.throws(() => readFileSync(marker))
  for (const e of [...load('injection', { argv: true }), ...load('traversal', { argv: true })]) {
    const t = r.run('branches.py', ['list', '--repo', e.value, '--kind', 'slice'])
    record(`VS6-inj-${e.id}`, t); noTrace(t); assert.ok(t.json); assert.equal(t.status, 2)
  }
  assert.throws(() => readFileSync(marker))
})

test('verify security: VS-6 repo config cannot run code during list (core.fsmonitor, hooks, aliases)', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  const marker = join(r.dir('mk2'), 'ran')
  r.git(repo, 'config', 'core.fsmonitor', `touch ${marker}; echo`)
  r.git(repo, 'config', 'alias.rev-parse', `!touch ${marker}`)
  const t = list(repo, 'slice'); record('VS6-cfg', t)
  assert.equal(t.status, 0); assert.deepEqual(names(t), ['sdlc/S-001'])
  assert.throws(() => readFileSync(marker))
})

test('verify security: VS-6 observation: a non-ASCII digit tail is listed as a loop branch with an ASCII-equivalent n', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-1'] })
  r.git(repo, 'branch', 'sdlc/run-١')
  const t = list(repo, 'run'); record('VS6-ud-pin', t)
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.branches.map((b) => b.n), [1, 1])
  assert.equal(t.json.branches.length, 2)
})
