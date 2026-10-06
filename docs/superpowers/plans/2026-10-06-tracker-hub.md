# Tracker Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One fixed port (8787) on the machine serves an index of every registered sdlc run and each run's tracker page, replacing the per-run next-free-port servers.

**Architecture:** A new stdlib-only `hub.py` binds 127.0.0.1:8787, reads registration files from `~/.sdlc/hub/runs/`, serves an index at `/` and each run's tracker directory at `/r/<id>/`. `collect.py --publish` (replacing `--serve`) ensures the hub is up, registers the run (mtime = heartbeat), and writes the fixed url to `.sdlc/tracker/url`. Runs never bind ports.

**Tech Stack:** Python 3 standard library (`http.server`, `urllib`), node:test harness spawning `python3`.

**Spec:** `docs/superpowers/specs/2026-10-06-tracker-hub-design.md`

**Spec deviation to flag (approved in plan review, or amend):** the spec says both "the watcher deletes its registration on exit" and "a finished run's results stay browsable" — they conflict. This plan keeps the registration on exit: it greys after 90 s and prunes after 24 h, so finished runs stay browsable. The url file is still withdrawn on exit, as today.

## Global Constraints

- Python 3 standard library only — no pip installs, matching the rest of the tracker.
- Tests run with `npm test` (`node --test skills/sdlc/test/*.test.mjs`, node ≥ 20); Python is exercised by spawning `python3`.
- The hub binds `127.0.0.1` only; the default port is 8787, fixed. `SDLC_HUB_DIR` and `SDLC_HUB_PORT` env overrides exist as test seams only.
- A tracker/hub failure never stops the loop: warn once to stderr and carry on.
- `sys.dont_write_bytecode = True` in every Python file (no `__pycache__` inside the installed plugin).
- Comments match the codebase style: lowercase sentence explaining *why*.

## Review Focus

1. **Foreign process on 8787** → the run builds its page, prints the `lsof` hint, writes no url, never serves elsewhere (Task 3, foreign-port test).
2. **Corrupt registration file** (kill -9 mid-write) → the index skips it, never 500s (Task 1, corrupt-entry test).
3. **Encoded path traversal** (`/r/<id>/%2e%2e/…`) → nothing outside the run's `out` dir is served (Task 1, raw-socket traversal test).
4. **Dead watcher whose pid got reused by another process** → the 90 s heartbeat staleness greys it, not the pid check alone (Task 1, stale-with-alive-pid test).
5. **Unwritable `~/.sdlc/hub`** → registration warns and the run carries on (Task 2, unwritable-registry test).

---

### Task 1: `hub.py` — the fixed-port hub

**Files:**
- Create: `skills/sdlc/tracker/hub.py`
- Test: `skills/sdlc/test/hub.test.mjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (Tasks 2 and 3 rely on these exact names in `hub.py`): `HEALTH_BODY = b"sdlc-hub"`, `hub_dir() -> str`, `hub_port() -> int`, `runs_dir() -> str`. The hub writes `<hub_dir>/hub.pid` holding its pid on startup.

- [ ] **Step 1: Write the failing tests**

Create `skills/sdlc/test/hub.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/hub.test.mjs`
Expected: FAIL — `python3 .../hub.py` does not exist (spawn errors / health never answers).

- [ ] **Step 3: Write `hub.py`**

Create `skills/sdlc/tracker/hub.py`:

```python
#!/usr/bin/env python3
"""The sdlc tracker hub: one fixed port on the machine for every run's tracker page.

Runs register by writing <hub dir>/runs/<id>.json ({id, repo, out, pid, startedAt}); the
file's mtime is the heartbeat. The hub only reads that directory: GET / lists the runs,
GET /r/<id>/... serves files from the run's tracker directory, and GET /health answers the
marker a run checks before reusing the port. Python 3 standard library only.

SDLC_HUB_DIR and SDLC_HUB_PORT exist for the tests; nothing a user sets.
"""
import html
import json
import mimetypes
import os
import re
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.dont_write_bytecode = True  # no __pycache__ inside the installed plugin

