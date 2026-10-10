# Verify contract: S-fix-M-1-1b

- Slice: S-fix-M-1-1b
- Profile: contract, part 0
- Round: 0
- Commit: 61c3949
- Verdict: refuted (VS-7)

Environment: python3 -I driver (kwcall.py) loads skills/sdlc/branches.py from a worktree of sdlc/S-fix-M-1-1b; node:test; no network

Surface: branches.py exports: name(fmt, kind, **parts), parse(fmt, branch, ids=None), tail(kind, **parts), split(fmt), validate_format(fmt), load_format(repo), Fail. No signature changed in this slice.

Run the tests with: `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs`

## TC-contract-1 (VS-1): name refuses ids that parse as another kind

- Given: format sdlc/{name} and sdlc/{name:lower}; kinds slice and milestone; ids S-001-attempt-2, S-001-v0-cli-0, S-001-attempt-0, S-001-v10-a-b-3
- When: call name
- Then: every call raises Fail that names the kind and the branch; parse still reads the ids as attempt and verify
- Actual: 16 of 16 calls raised Fail, for example: the slice branch name 'sdlc/S-001-attempt-2' does not parse back as a slice branch: parse reads kind attempt. parse reads attempt and verify as before.
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:60`

```
property-run: 16 example calls, 0 violations
```

## TC-contract-2 (VS-2): valid parts of every kind keep their names and parse back

- Given: 4 formats x 11 valid kind and part sets, including S-fix-M-1-2, S-001-e2e and n='07'
- When: call name, then parse
- Then: name equals the reference name built from the spec; parse returns the same kind and parts
- Actual: 44 of 44 names equal the reference and parse back; name('sdlc/{name}','slice',id='S-001') is sdlc/S-001
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:76`

```
property-run: 44 example calls, 0 violations
```

## TC-contract-3 (VS-3): non-ASCII ids and parts are refused

- Given: ids with U+212A, U+017F, U+00E9, fullwidth digits, U+0130; integer parts with fullwidth and Arabic-indic digits; formats {name} and {name:lower}; kinds slice, milestone, e2e, attempt, verify, e2e-area, run
- When: call name
- Then: every call raises Fail
- Actual: all calls raised Fail; fullwidth digits never pass as integers
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:94`

```
property-run: about 150 example calls, 0 violations
```

## TC-contract-4 (VS-4): integer parts compare by value

- Given: n in 2, '02', '2', 0, '000', a 401-digit string and integer; bad values ' 2', '+2', '-1', '0x2', '2.0', '2e0', '2_0', '', 'two', 2.0, True, False, '2 ', U+0662, NUL
- When: call name with kinds run and attempt
- Then: valid values succeed and parse back by value; bad values raise Fail with no exception trace
- Actual: valid values passed and parsed back by value; every bad value raised Fail; no exception outcome
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:114`

```
property-run: 40 example calls, 0 violations
```

## TC-contract-5 (VS-5): lowering touches only the tail and follows one ASCII rule

- Given: formats Feat/PROJ-{name:lower}-X and sdlc/{name:lower}; areas with U+00C9, U+0130, U+00DF, U+1E9E, U+017F, K
- When: call name for e2e-area, then parse
- Then: name equals the reference name with ASCII lowering of the tail only; prefix and suffix keep their case; parse returns the same area
- Actual: Feat/PROJ-{name:lower}-X with S-001 gives Feat/PROJ-s-001-X; all 16 area cases equal the reference and parse back; profile CLI lowers to cli
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:144`

```
property-run: 18 example calls, 0 violations
```

## TC-contract-6 (VS-6): joined prefix or suffix never gives a silent mismatch

- Given: 7 formats with suffix -e2e, -attempt-1, -v1-a-1, -1, -attempt-2 or prefix run-; 5 kinds; 7 ids
- When: call name; when it returns, call parse
- Then: each call raises Fail or parses back to the same kind and parts
- Actual: 245 calls: 126 raised Fail, 119 returned and all parse back to the same kind and parts; 0 exceptions
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:161`

```
property-run: 245 example calls, fails 126, oks 119, 0 violations
```

## TC-contract-7 (VS-7): state names keep the given ts and build one when absent

- Given: format sdlc/{name}, kind state
- When: call name with no ts, with ts '', with a 14-digit ts, and with bad ts values
- Then: no ts or empty ts builds a 14-digit UTC stamp; a given ts is used as given; every bad ts raises Fail
- Actual: no ts, empty ts, given ts and lowered format passed. Short, letters, fullwidth digits, leading space and '0' raised Fail. ts '20261011101010\n' (trailing line feed) returned sdlc/state-20261011101010\n, so name did not raise Fail
- Result: fail
- Spec source: R-019 acceptance: every name output parses back to the same parts
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:177`

```
property-run: ts='20261011101010\n' -> {"outcome":"return","value":"sdlc/state-20261011101010\n"}; parse reads ts '20261011101010' without the line feed
```

## TC-contract-8 (VS-1): property: any name output parses back to the same kind and parts

- Given: seed 20261011; 3000 random calls over 13 formats, 8 kinds, adversarial ids, integers, areas, profiles and ts values; reference parts compared by value for integers and by ASCII lowering for strings
- When: call name, then parse every returned branch
- Then: outcome is return or Fail, never an exception; every returned branch parses back to the same kind and parts
- Actual: 728 returned, 2272 raised Fail, 0 exceptions. 106 violations, all with kind state and ts '20261011101010\n': name accepted the ts and parse returned it without the line feed
- Result: fail
- Spec source: R-019 acceptance: every name output parses back to the same kind and parts
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:216`

```
property-run: property=any-name-roundtrip seed=20261011 runs=3000 result=106 violations, all state with a ts that ends in a line feed
```

## TC-contract-9 (VS-2): property: valid parts give the reference name and round-trip

- Given: seed 20261012; 2000 random valid kind and part sets over 5 formats
- When: call name
- Then: name equals the reference name built from the spec text
- Actual: 2000 of 2000 equal the reference
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:267`

```
property-run: property=valid-names seed=20261012 runs=2000 result=0 violations
```

## TC-contract-10 (VS-2): property: name is deterministic

- Given: seed 20261013; 500 valid calls
- When: call name twice per input
- Then: both batches are equal
- Actual: 500 of 500 equal
- Result: pass
- Spec source: R-019 acceptance
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:283`

```
property-run: property=determinism seed=20261013 runs=500 result=0 violations
```

## Seeds

- name accepts an integer part with a trailing line feed: name('sdlc/{name}','run',n='2\n') returns 'sdlc/run-2\n' and name('sdlc/{name}','attempt',id='S-001',n='2\n') returns 'sdlc/S-001-attempt-2\n'. The parse regex $ matches before a final line feed, and the round trip compares int('2\n') with 2 by value. The branch name holds a line feed. The part is equal by value, so the acceptance text does not clearly forbid it. 34 of 3000 property calls hit this. (`skills/sdlc/branches.py`)
- parse accepts a branch with a trailing line feed: The patterns in PARSE_ROWS end with $, so parse('sdlc/{name}','sdlc/run-2\n') reads kind run. This is the cause of the state ts defect and of the integer seed. Use \Z or fullmatch. parse is outside this slice. (`skills/sdlc/branches.py`)
- name never compares the state ts part: TAILS['state'] lists no required parts, so _check_round_trip skips ts even when the caller gave one. A given ts that parse reads differently passes. The plan says to skip ts only when none was given. (`skills/sdlc/branches.py`)

## Attacks

None.
