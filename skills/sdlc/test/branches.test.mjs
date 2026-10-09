import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
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
}))
`, [BRANCHES], { cwd: scratch('sdlc-branches-cwd-') }))
  assert.deepEqual(out, { Fail: true, load_format: true, validate_format: true, main: true })
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
    name: ['--repo', repo, '--kind', 'verify', '--id', 'S-001', '--n', '1', '--area', 'api', '--round', '0', '--profile', 'http-api', '--part', '0', '--format', 'feature/{name}'],
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
