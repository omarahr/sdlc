import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, readFileSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = process.env.VERIFY_REPO || join(HERE, '..', '..', '..', '..', '..', '..', '..')
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const GUARD = join(REPO, 'skills/sdlc/test/push_guard.py')
const GUARD_TEST = join(REPO, 'skills/sdlc/test/push-guard.test.mjs')
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const LOG = process.env.VERIFY_LOG
const r = cliRunner()
let CRASH_OK = false

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

function apply(dir, edit) {
  const path = join(dir, edit.file)
  const before = readFileSync(path, 'utf8')
  if (edit.after !== undefined) {
    assert.ok(before.includes(edit.after), `${edit.file}: anchor missing: ${edit.after}`)
    writeFileSync(path, before.replace(edit.after, `${edit.after}${edit.code}\n`))
  } else if (edit.replace) {
    assert.ok(before.includes(edit.replace[0]), `${edit.file}: text missing: ${edit.replace[0]}`)
    writeFileSync(path, before.replace(edit.replace[0], edit.replace[1]))
  } else {
    writeFileSync(path, `${before}\n\n${edit.code}\n`)
  }
}

function scanTree(label, dir) {
  const t = r.exec('python3', [GUARD, dir], { watch: [] })
  if (t.status !== 0) {
    if (LOG) appendFileSync(LOG, `### ${label}\nGUARD CRASH exit ${t.status}: ${t.stderr.trim().split('\n').slice(-1)[0]}\n\n`)
    if (CRASH_OK) return { out: null, found: ['crash'] }
  }
  assert.equal(t.status, 0, `${label}: guard exit ${t.status} ${t.stderr}`)
  const out = JSON.parse(t.stdout)
  const found = breaches(out)
  if (LOG) appendFileSync(LOG, `### ${label}\nbreaches: ${JSON.stringify(found)}\nopaque: ${JSON.stringify(out.opaque.filter(o => !PINS.opaque.includes(o)))}\nviolations: ${JSON.stringify(out.forgeViolations)}\n\n`)
  return { out, found }
}

function scan(label, edits) {
  const dir = copyTree()
  for (const e of edits) apply(dir, e)
  return scanTree(label, dir)
}

const fn = (...lines) => `def _verify_sec(repo, b, slug, extra, path, verb, method, cmd):\n${lines.map(l => `    ${l}`).join('\n')}`
const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const BR = 'skills/sdlc/branches.py'
const LOOP = 'skills/sdlc/sdlc-loop.js'

const DEF = {
  sw: [SW, 'def git(repo, *args, check=True):\n'],
  sr: [SR, 'def git(repo, *args):\n'],
  na: [NA, 'def run(repo, *cmd):\n'],
  imr: [IM, 'def run(args, cwd):\n'],
  img: [IM, 'def git_lines(args, repo):\n'],
}
const INSERT = {
  sw: ['args = ("push", "-q", "origin", "x")', 'args = ("-c", "remote.origin.push=x") + args', 'args = ("--no-pager",) + args', 'repo = "."', 'args = ("push",) + tuple(args[1:])', 'args = args[:0] + ("send-pack",)'],
  sr: ['args = ("push", "origin", "x")', 'args = ("-c", "remote.origin.push=x") + args', 'repo = "."', 'args = ("--no-pager",) + args'],
  na: ['cmd = ("gh", "pr", "create")', 'cmd = ("gh", "api", "-X", "POST") + cmd', 'cmd = ("gh", "api", "--method=PATCH", *cmd)', 'cmd = ("gh", "api", "-f", "ref=x") + cmd', 'cmd = ("gh", "api", "--input", "-") + cmd', 'cmd = ("git", "push", "origin", "x")', 'repo = "."', 'cmd = ("gh", "api", "graphql") + cmd'],
  imr: ['args = ["git", "push"]', 'args = ["gh", "pr", "create"]', 'args = list(args) + ["push"]', 'cwd = "."'],
  img: ['args = ["push"]', 'repo = "."', 'args = ["-c", "remote.origin.push=x"] + list(args)'],
}

test('verify security VS-1: every inserted statement at the start of a pinned body breaks a pin', () => {
  const missed = []
  for (const [k, lines] of Object.entries(INSERT)) {
    for (const line of lines) {
      const { found } = scan(`VS-1 ${k} insert ${line}`, [{ file: DEF[k][0], after: DEF[k][1], code: `    ${line}` }])
      if (!found.includes('wrapperBodies')) missed.push(`${k}: ${line} -> ${found.join(',') || 'none'}`)
    }
  }
  assert.deepEqual(missed, [])
})

