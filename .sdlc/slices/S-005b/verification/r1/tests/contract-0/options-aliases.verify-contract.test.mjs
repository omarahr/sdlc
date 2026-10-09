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
  const r = spawnSync('python3', ['-I', join(HERE, 'options_aliases_verify_contract.py'), join(ROOT, 'skills/sdlc/test/push_guard.py'), ROOT, SEED, '1000', mode], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  console.log(r.stdout.trim())
  return JSON.parse(r.stdout)
}

test('verify contract TC-contract-29 VS-13: a literal option after a known wrapper verb, in any spelling, changes wrapperVerbs, opaque or pushes (property)', () => {
  const res = property('options')
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
    const ml = moduleLoader()
    const dir = copyRoot()
    const p = join(dir, 'skills/sdlc', file)
    writeFileSync(p, readFileSync(p, 'utf8') + `\n\ndef _verify_mutant(repo):\n    return bool(${call})\n`)
    const keys = changedKeys(scan(dir))
    const { remote, repo } = ml.bareRemote({ branches: [V] })
    const t = ml.call(join(dir, 'skills/sdlc', file), '_verify_mutant', [repo], { remote })
    console.log(`changed keys: ${keys.join(',') || '<none>'}\n${t.text()}`)
    assert.ok(keys.length > 0 || !t.pushed(V), `guard output equals the clean output and the remote holds ${V}`)
  })
}

const COMMAND_OPTS = ['--upload-pack', '--receive-pack', '--exec', '-u', '--config', '-c', '--template', '--ssh', '--extcmd', '--tool', '-x', '--exec-path']

test('verify contract TC-contract-31 VS-13: the clean tree has no opaque entry and no command-running option in wrapperVerbs', () => {
  assert.deepEqual(CLEAN.opaque, [])
  const entries = CLEAN.wrapperVerbs.map((e) => e.split(' ')).filter((p) => p.length === 4)
  console.log(`option entries: ${entries.length}\n${entries.map((p) => p.join(' ')).join('\n')}`)
  const runsCommand = ([, , verb, o]) => (o === '-u' ? verb !== 'push' : COMMAND_OPTS.includes(o) || /^--(upl|rec|exe)/.test(o))
  assert.deepEqual(entries.filter(runsCommand), [])
})

test('verify contract TC-contract-32 VS-15: an import alias bound anywhere in a module resolves to the watched module (property)', () => {
  const res = property('aliases')
  assert.equal(res.failureCount, 0, JSON.stringify(res.failures, null, 1))
})

const JAN = 'skills/sdlc/janitor.py'
const REBIND = [
  ['one name bound to json and to subprocess', "\n\ndef _a():\n    import json as sp\n    return sp\n\n\ndef _b(b):\n    import subprocess as sp\n    sp.run(['git', 'push', 'origin', b])\n", ['dynamic', 'direct']],
  ['one name bound to json in one place and to subprocess late', "\n\nimport json as sp\n\n\ndef _b(b):\n    sp.run(['git', 'push', 'origin', b])\n\n\nimport subprocess as sp\n", ['dynamic', 'direct']],
  ['import then assignment rebind sp = json', "\n\nimport subprocess as sp\nimport json\nsp = json\n\n\ndef _b(b):\n    sp.run(['git', 'push', 'origin', b])\n", ['direct']],
  ['assignment of a watched module to an imported name', "\n\nimport json as sp\nsp = subprocess\n\n\ndef _b(b):\n    sp.run(['git', 'push', 'origin', b])\n", ['dynamic']],
  ['del of an alias, then a late rebind', "\n\nimport json as sp\ndel sp\n\n\ndef _b(b):\n    sp.run(['git', 'push', 'origin', b])\n\n\nfrom subprocess import run as _r\nsp = _r\n", ['dynamic']],
  ['lambda default reaching the module through __import__', "\n\n_f = lambda b, m=__import__('subprocess'): m.run(['git', 'push', 'origin', b])\n", ['dynamic']],
]

for (const [title, tail, expect] of REBIND) {
  test(`verify contract TC-contract-33 VS-15: ${title} breaks the expected pin`, () => {
    const dir = copyRoot()
    const p = join(dir, JAN)
    writeFileSync(p, readFileSync(p, 'utf8') + tail)
    const out = scan(dir)
    const keys = changedKeys(out)
    console.log(`changed keys: ${keys.join(',')}\n` + expect.map((k) => `${k}: ${JSON.stringify(out[k].filter((e) => !CLEAN[k].includes(e)))}`).join('\n'))
    for (const k of expect) assert.ok(keys.includes(k), `expected ${k} to change, changed: ${keys.join(',')}`)
  })
}

test('verify contract TC-contract-34 VS-15: the clean tree has no dynamic entry, so no file has a rebound name', () => {
  assert.deepEqual(CLEAN.dynamic, [])
})
