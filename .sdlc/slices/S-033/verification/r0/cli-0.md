# Verification S-033, profile cli, round 0

Commit: 94e98a7  
Verdict: all 6 cases pass. No in-scope failure.

Environment: python3 skills, node test runner, scratch git repos with a bare local remote, cli-runner testkit; no network

Command: `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`

## TC-cli-1 (VS-1): Prune under feature/PROJ-1-{name} deletes only branches that parse to milestone

- Given: Stack repo with a bare remote, format feature/PROJ-1-{name}. M-1 squash-merged to origin/main. Shipped-equivalent branches: sdlc/M-2, feature/PROJ-1-M-3-e2e, feature/PROJ-1-S-001, feature/PROJ-1-run-1, feature/PROJ-1-M-10, Cyrillic M, lower-case m-7, M-01, fullwidth M-1.
- When: state-write.py patch-slice for S-020 of M-4 in run 2.
- Then: Only parsed milestone branches go; every foreign branch stays.
- Actual: feature/PROJ-1-M-1 and M-10 went (both parse to milestone). sdlc/M-2, M-3-e2e, S-001, run-1, run-2, Cyrillic M-5, m-7 and main stayed. M-01 and the fullwidth-digit M-1 also went because parse classes them as milestone (seed).
- Result: pass
- Spec source: R-138 acceptance
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:61`
- Transcript: `.sdlc/slices/S-033/verification/r0/logs/cli-0-run.log`

```
- refs/heads/feature/PROJ-1-M-01
- refs/heads/feature/PROJ-1-M-1
- refs/heads/feature/PROJ-1-M-10
- refs/heads/feature/PROJ-1-M-１
+ refs/heads/feature/PROJ-1-M-4
+ refs/heads/feature/PROJ-1-S-020
```

## TC-cli-2 (VS-2): A stored runBranch that is foreign or malformed is read as no run

- Given: Leftover milestone branch with unshipped work. Its committed config names runBranch: main, sdlc/run-1, release/x, empty, absent, 123, ["a"], {a:1}, null, a slice name, a milestone name (custom format); main, a custom-format run, release/x (default format). Current run is run-2.
- When: patch-slice for S-001 (runs ensure_milestone_branch).
- Then: No 'belongs to run' refusal, branch and tip intact, no traceback.
- Actual: 14 of 14 variants: exit 0, no refusal, branch tip unchanged, no traceback.
- Result: pass
- Spec source: R-138 acceptance (a foreign branch is not taken as the run branch)
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:98`
- Transcript: `.sdlc/slices/S-033/verification/r0/logs/cli-0-run.log`

## TC-cli-3 (VS-3): A foreign branch is not taken as the run branch and is not pruned

- Given: As TC-cli-2 with runBranch main and sdlc/run-1 under the custom format.
- When: patch-slice for S-001.
- Then: ensure_milestone_branch does not fail with 'belongs to run'. The unshipped branch and its commit stay.
- Actual: Exit 0, branch feature/PROJ-1-S-001 cut, leftover milestone branch tip unchanged.
- Result: pass
- Spec source: R-138 acceptance
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:98`
- Transcript: `.sdlc/slices/S-033/verification/r0/logs/cli-0-run.log`

## TC-cli-4 (VS-4): A branch that names another real run still refuses

- Given: Leftover milestone branch whose config names feature/PROJ-1-run-1 or run-7 (custom), sdlc/run-1 or run-9 (default and empty format). Current run is run-2.
- When: patch-slice for S-001.
- Then: Exit 2 with 'belongs to run <name>'. The branch stays.
- Actual: All 4 variants exit 2 with the 'belongs to run' message; branch tip unchanged.
- Result: pass
- Spec source: R-138 acceptance, existing refusal in ensure_milestone_branch
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:111`
- Transcript: `.sdlc/slices/S-033/verification/r0/logs/cli-0-run.log`

```
{"ok": false, "error": "feature/PROJ-1-M-1 belongs to run feature/PROJ-1-run-1, not to feature/PROJ-1-run-2, and its work is not on origin/main: merge or drop it by hand, then cut again"}  (exit 2)
```

## TC-cli-5 (VS-5): Janitor sweeps under feature/PROJ-1-{name} from config

- Given: config.json branchFormat feature/PROJ-1-{name}. Ledger: S-001 done, S-002 todo, S-003 rejected. Branches for S-001 (custom and sdlc/), S-002, S-003, S-099, and feature/PROJ-1-S-001.
- When: janitor.py --repo
- Then: Done-slice verify branch under the custom format goes. sdlc/ branch, unfinished slice, slice branch and main stay.
- Actual: removedBranches: feature/PROJ-1-S-001-v0-http-api-0, ...S-003..., ...S-099... . sdlc/S-001-v0-http-api-0, S-002 branch, feature/PROJ-1-S-001 and main stayed. S-003 (rejected) and S-099 (absent from ledger) went, as janitor.py's docstring says. The plan note for VS-5 says an unlisted id stays; the code and docstring say it goes (seed).
- Result: pass
- Spec source: R-139 acceptance; janitor.py docstring
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:146`
- Transcript: `.sdlc/slices/S-033/verification/r0/logs/cli-0-run.log`

## TC-cli-6 (VS-6): Janitor sweeps under sdlc/{name} when branchFormat is absent, empty or the config is missing

- Given: Same ledger. Config {}, {branchFormat: ''}, and no config.json.
- When: janitor.py --repo
- Then: sdlc/S-001-v0-http-api-0 goes; feature/PROJ-1-S-001-v0-http-api-0, sdlc/S-002 branch and main stay.
- Actual: All 3 variants: removed sdlc/S-001-v0-http-api-0 and the ledger-absent sdlc/S-099-v0-http-api-0; the custom-format branch stayed.
- Result: pass
- Spec source: R-139 acceptance
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:156`
- Transcript: `.sdlc/slices/S-033/verification/r0/logs/cli-0-run.log`

## Attacks

- Unicode lookalike and prefix-clash branch names in the prune: Cyrillic M and lower-case m stay. Fullwidth-digit M-1 and zero-padded M-01 are deleted because parse classes them as milestone.
- Hostile runBranch values (numbers, lists, objects, null, slice and milestone names): All read as no run; no branch lost.

## Seeds

- branch_run raises AttributeError when the committed config.json is valid JSON but not an object (skills/sdlc/state-write.py): With config.json containing [1], "str" or 5 on a leftover milestone branch, patch-slice exits 1 with a traceback at state-write.py:284 (json.loads(...).get). The expression is unchanged by S-033. A branch cut in this state keeps its tip. The file is not an object only after a hand edit.
- parse accepts Unicode digits and leading zeros in milestone ids (skills/sdlc/branches.py): feature/PROJ-1-M-１ (fullwidth digit) and feature/PROJ-1-M-01 parse to kind milestone, so the prune deletes them when shipped. The regex ^(M-\d+)$ in branches.py matches Unicode digits. The loop never creates such names, so the risk is low.
- Plan note for VS-5 contradicts janitor.py (skills/sdlc/janitor.py): The note says a branch not in the ledger stays. janitor.py's docstring and code delete it. The test follows the docstring.
