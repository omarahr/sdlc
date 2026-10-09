# Verification: S-015, profile contract, round 0

- Commit: 7f87721
- Verdict: pass (9 cases, 9 passed)
- Environment: python3 branches.py on macOS, node test runner, testkit property seeded generator, fake gh via monkeypatch in-process and stub-server shim for CLI runs
- Surface listing: `.sdlc/slices/S-015/verification/r0/logs/contract-0-surface.txt`. The diff adds `SAMPLE_KINDS`, `build_samples`, `_sample_row`, `verdict`, and rewrites `cmd_preflight` and `main` in `skills/sdlc/branches.py`. It adds no other export.
- Mutation check: replacing the per-sample rules with the union rules makes the VS-9 test fail and gives 357 violations in the property test. The mutation was in a scratch worktree only.
- Raw results: `.sdlc/slices/S-015/verification/r0/logs/contract-0-results.jsonl`

## TC-contract-1 (VS-1): Format resolves from flag, config or default (property)

- Given: 1000 random repos: config absent or holding strings, empty, null, number, bad formats; flag absent or random
- When: preflight runs through main()
- Then: Flag beats config beats default; given is true for flag or config; a format git or the placeholder rules refuse gives exit 2 with a one-object error
- Actual: 1000 runs, 0 violations against the reference model (placeholder count, braces, Python whitespace set, git check-ref-format)
- Result: pass
- Spec source: R-038 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:89`

```
property: format resolution against reference model; seed=424242 runs=1000 violations=0
```

## TC-contract-2 (VS-1): Spec examples and corner formats

- Given: Broken config JSON with --format; config only; neither; 12 invalid and 4 valid corner formats (empty, {name}{name}, spaces, a..b, .lock, leading slash, NBSP, ideographic space, emoji, accents)
- When: preflight runs
- Then: Flag wins over a broken config; given false and sdlc/{name} for neither; invalid formats exit 2 with ok false and error
- Actual: as expected for every example
- Result: pass
- Spec source: R-038 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:134`

```
result pass
```

## TC-contract-3 (VS-2): build_samples follows the mode (property)

- Given: 1000 random valid formats, modes pr, stack, mr, direct and an unknown mode, working branch values
- When: build_samples is called through the module
- Then: pr: slice, state, e2e; stack: run, milestone, slice; mr adds working last only when a name is given; other modes none; names follow the format and the lower transform
- Actual: 1000 runs, 0 violations; every sample has exactly kind and name; every state name holds 14 digits
- Result: pass
- Spec source: R-039 acceptance, R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:162`

```
property: build_samples against reference model; seed=424243 runs=1000 violations=0
```

## TC-contract-4 (VS-2): Preflight samples per mode with prefix and lowercase formats

- Given: 4 formats (sdlc/{name}, feature/{name:lower}, pre-{name}, {name}) in 4 modes; --branch in direct and pr
- When: preflight runs
- Then: Sample kinds and names equal the reference; state timestamp is current UTC; --branch adds nothing in pr and direct
- Actual: as expected
- Result: pass
- Spec source: R-039 acceptance, R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:187`

```
result pass
```

## TC-contract-5 (VS-5): Verdict rows, first failing rule, exit code, per-sample rules (property)

- Given: 1000 cases: github repo, random formats, modes, working branches (valid and invalid refs), per-sample rule sets of 4 operators with negate, bad regexes, unknown kinds, noise objects, and gh errors
- When: main() runs with a fake gh
- Then: Each row result and rule equal the model; the rule is the label of the first failing rule; ok false exactly when a row fails; exit 1 then, else 0; gh call list equals the model; output holds all required keys; row keys are exactly kind, name, result, rule
- Actual: 1000 runs, 0 violations; 396 cases had a failing row and 86 had an unevaluated row
- Result: pass
- Spec source: R-044 acceptance, R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:249`

```
property: verdict model; seed=424244 runs=1000 violations=0 casesWithFail=396 casesWithUnevaluated=86 notesSeen=267
```

## TC-contract-6 (VS-8): Notes merge without duplicates in first-seen order

- Given: Same bad regex on three samples; two bad rules in mixed order; unknown kind; gh error on the second sample
- When: preflight runs with a fake gh
- Then: One cannot evaluate note for the same rule; order is first seen; a rules unknown note stands alone and all samples are unchecked
- Actual: notes: one note for the repeated rule; bad-two before bad-one; one note for the unknown kind; one rules unknown note. The property test also checks no duplicate notes in 1000 cases
- Result: pass
- Spec source: R-041 acceptance, spec section 3
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:337`

```
see logs/contract-0-results.jsonl (VS-8 row)
```

## TC-contract-7 (VS-9): Each sample is judged against its own rules

- Given: gh returns different rules per sample; overlapping rules A, B, C on all samples; a duplicate-name pair (white-box probe)
- When: preflight and verdict run
- Then: A rule for one sample fails only that sample; overlapping rules give the first failing label per sample; the union rules list is deduplicated; a duplicate name shares one gh call and keeps two rows
- Actual: as expected; replacing by_sample with the union rules makes this test and the property fail
- Result: pass
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:375`

```
result pass; mutation check: union rules -> VS-9 test fails and property gives 357 violations
```

## TC-contract-8 (VS-5): Consumer view: CLI process with a gh shim

- Given: Scratch git repo with forge github, gh shim, cwd outside the repo
- When: python3 branches.py preflight runs for pr, stack, bogus mode, mr with a..b
- Then: Exit 1 with one JSON line and empty stderr when a sample fails; exit 0 when all pass; exit 2 with ok false for a bad mode; a..b fails with git check-ref-format; repo tree unchanged
- Actual: as expected
- Result: pass
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:404`

```
see logs/contract-0-results.jsonl (VS-5 consumer-view row)
```

## TC-contract-9 (VS-5): Hostile --branch values keep the output shape

- Given: 17 hostile names: option-like, empty, spaces, unicode, 5000 characters, tab, bidi mark, @{-1}, @, double slash, .lock, backslash
- When: preflight runs in mr mode
- Then: Exit is 0, 1 or 2; non-error output holds every required key; the working sample name equals the input
- Actual: as expected
- Result: pass
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:429`

```
result pass
```

## Seeds

- --branch with an empty value is ignored in mr mode: `--mode mr --branch ""` gives no working sample and exit 0, because build_samples tests the value for truth. The spec says only that --branch CURRENT adds the sample. An empty value cannot be a branch, so this is likely right, but no requirement states it.
- No real mode can give two samples with one name: Duplicate names reach verdict only through a patched build_samples. The shared-entry design in the plan is dead code for now. The verifier covered it with a white-box probe.
- Preflight output carries command, args and given beyond the spec keys: The plan keeps them for earlier tests. The spec lists eight keys. A strict consumer that compares key sets sees three extra keys.
