# Verify cli: S-008, round 0, part 0

- Slice: S-008
- Profile: cli
- Commit: 3ce4bff
- Verdict: refuted (failing case: TC-cli-7)

Environment: Python 3.14.7, Node test runner, cli-runner testkit (scratch HOME, TZ=UTC), scratch git repo, branches.py from a worktree of sdlc/S-008.

## TC-cli-1 (VS-1): run-N gives kind run with an integer n

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: branches.py parse for run-3, run-0, run-12, run-007, run-x, run-, run-3-x, run--1
- Then: Exit 0. run-3, run-0, run-12 and run-007 give kind run, n 3, 0, 12 and 7 as integers, and no id. The others give kind null. The repo tree does not change.
- Expected: Exit 0. run-3, run-0, run-12 and run-007 give kind run, n 3, 0, 12 and 7 as integers, and no id. The others give kind null. The repo tree does not change.
- Actual: Exit 0. run-3, run-0, run-12 and run-007 give kind run, n 3, 0, 12 and 7 as integers, and no id. The others give kind null. The repo tree does not change.
- Result: pass
- Spec source: R-102 acceptance
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:22`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-2 (VS-2): M-N gives milestone and never swallows e2e tails

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: parse M-2, M-, M-x, M-2-e2e, M-2-e2e-api, m-2 (default and {name:lower})
- Then: M-2 is milestone. M- and M-x are null. E2e tails are not milestone. m-2 is null by default and milestone under {name:lower}.
- Expected: M-2 is milestone. M- and M-x are null. E2e tails are not milestone. m-2 is null by default and milestone under {name:lower}.
- Actual: M-2 is milestone. M- and M-x are null. E2e tails are not milestone. m-2 is null by default and milestone under {name:lower}.
- Result: pass
- Spec source: R-103 quote
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:39`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-3 (VS-3): M-N-e2e gives kind e2e and an area tail does not

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: parse M-2-e2e, M-2-e2e-api, M-2-e2e-, M-2-e2e-x, M-2-e2ex
- Then: M-2-e2e is e2e with id M-2. M-2-e2e-api is not e2e. M-2-e2e- and M-2-e2ex are null.
- Expected: M-2-e2e is e2e with id M-2. M-2-e2e-api is not e2e. M-2-e2e- and M-2-e2ex are null.
- Actual: M-2-e2e is e2e with id M-2. M-2-e2e-api is not e2e. M-2-e2e- and M-2-e2ex are null.
- Result: pass
- Spec source: R-104 quote
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:49`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-4 (VS-4): e2e-area keeps a dashed area whole

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: parse M-2-e2e-<area> for api-v2, a, 0, e2e, v2-api-3 and a 500-character area
- Then: Kind e2e-area, id M-2 and the full area text for each.
- Expected: Kind e2e-area, id M-2 and the full area text for each.
- Actual: Kind e2e-area, id M-2 and the full area text for each.
- Result: pass
- Spec source: R-105 quote
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:58`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-5 (VS-5): First-match order under prefixed and suffixed formats

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: parse rows 1 to 4 under feature/PROJ-1-{name} and {name}-wip; M-2-e2e-api-wip; wrong prefix; missing suffix
- Then: Each row classifies as under the default format. The area is api. A wrong prefix or a missing suffix gives kind null.
- Expected: Each row classifies as under the default format. The area is api. A wrong prefix or a missing suffix gives kind null.
- Actual: Each row classifies as under the default format. The area is api. A wrong prefix or a missing suffix gives kind null.
- Result: pass
- Spec source: R-102 to R-105 quotes
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:65`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-6 (VS-7): Hostile tails never crash and never gain a kind (except TC-cli-7)

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: parse 25 hostile tails: newline, tab, CR, unicode digits, flag-like values, control characters, slash in area, 5000-digit M-N, 4300-digit run-N, empty
- Then: Exit 0 with one JSON object, no traceback, tree unchanged. A NUL argument gives a spawn error. An unknown flag gives a nonzero exit.
- Expected: Exit 0 with one JSON object, no traceback, tree unchanged. A NUL argument gives a spawn error. An unknown flag gives a nonzero exit.
- Actual: Exit 0 with one JSON object, no traceback, tree unchanged. A NUL argument gives a spawn error. An unknown flag gives a nonzero exit.
- Result: pass
- Spec source: R-102 to R-105 quotes; ADR-20261009-173303-decision-judge-S-008-a88a for the slash
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:79`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- Repo tree after each parse call: treeUnchanged is true for all 25 calls.
- Result matrix: tail, exit, kind, id or n, area: `.sdlc/slices/S-008/verification/r0/logs/cli-0-vs7-matrix.json`
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-7 (VS-7): run-N with 5000 digits gives one JSON object, not a traceback

- Given: Scratch git repo, shipped branches.py, format sdlc/{name}
- When: branches.py parse --branch=sdlc/run-<5000 nines>
- Then: Exit 0 or 2 with one JSON object on stdout and no traceback.
- Expected: Exit 0 or 2 with one JSON object on stdout and no traceback.
- Actual: Exit 1, empty stdout, stderr holds a traceback that ends in ValueError at branches.py line 150 (int(value) in parse).
- Result: fail
- Spec source: Spec branches.py section: every command prints one JSON object, and exits 2 with {ok:false,error} on bad input
- Test: `.sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:107`
- Command: `VERIFY_WORKTREE=<worktree of sdlc/S-008> VERIFY_OUT=<main>/.sdlc/slices/S-008/verification/r0/logs node --test .sdlc/slices/S-008/verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs`

Evidence:
- CLI transcripts of the run: `.sdlc/slices/S-008/verification/r0/logs/cli-0-transcripts.txt`

## Failing transcript (TC-cli-7)
```
$ python3 skills/sdlc/branches.py parse --repo <scratch> --branch=sdlc/run-<5000 nines>
exit: 1
--- stdout
(empty)
--- stderr
Traceback (most recent call last):
  ...
  File "skills/sdlc/branches.py", line 150, in parse
    result[part] = int(value) if part in INTEGER_PARTS else value
ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 5000 digits
```

A 4300-digit run-N passes. A 5000-digit M-N passes, because id stays a string.

## Attacks
None.

## Seeds
- parse accepts a trailing newline: Python $ matches before a final newline. sdlc/M-2\n gives milestone M-2, run-3\n gives run n 3, M-2-e2e\n gives e2e, and M-2-e2e-api\n gives area api. The tail field keeps the newline. Git refuses newlines in branch names, so only a direct call reaches this. (skills/sdlc/branches.py)
- parse treats unicode digits as digits: sdlc/run-٣ gives n 3, sdlc/M-٢ gives milestone M-٢, and sdlc/M-2-e2e-١ gives area ١. The pattern \d matches non-ASCII digits. The plan keeps this behavior. (skills/sdlc/branches.py)
- slash in an area is accepted (note only): sdlc/M-2-e2e-a/b gives kind e2e-area with area a/b. ADR-20261009-173303-decision-judge-S-008-a88a keeps this behavior. (skills/sdlc/branches.py)
