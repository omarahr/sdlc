import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT ?? resolve(HERE, '../../../../../../..')
const GUARD = join(ROOT, 'skills/sdlc/test/push_guard.py')
const LOG = process.env.VERIFY_LOG ?? resolve(HERE, '../../logs/cli-0-plan-r1-transcripts.txt')
const { cliRunner } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs')).href)
const { load } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/attack-corpus.mjs')).href)
const { moduleLoader } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/module-loader.mjs')).href)

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

test('verify cli TC-cli-1: D-1 m1 to m3 in the next-action run body change wrapperBodies', () => {
  const forms = [
    'run(repo, "gh", "api", "-X", "POST", *cmd)',
    `run(repo, "gh", "api", "-f", "head=${V}", "-f", "base=main", *cmd)`,
    'run(repo, "gh", "api", "--method=POST", *cmd)',
  ]
  const missed = []
  for (const f of forms) {
    const p = probe('TC-cli-1', f, [[NA, inBody('def run(repo, *cmd):', 'if cmd and cmd[0] == "git":', `    ${f}`)]])
    if (!p.keys.includes('wrapperBodies')) missed.push(`${f}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-2: every TC-cli-18 and TC-cli-20 form in each of the five bodies changes wrapperBodies', () => {
  const forms = [
    'git(repo, check)',
    `git(repo, "-c", "remote.origin.push=refs/heads/${V}", check)`,
    'git(repo, "--no-pager", check)',
    'git(".", repo)',
    `git(".", "-c", "remote.origin.push=refs/heads/${V}", repo)`,
    'run(["git", repo], ".")',
    'git_lines([repo], ".")',
    'run(["git", cwd], ".")',
    'run(".", "git", repo)',
    'run(".", "gh", "api", "-X", "POST", *cmd)',
    'run(repo, "gh", "api", "--method=PATCH", *cmd)',
    `run(repo, "gh", "api", "-f", "ref=refs/heads/${V}", *cmd)`,
    'run(repo, "gh", "api", "--input", "-", *cmd)',
    'run(".", "gh", "pr", repo)',
    'run(".", "gh", "-R", "o/r", repo)',
    'run(".", "gh", "api", repo)',
  ]
  const missed = []
  for (const [name, file, anchor] of BODIES) {
    for (const f of forms) {
      const p = probe('TC-cli-2', `${name}: ${f}`, [[file, inBody(anchor, 'if False:', `    ${f}`)]])
      if (!p.keys.includes('wrapperBodies')) missed.push(`${name}: ${f}: ${p.keys.join(', ') || 'no key'}`)
    }
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-3: control-flow push forms inside a body change wrapperBodies', () => {
  const cases = [
    ['conditional verb in the state-write git body', SW, 'def git(repo, *args, check=True):', [`git(repo, "push" if check else "status", "origin", "${V}", check=False)`]],
    ['parameter rebound before the call in the state-write git body', SW, 'def git(repo, *args, check=True):', [`args = ("push", "origin", "${V}")`]],
    ['parameter rebound before the call in the next-action run body', NA, 'def run(repo, *cmd):', [`cmd = ("git", "push", "origin", "${V}")`]],
    ['parameter rebound before the call in the impact run body', IM, 'def run(args, cwd):', [`args = ["git", "push", "origin", "${V}"]`]],
    ['try/finally push in the suite-receipt git body', SR, 'def git(repo, *args):', ['try:', '    pass', 'finally:', `    subprocess.run(["git", "-C", repo, "push", "origin", "${V}"])`]],
    ['with block push in the impact git_lines body', IM, 'def git_lines(args, repo):', ['with open(repo) as _f:', `    run(["git", "push", "origin", "${V}"], repo)`]],
    ['lambda push in the next-action run body', NA, 'def run(repo, *cmd):', [`_p = lambda: subprocess.run(["git", "push", "origin", "${V}"], cwd=repo)`, '_p()']],
    ['comprehension push in the state-write git body', SW, 'def git(repo, *args, check=True):', [`[subprocess.run(["git", "-C", repo, v, "origin", "${V}"]) for v in ("push",)]`]],
  ]
  const missed = []
  for (const [label, file, anchor, lines] of cases) {
    const p = probe('TC-cli-3', label, [[file, inBody(anchor, ...lines)]])
    if (!p.keys.includes('wrapperBodies')) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-4: a push through a helper outside the body breaks a pin twice', () => {
  const p = probe('TC-cli-4', 'helper _h defined at module level and called from the state-write git body', [
    [SW, inBody('def git(repo, *args, check=True):', 'if args and args[0] == "fetch":', '    _h(repo)')],
    [SW, fn('_h(repo)', `git(repo, "push", "origin", "${V}", check=False)`)],
  ])
  assert.ok(p.keys.includes('wrapperBodies'), p.keys.join(', '))
  assert.ok(p.keys.includes('pushes'), p.keys.join(', '))
  const q = probe('TC-cli-4', 'helper with a parameter verb at a direct site, called from the impact run body', [
    [IM, inBody('def run(args, cwd):', '_h(cwd, "push")')],
    [IM, fn('_h(repo, v)', `subprocess.run(["git", "-C", repo, v, "origin", "${V}"])`)],
  ])
  assert.ok(q.keys.includes('wrapperBodies'), q.keys.join(', '))
  assert.ok(q.keys.includes('opaque') && q.keys.includes('direct'), q.keys.join(', '))
})

test('verify cli TC-cli-5: a changed signature, default or decorator changes wrapperBodies', () => {
  const cases = [
    ['decorator on the state-write git def', SW, swap('def git(repo, *args, check=True):', '@(lambda f: f)\ndef git(repo, *args, check=True):')],
    ['decorator on the next-action run def', NA, swap('def run(repo, *cmd):', '@staticmethod\ndef run(repo, *cmd):')],
    ['decorator on the impact git_lines def', IM, swap('def git_lines(args, repo):', '@(lambda f: f)\ndef git_lines(args, repo):')],
    ['new keyword-only parameter in the state-write git def', SW, swap('def git(repo, *args, check=True):', 'def git(repo, *args, check=True, extra=("push",)):')],
    ['return annotation on the suite-receipt git def', SR, swap('def git(repo, *args):', 'def git(repo, *args) -> str:')],
    ['default parameter on the impact run def', IM, swap('def run(args, cwd):', 'def run(args, cwd="."):')],
    ['async def run in the next-action file', NA, swap('def run(repo, *cmd):', 'async def run(repo, *cmd):')],
  ]
  const missed = []
  for (const [label, file, edit] of cases) {
    const p = probe('TC-cli-5', label, [[file, edit]])
    if (!p.keys.includes('wrapperBodies')) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-6: a duplicate, shadowing, nested, method or async wrapper def adds a wrapperBodies entry', () => {
  const dup = fn('git(repo, *args, check=True)',
    'r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)',
    'if check and r.returncode != 0:',
    '    raise Fail(f"git {\' \'.join(args)}: {(r.stderr or r.stdout).strip()}")',
    'return r')
  const cases = [
    ['identical second module-level def git in state-write.py', SW, dup, 6],
    ['shadowing def git after the pinned one in suite-receipt.py', SR, fn('git(repo, *args)', `return subprocess.run(["git", "-C", repo, "push", "origin", "${V}"]).stdout`), 6],
    ['nested def git inside another function of state-write.py', SW, `\n\ndef _outer(repo):\n    def git(repo, *args):\n        return subprocess.run(["git", "-C", repo, *args])\n    git(repo, "push", "origin", "${V}")\n`, 6],
    ['class method git in state-write.py', SW, `\n\nclass _G:\n    def git(self, repo):\n        return subprocess.run(["git", "-C", repo, "push", "origin", "${V}"])\n`, 6],
    ['async def run appended to next-action.py', NA, `\n\nasync def run(repo, *cmd):\n    return subprocess.run(["git", "push", "origin", "${V}"], cwd=repo)\n`, 6],
  ]
  const missed = []
  for (const [label, file, code, n] of cases) {
    const p = probe('TC-cli-6', label, [[file, code]])
    if (p.out.wrapperBodies.length !== n) missed.push(`${label}: ${p.out.wrapperBodies.length} entries, keys ${p.keys.join(', ')}`)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-7: a wrapper name bound by a lambda or an import alias breaks another pin', () => {
  const cases = [
    ['git = lambda appended to state-write.py', SW, `\n\ngit = lambda repo, *a: subprocess.run(["git", "-C", repo, *a])\n`],
    ['run = git_lines appended to impact.py', IM, '\n\nrun = git_lines\n'],
    ['from urllib.request import urlopen as run in next-action.py', NA, '\n\nfrom urllib.request import urlopen as run\n'],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-7', label, [[file, code]])
    if (p.keys.length === 0) missed.push(label)
  }
  assert.deepEqual(missed, [])
})

test('verify cli TC-cli-8: a comment, a blank line or a line continuation in a body keeps every key', () => {
  const tabbed = src => src.replace('def run(args, cwd):\n    return subprocess.run(', 'def run(args, cwd):\n\treturn subprocess.run(')
  const cases = [
    ['comment line and blank line in each body', BODIES.map(([, file, anchor]) => [file, after(anchor, ['    # a reviewer note', ''])])],
    ['trailing comment in the state-write git body', [[SW, swap('    return r\n', '    return r  # the result\n')]]],
    ['changed existing comment in the impact git_lines body', [[IM, swap('# no git on PATH', '# git is missing on PATH')]]],
    ['backslash continuation in the impact run body', [[IM, swap('return subprocess.run(args, cwd=cwd, capture_output=True, text=True)', 'return subprocess.run(args, cwd=cwd, \\\n        capture_output=True, text=True)')]]],
    ['CRLF line ends in state-write.py and suite-receipt.py', [[SW, src => src.replace(/\n/g, '\r\n')], [SR, src => src.replace(/\n/g, '\r\n')]]],
    ['tab indent in the impact run body', [[IM, tabbed]]],
    ['blank line between the def line and a nested block in the next-action run body', [[NA, swap('    except (OSError, subprocess.SubprocessError) as e:', '\n    except (OSError, subprocess.SubprocessError) as e:')]]],
  ]
  const moved = []
  for (const [label, edits] of cases) {
    const p = probe('TC-cli-8', label, edits)
    if (p.keys.length) moved.push(`${label}: ${p.keys.join(', ')}`)
  }
  assert.deepEqual(moved, [])
  const deco = swap('def run(args, cwd):', '@(lambda f: f)\n@(lambda f: f)\ndef run(args, cwd):')
  const decorated = probe('TC-cli-8', 'two decorators on the impact run def (base for the next probe)', [[IM, deco]]).out
  const p = probe('TC-cli-8', 'comment between the two decorators', [[IM, deco], [IM, swap('@(lambda f: f)\n@(lambda f: f)', '@(lambda f: f)\n# a note\n@(lambda f: f)')]], { base: decorated })
  assert.deepEqual(p.keys, [])
})

test('verify cli TC-cli-9: wrapperBodies is equal on python 3.14, 3.12 and 3.9', () => {
  const dir = copyTree()
  const runs = {}
  for (const py of ['/opt/homebrew/bin/python3.14', `${process.env.HOME}/.local/bin/python3.12`, '/usr/bin/python3']) {
    if (!existsSync(py)) { log(`\n=== TC-cli-9 ${py} is missing`); continue }
    const t = r.exec(py, ['-I', GUARD, dir])
    const v = r.exec(py, ['--version']).stdout.trim()
    log(`\n=== TC-cli-9 ${v}\n$ ${t.argv.join(' ')}\nexit: ${t.status} (${t.durationMs} ms)\n${t.status === 0 ? JSON.stringify(JSON.parse(t.stdout).wrapperBodies, null, 1) : t.stderr}`)
    if (t.status === 0) runs[v] = JSON.parse(t.stdout)
  }
  const versions = Object.keys(runs)
  assert.ok(versions.length >= 2, `only ${versions.join(', ')} loaded the scanner`)
  for (const v of versions) {
    assert.deepEqual(runs[v].wrapperBodies, CLEAN.wrapperBodies, `${v}: wrapperBodies differ`)
    assert.deepEqual(delta(runs[v]), {}, `${v}: keys differ`)
  }
})

test('verify cli TC-cli-10: a token-equal re-quote changes the body text (observation)', () => {
  const p = probe('TC-cli-10', 'git string re-quoted with single quotes in the state-write git body', [[SW, swap('subprocess.run(["git", "-C", repo, *args]', "subprocess.run(['git', '-C', repo, *args]")]])
  log(`  observation: a re-quote ${p.keys.includes('wrapperBodies') ? 'changes' : 'keeps'} wrapperBodies`)
  assert.ok(p.keys.includes('wrapperBodies'))
})

test('verify cli TC-cli-11: outside a body, a non-constant program, verb, option or api path gives an opaque entry', () => {
  const cases = [
    ['local list spread in state-write.py', SW, fn('_m(repo, b)', 'extra = ["push", "origin", b]', 'git(repo, *extra)')],
    ['parameter verb in suite-receipt.py', SR, fn('_m(repo, verb)', 'git(repo, verb, "origin")')],
    ['f-string verb in state-write.py', SW, fn('_m(repo, v)', 'git(repo, f"{v}", "origin")')],
    ['variable program in next-action.py run', NA, fn('_m(repo, prog)', 'run(repo, prog, "push", "origin")')],
    ['variable program in impact.py run', IM, fn('_m(repo, prog)', 'run([prog, "push", "origin"], repo)')],
    ['parameter verb in impact.py git_lines', IM, fn('_m(repo, verb)', 'git_lines([verb, "origin"], repo)')],
    ['non-constant -X value in next-action.py', NA, fn('_m(repo, m)', 'run(repo, "gh", "api", "-X", m, "repos/o/r/issues")')],
    ['parameter api path in next-action.py', NA, fn('_m(repo, path)', 'run(repo, "gh", "api", path)')],
    ['-c value from a variable in state-write.py', SW, fn('_m(repo, cfg)', 'git(repo, "-c", cfg, "push", "origin")')],
    ['non-constant option before the gh verb', NA, fn('_m(repo, o)', 'run(repo, "gh", o, "pr", "create")')],
    ['--git-dir from a variable in state-write.py', SW, fn('_m(repo, d)', 'git(repo, "--git-dir=" + d, "push")')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-11', label, [[file, code]])
    if (!p.keys.includes('opaque') && !p.keys.includes('forgeViolations')) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [])
  assert.deepEqual(CLEAN.opaque, [])
  assert.deepEqual(CLEAN.forgeViolations, [])
})

test('verify cli TC-cli-12: -C with a variable value before push still records the push', () => {
  const p = probe('TC-cli-12', '-C from a variable before push in state-write.py', [[SW, fn('_m(repo, d)', `git(repo, "-C", d, "push", "origin", "${V}")`)]])
  assert.ok(p.keys.includes('pushes'), p.keys.join(', '))
  const q = probe('TC-cli-12', '-C followed by one starred list in state-write.py', [[SW, fn('_m(repo, x)', 'git(repo, "-C", *x)')]])
  assert.ok(q.keys.length > 0, 'no key changed')
})

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

test('verify cli TC-cli-15: pull-request creation and forge writes give a forgeViolations or opaque entry', () => {
  const W = ['forgeViolations', 'opaque']
  const cases = [
    ['gh pr create', NA, fn('_m(repo)', 'run(repo, "gh", "pr", "create", "--fill")')],
    ['glab mr create direct', JA, fn('_m(repo)', 'subprocess.run(["glab", "mr", "create"])')],
    ['gh -R before the verb', NA, fn('_m(repo)', 'run(repo, "gh", "-R", "o/r", "pr", "create")')],
    ['gh --repo before the verb direct', JA, fn('_m(repo)', 'subprocess.run(["gh", "--repo", "o/r", "pr", "create"])')],
    ['gh api -X post lower case', NA, fn('_m(repo)', 'run(repo, "gh", "api", "-X", "post", "repos/o/r/issues")')],
    ['gh api -XPOST attached', NA, fn('_m(repo)', 'run(repo, "gh", "api", "-XPOST", "repos/o/r/issues")')],
    ['gh api --method Delete', NA, fn('_m(repo)', 'run(repo, "gh", "api", "--method", "Delete", "repos/o/r/git/refs/heads/x")')],
    ['gh api --method=put', NA, fn('_m(repo)', 'run(repo, "gh", "api", "--method=put", "repos/o/r/contents/x")')],
    ['gh api -f', NA, fn('_m(repo)', 'run(repo, "gh", "api", "repos/o/r/git/refs", "-f", "ref=x")')],
    ['gh api -F', NA, fn('_m(repo)', 'run(repo, "gh", "api", "repos/o/r/git/refs", "-F", "sha=@f")')],
    ['gh api --field', NA, fn('_m(repo)', 'run(repo, "gh", "api", "repos/o/r/git/refs", "--field", "ref=x")')],
    ['gh api --raw-field=', NA, fn('_m(repo)', 'run(repo, "gh", "api", "repos/o/r/git/refs", "--raw-field=ref=x")')],
    ['gh api --input', NA, fn('_m(repo)', 'run(repo, "gh", "api", "--input", "b.json", "repos/o/r/git/refs")')],
    ['gh api path with pulls', NA, fn('_m(repo)', 'run(repo, "gh", "api", "repos/o/r/pulls")')],
    ['gh api path with PULLS upper case', NA, fn('_m(repo)', 'run(repo, "gh", "api", "repos/o/r/PULLS")')],
    ['glab api merge_requests', JA, fn('_m(repo, p)', 'subprocess.run(["glab", "api", f"projects/{p}/merge_requests"])')],
    ['gh api graphql bare', NA, fn('_m(repo)', 'run(repo, "gh", "api", "graphql")')],
    ['gh api graphql -f query', JA, fn('_m(repo)', 'subprocess.run(["gh", "api", "graphql", "-f", "query=mutation{x}"])')],
    ['gh api /graphql', NA, fn('_m(repo)', 'run(repo, "gh", "api", "/graphql")')],
    ['glab api graphql', NA, fn('_m(repo)', 'run(repo, "glab", "api", "graphql")')],
    ['gh api --paginate graphql', NA, fn('_m(repo)', 'run(repo, "gh", "api", "--paginate", "graphql")')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-15', label, [[file, code]])
    if (!p.keys.some(k => W.includes(k))) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
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

test('verify cli TC-cli-20: the loop script gains no process or network access', () => {
  const cases = [
    ['require in code', 'const _m = require("child_process")'],
    ['import() in code', 'const _m = () => import("node:child_process")'],
    ['fetch in a string', 'const _m = "fetch"'],
    ['process through \\u escape', 'const _m = pro\\u0063ess.env'],
    ['spawn through \\u{} escape', 'const _m = sp\\u{61}wn'],
    ['globalThis in code', 'const _m = globalThis'],
    ['"global" double-quoted', 'const _m = "global"'],
    ['`global` template', 'const _m = `global`'],
    ["'global ' with a space", "const _m = 'global '"],
    ["'global' in a new place", "const _m = 'global'"],
    ['Function constructor', "const _m = Function('return 1')"],
    ['Deno', 'const _m = Deno'],
    ['Bun', 'const _m = Bun'],
    ['navigator', 'const _m = navigator'],
    ['Worker', 'const _m = new Worker("x")'],
    ['WebSocket', 'const _m = new WebSocket("ws://x")'],
    ['EventSource', 'const _m = new EventSource("x")'],
    ['XMLHttpRequest', 'const _m = new XMLHttpRequest()'],
    ['execFile', 'const _m = execFile'],
    ['fork', 'const _m = fork'],
  ]
  const missed = []
  for (const [label, line] of cases) {
    const p = probe('TC-cli-20', label, [[LOOP, `\n${line}\n`]])
    if (!p.keys.includes('jsHits') && !p.keys.includes('jsAllowed')) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [])
  assert.equal(CLEAN.jsAllowed.filter(l => l.includes('decisionPanel') || l.includes('decision')).length, 3)
})

function loopTest(mutate) {
  const dir = r.dir('loopcopy')
  cpSync(join(ROOT, 'skills/sdlc'), join(dir, 'skills/sdlc'), { recursive: true, filter: src => !src.includes('node_modules') })
  if (mutate) apply(dir, LOOP, mutate)
  const t = r.exec(process.execPath, ['--test', '--test-name-pattern', 'verify branch builder', join(dir, 'skills/sdlc/test/push-guard.test.mjs')], { watch: [] })
  return t
}

test('verify cli TC-cli-21: a new verify branch reference in verifyPhase fails T-R-119d', () => {
  const clean = loopTest(null)
  log(`\n=== TC-cli-21 clean copy\n${clean.text()}`)
  assert.equal(clean.status, 0)
  const anchor = "    const c = await run('verify-collector'"
  const cases = [
    ['branch passed to the integrator', after(`  const branch = g => \`sdlc/\${id}-v\${round}-\${g.profile}-\${g.part}\``, ["  const _x = () => run('integrator', { sliceId: id, branch: branch(groups[0]) })"])],
    ['branch passed to the state-writer', swap(anchor, `    await run('state-writer', { sliceId: id, branches: groups.map(branch) })\n${anchor}`)],
    ['branch builder renamed', src => src.replace('const branch = g =>', 'const vb = g =>').replace('branch: branch(g)', 'branch: vb(g)').replace('groups.map(branch)', 'groups.map(vb)')],
  ]
  const passed = []
  for (const [label, edit] of cases) {
    const t = loopTest(edit)
    log(`\n=== TC-cli-21 ${label}\n${t.text()}`)
    if (t.status === 0) passed.push(label)
  }
  assert.deepEqual(passed, [])
})

