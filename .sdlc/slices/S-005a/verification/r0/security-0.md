# S-005a security verification, round 0, part 0

- Slice: S-005a
- Profile: security
- Round: 0
- Commit: de9cf46
- Verdict: not refuted. 12 of 12 cases pass. All 10 attacks held.

## Environment

macOS (Darwin 25.6.0), Python 3.14.7, Node v24.19.0, git 2.50.1; branches.py run by testkit cli-runner in a scratch git repo with TZ=UTC; Python API through python3 -I

## Threat model boundary

The callers of `branches.py name` are the loop and its agents. The spec treats them as trusted. It states no validation rule for verify or attempt part values beyond a non-empty part (plan T-R-009b, T-R-010b). Thus ref-unsafe names from hostile parts are seeds, not blockers. Missing parts, crashes, shell runs and ref changes are in scope.

## Charters

- VS-4: Explore the verify CLI and `tail('verify')` with missing parts and the attack corpus to find a crash, a silent default, a shell run or a ref change (R-009 acceptance, VS-4 notes).
- VS-6: Explore the attempt CLI and `tail('attempt')` with missing parts and the attack corpus to find a crash, a silent default, a shell run or a file change outside the scratch repo (R-010 acceptance, VS-6 notes).

## TC-security-1 (VS-4): The acceptance verify name holds as the attack baseline

- Given: a scratch git repo with sdlc/S-001
- When: name --kind verify --id S-001 --round 0 --profile http-api --part 0
- Then: exit 0, one JSON line, branch sdlc/S-001-v0-http-api-0
- Expected: exit 0, one JSON line, branch sdlc/S-001-v0-http-api-0
- Actual: sdlc/S-001-v0-http-api-0, exit 0, tree unchanged
- Result: pass
- Spec source: R-009 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:72`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: name --kind verify --id S-001 --round 0 --profile http-api --part 0
observed: sdlc/S-001-v0-http-api-0, exit 0, tree unchanged
```

## TC-security-2 (VS-4): Each missing or empty verify part exits 2 with one JSON error that names the part

- Given: the baseline verify arguments
- When: omit, or give as empty, each of --id, --round, --profile, --part; call tail('verify') with None and '' for each part
- Then: exit 2, one JSON error naming the part, no traceback, no ref; tail raises Fail naming the part; round 0 and part 0 are kept
- Expected: exit 2, one JSON error naming the part, no traceback, no ref; tail raises Fail naming the part; round 0 and part 0 are kept
- Actual: 8 of 8 CLI calls exit 2 and name the part (empty --round and --part are refused by argparse with 'argument --round: invalid int value'); 8 of 8 API calls raise Fail naming the part; tail with round 0 and part 0 gives S-001-v0-http-api-0
- Result: pass
- Spec source: R-009 acceptance; VS-4 notes
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:79`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: omit, or give as empty, each of --id, --round, --profile, --part; call tail('verify') with None and '' for each part
observed: 8 of 8 CLI calls exit 2 and name the part (empty --round and --part are refused by argparse with 'argument --round: invalid int value'); 8 of 8 API calls raise Fail naming the part; tail with round 0 and part 0 gives S-001-v0-http-api-0
```

## TC-security-3 (VS-4): Malformed --round and --part exit 2 or give an ASCII integer, never a crash

- Given: the baseline verify arguments
- When: give 75 hostile values to --round and to --part (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, 1.5, 0x1, ' 1', abc)
- Then: each call exits 0 with an ASCII integer in the name, or exits 2 with one JSON error; no traceback, no stderr, no tree change
- Expected: each call exits 0 with an ASCII integer in the name, or exits 2 with one JSON error; no traceback, no stderr, no tree change
- Actual: 150 calls: 102 exit 2, 48 exit 0. Every exit 0 holds an ASCII integer. Accepted forms include -1, +1, 1_000, padded, unicode digits and 4300 digits (argparse int). No crash
- Result: pass
- Spec source: VS-4 notes; R-009 tail shape
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:100`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: give 75 hostile values to --round and to --part (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, 1.5, 0x1, ' 1', abc)
observed: 150 calls: 102 exit 2, 48 exit 0. Every exit 0 holds an ASCII integer. Accepted forms include -1, +1, 1_000, padded, unicode digits and 4300 digits (argparse int). No crash
```

## TC-security-4 (VS-4): Hostile --id and --profile never crash, never change state, and are used verbatim behind the sdlc/ prefix

