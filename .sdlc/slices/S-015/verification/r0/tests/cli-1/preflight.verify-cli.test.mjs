import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { stubServer, restrictedPath } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/stub-server.mjs'
import { glabStub } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/glab-stub.mjs'

const SKILL = process.env.VERIFY_SKILL_DIR
const r = cliRunner(SKILL ? { skillDir: SKILL } : {})
const repoFor = (forge) => r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge } } })
const ghRule = (name, operator, pattern, negate = false) => ({ type: 'branch_name_pattern', parameters: { name, operator, pattern, negate } })
const pre = (repo, mode, env, extra = []) => r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...extra], { env })
const show = (t) => { console.log(t.text()) }

test('verify cli VS-7: no gh and no glab, python3 and git only', () => {
  const only = restrictedPath(['python3', 'git'])
  for (const [forge, mode] of [['github', 'pr'], ['github', 'stack'], ['gitlab', 'pr'], ['gitlab', 'stack']]) {
    const t = pre(repoFor(forge), mode, { PATH: only })
    show(t)
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.notes.length, 1)
    assert.match(t.json.notes[0], new RegExp(`^rules unknown on ${forge}:`))
    assert.equal(t.json.samples.length, 3)
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked' && s.rule === null))
    assert.equal(t.treeUnchanged, true)
  }
})

test('verify cli VS-7: mr mode with missing tool and a bad ref still fails only the ref', () => {
  const only = restrictedPath(['python3', 'git'])
  const t = pre(repoFor('github'), 'mr', { PATH: only }, ['--branch', 'a..b'])
  show(t)
  assert.equal(t.status, 1)
  assert.equal(t.json.samples.length, 1)
  assert.equal(t.json.samples[0].result, 'fail')
  assert.equal(t.json.samples[0].rule, 'git check-ref-format')
  assert.equal(t.json.notes.length, 1)
})

test('verify cli VS-7: signed-out gh (stderr, exit 4)', () => {
  const gh = stubServer({ script: [{ stderr: 'To get started with GitHub CLI, please run:  gh auth login', exit: 4 }] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.equal(t.status, 0)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.notes.length, 1)
  assert.match(t.json.notes[0], /^rules unknown on github: .*gh auth login/)
  assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
  assert.equal(gh.count(), 1)
})

test('verify cli VS-7: signed-out glab', () => {
  const glab = glabStub({ script: [{ stderr: 'glab: 401 Unauthorized', exit: 1 }] })
  const t = pre(repoFor('gitlab'), 'pr', { PATH: glab.path() })
  show(t)
  assert.equal(t.status, 0)
  assert.equal(t.json.ok, true)
  assert.match(t.json.notes[0], /^rules unknown on gitlab:/)
  assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
})

test('verify cli VS-7: tools that print garbage, empty output, wrong JSON shape, binary', () => {
  const cases = [
    ['github', 'not json at all'],
    ['github', ''],
    ['github', '{"message":"Not Found"}'],
    ['github', Buffer.from([0xff, 0xfe, 0x00, 0x80])],
    ['github', 'null'],
    ['gitlab', 'garbage <html>'],
    ['gitlab', ''],
    ['gitlab', '[1,2,3]'],
  ]
  for (const [forge, out] of cases) {
    const stub = forge === 'github' ? stubServer({ fallback: { stdout: out } }) : glabStub({ fallback: { stdout: out } })
    const t = pre(repoFor(forge), 'pr', { PATH: stub.path() })
    assert.equal(t.status, 0, `${forge} ${String(out).slice(0, 20)} -> ${t.stderr}`)
    assert.equal(t.stderr, '')
    assert.equal(t.json.ok, true)
    assert.ok(t.json.samples.every((s) => ['unchecked', 'pass'].includes(s.result)))
    if (forge === 'github' && (out === 'null' || out === '{"message":"Not Found"}' || out === '' || out === 'not json at all' || Buffer.isBuffer(out))) {
      assert.equal(t.json.notes.length, 1, `${forge} ${String(out).slice(0, 20)}`)
      assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
    }
  }
})

test('verify cli VS-7: gh that stalls past timeout is not tested here; gh killed by exit 127 and exit 0 with stderr only', () => {
  const gh = stubServer({ fallback: { stderr: 'x', exit: 127 } })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  assert.equal(t.status, 0)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.notes.length, 1)
})

test('verify cli VS-8: same bad regex on every sample gives one cannot evaluate note', () => {
  const gh = stubServer({ fallback: { stdout: [ghRule('bad one', 'regex', '(')] } })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.equal(t.status, 0)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.notes.filter((n) => n.startsWith('cannot evaluate')).length, 1)
  assert.equal(t.json.notes.length, 1)
  assert.ok(t.json.samples.every((s) => s.result === 'unevaluated'))
  assert.equal(t.json.rules.length, 1)
})

