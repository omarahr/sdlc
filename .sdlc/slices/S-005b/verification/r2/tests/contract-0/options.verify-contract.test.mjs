import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.VERIFY_ROOT
const HERE = dirname(fileURLToPath(import.meta.url))
const SEED = process.env.TESTKIT_SEED || '20261009'
const { moduleLoader } = await import(join(ROOT, 'skills/sdlc/test/testkit/module-loader.mjs'))
const V = 'sdlc/S-001-v0-cli-0'
const CMD = `git push origin ${V};:`

function copyRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'verify-contract-'))
  cpSync(join(ROOT, 'skills'), join(dir, 'skills'), { recursive: true })
  cpSync(join(ROOT, 'hooks'), join(dir, 'hooks'), { recursive: true })
  return dir
}

function scan(dir) {
  const r = spawnSync('python3', ['-I', join(dir, 'skills/sdlc/test/push_guard.py'), dir], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const CLEAN = scan(ROOT)

function changedKeys(out) {
  return Object.keys(CLEAN).filter((k) => JSON.stringify(CLEAN[k]) !== JSON.stringify(out[k]))
}

function property(mode) {
  const r = spawnSync('python3', ['-I', join(HERE, 'options_verify_contract.py'), join(ROOT, 'skills/sdlc/test/push_guard.py'), ROOT, SEED, '1000', mode], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  console.log(r.stdout.trim())
  return JSON.parse(r.stdout)
}

function mutantCase(file, call) {
  const ml = moduleLoader()
  const dir = copyRoot()
  const p = join(dir, 'skills/sdlc', file)
  writeFileSync(p, readFileSync(p, 'utf8') + `\n\ndef _verify_mutant(repo):\n    return bool(${call})\n`)
  const keys = changedKeys(scan(dir))
  const { remote, repo } = ml.bareRemote({ branches: [V] })
  const t = ml.call(join(dir, 'skills/sdlc', file), '_verify_mutant', [repo], { remote })
  console.log(`changed keys: ${keys.join(',') || '<none>'}\n${t.text()}`)
  assert.ok(keys.length > 0 || !t.pushed(V), `guard output equals the clean output and the remote holds ${V}`)
}

test('verify contract TC-contract-29 VS-13: a literal option after a known wrapper verb, in any spelling, changes wrapperVerbs, opaque or pushes (property)', () => {
  const res = property('r1')
  assert.equal(res.failureCount, 0, JSON.stringify(res.failures, null, 1))
})

const BEHAVIOR = [
  ['state-write.py', 'm1 f-string with a leading expression', `git(repo, "fetch", "origin", f"{''}--upload-pack=${CMD}", check=False)`],
  ['state-write.py', 'm2 strip call', `git(repo, "fetch", "origin", "--upload-pack=${CMD}".strip(), check=False)`],
  ['state-write.py', 'format call', `git(repo, "fetch", "origin", "{}".format("--upload-pack=${CMD}"), check=False)`],
  ['next-action.py', 'm3 str call', `run(repo, "git", "fetch", "origin", str("--upload-pack=${CMD}"))`],
  ['next-action.py', 'join call', `run(repo, "git", "fetch", "origin", "".join(["--upload-pack=${CMD}"]))`],
]

for (const [file, title, call] of BEHAVIOR) {
  test(`verify contract TC-contract-30 VS-13: ${title} in ${file} pushes a verify branch only when the guard flags it`, () => {
    mutantCase(file, call)
  })
}

const COMMAND_OPTS = ['--upload-pack', '--receive-pack', '--exec', '-u', '--config', '-c', '--template', '--ssh', '--extcmd', '--tool', '-x', '--exec-path']

test('verify contract TC-contract-31 VS-13: the clean tree has no opaque entry and no command-running option in wrapperVerbs', () => {
  assert.deepEqual(CLEAN.opaque, [])
  const parts = CLEAN.wrapperVerbs.map((e) => e.split(' '))
  const options = parts.filter((p) => p.length === 4 && p[2] !== 'value')
  const values = parts.filter((p) => p[2] === 'value')
  console.log(`entries: ${parts.length}; option entries: ${options.length}; value entries: ${values.length}\n${CLEAN.wrapperVerbs.join('\n')}`)
  const runsCommand = ([, , verb, o]) => (o === '-u' ? verb !== 'push' : COMMAND_OPTS.includes(o) || /^--(upl|rec|exe)/.test(o))
  assert.deepEqual(options.filter(runsCommand), [])
  assert.deepEqual(values.filter((p) => /--(upload|receive|exec|config)|(^|\W)-c\b/.test(p.slice(4).join(' '))), [])
})

test('verify contract TC-contract-35 VS-13: more literal option spellings after a known wrapper verb change wrapperVerbs, opaque or pushes (property)', () => {
  const res = property('r2')
  assert.equal(res.failureCount, 0, JSON.stringify(res.failures, null, 1))
})

const BYTES = [
  ['state-write.py', 'bytes option on fetch', `git(repo, "fetch", "origin", b"--upload-pack=${CMD}", check=False)`],
  ['state-write.py', 'bytes option split in two tokens on fetch', `git(repo, "fetch", b"--upload-pack", b"${CMD}", "origin", check=False)`],
  ['suite-receipt.py', 'bytes option on fetch', `git(repo, "fetch", "origin", b"--upload-pack=${CMD}")`],
  ['next-action.py', 'bytes option on fetch', `run(repo, "git", "fetch", "origin", b"--upload-pack=${CMD}")`],
]

for (const [file, title, call] of BYTES) {
  test(`verify contract TC-contract-36 VS-13: ${title} in ${file} pushes a verify branch only when the guard flags it`, () => {
    mutantCase(file, call)
  })
}
