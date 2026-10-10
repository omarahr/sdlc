# Verification S-023, profile contract, round 0

Commit: 1365f3a. Verdict: pass (13 cases, 0 failed).

Environment: Python 3 via python3 -I (pycall), Node 24 node:test, git; scratch repos from cli-runner; testkit property, cli-runner, attack-corpus.

Command: `VERIFY_WT=<worktree of sdlc/S-023 at 1365f3a> node --test .sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

Run log: `.sdlc/slices/S-023/verification/r0/logs/contract-0-run1.log`. Two cases were re-run after test-helper fixes in `logs/contract-0-run2.log`.

## TC-contract-1 (VS-1): Surface: patch_slice(repo, slice_id, patch, fmt) requires fmt; slice_side_branches(repo, fmt, slice_id)

- Expected: signatures match the plan; a call without fmt raises TypeError
- Actual: signatures: patch_slice (repo, slice_id, patch, fmt); slice_side_branches (repo, fmt, slice_id); format_of (repo, config). Call without fmt raised TypeError.
- Result: pass
- Spec source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
inspect.signature output above
```

## TC-contract-2 (VS-1): fmt argument that differs from config wins; format_of is not called inside patch_slice

- Expected: branch other/s-001
- Actual: branch other/s-001, checked out
- Result: pass
- Spec source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
patch_slice(repo,'S-001',{...},'other/{name:lower}') with format_of patched to raise: ok
```

## TC-contract-3 (VS-1): patch-slice branch under custom, lowercase, default, absent, empty and non-string branchFormat

- Expected: feature/PROJ-123-S-001, feature/s-001, sdlc/S-001 (x4)
- Actual: all six as expected
- Result: pass
- Spec source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
6 CLI runs, exit 0, branch checked out
```

## TC-contract-4 (VS-1): Bad or missing config: same exit code and same error text as before the change (commit 38e600f)

- Expected: 16 pairs identical (8 configs x patch-slice and base-branch)
- Actual: identical. Two pre-existing tracebacks (non-object JSON, config.json a directory) occur before and after the change
- Result: pass
- Spec source: R-059 acceptance; behavior before the change
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
old state-write.py from 38e600f run side by side; paths normalised
```

## TC-contract-5 (VS-2): main calls format_of exactly once per run for patch-slice and base-branch; load_format is the fallback and runs once when branchFormat is absent

- Expected: calls == 1; load_format 0 with branchFormat, 1 without
- Actual: as expected
- Result: pass
- Spec source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
spy on format_of and branches.load_format around main()
```

## TC-contract-6 (VS-2): base-branch under lowercase format and fallback, with an awaiting-merge dependency

- Expected: feature/s-001 and sdlc/S-001
- Actual: as expected
- Result: pass
- Spec source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
CLI runs, exit 0
```

## TC-contract-7 (VS-3): Property: slice_side_branches against a reference model written from the spec (6 formats, 8 slice ids incl. S-001/S-0011/S-010, foreign and look-alike branches)

- Expected: result equals the model, sorted, deterministic
- Actual: 1500 runs, 0 mismatches. seed=2643624506
- Result: pass
- Spec source: R-083 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
property slice_side_branches: seed=2643624506 runs=1500 nonEmpty=1500 violations=0
```

## TC-contract-8 (VS-3): Spec examples: verify and attempt tails under feature/PROJ-1-{name} and feature/{name:lower}; plain slice branch, other slices and foreign prefix excluded

- Expected: exactly the two tails of S-001
- Actual: as expected
- Result: pass
- Spec source: R-083 acceptance (a verify tail and an attempt tail match under a custom format)
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
['feature/PROJ-1-S-001-attempt-2','feature/PROJ-1-S-001-v0-http-api-0']
```

## TC-contract-9 (VS-3): Attack corpus (134 entries, 12 families) and non-string ids as slice id; not a git repo; bad fmt

- Expected: return [] or Fail, never an uncaught exception
- Actual: all return [] or Fail; non-string ids return without exception; not-a-repo and a bad fmt give Fail
- Result: pass
- Spec source: R-083 acceptance (helper contract in plan.md)
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
attack corpus entries=134; null/0/1.5/true/[]/{}/['S-001'] => return
```

## TC-contract-10 (VS-3): Purity: repo refs unchanged, a fresh list on each call

- Expected: refs identical, lists not shared
- Actual: as expected
- Result: pass
- Spec source: plan.md
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
for-each-ref before and after identical
```

## TC-contract-11 (VS-4): Matching goes through branches.parse with ids=[slice_id]; stubbing branches.parse changes the result

- Expected: parse spy sees ids ['S-001'] for every branch; a stub decides the output
- Actual: as expected
- Result: pass
- Spec source: R-083 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
stub parse returned attempt/known for sdlc/weird-branch and only that branch was returned
```

## TC-contract-12 (VS-4): Source of state-write.py holds no pattern for -attempt- or -v<digits>; slice_side_branches uses no re.

- Expected: no hit
- Actual: no hit. Other re uses in the file are unrelated
- Result: pass
- Spec source: R-083 acceptance (not a local regex)
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
4 unrelated re uses (ADR count, slice parent, normalise text, requirement id)
```

## TC-contract-13 (VS-4): Casing rule comes from branches.py: lowercase format matches lowercase and upper-case tails; default format matches case-exactly

- Expected: as parse defines
- Actual: feature/{name:lower}: S-001-attempt-3, S-001-v1-cli-0, s-001-attempt-2, s-001-v0-cli-0 all match; feature/{name}: only the S-001 ones
- Result: pass
- Spec source: branch-format spec line 248 (parse with ids returns S-001)
- Test: `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

```
low/def/defLower outputs in logs/contract-0-run1.log
```

## Seeds

- lowercase format also matches upper-case tails: branches.parse folds case for the prefix, the suffix and the tail under {name:lower}, so feature/S-001-attempt-3 is a side branch of S-001 under feature/{name:lower}. The plan note for VS-4 expected upper-case names not to match. The branch-format spec does not forbid it. A prune command that deletes by this helper would also delete an upper-case look-alike branch.
- pre-existing tracebacks for a non-object or directory config.json: state-write.py patch-slice and base-branch print a Python traceback when config.json holds a JSON array or is a directory. The behavior is identical before the change, so it is not a regression.
- slice_side_branches has no caller: ship-prune and collect-verification do not exist, so R-083 holds as a helper plus a source test only. ADR-20261010-043504-decision-judge-S-023-770f accepts this.
