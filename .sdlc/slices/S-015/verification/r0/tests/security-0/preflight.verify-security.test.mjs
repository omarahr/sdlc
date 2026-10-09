import test from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

const KIT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit'
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { stubServer, restrictedPath } = await import(`${KIT}/stub-server.mjs`)
const { glabStub } = await import(`${KIT}/glab-stub.mjs`)
const { load } = await import(`${KIT}/attack-corpus.mjs`)

const LOG = process.env.ATTACK_LOG
const r = cliRunner()
const note = (id, vs, input, observed) => {
  if (LOG) appendFileSync(LOG, JSON.stringify({ id, vs, input, observed }) + '\n')
}
const GH_CFG = { '.sdlc/config.json': { forge: 'github' } }
const GL_CFG = { '.sdlc/config.json': { forge: 'gitlab' } }
const ghRule = (operator, pattern, name, negate = false) => ({ type: 'branch_name_pattern', ruleset_id: 7, parameters: { operator, pattern, name, negate } })
const run = (repo, args, env) => r.run('branches.py', ['preflight', '--repo', repo, ...args], { env })
const KEYS = ['ok', 'format', 'derived', 'forge', 'rules', 'samples', 'notes', 'suggestion']

function oneObject(t) {
  assert.equal(t.stdout.trim().split('\n').length, 1, `stdout is one line: ${t.stdout}`)
  assert.ok(t.json, `stdout is JSON: ${t.stdout}\nstderr: ${t.stderr}`)
  assert.equal(t.stderr.includes('Traceback'), false, `no traceback: ${t.stderr}`)
}

test('verify security VS-3 A1: mr working branch equal to a slice name is kept as given and last', () => {
  const repo = r.gitRepo()
  const t = run(repo, ['--mode', 'mr', '--branch', 'sdlc/S-001'])
  oneObject(t)
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.samples.map((s) => [s.kind, s.name]), [['working', 'sdlc/S-001']])
  assert.equal(t.treeUnchanged, true)
  note('A-1', 'VS-3', 'mr --branch sdlc/S-001', t.stdout.trim())
})

test('verify security VS-3 A2: other modes ignore --branch, even a hostile one', () => {
  for (const mode of ['pr', 'stack', 'direct']) {
    const gh = stubServer({ script: [], fallback: { stdout: [] } })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', mode, '--branch=a..b;rm -rf /'], gh.env())
    oneObject(t)
    assert.equal(t.status, 0, mode)
    assert.equal(t.json.samples.some((s) => s.kind === 'working'), false, mode)
    assert.equal(t.json.samples.some((s) => s.name.includes('rm -rf')), false)
    for (const c of gh.calls()) assert.equal(c.argv.join(' ').includes('rm'), false)
    note(`A-2-${mode}`, 'VS-3', `${mode} --branch=a..b;rm -rf /`, t.stdout.trim().slice(0, 300))
  }
})

