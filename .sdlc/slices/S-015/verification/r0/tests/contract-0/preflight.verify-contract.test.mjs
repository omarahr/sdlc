import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WT = process.env.VERIFY_WT
const MAIN = process.env.VERIFY_MAIN
const LOGS = join(MAIN, '.sdlc/slices/S-015/verification/r0/logs')
const DRIVER = join(dirname(fileURLToPath(import.meta.url)), 'pydriver.py')
const { rng, defaultSeed, callPython, arb, materializeConfig, BRANCHES } = await import(join(WT, 'skills/sdlc/test/testkit/property.mjs'))
const { cliRunner } = await import(join(WT, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const { stubServer } = await import(join(WT, 'skills/sdlc/test/testkit/stub-server.mjs'))
const { scratch } = await import(join(WT, 'skills/sdlc/test/harness.mjs'))

mkdirSync(LOGS, { recursive: true })
const record = (entry) => appendFileSync(join(LOGS, 'contract-0-results.jsonl'), JSON.stringify(entry) + '\n')
const SEED = defaultSeed()

const refOk = new Map()
function refValid(ref) {
  if (/[\u0000]/.test(ref) || /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(ref)) return false
  if (refOk.has(ref)) return refOk.get(ref)
  let ok = true
  try { execFileSync('git', ['check-ref-format', '--branch', ref], { stdio: 'ignore' }) } catch { ok = false }
  refOk.set(ref, ok)
  return ok
}

const PYWS = new RegExp('[\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]')
function formatParts(fmt) {
  if (typeof fmt !== 'string') return null
  const count = fmt.split('{name}').length - 1 + fmt.split('{name:lower}').length - 1
  if (count !== 1) return null
  const lower = fmt.includes('{name:lower}')
  const [prefix, suffix] = fmt.split(lower ? '{name:lower}' : '{name}')
  return { prefix, suffix, lower }
}
function nameOf(fmt, tail) {
  const p = formatParts(fmt)
  return p.prefix + (p.lower ? tail.toLowerCase() : tail) + p.suffix
}
function formatValid(fmt) {
  const p = formatParts(fmt)
  if (!p) return false
  if (/[{}]/.test(p.prefix + p.suffix)) return false
  if (PYWS.test(fmt)) return false
  return refValid(nameOf(fmt, 'S-001'))
}
const TAILS = {
  pr: [['slice', 'S-001'], ['state', 'state-20260101000000'], ['e2e', 'M-1-e2e']],
  stack: [['run', 'run-1'], ['milestone', 'M-1'], ['slice', 'S-001']],
  mr: [],
  direct: [],
}
const MODES = Object.keys(TAILS)
function modelSamples(fmt, mode, current) {
  const rows = TAILS[mode].map(([kind, tail]) => ({ kind, tail, name: nameOf(fmt, tail) }))
  if (mode === 'mr' && current) rows.push({ kind: 'working', tail: null, name: current })
  return rows
}
const norm = (n) => n.replace(/state-\d{14}/, 'state-20260101000000')
const rowsNorm = (rows) => rows.map((r) => ({ kind: r.kind, name: norm(r.name) }))

function pre(argv, gh) {
  const [r] = callPython(DRIVER, 'preflight', [[BRANCHES, argv, gh ?? null]])
  assert.equal(r.outcome, 'return', JSON.stringify(r))
  return r.value
}
function preBatch(items) {
  const results = callPython(DRIVER, 'preflight', items.map((i) => [BRANCHES, i.argv, i.gh ?? null]))
  return results.map((r) => { assert.equal(r.outcome, 'return', JSON.stringify(r)); return r.value })
}
function parseOne(res, label) {
  const text = res.stdout
  assert.equal(text.trim().split('\n').length, 1, `${label}: stdout is not one line: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const REQUIRED_TOP = ['ok', 'format', 'derived', 'forge', 'rules', 'samples', 'notes', 'suggestion']
const ROW_KEYS = ['kind', 'name', 'result', 'rule']

function repoWith(config) {
  const root = scratch('verify-contract-repo-')
  return materializeConfig(root, config === undefined ? { kind: 'absent' } : { kind: 'json', value: config })
}

test('verify contract: VS-1 format resolves from flag, config or default (property vs reference model)', () => {
  const runs = 1000
  const r = rng(SEED)
  const configChoices = [undefined, () => 'feature/{name}', () => 'team/{name:lower}', () => '', () => null, () => 5, () => 'bad/format', () => arb.formatString(r), () => 'x/{name} ']
  const items = []
  const models = []
  for (let i = 0; i < runs; i++) {
    const cfgPick = r.pick(configChoices)
    const cfgVal = cfgPick === undefined ? undefined : cfgPick()
    const flagged = r.bool(0.5)
    const flag = flagged ? (r.bool(0.2) ? r.pick(['', '{name}', '{name:lower}', 'a..b/{name}', '{name}.lock', '/{name}', 'é/{name}', '\u{1f600}/{name}', 'x/{name}\ud800']) : arb.formatString(r)) : undefined
    const mode = r.pick(MODES)
    const repo = repoWith(cfgVal === undefined ? undefined : { branchFormat: cfgVal })
    const argv = ['preflight', '--repo', repo, '--mode', mode]
    if (flagged) argv.push('--format', flag)
    const configFmt = typeof cfgVal === 'string' && cfgVal ? cfgVal : null
    const fmt = flagged ? flag : (configFmt ?? 'sdlc/{name}')
    const given = flagged || configFmt !== null
    items.push({ argv })
    models.push({ fmt, given, mode, flagged, cfgVal })
  }
  const results = preBatch(items)
  const bad = []
  results.forEach((res, i) => {
    const m = models[i]
    const label = `#${i} ${JSON.stringify(m)}`
    const out = parseOne(res, label)
    const valid = formatValid(m.fmt)
    if (!valid) {
      if (res.status !== 2 || out.ok !== false || typeof out.error !== 'string' || !out.error) bad.push(`${label}: expected exit 2 with error, got ${res.status} ${res.stdout.slice(0, 200)}`)
      if (Object.keys(out).sort().join() !== 'error,ok') bad.push(`${label}: error object keys ${Object.keys(out)}`)
      return
    }
    const expectedSamples = modelSamples(m.fmt, m.mode, null)
    const expectedRows = expectedSamples.map((s) => ({ kind: s.kind, name: norm(s.name), fails: !refValid(s.name) }))
    const anyFail = expectedRows.some((x) => x.fails)
    if (out.format !== m.fmt) bad.push(`${label}: format ${out.format}`)
    if (out.given !== m.given) bad.push(`${label}: given ${out.given}`)
    if (res.status !== (anyFail ? 1 : 0)) bad.push(`${label}: exit ${res.status}, ok ${out.ok}`)
    if (out.ok !== !anyFail) bad.push(`${label}: ok ${out.ok}`)
  })
  record({ scenario: 'VS-1', property: 'format resolution against reference model (flag > config > default; invalid exits 2)', seed: SEED, runs, violations: bad.length })
  assert.equal(bad.length, 0, `seed=${SEED}\n${bad.slice(0, 8).join('\n')}`)
})

