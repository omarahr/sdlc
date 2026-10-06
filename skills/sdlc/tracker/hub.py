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
        # valid JSON but not a registration (no id, out dir or pid): skipped like a corrupt one
        if not isinstance(entry, dict) or not entry.get("id") or not entry.get("out") or not entry.get("pid"):
            continue
        (live if age < LIVE_SECONDS and pid_alive(entry.get("pid")) else stale).append(entry)
    return live, stale


def title_of(entry):
    try:
        with open(os.path.join(entry["out"], "status.json")) as f:
            status = json.load(f)
    except (OSError, ValueError):
        return entry["id"]
    if not isinstance(status, dict):
        return entry["id"]  # a status.json that is not an object has no title
    return status.get("title") or entry["id"]


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
