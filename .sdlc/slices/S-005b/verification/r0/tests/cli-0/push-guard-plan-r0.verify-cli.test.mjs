import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT ?? resolve(HERE, '../../../../../../..')
const GUARD = join(ROOT, 'skills/sdlc/test/push_guard.py')
const LOG = process.env.VERIFY_LOG ?? resolve(HERE, '../../logs/cli-0-transcripts.txt')
const { cliRunner } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs')).href)
const r = cliRunner()
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `push_guard.py verify-cli plan r0 transcripts, root ${ROOT}\n`)
const log = t => appendFileSync(LOG, `${t}\n`)

const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const BR = 'skills/sdlc/branches.py'
const LOOP = 'skills/sdlc/sdlc-loop.js'
const V = 'sdlc/S-001-v0-cli-0'

function copyTree() {
  const dir = r.dir('tree')
  for (const base of ['skills/sdlc', 'hooks']) cpSync(join(ROOT, base), join(dir, base), { recursive: true, filter: s => !SKIPPED.has(basename(s)) })
  return dir
}
function guard(dir) {
  const t = r.exec('python3', ['-I', GUARD, dir])
  assert.equal(t.status, 0, `exit ${t.status}: ${t.stderr}`)
  assert.ok(t.treeUnchanged)
  return { out: JSON.parse(t.stdout), t }
}
const CLEAN = guard(copyTree()).out
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function delta(out) {
  const ch = {}
  for (const k of Object.keys(CLEAN)) if (!same(out[k], CLEAN[k])) ch[k] = { added: out[k].filter(x => !CLEAN[k].includes(x)), removed: CLEAN[k].filter(x => !out[k].includes(x)) }
  return ch
}
const edit = {
  append: code => s => s + code,
  fn: (sig, ...body) => `\n\ndef _mutant${sig.startsWith('(') ? sig : `(${sig})`}:\n${body.map(l => `    ${l}`).join('\n')}\n`,
  after: (line, add) => s => { assert.ok(s.includes(line + '\n'), `missing ${line}`); return s.replace(line + '\n', line + '\n' + add.join('\n') + '\n') },
  once: (a, b) => s => { assert.ok(s.includes(a), `missing ${a}`); return s.replace(a, b) },
  top: (imp, ...body) => s => `${imp}\n${s}\n\ndef _mutant(repo, b):\n${body.map(l => `    ${l}`).join('\n')}\n`,
}
function probe(label, file, e) {
  const dir = copyTree()
  const p = join(dir, file)
  mkdirSync(dirname(p), { recursive: true })
  let src = ''
  try { src = readFileSync(p, 'utf8') } catch {}
  writeFileSync(p, typeof e === 'function' ? e(src) : src + e)
  const { out, t } = guard(dir)
  const ch = delta(out)
  log(`\n=== ${label}\n$ ${t.argv.join(' ')}  exit ${t.status} tree-unchanged ${t.treeUnchanged}\nchanged keys: ${Object.keys(ch).join(', ') || '<none>'}`)
  for (const [k, d] of Object.entries(ch)) { log(`  ${k}`); for (const a of d.added.slice(0, 3)) log(`    + ${a.slice(0, 200)}`); for (const x of d.removed.slice(0, 2)) log(`    - ${x.slice(0, 120)}`) }
  return Object.keys(ch)
}
function battery(rows) {
  const bad = []
  for (const [label, file, e, want] of rows) {
    const keys = probe(label, file, e)
    if (want === 'none') { if (keys.length) bad.push(`${label}: expected no change, got ${keys}`) }
    else if (!keys.length) bad.push(`${label}: every key equal`)
    else if (want && !keys.includes(want)) bad.push(`${label}: ${want} did not change (${keys})`)
  }
  return bad
}
const bodyEdit = (file, line, add) => [file, edit.after(line, add), 'wrapperBodies']
const SWG = 'def git(repo, *args, check=True):'
const SRG = 'def git(repo, *args):'
const NAR = 'def run(repo, *cmd):'
const IMR = 'def run(args, cwd):'
const IMG = 'def git_lines(args, repo):'
const push = `subprocess.run(["git", "-C", repo, "push", "origin", "${V}"])`

test('verify cli VS-1: a push or forge write inside a pinned body changes wrapperBodies', () => {
  const rows = [
    ['VS-1 push line in state-write git', ...bodyEdit(SW, SWG, [`    ${push}`])],
    ['VS-1 push on a semicolon line', ...bodyEdit(SW, SWG, [`    x = 1; ${push}`])],
    ['VS-1 push after a backslash continuation', ...bodyEdit(SW, SWG, [`    y = 1 + \\`, `        1`, `    ${push}`])],
    ['VS-1 push in a lambda in suite-receipt git', ...bodyEdit(SR, SRG, [`    (lambda: subprocess.run(["git", "push", "origin", "${V}"]))()`])],
    ['VS-1 args rebound to a push', ...bodyEdit(SW, SWG, [`    args = ("push", "origin", "${V}")`])],
    ['VS-1 -c remote.origin.push option in the argv list', SW, edit.once('["git", "-C", repo, *args]', `["git", "-C", repo, "-c", "remote.origin.push=HEAD", *args]`), 'wrapperBodies'],
    ['VS-1 -X POST in next-action run', ...bodyEdit(NA, NAR, [`    cmd = ("gh", "api", "-X", "POST", "repos/o/r/pulls")`])],
    ['VS-1 --method=PUT in next-action run', ...bodyEdit(NA, NAR, [`    cmd = cmd + ("--method=PUT",)`])],
    ['VS-1 -f in next-action run', ...bodyEdit(NA, NAR, [`    cmd = cmd + ("-f", "title=x")`])],
    ['VS-1 --input in next-action run', ...bodyEdit(NA, NAR, [`    cmd = cmd + ("--input", "-")`])],
    ['VS-1 verb from a parameter swap in impact run', ...bodyEdit(IM, IMR, [`    args = list(args)[:1] + ["push", "origin", "${V}"]`])],
    ['VS-1 impact git_lines gains --no-pager', IM, edit.once('run(["git"] + args, repo)', 'run(["git", "--no-pager"] + args, repo)'), 'wrapperBodies'],
    ['VS-1 impact git_lines run call moved to a different program', IM, edit.once('run(["git"] + args, repo)', 'run(["gh"] + args, repo)'), 'wrapperBodies'],
    ['VS-1 token-equal reorder: swap check kw', SW, edit.once('capture_output=True, text=True)\n    if check', 'text=True, capture_output=True)\n    if check'), 'wrapperBodies'],
    ['VS-1 error string changed in suite-receipt git f-string expression', SR, edit.once("{r.stderr.strip()}", "{r.stdout.strip()}"), 'wrapperBodies'],
    ['VS-1 f-string literal text changed in state-write git', SW, edit.once('f"git {', 'f"git2 {'), 'wrapperBodies'],
    ['VS-1 timeout changed in next-action run', NA, edit.once('timeout=120', 'timeout=121'), 'wrapperBodies'],
    ['VS-1 return value changed in impact git_lines', IM, edit.once('return r.stdout.splitlines() if r.returncode == 0 else None', 'return r.stdout.splitlines()'), 'wrapperBodies'],
    ['VS-1 docstring added to state-write git', ...bodyEdit(SW, SWG, ['    """doc # not a comment"""'])],
    ['VS-1 global statement in next-action run', ...bodyEdit(NA, NAR, ['    global _x'])],
  ]
  assert.deepEqual(battery(rows), [])
})