test('verify contract: VS-1 spec examples, verbatim', () => {
  const broken = scratch('verify-contract-broken-')
  const brokenRepo = materializeConfig(broken, { kind: 'text', text: '{not json' })
  const a = pre(['preflight', '--repo', brokenRepo, '--mode', 'pr', '--format', 'team/{name}'])
  const oa = parseOne(a, 'flag beats broken config')
  assert.equal(a.status, 0); assert.equal(oa.given, true); assert.equal(oa.format, 'team/{name}')

  const b = pre(['preflight', '--repo', repoWith({ branchFormat: 'feature/{name}' }), '--mode', 'direct'])
  const ob = parseOne(b, 'config only')
  assert.equal(b.status, 0); assert.equal(ob.given, true); assert.equal(ob.format, 'feature/{name}')

  const c = pre(['preflight', '--repo', repoWith(undefined), '--mode', 'direct'])
  const oc = parseOne(c, 'neither')
  assert.equal(c.status, 0); assert.equal(oc.given, false); assert.equal(oc.format, 'sdlc/{name}'); assert.equal(oc.ok, true)

  for (const bad of ['feature/x', '', '{name}{name}', 'a/{name}}', '{name:upper}', '{name!r}', 'a b/{name}', 'a..b/{name}', '{name}.lock', '/{name}', ' {name}', '　{name}']) {
    const d = pre(['preflight', '--repo', repoWith(undefined), '--mode', 'pr', '--format', bad])
    const od = parseOne(d, `bad ${JSON.stringify(bad)}`)
    assert.equal(d.status, 2, `${JSON.stringify(bad)} exit ${d.status} ${d.stdout}`)
    assert.equal(od.ok, false); assert.equal(typeof od.error, 'string')
  }
  for (const good of ['{name:lower}', 'é/{name}', '\u{1f600}/{name}', 'x/{name:lower}-y']) {
    const d = pre(['preflight', '--repo', repoWith(undefined), '--mode', 'pr', '--format', good])
    assert.equal(d.status, 0, `${JSON.stringify(good)} exit ${d.status} ${d.stdout}`)
  }
  record({ scenario: 'VS-1', property: 'spec examples and corner formats', result: 'pass' })
})

