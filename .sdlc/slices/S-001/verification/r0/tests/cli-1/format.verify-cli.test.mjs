import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, writeFileSync, chmodSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = process.env.VERIFY_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const LOG = process.env.VERIFY_LOG

const r = cliRunner({ skillDir: join(REPO, 'skills/sdlc') })

function record(caseId, t) {
  if (LOG) appendFileSync(LOG, `\n===== ${caseId}\n${t.text()}\n`)
  return t
}

function oneObject(t) {
  const lines = t.stdout.split('\n').filter((l) => l.length)
  assert.equal(lines.length, 1, `stdout must hold one line:\n${t.text()}`)
  const obj = JSON.parse(lines[0])
  assert.equal(typeof obj, 'object')
  assert.ok(obj && !Array.isArray(obj), 'stdout is not a JSON object')
  return obj
}

function ok(caseId, args, format) {
  const t = record(caseId, r.run('branches.py', args))
  assert.equal(t.status, 0, t.text())
  const o = oneObject(t)
  assert.equal(o.ok, true, t.text())
  assert.equal(o.format, format, t.text())
  assert.equal(t.stderr, '', t.text())
  assert.ok(t.treeUnchanged, t.text())
  return t
}

function bad(caseId, args) {
  const t = record(caseId, r.run('branches.py', args))
  assert.equal(t.status, 2, t.text())
  const o = oneObject(t)
  assert.equal(o.ok, false, t.text())
  assert.equal(typeof o.error, 'string')
  assert.ok(o.error.length > 0, t.text())
  assert.deepEqual(Object.keys(o).sort(), ['error', 'ok'])
  assert.doesNotMatch(t.stderr, /Traceback/, t.text())
  assert.ok(t.treeUnchanged, t.text())
  return t
}

const commands = (repo, extra = []) => [
  ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1', ...extra],
  ['parse', '--repo', repo, '--branch', 'feature/S-1', ...extra],
  ['list', '--repo', repo, '--kind', 'slice', ...extra],
  ['preflight', '--repo', repo, '--mode', 'pr', ...extra],
]

const repoWith = (config) => r.gitRepo({ files: config === undefined ? {} : { '.sdlc/config.json': config } })

test('verify cli: TC-cli-1 a command without --format prints the config format feature/{name}', () => {
  const repo = repoWith({ gitMode: 'pr', branchFormat: 'feature/{name}' })
  for (const args of commands(repo)) ok('TC-cli-1', args, 'feature/{name}')
})

test('verify cli: TC-cli-2 --format wins over the config format, in both flag spellings', () => {
  const repo = repoWith({ branchFormat: 'feature/{name}' })
  for (const args of commands(repo, ['--format', 'sdlc/{name}'])) ok('TC-cli-2', args, 'sdlc/{name}')
  for (const args of commands(repo, ['--format=sdlc/{name:lower}'])) ok('TC-cli-2', args, 'sdlc/{name:lower}')
  const [cmd, ...rest] = commands(repo)[1]
  ok('TC-cli-2', [cmd, '--format', 'team/{name}', ...rest], 'team/{name}')
})

test('verify cli: TC-cli-3 an invalid config format fails without --format and a valid --format overrides it', () => {
  for (const value of ['feature/x', 'a {name}', '{name}{name}', 'x/{name}}', 'x/{id}', 'x/{name}\t']) {
    const repo = repoWith({ branchFormat: value })
    for (const args of commands(repo)) bad('TC-cli-3', args)
    for (const args of commands(repo, ['--format', 'sdlc/{name}'])) ok('TC-cli-3', args, 'sdlc/{name}')
  }
})

test('verify cli: TC-cli-4 a malformed config fails without --format, and the outcome with --format is recorded', () => {
  for (const text of ['{not json', '{"branchFormat": "feature/{name}",}', '﻿{"branchFormat": "feature/{name}"}']) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': text } })
    for (const args of commands(repo)) {
      const t = record('TC-cli-4', r.run('branches.py', args))
      if (text.startsWith('﻿')) {
        assert.ok(t.status === 0 || t.status === 2, t.text())
        oneObject(t)
      } else {
        bad('TC-cli-4', args)
      }
    }
    for (const args of commands(repo, ['--format', 'sdlc/{name}'])) {
      const t = record('TC-cli-4 with --format', r.run('branches.py', args))
      assert.ok(t.status === 0 || t.status === 2, t.text())
      oneObject(t)
    }
  }
})

