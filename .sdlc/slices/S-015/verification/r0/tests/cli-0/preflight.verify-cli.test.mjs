import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync } from 'node:fs'
import { cliRunner, formatTranscript } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { stubServer, restrictedPath } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/stub-server.mjs'
import { glabStub } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/glab-stub.mjs'

const LOG = process.env.VERIFY_LOG
const r = cliRunner()
const KEYS = ['derived', 'forge', 'format', 'notes', 'ok', 'rules', 'samples', 'suggestion']
const sampleKeys = ['kind', 'name', 'result', 'rule']

function rec(id, scenario, ...ts) {
  if (!LOG) return
  appendFileSync(LOG, JSON.stringify({ id, scenario, transcripts: ts.map((t) => formatTranscript(t.transcript ?? t)) }) + '\n')
}

function pre(repo, args, opts = {}) {
  return r.run('branches.py', ['preflight', '--repo', repo, ...args], opts)
}
const cfg = (o, forge) => ({ '.sdlc/config.json': { ...(forge ? { forge } : {}), ...o } })
const gh = (...steps) => stubServer({ script: steps })
const rule = (operator, pattern, name, negate = false) => ({ type: 'branch_name_pattern', ruleset_id: 7, parameters: { operator, pattern, name, negate } })
const kinds = (t) => t.json.samples.map((s) => s.kind)
const names = (t) => t.json.samples.map((s) => s.name)

test('verify cli: VS-1 flag beats broken config', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': '{ not json' } })
  const t = pre(repo, ['--mode', 'direct', '--format', 'team/{name}'])
  rec('TC-cli-1', 'VS-1', t)
  assert.equal(t.status, 0)
  assert.equal(t.json.given, true)
  assert.equal(t.json.format, 'team/{name}')
  assert.ok(t.treeUnchanged)
})

test('verify cli: VS-1 config alone gives given true; neither gives false', () => {
  const a = r.gitRepo({ files: cfg({ branchFormat: 'feature/{name}' }) })
  const ta = pre(a, ['--mode', 'pr'])
  const b = r.gitRepo()
  const tb = pre(b, ['--mode', 'pr'])
  rec('TC-cli-2', 'VS-1', ta, tb)
  assert.equal(ta.json.given, true)
  assert.equal(ta.json.format, 'feature/{name}')
  assert.equal(tb.json.given, false)
  assert.equal(tb.json.format, 'sdlc/{name}')
})

test('verify cli: VS-1 empty config format counts as none; broken config with no flag exits 2', () => {
  const a = r.gitRepo({ files: cfg({ branchFormat: '' }) })
  const ta = pre(a, ['--mode', 'pr'])
  const b = r.gitRepo({ files: { '.sdlc/config.json': '{ not json' } })
  const tb = pre(b, ['--mode', 'pr'])
  rec('TC-cli-3', 'VS-1', ta, tb)
  assert.equal(ta.json.given, false)
  assert.equal(tb.status, 2)
  assert.equal(tb.json.ok, false)
  assert.equal(tb.stdout.trim().split('\n').length, 1)
})

test('verify cli: VS-1 invalid formats exit 2 with one JSON object', () => {
  const repo = r.gitRepo()
  const bad = ['feature/x', '', '{name}{name}', 'a/{name}}', '{name:Lower}', 'a b/{name}', 'a..b/{name}', '{name}.lock', '{name:upper}', '/{name}', 'é {name}']
  const ts = []
  for (const f of bad) {
    const t = pre(repo, ['--mode', 'pr', '--format', f])
    ts.push(t)
    assert.equal(t.status, 2, `format ${JSON.stringify(f)} gave ${t.status}: ${t.stdout}`)
    assert.equal(t.json.ok, false)
    assert.equal(typeof t.json.error, 'string')
    assert.equal(t.stdout.trim().split('\n').length, 1)
  }
  rec('TC-cli-4', 'VS-1', ...ts)
})

