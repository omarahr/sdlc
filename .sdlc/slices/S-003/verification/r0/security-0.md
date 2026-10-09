# S-003 verification: security, part 0, round 0

- Slice: S-003
- Profile: security
- Round: 0
- Commit: 13b17f1
- Verdict: not refuted. 11 cases pass. 17 attacks: 16 held, 1 out of scope.

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0, git; cli-runner scratch repos with TZ=UTC and a scratch HOME.

## Charter

- VS-4: Explore the name CLI with missing and empty parts to find a traceback, a second output line or a side effect. Guarantee: R-099 acceptance and ADR-20261009-041711.
- VS-9: Explore the name CLI with the attack corpus in --id, --area, --kind and the integer flags to find a crash, a re-expanded placeholder or a side effect. Guarantee: every command prints one JSON object and exits 0 or 2 (spec section 2, R-099).

## Threat model boundary

The operator and the loop agents supply the CLI arguments. Their values are not trusted. The skill directory, PYTHONPATH and the config file are trusted. Git validity of a full name is out of scope as a blocker: the spec validates only the format.

## TC-security-1 (VS-4): A missing or empty required part gives one JSON error and exit 2

- Given: A scratch git repo with no config, and a repo with branchFormat team/{name:lower}-x.
- When: Run name for e2e-area with no --area, with --area '', with no --id, with --id ''; and for slice with no --id and with --id ''.
- Then: Each run exits 2 and prints one JSON object with ok false and an error that names the missing part.
- Expected: Exit 2, one JSON object, ok false, the error names area or id, empty stderr, no tree or ref change.
- Actual: 8 of 8 runs: exit 2, for example {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}; stderr empty; every tree unchanged.
- Result: pass
- Spec source: R-099 acceptance; R-018 quote 'A missing part is a Fail'
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:58`
- Command: `node --test --test-name-pattern 'VS-4 a missing' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: name --kind e2e-area --id M-1

```
$ python3 branches.py name --repo <repo> --kind e2e-area --id M-1
exit: 2
--- stdout
{"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
--- stderr

--- tree <cwd> (unchanged)
--- tree <repo> (unchanged)
```

file-tree: all VS-4 transcripts with tree diffs

See `.sdlc/slices/S-003/verification/r0/logs/security-0-vs4.txt`.

## TC-security-2 (VS-4): Kinds with no TAILS row yet give one JSON error and no traceback

- Given: A scratch git repo.
- When: Run name for run, milestone, e2e, verify and attempt, bare and with every part flag.
- Then: Each run exits 2 with one JSON error and no traceback (ADR-20261009-041711).
- Expected: Exit 2, one JSON error, empty stderr, no side effect. Not asserted as final behavior: S-004 to S-006 change it.
- Actual: 10 of 10 runs: exit 2, {"ok": false, "error": "no branch name is defined for kind 'run'"} and the same for each kind; trees unchanged.
- Result: pass
- Spec source: ADR-20261009-041711; R-099 acceptance (no traceback)
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:69`
- Command: `node --test --test-name-pattern 'VS-4 kinds' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: name --kind run with all parts

```
$ python3 branches.py name --repo <repo> --kind run --id S-001 --n 1 --area api --round 1 --profile cli --part 0
exit: 2
--- stdout
{"ok": false, "error": "no branch name is defined for kind 'run'"}
```

file-tree: VS-4 transcripts

See `.sdlc/slices/S-003/verification/r0/logs/security-0-vs4.txt`.

## TC-security-3 (VS-9): Hostile --kind values are refused

- Given: A scratch git repo.
- When: Run name with --kind slіce (Cyrillic i), SLICE, '', ../slice and 'slice '.
- Then: Each run exits 2 with one JSON error that names the kind.
- Expected: Exit 2, one JSON error, no traceback, no side effect.
- Actual: 5 of 5 runs refused with "--kind ... is not one of ..."; trees unchanged.
- Result: pass
- Spec source: R-099 acceptance; spec rule that every command prints one JSON object
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:76`
- Command: `node --test --test-name-pattern 'hostile kind' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-4 (VS-9): Hostile --id and --area values are literal text and cause no side effect

