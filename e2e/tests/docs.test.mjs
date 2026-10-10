import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { up, down, sh, skillDir, repoRoot } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { mark, since } from '../helpers/logs.mjs'
import { gitRepo, refs } from '../helpers/repo.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
const evidence = {}
test.after(() => {
  if (process.env.E2E_EVIDENCE_FILE) fs.writeFileSync(process.env.E2E_EVIDENCE_FILE, JSON.stringify(evidence, null, 2))
  down(stack)
})

const note = (id, label, value) => {
  evidence[id] = evidence[id] || []
  evidence[id].push({ label, value })
}

const promptsDir = path.join(skillDir, 'prompts')
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8')
const promptNames = () => fs.readdirSync(promptsDir).filter((f) => f.endsWith('.md')).sort()
const treeStatus = () => sh(stack, 'git', ['status', '--porcelain'], { cwd: repoRoot }).stdout.split('\n').filter((l) => l && !l.endsWith('e2e/tests/docs.test.mjs')).join('\n')
const LITERAL = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/
const noFatalStderr = (text) => !/Traceback|unhandled|UnhandledPromiseRejection/i.test(text)

const outsideFences = (text) => {
  let fenced = false
  const lines = []
  text.split('\n').forEach((line, i) => {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced
      return
    }
    if (!fenced) lines.push([i + 1, line])
  })
  return lines
}
const literalsIn = (file) => outsideFences(read(file)).filter(([, l]) => LITERAL.test(l)).map(([n, l]) => `${path.basename(file)}:${n}: ${l.trim().slice(0, 120)}`)

const copyTree = (dest) => {
  fs.mkdirSync(path.join(dest, 'skills'), { recursive: true })
  fs.cpSync(skillDir, path.join(dest, 'skills', 'sdlc'), { recursive: true, filter: (src) => !src.includes('__pycache__') })
  fs.copyFileSync(path.join(repoRoot, 'README.md'), path.join(dest, 'README.md'))
}

const branchesPy = (repo, args, opts) => api(stack, 'branches.py', [args[0], '--repo', repo.dir, ...args.slice(1)], opts)

const snapshot = (repo) => {
  const files = {}
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else files[path.relative(repo.dir, full)] = fs.readFileSync(full, 'utf8')
    }
  }
  walk(repo.dir)
  return JSON.stringify({ refs: refs(repo), files })
}

scenario('SC-M-1-051', 'no prompt or SKILL.md spells a loop branch literally, and the guard catches one', () => {
  const offset = mark(stack, 'SC-M-1-051')
  const before = treeStatus()
  const files = [...promptNames().map((f) => path.join(promptsDir, f)), path.join(skillDir, 'SKILL.md')]
  const found = files.flatMap(literalsIn)
  note('SC-M-1-051', 'files scanned', files.length)
  note('SC-M-1-051', 'literals found', found)
  assert.ok(files.length > 40)
  assert.deepEqual(found, [])

  const clean = path.join(stack.dirs.root, 'mut-clean')
  copyTree(clean)
  const guard = (tree) =>
    sh(stack, process.execPath, ['--test', '--test-name-pattern=T-R-080', path.join(tree, 'skills', 'sdlc', 'test', 'prompts.test.mjs')], { cwd: tree, timeoutMs: 180000 })
  const control = guard(clean)
  note('SC-M-1-051', 'guard on clean copy', { status: control.status })
  assert.equal(control.status, 0, control.stdout.slice(-800))

  const mutated = path.join(stack.dirs.root, 'mut-literal')
  copyTree(mutated)
  const target = path.join(mutated, 'skills', 'sdlc', 'prompts', 'planner.md')
  fs.appendFileSync(target, '\nCheck out sdlc/S-001 before you start.\n')
  assert.equal(literalsIn(target).length, 1)
  const run = guard(mutated)
  note('SC-M-1-051', 'guard on mutated copy', { status: run.status, tail: run.stdout.split('\n').filter((l) => /spells a loop branch|not ok|fail/.test(l)).slice(0, 4) })
  assert.notEqual(run.status, 0)
  assert.match(run.stdout, /planner\.md spells a loop branch literally/)
  assert.ok(noFatalStderr(run.stderr))
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
  note('SC-M-1-051', 'log lines', since(stack, offset).length)
})

