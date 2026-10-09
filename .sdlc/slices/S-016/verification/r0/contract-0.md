# Verification S-016 · profile contract · part 0 · round 0

- Commit: e55f687
- Verdict: 17 of 17 cases pass. No in-scope failure. Seven seeds.
- Environment: Python 3.14.7, Node 24.19.0, gh and glab shims from the testkit stub-server on PATH, scratch git repos, no network

Test files: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs` and `.sdlc/slices/S-016/verification/r0/tests/contract-0/probe.verify-contract.test.mjs`.

## TC-contract-1 (VS-1): Public surface: derive(rules), suggest(rules, rows, derived), _regex_literal(rule) exist

- Given: branches.py loaded by path with python3 -I
- When: inspect.signature on the three names
- Then: signatures match the plan
- Actual: derive (rules) / suggest (rules, rows, derived) / _regex_literal (rule)
- Result: pass
- Spec source: R-073 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:27`

Evidence (type-check, signature listing):
```
derive (rules)
suggest (rules, rows, derived)
_regex_literal (rule)
```

## TC-contract-2 (VS-1): derive returns the three table formats for the spec examples

- Given: one rule per operator
- When: derive([rule])
- Then: feature/sdlc/{name}, sdlc/{name}-x, sdlc/team/{name}, plus release/, .lock, a..b
- Actual: all six equal the table
- Result: pass
- Spec source: R-042 quote table
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:38`

Evidence (property-run, examples):
```
starts_with feature/ -> feature/sdlc/{name}
ends_with -x -> sdlc/{name}-x
contains team -> sdlc/team/{name}
starts_with release/ -> release/sdlc/{name}
ends_with .lock -> sdlc/{name}.lock
contains a..b -> sdlc/a..b/{name}
```

## TC-contract-3 (VS-1): CLI derives for each operator in pr mode and exits 0 with second-verdict samples

- Given: gh stub with one rule, no format
- When: preflight --mode pr
- Then: ok true, derived true, derived format, every sample pass, exit 0, stderr empty
- Actual: starts_with feature/, ends_with -x, contains team, starts_with team/sub/ all derived; exit 0
- Result: pass
- Spec source: R-042 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:110`

Evidence (transcript, CLI results):
```
["starts_with","feature/",0,"feature/sdlc/{name}",true,true,""]
["ends_with","-x",0,"sdlc/{name}-x",true,true,""]
["contains","team",0,"sdlc/team/{name}",true,true,""]
["starts_with","team/sub/",0,"team/sub/sdlc/{name}",true,true,""]
```

## TC-contract-4 (VS-1): A rule the default format already passes does not derive

- Given: starts_with sdlc/ (pr) and contains sdlc (stack)
- When: preflight
- Then: ok true, derived false, default format, exit 0
- Actual: as expected
- Result: pass
- Spec source: R-042 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:125`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-5 (VS-2): Property: derive equals a table reference model over random rule lists

- Given: 3000 generated rule lists: 0 to 3 rules, kinds incl. regex, bogus, upper-case, null; patterns incl. unicode, brace, newline, 10000 chars; non-string patterns; negate
- When: derive(rules)
- Then: string from the table for exactly one non-negated table kind with a non-empty string pattern, else None; never raises
- Actual: 0 violations in 3000 runs
- Result: pass
- Spec source: R-042 quote; R-073 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:61`

Evidence (property-run, derive):
```
property derive: seed=2918823855 runs=3000 violations=0
```

## TC-contract-6 (VS-2): derive and suggest are deterministic and do not mutate their input

- Given: rules and rows deep-copied
- When: two calls each
- Then: equal results, inputs equal to the copy
- Actual: ok
- Result: pass
- Spec source: R-073 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:75`

Evidence (type-check, result):
```
ok
```

## TC-contract-7 (VS-2): CLI refuses derivation for a given flag format, a config format, a negated rule, a regex rule, two rules, an unknown kind; zero rules gives the default

- Given: gh stub
- When: preflight --mode pr
- Then: derived false, the original format, exit 1 (or 0 when the default passes), no stderr
- Actual: as expected for every case
- Result: pass
- Spec source: R-042 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:89`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-8 (VS-3): mr and direct mode never derive; a bad --branch in mr mode gives one rename line

