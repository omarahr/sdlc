# Committing `.sdlc/` state

Read `gitMode`, `defaultBranch`, `commitFormat` and, in `stack` mode, `runBranch` from `.sdlc/config.json`.

**Stack mode branches.** `sdlc/run-<n>` is the run branch: the tool creates it at bootstrap and pushes it, and it never carries product code. `sdlc/M-<n>` is a milestone branch, cut from `runBranch` when that milestone's first slice starts; slices are cut from it and their pull requests target it. The milestone's own pull request targets `defaultBranch`, and once it merges `state-write.py` advances `runBranch` onto `defaultBranch` — fast-forward where it can, merge otherwise, never force-push — the next time a branch is cut from it, so the next milestone branches from shipped code. `sdlc/<milestoneId>-e2e` is cut from the milestone branch. Audit fix slices (`S-fix-<n>`, which belong to no milestone) are cut from `runBranch` and their pull requests target `defaultBranch`.

**Slice commit** (your inputs name a slice and your role file says "slice commit"):
1. Be on branch `sdlc/<sliceId>`. If it does not exist, create it: in `stack` mode from the slice's milestone branch (or `runBranch` for an audit fix), otherwise from the up-to-date default branch — or, when the slice's `dependsOn` includes a slice in `awaiting-merge`, from that slice's branch instead.
2. `git add .sdlc .gitignore && git commit -m "chore(sdlc): <what> [<sliceId>]"`. Do not push; the integrator ships it with the slice.

**Default-branch commit** (your role file says "default-branch commit"):
- `stack` mode: commit on the milestone branch the slice or milestone in this commit belongs to (`sdlc/M-<n>`), and on `runBranch` when it belongs to no milestone. Your role file names which: a slice's or a milestone's own state goes on that milestone's branch, and work that belongs to no milestone (bootstrap, the audit, an audit fix slice) goes on `runBranch`. Never choose the branch from a milestone's `status`: a milestone's status is `verified` by the time its writer commits, so a status-based rule sends that commit to the wrong branch. Then `git add .sdlc .gitignore` and commit `chore(sdlc): <what>`. Do not push: the milestone pull request carries this state. A commit that lands on `runBranch` is pushed by `state-write.py` at the moment it advances that branch onto `defaultBranch`, which is the next time a branch is cut from it — so `origin/sdlc/run-<n>` is behind until then, and that is expected rather than a missed push. There are no `sdlc/state-*` pull requests in stack mode.
- `direct` or `mr` mode: `git checkout <defaultBranch>`, `git add .sdlc .gitignore`, `git commit -m "chore(sdlc): <what>"`. Do not push: in `mr` mode the integrator and the driver push the working branch.
- `pr` mode:
  1. `git checkout <defaultBranch> && git pull --ff-only`
  2. `git checkout -b sdlc/state-$(date -u +%Y%m%d%H%M%S)`
  3. `git add .sdlc .gitignore && git commit -m "chore(sdlc): <what>"`, then push.
  4. `gh pr create --title "chore(sdlc): <what>" --body "<one-paragraph summary>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`.
  5. `gh pr checks --watch`. If there are no checks, append a `note` line "no CI checks on state PR" to log.jsonl before merging. If a check fails, read the log with `gh run view --log-failed`, fix on the same branch, push, and watch again.
  6. `gh pr merge --squash --delete-branch`, then `git checkout <defaultBranch> && git pull --ff-only`.
  7. If the merge is blocked by required reviews or protection, leave the PR open, append a `state-pr-blocked` line with the PR url to log.jsonl on the default branch's working tree (uncommitted), and return to the default branch.

`.sdlc/STOP` is gitignored and never committed.
