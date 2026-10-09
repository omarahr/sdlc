# S-008 verify-contract part 0, round 0

Commit: 3ce4bff. Verdict: pass (7 of 7 cases).

Environment: Python 3.14.7, node test runner, testkit property.mjs (pycall.py, python3 -I), model written from spec section 2 table in JS.

Surface: parse(fmt, branch, ids=None), PARSE_ROWS, split, name, tail, validate_format, load_format. Spec rows 1 to 4 match the code regexes.

## TC-contract-1 (VS-1): run row: integer n, null for run-x, run-, run-3-x, run--1

- Given: parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)
- When: parse is called with the listed format and branch
- Then: run-3 -> run n=3 int, no id; run-0, run-12, run-007 -> 0, 12, 7; the four bad tails -> null
- Expected: run-3 -> run n=3 int, no id; run-0, run-12, run-007 -> 0, 12, 7; the four bad tails -> null
- Actual: as expected
- Result: pass
- Spec source: R-102 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:92
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: examples)
run-3 -> {kind:run, tail:run-3, n:3, known:null}
```

```text (property-run: parse vs spec-table model)
property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)
```

## TC-contract-2 (VS-2): milestone row never takes e2e tails

- Given: parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)
- When: parse is called with the listed format and branch
- Then: M-2 milestone; M-, M-x null; M-2-e2e is e2e; m-2 null by default, milestone under {name:lower}
- Expected: M-2 milestone; M-, M-x null; M-2-e2e is e2e; m-2 null by default, milestone under {name:lower}
- Actual: as expected
- Result: pass
- Spec source: R-103 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:92
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: parse vs spec-table model)
property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)
```

## TC-contract-3 (VS-3): e2e row ends at e2e

- Given: parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)
- When: parse is called with the listed format and branch
- Then: M-2-e2e -> e2e id M-2; M-2-e2e-api -> e2e-area; M-2-e2e- -> null
- Expected: M-2-e2e -> e2e id M-2; M-2-e2e-api -> e2e-area; M-2-e2e- -> null
- Actual: as expected
- Result: pass
- Spec source: R-104 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:92
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: parse vs spec-table model)
property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)
```

## TC-contract-4 (VS-4): e2e-area keeps dashed area whole

- Given: parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)
- When: parse is called with the listed format and branch
- Then: api-v2, a, 0, e2e, v2-api-3 kept whole
- Expected: api-v2, a, 0, e2e, v2-api-3 kept whole
- Actual: as expected
- Result: pass
- Spec source: R-105 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:92
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: parse vs spec-table model)
property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)
```

## TC-contract-5 (VS-5): first-match order under prefixed, suffixed and lower formats

- Given: parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)
- When: parse is called with the listed format and branch
- Then: rows 1-4 classify identically under feature/PROJ-1-{name}, {name}-wip, feature/PROJ-1-{name:lower}; tail M-2-e2e-api-wip with suffix -wip gives area api
- Expected: rows 1-4 classify identically under feature/PROJ-1-{name}, {name}-wip, feature/PROJ-1-{name:lower}; tail M-2-e2e-api-wip with suffix -wip gives area api
- Actual: as expected
- Result: pass
- Spec source: R-102 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:117
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: parse vs spec-table model)
property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)
```

```text (type-check: mutation check)
Row 3 end anchor removed in a scratch copy: property run 554 violations of 3000, examples and VS-5 tests fail. Copy deleted.
```

## TC-contract-6 (VS-6): slice, e2e-area and verify precedence in one call

- Given: parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)
- When: parse is called with the listed format and branch
- Then: S-fix-M-1-2 slice; M-1-e2e-api e2e-area; S-001-v0-http-api-0 verify profile http-api round 0 part 0
- Expected: S-fix-M-1-2 slice; M-1-e2e-api e2e-area; S-001-v0-http-api-0 verify profile http-api round 0 part 0
- Actual: as expected
- Result: pass
- Spec source: R-070 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:92
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: one call)
slice id S-fix-M-1-2; e2e-area; verify {profile:http-api, round:0, part:0, id:S-001}
```

## TC-contract-7 (VS-1): Determinism and ids lookup

- Given: ids list passed
- When: parse called twice
- Then: equal results
- Expected: equal, known true
- Actual: equal, known true
- Result: pass
- Spec source: R-103 acceptance
- Test: .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:85
- Command: `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```text (property-run: determinism)
two calls deep-equal
```

## Attacks

None. The security profile covers VS-7.

## Seeds

- surface: list_kind, read_rules, evaluate, derive absent: Spec section 2 lists these in the module API. This slice does not own them. Later slices should add them.
- parse accepts a trailing newline on every row: Python $ matches before a final newline, so M-2
 parses as milestone with tail M-2
 and run-3
 gives n 3. The spec regexes use $, so this follows the spec text. The security profile covers it in VS-7.
- types: no compile-time cases: The package is Python. No type-test setup applies. The mutation check shows the tests can fail.
