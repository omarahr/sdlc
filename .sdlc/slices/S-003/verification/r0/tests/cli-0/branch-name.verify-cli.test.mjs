import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.VERIFY_ROOT ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const { cliRunner } = await import(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const LOG = process.env.VERIFY_LOG

const r = cliRunner()
const MODES = ['pr', 'direct', 'mr', 'stack']

function record(caseId, t) {
  if (LOG) appendFileSync(LOG, `=== ${caseId}\n${t.text()}\n\n`)
  return t
}

function name(caseId, repo, args, opts) {
  return record(caseId, r.run('branches.py', ['name', '--repo', repo, ...args], opts))
}

function preflight(caseId, repo, args, opts) {
  return record(caseId, r.run('branches.py', ['preflight', '--repo', repo, ...args], opts))
}

function assertOneJsonLine(t) {
  const lines = t.stdout.split('\n').filter((l) => l !== '')
  assert.equal(lines.length, 1, `stdout must hold one line: ${JSON.stringify(t.stdout)}`)
  assert.equal(t.stdout, lines[0] + '\n')
  const obj = JSON.parse(lines[0])
  assert.equal(typeof obj, 'object')
  assert.ok(obj !== null && !Array.isArray(obj))
  return obj
}

function assertJsonError(t, mentions) {
  assert.equal(t.status, 2, t.text())
  const obj = assertOneJsonLine(t)
  assert.deepEqual(Object.keys(obj).sort(), ['error', 'ok'])
  assert.equal(obj.ok, false)
  assert.equal(typeof obj.error, 'string')
  assert.ok(obj.error.trim().length > 0)
  if (mentions) assert.match(obj.error, mentions)
  assert.doesNotMatch(t.stderr, /Traceback/)
  assert.equal(t.stderr, '', t.text())
  assert.ok(t.treeUnchanged, t.text())
  return obj
}

function assertNameOk(t, { format, kind, branch }) {
  assert.equal(t.status, 0, t.text())
  assert.equal(t.stderr, '', t.text())
  const obj = assertOneJsonLine(t)
  assert.deepEqual(Object.keys(obj).sort(), ['branch', 'command', 'format', 'kind', 'ok'])
  assert.equal(obj.ok, true)
  assert.equal(obj.command, 'name')
  if (format !== undefined) assert.equal(obj.format, format)
  if (kind !== undefined) assert.equal(obj.kind, kind)
  if (branch instanceof RegExp) assert.match(obj.branch, branch)
  else if (branch !== undefined) assert.equal(obj.branch, branch)
  assert.ok(t.treeUnchanged, t.text())
  return obj
}

function repoWithConfig(config) {
  if (config === undefined) return r.gitRepo()
  return r.gitRepo({ files: { '.sdlc/config.json': typeof config === 'string' ? config : JSON.stringify(config) } })
}

function pyLoadFormat(repo) {
  const code = 'import importlib.util,json,sys\nspec=importlib.util.spec_from_file_location("b",sys.argv[1])\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\ntry:\n print(json.dumps({"r":m.load_format(sys.argv[2])}))\nexcept m.Fail as e:\n print(json.dumps({"fail":str(e)}))\n'
  const t = r.exec('python3', ['-I', '-c', code, join(r.skillDir, 'branches.py'), repo])
  assert.equal(t.status, 0, t.text())
  return JSON.parse(t.stdout)
}

function utcStamp(d) {
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

function stampToDate(s) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s)
  assert.ok(m, `not 14 digits: ${s}`)
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number)
  assert.ok(mo >= 1 && mo <= 12, `month ${mo}`)
  assert.ok(d >= 1 && d <= 31, `day ${d}`)
  assert.ok(h <= 23 && mi <= 59 && se <= 60)
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, se))
  assert.equal(utcStamp(date), s, 'stamp must parse back to the same date')
  return date
}

test('verify cli: TC-cli-1 name --kind state uses the current UTC time under extreme TZ', () => {
  const repo = r.gitRepo()
  for (const tz of ['Pacific/Kiritimati', 'Etc/GMT+12', 'UTC']) {
    const before = Math.floor(Date.now() / 1000) * 1000
    const t = name('TC-cli-1', repo, ['--kind', 'state'], { env: { TZ: tz } })
    const after = Date.now()
    const obj = assertNameOk(t, { format: 'sdlc/{name}', kind: 'state', branch: /^sdlc\/state-\d{14}$/ })
    const when = stampToDate(obj.branch.slice('sdlc/state-'.length)).getTime()
    assert.ok(when >= before && when <= after, `${tz}: stamp ${obj.branch} is outside [${new Date(before).toISOString()}, ${new Date(after).toISOString()}]`)
  }
})