test('verify contract: VS-2 build_samples follows the mode (property vs reference model)', () => {
  const runs = 1000
  const r = rng(SEED + 1)
  const inputs = []
  for (let i = 0; i < runs; i++) {
    let fmt
    do { fmt = arb.formatString(r) } while (!formatParts(fmt))
    inputs.push({ fmt, mode: r.pick([...MODES, 'bogus']), current: r.pick([null, '', 'work/x', 'a..b', 'sdlc/S-001', '-x', 'ü']) })
  }
  const results = callPython(DRIVER, 'samples', inputs.map((x) => [BRANCHES, x.fmt, x.mode, x.current]))
  const bad = []
  results.forEach((res, i) => {
    const x = inputs[i]
    if (res.outcome !== 'return') { bad.push(`#${i} ${JSON.stringify(x)} ${res.outcome} ${res.message}`); return }
    const expected = x.mode in TAILS ? modelSamples(x.fmt, x.mode, x.current) : []
    const got = res.value.map((s) => ({ kind: s.kind, name: norm(s.name) }))
    const want = expected.map((s) => ({ kind: s.kind, name: norm(s.name) }))
    if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`#${i} ${JSON.stringify(x)} got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)
    res.value.filter((s) => s.kind === 'state').forEach((s) => { if (!/state-\d{14}/.test(s.name)) bad.push(`#${i} state name ${s.name}`) })
    res.value.forEach((s) => { if (Object.keys(s).sort().join() !== 'kind,name') bad.push(`#${i} sample keys ${Object.keys(s)}`) })
  })
  record({ scenario: 'VS-2', property: 'build_samples against reference model, any mode, any valid format', seed: SEED + 1, runs, violations: bad.length })
  assert.equal(bad.length, 0, `seed=${SEED + 1}\n${bad.slice(0, 8).join('\n')}`)
})

