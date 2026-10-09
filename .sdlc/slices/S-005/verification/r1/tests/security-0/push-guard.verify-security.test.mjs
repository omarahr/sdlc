import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', '..')
const SKILL = join(REPO, 'skills', 'sdlc')
const GUARD = join(SKILL, 'test', 'push_guard.py')
const { cliRunner } = await import(join(SKILL, 'test', 'testkit', 'cli-runner.mjs'))
const { load } = await import(join(SKILL, 'test', 'testkit', 'attack-corpus.mjs'))

const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const SCRIPT = /\.(py|js)$/
const EXTENSIONS = /\.(py|js|json|md|html)$/
const VERIFY = 'sdlc/S-001-v0-http-api-0'

let hasGh = true
try { execFileSync('gh', ['--version']) } catch { hasGh = false }

const tmp = prefix => mkdtempSync(join(tmpdir(), prefix))

function copyTree() {
  const dir = tmp('sdlc-verify-security-')
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(REPO, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

function guardRaw(root) {
  return spawnSync('python3', [GUARD, root], { encoding: 'utf8' })
}

function guard(root) {
  const r = guardRaw(root)
  assert.equal(r.status, 0, `push_guard.py exit ${r.status}: ${r.stderr}`)
  return JSON.parse(r.stdout)
}

const BASE = guard(copyTree())

function breaches(out) {
  const found = []
  if (JSON.stringify(out.files.filter(f => SCRIPT.test(f))) !== JSON.stringify(BASE.files.filter(f => SCRIPT.test(f)))) found.push('files')
  if (out.files.some(f => !EXTENSIONS.test(f))) found.push('extensions')
  for (const key of Object.keys(BASE)) {
    if (key !== 'files' && JSON.stringify(out[key]) !== JSON.stringify(BASE[key])) found.push(key)
  }
  return found
}

function mutate(file, edit) {
  const dir = copyTree()
  const path = join(dir, file)
  mkdirSync(dirname(path), { recursive: true })
  if (typeof edit === 'function') edit(dir, path)
  else appendFileSync(path, edit)
  return dir
}

const py = (...lines) => `\n\ndef _mutant(repo, b):\n${lines.map(l => `    ${l}`).join('\n')}\n`
const pyTop = (top, ...lines) => `\n\n${top}\n${py(...lines)}`
const insertAfter = (anchor, line) => (_dir, path) => {
  const src = readFileSync(path, 'utf8')
  const i = src.indexOf(anchor)
  assert.ok(i >= 0, `anchor ${anchor} missing`)
  writeFileSync(path, src.slice(0, i + anchor.length) + '\n' + line + src.slice(i + anchor.length))
}

const SW = 'skills/sdlc/state-write.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const LOOP = 'skills/sdlc/sdlc-loop.js'

const IN_SCOPE_BYPASSES = [
  ['TC-security-1', 'state-write.py git wrapper: --work-tree takes a pinned verb as its value, then push', SW, py(`git(repo, "--work-tree", "fetch", "push", "origin", "${VERIFY}")`)],
  ['TC-security-2', 'next-action.py run wrapper: git --work-tree show push', NA, py(`run(repo, "git", "--work-tree", "show", "push", "origin", "${VERIFY}")`)],
  ['TC-security-3', 'impact.py git_lines wrapper: --work-tree diff push', IM, py(`git_lines(["--work-tree", "diff", "push", "origin", "${VERIFY}"], repo)`)],
  ['TC-security-4', 'next-action.py load_prs: gh pr --milestone list create', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "pr", "--milestone", "list", "create", "--fill", "--head", b)')],
  ['TC-security-5', 'pydoc.pipepager runs a shell command that pushes', JA, pyTop('import pydoc', `pydoc.pipepager("", "git push origin ${VERIFY}")`)],
  ['TC-security-6', 'logging.handlers.HTTPHandler POSTs to the pulls API', JA, pyTop('import logging.handlers', 'logging.handlers.HTTPHandler("api.github.com", "/repos/o/r/pulls", method="POST", secure=True).emit(None)')],
  ['TC-security-7', 'uuid._get_command_stdout runs git push', JA, pyTop('import uuid', `uuid._get_command_stdout("git", "push", "origin", "${VERIFY}")`)],
  ['TC-security-8', 'xml.dom.minidom.parse fetches a URL', JA, pyTop('import xml.dom.minidom', 'xml.dom.minidom.parse("https://api.github.com/repos/o/r/pulls")')],
]

for (const [id, label, file, edit] of IN_SCOPE_BYPASSES) {
  test(`verify security ${id}: ${label} breaks a pin`, () => {
    const found = breaches(guard(mutate(file, edit)))
    assert.notDeepEqual(found, [], `${id}: push_guard.py output equals the pins for an in-scope form: ${label}`)
  })
}

test('verify security TC-security-9: git --work-tree <pinned verb> push really pushes a verify branch', () => {
  const dir = tmp('sdlc-verify-security-git-')
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'v', GIT_AUTHOR_EMAIL: 'v@x', GIT_COMMITTER_NAME: 'v', GIT_COMMITTER_EMAIL: 'v@x' } })
  git('init', '-q', '--bare', 'remote.git')
  git('init', '-q', 'w')
  const w = join(dir, 'w')
  execFileSync('git', ['-C', w, '-c', 'user.name=v', '-c', 'user.email=v@x', 'commit', '-q', '--allow-empty', '-m', 'x'])
  execFileSync('git', ['-C', w, 'branch', VERIFY])
  execFileSync('git', ['-C', w, 'remote', 'add', 'origin', join(dir, 'remote.git')])
  assert.equal(git('-C', join(dir, 'remote.git'), 'for-each-ref').trim(), '')
  const r = spawnSync('git', ['-C', w, '--work-tree', 'fetch', 'push', 'origin', VERIFY], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(git('-C', join(dir, 'remote.git'), 'for-each-ref', '--format=%(refname)'), new RegExp(`refs/heads/${VERIFY}`))
})

