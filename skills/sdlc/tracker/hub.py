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
import socketserver
import sys
import time
import urllib.parse
from datetime import datetime, timezone
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
    except (OSError, ValueError, TypeError, OverflowError):
        return False  # a missing or non-numeric pid counts as dead, never as a crash


def find_entry(rid):
    if not ID_CHARS.fullmatch(rid):
        return None
    try:
        with open(os.path.join(runs_dir(), rid + ".json")) as f:
            entry = json.load(f)
    except (OSError, ValueError):
        return None
    # same validation as read_entries: without id and out there is nothing to serve
    if not isinstance(entry, dict) or not entry.get("id") or not entry.get("out"):
        return None
    return entry


def read_entries(now):
    """The registered runs as [(live, stale, age)]; files quiet for a day are pruned instead."""
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
        # valid JSON but not a registration (no id, out dir or pid): skipped like a corrupt one
        if not isinstance(entry, dict) or not entry.get("id") or not entry.get("out") or not entry.get("pid"):
            continue
        bucket = live if age < LIVE_SECONDS and pid_alive(entry.get("pid")) else stale
        bucket.append((entry, age))
    return live, stale


def rel(seconds):
    """A span as a human would say it: just now, 5 min, 2 h 3 min, 2 days."""
    s = max(0, int(seconds))
    if s < 60:
        return "just now"
    if s < 3600:
        return f"{s // 60} min"
    if s < 24 * 3600:
        h, m = s // 3600, (s % 3600) // 60
        return f"{h} h {m} min" if m else f"{h} h"
    return f"{s // (24 * 3600)} days"


def ago(seconds):
    r = rel(seconds)
    return r if r == "just now" else r + " ago"


def started_ago(entry, now):
    """How long ago the run started, from the registration's startedAt; None when unreadable."""
    try:
        d = datetime.fromisoformat(str(entry.get("startedAt")).replace("Z", "+00:00"))
    except (ValueError, TypeError, AttributeError):
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)  # a naive stamp came from us: it is UTC
    return (datetime.fromtimestamp(now, timezone.utc) - d).total_seconds()


def economics(slices, status):
    """Verify economics over the slices' ledger rows, for the run card: the refutation→fix rate (a
    refuted row for a slice followed by a verified row at a higher round), the infra retries, the
    fix-round distribution (the highest verify round each slice reached) and the run agents per
    verify round (run-wide, not battery-only). The hub never reads the journal: collect.py already
    counted it into status.json's run.agents — every agent the run spent, build and review and gate
    included — and that count is divided by the verify rounds the ledger records. None while no
    slice has recorded a round."""
    refuted = fixed = infra = verify_rounds = 0
    dist = {}
    seen = False
    for s in slices or []:
        if not isinstance(s, dict):
            continue
        rows = s.get("ledger")
        if not isinstance(rows, list):
            continue
        seen = seen or bool(rows)
        slice_refuted = slice_fixed = False
        ref_round = None
        max_round = -1
        for r in rows:
            if not isinstance(r, dict):
                continue
            try:
                rnd = int(r.get("round"))
            except (TypeError, ValueError):
                rnd = 0
            outcome = r.get("outcome")
            if outcome == "infra":
                infra += 1
            if r.get("kind") == "verify":
                verify_rounds += 1
                max_round = max(max_round, rnd)
            if outcome == "refuted":
                slice_refuted = True
                ref_round = rnd if ref_round is None else min(ref_round, rnd)
            elif outcome == "verified" and ref_round is not None and rnd > ref_round:
                slice_fixed = True
        if slice_refuted:
            refuted += 1
        if slice_fixed:
            fixed += 1
        if max_round >= 0:
            dist[max_round] = dist.get(max_round, 0) + 1
    if not seen:
        return None
    per_round = None
    run = status.get("run")
    if verify_rounds and isinstance(run, dict):
        try:
            agents = int(run.get("agents"))
            if agents >= 0:
                per_round = agents / verify_rounds
        except (TypeError, ValueError):
            pass
    return {"refuted": refuted, "fixed": fixed, "infra": infra, "dist": dist, "rounds": verify_rounds, "perRound": per_round}


