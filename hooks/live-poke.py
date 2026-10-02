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
