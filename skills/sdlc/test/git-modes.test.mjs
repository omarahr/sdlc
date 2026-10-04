import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR, loadInternals } from './harness.mjs'

const MODES_PATH = join(SKILL_DIR, 'git-modes.json')
// the two scripts that decide whether a gitMode is legal, and must both read the same file
const SCRIPTS = ['next-action.py', 'state-write.py'].map(n => ({ name: n, path: join(SKILL_DIR, n) }))

let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }

const readModes = () => JSON.parse(execFileSync('python3', ['-c', `
import json, sys
print(json.dumps(json.load(open(sys.argv[1]))["gitModes"]))
`, MODES_PATH], { encoding: 'utf8' }))

// import the script by path and print the constant it resolved, so the check reads what the script
// itself resolved rather than what this file hopes it resolved
const probeModes = script =>
  execFileSync('python3', ['-c', `
import importlib.util, sys
spec = importlib.util.spec_from_file_location("probe", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print(",".join(mod.GIT_MODES))
`, script], { encoding: 'utf8' }).trim()

test('git-modes.json holds an ordered list of mode names', () => {
  const modes = readModes()
  assert.ok(Array.isArray(modes), 'git-modes.json must hold a JSON array of mode names')
  assert.ok(modes.length > 0, 'git-modes.json must name at least one mode')
  assert.deepEqual(modes, [...new Set(modes)], 'git-modes.json repeats a mode')
  for (const m of modes) assert.match(m, /^[a-z][a-z-]*$/, `git-modes.json has ${JSON.stringify(m)}, which is not a mode name`)
})

test('the workflow script mode list is the one in git-modes.json', async () => {
  // sdlc-loop.js runs in a workflow runtime with no fs, so it cannot read the file and keeps its own
  // literal. This is the only thing keeping the two in step, so it has to be a real comparison.
  const { I } = await loadInternals()
  assert.deepEqual(I.GIT_MODES, readModes(), 'sdlc-loop.js GIT_MODES has drifted from git-modes.json')
})

test('each python script resolves its modes from the file beside it, not from a literal', opts, () => {
  for (const { name, path } of SCRIPTS) {
    const dir = mkdtempSync(join(tmpdir(), 'sdlc-modes-'))
    const copy = join(dir, name)
    copyFileSync(path, copy)
    // a list nothing in the repo uses: a script still resolving the shipped four is reading a literal
    writeFileSync(join(dir, 'git-modes.json'), JSON.stringify({ gitModes: ['alpha', 'beta'] }))
    assert.equal(probeModes(copy), 'alpha,beta', `${name} did not read the git-modes.json beside it`)
  }
})

test('a missing or malformed git-modes.json stops the scripts instead of falling back to a list', opts, () => {
  const bad = [
    ['missing', null],
    ['not json', 'gitModes: ['],
    ['not an object', JSON.stringify(['pr', 'direct'])],
    ['no gitModes key', JSON.stringify({ modes: ['pr'] })],
    ['empty list', JSON.stringify({ gitModes: [] })],
    ['not a list', JSON.stringify({ gitModes: 'pr' })],
  ]
  for (const [label, contents] of bad) {
    for (const { name, path } of SCRIPTS) {
      const dir = mkdtempSync(join(tmpdir(), 'sdlc-modes-'))
      const copy = join(dir, name)
      copyFileSync(path, copy)
      if (contents !== null) writeFileSync(join(dir, 'git-modes.json'), contents)
      const r = (() => {
        try { return { code: 0, out: probeModes(copy) } } catch (e) { return { code: e.status, out: `${e.stderr}${e.stdout}` } }
      })()
      assert.notEqual(r.code, 0, `${name} accepted a git-modes.json that is ${label}`)
      assert.match(r.out, /git-modes\.json/, `${name} did not name git-modes.json when it was ${label}`)
      assert.doesNotMatch(r.out, /\bpr, direct\b/, `${name} fell back to a hardcoded list when the file was ${label}`)
    }
  }
})
