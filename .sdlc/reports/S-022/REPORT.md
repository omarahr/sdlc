# S-022 · state-write.py names and classifies branches through the module
Verdict: RELEASED
Commit under test: e6337cc (gate ran on fc812fe; later commits change state files only) · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 7 | 42 | 42 | 0 | 0 | 0 / 0 | 9 |

## Summary
`state-write.py` now builds every slice and milestone branch name with `branches.name`. It recognizes a shipped milestone branch with `branches.parse`. The `sdlc/` literals and the `MILESTONE_BRANCH` regex are gone. A user who sets `branchFormat` to `feature/PROJ-1-{name}` gets `feature/PROJ-1-S-001` and `feature/PROJ-1-M-1`, and the prune and the dependency lookup follow that format. The default format gives the same names as before. The cli, contract and security profiles ran in round 0 against scratch repos with a bare remote. Round 1 ran after a review fix that promoted the malformed-format tests into `scripts.test.mjs`. The verifiers found no blocking defect. The review found one test gap (no test for a malformed `branchFormat`), and fix round 1 closed it. Nine non-blocking seeds stay open. They concern format validation and the order of branch creation.

## Open risks
- `format_of` does not call `branches.validate_format`. A format such as `feat~/{name}` makes `base-branch` print an invalid name with exit 0. `patch-slice` moves HEAD first. Then it exits 2 (TC-security-15, A-6).
- `patch-slice` creates the slice branch before it checks the slice. An unknown id leaves a stray branch and a moved HEAD. Main does the same (A-9).
- A non-string `branchFormat` falls back to `sdlc/{name}` with no message. The values are number, list, object and true. State-write then makes `sdlc/` branches while the config names another scheme (A-7).
- `branch_run` is unchanged by design. R-057 is met in the prune loop (ADR-20261010-034202-decision-judge-S-022-f0a0). R-057 may lead a reader to expect a parse call in `branch_run`.
- `format_of` is a stopgap. S-023 moves the derivation into `main()` (ADR-20261010-034158-decision-judge-S-022-cb4c). Fold the three `Fail` wrappers then.
- The prune now lists all of `refs/heads/`. No spec number limits the cost, and no case measured it.
- The parse pattern uses `\d` on text. A milestone branch with an Arabic-Indic digit counts as shipped, and the prune deletes it. The old regex did the same.
- The branch-kind `Fail` path in the prune loop has no CLI test. `branch_name` always raises first for a bad format.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-056 | `ensure_milestone_branch` wants `name(fmt, "milestone", id=milestone_id)`; `ensure_slice_branch` wants `name(fmt, "slice", id=slice_id)`; the awaiting-merge dependency branch is `name(fmt, "slice", id=dep)`; `milestone_branches_with_open_slice_pr` adds `name(fmt, "milestone", id=mid)` | VS-1, VS-2, VS-3, VS-7 | TC-cli-1 (cli-0), TC-cli-2 (cli-0), TC-cli-3 (cli-0), TC-cli-4 (cli-0), TC-cli-5 (cli-0), TC-cli-6 (cli-0), TC-cli-7 (cli-0), TC-cli-8 (cli-0), TC-cli-1 (cli-1), TC-cli-2 (cli-1), TC-cli-3 (cli-1), TC-cli-4 (cli-1), TC-cli-5 (cli-1), TC-cli-6 (cli-1), TC-cli-7 (cli-1), TC-cli-8 (cli-1), TC-security-1 (security-0), TC-security-2 (security-0), TC-security-3 (security-0), TC-security-4 (security-0), TC-security-5 (security-0), TC-security-6 (security-0), TC-security-7 (security-0), TC-security-8 (security-0), TC-security-13 (security-0), TC-security-14 (security-0), TC-security-15 (security-0) | pass |
| R-057 | `MILESTONE_BRANCH` is replaced by `parse(...)["kind"] == "milestone"` wherever it is used. | VS-5, VS-7 | TC-cli-10 (cli-0), TC-cli-11 (cli-0), TC-cli-13 (cli-0), TC-cli-1 (cli-1), TC-cli-2 (cli-1), TC-cli-3 (cli-1), TC-cli-4 (cli-1), TC-cli-5 (cli-1), TC-cli-6 (cli-1), TC-cli-7 (cli-1), TC-cli-8 (cli-1), TC-contract-1 (contract-0), TC-contract-2 (contract-0), TC-contract-6 (contract-0), TC-security-7 (security-0), TC-security-9 (security-0), TC-security-10 (security-0), TC-security-11 (security-0) | pass |
| R-058 | `config.runBranch` keeps holding a full branch name, so `advance_run_branch` and `shipped_into` are unchanged. | VS-1, VS-6 | TC-cli-12 (cli-0), TC-security-12 (security-0) | pass |
| R-078 | `state-write creates the slice and milestone branches under a custom format and finds the dependency branch`. | VS-1, VS-2 | TC-cli-1 (cli-0), TC-cli-5 (cli-0), TC-security-1 (security-0) | pass |
| R-096 | `ensure_milestone_branch` wants `name(fmt, "milestone", id=milestone_id)`; `ensure_slice_branch` wants `name(fmt, "slice", id=slice_id)`; the awaiting-merge dependency branch is `name(fmt, "slice", id=dep)`; `milestone_branches_with_open_slice_pr` adds `name(fmt, "milestone", id=mid)` | VS-4 | TC-cli-9 (cli-0), TC-contract-3 (contract-0), TC-contract-4 (contract-0), TC-contract-5 (contract-0) | pass |

