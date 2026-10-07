#!/usr/bin/env python3
"""Deterministic writes to a repo's .sdlc/ state, so an agent makes one call instead of a dozen.

Usage:
  state-write.py patch-slice --repo DIR --slice ID   (the patch, a JSON object, on stdin)
  state-write.py status --repo DIR
  state-write.py base-branch --repo DIR --slice ID
  state-write.py add-requirements --repo DIR [--lens NAME] [--distinct]   (a JSON array on stdin)

patch-slice merges the patch into the slice, regenerates STATUS.md and commits on the slice branch.
status only regenerates STATUS.md. base-branch prints the branch a slice is cut from and changes
nothing at all, so a prompt asks it instead of re-deriving the rule. add-requirements appends ledger
entries under a lock, so several critics can add at the same time; it never commits.

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


# The valid git modes, read from the file beside this script rather than written here. next-action.py reads
# the same file; sdlc-loop.js cannot read a file at all, so it keeps its own literal and
# test/git-modes.test.mjs fails if the two disagree. config.json is written by an agent, so nothing else
# constrains gitMode to these four: an unrecognised one falls through every arm of ensure_slice_branch and
# behaves like direct — a slice committed to the default branch with no pull request and no push — which
# fails the stack guarantee silently, so name the mode and stop. A missing or malformed file stops the run
# here for the same reason: there is deliberately no fallback list, because that is the drift this removes.
GIT_MODES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-modes.json")


def load_git_modes(path=GIT_MODES_PATH):
    try:
        with open(path) as f:
            modes = json.load(f)["gitModes"]
    except FileNotFoundError:
        raise Fail(f"{path} is missing, so no gitMode can be trusted: restore it from git")
    except ValueError as e:
        raise Fail(f"{path} is not valid JSON: {e}")
    except (KeyError, TypeError):
        raise Fail(f'{path} has no "gitModes" list')
    if not isinstance(modes, list) or not modes or not all(isinstance(m, str) and m for m in modes):
        raise Fail(f'{path} must hold {{"gitModes": ["<mode>", ...]}} naming at least one mode')
    return tuple(modes)


# every other failure in this script prints {"ok": false, "error": ...} and exits 2, so a caller parsing stdout
# never has to special-case this one. GIT_MODES is needed at import time, so this cannot raise Fail normally.
GIT_MODES = ()
GIT_MODES_ERROR = ""
try:
    GIT_MODES = load_git_modes()
except Fail as e:
    GIT_MODES_ERROR = str(e)

# a milestone branch is exactly sdlc/M-<digits>. sdlc/<milestoneId>-e2e is the behaviour suite, which stack
# mode merges locally and never opens a pull request for, so it is not a milestone branch here
MILESTONE_BRANCH = re.compile(r"^sdlc/M-\d+$")


def require_known_mode(config):
    mode = config.get("gitMode")
    if mode and mode not in GIT_MODES:
        raise Fail(f"config.json has gitMode {mode!r}, which is not one of {', '.join(GIT_MODES)}: fix config.json rather than let the run deliver the wrong way")


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


def advance_run_branch(repo, config, run):
    """Bring the run branch onto origin/<defaultBranch>, and push it when that moved it.

    This is the only owner of that transition. milestone-writer.md used to describe the same step in
    prose, but nothing ran it: the milestone-writer only runs while a milestone is due, and a merged
    milestone is verified everywhere and due never again. Two owners, one of them unreachable, is how
    the run branch stayed on the code from before the last milestone shipped.
    """
    git(repo, "checkout", "-q", run)
    before = git(repo, "rev-parse", run).stdout.strip()
    upstream = f"origin/{config.get('defaultBranch') or 'main'}"
    # a default branch that moved under the run cannot fast-forward; merge it in rather than rebase or force
    if git(repo, "merge", "-q", "--ff-only", upstream, check=False).returncode != 0:
        if git(repo, "merge", "-q", "--no-edit", upstream, check=False).returncode != 0:
            # both merges failed. A missing ref is tolerable — a --single-branch clone may have no
            # origin/<defaultBranch>, and the run branch is a sound base on its own — but a conflict is not:
            # it leaves the index unmerged, and the run branch must never be left mid-merge.
            if git(repo, "rev-parse", "-q", "--verify", "MERGE_HEAD", check=False).returncode == 0:
                git(repo, "merge", "--abort", check=False)
                raise Fail(f"{upstream} conflicts with {run}: resolve it there, then cut the branch again")
    # a plain push, never --force: the run branch is published, so a rejection is reported by the remote
    if git(repo, "rev-parse", run).stdout.strip() != before:
        git(repo, "push", "-q", "origin", run, check=False)
    return run


def branch_run(repo, branch):
    """The run branch named by the .sdlc/config.json committed ON <branch>, or "" when it names none.

    This is what makes a milestone branch name run-scoped. Milestone ids restart at M-1 on every run while
    sdlc/run-<n> keeps counting, so run 2's first milestone branch carries exactly the name run 1's first
    milestone branch carried. Without this, a branch an earlier run left behind answers the exists check for
    this run's milestone: run 1's code becomes the base of run 2's first slice, and run 2's sdlc/M-1 pull
    request carries it to the default branch. The run that wrote a branch onto it is recorded in it.
    """
    r = git(repo, "show", f"{branch}:.sdlc/config.json", check=False)
    try:
        return (json.loads(r.stdout) or {}).get("runBranch") or ""
    except ValueError:  # absent or unreadable: the branch claims no run, so it is claimed as nobody's
        return ""


def shipped_into(repo, branch, default):
    """True when every path <branch> changed since it forked is byte-identical on <default>.

    `git branch -d` cannot answer this for the merge stack mode actually uses. GitHub squash-merges by
    default, so the branch's commits are never ancestors of the default branch and `-d` refuses a branch whose
    every byte is already shipped. What the caller needs to know is whether the branch still holds work no
    human has accepted, so compare content against origin/<defaultBranch> — named explicitly, never left to
    git's fallback to HEAD, which after a squash merge does not contain the branch either.
    """
    forked = git(repo, "merge-base", default, branch, check=False)
    if forked.returncode != 0:
        return False
    changed = git(repo, "diff", "--name-only", forked.stdout.strip(), branch, check=False)
    if changed.returncode != 0:
        return False
    for path in (p for p in changed.stdout.split("\n") if p.strip()):
        # `git ls-tree` and not `git rev-parse <rev>:<path>`: that answers the blob sha alone, so a chmod +x
        # leaves the two sides looking identical — the blobs match — while the tree entries differ
        # (100755 against 100644), and the branch is deleted with the mode change unmerged. The tree entry
        # carries the mode and the type with the content, which is what "the same file" has to mean here.
        here = git(repo, "ls-tree", branch, "--", path, check=False)
        there = git(repo, "ls-tree", default, "--", path, check=False)
        if here.returncode != 0 or there.returncode != 0:
            return False
        # a path one side has and the other does not is unshipped work; both missing is a deletion both made
        if here.stdout.strip() != there.stdout.strip():
            return False
    return True


def worktree_branches(repo):
    """The branches any worktree of this repo has checked out, current one included.

    `git branch -d` refuses a branch another worktree is sitting on, and says so; the compare-and-swap in
    prune_stale_milestone_branches does not, and deletes it anyway — leaving that worktree on a dangling
    HEAD. So the set is read from git here rather than left to a guard the fallback has already stepped over.
    """
    listing = git(repo, "worktree", "list", "--porcelain", check=False)
    names = set()
    for line in listing.stdout.splitlines():
        if line.startswith("branch "):
            names.add(line[len("branch refs/heads/"):].strip())
    # --show-current knows this worktree only; it is kept as a floor for the case where `worktree list`
    # answered nothing at all, so a branch checked out here is never a candidate either way.
    names.add(git(repo, "branch", "--show-current", check=False).stdout.strip())
    return names


def milestone_branches_with_open_slice_pr(repo):
    """The sdlc/M-<n> branches a slice pull request is still open against, from the run's own ledger.

    GitHub closes a pull request whose base branch is deleted, so a milestone branch with an open slice pull
    request into it takes that pull request down with it, and the run's awaiting-merge bookkeeping is left
    pointing at a closed one. A slice sits at awaiting-merge for exactly as long as its pull request is open,
    and in stack mode that pull request's base is the slice's milestone branch — which is what makes this a
    local answer at all.

    Stated rather than papered over: a pull request the ledger does not know about — one a human opened, or
    one whose slice has already moved on — is invisible here. `gh pr list --base` would see those, and that
    is a network call and a forge dependency this script does not otherwise have, so it is not taken.
    """
    state = os.path.join(repo, ".sdlc")
    milestones = read_json(os.path.join(state, "milestones.json"), [])
    out = set()
    for x in slices_of(read_json(os.path.join(state, "slices.json"), [])):
        if x.get("status") != "awaiting-merge" or not x.get("id"):
            continue
        mid = milestone_of(milestones, x["id"])
        if mid:
            out.add(f"sdlc/{mid}")
    return out


def remote_sha_to_lease(repo, branch, upstream):
    """The sha to lease a remote delete of <branch> on, or "" when there is nothing to delete there.

    `git push --delete <branch>` removes whatever the remote points at, which is not what the local proof
    covered: the local branch can be behind the remote, so a human who pushed straight to the remote branch
    after this run proved its own tip shipped has a commit that no local check has seen. So the remote branch
    is proved on its own, against its own remote-tracking ref, and the delete carries that ref's sha, which
    turns the push into a compare-and-swap: a push landing between the fetch and the delete is rejected
    rather than deleted. A remote branch that is not there needs no lease — there is nothing on it to lose.
    """
    r = git(repo, "rev-parse", "-q", "--verify", f"refs/remotes/origin/{branch}", check=False)
    if r.returncode != 0:
        return ""
    sha = r.stdout.strip()
    if not sha or not shipped_into(repo, f"origin/{branch}", upstream):
        return ""
    return sha


def prune_stale_milestone_branches(repo, config, keep):
    """Delete the sdlc/M-<n> branches whose milestone has shipped, and return the ones deleted.

    The other half of advance_run_branch's move out of milestone-writer.md: the branch deletion lived in that
    file's "Merged" step, which never runs for a milestone that merged, so the branches accumulated. Five
    gates, and each one is a way this has to be wrong:

      - name: only sdlc/M-<digits>. sdlc/<milestoneId>-e2e is the behaviour suite, which stack mode merges
        locally and never opens a pull request for.
      - shipped: only a branch whose every change since it forked is already on origin/<defaultBranch>. That
        is what an in-flight milestone fails: an open milestone pull request is by definition not on the
        default branch yet, so its branch survives and the slices cut from it are not stranded.
      - the caller's own: `keep` is the branch this call is about to cut. When this run owns it, slices may
        already be cut from it, so it is never deleted here.
      - held: not checked out in any worktree, because the compare-and-swap below deletes a branch
        `git branch -d` would have refused, and a worktree left on a deleted branch is a dangling HEAD.
      - in use: no slice pull request is still open against it, because GitHub closes those on the spot when
        their base branch goes (see milestone_branches_with_open_slice_pr for what this can and cannot see).

    The remote delete is proved separately from the local one. `git push --delete <branch>` removes whatever
    the remote points at, and the local proof covers only this clone's view of the branch: a human who pushed
    straight to origin/<branch> after this run proved its local tip shipped has work on the remote that no
    local check has seen, and an ungated delete takes that commit with it. So the remote branch is proved on
    its own and the delete carries a lease, and a branch whose remote side cannot be proved is kept — the
    local delete still stands, since it was proved on its own evidence.

    Never `-D` and never a force-push: `-d` first, and only where git's ancestry check cannot see through a
    squash merge does the compare-and-swap below stand in for it — `update-ref -d <ref> <sha>` deletes only if
    the ref is still at the sha just proved shipped, which `-D`, which checks nothing, does not do.
    """
    run = config.get("runBranch") or ""
    upstream = f"origin/{config.get('defaultBranch') or 'main'}"
    # GitHub's "delete branch on merge" removes the remote branch, so fetch rather than read a stale
    # origin/<defaultBranch>; a fetch that cannot reach the remote leaves the previous one, which still compares.
    # --prune because the lease below reads origin/<branch>: without it a branch the remote already dropped
    # still looks present, and the leased delete then fails on "remote ref does not exist" — harmless, but it
    # answers a question about a branch that is not there.
    git(repo, "fetch", "-q", "--prune", "origin", check=False)
    if git(repo, "rev-parse", "-q", "--verify", upstream, check=False).returncode != 0:
        return []  # a --single-branch clone has no origin/<defaultBranch>: prove nothing, delete nothing
    held = worktree_branches(repo)
    in_use = milestone_branches_with_open_slice_pr(repo)
    listing = git(repo, "for-each-ref", "--format=%(refname:short)", "refs/heads/sdlc", check=False)
    gone = []
    for branch in listing.stdout.split("\n"):
        branch = branch.strip()
        if not MILESTONE_BRANCH.match(branch) or branch in held or branch in in_use:
            continue
        if branch == keep and branch_run(repo, branch) == run:
            continue  # the branch this call is cutting, and this run's own: slices are already cut from it
        sha = git(repo, "rev-parse", branch, check=False).stdout.strip()
        if not sha or not shipped_into(repo, branch, upstream):
            continue
        # the lease is taken before the local delete, while the remote-tracking ref still holds what the fetch
        # proved. Deleting the local branch does not touch it, so the sha is the same either side of this line.
        lease = remote_sha_to_lease(repo, branch, upstream)
        if git(repo, "branch", "-d", branch, check=False).returncode != 0:
            # git's own refusal is the guard; the compare-and-swap is what stands in for it where a squash
            # merge defeats its ancestry check, and it is also a guard: it deletes only if the ref is still at
            # the sha just proved shipped. A branch that moved in between is left alone rather than deleted, and
            # losing that race is not a reason to fail the run — the next prune re-examines it, and by then the
            # work that moved onto it is unshipped, so the shipped check will keep it on its own evidence.
            if git(repo, "update-ref", "-d", f"refs/heads/{branch}", sha, check=False).returncode != 0:
                continue
        if lease:
            git(repo, "push", "-q", "origin", f"--force-with-lease=refs/heads/{branch}:{lease}", f":{branch}", check=False)
        gone.append(branch)
    return gone


def ensure_milestone_branch(repo, config, milestones, milestone_id):
    """sdlc/M-<id>, created from the run branch and pushed when it does not exist yet.

    A milestone that is already verified has had its branch deleted after its pull request
    merged, so a slice belonging to it builds on the run branch — that milestone shipped, and
    the run branch has been advanced onto what it shipped.
    """
    if not milestone_id:
        return None
    want = f"sdlc/{milestone_id}"
    # the verified rule first: a milestone branch left behind by an earlier attempt must not win over
    # the fact that the milestone shipped, or a fix for it would build on a branch the loop will never ship
    #
    # `exhausted` is deliberately NOT covered here. A milestone that ran out of attempts has no pull request
    # to merge (milestone-writer ships only `verified`), so a fix slice cut for it gets a milestone branch
    # the loop will not deliver. Left as-is on purpose: the alternative — basing it on the run branch — puts
    # the fix outside the milestone it answers, and the audit that follows ships that fix on its own PR.
    if milestone_shipped(milestones, milestone_id):
        return None
    run = config.get("runBranch") or ""
    prune_stale_milestone_branches(repo, config, want)
    if branch_exists(repo, want):
        # a branch under this milestone's name that names an EARLIER run is a leftover this run cannot build
        # on. Reaching here means it held unshipped work, so it was kept rather than deleted; building on it
        # would put the earlier run's code in this run's milestone pull request, so stop instead.
        other = branch_run(repo, want)
        if other and other != run:
            raise Fail(f"{want} belongs to run {other}, not to {run or '(unset)'}, and its work is not on "
                       f"origin/{config.get('defaultBranch') or 'main'}: merge or drop it by hand, then cut again")
        return want
    if not run or not branch_exists(repo, run):
        raise Fail(f"stack mode needs the run branch {run or '(unset)'}, which does not exist")
    advance_run_branch(repo, config, run)
    git(repo, "checkout", "-q", "-b", want)
    git(repo, "push", "-q", "-u", "origin", want, check=False)
    return want


def milestone_shipped(milestones, milestone_id):
    """True when a milestone's pull request merged, so its branch is gone.

    The one owner of the verified rule, which decides whether a slice belonging to this milestone builds on
    the milestone branch or on the run branch. No status value routes every caller correctly — the
    milestone-writer sets `verified` before it commits its own state — so the callers share this function
    rather than each reading the status for itself.
    """
    return next((m for m in milestones or [] if m.get("id") == milestone_id), {}).get("status") == "verified"


def awaiting_merge_base(repo, slices, slice_id):
    """sdlc/<dep> when a dependency is awaiting merge and still has its branch, else None.

    The dependency's pull request is open, so its work is on no other branch: a slice cut from anywhere
    else would not contain it. Shared by the cut and the base-branch answer so the two cannot disagree
    about which slice that is.
    """
    me = next((x for x in slices if x.get("id") == slice_id), {})
    for dep in me.get("dependsOn") or []:
        d = next((x for x in slices if x.get("id") == dep), None)
        if d and d.get("status") == "awaiting-merge" and branch_exists(repo, f"sdlc/{dep}"):
            return f"sdlc/{dep}"
    return None


def slice_base(repo, config, slices, milestones, slice_id):
    """The branch sdlc/<id> is cut from, decided without touching the repository.

    Read-only, and the answer every caller should ask for rather than re-derive. Six prompt files used to
    spell this rule out in prose, and two of them got it wrong in ways nothing caught: commit-state.md
    picked the branch from a milestone's `status`, which is `verified` by the time the milestone-writer
    commits, so that commit went to the wrong branch. A prompt cannot be made to fail a test when the rule
    is prose, and an agent reading prose has to re-derive the rule correctly every time.

    Deliberately side-effect free, unlike ensure_slice_branch: it creates no branch, checks nothing out
    and advances nothing. It names the milestone branch even where that branch does not exist yet —
    ensure_milestone_branch creates it when the slice is cut — and it never falls back to the default
    branch in stack mode, so an unanswerable case is an error rather than a plausible name.
    """
    if not any(x.get("id") == slice_id for x in slices):
        raise Fail(f"no slice {slice_id} in slices.json")
    base = awaiting_merge_base(repo, slices, slice_id)
    if base:
        return base
    if config.get("gitMode") != "stack":
        return config.get("defaultBranch") or "main"
    mid = milestone_of(milestones, slice_id)
    if mid and not milestone_shipped(milestones, mid):
        return f"sdlc/{mid}"
    # the slice belongs to no milestone, or to one that shipped: the run branch is its base, and it has to
    # exist, because a slice must never land on the default branch in stack mode
    run = config.get("runBranch") or ""
    if not run:
        raise Fail("stack mode needs config.runBranch: a slice builds on its milestone branch, never on the default branch")
    if not branch_exists(repo, run):
        raise Fail(f"stack mode needs the run branch {run}, which does not exist")
    return run


def ensure_slice_branch(repo, config, slices, milestones, slice_id):
    """Be on sdlc/<id>, creating it as commit-state.md says when it does not exist yet."""
    want = f"sdlc/{slice_id}"
    if git(repo, "branch", "--show-current").stdout.strip() == want:
        return want
    if branch_exists(repo, want):
        git(repo, "checkout", "-q", want)
        return want
    # the same branch slice_base names, so the branch a prompt is told to use is the branch cut here;
    # when a remote holds the default branch the cut reads its tip at origin/<defaultBranch>, the fetched
    # spelling of the same branch slice_base prints
    base = awaiting_merge_base(repo, slices, slice_id)
    if not base:
        base = config.get("defaultBranch") or "main"
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
                # an audit fix slice belongs to no milestone, so the run branch is its base and has to
                # carry every shipped milestone: nothing else moves it, and the audit runs after they merged
                advance_run_branch(repo, config, run)
                base = run
        elif config.get("gitMode") in ("pr", "direct"):
            # Ruling A: when a remote holds the default branch, its local ref belongs to the owner's
            # checkout and the run never advances it — after the first push it is stale, and a cut from it
            # lands the slice on pre-run code and wipes the committed .sdlc/ state from the tree. Fetch the
            # tip (the plain form: the refspec form is refused while the owner's checkout holds the branch)
            # and cut from origin/<defaultBranch>. With no remote the local ref is the truth and the cut is
            # the local one. `mr` keeps the local ref too: its defaultBranch is the run's own working branch.
            git(repo, "fetch", "-q", "origin", base, check=False)
            if git(repo, "rev-parse", "-q", "--verify", f"refs/remotes/origin/{base}", check=False).returncode == 0:
                base = f"origin/{base}"
    # --no-track: a slice branch cut from origin/<defaultBranch> would track it, and a bare push on the
    # slice branch would then fast-forward the default branch with unreviewed work
    git(repo, "checkout", "-q", "-b", want, "--no-track", base)
    return want


def patch_slice(repo, slice_id, patch):
    if not isinstance(patch, dict):
        raise Fail("the patch must be a JSON object")
    s = os.path.join(repo, ".sdlc")
    config = read_json(os.path.join(s, "config.json"))
    require_known_mode(config)
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
    p = sub.add_parser("base-branch", help="print the branch a slice is cut from, and change nothing")
    p.add_argument("--repo", default=".")
    p.add_argument("--slice", required=True)
    p = sub.add_parser("add-requirements")
    p.add_argument("--repo", default=".")
    p.add_argument("--lens", default="")
    p.add_argument("--distinct", action="store_true", help="add an entry whose quote is already in the ledger when its acceptance differs")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    try:
        if not os.path.isdir(os.path.join(repo, ".sdlc")):
            raise Fail(f"no .sdlc/ in {repo}")
        if GIT_MODES_ERROR:
            raise Fail(GIT_MODES_ERROR)
        if a.cmd == "status":
            write_status(repo)
            out = {"ok": True}
        elif a.cmd == "base-branch":
            # read-only: no branch created, none checked out, nothing committed, so a prompt can ask
            # mid-task without disturbing the working tree it is in the middle of
            state = os.path.join(repo, ".sdlc")
            cfg = read_json(os.path.join(state, "config.json"))
            require_known_mode(cfg)
            branch = slice_base(repo, cfg, slices_of(read_json(os.path.join(state, "slices.json"), [])),
                                read_json(os.path.join(state, "milestones.json"), []), a.slice)
            out = {"ok": True, "slice": a.slice, "branch": branch}
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
