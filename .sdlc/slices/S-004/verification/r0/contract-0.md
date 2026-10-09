# Verification: S-004, profile contract, part 0, round 0

- Slice: S-004
- Profile: contract
- Round: 0
- Commit: 2b1960c
- Verdict: verified (13 of 13 cases pass)

## Environment

macOS Darwin 25.6.0, Python 3.14.7, git 2.50.1, Node test runner; testkit cli-runner and property from the slice commit; consumer import through sys.path like next-action.py.

## Surface

The surface listing is in `logs/contract-0-surface.txt`. It matches spec section 2 for this slice: `tail`, `name`, `split`, `load_format`, `validate_format` and `Fail`. The TAILS table holds run, slice, milestone, e2e, state and e2e-area. Parse and the list and rules functions belong to later slices.

## TC-contract-1 (VS-1): The CLI prints the five section 1 default names

- Requirements: R-003, R-004, R-005, R-006, R-007
- Given: A scratch git repo with no .sdlc/config.json and no --format.
- When: Run branches.py name for run 1, slice S-001, milestone M-1, e2e M-1 and e2e-area M-1 api.
- Then: Exit 0, one JSON object with keys ok, command, format, kind, branch, empty stderr, no tree or ref change, and the branches sdlc/run-1, sdlc/S-001, sdlc/M-1, sdlc/M-1-e2e, sdlc/M-1-e2e-api. Each branch passes git check-ref-format --branch.
- Expected: Exit 0, one JSON object with keys ok, command, format, kind, branch, empty stderr, no tree or ref change, and the branches sdlc/run-1, sdlc/S-001, sdlc/M-1, sdlc/M-1-e2e, sdlc/M-1-e2e-api. Each branch passes git check-ref-format --branch.
- Actual: All five names match. The key set, the empty stderr, the unchanged tree and the ref check pass.
- Result: pass
- Spec source: R-003, R-004, R-005, R-006, R-007 acceptance
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:90`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-1:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): examples

```
spec section 1 Default name column, executed verbatim
run --n 1 -> sdlc/run-1
slice --id S-001 -> sdlc/S-001
milestone --id M-1 -> sdlc/M-1
e2e --id M-1 -> sdlc/M-1-e2e
e2e-area --id M-1 --area api -> sdlc/M-1-e2e-api
```

Evidence (file-tree): public surface of branches.py

See `.sdlc/slices/S-004/verification/r0/logs/contract-0-surface.txt`.

Evidence (log): node --test output

See `.sdlc/slices/S-004/verification/r0/logs/contract-0-run.txt`.

## TC-contract-2 (VS-1): An absent, empty or non-string branchFormat falls back to sdlc/{name}

- Requirements: R-003, R-005, R-006
- Given: A config.json without branchFormat, and with branchFormat set to '', null, 5, 0, true, false, [], ['x/{name}'] and {}.
- When: Run the five spec examples against each config.
- Then: Each run prints format sdlc/{name} and the default branch.
- Expected: Each run prints format sdlc/{name} and the default branch.
- Actual: All 50 runs print the default format and branch.
- Result: pass
- Spec source: Spec section 2 load_format: config.branchFormat when non-empty, else sdlc/{name}
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:102`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-2:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): configs

```
10 config shapes x 5 kinds = 50 runs, all exit 0 with format sdlc/{name}
```

## TC-contract-3 (VS-1): A consumer import of branches gives the same tails as the CLI

- Requirements: R-003, R-004, R-005, R-006, R-007
- Given: A scratch cwd; python3 -I inserts the skill directory into sys.path and runs import branches, as next-action.py does.
- When: Call tail and name for the five kinds.
- Then: tail gives run-1, S-001, M-1, M-1-e2e, M-1-e2e-api as str; name with sdlc/{name} gives the CLI branches.
- Expected: tail gives run-1, S-001, M-1, M-1-e2e, M-1-e2e-api as str; name with sdlc/{name} gives the CLI branches.
- Actual: All values match and are str.
- Result: pass
- Spec source: Spec section 2 Python API tail and name
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:116`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-3:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): consumer import

```
sys.path.insert(0, skill_dir); import branches
tail('run', n=1)='run-1' tail('milestone', id='M-1')='M-1' tail('e2e', id='M-1')='M-1-e2e'
```

## TC-contract-4 (VS-2): A team prefix applies from config and from --format, and the flag wins

- Requirements: R-003, R-005, R-006
- Given: branchFormat feature/PROJ-1-{name} in config, and a bare repo with --format.
- When: Run name for milestone M-1, run 1 and e2e M-1; then pass --format team/{name:lower} over the config.
- Then: feature/PROJ-1-M-1, feature/PROJ-1-run-1, feature/PROJ-1-M-1-e2e both ways; the flag gives team/m-1-e2e and echoes team/{name:lower}.
- Expected: feature/PROJ-1-M-1, feature/PROJ-1-run-1, feature/PROJ-1-M-1-e2e both ways; the flag gives team/m-1-e2e and echoes team/{name:lower}.
- Actual: All match.
- Result: pass
- Spec source: Spec section 2: --format overrides config.branchFormat; section 1 placeholder rule
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:131`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-4:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): prefix