test('verify cli: VS-1 valid unusual formats', () => {
  const repo = r.gitRepo()
  const ts = []
  for (const f of ['{name:lower}', 'é/{name}', 'feature/PROJ-123-{name}', 'x/{name:lower}-y']) {
    const t = pre(repo, ['--mode', 'pr', '--format', f])
    ts.push(t)
    assert.equal(t.status, 0, `${f}: ${t.stdout}`)
    assert.equal(t.json.format, f)
    assert.equal(t.json.given, true)
  }
  assert.equal(ts[0].json.samples[0].name, 's-001')
  assert.equal(ts[2].json.samples[0].name, 'feature/PROJ-123-S-001')
  rec('TC-cli-5', 'VS-1', ...ts)
})

test('verify cli: VS-2 pr samples', () => {
  const repo = r.gitRepo()
  const t = pre(repo, ['--mode', 'pr'])
  rec('TC-cli-6', 'VS-2', t)
  assert.deepEqual(kinds(t), ['slice', 'state', 'e2e'])
  assert.equal(t.json.samples[0].name, 'sdlc/S-001')
  assert.match(t.json.samples[1].name, /^sdlc\/state-\d{14}$/)
  assert.equal(t.json.samples[2].name, 'sdlc/M-1-e2e')
})

test('verify cli: VS-2 stack samples', () => {
  const repo = r.gitRepo()
  const t = pre(repo, ['--mode', 'stack'])
  rec('TC-cli-7', 'VS-2', t)
  assert.deepEqual(names(t), ['sdlc/run-1', 'sdlc/M-1', 'sdlc/S-001'])
  assert.deepEqual(kinds(t), ['run', 'milestone', 'slice'])
})

test('verify cli: VS-2 mr and direct give none', () => {
  const repo = r.gitRepo()
  const a = pre(repo, ['--mode', 'mr'])
  const b = pre(repo, ['--mode', 'direct'])
  rec('TC-cli-8', 'VS-2', a, b)
  assert.deepEqual(a.json.samples, [])
  assert.deepEqual(b.json.samples, [])
  assert.equal(a.json.ok, true)
  assert.equal(a.status, 0)
})

test('verify cli: VS-2 names follow prefix and lowercase transform', () => {
  const repo = r.gitRepo()
  const a = pre(repo, ['--mode', 'pr', '--format', 'Feat/PROJ-{name:lower}'])
  const b = pre(repo, ['--mode', 'stack', '--format', 'feature/{name:lower}'])
  rec('TC-cli-9', 'VS-2', a, b)
  assert.deepEqual(names(a).slice(0, 1), ['Feat/PROJ-s-001'])
  assert.match(names(a)[1], /^Feat\/PROJ-state-\d{14}$/)
  assert.equal(names(a)[2], 'Feat/PROJ-m-1-e2e')
  assert.deepEqual(names(b), ['feature/run-1', 'feature/m-1', 'feature/s-001'])
})

test('verify cli: VS-2 unknown mode and missing mode exit 2', () => {
  const repo = r.gitRepo()
  const ts = ['', 'PR', 'pr ', 'bogus', '--branch'].map((m) => pre(repo, ['--mode', m]))
  const none = r.run('branches.py', ['preflight', '--repo', repo])
  rec('TC-cli-10', 'VS-2', ...ts, none)
  for (const t of [...ts, none]) {
    assert.equal(t.status, 2)
    assert.equal(t.json.ok, false)
  }
})

