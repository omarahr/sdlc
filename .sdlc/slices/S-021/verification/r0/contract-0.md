# Verify contract, S-021, round 0, part 0

- Commit: fecc565
- Verdict: pass. 9 of 9 cases pass. 3 seeds.
- Environment: Python 3.14.7, Node 24.19.0, git; next-action.py run as a CLI and loaded by path through the testkit pycall; main script from git archive of main (8450221)

## Surface
```
active_branch(repo, current, fmt)  [changed: new fmt argument]
decide(repo, spec_arg, bar_rounds, prs_file, main_root=None)  [unchanged shape]
main()
helpers unchanged: run, as_list, branch_slices, pr_ready, load_prs, current_branch, children, settled, slim_slice
No extra export. The only signature change is active_branch(..., fmt), which the plan names.
```

## TC-contract-1 (VS-3): Lowercased open and merged heads resolve to the ledger id

- Given: Format feature/PROJ-1-{name:lower}; slice S-1; head feature/proj-1-s-1
- When: Run next-action.py with an open PR, then with a merged PR on an awaiting-merge slice
- Then and expected: retryMerge for S-1 in both runs
- Actual: open: sliceId S-1, status awaiting-merge; merged: sliceId S-1, slice.pr equals the merged url
- Result: pass
- Spec source: R-054 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:60`

Evidence (transcript): run
```
open head feature/proj-1-s-1 -> retryMerge S-1 awaiting-merge
merged head feature/proj-1-s-1 -> retryMerge S-1, pr=https://example.test/pr/4
```

## TC-contract-2 (VS-3): Unknown ids stay ignored and case folding exists only under :lower

- Given: Formats :lower and plain; slice S-1
- When: Open and merged heads for S-99 and S-98; lowercased id and lowercased prefix under the plain format
- Then and expected: No retryMerge for unknown ids; the plain format resolves only the exact head
- Actual: unknown -> slice; plain format with s-1 or proj-1 -> slice; exact PROJ-1-S-1 -> retryMerge
- Result: pass
- Spec source: R-054 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:70`

Evidence (transcript): run
```
feature/proj-1-s-99 -> slice
feature/PROJ-1-s-1 (plain) -> slice
feature/proj-1-S-1 (plain) -> slice
feature/PROJ-1-S-1 (plain) -> retryMerge
```

## TC-contract-3 (VS-3): Ledger ids that differ only in case resolve deterministically

- Given: Ledger S-a and S-A; format :lower; head feature/proj-1-s-a
- When: Run twice
- Then and expected: retryMerge for one ledger id, same output both times
- Actual: sliceId S-a (first in ledger order); identical JSON on the second run
- Result: pass
- Spec source: R-054 quote (ids=by_id)
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:83`

Evidence (transcript): run
```
case-only-differing ledger ids -> S-a
```

## TC-contract-4 (VS-3): Active branch under :lower resolves by case folding; a foreign number does not

- Given: Branch feature/proj-1-s-1 holds S-1 in_progress; branch feature/proj-1-s-2 holds S-1 in_progress
- When: Run next-action.py, then compare the tree
- Then and expected: checkout is feature/proj-1-s-1; no checkout for the s-2 branch; the tree does not change
- Actual: as expected, tree unchanged
- Result: pass
- Spec source: R-053 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:94`

Evidence (transcript): run
```
checkout=feature/proj-1-s-1
foreign branch -> checkout null
```

## TC-contract-5 (VS-3): Unicode and hostile heads never resolve and never crash

