import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT ?? resolve(HERE, '../../../../../../..')
const LOG = process.env.VERIFY_LOG ?? resolve(HERE, '../../logs/cli-0-transcripts.json')
const { cliRunner } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs')).href)

const r = cliRunner()
const transcripts = {}
const DEFAULT = 'sdlc/{name}'
const repoCache = {}
function repoFor(fmt) {
  const key = fmt ?? '<default>'
  if (!repoCache[key]) repoCache[key] = r.gitRepo({ files: fmt ? { '.sdlc/config.json': { branchFormat: fmt } } : {}, branches: ['x'] })
  return repoCache[key]
}
function parse(id, branch, { fmt = null, viaFlag = false, extra = [] } = {}) {
  const repo = repoFor(viaFlag ? null : fmt)
  const args = ['parse', '--repo', repo, `--branch=${branch}`, ...(viaFlag && fmt ? ['--format', fmt] : []), ...extra]
  const t = r.run('branches.py', args)
  const line = `$ branches.py parse --branch ${JSON.stringify(branch)} (format ${fmt ?? DEFAULT}${viaFlag ? ' via --format' : ' via config'})\nexit ${t.status}\nstdout: ${t.stdout.trim()}\nstderr: ${t.stderr.trim()}\ntree unchanged: ${t.treeUnchanged}`
  ;(transcripts[id] ??= []).push(line)
  assert.equal(t.treeUnchanged, true, 'working tree and refs unchanged')
  return t
}
const BASE = ['ok', 'command', 'format', 'branch', 'kind']
function expectNull(id, branch, opts) {
  const t = parse(id, branch, opts)
  assert.equal(t.status, 0, `exit for ${branch}`)
  assert.deepEqual(t.json, { ok: true, command: 'parse', format: opts?.fmt ?? DEFAULT, branch, kind: null })
  assert.deepEqual(Object.keys(t.json), BASE)
}
function expectKind(id, branch, kind, parts, opts) {
  const t = parse(id, branch, opts)
  assert.equal(t.status, 0)
  const j = t.json
  assert.equal(j.ok, true)
  assert.equal(j.command, 'parse')
  assert.equal(j.kind, kind, `kind for ${branch}`)
  assert.deepEqual(Object.keys(j).slice(0, 5), BASE)
  const rest = { ...j }
  for (const k of BASE) delete rest[k]
  assert.deepEqual(rest, parts, `parts for ${branch}`)
  return j
}

after(() => {
  mkdirSync(dirname(LOG), { recursive: true })
  writeFileSync(LOG, JSON.stringify(transcripts, null, 2))
})

test('verify cli VS-1: a foreign branch gives kind null with no part keys', () => {
  expectNull('VS-1', 'main')
  expectNull('VS-1', 'feature/PROJ-1-foo', { fmt: 'feature/PROJ-1-{name}' })
  expectNull('VS-1', 'sdlc/feature-x')
  expectNull('VS-1', 'feature/PROJ-1-foo', { fmt: 'feature/PROJ-1-{name}', viaFlag: true })
  expectNull('VS-1', 'sdlc', {})
  expectNull('VS-1', 'sdl', {})
  expectNull('VS-1', 'feat', { fmt: 'feature/PROJ-1-{name}' })
  expectNull('VS-1', '', {})
  expectNull('VS-1', 'S-001', { fmt: 'feature/PROJ-1-{name}' })
  expectNull('VS-1', 'feature/PROJ-1-', { fmt: 'feature/PROJ-1-{name}' })
  expectNull('VS-1', 'xsdlc/S-001')
  expectNull('VS-1', 'SDLC/S-001')
})

test('verify cli VS-2: prefix and suffix pass but no row matches gives null', () => {
  for (const b of ['sdlc/', 'sdlc/run-', 'sdlc/run-x', 'sdlc/state-1', 'sdlc/M-', 'sdlc/S-', 'sdlc/-attempt-3']) expectNull('VS-2', b)
  const W = '{name}-wip'
  expectNull('VS-2', 'S-001', { fmt: W })
  expectNull('VS-2', 'S-001-wip-wip-x', { fmt: W })
  expectKind('VS-2', 'S-001-wip', 'slice', { tail: 'S-001', id: 'S-001', known: null }, { fmt: W })
  expectNull('VS-2', '-wip', { fmt: W })
  expectNull('VS-2', 'wip', { fmt: W })
  expectNull('VS-2', 'aba', { fmt: 'ab{name}ba' })
  expectNull('VS-2', 'abba', { fmt: 'ab{name}ba' })
  expectNull('VS-2', 'ab', { fmt: 'ab{name}ba' })
  expectKind('VS-2', 'abS-1ba', 'slice', { tail: 'S-1', id: 'S-1', known: null }, { fmt: 'ab{name}ba' })
  expectNull('VS-2', 'aa', { fmt: 'aa{name}aa' })
  expectNull('VS-2', 'aaa', { fmt: 'aa{name}aa' })
})

