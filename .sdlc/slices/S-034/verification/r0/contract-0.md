# Verification: contract, part 0

- Slice: S-034
- Round: 0
- Commit: 7bb523b
- Verdict: pass (11 of 11 tests, 9 cases)

## Environment
node 24.19, python3, scratch git repos via cli-runner; no network

## Surface
The slice changes one prose bullet in `skills/sdlc/SKILL.md`. No export changes.

## TC-contract-1 (VS-1): Sources are ordered flag, config.json when the file exists, else none; with none preflight gets no --format

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: Index order holds and the sentence 'With none, give preflight no `--format` argument.' follows 'else none.'
- Expected: Index order holds and the sentence 'With none, give preflight no `--format` argument.' follows 'else none.'
- Actual: Index order holds and the sentence 'With none, give preflight no `--format` argument.' follows 'else none.'
- Result: pass
- Source: R-128 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:17`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-2 (VS-1): CLI: preflight without --format and without config uses sdlc/{name}, given=false; with config uses its branchFormat

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: format sdlc/{name} then feature/{name}
- Expected: format sdlc/{name} then feature/{name}
- Actual: format sdlc/{name} then feature/{name}
- Result: pass
- Source: R-128 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:52`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-3 (VS-2): --format is tied to 'when you have one' and appears once; CLI --format overrides config

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: one conditional --format clause
- Expected: one conditional --format clause
- Actual: one conditional --format clause
- Result: pass
- Source: R-129 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:25`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-4 (VS-3): --branch only in mr mode only; no other mode named in the command clause

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: phrase 'in `mr` mode only. No other mode gets `--branch`.' present
- Expected: phrase 'in `mr` mode only. No other mode gets `--branch`.' present
- Actual: phrase 'in `mr` mode only. No other mode gets `--branch`.' present
- Result: pass
- Source: R-129 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:29`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-5 (VS-3): CLI: mr with --branch checks a working sample; direct has none

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: working sample only in mr
- Expected: working sample only in mr
- Actual: working sample only in mr
- Result: pass
- Source: R-129 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:67`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-6 (VS-4): Rename ask applies on a first run only; the first-run-only sentence is kept

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: phrases present
- Expected: phrases present
- Actual: phrases present
- Result: pass
- Source: R-130 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:34`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-7 (VS-4): CLI: parse prints a kind for a loop branch and none for a user branch

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: kind slice vs none
- Expected: kind slice vs none
- Actual: kind slice vs none
- Result: pass
- Source: R-130 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:76`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-8 (VS-5): Bullet ends with the resume sentence of at most 20 words; every new sentence is under 20 words

- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: ends with 'On a resume, run no `parse` check and ask for no rename.'
- Expected: ends with 'On a resume, run no `parse` check and ask for no rename.'
- Actual: ends with 'On a resume, run no `parse` check and ask for no rename.'
- Result: pass
- Source: R-130 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:38`

Evidence: `.sdlc/slices/S-034/verification/r0/logs/contract-0.txt`

## TC-contract-9 (VS-6): load_format returns sdlc/{name} without branchFormat

- Given: config shapes without branchFormat
- When: checkLoadFormat runs 1000 random config shapes; branches.py name runs on a config without branchFormat
- Then: default holds
- Expected: sdlc/{name}
- Actual: sdlc/S-001 from name; 0 violations in 1000 runs; env-detector.md and the bullet name the default
- Result: pass
- Source: R-002 acceptance
- Test: `.sdlc/slices/S-034/verification/r0/tests/contract-0/skill-branch-format.verify-contract.test.mjs:85`

Evidence: `property load_format: seed=34 runs=1000 violations=0`

## Attacks
None.

## Seeds
None.