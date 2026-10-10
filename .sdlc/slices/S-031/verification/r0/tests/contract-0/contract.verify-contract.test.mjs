import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const REPO = process.env.VERIFY_REPO
const KIT = join(REPO, 'skills/sdlc/test/testkit')
const { check, callPython, assertProperty, rng, defaultSeed } = await import(join(KIT, 'property.mjs'))
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const { glabStub } = await import(join(KIT, 'glab-stub.mjs'))
const { stubServer } = await import(join(KIT, 'stub-server.mjs'))

const WRAP = join(dirname(fileURLToPath(import.meta.url)), 'wrap.py')
const py = (fn, calls) => callPython(WRAP, fn, calls, { cwd: undefined })
const val = (r) => r.value

const ALPHA = 'abfs/-_.'.split('')
const word = (r, max) => Array.from({ length: r.int(0, max) }, () => r.pick(ALPHA)).join('')
const model = (pattern, sample) => {
  const start = pattern.startsWith('^')
  const end = pattern.endsWith('$') && pattern.length > (start ? 1 : 0)
  const lit = pattern.slice(start ? 1 : 0, end ? -1 : undefined)
  if (start && end) return sample === lit
  if (start) return sample.startsWith(lit)
  if (end) return sample.endsWith(lit)
  return sample.includes(lit)
}
const LITERAL = /^[abfs/_-]*$/
const genPattern = (r) => {
  const lit = Array.from({ length: r.int(0, 5) }, () => r.pick(['a', 'b', 'f', 's', '/', '-', '_'])).join('')
  return (r.bool() ? '^' : '') + lit + (r.bool() ? '$' : '')
}

test('verify contract: surface lists the exports a consumer sees', () => {
  const [res] = py('exports', [[]])
  const names = val(res)
  for (const n of ['evaluate', 'validate_format', 'name', 'read_rules', 'cmd_preflight', 'Fail']) assert.ok(names.includes(n), n)
  console.log('EXPORTS ' + names.join(' '))
})

test('verify contract: VS-1 spec examples verbatim', () => {
  const [a, b, c, d] = py('regex_eval', [['feature', 'x/feature/y'], ['^feature/', 'sdlc/S-001'], ['^feature/', 'feature/S-001'], ['feature', 'x/feature/y', true]])
  assert.equal(val(a), true)
  assert.equal(val(b), false)
  assert.equal(val(c), true)
  assert.equal(val(d), false)
})

test('verify contract: VS-1 corners', () => {
  const res = py('regex_eval', [['', 'anything'], ['', ''], ['(', 'x'], ['[', 'x'], ['a', 'ǟ'], ['^a$', 'a\n'], ['x$', 'x\n'], ['.', '\n'], ['\\Afeature', 'x/feature'], ['^feature', 'x\nfeature']])
  assert.equal(val(res[0]), true)
  assert.equal(val(res[1]), true)
  assert.equal(val(res[2]), null)
  assert.equal(val(res[3]), null)
  assert.equal(val(res[4]), false)
  assert.equal(val(res[5]), true)
  assert.equal(val(res[6]), true)
  assert.equal(val(res[7]), false)
  assert.equal(val(res[8]), false)
  assert.equal(val(res[9]), false)
  for (const x of res) assert.notEqual(x.outcome, 'exception')
})

test('verify contract: VS-1 property regex search matches reference model', () => {
  const report = check({
    module: WRAP,
    fn: 'regex_eval',
    gen: (r) => ({ pattern: genPattern(r), sample: word(r, 12), negate: r.bool(0.3) }),
    toArgs: (i) => [i.pattern, i.sample, i.negate],
    runs: 2000,
    property: (i, res) => {
      if (res.outcome !== 'return') return `outcome ${res.outcome} ${res.message}`
      const expected = i.negate ? !model(i.pattern, i.sample) : model(i.pattern, i.sample)
      return res.value === expected ? null : `expected ${expected} got ${res.value}`
    },
  })
  console.log(`PROPERTY-RUN VS-1 regex seed=${report.seed} runs=${report.runs} violations=${report.violations.length}`)
  assertProperty(report)
})

