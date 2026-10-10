import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const WT = process.env.VERIFY_WT
const SKILL = join(WT, 'skills', 'sdlc')
const prompt = readFileSync(join(SKILL, 'prompts', 'integrator.md'), 'utf8')
const clean = prompt.slice(prompt.indexOf('**Clean up**'), prompt.indexOf('## mode: retry-merge'))
const step = n => clean.split('\n').find(l => l.startsWith(`${n}. `))
const listCmd = step(2).match(/`(python3 "<skill>\/branches\.py" list --repo \. --kind attempt)`/)[1].replace('<skill>', SKILL)
const seed = Number(process.env.TESTKIT_SEED || 20261010)
let s = seed
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
const pick = a => a[Math.floor(rnd() * a.length)]

const sh = (cmd, cwd, env = {}) => spawnSync('bash', ['-c', cmd], { cwd, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: tmpdir(), GIT_AUTHOR_NAME: 'a', GIT_AUTHOR_EMAIL: 'a@b', GIT_COMMITTER_NAME: 'a', GIT_COMMITTER_EMAIL: 'a@b', ...env } })
function repoWith(format, branches, bare = false) {
  const d = mkdtempSync(join(tmpdir(), 'vc-'))
  sh('git init -q -b main . && git commit -q --allow-empty -m i', d)
  if (format) { mkdirSync(join(d, '.sdlc')); writeFileSync(join(d, '.sdlc/config.json'), JSON.stringify({ branchFormat: format })) }
  for (const b of branches) { const r = sh(`git branch -- "$B"`, d, { B: b }); assert.equal(r.status, 0, r.stderr) }
  return d
}
const local = d => sh('git branch --format="%(refname:short)"', d).stdout.split('\n').filter(Boolean).sort()
function listFor(d, id) {
  const r = sh(listCmd, d)
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout).branches.filter(e => e.id.toLowerCase() === id.toLowerCase()).map(e => e.branch)
}
const nameFor = (format, id, tail) => format.replace('{name:lower}', `${id.toLowerCase()}${tail}`).replace('{name}', `${id}${tail}`)

