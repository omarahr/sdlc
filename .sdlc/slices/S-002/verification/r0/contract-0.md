# Verification: S-002, profile contract, part 0

- Slice: S-002
- Round: 0
- Commit: 8138c9f
- Verdict: verified (11 of 11 cases pass)

## Environment

macOS (Darwin 25.6.0), Python 3.14.7, git 2.50.1 (Apple Git-155), Node 24.19.0 node:test, testkit rng from property.mjs; module loaded by path from a scratch cwd with python3 -I

## Surface

```
branches.py public surface (loaded by path, python3 -I, from a scratch cwd):
Fail (class)  validate_format(fmt)  split(fmt)  name(fmt, kind, **parts)  tail(kind, **parts)
load_format(repo)  load_git_modes(path=...)  DEFAULT_FORMAT='sdlc/{name}'
PLACEHOLDERS=('{name}', '{name:lower}')  KINDS  TAILS={'slice': ...}  GIT_MODES_PATH
CLI helpers: build_parser() main(argv=None) cmd_name cmd_parse cmd_list cmd_preflight JsonArgumentParser
Spec section 2 names for S-002 (validate_format, tail, name, split) exist with the spec signatures.
parse, list_kind, read_rules, evaluate, derive are absent; later slices own them.
```

## TC-contract-1 (VS-1): validate_format returns the exact input object for valid formats

- Requirements: R-001, R-017
- Given: branches.py loaded by path from a scratch cwd
- When: validate_format is called with sdlc/{name}, sdlc/{name:lower}, feature/PROJ-1-{name}, {name}, a/b/c-{name}-x, équipe/{name}, FEATURE/{name:lower}.X, name/{name}lower
- Then: each call returns
- Expected: the return value is the input string, the same object
- Actual: all 8 return the same object, not a copy
- Result: pass
- Spec source: R-001 acceptance; R-017 acceptance
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:89`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-1 '`

**surface listing (no static type checker applies to Python stdlib code)** (type-check)

```
branches.py public surface (loaded by path, python3 -I, from a scratch cwd):
Fail (class)  validate_format(fmt)  split(fmt)  name(fmt, kind, **parts)  tail(kind, **parts)
load_format(repo)  load_git_modes(path=...)  DEFAULT_FORMAT='sdlc/{name}'
PLACEHOLDERS=('{name}', '{name:lower}')  KINDS  TAILS={'slice': ...}  GIT_MODES_PATH
CLI helpers: build_parser() main(argv=None) cmd_name cmd_parse cmd_list cmd_preflight JsonArgumentParser
Spec section 2 names for S-002 (validate_format, tail, name, split) exist with the spec signatures.
parse, list_kind, read_rules, evaluate, derive are absent; later slices own them.
```

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-2 (VS-1): A valid format is accepted from a non-repo cwd, a repo cwd and with GIT_DIR set

- Requirements: R-017
- Given: cwd is a non-repo dir or a git repo; GIT_DIR is unset, /nonexistent/sdlc-verify, or a non-repo dir; GIT_CEILING_DIRECTORIES=/
- When: validate_format('sdlc/{name}') and validate_format('feature/PROJ-1-{name:lower}')
- Then: each call returns its input
- Expected: return for all 5 environments
- Actual: return for all 10 calls
- Result: pass
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:99`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-2 '`

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-3 (VS-1): Property: validate_format agrees with a model written from the spec text and a direct git call

- Requirements: R-001, R-017
- Given: 1500 formats per seed: half from testkit arb.format (braces, unicode whitespace, control chars, NUL, lone surrogates, non-strings), half one-placeholder formats with git-unsafe literals
- When: validate_format(fmt) is compared with the model: non-string, placeholder count != 1, brace outside the placeholder, Unicode White_Space, then git check-ref-format --branch on the S-001 candidate
- Then: the verdicts agree; a git refusal carries check-ref-format and git's reason; no other exception
- Expected: Fail or the exact input as the model says; no exception
- Actual: 0 violations for seed 20261009 (448 accepted) and seed 777123 (458 accepted), 1500 runs each
- Result: pass
- Spec source: R-017 quote and acceptance; R-001 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:119`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-3 '`

**validate_format vs spec model** (property-run)