const REPLACE = [
  [SW, '"-C", repo', '"-c", repo'],
  [SW, 'capture_output=True, text=True)\n    if check', 'capture_output=False, text=True)\n    if check'],
  [SW, 'if check and r.returncode != 0:', 'if not check and r.returncode != 0:'],
  [SW, 'return r\n', 'return git(repo, "push")\n'],
  [SR, '["git", "-C", repo, *args]', '["git", "-C", repo, "push", *args]'],
  [SR, 'return r.stdout\n', 'return r.stdout + git(repo, "push")\n'],
  [NA, 'cwd=repo, capture_output=True', 'cwd=repo, shell=False, capture_output=True'],
  [NA, 'timeout=120', 'timeout=1'],
  [NA, 'subprocess.run(cmd,', 'subprocess.run(list(cmd),'],
  [IM, 'return subprocess.run(args, cwd=cwd, capture_output=True, text=True)', 'return subprocess.run(args, cwd=cwd, capture_output=True, text=True, env={})'],
  [IM, '["git"] + args', '["git"] + list(args)'],
]
test('verify security VS-1: a replaced token inside a pinned body breaks wrapperBodies', () => {
  const missed = []
  for (const [file, a, b] of REPLACE) {
    const { found } = scan(`VS-1 replace ${file} ${a}`, [{ file, replace: [a, b] }])
    if (!found.includes('wrapperBodies')) missed.push(`${file}: ${a} -> ${found.join(',') || 'none'}`)
  }
  assert.deepEqual(missed, [])
})

