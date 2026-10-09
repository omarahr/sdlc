import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const REPO = process.env.VERIFY_REPO
const PY = process.env.VERIFY_PY || 'python3'
const LOG = process.env.VERIFY_LOG
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const GUARD = join(REPO, 'skills/sdlc/test/push_guard.py')
const GUARD_TEST = join(REPO, 'skills/sdlc/test/push-guard.test.mjs')
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const r = cliRunner()

function pins() {
  const src = readFileSync(GUARD_TEST, 'utf8')
  const files = src.slice(src.indexOf('const FILES = ['), src.indexOf('\n]\n', src.indexOf('const FILES = [')) + 2)
  const p = src.slice(src.indexOf('const PINS = {'), src.indexOf('\n}\n', src.indexOf('const PINS = {')) + 2)
  return new Function(`${files}\n${p}\nreturn { FILES, PINS }`)()
}
const { FILES, PINS } = pins()
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function breaches(out) {
  const found = []
  if (!same(out.files.filter(f => /\.(py|js)$/.test(f)), FILES)) found.push('files')
  for (const [key, pin] of Object.entries(PINS)) if (!same(out[key], pin)) found.push(key)
  return found
}
function copyTree() {
  const dir = r.dir('tree')
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(REPO, base), join(dir, base), { recursive: true, filter: s => !SKIPPED.has(basename(s)) })
  }
  return dir
}
function run(id, edits) {
  const dir = copyTree()
  for (const [file, code] of edits) {
    const p = join(dir, file)
    writeFileSync(p, `${readFileSync(p, 'utf8')}\n\n${code}\n`)
  }
  const t = r.exec(PY, [GUARD, dir], { watch: [dir] })
  assert.equal(t.treeUnchanged, true, `${id}: the scan changed the tree`)
  assert.equal(t.status, 0, `${id}: guard exit ${t.status} ${t.stderr}`)
  const out = JSON.parse(t.stdout)
  const found = breaches(out)
  if (LOG) appendFileSync(LOG, `${JSON.stringify({ id, py: PY, breaches: found, opaque: out.opaque.length, dynamic: out.dynamic.length })}\n`)
  return found
}

const JA = 'skills/sdlc/janitor.py'
const CO = 'skills/sdlc/tracker/collect.py'
const HU = 'skills/sdlc/tracker/hub.py'
const LP = 'hooks/live-poke.py'
const RE = 'skills/sdlc/tracker/reports.py'

