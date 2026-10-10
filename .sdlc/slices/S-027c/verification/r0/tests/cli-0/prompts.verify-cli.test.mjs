import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const WT = process.env.VERIFY_WT
const SKILL = join(WT, 'skills/sdlc')
const P = join(SKILL, 'prompts')
const rd = (f) => readFileSync(join(P, f), 'utf8')
const LOG = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/.sdlc/slices/S-027c/verification/r0/logs'

const slice = ['implementer.md','test-writer.md','test-checker.md','planner.md','verifier.md','verify-planner.md','verify-toolsmith.md','test-reporter.md','gate.md','finding-refuter.md','verify-profile-common.md','verify-collector.md','state-reader.md']
const table = {
  'commit-state.md': ['<slice branch>','<run branch>','<milestone branch>','<state branch>','<e2e branch>'],
  'integrator.md': ['<slice branch>','<run branch>'],
  'milestone-writer.md': ['<e2e area branch>','<e2e branch>','<milestone branch>'],
  'escalator.md': ['<slice branch>','<attempt branch>','<run branch>'],
  'env-detector.md': ['<run branch>'],
  'state-writer.md': ['<slice branch>','<attempt branch>'],
  'e2e-harness.md': ['<e2e branch>','<milestone branch>'],
  'scenario-runner.md': ['<e2e area branch>','<e2e branch>'],
  'slicer.md': ['<slice branch>'],
}
for (const f of slice) table[f] = ['<slice branch>']
table['verify-collector.md'].push('<verify branch>')
const SCAN = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/g

function unfenced(text) {
  const out = []; let fence = null
  for (const l of text.split('\n')) {
    const m = l.match(/^\s*(```+|~~~+)/)
    if (m) { if (!fence) fence = m[1][0]; else if (m[1][0] === fence) fence = null; continue }
    if (!fence) out.push(l)
  }
  return out
}

test('verify cli: VS-1 every table row file holds its placeholders and no literal', () => {
  const rows = []
  for (const [f, phs] of Object.entries(table)) {
    const lines = unfenced(rd(f))
    const lit = lines.filter((l) => l.match(SCAN))
    const text = lines.join('\n')
    const missing = phs.filter((p) => !readFileSync(join(P, f), 'utf8').includes(p))
    rows.push(`${f}: placeholders=${phs.length} missing=[${missing}] literals=${lit.length}`)
    assert.deepEqual(missing, [], f)
    assert.deepEqual(lit, [], f)
  }
  writeFileSync(join(LOG, 'cli-0-vs1.txt'), rows.join('\n') + '\n')
  assert.ok(Object.keys(table).length >= 20)
})

test('verify cli: VS-3 independent scan over all prompts and SKILL.md', () => {
  const files = readdirSync(P).filter((f) => f.endsWith('.md')).map((f) => join(P, f)).concat(join(SKILL, 'SKILL.md'))
  assert.ok(files.length > 20)
  const hits = []
  for (const f of files) {
    const t = readFileSync(f, 'utf8').split('\n'); let fence = null
    t.forEach((l, i) => {
      const m = l.match(/^\s*(```+|~~~+)/)
      if (m) { fence = fence ? null : m[1][0]; return }
      if (!fence && l.match(SCAN)) hits.push(`${f}:${i + 1}: ${l}`)
    })
  }
  writeFileSync(join(LOG, 'cli-0-vs3.txt'), `files scanned: ${files.length}\nhits: ${hits.length}\n${hits.join('\n')}\n`)
  assert.deepEqual(hits, [])
  for (const s of ['git checkout sdlc/S-001', 'x sdlc/run-3']) assert.ok(s.match(SCAN), s)
  for (const s of ['.sdlc/slices/x', 'sdlc/tracker/index.html', 'sdlc/STOP', 'sdlc/{name}', 'xsdlc/a']) assert.equal(s.match(SCAN), null, s)
})

test('verify cli: VS-6 ste-check on every edited prompt exits 0 with empty stdout', () => {
  const names = execFileSync('git', ['-C', WT, 'diff', '--name-only', 'd0678e2', 'HEAD', '--', 'skills/sdlc/prompts', 'skills/sdlc/SKILL.md'], { encoding: 'utf8' }).trim().split('\n').filter((f) => f.endsWith('.md') && f.includes('prompts/'))
  assert.ok(names.length >= 20)
  const r = cliRunner({ skillDir: SKILL })
  const t = r.run('ste-check.py', names.map((n) => join(WT, n)))
  writeFileSync(join(LOG, 'cli-0-ste.txt'), `files: ${names.length}\n${names.join('\n')}\nexit=${t.status}\nstdout=${t.stdout}\nstderr=${t.stderr}\n`)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(t.stdout.trim(), '')
  const bad = r.run('ste-check.py', [join(P, 'nonexistent.md')])
  assert.equal(bad.status, 1)
})

test('verify cli: VS-6 git commands keep one placeholder per argument and the worktree rule stays', () => {
  const bad = []
  for (const f of readdirSync(P).filter((x) => x.endsWith('.md'))) {
    rd(f).split('\n').forEach((l, i) => {
      if (/git (worktree add|checkout|switch|branch|push|merge|rebase)/.test(l) && /<[a-z0-9 ]+ branch>[\w\-*]/.test(l)) bad.push(`${f}:${i + 1}: ${l}`)
      if (/<[a-z0-9 ]+ branch><[a-z0-9 ]+ branch>/.test(l)) bad.push(`${f}:${i + 1}: ${l}`)
    })
  }
  writeFileSync(join(LOG, 'cli-0-cmds.txt'), bad.join('\n') + '\n')
  assert.deepEqual(bad, [])
  const vc = rd('verify-profile-common.md')
  assert.match(vc, /git worktree add -b <branch> "\$TMPDIR\/<branch with \/ replaced by ->" <slice branch>/)
})