test('verify cli VS-2: a changed wrapper definition changes wrapperBodies', () => {
  const dup = (sig, ...b) => `\n\ndef ${sig}:\n${b.map(l => `    ${l}`).join('\n')}\n`
  const rows = [
    ['VS-2 second identical def git in state-write', SW, edit.append('\n\n' + readFileSync(join(ROOT, SW), 'utf8').match(/def git\(repo, \*args, check=True\):\n(?:    .*\n)+/)[0]), 'wrapperBodies'],
    ['VS-2 identical def run appended to impact', IM, edit.append('\n\n' + readFileSync(join(ROOT, IM), 'utf8').match(/def run\(args, cwd\):\n(?:    .*\n)+/)[0]), 'wrapperBodies'],
    ['VS-2 nested def git inside a function', SW, edit.append(dup('_outer(repo)', 'def git(repo, *args):', `    return subprocess.run(["git", "-C", repo, *args])`, 'return git')), 'wrapperBodies'],
    ['VS-2 method named run in a class (janitor has none)', NA, edit.append('\n\nclass _K:\n    def run(self, *cmd):\n        return None\n'), 'wrapperBodies'],
    ['VS-2 async def git in state-write', SW, edit.append('\n\nasync def git(repo, *args):\n    return None\n'), 'wrapperBodies'],
    ['VS-2 default changed in suite-receipt (no default added)', SR, edit.once(SRG, 'def git(repo, *args, check=False):'), 'wrapperBodies'],
    ['VS-2 signature reordered in impact git_lines', IM, edit.once(IMG, 'def git_lines(repo, args):'), 'wrapperBodies'],
    ['VS-2 two decorators added to next-action run', NA, edit.once(NAR, '@staticmethod\n@(lambda f: f)\n' + NAR), 'wrapperBodies'],
    ['VS-2 return annotation added', SW, edit.once(SWG, 'def git(repo, *args, check=True) -> None:'), 'wrapperBodies'],
    ['VS-2 wrapper name rebound by assignment to a lambda that pushes', SW, edit.append(`\n\ngit = lambda repo, *a, **k: subprocess.run(["git", "push", "origin", "${V}"])\n`), 'direct'],
    ['VS-2 wrapper rebound to a pure function (harmless, no process site)', SW, edit.append('\n\ndef _p(repo, *a, **k):\n    return None\n\ngit = _p\n'), 'none'],
    ['VS-2 wrapper name decorated def of another module-level func', SW, edit.append('\n\n@git\ndef _z():\n    pass\n'), 'wrapperValues'],
    ['VS-2 def git added in janitor (no wrapper entry) that wraps subprocess', JA, edit.append('\n\ndef git(repo, *a):\n    return subprocess.run(["git", "-C", repo, *a])\n'), 'direct'],
    ['VS-2 t-string/f-string nested quotes body edit', SR, edit.once(`' '.join(args)}: {r.stderr`, `"-".join(args)}: {r.stderr`), 'wrapperBodies'],
  ]
  assert.deepEqual(battery(rows), [])
})

test('verify cli VS-3: a comment or a blank line in a body keeps every pin', () => {
  const clean = CLEAN
  const dir = copyTree()
  const apply = (file, fn) => { const p = join(dir, file); writeFileSync(p, fn(readFileSync(p, 'utf8'))) }
  apply(SW, s => s.replace(SWG + '\n', SWG + '  # trailing note with a "quote" and a \'single\' and # hash\n\n    # lead note \\\n\n').replace('    return r\n\n\ndef read_json', '    return r   \n    # last note\n\n\ndef read_json'))
  apply(SR, s => s.replace(SRG + '\n', SRG + '\n\t# tab-indented note\n    \n').replace('    return r.stdout\n', '    return r.stdout  # end\n'))
  apply(NA, s => s.replace(NAR + '\n', NAR + '\n    # note: "x" # y\n\n').replace('    return r.returncode == 0,', '    # between\n    return r.returncode == 0,'))
  apply(IM, s => s.replace(IMR + '\n', IMR + '\n\n\n    #!shebang-like\n').replace(IMG + '\n', IMG + '  # sig note\n    # one\n\n    # two\n'))
  const out = guard(dir).out
  const ch = delta(out)
  log(`\n=== VS-3 comments and blanks in all five bodies\nchanged keys: ${Object.keys(ch).join(', ') || '<none>'}`)
  assert.deepEqual(Object.keys(ch), [])
  assert.deepEqual(Object.keys(out).sort(), Object.keys(clean).sort())
})

test('verify cli VS-3b: re-indenting and trailing whitespace keep every pin', () => {
  const dir = copyTree()
  const p = join(dir, SW)
  const s = readFileSync(p, 'utf8')
  const m = s.match(/def git\(repo, \*args, check=True\):\n((?:    .*\n)+)/)
  const re = m[0].replace(/^ {4}/gm, '  ').replace(/\n/g, '   \n')
  writeFileSync(p, s.replace(m[0], re))
  const ch = delta(guard(dir).out)
  log(`\n=== VS-3b two-space indent and trailing spaces: ${Object.keys(ch).join(', ') || '<none>'}`)
  assert.deepEqual(Object.keys(ch), [])
})

