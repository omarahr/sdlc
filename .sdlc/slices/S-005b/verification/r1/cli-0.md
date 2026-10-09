# S-005b verification: cli profile, part 0, round 1

- Slice: S-005b (R-119)
- Profile: cli
- Round: 1 (plan r1)
- Commit: 1fa953b
- Verdict: refuted. 2 in-scope cases fail: TC-cli-32, TC-cli-33 (VS-13).
- Cases: 27 run, 25 pass.

## Environment

macOS 26 (Darwin 25.6.0), Node v24.19.0, Python 3.14.7 (/opt/homebrew/bin/python3 -I), 3.12.14 (~/.local/bin) and 3.9.6 (/usr/bin) for TC-cli-9, git 2.50.1 (Apple Git-155). Slice tip 1fa953b; the product fix is e71f8c8, and 1fa953b adds only the testkit. push_guard.py runs on scratch copies of skills/sdlc and hooks through the testkit cli-runner; behavior cases use the module-loader and bare git remotes in scratch directories.

## Earlier report

An earlier round 1 cli-0 report for the same product commit e71f8c8 followed plan r0. Its cases TC-cli-13 to TC-cli-27 are in git at commit 8734b94, at this path. Its test file stays at tests/cli-0/push-guard.verify-cli.test.mjs and its logs stay at logs/cli-0-run.txt and logs/cli-0-transcripts.txt. Plan r1 gives its VS-14 to VS-17 forms to another part.

Logs: `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-run.txt`, `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`, `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-1 (VS-1): D-1 m1 to m3 in the next-action run body change wrapperBodies (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; plan-r1 VS-1 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:103`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-1:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add each gh api write form (-X POST, -f head=, --method=POST) under an if in the run body, then run push_guard.py.

Then: wrapperBodies changes for each form.

Expected: Each form changes wrapperBodies.

Actual: 3 of 3 forms change wrapperBodies.