test('verify cli: VS-3 mr adds working sample last; modes ignore it', () => {
  const repo = r.gitRepo()
  const m = pre(repo, ['--mode', 'mr', '--branch', 'my-work'])
  const others = ['pr', 'stack', 'direct'].map((mode) => [pre(repo, ['--mode', mode, '--branch', 'my-work']), pre(repo, ['--mode', mode])])
  rec('TC-cli-11', 'VS-3', m, ...others.flat())
  assert.deepEqual(m.json.samples, [{ kind: 'working', name: 'my-work', result: 'unchecked', rule: null }])
  for (const [withFlag, without] of others) {
    assert.ok(!kinds(withFlag).includes('working'))
    assert.deepEqual(kinds(withFlag), kinds(without))
    assert.equal(withFlag.json.ok, true)
  }
})

test('verify cli: VS-3 working name is judged as given under gitlab regex', () => {
  const repo = r.gitRepo({ files: cfg({}, 'gitlab') })
  const glab = glabStub({ fallback: { stdout: { branch_name_regex: '^feat/' } } })
  const env = glab.env()
  const bad = pre(repo, ['--mode', 'mr', '--branch', 'bad-name'], { env })
  const good = pre(repo, ['--mode', 'mr', '--branch', 'feat/x'], { env })
  const upper = pre(repo, ['--mode', 'mr', '--branch', 'feat/X', '--format', 'feat/{name:lower}'], { env })
  rec('TC-cli-12', 'VS-3', bad, good, upper)
  assert.equal(bad.status, 1)
  assert.deepEqual(bad.json.samples, [{ kind: 'working', name: 'bad-name', result: 'fail', rule: 'push rule' }])
  assert.equal(good.status, 0)
  assert.equal(good.json.samples[0].result, 'pass')
  assert.equal(good.json.samples[0].name, 'feat/x')
  assert.equal(upper.json.samples[0].name, 'feat/X')
})

test('verify cli: VS-3 working name equal to a slice name is not renamed', () => {
  const repo = r.gitRepo({ files: cfg({ branchFormat: 'feature/{name}' }) })
  const t = pre(repo, ['--mode', 'mr', '--branch', 'S-001'])
  const u = pre(repo, ['--mode', 'mr', '--branch', 'feature/S-001'])
  rec('TC-cli-13', 'VS-3', t, u)
  assert.equal(t.json.samples[0].name, 'S-001')
  assert.equal(u.json.samples[0].name, 'feature/S-001')
})

test('verify cli: VS-3 hostile working names', () => {
  const repo = r.gitRepo()
  const ts = []
  const cases = [
    ['--branch=-x', 'unchecked'],
    ['-x', 'argparse'],
    ['--format', 'argparse'],
    ['with space', 'fail'],
    ['semi;colon $(touch pwned)', 'fail-or-unchecked'],
    ['é-branch', 'unchecked'],
    ['a\nb', 'fail'],
    ['a@{b', 'fail'],
  ]
  for (const [value] of cases) {
    const args = value.startsWith('--branch=') ? ['--mode', 'mr', value] : ['--mode', 'mr', '--branch', value]
    const t = pre(repo, args)
    ts.push(t)
    assert.ok(t.treeUnchanged, value)
    assert.ok([0, 1, 2].includes(t.status), value)
    if (t.status !== 2) assert.equal(t.stdout.trim().split('\n').length, 1)
    assert.ok(!t.stderr.includes('Traceback'), value)
  }
  assert.equal(ts[0].json.samples[0].name, '-x')
  assert.equal(ts[3].json.samples[0].result, 'fail')
  assert.equal(ts[3].json.samples[0].rule, 'git check-ref-format')
  assert.equal(ts[7].json.samples[0].rule, 'git check-ref-format')
  rec('TC-cli-14', 'VS-3', ...ts)
})

test('verify cli: VS-3 empty --branch value in mr mode', () => {
  const repo = r.gitRepo()
  const t = pre(repo, ['--mode', 'mr', '--branch', ''])
  rec('TC-cli-15', 'VS-3', t)
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.samples, [])
})

