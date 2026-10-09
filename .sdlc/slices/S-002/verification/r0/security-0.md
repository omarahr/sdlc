# S-002 verify-security, part 0, round 0

- Slice: S-002
- Profile: security
- Round: 0
- Commit: 8138c9f
- Verdict: pass (9 of 9 cases pass; no in-scope defect)

## Environment

macOS (Darwin 25.6), git 2.50.1 (Apple Git-155), python3 via cli-runner and pycall, node --test

## Threat model boundary

The operator writes the branch format in `.sdlc/config.json` or `--format`. The spec does not trust the format text: R-017 says git decides the sample name. The git binary on PATH and the operator's machine are trusted. A shadowed git on PATH is VS-4 and is not in this part.

## Charters

- VS-2: Explore the structural checks with whitespace, control and zero-width characters to find a format that bypasses R-017's no-whitespace rule or raises a non-Fail exception.
- VS-3: Explore the git step with option, shell and NUL injection to find a format that git does not judge as one name, or that runs code (R-017, R-071).
- VS-8: Explore config.json with git-refused formats to find a command that does not stop with one JSON error, or that changes the repo (R-017).

## TC-security-1 (VS-2): Unicode whitespace and control characters in the format raise Fail, never another exception

- Given: The unicode-whitespace and control-chars corpus families, each put into a/<value>/{name}, plus tab, newline, U+00A0 and U+3000 forms.
- When: validate_format runs on each format through pycall.
- Then: Each format that holds Python whitespace, or whose sample name git refuses, raises Fail. No format raises another exception.
- Expected: Fail for every whitespace or git-refused format; no other exception.
- Actual: All whitespace and C0 control forms raise Fail. Six corpus entries return the format: U+200B, U+200C, U+200D, U+FEFF, U+180E and C1 U+009B. Python \s does not match them, and git accepts them.
- Result: pass
- Spec source: R-017 quote: no whitespace, and the sample passes git check-ref-format --branch
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:45`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**attack: accepted corpus entries**

```
unicode-whitespace zwsp 'a\u200bb' -> return
unicode-whitespace zwnj 'a\u200cb' -> return
unicode-whitespace zwj 'a\u200db' -> return
unicode-whitespace bom '\ufeffa' -> return
unicode-whitespace mongolian-vs 'a\u180eb' -> return
control-chars c1-csi '\x9b31m' -> return
all other entries -> Fail
```

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-2 (VS-2): Zero-width characters get the same verdict as git

- Given: The formats a\u200b/{name}, a\ufeff/{name}, \u200b{name}, a/{name}\u200d and a\u2060/{name}.
- When: validate_format runs on each, and git check-ref-format --branch runs on the same sample name.
- Then: validate_format accepts exactly when git accepts, and returns the input unchanged.
- Expected: Same verdict as git.
- Actual: All five return the input; git accepts all five sample names.
- Result: pass
- Spec source: R-017 quote: name(fmt, "slice", id="S-001") passes git check-ref-format --branch
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:61`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**attack: direct git call**

```
$ git check-ref-format --branch $'a\xe2\x80\x8b/S-001'
a\u200b/S-001
exit 0
```

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-3 (VS-3): Git-refused literal parts raise Fail with git's reason

- Given: 23 formats: .., .lock, leading dash forms, --upload-pack=, leading or trailing slash, //, ~ ^ : ? * [ \, /.b, leading dot, trailing dot, \x01, DEL, ESC.
- When: validate_format runs on each; git check-ref-format --branch runs on each sample name.
- Then: git refuses every sample, and validate_format raises Fail with check-ref-format and is not a valid branch name in the message.
- Expected: Fail with git's reason for all 23.
- Actual: Fail with git's reason for all 23.
- Result: pass
- Spec source: R-017 acceptance: the invalid-ref rejection carries git check-ref-format's reason
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:73`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**attack: sample messages**

```
'sdlc/{name}..' -> Fail: ... gives 'sdlc/S-001..', which git check-ref-format refuses: fatal: 'sdlc/S-001..' is not a valid branch name
'a\x01/{name}' -> Fail: ... fatal: 'a?/S-001' is not a valid branch name
'--upload-pack=touch{name}' -> Fail: ... fatal: '--upload-pack=touchS-001' is not a valid branch name
```

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-4 (VS-3): A leading dash reaches git as the name, not as an option

- Given: The formats -{name}, --{name}, --help{name}, --normalize{name}, --branch{name}, -h{name}.
- When: validate_format runs on each.
- Then: git reports the candidate itself as not a valid branch name and prints no usage text.
- Expected: Fail naming the candidate; no usage text.
- Actual: Fail naming the candidate for all six; no usage text.
- Result: pass
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:91`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-5 (VS-3): A NUL in the format raises Fail, not ValueError

- Given: The nul corpus family put after sdlc/{name}, plus sdlc/{name}\x00, \x00{name} and a\x00b/{name}.
- When: validate_format runs on each through pycall (argv cannot carry a NUL).
- Then: Each raises Fail.
- Expected: Fail.
- Actual: Fail: cannot check the branch format ... with git check-ref-format: embedded null byte.
- Result: pass
- Spec source: R-017 quote: raises Fail unless the sample passes git check-ref-format
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:100`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-6 (VS-3): Shell metacharacters reach git as one argv item and run no shell

- Given: Six no-space shell payloads such as $(>pwned){name}, `>pwned`{name}, x;>pwned;{name}, plus the injection corpus put before /{name}.
- When: branches.py name --format <payload> runs in a scratch repo from a watched scratch cwd.
- Then: No pwned file appears, the tree and refs do not change, stdout is one JSON object, and ok matches the structural checks plus a direct git verdict.
- Expected: No side effect; verdict equals the oracle.
- Actual: No pwned file; tree unchanged; every verdict equals the oracle. $(>pwned){name} is accepted and echoed unchanged, because git accepts the name.
- Result: pass
- Spec source: R-017 quote; plan: the git call uses an argument list, never a shell
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:108`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**db-diff: tree and refs snapshot**