def econ_html(e):
    """The run card's economics line: one muted row of mono numbers."""
    if not e:
        return ""
    parts = []
    if e["refuted"]:
        parts.append(f'<b>{e["fixed"]}/{e["refuted"]}</b> refuted fixed')
    if e["infra"]:
        parts.append(f'<b>{e["infra"]}</b> infra retries')
    if e["dist"]:
        line = " · ".join(f"r{r}×{n}" for r, n in sorted(e["dist"].items()))
        parts.append(f'max fix round <b>{max(e["dist"])}</b> <i>{html.escape(line)}</i>')
    if e["perRound"] is not None:
        p = e["perRound"]
        p = int(p) if p == int(p) else round(p, 1)
        parts.append('<span title="run-wide: every agent this run spent, divided by the verify rounds the ledger records — not the battery alone">'
                     f'<b>{p}</b> run agents/verify round</span>')
    if not parts:
        return ""
    return f'<p class="econ">{" · ".join(parts)}</p>'


def run_state(entry, now):
    """What the index shows about a run, from its tracker's status.json; every field falls back."""
    state = {"title": str(entry["id"]), "repo": str(entry.get("repo") or ""),
             "chip": "", "now": "", "counts": None, "econ": None}
    try:
        with open(os.path.join(entry["out"], "status.json")) as f:
            status = json.load(f)
    except (OSError, ValueError):
        return state
    if not isinstance(status, dict):
        return state  # a status.json that is not an object has no title either
    title = status.get("title")
    if isinstance(title, str) and title:
        state["title"] = title
    activity = status.get("activity")
    if isinstance(activity, dict) and isinstance(activity.get("role"), str) and activity["role"]:
        state["chip"] = activity["role"]
    current = status.get("current")
    if isinstance(current, dict) and isinstance(current.get("id"), str) and current["id"]:
        line = "slice " + current["id"]
        if isinstance(current.get("title"), str) and current["title"]:
            line += ": " + current["title"]
        state["now"] = line
    slices = status.get("slices")
    if isinstance(slices, list) and slices and all(isinstance(s, dict) for s in slices):
        state["counts"] = (sum(1 for s in slices if s.get("status") == "done"), len(slices))
    # economics reads the ledger rows defensively itself, so odd slices cost the counts, not the band
    state["econ"] = economics(slices if isinstance(slices, list) else [], status)
    return state


def run_card(entry, age, now, stale):
    """One run as a status card: beacon, title link, phase chip, progress; odd fields fall back."""
    st = run_state(entry, now)
    rid = str(entry["id"])
    href = urllib.parse.quote(rid)
    cls = "run stale" if stale else "run live"
    # a run that just went stale has been quiet for seconds: "quiet just now" reads wrong, so it stays "updated"
    when = f"updated {ago(age)}" if rel(age) == "just now" or not stale else f"quiet {rel(age)}"
    chip = f'<span class="chip">{html.escape(st["chip"])}</span>' if st["chip"] and not stale else ""
    parts = [html.escape(st["repo"]), f'<span class="mono">{html.escape(rid)}</span>']
    began = started_ago(entry, now)
    if began is not None:
        parts.append(f"started {ago(began)}")
    meta = " · ".join(p for p in parts if p)
    now_line = f'<p class="now">{html.escape(st["now"])}</p>' if st["now"] and not stale else ""
    bar = ""
    if st["counts"]:
        done, total = st["counts"]
        bar = (f'<div class="pbar"><div class="bar"><i style="width:{round(100 * done / total)}%'
               f'"></i></div><p class="n">{done}/{total} slices done</p></div>')
    econ = econ_html(st["econ"])
    return (f'<article class="{cls}">'
            f'<header><span class="beacon{" off" if stale else " on"}"></span>'
            f'<a href="/r/{href}/">{html.escape(st["title"])}</a>{chip}'
            f'<span class="when">{when}</span></header>'
            f'<p class="meta">{meta}</p>{now_line}{bar}{econ}</article>')


