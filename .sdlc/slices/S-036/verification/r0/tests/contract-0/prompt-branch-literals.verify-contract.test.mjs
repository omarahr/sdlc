import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const ROOT = process.env.VERIFY_ROOT
const PROMPTS = join(ROOT, 'skills/sdlc/prompts')
const LOOP_BRANCH_LITERAL = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/
const read = n => readFileSync(join(PROMPTS, `${n}.md`), 'utf8')
const strip = t => t.replace(/```[^\n]*\n[\s\S]*?```/g, b => (b.includes('branches.py') ? '' : b))
const count = (t, s) => t.split(s).length - 1

const seed = Number(process.env.TESTKIT_SEED || 20261010)
let state = seed
const rnd = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32 }
const pick = a => a[Math.floor(rnd() * a.length)]

test('verify contract VS-1: scenario-runner exact command and variants', () => {
  const t = read('scenario-runner')
  const cmd = 'git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e area branch> <e2e branch>'
  assert.equal(count(t, cmd), 1)
  for (const bad of [
    'git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b sdlc/<milestoneId>-e2e-<areaId> sdlc/<milestoneId>-e2e',
    'git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e branch> <e2e area branch>',
    'git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e-area-branch> <e2e branch>',
  ]) assert.ok(!t.includes(bad))
  assert.doesNotMatch(strip(t), LOOP_BRANCH_LITERAL)
  assert.match('git worktree add x -b sdlc/<milestoneId>-e2e-<areaId> sdlc/<milestoneId>-e2e', LOOP_BRANCH_LITERAL)
  assert.ok(!t.replace(cmd, 'git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e branch> <e2e area branch>').includes(cmd))
})

test('verify contract VS-2: env-detector run branch placeholder and parsed kind', () => {
  const t = read('env-detector')
  assert.ok(count(t, '<run branch>') >= 3)
  assert.ok(t.includes('a branch that parses as kind `run`'))
  assert.doesNotMatch(t, /sdlc\/run-/)
  assert.doesNotMatch(t, /sdlc\/run-\*/)
  assert.ok(t.includes('sdlc/{name}'))
  assert.doesNotMatch(strip(t), LOOP_BRANCH_LITERAL)
  for (const s of ['sdlc/run-2', 'sdlc/run-*', 'git checkout -b sdlc/run-3 main']) assert.match(s, LOOP_BRANCH_LITERAL)
  assert.doesNotMatch('branchFormat else sdlc/{name}', LOOP_BRANCH_LITERAL)
})

test('verify contract VS-2: branches.py parse accepts a run branch under the default format', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: ['sdlc/run-2', 'sdlc/S-003', 'sdlc/M-1'] })
  const out = {}
  for (const b of ['sdlc/run-2', 'sdlc/S-003', 'sdlc/M-1', 'sdlc/run-2-x']) {
    const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', b])
    out[b] = { status: t.status, json: t.json }
    assert.ok(t.treeUnchanged)
  }
  assert.equal(out['sdlc/run-2'].status, 0)
  assert.equal(out['sdlc/run-2'].json.kind, 'run')
  assert.equal(out['sdlc/S-003'].json.kind, 'slice')
  assert.equal(out['sdlc/M-1'].json.kind, 'milestone')
  console.log(JSON.stringify(out))
})

