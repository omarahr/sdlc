# S-008 verify-cli, round 1, part 0

- Slice: S-008
- Profile: cli
- Round: 1 (plan round 0)
- Commit: 35c73b3
- Verdict: verified. 14 cases pass, 0 fail.

## Environment

Python 3 (python3 on PATH), Node v24.19.0, cli-runner and attack-corpus testkit, scratch git repo

Command: `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`

Result: 14 tests, 14 pass (logs/cli-0-run.txt).

## TC-cli-1 (VS-1): run-N gives kind run with an integer n

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: kind run, integer n, exit 0, tree unchanged
- Expected: kind run, integer n, exit 0, tree unchanged
- Actual: as expected for run-3, run-0, run-12, run-007 and null for run-x, run-, run-3-x, run--1
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:22

Evidence (transcript): parse transcripts - `.sdlc/slices/S-008/verification/r1/logs/cli-0-transcripts.txt`

## TC-cli-2 (VS-2): M-N gives milestone and never swallows e2e tails

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: milestone for M-2, null for M-, M-x, m-2; e2e tails are not milestone; m-2 is milestone under name:lower
- Expected: milestone for M-2, null for M-, M-x, m-2; e2e tails are not milestone; m-2 is milestone under name:lower
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:39

Evidence (transcript): parse transcripts - `.sdlc/slices/S-008/verification/r1/logs/cli-0-transcripts.txt`

## TC-cli-3 (VS-3): M-N-e2e gives kind e2e and an area tail does not

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: e2e with id M-2; M-2-e2e-api is not e2e; M-2-e2e- is null
- Expected: e2e with id M-2; M-2-e2e-api is not e2e; M-2-e2e- is null
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:49

Evidence (transcript): parse transcripts - `.sdlc/slices/S-008/verification/r1/logs/cli-0-transcripts.txt`

## TC-cli-4 (VS-4): e2e-area keeps a dashed area whole

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: area api-v2, a, 0, e2e, v2-api-3 and a 500 character area stay whole
- Expected: area api-v2, a, 0, e2e, v2-api-3 and a 500 character area stay whole
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:58

Evidence (transcript): parse transcripts - `.sdlc/slices/S-008/verification/r1/logs/cli-0-transcripts.txt`

## TC-cli-5 (VS-5): First-match order under prefixed and suffixed formats

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: rows 1 to 4 hold under feature/PROJ-1-{name} and {name}-wip
- Expected: rows 1 to 4 hold under feature/PROJ-1-{name} and {name}-wip
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:65

Evidence (transcript): parse transcripts - `.sdlc/slices/S-008/verification/r1/logs/cli-0-transcripts.txt`

## TC-cli-6 (VS-7): Hostile tails never crash and never gain a kind

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: every hostile tail gives one JSON object, no traceback, tree unchanged; NUL gives a spawn error; unknown flag exits non-zero
- Expected: every hostile tail gives one JSON object, no traceback, tree unchanged; NUL gives a spawn error; unknown flag exits non-zero
- Actual: as expected; the matrix is in logs/cli-0-vs7-matrix.json
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:79

Evidence (transcript): parse transcripts - `.sdlc/slices/S-008/verification/r1/logs/cli-0-transcripts.txt`

Evidence (log): hostile matrix - `.sdlc/slices/S-008/verification/r1/logs/cli-0-vs7-matrix.json`

## TC-cli-7 (VS-7): run-N with 5000 digits gives one JSON object, not a traceback (re-run of the failed round 0 case)

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: exit 0, one JSON object, no traceback
- Expected: exit 0, one JSON object, no traceback
- Actual: exit 0, kind run, the n field holds all 5000 digits. The fix 35c73b3 holds.
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:107

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-8 (VS-7): run-N at the int string limit boundary and far beyond it

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: lengths 1, 4299, 4300, 4301, 5000, 20000, 100000 digits all give kind run, the full tail, exit 0, under 20 s
- Expected: lengths 1, 4299, 4300, 4301, 5000, 20000, 100000 digits all give kind run, the full tail, exit 0, under 20 s
- Actual: all pass; the 100000 digit case takes 137 ms
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:23

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-9 (VS-7): The 5000 digit n is printed exactly

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: stdout holds the exact digit string
- Expected: stdout holds the exact digit string
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:34

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-10 (VS-7): Huge integers in verify round, verify part, attempt n, milestone id, e2e and e2e-area rows

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: 6000 digit values give the right kind and one JSON object each
- Expected: 6000 digit values give the right kind and one JSON object each
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:41

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-11 (VS-5): Huge run-N under prefixed, suffixed and name:lower formats

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: kind run and no traceback in each format
- Expected: kind run and no traceback in each format
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:57

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-12 (VS-7): Huge unicode digit run-N

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: 5000 Arabic-indic digits give kind run, no traceback
- Expected: 5000 Arabic-indic digits give kind run, no traceback
- Actual: as expected (the plan keeps unicode digits as digits)
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:66

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-13 (VS-7): The huge-integers attack corpus through run-, M- and attempt- tails

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: no traceback and one JSON object for every entry
- Expected: no traceback and one JSON object for every entry
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:72

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## TC-cli-14 (VS-7): Run the huge case twice (idempotency)

- Given: A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit
- When: branches.py parse runs as a developer runs it, with --branch and --format
- Then: identical stdout both times
- Expected: identical stdout both times
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:86

Evidence (transcript): fix transcripts (digit lengths shortened in the log) - `.sdlc/slices/S-008/verification/r1/logs/cli-0-fix-transcripts.txt`

## Fix check

Round 0 case TC-cli-7 failed with a ValueError traceback for a 5000 digit run number. The fix 35c73b3 lifts the limit. The case now passes. Lengths 4299, 4300 and 4301 and up to 100000 digits all pass.

Sample transcript:
```
$ python3 branches.py parse --repo <repo> --branch=sdlc/run-9...(100000 digits) '--format=sdlc/{name}'
exit: 0 (137 ms)
{"ok": true, "command": "parse", ..., "kind": "run", "n": 9...(100000 digits), "known": null}
```

## Attacks

None beyond the cases above.

## Seeds

- parse accepts a trailing newline: Python $ matches before a final newline. sdlc/M-2\n gives milestone M-2 and the tail keeps the newline. Git refuses newlines in branch names. Unchanged from round 0. (skills/sdlc/branches.py)
- parse treats unicode digits as digits: sdlc/run-٣ gives n 3 and sdlc/M-٢ gives milestone M-٢. The plan keeps this. Unchanged from round 0. (skills/sdlc/branches.py)
- slash in an area is accepted (note only): sdlc/M-2-e2e-a/b gives e2e-area with area a/b, per ADR-20261009-173303-decision-judge-S-008-a88a. (skills/sdlc/branches.py)
- the fix lifts the int string limit for the whole process: branches.py calls sys.set_int_max_str_digits(0) at import. A caller that imports branches.py also loses the limit. A 100000 digit run number parses in 137 ms, so no slowdown shows today. A cap on digit count would keep the limit. (skills/sdlc/branches.py)