test('verify security TC-security-10: pydoc.pipepager and HTTPHandler reach a process and the network', async () => {
  const dir = tmp('sdlc-verify-security-py-')
  const marker = join(dir, 'ran')
  const script = `
import http.server, threading, logging, logging.handlers, pydoc, json, sys
got = []
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(s):
        got.append([s.command, s.path]); s.send_response(201); s.end_headers()
    def log_message(*a): pass
srv = http.server.HTTPServer(("127.0.0.1", 0), H)
threading.Thread(target=srv.handle_request, daemon=True).start()
logging.handlers.HTTPHandler(f"127.0.0.1:{srv.server_port}", "/repos/o/r/pulls", method="POST").emit(logging.makeLogRecord({"msg": "x"}))
pydoc.pipepager("", "touch " + sys.argv[1])
print(json.dumps(got))
`
  const r = spawnSync('python3', ['-I', '-c', script, marker], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(JSON.parse(r.stdout), [['POST', '/repos/o/r/pulls']])
  assert.ok(existsSync(marker), 'pydoc.pipepager did not run its command')
})

test('verify security TC-security-11: gh routes pr --milestone list create to pr create', { skip: !hasGh && 'gh not installed' }, () => {
  const r = spawnSync('gh', ['pr', '--milestone', 'list', 'create', '--help'], { encoding: 'utf8', env: { ...process.env, GH_TOKEN: 'x', GH_HOST: 'github.invalid' } })
  assert.match(r.stdout + r.stderr, /Create a pull request/)
})

const HELD = [
  ['import subprocess as sp', JA, pyTop('import subprocess as sp', `sp.run(["git", "push", "origin", b])`)],
  ['from os import system as s', JA, pyTop('from os import system as s', 's("git push origin " + b)')],
  ['os.posix_spawn', JA, py('os.posix_spawn("/usr/bin/git", ["git", "push", "origin", b], {})')],
  ['os.execvp', JA, py('os.execvp("git", ["git", "push", "origin", b])')],
  ['pty.spawn', JA, pyTop('import pty', 'pty.spawn(["git", "push", "origin", b])')],
  ['asyncio.create_subprocess_exec', JA, pyTop('import asyncio', 'asyncio.create_subprocess_exec("git", "push", "origin", b)')],
  ['starred argv', JA, py('subprocess.run([*["git", "push"], "origin", b])')],
  ['tuple argv', JA, py('subprocess.run(("git", "push", "origin", b))')],
  ['args= keyword argv', JA, py('subprocess.run(args=["git", "push", "origin", b])')],
  ['f-string verb', SW, py('git(repo, f\'{"pu"}sh\', "origin", b)')],
  ['wrapper through a lambda', SW, py('f = lambda *a: git(repo, *a)', 'f("push", "origin", b)')],
  ['wrapper through functools.partial', SW, pyTop('import functools', 'functools.partial(git, repo)("push", "origin", b)')],
  ['-c alias.x=push', SW, py('git(repo, "-c", "alias.x=push", "x", b)')],
  ['-c ALIAS.fetch2=push', SW, py('git(repo, "-c", "ALIAS.fetch2=push", "fetch", b)')],
  ['-C value then push', SW, py('git(repo, "-C", "fetch", "push", "origin", b)')],
  ['--git-dir= then push', SW, py('git(repo, "--git-dir=.git", "push", "origin", b)')],
  ['gh api -X post in lower case inside load_prs', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "-X", "post", "repos/o/r/pulls")')],
  ['gh api --method=POST as one token', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "--method=POST", "repos/o/r/issues")')],
  ['gh api -XPOST', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "-XPOST", "repos/o/r/issues")')],
  ['gh api --field=', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "--field=title=x", "repos/o/r/issues")')],
  ['gh api -ftitle=x', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "repos/o/r/issues", "-ftitle=x")')],
  ['pulls path split by +', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "repos/o/r/pu" + "lls")')],
  ['gh api graphql bare inside load_prs', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "api", "graphql")')],
  ['glab mr create through run inside load_prs', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "glab", "mr", "create")')],
  ['gh pr create inside load_prs', NA, insertAfter('def load_prs(repo, prs_file):', '    run(repo, "gh", "pr", "create")')],
  ['getattr(subprocess, "run")', JA, py('getattr(subprocess, "run")(["git", "push", "origin", b])')],
  ['__import__("subprocess")', JA, py('__import__("subprocess").run(["git", "push"])')],
  ['importlib.import_module', JA, pyTop('import importlib', 'importlib.import_module("subprocess")')],
  ['js global.process', LOOP, '\nconst _m = global.process\n'],
  ["js global['child' + '_process']", LOOP, "\nconst _m = global['child' + '_process']\n"],
  ['js globalThis', LOOP, '\nconst _m = globalThis\n'],
  ['js Function', LOOP, "\nconst _m = Function('return 1')\n"],
  ["js a fourth 'global' literal", LOOP, "\nconst _m = 'global'\n"],
  ['js "global" in double quotes', LOOP, '\nconst _m = "global"\n'],
  ['js `global` in backticks', LOOP, '\nconst _m = `global`\n'],
]

test('verify security TC-security-12: VS-9 plan forms each break a pin', () => {
  const missed = HELD.filter(([, file, edit]) => breaches(guard(mutate(file, edit))).length === 0).map(([label]) => label)
  assert.deepEqual(missed, [])
})

const PUSH = 'import subprocess\nsubprocess.run(["git", "push", "origin", "sdlc/S-001-v0-http-api-0"])\n'

test('verify security TC-security-13: VS-11 unreadable, new and odd files fail closed', () => {
  const write = (rel, data) => (dir) => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, data) }
  const prepend = (rel, head, tail = '') => (dir) => { const p = join(dir, rel); writeFileSync(p, Buffer.concat([Buffer.from(head, 'latin1'), readFileSync(p), Buffer.from(tail, 'latin1')])) }
  const ext = tmp('sdlc-verify-security-ext-')
  writeFileSync(join(ext, 'y.py'), PUSH)
  const cases = [
    ['syntax error', write('skills/sdlc/x.py', 'def (:\n' + PUSH)],
    ['invalid utf-8', prepend('skills/sdlc/janitor.py', '', '\n# \xff\xfe\n' + PUSH)],
    ['utf-8 BOM', prepend('skills/sdlc/janitor.py', '\xef\xbb\xbf', '\n' + PUSH)],
    ['latin-1 cookie', prepend('skills/sdlc/janitor.py', '# coding: latin-1\n')],
    ['NUL byte', prepend('skills/sdlc/janitor.py', '', '\n#\x00\n' + PUSH)],
    ['new subdirectory', write('skills/sdlc/lib/x.py', PUSH)],
    ['symlinked .py file', (dir) => symlinkSync(join(ext, 'y.py'), join(dir, 'skills/sdlc/y.py'))],
    ['hooks/x.sh', write('hooks/x.sh', '#!/bin/sh\ngit push origin x\n')],
    ['x.mjs', write('skills/sdlc/x.mjs', "import 'node:child_process'\n")],
    ['x.cjs', write('skills/sdlc/x.cjs', "require('child_process')\n")],
    ['no extension with a shebang', write('skills/sdlc/pushit', '#!/usr/bin/env python3\n' + PUSH)],
    ['upper-case .PY', write('skills/sdlc/x.PY', PUSH)],
  ]
  const missed = []
  for (const [label, edit] of cases) {
    const dir = copyTree()
    edit(dir)
    const r = guardRaw(dir)
    if (r.status === 0 && breaches(JSON.parse(r.stdout)).length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify security TC-security-14: VS-11 a crash of push_guard.py is a non-zero exit, not an empty report', { skip: process.getuid?.() === 0 && 'root reads every file' }, () => {
  const dir = copyTree()
  appendFileSync(join(dir, JA), PUSH)
  chmodSync(join(dir, JA), 0)
  const r = guardRaw(dir)
  assert.notEqual(r.status, 0)
  assert.equal(r.stdout, '')
  assert.match(r.stderr, /PermissionError/)
})

test('verify security TC-security-15: VS-11 a .py file under a symlinked directory is scanned or reported', () => {
  const ext = tmp('sdlc-verify-security-lib-')
  writeFileSync(join(ext, 'x.py'), PUSH)
  const dir = copyTree()
  symlinkSync(ext, join(dir, 'skills/sdlc/lib'))
  appendFileSync(join(dir, JA), '\n\nimport lib.x\n')
  const r = guardRaw(dir)
  if (r.status !== 0) return
  const found = breaches(JSON.parse(r.stdout))
  assert.notDeepEqual(found, [], 'skills/sdlc/lib/x.py holds a push and push_guard.py exits 0 with output equal to the pins')
})

const r = cliRunner()
const repo = r.gitRepo({})
const ARGV_FAMILIES = ['traversal', 'control-chars', 'flag-like-values', 'unicode-whitespace', 'unicode-confusables', 'injection', 'format-strings']

function oneJsonLine(t) {
  const lines = t.stdout.split('\n').filter(Boolean)
  return lines.length === 1 && (() => { try { JSON.parse(lines[0]); return true } catch { return false } })()
}

function refSafe(branch) {
  return spawnSync('git', ['check-ref-format', '--branch', branch]).status === 0
}

test('verify security TC-security-16: VS-4 VS-6 hostile id and profile values never crash and stay under the prefix', () => {
  const bad = []
  const unsafe = []
  for (const family of ARGV_FAMILIES) {
    for (const e of load(family, { argv: true })) {
      const runs = [
        ['name', '--repo', repo, '--kind', 'verify', '--id', e.value, '--round', '0', '--profile', 'http-api', '--part', '0'],
        ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', e.value, '--part', '0'],
        ['name', '--repo', repo, '--kind', 'attempt', '--id', e.value, '--n', '1'],
      ]
      for (const args of runs) {
        const t = r.run('branches.py', args)
        if (![0, 2].includes(t.status) || /Traceback/.test(t.stderr) || !oneJsonLine(t) || !t.treeUnchanged) bad.push(`${e.id} ${args[4]} status ${t.status}`)
        else if (t.status === 0 && !t.json.branch.startsWith('sdlc/')) bad.push(`${e.id} ${t.json.branch}`)
        else if (t.status === 0 && !refSafe(t.json.branch)) unsafe.push(e.id)
      }
    }
  }
  assert.deepEqual(bad, [])
  console.log(`seed: ${new Set(unsafe).size} corpus entries give a ref-unsafe branch name`)
})

test('verify security TC-security-17: VS-4 VS-6 malformed round, part and n exit 2 or give an ASCII name', () => {
  const bad = []
  const accepted = []
  for (const family of ['integer-forms', 'huge-integers', 'unicode-digits']) {
    for (const e of load(family, { argv: true })) {
      for (const args of [
        ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', e.value, '--profile', 'http-api', '--part', '0'],
        ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', e.value],
        ['name', '--repo', repo, '--kind', 'attempt', '--id', 'S-001', '--n', e.value],
      ]) {
        const t = r.run('branches.py', args)
        if (![0, 2].includes(t.status) || /Traceback/.test(t.stderr) || !oneJsonLine(t) || !t.treeUnchanged) bad.push(`${e.id} status ${t.status}`)
        else if (t.status === 0 && !/^[\x21-\x7e]+$/.test(t.json.branch)) bad.push(`${e.id} non-ASCII ${t.json.branch}`)
        else if (t.status === 0) accepted.push(`${e.id}=${t.json.branch}`)
      }
    }
  }
  assert.deepEqual(bad, [])
  console.log(`accepted: ${accepted.length}; examples: ${accepted.filter(a => /v-|--/.test(a)).slice(0, 4).join(' ')}`)
})

test('verify security TC-security-18: VS-4 VS-6 a missing part exits 2 with one JSON error naming the part', () => {
  const base = { id: 'S-001', round: '0', profile: 'http-api', part: '0' }
  for (const drop of Object.keys(base)) {
    const args = ['name', '--repo', repo, '--kind', 'verify']
    for (const [k, v] of Object.entries(base)) if (k !== drop) args.push(`--${k}`, v)
    const t = r.run('branches.py', args)
    assert.equal(t.status, 2)
    assert.ok(oneJsonLine(t))
    assert.equal(t.json.ok, false)
    assert.match(t.json.error, new RegExp(`non-empty ${drop}`))
    assert.doesNotMatch(t.stderr, /Traceback/)
    assert.ok(t.treeUnchanged)
  }
  for (const [args, part] of [[['--n', '1'], 'id'], [['--id', 'S-001'], 'n'], [['--id', '', '--n', '1'], 'id']]) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'attempt', ...args])
    assert.equal(t.status, 2)
    assert.match(t.json.error, new RegExp(`non-empty ${part}`))
    assert.ok(t.treeUnchanged)
  }
  const ts = r.run('branches.py', ['name', '--repo', repo, '--kind', 'state', '--ts', '20261008101500'])
  assert.equal(ts.status, 2)
  assert.ok(oneJsonLine(ts))
})

