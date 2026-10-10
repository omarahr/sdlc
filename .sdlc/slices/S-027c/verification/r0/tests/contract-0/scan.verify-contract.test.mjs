import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.env.VERIFY_ROOT
const REPO = process.env.VERIFY_REPO
const SKILL = join(ROOT, 'skills/sdlc')
const PROMPTS = join(SKILL, 'prompts')
const RX = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/
const files = () => [...readdirSync(PROMPTS).filter(f => f.endsWith('.md')).map(f => [`prompts/${f}`, readFileSync(join(PROMPTS, f), 'utf8')]), ['SKILL.md', readFileSync(join(SKILL, 'SKILL.md'), 'utf8')]]
const rd = n => readFileSync(join(PROMPTS, `${n}.md`), 'utf8')

function fencedBlocks(text) {
  const lines = text.split('\n'); const out = []; let open = null
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(```+|~~~+)/)
    if (!m) { if (open) open.body.push(l); else out.push({ fenced: false, line: i + 1, body: [l] }); return }
    if (!open) open = { fenced: true, marker: m[1][0], len: m[1].length, line: i + 1, body: [] }
    else if (m[1][0] === open.marker && m[1].length >= open.len) { out.push(open); open = null }
    else open.body.push(l)
  })
  if (open) out.push({ ...open, unclosed: true })
  return out
}

test('verify contract VS-3: independent line-based scan, fenced blocks only exempt when they quote branches.py', () => {
  const fs = files()
  assert.ok(fs.length > 20, `read ${fs.length} files`)
  const bad = []; const exempt = []
  for (const [name, text] of fs) {
    for (const b of fencedBlocks(text)) {
      const hits = b.body.filter(l => RX.test(l))
      if (!hits.length) continue
      if (b.fenced && !b.unclosed && b.body.join('\n').includes('branches.py')) exempt.push([name, b.line, hits])
      else bad.push([name, b.line, hits])
    }
  }
  console.log(`files=${fs.length} exempt=${JSON.stringify(exempt)} bad=${JSON.stringify(bad)}`)
  assert.deepEqual(bad, [])
})

test('verify contract VS-3: scan with no fence exemption at all', () => {
  const hits = files().flatMap(([n, t]) => t.split('\n').map((l, i) => RX.test(l) ? `${n}:${i + 1}` : null).filter(Boolean))
  console.log('rawhits=' + JSON.stringify(hits))
  assert.deepEqual(hits, [])
})

test('verify contract VS-3: pattern inputs', () => {
  assert.match('git checkout sdlc/S-001', RX)
  for (const s of ['.sdlc/slices', 'x.sdlc/y', 'sdlc/tracker', 'sdlc/STOP', 'sdlc/{name}', 'mysdlc/x', '$TMPDIR/sdlc-S-1', 'origin/sdlc-x']) assert.doesNotMatch(s, RX, s)
  for (const s of ['origin/sdlc/S-1', 'refs/heads/sdlc/run-1', '`sdlc/<id>`', '(sdlc/M-1)']) assert.match(s, RX, s)
})

test('verify contract VS-1: every table row holds its placeholders and no literal', () => {
  const rows = {
    'commit-state': ['<slice branch>', '<run branch>', '<milestone branch>', '<state branch>', '<e2e branch>'],
    integrator: ['<slice branch>', '<run branch>'],
    'milestone-writer': ['<e2e area branch>', '<e2e branch>', '<milestone branch>'],
    escalator: ['<slice branch>', '<attempt branch>', '<run branch>'],
    'env-detector': ['<run branch>'],
    'state-writer': ['<slice branch>', '<attempt branch>'],
    'e2e-harness': ['<e2e branch>', '<milestone branch>'],
    'scenario-runner': ['<e2e area branch>', '<e2e branch>'],
    slicer: ['<slice branch>'], 'state-schema': ['<slice branch>'], 'verify-collector': ['<verify branch>', '<slice branch>'],
  }
  for (const f of 'implementer test-writer test-checker planner verifier verify-planner verify-toolsmith test-reporter gate finding-refuter verify-profile-common state-reader'.split(' ')) rows[f] = ['<slice branch>']
  for (const [f, ps] of Object.entries(rows)) { const t = rd(f); for (const p of ps) assert.ok(t.includes(p), `${f} lacks ${p}`) }
  assert.ok(Object.keys(rows).length >= 23)
})

test('verify contract VS-2: extra literals', () => {
  const c = rd('commit-state')
  assert.ok(c.includes('<e2e branch>') && c.includes('<state branch>'))
  assert.doesNotMatch(c, /(?<![.\w])sdlc\/(<milestoneId>-e2e|state-|run-|M-|<)/)
  assert.match(rd('escalator'), /scratch branch named like <slice branch> with -spike added/)
  assert.doesNotMatch(rd('escalator'), RX)
  const sk = readFileSync(join(SKILL, 'SKILL.md'), 'utf8')
  assert.doesNotMatch(sk, /sdlc\/(run-|M-)/)
  assert.ok(sk.includes('sdlc/{name}'))
  assert.ok(rd('state-schema').includes('sdlc/{name}'))
  for (const f of ['verify-toolsmith', 'test-reporter', 'state-reader', 'verify-collector']) assert.doesNotMatch(rd(f), RX)
})

function shippedStrip() {
  const src = readFileSync(join(SKILL, 'test/prompts.test.mjs'), 'utf8')
  const m = src.match(/function stripBranchesOutput\(text\) \{[\s\S]*?\n\}/)
  return new Function(`${m[0]}; return stripBranchesOutput`)()
}

test('verify contract VS-4: shipped scan helper at fence boundaries', () => {
  const strip = shippedStrip()
  const scan = t => RX.test(strip(t))
  const out = '```\n$ branches.py name --kind slice --id S-1\n{"branch": "sdlc/S-1"}\n```\n'
  assert.equal(scan(out), false, 'branches.py output block is exempt')
  assert.equal(scan(out + 'run git checkout sdlc/S-1\n'), true, 'unfenced literal next to exempt block fails')
  assert.equal(scan('text sdlc/S-1\n' + out), true)
  assert.equal(scan('```\nplain\nsdlc/S-1\n```\n'), true, 'fenced block not quoting branches.py is not exempt')
  assert.equal(scan('~~~\nbranches.py\nsdlc/S-1\n~~~\n'), true, 'tilde fence is not exempt (strict)')
  assert.equal(scan('```\nbranches.py\nsdlc/S-1\n'), true, 'unclosed fence is not exempt')
  assert.equal(scan('use `sdlc/S-1` here'), true, 'inline span fails')
  assert.equal(scan(''), false)
  const gap = '```\nbranches.py name\n```\nsdlc/S-1\n```\nx\n```\n'
  assert.equal(scan(gap), true, 'literal between two blocks fails')
})

