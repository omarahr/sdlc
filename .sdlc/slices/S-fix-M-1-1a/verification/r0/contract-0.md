# verify-contract part 0

- Slice: S-fix-M-1-1a
- Profile: contract
- Round: 0
- Commit: 798e216
- Verdict: verified (8 of 8 cases pass)

Environment: Node test runner, python3 -I via testkit property.mjs/pycall.py, cli-runner scratch repo

## Surface
`parse(fmt, branch, ids=None)` keeps its signature. The diff adds `ASCII_LOWER_TABLE` and `_ascii_lower` at module level. No export is removed. `name` and `active_branch` are unchanged.

## TC-contract-1 (VS-1): Look-alike tails give None in both name modes

- Given: Formats feature/p-1-{name} and {name:lower}; tails with U+212A, U+017F, U+0661, U+0663 in slice, verify, attempt, run, milestone, e2e, state rows
- When: parse each branch
- Then: None for every look-alike tail; equal to the reference model
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:67`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```
Evidence (property-run): look-alike calls
```
60 calls (15 tails x 4 formats), 0 non-null results
```

## TC-contract-2 (VS-1): Named tails S-00K, s-00K-v0-cli-0, s-00K-attempt-1, S-001-v0663-cli-0, run-0663, s-001 long s

- Given: Both formats
- When: parse
- Then: None
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:79`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```

## TC-contract-3 (VS-2): Lower mode ignores look-alike prefix, suffix and ledger ids

- Given: Format with K sign prefix; format with long s suffix; ids holding K sign or long s
- When: parse with and without ids
- Then: Look-alike affix gives None; look-alike id gives known false; real id known true with ledger casing
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:90`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```

## TC-contract-4 (VS-3): Valid ASCII tails keep kind and fields

- Given: S-fix-M-1-2, M-1-e2e-api, M-1-e2e-a-b, S-001-v0-http-api-0, attempt, run, milestone, e2e, state; mixed case in lower mode
- When: parse in both modes
- Then: Same kinds and fields as before the change
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:109`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```

## TC-contract-5 (VS-4): Non-ASCII area stays e2e-area

- Given: M-1-e2e-é and M-1-e2e-日本-😀
- When: parse in both modes
- Then: kind e2e-area, area é, id M-1
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:130`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```

## TC-contract-6 (VS-1): Property: parse equals ASCII reference model

- Given: Generated tails from an alphabet with look-alikes, ASCII, accents and emoji; 4 formats; optional ids
- When: 3000 parse calls
- Then: No mismatch with a model written from the spec text
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:142`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (property-run): parse versus ASCII reference model
```
property=parse equals reference model; seed=20261010; runs=3000 (886 non-null); mismatches=0. Second run seed=7, runs=3000, mismatches=0.
```
Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```

## TC-contract-7 (VS-1): Determinism and no input mutation

- Given: Same call three times with an ids list
- When: parse x3
- Then: Identical results
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:169`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (log): test run output
```
.sdlc/slices/S-fix-M-1-1a/verification/r0/logs/contract-0-run.txt
```

## TC-contract-8 (VS-1): Consumer view: CLI parse matches parse()

- Given: Scratch repo with branchFormat feature/p-1-{name:lower}
- When: branches.py parse for look-alike and valid branches
- Then: Look-alikes: exit 0, kind null. Valid and non-ASCII area: same kind as parse()
- Actual: Matches expected. Test passed.
- Result: pass
- Spec source: R-022, R-024 acceptance; ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c
- Test: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:176`
- Command: `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

Evidence (transcript): CLI output
```
s-00K -> exit 0 kind null
s-001 long s -> exit 0 kind null
run-0663 -> exit 0 kind null
m-1-e2e-é -> exit 0 kind e2e-area
s-fix-m-1-2 -> exit 0 kind slice
```

## Attacks
None.

## Seeds
- parse accepts a branch tail with a trailing newline: `$` in the PARSE_ROWS patterns matches before a final newline, so `feature/S-001\n` parses as a slice with id S-001. Same result on main before the change. No requirement names it. (skills/sdlc/branches.py)
- Module-level helper names added: `ASCII_LOWER_TABLE` and `_ascii_lower` are new names in branches.py. The plan names `_ascii_lower`. The table is a public-looking name; consider a leading underscore. (skills/sdlc/branches.py)
