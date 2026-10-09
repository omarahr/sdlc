import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from './cli-runner.mjs'

test('testkit cli-runner: runs a skill script from a scratch cwd and records the transcript', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } }, branches: ['sdlc/S-1'] })
  const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/S-1'])
  assert.equal(t.spawnError, null)
  assert.equal(typeof t.status, 'number')
  assert.ok(t.argv[1].endsWith('branches.py'))
  assert.notEqual(t.cwd, repo)
  assert.ok(t.json && typeof t.json === 'object', `stdout is JSON: ${t.stdout}`)
  assert.ok(Object.keys(t.tree).includes(repo), 'the --repo directory is watched by default')
  assert.ok(t.tree[repo].before.refs['refs/heads/sdlc/S-1'])
  assert.match(t.text(), /^\$ cd /)
  assert.match(t.text(), /exit: \d+ \(\d+ ms\)/)
})

test('testkit cli-runner: the environment is controlled, overrides apply and undefined removes a key', () => {
  process.env.TESTKIT_LEAK_PROBE = 'leak'
  const r = cliRunner()
  const t = r.exec(r.python, ['-c', 'import json, os; print(json.dumps(dict(os.environ)))'], { env: { EXTRA: 'x', TZ: undefined } })
  delete process.env.TESTKIT_LEAK_PROBE
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.json.HOME, r.home)
  assert.equal(t.json.EXTRA, 'x')
  assert.equal(t.json.TESTKIT_LEAK_PROBE, undefined)
  assert.equal(t.json.TZ, undefined)
  assert.match(t.text(), /EXTRA=x TZ=<unset>/)
})

test('testkit cli-runner: the tree diff shows added, changed and removed files and new refs', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { 'keep.txt': 'a', 'change.txt': 'a', 'drop.txt': 'a' } })
  const code = 'import os, pathlib, subprocess, sys; d = pathlib.Path(sys.argv[1]); (d / "new.txt").write_text("n"); (d / "change.txt").write_text("b"); os.remove(d / "drop.txt"); subprocess.run(["git", "-C", str(d), "branch", "made"], check=True)'
  const t = r.exec(r.python, ['-c', code, repo], { watch: [repo] })
  assert.equal(t.status, 0, t.stderr)
  const d = t.tree[repo].diff
  assert.deepEqual(d.added, ['new.txt', 'ref:refs/heads/made'])
  assert.deepEqual(d.changed, ['change.txt'])
  assert.deepEqual(d.removed, ['drop.txt'])
  assert.equal(t.treeUnchanged, false)
  assert.match(t.text(), /\+ new.txt/)
})

test('testkit cli-runner: an unchanged tree is reported as unchanged', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const t = r.exec(r.python, ['-c', 'pass'], { watch: [repo] })
  assert.equal(t.treeUnchanged, true)
})

test('testkit cli-runner: a NUL argument is recorded as a spawn error, not thrown', () => {
  const r = cliRunner()
  const t = r.exec(r.python, ['-c', 'pass', 'a\u0000b'])
  assert.equal(t.status, null)
  assert.ok(t.spawnError)
})

test('testkit cli-runner: stdin input, timeouts and copied skill directories', () => {
  const r = cliRunner()
  const echo = r.exec(r.python, ['-c', 'import sys; print(sys.stdin.read().upper())'], { input: 'hi' })
  assert.equal(echo.stdout, 'HI\n')
  const slow = r.exec(r.python, ['-c', 'import time; time.sleep(5)'], { timeoutMs: 300 })
  assert.equal(slow.timedOut, true)
  const copy = r.copySkill({ omit: ['git-modes.json'], files: { 'extra.txt': 'x' } })
  assert.equal(existsSync(join(copy, 'git-modes.json')), false)
  assert.equal(readFileSync(join(copy, 'extra.txt'), 'utf8'), 'x')
  assert.ok(existsSync(join(copy, 'branches.py')))
  const t = r.run('branches.py', ['parse'], { skillDir: copy })
  assert.equal(t.argv[1], join(copy, 'branches.py'))
})
