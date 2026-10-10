import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const WT = process.env.VERIFY_WT
const kit = (f) => import(join(WT, 'skills/sdlc/test/testkit', f))
const { rng, defaultSeed, callPython, BRANCHES } = await kit('property.mjs')
const { cliRunner } = await kit('cli-runner.mjs')

const text = readFileSync(join(WT, 'skills/sdlc/prompts/_common.md'), 'utf8')
const rows = [...text.matchAll(/^\s*\| (`<[^`]+>`) \| (.+) \|\s*$/gm)].map((m) => ({ ph: m[1].slice(1, -1), cmd: m[2] }))
const row = (ph) => rows.find((r) => r.ph === ph)

const SPEC = {
  '<milestone branch>': '`branches.py name --kind milestone --id <milestoneId>`',
  '<e2e branch>': '`branches.py name --kind e2e --id <milestoneId>`',
  '<e2e area branch>': '`branches.py name --kind e2e-area --id <milestoneId> --area <areaId>`',
  '<state branch>': '`branches.py name --kind state` (it makes the timestamp)',
  '<attempt branch>': '`branches.py name --kind attempt --id <sliceId> --n <n>`',
}

test('verify contract: surface lists exactly eight placeholders', () => {
  console.log(rows.map((r) => `${r.ph} | ${r.cmd}`).join('\n'))
  assert.deepEqual(rows.map((r) => r.ph), ['<run branch>', '<slice branch>', '<milestone branch>', '<e2e branch>', '<e2e area branch>', '<state branch>', '<attempt branch>', '<verify branch>'])
})

for (const [ph, cmd] of Object.entries(SPEC)) {
  test(`verify contract: ${ph} row equals spec cell verbatim`, () => {
    assert.equal(row(ph).cmd, cmd)
  })
}

const model = (kind, p, lower) => {
  const t = { milestone: p.id, e2e: `${p.id}-e2e`, 'e2e-area': `${p.id}-e2e-${p.area}`, attempt: `${p.id}-attempt-${p.n}` }[kind]
  return 'sdlc/' + (lower ? t.toLowerCase() : t)
}
const alnum = 'abcXYZ019-'
const gen = (r) => {
  const word = (n) => Array.from({ length: r.int(1, n) }, () => alnum[r.int(0, alnum.length - 1)]).join('')
  const kind = r.pick(['milestone', 'e2e', 'e2e-area', 'attempt'])
  const p = { id: kind === 'attempt' ? `S-${word(6)}` : `M-${r.int(1, 99999)}`, area: word(10), n: r.int(1, 1e9) }
  return { kind, p, lower: r.bool() }
}

const PY = `
import json, sys, importlib.util
spec = importlib.util.spec_from_file_location("b", sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
out = []
for fmt, kind, parts in json.load(sys.stdin):
    try: out.append({"ok": m.name(fmt, kind, **parts)})
    except m.Fail as e: out.append({"fail": str(e)})
    except BaseException as e: out.append({"crash": repr(e)})
print(json.dumps(out))
`
const callName = (calls) => JSON.parse(spawnSync('python3', ['-I', '-c', PY, BRANCHES], { input: JSON.stringify(calls), encoding: 'utf8', maxBuffer: 1 << 28 }).stdout)

test('verify contract: name() matches a reference model from the spec (property-run)', () => {
  const seed = defaultSeed(), r = rng(seed), runs = 2000
  const inputs = Array.from({ length: runs }, () => gen(r))
  const out = callName(inputs.map((i) => [i.lower ? 'sdlc/{name:lower}' : 'sdlc/{name}', i.kind, i.p]))
  const bad = []
  out.forEach((o, k) => { const want = model(inputs[k].kind, inputs[k].p, inputs[k].lower); if (o.ok !== want) bad.push({ in: inputs[k], want, got: o }) })
  console.log(`property-run seed=${seed} runs=${runs} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: kinds differ: e2e vs e2e-area vs milestone, deterministic', () => {
  const a = callName([['sdlc/{name}', 'e2e', { id: 'M-3' }], ['sdlc/{name}', 'e2e-area', { id: 'M-3', area: 'api' }], ['sdlc/{name}', 'milestone', { id: 'M-3' }], ['sdlc/{name}', 'e2e', { id: 'M-3' }]])
  console.log(JSON.stringify(a))
  assert.equal(new Set(a.slice(0, 3).map((x) => x.ok)).size, 3)
  assert.deepEqual(a[0], a[3])
})

test('verify contract: missing parts and bad kinds are refused with Fail, never crash', () => {
  const out = callName([
    ['sdlc/{name}', 'e2e-area', { id: 'M-1' }], ['sdlc/{name}', 'e2e-area', { id: 'M-1', area: '' }], ['sdlc/{name}', 'attempt', { id: 'S-1' }],
    ['sdlc/{name}', 'milestone', {}], ['sdlc/{name}', 'nope', { id: 'M-1' }], ['sdlc/{name}', 'e2e', { id: 'M-1', area: 'x' }],
  ])
  console.log(JSON.stringify(out))
  assert.ok(out.slice(0, 5).every((o) => o.fail), 'first five refused')
  assert.equal(out[5].ok, 'sdlc/M-1-e2e')
  assert.ok(!out.some((o) => o.crash))
})

test('verify contract: state name takes no id, has a 14-digit timestamp, parses back', () => {
  const out = callName([['sdlc/{name}', 'state', {}], ['sdlc/{name}', 'state', {}]])
  console.log(JSON.stringify(out))
  for (const o of out) assert.match(o.ok, /^sdlc\/state-\d{14}$/)
})

test('verify contract: documented commands run through the consumer CLI (all five kinds), exit 0 and ok', () => {
  const run = cliRunner()
  const repo = run.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}' } } })
  const argvOf = (cmd) => cmd.match(/`([^`]+)`/)[1].split(' ').slice(1).map((a) => ({ '<milestoneId>': 'M-7', '<areaId>': 'api-v2', '<sliceId>': 'S-012', '<n>': '2' })[a] ?? a)
  const got = {}
  for (const ph of Object.keys(SPEC)) {
    const t = run.run('branches.py', [...argvOf(row(ph).cmd), '--repo', repo])
    console.log(ph, t.status, t.stdout.trim())
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    got[ph] = t.json.branch
  }
  assert.deepEqual(got, {
    '<milestone branch>': 'sdlc/M-7', '<e2e branch>': 'sdlc/M-7-e2e', '<e2e area branch>': 'sdlc/M-7-e2e-api-v2',
    '<state branch>': got['<state branch>'], '<attempt branch>': 'sdlc/S-012-attempt-2',
  })
  assert.match(got['<state branch>'], /^sdlc\/state-\d{14}$/)
  const noArea = run.run('branches.py', ['name', '--kind', 'e2e-area', '--id', 'M-7', '--repo', repo])
  console.log('no area', noArea.status, noArea.stdout.trim())
  assert.notEqual(noArea.status, 0)
  assert.equal(noArea.json?.ok, false)
  for (const n of ['0', '-1', 'abc', '99999999999999999999999']) {
    const t = run.run('branches.py', ['name', '--kind', 'attempt', '--id', 'S-012', '--n', n, '--repo', repo])
    console.log('n=' + n, t.status, t.stdout.trim().slice(0, 200))
  }
})
