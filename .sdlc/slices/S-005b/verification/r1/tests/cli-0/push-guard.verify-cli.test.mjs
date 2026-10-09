import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT ?? resolve(HERE, '../../../../../../..')
const GUARD = join(ROOT, 'skills/sdlc/test/push_guard.py')
const LOG = process.env.VERIFY_LOG ?? resolve(HERE, '../../logs/cli-0-transcripts.txt')
const { cliRunner } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs')).href)
const { load } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/attack-corpus.mjs')).href)

const r = cliRunner()
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `push_guard.py verify-cli transcripts, root ${ROOT}\n`)
const log = text => appendFileSync(LOG, `${text}\n`)

const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const CO = 'skills/sdlc/tracker/collect.py'
const LOOP = 'skills/sdlc/sdlc-loop.js'
const V = 'sdlc/S-001-v0-http-api-0'
const PY = '/opt/homebrew/bin/python3'

function copyTree() {
  const dir = r.dir('tree')
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(ROOT, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

function guard(dir, python = PY) {
  const t = r.exec(python, ['-I', GUARD, dir])
  assert.equal(t.status, 0, `push_guard.py exit ${t.status}: ${t.stderr}`)
  assert.ok(t.treeUnchanged, 'push_guard.py changed the scanned tree')
  return { out: JSON.parse(t.stdout), t }
}

const CLEAN = guard(copyTree()).out
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function delta(out, base = CLEAN) {
  const changed = {}
  for (const k of Object.keys(base)) {
    if (same(out[k], base[k])) continue
    changed[k] = {
      added: out[k].filter(x => !base[k].includes(x)),
      removed: base[k].filter(x => !out[k].includes(x)),
      count: `${base[k].length} -> ${out[k].length}`,
    }
  }
  return changed
}

function apply(dir, file, edit) {
  const path = join(dir, file)
  const src = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const next = typeof edit === 'function' ? edit(src) : src + edit
  assert.notEqual(next, src, `${file}: the edit changed nothing`)
  writeFileSync(path, next)
}

function probe(id, label, edits, { base = CLEAN, python = PY } = {}) {
  const dir = copyTree()
  for (const [file, edit] of edits) apply(dir, file, edit)
  const { out, t } = guard(dir, python)
  const changed = delta(out, base)
  log(`\n=== ${id} ${label}\n$ ${t.argv.join(' ')}\nexit: ${t.status} (${t.durationMs} ms) tree unchanged: ${t.treeUnchanged}\nchanged keys: ${Object.keys(changed).join(', ') || '<none>'}`)
  for (const [k, d] of Object.entries(changed)) {
    log(`  ${k} (${d.count})`)
    for (const a of d.added) log(`    + ${a}`)
    for (const x of d.removed) log(`    - ${x}`)
  }
  return { keys: Object.keys(changed), changed, out }
}

const after = (anchor, lines) => src => {
  assert.ok(src.includes(anchor), `anchor missing: ${anchor}`)
  return src.replace(anchor, `${anchor}\n${lines.join('\n')}`)
}
const swap = (anchor, text) => src => {
  assert.ok(src.includes(anchor), `anchor missing: ${anchor}`)
  return src.replace(anchor, text)
}
const fn = (head, ...lines) => `\n\ndef ${head}:\n${lines.map(l => `    ${l}`).join('\n')}\n`

const BODIES = [
  ['state-write git', SW, 'def git(repo, *args, check=True):'],
  ['suite-receipt git', SR, 'def git(repo, *args):'],
  ['next-action run', NA, 'def run(repo, *cmd):'],
  ['impact run', IM, 'def run(args, cwd):'],
  ['impact git_lines', IM, 'def git_lines(args, repo):'],
]
const inBody = (anchor, ...lines) => after(anchor, lines.map(l => `    ${l}`))

test('verify cli TC-cli-13: every covered git push spelling outside a body breaks a pin', () => {
  const cases = [
    ['double quotes', SW, fn('_m(repo)', `git(repo, "push", "origin", "${V}")`)],
    ['single quotes', SW, fn('_m(repo)', `git(repo, 'push', 'origin', '${V}')`)],
    ['split over lines', SW, fn('_m(repo)', 'git(', '    repo,', '    "push",', `    "origin", "${V}")`)],
    ['implicit concatenation', SW, fn('_m(repo)', `git(repo, "pu" "sh", "origin", "${V}")`)],
    ['+ of two constants', SR, fn('_m(repo)', `git(repo, "pu" + "sh", "origin", "${V}")`)],
    ['-C option', SW, fn('_m(repo)', `git(repo, "-C", "/tmp/x", "push", "origin", "${V}")`)],
    ['-c option', SW, fn('_m(repo)', `git(repo, "-c", "push.default=current", "push")`)],
    ['refspec push', SW, fn('_m(repo)', `git(repo, "push", "origin", "HEAD:refs/heads/sdlc/S-001-v0-x-0")`)],
    ['--mirror', SW, fn('_m(repo)', 'git(repo, "push", "--mirror", "origin")')],
    ['--all', SW, fn('_m(repo)', 'git(repo, "push", "--all", "origin")')],
    ['direct subprocess site', JA, fn('_m(repo)', `subprocess.run(["git", "-C", repo, "push", "origin", "${V}"])`)],
    ['shell=True', JA, fn('_m(repo)', `subprocess.run("git push origin ${V}", shell=True)`)],
    ['argv in a variable', JA, fn('_m(repo)', `cmd = ["git", "push", "origin", "${V}"]`, 'subprocess.run(cmd)')],
    ['tuple argv', JA, fn('_m(repo)', `subprocess.run(("git", "push", "origin", "${V}"))`)],
    ['next-action run', NA, fn('_m(repo)', `run(repo, "git", "push", "origin", "${V}")`)],
    ['impact run', IM, fn('_m(repo)', `run(["git", "push", "origin", "${V}"], repo)`)],
    ['impact git_lines', IM, fn('_m(repo)', `git_lines(["push", "origin", "${V}"], repo)`)],
    ['--no-pager flag', SW, fn('_m(repo)', 'git(repo, "--no-pager", "push")')],
    ['send-pack verb', SW, fn('_m(repo)', `git(repo, "send-pack", "../remote.git", "${V}")`)],
    ['collect.py direct site', CO, fn('_m(repo)', `subprocess.run(["git", "-C", repo, "push", "origin", "${V}"])`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-13', label, [[file, code]])
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-14: corpus spellings of the push verb break a pin or are not a push', () => {
  const missed = []
  for (const family of ['unicode-confusables', 'unicode-whitespace', 'control-chars']) {
    for (const e of load(family)) {
      if (typeof e.value !== 'string' || e.value.includes('\0') || /[\ud800-\udfff]/.test(e.value)) continue
      const verb = family === 'unicode-confusables' ? e.value : `push${e.value}`
      const lit = JSON.stringify(verb)
      const p = probe('TC-cli-14', `${family} ${e.id}`, [[SW, fn('_m(repo)', `git(repo, ${lit}, "origin", "${V}")`)]])
      if (p.keys.length === 0) missed.push(`${family} ${e.id}`)
    }
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-16: a process or network call reached by an alias, a value or dynamic code breaks a pin', () => {
  const top = (head, ...lines) => `\n\n${head}\n${fn('_m(repo, b)', ...lines)}`
  const cases = [
    ['import alias before use', JA, top('import subprocess as sp', `sp.run(["git", "-C", repo, "push", "origin", b])`)],
    ['from import alias before use', JA, top('from subprocess import Popen as P', 'P(["git", "push"])')],
    ['posix.system', JA, top('import posix', 'posix.system("git push")')],
    ['nt.system', JA, top('import nt', 'nt.system("git push")')],
    ['_posixsubprocess', JA, top('import _posixsubprocess', '_posixsubprocess.fork_exec()')],
    ['_winapi', JA, top('import _winapi', '_winapi.CreateProcess()')],
    ['_socket', JA, top('import _socket', '_socket.socket()')],
    ['_ssl', JA, top('import _ssl', '_ssl._SSLContext(2)')],
    ['rebind', JA, fn('_m(repo, b)', 's = subprocess.run', 's(["git", "push"])')],
    ['default parameter', JA, fn('_m(repo, b, s=subprocess.run)', 's(["git", "push"])')],
    ['walrus', JA, fn('_m(repo, b)', '(s := os.system)("git push")')],
    ['list element', JA, fn('_m(repo, b)', '[os.popen][0]("git push")')],
    ['subclass base', JA, `\n\nclass _P(subprocess.Popen):\n    pass\n`],
    ['eval', JA, fn('_m(repo, b)', 'eval("1")')],
    ['exec', JA, fn('_m(repo, b)', 'exec("x = 1")')],
    ['compile', JA, fn('_m(repo, b)', 'compile("1", "f", "eval")')],
    ['__import__', JA, fn('_m(repo, b)', '__import__("subprocess")')],
    ['breakpoint', JA, fn('_m(repo, b)', 'breakpoint()')],
    ['importlib', JA, top('import importlib', 'importlib.import_module("subprocess")')],
    ['globals', JA, fn('_m(repo, b)', 'globals()["os"].system("git push")')],
    ['locals', JA, fn('_m(repo, b)', 'locals()')],
    ['__builtins__', JA, fn('_m(repo, b)', '__builtins__')],
    ['vars()', JA, fn('_m(repo, b)', 'vars()')],
    ['private attribute', JA, fn('_m(repo, b)', 'subprocess._args_from_interpreter_flags()')],
    ['shutil.os.system', JA, fn('_m(repo, b)', 'shutil.os.system("git push")')],
    ['branches.subprocess.run', JA, fn('_m(repo, b)', 'branches.subprocess.run(["git", "push"])')],
    ['new import outside the pure list', JA, top('import pydoc', 'pydoc.pipepager("", "git push")')],
    ['asyncio subprocess', JA, top('import asyncio', 'asyncio.create_subprocess_exec("git", "push")')],
    ['os.posix_spawnp', JA, fn('_m(repo, b)', 'os.posix_spawnp("git", ["git", "push"], {})')],
    ['os.execvp', JA, fn('_m(repo, b)', 'os.execvp("git", ["git", "push"])')],
    ['pty.spawn', JA, top('import pty', 'pty.spawn(["git", "push"])')],
    ['urllib.request.urlopen in collect.py', CO, fn('_m(repo, b)', 'urllib.request.urlopen(urllib.request.Request("https://api.github.com/repos/o/r/pulls", data=b"{}"))')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-16', label, [[file, code]])
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-17: an import alias bound after its use in the file breaks a pin', () => {
  const cases = [
    ['import subprocess as sp after a function that calls sp.run, janitor.py', JA, `\n\ndef _mutant(repo, b):\n    sp.run(["git", "-C", repo, "push", "origin", b])\n\n\nimport subprocess as sp\n`],
    ['from subprocess import run as _r after its use, state-write.py', SW, `\n\ndef _mutant(repo, b):\n    _r(["git", "-C", repo, "push", "origin", b])\n\n\nfrom subprocess import run as _r\n`],
    ['import os as _o after its use, branches.py', 'skills/sdlc/branches.py', `\n\ndef _mutant(repo, b):\n    _o.system("git -C " + repo + " push origin " + b)\n\n\nimport os as _o\n`],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-17', label, [[file, code]])
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-18: a git -c option that runs a command before a constant verb breaks a pin', () => {
  const cases = [
    ['-c core.fsmonitor push before diff in state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git push -q origin " + "${V}" + "; echo", "diff", check=False)`)],
    ['-c core.fsmonitor push before diff, one constant, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git push -q origin ${V}; echo", "diff", check=False)`)],
    ['-c core.fsmonitor push before rev-parse in suite-receipt.py', SR, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git push -q origin ${V}; echo", "rev-parse", "HEAD")`)],
    ['-c core.fsmonitor at a direct site in janitor.py', JA, fn('_mutant(repo, b)', `subprocess.run(["git", "-C", repo, "-c", "core.fsmonitor=git push -q origin ${V}; echo", "diff"])`)],
    ['-c core.fsmonitor with $IFS in place of spaces before diff in state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git\${IFS}push\${IFS}-q\${IFS}origin\${IFS}${V};echo", "diff", check=False)`)],
    ['-c core.fsmonitor with $IFS before rev-parse in suite-receipt.py', SR, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git\${IFS}push\${IFS}-q\${IFS}origin\${IFS}${V};echo", "rev-parse", "HEAD")`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-18', label, [[file, code]])
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

function remoteWithVerifyBranch() {
  const remote = r.dir('remote')
  r.git(remote, 'init', '-q', '--bare')
  const repo = r.gitRepo({ files: { 'f.txt': 'x\n' }, branches: [V] })
  r.git(repo, 'remote', 'add', 'origin', remote)
  return { remote, repo }
}

const refsOf = remote => r.git(remote, 'for-each-ref', '--format=%(refname)')

function loadAndCall(dir, file, repo) {
  const code = `import importlib.util, sys\nsys.path.insert(0, ${JSON.stringify(dirname(join(dir, file)))})\nspec = importlib.util.spec_from_file_location("m", ${JSON.stringify(join(dir, file))})\nm = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nm._mutant(${JSON.stringify(repo)}, ${JSON.stringify(V)})\n`
  return r.exec(PY, ['-c', code])
}

test('verify cli TC-cli-19: the TC-cli-17 and TC-cli-18 mutants push a verify branch to a bare remote', () => {
  const mutants = [
    ['TC-cli-17 janitor.py', JA, `\n\ndef _mutant(repo, b):\n    sp.run(["git", "-C", repo, "push", "-q", "origin", b])\n\n\nimport subprocess as sp\n`],
    ['TC-cli-18 state-write.py with $IFS', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git\${IFS}push\${IFS}-q\${IFS}origin\${IFS}${V};echo", "diff", check=False)`)],
  ]
  const pushed = []
  for (const [label, file, code] of mutants) {
    const dir = copyTree()
    apply(dir, file, code)
    const { out } = guard(dir)
    const { remote, repo } = remoteWithVerifyBranch()
    const before = refsOf(remote)
    const t = loadAndCall(dir, file, repo)
    const afterRefs = refsOf(remote)
    log(`\n=== TC-cli-19 ${label}\nguard changed keys: ${Object.keys(delta(out)).join(', ') || '<none>'}\nremote refs before: ${before || '<none>'}\n${t.text()}\nremote refs after: ${afterRefs || '<none>'}`)
    if (afterRefs.includes(`refs/heads/${V}`) && Object.keys(delta(out)).length === 0) pushed.push(label)
  }
  assert.deepEqual(pushed, [], `the guard passed these mutants, and each pushed ${V} to the bare remote:\n${pushed.join('\n')}`)
})

const HUB = 'skills/sdlc/tracker/hub.py'
const BR = 'skills/sdlc/branches.py'

test('verify cli TC-cli-22: an import alias bound late, in another scope or through a chain breaks a pin', () => {
  const cases = [
    ['from os import system as _s after its use, branches.py', BR, `\n\ndef _mutant(repo, b):\n    _s("git push origin " + b)\n\n\nfrom os import system as _s\n`],
    ['global import inside another function, janitor.py', JA, `\n\ndef _load():\n    global sp\n    import subprocess as sp\n\n\ndef _mutant(repo, b):\n    sp.run(["git", "-C", repo, "push", "origin", b])\n`],
    ['import in a try block after its use, state-write.py', SW, `\n\ndef _mutant(repo, b):\n    _p(["git", "-C", repo, "push", "origin", b])\n\n\ntry:\n    from subprocess import Popen as _p\nexcept ImportError:\n    _p = None\n`],
    ['one name bound to json and to subprocess, janitor.py', JA, `\n\nimport json as sp\n\n\ndef _mutant(repo, b):\n    import subprocess as sp\n    sp.run(["git", "-C", repo, "push", "origin", b])\n`],
    ['import os.path as osp then osp.os.system, branches.py', BR, `\n\nimport os.path as osp\n\n\ndef _mutant(repo, b):\n    osp.os.system("git push origin " + b)\n`],
    ['from os import path as _p then _p.os.system, branches.py', BR, `\n\nfrom os import path as _p\n\n\ndef _mutant(repo, b):\n    _p.os.system("git push origin " + b)\n`],
    ['os.path.os.system chain, janitor.py', JA, fn('_mutant(repo, b)', 'os.path.os.system("git push origin " + b)')],
    ['urllib.request.os.system chain, collect.py', CO, fn('_mutant(repo, b)', 'urllib.request.os.system("git push origin " + b)')],
    ['socketserver.os.system chain, hub.py', HUB, fn('_mutant(repo, b)', 'socketserver.os.system("git push origin " + b)')],
    ['http.server.os.system chain, hub.py', HUB, fn('_mutant(repo, b)', 'http.server.os.system("git push origin " + b)')],
    ['getattr(os, "system"), janitor.py', JA, fn('_mutant(repo, b)', 'getattr(os, "system")("git push origin " + b)')],
    ['os.system passed to map, janitor.py', JA, fn('_mutant(repo, b)', 'list(map(os.system, ["git push origin " + b]))')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-22', label, [[file, code]])
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-23: every git option before the verb other than -C and the five flags is opaque', () => {
  const cases = [
    ['-c glued to its value', SW, fn('_mutant(repo, b)', `git(repo, "-ccore.fsmonitor=git push origin ${V};:", "diff", check=False)`)],
    ['--config-env', SW, fn('_mutant(repo, b)', 'git(repo, "--config-env=core.fsmonitor=SDLC_X", "diff", check=False)')],
    ['-c at a direct site in janitor.py', JA, fn('_mutant(repo, b)', 'subprocess.run(["git", "-c", "core.sshCommand=sh", "-C", repo, "for-each-ref"])')],
    ['-c after -C in suite-receipt.py', SR, fn('_mutant(repo, b)', 'git(repo, "-C", ".", "-c", "core.pager=sh", "rev-parse", "HEAD")')],
    ['-c through the next-action run wrapper', NA, fn('_mutant(repo, b)', 'run(repo, "git", "-c", "core.hooksPath=/tmp/h", "fetch", "-q", "origin")')],
    ['--exec-path', SW, fn('_mutant(repo, b)', 'git(repo, "--exec-path=/tmp/x", "diff", check=False)')],
    ['--git-dir', SW, fn('_mutant(repo, b)', 'git(repo, "--git-dir", "/tmp/r.git", "diff", check=False)')],
    ['--work-tree', SW, fn('_mutant(repo, b)', 'git(repo, "--work-tree=/tmp", "diff", check=False)')],
    ['-c from a variable', SW, fn('_mutant(repo, b, v)', 'git(repo, "-c", v, "diff", check=False)')],
    ['-c and its value in one constant', SW, fn('_mutant(repo, b)', 'git(repo, "-c core.fsmonitor=x", "diff", check=False)')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-23', label, [[file, code]])
    if (!p.keys.includes('opaque')) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [], `no opaque entry for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-24: seed probe S1: a fetch run in the remote copies a verify branch into it with every key equal', () => {
  const cases = [
    ['state-write.py git fetch in the remote', SW, fn('_mutant(repo, b)', 'remote = git(repo, "config", "--get", "remote.origin.url").stdout.strip()', `git(remote, "fetch", "-q", repo, f"refs/heads/{b}:refs/heads/{b}", check=False)`)],
    ['state-write.py git fetch in the remote, remote url read from .git/config', SW, fn('_mutant(repo, b)', 'remote = open(os.path.join(repo, ".git", "config")).read().split("url = ")[1].split()[0]', `git(remote, "fetch", "-q", repo, f"refs/heads/{b}:refs/heads/{b}", check=False)`)],
    ['next-action.py run git fetch in the remote, remote url read from .git/config', NA, fn('_mutant(repo, b)', 'remote = open(os.path.join(repo, ".git", "config")).read().split("url = ")[1].split()[0]', `run(remote, "git", "fetch", "-q", repo, f"refs/heads/{b}:refs/heads/{b}")`)],
  ]
  const passed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-24', label, [[file, code]])
    if (p.keys.length > 0) continue
    const dir = copyTree()
    apply(dir, file, code)
    const { remote, repo } = remoteWithVerifyBranch()
    const before = refsOf(remote)
    const t = loadAndCall(dir, file, repo)
    const afterRefs = refsOf(remote)
    log(`\n=== TC-cli-24 behavior ${label}\nguard changed keys: <none>\nremote refs before: ${before || '<none>'}\n${t.text()}\nremote refs after: ${afterRefs || '<none>'}`)
    if (afterRefs.includes(`refs/heads/${V}`)) passed.push(label)
  }
  const open = cases.slice(1).map(c => c[0])
  assert.deepEqual(passed.filter(l => !open.includes(l)), [])
})

test('verify cli TC-cli-25: seed probe S1: a variable option after a known wrapper verb leaves every key equal', () => {
  const cases = [
    ['variable option after fetch, state-write.py', SW, fn('_mutant(repo, b, opt)', 'git(repo, "fetch", "-q", "origin", opt, check=False)')],
    ['f-string --upload-pack after fetch, state-write.py', SW, fn('_mutant(repo, b, c)', 'git(repo, "fetch", f"--upload-pack={c}", "origin", check=False)')],
  ]
  const res = []
  for (const [label, file, code] of cases) {
    const dir = copyTree()
    apply(dir, file, code)
    const t = r.exec(PY, ['-I', GUARD, dir])
    let keys = '<no json>'
    try { keys = Object.keys(delta(JSON.parse(t.stdout))).join(', ') || '<none>' } catch {}
    log(`\n=== TC-cli-25 ${label}\nexit: ${t.status}\nstderr: ${t.stderr.trim().split('\n').slice(-3).join(' | ')}\nchanged keys: ${keys}`)
    res.push([label, t.status, keys])
  }
  assert.ok(['<none>', 'wrapperVerbs'].includes(res[0][2]), res[0][2])
  assert.equal(res[1][2], 'wrapperVerbs')
})

test('verify cli TC-cli-26: seed probe S3: a process module reached through a class attribute leaves every key equal', () => {
  const p = probe('TC-cli-26', 'import in a class body after its use, janitor.py', [[JA, `\n\ndef _mutant(repo, b):\n    _K.sp.run(["git", "-C", repo, "push", "origin", b])\n\n\nclass _K:\n    import subprocess as sp\n`]])
  assert.deepEqual(p.keys, [])
})

test('verify cli TC-cli-27: the os.path.os.system mutant pushes a verify branch to a bare remote while the guard output equals the pins', () => {
  const mutants = [
    ['os.path.os.system in janitor.py', JA, fn('_mutant(repo, b)', 'os.path.os.system("git -C " + repo + " push -q origin " + b)')],
    ['from os import path as _p, _p.os.system in branches.py', BR, `\n\nfrom os import path as _p\n\n\ndef _mutant(repo, b):\n    _p.os.system("git -C " + repo + " push -q origin " + b)\n`],
  ]
  const pushed = []
  for (const [label, file, code] of mutants) {
    const dir = copyTree()
    apply(dir, file, code)
    const { out } = guard(dir)
    const { remote, repo } = remoteWithVerifyBranch()
    const before = refsOf(remote)
    const t = loadAndCall(dir, file, repo)
    const afterRefs = refsOf(remote)
    log(`\n=== TC-cli-27 ${label}\nguard changed keys: ${Object.keys(delta(out)).join(', ') || '<none>'}\nremote refs before: ${before || '<none>'}\n${t.text()}\nremote refs after: ${afterRefs || '<none>'}`)
    if (afterRefs.includes(`refs/heads/${V}`) && Object.keys(delta(out)).length === 0) pushed.push(label)
  }
  assert.deepEqual(pushed, [], `the guard passed these mutants, and each pushed ${V} to the bare remote:\n${pushed.join('\n')}`)
})
