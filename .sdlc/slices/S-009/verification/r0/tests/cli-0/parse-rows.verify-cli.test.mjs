import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, writeFileSync } from 'node:fs'
import { cliRunner, formatTranscript } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-009-v0-cli-0/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-009-v0-cli-0/skills/sdlc/test/testkit/attack-corpus.mjs'

const LOG = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts.txt'
writeFileSync(LOG, '')
const r = cliRunner()
const repo = r.gitRepo()
const DEF = 'sdlc/{name}'
const PRE = 'feature/PROJ-1-{name}'
const SUF = '{name}-wip'
const LOW = 'feature/PROJ-1-{name:lower}'

function parse(fmt, branch, label) {
  const t = r.run('branches.py', ['parse', '--repo', repo, '--format', fmt, '--branch', branch])
  appendFileSync(LOG, `### ${label}\n${formatTranscript(t)}\n\n`)
  assert.equal(t.treeUnchanged, true, `${branch}: tree changed`)
  return t
}
function ok(fmt, branch, label) {
  const t = parse(fmt, branch, label)
  assert.equal(t.status, 0, `${branch}: exit ${t.status} ${t.stderr}`)
  assert.equal(t.stderr, '', `${branch}: stderr`)
  assert.ok(t.json, `${branch}: stdout not JSON`)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.branch, branch)
  return t.json
}
function expectRow(fmt, branch, want, label) {
  const j = ok(fmt, branch, label)
  for (const [k, v] of Object.entries(want)) assert.deepEqual(j[k], v, `${branch}: ${k}`)
  for (const k of ['n', 'round', 'part']) if (k in want) assert.ok(Number.isInteger(j[k]), `${branch}: ${k} integer`)
  return j
}
const isNull = (fmt, branch, label) => {
  const j = ok(fmt, branch, label)
  assert.equal(j.kind, null, `${branch}: expected null, got ${j.kind}`)
}
const notKind = (fmt, branch, kind, label) => {
  const j = ok(fmt, branch, label)
  assert.notEqual(j.kind, kind, `${branch}: must not be ${kind}`)
  return j
}

test('verify cli VS-1: state row', () => {
  const j = expectRow(DEF, 'sdlc/state-20261008101500', { kind: 'state', ts: '20261008101500', tail: 'state-20261008101500' }, 'VS-1 state ok')
  assert.equal(typeof j.ts, 'string')
  assert.ok(!('id' in j))
  for (const b of ['sdlc/state-2026100810150', 'sdlc/state-202610081015000', 'sdlc/state-', 'sdlc/state-2026100810150x', 'sdlc/state-20261008x01500', 'sdlc/state-x20261008101500', 'sdlc/state-20261008101500-x', 'sdlc/state-20261008101500/x', 'sdlc/state--20261008101500']) {
    isNull(DEF, b, `VS-1 null ${b}`)
  }
})

test('verify cli VS-1 seeds: trailing newline and non-ascii digits (report only)', () => {
  const out = {}
  for (const [id, b] of [['newline', 'sdlc/state-20261008101500\n'], ['fullwidth', 'sdlc/state-２０２６１００８１０１５００'], ['arabic', 'sdlc/state-٢٠٢٦١٠٠٨١٠١٥٠٠']]) {
    const t = parse(DEF, b, `VS-1 seed ${id}`)
    out[id] = { status: t.status, kind: t.json?.kind, ts: t.json?.ts }
  }
  appendFileSync(LOG, `SEED-SUMMARY ${JSON.stringify(out)}\n`)
})

