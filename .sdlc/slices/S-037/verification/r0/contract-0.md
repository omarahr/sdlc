# Verification: contract, part 0

Slice: S-037 · Profile: contract · Round: 0 · Commit: 0e58a38 · Verdict: verified

Environment: Node v24.19.0, python3, macOS; scratch git repos for branches.py

Surface: the public text surface is 16 prompt files under `skills/sdlc/prompts/` plus the `branches.py name --kind state` command.

## TC-contract-1 (VS-1): state-schema.md names runBranch and the branch field by kind

- Given: Slice commit 0e58a38 prompt files
- When: Scan the files with independent checks, and with mutations for VS-6
- Then: state-schema.md has the runBranch text, the slice branch text, the JSON example uses <slice branch>, and no sdlc/S-, sdlc/run- literal.
- Result: pass (spec source: R-134 acceptance)
- Test: .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:13
- Command: `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`

Evidence (property-run): node --test result
```
5 tests, 5 pass, 0 fail (exhaustive scan of fixed files; no random input; seed none; runs 1)
```

## TC-contract-2 (VS-2): commit-state.md holds the four placeholders and no loop literal in any block or inline code

- Given: Slice commit 0e58a38 prompt files
- When: Scan the files with independent checks, and with mutations for VS-6
- Then: All four placeholders present. No sdlc/ literal in prose, code blocks or inline code.
- Result: pass (spec source: R-135 acceptance)
- Test: .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:27
- Command: `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`

Evidence (property-run): node --test result
```
5 tests, 5 pass, 0 fail (exhaustive scan of fixed files; no random input; seed none; runs 1)
```

## TC-contract-3 (VS-3): commit-state.md holds no date -u; _common.md maps <state branch> to branches.py

- Given: Slice commit 0e58a38 prompt files
- When: Scan the files with independent checks, and with mutations for VS-6
- Then: No date -u, no $(date, no %Y%m%d. One _common row maps <state branch> to branches.py name --kind state. The command gives valid state branch names for 3 formats.
- Result: pass (spec source: R-135 acceptance)
- Test: .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:38
- Command: `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`

Evidence (property-run): node --test result
```
5 tests, 5 pass, 0 fail (exhaustive scan of fixed files; no random input; seed none; runs 1)
```

Evidence (transcript): branches.py name --kind state
```
format=[] name=sdlc/state-20261010132711
valid
{"kind":"state","ids":null}
format=[feature/{name}] name=feature/state-20261010132711
valid
{"kind":"state","ids":null}
format=[team/{name:lower}-x] name=team/state-20261010132712-x
valid
{"kind":"state","ids":null}
```

## TC-contract-4 (VS-4): The 13 slice prompts exist, hold <slice branch> and hold no loop literal

- Given: Slice commit 0e58a38 prompt files
- When: Scan the files with independent checks, and with mutations for VS-6
- Then: 13 distinct files exist; each holds <slice branch>; none holds sdlc/<id>, sdlc/S-, sdlc/run- or any loop literal.
- Result: pass (spec source: R-146 acceptance)
- Test: .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:48
- Command: `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`

Evidence (property-run): node --test result
```
5 tests, 5 pass, 0 fail (exhaustive scan of fixed files; no random input; seed none; runs 1)
```

## TC-contract-5 (VS-5): state-schema.md stack bullet names the milestone by kind; only sdlc/{name} remains

- Given: Slice commit 0e58a38 prompt files
- When: Scan the files with independent checks, and with mutations for VS-6
- Then: Stack bullet matches /milestone/ and holds no sdlc/. The only sdlc/ text outside .sdlc/ is the sdlc/{name} default.
- Result: pass (spec source: R-149 acceptance)
- Test: .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:63
- Command: `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`

Evidence (property-run): node --test result
```
5 tests, 5 pass, 0 fail (exhaustive scan of fixed files; no random input; seed none; runs 1)
```

## TC-contract-6 (VS-6): The four new tests fail when a literal or placeholder returns

- Given: Slice commit 0e58a38 prompt files
- When: Scan the files with independent checks, and with mutations for VS-6
- Then: Each of 13 mutations on a scratch copy fails the matching test. No mutation passed.
- Result: pass (spec source: spec tests T-R-134, T-R-135, T-R-146, T-R-149)
- Test: .sdlc/slices/S-037/verification/r0/logs/contract-0-mutations.txt:1
- Command: `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`

Evidence (transcript): mutation results
```
Mutations on scratch copies (repo untouched). Test file: skills/sdlc/test/prompts.test.mjs
state-schema: "<slice branch>" -> "sdlc/S-001"        fails T-R-134, T-R-149
state-schema: runBranch text -> `sdlc/run-<n>`         fails T-R-134, T-R-149
state-schema: add (sdlc/M-<n>) to stack bullet         fails T-R-149
commit-state: append `date -u` line                    fails T-R-135
commit-state: append sdlc/state- literal               fails T-R-135
commit-state: drop <milestone branch>                  fails T-R-135
_common: state branch mapping -> `date -u`             fails T-R-135
implementer: <slice branch> -> sdlc/<id>               fails T-R-146
planner, verify-collector, state-reader: drop <slice branch>   each fails T-R-146
gate: add sdlc/run-3 inside a code block               fails T-R-146
prompts.test.mjs: drop verify-collector from list      fails T-R-146 (count is 13)
```

## Attacks
None.

## Seeds
None.