test('verify contract: VS-2 preflight samples per mode, verbatim from spec', () => {
  const repo = repoWith(undefined)
  const expectKinds = { pr: ['slice', 'state', 'e2e'], stack: ['run', 'milestone', 'slice'], mr: [], direct: [] }
  for (const [mode, kinds] of Object.entries(expectKinds)) {
    for (const fmt of ['sdlc/{name}', 'feature/{name:lower}', 'pre-{name}', '{name}']) {
      const res = pre(['preflight', '--repo', repo, '--mode', mode, '--format', fmt])
      const out = parseOne(res, `${mode} ${fmt}`)
      assert.deepEqual(out.samples.map((s) => s.kind), kinds, `${mode} ${fmt}`)
      const want = modelSamples(fmt, mode, null).map((s) => norm(s.name))
      assert.deepEqual(out.samples.map((s) => norm(s.name)), want, `${mode} ${fmt}`)
    }
  }
  const state = pre(['preflight', '--repo', repo, '--mode', 'pr']); const so = parseOne(state, 'state')
  const ts = so.samples.find((s) => s.kind === 'state').name.match(/^sdlc\/state-(\d{14})$/)
  assert.ok(ts, so.samples[1].name)
  const parsed = Date.UTC(+ts[1].slice(0, 4), +ts[1].slice(4, 6) - 1, +ts[1].slice(6, 8), +ts[1].slice(8, 10), +ts[1].slice(10, 12), +ts[1].slice(12, 14))
  assert.ok(Math.abs(Date.now() - parsed) < 86400000, `state timestamp ${ts[1]} is not current UTC`)
  const same = [pre(['preflight', '--repo', repo, '--mode', 'direct', '--branch', 'work/x']), pre(['preflight', '--repo', repo, '--mode', 'pr', '--branch', 'work/x'])]
  assert.deepEqual(parseOne(same[0], 'd').samples, [])
  assert.equal(parseOne(same[1], 'p').samples.some((s) => s.kind === 'working'), false)
  record({ scenario: 'VS-2', property: 'per-mode samples with prefix and lowercase formats; state has 14 digits', result: 'pass' })
})

const OPERATORS = ['starts_with', 'ends_with', 'contains', 'regex']
const PIECES = ['sdlc/', 'feature/', 'S-', 'state', 'M-1', 'e2e', 'x', '/', '-', '.', 'run', '001', 'team/']
const GOOD_REGEX = ['^sdlc/', '^feature/.+', 'e2e$', '[0-9]{3}', '^[a-z]+/', 'S-0+1', '^(sdlc|team)/', '^[^/]+/[^/]+$']
const BAD_REGEX = ['(unclosed', '[z-a]', '*bad', '(?<', 'a**', '[']

function evalRule(rule, sample) {
  let raw
  if (rule.kind === 'starts_with') raw = sample.startsWith(rule.pattern)
  else if (rule.kind === 'ends_with') raw = sample.endsWith(rule.pattern)
  else if (rule.kind === 'contains') raw = sample.includes(rule.pattern)
  else if (rule.kind === 'regex') { if (rule.bad) return null; raw = new RegExp(rule.pattern).test(sample) } else return null
  return rule.negate ? !raw : raw
}
function modelJudge(rules, sample) {
  let failed = null
  const unknown = []
  for (const rule of rules) {
    const v = evalRule(rule, sample)
    if (v === false) { if (failed === null) failed = rule.label } else if (v === null) unknown.push(rule.label)
  }
  if (failed === null && !refValid(sample)) failed = 'git check-ref-format'
  if (failed !== null) return { result: 'fail', rule: failed, unknown }
  return { result: unknown.length ? 'unevaluated' : 'pass', rule: null, unknown }
}
const toGh = (rule) => ({ type: 'branch_name_pattern', ruleset_id: 7, parameters: { name: rule.label, operator: rule.kind, pattern: rule.pattern, negate: rule.negate } })
const toPublic = (rule) => ({ source: 'github', kind: rule.kind, pattern: rule.pattern, negate: !!rule.negate, label: rule.label })

function genRulePool(r, counter) {
  const pool = []
  const n = r.int(0, 4)
  for (let i = 0; i < n; i++) {
    const kind = r.bool(0.08) ? 'weird_kind' : r.pick(OPERATORS)
    let pattern; let bad = false
    if (kind === 'regex') { bad = r.bool(0.3); pattern = bad ? r.pick(BAD_REGEX) : r.pick(GOOD_REGEX) } else pattern = r.pick(PIECES)
    pool.push({ kind, pattern, bad, negate: r.bool(0.3), label: `rule-${++counter.n}` })
  }
  return pool
}

