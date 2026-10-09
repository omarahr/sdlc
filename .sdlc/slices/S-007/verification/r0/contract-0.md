# S-007 verify-contract, round 0, part 0

Slice: S-007. Profile: contract. Round: 0. Commit: ca640fc. Verdict: pass (14 of 14 cases, scenarios VS-1 to VS-6).

Environment: Python 3.14.7, Node test runner, property toolkit (seed 3739127874, 1500 runs per property), reference model in JS written from spec section 2.

Seed for every property run: 3739127874. Replay with `TESTKIT_SEED=3739127874`.

Surface listing of `skills/sdlc/branches.py` as a consumer imports it:

```json
{"public":["Fail","JsonArgumentParser","build_parser","cmd_list","cmd_name","cmd_parse","cmd_preflight","load_format","load_git_modes","main","name","parse","split","tail","validate_format"],"sigs":{"build_parser":"()","cmd_list":"(ns)","cmd_name":"(ns)","cmd_parse":"(ns)","cmd_preflight":"(ns)","load_format":"(repo)","load_git_modes":"(path='/private/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-007-v0-contract-0/skills/sdlc/git-modes.json')","main":"(argv=None)","name":"(fmt, kind, **parts)","parse":"(fmt, branch, ids=None)","split":"(fmt)","tail":"(kind, **parts)","validate_format":"(fmt)"},"modules":["argparse","json","os","re","subprocess","sys"],"kinds":["run","slice","milestone","e2e","e2e-area","state","verify","attempt"],"rows":8}
```

## TC-contract-1 (VS-1): Foreign branches give null (examples)

- Given: main under the default; feature/PROJ-1-foo under feature/PROJ-1-{name}; sdlc/feature-x; empty, short and overlapping prefix/suffix branches
- When: parse is called
- Then: every call returns None
- Expected: every call returns None
- Actual: every call returns None
- Result: pass
- Spec source: R-021 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:143`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
examples: 10 examples, all null; see test source
```

## TC-contract-2 (VS-1): Property: a branch missing the prefix or the suffix, or shorter than both, gives null

- Given: 1500 generated format and branch pairs, 457 of them foreign by the reference model
- When: parse is called
- Then: null for every foreign pair, no exception
- Expected: null for every foreign pair, no exception
- Actual: null for every foreign pair, no exception
- Result: pass
- Spec source: R-021 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:160`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
foreign-null: property-run foreign-null: seed=3739127874 runs=1500 foreignCases=457 violations=0
```

## TC-contract-3 (VS-2): A branch that passes prefix and suffix but matches no row gives null

- Given: sdlc/, sdlc/run-, sdlc/run-x, sdlc/M-, sdlc/state-<13 or 15 digits>, T-001-v0-X-0, T-001-attempt-, suffix format {name}-wip with S-001 and S-001-wip
- When: parse is called
- Then: null for the 16 non-matching tails; S-001-wip gives slice S-001
- Expected: null for the 16 non-matching tails; S-001-wip gives slice S-001
- Actual: null for the 16 non-matching tails; S-001-wip gives slice S-001
- Result: pass
- Spec source: R-021 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:186`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
examples: all null except S-001-wip (slice)
```

## TC-contract-4 (VS-3): One branch per row 1 to 8 and overlap precedence (examples)

- Given: 20 tails: one per row, S-fix-M-1-2, M-1-e2e-a-b, M-1-v0-api-0, and tails matching two rows
- When: parse is called
- Then: the first matching row wins: S-001-attempt-3 is attempt, S-001-v0-x-0-attempt-4 is verify (row 6 before 7), M-1-e2e-v0-x-0 is e2e-area
- Expected: the first matching row wins: S-001-attempt-3 is attempt, S-001-v0-x-0-attempt-4 is verify (row 6 before 7), M-1-e2e-v0-x-0 is e2e-area
- Actual: the first matching row wins: S-001-attempt-3 is attempt, S-001-v0-x-0-attempt-4 is verify (row 6 before 7), M-1-e2e-v0-x-0 is e2e-area
- Result: pass
- Spec source: R-022 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:212`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
examples: 20 cases pass
```

## TC-contract-5 (VS-3): Property: classification equals a reference table written from the spec (plain format)

- Given: 1500 generated plain-format branches, tails drawn from every row and from noise
- When: parse and the JS reference model run
- Then: results equal, including null
- Expected: results equal, including null
- Actual: results equal, including null
- Result: pass
- Spec source: R-022 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:245`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
classification-plain: property-run classification-plain: seed=3739127874 runs=1500 violations=0 nonNull=410
```

## TC-contract-6 (VS-4): Case-insensitive matching applies only under {name:lower} (examples)

- Given: feature/PROJ-1-s-001, m-1-e2e-api, run-2, mixed-case prefix and suffix under both formats
- When: parse is called
- Then: lower formats classify; plain formats give null for upper-case-needed tails; prefix and suffix compare without case only under lower
- Expected: lower formats classify; plain formats give null for upper-case-needed tails; prefix and suffix compare without case only under lower
- Actual: lower formats classify; plain formats give null for upper-case-needed tails; prefix and suffix compare without case only under lower
- Result: pass
- Spec source: R-022 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:249`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
examples: 13 cases pass
```

## TC-contract-7 (VS-4): Property: lower-format classification equals the reference table

- Given: 1500 branches under {name:lower} with random case flips in tail, prefix and suffix
- When: parse and the reference model run
- Then: results equal
- Expected: results equal
- Actual: results equal
- Result: pass
- Spec source: R-022 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:273`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
classification-lower: property-run classification-lower: seed=3739127874 runs=1500 violations=0 nonNull=612
```

