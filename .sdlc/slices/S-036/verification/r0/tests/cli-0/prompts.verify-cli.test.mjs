import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const WT = process.env.VERIFY_WT
const PROMPTS = join(WT, 'skills/sdlc/prompts')
const LOOP_BRANCH_LITERAL = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/
const strip = t => t.replace(/```[^\n]*\n[\s\S]*?```/g, b => (b.includes('branches.py') ? '' : b))
const read = n => readFileSync(join(PROMPTS, `${n}.md`), 'utf8')
const RUNNER = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

test('verify cli: VS-1 scenario-runner on disk holds the exact worktree command and no literal', () => {
  const t = read('scenario-runner')
  assert.ok(t.includes('git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e area branch> <e2e branch>'))
  assert.doesNotMatch(strip(t), LOOP_BRANCH_LITERAL)
})

test('verify cli: VS-1 variants of the worktree line are rejected by the exact-command check', () => {
  const good = 'git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e area branch> <e2e branch>'
  const t = read('scenario-runner')
  const variants = [
    good.replace('<e2e area branch>', 'sdlc/<milestoneId>-e2e'),
    good.replace('-b <e2e area branch> <e2e branch>', '-b <e2e branch> <e2e area branch>'),
    good.replace('<e2e area branch>', '<e2e-area-branch>'),
  ]
  for (const v of variants) assert.ok(!t.replace(good, v).includes(good), v)
  assert.match(t.replace(good, variants[0]), LOOP_BRANCH_LITERAL)
})

test('verify cli: VS-2 env-detector on disk has three run placeholders, the kind phrase, no glob', () => {
  const t = read('env-detector')
  assert.ok(t.split('<run branch>').length - 1 >= 3)
  assert.ok(t.includes('a branch that parses as kind `run`'))
  assert.doesNotMatch(t, /sdlc\/run-/)
  assert.match(t, /sdlc\/\{name\}/)
  assert.doesNotMatch(strip(t), LOOP_BRANCH_LITERAL)
})

test('verify cli: VS-2 branches.py parse reports kind run for a run branch under the default format', async () => {
  const { cliRunner } = await import(RUNNER)
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: ['sdlc/run-2'] })
  const run = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/run-2', '--format', 'sdlc/{name}'])
  assert.equal(run.status, 0, run.stderr)
  assert.equal(run.json.kind, 'run')
  const none = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'feature/x', '--format', 'sdlc/{name}'])
  assert.notEqual(none.json && none.json.kind, 'run')
  console.log(JSON.stringify({ run: run.json, none: none.json, status: none.status }))
})

test('verify cli: VS-5 guard matches bad samples and ignores allowed text', () => {
  for (const s of ['sdlc/M-1', 'sdlc/run-2', 'sdlc/S-003', 'sdlc/<milestoneId>-e2e', 'sdlc/<id>-e2e-<area>', 'git checkout sdlc/M-1', 'sdlc/M-<n>'])
    assert.match(s, LOOP_BRANCH_LITERAL, s)
  for (const s of ['sdlc/{name}', '.sdlc/slices', 'x/sdlc/tracker', 'sdlc/STOP', '.sdlc/STOP'])
    assert.doesNotMatch(s, LOOP_BRANCH_LITERAL, s)
  assert.doesNotMatch(strip('```\npython3 branches.py name\nsdlc/S-001\n```\n'), LOOP_BRANCH_LITERAL)
  assert.match(strip('```\ngit checkout sdlc/S-001\n```\n'), LOOP_BRANCH_LITERAL)
})

test('verify cli: VS-5 injecting a literal into a scratch copy of each prompt trips the guard', () => {
  for (const n of ['scenario-runner', 'env-detector', 'milestone-writer', 'e2e-harness']) {
    const t = read(n)
    assert.doesNotMatch(strip(t), LOOP_BRANCH_LITERAL, n)
    for (const lit of ['sdlc/M-1', 'sdlc/run-3', 'sdlc/S-003', 'sdlc/M-1-e2e'])
      assert.match(strip(t + `\nRun git checkout ${lit}\n`), LOOP_BRANCH_LITERAL, `${n} ${lit}`)
    assert.match(strip(t + '\n```\ngit checkout sdlc/M-1\n```\n'), LOOP_BRANCH_LITERAL, `${n} fenced`)
  }
})

test('verify cli: VS-5 injected prompt in a scratch copy of the real test file fails the real test', () => {
  const dir = mkdtempSync(join(tmpdir(), 'v36-'))
  cpSync(join(WT, 'skills'), join(dir, 'skills'), { recursive: true })
  const p = join(dir, 'skills/sdlc/prompts/milestone-writer.md')
  writeFileSync(p, readFileSync(p, 'utf8') + '\nCreate sdlc/M-1 now.\n')
  const r = spawnSync('node', ['--test', join(dir, 'skills/sdlc/test/prompts.test.mjs')], { encoding: 'utf8', cwd: dir, env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('NODE_TEST'))) })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout, /✖ T-R-144/)
  console.log((r.stdout.match(/✖ T-R-\d+[a-z]?/g) || []).join(','))
})
