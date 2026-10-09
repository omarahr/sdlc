import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = process.env.VERIFY_REPO || join(HERE, '..', '..', '..', '..', '..', '..', '..')
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const GUARD = join(REPO, 'skills/sdlc/test/push_guard.py')
const GUARD_TEST = join(REPO, 'skills/sdlc/test/push-guard.test.mjs')
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const LOG = process.env.VERIFY_LOG
const r = cliRunner()

function pinsFromTest() {
  const src = readFileSync(GUARD_TEST, 'utf8')
  const files = src.slice(src.indexOf('const FILES = ['), src.indexOf('\n]\n', src.indexOf('const FILES = [')) + 2)
  const pins = src.slice(src.indexOf('const PINS = {'), src.indexOf('\n}\n', src.indexOf('const PINS = {')) + 2)
  return new Function(`${files}\n${pins}\nreturn { FILES, PINS }`)()
}
const { FILES, PINS } = pinsFromTest()
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function breaches(out) {
  const found = []
  if (!same(out.files.filter(f => /\.(py|js)$/.test(f)), FILES)) found.push('files')
  if (out.files.some(f => !/\.(py|js|json|md|html)$/.test(f))) found.push('extensions')
  for (const [key, pin] of Object.entries(PINS)) if (!same(out[key], pin)) found.push(key)
  return found
}

