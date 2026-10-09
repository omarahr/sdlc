# S-004 verification: security, part 0, round 0

- Slice: S-004 (run, milestone and e2e branch tails)
- Profile: security
- Round: 0
- Commit: 2b1960c
- Verdict: **verified**. 7 of 7 cases pass. No in-scope guarantee broke.

## Environment

macOS (Darwin 25.6.0), Python 3.14.7, Node 24.19.0, git 2.50.1; testkit cli-runner with a scratch HOME and a controlled env, attack-corpus, scratch git repos; no network and no services

## Charter

- VS-3: Explore the missing-part path with omission and wrong-part attacks. Find a crash or a non-JSON exit that breaks spec §2 ("A missing part is a Fail") and the CLI contract.
- VS-4: Explore --n with integer-form, huge-integer and unicode-digit attacks. Find a crash, a Traceback, an exit other than 0 or 2, or a non-negative branch that git refuses.
- VS-5: Explore --id and --area with injection, traversal, control-character, format-string, flag-like, unicode and oversized attacks. Find a shell run, a file or ref write, a planted import, a format expansion or a non-JSON output.

## Threat model boundary

The spec has no security section. The trusted parties are the skill code, the git binary, PATH and the Python environment (PYTHONPATH). The untrusted input is the CLI argument values for --id, --area and --n. ADR-20261009-045048 accepts that the rows check no id shape and no sign. So an accepted malformed id, or a branch that git refuses, is a seed and not a refutation.

## Cases

### TC-security-1 (VS-3): A missing, empty or wrong part exits 2 with one JSON error that names the part

- Requirements: R-003, R-005, R-006, R-007
- Given: A scratch git repo with no config
- When: name runs 11 times: run with no --n; milestone and e2e with no --id or with --id ''; e2e-area with no --area, --area '' or no --id; run with --id 1; milestone with --n 1; e2e with --n and --area only
- Then: Each call exits 2 and prints one JSON object with ok false and an error that ends in 'non-empty <part>'. Stderr is empty. No Traceback. No file or ref changes.
- Expected: exit 2; the error names n, id or area; no side effect
- Actual: All 11 calls exit 2 with errors such as 'a run branch name needs a non-empty n'. Stderr is empty. The cwd and the repo are unchanged.
- Result: **pass**
- Spec source: Spec §2 tail: "A missing part is a Fail." Spec CLI contract: "Every command prints one JSON object; exit 2 with {"ok": false, "error": "..."} on bad input."
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:91`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

attack: missing part, run

```
$ branches.py name --repo <repo> --kind run
exit: 2
--- stdout
{"ok": false, "error": "a run branch name needs a non-empty n"}
--- stderr

--- tree cwd (unchanged)
--- tree repo (unchanged)
```

- transcript: all 11 transcripts: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs3-cli.txt`

### TC-security-2 (VS-3): tail raises only Fail for a missing part and keeps 0 as a value

- Requirements: R-003, R-005, R-006, R-007
- Given: branches.py loaded by path with python3 -I
- When: tail is called 14 times with a missing, None, empty or wrong-key part, and once with run n=0
- Then: Every missing-part call raises Fail, never KeyError or TypeError. tail('run', n=0) returns 'run-0'.
- Expected: 14 Fail outcomes and one return of run-0
- Actual: 14 Fail outcomes; tail('run', n=0) returns 'run-0'.
- Result: **pass**
- Spec source: Spec §2 tail: "A missing part is a Fail."
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:118`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

- transcript: call results: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs3-api.json`

### TC-security-3 (VS-4): Every --n form gives run-<int> or one JSON error, and git accepts every non-negative accepted value

- Requirements: R-003
- Given: A scratch git repo; 45 values: the integer-forms, huge-integers and unicode-digits families and the plan values 0, 1, 12, -1, 1.5, abc, ' 1', +1, 0x1, 1_000
- When: name --kind run --n=<value> runs once per value
- Then: Exit 0 with branch sdlc/run-<str(int(value))> that git check-ref-format accepts, or exit 2 with one JSON error that names --n. No Traceback, empty stderr, no tree change.
- Expected: No crash; the branch equals the Python print form of the int; a refusal names --n
- Actual: 28 values are accepted, for example ' 3 ' gives sdlc/run-3, Arabic-Indic 3 gives sdlc/run-3 and 4300 nines give sdlc/run-999... . 17 values are refused with 'argument --n: invalid int value' (0x10, 1.5, inf, 4301 digits, 100k digits). -1 gives sdlc/run--1, the known gap of ADR-20261009-045048.
- Result: **pass**
- Spec source: R-003 acceptance; Spec CLI contract: "Every command prints one JSON object; exit 2 with {"ok": false, "error": "..."} on bad input." ADR-20261009-045048
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:132`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

attack: refused and accepted forms

```
--n=0x10          -> exit 2 {"ok": false, "error": "argument --n: invalid int value: '0x10'"}
--n=1.5           -> exit 2 invalid int value
--n=<4301 nines>  -> exit 2 invalid int value
--n=' 3 '         -> exit 0 sdlc/run-3
--n=1_000         -> exit 0 sdlc/run-1000
--n=<Arabic-Indic 3> -> exit 0 sdlc/run-3
--n=-1            -> exit 0 sdlc/run--1 (ADR-20261009-045048 gap)
```

- transcript: one row per value: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs4-cli.jsonl`

