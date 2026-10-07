#!/usr/bin/env python3
"""Build the /sdlc progress tracker: a self-contained HTML page from the repo's .sdlc/ state.

Usage:
  collect.py [--repo DIR] [--out DIR] [--journal FILE] [--run-label TEXT] [--run-cap N]
             [--watch SECONDS] [--publish]

Writes <out>/status.json, <out>/index.html, <out>/live.js and the verifier test reports under
<out>/reports/ (default out: <repo>/.sdlc/tracker).
Open index.html in a browser; it reloads itself every minute, and redraws its workflow card from
live.js every 2 s. With --watch SECONDS it rebuilds the page at that interval until the run goes
quiet, and rebuilds live.js within a second of a hook's poke (.sdlc/tracker/poke), or every 5 s
without one. With --publish it announces the run to the machine's sdlc hub (hub.py, on 127.0.0.1:8787),
which serves the page at a fixed url written to <out>/url once there is a page behind it.
Python 3 standard library only.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

sys.dont_write_bytecode = True  # no __pycache__ inside the installed plugin
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hub  # noqa: E402
import reports  # noqa: E402
import workflow  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "template.html")
SCRIPT = os.path.join(os.path.dirname(HERE), "sdlc-loop.js")
# a watcher stops once the run folder has been quiet this long; the next heartbeat starts a new one
WATCH_IDLE_SECONDS = 45 * 60
# in watch mode the slow parts (the macOS power log, the test reports) are refreshed this often
SLOW_EVERY_SECONDS = 10 * 60
# in watch mode the loop wakes this often, so a hook's poke reaches live.js within a second
TICK_SECONDS = 1
# without a poke, live.js is still rebuilt this often (the hooks may not fire for workflow agents)
LIVE_EVERY_SECONDS = 5
MARKER = "/*__SDLC_STATUS__*/null"


def read_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def spec_slug(repo):
    """The run id's second half, from the spec path recorded at pre-flight."""
    cfg = read_json(os.path.join(repo, ".sdlc", "config.json"), {}) or {}
    base = os.path.splitext(os.path.basename(cfg.get("specPath") or "run"))[0]
    slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    return slug or "run"


def run_id(repo):
    """<repo dir>-<spec slug>, stable across restarts; a same-named repo elsewhere gets a hash suffix."""
    # the repo dir is slugged like the spec path, so the id always passes the hub's ID_CHARS gate
    base = re.sub(r"[^a-z0-9]+", "-", os.path.basename(repo).lower()).strip("-") or "repo"
    rid = f"{base}-{spec_slug(repo)}"
    other = read_json(os.path.join(hub.runs_dir(), rid + ".json"), None)
    if other and other.get("repo") != repo:
        rid = f"{rid}-{hashlib.sha1(repo.encode()).hexdigest()[:6]}"
    return rid