const A = [
  ['alias-local-import-sp', 'import alias bound in a function body', [[RE, 'def _v():\n    import subprocess as sp\n    return sp.run(["git", "push", "origin", "x"])']]],
  ['alias-from-import-run', 'from-import alias', [[RE, 'from subprocess import run as _r\ndef _v():\n    return _r(["git", "push", "origin", "x"])']]],
  ['alias-os-system', 'import os as alias', [[RE, 'import os as _o\ndef _v():\n    return _o.system("git push origin x")']]],
  ['alias-os-system-late', 'alias bound after use', [[RE, 'def _v():\n    return _q.system("git push")\nimport os as _q']]],
  ['alias-from-os-system', 'from os import system', [[RE, 'from os import system as _s\ndef _v():\n    return _s("git push")']]],
  ['alias-from-os-star', 'star import of os', [[RE, 'from os import *\ndef _v():\n    return system("git push")']]],
  ['alias-from-subprocess-star', 'star import of subprocess', [[RE, 'from subprocess import *\ndef _v():\n    return run(["git","push"])']]],
  ['alias-os-popen-fork', 'os.popen and os.execvp', [[LP, 'import os\ndef _v():\n    os.execvp("git", ["git", "push"])']]],
  ['alias-os-spawn', 'os.spawnlp', [[RE, 'def _v():\n    return os.spawnlp(os.P_WAIT, "git", "git", "push")']]],
  ['alias-os-posix-spawn', 'os.posix_spawnp', [[RE, 'def _v():\n    return os.posix_spawnp("git", ["git","push"], {})']]],
  ['alias-os-forkpty', 'os.forkpty', [[RE, 'def _v():\n    return os.forkpty()']]],
  ['alias-pty-spawn', 'pty.spawn', [[RE, 'import pty\ndef _v():\n    return pty.spawn(["git","push"])']]],
  ['alias-asyncio-shell', 'asyncio subprocess', [[RE, 'import asyncio\nasync def _v():\n    return await asyncio.create_subprocess_shell("git push")']]],
  ['alias-multiprocessing', 'multiprocessing.Process', [[RE, 'import multiprocessing\ndef _v():\n    return multiprocessing.Process(target=print).start()']]],
  ['alias-ctypes-system', 'ctypes libc system', [[RE, 'import ctypes\ndef _v():\n    return ctypes.CDLL(None).system(b"git push")']]],
  ['value-rebind', 'module rebind', [[RE, 'import subprocess\n_x = subprocess\n']]],
  ['value-func-rebind', 'function rebind', [[RE, 'import subprocess\n_x = subprocess.run\n']]],
  ['value-default-param', 'default parameter', [[RE, 'import subprocess\ndef _v(f=subprocess.run):\n    return f(["git","push"])']]],
  ['value-walrus', 'walrus', [[RE, 'import subprocess\nif (_w := subprocess.Popen):\n    pass']]],
  ['value-list-element', 'list element', [[RE, 'import subprocess\n_l = [subprocess.run]\n']]],
  ['value-base-class', 'base class', [[RE, 'import subprocess\nclass _C(subprocess.Popen):\n    pass']]],
  ['value-class-attr', 'class attribute', [[RE, 'import subprocess\nclass _C:\n    f = subprocess.run']]],
  ['value-decorator', 'decorator', [[RE, 'import os\n@os.system\ndef _d():\n    pass']]],
  ['value-map', 'map over os.system', [[RE, 'import os\nlist(map(os.system, ["git push"]))']]],
  ['value-lambda-arg', 'lambda taking module', [[RE, 'import subprocess\n(lambda m: m.run(["git","push"]))(subprocess)']]],
  ['value-os-bare', 'bare os as value', [[RE, 'import os\n_o = os\n']]],
  ['value-os-environ-ok-then-popen', 'ternary', [[RE, 'import os, subprocess\n_f = (os if False else subprocess)\n']]],
  ['chain-shutil-os', 'shutil.os.system', [[RE, 'import shutil\ndef _v():\n    shutil.os.system("git push")']]],
  ['chain-tempfile-os', 'tempfile.os.system', [[RE, 'import tempfile\ndef _v():\n    tempfile.os.system("git push")']]],
  ['chain-glob-os', 'glob.os.system', [[RE, 'import glob\ndef _v():\n    glob.os.system("git push")']]],
  ['chain-mimetypes-os', 'mimetypes.os.system', [[RE, 'import mimetypes\ndef _v():\n    mimetypes.os.system("git push")']]],
  ['chain-fnmatch-os', 'fnmatch.os', [[RE, 'import fnmatch\ndef _v():\n    fnmatch.os.system("git push")']]],
  ['chain-posixpath-os', 'posixpath.os', [[RE, 'import posixpath\ndef _v():\n    posixpath.os.system("git push")']]],
  ['chain-alias-shutil', 'import shutil as sh', [[RE, 'import shutil as sh\ndef _v():\n    sh.os.system("git push")']]],
  ['chain-from-shutil-os', 'from shutil import os', [[RE, 'from shutil import os as _o\ndef _v():\n    _o.system("git push")']]],
  ['chain-branches-subprocess', 'branches.subprocess.run', [[RE, 'import branches\ndef _v():\n    branches.subprocess.run(["git","push"])']]],
  ['chain-branches-os', 'branches.os.system', [[RE, 'import branches\ndef _v():\n    branches.os.system("git push")']]],
  ['chain-hub-os', 'hub.os.system', [[RE, 'import hub\ndef _v():\n    hub.os.system("git push")']]],
  ['chain-workflow-subprocess', 'workflow.subprocess', [[RE, 'import workflow\ndef _v():\n    workflow.subprocess.run(["git","push"])']]],
  ['chain-sys-modules', 'sys.modules (S3)', [[RE, 'import sys\ndef _v():\n    sys.modules["subprocess"].run(["git","push"])']]],
  ['chain-param-shutil', 'pure module passed as parameter', [[RE, 'import shutil\ndef _v(m):\n    return m.os.system("git push")\n_v(shutil)']]],
  ['chain-rebind-shutil', 'pure module rebound to a local', [[RE, 'import shutil\ndef _v():\n    m = shutil\n    return m.os.system("git push")']]],
  ['chain-getattr-rebind', 'getattr on a rebound pure module', [[RE, 'import shutil\ndef _v():\n    m = shutil\n    return getattr(m, "os").system("git push")']]],
  ['native-posix', 'import posix', [[RE, 'import posix\ndef _v():\n    posix.system("git push")']]],
  ['native-nt', 'import nt', [[RE, 'import nt\n']]],
  ['native-posixsubprocess', '_posixsubprocess', [[RE, 'import _posixsubprocess\ndef _v():\n    _posixsubprocess.fork_exec()']]],
  ['native-from-posixsubprocess', 'from _posixsubprocess import', [[RE, 'from _posixsubprocess import fork_exec\n']]],
  ['native-socket', '_socket', [[RE, 'import _socket\ndef _v():\n    return _socket.socket()']]],
  ['native-ssl', '_ssl', [[RE, 'import _ssl\n']]],
  ['native-winapi', '_winapi', [[RE, 'import _winapi\ndef _v():\n    _winapi.CreateProcess()']]],
  ['native-runpy', 'runpy', [[RE, 'import runpy\n']]],
  ['native-code', 'code', [[RE, 'import code\n']]],
  ['native-codeop', 'codeop', [[RE, 'from codeop import compile_command\n']]],
  ['native-underscore-import', 'any underscore module', [[RE, 'import _posixshmem\n']]],
  ['network-socket-call', 'socket.create_connection', [[RE, 'import socket\ndef _v():\n    return socket.create_connection(("example.com", 80))']]],
  ['network-from-socket', 'from socket import socket', [[RE, 'from socket import socket as _S\ndef _v():\n    return _S()']]],
  ['network-collect-urlopen', 'new urlopen in collect.py', [[CO, 'def _v():\n    return urllib.request.urlopen("http://example.com/x")']]],
  ['network-from-urllib-request', 'from urllib import request', [[CO, 'from urllib import request as _rq\ndef _v():\n    return _rq.urlopen("http://example.com/x")']]],
  ['network-http-client', 'http.client alias', [[RE, 'import http.client as _h\ndef _v():\n    return _h.HTTPSConnection("example.com").request("POST", "/")']]],
  ['network-urllib-parse-only', 'urllib.request reached through urllib.parse import', [[HU, 'def _v():\n    return urllib.request.urlopen("http://example.com/x")']]],
  ['network-ssl', 'ssl context wrap', [[RE, 'import ssl\ndef _v():\n    return ssl.create_default_context()']]],
  ['network-webbrowser', 'webbrowser.open', [[RE, 'import webbrowser\ndef _v():\n    webbrowser.open("http://x")']]],
  ['network-smtplib', 'smtplib', [[RE, 'import smtplib\ndef _v():\n    smtplib.SMTP("x").sendmail("a","b","c")']]],
  ['network-hub-http-server', 'http.server alias value', [[HU, 'from http import server as _sv\n_s = _sv.HTTPServer\n']]],
  ['dyn-eval', 'eval', [[RE, 'def _v():\n    return eval("__import__(\'os\')")']]],
  ['dyn-exec', 'exec', [[RE, 'def _v():\n    exec("import os")']]],
  ['dyn-compile', 'compile', [[RE, 'def _v():\n    return compile("1", "x", "eval")']]],
  ['dyn-dunder-import', '__import__', [[RE, 'def _v():\n    return __import__("subprocess")']]],
  ['dyn-importlib', 'importlib.import_module', [[RE, 'import importlib\ndef _v():\n    return importlib.import_module("subprocess")']]],
  ['dyn-importlib-from', 'from importlib import import_module', [[RE, 'from importlib import import_module as _im\ndef _v():\n    return _im("subprocess")']]],
  ['dyn-globals', 'globals()', [[RE, 'def _v():\n    return globals()["x"]']]],
  ['dyn-locals', 'locals()', [[RE, 'def _v():\n    return locals()']]],
  ['dyn-vars-noarg', 'vars()', [[RE, 'def _v():\n    return vars()']]],
  ['dyn-vars-arg-module', 'vars(module)', [[RE, 'import os\ndef _v():\n    return vars(os)["system"]("x")']]],
  ['dyn-getattr-os', 'getattr(os, ...)', [[RE, 'import os\ndef _v():\n    return getattr(os, "sys" + "tem")("x")']]],
  ['dyn-getattr-alias', 'getattr bound to another name', [[RE, 'import os\ndef _v():\n    g = getattr\n    return g(os, "system")("x")']]],
  ['dyn-getattr-map', 'getattr passed as a value', [[RE, 'import shutil\ndef _v():\n    return list(map(getattr, [shutil], ["os"]))']]],
  ['dyn-builtins', '__builtins__', [[RE, 'def _v():\n    return __builtins__["__import__"]("os")']]],
  ['dyn-builtins-import', 'import builtins', [[RE, 'import builtins\ndef _v():\n    return builtins.__dict__["exec"]]']]],
  ['dyn-dict-os', 'os.__dict__', [[RE, 'import os\ndef _v():\n    return os.__dict__["system"]("x")']]],
  ['dyn-private-os', 'os._exit private', [[RE, 'import os\ndef _v():\n    os._exit(0)']]],
  ['dyn-private-json', 'json._default_encoder', [[RE, 'import json\n_e = json._default_encoder\n']]],
  ['dyn-private-alias-from', 'from json import _default_encoder', [[RE, 'from json import _default_encoder\n']]],
  ['dyn-getattribute', 'object.__getattribute__', [[RE, 'import os\ndef _v():\n    return object.__getattribute__(os, "system")("x")']]],
  ['dyn-globals-subscript-call', 'globals()["f"]()', [[RE, 'def _v():\n    return globals()["os"].system("x")']]],
  ['dyn-operator-attrgetter', 'operator.attrgetter', [[RE, 'import operator, os\ndef _v():\n    return operator.attrgetter("system")(os)("x")']]],
  ['dyn-functools-partial', 'functools.partial', [[RE, 'import functools, os\n_p = functools.partial(os.system, "git push")\n']]],
  ['dyn-globals-fn', 'function __globals__ walk (S3)', [[RE, 'def _v():\n    return (lambda: 0).__globals__["__builtins__"]["__import__"]("subprocess")']]],
  ['dyn-loader', '__loader__ (S3)', [[RE, 'def _v():\n    return __loader__.load_module("subprocess")']]],
  ['dyn-type-subclasses', 'subclass walk (S3)', [[RE, 'def _v():\n    return ().__class__.__base__.__subclasses__()']]],
  ['dyn-help', 'help() builtin pager', [[RE, 'def _v():\n    help("modules")']]],
  ['dyn-breakpoint', 'breakpoint()', [[RE, 'def _v():\n    breakpoint()']]],
  ['dyn-pipes-import', 'pipes import', [[RE, 'import pipes\n']]],
  ['dyn-pydoc-import', 'pydoc import', [[RE, 'import pydoc\n']]],
  ['dyn-rebound-two-imports', 'one name two modules', [[RE, 'import json as _z\nimport subprocess as _z\n']]],
  ['dyn-rebound-os-shutil', 'os rebound to shutil.os', [[RE, 'import os\nfrom shutil import os\n']]],
  ['dyn-star-shutil', 'from shutil import *', [[RE, 'from shutil import *\ndef _v():\n    os.system("git push")']]],
  ['dyn-star-tempfile', 'from tempfile import *', [[RE, 'from tempfile import *\ndef _v():\n    _os.system("git push")']]],
  ['dyn-from-branches-star', 'from branches import *', [[RE, 'from branches import *\ndef _v():\n    subprocess.run(["git","push"])']]],
  ['dyn-from-branches-import-subprocess', 'from branches import subprocess', [[RE, 'from branches import subprocess as _sp\ndef _v():\n    _sp.run(["git","push"])']]],
  ['dyn-from-branches-import-os', 'from branches import os', [[RE, 'from branches import os as _o\ndef _v():\n    _o.system("git push")']]],
  ['dyn-from-hub-os', 'from hub import os', [[RE, 'from hub import os as _o\ndef _v():\n    _o.system("git push")']]],
  ['dyn-from-sys-modules', 'from sys import modules (S3)', [[RE, 'from sys import modules as _m\ndef _v():\n    _m["subprocess"].run(["git","push"])']]],
  ['dyn-from-tempfile-private-os', 'from tempfile import _os', [[RE, 'from tempfile import _os\ndef _v():\n    _os.system("git push")']]],
  ['dyn-from-tempfile-private-os-alias', 'from tempfile import _os as o', [[RE, 'from tempfile import _os as _o\ndef _v():\n    _o.system("git push")']]],
  ['dyn-from-argparse-private-os', 'from argparse import _os', [[RE, 'from argparse import _os\ndef _v():\n    _os.popen("git push")']]],
  ['dyn-from-shutil-private', 'from shutil import _ntuple_diskusage', [[RE, 'from shutil import _ntuple_diskusage\n']]],
  ['dyn-import-private-submodule', 'import tempfile._os-like private via import-as', [[RE, 'import json.decoder as _jd\ndef _v():\n    return _jd.re\n']]],
  ['dyn-from-glob-os', 'from glob import os', [[RE, 'from glob import os as _g\ndef _v():\n    _g.system("git push")']]],
  ['dyn-sys-exit-ok', 'control: harmless sys.exit', [[RE, 'import sys\ndef _v():\n    sys.exit(0)']], 'control'],
]

test('verify security: clean tree equals the pins (control)', () => {
  assert.deepEqual(run('clean', []), [])
})

for (const [id, charter, edits, kind] of A) {
  test(`verify security: VS-7 ${id} ${charter}`, () => {
    const found = run(id, edits)
    if (kind === 'control') assert.deepEqual(found, [], `${id}: control must keep every pin`)
    else assert.ok(found.length > 0, `${id}: guard output equals every pin for: ${edits.map(e => e[1]).join(' // ').slice(0, 200)}`)
  })
}