test('verify cli VS-4: outside a body a non-constant program, verb, option or api path is opaque or a wrapperValues entry', () => {
  const rows = [
    ['VS-4 local list spread into git', SW, edit.append(edit.fn('(repo, b)', 'extra = ["push", "origin", b]', 'git(repo, *extra)')), 'opaque'],
    ['VS-4 tuple built in a variable then spread', SW, edit.append(edit.fn('(repo, b)', 'extra = ("push", "origin", b)', 'git(repo, *extra, check=False)')), 'opaque'],
    ['VS-4 parameter api path', NA, edit.append(edit.fn('(repo, path)', 'return run(repo, "gh", "api", path)')), 'opaque'],
    ['VS-4 f-string api path with constant prefix pulls', NA, edit.append(edit.fn('(repo, n)', 'return run(repo, "gh", "api", f"repos/o/r/pulls/{n}")')), 'forgeViolations'],
    ['VS-4 variable verb passed to git', SW, edit.append(edit.fn('(repo, v)', 'git(repo, v, "origin")')), 'opaque'],
    ['VS-4 verb with a variable suffix', SW, edit.append(edit.fn('(repo, v)', 'git(repo, "pus" + v, "origin")')), 'opaque'],
    ['VS-4 verb as ternary', SW, edit.append(edit.fn('(repo, v)', 'git(repo, "push" if v else "fetch", "origin")')), 'opaque'],
    ['VS-4 verb from a call', SW, edit.append(edit.fn('(repo, v)', 'git(repo, v.lower())')), 'opaque'],
    ['VS-4 verb from subscript', SW, edit.append(edit.fn('(repo, v)', 'git(repo, v[0])')), 'opaque'],
    ['VS-4 option from a variable before the verb', SW, edit.append(edit.fn('(repo, o)', 'git(repo, o, "diff")')), 'opaque'],
    ['VS-4 program from a variable via next-action run', NA, edit.append(edit.fn('(repo, prog)', 'run(repo, prog, "push")')), 'opaque'],
    ['VS-4 program from a variable via impact run', IM, edit.append(edit.fn('(prog)', 'run([prog, "push"], ".")')), 'opaque'],
    ['VS-4 argv from a variable via impact run', IM, edit.append(edit.fn('(argv)', 'run(argv, ".")')), 'opaque'],
    ['VS-4 rebind git to g', SW, edit.append(edit.fn('(repo)', 'g = git', 'g(repo, "fetch")')), 'wrapperValues'],
    ['VS-4 wrapper in a list', SW, edit.append(edit.fn('(repo)', 'fs = [git]', 'fs[0](repo, "fetch")')), 'wrapperValues'],
    ['VS-4 wrapper passed to map', SW, edit.append(edit.fn('(repo)', 'list(map(git, [repo]))')), 'wrapperValues'],
    ['VS-4 wrapper as default parameter', SW, edit.append('\n\ndef _m(repo, g=git):\n    g(repo, "fetch")\n'), 'wrapperValues'],
    ['VS-4 first argument unpacked into git', SW, edit.append(edit.fn('(a)', 'git(*a)')), 'wrapperVerbs'],
    ['VS-4 unpacked list literal incl. repo into git', SW, edit.append(edit.fn('(repo, b)', `git(*[repo, "push", "origin", b])`)), 'wrapperVerbs'],
    ['VS-4 unpacked first arg into next-action run', NA, edit.append(edit.fn('(a)', 'run(*a)')), 'opaque'],
    ['VS-4 keyword-passed argv to impact run', IM, edit.append(edit.fn('()', `run(args=["git", "push", "origin", "${V}"], cwd=".")`)), 'opaque'],
    ['VS-4 keyword-passed args to impact git_lines', IM, edit.append(edit.fn('()', `git_lines(args=["push", "origin", "${V}"], repo=".")`)), 'wrapperVerbs'],
    ['VS-4 wrapper reached by getattr on sys.modules (S3 seed)', SW, edit.append(edit.fn('(repo)', 'getattr(sys.modules[__name__], "git")(repo, "push", "origin")')), 'none'],
    ['VS-4 wrapper name through globals()', SW, edit.append(edit.fn('(repo)', 'globals()["git"](repo, "fetch")')), 'dynamic'],
    ['VS-4 bytes verb', SW, edit.append(edit.fn('(repo)', `git(repo, b"push", "origin")`)), 'wrapperVerbs'],
    ['VS-4 non-str constants as verb', SW, edit.append(edit.fn('(repo)', 'git(repo, 1)')), 'wrapperVerbs'],
  ]
  assert.deepEqual(battery(rows), [])
})