scenario('SC-M-1-052', '_common.md Branch names section: eight placeholders, each command runs', () => {
  mark(stack, 'SC-M-1-052')
  const before = treeStatus()
  const common = read(promptsDir, '_common.md')
  const rows = common.split('\n').filter((l) => /^\s*\|\s*`<[a-z0-9 ]+>`/.test(l))
  const placeholders = rows.map((l) => /`<([a-z0-9 ]+)>`/.exec(l)[1])
  note('SC-M-1-052', 'placeholders', placeholders)
  assert.deepEqual(placeholders, ['run branch', 'slice branch', 'milestone branch', 'e2e branch', 'e2e area branch', 'state branch', 'attempt branch', 'verify branch'])

  const row = (name) => rows.find((l) => l.includes(`\`<${name}>\``))
  assert.ok(!/branches\.py/.test(row('verify branch')), 'verify branch is filled by no name call')
  assert.match(row('verify branch'), /`branch` input/)
  assert.match(row('run branch'), /`config\.runBranch`[^|]*`stack` mode[^|]*`branches\.py list --kind run`[^|]*last entry/)

  const repo = gitRepo(stack, { branches: ['sdlc/run-1', 'sdlc/run-2'] })
  const repoBefore = snapshot(repo)
  const values = { sliceId: 'S-001', milestoneId: 'M-1', areaId: 'api', n: '1' }
  const results = {}
  for (const name of placeholders.filter((p) => p !== 'verify branch')) {
    const cmd = /branches\.py ((?:name|list)[^`]*)/.exec(row(name))[1].replace(/<(\w+)>/g, (_, k) => values[k])
    const args = cmd.split(/\s+/).filter(Boolean)
    const t = branchesPy(repo, args, { id: 'SC-M-1-052' })
    results[name] = { cmd, status: t.status, stdout: t.stdout.trim(), stderr: t.stderr }
    assert.equal(t.status, 0, `${name}: ${cmd}`)
    assert.equal(t.stderr, '')
    assert.equal(t.json.ok, true)
  }
  note('SC-M-1-052', 'commands', results)
  const parsed = (b) => JSON.parse(branchesPy(repo, ['parse', '--branch', b]).stdout)
  assert.equal(JSON.parse(results['slice branch'].stdout).branch, 'sdlc/S-001')
  assert.equal(JSON.parse(results['e2e area branch'].stdout).branch, 'sdlc/M-1-e2e-api')
  assert.equal(JSON.parse(results['attempt branch'].stdout).branch, 'sdlc/S-001-attempt-1')
  const listed = JSON.parse(results['run branch'].stdout).branches
  assert.equal(listed[listed.length - 1].branch.startsWith('sdlc/run-'), true)
  const loop = parsed('sdlc/S-001')
  const main = parsed('main')
  note('SC-M-1-052', 'parse', { loop, main })
  assert.equal(loop.kind, 'slice')
  assert.equal(main.kind, null)
  const stateName = JSON.parse(results['state branch'].stdout).branch
  assert.equal(parsed(stateName).kind, 'state')
  assert.equal(snapshot(repo), repoBefore)
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
})

scenario('SC-M-1-053', 'SKILL.md carries the branch-format flag, bullet, run branch naming and launch arg', () => {
  mark(stack, 'SC-M-1-053')
  const before = treeStatus()
  const text = read(skillDir, 'SKILL.md')
  const lines = text.split('\n')
  const at = (re) => lines.findIndex((l) => re.test(l))
  const flagRow = at(/^- `\/sdlc <spec-path>.*\[--commit-format "<format>"\] \[--branch-format "<format>"\]/)
  const commitRow = at(/^\s+- `--commit-format`/)
  const branchRow = at(/^\s+- `--branch-format`/)
  note('SC-M-1-053', 'lines', { flagRow: flagRow + 1, commitRow: commitRow + 1, branchRow: branchRow + 1 })
  assert.ok(flagRow >= 0 && commitRow >= 0 && branchRow === commitRow + 1)

  const gitMode = at(/^\s+- \*\*Git mode:\*\*/)
  const bullets = lines.map((l, i) => [i, l]).filter(([, l]) => /^\s+- \*\*Branch format:\*\*/.test(l))
  assert.equal(bullets.length, 1)
  const bulletAt = bullets[0][0]
  const between = lines.slice(gitMode + 1, bulletAt).filter((l) => /^   - \*\*/.test(l))
  assert.deepEqual(between, [], 'the Branch format bullet follows Git mode directly')
  assert.doesNotMatch(text, /Branch name \(first run only\)/)
  const bullet = bullets[0][1]
  note('SC-M-1-053', 'bullet line', bulletAt + 1)
  assert.match(bullet, /with `--format "<format>"` when you have one/)
  assert.match(bullet, /With none, give preflight no `--format` argument/)
  assert.match(bullet, /with `--branch "\$BASE_BRANCH"` in `mr` mode only\. No other mode gets `--branch`/)
  assert.match(bullet, /On a resume, run no `parse` check and ask for no rename/)
  assert.match(bullet, /first run only/)

  const worktree = lines.find((l) => /^\s+- \*\*Run worktree:\*\*/.test(l))
  assert.match(worktree, /RUN_BRANCH=\$\(python3 "\$SKILL_DIR\/branches\.py" name --repo "\$REPO" --format "\$FMT" --kind run --n <n>\)/)
  assert.match(worktree, /one more than the count of `branches\.py list --repo "\$REPO" --format "\$FMT" --kind run`/)
  assert.match(worktree, /On a relaunch[^.]*the run branch is the last entry of `branches\.py list/)
  assert.match(worktree, /creates no new run branch on a relaunch|creates? no new run branch/)
  assert.match(worktree, /holds a `branchFormat` that differs from `\$FMT`, report both and end/)

  const launch = lines.find((l) => /Call `Workflow\(/.test(l))
  assert.match(launch, /commitFormat, branchFormat, maxIterations/)
  assert.match(launch, /`branchFormat` is `\$FMT`/)
  note('SC-M-1-053', 'launch wording', 'args list names branchFormat bare; the same line states `branchFormat` is `$FMT` (same shorthand as commitFormat)')
  note('SC-M-1-053', 'observation', 'the Branch format bullet reads $REPO/.sdlc/config.json while the Git mode bullet reads $WT first; the wording is the spec wording')
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
})

scenario('SC-M-1-054', 'prompts carry the branch format wording, and the integrator attempt cleanup deletes only the slice', () => {
  mark(stack, 'SC-M-1-054')
  const before = treeStatus()
  const detector = read(promptsDir, 'env-detector.md')
  assert.match(detector, /`branchFormat` \(a format string or null\)/)
  assert.ok(detector.includes("`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here."))
  const schema = read(promptsDir, 'state-schema.md')
  assert.match(schema, /"branchFormat": "sdlc\/\{name\}"/)
  assert.ok(schema.includes('`branchFormat` is the format of every branch the loop makes: literal text around one `{name}` (or `{name:lower}`) placeholder, which carries the loop\'s own tail per branch kind (`branches.py`). Set at the first launch; a resume keeps it.'))
  const commit = read(promptsDir, 'commit-state.md')
  assert.doesNotMatch(commit, /date -u/)
  assert.match(commit, /<state branch>/)
  assert.match(read(promptsDir, 'slicer.md'), /`branch: <slice branch>`/)

  const integrator = read(promptsDir, 'integrator.md')
  const step = integrator.split('\n').find((l) => l.startsWith('2. Run `python3 "<skill>/branches.py" list --repo . --kind attempt`'))
  assert.ok(step, 'the attempt cleanup step is missing')
  assert.match(step, /Keep the entries whose `id` equals this slice id/)

  const repo = gitRepo(stack, { branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-10', 'sdlc/S-010-attempt-1'] })
  const listing = branchesPy(repo, ['list', '--kind', 'attempt'], { id: 'SC-M-1-054' })
  assert.equal(listing.status, 0)
  const kept = listing.json.branches.filter((b) => b.id.toLowerCase() === 'S-001'.toLowerCase())
  for (const b of kept) {
    const del = sh(stack, 'git', ['branch', '-D', b.branch], { cwd: repo.dir })
    assert.equal(del.status, 0, del.stderr)
  }
  const left = refs(repo).filter((r) => r.includes('attempt'))
  note('SC-M-1-054', 'deleted', kept.map((b) => b.branch))
  note('SC-M-1-054', 'left', left)
  assert.deepEqual(kept.map((b) => b.branch).sort(), ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-10'])
  assert.deepEqual(left, ['refs/heads/sdlc/S-010-attempt-1'])
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
})

const baseRef = () => {
  for (const ref of ['main', 'origin/main']) {
    const t = sh(stack, 'git', ['merge-base', ref, 'HEAD'], { cwd: repoRoot })
    if (t.status === 0) return t.stdout.trim()
  }
  throw new Error('no main to diff against')
}
const steCheck = (...files) => sh(stack, stack.env.E2E_PYTHON, ['-I', path.join(skillDir, 'ste-check.py'), ...files])

scenario('SC-M-1-055', 'README documents branch names, ste-style.md is unchanged, ste-check passes edited prompts', () => {
  const offset = mark(stack, 'SC-M-1-055')
  const before = treeStatus()
  const readme = read(repoRoot, 'README.md')
  const lines = readme.split('\n')
  const row = lines.find((l) => l.startsWith('|') && l.includes('`/sdlc <spec>'))
  assert.ok(row.includes('[--branch-format "<format>"]'))
  const flag = lines.find((l) => l.startsWith('- `--branch-format'))
  assert.match(flag, /For example `"feature\/PROJ-1-\{name\}"`/)
  const paragraph = lines.findIndex((l) => l.startsWith('**Branch names**'))
  const modeBullets = lines.map((l, i) => (/^- `--(git|max-iterations|bar-raiser|commit-format|branch-format)/.test(l) ? i : -1)).filter((i) => i >= 0)
  assert.ok(paragraph > Math.max(...modeBullets.filter((i) => lines[i].startsWith('- `--git') || lines[i].startsWith('- `--commit') || lines[i].startsWith('- `--branch'))))
  assert.match(lines[paragraph], /default is `sdlc\/\{name\}`/)
  assert.match(lines.slice(paragraph, paragraph + 25).join('\n'), /pre-flight reads the GitLab project push rule/)
  const written = lines.find((l) => l.startsWith('| `.sdlc/config.json`'))
  assert.match(written, /`branchFormat`/)
  assert.match(readme, /^\s+branches\.py\s+#/m)
  note('SC-M-1-055', 'README lines', { row: lines.indexOf(row) + 1, flag: lines.indexOf(flag) + 1, paragraph: paragraph + 1, written: lines.indexOf(written) + 1 })

  const base = baseRef()
  const style = sh(stack, 'git', ['diff', '--stat', `${base}..HEAD`, '--', 'skills/sdlc/prompts/ste-style.md'], { cwd: repoRoot })
  assert.equal(style.stdout, '')
  const edited = sh(stack, 'git', ['diff', '--name-only', `${base}..HEAD`, '--', 'skills/sdlc/prompts'], { cwd: repoRoot }).stdout.split('\n').filter(Boolean)
  assert.ok(edited.length > 10)
  const codes = {}
  for (const f of edited) {
    const t = steCheck(path.join(repoRoot, f))
    codes[f] = t.status
    assert.equal(t.status, 0, `${f}: ${t.stdout}`)
  }
  note('SC-M-1-055', 'ste-check exit codes', codes)

  const copy = path.join(stack.dirs.root, 'ste-long.md')
  fs.writeFileSync(copy, 'Read the file.\n\nThe agent reads the state file that the planner wrote and then checks every slice against the spec and the ledger and writes a report for the human who owns the run and keeps it for later review by the team.\n')
  const bad = steCheck(copy)
  note('SC-M-1-055', 'long copy', { status: bad.status, stdout: bad.stdout.trim() })
  assert.equal(bad.status, 1)
  assert.match(bad.stdout, /ste-long\.md:3: long-sentence/)
  assert.ok(noFatalStderr(bad.stderr))
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
  note('SC-M-1-055', 'log lines', since(stack, offset).length)
})

scenario('SC-M-1-056', 'ste-check fails a copy of integrator.md with a long sentence and passes the original', () => {
  mark(stack, 'SC-M-1-056')
  const before = treeStatus()
  const original = path.join(promptsDir, 'integrator.md')
  const ok = steCheck(original)
  assert.equal(ok.status, 0)
  assert.equal(ok.stdout, '')
  const copy = path.join(stack.dirs.root, 'integrator-copy.md')
  const sentence = 'The release branch is deleted by the maintainer after the old attempt records that were stored by the earlier loop have been read by the reviewer who owns the final merge decision on it today.'
  assert.equal(sentence.split(/\s+/).length, 35)
  fs.writeFileSync(copy, `${fs.readFileSync(original, 'utf8')}\n${sentence}\n`)
  const bad = steCheck(copy)
  note('SC-M-1-056', 'copy result', { status: bad.status, stdout: bad.stdout.trim().split('\n') })
  assert.equal(bad.status, 1)
  assert.ok(bad.stdout.includes(`integrator-copy.md:${fs.readFileSync(copy, 'utf8').split('\n').length - 1}: long-sentence — ${sentence}`))
  assert.ok(noFatalStderr(bad.stderr))
  assert.equal(bad.stderr, '')
  const passiveOnly = path.join(stack.dirs.root, 'passive.md')
  fs.writeFileSync(passiveOnly, 'The branch is deleted by the tool.\n')
  const passive = steCheck(passiveOnly)
  note('SC-M-1-056', 'passive-only line', { status: passive.status, stdout: passive.stdout.trim() })
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
})

const SPEC_CASES = [
  ['branches.test.mjs', /name and (parse|split)[^']*round-trip every kind under the default, a prefixed and a lowercased format/],
  ['branches.test.mjs', /parse returns null for a foreign branch and resolves ids against the ledger/],
  ['branches.test.mjs', /parse keeps the table'?s? precedence/],
  ['branches.test.mjs', /validate_format rejects two placeholders, none, whitespace and an invalid ref/],
  ['branches.test.mjs', /evaluate follows each operator, negate flips, and a bad regex gives null/],
  ['branches.test.mjs', /derive (follows the table and refuses regex, negate and several rules|returns None for a regex rule, a negated rule of each operator and two rules)/],
  ['branches.test.mjs', /preflight through gh and glab shims covers the seven scenarios/],
  ['branches.test.mjs', /the loop script and the module name branches the same way/],
  ['next-action.test.mjs', /the active slice branch, slice PR heads, the state PR, the e2e PR and the stack milestone hold are recognized under a custom format/],
  ['scripts.test.mjs', /state-write creates the slice and milestone branches under a custom format/],
  ['scripts.test.mjs', /janitor sweeps verify branches under a custom format and never touches run or attempt branches/],
  ['prompts.test.mjs', /no prompt spells a loop branch literally/],
  ['prompts.test.mjs', /_common\.md defines every branch placeholder and env-detector records the format/],
]

const suiteRun = (id, label, command, args, opts) => {
  const t = sh(stack, command, args, { timeoutMs: 590000, ...opts })
  const tail = (t.stdout || '').split('\n').filter((l) => /^ℹ (tests|pass|fail|skipped)/.test(l))
  note(id, label, { status: t.status, summary: tail, stderrBytes: (t.stderr || '').length })
  return t
}

scenario('SC-M-1-057', 'suite named cases exist, and npm test is stable across TZ and cwd', () => {
  mark(stack, 'SC-M-1-057')
  const before = treeStatus()
  const testDir = path.join(skillDir, 'test')
  const titles = {}
  for (const file of new Set(SPEC_CASES.map(([f]) => f))) {
    titles[file] = [...read(testDir, file).matchAll(/^test\('((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1])
  }
  const matches = SPEC_CASES.map(([file, re]) => ({ re: String(re).slice(0, 60), hits: titles[file].filter((t) => re.test(t)).length }))
  note('SC-M-1-057', 'case matches', matches)
  for (const m of matches) assert.ok(m.hits >= 1, `no test for ${m.re}`)
  for (const [file, list] of Object.entries(titles)) {
    const dup = list.filter((t, i) => list.indexOf(t) !== i)
    assert.deepEqual(dup, [], `${file} repeats a title`)
  }

  const plain = suiteRun('SC-M-1-057', 'npm test', 'npm', ['test'], { cwd: repoRoot })
  assert.equal(plain.status, 0, plain.stdout.slice(-1200))
  assert.ok(noFatalStderr(plain.stderr))
  const tz = suiteRun('SC-M-1-057', 'npm test TZ=Pacific/Kiritimati', 'npm', ['test'], { cwd: repoRoot, env: { TZ: 'Pacific/Kiritimati' } })
  assert.equal(tz.status, 0, tz.stdout.slice(-1200))
  assert.ok(noFatalStderr(tz.stderr))
  const elsewhere = path.join(stack.dirs.root, 'elsewhere')
  fs.mkdirSync(elsewhere)
  const files = ['branches', 'next-action', 'scripts', 'prompts'].map((n) => path.join(skillDir, 'test', `${n}.test.mjs`))
  const cwd = suiteRun('SC-M-1-057', 'node --test elsewhere', process.execPath, ['--test', ...files], { cwd: elsewhere, env: { TZ: 'Pacific/Kiritimati' } })
  assert.equal(cwd.status, 0, cwd.stdout.slice(-1200))
  assert.ok(noFatalStderr(cwd.stderr))
  assert.deepEqual(fs.readdirSync(elsewhere), [])
  assert.equal(treeStatus(), before)
  assert.equal(before, '')
})

scenario('SC-M-1-058', 'preflight is repeatable: same verdict, same exit code, nothing written', () => {
  const offset = mark(stack, 'SC-M-1-058')
  const repo = gitRepo(stack)
  const before = snapshot(repo)
  const runs = []
  const stamp = (t) => /state-(\d{14})/.exec(t.stdout)[1]
  let crossed = false
  for (let i = 0; i < 40 && (runs.length < 3 || !crossed); i++) {
    const t = branchesPy(repo, ['preflight', '--mode', 'pr'], { id: 'SC-M-1-058' })
    runs.push(t)
    if (runs.length > 1 && stamp(t) !== stamp(runs[0])) crossed = true
    if (!crossed) sh(stack, 'sleep', ['0.3'])
  }
  note('SC-M-1-058', 'runs', runs.map((t) => ({ status: t.status, stderr: t.stderr, stamp: stamp(t) })))
  assert.ok(crossed, 'the state timestamp never crossed a second')
  assert.ok(runs.length >= 3)
  const normal = (t) => t.stdout.replace(/state-\d{14}/g, 'state-<ts>')
  for (const t of runs) {
    assert.equal(t.status, runs[0].status)
    assert.equal(t.status, 0)
    assert.equal(t.stderr, '')
    assert.ok(noFatalStderr(t.stderr))
    assert.equal(t.stdout.split('\n').filter(Boolean).length, 1)
    assert.equal(typeof t.json, 'object')
    assert.equal(normal(t), normal(runs[0]))
  }
  assert.equal(snapshot(repo), before)
  assert.equal(since(stack, offset).filter((l) => /Traceback/.test(l)).length, 0)
  assert.equal(treeStatus(), '')
})
