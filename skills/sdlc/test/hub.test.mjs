import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, utimesSync } from 'node:fs'
import { createServer, createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const HUB = join(SKILL_DIR, 'tracker', 'hub.py')
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }

const freePort = () => new Promise(res => {
  const s = createServer()
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
})
const exited = p => new Promise(res => p.on('exit', res))
// unlike tracker.test.mjs's, this until() awaits async conditions (fetch polls)
const until = async (cond, ms = 10000) => {
  const end = Date.now() + ms
  let ok = false
  while (!(ok = await cond()) && Date.now() < end) await new Promise(r => setTimeout(r, 50))
  return ok
}
const get = async (port, path) => {
  try {
    const r = await fetch(`http://127.0.0.1:${port}${path}`)
    return { status: r.status, body: await r.text() }
  } catch { return { status: 0, body: '' } }
}
// WHATWG URL parsing normalizes %2e%2e away before sending, so traversal tests go over a raw socket
const rawGet = (port, path) => new Promise((res, rej) => {
  const s = createConnection(port, '127.0.0.1', () => s.write(`GET ${path} HTTP/1.0\r\nHost: x\r\n\r\n`))
  let data = ''
  s.on('data', d => { data += d })
  s.on('end', () => res(data))
  s.on('error', rej)
})

async function runningHub() {
  const port = await freePort()
  const dir = mkdtempSync(join(tmpdir(), 'sdlc-hub-'))
  const proc = spawn('python3', [HUB], { env: { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }, stdio: 'ignore' })
  const done = exited(proc)
  assert.ok(await until(async () => (await get(port, '/health')).body === 'sdlc-hub', 5000), 'the hub came up')
  return { port, dir, stop: async () => { proc.kill(); await done } }
}

// a registration the way collect.py writes it, aged back by the number of seconds given
function register(dir, id, entry = {}, ageSeconds = 0) {
  mkdirSync(join(dir, 'runs'), { recursive: true })
  const file = join(dir, 'runs', `${id}.json`)
  writeFileSync(file, JSON.stringify({ id, repo: '/tmp/wherever', out: join(dir, 'out'), pid: process.pid, startedAt: '2026-10-06T09:00:00Z', ...entry }))
  if (ageSeconds) { const t = new Date(Date.now() - ageSeconds * 1000); utimesSync(file, t, t) }
  return file
}

test('the hub answers its health marker, 404s the unknown, and says when no run is registered', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const health = await get(hub.port, '/health')
    assert.equal(health.status, 200)
    assert.equal(health.body, 'sdlc-hub')
    assert.match((await get(hub.port, '/')).body, /No sdlc run/)
    assert.equal((await get(hub.port, '/nope')).status, 404)
    assert.equal((await get(hub.port, '/r/ghost/')).status, 404, 'an unregistered run is a 404')
  } finally { await hub.stop() }
})

test('the index lists live runs and greys stale ones, and serves each run page from its tracker dir', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'index.html'), '<html>window.SDLC_STATUS</html>')
    writeFileSync(join(out, 'status.json'), JSON.stringify({ title: 'Bookmarks Service' }))
    register(hub.dir, 'myapp-bookmarks')
    // a live pid but a heartbeat ten minutes old: staleness, not the pid, decides
    register(hub.dir, 'oldrun-spec', {}, 10 * 60)
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.match(index.body, /<li class="live"><a href="\/r\/myapp-bookmarks\/">Bookmarks Service<\/a>/)
    assert.match(index.body, /<li class="stale"><a href="\/r\/oldrun-spec\/">/, 'still browsable, but greyed')
    const page = await get(hub.port, '/r/myapp-bookmarks/')
    assert.equal(page.status, 200)
    assert.match(page.body, /SDLC_STATUS/)
    assert.equal((await get(hub.port, '/r/myapp-bookmarks/index.html?x=1')).status, 200, 'query strings are ignored')
  } finally { await hub.stop() }
})

test('a run page never serves a file outside its tracker directory', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'index.html'), 'ok')
    writeFileSync(join(hub.dir, 'secret.txt'), 'not for the browser')
    register(hub.dir, 'myapp-bookmarks')
    for (const path of ['/r/myapp-bookmarks/%2e%2e/secret.txt', '/r/myapp-bookmarks/..%2fsecret.txt']) {
      const res = await rawGet(hub.port, path)
      assert.match(res, /^HTTP\/1\.[01] 404/, path)
      assert.doesNotMatch(res, /not for the browser/)
    }
  } finally { await hub.stop() }
})

test('a corrupt registration is skipped, never 500s the index', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    register(hub.dir, 'good-run')
    writeFileSync(join(hub.dir, 'runs', 'half.json'), '{"id": "half", ')
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.match(index.body, /good-run/)
    assert.doesNotMatch(index.body, /half/)
  } finally { await hub.stop() }
})

test('a registration with the wrong shape is skipped, and its run page 404s', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'index.html'), 'ok')
    // JSON.stringify drops undefined values, so these files lack the keys entirely
    register(hub.dir, 'no-pid-run', { pid: undefined })
    register(hub.dir, 'no-out-run', { out: undefined })
    writeFileSync(join(hub.dir, 'runs', 'a-list.json'), '[1,2]')
    register(hub.dir, 'odd-status')
    // a status.json that parses but is not an object: the title falls back to the run id
    writeFileSync(join(out, 'status.json'), '"hello"')
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.doesNotMatch(index.body, /no-pid-run/, 'an entry without a pid is skipped')
    assert.doesNotMatch(index.body, /a-list/, 'a non-object entry is skipped')
    assert.doesNotMatch(index.body, /no-out-run/, 'an entry without an out dir is skipped')
    assert.match(index.body, /<a href="\/r\/odd-status\/">odd-status<\/a>/, 'the title falls back to the run id')
    assert.equal((await get(hub.port, '/r/no-out-run/')).status, 404, 'not a traceback')
  } finally { await hub.stop() }
})

test('an entry quiet for a day is pruned from the registry and the index', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const file = register(hub.dir, 'ancient-run', {}, 25 * 3600)
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.doesNotMatch(index.body, /ancient-run/)
    assert.equal(existsSync(file), false, 'and the file is gone')
  } finally { await hub.stop() }
})