test('verify cli: TC-cli-2 name has no --ts flag and refuses it with one JSON error', () => {
  const repo = r.gitRepo()
  assertJsonError(name('TC-cli-2', repo, ['--kind', 'state', '--ts', '20261008101500']), /ts/)
})

test('verify cli: TC-cli-3 name --kind e2e-area without --area exits 2 with one JSON error naming area', () => {
  const repo = r.gitRepo()
  const cwd = r.dir('cwd')
  const t = name('TC-cli-3', repo, ['--kind', 'e2e-area', '--id', 'M-1'], { cwd })
  assertJsonError(t, /area/)
  assert.ok(Object.keys(t.tree).includes(cwd) && Object.keys(t.tree).includes(repo))
})

test('verify cli: TC-cli-4 an empty or absent required part exits 2 with one JSON error naming it', () => {
  const repo = r.gitRepo()
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'e2e-area', '--id', 'M-1', '--area', '']), /area/)
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'e2e-area', '--area', 'api']), /\bid\b/)
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'e2e-area', '--id', '', '--area', 'api']), /\bid\b/)
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'e2e-area']), /\bid\b|area/)
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'slice']), /\bid\b/)
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'slice', '--id', '']), /\bid\b/)
  assertJsonError(name('TC-cli-4', repo, ['--kind', 'slice', '--format', 'feature/{name}']), /\bid\b/)
})

test('verify cli: TC-cli-5 kinds without a TAILS row and unknown kinds exit 2 with one JSON error', () => {
  const repo = r.gitRepo()
  for (const kind of ['run', 'milestone', 'e2e', 'verify', 'attempt']) {
    assertJsonError(name('TC-cli-5', repo, ['--kind', kind, '--id', 'S-001', '--n', '1', '--round', '0', '--profile', 'cli', '--part', '0', '--area', 'api']))
  }
  assertJsonError(name('TC-cli-5', repo, ['--kind', 'bogus', '--id', 'S-001']), /bogus/)
})

test('verify cli: TC-cli-6 R-015 flag over config over default', () => {
  const cfg = repoWithConfig({ branchFormat: 'feature/PROJ-1-{name}' })
  assertNameOk(name('TC-cli-6', cfg, ['--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/{name}']), { format: 'sdlc/{name}', kind: 'slice', branch: 'sdlc/S-001' })
  assertNameOk(name('TC-cli-6', cfg, ['--kind', 'slice', '--id', 'S-001']), { format: 'feature/PROJ-1-{name}', kind: 'slice', branch: 'feature/PROJ-1-S-001' })
  const bare = repoWithConfig(undefined)
  assertNameOk(name('TC-cli-6', bare, ['--kind', 'slice', '--id', 'S-001']), { format: 'sdlc/{name}', kind: 'slice', branch: 'sdlc/S-001' })
  const plain = r.dir('plain')
  assertNameOk(name('TC-cli-6', plain, ['--kind', 'slice', '--id', 'S-001']), { format: 'sdlc/{name}', branch: 'sdlc/S-001' })
})

const FALLBACK_SHAPES = {
  'empty string': { branchFormat: '' },
  null: { branchFormat: null },
  number: { branchFormat: 5 },
  list: { branchFormat: ['feature/{name}'] },
  object: { branchFormat: { v: 'feature/{name}' } },
  'boolean': { branchFormat: true },
  'no key': { gitMode: 'pr' },
  'empty object': {},
  'array config': '["feature/{name}"]',
  'string config': '"feature/{name}"',
  'number config': '42',
  'null config': 'null',
}

test('verify cli: TC-cli-7 a config without a usable branchFormat falls back to sdlc/{name}', () => {
  for (const [label, shape] of Object.entries(FALLBACK_SHAPES)) {
    const repo = repoWithConfig(shape)
    const obj = assertNameOk(name(`TC-cli-7 ${label}`, repo, ['--kind', 'slice', '--id', 'S-001']), { kind: 'slice' })
    assert.equal(obj.format, 'sdlc/{name}', label)
    assert.equal(obj.branch, 'sdlc/S-001', label)
    assert.deepEqual(pyLoadFormat(repo), { r: obj.format }, label)
  }
})