- Given: A repo with the default format and a repo with team/{name:lower}-x.
- When: Feed every argv-safe entry of control-chars, traversal, unicode-whitespace, unicode-confusables, format-strings, injection and oversized as --id (slice) and as --id and --area (e2e-area).
- Then: Each run exits 0 or 2 with one JSON object, no traceback, and no tree or ref change. On success the branch is the literal part in the format.
- Expected: Every run exits 0 or 2 with one JSON object. Success branches equal 'sdlc/'+value and 'sdlc/'+value+'-e2e-'+value byte for byte.
- Actual: About 290 runs: all exit 0 with one JSON object; for example --id 'x; touch pwned' gives branch 'sdlc/x; touch pwned' and no file pwned appears; 200k-char values return in one line; every tree unchanged.
- Result: pass
- Spec source: Spec: every command prints one JSON object and exits 0 or 2; R-099 acceptance (no traceback)
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:85`
- Command: `node --test --test-name-pattern 'literal text' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: injection part

```
$ python3 branches.py name --repo /tmp --kind slice --id 'x; touch pwned'
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/x; touch pwned"}
$ ls /tmp/pwned
No such file or directory
```

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-5 (VS-9): A placeholder inside a part is never re-expanded

- Given: A repo with the default format and a repo with team/{name:lower}-x.
- When: Run name with --id and --area set to {name}, {name:lower}, {0}, %s, {id}, {0.__class__}, {name}{name}; and with --format a/{name}/b.
- Then: The branch holds the placeholder as literal text.
- Expected: Literal text, no second expansion.
- Actual: --id '{name}' gives 'sdlc/{name}'; --id '{NAME}' with {name:lower} gives 'team/{name}-x'; --format a/{name}/b with --id '{name}' gives 'a/{name}/b'.
- Result: pass
- Spec source: VS-9 guarantee from the R-018 tail contract: the tail is the part value
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:99`
- Command: `node --test --test-name-pattern 're-expanded' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: placeholder part

```
$ python3 branches.py name --repo /tmp --kind slice --id '{name}'
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/{name}"}
```

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-6 (VS-9): Flag-like part values never switch a flag

- Given: A scratch git repo.
- When: Pass flag-like-values in --id=<v>, --id <v> and --area=<v>; pass --id=--format=evil/{name}; --id --help; a duplicated --id.
- Then: A value in = form stays a literal part; a separated flag-like value is refused with one JSON error; the format never changes.
- Expected: No value changes the format or the command.
- Actual: --id=--format=evil/{name} gives format 'sdlc/{name}' and branch 'sdlc/--format=evil/{name}'; --id --help exits 2 with one JSON error; duplicated --id takes the last value.
- Result: pass
- Spec source: Spec: every command prints one JSON object and exits 0 or 2
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:121`
- Command: `node --test --test-name-pattern 'flag-like' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: format smuggled in a part

```
$ python3 branches.py name --repo /tmp --kind slice --id=--format=evil/{name}
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/--format=evil/{name}"}
```

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-7 (VS-9): A non-integer --n, --round or --part gives one JSON error and exit 2

- Given: A scratch git repo.
- When: Pass '', 1.5, 1e3, two, inf, nan, 0x10, 4301 and 100000 digits, -<5000 digits>, Ⅷ, ², ① to each integer flag.
- Then: argparse refuses each with one JSON error that names the flag, and exit 2.
- Expected: Exit 2 and one JSON error naming the flag.
- Actual: 39 of 39 runs: exit 2, for example {"ok": false, "error": "argument --n: invalid int value: '1.5'"}; no traceback for the 4301-digit limit error.
- Result: pass
- Spec source: VS-9 notes; spec rule that every command prints one JSON object and exits 0 or 2
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:142`
- Command: `node --test --test-name-pattern 'non-integer' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: float and huge integer

