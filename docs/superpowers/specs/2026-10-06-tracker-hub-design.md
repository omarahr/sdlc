# Tracker hub: one port for every run on the machine

Date: 2026-10-06
Status: approved design, awaiting spec review

## Intent

Each run's watcher serves its own tracker over http, starting at port 8787 and taking the next free port when that one is busy (`collect.py:243`). With several sdlc workflows running in different projects on one machine, ports drift (8787, 8788, …), each run's url lives only in its own `.sdlc/tracker/url`, and there is no place to see what is running.

Goal: **one fixed port on the machine — 8787 — that never changes.** A hub on it lists every registered run and serves each run's tracker page itself. Runs register by writing a file; they never bind a port.

**What the user asked for:** multiple sdlc workflows in different projects on one machine; one server on one port that does not change; a place to browse the running workflows; running sdlc registers itself with that server.

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Hub shape | The hub serves each run's page itself; per-run servers are removed |
| Port | 8787, fixed; a foreign squatter is a clear error, never a silent drift |
| Registration | Files in `~/.sdlc/hub/runs/<id>.json`, heartbeat by mtime — no HTTP API |
| Hub lifecycle | Spawned detached by the first run that needs it; lingers afterwards |
| Stale entries | Shown greyed while their page still exists; pruned after 24 h |
| Network exposure | localhost only |

**Assumptions:**
- The hub and the runs share one machine and one user account; `~/.sdlc/hub/` is writable.
- The tracker page's internal references (`live.js`, `reports/`) are relative, so it works unchanged under a `/r/<id>/` prefix.

### Non-goals

- Exposing the hub on the network (`--host 0.0.0.0` today). If that is wanted later it becomes a hub-level flag, not a per-run one.
- Hub-side auth, TLS, or multi-machine aggregation.
- An index page beyond a functional list. The tracker page itself is unchanged.
- Migrating an in-flight run started before this change: its old-style watcher keeps its own port until it exits.

## Registry

A run registers by writing `~/.sdlc/hub/runs/<id>.json`:

```json
{ "id": "myapp-bookmarks-spec", "repo": "/abs/path/to/repo",
  "out": "/abs/path/to/repo/.sdlc/tracker", "pid": 12345,
  "startedAt": "2026-10-06T09:00:00Z" }
```

- **id** is `<repo-dir-name>-<spec-slug>`, deterministic so a restarted run keeps its url. Two repos sharing a dir name and spec slug get a 6-char sha1 of the repo path appended. (One repo cannot run the same spec twice: `config.json` guards that.)
- **Heartbeat is the file's mtime.** The watcher touches the file on every full rebuild and every live rewrite — one `os.utime` in code paths that already run every minute and every few seconds.
- **Removal:** the watcher deletes its registration on exit (the same `finally` that withdraws the url file today). A crashed watcher leaves a stale entry; the hub greys it and prunes the file after 24 h.

The hub never writes registration files (except pruning); runs never open sockets. A hub restart loses nothing.

## Hub process

New `skills/sdlc/tracker/hub.py`, Python 3 standard library only, matching the rest of the tracker. It binds **127.0.0.1:8787, fixed** — no port argument, no next-free scan.

Routes:

- `GET /health` → `200 sdlc-hub` — the marker that tells a run this port is already ours.
- `GET /` → the index page: every registered run with its title (read live from the entry's `status.json`, falling back to the id), repo path, started time, and a live/stale badge. Live entries link to `/r/<id>/`; stale ones are greyed but still linked while their `index.html` exists — a finished run's results stay browsable. The index refreshes itself every 30 s with a meta refresh.
- `GET /r/<id>/…` → files from that entry's `out` directory, resolved inside it (no `..` escape, unknown id → 404). Served with a `SimpleHTTPRequestHandler` subclass whose directory is the entry's `out`.

An entry is **live** when its heartbeat is under 90 s old and `pid` is running (`os.kill(pid, 0)`); **stale** otherwise. Entries stale over 24 h are pruned on read.

## Startup and failure

The watcher step (today's `--serve`, renamed **`--publish`**, no port argument) ensures the hub before registering:

1. `GET 127.0.0.1:8787/health` answers `sdlc-hub` → reuse it.
2. Connection refused → spawn `hub.py` detached (`start_new_session`, output to `~/.sdlc/hub/hub.log`), wait up to 2 s for `/health`.
3. Something answers that is not the marker → a foreign process owns 8787. Print a clear error naming the port and the `lsof -i :8787` line to find the squatter, keep building the page to file, and write no url. Never take another port: the port not changing is the point.

The ensure-check costs one connect per minute, so a hub that died mid-run is respawned at the next full rebuild.

A hub or registry failure never stops the loop — the existing rule (report once, carry on) covers the new code paths too.

## Run-side changes (`collect.py`)

- `serve()` and its next-free-port scan are deleted; `--publish` implies `--watch 60` exactly as `--serve` did.
- Registration write + heartbeat go in the build loop; unregister goes in the existing `finally`. A replaced watcher (newer one owns `watch.pid`) must not unregister the newer watcher's entry: it deletes the file only if its content still names its own pid.
- The url file keeps today's contract — written only once there is a page behind it, withdrawn on exit — and always contains `http://127.0.0.1:8787/r/<id>/`. SKILL.md's "read the url file and give the user the url" step is unchanged.
- `--host` is dropped; the hub is localhost-only (see *Non-goals*).

## Edge cases

- **Hub restart mid-run.** Registrations are files; the respawned hub reads the directory and every run reappears.
- **Watcher killed with `-9`.** Entry goes stale after 90 s, pruned after 24 h; the page remains browsable meanwhile.
- **Two repos, same dir name, same spec slug.** The sha1 suffix keeps both registered; without a collision the url stays readable.
- **A run whose `.sdlc/tracker` is deleted underneath it.** `/r/<id>/` 404s; the index still lists it as stale; the entry prunes on schedule.
- **A repo on a path that later moves.** The entry 404s and prunes; the run's next heartbeat from the new path registers a fresh id.

## Testing

- `hub.py`: `/health` marker; index lists a live run, greys a stale one, prunes a 24 h one; `/r/<id>/` serves files and rejects traversal and unknown ids. Tests bind an ephemeral port via an `SDLC_HUB_PORT` override — a test seam, not a user flag.
- `collect.py`: publishes and heartbeats a registration; unregisters on clean exit; keeps a newer watcher's entry; writes the fixed hub url; respawns a dead hub; reports a foreign 8787 without serving.
- The existing `--serve publishes a url, takes the next free port` test is rewritten for the fixed-port world.

## Files

| File | Change |
|---|---|
| `skills/sdlc/tracker/hub.py` | new: fixed-port hub, index page, per-run file serving |
| `skills/sdlc/tracker/collect.py` | registration + heartbeat, ensure-hub, `--publish`, delete `serve()`/`--host` |
| `skills/sdlc/SKILL.md` | watcher step: one fixed url, hub semantics |
| `README.md` | the 8787 description and the browsable index |
| `skills/sdlc/test/tracker.test.mjs` | rewritten serve tests |
| `skills/sdlc/test/hub.test.mjs` | new hub and registration tests |