function brokenConfigRepos() {
  const invalid = repoWithConfig('{"branchFormat": "feature/{name}"')
  const deep = repoWithConfig('['.repeat(200000) + ']'.repeat(200000))
  const unreadable = repoWithConfig({ branchFormat: 'feature/{name}' })
  chmodSync(join(unreadable, '.sdlc/config.json'), 0o000)
  const asDir = r.gitRepo()
  mkdirSync(join(asDir, '.sdlc/config.json'), { recursive: true })
  writeFileSync(join(asDir, '.sdlc/config.json/keep'), '')
  const badUtf8 = r.gitRepo({ files: { '.sdlc/config.json': Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x3a, 0x31, 0x7d]) } })
  return { 'invalid JSON': invalid, 'deep nesting': deep, unreadable, directory: asDir, 'invalid UTF-8': badUtf8 }
}

test('verify cli: TC-cli-8 a broken config gives exit 2 and one JSON error, no traceback', () => {
  for (const [label, repo] of Object.entries(brokenConfigRepos())) {
    const t = name(`TC-cli-8 ${label}`, repo, ['--kind', 'slice', '--id', 'S-001'])
    assertJsonError(t)
    assert.ok('fail' in pyLoadFormat(repo), label)
  }
})

test('verify cli: TC-cli-9 an explicit empty --format fails validation and does not fall back', () => {
  const repo = repoWithConfig({ branchFormat: 'feature/{name}' })
  assertJsonError(name('TC-cli-9', repo, ['--kind', 'slice', '--id', 'S-001', '--format', '']))
  const bare = r.gitRepo()
  assertJsonError(name('TC-cli-9', bare, ['--kind', 'slice', '--id', 'S-001', '--format', '']))
})

test('verify cli: TC-cli-10 --format wins even when the config is broken', () => {
  for (const [label, repo] of Object.entries(brokenConfigRepos())) {
    assertNameOk(name(`TC-cli-10 ${label}`, repo, ['--kind', 'slice', '--id', 'S-001', '--format', 'team/{name}']), { format: 'team/{name}', branch: 'team/S-001' })
  }
})

test('verify cli: TC-cli-11 {name:lower} in the config lowercases the tail', () => {
  const repo = repoWithConfig({ branchFormat: 'feature/{name:lower}' })
  assertNameOk(name('TC-cli-11', repo, ['--kind', 'slice', '--id', 'S-001']), { format: 'feature/{name:lower}', branch: 'feature/s-001' })
  assertNameOk(name('TC-cli-11', repo, ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'API']), { branch: 'feature/m-1-e2e-api' })
  assertNameOk(name('TC-cli-11', repo, ['--kind', 'state'], { env: { TZ: 'Pacific/Kiritimati' } }), { branch: /^feature\/state-\d{14}$/ })
  assert.deepEqual(pyLoadFormat(repo), { r: 'feature/{name:lower}' })
})

test('verify cli: TC-cli-12 the name output holds exactly ok, command, format, kind and branch', () => {
  const repo = repoWithConfig({ branchFormat: 'feature/PROJ-1-{name}' })
  const cases = [
    [['--kind', 'slice', '--id', 'S-001'], 'feature/PROJ-1-{name}', 'feature/PROJ-1-S-001'],
    [['--kind', 'slice', '--id', 'S-001', '--format', 'team/{name}-x'], 'team/{name}-x', 'team/S-001-x'],
    [['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api'], 'feature/PROJ-1-{name}', 'feature/PROJ-1-M-1-e2e-api'],
    [['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api', '--format', 'sdlc/{name}'], 'sdlc/{name}', 'sdlc/M-1-e2e-api'],
    [['--kind', 'state'], 'feature/PROJ-1-{name}', /^feature\/PROJ-1-state-\d{14}$/],
    [['--kind', 'state', '--format', 'sdlc/{name}'], 'sdlc/{name}', /^sdlc\/state-\d{14}$/],
  ]
  for (const [args, format, branch] of cases) {
    const kind = args[1]
    assertNameOk(name('TC-cli-12', repo, args), { format, kind, branch })
  }
})