test('verify security VS-3 A3: option-like, spaced and empty working branches never become git or gh options', () => {
  const values = ['-x', '--help', '--version', '-', '--', '-C', '--upload-pack=x', 'a b', ' ', '\t', '']
  for (const v of values) {
    const gh = stubServer({ fallback: { stdout: [] } })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', 'mr', `--branch=${v}`], gh.env())
    oneObject(t)
    assert.ok([0, 1, 2].includes(t.status), JSON.stringify(v))
    for (const c of gh.calls()) {
      assert.equal(c.argv[0], 'api')
      assert.match(c.argv[1], /^repos\/\{owner\}\/\{repo\}\/rules\/branches\/[^/?#]*$/, JSON.stringify(c.argv))
    }
    const w = t.json.samples?.find((s) => s.kind === 'working')
    if (v === '') assert.equal(w, undefined)
    else if (t.json.samples) {
      assert.equal(w.name, v)
      if (v.startsWith('-') || /\s/.test(v)) assert.equal(w.result, 'fail', JSON.stringify(v))
    }
    assert.equal(t.treeUnchanged, true)
    note(`A-3`, 'VS-3', `mr --branch=${JSON.stringify(v)}`, `exit ${t.status} ${t.stdout.trim().slice(0, 200)}`)
  }
})

test('verify security VS-3 A3b: --branch with a separate option-like value is a clean exit 2', () => {
  const repo = r.gitRepo()
  for (const v of ['-x', '--help']) {
    const t = run(repo, ['--mode', 'mr', '--branch', v])
    oneObject(t)
    assert.equal(t.status, 2)
    assert.equal(t.json.ok, false)
    note('A-3b', 'VS-3', `mr --branch ${v}`, t.stdout.trim())
  }
})

test('verify security VS-3 A4: attack corpus as the working branch never crashes, never mutates, is kept verbatim', () => {
  const repo = r.gitRepo()
  let n = 0
  for (const fam of ['injection', 'traversal', 'control-chars', 'flag-like-values', 'unicode-confusables', 'unicode-whitespace', 'format-strings']) {
    for (const e of load(fam, { argv: true })) {
      const t = run(repo, ['--mode', 'mr', `--branch=${e.value}`])
      n++
      oneObject(t)
      assert.ok(t.status === 0 || t.status === 1, `${fam}/${e.id} status ${t.status}`)
      const w = t.json.samples.find((s) => s.kind === 'working')
      if (e.value === '') { assert.equal(w, undefined); continue }
      assert.equal(w.name, e.value, `${fam}/${e.id}`)
      assert.equal(t.status === 1, w.result === 'fail')
      assert.equal(t.treeUnchanged, true, `${fam}/${e.id} tree`)
    }
  }
  note('A-4', 'VS-3', 'corpus x mr --branch=', `${n} inputs, none crashed`)
})

test('verify security VS-4 A5: no forge gives ok true, unchecked, no outbound call', () => {
  const gh = stubServer({ fallback: { stdout: [] } })
  const repo = r.gitRepo()
  for (const mode of ['pr', 'stack', 'mr', 'direct']) {
    const t = run(repo, ['--mode', mode, '--branch', 'feature/x'], gh.env())
    oneObject(t)
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked' && s.rule === null))
    assert.deepEqual(Object.keys(t.json).filter((k) => KEYS.includes(k)).sort(), [...KEYS].sort())
  }
  assert.equal(gh.count(), 0)
  note('A-5', 'VS-4', 'forge none, all modes', 'ok true, unchecked, 0 gh calls')
})

test('verify security VS-4 A6: matching rule passes; uncompilable regex is unevaluated with a note; neither blocks', () => {
  const gh = stubServer({ fallback: { stdout: [ghRule('starts_with', 'sdlc/', 'only sdlc')] } })
  const repo = r.gitRepo({ files: GH_CFG })
  let t = run(repo, ['--mode', 'pr'], gh.env())
  assert.equal(t.status, 0)
  assert.ok(t.json.samples.every((s) => s.result === 'pass'))
  const bad = stubServer({ fallback: { stdout: [ghRule('regex', '(unclosed', 'bad regex'), ghRule('regex', '[', 'bad2')] } })
  t = run(repo, ['--mode', 'pr'], bad.env())
  oneObject(t)
  assert.equal(t.status, 0)
  assert.ok(t.json.samples.every((s) => s.result === 'unevaluated'))
  assert.ok(t.json.notes.some((n) => n.startsWith('cannot evaluate bad regex')))
  note('A-6', 'VS-4', 'regex ( and [ from forge', t.stdout.trim().slice(0, 400))
})

test('verify security VS-4 A7: failing gh gives unchecked and one rules-unknown note, exit 0', () => {
  for (const step of [{ exit: 1, stderr: 'HTTP 403' }, { stdout: 'not json' }, { stdout: '{"a":1}' }, { stdout: '' }, { stall: false, exit: 127, stderr: 'x' }]) {
    const gh = stubServer({ fallback: step })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', 'stack'], gh.env())
    oneObject(t)
    assert.equal(t.status, 0, JSON.stringify(step))
    assert.equal(t.json.notes.filter((n) => n.startsWith('rules unknown on github')).length, 1)
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
    assert.equal(gh.count(), 1)
    note('A-7', 'VS-4', JSON.stringify(step), t.stdout.trim().slice(0, 300))
  }
})

test('verify security VS-4 A8: malformed rule shapes from the forge never crash preflight', { todo: 'seed, outside the stated spec' }, () => {
  const shapes = [
    [{ type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: null, name: 'p' } }],
    [{ type: 'branch_name_pattern', parameters: { operator: 'contains', pattern: 5, name: 'p' } }],
    [{ type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: 5, name: 'p' } }],
    [{ type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: ['a'], name: 'p' } }],
    [{ type: 'branch_name_pattern', parameters: { operator: 'ends_with', pattern: {}, name: 'p' } }],
    [{ type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: null, name: 'p' } }],
    [{ type: 'branch_name_pattern', parameters: 'x' }],
    [{ type: 'branch_name_pattern', parameters: { operator: ['x'], pattern: 'a', name: ['n'] } }],
    [null, 3, 'x', []],
  ]
  const failures = []
  for (const body of shapes) {
    const gh = stubServer({ fallback: { stdout: body } })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', 'pr'], gh.env())
    const clean = t.json !== undefined && !t.stderr.includes('Traceback') && t.status === 0
    note('A-8', 'VS-4', JSON.stringify(body), `exit ${t.status} ${t.json ? 'json' : 'no json'} ${t.stderr.split('\n').slice(-2).join(' | ')}`)
    if (!clean) failures.push(`${JSON.stringify(body)} -> exit ${t.status}, ${t.stderr.trim().split('\n').pop()}`)
  }
  assert.deepEqual(failures, [])
})

