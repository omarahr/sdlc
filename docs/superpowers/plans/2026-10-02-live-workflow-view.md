# Live Workflow View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tracker page's workflow card update within seconds of an agent starting or finishing. A Claude Code plugin hook drives the updates, and the page never reloads to show them.

**Architecture:**
- A plugin hook touches `.sdlc/tracker/poke` while a tracker watcher runs.
- The watcher checks every second. On a poke, or every 5 s as a fallback, it rewrites only the workflow block into `live.js`.
- The page loads `live.js` with a fresh `<script>` tag every 2 s and redraws just the workflow card.
- The full page rebuild and reload stay at 60 s.

**Tech Stack:** Python 3 standard library (collector, hook), vanilla JS in `template.html`, `node --test` with `node:vm` for tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-02-live-workflow-view-design.md`

## Global Constraints

- Python: standard library only. Set `sys.dont_write_bytecode = True` in every script under the plugin.
- No HTTP server, SSE or WebSockets. The page works from `file://`.
- Hook: always exits 0, writes nothing to stdout or stderr, and only touches `.sdlc/tracker/poke`.
- `live.js` content: `window.SDLC_LIVE && window.SDLC_LIVE(<json>);`, where `<json>` is `{"builtAt": "<ISO UTC, ms, Z>", "workflow": <block or null>}` with `</` escaped as `<\/`.
- Cadence: watcher tick 1 s; fast-path fallback `LIVE_EVERY_SECONDS = 5`; page poll 2 s; paused after 30 s without a newer `builtAt` while `run.live`; full rebuild = `--watch N` (60 s from the driver).
- A tracker failure never stops the loop.
- Tests: `npm test` (`node --test skills/sdlc/test/*.test.mjs`), with Python tests skipped when `python3` is missing.
- Plugin version → `0.4.0`.

## Review Focus

1. **An agent label containing `</script>` or a line separator.** `live.js` must still parse and the label must come through unchanged. The test is in Task 2.
2. **Garbage, empty or non-object hook input, or a non-string `cwd`.** The hook must exit 0 silently, so it never shows an error in someone's session. The test is in Task 1.
3. **A finished run left open in a tab for hours.** It must never show "live updates paused", because only live runs can be paused. The test is in Task 3.
4. **A page with no `live.js`** (a one-off `/sdlc tracker`, an old build, a published Artifact). The card must render once from the embedded data, and failed probes must stay silent. The test (no redraw happens before a valid payload) is in Task 3; the probe is checked by hand in Task 4.
5. **A `live.js` payload whose `workflow` is null** (the journal was briefly unreadable). The last good card must stay rather than disappear. The test is in Task 3.

## File Structure

| File | Responsibility |
|---|---|
| `hooks/hooks.json` (create) | Registers the hook on `SubagentStart`, `SubagentStop`, and `PostToolUse` (matcher `Agent\|Task\|Workflow`) |
| `hooks/live-poke.py` (create) | Finds the active tracker from the hook's `cwd` and touches `poke` |
| `skills/sdlc/tracker/collect.py` (modify) | `write_live()`, the 1 s watcher loop with fast and slow paths |
| `skills/sdlc/tracker/template.html` (modify) | `live:begin…live:end` decision block, workflow slot and redraw, live poll, scroll keep, paused note |
| `skills/sdlc/test/hooks.test.mjs` (create) | Hook and `hooks.json` tests |
| `skills/sdlc/test/tracker.test.mjs` (modify) | `live.js` and watcher fast-path tests, template live-block tests |
| `README.md`, `skills/sdlc/SKILL.md`, `.claude-plugin/plugin.json`, `docs/example-tracker.html` (modify) | Docs, version, regenerated example page |

---

