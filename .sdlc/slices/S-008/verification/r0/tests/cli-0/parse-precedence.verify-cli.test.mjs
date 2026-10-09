import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const W = process.env.VERIFY_WORKTREE
const { cliRunner } = await import(`${W}/skills/sdlc/test/testkit/cli-runner.mjs`)
const r = cliRunner()
const repo = r.gitRepo({ files: { '.sdlc/config.json': {} } })
const LOG = []

function parse(branch, format) {
  const args = ['parse', '--repo', repo, `--branch=${branch}`]
  if (format) args.push(`--format=${format}`)
  const t = r.run('branches.py', args)
  LOG.push(t.text())
  return t
}
const D = 'sdlc/{name}'
const pick = (t, ...k) => Object.fromEntries(k.map((x) => [x, t.json[x]]))

test('verify cli: VS-1 run branch', () => {
  for (const [n, want] of [['run-3', 3], ['run-0', 0], ['run-12', 12], ['run-007', 7]]) {
    const t = parse(`sdlc/${n}`, D)
    assert.equal(t.status, 0)
    assert.equal(t.json.kind, 'run')
    assert.strictEqual(t.json.n, want)
    assert.equal(t.json.id, undefined)
    assert.equal(t.json.tail, n)
    assert.ok(t.treeUnchanged)
  }
  for (const n of ['run-x', 'run-', 'run-3-x', 'run--1']) {
    const t = parse(`sdlc/${n}`, D)
    assert.equal(t.status, 0)
    assert.equal(t.json.kind, null, n)
  }
})

test('verify cli: VS-2 milestone', () => {
  let t = parse('sdlc/M-2', D)
  assert.deepEqual(pick(t, 'kind', 'id'), { kind: 'milestone', id: 'M-2' })
  for (const n of ['M-', 'M-x']) assert.equal(parse(`sdlc/${n}`, D).json.kind, null)
  for (const n of ['M-2-e2e', 'M-2-e2e-api']) assert.notEqual(parse(`sdlc/${n}`, D).json.kind, 'milestone')
  assert.equal(parse('sdlc/m-2', D).json.kind, null)
  t = parse('sdlc/m-2', 'sdlc/{name:lower}')
  assert.equal(t.json.kind, 'milestone')
})

test('verify cli: VS-3 e2e', () => {
  let t = parse('sdlc/M-2-e2e', D)
  assert.deepEqual(pick(t, 'kind', 'id'), { kind: 'e2e', id: 'M-2' })
  assert.notEqual(parse('sdlc/M-2-e2e-api', D).json.kind, 'e2e')
  assert.equal(parse('sdlc/M-2-e2e-', D).json.kind, null)
  assert.notEqual(parse('sdlc/M-2-e2e-x', D).json.kind, 'e2e')
  assert.equal(parse('sdlc/M-2-e2ex', D).json.kind, null)
})

test('verify cli: VS-4 e2e-area', () => {
  for (const a of ['api-v2', 'a', '0', 'e2e', 'v2-api-3', 'x'.repeat(500)]) {
    const t = parse(`sdlc/M-2-e2e-${a}`, D)
    assert.deepEqual(pick(t, 'kind', 'id', 'area'), { kind: 'e2e-area', id: 'M-2', area: a })
  }
})

test('verify cli: VS-5 prefixed and suffixed formats', () => {
  for (const f of ['feature/PROJ-1-{name}', '{name}-wip']) {
    const mk = (m) => f.replace('{name}', m)
    assert.deepEqual(pick(parse(mk('run-3'), f), 'kind', 'n'), { kind: 'run', n: 3 })
    assert.deepEqual(pick(parse(mk('M-2'), f), 'kind', 'id'), { kind: 'milestone', id: 'M-2' })
    assert.deepEqual(pick(parse(mk('M-2-e2e'), f), 'kind', 'id'), { kind: 'e2e', id: 'M-2' })
    assert.deepEqual(pick(parse(mk('M-2-e2e-api'), f), 'kind', 'id', 'area'), { kind: 'e2e-area', id: 'M-2', area: 'api' })
  }
  const t = parse('M-2-e2e-api-wip', '{name}-wip')
  assert.deepEqual(pick(t, 'kind', 'area'), { kind: 'e2e-area', area: 'api' })
  assert.equal(parse('feature/PROJ-2-M-2', 'feature/PROJ-1-{name}').json.kind, null)
  assert.equal(parse('M-2', '{name}-wip').json.kind, null)
})

test('verify cli: VS-7 hostile tails', () => {
  const hostile = [
    'M-2\n', 'run-3\n', 'M-2-e2e\n', 'M-2-e2e-api\n',
    'run-٣', 'M-٢', 'M-2-e2e-١',
    'M-2\t', 'M-2 ', 'M-2\r', 'run-3 ', 'M-2\u0085',
    '--help', '-x', '--branch=x', 'M-2-e2e-a/b', 'M-2-e2e-a\x01',
    'M-' + '9'.repeat(5000), 'run-' + '9'.repeat(4300), '', 'sdlc/', '../M-2', 'M-2;id', '$(id)', '%s%n', '{name}',
  ]
  const out = []
  for (const h of hostile) {
    const t = parse(h.startsWith('sdlc/') || h === '' ? h : `sdlc/${h}`, D)
    assert.notEqual(t.status, null, JSON.stringify(h))
    assert.ok(!/Traceback/.test(t.stderr), JSON.stringify(h))
    assert.ok(t.json, JSON.stringify(h))
    assert.ok(t.treeUnchanged)
    out.push([h, t.status, t.json.kind, t.json.id ?? t.json.n ?? null, t.json.area ?? null])
  }
  writeFileSync(join(process.env.VERIFY_OUT, 'cli-0-vs7-matrix.json'), JSON.stringify(out, null, 1))
  const byTail = Object.fromEntries(out.map((o) => [o[0], o[2]]))
  assert.equal(byTail['M-2-e2e-a/b'], 'e2e-area')
  const nul = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/M-2\0x'])
  LOG.push(nul.text())
  assert.equal(nul.json, undefined)
  const unk = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/M-2', '--bogus'])
  LOG.push(unk.text())
  assert.notEqual(unk.status, 0)
})

test('verify cli: VS-7 run-N beyond the int string limit gives one JSON object', () => {
  const t = parse('sdlc/run-' + '9'.repeat(5000), D)
  assert.ok(!/Traceback/.test(t.stderr), t.stderr.split('\n').slice(-2).join('|'))
  assert.ok(t.json, 'stdout is one JSON object')
  assert.ok([0, 2].includes(t.status))
})

test.after(() => writeFileSync(join(process.env.VERIFY_OUT, 'cli-0-transcripts.txt'), LOG.join('\n----\n')))
