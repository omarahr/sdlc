import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const REPO = process.env.VERIFY_REPO
const kit = (f) => import(`${REPO}/skills/sdlc/test/testkit/${f}`)
const { cliRunner } = await kit('cli-runner.mjs')
const { rng, callPython } = await kit('property.mjs')
const { load } = await kit('attack-corpus.mjs')
const BRANCHES = `${REPO}/skills/sdlc/branches.py`
const WRAP = new URL('./wrap.py', import.meta.url).pathname
const COMMON = readFileSync(`${REPO}/skills/sdlc/prompts/_common.md`, 'utf8')
const SEED = Number(process.env.TESTKIT_SEED ?? 20260101)

const bullets = COMMON.split(/\n(?=- )/)
const section = bullets.find((b) => b.startsWith('- **Branch names:**'))
const rows = [...section.matchAll(/^\s*\| `(<[^`]+>)` \| (.+) \|$/gm)].map((m) => ({ ph: m[1], cell: m[2] }))
const EIGHT = ['<run branch>', '<slice branch>', '<milestone branch>', '<e2e branch>', '<e2e area branch>', '<state branch>', '<attempt branch>', '<verify branch>']

test('verify contract: surface lists exactly the eight placeholders once, in the spec order', () => {
  assert.deepEqual(rows.map((r) => r.ph), EIGHT)
  assert.equal(bullets.filter((b) => b.startsWith('- **Branch names:**')).length, 1)
})

test('verify contract: spec cells appear verbatim', () => {
  const cell = (p) => rows.find((r) => r.ph === p).cell
  assert.equal(cell('<run branch>'), 'the branch `config.runBranch` names in `stack` mode; otherwise `branches.py list --kind run`, its last entry')
  assert.equal(cell('<slice branch>'), '`branches.py name --kind slice --id <sliceId>`')
  assert.equal(cell('<verify branch>'), 'the `branch` input your prompt carries')
  assert.ok(section.includes('`branches.py parse --repo . --branch <name>`'))
  assert.ok(/or `null` for a branch that is not the loop's/.test(section))
  assert.ok(section.includes('`config.branchFormat` (default `sdlc/{name}`)'))
  assert.ok(section.includes('Never write such a name by hand.'))
})

const SAMPLE = { sliceId: 'S-007', milestoneId: 'M-3', areaId: 'api', n: '4' }
const fill = (s) => s.replaceAll('<sliceId>', SAMPLE.sliceId).replaceAll('<milestoneId>', SAMPLE.milestoneId).replaceAll('<areaId>', SAMPLE.areaId).replaceAll('<n>', SAMPLE.n)
const nameRows = rows.filter((r) => /^`branches\.py name /.test(r.cell))

test('verify contract: argument names in table commands are accepted by branches.py', () => {
  assert.equal(nameRows.length, 6)
  const accepted = new Set(['--repo', '--kind', '--id', '--n', '--area', '--round', '--profile', '--part', '--format'])
  for (const r of nameRows) for (const f of r.cell.match(/--[a-z]+/g)) assert.ok(accepted.has(f), `${r.ph} uses ${f}`)
})

for (const format of [undefined, 'feature/{name}', 'x-{name:lower}-y']) {
  test(`verify contract: every name command prints a name (format ${format ?? 'default'})`, () => {
    const r = cliRunner()
    const repo = r.gitRepo({ files: format ? { '.sdlc/config.json': { branchFormat: format } } : {} })
    const [pre, suf] = (format ?? 'sdlc/{name}').replace('{name:lower}', '{name}').split('{name}')
    const lower = (format ?? '').includes(':lower')
    const expect = { '<slice branch>': 'S-007', '<milestone branch>': 'M-3', '<e2e branch>': 'M-3-e2e', '<e2e area branch>': 'M-3-e2e-api', '<attempt branch>': 'S-007-attempt-4' }
    for (const row of nameRows) {
      const args = fill(row.cell.replace(/^`branches\.py /, '').replace(/`.*$/, '')).split(' ')
      const t = r.run('branches.py', [args[0], '--repo', repo, ...args.slice(1)])
      assert.equal(t.status, 0, `${row.ph}: ${t.stderr}`)
      assert.equal(t.json.ok, true)
      if (row.ph === '<state branch>') {
        assert.match(t.json.branch, new RegExp(`^${pre.replace(/[/.]/g, '\\$&')}state-\\d{14}${suf}$`))
      } else {
        const e = expect[row.ph]
        assert.equal(t.json.branch, pre + (lower ? e.toLowerCase() : e) + suf, row.ph)
      }
    }
  })
}

test('verify contract: run branch row — list --kind run last entry is newest; none gives empty list', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/run-2', 'sdlc/run-10', 'sdlc/run-9', 'sdlc/S-1', 'other'] })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'run'])
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.branches.map((b) => b.branch), ['sdlc/run-2', 'sdlc/run-9', 'sdlc/run-10'])
  const none = r.run('branches.py', ['list', '--repo', r.gitRepo({ branches: ['sdlc/S-1'] }), '--kind', 'run'])
  assert.equal(none.status, 0)
  assert.deepEqual(none.json.branches, [])
})

test('verify contract: verify branch row has no name call; name for kind verify needs round, profile and part', () => {
  const idx = COMMON.indexOf('**Branch names:**')
  assert.ok(!/branches\.py name[^\n]*--kind verify/.test(COMMON))
  assert.ok(!/--kind verify/.test(COMMON))
  const r = cliRunner()
  const repo = r.gitRepo({})
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify'])
  assert.notEqual(t.status, 0)
  assert.ok(idx > 0)
})