Case ids repeat across parts, so each case carries its part: `cli-0` and `cli-1` are two cli sessions.

## Scenarios
### VS-1 · Slice and milestone branches are created under a custom format
Profiles: cli, security. Risk: A wrong name puts the slice pull request on the wrong base.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:1845`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 (cli-0) | patch-slice creates feature/PROJ-1-S-001 from feature/PROJ-1-M-1 | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:38` |
| TC-cli-2 (cli-0) | lowercase format and default format | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:53` |
| TC-cli-3 (cli-0) | hostile ids (150 argv runs of traversal, flag-like, unicode digits, control, injection, whitespace, oversized) on patch-slice and base-branch | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:68` |
| TC-cli-4 (cli-0) | hostile ids present in slices.json | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:89` |
| TC-security-1 (security-0) | Custom format creates feature/PROJ-1-S-001 from feature/PROJ-1-M-1 and no sdlc/ branch | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:37` |
| TC-security-2 (security-0) | Lowercase format gives feature/s-001 and feature/m-1; default format and repo-file format keep sdlc/ names | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:47` |
| TC-security-3 (security-0) | 128 hostile slice ids on patch-slice (attack-corpus, all families) | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:57` |
| TC-security-4 (security-0) | Hostile slice ids on base-branch | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:71` |
| TC-security-12 (security-0) | Run branch outside the format is not rewritten | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:174` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-1 (cli-0) · patch-slice creates feature/PROJ-1-S-001 from feature/PROJ-1-M-1 · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** slice and milestone branches use the format; no sdlc/S-001, sdlc/M-1; milestone pushed to origin
- **Expected** slice and milestone branches use the format; no sdlc/S-001, sdlc/M-1; milestone pushed to origin **Actual** exit 0, branch feature/PROJ-1-S-001; local and remote M-1 exist; no sdlc/ branches
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, patch-slice transcript ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-2 (cli-0) · lowercase format and default format · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** feature/s-001 and feature/m-1; sdlc/S-001 and sdlc/M-1 by default
- **Expected** feature/s-001 and feature/m-1; sdlc/S-001 and sdlc/M-1 by default **Actual** as expected
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, lower and default transcripts ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-3 (cli-0) · hostile ids (150 argv runs of traversal, flag-like, unicode digits, control, injection, whitespace, oversized) on patch-slice and base-branch · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** clean refusal (JSON ok false or argparse usage), nonzero exit, no traceback, base-branch leaves tree unchanged
- **Expected** clean refusal (JSON ok false or argparse usage), nonzero exit, no traceback, base-branch leaves tree unchanged **Actual** all 150 runs refused or answered without traceback; base-branch never changed the tree; patch-slice of an unknown id leaves a branch (see seed 1, pre-existing order)
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, hostile corpus ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-4 (cli-0) · hostile ids present in slices.json · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** no traceback, tree consistent on refusal
- **Expected** no traceback, tree consistent on refusal **Actual** git refusals come back as JSON exit 2; no traceback; no stray branch after refusal
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, hostile ids in ledger ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-security-1 (security-0) · Custom format creates feature/PROJ-1-S-001 from feature/PROJ-1-M-1 and no sdlc/ branch · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Both feature branches exist, no sdlc/ branch, slice cut from milestone
- **Expected** Both feature branches exist, no sdlc/ branch, slice cut from milestone **Actual** As expected
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-2 (security-0) · Lowercase format gives feature/s-001 and feature/m-1; default format and repo-file format keep sdlc/ names · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Names follow the format
- **Expected** Names follow the format **Actual** As expected
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-3 (security-0) · 128 hostile slice ids on patch-slice (attack-corpus, all families) · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Exit 2, JSON error, no traceback
- **Expected** Exit 2, JSON error, no traceback **Actual** 128 ids: no traceback, all exit 2. Ids that form a valid ref leave a branch behind (seed S1, same on main)
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, hostile ids ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))
- db-diff, refs added per id (HOSTILE_PATCH line) ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-4 (security-0) · Hostile slice ids on base-branch · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Exit 2 and tree unchanged for every id
- **Expected** Exit 2 and tree unchanged for every id **Actual** Held
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-12 (security-0) · Run branch outside the format is not rewritten · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** config.json unchanged byte for byte
- **Expected** config.json unchanged byte for byte **Actual** Held
- **Spec source:** R-058 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

</details>