```
$ python3 branches.py name --repo /tmp --kind slice --id S-1 --n 1.5
{"ok": false, "error": "argument --n: invalid int value: '1.5'"}
exit 2
$ ... --round <4301 nines>
{"ok": false, "error": "argument --round: invalid int value: '9999…"}
```

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-8 (VS-9): Integer forms, unicode digits and huge integers never crash

- Given: A scratch git repo.
- When: Pass every argv-safe entry of integer-forms, unicode-digits and huge-integers to each integer flag.
- Then: Exit 0 or 2 with one JSON object; on success the slice branch is unchanged.
- Expected: No traceback and no change to the branch.
- Actual: 105 runs: exit 0 or 2 with one JSON object; ' 3 ', '1_000', '٣' and '１２' are accepted (see seeds); branch stays 'sdlc/S-001'.
- Result: pass
- Spec source: Spec rule that every command prints one JSON object and exits 0 or 2
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:153`
- Command: `node --test --test-name-pattern 'never crash' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-9 (VS-9): Invalid UTF-8 bytes in a part give one JSON object

- Given: A scratch git repo.
- When: Spawn branches.py with raw bytes \xff\xfe, S-\xc0\xaf and \xed\xa0\x80 in --id and --area.
- Then: Exit 0 or 2 with one JSON object and no traceback.
- Expected: One JSON object.
- Actual: 6 of 6 runs exit 0; the branch holds escaped lone surrogates such as "sdlc/\udcff\udcfe" (see seeds).
- Result: pass
- Spec source: Spec rule that every command prints one JSON object and exits 0 or 2
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:163`
- Command: `node --test --test-name-pattern 'invalid UTF-8' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

transcript: raw bytes relay

```
0	{"ok": true, ..., "kind": "slice", "branch": "sdlc/\udcff\udcfe"}
0	{"ok": true, ..., "kind": "e2e-area", "branch": "sdlc/M-1-e2e-\udcff\udcfe"}
```

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## TC-security-10 (VS-9): branches.py imports no module from the cwd

- Given: A cwd that holds decoy branches, json, argparse, re, subprocess, datetime, os and sys modules (exit 97 on import).
- When: Run name --kind slice and name --kind state from that cwd.
- Then: No decoy marker is written and the real names come back.
- Expected: No decoy import.
- Actual: No marker file; exit 0, branch 'sdlc/S-001' and 'sdlc/state-<14 digits>'.
- Result: pass
- Spec source: VS-9 notes (plantDecoy check)
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:180`
- Command: `node --test --test-name-pattern 'imports no module' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

attack: decoy check

```
decoyFired(...) == null for 8 decoys; exit 0
```

## TC-security-11 (VS-9): A hostile --repo path gives one JSON object and writes nothing

- Given: The traversal family as --repo.
- When: Run name --kind slice --id S-001 with each value.
- Then: Exit 0 or 2 with one JSON object, no change in the cwd.
- Expected: One JSON object, no write.
- Actual: 10 of 10 runs: one JSON object; non-directories exit 2 with '--repo ... is not a directory'; cwd unchanged.
- Result: pass
- Spec source: Spec rule that every command prints one JSON object and exits 0 or 2
- Test: `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:194`
- Command: `node --test --test-name-pattern 'hostile --repo' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs`

file-tree: tree diff of cwd and repo, git refs included

See `.sdlc/slices/S-003/verification/r0/logs/security-0-transcripts.txt`.

## Attacks