INDEX = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>sdlc runs on this machine</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="30">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%230b6fd4'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {
  --ground: #e6e8ec; --surface: #f7f8fa; --sunk: #edeff3; --ink: #0d1117; --muted: #59616f;
  --faint: #858d9b; --rule: #c6ccd5; --rule-soft: #dee2e9; --live: #0b6fd4; --live-soft: #e2ecfa;
  --held: #0f7a52; --hold: #a35c00;
  --sans: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --ground: #0b0e12; --surface: #13171d; --sunk: #191e25; --ink: #e7ebf1; --muted: #9aa3b1;
    --faint: #6b7482; --rule: #2b323c; --rule-soft: #222831; --live: #58a2f8; --live-soft: #16233a;
    --held: #46b581; --hold: #d99a3a;
  }
}
* { box-sizing: border-box; }
body { background: var(--ground); color: var(--ink); font-family: var(--sans); font-size: 13px; line-height: 1.45; margin: 2rem auto; max-width: 46rem; padding: 0 1rem; -webkit-font-smoothing: antialiased; }
h1 { margin: 0 0 2px; font-size: 19px; font-weight: 600; letter-spacing: -.01em; }
.sub { color: var(--muted); font-size: 12.5px; margin: 0 0 16px; }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
a { color: var(--live); }
/* the count band: how many runs are on the machine right now */
.board { display: flex; gap: 28px; padding: 12px 16px; background: var(--surface); border: 1px solid var(--rule); margin-bottom: 10px; }
.board .stat { color: var(--muted); font-size: 12px; }
.board .stat b { font-family: var(--mono); font-size: 22px; font-weight: 500; letter-spacing: -.02em; color: var(--ink); margin-right: 5px; font-variant-numeric: tabular-nums; }
.board .stat.on b { color: var(--live); }
/* one card per run, live first */
.run { background: var(--surface); border: 1px solid var(--rule); padding: 13px 16px; margin-bottom: 10px; min-width: 0; }
.run header { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.beacon { width: 8px; height: 8px; border-radius: 50%; background: var(--live); display: inline-block; flex: none; align-self: center; }
.beacon.on { animation: pulse 2.2s ease-in-out infinite; }
.beacon.off { background: var(--rule); }
@keyframes pulse { 50% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .beacon.on { animation: none; } }
.run header a { font-size: 14.5px; font-weight: 600; }
.chip { font-size: 10.5px; padding: 1px 7px; background: var(--live-soft); color: var(--live); border: 1px solid var(--live); white-space: nowrap; }
.when { margin-left: auto; color: var(--faint); font-size: 11.5px; white-space: nowrap; }
.meta { color: var(--muted); font-size: 12px; margin: 4px 0 0; overflow-wrap: anywhere; }
.now { color: var(--live); font-size: 12px; margin: 5px 0 0; }
.pbar { margin-top: 9px; }
.pbar .bar { height: 3px; background: var(--rule-soft); border-radius: 2px; overflow: hidden; }
.pbar .bar i { display: block; height: 100%; background: var(--held); }
.pbar .n { color: var(--faint); font-size: 11px; margin: 4px 0 0; }
/* the run's verify economics, off its slices' ledger rows */
.econ { margin: 8px 0 0; color: var(--muted); font-size: 11.5px; overflow-wrap: anywhere; }
.econ b { font-family: var(--mono); font-weight: 500; color: var(--ink); font-variant-numeric: tabular-nums; }
.econ i { font-style: normal; color: var(--faint); }
.run.stale { opacity: .8; }
.run.stale header a { color: var(--muted); }
.run.stale .when { color: var(--hold); font-weight: 500; }
.empty { background: var(--surface); border: 1px solid var(--rule); color: var(--muted); padding: 24px 16px; text-align: center; }
@media (max-width: 560px) { .board { gap: 20px; } .when { margin-left: 0; width: 100%; } }
</style></head>
<body><h1>sdlc runs on this machine</h1><p class="sub">Every /sdlc run this hub serves, live ones first.</p>
{items}
</body></html>"""


def index_page(now):
    live, stale = read_entries(now)
    cards = []
    for entries, is_stale in ((live, False), (stale, True)):
        for entry, age in entries:
            # a viewer wrote these fields: run_card coerces everything so one odd entry never 500s the index
            cards.append(run_card(entry, age, now, is_stale))
    if not cards:
        return INDEX.replace("{items}", '<div class="empty">No sdlc run is registered on this machine yet.</div>')
    board = ('<div class="board"><span class="stat on"><b>%d</b> live</span><span class="stat"><b>%d</b> stale</span></div>'
             % (len(live), len(stale)))
    return INDEX.replace("{items}", board + "\n".join(cards))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # the open pages poll every 2 s; a request line each is noise

    def send_body(self, code, body, ctype="text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # the tracker page loads live.js same-origin; CORP keeps other sites from including it
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
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
        except (OSError, ValueError):  # ValueError: an embedded null byte (%00) reaches open()
            self.send_body(404, b"not found\n", "text/plain")
            return
        self.send_body(200, body, mimetypes.guess_type(target)[0] or "application/octet-stream")


class HubServer(ThreadingHTTPServer):
    def server_bind(self):
        # HTTPServer.server_bind resolves getfqdn(host), a reverse DNS lookup that can stall for
        # minutes (GitHub's macOS runners); the hub only ever binds 127.0.0.1 and never uses the name
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]


def main():
    os.makedirs(runs_dir(), exist_ok=True)
    try:
        httpd = HubServer(("127.0.0.1", hub_port()), Handler)
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
