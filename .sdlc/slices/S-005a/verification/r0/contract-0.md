# S-005a verify contract, part 0, round 0

- Slice: S-005a
- Profile: contract
- Round: 0
- Commit: de9cf46
- Verdict: pass (19 of 19 cases pass)

## Environment

Node v24.19.0, Python 3.14.7, git 2.50.1; branches.py loaded by path from a worktree of sdlc/S-005a; CLI via testkit cli-runner in scratch git repos

Command: `VERIFY_REPO=<worktree of sdlc/S-005a> VERIFY_LOG=.sdlc/slices/S-005a/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Run log: `.sdlc/slices/S-005a/verification/r0/logs/contract-0-run.txt`. Runner output: `.sdlc/slices/S-005a/verification/r0/logs/contract-0-run.txt.tap` (20 tests, 20 pass, 0 fail).

## TC-contract-1 (VS-3, R-009, R-010): The public surface exposes tail and name with verify and attempt kinds

- Given: branches.py loaded by path as a consumer
- When: List public names, signatures and imports
- Then: tail and name signatures hold, KINDS holds verify and attempt, imports are stdlib only
- Expected: As stated
- Actual: As stated
- Result: **pass**
- Spec source: R-009 quote, R-010 quote
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:86`

type-check: surface listing

```
tail(kind, **parts); name(fmt, kind, **parts); split(fmt); load_format(repo); validate_format(fmt); class Fail
KINDS=('run','slice','milestone','e2e','e2e-area','state','verify','attempt')
imports: argparse json os re subprocess sys (stdlib only)
```

## TC-contract-2 (VS-1, R-008): State name gives state- and 14 UTC digits under far time zones

- Given: TZ in Pacific/Kiritimati, America/Adak, Etc/GMT+12, Etc/GMT-14, Asia/Kathmandu, UTC; 4 formats
- When: Call name(fmt,'state') and tail('state')
- Then: Digits are in the UTC window between two clock reads
- Expected: 14 digits inside UTC window
- Actual: All zones: e.g. state-20261009075236 in window [20261009075236,20261009075236]
- Result: **pass**
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:118`

log: time zones

```
TZ=Pacific/Kiritimati tail=state-20261009075236 window=[20261009075236,20261009075236]
TZ=Etc/GMT+12 tail=state-20261009075236 window=[20261009075236,20261009075236]
```

## TC-contract-3 (VS-1, R-008): Property: the state name stays in the UTC window for any extra parts

- Given: Random formats and extra parts, TZ=Pacific/Kiritimati
- When: Call name(fmt,'state',...extra)
- Then: prefix+state-+14 digits in window+suffix
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:142`

property-run: state-utc-window

```
property=state-utc-window seed=3014625680 runs=2000 result=0 violations
```

## TC-contract-4 (VS-2, R-008): An explicit ts is used as given; empty and None generate one

- Given: ts='20261008101500', '' and None
- When: Call name and tail with ts
- Then: Explicit ts verbatim; empty and None give 14 UTC digits
- Expected: sdlc/state-20261008101500
- Actual: sdlc/state-20261008101500; feature/PROJ-1-state-20261008101500 under {name:lower}
- Result: **pass**
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:166`

log: explicit ts

```
name('sdlc/{name}','state',ts='20261008101500') -> sdlc/state-20261008101500
```

## TC-contract-5 (VS-2, R-008): Property: any 14-digit ts passes through unchanged

- Given: Random 14-digit ts and formats
- When: Call name(fmt,'state',ts)
- Then: prefix+state-+ts+suffix
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:184`

property-run: state-explicit-ts

```
property=state-explicit-ts seed=3014625733 runs=2000 result=0 violations
```

## TC-contract-6 (VS-2, R-008): Corner ts values never raise an unexpected exception