test('verify contract VS-4: shipped helper exempts a hand-written literal inside a block that merely mentions branches.py', () => {
  const strip = shippedStrip()
  const doc = '```\npython3 branches.py name\ngit checkout sdlc/S-001\n```\n'
  console.log('weak-exemption leaks=' + !RX.test(strip(doc)))
  assert.equal(RX.test(strip(doc)), false)
})

test('verify contract VS-4: property, seeded, 1500 runs against a reference model', async () => {
  const { rng, defaultSeed } = await import(join(REPO, 'skills/sdlc/test/testkit/property.mjs'))
  const seed = defaultSeed(); const r = rng(seed); const strip = shippedStrip(); const runs = 1500
  const lit = ['sdlc/S-001', 'sdlc/run-1', 'sdlc/M-2', 'x sdlc/<id>']
  const safe = ['.sdlc/slices', 'sdlc/tracker', 'sdlc/STOP', 'sdlc/{name}', 'plain']
  let fails = 0, shrunk = null
  for (let i = 0; i < runs; i++) {
    const parts = []; let expect = false
    const n = r.int(1, 6)
    for (let k = 0; k < n; k++) {
      const kind = r.int(0, 3)
      if (kind === 0) parts.push(r.pick(safe))
      else if (kind === 1) { parts.push(r.pick(lit)); expect = true }
      else if (kind === 2) parts.push('```\nbranches.py name\n{"branch": "' + r.pick(lit) + '"}\n```')
      else parts.push('```\nno helper\n' + r.pick(safe) + '\n```')
    }
    const doc = parts.join('\n')
    if (RX.test(strip(doc)) !== expect) { fails++; shrunk ??= doc }
  }
  console.log(`property-run seed=${seed} runs=${runs} failures=${fails} counterexample=${JSON.stringify(shrunk)}`)
  assert.equal(fails, 0)
})

test('verify contract VS-6: ste-check passes on every prompt', () => {
  const r = spawnSync('python3', [join(SKILL, 'ste-check.py'), ...readdirSync(PROMPTS).filter(f => f.endsWith('.md')).map(f => join(PROMPTS, f))], { encoding: 'utf8' })
  console.log(r.status, r.stdout.slice(0, 600), r.stderr.slice(0, 300))
  assert.equal(r.status, 0)
})