test('verify cli VS-5: a new git push of a branch fails the guard in every covered spelling', () => {
  const sub = x => edit.append(edit.fn('(repo, b)', x))
  const rows = [
    ['VS-5 single quotes', SW, sub(`git(repo, 'push', 'origin', b)`), 'pushes'],
    ['VS-5 implicit concat', SW, sub(`git(repo, "pu" "sh", "origin", b)`), 'pushes'],
    ['VS-5 plus concat three parts', SW, sub(`git(repo, "p" + "u" + "sh", "origin", b)`), 'pushes'],
    ['VS-5 triple quoted', SW, sub(`git(repo, """push""", "origin", b)`), 'pushes'],
    ['VS-5 verb split over lines in call', SW, sub('git(repo,', '    "push",', '    "origin", b)'), 'pushes'],
    ['VS-5 -C before verb', SW, sub('git(repo, "-C", "/tmp/x", "push", "origin", b)'), 'pushes'],
    ['VS-5 --no-pager before verb', SW, sub('git(repo, "--no-pager", "push", "origin", b)'), 'pushes'],
    ['VS-5 --bare before verb', SW, sub('git(repo, "--bare", "push", "origin", b)'), 'pushes'],
    ['VS-5 -c before verb', SW, sub('git(repo, "-c", "push.default=current", "push", "origin", b)'), 'opaque'],
    ['VS-5 --git-dir before verb', SW, sub('git(repo, "--git-dir=/x", "push", "origin", b)'), 'opaque'],
    ['VS-5 -C stuck to value', SW, sub('git(repo, "-C/tmp/x", "push", "origin", b)'), 'opaque'],
    ['VS-5 in suite-receipt git wrapper', SR, sub('git(repo, "push", "origin", b)'), 'pushes'],
    ['VS-5 in impact git_lines', IM, sub('git_lines(["push", "origin", b], ".")'), 'pushes'],
    ['VS-5 in impact run list literal', IM, sub('run(["git", "push", "origin", b], ".")'), 'pushes'],
    ['VS-5 in next-action run', NA, sub('run(repo, "git", "push", "origin", b)'), 'pushes'],
    ['VS-5 absolute git program path', NA, sub('run(repo, "/usr/bin/git", "push", "origin", b)'), 'pushes'],
    ['VS-5 direct subprocess.run list', JA, sub('subprocess.run(["git", "push", "origin", b])'), 'pushes'],
    ['VS-5 direct subprocess tuple argv', JA, sub('subprocess.run(("git", "push", "origin", b))'), 'pushes'],
    ['VS-5 direct subprocess.Popen', JA, sub('subprocess.Popen(["git", "push", "origin", b])'), 'pushes'],
    ['VS-5 direct check_call', JA, sub('subprocess.check_call(["git", "push", "origin", b])'), 'pushes'],
    ['VS-5 direct check_output args kw', JA, sub('subprocess.check_output(args=["git", "push", "origin", b])'), 'pushes'],
    ['VS-5 direct string with shell True', JA, sub('subprocess.run("git push origin " + b, shell=True)'), 'opaque'],
    ['VS-5 direct string with shell True constant', JA, sub('subprocess.run("git push origin x", shell=True)'), 'opaque'],
    ['VS-5 shell kw variable', JA, sub('subprocess.run(["git", "push"], shell=b)'), 'opaque'],
    ['VS-5 os.system constant', JA, sub('os.system("git push origin x")'), 'pushes'],
    ['VS-5 os.popen', JA, sub('os.popen("git push origin " + b)'), 'direct'],
    ['VS-5 os.execvp', JA, sub('os.execvp("git", ["git", "push", "origin", b])'), 'direct'],
    ['VS-5 os.spawnlp', JA, sub('os.spawnlp(os.P_WAIT, "git", "git", "push", "origin", b)'), 'direct'],
    ['VS-5 non-list argv', JA, sub('subprocess.run(argv)'), 'opaque'],
    ['VS-5 argv list comprehension', JA, sub('subprocess.run([x for x in ["git", "push"]])'), 'direct'],
    ['VS-5 argv via list() call', JA, sub('subprocess.run(list(("git", "push")))'), 'opaque'],
    ['VS-5 argv star-unpack of a name', JA, sub('subprocess.run([*a])'), 'direct'],
    ['VS-5 send-pack verb (a new verb)', SW, sub('git(repo, "send-pack", "origin", b)'), 'wrapperVerbs'],
    ['VS-5 edit a reviewed push to use a verify name', SW, edit.once('git(repo, "push", "-q", "-u", "origin", want, check=False)', 'git(repo, "push", "-q", "-u", "origin", want + "x", check=False)'), 'pushes'],
    ['VS-5 add --mirror to a reviewed push', SW, edit.once('git(repo, "push", "-q", "origin", run, check=False)', 'git(repo, "push", "-q", "--mirror", "origin", run, check=False)'), 'pushes'],
  ]
  const src = readFileSync(join(ROOT, SW), 'utf8')
  rows.push(['VS-5 reviewed push quote style change (must still be a pin hit? equal text)', SW, edit.once('git(repo, "push", "-q", "origin", run, check=False)', "git(repo, 'push', '-q', 'origin', run, check=False)"), 'none'])
  assert.ok(src.includes('git(repo, "push", "-q", "origin", run, check=False)'), 'reviewed push source differs from the expected form')
  assert.deepEqual(battery(rows), [])
})