- Given: ts = 0, 1.5, True, list, traversal, newline, ESC, @{-1}, 300 chars, Arabic-Indic digits
- When: Call name('sdlc/{name}','state',ts)
- Then: No exception; values used as given
- Expected: Used as given
- Actual: All return; e.g. ts=0 -> sdlc/state-0, ts='../../x' -> sdlc/state-../../x
- Result: **pass**
- Spec source: R-008 acceptance (used as given)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:193`

log: ts corners

See `.sdlc/slices/S-005a/verification/r0/logs/contract-0-run.txt`.

## TC-contract-7 (VS-3, R-009): Spec example: verify round 0 part 0

- Given: id S-001, round 0, profile http-api, part 0; also S-fix-M-1-2 and S-013a
- When: Call name and tail
- Then: sdlc/S-001-v0-http-api-0
- Expected: sdlc/S-001-v0-http-api-0
- Actual: sdlc/S-001-v0-http-api-0, S-001-v0-http-api-0, sdlc/S-fix-M-1-2-v12-concurrency-7, sdlc/S-013a-v1-i18n-0
- Result: **pass**
- Spec source: R-009 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:203`

log: examples

```
name('sdlc/{name}','verify',id='S-001',round=0,profile='http-api',part=0) -> sdlc/S-001-v0-http-api-0
```

## TC-contract-8 (VS-3, R-009): Property: verify name equals the spec template, is deterministic and matches the loop builder

- Given: Random ids (split, fix), rounds and parts incl. 0, every catalog profile, 9 formats
- When: Call name twice and tail
- Then: Reference model from the spec row
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-009 quote
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:216`

property-run: verify-template

```
property=verify-template seed=3014625699 runs=2000 result=0 violations
```

## TC-contract-9 (VS-4, R-009): A missing, None or empty verify part raises Fail that names the part

- Given: Each of id, round, profile, part omitted, None or ''
- When: Call tail and name
- Then: Fail 'a verify branch name needs a non-empty <part>'
- Expected: Fail names the part
- Actual: Fail names id, round, profile, part
- Result: **pass**
- Spec source: R-009 quote (all four parts)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:235`

log: messages

```
a verify branch name needs a non-empty id | ... round | ... profile | ... part
```

## TC-contract-10 (VS-4, R-009): Property: dropping any subset of verify parts fails on the first missing part

- Given: Random subsets dropped by omit, None or ''
- When: Call tail('verify')
- Then: Fail on first missing part in order
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-009 quote
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:254`

property-run: verify-missing-part

```
property=verify-missing-part seed=3014625748 runs=2000 result=0 violations
```

## TC-contract-11 (VS-5, R-010): Spec example: attempt n=1, fix id, n=0, huge n, extra parts ignored

- Given: id S-001 / S-fix-M-1-2, n 0, 1, 3, 10**15
- When: Call name and tail
- Then: sdlc/S-001-attempt-1
- Expected: sdlc/S-001-attempt-1
- Actual: sdlc/S-001-attempt-1, S-001-attempt-1, sdlc/S-fix-M-1-2-attempt-3, sdlc/S-001-attempt-0, sdlc/S-001-attempt-1000000000000000
- Result: **pass**
- Spec source: R-010 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:279`

log: examples

```
tail('attempt',id='S-001',n=1) -> S-001-attempt-1
```

## TC-contract-12 (VS-5, R-010): Property: attempt name equals the spec template; extra parts never leak

- Given: Random ids, n, extra round/profile/part/area, 9 formats
- When: Call name and tail
- Then: Reference model from the spec row
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-010 quote
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:291`

property-run: attempt-template

```
property=attempt-template seed=3014625782 runs=2000 result=0 violations
```

## TC-contract-13 (VS-6, R-010): A missing, None or empty attempt part raises Fail that names the part

- Given: id or n omitted, None or ''
- When: Call tail and name
- Then: Fail 'a attempt branch name needs a non-empty <part>'
- Expected: Fail names the part
- Actual: As expected
- Result: **pass**
- Spec source: R-010 quote
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:308`

log: corners

```
n=-1 -> sdlc/S-001-attempt--1; n=False -> sdlc/S-001-attempt-False; n=1.0 -> sdlc/S-001-attempt-1
```

## TC-contract-14 (VS-7, R-009, R-010): A custom format wraps verify and attempt tails and lowercases only the tail