test('verify cli VS-3: first matching row wins', () => {
  expectKind('VS-3', 'sdlc/run-2', 'run', { tail: 'run-2', n: 2, known: null })
  expectKind('VS-3', 'sdlc/M-1', 'milestone', { tail: 'M-1', id: 'M-1', known: null })
  expectKind('VS-3', 'sdlc/M-1-e2e', 'e2e', { tail: 'M-1-e2e', id: 'M-1', known: null })
  expectKind('VS-3', 'sdlc/M-1-e2e-api', 'e2e-area', { tail: 'M-1-e2e-api', id: 'M-1', area: 'api', known: null })
  expectKind('VS-3', 'sdlc/M-1-e2e-a-b', 'e2e-area', { tail: 'M-1-e2e-a-b', id: 'M-1', area: 'a-b', known: null })
  expectKind('VS-3', 'sdlc/state-20261008101500', 'state', { tail: 'state-20261008101500', ts: '20261008101500', known: null })
  expectKind('VS-3', 'sdlc/S-001-v0-http-api-0', 'verify', { tail: 'S-001-v0-http-api-0', id: 'S-001', round: 0, profile: 'http-api', part: 0, known: null })
  expectKind('VS-3', 'sdlc/S-001-attempt-3', 'attempt', { tail: 'S-001-attempt-3', id: 'S-001', n: 3, known: null })
  expectKind('VS-3', 'sdlc/S-001', 'slice', { tail: 'S-001', id: 'S-001', known: null })
  expectKind('VS-3', 'sdlc/S-fix-M-1-2', 'slice', { tail: 'S-fix-M-1-2', id: 'S-fix-M-1-2', known: null })
  expectKind('VS-3', 'sdlc/S-007a', 'slice', { tail: 'S-007a', id: 'S-007a', known: null })
  expectKind('VS-3', 'sdlc/S-001-v0-x-attempt-3', 'verify', { tail: 'S-001-v0-x-attempt-3', id: 'S-001', round: 0, profile: 'x-attempt', part: 3, known: null })
  expectKind('VS-3', 'sdlc/M-1-e2e-api-v0-x-0', 'e2e-area', { tail: 'M-1-e2e-api-v0-x-0', id: 'M-1', area: 'api-v0-x-0', known: null })
  expectKind('VS-3', 'sdlc/S-fix-M-1-1-attempt-2', 'attempt', { tail: 'S-fix-M-1-1-attempt-2', id: 'S-fix-M-1-1', n: 2, known: null })
  expectKind('VS-3', 'sdlc/S-fix-M-1-1-v2-regression-4', 'verify', { tail: 'S-fix-M-1-1-v2-regression-4', id: 'S-fix-M-1-1', round: 2, profile: 'regression', part: 4, known: null })
  expectKind('VS-3', 'sdlc/S-001-v0-http-api-0-0', 'verify', { tail: 'S-001-v0-http-api-0-0', id: 'S-001', round: 0, profile: 'http-api-0', part: 0, known: null })
  expectNull('VS-3', 'sdlc/M-1-e2e-')
  expectNull('VS-3', 'sdlc/m-1')
  expectNull('VS-3', 'sdlc/s-001')
  expectKind('VS-3', 'sdlc/S-001-v0-Http-0', 'slice', { tail: 'S-001-v0-Http-0', id: 'S-001-v0-Http-0', known: null })
  expectKind('VS-3', 'sdlc/S-001-v-x-0', 'slice', { tail: 'S-001-v-x-0', id: 'S-001-v-x-0', known: null })
  expectNull('VS-3', 'sdlc/state-2026100810150')
  expectNull('VS-3', 'sdlc/state-202610081015000')
  expectNull('VS-3', 'sdlc/run-2a')
  expectNull('VS-3', 'sdlc/run--2')
  expectKind('VS-3', 'sdlc/S-001-attempt-', 'slice', { tail: 'S-001-attempt-', id: 'S-001-attempt-', known: null })
  expectNull('VS-3', 'sdlc/x-attempt-3-y')
})