test('verify cli: TC-cli-5 an empty, missing or non-string config value falls back to sdlc/{name}', () => {
  const shapes = [undefined, {}, { branchFormat: '' }, { branchFormat: null }, { branchFormat: 7 }, { branchFormat: ['a/{name}'] }, ['feature/{name}'], '"feature/{name}"']
  for (const shape of shapes) {
    const repo = repoWith(shape)
    for (const args of commands(repo)) ok('TC-cli-5', args, 'sdlc/{name}')
  }
  const noSdlc = r.dir('nosdlc')
  ok('TC-cli-5', ['parse', '--repo', noSdlc, '--branch', 'sdlc/S-1'], 'sdlc/{name}')
})

test('verify cli: TC-cli-6 an empty --format is refused, not replaced by the config format', () => {
  const repo = repoWith({ branchFormat: 'feature/{name}' })
  for (const args of commands(repo, ['--format', ''])) bad('TC-cli-6', args)
  for (const args of commands(repo, ['--format='])) bad('TC-cli-6', args)
})

test('verify cli: TC-cli-7 an unreadable config or a directory in its place fails with one JSON error', { skip: process.getuid?.() === 0 && 'root reads every file' }, () => {
  const dirRepo = r.gitRepo({ files: { '.sdlc/config.json': null } })
  for (const args of commands(dirRepo)) bad('TC-cli-7', args)
  const locked = repoWith({ branchFormat: 'feature/{name}' })
  chmodSync(join(locked, '.sdlc/config.json'), 0o000)
  try {
    for (const args of commands(locked)) bad('TC-cli-7', args)
  } finally {
    chmodSync(join(locked, '.sdlc/config.json'), 0o644)
  }
})