- Given: the baseline verify arguments
- When: give each of 125 argv-safe corpus values to --id and to --profile
- Then: exit 0 with sdlc/<id>-v0-<profile>-0 verbatim, or exit 2; one JSON line; no tree change
- Expected: exit 0 with sdlc/<id>-v0-<profile>-0 verbatim, or exit 2; one JSON line; no tree change
- Actual: 250 calls, all clean. Every exit 0 is the verbatim tail behind sdlc/. 73 ok names fail git check-ref-format (control chars, '..', '@{', spaces): no requirement for this kind asks name to check the full ref, so this is a known seed, not a failure
- Result: pass
- Spec source: VS-4 notes; seed already in barraiser.json (name does not run git check-ref-format on the full name)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:119`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: give each of 125 argv-safe corpus values to --id and to --profile
observed: 250 calls, all clean. Every exit 0 is the verbatim tail behind sdlc/. 73 ok names fail git check-ref-format (control chars, '..', '@{', spaces): no requirement for this kind asks name to check the full ref, so this is a known seed, not a failure
```

## TC-security-5 (VS-4): A profile that holds a placeholder is not expanded a second time

- Given: a lower format feature/{name:lower}
- When: --profile '{name}' and --profile '{name:lower}{0}%s'
- Then: the profile text stays literal
- Expected: the profile text stays literal
- Actual: feature/s-001-v0-{name}-0 and sdlc/S-001-v0-{name:lower}{0}%s-0
- Result: pass
- Spec source: R-009 tail; spec section 2 name(fmt, kind, **parts)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:142`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: --profile '{name}' and --profile '{name:lower}{0}%s'
observed: feature/s-001-v0-{name}-0 and sdlc/S-001-v0-{name:lower}{0}%s-0
```

## TC-security-6 (VS-4): Abbreviated, duplicated and equals-form flags resolve to one flag or exit 2

- Given: the baseline verify arguments
- When: append --p, --pr, --pa, --r, --ro and longer prefixes with 7; give --profile twice; give --profile=--format
- Then: an ambiguous prefix exits 2; others resolve to one flag; no crash
- Expected: an ambiguous prefix exits 2; others resolve to one flag; no crash
- Actual: --p and --r exit 2 (ambiguous). --pr/--pa/--ro resolve to profile/part/round (allow_abbrev, seed already in barraiser.json). Last --profile wins. --profile=--format gives sdlc/S-001-v0---format-0
- Result: pass
- Spec source: VS-4 notes
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:151`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: append --p, --pr, --pa, --r, --ro and longer prefixes with 7; give --profile twice; give --profile=--format
observed: --p and --r exit 2 (ambiguous). --pr/--pa/--ro resolve to profile/part/round (allow_abbrev, seed already in barraiser.json). Last --profile wins. --profile=--format gives sdlc/S-001-v0---format-0
```

## TC-security-7 (VS-6): The acceptance attempt name holds and n = 0 is not dropped

- Given: a scratch git repo
- When: name --kind attempt --id S-001 --n 1, then --n 0
- Then: sdlc/S-001-attempt-1 and sdlc/S-001-attempt-0
- Expected: sdlc/S-001-attempt-1 and sdlc/S-001-attempt-0
- Actual: as expected, exit 0, tree unchanged
- Result: pass
- Spec source: R-010 acceptance
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:168`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: name --kind attempt --id S-001 --n 1, then --n 0
observed: as expected, exit 0, tree unchanged
```

## TC-security-8 (VS-6): A missing or empty attempt part exits 2 with one JSON error that names it

- Given: the baseline attempt arguments
- When: omit, or give as empty, --id and --n; call tail('attempt') without id, without n, with id '' and n None, and with n 0
- Then: exit 2 and an error naming the part; tail Fail naming the part; n 0 kept
- Expected: exit 2 and an error naming the part; tail Fail naming the part; n 0 kept
- Actual: 4 of 4 CLI calls exit 2 and name the part; 4 API calls raise Fail naming the part; tail with n 0 gives S-001-attempt-0
- Result: pass
- Spec source: R-010 acceptance; VS-6 notes
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:177`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: omit, or give as empty, --id and --n; call tail('attempt') without id, without n, with id '' and n None, and with n 0
observed: 4 of 4 CLI calls exit 2 and name the part; 4 API calls raise Fail naming the part; tail with n 0 gives S-001-attempt-0
```

## TC-security-9 (VS-6): Malformed --n exits 2 or gives an ASCII integer, never a crash

- Given: the baseline attempt arguments
- When: give 73 hostile values to --n (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, abc, 1.0)
- Then: exit 0 with an ASCII integer, or exit 2; no traceback; no tree change
- Expected: exit 0 with an ASCII integer, or exit 2; no traceback; no tree change
- Actual: 73 calls: 50 exit 2, 23 exit 0, all with ASCII integers. -1 gives sdlc/S-001-attempt--1 (seed already in barraiser.json)
- Result: pass
- Spec source: VS-6 notes
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:195`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: give 73 hostile values to --n (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, abc, 1.0)
observed: 73 calls: 50 exit 2, 23 exit 0, all with ASCII integers. -1 gives sdlc/S-001-attempt--1 (seed already in barraiser.json)
```

