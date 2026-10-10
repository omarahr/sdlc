# S-022 verify-contract, round 0

Slice: S-022. Profile: contract. Round: 0. Commit: 7813019. Verdict: all 6 cases pass.

Environment: Node test runner, python3 -I, state-write.py loaded by path from the sdlc/S-022 worktree; no network, no git remote.

Surface (once): milestone_branches_with_open_slice_pr (repo, fmt); prune_stale_milestone_branches (repo, config, keep, fmt); slice_base (..., slice_id, fmt); awaiting_merge_base (repo, slices, slice_id, fmt); MILESTONE_BRANCH false

## TC-contract-1 (VS-5): branch_kind classifies milestone exactly as the M-<digits> reference model

- Given: 1500 generated (format, branch) pairs: prefixes, suffixes, {name} and {name:lower}, middles M-n, M-n-e2e, S-, run-, odd and unicode digits, mutated prefixes
- When: call branch_kind(fmt, branch) and compare with a model written from the spec text
- Then: kind is milestone exactly when the model says so
- Result: pass. Spec source: R-057 acceptance (kind, not regex)
- Test: `.sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs:75`

```
property branch_kind seed=2431164117 runs=1500 milestones=162 violations=0
```

## TC-contract-2 (VS-5): Under the default format the new classifier agrees with the old sdlc/M-<digits> regex

- Given: 1507 branches under sdlc/{name} including main, feature/other, sdlc/M-1/x, sdlc/M-0, sdlc/M-007, sdlc/M-١
- When: compare branch_kind with the old regex semantics (Unicode digits, as Python \d)
- Then: 0 disagreements
- Result: pass. Spec source: R-057 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs:93`

```
regex-agreement cases=1507 disagreements=0 (seed 2431164117+1)
```

## TC-contract-3 (VS-4): milestone_branches_with_open_slice_pr equals the reference set for random ledgers and formats

- Given: 1500 generated ledgers: 0-4 milestones, 0-6 slices in all statuses, fixSlices, slices with no milestone, unknown slices, lowercase formats
- When: call the function with the format
- Then: returned set equals the awaiting-merge slices' milestone names built from the format
- Result: pass. Spec source: R-096 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs:103`

```
open-slice-pr seed=2431164117 runs=1500 nonEmpty=578 violations=0
```

## TC-contract-4 (VS-4): Documented example: only feature/PROJ-1-M-1 is returned

- Given: S-001 awaiting-merge in M-1, S-002 done in M-2
- When: call with feature/PROJ-1-{name}, feature/{name:lower}, sdlc/{name}
- Then: sets are {feature/PROJ-1-M-1}, {feature/m-1}, {sdlc/M-1}; empty with no pending slice or no milestone
- Result: pass. Spec source: R-096 acceptance; plan T-4b
- Test: `.sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs:145`

```
4 assertions pass (see log)
```

## TC-contract-5 (VS-4): Bad formats give the module Fail or a return, never another exception

- Given: formats: empty, no placeholder, two placeholders, null, number, list, NUL, {id}
- When: call milestone_branches_with_open_slice_pr and branch_kind
- Then: outcome is return or Fail
- Result: pass. Spec source: ADR for format problems (plan Risks)
- Test: `.sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs:158`

```
9 formats x 2 functions pass
```

## TC-contract-6 (VS-5): Consumer surface: no MILESTONE_BRANCH, no sdlc/{ literal, new signatures

- Given: state-write.py loaded by path
- When: list signatures
- Then: signatures take fmt; MILESTONE_BRANCH absent
- Result: pass. Spec source: R-057 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/contract-0/prune.verify-contract.test.mjs:172`

```
milestone_branches_with_open_slice_pr (repo, fmt); prune_stale_milestone_branches (repo, config, keep, fmt); slice_base (..., slice_id, fmt); awaiting_merge_base (repo, slices, slice_id, fmt); MILESTONE_BRANCH false
```

## Attacks

None.

## Seeds

- Branch kind accepts Unicode digits in M-<digits>. branch_kind and the old regex both use Python \d, so sdlc/M-١ counts as a milestone branch. Behavior is unchanged from before the slice. Git accepts such names.
- pycall cannot return a Python set. testkit pycall.py serializes a set with repr. Tests that call milestone_branches_with_open_slice_pr through callPython get a string. I wrapped the call in my own test file.
