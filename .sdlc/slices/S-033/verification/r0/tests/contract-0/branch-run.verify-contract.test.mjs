import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const SKILL = join(WT, 'skills/sdlc')
const kit = await import(join(SKILL, 'test/testkit/property.mjs'))
const { callPython, rng, defaultSeed, arb } = kit
const STATE_WRITE = join(SKILL, 'state-write.py')

const CUSTOM = 'feature/PROJ-1-{name}'
const DEFAULT = 'sdlc/{name}'
const git = (cwd, input, ...a) => {
  const r = spawnSync('git', a, { cwd, input, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: cwd, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@e', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@e' } })
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  return r.stdout
}

function repoWithConfigs(entries) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-verify-contract-'))
  git(repo, null, 'init', '-q', '-b', 'main')
  let stream = ''
  entries.forEach((e, i) => {
    const data = e.raw !== undefined ? e.raw : JSON.stringify(e.config)
    const buf = Buffer.from(data, 'utf8')
    stream += `commit refs/heads/b${i}\ncommitter t <t@e> 1700000000 +0000\ndata 1\nx\nM 100644 inline .sdlc/config.json\ndata ${buf.length}\n${data}\n`
  })
  git(repo, stream, 'fast-import', '--quiet')
  return repo
}

const ref = (fmt, s) => {
  const [prefix, suffix] = fmt.split('{name}')
  if (typeof s !== 'string') return ''
  if (!s.startsWith(prefix) || !s.endsWith(suffix) || s.length < prefix.length + suffix.length) return ''
  const middle = s.slice(prefix.length, s.length - suffix.length)
  return /^run-[0-9]+$/.test(middle) ? s : ''
}

test('verify contract: branch_run examples from the plan under custom and default format', () => {
  const values = ['feature/PROJ-1-run-1', 'sdlc/run-1', 'main', 'release/x', '', 5, null, ['x'], { a: 1 }, true]
  const configs = values.map((v) => ({ config: { runBranch: v } }))
  configs.push({ config: {} })
  configs.push({ raw: 'not json' })
  configs.push({ raw: '[]' })
  configs.push({ raw: 'null' })
  const repo = repoWithConfigs(configs)
  const expectCustom = ['feature/PROJ-1-run-1', '', '', '', '', '', '', '', '', '', '', '', '', '']
  const expectDefault = ['', 'sdlc/run-1', '', '', '', '', '', '', '', '', '', '', '', '']
  for (const [fmt, expected] of [[CUSTOM, expectCustom], [DEFAULT, expectDefault]]) {
    const out = callPython(STATE_WRITE, 'branch_run', configs.map((_, i) => [repo, `b${i}`, fmt]))
    out.forEach((r, i) => {
      assert.equal(r.outcome, 'return', `${fmt} b${i}: ${r.type} ${r.message}`)
      assert.equal(r.value, expected[i], `${fmt} runBranch=${JSON.stringify(configs[i])}`)
    })
  }
  const missing = callPython(STATE_WRITE, 'branch_run', [[repo, 'nobranch', CUSTOM]])
  assert.equal(missing[0].outcome, 'return')
  assert.equal(missing[0].value, '')
})

test('verify contract: branch_run property against a reference model, 1500 runs', () => {
  const seed = defaultSeed()
  const r = rng(seed)
  const runs = 1500
  const pieces = ['run-1', 'run-', 'run-12', 'run-007', 'run-1x', 'Run-1', 'run--1', 'run-', 'M-1', 'S-001', 'main', 'x/y', '', ' run-1', 'run-1 ']
  const stored = () => {
    const kind = r.int(0, 9)
    if (kind === 0) return r.pick([null, 0, 7, true, false, [], ['sdlc/run-1'], {}, 1.5])
    const prefix = r.pick(['feature/PROJ-1-', 'sdlc/', 'feature/', 'feature/PROJ-1-sdlc/', 'sdlc/feature/PROJ-1-', 'feature/PROJ-10-', '', 'x/'])
    const suffix = r.pick(['', '', '', '/', '-x', '.lock'])
    return prefix + r.pick(pieces) + suffix
  }
  const inputs = Array.from({ length: runs }, () => ({ fmt: r.pick([CUSTOM, DEFAULT]), value: stored() }))
  const repo = repoWithConfigs(inputs.map((i) => ({ config: { runBranch: i.value } })))
  const out = callPython(STATE_WRITE, 'branch_run', inputs.map((i, n) => [repo, `b${n}`, i.fmt]))
  const bad = []
  out.forEach((res, n) => {
    const want = ref(inputs[n].fmt, inputs[n].value)
    if (res.outcome !== 'return' || res.value !== want) bad.push({ n, input: inputs[n], res, want })
  })
  const label = `property branch_run: seed=${seed} runs=${runs} violations=${bad.length}`
  console.log(label)
  console.log(JSON.stringify(bad.slice(0, 5)))
  assert.equal(bad.length, 0, label)
})

