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
const { moduleLoader } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/module-loader.mjs')).href)

const r = cliRunner()
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `push_guard.py verify-cli r2 transcripts, root ${ROOT}\n`)
const log = text => appendFileSync(LOG, `${text}\n`)

const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const BR = 'skills/sdlc/branches.py'
const CO = 'skills/sdlc/tracker/collect.py'
const HUB = 'skills/sdlc/tracker/hub.py'
const PY = '/opt/homebrew/bin/python3'

const named = r.run('branches.py', ['name', '--repo', ROOT, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'cli', '--part', '0'], { skillDir: join(ROOT, 'skills/sdlc') })
const V = named.json.branch
log(`verify branch from branches.py name --kind verify: ${V}\n${named.text()}`)

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

function probe(id, label, file, code) {
  const dir = copyTree()
  apply(dir, file, code)
  const { out, t } = guard(dir)
  const changed = delta(out)
  log(`\n=== ${id} ${label}\n$ ${t.argv.join(' ')}\nexit: ${t.status} (${t.durationMs} ms) tree unchanged: ${t.treeUnchanged}\nchanged keys: ${Object.keys(changed).join(', ') || '<none>'}`)
  for (const [k, d] of Object.entries(changed)) {
    log(`  ${k} (${d.count})`)
    for (const a of d.added) log(`    + ${a}`)
    for (const x of d.removed) log(`    - ${x}`)
  }
  return { keys: Object.keys(changed), changed, out }
}

const GIT_VERSION = r.exec('git', ['--version'], { watch: [] }).stdout.trim()

function behave(id, label, file, code, args = []) {
  const ml = moduleLoader({ runner: r, python: PY })
  const dir = copyTree()
  apply(dir, file, code)
  const { out } = guard(dir)
  const keys = Object.keys(delta(out))
  const { remote, repo } = ml.bareRemote({ branches: [V] })
  const t = ml.call(file, '_mutant', [repo, V, ...args], { root: dir, remote })
  log(`\n=== ${id} behavior ${label}\n${GIT_VERSION}\nguard changed keys: ${keys.join(', ') || '<none>'}\n${t.text()}\npushed ${V}: ${t.pushed(V)}`)
  return { keys, pushed: t.pushed(V), t }
}

const fn = (head, ...lines) => `\n\ndef ${head}:\n${lines.map(l => `    ${l}`).join('\n')}\n`
const late = (body, imp) => `\n\ndef _mutant(repo, b):\n    ${body}\n\n\n${imp}\n`
const UP = `--upload-pack=git push origin ${V};:`
const PUSHCMD = `git push origin ${V};:`

