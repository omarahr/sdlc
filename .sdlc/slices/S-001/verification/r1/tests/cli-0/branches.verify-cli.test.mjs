import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, symlinkSync, chmodSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const REPO_ROOT = process.env.SDLC_VERIFY_REPO ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const { cliRunner } = await import(join(REPO_ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs'))

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
  assert.ok(obj !== null && typeof obj === 'object' && !Array.isArray(obj))
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
  assert.equal(t.stderr, '')
  assert.ok(t.treeUnchanged, t.text())
  return obj
}

const plainRepo = r.gitRepo({ name: 'plain' })

after(() => {
  mkdirSync(dirname(LOG), { recursive: true })
  writeFileSync(LOG, transcripts.join('\n'))
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

test('verify cli TC-cli-20: a git-modes.json that cannot be read fails preflight with one JSON error and exit 2, not exit 1', () => {
  const asDir = r.copySkill({ omit: ['git-modes.json'] })
  mkdirSync(join(asDir, 'git-modes.json'))
  const unreadable = r.copySkill()
  const p = join(unreadable, 'git-modes.json')
  chmodSync(p, 0o000)
  try {
    for (const [label, skillDir] of [['directory', asDir], ['unreadable', unreadable]]) {
      expectError(run(`TC-cli-20 ${label}`, ['preflight', '--repo', plainRepo, '--mode', 'pr'], { skillDir }))
      expectOk(run(`TC-cli-20 ${label}`, ['parse', '--repo', plainRepo, '--branch', 'x'], { skillDir }), 'parse')
      expectOk(run(`TC-cli-20 ${label}`, ['name', '--repo', plainRepo, '--kind', 'slice'], { skillDir }), 'name')
      expectOk(run(`TC-cli-20 ${label}`, ['list', '--repo', plainRepo, '--kind', 'slice'], { skillDir }), 'list')
    }
  } finally {
    chmodSync(p, 0o644)
  }
})

test('verify cli TC-cli-21: other git-modes.json shapes near the fix fail preflight with one JSON error and exit 2', () => {
  const deep = '{"gitModes": ' + '['.repeat(100000) + ']'.repeat(100000) + '}'
  const shapes = {
    'deep-nesting': (d) => writeFileSync(join(d, 'git-modes.json'), deep),
    'symlink-loop': (d) => { symlinkSync(join(d, 'git-modes.json'), join(d, 'git-modes.json')) },
    'dangling-symlink': (d) => { symlinkSync(join(d, 'nowhere.json'), join(d, 'git-modes.json')) },
    'empty-file': (d) => writeFileSync(join(d, 'git-modes.json'), ''),
    'utf16': (d) => writeFileSync(join(d, 'git-modes.json'), Buffer.from('﻿{"gitModes": ["pr"]}', 'utf16le')),
    'null-top': (d) => writeFileSync(join(d, 'git-modes.json'), 'null'),
    'modes-dict': (d) => writeFileSync(join(d, 'git-modes.json'), '{"gitModes": {"pr": 1}}'),
    'empty-string-mode': (d) => writeFileSync(join(d, 'git-modes.json'), '{"gitModes": ["pr", ""]}'),
  }
  for (const [label, make] of Object.entries(shapes)) {
    const skillDir = r.copySkill({ omit: ['git-modes.json'] })
    make(skillDir)
    expectError(run(`TC-cli-21 ${label}`, ['preflight', '--repo', plainRepo, '--mode', 'pr'], { skillDir }))
    expectError(run(`TC-cli-21 ${label} bad-mode`, ['preflight', '--repo', plainRepo, '--mode', 'bogus'], { skillDir }))
    expectOk(run(`TC-cli-21 ${label}`, ['name', '--repo', plainRepo, '--kind', 'slice'], { skillDir }), 'name')
    expectOk(run(`TC-cli-21 ${label}`, ['list', '--repo', plainRepo, '--kind', 'slice'], { skillDir }), 'list')
  }
})

test('verify cli TC-cli-22: a bad --repo beside a bad --kind, --mode or git-modes.json still gives one JSON error and exit 2', () => {
  const missing = join(r.dir('combo'), 'missing')
  const broken = r.copySkill({ omit: ['git-modes.json'] })
  mkdirSync(join(broken, 'git-modes.json'))
  expectError(run('TC-cli-22', ['name', '--repo', missing, '--kind', 'bogus']))
  expectError(run('TC-cli-22', ['list', '--repo', missing, '--kind', '']))
  expectError(run('TC-cli-22', ['preflight', '--repo', missing, '--mode', 'bogus']))
  expectError(run('TC-cli-22', ['preflight', '--repo', missing, '--mode', 'pr'], { skillDir: broken }))
  expectError(run('TC-cli-22', ['preflight', '--repo', plainRepo, '--mode', 'PR'], { skillDir: broken }))
})

test('verify cli TC-cli-23: a --repo directory that cannot be read, a FIFO and a non-git directory give exit 0 or a JSON error, never a traceback', () => {
  const base = r.dir('repo-perm')
  const locked = join(base, 'locked')
  mkdirSync(locked)
  const nogit = join(base, 'nogit')
  mkdirSync(nogit)
  const fifo = join(base, 'fifo')
  execFileSync('mkfifo', [fifo])
  expectError(run('TC-cli-23 fifo', ['parse', '--repo', fifo, '--branch', 'x']))
  expectError(run('TC-cli-23 fifo', ['preflight', '--repo', fifo, '--mode', 'pr']))
  expectOk(run('TC-cli-23 nogit', ['name', '--repo', nogit, '--kind', 'slice']), 'name')
  expectOk(run('TC-cli-23 nogit', ['preflight', '--repo', nogit, '--mode', 'direct']), 'preflight')
  chmodSync(locked, 0o000)
  try {
    const t = run('TC-cli-23 locked', ['parse', '--repo', locked, '--branch', 'x'])
    oneObject(t)
    assert.ok(t.status === 0 || t.status === 2, t.text())
    expectOk(run('TC-cli-23 locked --format', ['parse', '--repo', locked, '--branch', 'x', '--format', 'sdlc/{name}']), 'parse')
    expectError(run('TC-cli-23 locked bad kind', ['list', '--repo', locked, '--kind', 'SLICE']))
  } finally {
    chmodSync(locked, 0o755)
  }
})
