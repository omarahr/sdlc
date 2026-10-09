import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { glabStub, restrictedPath } from './glab-stub.mjs'
import { stubServer } from './stub-server.mjs'
import { scratch } from '../harness.mjs'

const run = (stub, args, opts = {}) => spawnSync('glab', args, { env: stub.env(), encoding: 'utf8', ...opts })

test('testkit glab-stub: shim is named glab and logs argv and cwd', () => {
  const stub = glabStub()
  const cwd = scratch('glab-cwd-')
  const sub = join(cwd, 'sub dir')
  mkdirSync(sub)
  run(stub, ['api', 'projects/:id/protected_branches', '', 'a b', '$(id)'], { cwd: sub })
  assert.ok(stub.shim.endsWith('/glab'))
  assert.deepEqual(stub.calls()[0].argv, ['api', 'projects/:id/protected_branches', '', 'a b', '$(id)'])
  assert.equal(stub.calls()[0].cwd, realpathSync(sub))
})

test('testkit glab-stub: scripted stdout, stderr, exit code, delay and fallback', () => {
  const stub = glabStub({ script: [{ stdout: [{ id: 1 }] }, { stderr: 'boom\n', exit: 4 }, { delaySeconds: 0.2, stdout: 'late' }], fallback: { stdout: '[]' } })
  assert.deepEqual(JSON.parse(run(stub, ['a']).stdout), [{ id: 1 }])
  const b = run(stub, ['b'])
  assert.equal(b.status, 4)
  assert.equal(b.stderr, 'boom\n')
  assert.equal(run(stub, ['c']).stdout, 'late')
  assert.equal(run(stub, ['d']).stdout, '[]')
  stub.failNext(1, { exit: 2, stderr: 'down' })
  assert.equal(run(stub, ['e']).status, 2)
  assert.equal(stub.count(), 5)
})

test('testkit glab-stub: stall is cut by the caller timeout and the call is logged', () => {
  const stub = glabStub({ script: [{ stall: true }] })
  const t = run(stub, ['hang'], { timeout: 400 })
  assert.equal(t.error?.code, 'ETIMEDOUT')
  assert.equal(stub.count(), 1)
})

test('testkit glab-stub: gh and glab stubs keep separate logs on one PATH', () => {
  const gh = stubServer()
  const glab = glabStub()
  const env = { PATH: glab.path(gh.path()) }
  spawnSync('gh', ['pr', 'list'], { env })
  spawnSync('glab', ['mr', 'list'], { env })
  assert.deepEqual(gh.calls().map((c) => c.argv), [['pr', 'list']])
  assert.deepEqual(glab.calls().map((c) => c.argv), [['mr', 'list']])
})

test('testkit glab-stub: restrictedPath hides glab', () => {
  const bin = restrictedPath(['python3', 'git'])
  const t = spawnSync('python3', ['-c', 'import shutil;print(shutil.which("glab"))'], { env: { PATH: bin }, encoding: 'utf8' })
  assert.equal(t.stdout.trim(), 'None')
})