test('verify contract: VS-5 and VS-8 and VS-9 verdict against a reference model with per-sample gh rules', () => {
  const runs = 1000
  const r = rng(SEED + 2)
  const counter = { n: 0 }
  const items = []
  const models = []
  const fmts = ['sdlc/{name}', 'feature/{name:lower}', 'team/x-{name}', '{name}']
  const currents = [null, 'feat/ok', 'a..b', 'x.lock', 'sdlc/S-001', 'team/Work', '@', 'a b', 'ok-branch', 'trailing.']
  const repo = (() => { const root = scratch('verify-contract-gh-'); return materializeConfig(root, { kind: 'json', value: { forge: 'github', gitMode: 'pr' } }) })()
  for (let i = 0; i < runs; i++) {
    const fmt = r.pick(fmts)
    const mode = r.pick(MODES)
    const current = r.pick(currents)
    const pool = genRulePool(r, counter)
    const samples = modelSamples(fmt, mode, current)
    const names = [...new Set(samples.map((s) => s.name))]
    const failAt = r.bool(0.12) && names.length ? r.int(0, names.length - 1) : -1
    const gh = {}
    const perName = {}
    names.forEach((nm, idx) => {
      if (idx === failAt) { gh[nm] = { error: `boom ${i}` }; return }
      const subset = pool.filter(() => r.bool(0.6))
      perName[nm] = subset
      gh[nm] = [...subset.map(toGh), ...(r.bool(0.3) ? [{ type: 'creation' }, { type: 'pull_request', parameters: {} }] : [])]
    })
    const argv = ['preflight', '--repo', repo, '--mode', mode, '--format', fmt]
    if (current !== null) argv.push('--branch', current)
    items.push({ argv, gh })
    models.push({ fmt, mode, current, samples, names, failAt, perName })
  }
  const results = preBatch(items)
  const bad = []
  let failing = 0
  let unevaluated = 0
  let notesSeen = 0
  results.forEach((res, i) => {
    const m = models[i]
    const label = `#${i} fmt=${m.fmt} mode=${m.mode} cur=${JSON.stringify(m.current)} failAt=${m.failAt}`
    let out
    try { out = parseOne(res, label) } catch (e) { bad.push(`${label}: ${e.message}`); return }
    for (const k of REQUIRED_TOP) if (!(k in out)) bad.push(`${label}: missing key ${k}`)
    const calls = res.calls.map((c) => norm(decodeURIComponent(c[2].split('/rules/branches/')[1])))
    const wantCalls = m.failAt >= 0 ? m.names.slice(0, m.failAt + 1) : m.names
    if (JSON.stringify(calls) !== JSON.stringify(wantCalls)) bad.push(`${label}: gh calls ${JSON.stringify(calls)} want ${JSON.stringify(wantCalls)}`)
    const expectRows = []
    const wantNotes = []
    if (m.failAt >= 0) {
      wantNotes.push(`rules unknown on github: boom ${i}`)
      for (const s of m.samples) expectRows.push(refValid(s.name) ? { result: 'unchecked', rule: null } : { result: 'fail', rule: 'git check-ref-format' })
    } else {
      for (const s of m.samples) {
        const j = modelJudge(m.perName[s.name], s.name)
        expectRows.push({ result: j.result, rule: j.rule })
        for (const u of j.unknown) if (!wantNotes.includes(`cannot evaluate ${u}`)) wantNotes.push(`cannot evaluate ${u}`)
      }
    }
    if (out.samples.length !== m.samples.length) { bad.push(`${label}: ${out.samples.length} rows, want ${m.samples.length}`); return }
    out.samples.forEach((row, k) => {
      if (Object.keys(row).sort().join() !== ROW_KEYS.join()) bad.push(`${label}: row keys ${Object.keys(row)}`)
      if (row.kind !== m.samples[k].kind || norm(row.name) !== norm(m.samples[k].name)) bad.push(`${label}: row ${k} identity ${row.kind} ${row.name}`)
      if (row.result !== expectRows[k].result || row.rule !== expectRows[k].rule) bad.push(`${label}: row ${k} ${m.samples[k].name} got ${row.result}/${row.rule} want ${expectRows[k].result}/${expectRows[k].rule}`)
      if (!['pass', 'fail', 'unevaluated', 'unchecked'].includes(row.result)) bad.push(`${label}: result ${row.result}`)
      if (row.result !== 'fail' && row.rule !== null) bad.push(`${label}: rule on a non-fail row`)
    })
    const anyFail = expectRows.some((x) => x.result === 'fail')
    failing += anyFail ? 1 : 0
    unevaluated += expectRows.some((x) => x.result === 'unevaluated') ? 1 : 0
    if (out.ok !== !anyFail) bad.push(`${label}: ok ${out.ok}`)
    if (res.status !== (anyFail ? 1 : 0)) bad.push(`${label}: exit ${res.status}`)
    const gotNotes = out.notes.map((n) => (n.startsWith('cannot evaluate') ? n.replace(/^(cannot evaluate rule-\d+): .*$/s, '$1') : n))
    notesSeen += out.notes.length
    if (JSON.stringify(gotNotes) !== JSON.stringify(wantNotes)) bad.push(`${label}: notes ${JSON.stringify(out.notes)} want ${JSON.stringify(wantNotes)}`)
    if (new Set(out.notes).size !== out.notes.length) bad.push(`${label}: duplicate notes`)
    const wantRules = []
    if (m.failAt < 0) for (const nm of m.names) for (const rule of m.perName[nm].map(toPublic)) if (!wantRules.some((x) => JSON.stringify(x) === JSON.stringify(rule))) wantRules.push(rule)
    if (JSON.stringify(out.rules) !== JSON.stringify(wantRules)) bad.push(`${label}: rules ${JSON.stringify(out.rules)} want ${JSON.stringify(wantRules)}`)
    if (out.forge !== 'github') bad.push(`${label}: forge ${out.forge}`)
    if (typeof out.format !== 'string' || out.format !== m.fmt) bad.push(`${label}: format ${out.format}`)
  })
  record({ scenario: 'VS-5/VS-8/VS-9', property: 'verdict rows, first failing rule label, exit code, notes merge, per-sample rules and rules union against reference model', seed: SEED + 2, runs, violations: bad.length, casesWithFail: failing, casesWithUnevaluated: unevaluated, notesSeen })
  assert.ok(failing > 100 && unevaluated > 50, `generator coverage: failing ${failing}, unevaluated ${unevaluated}`)
  assert.equal(bad.length, 0, `seed=${SEED + 2}\n${bad.slice(0, 8).join('\n')}`)
})

