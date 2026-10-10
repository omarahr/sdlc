import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const ROOT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const common = readFileSync(`${ROOT}/skills/sdlc/prompts/_common.md`, 'utf8')
const rows = [...common.matchAll(/^\s*\| (`<[^|]+>`) \| (.+) \|$/gm)].map(m => [m[1], m[2]])
const row = p => (rows.find(r => r[0] === `\`${p}\``) || [])[1]
const r = cliRunner()
const repo = () => r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}' } } })
const br = t => (t.json && t.json.branch) || ''
const name = (args, repoPath = repo()) => r.run('branches.py', ['name', '--repo', repoPath, ...args])

test('verify cli: VS-1 milestone row command runs', () => {
  assert.equal(row('<milestone branch>'), '`branches.py name --kind milestone --id <milestoneId>`')
  const t = name(['--kind', 'milestone', '--id', 'M-3'])
  assert.equal(t.status, 0, t.text()); assert.equal(t.json.ok, true); assert.equal(br(t), 'sdlc/M-3')
  assert.ok(t.treeUnchanged)
})
test('verify cli: VS-1 custom format applies', () => {
  const rp = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  const t = name(['--kind', 'milestone', '--id', 'M-3'], rp)
  assert.equal(t.status, 0); assert.equal(br(t), 'feature/M-3')
})
test('verify cli: VS-2 e2e row has no area and differs from e2e-area', () => {
  assert.equal(row('<e2e branch>'), '`branches.py name --kind e2e --id <milestoneId>`')
  assert.doesNotMatch(row('<e2e branch>'), /--area/)
  const rp = repo()
  const a = name(['--kind', 'e2e', '--id', 'M-3'], rp)
  const b = name(['--kind', 'e2e-area', '--id', 'M-3', '--area', 'A-1'], rp)
  assert.equal(a.status, 0, a.text()); assert.equal(b.status, 0, b.text())
  assert.equal(a.json.kind, 'e2e'); assert.equal(b.json.kind, 'e2e-area'); assert.notEqual(br(a), br(b))
  console.log(br(a), br(b))
})
test('verify cli: VS-3 e2e-area row, hyphenated, odd and missing area', () => {
  assert.equal(row('<e2e area branch>'), '`branches.py name --kind e2e-area --id <milestoneId> --area <areaId>`')
  const rp = repo()
  for (const area of ['auth', 'user-profile', 'a b', 'a/b', 'Ünï', '..', '-x', 'a;rm']) {
    const t = name(['--kind', 'e2e-area', '--id', 'M-1', '--area', area], rp)
    console.log(JSON.stringify(area), t.status, br(t), t.stderr.trim())
    if (['auth', 'user-profile'].includes(area)) { assert.equal(t.status, 0); assert.equal(br(t), 'sdlc/M-1-e2e-' + area) }
      }
  const t = name(['--kind', 'e2e-area', '--id', 'M-1'], rp)
  assert.notEqual(t.status, 0); assert.equal(t.json.ok, false); assert.match(t.json.error, /non-empty area/)
})
test('verify cli: VS-4 state row takes no id and makes timestamp', () => {
  assert.equal(row('<state branch>'), '`branches.py name --kind state` (it makes the timestamp)')
  assert.doesNotMatch(row('<state branch>'), /--id/)
  const rp = repo()
  const a = name(['--kind', 'state'], rp), b = name(['--kind', 'state'], rp)
  for (const t of [a, b]) { assert.equal(t.status, 0, t.text()); assert.match(br(t), /^sdlc\/state-\d{14}$/) ; console.log(br(t)) }
  assert.ok(a.treeUnchanged)
})
test('verify cli: VS-5 attempt row and bad n', () => {
  assert.equal(row('<attempt branch>'), '`branches.py name --kind attempt --id <sliceId> --n <n>`')
  const rp = repo()
  const ok = name(['--kind', 'attempt', '--id', 'S-026', '--n', '2'], rp)
  assert.equal(ok.status, 0, ok.text()); assert.equal(br(ok), 'sdlc/S-026-attempt-2')
  for (const n of ['0', '-1', 'abc', '99999999999999999999', '1.5', '', ' 2', '²', '٢']) {
    const t = name(['--kind', 'attempt', '--id', 'S-026', '--n', n], rp)
    console.log(JSON.stringify(n), t.status, br(t), t.stderr.trim().split('\n').pop())
    if (t.status === 0) assert.match(br(t), /^sdlc\/[A-Za-z0-9._-]+$/)
    else assert.equal(br(t), '')
  }
  const miss = name(['--kind', 'attempt', '--id', 'S-026'], rp)
  assert.notEqual(miss.status, 0)
})
test('verify cli: VS-6 table has eight rows and each runs', () => {
  const ph = rows.map(x => x[0]); assert.equal(ph.length, 8, ph.join(' '))
  const rp = repo()
  const cmds = [['slice', ['--id', 'S-1']], ['milestone', ['--id', 'M-1']], ['e2e', ['--id', 'M-1']], ['e2e-area', ['--id', 'M-1', '--area', 'a']], ['state', []], ['attempt', ['--id', 'S-1', '--n', '1']]]
  for (const [k, a] of cmds) { const t = name(['--kind', k, ...a], rp); assert.equal(t.status, 0, k + t.text()); console.log(k, br(t)) }
})
