import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = process.env.VERIFY_REPO || join(HERE, '..', '..', '..', '..', '..', '..', '..')
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const { load } = await import(join(REPO, 'skills/sdlc/test/testkit/attack-corpus.mjs'))
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
  const t = r.exec('python3', [GUARD, dir], { watch: [] })
  assert.equal(t.status, 0, `${label}: guard exit ${t.status} ${t.stderr}`)
  const out = JSON.parse(t.stdout)
  const found = breaches(out)
  if (LOG) appendFileSync(LOG, `### ${label}\nbreaches: ${JSON.stringify(found)}\nopaque: ${JSON.stringify(out.opaque)}\npushes: ${out.pushes.length} forgeViolations: ${out.forgeViolations.length}\n\n`)
  return found
}

const fn = (...lines) => `def _verify_sec(repo, b, slug):\n${lines.map(l => `    ${l}`).join('\n')}`

const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const CO = 'skills/sdlc/tracker/collect.py'
const HU = 'skills/sdlc/tracker/hub.py'
const LOOP = 'skills/sdlc/sdlc-loop.js'

const BYPASS = {
  'na-run-repo-list-push': [
    [NA, 'def run(repo, *cmd):\n', '    if isinstance(repo, list):\n        return run(".", *repo)'],
    [NA, null, fn('return run(["git", "push", "origin", b], "git", "show")')],
  ],
  'na-run-repo-list-pr-create': [
    [NA, 'def run(repo, *cmd):\n', '    if isinstance(repo, list):\n        return run(".", *repo)'],
    [NA, null, fn('return run(["gh", "pr", "create", "--fill", "--head", b], "git", "show")')],
  ],
  'im-git_lines-repo-list-push': [
    [IM, 'def git_lines(args, repo):\n', '    if isinstance(repo, list):\n        return run(repo, ".")'],
    [IM, null, fn('return git_lines(["diff"], ["git", "push", "origin", b])')],
  ],
  'im-run-cwd-list-push': [
    [IM, 'def run(args, cwd):\n', '    if isinstance(cwd, list):\n        return run(cwd, ".")'],
    [IM, null, fn('return run(["git", "diff"], ["git", "push", "origin", b])')],
  ],
  'sw-git-repo-starred-push': [
    [SW, 'def git(repo, *args, check=True):\n', '    if check is None:\n        return git(".", *repo)'],
    [SW, null, fn('return git(["push", "origin", b], "show", check=None)')],
  ],
  'sw-git-repo-verb-push': [
    [SW, 'def git(repo, *args, check=True):\n', '    if check is None:\n        return git(".", repo)'],
    [SW, null, fn('return git("push", "show", check=None)')],
  ],
  'sr-git-repo-starred-push': [
    [SR, 'def git(repo, *args):\n', '    if isinstance(repo, list):\n        return git(".", *repo)'],
    [SR, null, fn('return git(["push", "origin", b], "ls-tree")')],
  ],
}

