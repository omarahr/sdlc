import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = process.env.SDLC_ROOT
const { cliRunner } = await import(`${REPO_ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { load } = await import(`${REPO_ROOT}/skills/sdlc/test/testkit/attack-corpus.mjs`)

const prompt = readFileSync(join(REPO_ROOT, 'skills/sdlc/prompts/integrator.md'), 'utf8')
const clean = prompt.slice(prompt.indexOf('**Clean up**'), prompt.indexOf('## mode: retry-merge'))
const step2 = clean.split('\n').find((l) => l.startsWith('2. '))
const listCmd = step2.match(/`(python3 "<skill>\/branches\.py" list[^`]*)`/)[1]
const listArgs = listCmd.replace('python3 "<skill>/branches.py"', '').trim().split(/\s+/)

const r = cliRunner()
const skill = join(REPO_ROOT, 'skills/sdlc')
const LOG = process.env.LOG_DIR
const transcripts = {}

function listFor(repo) {
  const t = r.exec('python3', [join(skill, 'branches.py'), ...listArgs.map((a) => (a === '.' ? repo : a))], { cwd: repo })
  assert.equal(t.status, 0, t.stderr)
  return { t, entries: t.json.branches }
}

function integratorCleanup(repo, id, { push }) {
  const { t, entries } = listFor(repo)
  const kept = entries.filter((e) => e.id.toLowerCase() === id.toLowerCase())
  const out = []
  for (const e of kept) {
    const d = r.exec('git', ['branch', '-D', e.branch], { cwd: repo })
    out.push({ cmd: d.argv.join(' '), status: d.status, stderr: d.stderr.trim() })
    if (push) {
      const p = r.exec('git', ['push', 'origin', '--delete', e.branch], { cwd: repo })
      out.push({ cmd: p.argv.join(' '), status: p.status, stderr: p.stderr.trim() })
    }
  }
  return { listT: t, kept: kept.map((e) => e.branch), out }
}

const branchesOf = (repo) => r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean).sort()
const record = (k, v) => { transcripts[k] = v; mkdirSync(LOG, { recursive: true }); writeFileSync(join(LOG, 'cli-0-transcripts.json'), JSON.stringify(transcripts, null, 2)) }

test('verify cli: prompt step 2 holds the list command', () => {
  assert.equal(listCmd, 'python3 "<skill>/branches.py" list --repo . --kind attempt')
})

test('verify cli VS-1: default format lists and deletes only the two attempt branches', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-001', 'sdlc/S-001-v0'] })
  const before = branchesOf(repo)
  const res = integratorCleanup(repo, 'S-001', { push: false })
  assert.deepEqual(res.kept.sort(), ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2'])
  assert.deepEqual(branchesOf(repo), ['main', 'sdlc/S-001', 'sdlc/S-001-v0'])
  record('VS-1', { before, list: res.listT.stdout, out: res.out, after: branchesOf(repo) })
})

test('verify cli VS-2: lowercase format keeps the id case-blind match', () => {
  const files = { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name:lower}' } }
  const names = ['feature/PROJ-1-s-001-attempt-1', 'feature/PROJ-1-s-001-attempt-2', 'feature/PROJ-1-s-0010-attempt-1', 'feature/PROJ-1-s-001a-attempt-1', 'feature/PROJ-1-s-001', 'feature/PROJ-1-s-002-attempt-1']
  const repo = r.gitRepo({ files, branches: names })
  const { entries, t } = listFor(repo)
  assert.equal(entries.filter((e) => e.id === 'S-001').length, 0)
  assert.equal(entries.filter((e) => e.id === 's-001').length, 2)
  const res = integratorCleanup(repo, 'S-001', { push: false })
  assert.deepEqual(res.kept.sort(), ['feature/PROJ-1-s-001-attempt-1', 'feature/PROJ-1-s-001-attempt-2'])
  assert.deepEqual(branchesOf(repo), ['feature/PROJ-1-s-001', 'feature/PROJ-1-s-0010-attempt-1', 'feature/PROJ-1-s-001a-attempt-1', 'feature/PROJ-1-s-002-attempt-1', 'main'])
  record('VS-2', { list: t.stdout, out: res.out, after: branchesOf(repo) })
})

test('verify cli VS-2b: mixed-case format and letter-suffix slice id', () => {
  const files = { '.sdlc/config.json': { branchFormat: 'work/{name}' } }
  const repo = r.gitRepo({ files, branches: ['work/S-027b-attempt-1', 'work/S-027-attempt-1', 'work/S-027bc-attempt-1', 'work/S-027b'] })
  const res = integratorCleanup(repo, 's-027B', { push: false })
  assert.deepEqual(res.kept, ['work/S-027b-attempt-1'])
  assert.deepEqual(branchesOf(repo), ['main', 'work/S-027-attempt-1', 'work/S-027b', 'work/S-027bc-attempt-1'])
  record('VS-2b', { list: res.listT.stdout, out: res.out, after: branchesOf(repo) })
})

test('verify cli VS-3: other slices and non-attempt branches survive', () => {
  const keep = ['sdlc/S-002-attempt-1', 'sdlc/S-0010-attempt-1', 'sdlc/S-001a-attempt-1', 'sdlc/run-3', 'sdlc/S-001-v0-attempt-1x', 'sdlc/S-001-v0', 'user/S-001-attempt-1', 'mine', 'S-001-attempt-1']
  const repo = r.gitRepo({ branches: [...keep, 'sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-12'] })
  const res = integratorCleanup(repo, 'S-001', { push: false })
  assert.deepEqual(res.kept.sort(), ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-12'])
  assert.deepEqual(branchesOf(repo), ['main', ...keep].sort())
  record('VS-3', { list: res.listT.stdout, out: res.out, after: branchesOf(repo) })
})

test('verify cli VS-3b: hostile prefixes and corpus names never break the delete commands', () => {
  const hostile = [
    { fmt: 'ünï/{name}', ok: true },
    { fmt: '-x/{name}', ok: false },
    { fmt: '--x{name}', ok: false },
    { fmt: 'a b/{name}', ok: false },
    { fmt: 'f$(touch PWNED)/{name}', ok: null },
    { fmt: "f';touch PWNED;'/{name}", ok: null },
  ]
  const results = []
  for (const h of hostile) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: h.fmt } } })
    const nm = r.exec('python3', [join(skill, 'branches.py'), 'name', '--repo', repo, '--kind', 'attempt', '--id', 'S-001', '--n', '1'], { cwd: repo })
    if (nm.status !== 0) { results.push({ fmt: h.fmt, rejectedByName: nm.stdout.trim() }); assert.notEqual(h.ok, true); continue }
    const branch = nm.json.branch
    r.git(repo, 'branch', branch)
    r.git(repo, 'branch', 'bystander')
    const res = integratorCleanup(repo, 'S-001', { push: false })
    assert.deepEqual(res.kept, [branch])
    assert.ok(res.out.every((o) => o.status === 0), JSON.stringify(res.out))
    assert.deepEqual(branchesOf(repo), ['bystander', 'main'])
    assert.equal(r.exec('ls', ['-a'], { cwd: repo }).stdout.includes('PWNED'), false)
    results.push({ fmt: h.fmt, branch, out: res.out })
  }
  for (const e of load('flag-like-values', { argv: true }).concat(load('unicode-confusables', { argv: true }))) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}' } }, branches: ['sdlc/S-001-attempt-1'] })
    const bad = r.exec('git', ['branch', e.value], { cwd: repo })
    if (bad.status === 0 && branchesOf(repo).includes(e.value)) {
      const res = integratorCleanup(repo, 'S-001', { push: false })
      assert.deepEqual(res.kept, ['sdlc/S-001-attempt-1'])
      assert.ok(branchesOf(repo).includes(e.value))
    }
  }
  record('VS-3b', results)
})

