import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, utimesSync } from 'node:fs'
import { createServer, createConnection } from 'node:net'
import { createServer as httpServer } from 'node:http'
import { join } from 'node:path'
import { SKILL_DIR, scratch } from './harness.mjs'

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
    return { status: r.status, body: await r.text(), headers: r.headers }
  } catch { return { status: 0, body: '', headers: new Headers() } }
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
  const dir = scratch('sdlc-hub-')
  const proc = spawn('python3', [HUB], { env: { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }, stdio: 'ignore' })
  const done = exited(proc)
  const up = await until(async () => (await get(port, '/health')).body === 'sdlc-hub', 5000)
  // a hub that never came up still holds the event loop open, so kill it before failing the test
  if (!up) { proc.kill(); await done }
  assert.ok(up, 'the hub came up')
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
    assert.match(index.body, /class="run live"/, 'the live run on the status board')
    assert.match(index.body, /<a href="\/r\/myapp-bookmarks\/">Bookmarks Service<\/a>/)
    assert.match(index.body, /class="run stale"/, 'still browsable, but greyed')
    assert.match(index.body, /<a href="\/r\/oldrun-spec\/">/)
    const page = await get(hub.port, '/r/myapp-bookmarks/')
    assert.equal(page.status, 200)
    assert.match(page.body, /SDLC_STATUS/)
    assert.equal(page.headers.get('cross-origin-resource-policy'), 'same-origin', 'run files are same-origin only')
    assert.equal((await get(hub.port, '/r/myapp-bookmarks/index.html?x=1')).status, 200, 'query strings are ignored')
  } finally { await hub.stop() }
})

test('the index is a status board: counts band, phase chip, slice progress and relative times', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'index.html'), 'ok')
    const slices = Array.from({ length: 40 }, (_, i) => ({ status: i < 12 ? 'done' : 'in_progress' }))
    writeFileSync(join(out, 'status.json'), JSON.stringify({
      title: 'Bookmarks Service',
      updatedAt: new Date().toISOString(),
      current: { id: 'auth-r', title: 'Add refresh tokens', phase: 'implementer' },
      activity: { role: 'test-writer', target: 'auth-r' },
      slices,
    }))
    register(hub.dir, 'myapp-bookmarks', { repo: '/Users/me/myapp', startedAt: new Date(Date.now() - 60 * 1000).toISOString() })
    // a live pid but a heartbeat two hours old: stale, and the card says for how long it has been quiet
    register(hub.dir, 'oldrun-spec', { repo: '/Users/me/oldrun', startedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }, 2 * 3600)
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.match(index.body, /class="board"/, 'a summary band opens the page')
    assert.match(index.body, /<b>1<\/b> live/)
    assert.match(index.body, /<b>1<\/b> stale/)
    assert.match(index.body, /class="chip">test-writer</, 'the phase the run is in, as a chip')
    assert.match(index.body, /slice auth-r: Add refresh tokens/, 'what the run is on right now')
    assert.match(index.body, /12\/40 slices done/, 'slice progress off status.json')
    assert.match(index.body, /started 1 min ago/, 'relative, not an ISO timestamp')
    assert.match(index.body, /class="run stale"/, 'the stale run keeps its hook class')
    assert.match(index.body, /quiet 2 h/, 'stale says for how long')
    const staleCard = index.body.split('class="run stale"')[1] || ''
    assert.ok(!staleCard.includes('class="chip"'), '…but shows no phase chip once stale')
    // a run whose heartbeat is fresh but whose pid just died: "quiet just now" reads wrong, so it stays "updated"
    register(hub.dir, 'fresh-dead', { pid: 2147483647 })
    const body = (await get(hub.port, '/')).body
    const deadCard = body.split('<a href="/r/fresh-dead/">')[1] || ''
    assert.match(deadCard, /updated just now/, 'a just-dead run does not say "quiet just now"')
  } finally { await hub.stop() }
})