test('verify contract VS-3: milestone-writer placeholders and no literals', () => {
  const t = read('milestone-writer')
  for (const p of ['<e2e area branch>', '<e2e branch>', '<milestone branch>']) assert.ok(t.includes(p), p)
  assert.doesNotMatch(t, /sdlc\/M-/)
  assert.doesNotMatch(t, /sdlc\/<id>-e2e/)
  assert.doesNotMatch(t, /sdlc\/<id>-e2e-<area/)
  assert.doesNotMatch(t, /sdlc\/<milestoneId>-e2e/)
  assert.doesNotMatch(t, LOOP_BRANCH_LITERAL)
  const unstripped = t.match(/`[^`]*(?<![.\w])sdlc\/(?!tracker|STOP|\{name)[^`]*`/g)
  assert.equal(unstripped, null)
  for (const s of ['sdlc/M-1', 'sdlc/<id>-e2e-<area>', '| sdlc/M-1 |', '`sdlc/M-1`']) assert.match(s, LOOP_BRANCH_LITERAL)
})

test('verify contract VS-4: e2e-harness placeholders and no literals', () => {
  const t = read('e2e-harness')
  for (const p of ['<e2e branch>', '<milestone branch>']) assert.ok(t.includes(p), p)
  assert.doesNotMatch(t, /sdlc\/<milestoneId>-e2e/)
  assert.doesNotMatch(t, /sdlc\/M-/)
  assert.doesNotMatch(t, LOOP_BRANCH_LITERAL)
})

test('verify contract VS-5: guard property over mutated prompt text', () => {
  const files = ['scenario-runner', 'env-detector', 'milestone-writer', 'e2e-harness']
  const literals = ['sdlc/M-1', 'sdlc/M-<n>', 'sdlc/run-2', 'sdlc/run-<n>', 'sdlc/S-003', 'sdlc/<id>-e2e', 'sdlc/<milestoneId>-e2e', 'sdlc/<id>-e2e-<area>', 'sdlc/run-*', 'sdlc/S-001-attempt-1']
  const wrap = [l => l, l => `\`${l}\``, l => `| ${l} |`, l => `(${l})`, l => `"${l}"`]
  let runs = 0
  for (let i = 0; i < 1200; i++) {
    const f = pick(files)
    const text = strip(read(f))
    assert.doesNotMatch(text, LOOP_BRANCH_LITERAL)
    const lit = pick(wrap)(pick(literals))
    const pos = Math.floor(rnd() * (text.length + 1))
    const mutated = text.slice(0, pos) + ' ' + lit + ' ' + text.slice(pos)
    assert.match(mutated, LOOP_BRANCH_LITERAL, `${f}: ${lit}`)
    const allowed = text.slice(0, pos) + ' sdlc/{name} ' + text.slice(pos)
    assert.doesNotMatch(allowed, LOOP_BRANCH_LITERAL)
    runs++
  }
  console.log(`property-run seed=${seed} runs=${runs}`)
  assert.ok(runs >= 1000)
  for (const ok of ['.sdlc/slices', 'sdlc/tracker', 'sdlc/STOP', 'sdlc/{name}', 'mysdlc/M-1', 'a.sdlc/M-1']) assert.doesNotMatch(ok, LOOP_BRANCH_LITERAL, ok)
  for (const bad of ['sdlc/M-1', 'sdlc/run-2', 'sdlc/S-003', 'sdlc/<id>-e2e', 'sdlc/<milestoneId>-e2e-faults']) assert.match(bad, LOOP_BRANCH_LITERAL, bad)
  const fenced = 'x\n```bash\npython3 branches.py name --kind run\nsdlc/run-2\n```\ny'
  assert.doesNotMatch(strip(fenced), LOOP_BRANCH_LITERAL)
  const fencedOther = 'x\n```bash\ngit checkout sdlc/run-2\n```\ny'
  assert.match(strip(fencedOther), LOOP_BRANCH_LITERAL)
})

test('verify contract: guard source in the slice tests equals the audited regex', () => {
  const src = readFileSync(join(ROOT, 'skills/sdlc/test/prompts.test.mjs'), 'utf8')
  assert.ok(src.includes('const LOOP_BRANCH_LITERAL = /(?<![.\\w])sdlc\\/(?!tracker|STOP|\\{name)/'))
  for (const id of ['T-R-132', 'T-R-133', 'T-R-144', 'T-R-148']) assert.equal(count(src, `test('${id}:`), 1)
})
