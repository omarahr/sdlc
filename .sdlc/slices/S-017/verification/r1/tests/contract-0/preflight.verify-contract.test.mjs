import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const KIT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit'
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { stubServer } = await import(`${KIT}/stub-server.mjs`)
const { glabStub } = await import(`${KIT}/glab-stub.mjs`)
const { check, rng, defaultSeed, assertProperty, BRANCHES, callPython } = await import(`${KIT}/property.mjs`)
const { SKILL_DIR } = await import(`${KIT}/cli-runner.mjs`)

const WORKTREE = process.env.VERIFY_WORKTREE
const skillDir = WORKTREE ? join(WORKTREE, 'skills/sdlc') : SKILL_DIR
const r = cliRunner({ skillDir })
const module = join(skillDir, 'branches.py')

const KEYS = ['args', 'command', 'derived', 'forge', 'format', 'given', 'notes', 'ok', 'rules', 'samples', 'suggestion']
const RULE_KEYS = ['kind', 'label', 'negate', 'pattern', 'source']
const SAMPLE_KEYS = ['kind', 'name', 'result', 'rule']
const RESULTS = ['pass', 'fail', 'unevaluated', 'unchecked']

const ghRule = (operator, pattern, name, negate = false) => ({ type: 'branch_name_pattern', ruleset_id: 1, parameters: { operator, pattern, name, negate } })

function repoFor(forge, mode = 'pr', extra = {}) {
  return r.gitRepo({ files: { '.sdlc/config.json': { forge, gitMode: mode, ...extra } } })
}

function pf(repo, args, stub) {
  const t = r.run('branches.py', ['preflight', '--repo', repo, ...args], { env: stub ? stub.env() : {} })
  return t
}

function surface(t) {
  const o = t.json
  assert.ok(o && typeof o === 'object' && !Array.isArray(o), t.text())
  if (o.ok === false && o.error !== undefined) {
    assert.deepEqual(Object.keys(o).sort(), ['error', 'ok'])
    return o
  }
  assert.deepEqual(Object.keys(o).sort(), KEYS)
  assert.equal(typeof o.ok, 'boolean')
  assert.equal(typeof o.derived, 'boolean')
  assert.equal(typeof o.given, 'boolean')
  assert.equal(typeof o.format, 'string')
  assert.equal(typeof o.suggestion, 'string')
  assert.ok(Array.isArray(o.notes) && o.notes.every((n) => typeof n === 'string'))
  assert.ok(Array.isArray(o.rules))
  for (const x of o.rules) assert.deepEqual(Object.keys(x).sort(), RULE_KEYS)
  assert.ok(Array.isArray(o.samples))
  for (const s of o.samples) {
    assert.deepEqual(Object.keys(s).sort(), SAMPLE_KEYS)
    assert.ok(RESULTS.includes(s.result))
  }
  assert.equal(t.status, o.ok ? 0 : 1)
  assert.equal(t.stderr, '')
  assert.ok(t.treeUnchanged, t.text())
  return o
}