test('verify security VS-4 A9: glab push rule malformed shapes never crash', () => {
  const failures = []
  for (const body of [{ branch_name_regex: 5 }, { branch_name_regex: null }, [], 'x', { branch_name_regex: '(' }, { branch_name_regex: '^sdlc/' }]) {
    const gl = glabStub({ fallback: { stdout: body } })
    const repo = r.gitRepo({ files: GL_CFG })
    const t = run(repo, ['--mode', 'pr'], gl.env())
    note('A-9', 'VS-4', JSON.stringify(body), `exit ${t.status} ${t.stdout.trim().slice(0, 200)}`)
    if (t.json === undefined || t.stderr.includes('Traceback')) failures.push(JSON.stringify(body))
    else assert.ok([0, 1].includes(t.status))
  }
  assert.deepEqual(failures, [])
})

test('verify security VS-5 A10: output keys, exit 1 with one JSON object, first failing rule label', () => {
  const rules = [ghRule('starts_with', 'zzz/', 'first rule'), ghRule('ends_with', '-never', 'second rule')]
  const gh = stubServer({ fallback: { stdout: rules } })
  const repo = r.gitRepo({ files: GH_CFG })
  const t = run(repo, ['--mode', 'stack'], gh.env())
  oneObject(t)
  assert.equal(t.status, 1)
  assert.equal(t.json.ok, false)
  for (const k of KEYS) assert.ok(k in t.json, k)
  for (const s of t.json.samples) {
    assert.deepEqual(Object.keys(s).sort(), ['kind', 'name', 'result', 'rule'])
    assert.equal(s.result, 'fail')
    assert.equal(s.rule, 'first rule')
  }
  assert.equal(t.treeUnchanged, true)
  note('A-10', 'VS-5', 'two failing rules', t.stdout.trim().slice(0, 400))
})

test('verify security VS-5 A11: hostile rule labels stay inside one JSON line', () => {
  for (const label of ['a\nb', '\u001b[31mred', '"}, "ok": true, "x": {"', 'x'.repeat(100000), '‮evil']) {
    const gh = stubServer({ fallback: { stdout: [ghRule('starts_with', 'zzz', label)] } })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', 'pr'], gh.env())
    oneObject(t)
    assert.equal(t.status, 1)
    assert.equal(t.json.ok, false)
    assert.equal(t.json.samples[0].rule, label)
    note('A-11', 'VS-5', JSON.stringify(label).slice(0, 60), 'exit 1 one JSON line, label verbatim')
  }
})

test('verify security VS-5 A12: ok never true when a sample fails (hostile negate and operator values)', () => {
  for (const [op, pat, neg] of [['starts_with', 'zzz', 'false'], ['starts_with', 'zzz', 0], ['starts_with', 'zzz', null], ['regex', '^zzz', undefined]]) {
    const gh = stubServer({ fallback: { stdout: [{ type: 'branch_name_pattern', parameters: { operator: op, pattern: pat, negate: neg, name: 'r' } }] } })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', 'pr'], gh.env())
    oneObject(t)
    const anyFail = t.json.samples.some((s) => s.result === 'fail')
    assert.equal(t.json.ok, !anyFail)
    assert.equal(t.status, anyFail ? 1 : 0)
    note('A-12', 'VS-5', `negate=${JSON.stringify(neg)}`, `ok=${t.json.ok} results=${t.json.samples.map((s) => s.result)}`)
  }
})

