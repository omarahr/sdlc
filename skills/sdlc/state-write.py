#!/usr/bin/env python3
"""Deterministic writes to a repo's .sdlc/ state, so an agent makes one call instead of a dozen.

Usage:
  state-write.py patch-slice --repo DIR --slice ID   (the patch, a JSON object, on stdin)
  state-write.py status --repo DIR
  state-write.py add-requirements --repo DIR [--lens NAME] [--distinct]   (a JSON array on stdin)

patch-slice merges the patch into the slice, regenerates STATUS.md and commits on the slice branch.
status only regenerates STATUS.md. add-requirements appends ledger entries under a lock, so several
critics can add at the same time; it never commits.

Every command prints one JSON object. A non-zero exit means nothing was committed and the message
says why, and the caller then does the operation by hand. Python 3 standard library only.
"""
import argparse
import fcntl
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone


class Fail(Exception):
    pass


def git(repo, *args, check=True):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise Fail(f"git {' '.join(args)}: {(r.stderr or r.stdout).strip()}")
    return r


def read_json(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        if default is None:
            raise Fail(f"missing {path}")
        return default
    except ValueError as e:
        raise Fail(f"{path} is not valid JSON: {e}")


def write_json(path, value):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(value, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def read_text(path):
    try:
        with open(path) as f:
            return f.read()
    except OSError:
        return ""


def slices_of(raw):
    return raw if isinstance(raw, list) else raw.get("slices", [])


def subject(config, kind, text):
    """A commit subject, in the repo's commitFormat when it has one (see _common.md)."""
    fmt = config.get("commitFormat") or ""
    if not fmt:
        return f"{kind}(sdlc): {text}"
    out = fmt.replace("{type}", kind).replace("{id}", "sdlc").replace("{subject}", text)
    return out if "{id}" in fmt else out + " (sdlc)"


# ---------- STATUS.md ----------

def spec_title(repo, config):
    for line in read_text(os.path.join(repo, config.get("specPath") or "")).splitlines():
        if line.startswith("#"):
            return line.lstrip("#").strip()
    return config.get("specPath") or "spec"


def status_text(repo):
    s = os.path.join(repo, ".sdlc")
    config = read_json(os.path.join(s, "config.json"), {})
    reqs = read_json(os.path.join(s, "requirements.json"), [])
    slices = [x for x in slices_of(read_json(os.path.join(s, "slices.json"), [])) if x.get("status") != "rejected"]
    milestones = read_json(os.path.join(s, "milestones.json"), [])
    audit = read_json(os.path.join(s, "audit.json"), {})
    bar = read_json(os.path.join(s, "barraiser.json"), {})
    flag = lambda r, f: f in (r.get("flags") or [])
    live = [r for r in reqs if not flag(r, "obsolete")]
    current = next((x for x in slices if x.get("status") == "in_progress"), None)
    waiting = [x for x in slices if x.get("status") == "awaiting-merge"]
    nxt = next((m for m in milestones if m.get("status") != "verified"), None)
    name = lambda x: f"{x['id']} {x.get('title', '')}".strip() if x else "none"
    ids = lambda xs: ", ".join(x["id"] for x in xs) or "none"
    decisions = read_text(os.path.join(s, "DECISIONS.md"))
    proposals = read_text(os.path.join(s, "SPEC-PROPOSALS.md"))
    recent = []
    for line in read_text(os.path.join(s, "log.jsonl")).splitlines()[-10:]:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        recent.append("- " + " ".join(str(e.get(k)) for k in ("ts", "type", "slice", "detail") if e.get(k)))
    eye = []
    for x in slices:
        if x.get("status") == "parked":
            reason = (x.get("notes") or "").strip().splitlines()
            eye.append(f"- {x['id']} parked: {reason[0] if reason else 'see slices/' + x['id'] + '/failures.md'}")
    for m in milestones:
        if m.get("status") == "exhausted":
            eye.append(f"- {m['id']} not verified after 3 campaigns: {'; '.join(map(str, m.get('gaps') or [])) or 'see its report.md'}")
        elif m.get("gaps"):
            eye.append(f"- {m['id']} gaps: {'; '.join(map(str, m['gaps']))}")
    for x in waiting:
        eye.append(f"- {x['id']} awaiting merge: {x.get('pr') or 'no PR link'}")
    if os.path.exists(os.path.join(s, "STUCK.md")):
        eye.append("- STUCK.md: the loop stopped for a human decision")
    lines = [
        f"# SDLC status: {spec_title(repo, config)}",
        f"Updated: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "",
        f"Requirements: {sum(1 for r in live if r.get('status') == 'done')}/{len(live)} done"
        f" · {sum(1 for r in live if r.get('status') == 'parked')} parked"
        f" · {sum(1 for r in reqs if flag(r, 'external-stub'))} stubbed · {len(reqs) - len(live)} obsolete",
        f"Slices: {sum(1 for x in slices if x.get('status') == 'done')}/{len(slices)} done · current: {name(current)} · awaiting merge: {ids(waiting)}",
        f"Milestones: {sum(1 for m in milestones if m.get('status') == 'verified')}/{len(milestones)} verified"
        f" · next: {name(nxt)} · fixing: {ids([m for m in milestones if m.get('status') == 'fixing'])}",
        f"Audit: {'passed' if audit.get('passed') else 'pending'} · Bar raiser: round {bar.get('rounds', 0)}, dry rounds {bar.get('dryRounds', 0)}/2",
        f"ADRs: {len(re.findall(r'^### ADR-', decisions, re.M))} · Spec proposals: {len(re.findall(r'^### P-', proposals, re.M))}",
        "",
        "## Recent",
        *(recent or ["- nothing yet"]),
        "",
        "## Needs a human eye (non-blocking)",
        *(eye or ["- nothing"]),
        "",
    ]
    return "\n".join(lines)


def write_status(repo):
    with open(os.path.join(repo, ".sdlc", "STATUS.md"), "w") as f:
        f.write(status_text(repo))


# ---------- patch-slice ----------

def branch_exists(repo, name):
    return git(repo, "rev-parse", "--verify", "--quiet", f"refs/heads/{name}", check=False).returncode == 0


def milestone_of(milestones, slice_id):
    """The milestone a slice belongs to, or None: listed, a split child of a listed one, or a milestone fix slice."""
    for m in milestones or []:
        if slice_id in (m.get("slices") or []) or slice_id in (m.get("fixSlices") or []):
            return m.get("id") or None
    parent = re.sub(r"[a-z]$", "", slice_id)
    for m in milestones or []:
        # S-013a belongs to the milestone that lists its parent S-013
        if parent != slice_id and parent in (m.get("slices") or []):
            return m.get("id") or None
    for m in milestones or []:
        mid = m.get("id") or ""
        if mid and slice_id.startswith(f"S-fix-{mid}-"):
            return mid
    return None


def ensure_milestone_branch(repo, config, milestones, milestone_id):
    """sdlc/M-<id>, created from the run branch and pushed when it does not exist yet.

    A milestone that is already verified has had its branch deleted after its pull request
    merged, so a slice belonging to it builds on the run branch — that milestone shipped, and
    the run branch has been fast-forwarded to what it shipped.
    """
    if not milestone_id:
        return None
    want = f"sdlc/{milestone_id}"
    if branch_exists(repo, want):
        return want
    if next((m for m in milestones or [] if m.get("id") == milestone_id), {}).get("status") == "verified":
        return None
    run = config.get("runBranch") or ""
    if not run or not branch_exists(repo, run):
        raise Fail(f"stack mode needs the run branch {run or '(unset)'}, which does not exist")
    # a default branch that moved under the run cannot fast-forward; merge it in rather than rebase or force
    git(repo, "checkout", "-q", run)
    upstream = f"origin/{config.get('defaultBranch') or 'main'}"
    if git(repo, "merge", "-q", "--ff-only", upstream, check=False).returncode != 0:
        if git(repo, "merge", "-q", "--no-edit", upstream, check=False).returncode != 0:
            # both merges failed. A missing ref is tolerable — a --single-branch clone may have no
            # origin/<defaultBranch>, and the run branch is a sound base on its own — but a conflict is not:
            # it leaves the index unmerged, and the run branch must never be left mid-merge.
            if git(repo, "rev-parse", "-q", "--verify", "MERGE_HEAD", check=False).returncode == 0:
                git(repo, "merge", "--abort", check=False)
                raise Fail(f"{upstream} conflicts with {run}: resolve it there, then cut the milestone branch again")
    git(repo, "checkout", "-q", "-b", want)
    git(repo, "push", "-q", "-u", "origin", want, check=False)
    return want


def ensure_slice_branch(repo, config, slices, milestones, slice_id):
    """Be on sdlc/<id>, creating it as commit-state.md says when it does not exist yet."""
    want = f"sdlc/{slice_id}"
    if git(repo, "branch", "--show-current").stdout.strip() == want:
        return want
    if branch_exists(repo, want):
        git(repo, "checkout", "-q", want)
        return want
    me = next((x for x in slices if x.get("id") == slice_id), {})
    base = config.get("defaultBranch") or "main"
    for dep in me.get("dependsOn") or []:
        d = next((x for x in slices if x.get("id") == dep), None)
        if d and d.get("status") == "awaiting-merge" and branch_exists(repo, f"sdlc/{dep}"):
            base = f"sdlc/{dep}"
            break
    else:
        if config.get("gitMode") == "stack":
            # a slice builds on its milestone; one that belongs to no milestone (an audit fix) builds on the run branch
            mid = milestone_of(milestones, slice_id)
            created = ensure_milestone_branch(repo, config, milestones, mid) if mid else None
            # a slice must never be cut from the default branch in stack mode, so a run branch that is
            # unset or does not exist is an error here rather than a fall-through to main or a raw git failure
            base = created or ""
            if not base:
                run = config.get("runBranch") or ""
                if not run:
                    raise Fail("stack mode needs config.runBranch: a slice builds on its milestone branch, never on the default branch")
                if not branch_exists(repo, run):
                    raise Fail(f"stack mode needs the run branch {run}, which does not exist")
                base = run
        elif config.get("gitMode") == "pr":
            # the slice starts from the up-to-date default branch; with no remote, or uncommitted state, it starts from the local one
            if git(repo, "checkout", "-q", base, check=False).returncode == 0:
                git(repo, "pull", "-q", "--ff-only", check=False)
    git(repo, "checkout", "-q", "-b", want, base)
    return want


def patch_slice(repo, slice_id, patch):
    if not isinstance(patch, dict):
        raise Fail("the patch must be a JSON object")
    s = os.path.join(repo, ".sdlc")
    config = read_json(os.path.join(s, "config.json"))
    branch = ensure_slice_branch(repo, config, slices_of(read_json(os.path.join(s, "slices.json"))),
                                 read_json(os.path.join(s, "milestones.json"), []), slice_id)
    # read again: the branch just checked out holds this slice's state
    raw = read_json(os.path.join(s, "slices.json"))
    me = next((x for x in slices_of(raw) if x.get("id") == slice_id), None)
    if me is None:
        raise Fail(f"no slice {slice_id} in slices.json on {branch}")
    me.update(patch)
    write_json(os.path.join(s, "slices.json"), raw)
    if patch.get("status") == "in_progress":
        reqs = read_json(os.path.join(s, "requirements.json"), [])
        mine = set(me.get("requirements") or [])
        changed = False
        for r in reqs:
            if r.get("id") in mine and r.get("status") == "todo":
                r["status"] = "in_progress"
                changed = True
        if changed:
            write_json(os.path.join(s, "requirements.json"), reqs)
    write_status(repo)
    git(repo, "add", ".sdlc")
    if os.path.exists(os.path.join(repo, ".gitignore")):
        git(repo, "add", ".gitignore")
    if git(repo, "diff", "--cached", "--quiet", check=False).returncode != 0:
        git(repo, "commit", "-q", "-m", subject(config, "chore", f"state {slice_id} {' '.join(sorted(patch))} [{slice_id}]"))
    return {"ok": True, "branch": branch, "commit": git(repo, "rev-parse", "--short", "HEAD").stdout.strip()}


# ---------- add-requirements ----------

def norm(text):
    return re.sub(r"\s+", " ", str(text or "")).strip().lower()


def add_requirements(repo, items, lens, distinct):
    if not isinstance(items, list):
        raise Fail("the input must be a JSON array of requirements")
    path = os.path.join(repo, ".sdlc", "requirements.json")
    git_dir = git(repo, "rev-parse", "--absolute-git-dir").stdout.strip()
    # the lock lives outside .sdlc/, so it is never committed
    with open(os.path.join(git_dir, "sdlc-ledger.lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        reqs = read_json(path, [])
        top = max([int(m.group(1)) for r in reqs for m in [re.match(r"R-(\d+)$", str(r.get("id", "")))] if m] or [0])
        by_quote = {}
        for r in reqs:
            by_quote.setdefault(norm(r.get("quote")), r)
        added, duplicates = [], []
        for it in items:
            quote, acceptance = it.get("quote"), it.get("acceptance")
            if not quote or not acceptance:
                raise Fail("every requirement needs a quote and an acceptance")
            same = by_quote.get(norm(quote))
            if same and (not distinct or norm(same.get("acceptance")) == norm(acceptance)):
                duplicates.append({"quote": quote, "existing": same["id"], "acceptance": same.get("acceptance", "")})
                continue
            top += 1
            entry = {
                "id": f"R-{top:03d}",
                "specRef": it.get("specRef", ""),
                "quote": quote,
                "acceptance": acceptance,
                "status": "todo",
                "flags": list(it.get("flags") or []),
                "adrs": list(it.get("adrs") or []),
                "evidence": {"files": [], "tests": [], "commit": ""},
                "notes": it.get("notes") or (f"added by the completeness critic ({lens})" if lens else ""),
            }
            reqs.append(entry)
            by_quote.setdefault(norm(quote), entry)
            added.append({"id": entry["id"], "specRef": entry["specRef"]})
        if added:
            write_json(path, reqs)
    return {"ok": True, "added": added, "duplicates": duplicates}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("patch-slice")
    p.add_argument("--repo", default=".")
    p.add_argument("--slice", required=True)
    p = sub.add_parser("status")
    p.add_argument("--repo", default=".")
    p = sub.add_parser("add-requirements")
    p.add_argument("--repo", default=".")
    p.add_argument("--lens", default="")
    p.add_argument("--distinct", action="store_true", help="add an entry whose quote is already in the ledger when its acceptance differs")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    try:
        if not os.path.isdir(os.path.join(repo, ".sdlc")):
            raise Fail(f"no .sdlc/ in {repo}")
        if a.cmd == "status":
            write_status(repo)
            out = {"ok": True}
        else:
            try:
                data = json.load(sys.stdin)
            except ValueError as e:
                raise Fail(f"stdin is not valid JSON: {e}")
            out = patch_slice(repo, a.slice, data) if a.cmd == "patch-slice" else add_requirements(repo, data, a.lens, a.distinct)
    except Fail as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(2)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
