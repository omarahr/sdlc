import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SKILL = process.env.SKILL_DIR || '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-033-v0-security-0/skills/sdlc'
const STATE = join(SKILL, 'state-write.py')
const JANITOR = join(SKILL, 'janitor.py')
const CUSTOM = 'feature/PROJ-1-{name}'
const home = mkdtempSync(join(tmpdir(), 'vsec-home-'))
const env = { PATH: process.env.PATH, HOME: home, GIT_CONFIG_GLOBAL: join(home, '.gitconfig'), GIT_CONFIG_NOSYSTEM: '1', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', TMPDIR: mkdtempSync(join(tmpdir(), 'vsec-tmp-')) }
const g = (repo, ...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', env }).trim()
const gTry = (repo, ...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8', env })
const scratch = p => mkdtempSync(join(tmpdir(), p))
const heads = repo => g(repo, 'for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads').split('\n').sort()
const remoteHeads = bare => g(bare, 'for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads').split('\n').sort()

function mkRepo({ withRemote = true, config = {}, slices = [] } = {}) {
  const repo = scratch('vsec-repo-')
  g(repo, 'init', '-q', '-b', 'main')
  g(repo, 'config', 'user.email', 't@example.com')
  g(repo, 'config', 'user.name', 'T')
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc', 'config.json'), JSON.stringify({ gitMode: 'stack', defaultBranch: 'main', ...config }))
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify(slices))
  writeFileSync(join(repo, '.sdlc', 'milestones.json'), '[]')
  writeFileSync(join(repo, 'a.txt'), 'v1\n')
  g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'init')
  let bare = null
  if (withRemote) {
    bare = scratch('vsec-bare-')
    g(bare, 'init', '-q', '--bare', '-b', 'main')
    g(repo, 'remote', 'add', 'origin', bare)
    g(repo, 'push', '-q', '-u', 'origin', 'main')
  }
  return { repo, bare }
}

const shippedBranch = (repo, name) => { const r = gTry(repo, 'branch', name, 'main'); return r.status }

function committedConfig(repo, branch, cfg, work = false) {
  g(repo, 'checkout', '-q', '-b', branch, 'main')
  writeFileSync(join(repo, '.sdlc', 'config.json'), JSON.stringify(cfg))
  if (work) writeFileSync(join(repo, 'unshipped.txt'), 'unshipped work\n')
  g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', `config on ${branch}`)
  g(repo, 'checkout', '-q', 'main')
  g(repo, 'checkout', '-q', '.')
}

function py(repo, body) {
  const code = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(STATE)})
sw = importlib.util.module_from_spec(spec); spec.loader.exec_module(sw)
repo = ${JSON.stringify(repo)}
try:
${body.split('\n').map(l => '    ' + l).join('\n')}
except sw.Fail as e:
    print(json.dumps({"fail": str(e)}))
except Exception as e:
    print(json.dumps({"exception": type(e).__name__ + ": " + str(e)}))