function withOrigin(branches) {
  const bare = r.dir('origin.git')
  r.git(bare, 'init', '-q', '--bare', '-b', 'main')
  const repo = r.gitRepo({ branches })
  r.git(repo, 'remote', 'add', 'origin', bare)
  r.git(repo, 'push', '-q', 'origin', 'main')
  return { bare, repo }
}
const remoteHeads = (bare) => r.git(bare, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean).sort()

test('verify cli VS-4: remote delete in pr/mr/stack, missing ref tolerated, other remote refs stay', () => {
  const { bare, repo } = withOrigin(['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-002-attempt-1', 'sdlc/S-001'])
  r.git(repo, 'push', '-q', 'origin', 'sdlc/S-001-attempt-1', 'sdlc/S-002-attempt-1', 'sdlc/S-001')
  const before = remoteHeads(bare)
  const res = integratorCleanup(repo, 'S-001', { push: true })
  const missing = res.out.find((o) => o.cmd.includes('S-001-attempt-2') && o.cmd.includes('push'))
  assert.notEqual(missing.status, 0)
  assert.deepEqual(remoteHeads(bare), ['main', 'sdlc/S-001', 'sdlc/S-002-attempt-1'])
  assert.deepEqual(branchesOf(repo), ['main', 'sdlc/S-001', 'sdlc/S-002-attempt-1'])
  record('VS-4', { before, out: res.out, remoteAfter: remoteHeads(bare) })
})