test('verify contract: seven preflight scenarios at the command boundary', () => {
  const gh0 = stubServer({ name: 'gh', fallback: { stdout: [] } })
  const t1 = pf(repoFor('github'), ['--mode', 'pr'], gh0)
  const o1 = surface(t1)
  assert.equal(t1.status, 0)
  assert.equal(o1.ok, true)
  assert.equal(o1.format, 'sdlc/{name}')
  assert.equal(o1.derived, false)
  assert.equal(o1.given, false)
  assert.equal(o1.suggestion, '')
  assert.deepEqual(o1.rules, [])
  assert.deepEqual(o1.samples.map((s) => s.kind), ['slice', 'state', 'e2e'])
  assert.ok(o1.samples.every((s) => s.result === 'pass' && s.rule === null))
  assert.equal(gh0.count(), 3)
  assert.deepEqual(gh0.calls()[0].argv.slice(0, 2), ['api', 'repos/{owner}/{repo}/rules/branches/sdlc%2FS-001'])

  const gh2 = stubServer({ name: 'gh', fallback: { stdout: [ghRule('starts_with', 'feature/', 'feature branches')] } })
  const t2 = pf(repoFor('github'), ['--mode', 'pr'], gh2)
  const o2 = surface(t2)
  assert.equal(t2.status, 0)
  assert.equal(o2.ok, true)
  assert.equal(o2.derived, true)
  assert.equal(o2.format, 'feature/sdlc/{name}')
  assert.equal(o2.given, false)
  assert.equal(o2.suggestion, '')
  assert.deepEqual(o2.rules, [{ source: 'github', kind: 'starts_with', pattern: 'feature/', negate: false, label: 'feature branches' }])
  assert.ok(o2.samples.every((s) => s.name.startsWith('feature/sdlc/') && s.result === 'pass'))

  const gh3 = stubServer({ name: 'gh', fallback: { stdout: [ghRule('regex', '^zzz/', 'zzz only')] } })
  const t3 = pf(repoFor('github'), ['--mode', 'pr'], gh3)
  const o3 = surface(t3)
  assert.equal(t3.status, 1)
  assert.equal(o3.ok, false)
  assert.equal(o3.derived, false)
  assert.equal(o3.format, 'sdlc/{name}')
  assert.match(o3.suggestion, /^--branch-format /)
  assert.ok(o3.samples.every((s) => s.result === 'fail' && s.rule === 'zzz only'))

  const gh4 = stubServer({ name: 'gh', fallback: { stdout: [ghRule('regex', '^[a-z]+/.+', 'lower')] } })
  const t4 = pf(repoFor('github'), ['--mode', 'pr'], gh4)
  const o4 = surface(t4)
  assert.equal(t4.status, 0)
  assert.equal(o4.ok, true)
  assert.equal(o4.derived, false)
  assert.equal(o4.suggestion, '')
  assert.ok(o4.samples.every((s) => s.result === 'pass'))

  const gh5 = stubServer({ name: 'gh', fallback: { stderr: 'HTTP 500', exit: 1 } })
  const t5 = pf(repoFor('github'), ['--mode', 'pr'], gh5)
  const o5 = surface(t5)
  assert.equal(t5.status, 0)
  assert.equal(o5.ok, true)
  assert.ok(o5.notes.some((n) => n.includes('rules unknown')))
  assert.deepEqual(o5.rules, [])
  assert.ok(o5.samples.length > 0 && o5.samples.every((s) => s.result === 'unchecked'))
  assert.equal(gh5.count(), 1)

  const gl6 = glabStub({ fallback: { stdout: { branch_name_regex: '^feat/' } } })
  const t6 = pf(repoFor('gitlab', 'mr'), ['--mode', 'mr', '--branch', 'bad-name'], gl6)
  const o6 = surface(t6)
  assert.equal(t6.status, 1)
  assert.equal(o6.ok, false)
  assert.deepEqual(o6.samples.map((s) => s.kind), ['working'])
  assert.equal(o6.samples[0].name, 'bad-name')
  assert.equal(o6.samples[0].result, 'fail')
  assert.equal(o6.samples[0].rule, 'push rule')
  assert.match(o6.suggestion, /git branch -m bad-name/)
  assert.equal(o6.derived, false)

  const t7 = pf(repoFor('github'), ['--mode', 'pr', '--format', 'feature/x'], gh0)
  assert.equal(t7.status, 2)
  assert.equal(t7.stderr, '')
  assert.equal(t7.stdout.trim().split('\n').length, 1)
  assert.equal(t7.json.ok, false)
  assert.deepEqual(Object.keys(t7.json).sort(), ['error', 'ok'])
  assert.equal(typeof t7.json.error, 'string')
  assert.ok(t7.json.error.length > 0)
})