const GITHUB = { forge: 'github', gitMode: 'pr' }
const ghRule = (label, operator, pattern, negate = false) => ({ type: 'branch_name_pattern', ruleset_id: 3, parameters: { name: label, operator, pattern, negate } })
const DEFAULT_NAMES = (ts = null) => ['sdlc/S-001', ts, 'sdlc/M-1-e2e']

test('verify contract: VS-8 notes merge without duplicates in first-seen order (targeted)', () => {
  const repo = repoWith(GITHUB)
  const bad1 = ghRule('bad-one', 'regex', '(unclosed')
  const bad2 = ghRule('bad-two', 'regex', '[z-a]')
  const run = (gh, mode = 'pr', extra = []) => {
    const argvNames = []
    const res = pre(['preflight', '--repo', repo, '--mode', mode, ...extra], new Proxy({}, { get: () => undefined }) && null)
    return res
  }
  void run
  const probe = (mapper, mode = 'pr', extra = []) => {
    const first = pre(['preflight', '--repo', repo, '--mode', mode, ...extra], {})
    const names = parseOne(first, 'names').samples.map((s) => s.name)
    const gh = Object.fromEntries(names.map((n, i) => [norm(n), mapper(n, i)]))
    const res = pre(['preflight', '--repo', repo, '--mode', mode, ...extra], gh)
    return { res, out: parseOne(res, 'probe'), names }
  }
  const same = probe(() => [bad1])
  assert.equal(same.out.notes.length, 1, JSON.stringify(same.out.notes))
  assert.match(same.out.notes[0], /^cannot evaluate bad-one: /)
  assert.deepEqual(same.out.samples.map((s) => s.result), ['unevaluated', 'unevaluated', 'unevaluated'])
  assert.equal(same.out.ok, true); assert.equal(same.res.status, 0)
  assert.equal(same.out.rules.length, 1)

  const order = probe((n, i) => (i === 0 ? [bad2, bad1] : i === 1 ? [bad1] : [bad2]))
  assert.deepEqual(order.out.notes.map((n) => n.match(/^cannot evaluate (\S+):/)[1]), ['bad-two', 'bad-one'])

  const unk = probe(() => [ghRule('odd', 'weird_kind', 'x')])
  assert.equal(unk.out.notes.length, 1); assert.match(unk.out.notes[0], /^cannot evaluate odd: /)

  const err = probe((n, i) => (i === 1 ? { error: 'signed out' } : [bad1]))
  assert.equal(err.out.notes.length, 1)
  assert.equal(err.out.notes[0], 'rules unknown on github: signed out')
  assert.deepEqual(err.out.samples.map((s) => s.result), ['unchecked', 'unchecked', 'unchecked'])
  assert.equal(err.out.ok, true)
  record({ scenario: 'VS-8', property: 'targeted: one note for the same bad rule on three samples; first-seen order; read_rules note stands alone', result: 'pass', notes: { same: same.out.notes, order: order.out.notes, err: err.out.notes } })
})