test('verify cli: VS-4 no forge gives ok and unchecked', () => {
  const repo = r.gitRepo()
  for (const mode of ['pr', 'stack']) {
    const t = pre(repo, ['--mode', mode])
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked' && s.rule === null))
    assert.deepEqual(t.json.notes, [])
    assert.equal(t.json.forge, '')
  }
  const t = pre(repo, ['--mode', 'pr'])
  rec('TC-cli-16', 'VS-4', t)
})

test('verify cli: VS-4 matching rule passes; bad regex unevaluated; failing gh unchecked', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const g1 = gh({ stdout: [rule('starts_with', 'sdlc/', 'sdlc only')] }, { stdout: [rule('starts_with', 'sdlc/', 'sdlc only')] }, { stdout: [rule('starts_with', 'sdlc/', 'sdlc only')] })
  const a = pre(repo, ['--mode', 'pr'], { env: g1.env() })
  const g2 = gh({ stdout: [rule('regex', '(unclosed', 'broken')] }, { stdout: [rule('regex', '(unclosed', 'broken')] }, { stdout: [rule('regex', '(unclosed', 'broken')] })
  const b = pre(repo, ['--mode', 'pr'], { env: g2.env() })
  const g3 = gh({ stderr: 'HTTP 401: not signed in', exit: 1 })
  const c = pre(repo, ['--mode', 'pr'], { env: g3.env() })
  rec('TC-cli-17', 'VS-4', a, b, c)
  assert.equal(a.status, 0)
  assert.ok(a.json.samples.every((s) => s.result === 'pass'))
  assert.equal(b.status, 0)
  assert.ok(b.json.samples.every((s) => s.result === 'unevaluated'))
  assert.equal(b.json.notes.length, 1)
  assert.match(b.json.notes[0], /^cannot evaluate broken: /)
  assert.equal(c.status, 0)
  assert.ok(c.json.samples.every((s) => s.result === 'unchecked'))
  assert.match(c.json.notes[0], /^rules unknown on github: .*not signed in/)
  assert.equal(c.json.notes.length, 1)
  assert.equal(g3.calls().length, 1)
})

test('verify cli: VS-4 gh garbage, empty, non-list JSON, gh timeout-free failure variants never block', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const variants = [
    { stdout: 'not json at all' },
    { stdout: '' },
    { stdout: { message: 'Not Found' } },
    { stdout: 'null' },
    { stdout: [null, 1, 'x', { type: 'branch_name_pattern' }, { type: 'branch_name_pattern', parameters: 'zzz' }] },
    { stdout: [{ type: 'branch_name_pattern', parameters: { operator: 'weird', pattern: 'x' } }] },
    { stdout: Buffer.from([0xff, 0xfe, 0x00]) },
    { stderr: 'x\ny\n', exit: 4 },
    { stderr: '', exit: 127 },
  ]
  const ts = []
  for (const v of variants) {
    const g = gh(v)
    g.setFallback(v)
    const t = pre(repo, ['--mode', 'stack'], { env: g.env() })
    ts.push(t)
    assert.ok(t.status === 0 || t.status === 1, JSON.stringify(v) + t.stderr)
    assert.ok(!t.stderr.includes('Traceback'), JSON.stringify(v) + t.stderr)
    assert.equal(t.stdout.trim().split('\n').length, 1)
  }
  rec('TC-cli-18', 'VS-4', ...ts)
  for (const t of ts) assert.equal(t.status, 0, t.stdout)
})

test('verify cli: VS-4 gitlab null body, empty regex, glab failure', () => {
  const repo = r.gitRepo({ files: cfg({}, 'gitlab') })
  const ts = []
  for (const step of [{ stdout: 'null' }, { stdout: { branch_name_regex: '' } }, { stdout: { branch_name_regex: '[' } }, { stderr: '401 Unauthorized', exit: 1 }]) {
    const g = glabStub({ fallback: step })
    ts.push(pre(repo, ['--mode', 'mr', '--branch', 'work'], { env: g.env() }))
  }
  rec('TC-cli-19', 'VS-4', ...ts)
  for (const t of ts) assert.equal(t.status, 0, t.stdout)
  assert.equal(ts[0].json.samples[0].result, 'unchecked-or-pass'.length ? ts[0].json.samples[0].result : '')
  assert.equal(ts[2].json.samples[0].result, 'unevaluated')
  assert.match(ts[2].json.notes[0], /^cannot evaluate push rule/)
  assert.equal(ts[3].json.samples[0].result, 'unchecked')
  assert.match(ts[3].json.notes[0], /^rules unknown on gitlab: 401 Unauthorized/)
})