test('verify security VS-5 A13: bad input exits 2 with one error object and no side effect', () => {
  const repo = r.gitRepo()
  const cases = [['--mode', 'bogus'], ['--mode', ''], ['--mode', 'PR'], ['--mode', 'pr', '--format', '{name}{name}'], ['--mode', 'pr', '--format', 'a..{name}'], ['--mode', 'pr', '--format', 'x/{name}\n'], ['--mode', 'pr', '--format', ''], ['--mode', 'pr', '--format', '$(touch /tmp/pwn-s015){name}'], ['--mode', 'pr', '--format', '{name}`id`']]
  for (const a of cases) {
    const t = run(repo, a)
    oneObject(t)
    assert.ok(t.status === 2 || t.status === 0, JSON.stringify(a))
    if (t.status === 2) assert.deepEqual(Object.keys(t.json).sort(), ['error', 'ok'])
    assert.equal(t.treeUnchanged, true)
    note('A-13', 'VS-5', JSON.stringify(a), `exit ${t.status} ${t.stdout.trim().slice(0, 200)}`)
  }
})

test('verify security VS-5 A14: formats from the attack corpus never crash and never reach gh unquoted', () => {
  let n = 0
  for (const fam of ['injection', 'traversal', 'control-chars', 'flag-like-values', 'format-strings', 'unicode-confusables']) {
    for (const e of load(fam, { argv: true })) {
      const gh = stubServer({ fallback: { stdout: [] } })
      const repo = r.gitRepo({ files: GH_CFG })
      const t = run(repo, ['--mode', 'pr', `--format=${e.value}{name}`], gh.env())
      n++
      oneObject(t)
      assert.ok([0, 1, 2].includes(t.status), `${fam}/${e.id}`)
      for (const c of gh.calls()) assert.match(c.argv[1], /^repos\/\{owner\}\/\{repo\}\/rules\/branches\/[^/?#\s]*$/, `${fam}/${e.id} ${JSON.stringify(c.argv)}`)
      assert.equal(t.treeUnchanged, true)
    }
  }
  note('A-14', 'VS-5', 'corpus prefix x --format', `${n} formats ok`)
})

test('verify security VS-6 A15: invalid ref names fail with git check-ref-format with no forge, with rules, with rules unknown', () => {
  const bads = ['a..b', 'a.', 'a.lock', 'x/y.lock', 'a\u0001b', 'a\u007fb', 'a~b', 'a^b', 'a:b', 'a?b', 'a*b', 'a[b', 'a\\b', '/lead', 'a//b', 'a/', 'a@{b', '@{', 'a b', '.hidden', 'a/.b']
  for (const bad of bads) {
    for (const setup of ['none', 'rules', 'unknown']) {
      const repo = r.gitRepo({ files: setup === 'none' ? {} : GH_CFG })
      const gh = setup === 'rules' ? stubServer({ fallback: { stdout: [ghRule('starts_with', 'x', 'start')] } }) : setup === 'unknown' ? stubServer({ fallback: { exit: 1, stderr: 'boom' } }) : stubServer({})
      const t = run(repo, ['--mode', 'mr', `--branch=${bad}`], gh.env())
      oneObject(t)
      const w = t.json.samples.find((s) => s.kind === 'working')
      assert.equal(w.result, 'fail', `${JSON.stringify(bad)} ${setup}`)
      assert.ok(w.rule === 'git check-ref-format' || (setup === 'rules' && w.rule === 'start'), `${JSON.stringify(bad)} ${setup} rule ${w.rule}`)
      assert.equal(t.status, 1)
      assert.equal(t.json.ok, false)
      if (setup === 'unknown') assert.ok(t.json.samples.filter((s) => s.kind !== 'working').every((s) => s.result === 'unchecked'))
      if (setup === 'none') assert.equal(w.rule, 'git check-ref-format')
    }
  }
  note('A-15', 'VS-6', `${bads.length} invalid names x 3 setups`, 'all fail with the git rule or the forge label')
})

test('verify security VS-6 A16: the literal spec example a..b under each setup, exact output', () => {
  const repo = r.gitRepo()
  const t = run(repo, ['--mode', 'mr', '--branch', 'a..b'])
  assert.equal(t.status, 1)
  assert.deepEqual(t.json.samples, [{ kind: 'working', name: 'a..b', result: 'fail', rule: 'git check-ref-format' }])
  note('A-16', 'VS-6', 'mr --branch a..b no forge', t.stdout.trim())
})

test('verify security VS-6 A17: refs the git command expands (@{-1}, @{-2}) are refused when the cwd repo has history', { todo: 'seed, outside the stated spec' }, () => {
  const home = r.gitRepo({ branches: [] })
  r.git(home, 'checkout', '-q', '-b', 'previous-branch')
  r.git(home, 'checkout', '-q', 'main')
  const target = r.gitRepo()
  const results = {}
  for (const v of ['@{-1}', '@{-2}']) {
    const t = r.run('branches.py', ['preflight', '--repo', target, '--mode', 'mr', `--branch=${v}`], { cwd: home })
    oneObject(t)
    results[v] = t.json.samples.find((s) => s.kind === 'working').result
    note('A-17', 'VS-6', `mr --branch=${v} run from a repo with previous branches`, `result ${results[v]} exit ${t.status}`)
  }
  assert.deepEqual(results, { '@{-1}': 'fail', '@{-2}': 'fail' })
})

test('verify security VS-6 A18: the verdict does not depend on the cwd repo', { todo: 'seed, outside the stated spec' }, () => {
  const home = r.gitRepo()
  r.git(home, 'checkout', '-q', '-b', 'previous-branch')
  r.git(home, 'checkout', '-q', 'main')
  const target = r.gitRepo()
  const elsewhere = r.dir('plain')
  const a = r.run('branches.py', ['preflight', '--repo', target, '--mode', 'mr', '--branch=@{-1}'], { cwd: home })
  const b = r.run('branches.py', ['preflight', '--repo', target, '--mode', 'mr', '--branch=@{-1}'], { cwd: elsewhere })
  note('A-18', 'VS-6', '@{-1} from two cwds', `${a.json.samples[0].result} vs ${b.json.samples[0].result}`)
  assert.equal(a.json.samples[0].result, b.json.samples[0].result)
})

test('verify security VS-6 A19: valid names that look odd are not refused', () => {
  const repo = r.gitRepo()
  for (const v of ['@', 'feature/ok', 'a@b', 'ü/ñ', 'refs/heads/x', 'a.b', 'a-b_c']) {
    const t = run(repo, ['--mode', 'mr', `--branch=${v}`])
    const w = t.json.samples[0]
    note('A-19', 'VS-6', v, `${w.result}`)
    assert.equal(w.result, 'unchecked', v)
    assert.equal(t.status, 0)
  }
})

test('verify security VS-7 A20: no gh or glab on PATH does not crash or block', () => {
  for (const [cfg, tool] of [[GH_CFG, 'gh'], [GL_CFG, 'glab']]) {
    const bin = restrictedPath(['python3', 'git'])
    const repo = r.gitRepo({ files: cfg })
    for (const mode of ['pr', 'stack', 'mr', 'direct']) {
      const t = run(repo, ['--mode', mode, '--branch', 'feat/x'], { PATH: bin })
      oneObject(t)
      assert.equal(t.status, 0, `${tool} ${mode}`)
      assert.equal(t.json.ok, true)
      if (mode === 'direct' && tool === 'gh') { assert.deepEqual(t.json.samples, []); continue }
      assert.equal(t.json.notes.length, 1)
      assert.match(t.json.notes[0], new RegExp(`^rules unknown on ${tool === 'gh' ? 'github' : 'gitlab'}`))
      assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
      assert.equal(t.treeUnchanged, true)
    }
    note('A-20', 'VS-7', `${tool} missing, 4 modes`, 'ok true, 1 note, unchecked')
  }
})

test('verify security VS-7 A21: signed-out tool, garbage output, huge stderr and a stalled tool', () => {
  const steps = [
    { exit: 4, stderr: 'To get started with GitHub CLI, please run:  gh auth login' },
    { stdout: Buffer.from([0xff, 0xfe, 0x00, 0x41]) },
    { stdout: '[', exit: 0 },
    { stdout: '[' + '['.repeat(100000) },
    { exit: 1, stderr: 'E'.repeat(300000) },
    { stdout: '\u0000\u0000' },
  ]
  for (const step of steps) {
    const gh = stubServer({ fallback: step })
    const repo = r.gitRepo({ files: GH_CFG })
    const t = run(repo, ['--mode', 'pr'], gh.env())
    oneObject(t)
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.notes.length, 1)
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
    note('A-21', 'VS-7', JSON.stringify(step).slice(0, 80), `exit 0, note length ${t.json.notes[0].length}`)
  }
})

test('verify security VS-7 A22: gitlab signed-out and garbage', () => {
  for (const step of [{ exit: 1, stderr: '401 Unauthorized' }, { stdout: 'html<>' }, { stdout: '[]' }]) {
    const gl = glabStub({ fallback: step })
    const repo = r.gitRepo({ files: GL_CFG })
    const t = run(repo, ['--mode', 'stack'], gl.env())
    oneObject(t)
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    note('A-22', 'VS-7', JSON.stringify(step), t.stdout.trim().slice(0, 250))
  }
})

test('verify security VS-7 A23: invalid working branch still fails when gh is missing', () => {
  const repo = r.gitRepo({ files: GH_CFG })
  const t = run(repo, ['--mode', 'mr', '--branch=a..b'], { PATH: restrictedPath(['python3', 'git']) })
  assert.equal(t.status, 1)
  assert.equal(t.json.samples[0].rule, 'git check-ref-format')
  assert.equal(t.json.notes.length, 1)
  note('A-23', 'VS-7', 'gh missing + a..b', t.stdout.trim())
})

test('verify security VS-7 A24: a forge CLI planted in the repo is not run via a relative PATH entry', () => {
  const bin = restrictedPath(['python3', 'git'])
  const repo = r.gitRepo({ files: { ...GH_CFG, gh: '#!/bin/sh\ntouch "$PWD/PWNED"\necho []\n' } })
  r.exec('chmod', ['+x', join(repo, 'gh')])
  const t = run(repo, ['--mode', 'pr'], { PATH: `:${bin}` })
  oneObject(t)
  const planted = r.exec('ls', [repo]).stdout.includes('PWNED')
  note('A-24', 'VS-7', 'PATH with empty entry, executable gh in repo', `planted gh ran: ${planted}`)
  assert.equal(planted, false)
})

test('verify security VS-4 A25: gh path quoting for dot names (seed: .. and . reach a different endpoint)', { todo: 'seed, outside the stated spec' }, () => {
  const gh = stubServer({ fallback: { stdout: [] } })
  const repo = r.gitRepo({ files: GH_CFG })
  const out = {}
  for (const v of ['..', '.']) {
    const before = gh.count()
    run(repo, ['--mode', 'mr', `--branch=${v}`], gh.env())
    out[v] = gh.calls().slice(before).map((c) => c.argv[1])
  }
  note('A-25', 'VS-4', 'mr --branch=.. and .', JSON.stringify(out))
  assert.deepEqual(out, { '..': [], '.': [] })
})

test('verify security VS-4 A26: a forge rule regex that backtracks catastrophically does not hang preflight', { todo: 'seed, outside the stated spec' }, () => {
  const gh = stubServer({ fallback: { stdout: [ghRule('regex', '^(a+)+$', 'nested')] } })
  const repo = r.gitRepo({ files: GH_CFG })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'mr', `--branch=${'a'.repeat(40)}!`], { env: gh.env(), timeoutMs: 8000 })
  note('A-26', 'VS-4', '^(a+)+$ against 40 a + !', `timedOut ${t.timedOut} after ${t.durationMs} ms`)
  assert.equal(t.timedOut, false)
})

test('verify security VS-5 A27: forge CLI stderr containing a token is not echoed into the output', { todo: 'seed, outside the stated spec' }, () => {
  const gh = stubServer({ fallback: { exit: 1, stderr: 'auth failed for token ghp_FAKE0123456789abcdefFAKE0123456789ab' } })
  const repo = r.gitRepo({ files: GH_CFG })
  const t = run(repo, ['--mode', 'pr'], gh.env())
  note('A-27', 'VS-5', 'gh stderr with a token', t.json.notes[0].replace(/ghp_\S+/, 'ghp_<redacted>'))
  assert.equal(t.stdout.includes('ghp_'), false)
})