def register(repo, out, rid):
    """Announce this run to the hub; rewriting the file refreshes the heartbeat that is its mtime.
    True when the registration landed, False when it failed (the page is still built either way)."""
    try:
        os.makedirs(hub.runs_dir(), exist_ok=True)
        tmp = os.path.join(hub.runs_dir(), f".{rid}.{os.getpid()}.tmp")
        with open(tmp, "w") as f:
            json.dump({"id": rid, "repo": repo, "out": out, "pid": os.getpid(),
                       "startedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}, f)
        # the rename means the hub never reads half a registration
        os.replace(tmp, os.path.join(hub.runs_dir(), rid + ".json"))
        return True
    except OSError as e:
        print(f"hub registration failed (the page is still built): {e}", file=sys.stderr)
        return False


def heartbeat(rid):
    try:
        os.utime(os.path.join(hub.runs_dir(), rid + ".json"))
    except OSError:
        pass


def hub_answers():
    """True for our hub, "foreign" for another server, False for nothing listening."""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{hub.hub_port()}/health", timeout=1) as res:
            # a 200 with the wrong body is a foreign server, same as any other non-marker answer
            return True if res.read() == hub.HEALTH_BODY else "foreign"
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
    # a hub dir that cannot be created or written never stops the watcher: warn and stay unpublished
    log = None
    try:
        os.makedirs(hub.hub_dir(), exist_ok=True)
        log = open(os.path.join(hub.hub_dir(), "hub.log"), "ab")
        subprocess.Popen([sys.executable, os.path.join(HERE, "hub.py")],
                         stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
    except OSError as e:
        if log is not None:
            log.close()
        print(f"the sdlc hub could not be started ({e}); the page is built but not served", file=sys.stderr)
        return False
    for _ in range(20):
        if hub_answers() is True:
            return True
        time.sleep(0.1)
    print("the sdlc hub did not come up; the page is built but not served", file=sys.stderr)
    return False


def read_log(sdlc):
    out = []
    try:
        with open(os.path.join(sdlc, "log.jsonl")) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except ValueError:
                    pass
    except OSError:
        pass
    return out


def count_headings(path):
    try:
        with open(path) as f:
            return sum(1 for line in f if line.startswith("### "))
    except OSError:
        return None


def spec_title(repo, config):
    spec = config.get("specPath")
    if spec:
        try:
            with open(os.path.join(repo, spec)) as f:
                for line in f:
                    if line.startswith("# "):
                        return line[2:].strip()
        except OSError:
            pass
    return os.path.basename(os.path.abspath(repo))


def journal_stats(path):
    """Agents started and the latest agent label from a Workflow journal.jsonl, if given."""
    if not path:
        return None, ""
    agents, label = 0, ""
    try:
        with open(path) as f:
            for line in f:
                if '"type":"started"' in line:
                    agents += 1
                    m = re.search(r'"label":"([^"]*)"', line)
                    if m:
                        label = m.group(1)
    except OSError:
        return None, ""
    return agents, label


def machine():
    out = {}
    try:
        out["load"] = [round(x, 2) for x in os.getloadavg()]
    except (OSError, AttributeError):
        pass
    if sys.platform == "darwin":
        today = datetime.now().strftime("%Y-%m-%d")
        try:
            log = subprocess.run(["pmset", "-g", "log"], capture_output=True, text=True, timeout=20).stdout
            out["thermalSleepsToday"] = sum(1 for l in log.splitlines() if l.startswith(today) and "Thermal Emergency Sleep" in l)
        except (OSError, subprocess.SubprocessError):
            pass
    return out


def last_commit(repo):
    try:
        r = subprocess.run(["git", "-C", repo, "log", "-1", "--all", "--format=%cI|%s"], capture_output=True, text=True, timeout=10)
        at, _, text = r.stdout.strip().partition("|")
        return {"at": at, "text": text} if at else None
    except (OSError, subprocess.SubprocessError):
        return None


def build(repo, journal=None, run_label=None, run_cap=None, cache=None, box=None):
    # a missing .sdlc/ is an empty page, not an error: with --out the page lands where the driver
    # points (default <repo>/.sdlc/tracker), and render() creates that dir when it does not exist
    sdlc = os.path.join(repo, ".sdlc")
    config = read_json(os.path.join(sdlc, "config.json"), {})
    reqs = read_json(os.path.join(sdlc, "requirements.json"), [])
    raw = read_json(os.path.join(sdlc, "slices.json"), [])
    slices = raw if isinstance(raw, list) else raw.get("slices", [])
    milestones = read_json(os.path.join(sdlc, "milestones.json"), [])
    log = read_log(sdlc)

    done_at = {}
    for e in log:
        if e.get("type") == "slice-merged" and e.get("slice"):
            done_at[e["slice"]] = e.get("ts")

    out_slices = []
    for s in slices:
        if s.get("status") == "rejected":
            continue
        row = {"id": s["id"], "title": s.get("title", ""), "status": s.get("status", "todo"), "doneAt": done_at.get(s["id"])}
        # the verify-economy ledger rides along so the hub's index and the page can price verification
        if isinstance(s.get("ledger"), list) and s["ledger"]:
            row["ledger"] = s["ledger"]
        out_slices.append(row)

    rs = [r.get("status") for r in reqs if "obsolete" not in (r.get("flags") or [])]
    requirements = {"done": rs.count("done"), "total": len(rs), "parked": rs.count("parked")}

    agents, label = journal_stats(journal)
    current = next((s for s in slices if s.get("status") == "in_progress"), None)
    phase = label.split(":")[0] if label else (current.get("phase", "") if current else "")

    stamps = [e.get("ts") for e in log if e.get("ts")]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "title": spec_title(repo, config),
        "updatedAt": now,
        "startedAt": min(stamps) if stamps else now,
        "run": {"label": run_label or "Current run", "agents": agents, "cap": run_cap} if agents is not None else None,
        "requirements": requirements,
        "decisions": count_headings(os.path.join(sdlc, "DECISIONS.md")),
        "proposals": count_headings(os.path.join(sdlc, "SPEC-PROPOSALS.md")),
        "current": {"id": current["id"], "title": current.get("title", ""), "phase": phase} if current else None,
        # the latest agent label is "<role>:<slice or milestone id>:..." while a run is live
        "activity": {"role": label.split(":")[0], "target": (label.split(":") + [""])[1]} if label else None,
        "lastCommit": last_commit(repo),
        "machine": box if box is not None else machine(),
        # the live workflow view: phases and their agents; None when the run folder cannot be read
        "workflow": safe_workflow(journal, cache),
        "recent": [{"at": e.get("ts", ""), "kind": e.get("type", ""), "slice": e.get("slice", ""), "text": str(e.get("detail", ""))[:240]} for e in log[-8:]],
        "milestones": [
            {k: m.get(k) for k in ("id", "title", "demo", "ui", "slices", "status", "attempts", "fixSlices", "gaps")}
            for m in milestones
        ],
        "slices": out_slices,
    }


def safe_workflow(journal, cache):
    try:
        return workflow.build(journal, SCRIPT, cache)
    except Exception as e:  # the run folder's format is not ours: a surprise there never breaks the tracker
        print(f"workflow view not built: {e}", file=sys.stderr)
        return None


def render(data, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    if os.sep + ".sdlc" + os.sep in out_dir + os.sep:
        # generated output: keep it out of the agents' `git add .sdlc` state commits
        with open(os.path.join(out_dir, ".gitignore"), "w") as f:
            f.write("*\n")
    with open(os.path.join(out_dir, "status.json"), "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(TEMPLATE) as f:
        page = f.read()
    if MARKER not in page:
        raise SystemExit("template.html is missing the status marker")
    # "</" inside JSON strings would close the <script> tag early
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    with open(os.path.join(out_dir, "index.html"), "w") as f:
        f.write(page.replace(MARKER, blob))
    return os.path.join(out_dir, "index.html")


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


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=".")
    ap.add_argument("--out")
    ap.add_argument("--journal", help="the running Workflow's journal.jsonl, for agent counts and the live phase")
    ap.add_argument("--run-label")
    # the workflow's agent allowance, which sdlc-loop.js resets at every milestone — not a whole-run bound
    ap.add_argument("--run-cap", type=int, default=850, metavar="N", help="the agent cap sdlc-loop.js compares against; an allowance per milestone, not a limit on the run")
    ap.add_argument("--watch", type=int, default=0, metavar="SECONDS", help="keep rebuilding at this interval until the run folder goes quiet or a newer watcher starts")
    ap.add_argument("--publish", action="store_true", help="publish the page through the machine's sdlc hub (implies --watch); the hub serves it at a fixed url on 127.0.0.1:8787")
    ap.add_argument("--stop-watch", action="store_true", help="stop a running watcher (the loop has ended), then build once")
    ap.add_argument("--data", help="render this status.json instead of reading .sdlc/ (for examples)")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    out = os.path.abspath(a.out or os.path.join(repo, ".sdlc", "tracker"))
    if a.data:
        data = read_json(a.data, None)
        if data is None:
            raise SystemExit(f"cannot read {a.data}")
        print(render(data, out))
        return
    pid_file = os.path.join(out, "watch.pid")
    if a.stop_watch:
        try:
            os.remove(pid_file)
        except OSError:
            pass
    cache, box, rep, slow_at, me = {}, None, None, 0, str(os.getpid())
    poke = os.path.join(out, "poke")
    full_at = live_at = 0
    poked = mtime(poke)
    if a.publish:
        # a url only means something if the page keeps rebuilding behind it
        a.watch = a.watch or 60
    if a.watch:
        # the newest watcher owns the pid file; an older one sees the change and exits
        os.makedirs(out, exist_ok=True)
        with open(pid_file, "w") as f:
            f.write(me)
    url_file = os.path.join(out, "url")
    published = ensure_hub() if a.publish else False
    rid = run_id(repo) if published else None
    try:
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
                    if a.stop_watch and (data.get("workflow") or {}).get("run"):
                        # --stop-watch runs when the loop has ended; the run folder may still look recent
                        workflow.mark_ended(data["workflow"]["run"])
                    page = render(data, out)
                    write_live(out, data.get("workflow"))
                    if a.publish and (not published or hub_answers() is not True):
                        # unpublished yet (a squatter was here at startup), or the hub died
                        # mid-run: respawn it (or report the squatter) at the minute tick
                        published = ensure_hub()
                        rid = run_id(repo) if published else None
                    if published:
                        # registered only now, so a url that exists always has a page behind it;
                        # rewriting the file is also the heartbeat, so this runs on every build
                        if register(repo, out, rid):
                            with open(url_file, "w") as f:
                                f.write(f"http://127.0.0.1:{hub.hub_port()}/r/{rid}/\n")
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
                    if published:
                        heartbeat(rid)
                except Exception as e:  # leave the last live.js; the page shows "paused" if this keeps failing
                    print(f"live view not rebuilt: {e}", file=sys.stderr)
            time.sleep(TICK_SECONDS)
            try:
                with open(pid_file) as f:
                    if f.read().strip() != me:
                        return
            except OSError:
                return
    finally:
        # the url is withdrawn with the watcher, so a stale one is never left to be opened
        try:
            os.remove(url_file)
        except OSError:
            pass


if __name__ == "__main__":
    main()