### VS-2 · The awaiting-merge dependency branch is found through the format
Profiles: cli. Risk: A wrong dependency branch stacks a slice on the wrong parent.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:1864`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 (cli-0) | awaiting-merge dependency branch found through the format | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:103` |
| TC-cli-6 (cli-0) | dependency not awaiting-merge, or branch gone | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:103` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-5 (cli-0) · awaiting-merge dependency branch found through the format · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** patch-slice and base-branch answer feature/PROJ-1-S-001; decoy sdlc/S-001 unused; S-002 contains the dependency work
- **Expected** patch-slice and base-branch answer feature/PROJ-1-S-001; decoy sdlc/S-001 unused; S-002 contains the dependency work **Actual** as expected
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, dependency transcripts ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-6 (cli-0) · dependency not awaiting-merge, or branch gone · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** fall back to the milestone branch
- **Expected** fall back to the milestone branch **Actual** feature/PROJ-1-M-1 in both cases; S-002 cut without creating a dependency branch
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, fallback transcripts ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

</details>

### VS-3 · base-branch names the milestone branch from the format
Profiles: cli, security. Risk: A wrong answer from `base-branch` sends a pull request to the wrong base.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:1886`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7 (cli-0) | base-branch names the milestone branch | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:128` |
| TC-cli-8 (cli-0) | invalid branchFormat (no placeholder, two placeholders) in config | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:128` |
| TC-security-5 (security-0) | Dependency awaiting-merge resolves to feature/PROJ-1-S-001; decoy sdlc/S-001 is not used; a gone dependency branch falls back to the milestone branch | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:81` |
| TC-security-6 (security-0) | base-branch: milestone branch, shipped milestone gives run branch, unknown slice refused | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:90` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-7 (cli-0) · base-branch names the milestone branch · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** feature/PROJ-1-M-1, feature/m-1, run branch for a shipped milestone and for no milestone; unknown id refused
- **Expected** feature/PROJ-1-M-1, feature/m-1, run branch for a shipped milestone and for no milestone; unknown id refused **Actual** as expected; unknown slice gives JSON ok false, exit 2, no traceback; base-branch changes nothing
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, base-branch transcripts ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-8 (cli-0) · invalid branchFormat (no placeholder, two placeholders) in config · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** clear refusal, nonzero exit, no traceback
- **Expected** clear refusal, nonzero exit, no traceback **Actual** JSON ok false with the format named, exit 2, for base-branch and patch-slice
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, bad format transcripts ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-security-5 (security-0) · Dependency awaiting-merge resolves to feature/PROJ-1-S-001; decoy sdlc/S-001 is not used; a gone dependency branch falls back to the milestone branch · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Format branch wins, decoy ignored
- **Expected** Format branch wins, decoy ignored **Actual** Held
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-6 (security-0) · base-branch: milestone branch, shipped milestone gives run branch, unknown slice refused · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** feature/PROJ-1-M-1; run branch; exit 2 JSON, tree unchanged
- **Expected** feature/PROJ-1-M-1; run branch; exit 2 JSON, tree unchanged **Actual** Held
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

</details>

### VS-4 · The prune keeps a milestone branch with an open slice pull request and deletes the others
Profiles: cli, contract. Risk: A wrong milestone name deletes a branch that a slice pull request still needs.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:1913`, `skills/sdlc/test/scripts.test.mjs:1930`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 (cli-0) | prune deletes shipped feature/PROJ-1-M-2 and keeps feature/PROJ-1-M-1 held by an awaiting-merge slice | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:163` |
| TC-contract-3 (contract-0) | milestone_branches_with_open_slice_pr equals the reference set for random ledgers and formats | PASS | `verification/r0/tests/contract-0/prune.verify-contract.test.mjs:103` |
| TC-contract-4 (contract-0) | Documented example: only feature/PROJ-1-M-1 is returned | PASS | `verification/r0/tests/contract-0/prune.verify-contract.test.mjs:145` |
| TC-contract-5 (contract-0) | Bad formats give the module Fail or a return, never another exception | PASS | `verification/r0/tests/contract-0/prune.verify-contract.test.mjs:158` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-9 (cli-0) · prune deletes shipped feature/PROJ-1-M-2 and keeps feature/PROJ-1-M-1 held by an awaiting-merge slice · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** M-2 deleted, M-1 kept, M-3 created
- **Expected** M-2 deleted, M-1 kept, M-3 created **Actual** as expected
- **Spec source:** R-096 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, prune transcript and branch lists ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-contract-3 (contract-0) · milestone_branches_with_open_slice_pr equals the reference set for random ledgers and formats · PASS
- **Given** 1500 generated ledgers: 0-4 milestones, 0-6 slices in all statuses, fixSlices, slices with no milestone, unknown slices, lowercase formats **When** call the function with the format **Then** returned set equals the awaiting-merge slices' milestone names built from the format
- **Expected** returned set equals the awaiting-merge slices' milestone names built from the format **Actual** returned set equals the awaiting-merge slices' milestone names built from the format (no violation)
- **Spec source:** R-096 acceptance · **Run:** `VERIFY_WT=$PWD node --test .sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs`
- Property run: open-slice-pr seed=2431164117 runs=1500 nonEmpty=578 violations=0 ([log](../../slices/S-022/verification/r0/logs/contract-0-run.txt))