test('verify cli VS-6: a pull-request creation or other forge write fails the guard', () => {
  const sub = x => edit.append(edit.fn('(repo, b, p)', x))
  const rows = [
    ['VS-6 gh pr create', NA, sub('run(repo, "gh", "pr", "create", "--fill")'), 'forgeViolations'],
    ['VS-6 gh pr create flags first', NA, sub('run(repo, "gh", "-R", "o/r", "pr", "create")'), 'forgeViolations'],
    ['VS-6 gh --repo= pr create', NA, sub('run(repo, "gh", "--repo=o/r", "pr", "create")'), 'forgeViolations'],
    ['VS-6 glab mr create direct', JA, sub('subprocess.run(["glab", "mr", "create"])'), 'forgeViolations'],
    ['VS-6 gh pr merge', NA, sub('run(repo, "gh", "pr", "merge", "1")'), 'wrapperVerbs'],
    ['VS-6 gh pr edit', NA, sub('run(repo, "gh", "pr", "edit", "1")'), 'wrapperVerbs'],
    ['VS-6 gh issue create', NA, sub('run(repo, "gh", "issue", "create")'), 'wrapperVerbs'],
    ['VS-6 gh release create', NA, sub('run(repo, "gh", "release", "create", "v1")'), 'wrapperVerbs'],
    ['VS-6 gh api -X POST', NA, sub('run(repo, "gh", "api", "-X", "POST", "repos/o/r/git/refs")'), 'forgeViolations'],
    ['VS-6 gh api --method POST', NA, sub('run(repo, "gh", "api", "--method", "POST", "repos/o/r/git/refs")'), 'forgeViolations'],
    ['VS-6 gh api --method=DELETE', NA, sub('run(repo, "gh", "api", "--method=DELETE", "repos/o/r/git/refs/heads/x")'), 'forgeViolations'],
    ['VS-6 gh api -XPOST stuck', NA, sub('run(repo, "gh", "api", "-XPOST", "repos/o/r/git/refs")'), 'forgeViolations'],
    ['VS-6 gh api lowercase get allowed', NA, sub('run(repo, "gh", "api", "-X", "get", "repos/o/r/rules/branches/x")'), 'forge'],
    ['VS-6 gh api method not const', NA, sub('run(repo, "gh", "api", "-X", p, "repos/o/r")'), 'forgeViolations'],
    ['VS-6 gh api -f', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "-f", "ref=x")'), 'forgeViolations'],
    ['VS-6 gh api -F', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "-F", "ref=x")'), 'forgeViolations'],
    ['VS-6 gh api --field', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "--field", "ref=x")'), 'forgeViolations'],
    ['VS-6 gh api --field=', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "--field=ref=x")'), 'forgeViolations'],
    ['VS-6 gh api --raw-field', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "--raw-field", "ref=x")'), 'forgeViolations'],
    ['VS-6 gh api -fref stuck', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "-fref=x")'), 'forgeViolations'],
    ['VS-6 gh api --input', NA, sub('run(repo, "gh", "api", "repos/o/r/git/refs", "--input", "x.json")'), 'forgeViolations'],
    ['VS-6 gh api path pulls', NA, sub('run(repo, "gh", "api", "repos/o/r/pulls")'), 'forgeViolations'],
    ['VS-6 gh api path PULLS uppercase', NA, sub('run(repo, "gh", "api", "repos/o/r/PULLS")'), 'forgeViolations'],
    ['VS-6 gh api path with no prefix', NA, sub('run(repo, "gh", "api", p)'), 'opaque'],
    ['VS-6 gh api f-string path starting with var', NA, sub('run(repo, "gh", "api", f"{p}/pulls")'), 'opaque'],
    ['VS-6 gh api graphql bare', NA, sub('run(repo, "gh", "api", "graphql")'), 'forgeViolations'],
    ['VS-6 gh api graphql -f query', NA, sub('run(repo, "gh", "api", "graphql", "-f", "query=x")'), 'forgeViolations'],
    ['VS-6 gh api graphql GET', NA, sub('run(repo, "gh", "api", "-X", "GET", "graphql")'), 'forgeViolations'],
    ['VS-6 gh api /graphql with leading slash', NA, sub('run(repo, "gh", "api", "/graphql")'), 'forgeViolations'],
    ['VS-6 gh api GRAPHQL upper', NA, sub('run(repo, "gh", "api", "GraphQL")'), 'forgeViolations'],
    ['VS-6 gh api --paginate graphql', NA, sub('run(repo, "gh", "api", "--paginate", "graphql")'), 'forgeViolations'],
    ['VS-6 gh api graphql after other positional', NA, sub('run(repo, "gh", "api", "repos/o/r", "graphql")'), 'forgeViolations'],
    ['VS-6 glab api graphql', JA, sub('subprocess.run(["glab", "api", "graphql"])'), 'forgeViolations'],
    ['VS-6 glab api merge_requests POST', JA, sub('subprocess.run(["glab", "api", "-X", "POST", "projects/1/merge_requests"])'), 'forgeViolations'],
    ['VS-6 glab api merge_requests GET', JA, sub('subprocess.run(["glab", "api", "projects/1/merge_requests"])'), 'forgeViolations'],
    ['VS-6 gh with unknown leading option', NA, sub('run(repo, "gh", "--hostname", "x", "pr", "create")'), 'opaque'],
    ['VS-6 gh absolute path', NA, sub('run(repo, "/opt/homebrew/bin/gh", "pr", "create")'), 'forgeViolations'],
    ['VS-6 gh pr create verb split into one token', NA, sub('run(repo, "gh", "pr create")'), 'forgeViolations'],
    ['VS-6 gh api issue comment POST via -X in lead position', NA, sub('run(repo, "gh", "-X", "POST", "api", "repos/o/r/issues/1/comments")'), 'opaque'],
    ['VS-6 curl to the forge', JA, sub('subprocess.run(["curl", "-X", "POST", "https://api.github.com/repos/o/r/pulls"])'), 'direct'],
    ['VS-6 git push --push-option merge_request.create (gitlab MR via push)', SW, sub('git(repo, "push", "-o", "merge_request.create", "origin", b)'), 'pushes'],
  ]
  assert.deepEqual(battery(rows), [])
})

