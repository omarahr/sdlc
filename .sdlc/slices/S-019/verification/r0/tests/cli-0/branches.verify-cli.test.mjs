import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, writeFileSync } from 'node:fs'
import { cliRunner } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-019-v0-cli-0/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-019-v0-cli-0/skills/sdlc/test/testkit/attack-corpus.mjs'

const LOG = process.env.VERIFY_LOG
const rec = (id, t) => { if (LOG) appendFileSync(LOG, `### ${id}\n${t.text()}\n\n`) }
const r = cliRunner()
const names = (t) => t.json.branches.map((b) => b.branch)

test('verify cli VS-1: first run names run-1 on a repo with no run branch', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001', 'sdlc/feature-x'] })
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run']); rec('TC-cli-1 list', l)
  assert.equal(l.status, 0); assert.deepEqual(l.json.branches, [])
  const n = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', String(l.json.branches.length + 1)]); rec('TC-cli-1 name', n)
  assert.equal(n.status, 0); assert.equal(n.json.branch, 'sdlc/run-1'); assert.equal(n.treeUnchanged, true)
})

test('verify cli VS-1: count 1 and 3 give n+1; custom format; older format not counted', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-1', 'sdlc/run-2', 'sdlc/run-3', 'old/run-9', 'sdlc/S-001'] })
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run']); rec('TC-cli-2 list default', l)
  assert.deepEqual(names(l), ['sdlc/run-1', 'sdlc/run-2', 'sdlc/run-3'])
  const n = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', '4']); rec('TC-cli-2 name', n)
  assert.equal(n.json.branch, 'sdlc/run-4')
  const one = r.gitRepo({ branches: ['sdlc/run-1'] })
  assert.equal(r.run('branches.py', ['list', '--repo', one, '--kind', 'run']).json.branches.length, 1)
  const fmt = 'feature/PROJ-1-{name}'
  const c = r.gitRepo({ branches: ['feature/PROJ-1-run-1', 'feature/PROJ-1-run-2', 'sdlc/run-7', 'feature/PROJ-1-S-002'] })
  const lc = r.run('branches.py', ['list', '--repo', c, '--kind', 'run', '--format', fmt]); rec('TC-cli-2 list custom', lc)
  assert.deepEqual(names(lc), ['feature/PROJ-1-run-1', 'feature/PROJ-1-run-2'])
  const nc = r.run('branches.py', ['name', '--repo', c, '--kind', 'run', '--n', '3', '--format', fmt]); rec('TC-cli-2 name custom', nc)
  assert.equal(nc.json.branch, 'feature/PROJ-1-run-3')
  const cfg = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } }, branches: ['feature/PROJ-1-run-1'] })
  assert.equal(r.run('branches.py', ['name', '--repo', cfg, '--kind', 'run', '--n', '2']).json.branch, 'feature/PROJ-1-run-2')
})

test('verify cli VS-1: hostile --format values fail clearly with no tree change', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-1'] })
  const values = ['--upload-pack=x', '-x{name}', '../{name}', '{name}/../..', '{name}{name}', '', 'sdlc/{name} x', 'a{b}{name}', '{', 'sdlc/{name}.lock', 'sdlc/{name}..x', 'x~{name}', ...load('flag-like-values', { argv: true }).map((e) => e.value), ...load('traversal', { argv: true }).map((e) => e.value)]
  const out = []
  for (const v of values) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', '2', '--format=' + v]); rec('TC-cli-3 name ' + JSON.stringify(v), t)
    assert.equal(t.treeUnchanged, true, `tree changed for ${JSON.stringify(v)}`)
    assert.ok(!/Traceback/.test(t.stderr), `traceback for ${JSON.stringify(v)}: ${t.stderr}`)
    out.push([v, t.status, t.json && t.json.branch])
    if (t.status === 0) assert.ok(t.json.branch.includes('run-2'), JSON.stringify(v))
  }
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run', '--format=--bad']); rec('TC-cli-3 list flag-like', l)
  assert.ok(!/Traceback/.test(l.stderr)); assert.equal(l.treeUnchanged, true)
  const nul = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', '2', '--format', 'a\0{name}']); rec('TC-cli-3 nul', nul)
  assert.equal(nul.status, null); assert.equal(nul.treeUnchanged, true)
  writeFileSync(process.env.VERIFY_LOG + '.hostile.json', JSON.stringify(out, null, 1))
})