test('verify cli VS-2: verify row', () => {
  expectRow(DEF, 'sdlc/S-001-v0-http-api-0', { kind: 'verify', id: 'S-001', round: 0, profile: 'http-api', part: 0 }, 'VS-2 a')
  expectRow(DEF, 'sdlc/S-001-v12-cli-3', { kind: 'verify', id: 'S-001', round: 12, profile: 'cli', part: 3 }, 'VS-2 b')
  expectRow(DEF, 'sdlc/S-001-v3-a-b-c-7', { kind: 'verify', id: 'S-001', round: 3, profile: 'a-b-c', part: 7 }, 'VS-2 a-b-c')
  expectRow(DEF, 'sdlc/S-005b-v1-security-10', { kind: 'verify', id: 'S-005b', round: 1, profile: 'security', part: 10 }, 'VS-2 part 10')
})

test('verify cli VS-2: verify boundaries', () => {
  for (const b of ['sdlc/S-001-v0-http-api', 'sdlc/S-001-v-cli-0', 'sdlc/S-001-v0--0', 'sdlc/S-001-v0-cli-', 'sdlc/S-001-v0-cli-x', 'sdlc/S-001-vx-cli-0', 'sdlc/S-001-v0-cli-0-', 'sdlc/S-001-v0-cli-0/x']) {
    notKind(DEF, b, 'verify', `VS-2 not verify ${b}`)
  }
  assert.equal(ok(DEF, 'sdlc/S-001-v0-cli-0-', 'VS-2 trailing hyphen falls to slice').kind, 'slice')
})

test('verify cli VS-2: hostile tails never crash parse', () => {
  const families = ['huge-integers', 'control-chars', 'flag-like-values', 'oversized', 'unicode-digits', 'unicode-whitespace', 'integer-forms', 'format-strings', 'injection', 'traversal', 'unicode-confusables']
  let n = 0
  for (const fam of families) {
    for (const e of load(fam, { argv: true })) {
      for (const tpl of [(v) => `sdlc/S-001-v${v}-cli-0`, (v) => `sdlc/S-001-v0-cli-${v}`, (v) => `sdlc/S-001-attempt-${v}`, (v) => `sdlc/state-${v}`, (v) => `sdlc/${v}-v0-cli-0`]) {
        const b = tpl(e.value)
        const t = parse(DEF, b, `VS-2 hostile ${fam}/${e.id}`)
        n++
        assert.equal(t.status, 0, `${fam}/${e.id} ${JSON.stringify(b).slice(0, 80)}: exit ${t.status}: ${t.stderr.slice(0, 200)}`)
        assert.ok(t.json && t.json.ok === true, `${fam}/${e.id}: no ok json`)
        assert.ok(!/Traceback/.test(t.stderr), `${fam}/${e.id}: traceback`)
      }
    }
  }
  appendFileSync(LOG, `HOSTILE-COUNT ${n}\n`)
})

test('verify cli VS-3: verify wins over slice and attempt', () => {
  expectRow(DEF, 'sdlc/S-001-v0-http-api-0', { kind: 'verify' }, 'VS-3 a')
  expectRow(DEF, 'sdlc/S-fix-M-1-2-v1-cli-0', { kind: 'verify', id: 'S-fix-M-1-2', round: 1, profile: 'cli', part: 0 }, 'VS-3 b')
  expectRow(PRE, 'feature/PROJ-1-S-001-v0-http-api-0', { kind: 'verify', id: 'S-001', part: 0 }, 'VS-3 prefix')
  expectRow(SUF, 'S-001-v0-http-api-0-wip', { kind: 'verify', id: 'S-001', profile: 'http-api', part: 0 }, 'VS-3 suffix')
  expectRow(DEF, 'sdlc/S-001-attempt-2-v0-cli-0', { kind: 'verify', id: 'S-001-attempt-2', round: 0, profile: 'cli', part: 0 }, 'VS-3 verify before attempt')
})

