# S-016 verify-cli r0 part 0

- Slice: S-016, profile cli, round 0, commit e55f687
- Verdict: no in-scope failure. 15 cases pass, 4 seeds.
- Environment: Python 3.14.7, Node 24.19.0, cli-runner (scratch HOME and git repo per case), stub-server gh shim and glab-stub on PATH, branches.py of sdlc/S-016 at e55f687 run as a script
- Test file: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Run: 15 of 15 tests pass (logs/cli-0-run.txt, exit 0). Transcripts: `.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-1 (VS-1): starts_with, ends_with and contains derive the table format in pr and stack mode

- Given: gh stub returns one non-negated rule; no format given
- When: branches.py preflight --mode pr|stack
- Then / expected: ok true, derived true, table format, every sample pass, exit 0
- Actual: Formats feature/sdlc/{name}, featuresdlc/{name} skipped as odd, sdlc/{name}-x, sdlc/team/{name}, a/b/sdlc/{name} observed; exit 0
- Result: pass
- Spec source: R-042 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:28`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-2 (VS-1): The derived names are the ones asked of gh and the output holds second-verdict samples

- Given: same
- When: preflight, then read the gh call log
- Then / expected: gh asked for feature%2Fsdlc%2FS-001; samples all start feature/sdlc/
- Actual: as expected
- Result: pass
- Spec source: R-042 quote
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:48`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-3 (VS-1): A rule the default format passes does not derive

- Given: starts_with sdlc/
- When: preflight
- Then / expected: ok true, derived false, format sdlc/{name}
- Actual: as expected
- Result: pass
- Spec source: R-042 quote
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:56`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-4 (VS-2): Given format (flag and config), negated rule, regex rule and two rules refuse derivation

- Given: each refusal input
- When: preflight
- Then / expected: exit 1, derived false, original format, non-empty suggestion
- Actual: as expected for all seven inputs
- Result: pass
- Spec source: R-042 acceptance, R-073
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:61`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-5 (VS-2): Zero rules, unknown kind, null kind, empty pattern and string negate never derive and never crash

- Given: degenerate rule lists
- When: preflight
- Then / expected: exit 0 or 1, derived false, no traceback
- Actual: as expected
- Result: pass
- Spec source: R-042 quote
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:83`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-6 (VS-2): Non-string patterns (list, null, number, object, regex list) never derive

- Given: pattern is not a string
- When: preflight
- Then / expected: derived false and exit not 0
- Actual: derived false, exit 1 with a Python traceback on stderr in all five inputs (seed 1)
- Result: pass
- Spec source: R-042 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:99`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-7 (VS-3): Guard: mr and direct mode with a bad --branch do not derive; pr and stack with a loop-kind failure derive

- Given: starts_with feature/ rule
- When: preflight --mode mr|direct|pr|stack
- Then / expected: mr: ok false, one rename line, no format change; direct: no samples; pr, stack: derived
- Actual: as expected (direct reports ok true with an empty samples list, since no sample exists)
- Result: pass
- Spec source: R-042 quote, ADR d001
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:108`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-8 (VS-4): A derived format that still fails keeps the first verdict (19 git-unsafe affixes in pr and stack)