test('verify cli VS-7: a process or network call by alias, value, chain, import or dynamic code fails the guard', () => {
  const fnb = (...b) => edit.append(edit.fn('(repo, b)', ...b))
  const rows = [
    ['VS-7 import alias bound in a later function', JA, edit.append(edit.fn('(repo, b)', 'sp.run(["git", "push"])') + '\n\ndef _z():\n    import subprocess as sp\n'), 'direct'],
    ['VS-7 import inside try', JA, edit.append('\n\ntry:\n    import subprocess as _s\nexcept ImportError:\n    _s = None\n\ndef _m(b):\n    _s.run(["git", "push", b])\n'), 'direct'],
    ['VS-7 from-import of Popen as value', JA, edit.top('from subprocess import Popen as _P', '_P(["git", "push", b])'), 'direct'],
    ['VS-7 from os import system', JA, edit.top('from os import system as _sys', '_sys("git push " + b)'), 'direct'],
    ['VS-7 from os import execv', JA, edit.top('from os import execv', 'execv("/usr/bin/git", ["git", "push", b])'), 'direct'],
    ['VS-7 from os import path then chain', BR, edit.top('from os import path as _p', '_p.os.system("git push " + b)'), 'direct'],
    ['VS-7 shutil.os.system', JA, fnb('shutil.os.system("git push " + b)'), 'direct'],
    ['VS-7 tempfile.os.system', JA, fnb('tempfile.os.system("git push " + b)'), 'direct'],
    ['VS-7 glob.os.system', JA, edit.top('import glob', 'glob.os.system("git push " + b)'), 'direct'],
    ['VS-7 fnmatch.os.system', JA, edit.top('import fnmatch', 'fnmatch.os.system("git push " + b)'), 'direct'],
    ['VS-7 mimetypes.os.system', JA, edit.top('import mimetypes', 'mimetypes.os.system("git push " + b)'), 'direct'],
    ['VS-7 posixpath.os.system', JA, edit.top('import posixpath', 'posixpath.os.system("git push " + b)'), 'direct'],
    ['VS-7 branches.subprocess.run', JA, edit.top('import branches', 'branches.subprocess.run(["git", "push", b])'), 'direct'],
    ['VS-7 hub.os.system', JA, edit.top('import hub', 'hub.os.system("git push " + b)'), 'direct'],
    ['VS-7 reports.os.system', JA, edit.top('import reports', 'reports.os.system("git push " + b)'), 'direct'],
    ['VS-7 workflow.os.system', JA, edit.top('import workflow', 'workflow.os.system("git push " + b)'), 'direct'],
    ['VS-7 subprocess as dict value', JA, fnb('d = {"k": subprocess}', 'd["k"].run(["git", "push", b])'), 'dynamic'],
    ['VS-7 subprocess in a tuple', JA, fnb('t = (subprocess, 1)'), 'dynamic'],
    ['VS-7 subprocess passed as argument', JA, fnb('print(subprocess)'), 'dynamic'],
    ['VS-7 os passed to vars', JA, fnb('vars(os)["system"]("git push " + b)'), 'dynamic'],
    ['VS-7 os.__dict__', JA, fnb('os.__dict__["system"]("git push " + b)'), 'dynamic'],
    ['VS-7 getattr os', JA, fnb('getattr(os, "system")("git push " + b)'), 'dynamic'],
    ['VS-7 subprocess.run value in lambda', JA, fnb('f = lambda: subprocess.run', 'f()'), 'dynamic'],
    ['VS-7 walrus os.system', JA, fnb('(s := os.system)("git push " + b)'), 'dynamic'],
    ['VS-7 default param os.system', JA, edit.append('\n\ndef _m(b, s=os.system):\n    s("git push " + b)\n'), 'dynamic'],
    ['VS-7 class base subprocess.Popen', JA, edit.append('\n\nclass _P(subprocess.Popen):\n    pass\n'), 'dynamic'],
    ['VS-7 class attribute holds os.system', JA, edit.append('\n\nclass _C:\n    s = os.system\n'), 'dynamic'],
    ['VS-7 socket.socket value', JA, edit.top('import socket', 's = socket.socket', 's().connect(("x", 1))'), 'network'],
    ['VS-7 urllib.request.urlopen call', JA, edit.top('import urllib.request', 'urllib.request.urlopen("https://x/" + b)'), 'network'],
    ['VS-7 from urllib.request import urlopen', JA, edit.top('from urllib.request import urlopen', 'urlopen("https://x/" + b)'), 'network'],
    ['VS-7 from urllib import request', JA, edit.top('from urllib import request', 'request.urlopen("https://x/" + b)'), 'network'],
    ['VS-7 http.client', JA, edit.top('import http.client', 'http.client.HTTPSConnection("x").request("POST", "/" + b)'), 'network'],
    ['VS-7 smtplib', JA, edit.top('import smtplib', 'smtplib.SMTP("x")'), 'network'],
    ['VS-7 webbrowser.open', JA, edit.top('import webbrowser', 'webbrowser.open("https://x/" + b)'), 'network'],
    ['VS-7 ssl', JA, edit.top('import ssl', 'ssl.create_default_context()'), 'network'],
    ['VS-7 import _socket', JA, edit.top('import _socket', '_socket.socket()'), 'dynamic'],
    ['VS-7 import _posixsubprocess', JA, edit.top('import _posixsubprocess', '_posixsubprocess.fork_exec'), 'dynamic'],
    ['VS-7 import posix', JA, edit.top('import posix', 'posix.system("git push " + b)'), 'direct'],
    ['VS-7 import nt', JA, edit.top('import nt', 'nt.system("git push " + b)'), 'direct'],
    ['VS-7 import runpy', JA, edit.top('import runpy', 'runpy.run_path("x.py")'), 'dynamic'],
    ['VS-7 import code', JA, edit.top('import code', 'code.interact()'), 'dynamic'],
    ['VS-7 import codeop', JA, edit.top('import codeop', 'codeop.compile_command("1")'), 'dynamic'],
    ['VS-7 from runpy import run_path', JA, edit.top('from runpy import run_path', 'run_path("x.py")'), 'dynamic'],
    ['VS-7 import _winapi', JA, edit.top('import _winapi', '_winapi.CreateProcess'), 'dynamic'],
    ['VS-7 os._exit style private attr', JA, fnb('os._exit(0)'), 'dynamic'],
    ['VS-7 subprocess._USE_POSIX_SPAWN', JA, fnb('subprocess._USE_POSIX_SPAWN'), 'dynamic'],
    ['VS-7 json._default_decoder private', JA, fnb('json._default_decoder'), 'dynamic'],
    ['VS-7 eval call', JA, fnb('eval("1")'), 'dynamic'],
    ['VS-7 exec call', JA, fnb('exec("import os")'), 'dynamic'],
    ['VS-7 compile call', JA, fnb('compile("1", "x", "eval")'), 'dynamic'],
    ['VS-7 __import__ call', JA, fnb('__import__("sub" + "process").run(["git", "push", b])'), 'dynamic'],
    ['VS-7 breakpoint call', JA, fnb('breakpoint()'), 'dynamic'],
    ['VS-7 importlib.import_module', JA, edit.top('import importlib', 'importlib.import_module("sub" + "process")'), 'dynamic'],
    ['VS-7 importlib.util', JA, edit.top('import importlib.util', 'importlib.util.find_spec("x")'), 'dynamic'],
    ['VS-7 from importlib import import_module', JA, edit.top('from importlib import import_module', 'import_module("x")'), 'dynamic'],
    ['VS-7 globals() call', JA, fnb('globals()'), 'dynamic'],
    ['VS-7 locals() call', JA, fnb('locals()'), 'dynamic'],
    ['VS-7 vars() no arg', JA, fnb('vars()'), 'dynamic'],
    ['VS-7 __builtins__ ref', JA, fnb('__builtins__'), 'dynamic'],
    ['VS-7 __builtins__ attribute walk', JA, fnb('__builtins__.__import__("subprocess")'), 'dynamic'],
    ['VS-7 globals via name rebind', JA, fnb('g = globals', 'g()'), 'dynamic'],
    ['VS-7 sys.modules subscript call chain (S3 seed)', JA, edit.top('import sys', 'sys.modules["subprocess"].run(["git", "push", b])'), 'none'],
    ['VS-7 print.__self__ builtins walk (S3 seed)', JA, fnb('print.__self__.__import__("subprocess").run(["git", "push", b])'), 'none'],
    ['VS-7 type walk subclasses (S3 seed)', JA, fnb('().__class__.__base__.__subclasses__()'), 'none'],
    ['VS-7 multiprocessing.Process', JA, edit.top('import multiprocessing', 'multiprocessing.Process(target=print).start()'), 'direct'],
    ['VS-7 ctypes.CDLL system', JA, edit.top('import ctypes', 'ctypes.CDLL(None).system(b"git push")'), 'direct'],
    ['VS-7 pty.spawn', JA, edit.top('import pty', 'pty.spawn(["git", "push"])'), 'direct'],
    ['VS-7 asyncio.create_subprocess_exec', JA, edit.top('import asyncio', 'asyncio.create_subprocess_exec("git", "push")'), 'direct'],
    ['VS-7 os.posix_spawn', JA, fnb('os.posix_spawn("/usr/bin/git", ["git", "push"], {})'), 'direct'],
    ['VS-7 os.fork', JA, fnb('os.fork()'), 'direct'],
    ['VS-7 os.forkpty', JA, fnb('os.forkpty()'), 'direct'],
    ['VS-7 os.startfile', JA, fnb('os.startfile("x")'), 'none'],
    ['VS-7 star import from subprocess', JA, edit.append('\n\nfrom subprocess import *\n'), 'dynamic'],
    ['VS-7 star import from os', JA, edit.append('\n\nfrom os import *\n'), 'dynamic'],
    ['VS-7 relative import of a watched name', JA, edit.append('\n\nfrom . import subprocess as _s\n'), 'imports'],
  ]
  assert.deepEqual(battery(rows), [])
})

