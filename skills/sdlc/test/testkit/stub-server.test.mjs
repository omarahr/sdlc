import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { restrictedPath, stubServer } from './stub-server.mjs'
import { scratch } from '../harness.mjs'

const run = (stub, args, opts = {}) => spawnSync('gh', args, { env: stub.env(), encoding: 'utf8', ...opts })

test('testkit stub-server: logs argv and cwd for each call', () => {
  const stub = stubServer()
  const cwd = scratch('cwd-')
  const sub = join(cwd, 'sub dir')
  mkdirSync(sub)
  run(stub, ['api', 'repos/{owner}/{repo}/rules/branches/sdlc%2FS-001'], { cwd: sub })
  run(stub, ['--odd', 'a b', '', '-x\nnewline', '$(id)'], { cwd })
  const calls = stub.calls()
  assert.equal(stub.count(), 2)
  assert.deepEqual(calls[0].argv, ['api', 'repos/{owner}/{repo}/rules/branches/sdlc%2FS-001'])
  assert.equal(calls[0].cwd, realpathSync(sub))
  assert.deepEqual(calls[1].argv, ['--odd', 'a b', '', '-x\nnewline', '$(id)'])
  assert.equal(calls[1].cwd, realpathSync(cwd))
})

test('testkit stub-server: scripted calls return stdout, stderr and exit code', () => {
  const stub = stubServer({ script: [{ stdout: [{ id: 1 }] }, { stderr: 'boom\n', exit: 1 }, { stdout: 'not json', exit: 3 }] })
  const a = run(stub, ['a'])
  assert.equal(a.status, 0)
  assert.deepEqual(JSON.parse(a.stdout), [{ id: 1 }])
  const b = run(stub, ['b'])
  assert.equal(b.status, 1)
  assert.equal(b.stderr, 'boom\n')
  assert.equal(b.stdout, '')
  const c = run(stub, ['c'])
  assert.equal(c.status, 3)
  assert.equal(c.stdout, 'not json')
  const d = run(stub, ['d'])
  assert.equal(d.status, 0)
  assert.equal(d.stdout, '')
})

test('testkit stub-server: fallback and failNext apply to later calls', () => {
  const stub = stubServer({ fallback: { stdout: '[]' } })
  assert.equal(run(stub, ['x']).stdout, '[]')
  stub.failNext(2, { exit: 7, stderr: 'down' })
  assert.equal(run(stub, ['y']).status, 7)
  assert.equal(run(stub, ['z']).stderr, 'down')
  const after = run(stub, ['w'])
  assert.equal(after.status, 0)
  assert.equal(after.stdout, '[]')
  assert.equal(stub.count(), 4)
})

test('testkit stub-server: large and binary output pass through unchanged', () => {
  const big = 'x'.repeat(2_000_000)
  const stub = stubServer({ script: [{ stdout: big }, { stdout: Buffer.from([0xff, 0xfe, 0x00, 0x41]) }] })
  assert.equal(run(stub, ['a'], { maxBuffer: 1 << 26 }).stdout.length, big.length)
  assert.deepEqual([...run(stub, ['b'], { encoding: 'buffer' }).stdout], [0xff, 0xfe, 0x00, 0x41])
})

test('testkit stub-server: stall is cut by the caller timeout and still logs the call', () => {
  const stub = stubServer({ script: [{ stall: true }, { delaySeconds: 0.3, stdout: 'late' }] })
  const t = run(stub, ['hang'], { timeout: 500 })
  assert.equal(t.error?.code, 'ETIMEDOUT')
  assert.equal(stub.count(), 1)
  const slow = run(stub, ['slow'])
  assert.equal(slow.stdout, 'late')
})

test('testkit stub-server: restrictedPath holds only the kept commands', () => {
  const stub = stubServer()
  const bin = restrictedPath(['python3', 'git'])
  const t = spawnSync('python3', ['-c', 'import shutil;print(shutil.which("gh"), shutil.which("git") is not None)'], { env: { PATH: bin }, encoding: 'utf8' })
  assert.equal(t.stdout.trim(), 'None True')
  assert.equal(stub.count(), 0)
  const withShim = spawnSync('python3', ['-c', 'import shutil;print(shutil.which("gh"))'], { env: { PATH: `${stub.dir}:${bin}` }, encoding: 'utf8' })
  assert.equal(withShim.stdout.trim(), stub.shim)
})

test('testkit stub-server: shim stays a plain script with no network use', () => {
  const stub = stubServer()
  const text = spawnSync('cat', [stub.shim], { encoding: 'utf8' }).stdout
  assert.doesNotMatch(text, /curl|nc |\/dev\/tcp/)
})