```
property validate_format-model: seed=20261009 runs=1500 accepted=448 violations=0
property validate_format-model: seed=777123 runs=1500 accepted=458 violations=0
no shrinking (testkit has none); no counterexample
```

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-4 (VS-2): Structurally malformed formats and non-strings raise Fail and no other exception

- Requirements: R-001, R-017, R-071
- Given: the malformed list of VS-2
- When: validate_format with sdlc/, {name}{name}, {name}{name:lower}, {{name}, {name}}, {}, sdlc/{ name }, tab, newline, U+00A0, U+3000, U+2028, {NAME}, {name:upper}, {Name}, '', None, 7, 1.5, True, [], ['sdlc/{name}'], dict, bytes; and every attack-corpus unicode-whitespace entry
- Then: each raises Fail
- Expected: Fail for every malformed input; no exception for any corpus entry
- Actual: Fail for all 24 malformed inputs. Corpus: nbsp, em-space, ideographic, line-sep, para-sep, ogham, narrow-nbsp give Fail; zwsp, zwnj, zwj, bom, mongolian-vs return the format (git accepts them; they are not Unicode White_Space)
- Result: pass
- Spec source: R-001 acceptance; R-017 acceptance; R-071
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:149`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-4 '`

**unicode-whitespace outcomes** (log)

```
nbsp Fail | em-space Fail | ideographic Fail | line-sep Fail | para-sep Fail | ogham Fail | narrow-nbsp Fail | nbsp-only Fail | trailing-nbsp Fail
zwsp return | zwnj return | zwj return | bom return | mongolian-vs return
```

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-5 (VS-3): Literal parts that git refuses raise Fail with git's reason, the same verdict as a direct git call

- Requirements: R-017, R-071
- Given: 24 formats with .., .lock, leading - or /, trailing / or ., //, ~ ^ : ? * [ \, /.b, control chars, DEL, NUL, --format/ and -h prefixes, and @/
- When: validate_format(fmt), then git check-ref-format --branch on the same candidate
- Then: verdicts match; the message holds check-ref-format and git's reason text
- Expected: Fail with git's reason for each git-refused candidate; @/{name} accepted by both
- Actual: all verdicts match git. 21 messages carry 'check-ref-format' and git's reason. \x1f fails on the whitespace check (Python \s). NUL fails with 'embedded null byte'. A leading dash is refused by git as a name, not read as an option
- Result: pass
- Spec source: R-017 acceptance (the invalid-ref rejection carries git check-ref-format's reason)
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:164`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-5 '`

**verdicts vs git** (log)

```
"sdlc/{name}.." -> Fail; git=fatal: 'sdlc/S-001..' is not a valid branch name
"-{name}" -> Fail; git=fatal: '-S-001' is not a valid branch name
"--format/{name}" -> Fail; git=fatal: '--format/S-001' is not a valid branch name
"a\\/{name}" -> Fail; git=fatal: 'a\/S-001' is not a valid branch name
"@/{name}" -> return; git=accept
"sdlc/{name}\u0000" -> Fail; git=NUL (not passed)
full list in the log file
```

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-6 (VS-3): Shell metacharacters in the format reach git as one argv item

- Requirements: R-017
- Given: a scratch cwd and a marker path
- When: validate_format with backtick, ;, $(), | and && payloads that would create the marker if a shell ran
- Then: no marker file; verdict matches the model
- Expected: marker absent
- Actual: marker absent; each verdict matches the model
- Result: pass
- Spec source: R-017 quote (git check-ref-format --branch on the name)
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:186`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-6 '`

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-7 (VS-4): A missing or broken git gives Fail, never a crash

- Requirements: R-017
- Given: PATH is an empty dir; or holds a fake git that exits 1 silently, exits 128 with stderr 'boom', is not executable, or exits 0
- When: validate_format('sdlc/{name}'); with the exit-0 fake, validate_format('sdlc/{name}..')
- Then: Fail that names git or the exit reason; never another exception
- Expected: Fail for missing, exit 1, exit 128, not executable
- Actual: missing: Fail "... git check-ref-format: [Errno 2] No such file or directory: 'git'"; exit 1: Fail "... refuses: exit 1"; exit 128: Fail "... refuses: boom"; not executable: Fail "[Errno 13] Permission denied"; exit-0 fake: sdlc/{name}.. is accepted (seed)
- Result: pass
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:199`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-7 '`

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-8 (VS-5): split gives the spec examples and refuses other placeholder counts

- Requirements: R-020
- Given: formats with the text name and lower around the placeholder
- When: split on a/{name}.x, a/{name:lower}, {name}, {name:lower}, name/{name}lower, lower-{name:lower}-name, {name:lower}name}; and on sdlc/, '', two-placeholder forms, {NAME}, None, 3
- Then: exact tuples; Fail for the rest
- Expected: ('a/', '.x', False), ('a/', '', True) as in the spec
- Actual: all tuples exact; all 8 bad inputs give Fail
- Result: pass
- Spec source: R-020 acceptance
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:226`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-8 '`

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-9 (VS-5): Property: prefix + placeholder + suffix rebuilds the input; other counts raise Fail