test('verify contract: VS-9 each sample is judged against its own rules (targeted)', () => {
  const repo = repoWith(GITHUB)
  const names = parseOne(pre(['preflight', '--repo', repo, '--mode', 'pr'], {}), 'names').samples.map((s) => norm(s.name))
  const onlySlice = ghRule('only-slice', 'contains', 'zzz')
  const res = pre(['preflight', '--repo', repo, '--mode', 'pr'], { [names[0]]: [onlySlice], [names[1]]: [], [names[2]]: [] })
  const out = parseOne(res, 'only slice')
  assert.deepEqual(out.samples.map((s) => [s.kind, s.result, s.rule]), [['slice', 'fail', 'only-slice'], ['state', 'pass', null], ['e2e', 'pass', null]])
  assert.equal(out.ok, false); assert.equal(res.status, 1)
  assert.equal(out.rules.length, 1)

  const onlyE2e = ghRule('only-e2e', 'ends_with', 'nope')
  const res2 = pre(['preflight', '--repo', repo, '--mode', 'pr'], { [names[0]]: [], [names[1]]: [], [names[2]]: [onlyE2e] })
  assert.deepEqual(parseOne(res2, 'only e2e').samples.map((s) => s.result), ['pass', 'pass', 'fail'])

  const overlap = [ghRule('A', 'starts_with', 'sdlc/'), ghRule('B', 'contains', 'state'), ghRule('C', 'ends_with', 'e2e')]
  const res3 = pre(['preflight', '--repo', repo, '--mode', 'pr'], { [names[0]]: overlap, [names[1]]: overlap, [names[2]]: overlap })
  const o3 = parseOne(res3, 'overlap')
  assert.deepEqual(o3.samples.map((s) => [s.result, s.rule]), [['fail', 'B'], ['fail', 'C'], ['fail', 'B']])
  assert.deepEqual(o3.rules.map((x) => x.label), ['A', 'B', 'C'])

  const [probe] = callPython(DRIVER, 'duplicate_probe', [[BRANCHES, repo, { 'sdlc/S-001': [ghRule('dup', 'contains', 'zzz')] }]])
  assert.equal(probe.outcome, 'return', JSON.stringify(probe))
  const v = probe.value.result
  assert.equal(probe.value.calls.length, 1, 'duplicate name read once')
  assert.deepEqual(v.samples.map((s) => [s.kind, s.name, s.result, s.rule]), [['slice', 'sdlc/S-001', 'fail', 'dup'], ['working', 'sdlc/S-001', 'fail', 'dup']])
  assert.equal(v.rules.length, 1)
  record({ scenario: 'VS-9', property: 'targeted: rule scoped to one sample fails only it; overlapping rules give first failing label per sample; duplicate-name white-box probe keeps both rows and reads rules once', result: 'pass', mode: 'white-box for the duplicate probe (build_samples patched, since no real mode yields a duplicate name)' })
})