test('verify contract: branch_run with malformed formats gives Fail or empty string, never a traceback', () => {
  const seed = defaultSeed()
  const r = rng(seed)
  const runs = 1000
  const repo = repoWithConfigs([{ config: { runBranch: 'feature/PROJ-1-run-1' } }, { config: { runBranch: 'sdlc/run-1' } }])
  const fmts = Array.from({ length: runs }, () => arb.format(r))
  const out = callPython(STATE_WRITE, 'branch_run', fmts.map((f, i) => [repo, `b${i % 2}`, f]))
  const bad = []
  out.forEach((res, i) => {
    const ok = res.outcome === 'Fail' || (res.outcome === 'return' && typeof res.value === 'string')
    if (!ok) bad.push({ i, fmt: fmts[i], res })
  })
  console.log(`property branch_run malformed fmt: seed=${seed} runs=${runs} violations=${bad.length}`)
  console.log(JSON.stringify(bad.slice(0, 5)))
  assert.equal(bad.length, 0)
})

test('verify contract: branch_run with hostile committed config text never raises a traceback', () => {
  const raws = ['', '{', '{"runBranch":', '﻿{"runBranch":"sdlc/run-1"}', '{"runBranch":"sdlc/run-1"}{"x":1}', '{"runBranch": NaN}', '[' .repeat(100000), '{"a":'.repeat(30000) + '1', '"str"', '1', 'true', '{"runBranch":"\\ud800"}', '{"runBranch":"sdlc/run-1","runBranch":5}']
  const repo = repoWithConfigs(raws.map((raw) => ({ raw })))
  const out = callPython(STATE_WRITE, 'branch_run', raws.map((_, i) => [repo, `b${i}`, DEFAULT]))
  const summary = out.map((o, i) => `${i}:${o.outcome}:${o.outcome === 'return' ? JSON.stringify(o.value) : o.type}`)
  console.log(summary.join(' '))
  const nonObject = new Set([8, 9, 10])
  out.forEach((o, i) => {
    if (nonObject.has(i)) return
    assert.ok(o.outcome === 'return' || o.outcome === 'Fail', `raw #${i} raised ${o.type}: ${o.message}`)
  })
  console.log('non-object config probe: ' + [...nonObject].map((i) => `${i}:${out[i].outcome}:${out[i].type}`).join(' '))
})

test('verify contract: branch_run is deterministic and does not mutate the repo', () => {
  const repo = repoWithConfigs([{ config: { runBranch: 'feature/PROJ-1-run-1' } }])
  const before = git(repo, null, 'for-each-ref')
  const a = callPython(STATE_WRITE, 'branch_run', [[repo, 'b0', CUSTOM], [repo, 'b0', CUSTOM], [repo, 'b0', CUSTOM]])
  assert.deepEqual(a.map((x) => x.value), ['feature/PROJ-1-run-1', 'feature/PROJ-1-run-1', 'feature/PROJ-1-run-1'])
  assert.equal(git(repo, null, 'for-each-ref'), before)
  assert.equal(git(repo, null, 'status', '--porcelain', '--branch').includes('??'), false)
})

test('verify contract: unicode lookalike and trailing-newline stored names (probe)', () => {
  const values = ['feature/PROJ-1-run-١', 'feature/PROJ-1-run-1\n', 'feature/PROJ-1‐run-1', 'feature/PROJ-1-run-1​', 'feature/PROJ-1-ruн-1']
  const repo = repoWithConfigs(values.map((v) => ({ config: { runBranch: v } })))
  const out = callPython(STATE_WRITE, 'branch_run', values.map((_, i) => [repo, `b${i}`, CUSTOM]))
  const rows = out.map((o, i) => `${JSON.stringify(values[i])} -> ${o.outcome === 'return' ? JSON.stringify(o.value) : o.type}`)
  console.log(rows.join('\n'))
  out.forEach((o) => assert.equal(o.outcome, 'return'))
})

test('verify contract: janitor.py takes its format from branches.load_format and holds no sdlc/ literal outside prose', () => {
  const text = readFileSync(join(SKILL, 'janitor.py'), 'utf8')
  assert.ok(text.includes('branches.load_format(repo)'))
  assert.doesNotMatch(text, /V_BRANCH/)
  const noDoc = text.replace(/^"""[\s\S]*?"""/m, '')
  const hits = noDoc.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /(^|[^.\w])sdlc\//.test(l) && !l.trim().startsWith('#'))
  console.log(JSON.stringify(hits))
  assert.deepEqual(hits, [])
})

test('verify contract: janitor.py load_format property: malformed config shapes give Fail or a string', () => {
  const report = kit.checkLoadFormat({ module: join(SKILL, 'branches.py'), runs: 500 })
  kit.assertProperty(report)
})