test("the index shows each run's verify economics from its slices' ledger rows", { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'index.html'), 'ok')
    writeFileSync(join(out, 'status.json'), JSON.stringify({
      title: 'Bookmarks Service',
      run: { label: 'Current run', agents: 12, cap: 850 },
      slices: [
        { id: 'S-1', title: 'Store', status: 'done', ledger: [
          { kind: 'verify', round: 0, outcome: 'refuted', refutations: 2, failingTests: 1 },
          { kind: 'verify', round: 1, outcome: 'verified', refutations: 0, failingTests: 0 },
        ] },
        { id: 'S-2', title: 'List', status: 'in_progress', ledger: [
          { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
          { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
        ] },
      ],
    }))
    register(hub.dir, 'myapp-bookmarks')
    // a run whose slices carry no ledger rows yet shows no economics band
    const plain = join(hub.dir, 'plain')
    mkdirSync(plain, { recursive: true })
    writeFileSync(join(plain, 'index.html'), 'ok')
    writeFileSync(join(plain, 'status.json'), JSON.stringify({ title: 'Plain run' }))
    register(hub.dir, 'plain-run', { out: plain })
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.equal((index.body.match(/class="econ"/g) || []).length, 1, 'only the run with ledger rows carries the band')
    assert.match(index.body, /1\/1<\/b> refuted fixed/, 'one refuted slice, fixed by the later verified round')
    assert.match(index.body, /<b>2<\/b> infra retries/)
    assert.match(index.body, /max fix round <b>1<\/b>/)
    assert.match(index.body, /r0×1 · r1×1/, 'the fix-round distribution: one slice at round 0, one at round 1')
    assert.match(index.body, /<b>3<\/b> run agents\/verify round/, '12 journal agents over 4 verify rounds')
    // the label notes the numerator is run-wide, not the battery alone
    assert.match(index.body, /run-wide/)
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

test('an embedded null byte in a run path is a 404, never a traceback', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'index.html'), 'ok')
    register(hub.dir, 'myapp-bookmarks')
    const res = await rawGet(hub.port, '/r/myapp-bookmarks/%00')
    assert.match(res, /^HTTP\/1\.[01] 404/, 'open() sees a null byte as a ValueError, handled like any miss')
  } finally { await hub.stop() }
})

test('an entry with a null repo or a non-string status title never 500s the index', { skip: !python && 'python3 not installed' }, async () => {
  const hub = await runningHub()
  try {
    const out = join(hub.dir, 'out')
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'status.json'), JSON.stringify({ title: 42 }))
    register(hub.dir, 'odd-entry', { repo: null })
    const index = await get(hub.port, '/')
    assert.equal(index.status, 200)
    assert.match(index.body, /<a href="\/r\/odd-entry\/">odd-entry<\/a>/, 'a non-string title falls back to the run id')
    assert.doesNotMatch(index.body, /null/, 'a null repo is not interpolated as-is')
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

// python with the tracker dir importable and the registry pointed at a scratch dir
function collectPy(dir, code) {
  return spawnSync('python3', ['-c', `
import os, sys
os.environ["SDLC_HUB_DIR"] = ${JSON.stringify(dir)}
sys.path.insert(0, ${JSON.stringify(join(SKILL_DIR, 'tracker'))})
import collect
` + code], { encoding: 'utf8' })
}

test('run_id slugs the repo dir and the spec path, and a same-named repo elsewhere gets a hash suffix', { skip: !python && 'python3 not installed' }, () => {
  const dir = scratch('sdlc-hub-reg-')
  const base = scratch('sdlc-hub-repos-')
  const repoA = join(base, 'one', 'myapp')
  const repoB = join(base, 'two', 'myapp')
  for (const r of [repoA, repoB]) {
    mkdirSync(join(r, '.sdlc'), { recursive: true })
    writeFileSync(join(r, '.sdlc', 'config.json'), JSON.stringify({ specPath: 'specs/Bookmarks Service.md' }))
  }
  const r = collectPy(dir, `
print(collect.run_id(${JSON.stringify(repoA)}))
collect.register(${JSON.stringify(repoA)}, ${JSON.stringify(join(repoA, '.sdlc', 'tracker'))}, collect.run_id(${JSON.stringify(repoA)}))
print(collect.run_id(${JSON.stringify(repoB)}))
`)
  assert.equal(r.status, 0, r.stderr)
  const [first, second] = r.stdout.trim().split('\n')
  assert.equal(first, 'myapp-bookmarks-service')
  assert.match(second, /^myapp-bookmarks-service-[0-9a-f]{6}$/)
})

test('run_id slugs a repo dir whose name is outside the hub id alphabet', { skip: !python && 'python3 not installed' }, () => {
  const dir = scratch('sdlc-hub-reg-')
  const repo = join(scratch('sdlc-hub-repos-'), 'my app')
  mkdirSync(join(repo, '.sdlc'), { recursive: true })
  writeFileSync(join(repo, '.sdlc', 'config.json'), JSON.stringify({ specPath: 'spec.md' }))
  const r = collectPy(dir, `print(collect.run_id(${JSON.stringify(repo)}))`)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout.trim(), 'my-app-spec')
})