```
config and flag: feature/PROJ-1-M-1, feature/PROJ-1-run-1, feature/PROJ-1-M-1-e2e
flag over config: team/m-1-e2e
```

## TC-contract-5 (VS-2): Lowercase, suffix and placeholder-first formats

- Requirements: R-003, R-005, R-006
- Given: Formats feature/PROJ-1-{name:lower}, x/{name}-wip, {name}/sdlc and {name:lower}/SDLC.
- When: Run name for run, milestone and e2e kinds.
- Then: {name:lower} lowercases only the tail; literal text before and after is kept as given.
- Expected: {name:lower} lowercases only the tail; literal text before and after is kept as given.
- Actual: feature/PROJ-1-m-1-e2e, x/run-3-wip, x/M-2-e2e-wip, M-1/sdlc, run-1/sdlc, m-1-e2e/SDLC. The prefix PROJ and the suffix SDLC keep their case.
- Result: pass
- Spec source: Spec section 1: {name:lower} lowercases the tail
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:154`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-5:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): formats

```
8 cases pass, each branch passes git check-ref-format
```

## TC-contract-6 (VS-2): Property: name equals prefix + tail + suffix for run, milestone and e2e

- Requirements: R-003, R-005, R-006
- Given: Generated formats: literal prefix and suffix from letters, digits, punctuation, unicode and space; {name} or {name:lower}; generated ids and counters.
- When: Call name twice and tail once per input; run 40 generated valid formats through the CLI.
- Then: name equals prefix + model tail (lowercased for {name:lower}) + suffix; the two calls agree; the CLI format field echoes the format given.
- Expected: name equals prefix + model tail (lowercased for {name:lower}) + suffix; the two calls agree; the CLI format field echoes the format given.
- Actual: 0 violations in 1500 API runs and 40 CLI runs.
- Result: pass
- Spec source: Spec section 2 name and split; section 1 tail table
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:226`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-6:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (property-run): API

```
property name(run|milestone|e2e): seed=20261009 runs=1500 violations=0 (no shrinking in the toolkit)
```

Evidence (property-run): CLI

```
cli format echo: seed=20280011 runs=40 violations=0
```

## TC-contract-7 (VS-3): The Python API raises Fail that names a missing part

- Requirements: R-003, R-005, R-006, R-007
- Given: Consumer import.
- When: Call tail('run'), n=None, n='', id='1'; tail('milestone'), id='', n=1; tail('e2e'), id=None, id=''; tail('e2e-area', id='M-1'), area=''.
- Then: Each raises Fail ending in 'non-empty <part>'; tail('run', n=0) gives run-0.
- Expected: Each raises Fail ending in 'non-empty <part>'; tail('run', n=0) gives run-0.
- Actual: All 12 raise Fail naming n, id or area; n=0 gives run-0 and sdlc/run-0.
- Result: pass
- Spec source: Spec section 2: A missing part is a Fail
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:252`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-7:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): missing parts

```
tail('run') -> Fail: a run branch name needs a non-empty n
tail('milestone', id='') -> Fail: ... non-empty id
tail('e2e', id=None) -> Fail: ... non-empty id
```

## TC-contract-8 (VS-3): The CLI exits 2 with one JSON error for a missing or wrong part

- Requirements: R-003, R-005, R-006, R-007
- Given: A scratch git repo.
- When: Run name --kind run (no --n, and with --id 1), milestone and e2e (no --id, --id '', --n 1), e2e-area (no --area, --area '').
- Then: Exit 2, one JSON line, ok false, error names the part, no Traceback, no tree change. --n 0 gives sdlc/run-0.
- Expected: Exit 2, one JSON line, ok false, error names the part, no Traceback, no tree change. --n 0 gives sdlc/run-0.
- Actual: All 9 refusals and the --n 0 case match.
- Result: pass
- Spec source: Spec section 2: exit 2 with {ok: false, error} on bad input
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:276`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-8:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): refusals

```
--kind run --id 1 -> exit 2 {"ok": false, "error": "a run branch name needs a non-empty n"}
```

## TC-contract-9 (VS-4): The Python API run counter edge forms give a str or Fail