test('verify cli VS-4: case-insensitive only under {name:lower}', () => {
  const L = 'feature/PROJ-1-{name:lower}'
  const P = 'feature/PROJ-1-{name}'
  expectKind('VS-4', 'feature/PROJ-1-s-001', 'slice', { tail: 's-001', id: 's-001', known: null }, { fmt: L })
  expectKind('VS-4', 'feature/PROJ-1-m-1-e2e-api', 'e2e-area', { tail: 'm-1-e2e-api', id: 'm-1', area: 'api', known: null }, { fmt: L })
  expectKind('VS-4', 'feature/PROJ-1-run-2', 'run', { tail: 'run-2', n: 2, known: null }, { fmt: L })
  expectKind('VS-4', 'feature/PROJ-1-s-001-v0-http-api-0', 'verify', { tail: 's-001-v0-http-api-0', id: 's-001', round: 0, profile: 'http-api', part: 0, known: null }, { fmt: L })
  expectKind('VS-4', 'feature/PROJ-1-state-20261008101500', 'state', { tail: 'state-20261008101500', ts: '20261008101500', known: null }, { fmt: L })
  expectNull('VS-4', 'feature/PROJ-1-s-001', { fmt: P })
  expectNull('VS-4', 'feature/PROJ-1-m-1-e2e-api', { fmt: P })
  expectKind('VS-4', 'feature/PROJ-1-run-2', 'run', { tail: 'run-2', n: 2, known: null }, { fmt: P })
  expectNull('VS-4', 'feature/PROJ-1-RUN-2', { fmt: P })
  expectNull('VS-4', 'feature/PROJ-1-state-20261008101500x', { fmt: P })
  expectKind('VS-4', 'FEATURE/proj-1-s-001', 'slice', { tail: 's-001', id: 's-001', known: null }, { fmt: L })
  expectKind('VS-4', 'Feature/Proj-1-RUN-2', 'run', { tail: 'RUN-2', n: 2, known: null }, { fmt: L })
  expectNull('VS-4', 'FEATURE/proj-1-s-001', { fmt: P })
  expectNull('VS-4', 'feature/proj-1-S-001', { fmt: P })
  expectKind('VS-4', 'feature/PROJ-1-S-001', 'slice', { tail: 'S-001', id: 'S-001', known: null }, { fmt: P })
  expectKind('VS-4', 'sdlc/S-001-WIP', 'slice', { tail: 'S-001', id: 'S-001', known: null }, { fmt: 'sdlc/{name:lower}-wip' })
  expectNull('VS-4', 'sdlc/S-001-WIP', { fmt: 'sdlc/{name}-wip' })
})

test('verify cli VS-5: the result holds the parts that apply, with integer types', () => {
  const cases = [
    ['sdlc/run-2', ['kind', 'tail', 'n', 'known']],
    ['sdlc/run-0042', ['kind', 'tail', 'n', 'known']],
    ['sdlc/state-20261008101500', ['kind', 'tail', 'ts', 'known']],
    ['sdlc/S-001-v0-http-api-0', ['kind', 'tail', 'id', 'round', 'profile', 'part', 'known']],
    ['sdlc/M-1-e2e-api', ['kind', 'tail', 'id', 'area', 'known']],
    ['sdlc/S-001-attempt-3', ['kind', 'tail', 'id', 'n', 'known']],
    ['sdlc/S-001', ['kind', 'tail', 'id', 'known']],
    ['sdlc/M-1', ['kind', 'tail', 'id', 'known']],
    ['sdlc/M-1-e2e', ['kind', 'tail', 'id', 'known']],
  ]
  for (const [b, keys] of cases) {
    const t = parse('VS-5', b)
    assert.equal(t.status, 0)
    assert.deepEqual(Object.keys(t.json), [...BASE, ...keys.slice(1)].filter(k => k !== 'kind' || true).reduce((a, k) => a.includes(k) ? a : [...a, k], []), `keys for ${b}`)
    assert.equal(t.json.tail, b.slice('sdlc/'.length))
    for (const k of ['n', 'round', 'part']) if (k in t.json) assert.equal(Number.isInteger(t.json[k]), true, `${k} is an integer for ${b}`)
    assert.equal(t.json.known, null)
    assert.equal(t.json.ts === undefined || typeof t.json.ts === 'string', true)
  }
  assert.equal(parse('VS-5', 'sdlc/run-0042').json.n, 42)
  assert.equal(parse('VS-5', 'sdlc/run-0042').json.tail, 'run-0042')
  assert.match(parse('VS-5', 'sdlc/run-0042').stdout, /"n": 42[,}]/)
  const big = parse('VS-5', 'sdlc/run-123456789012345678901234567890')
  assert.equal(big.status, 0)
  assert.match(big.stdout, /"n": 123456789012345678901234567890/)
})