TC-cli-1 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-2 (VS-1): Each TC-cli-18 and TC-cli-20 form in each of the five bodies changes wrapperBodies (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:117`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-2:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add 16 forms under if False: in each of the five pinned bodies (80 mutants), then run push_guard.py.

Then: wrapperBodies changes for every mutant.

Expected: Every mutant changes wrapperBodies.

Actual: 80 of 80 mutants change wrapperBodies.

TC-cli-2 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-3 (VS-1): Control-flow push forms inside a body change wrapperBodies (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:146`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-3:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add a conditional verb, a rebound parameter, try/finally, with, lambda and comprehension push inside the bodies.

Then: wrapperBodies changes for each form.

Expected: Each form changes wrapperBodies.

Actual: 8 of 8 forms change wrapperBodies.

TC-cli-3 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-4 (VS-1): A push through a helper outside the body breaks wrapperBodies and the helper site (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:165`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-4:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Call a module-level helper that pushes from the state-write git body and from the impact run body.

Then: wrapperBodies changes, and the helper adds a pushes or opaque entry.

Expected: Both changes appear.

Actual: Both mutants change wrapperBodies; the helpers add pushes, and opaque plus direct.

TC-cli-4 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-5 (VS-2): A decorator, a new parameter, an annotation, a default or async changes wrapperBodies (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; plan-r1 VS-2 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:180`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-5:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Change each pinned def line in 7 ways, then run push_guard.py.

Then: wrapperBodies changes for each edit.

Expected: Each edit changes wrapperBodies.

Actual: 7 of 7 edits change wrapperBodies.

TC-cli-5 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-6 (VS-2): A duplicate, shadowing, nested, method or async def with a wrapper name adds a wrapperBodies entry (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:198`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-6:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add a second def with a wrapper name in 5 forms.

Then: wrapperBodies holds 6 entries in place of 5.

Expected: Each form adds an entry.

Actual: 5 of 5 forms give 6 entries.

TC-cli-6 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-7 (VS-2): A wrapper name bound by a lambda, by another wrapper or by an import alias breaks another pin (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:219`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-7:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Append git = lambda, run = git_lines and from urllib.request import urlopen as run.

Then: At least one key changes for each form.

Expected: Each form changes a key.

Actual: 3 of 3 forms change a key (direct, wrapperValues, imports or network).

TC-cli-7 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-8 (VS-3): A comment, a blank line, a continuation, CRLF or a tab indent keeps every key (re-run)

- Result: **pass**
- Spec source: plan-r1 VS-3 notes; R-119 acceptance
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:233`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-8:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add comment and blank lines to each body, a trailing comment, a changed comment, a backslash continuation, CRLF ends, a tab indent, and a comment between two decorators.

Then: Every key stays equal to the pins.

Expected: Every key stays equal.

Actual: 8 of 8 edits keep every key equal.

TC-cli-8 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-9 (VS-3): wrapperBodies is equal on python 3.14, 3.12 and 3.9 (re-run)

- Result: **pass**
- Spec source: plan-r1 VS-3 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:256`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-9:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: The unmutated scratch copy.

When: Run push_guard.py with /opt/homebrew/bin/python3.14, ~/.local/bin/python3.12 and /usr/bin/python3.

Then: Each version that loads the scanner gives output equal to the pins.

Expected: All outputs are equal.

Actual: Python 3.14.7, 3.12.14 and 3.9.6 load the scanner; wrapperBodies and every other key are equal.

TC-cli-9 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-10 (VS-3): A token-equal re-quote changes the body text (observation, re-run)

- Result: **pass**
- Spec source: plan-r1 VS-3 notes (observation)
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:274`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-10:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Re-quote 'git' with single quotes in the state-write git body.

Then: Record whether wrapperBodies changes.

Expected: The re-quote changes wrapperBodies.

Actual: wrapperBodies changes: the pin holds the source text of a string token, not its value.

TC-cli-10 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-11 (VS-4): Outside a body, a non-constant program, verb, option or api path gives an opaque entry (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; plan-r1 VS-4 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:280`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-11:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add 11 wrapper calls in new functions with a list spread, a parameter verb, an f-string verb, a variable program, a variable -X, a parameter api path, -c from a variable, a variable gh option and --git-dir from a variable.

Then: Each form gives an opaque or forgeViolations entry; the clean tree has empty opaque and forgeViolations.

Expected: Each form is opaque, and the clean lists are empty.

Actual: 11 of 11 forms give an entry; clean opaque and forgeViolations are empty.

TC-cli-11 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-12 (VS-4): -C with a variable value before push still records the push (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:304`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-12:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add git(repo, '-C', d, 'push', ...) and git(repo, '-C', *x).

Then: The first adds a pushes entry; the second changes a key.

Expected: Both change a key.

Actual: pushes gains the -C push; the starred form changes a key.

TC-cli-12 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-13 (VS-5): Each covered git push spelling outside a body breaks a pin (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; plan-r1 VS-5 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:311`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-13:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add 20 push spellings: quotes, split lines, implicit concatenation, +, -C, -c, refspec, --mirror, --all, direct site, shell=True, argv variable, tuple, the three other wrappers, --no-pager, send-pack and collect.py.

Then: Each spelling changes a key.

Expected: Each spelling changes a key.

Actual: 20 of 20 spellings change a key.

TC-cli-13 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-14 (VS-5): Corpus spellings of the push verb break a pin or are not a push (re-run)

- Result: **pass**
- Spec source: plan-r1 VS-5 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:342`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-14:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Use each unicode-confusables, unicode-whitespace and control-chars entry as the verb text.

Then: Each entry changes a key.

Expected: Each entry changes a key.

Actual: Every corpus entry changes a key.

TC-cli-14 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-15 (VS-6): Pull-request creation and forge writes give a forgeViolations or opaque entry (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:356`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-15:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add 21 forge write forms: gh pr create, glab mr create, -R and --repo before the verb, -X and --method in any case, -f, -F, --field, --raw-field, --input, pulls and merge_requests paths, and graphql with and without flags.

Then: Each form gives a forgeViolations or opaque entry.

Expected: Each form gives an entry.

Actual: 21 of 21 forms give a forgeViolations or opaque entry.

TC-cli-15 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts.txt`

## TC-cli-16 (VS-7): A process or network call by an alias, a value or dynamic code breaks a pin (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:389`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-16:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add 32 forms: aliases bound before use, posix, nt, _posixsubprocess, _winapi, _socket, _ssl, process APIs as values, eval, exec, compile, __import__, breakpoint, importlib, globals, locals, __builtins__, vars(), a private attribute, shutil.os.system, branches.subprocess.run, a new import, asyncio, posix_spawnp, execvp, pty.spawn and urlopen.

Then: Each form changes a key.

Expected: Each form changes a key.

Actual: 32 of 32 forms change a key. Late aliases and submodule chains belong to VS-15 and VS-16 in plan r1.

TC-cli-16 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-20 (VS-8): The loop script gains no process or network access (re-run)

- Result: **pass**
- Spec source: plan-r1 VS-8 notes; R-119 acceptance
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:433`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-20:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of the tree with sdlc-loop.js.

When: Append 20 lines to sdlc-loop.js: banned names in code and strings, through \u and \u{} escapes, and 'global' in other quotes and a new place.

Then: Each line adds a jsHits or jsAllowed entry; the clean tree holds 3 decisionPanel lines in jsAllowed.

Expected: Each line changes a key.

Actual: 20 of 20 lines change jsHits or jsAllowed; the clean jsAllowed holds the 3 lines.

TC-cli-20 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-21 (VS-9): A new verify branch reference in verifyPhase fails T-R-119d (re-run)

- Result: **pass**
- Spec source: plan-r1 VS-9 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:473`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-21:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc.

When: Run the T-R-119d repo test on the clean copy, then on copies that pass the branch to the integrator, to the state-writer, and rename the builder.

Then: The clean copy passes, and each mutant fails the test.

Expected: Clean passes; mutants fail.

Actual: Clean exit 0; 3 of 3 mutants exit non-zero.

TC-cli-21 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-28 (VS-9): No phase of the loop other than verifyPhase builds a verify branch name

- Result: **pass**
- Spec source: plan-r1 VS-9 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:492`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-28:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: sdlc-loop.js at the slice tip.

When: Read every line of sdlc-loop.js that builds a -v<round>- name.

Then: Only one line, inside verifyPhase, builds the name.

Expected: One line inside verifyPhase.

Actual: One line: 727 const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`, inside verifyPhase.

verify name builders in sdlc-loop.js (log):

```
727: const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`
```

TC-cli-28 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-29 (VS-10): A new script type, a symlink or a non-UTF-8 source fails the guard

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; plan-r1 VS-10 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:536`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-29:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add .sh, .mjs, .cjs, .ts and extension-less executables under skills/sdlc and hooks; symlinks to a directory and a file; a wrapper file replaced by a link; latin-1 cookies; BOM files.

Then: New files change files; links and latin-1 sources give opaque entries; a BOM file is scanned; BOM on the four wrapper files alone keeps every key.

Expected: Each form changes the expected key, and the BOM control keeps every key.

Actual: 15 of 15 forms change the expected key; the BOM control keeps every key.

TC-cli-29 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-30 (VS-11): A spec-required forge read outside a body changes only a pin and hits no ban

- Result: **pass**
- Spec source: plan-r1 VS-11 notes; R-119 acceptance
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:580`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-30:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add gh pr list, gh pr view, gh api GET, gh api with no method, glab mr list and glab api push_rule through run, and two direct sites in branches.py.

Then: forge changes; only forge, wrapperVerbs or direct change; forgeViolations and opaque stay empty; wrapperBodies stays equal.

Expected: Every read meets the rule.

Actual: 8 of 8 reads meet the rule.

TC-cli-30 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-31 (VS-12): A verify branch stays local when the push-capable scripts run against a real remote

- Result: **pass**
- Spec source: R-119 acceptance (a verify branch stays local); plan-r1 VS-12 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:659`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-31:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A work repo with a bare origin, gh absent from PATH, and local branches named by branches.py name --kind verify (sdlc/S-001-v0-cli-0, sdlc/S-002a-v3-security-1).

When: Run state-write.py patch-slice (twice), base-branch and status in pr, direct and mr mode; stack patch-slice (fetch --prune, run and milestone push); janitor.py; next-action.py.

Then: The bare remote holds no verify ref after each run; the run and milestone branches may reach it.

Expected: No verify ref reaches the remote.

Actual: After every run the remote holds main, and in stack mode sdlc/M-1 and sdlc/run-1. No verify ref. The pr and direct fetch path ran (origin/main present).

stack patch-slice and the bare remote after it (transcript):

```
$ python3 state-write.py patch-slice --repo <repo> --slice S-014
exit: 0 (614 ms)
{"ok": true, "branch": "sdlc/S-014", "commit": "049a6d2"}
--- bare remote refs after
refs/heads/main
refs/heads/sdlc/M-1
refs/heads/sdlc/run-1
```

TC-cli-31 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-25 (VS-13): Seed probe S1: a variable option after a known wrapper verb (re-run)

- Result: **pass**
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e seed S1
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:780`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-25:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A work repo with a bare origin and a local verify branch.

When: Add git(repo, 'fetch', '-q', 'origin', opt) in a new function; call it with opt set to --upload-pack=git push origin <branch>;:.

Then: Record the keys and the push. The option value flows in from a parameter, so this is seed S1.

Expected: Recorded as a seed.

Actual: Every key stays equal, and the call pushes the verify branch. Seed S1, not a refutation.

TC-cli-25 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-32 (VS-13): A new option after a known wrapper verb, in any literal spelling, breaks a pin or is opaque

- Result: **fail**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e covered scope; plan-r1 VS-13 notes; verify-spec-fidelity-r1 D-1
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:705`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-32:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy of skills/sdlc and hooks from the slice tip, and the clean guard output as the pins.

When: Add 16 literal option forms after a known verb in new functions, then run push_guard.py.

Then: Each form changes wrapperVerbs, gives an opaque entry or changes pushes.

Expected: Each form changes a key.

Actual: 7 of 16 forms leave every key equal: m1 f"{''}--upload-pack=...", m2 "--upload-pack=...".strip(), m3 str("--upload-pack=...") through next-action run, a local list spread *opts, "{}".format(...), "%s" % ..., and "".join(["--upload-pack=", ...]). The split two-token form, --receive-pack, --exec, -u, --upl, a leading space, + of constants and an inline starred list change wrapperVerbs.

guard output equals the pins for (log):

```
m1 f-string with a leading formatted value, state-write.py: no key
m2 .strip() of a constant option, state-write.py: no key
m3 str() of a constant option through next-action run: no key
local list spread after the verb, state-write.py: no key
option from format(), state-write.py: no key
option from a % format, state-write.py: no key
option from join, state-write.py: no key
```

TC-cli-32 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-33 (VS-13): The hidden-option mutants push a verify branch to a bare remote while the guard output equals the pins

- Result: **fail**
- Spec source: R-119 acceptance (a verify branch stays local); ADR-20261009-062930-decision-judge-S-005-388e refutation rule; plan-r1 VS-13 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:761`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-33:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A work repo with a bare origin and a local branch sdlc/S-001-v0-http-api-0; git 2.50.1 (Apple Git-155).

When: Build each mutant in a scratch copy, run push_guard.py, then load the module with the module-loader and call _mutant(repo, branch).

Then: The guard output differs from the pins, or the bare remote has no verify ref.

Expected: No mutant pushes with every key equal; control m4 pushes and the guard flags it.

Actual: m1, m2, m3, the local list spread, format() and join each push refs/heads/sdlc/S-001-v0-http-api-0 to the bare remote, and each leaves every key equal. Control m4 pushes and changes wrapperVerbs.

m1 against a bare remote (transcript):

```
guard changed keys: <none>
$ python3 -I testkit/loadcall.py <scratch>/skills/sdlc/state-write.py _mutant '["<repo>","sdlc/S-001-v0-http-api-0"]' <result>
exit: 0 (178 ms)
outcome: return
--- remote <bare>
refs before: <none>
refs after: refs/heads/sdlc/S-001-v0-http-api-0
refs added: refs/heads/sdlc/S-001-v0-http-api-0
```

TC-cli-33 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-34 (VS-13): On the clean tree opaque is empty and no wrapperVerbs option can run a command

- Result: **pass**
- Spec source: plan-r1 VS-13 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:786`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-34:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: The clean guard output.

When: Read the 37 four-word wrapperVerbs entries and the opaque, dynamic and forgeViolations lists.

Then: opaque, dynamic and forgeViolations are empty; no option entry is --upload-pack, --receive-pack, --exec, -c, --config, --exec-path, --git-dir, --work-tree or -u on fetch.

Expected: No such entry.

Actual: The lists are empty; the 37 entries hold only reading, quiet or format options, and push -u, --force-with-lease.

TC-cli-34 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## TC-cli-35 (VS-13): A corpus whitespace or invisible character in front of a hidden option breaks a pin or does not push

- Result: **pass**
- Spec source: plan-r1 VS-13 notes
- Test: `.sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs:735`
- Command: `VERIFY_ROOT="$TMPDIR/sdlc-S-005b-v1-cli-0" node --test --test-name-pattern "TC-cli-35:" .sdlc/slices/S-005b/verification/r1/tests/cli-0/push-guard-plan-r1.verify-cli.test.mjs`

Given: A scratch copy with each unicode-whitespace entry in front of --upload-pack=git push origin <verify branch>;:, and a work repo with a bare origin.

When: Run push_guard.py, then load the mutated state-write.py and call the mutant.

Then: Each entry changes a key or does not push.

Expected: No entry pushes with every key equal.

Actual: 14 of 14 entries do not push: git reads the argument as a refspec. 2 entries change wrapperVerbs.

TC-cli-35 guard transcripts and key deltas (transcript): `.sdlc/slices/S-005b/verification/r1/logs/cli-0-plan-r1-transcripts-2.txt`

## Attacks

None. The security profile owns the attack cases.

## Seeds

- **S1: an option value from a parameter hides from wrapperVerbs and pushes** (`skills/sdlc/test/push_guard.py`): TC-cli-25: git(repo, 'fetch', '-q', 'origin', opt) with opt set to an --upload-pack command leaves every key equal and pushes a verify branch to a bare remote. The value flows in from a parameter, so ADR-388e makes it seed S1.
- **wrapperVerbs holds no call site** (`skills/sdlc/test/push_guard.py`): A new call of a pinned verb and option in a new function changes no key. A reviewer cannot see a new fetch site from the pins.
- **A token-equal re-quote changes wrapperBodies** (`skills/sdlc/test/push_guard.py`): TC-cli-10: the pin holds the string source text. A quote style change asks a reviewer to update the pin. This is not a code change.
- **A unicode hyphen in front of upload-pack is a refspec to git** (`skills/sdlc/test/push_guard.py`): TC-cli-32 observation and TC-cli-35: U+2010 and whitespace characters make git read the argument as a refspec. Nothing pushes.
