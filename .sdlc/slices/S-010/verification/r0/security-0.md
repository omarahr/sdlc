# Verify security report: S-010 round 0 part 0

- Slice: S-010. Profile: security. Round: 0. Commit: 79efa1c.
- Verdict: no in-scope failure. 16 cases pass. 1 seed.
- Environment: Node 24 test runner, python3, git, testkit cli-runner with scratch HOME; list run through branches.py CLI
- Command: `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs` (17 tests, 17 pass). Log: `.sdlc/slices/S-010/verification/r0/logs/security-0-run.txt`; attack transcripts: `.sdlc/slices/S-010/verification/r0/logs/security-0-attacks.jsonl`.

Threat model: the branch names in a repo and the arguments of the CLI are untrusted. The operator who runs the CLI is trusted.

## TC-security-1 (VS-3): Remote refs, tags, notes, stash, lookalike namespace and detached HEAD never appear

- Given: Repo with branches sdlc/S-001, sdlc/S-007, feature/x; refs/remotes/origin/sdlc/S-009 and S-001; tag sdlc/S-008; refs/notes/sdlc/S-011; refs/heads-evil/sdlc/S-012; refs/stash; detached HEAD
- When: list --kind slice
- Then: Only sdlc/S-001 and sdlc/S-007; no ref written
- Actual: Exact list returned; tree and refs unchanged
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:20`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}, {"branch": "sdlc/S-007", "kind": "slice", "tail": "S-007", "id": "S-007", "known": null}]}

```

## TC-security-2 (VS-3): A tag with the same name as a branch does not hide or alter the branch

- Given: Branches and tags both named sdlc/S-001 and sdlc/run-3; extra tag sdlc/run-4 and tag heads/sdlc/S-001
- When: list --kind slice and --kind run
- Then: Real branches listed once with correct parts; tag-only names absent
- Actual: Branches listed once, ids and n correct (the implementation uses full refnames)
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:36`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

## TC-security-3 (VS-3): A tag with no branch of that name gives an empty list

- Given: Only tag sdlc/S-050
- When: list --kind slice
- Then: branches []
- Actual: branches []
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:50`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": []}

```

## TC-security-4 (VS-3): A branch named heads/sdlc/S-002 is not read as sdlc/S-002

- Given: Branch heads/sdlc/S-002 and sdlc/S-001
- When: list --kind slice
- Then: Only sdlc/S-001
- Actual: Only sdlc/S-001
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:58`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

## TC-security-5 (VS-3): A symbolic ref under refs/heads does not produce a non-slice entry or a crash

- Given: refs/heads/sdlc/S-077 as symbolic ref to sdlc/S-001
- When: list --kind slice
- Then: Exit 0; every entry kind slice
- Actual: Exit 0; every entry kind slice
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:66`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}, {"branch": "sdlc/S-077", "kind": "slice", "tail": "S-077", "id": "S-077", "known": null}]}

```

## TC-security-6 (VS-5): Repo with no commit gives an empty list; unknown kind gives exit 2

- Given: git init with no commit
- When: list --kind slice; list --kind bogus
- Then: [] with exit 0; exit 2 with ok false
- Actual: As expected; tree unchanged
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:76`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": []}

```

## TC-security-7 (VS-5): Non-git dir, missing path, file path and empty --repo give exit 2 and JSON, no traceback

- Given: Plain dir, missing path, regular file, empty string
- When: list --kind slice
- Then: exit 2, ok false, message 'not a git repository' for the plain dir, no traceback, tree unchanged
- Actual: As expected
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:85`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
-> exit 2; tree unchanged: True
{"ok": false, "error": "not a git repository: /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IPRTHX/plain-15"}

```

## TC-security-8 (VS-5): Subdirectory of a repo, bare repo, broken .git file and corrupt packed-refs give defined JSON results