## TC-contract-8 (VS-3): Property: mixed formats equal the reference table

- Given: 1500 branches under random plain or lower formats
- When: parse and the reference model run
- Then: results equal
- Expected: results equal
- Actual: results equal
- Result: pass
- Spec source: R-022 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:277`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
classification-mixed: property-run classification-mixed: seed=3739127874 runs=1500 violations=0 nonNull=508
```

## TC-contract-9 (VS-5): The result holds exactly the parts that apply; n, round and part are integers (examples)

- Given: run, state, verify, e2e-area, e2e, milestone, slice and attempt branches, with and without ids
- When: parse is called
- Then: key set equals kind, tail, known plus the row parts; n, round, part are ints
- Expected: key set equals kind, tail, known plus the row parts; n, round, part are ints
- Actual: key set equals kind, tail, known plus the row parts; n, round, part are ints
- Result: pass
- Spec source: R-023 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:281`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
examples: 8 kinds, 2 passes
```

## TC-contract-10 (VS-5): Property: key set per kind, integer types, tail is a slice of the branch

- Given: 1500 generated cases
- When: parse is called
- Then: no key outside the table; ints are ints; known is null or boolean
- Expected: no key outside the table; ints are ints; known is null or boolean
- Actual: no key outside the table; ints are ints; known is null or boolean
- Result: pass
- Spec source: R-023 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:305`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
result-shape: property-run result-shape: seed=3739127874 runs=1500 violations=0
```

## TC-contract-11 (VS-6): ids resolve the ledger spelling and set known (examples)

- Given: feature/proj-1-s-001 with [S-001]; absent id; no ids; run and state with ids; duplicate ids differing in case; milestone and verify ids; exact match under plain format
- When: parse is called
- Then: id takes ledger spelling; known true or false; null for run, state and no ids; first duplicate wins
- Expected: id takes ledger spelling; known true or false; null for run, state and no ids; first duplicate wins
- Actual: id takes ledger spelling; known true or false; null for run, state and no ids; first duplicate wins
- Result: pass
- Spec source: R-024 acceptance; R-069 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:333`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
examples: all assertions pass
```

## TC-contract-12 (VS-6): Property: ids resolution equals the reference model

- Given: 1500 generated cases with 0 to 4 ids in random case
- When: parse and the reference model run
- Then: results equal
- Expected: results equal
- Actual: results equal
- Result: pass
- Spec source: R-024 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:358`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
ids-resolution: property-run ids-resolution: seed=3739127874 runs=1500 violations=0 nonNull=492
```

## TC-contract-13 (VS-6): Iterator, tuple, generator, set and dict keys work as ids; the caller list is not mutated; results are deterministic and fresh

- Given: python3 -I script that imports branches by path
- When: parse is called with each iterable
- Then: known true for each; list unchanged; two calls equal; mutating a result does not affect the next call
- Expected: known true for each; list unchanged; two calls equal; mutating a result does not affect the next call
- Actual: known true for each; list unchanged; two calls equal; mutating a result does not affect the next call
- Result: pass
- Spec source: R-024 quote (an iterable of ledger ids)
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:366`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
python run: tuple, iter, gen, set, frozenset, dict_keys all give S-001/true
```

## TC-contract-14 (VS-1): Surface and consumer view

- Given: branches.py imported as a consumer does (sys.path to the script directory)
- When: the module is listed
- Then: parse(fmt, branch, ids=None) is exported; PARSE_ROWS holds 8 rows; imports are the standard library only
- Expected: parse(fmt, branch, ids=None) is exported; PARSE_ROWS holds 8 rows; imports are the standard library only
- Actual: parse(fmt, branch, ids=None) is exported; PARSE_ROWS holds 8 rows; imports are the standard library only
- Result: pass
- Spec source: R-021 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:411`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

```
surface listing: {"public":["Fail","JsonArgumentParser","build_parser","cmd_list","cmd_name","cmd_parse","cmd_preflight","load_format","load_git_modes","main","name","parse","split","tail","validate_format"],"sigs":{"build_parser":"()","cmd_list":"(ns)","cmd_name":"(ns)","cmd_parse":"(ns)","cmd_preflight":"(ns)","load_format":"(repo)","load_git_modes":"(path='/private/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-007-v0-contract-0/skills/sdlc/git-modes.json')","main":"(argv=None)","name":"(fmt, kind, **parts)","parse":"(fmt, branch, ids=None)","split":"(fmt)","tail":"(kind, **parts)","validate_format":"(fmt)"},"modules":["argparse","json","os","re","subprocess","sys"],"kinds":["run","slice","milestone","e2e","e2e-area","state","verify","attempt"],"rows":8}
```

## Attacks

None. The security profile covers hostile input (VS-7).

## Seeds

- spec text silent on case of prefix and suffix under lower: The spec compiles only the row regexes with re.IGNORECASE under {name:lower}. The code also compares prefix and suffix without case under lower (FEATURE/proj-1-RUN-2 parses). The plan notes say this is intended. Tests TC-contract-6 and 7 pin it. Consider a spec sentence. (skills/sdlc/branches.py)
- row 6 captures attempt-like tails as verify: S-001-v0-x-0-attempt-4 parses as verify with profile x-0-attempt, part 4, because row 6 comes before row 7. This follows the table order. A real verify branch never ends in attempt-N, so no live name is affected. (skills/sdlc/branches.py)