- Requirements: R-003
- Given: Consumer import.
- When: Call tail('run', n=...) with 7, '7', True, False, 0, -1, 12, 1.5, nan, inf, -0.0, [], {}, 'x', 2**53, 10**4299, 10**5000.
- Then: n=7, '7' and True give a str or Fail (plan note).
- Expected: n=7, '7' and True give a str or Fail (plan note).
- Actual: 7 and '7' give run-7, True gives run-True. Every value gives a str except 10**5000, which raises ValueError (seed 1).
- Result: pass
- Spec source: Plan VS-4 note; spec section 2 tail
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:294`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-9:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): edge forms

```
True -> run-True; 1.5 -> run-1.5; nan -> run-nan; [] -> run-[]; -1 -> run--1 (ADR-20261009-045048)
10**5000 -> ValueError: Exceeds the limit (4300 digits) for integer string conversion
```

Evidence (log): node --test output with the full table

See `.sdlc/slices/S-004/verification/r0/logs/contract-0-run.txt`.

## TC-contract-10 (VS-4): The CLI --n edge forms give run-<int> or exit 2

- Requirements: R-003
- Given: A scratch git repo.
- When: Run name --kind run with --n from a hand list and the integer-forms, unicode-digits and huge-integers corpus families.
- Then: A value int() accepts gives sdlc/run-<int>; a value int() refuses exits 2 with one JSON error; no Traceback; non-negative names pass git check-ref-format.
- Expected: A value int() accepts gives sdlc/run-<int>; a value int() refuses exits 2 with one JSON error; no Traceback; non-negative names pass git check-ref-format.
- Actual: All 52 values match. Unicode digits normalize (\u0661 -> run-1). A 4300-digit value gives a 4309-character branch that check-ref-format accepts (seed 2).
- Result: pass
- Spec source: Spec section 2: exit 2 on bad input; plan VS-4 note
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:306`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-10:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): selection

```
"0x1" -> exit 2 invalid int value
" 1" -> sdlc/run-1
"1_000" -> sdlc/run-1000
"\u0661" -> sdlc/run-1
"-1" -> sdlc/run--1 (ADR-20261009-045048)
"9"x4301 -> exit 2 invalid int value
```

Evidence (log): node --test output with every value

See `.sdlc/slices/S-004/verification/r0/logs/contract-0-run.txt`.

## TC-contract-11 (VS-6): The slice, state and e2e-area tails stay; verify, attempt and unknown kinds are refused

- Requirements: R-004, R-007
- Given: Consumer import and a scratch git repo.
- When: Call tail for slice, state, e2e-area and e2e; run name for verify, attempt and foo.
- Then: S-001, state-20261008101500, M-1-e2e-api, M-1-e2e (an extra area does not change e2e); verify and attempt exit 2 with 'no branch name is defined for kind'; foo exits 2 and lists the kinds.
- Expected: S-001, state-20261008101500, M-1-e2e-api, M-1-e2e (an extra area does not change e2e); verify and attempt exit 2 with 'no branch name is defined for kind'; foo exits 2 and lists the kinds.
- Actual: All match.
- Result: pass
- Spec source: R-004, R-007 acceptance; ADR-20261009-041711
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:336`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-11:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): regression

```
tail('e2e', id='M-1', area='api') -> M-1-e2e
--kind verify -> exit 2 no branch name is defined for kind 'verify'
--kind foo -> exit 2 --kind 'foo' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt
```

## TC-contract-12 (VS-6): Property: every TAILS kind gives a str and sdlc/ names

- Requirements: R-004, R-007
- Given: Generated non-empty parts for run, slice, milestone, e2e, e2e-area and state, and generated formats.
- When: Call tail and name.
- Then: tail returns the model tail as str; name with sdlc/{name} starts with sdlc/ and equals sdlc/ + tail; output is the same across calls.
- Expected: tail returns the model tail as str; name with sdlc/{name} starts with sdlc/ and equals sdlc/ + tail; output is the same across calls.
- Actual: 0 violations.
- Result: pass
- Spec source: Spec section 1 tail table; section 2 name
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:359`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-12:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (property-run): all kinds

```
property tail(all kinds): seed=20265637 runs=1500 violations=0
property name(sdlc/{name}): seed=20262886 runs=1500 violations=0
```

## TC-contract-13 (VS-1): branches.py imports only the standard library

- Requirements: R-003
- Given: The slice commit's branches.py.
- When: Parse its imports with ast and compare with sys.stdlib_module_names.
- Then: No import outside the standard library.
- Expected: No import outside the standard library.
- Actual: Imports: argparse, datetime, json, os, re, subprocess, sys. None is outside the standard library.
- Result: pass
- Spec source: Spec section 2: Python 3 standard library only
- Test: `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:374`
- Command: `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-13:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

Evidence (type-check): imports

```
['argparse', 'datetime', 'json', 'os', 're', 'subprocess', 'sys']
non-stdlib: []
```

## Attacks

None. The security profile covers the hostile inputs.

## Seeds

- tail('run', n=10**5000) raises ValueError, not Fail (`skills/sdlc/branches.py`): Python 3.11+ limits int-to-str conversion to 4300 digits. The f-string in the run builder raises ValueError for a larger int. The CLI cannot reach it, because argparse refuses the same value. An API caller with a computed counter gets an exception outside the Fail contract. Wrap the build in tail with a Fail, or check n.
- The CLI accepts a 4300-digit --n and prints a 4309-character branch (`skills/sdlc/branches.py`): git check-ref-format accepts it, but a loose ref file name over 255 bytes cannot exist on common file systems. The loop passes counters from 1, so this is a robustness gap only. Consider a length check in validate or a bound on n.
- tail('run', n=...) accepts any type (`skills/sdlc/branches.py`): n=True gives run-True, n=1.5 gives run-1.5, n=[] gives run-[]. ADR-20261009-045048 accepts no shape check; the parse row ^run-(\d+)$ will not read these back. S-007 owns the round trip.
