import test from 'node:test'
import assert from 'node:assert/strict'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const r = cliRunner()
const parse = (fmt, branch) => {
  const repo = r.gitRepo({ name: 'p' + Math.random().toString(36).slice(2) })
  return r.run('branches.py', ['parse', '--repo', repo, '--format', fmt, '--branch', branch])
}
const kindOf = (fmt, branch) => { const t = parse(fmt, branch); assert.equal(t.status, 0, t.stderr); return t.json.kind }

test('verify security VS-1: first run name is count+1 and old formats are not counted', () => {
  for (const [fmt, have] of [['sdlc/{name}', 0], ['sdlc/{name}', 1], ['sdlc/{name}', 3], ['wip/{name}-x', 3]]) {
    const branches = Array.from({ length: have }, (_, i) => fmt.replace('{name}', 'run-' + (i + 1)))
    branches.push('old/run-9', 'sdlc/S-001')
    const repo = r.gitRepo({ branches })
    const l = r.run('branches.py', ['list', '--repo', repo, '--format', fmt, '--kind', 'run'])
    assert.equal(l.json.branches.length, have)
    const n = r.run('branches.py', ['name', '--repo', repo, '--format', fmt, '--kind', 'run', '--n', have + 1])
    assert.equal(n.json.branch, fmt.replace('{name}', 'run-' + (have + 1)))
    assert.equal(n.treeUnchanged, true)
  }
})

test('verify security VS-1: hostile format values fail with no tree change', () => {
  const values = [
    ...load('flag-like-values', { argv: true }), ...load('traversal', { argv: true }),
    ...load('injection', { argv: true }), ...load('control-chars', { argv: true }), ...load('unicode-whitespace', { argv: true }),
    ...load('format-strings', { argv: true }),
  ].map((e) => e.value)
  values.push('{name}/../../x', '../{name}', '{name}.lock', '/{name}', '{name}/', 'a//{name}', '{name}{name}', '')
  const repo = r.gitRepo({ branches: ['sdlc/run-1'] })
  const bad = []
  for (const v of values) {
    for (const cmd of [['name', '--kind', 'run', '--n', '2'], ['list', '--kind', 'run']]) {
      const t = r.run('branches.py', [cmd[0], '--repo', repo, ...cmd.slice(1), '--format', v])
      assert.equal(t.treeUnchanged, true, JSON.stringify(v))
      if (t.json === undefined || t.json === null) { bad.push([v, 'nojson', t.stderr.slice(0, 200)]); continue }
      assert.ok(t.status === 0 || t.status === 2, JSON.stringify(v))
      if (t.status === 0) {
        const b = t.json.branch
        if (b !== undefined && /(^|\/)\.\.(\/|$)|^-|^\/|\.lock$|\/\/|\s|[\x00-\x1f]/.test(b)) bad.push([v, 'unsafe-accepted', b])
      } else assert.equal(t.json.ok, false)
    }
  }
  assert.deepEqual(bad, [])
})

test('verify security VS-1: NUL in format cannot pass argv', () => {
  const repo = r.gitRepo({})
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', '1', '--format', 'a\0{name}'])
  assert.equal(t.status, null)
  assert.ok(t.spawnError)
  assert.equal(t.treeUnchanged, true)
})

test('verify security VS-1: n with hostile integer forms is refused or exact', () => {
  const repo = r.gitRepo({})
  for (const e of [...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true }), ...load('integer-forms', { argv: true })]) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', e.value])
    assert.equal(t.treeUnchanged, true)
    assert.ok(t.status === 0 || t.status === 2, e.id + ' ' + t.stderr.slice(0, 100))
    if (t.status === 0) assert.match(t.json.branch, /^sdlc\/run--?[0-9]+$/u, e.id)
  }
})

test('verify security VS-3: near misses under sdlc/{name}', () => {
  const none = ['sdlc/feature-x', 'sdlc/run-', 'sdlc/feature-S-002', 'sdlc/s-002', 'sdlc/RUN-1', 'sdlc/m-1', 'sdlc/S-002/', 'sdlc//S-002', 'sdlc/S-', 'sdlc/S002', 'xsdlc/S-002', 'SDLC/S-002', 'sdlc/run-1x', 'sdlc/run--1', 'sdlc/run-1/', 'sdlc/ S-002', 'sdlc/M-', 'sdlc/M-1x', 'sdlc/M-1-e2e-', 'sdlc/state-2026', 'sdlc/S-002 ', 'sdlc/S-００２']
  const hits = none.map((b) => [b, kindOf('sdlc/{name}', b)]).filter(([, k]) => k !== null && k !== undefined)
  assert.deepEqual(hits, [])
})

test('verify security VS-3 (out of scope, characterization): unicode digits parse as run; sdlc/S-002x parses as slice; newline tail parses', () => {
  const digits = load('unicode-digits', { argv: true }).map((e) => 'sdlc/run-' + e.value)
  const hits = digits.map((b) => [b, kindOf('sdlc/{name}', b)]).filter(([, k]) => k)
  assert.ok(hits.length >= 5)
  assert.equal(kindOf('sdlc/{name}', 'sdlc/S-002x'), 'slice')
  assert.equal(kindOf('sdlc/{name}', 'sdlc/run-1\n'), 'run')
  assert.equal(kindOf('sdlc/{name}', 'sdlc/feature-x'), null)
})


test('verify security VS-4: complement and regex-char prefixes', () => {
  const f = 'feature/PROJ-1-{name}'
  const a = parse(f, 'feature/PROJ-1-S-002')
  assert.equal(a.status, 0); assert.equal(a.json.kind, 'slice'); assert.equal(a.json.id, 'S-002')
  assert.equal(kindOf(f, 'feature/PROJ-1-foo'), null)
  assert.equal(kindOf(f, 'feature/PROJ-1-feature/PROJ-1-S-002'), null)
  assert.equal(kindOf(f, 'feature/PROJ-1-'), null)
  assert.equal(kindOf(f, 'feature/PROJX1-S-002'), null)
  assert.equal(kindOf(f, 'feature/proj-1-S-002'), null)
  for (const fmt of ['a.b(c)+/{name}', 'p[1]*/{name}', 'x|y/{name}', 'a^b/{name}', 'a$b/{name}', '(?i){x}/{name}']) {
    const ok = r.run('branches.py', ['parse', '--repo', r.gitRepo({ name: 'q' + Math.random().toString(36).slice(2) }), '--format', fmt, '--branch', 'zzz'])
    assert.ok(ok.status === 0 || ok.status === 2)
    const pre = fmt.replace('{name}', '')
    if (ok.status === 0 || true) {
      const hit = parse(fmt, pre + 'S-002')
      if (hit.status === 0) assert.equal(hit.json.kind, 'slice', fmt)
      const miss = parse(fmt, pre.replace(/[.()+\[\]*|^$?]/g, 'Z') + 'S-002')
      if (miss.status === 0 && pre.replace(/[.()+\[\]*|^$?]/g, 'Z') !== pre) assert.ok(!miss.json.kind, fmt)
    }
  }
  const lower = parse('feature/{name:lower}', 'feature/s-002')
  assert.equal(lower.json.kind, 'slice')
  const rep = parse('feature/PROJ-1-{name}', 'feature/PROJ-1-S-002')
  assert.equal(rep.stderr, '')
  const miss = parse('feature/PROJ-1-{name}', 'main')
  assert.equal(miss.status, 0); assert.equal(miss.stderr, ''); assert.equal(miss.json.kind, null)
})
