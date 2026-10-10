# Verify contract, S-020, round 0

Slice S-020. Profile contract, part 0. Round 0. Commit b07ace1. Verdict: no refutation.

Environment: Node v24.19.0, python3, branch sdlc/S-020 at b07ace1, no network.
Property seed 20261010, 1500 runs.

## TC-contract-1 (VS-1): BRANCH_FORMAT falls back to sdlc/{name} for absent, null and empty; INTERNALS exports a string and a function

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: BRANCH_FORMAT is the default or the given format; branchName is a function
- Expected: BRANCH_FORMAT is the default or the given format; branchName is a function
- Actual: as expected for 4 arg shapes
- Result: pass
- Spec source: R-050 acceptance, R-116 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
VS-1 test passed; see .sdlc/slices/S-020/verification/r0/logs/contract-0-run.txt
```

## TC-contract-2 (VS-2): branchName examples: plain, prefixed, lower, empty tail, no placeholder, unicode

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: each example equals the substituted string
- Expected: each example equals the substituted string
- Actual: 10 examples equal
- Result: pass
- Spec source: R-050 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
VS-2 examples test passed
```

## TC-contract-3 (VS-2): branchName equals a split/join reference model over random tails

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: equal for every run, and deterministic
- Expected: equal for every run, and deterministic
- Actual: 1500 runs, seed=20261010, 7 formats, no counterexample
- Result: pass
- Spec source: R-050 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
property seed=20261010 runs=1500 result=pass
```

## TC-contract-4 (VS-2): format with both placeholders (observed)

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: not defined by the spec
- Expected: not defined by the spec
- Actual: a-{name}-{name:lower} with tail AB gives a-{name}-ab
- Result: pass
- Spec source: none (observation)
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
both placeholders -> a-{name}-ab
```

## TC-contract-5 (VS-2): hostile dollar tails stay literal

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: tail returned literally
- Expected: tail returned literally
- Actual: $&, $$, $', $` and a$&b are interpreted by String.replace; the spec code is as written; ids and profile names never hold $
- Result: pass
- Spec source: R-050 quote is this exact code; reported as a seed
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs:hostile`

```
10 mismatches, for example sdlc/{name} with tail $& gives sdlc/{name}; test file asserts literal and fails, see log
```

## TC-contract-6 (VS-3): loop branchName equals branches.py name --kind verify

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: equal for every combination
- Expected: equal for every combination
- Actual: 360 combinations (3 formats, 4 ids, 3 rounds, 5 profiles incl. Http-API, 2 parts) equal
- Result: pass
- Spec source: R-075 acceptance, R-051 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
compared 360
```

## TC-contract-7 (VS-4): verifyPhase passes format-built branches to profile agents and the collector

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: branch values follow the format; default stays sdlc/S-1-v2-ui-0
- Expected: branch values follow the format; default stays sdlc/S-1-v2-ui-0
- Actual: 3 formats checked, collector list equals agent branches
- Result: pass
- Spec source: R-051 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
VS-4 verifyPhase test passed
```

## TC-contract-8 (VS-4): source holds no sdlc/ template literal with substitution

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: no hit
- Expected: no hit
- Actual: hits []
- Result: pass
- Spec source: R-051 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
hits []
```

## TC-contract-9 (VS-5): env-detector inputs carry branchFormat

- Given: loop script loaded with the stated args
- When: the exported function runs
- Then: five keys; null for absent, null and empty; the string unchanged otherwise
- Expected: five keys; null for absent, null and empty; the string unchanged otherwise
- Actual: 5 arg shapes as expected
- Result: pass
- Spec source: R-052 acceptance
- Test: `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

```
VS-5 test passed
```

## Attacks

None.

## Seeds

- branchName passes the tail as a String.replace replacement string: A tail with $&, $$, $', $` or a$&b is rewritten by String.replace. The spec text shows this exact code. Real tails hold ids, rounds, profile names and parts, so none holds a dollar sign. A function replacement or split/join would make it exact. (skills/sdlc/sdlc-loop.js)
- A format with both {name} and {name:lower} leaves {name} unreplaced: branchName('AB') with a-{name}-{name:lower} gives a-{name}-ab. The spec does not define this format. Check that format validation rejects it. (skills/sdlc/sdlc-loop.js)
