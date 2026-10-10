# verify-contract S-034 round 1

Slice: S-034. Profile: contract. Round: 1. Commit: d08bf73. Verdict: pass (9 of 9 cases).

Environment: node 24, python3 -I via property toolkit, scratch git repos via cli-runner; no network; TESTKIT_SEED=134

Surface: the Branch format bullet in `skills/sdlc/SKILL.md` (one line). Product text under `skills/` did not change since round 0; only state files changed.

Command: `VERIFY_REPO=<worktree of sdlc/S-034> TESTKIT_SEED=134 node --test .sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs`

Log: `.sdlc/slices/S-034/verification/r1/logs/contract-0.txt`

## TC-contract-1 (VS-1): Sources are ordered flag, config.json when the file exists, else none; with none preflight gets no --format
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: Index order holds and the sentence 'With none, give preflight no `--format` argument.' follows 'else none.'
- Expected: Index order holds and the sentence 'With none, give preflight no `--format` argument.' follows 'else none.'
- Actual: Index order holds and the sentence 'With none, give preflight no `--format` argument.' follows 'else none.'
- Result: pass
- Spec source: R-128 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:17`

## TC-contract-2 (VS-1): CLI: preflight without --format and without config uses sdlc/{name}, given=false; with config uses its branchFormat
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: format sdlc/{name} then feature/{name}
- Expected: format sdlc/{name} then feature/{name}
- Actual: format sdlc/{name} then feature/{name}
- Result: pass
- Spec source: R-128 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:52`

## TC-contract-3 (VS-2): --format is tied to 'when you have one' and appears once; CLI --format overrides config
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: one conditional --format clause
- Expected: one conditional --format clause
- Actual: one conditional --format clause
- Result: pass
- Spec source: R-129 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:25`

## TC-contract-4 (VS-3): --branch only in mr mode only; no other mode named in the command clause
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: phrase 'in `mr` mode only. No other mode gets `--branch`.' present
- Expected: phrase 'in `mr` mode only. No other mode gets `--branch`.' present
- Actual: phrase 'in `mr` mode only. No other mode gets `--branch`.' present
- Result: pass
- Spec source: R-129 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:29`

## TC-contract-5 (VS-3): CLI: mr with --branch checks a working sample; direct has none
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: working sample only in mr
- Expected: working sample only in mr
- Actual: working sample only in mr
- Result: pass
- Spec source: R-129 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:67`

## TC-contract-6 (VS-4): Rename ask applies on a first run only; the first-run-only sentence is kept
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: phrases present
- Expected: phrases present
- Actual: phrases present
- Result: pass
- Spec source: R-130 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:34`

## TC-contract-7 (VS-4): CLI: parse prints a kind for a loop branch and none for a user branch
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: kind slice vs none
- Expected: kind slice vs none
- Actual: kind slice vs none
- Result: pass
- Spec source: R-130 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:76`

## TC-contract-8 (VS-5): Bullet ends with the resume sentence of at most 20 words; every new sentence is under 20 words
- Given: SKILL.md on sdlc/S-034 at 7bb523b
- When: the test reads the Branch format bullet and runs the documented command lines
- Then: ends with 'On a resume, run no `parse` check and ask for no rename.'
- Expected: ends with 'On a resume, run no `parse` check and ask for no rename.'
- Actual: ends with 'On a resume, run no `parse` check and ask for no rename.'
- Result: pass
- Spec source: R-130 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:38`

## TC-contract-9 (VS-6): load_format returns sdlc/{name} without branchFormat
- Given: config shapes without branchFormat
- When: checkLoadFormat runs 1000 random config shapes; branches.py name runs on a config without branchFormat
- Then: default holds
- Expected: sdlc/{name}
- Actual: sdlc/S-001 from name; 0 violations in 1000 runs; env-detector.md and the bullet name the default
- Result: pass
- Spec source: R-002 acceptance
- Test: `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:85`

## Property run
```
property load_format: seed=134 runs=1000 violations=0
```

## Attacks
None.

## Seeds
None.