const PUSH_BODY = 'return subprocess.run(["git", "push"])'
const DEFS2 = {
  'identical duplicate def sw': [{ file: SW, code: 'def git(repo, *args, check=True):\n    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)\n    if check and r.returncode != 0:\n        raise Fail(f"git {\' \'.join(args)}: {(r.stderr or r.stdout).strip()}")\n    return r' }],
  'second def with push sr': [{ file: SR, code: `def git(repo, *args):\n    ${PUSH_BODY}` }],
  'nested def in other function sw': [{ file: SW, code: `def _outer():\n    def git(repo, *args):\n        ${PUSH_BODY}\n    return git` }],
  'class method run na': [{ file: NA, code: `class _V:\n    def run(self, *cmd):\n        ${PUSH_BODY}` }],
  'class method git_lines im': [{ file: IM, code: `class _V:\n    def git_lines(self, a, b):\n        ${PUSH_BODY}` }],
  'async def git sw': [{ file: SW, code: `async def git(repo, *args):\n    ${PUSH_BODY}` }],
  'async def run na': [{ file: NA, code: `async def run(repo, *cmd):\n    ${PUSH_BODY}` }],
  'def under if sw': [{ file: SW, code: `if True:\n    def git(repo, *args):\n        ${PUSH_BODY}` }],
  'def under try na': [{ file: NA, code: `try:\n    def run(repo, *cmd):\n        ${PUSH_BODY}\nexcept ImportError:\n    pass` }],
  'decorator on run im': [{ file: IM, replace: ['def run(args, cwd):', '@staticmethod\ndef run(args, cwd):'] }],
  'decorator with call on git sw': [{ file: SW, replace: ['def git(repo, *args, check=True):', '@(lambda f: f)\ndef git(repo, *args, check=True):'] }],
  'changed default sw': [{ file: SW, replace: ['check=True):', 'check=False):'] }],
  'added kwonly param na': [{ file: NA, replace: ['def run(repo, *cmd):', 'def run(repo, *cmd, extra=None):'] }],
  'return annotation sr': [{ file: SR, replace: ['def git(repo, *args):', 'def git(repo, *args) -> str:'] }],
  'parameter annotation im': [{ file: IM, replace: ['def run(args, cwd):', 'def run(args, cwd: str):'] }],
  'unicode confusable name in body sw': [{ file: SW, replace: ['if check and r.returncode', 'if chеck and r.returncode'] }],
  'rebind wrapper name to subprocess.run sw': [{ file: SW, code: 'git = subprocess.run' }],
  'rebind wrapper name to os.system na': [{ file: NA, code: 'run = os.system' }],
  'alias of wrapper then call sw': [{ file: SW, code: fn('g = git', 'g(repo, "push", "origin", b)') }],
  'partial of wrapper sw': [{ file: SW, code: 'import functools\n' + fn('functools.partial(git, repo)("push", "origin", b)') }],
  'wrapper in list na': [{ file: NA, code: fn('[run][0](repo, "git", "push", "origin", b)') }],
  'wrapper via globals sw': [{ file: SW, code: fn('globals()["git"](repo, "push", "origin", b)') }],
  'wrapper default param sr': [{ file: SR, code: 'def _verify_sec(repo, g=git):\n    return g(repo, "push")' }],
  'wrapper as base class attr sw': [{ file: SW, code: 'class _V:\n    g = staticmethod(git)' }],
  'f-string body change sw': [{ file: SW, replace: ['{(r.stderr or r.stdout).strip()}', '{(r.stdout or r.stderr).strip()}'] }],
  'nested f-string same quote body change sw': [{ file: SW, replace: ["f\"git {' '.join(args)}:", "f\"git {\" \".join(args)}:"] }],
  't-string added to body sw': [{ file: SW, replace: ['    return r\n', '    t = t"x{check}"\n    return r\n'] }],
  'f-string format spec change sw': [{ file: SW, replace: ["{' '.join(args)}", "{' '.join(args)!r}"] }],
  'semicolon statement in body im': [{ file: IM, replace: ['def run(args, cwd):\n', 'def run(args, cwd):\n    args = args; '] }],
}
test('verify security VS-2: each changed or extra wrapper definition breaks a pin', () => {
  const missed = []
  for (const [label, edits] of Object.entries(DEFS2)) {
    const { found } = scan(`VS-2 ${label}`, edits)
    if (found.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify security VS-2: an identical duplicate wrapper def adds a second wrapperBodies entry', () => {
  const { out } = scan('VS-2 duplicate', DEFS2['identical duplicate def sw'])
  assert.equal(out.wrapperBodies.length, PINS.wrapperBodies.length + 1)
})

const STARRED = {
  'sw starred repo tuple then show': [{ file: SW, code: fn('return git(*(repo, "push", "origin", b), "show")') }],
  'sw starred repo list then show': [{ file: SW, code: fn('return git(*[repo, "push", "origin", b], "show")') }],
  'sw starred via local then show': [{ file: SW, code: fn('a = [repo, "push", "origin", b]', 'return git(*a, "show")') }],
  'sr starred repo then ls-tree': [{ file: SR, code: fn('return git(*[repo, "push", "origin", b], "ls-tree")') }],
  'na starred dot git push then git show': [{ file: NA, code: fn('return run(*(".", "git", "push", "origin", b), "git", "show")') }],
  'na starred dot gh pr create then gh pr list': [{ file: NA, code: fn('return run(*(".", "gh", "pr", "create"), "gh", "pr", "list")') }],
  'na starred repo only gh api post': [{ file: NA, code: fn('return run(*(".", "gh", "api", "-X", "POST"), "gh", "pr", "list")') }],
  'im starred argv then cwd': [{ file: IM, code: fn('return run(*(["git", "push"], "."))') }],
  'im git_lines starred': [{ file: IM, code: fn('return git_lines(*(["push"], "."))') }],
}
for (const [label, edits] of Object.entries(STARRED)) {
  test(`verify security VS-4: starred first argument, ${label}, breaks a pin`, () => {
    const { found } = scan(`VS-4 ${label}`, edits)
    assert.ok(found.length > 0, `${label} leaves every pin equal`)
  })
}

function bareRemote() {
  const bare = r.dir('remote.git')
  r.exec('git', ['init', '-q', '--bare', bare], { watch: [] })
  const repo = r.gitRepo({ branches: ['sdlc/S-001-v0-security-0', 'show'] })
  r.exec('git', ['-C', repo, 'remote', 'add', 'origin', bare], { watch: [] })
  return { bare, repo }
}
function loadAndCall(tree, file, call) {
  return `import importlib.util, sys; sys.path.insert(0, ${JSON.stringify(dirname(join(tree, file)))}); s = importlib.util.spec_from_file_location("m", ${JSON.stringify(join(tree, file))}); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); ${call}`
}
test('verify security VS-4: the starred-first mutant in state-write.py pushes a verify branch to a remote while the guard reports no breach', () => {
  const dir = copyTree()
  const { bare, repo } = bareRemote()
  apply(dir, { file: SW, code: fn('return git(*(repo, "push", "origin", b), "show")') })
  const { found } = scanTree('VS-4 behavior sw starred', dir)
  const t = r.exec('python3', ['-c', loadAndCall(dir, SW, `m._verify_sec(${JSON.stringify(repo)}, "sdlc/S-001-v0-security-0", None, None, None, None, None, None)`)], { cwd: repo, watch: [] })
  const refs = r.exec('git', ['-C', bare, 'for-each-ref', '--format=%(refname)'], { watch: [] }).stdout.trim()
  if (LOG) appendFileSync(LOG, `### behavior sw starred\nguard breaches ${JSON.stringify(found)}\nremote refs after: ${refs}\ncall: ${t.text()}\n\n`)
  assert.ok(found.length > 0 || !refs.includes('sdlc/S-001-v0-security-0'), `guard breaches ${JSON.stringify(found)}; remote refs: ${refs}`)
})

test('verify security VS-7: a process module bound by import inside a class body and called through self breaks a pin', () => {
  const dir = copyTree()
  const { bare, repo } = bareRemote()
  apply(dir, { file: JA, code: 'class _V:\n    import subprocess as sp\n    def go(self, repo, b):\n        return self.sp.run(["git", "-C", repo, "push", "origin", b])' })
  const { found } = scanTree('VS-7 behavior class body import', dir)
  const t = r.exec('python3', ['-c', loadAndCall(dir, JA, `m._V().go(${JSON.stringify(repo)}, "sdlc/S-001-v0-security-0")`)], { cwd: repo, watch: [] })
  const refs = r.exec('git', ['-C', bare, 'for-each-ref', '--format=%(refname)'], { watch: [] }).stdout.trim()
  if (LOG) appendFileSync(LOG, `### behavior class-body import\nguard breaches ${JSON.stringify(found)}\nremote refs after: ${refs}\ncall: ${t.text()}\n\n`)
  assert.ok(found.length > 0 || !refs.includes('sdlc/S-001-v0-security-0'), `guard breaches ${JSON.stringify(found)}; remote refs: ${refs}`)
})

test('verify security VS-7: os.startfile in a scanned script breaks a pin', () => {
  const { found } = scan('VS-7 os.startfile', [{ file: JA, code: fn('os.startfile("push.bat")') }])
  assert.ok(found.length > 0, 'os.startfile leaves every pin equal')
})

const OPAQUE = {
  'local list spread into git': [{ file: SW, code: fn('x = ["push"]', 'git(repo, *x)') }],
  'param verb into git': [{ file: SW, code: fn('git(repo, verb, "origin", b)') }],
  'param api path': [{ file: NA, code: fn('run(repo, "gh", "api", path)') }],
  'param verb into run gh': [{ file: NA, code: fn('run(repo, "gh", verb)') }],
  'param program into run': [{ file: NA, code: fn('run(repo, verb, "push")') }],
  'method param into gh api': [{ file: NA, code: fn('run(repo, "gh", "api", "-X", method, "repos/o/r/rules")') }],
  'cmd list into run': [{ file: NA, code: fn('run(repo, *cmd)') }],
  'im argv param': [{ file: IM, code: fn('run(cmd, ".")') }],
  'im git_lines param': [{ file: IM, code: fn('git_lines(cmd, ".")') }],
}
test('verify security VS-4: a non-constant program, verb or path outside a body gives an opaque entry or a value entry', () => {
  const missed = []
  for (const [label, edits] of Object.entries(OPAQUE)) {
    const { out } = scan(`VS-4 ${label}`, edits)
    const newOpaque = out.opaque.filter(o => !PINS.opaque.includes(o))
    const newValue = out.wrapperVerbs.filter(o => !PINS.wrapperVerbs.includes(o))
    if (newOpaque.length === 0 && newValue.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

const SPELL = {
  'git split across lines': [JA, fn('subprocess.run(["git",', '    "push",', '    "origin", b])')],
  'git implicit concat': [JA, fn('subprocess.run(["git", "pu" "sh", "origin", b])')],
  'git plus constants': [JA, fn('subprocess.run(["git", "pu" + "sh", "origin", b])')],
  'git -C before verb': [JA, fn('subprocess.run(["git", "-C", ".", "push"])')],
  'git five flags before verb': [JA, fn('subprocess.run(["git", "--no-pager", "--bare", "--literal-pathspecs", "--no-optional-locks", "--no-replace-objects", "push"])')],
  'git -c before verb': [JA, fn('subprocess.run(["git", "-c", "x=y", "push"])')],
  'git --exec-path before verb': [JA, fn('subprocess.run(["git", "--exec-path=/x", "push"])')],
  'git -P before verb': [JA, fn('subprocess.run(["git", "-P", "push"])')],
  'git double dash': [JA, fn('subprocess.run(["git", "--", "push"])')],
  'shell true': [JA, fn('subprocess.run("git push", shell=True)')],
  'shell true popen': [JA, fn('subprocess.Popen(cmd, shell=True)')],
  'one string argv': [JA, fn('subprocess.run("git push origin x".split())')],
  'argv from var': [JA, fn('subprocess.run(cmd)')],
  'os.system push': [JA, fn('os.system("git push origin x")')],
  'os.popen push': [JA, fn('os.popen("git push origin x")')],
  'os.execvp push': [JA, fn('os.execvp("git", ["git", "push"])')],
  'os.spawnlp push': [JA, fn('os.spawnlp(os.P_WAIT, "git", "git", "push")')],
  'os.posix_spawnp push': [JA, fn('os.posix_spawnp("git", ["git", "push"], {})')],
  'pty.spawn push': [JA, fn('import pty', 'pty.spawn(["git", "push"])')],
  'asyncio subprocess exec': [JA, fn('import asyncio', 'asyncio.create_subprocess_exec("git", "push")')],
  'multiprocessing Process': [JA, fn('import multiprocessing', 'multiprocessing.Process(target=print).start()')],
  'git case Git': [JA, fn('subprocess.run(["Git", "push"])')],
  'git.exe': [JA, fn('subprocess.run(["git.exe", "push"])')],
  'git tab verb': [JA, fn('subprocess.run(["git", "push\\t"])')],
  'git newline verb': [JA, fn('subprocess.run(["git", "push\\n"])')],
  'git push with verb after refspec options': [JA, fn('subprocess.run(["git", "push", "--force", "origin", b])')],
  'git push-via-remote helper': [JA, fn('subprocess.run(["git", "remote", "update"])')],
  'git ls-remote push-url': [JA, fn('subprocess.run(["git", "send-pack", "origin"])')],
}
test('verify security VS-5: each new push or process spelling changes a pin', () => {
  const missed = []
  for (const [label, [file, code]] of Object.entries(SPELL)) {
    const { found } = scan(`VS-5 ${label}`, [{ file, code }])
    if (found.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify security VS-5: a push at a direct site changes pushes, direct or opaque', () => {
  const missed = []
  for (const label of ['git split across lines', 'git implicit concat', 'git plus constants', 'git -C before verb', 'git five flags before verb', 'git -c before verb', 'git -P before verb', 'shell true', 'one string argv', 'argv from var']) {
    const [file, code] = SPELL[label]
    const { out } = scan(`VS-5 detail ${label}`, [{ file, code }])
    const pushed = out.pushes.length !== PINS.pushes.length
    const opaque = out.opaque.length !== PINS.opaque.length
    const direct = out.direct.length !== PINS.direct.length
    if (!(pushed || opaque || direct)) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

const FORGE = {
  'gh pr create': [NA, fn('run(repo, "gh", "pr", "create")'), 'verb pr create'],
  'glab mr create': [NA, fn('run(repo, "glab", "mr", "create")'), 'verb mr create'],
  'gh api -X POST': [NA, fn('run(repo, "gh", "api", "-X", "POST", "repos/o/r/issues")'), 'method POST'],
  'gh api --method PATCH': [NA, fn('run(repo, "gh", "api", "--method", "PATCH", "repos/o/r/issues/1")'), 'method PATCH'],
  'gh api --method=DELETE': [NA, fn('run(repo, "gh", "api", "--method=DELETE", "repos/o/r/issues/1")'), 'method DELETE'],
  'gh api -f': [NA, fn('run(repo, "gh", "api", "-f", "a=b", "repos/o/r/issues")'), 'field -f'],
  'gh api -F': [NA, fn('run(repo, "gh", "api", "-F", "a=b", "repos/o/r/issues")'), 'field -F'],
  'gh api --field': [NA, fn('run(repo, "gh", "api", "--field", "a=b", "repos/o/r/issues")'), 'field --field'],
  'gh api --raw-field': [NA, fn('run(repo, "gh", "api", "--raw-field", "a=b", "repos/o/r/issues")'), 'field --raw-field'],
  'gh api --input': [NA, fn('run(repo, "gh", "api", "--input", "x.json", "repos/o/r/issues")'), 'field --input'],
  'gh api pulls path': [NA, fn('run(repo, "gh", "api", "repos/o/r/pulls")'), 'path holds pulls'],
  'glab api merge_requests path': [NA, fn('run(repo, "glab", "api", "projects/1/merge_requests")'), 'path holds merge_requests'],
  'gh api graphql': [NA, fn('run(repo, "gh", "api", "graphql")'), 'path holds graphql'],
  'gh api graphql with -f': [NA, fn('run(repo, "gh", "api", "graphql", "-f", "query=x")'), 'path holds graphql'],
  'gh api -X GET graphql': [NA, fn('run(repo, "gh", "api", "-X", "GET", "graphql")'), 'path holds graphql'],
  'gh api graphql with paginate': [NA, fn('run(repo, "gh", "api", "--paginate", "graphql")'), 'path holds graphql'],
  'glab api graphql': [NA, fn('run(repo, "glab", "api", "graphql")'), 'path holds graphql'],
  'gh api path prefix graphql': [NA, fn('run(repo, "gh", "api", "repos/o/r/../../graphql")'), 'path holds graphql'],
  'gh api post at direct site': [JA, fn('subprocess.run(["gh", "api", "-X", "POST", "repos/o/r/issues"])'), 'method POST'],
  'gh api -XPOST glued': [NA, fn('run(repo, "gh", "api", "-XPOST", "repos/o/r/issues")'), 'method POST'],
  'gh api -fa=b glued': [NA, fn('run(repo, "gh", "api", "-fa=b", "repos/o/r/issues")'), 'field -f'],
  'gh api method after path': [NA, fn('run(repo, "gh", "api", "repos/o/r/issues", "-X", "POST")'), 'method POST'],
  'gh api GRAPHQL upper': [NA, fn('run(repo, "gh", "api", "GRAPHQL")'), 'path holds graphql'],
}
test('verify security VS-6: each forge write form is a forge violation', () => {
  const missed = []
  for (const [label, [file, code, violation]] of Object.entries(FORGE)) {
    const { out } = scan(`VS-6 ${label}`, [{ file, code }])
    if (!out.forgeViolations.some(v => v.endsWith(`-- ${violation}`))) missed.push(`${label}: ${JSON.stringify(out.forgeViolations)}`)
  }
  assert.deepEqual(missed, [])
})

const FORGE_OPAQUE = {
  'api path no prefix': [NA, fn('run(repo, "gh", "api", path)')],
  'api path param only with -X': [NA, fn('run(repo, "gh", "api", "-X", "GET", path)')],
  'gh verb param': [NA, fn('run(repo, "gh", verb, "create")')],
  'gh unknown leading option': [NA, fn('run(repo, "gh", "--hostname", "h", "pr", "create")')],
  'gh api mixed-case Post': [NA, fn('run(repo, "gh", "api", "-X", "Post", "repos/o/r/issues")')],
}
test('verify security VS-6: an unknown forge shape is opaque or a violation', () => {
  const missed = []
  for (const [label, [file, code]] of Object.entries(FORGE_OPAQUE)) {
    const { out } = scan(`VS-6 ${label}`, [{ file, code }])
    const newOpaque = out.opaque.filter(o => !PINS.opaque.includes(o))
    if (newOpaque.length === 0 && out.forgeViolations.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify security VS-6: a lowercase get method is allowed and gives no violation', () => {
  const { out } = scan('VS-6 lowercase get', [{ file: NA, code: fn('run(repo, "gh", "api", "-X", "get", "repos/o/r/rules/branches/x")') }])
  assert.deepEqual(out.forgeViolations, [])
})

const ALIAS = {
  'import os as alias in function': [SW, fn('import os as o2', 'o2.system("x")')],
  'from os import system': [SW, 'from os import system as s\n' + fn('s("x")')],
  'from subprocess import run late': [JA, fn('from subprocess import run as rr', 'rr(["git", "push"])')],
  'import subprocess as sp at module end': [JA, 'import subprocess as sp\n' + fn('sp.run(["git", "push"])')],
  'subprocess as value default': [JA, 'def _v(f=subprocess.run):\n    return f(["git", "push"])'],
  'walrus': [JA, fn('(f := subprocess.run)', 'f(["git", "push"])')],
  'list element': [JA, fn('fs = [subprocess.run]', 'fs[0](["git", "push"])')],
  'base class': [JA, 'class _V(subprocess.Popen):\n    pass'],
  'dict value': [JA, fn('d = {"a": os.system}', 'd["a"]("x")')],
  'conditional expression': [JA, fn('f = subprocess.run if b else None', 'f(["git", "push"])')],
  'shutil.os.system': [JA, fn('shutil.os.system("x")')],
  'branches.subprocess.run': [JA, fn('branches.subprocess.run(["git", "push"])')],
  'posix.system': [JA, fn('import posix', 'posix.system("x")')],
  'nt.system': [JA, fn('import nt', 'nt.system("x")')],
  '_posixsubprocess': [JA, fn('import _posixsubprocess', '_posixsubprocess.fork_exec()')],
  '_socket': [JA, fn('import _socket', '_socket.socket()')],
  'runpy': [JA, fn('import runpy', 'runpy.run_path("x.py")')],
  'code module': [JA, fn('import code', 'code.interact()')],
  'private attribute': [JA, fn('shutil._ntuple_diskusage')],
  'eval': [JA, fn('eval("1")')],
  'exec': [JA, fn('exec("x=1")')],
  'compile': [JA, fn('compile("1", "x", "eval")')],
  '__import__': [JA, fn('__import__("os").system("x")')],
  'importlib import_module': [JA, fn('import importlib', 'importlib.import_module("os")')],
  'globals': [JA, fn('globals()')],
  'locals': [JA, fn('locals()')],
  'vars none': [JA, fn('vars()')],
  'getattr on os': [JA, fn('getattr(os, "system")("x")')],
  'os.execl': [JA, fn('os.execl("/bin/sh", "sh")')],
  'ctypes': [JA, fn('import ctypes', 'ctypes.CDLL(None).system(b"x")')],
  'pickle import': [JA, fn('import pickle', 'pickle.loads(b"x")')],
  'http.client conn': [JA, fn('import http.client', 'http.client.HTTPSConnection("h").request("GET", "/")')],
  'socket create': [JA, fn('import socket', 'socket.create_connection(("h", 1))')],
  'urllib.request via existing import': ['skills/sdlc/tracker/collect.py', fn('urllib.request.urlopen("http://x")')],
  'webbrowser': [JA, fn('import webbrowser', 'webbrowser.open("x")')],
  'concurrent futures import': [JA, fn('import concurrent.futures', 'concurrent.futures.ProcessPoolExecutor()')],
}
test('verify security VS-7: each alias, value, chain, import or dynamic-code form changes a pin', () => {
  const missed = []
  for (const [label, [file, code]] of Object.entries(ALIAS)) {
    const { found } = scan(`VS-7 ${label}`, [{ file, code }])
    if (found.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

const JS_ATTACKS = {
  'require': "const x = require('child_process')",
  'string with process': "const s = 'process'",
  'unicode escape process': 'const s = "\\u0070rocess"',
  'braced escape process': 'const s = "\\u{70}rocess"',
  'fetch call': "await fetch('http://x')",
  'globalThis': 'const g = globalThis',
  'global double quote': 'const g = "global"',
  'global template': 'const g = `global`',
  'global in comment': '// global',
  'Function ctor': 'const f = Function("return 1")',
  'eval': 'eval("1")',
  'import dynamic': "await import('node:fs')",
  'Deno': 'const d = Deno',
  'Bun': 'const d = Bun',
  'navigator': 'const n = navigator',
  'WebSocket': 'new WebSocket("ws://x")',
  'spawn': 'const s = spawn',
  'exec word': 'const s = exec',
  'fork': 'const s = fork',
  'execFileSync': 'const s = execFileSync',
  'Worker': 'new Worker("x")',
  'global with allowed on same line': "const g = 'global' + global",
  'allowed literal twice and bare': "const a = 'global', b = 'global'; const c = global",
  'surrogate pair escape': 'const s = "\\ud800process"',
  'line separator comment': '// x process.exit()',
  'process in regex': 'const re = /process/',
  'process.env member': 'const p = process.env',
  'identifier via computed unicode': 'const p = \\u0070rocess',
}
test('verify security VS-8: each banned identifier form in sdlc-loop.js reports a hit or a pin change', () => {
  const missed = []
  for (const [label, code] of Object.entries(JS_ATTACKS)) {
    const { found } = scan(`VS-8 ${label}`, [{ file: LOOP, code }])
    if (found.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify security VS-8: the three decisionPanel allowlist lines stay pinned', () => {
  assert.equal(PINS.jsAllowed.length, 3)
  const { found } = scan('VS-8 removing one allowlist line', [{ file: LOOP, replace: ["'global'", "'globa'"] }])
  assert.ok(found.includes('jsAllowed'))
})

test('verify security VS-10: new script types, symlinks and non-UTF-8 sources change a pin', () => {
  CRASH_OK = true
  const missed = []
  const files = { 'hooks/x.sh': 'git push\n', 'skills/sdlc/x.mjs': 'x\n', 'skills/sdlc/x.cjs': 'x\n', 'skills/sdlc/x.ts': 'x\n', 'skills/sdlc/x.pyw': 'x\n', 'skills/sdlc/x.ps1': 'x\n', 'skills/sdlc/Makefile': 'x\n', 'skills/sdlc/x.py.txt': 'x\n', 'hooks/.hidden.py': 'import os\nos.system("x")\n', 'skills/sdlc/x.PY': 'import os\nos.system("x")\n' }
  for (const [rel, body] of Object.entries(files)) {
    const dir = copyTree()
    writeFileSync(join(dir, rel), body)
    if (scanTree(`VS-10 file ${rel}`, dir).found.length === 0) missed.push(rel)
  }
  for (const [label, rel, bytes] of [
    ['latin-1 coding line', 'skills/sdlc/x.py', Buffer.from('# -*- coding: latin-1 -*-\nimport os\nos.system("x")\n')],
    ['invalid utf-8', 'skills/sdlc/x.py', Buffer.from([0x69, 0x6d, 0x70, 0xff, 0xfe, 0x0a])],
    ['NUL byte', 'skills/sdlc/x.py', Buffer.from('import os\x00\nos.system("x")\n')],
    ['utf-16 bom', 'skills/sdlc/x.py', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('import os\n', 'utf16le')])],
    ['utf-8 bom file', 'skills/sdlc/x.py', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('import os\nos.system("x")\n')])],
    ['js invalid utf-8', 'skills/sdlc/x.js', Buffer.from([0x70, 0x72, 0x6f, 0x63, 0x65, 0x73, 0x73, 0xff])],
    ['cp1252 coding line', 'hooks/y.py', Buffer.from('# coding: cp1252\nos.system("x")\n')],
  ]) {
    const dir = copyTree()
    writeFileSync(join(dir, rel), bytes)
    if (scanTree(`VS-10 ${label}`, dir).found.length === 0) missed.push(label)
  }
  for (const [label, link, target] of [
    ['symlink to file', 'skills/sdlc/linkfile.py', 'skills/sdlc/branches.py'],
    ['symlink to directory', 'skills/sdlc/linkdir', 'skills/sdlc/tracker'],
    ['symlink to outside file', 'skills/sdlc/out.py', '/etc/hosts'],
    ['dangling symlink', 'skills/sdlc/dangling.py', '/nonexistent/x.py'],
    ['symlink replacing a scanned file', 'skills/sdlc/janitor.py', 'skills/sdlc/branches.py'],
    ['symlink in hooks', 'hooks/link.py', 'skills/sdlc/janitor.py'],
    ['symlink to skipped dir', 'skills/sdlc/linkprompts', 'skills/sdlc/prompts'],
  ]) {
    const dir = copyTree()
    const abs = join(dir, link)
    if (link === 'skills/sdlc/janitor.py') r.exec('rm', [abs], { watch: [] })
    symlinkSync(target.startsWith('/') ? target : join(dir, target), abs)
    if (scanTree(`VS-10 ${label}`, dir).found.length === 0) missed.push(label)
  }
  const dir = copyTree()
  mkdirSync(join(dir, 'skills/sdlc/test2'))
  writeFileSync(join(dir, 'skills/sdlc/test2/x.py'), 'import os\nos.system("x")\n')
  if (scanTree('VS-10 dir named test2', dir).found.length === 0) missed.push('dir named test2')
  assert.deepEqual(missed, [])
})

test('verify security VS-10: the scanned list is exact and the clean tree equals every pin', () => {
  const { out, found } = scan('VS-10 clean', [])
  assert.deepEqual(found, [])
  assert.equal(out.files.filter(f => /\.(py|js)$/.test(f)).length, 13)
})

const READ_OK = {
  'gh pr view const': [NA, fn('run(repo, "gh", "pr", "view", "1")')],
  'gh issue list': [NA, fn('run(repo, "gh", "issue", "list")')],
  'gh api repos get': [NA, fn('run(repo, "gh", "api", "repos/o/r/rules/branches/x")')],
  'glab mr list': [NA, fn('run(repo, "glab", "mr", "list")')],
  'glab api push_rule': [NA, fn('run(repo, "glab", "api", "projects/:fullpath/push_rule")')],
  'gh direct list': [JA, fn('subprocess.run(["gh", "pr", "list"])')],
}
test('verify security VS-11: a forge read with a constant verb changes forge and hits no ban', () => {
  const missed = []
  for (const [label, [file, code]] of Object.entries(READ_OK)) {
    const { out, found } = scan(`VS-11 ${label}`, [{ file, code }])
    const newOpaque = out.opaque.filter(o => !PINS.opaque.includes(o))
    if (!found.includes('forge') && !label.includes('direct')) missed.push(`${label}: no forge change ${found}`)
    if (out.forgeViolations.length !== 0 || newOpaque.length !== 0) missed.push(`${label}: ban ${JSON.stringify(out.forgeViolations)} ${JSON.stringify(newOpaque)}`)
  }
  assert.deepEqual(missed, [])
})

const OUT_OF_SCOPE = {
  'S3 sys.modules wrapper call': [SW, fn('sys.modules[__name__].git(repo, "push", "origin", b)')],
  'S3 sys.modules os system': [JA, fn('sys.modules["os"].system("x")')],
  'S2 os.environ GIT_SSH_COMMAND': [JA, fn('os.environ["GIT_SSH_COMMAND"] = "x"')],
  'os.kill is not a process start': [JA, fn('os.kill(1, 0)')],
  'rebind wrapper to a non-process function': [NA, 'def _other(repo, *cmd):\n    return False, ""\nrun = _other'],
  'rebind wrapper to lambda': [SW, 'git = lambda repo, *a, check=True: None'],
  'JS capital P escape is not process': [LOOP, 'const s = "\\u0050rocess"'],
  'JS zero width joiner is not process': [LOOP, 'const pro\u200dcess = 1'],
  'JS cyrillic lookalike is not process': [LOOP, 'const prоcess = 1'],
  'S1 duplicate of a reviewed push line': [SW, null],
}
test('verify security: out-of-scope attacks are recorded', () => {
  for (const [label, [file, code]] of Object.entries(OUT_OF_SCOPE)) {
    if (code === null) continue
    const { found } = scan(`OOS ${label}`, [{ file, code }])
    if (LOG) appendFileSync(LOG, `OOS RESULT ${label}: ${JSON.stringify(found)}\n\n`)
  }
})

test('verify security VS-10: an unreadable scanned file fails closed', () => {
  CRASH_OK = true
  const dir = copyTree()
  r.exec('chmod', ['000', join(dir, JA)], { watch: [] })
  const { found } = scanTree('VS-10 unreadable file', dir)
  r.exec('chmod', ['644', join(dir, JA)], { watch: [] })
  assert.ok(found.length > 0)
})
