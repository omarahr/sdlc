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