test('verify cli VS-8: the loop script gains no process or network access', () => {
  const js = l => `\n${l}\n`
  const rows = [
    ['VS-8 process code', LOOP, js('const _a = process.env'), 'jsHits'],
    ['VS-8 process in string', LOOP, js('const _a = "process"'), 'jsHits'],
    ['VS-8 process in template', LOOP, js('const _a = `process`'), 'jsHits'],
    ['VS-8 process in comment', LOOP, js('// process'), 'jsHits'],
    ['VS-8 escaped \\u0070rocess', LOOP, js('const _a = "\\u0070rocess"'), 'jsHits'],
    ['VS-8 escaped \\u{70}rocess', LOOP, js('const _a = "\\u{70}rocess"'), 'jsHits'],
    ['VS-8 escaped upper hex \\u0050', LOOP, js('const _a = "\\u0050rocess"'), 'none'],
    ['VS-8 escaped require code', LOOP, js('const _a = req\\u0075ire("fs")'), 'jsHits'],
    ['VS-8 escaped child_process string', LOOP, js('const _a = "child\\u005fprocess"'), 'jsHits'],
    ['VS-8 escaped \\u{000070}', LOOP, js('const _a = "\\u{000070}rocess"'), 'jsHits'],
    ['VS-8 double-escaped \\\\u0070', LOOP, js('const _a = "\\\\u0070rocess"'), 'jsHits'],
    ['VS-8 require', LOOP, js('const _a = require("fs")'), 'jsHits'],
    ['VS-8 import()', LOOP, js('const _a = import("fs")'), 'jsHits'],
    ['VS-8 fetch', LOOP, js('fetch("https://x")'), 'jsHits'],
    ['VS-8 XMLHttpRequest', LOOP, js('new XMLHttpRequest()'), 'jsHits'],
    ['VS-8 WebSocket', LOOP, js('new WebSocket("wss://x")'), 'jsHits'],
    ['VS-8 EventSource', LOOP, js('new EventSource("x")'), 'jsHits'],
    ['VS-8 globalThis', LOOP, js('const _a = globalThis'), 'jsHits'],
    ['VS-8 global code', LOOP, js('const _a = global'), 'jsHits'],
    ['VS-8 global double-quoted', LOOP, js('const _a = "global"'), 'jsHits'],
    ['VS-8 global backtick', LOOP, js('const _a = `global`'), 'jsHits'],
    ['VS-8 fourth single-quoted global', LOOP, js("const _a = 'global'"), 'jsAllowed'],
    ['VS-8 single-quoted global plus process same line', LOOP, js("const _a = ['global', process]"), 'jsHits'],
    ['VS-8 eval', LOOP, js('eval("1")'), 'jsHits'],
    ['VS-8 Function', LOOP, js('Function("return 1")'), 'jsHits'],
    ['VS-8 Deno', LOOP, js('Deno.run'), 'jsHits'],
    ['VS-8 Bun', LOOP, js('Bun.spawn'), 'jsHits'],
    ['VS-8 navigator', LOOP, js('navigator.sendBeacon'), 'jsHits'],
    ['VS-8 Worker', LOOP, js('new Worker("x")'), 'jsHits'],
    ['VS-8 exec', LOOP, js('const _a = { exec: 1 }'), 'jsHits'],
    ['VS-8 execSync', LOOP, js('execSync("x")'), 'jsHits'],
    ['VS-8 execFile', LOOP, js('execFile("x")'), 'jsHits'],
    ['VS-8 execFileSync', LOOP, js('execFileSync("x")'), 'jsHits'],
    ['VS-8 spawn', LOOP, js('spawn("x")'), 'jsHits'],
    ['VS-8 spawnSync', LOOP, js('spawnSync("x")'), 'jsHits'],
    ['VS-8 fork', LOOP, js('fork("x")'), 'jsHits'],
    ['VS-8 child_process', LOOP, js('const _a = "child_process"'), 'jsHits'],
    ['VS-8 process on a line with the allowed literal escaped', LOOP, js("const _a = '\\u0067lobal'; process"), 'jsHits'],
    ['VS-8 unicode-escaped quote around global', LOOP, js("const _a = \\u0027global\\u0027"), 'jsAllowed'],
    ['VS-8 \\x70rocess hex escape in string (S3 seed)', LOOP, js('const _a = "\\x70rocess"'), 'none'],
    ['VS-8 octal escape string (S3 seed)', LOOP, js('const _a = "\\160rocess"'), 'none'],
    ['VS-8 string concat pro+cess (S3 seed)', LOOP, js('const _a = "pro" + "cess"'), 'none'],
    ['VS-8 this walk (S3 seed)', LOOP, js('const _a = this.constructor'), 'none'],
    ['VS-8 SharedWorker / importScripts / WebTransport (outside list)', LOOP, js('const _a = [SharedWorker, importScripts, WebTransport, RTCPeerConnection]'), 'none'],
    ['VS-8 module.require / Module._load', LOOP, js('const _a = module.require'), 'jsHits'],
    ['VS-8 line comment containing banned id in the allowlist literal line', LOOP, js("// 'global' fetch"), 'jsHits'],
  ]
  const bad = battery(rows)
  const dir = copyTree()
  const base = guard(dir).out
  const rj = readFileSync(join(ROOT, LOOP), 'utf8').split('\n').filter(l => l.includes("'global'"))
  log(`\n=== VS-8 decisionPanel allowed lines\n${rj.join('\n')}`)
  assert.equal(base.jsAllowed.length, 3)
  assert.ok(base.jsAllowed.every(l => l.includes("q.sliceId || 'global'")), 'the three allowed lines are not the decisionPanel lines')
  assert.deepEqual(bad, [])
})

