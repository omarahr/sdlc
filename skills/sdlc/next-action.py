#!/usr/bin/env python3
"""Decide the single next action of the sdlc-loop workflow from the .sdlc/ state.

The state-reader agent runs this and returns its answer unchanged. Python 3, standard library only.

    python3 next-action.py --repo <repo> [--spec <path>] [--bar-raiser-rounds N] [--prs <file>]

It prints one JSON object:
  {"sync": ["<shell command>", ...]}       run these in the repo, then run this script again
  {"next": {...}, "checkout": "<branch>"}  the decision; "checkout" names the active slice branch, or is null

Checks run in this order, and the first that matches wins:
  A  stop or bootstrap     STOP file; a state PR that is not ready; no config, changed spec, new override
  B  finish work in flight a PR that can merge or was merged by a human; a slice in progress; a milestone holding the run
  C  milestones            no milestones.json; a milestone whose slices are finished
  D  start new work        the next todo slice with its dependencies met; a parked slice with retries left
  E  nothing can start     only PRs awaiting review; todo slices that nothing can unblock
  F  wrap up               audit; parked slices out of retries; bar raiser; done
Anything the state cannot explain is the action "error", which the workflow treats as a run without progress.

--prs takes {"open": [...], "merged": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

FINISHED = ("done", "parked")
SATISFIED = ("done", "awaiting-merge", "parked")
PARK_CYCLE_LIMIT = 3
MILESTONE_ATTEMPT_LIMIT = 3
PR_FIELDS = "number,headRefName,url,mergeable,reviewDecision,statusCheckRollup"


class StateError(Exception):
    """The state cannot be read or explained. Becomes the action "error"."""


# The valid git modes, read from the file beside this script rather than written here. state-write.py reads
# the same file; sdlc-loop.js cannot read a file at all, so it keeps its own literal and
# test/git-modes.test.mjs fails if the two disagree. config.json is written by an agent, so nothing else
# constrains gitMode to these four: an unrecognised one falls through every arm below and behaves like
# direct — slices committed to the default branch with no pull request and no push — which fails a stack
# run's central guarantee silently, so name it. A missing or malformed file stops the run here for the
# same reason: there is deliberately no fallback list, because a silent fallback is the drift this removes.
GIT_MODES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-modes.json")


def load_git_modes(path=GIT_MODES_PATH):
    try:
        with open(path) as f:
            modes = json.load(f)["gitModes"]
    except FileNotFoundError:
        raise StateError(f"{path} is missing, so no gitMode can be trusted: restore it from git")
    except ValueError as e:
        raise StateError(f"{path} is not valid JSON: {e}")
    except (KeyError, TypeError):
        raise StateError(f'{path} has no "gitModes" list')
    if not isinstance(modes, list) or not modes or not all(isinstance(m, str) and m for m in modes):
        raise StateError(f'{path} must hold {{"gitModes": ["<mode>", ...]}} naming at least one mode')
    return tuple(modes)


# every other StateError reaches the workflow as {"next": {"action": "error", ...}} on stdout, so the state-reader
# never sees silence. GIT_MODES is needed at import time, so it cannot raise the usual way; a bad file becomes a
# recorded error instead, which the state-reader relays like any other.
GIT_MODES = ()
GIT_MODES_ERROR = ""
try:
    GIT_MODES = load_git_modes()
except StateError as e:
    GIT_MODES_ERROR = str(e)


def run(repo, *cmd):
    try:
        r = subprocess.run(cmd, cwd=repo, capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)
    return r.returncode == 0, r.stdout if r.returncode == 0 else r.stderr


class Source:
    """Where state files are read from: the working tree, or a branch through `git show`."""

    def __init__(self, repo, branch=None):
        self.repo, self.branch = repo, branch

    def read(self, rel):
        if self.branch is None:
            try:
                with open(os.path.join(self.repo, rel), encoding="utf-8") as f:
                    return f.read()
            except OSError:
                return None
        ok, out = run(self.repo, "git", "show", f"{self.branch}:{rel}")
        return out if ok else None

    def json(self, rel, default=None):
        text = self.read(rel)
        if text is None:
            return default
        try:
            return json.loads(text)
        except ValueError as e:
            where = f" on {self.branch}" if self.branch else ""
            raise StateError(f"{rel}{where} is not valid JSON: {e}")


def as_list(value, key):
    # agents have written {"slices": [...]} instead of a bare array
    if isinstance(value, dict):
        value = value.get(key, [])
    return value if isinstance(value, list) else []


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def spec_hash(repo, spec_path):
    try:
        with open(os.path.join(repo, spec_path), "rb") as f:
            return sha256(f.read())
    except OSError:
        raise StateError(f"the spec {spec_path} cannot be read")


def ledger_hash(reqs):
    # the same bytes as `jq -c '[.[] | {id, status}]' requirements.json | shasum -a 256`
    ledger = [{"id": r.get("id"), "status": r.get("status")} for r in reqs]
    return sha256((json.dumps(ledger, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8"))


def count_overrides(text):
    return len(re.findall(r"^- Status: OVERRIDE", text or "", flags=re.M))


def counters(s):
    return {"planRevisions": 0, "fixRounds": 0, "ladderStep": 0, "parkCycles": 0, **(s.get("counters") or {})}


def check_passed(c):
    if c.get("__typename") == "StatusContext" or ("state" in c and "conclusion" not in c):
        return c.get("state") == "SUCCESS"
    return c.get("status") == "COMPLETED" and c.get("conclusion") in ("SUCCESS", "NEUTRAL", "SKIPPED")


def pr_ready(pr):
    """Mergeable, not waiting on a review, and every check passed. One rule for state, e2e and slice PRs."""
    return (
        pr.get("mergeable") == "MERGEABLE"
        and pr.get("reviewDecision") not in ("REVIEW_REQUIRED", "CHANGES_REQUESTED")
        and all(check_passed(c) for c in pr.get("statusCheckRollup") or [])
    )


def load_prs(repo, prs_file):
    if prs_file:
        with open(prs_file, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("open", []), data.get("merged", [])
    ok, out = run(repo, "gh", "pr", "list", "--state", "open", "--limit", "200", "--json", PR_FIELDS)
    if not ok:
        raise StateError(f"gh pr list failed, so open pull requests are unknown: {out.strip()[:200]}")
    ok2, out2 = run(repo, "gh", "pr", "list", "--state", "merged", "--limit", "200", "--json", "number,headRefName,url")
    if not ok2:
        raise StateError(f"gh pr list failed, so merged pull requests are unknown: {out2.strip()[:200]}")
    return json.loads(out), json.loads(out2)


def current_branch(repo):
    ok, out = run(repo, "git", "branch", "--show-current")
    return out.strip() if ok else ""


def branch_slices(repo, branch, current):
    """slices.json as a slice branch sees it, or None when the branch cannot be read."""
    src = Source(repo) if branch == current else Source(repo, branch)
    try:
        value = src.json(".sdlc/slices.json")
    except StateError:
        return None
    return None if value is None else as_list(value, "slices")


def active_branch(repo, current):
    """The local branch sdlc/<id> whose own slices.json marks <id> as in progress, if any."""
    ok, out = run(repo, "git", "for-each-ref", "--format=%(refname:short)", "refs/heads/sdlc/")
    if not ok:
        return None
    found = []
    for branch in out.split():
        sid = branch[len("sdlc/"):]
        slices = branch_slices(repo, branch, current) or []
        for i, s in enumerate(slices):
            if s.get("id") == sid and s.get("status") == "in_progress":
                found.append((branch != current, i, branch))
    return min(found)[2] if found else None


def children(s, by_id):
    """The slices a split slice became: the splitInto field, the <id><letter> ids, and ids named in its notes."""
    ids = list(s.get("splitInto") or [])
    ids += [i for i in by_id if re.fullmatch(re.escape(s["id"]) + "[a-z]", i)]
    m = re.search(r"split into (.+)", s.get("notes") or "")
    if m:
        ids += [t for t in re.findall(r"[A-Za-z0-9][A-Za-z0-9-]*", m.group(1)) if t in by_id]
    return [i for i in dict.fromkeys(ids) if i in by_id and i != s["id"]]


def settled(sid, by_id, ok_statuses, seen=()):
    """True when the slice needs no more work for this purpose. A split slice counts through its children,
    an id that does not exist is ignored, and a rejected slice that was not split will never change."""
    s = by_id.get(sid)
    if s is None or sid in seen:
        return True
    if s.get("status") in ok_statuses:
        return True
    if s.get("status") == "rejected":
        return all(settled(c, by_id, ok_statuses, seen + (sid,)) for c in children(s, by_id))
    return False


def slim_slice(s):
    # the workflow script uses only these fields; the agents read the rest from slices.json
    out = {
        "id": s["id"], "kind": s.get("kind", "spec"), "status": s.get("status", "todo"), "phase": s.get("phase", "plan"),
        "counters": counters(s), "seeds": s.get("seeds") or [], "pr": s.get("pr", ""),
    }
    # absent, not null: an unrated slice must route to the full battery, and only absence says so
    if s.get("risk"):
        out["risk"] = s["risk"]
    return out


def decide(repo, spec_arg, bar_rounds, prs_file):
    wt = Source(repo)
    sdlc = ".sdlc"

    # A. stop
    if os.path.exists(os.path.join(repo, sdlc, "STOP")):
        return {"next": {"action": "stop", "reason": "A: .sdlc/STOP exists"}}

    current = current_branch(repo)
    config = wt.json(f"{sdlc}/config.json")
    default = (config or {}).get("defaultBranch") or current
    base = wt if (not current or current == default) else Source(repo, default)
    if base.branch and base.read(f"{sdlc}/config.json") is None:
        base = wt
    config = base.json(f"{sdlc}/config.json")
    mode = (config or {}).get("gitMode")
    if mode and mode not in GIT_MODES:
        raise StateError(f"config.json has gitMode {mode!r}, which is not one of {', '.join(GIT_MODES)}: fix config.json rather than let the run deliver the wrong way")
    stack = mode == "stack"

    # sync and the state-PR wait (pr mode only: direct and mr mode have no pull requests for slices or state.
    # stack mode has pull requests for slices and milestones, but none for state, so it skips the state-PR arm)
    open_prs, merged_prs = [], []
    if config and mode in ("pr", "stack"):
        if not prs_file:
            run(repo, "git", "fetch", "-q", "origin")
        open_prs, merged_prs = load_prs(repo, prs_file)
        # both of these arms are pr mode's. In stack mode there are no sdlc/state-* pull requests at all, and
        # the e2e suite merges into the milestone branch locally rather than as a pull request, so an
        # sdlc/M-*-e2e pull request found here is stale and merging it would land e2e code straight on the
        # default branch, bypassing the milestone it belongs to.
        state_prs = [p for p in open_prs if mode == "pr" and p.get("headRefName", "").startswith("sdlc/state-")]
        e2e_prs = [p for p in open_prs if mode == "pr" and re.fullmatch(r"sdlc/M-.*-e2e", p.get("headRefName", ""))]
        ready = [p for p in state_prs + e2e_prs if pr_ready(p)]
        sync = [f"gh pr merge {p['number']} --squash --delete-branch" for p in ready]
        behind = False
        if not prs_file:
            ok_l, local = run(repo, "git", "rev-parse", default)
            ok_r, remote = run(repo, "git", "rev-parse", f"origin/{default}")
            if ok_l and ok_r and local.strip() != remote.strip():
                behind = run(repo, "git", "merge-base", "--is-ancestor", default, f"origin/{default}")[0]
        if sync or behind:
            # fast-forward the default branch without leaving a slice branch that is checked out
            sync.append(f"git pull --ff-only origin {default}" if current == default else f"git fetch origin {default}:{default}")
            return {"sync": sync}
        blocked = [p for p in state_prs if not pr_ready(p)]
        if blocked:
            p = blocked[0]
            return {"next": {"action": "wait", "reason": f"A: state PR {p.get('url') or p['number']} is not ready to merge, and the default branch is missing the state it carries"}}

    # A. bootstrap
    spec_path = spec_arg or (config or {}).get("specPath")
    if not config:
        return {"next": {"action": "bootstrap", "reason": "A: .sdlc/config.json is missing"}}
    if not spec_path:
        raise StateError("config.json has no specPath and none was given")
    if spec_hash(repo, spec_path) != config.get("specHash"):
        return {"next": {"action": "bootstrap", "reason": f"A: the spec {spec_path} changed since the last bootstrap"}}
    decisions = wt.read(f"{sdlc}/DECISIONS.md")
    overrides = count_overrides(decisions if decisions is not None else base.read(f"{sdlc}/DECISIONS.md"))
    if overrides != (config.get("overridesSeen") or 0):
        return {"next": {"action": "bootstrap", "reason": f"A: DECISIONS.md has {overrides} OVERRIDE entries, config has seen {config.get('overridesSeen') or 0}"}}

    # the effective state: the active slice branch when there is one, else the default branch
    active = active_branch(repo, current)
    src = base if not active else (wt if active == current else Source(repo, active))
    slices = as_list(src.json(f"{sdlc}/slices.json", []), "slices")
    reqs = as_list(src.json(f"{sdlc}/requirements.json", []), "requirements")
    for s in slices:
        if not isinstance(s, dict) or "id" not in s:
            raise StateError("slices.json has an entry without an id")
    by_id = {s["id"]: s for s in slices}

    # pr mode: a slice waiting on its pull request records that only on the PR's branch
    merged_heads = {p.get("headRefName"): p for p in merged_prs}
    pr_of = {}
    for p in open_prs:
        head = p.get("headRefName", "")
        sid = head[len("sdlc/"):] if head.startswith("sdlc/") else None
        if sid not in by_id:
            continue
        seen = branch_slices(repo, head, current)
        if seen is None:
            seen = branch_slices(repo, f"origin/{head}", current)
        on_branch = next((x for x in seen or [] if x.get("id") == sid), None)
        # a PR left open by an attempt that was since replanned or parked does not hold the slice
        if on_branch is None or on_branch.get("status") == "awaiting-merge":
            by_id[sid]["status"] = "awaiting-merge"
            by_id[sid]["pr"] = p.get("url") or by_id[sid].get("pr", "")
            pr_of[sid] = p

    # stack mode: an open milestone pull request holds the run. Keyed on the pull request's head alone,
    # never on milestones.json: the milestone's own record is committed on sdlc/M-<n> and only reaches the
    # branch this decision reads from when the pull request merges, so consulting it here would skip the
    # hold for exactly the milestone that needs it.
    milestone_hold = None
    if stack:
        for p in open_prs:
            head = p.get("headRefName", "")
            # the -e2e suffix is excluded explicitly, not by the pattern below: sdlc/M-1-e2e matches
            # `sdlc/M-[^/]+` exactly as a milestone branch does. Stack mode merges the e2e suite locally and
            # has no arm that would merge such a pull request, so holding on a stale one — left by a run
            # that changed mode — would livelock the run forever.
            #
            # Readiness is deliberately NOT part of this test. A milestone pull request holds the run while
            # it is open, because the next milestone cuts its branch from runBranch, which only moves onto
            # shipped code once this merges. On a repository with no required reviews — the common case — a
            # green milestone pull request is pr_ready, so holding only on a blocked one let control reach
            # C, which handed an already-verified milestone straight back to the milestone-writer to re-run
            # its whole behavior campaign against an open pull request.
            if re.fullmatch(r"sdlc/M-[^/]+", head) and not head.endswith("-e2e"):
                milestone_hold = (head[len("sdlc/"):], p.get("url") or p["number"])
                break

    def out(action, reason, s=None, **extra):
        nxt = {"action": action, "reason": reason, **extra}
        if s is not None:
            nxt["sliceId"], nxt["slice"] = s["id"], slim_slice(s)
        return {"next": nxt, "checkout": active if active and active != current else None}

    # B. finish work in flight
    for s in slices:
        if s.get("status") != "awaiting-merge":
            continue
        if s["id"] in pr_of and pr_ready(pr_of[s["id"]]):
            return out("retryMerge", f"B: the PR of {s['id']} is mergeable, approved and green", s)
        if s["id"] not in pr_of and f"sdlc/{s['id']}" in merged_heads:
            s["pr"] = merged_heads[f"sdlc/{s['id']}"].get("url") or s.get("pr", "")
            return out("retryMerge", f"B: the PR of {s['id']} was merged; record it", s)
    for s in slices:
        if s.get("status") == "in_progress":
            return out("slice", f"B: {s['id']} is in progress at phase {s.get('phase', 'plan')}", s)

    # The hold sits here, ahead of C, for two separate reasons. Ahead of C: a milestone's own state is committed
    # on its milestone branch, so the branch this decision reads from does not yet carry it and section C
    # still sees the milestone as due — it would hand the milestone straight back to the milestone-writer,
    # which would re-ship it and loop until a human merged. Ahead of D: the next milestone cuts its branch
    # from runBranch, which only moves onto shipped code once this pull request merges, so starting new work
    # now would build on unshipped ground.
    if milestone_hold:
        mid, url = milestone_hold
        return out("wait", f"B: milestone {mid} is not merged yet ({url}); the next milestone branches from runBranch, which only moves once this pull request merges, so the run holds until a human merges it")

    # C. milestones
    raw_milestones = src.json(f"{sdlc}/milestones.json")
    if raw_milestones is None and slices:
        return out("milestonePlan", "C: milestones.json is missing")
    milestones = as_list(raw_milestones or [], "milestones")
    for m in milestones:
        fixes = m.get("fixSlices") or []
        status = m.get("status", "pending")
        due = status == "pending" or (status == "fixing" and all(settled(f, by_id, FINISHED) for f in fixes))
        if not due or (m.get("attempts") or 0) >= MILESTONE_ATTEMPT_LIMIT:
            continue
        if all(settled(i, by_id, FINISHED) for i in list(m.get("slices") or []) + fixes):
            slim = {"id": m.get("id"), "status": status, "attempts": m.get("attempts") or 0, "fixSlices": fixes}
            return out("milestone", f"C: every slice of {m.get('id')} is finished", milestoneId=m.get("id"), milestone=slim)

    # D. start new work
    todo = [s for s in slices if s.get("status", "todo") == "todo"]
    for s in todo:
        if all(settled(d, by_id, SATISFIED) for d in s.get("dependsOn") or []):
            return out("slice", f"D: {s['id']} is the next todo slice with its dependencies met", s)
    for s in slices:
        if s.get("status") == "parked" and counters(s)["parkCycles"] < PARK_CYCLE_LIMIT:
            return out("parkedRetry", f"D: {s['id']} is parked with {counters(s)['parkCycles']} of {PARK_CYCLE_LIMIT} retries used", s)

    # E. nothing can start
    waiting = [s for s in slices if s.get("status") == "awaiting-merge"]
    if waiting and not todo:
        return out("wait", "E: only pull requests awaiting review remain: " + ", ".join(f"{s['id']} {s.get('pr', '')}".strip() for s in waiting))

    def counts():
        live = [r for r in reqs if "obsolete" not in (r.get("flags") or [])]
        verified = sum(1 for m in milestones if m.get("status") == "verified")
        exhausted = [m.get("id") for m in milestones if m.get("status") == "exhausted"]
        text = base.read(f"{sdlc}/DECISIONS.md") if decisions is None else decisions
        proposals = wt.read(f"{sdlc}/SPEC-PROPOSALS.md") or ""
        return (
            f"requirements {sum(1 for r in live if r.get('status') == 'done')}/{len(live)} done, "
            f"{sum(1 for r in live if r.get('status') == 'parked')} parked, "
            f"{sum(1 for r in live if 'external-stub' in (r.get('flags') or []))} external-stub; "
            f"milestones {verified}/{len(milestones)} verified"
            + (f" (exhausted: {', '.join(exhausted)})" if exhausted else "")
            + f"; {len(re.findall(r'^### ADR-', text or '', flags=re.M))} ADRs; "
            f"{len(re.findall(r'^### P-', proposals, flags=re.M))} spec proposals"
        )

    if todo:
        why = "; ".join(
            f"{s['id']} waits on " + ", ".join(d for d in s.get("dependsOn") or [] if not settled(d, by_id, SATISFIED))
            for s in todo
        )
        return out("livelock", f"E: todo slices that nothing can unblock: {why}", summary=counts())

    # F. wrap up
    audit = src.json(f"{sdlc}/audit.json")
    if audit is None or not audit.get("passed") or audit.get("ledgerHash") != ledger_hash(reqs):
        why = "missing" if audit is None else "failed" if not audit.get("passed") else "out of date"
        return out("audit", f"F: the audit is {why}")

    parked = [s for s in slices if s.get("status") == "parked"]
    parked_reqs = {r for s in parked for r in s.get("requirements") or []}
    unfinished = [r.get("id") for r in reqs if r.get("status") != "done" and r.get("id") not in parked_reqs]
    if unfinished:
        raise StateError("no slice is left to run, but these requirements are not done: " + ", ".join(map(str, unfinished[:10])))
    if parked:
        return out("livelock", "F: every parked slice is out of retries: " + ", ".join(s["id"] for s in parked), summary=counts())
    open_milestones = [m.get("id") for m in milestones if m.get("status") not in ("verified", "exhausted")]
    if open_milestones:
        raise StateError("no slice is left to run, but these milestones are neither verified nor exhausted: " + ", ".join(map(str, open_milestones)))

    bar = src.json(f"{sdlc}/barraiser.json")
    bar_open = bar is None or (bar.get("dryRounds") or 0) < 2
    rounds = (bar or {}).get("rounds") or 0
    if bar_open and rounds < bar_rounds:
        return out("barRaiserRound", f"F: the spec is complete; bar-raiser round {rounds + 1} of {bar_rounds}")
    hint = ""
    if bar_open and bar_rounds == 0:
        hint = "; bar raiser off (run /sdlc with --bar-raiser N to polish)"
    elif bar_open:
        hint = f"; the bar raiser used its {bar_rounds} round(s) without two dry rounds"
    return out("done", "F: everything is finished", summary=counts() + hint)


def main():
    ap = argparse.ArgumentParser(description="Decide the next sdlc-loop action from .sdlc/ state")
    ap.add_argument("--repo", required=True)
    ap.add_argument("--spec", default=None)
    ap.add_argument("--bar-raiser-rounds", type=int, default=0)
    ap.add_argument("--prs", default=None)
    a = ap.parse_args()
    try:
        if GIT_MODES_ERROR:
            raise StateError(GIT_MODES_ERROR)
        result = decide(os.path.abspath(a.repo), a.spec, a.bar_raiser_rounds, a.prs)
    except StateError as e:
        result = {"next": {"action": "error", "reason": str(e)}}
    except Exception as e:  # a crash must reach the workflow as an answer, never as silence
        result = {"next": {"action": "error", "reason": f"next-action.py failed: {type(e).__name__}: {e}"}}
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
