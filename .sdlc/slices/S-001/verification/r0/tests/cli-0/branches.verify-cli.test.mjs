import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, symlinkSync, chmodSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = process.env.SDLC_VERIFY_REPO ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const { cliRunner } = await import(join(REPO_ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const { abbreviations } = await import(join(REPO_ROOT, 'skills/sdlc/test/testkit/attack-corpus.mjs'))

const LOG = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'logs', 'cli-0-transcripts.txt')
const transcripts = []
const r = cliRunner()

function run(caseId, args, opts) {
  const t = r.run('branches.py', args, opts)
  transcripts.push(`### ${caseId}\n${t.text()}\n`)
  assert.ok(!t.stderr.includes('Traceback'), `traceback on ${args.join(' ')}:\n${t.stderr}`)
  return t
}

function oneObject(t) {
  assert.ok(t.stdout.endsWith('\n'), `stdout must end with one newline: ${JSON.stringify(t.stdout)}`)
  const lines = t.stdout.slice(0, -1).split('\n')
  assert.equal(lines.length, 1, `stdout must be one line: ${JSON.stringify(t.stdout)}`)
  const obj = JSON.parse(lines[0])
  assert.equal(typeof obj, 'object')
  assert.ok(obj !== null && !Array.isArray(obj))
  return obj
}

function expectOk(t, command) {
  assert.equal(t.status, 0, t.text())
  const obj = oneObject(t)
  assert.equal(obj.ok, true)
  assert.equal(obj.command, command)
  assert.equal(typeof obj.format, 'string')
  assert.equal(t.stderr, '')
  assert.ok(t.treeUnchanged, t.text())
  return obj
}

function expectError(t) {
  assert.equal(t.status, 2, t.text())
  const obj = oneObject(t)
  assert.deepEqual(Object.keys(obj).sort(), ['error', 'ok'])
  assert.equal(obj.ok, false)
  assert.equal(typeof obj.error, 'string')
  assert.ok(obj.error.length > 0)
  assert.ok(!/usage:/i.test(t.stdout), t.stdout)
  assert.ok(t.treeUnchanged, t.text())
  return obj
}

const repo = r.gitRepo({ name: 'repo with space ünï' })
const plainRepo = r.gitRepo({ name: 'plain' })
const NAME_ALL = ['--kind', 'verify', '--id', 'S-001', '--n', '1', '--area', 'api', '--round', '0', '--profile', 'http-api', '--part', '0', '--format', 'feature/{name}']

after(() => {
  mkdirSync(dirname(LOG), { recursive: true })
  writeFileSync(LOG, transcripts.join('\n'))
})

test('verify cli TC-cli-1: name with every spec flag prints one JSON object, twice, from a repo path with a space and unicode', () => {
  const a = run('TC-cli-1', ['name', '--repo', repo, ...NAME_ALL])
  const objA = expectOk(a, 'name')
  assert.equal(objA.format, 'feature/{name}')
  const b = run('TC-cli-1', ['name', '--repo', repo, ...NAME_ALL])
  assert.deepEqual(expectOk(b, 'name'), objA)
})

test('verify cli TC-cli-2: parse, list and preflight with every spec flag, in other orders and with --flag=value, print one JSON object', () => {
  const cases = [
    ['parse', ['parse', '--repo', repo, '--branch', 'sdlc/S-001', '--format', 'sdlc/{name}']],
    ['parse', ['parse', '--format=sdlc/{name}', '--branch=sdlc/S-001', `--repo=${repo}`]],
    ['list', ['list', '--repo', repo, '--kind', 'slice', '--format', 'sdlc/{name}']],
    ['list', ['list', '--kind=slice', '--format=sdlc/{name}', `--repo=${repo}`]],
    ['preflight', ['preflight', '--repo', repo, '--mode', 'mr', '--format', 'sdlc/{name}', '--branch', 'main']],
    ['preflight', ['preflight', '--branch=main', '--format=sdlc/{name}', '--mode=mr', `--repo=${repo}`]],
    ['name', ['name', '--part=0', '--profile=http-api', '--round=0', '--area=api', '--n=1', '--id=S-001', '--kind=verify', '--format=feature/{name}', `--repo=${repo}`]],
  ]
  for (const [cmd, args] of cases) {
    const first = expectOk(run('TC-cli-2', args), cmd)
    assert.deepEqual(expectOk(run('TC-cli-2', args), cmd), first)
  }
})

test('verify cli TC-cli-3: each command with its optional flags left out prints one JSON object', () => {
  expectOk(run('TC-cli-3', ['name', '--repo', repo, '--kind', 'slice']), 'name')
  expectOk(run('TC-cli-3', ['parse', '--repo', repo, '--branch', 'sdlc/S-001']), 'parse')
  expectOk(run('TC-cli-3', ['list', '--repo', repo, '--kind', 'run']), 'list')
  expectOk(run('TC-cli-3', ['preflight', '--repo', repo, '--mode', 'pr']), 'preflight')
  expectOk(run('TC-cli-3', ['preflight', '--repo', repo, '--mode', 'pr', '--branch', 'main']), 'preflight')
  expectOk(run('TC-cli-3', ['name', '--repo', repo, '--kind', 'attempt', '--id', 'S-001', '--n', '2']), 'name')
})

test('verify cli TC-cli-4: a flag that the command does not name exits 2 with one JSON error', () => {
  const cases = [
    ['parse', '--repo', plainRepo, '--branch', 'x', '--kind', 'slice'],
    ['list', '--repo', plainRepo, '--kind', 'slice', '--branch', 'x'],
    ['preflight', '--repo', plainRepo, '--mode', 'pr', '--kind', 'slice'],
    ['name', '--repo', plainRepo, '--kind', 'slice', '--branch', 'x'],
    ['list', '--repo', plainRepo, '--kind', 'slice', '--id', 'S-1'],
    ['parse', '--repo', plainRepo, '--branch', 'x', '--mode', 'pr'],
    ['preflight', '--repo', plainRepo, '--mode', 'pr', '--n', '1'],
    ['name', '--repo', plainRepo, '--kind', 'slice', '--bogus', '1'],
  ]
  for (const args of cases) expectError(run('TC-cli-4', args))
})

test('verify cli TC-cli-5: a missing required flag, no command or an unknown command exits 2 with one JSON error', () => {
  const cases = [
    ['parse', '--repo', plainRepo],
    ['name', '--repo', plainRepo],
    ['preflight', '--repo', plainRepo],
    ['list', '--repo', plainRepo],
    ['name', '--kind', 'slice'],
    ['parse', '--branch', 'x'],
    ['list', '--kind', 'slice'],
    ['preflight', '--mode', 'pr'],
    [],
    ['bogus', '--repo', plainRepo],
    ['--repo', plainRepo],
  ]
  for (const args of cases) expectError(run('TC-cli-5', args))
})

test('verify cli TC-cli-6: a flag given twice and an extra positional argument print one JSON object', () => {
  const twice = run('TC-cli-6', ['parse', '--repo', plainRepo, '--branch', 'a', '--branch', 'b'])
  const obj = oneObject(twice)
  assert.ok(twice.status === 0 || twice.status === 2, twice.text())
  if (twice.status === 0) assert.equal(obj.ok, true)
  expectError(run('TC-cli-6', ['parse', '--repo', plainRepo, '--branch', 'a', 'extra']))
  expectError(run('TC-cli-6', ['name', 'extra', '--repo', plainRepo, '--kind', 'slice']))
})

test('verify cli TC-cli-7: flag prefixes are recorded; each run prints one JSON object', () => {
  const outcomes = {}
  for (const abbr of [...abbreviations('--repo'), ...abbreviations('--format')]) {
    const args = abbr.startsWith('--r')
      ? ['parse', abbr, plainRepo, '--branch', 'x']
      : ['parse', '--repo', plainRepo, '--branch', 'x', abbr, 'sdlc/{name}']
    const t = run('TC-cli-7', args)
    oneObject(t)
    assert.ok(t.status === 0 || t.status === 2, t.text())
    outcomes[abbr] = t.status
  }
  transcripts.push(`### TC-cli-7 summary\n${JSON.stringify(outcomes)}\n`)
})

test('verify cli TC-cli-8: -h and --help are recorded (spec defines neither)', () => {
  for (const args of [['--help'], ['-h'], ['name', '--help'], ['preflight', '-h']]) {
    const t = run('TC-cli-8', args)
    assert.ok(t.status === 0 || t.status === 2, t.text())
  }
})

test('verify cli TC-cli-9: a non-integer --n, --round or --part exits 2 with one JSON error', () => {
  const bad = [['--n', 'two'], ['--n', '1.5'], ['--n', ''], ['--round', '0x1'], ['--part', 'one'], ['--round', '1e3'], ['--n', '٣x']]
  for (const [flag, value] of bad) {
    expectError(run('TC-cli-9', ['name', '--repo', plainRepo, '--kind', 'verify', flag, value]))
    expectError(run('TC-cli-9', ['name', '--repo', plainRepo, '--kind', 'verify', `${flag}=${value}`]))
  }
})

test('verify cli TC-cli-10: odd integer values for --n, --round and --part are recorded; each prints one JSON object', () => {
  const odd = [['--part', '-1'], ['--n', '99999999999999999999'], ['--n', ' 3'], ['--n', '٣'], ['--round', '0003'], ['--n', '1_000'], ['--n', '+4']]
  const outcomes = {}
  for (const [flag, value] of odd) {
    const t = run('TC-cli-10', ['name', '--repo', plainRepo, '--kind', 'verify', `${flag}=${value}`])
    const obj = oneObject(t)
    assert.ok(t.status === 0 || t.status === 2, t.text())
    outcomes[`${flag}=${value}`] = t.status === 0 ? obj.args[flag.slice(2)] : 'exit 2'
  }
  transcripts.push(`### TC-cli-10 summary\n${JSON.stringify(outcomes)}\n`)
})

const BAD_FORMATS = [
  'feature/x', '{name}{name}', '{name}-{name:lower}', 'sdlc/{name', 'sdlc/name}', 'sdlc/{name}}', '{sdlc/{name}',
  '{id}', 'sdlc/{id}/{name}', '{NAME}', '{name:upper}', '{name:lower}}', 'sdlc/ {name}', 'sdlc/\t{name}',
  'sdlc/{name}\n', 'sdlc/\r{name}', 'sdlc/ {name}', 'sdlc/　{name}', '',
]

test('verify cli TC-cli-11: an invalid --format exits 2 with one JSON error on every command', () => {
  for (const fmt of BAD_FORMATS) {
    expectError(run('TC-cli-11', ['name', '--repo', plainRepo, '--kind', 'slice', '--id', 'S-1', '--format', fmt]))
    expectError(run('TC-cli-11', ['parse', '--repo', plainRepo, '--branch', 'sdlc/S-1', '--format', fmt]))
    expectError(run('TC-cli-11', ['list', '--repo', plainRepo, '--kind', 'slice', '--format', fmt]))
    expectError(run('TC-cli-11', ['preflight', '--repo', plainRepo, '--mode', 'pr', `--format=${fmt}`]))
  }
})

test('verify cli TC-cli-12: valid --format controls pass on every command and print the format', () => {
  for (const fmt of ['sdlc/{name}', 'sdlc/{name:lower}', 'feature/{name}-x', 'feature/PROJ-123-{name}', '{name}']) {
    assert.equal(expectOk(run('TC-cli-12', ['name', '--repo', plainRepo, '--kind', 'slice', '--format', fmt]), 'name').format, fmt)
    assert.equal(expectOk(run('TC-cli-12', ['parse', '--repo', plainRepo, '--branch', 'x', '--format', fmt]), 'parse').format, fmt)
    assert.equal(expectOk(run('TC-cli-12', ['list', '--repo', plainRepo, '--kind', 'slice', '--format', fmt]), 'list').format, fmt)
    assert.equal(expectOk(run('TC-cli-12', ['preflight', '--repo', plainRepo, '--mode', 'stack', '--format', fmt]), 'preflight').format, fmt)
  }
})

test('verify cli TC-cli-13: an unknown --kind or --mode exits 2 with one JSON error', () => {
  for (const kind of ['bogus', 'SLICE', '', 'slice ', 'Slice', 'e2e_area']) {
    expectError(run('TC-cli-13', ['name', '--repo', plainRepo, '--kind', kind]))
    expectError(run('TC-cli-13', ['list', '--repo', plainRepo, '--kind', kind]))
  }
  for (const mode of ['bogus', 'PR', '', 'pr ', 'Direct']) {
    expectError(run('TC-cli-13', ['preflight', '--repo', plainRepo, '--mode', mode]))
  }
})

test('verify cli TC-cli-14: all eight kinds and all four git modes pass', () => {
  for (const kind of ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state', 'verify', 'attempt']) {
    expectOk(run('TC-cli-14', ['name', '--repo', plainRepo, '--kind', kind]), 'name')
    expectOk(run('TC-cli-14', ['list', '--repo', plainRepo, '--kind', kind]), 'list')
  }
  for (const mode of ['pr', 'direct', 'mr', 'stack']) {
    expectOk(run('TC-cli-14', ['preflight', '--repo', plainRepo, '--mode', mode]), 'preflight')
  }
})

test('verify cli TC-cli-15: a --repo that is not a directory exits 2; a symlink to a directory and a path with .. pass', () => {
  const base = r.dir('repo-shapes')
  const file = join(base, 'a-file')
  writeFileSync(file, 'x')
  const link = join(base, 'link')
  symlinkSync(plainRepo, link)
  const brokenLink = join(base, 'broken')
  symlinkSync(join(base, 'nowhere'), brokenLink)
  for (const bad of [join(base, 'missing'), file, brokenLink, '']) {
    expectError(run('TC-cli-15', ['parse', '--repo', bad, '--branch', 'x']))
    expectError(run('TC-cli-15', ['name', '--repo', bad, '--kind', 'slice']))
    expectError(run('TC-cli-15', ['list', '--repo', bad, '--kind', 'slice']))
    expectError(run('TC-cli-15', ['preflight', '--repo', bad, '--mode', 'pr']))
  }
  expectOk(run('TC-cli-15', ['parse', '--repo', link, '--branch', 'x']), 'parse')
  expectOk(run('TC-cli-15', ['parse', '--repo', `${plainRepo}/../${plainRepo.split('/').pop()}`, '--branch', 'x']), 'parse')
})

test('verify cli TC-cli-16: a missing or malformed git-modes.json fails preflight with one JSON error; the other commands still run', () => {
  const shapes = [
    { omit: ['git-modes.json'] },
    { files: { 'git-modes.json': '{not json' } },
    { files: { 'git-modes.json': { gitModes: [] } } },
    { files: { 'git-modes.json': { modes: ['pr'] } } },
    { files: { 'git-modes.json': ['pr'] } },
    { files: { 'git-modes.json': { gitModes: 'pr' } } },
    { files: { 'git-modes.json': { gitModes: [1, 'pr'] } } },
    { files: { 'git-modes.json': Buffer.from([0x7b, 0xff, 0xfe, 0x7d]) } },
  ]
  for (const shape of shapes) {
    const skillDir = r.copySkill(shape)
    expectError(run('TC-cli-16', ['preflight', '--repo', plainRepo, '--mode', 'pr'], { skillDir }))
    expectOk(run('TC-cli-16', ['name', '--repo', plainRepo, '--kind', 'slice'], { skillDir }), 'name')
    expectOk(run('TC-cli-16', ['parse', '--repo', plainRepo, '--branch', 'x'], { skillDir }), 'parse')
    expectOk(run('TC-cli-16', ['list', '--repo', plainRepo, '--kind', 'slice'], { skillDir }), 'list')
  }
})

function configRepo(name, content) {
  const d = r.gitRepo({ name })
  if (content === undefined) return d
  mkdirSync(join(d, '.sdlc'), { recursive: true })
  if (content === 'NO_FILE') return d
  if (content === 'DIR') { mkdirSync(join(d, '.sdlc', 'config.json')); return d }
  writeFileSync(join(d, '.sdlc', 'config.json'), content)
  return d
}

test('verify cli TC-cli-17: parse without --format prints the config format or the default', () => {
  const cases = [
    ['feature', JSON.stringify({ branchFormat: 'feature/{name}' }), 'feature/{name}'],
    ['lower', JSON.stringify({ branchFormat: 'x/{name:lower}', other: 1 }), 'x/{name:lower}'],
    ['nokey', JSON.stringify({ gitMode: 'pr' }), 'sdlc/{name}'],
    ['empty', JSON.stringify({ branchFormat: '' }), 'sdlc/{name}'],
    ['nofile', 'NO_FILE', 'sdlc/{name}'],
    ['nosdlc', undefined, 'sdlc/{name}'],
    ['null', JSON.stringify({ branchFormat: null }), 'sdlc/{name}'],
    ['number', JSON.stringify({ branchFormat: 7 }), 'sdlc/{name}'],
    ['list', JSON.stringify({ branchFormat: ['feature/{name}'] }), 'sdlc/{name}'],
    ['toplist', JSON.stringify(['feature/{name}']), 'sdlc/{name}'],
    ['topstring', JSON.stringify('feature/{name}'), 'sdlc/{name}'],
  ]
  for (const [name, content, expected] of cases) {
    const d = configRepo(`cfg-${name}`, content)
    const obj = expectOk(run(`TC-cli-17 ${name}`, ['parse', '--repo', d, '--branch', 'x']), 'parse')
    assert.equal(obj.format, expected, name)
    assert.equal(expectOk(run(`TC-cli-17 ${name}`, ['list', '--repo', d, '--kind', 'slice']), 'list').format, expected, name)
  }
})

test('verify cli TC-cli-18: an unreadable or malformed config exits 2 with one JSON error, not a traceback', () => {
  const cases = [
    ['invalid', '{"branchFormat": '],
    ['dir', 'DIR'],
    ['badutf8', Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x7d])],
  ]
  for (const [name, content] of cases) {
    const d = configRepo(`cfg-${name}`, content)
    expectError(run(`TC-cli-18 ${name}`, ['parse', '--repo', d, '--branch', 'x']))
  }
  const u = configRepo('cfg-unreadable', JSON.stringify({ branchFormat: 'feature/{name}' }))
  const p = join(u, '.sdlc', 'config.json')
  chmodSync(p, 0o000)
  try {
    expectError(run('TC-cli-18 unreadable', ['parse', '--repo', u, '--branch', 'x']))
  } finally {
    chmodSync(p, 0o644)
  }
})

