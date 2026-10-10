import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const WT = process.env.VERIFY_WT
const TK = `${WT}/skills/sdlc/test/testkit`
const { rng, defaultSeed } = await import(`${TK}/property.mjs`)
const { cliRunner } = await import(`${TK}/cli-runner.mjs`)

const LOOP = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/
const strip = (t) => t.replace(/```[^\n]*\n[\s\S]*?```/g, b => (b.includes('branches.py') ? '' : b))
const prompt = (n) => readFileSync(join(WT, 'skills/sdlc/prompts', `${n}.md`), 'utf8')
const NAMED = [/sdlc\/<id>/, /sdlc\/run-<n>/, /sdlc\/<id>-attempt-\*/]
const SEED = defaultSeed()
const RUNS = 1200
const log = (m) => console.log(`property-run ${m} seed=${SEED} runs=${RUNS}`)

const LITERALS = ['sdlc/S-001', 'sdlc/S-1', 'sdlc/S-035a', 'sdlc/S-fix-M-1-2', 'sdlc/run-3', 'sdlc/run-<n>', 'sdlc/<id>', 'sdlc/<id>-attempt-*', 'sdlc/S-001-attempt-1', 'sdlc/S-001-spike', 'refs/heads/sdlc/S-1', 'origin/sdlc/S-1', 'sdlc/m-1']
const WRAPS = [s => s, s => `\`${s}\``, s => `| ${s} | x |`, s => `"${s}"`, s => `(${s})`, s => `\`\`\`\n${s}\n\`\`\`\n`, s => `**${s}**`]
const SAFE = ['.sdlc/slices/S-1', '.sdlc/STOP', 'sdlc/tracker', 'sdlc/STOP', 'sdlc/{name}', 'my_sdlc/x']

function insertAt(text, snippet, r) {
  const lines = text.split('\n')
  const i = r.int(0, lines.length)
  lines.splice(i, 0, snippet)
  return lines.join('\n')
}