test('verify contract: VS-1 property determinism and purity', () => {
  const r = rng(defaultSeed())
  const inputs = Array.from({ length: 500 }, () => [genPattern(r), word(r, 10)])
  const a = py('regex_eval', inputs).map(val)
  const b = py('regex_eval', inputs).map(val)
  assert.deepEqual(a, b)
})

test('verify contract: VS-3 spec example verbatim', () => {
  const [n, v, m] = [py('name_slice', [['feature/PROJ-123-{name}', 'S-001']])[0], py('validate', [['feature/PROJ-123-{name}']])[0], py('name_milestone', [['feature/PROJ-123-{name}', 'M-1']])[0]]
  assert.equal(val(n), 'feature/PROJ-123-S-001')
  assert.equal(v.outcome, 'return')
  assert.equal(val(v), 'feature/PROJ-123-{name}')
  assert.equal(val(m), 'feature/PROJ-123-M-1')
  const more = py('name_slice', [['feature/PROJ-123-{name}', 'S-002'], ['feature/PROJ-123-{name}', 'S-012a'], ['feature/PROJ-123-{name}/', 'S-001'], ['feature/PROJ-123-{name:lower}', 'S-001']])
  assert.deepEqual(more.map(val), ['feature/PROJ-123-S-002', 'feature/PROJ-123-S-012a', 'feature/PROJ-123-S-001/', 'feature/PROJ-123-s-001'])
  const v2 = py('validate', [['feature/PROJ-123-{name}/'], ['feature/PROJ-123-{name}']])
  assert.equal(v2[0].outcome, 'Fail')
  assert.match(v2[0].message, /check-ref-format/)
  assert.equal(v2[1].outcome, 'return')
})

test('verify contract: VS-3 property literal prefix and suffix are kept byte for byte', () => {
  const seg = (r) => { const s = Array.from({ length: r.int(1, 6) }, () => r.pick('abcPROJ0123456789-'.split(''))).join(''); return s.replace(/^-+/, 'k') }
  const report = check({
    module: WRAP,
    fn: 'name_slice',
    gen: (r) => {
      const prefix = Array.from({ length: r.int(1, 3) }, () => seg(r)).join('/') + (r.bool() ? '/' : '-')
      const suffix = r.bool(0.7) ? '' : r.pick(['-x', '/y', '_z'])
      return { fmt: prefix + '{name}' + suffix, id: 'S-' + String(r.int(0, 999)).padStart(3, '0'), prefix, suffix }
    },
    toArgs: (i) => [i.fmt, i.id],
    runs: 1500,
    property: (i, res) => (res.outcome === 'return' && res.value === i.prefix + i.id + i.suffix ? null : `got ${JSON.stringify(res)}`),
  })
  console.log(`PROPERTY-RUN VS-3 name seed=${report.seed} runs=${report.runs} violations=${report.violations.length}`)
  assertProperty(report)
  const report2 = check({
    module: WRAP,
    fn: 'validate',
    gen: (r) => {
      const prefix = Array.from({ length: r.int(1, 3) }, () => seg(r)).join('/') + '-'
      return prefix + '{name}'
    },
    runs: 300,
    property: (i, res) => (res.outcome === 'return' ? null : `validate refused ${i}: ${res.message}`),
  })
  console.log(`PROPERTY-RUN VS-3 validate seed=${report2.seed} runs=${report2.runs} violations=${report2.violations.length}`)
  assertProperty(report2)
})

const toolRun = (args, env, repo) => {
  const r = cliRunner()
  return { r, t: (rp) => r.run('branches.py', args(rp), { env }) }
}