- Given: one starts_with feature/ rule; --branch bad-name
- When: preflight --mode mr / direct
- Then: derived false, format sdlc/{name}; mr: exit 1, one-line rename suggestion, no --branch-format
- Actual: as expected
- Result: pass
- Spec source: R-042 quote; ADR d001
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:132`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-9 (VS-3): pr and stack mode derive when a loop-kind sample fails

- Given: starts_with feature/
- When: preflight --mode pr and --mode stack
- Then: derived true, feature/sdlc/{name}, exit 0
- Actual: as expected
- Result: pass
- Spec source: R-042 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:147`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-10 (VS-5): suggest with a loop row and a working row gives two lines, format first; working alone gives the rename alone; no rule gives the check-ref-format line; derived row gives the derived line

- Given: hand-built rows
- When: suggest(rules, rows, derived)
- Then: as listed
- Actual: two lines [--branch-format "feature/{name}" (rule "rx": regex "..."), rename the branch "bad name" ...]; others as expected
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:154`

Evidence (transcript, suggest outputs):
```
two: --branch-format "feature/{name}" (rule "rx": regex "^(feature|bugfix)/[A-Z]+-\d+$")\nrename the branch "bad name" (rule "rx"), for example: git branch -m bad name <new-name>
derived: --branch-format "release/sdlc/{name}"
generic: --branch-format "<prefix>{name}<suffix>" (every branch name must pass: git check-ref-format)
```

## TC-contract-11 (VS-5): Property: a failing row always gives a non-empty suggestion, format line first, one line per cause, no raise

- Given: 2000 generated rule and row lists, incl. newline and quote names
- When: suggest(rules, rows, derived)
- Then: non-empty exactly when a row failed; line count equals the cause count; format line first
- Actual: 0 violations in 2000 runs
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:177`

Evidence (property-run, suggest):
```
property suggest: seed=1490840770 runs=2000 violations=0
```

## TC-contract-12 (VS-5): CLI: negated rule, two rules, given format, and no rule with an invalid ref format

- Given: gh stub
- When: preflight --mode pr
- Then: exit 1 and a --branch-format suggestion; the invalid ref format exits 2 with a JSON error
- Actual: as expected
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:205`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-13 (VS-5): mr mode working failure for branch names with spaces, quotes, dashes, $(), backslash: exit 1, one rename line, no stderr

- Given: glab stub with branch_name_regex ^feat/
- When: preflight --mode mr --branch=<name>
- Then: rename line names the branch; exit 1
- Actual: as expected. The line puts the name in double quotes, then unquoted after git branch -m (see seed)
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:221`

Evidence (transcript, rename lines):
```
"bad name" => rename the branch "bad name" (rule "push rule"), for example: git branch -m bad name <new-name>
"--force" => ... git branch -m --force <new-name>
"$(id)" => ... git branch -m $(id) <new-name>
```

## TC-contract-14 (VS-6): CLI regex rules in pr and stack mode give a literal that the rule accepts at S-001, with the pattern quoted

- Given: 14 patterns incl. alternation, classes, groups, repeats with minimum 0, dot, anchors, non-capturing groups
- When: preflight --mode pr / stack, then re.search(pattern, literal + '/S-001') in a separate Python
- Then: literal accepted; pattern quoted; text fallback otherwise
- Actual: every literal accepted: feature, user-a, a, feat, y, ac; seven patterns used the text fallback; one pattern passed by default
- Result: pass
- Spec source: R-122 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:238`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-15 (VS-6): Unsatisfiable, unparseable and unusual regex rules never crash and give the quoted-pattern text

- Given: ^[a-z]+$, lookahead, backreference, (?i) flag, \p{L}, invalid patterns, empty pattern
- When: preflight --mode pr
- Then: exit 0 or 1, empty stderr; text fallback quotes the pattern
- Actual: (?i)^FEATURE/ gives literal FEATURE; the others give the text fallback or an unevaluated note; no traceback
- Result: pass
- Spec source: R-043 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:259`