- Given: feature/PROJ-1-{name:lower}, x/{name}/y, ABC/{name:lower}/DEF
- When: Call name
- Then: feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1, suffix kept
- Expected: As expected
- Actual: As expected; ABC/s-fix-m-1-2-attempt-3/DEF
- Result: **pass**
- Spec source: R-009, R-010 quote; spec format rule
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:320`

log: formats

```
x/{name}/y verify -> x/S-001-v0-http-api-0/y
```

## TC-contract-15 (VS-7, R-009, R-010): Consumer view: --format wins over config.branchFormat

- Given: Scratch repo with branchFormat feature/PROJ-1-{name:lower}
- When: Run branches.py name with and without --format
- Then: Config form, then flag form; invalid format exits 2, one JSON line, no stderr, tree unchanged
- Expected: As expected
- Actual: config=feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1; flag=x/S-001-v0-http-api-0/y
- Result: **pass**
- Spec source: R-009, R-010 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:337`

transcript: cli

```
VS-7 cli: config=feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1 flag=x/S-001-v0-http-api-0/y invalid={"ok": false, "error": "the branch format 'x/{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
```

## TC-contract-16 (VS-2, R-008): Consumer view: the CLI refuses --ts with one JSON error

- Given: Scratch repo
- When: Run name --kind state --ts 20261008101500
- Then: Exit 2, one JSON line, no stderr, tree unchanged
- Expected: Exit 2
- Actual: exit=2 {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
- Result: **pass**
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:355`

transcript: --ts

```
exit=2 {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
```

## TC-contract-17 (VS-3, R-009, R-010): Consumer view: CLI output equals API name for sampled inputs

- Given: 120 sampled verify and attempt inputs
- When: Run the CLI and the API
- Then: Same branch, exit 0, no stderr
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-009, R-010 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:367`

property-run: cli-equals-api

```
property=cli-equals-api seed=3014625767 runs=120 result=0 violations (CLI-bound sample)
```

## TC-contract-18 (VS-3, R-009, R-010): Property: integer and string parts give the same tail

- Given: Random rounds, parts and n as int and as str
- When: Call tail for both
- Then: Same tail, equal to reference
- Expected: 0 violations
- Actual: 0 violations
- Result: **pass**
- Spec source: R-009, R-010 quote
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:387`

property-run: int-string-equal

```
property=int-string-equal seed=3014625560 runs=2000 result=0 violations
```

## TC-contract-19 (VS-4, R-009, R-010): Hostile profiles and ids through the API never raise; unsafe names recorded

- Given: 17 hostile values as profile and as attempt id
- When: Call name; run git check-ref-format on each result
- Then: No exception
- Expected: No exception; 26 of 34 names refused by check-ref-format (seed)
- Actual: No exception
- Result: **pass**
- Spec source: R-009, R-010 (no requirement covers unsafe values; seed)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:407`

log: hostile inputs

See `.sdlc/slices/S-005a/verification/r0/logs/contract-0-run.txt`.

## Attacks

None. The security profile covers attacks.

## Seeds

- **tail and name return ref names git refuses for hostile verify profiles and attempt ids** (`skills/sdlc/branches.py`): Through the Python API, profile or id values such as '../x', 'a b', 'a~1', 'a:b', 'a@{1}', ESC and TAB give names that git check-ref-format refuses (26 of 34 calls). name does not validate the full ref. No requirement in S-005a covers this. The CLI path may differ; see the cli and security profiles.
- **verify and attempt parts accept non-integer and negative values through the API** (`skills/sdlc/branches.py`): round=-1 gives S-001-v-1-..., round=False gives vFalse, round=1.5 gives v1.5, n=-1 gives attempt--1, n=False gives attempt-False. A later parse slice (R-068) cannot reverse these forms.
- **an explicit state ts is not checked for 14 digits** (`skills/sdlc/branches.py`): ts='../../x', 'a/b', '2026\n', True and lists are used as given. The spec says only that the value is used as given, so this is not a defect.