test('verify contract: VS-1 consumer view preflight with regex rule from GitHub', () => {
  const rule = [{ type: 'branch_name_pattern', ruleset_id: 7, parameters: { name: 'feat', operator: 'regex', pattern: '^feature/', negate: false } }]
  const gh = stubServer({ name: 'gh', fallback: { stdout: rule } })
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge: 'github' } } })
  const ok = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr', '--format', 'feature/{name}'], { env: gh.env() })
  assert.equal(ok.status, 0, ok.text())
  assert.equal(ok.json.ok, true)
  assert.ok(ok.json.samples.every((s) => s.result === 'pass'), JSON.stringify(ok.json.samples))
  const bad = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: gh.env() })
  assert.equal(bad.status, 1, bad.text())
  const slice = bad.json.samples.find((s) => s.kind === 'slice')
  assert.equal(slice.result, 'fail')
  console.log('GOOD ' + JSON.stringify(ok.json.samples))
  console.log('BAD ' + JSON.stringify({ derived: bad.json.derived, format: bad.json.format, samples: bad.json.samples }))
})

test('verify contract: VS-1 consumer view invalid regex is unevaluated not an exception', () => {
  const rule = [{ type: 'branch_name_pattern', ruleset_id: 7, parameters: { name: 'feat', operator: 'regex', pattern: '(', negate: false } }]
  const gh = stubServer({ name: 'gh', fallback: { stdout: rule } })
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge: 'github' } } })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: gh.env() })
  assert.ok(t.json, t.text())
  assert.ok(!/Traceback/.test(t.stderr), t.stderr)
  assert.ok(t.json.samples.every((s) => s.result === 'unevaluated' || s.result === 'pass'), JSON.stringify(t.json.samples))
  console.log(JSON.stringify({ status: t.status, ok: t.json.ok, samples: t.json.samples, notes: t.json.notes }))
})

for (const mode of ['pr', 'stack']) {
  for (const [label, step] of [
    ['branch_name_regex body', { stdout: { branch_name_regex: '^feat/.*$', commit_message_regex: '^fix' } }],
    ['empty body', { stdout: {} }],
    ['null body', { stdout: 'null' }],
    ['glab failure', { stderr: '404 Project Not Found', exit: 1 }],
  ]) {
    test(`verify contract: VS-2 ${mode} ${label} calls only the project push rule`, () => {
      const glab = glabStub({ fallback: step })
      const r = cliRunner()
      const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: mode, forge: 'gitlab' } } })
      const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode], { env: glab.env() })
      assert.ok(t.json, t.text())
      const calls = glab.calls()
      assert.equal(calls.length, 1, JSON.stringify(calls))
      assert.deepEqual(calls[0].argv, ['api', 'projects/:fullpath/push_rule'])
      assert.ok(!calls.some((c) => c.argv.join(' ').includes('group')))
      if (label === 'branch_name_regex body') {
        assert.equal(t.json.rules.length, 1)
        assert.equal(t.json.rules[0].source, 'gitlab')
        assert.equal(t.json.rules[0].label, 'push rule')
        assert.equal(t.json.rules[0].kind, 'regex')
      } else if (label === 'glab failure') {
        assert.equal(t.json.rules.length, 0)
        assert.ok(t.json.notes.some((n) => /^rules unknown on gitlab/.test(n)), JSON.stringify(t.json.notes))
      } else {
        assert.equal(t.json.rules.length, 0)
      }
      console.log(`CALLS ${mode} ${label}: ${JSON.stringify(calls.map((c) => c.argv))} rules=${JSON.stringify(t.json.rules)}`)
    })
  }
}

test('verify contract: VS-3 consumer view preflight and name', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const fmt = 'feature/PROJ-123-{name}'
  const n = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', fmt])
  assert.equal(n.status, 0, n.text())
  assert.equal(n.json.branch, 'feature/PROJ-123-S-001')
  const p = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr', '--format', fmt])
  assert.equal(p.status, 0, p.text())
  assert.equal(p.json.ok, true)
  assert.equal(p.json.format, fmt)
  assert.equal(p.json.given, true)
  assert.equal(p.json.samples.find((s) => s.kind === 'slice').name, 'feature/PROJ-123-S-001')
  console.log(JSON.stringify({ name: n.json, preflight: { ok: p.json.ok, format: p.json.format, given: p.json.given, samples: p.json.samples } }))
})
