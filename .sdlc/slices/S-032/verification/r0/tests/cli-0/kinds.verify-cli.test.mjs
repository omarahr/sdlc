import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { all } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const LOG = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/.sdlc/slices/S-032/verification/r0/logs/cli-0-transcripts.txt'
const lines = []
const r = cliRunner()
const repo = r.gitRepo({ files: {} })
function pf(mode, extra = [], cfg) {
  const rp = cfg ? r.gitRepo({ files: { '.sdlc/config.json': cfg }, name: 'cfg' + Math.random().toString(36).slice(2) }) : repo
  const t = r.run('branches.py', ['preflight', '--repo', rp, '--mode', mode, ...extra])
  lines.push(`$ ${t.argv?.join(' ') ?? ''}\nexit=${t.status}\n${t.stdout}${t.stderr}`)
  return t
}
const kinds = (t) => (t.json?.samples ?? []).map((s) => s.kind)
const byKind = (t, k) => (t.json?.samples ?? []).filter((s) => s.kind === k)

test('verify cli VS-1: state sample only in pr', () => {
  const p = pf('pr')
  assert.equal(p.status, 0)
  const st = byKind(p, 'state')
  assert.equal(st.length, 1)
  assert.match(st[0].name, /^sdlc\/state-\d{14}$/)
  assert.deepEqual(byKind(pf('stack'), 'state'), [])
  const c = pf('pr', [], { branchFormat: 'feature/{name}' })
  assert.match(byKind(c, 'state')[0].name, /^feature\/state-\d{14}$/)
  const f = pf('pr', ['--format', 'x/{name}'])
  assert.match(byKind(f, 'state')[0].name, /^x\/state-\d{14}$/)
  assert.deepEqual(byKind(pf('stack', [], { branchFormat: 'feature/{name}' }), 'state'), [])
})

test('verify cli VS-2: mr and direct sample no state', () => {
  for (const m of ['mr', 'direct']) {
    for (const extra of [[], ['--branch', 'sdlc/run-3']]) {
      const t = pf(m, extra)
      assert.equal(t.status, 0)
      assert.ok(!kinds(t).includes('state'), `${m} ${extra}`)
    }
  }
  assert.deepEqual(kinds(pf('mr', ['--branch', 'sdlc/run-3'])), ['working'])
  assert.deepEqual(kinds(pf('mr')), [])
  assert.deepEqual(kinds(pf('direct', ['--branch', 'sdlc/run-3'])), [])
})

test('verify cli VS-3: run and milestone only in stack', () => {
  const s = pf('stack')
  assert.equal(byKind(s, 'run')[0].name, 'sdlc/run-1')
  assert.equal(byKind(s, 'milestone')[0].name, 'sdlc/M-1')
  const p = pf('pr')
  assert.deepEqual([...byKind(p, 'run'), ...byKind(p, 'milestone')], [])
  const c = pf('stack', [], { branchFormat: 'feature/{name}' })
  assert.equal(byKind(c, 'run')[0].name, 'feature/run-1')
  assert.equal(byKind(c, 'milestone')[0].name, 'feature/M-1')
  for (const m of ['mr', 'direct']) {
    const t = pf(m, ['--branch', 'sdlc/x'])
    assert.deepEqual([...byKind(t, 'run'), ...byKind(t, 'milestone')], [])
  }
})

test('verify cli VS-4: e2e only in pr', () => {
  assert.equal(byKind(pf('pr'), 'e2e')[0].name, 'sdlc/M-1-e2e')
  assert.equal(byKind(pf('pr', [], { branchFormat: 'feature/{name}' }), 'e2e')[0].name, 'feature/M-1-e2e')
  for (const m of ['stack', 'mr', 'direct']) assert.deepEqual(byKind(pf(m, ['--branch', 'sdlc/x']), 'e2e'), [], m)
})

test('verify cli VS-5: only known kinds, also with hostile input', () => {
  const allowed = { pr: ['slice', 'state', 'e2e'], stack: ['run', 'milestone', 'slice'], mr: ['working'], direct: [] }
  for (const m of Object.keys(allowed)) {
    const t = pf(m, ['--branch', 'sdlc/ok'])
    for (const k of kinds(t)) assert.ok(allowed[m].includes(k), `${m}:${k}`)
    for (const bad of ['e2e-area', 'verify', 'attempt']) assert.ok(!kinds(t).includes(bad))
  }
  const entries = all({ argv: true })
  let crashes = 0
  for (const e of entries) {
    for (const m of Object.keys(allowed)) {
      const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', m, '--branch=' + e.value])
      if (t.spawnError) continue
      if (t.status !== 0 && !t.json) { if (!/error|usage/i.test(t.stderr)) crashes++; if (/Traceback/.test(t.stderr)) crashes++; continue }
      if (/Traceback/.test(t.stderr)) crashes++
      for (const k of kinds(t)) assert.ok(allowed[m].includes(k), `${m}:${k} for ${e.id}`)
    }
    const h = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr', '--format=' + e.value])
    assert.ok(!/Traceback/.test(h.stderr), `format ${e.id}`)
    if (h.json) for (const k of kinds(h)) assert.ok(allowed.pr.includes(k), `fmt ${e.id} ${k}`)
    const hc = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: e.value } }, name: 'h' })
    const t2 = r.run('branches.py', ['preflight', '--repo', hc, '--mode', 'stack'])
    assert.ok(!/Traceback/.test(t2.stderr), `cfg ${e.id}`)
    if (t2.json) for (const k of kinds(t2)) assert.ok(allowed.stack.includes(k))
  }
  assert.equal(crashes, 0)
  lines.push(`hostile entries: ${entries.length}`)
})

test.after(() => writeFileSync(LOG, lines.join('\n---\n').slice(0, 200000)))