- Given: Four fixtures
- When: list --kind slice
- Then: One JSON object, exit 0 or 2, no traceback
- Actual: Subdir lists branches; bare repo, broken gitdir and corrupt packed-refs give defined JSON
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:98`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(96) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

## TC-security-9 (VS-5): git missing from PATH gives a defined result

- Given: PATH=/nonexistent
- When: list --kind slice
- Then: Exit 2 JSON error, no traceback
- Actual: Defined error, no traceback
- Result: pass. Spec source: R-025 acceptance: Foreign branches are absent
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:114`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
-> exit None; tree unchanged: True

```

## TC-security-10 (VS-6): attempt-0, attempt-007, attempt-7 and run-0/007 sort by integer n with ties by branch name

- Given: Branches attempt-0, 007, 7, 10, 2 and run-0, 007, 10, 2
- When: list --kind attempt and run
- Then: n order 0,2,7,7,10 and 0,2,7,10 as JSON integers
- Actual: As expected
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:121`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "attempt", "branches": [{"branch": "sdlc/S-001-attempt-0", "kind": "attempt", "tail": "S-001-attempt-0", "id": "S-001", "n": 0, "known": null}, {"branch": "sdlc/S-001-attempt-2", "kind": "attempt", "tail": "S-001-attempt-2", "id": "S-001", "n": 2, "known": null}, {"branch": "sdlc/S-001-attempt-007", "kind": "attempt", "tail": "S-001-attempt-007", "id": "S-001", "n": 7, "known": null}, {"branch": "sdlc/S-001-attempt-7", "kind": "att
```

## TC-security-11 (VS-6): Unicode digit tails (12 corpus entries, run and attempt) never crash list

- Given: Each corpus entry created as a branch
- When: list --kind run / attempt
- Then: Exit 0, one JSON object, n an integer
- Actual: No crash; non-ASCII digit tails are listed as loop branches (see seeds)
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:129`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "attempt", "branches": [{"branch": "sdlc/S-001-attempt-1", "kind": "attempt", "tail": "S-001-attempt-1", "id": "S-001", "n": 1, "known": null}, {"branch": "sdlc/S-001-attempt-\u0663", "kind": "attempt", "tail": "S-001-attempt-\u0663", "id": "S-001", "n": 3, "known": null}]}

```

## TC-security-12 (VS-6): Huge integers in branch names (4300, 4301, 5000 digits) do not crash list

- Given: Branches run-<N nines> written via packed-refs
- When: list --kind run / attempt
- Then: Exit 0, one JSON object
- Actual: Exit 0, one JSON object
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:145`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "run", "branches": [{"branch": "sdlc/run-1", "kind": "run", "tail": "run-1", "n": 1, "known": null}, {"branch": "sdlc/run-9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
```

## TC-security-13 (VS-6): Confusable and traversal corpus names as branches never produce a wrong-kind entry or crash, across all 8 kinds

- Given: Branches from unicode-confusables and traversal corpora under sdlc/, sdlc/S- and bare
- When: list for each of 8 kinds
- Then: Exit 0, kind matches, slice ids match S-[A-Za-z0-9-]+
- Actual: As expected
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:159`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}, {"branch": "sdlc/S-SLICE", "kind": "slice", "tail": "S-SLICE", "id": "S-SLICE", "known": null}]}

```

## TC-security-14 (VS-6): Flag-like corpus values as --repo, --kind and --format give one JSON object with exit 0 or 2

- Given: 8 flag-like values in 3 slots (24 runs)
- When: list
- Then: Exit 0 or 2, ok matches exit, JSON, no traceback, tree unchanged
- Actual: As expected
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `None`

```
branches.py list --repo -- --kind slice
-> exit 2; tree unchanged: True
{"ok": false, "error": "argument --repo: expected one argument"}

```

## TC-security-15 (VS-6): Injection strings and traversal paths as --repo run no command and write nothing

- Given: Shell metacharacters touching a marker file; corpus injection and traversal values
- When: list --repo <value>
- Then: Exit 2 JSON; marker file absent
- Actual: Marker absent; exit 2
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:201`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(101) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

