import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, chmodSync, cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const WT = resolve(process.env.VERIFY_WT || process.cwd())
const SKILL = join(WT, 'skills', 'sdlc')
const GUARD = join(SKILL, 'test', 'push_guard.py')
const LOG = process.env.VERIFY_LOG || ''
const { cliRunner } = await import(join(SKILL, 'test', 'testkit', 'cli-runner.mjs'))

const r = cliRunner({ skillDir: SKILL })
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const EXTENSIONS = /\.(py|js|json|md|html)$/
const VERIFY = 'sdlc/S-001-v0-http-api-0'

const log = (s) => { if (LOG) appendFileSync(LOG, s.endsWith('\n') ? s : s + '\n') }

function copyTree(name = 'tree') {
  const dir = r.dir(name)
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(WT, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

function guard(dir) {
  return r.exec('python3', [GUARD, dir], { watch: [] })
}

const BASE = guard(copyTree('base')).json

function breaches(out) {
  const found = Object.keys(BASE).filter(k => JSON.stringify(out[k]) !== JSON.stringify(BASE[k]))
  if (out.files.some(f => !EXTENSIONS.test(f))) found.push('extensions')
  return found
}

function summary(label, t) {
  const lines = [`### ${label}`, `$ ${t.argv.join(' ')}`, `exit: ${t.status}`]
  if (t.status !== 0) {
    lines.push(`stderr: ${t.stderr.trim().split('\n').slice(-3).join(' | ')}`)
    return lines.join('\n')
  }
  const changed = breaches(t.json)
  lines.push(`changed keys: ${changed.length ? changed.join(', ') : '(none: output equals the pins)'}`)
  for (const k of changed) {
    if (k === 'extensions') continue
    const added = t.json[k].filter(x => !BASE[k].includes(x))
    for (const a of added) lines.push(`  + ${k}: ${a}`)
  }
  return lines.join('\n')
}

function apply(dir, file, code, mode = 'append') {
  const p = join(dir, file)
  mkdirSync(dirname(p), { recursive: true })
  if (mode === 'append') appendFileSync(p, code)
  else if (mode === 'replace') writeFileSync(p, code)
  else if (mode === 'line2') {
    const lines = readFileSync(p, 'utf8').split('\n')
    lines.splice(1, 0, code)
    writeFileSync(p, lines.join('\n'))
  }
}

function probe(label, file, code, mode) {
  const dir = copyTree('mutant')
  apply(dir, file, code, mode)
  const t = guard(dir)
  log(summary(label, t))
  return { dir, t, found: t.status === 0 ? breaches(t.json) : ['exit'] }
}

const SW = 'skills/sdlc/state-write.py'
const JA = 'skills/sdlc/janitor.py'
const NA = 'skills/sdlc/next-action.py'
const CO = 'skills/sdlc/tracker/collect.py'
const BR = 'skills/sdlc/branches.py'
const LOOP = 'skills/sdlc/sdlc-loop.js'
const HP = 'hooks/live-poke.py'

const py = (...lines) => `\n\ndef _mutant(repo, b, root, slug, p, path, s):\n${lines.map(l => `    ${l}`).join('\n')}\n`
const pyTop = (top, ...lines) => `\n\n${top}\n${py(...lines)}`
const pyDef = (name, ...lines) => `\n\ndef ${name}(repo, b):\n${lines.map(l => `    ${l}`).join('\n')}\n`
const js = line => `\n${line}\n`
const LONG = '/tmp/' + 'a'.repeat(90)

const OLD_MUTANTS = [
  ['r0 verify name built on an earlier line', SW, py(`name = "${VERIFY}"`, 'git(repo, "push", "origin", name)')],
  ['r0 push split over two lines', SW, py('git(repo,', '    "push", "origin", b)')],
  ['r0 split gh pr create', JA, py('subprocess.run(["gh", "pr",', '                "create", "--head", b], cwd=repo)')],
  ['r1 single-quoted push', SW, py("git(repo, 'push', 'origin', b)")],
  ['r1 push with another repo name', SW, py('git(root, "push", "origin", b)')],
  ['r1 argv list push in janitor', JA, py('subprocess.run(["git", "-C", repo, "push", "origin", b])')],
  ['r1 os.system f-string push', JA, py('os.system(f"git -C {repo} push origin {b}")')],
  ['r1 shell=True f-string push', JA, py('subprocess.run(f"git -C {repo} push origin {b}", shell=True)')],
  ['r1 gh pr create with --repo before the verb', NA, py('run(repo, "gh", "pr", "--repo", slug, "create")')],
  ['r1 push in tracker/collect.py', CO, py('subprocess.run(["git", "-C", repo, "push", "origin", b])')],
  ['r1 bare execFileSync', LOOP, js("const _m = () => execFileSync('git', ['push'])")],
  ['r1 execFileSync with require', LOOP, js("const { execFileSync: _x } = require('child_process')")],
  ['r1 bare spawnSync', LOOP, js("const _m = () => spawnSync('git', ['push'])")],
  ['r1 spawnSync with require', LOOP, js("const { spawnSync: _y } = require('child_process')")],
  ['r2 path between git and push', SW, py('git(repo, "-C", "/tmp/a", "push", "origin", b)')],
  ['r2 quoted path with a space between git and push', SW, py('git(repo, "-C", "/tmp/a b", "push", "origin", b)')],
  ['r2 shell-quoted path between git and push', JA, py('os.system(\'git -C "/tmp/a" push origin b\')')],
  ['r2 shell-quoted repo variable', JA, py('os.system(f\'git -C "{repo}" push origin {b}\')')],
  ['r2 verb built by concatenation', SW, py('git(repo, "pu" + "sh", "origin", b)')],
  ['r2 shell string built by concatenation', JA, py('os.system("git -C x " + "push origin " + b)')],
  ['r2 more than 80 characters between git and push', SW, py(`git(repo, "-C", "${LONG}", "push", "origin", b)`)],
  ['r2 shell string split over two lines', JA, py('subprocess.run("git -C x "', '               "push origin b", shell=True)')],
  ['r2 gh api path holds pulls', NA, py('run(repo, "gh", "api", "repos/o/r/pulls", "-f", "title=x")')],
  ['r2 bare execSync', LOOP, js('const _m = () => execSync("git " + "push")')],
  ['r2 execSync with require', LOOP, js('const _m = () => require("child_process").execSync("git " + "push")')],
]

const NEW_CAUGHT = [
  ['import subprocess as sp', JA, pyTop('import subprocess as sp', 'sp.run(["git", "push", "origin", b])')],
  ['from os import system as s', JA, pyTop('from os import system as s', 's("git push origin " + b)')],
  ['os.posix_spawn', JA, py('os.posix_spawn("/usr/bin/git", ["git", "push", "origin", b], {})')],
  ['os.execvp', JA, py('os.execvp("git", ["git", "push", "origin", b])')],
  ['pty.spawn', JA, pyTop('import pty', 'pty.spawn(["git", "push", "origin", b])')],
  ['asyncio.create_subprocess_exec', JA, pyTop('import asyncio', 'asyncio.create_subprocess_exec("git", "push", "origin", b)')],
  ['starred argv', JA, py('subprocess.run([*["git", "push"], "origin", b])')],
  ['tuple argv', JA, py('subprocess.run(("git", "push", "origin", b))')],
  ['keyword args= argv', JA, py('subprocess.run(args=["git", "push", "origin", b])')],
  ['f-string verb through the wrapper', SW, py('v = "sh"', 'git(repo, f"pu{v}", "origin", b)')],
  ['wrapper passed through a lambda', SW, py('f = lambda *a: git(repo, *a)', 'f("push", "origin", b)')],
  ['wrapper through functools.partial', SW, pyTop('import functools', 'functools.partial(git, repo)("push", "origin", b)')],
  ['wrapper with -c alias.x=push before the verb', SW, py('git(repo, "-c", "alias.x=push", "x", b)')],
  ['gh api -X post in lower case', NA, py('run(repo, "gh", "api", "-X", "post", "repos/o/r/issues")')],
  ['gh api --method=POST as one token', NA, py('run(repo, "gh", "api", "--method=POST", "repos/o/r/issues")')],
  ['gh api -XPOST', NA, py('run(repo, "gh", "api", "-XPOST", "repos/o/r/issues")')],
  ['gh api --field=', NA, py('run(repo, "gh", "api", "--field=title=x", "repos/o/r/issues")')],
  ['gh api pulls path split by +', NA, py('run(repo, "gh", "api", "repos/o/r/pu" + "lls")')],
  ['glab mr create through run()', NA, py('run(repo, "glab", "mr", "create")')],
  ['gh api graphql with no flags', NA, py('run(repo, "gh", "api", "graphql")')],
  ['gh pr new alias', NA, py('run(repo, "gh", "pr", "new")')],
  ['getattr(subprocess, "run")', JA, py('getattr(subprocess, "run")(["git", "push", "origin", b])')],
  ['__import__("subprocess")', JA, py('__import__("subprocess").run(["git", "push", "origin", b])')],
  ['importlib.import_module', JA, pyTop('import importlib', 'importlib.import_module("subprocess").run(["git", "push"])')],
  ['subprocess.run bound to a name', JA, py('f = subprocess.run', 'f(["git", "push", "origin", b])')],
  ['js global.process', LOOP, js('const _m = global.process')],
  ["js global['child' + '_process']", LOOP, js("const _m = global['child' + '_process']")],
  ['js globalThis', LOOP, js('const _m = globalThis')],
  ["js Function('...')", LOOP, js("const _m = Function('return 1')")],
  ["js a fourth 'global' literal", LOOP, js("const _m = 'global'")],
  ['js "global" in double quotes', LOOP, js('const _m = "global"')],
  ['js global in backticks', LOOP, js('const _m = `global`')],
]

const MODULE_REBIND = [
  ['module bound to a local name', JA, pyDef('_m', 'sp = subprocess', 'sp.run(["git", "-C", repo, "push", "origin", b], check=True)')],
  ['module as a default parameter value', JA, `\n\ndef _m(repo, b, sp=subprocess):\n    sp.run(["git", "-C", repo, "push", "origin", b], check=True)\n`],
  ['module through a walrus', JA, pyDef('_m', '(sp := subprocess).run(["git", "-C", repo, "push", "origin", b], check=True)')],
  ['module through a list subscript', JA, pyDef('_m', '[subprocess][0].run(["git", "-C", repo, "push", "origin", b], check=True)')],
  ['os bound to a local name', JA, pyDef('_m', 'o = os', 'o.system("git -C " + repo + " push origin " + b)')],
]

const POSIX = [
  ['posix.system', JA, `\n\nimport posix\n${pyDef('_m', 'posix.system("git -C " + repo + " push origin " + b)')}`],
  ['posix.posix_spawnp', JA, `\n\nimport posix\n${pyDef('_m2', 'posix.posix_spawnp("git", ["git", "-C", repo, "push", "origin", b], {})')}`],
]

const HIDDEN = '#\\u000aimport subprocess as _h, os as _o\\u000aif _o.environ.get("VERIFY_REMOTE_REPO"): _h.run(["git", "-C", _o.environ["VERIFY_REMOTE_REPO"], "push", "origin", "' + VERIFY + '"], check=True)\n'

const NETWORK = [
  ['urllib.request bound to a local name in collect.py', CO, pyDef('_m', 'u = urllib.request', 'u.urlopen(u.Request("https://api.github.com/repos/o/r/pulls", data=b"{}", method="POST"))')],
  ['_socket in janitor.py', JA, `\n\nimport _socket\n${pyDef('_m', 's = _socket.socket()', 's.connect(("api.github.com", 443))')}`],
]

const JS_ESCAPES = [
  ['glob\\u0061lThis', LOOP, js("const _m = () => glob\\u0061lThis['pro' + 'cess']")],
  ['Fun\\u0063tion', LOOP, js("const _m = () => Fun\\u0063tion('return 1')()")],
  ['ev\\u0061l', LOOP, js("const _m = () => ev\\u0061l('1')")],
]

function pushRepos() {
  const remote = r.dir('origin')
  r.git(remote, 'init', '-q', '--bare')
  const repo = r.gitRepo({ name: 'work' })
  r.git(repo, 'remote', 'add', 'origin', remote)
  r.git(repo, 'branch', VERIFY)
  return { remote, repo }
}

function runMutant(dir, fn) {
  const { remote, repo } = pushRepos()
  const code = [
    'import importlib.util, sys',
    `sys.path.insert(0, ${JSON.stringify(join(dir, 'skills/sdlc'))})`,
    `spec = importlib.util.spec_from_file_location("janitor_m", ${JSON.stringify(join(dir, JA))})`,
    'm = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(m)',
    `m.${fn}(${JSON.stringify(repo)}, ${JSON.stringify(VERIFY)})`,
  ].join('\n')
  const t = r.exec('python3', ['-c', code], { watch: [] })
  const refs = r.git(remote, 'for-each-ref', '--format=%(refname)')
  log(`### run ${fn} from the mutated janitor.py\nexit: ${t.status}\nstderr: ${t.stderr.trim().split('\n').slice(-2).join(' | ')}\nremote refs after: ${refs || '(none)'}`)
  return refs
}

test('verify cli: TC-cli-12 the guard on the unchanged tree and on a copy under a path with spaces and unicode gives the pinned output', () => {
  const t = guard(WT)
  log(summary('TC-cli-12 unchanged worktree', t))
  assert.equal(t.status, 0)
  assert.deepEqual(breaches(t.json), [])
  const dir = r.dir('copy with spaces ü')
  for (const base of ['skills/sdlc', 'hooks']) cpSync(join(WT, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  const c = guard(dir)
  log(summary('TC-cli-12 copy under a path with spaces and unicode', c))
  assert.equal(c.status, 0)
  assert.deepEqual(breaches(c.json), [])
  assert.equal(BASE.pushes.length, 3)
  for (const k of ['dynamic', 'forgeViolations', 'opaque', 'wrapperValues', 'jsHits']) assert.deepEqual(BASE[k], [], k)
})

test('verify cli: TC-cli-13 every round 0 to 2 mutant changes the guard output', () => {
  const missed = OLD_MUTANTS.filter(([label, file, code]) => probe(`TC-cli-13 ${label}`, file, code).found.length === 0).map(m => m[0])
  assert.deepEqual(missed, [])
})

test('verify cli: TC-cli-15 the new in-scope forms named by the plan change the guard output', () => {
  const missed = NEW_CAUGHT.filter(([label, file, code]) => probe(`TC-cli-15 ${label}`, file, code).found.length === 0).map(m => m[0])
  assert.deepEqual(missed, [])
})

test('verify cli: TC-cli-40 a process module rebound to another name hides a real verify push', () => {
  const missed = MODULE_REBIND.filter(([label, file, code]) => probe(`TC-cli-40 ${label}`, file, code).found.length === 0).map(m => m[0])
  const { dir } = probe('TC-cli-40 proof mutant', JA, MODULE_REBIND[0][2])
  const refs = runMutant(dir, '_m')
  assert.match(refs, /refs\/heads\/sdlc\/S-001-v0-http-api-0/)
  assert.deepEqual(missed, [], `the guard output stays equal to the pins for: ${missed.join('; ')}`)
})

test('verify cli: TC-cli-41 the posix module runs a verify push that the guard does not see', () => {
  const missed = POSIX.filter(([label, file, code]) => probe(`TC-cli-41 ${label}`, file, code).found.length === 0).map(m => m[0])
  const { dir } = probe('TC-cli-41 proof mutant', JA, POSIX[0][2])
  const refs = runMutant(dir, '_m')
  assert.match(refs, /refs\/heads\/sdlc\/S-001-v0-http-api-0/)
  assert.deepEqual(missed, [], `the guard output stays equal to the pins for: ${missed.join('; ')}`)
})

test('verify cli: TC-cli-42 a unicode_escape source cookie hides a verify push from the AST scan', () => {
  const dir = copyTree('cookie')
  apply(dir, JA, '# coding: unicode_escape\n' + HIDDEN.trimEnd(), 'line2')
  const t = guard(dir)
  log(summary('TC-cli-42 janitor.py with a unicode_escape cookie and a hidden push', t))
  const { remote, repo } = pushRepos()
  const run = r.exec('python3', [join(dir, JA), '--help'], { env: { VERIFY_REMOTE_REPO: repo }, watch: [] })
  const refs = r.git(remote, 'for-each-ref', '--format=%(refname)')
  log(`### TC-cli-42 run the mutated janitor.py --help\n$ VERIFY_REMOTE_REPO=<work repo> python3 <copy>/skills/sdlc/janitor.py --help\nexit: ${run.status}\nremote refs after: ${refs || '(none)'}`)
  assert.equal(run.status, 0)
  assert.match(refs, /refs\/heads\/sdlc\/S-001-v0-http-api-0/)
  assert.equal(t.status, 0)
  assert.notDeepEqual(breaches(t.json), [], 'the guard output stays equal to the pins')
})

test('verify cli: TC-cli-43 a network module reached through a rebind or a private name is not reported', () => {
  const missed = NETWORK.filter(([label, file, code]) => probe(`TC-cli-43 ${label}`, file, code).found.length === 0).map(m => m[0])
  assert.deepEqual(missed, [], `the guard output stays equal to the pins for: ${missed.join('; ')}`)
})

test('verify cli: TC-cli-44 a banned identifier written with a unicode escape passes the loop scan', () => {
  const same = r.exec('node', ['-e', 'console.log(glob\\u0061lThis === globalThis, Fun\\u0063tion === Function, ev\\u0061l === eval)'], { watch: [] })
  log(`### TC-cli-44 node reads the escaped names as the banned identifiers\n$ ${same.argv.join(' ')}\nexit: ${same.status}\nstdout: ${same.stdout.trim()}`)
  assert.equal(same.stdout.trim(), 'true true true')
  const missed = JS_ESCAPES.filter(([label, file, code]) => probe(`TC-cli-44 ${label}`, file, code).found.length === 0).map(m => m[0])
  assert.deepEqual(missed, [], `the guard output stays equal to the pins for: ${missed.join('; ')}`)
})

const ONLY = (found, allowed) => found.filter(k => !allowed.includes(k))

test('verify cli: TC-cli-47 the S-013 gh api rules read in branches.py changes only the direct and forge pins', () => {
  const { t, found } = probe('TC-cli-47 S-013 rules read', BR, py('subprocess.run(["gh", "api", f"repos/{slug}/rules/branches/{quote(s, safe=\'\')}"], capture_output=True, text=True)'))
  assert.ok(found.includes('forge'))
  assert.deepEqual(ONLY(found, ['direct', 'forge']), [])
  for (const k of ['forgeViolations', 'opaque', 'dynamic', 'wrapperValues']) assert.deepEqual(t.json[k], [], k)
})

test('verify cli: TC-cli-48 a GET read through the next-action run wrapper hits no ban in any spelling', () => {
  for (const [label, args] of [
    ['-X GET', '"-X", "GET"'], ['-X get', '"-X", "get"'], ['--method=GET', '"--method=GET"'], ['-XGET', '"-XGET"'], ['no method', ''],
  ]) {
    const call = `run(repo, "gh", "api", ${args ? args + ', ' : ''}"repos/o/r/rules/branches/x")`
    const { t, found } = probe(`TC-cli-48 ${label}`, NA, py(call))
    assert.ok(found.includes('forge'), label)
    assert.deepEqual(ONLY(found, ['forge', 'wrapperVerbs']), [], label)
    for (const k of ['forgeViolations', 'opaque', 'dynamic', 'wrapperValues']) assert.deepEqual(t.json[k], [], `${label} ${k}`)
  }
})

test('verify cli: TC-cli-49 the glab push_rule read changes only the direct and forge pins', () => {
  const { t, found } = probe('TC-cli-49 glab api push_rule', BR, py('subprocess.run(["glab", "api", "projects/:fullpath/push_rule"], capture_output=True, text=True)'))
  assert.ok(found.includes('forge'))
  assert.deepEqual(ONLY(found, ['direct', 'forge']), [])
  for (const k of ['forgeViolations', 'opaque', 'dynamic', 'wrapperValues']) assert.deepEqual(t.json[k], [], k)
})

test('verify cli: TC-cli-50 a git log or git fetch through the state-write wrapper hits no ban', () => {
  const log1 = probe('TC-cli-50 git log', SW, py('git(repo, "log", "-1", "--format=%H")'))
  assert.deepEqual(log1.found, ['wrapperVerbs'])
  assert.ok(log1.t.json.wrapperVerbs.includes('state-write.py git log'))
  const fetch = probe('TC-cli-50 git fetch', SW, py('git(repo, "fetch", "-q", "origin")'))
  assert.deepEqual(fetch.found, [])
  for (const k of ['pushes', 'forgeViolations', 'opaque']) assert.deepEqual(log1.t.json[k], BASE[k], k)
})

test('verify cli: TC-cli-51 a pinned script the scanner cannot parse is reported as opaque', () => {
  for (const [label, content] of [
    ['syntax error', 'def broken(:\n'],
    ['invalid UTF-8', Buffer.from([0x23, 0x21, 0x0a, 0x78, 0x20, 0x3d, 0x20, 0x22, 0xff, 0xfe, 0x22, 0x0a])],
    ['NUL byte', 'x = 1\n\0\n'],
    ['latin-1 cookie with a latin-1 byte', Buffer.concat([Buffer.from('# coding: latin-1\nx = "'), Buffer.from([0xe9]), Buffer.from('"\n')])],
  ]) {
    const dir = copyTree('parse')
    writeFileSync(join(dir, HP), content)
    const t = guard(dir)
    log(summary(`TC-cli-51 ${label} in hooks/live-poke.py`, t))
    assert.equal(t.status, 0, label)
    assert.ok(t.json.opaque.some(o => o.startsWith('hooks/live-poke.py parse')), label)
  }
  const bom = probe('TC-cli-51 BOM before a hidden push in hooks/live-poke.py', HP, '﻿import subprocess\nsubprocess.run(["git", "push", "origin", "x"])\n', 'replace')
  assert.ok(bom.found.length > 0, 'a BOM file with a push leaves the pins equal')
})

test('verify cli: TC-cli-52 a new script file or a new script type changes the files pin or the extension check', () => {
  const cases = [
    ['new .py in a new subdirectory', d => apply(d, 'skills/sdlc/lib/x.py', 'x = 1\n')],
    ['symlinked .py file', d => symlinkSync(join(d, JA), join(d, 'skills/sdlc/linked.py'))],
    ['hooks/x.sh', d => apply(d, 'hooks/x.sh', '#!/bin/sh\ngit push origin x\n')],
    ['skills/sdlc/x.mjs', d => apply(d, 'skills/sdlc/x.mjs', "import 'node:child_process'\n")],
    ['skills/sdlc/x.cjs', d => apply(d, 'skills/sdlc/x.cjs', "require('child_process')\n")],
    ['no extension with a shebang', d => apply(d, 'skills/sdlc/pushit', '#!/usr/bin/env python3\nimport os\nos.system("git push")\n')],
    ['x.PY in upper case', d => apply(d, 'skills/sdlc/x.PY', 'x = 1\n')],
    ['x.pyc', d => apply(d, 'skills/sdlc/x.pyc', 'x')],
  ]
  const missed = []
  for (const [label, make] of cases) {
    const dir = copyTree('newfile')
    make(dir)
    const t = guard(dir)
    log(summary(`TC-cli-52 ${label}`, t))
    if (t.status === 0 && breaches(t.json).length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify cli: TC-cli-54 a guard crash fails the repo test instead of passing as an empty report', () => {
  for (const [label, file] of [['unreadable .py', HP], ['unreadable .js', LOOP]]) {
    const dir = copyTree('crash')
    chmodSync(join(dir, file), 0o000)
    const t = guard(dir)
    log(summary(`TC-cli-54 ${label}`, t))
    assert.notEqual(t.status, 0, label)
    assert.equal(t.stdout, '', label)
  }
  const src = readFileSync(join(SKILL, 'test', 'push-guard.test.mjs'), 'utf8')
  assert.match(src, /assert\.equal\(r\.status, 0, `push_guard\.py exit/)
})

test('verify cli: seed probes outside the R-119 scope', () => {
  const seeds = [
    ['S1 a second top-level advance_run_branch with the same push text', SW, '\n\ndef advance_run_branch(repo, run):\n    git(repo, \'push\', \'-q\', \'origin\', run, check=False)\n'],
    ['S3 subprocess.__dict__ subscript', JA, py('subprocess.__dict__["run"](["git", "push", "origin", b])')],
    ['S3 operator.attrgetter on subprocess', JA, pyTop('import operator', 'operator.attrgetter("run")(subprocess)(["git", "push", "origin", b])')],
    ['S3 js constructor walk', LOOP, js("const _m = () => (() => 0).constructor('return 1')()")],
    ['seed runpy.run_path', JA, pyTop('import runpy', 'runpy.run_path("/tmp/x.py")')],
    ['seed code.InteractiveInterpreter', JA, pyTop('import code', 'code.InteractiveInterpreter().runsource("import os")')],
    ['seed _posixsubprocess import', JA, '\n\nimport _posixsubprocess\n'],
    ['S5 tracker/test/x.py at a deeper level', 'skills/sdlc/tracker/test/x.py', 'import subprocess\nsubprocess.run(["git", "push", "origin", "x"])\n'],
  ]
  for (const [label, file, code] of seeds) probe(`seed ${label}`, file, code)
  const hooks = copyTree('hooksjson')
  const h = JSON.parse(readFileSync(join(hooks, 'hooks/hooks.json'), 'utf8'))
  h.hooks.SubagentStop.push({ hooks: [{ type: 'command', command: `git push origin ${VERIFY}`, timeout: 5 }] })
  writeFileSync(join(hooks, 'hooks/hooks.json'), JSON.stringify(h, null, 2))
  log(summary('seed hooks/hooks.json command that pushes', guard(hooks)))
  const linkDir = copyTree('linkdir')
  const outside = r.dir('outside')
  writeFileSync(join(outside, 'x.py'), 'import subprocess\nsubprocess.run(["git", "push", "origin", "x"])\n')
  symlinkSync(outside, join(linkDir, 'skills/sdlc/lib'))
  log(summary('seed S5 symlinked directory skills/sdlc/lib holding x.py', guard(linkDir)))
})