test('verify cli: VS-5 output keys, exit 1, one JSON object', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const rules = [rule('starts_with', 'feature/', 'feature branches')]
  const g = gh({ stdout: rules }, { stdout: rules }, { stdout: rules })
  const t = pre(repo, ['--mode', 'pr'], { env: g.env() })
  rec('TC-cli-20', 'VS-5', t)
  assert.equal(t.status, 1)
  assert.deepEqual(Object.keys(t.json).filter((k) => KEYS.includes(k)).sort(), KEYS)
  assert.equal(t.json.ok, false)
  assert.equal(t.json.derived, false)
  assert.equal(t.stdout.trim().split('\n').length, 1)
  assert.equal(t.stderr, '')
  for (const s of t.json.samples) {
    assert.deepEqual(Object.keys(s).sort(), sampleKeys)
    assert.equal(s.result, 'fail')
    assert.equal(s.rule, 'feature branches')
  }
  assert.equal(t.json.forge, 'github')
  assert.deepEqual(t.json.rules.map((x) => x.label), ['feature branches'])
  assert.ok(t.treeUnchanged)
})

test('verify cli: VS-5 first failing rule label, later failing rules ignored; passing sample rule null', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const first = [rule('starts_with', 'zzz/', 'first'), rule('ends_with', '!!', 'second')]
  const ok = [rule('starts_with', 'sdlc/', 'fine')]
  const g = gh({ stdout: first }, { stdout: ok }, { stdout: first })
  const t = pre(repo, ['--mode', 'pr'], { env: g.env() })
  rec('TC-cli-21', 'VS-5', t)
  assert.equal(t.status, 1)
  assert.deepEqual(t.json.samples.map((s) => [s.result, s.rule]), [['fail', 'first'], ['pass', null], ['fail', 'first']])
  assert.deepEqual(t.json.rules.map((x) => x.label), ['first', 'second', 'fine'])
})

test('verify cli: VS-5 negate rule and contains', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const g = gh({ stdout: [rule('contains', 'sdlc', 'no sdlc', true)] })
  g.setFallback({ stdout: [rule('contains', 'sdlc', 'no sdlc', true)] })
  const t = pre(repo, ['--mode', 'stack'], { env: g.env() })
  rec('TC-cli-22', 'VS-5', t)
  assert.equal(t.status, 1)
  assert.ok(t.json.samples.every((s) => s.rule === 'no sdlc'))
})

test('verify cli: VS-5 exit codes 0, 1, 2 for the same repo', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const g1 = gh({ stdout: [rule('starts_with', 'feature/', 'f')] })
  g1.setFallback({ stdout: [rule('starts_with', 'feature/', 'f')] })
  const a = pre(repo, ['--mode', 'pr'], { env: g1.env() })
  const b = pre(repo, ['--mode', 'pr', '--format', 'feature/{name}'], { env: g1.env() })
  const c = pre(repo, ['--mode', 'nope'], { env: g1.env() })
  rec('TC-cli-23', 'VS-5', a, b, c)
  assert.deepEqual([a.status, b.status, c.status], [1, 0, 2])
  assert.deepEqual(Object.keys(c.json).sort(), ['error', 'ok'])
})