`
  const r = spawnSync('python3', ['-I', '-c', code], { encoding: 'utf8', env, cwd: scratch('vsec-cwd-') })
  const last = r.stdout.trim().split('\n').pop()
  try { return JSON.parse(last) } catch { return { raw: r.stdout, stderr: r.stderr } }
}

function janitor(repo) {
  const r = spawnSync('python3', [JANITOR, '--repo', repo], { encoding: 'utf8', env })
  return { status: r.status, out: JSON.parse(r.stdout.trim().split('\n').pop()), stderr: r.stderr }
}

test('verify security VS-1: prune under a custom format removes only branches that parse to milestone', () => {
  const { repo, bare } = mkRepo()
  const goes = ['feature/PROJ-1-M-1', 'feature/PROJ-1-M-10']
  const stays = ['sdlc/M-2', 'feature/PROJ-1-M-3-e2e', 'feature/PROJ-1-S-001', 'feature/PROJ-1-run-1', 'feature/PROJ-1-M-1x', 'feature/PROJ-1-m-4',
    'xfeature/PROJ-1-M-6', 'feature/PROJ-1-M-7-', 'feature/PROJ-1-М-8', 'feature/PROJ-1-M‑8', 'feature/PROJ-1-M-9/x', 'feature/PROJ-1-M-9a/b', 'feature/PROJ-1-state-20260101010101', 'feature/PROJ-1-Ｍ-3']
  const made = []
  for (const b of [...goes, ...stays]) if (shippedBranch(repo, b) === 0) made.push(b)
  const trailing = gTry(repo, 'branch', 'feature/PROJ-1-M-11/', 'main')
  assert.notEqual(trailing.status, 0, 'git must refuse a trailing slash')
  g(repo, 'push', '-q', 'origin', '--all')
  const config = { runBranch: 'feature/PROJ-1-run-1', defaultBranch: 'main' }
  const before = heads(repo); const rbefore = remoteHeads(bare)
  const r = py(repo, `print(json.dumps({"gone": sw.prune_stale_milestone_branches(repo, ${JSON.stringify(config)}, "nokeep", ${JSON.stringify(CUSTOM)})}))`)
  assert.deepEqual(r.gone?.sort(), goes.filter(b => made.includes(b)).sort(), JSON.stringify(r))
  const after = heads(repo)
  for (const b of stays.filter(b => made.includes(b))) assert.ok(after.some(l => l.startsWith(b + ' ')), `${b} was deleted`)
  assert.ok(after.some(l => l.startsWith('main ')))
  assert.deepEqual(before.filter(l => !goes.some(b => l.startsWith(b + ' '))), after)
  const rafter = remoteHeads(bare)
  assert.deepEqual(rbefore.filter(l => !goes.some(b => l.startsWith(b + ' '))), rafter, 'remote lost a foreign branch')
})

test('verify security VS-1c: classification is case sensitive for a non-lower format', () => {
  const { repo } = mkRepo({ withRemote: false })
  const r = py(repo, `print(json.dumps({"k": [sw.branch_kind(${JSON.stringify(CUSTOM)}, b) for b in ["Feature/PROJ-1-M-5", "feature/PROJ-1-m-5", "feature/proj-1-M-5", "feature/PROJ-1-M-5"]]}))`)
  assert.deepEqual(r, { k: [null, null, null, 'milestone'] })
})

test('verify security VS-1b: unicode digits parse as a milestone (seed)', () => {
  const { repo } = mkRepo(); const b = 'feature/PROJ-1-M-٣'
  assert.equal(shippedBranch(repo, b), 0)
  g(repo, 'push', '-q', 'origin', '--all')
  const r = py(repo, `print(json.dumps({"kind": sw.branch_kind(${JSON.stringify(CUSTOM)}, ${JSON.stringify(b)})}))`)
  console.log('KIND_ARABIC_DIGIT', JSON.stringify(r))
})

test('verify security VS-2: branch_run takes a stored name only when it parses to run', () => {
  const { repo } = mkRepo({ withRemote: false })
  const cases = [
    ['feature/PROJ-1-run-1', CUSTOM, 'feature/PROJ-1-run-1'], ['sdlc/run-1', CUSTOM, ''], ['main', CUSTOM, ''], ['release/x', CUSTOM, ''], ['', CUSTOM, ''],
    ['sdlc/run-1', 'sdlc/{name}', 'sdlc/run-1'], ['feature/PROJ-1-run-1', 'sdlc/{name}', ''], ['main', 'sdlc/{name}', ''],
    ['feature/PROJ-1-run-1x', CUSTOM, ''], ['feature/PROJ-1-run-', CUSTOM, ''], ['feature/PROJ-1-M-1', CUSTOM, ''],
    [42, CUSTOM, ''], [['feature/PROJ-1-run-1'], CUSTOM, ''], [null, CUSTOM, ''], [{ a: 1 }, CUSTOM, ''], [true, CUSTOM, ''],
  ]
  let i = 0
  for (const [stored, fmt, want] of cases) {
    const br = `br${i++}`
    committedConfig(repo, br, { runBranch: stored })
    const r = py(repo, `print(json.dumps({"v": sw.branch_run(repo, ${JSON.stringify(br)}, ${JSON.stringify(fmt)})}))`)
    assert.deepEqual(r, { v: want }, `stored=${JSON.stringify(stored)} fmt=${fmt}`)
  }
  g(repo, 'checkout', '-q', '-b', 'nokey', 'main'); writeFileSync(join(repo, '.sdlc', 'config.json'), '{}'); g(repo, 'commit', '-qam', 'nokey'); g(repo, 'checkout', '-q', 'main')
  assert.deepEqual(py(repo, `print(json.dumps({"v": sw.branch_run(repo, "nokey", ${JSON.stringify(CUSTOM)})}))`), { v: '' })
  assert.deepEqual(py(repo, `print(json.dumps({"v": sw.branch_run(repo, "no-such-branch", ${JSON.stringify(CUSTOM)})}))`), { v: '' })
  g(repo, 'checkout', '-q', '-b', 'garbage', 'main'); writeFileSync(join(repo, '.sdlc', 'config.json'), '{not json'); g(repo, 'commit', '-qam', 'bad'); g(repo, 'checkout', '-q', 'main')
  assert.deepEqual(py(repo, `print(json.dumps({"v": sw.branch_run(repo, "garbage", ${JSON.stringify(CUSTOM)})}))`), { v: '' })
  g(repo, 'checkout', '-q', '-b', 'arr', 'main'); writeFileSync(join(repo, '.sdlc', 'config.json'), '[1]'); g(repo, 'commit', '-qam', 'arr'); g(repo, 'checkout', '-q', 'main')
  const arr = py(repo, `print(json.dumps({"v": sw.branch_run(repo, "arr", ${JSON.stringify(CUSTOM)})}))`)
  console.log('ARRAY_CONFIG', JSON.stringify(arr))
  const badFmts = ['no-placeholder', 'a/{name}/{name}', 'a{name', 5, null, 'a/{name}}']
  for (const f of badFmts) {
    const r = py(repo, `print(json.dumps({"v": sw.branch_run(repo, "br0", json.loads(${JSON.stringify(JSON.stringify(f))}))}))`)
    assert.ok(r.fail !== undefined || r.v === '', `format ${JSON.stringify(f)} -> ${JSON.stringify(r)}`)
    assert.equal(r.exception, undefined, `traceback for ${JSON.stringify(f)}`)
  }
})

function leftoverFixture(storedRun, work) {
  const m = mkRepo({ config: { runBranch: 'feature/PROJ-1-run-1' } })
  g(m.repo, 'branch', 'feature/PROJ-1-run-1', 'main')
  committedConfig(m.repo, 'feature/PROJ-1-M-1', { runBranch: storedRun }, work)
  g(m.repo, 'push', '-q', 'origin', 'feature/PROJ-1-M-1', 'feature/PROJ-1-run-1')
  return m
}

test('verify security VS-3: a foreign stored run does not block or prune a leftover milestone branch', () => {
  for (const stored of ['main', 'sdlc/run-1', 'release/x', 'feature/PROJ-1-S-001', 'feature/PROJ-1-run-x']) {
    const { repo, bare } = leftoverFixture(stored, true)
    const tip = g(repo, 'rev-parse', 'feature/PROJ-1-M-1')
    const rtip = g(bare, 'rev-parse', 'feature/PROJ-1-M-1')
    const config = { runBranch: 'feature/PROJ-1-run-1', defaultBranch: 'main' }
    const r = py(repo, `print(json.dumps({"b": sw.ensure_milestone_branch(repo, ${JSON.stringify(config)}, [], "M-1", ${JSON.stringify(CUSTOM)})}))`)
    assert.deepEqual(r, { b: 'feature/PROJ-1-M-1' }, `stored=${stored}: ${JSON.stringify(r)}`)
    assert.equal(g(repo, 'rev-parse', 'feature/PROJ-1-M-1'), tip)
    assert.equal(g(bare, 'rev-parse', 'feature/PROJ-1-M-1'), rtip)
    assert.equal(g(repo, 'show', 'feature/PROJ-1-M-1:unshipped.txt'), 'unshipped work')
    const pr = py(repo, `print(json.dumps({"gone": sw.prune_stale_milestone_branches(repo, ${JSON.stringify(config)}, "feature/PROJ-1-M-1", ${JSON.stringify(CUSTOM)})}))`)
    assert.deepEqual(pr, { gone: [] })
    assert.equal(g(repo, 'rev-parse', 'feature/PROJ-1-M-1'), tip)
  }
})

test('verify security VS-4: a branch naming another real run still refuses, and nothing changes', () => {
  const { repo, bare } = leftoverFixture('feature/PROJ-1-run-2', true)
  const before = heads(repo); const rbefore = remoteHeads(bare)
  const config = { runBranch: 'feature/PROJ-1-run-1', defaultBranch: 'main' }
  const r = py(repo, `print(json.dumps({"b": sw.ensure_milestone_branch(repo, ${JSON.stringify(config)}, [], "M-1", ${JSON.stringify(CUSTOM)})}))`)
  assert.match(r.fail, /feature\/PROJ-1-M-1 belongs to run feature\/PROJ-1-run-2/)
  assert.deepEqual(heads(repo), before); assert.deepEqual(remoteHeads(bare), rbefore)
  const d = mkRepo({ config: { runBranch: 'sdlc/run-1' } })
  g(d.repo, 'branch', 'sdlc/run-1', 'main')
  committedConfig(d.repo, 'sdlc/M-1', { runBranch: 'sdlc/run-2' }, true)
  const dbefore = heads(d.repo)
  const dr = py(d.repo, `print(json.dumps({"b": sw.ensure_milestone_branch(repo, {"runBranch": "sdlc/run-1", "defaultBranch": "main"}, [], "M-1", "sdlc/{name}")}))`)
  assert.match(dr.fail, /sdlc\/M-1 belongs to run sdlc\/run-2/)
  assert.deepEqual(heads(d.repo), dbefore)
  for (const stored of ['feature/PROJ-1-run-01', 'feature/PROJ-1-run-٢']) {
    const s = leftoverFixture(stored, true)
    const sr = py(s.repo, `print(json.dumps({"b": sw.ensure_milestone_branch(repo, ${JSON.stringify(config)}, [], "M-1", ${JSON.stringify(CUSTOM)})}))`)
    assert.ok(sr.fail && /belongs to run/.test(sr.fail), `${stored}: ${JSON.stringify(sr)}`)
  }
})

const done = [{ id: 'S-001', status: 'done' }, { id: 'S-002', status: 'in_progress' }]
function janitorRepo(cfg, slices = done, configFile = true) {
  const m = mkRepo({ withRemote: false, slices })
  if (configFile) writeFileSync(join(m.repo, '.sdlc', 'config.json'), typeof cfg === 'string' ? cfg : JSON.stringify(cfg))
  else spawnSync('rm', [join(m.repo, '.sdlc', 'config.json')])
  return m.repo
}
const mk = (repo, names) => names.forEach(n => g(repo, 'branch', n, 'main'))
const names = repo => g(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').sort()

test('verify security VS-5: custom format janitor sweeps only its own verify branches', () => {
  const repo = janitorRepo({ branchFormat: CUSTOM, gitMode: 'stack' })
  const all = ['feature/PROJ-1-S-001-v0-http-api-0', 'sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-002-v0-http-api-0', 'feature/PROJ-1-S-001', 'feature/PROJ-1-S-099-v0-http-api-0',
    'feature/PROJ-1-S-001-attempt-2', 'feature/PROJ-1-S-001-attempt-2-v0-http-api-0', 'feature/PROJ-1-M-1', 'feature/PROJ-1-run-1', 'release/S-001-v0-cli-0']
  mk(repo, all)
  const r = janitor(repo)
  console.log('JANITOR_VS5', JSON.stringify(r.out))
  assert.equal(r.status, 0)
  assert.ok(!names(repo).includes('feature/PROJ-1-S-001-v0-http-api-0'))
  for (const b of all.filter(b => b !== 'feature/PROJ-1-S-001-v0-http-api-0' && b !== 'feature/PROJ-1-S-099-v0-http-api-0')) assert.ok(names(repo).includes(b), `${b} deleted`)
  assert.ok(names(repo).includes('main'))
})

test('verify security VS-6: default format janitor ignores custom-format branches', () => {
  const variants = [{ gitMode: 'stack', branchFormat: '' }, { gitMode: 'stack' }, null, { branchFormat: 'sdlc/{name}' }]
  for (const cfg of variants) {
    const repo = janitorRepo(cfg ?? {}, done, cfg !== null)
    const all = ['sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-001-v0-http-api-0', 'sdlc/S-002-v0-http-api-0', 'sdlc/S-001', 'sdlc/run-1', 'sdlc/M-1']
    mk(repo, all)
    const r = janitor(repo)
    assert.equal(r.status, 0)
    const now = names(repo)
    assert.ok(!now.includes('sdlc/S-001-v0-http-api-0'), JSON.stringify(cfg))
    for (const b of all.slice(1)) assert.ok(now.includes(b), `${b} deleted under ${JSON.stringify(cfg)}`)
    assert.ok(now.includes('main'))
  }
})

test('verify security VS-7: janitor source reads load_format and holds no sdlc/ literal outside prose', () => {
  const src = readFileSync(JANITOR, 'utf8')
  assert.ok(src.includes('branches.load_format(repo)'))
  const code = src.replace(/"""[\s\S]*?"""/g, '')
  const lits = code.split('\n').filter(l => /sdlc\//.test(l))
  console.log('SDLC_LITERAL_LINES', JSON.stringify(lits))
  assert.deepEqual(lits.filter(l => !/\.sdlc|sdlc-/.test(l)), [])
})

test('verify security VS-7b: janitor deletes nothing and reports under a malformed string format', () => {
  const bad = ['no-placeholder', 'a/{name}/{name}', 'a{name', 'a/{name}}', 'a b/{name}', 'a/{name}\u0000x', 'a/{name}..x', 'a//{name}', 'a/{name}.lock', 'a~/{name}', 'a/{name}\u202e', '{name:lower}{name}', '{name', '{{name}']
  const results = []
  for (const f of bad) {
    const repo = janitorRepo(JSON.stringify({ branchFormat: f }))
    const all = ['sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-001-v0-http-api-0', 'a/S-001-v0-http-api-0', 'S-001-v0-http-api-0']
    mk(repo, all)
    const before = names(repo)
    const r = janitor(repo)
    const after = names(repo)
    results.push({ f, status: r.status, removed: r.out.removedBranches, notes: r.out.notes, deleted: before.filter(b => !after.includes(b)), reported: r.out.notes.some(n => /format/.test(n)) })
  }
  console.log('MALFORMED', JSON.stringify(results))
  for (const x of results) {
    assert.equal(x.status, 0)
    assert.deepEqual(x.deleted, [], `format ${JSON.stringify(x.f)} deleted ${x.deleted}`)
  }
  const unreported = results.filter(x => !x.reported).map(x => x.f)
  console.log('UNREPORTED', JSON.stringify(unreported))
  const placeholderBroken = results.filter(x => /^(no-placeholder|a\/\{name\}\/\{name\}|a\{name|\{name:lower\}\{name\}|\{name)$/.test(x.f))
  for (const x of placeholderBroken) assert.ok(x.reported, `format ${JSON.stringify(x.f)} not reported`)
})

test('verify security VS-7c: a non-string branchFormat is read as absent, so the janitor sweeps under the default', () => {
  const out = []
  for (const f of [5, ['x/{name}'], { a: 1 }, true, null]) {
    const repo = janitorRepo(JSON.stringify({ branchFormat: f }))
    mk(repo, ['sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-001-v0-http-api-0'])
    const r = janitor(repo)
    out.push({ f, removed: r.out.removedBranches, notes: r.out.notes })
    assert.ok(names(repo).includes('feature/PROJ-1-S-001-v0-http-api-0'))
  }
  console.log('NONSTRING', JSON.stringify(out))
})
