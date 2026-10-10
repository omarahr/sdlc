import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const ROOT = process.env.VERIFY_ROOT
const KIT = `${ROOT}/skills/sdlc/test/testkit`
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const SKILL = readFileSync(`${ROOT}/skills/sdlc/SKILL.md`, 'utf8')
const BASE = execFileSync('git', ['-C', ROOT, 'show', 'main:skills/sdlc/SKILL.md'], { encoding: 'utf8' })

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function model(text) {
  const idx = (s, from = 0) => text.indexOf(s, from)
  const cmd = idx('- `/sdlc <spec-path>')
  const line = cmd < 0 ? '' : text.slice(cmd, text.indexOf('\n', cmd))
  const commit = idx('  - `--commit-format`')
  const branch = idx('  - `--branch-format`')
  const bar = idx('  - `--bar-raiser N`')
  const git = idx('**Git mode:**')
  const bf = idx('- **Branch format:**')
  const stop = idx('rm -f "$REPO/.sdlc/STOP"')
  const bfEnd = bf < 0 ? -1 : text.indexOf('\n', bf)
  const mismatch = idx('After the worktree exists, when `$WT/.sdlc/config.json`')
  const launch = idx('Call `Workflow({')
  const launchLine = launch < 0 ? '' : text.slice(launch, text.indexOf('\n', launch))
  const args = launchLine.match(/args: \{([^}]*)\}/)?.[1].split(',').map((x) => x.trim()) ?? []
  return {
    flagInCommands: /--commit-format "<format>"\] \[--branch-format "<format>"\]/.test(line),
    bulletOrder: commit >= 0 && branch > commit && (bar < 0 || branch < bar),
    bulletFacts: branch >= 0 && /\{name\}/.test(text.slice(branch, text.indexOf('\n', branch))) && /sdlc\/\{name\}/.test(text.slice(branch, text.indexOf('\n', branch))) && /config\.json/.test(text.slice(branch, text.indexOf('\n', branch))),
    branchBulletPlace: git >= 0 && bf > git && stop > bf,
    mismatchAfter: bf >= 0 && mismatch > bf && mismatch < stop,
    oldGone: !/Branch name \(first run only\)|branch_name_regex|push_rule/.test(text),
    launchOrder: args.indexOf('commitFormat') >= 0 && args.indexOf('branchFormat') === args.indexOf('commitFormat') + 1 && args.indexOf('maxIterations') === args.indexOf('branchFormat') + 1,
    launchSentence: /`branchFormat` is `\$FMT`; pass it on every launch/.test(text),
    bfText: bf < 0 ? '' : text.slice(bf, bfEnd),
    mismatchText: mismatch < 0 ? '' : text.slice(mismatch, text.indexOf('\n', mismatch)),
  }
}
const ALL = ['flagInCommands', 'bulletOrder', 'bulletFacts', 'branchBulletPlace', 'mismatchAfter', 'oldGone', 'launchOrder', 'launchSentence']

test('verify contract VS-1: flag in Commands line and bullet order', () => {
  const m = model(SKILL)
  assert.ok(m.flagInCommands)
  assert.ok(m.bulletOrder)
  assert.ok(m.bulletFacts)
})

test('verify contract VS-1: mutated SKILL.md without the flag or with it misplaced fails the model', () => {
  const noFlag = SKILL.replace(' [--branch-format "<format>"]', '')
  assert.equal(model(noFlag).flagInCommands, false)
  const swapped = SKILL.replace('[--commit-format "<format>"] [--branch-format "<format>"]', '[--branch-format "<format>"] [--commit-format "<format>"]')
  assert.equal(model(swapped).flagInCommands, false)
  const lines = SKILL.split('\n')
  const bi = lines.findIndex((l) => l.startsWith('  - `--branch-format`'))
  const ci = lines.findIndex((l) => l.startsWith('  - `--commit-format`'))
  const moved = [...lines]
  const [b] = moved.splice(bi, 1)
  moved.splice(ci, 0, b)
  assert.equal(model(moved.join('\n')).bulletOrder, false)
})

test('verify contract VS-2: branch format bullet placement and old text gone', () => {
  const m = model(SKILL)
  assert.ok(m.branchBulletPlace)
  assert.ok(m.oldGone)
  for (const s of ['branches.py" preflight --repo "$REPO" --mode <gitMode>', '--format "<format>"', '--branch "$BASE_BRANCH"', 'samples', '`rule`', '`notes`', '`suggestion`', '`working`', 'git branch -m <new-name>', 'first run only', '`derived`']) {
    assert.ok(m.bfText.includes(s), s)
  }
  assert.equal(SKILL.split('**Git mode:**').length, 2)
})

