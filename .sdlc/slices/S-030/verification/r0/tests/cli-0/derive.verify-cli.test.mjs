import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { stubServer } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/stub-server.mjs'

const LOG = process.env.VERIFY_LOG
const transcripts = []
const ghRule = (operator, pattern, negate = false) => ({ type: 'branch_name_pattern', parameters: { name: 'r', operator, pattern, negate } })

function pre(rules, { config = {}, extra = [] } = {}) {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge: 'github', ...config } } })
  const gh = stubServer({ fallback: { stdout: rules } })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr', ...extra], { env: gh.env({ PATH: r.env.PATH }) })
  transcripts.push(t.text())
  return { t, out: t.json, r, repo }
}

test('verify cli: VS-1 starts_with gives a prefixed format', () => {
  const { t, out, r, repo } = pre([ghRule('starts_with', 'feature/')])
  assert.equal(t.status, 0)
  assert.equal(out.ok, true)
  assert.equal(out.derived, true)
  assert.equal(out.format, 'feature/sdlc/{name}')
  const byKind = Object.fromEntries(out.samples.map((s) => [s.kind, s.name]))
  assert.equal(byKind.slice, 'feature/sdlc/S-001')
  assert.equal(byKind.e2e, 'feature/sdlc/M-1-e2e')
  assert.match(byKind.state, /^feature\/sdlc\/state-\d{14}$/)
  const n = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--format', out.format])
  transcripts.push(n.text())
  assert.equal(n.status, 0)
  assert.equal(n.json.branch, 'feature/sdlc/S-001')
})

for (const [label, pattern] of [['regex chars', 'f.+(a)/'], ['space', 'my team/'], ['no trailing slash', 'feature']]) {
  test(`verify cli: VS-1 prefix corner ${label}`, () => {
    const { t, out } = pre([ghRule('starts_with', pattern)])
    assert.equal(out.format === undefined, false)
    if (out.derived) {
      assert.equal(out.format, `${pattern}sdlc/{name}`)
      assert.ok(out.samples.every((s) => s.name.startsWith(pattern)))
      assert.equal(t.status, 0)
    } else {
      assert.equal(t.status, 1)
      assert.equal(out.ok, false)
    }
    writeFileSync(`${LOG}.corner-${label.replace(/ /g, '_')}.txt`, JSON.stringify({ derived: out.derived, ok: out.ok, format: out.format, status: t.status, error: out.error, suggestion: out.suggestion }, null, 2))
  })
}

test('verify cli: VS-2 ends_with gives a suffixed format', () => {
  const { t, out } = pre([ghRule('ends_with', '-dev')])
  assert.equal(t.status, 0)
  assert.equal(out.ok, true)
  assert.equal(out.derived, true)
  assert.equal(out.format, 'sdlc/{name}-dev')
  assert.equal(out.samples.find((s) => s.kind === 'slice').name, 'sdlc/S-001-dev')
})

for (const suffix of ['.x', '-', '_dev']) {
  test(`verify cli: VS-2 suffix corner ${suffix}`, () => {
    const { t, out } = pre([ghRule('ends_with', suffix)])
    assert.equal(out.derived, true, JSON.stringify(out))
    assert.equal(out.format, `sdlc/{name}${suffix}`)
    assert.equal(t.status, 0)
    assert.ok(out.samples.every((s) => s.name.endsWith(suffix) && s.result === 'pass'))
  })
}

test('verify cli: VS-3 contains gives an infix format', () => {
  const { t, out } = pre([ghRule('contains', 'team-a')])
  assert.equal(t.status, 0)
  assert.equal(out.ok, true)
  assert.equal(out.derived, true)
  assert.equal(out.format, 'sdlc/team-a/{name}')
  assert.ok(out.samples.every((s) => s.name.includes('team-a')))
})

test('verify cli: VS-4 derived format is clean and writes nothing', () => {
  const { t, out, r, repo } = pre([ghRule('starts_with', 'feature/')])
  assert.equal(t.status, 0)
  assert.equal(out.format, 'feature/sdlc/{name}')
  assert.equal(out.derived, true)
  assert.ok(out.samples.length >= 3)
  for (const s of out.samples) {
    assert.equal(s.result, 'pass')
    assert.equal(s.rule, null)
  }
  assert.ok(!out.samples.some((s) => s.result === 'fail'))
  assert.equal(t.treeUnchanged, true)
})

const FIVE = [
  ['flag', [ghRule('starts_with', 'feature/')], { extra: ['--format', 'team/{name}'] }, 'team/{name}'],
  ['config', [ghRule('starts_with', 'feature/')], { config: { branchFormat: 'team/{name}' } }, 'team/{name}'],
  ['two rules', [ghRule('starts_with', 'feature/'), ghRule('ends_with', '-dev')], {}, 'sdlc/{name}'],
  ['negated', [ghRule('starts_with', 'sdlc/', true)], {}, 'sdlc/{name}'],
  ['regex', [ghRule('regex', '^feature/')], {}, 'sdlc/{name}'],
  ['negated ends_with', [ghRule('ends_with', 'e2e', true)], {}, 'sdlc/{name}'],
  ['negated contains', [ghRule('contains', 'S-', true)], {}, 'sdlc/{name}'],
]
for (const [label, rules, opts, format] of FIVE) {
  test(`verify cli: VS-5 no derivation: ${label}`, () => {
    const { t, out } = pre(rules, opts)
    assert.equal(out.derived, false)
    assert.equal(out.ok, false)
    assert.equal(t.status, 1)
    assert.equal(out.format, format)
    assert.equal(t.treeUnchanged, true)
  })
}

test('verify cli: VS-5 empty rule list and unknown operator', () => {
  const empty = pre([])
  assert.equal(empty.t.status, 0)
  assert.equal(empty.out.derived, false)
  assert.equal(empty.out.format, 'sdlc/{name}')
  const unknown = pre([ghRule('frobnicate', 'x')])
  assert.equal(unknown.out.derived, false)
  writeFileSync(`${LOG}.unknown-op.txt`, JSON.stringify({ status: unknown.t.status, out: unknown.out }, null, 2))
})

test.after(() => { if (LOG) writeFileSync(`${LOG}.transcripts.txt`, transcripts.join('\n\n====\n\n')) })