#### TC-contract-4 (contract-0) · Documented example: only feature/PROJ-1-M-1 is returned · PASS
- **Given** S-001 awaiting-merge in M-1, S-002 done in M-2 **When** call with feature/PROJ-1-{name}, feature/{name:lower}, sdlc/{name} **Then** sets are {feature/PROJ-1-M-1}, {feature/m-1}, {sdlc/M-1}; empty with no pending slice or no milestone
- **Expected** sets are {feature/PROJ-1-M-1}, {feature/m-1}, {sdlc/M-1}; empty with no pending slice or no milestone **Actual** sets are {feature/PROJ-1-M-1}, {feature/m-1}, {sdlc/M-1}; empty with no pending slice or no milestone (no violation)
- **Spec source:** R-096 acceptance; plan T-4b · **Run:** `VERIFY_WT=$PWD node --test .sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs`
- Property run: 4 assertions pass (see log) ([log](../../slices/S-022/verification/r0/logs/contract-0-run.txt))

#### TC-contract-5 (contract-0) · Bad formats give the module Fail or a return, never another exception · PASS
- **Given** formats: empty, no placeholder, two placeholders, null, number, list, NUL, {id} **When** call milestone_branches_with_open_slice_pr and branch_kind **Then** outcome is return or Fail
- **Expected** outcome is return or Fail **Actual** outcome is return or Fail (no violation)
- **Spec source:** ADR for format problems (plan Risks) · **Run:** `VERIFY_WT=$PWD node --test .sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs`
- Property run: 9 formats x 2 functions pass ([log](../../slices/S-022/verification/r0/logs/contract-0-run.txt))

</details>