test('verify cli VS-4: attempt row', () => {
  expectRow(DEF, 'sdlc/S-001-attempt-2', { kind: 'attempt', id: 'S-001', n: 2 }, 'VS-4 a')
  expectRow(DEF, 'sdlc/S-005b-attempt-10', { kind: 'attempt', id: 'S-005b', n: 10 }, 'VS-4 b')
  expectRow(DEF, 'sdlc/S-fix-M-1-2-attempt-0', { kind: 'attempt', id: 'S-fix-M-1-2', n: 0 }, 'VS-4 c')
  for (const b of ['sdlc/S-001-attempt-', 'sdlc/S-001-attempt-x', 'sdlc/S-001-attempt-2-', 'sdlc/S-001-attempt-2x', 'sdlc/S-001-attempt', 'sdlc/S-001-attempt--2']) {
    notKind(DEF, b, 'attempt', `VS-4 not attempt ${b}`)
  }
  assert.equal(ok(DEF, 'sdlc/S-001-attempt-', 'y').kind, 'slice')
})

test('verify cli VS-5: slice row', () => {
  expectRow(DEF, 'sdlc/S-001', { kind: 'slice', id: 'S-001' }, 'VS-5 a')
  expectRow(DEF, 'sdlc/S-fix-M-1-2', { kind: 'slice', id: 'S-fix-M-1-2' }, 'VS-5 b')
  expectRow(DEF, 'sdlc/S-005b', { kind: 'slice', id: 'S-005b' }, 'VS-5 c')
  for (const b of ['sdlc/S-', 'sdlc/X-001', 'sdlc/S-001/x', 'sdlc/s-001', 'sdlc/S001', 'sdlc/S-001 ', 'sdlc/ S-001', 'sdlc/S-00_1']) {
    isNull(DEF, b, `VS-5 null ${b}`)
  }
  expectRow(LOW, 'feature/PROJ-1-s-001', { kind: 'slice' }, 'VS-5 lower')
})

test('verify cli VS-6: rows 5 to 8 under prefix and suffix formats', () => {
  const cases = [
    ['state-20261008101500', { kind: 'state', ts: '20261008101500' }],
    ['S-001-v0-http-api-0', { kind: 'verify', id: 'S-001', round: 0, profile: 'http-api', part: 0 }],
    ['S-001-attempt-2', { kind: 'attempt', id: 'S-001', n: 2 }],
    ['S-fix-M-1-2', { kind: 'slice', id: 'S-fix-M-1-2' }],
  ]
  for (const [fmt, pre, suf] of [[PRE, 'feature/PROJ-1-', ''], [SUF, '', '-wip']]) {
    for (const [tail, want] of cases) {
      const b = pre + tail + suf
      const j = expectRow(fmt, b, want, `VS-6 ${fmt} ${tail}`)
      assert.equal(j.tail, tail)
      for (const k of ['id', 'profile', 'ts']) if (typeof j[k] === 'string') assert.ok(!j[k].includes('wip') && !j[k].includes('PROJ'), `${b}: ${k} leaks`)
      if (pre) isNull(fmt, 'other/' + tail, `VS-6 wrong prefix ${fmt} ${tail}`)
      if (suf) isNull(fmt, tail + '-wipx', `VS-6 wrong suffix ${fmt} ${tail}`)
    }
  }
  isNull(SUF, 'S-001-v0-http-api-0', 'VS-6 suffix missing')
  isNull(PRE, 'S-001-attempt-2', 'VS-6 prefix missing')
})

test('verify cli VS-7: known flag at the CLI', () => {
  for (const b of ['sdlc/S-001', 'sdlc/S-001-attempt-2', 'sdlc/S-001-v0-cli-0', 'sdlc/state-20261008101500']) {
    const j = ok(DEF, b, `VS-7 ${b}`)
    assert.equal(j.known, null, `${b}: known without ids`)
  }
  const j = expectRow(LOW, 'feature/PROJ-1-s-001-attempt-3', { kind: 'attempt', id: 's-001', n: 3 }, 'VS-7 lower mixed')
  assert.equal(j.known, null)
  const help = r.run('branches.py', ['parse', '--help'])
  appendFileSync(LOG, `### VS-7 parse --help\n${formatTranscript(help)}\n\n`)
  assert.ok(!/--ids/.test(help.stdout), 'CLI exposes --ids')
})
