#!/usr/bin/env python3
"""Receipts for full test-suite runs, so the same code is not tested twice.

The regression verifier records that the full suite passed on a commit. Later steps ask whether a
receipt covers the code they are about to test:
- the integrator's final check, which then does not run the suite again;
- the next slice's test-time budget, which uses the receipt's wall time as its baseline.

"The same code" means the same tree outside .sdlc/: state commits do not invalidate a receipt, and
a receipt stays valid after its slice branch is merged and deleted.

The suite slot serializes full-suite runs on one repo, so two agents never run two suites there at
once. `slot` takes an exclusive flock on .sdlc/suite.lock. With no --timeout it blocks until the
slot is free and then holds it: the process stays alive keeping the flock, and exits 0 when the
hold ends. --timeout 0 only probes: exit 1 when the slot is busy, 0 when it is free (the probe
gives the slot up when it exits). --timeout N waits at most N seconds and exits 1 if it never got
the slot. `slot-release` ends the hold, and it runs in a different process than the holder — which
an flock cannot serve, because a flock belongs to the open file description that took it and no
other description can unlock it. So a hold ends when the lock file is gone, which is what
slot-release does: it removes .sdlc/suite.lock, the holder sees the path change under it and exits,
giving the flock up with it. Removing the file strands a waiter that is blocked on the old inode —
which is why nothing here ever blocks on one: every attempt reopens the path, and the holder
watches the path rather than sleeping blindly, so no one is left holding or waiting on the inode
that was removed.

Usage:
  suite-receipt.py write --repo DIR --slice ID --ref REF --seconds N --result pass|fail [--commands a,b]
  suite-receipt.py check --repo DIR --slice ID [--ref REF] [--need a,b]
  suite-receipt.py baseline --repo DIR --ref REF
  suite-receipt.py baseline-write --repo DIR --ref REF --seconds N
  suite-receipt.py slot --repo DIR [--timeout N]
  suite-receipt.py slot-release --repo DIR

Every command prints one JSON object. Python 3 standard library only. The slot's holder prints its
one object when it takes the slot and prints nothing more when the release ends its hold.
"""
import argparse
import fcntl
import glob
import hashlib
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

COMMANDS = "test,lint,typecheck,build"


def git(repo, *args):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(json.dumps({"ok": False, "valid": False, "error": f"git {' '.join(args)}: {r.stderr.strip()}"}))
    return r.stdout


def code_id(repo, ref):
    """A hash of the tree at `ref` without .sdlc/: equal for two commits that differ only in workflow state."""
    rows = [l for l in git(repo, "ls-tree", ref).splitlines() if not l.endswith("\t.sdlc")]
    return hashlib.sha256("\n".join(rows).encode()).hexdigest()