### VS-5 · The prune recognizes milestone branches by kind, not by a regex
Profiles: cli, contract, security. Risk: A wrong classification deletes a branch in use or keeps a dead one.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:1949`, `skills/sdlc/test/scripts.test.mjs:1978`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-10 (cli-0) | prune classifies by kind under custom format | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:163` |
| TC-cli-11 (cli-0) | default format prune; worktree-held branch; no MILESTONE_BRANCH or sdlc/{ in file | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:198` |
| TC-cli-13 (cli-0) | prune and patch-slice call no gh | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:241` |
| TC-contract-1 (contract-0) | branch_kind classifies milestone exactly as the M-<digits> reference model | PASS | `verification/r0/tests/contract-0/prune.verify-contract.test.mjs:75` |
| TC-contract-2 (contract-0) | Under the default format the new classifier agrees with the old sdlc/M-<digits> regex | PASS | `verification/r0/tests/contract-0/prune.verify-contract.test.mjs:93` |
| TC-contract-6 (contract-0) | Consumer surface: no MILESTONE_BRANCH, no sdlc/{ literal, new signatures | PASS | `verification/r0/tests/contract-0/prune.verify-contract.test.mjs:172` |
| TC-security-9 (security-0) | Prune deletes shipped milestone branches (M-1, M-007, M-0) and keeps e2e, e2e-area, slice, lookalike, unicode-digit, other-prefix and worktree-held branches; default and custom format | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:138` |
| TC-security-10 (security-0) | state-write.py holds no MILESTONE_BRANCH and no sdlc/{ literal; no quoted sdlc/ literal in code | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:158` |
| TC-security-11 (security-0) | Prune and patch-slice make no gh call | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:166` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-10 (cli-0) · prune classifies by kind under custom format · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** -e2e, S-, run-, other, extra-slash and look-alike branches stay
- **Expected** -e2e, S-, run-, other, extra-slash and look-alike branches stay **Actual** all stayed; M-1-x stayed
- **Spec source:** R-057 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, prune branch lists ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-11 (cli-0) · default format prune; worktree-held branch; no MILESTONE_BRANCH or sdlc/{ in file · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** sdlc/M-1 deleted, sdlc/M-1-e2e kept, sdlc/M-5 (held in a worktree) kept; file clean
- **Expected** sdlc/M-1 deleted, sdlc/M-1-e2e kept, sdlc/M-5 (held in a worktree) kept; file clean **Actual** as expected
- **Spec source:** R-057 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, prune branch lists ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-cli-13 (cli-0) · prune and patch-slice call no gh · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** gh shim sees 0 calls
- **Expected** gh shim sees 0 calls **Actual** 0 calls
- **Spec source:** R-057 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, gh stub count ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

#### TC-contract-1 (contract-0) · branch_kind classifies milestone exactly as the M-<digits> reference model · PASS
- **Given** 1500 generated (format, branch) pairs: prefixes, suffixes, {name} and {name:lower}, middles M-n, M-n-e2e, S-, run-, odd and unicode digits, mutated prefixes **When** call branch_kind(fmt, branch) and compare with a model written from the spec text **Then** kind is milestone exactly when the model says so
- **Expected** kind is milestone exactly when the model says so **Actual** kind is milestone exactly when the model says so (no violation)
- **Spec source:** R-057 acceptance (kind, not regex) · **Run:** `VERIFY_WT=$PWD node --test .sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs`
- Property run: property branch_kind seed=2431164117 runs=1500 milestones=162 violations=0 ([log](../../slices/S-022/verification/r0/logs/contract-0-run.txt))

#### TC-contract-2 (contract-0) · Under the default format the new classifier agrees with the old sdlc/M-<digits> regex · PASS
- **Given** 1507 branches under sdlc/{name} including main, feature/other, sdlc/M-1/x, sdlc/M-0, sdlc/M-007, sdlc/M-١ **When** compare branch_kind with the old regex semantics (Unicode digits, as Python \d) **Then** 0 disagreements
- **Expected** 0 disagreements **Actual** 0 disagreements (no violation)
- **Spec source:** R-057 acceptance · **Run:** `VERIFY_WT=$PWD node --test .sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs`
- Property run: regex-agreement cases=1507 disagreements=0 (seed 2431164117+1) ([log](../../slices/S-022/verification/r0/logs/contract-0-run.txt))

#### TC-contract-6 (contract-0) · Consumer surface: no MILESTONE_BRANCH, no sdlc/{ literal, new signatures · PASS
- **Given** state-write.py loaded by path **When** list signatures **Then** signatures take fmt; MILESTONE_BRANCH absent
- **Expected** signatures take fmt; MILESTONE_BRANCH absent **Actual** signatures take fmt; MILESTONE_BRANCH absent (no violation)
- **Spec source:** R-057 acceptance · **Run:** `VERIFY_WT=$PWD node --test .sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs`
- Property run: milestone_branches_with_open_slice_pr (repo, fmt); prune_stale_milestone_branches (repo, config, keep, fmt); slice_base (..., slice_id, fmt); awaiting_merge_base (repo, slices, slice_id, fmt); MILESTONE_BRANCH false ([log](../../slices/S-022/verification/r0/logs/contract-0-run.txt))

#### TC-security-9 (security-0) · Prune deletes shipped milestone branches (M-1, M-007, M-0) and keeps e2e, e2e-area, slice, lookalike, unicode-digit, other-prefix and worktree-held branches; default and custom format · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Only milestone-kind branches are deleted
- **Expected** Only milestone-kind branches are deleted **Actual** Held under both formats
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-10 (security-0) · state-write.py holds no MILESTONE_BRANCH and no sdlc/{ literal; no quoted sdlc/ literal in code · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** No match
- **Expected** No match **Actual** No match, zero quoted sdlc/ literals
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-11 (security-0) · Prune and patch-slice make no gh call · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** gh shim logs zero calls
- **Expected** gh shim logs zero calls **Actual** Zero calls (GH_CALLS [])
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

</details>

### VS-6 · The run branch stays a full name and is advanced as before
Profiles: cli. Risk: A rewritten run branch breaks the stack.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:1984`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-12 (cli-0) | run branch is advanced and config.runBranch unchanged (custom format, default format, run branch outside the format) | PASS | `verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:221` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-cli-12 (cli-0) · run branch is advanced and config.runBranch unchanged (custom format, default format, run branch outside the format) · PASS
- **Given** stack-mode scratch repo with bare remote **When** state-write.py run as built, from a scratch cwd **Then** milestone branch contains moved main; config.json bytes unchanged; run branch name not rewritten
- **Expected** milestone branch contains moved main; config.json bytes unchanged; run branch name not rewritten **Actual** as expected in all three
- **Spec source:** R-058 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-022> node --test .sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
- transcript, advance transcripts ([log](../../slices/S-022/verification/r0/logs/cli-0-transcripts.txt))
- file-tree, branch and ref diff: asserted on git refs (local and ls-remote) before and after; see test

</details>

### VS-7 · Format problems become clean refusals
Profiles: security, cli. Risk: A bad format must stop with a clean error and leave the tree unchanged.

Committed guard tests: `skills/sdlc/test/scripts.test.mjs:2026`, `skills/sdlc/test/scripts.test.mjs:2047`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 (cli-1) | Format with no placeholder is refused cleanly | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-2 (cli-1) | Format with two placeholders is refused cleanly | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-3 (cli-1) | Format with mixed placeholders is refused cleanly | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-4 (cli-1) | Format with unknown placeholder is refused cleanly | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-5 (cli-1) | Broken config file is refused cleanly | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-6 (cli-1) | Non-string and empty branchFormat fall back to the default format | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-7 (cli-1) | Git-unsafe format characters | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-cli-8 (cli-1) | Config file holding a JSON list | PASS | `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28` |
| TC-security-7 (security-0) | branchFormat with no placeholder, two placeholders, mixed placeholders | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:97` |
| TC-security-8 (security-0) | Empty branchFormat falls back to default; broken config.json refuses with JSON error | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:127` |
| TC-security-13 (security-0) | Unknown slice id on patch-slice | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:183` |
| TC-security-14 (security-0) | Flag-like ids (--detach, -f, --orphan, -D) with format {name} | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:192` |
| TC-security-15 (security-0) | Invalid git formats and non-string formats (7, array, object, true) | PASS | `verification/r0/tests/security-0/state-write.verify-security.test.mjs:202` |

<details>
<summary>Case detail (13 cases)</summary>

#### TC-cli-1 (cli-1) · Format with no placeholder is refused cleanly · PASS
- **Given** stack repo, branchFormat 'feature/PROJ-1' **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Expected** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths **Actual** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Spec source:** R-056 acceptance; R-057 acceptance; plan VS-7 notes · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- no placeholder patch-slice:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format 'feature/PROJ-1' must hold exactly one {name} or {name:lower}, found 0"}
  stderr: 
  tree unchanged: True
  ```
- no placeholder base-branch:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format 'feature/PROJ-1' must hold exactly one {name} or {name:lower}, found 0"}
  stderr: 
  tree unchanged: True
  ```

#### TC-cli-2 (cli-1) · Format with two placeholders is refused cleanly · PASS
- **Given** stack repo, branchFormat 'feature/{name}/{name}' **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Expected** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths **Actual** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Spec source:** R-056 acceptance; R-057 acceptance; plan VS-7 notes · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- two placeholders patch-slice:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format 'feature/{name}/{name}' must hold exactly one {name} or {name:lower}, found 2"}
  stderr: 
  tree unchanged: True
  ```
- two placeholders base-branch:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format 'feature/{name}/{name}' must hold exactly one {name} or {name:lower}, found 2"}
  stderr: 
  tree unchanged: True
  ```

#### TC-cli-3 (cli-1) · Format with mixed placeholders is refused cleanly · PASS
- **Given** stack repo, branchFormat '{name}-{name:lower}' **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Expected** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths **Actual** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Spec source:** R-056 acceptance; R-057 acceptance; plan VS-7 notes · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- mixed placeholders patch-slice:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format '{name}-{name:lower}' must hold exactly one {name} or {name:lower}, found 2"}
  stderr: 
  tree unchanged: True
  ```
- mixed placeholders base-branch:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format '{name}-{name:lower}' must hold exactly one {name} or {name:lower}, found 2"}
  stderr: 
  tree unchanged: True
  ```

#### TC-cli-4 (cli-1) · Format with unknown placeholder is refused cleanly · PASS
- **Given** stack repo, branchFormat 'feature/{id}' **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Expected** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths **Actual** Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- **Spec source:** R-056 acceptance; R-057 acceptance; plan VS-7 notes · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- unknown placeholder patch-slice:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format 'feature/{id}' must hold exactly one {name} or {name:lower}, found 0"}
  stderr: 
  tree unchanged: True
  ```
- unknown placeholder base-branch:
  ```console
  exit 2
  stdout: {"ok": false, "error": "the branch format 'feature/{id}' must hold exactly one {name} or {name:lower}, found 0"}
  stderr: 
  tree unchanged: True
  ```

#### TC-cli-5 (cli-1) · Broken config file is refused cleanly · PASS
- **Given** config.json holds invalid JSON **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Exit 2, JSON error, no traceback, tree unchanged
- **Expected** Exit 2, JSON error, no traceback, tree unchanged **Actual** Exit 2, JSON error, no traceback, tree unchanged
- **Spec source:** R-056 acceptance; R-057 acceptance; plan VS-7 notes · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- broken config file patch-slice:
  ```console
  exit 2
  stdout: {"ok": false, "error": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-mGm1AM/testkit-cli-sIIANq/repo-1/.sdlc/config.json is not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"}
  stderr: 
  tree unchanged: True
  ```
- broken config file base-branch:
  ```console
  exit 2
  stdout: {"ok": false, "error": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-mGm1AM/testkit-cli-9tCdpz/repo-1/.sdlc/config.json is not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"}
  stderr: 
  tree unchanged: True
  ```

#### TC-cli-6 (cli-1) · Non-string and empty branchFormat fall back to the default format · PASS
- **Given** branchFormat 5, ['a'] or '' **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Exit 0 and default names sdlc/S-001, sdlc/M-1, sdlc/S-000 (load_format semantics, spec section on load_format)
- **Expected** Exit 0 and default names sdlc/S-001, sdlc/M-1, sdlc/S-000 (load_format semantics, spec section on load_format) **Actual** Exit 0 and default names sdlc/S-001, sdlc/M-1, sdlc/S-000 (load_format semantics, spec section on load_format)
- **Spec source:** spec load_format: a non-empty string, else the default · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- non-string number patch-slice:
  ```console
  exit 0
  stdout: {"ok": true, "branch": "sdlc/S-001", "commit": "8c98c52"}
  stderr: 
  tree unchanged: False
  ```
- file-tree, non-string number patch-slice tree diff: {"added": [".sdlc/STATUS.md", "ref:refs/heads/sdlc/M-1", "ref:refs/heads/sdlc/S-001", "ref:refs/remotes/origin/HEAD", "ref:refs/remotes/origin/sdlc/M-1"], "removed": [], "changed": [".sdlc/slices.json", "ref:HEAD"], "empty": false}

#### TC-cli-7 (cli-1) · Git-unsafe format characters · PASS
- **Given** branchFormat with .. , .lock, space, ~, leading dash **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** patch-slice exits 2 with a JSON error and creates no branch; base-branch prints the name
- **Expected** patch-slice exits 2 with a JSON error and creates no branch; base-branch prints the name **Actual** patch-slice exits 2 with JSON error from git, no branch created; HEAD moved to the run branch and origin/HEAD was set. base-branch exits 0 and prints the git-invalid name.
- **Spec source:** plan VS-7 notes (no authoritative spec line for validating in state-write) · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- git-unsafe dotdot patch-slice:
  ```console
  exit 2
  stdout: {"ok": false, "error": "git checkout -q -b feature/..M-1: fatal: 'feature/..M-1' is not a valid branch name\nhint: See `man git check-ref-format`\nhint: Disable this message with \"git config set advice.refSyntax false\""}
  stderr: 
  tree unchanged: False
  ```
- file-tree, git-unsafe dotdot patch-slice tree diff: {"added": ["ref:refs/remotes/origin/HEAD"], "removed": [], "changed": ["ref:HEAD"], "empty": false}

#### TC-cli-8 (cli-1) · Config file holding a JSON list · PASS
- **Given** config.json is [] **When** state-write.py patch-slice and base-branch (milestone and dependency) run against the repo **Then** Clean refusal
- **Expected** Clean refusal **Actual** Exit 1 with AttributeError traceback from require_known_mode, before format_of runs. The line is not in the S-022 diff.
- **Spec source:** plan VS-7 notes (not required by R-056/R-057) · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`
- config is a list patch-slice:
  ```console
  exit 1
  stdout: 
  stderr: Traceback (most recent call last):
    File "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-022-v0-cli-1/skills/sdlc/state-write.py", line 727, in <module>
      main()
      ~~~~^^
    File "/var/fo
  tree unchanged: True
  ```
- config is a list base-branch:
  ```console
  exit 1
  stdout: 
  stderr: Traceback (most recent call last):
    File "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-022-v0-cli-1/skills/sdlc/state-write.py", line 727, in <module>
      main()
      ~~~~^^
    File "/var/fo
  tree unchanged: True
  ```

#### TC-security-7 (security-0) · branchFormat with no placeholder, two placeholders, mixed placeholders · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** Exit 2, JSON error, tree unchanged on base-branch and patch-slice
- **Expected** Exit 2, JSON error, tree unchanged on base-branch and patch-slice **Actual** Held: six refusals with the module message, tree unchanged
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-8 (security-0) · Empty branchFormat falls back to default; broken config.json refuses with JSON error · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** JSON error, exit 2, no traceback
- **Expected** JSON error, exit 2, no traceback **Actual** Held
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-13 (security-0) · Unknown slice id on patch-slice · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** No partial branch
- **Expected** No partial branch **Actual** Exit 2, but the branch feature/PROJ-1-S-404 stays and is checked out. The same happens on main with sdlc/S-404 (seed S1)
- **Spec source:** no spec source: pre-existing order in ensure_slice_branch · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-14 (security-0) · Flag-like ids (--detach, -f, --orphan, -D) with format {name} · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** git does not read the id as an option
- **Expected** git does not read the id as an option **Actual** git refuses each as an invalid branch name, exit 2, tree clean
- **Spec source:** R-056 acceptance · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

#### TC-security-15 (security-0) · Invalid git formats and non-string formats (7, array, object, true) · PASS
- **Given** a scratch stack-mode repo with a bare remote **When** the script runs with the attack input **Then** JSON error and exit 2 per the plan note
- **Expected** JSON error and exit 2 per the plan note **Actual** base-branch exits 0 with a name git refuses (feat~/M-1). patch-slice exits 2 but moves HEAD. Non-string values fall back to sdlc/{name} silently (seed S2, S3)
- **Spec source:** no requirement quote: validate_format runs at pre-flight (spec Edge cases) · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs`
- attack, test run ([log](../../slices/S-022/verification/r0/logs/security-0-run3.txt))

</details>
## How it was attacked
One security session ran in round 0 (part 0, 15 cases). The charter was to explore slice creation, `base-branch`, the dependency lookup, the prune and the `branchFormat` value with hostile input. The threat-model boundary is the CLI input of `state-write.py`: slice ids, `branchFormat` and branch names. Git runs with argument lists, never through a shell. The session tried 11 attacks: 8 held, 3 were out of scope because they match seeds that exist on main or in the spec. The cli session also ran 150 hostile id runs with no traceback. The core review (security lens, round 1) found no injection path.

<details>
<summary>Attack table (11 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-1 Explore slice creation with hostile ids to find a traceback or a git option reaching git | corpus all families, argv-safe, 128 values | exit 2 JSON, no traceback | held for tracebacks; branches left for valid-ref ids | held |
| A-2 Explore base-branch with hostile ids | corpus all families | exit 2, tree unchanged | held | held |
| A-3 Explore dependency lookup with decoy branch sdlc/S-001 | decoy plus real branch | format branch, never decoy | held | held |
| A-4 Explore the prune with look-alike branch names | M-1-e2e, M-1-e2e-area, M-٣, m-5, M-3/x, xM-3, feature/other, worktree-held | only M-<n> kind deleted | held under default and custom format | held |
| A-5 Explore the format with no/two/mixed placeholders | 3 values on two commands | exit 2 JSON | held | held |
| A-6 Explore the format with git-unsafe text | whitespace, ~, :, .., .lock, leading dash | exit 2 JSON, no side effect | base-branch exit 0 with invalid name; patch-slice exit 2 but HEAD moved and origin/HEAD added | out-of-scope |
| A-7 Explore the format with non-string values | 7, array, object, true | refusal | silent fallback to sdlc/{name} | out-of-scope |
| A-8 Explore flag-like ids as branch names under format {name} | --detach, -f, --orphan, -D | not read as option | held | held |
| A-9 Explore an unknown slice id on patch-slice | S-404 | no side effect | stray branch left, same as main | out-of-scope |
| A-10 Explore a broken config.json | truncated JSON | JSON error | held | held |
| A-11 Explore network egress in prune and patch-slice | gh shim | zero calls | zero calls | held |

</details>

## Defects found on the way
**Blocking defects:** none. No verifier, core check or review reported a blocking defect.

**Other defects fixed in the slice:**
- Test defect, found by the implementer in round 0: the test `a run branch with a custom format is advanced and kept as a full name` compared the parent of the milestone branch. R-058 fixes the milestone tip at the run tip. The test now compares tips (ADR-20261010-035538-implementer-S-022-11cb). Guard: `skills/sdlc/test/scripts.test.mjs:1984`.
- Test gap, found by the review in fix round 1: no committed test covered a malformed or git-unsafe `branchFormat`. Commits 74e20f3 and 0c7f56f promoted the verifier refusal tests. Guards: `skills/sdlc/test/scripts.test.mjs:2026` and `:2047`. Reproduce: set `branchFormat` to `feature/PROJ-1` and run `base-branch`; expect exit 2 and a JSON error.

**Seeds (open):**

| Seed | Found by | File |
|---|---|---|
| format_of does not call validate_format; a git-unsafe format reaches git | review security r1, cli-0, cli-1, security-0 | `skills/sdlc/state-write.py` |
| patch-slice creates and checks out a branch before it checks the slice id | review security r1, cli-0, security-0 | `skills/sdlc/state-write.py` |
| patch-slice leaves HEAD on the run branch when the milestone branch name is invalid | cli-1 | `skills/sdlc/state-write.py` |
| A non-string or empty branchFormat falls back to the default without a message | review security r1, cli-0, cli-1, security-0 | `skills/sdlc/branches.py` |
| The docstring near line 275 still names sdlc/run-<n> and sdlc/M-1 | review architecture r0, review security r1 | `skills/sdlc/state-write.py` |
| Three wrappers repeat the same Fail conversion; fmt passes through six helpers | review architecture r0 | `skills/sdlc/state-write.py` |
| Branch kind accepts Unicode digits and M-0 as milestone ids (parity with the old regex) | cli-0, contract-0 | `skills/sdlc/branches.py` |
| require_known_mode crashes on a config.json that holds a list (not in the S-022 diff) | cli-1 | `skills/sdlc/state-write.py` |
| testkit pycall cannot return a Python set | contract-0 | `skills/sdlc/test/testkit/pycall.py` |

The seed about listing all of `refs/heads/` is closed: the plan accepts the cost and no change is needed.

## Appendix
- Toolkit tools used: cli-runner, attack-corpus, property, stub-server (gh shim), all from the testkit in `.sdlc/testkit.json`.
- Plans: [round 0](../../slices/S-022/verification/plan-r0.md), [round 1](../../slices/S-022/verification/plan-r1.md).
- Profile evidence, round 0: [cli-0](../../slices/S-022/verification/r0/cli-0.md), [cli-1](../../slices/S-022/verification/r0/cli-1.md), [contract-0](../../slices/S-022/verification/r0/contract-0.md), [security-0](../../slices/S-022/verification/r0/security-0.md). Logs are in [r0/logs](../../slices/S-022/verification/r0/logs).
- Core verifier summaries: [spec fidelity r0](../../slices/S-022/verify-spec-fidelity-r0.md), [spec fidelity r1](../../slices/S-022/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-022/verify-regression-r0.md), [regression r1](../../slices/S-022/verify-regression-r1.md).
- Reviews: [architecture r0](../../slices/S-022/review-architecture-r0.md), [security r1](../../slices/S-022/review-security-r1.md). Gate: [gate-r0](../../slices/S-022/gate-r0.md) (`npm test`: 706 passed, 0 failed, 1 skipped).
- Round 1 held no profile evidence. It ran the core verifiers only, because the fix changed tests and no product behavior.
- Missing sources: none.