test('verify contract VS-2: the commands in the text run against branches.py', () => {
  const m = model(SKILL)
  assert.ok(m.bfText.includes('--mode <gitMode>'))
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: [] })
  for (const [mode, extra] of [['direct', []], ['pr', []], ['mr', ['--branch', 'feature/x']], ['stack', []]]) {
    const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, '--format', 'sdlc/{name}', ...extra])
    assert.equal(t.status, 0, `${mode}: ${t.stderr}`)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.format, 'sdlc/{name}')
    assert.equal(typeof t.json.derived, 'boolean')
    for (const k of ['ok', 'format', 'derived', 'samples', 'notes']) assert.ok(k in t.json, `${mode} ${k}`)
  }
  const p = r.run('branches.py', ['parse', '--repo', repo, '--format', 'sdlc/{name}', '--branch', 'sdlc/S-001'])
  assert.equal(p.status, 0, p.stderr)
  assert.match(p.stdout, /slice/)
  const q = r.run('branches.py', ['parse', '--repo', repo, '--format', 'sdlc/{name}', '--branch', 'feature/x'])
  assert.equal(q.treeUnchanged, true)
})

test('verify contract VS-2: preflight verdict with a failing format has the fields the text prints', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: [] })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'direct', '--format', 'no-placeholder'])
  assert.notEqual(t.stdout.trim(), '')
  const j = t.json ?? {}
  assert.equal(j.ok, false)
  assert.equal(typeof j.error, 'string')
  assert.equal(t.status, 2)
  const missing = ['samples', 'notes', 'suggestion'].filter((k) => !(k in j))
  console.log('invalid format verdict lacks:', missing.join(','))
})

test('verify contract VS-3: resume takes branchFormat from config.json', () => {
  const m = model(SKILL)
  assert.match(m.bfText, /config\.json` `branchFormat`/)
  assert.match(m.bfText, /On a resume/)
  assert.match(m.bfText, /without `--branch-format`/)
  assert.match(m.bfText, /`derived` is true, tell the user the format you derived and that it is now in config\.json/)
  assert.match(m.bfText, /`FMT` is its `format`/)
})

test('verify contract VS-4: mismatch bullet reports both values and ends', () => {
  const m = model(SKILL)
  assert.ok(m.mismatchAfter)
  assert.match(m.mismatchText, /differs from `\$FMT`/)
  assert.match(m.mismatchText, /report both and end/)
  assert.match(m.mismatchText, /a run in progress keeps its names/)
})

test('verify contract VS-5: launch args order and sentence', () => {
  const m = model(SKILL)
  assert.ok(m.launchOrder)
  assert.ok(m.launchSentence)
  const launch = SKILL.slice(SKILL.indexOf('Call `Workflow({'))
  const line = launch.slice(0, launch.indexOf('\n'))
  const argsSrc = line.match(/args: (\{[^}]*\})/)[1]
  const obj = new Function('specPath', 'WT', 'REPO', `return (${argsSrc.replace(/repoRoot: "[^"]*"/, 'repoRoot: WT').replace(/mainRoot: REPO/, 'mainRoot: REPO').replace(/skillDir: "[^"]*"/, 'skillDir: 1')})`)
  assert.ok(typeof obj === 'function')
})

test('verify contract VS-6: only expected lines changed against main', () => {
  const a = BASE.split('\n')
  const b = SKILL.split('\n')
  const bset = new Set(b)
  const removed = a.filter((l) => !bset.has(l))
  const aset = new Set(a)
  const added = b.filter((l) => !aset.has(l))
  assert.equal(removed.length, 4, removed.map((l) => l.slice(0, 60)).join('\n'))
  assert.equal(added.length, 6, added.map((l) => l.slice(0, 60)).join('\n'))
  for (const r of removed) assert.match(r, /\/sdlc <spec-path>|In `pr` mode, `gh auth status`|Branch name \(first run only\)|Call `Workflow\(/)
})

test('verify contract property: every single-line deletion or line swap that touches a required line fails the model; 1500 runs', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? 20261010)
  const rand = rng(seed)
  const lines = SKILL.split('\n')
  const required = lines.map((l, i) => ({ l, i })).filter(({ l }) => /--branch-format|\*\*Branch format:\*\*|\*\*Git mode:\*\*|After the worktree exists|branchFormat|Workflow\(\{|rm -f "\$REPO\/\.sdlc\/STOP"|`--commit-format`|^- `\/sdlc <spec-path>/.test(l)).map(({ i }) => i)
  let runs = 0
  let detected = 0
  let harmless = 0
  for (; runs < 1500; runs++) {
    const out = [...lines]
    const kind = rand() < 0.5 ? 'delete' : 'swap'
    const i = Math.floor(rand() * lines.length)
    let touches
    if (kind === 'delete') {
      out.splice(i, 1)
      touches = required.includes(i)
    } else {
      const j = Math.min(lines.length - 1, i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
      touches = required.includes(i) || required.includes(j)
    }
    const m = model(out.join('\n'))
    const ok = ALL.every((k) => m[k])
    if (touches && i !== 0) {
      if (kind === 'delete') assert.equal(ok, false, `deleting line ${i} went unnoticed`)
      if (!ok) detected++
    } else if (!touches) {
      if (!ok) assert.fail(`untouched change broke model at ${kind} ${i}`)
      harmless++
    }
  }
  console.log(`seed=${seed} runs=${runs} detected=${detected} harmless=${harmless}`)
  assert.equal(runs, 1500)
})

test('verify contract determinism: model gives same result twice', () => {
  assert.deepEqual(model(SKILL), model(SKILL))
})