test('verify cli TC-cli-19: a config with a UTF-8 BOM is recorded; it prints one JSON object', () => {
  const d = configRepo('cfg-bom', '﻿' + JSON.stringify({ branchFormat: 'feature/{name}' }))
  const t = run('TC-cli-19', ['parse', '--repo', d, '--branch', 'x'])
  oneObject(t)
  assert.ok(t.status === 0 || t.status === 2, t.text())
})

test('verify cli TC-cli-20: a git-modes.json that cannot be read fails preflight with one JSON error and exit 2, not exit 1', () => {
  const asDir = r.copySkill({ omit: ['git-modes.json'], files: { 'git-modes.json': null } })
  const unreadable = r.copySkill()
  const p = join(unreadable, 'git-modes.json')
  chmodSync(p, 0o000)
  const failures = []
  try {
    for (const [label, skillDir] of [['directory', asDir], ['unreadable', unreadable]]) {
      try {
        expectError(run(`TC-cli-20 ${label}`, ['preflight', '--repo', plainRepo, '--mode', 'pr'], { skillDir }))
      } catch (e) {
        failures.push(`${label}: ${e.message.split('\n').slice(-3).join(' ')}`)
      }
      expectOk(run(`TC-cli-20 ${label}`, ['parse', '--repo', plainRepo, '--branch', 'x'], { skillDir }), 'parse')
    }
  } finally {
    chmodSync(p, 0o644)
  }
  assert.deepEqual(failures, [])
})