test('verify cli: TC-cli-13 unused part flags do not change the branch or crash', () => {
  const repo = r.gitRepo()
  const extra = ['--n', '0', '--part', '0', '--round', '0', '--profile', 'x']
  assertNameOk(name('TC-cli-13', repo, ['--kind', 'slice', '--id', 'S-001', ...extra]), { branch: 'sdlc/S-001' })
  assertNameOk(name('TC-cli-13', repo, ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api', ...extra]), { branch: 'sdlc/M-1-e2e-api' })
  assertNameOk(name('TC-cli-13', repo, ['--kind', 'slice', '--id', 'S-001', '--n', '7', '--part', '3', '--round', '2', '--profile', 'cli']), { branch: 'sdlc/S-001' })
})

test('verify cli: TC-cli-14 name is idempotent and independent of the cwd, with spaces and unicode in the repo path', () => {
  const repo = r.dir('repo with space ü 名前')
  r.writeFiles(repo, { '.sdlc/config.json': JSON.stringify({ branchFormat: 'feature/{name}' }) })
  const a = name('TC-cli-14', repo, ['--kind', 'slice', '--id', 'S-001'])
  const b = name('TC-cli-14', repo, ['--kind', 'slice', '--id', 'S-001'], { cwd: r.gitRepo({ files: { '.sdlc/config.json': JSON.stringify({ branchFormat: 'other/{name}' }) } }) })
  assertNameOk(a, { branch: 'feature/S-001' })
  assertNameOk(b, { branch: 'feature/S-001' })
  assert.equal(a.stdout, b.stdout)
})

test('verify cli: TC-cli-15 a --repo that is not a directory exits 2 with one JSON error', () => {
  const missing = join(r.dir('gone'), 'nope')
  assertJsonError(name('TC-cli-15', missing, ['--kind', 'slice', '--id', 'S-001']), /repo/)
})

function assertPreflight(t, { format, given }) {
  assert.equal(t.status, 0, t.text())
  assert.equal(t.stderr, '', t.text())
  const obj = assertOneJsonLine(t)
  assert.equal(obj.ok, true)
  assert.equal(obj.command, 'preflight')
  assert.equal(obj.format, format)
  assert.equal(typeof obj.given, 'boolean', t.text())
  assert.equal(obj.given, given)
  if (obj.given === false) assert.equal(obj.format, 'sdlc/{name}')
  assert.ok(t.treeUnchanged, t.text())
  return obj
}

test('verify cli: TC-cli-16 preflight --format reports that format with given true in every git mode', () => {
  const cfg = repoWithConfig({ branchFormat: 'feature/{name}' })
  const bare = r.gitRepo()
  for (const mode of MODES) {
    assertPreflight(preflight('TC-cli-16', cfg, ['--mode', mode, '--format', 'team/{name}']), { format: 'team/{name}', given: true })
    assertPreflight(preflight('TC-cli-16', bare, ['--mode', mode, '--format', 'sdlc/{name}']), { format: 'sdlc/{name}', given: true })
    assertPreflight(preflight('TC-cli-16', bare, ['--mode', mode, '--format', 'team/{name}']), { format: 'team/{name}', given: true })
  }
})

test('verify cli: TC-cli-17 preflight without a flag reads config.branchFormat with given true', () => {
  const feature = repoWithConfig({ branchFormat: 'feature/{name}' })
  const dflt = repoWithConfig({ branchFormat: 'sdlc/{name}' })
  for (const mode of MODES) {
    assertPreflight(preflight('TC-cli-17', feature, ['--mode', mode]), { format: 'feature/{name}', given: true })
    assertPreflight(preflight('TC-cli-17', dflt, ['--mode', mode]), { format: 'sdlc/{name}', given: true })
  }
})

test('verify cli: TC-cli-18 preflight --format with a broken config still reports the flag', () => {
  for (const [label, repo] of Object.entries(brokenConfigRepos())) {
    assertPreflight(preflight(`TC-cli-18 ${label}`, repo, ['--mode', 'pr', '--format', 'team/{name}']), { format: 'team/{name}', given: true })
  }
})

test('verify cli: TC-cli-19 preflight with no format given falls back to sdlc/{name} with given false', () => {
  const repos = { 'no config': r.gitRepo(), 'no git': r.dir('plain') }
  for (const [label, shape] of Object.entries(FALLBACK_SHAPES)) repos[label] = repoWithConfig(shape)
  for (const [label, repo] of Object.entries(repos)) {
    for (const mode of MODES) {
      assertPreflight(preflight(`TC-cli-19 ${label}`, repo, ['--mode', mode]), { format: 'sdlc/{name}', given: false })
    }
    assert.deepEqual(pyLoadFormat(repo), { r: 'sdlc/{name}' }, label)
  }
})

test('verify cli: TC-cli-20 preflight with no flag and a broken config exits 2 with one JSON error', () => {
  for (const [label, repo] of Object.entries(brokenConfigRepos())) {
    assertJsonError(preflight(`TC-cli-20 ${label}`, repo, ['--mode', 'pr']))
  }
})

test('verify cli: TC-cli-21 preflight with an unknown mode or an invalid --format exits 2 with one JSON error', () => {
  const repo = r.gitRepo()
  assertJsonError(preflight('TC-cli-21', repo, ['--mode', 'bogus']), /mode/)
  assertJsonError(preflight('TC-cli-21', repo, ['--mode', 'pr', '--format', '']))
  assertJsonError(preflight('TC-cli-21', repo, ['--mode', 'pr', '--format', 'no-placeholder']))
})
