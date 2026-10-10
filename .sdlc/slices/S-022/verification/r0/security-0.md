# S-022 verify-security r0 part 0

- Slice: S-022
- Profile: security
- Round: 0
- Commit: 7813019
- Verdict: no in-scope failure. 15 cases pass. Three seeds.

Environment: python3, node 24, git, scratch repos with a bare remote, gh shim from stub-server (zero calls)

Threat model: the spec states none for state-write. Ids and config come from agent-written files, so the attacks stay on format values and ids. Findings outside the stated requirements are seeds.

## TC-security-1 (VS-1): Custom format creates feature/PROJ-1-S-001 from feature/PROJ-1-M-1 and no sdlc/ branch

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Both feature branches exist, no sdlc/ branch, slice cut from milestone
- Expected: Both feature branches exist, no sdlc/ branch, slice cut from milestone
- Actual: As expected
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:37`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-2 (VS-1): Lowercase format gives feature/s-001 and feature/m-1; default format and repo-file format keep sdlc/ names

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Names follow the format
- Expected: Names follow the format
- Actual: As expected
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:47`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-3 (VS-1): 128 hostile slice ids on patch-slice (attack-corpus, all families)

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Exit 2, JSON error, no traceback
- Expected: Exit 2, JSON error, no traceback
- Actual: 128 ids: no traceback, all exit 2. Ids that form a valid ref leave a branch behind (seed S1, same on main)
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:57`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-4 (VS-1): Hostile slice ids on base-branch

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Exit 2 and tree unchanged for every id
- Expected: Exit 2 and tree unchanged for every id
- Actual: Held
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:71`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-5 (VS-3): Dependency awaiting-merge resolves to feature/PROJ-1-S-001; decoy sdlc/S-001 is not used; a gone dependency branch falls back to the milestone branch

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Format branch wins, decoy ignored
- Expected: Format branch wins, decoy ignored
- Actual: Held
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:81`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-6 (VS-3): base-branch: milestone branch, shipped milestone gives run branch, unknown slice refused

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: feature/PROJ-1-M-1; run branch; exit 2 JSON, tree unchanged
- Expected: feature/PROJ-1-M-1; run branch; exit 2 JSON, tree unchanged
- Actual: Held
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:90`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-7 (VS-7): branchFormat with no placeholder, two placeholders, mixed placeholders

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Exit 2, JSON error, tree unchanged on base-branch and patch-slice
- Expected: Exit 2, JSON error, tree unchanged on base-branch and patch-slice
- Actual: Held: six refusals with the module message, tree unchanged
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:97`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-8 (VS-7): Empty branchFormat falls back to default; broken config.json refuses with JSON error

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: JSON error, exit 2, no traceback
- Expected: JSON error, exit 2, no traceback
- Actual: Held
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:127`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-9 (VS-5): Prune deletes shipped milestone branches (M-1, M-007, M-0) and keeps e2e, e2e-area, slice, lookalike, unicode-digit, other-prefix and worktree-held branches; default and custom format

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: Only milestone-kind branches are deleted
- Expected: Only milestone-kind branches are deleted
- Actual: Held under both formats
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:138`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-10 (VS-5): state-write.py holds no MILESTONE_BRANCH and no sdlc/{ literal; no quoted sdlc/ literal in code

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: No match
- Expected: No match
- Actual: No match, zero quoted sdlc/ literals
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:158`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-11 (VS-5): Prune and patch-slice make no gh call

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: gh shim logs zero calls
- Expected: gh shim logs zero calls
- Actual: Zero calls (GH_CALLS [])
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:166`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-12 (VS-1): Run branch outside the format is not rewritten

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: config.json unchanged byte for byte
- Expected: config.json unchanged byte for byte
- Actual: Held
- Result: pass
- Spec source: R-058 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:174`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-13 (VS-7): Unknown slice id on patch-slice

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: No partial branch
- Expected: No partial branch
- Actual: Exit 2, but the branch feature/PROJ-1-S-404 stays and is checked out. The same happens on main with sdlc/S-404 (seed S1)
- Result: pass
- Spec source: no spec source: pre-existing order in ensure_slice_branch
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:183`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-14 (VS-7): Flag-like ids (--detach, -f, --orphan, -D) with format {name}

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: git does not read the id as an option
- Expected: git does not read the id as an option
- Actual: git refuses each as an invalid branch name, exit 2, tree clean
- Result: pass
- Spec source: R-056 acceptance
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:192`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## TC-security-15 (VS-7): Invalid git formats and non-string formats (7, array, object, true)

