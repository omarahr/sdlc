import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const W = process.env.VERIFY_WORKTREE
const { cliRunner } = await import(`${W}/skills/sdlc/test/testkit/cli-runner.mjs`)
const r = cliRunner()
const repo = r.gitRepo({ files: { '.sdlc/config.json': {} } })
const LOG = []
function parse(branch, format = 'sdlc/{name}') {
  const t = r.run('branches.py', ['parse', '--repo', repo, `--branch=${branch}`, `--format=${format}`])
  LOG.push(t.text())
  return t
}
const clean = (t, label) => {
  assert.ok(!/Traceback/.test(t.stderr), label + ' ' + t.stderr.split('\n').slice(-2).join('|'))
  assert.ok(t.json, label + ' stdout is one JSON object')
  assert.equal(t.status, 0, label)
  assert.ok(t.treeUnchanged, label)
}

test('verify cli: VS-7 run-N at and past the int string limit', () => {
  for (const len of [1, 4299, 4300, 4301, 5000, 20000, 100000]) {
    const d = '9'.repeat(len)
    const t = parse('sdlc/run-' + d)
    clean(t, 'run-' + len)
    assert.equal(t.json.kind, 'run')
    assert.equal(t.json.tail, 'run-' + d)
    assert.ok(t.durationMs < 20000, `len ${len} took ${t.durationMs}`)
  }
})

test('verify cli: VS-7 run-N 5000 digits equals the digits', () => {
  const d = '1' + '0'.repeat(4999)
  const t = parse('sdlc/run-' + d)
  clean(t, 'exact')
  assert.equal(t.stdout.includes(d), true)
})

test('verify cli: VS-7 huge integers in verify, attempt and milestone rows', () => {
  const big = '7'.repeat(6000)
  for (const [b, kind] of [
    [`S-001-v${big}-http-api-0`, 'verify'],
    [`S-001-v0-http-api-${big}`, 'verify'],
    [`S-001-attempt-${big}`, 'attempt'],
    [`M-${big}`, 'milestone'],
    [`M-${big}-e2e`, 'e2e'],
    [`M-${big}-e2e-api`, 'e2e-area'],
  ]) {
    const t = parse('sdlc/' + b)
    clean(t, kind)
    assert.equal(t.json.kind, kind)
  }
})

test('verify cli: VS-7 huge run-N under prefixed, suffixed and lower formats', () => {
  const d = '9'.repeat(5000)
  for (const f of ['feature/PROJ-1-{name}', '{name}-wip', 'sdlc/{name:lower}']) {
    const t = parse(f.replace(/\{name(:lower)?\}/, 'run-' + d), f)
    clean(t, f)
    assert.equal(t.json.kind, 'run')
  }
})

test('verify cli: VS-7 huge unicode digits in run-N', () => {
  const t = parse('sdlc/run-' + '٣'.repeat(5000))
  clean(t, 'unicode')
  assert.equal(t.json.kind, 'run')
})

test('verify cli: VS-7 huge-integers corpus through parse', async () => {
  const { load } = await import(`${W}/skills/sdlc/test/testkit/attack-corpus.mjs`)
  let n = 0
  for (const e of load('huge-integers', { argv: true })) {
    for (const pre of ['run-', 'M-', 'S-001-attempt-']) {
      const t = parse('sdlc/' + pre + e.value)
      assert.ok(!/Traceback/.test(t.stderr), e.id + pre)
      assert.ok(t.json, e.id + pre)
      n++
    }
  }
  LOG.push('corpus cases ' + n)
})

test('verify cli: second run is unchanged (idempotent)', () => {
  const a = parse('sdlc/run-' + '9'.repeat(5000)).stdout
  const b = parse('sdlc/run-' + '9'.repeat(5000)).stdout
  assert.equal(a, b)
})

test.after(() => writeFileSync(join(process.env.VERIFY_OUT, 'cli-0-fix-transcripts.txt'), LOG.join('\n----\n')))