### TC-security-4 (VS-4): tail run takes True, '7', 7 and 0 and returns a string

- Requirements: R-003
- Given: branches.py loaded by path with python3 -I
- When: tail('run', n=True), n='7', n=7 and n=0
- Then: Each call returns a string tail or raises Fail. No other exception.
- Expected: a string or Fail
- Actual: run-True, run-7, run-7 and run-0, all strings.
- Result: **pass**
- Spec source: Spec §2 tail: "A missing part is a Fail." Plan VS-4 notes.
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:159`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

- transcript: call results: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs4-api.json`

### TC-security-5 (VS-5): Hostile --id and --area values never run a shell, write a file, import a planted module or expand a format

- Requirements: R-005, R-006, R-007
- Given: A repo with planted json.py and subprocess.py; a cwd with decoy modules json, re, argparse, subprocess and os; 95 argv-safe values from traversal, control-chars, flag-like-values, injection, format-strings, unicode-whitespace, unicode-confusables and oversized
- When: name runs 380 times: milestone --id=V, e2e --id=V, e2e-area --area=V and e2e-area --id=V
- Then: Exit 0 with the literal tail, or exit 2 for the empty value. One JSON line on stdout, empty stderr, no tree or ref change, no 'pwned' file, no decoy import.
- Expected: No shell, no write, no import, a literal tail
- Actual: 376 calls exit 0 with the exact literal tail. 4 calls exit 2 (the empty value; the error names id or area). 0 contract violations. No 'pwned' file. No decoy marker. '$(touch pwned)' stays literal in the branch.
- Result: **pass**
- Spec source: Spec CLI contract: "Every command prints one JSON object; exit 2 with {"ok": false, "error": "..."} on bad input." Plan VS-5 notes; ADR-20261009-045048
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

attack: shell injection value

```
$ branches.py name --repo <repo> --kind milestone '--id=$(touch pwned)'
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "milestone", "branch": "sdlc/$(touch pwned)"}
--- stderr

--- tree cwd (unchanged)
--- tree repo (unchanged)
pwned files: none; decoy markers: none
```

- transcript: 380 rows: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs5-cli.jsonl`

- log: accepted values that git check-ref-format refuses (seed): `.sdlc/slices/S-004/verification/r0/logs/security-0-vs5-git-refused.txt`

### TC-security-6 (VS-5): A format-string id under a lowercase format stays literal and is not expanded again

- Requirements: R-005, R-006
- Given: A repo with branchFormat feature/{name:lower}
- When: name for milestone --id={NAME}, e2e --id={name:lower}, milestone --id=%S%N and e2e --id={0.__CLASS__}
- Then: The tail is lowercased once and stays literal.
- Expected: feature/{name}, feature/{name:lower}-e2e, feature/%s%n, feature/{0.__class__}-e2e
- Actual: The four branches are exactly as expected. Stderr is empty. The tree is unchanged.
- Result: **pass**
- Spec source: Spec §2 name: prefix + tail + suffix, tail lowercased for {name:lower}. Plan VS-5 notes.
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:208`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

attack: {NAME} under {name:lower}

```
$ branches.py name --repo <repo> --kind milestone '--id={NAME}'
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "feature/{name:lower}", "kind": "milestone", "branch": "feature/{name}"}
```

- transcript: 4 transcripts: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs5-lower.txt`

### TC-security-7 (VS-5): A flag-like value after a space-form --id or --area gives one JSON error, never help text

- Requirements: R-005, R-007
- Given: A scratch git repo
- When: name with --id V and with --area V, for V in --help, -h, --, --repo and --format=x/{name} (10 calls)
- Then: Exit 2, one JSON error, no usage text, empty stderr.
- Expected: exit 2 with a JSON error
- Actual: All 10 calls exit 2 with 'argument --id: expected one argument' or the --area form. No 'usage:' text.
- Result: **pass**
- Spec source: Spec CLI contract: "Every command prints one JSON object; exit 2 with {"ok": false, "error": "..."} on bad input."
- Test: `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:226`
- Command: `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

attack: --id --help

```
$ branches.py name --repo <repo> --kind milestone --id --help
exit: 2
--- stdout
{"ok": false, "error": "argument --id: expected one argument"}
```

- transcript: 10 transcripts: `.sdlc/slices/S-004/verification/r0/logs/security-0-vs5-flaglike.txt`

## Attacks

