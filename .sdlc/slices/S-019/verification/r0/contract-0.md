# S-019 verify-contract, round 0

Slice: S-019. Profile: contract. Part: 0. Round: 0. Commit: f22f644. Verdict: all 12 cases pass.

Environment: Node 24.19, Python 3 (-I via pycall), git; scratch repos from cli-runner; slice worktree at sdlc/S-019.

Surface: branches.py exports name, parse and list_kind through the module entry and the CLI. This slice adds no export.

## TC-contract-1 (VS-1): list and name give the next run branch for 0, 1 and 3 run branches

- Given: scratch repos with 0, 1, 3 run branches under five formats
- When: list --kind run, then name --kind run --n count+1, then parse
- Then: the list count equals the branches made; the new name parses as run with n=count+1; no tree change
- Result: pass
- Spec source: R-047 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:19

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-2 (VS-1): A run branch from another format is not counted

- Given: branches sdlc/run-1, sdlc/run-2, feature/PROJ-1-run-1
- When: list under three formats
- Then: each format lists only its own run branches; an unrelated format lists none
- Result: pass
- Spec source: R-047 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:42

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-3 (VS-1): Hostile --format values fail with JSON error and leave the tree unchanged

- Given: 11 hostile formats (flag-like, traversal, double placeholder, none, empty, whitespace, newline)
- When: name and list with each
- Then: exit 0 or 2, JSON on stdout, no Traceback, no unsafe branch value, tree unchanged
- Result: pass
- Spec source: R-047 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:52

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-4 (VS-2): Property: list is numerically sorted and the last entry holds the highest n

- Given: 1000 random branch sets, n up to 5000, noise branches, five formats
- When: list_kind through the module entry against a reference model written from the spec
- Then: sorted ascending by integer n; last entry is max n; noise excluded
- Result: pass
- Spec source: R-121 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:82

```
list_kind: seed=424242 runs=1000 violations=0
```

## TC-contract-5 (VS-2): Example: runs 2, 9, 10, 11 end at 11; empty repo lists nothing; name for n=11 equals the existing branch

- Given: scratch repo
- When: list, name --n 11
- Then: order 2,9,10,11; last sdlc/run-11; name equals it; empty list on no run branch; no tree change
- Result: pass
- Spec source: R-121 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:105

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-6 (VS-2): Property: parse of a run branch name returns run with the same n

- Given: 1000 random formats and n up to 100000
- When: parse through module entry
- Then: kind run and n equal
- Result: pass
- Spec source: R-047 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:117

```
parse: seed=424242 runs=1000 violations=0
```

## TC-contract-7 (VS-4): feature/PROJ-1-S-002 parses as slice S-002; feature/PROJ-1-foo has no kind

- Given: format feature/PROJ-1-{name}
- When: parse CLI
- Then: kind slice id S-002 exit 0 stderr empty; kind null exit 0
- Result: pass
- Spec source: R-118 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:130

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-8 (VS-4): Regex characters in the prefix are literal; repeated or shifted prefix is not a kind

- Given: formats with . + ( ) | $ and near-miss branches
- When: parse CLI
- Then: literal match gives slice; look-alike branches, repeated prefix, case changes, empty tail give null
- Result: pass
- Spec source: R-118 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:139

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-9 (VS-4): Exit codes and stderr are stable

- Given: missing --branch, format without placeholder, repeated call
- When: parse CLI
- Then: exit 2 with ok false JSON for bad input; same stdout on repeat
- Result: pass
- Spec source: R-118 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:166

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-10 (VS-5): Bullet order in SKILL.md

- Given: skills/sdlc/SKILL.md at the slice commit
- When: read the bullet list
- Then: Worktree path before Git mode and Branch format; Branch format before Run worktree before specPath before STOP removal; one WT assignment; the mismatch sentence sits only in Run worktree
- Result: pass
- Spec source: R-047 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:182

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-11 (VS-5): Run worktree bullet content

- Given: SKILL.md
- When: read the bullet
- Then: RUN_BRANCH command, count rule, relaunch rule, checkout, no new branch on relaunch, mismatch sentence, no literal sdlc/run-<n>
- Result: pass
- Spec source: R-047 and R-121 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:193

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## TC-contract-12 (VS-5): Quoted commands run as written in a scratch repo

- Given: scratch repo, FMT feature/{name}
- When: run the quoted list and name commands, create the worktree, add run-9 and run-10, detach HEAD, run the quoted checkout
- Then: empty list then feature/run-1; worktree add succeeds; relaunch list ends with feature/run-10; no new run branch; checkout puts HEAD back on feature/run-10
- Result: pass
- Spec source: R-047 and R-121 acceptance
- Test: .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:207

```
node --test output: .sdlc/slices/S-019/verification/r0/logs/contract-0.log
```

## Seeds

- parse accepts a trailing newline in the branch (skills/sdlc/branches.py). Git cannot hold such a name, so the risk is low. Use fullmatch.
