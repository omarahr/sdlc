import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { all } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const ALLOWED = {
  pr: ['slice', 'state', 'e2e'],
  stack: ['run', 'milestone', 'slice'],
  mr: ['working'],
  direct: [],
}
const FAMILIES = ['flag-like-values', 'traversal', 'control-chars', 'unicode-confusables', 'injection', 'format-strings', 'unicode-whitespace']
const FORBIDDEN = ['e2e-area', 'verify', 'attempt']
const r = cliRunner()
const repo = r.gitRepo({ files: {}, branches: [] })

function kindsOf(mode, extra = [], fmt) {
  const args = ['preflight', '--repo', repo, '--mode', mode, ...(fmt ? ['--format', fmt] : []), ...extra]
  const t = r.run('branches.py', args)
  const samples = t.json && t.json.samples ? t.json.samples : (t.json && t.json.rows) || []
  return { t, kinds: samples.map((s) => s.kind) }
}

test('verify security: baseline sampled kinds per mode', () => {
  for (const mode of Object.keys(ALLOWED)) {
    const { t, kinds } = kindsOf(mode, ['--branch', 'sdlc/run-1'])
    assert.ok(t.json, `${mode}: no json: ${t.stdout} ${t.stderr}`)
    for (const k of kinds) assert.ok(ALLOWED[mode].includes(k), `${mode}: unexpected kind ${k}`)
    for (const k of FORBIDDEN) assert.ok(!kinds.includes(k))
  }
})

test('verify security: hostile --branch values never add a sampled kind', () => {
  const entries = all({ argv: true, only: FAMILIES })
  for (const mode of Object.keys(ALLOWED)) {
    for (const e of entries) {
      const { t, kinds } = kindsOf(mode, ['--branch=' + e.value])
      assert.ok(t.status === 0 || t.status === 2 || t.status === 1, `${mode}/${e.id}: status ${t.status} ${t.stderr.slice(0, 200)}`)
      assert.ok(!/Traceback/.test(t.stderr), `${mode}/${e.id}: traceback`)
      for (const k of kinds) assert.ok(ALLOWED[mode].includes(k), `${mode}/${e.id}: kind ${k}`)
      for (const k of FORBIDDEN) assert.ok(!kinds.includes(k))
    }
  }
})

test('verify security: hostile --format values never add a sampled kind or crash', () => {
  const entries = all({ argv: true, only: FAMILIES })
  for (const mode of Object.keys(ALLOWED)) {
    for (const e of entries) {
      const { t, kinds } = kindsOf(mode, [], e.value)
      assert.ok(!/Traceback/.test(t.stderr), `${mode}/${e.id}: traceback`)
      for (const k of kinds) assert.ok(ALLOWED[mode].includes(k), `${mode}/${e.id}: kind ${k}`)
      for (const k of FORBIDDEN) assert.ok(!kinds.includes(k))
    }
  }
})

test('verify security: hostile branchFormat in config never adds a sampled kind or crashes', () => {
  for (const e of all({ argv: true, only: FAMILIES })) {
    let rp
    try { rp = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: e.value } }, branches: [] }) } catch { continue }
    for (const mode of Object.keys(ALLOWED)) {
      const t = r.run('branches.py', ['preflight', '--repo', rp, '--mode', mode])
      assert.ok(!/Traceback/.test(t.stderr), `${mode}/${e.id}: traceback`)
      const samples = (t.json && t.json.samples) || []
      for (const s of samples) assert.ok(ALLOWED[mode].includes(s.kind), `${mode}/${e.id}: kind ${s.kind}`)
    }
  }
})