HEALTH_BODY = b"sdlc-hub"
# an entry is live while its heartbeat is younger than this; older ones show greyed ...
LIVE_SECONDS = 90
# ... and are pruned once they have been quiet this long
PRUNE_SECONDS = 24 * 3600
ID_CHARS = re.compile(r"[\w.~-]+")


def hub_dir():
    return os.environ.get("SDLC_HUB_DIR") or os.path.join(os.path.expanduser("~"), ".sdlc", "hub")


def hub_port():
    return int(os.environ.get("SDLC_HUB_PORT") or 8787)


def runs_dir():
    return os.path.join(hub_dir(), "runs")


def pid_alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError, OverflowError):
        return False


def find_entry(rid):
    if not ID_CHARS.fullmatch(rid):
        return None
    try:
        with open(os.path.join(runs_dir(), rid + ".json")) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def read_entries(now):
    """The registered runs as (live, stale); files quiet for a day are pruned instead."""
    live, stale = [], []
    try:
        names = sorted(os.listdir(runs_dir()))
    except OSError:
        return live, stale
    for name in names:
        if not name.endswith(".json"):
            continue
        path = os.path.join(runs_dir(), name)
        try:
            with open(path) as f:
                entry = json.load(f)
            age = now - os.path.getmtime(path)
        except (OSError, ValueError):
            continue  # a half-written or corrupt entry is skipped, never 500s the index
        if age >= PRUNE_SECONDS:
            try:
                os.remove(path)
            except OSError:
                pass
            continue
        if not entry.get("id") or not entry.get("out"):
            continue
        (live if age < LIVE_SECONDS and pid_alive(entry.get("pid")) else stale).append(entry)
    return live, stale


def title_of(entry):
    try:
        with open(os.path.join(entry["out"], "status.json")) as f:
            return json.load(f).get("title") or entry["id"]
    except (OSError, ValueError):
        return entry["id"]


INDEX = """<!doctype html>
<html><head><meta charset="utf-8"><title>sdlc runs on this machine</title>
<meta http-equiv="refresh" content="30">
<style>
body {{ font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 52rem; padding: 0 1rem; }}
li {{ margin: .6rem 0; }} .stale a {{ color: #888; }}
.meta {{ color: #888; font-size: .85em; }}
</style></head>
<body><h1>sdlc runs on this machine</h1><ul>
{items}
</ul></body></html>"""


