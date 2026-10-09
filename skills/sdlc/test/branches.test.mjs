import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
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
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out, { Fail: true, load_format: true, validate_format: true, main: true, split: true, name: true, tail: true })
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

test('name without a required part exits 2 with one JSON error and no traceback', opts, () => {
  const repo = gitRepo()
  for (const [label, args, part] of [
    ['e2e-area without --area', ['name', '--repo', repo, '--kind', 'e2e-area', '--id', 'M-1'], /\barea\b/],
    ['slice without --id', ['name', '--repo', repo, '--kind', 'slice'], /\bid\b/],
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