- Given: ends_with .lock, contains a..b, space, ~, ^, :, trailing dot, ?, *, [, backslash, @{, leading dash, leading dot, /., //, trailing slash, tab, leading slash
- When: preflight
- Then / expected: exit 1 (not 2), derived false, format sdlc/{name}, suggestion equals the --branch-format line with the derived format, one rule
- Actual: as expected for all 38 runs
- Result: pass
- Spec source: R-087 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:126`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-9 (VS-4): samples, rules and notes of a failed derivation equal those of the first verdict

- Given: ends_with .lock
- When: compare with a run under --format sdlc/{name}
- Then / expected: same samples (timestamps normalised), rules and notes
- Actual: as expected
- Result: pass
- Spec source: ADR b19f
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:141`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-10 (VS-4): Format-like affixes ({name}, {, }, {0}, %s, $(id)) do not crash

- Given: 24 affix and operator pairs
- When: preflight
- Then / expected: exit 0 or 1, no traceback
- Actual: as expected
- Result: pass
- Spec source: R-042 quote
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:150`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-11 (VS-5): A failing verdict carries a suggestion: negated rule, two rules, given format, mr working failure

- Given: see title
- When: preflight
- Then / expected: --branch-format line naming labels, derived format for a given format, rename line in mr mode
- Actual: as expected
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:158`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-12 (VS-5): Rename line for hostile branch names stays on a failing exit 1 without a traceback

- Given: --branch=<name> for quote, space, dash, double quote, $(id), backtick, newline, backslash
- When: preflight --mode mr
- Then / expected: exit 1, suggestion names the rename
- Actual: exit 1 for all. The rename line puts the name in unquoted (seed 3)
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:171`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-13 (VS-6): A regex rule gives a --branch-format literal the rule accepts before S-001, in pr and stack mode

- Given: 14 patterns incl. alternation, class, group, repeat min 0, dot, anchors, lookahead, backreference, flags
- When: preflight
- Then / expected: literal/S-001 matches the pattern (checked with python re)
- Actual: as expected; lookahead, backreference, (a|b)*, \w+ and counted-group patterns fall back to text with the pattern quoted
- Result: pass
- Spec source: R-122 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:191`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-14 (VS-6): No-candidate, invalid, long and counted-repeat patterns fall back to text without hang or raise

- Given: ^[a-z]+$, (, [, *, (a+)+$, 5000 chars, 300 parens, ^(a{1000}){1000}$, ^.{0,99999999}x/, a{99999999999}, backslash, unicode
- When: preflight
- Then / expected: exit 0 or 1, no traceback, under 20 s, text fallback quotes the pattern
- Actual: as expected for these inputs (but see seeds 2 and 4 for others)
- Result: pass
- Spec source: R-122 quote
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:209`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-15 (VS-6): GitLab push-rule regex in pr, mr and stack mode

- Given: glab stub regex rule
- When: preflight --branch bad-name
- Then / expected: exit 1; pr, stack: --branch-format "feature/{name}" with quoted pattern; mr: rename line
- Actual: as expected
- Result: pass
- Spec source: R-122 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:223`

```text
see transcripts in .sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt
```

## Seeds

- **preflight crashes with a traceback on a non-string rule pattern** (skills/sdlc/branches.py): A forge rule whose pattern is a list, null, number or object makes _raw_result raise TypeError (startswith/endswith/in) or re.compile raise TypeError for regex. preflight exits 1 with a Python traceback on stderr and no JSON on stdout. The code is S-015's, not in the S-016 diff; derive() itself returns None for these. See TC-cli-6.
- **preflight hangs on a catastrophic regex rule** (skills/sdlc/branches.py): Rule regex (((((((((((((((((((((a*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*)*b evaluated on sdlc/state-20261010120000 does not finish in 10 s; preflight hit the 30 s runner timeout. Short samples like sdlc/S-001 return at once. Code is in S-015's _raw_result (re.search on a forge-supplied pattern). See logs/cli-0-probes.txt.
- **rename suggestion puts the branch name unquoted into a shell line** (skills/sdlc/branches.py): suggest() writes git branch -m <name> <new-name> with the raw name. For --branch '$(id)' or a backtick name, pasting the line runs the command. A name with a quote, space or backslash is read back wrong by sh. A name with a newline splits the suggestion into three lines. Names are user supplied, so the risk is low. See VS-5b lines in logs/cli-0-transcripts.txt.
- **_regex_literal builds an unbounded string for nested counted repeats** (skills/sdlc/branches.py): _shortest multiplies repeat counts as strings. Pattern ((a{1000}){1000}){1000} (25 characters) took 19 s and 5.9 GB peak RSS in _regex_literal; ((a{1000}){1000}){100} took 1.9 s and 637 MB. A larger count can exhaust memory. A forge admin supplies the pattern. A cap on the built length would remove the risk. See logs/cli-0-probes.txt.

## Not covered

VS-1 to VS-6 were run through the CLI. Direct calls to derive, suggest and _regex_literal belong to the contract profile.