def index_page(now):
    live, stale = read_entries(now)
    items = []
    for cls, entries in (("live", live), ("stale", stale)):
        for e in entries:
            items.append(
                '<li class="%s"><a href="/r/%s/">%s</a> <span class="meta">%s · %s · started %s · %s</span></li>'
                % (cls, urllib.parse.quote(e["id"]), html.escape(title_of(e)), html.escape(e["id"]),
                   html.escape(e.get("repo", "")), html.escape(e.get("startedAt", "?")), cls))
    return INDEX.format(items="\n".join(items) or '<li class="meta">No sdlc run is registered on this machine yet.</li>')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # the open pages poll every 2 s; a request line each is noise

    def send_body(self, code, body, ctype="text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.unquote(self.path.split("?", 1)[0])
        if path == "/health":
            self.send_body(200, HEALTH_BODY, "text/plain")
            return
        if path in ("", "/"):
            self.send_body(200, index_page(time.time()).encode())
            return
        m = re.fullmatch(r"/r/([^/]+)(/.*)?", path)
        entry = find_entry(m.group(1)) if m else None
        if entry is None:
            self.send_body(404, b"no such run\n", "text/plain")
            return
        self.serve_run_file(entry, (m.group(2) or "/").lstrip("/"))

    def serve_run_file(self, entry, rest):
        root = os.path.realpath(entry["out"])
        try:
            target = os.path.realpath(os.path.join(root, rest or "index.html"))
            inside = os.path.commonpath((root, target)) == root
        except ValueError:
            inside = False
        if inside and os.path.isdir(target):
            target = os.path.join(target, "index.html")
        # realpath resolves the dots: anything that lands outside the run's directory is refused
        if not inside or not os.path.isfile(target):
            self.send_body(404, b"not found\n", "text/plain")
            return
        try:
            with open(target, "rb") as f:
                body = f.read()
        except OSError:
            self.send_body(404, b"not found\n", "text/plain")
            return
        self.send_body(200, body, mimetypes.guess_type(target)[0] or "application/octet-stream")


def main():
    os.makedirs(runs_dir(), exist_ok=True)
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", hub_port()), Handler)
    except OSError:
        # two runs raced to spawn the hub; the winner is already serving
        raise SystemExit(f"port {hub_port()} is already taken; the other hub serves the runs")
    # so a user (or a test) can find and stop the hub: kill "$(cat ~/.sdlc/hub/hub.pid)"
    with open(os.path.join(hub_dir(), "hub.pid"), "w") as f:
        f.write(str(os.getpid()))
    print(f"sdlc hub on http://127.0.0.1:{httpd.server_address[1]}/", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test skills/sdlc/test/hub.test.mjs`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add skills/sdlc/tracker/hub.py skills/sdlc/test/hub.test.mjs
git commit -m "feat(tracker): the hub, one fixed port listing and serving every run"
```

### Task 2: `collect.py` registration helpers

**Files:**
- Modify: `skills/sdlc/tracker/collect.py` (imports, new functions only — no wiring yet)
- Test: `skills/sdlc/test/hub.test.mjs`

**Interfaces:**
- Consumes: `hub.runs_dir()` from Task 1.
- Produces (Task 3 relies on these exact names in `collect.py`): `run_id(repo) -> str`, `register(repo, out, rid) -> None`, `heartbeat(rid) -> None`.

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/hub.test.mjs`:

```js
import { spawnSync } from 'node:child_process'  // merge into the existing child_process import
import { readdirSync, readFileSync } from 'node:fs'  // merge into the existing fs import

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
  const dir = mkdtempSync(join(tmpdir(), 'sdlc-hub-reg-'))
  const base = mkdtempSync(join(tmpdir(), 'sdlc-hub-repos-'))
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

test('register writes the registration atomically, and heartbeat refreshes its mtime', { skip: !python && 'python3 not installed' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'sdlc-hub-reg-'))
  const r = collectPy(dir, `
import json, os, time
collect.register("/repo", "/out", "rid-1")
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
  assert.equal(lines[0], 'rid-1 /repo /out True True')
  assert.equal(lines[1], 'True', 'the heartbeat moved the mtime')
  assert.equal(lines[2], "['rid-1.json']", 'no temp file is left behind')
})

test('an unwritable registry warns and carries on', { skip: !python && 'python3 not installed' }, () => {
  const bad = join(mkdtempSync(join(tmpdir(), 'sdlc-hub-bad-')), 'a-file')
  writeFileSync(bad, 'not a directory')
  const r = collectPy(bad, `collect.register("/repo", "/out", "rid-1")\nprint("survived")`)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stderr, /hub registration failed/)
  assert.match(r.stdout, /survived/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/hub.test.mjs`
Expected: FAIL — `AttributeError: module 'collect' has no attribute 'run_id'`.

- [ ] **Step 3: Add the registration helpers to `collect.py`**

In `skills/sdlc/tracker/collect.py`, extend the imports: add `hashlib` to the stdlib block (alphabetical, before `http.server`), and add `import hub  # noqa: E402` above `import reports  # noqa: E402` (alphabetical in the local-import block).

Add these functions after `read_json`:

```python
def spec_slug(repo):
    """The run id's second half, from the spec path recorded at pre-flight."""
    cfg = read_json(os.path.join(repo, ".sdlc", "config.json"), {}) or {}
    base = os.path.splitext(os.path.basename(cfg.get("specPath") or "run"))[0]
    slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    return slug or "run"


def run_id(repo):
    """<repo dir>-<spec slug>, stable across restarts; a same-named repo elsewhere gets a hash suffix."""
    rid = f"{os.path.basename(repo)}-{spec_slug(repo)}"
    other = read_json(os.path.join(hub.runs_dir(), rid + ".json"), None)
    if other and other.get("repo") != repo:
        rid = f"{rid}-{hashlib.sha1(repo.encode()).hexdigest()[:6]}"
    return rid


def register(repo, out, rid):
    """Announce this run to the hub; rewriting the file refreshes the heartbeat that is its mtime."""
    try:
        os.makedirs(hub.runs_dir(), exist_ok=True)
        tmp = os.path.join(hub.runs_dir(), f".{rid}.{os.getpid()}.tmp")
        with open(tmp, "w") as f:
            json.dump({"id": rid, "repo": repo, "out": out, "pid": os.getpid(),
                       "startedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}, f)
        # the rename means the hub never reads half a registration
        os.replace(tmp, os.path.join(hub.runs_dir(), rid + ".json"))
    except OSError as e:
        print(f"hub registration failed (the page is still built): {e}", file=sys.stderr)


def heartbeat(rid):
    try:
        os.utime(os.path.join(hub.runs_dir(), rid + ".json"))
    except OSError:
        pass
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test skills/sdlc/test/hub.test.mjs`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add skills/sdlc/tracker/collect.py skills/sdlc/test/hub.test.mjs
git commit -m "feat(tracker): register a run with the hub, heartbeat by mtime"
```

### Task 3: `collect.py --publish` and the end of per-run servers

**Files:**
- Modify: `skills/sdlc/tracker/collect.py` (docstring, argparse, `main()`; delete `QuietHandler` and `serve()`)
- Modify: `skills/sdlc/test/tracker.test.mjs` (delete the old `--serve` test and its `serving()` helper)
- Test: `skills/sdlc/test/hub.test.mjs`

**Interfaces:**
- Consumes: `run_id`, `register`, `heartbeat` (Task 2); `hub.hub_port()`, `hub.hub_dir()`, `hub.HEALTH_BODY` (Task 1).
- Produces: `--publish` flag; `.sdlc/tracker/url` contains `http://127.0.0.1:<hub_port>/r/<id>/`.

- [ ] **Step 1: Write the failing integration tests**

Append to `skills/sdlc/test/hub.test.mjs` (also add `import { createServer as httpServer } from 'node:http'` to the imports):

```js
const COLLECT = join(SKILL_DIR, 'tracker', 'collect.py')
// the first build also collects the machine readings, which on macOS reads the whole power log
const FIRST_BUILD_MS = 45000

// the smallest repo collect.py will build a page from (mirrors tracker.test.mjs's fixtureRepo)
function fixtureRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-hub-run-'))
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
  const dir = mkdtempSync(join(tmpdir(), 'sdlc-hub-'))
  const port = await freePort()
  const env = { ...process.env, SDLC_HUB_PORT: String(port), SDLC_HUB_DIR: dir }
  const proc = spawn('python3', [COLLECT, '--repo', repo, '--publish'], { stdio: 'ignore', env })
  const done = exited(proc)
  const stop = async () => {
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await done
    // the hub lingers by design; the test kills it by its pid file
    try { process.kill(Number(readFileSync(join(dir, 'hub.pid'), 'utf8')), 'SIGTERM') } catch {}
  }
  return { repo, dir, port, out: join(repo, '.sdlc', 'tracker'), urlFile: join(repo, '.sdlc', 'tracker', 'url'), stop }
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
    assert.match((await get(run.port, '/')).body, new RegExp(`class="live"><a href="/r/${id}/"`), 'the index lists the run as live')
  } finally { await run.stop() }
  assert.equal(existsSync(run.urlFile), false, 'the url is withdrawn when the watcher stops')
  const index = await get(run.port, '/')
  assert.match(index.body, /class="stale"/, 'the finished run greys but stays browsable')
})

test('a foreign process on the hub port is an error, never a silent move to another port', { skip: !python && 'python3 not installed' }, async () => {
  const port = await freePort()
  const foreign = httpServer((req, res) => { res.writeHead(404); res.end() })
  await new Promise(r => foreign.listen(port, '127.0.0.1', r))
  const repo = fixtureRepo()
  const dir = mkdtempSync(join(tmpdir(), 'sdlc-hub-'))
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
    assert.equal((index.match(/class="live"/g) || []).length, 2, 'both runs on the one index')
  } finally {
    await a.stop()
    try { execFileSync('python3', [COLLECT, '--repo', bRepo, '--stop-watch'], { stdio: 'ignore', env }) } catch {}
    await bDone
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/hub.test.mjs`
Expected: FAIL — `collect.py: error: unrecognized arguments: --publish`.

- [ ] **Step 3: Rewire `collect.py`**

In `skills/sdlc/tracker/collect.py`:

1. Update the module docstring's Usage block and tail paragraph to:

```
Usage:
  collect.py [--repo DIR] [--out DIR] [--journal FILE] [--run-label TEXT] [--run-cap N]
             [--watch SECONDS] [--publish]
```

and replace the last two sentences of the docstring ("With --serve it also serves…") with:

```
With --publish it announces the run to the machine's sdlc hub (hub.py, on 127.0.0.1:8787),
which serves the page at a fixed url written to <out>/url once there is a page behind it.
Python 3 standard library only.
```

2. Imports: remove `functools`, `http.server`, `threading`; add `urllib.error` and `urllib.request` at the end of the stdlib block.

3. Delete `QuietHandler` and `serve()` entirely.

4. Add after `heartbeat` (from Task 2):

```python
def hub_answers():
    """True for our hub, "foreign" for another server, False for nothing listening."""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{hub.hub_port()}/health", timeout=1) as res:
            return res.read() == hub.HEALTH_BODY
    except urllib.error.HTTPError:
        return "foreign"  # a server answered, but it is not ours
    except (urllib.error.URLError, OSError):
        return False


def ensure_hub():
    """Reuse the hub on the fixed port, spawn it if absent, and refuse a foreign one."""
    state = hub_answers()
    if state is True:
        return True
    if state == "foreign":
        print(f"port {hub.hub_port()} is taken by something that is not the sdlc hub "
              f"(find it with: lsof -i :{hub.hub_port()}); the page is built but not served", file=sys.stderr)
        return False
    os.makedirs(hub.hub_dir(), exist_ok=True)
    log = open(os.path.join(hub.hub_dir(), "hub.log"), "ab")
    subprocess.Popen([sys.executable, os.path.join(HERE, "hub.py")],
                     stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
    for _ in range(20):
        if hub_answers() is True:
            return True
        time.sleep(0.1)
    print("the sdlc hub did not come up; the page is built but not served", file=sys.stderr)
    return False
```

5. In `main()`'s argparse block, replace the `--serve` and `--host` arguments with:

```python
    ap.add_argument("--publish", action="store_true", help="publish the page through the machine's sdlc hub (implies --watch); the hub serves it at a fixed url on 127.0.0.1:8787")
```

6. In `main()`, replace:

```python
    if a.serve is not None:
        # a url only means something if the page keeps rebuilding behind it
        a.watch = a.watch or 60
```

with:

```python
    if a.publish:
        # a url only means something if the page keeps rebuilding behind it
        a.watch = a.watch or 60
```

and replace:

```python
    url_file = os.path.join(out, "url")
    server, url = serve(out, a.host, a.serve) if a.serve is not None else (None, None)
```

with:

```python
    url_file = os.path.join(out, "url")
    published = ensure_hub() if a.publish else False
    rid = run_id(repo) if published else None
```

7. In the full-build block, replace:

```python
                    if url:
                        # published only now, so a url that exists always has a page behind it
                        with open(url_file, "w") as f:
                            f.write(url)
                        url = None
```

with two blocks — first, just before it in the same `try`, the per-minute re-ensure the spec requires:

```python
                    if a.publish and hub_answers() is not True:
                        # the hub died mid-run; respawn it (or report a squatter) at the minute tick
                        published = ensure_hub()
                        rid = run_id(repo) if published else None
```

then the registration itself:

```python
                    if published:
                        # registered only now, so a url that exists always has a page behind it;
                        # rewriting the file is also the heartbeat, so this runs on every build
                        register(repo, out, rid)
                        with open(url_file, "w") as f:
                            f.write(f"http://127.0.0.1:{hub.hub_port()}/r/{rid}/\n")
```

8. In the live-rewrite branch, after `write_live(out, workflow.build(a.journal, SCRIPT, cache))`, add:

```python
                    if published:
                        heartbeat(rid)
```

9. In the `finally`, delete the `if server: server.shutdown()` block (keep the url-file removal). The registration file is deliberately *kept* on exit: the hub greys it after 90 s and prunes it after a day, so a finished run's page stays browsable.

- [ ] **Step 4: Delete the old serve test**

In `skills/sdlc/test/tracker.test.mjs`, delete the `serving()` helper, the `FIRST_BUILD_MS` constant (now in hub.test.mjs's scope), and the whole test `'--serve publishes a url for the page, and takes the next free port when that one is taken'` (they run from the `// --serve implies --watch…` comment to end of file). Check whether `FIRST_BUILD_MS` or `freePort`/`exited`/`until` are still used elsewhere in tracker.test.mjs; delete only what becomes unused.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test skills/sdlc/test/hub.test.mjs && node --test skills/sdlc/test/tracker.test.mjs`
Expected: PASS — 11 hub tests, and tracker.test.mjs green without the serve test.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all files, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add skills/sdlc/tracker/collect.py skills/sdlc/test/hub.test.mjs skills/sdlc/test/tracker.test.mjs
git commit -m "feat(tracker): publish through the hub instead of serving a per-run port"
```

### Task 4: Docs — SKILL.md and README

**Files:**
- Modify: `skills/sdlc/SKILL.md:83-93` (the watcher section)
- Modify: `README.md:120-141` (the tracker section)
- Test: `skills/sdlc/test/hub.test.mjs` (one source-level guard)

**Interfaces:**
- Consumes: the `--publish` flag from Task 3.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Append to `skills/sdlc/test/hub.test.mjs`:

```js
test('the docs speak of the hub and the fixed port, never of per-run serving', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const readme = readFileSync(join(SKILL_DIR, '..', 'README.md'), 'utf8')
  const collect = readFileSync(join(SKILL_DIR, 'tracker', 'collect.py'), 'utf8')
  for (const [name, text] of [['SKILL.md', skill], ['README.md', readme], ['collect.py', collect]]) {
    assert.doesNotMatch(text, /--serve\b/, `${name} no longer mentions --serve`)
    assert.doesNotMatch(text, /--host\b/, `${name} no longer mentions --host`)
    assert.doesNotMatch(text, /next free port/, `${name} no longer drifts ports`)
  }
  assert.match(skill, /--publish/)
  assert.match(readme, /--publish/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/sdlc/test/hub.test.mjs`
Expected: FAIL — SKILL.md and README.md still mention `--serve`.

- [ ] **Step 3: Rewrite the SKILL.md watcher section**

In `skills/sdlc/SKILL.md`, replace this paragraph and command:

```
**While a run is active,** keep the page live with a watcher that also serves it over http, so the user opens a url rather than a file. `--serve` implies `--watch 60`; run it detached so it does not block you and does not notify you when it exits:

```
nohup python3 "<SKILL_DIR>/tracker/collect.py" --repo "$REPO" --journal "<journal.jsonl>" --run-label "Run <n>" --serve >/dev/null 2>&1 &
```

It serves on port 8787, or the next free port up if that one is busy, and writes the url it took to `.sdlc/tracker/url` once there is a page behind it. Read that file and give the user the url. To reach it from another machine, pass `--host 0.0.0.0`; the page carries this repo's spec and decisions, so only do that when the user asks.
```

with:

```
**While a run is active,** keep the page live with a watcher that also publishes it through the machine's sdlc hub, so the user opens a url rather than a file. `--publish` implies `--watch 60`; run it detached so it does not block you and does not notify you when it exits:

```
nohup python3 "<SKILL_DIR>/tracker/collect.py" --repo "$REPO" --journal "<journal.jsonl>" --run-label "Run <n>" --publish >/dev/null 2>&1 &
```

The hub is one fixed address on the machine — `http://localhost:8787` — shared by every project: its index lists all running (and recently finished) workflows, and each run's page lives at `http://localhost:8787/r/<run-id>/`. The watcher spawns the hub if it is absent, registers the run, and writes the run's url to `.sdlc/tracker/url` once there is a page behind it. Read that file and give the user the url, along with the index url. If 8787 is held by something that is not the hub, the watcher says so and builds the page without serving it — it never moves to another port.
```

Then, in the next paragraph of the same section, replace ``--stop-watch` instead of `--serve`` with ``--stop-watch` instead of `--publish``, and replace "a watcher exits by itself once the run folder has been quiet for 45 minutes, taking its url with it" with "a watcher exits by itself once the run folder has been quiet for 45 minutes, taking its url with it; its entry on the hub's index greys and is pruned a day later".

- [ ] **Step 4: Rewrite the README tracker bits**

In `README.md`, replace:

```
`/sdlc` serves a progress tracker on `http://localhost:8787` and prints the url.
```

with:

```
`/sdlc` publishes its progress tracker to the sdlc hub on `http://localhost:8787` — one fixed address per machine, whose index lists every project's run — and prints the run's url.
```

Replace:

```
python3 skills/sdlc/tracker/collect.py --repo /path/to/your/project --serve
```

with:

```
python3 skills/sdlc/tracker/collect.py --repo /path/to/your/project --publish
```

and replace:

```
It binds `127.0.0.1` only. Pass `--host 0.0.0.0` to reach it from another machine on your network; the page carries this repo's spec and decisions, so do that only when you mean it. If 8787 is busy it takes the next free port and writes the url it used to `.sdlc/tracker/url`. Drop `--serve` to build the file without serving it.
```

with:

```
The hub binds `127.0.0.1` only — the page carries this repo's spec and decisions, so it stays on the machine. Every run on the machine is listed at `http://localhost:8787`; this run's page is at the url written to `.sdlc/tracker/url` once there is a page behind it. If 8787 is held by something that is not the hub, the run says so and builds the page without serving it. Drop `--publish` to build the file without serving it.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all files, 0 failures.

- [ ] **Step 6: Smoke-test the real flow**

Run from the clone root (so `COLLECT` below is absolute before the `cd`):

```bash
COLLECT="$PWD/skills/sdlc/tracker/collect.py"
repo=$(mktemp -d)
mkdir -p "$repo/.sdlc"
cd "$repo" && git init -q .
printf '# Demo\n' > spec.md
printf '{"specPath":"spec.md"}' > .sdlc/config.json
printf '[]' > .sdlc/requirements.json; printf '[]' > .sdlc/slices.json; printf '[]' > .sdlc/milestones.json
touch .sdlc/log.jsonl; printf '# Decisions\n' > .sdlc/DECISIONS.md
python3 "$COLLECT" --repo "$repo" --publish &
sleep 20   # the first build reads the macOS power log; give it room
open http://localhost:8787/
open "$(cat "$repo/.sdlc/tracker/url")"
python3 "$COLLECT" --repo "$repo" --stop-watch
kill "$(cat ~/.sdlc/hub/hub.pid)"
```

Expected: the index lists the run as live, then greyed after the stop; the run page renders.

- [ ] **Step 7: Commit**

```bash
git add skills/sdlc/SKILL.md README.md skills/sdlc/test/hub.test.mjs
git commit -m "docs(tracker): the hub's fixed address in SKILL.md and the README"
```