test('verify security TC-security-19: VS-2 an explicit state ts is used as given, and empty or None generates one', () => {
  const script = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("branches", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
calls = [
    ("sdlc/{name}", "state", {"ts": "20261008101500"}),
    ("feature/PROJ-1-{name}", "state", {"ts": "20261008101500"}),
    ("sdlc/{name}", "state", {"ts": ""}),
    ("sdlc/{name}", "state", {"ts": None}),
    ("sdlc/{name}", "state", {"ts": 0}),
    ("sdlc/{name}", "state", {"ts": "../../x"}),
    ("sdlc/{name}", "state", {"ts": "a@{1} b\\x01"}),
    ("sdlc/{name}", "verify", {"id": "S-001", "round": None, "profile": "x", "part": 0}),
    ("sdlc/{name}", "attempt", {"id": "", "n": 1}),
]
out = []
for fmt, kind, kw in calls:
    try:
        out.append(["return", m.name(fmt, kind, **kw)])
    except m.Fail as e:
        out.append(["Fail", str(e)])
    except Exception as e:
        out.append(["exception", type(e).__name__])
print(json.dumps(out))
`
  const r = spawnSync('python3', ['-I', '-c', script, join(SKILL, 'branches.py')], { encoding: 'utf8', cwd: tmp('sdlc-verify-security-api-') })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.deepEqual(out[0], ['return', 'sdlc/state-20261008101500'])
  assert.deepEqual(out[1], ['return', 'feature/PROJ-1-state-20261008101500'])
  for (const i of [2, 3]) assert.match(out[i][1], /^sdlc\/state-\d{14}$/)
  assert.equal(out[7][0], 'Fail')
  assert.match(out[7][1], /round/)
  assert.equal(out[8][0], 'Fail')
  assert.match(out[8][1], /id/)
  assert.ok(out.every(o => o[0] !== 'exception'), JSON.stringify(out))
  console.log(`ts 0 -> ${JSON.stringify(out[4])}; ts traversal -> ${JSON.stringify(out[5])}; ts ref chars -> ${JSON.stringify(out[6])}`)
})

test('verify security TC-security-20: VS-8 the three pinned pushes target the run branch and milestone branches only', () => {
  const out = guard(REPO)
  assert.equal(out.pushes.length, 3)
  assert.deepEqual(out.pushes.map(p => p.split(' ')[1]), ['advance_run_branch', 'ensure_milestone_branch', 'prune_stale_milestone_branches'])
  const src = readFileSync(join(SKILL, 'state-write.py'), 'utf8')
  assert.match(src, /MILESTONE_BRANCH = re\.compile\(r"\^sdlc\/M-\\d\+\$"\)/)
  assert.match(src, /want = f"sdlc\/\{milestone_id\}"/)
  assert.deepEqual(out.forge, ['next-action.py load_prs gh pr list'])
  assert.deepEqual(out.forgeViolations, [])
})