| id | charter | input | expected | observed | result |
|---|---|---|---|---|---|
| A-security-1 | Missing part | e2e-area --id M-1 (no --area), --area '' | exit 2, one JSON error naming area | exit 2, error names area, no side effect | held |
| A-security-2 | Missing part | slice with no --id, --id '' | exit 2, one JSON error naming id | exit 2, error names id | held |
| A-security-3 | Kinds without a TAILS row | run, milestone, e2e, verify, attempt | exit 2, one JSON error | exit 2, 'no branch name is defined for kind' | held |
| A-security-4 | Kind confusables | slіce, SLICE, '', ../slice, 'slice ' | exit 2 | exit 2 | held |
| A-security-5 | Control characters in parts | tab, newline, CR, ESC, BEL, DEL, C1 in --id/--area | one JSON object, literal part | exit 0, literal part, JSON-escaped | held |
| A-security-6 | Traversal in parts | ../.., /etc, ..\.., file:///etc in --id/--area | literal text, no file access | exit 0, literal text, tree unchanged | held |
| A-security-7 | Unicode whitespace and confusables in parts | NBSP, ZWSP, BOM, RTL override, fullwidth braces | one JSON object | exit 0, literal text | held |
| A-security-8 | Shell and JSON injection in parts | $(touch pwned), backticks, '"}, "ok": true', newline+JSON | no command runs, one JSON object | no pwned file, one JSON line, ok key not forged | held |
| A-security-9 | Oversized parts | 10k, 200k chars, 5000-level path | one JSON object | exit 0 in about 70 ms, one line | held |
| A-security-10 | Placeholder re-expansion | {name}, {name:lower}, {0}, %s, {0.__class__} | literal text | literal text in every format | held |
| A-security-11 | Flag smuggling | --id=--format=evil/{name}, --id --help, --area=--help | format unchanged | format stays sdlc/{name}; separated flag-like value refused | held |
| A-security-12 | Non-integer integer flags | 1.5, inf, nan, 0x10, 4301+ digits, Ⅷ, ① | exit 2, one JSON error | exit 2, argparse error naming the flag | held |
| A-security-13 | Unicode digits and odd integer forms | ٣, １２, ' 3 ', 1_000 | exit 0 or 2, one JSON object | exit 0, accepted as integers (seed) | held |
| A-security-14 | Invalid UTF-8 argv | \xff\xfe, \xc0\xaf, \xed\xa0\x80 | one JSON object | exit 0, lone surrogates escaped in JSON (seed) | held |
| A-security-15 | Module shadowing from the cwd | decoy branches/json/argparse/re/subprocess/datetime/os/sys in cwd | no decoy import | no decoy import | held |
| A-security-16 | Hostile --repo | traversal family as --repo | one JSON object, no write | one JSON object, cwd unchanged | held |
| A-security-17 | Git-unsafe parts | --id '../..', 'a b', 'HEAD@{1}', '*', tab | out of scope as a blocker (spec validates the format only) | exit 0 with branches that git check-ref-format refuses | out-of-scope |

## Seeds

- **name gives git-invalid branch names for hostile parts** (skills/sdlc/branches.py): name does not run git check-ref-format on the full name. --id '../..', 'a b', 'HEAD@{1}', '*' and a tab give exit 0 with branches such as 'sdlc/../..', which git check-ref-format --branch refuses. The spec validates only the format. A later slice that creates branches must check the full name.
- **integer flags accept unicode digits, padding and underscores** (skills/sdlc/branches.py): argparse type=int uses Python int(), so --n '٣', '１２', ' 3 ', '\u00a03' and '1_000' are accepted as 3, 12, 3, 3 and 1000. The spec does not say which integer forms are valid. When n, round or part reach a branch name (S-004 to S-006), the name can differ from the operator's text.
- **invalid UTF-8 in a part gives lone surrogate escapes in the JSON output** (skills/sdlc/branches.py): Raw bytes \xff\xfe in --id give branch 'sdlc/\udcff\udcfe' with exit 0. Strict JSON readers can refuse or replace lone surrogates, so a consumer of the branch field can see a different name.
- **argparse error echoes an oversized value in full** (skills/sdlc/branches.py): --round with 100000 digits gives one JSON error that holds all the digits. The spec states no limit, so this goes to verify-limits.
- **testkit: cli-runner cannot pass raw bytes in argv** (skills/sdlc/test/testkit/cli-runner.mjs): Node spawn takes strings only, so invalid UTF-8 argv needs a Python relay inside the test. A run option for byte arguments would remove that helper.