function copyTree() {
  const dir = r.dir('tree')
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(REPO, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

function mutate(edits) {
  const dir = copyTree()
  for (const [file, anchor, code] of edits) {
    const path = join(dir, file)
    const before = readFileSync(path, 'utf8')
    let after
    if (anchor === null) after = `${before}\n\n${code}\n`
    else {
      assert.ok(before.includes(anchor), `${file}: anchor missing: ${anchor}`)
      after = before.replace(anchor, `${anchor}${code}\n`)
    }
    writeFileSync(path, after)
  }
  return dir
}

function scan(label, dir) {
  const t = r.exec('python3', [GUARD, dir])
  assert.equal(t.status, 0, `${label}: guard exit ${t.status} ${t.stderr}`)
  assert.equal(t.treeUnchanged, true, `${label}: the guard changed the tree`)
  const out = JSON.parse(t.stdout)
  const found = breaches(out)
  if (LOG) appendFileSync(LOG, `${label}\t${found.length ? 'GUARD HIT ' + found.join(',') : 'NO PIN CHANGED'}\n`)
  return found
}

const fn = (...lines) => `def _verify_sec(repo, b, slug, verb=None, extra=(), path=None, prog=None, method=None, cfg=None, d=None):\n${lines.map(l => `    ${l}`).join('\n')}`
const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const BR = 'skills/sdlc/branches.py'
const HU = 'skills/sdlc/tracker/hub.py'
const CO = 'skills/sdlc/tracker/collect.py'

const VS4 = {
  'SA-01 local list spread into git': [[SW, null, fn('extra = ["push", "origin", b]', 'return git(repo, *extra)')]],
  'SA-02 parameter verb into git': [[SW, null, fn('return git(repo, verb)')]],
  'SA-03 f-string verb into git': [[SW, null, fn('return git(repo, f"{slug}")')]],
  'SA-04 f-string verb with constant prefix': [[SW, null, fn('return git(repo, f"pu{slug}", "origin", b)')]],
  'SA-05 string plus parameter verb': [[SW, null, fn('return git(repo, "pu" + slug)')]],
  'SA-06 verb from a method call': [[SW, null, fn('return git(repo, "push".strip(), "origin", b)')]],
  'SA-07 verb from an if expression': [[SW, null, fn('return git(repo, "push" if slug else "status", "origin", b)')]],
  'SA-08 verb from a subscript': [[SW, null, fn('return git(repo, ("push",)[0], "origin", b)')]],
  'SA-09 verb from percent format': [[SW, null, fn('return git(repo, "%s" % "push", "origin", b)')]],
  'SA-10 starred map call': [[SW, null, fn('return git(repo, *map(str, ["push", "origin", b]))')]],
  'SA-11 variable program in next-action run': [[NA, null, fn('return run(repo, prog, "pr", "create")')]],
  'SA-12 variable program in suite-receipt git (starred repo)': [[SR, null, fn('return git(*extra)')]],
  'SA-13 non-constant -X value for gh api': [[NA, null, fn('return run(repo, "gh", "api", "-X", method, "repos/o/r/issues")')]],
  'SA-14 parameter api path': [[NA, null, fn('return run(repo, "gh", "api", path)')]],
  'SA-15 variable -c option before verb': [[SW, null, fn('return git(repo, "-c", cfg, "status")')]],
  'SA-16 variable -C value then constant push': [[SW, null, fn('return git(repo, "-C", d, "push", "origin", b)')]],
  'SA-17 impact run with variable argv': [[IM, null, fn('return run(extra, ".")')]],
  'SA-18 impact git_lines with variable argv': [[IM, null, fn('return git_lines(extra, repo)')]],
  'SA-19 impact git_lines keyword args': [[IM, null, fn('return git_lines(args=["push", "origin", b], repo=".")')]],
  'SA-20 impact git_lines keyword args reversed': [[IM, null, fn('return git_lines(repo=".", args=["push", "origin", b])')]],
  'SA-21 impact run keyword args': [[IM, null, fn('return run(cwd=".", args=["git", "push", "origin", b])')]],
  'SA-22 impact run kwargs spread': [[IM, null, fn('return run(**{"args": ["git", "push", "origin", b], "cwd": "."})')]],
  'SA-23 impact git_lines kwargs spread': [[IM, null, fn('return git_lines(**{"args": ["push", "origin", b], "repo": "."})')]],
  'SA-24 next-action run keyword cmd': [[NA, null, fn('return run(repo=repo, cmd=("git", "push", "origin", b))')]],
  'SA-25 state-write git kwargs spread': [[SW, null, fn('return git(**{"repo": repo})')]],
  'SA-26 rebind wrapper to a name': [[SW, null, 'g = git\n\ndef _verify_sec(repo, b):\n    return g(repo, "push", "origin", b)']],
  'SA-27 wrapper as default parameter': [[SW, null, 'def _verify_sec(repo, b, f=git):\n    return f(repo, "push", "origin", b)']],
  'SA-28 wrapper in a list element': [[SW, null, 'def _verify_sec(repo, b):\n    return [git][0](repo, "push", "origin", b)']],
  'SA-29 wrapper in a class attribute': [[SW, null, 'class _K:\n    g = git\n\ndef _verify_sec(repo, b):\n    return _K.g(repo, "push", "origin", b)']],
  'SA-30 wrapper in a walrus': [[SW, null, 'def _verify_sec(repo, b):\n    return (g := git)(repo, "push", "origin", b)']],
  'SA-31 wrapper looked up with globals': [[SW, null, 'def _verify_sec(repo, b):\n    return globals()["git"](repo, "push", "origin", b)']],
  'SA-32 wrapper through __call__': [[SW, null, 'def _verify_sec(repo, b):\n    return git.__call__(repo, "push", "origin", b)']],
  'SA-33 wrapper through lambda forwarder': [[SW, null, 'fwd = lambda *a: git(*a)\n\ndef _verify_sec(repo, b):\n    return fwd(repo, "push", "origin", b)']],
  'SA-34 new def with wrapper name shadows (suite-receipt)': [[SR, null, 'def git(repo, *args):\n    return None']],
  'SA-35 bytes verb': [[SW, null, fn('return git(repo, b"push", "origin", b)')]],
  'SA-36 program git.exe': [[NA, null, fn('return run(repo, "git.exe", "push", "origin", b)')]],
  'SA-37 program env git push': [[NA, null, fn('return run(repo, "env", "git", "push", "origin", b)')]],
  'SA-38 program absolute git path': [[NA, null, fn('return run(repo, "/usr/bin/git", "push", "origin", b)')]],
  'SA-39 program sh -c': [[NA, null, fn('return run(repo, "sh", "-c", "git push origin " + b)')]],
  'SA-40 git alias via -c': [[SW, null, fn('return git(repo, "-c", "alias.x=push", "x", "origin", b)')]],
  'SA-41 git exec-path option': [[SW, null, fn('return git(repo, "--exec-path=/tmp/x", "show")')]],
  'SA-42 git long option glued to -C': [[SW, null, fn('return git(repo, "-C/tmp", "push", "origin", b)')]],
  'SA-43 glued -cvalue': [[SW, null, fn('return git(repo, "-ccore.x=1", "status")')]],
  'SA-44 push with unicode fullwidth verb': [[SW, null, fn('return git(repo, "ｐush", "origin", b)')]],
  'SA-45 push with trailing space': [[SW, null, fn('return git(repo, "push ", "origin", b)')]],
  'SA-46 push by tuple star': [[SW, null, fn('return git(repo, *("push", "origin", b))')]],
  'SA-47 pinned wrapper named as a parameter': [[SW, null, 'def _verify_sec(repo, b, git=None):\n    return git(repo, "push", "origin", b)']],
  'SA-48 send-pack verb': [[SW, null, fn('return git(repo, "send-pack", "origin", b)')]],
  'SA-49 fetch with refspec to remote ref delete form': [[SW, null, fn('return git(repo, "remote", "update")')]],
  'SA-50 gh with leading repo option and pr create': [[NA, null, fn('return run(repo, "gh", "-R", "o/r", "pr", "create")')]],
}

const VS7 = {
  'SB-01 import alias in a function': [[JA, null, 'import subprocess as sp\n\ndef _verify_sec(repo, b):\n    return sp.run(["git", "push", "origin", b])']],
  'SB-02 from-import alias of run': [[JA, null, 'from subprocess import run as rr\n\ndef _verify_sec(repo, b):\n    return rr(["git", "push", "origin", b])']],
  'SB-03 from-import os.system alias': [[JA, null, 'from os import system as sy\n\ndef _verify_sec(repo, b):\n    return sy("git push origin " + b)']],
  'SB-04 shutil.os.system': [[JA, null, fn('return shutil.os.system("git push origin " + b)')]],
  'SB-05 glob.os.system': [[JA, null, 'import glob\n\n' + fn('return glob.os.system("git push origin " + b)')]],
  'SB-06 branches.subprocess.run': [[JA, null, fn('return branches.subprocess.run(["git", "push", "origin", b])')]],
  'SB-07 tempfile private os': [[JA, null, fn('return tempfile._os.system("git push origin " + b)')]],
  'SB-08 posix.system': [[JA, null, 'import posix\n\n' + fn('return posix.system("git push origin " + b)')]],
  'SB-09 nt import': [[JA, null, 'import nt']],
  'SB-10 _posixsubprocess': [[JA, null, 'import _posixsubprocess']],
  'SB-11 _socket': [[JA, null, 'import _socket\n\n' + fn('return _socket.socket()')]],
  'SB-12 runpy': [[JA, null, 'import runpy\n\n' + fn('return runpy.run_path("x.py")')]],
  'SB-13 code': [[JA, null, 'import code']],
  'SB-14 codeop': [[JA, null, 'import codeop']],
  'SB-15 _winapi': [[JA, null, 'import _winapi']],
  'SB-16 module as value rebind': [[JA, null, fn('m = subprocess', 'return m.run(["git", "push", "origin", b])')]],
  'SB-17 module as default parameter': [[JA, null, 'def _verify_sec(b, m=subprocess):\n    return m.run(["git", "push", "origin", b])']],
  'SB-18 module in walrus': [[JA, null, 'def _verify_sec(b):\n    return (m := os).system("git push origin " + b)']],
  'SB-19 module in list': [[JA, null, 'def _verify_sec(b):\n    return [subprocess][0].run(["git", "push", "origin", b])']],
  'SB-20 subprocess as base class': [[JA, null, 'class _P(subprocess.Popen):\n    pass']],
  'SB-21 process function as value': [[JA, null, 'RUNNER = subprocess.run']],
  'SB-22 os.system as value': [[JA, null, 'def _verify_sec(b):\n    f = os.system\n    return f("git push origin " + b)']],
  'SB-23 module in dict': [[JA, null, 'TABLE = {"k": subprocess}']],
  'SB-24 module in lambda': [[JA, null, 'GET = lambda: subprocess']],
  'SB-25 module as decorator': [[JA, null, '@os.system\ndef _verify_dec():\n    pass']],
  'SB-26 module passed as argument': [[JA, null, 'def _verify_sec(b):\n    return print(subprocess)']],
  'SB-27 os.__dict__ lookup': [[JA, null, fn('return os.__dict__["system"]("git push origin " + b)')]],
  'SB-28 vars(os) lookup': [[JA, null, fn('return vars(os)["system"]("git push origin " + b)')]],
  'SB-29 getattr on os': [[JA, null, fn('return getattr(os, "system")("git push origin " + b)')]],
  'SB-30 getattr with joined name': [[JA, null, fn('return getattr(os, "sys" + "tem")("git push origin " + b)')]],
  'SB-31 getattr aliased': [[JA, null, fn('g = getattr', 'return g(os, "system")("git push origin " + b)')]],
  'SB-32 eval': [[JA, null, fn('return eval("__import__(\'os\').system(\'x\')")')]],
  'SB-33 exec': [[JA, null, fn('exec("import os")')]],
  'SB-34 compile': [[JA, null, fn('return compile("1", "x", "eval")')]],
  'SB-35 __import__': [[JA, null, fn('return __import__("os")')]],
  'SB-36 importlib': [[JA, null, 'import importlib\n\n' + fn('return importlib.import_module("os")')]],
  'SB-37 globals': [[JA, null, fn('return globals()["os"]')]],
  'SB-38 locals': [[JA, null, fn('return locals()')]],
  'SB-39 vars no argument': [[JA, null, fn('return vars()')]],
  'SB-40 __builtins__': [[JA, null, fn('return __builtins__')]],
  'SB-41 eval alias': [[JA, null, fn('e = eval', 'return e("1")')]],
  'SB-42 builtins module': [[JA, null, 'import builtins\n\n' + fn('return builtins.exec("1")')]],
  'SB-43 breakpoint': [[JA, null, fn('breakpoint()')]],
  'SB-44 urllib.request urlopen': [[JA, null, 'import urllib.request\n\n' + fn('return urllib.request.urlopen("http://127.0.0.1:9/")')]],
  'SB-45 from-import of a re-exported module under an alias': [[JA, null, 'from branches import subprocess as pp\n\n' + fn('return pp.run(["git", "push", "origin", b])')]],
  'SB-46 http.client': [[JA, null, 'import http.client\n\n' + fn('return http.client.HTTPConnection("127.0.0.1")')]],
  'SB-47 socket': [[JA, null, 'import socket\n\n' + fn('return socket.create_connection(("127.0.0.1", 9))')]],
  'SB-48 ctypes': [[JA, null, 'import ctypes\n\n' + fn('return ctypes.CDLL(None).system(b"x")')]],
  'SB-49 os.popen': [[JA, null, fn('return os.popen("git push origin " + b)')]],
  'SB-50 os.posix_spawnp': [[JA, null, fn('return os.posix_spawnp("git", ["git", "push"], {})')]],
  'SB-51 os.startfile': [[JA, null, fn('return os.startfile("x")')]],
  'SB-52 os.forkpty': [[JA, null, fn('return os.forkpty()')]],
  'SB-53 pty.spawn': [[JA, null, 'import pty\n\n' + fn('return pty.spawn(["git", "push"])')]],
  'SB-54 asyncio subprocess': [[JA, null, 'import asyncio\n\n' + fn('return asyncio.create_subprocess_exec("git", "push")')]],
  'SB-55 subprocess shell True with variable': [[JA, null, fn('return subprocess.run("git push origin " + b, shell=True)')]],
  'SB-56 import star from os': [[JA, null, 'from os import *']],
  'SB-57 rebound import name': [[JA, null, 'import json as os']],
  'SB-58 import subprocess as os only (alias swap)': [[HU, null, 'import subprocess as zz\n\ndef _verify_sec(b):\n    return zz.run(["git", "push", "origin", b])']],
  'SB-59 sys._getframe': [[JA, null, 'import sys\n\n' + fn('return sys._getframe().f_globals')]],
  'SB-61 import branches as b then b.subprocess': [[JA, null, 'import branches as bb\n\n' + fn('return bb.subprocess.run(["git", "push", "origin", b])')]],
  'SB-62 re-exported module bound to a name': [[JA, null, fn('p = branches.subprocess', 'return p.run(["git", "push", "origin", b])')]],
  'SB-63 branches.os.system': [[JA, null, fn('return branches.os.system("git push origin " + b)')]],
  'SB-64 hub.http.client': [[CO, null, fn('return hub.http.client.HTTPConnection("127.0.0.1")')]],
  'SB-65 urllib.request in hub': [[HU, null, fn('return urllib.request.urlopen("http://127.0.0.1:9/")')]],
  'SB-60 module-level code runs at import': [[JA, null, 'os.system("git push origin x")']],
}

const VS7B = {
  'SD-01 getattr on a re-exporting pure module reaches subprocess.run': [[JA, null, fn('return getattr(branches, "subprocess").run(["git", "push", "origin", b])')]],
  'SD-02 vars on a re-exporting pure module reaches subprocess.run': [[JA, null, fn('return vars(branches)["subprocess"].run(["git", "push", "origin", b])')]],
  'SD-03 getattr on shutil reaches os.system': [[JA, null, fn('return getattr(shutil, "os").system("git push origin " + b)')]],
  'SD-04 getattr with a variable name on a pure module': [[JA, null, fn('return getattr(branches, slug).run(["git", "push", "origin", b])')]],
  'SD-05 object.__getattribute__ on a pure module': [[JA, null, fn('return object.__getattribute__(branches, "subprocess").run(["git", "push", "origin", b])')]],
  'SD-06 getattr on a pure module reaches os.popen': [[JA, null, fn('return getattr(branches, "os").popen("git push origin " + b)')]],
  'SD-07 getattr on hub reaches the http package': [[CO, null, fn('return getattr(hub, "http").client.HTTPConnection("127.0.0.1")')]],
}

const SEEDS = {
  'SC-04 sys.modules lookup': [[JA, null, 'import sys\n\n' + fn('return sys.modules["subprocess"].run(["git", "push", "origin", b])')]],
  'SC-05 subclasses walk': [[JA, null, fn('return ().__class__.__base__.__subclasses__()')]],
  'SC-06 hub re-exported server class': [[CO, null, fn('return hub.ThreadingHTTPServer(("127.0.0.1", 0), hub.BaseHTTPRequestHandler)')]],
  'SC-07 __loader__ globals walk': [[JA, null, fn('return __loader__.load_module.__globals__')]],
  'SC-09 print.__self__ reaches the builtins module': [[JA, null, fn('return print.__self__.__import__("os").system("git push origin " + b)')]],
  'SC-08 star import of branches then plain subprocess': [[JA, null, 'from branches import *\n\n' + fn('return subprocess.run(["git", "push", "origin", b])')]],
}

const results = {}
function runGroup(group) {
  const missed = []
  for (const [label, edits] of Object.entries(group)) {
    const found = scan(label, mutate(edits))
    results[label] = found
    if (found.length === 0) missed.push(label)
  }
  return missed
}

test('verify security: TC-security-1 VS-4 a non-constant or opaque form outside a wrapper body changes a pin', () => {
  const missed = runGroup(VS4)
  assert.deepEqual(missed, [], `forms that leave every pin equal: ${missed.join(' | ')}`)
})

test('verify security: TC-security-2 VS-7 a process, network or dynamic-code form changes a pin', () => {
  const missed = runGroup(VS7)
  assert.deepEqual(missed, [], `forms that leave every pin equal: ${missed.join(' | ')}`)
})

test('verify security: TC-security-6 VS-7 a getattr or vars lookup of a watched module through a pure module changes a pin', () => {
  const missed = runGroup(VS7B)
  assert.deepEqual(missed, [], `forms that leave every pin equal: ${missed.join(' | ')}`)
})

test('verify security: TC-security-3 VS-7 attribute walks that the scope names as seeds are recorded', () => {
  const open = runGroup(SEEDS)
  if (LOG) appendFileSync(LOG, `SEEDS-OPEN ${JSON.stringify(open)}\n`)
  assert.ok(true)
})

test('verify security: TC-security-4 the scan has no side effect: a mutant that would write a marker never runs', () => {
  const dir = r.dir('marker')
  const marker = join(dir, 'MARKER')
  const found = scan('marker', mutate([[JA, null, `import os\nos.system("touch ${marker}")\nopen(${JSON.stringify(marker)}, "w").write("x")`]]))
  assert.ok(found.length > 0)
  assert.equal(existsSync(marker), false)
})

const { moduleLoader } = await import(join(REPO, 'skills/sdlc/test/testkit/module-loader.mjs'))

test('verify security: TC-security-7 VS-7 the getattr form really pushes a verify branch to a bare remote while every pin is equal', () => {
  const V = 'sdlc/S-9-v1-security-0'
  const ml = moduleLoader({ runner: r })
  const { remote, repo } = ml.bareRemote({ branches: [V] })
  const dir = mutate([[JA, null, fn('return getattr(branches, "subprocess").run(["git", "-C", repo, "push", "origin", b], capture_output=True, text=True)')]])
  const found = scan('behavior', dir)
  const t = ml.call('janitor.py', '_verify_sec', [repo, V, 's'], { root: join(dir, 'skills/sdlc'), remote })
  if (LOG) appendFileSync(LOG, `behavior pins changed: ${JSON.stringify(found)} pushed=${t.pushed(V)} refsAdded=${JSON.stringify(t.refsAdded)}\n${t.text()}\n`)
  assert.equal(t.pushed(V), true, 'the mutant did not push; the setup is wrong')
  assert.ok(found.length > 0, 'a verify branch reached the remote and the guard pins stayed equal')
})

test('verify security: TC-security-5 the clean tree equals every pin', () => {
  assert.deepEqual(scan('clean', copyTree()), [])
})