test('verify cli VS-4b: direct mode text names no push; pr, mr, stack named', () => {
  assert.match(step2, /In `pr`, `mr` and `stack` modes, also run `git push origin --delete <branch>`/)
  assert.doesNotMatch(step2, /`direct`/)
  const { bare, repo } = withOrigin(['sdlc/S-001-attempt-1'])
  r.git(repo, 'push', '-q', 'origin', 'sdlc/S-001-attempt-1')
  integratorCleanup(repo, 'S-001', { push: false })
  assert.deepEqual(remoteHeads(bare), ['main', 'sdlc/S-001-attempt-1'])
})

test('verify cli VS-4c: no origin remote at all does not abort the other deletions', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2'] })
  const res = integratorCleanup(repo, 'S-001', { push: true })
  assert.deepEqual(branchesOf(repo), ['main'])
  assert.ok(res.out.some((o) => o.cmd.includes('push') && o.status !== 0))
  record('VS-4c', { out: res.out })
})

test('verify cli VS-5: parent walk text and parent list under a custom format', () => {
  const step3 = clean.split('\n').find((l) => l.startsWith('3. '))
  assert.match(step3, /do step 2 for the parent id/)
  assert.match(step3, /splitInto/)
  assert.match(clean, /Never delete a branch of a slice that is not finished/)
  const files = { '.sdlc/config.json': { branchFormat: 'feature/{name:lower}' } }
  const repo = r.gitRepo({ files, branches: ['feature/s-013-attempt-1', 'feature/s-013a-attempt-1', 'feature/s-013b-attempt-1', 'feature/s-013-attempt-2'] })
  const res = integratorCleanup(repo, 'S-013', { push: false })
  assert.deepEqual(res.kept.sort(), ['feature/s-013-attempt-1', 'feature/s-013-attempt-2'])
  assert.deepEqual(branchesOf(repo), ['feature/s-013a-attempt-1', 'feature/s-013b-attempt-1', 'main'])
  const kids = integratorCleanup(repo, 'S-013a', { push: false })
  assert.deepEqual(kids.kept, ['feature/s-013a-attempt-1'])
  record('VS-5', { parent: res.out, child: kids.out, after: branchesOf(repo) })
})

test('verify cli VS-5b: letter-stripping the parent id of S-013ab', () => {
  const ids = []
  let id = 'S-013ab'
  while (/[a-z]$/.test(id)) { id = id.slice(0, -1); ids.push(id) }
  assert.deepEqual(ids, ['S-013a', 'S-013'])
})
