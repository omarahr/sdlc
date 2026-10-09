import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.env.VERIFY_REPO
const LOG = process.env.VERIFY_LOG
const { callPython } = await import(join(REPO, 'skills/sdlc/test/testkit/property.mjs'))
const MOD = join(REPO, 'skills/sdlc/branches.py')
const DEF = 'sdlc/{name}'
const LOWER = 'feature/PROJ-1-{name:lower}'

function parse(args) {
  const [r] = callPython(MOD, 'parse', [args])
  return r
}
function note(id, args, r) {
  if (LOG) appendFileSync(LOG, `${JSON.stringify({ id, args: JSON.stringify(args).slice(0, 120), outcome: r.outcome, value: r.value, type: r.type, message: r.message })}\n`)
}
function attack(id, args) {
  const r = parse(args)
  note(id, args, r)
  return r
}

test('verify security: VS-2 empty and degenerate tails give null', () => {
  for (const [id, fmt, branch] of [
    ['A-vs2-1', DEF, 'sdlc/'],
    ['A-vs2-2', 'sdlc/run-{name}', 'sdlc/run-'],
    ['A-vs2-3', 'sdlc/run-{name}', 'sdlc/run-x'],
    ['A-vs2-4', '{name}-wip', 'S-001'],
    ['A-vs2-5', '{name}-wip', '-wip'],
    ['A-vs2-6', '{name}-wip', 'wip'],
    ['A-vs2-7', 'ab{name}ba', 'aba'],
    ['A-vs2-8', 'ab{name}ba', 'ab'],
    ['A-vs2-9', DEF, 'sdlc'],
    ['A-vs2-10', '{name}', ''],
  ]) {
    const r = attack(id, [fmt, branch])
    assert.equal(r.outcome, 'return', id)
    assert.equal(r.value, null, `${id} ${JSON.stringify(r.value)}`)
  }
  const ok = attack('A-vs2-11', ['{name}-wip', 'S-001-wip'])
  assert.deepEqual(ok.value, { kind: 'slice', tail: 'S-001', id: 'S-001', known: null })
})

test('verify security: VS-7 non-string and odd branch types do not raise', () => {
  for (const [i, b] of [[1], [null], [[ 'sdlc/run-1' ]], [{ a: 1 }], [true], [1.5]].entries()) {
    const r = attack(`A-vs7-type-${i}`, [DEF, b[0]])
    assert.equal(r.outcome, 'return', `type ${i}: ${r.type} ${r.message}`)
    assert.equal(r.value, null)
  }
})

test('verify security: VS-7 NUL, control characters and traversal never match a row', () => {
  for (const [id, b] of [
    ['A-vs7-nul-1', 'sdlc/run-1\u0000'],
    ['A-vs7-nul-2', 'sdlc/\u0000run-1'],
    ['A-vs7-nul-3', 'sdlc/S-001\u0000-v0-x-0'],
    ['A-vs7-ctl-1', 'sdlc/run-1\r'],
    ['A-vs7-ctl-2', 'sdlc/run-1\u000b'],
    ['A-vs7-trav-1', 'sdlc/../run-1'],
    ['A-vs7-trav-2', 'sdlc/S-001/../../x'],
    ['A-vs7-sp-1', 'sdlc/run-1 '],
    ['A-vs7-sp-2', 'sdlc/ run-1'],
    ['A-vs7-sp-3', 'sdlc/S-001 '],
  ]) {
    const r = attack(id, [DEF, b])
    assert.equal(r.outcome, 'return', id)
    assert.equal(r.value, null, `${id} accepted ${JSON.stringify(r.value)}`)
  }
})

test('verify security: VS-7 trailing newline is rejected', () => {
  for (const [id, b, kind] of [
    ['A-vs7-nl-run', 'sdlc/run-2\n', 'run'],
    ['A-vs7-nl-slice', 'sdlc/S-001\n', 'slice'],
    ['A-vs7-nl-state', 'sdlc/state-20261008101500\n', 'state'],
    ['A-vs7-nl-verify', 'sdlc/S-001-v0-http-api-0\n', 'verify'],
    ['A-vs7-nl-ms', 'sdlc/M-1\n', 'milestone'],
  ]) {
    const r = attack(id, [DEF, b])
    assert.equal(r.outcome, 'return', id)
    assert.equal(r.value, null, `${id}: a branch ending in a newline classified as ${kind}: ${JSON.stringify(r.value)}`)
  }
})

test('verify security: VS-7 non-ASCII digits are rejected', () => {
  const arabic = '٣'
  const fullwidth = '２'
  for (const [id, b] of [
    ['A-vs7-dig-run-arabic', `sdlc/run-${arabic}`],
    ['A-vs7-dig-run-fullwidth', `sdlc/run-${fullwidth}`],
    ['A-vs7-dig-ms', `sdlc/M-${arabic}`],
    ['A-vs7-dig-state', `sdlc/state-${arabic.repeat(14)}`],
    ['A-vs7-dig-round', `sdlc/S-001-v${arabic}-http-api-0`],
    ['A-vs7-dig-part', `sdlc/S-001-v0-http-api-${fullwidth}`],
    ['A-vs7-dig-attempt', `sdlc/S-001-attempt-${arabic}`],
  ]) {
    const r = attack(id, [DEF, b])
    assert.equal(r.outcome, 'return', id)
    assert.equal(r.value, null, `${id} accepted ${JSON.stringify(r.value)}`)
  }
})

