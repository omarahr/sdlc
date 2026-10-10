# Verification: S-027b, contract, round 0, part 0

Commit: f346b0b
Verdict: pass (9 of 9 cases)

## Environment
node 24, python3, git; scratch repos in the OS temp dir; the worktree of sdlc/S-027b at f346b0b

## Surface
Consumer view: the prompt text integrator.md Clean up steps 0 to 4, and the JSON of 'branches.py list --kind attempt' ({ok, command, format, kind, branches:[{branch, kind, tail, id, n, known}]}), sorted by n. No export differs from the plan.

## TC-contract-1 (VS-1): Default format: list gives both attempt branches; local delete leaves the rest
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: list gives sdlc/S-001-attempt-1, -attempt-2; after git branch -D, main, sdlc/S-001, sdlc/S-001-v0, sdlc/S-002-attempt-1 remain
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:35`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-2 (VS-2): Lowercase format: id is s-001, case-blind filter keeps it, no collision with s-0010 or s-001a
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: S-001 gives 2 branches in order; S-027b and S-0010 give one each; a case-sensitive filter on S-001 finds none
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:43`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-3 (VS-2): Mixed-case {name} format and S-027b suffix id
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: S-027b matches team/S-027b-attempt-1 and -2 only, not S-027
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:55`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-4 (VS-2): Attempt numbers 1 to 12 come back in numeric order
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: order 1..12
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:60`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-5 (VS-2): Property: list plus case-blind filter equals a reference model built from the spec text
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: 1000 draws over 5 formats and 7 ids, all equal the model
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:66`

```
property=list+case-blind filter equals model; seed=20261010; runs=1000; result=pass; shrunk counterexample: none
```

## TC-contract-6 (VS-5): Parent id list under a custom format keeps child attempts
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: S-013 gives only s-013 attempts; S-013a gives only s-013a attempts
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:89`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-7 (VS-5): Parent walk text keeps splitInto, stop rule, rejected rule and never-delete sentence
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: all phrases present
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:96`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-8 (VS-6): Clean up holds no literal attempt pattern; step 1 points to step 2; mode list and remote-missing sentence present
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: no sdlc/<id>-attempt, no -attempt-*; sdlc/<id>-v* kept in step 1
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:106`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## TC-contract-9 (VS-6): ste-check.py passes on integrator.md
- Given: scratch git repo built by the test
- When: the test runs the exact command text from integrator.md Clean up step 2
- Then: exit 0
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:119`

```
see .sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt
```

## Attacks
None for this profile.

## Seeds
- list --kind attempt returns attempt branches whose id is not a slice id: List shows ids such as s-001a and s-0010. The prompt's id-equals filter handles it. Verified with S-001 against S-0010 and S-001a. No action needed.
- Format {name:upper} is not a valid branch format: branches.py accepts only {name} and {name:lower}. A prompt reader may expect {name:upper}. No change needed.