test('verify contract: parse classifies loop branches, prints null for foreign and hostile names', () => {
  const r = cliRunner()
  const repo = r.gitRepo({})
  const k = (b) => r.run('branches.py', ['parse', '--repo', repo, '--branch', b])
  assert.equal(k('sdlc/S-007').json.kind, 'slice')
  assert.equal(k('sdlc/run-3').json.kind, 'run')
  assert.equal(k('main').json.kind, null)
  assert.equal(k('feature/foo').json.kind, null)
  const t = k('main')
  assert.ok(t.stdout.includes('"kind": null'))
})

test('verify contract: parse on attack corpus never crashes and never invents a loop kind outside sdlc/', () => {
  const r = cliRunner()
  const repo = r.gitRepo({})
  const fams = ['flag-like-values', 'traversal', 'control-chars', 'unicode-confusables', 'unicode-whitespace', 'injection', 'format-strings', 'oversized']
  let n = 0
  for (const fam of fams) for (const e of load(fam, { argv: true })) {
    n++
    const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', e.value])
    assert.ok(t.status === 0 || t.status === 2, `${e.id} status ${t.status}`)
    assert.ok(!/Traceback/.test(t.stderr), e.id)
    if (t.status === 0 && !e.value.startsWith('sdlc/')) assert.equal(t.json.kind, null, e.id)
  }
  console.log(`attack parse cases=${n}`)
})

function gen(R) {
  const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
  const word = () => Array.from({ length: R.int(1, 8) }, () => R.pick([...alpha])).join('')
  const fmt = R.pick(['sdlc/{name}', 'feature/{name}', '{name}', 'a/b-{name:lower}-z', 'p_{name}_s'])
  const sid = 'S-' + word(), mid = 'M-' + R.int(1, 999)
  return { fmt, sid, mid, area: word(), n: R.int(0, 100000) }
}
const model = (fmt, tail) => {
  const lower = fmt.includes('{name:lower}')
  const [p, s] = fmt.replace('{name:lower}', '{name}').split('{name}')
  return p + (lower ? tail.toLowerCase() : tail) + s
}

test('verify contract: property — name matches the reference model and parse round-trips (>=1000 runs)', () => {
  const RUNS = 1000
  const R = rng(SEED)
  const inputs = Array.from({ length: RUNS }, () => gen(R))
  const kinds = [
    ['slice', (g) => ({ id: g.sid }), (g) => g.sid],
    ['milestone', (g) => ({ id: g.mid }), (g) => g.mid],
    ['e2e', (g) => ({ id: g.mid }), (g) => `${g.mid}-e2e`],
    ['e2e-area', (g) => ({ id: g.mid, area: g.area }), (g) => `${g.mid}-e2e-${g.area}`],
    ['attempt', (g) => ({ id: g.sid, n: g.n }), (g) => `${g.sid}-attempt-${g.n}`],
    ['run', (g) => ({ n: g.n }), (g) => `run-${g.n}`],
  ]
  let bad = []
  for (const [kind, parts, tail] of kinds) {
    const res = callPython(WRAP, 'byname', inputs.map((g) => [g.fmt, kind, parts(g), BRANCHES]))
    res.forEach((x, i) => { const exp = model(inputs[i].fmt, tail(inputs[i])); if (x.outcome !== 'return' || x.value !== exp) bad.push({ kind, in: inputs[i], x, exp }) })
    const names = res.map((x, i) => x.value ?? '')
    const back = callPython(WRAP, 'parsed', names.map((nm, i) => [inputs[i].fmt, nm, BRANCHES]))
    back.forEach((x, i) => { if (x.outcome !== 'return' || !x.value || x.value.kind !== kind) bad.push({ roundtrip: kind, in: inputs[i], x }) })
  }
  console.log(`property-run seed=${SEED} runs=${RUNS} kinds=${kinds.length} violations=${bad.length}`)
  if (bad.length) console.log(JSON.stringify(bad.slice(0, 3)))
  assert.equal(bad.length, 0)
})

test('verify contract: determinism and no mutation', () => {
  const r = cliRunner()
  const repo = r.gitRepo({})
  const a = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1'])
  const b = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1'])
  assert.equal(a.stdout, b.stdout)
  assert.equal(a.treeUnchanged, true)
})

test('verify contract: STE check passes on _common.md and neighbouring bullets are unchanged', () => {
  const t = spawnSync('python3', [`${REPO}/skills/sdlc/ste-check.py`, `${REPO}/skills/sdlc/prompts/_common.md`], { encoding: 'utf8' })
  console.log(`ste-check exit=${t.status} ${t.stdout.trim().slice(0, 300)} ${t.stderr.trim().slice(0, 300)}`)
  assert.equal(t.status, 0)
  const base = spawnSync('git', ['-C', REPO, 'show', 'main:skills/sdlc/prompts/_common.md'], { encoding: 'utf8' }).stdout
  const bb = base.split('\n').filter((l) => l.trim())
  const nn = COMMON.split('\n').filter((l) => l.trim())
  const added = nn.filter((l) => !bb.includes(l))
  assert.equal(bb.filter((l) => !nn.includes(l)).length, 0, 'no old line removed or changed')
  assert.equal(added.length, 12)
  const names = bullets.filter((b) => b.startsWith('- ')).map((b) => b.slice(0, 20))
  assert.ok(names.some((x) => x.startsWith('- **Long commands:**')))
  assert.ok(section.split('\n').every((l) => l === '' || l.startsWith('  ') || l.startsWith('- ')))
})