def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_json(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(value, f, indent=2)
        f.write("\n")


def receipt_path(repo, slice_id):
    return os.path.join(repo, ".sdlc", "slices", slice_id, "verification", "suite-receipt.json")


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def lock_path(repo):
    return os.path.join(repo, ".sdlc", "suite.lock")


def slot(repo, timeout):
    """Take the suite slot. Prints its answer and exits, so it never returns; see the docstring."""
    path = lock_path(repo)
    deadline = None if timeout is None else time.monotonic() + timeout
    while True:
        os.makedirs(os.path.join(repo, ".sdlc"), exist_ok=True)
        fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except OSError:
            os.close(fd)
        if deadline is not None and time.monotonic() >= deadline:
            print(json.dumps({"ok": False, "busy": True}))
            sys.exit(1)
        time.sleep(0.2)
    if timeout == 0:
        # a probe only answers; it gives the slot up when it exits
        os.close(fd)
        print(json.dumps({"ok": True, "busy": False}))
        sys.exit(0)
    # the pid is for whoever debugs a stuck slot; state, not part of the answer
    os.ftruncate(fd, 0)
    os.write(fd, f"{os.getpid()}\n".encode())
    print(json.dumps({"ok": True, "held": True}))
    sys.stdout.flush()
    # hold: stay alive keeping the flock until the lock file is gone or swapped, then exit 0 and
    # give the flock up with the process. Polling rather than a blocking flock keeps no one waiting
    # on an inode that slot-release may have removed.
    mine = os.fstat(fd).st_ino
    while True:
        try:
            if os.stat(path).st_ino != mine:
                sys.exit(0)
        except FileNotFoundError:
            sys.exit(0)
        time.sleep(0.2)


def slot_release(repo):
    path = lock_path(repo)
    try:
        os.unlink(path)
        released = True
    except FileNotFoundError:
        released = False
    return {"ok": True, "released": released}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("write")
    p.add_argument("--slice", required=True)
    p.add_argument("--ref", required=True)
    p.add_argument("--seconds", type=float, required=True, help="wall time of the test command")
    p.add_argument("--result", choices=["pass", "fail"], required=True)
    p.add_argument("--commands", default=COMMANDS, help="the config.commands that ran to completion")
    p = sub.add_parser("check")
    p.add_argument("--slice", required=True)
    p.add_argument("--ref", default="HEAD")
    p.add_argument("--need", default=COMMANDS)
    p = sub.add_parser("baseline")
    p.add_argument("--ref", required=True)
    p = sub.add_parser("baseline-write")
    p.add_argument("--ref", required=True)
    p.add_argument("--seconds", type=float, required=True)
    p = sub.add_parser("slot")
    p.add_argument("--timeout", type=float, default=None, help="0 probes; N waits at most N seconds; omit to block and hold")
    p = sub.add_parser("slot-release")
    for q in sub.choices.values():
        q.add_argument("--repo", default=".")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    names = lambda s: sorted({c.strip() for c in s.split(",") if c.strip()})

    if a.cmd == "write":
        rec = {
            "commit": git(repo, "rev-parse", a.ref).strip(),
            "code": code_id(repo, a.ref),
            "result": a.result,
            "seconds": round(a.seconds),
            "commands": names(a.commands),
            "at": now(),
        }
        write_json(receipt_path(repo, a.slice), rec)
        out = {"ok": True, **rec}
    elif a.cmd == "check":
        rec = read_json(receipt_path(repo, a.slice))
        missing = [c for c in names(a.need) if c not in ((rec or {}).get("commands") or [])]
        if not rec:
            out = {"valid": False, "reason": "no receipt for this slice"}
        elif rec.get("result") != "pass":
            out = {"valid": False, "reason": "the recorded run did not pass"}
        elif missing:
            out = {"valid": False, "reason": f"the recorded run did not cover: {', '.join(missing)}"}
        elif rec.get("code") != code_id(repo, a.ref):
            out = {"valid": False, "reason": f"the code at {a.ref} differs from the code that was tested ({str(rec.get('commit'))[:9]})"}
        else:
            out = {"valid": True, "commit": rec.get("commit"), "seconds": rec.get("seconds"), "commands": rec.get("commands"), "at": rec.get("at")}
    elif a.cmd == "baseline":
        code = code_id(repo, a.ref)
        found = None
        paths = [os.path.join(repo, ".sdlc", "test-baseline.json")] + sorted(glob.glob(receipt_path(repo, "*")), key=os.path.getmtime, reverse=True)
        for path in paths:
            rec = read_json(path)
            # a failed run's wall time says nothing about the suite
            if rec and rec.get("code") == code and rec.get("seconds") and rec.get("result", "pass") == "pass":
                found = {"valid": True, "seconds": rec["seconds"], "source": os.path.relpath(path, repo)}
                break
        out = found or {"valid": False, "reason": f"no recorded run of the code at {a.ref}"}
    elif a.cmd == "slot":
        # slot prints and exits itself: the holder keeps its one line from taking the slot, and the
        # release ends its hold without a second one
        slot(repo, a.timeout)
    elif a.cmd == "slot-release":
        out = slot_release(repo)
    else:
        rec = {"commit": git(repo, "rev-parse", a.ref).strip(), "code": code_id(repo, a.ref), "seconds": round(a.seconds), "at": now()}
        write_json(os.path.join(repo, ".sdlc", "test-baseline.json"), rec)
        out = {"ok": True, **rec}
    print(json.dumps(out))


if __name__ == "__main__":
    try:
        main()
    except SystemExit as e:
        if isinstance(e.code, str):
            print(e.code)
            sys.exit(2)
        raise
