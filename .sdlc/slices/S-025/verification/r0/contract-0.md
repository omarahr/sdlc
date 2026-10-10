# Verification: S-025 contract part 0, round 0

Commit: ddbea4a. Verdict: verified (9 of 9 cases pass).

Environment: Node 24, python3, scratch git repos from cli-runner; worktree of sdlc/S-025

Command: `VERIFY_REPO=<worktree of sdlc/S-025> TESTKIT_SEED=20260101 node --test .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs`

Log: `.sdlc/slices/S-025/verification/r0/logs/contract-0-run.txt`

## TC-contract-1 (VS-1): Table holds exactly the eight placeholders once, in spec order

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: the table rows are run, slice, milestone, e2e, e2e area, state, attempt, verify branch
- Result: pass
- Spec source: R-062 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21`

```
8 rows: <run branch> <slice branch> <milestone branch> <e2e branch> <e2e area branch> <state branch> <attempt branch> <verify branch>; one Branch names bullet
```

## TC-contract-2 (VS-1): Every name command runs and prints the formatted name (default, prefix and lower formats)

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: exit 0 and expected branch for the 6 name rows
- Result: pass
- Spec source: R-062 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48`

```
6 commands x 3 formats; all exit 0; names equal prefix+tail+suffix; state name matches state-<14 digits>
```

## TC-contract-3 (VS-1): Argument names in the table are accepted by branches.py

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: --kind --id --area --n accepted
- Result: pass
- Spec source: R-062 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41`

```
used flags subset of branches.py name options
```

## TC-contract-4 (VS-2): Slice row is verbatim and prints the formatted name

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: row cell equals `branches.py name --kind slice --id <sliceId>`; custom format feature/{name} gives feature/S-007
- Result: pass
- Spec source: R-110 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26`

```
`branches.py name --kind slice --id <sliceId>`
```

```
property=name matches reference model and parse round-trips kind; seed=20260101 runs=1000 per kind x 6 kinds x 5 formats; violations=0
```

## TC-contract-5 (VS-3): Run row is verbatim; list --kind run orders numerically, last is newest, empty when none

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: run-2, run-9, run-10 in order; none gives []
- Result: pass
- Spec source: R-089 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69`

```
branches: sdlc/run-2, sdlc/run-9, sdlc/run-10; no run branches -> []
```

## TC-contract-6 (VS-4): Verify row names the branch input; no --kind verify text in _common.md; name --kind verify with no parts exits non-zero

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: no `--kind verify` string in _common.md
- Result: pass
- Spec source: R-090 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80`

```
no match for --kind verify; name --kind verify -> exit 2
```

## TC-contract-7 (VS-6): ste-check.py exits 0; no old line changed; 12 lines added; Long commands bullet intact

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: ste-check exit 0, 0 removed lines, 12 added
- Result: pass
- Spec source: R-062 (STE rule in _common.md)
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165`

```
ste-check exit=0; removed=0; added=12
```

## TC-contract-8 (VS-1): Property: name equals reference model for 6 kinds, parse returns the same kind

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: 0 violations in 1000 runs per kind
- Result: pass
- Spec source: R-062 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131`

```
property=name matches reference model and parse round-trips kind; seed=20260101 runs=1000 per kind x 6 kinds x 5 formats; violations=0
```

## TC-contract-9 (VS-1): Determinism and no tree mutation

- Given: _common.md on sdlc/S-025 at ddbea4a
- When: the test parses the Branch names bullet and runs branches.py
- Then: identical stdout on repeat; treeUnchanged
- Result: pass
- Spec source: R-062 acceptance
- Test: `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156`

```
same output twice; tree unchanged
```

## Attacks

The 95 hostile branch names (flag-like, traversal, control, unicode, injection, format, oversized) given to `branches.py parse` all exit 0 or 2, never raise a traceback, and print `kind: null` unless the name starts with `sdlc/`.

## Seeds

None.