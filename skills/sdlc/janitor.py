#!/usr/bin/env python3
"""Reap stale scratch directories and leftover slice branches, once per run.

Usage: janitor.py --repo DIR [--days N]

Prints {"removedDirs": <n>, "removedBranches": [names], "notes": [strings]} to stdout and
always exits 0: the reaping is best effort, so every failure becomes a note. The state-reader
runs it before relaying its decision; the output is informational and never blocks.

Scratch reaping removes directories directly under the OS temp dir whose name starts with
`sdlc-` and whose mtime is older than --days. The age default is `janitorDays` from
<repo>/.sdlc/config.json when it is set there, else 7. Nothing deeper than a direct child of
the temp dir is ever visited, and a matching name that is not a directory is left alone.

Branch sweeping deletes local `sdlc/<id>-v<version>` branches — id and version each one path
segment — whose slice id has status `done` or `rejected` in <repo>/.sdlc/slices.json, and those
whose slice id is not in it at all: a crashed agent or a parked slice leaves its reattempt
branches behind, and the renumbered ids of a later run orphan the old ones. A stale worktree
registration pins its branch ("used by worktree"), so it is pruned before the sweep. Never
deleted, whatever the ledger says: `sdlc/<id>` itself (a v-branch only is swept), any
`-attempt-` branch, `sdlc/run-*` branches, and v-branches of slices with any other status (todo,
in_progress, awaiting-merge, parked). A missing or unparseable slices.json is a note: no branch
is deleted on a ledger that cannot be read, and the temp reaping still runs — it runs before the
sweep, so a branch-sweep failure can never disable it.

Python 3 standard library only.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import branches  # noqa: E402

SCRATCH_PREFIX = "sdlc-"
DEFAULT_DAYS = 7
# fnmatch's `*` crosses `/`, which would sweep foreign namespaced branches under sdlc/, so the
# v-branch shape is a regex: one segment of slice id, one segment of version
V_BRANCH = re.compile(r"^sdlc/[^/]+-v[^/]*$")
V_ID = re.compile(r"^sdlc/(.+)-v")
FINISHED = ("done", "rejected")


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def scratch_days(repo, days_arg, notes):
    """The scratch age in days: --days wins, then config.json's janitorDays, then 7."""
    if days_arg is not None:
        return days_arg
    path = os.path.join(repo, ".sdlc", "config.json")
    config = read_json(path)
    if config is None:
        if os.path.exists(path):
            notes.append("config.json is unreadable; the scratch age defaults to 7 days")
        return DEFAULT_DAYS
    days = config.get("janitorDays")
    return days if isinstance(days, (int, float)) and days >= 0 else DEFAULT_DAYS


def reap_scratch(days, notes):
    """Remove `sdlc-` directories directly under the temp dir older than `days`."""
    tmp = tempfile.gettempdir()
    cutoff = time.time() - days * 86400
    removed = 0
    try:
        entries = list(os.scandir(tmp))
    except OSError as exc:
        notes.append(f"the temp dir {tmp} could not be listed ({exc})")
        return 0
    for entry in entries:
        # the guard is the prefix test on a direct child of the temp dir: nothing deeper,
        # nothing without the prefix, and no symlink standing in for a directory, is touched
        if not entry.name.startswith(SCRATCH_PREFIX):
            continue
        try:
            if not entry.is_dir(follow_symlinks=False):
                continue
            if entry.stat(follow_symlinks=False).st_mtime >= cutoff:
                continue
            shutil.rmtree(entry.path, ignore_errors=False)
            removed += 1
        except OSError as exc:
            notes.append(f"{entry.path} was not reaped ({exc})")
    return removed


def sweep_branches(repo, statuses, notes):
    # a stale worktree registration pins its branch ("used by worktree at ...") and would block
    # the delete of exactly the branch this script is here to reap, round after round; the prune
    # self-heals it. Best effort: a failed prune falls through to the delete it would have unblocked.
    subprocess.run(["git", "-C", repo, "worktree", "prune"], capture_output=True, text=True)
    r = subprocess.run(
        ["git", "-C", repo, "for-each-ref", "--format=%(refname:short)", "refs/heads"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        notes.append(f"git for-each-ref failed: {r.stderr.strip()}")
        return []
    removed = []
    for name in r.stdout.splitlines():
        name = name.strip()
        if not V_BRANCH.match(name):
            continue
        m = V_ID.match(name)
        # unreachable for every name V_BRANCH accepts, but a miss here must mean "keep", never
        # a crash that takes both sweeps down with it
        if not m:
            continue
        # the guards come before the ledger: a branch the renumbered-id rule would call an
        # orphan is still never deleted when its name is one of these
        if "-attempt-" in name or name.startswith("sdlc/run-"):
            continue
        slice_id = m.group(1)
        status = statuses.get(slice_id)
        # an unknown id sweeps (orphan); a known one sweeps only when finished — and a slice
        # whose row carries no status is a known slice, so it is kept
        if slice_id in statuses and status not in FINISHED:
            continue
        d = subprocess.run(["git", "-C", repo, "branch", "-D", name], capture_output=True, text=True)
        if d.returncode != 0:
            notes.append(f"git branch -D {name} failed: {d.stderr.strip()}")
        else:
            removed.append(name)
    return removed


def main():
    ap = argparse.ArgumentParser(description="Reap stale scratch dirs and leftover slice branches.")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--days", type=int, default=None, help="scratch age in days; default janitorDays from config.json, else 7")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    notes = []
    removed_branches = []

    days = scratch_days(repo, a.days, notes)

    # a ledger that cannot be read sweeps no branch; the temp reaping runs regardless
    path = os.path.join(repo, ".sdlc", "slices.json")
    raw = read_json(path)
    statuses = None
    if not os.path.exists(path):
        notes.append("no .sdlc/slices.json: no branch sweeping, scratch reaping only")
    elif not isinstance(raw, list):
        notes.append(".sdlc/slices.json is missing or unparseable; no branch was deleted")
    else:
        statuses = {}
        for s in raw:
            if isinstance(s, dict) and s.get("id"):
                statuses[s["id"]] = s.get("status")

    # the reaping runs before the sweep: a failure in the branch sweep must never disable it
    removed_dirs = reap_scratch(days, notes)
    if statuses is not None:
        removed_branches = sweep_branches(repo, statuses, notes)
    print(json.dumps({"removedDirs": removed_dirs, "removedBranches": removed_branches, "notes": notes}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # best effort: the reaping never fails the caller
        print(json.dumps({"removedDirs": 0, "removedBranches": [], "notes": [f"the janitor stopped early ({exc})"]}))