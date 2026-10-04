import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
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
      // a bad file must stop the script, and stop it the way a caller of that script expects: importing
      // the module must not print a mode list the file does not hold, and running a command must report
      // the failure in the envelope that script already uses for everything else.
      const imported = (() => {
        try { return { code: 0, out: probeModes(copy) } } catch (e) { return { code: e.status, out: `${e.stderr}${e.stdout}` } }
      })()
      if (imported.code === 0) {
        // importing does not stop the script (the list is validated when a command needs it), so the only
        // acceptable outcome is an empty list — never a hardcoded one
        assert.equal(imported.out, '', `${name} reported modes from a git-modes.json that was ${label}`)
      } else {
        assert.match(imported.out, /git-modes\.json/, `${name} did not name git-modes.json when it was ${label}`)
      }

      const repo = join(dir, 'repo')
      mkdirSync(join(repo, '.sdlc'), { recursive: true })
      writeFileSync(join(repo, '.sdlc', 'config.json'), JSON.stringify({ gitMode: 'pr', defaultBranch: 'main', specPath: 'spec.md', specHash: '' }))
      writeFileSync(join(repo, '.sdlc', 'slices.json'), '[]')
      writeFileSync(join(repo, 'spec.md'), '# spec\n')
      // the two scripts have different CLIs: state-write takes a subcommand, next-action takes none
      const args = name === 'state-write.py' ? [copy, 'patch-slice', '--repo', repo, '--slice', 'S-014'] : [copy, '--repo', repo]
      const run1 = spawnSync('python3', args, { input: '{"status":"in_progress"}', encoding: 'utf8' })
      // the failure arrives on stdout in the envelope that script already uses for everything else, so a
      // caller that parses stdout never has to special-case a missing modes file. The two scripts signal it
      // differently on purpose: state-write exits non-zero, next-action exits 0 because the error IS its answer.
      let envelope = null
      try { envelope = JSON.parse(run1.stdout.trim()) } catch { /* reported below */ }
      if (name === 'state-write.py') {
        assert.notEqual(run1.status, 0, `${name} ran a command with a git-modes.json that was ${label}`)
        assert.ok(envelope && envelope.ok === false, `${name} did not report a bad git-modes.json as {"ok": false} on stdout, got: ${run1.stdout.trim() || run1.stderr.trim()}`)
      } else {
        assert.ok(envelope && envelope.next, `${name} did not answer on stdout at all, got: ${run1.stdout.trim() || run1.stderr.trim()}`)
        assert.equal(envelope.next.action, 'error', `${name} did not turn a bad git-modes.json into the error action`)
      }
      const said = envelope && (envelope.error || (envelope.next && envelope.next.reason))
      assert.match(said, /git-modes\.json/, `${name} did not name git-modes.json in its error when the file was ${label}`)
      assert.doesNotMatch(said, /\bpr, direct\b/, `${name} fell back to a hardcoded list when the file was ${label}`)
    }
  }
})