test('verify contract: glab ok path and mr without branch', () => {
  const gl = glabStub({ fallback: { stdout: { branch_name_regex: '^feat/' } } })
  const okMr = surface(pf(repoFor('gitlab', 'mr'), ['--mode', 'mr', '--branch', 'feat/x'], gl))
  assert.equal(okMr.ok, true)
  assert.equal(okMr.samples[0].result, 'pass')
  const noBranch = surface(pf(repoFor('gitlab', 'mr'), ['--mode', 'mr'], gl))
  assert.equal(noBranch.ok, true)
  assert.deepEqual(noBranch.samples, [])
  const pr = surface(pf(repoFor('gitlab', 'pr'), ['--mode', 'pr'], glabStub({ fallback: { stdout: { branch_name_regex: '^feat/' } } })))
  assert.equal(pr.ok, false)
  assert.equal(pr.derived, false)
})

test('verify contract: bad input exits 2 with one JSON error', () => {
  const repo = repoFor('github')
  for (const args of [['--mode', 'pr', '--format', 'a/{name}/{name}'], ['--mode', 'nope'], ['--mode', 'pr', '--format', ''], ['--mode', 'pr', '--format', 'x\u0000y'.replace('\u0000', ' ')], ['--bogus'], []]) {
    const t = pf(repo, args)
    assert.equal(t.status, 2, `${JSON.stringify(args)} ${t.text()}`)
    assert.equal(t.stdout.trim().split('\n').length, 1)
    assert.deepEqual(Object.keys(t.json).sort(), ['error', 'ok'])
    assert.equal(t.json.ok, false)
    assert.doesNotMatch(t.stdout, /usage:/i)
  }
})

test('verify contract: determinism and no mutation of the repo', () => {
  const repo = repoFor('github')
  const gh = stubServer({ name: 'gh', fallback: { stdout: [ghRule('starts_with', 'feature/', 'f')] } })
  const strip = (o) => ({ ...o, samples: o.samples.map((s) => ({ ...s, name: s.name.replace(/\d{14}/, 'TS') })) })
  const a = pf(repo, ['--mode', 'pr'], gh)
  const b = pf(repo, ['--mode', 'pr'], gh)
  assert.deepEqual(strip(a.json), strip(b.json))
  assert.ok(a.treeUnchanged && b.treeUnchanged)
})

const lit = ['feature/', 'team-', 'x', '/v1', 'sdlc', 'zzz/', '-x', 'a.b/']
const regexes = ['^[a-z]+/.+', '^zzz/', '^feat/', 'sdlc', '^sdlc/S-', '/S-001$', '^(sdlc|feature)/', 'M-1']
const samples = ['sdlc/S-001', 'feature/sdlc/S-001', 'sdlc/M-1-e2e', 'zzz/S-1', 'feat/x', 'bad-name', 'team-sdlc/S-001', 'sdlc/S-001-x']

function genRule(rn) {
  const kind = rn.pick(['starts_with', 'ends_with', 'contains', 'regex', 'regex'])
  const pattern = kind === 'regex' ? rn.pick(regexes) : rn.pick(lit)
  return { source: 'github', kind, pattern, negate: rn.bool(0.3), label: `L${rn.int(0, 99)}` }
}

function refEval(rule, s) {
  let v
  if (rule.kind === 'starts_with') v = s.startsWith(rule.pattern)
  else if (rule.kind === 'ends_with') v = s.endsWith(rule.pattern)
  else if (rule.kind === 'contains') v = s.includes(rule.pattern)
  else v = new RegExp(rule.pattern).test(s)
  return rule.negate ? !v : v
}

function refDerive(rules) {
  if (rules.length !== 1) return null
  const [x] = rules
  if (x.negate) return null
  if (x.kind === 'starts_with') return `${x.pattern}sdlc/{name}`
  if (x.kind === 'ends_with') return `sdlc/{name}${x.pattern}`
  if (x.kind === 'contains') return `sdlc/${x.pattern}/{name}`
  return null
}