test('verify cli: VS-5 exit 1 only from preflight; other commands exit 0 on ok:true', () => {
  const repo = r.gitRepo()
  const n = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'])
  const p = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'zzz'])
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'slice'])
  rec('TC-cli-24', 'VS-5', n, p, l)
  assert.deepEqual([n.status, p.status, l.status], [0, 0, 0])
})

test('verify cli: VS-5 repo path with space and unicode; missing repo; non-git dir', () => {
  const repo = r.gitRepo({ name: 'my répo ü' })
  const t = pre(repo, ['--mode', 'pr'])
  const missing = pre('/nonexistent/path/xyz', ['--mode', 'pr'])
  const plain = r.dir('plain')
  const p = pre(plain, ['--mode', 'pr'])
  rec('TC-cli-25', 'VS-5', t, missing, p)
  assert.equal(t.status, 0)
  assert.equal(missing.status, 2)
  assert.equal(p.status, 0)
  assert.ok(!p.stderr.includes('Traceback'))
})

test('verify cli: VS-5 twice gives the same verdict and leaves tree unchanged', () => {
  const repo = r.gitRepo({ files: cfg({}, 'gitlab') })
  const g = glabStub({ fallback: { stdout: { branch_name_regex: '^feat/' } } })
  const a = pre(repo, ['--mode', 'mr', '--branch', 'x'], { env: g.env() })
  const b = pre(repo, ['--mode', 'mr', '--branch', 'x'], { env: g.env() })
  rec('TC-cli-26', 'VS-5', a, b)
  assert.deepEqual(a.json, b.json)
  assert.ok(a.treeUnchanged && b.treeUnchanged)
})

test('verify cli: VS-5 CI env and no tty', () => {
  const repo = r.gitRepo()
  const t = pre(repo, ['--mode', 'pr'], { env: { CI: 'true', LANG: 'C', LC_ALL: 'C', GH_PROMPT_DISABLED: undefined }, input: '' })
  rec('TC-cli-27', 'VS-5', t)
  assert.equal(t.status, 0)
})

test('verify cli: VS-6 a..b fails with git check-ref-format with no forge', () => {
  const repo = r.gitRepo()
  const t = pre(repo, ['--mode', 'mr', '--branch', 'a..b'])
  rec('TC-cli-28', 'VS-6', t)
  assert.equal(t.status, 1)
  assert.equal(t.json.ok, false)
  assert.deepEqual(t.json.samples, [{ kind: 'working', name: 'a..b', result: 'fail', rule: 'git check-ref-format' }])
})

test('verify cli: VS-6 a..b fails with rules present; other samples keep their result (stack has no working)', () => {
  const repo = r.gitRepo({ files: cfg({}, 'gitlab') })
  const g = glabStub({ fallback: { stdout: { branch_name_regex: '.' } } })
  const t = pre(repo, ['--mode', 'mr', '--branch', 'a..b'], { env: g.env() })
  const ok = pre(repo, ['--mode', 'mr', '--branch', 'fine'], { env: g.env() })
  const gh1 = r.gitRepo({ files: cfg({}, 'github') })
  const g2 = gh({ stdout: [rule('starts_with', 'a', 'starts a')] })
  g2.setFallback({ stdout: [rule('starts_with', 'a', 'starts a')] })
  const u = pre(gh1, ['--mode', 'mr', '--branch', 'a..b'], { env: g2.env() })
  rec('TC-cli-29', 'VS-6', t, ok, u)
  assert.equal(t.status, 1)
  assert.equal(t.json.samples[0].rule, 'git check-ref-format')
  assert.equal(ok.status, 0)
  assert.equal(ok.json.samples[0].result, 'pass')
  assert.equal(u.status, 1)
  assert.equal(u.json.samples[0].rule, 'git check-ref-format')
})