### Task 1: The plugin hook

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/live-poke.py`
- Test: `skills/sdlc/test/hooks.test.mjs`

**Interfaces:**
- Consumes: the watcher's pid file `<repo>/.sdlc/tracker/watch.pid`. It exists only while a watcher runs; `collect.py` writes it today.
- Produces: an mtime bump on `<repo>/.sdlc/tracker/poke`, which Task 2 watches.

- [ ] **Step 1: Write the failing tests**

Create `skills/sdlc/test/hooks.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const ROOT = join(SKILL_DIR, '..', '..')
const POKE = join(ROOT, 'hooks', 'live-poke.py')
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }

const run = (input, cwd) => spawnSync('python3', [POKE], { input, cwd, encoding: 'utf8' })

function project({ watching }) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-hook-'))
  const tracker = join(repo, '.sdlc', 'tracker')
  mkdirSync(tracker, { recursive: true })
  mkdirSync(join(repo, 'src', 'deep'), { recursive: true })
  if (watching) writeFileSync(join(tracker, 'watch.pid'), '12345')
  return { repo, poke: join(tracker, 'poke') }
}

test('the hook pokes the watcher of the project it runs in, from any subfolder', opts, () => {
  const { repo, poke } = project({ watching: true })
  const r = run(JSON.stringify({ hook_event_name: 'SubagentStop', cwd: join(repo, 'src', 'deep') }), tmpdir())
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', ''])
  assert.ok(existsSync(poke))
})

test('the hook does nothing when no watcher is running', opts, () => {
  const { repo, poke } = project({ watching: false })
  const r = run(JSON.stringify({ hook_event_name: 'SubagentStart', cwd: repo }), tmpdir())
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', ''])
  assert.equal(existsSync(poke), false)
})

test('the hook exits 0 silently on empty, garbage or odd input', opts, () => {
  const { repo } = project({ watching: true })
  for (const input of ['', 'not json', '[1, 2]', '{"cwd": 5}', '{"cwd": null}']) {
    const r = run(input, join(repo, 'src'))
    assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', ''], `input ${JSON.stringify(input)}`)
  }
})