| id | charter | input | expected | observed | result | test |
|---|---|---|---|---|---|---|
| A-1 | VS-3: leave out the part each new row needs | `--kind run with no --n; milestone and e2e with no --id or --id ''; e2e-area with no --area or --area ''` | exit 2; the JSON error names the part | exit 2; the error names n, id or area; no side effect | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:91 |
| A-2 | VS-3: give the wrong part | `--kind run --id 1; --kind milestone --n 1` | exit 2; the error names the needed part | 'needs a non-empty n' and 'needs a non-empty id' | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:91 |
| A-3 | VS-3: Python API missing parts (None, '', absent, wrong key) | `tail('run'), tail('milestone', id=''), tail('e2e', id=None) and 11 more` | Fail only | Fail for all 14; run n=0 gives run-0 | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:118 |
| A-4 | VS-4: integer forms on --n | `0x10, 1.5, 1e3, inf, nan, two, '', ' 3 ', +1, -0, 1_000, 010, int64 edges` | run-<int> or an exit 2 JSON error | argparse int accepts padded, signed, underscored and leading-zero forms and normalizes them; it refuses the rest with exit 2 | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:132 |
| A-5 | VS-4: huge integers on --n | `4300, 4301 and 100k nines; -5000 digits; 10k zeros` | no crash | 4300 digits are accepted; longer values are refused by the Python int digit limit as an exit 2 JSON error | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:132 |
| A-6 | VS-4: unicode digits on --n | `Arabic-Indic, fullwidth, Devanagari, Bengali, NKo, math bold, Thai, mixed` | an ASCII branch or exit 2 | normalized to ASCII run-<int>; git accepts it | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:132 |
| A-7 | VS-4: non-int Python values for n | `n=True, n='7'` | a string or Fail | run-True, run-7 | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:159 |
| A-8 | VS-4: Python API n above the int print limit | `tail('run', n=10**5000)` | a string or Fail | ValueError: Exceeds the limit (4300 digits) for integer string conversion. The CLI cannot reach this. Manual probe: .sdlc/slices/S-004/verification/r0/logs/security-0-seed-huge-n-api.txt | out-of-scope | manual |
| A-9 | VS-5: shell injection in --id and --area | `$(touch pwned), `touch pwned`, '; && \| >' forms, --upload-pack=touch pwned` | no shell; a literal tail | literal in the branch; no 'pwned' file; tree unchanged | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167 |
| A-10 | VS-5: planted modules in the cwd and the repo | `json, re, argparse, subprocess and os decoys in the cwd; json.py and subprocess.py in the repo` | no import | no decoy marker; no exit 97 | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167 |
| A-11 | VS-5: format strings in --id and --area | `{name}, {0.__class__}, %s%n, {{name}}, ${name}, {name:>9}` | literal | literal; under {name:lower} lowercased once and not expanded | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167, .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:208 |
| A-12 | VS-5: break the JSON line with control characters | `newline + {"ok": true}, CR, ESC ANSI, BEL, '"}, "ok": true'` | one JSON line on stdout | json.dumps escapes every value; stdout is one line | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167 |
| A-13 | VS-5: flag-like values | `--help, -h, --, --repo, --format=x/{name}, -1, -, =` | one JSON object, never help text | space form: exit 2 'expected one argument'; equals form: a literal tail | held | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167, .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:226 |
| A-14 | VS-5: traversal, confusables, unicode whitespace and oversized values | `../.., /etc, file:///etc, Cyrillic look-alikes, NBSP, 200k characters, a 5000-level path` | no write; one JSON object | a literal tail; tree unchanged. 144 of 380 accepted combinations give a branch that git check-ref-format refuses (ADR-20261009-045048 gap) | out-of-scope | .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167 |

## Seeds

- **branches.py name prints branch names that git refuses for a hostile milestone id or e2e area** (`skills/sdlc/branches.py`): name --kind milestone, e2e and e2e-area accept an id or area with '..', a space, a control character, braces or a leading slash. The printed branch fails git check-ref-format --branch in 144 of 380 combinations, for example sdlc/../.. and sdlc/$(touch pwned). ADR-20261009-045048 accepts this gap, because the format check probes only the sample S-001. A git check-ref-format check of the final branch, or an id shape check, closes it. List: .sdlc/slices/S-004/verification/r0/logs/security-0-vs5-git-refused.txt.
- **tail('run', n=<int over 4300 digits>) raises ValueError, not Fail** (`skills/sdlc/branches.py`): tail builds f'run-{n}', and Python refuses to print an int over 4300 digits. So tail raises ValueError. The CLI cannot reach this, because argparse int refuses the same digit count. The spec Fail contract names only a missing part. Probe: .sdlc/slices/S-004/verification/r0/logs/security-0-seed-huge-n-api.txt.
- **--n accepts padded, signed, underscored and non-ASCII digit forms** (`skills/sdlc/branches.py`): argparse int accepts ' 3 ', '+1', '-0', '1_000', '010' and Arabic-Indic or fullwidth digits. name prints the normalized ASCII number. The branch is valid, but the CLI does not report a typo. A strict ASCII digit check on --n refuses these forms.
- **The tail error text says 'a e2e branch name'** (`skills/sdlc/branches.py`): The Fail message puts the article 'a' before e2e and e2e-area: 'a e2e branch name needs a non-empty id'. The message is clear but not grammatical.