test('verify cli VS-8: distinct bad rules give notes in first-seen order, no duplicates', () => {
  const gh = stubServer({ script: [
    { stdout: [ghRule('zeta', 'regex', '(')] },
    { stdout: [ghRule('alpha', 'regex', '['), ghRule('zeta', 'regex', '(')] },
    { stdout: [ghRule('alpha', 'regex', '[')] },
  ] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.equal(t.status, 0)
  const notes = t.json.notes
  assert.equal(notes.length, 2)
  assert.match(notes[0], /^cannot evaluate zeta:/)
  assert.match(notes[1], /^cannot evaluate alpha:/)
  assert.deepEqual(t.json.samples.map((s) => s.result), ['unevaluated', 'unevaluated', 'unevaluated'])
})

test('verify cli VS-8: many samples (stack) with one unknown-kind rule and a bad regex', () => {
  const rules = [{ type: 'branch_name_pattern', parameters: { name: 'odd', operator: 'weird', pattern: 'x', negate: false } }, ghRule('bad', 'regex', '(?P<')]
  const gh = stubServer({ fallback: { stdout: rules } })
  const t = pre(repoFor('github'), 'stack', { PATH: gh.path() })
  show(t)
  assert.deepEqual(t.json.notes.map((n) => n.split(':')[0]), ['cannot evaluate odd', 'cannot evaluate bad'])
  assert.equal(t.json.ok, true)
})

test('verify cli VS-8: gitlab single bad push rule gives one note across samples', () => {
  const glab = glabStub({ fallback: { stdout: { branch_name_regex: '(' } } })
  const t = pre(repoFor('gitlab'), 'stack', { PATH: glab.path() })
  show(t)
  assert.equal(t.json.notes.length, 1)
  assert.match(t.json.notes[0], /^cannot evaluate push rule:/)
  assert.ok(t.json.samples.every((s) => s.result === 'unevaluated'))
})

test('verify cli VS-8: read_rules note and judge notes never mix on one run (gh fails on call 2)', () => {
  const gh = stubServer({ script: [{ stdout: [ghRule('bad', 'regex', '(')] }, { stderr: 'boom', exit: 1 }] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.equal(t.json.notes.length, 1)
  assert.match(t.json.notes[0], /^rules unknown on github: boom/)
  assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
  assert.deepEqual(t.json.rules, [])
})

test('verify cli VS-9: a rule for one sample does not fail the others', () => {
  const gh = stubServer({ script: [
    { stdout: [ghRule('slice only', 'starts_with', 'feature/')] },
    { stdout: [] },
    { stdout: [] },
  ] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.equal(t.status, 1)
  assert.equal(t.json.ok, false)
  const [slice, state, e2e] = t.json.samples
  assert.equal(slice.kind, 'slice')
  assert.equal(slice.result, 'fail')
  assert.equal(slice.rule, 'slice only')
  assert.equal(state.result, 'pass')
  assert.equal(state.rule, null)
  assert.equal(e2e.result, 'pass')
  const calls = gh.calls()
  assert.equal(calls.length, 3)
  assert.match(calls[0].argv.join(' '), /sdlc%2FS-001/)
  assert.match(calls[1].argv.join(' '), /sdlc%2Fstate-\d{14}/)
  assert.match(calls[2].argv.join(' '), /sdlc%2FM-1-e2e/)
})

test('verify cli VS-9: overlapping rules, later sample fails on the second rule only', () => {
  const gh = stubServer({ script: [
    { stdout: [ghRule('a', 'starts_with', 'sdlc/')] },
    { stdout: [ghRule('a', 'starts_with', 'sdlc/'), ghRule('b', 'contains', 'zzz')] },
    { stdout: [ghRule('a', 'starts_with', 'sdlc/'), ghRule('c', 'ends_with', 'nope'), ghRule('b', 'contains', 'zzz')] },
  ] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.equal(t.status, 1)
  assert.deepEqual(t.json.samples.map((s) => [s.result, s.rule]), [['pass', null], ['fail', 'b'], ['fail', 'c']])
  assert.deepEqual(t.json.rules.map((x) => x.label), ['a', 'b', 'c'])
})

test('verify cli VS-9: negated rule applies per sample', () => {
  const gh = stubServer({ script: [
    { stdout: [ghRule('no S', 'contains', 'S-', true)] },
    { stdout: [ghRule('no S', 'contains', 'S-', true)] },
    { stdout: [] },
  ] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() })
  show(t)
  assert.deepEqual(t.json.samples.map((s) => s.result), ['fail', 'pass', 'pass'])
})

test('verify cli VS-9: mr working sample sharing a name with a slice name keeps its own row and rule entry', () => {
  const gh = stubServer({ fallback: { stdout: [ghRule('only feat', 'starts_with', 'feat/')] } })
  const t = pre(repoFor('github'), 'mr', { PATH: gh.path() }, ['--branch', 'sdlc/S-001'])
  show(t)
  assert.equal(t.json.samples.length, 1)
  assert.equal(t.json.samples[0].kind, 'working')
  assert.equal(t.json.samples[0].name, 'sdlc/S-001')
  assert.equal(t.json.samples[0].result, 'fail')
  assert.equal(gh.count(), 1)
})

test('verify cli VS-9: same flow with a lowercase prefix format, rule judged on formatted name', () => {
  const gh = stubServer({ script: [
    { stdout: [ghRule('lower', 'regex', '^team/s-001$')] },
    { stdout: [] },
    { stdout: [] },
  ] })
  const t = pre(repoFor('github'), 'pr', { PATH: gh.path() }, ['--format', 'team/{name:lower}'])
  show(t)
  assert.equal(t.json.samples[0].name, 'team/s-001')
  assert.equal(t.json.samples[0].result, 'pass')
  assert.equal(t.status, 0)
})

test('verify cli VS-9: glab push rule applies to every sample with its own result', () => {
  const glab = glabStub({ fallback: { stdout: { branch_name_regex: '^sdlc/(S|M)-' } } })
  const t = pre(repoFor('gitlab'), 'pr', { PATH: glab.path() })
  show(t)
  assert.deepEqual(t.json.samples.map((s) => [s.result, s.rule]), [['pass', null], ['fail', 'push rule'], ['pass', null]])
  assert.equal(t.status, 1)
  assert.equal(glab.count(), 1)
})