test('verify security: VS-7 huge digit runs do not raise', () => {
  for (const [id, b] of [
    ['A-vs7-huge-run', `sdlc/run-${'9'.repeat(5000)}`],
    ['A-vs7-huge-round', `sdlc/S-001-v${'9'.repeat(5000)}-x-0`],
    ['A-vs7-huge-part', `sdlc/S-001-v0-x-${'9'.repeat(5000)}`],
    ['A-vs7-huge-attempt', `sdlc/S-001-attempt-${'9'.repeat(5000)}`],
    ['A-vs7-huge-ms', `sdlc/M-${'9'.repeat(5000)}`],
  ]) {
    const r = attack(id, [DEF, b])
    assert.equal(r.outcome, 'return', `${id}: ${r.type} ${r.message}`)
  }
})

test('verify security: VS-7 long tails finish quickly', () => {
  for (const [id, b] of [
    ['A-vs7-long-dash', `sdlc/S-001-v0-${'a-'.repeat(50000)}x`],
    ['A-vs7-long-dash-end', `sdlc/S-001-v0-${'a-'.repeat(50000)}-`],
    ['A-vs7-long-v', `sdlc/${'v0-a-'.repeat(20000)}`],
    ['A-vs7-long-slice', `sdlc/S-${'a'.repeat(200000)}!`],
    ['A-vs7-long-e2e', `sdlc/M-1-e2e-${'a'.repeat(200000)}`],
    ['A-vs7-long-attempt', `sdlc/${'-attempt-1'.repeat(20000)}x`],
  ]) {
    const t0 = Date.now()
    const r = attack(id, [DEF, b])
    const ms = Date.now() - t0
    if (LOG) appendFileSync(LOG, `${JSON.stringify({ id: `${id}-time`, ms })}\n`)
    assert.equal(r.outcome, 'return', `${id}: ${r.type} ${r.message}`)
    assert.ok(ms < 5000, `${id} took ${ms} ms`)
  }
})

test('verify security: VS-7 unicode case folding under lower', () => {
  for (const [id, b] of [
    ['A-vs7-fold-kelvin-prefix', 'feature/PROJ-1-K'],
    ['A-vs7-fold-long-s', 'feature/proj-1-ſ-001'],
    ['A-vs7-fold-dotted-i', 'feature/PROJ-1-s-001İ'],
    ['A-vs7-fold-dotted-i-prefix', 'feature/PROJ-İ-s-001'],
    ['A-vs7-fold-sharp-s', 'feature/proj-1-ß'],
  ]) {
    const r = attack(id, [LOWER, b, ['S-001']])
    assert.equal(r.outcome, 'return', `${id}: ${r.type} ${r.message}`)
    if (r.value !== null) assert.notEqual(r.value.known, true, `${id} resolved a confusable to a ledger id: ${JSON.stringify(r.value)}`)
  }
  const kelvin = attack('A-vs7-fold-kelvin-m', ['{name:lower}', 'K-1', ['K-1']])
  assert.equal(kelvin.outcome, 'return')
})

test('verify security: VS-7 plain format stays case-exact', () => {
  for (const [id, b] of [
    ['A-vs7-case-1', 'SDLC/run-1'],
    ['A-vs7-case-2', 'sdlc/RUN-1'],
    ['A-vs7-case-3', 'sdlc/m-1'],
    ['A-vs7-case-4', 'sdlc/s-001'],
  ]) {
    const r = attack(id, [DEF, b])
    assert.equal(r.value, null, id)
  }
})

test('verify security: VS-7 ledger id list with non-strings', () => {
  for (const [id, ids] of [
    ['A-vs7-ids-int', [1, 'S-001']],
    ['A-vs7-ids-null', [null]],
    ['A-vs7-ids-nested', [['S-001']]],
    ['A-vs7-ids-int-after', ['S-001', 5]],
    ['A-vs7-ids-str', 'S-001'],
    ['A-vs7-ids-dict', { 'S-001': 1 }],
    ['A-vs7-ids-empty', []],
  ]) {
    const r = attack(id, [LOWER, 'feature/PROJ-1-s-001', ids])
    assert.equal(r.outcome, 'return', `${id}: ${r.type} ${r.message}`)
  }
})

test('verify security: VS-7 format with regex metacharacters stays literal', () => {
  for (const [id, fmt, b] of [
    ['A-vs7-fmt-dot', 'a.c/{name}', 'abc/run-1'],
    ['A-vs7-fmt-star', 'a*/{name}', 'aaa/run-1'],
    ['A-vs7-fmt-paren', '(x)/{name}', 'x/run-1'],
    ['A-vs7-fmt-suffix', '{name}.*', 'run-1abc'],
  ]) {
    const r = attack(id, [fmt, b])
    assert.equal(r.outcome, 'return', id)
    assert.equal(r.value, null, id)
  }
})

test('verify security: VS-2 and VS-7 refusal leaves no side effect', () => {
  const before = JSON.stringify(process.env.VERIFY_REPO)
  const r = attack('A-vs2-noside', [DEF, 'sdlc/'])
  assert.equal(r.stdout, '')
  assert.equal(r.stderr, '')
  assert.equal(before, JSON.stringify(process.env.VERIFY_REPO))
})