- Given: a scratch stack-mode repo with a bare remote
- When: the script runs with the attack input
- Then: JSON error and exit 2 per the plan note
- Expected: JSON error and exit 2 per the plan note
- Actual: base-branch exits 0 with a name git refuses (feat~/M-1). patch-slice exits 2 but moves HEAD. Non-string values fall back to sdlc/{name} silently (seed S2, S3)
- Result: pass
- Spec source: no requirement quote: validate_format runs at pre-flight (spec Edge cases)
- Test: `.sdlc/slices/S-022/verification/r0/tests/security-0/state-write.verify-security.test.mjs:202`
- Evidence: `.sdlc/slices/S-022/verification/r0/logs/security-0-run3.txt`

## Attacks

- A-1 (held): Explore slice creation with hostile ids to find a traceback or a git option reaching git. Input: corpus all families, argv-safe, 128 values. Expected: exit 2 JSON, no traceback. Observed: held for tracebacks; branches left for valid-ref ids. Case: TC-security-3.
- A-2 (held): Explore base-branch with hostile ids. Input: corpus all families. Expected: exit 2, tree unchanged. Observed: held. Case: TC-security-4.
- A-3 (held): Explore dependency lookup with decoy branch sdlc/S-001. Input: decoy plus real branch. Expected: format branch, never decoy. Observed: held. Case: TC-security-5.
- A-4 (held): Explore the prune with look-alike branch names. Input: M-1-e2e, M-1-e2e-area, M-٣, m-5, M-3/x, xM-3, feature/other, worktree-held. Expected: only M-<n> kind deleted. Observed: held under default and custom format. Case: TC-security-9.
- A-5 (held): Explore the format with no/two/mixed placeholders. Input: 3 values on two commands. Expected: exit 2 JSON. Observed: held. Case: TC-security-7.
- A-6 (out-of-scope): Explore the format with git-unsafe text. Input: whitespace, ~, :, .., .lock, leading dash. Expected: exit 2 JSON, no side effect. Observed: base-branch exit 0 with invalid name; patch-slice exit 2 but HEAD moved and origin/HEAD added. Case: TC-security-15.
- A-7 (out-of-scope): Explore the format with non-string values. Input: 7, array, object, true. Expected: refusal. Observed: silent fallback to sdlc/{name}. Case: TC-security-15.
- A-8 (held): Explore flag-like ids as branch names under format {name}. Input: --detach, -f, --orphan, -D. Expected: not read as option. Observed: held. Case: TC-security-14.
- A-9 (out-of-scope): Explore an unknown slice id on patch-slice. Input: S-404. Expected: no side effect. Observed: stray branch left, same as main. Case: TC-security-13.
- A-10 (held): Explore a broken config.json. Input: truncated JSON. Expected: JSON error. Observed: held. Case: TC-security-8.
- A-11 (held): Explore network egress in prune and patch-slice. Input: gh shim. Expected: zero calls. Observed: zero calls. Case: TC-security-11.

## Seeds

- patch-slice leaves a branch behind for an unknown or hostile slice id (`skills/sdlc/state-write.py`): ensure_slice_branch creates and checks out the slice branch before patch_slice checks that the slice exists. Exit 2 follows, with the new branch left and HEAD moved. S-404 does this on main too (sdlc/S-404). Move the existence check before the branch creation.
- format_of does not call validate_format (`skills/sdlc/state-write.py`): A branchFormat such as feat~/{name} gives base-branch exit 0 with the name feat~/M-1. patch-slice exits 2 from git, but only after it moved HEAD to the run branch and fetched. Call branches.validate_format in format_of (slice S-023 may own this).
- A non-string branchFormat falls back to sdlc/{name} without a message (`skills/sdlc/branches.py`): A number, array, object or true in config.branchFormat makes load_format return the default. state-write then creates sdlc/ branches while config claims another scheme. branches.py _config_value ignores non-string values. Refuse them.