## TC-security-16 (VS-6): Repo git config (core.fsmonitor, alias) does not run code during list

- Given: Marker-touching fsmonitor and rev-parse alias set in the repo
- When: list --kind slice
- Then: Branch listed; marker absent
- Actual: Marker absent
- Result: pass. Spec source: R-025 acceptance; R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:217`

```
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

## Attacks

- A-VS3-a: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
- A-VS3-b: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
- A-VS3-b-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind run
- A-VS3-c: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
- A-VS3-d: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
- A-VS3-e: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
- A-VS5-a: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
- A-VS5-a2: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind bogus
- A-VS5-b: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
- A-VS5-c: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(98) --kind slice
- A-VS5-d: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(99) --kind slice
- A-VS5-e: held. list --repo  --kind slice
- A-VS5-f: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(96) --kind slice
- A-VS5-g: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(96) --kind slice
- A-VS5-h: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(94) --kind slice
- A-VS5-i: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
- A-VS5-j: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
- A-VS6-a: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
- A-VS6-a-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run
- A-VS6-ud-arabic-indic-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-٣]
- A-VS6-ud-arabic-indic-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-٣]
- A-VS6-ud-arabic-indic-12-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-١٢]
- A-VS6-ud-arabic-indic-12-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-١٢]
- A-VS6-ud-fullwidth-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-１２]
- A-VS6-ud-fullwidth-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-１２]
- A-VS6-ud-devanagari-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-१]
- A-VS6-ud-devanagari-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-१]
- A-VS6-ud-bengali-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-২]
- A-VS6-ud-bengali-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-২]
- A-VS6-ud-nko-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-߁]
- A-VS6-ud-nko-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-߁]
- A-VS6-ud-math-bold-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-𝟏]
- A-VS6-ud-math-bold-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-𝟏]
- A-VS6-ud-superscript-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-²]
- A-VS6-ud-superscript-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-²]
- A-VS6-ud-roman-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-Ⅷ]
- A-VS6-ud-roman-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-Ⅷ]
- A-VS6-ud-circled-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-①]
- A-VS6-ud-circled-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-①]
- A-VS6-ud-mixed-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-1٢]
- A-VS6-ud-mixed-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-1٢]
- A-VS6-ud-thai-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt [branch sdlc/S-001-attempt-๑]
- A-VS6-ud-thai-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run [branch sdlc/run-๑]
- A-VS6-huge: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run
- A-VS6-huge-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
- A-VS6-conf-slice: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
- A-VS6-conf-run: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run
- A-VS6-conf-attempt: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
- A-VS6-conf-verify: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind verify
- A-VS6-conf-state: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind state
- A-VS6-conf-milestone: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind milestone
- A-VS6-conf-e2e: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind e2e
- A-VS6-conf-e2e-area: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind e2e-area
- A-VS6-flag-double-dash-repo: held. list --repo -- --kind slice
- A-VS6-flag-double-dash-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind --
- A-VS6-flag-double-dash-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format --
- A-VS6-flag-help-short-repo: held. list --repo -h --kind slice
- A-VS6-flag-help-short-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind -h
- A-VS6-flag-help-short-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format -h
- A-VS6-flag-help-long-repo: held. list --repo --help --kind slice
- A-VS6-flag-help-long-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind --help
- A-VS6-flag-help-long-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format --help
- A-VS6-flag-flag-eq-repo: held. list --repo --format=x/{name} --kind slice
- A-VS6-flag-flag-eq-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind --format=x/{name}
- A-VS6-flag-flag-eq-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format --format=x/{name}
- A-VS6-flag-negative-like-repo: held. list --repo -1 --kind slice
- A-VS6-flag-negative-like-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind -1
- A-VS6-flag-negative-like-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format -1
- A-VS6-flag-single-dash-repo: held. list --repo - --kind slice
- A-VS6-flag-single-dash-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind -
- A-VS6-flag-single-dash-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format -
- A-VS6-flag-flag-name-repo: held. list --repo --repo --kind slice
- A-VS6-flag-flag-name-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind --repo
- A-VS6-flag-flag-name-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format --repo
- A-VS6-flag-equals-empty-repo: held. list --repo = --kind slice
- A-VS6-flag-equals-empty-kind: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind =
- A-VS6-flag-equals-empty-format: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice --format =
- A-VS6-inj: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(101) --kind slice
- A-VS6-inj-cmd-subst: held. list --repo $(touch pwned) --kind slice
- A-VS6-inj-backticks: held. list --repo `touch pwned` --kind slice
- A-VS6-inj-semicolon: held. list --repo x; touch pwned --kind slice
- A-VS6-inj-pipe: held. list --repo x | cat --kind slice
- A-VS6-inj-ampersand: held. list --repo x && touch pwned --kind slice
- A-VS6-inj-redirect: held. list --repo x > pwned --kind slice
- A-VS6-inj-json-break: held. list --repo "}, "ok": true, "x": {" --kind slice
- A-VS6-inj-newline-json: held. list --repo x
{"ok": true} --kind slice
- A-VS6-inj-git-option: held. list --repo --upload-pack=touch pwned --kind slice
- A-VS6-inj-git-revision: held. list --repo HEAD@{1} --kind slice
- A-VS6-inj-percent: held. list --repo %s%n%x --kind slice
- A-VS6-inj-python-format: held. list --repo {0.__class__} --kind slice
- A-VS6-inj-glob: held. list --repo * --kind slice
- A-VS6-inj-dotdot: held. list --repo ../.. --kind slice
- A-VS6-inj-abs-etc: held. list --repo /etc --kind slice
- A-VS6-inj-dotdot-etc: held. list --repo ../../../../etc/passwd --kind slice
- A-VS6-inj-backslash: held. list --repo ..\.. --kind slice
- A-VS6-inj-encoded: held. list --repo %2e%2e/%2e%2e --kind slice
- A-VS6-inj-tilde: held. list --repo ~ --kind slice
- A-VS6-inj-file-url: held. list --repo file:///etc --kind slice
- A-VS6-inj-unc: held. list --repo \\server\share --kind slice
- A-VS6-inj-dot: held. list --repo . --kind slice
- A-VS6-inj-trailing-slash: held. list --repo ./ --kind slice
- A-VS6-cfg: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
- A-VS6-ud-pin: held. list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind run
- A-VS6-ud-arabic-indic-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-٣
- A-VS6-ud-arabic-indic-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-٣
- A-VS6-ud-arabic-indic-12-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-١٢
- A-VS6-ud-arabic-indic-12-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-١٢
- A-VS6-ud-fullwidth-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-１２
- A-VS6-ud-fullwidth-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-１２
- A-VS6-ud-devanagari-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-१
- A-VS6-ud-devanagari-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-१
- A-VS6-ud-bengali-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-২
- A-VS6-ud-bengali-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-২
- A-VS6-ud-nko-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-߁
- A-VS6-ud-nko-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-߁
- A-VS6-ud-math-bold-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-𝟏
- A-VS6-ud-math-bold-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-𝟏
- A-VS6-ud-mixed-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-1٢
- A-VS6-ud-mixed-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-1٢
- A-VS6-ud-thai-attempt-nonascii: out-of-scope. list --kind attempt with branch sdlc/S-001-attempt-๑
- A-VS6-ud-thai-run-nonascii: out-of-scope. list --kind run with branch sdlc/run-๑

## Seeds

- parse accepts non-ASCII digits in run and attempt tails: Python \d matches unicode digits, so sdlc/run-١ and sdlc/S-001-attempt-１２ parse as run n=1 and attempt n=12. list returns them next to sdlc/run-1, so two branches claim one n, and name(run, n=1) does not give back the listed branch. The spec writes the regex as \d+, so this follows the text, and no requirement forbids it. Fix: use [0-9]+ or re.ASCII for the numeric parts in PARSE_ROWS.