for (const [file, req] of [['integrator', 'R-143'], ['escalator', 'R-145'], ['state-writer', 'R-147']]) {
  test(`verify contract: ${file}.md has no literal and an injected literal is always caught (${req})`, () => {
    const base = strip(prompt(file))
    assert.doesNotMatch(base, LOOP)
    const r = rng(SEED)
    let caught = 0
    for (let i = 0; i < RUNS; i++) {
      const lit = r.pick(LITERALS)
      const wrapped = r.pick(WRAPS)(lit)
      if (/```/.test(wrapped) && r.bool()) continue
      const mutated = strip(insertAt(prompt(file), wrapped, r))
      assert.match(mutated, LOOP, `not caught: ${JSON.stringify(wrapped)}`)
      caught++
    }
    for (let i = 0; i < 300; i++) {
      const safe = r.pick(SAFE)
      assert.doesNotMatch(strip(insertAt(prompt(file), safe, r)), LOOP, `false positive: ${safe}`)
    }
    log(`${file} mutation caught=${caught}`)
  })
}

test('verify contract: integrator.md names the required placeholders and the NAMED literals are caught by T-R-143', () => {
  const text = strip(prompt('integrator'))
  for (const p of ['<slice branch>', '<run branch>']) assert.ok(text.includes(p))
  for (const l of NAMED) assert.doesNotMatch(text, l)
  const r = rng(SEED)
  for (let i = 0; i < RUNS; i++) {
    const lit = r.pick(['sdlc/<id>', 'sdlc/run-<n>', 'sdlc/<id>-attempt-*'])
    const m = strip(insertAt(prompt('integrator'), r.pick(WRAPS.slice(0, 5))(lit), r))
    assert.ok(NAMED.some(n => n.test(m)), `NAMED missed ${lit}`)
  }
  log('integrator NAMED mutation')
})

test('verify contract: placeholders are required (removing one is detectable)', () => {
  for (const [f, ps] of [['integrator', ['<slice branch>', '<run branch>']], ['escalator', ['<slice branch>', '<attempt branch>', '<run branch>']], ['state-writer', ['<slice branch>', '<attempt branch>']]]) {
    const t = strip(prompt(f))
    for (const p of ps) { assert.ok(t.includes(p), `${f} lacks ${p}`); assert.ok(!t.split(p).join('').includes(p)) }
  }
})

test('verify contract: Clean up section has the command and filter, and no glob', () => {
  const t = prompt('integrator')
  const s = t.slice(t.indexOf('**Clean up**'), t.indexOf('## mode: retry-merge'))
  assert.ok(s.includes('python3 "<skill>/branches.py" list --repo . --kind attempt'))
  assert.match(s, /Keep the entries whose `id` equals this slice id/)
  assert.doesNotMatch(s, /-attempt-/)
  assert.doesNotMatch(s, LOOP)
  assert.doesNotMatch(s, /git branch --list/)
  const r = rng(SEED)
  for (let i = 0; i < RUNS; i++) {
    const m = r.pick(['git branch --list "sdlc/<id>-attempt-*"', 'x-attempt-*', 'sdlc/S-1-attempt-1', 'a -attempt- b'])
    const mut = insertAt(s, m, r)
    assert.ok(/-attempt-/.test(mut), 'injected attempt text missed')
  }
  log('cleanup -attempt- scan')
})

test('verify contract: exemption seam, a literal inside a fenced block that mentions branches.py is hidden from the scan', () => {
  const sample = '```\npython3 branches.py list\ngit checkout sdlc/S-001\n```\n'
  assert.doesNotMatch(strip(sample), LOOP)
  assert.match(strip('```\ngit checkout sdlc/S-001\n```\nbranches.py'), LOOP)
  const text = prompt('integrator') + prompt('escalator') + prompt('state-writer')
  const fences = text.match(/```[^\n]*\n[\s\S]*?```/g) || []
  const hidden = fences.filter(b => b.includes('branches.py') && LOOP.test(b))
  assert.equal(hidden.length, 0, 'a shipped branches.py block hides a literal')
})

test('verify contract: attempt filter keeps S-1 and not S-10 (prefix id), via real branches.py', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-2', 'sdlc/S-10-attempt-1', 'sdlc/S-1', 'sdlc/S-100-attempt-4', 'sdlc/s-1-attempt-3', 'sdlc/S-1-attempt-x'] })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.equal(t.status, 0)
  const mine = t.json.branches.filter(b => String(b.id).toLowerCase() === 'S-1'.toLowerCase()).map(b => b.branch).sort()
  assert.deepEqual(mine, ['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-2', 'sdlc/s-1-attempt-3'])
  assert.ok(!t.json.branches.some(b => b.branch === 'sdlc/S-1'))
  const none = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.equal(none.json.branches.filter(b => b.id === 'S-7').length, 0)
  const empty = r.gitRepo({ branches: ['sdlc/S-2'] })
  const e = r.run('branches.py', ['list', '--repo', empty, '--kind', 'attempt'])
  assert.deepEqual(e.json.branches, [])
  assert.equal(t.treeUnchanged, true)
})

test('verify contract: attack-style branch names do not leak into another slice id', () => {
  const r = cliRunner()
  const names = ['sdlc/S-1-attempt-1', 'sdlc/S-1*-attempt-1', 'sdlc/S-1?-attempt-2', 'sdlc/S-1[0]-attempt-3', 'sdlc/S-1-attempt-1-attempt-2', 'sdlc/S-1​-attempt-5']
  const repo = r.gitRepo({ branches: names.filter(n => !n.includes('[') && !n.includes('?') && !n.includes('*')) })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.equal(t.status, 0)
  const ids = t.json.branches.map(b => b.id)
  const mine = ids.filter(i => i.toLowerCase() === 's-1')
  for (const b of t.json.branches) if (b.id.toLowerCase() === 's-1') assert.match(b.branch, /^sdlc\/S-1-attempt-/)
  console.log('ids', JSON.stringify(ids), 'mine', mine.length)
})

test('verify contract: each test file alone fails when one literal is added (mutation of the real file)', () => {
  const mutated = new Map()
  for (const f of ['escalator', 'state-writer', 'integrator']) mutated.set(f, strip(prompt(f) + '\nRun `git checkout sdlc/S-001`.\n'))
  for (const [, m] of mutated) assert.match(m, LOOP)
})