test('verify security: TC-security-1 a push or pr create carried in a non-verb wrapper parameter breaks a pin', () => {
  const missed = []
  for (const [label, edits] of Object.entries(BYPASS)) {
    if (scan(label, mutate(edits)).length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `mutants that leave every pin equal: ${missed.join(', ')}`)
})

function loadModule(tree, file, attr) {
  return `import importlib.util, sys; sys.path.insert(0, ${JSON.stringify(dirname(join(tree, file)))}); s = importlib.util.spec_from_file_location("m", ${JSON.stringify(join(tree, file))}); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); m.${attr}`
}

function remoteWithClone() {
  const bare = r.dir('remote.git')
  r.exec('git', ['init', '-q', '--bare', bare], { watch: [] })
  const repo = r.gitRepo({ branches: ['sdlc/S-001-v0-security-0'] })
  r.exec('git', ['-C', repo, 'remote', 'add', 'origin', bare], { watch: [] })
  return { bare, repo }
}

function remoteRefs(bare) {
  return r.exec('git', ['-C', bare, 'for-each-ref', '--format=%(refname)'], { watch: [] }).stdout.trim()
}

test('verify security: TC-security-2 the next-action.py mutant pushes a verify branch while the guard reports no breach', () => {
  const tree = mutate(BYPASS['na-run-repo-list-push'])
  const found = scan('behavior na-run-repo-list-push', tree)
  const { bare, repo } = remoteWithClone()
  const t = r.exec('python3', ['-c', `${loadModule(tree, NA, '_verify_sec(None, "sdlc/S-001-v0-security-0", None)')}`], { cwd: repo, watch: [] })
  const refs = remoteRefs(bare)
  if (LOG) appendFileSync(LOG, `### behavior next-action.py\n${t.text()}\nremote refs: ${refs}\n\n`)
  assert.ok(found.length > 0 || !refs.includes('sdlc/S-001-v0-security-0'), `guard breaches ${JSON.stringify(found)}; remote refs ${refs}`)
})

test('verify security: TC-security-3 the state-write.py mutant pushes a verify branch while the guard reports no breach', () => {
  const tree = mutate(BYPASS['sw-git-repo-starred-push'])
  const found = scan('behavior sw-git-repo-starred-push', tree)
  const { bare, repo } = remoteWithClone()
  const t = r.exec('python3', ['-c', `${loadModule(tree, SW, `_verify_sec(${JSON.stringify(repo)}, "sdlc/S-001-v0-security-0", None)`)}`], { cwd: repo, watch: [] })
  const refs = remoteRefs(bare)
  if (LOG) appendFileSync(LOG, `### behavior state-write.py\n${t.text()}\nremote refs: ${refs}\n\n`)
  assert.ok(found.length > 0 || !refs.includes('sdlc/S-001-v0-security-0'), `guard breaches ${JSON.stringify(found)}; remote refs ${refs}`)
})

test('verify security: TC-security-4 os.startfile in a scanned script breaks a pin', () => {
  const found = scan('os.startfile', mutate([[JA, null, fn('os.startfile("push.bat")')]]))
  assert.ok(found.length > 0, 'os.startfile left every pin equal')
})

const HELD = {
  'VS-2 starred tuple verb': [SW, fn('git(repo, *("pu" "sh",), "origin", b)')],
  'VS-2 f-string verb': [SW, fn('git(repo, f"push", "origin", b)')],
  'VS-2 bytes decode verb': [SW, fn('git(repo, b"push".decode(), "origin", b)')],
  'VS-2 percent format verb': [SW, fn('git(repo, "%s" % "push", "origin", b)')],
  'VS-2 join verb': [SW, fn('git(repo, "".join(["pu", "sh"]), "origin", b)')],
  'VS-2 alias upper case': [SW, fn('git(repo, "-c", "Alias.p=push", "p", "origin", b)')],
  'VS-2 one string verb and refspec': [SW, fn('git(repo, "push origin " + b)')],
  'VS-2 tab inside option': [SW, fn('git(repo, "-C\\t.", "push")')],
  'VS-2 no-break space inside option': [SW, fn('git(repo, "-C\\u00a0.", "push")')],
  'VS-2 --git-dir= before verb': [SW, fn('git(repo, "--git-dir=.git", "push")')],
  'VS-2 send-pack': [SW, fn('git(repo, "send-pack", "origin", b)')],
  'VS-2 subtree push': [SW, fn('git(repo, "subtree", "push", "--prefix=x", "origin", b)')],
  'VS-2 keyword repo and starred list': [SW, fn('git(repo=repo, *["push", "origin", b])')],
  'VS-2 dict splat': [SW, fn('git(**{"repo": repo}, check=False)')],
  'VS-2 direct tuple argv': [JA, fn('subprocess.run(("git", "push", "origin", b))')],
  'VS-2 direct args keyword': [JA, fn('subprocess.run(args=["git", "push", "origin", b])')],
  'VS-2 check_output': [JA, fn('subprocess.check_output(["git", "push", "origin", b])')],
  'VS-2 absolute git path': [JA, fn('subprocess.run(["/usr/bin/git", "push", "origin", b])')],
  'VS-2 env launcher': [JA, fn('subprocess.run(["env", "git", "push", "origin", b])')],
  'VS-2 sh -c': [JA, fn('subprocess.run(["sh", "-c", "git push origin x"])')],
  'VS-2 xargs stdin': [JA, fn('subprocess.run(["xargs", "git"], input="push origin x")')],
  'VS-3 -Xpost attached': [NA, fn('run(repo, "gh", "api", "-Xpost", "repos/o/r/pulls")')],
  'VS-3 --method=PATCH': [NA, fn('run(repo, "gh", "api", "--method=PATCH", "repos/o/r/issues/1")')],
  'VS-3 --raw-field=': [NA, fn('run(repo, "gh", "api", "--raw-field=title=x", "repos/o/r/git/refs")')],
  'VS-3 -F attached': [NA, fn('run(repo, "gh", "api", "-Fref=refs/heads/x", "repos/o/r/git/refs")')],
  'VS-3 --input after path': [NA, fn('run(repo, "gh", "api", "repos/o/r/git/refs", "--input", "x.json")')],
  'VS-3 pr Create upper case': [NA, fn('run(repo, "gh", "pr", "Create")')],
  'VS-3 pr new alias': [NA, fn('run(repo, "gh", "pr", "new")')],
  'VS-3 pr merge': [NA, fn('run(repo, "gh", "pr", "merge", "1")')],
  'VS-3 gh alias set': [NA, fn('run(repo, "gh", "alias", "set", "pc", "pr create")')],
  'VS-3 gh user alias': [NA, fn('run(repo, "gh", "pc")')],
  'VS-3 glab mr create': [NA, fn('run(repo, "glab", "mr", "create")')],
  'VS-3 GraphQL upper case': [NA, fn('run(repo, "gh", "api", "GraphQL")')],
  'VS-3 method override header': [NA, fn('run(repo, "gh", "api", "-H", "X-HTTP-Method-Override: POST", "repos/o/r/git/refs")')],
  'VS-3 -X after path': [NA, fn('run(repo, "gh", "api", "repos/o/r/git/refs", "-X", "POST")')],
  'VS-3 percent-encoded path': [NA, fn('run(repo, "gh", "api", "repos/o/r/pul%6Cs")')],
  'VS-3 --hostname before verb': [NA, fn('run(repo, "gh", "--hostname", "h", "pr", "create")')],
  'VS-3 absolute gh path': [NA, fn('run(repo, "/usr/local/bin/gh", "pr", "create")')],
  'VS-3 --repo= before verb': [NA, fn('run(repo, "gh", "--repo=o/r", "pr", "create")')],
  'VS-3 -R attached': [NA, fn('run(repo, "gh", "-Ro/r", "pr", "create")')],
  'VS-3 double dash before path': [NA, fn('run(repo, "gh", "api", "--", "repos/o/r/pulls")')],
  'VS-3 workflow run': [NA, fn('run(repo, "gh", "workflow", "run", "x.yml")')],
  'VS-4 os alias': [SW, fn('import os as o2', 'o2.system("git push")')],
  'VS-4 getoutput alias': [SW, fn('from subprocess import getoutput as g', 'g("git push")')],
  'VS-4 os.execvpe': [SW, fn('os.execvpe("git", ["git", "push"], {})')],
  'VS-4 shutil.os.system': [JA, fn('shutil.os.system("git push origin x")')],
  'VS-4 tempfile._os': [JA, fn('tempfile._os.system("git push origin x")')],
  'VS-4 tempfile.os.system': [JA, fn('tempfile.os.system("git push origin x")')],
  'VS-4 branches.subprocess.run': [JA, fn('branches.subprocess.run(["git", "push", "origin", b])')],
  'VS-4 branches.os.system': [JA, fn('branches.os.system("git push origin x")')],
  'VS-4 globmod.os.system': [IM, fn('globmod.os.system("git push origin x")')],
  'VS-4 glob.os.system': [SR, fn('glob.os.system("git push origin x")')],
  'VS-4 mimetypes.os.system': [HU, fn('mimetypes.os.system("git push origin x")')],
  'VS-4 hub.subprocess.run': [CO, fn('hub.subprocess.run(["git", "push"])')],
  'VS-4 hub.socketserver.TCPServer': [CO, fn('hub.socketserver.TCPServer(("h", 0), None)')],
  'VS-4 socketserver.socket': [HU, fn('socketserver.socket.create_connection(("h", 1))')],
  'VS-4 ThreadingHTTPServer call': [HU, fn('ThreadingHTTPServer(("0.0.0.0", 0), None)')],
  'VS-4 urllib.request.Request POST': [CO, fn('urllib.request.Request("http://x", method="POST")')],
  'VS-4 getattr with built name': [SW, fn('getattr(os, "sys" + "tem")("git push")')],
  'VS-4 operator.attrgetter': [SW, fn('import operator', 'operator.attrgetter("system")(os)("git push")')],
  'VS-4 webbrowser': [SW, fn('import webbrowser', 'webbrowser.open("http://x")')],
  'VS-4 smtplib from import': [SW, fn('from smtplib import SMTP', 'SMTP("h")')],
  'VS-4 urlopen alias': [SW, fn('from urllib.request import urlopen as u', 'u("http://x")')],
  'VS-4 http client from import': [SW, fn('from http import client', 'client.HTTPSConnection("h").request("GET", "/")')],
  'VS-4 platform.os.system': [SW, fn('import platform', 'platform.os.system("x")')],
  'VS-4 os.forkpty': [JA, fn('os.forkpty()')],
  'VS-4 lambda default': [SW, fn('f = lambda p=subprocess.run: p(["git", "push"])', 'f()')],
  'VS-4 decorator': [SW, '@subprocess.call\ndef _verify_sec():\n    pass'],
  'VS-4 metaclass keyword': [SW, 'class _V(metaclass=subprocess.Popen):\n    pass'],
  'VS-4 with Popen': [SW, fn('with subprocess.Popen(["git", "push"]) as p:', '    pass')],
  'VS-4 annotation default': [SW, 'def _verify_sec(x: subprocess.run = None):\n    return x(["git", "push"])'],
  'VS-4 match capture': [SW, fn('match subprocess:', '    case m:', '        m.run(["git", "push"])')],
  'VS-4 second def of wrapper name': [SW, 'def run(repo, *a):\n    return git(repo, *a)\ndef _verify_sec(repo, b):\n    return run(repo, "push", "origin", b)'],
  'VS-4 __builtins__ value': [SW, fn('x = __builtins__')],
  'VS-5 globalThis bracket': [LOOP, "const p = globalThis['pro' + 'cess']"],
  'VS-5 unicode escape name': [LOOP, 'const x = \\u0070rocess'],
  'VS-5 dynamic import escaped': [LOOP, "await im\\u{70}ort('node:child_process')"],
  'VS-5 global double quote': [LOOP, 'const g = "global"'],
  'VS-5 global template': [LOOP, 'const g = `global`'],
  'VS-5 allowed literal reused': [LOOP, "const g = 'global'['constructor']"],
  'VS-5 carriage return line': [LOOP, '//\r process.exit()'],
  'VS-5 line separator': [LOOP, '// x process.exit()'],
}

test('verify security: TC-security-5 each held push, forge, process, network and loop form breaks a pin', () => {
  const missed = []
  for (const [label, [file, code]] of Object.entries(HELD)) {
    if (scan(label, mutate([[file, null, code]])).length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify security: TC-security-6 a corpus value before push in a wrapper call breaks a pin', () => {
  const missed = []
  const values = [...load('flag-like-values', { argv: true }), ...load('injection', { argv: true }), ...load('unicode-whitespace', { argv: true })].slice(0, 40)
  for (const e of values) {
    const lit = JSON.stringify(e.value)
    if (scan(`corpus ${e.id}`, mutate([[SW, null, fn(`git(repo, ${lit}, "push", "origin", b)`)]])).length === 0) missed.push(e.id)
  }
  assert.deepEqual(missed, [])
})

test('verify security: TC-security-7 a new script type, a symlink or a latin-1 source breaks a pin', () => {
  const missed = []
  const kinds = {
    'hooks/x.sh': 'git push origin x\n',
    'skills/sdlc/x.mjs': "import('node:child_process')\n",
    'skills/sdlc/x.cjs': "require('child_process')\n",
    'skills/sdlc/noext': '#!/usr/bin/env python3\nimport os\nos.system("git push")\n',
  }
  for (const [rel, body] of Object.entries(kinds)) {
    const dir = copyTree()
    writeFileSync(join(dir, rel), body)
    if (scan(`file ${rel}`, dir).length === 0) missed.push(rel)
  }
  const latin = copyTree()
  writeFileSync(join(latin, JA), '# -*- coding: latin-1 -*-\n' + readFileSync(join(latin, JA), 'utf8') + '\nos.system("git push")\n')
  if (scan('latin-1 janitor.py', latin).length === 0) missed.push('latin-1')
  for (const target of ['skills/sdlc/tracker', 'skills/sdlc/branches.py']) {
    const dir = copyTree()
    r.exec('ln', ['-s', join(dir, target), join(dir, 'skills/sdlc', `link-${basename(target)}`)], { watch: [] })
    if (scan(`symlink ${target}`, dir).length === 0) missed.push(`symlink ${target}`)
  }
  assert.deepEqual(missed, [])
})

test('verify security: TC-security-8 the unmutated tree equals every pin', () => {
  assert.deepEqual(scan('clean tree', copyTree()), [])
})