- Requirements: R-020
- Given: 1500 generated formats per seed with 0 to 3 placeholders among testkit FORMAT_PIECES and name, lower, :lower}, {name: fragments
- When: split(fmt)
- Then: one placeholder: rebuild equals the input and no placeholder is left in prefix or suffix; other counts: Fail
- Expected: 0 violations
- Actual: 0 violations for seeds 20261009 and 777123
- Result: pass
- Spec source: R-020 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:245`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-9 '`

**split rebuild** (property-run)

```
property split-rebuild: seed=20261009 runs=1500 violations=0
property split-rebuild: seed=777123 runs=1500 violations=0
```

## TC-contract-10 (VS-6): name gives the spec example and lowercases only the tail

- Requirements: R-019
- Given: slice ids S-001, S-İ, S-fix-M-1-2
- When: name on sdlc/{name}, feature/PROJ-1-{name}, feature/PROJ-1-{name:lower}, FEATURE/PROJ-1-{name:lower}.X, A/{name:lower}; called twice
- Then: exact names; second call equal
- Expected: sdlc/S-001; FEATURE/PROJ-1-s-001.X; A/s-i\u0307 (dotted capital I lowercases to 2 code points)
- Actual: all exact; repeated calls are identical (determinism)
- Result: pass
- Spec source: R-019 acceptance (literal example and lowercase-only-the-tail clause; parse-back is S-007, ADR-20261009-034229)
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:271`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-10 '`

**full test run (seed 20261009)** (log): `.sdlc/slices/S-002/verification/r0/logs/contract-0-run.txt`

## TC-contract-11 (VS-6): Property: name = prefix + tail (lowercased under {name:lower}) + suffix, and stripping split's prefix and suffix gives the tail

- Requirements: R-019
- Given: 1500 (format, id) pairs per seed: mixed-case and unicode literals (Ü, İ), ids with İ, ß, Σ, ǅ, K (Kelvin), ﬃ, emoji
- When: name(fmt, 'slice', id=id) and split(fmt)
- Then: the model holds for every pair
- Expected: 0 violations
- Actual: 0 violations for seeds 20261009 and 777123
- Result: pass
- Spec source: R-019 quote and acceptance
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:289`
- Command: `VERIFY_REPO=<worktree of sdlc/S-002> node --test .sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern='TC-contract-11 '`

**name tail** (property-run)

```
property name-tail: seed=20261009 runs=1500 violations=0
property name-tail: seed=777123 runs=1500 violations=0
```

## Attacks

None in this profile.

## Seeds

- **Zero-width and BOM characters pass validate_format** (`skills/sdlc/branches.py`): validate_format accepts formats with U+200B, U+200C, U+200D, U+FEFF and U+180E, because they are not Unicode whitespace and git accepts them. A branch name can then hold an invisible character. The spec forbids only whitespace. Consider a refusal of Unicode format characters (category Cf).
- **The first git on PATH decides the validate_format verdict** (`skills/sdlc/branches.py`): A fake git on PATH that exits 0 makes validate_format accept sdlc/{name}... The spec does not define which git runs. Consider a note in the pre-flight output that names the git binary, or a check of git --version.
- **Control characters U+001C to U+001F fail as whitespace** (`skills/sdlc/branches.py`): Python re \s matches U+001C to U+001F, so validate_format refuses a\x1f/{name} with 'holds whitespace' and not with git's control-character reason. The verdict is correct. Only the message text is misleading.