test('verify contract: derive matches the spec table', () => {
  const report = check({
    module,
    fn: 'derive',
    runs: 1500,
    gen: (rn) => Array.from({ length: rn.pick([0, 1, 1, 1, 2, 3]) }, () => genRule(rn)),
    property: (rules, res) => {
      if (res.outcome !== 'return') return `outcome ${res.outcome} ${res.message}`
      const want = refDerive(rules)
      return res.value === want ? null : `want ${want} got ${res.value}`
    },
  })
  console.log(`property-run derive seed=${report.seed} runs=${report.runs}`)
  assertProperty(report)
})

test('verify contract: judge matches the rule semantics', () => {
  const report = check({
    module,
    fn: 'judge',
    runs: 1500,
    gen: (rn) => ({ rules: Array.from({ length: rn.pick([0, 1, 1, 2, 3]) }, () => genRule(rn)), sample: rn.pick(samples) }),
    toArgs: (i) => [i.rules, i.sample],
    property: (i, res) => {
      if (res.outcome !== 'return') return `outcome ${res.outcome} ${res.message}`
      const failing = i.rules.find((x) => !refEval(x, i.sample))
      const want = failing ? 'fail' : 'pass'
      if (res.value.result !== want) return `want ${want} got ${res.value.result}`
      if (failing && res.value.rule !== failing.label) return `want rule ${failing.label} got ${res.value.rule}`
      if (!failing && res.value.rule !== null) return 'rule set on pass'
      return null
    },
  })
  console.log(`property-run judge seed=${report.seed} runs=${report.runs}`)
  assertProperty(report)
})

test('verify contract: suggest carries --branch-format for a loop failure and never derives from a negated rule', () => {
  const report = check({
    module,
    fn: 'suggest',
    runs: 1200,
    gen: (rn) => {
      const rules = Array.from({ length: rn.pick([1, 1, 2, 3]) }, () => genRule(rn))
      const rows = Array.from({ length: 3 }, (_, i) => ({ kind: ['slice', 'state', 'e2e'][i], name: samples[i], result: 'fail', rule: rules[0].label }))
      return { rules, rows, derived: refDerive(rules) }
    },
    toArgs: (i) => [i.rules, i.rows, i.derived],
    property: (i, res) => {
      if (res.outcome !== 'return') return `outcome ${res.outcome} ${res.message}`
      if (typeof res.value !== 'string') return 'not a string'
      if (!res.value.startsWith('--branch-format')) return `no --branch-format: ${res.value}`
      if (i.derived && !res.value.includes(i.derived)) return 'derived format missing'
      if (i.rules.some((x) => x.negate) && i.rules.length === 1 && res.value.includes('sdlc/') && i.derived) return 'derived from negated'
      return null
    },
  })
  console.log(`property-run suggest seed=${report.seed} runs=${report.runs}`)
  assertProperty(report)
})

test('verify contract: CLI exit code equals ok across random rule sets', () => {
  const rn = rng(defaultSeed())
  console.log(`property-run cli seed=${rn.seed} runs=60`)
  for (let i = 0; i < 60; i++) {
    const rules = Array.from({ length: rn.pick([0, 1, 1, 2, 3]) }, () => genRule(rn))
    const body = rules.map((x) => ghRule(x.kind, x.pattern, x.label, x.negate))
    const gh = stubServer({ name: 'gh', fallback: { stdout: body } })
    const t = pf(repoFor('github'), ['--mode', 'pr'], gh)
    const o = surface(t)
    const names = o.samples.map((s) => s.name)
    const fails = o.samples.filter((s) => s.result === 'fail')
    assert.equal(o.ok, fails.length === 0, `${JSON.stringify(rules)} ${t.text()}`)
    if (o.derived) {
      assert.equal(o.ok, true)
      assert.equal(o.format, refDerive(rules))
      for (const s of o.samples) for (const x of rules) assert.equal(refEval(x, s.name), true)
    }
    if (rules.some((x) => x.negate) && rules.length === 1) assert.equal(o.derived, false, JSON.stringify(rules))
    if (!o.ok) assert.ok(o.suggestion.includes('--branch-format'), t.text())
    if (o.ok) assert.equal(o.suggestion, '')
    for (const s of fails) assert.ok(rules.some((x) => x.label === s.rule) || s.rule === 'git check-ref-format')
    assert.ok(names.length > 0)
  }
})

