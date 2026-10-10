import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.VERIFY_ROOT
const read = n => readFileSync(join(ROOT, 'skills/sdlc/prompts', `${n}.md`), 'utf8')
const LITERALS = [/sdlc\/S-\d/, /sdlc\/run-/, /sdlc\/M-/, /sdlc\/state-/, /sdlc\/<id>/, /sdlc\/e2e/, /sdlc\/verify/]
const GENERIC = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/g
const strip = t => t.replace(/```[^\n]*\n[\s\S]*?```/g, b => (b.includes('branches.py') ? '' : b))
const THIRTEEN = ['implementer', 'test-writer', 'test-checker', 'planner', 'verifier', 'verify-planner', 'verify-toolsmith', 'test-reporter', 'gate', 'finding-refuter', 'verify-profile-common', 'verify-collector', 'state-reader']

test('verify contract: VS-1 state-schema runBranch and branch field by kind', () => {
  const t = read('state-schema')
  const runLine = t.split('\n').find(l => l.startsWith('- `runBranch`'))
  assert.ok(runLine)
  assert.ok(runLine.includes('the run branch (`run` kind under `config.branchFormat`)'))
  const branchLine = t.split('\n').find(l => l.startsWith('- `branch` is'))
  assert.ok(branchLine && branchLine.includes('the slice branch under `config.branchFormat`'))
  for (const re of LITERALS) assert.doesNotMatch(t, re)
  assert.doesNotMatch(t, /sdlc\/run-<n>|sdlc\/run-\d|sdlc\/S-0/)
  const json = [...t.matchAll(/"branch":\s*"([^"]*)"/g)].map(m => m[1])
  assert.ok(json.length >= 1)
  for (const v of json) assert.equal(v, '<slice branch>')
})

test('verify contract: VS-2 commit-state placeholders and no literals in any block', () => {
  const t = read('commit-state')
  for (const p of ['<slice branch>', '<run branch>', '<milestone branch>', '<state branch>']) assert.ok(t.includes(p), p)
  for (const re of LITERALS) assert.doesNotMatch(t, re)
  const blocks = [...t.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(m => m[1])
  for (const b of blocks) assert.doesNotMatch(b, GENERIC)
  const inline = [...t.matchAll(/`([^`\n]+)`/g)].map(m => m[1])
  for (const c of inline) assert.doesNotMatch(c, GENERIC)
  assert.ok(t.includes('git checkout -b <state branch>'))
})

test('verify contract: VS-3 no date -u in commit-state, state branch mapped in _common', () => {
  const t = read('commit-state')
  assert.ok(!/date\s+-u/.test(t))
  assert.ok(!/\$\(date/.test(t))
  assert.ok(!/%Y%m%d/.test(t))
  const rows = read('_common').split('\n').filter(l => l.includes('`<state branch>`'))
  assert.equal(rows.length, 1)
  assert.match(rows[0], /branches\.py name --kind state/)
})

test('verify contract: VS-4 each of the 13 files exists, holds <slice branch>, holds no literal', () => {
  assert.equal(new Set(THIRTEEN).size, 13)
  for (const f of THIRTEEN) {
    assert.ok(existsSync(join(ROOT, 'skills/sdlc/prompts', `${f}.md`)), f)
    const raw = read(f)
    const t = strip(raw)
    assert.ok(t.includes('<slice branch>'), `${f} lacks <slice branch>`)
    assert.ok(!t.includes('sdlc/<id>'), f)
    assert.ok(!t.includes('sdlc/S-'), f)
    assert.ok(!t.includes('sdlc/run-'), f)
    assert.doesNotMatch(t, GENERIC, f)
    assert.doesNotMatch(raw, /sdlc\/<id>|sdlc\/S-\d|sdlc\/run-/, `${f} raw`)
  }
})

test('verify contract: VS-5 state-schema stack bullet names milestone by kind', () => {
  const t = read('state-schema')
  const stack = t.split('\n').find(l => l.includes('`stack`: one branch per slice'))
  assert.ok(stack)
  assert.match(stack, /milestone/)
  assert.doesNotMatch(stack, /sdlc\//)
  for (const lit of ['sdlc/S-001', 'sdlc/run-<n>', 'sdlc/M-<n>']) assert.ok(!t.includes(lit))
  const remaining = [...t.matchAll(/(?<![.\w])sdlc\/[^\s`]*/g)].map(m => m[0]).filter(s => !/^sdlc\/(tracker|STOP)/.test(s))
  for (const s of remaining) assert.match(s, /^sdlc\/\{name\}/)
})
