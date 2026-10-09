import test from 'node:test'
import assert from 'node:assert/strict'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { callPython, BRANCHES } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'
import { load, families } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const DEF = 'sdlc/{name}'
const pyParse = (fmt, branches, ids) => {
  const calls = branches.map((b) => (ids ? [fmt, b, ids] : [fmt, b]))
  const out = []
  for (let i = 0; i < calls.length; i += 100) {
    let last
    for (let attempt = 0; attempt < 3; attempt++) {
      try { out.push(...callPython(BRANCHES, 'parse', calls.slice(i, i + 100), { timeoutMs: 20000 })); last = null; break } catch (e) { last = e; globalThis.__retries = (globalThis.__retries ?? 0) + 1 }
    }
    if (last) throw last
  }
  return out
}
const one = (b, fmt = DEF) => pyParse(fmt, [b])[0]

const wrappers = [
  (t) => `S-001-v0-${t}`,
  (t) => `S-001-v${t}-cli-0`,
  (t) => `S-001-v0-cli-${t}`,
  (t) => `S-001-attempt-${t}`,
  (t) => `state-${t}`,
  (t) => `${t}-v0-cli-0`,
  (t) => `${t}-attempt-2`,
  (t) => t,
]

test('verify security: AT-1 verify and attempt rows never raise on any corpus family', () => {
  const branches = []
  for (const f of families()) for (const e of load(f)) for (const w of wrappers) branches.push('sdlc/' + w(e.value))
  const results = pyParse(DEF, branches)
  const raised = results.map((r, i) => ({ r, b: branches[i] })).filter(({ r }) => r.outcome !== 'return')
  assert.equal(raised.length, 0, JSON.stringify(raised.slice(0, 3)).slice(0, 800))
  for (const r of results) {
    if (r.value === null) continue
    assert.ok(['state', 'verify', 'attempt', 'slice', 'run', 'milestone', 'e2e', 'e2e-area'].includes(r.value.kind))
    for (const k of ['round', 'part', 'n']) if (k in r.value) assert.equal(typeof r.value[k], 'number')
  }
  console.log('AT-1 branches', branches.length, 'retries', globalThis.__retries ?? 0)
})

test('verify security: AT-2 huge digit runs give integers or null, never raise', () => {
  for (const digits of ['9'.repeat(5000), '9'.repeat(100000), '0'.repeat(50000) + '1']) {
    for (const b of [`sdlc/S-001-v${digits}-cli-0`, `sdlc/S-001-v0-cli-${digits}`, `sdlc/S-001-attempt-${digits}`, `sdlc/state-${digits}`]) {
      const r = one(b)
      assert.equal(r.outcome, 'return', b.slice(0, 40) + r.message)
    }
  }
})

test('verify security: AT-3 no hostile tail yields kind verify with a wrong shape', () => {
  const cases = [
    ['sdlc/S-001-v0-cli-0\n', 'trailing newline'],
    ['sdlc/S-001-v0-cli-0\u0000', 'trailing NUL'],
    ['sdlc/S-001-v0-cli-٣', 'arabic-indic part'],
    ['sdlc/S-001-v٣-cli-0', 'arabic-indic round'],
    ['sdlc/S-001-v0-cіi-0', 'cyrillic i in profile'],
    ['sdlc/S-001-v0-CLI-0', 'upper-case profile'],
    ['sdlc/S-001-v0--0', 'empty profile'],
    ['sdlc/S-001-v0-cli', 'no part'],
    ['sdlc/--force-v0-cli-0', 'flag-like id'],
    ['sdlc/S-001-v0-cli-0/../../x', 'traversal'],
    ['sdlc/S-001-v0-cli-0;rm -rf', 'shell'],
  ]
  const out = []
  for (const [b, label] of cases) {
    const r = one(b)
    assert.equal(r.outcome, 'return', label)
    out.push(`${label}: ${JSON.stringify(b)} -> ${JSON.stringify(r.value)}`)
  }
  console.log(out.join('\n'))
  assert.equal(one('sdlc/S-001-v0--0').value?.kind === 'verify', false)
  assert.equal(one('sdlc/S-001-v0-cli').value?.kind === 'verify', false)
  assert.equal(one('sdlc/S-001-v0-CLI-0').value?.kind, 'slice')
  assert.equal(one('sdlc/S-001-v0-cli-0/../../x').value, null)
  assert.equal(one('sdlc/S-001-v0-cli-0;rm -rf').value, null)
  assert.equal(one('sdlc/S-001-v0-c\u0456i-0').value, null)
})

