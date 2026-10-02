"""The live workflow view for the tracker: phases, and the agents under each, read from a Workflow run's folder.

A run folder holds journal.jsonl (one line when an agent starts, with its label and phase, and one when it
returns or fails) and one transcript per agent (agent-<id>.jsonl), which carries the timestamps, the model and
the token usage. Both formats belong to Claude Code and may change, so every reader here returns what it could
read and never raises: a missing piece leaves a gap on the page.
"""
import glob
import json
import os
import re
import time
from datetime import datetime, timezone

# a run, or an agent, with no file written for this long is treated as no longer running
LIVE_SECONDS = 30 * 60
EARLIER_RUNS = 20


def phases_from_script(path):
    """The phase titles of the workflow script's meta block, in order."""
    try:
        with open(path) as f:
            head = f.read(6000)
    except OSError:
        return []
    block = re.search(r"phases:\s*\[(.*?)\]", head, re.S)
    return re.findall(r"title:\s*'([^']*)'", block.group(1)) if block else []


def read_journal(path):
    agents, order = {}, []
    try:
        with open(path) as f:
            for line in f:
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                aid = e.get("agentId")
                if not aid:
                    continue
                if e.get("type") == "started":
                    agents[aid] = {"id": aid, "label": e.get("label") or aid, "phase": e.get("phase") or "", "status": "running"}
                    order.append(aid)
                elif e.get("type") in ("result", "failed") and aid in agents:
                    agents[aid]["status"] = "done" if e["type"] == "result" else "failed"
    except OSError:
        return None
    return [agents[a] for a in order]


def read_transcript(path):
    """Start, last activity, model and context tokens of one agent, from its transcript."""
    out = {}
    try:
        with open(path) as f:
            for line in f:
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                ts = e.get("timestamp")
                if ts:
                    out.setdefault("startedAt", ts)
                    out["lastAt"] = ts
                m = e.get("message")
                if not isinstance(m, dict):
                    continue
                if m.get("model") and not str(m["model"]).startswith("<"):
                    out["model"] = m["model"]
                u = m.get("usage")
                if isinstance(u, dict):
                    n = sum(int(u.get(k) or 0) for k in ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
                    if n:
                        out["tokens"] = n
    except OSError:
        pass
    return out


def seconds_between(a, b):
    try:
        t = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
        return max(0, round((t(b) - t(a)).total_seconds()))
    except (ValueError, AttributeError, TypeError):
        return None


def newest_mtime(run_dir):
    try:
        return max(os.path.getmtime(p) for p in glob.glob(os.path.join(run_dir, "*")))
    except (OSError, ValueError):
        return 0


def read_run(journal, live, cache=None):
    """One run: its agents with status, timing, model and tokens. `cache` keeps finished agents between rebuilds."""
    agents = read_journal(journal)
    if agents is None:
        return None
    run_dir = os.path.dirname(journal)
    cache = cache if cache is not None else {}
    for a in agents:
        key = (run_dir, a["id"])
        if key in cache and a["status"] != "running":
            a.update(cache[key])
            continue
        path = os.path.join(run_dir, f"agent-{a['id']}.jsonl")
        t = read_transcript(path)
        info = {"startedAt": t.get("startedAt"), "model": t.get("model", ""), "tokens": t.get("tokens", 0)}
        if a["status"] == "running":
            try:
                # an agent that died without a journal line would otherwise look busy forever
                quiet = time.time() - os.path.getmtime(path) >= LIVE_SECONDS
            except OSError:
                quiet = False
            if not live or quiet:
                a["status"] = "stopped"
                info["seconds"] = seconds_between(t.get("startedAt"), t.get("lastAt"))
        else:
            info["seconds"] = seconds_between(t.get("startedAt"), t.get("lastAt"))
            cache[key] = info
        a.update(info)
    starts = [a["startedAt"] for a in agents if a.get("startedAt")]
    ends = [a for a in agents if a.get("startedAt") and a.get("seconds") is not None]
    last = max((datetime.fromisoformat(a["startedAt"].replace("Z", "+00:00")).timestamp() + a["seconds"] for a in ends), default=None)
    return {
        "id": os.path.basename(run_dir),
        "live": live,
        "startedAt": min(starts) if starts else None,
        "endedAt": None if live or last is None else datetime.fromtimestamp(last, timezone.utc).isoformat(timespec="seconds"),
        "agents": agents,
    }


def summary(run):
    c = {"done": 0, "failed": 0, "stopped": 0, "running": 0}
    for a in run["agents"]:
        c[a["status"]] = c.get(a["status"], 0) + 1
    return {"id": run["id"], "startedAt": run["startedAt"], "endedAt": run["endedAt"], "agents": len(run["agents"]), **c}


def build(journal, script, cache=None):
    """The tracker's `workflow` block for the run at `journal`, plus a summary of the loop's earlier runs."""
    if not journal or not os.path.isfile(journal):
        return None
    phases = phases_from_script(script)
    run_dir = os.path.dirname(os.path.abspath(journal))
    live = time.time() - newest_mtime(run_dir) < LIVE_SECONDS
    run = read_run(journal, live, cache)
    if run is None:
        return None
    known = set(phases)
    earlier = []
    # each relaunch of the loop is a new run folder next to this one
    siblings = sorted(glob.glob(os.path.join(os.path.dirname(run_dir), "*", "journal.jsonl")), key=os.path.getmtime, reverse=True)
    for j in siblings:
        if os.path.dirname(os.path.abspath(j)) == run_dir or len(earlier) >= EARLIER_RUNS:
            continue
        r = read_run(j, False, cache)
        # another workflow launched from the same session is not part of this loop
        if r and r["agents"] and all(a["phase"] in known for a in r["agents"]):
            earlier.append(summary(r))
    name = desc = ""
    try:
        with open(script) as f:
            head = f.read(2000)
        name = (re.search(r"name:\s*'([^']*)'", head) or [None, ""])[1]
        desc = (re.search(r"description:\s*'([^']*)'", head) or [None, ""])[1]
    except OSError:
        pass
    return {"name": name, "description": desc, "phases": phases, "run": run, "earlier": earlier}