test('verify cli: TC-cli-8 branches.py runs under python3 -I from a scratch cwd with an empty PYTHONPATH', () => {
  const repo = repoWith({ branchFormat: 'feature/{name}' })
  for (const args of commands(repo)) {
    const t = record('TC-cli-8', r.run('branches.py', args, { pythonFlags: ['-I'], env: { PYTHONPATH: '' } }))
    assert.equal(t.status, 0, t.text())
    assert.equal(oneObject(t).format, 'feature/{name}')
    assert.equal(t.stderr, '')
  }
  const spaced = r.dir('with space é')
  const repo2 = r.gitRepo({ name: 'repo ü x', files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  const t = record('TC-cli-8', r.run('branches.py', ['parse', '--repo', repo2, '--branch', 'feature/S-1'], { cwd: spaced }))
  assert.equal(t.status, 0, t.text())
  assert.equal(oneObject(t).format, 'feature/{name}')
})

const PROBE = `
import ast, importlib.util, io, json, os, subprocess, sys, builtins, contextlib
path = sys.argv[1]
opened = []
real_open = builtins.open
def spy_open(f, *a, **k):
    opened.append(str(f))
    return real_open(f, *a, **k)
builtins.open = spy_open
calls = []
real_popen = subprocess.Popen.__init__
def spy_popen(self, *a, **k):
    calls.append(repr(a[:1]))
    return real_popen(self, *a, **k)
subprocess.Popen.__init__ = spy_popen
real_system = os.system
os.system = lambda c: calls.append(c) or real_system(c)
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    spec = importlib.util.spec_from_file_location("branches_probe", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
builtins.open = real_open
src = real_open(path, encoding="utf-8").read()
names = set()
for node in ast.parse(src).body:
    if isinstance(node, ast.Import):
        names.update(a.name.split(".")[0] for a in node.names)
    elif isinstance(node, ast.ImportFrom):
        names.add((node.module or "").split(".")[0])
nested = sorted({(n.module if isinstance(n, ast.ImportFrom) else n.names[0].name).split(".")[0] for n in ast.walk(ast.parse(src)) if isinstance(n, (ast.Import, ast.ImportFrom))})
results = {}
for argv in (["parse", "--repo", sys.argv[2], "--branch", "x"], ["name", "--repo", sys.argv[2], "--kind", "slice"], ["name"], [], ["bogus"], ["parse", "--repo", sys.argv[2], "--branch", "x", "--format", "nope"], ["--help"], ["parse", "-h"]):
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            rc = mod.main(argv)
        results[" ".join(argv) or "<empty>"] = {"returned": rc, "stdout_lines": len([l for l in out.getvalue().splitlines() if l])}
    except SystemExit as e:
        results[" ".join(argv) or "<empty>"] = {"systemExit": e.code, "stdout_head": out.getvalue()[:60]}
print(json.dumps({
    "importStdout": buf.getvalue(),
    "openedDuringImport": opened,
    "subprocessDuringImport": calls,
    "failIsException": isinstance(mod.Fail, type) and issubclass(mod.Fail, Exception),
    "callable": {n: callable(getattr(mod, n, None)) for n in ("load_format", "validate_format", "main")},
    "topImports": sorted(names),
    "allImports": nested,
    "nonStdlib": sorted(n for n in nested if n not in sys.stdlib_module_names),
    "main": results,
}))
`

test('verify cli: TC-cli-9 importing branches.py by path has no side effect and exposes the public functions', () => {
  const skill = r.copySkill()
  const probeDir = r.dir('probe')
  writeFileSync(join(probeDir, 'probe.py'), PROBE)
  const repo = repoWith({ branchFormat: 'feature/{name}' })
  const cwd = r.dir('cwd')
  const t = record('TC-cli-9', r.exec('python3', ['-I', join(probeDir, 'probe.py'), join(skill, 'branches.py'), repo], { cwd, env: { PYTHONPATH: '', PYTHONDONTWRITEBYTECODE: undefined }, watch: [cwd, skill, repo] }))
  assert.equal(t.status, 0, t.text())
  const p = JSON.parse(t.stdout)
  assert.equal(p.importStdout, '')
  assert.deepEqual(p.openedDuringImport, [])
  assert.deepEqual(p.subprocessDuringImport, [])
  assert.equal(p.failIsException, true)
  assert.deepEqual(p.callable, { load_format: true, validate_format: true, main: true })
  assert.deepEqual(p.nonStdlib, [])
  const changed = Object.values(t.tree).flatMap((d) => [...d.diff.added, ...d.diff.removed, ...d.diff.changed]).filter((x) => !x.split('/').includes('__pycache__'))
  assert.deepEqual(changed, [], t.text())
  for (const key of ['parse --repo ' + repo + ' --branch x', 'name --repo ' + repo + ' --kind slice']) {
    assert.deepEqual(p.main[key], { returned: 0, stdout_lines: 1 }, JSON.stringify(p.main))
  }
  for (const key of ['name', '<empty>', 'bogus', 'parse --repo ' + repo + ' --branch x --format nope']) {
    assert.deepEqual(p.main[key], { returned: 2, stdout_lines: 1 }, JSON.stringify(p.main))
  }
  if (LOG) appendFileSync(LOG, `\n===== TC-cli-9 main() outcomes\n${JSON.stringify(p.main, null, 1)}\n`)
})

test('verify cli: TC-cli-10 the import works without git-modes.json and without git on PATH', () => {
  const skill = r.copySkill({ omit: ['git-modes.json'] })
  const bin = r.dir('bin')
  const marker = join(bin, 'git-called')
  writeFileSync(join(bin, 'git'), `#!/bin/sh\necho "$@" >> '${marker}'\nexit 1\n`)
  chmodSync(join(bin, 'git'), 0o755)
  const repo = repoWith({ branchFormat: 'feature/{name}' })
  const code = `import importlib.util,sys\nspec=importlib.util.spec_from_file_location("b",sys.argv[1])\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nprint(m.load_format(sys.argv[2]), m.validate_format("sdlc/{name}"))`
  const t = record('TC-cli-10', r.exec('python3', ['-I', '-c', code, join(skill, 'branches.py'), repo], { env: { PATH: `${bin}:/usr/bin:/bin` }, watch: [bin] }))
  assert.equal(t.status, 0, t.text())
  assert.equal(t.stdout.trim(), 'feature/{name} sdlc/{name}')
  assert.ok(t.treeUnchanged, `git was called: ${t.text()}`)
  const parse = record('TC-cli-10', r.run('branches.py', ['parse', '--repo', repo, '--branch', 'x'], { skillDir: skill }))
  assert.equal(parse.status, 0, parse.text())
  const pre = record('TC-cli-10', r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { skillDir: skill }))
  assert.equal(pre.status, 2, pre.text())
  assert.equal(oneObject(pre).ok, false)
})
