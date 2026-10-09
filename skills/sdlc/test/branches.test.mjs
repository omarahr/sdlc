import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SKILL_DIR, scratch } from './harness.mjs'

const BRANCHES = join(SKILL_DIR, 'branches.py')
const SCRIPTS = ['next-action.py', 'state-write.py', 'janitor.py']

let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }

const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()

function gitRepo(prefix = 'sdlc-branches-') {
  const repo = scratch(prefix)
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'config', 'user.name', 'Test')
  return repo
}

function withConfig(config) {
  const repo = gitRepo()
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc', 'config.json'), JSON.stringify(config))
  return repo
}

const run = (args, options = {}) => spawnSync('python3', [BRANCHES, ...args], { encoding: 'utf8', ...options })

function oneObject(r) {
  let out
  assert.doesNotThrow(() => { out = JSON.parse(r.stdout) }, `stdout is not one JSON value: ${r.stdout}${r.stderr}`)
  assert.ok(out && typeof out === 'object' && !Array.isArray(out), `stdout is not one JSON object: ${r.stdout}`)
  return out
}

function assertBadInput(args, label) {
  const r = run(args)
  assert.equal(r.status, 2, `${label}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
  assert.doesNotMatch(r.stdout, /usage:/i, `${label}: usage text on stdout`)
  const out = oneObject(r)
  assert.equal(out.ok, false, `${label}: ok is not false`)
  assert.equal(typeof out.error, 'string', `${label}: error is not a string`)
  assert.ok(out.error.length > 0, `${label}: error is empty`)
  return out
}

const probe = (code, args, options = {}) =>
  execFileSync('python3', ['-c', code, ...args], { encoding: 'utf8', ...options }).trim()

const LOAD = `
import importlib.util, sys
spec = importlib.util.spec_from_file_location("probe", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
`

test('branches.py imports from its path and exposes the public functions', opts, () => {
  const out = JSON.parse(probe(`${LOAD}
import inspect, json
print(json.dumps({
  "Fail": inspect.isclass(getattr(mod, "Fail", None)) and issubclass(mod.Fail, Exception),
  "load_format": callable(getattr(mod, "load_format", None)),
  "validate_format": callable(getattr(mod, "validate_format", None)),
  "main": callable(getattr(mod, "main", None)),
  "split": callable(getattr(mod, "split", None)),
  "name": callable(getattr(mod, "name", None)),
  "tail": callable(getattr(mod, "tail", None)),
  "parse": callable(getattr(mod, "parse", None)),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out, { Fail: true, load_format: true, validate_format: true, main: true, split: true, name: true, tail: true, parse: true })
})

test('branches.py imports only standard library modules', opts, () => {
  const out = JSON.parse(probe(`
import ast, json, sys
tree = ast.parse(open(sys.argv[1]).read())
names = set()
for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        names.update(a.name.split(".")[0] for a in node.names)
    elif isinstance(node, ast.ImportFrom):
        if node.level == 0 and node.module:
            names.add(node.module.split(".")[0])
        elif node.level > 0:
            names.add("<relative>")
print(json.dumps({"names": sorted(names), "foreign": sorted(n for n in names if n not in sys.stdlib_module_names)}))
`, [BRANCHES]))
  assert.ok(out.names.length > 0, 'branches.py imports nothing, so the probe saw no module')
  assert.deepEqual(out.foreign, [], `branches.py imports non-stdlib modules: ${out.foreign.join(', ')}`)
})

test('every command runs and prints one JSON object', opts, () => {
  const repo = gitRepo()
  const calls = {
    name: ['--repo', repo, '--kind', 'slice', '--id', 'S-001', '--n', '1', '--area', 'api', '--round', '0', '--profile', 'http-api', '--part', '0', '--format', 'feature/{name}'],
    parse: ['--repo', repo, '--branch', 'sdlc/S-001', '--format', 'sdlc/{name}'],
    list: ['--repo', repo, '--kind', 'slice', '--format', 'sdlc/{name}'],
    preflight: ['--repo', repo, '--mode', 'mr', '--format', 'sdlc/{name}', '--branch', 'main'],
  }
  for (const [command, args] of Object.entries(calls)) {
    const r = run([command, ...args])
    assert.equal(r.status, 0, `${command}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    const out = oneObject(r)
    assert.equal(out.ok, true, `${command}: ok is not true`)
    assert.equal(out.command, command, `${command}: command field is ${out.command}`)
    assert.equal(typeof out.format, 'string', `${command}: format is missing`)
    assert.ok(out.format.length > 0, `${command}: format is empty`)
  }
})

test('a flag that a command does not name is bad input', opts, () => {
  const repo = gitRepo()
  assertBadInput(['parse', '--repo', repo, '--branch', 'sdlc/S-001', '--kind', 'slice'], 'parse --kind')
  assertBadInput(['list', '--repo', repo, '--kind', 'slice', '--branch', 'x'], 'list --branch')
  assertBadInput(['preflight', '--repo', repo, '--mode', 'mr', '--kind', 'slice'], 'preflight --kind')
})

test('bad input exits 2 with one JSON error object', opts, () => {
  const repo = gitRepo()
  const missing = join(scratch('sdlc-branches-gone-'), 'absent')
  const cases = [
    ['no placeholder', ['preflight', '--repo', repo, '--mode', 'pr', '--format', 'feature/x']],
    ['two placeholders', ['preflight', '--repo', repo, '--mode', 'pr', '--format', '{name}-{name}']],
    ['whitespace', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/ {name}']],
    ['extra brace pair', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/{id}/{name}']],
    ['unknown kind', ['name', '--repo', repo, '--kind', 'bogus', '--id', 'S-001']],
    ['non-integer --n', ['name', '--repo', repo, '--kind', 'attempt', '--id', 'S-001', '--n', 'two']],
    ['unknown mode', ['preflight', '--repo', repo, '--mode', 'bogus']],
    ['parse without --branch', ['parse', '--repo', repo]],
    ['missing repo', ['list', '--repo', missing, '--kind', 'slice']],
    ['no command', []],
  ]
  for (const [label, args] of cases) assertBadInput(args, label)
})

test('load_format returns the config value or the default', opts, () => {
  const probeFormat = repo => probe(`${LOAD}
print(mod.load_format(sys.argv[2]))
`, [BRANCHES, repo])
  assert.equal(probeFormat(withConfig({ gitMode: 'pr', branchFormat: 'feature/{name}' })), 'feature/{name}')
  assert.equal(probeFormat(withConfig({ gitMode: 'pr' })), 'sdlc/{name}')
  assert.equal(probeFormat(withConfig({ gitMode: 'pr', branchFormat: '' })), 'sdlc/{name}')
  assert.equal(probeFormat(gitRepo()), 'sdlc/{name}')
})

test('a command without --format uses the config format', opts, () => {
  const configured = withConfig({ gitMode: 'pr', branchFormat: 'feature/{name}' })
  const bare = gitRepo()
  const formatOf = args => {
    const r = run(args)
    assert.equal(r.status, 0, `exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    return oneObject(r).format
  }
  assert.equal(formatOf(['parse', '--repo', configured, '--branch', 'feature/S-001']), 'feature/{name}')
  assert.equal(formatOf(['parse', '--repo', bare, '--branch', 'sdlc/S-001']), 'sdlc/{name}')
  assert.equal(formatOf(['parse', '--repo', configured, '--branch', 'team/S-001', '--format', 'team/{name}']), 'team/{name}')
})

test('the three scripts import branches from their own directory', opts, () => {
  const expected = join(realpathSync(SKILL_DIR), 'branches.py')
  for (const name of SCRIPTS) {
    const cwd = scratch('sdlc-branches-cwd-')
    const got = probe(`${LOAD}
import os
print(os.path.realpath(mod.branches.__file__))
`, [join(SKILL_DIR, name)], { cwd })
    assert.equal(got, expected, `${name} imported branches from ${got}`)
  }
})

test('a script run through a symlink imports branches from its real directory', opts, () => {
  const expected = join(realpathSync(SKILL_DIR), 'branches.py')
  for (const name of SCRIPTS) {
    const linkDir = scratch('sdlc-branches-link-')
    writeFileSync(join(linkDir, 'branches.py'), 'import sys\nsys.exit(97)\n')
    const link = join(linkDir, name)
    symlinkSync(join(SKILL_DIR, name), link)
    const got = probe(`${LOAD}
import os
print(os.path.realpath(mod.branches.__file__))
`, [link], { cwd: scratch('sdlc-branches-cwd-') })
    assert.equal(got, expected, `${name} through a symlink imported branches from ${got}`)
  }
})

test('a git-modes.json that cannot be read fails preflight with one JSON error', opts, () => {
  const repo = gitRepo()
  const skillCopy = () => {
    const dir = scratch('sdlc-branches-skill-')
    copyFileSync(BRANCHES, join(dir, 'branches.py'))
    return dir
  }
  const asDir = skillCopy()
  mkdirSync(join(asDir, 'git-modes.json'))
  const cases = [['directory', asDir]]
  const unreadable = skillCopy()
  const modesFile = join(unreadable, 'git-modes.json')
  writeFileSync(modesFile, JSON.stringify({ gitModes: ['pr'] }))
  chmodSync(modesFile, 0o000)
  if (process.getuid?.() !== 0) cases.push(['unreadable', unreadable])
  try {
    for (const [label, dir] of cases) {
      const r = spawnSync('python3', [join(dir, 'branches.py'), 'preflight', '--repo', repo, '--mode', 'pr'], { encoding: 'utf8' })
      assert.equal(r.status, 2, `${label}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
      const out = oneObject(r)
      assert.equal(out.ok, false, `${label}: ok is not false`)
      assert.equal(typeof out.error, 'string', `${label}: error is not a string`)
    }
  } finally {
    chmodSync(modesFile, 0o644)
  }
})

test('a missing or malformed git-modes.json fails preflight with one JSON error, and name, parse and list still run', opts, () => {
  const repo = gitRepo()
  const shapes = {
    absent: null,
    'invalid JSON': '{not json',
    'empty gitModes': JSON.stringify({ gitModes: [] }),
    'missing key': JSON.stringify({ modes: ['pr'] }),
    'top-level list': JSON.stringify(['pr']),
    'gitModes not a list': JSON.stringify({ gitModes: 'pr' }),
    'non-string mode': JSON.stringify({ gitModes: [1, 'pr'] }),
    'invalid UTF-8': Buffer.from([0x7b, 0xff, 0xfe, 0x7d]),
  }
  for (const [label, content] of Object.entries(shapes)) {
    const dir = scratch('sdlc-branches-skill-')
    const script = join(dir, 'branches.py')
    copyFileSync(BRANCHES, script)
    if (content !== null) writeFileSync(join(dir, 'git-modes.json'), content)
    const runCopy = (args) => spawnSync('python3', [script, ...args], { encoding: 'utf8' })
    const failed = runCopy(['preflight', '--repo', repo, '--mode', 'pr'])
    assert.equal(failed.status, 2, `${label}: preflight exit ${failed.status}, stdout ${failed.stdout}, stderr ${failed.stderr}`)
    assert.doesNotMatch(failed.stderr, /Traceback/, `${label}: preflight traceback`)
    const error = oneObject(failed)
    assert.deepEqual(Object.keys(error).sort(), ['error', 'ok'], `${label}: preflight keys`)
    assert.equal(error.ok, false, `${label}: preflight ok is not false`)
    assert.ok(typeof error.error === 'string' && error.error.length > 0, `${label}: preflight error is empty`)
    for (const [command, args] of [
      ['name', ['--kind', 'slice', '--id', 'S-001']],
      ['parse', ['--branch', 'x']],
      ['list', ['--kind', 'slice']],
    ]) {
      const r = runCopy([command, '--repo', repo, ...args])
      assert.equal(r.status, 0, `${label}: ${command} exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
      const out = oneObject(r)
      assert.equal(out.ok, true, `${label}: ${command} ok is not true`)
      assert.equal(out.command, command, `${label}: ${command} names another command`)
      assert.equal(r.stderr, '', `${label}: ${command} wrote to stderr`)
    }
  }
})

test('a deeply nested config.json is bad input, not a crash', opts, () => {
  const repo = gitRepo()
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc', 'config.json'), '['.repeat(200000))
  assertBadInput(['parse', '--repo', repo, '--branch', 'x'], 'parse')
  assertBadInput(['name', '--repo', repo, '--kind', 'slice'], 'name')
  const raised = probe(`${LOAD}
try:
    mod.load_format(sys.argv[2])
    print("returned")
except mod.Fail:
    print("Fail")
`, [BRANCHES, repo])
  assert.equal(raised, 'Fail')
})

test('the three scripts run with the working directory outside the skill directory', opts, () => {
  for (const name of SCRIPTS) {
    const r = spawnSync('python3', [join(SKILL_DIR, name), '--help'], { encoding: 'utf8', cwd: scratch('sdlc-branches-cwd-') })
    assert.equal(r.status, 0, `${name} --help: exit ${r.status}, stderr ${r.stderr}`)
  }
})

const sliceRow = (id, status = 'todo', extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function ledgerRepo(slices, config = {}) {
  const repo = gitRepo('sdlc-branches-ledger-')
  const spec = '# Spec\n'
  writeFileSync(join(repo, 'spec.md'), spec)
  mkdirSync(join(repo, '.sdlc'))
  const files = {
    'config.json': { specPath: 'spec.md', specHash: createHash('sha256').update(spec).digest('hex'), overridesSeen: 0, gitMode: 'direct', defaultBranch: 'main', commitFormat: '', ...config },
    'requirements.json': [],
    'slices.json': slices,
    'milestones.json': [],
  }
  for (const [name, value] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', name), JSON.stringify(value, null, 2))
  writeFileSync(join(repo, '.sdlc', 'DECISIONS.md'), '# Decisions\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'bootstrap')
  return repo
}

const runScript = (name, args) => {
  const r = spawnSync('python3', [join(SKILL_DIR, name), ...args], { encoding: 'utf8', cwd: scratch('sdlc-branches-cwd-') })
  assert.equal(r.status, 0, `${name}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
  return JSON.parse(r.stdout)
}

test('branch recognition in the three scripts still resolves from a scratch working directory', opts, () => {
  const active = ledgerRepo([sliceRow('S-1')])
  git(active, 'checkout', '-q', '-b', 'sdlc/S-1')
  writeFileSync(join(active, '.sdlc', 'slices.json'), JSON.stringify([sliceRow('S-1', 'in_progress', { phase: 'implement' })], null, 2))
  git(active, 'commit', '-q', '-am', 'state S-1')
  git(active, 'checkout', '-q', 'main')
  const decision = runScript('next-action.py', ['--repo', active, '--bar-raiser-rounds', '0'])
  assert.equal(decision.next.action, 'slice', `next-action decided ${JSON.stringify(decision.next)}`)
  assert.equal(decision.checkout, 'sdlc/S-1')

  const awaiting = ledgerRepo([sliceRow('S-1', 'awaiting-merge', { pr: 'u' }), sliceRow('S-2', 'todo', { dependsOn: ['S-1'] })])
  git(awaiting, 'branch', 'sdlc/S-1')
  const base = runScript('state-write.py', ['base-branch', '--repo', awaiting, '--slice', 'S-2'])
  assert.equal(base.ok, true, base.error)
  assert.equal(base.branch, 'sdlc/S-1')

  const swept = ledgerRepo([sliceRow('S-1', 'done')])
  git(swept, 'branch', 'sdlc/S-1-v1')
  git(swept, 'branch', 'sdlc/S-1')
  const reaped = runScript('janitor.py', ['--repo', swept, '--days', '36500'])
  assert.deepEqual(reaped.removedBranches, ['sdlc/S-1-v1'])
  assert.equal(git(swept, 'branch', '--list', 'sdlc/S-1'), 'sdlc/S-1')
})

const CALL = `${LOAD}
import json
def call(fn, *args, **kw):
    try:
        return {"ret": fn(*args, **kw)}
    except mod.Fail as e:
        return {"fail": str(e)}
    except Exception as e:
        return {"error": type(e).__name__ + ": " + str(e)}
`

const callEach = (fn, inputs) => JSON.parse(probe(`${CALL}
print(json.dumps([call(getattr(mod, "${fn}", None) or (lambda *a: (_ for _ in ()).throw(AttributeError("${fn} is missing"))), x) for x in json.loads(sys.argv[2])]))
`, [BRANCHES, JSON.stringify(inputs)], { cwd: scratch('sdlc-branches-cwd-') }))

function assertFails(fn, inputs) {
  const results = callEach(fn, inputs)
  inputs.forEach((input, i) => {
    assert.equal(typeof results[i].fail, 'string', `${fn}(${JSON.stringify(input)}) did not raise Fail: ${JSON.stringify(results[i])}`)
  })
  return results
}

test('validate_format accepts one placeholder with a valid literal part', opts, () => {
  const formats = ['sdlc/{name}', 'sdlc/{name:lower}', 'feature/PROJ-1-{name}']
  const results = callEach('validate_format', formats)
  formats.forEach((fmt, i) => assert.deepEqual(results[i], { ret: fmt }, `validate_format(${fmt})`))
})

test('validate_format rejects two placeholders, none, whitespace and an invalid ref', opts, () => {
  const formats = ['{name}{name}', 'sdlc/', 'sdlc/{ name }', 'sdlc/{name}..', 'sdlc/{name}}', 'sdlc/{{name}']
  const results = assertFails('validate_format', formats)
  const dotted = results[formats.indexOf('sdlc/{name}..')].fail
  assert.match(dotted, /check-ref-format/, `the invalid-ref message does not name check-ref-format: ${dotted}`)
  assert.match(dotted, /is not a valid branch name/, `the invalid-ref message does not carry the git reason: ${dotted}`)
})

test('validate_format rejects Unicode whitespace that git accepts', opts, () => {
  const formats = ['sdlc/\u00a0{name}', 'sdlc/\u3000{name}', 'sdlc/\u2028{name}', 'sdlc/\t{name}']
  const results = assertFails('validate_format', formats)
  formats.forEach((fmt, i) => assert.match(results[i].fail, /holds whitespace/, `validate_format(${JSON.stringify(fmt)}): ${results[i].fail}`))
})

test('validate_format rejects the literal parts that git refuses', opts, () => {
  assertFails('validate_format', ['-{name}', 'a\x01/{name}', 'sdlc/{name}.lock', '/{name}', 'a~/{name}', 'sdlc/{name}\x00'])
})

test('an invalid-ref format is bad input on the CLI', opts, () => {
  const repo = gitRepo()
  for (const [label, args] of [
    ['name', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/{name}..']],
    ['preflight', ['preflight', '--repo', repo, '--mode', 'pr', '--format', 'sdlc/{name}..']],
  ]) {
    const out = assertBadInput(args, label)
    assert.match(out.error, /is not a valid branch name/, `${label}: error is ${out.error}`)
  }
})

test('split returns the prefix, the suffix and the lower flag', opts, () => {
  const results = callEach('split', ['a/{name}.x', 'a/{name:lower}', '{name}', 'sdlc/'])
  assert.deepEqual(results[0], { ret: ['a/', '.x', false] })
  assert.deepEqual(results[1], { ret: ['a/', '', true] })
  assert.deepEqual(results[2], { ret: ['', '', false] })
  assert.equal(typeof results[3].fail, 'string', `split("sdlc/") did not raise Fail: ${JSON.stringify(results[3])}`)
})

test('name puts the tail in the placeholder and lowercases only the tail', opts, () => {
  const out = JSON.parse(probe(`${CALL}
def strip(fmt):
    n = mod.name(fmt, "slice", id="S-001")
    prefix, suffix, lower = mod.split(fmt)
    if not n.startswith(prefix) or not n.endswith(suffix):
        return {"name": n, "middle": None}
    return {"name": n, "middle": n[len(prefix):len(n) - len(suffix)]}
formats = ["sdlc/{name}", "feature/PROJ-1-{name}", "feature/PROJ-1-{name:lower}"]
print(json.dumps({
    "named": [call(mod.name, f, "slice", id="S-001") for f in formats],
    "stripped": [call(strip, f) for f in formats],
    "no_id": call(mod.name, "sdlc/{name}", "slice"),
    "empty_id": call(mod.name, "sdlc/{name}", "slice", id=""),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out.named, [{ ret: 'sdlc/S-001' }, { ret: 'feature/PROJ-1-S-001' }, { ret: 'feature/PROJ-1-s-001' }])
  assert.deepEqual(out.stripped, [
    { ret: { name: 'sdlc/S-001', middle: 'S-001' } },
    { ret: { name: 'feature/PROJ-1-S-001', middle: 'S-001' } },
    { ret: { name: 'feature/PROJ-1-s-001', middle: 's-001' } },
  ])
  assert.equal(typeof out.no_id.fail, 'string', `name without id did not raise Fail: ${JSON.stringify(out.no_id)}`)
  assert.equal(typeof out.empty_id.fail, 'string', `name with an empty id did not raise Fail: ${JSON.stringify(out.empty_id)}`)
})

test('validate_format without git is a Fail, not a crash', opts, () => {
  const empty = scratch('sdlc-branches-nopath-')
  const out = JSON.parse(probe(`${CALL}
import os
os.environ["PATH"] = sys.argv[2]
print(json.dumps(call(mod.validate_format, "sdlc/{name}")))
`, [BRANCHES, empty], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.equal(typeof out.fail, 'string', `validate_format without git did not raise Fail: ${JSON.stringify(out)}`)
  assert.match(out.fail, /git/, `the message does not name git: ${out.fail}`)
})

test('tail builds the slice, state and e2e-area tails and fails on a missing part', opts, () => {
  const out = JSON.parse(probe(`${CALL}
print(json.dumps({
    "slice": call(mod.tail, "slice", id="S-001"),
    "state": call(mod.tail, "state"),
    "state_ts": call(mod.tail, "state", ts="20261008101500"),
    "area": call(mod.tail, "e2e-area", id="M-1", area="api"),
    "no_area": call(mod.tail, "e2e-area", id="M-1"),
    "empty_area": call(mod.tail, "e2e-area", id="M-1", area=""),
    "no_id": call(mod.tail, "e2e-area", area="api"),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out.slice, { ret: 'S-001' })
  assert.equal(typeof out.state.ret, 'string', `tail("state") did not return a string: ${JSON.stringify(out.state)}`)
  assert.match(out.state.ret, /^state-\d{14}$/)
  assert.deepEqual(out.state_ts, { ret: 'state-20261008101500' })
  assert.deepEqual(out.area, { ret: 'M-1-e2e-api' })
  for (const key of ['no_area', 'empty_area']) {
    assert.equal(typeof out[key].fail, 'string', `${key} did not raise Fail: ${JSON.stringify(out[key])}`)
    assert.match(out[key].fail, /\barea\b/, `${key}: the message does not name area: ${out[key].fail}`)
  }
  assert.equal(typeof out.no_id.fail, 'string', `no_id did not raise Fail: ${JSON.stringify(out.no_id)}`)
  assert.match(out.no_id.fail, /\bid\b/, `no_id: the message does not name id: ${out.no_id.fail}`)
})

test('an explicit state ts is used as given under a prefixed format, and an empty ts generates one', opts, () => {
  const out = JSON.parse(probe(`${CALL}
print(json.dumps({
    "named": call(mod.name, "feature/PROJ-1-{name}", "state", ts="20261008101500"),
    "empty": call(mod.tail, "state", ts=""),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out.named, { ret: 'feature/PROJ-1-state-20261008101500' })
  assert.equal(typeof out.empty.ret, 'string', `tail("state", ts="") did not return a string: ${JSON.stringify(out.empty)}`)
  assert.match(out.empty.ret, /^state-\d{14}$/)
})

test('the state tail is the current UTC time', opts, () => {
  const utc = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const before = utc()
  const out = JSON.parse(probe(`${CALL}
print(json.dumps(call(mod.tail, "state")))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-'), env: { ...process.env, TZ: 'Pacific/Kiritimati' } }))
  const after = utc()
  assert.equal(typeof out.ret, 'string', `tail("state") did not return a string: ${JSON.stringify(out)}`)
  const m = /^state-(\d{14})$/.exec(out.ret)
  assert.ok(m, `tail("state") is ${out.ret}`)
  assert.ok(m[1] >= before && m[1] <= after, `state timestamp ${m[1]} is not between ${before} and ${after} UTC`)
})

test('name --kind state prints sdlc/state- and the current UTC time', opts, () => {
  const repo = gitRepo()
  const utc = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const before = utc()
  const r = run(['name', '--repo', repo, '--kind', 'state'], { env: { ...process.env, TZ: 'Pacific/Kiritimati' } })
  const after = utc()
  assert.equal(r.status, 0, `exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
  const out = oneObject(r)
  assert.equal(typeof out.branch, 'string', `branch is not a string: ${r.stdout}`)
  const m = /^sdlc\/state-(\d{14})$/.exec(out.branch)
  assert.ok(m, `branch is ${out.branch}`)
  assert.ok(m[1] >= before && m[1] <= after, `state timestamp ${m[1]} is not between ${before} and ${after} UTC`)
})

test('name without a required part exits 2 with one JSON error and no traceback', opts, () => {
  const repo = gitRepo()
  for (const [label, args, part] of [
    ['e2e-area without --area', ['name', '--repo', repo, '--kind', 'e2e-area', '--id', 'M-1'], /\barea\b/],
    ['slice without --id', ['name', '--repo', repo, '--kind', 'slice'], /\bid\b/],
    ['verify without --profile', ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--part', '0'], /\bprofile\b/],
    ['attempt without --n', ['name', '--repo', repo, '--kind', 'attempt', '--id', 'S-001'], /\bn\b/],
  ]) {
    const r = run(args)
    assert.equal(r.status, 2, `${label}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    assert.doesNotMatch(r.stderr, /Traceback/, `${label}: traceback on stderr`)
    const out = oneObject(r)
    assert.equal(out.ok, false, `${label}: ok is not false`)
    assert.ok(typeof out.error === 'string' && out.error.length > 0, `${label}: error is empty`)
    assert.match(out.error, part, `${label}: error does not name the part: ${out.error}`)
  }
})

test('name takes the format from the flag, then the config, then the default', opts, () => {
  const configured = withConfig({ gitMode: 'pr', branchFormat: 'feature/PROJ-1-{name}' })
  const bare = gitRepo()
  const named = args => {
    const r = run(['name', ...args])
    assert.equal(r.status, 0, `exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    const out = oneObject(r)
    assert.deepEqual(Object.keys(out).sort(), ['branch', 'command', 'format', 'kind', 'ok'], `keys of ${r.stdout}`)
    assert.equal(out.ok, true)
    assert.equal(out.command, 'name')
    return out
  }
  const cases = [
    [['--repo', configured, '--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/{name}'], 'sdlc/{name}', 'sdlc/S-001'],
    [['--repo', configured, '--kind', 'slice', '--id', 'S-001'], 'feature/PROJ-1-{name}', 'feature/PROJ-1-S-001'],
    [['--repo', bare, '--kind', 'slice', '--id', 'S-001'], 'sdlc/{name}', 'sdlc/S-001'],
  ]
  for (const [args, format, branch] of cases) {
    const out = named(args)
    assert.equal(out.kind, 'slice')
    assert.equal(out.format, format)
    assert.equal(out.branch, branch)
  }
  const area = named(['--repo', bare, '--kind', 'e2e-area', '--id', 'M-1', '--area', 'api'])
  assert.equal(area.kind, 'e2e-area')
  assert.equal(area.format, 'sdlc/{name}')
  assert.equal(area.branch, 'sdlc/M-1-e2e-api')
  const state = named(['--repo', bare, '--kind', 'state'])
  assert.equal(state.kind, 'state')
  assert.equal(state.format, 'sdlc/{name}')
  assert.match(state.branch, /^sdlc\/state-\d{14}$/)
})

test('preflight reports the resolved format and whether it was given', opts, () => {
  const cases = [
    ['flag over config', withConfig({ gitMode: 'pr', branchFormat: 'feature/{name}' }), ['--format', 'team/{name}'], 'team/{name}', true],
    ['config value', withConfig({ gitMode: 'pr', branchFormat: 'feature/{name}' }), [], 'feature/{name}', true],
    ['config equal to the default', withConfig({ gitMode: 'pr', branchFormat: 'sdlc/{name}' }), [], 'sdlc/{name}', true],
    ['empty config value', withConfig({ gitMode: 'pr', branchFormat: '' }), [], 'sdlc/{name}', false],
    ['no config key', withConfig({ gitMode: 'pr' }), [], 'sdlc/{name}', false],
    ['no config file', gitRepo(), [], 'sdlc/{name}', false],
  ]
  for (const [label, repo, extra, format, given] of cases) {
    const r = run(['preflight', '--repo', repo, '--mode', 'pr', ...extra])
    assert.equal(r.status, 0, `${label}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    const out = oneObject(r)
    assert.equal(out.ok, true, `${label}: ok is not true`)
    assert.equal(out.format, format, `${label}: format`)
    assert.equal(out.given, given, `${label}: given is ${out.given}`)
  }
})

function brokenConfigRepos() {
  const repos = {}
  const add = (label, write) => {
    const repo = gitRepo()
    mkdirSync(join(repo, '.sdlc'))
    write(join(repo, '.sdlc', 'config.json'))
    repos[label] = repo
  }
  add('invalid JSON', path => writeFileSync(path, '{"branchFormat": "feature/{name}"'))
  add('deep nesting', path => writeFileSync(path, '['.repeat(200000) + ']'.repeat(200000)))
  add('invalid UTF-8', path => writeFileSync(path, Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x3a, 0x31, 0x7d])))
  add('directory', path => { mkdirSync(path); writeFileSync(join(path, 'keep'), '') })
  if (process.getuid?.() !== 0) {
    add('unreadable', path => { writeFileSync(path, JSON.stringify({ branchFormat: 'feature/{name}' })); chmodSync(path, 0o000) })
  }
  return repos
}

test('the --format flag wins over a broken config in name and preflight', opts, () => {
  for (const [label, repo] of Object.entries(brokenConfigRepos())) {
    const named = run(['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', 'team/{name}'])
    assert.equal(named.status, 0, `${label}: name exit ${named.status}, stdout ${named.stdout}, stderr ${named.stderr}`)
    const out = oneObject(named)
    assert.equal(out.ok, true, `${label}: name ok`)
    assert.equal(out.format, 'team/{name}', `${label}: name format`)
    assert.equal(out.branch, 'team/S-001', `${label}: name branch`)
    const checked = run(['preflight', '--repo', repo, '--mode', 'pr', '--format', 'team/{name}'])
    assert.equal(checked.status, 0, `${label}: preflight exit ${checked.status}, stdout ${checked.stdout}, stderr ${checked.stderr}`)
    const pre = oneObject(checked)
    assert.equal(pre.ok, true, `${label}: preflight ok`)
    assert.equal(pre.format, 'team/{name}', `${label}: preflight format`)
    assert.equal(pre.given, true, `${label}: preflight given is ${pre.given}`)
    assertBadInput(['preflight', '--repo', repo, '--mode', 'pr'], `${label}: preflight without --format`)
  }
})

test('name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds', opts, () => {
  const repo = gitRepo()
  const cases = [
    ['R-003', 'run', ['--n', '1'], 'sdlc/run-1'],
    ['R-004', 'slice', ['--id', 'S-001'], 'sdlc/S-001'],
    ['R-005', 'milestone', ['--id', 'M-1'], 'sdlc/M-1'],
    ['R-006', 'e2e', ['--id', 'M-1'], 'sdlc/M-1-e2e'],
    ['R-007', 'e2e-area', ['--id', 'M-1', '--area', 'api'], 'sdlc/M-1-e2e-api'],
    ['R-009', 'verify', ['--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'], 'sdlc/S-001-v0-http-api-0'],
    ['R-009', 'verify', ['--id', 'S-001', '--round', '2', '--profile', 'http-api', '--part', '3'], 'sdlc/S-001-v2-http-api-3'],
    ['R-010', 'attempt', ['--id', 'S-001', '--n', '1'], 'sdlc/S-001-attempt-1'],
    ['R-010', 'attempt', ['--id', 'S-fix-M-1-2', '--n', '3'], 'sdlc/S-fix-M-1-2-attempt-3'],
  ]
  for (const [label, kind, extra, branch] of cases) {
    const r = run(['name', '--repo', repo, '--kind', kind, ...extra])
    assert.equal(r.status, 0, `${label} ${kind}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    const out = oneObject(r)
    assert.deepEqual(Object.keys(out).sort(), ['branch', 'command', 'format', 'kind', 'ok'], `${label} ${kind}: keys of ${r.stdout}`)
    assert.equal(out.ok, true, `${label} ${kind}: ok`)
    assert.equal(out.command, 'name', `${label} ${kind}: command`)
    assert.equal(out.format, 'sdlc/{name}', `${label} ${kind}: format`)
    assert.equal(out.kind, kind, `${label} ${kind}: kind`)
    assert.equal(out.branch, branch, `${label} ${kind}: branch`)
  }
})

test('tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part', opts, () => {
  const out = JSON.parse(probe(`${CALL}
print(json.dumps({
    "run_1": call(mod.tail, "run", n=1),
    "run_12": call(mod.tail, "run", n=12),
    "run_0": call(mod.tail, "run", n=0),
    "milestone": call(mod.tail, "milestone", id="M-1"),
    "e2e": call(mod.tail, "e2e", id="M-1"),
    "run_no_n": call(mod.tail, "run"),
    "milestone_no_id": call(mod.tail, "milestone"),
    "milestone_empty_id": call(mod.tail, "milestone", id=""),
    "e2e_no_id": call(mod.tail, "e2e"),
    "verify": call(mod.tail, "verify", id="S-001", round=0, profile="http-api", part=0),
    "verify_no_id": call(mod.tail, "verify", round=0, profile="http-api", part=0),
    "verify_no_round": call(mod.tail, "verify", id="S-001", profile="http-api", part=0),
    "verify_no_profile": call(mod.tail, "verify", id="S-001", round=0, part=0),
    "verify_empty_profile": call(mod.tail, "verify", id="S-001", round=0, profile="", part=0),
    "verify_no_part": call(mod.tail, "verify", id="S-001", round=0, profile="http-api"),
    "attempt": call(mod.tail, "attempt", id="S-001", n=1),
    "attempt_no_id": call(mod.tail, "attempt", n=1),
    "attempt_no_n": call(mod.tail, "attempt", id="S-001"),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out.run_1, { ret: 'run-1' })
  assert.deepEqual(out.run_12, { ret: 'run-12' })
  assert.deepEqual(out.run_0, { ret: 'run-0' })
  assert.deepEqual(out.milestone, { ret: 'M-1' })
  assert.deepEqual(out.e2e, { ret: 'M-1-e2e' })
  assert.deepEqual(out.verify, { ret: 'S-001-v0-http-api-0' })
  assert.deepEqual(out.attempt, { ret: 'S-001-attempt-1' })
  for (const [key, part] of [
    ['run_no_n', /\bn\b/], ['milestone_no_id', /\bid\b/], ['milestone_empty_id', /\bid\b/], ['e2e_no_id', /\bid\b/],
    ['verify_no_id', /\bid\b/], ['verify_no_round', /\bround\b/], ['verify_no_profile', /\bprofile\b/],
    ['verify_empty_profile', /\bprofile\b/], ['verify_no_part', /\bpart\b/],
    ['attempt_no_id', /\bid\b/], ['attempt_no_n', /\bn\b/],
  ]) {
    assert.equal(typeof out[key].fail, 'string', `${key} did not raise Fail: ${JSON.stringify(out[key])}`)
    assert.match(out[key].fail, part, `${key}: the message does not name the part: ${out[key].fail}`)
  }
})

test('name for the run, milestone, e2e, verify and attempt kinds follows a prefixed and a lowercased format and fails without its part', opts, () => {
  const out = JSON.parse(probe(`${CALL}
print(json.dumps({
    "milestone": call(mod.name, "feature/PROJ-1-{name}", "milestone", id="M-1"),
    "e2e_lower": call(mod.name, "feature/PROJ-1-{name:lower}", "e2e", id="M-1"),
    "run_lower": call(mod.name, "feature/PROJ-1-{name:lower}", "run", n=1),
    "verify_lower": call(mod.name, "feature/PROJ-1-{name:lower}", "verify", id="S-001", round=0, profile="http-api", part=0),
    "attempt_lower": call(mod.name, "feature/PROJ-1-{name:lower}", "attempt", id="S-001", n=1),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out.milestone, { ret: 'feature/PROJ-1-M-1' })
  assert.deepEqual(out.e2e_lower, { ret: 'feature/PROJ-1-m-1-e2e' })
  assert.deepEqual(out.run_lower, { ret: 'feature/PROJ-1-run-1' })
  assert.deepEqual(out.verify_lower, { ret: 'feature/PROJ-1-s-001-v0-http-api-0' })
  assert.deepEqual(out.attempt_lower, { ret: 'feature/PROJ-1-s-001-attempt-1' })
  const repo = gitRepo()
  for (const [label, args, part] of [
    ['run without --n', ['name', '--repo', repo, '--kind', 'run'], /\bn\b/],
    ['milestone without --id', ['name', '--repo', repo, '--kind', 'milestone'], /\bid\b/],
    ['e2e without --id', ['name', '--repo', repo, '--kind', 'e2e'], /\bid\b/],
  ]) {
    const r = run(args)
    assert.equal(r.status, 2, `${label}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
    assert.doesNotMatch(r.stderr, /Traceback/, `${label}: traceback on stderr`)
    const out = oneObject(r)
    assert.equal(out.ok, false, `${label}: ok is not false`)
    assert.ok(typeof out.error === 'string' && out.error.length > 0, `${label}: error is empty`)
    assert.match(out.error, part, `${label}: error does not name the part: ${out.error}`)
  }
})

const KIND_CASES = [
  ['run', { n: 1 }],
  ['slice', { id: 'S-001' }],
  ['milestone', { id: 'M-1' }],
  ['e2e', { id: 'M-1' }],
  ['e2e-area', { id: 'M-1', area: 'api-v2' }],
  ['state', { ts: '20261008101500' }],
  ['verify', { id: 'S-001', round: 0, profile: 'http-api', part: 0 }],
  ['attempt', { id: 'S-001', n: 1 }],
]
const ROUND_TRIP_FORMATS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}']

const cliArgs = (repo, fmt, kind, parts) => {
  const flags = { id: '--id', n: '--n', area: '--area', round: '--round', profile: '--profile', part: '--part' }
  const args = ['name', '--repo', repo, '--kind', kind, '--format', fmt]
  for (const [key, value] of Object.entries(parts)) if (flags[key]) args.push(flags[key], String(value))
  return args
}

test('T-R-011a name lowercases only the tail under {name:lower}', opts, () => {
  const out = JSON.parse(probe(`${LOAD}
import json
print(json.dumps({
    "prefixed": mod.name("feature/PROJ-1-{name:lower}", "slice", id="S-001"),
    "wrapped": mod.name("Feat/PROJ-{name:lower}-X", "slice", id="S-001"),
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.equal(out.prefixed, 'feature/PROJ-1-s-001')
  assert.equal(out.wrapped, 'Feat/PROJ-s-001-X')
  const r = run(['name', '--repo', gitRepo(), '--kind', 'slice', '--id', 'S-001', '--format', 'feature/PROJ-1-{name:lower}'])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(oneObject(r).branch, 'feature/PROJ-1-s-001')
})

test('T-R-068a name and split round-trip every kind under the default, a prefixed and a lowercased format', opts, () => {
  const cases = []
  for (const fmt of ROUND_TRIP_FORMATS) for (const [kind, parts] of KIND_CASES) cases.push({ fmt, kind, parts })
  assert.equal(cases.length, 24)
  const out = JSON.parse(probe(`${LOAD}
import json
cases = json.loads(sys.argv[2])
rows = []
for c in cases:
    branch = mod.name(c["fmt"], c["kind"], **c["parts"])
    prefix, suffix, lower = mod.split(c["fmt"])
    ids = [c["parts"]["id"]] if "id" in c["parts"] else None
    parsed = mod.parse(c["fmt"], branch, ids=ids if lower else None)
    rows.append({"branch": branch, "prefix": prefix, "suffix": suffix, "lower": lower, "tail": mod.tail(c["kind"], **c["parts"]), "parsed": parsed})
print(json.dumps(rows))
`, [BRANCHES, JSON.stringify(cases)], { cwd: scratch('sdlc-branches-cwd-') }))
  const repo = gitRepo()
  out.forEach((row, i) => {
    const label = `${cases[i].fmt} ${cases[i].kind}`
    assert.ok(row.parsed, `${label}: parse returned null`)
    assert.equal(row.parsed.kind, cases[i].kind, `${label}: parsed kind`)
    for (const [key, value] of Object.entries(cases[i].parts)) {
      assert.equal(row.parsed[key], value, `${label}: parsed ${key}`)
    }
    assert.ok(row.branch.startsWith(row.prefix), `${label}: prefix`)
    assert.ok(row.branch.endsWith(row.suffix), `${label}: suffix`)
    const middle = row.branch.slice(row.prefix.length, row.branch.length - row.suffix.length)
    assert.equal(middle, row.lower ? row.tail.toLowerCase() : row.tail, `${label}: middle`)
    assert.equal(row.lower, cases[i].fmt.includes(':lower'), `${label}: lower flag`)
    git(repo, 'check-ref-format', '--branch', row.branch)
  })
})

test('T-R-068b the CLI name matches the Python name for all 24 cases', opts, () => {
  const repo = gitRepo()
  const cases = []
  for (const fmt of ROUND_TRIP_FORMATS) for (const [kind, parts] of KIND_CASES) cases.push({ fmt, kind, parts })
  const expected = JSON.parse(probe(`${LOAD}
import json
cases = json.loads(sys.argv[2])
print(json.dumps([mod.name(c["fmt"], c["kind"], **c["parts"]) for c in cases]))
`, [BRANCHES, JSON.stringify(cases)], { cwd: scratch('sdlc-branches-cwd-') }))
  cases.forEach(({ fmt, kind, parts }, i) => {
    const r = run(cliArgs(repo, fmt, kind, parts))
    assert.equal(r.status, 0, `${fmt} ${kind}: ${r.stderr}${r.stdout}`)
    if (kind === 'state') {
      const branch = oneObject(r).branch
      const [prefix, suffix] = fmt.split('{name' + (fmt.includes(':lower') ? ':lower}' : '}'))
      assert.match(branch.slice(prefix.length, branch.length - suffix.length), /^state-\d{14}$/, `${fmt} state`)
      assert.ok(branch.startsWith(prefix) && branch.endsWith(suffix), `${fmt} state affixes`)
      return
    }
    assert.equal(oneObject(r).branch, expected[i], `${fmt} ${kind}`)
  })
})

const PARSE_PROBE = `${LOAD}
import json
cases = json.loads(sys.argv[2])
rows = []
for c in cases:
    ids = c.get("ids")
    if ids is not None and c.get("as") == "iter":
        ids = iter(ids)
    elif ids is not None and c.get("as") == "tuple":
        ids = tuple(ids)
    rows.append(mod.parse(c["fmt"], c["branch"], ids=ids) if ids is not None else mod.parse(c["fmt"], c["branch"]))
print(json.dumps(rows))
`

const pyParse = (cases) =>
  JSON.parse(probe(PARSE_PROBE, [BRANCHES, JSON.stringify(cases)], { cwd: scratch('sdlc-branches-cwd-') }))

const DEFAULT_FMT = 'sdlc/{name}'
const LOWER_FMT = 'feature/PROJ-1-{name:lower}'
const PLAIN_FMT = 'feature/PROJ-1-{name}'

const cliParse = (fmt, branch) => {
  const r = run(['parse', '--repo', gitRepo(), '--format', fmt, '--branch', branch])
  assert.equal(r.status, 0, `${fmt} ${branch}: ${r.stderr}${r.stdout}`)
  return oneObject(r)
}

test('T-R-021a parse returns null for a foreign branch', opts, () => {
  const cases = [
    { fmt: DEFAULT_FMT, branch: 'main' },
    { fmt: PLAIN_FMT, branch: 'feature/PROJ-1-foo' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/feature-x' },
  ]
  assert.deepEqual(pyParse(cases), [null, null, null])
  for (const { fmt, branch } of cases) {
    const out = cliParse(fmt, branch)
    assert.equal(out.kind, null, `${branch}: kind`)
    assert.equal(out.ok, true)
    assert.equal(out.branch, branch)
  }
})

test('T-R-021b a branch that passes the prefix and suffix test but matches no row gives null', opts, () => {
  const cases = [
    { fmt: DEFAULT_FMT, branch: 'sdlc/feature-x' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/run-' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/run-x' },
    { fmt: '{name}-wip', branch: 'S-001' },
    { fmt: '{name}-wip', branch: 'S-001-wip' },
    { fmt: 'a/{name}-wip', branch: 'a/-wip' },
  ]
  const out = pyParse(cases)
  assert.deepEqual(out.slice(0, 5), [null, null, null, null, null])
  assert.equal(out[5].kind, 'slice')
  assert.equal(out[5].id, 'S-001')
  assert.equal(out[5].tail, 'S-001')
  assert.equal(out[6], null)
})

test('T-R-022a classification follows rows 1 to 8', opts, () => {
  const cases = [
    'sdlc/run-3',
    'sdlc/M-1',
    'sdlc/M-1-e2e',
    'sdlc/M-1-e2e-api',
    'sdlc/state-20261008101500',
    'sdlc/S-001-v0-http-api-0',
    'sdlc/S-001-attempt-3',
    'sdlc/S-001',
    'sdlc/S-fix-M-1-2',
    'sdlc/M-1-e2e-a-b',
  ].map((branch) => ({ fmt: DEFAULT_FMT, branch }))
  const out = pyParse(cases)
  assert.deepEqual(out.map((r) => r.kind), [
    'run', 'milestone', 'e2e', 'e2e-area', 'state', 'verify', 'attempt', 'slice', 'slice', 'e2e-area',
  ])
  assert.equal(out[8].id, 'S-fix-M-1-2')
  assert.equal(out[3].id, 'M-1')
  assert.equal(out[3].area, 'api')
  assert.equal(out[5].id, 'S-001')
  assert.equal(out[5].profile, 'http-api')
  assert.equal(out[5].round, 0)
  assert.equal(out[5].part, 0)
  assert.equal(out[9].id, 'M-1')
  assert.equal(out[9].area, 'a-b')
})

test('T-R-022b under {name:lower} the regexes ignore case', opts, () => {
  const tails = ['s-001', 'm-1-e2e-api', 'run-2']
  const lower = pyParse(tails.map((t) => ({ fmt: LOWER_FMT, branch: `feature/PROJ-1-${t}` })))
  assert.deepEqual(lower.map((r) => r && r.kind), ['slice', 'e2e-area', 'run'])
  const plain = pyParse(tails.map((t) => ({ fmt: PLAIN_FMT, branch: `feature/PROJ-1-${t}` })))
  assert.equal(plain[0], null)
  assert.equal(plain[1], null)
  assert.equal(plain[2].kind, 'run')
})

test('T-R-023a the result holds the parts that apply', opts, () => {
  const out = pyParse([
    'sdlc/run-2',
    'sdlc/state-20261008101500',
    'sdlc/S-001-v0-http-api-0',
    'sdlc/M-1-e2e-api',
    'sdlc/S-001-attempt-3',
  ].map((branch) => ({ fmt: DEFAULT_FMT, branch })))
  const keys = out.map((r) => Object.keys(r).sort())
  assert.deepEqual(keys, [
    ['kind', 'known', 'n', 'tail'],
    ['kind', 'known', 'tail', 'ts'],
    ['id', 'kind', 'known', 'part', 'profile', 'round', 'tail'],
    ['area', 'id', 'kind', 'known', 'tail'],
    ['id', 'kind', 'known', 'n', 'tail'],
  ].map((k) => k.sort()))
  assert.equal(out[0].n, 2)
  assert.equal(out[0].tail, 'run-2')
  assert.equal(out[1].ts, '20261008101500')
  assert.equal(out[2].tail, 'S-001-v0-http-api-0')
  assert.equal(out[3].area, 'api')
  assert.equal(out[4].n, 3)
  assert.equal(out[4].id, 'S-001')
  for (const r of out) assert.equal(r.known, null)
})

test('T-R-023b the CLI prints the same result', opts, () => {
  const branches = [
    'sdlc/run-2',
    'sdlc/state-20261008101500',
    'sdlc/S-001-v0-http-api-0',
    'sdlc/M-1-e2e-api',
    'sdlc/S-001-attempt-3',
  ]
  const expected = pyParse(branches.map((branch) => ({ fmt: DEFAULT_FMT, branch })))
  branches.forEach((branch, i) => {
    const out = cliParse(DEFAULT_FMT, branch)
    for (const key of ['ok', 'command', 'format', 'branch']) assert.ok(key in out, `${branch}: ${key}`)
    assert.equal(out.command, 'parse')
    assert.equal(out.format, DEFAULT_FMT)
    assert.equal(out.branch, branch)
    for (const [key, value] of Object.entries(expected[i])) {
      assert.deepEqual(out[key], value, `${branch}: ${key}`)
    }
    for (const key of ['n', 'round', 'part']) {
      if (key in expected[i]) assert.ok(Number.isInteger(out[key]), `${branch}: ${key} is an integer`)
    }
  })
})

test('T-R-024a ids resolve the ledger spelling', opts, () => {
  const branch = 'feature/proj-1-s-001'
  const out = pyParse([
    { fmt: LOWER_FMT, branch, ids: ['S-001'] },
    { fmt: LOWER_FMT, branch, ids: ['S-002'] },
    { fmt: LOWER_FMT, branch },
    { fmt: LOWER_FMT, branch, ids: ['S-001'], as: 'iter' },
    { fmt: LOWER_FMT, branch, ids: ['S-001'], as: 'tuple' },
    { fmt: LOWER_FMT, branch, ids: ['S-001', 's-001'] },
    { fmt: LOWER_FMT, branch, ids: ['s-001', 'S-001'] },
  ])
  assert.equal(out[0].id, 'S-001')
  assert.equal(out[0].known, true)
  assert.equal(out[1].id, 's-001')
  assert.equal(out[1].known, false)
  assert.equal(out[2].known, null)
  assert.equal(out[3].id, 'S-001')
  assert.equal(out[3].known, true)
  assert.equal(out[4].id, 'S-001')
  assert.equal(out[4].known, true)
  assert.equal(out[5].id, 'S-001')
  assert.equal(out[6].id, 's-001')
})

test('T-R-024b case-insensitive matching only under lower', opts, () => {
  const out = pyParse([
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001', ids: ['s-001'] },
    { fmt: LOWER_FMT, branch: 'feature/PROJ-1-s-001', ids: ['s-001'] },
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001', ids: ['S-001'] },
    { fmt: DEFAULT_FMT, branch: 'sdlc/run-2', ids: ['S-001'] },
    { fmt: DEFAULT_FMT, branch: 'sdlc/state-20261008101500', ids: ['S-001'] },
    { fmt: DEFAULT_FMT, branch: 'sdlc/M-1', ids: ['M-1'] },
  ])
  assert.equal(out[0].known, false)
  assert.equal(out[1].known, true)
  assert.equal(out[2].known, true)
  assert.equal(out[3].known, null)
  assert.equal(out[4].known, null)
  assert.equal(out[5].known, true)
})

const SUFFIX_FMT = '{name}-wip'

const parseOne = (branch, fmt = DEFAULT_FMT) => pyParse([{ fmt, branch }])[0]

test('T-R-102a row 1 run', opts, () => {
  const out = parseOne('sdlc/run-3')
  assert.equal(out.kind, 'run')
  assert.equal(out.n, 3)
  assert.equal(out.tail, 'run-3')
  assert.equal('id' in out, false)
  assert.equal(parseOne('sdlc/run-0').n, 0)
  assert.equal(parseOne('sdlc/run-12').n, 12)
  for (const branch of ['sdlc/run-x', 'sdlc/run-', 'sdlc/run-3-x', 'sdlc/run--1']) {
    assert.equal(parseOne(branch), null, branch)
  }
  const cli = cliParse(DEFAULT_FMT, 'sdlc/run-3')
  assert.equal(cli.kind, 'run')
  assert.equal(cli.n, 3)
})

test('T-R-103a row 2 milestone', opts, () => {
  const out = parseOne('sdlc/M-2')
  assert.equal(out.kind, 'milestone')
  assert.equal(out.id, 'M-2')
  assert.equal(parseOne('sdlc/M-'), null)
  assert.equal(parseOne('sdlc/M-x'), null)
  assert.notEqual(parseOne('sdlc/M-2-e2e').kind, 'milestone')
  assert.equal(parseOne('sdlc/m-2'), null)
  assert.equal(parseOne('feature/PROJ-1-m-2', LOWER_FMT).kind, 'milestone')
})

test('T-R-104a row 3 e2e', opts, () => {
  const out = parseOne('sdlc/M-2-e2e')
  assert.equal(out.kind, 'e2e')
  assert.equal(out.id, 'M-2')
  assert.notEqual(parseOne('sdlc/M-2-e2e-api').kind, 'e2e')
  assert.equal(parseOne('sdlc/M-2-e2e-'), null)
})

test('T-R-105a row 4 e2e-area', opts, () => {
  const out = parseOne('sdlc/M-2-e2e-api-v2')
  assert.equal(out.kind, 'e2e-area')
  assert.equal(out.id, 'M-2')
  assert.equal(out.area, 'api-v2')
  assert.equal(parseOne('sdlc/M-2-e2e-a').area, 'a')
  const nested = parseOne('sdlc/M-2-e2e-e2e')
  assert.equal(nested.kind, 'e2e-area')
  assert.equal(nested.area, 'e2e')
  const cli = cliParse(DEFAULT_FMT, 'sdlc/M-2-e2e-api-v2')
  assert.equal(cli.kind, 'e2e-area')
  assert.equal(cli.id, 'M-2')
  assert.equal(cli.area, 'api-v2')
})

test('T-R-105b area with dashes stays whole', opts, () => {
  const out = pyParse([
    { fmt: DEFAULT_FMT, branch: 'sdlc/M-2-e2e-v2-api-3' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/M-2-e2e-0' },
  ])
  assert.equal(out[0].area, 'v2-api-3')
  assert.equal(out[1].area, '0')
})

test('T-R-105c precedence and prefixed formats', opts, () => {
  for (const fmt of [PLAIN_FMT, SUFFIX_FMT, DEFAULT_FMT]) {
    const wrap = (tail) => fmt.replace('{name}', tail)
    const out = pyParse([
      { fmt, branch: wrap('run-3') },
      { fmt, branch: wrap('M-2') },
      { fmt, branch: wrap('M-2-e2e') },
      { fmt, branch: wrap('M-2-e2e-api') },
    ])
    assert.deepEqual(out.map((r) => r.kind), ['run', 'milestone', 'e2e', 'e2e-area'], fmt)
    assert.equal(out[0].n, 3)
    assert.equal(out[1].id, 'M-2')
    assert.equal(out[2].id, 'M-2')
    assert.equal(out[3].area, 'api', fmt)
  }
  assert.equal(parseOne('M-2-e2e-api-wip', SUFFIX_FMT).area, 'api')
})

test('T-R-070a parse keeps the table precedence', opts, () => {
  const out = pyParse([
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-fix-M-1-2' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/M-1-e2e-api' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001-v0-http-api-0' },
  ])
  assert.deepEqual(out.map((r) => r.kind), ['slice', 'e2e-area', 'verify'])
  assert.equal(out[0].id, 'S-fix-M-1-2')
  assert.equal(out[2].profile, 'http-api')
  assert.equal(out[2].round, 0)
  assert.equal(out[2].part, 0)
})

test('T-R-069a parse returns null for a foreign branch and resolves ids against the ledger', opts, () => {
  const out = pyParse([
    { fmt: DEFAULT_FMT, branch: 'main' },
    { fmt: PLAIN_FMT, branch: 'feature/PROJ-1-foo' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/feature-x' },
    { fmt: LOWER_FMT, branch: 'feature/proj-1-s-001', ids: ['S-001'] },
  ])
  assert.equal(out[0], null)
  assert.equal(out[1], null)
  assert.equal(out[2], null)
  assert.equal(out[3].kind, 'slice')
  assert.equal(out[3].id, 'S-001')
  assert.equal(out[3].known, true)
})

const LOOP_SOURCES = ['sdlc-loop.js', 'next-action.py', 'state-write.py', 'janitor.py', 'suite-receipt.py', 'impact.py']
const PUSH_SITE = /git push|["']push["']|pr create|pulls/

function findE2eAreaPushViolations(source) {
  const lines = source.split('\n')
  const sites = []
  const violations = []
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) return
    if (!PUSH_SITE.test(line)) return
    const statement = lines.slice(i, i + 4).filter((l) => !l.trim().startsWith('#') && !l.trim().startsWith('//')).join('\n')
    sites.push(i + 1)
    if (statement.includes('e2e-area') || statement.includes('-e2e-')) violations.push(i + 1)
  })
  return { sites, violations }
}

test('T-R-120a no push or pull-request site names an e2e-area branch', () => {
  let totalSites = 0
  const stateWrite = readFileSync(join(SKILL_DIR, 'state-write.py'), 'utf8')
  assert.ok(findE2eAreaPushViolations(stateWrite).sites.length >= 1, 'the scan finds no push site in state-write.py')
  for (const file of LOOP_SOURCES) {
    const { sites, violations } = findE2eAreaPushViolations(readFileSync(join(SKILL_DIR, file), 'utf8'))
    totalSites += sites.length
    assert.deepEqual(violations, [], `${file}: push or pull-request site names an e2e-area branch at lines ${violations}`)
  }
  assert.ok(totalSites >= 1)
})

test('T-R-120b a planted e2e-area push is caught', () => {
  const planted = 'git(repo, "push", "-u", "origin", name(fmt, "e2e-area", id=m, area=a))\n'
  const { violations } = findE2eAreaPushViolations(planted)
  assert.deepEqual(violations, [1])
  const wrapped = 'git(repo,\n  "push",\n  "origin",\n  name(fmt, "e2e-area", id=m))\n'
  assert.ok(findE2eAreaPushViolations(wrapped).violations.length >= 1)
  assert.deepEqual(findE2eAreaPushViolations('# git push e2e-area\n').violations, [])
})

test('T-R-102b a run number beyond the int string limit still parses to one JSON object', opts, () => {
  const digits = '9'.repeat(5000)
  const out = cliParse(DEFAULT_FMT, `sdlc/run-${digits}`)
  assert.equal(out.kind, 'run')
  assert.equal(out.tail, `run-${digits}`)
})

test('T-R-106a row 5 state', opts, () => {
  const out = parseOne('sdlc/state-20261008101500')
  assert.equal(out.kind, 'state')
  assert.equal(out.ts, '20261008101500')
  assert.equal(typeof out.ts, 'string')
  assert.equal(out.tail, 'state-20261008101500')
  assert.equal('id' in out, false)
  const cli = cliParse(DEFAULT_FMT, 'sdlc/state-20261008101500')
  assert.equal(cli.kind, 'state')
  assert.equal(cli.ts, '20261008101500')
})

test('T-R-106b state needs exactly 14 digits', opts, () => {
  for (const branch of [
    'sdlc/state-2026100810150',
    'sdlc/state-202610081015000',
    'sdlc/state-',
    'sdlc/state-2026100810150x',
    'sdlc/state-2026100x810150',
  ]) {
    assert.equal(parseOne(branch), null, branch)
  }
})

test('T-R-107a row 6 verify', opts, () => {
  const out = parseOne('sdlc/S-001-v0-http-api-0')
  assert.equal(out.kind, 'verify')
  assert.equal(out.id, 'S-001')
  assert.equal(out.round, 0)
  assert.equal(out.profile, 'http-api')
  assert.equal(out.part, 0)
  const second = parseOne('sdlc/S-001-v12-cli-3')
  assert.equal(second.round, 12)
  assert.equal(second.profile, 'cli')
  assert.equal(second.part, 3)
  const cli = cliParse(DEFAULT_FMT, 'sdlc/S-001-v12-cli-3')
  assert.equal(cli.kind, 'verify')
  assert.equal(cli.id, 'S-001')
  assert.equal(cli.round, 12)
  assert.equal(cli.profile, 'cli')
  assert.equal(cli.part, 3)
})

test('T-R-107b verify beats slice', opts, () => {
  const out = pyParse([
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001-v0-http-api-0' },
    { fmt: '{name}', branch: 'S-001-v0-http-api-0' },
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-fix-M-1-2-v1-cli-0' },
  ])
  assert.equal(out[0].kind, 'verify')
  assert.equal(out[1].kind, 'verify')
  assert.equal(out[2].kind, 'verify')
  assert.equal(out[2].id, 'S-fix-M-1-2')
})

test('T-R-107c verify boundaries', opts, () => {
  for (const branch of ['sdlc/S-001-v0-http-api', 'sdlc/S-001-v-cli-0', 'sdlc/S-001-v0--0']) {
    const out = parseOne(branch)
    assert.notEqual(out && out.kind, 'verify', branch)
  }
  const dashed = parseOne('sdlc/S-001-v0-a-b-c-0')
  assert.equal(dashed.kind, 'verify')
  assert.equal(dashed.profile, 'a-b-c')
  assert.equal(dashed.part, 0)
})

test('T-R-108a row 7 attempt', opts, () => {
  const out = parseOne('sdlc/S-001-attempt-2')
  assert.equal(out.kind, 'attempt')
  assert.equal(out.id, 'S-001')
  assert.equal(out.n, 2)
  assert.equal(parseOne('sdlc/S-005b-attempt-10').n, 10)
  assert.equal(parseOne('sdlc/S-005b-attempt-10').id, 'S-005b')
  const cli = cliParse(DEFAULT_FMT, 'sdlc/S-001-attempt-2')
  assert.equal(cli.kind, 'attempt')
  assert.equal(cli.id, 'S-001')
  assert.equal(cli.n, 2)
})

test('T-R-108b attempt beats slice', opts, () => {
  assert.equal(parseOne('sdlc/S-001-attempt-2').kind, 'attempt')
  assert.equal(parseOne('S-001-attempt-2', '{name}').kind, 'attempt')
  for (const branch of ['sdlc/S-001-attempt-', 'sdlc/S-001-attempt-x']) {
    const out = parseOne(branch)
    assert.notEqual(out && out.kind, 'attempt', branch)
  }
})

test('T-R-109a row 8 slice', opts, () => {
  const out = parseOne('sdlc/S-001')
  assert.equal(out.kind, 'slice')
  assert.equal(out.id, 'S-001')
  assert.equal(parseOne('sdlc/S-fix-M-1-2').kind, 'slice')
  assert.equal(parseOne('sdlc/S-fix-M-1-2').id, 'S-fix-M-1-2')
  assert.equal(parseOne('sdlc/S-005b').id, 'S-005b')
  const cli = cliParse(DEFAULT_FMT, 'sdlc/S-001')
  assert.equal(cli.kind, 'slice')
  assert.equal(cli.id, 'S-001')
})

test('T-R-109b slice boundaries', opts, () => {
  for (const branch of ['sdlc/S-', 'sdlc/X-001', 'sdlc/s-001', 'sdlc/S-001/x']) {
    assert.equal(parseOne(branch), null, branch)
  }
  const lower = parseOne('feature/PROJ-1-s-001', LOWER_FMT)
  assert.equal(lower.kind, 'slice')
  assert.equal(lower.id, 's-001')
})

test('T-R-109c rows 5 to 8 under prefixed and suffixed formats', opts, () => {
  for (const fmt of [PLAIN_FMT, SUFFIX_FMT]) {
    const wrap = (tail) => fmt.replace('{name}', tail)
    const out = pyParse([
      { fmt, branch: wrap('state-20261008101500') },
      { fmt, branch: wrap('S-001-v0-http-api-0') },
      { fmt, branch: wrap('S-001-attempt-2') },
      { fmt, branch: wrap('S-001') },
    ])
    assert.deepEqual(out.map((r) => r.kind), ['state', 'verify', 'attempt', 'slice'], fmt)
    assert.equal(out[0].ts, '20261008101500', fmt)
    assert.equal(out[1].part, 0, fmt)
    assert.equal(out[2].n, 2, fmt)
    assert.equal(out[3].id, 'S-001', fmt)
  }
  assert.equal(parseOne('S-001-v0-http-api-0-wip', SUFFIX_FMT).kind, 'verify')
  assert.equal(parseOne('S-001-v0-http-api-0-wip', SUFFIX_FMT).part, 0)
})

test('T-R-109d ledger ids on the last four rows', opts, () => {
  const ids = ['S-001']
  const out = pyParse([
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001', ids },
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001-attempt-2', ids },
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-001-v0-http-api-0', ids },
    { fmt: DEFAULT_FMT, branch: 'sdlc/S-002', ids },
    { fmt: DEFAULT_FMT, branch: 'sdlc/state-20261008101500', ids },
  ])
  assert.equal(out[0].known, true)
  assert.equal(out[1].known, true)
  assert.equal(out[2].known, true)
  assert.equal(out[3].known, false)
  assert.equal(out[4].known, null)
})

function listRepo(names, config) {
  const repo = config ? withConfig(config) : gitRepo()
  git(repo, 'commit', '-q', '--allow-empty', '-m', 'init')
  for (const n of names) git(repo, 'branch', n)
  return repo
}

const listCli = (repo, kind, ...extra) => {
  const r = run(['list', '--repo', repo, '--kind', kind, ...extra])
  assert.equal(r.status, 0, `list ${kind}: exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`)
  return oneObject(r)
}

const listNames = (repo, kind, ...extra) => listCli(repo, kind, ...extra).branches.map((b) => b.branch)

const MIXED = [
  'sdlc/S-002', 'sdlc/S-001', 'sdlc/S-fix-M-1-2', 'sdlc/M-1', 'sdlc/run-1',
  'sdlc/state-20261008101500', 'sdlc/S-001-attempt-1', 'sdlc/S-001-v0-http-api-0',
  'sdlc/feature-x',
]

test('T-R-025a list returns one kind, sorted by name', opts, () => {
  const repo = listRepo(MIXED)
  const out = listCli(repo, 'slice')
  assert.equal(out.ok, true)
  assert.equal(out.command, 'list')
  assert.equal(out.kind, 'slice')
  assert.equal(typeof out.format, 'string')
  assert.deepEqual(out.branches.map((b) => b.branch), ['sdlc/S-001', 'sdlc/S-002', 'sdlc/S-fix-M-1-2'])
  for (const b of out.branches) {
    assert.equal(b.kind, 'slice')
    assert.equal(b.id, b.tail)
  }
  const viaPython = JSON.parse(probe(`${LOAD}
import json
print(json.dumps(mod.list_kind(sys.argv[2], "sdlc/{name}", "slice")))
`, [BRANCHES, repo]))
  assert.deepEqual(viaPython, out.branches)
})

test('T-R-025b list works for each kind', opts, () => {
  const repo = listRepo(MIXED)
  assert.deepEqual(listNames(repo, 'milestone'), ['sdlc/M-1'])
  assert.deepEqual(listNames(repo, 'run'), ['sdlc/run-1'])
  const state = listCli(repo, 'state').branches
  assert.equal(state.length, 1)
  assert.equal(state[0].branch, 'sdlc/state-20261008101500')
  assert.equal(state[0].ts, '20261008101500')
  const verify = listCli(repo, 'verify').branches
  assert.equal(verify.length, 1)
  assert.equal(verify[0].branch, 'sdlc/S-001-v0-http-api-0')
  assert.equal(verify[0].round, 0)
  assert.equal(verify[0].profile, 'http-api')
  assert.equal(verify[0].part, 0)
  const attempt = listCli(repo, 'attempt').branches
  assert.equal(attempt.length, 1)
  assert.equal(attempt[0].branch, 'sdlc/S-001-attempt-1')
  assert.equal(attempt[0].n, 1)
  assert.equal(attempt[0].id, 'S-001')
  assert.deepEqual(listCli(repo, 'e2e').branches, [])
  assert.deepEqual(listCli(repo, 'e2e-area').branches, [])
  git(repo, 'branch', 'sdlc/M-1-e2e')
  git(repo, 'branch', 'sdlc/M-1-e2e-api')
  assert.deepEqual(listNames(repo, 'e2e'), ['sdlc/M-1-e2e'])
  assert.deepEqual(listNames(repo, 'e2e-area'), ['sdlc/M-1-e2e-api'])
})

test('T-R-025c list sorts run branches by n', opts, () => {
  const repo = listRepo(['sdlc/run-10', 'sdlc/run-2', 'sdlc/run-1'])
  const out = listCli(repo, 'run').branches
  assert.deepEqual(out.map((b) => b.n), [1, 2, 10])
  assert.ok(out.every((b) => Number.isInteger(b.n)))
})

test('T-R-025d list honors the format', opts, () => {
  const repo = listRepo(['feature/PROJ-1-S-001', 'sdlc/S-001', 'feature/proj-1-s-002'])
  assert.deepEqual(listNames(repo, 'slice', '--format', 'feature/PROJ-1-{name}'), ['feature/PROJ-1-S-001'])
  const configured = listRepo(['feature/PROJ-1-S-001', 'sdlc/S-001'], { branchFormat: 'feature/PROJ-1-{name}' })
  assert.deepEqual(listNames(configured, 'slice'), ['feature/PROJ-1-S-001'])
  assert.deepEqual(listNames(configured, 'slice', '--format', 'sdlc/{name}'), ['sdlc/S-001'])
  const lower = listNames(repo, 'slice', '--format', 'feature/proj-1-{name:lower}')
  assert.ok(lower.includes('feature/proj-1-s-002'), `lower: ${lower}`)
})

test('T-R-025e list reads local branches only', opts, () => {
  const repo = listRepo(['sdlc/S-001'])
  const head = git(repo, 'rev-parse', 'HEAD')
  git(repo, 'update-ref', 'refs/remotes/origin/sdlc/S-009', head)
  git(repo, 'tag', 'sdlc/S-008')
  assert.deepEqual(listNames(repo, 'slice'), ['sdlc/S-001'])
})

test('T-R-025f list in an empty repo and in a bad repo', opts, () => {
  const empty = gitRepo()
  const out = listCli(empty, 'slice')
  assert.deepEqual(out.branches, [])
  const plain = scratch('sdlc-branches-plain-')
  const r = run(['list', '--repo', plain, '--kind', 'slice'])
  assert.equal(r.status, 2, `stdout ${r.stdout}, stderr ${r.stderr}`)
  assert.doesNotMatch(r.stderr, /Traceback/)
  assert.deepEqual(oneObject(r), { ok: false, error: `not a git repository: ${plain}` })
  assertBadInput(['list', '--repo', empty, '--kind', 'bogus'], 'unknown kind')
})

test('T-R-094a attempt sorts by n numerically', opts, () => {
  const repo = listRepo(['sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-1'])
  const out = listCli(repo, 'attempt').branches
  assert.deepEqual(out.map((b) => b.n), [1, 2, 10])
  assert.deepEqual(out.map((b) => b.branch), ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-10'])
  const mixed = listRepo(['sdlc/S-002-attempt-2', 'sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-10', 'sdlc/S-002-attempt-1'])
  const list = listCli(mixed, 'attempt').branches
  assert.deepEqual(list.map((b) => b.branch), [
    'sdlc/S-002-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-002-attempt-2', 'sdlc/S-001-attempt-10',
  ])
  assert.deepEqual(list.map((b) => b.id), ['S-002', 'S-001', 'S-002', 'S-001'])
})

test('T-R-094b the attempt sort is not a string sort', opts, () => {
  const repo = listRepo(['sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-2'])
  const names = listNames(repo, 'attempt')
  assert.notDeepEqual(names, [...names].sort())
  assert.deepEqual(names, ['sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-10'])
  assert.ok(listCli(repo, 'attempt').branches.every((b) => typeof b.n === 'number' && Number.isInteger(b.n)))
})

const rule = (kind, pattern, negate = false) => ({ source: 'gitlab', kind, pattern, negate, label: 'push rule' })

function evaluateEach(cases) {
  const results = JSON.parse(probe(`${CALL}
fn = getattr(mod, "evaluate", None) or (lambda *a: (_ for _ in ()).throw(AttributeError("evaluate is missing")))
print(json.dumps([call(fn, r, sample) for r, sample in json.loads(sys.argv[2])]))
`, [BRANCHES, JSON.stringify(cases)], { cwd: scratch('sdlc-branches-cwd-') }))
  return results.map((res, i) => {
    assert.ok('ret' in res, `evaluate(${JSON.stringify(cases[i])}) did not return: ${JSON.stringify(res)}`)
    return res.ret
  })
}

const evaluateOne = (r, sample) => evaluateEach([[r, sample]])[0]

test('T-R-033a each operator follows its definition', opts, () => {
  const got = evaluateEach([
    [rule('starts_with', 'feature/'), 'feature/x'],
    [rule('starts_with', 'feature/'), 'bugfix/x'],
    [rule('ends_with', '-e2e'), 'sdlc/M-1-e2e'],
    [rule('ends_with', '-e2e'), 'sdlc/M-1'],
    [rule('contains', '/S-'), 'sdlc/S-001'],
    [rule('contains', '/S-'), 'sdlc/M-1'],
  ])
  assert.deepEqual(got, [true, false, true, false, true, false])
})

test('T-R-033b starts_with is case-sensitive', opts, () => {
  assert.equal(evaluateOne(rule('starts_with', 'Feature/'), 'feature/x'), false)
})

test('T-R-033c regex uses search, not match', opts, () => {
  const got = evaluateEach([
    [rule('regex', '^sdlc/'), 'sdlc/S-001'],
    [rule('regex', 'S-001'), 'sdlc/S-001'],
    [rule('regex', '^S-001'), 'sdlc/S-001'],
  ])
  assert.deepEqual(got, [true, true, false])
})

test('T-R-095a ends_with is case-sensitive', opts, () => {
  const got = evaluateEach([
    [rule('ends_with', '-E2E'), 'sdlc/M-1-e2e'],
    [rule('ends_with', '-E2E'), 'sdlc/M-1-E2E'],
  ])
  assert.deepEqual(got, [false, true])
})

test('T-R-095b contains is case-sensitive', opts, () => {
  const got = evaluateEach([
    [rule('contains', 'Feature'), 'feature/x'],
    [rule('contains', 'Feature'), 'Feature/x'],
  ])
  assert.deepEqual(got, [false, true])
})

test('T-R-034a negate flips a boolean', opts, () => {
  const got = evaluateEach([
    [rule('starts_with', 'feature/', true), 'feature/x'],
    [rule('starts_with', 'feature/', true), 'bugfix/x'],
  ])
  assert.deepEqual(got, [false, true])
})

test('T-R-034b negate keeps None', opts, () => {
  const got = evaluateEach([
    [rule('regex', '('), 'sdlc/S-001'],
    [rule('regex', '(', true), 'sdlc/S-001'],
  ])
  assert.deepEqual(got, [null, null])
})

test('T-U-001 an unknown kind gives None and does not raise', opts, () => {
  const got = evaluateEach([
    [rule('equals', 'sdlc/S-001'), 'sdlc/S-001'],
    [rule('equals', 'sdlc/S-001', true), 'sdlc/S-001'],
  ])
  assert.deepEqual(got, [null, null])
})

test('T-U-002 regex_error gives the compile error', opts, () => {
  const results = callEach('regex_error', ['(', '^a'])
  assert.ok('ret' in results[0], `regex_error("(") did not return: ${JSON.stringify(results[0])}`)
  assert.equal(typeof results[0].ret, 'string')
  assert.notEqual(results[0].ret, '')
  assert.deepEqual(results[1], { ret: null })
})

test('T-R-072a evaluate follows each operator, negate flips, and a bad regex gives null', opts, () => {
  const kinds = [
    ['starts_with', 'feature/', 'feature/x', 'bugfix/x'],
    ['ends_with', '-e2e', 'sdlc/M-1-e2e', 'sdlc/M-1'],
    ['contains', '/S-', 'sdlc/S-001', 'sdlc/M-1'],
    ['regex', '^sdlc/', 'sdlc/S-001', 'feature/x'],
  ]
  const cases = []
  for (const [kind, pattern, hit, miss] of kinds) {
    cases.push([rule(kind, pattern), hit], [rule(kind, pattern), miss])
    cases.push([rule(kind, pattern, true), hit], [rule(kind, pattern, true), miss])
  }
  cases.push([rule('regex', '('), 'a'], [rule('regex', '[a-'), 'a'], [rule('regex', '[a-', true), 'a'])
  const got = evaluateEach(cases)
  assert.deepEqual(got, [
    true, false, false, true,
    true, false, false, true,
    true, false, false, true,
    true, false, false, true,
    null, null, null,
  ])
})

const labelled = (label, kind, pattern, negate = false) => ({ ...rule(kind, pattern, negate), label })
const PASS_RULE = (label) => labelled(label, 'starts_with', 'sdlc/')
const FAIL_RULE = (label) => labelled(label, 'starts_with', 'zzz/')
const BAD_RULE = (label = 'push rule') => labelled(label, 'regex', '(')

function judgeEach(cases) {
  const results = JSON.parse(probe(`${CALL}
fn = getattr(mod, "judge", None) or (lambda *a: (_ for _ in ()).throw(AttributeError("judge is missing")))
print(json.dumps([call(fn, rules, sample) for rules, sample in json.loads(sys.argv[2])]))
`, [BRANCHES, JSON.stringify(cases)], { cwd: scratch('sdlc-branches-cwd-') }))
  return results.map((res, i) => {
    assert.ok('ret' in res, `judge(${JSON.stringify(cases[i])}) did not return: ${JSON.stringify(res)}`)
    return res.ret
  })
}

const compileError = (pattern) => callEach('regex_error', [pattern])[0].ret

test('T-R-035a a pattern Python cannot compile gives an unevaluated sample', opts, () => {
  const [got] = judgeEach([[[rule('regex', '(')], 'sdlc/S-001']])
  assert.equal(got.result, 'unevaluated')
  assert.equal(got.rule, null)
  assert.deepEqual(got.notes, [`cannot evaluate push rule: ${compileError('(')}`])
})

test('T-R-035b the note carries the rule label', opts, () => {
  const [got] = judgeEach([[[labelled('ruleset 7', 'regex', '[a-')], 'sdlc/S-001']])
  assert.equal(got.result, 'unevaluated')
  assert.deepEqual(got.notes, [`cannot evaluate ruleset 7: ${compileError('[a-')}`])
})

test('T-R-035c a bad pattern never blocks', opts, () => {
  const got = judgeEach([
    [[PASS_RULE('a'), BAD_RULE()], 'sdlc/S-001'],
    [[BAD_RULE(), PASS_RULE('a')], 'sdlc/S-001'],
    [[labelled('neg', 'regex', '(', true)], 'sdlc/S-001'],
  ])
  assert.deepEqual(got.map((g) => g.result), ['unevaluated', 'unevaluated', 'unevaluated'])
})

test('T-R-035d judge does not raise on a bad pattern', opts, () => {
  const results = JSON.parse(probe(`${CALL}
fn = getattr(mod, "judge", None) or (lambda *a: (_ for _ in ()).throw(AttributeError("judge is missing")))
print(json.dumps([call(fn, [{"source": "gitlab", "kind": "regex", "pattern": p, "negate": False, "label": "push rule"}], "sdlc/S-001") for p in json.loads(sys.argv[2])]))
`, [BRANCHES, JSON.stringify(['(', '[a-', '*'])], { cwd: scratch('sdlc-branches-cwd-') }))
  results.forEach((res, i) => {
    assert.ok('ret' in res, `judge did not return for pattern ${i}: ${JSON.stringify(res)}`)
    assert.equal(typeof res.ret, 'object')
  })
})

test('T-R-036a one False fails the sample', opts, () => {
  const got = judgeEach([
    [[PASS_RULE('first'), FAIL_RULE('second'), PASS_RULE('third')], 'sdlc/S-001'],
    [[PASS_RULE('first'), FAIL_RULE('second'), FAIL_RULE('third')], 'sdlc/S-001'],
  ])
  assert.equal(got[0].result, 'fail')
  assert.equal(got[0].rule, 'second')
  assert.equal(got[1].result, 'fail')
  assert.equal(got[1].rule, 'second')
})

test('T-R-036b all True passes', opts, () => {
  const got = judgeEach([
    [[PASS_RULE('a'), PASS_RULE('b'), PASS_RULE('c')], 'sdlc/S-001'],
    [[], 'sdlc/S-001'],
  ])
  got.forEach((g) => {
    assert.equal(g.result, 'pass')
    assert.equal(g.rule, null)
    assert.deepEqual(g.notes, [])
  })
})

test('T-R-036c no failure plus one None is unevaluated', opts, () => {
  const [got] = judgeEach([[[PASS_RULE('a'), BAD_RULE()], 'sdlc/S-001']])
  assert.equal(got.result, 'unevaluated')
})

test('T-R-036d a failure beats a None', opts, () => {
  const [got] = judgeEach([[[BAD_RULE(), FAIL_RULE('hard')], 'sdlc/S-001']])
  assert.equal(got.result, 'fail')
  assert.equal(got.rule, 'hard')
})

test('T-R-036e negate counts', opts, () => {
  const got = judgeEach([
    [[labelled('neg', 'starts_with', 'sdlc/', true)], 'sdlc/S-001'],
    [[labelled('neg', 'starts_with', 'zzz/', true)], 'sdlc/S-001'],
  ])
  assert.equal(got[0].result, 'fail')
  assert.equal(got[0].rule, 'neg')
  assert.equal(got[1].result, 'pass')
})

test('T-R-037a an invalid ref fails with the git rule', opts, () => {
  const samples = ['bad..name', 'a~b', 'a^b', 'a:b', 'a?b', 'a*b', 'a[b', 'a\\b', '/lead', 'x.lock']
  const got = judgeEach(samples.map((s) => [[], s]))
  got.forEach((g, i) => {
    assert.equal(g.result, 'fail', `sample ${samples[i]}`)
    assert.equal(g.rule, 'git check-ref-format', `sample ${samples[i]}`)
  })
})

test('T-R-037b a valid sample passes the ref check', opts, () => {
  const got = judgeEach([
    [[], 'sdlc/S-001'],
    [[], 'feature/PROJ-1-sdlc-foo'],
  ])
  got.forEach((g) => assert.equal(g.result, 'pass'))
  const refs = callEach('ref_format_error', ['sdlc/S-001', 'feature/PROJ-1-sdlc-foo', 'bad..name'])
  assert.deepEqual(refs[0], { ret: null })
  assert.deepEqual(refs[1], { ret: null })
  assert.equal(typeof refs[2].ret, 'string')
  assert.notEqual(refs[2].ret, '')
})

test('T-R-037c a forge rule keeps the first label', opts, () => {
  const got = judgeEach([
    [[labelled('forge', 'starts_with', 'feature/')], 'bad..name'],
    [[labelled('forge', 'starts_with', 'bad')], 'bad..name'],
  ])
  assert.equal(got[0].result, 'fail')
  assert.equal(got[0].rule, 'forge')
  assert.equal(got[1].result, 'fail')
  assert.equal(got[1].rule, 'git check-ref-format')
})