test('verify contract: consumer view runs from a scratch cwd without internal imports', () => {
  const repo = repoFor('github')
  const gh = stubServer({ name: 'gh', fallback: { stdout: [] } })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'direct'], { env: gh.env() })
  const o = surface(t)
  assert.equal(o.ok, true)
  assert.deepEqual(o.samples, [])
  assert.notEqual(t.cwd, skillDir)
})

const badPatterns = [5, 0, null, true, false, ['a'], { a: 1 }, 1.5]
const kinds = ['starts_with', 'ends_with', 'contains', 'regex']
const ruleOf = (kind, p, i, negate = false) => ({ source: 'github', kind, pattern: p, negate, label: `bad${i}` })

test('verify contract: judge and derive never throw on a non-string pattern', () => {
  for (const kind of kinds) {
    for (const negate of [false, true]) {
      const rules = badPatterns.map((p, i) => ruleOf(kind, p, i, negate))
      const jr = callPython(module, 'judge', rules.map((x) => [[x], 'sdlc/S-001']))
      jr.forEach((res, i) => {
        assert.equal(res.outcome, 'return', `${kind} ${JSON.stringify(badPatterns[i])} ${res.message}`)
        assert.notEqual(res.value.result, 'fail', `${kind} neg=${negate} ${JSON.stringify(badPatterns[i])} -> ${JSON.stringify(res.value)}`)
      })
      const dr = callPython(module, 'derive', rules.map((x) => [[x]]))
      dr.forEach((res, i) => {
        assert.equal(res.outcome, 'return', `${kind} ${JSON.stringify(badPatterns[i])} ${res.message}`)
        assert.equal(res.value, null, `derive ${kind} neg=${negate} ${JSON.stringify(badPatterns[i])} -> ${JSON.stringify(res.value)}`)
      })
    }
  }
})

test('verify contract: CLI with a non-string pattern exits 0 or 1 with the surface and no derived format', () => {
  for (const kind of kinds) {
    for (const p of badPatterns) {
      for (const mix of [false, true]) {
        const body = [ghRule(kind, p, 'bad')]
        if (mix) body.push(ghRule('starts_with', 'feature/', 'good'))
        const gh = stubServer({ name: 'gh', fallback: { stdout: body } })
        const t = pf(repoFor('github'), ['--mode', 'pr'], gh)
        const o = surface(t)
        const tag = `${kind} ${JSON.stringify(p)} mix=${mix}`
        assert.ok([0, 1].includes(t.status), tag)
        assert.ok(!/Traceback/.test(t.stderr + t.stdout), tag)
        assert.ok(o.notes.some((n) => /cannot evaluate/.test(n)), `${tag} notes=${JSON.stringify(o.notes)}`)
        if (!mix) assert.equal(o.derived, false, tag)
        assert.ok(o.samples.every((s) => s.rule !== 'bad' || s.result !== 'fail'), tag)
      }
    }
  }
})

test('verify contract: glab push rule with a non-string regex does not crash', () => {
  for (const p of [5, null, ['x'], { a: 1 }, true]) {
    const gl = glabStub({ fallback: { stdout: { branch_name_regex: p } } })
    const t = pf(repoFor('gitlab', 'mr'), ['--mode', 'mr', '--branch', 'bad-name'], gl)
    assert.ok([0, 1].includes(t.status), `${JSON.stringify(p)} ${t.text()}`)
    assert.ok(!/Traceback/.test(t.stderr), t.stderr)
    surface(t)
  }
})
