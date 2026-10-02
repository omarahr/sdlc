# Live workflow view on the tracker page

Date: 2026-10-02
Status: approved design, awaiting spec review

## Intent

The tracker page (`.sdlc/tracker/index.html`) already shows the workflow view: phases, agents, status, model, tokens and time. But it is rebuilt every 60 s and the page reloads itself every 60 s. A change can take about 2 minutes to show up, and every reload loses your place.

Goal: the workflow card updates within seconds of an agent starting or finishing, driven by a Claude Code plugin hook, without reloading the page.

**What the user asked for:** an event-driven hook that pushes updates to the page; the page is still opened as a local file with no server.

**Assumptions:**
- It is undocumented whether hooks fire for agents spawned by the Workflow tool. The design must still work if they don't.
- Only the workflow card needs to be live. The other sections can keep updating once a minute.

### Non-goals

- A local HTTP server, SSE or WebSockets.
- Making sections other than the workflow card live.
- Showing hook payload data directly. The run journal stays the single source of truth.
- Publishing the live view as an Artifact.

## Architecture

```
SubagentStart / SubagentStop / PostToolUse
        │  (plugin hook, a few ms)
        ▼
.sdlc/tracker/poke  ──touch──►  collect.py --watch (1 s check)
                                   ├─ fast path: poke changed or 5 s passed
                                   │     → workflow.build(...) → live.js (atomic)
                                   └─ slow path: every 60 s → index.html (as today)
                                                   ▲
index.html  ── every 2 s: <script src="live.js?t=…"> ─┘  → redraw workflow card only
```

### Units

1. **`hooks/hooks.json`** (plugin root). Registers `hooks/live-poke.py` on `SubagentStart`, `SubagentStop` and `PostToolUse`. `PostToolUse` has a matcher (`Agent|Task|Workflow`) so it doesn't fire on every tool call. Commands use `${CLAUDE_PLUGIN_ROOT}`.

2. **`hooks/live-poke.py`.** Reads the hook JSON from stdin and takes `cwd`. It walks up from `cwd` to the first directory containing `.sdlc/tracker/watch.pid`. If it finds none, it exits 0. Otherwise it touches `.sdlc/tracker/poke` (creating it if needed). It always exits 0 with no output, catches every exception, and imports only the standard library.

3. **`tracker/collect.py --watch N`.** `N` stays the full-rebuild interval (60 s). The loop now checks every 1 s:
   - **Fast path:** when `poke`'s mtime is newer than the last fast build, or `LIVE_EVERY_SECONDS = 5` have passed and `--journal` is set:
     - it calls `workflow.build(journal, script, cache)` with the watcher's existing cache;
     - it writes `live.js` as `window.SDLC_LIVE && window.SDLC_LIVE(<json>);`, where `<json>` is `{"builtAt": <ISO UTC>, "workflow": <block or null>}`, escaped the same way as `index.html`'s blob (`</` → `<\/`);
     - it writes to `live.js.tmp`, then calls `os.replace`.
   - **Slow path:** full `build` + `render` every `N` seconds, as now. The full build also writes `live.js`, so the two can never disagree for long.
   - The existing exit rules (pid file changed, 45 minutes quiet) are unchanged and are still checked on the `N` cadence. `--stop-watch` and one-off builds write `live.js` once, alongside `index.html`.

4. **`tracker/template.html`.**
   - The workflow card's drawing code becomes `renderWorkflow(container, wf)`, used both by the first render and by live updates.
   - The live logic sits in its own `<script>` block between `/* live:begin */` and `/* live:end */` markers. It defines `window.SDLC_LIVE = (payload) => …` and a poll that every 2 s removes the previous probe `<script>` and appends `live.js?t=<now>`.
     - On a payload whose `builtAt` is newer than the last one applied, it redraws only the workflow card in place.
     - It ignores older or identical payloads.
   - A failed load (`onerror`) or a payload that throws is ignored, and the last good render stays.
   - **Staleness:** if `workflow.run.live` is true and `builtAt` is more than 30 s old (by the browser clock), the card header shows "live updates paused".
   - The 60 s `<meta refresh>` stays. The page saves `scrollY` to `sessionStorage` before unload and restores it on load. The selected phase is already kept.
   - If `live.js` never loads (a one-off build with no watcher, or an old tracker), the page behaves exactly as today.

## Error handling

Nothing here can stop or slow the loop:
- **Hook:** exits 0 on any error, writes nothing to stdout or stderr, and does constant work. Outside an active run it does a stat walk and exits.
- **Watcher:** a fast-path failure is logged to stderr and retried on the next tick. An atomic replace means the page never reads a partial file.
- **Page:** load errors are ignored. A dead watcher shows up as the "paused" note, not as a quiet run.

## Testing

`node --test` (`npm test`), skipped where `python3` is missing, the same as the existing tracker tests:

- **`test/hooks.test.mjs`** (new):
  - With no `watch.pid` up the tree, `poke` is not created. With one, it is, including when `cwd` is a subdirectory.
  - Garbage stdin and empty stdin both exit 0 with empty output.
  - `hooks.json` parses, and each command points at an existing file under `${CLAUDE_PLUGIN_ROOT}`.
- **`test/tracker.test.mjs`** (extended):
  - A one-off build writes `live.js` next to `index.html`. Evaluating it with a stub `SDLC_LIVE` passes the same workflow block that `index.html` embeds.
  - With a running watcher, touching `poke` updates `live.js` within 2.5 s while `index.html`'s mtime stays the same.
  - A `</script>` inside a label is escaped in `live.js`.
- **Template live logic:** extract the `live:begin…live:end` block, run it in `node:vm` with a minimal stub `document`/`sessionStorage`, and check that:
  - a newer payload triggers a redraw;
  - an older one doesn't;
  - an old `builtAt` on a live run sets the paused flag.
- **Manual:**
  - open the page in Chrome during a short `/sdlc --max-iterations` smoke run and watch the card update without a reload;
  - record whether the hooks fired for Workflow agents (by the timing of `poke`'s mtime), and state the answer in the README.

## Docs and release

- **README, tracker section:** the workflow card updates live (about 1–3 s through the hook, at most about 7 s through the fallback); the rest of the page still updates once a minute.
- **SKILL.md, Tracker section:** the 1 s watcher check, `live.js`, and the plugin hook. No change to the driver steps.
- `.claude-plugin/plugin.json` → `0.4.0`.
