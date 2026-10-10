import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { stubServer } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/stub-server.mjs'
import { glabStub } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/glab-stub.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const rx = (pattern) => ({ type: 'branch_name_pattern', parameters: { operator: 'regex', pattern, negate: false, name: 'conv' } })
const ghRepo = (r) => r.gitRepo({ files: { '.sdlc/config.json': { forge: 'github' } } })
const glRepo = (r) => r.gitRepo({ files: { '.sdlc/config.json': { forge: 'gitlab' } } })
const pre = (r, repo, mode, extra = [], env = {}) => r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...extra], { env })
const results = (t) => t.json.samples.map((s) => s.result)

test('verify cli: VS-1 regex rule unanchored, boundary via preflight (TC-cli-1)', () => {
  const r = cliRunner()
  const gh = stubServer({ fallback: { stdout: [rx('feature')] } })
  const repo = ghRepo(r)
  const t = pre(r, repo, 'pr', ['--format', 'x/feature/{name}'], gh.env())
  assert.equal(t.status, 0, t.text())
  assert.deepEqual(new Set(results(t)), new Set(['pass']))
  assert.equal(t.treeUnchanged, true)
})

test('verify cli: VS-1 anchored ^feature/ fails sdlc/ default and passes feature/ format (TC-cli-2)', () => {
  const r = cliRunner()
  const gh = stubServer({ fallback: { stdout: [rx('^feature/')] } })
  const repo = ghRepo(r)
  const bad = pre(r, repo, 'pr', [], gh.env())
  assert.equal(bad.status, 1, bad.text())
  assert.equal(bad.json.ok, false)
  assert.ok(bad.json.samples.some((s) => s.kind === 'slice' && s.result === 'fail'))
  const good = pre(r, repo, 'pr', ['--format', 'feature/{name}'], gh.env())
  assert.equal(good.status, 0, good.text())
  assert.ok(good.json.samples.find((s) => s.kind === 'slice').name.startsWith('feature/S-'))
  const unanchoredPos = pre(r, repo, 'pr', ['--format', 'x/feature/{name}'], gh.env())
  assert.equal(unanchoredPos.status, 1, 'x/feature/ must not match ^feature/')
})

test('verify cli: VS-1 invalid and empty regex pattern (TC-cli-3)', () => {
  const r = cliRunner()
  const repo = ghRepo(r)
  for (const pattern of ['(', '[', '*abc', '']) {
    const gh = stubServer({ fallback: { stdout: [rx(pattern)] } })
    const t = pre(r, repo, 'pr', [], gh.env())
    assert.ok([0, 1, 2].includes(t.status), `${JSON.stringify(pattern)} -> ${t.status}`)
    assert.equal(t.json && typeof t.json, 'object', t.text())
    assert.ok(!/Traceback/.test(t.stderr), t.stderr)
    assert.equal(t.treeUnchanged, true)
  }
})

test('verify cli: VS-2 gitlab reads exactly one project push rule call in pr and stack (TC-cli-4)', () => {
  const r = cliRunner()
  const repo = glRepo(r)
  for (const mode of ['pr', 'stack']) {
    const glab = glabStub({ fallback: { stdout: { branch_name_regex: '^sdlc/' } } })
    const t = pre(r, repo, mode, [], glab.env())
    assert.equal(t.status, 0, t.text())
    const calls = glab.calls()
    assert.equal(calls.length, 1, JSON.stringify(calls))
    assert.deepEqual(calls[0].argv, ['api', 'projects/:fullpath/push_rule'])
    assert.ok(!calls.some((c) => c.argv.join(' ').includes('group')))
    assert.equal(t.json.rules.length, 1)
    assert.equal(t.json.rules[0].source, 'gitlab')
    assert.equal(t.json.rules[0].label, 'push rule')
    assert.equal(t.json.forge, 'gitlab')
  }
})

test('verify cli: VS-2 empty body and glab failure (TC-cli-5)', () => {
  const r = cliRunner()
  const repo = glRepo(r)
  const empty = glabStub({ fallback: { stdout: {} } })
  const a = pre(r, repo, 'pr', [], empty.env())
  assert.equal(a.status, 0, a.text())
  assert.deepEqual(a.json.rules, [])
  assert.equal(empty.calls().length, 1)
  const failing = glabStub({ fallback: { stderr: 'boom', exit: 1 } })
  const b = pre(r, repo, 'pr', [], failing.env())
  assert.equal(b.status, 0, b.text())
  assert.deepEqual(b.json.rules, [])
  assert.ok(b.json.notes.some((n) => n.includes('boom')), JSON.stringify(b.json.notes))
  assert.deepEqual(new Set(results(b)), new Set(['unchecked']))
  assert.equal(failing.calls().length, 1)
})