test('register writes the registration atomically, and heartbeat refreshes its mtime', { skip: !python && 'python3 not installed' }, () => {
  const dir = scratch('sdlc-hub-reg-')
  const r = collectPy(dir, `
import json, os, time
print(collect.register("/repo", "/out", "rid-1"))
path = os.path.join(${JSON.stringify(dir)}, "runs", "rid-1.json")
before = os.path.getmtime(path)
entry = json.load(open(path))
print(entry["id"], entry["repo"], entry["out"], entry["pid"] == os.getpid(), bool(entry["startedAt"]))
time.sleep(0.05)
collect.heartbeat("rid-1")
print(os.path.getmtime(path) > before)
print(sorted(os.listdir(os.path.join(${JSON.stringify(dir)}, "runs"))))
`)
  assert.equal(r.status, 0, r.stderr)
  const lines = r.stdout.trim().split('\n')
  assert.equal(lines[0], 'True', 'a landed registration reports success')
  assert.equal(lines[1], 'rid-1 /repo /out True True')
  assert.equal(lines[2], 'True', 'the heartbeat moved the mtime')
  assert.equal(lines[3], "['rid-1.json']", 'no temp file is left behind')
})

test('an unwritable registry warns and carries on, reporting failure', { skip: !python && 'python3 not installed' }, () => {
  const bad = join(scratch('sdlc-hub-bad-'), 'a-file')
  writeFileSync(bad, 'not a directory')
  const r = collectPy(bad, `print(collect.register("/repo", "/out", "rid-1"))\nprint("survived")`)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stderr, /hub registration failed/)
  const lines = r.stdout.trim().split('\n')
  assert.equal(lines[0], 'False', 'the caller is told the registration did not land (and must not publish a url)')
  assert.equal(lines[1], 'survived')
})