test('verify cli TC-cli-28: no phase of the loop other than verifyPhase builds a verify branch name', () => {
  const src = readFileSync(join(ROOT, LOOP), 'utf8')
  const hits = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /-v\$\{|-v\d+-|`sdlc\/\$\{[^}]+\}-v/.test(l))
  log(`\n=== TC-cli-28 lines of ${LOOP} that build a -v<round>- name\n${hits.map(([n, l]) => `${n}: ${l.trim()}`).join('\n') || '<none>'}`)
  const start = src.indexOf('async function verifyPhase')
  const end = start + src.slice(start).search(/\n}\s*\n/)
  const startLine = src.slice(0, start).split('\n').length
  const endLine = src.slice(0, end).split('\n').length
  const outside = hits.filter(([n]) => n < startLine || n > endLine)
  assert.deepEqual(outside, [])
  assert.equal(hits.length, 1)
})

const PUSH_PY = `import subprocess\nsubprocess.run(["git", "push", "origin", "${V}"])\n`
const PUSH_SH = `#!/bin/sh\ngit push origin ${V}\n`
const PUSH_JS = `require('child_process').execSync('git push origin ${V}')\n`

function treeProbe(id, label, make) {
  const dir = copyTree()
  make(dir)
  const t = r.exec(PY, ['-I', GUARD, dir])
  log(`\n=== ${id} ${label}\n$ ${t.argv.join(' ')}\nexit: ${t.status} (${t.durationMs} ms)`)
  if (t.status !== 0) {
    log(`  stderr tail: ${t.stderr.trim().split('\n').slice(-1)[0]}`)
    return { keys: [`exit ${t.status}`], out: null }
  }
  const out = JSON.parse(t.stdout)
  const changed = delta(out)
  log(`changed keys: ${Object.keys(changed).join(', ') || '<none>'}`)
  for (const [k, d] of Object.entries(changed)) {
    log(`  ${k} (${d.count})`)
    for (const a of d.added) log(`    + ${a}`)
    for (const x of d.removed) log(`    - ${x}`)
  }
  return { keys: Object.keys(changed), out }
}

const writeAt = (rel, body, mode = 0o755) => dir => {
  const p = join(dir, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, body)
  chmodSync(p, mode)
}

test('verify cli TC-cli-29: a new script type, a symlink or a non-UTF-8 source fails the guard', () => {
  const lib = r.dir('lib')
  writeFileSync(join(lib, 'x.py'), PUSH_PY)
  writeFileSync(join(lib, 'x.sh'), PUSH_SH)
  const latin = (rel, cookie) => dir => {
    const p = join(dir, rel)
    const src = existsSync(p) ? readFileSync(p) : Buffer.from('')
    writeFileSync(p, Buffer.concat([Buffer.from(cookie), src, Buffer.from(`\n# caf`), Buffer.from([0xe9]), Buffer.from(`\n${PUSH_PY}`)]))
  }
  const cases = [
    ['new .sh under skills/sdlc', writeAt('skills/sdlc/x.sh', PUSH_SH), ['files']],
    ['new .sh under hooks', writeAt('hooks/x.sh', PUSH_SH), ['files']],
    ['new .mjs under skills/sdlc', writeAt('skills/sdlc/x.mjs', PUSH_JS), ['files']],
    ['new .cjs under hooks', writeAt('hooks/x.cjs', PUSH_JS), ['files']],
    ['new .ts under tracker', writeAt('skills/sdlc/tracker/x.ts', PUSH_JS), ['files']],
    ['new extension-less executable under skills/sdlc', writeAt('skills/sdlc/pre-push', PUSH_SH), ['files']],
    ['new extension-less executable under hooks', writeAt('hooks/post-checkout', PUSH_SH), ['files']],
    ['symlink to a directory under skills/sdlc', d => symlinkSync(lib, join(d, 'skills/sdlc/lib')), ['opaque']],
    ['symlink to a directory under hooks', d => symlinkSync(lib, join(d, 'hooks/lib')), ['opaque']],
    ['symlink to a file under hooks', d => symlinkSync(join(lib, 'x.py'), join(d, 'hooks/y.py')), ['opaque']],
    ['wrapper file replaced by a symlink', d => {
      const target = join(r.dir('lib2'), 'state-write.py')
      writeFileSync(target, readFileSync(join(d, SW), 'utf8'))
      rmSync(join(d, SW))
      symlinkSync(target, join(d, SW))
    }, ['opaque']],
    ['latin-1 cookie on janitor.py', latin(JA, '# -*- coding: latin-1 -*-\n'), ['opaque']],
    ['latin-1 cookie on a new file under hooks', d => latin('hooks/x.py', '# -*- coding: latin-1 -*-\n')(d), ['opaque']],
    ['new BOM Python file with a push', writeAt('skills/sdlc/x.py', `﻿${PUSH_PY}`), ['files', 'direct']],
    ['BOM on state-write.py with a new verify push', d => apply(d, SW, src => `﻿${src}${fn('_m(repo)', `git(repo, "push", "origin", "${V}")`)}`), ['pushes']],
  ]
  const missed = []
  for (const [label, make, must] of cases) {
    const p = treeProbe('TC-cli-29', label, make)
    const ok = p.out ? must.every(k => p.keys.includes(k)) : true
    if (!ok) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  assert.deepEqual(missed, [])
  const bomOnly = treeProbe('TC-cli-29', 'BOM only on the four wrapper files (control)', d => {
    for (const f of [SW, SR, NA, IM]) apply(d, f, src => `﻿${src}`)
  })
  assert.deepEqual(bomOnly.keys, [])
})

test('verify cli TC-cli-30: a spec-required forge read outside a body changes only a pin and hits no ban', () => {
  const read = (...lines) => fn('_verify_read(repo, slug)', ...lines)
  const cases = [
    ['gh pr list through run', NA, read('run(repo, "gh", "pr", "list", "--state", "closed", "--json", "number")')],
    ['gh pr view through run', NA, read('run(repo, "gh", "pr", "view", "12", "--json", "state")')],
    ['gh api GET through run', NA, read('run(repo, "gh", "api", "-X", "GET", "repos/o/r/rules/branches/main")')],
    ['gh api with no method through run', NA, read('run(repo, "gh", "api", "repos/o/r/rules/branches/main")')],
    ['glab mr list through run', NA, read('run(repo, "glab", "mr", "list", "--state", "opened")')],
    ['glab api push_rule through run', NA, read('run(repo, "glab", "api", "projects/:fullpath/push_rule")')],
    ['gh pr list at a new direct site', 'skills/sdlc/branches.py', read('subprocess.run(["gh", "pr", "list", "--json", "number"], capture_output=True, text=True)')],
    ['gh api GET at a new direct site', 'skills/sdlc/branches.py', read('subprocess.run(["gh", "api", "-X", "GET", f"repos/{slug}/rules/branches/main"], capture_output=True, text=True)')],
  ]
  const bad = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-30', label, [[file, code]])
    const extra = p.keys.filter(k => !['forge', 'wrapperVerbs', 'direct'].includes(k))
    if (!p.keys.includes('forge') || extra.length || p.out.forgeViolations.length || p.out.opaque.length || !same(p.out.wrapperBodies, CLEAN.wrapperBodies)) {
      bad.push(`${label}: ${p.keys.join(', ')}`)
    }
  }
  assert.deepEqual(bad, [])
})

const slice = (id, extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function noForgePath() {
  const bin = r.dir('nogh')
  for (const tool of ['git', 'python3', 'sh', 'env']) {
    const real = r.exec('/usr/bin/which', [tool], { watch: [] }).stdout.trim()
    if (real) symlinkSync(real, join(bin, tool))
  }
  return bin
}

function world(config, { slices = [], milestones = [] } = {}) {
  const env = { PATH: noForgePath(), TMPDIR: r.dir('tmpdir') }
  const g = (dir, ...a) => r.git(dir, ...a)
  const bare = r.dir('remote')
  g(bare, 'init', '-q', '--bare', '-b', 'main')
  const repo = r.gitRepo({
    files: {
      '.sdlc/config.json': { specPath: 'spec.md', defaultBranch: 'main', commitFormat: '', ...config },
      '.sdlc/requirements.json': [],
      '.sdlc/slices.json': slices,
      '.sdlc/milestones.json': milestones,
      '.sdlc/log.jsonl': '',
      'spec.md': '# spec\n',
      'src/app.txt': 'v1\n',
    },
  })
  g(repo, 'remote', 'add', 'origin', bare)
  g(repo, 'push', '-q', '-u', 'origin', 'main')
  return { repo, bare, env, g }
}

function plantVerify(w, from) {
  const specs = [['S-001', 0, 'cli', 0], ['S-002a', 3, 'security', 1]]
  return specs.map(([id, round, profile, part]) => {
    const t = r.run('branches.py', ['name', '--repo', w.repo, '--kind', 'verify', '--id', id, '--round', String(round), '--profile', profile, '--part', String(part)], { cwd: w.repo })
    log(`\n=== TC-cli-31 branches.py name --kind verify\n${t.text()}`)
    assert.equal(t.status, 0, t.stdout + t.stderr)
    const b = t.json.branch
    w.g(w.repo, 'checkout', '-q', '-b', b, from)
    writeFileSync(join(w.repo, 'src', `${b.replace(/\//g, '_')}.txt`), `${b}\n`)
    w.g(w.repo, 'add', '-A')
    w.g(w.repo, 'commit', '-q', '-m', `work on ${b}`)
    return b
  })
}

const heads = w => w.g(w.bare, 'for-each-ref', '--format=%(refname)').split('\n').filter(Boolean).sort()

function noVerify(w, names, label, t) {
  const refs = heads(w)
  log(`\n=== TC-cli-31 ${label}\n${t ? t.text() : ''}\n--- bare remote refs after\n${refs.join('\n')}\n--- local remote-tracking refs\n${w.g(w.repo, 'for-each-ref', '--format=%(refname)', 'refs/remotes')}`)
  const leaked = refs.filter(x => names.some(v => x.endsWith(`/${v}`)) || /-v\d+-/.test(x))
  return leaked.map(x => `${label}: ${x}`)
}

test('verify cli TC-cli-31: a verify branch stays local when the push-capable scripts run against a real remote', () => {
  const leaks = []
  const sw = (w, args, input = '') => r.run('state-write.py', args, { input, env: w.env, cwd: w.repo })
  for (const mode of ['pr', 'direct', 'mr']) {
    const w = world({ gitMode: mode, runBranch: '' }, { slices: [slice('S-001')] })
    const names = plantVerify(w, 'main')
    w.g(w.repo, 'checkout', '-q', names[0])
    const before = heads(w)
    for (const [label, args, input] of [
      ['patch-slice in_progress (fetch of the base)', ['patch-slice', '--repo', w.repo, '--slice', 'S-001'], JSON.stringify({ status: 'in_progress' })],
      ['patch-slice second run', ['patch-slice', '--repo', w.repo, '--slice', 'S-001'], JSON.stringify({ phase: 'tests' })],
      ['base-branch', ['base-branch', '--repo', w.repo, '--slice', 'S-001'], ''],
      ['status', ['status', '--repo', w.repo], ''],
    ]) {
      const t = sw(w, args, input)
      assert.equal(t.status, 0, `${mode} ${label}: ${t.stdout}${t.stderr}`)
      leaks.push(...noVerify(w, names, `${mode} ${label}`, t))
    }
    assert.deepEqual(heads(w), before, `${mode}: the remote refs changed`)
    if (mode !== 'mr') assert.ok(w.g(w.repo, 'for-each-ref', 'refs/remotes/origin/main'), `${mode}: the fetch path did not run`)
    for (const v of names) assert.ok(w.g(w.repo, 'branch', '--list', v), `${mode}: ${v} was lost locally`)
  }
  const w = world({ gitMode: 'stack', runBranch: 'sdlc/run-1' }, {
    slices: [slice('S-014'), slice('S-001')],
    milestones: [{ id: 'M-1', title: 'One', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  })
  w.g(w.repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  w.g(w.repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  const names = plantVerify(w, 'sdlc/run-1')
  w.g(w.repo, 'checkout', '-q', names[0])
  w.g(w.repo, 'branch', '--set-upstream-to=origin/main')
  const t = sw(w, ['patch-slice', '--repo', w.repo, '--slice', 'S-014'], JSON.stringify({ status: 'in_progress' }))
  assert.equal(t.status, 0, t.stdout + t.stderr)
  leaks.push(...noVerify(w, names, 'stack patch-slice (fetch --prune, run and milestone push)', t))
  assert.deepEqual(heads(w), ['refs/heads/main', 'refs/heads/sdlc/M-1', 'refs/heads/sdlc/run-1'])
  const j = r.run('janitor.py', ['--repo', w.repo, '--days', '36500'], { env: w.env, cwd: w.repo })
  assert.equal(j.status, 0, j.stdout + j.stderr)
  leaks.push(...noVerify(w, names, 'janitor', j))
  const n = r.run('next-action.py', ['--repo', w.repo], { env: w.env, cwd: w.repo })
  assert.notEqual(n.status, null, n.text())
  leaks.push(...noVerify(w, names, 'next-action with gh absent', n))
  assert.deepEqual(leaks, [])
})

const UP = `--upload-pack=git push origin ${V};:`

test('verify cli TC-cli-32: a new option after a known wrapper verb, in any literal spelling, breaks a pin or is opaque', () => {
  const W = ['wrapperVerbs', 'opaque', 'pushes']
  const cases = [
    ['m1 f-string with a leading formatted value, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", f"{''}${UP}", check=False)`)],
    ['m2 .strip() of a constant option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}".strip(), check=False)`)],
    ['m3 str() of a constant option through next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", str("${UP}"))`)],
    ['local list spread after the verb, state-write.py', SW, fn('_mutant(repo, b)', `opts = ["${UP}"]`, 'git(repo, "fetch", "origin", *opts, check=False)')],
    ['inline starred list after the verb, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", *["${UP}"], check=False)`)],
    ['option split as two tokens, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "--upload-pack", "git push origin ${V};:", "origin", check=False)`)],
    ['--receive-pack on push, state-write.py', SW, fn('_mutant(repo, b)', 'git(repo, "push", "--receive-pack=git-receive-pack", "origin", "main", check=False)')],
    ['--exec on push, state-write.py', SW, fn('_mutant(repo, b)', 'git(repo, "push", "--exec=git-receive-pack", "origin", "main", check=False)')],
    ['--exec on fetch, next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "--exec=git push origin ${V};:", "origin")`)],
    ['-u on fetch, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "-u", "origin", check=False)`)],
    ['abbreviated --upl on fetch, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "--upl=git push origin ${V};:", "origin", check=False)`)],
    ['whitespace-padded option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", " ${UP}", check=False)`)],
    ['option glued by + after a constant prefix, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "--upload" + "-pack=git push origin ${V};:", check=False)`)],
    ['option from format(), state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "{}".format("${UP}"), check=False)`)],
    ['option from a % format, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "%s" % "${UP}", check=False)`)],
    ['option from join, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "".join(["--upload-pack=", "git push origin ${V};:"]), check=False)`)],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-32', label, [[file, code]])
    if (!p.keys.some(k => W.includes(k))) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
  }
  const confusable = probe('TC-cli-32', 'observation: confusable hyphen U+2010 in front of upload-pack', [[SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "‐‐upload-pack=git push origin ${V};:", check=False)`)]])
  log(`  observation: the U+2010 form changes ${confusable.keys.join(', ') || 'no key'}; git reads it as a refspec, not as an option`)
  assert.deepEqual(missed, [], `the guard output equals the pins for:\n${missed.join('\n')}`)
})

test('verify cli TC-cli-35: a corpus whitespace or invisible character in front of a hidden option breaks a pin or does not push', () => {
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

function behave(id, label, file, code, args = []) {
  const ml = moduleLoader({ runner: r, python: PY })
  const dir = copyTree()
  apply(dir, file, code)
  const { out } = guard(dir)
  const keys = Object.keys(delta(out))
  const { remote, repo } = ml.bareRemote({ branches: [V] })
  const t = ml.call(file, '_mutant', [repo, V, ...args], { root: dir, remote })
  const git = r.exec('git', ['--version'], { watch: [] }).stdout.trim()
  log(`\n=== ${id} ${label}\n${git}\nguard changed keys: ${keys.join(', ') || '<none>'}\n${t.text()}`)
  return { keys, pushed: t.pushed(V), t }
}

test('verify cli TC-cli-33: the hidden-option mutants m1 and m3 do not push a verify branch while the guard passes', () => {
  const cases = [
    ['m1 state-write.py f-string option', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", f"{''}${UP}", check=False)`)],
    ['m2 state-write.py .strip() option', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}".strip(), check=False)`)],
    ['m3 next-action.py str() option', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", str("${UP}"))`)],
    ['local list spread after the verb, state-write.py', SW, fn('_mutant(repo, b)', `opts = ["${UP}"]`, 'git(repo, "fetch", "origin", *opts, check=False)')],
    ['option from format(), state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "{}".format("${UP}"), check=False)`)],
    ['option from join, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "".join(["--upload-pack=", "git push origin ${V};:"]), check=False)`)],
    ['control m4: plain constant option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", "${UP}", check=False)`)],
  ]
  const leaked = []
  for (const [label, file, code] of cases) {
    const b = behave('TC-cli-33', label, file, code)
    if (b.pushed && b.keys.length === 0) leaked.push(`${label}: pushed ${V} with every key equal`)
    if (label.startsWith('control') && !(b.pushed && b.keys.length)) leaked.push(`${label}: the control did not push or the guard did not flag it`)
  }
  assert.deepEqual(leaked, [], leaked.join('\n'))
})

test('verify cli TC-cli-25: seed probe S1: a variable option after a known wrapper verb (re-run)', () => {
  const b = behave('TC-cli-25', 'option from a parameter, state-write.py', SW, fn('_mutant(repo, b, opt)', 'git(repo, "fetch", "-q", "origin", opt, check=False)'), [UP])
  log(`  seed S1 observation: keys ${b.keys.join(', ') || '<none>'}; pushed ${b.pushed}`)
  assert.ok(b.t.outcome === 'return' || b.t.outcome === 'exception', b.t.text())
})

test('verify cli TC-cli-34: on the clean tree opaque is empty and no wrapperVerbs option can run a command', () => {
  const opts = CLEAN.wrapperVerbs.filter(e => e.split(' ').length === 4)
  log(`\n=== TC-cli-34 clean wrapperVerbs option entries (${opts.length})\n${opts.join('\n')}`)
  assert.deepEqual(CLEAN.opaque, [])
  assert.deepEqual(CLEAN.dynamic, [])
  assert.deepEqual(CLEAN.forgeViolations, [])
  const RUNS = /^--(upload-pack|receive-pack|exec|config|config-env|exec-path|git-dir|work-tree)$|^-c$|^-u$/
  const bad = opts.filter(e => {
    const [, , verb, opt] = e.split(' ')
    if (opt === '-u') return verb === 'fetch' || verb === 'clone' || verb === 'ls-remote'
    return RUNS.test(opt)
  })
  assert.deepEqual(bad, [])
})