test('verify cli: VS-3 literal prefix with ticket key names slice branch (TC-cli-6)', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const fmt = 'feature/PROJ-123-{name}'
  const n = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', fmt])
  assert.equal(n.status, 0, n.text())
  assert.equal(n.json.branch, 'feature/PROJ-123-S-001')
  for (const id of ['S-002', 'S-027a', 'S-fix-3']) {
    const m = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', id, '--format', fmt])
    assert.equal(m.json.branch, `feature/PROJ-123-${id}`)
  }
  const ms = r.run('branches.py', ['name', '--repo', repo, '--kind', 'milestone', '--id', 'M-1', '--format', fmt])
  assert.equal(ms.status, 0, ms.text())
  assert.equal(ms.json.branch, 'feature/PROJ-123-M-1')
  const p = pre(r, repo, 'pr', ['--format', fmt])
  assert.equal(p.status, 0, p.text())
  assert.equal(p.json.ok, true)
  assert.equal(p.json.given, true)
  assert.equal(p.json.format, fmt)
  assert.equal(p.json.samples.find((s) => s.kind === 'slice').name, 'feature/PROJ-123-S-001')
  const slash = pre(r, repo, 'pr', ['--format', 'feature/PROJ-123-{name}/'])
  assert.ok([0, 2].includes(slash.status), slash.text())
  assert.ok(slash.json)
})

test('verify cli: VS-4 invalid ref format refused with exit 2 (TC-cli-7)', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const t = pre(r, repo, 'pr', ['--format', 'sdlc/{name}..'])
  assert.equal(t.status, 2, t.text())
  assert.equal(t.stdout.trim().split('\n').length, 1)
  assert.equal(t.json.ok, false)
  assert.ok(t.json.error.includes('check-ref-format'), t.json.error)
  assert.ok(t.json.error.includes('not a valid branch name'), t.json.error)
  assert.equal(t.treeUnchanged, true)
})

test('verify cli: VS-4 other invalid parts and hostile values (TC-cli-8)', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const bad = ['sdlc/{name} x', 'sdlc/~{name}', 'sdlc:{name}', 'sdlc/{name}.', 'sdlc/{name}.lock', '-sdlc/{name}', 'sdlc/{name}\u0007', 'sdlc/{name}\n', 'sdlc/^{name}', 'sdlc/{name}[', 'sdlc/?{name}', 'sdlc//{name}']
  for (const fmt of bad) {
    const t = pre(r, repo, 'pr', ['--format', fmt])
    assert.equal(t.status, 2, `${JSON.stringify(fmt)} -> ${t.status} ${t.stdout}`)
    assert.equal(t.json.ok, false)
    assert.ok(!/Traceback/.test(t.stderr))
    assert.equal(t.treeUnchanged, true, JSON.stringify(fmt))
  }
  for (const fam of ['flag-like-values', 'control-chars', 'injection']) {
    for (const e of load(fam, { argv: true })) {
      const t = pre(r, repo, 'pr', ['--format=' + e.value])
      assert.ok(t.json, `${e.id}: ${t.text()}`)
      assert.ok(!/Traceback/.test(t.stderr), `${e.id}: ${t.stderr}`)
      assert.ok([0, 1, 2].includes(t.status), `${e.id}: ${t.status}`)
      assert.equal(t.treeUnchanged, true, e.id)
    }
  }
})

test('verify cli: VS-4 format is never run as a command (TC-cli-9)', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const marker = r.dir('marker') + '/fired'
  for (const fmt of [`sdlc/$(touch ${marker})/{name}`, `sdlc/\`touch ${marker}\`/{name}`, `sdlc/;touch ${marker};/{name}`]) {
    const t = pre(r, repo, 'pr', ['--format', fmt])
    assert.ok(t.json)
    assert.ok([0, 1, 2].includes(t.status))
  }
  assert.equal(existsSync(marker), false)
})

test('verify cli: VS-5 no format and no rules keeps default in every mode (TC-cli-10)', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  for (const mode of ['pr', 'stack', 'mr', 'direct']) {
    const t = pre(r, repo, mode)
    assert.equal(t.status, 0, `${mode}: ${t.text()}`)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.format, 'sdlc/{name}')
    assert.equal(t.json.derived, false)
    assert.deepEqual(t.json.rules, [])
    assert.equal(t.json.given, false)
    for (const s of t.json.samples) assert.ok(['pass', 'unchecked'].includes(s.result), `${mode} ${JSON.stringify(s)}`)
    const state = t.json.samples.find((s) => s.kind === 'state')
    if (state) assert.ok(state.name.startsWith('sdlc/state-'), state.name)
    assert.equal(t.treeUnchanged, true)
  }
})

test('verify cli: VS-5 github shim returning empty list keeps default (TC-cli-11)', () => {
  const r = cliRunner()
  const repo = ghRepo(r)
  for (const mode of ['pr', 'stack', 'mr', 'direct']) {
    const gh = stubServer({ fallback: { stdout: [] } })
    const t = pre(r, repo, mode, [], gh.env())
    assert.equal(t.status, 0, `${mode}: ${t.text()}`)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.format, 'sdlc/{name}')
    assert.equal(t.json.derived, false)
    assert.deepEqual(t.json.rules, [])
    for (const s of t.json.samples) assert.ok(['pass', 'unchecked'].includes(s.result), `${mode} ${JSON.stringify(s)}`)
    assert.equal(t.treeUnchanged, true)
  }
})