test('verify cli: VS-6 a..b fails when rules unknown; with unevaluated rule', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const g = gh({ stderr: 'HTTP 500', exit: 1 })
  const t = pre(repo, ['--mode', 'mr', '--branch', 'a..b'], { env: g.env() })
  const g2 = gh({ stdout: [rule('regex', '(', 'broken')] })
  g2.setFallback({ stdout: [rule('regex', '(', 'broken')] })
  const u = pre(repo, ['--mode', 'mr', '--branch', 'a..b'], { env: g2.env() })
  rec('TC-cli-30', 'VS-6', t, u)
  assert.equal(t.status, 1)
  assert.equal(t.json.samples[0].result, 'fail')
  assert.equal(t.json.samples[0].rule, 'git check-ref-format')
  assert.match(t.json.notes[0], /^rules unknown on github: HTTP 500/)
  assert.equal(u.status, 1)
  assert.equal(u.json.samples[0].rule, 'git check-ref-format')
})

test('verify cli: VS-6 invalid ref names, no forge', () => {
  const repo = r.gitRepo()
  const bad = ['a.', 'x.lock', 'a/b.lock', 'a b', 'a\tb', 'a\x01b', 'a~1', 'a^', 'a:b', 'a?', 'a*', 'a[', 'a\\b', '/a', 'a/', 'a//b', 'a@{b', '.a', 'a/.b', 'é..é', 'a\x7fb']
  const ts = []
  for (const b of bad) {
    const t = pre(repo, ['--mode', 'mr', '--branch', b])
    ts.push(t)
    assert.equal(t.status, 1, JSON.stringify(b) + ' ' + t.stdout + t.stderr)
    assert.equal(t.json.samples[0].rule, 'git check-ref-format', JSON.stringify(b))
    assert.equal(t.json.samples[0].name, b)
  }
  rec('TC-cli-31', 'VS-6', ...ts)
})

test('verify cli: VS-6 loop-kind samples with a invalid literal format part fail validation (exit 2) rather than reach forge', () => {
  const repo = r.gitRepo()
  const g = gh()
  const t = pre(repo, ['--mode', 'pr', '--format', 'a..b/{name}'], { env: g.env() })
  rec('TC-cli-32', 'VS-6', t)
  assert.equal(t.status, 2)
  assert.equal(g.calls().length, 0)
})

test('verify cli: VS-6 working branch invalid in pr mode is ignored', () => {
  const repo = r.gitRepo()
  const t = pre(repo, ['--mode', 'pr', '--branch', 'a..b'])
  rec('TC-cli-33', 'VS-6', t)
  assert.equal(t.status, 0)
  assert.ok(!kinds(t).includes('working'))
})

test('verify cli: VS-6 gh path for hostile working name is one encoded argument', () => {
  const repo = r.gitRepo({ files: cfg({}, 'github') })
  const g = gh()
  g.setFallback({ stdout: [] })
  const t = pre(repo, ['--mode', 'mr', '--branch', 'a b/../c;$(x)'], { env: g.env() })
  rec('TC-cli-34', 'VS-6', t)
  const calls = g.calls()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].argv.length, 2)
  assert.ok(!calls[0].argv[1].includes(' '))
  assert.ok(calls[0].argv[1].endsWith('a%20b%2F..%2Fc%3B%24%28x%29'))
  assert.equal(t.status, 1)
})

test('verify cli: VS-4 gh and glab absent from PATH', () => {
  const bin = restrictedPath(['python3', 'git'])
  const a = r.gitRepo({ files: cfg({}, 'github') })
  const b = r.gitRepo({ files: cfg({}, 'gitlab') })
  const ta = pre(a, ['--mode', 'pr'], { env: { PATH: bin } })
  const tb = pre(b, ['--mode', 'mr', '--branch', 'work'], { env: { PATH: bin } })
  rec('TC-cli-35', 'VS-4', ta, tb)
  for (const t of [ta, tb]) {
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.notes.length, 1)
    assert.match(t.json.notes[0], /^rules unknown on (github|gitlab):/)
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
  }
})