test('verify cli VS-2: last list entry is the highest n, numeric order above 9', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-2', 'sdlc/run-10', 'sdlc/run-9', 'sdlc/run-100', 'sdlc/run-11', 'sdlc/run-1'] })
  const before = r.exec('git', ['-C', repo, 'branch', '--list'])
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run']); rec('TC-cli-4 list', l)
  assert.deepEqual(names(l), ['sdlc/run-1', 'sdlc/run-2', 'sdlc/run-9', 'sdlc/run-10', 'sdlc/run-11', 'sdlc/run-100'])
  assert.equal(l.json.branches.at(-1).branch, 'sdlc/run-100')
  assert.equal(l.treeUnchanged, true)
  const after = r.exec('git', ['-C', repo, 'branch', '--list'])
  assert.equal(before.stdout, after.stdout)
  const nm = r.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', String(l.json.branches.at(-1).n)]); rec('TC-cli-4 name', nm)
  assert.equal(nm.json.branch, 'sdlc/run-100')
})

test('verify cli VS-2: no run branch gives an empty list; non-repo fails cleanly; zero padding and lower format', () => {
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run']); rec('TC-cli-5 empty', l)
  assert.equal(l.status, 0); assert.deepEqual(l.json.branches, [])
  const bad = r.run('branches.py', ['list', '--repo', r.dir('notrepo'), '--kind', 'run']); rec('TC-cli-5 notrepo', bad)
  assert.notEqual(bad.status, 0); assert.ok(!/Traceback/.test(bad.stderr))
  const pad = r.gitRepo({ branches: ['sdlc/run-07', 'sdlc/run-7', 'sdlc/run-8'] })
  const lp = r.run('branches.py', ['list', '--repo', pad, '--kind', 'run']); rec('TC-cli-5 padded', lp)
  assert.equal(lp.status, 0); assert.equal(lp.json.branches.at(-1).branch, 'sdlc/run-8')
  const low = r.gitRepo({ branches: ['Sdlc/RUN-3', 'sdlc/run-2'] })
  const ll = r.run('branches.py', ['list', '--repo', low, '--kind', 'run', '--format', 'sdlc/{name:lower}']); rec('TC-cli-5 lower', ll)
  assert.equal(ll.status, 0)
})

const parse = (fmt, branch, extra = []) => { const repo = r.gitRepo(); const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', branch, '--format', fmt, ...extra]); return t }

test('verify cli VS-3: user branches outside the loop kinds print no kind', () => {
  for (const b of ['sdlc/feature-x', 'sdlc/', 'sdlc/run-', 'sdlc/feature-S-002', 'sdlc/s-002', 'sdlc/S-', 'sdlc/S-002/', 'sdlc/run-1/', 'sdlc/run-x', 'sdlc/M-', 'sdlc/m-1', 'sdlc/RUN-1', 'xsdlc/S-002', 'main', 'sdlc/sdlc/S-002']) {
    const t = parse('sdlc/{name}', b); rec('TC-cli-6 ' + b, t)
    assert.equal(t.status, 0, b); assert.equal(t.json.kind, null, `${b} parsed as ${t.json.kind}`); assert.equal(t.stderr, ''); assert.equal(t.treeUnchanged, true)
  }
})

test('verify cli VS-3: near misses that may parse by accident are recorded', () => {
  const rows = []
  for (const b of ['sdlc/S-002x', 'sdlc/S-002\n', 'sdlc/run-٣', 'sdlc/run-1\n', 'sdlc/M-1\n', 'sdlc/S-٣', 'sdlc/S-002 ', 'sdlc/M-1-e2e-', 'sdlc/state-1']) {
    const t = parse('sdlc/{name}', b); rec('TC-cli-7 ' + JSON.stringify(b), t)
    rows.push([b, t.status, t.json && t.json.kind, t.json && t.json.id])
  }
  writeFileSync(process.env.VERIFY_LOG + '.near.json', JSON.stringify(rows, null, 1))
  const real = rows.filter(([b, , kind]) => kind && b.endsWith(' '))
  assert.deepEqual(real, [])
})

test('verify cli VS-3: the default format and the config format are applied the same way', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}' } } })
  const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/feature-x']); rec('TC-cli-8 cfg', t)
  assert.equal(t.json.kind, null)
  const u = r.run('branches.py', ['parse', '--repo', r.gitRepo(), '--branch', 'sdlc/feature-x']); rec('TC-cli-8 default', u)
  assert.equal(u.json.kind, null)
})

