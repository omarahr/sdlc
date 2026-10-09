# Verify contract: S-006, round 0

Slice S-006 · profile contract · round 0 · commit ee0312c · verdict: verified (6 of 6 cases pass)

Environment: Node v24.19.0, Python 3.14.7, git 2.50.1; scratch worktree of sdlc/S-006; no network

## TC-contract-1 (VS-1): name lowercases only the tail under {name:lower}

- Given: formats feature/PROJ-1-{name:lower}, Feat/PROJ-{name:lower}-X, FEAT/{name:lower}, mixed-case and unicode parts
- When: name and tail are called; 3000 generated cases are compared with a reference model written from the spec
- Then: prefix and suffix keep their case; the middle is the lowercased tail; {name} keeps the tail case
- Expected: feature/PROJ-1-s-001; Feat/PROJ-s-001-X; FEAT/m-1-e2e-api
- Actual: all equal; 0 violations in 3000 runs
- Result: pass
- Spec source: R-011 acceptance
- Test: `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:37`
- Command: `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`

Evidence (property-run): name vs reference model

```
property name-vs-model: seed=20261010 runs=3000 violations=0
checks: equals model, deterministic, parts not mutated, no stdout, affixes unchanged, lower flag, middle == tail (lowercased when asked)
```

Evidence (log): full run

See `.sdlc/slices/S-006/verification/r0/logs/contract-0-run.txt`.

## TC-contract-2 (VS-1): Spec examples run verbatim

- Given: the R-011 acceptance example and the table samples
- When: name is called with each
- Then: the branch equals the spec string
- Expected: 7 spec strings
- Actual: 7 equal
- Result: pass
- Spec source: R-011 acceptance; spec kind table
- Test: `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:48`
- Command: `same as TC-contract-1`

Evidence (property-run): examples

```
feature/PROJ-1-s-001, feature/PROJ-1-S-001, Feat/PROJ-s-001-X, FEAT/m-1-e2e-api, sdlc/M-1-e2e-api, sdlc/M-1-e2e, sdlc/S-001-v0-http-api-0 all match
```

## TC-contract-3 (VS-2): Every kind under three formats builds a valid branch that split reverses

- Given: 8 kinds x 3 formats with the spec sample parts, including area api-v2, state ts and verify round 0 part 0
- When: name builds the branch, split strips the prefix and suffix, git check-ref-format --branch runs
- Then: the middle equals the tail (lowercased when asked); git accepts every branch
- Expected: 24 valid branches
- Actual: 24 valid, no placeholder left
- Result: pass
- Spec source: R-068 quote
- Test: `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:69`
- Command: `same as TC-contract-1`

Evidence (log): 24 branches

See `.sdlc/slices/S-006/verification/r0/logs/contract-0-run.txt`.

Evidence (property-run): generated round trip

```
3000 generated cases over 8 kinds, 6 prefixes, 5 suffixes, unicode ids (İ, ß, ǅ, Σ, CJK, emoji): 0 violations, seed 20261010
```

## TC-contract-4 (VS-4): Scanner semantics: sites, windows, comments, limits

- Given: strings with pushes, pr create, wrapped pushes, comments, a variable-built branch
- When: the scanner function is extracted from branches.test.mjs and run
- Then: it reports e2e-area pushes within the 4-line window, skips comments, finds a site in an empty-violation file
- Expected: planted push 1 violation; plain e2e 0; comment 0
- Actual: as expected; limits confirmed: variable-built branch, list-form pr create and e2e-area more than 3 lines after the push line pass unseen
- Result: pass
- Spec source: R-120 acceptance
- Test: `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:95`
- Command: `same as TC-contract-1`

Evidence (log): scan sites

See `.sdlc/slices/S-006/verification/r0/logs/contract-0-run.txt`.

## TC-contract-5 (VS-5): Mutation: planted e2e-area push in a scratch state-write.py fails T-R-120a; dropped lower fails T-R-011a and T-R-068a

- Given: a scratch copy of skills with one planted defect each
- When: node --test runs the real tests in the copy
- Then: each run exits non-zero; the clean copy exits 0
- Expected: 4 mutations caught
- Actual: e2e-area push exit 1; drop lower exit 1; lower whole branch exit 1; lower prefix exit 1; clean exit 0
- Result: pass
- Spec source: R-120 acceptance; R-011 acceptance
- Test: `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:112`
- Command: `same as TC-contract-1`

Evidence (log): mutations

```
mutation e2e-area push in state-write.py: exit 1
mutation drop lower: exit 1
mutation lower whole branch: exit 1
mutation lower prefix only: exit 1
```

## TC-contract-6 (VS-2): Surface and dependencies

- Given: branches.py loaded by path
- When: the public functions and imports are listed
- Then: name, tail, split keep their shape; only stdlib imports
- Expected: no extra dependency
- Actual: imports argparse,json,os,re,subprocess,sys,datetime
- Result: pass
- Spec source: R-068 acceptance
- Test: `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:140`
- Command: `same as TC-contract-1`

Evidence (type-check): surface

See `.sdlc/slices/S-006/verification/r0/logs/contract-0-surface.txt`.

## Attacks

None.

## Seeds

- R-120 scan misses list-form gh pr create: PUSH_SITE matches the text 'pr create'. A call such as run(repo, 'gh', 'pr', 'create', '--head', x) has no such text, so it is not a site. Match the quoted 'create' after 'pr' too. (`skills/sdlc/test/branches.test.mjs`)

- R-120 scan reads only the kind name and six files: A variable-built branch, an e2e-area name more than 3 lines after the push line, and the prompts under skills/sdlc/prompts are not scanned. S-009 and S-021 to S-024 must tighten it to the parsed kind. (`skills/sdlc/test/branches.test.mjs`)