test('verify cli VS-8: parse prints one flat JSON object and keeps the error contract', () => {
  const t = parse('VS-8', 'sdlc/S-001-v0-http-api-0')
  assert.equal(t.stdout.trim().split('\n').length, 1)
  assert.deepEqual(Object.keys(t.json).slice(0, 5), BASE)
  assert.equal(t.json.branch, 'sdlc/S-001-v0-http-api-0')
  assert.equal(t.json.format, DEFAULT)
  assert.equal(t.json.args, undefined)
  for (const v of Object.values(t.json)) assert.notEqual(typeof v === 'object' && v !== null, true, 'flat: no nested objects')
  const repo = repoFor(null)
  const none = r.run('branches.py', ['parse', '--repo', repo])
  ;(transcripts['VS-8'] ??= []).push(`$ branches.py parse --repo <repo>\nexit ${none.status}\nstdout: ${none.stdout.trim()}\nstderr: ${none.stderr.trim()}\ntree unchanged: ${none.treeUnchanged}`)
  assert.equal(none.status, 2)
  assert.equal(none.json.ok, false)
  assert.match(none.json.error, /--branch/)
  assert.equal(none.treeUnchanged, true)
  for (const fmt of ['nobrace', '{name}{name}', 'a{name}{', 'a b/{name}', 'a..b/{name}', '']) {
    const t2 = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'main', '--format', fmt])
    ;(transcripts['VS-8'] ??= []).push(`$ branches.py parse --branch main --format ${JSON.stringify(fmt)}\nexit ${t2.status}\nstdout: ${t2.stdout.trim()}\nstderr: ${t2.stderr.trim()}\ntree unchanged: ${t2.treeUnchanged}`)
    if (fmt === '') {
      assert.equal(t2.status, 2)
    } else {
      assert.equal(t2.status, 2, `invalid format ${fmt}`)
      assert.equal(t2.json.ok, false)
      assert.equal('kind' in t2.json, false)
    }
    assert.equal(t2.treeUnchanged, true)
  }
  const noDir = r.run('branches.py', ['parse', '--repo', '/nonexistent-dir-xyz', '--branch', 'main'])
  ;(transcripts['VS-8'] ??= []).push(`$ branches.py parse --repo /nonexistent-dir-xyz --branch main\nexit ${noDir.status}\nstdout: ${noDir.stdout.trim()}`)
  assert.equal(noDir.status, 2)
  assert.equal(noDir.json.ok, false)
  const badCfg = r.gitRepo({ files: { '.sdlc/config.json': '{not json' } })
  const bc = r.run('branches.py', ['parse', '--repo', badCfg, '--branch', 'main'])
  ;(transcripts['VS-8'] ??= []).push(`$ branches.py parse (invalid config.json) --branch main\nexit ${bc.status}\nstdout: ${bc.stdout.trim()}`)
  assert.equal(bc.status, 2)
  assert.equal(bc.json.ok, false)
  const unk = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'main', '--bogus'])
  ;(transcripts['VS-8'] ??= []).push(`$ branches.py parse --bogus\nexit ${unk.status}\nstdout: ${unk.stdout.trim()}`)
  assert.equal(unk.status, 2)
  const ws = parse('VS-8', 'feature/PROJ-1-S-001-é ü', { fmt: 'feature/PROJ-1-{name}' })
  assert.equal(ws.status, 0)
  assert.equal(ws.json.kind, null)
  const uni = parse('VS-8', 'sdlc/S-001-attempt-3\n')
  assert.equal(uni.status, 0)
  const spaced = r.gitRepo({ name: 'dir with spaces ü', files: {}, branches: [] })
  const sp = r.run('branches.py', ['parse', '--repo', spaced, '--branch', 'sdlc/run-2'])
  ;(transcripts['VS-8'] ??= []).push(`$ branches.py parse --repo "<dir with spaces ü>" --branch sdlc/run-2\nexit ${sp.status}\nstdout: ${sp.stdout.trim()}`)
  assert.equal(sp.status, 0)
  assert.equal(sp.json.kind, 'run')
  const twice = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/run-2'])
  const once = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/run-2'])
  assert.equal(twice.stdout, once.stdout)
})