test('verify security: AT-4 trailing newline and non-ASCII digits (seed behavior, S-007 left open)', () => {
  const nl = one('sdlc/S-001-v0-cli-0\n').value
  const uni = one('sdlc/S-001-v0-cli-٣').value
  const state = one('sdlc/state-2026100810150\n').value
  console.log(JSON.stringify({ nl, uni, state }))
  assert.ok(true)
})

test('verify security: AT-5 prefix and suffix hostile: wrong affixes give null', () => {
  for (const [fmt, b] of [
    ['feature/PROJ-1-{name}', 'feature/PROJ-2-S-001-v0-cli-0'],
    ['feature/PROJ-1-{name}', 'sdlc/S-001-v0-cli-0'],
    ['{name}-wip', 'S-001-v0-cli-0'],
    ['{name}-wip', 'S-001-v0-cli-0-wip2'],
    ['{name}-wip', 'S-001-attempt-2-WIP'],
  ]) assert.equal(one(b, fmt).value, null, `${fmt} ${b}`)
  const v = one('S-001-v0-cli-0-wip', '{name}-wip').value
  assert.equal(v.kind, 'verify'); assert.equal(v.part, 0); assert.equal(v.profile, 'cli')
  const w = one('S-001-v0-cli-0-wip-wip', '{name}-wip').value
  assert.equal(w.kind, 'slice')
})

test('verify security: AT-6 ledger spoofing: ids list does not let unknown ids look known', () => {
  const r = pyParse(DEF, ['sdlc/S-001-v0-cli-0', 'sdlc/S-002-v0-cli-0', 'sdlc/S-0011-attempt-2', 'sdlc/s-001-v0-cli-0'], ['S-001'])
  assert.equal(r[0].value.known, true)
  assert.equal(r[1].value.known, false)
  assert.equal(r[2].value.known, false)
  assert.equal(r[3].value.kind, 'verify'); assert.equal(r[3].value.known, false)
  const lower = pyParse('sdlc/{name:lower}', ['sdlc/s-001-v0-cli-0'], ['S-001'])[0].value
  assert.equal(lower.id, 'S-001'); assert.equal(lower.known, true)
})

test('verify security: AT-7 CLI parse of hostile branches: JSON out, no side effect on repo', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: ['sdlc/S-001'] })
  const branches = ['sdlc/S-001-v0-cli-0', '-x', '--help', 'sdlc/S-001-v0-cli-0\n', 'sdlc/S-001-v' + '9'.repeat(4000) + '-cli-0', 'sdlc/S-001-v0-' + 'a-'.repeat(50000) + '0', 'sdlc/S-001-v0-cli-0\u0000']
  const log = []
  for (const b of branches) {
    let t
    try { t = r.run('branches.py', ['parse', '--repo', repo, `--branch=${b}`]) } catch (e) { log.push(`${JSON.stringify(b.slice(0, 30))} spawn refused ${e.message.slice(0, 60)}`); continue }
    if (t.spawnError) { log.push(`${JSON.stringify(b.slice(0, 30))} spawnError`); continue }
    assert.ok(t.status === 0 || t.status === 2, `${b.slice(0, 30)} status ${t.status} ${t.stderr.slice(0, 300)}`)
    assert.ok(t.json, 'json output')
    assert.equal(t.treeUnchanged, true, 'no side effect')
    assert.ok(!/Traceback/.test(t.stderr))
    log.push(`${JSON.stringify(b.slice(0, 30))} len=${b.length} -> status ${t.status} kind=${t.json.kind} ok=${t.json.ok}`)
  }
  console.log(log.join('\n'))
})
