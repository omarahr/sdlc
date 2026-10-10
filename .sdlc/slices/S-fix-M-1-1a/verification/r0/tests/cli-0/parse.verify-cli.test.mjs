import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cliRunner } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-fix-M-1-1a-v0-cli-0/skills/sdlc/test/testkit/cli-runner.mjs'

const r = cliRunner({ skillDir: '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-fix-M-1-1a-v0-cli-0/skills/sdlc' })
const K = 'K', S = 'ſ', AR = '٣'
const parse = (format, branch, cfg) => {
  const repo = r.gitRepo({ files: cfg ? { '.sdlc/config.json': cfg } : {}, name: 'p' + Math.random().toString(36).slice(2) })
  const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', branch, ...(format ? ['--format', format] : [])])
  return t
}
const FORMATS = ['feature/p-1-{name}', 'feature/p-1-{name:lower}']

for (const fmt of FORMATS) {
  const lookalikes = [
    ['S-00' + K], ['s-001' + S], ['s-00' + K + '-v0-cli-0'], ['s-00' + K + '-attempt-1'],
    ['S-001-v' + AR + '-cli-0'], ['run-' + AR], ['M-' + AR], ['M-' + AR + '-e2e'], ['M-' + AR + '-e2e-api'],
    ['state-' + AR.repeat(14)], ['S-001-v0-cli-' + AR], ['S-001-attempt-' + AR], ['S-' + S + 'S'],
  ]
  for (const [tail] of lookalikes) {
    test('verify cli: ' + fmt + ' look-alike tail ' + JSON.stringify(tail) + ' is no loop branch', () => {
      const t = parse(fmt, 'feature/p-1-' + tail)
      assert.equal(t.status, 0, t.text())
      assert.equal(t.json.kind, null, t.text())
      assert.equal(t.stderr, '')
      assert.ok(t.treeUnchanged)
    })
  }
  const valid = [
    ['S-fix-M-1-2', 'slice', 'S-fix-M-1-2'], ['M-1-e2e-api', 'e2e-area', 'M-1'], ['M-1-e2e-a-b', 'e2e-area', 'M-1'],
    ['S-001-v0-http-api-0', 'verify', 'S-001'], ['S-001-attempt-3', 'attempt', 'S-001'], ['run-12', 'run'], ['M-1', 'milestone', 'M-1'],
    ['M-1-e2e', 'e2e', 'M-1'], ['state-20261010120000', 'state'], ['M-1-e2e-é', 'e2e-area', 'M-1'],
  ]
  for (const [tail, kind, id] of valid) {
    test('verify cli: ' + fmt + ' valid tail ' + tail + ' is ' + kind, () => {
      const t = parse(fmt, 'feature/p-1-' + tail)
      assert.equal(t.status, 0, t.text())
      assert.equal(t.json.kind, kind, t.text())
      if (id) assert.equal(t.json.id, id)
      assert.equal(t.json.tail, tail)
    })
  }
}
test('verify cli: lower mode keeps mixed-case ASCII', () => {
  const t = parse('feature/p-1-{name:lower}', 'FEATURE/P-1-s-FIX-m-1-2')
  assert.equal(t.json.kind, 'slice', t.text())
  const u = parse('feature/p-1-{name:lower}', 'feature/p-1-M-1-E2E-API')
  assert.equal(u.json.kind, 'e2e-area', u.text())
  const v = parse('feature/p-1-{name:lower}', 'feature/p-1-s-001-V0-cli-0')
  assert.equal(v.json.kind, 'verify', v.text())
})
test('verify cli: non-lower mode keeps case-sensitive match', () => {
  assert.equal(parse('feature/p-1-{name}', 'feature/p-1-s-001').json.kind, null)
  assert.equal(parse('feature/p-1-{name}', 'feature/p-1-m-1').json.kind, null)
})
test('verify cli: lower mode look-alike prefix and suffix give none', () => {
  const t = parse('feat' + 'k-{name:lower}-end', 'feat' + K + '-S-001-end')
  assert.equal(t.json.kind, null, t.text())
  const u = parse('feat' + 'k-{name:lower}-end', 'feat' + K.toLowerCase() + '-S-001-end')
  assert.equal(u.json.kind, 'slice', u.text())
  const v = parse('pre-{name:lower}-s' + 'k', 'pre-S-001-s' + K)
  assert.equal(v.json.kind, null, v.text())
  const w = parse('pre-{name:lower}-sk', 'pre-S-001-SK')
  assert.equal(w.json.kind, 'slice', w.text())
  const x = parse('pre-{name:lower}-' + S, 'pre-S-001-S')
  assert.equal(x.json.kind, null, x.text())
})
test('verify cli: list excludes look-alike branches and keeps valid ones', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name:lower}' } }, branches: ['feature/s-001', 'feature/S-002', 'feature/s-00' + K, 'feature/run-' + AR, 'feature/run-7'] , name: 'listrepo' })
  const s = r.run('branches.py', ['list', '--repo', repo, '--kind', 'slice'])
  assert.equal(s.status, 0, s.text())
  assert.deepEqual(s.json.branches.map(b => b.branch), ['feature/S-002', 'feature/s-001'])
  const n = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run'])
  assert.deepEqual(n.json.branches.map(b => b.branch), ['feature/run-7'])
  assert.ok(n.treeUnchanged)
})
test('verify cli: config-file format and unknown flag and double run', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } }, name: 'cfgrepo' })
  const a = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'feature/S-00' + K])
  const b = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'feature/S-00' + K])
  assert.equal(a.json.kind, null); assert.deepEqual(a.json, b.json)
  const bad = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'x', '--nope'])
  assert.notEqual(bad.status, 0); assert.equal(bad.json?.ok, false, bad.text())
})