- Given: Format :lower; slices S-1, S-12
- When: Open and merged heads: fullwidth digit, dotless i, Kelvin sign, trailing space, NUL, emoji, 15000 characters, flag-like, empty, traversal
- Then and expected: exit 0 and no retryMerge for each head
- Actual: all 11 heads exit 0 and give no retryMerge
- Result: pass
- Spec source: R-054 acceptance (a foreign head is ignored)
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:107`

Evidence (transcript): run
```
11 heads, 0 crashes, 0 retryMerge
```

## TC-contract-6 (VS-3): Property: head resolution matches a model written from the spec text

- Given: 5 formats (3 :lower, 2 plain), random ledgers of 1 to 4 ids, random heads (cased known, unknown, foreign)
- When: Run decide() through pycall on 1000 generated fixtures
- Then and expected: retryMerge exactly when a head equals prefix+id+suffix (case-folded under :lower), with the first matching ledger id
- Actual: 0 violations in 1000 runs
- Result: pass
- Spec source: R-054 quote and acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:117`

Evidence (property-run): VS-3 property
```
property=head resolution vs reference model
seed=20261010 runs=1000 result=pass violations=0 shrunk=none (the testkit does not shrink)
```

## TC-contract-7 (VS-5): Absent, empty, null and explicit default branchFormat give the same decisions, equal to main

- Given: Config with no key, empty string, null, sdlc/{name}; heads sdlc/S-1, sdlc/state-<stamp>, sdlc/M-1-e2e, sdlc/M-1-e2e-ui, sdlc/M-1 in pr, stack and direct mode; branch sdlc/S-1 in progress
- When: Run next-action.py for each config and for the main-branch script
- Then and expected: Identical JSON across the four configs and equal to main
- Actual: identical: slice PR retryMerge, two merge commands, stack hold wait, e2e head slice, checkout sdlc/S-1
- Result: pass
- Spec source: R-055 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:172`

Evidence (transcript): run
```
4 configs x 6 scenarios identical; 6 scenarios equal to main
```

## TC-contract-8 (VS-5): Property: default-format decisions equal main for generated sdlc heads

- Given: No branchFormat; modes pr, stack and direct; 20 head shapes; open and merged
- When: Run decide() of the branch and of main on 1000 generated fixtures
- Then and expected: Equal output
- Actual: 980 equal. 20 differ, all in stack mode with the heads sdlc/M-2-e2e-ui, sdlc/M-1-, sdlc/M- or sdlc/M-1/x: main held the run, the branch does not. This follows R-054 (the hold keeps the milestone kind only). See seeds.
- Result: pass
- Spec source: R-077 acceptance; R-054 quote
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:221`

Evidence (property-run): VS-5 default vs main
```
seed=20261011 runs=1000 result=pass differences-from-main=20 (all explained)
```

Evidence (log): differences
```
see .sdlc/slices/S-021/verification/r0/logs/contract-0-default-diff.json
```

## TC-contract-9 (VS-5): A non-string or invalid branchFormat fails clearly

- Given: branchFormat 7, true, array, object, x, sdlc/{name, {name}{name}, sdlc/{id}, 1.5, two placeholders
- When: Run next-action.py with PRs and with a branch
- Then and expected: Exit 0 with action error and a reason that names the format; no Traceback
- Actual: no Traceback for 12 values; reason such as: Fail: the branch format must be a string
- Result: pass
- Spec source: R-055 (load_format semantics)
- Test: `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:255`

Evidence (log): outcomes
```
see .sdlc/slices/S-021/verification/r0/logs/contract-0-invalid-format.json
```

## Attacks

None beyond the hostile-head case TC-contract-5.

## Seeds

- branches.parse accepts a trailing newline in a head (skills/sdlc/branches.py): The slice, milestone and state patterns end with $, which matches before a final newline. A head of feature/proj-1-s-1 plus a newline resolves to S-1 (probe at test line 272). Git and gh refuse such names, so the head cannot occur. Use fullmatch.
- Default-format stack hold changed for e2e-area and malformed milestone heads (skills/sdlc/next-action.py): Under the default format in stack mode, main held the run on sdlc/M-2-e2e-ui and on sdlc/M-1-. The branch ignores both, because they do not parse to the milestone kind. This follows R-054 but changes the old behavior.
- next-action.py does not run validate_format (skills/sdlc/next-action.py): A format with whitespace, such as a b/{name}, passes through decide and matches heads. preflight rejects it earlier, so only a hand-edited config reaches this.