test('the hub contract: port 8787 and ~/.sdlc/hub when the test overrides are absent', { skip: !python && 'python3 not installed' }, () => {
  const env = { ...process.env }
  delete env.SDLC_HUB_PORT
  delete env.SDLC_HUB_DIR
  const r = spawnSync('python3', ['-c', `
import sys
sys.path.insert(0, ${JSON.stringify(join(SKILL_DIR, 'tracker'))})
import hub
print(hub.hub_port())
print(hub.hub_dir())
`], { encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  const [port, dir] = r.stdout.trim().split('\n')
  assert.equal(port, '8787', 'the fixed port is 8787')
  assert.match(dir, /\.sdlc\/hub$/, 'the hub dir is ~/.sdlc/hub')
})

const COLLECT = join(SKILL_DIR, 'tracker', 'collect.py')
// the first build also collects the machine readings, which on macOS reads the whole power log
const FIRST_BUILD_MS = 45000

// the smallest repo collect.py will build a page from (mirrors tracker.test.mjs's fixtureRepo)
function fixtureRepo() {
  const repo = scratch('sdlc-hub-run-')
  const s = join(repo, '.sdlc')
  mkdirSync(s)
  writeFileSync(join(repo, 'spec.md'), '# Bookmarks Service\n')
  writeFileSync(join(s, 'config.json'), JSON.stringify({ specPath: 'spec.md' }))
  writeFileSync(join(s, 'requirements.json'), '[]')
  writeFileSync(join(s, 'slices.json'), '[]')
  writeFileSync(join(s, 'milestones.json'), '[]')
  writeFileSync(join(s, 'log.jsonl'), '')
  writeFileSync(join(s, 'DECISIONS.md'), '# Decisions\n')
  return repo
}

// a run publishing through a hub on a scratch port and registry; the hub itself is spawned by collect
async function publishing() {
  const repo = fixtureRepo()
  const dir = scratch('sdlc-hub-')
  const port = await freePort()
  const env = { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }
  const proc = spawn('python3', [COLLECT, '--repo', repo, '--publish'], { stdio: 'ignore', env })
  const done = exited(proc)
  const stop = async () => {
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await done
  }
  // the hub lingers by design; the test kills it by its pid file, but only once it is done
  // reading the index off it (a dead hub answers nothing, so this is the last step, never part of stop)
  const killHub = () => {
    try { process.kill(Number(readFileSync(join(dir, 'hub.pid'), 'utf8')), 'SIGTERM') } catch {}
  }
  return { repo, dir, port, out: join(repo, '.sdlc', 'tracker'), urlFile: join(repo, '.sdlc', 'tracker', 'url'), stop, killHub }
}

test('--publish registers the run and the hub serves its page at the fixed url', { skip: !python && 'python3 not installed' }, async () => {
  const run = await publishing()
  try {
    assert.ok(await until(() => existsSync(run.urlFile), FIRST_BUILD_MS), 'published a url')
    const ids = readdirSync(join(run.dir, 'runs')).filter(f => f.endsWith('.json'))
    assert.equal(ids.length, 1, 'one registration')
    const id = ids[0].replace(/\.json$/, '')
    assert.match(id, /-spec$/, 'the fixture spec is spec.md')
    // the url appears only once there is a page behind it, so opening it never lands on a blank page
    assert.ok(existsSync(join(run.out, 'index.html')), 'the page was built before the url was published')
    assert.equal(readFileSync(run.urlFile, 'utf8').trim(), `http://127.0.0.1:${run.port}/r/${id}/`)
    const page = await get(run.port, `/r/${id}/index.html`)
    assert.equal(page.status, 200)
    assert.match(page.body, /SDLC_STATUS/)
    assert.equal((await get(run.port, `/r/${id}/live.js`)).status, 200)
    assert.match((await get(run.port, '/')).body, new RegExp(`class="run live"[^]*href="/r/${id}/"`), 'the index lists the run as live')
  } finally { await run.stop() }
  try {
    assert.equal(existsSync(run.urlFile), false, 'the url is withdrawn when the watcher stops')
    const index = await get(run.port, '/')
    assert.match(index.body, /class="run stale"/, 'the finished run greys but stays browsable')
  } finally { run.killHub() }
})

test('a foreign process on the hub port is an error, never a silent move to another port', { skip: !python && 'python3 not installed' }, async () => {
  const port = await freePort()
  const foreign = httpServer((req, res) => { res.writeHead(404); res.end() })
  await new Promise(r => foreign.listen(port, '127.0.0.1', r))
  const repo = fixtureRepo()
  const dir = scratch('sdlc-hub-')
  const env = { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }
  let stderr = ''
  const proc = spawn('python3', [COLLECT, '--repo', repo, '--publish'], { env })
  proc.stderr.on('data', d => { stderr += d })
  const done = exited(proc)
  try {
    const out = join(repo, '.sdlc', 'tracker')
    assert.ok(await until(() => existsSync(join(out, 'index.html')), FIRST_BUILD_MS), 'the page is still built')
    assert.ok(await until(() => stderr.includes('lsof'), 5000), 'the error names how to find the squatter')
    // give the watcher a beat to prove it never publishes
    await new Promise(r => setTimeout(r, 1500))
    assert.equal(existsSync(join(out, 'url')), false, 'no url is written')
    assert.equal(readdirSync(dir).includes('hub.pid'), false, 'and no hub was spawned over the foreign one')
  } finally {
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await done
    foreign.close()
  }
})

test('a foreign 200 with the wrong body is still a foreign server, never a doomed hub spawn', { skip: !python && 'python3 not installed' }, async () => {
  const port = await freePort()
  const foreign = httpServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('not the hub') })
  await new Promise(r => foreign.listen(port, '127.0.0.1', r))
  const repo = fixtureRepo()
  const dir = scratch('sdlc-hub-')
  const env = { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }
  let stderr = ''
  const proc = spawn('python3', [COLLECT, '--repo', repo, '--publish'], { env })
  proc.stderr.on('data', d => { stderr += d })
  const done = exited(proc)
  try {
    const out = join(repo, '.sdlc', 'tracker')
    assert.ok(await until(() => existsSync(join(out, 'index.html')), FIRST_BUILD_MS), 'the page is still built')
    assert.ok(await until(() => stderr.includes('lsof'), 5000), 'a wrong-body 200 gets the squatter error, not a spawn')
    // give the watcher a beat to prove it never publishes
    await new Promise(r => setTimeout(r, 1500))
    assert.equal(existsSync(join(out, 'url')), false, 'no url is written')
    assert.equal(readdirSync(dir).includes('hub.pid'), false, 'and no hub was spawned over the foreign one')
  } finally {
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await done
    foreign.close()
  }
})

test('a hub dir blocked by a plain file warns, and the watcher carries on unpublished', { skip: !python && 'python3 not installed' }, async () => {
  const port = await freePort()
  const repo = fixtureRepo()
  const dir = join(scratch('sdlc-hub-bad-'), 'a-file')
  writeFileSync(dir, 'not a directory')
  const env = { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }
  let stderr = ''
  const proc = spawn('python3', [COLLECT, '--repo', repo, '--publish'], { env })
  proc.stderr.on('data', d => { stderr += d })
  const done = exited(proc)
  try {
    const out = join(repo, '.sdlc', 'tracker')
    assert.ok(await until(() => existsSync(join(out, 'index.html')), FIRST_BUILD_MS), 'the page is still built')
    assert.ok(await until(() => stderr.includes('could not be started'), 5000), 'warned instead of dying with a traceback')
    assert.doesNotMatch(stderr, /Traceback/, 'a hub failure never crashes the loop')
    assert.equal(proc.exitCode, null, 'the watcher is still running')
    assert.equal(existsSync(join(out, 'url')), false, 'no url is written')
  } finally {
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await done
  }
})

