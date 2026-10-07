#!/usr/bin/env python3
"""Map a diff to the packages and tests it affects.

Usage: impact.py --repo <dir> --base <ref> --head <ref>

Prints {"changed": [files], "testFiles": [files], "packages": [dirs]} to stdout,
paths relative to the repo root ("." for a package at the repo root). Exit 0 even
when the package graph cannot be built: the mapping is best effort, so a fallback
answer (test files in the changed paths) beats failing the caller. When the graph
was not built, stderr carries a one-line note saying so.

Python 3 stdlib only.
"""

import argparse
import fnmatch
import glob as globmod
import json
import os
import posixpath
import re
import subprocess
import sys

TEST_PATTERNS = ("*.test.*", "*.spec.*", "*_test.go")


def run(args, cwd):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True)


def git_lines(args, repo):
    r = run(["git"] + args, repo)
    return r.stdout.splitlines() if r.returncode == 0 else None


def manifest(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def workspace_globs(repo):
    """Workspace globs from pnpm-workspace.yaml or the root package.json, or None if neither exists."""
    pnpm = os.path.join(repo, "pnpm-workspace.yaml")
    if os.path.exists(pnpm):
        globs, in_packages = [], False
        with open(pnpm, encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if not s or s.startswith("#"):
                    continue
                key = re.match(r"^([A-Za-z_-]+):\s*$", s)
                if key:
                    in_packages = key.group(1) == "packages"
                    continue
                item = re.match(r"^-\s*(.+)$", s)
                if item:
                    if in_packages:
                        globs.append(item.group(1).strip().strip("'\""))
                    continue
                if ":" not in s and ("*" in s or "/" in s):
                    # a bare glob line: hand-written rather than real yaml, still worth honoring
                    globs.append(s.strip("'\""))
        if globs:
            return globs
    root = os.path.join(repo, "package.json")
    if os.path.exists(root):
        try:
            ws = manifest(root).get("workspaces")
        except (OSError, ValueError):
            ws = None
        if isinstance(ws, dict):
            ws = ws.get("packages")
        if isinstance(ws, list) and ws:
            return [str(g) for g in ws]
    return None


def package_roots(repo):
    """Repo-relative dirs holding a package.json or go.mod, discovered under the workspace globs."""
    globs = workspace_globs(repo)
    if globs is None:
        globs = [""]  # no workspace file: the repo root is the one candidate
    dirs, seen = [], set()
    for g in globs:
        if g:
            matches = globmod.glob(g, root_dir=repo)
            has_wild = any(c in g for c in "*?[")
            if not matches and not has_wild:
                matches = [g]  # a literal workspace dir: honor it even if not created yet
        else:
            matches = [""]
        for m in matches:
            rel = posixpath.normpath(m.replace(os.sep, "/")) if m else ""
            if rel == "..":
                continue  # a workspace glob pointing outside the repo is nobody's package
            if rel == ".":
                rel = ""
            if rel not in seen:
                seen.add(rel)
                if os.path.isfile(os.path.join(repo, rel, "package.json")) or os.path.isfile(os.path.join(repo, rel, "go.mod")):
                    dirs.append(rel)
    return dirs


def load_packages(repo):
    """[{dir, name, deps, gomod}] for every package root; manifest reads are best effort."""
    pkgs = []
    for rel in package_roots(repo):
        name, deps, gomod = None, set(), False
        pj = os.path.join(repo, rel, "package.json")
        if os.path.isfile(pj):
            try:
                m = manifest(pj)
                name = m.get("name")
                for field in ("dependencies", "devDependencies"):
                    if isinstance(m.get(field), dict):
                        deps.update(m[field])
            except (OSError, ValueError):
                pass
        if os.path.isfile(os.path.join(repo, rel, "go.mod")):
            gomod = True
        pkgs.append({"dir": rel, "name": name, "deps": deps, "gomod": gomod})
    return pkgs


def go_module(repo, rel):
    try:
        with open(os.path.join(repo, rel, "go.mod"), encoding="utf-8") as f:
            for line in f:
                m = re.match(r"^module\s+(\S+)", line.strip())
                if m:
                    return m.group(1)
    except OSError:
        pass
    return None


def go_refine(repo, pkgs, changed, affected, notes):
    """Refine Go ownership to the go-listed package dirs and add Go reverse deps. Tolerates failure.

    A go.mod root would otherwise own every file in the module as one package, so when `go list`
    succeeds, the listed package dirs are the units matched instead; the root's coarse ownership
    (a go.mod with no package.json beside it) is superseded. On failure the coarse ownership stands
    and the note reaches stderr.
    """
    for p in (x for x in pkgs if x["gomod"]):
        module = go_module(repo, p["dir"])
        if not module:
            continue
        # realpath, not abspath: go list reports real paths, and on macOS /var is a symlink to
        # /private/var, so an unresolved base would make every relpath climb out with ../..
        base = os.path.realpath(os.path.join(repo, p["dir"]))
        r = run(["go", "list", "-f", "{{.Dir}}|{{.Imports}}", "./..."], base)
        if r.returncode != 0:
            err = r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "no output"
            notes.append(f"go list failed for {p['dir'] or '.'}: {err}")
            continue
        listed = []
        for line in r.stdout.splitlines():
            dir_part, _, imports_part = line.partition("|")
            dir_part = dir_part.strip()
            if not dir_part:
                continue
            rel_dir = os.path.relpath(dir_part, base).replace(os.sep, "/")
            rel_dir = "" if rel_dir == "." else posixpath.join(p["dir"], rel_dir)
            under_root = "" if rel_dir == p["dir"] else posixpath.relpath(rel_dir, p["dir"])
            import_path = module if not under_root else f"{module}/{under_root}"
            listed.append((rel_dir, import_path, imports_part.strip().strip("[]").split()))

        def owning(f):
            # the longest listed package dir holding the file; the module root holds whatever none does
            best_dir, best_len = None, -1
            for rd, _, _ in listed:
                if (rd == "" or f == rd or f.startswith(rd + "/")) and len(rd) > best_len:
                    best_dir, best_len = rd, len(rd)
            return best_dir

        changed_dirs = {owning(f) for f in changed if p["dir"] == "" or f.startswith(p["dir"] + "/")}
        changed_dirs.discard(None)
        if changed_dirs and not os.path.isfile(os.path.join(repo, p["dir"], "package.json")):
            affected.discard(p["dir"])
        affected |= changed_dirs
        changed_paths = {ip for rd, ip, _ in listed if rd in changed_dirs}
        for rd, _, imports in listed:
            if rd in affected:
                continue
            if any(i == cp or i.startswith(cp + "/") for cp in changed_paths for i in imports):
                affected.add(rd)  # reverse dependency: its Go code imports a changed package
    return affected


def is_test(path):
    name = posixpath.basename(path)
    return any(fnmatch.fnmatch(name, p) for p in TEST_PATTERNS)


def owning_package(changed_file, by_dir):
    """The longest package-dir prefix containing the file, or the repo root when it is itself a package."""
    best, found = "", False
    for d in by_dir:
        if d and changed_file.startswith(d + "/") and len(d) > len(best):
            best, found = d, True
    if not found and "" in by_dir:
        best, found = "", True  # a package at the repo root contains every file
    return best if found else None


def main():
    ap = argparse.ArgumentParser(description="Map a diff to affected packages and tests.")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--base", required=True)
    ap.add_argument("--head", required=True)
    a = ap.parse_args()
    repo = a.repo
    notes = []

    changed = git_lines(["diff", "--name-only", f"{a.base}...{a.head}"], repo)
    if changed is None:
        notes.append("git diff failed; no changed files were read")
        changed = []
    changed = [c.replace(os.sep, "/") for c in changed if c.strip()]
    tracked = {t.replace(os.sep, "/") for t in (git_lines(["ls-files"], repo) or [])}

    packages, test_files = [], []
    try:
        pkgs = load_packages(repo)
        if not pkgs:
            notes.append("no package.json or go.mod found; using the test files in the changed paths")
        by_dir = {p["dir"]: p for p in pkgs}
        affected = {d for d in (owning_package(f, by_dir) for f in changed) if d is not None}
        changed_names = {by_dir[d]["name"] for d in affected if by_dir[d]["name"]}
        for p in pkgs:
            if p["name"] and p["deps"] & changed_names:
                affected.add(p["dir"])  # reverse dependency: its package.json names a changed package
        go_refine(repo, pkgs, changed, affected, notes)
        packages = sorted(d or "." for d in affected)

        for d in affected:
            prefix = "" if d == "" else d + "/"
            test_files.extend(f for f in tracked if f.startswith(prefix) and is_test(f))
    except Exception as exc:  # the graph is best effort; fall back rather than fail the caller
        notes.append(f"package graph not built ({exc}); using the test files in the changed paths")
        packages, test_files = [], []

    # test files in the changed paths are always reported: graph built or not, they are affected by definition
    test_files.extend(f for f in changed if is_test(f) and f in tracked)
    test_files = sorted(set(test_files))

    if notes:
        print("impact: " + "; ".join(notes), file=sys.stderr)
    print(json.dumps({"changed": changed, "testFiles": test_files, "packages": packages}))


if __name__ == "__main__":
    main()