# S-004 verify-cli part 0, round 0

- Slice: S-004
- Profile: cli
- Round: 0
- Commit: 2b1960c
- Verdict: not refuted. 14 of 14 cases pass.

## Environment

macOS Darwin 25.6.0, Python 3.14.7, git 2.50.1, Node test runner; branches.py run as python3 script from the verifier worktree at sdlc/S-004 2b1960c through testkit cli-runner (scratch HOME, TZ=UTC, PYTHONUTF8=1)

## TC-cli-1: Default format names the run, slice, milestone, e2e and e2e-area branches

- Scenario: VS-1; requirements: R-003, R-004, R-005, R-006, R-007
- Given: A scratch git repo with no .sdlc/config.json and no --format
- When: branches.py name runs once per kind with the acceptance arguments
- Then: Each run exits 0 with one JSON object
- Expected: sdlc/run-1, sdlc/S-001, sdlc/M-1, sdlc/M-1-e2e, sdlc/M-1-e2e-api; keys ok, command, format, kind, branch; empty stderr; git check-ref-format accepts each
- Actual: All five match; stderr empty; tree and refs unchanged
- Result: pass
- Spec source: R-003..R-007 acceptance
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:70`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-1 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: key output

```
--kind run --n 1 -> exit 0 {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "run", "branch": "sdlc/run-1"}
--kind milestone --id M-1 -> exit 0 branch sdlc/M-1
--kind e2e --id M-1 -> exit 0 branch sdlc/M-1-e2e
--kind e2e-area --id M-1 --area api -> exit 0 branch sdlc/M-1-e2e-api
--kind slice --id S-001 -> exit 0 branch sdlc/S-001
```

transcript: TC-cli-1 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-1.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-2: A config without a usable branchFormat falls back to sdlc/{name}

- Scenario: VS-1; requirements: R-003, R-004, R-005, R-006, R-007
- Given: Six configs: key absent, empty string, 7, null, an array, false
- When: name runs for the five kinds on each config
- Then: Each run gives the default branch
- Expected: format sdlc/{name} and the five default branches
- Actual: All 30 runs match
- Result: pass
- Spec source: R-003..R-007 acceptance (default format)
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:80`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-2 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-2 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-2.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-3: A config branchFormat with a prefix, suffix, leading placeholder or {name:lower} applies to the new kinds

- Scenario: VS-2; requirements: R-003, R-005, R-006
- Given: Configs feature/PROJ-1-{name}, feature/PROJ-1-{name:lower}, x/{name}-wip, {name}/sdlc
- When: name runs for run, milestone, e2e and e2e-area
- Then: branch is prefix + tail + suffix; only the tail is lowercased
- Expected: feature/PROJ-1-M-1, feature/PROJ-1-run-1, feature/PROJ-1-m-1-e2e, x/M-1-e2e-wip, M-1/sdlc; format echoes the config value
- Actual: All 16 runs match; feature/PROJ-1-{name:lower} gives feature/PROJ-1-m-1-e2e with PROJ kept
- Result: pass
- Spec source: R-003, R-005, R-006 quote (tail column) with spec section 1 format rule
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:107`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-3 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: key output

```
--kind e2e --id M-1, branchFormat feature/PROJ-1-{name:lower} -> exit 0 branch feature/PROJ-1-m-1-e2e
```

transcript: TC-cli-3 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-3.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-4: The --format flag wins over the config branchFormat

- Scenario: VS-2; requirements: R-003, R-005, R-006
- Given: Config branchFormat team/{name}
- When: name runs with --format for four formats and four kinds, then once without --format
- Then: The flag format is used and echoed; without the flag the config is used
- Expected: flag results as in TC-cli-3; without the flag sdlc branch team/run-1
- Actual: All 17 runs match
- Result: pass
- Spec source: R-003, R-005, R-006 quote with spec section 1 format rule
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:122`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-4 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-4 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-4.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-5: A missing, empty or wrong part exits 2 and names the needed part