test('a watcher that started behind a squatter publishes once a real hub appears', { skip: !python && 'python3 not installed' }, async () => {
  const port = await freePort()
  const squatter = httpServer((req, res) => { res.writeHead(404, { Connection: 'close' }); res.end() })
  await new Promise(r => squatter.listen(port, '127.0.0.1', r))
  const repo = fixtureRepo()
  const dir = scratch('sdlc-hub-')
  // an explicit --watch 1 overrides the 60 s --publish implies; the journal keeps the watcher from idling out
  const journal = join(scratch('sdlc-hub-journal-'), 'journal.jsonl')
  writeFileSync(journal, '')
  const env = { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }
  const proc = spawn('python3', [COLLECT, '--repo', repo, '--publish', '--watch', '1', '--journal', journal], { stdio: 'ignore', env })
  const done = exited(proc)
  const out = join(repo, '.sdlc', 'tracker')
  const urlFile = join(out, 'url')
  try {
    assert.ok(await until(() => existsSync(join(out, 'index.html')), FIRST_BUILD_MS), 'the first build landed')
    assert.equal(existsSync(urlFile), false, 'unpublished while the port is squatted')
    // freeze the watcher so it cannot observe the handover gap (a free port) and spawn a hub itself
    proc.kill('SIGSTOP')
    await new Promise(r => { squatter.close(r); squatter.closeAllConnections() })
    // the squatter is gone and another run's hub takes the port
    const hubProc = spawn('python3', [HUB], { env: { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }, stdio: 'ignore' })
    const hubDone = exited(hubProc)
    try {
      assert.ok(await until(async () => (await get(port, '/health')).body === 'sdlc-hub', 5000), 'the real hub is up')
      proc.kill('SIGCONT')
      assert.ok(await until(() => existsSync(urlFile), 15000), 'the next build re-ensured and published')
      const id = readFileSync(urlFile, 'utf8').trim().split('/r/')[1].replace(/\/$/, '')
      const page = await get(port, `/r/${id}/index.html`)
      assert.equal(page.status, 200)
      assert.match(page.body, /SDLC_STATUS/, 'the hub serves the run page')
    } finally { hubProc.kill(); await hubDone }
  } finally {
    proc.kill('SIGCONT') // a stopped process never notices the pid file going away
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await done
    squatter.close()
  }
})

test('two runs publish side by side through the one hub', { skip: !python && 'python3 not installed' }, async () => {
  const a = await publishing()
  const bDir = { port: a.port, dir: a.dir } // same hub, another repo
  const bRepo = fixtureRepo()
  const env = { ...process.env, SDLC_HUB_PORT: String(bDir.port), SDLC_HUB_DIR: bDir.dir }
  const bProc = spawn('python3', [COLLECT, '--repo', bRepo, '--publish'], { stdio: 'ignore', env })
  const bDone = exited(bProc)
  const bUrl = join(bRepo, '.sdlc', 'tracker', 'url')
  try {
    assert.ok(await until(() => existsSync(a.urlFile), FIRST_BUILD_MS), 'the first run published')
    assert.ok(await until(() => existsSync(bUrl), FIRST_BUILD_MS), 'the second run published')
    assert.notEqual(readFileSync(a.urlFile, 'utf8'), readFileSync(bUrl, 'utf8'), 'distinct run urls')
    const index = (await get(a.port, '/')).body
    assert.equal((index.match(/class="run live"/g) || []).length, 2, 'both runs on the one index')
  } finally {
    await a.stop()
    try { execFileSync('python3', [COLLECT, '--repo', bRepo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await bDone
    a.killHub()
  }
})

test('the docs speak of the hub and the fixed port, never of per-run serving', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const readme = readFileSync(join(SKILL_DIR, '..', '..', 'README.md'), 'utf8')
  const collect = readFileSync(join(SKILL_DIR, 'tracker', 'collect.py'), 'utf8')
  for (const [name, text] of [['SKILL.md', skill], ['README.md', readme], ['collect.py', collect]]) {
    assert.doesNotMatch(text, /--serve\b/, `${name} no longer mentions --serve`)
    assert.doesNotMatch(text, /--host\b/, `${name} no longer mentions --host`)
    assert.doesNotMatch(text, /next free port/, `${name} no longer drifts ports`)
  }
  assert.match(skill, /--publish/)
  assert.match(readme, /--publish/)
})