test('verify cli TC-cli-32: a new option after a known wrapper verb, in any spelling, breaks a pin or is opaque (re-run)', () => {
  const W = ['wrapperVerbs', 'opaque', 'pushes']
  const cases = [
    ['m1 f-string with a leading formatted value, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", f"{''}${UP}", check=False)`)],
    ['m2 .strip() of a constant option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}".strip(), check=False)`)],
    ['m3 str() of a constant option through next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", str("${UP}"))`)],
    ['local list spread after the verb, state-write.py', SW, fn('_mutant(repo, b)', `opts = ["${UP}"]`, 'git(repo, "fetch", "origin", *opts, check=False)')],
    ['inline starred list after the verb, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", *["${UP}"], check=False)`)],
    ['option split as two tokens, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "--upload-pack", "${PUSHCMD}", "origin", check=False)`)],
    ['--receive-pack on push, state-write.py', SW, fn('_mutant(repo, b)', 'git(repo, "push", "--receive-pack=git-receive-pack", "origin", "main", check=False)')],
    ['--exec on push, state-write.py', SW, fn('_mutant(repo, b)', 'git(repo, "push", "--exec=git-receive-pack", "origin", "main", check=False)')],
    ['--exec on fetch, next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "--exec=${PUSHCMD}", "origin")`)],
    ['-u on fetch, state-write.py', SW, fn('_mutant(repo, b)', 'git(repo, "fetch", "-u", "origin", check=False)')],
    ['abbreviated --upl on fetch, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "--upl=${PUSHCMD}", "origin", check=False)`)],
    ['whitespace-padded option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", " ${UP}", check=False)`)],
    ['option glued by + after a constant prefix, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "--upload" + "-pack=${PUSHCMD}", check=False)`)],
    ['option from format(), state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "{}".format("${UP}"), check=False)`)],
    ['option from a % format, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "%s" % "${UP}", check=False)`)],
    ['option from join, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "".join(["--upload-pack=", "${PUSHCMD}"]), check=False)`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-32', label, file, code)
    if (!p.keys.some(k => W.includes(k))) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  const confusable = probe('TC-cli-32', 'observation: confusable hyphen U+2010 in front of upload-pack', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "‐‐upload-pack=${PUSHCMD}", check=False)`))
  log(`  observation: the U+2010 form changes ${confusable.keys.join(', ') || 'no key'}; git reads it as a refspec, not as an option`)
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-33: the hidden-option mutants do not push a verify branch while the guard passes (re-run)', () => {
  const cases = [
    ['m1 state-write.py f-string option', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", f"{''}${UP}", check=False)`)],
    ['m2 state-write.py .strip() option', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}".strip(), check=False)`)],
    ['m3 next-action.py str() option', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", str("${UP}"))`)],
    ['local list spread after the verb, state-write.py', SW, fn('_mutant(repo, b)', `opts = ["${UP}"]`, 'git(repo, "fetch", "origin", *opts, check=False)')],
    ['option from format(), state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "{}".format("${UP}"), check=False)`)],
    ['option from join, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "".join(["--upload-pack=", "${PUSHCMD}"]), check=False)`)],
    ['control: plain constant option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}", check=False)`)],
  ]
  const leaked = []
  for (const [label, file, code] of cases) {
    const b = behave('TC-cli-33', label, file, code)
    if (b.pushed && b.keys.length === 0) leaked.push(`${label}: pushed ${V} with every key equal`)
    if (label.startsWith('control') && !(b.pushed && b.keys.length)) leaked.push(`${label}: the control did not push or the guard did not flag it`)
  }
  assert.deepEqual(leaked, [], leaked.join('\n'))
})

test('verify cli TC-cli-34: on the clean tree opaque is empty and no wrapperVerbs entry can run a command (re-run)', () => {
  const opts = CLEAN.wrapperVerbs.filter(e => e.split(' ').length === 4)
  const values = CLEAN.wrapperVerbs.filter(e => e.split(' ')[2] === 'value')
  log(`\n=== TC-cli-34 clean wrapperVerbs option entries (${opts.length})\n${opts.join('\n')}\nvalue entries (${values.length})\n${values.join('\n')}`)
  assert.deepEqual(CLEAN.opaque, [])
  assert.deepEqual(CLEAN.dynamic, [])
  assert.deepEqual(CLEAN.forgeViolations, [])
  const RUNS = /^--(upload-pack|receive-pack|exec|config|config-env|exec-path|git-dir|work-tree)$|^-c$|^-u$/
  const bad = opts.filter(e => {
    const [, , verb, opt] = e.split(' ')
    if (opt === '-u') return verb === 'fetch' || verb === 'clone' || verb === 'ls-remote'
    return RUNS.test(opt)
  })
  const badValues = values.filter(e => /upload-pack|receive-pack|--exec|fsmonitor|sshCommand|-c\b/.test(e))
  assert.deepEqual(bad, [])
  assert.deepEqual(badValues, [])
})

test('verify cli TC-cli-35: a corpus whitespace or invisible character in front of a hidden option breaks a pin or does not push (re-run)', () => {
  const leaked = []
  const seen = []
  for (const e of load('unicode-whitespace')) {
    if (typeof e.value !== 'string' || e.value.includes('\0') || /[\ud800-\udfff]/.test(e.value)) continue
    const b = behave('TC-cli-35', `corpus ${e.id} in front of the option, state-write.py`, SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", ${JSON.stringify(e.value + UP)}, check=False)`))
    seen.push(`${e.id}: keys ${b.keys.join(', ') || '<none>'}; pushed ${b.pushed}`)
    if (b.pushed && b.keys.length === 0) leaked.push(e.id)
  }
  log(`\n=== TC-cli-35 summary\n${seen.join('\n')}`)
  assert.deepEqual(leaked, [])
})

test('verify cli TC-cli-36: an option after a known wrapper verb as a bytes constant breaks a pin or is opaque', () => {
  const W = ['wrapperVerbs', 'opaque', 'pushes']
  const cases = [
    ['bytes --upload-pack after fetch, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", b"${UP}", check=False)`)],
    ['bytes --upload-pack after fetch, suite-receipt.py', SR, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", b"${UP}")`)],
    ['bytes --upload-pack after fetch through next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", b"${UP}")`)],
    ['bytes --upload-pack after ls-remote through impact git_lines', IM, fn('_mutant(repo, b)', `git_lines(["ls-remote", b"${UP}", "origin"], repo)`)],
    ['bytes -u then a separate command after fetch, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", b"-u", "${PUSHCMD}", "origin", check=False)`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-36', label, file, code)
    if (!p.keys.some(k => W.includes(k))) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-37: the bytes option mutants do not push a verify branch while the guard passes', () => {
  const cases = [
    ['bytes --upload-pack after fetch, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", b"${UP}", check=False)`)],
    ['bytes --upload-pack after fetch, suite-receipt.py', SR, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", b"${UP}")`)],
    ['bytes --upload-pack after fetch through next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", b"${UP}")`)],
  ]
  const leaked = []
  for (const [label, file, code] of cases) {
    const b = behave('TC-cli-37', label, file, code)
    if (b.pushed && b.keys.length === 0) leaked.push(`${label}: pushed ${V} with every key equal`)
  }
  assert.deepEqual(leaked, [], leaked.join('\n'))
})

test('verify cli TC-cli-38: other spellings of an option after a known wrapper verb break a pin or are opaque', () => {
  const W = ['wrapperVerbs', 'opaque', 'pushes']
  const cases = [
    ['whole argv starred into the state-write git wrapper', SW, fn('_mutant(repo, b)', `git(*[repo, "fetch", "origin", "${UP}"], check=False)`)],
    ['whole argv from a local list into the next-action run wrapper', NA, fn('_mutant(repo, b)', `a = [repo, "git", "fetch", "origin", "${UP}"]`, 'run(*a)')],
    ['option from a conditional expression, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}" if repo else "-q", check=False)`)],
    ['option from a subscript, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", ["${UP}"][0], check=False)`)],
    ['option from a walrus, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", (o := "${UP}"), check=False)`)],
    ['option through a keyword dict spread, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", *("${UP}",), **{"check": False})`)],
    ['option in a tuple literal argv of impact git_lines', IM, fn('_mutant(repo, b)', `git_lines(list(("fetch", "${UP}", "origin")), repo)`)],
    ['option in a list concatenation argv of impact git_lines', IM, fn('_mutant(repo, b)', `git_lines(["fetch"] + ["${UP}", "origin"], repo)`)],
    ['option in a list repeat argv of impact git_lines', IM, fn('_mutant(repo, b)', `git_lines(["fetch", "${UP}", "origin"] * 1, repo)`)],
    ['option in impact run argv with a non-git program list', IM, fn('_mutant(repo, b)', `run(["git", "fetch", "${UP}", "origin"], repo)`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-38', label, file, code)
    if (!p.keys.some(k => W.includes(k))) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-25: seed probe S1: a variable option after a known wrapper verb (re-run)', () => {
  const b = behave('TC-cli-25', 'option from a parameter, state-write.py', SW, fn('_mutant(repo, b, opt)', 'git(repo, "fetch", "-q", "origin", opt, check=False)'), [UP])
  log(`  seed S1 observation: keys ${b.keys.join(', ') || '<none>'}; pushed ${b.pushed}`)
  assert.ok(b.t.outcome === 'return' || b.t.outcome === 'exception', b.t.text())
})

test('verify cli TC-cli-101: a git option before the verb that can run a command or change the target is opaque', () => {
  const fsm = `core.fsmonitor=${PUSHCMD}`
  const opts = [
    ['-c glued to its value', [`-c${fsm}`]],
    ['-c with its value', ['-c', fsm]],
    ['--config-env', ['--config-env=core.fsmonitor=SDLC_X']],
    ['--config-env as two tokens', ['--config-env', 'core.fsmonitor=SDLC_X']],
    ['--exec-path', ['--exec-path=/tmp/x']],
    ['--git-dir', ['--git-dir=/tmp/r.git']],
    ['--git-dir as two tokens', ['--git-dir', '/tmp/r.git']],
    ['--work-tree', ['--work-tree=/tmp']],
    ['--namespace', ['--namespace=x']],
    ['--super-prefix', ['--super-prefix=x/']],
    ['--attr-source', ['--attr-source=HEAD']],
    ['abbreviated --exec-pa', ['--exec-pa=/tmp/x']],
    ['abbreviated --conf', [`--conf=${fsm}`]],
    ['-p', ['-p']],
    ['--paginate', ['--paginate']],
    ['--list-cmds', ['--list-cmds=main']],
  ]
  const q = a => a.map(x => JSON.stringify(x)).join(', ')
  const missed = []
  for (const [label, o] of opts) {
    const sites = [
      ['state-write git wrapper', SW, fn('_mutant(repo, b)', `git(repo, ${q(o)}, "diff", check=False)`)],
      ['suite-receipt git wrapper', SR, fn('_mutant(repo, b)', `git(repo, ${q(o)}, "rev-parse", "HEAD")`)],
      ['next-action run wrapper', NA, fn('_mutant(repo, b)', `run(repo, "git", ${q(o)}, "fetch", "-q", "origin")`)],
      ['impact git_lines wrapper', IM, fn('_mutant(repo, b)', `git_lines([${q(o)}, "diff"], repo)`)],
      ['janitor direct list-literal site', JA, fn('_mutant(repo, b)', `subprocess.run(["git", "-C", repo, ${q(o)}, "diff"])`)],
      ['janitor shell=True site', JA, fn('_mutant(repo, b)', `subprocess.run("git -C " + repo + " ${o.join(' ').replaceAll('"', '\\"')} diff", shell=True)`)],
    ]
    for (const [where, file, code] of sites) {
      const p = probe('TC-cli-101', `${label} at the ${where}`, file, code)
      if (!p.keys.includes('opaque')) missed.push(`${label} at the ${where}: ${p.keys.join(', ') || 'no key'}`)
    }
  }
  assert.deepEqual(missed, [], `no opaque entry for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-105: the five allowed git flag options before the verb cannot run a command or push', () => {
  const flags = ['--no-pager', '--no-optional-locks', '--literal-pathspecs', '--no-replace-objects', '--bare']
  const leaked = []
  for (const f of flags) {
    const b = behave('TC-cli-105', `${f} before diff, state-write.py`, SW, fn('_mutant(repo, b)', `return git(repo, "${f}", "diff", check=False).returncode`))
    log(`  ${f}: keys ${b.keys.join(', ') || '<none>'}; pushed ${b.pushed}; outcome ${b.t.outcome} value ${JSON.stringify(b.t.value)}`)
    if (b.pushed) leaked.push(f)
  }
  assert.deepEqual(leaked, [])
})

test('verify cli TC-cli-106: a bytes git option before the verb breaks a pin', () => {
  const cases = [
    ['bytes -c before diff, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, b"-c", b"core.fsmonitor=${PUSHCMD}", "diff", check=False)`)],
    ['bytes -c glued before rev-parse, suite-receipt.py', SR, fn('_mutant(repo, b)', `git(repo, b"-ccore.fsmonitor=${PUSHCMD}", "rev-parse", "HEAD")`)],
    ['bytes --config-env through next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", b"--config-env=core.fsmonitor=SDLC_X", "fetch", "-q", "origin")`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-106', label, file, code)
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-102: an import alias bound anywhere in a module resolves to the watched module', () => {
  const run = 'sp.run(["git", "-C", repo, "push", "origin", b])'
  const cases = [
    ['import subprocess as sp after its use, janitor.py', JA, late(run, 'import subprocess as sp')],
    ['from subprocess import run as _r after use, state-write.py', SW, late('_r(["git", "-C", repo, "push", "origin", b])', 'from subprocess import run as _r')],
    ['import os as _o after use, branches.py', BR, late('_o.system("git -C " + repo + " push origin " + b)', 'import os as _o')],
    ['import in another function, janitor.py', JA, `\n\ndef _load():\n    global sp\n    import subprocess as sp\n\n\ndef _mutant(repo, b):\n    ${run}\n`],
    ['import in a try block, state-write.py', SW, late('_p(["git", "-C", repo, "push", "origin", b])', 'try:\n    from subprocess import Popen as _p\nexcept ImportError:\n    _p = None')],
    ['import in an if block, branches.py', BR, late('_s("git -C " + repo + " push origin " + b)', 'if True:\n    from os import system as _s')],
    ['import in a class body then a module alias, janitor.py', JA, late(run, 'class _K:\n    import subprocess as sp\n\n\nsp = _K.sp')],
    ['one name bound to json and to subprocess, janitor.py', JA, `\n\nimport json as sp\n\n\ndef _mutant(repo, b):\n    import subprocess as sp\n    ${run}\n`],
    ['import alias then reassigned to json, janitor.py', JA, `\n\nimport subprocess as sp\nsp = json\n\n\ndef _mutant(repo, b):\n    ${run}\n`],
    ['assignment then import of the same name, janitor.py', JA, `\n\nsp = json\n\n\ndef _mutant(repo, b):\n    import subprocess as sp\n    ${run}\n`],
    ['del of an alias then a fresh import, janitor.py', JA, `\n\nimport subprocess as sp\ndel sp\n\n\ndef _mutant(repo, b):\n    import subprocess as sp\n    ${run}\n`],
    ['import in a lambda default via __import__, janitor.py', JA, fn('_mutant(repo, b)', `(lambda m=__import__("subprocess"): m.run(["git", "-C", repo, "push", "origin", b]))()`)],
    ['import inside a comprehension body function, janitor.py', JA, fn('_mutant(repo, b)', '[f() for f in [lambda: __import__("os")]][0].system("git -C " + repo + " push origin " + b)')],
    ['from os import system after use with no alias, branches.py', BR, late('system("git -C " + repo + " push origin " + b)', 'from os import system')],
    ['import subprocess late in hub.py', HUB, late(run, 'import subprocess as sp')],
    ['import os late in collect.py as a pure-looking name', CO, late('posixpath.system("git -C " + repo + " push origin " + b)', 'import os as posixpath')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-102', label, file, code)
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-107: on the clean tree dynamic is empty, so no file has a rebound import name', () => {
  log(`\n=== TC-cli-107 clean dynamic: ${JSON.stringify(CLEAN.dynamic)}`)
  assert.deepEqual(CLEAN.dynamic, [])
})

test('verify cli TC-cli-103: a process call through a submodule attribute chain breaks a pin', () => {
  const cmd = '"git -C " + repo + " push origin " + b'
  const chains = [
    ['os.path.os.system', JA, ''],
    ['posixpath.os.system', JA, 'import posixpath'],
    ['shutil.os.system', JA, ''],
    ['pathlib.os.system', JA, 'import pathlib'],
    ['tempfile._os.system', JA, 'import tempfile'],
    ['json.decoder.re.purge', JA, ''],
    ['urllib.request.os.system', CO, ''],
    ['subprocess.os.system', JA, ''],
    ['glob.os.system', JA, 'import glob'],
    ['fnmatch.os.system', JA, 'import fnmatch'],
    ['fnmatch.posixpath.os.system', JA, 'import fnmatch'],
    ['mimetypes.os.system', JA, 'import mimetypes'],
    ['argparse._os.system', JA, 'import argparse'],
    ['branches.os.system', JA, 'import branches'],
  ]
  const missed = []
  for (const [chain, file, imp] of chains) {
    const call = chain.endsWith('purge') ? `${chain}()` : `${chain}(${cmd})`
    const code = (imp ? `\n${imp}\n` : '') + fn('_mutant(repo, b)', call)
    const p = probe('TC-cli-103', `${chain} in ${basename(file)}`, file, code)
    if (p.keys.length === 0 && !chain.endsWith('purge')) missed.push(`${chain} in ${basename(file)}`)
  }
  const aliased = [
    ['import os.path as osp then osp.os.system, branches.py', BR, `\n\nimport os.path as osp\n\n\ndef _mutant(repo, b):\n    osp.os.system(${cmd})\n`],
    ['from os import path as _p then _p.os.system, branches.py', BR, `\n\nfrom os import path as _p\n\n\ndef _mutant(repo, b):\n    _p.os.system(${cmd})\n`],
    ['import shutil as sh then sh.os.system, janitor.py', JA, `\n\nimport shutil as sh\n\n\ndef _mutant(repo, b):\n    sh.os.system(${cmd})\n`],
    ['from shutil import os as o then o.system, janitor.py', JA, `\n\nfrom shutil import os as o\n\n\ndef _mutant(repo, b):\n    o.system(${cmd})\n`],
    ['import tempfile as _t then _t.os.system, janitor.py', JA, `\n\nimport tempfile as _t\n\n\ndef _mutant(repo, b):\n    _t.os.system(${cmd})\n`],
    ['from glob import os then os.system under a new name, janitor.py', JA, `\n\nfrom glob import os as g\n\n\ndef _mutant(repo, b):\n    g.system(${cmd})\n`],
    ['import subprocess late then sp.os.system, janitor.py', JA, late(`sp.os.system(${cmd})`, 'import subprocess as sp')],
    ['asyncio.subprocess chain through an alias, janitor.py', JA, `\n\nimport asyncio as aio\n\n\ndef _mutant(repo, b):\n    aio.run(aio.subprocess.create_subprocess_shell(${cmd}))\n`],
    ['from os import path then path.os.system with no alias, branches.py', BR, `\n\nfrom os import path\n\n\ndef _mutant(repo, b):\n    path.os.system(${cmd})\n`],
  ]
  for (const [label, file, code] of aliased) {
    const p = probe('TC-cli-103', label, file, code)
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-104: each guard-miss mutant from every round pushes a verify branch only when the guard flags it', () => {
  const cmd = '"git -C " + repo + " push -q origin " + b'
  const mutants = [
    ['r0 D-1 -c core.fsmonitor before diff, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git push -q origin " + b + "; echo", "diff", check=False)`)],
    ['r0 TC-cli-17 late alias import subprocess as sp, janitor.py', JA, late('sp.run(["git", "-C", repo, "push", "-q", "origin", b])', 'import subprocess as sp')],
    ['r0 TC-cli-17 late from subprocess import run as _r, state-write.py', SW, late('_r(["git", "-C", repo, "push", "-q", "origin", b])', 'from subprocess import run as _r')],
    ['r0 TC-cli-17 late import os as _o, branches.py', BR, late(`_o.system(${cmd})`, 'import os as _o')],
    ['r0 TC-cli-18 -c core.fsmonitor with $IFS, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git\${IFS}push\${IFS}-q\${IFS}origin\${IFS}${V};echo", "diff", check=False)`)],
    ['r0 TC-cli-18 -c core.fsmonitor before rev-parse, suite-receipt.py', SR, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git push -q origin ${V}; echo", "rev-parse", "HEAD")`)],
    ['r0 TC-cli-18 -c core.fsmonitor at a direct site, janitor.py', JA, fn('_mutant(repo, b)', `subprocess.run(["git", "-C", repo, "-c", "core.fsmonitor=git push -q origin ${V}; echo", "diff"])`)],
    ['r1 TC-cli-23 -c glued, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-ccore.fsmonitor=git push -q origin ${V}; echo", "diff", check=False)`)],
    ['r1 D-1 m1 f-string option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", f"{''}${UP}", check=False)`)],
    ['r1 D-1 m3 str() option, next-action.py', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", str("${UP}"))`)],
    ['r1 TC-cli-27 os.path.os.system, janitor.py', JA, fn('_mutant(repo, b)', `os.path.os.system(${cmd})`)],
    ['r1 TC-cli-27 from os import path as _p, _p.os.system, branches.py', BR, `\n\nfrom os import path as _p\n\n\ndef _mutant(repo, b):\n    _p.os.system(${cmd})\n`],
    ['r2 TC-cli-37 bytes --upload-pack option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", b"${UP}", check=False)`)],
  ]
  const leaked = []
  const rows = []
  for (const [label, file, code] of mutants) {
    const b = behave('TC-cli-104', label, file, code)
    rows.push(`${label}: guard keys ${b.keys.join(', ') || '<none>'}; outcome ${b.t.outcome}; pushed ${b.pushed}`)
    if (b.pushed && b.keys.length === 0) leaked.push(label)
  }
  log(`\n=== TC-cli-104 summary (${GIT_VERSION})\n${rows.join('\n')}`)
  assert.deepEqual(leaked, [], `the guard passed these mutants, and each pushed ${V} to the bare remote:\n${leaked.join('\n')}`)
})
