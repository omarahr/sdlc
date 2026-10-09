# S-009 verify-security r0 part 0

Slice S-009, profile security, round 0, commit d29cba7. Verdict: pass (7 of 7 tests, no in-scope break).

Environment: Python 3.14.7, Node 24.19, scratch git repo from cli-runner.

Charter VS-2: explore the verify row with the attack corpus to find a raise or a wrong verify, using R-107 and the VS-2 notes (parse returns a value or null, never raises). Threat model: branch names are untrusted text; the spec states no size limit.

Command: `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`

## TC-security-1 1072 corpus tails across 8 wrappers never raise
Expected: every call returns a value or null; round, part and n are integers. Result: pass. Test: `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:22`.
```
134 corpus entries x 8 wrappers (verify, attempt, state, id positions): 0 raised
```

## TC-security-2 Huge digit runs (5k, 100k) in round, part, n, state
Expected: return without raising. Result: pass. Test: `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:38`.
```
digit runs of 5000 and 100000 and 50000 zeros: all return
```

## TC-security-3 Shape attacks on the verify row
Expected: empty profile, missing part: not verify; traversal and shell tails: null; confusable profile: null. Result: pass. Test: `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:45`.
```
see logs/security-0-run.txt lines 2-12
```

## TC-security-5 Wrong prefix or suffix
Expected: null under feature/PROJ-1-{name} and {name}-wip; suffix does not leak into part. Result: pass. Test: `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:82`.
```
-wip suffix: verify part 0 profile cli
```

## TC-security-6 Ledger known flag with hostile ids
Expected: S-002 false, S-0011 false, S-001 true, ledger spelling under {name:lower}. Result: pass. Test: `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:96`.
```
known true/false as expected
```

## TC-security-7 CLI parse of hostile branches
Expected: exit 0 or 2, JSON output, no traceback, repo tree unchanged. Result: pass. Test: `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:108`.
```
7 branches incl. 100 kB tail and flag-like -x and --help: all status 0, JSON, tree unchanged
```

## Attacks
| id | charter | observed | result |
|---|---|---|---|
| AT-1 | Explore the verify, attempt and state rows with the full attack-corpus to find a raise (R-107: parse returns a value or null) | no exception, 0 retries | held |
| AT-2 | Explore integer groups with huge digit runs to find a raise | returns | held |
| AT-3 | Explore verify boundaries with empty profile, no part, unicode, traversal, shell | empty profile and no part give slice; others null | held |
| AT-4 | Trailing newline and non-ASCII digits (threat model: S-007 left open) | newline tail gives verify with the newline in tail; Arabic-Indic digits give integer 3 | out-of-scope |
| AT-5 | Prefix and suffix format spoofing | null | held |
| AT-6 | Ledger spoofing with near ids | known false; lower-case id parses as verify by the spec regex (.+) | held |
| AT-7 | CLI with flag-like and oversized branches | JSON, tree unchanged | held |
| AT-8 | Quadratic backtracking in verify row | 1.1 s at 8000 repeats, 0.28 s at 4000 (quadratic) | out-of-scope |

## Seeds
- verify row accepts a trailing newline: parse('sdlc/{name}','sdlc/S-001-v0-cli-0\n') gives kind verify, because $ matches before a final newline; the newline stays in tail. Same open item as S-007.
- Unicode digits accepted by \d in round, part, n, ts: Arabic-Indic digits parse as integers (round 3, part 3). S-007 left this open. Use re.ASCII or [0-9].
- Verify row backtracks quadratically (limits): A 40 kB tail made of repeated -v0-a takes 1.1 s for 8000 repeats and grows with the square. The spec states no limit, so this goes to verify-limits.
- Verify id is not checked against the slice id shape: --force-v0-cli-0 and s-001-v0-cli-0 parse as verify with a flag-like or lower-case id, as the spec regex (.+) allows. Callers must not pass id to a command without the known flag.
- testkit: callPython hangs intermittently on a 200 kB input: One run in about six of the same 200 kB call timed out under node spawnSync, while 60 runs of the same call from Python never timed out. Product parse took 3 ms. The test retries up to 3 times.

Logs: logs/security-0-run.txt, logs/security-0-timing.txt.
