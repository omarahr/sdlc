#!/usr/bin/env python3
"""Build the /sdlc progress tracker: a self-contained HTML page from the repo's .sdlc/ state.

Usage:
  collect.py [--repo DIR] [--out DIR] [--journal FILE] [--run-label TEXT] [--run-cap N]

Writes <out>/status.json and <out>/index.html (default out: <repo>/.sdlc/tracker).
Open index.html in a browser; it reloads itself every minute, so re-running this
script (the /sdlc heartbeat does) keeps the page current. Python 3 standard library only.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "template.html")
MARKER = "/*__SDLC_STATUS__*/null"


def read_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


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


def build(repo, journal=None, run_label=None, run_cap=None):
    sdlc = os.path.join(repo, ".sdlc")
    if not os.path.isdir(sdlc):
        raise SystemExit(f"no .sdlc/ in {repo}: run /sdlc first")
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

    out_slices = [
        {"id": s["id"], "title": s.get("title", ""), "status": s.get("status", "todo"), "doneAt": done_at.get(s["id"])}
        for s in slices
        if s.get("status") != "rejected"
    ]

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
        "machine": machine(),
        "recent": [{"at": e.get("ts", ""), "kind": e.get("type", ""), "slice": e.get("slice", ""), "text": str(e.get("detail", ""))[:240]} for e in log[-8:]],
        "milestones": [
            {k: m.get(k) for k in ("id", "title", "demo", "ui", "slices", "status", "attempts", "fixSlices", "gaps")}
            for m in milestones
        ],
        "slices": out_slices,
    }


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


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=".")
    ap.add_argument("--out")
    ap.add_argument("--journal", help="the running Workflow's journal.jsonl, for agent counts and the live phase")
    ap.add_argument("--run-label")
    ap.add_argument("--run-cap", type=int, default=850)
    ap.add_argument("--data", help="render this status.json instead of reading .sdlc/ (for examples)")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    out = os.path.abspath(a.out or os.path.join(repo, ".sdlc", "tracker"))
    data = read_json(a.data, None) if a.data else build(repo, a.journal, a.run_label, a.run_cap)
    if data is None:
        raise SystemExit(f"cannot read {a.data}")
    print(render(data, out))


if __name__ == "__main__":
    main()