test('verify contract VS-1: default format list and delete leave only non-attempt branches', () => {
  const d = repoWith('', ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-001', 'sdlc/S-001-v0', 'sdlc/S-002-attempt-1'])
  const got = listFor(d, 'S-001')
  assert.deepEqual(got, ['sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-2'])
  for (const b of got) assert.equal(sh(`git branch -D -- "$B"`, d, { B: b }).status, 0)
  assert.deepEqual(local(d), ['main', 'sdlc/S-001', 'sdlc/S-001-v0', 'sdlc/S-002-attempt-1'])
})

test('verify contract VS-2: lowercase format, filter ignores case, no prefix collisions', () => {
  const fmt = 'feature/PROJ-1-{name:lower}'
  const all = ['s-001-attempt-1', 's-001-attempt-2', 's-0010-attempt-1', 's-001a-attempt-1', 's-001', 's-027b-attempt-3'].map(t => `feature/PROJ-1-${t}`)
  const d = repoWith(fmt, all)
  assert.deepEqual(listFor(d, 'S-001'), ['feature/PROJ-1-s-001-attempt-1', 'feature/PROJ-1-s-001-attempt-2'])
  assert.deepEqual(listFor(d, 'S-027b'), ['feature/PROJ-1-s-027b-attempt-3'])
  assert.deepEqual(listFor(d, 'S-0010'), ['feature/PROJ-1-s-0010-attempt-1'])
  const raw = JSON.parse(sh(listCmd, d).stdout).branches
  assert.ok(raw.every(e => e.id === e.id.toLowerCase()), 'ids come back lowercase')
  assert.equal(raw.filter(e => e.id === 'S-001').length, 0, 'a case-sensitive filter finds nothing')
})

test('verify contract VS-2: mixed-case {name} format', () => {
  const d = repoWith('team/{name}', ['team/S-027b-attempt-1', 'team/S-027b-attempt-2', 'team/S-027-attempt-1'])
  assert.deepEqual(listFor(d, 'S-027b'), ['team/S-027b-attempt-1', 'team/S-027b-attempt-2'])
})

test('verify contract VS-2: attempt numbers sort by number, not text', () => {
  const d = repoWith('', Array.from({ length: 12 }, (_, i) => `sdlc/S-001-attempt-${12 - i}`))
  const n = listFor(d, 'S-001').map(b => Number(b.split('-').pop()))
  assert.deepEqual(n, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
})

test('verify contract VS-2: property against a reference model over 1000 draws', () => {
  const ids = ['S-001', 'S-0010', 'S-001a', 'S-027b', 'S-013ab', 'S-fix-M-1-1', 'S-2']
  const formats = ['sdlc/{name}', 'feature/PROJ-1-{name:lower}', 'team/{name}', '{name}', 'u/me/{name:lower}']
  let runs = 0
  for (const f of formats) {
    const model = []
    for (let i = 0; i < 80; i++) model.push({ id: pick(ids), n: 1 + Math.floor(rnd() * 12) })
    const uniq = [...new Map(model.map(m => [`${m.id}#${m.n}`, m])).values()]
    const names = uniq.map(m => nameFor(f, m.id, `-attempt-${m.n}`))
    const d = repoWith(f === 'sdlc/{name}' ? '' : f, names.concat(ids.map(i => nameFor(f, i, ''))).filter((x, i, a) => a.indexOf(x) === i))
    const out = JSON.parse(sh(listCmd, d).stdout).branches
    for (let k = 0; k < 200; k++) {
      const target = pick(ids.concat(ids.map(x => x.toUpperCase()), ids.map(x => x.toLowerCase())))
      const expected = uniq.filter(m => m.id.toLowerCase() === target.toLowerCase()).sort((a, b) => a.n - b.n).map(m => nameFor(f, m.id, `-attempt-${m.n}`))
      const got = out.filter(e => e.id.toLowerCase() === target.toLowerCase()).map(e => e.branch)
      assert.deepEqual(got, expected, `format ${f} target ${target} seed ${seed}`)
      runs++
    }
  }
  console.log(`property-run seed=${seed} runs=${runs}`)
  assert.equal(runs, 1000)
})

test('verify contract VS-5: parent id list under a custom format keeps the child attempts', () => {
  const fmt = 'feature/PROJ-1-{name:lower}'
  const d = repoWith(fmt, ['feature/PROJ-1-s-013-attempt-1', 'feature/PROJ-1-s-013a-attempt-1', 'feature/PROJ-1-s-013b-attempt-2', 'feature/PROJ-1-s-013-attempt-2'])
  assert.deepEqual(listFor(d, 'S-013'), ['feature/PROJ-1-s-013-attempt-1', 'feature/PROJ-1-s-013-attempt-2'])
  assert.deepEqual(listFor(d, 'S-013a'), ['feature/PROJ-1-s-013a-attempt-1'])
})

test('verify contract VS-5: parent walk text', () => {
  const s3 = step(3)
  assert.match(s3, /do step 2 for the parent id/)
  assert.match(s3, /splitInto/)
  assert.match(s3, /Stop at the first parent that is not finished/)
  assert.match(step(4), /Never delete a branch of a slice that is not finished/)
  assert.match(s3, /`rejected`/)
  assert.match(s3, /strip the trailing letter one at a time/)
})

test('verify contract VS-6: Clean up holds no literal attempt pattern; step 1 keeps the verify half', () => {
  assert.doesNotMatch(clean, /sdlc\/<id>-attempt/)
  assert.doesNotMatch(clean, /-attempt-\*/)
  assert.doesNotMatch(clean, /attempt-<n>/)
  assert.match(step(1), /sdlc\/<id>-v\*/)
  assert.match(step(1), /Step 2 deletes the attempt branches/)
  assert.match(step(2), /ignoring case/)
  assert.match(step(2), /git branch -D <branch>/)
  assert.match(step(2), /In `pr`, `mr` and `stack` modes, also run `git push origin --delete <branch>`/)
  assert.doesNotMatch(step(2), /`direct`/)
  assert.match(step(2), /A name the remote does not have is fine/)
})

test('verify contract VS-6: ste-check passes on integrator.md', () => {
  const r = spawnSync('python3', [join(SKILL, 'ste-check.py'), join(SKILL, 'prompts', 'integrator.md')], { encoding: 'utf8' })
  console.log(r.stdout, r.stderr)
  assert.equal(r.status, 0, r.stdout + r.stderr)
})