test('verify cli VS-4: a branch that parses as a slice gives kind slice and id', () => {
  const fmt = 'feature/PROJ-1-{name}'
  const t = parse(fmt, 'feature/PROJ-1-S-002'); rec('TC-cli-9 slice', t)
  assert.equal(t.status, 0); assert.equal(t.json.kind, 'slice'); assert.equal(t.json.id, 'S-002'); assert.equal(t.stderr, '')
  const f = parse(fmt, 'feature/PROJ-1-foo'); rec('TC-cli-9 foo', f)
  assert.equal(f.status, 0); assert.equal(f.json.kind, null)
  const o = parse(fmt, 'feature/PROJ-2-S-002'); rec('TC-cli-9 other', o)
  assert.equal(o.json.kind, null)
  const rep = parse(fmt, 'feature/PROJ-1-feature/PROJ-1-S-002'); rec('TC-cli-9 repeated', rep)
  assert.equal(rep.status, 0); assert.equal(rep.json.kind, null)
  const rep2 = parse(fmt, 'feature/PROJ-1-S-002-feature/PROJ-1-S-003'); rec('TC-cli-9 repeated2', rep2)
  assert.equal(rep2.status, 0)
})

test('verify cli VS-4: a prefix with regex characters is taken literally', () => {
  for (const [fmt, ok, bad] of [['a.b+c(x)/{name}', 'a.b+c(x)/S-002', 'aXb+c(x)/S-002'], ['(a|b)$/{name}', '(a|b)$/S-002', 'a/S-002'], ['p.d+/{name}', 'p.d+/S-002', 'pxd/S-002'], ['pre-{name}-post', 'pre-S-002-post', 'pre-S-002-pos']]) {
    const g = parse(fmt, ok); rec('TC-cli-10 ' + fmt, g)
    assert.equal(g.status, 0, g.stderr); assert.equal(g.json.kind, 'slice'); assert.equal(g.json.id, 'S-002')
    const b = parse(fmt, bad); assert.equal(b.status, 0); assert.equal(b.json.kind, null, `${bad} matched ${fmt}`)
  }
  const low = parse('Feat/{name:lower}', 'FEAT/s-002'); rec('TC-cli-10 lower', low)
  assert.equal(low.status, 0); assert.equal(low.json.kind, 'slice')
})

test('verify cli VS-4: exit codes and stderr are stable on bad input', () => {
  const repo = r.gitRepo()
  const cases = [['parse', '--repo', repo], ['parse', '--branch', 'x'], ['parse', '--repo', repo, '--branch', 'x', '--format', 'nofmt'], ['parse', '--repo', repo, '--branch', 'x', '--format', '{name}{name}'], ['parse', '--repo', '/nonexistent/zz', '--branch', 'sdlc/S-1']]
  for (const a of cases) {
    const t1 = r.run('branches.py', a), t2 = r.run('branches.py', a); rec('TC-cli-11 ' + a.join(' '), t1)
    assert.equal(t1.status, t2.status); assert.equal(t1.stderr, t2.stderr); assert.ok(!/Traceback/.test(t1.stderr), t1.stderr)
  }
  const bad = r.run('branches.py', cases[2]); assert.notEqual(bad.status, 0)
  const flag = r.run('branches.py', ['parse', '--repo', repo, '--branch', '--format=x']); rec('TC-cli-11 flag-like branch', flag)
  assert.ok(!/Traceback/.test(flag.stderr))
  for (const e of load('flag-like-values', { argv: true })) {
    const t = r.run('branches.py', ['parse', '--repo', repo, '--branch=' + e.value]); rec('TC-cli-11 branch=' + e.id, t)
    assert.ok(!/Traceback/.test(t.stderr), e.id); assert.equal(t.treeUnchanged, true)
  }
})
