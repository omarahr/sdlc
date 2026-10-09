# Verification cli-1, S-016, round 0

Slice: S-016. Profile: cli. Part: 1. Round: 0. Commit: e55f687. Verdict: verified for VS-7 (307 tests pass, 2 seeds).

Environment: Python 3.14.7, node, git, gh and glab shims from the testkit (no network)

## TC-cli-1: Hostile affix for starts_with, ends_with and contains never crashes preflight

- Given: pr mode, gh shim returns one derivable rule whose pattern comes from the injection, control-chars, flag-like-values, format-strings and oversized families (195 runs)
- When: run branches.py preflight
- Then: exit 0 or 1, one JSON object, no traceback, ok matches the exit code, a failing verdict has a suggestion, no line break except from the input
- Actual: 195 of 195 runs hold; derived false keeps format sdlc/{name}; when the pattern has no CR or LF the suggestion stays one line
- Result: pass
- Spec source: R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes
- Test: .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:44
- Command: `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`

```
(see logs/cli-1-transcripts.txt)
```

## TC-cli-2: Hostile regex pattern never crashes preflight and keeps one suggestion line

- Given: pr mode, regex rule from the corpus plus catastrophic, unbalanced, bad escape, lookahead, backreference, flags, unicode class, huge repeat, deep nesting, 100000-char and verbose patterns
- When: run preflight
- Then: exit 0 or 1, no traceback, under 15 s, suggestion one line without CR or LF in input
- Actual: every run passes; one run took 14.7 s (nested repeat a{1000}^3); see seed
- Result: pass
- Spec source: R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes
- Test: .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:72
- Command: `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`

```
(see logs/cli-1-transcripts.txt)
```

## TC-cli-3: Hostile rule label does not break exit code or JSON

- Given: pr mode, regex rule named by each injection, control-chars and format-strings value
- When: run preflight
- Then: exit 1, JSON intact, suggestion non-empty
- Actual: all runs hold; labels with CR or LF split the suggestion (seed)
- Result: pass
- Spec source: R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes
- Test: .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:88
- Command: `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`

```
(see logs/cli-1-transcripts.txt)
```

## TC-cli-4: Hostile --branch value in mr mode gives a rename line, exit 1, no traceback

- Given: mr mode, glab shim returns regex ^feature/.*$, --branch takes each corpus value that argv can carry
- When: run preflight --mode mr --branch <value>
- Then: exit 1 with one rename line, or the documented exit 2 JSON error for a value that argparse reads as a flag; no traceback; suggestion never starts with a dash
- Actual: all runs hold; values with CR or LF give a multi-line rename line (seed); flag-like values give exit 2 with a JSON error
- Result: pass
- Spec source: R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes
- Test: .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:96
- Command: `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`

```
(see logs/cli-1-transcripts.txt)
```

## TC-cli-5: Flag-like --branch=<value> form keeps format and derived

- Given: mr mode, --branch=--help, --branch=-x and --branch=--format=evil/{name}
- When: run preflight
- Then: ok false, format sdlc/{name}, derived false, exit 1
- Actual: holds for all three
- Result: pass
- Spec source: R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes
- Test: .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:108
- Command: `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`

```
(see logs/cli-1-transcripts.txt)
```

## Seeds

- suggestion holds raw CR or LF from a rule pattern, rule label or branch name: A pattern, label or --branch value with a line break is copied into the suggestion line, so the suggestion splits into several lines and a forged second line can start with rename the branch. The JSON stays valid because the encoder escapes it. 26 runs in cli-1-seeds.txt. The spec states no single-line rule for hostile input, so this does not refute.
- _regex_literal expands nested repeats without a size limit: Pattern ^((a{1000}){1000}){1000}/x$ makes preflight take 14.7 s. Pattern ^((a{10000}){10000}){10000}/x$ made the process grow until the system killed it (exit 137, 71 s). The pattern comes from a forge rule, so a repository admin controls it. The spec states no time or size limit for this slice, so this does not refute. A cap on the built string length would close it.