## TC-security-10 (VS-6): Hostile attempt --id never crashes and is used verbatim behind the prefix

- Given: the baseline attempt arguments
- When: give each of 125 argv-safe corpus values to --id
- Then: exit 0 with sdlc/<id>-attempt-1 verbatim, or exit 2; no tree change
- Expected: exit 0 with sdlc/<id>-attempt-1 verbatim, or exit 2; no tree change
- Actual: 125 calls, all clean and verbatim; 38 ok names fail git check-ref-format (known seed)
- Result: pass
- Spec source: VS-6 notes
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:212`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: give each of 125 argv-safe corpus values to --id
observed: 125 calls, all clean and verbatim; 38 ok names fail git check-ref-format (known seed)
```

## TC-security-11 (VS-6): Shell metacharacters in --id and --profile run no shell and change no file

- Given: a marker path in a scratch directory that the runner watches
- When: --id and --profile with $(touch M), backticks, ';touch M', '&& touch M', '|touch M' and a newline
- Then: the payload appears verbatim in the name; the marker file does not exist; the watched trees do not change
- Expected: the payload appears verbatim in the name; the marker file does not exist; the watched trees do not change
- Actual: 12 calls clean; payloads verbatim; marker absent; repo and marker directory unchanged
- Result: pass
- Spec source: VS-6 notes (no shell runs, no file outside the scratch repo changes)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:227`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: --id and --profile with $(touch M), backticks, ';touch M', '&& touch M', '|touch M' and a newline
observed: 12 calls clean; payloads verbatim; marker absent; repo and marker directory unchanged
```

## TC-security-12 (VS-4): name runs git only for check-ref-format, never a ref-changing command

- Given: a git shim first on PATH that logs each call and then runs the real git
- When: 6 verify and attempt calls, valid and hostile
- Then: every git call is check-ref-format --branch
- Expected: every git call is check-ref-format --branch
- Actual: 5 git calls, each 'check-ref-format --branch sdlc/S-001'; the argparse refusal makes no git call; no push, branch or update-ref
- Result: pass
- Spec source: VS-4 and VS-6 notes (no ref created)
- Test: `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:241`
- Command: `node --test --test-reporter=spec .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```
input: 6 verify and attempt calls, valid and hostile
observed: 5 git calls, each 'check-ref-format --branch sdlc/S-001'; the argparse refusal makes no git call; no push, branch or update-ref
```

## Attacks

| id | charter | input | observed | result |
|---|---|---|---|---|
| ATK-1 | Explore the verify CLI with missing and empty parts to find a silent default or crash | --id/--round/--profile/--part omitted or '' | exit 2, part named; empty int refused by argparse | held |
| ATK-2 | Explore --round/--part with integer corpus to find a crash or non-integer tail | 75 integer-like and hostile values each | 102 refused, 48 ASCII integers, no crash | held |
| ATK-3 | Explore --id/--profile with the full argv-safe corpus to find a crash, a state change or a lost prefix | 125 values x 2 flags | all clean; 73 names are ref-unsafe (no requirement covers it) | held |
| ATK-4 | Explore format placeholders inside a part to find a second expansion | --profile '{name}', '{name:lower}{0}%s' | literal text | held |
| ATK-5 | Explore argparse prefix, duplicate and equals forms to find flag confusion | --p, --pr, --ro, --par, --profile twice, --profile=--format | as expected; allow_abbrev is a known seed | held |
| ATK-6 | Explore the attempt CLI with missing and empty parts to find a silent default or crash | --id/--n omitted or ''; n 0 | as expected | held |
| ATK-7 | Explore --n with integer corpus to find a crash or non-integer tail | 73 values | 50 refused, 23 ASCII integers | held |
| ATK-8 | Explore attempt --id with the full corpus to find a crash or lost prefix | 125 values | clean, verbatim; 38 ref-unsafe (known seed) | held |
| ATK-9 | Explore shell metacharacters to find command execution | $(touch M), backticks, ;, &&, |, newline | marker absent, trees unchanged | held |
| ATK-10 | Explore git use via a PATH shim to find a ref-changing call | 6 valid and hostile calls | only check-ref-format --branch sdlc/S-001 | held |

Full attack log: `logs/security-0-attacks.txt`. Test run: `logs/security-0-run.txt`.

## Seeds

No new seeds. Each gap seen here is already in `.sdlc/barraiser.json`: name does not check the full ref, `type=int` accepts negative and non-ASCII digits, and `allow_abbrev` is on.