test('verify cli VS-9: the loop hands its verify branch builder only to the profile agent and the collector', () => {
  const src = readFileSync(join(ROOT, LOOP), 'utf8')
  const probeBranch = (label, fn) => {
    const mut = fn(src)
    assert.notEqual(mut, src, label)
    const dir = r.dir('loop')
    mkdirSync(join(dir, 'skills/sdlc'), { recursive: true })
    cpSync(join(ROOT, 'skills/sdlc/test/push-guard.test.mjs'), join(dir, 'skills/sdlc/test/push-guard.test.mjs'), { recursive: true })
    cpSync(join(ROOT, 'skills/sdlc/test/harness.mjs'), join(dir, 'skills/sdlc/test/harness.mjs'))
    cpSync(join(ROOT, 'skills/sdlc/test/push_guard.py'), join(dir, 'skills/sdlc/test/push_guard.py'))
    for (const f of ['sdlc-loop.js']) writeFileSync(join(dir, 'skills/sdlc', f), mut)
    cpSync(join(ROOT, 'skills/sdlc'), join(dir, 'skills/sdlc'), { recursive: true, filter: s => !s.endsWith('sdlc-loop.js') && !s.endsWith('/test') })
    writeFileSync(join(dir, 'skills/sdlc/sdlc-loop.js'), mut)
    cpSync(join(ROOT, 'hooks'), join(dir, 'hooks'), { recursive: true })
    try { cpSync(join(ROOT, 'package.json'), join(dir, 'package.json')) } catch {}
    const t = r.exec('node', ['--test', '--test-name-pattern=verify branch builder', join(dir, 'skills/sdlc/test/push-guard.test.mjs')], { cwd: dir })
    log(`\n=== VS-9 ${label}\nexit ${t.status}\n${(t.stdout + t.stderr).split('\n').filter(l => /✔|✖|pass|fail|branch references|AssertionError/.test(l)).slice(0, 12).join('\n')}`)
    return t.status
  }
  assert.equal(probeBranch('unmutated', s => s + '\n// noop\n'), 0, 'unmutated copy must pass T-R-119d')
  const where = s => s.replace('const branch = g =>', 'const branch = g =>')
  const mutants = [
    ['a branch reference added in verifyPhase (log line)', s => s.replace('  let unavailable = []', '  let unavailable = []\n  log(`x ${branch({ profile: "p", part: 0 })}`)')],
    ['branch passed to the toolsmith', s => s.replace("run('verify-toolsmith', { sliceId: id, round, tools }", "run('verify-toolsmith', { sliceId: id, round, tools, b: branch({ profile: 'x', part: 0 }) }")],
    ['branch passed to the verifier lens', s => s.replace("run('verifier', { sliceId: id, lens, round, scope: 'slice' }", "run('verifier', { sliceId: id, lens, round, scope: 'slice', b: branch })")],
    ['verify branch name rebuilt by template in the toolsmith call (seed: name, not the builder)', s => s.replace("run('verify-toolsmith', { sliceId: id, round, tools }", "run('verify-toolsmith', { sliceId: id, round, tools, name: `sdlc/${id}-v${round}-cli-0` }"), 'seed'],
    ['branch builder in a new line inside verifyPhase', s => s.replace('  let unavailable = []', '  let unavailable = []\n  const _leak = branch'), 'fail'],
    ['alias of the builder made on the collector line (seed: test counts lines)', s => s.replace("const c = await run('verify-collector'", "const _l = branch; const c = await run('verify-collector'"), 'seed'],
  ]
  const bad = []
  for (const [label, fn, want = 'fail'] of mutants) {
    let code
    try { code = probeBranch(label, fn) } catch (e) { bad.push(`${label}: could not build mutant: ${e.message}`); continue }
    if (want === 'seed') log(`  seed probe: T-R-119d exit ${code}`)
    else if (code === 0) bad.push(`${label}: T-R-119d still passes`)
  }
  assert.deepEqual(bad, [])
})

test('verify cli seed probes S1, S3, S5 stay unflagged and are recorded, not refutations', () => {
  const rows = [
    ['seed S1 for-loop rebinds the variable pushed by a reviewed call', SW, edit.once('    git(repo, "push", "-q", "-u", "origin", want, check=False)', '    for want in [\"x\"]:\n        git(repo, "push", "-q", "-u", "origin", want, check=False)'.replace(/\\"/g, '"')), 'none'],
    ['seed S1 duplicate of a reviewed push line (same text)', SW, edit.after('    git(repo, "push", "-q", "-u", "origin", want, check=False)', ['    git(repo, "push", "-q", "-u", "origin", want, check=False)']), 'none'],
    ['seed S5 python file under a nested fixtures directory', 'skills/sdlc/tracker/fixtures/x.py', 'import subprocess\nsubprocess.run(["git", "push"])\n', 'none'],
    ['seed S5 python file under a nested test directory', 'skills/sdlc/tracker/test/x.py', 'import subprocess\nsubprocess.run(["git", "push"])\n', 'none'],
    ['seed S3 sys.modules call chain', JA, edit.top('import sys', 'sys.modules["subprocess"].run(["git", "push", b])'), 'none'],
    ['seed S3 print.__self__ builtins walk', JA, edit.append(edit.fn('(b)', 'print.__self__.__import__("subprocess").run(["git", "push", b])')), 'none'],
  ]
  const seen = rows.map(([label, file, e, want]) => [label, probe(label, file, e)])
  for (const [label, keys] of seen) assert.deepEqual(keys, [], `${label} unexpectedly changed ${keys}`)
})