test('verify contract: consumer view, CLI process from a scratch cwd with a gh shim (VS-5 exit codes, one JSON object)', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': GITHUB } })
  const failing = stubServer({ name: 'gh', script: [{ stdout: [ghRule('must-start-feature', 'starts_with', 'feature/'), ghRule('second', 'contains', 'zzz')] }], fallback: { stdout: [] } })
  const t1 = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: failing.env() })
  assert.equal(t1.status, 1, t1.text()); assert.ok(t1.json, t1.stdout)
  assert.equal(t1.stdout.trim().split('\n').length, 1); assert.equal(t1.stderr, '')
  assert.equal(t1.json.ok, false)
  assert.deepEqual(t1.json.samples.map((s) => [s.kind, s.result, s.rule]), [['slice', 'fail', 'must-start-feature'], ['state', 'pass', null], ['e2e', 'pass', null]])
  for (const k of REQUIRED_TOP) assert.ok(k in t1.json, k)
  assert.ok(t1.treeUnchanged, 'preflight changed the repo')

  const passing = stubServer({ name: 'gh', fallback: { stdout: [ghRule('open', 'starts_with', '')] } })
  const t0 = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'stack'], { env: passing.env() })
  assert.equal(t0.status, 0, t0.text()); assert.equal(t0.json.ok, true)
  assert.deepEqual(t0.json.samples.map((s) => s.result), ['pass', 'pass', 'pass'])
  assert.equal(passing.calls().length, 3)

  const t2 = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'bogus'], { env: passing.env() })
  assert.equal(t2.status, 2); assert.equal(t2.json.ok, false); assert.equal(t2.stdout.trim().split('\n').length, 1)
  const t3 = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'mr', '--branch', 'a..b'], { env: passing.env() })
  assert.equal(t3.status, 1); assert.deepEqual(t3.json.samples.map((s) => [s.kind, s.name, s.result, s.rule]), [['working', 'a..b', 'fail', 'git check-ref-format']])
  record({ scenario: 'VS-5', property: 'consumer-view CLI run: exit 1/0/2 and one JSON line', result: 'pass', transcript: t1.text().split('\n').slice(0, 30).join('\n') })
})

test('verify contract: VS-5 key sets stay stable under hostile branch and format values', () => {
  const repo = repoWith(undefined)
  const hostile = ['--evil', '-x', '', ' ', 'a b', 'ü/ß', '\u{1f600}', 'x'.repeat(5000), 'a\tb', '‮', '@{-1}', '@', 'a//b', '/lead', 'trail/', 'x.lock', 'a\\b']
  const items = hostile.map((b) => ({ argv: ['preflight', '--repo', repo, '--mode', 'mr', `--branch=${b}`] }))
  const outs = preBatch(items)
  const seen = []
  outs.forEach((res, i) => {
    const out = parseOne(res, JSON.stringify(hostile[i]))
    seen.push([hostile[i].slice(0, 20), res.status, out.samples?.map((s) => s.result)])
    assert.ok([0, 1, 2].includes(res.status))
    if (res.status !== 2) {
      for (const k of REQUIRED_TOP) assert.ok(k in out, k)
      assert.equal(out.ok, res.status === 0)
      if (hostile[i] !== '') assert.deepEqual(out.samples.map((s) => s.name), [hostile[i]])
    }
  })
  record({ scenario: 'VS-5', property: 'hostile --branch values keep the output shape', result: 'pass', observed: seen })
})
