# Slice S-031, profile contract, round 0, commit 94acd53

Verdict: pass. 10 cases, 10 passed. No failure.

Environment: Python 3 with node --test, branches.py loaded by path through the testkit property setup; cli-runner, stub-server gh shim and glab-stub in scratch directories

Surface: Fail JsonArgumentParser build_parser build_samples cmd_list cmd_name cmd_parse cmd_preflight derive evaluate github_rule gitlab_rule judge list_kind load_format load_git_modes main make_rule name parse read_rules ref_format_error regex_error split suggest tail validate_format verdict. Every function the spec names is present.

## TC-contract-1 (VS-1, R-127): Spec examples for regex evaluate
- Given: evaluate with a regex rule
- When: pattern feature on x/feature/y; ^feature/ on sdlc/S-001; ^feature/ on feature/S-001
- Then: True, False, True
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:42
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence type-check: ```
regex_eval('feature','x/feature/y') -> true
regex_eval('^feature/','sdlc/S-001') -> false
regex_eval('^feature/','feature/S-001') -> true
```

## TC-contract-2 (VS-1, R-127): Corners: empty, invalid, newline, multiline anchors
- Given: edge patterns
- When: empty pattern; invalid ( and [; ^a$ on 'a\n'; ^feature on 'x\nfeature'
- Then: empty matches; invalid gives None without exception; search semantics hold
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:50
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence property-run: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-3 (VS-1, R-127): Property: regex search equals reference model
- Given: generated literal patterns with optional ^ and $
- When: 2000 runs, seed 4227400405, negate included
- Then: 0 violations against the substring/prefix/suffix/equality model
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:65
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence property-run: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-4 (VS-1, R-127): Determinism: same input, same output
- Given: 500 generated pairs
- When: two calls
- Then: identical results
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:82
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence property-run: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-5 (VS-1, R-127): Consumer view: preflight with GitHub regex rule
- Given: pr mode, rule ^feature/
- When: custom format feature/{name}, then default format
- Then: exit 0 and all pass; exit 1 and slice sample fail
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:139
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence transcript: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-6 (VS-1, R-127): Consumer view: invalid regex rule
- Given: pr mode, rule pattern (
- When: preflight
- Then: no traceback; samples unevaluated with a note
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:156
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence transcript: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-7 (VS-2, R-140): Preflight calls only the project push rule in pr and stack modes
- Given: glab stub, bodies: branch_name_regex, empty, null, failure
- When: preflight --mode pr and --mode stack
- Then: exactly one call, argv api projects/:fullpath/push_rule, no group path; one rule with source gitlab and label push rule when a regex is set
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:176
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence transcript: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-8 (VS-3, R-142): Spec example for the literal prefix format
- Given: format feature/PROJ-123-{name}
- When: name slice S-001, S-002, S-012a, milestone M-1; validate; trailing slash variant
- Then: feature/PROJ-123-S-001 and variants; validate accepts; trailing slash refused by check-ref-format
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:90
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence property-run: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-9 (VS-3, R-142): Property: prefix and suffix kept byte for byte
- Given: 1500 generated literal formats
- When: name slice
- Then: prefix+id+suffix; 300 generated formats pass validate_format
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:104
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence property-run: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## TC-contract-10 (VS-3, R-142): Consumer view: name and preflight
- Given: repo with no config
- When: name command, preflight --format
- Then: branch feature/PROJ-123-S-001; ok true, given true, slice sample feature/PROJ-123-S-001
- Result: pass
- Test: .sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:201
- Command: `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`

Evidence transcript: .sdlc/slices/S-031/verification/r0/logs/contract-0.log

## Property runs
- VS-1 regex: seed 4227400405, 2000 runs, 0 violations.
- VS-3 name: seed 3354518510, 1500 runs, 0 violations.
- VS-3 validate: seed 1976669426, 300 runs, 0 violations.

## Attacks
None.

## Seeds
- Trailing slash format: correct refusal by git check-ref-format. No action.