- Scenario: VS-3; requirements: R-003, R-005, R-006, R-007
- Given: A scratch git repo
- When: name runs with --kind run and no --n; milestone and e2e with no --id or --id ''; e2e-area with no --area or --area ''; run with --id only; milestone with --n only
- Then: Each run exits 2 with one JSON error
- Expected: ok false; error names n, id or area; no Traceback; tree unchanged
- Actual: All 10 runs exit 2 with the expected part named
- Result: pass
- Spec source: spec section 2: a missing part is a Fail
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:137`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-5 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: key output

```
--kind run -> exit 2 {"ok": false, "error": "a run branch name needs a non-empty n"}
--kind milestone --id '' -> exit 2 {"ok": false, "error": "a milestone branch name needs a non-empty id"}
--kind e2e-area --id M-1 --area '' -> exit 2 {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
```

transcript: TC-cli-5 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-5.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-6: Valid run counters give run-<int> and pass git

- Scenario: VS-4; requirements: R-003
- Given: A scratch git repo
- When: name --kind run with --n 0, 1, 12, ' 1', +1, 1_000, 010, Arabic-Indic one, a 20-digit integer
- Then: Each exits 0 with run-<int as Python prints it>
- Expected: run-0, run-1, run-12, run-1, run-1, run-1000, run-10, run-1, run-99999999999999999999; git accepts each
- Actual: All match
- Result: pass
- Spec source: R-003 quote run-<n>
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:159`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-6 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-6 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-6.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-7: Refused run counters exit 2 with one JSON error

- Scenario: VS-4; requirements: R-003
- Given: A scratch git repo
- When: name --kind run with --n 1.5, abc, 0x1, '', 1e3, one
- Then: Each exits 2
- Expected: one JSON error naming n, no Traceback
- Actual: All exit 2 with 'argument --n: invalid int value'
- Result: pass
- Spec source: spec section 2 failure contract
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:170`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-7 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-7 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-7.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-8: Corpus run counters never crash; accepted values pass git

- Scenario: VS-4; requirements: R-003
- Given: integer-forms, unicode-digits and huge-integers families
- When: name --kind run --n=<value> for each entry
- Then: Exit 0 or 2, one JSON object, no Traceback, tree unchanged; non-negative accepted values pass git check-ref-format
- Expected: No crash
- Actual: No crash. -1 gives sdlc/run--1 (ADR-20261009-045048 known gap). 4301+ digits exit 2 through the Python int limit; 4300 digits exit 0
- Result: pass
- Spec source: spec section 2 failure contract; R-003
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:180`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-8 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-8 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-8.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-9: Hostile milestone ids and e2e areas never crash, write, import a decoy or expand

- Scenario: VS-5; requirements: R-005, R-006, R-007
- Given: Decoy modules json, argparse, subprocess, os, re planted in the cwd; eight hostile corpus families
- When: name --kind milestone, e2e and e2e-area with --id=<value> or --area=<value>
- Then: Exit 0 or 2, one JSON object, the value appears literally, no Traceback, tree unchanged, no decoy import
- Expected: No crash and no side effect
- Actual: 273 runs: 270 exit 0 with the literal value, 3 empty values exit 2; no Traceback; no decoy fired; 109 accepted branches git refuses (seed, ADR-20261009-045048)
- Result: pass
- Spec source: ADR-20261009-045048; spec section 2 failure contract
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:208`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-9 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-9 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-9.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

log: accepted branches git check-ref-format refuses: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-9-git-refused.txt`

## TC-cli-10: Format-string ids appear literally in the branch

- Scenario: VS-5; requirements: R-005, R-006
- Given: A scratch git repo
- When: name --kind milestone --id with {name}, %s, {0}, ${HOME}, $(id); e2e --id {name} with --format feature/{name:lower}
- Then: The value is not expanded
- Expected: sdlc/{name}, sdlc/%s, sdlc/{0}, sdlc/${HOME}, sdlc/$(id), feature/{name}-e2e
- Actual: All match
- Result: pass
- Spec source: VS-5 notes; R-005, R-006 tail column
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:243`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-10 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-10 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-10.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-11: The slice, e2e-area and state tails stay; e2e and e2e-area do not collide

- Scenario: VS-6; requirements: R-004, R-007
- Given: A scratch git repo
- When: name for slice S-001, e2e-area M-1 api, e2e M-1, and state
- Then: Existing tails are unchanged
- Expected: sdlc/S-001, sdlc/M-1-e2e-api, sdlc/M-1-e2e (not equal), sdlc/state-<14 digits>
- Actual: All match
- Result: pass
- Spec source: R-004, R-007 acceptance
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:258`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-11 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-11 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-11.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-12: verify, attempt and unknown kinds exit 2 without a traceback

- Scenario: VS-6; requirements: R-004, R-007
- Given: A scratch git repo
- When: name --kind verify, attempt (with every part), foo, RUN, Milestone, 'e2e ', E2E
- Then: Each exits 2
- Expected: verify and attempt: 'no branch name is defined for kind'; others: 'is not one of' with the kind list
- Actual: All match; error lists run, slice, milestone, e2e, e2e-area, state
- Result: pass
- Spec source: ADR-20261009-041711; spec section 2 failure contract
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:278`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-12 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: key output

```
--kind foo -> exit 2 {"ok": false, "error": "--kind 'foo' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}
```

transcript: TC-cli-12 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-12.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-13: Running twice and in CI gives the same output and writes nothing

- Scenario: VS-1; requirements: R-003, R-004, R-005, R-006, R-007
- Given: Config branchFormat feature/{name}
- When: name runs twice per kind, the second time with CI=true, TERM=dumb and stdin y
- Then: Same stdout both times
- Expected: identical stdout, exit 0, no prompt, tree unchanged
- Actual: All match
- Result: pass
- Spec source: R-003..R-007 acceptance
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:297`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-13 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-13 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-13.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## TC-cli-14: Repo paths with spaces and unicode, a missing repo, broken config and a bad format

- Scenario: VS-1; requirements: R-003, R-004, R-005, R-006, R-007
- Given: A repo at 'wörk space-*/my repo ✓' with branchFormat feature/{name}
- When: name runs for the five kinds; then on a missing path, on invalid config JSON, and with --format feature/{name}/{name}
- Then: Valid path works; errors exit 2 with one JSON error
- Expected: feature/<tail> for each kind; 'not a directory'; 'not valid JSON'; 'exactly one'
- Actual: All match
- Result: pass
- Spec source: R-003..R-007 acceptance; spec section 2 failure contract
- Test: `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:311`
- Command: `cd "$TMPDIR/sdlc-S-004-v0-cli-0" && VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-14 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

transcript: TC-cli-14 transcripts: `.sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-14.txt`

file-tree: repo and cwd tree diff

```
every run: tree unchanged, no new ref (treeUnchanged true)
```

## Attacks

- Decoy module import from cwd: Decoy json, argparse, subprocess, os and re modules in the cwd during 810 hostile runs. No decoy fired. Result: pass.

## Seeds

- Accepted milestone ids and e2e areas give branches git check-ref-format refuses (`skills/sdlc/branches.py`): 109 of 270 accepted hostile values give a branch git refuses, for example sdlc/../.., sdlc/a b, sdlc/M-1-e2e-a\nb. The format check probes only S-001. ADR-20261009-045048 accepts this gap. A consumer that pushes such a name fails late at git. List: .sdlc/slices/S-004/verification/r0/logs/cli-0-TC-cli-9-git-refused.txt
- Run counter accepts unicode digits, padding and a negative sign (`skills/sdlc/branches.py`): argparse int accepts ' 3', '+1', '1_000', Arabic-Indic and fullwidth digits, and -1. -1 gives sdlc/run--1 (ADR-20261009-045048). A 4301-digit counter exits 2 only through the Python int string limit, with an error that echoes the full value.
- Error text uses 'a e2e' and 'a e2e-area' (`skills/sdlc/branches.py`): The missing-part error reads 'a e2e branch name needs a non-empty id'. The article is wrong before a vowel sound. Cosmetic.
