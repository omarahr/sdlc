import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { abbreviations, all, argvSafe, decoyEnv, decoyFired, duplicated, equalsForm, families, load, plantDecoy } from './attack-corpus.mjs'
import { cliRunner } from './cli-runner.mjs'

const FAMILIES = ['control-chars', 'flag-like-values', 'format-strings', 'huge-integers', 'injection', 'integer-forms', 'nul', 'oversized', 'traversal', 'unicode-confusables', 'unicode-digits', 'unicode-whitespace']

test('testkit attack-corpus: every family loads with unique ids and string values', () => {
  assert.deepEqual(families(), FAMILIES)
  for (const f of families()) {
    const entries = load(f)
    assert.ok(entries.length > 0, f)
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length, `${f} ids are unique`)
    for (const e of entries) {
      assert.equal(typeof e.value, 'string', `${f}/${e.id}`)
      assert.equal(e.family, f)
    }
  }
  assert.throws(() => load('nope'), /unknown attack-corpus family/)
})

test('testkit attack-corpus: repeat entries expand to their length', () => {
  const huge = Object.fromEntries(load('huge-integers').map((e) => [e.id, e.value]))
  assert.equal(huge['digits-4301'].length, 4301)
  assert.match(huge['negative-5000'], /^-9{5000}$/)
  assert.match(huge['zeros-10k'], /^0{10000}1$/)
})

test('testkit attack-corpus: argv-safe filtering drops NUL values only where needed', () => {
  assert.equal(load('nul', { argv: true }).length, 0)
  assert.equal(argvSafe(load('nul')).length, 0)
  assert.equal(load('unicode-digits', { argv: true }).length, load('unicode-digits').length)
  assert.ok(all({ argv: true }).every((e) => !e.value.includes('\u0000')))
})

test('testkit attack-corpus: every argv-safe value reaches a python script intact', () => {
  const r = cliRunner()
  const entries = all({ argv: true }).filter((e) => e.value.length < 50000)
  const t = r.exec(r.python, ['-c', 'import json, sys; print(json.dumps(sys.argv[1:]))', ...entries.map((e) => e.value)])
  assert.equal(t.status, 0, t.stderr)
  assert.deepEqual(t.json, entries.map((e) => e.value))
})

test('testkit attack-corpus: flag helpers build abbreviations, duplicates and = forms', () => {
  assert.deepEqual(abbreviations('--repo'), ['--r', '--re', '--rep'])
  assert.deepEqual(duplicated('--kind', ['slice', 'run']), ['--kind', 'slice', '--kind', 'run'])
  assert.equal(equalsForm('--format', 'a/{name}'), '--format=a/{name}')
})

test('testkit attack-corpus: a decoy on PYTHONPATH fires and records its import', () => {
  const r = cliRunner()
  const decoyDir = r.dir('decoy')
  const decoy = plantDecoy(decoyDir)
  assert.equal(decoyFired(decoy), null)
  const t = r.exec(r.python, ['-c', 'import branches'], { env: decoyEnv(decoyDir) })
  assert.equal(t.status, decoy.exitCode)
  assert.match(t.stderr, /DECOY branches IMPORTED/)
  assert.deepEqual(decoyFired(decoy), [decoy.path])
})

test('testkit attack-corpus: a shadow decoy in the script directory answers with decoy values', () => {
  const r = cliRunner()
  const dir = r.dir('scriptdir')
  const decoy = plantDecoy(dir, { behavior: 'shadow' })
  const script = join(dir, 'probe.py')
  writeFileSync(script, 'import branches\nprint(branches.load_format("."), branches.anything())\n')
  const t = r.exec(r.python, [script])
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.stdout, 'decoy/{name} decoy\n')
  assert.equal(decoyFired(decoy).length, 1)
})