test('hooks.json registers the poke on agent start and stop, through the plugin root', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8'))
  assert.deepEqual(Object.keys(cfg.hooks).sort(), ['PostToolUse', 'SubagentStart', 'SubagentStop'])
  assert.equal(cfg.hooks.PostToolUse[0].matcher, 'Agent|Task|Workflow')
  for (const groups of Object.values(cfg.hooks)) {
    for (const h of groups.flatMap(g => g.hooks)) {
      assert.equal(h.type, 'command')
      assert.equal(h.command, 'python3 "${CLAUDE_PLUGIN_ROOT}/hooks/live-poke.py"')
      assert.ok(h.timeout <= 5)
    }
  }
  assert.ok(existsSync(POKE))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/hooks.test.mjs`
Expected: FAIL. The poke tests fail because `live-poke.py` is missing (python3 exits 2 with "can't open file"), and the `hooks.json` test fails with ENOENT.

- [ ] **Step 3: Write `hooks/live-poke.py`**

```python
#!/usr/bin/env python3
"""Plugin hook: nudge a running /sdlc tracker watcher to rebuild the live workflow view now.

Claude Code runs this when an agent starts or stops. From the hook's cwd it looks for the project's
.sdlc/tracker/watch.pid, which exists only while a watcher runs, and touches the poke file next to it;
the watcher sees the new mtime within a second. It never prints and always exits 0, so it can never
block or slow a session, in this project or any other.
"""
import json
import os
import sys

sys.dont_write_bytecode = True  # no __pycache__ inside the installed plugin


def tracker_dir(cwd):
    d = os.path.abspath(cwd)
    while True:
        t = os.path.join(d, ".sdlc", "tracker")
        if os.path.isfile(os.path.join(t, "watch.pid")):
            return t
        up = os.path.dirname(d)
        if up == d:
            return None
        d = up


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        payload = None
    cwd = payload.get("cwd") if isinstance(payload, dict) else None
    t = tracker_dir(cwd if isinstance(cwd, str) and cwd else os.getcwd())
    if t:
        poke = os.path.join(t, "poke")
        with open(poke, "a"):
            pass
        os.utime(poke, None)


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a hook must never get in the way of the session
        pass
    sys.exit(0)
```

- [ ] **Step 4: Write `hooks/hooks.json`**

```json
{
  "hooks": {
    "SubagentStart": [
      { "hooks": [{ "type": "command", "command": "python3 \"${CLAUDE_PLUGIN_ROOT}/hooks/live-poke.py\"", "timeout": 5 }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "python3 \"${CLAUDE_PLUGIN_ROOT}/hooks/live-poke.py\"", "timeout": 5 }] }
    ],
    "PostToolUse": [
      { "matcher": "Agent|Task|Workflow", "hooks": [{ "type": "command", "command": "python3 \"${CLAUDE_PLUGIN_ROOT}/hooks/live-poke.py\"", "timeout": 5 }] }
    ]
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test skills/sdlc/test/hooks.test.mjs`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add hooks/ skills/sdlc/test/hooks.test.mjs
git commit -m "Add a plugin hook that pokes the tracker watcher on agent events"
```

---

### Task 2: The collector writes `live.js`, with a fast path in the watcher

**Files:**
- Modify: `skills/sdlc/tracker/collect.py` (constants near line 30; new functions after `render()` at about line 206; the `main()` loop at lines 227–281; the module docstring)
- Test: `skills/sdlc/test/tracker.test.mjs`

**Interfaces:**
- Consumes: the `poke` mtime from Task 1; `workflow.build(journal, SCRIPT, cache)`, which already exists and returns a dict or None.
- Produces: `<out>/live.js` in the format given in Global Constraints. `builtAt` is `datetime.now(timezone.utc).isoformat(timespec="milliseconds")` with `+00:00` replaced by `Z`, so lexicographic order matches time order. Task 3 relies on that.

- [ ] **Step 1: Write the failing tests**

In `skills/sdlc/test/tracker.test.mjs`, add `import vm from 'node:vm'` and `statSync` to the `node:fs` import. Then add these tests after the `'a watcher keeps rebuilding…'` test:

```js
// runs a live.js file the way the page does, and returns the payloads it passed to SDLC_LIVE
function loadLive(path) {
  const got = []
  vm.runInNewContext(readFileSync(path, 'utf8'), { window: { SDLC_LIVE: p => got.push(JSON.parse(JSON.stringify(p))) } })
  return got
}

test('a build writes live.js with the same workflow block the page embeds, safe inside a script tag', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const journal = runFolder(repo, 'wf_new', [
    { id: 'a1', label: 'state-reader', phase: 'Read state', end: 'result', from: '2026-01-12T09:00:00Z', to: '2026-01-12T09:00:30Z' },
    { id: 'a2', label: 'odd</script>\u2028label', phase: 'Plan', from: '2026-01-12T09:01:00Z' },
  ])
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal])
  const out = join(repo, '.sdlc', 'tracker')
  const text = readFileSync(join(out, 'live.js'), 'utf8')
  assert.ok(!text.includes('</script>'))
  const got = loadLive(join(out, 'live.js'))
  assert.equal(got.length, 1)
  assert.match(got[0].builtAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
  assert.deepEqual(got[0].workflow, JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).workflow)
  assert.equal(got[0].workflow.run.agents[1].label, 'odd</script>\u2028label')
})

test('a poke rebuilds live.js within a second or two without rebuilding the page, and live.js refreshes on its own every 5 s', { skip: !python && 'python3 not installed' }, async () => {
  const repo = fixtureRepo()
  const journal = runFolder(repo, 'wf_new', [{ id: 'a1', label: 'state-reader', phase: 'Read state', from: '2026-01-12T09:00:00Z' }])
  const out = join(repo, '.sdlc', 'tracker')
  const live = join(out, 'live.js')
  const builtAt = () => existsSync(live) ? loadLive(live)[0].builtAt : ''
  const until = async (cond, ms) => { const end = Date.now() + ms; while (!cond() && Date.now() < end) await new Promise(r => setTimeout(r, 50)); return cond() }
  const w = spawn('python3', [COLLECT, '--repo', repo, '--journal', journal, '--watch', '60'], { stdio: 'ignore' })
  const done = new Promise(res => w.on('exit', res))
  try {
    assert.ok(await until(() => builtAt() !== '' && existsSync(join(out, 'index.html')), 10000))
    const page = statSync(join(out, 'index.html')).mtimeMs
    const first = builtAt()
    writeFileSync(join(out, 'poke'), '')
    const poked = Date.now()
    assert.ok(await until(() => builtAt() !== first, 2500), 'live.js rebuilt after a poke')
    assert.ok(Date.now() - poked < 2500)
    assert.equal(statSync(join(out, 'index.html')).mtimeMs, page, 'a poke does not rebuild the page')
    const second = builtAt()
    assert.ok(await until(() => builtAt() !== second, 6500), 'live.js rebuilt by the 5 s fallback')
  } finally {
    execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal, '--stop-watch'])
    await done
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test --test-name-pattern "live.js" skills/sdlc/test/tracker.test.mjs`
Expected: FAIL. The first test fails with ENOENT on `live.js`; the second fails on its first `until` assertion.

- [ ] **Step 3: Add the constants and `write_live` to `collect.py`**

After `SLOW_EVERY_SECONDS = 10 * 60`, add:

```python
# in watch mode the loop wakes this often, so a hook's poke reaches live.js within a second
TICK_SECONDS = 1
# without a poke, live.js is still rebuilt this often (the hooks may not fire for workflow agents)
LIVE_EVERY_SECONDS = 5
```

After `render()`, add:

```python
def write_live(out_dir, wf):
    """live.js: the workflow block alone, which the open page loads every 2 s to redraw its workflow card."""
    os.makedirs(out_dir, exist_ok=True)
    built = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    # "</" inside JSON strings would close the probe's <script> early, as in index.html
    blob = json.dumps({"builtAt": built, "workflow": wf}, ensure_ascii=False).replace("</", "<\\/")
    # each watcher writes its own temp file, and the rename means the page never reads half a file
    tmp = os.path.join(out_dir, f"live.js.{os.getpid()}.tmp")
    with open(tmp, "w") as f:
        f.write(f"window.SDLC_LIVE && window.SDLC_LIVE({blob});\n")
    os.replace(tmp, os.path.join(out_dir, "live.js"))


def mtime(path):
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0
```

- [ ] **Step 4: Replace the loop in `main()`**

Replace everything from `cache, box, rep, slow_at, me = {}, None, None, 0, str(os.getpid())` to the end of `main()` with:

```python
    cache, box, rep, slow_at, me = {}, None, None, 0, str(os.getpid())
    poke = os.path.join(out, "poke")
    full_at = live_at = 0
    poked = mtime(poke)
    if a.watch:
        # the newest watcher owns the pid file; an older one sees the change and exits
        os.makedirs(out, exist_ok=True)
        with open(pid_file, "w") as f:
            f.write(me)
    while True:
        now = time.time()
        if now - full_at >= a.watch:
            if full_at:
                quiet = now - workflow.newest_mtime(os.path.dirname(os.path.abspath(a.journal))) if a.journal else WATCH_IDLE_SECONDS
                if quiet >= WATCH_IDLE_SECONDS:
                    try:
                        os.remove(pid_file)
                    except OSError:
                        pass
                    return
            # the full build covers every poke so far
            full_at = live_at = now
            poked = mtime(poke)
            try:
                slow = time.time() - slow_at >= SLOW_EVERY_SECONDS
                if slow:
                    box, slow_at = machine(), time.time()
                else:
                    try:
                        box = {**box, "load": [round(x, 2) for x in os.getloadavg()]}
                    except (OSError, AttributeError):
                        pass
                data = build(repo, a.journal, a.run_label, a.run_cap, cache, box)
                if slow:
                    try:
                        # the verifier test reports, browsable from the tracker's "Test reports" section
                        rep = reports.build(repo, os.path.join(out, "reports"))
                    except Exception as e:  # a report that fails to render never breaks the tracker
                        print(f"test reports not rendered: {e}", file=sys.stderr)
                if rep is not None:
                    data["reports"] = rep
                page = render(data, out)
                write_live(out, data.get("workflow"))
                if not a.watch:
                    print(page)
                    return
            except SystemExit:
                raise
            except Exception as e:
                if not a.watch:
                    raise
                print(f"tracker not rebuilt: {e}", file=sys.stderr)
        elif a.journal and (mtime(poke) != poked or now - live_at >= LIVE_EVERY_SECONDS):
            # the fast path: only the workflow block, read again within a second of a hook's poke
            live_at, poked = now, mtime(poke)
            try:
                write_live(out, workflow.build(a.journal, SCRIPT, cache))
            except Exception as e:  # leave the last live.js; the page shows "paused" if this keeps failing
                print(f"live view not rebuilt: {e}", file=sys.stderr)
        time.sleep(TICK_SECONDS)
        try:
            with open(pid_file) as f:
                if f.read().strip() != me:
                    return
        except OSError:
            return
```

Also update the module docstring's second paragraph to:

```
Writes <out>/status.json, <out>/index.html, <out>/live.js and the verifier test reports under
<out>/reports/ (default out: <repo>/.sdlc/tracker).
Open index.html in a browser; it reloads itself every minute, and redraws its workflow card from
live.js every 2 s. With --watch SECONDS it rebuilds the page at that interval until the run goes
quiet, and rebuilds live.js within a second of a hook's poke (.sdlc/tracker/poke), or every 5 s
without one. Python 3 standard library only.
```

- [ ] **Step 5: Run the tracker tests**

Run: `node --test skills/sdlc/test/tracker.test.mjs`
Expected: all pass, including the existing `'a watcher keeps rebuilding until --stop-watch…'` test. Its `--watch 1` now does a full rebuild every tick, and the pid check still runs on every tick.

- [ ] **Step 6: Commit**

```bash
git add skills/sdlc/tracker/collect.py skills/sdlc/test/tracker.test.mjs
git commit -m "Tracker watcher rebuilds live.js within a second of a poke, or every 5 s"
```

---

### Task 3: The page redraws its workflow card from `live.js`

**Files:**
- Modify: `skills/sdlc/tracker/template.html`. The CSS goes near lines 220–254 (`.wf-*`) and the line-76 `#app`. Add a new `<script>` block before the main IIFE at line 272. In the main IIFE, change `workflowCard()` (line 432), the workflow append in `render()` (lines 580–583) and the bootstrap at the end.
- Test: `skills/sdlc/test/tracker.test.mjs`

**Interfaces:**
- Consumes: `live.js` calling `window.SDLC_LIVE({builtAt, workflow})` (Task 2).
- Produces: `window.SDLC_createLive({now: () => number, redraw: (wf, paused) => void})`, which returns `{apply(payload) => boolean, tick() => boolean}`. It is defined inside `/* live:begin */ … /* live:end */` and has no DOM access.

- [ ] **Step 1: Write the failing tests**

Add the following to `skills/sdlc/test/tracker.test.mjs`. `vm` was already imported in Task 2.

```js
// the template's live decision block, run on its own: it must not touch the DOM
function createLive() {
  const src = readFileSync(join(SKILL_DIR, 'tracker', 'template.html'), 'utf8')
  const m = src.match(/\/\* live:begin \*\/([\s\S]*?)\/\* live:end \*\//)
  assert.ok(m, 'template has a live:begin … live:end block')
  const ctx = {}
  vm.runInNewContext(m[1], ctx)
  return ctx.SDLC_createLive
}

test('the page redraws the workflow card only for a newer live payload, and flags a live run gone quiet', () => {
  let now = Date.parse('2026-01-12T09:00:10Z')
  const draws = []
  const live = createLive()({ now: () => now, redraw: (wf, paused) => draws.push([wf.run.id, paused]) })
  const wf = id => ({ run: { id, live: true, agents: [] } })
  assert.equal(live.tick(), false, 'nothing to flag before the first payload')
  for (const bad of [null, {}, { builtAt: 'soon' }, { builtAt: 7 }]) assert.equal(live.apply(bad), false)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: wf('r1') }), true)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: wf('r2') }), false)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:01.000Z', workflow: wf('r3') }), false)
  assert.deepEqual(draws, [['r1', false]])
  assert.equal(live.tick(), false)
  now += 31000
  assert.equal(live.tick(), true, 'the watcher went quiet')
  assert.equal(live.tick(), false, 'flagged once')
  assert.deepEqual(draws.at(-1), ['r1', true])
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:45.000Z', workflow: wf('r1') }), true)
  assert.deepEqual(draws.at(-1), ['r1', false])
})

test('the page keeps its last card for an empty live payload, and never flags a finished run', () => {
  let now = Date.parse('2026-01-12T09:00:10Z')
  const draws = []
  const live = createLive()({ now: () => now, redraw: (wf, paused) => draws.push([wf.run.id, paused]) })
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: null }), false)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:06.000Z', workflow: { run: { id: 'r1', live: false, agents: [] } } }), true)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:07.000Z', workflow: null }), false)
  now += 10 * 60 * 1000
  assert.equal(live.tick(), false)
  assert.deepEqual(draws, [['r1', false]])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test --test-name-pattern "the page" skills/sdlc/test/tracker.test.mjs`
Expected: FAIL with "template has a live:begin … live:end block".

- [ ] **Step 3: Add the live decision block**

In `template.html`, between `</script>` (which closes the `SDLC_STATUS` block) and the `<script>` that opens the main IIFE, insert:

```html
<script>
/* live:begin */
(function (root) {
  "use strict";
  // a live run whose live.js has not moved for this long has lost its watcher
  const PAUSED_MS = 30 * 1000;
  // decides when the workflow card is redrawn from a live.js payload; the page wires it to the DOM
  root.SDLC_createLive = function (opts) {
    let builtAt = "", wf = null, paused = false;
    const isPaused = () => !!wf.run.live && opts.now() - Date.parse(builtAt) > PAUSED_MS;
    return {
      apply(p) {
        if (!p || typeof p.builtAt !== "string" || isNaN(Date.parse(p.builtAt)) || p.builtAt <= builtAt) return false;
        // a payload without a run (the journal was unreadable for a moment) keeps the last good card
        if (!p.workflow || !p.workflow.run) return false;
        builtAt = p.builtAt;
        wf = p.workflow;
        paused = isPaused();
        opts.redraw(wf, paused);
        return true;
      },
      // runs on every poll: a dead watcher sends nothing, so the paused note has to come from the clock
      tick() {
        if (!wf || isPaused() === paused) return false;
        paused = !paused;
        opts.redraw(wf, paused);
        return true;
      },
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
/* live:end */
</script>
```

- [ ] **Step 4: Run the live-block tests**

Run: `node --test --test-name-pattern "the page" skills/sdlc/test/tracker.test.mjs`
Expected: both pass.

- [ ] **Step 5: Wire the block into the page**

5a. CSS. After the `.wf-head .tot { … }` line, add:

```css
.wf-head .paused { color: var(--warn); white-space: nowrap; }
.wf-slot { display: contents; }
```

5b. Give `workflowCard` a paused note. Change `function workflowCard(wf) {` to `function workflowCard(wf, paused) {`, and add this line right after the `head.append(...)` statement:

```js
    if (paused) head.append(el("span", "paused", "live updates paused"));
```

5c. Add a slot and its redraw just above `function render(data) {`:

```js
  // the workflow card is redrawn on its own from live.js, so it sits in a slot of its own
  let wfSlot = null;
  function drawWorkflow(wf, paused) {
    if (!wfSlot || !wf || !wf.run) return;
    // drawn from Claude Code's own run files; if their shape changes, the last card stays
    try { wfSlot.replaceChildren(workflowCard(wf, paused)); } catch (err) { /* no workflow view */ }
  }
```

5d. In `render()`, replace:

```js
    if (data.workflow && data.workflow.run) {
      // drawn from Claude Code's own run files; if their shape changes, the card is left out
      try { app.append(workflowCard(data.workflow)); } catch (err) { /* no workflow view */ }
    }
```

with:

```js
    wfSlot = el("div", "wf-slot");
    app.append(wfSlot);
    drawWorkflow(data.workflow, false);
```

5e. Add the poll and the scroll keeping above `const data = window.SDLC_STATUS;`:

```js
  // the watcher rewrites live.js within seconds of each agent event; a fresh <script> tag reads it,
  // which works from file:// where fetch does not
  function startLive() {
    const live = window.SDLC_createLive({ now: () => NOW(), redraw: drawWorkflow });
    window.SDLC_LIVE = (p) => { try { live.apply(p); } catch (err) { /* keep the last good card */ } };
    let probe = null;
    const poll = () => {
      try { live.tick(); } catch (err) { /* keep the last good card */ }
      if (probe) probe.remove();
      probe = document.createElement("script");
      probe.src = "live.js?t=" + Date.now();
      probe.onerror = () => {}; // no live.js: a one-off build, or a published copy
      document.body.append(probe);
    };
    poll();
    setInterval(poll, 2000);
  }
  // the page still reloads every minute for the other sections; come back to the same place
  function keepScroll() {
    try {
      const y = Number(sessionStorage.getItem("sdlc-scroll"));
      if (y) window.scrollTo(0, y);
    } catch (err) { /* no sessionStorage */ }
    window.addEventListener("pagehide", () => {
      try { sessionStorage.setItem("sdlc-scroll", String(window.scrollY)); } catch (err) { /* no sessionStorage */ }
    });
  }
```

5f. Replace the last line of the IIFE:

```js
  try { render(data); } catch (err) { $("#app").replaceChildren(el("div", "card empty", "Couldn't draw the status: " + err.message)); }
```

with:

```js
  try { render(data); } catch (err) { $("#app").replaceChildren(el("div", "card empty", "Couldn't draw the status: " + err.message)); }
  if (!data.example) { keepScroll(); startLive(); }
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: all pass. The existing `/workflowCard/` assertion still matches.

- [ ] **Step 7: Check the page by hand in Chrome**

Build the fixture page with a live watcher:

```bash
D=$(mktemp -d) && mkdir -p $D/.sdlc && echo '{}' > $D/.sdlc/config.json && echo '[]' > $D/.sdlc/slices.json
J=$D/runs/wf_a/journal.jsonl && mkdir -p $(dirname $J) && echo '{"type":"started","agentId":"a1","label":"state-reader","phase":"Read state"}' > $J
python3 skills/sdlc/tracker/collect.py --repo $D --journal $J --watch 60 &
echo "open file://$D/.sdlc/tracker/index.html"
```

Open the page and check each of these:
- Append a `started` line for agent `a2` in phase `Plan` to `$J`, and run `touch $D/.sdlc/tracker/poke`. The card shows `a2` within about 3 s, with no page reload.
- Select a phase and scroll down. On the next 60 s reload, the scroll position and the selected phase are kept.
- `kill %1`. After about 30 s, "live updates paused" appears.
- The console shows no errors.

Then run `python3 skills/sdlc/tracker/collect.py --repo $D --journal $J --stop-watch`.

- [ ] **Step 8: Commit**

```bash
git add skills/sdlc/tracker/template.html skills/sdlc/test/tracker.test.mjs
git commit -m "Tracker page redraws its workflow card from live.js every 2 s"
```

---

### Task 4: Docs, version and example page

**Files:**
- Modify: `README.md` (the tracker section, lines 119–126)
- Modify: `skills/sdlc/SKILL.md` (the **Tracker** section, lines 69–87)
- Modify: `.claude-plugin/plugin.json` (`version`)
- Modify: `docs/example-tracker.html` (regenerated)

**Interfaces:**
- Consumes: the behaviour from Tasks 1–3.
- Produces: user-facing docs.

- [ ] **Step 1: Update the README**

Replace the first sentence of README line 119 with:

```
`/sdlc` builds a progress tracker at `.sdlc/tracker/index.html`. Open it in a browser and leave it open. While a run is active, the workflow view updates live: the plugin's hook nudges the tracker each time an agent starts or finishes, and the card redraws within a few seconds without reloading the page (within about 7 s if the hook does not fire). The rest of the page is rebuilt and reloaded every minute. `/sdlc tracker` builds it on demand.
```

- [ ] **Step 2: Update SKILL.md**

In the **Tracker** section, replace the paragraph that begins `The page reloads itself every minute` with:

```
The watcher rebuilds the whole page every minute, and the page reloads itself every minute. In between, it rewrites `.sdlc/tracker/live.js` (the workflow view alone) within a second of a poke, and every 5 s without one. The open page reads that file every 2 s and redraws only its workflow card. The plugin's hook (`hooks/hooks.json`) pokes the watcher by touching `.sdlc/tracker/poke` when an agent starts or stops, and only while `watch.pid` exists, so you never run it yourself. If the Artifact tool is available and the user asks to share the tracker, publish `index.html` as an artifact and republish it on each heartbeat; the published copy has no live updates. A tracker failure never stops the loop: report it once and carry on.
```

- [ ] **Step 3: Bump the version**

In `.claude-plugin/plugin.json`, change `"version": "0.3.1"` to `"version": "0.4.0"`.

- [ ] **Step 4: Regenerate the example page**

```bash
OUT=$(mktemp -d) && python3 skills/sdlc/tracker/collect.py --data docs/example-tracker.json --out $OUT && cp $OUT/index.html docs/example-tracker.html
git diff --stat docs/example-tracker.html
```

Expected: only the template changes appear in the diff. The example has `example: true`, so it never polls.

- [ ] **Step 5: Smoke run, and record whether the hooks fire for Workflow agents**

In a throwaway repo with a tiny spec (for example, a copy of `skills/sdlc/fixtures/tiny-cli/spec.md`), run `/sdlc spec.md --max-iterations 1` with this plugin loaded from the branch (`claude --plugin-dir /Users/omar/projects/sdlc`). While it runs:
- Open the tracker page, and confirm the workflow card changes without reloads.
- Run `stat -f %m .sdlc/tracker/poke` repeatedly. If its mtime moves as agents start and stop, the hooks fire for Workflow agents; if `poke` never appears, they don't.

Add one sentence with the result after the README text from Step 1. Either "The hook fires for the loop's workflow agents, so the card follows each agent within a couple of seconds." or "Claude Code does not run plugin hooks for workflow agents yet, so the card follows the run through the 5 s fallback."

- [ ] **Step 6: Run the suite, and commit**

Run: `npm test`
Expected: all pass.

```bash
git add README.md skills/sdlc/SKILL.md .claude-plugin/plugin.json docs/example-tracker.html
git commit -m "Docs and 0.4.0: live workflow view on the tracker page"
```
