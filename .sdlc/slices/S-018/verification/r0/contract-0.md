# Verification: S-018, profile contract, round 0

Commit: 460d3b3. Verdict: pass (11 of 11 cases).

Environment: node test runner, python3 branches.py, scratch git repos via cli-runner

Test file: `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`

Command: `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test /Users/omar.ragab/projects/sdlc/.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`

## TC-contract-1 (VS-1, R-045): Commands line holds the flag after --commit-format, bullet follows the commit bullet

- Expected: Flag and bullet in the required order; bullet names {name}, sdlc/{name}, config.json
- Actual: As expected
- Result: pass
- Spec source: R-045 acceptance

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-2 (VS-1, R-045): Mutated SKILL.md with the flag missing or misplaced fails the reference model

- Expected: Model rejects 3 mutations
- Actual: As expected
- Result: pass
- Spec source: R-045 acceptance

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-3 (VS-2, R-046, R-097): Branch format bullet sits after Git mode and before the STOP removal; old bullet, branch_name_regex, push_rule gone

- Expected: Order and absence hold
- Actual: As expected
- Result: pass
- Spec source: R-046 acceptance

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-4 (VS-2, R-046): The preflight and parse commands from the text run against branches.py in direct, pr, mr and stack

- Expected: Exit 0, verdict has ok, format, derived, samples, notes; parse prints a kind
- Actual: As expected
- Result: pass
- Spec source: R-046 quote

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-5 (VS-2, R-046): Preflight with an invalid format returns ok false with error, exit 2

- Expected: ok false is observed; samples, notes, suggestion are absent from that verdict
- Actual: ok false, error string, exit 2; no samples, notes or suggestion keys
- Result: pass
- Spec source: R-046 acceptance

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-6 (VS-3, R-097): Resume takes branchFormat from config.json without the flag; derived format is reported

- Expected: Text holds both statements
- Actual: As expected
- Result: pass
- Spec source: R-097 acceptance

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-7 (VS-4, R-048): Mismatch bullet follows the Branch format bullet, reports both and ends, run keeps its names

- Expected: Text holds all three
- Actual: As expected
- Result: pass
- Spec source: R-048 quote

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-8 (VS-5, R-049): Launch args hold branchFormat between commitFormat and maxIterations; sentence says value is $FMT, always passed

- Expected: Order and sentence hold
- Actual: As expected
- Result: pass
- Spec source: R-049 quote

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-9 (VS-6, R-046): Against main, exactly 4 lines removed and 6 added, all the expected ones

- Expected: No other Pre-flight text lost
- Actual: As expected
- Result: pass
- Spec source: plan.md Steps

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

## TC-contract-10 (VS-6, R-046): Property: 1500 seeded single-line deletions and swaps; deleting any required line is detected, untouched changes keep the model green

- Expected: seed=20261010 runs=1500 detected=101 harmless=1317
- Actual: As expected
- Result: pass
- Spec source: R-045,R-046,R-048,R-049 acceptance

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

```
seed=20261010 runs=1500 detected=101 harmless=1317 result=pass
```

## TC-contract-11 (VS-6, R-046): Existing prompts, bootstrap, hub and branches suites stay green

- Expected: 266 tests, 266 pass
- Actual: As expected
- Result: pass
- Spec source: plan.md Tests regression

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt
```

```
.sdlc/slices/S-018/verification/r0/logs/contract-0-suites.txt
```

## Attacks

None.

## Seeds

- preflight invalid-format verdict lacks samples, notes and suggestion: branches.py preflight with a format that lacks one {name} prints {ok:false,error} and exits 2. The Branch format bullet tells the driver to print samples, notes and suggestion when ok is false. The driver has no instruction for the error key.
- Branch format bullet adds a sentence to the spec text: The plan says to use the spec section 5 text word for word. The bullet adds 'On a resume, the config.json branchFormat gives the same value without --branch-format.' and ends 'the run branch' where R-046 quote is the same. The addition is consistent with R-097.
- Launch text states the arg as shorthand: R-049 quote shows branchFormat: "$FMT". The args object lists the bare name branchFormat and a sentence gives the value. The shape stays valid.