```
cli-runner treeUnchanged=true for cwd and repo, every payload; no file named pwned
```

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-7 (VS-3): A hostile cwd repo config runs no code and does not change the verdict

- Given: The cwd is a git repo with core.fsmonitor and an alias named check-ref-format, both set to touch a PWNED file.
- When: branches.py name runs with sdlc/{name} and with sdlc/{name}..
- Then: Exit 0 and exit 2, and no PWNED file in the cwd.
- Expected: No code runs.
- Actual: Exit 0 and 2; no PWNED file.
- Result: pass
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:128`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-8 (VS-8): A git-refused branchFormat in config.json stops every command with one JSON error

- Given: Seven git-refused branchFormat values in .sdlc/config.json of a scratch repo with branch sdlc/S-1.
- When: name, parse, list and preflight --mode pr run without --format.
- Then: Each exits 2 with one JSON object, ok false, an error with is not a valid branch name, empty stderr, and no tree or ref change.
- Expected: 28 refusals, no side effect.
- Actual: 28 refusals, no side effect.
- Result: pass
- Spec source: R-017 quote; spec CLI: an invalid format exits 2
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:150`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**db-diff: tree and refs**

```
treeUnchanged=true for all 28 runs (refs included)
```

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## TC-security-9 (VS-8): --format overrides config.json in both directions

- Given: One repo with a valid config (feature/{name}) and one with an invalid config (-{name}).
- When: Each of the four commands runs with --format sdlc/{name}.. and with --format sdlc/{name} respectively.
- Then: The invalid override exits 2; the valid override exits 0 and echoes sdlc/{name}; nothing changes on disk.
- Expected: As stated.
- Actual: As stated.
- Result: pass
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:166`
- Command: `node --test .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs`

**log: node --test run, 9 of 9 pass**

See `.sdlc/slices/S-002/verification/r0/logs/security-0-run.txt`.

## Attacks

| id | charter | input | expected | observed | result | test |
|---|---|---|---|---|---|---|
| A-1 | VS-2 whitespace bypass | unicode-whitespace and control-chars corpus | Fail | Fail, except zero-width and C1 CSI, which git accepts | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:45 |
| A-2 | VS-2 zero-width split between regex and git | U+200B, U+FEFF, U+200D, U+2060 | verdict equals git | accepted, git accepts | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:61 |
| A-3 | VS-3 git-refused literals | 23 formats from the scenario notes | Fail with git reason | Fail with git reason | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:73 |
| A-4 | VS-3 option injection into git | -{name}, --help{name}, --normalize{name}, --branch{name}, -h{name}, --upload-pack=touch{name} | git reads the name, not an option | git reports the name as invalid | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:91 |
| A-5 | VS-3 NUL | nul corpus | Fail | Fail (embedded null byte) | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:100 |
| A-6 | VS-3 shell injection | $(>pwned){name}, `>pwned`{name}, x;>pwned;{name}, injection corpus | no shell, no side effect | no file, tree unchanged | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:108 |
| A-7 | VS-3 hostile cwd git config | core.fsmonitor and alias.check-ref-format in cwd repo | no code runs | no code runs | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:128 |
| A-8 | VS-8 hostile config.json | 7 git-refused branchFormat values x 4 commands | exit 2, one JSON, no change | as expected | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:150 |
| A-9 | VS-8 override precedence | --format against valid and invalid config | --format wins | --format wins | held | .sdlc/slices/S-002/verification/r0/tests/security-0/branch-format.verify-security.test.mjs:166 |
| A-10 | VS-3 ref namespace confusion | refs/heads/{name}, HEAD{name}, @{name} | no spec rule | accepted, because git check-ref-format --branch accepts them | out-of-scope | manual probe |
| A-11 | VS-3 lone surrogate | a\udc80/{name} in Python | no spec rule | accepted; git sees byte 0x80 and accepts | out-of-scope | manual probe |

## Seeds

- **Invisible and terminal-control characters pass the format check** (skills/sdlc/branches.py): validate_format accepts U+200B, U+200C, U+200D, U+FEFF, U+2060, U+180E and C1 U+009B (CSI) in the literal part, because git accepts them. A branch name can then look the same as another name or carry a terminal escape. The spec delegates this to git, so it is not a defect.
- **Formats that start with refs/heads/, HEAD or @ pass** (skills/sdlc/branches.py): refs/heads/{name}, refs/{name}, HEAD{name} and @{name} pass git check-ref-format --branch. refs/heads/{name} gives the branch refs/heads/refs/heads/S-001, which is ambiguous with refs. Consider a rule if the spec wants one.
- **A lone surrogate in a Python-side format passes** (skills/sdlc/branches.py): validate_format('a\udc80/{name}') returns the format. Python passes the surrogate to git as byte 0x80, which git accepts. The format is not valid Unicode, so later JSON or forge calls can treat it differently.