Evidence (transcript, log): `.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt`

## TC-contract-16 (VS-6): _regex_literal on repeat counts and nesting that finish quickly returns without raising

- Given: 8 hostile patterns incl. a{4294967295}, (a{9999}){9999}, (a*)*b, 500 nested groups, 200000 characters
- When: _regex_literal(rule)
- Then: returns a value, never raises
- Actual: no exception for any of the eight
- Result: pass
- Spec source: R-122 acceptance (no timing limit in the spec)
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:268`

Evidence (measurement, measurements): `.sdlc/slices/S-016/verification/r0/logs/regex-literal-hostile-measure.txt`

## TC-contract-17 (VS-6): Property: every literal that _regex_literal returns is accepted by the rule at the S-001 tail and passes validate_format

- Given: 2000 generated regex patterns
- When: _regex_literal, evaluate, validate_format
- Then: 0 violations; no raise
- Actual: 540 literals, 0 violations, 0 raises
- Result: pass
- Spec source: R-122 acceptance
- Test: `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:287`

Evidence (property-run, regex literal):
```
property _regex_literal: seed=1029771664 runs=2000 literals=540 violations=0
```

## Attacks

None filed. The security profile covers the hostile input families.

## Seeds

- **_regex_literal builds a huge string for large repeat counts** (`skills/sdlc/branches.py`): For a regex rule that holds a large repeat count, _shortest multiplies the inner string by the count. a{999999999} took 17.5 s and 5.7 GB resident memory. ((a{1000}){1000}){1000} took 18.6 s and 5.9 GB. (?:x{65535}){65535} did not finish in 40 s. Through the CLI, ^a{999999999}/ and ^((a{1000}){1000}){1000}/ each took about 20 s before preflight printed the text fallback. A cap on the built length would bound this. The spec states no limit.
- **A derived format that validate_format refuses is reported as ok** (`skills/sdlc/branches.py`): derive builds the format from the pattern and the second verdict does not call validate_format. A starts_with, ends_with or contains rule with the pattern { or } or {x} gives ok true, derived true and a format such as {sdlc/{name}. validate_format refuses that format (brace outside its placeholder), so the next run that reads it as --format or branchFormat exits 2.
- **Rename line puts the branch name unquoted after git branch -m** (`skills/sdlc/branches.py`): The line reads: rename the branch "<name>" (rule "<rule>"), for example: git branch -m <name> <new-name>. A name with a space, a leading dash or $(...) gives a command that breaks or runs differently when pasted. The name is not escaped inside the double quotes either.
- **A pattern with a newline splits the suggestion into two lines** (`skills/sdlc/branches.py`): starts_with, ends_with or contains with the pattern x<newline>y fails the derived format and the suggestion holds the raw pattern, so the output has two lines. The quoted regex pattern and labels are also unescaped (a double quote inside a pattern ends the quote early). The suggestion is a JSON string, so only a consumer that splits lines is affected.
- **A non-string pattern in a rule crashes preflight with a traceback** (`skills/sdlc/branches.py`): A starts_with rule whose pattern is a list gives TypeError in _raw_result (S-015 code, not in the S-016 diff). Exit 1 with a traceback and no JSON. The derive function refuses such a rule, so the crash is before the S-016 code runs. The forge API gives string patterns.
- **An empty-prefix regex candidate is skipped** (`skills/sdlc/branches.py`): For ^a*/S-1$ the shortest match is /S-1, so the only cut gives an empty candidate and the text fallback appears, although a/S-1 would pass the rule. A rule with minimum 0 before the first slash always falls back to text. This matches the plan, which says the fallback is acceptable.
- **A bare --branch value that starts with a dash is refused by argparse** (`skills/sdlc/branches.py`): --branch -x exits 2 with 'expected one argument'. --branch=-x works. The rename path was verified with the = form.
