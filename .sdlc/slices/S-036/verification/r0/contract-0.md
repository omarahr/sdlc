# Verification: S-036, contract, round 0

Commit: 28d6cce. Verdict: verified (8 of 8 cases pass).

Environment: Node, python3 3.x, scratch git repo from cli-runner; no network

## TC-contract-1 (VS-1): scenario-runner holds the exact worktree command and no literal

- Given: slice commit 28d6cce, prompt files read from disk
- When: the test reads the prompt text and applies the guard regex
- Then: Exact command appears once; swapped, literal and respelled variants are absent; guard matches a literal variant
- Result: pass
- Spec source: R-132 acceptance
- Test: .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:20
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`

Evidence (log): test run
```
see .sdlc/slices/S-036/verification/r0/logs/contract-0-verify.log
```

## TC-contract-2 (VS-2): env-detector holds three run branch placeholders, the parsed kind phrase and the sdlc/{name} default

- Given: slice commit 28d6cce, prompt files read from disk
- When: the test reads the prompt text and applies the guard regex
- Then: count(<run branch>) >= 3, phrase present, no sdlc/run- or glob, sdlc/{name} still present
- Result: pass
- Spec source: R-133 acceptance
- Test: .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:39
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`

Evidence (log): test run
```
see .sdlc/slices/S-036/verification/r0/logs/contract-0-verify.log
```

## TC-contract-3 (VS-2): branches.py parse returns kind run for sdlc/run-2 under the default format

- Given: slice commit 28d6cce, prompt files read from disk
- When: the test reads the prompt text and applies the guard regex
- Then: sdlc/run-2 gives kind run, sdlc/S-003 slice, sdlc/M-1 milestone, sdlc/run-2-x kind null; tree unchanged
- Result: pass
- Spec source: R-133 acceptance
- Test: .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:49
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`

Evidence (transcript): parse outputs
```
sdlc/run-2 -> exit 0 kind=run n=2
sdlc/S-003 -> kind=slice
sdlc/M-1 -> kind=milestone
sdlc/run-2-x -> kind=null
```

## TC-contract-4 (VS-3): milestone-writer holds all three placeholders and no literal, including in code spans

- Given: slice commit 28d6cce, prompt files read from disk
- When: the test reads the prompt text and applies the guard regex
- Then: Three placeholders present; no sdlc/M-, sdlc/<id>-e2e or loop literal in any code span
- Result: pass
- Spec source: R-144 acceptance
- Test: .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:65
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`

Evidence (log): test run
```
see .sdlc/slices/S-036/verification/r0/logs/contract-0-verify.log
```

## TC-contract-5 (VS-4): e2e-harness holds both placeholders and no literal

- Given: slice commit 28d6cce, prompt files read from disk
- When: the test reads the prompt text and applies the guard regex
- Then: Both placeholders present; no sdlc/<milestoneId>-e2e or sdlc/M-
- Result: pass
- Spec source: R-148 acceptance
- Test: .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:78
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`

Evidence (log): test run
```
see .sdlc/slices/S-036/verification/r0/logs/contract-0-verify.log
```

## TC-contract-6 (VS-5): guard property: 1200 seeded mutations of the four prompts

- Given: slice commit 28d6cce, prompt files read from disk
- When: the test reads the prompt text and applies the guard regex
- Then: Every injected literal, in 5 wrappers and 10 forms, matches; sdlc/{name} injected never matches; allowed text never matches
- Result: pass
- Spec source: R-132 acceptance R-133 acceptance R-144 acceptance R-148 acceptance
- Test: .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:86
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`

Evidence (property-run): property
```
property-run seed=20261010 runs=1200 result=pass
```

## TC-contract-7 (VS-5): Injecting a literal into a scratch copy of each prompt fails its pinned test

- Given: scratch copy of skills/sdlc
- When: one line per prompt is changed to a literal and the matching T-R test runs
- Then: T-R-132, T-R-133, T-R-144 and T-R-148 each fail
- Result: pass
- Spec source: R-132 R-133 R-144 R-148 acceptance
- Test: manual probe
- Command: `node --test --test-name-pattern=<id> skills/sdlc/test/prompts.test.mjs (in scratch copy)`

Evidence (transcript): mutation probes
```
scenario-runner -b sdlc/M-1-e2e-x -> T-R-132 fail
env-detector git checkout -b sdlc/run-2 -> T-R-133 fail
milestone-writer <milestone branch> -> sdlc/M-1 -> T-R-144 fail
e2e-harness <e2e branch> -> sdlc/M-1-e2e -> T-R-148 fail
```

## TC-contract-8 (VS-5): prompts.test.mjs and the full npm test pass on the slice commit

- Given: slice commit 28d6cce
- When: npm test runs
- Then: exit 0
- Result: pass
- Spec source: R-132 R-133 R-144 R-148 acceptance
- Test: manual probe
- Command: `npm test`

Evidence (log): npm test
```
see .sdlc/slices/S-036/verification/r0/logs/contract-0-npm-test.log
```

## Attacks

None.

## Seeds

None.