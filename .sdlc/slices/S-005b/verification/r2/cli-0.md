# S-005b verification: cli profile, part 0, round 2

- Slice: S-005b (verify branches stay local: the push guard)
- Profile: cli
- Round: 2 (plan round 1)
- Commit: 39aa68f
- Verdict: REFUTED. A bytes option after a known wrapper verb leaves every key equal and pushes a verify branch.

## Environment

macOS (Darwin 25.6), Node v24, Python 3.14.7 (/opt/homebrew/bin/python3), git version 2.50.1 (Apple Git-155); push_guard.py run through the testkit cli-runner on scratch copies of skills/sdlc and hooks; mutants called through the testkit module-loader against a local bare remote

Test file: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs`

Command: `VERIFY_ROOT=<worktree of sdlc/S-005b at 39aa68f> VERIFY_LOG=.sdlc/slices/S-005b/verification/r2/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs`

Run log: `.sdlc/slices/S-005b/verification/r2/logs/cli-0-run.txt`. Transcripts: `.sdlc/slices/S-005b/verification/r2/logs/cli-0-transcripts.txt` and `.sdlc/slices/S-005b/verification/r2/logs/cli-0-transcripts-2.txt`.

## TC-cli-32 (VS-13): A new option after a known wrapper verb, in any str spelling, breaks a pin or is opaque (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:107`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: 16 option forms after fetch or push are added one at a time: m1 f-string, m2 .strip(), m3 str(), list spread, inline star, split option, --receive-pack, --exec, -u, --upl, padded, +, format(), %, join().

Then: push_guard.py runs on each copy.

Expected: Each form changes wrapperVerbs, opaque or pushes.

Actual: All 16 forms change wrapperVerbs. The U+2010 confusable form also changes wrapperVerbs (observation).

## TC-cli-33 (VS-13): The str hidden-option mutants do not push a verify branch while the guard passes (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:137`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline; a work repo with a bare origin and the local branch sdlc/S-001-v0-cli-0.

When: Six hidden-option mutants and one control are loaded with module-loader and called.

Then: The bare remote refs and the guard keys are compared.

Expected: No mutant pushes with every key equal.

Actual: Each mutant pushes the verify branch, and the guard flags each one in wrapperVerbs

## TC-cli-34 (VS-13): On the clean tree opaque is empty and no wrapperVerbs entry can run a command (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:156`

Given: The clean tree at 39aa68f.

When: push_guard.py runs.

Then: The 37 option entries and the 28 value entries are read.

Expected: opaque, dynamic and forgeViolations are empty; no entry names --upload-pack, --receive-pack, --exec, -c, --config or fetch -u.

Actual: As expected

## TC-cli-35 (VS-13): A corpus whitespace or invisible character in front of a hidden option breaks a pin or does not push (re-run)

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:174`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: Each attack-corpus unicode-whitespace value is put in front of the --upload-pack option.

Then: The guard runs and the mutant is called against a bare remote.

Expected: No entry pushes with every key equal.

Actual: No entry pushes with every key equal

## TC-cli-36 (VS-13): An option after a known wrapper verb as a bytes constant leaves every key equal

- Result: **fail**
- Spec source: R-119 acceptance; tests.md R-119 scope (a push through a pinned wrapper in any spelling of the constant arguments; wrapperVerbs holds one entry per option after the verb); ADR-20261009-062930-decision-judge-S-005-388e (a new process call in a scanned file that leaves the output equal to the pins refutes R-119)
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:187`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: A bytes option is added after fetch: b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:" in a state-write.py git call, the same in a next-action.py run call, and b"-u" in a state-write.py git call.

Then: push_guard.py runs on each copy.

Expected: Each form changes wrapperVerbs, opaque or pushes.

Actual: The three forms leave every key equal. The suite-receipt.py and impact.py forms break wrapperVerbs only because their verb is new in that file.

Evidence (transcript): bytes option: guard output and push

```
=== TC-cli-36 bytes --upload-pack after fetch, state-write.py
mutant: git(repo, "fetch", "origin", b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:", check=False)
$ python3 -I skills/sdlc/test/push_guard.py <tree>
exit: 0 (86 ms) tree unchanged: true
changed keys: <none>

=== TC-cli-37 behavior bytes --upload-pack after fetch, state-write.py
git version 2.50.1 (Apple Git-155)
guard changed keys: <none>
$ python3 -I skills/sdlc/test/testkit/loadcall.py <tree>/skills/sdlc/state-write.py _mutant '["<repo>","sdlc/S-001-v0-cli-0"]'
exit: 0 (182 ms)
outcome: return
--- remote <bare origin>
refs before: <none>
refs after: refs/heads/sdlc/S-001-v0-cli-0
refs added: refs/heads/sdlc/S-001-v0-cli-0
```

## TC-cli-37 (VS-13): A bytes --upload-pack mutant pushes a verify branch to a bare remote while the guard output equals the pins

- Result: **fail**
- Spec source: R-119 acceptance (a verify branch stays local); ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:204`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline; a work repo with a bare origin and the local branch sdlc/S-001-v0-cli-0.

When: The state-write.py and next-action.py bytes mutants are loaded with module-loader and called.

Then: The bare remote refs and the guard keys are compared.

Expected: The guard flags the mutant, or the bare remote has no verify ref.

Actual: Both mutants push refs/heads/sdlc/S-001-v0-cli-0 to the bare remote with every guard key equal. The suite-receipt.py mutant raises TypeError and is flagged.

Evidence (transcript): bytes mutant push

```
=== TC-cli-36 bytes --upload-pack after fetch, state-write.py
mutant: git(repo, "fetch", "origin", b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:", check=False)
$ python3 -I skills/sdlc/test/push_guard.py <tree>
exit: 0 (86 ms) tree unchanged: true
changed keys: <none>

=== TC-cli-37 behavior bytes --upload-pack after fetch, state-write.py
git version 2.50.1 (Apple Git-155)
guard changed keys: <none>
$ python3 -I skills/sdlc/test/testkit/loadcall.py <tree>/skills/sdlc/state-write.py _mutant '["<repo>","sdlc/S-001-v0-cli-0"]'
exit: 0 (182 ms)
outcome: return
--- remote <bare origin>
refs before: <none>
refs after: refs/heads/sdlc/S-001-v0-cli-0
refs added: refs/heads/sdlc/S-001-v0-cli-0
```

## TC-cli-38 (VS-13): Other spellings of an option after a known wrapper verb break a pin or are opaque

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:218`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: Ten forms are added: whole argv starred into git and run, a conditional expression, a subscript, a walrus, a tuple star with a keyword spread, list(), list +, list *, impact run argv.

Then: push_guard.py runs on each copy.

Expected: Each form changes wrapperVerbs, opaque or pushes.

Actual: Each form changes a listed key

## TC-cli-25 (VS-13): Seed probe S1: a variable option after a known wrapper verb (re-run)

- Result: **pass**
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e seed S1; ADR-20261009-120000-implementer-S-005b-5e7d
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:240`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: A state-write.py mutant passes a parameter opt after fetch.

Then: The guard runs and the mutant is called.

Expected: Seed S1: recorded, never a refutation.

Actual: The guard flags it in wrapperVerbs (value entry); the seed is closed for this form

## TC-cli-101 (VS-14): A git option before the verb that can run a command or change the target is opaque

- Result: **pass**
- Spec source: tests.md R-119 scope (a git option before the verb other than -C, -c and five flag options makes the call opaque; -c is opaque since fix round 1)
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:246`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: 16 pre-verb options (-c glued and split, --config-env in two forms, --exec-path, --git-dir in two forms, --work-tree, --namespace, --super-prefix, --attr-source, --exec-pa, --conf, -p, --paginate, --list-cmds) are put at six sites: the four wrappers, a janitor.py list-literal direct site and a janitor.py shell=True site.

Then: push_guard.py runs on each of the 96 copies.

Expected: Each copy has an opaque entry.

Actual: Each of the 96 copies has an opaque entry

## TC-cli-105 (VS-14): The five allowed git flag options before the verb cannot run a command or push

- Result: **pass**
- Spec source: tests.md R-119 scope (the five allowed flag options); VS-14 notes
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:285`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline; a work repo with a bare origin.

When: --no-pager, --no-optional-locks, --literal-pathspecs, --no-replace-objects and --bare are put before diff in a state-write.py git call.

Then: The mutant is called against the bare remote.

Expected: No flag pushes; each flag is reviewed as unable to run a command.

Actual: No flag pushes. Four exit 0; --bare exits 129. Review: none of the five takes a value, so none can name a command.

## TC-cli-106 (VS-14): A bytes git option before the verb breaks a pin

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:296`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: b"-c", a glued b"-c..." and b"--config-env=..." are put before the verb in three wrappers.

Then: push_guard.py runs on each copy.

Expected: Each form breaks a pin.

Actual: Each form breaks wrapperVerbs: the guard reads the bytes text as the verb

## TC-cli-102 (VS-15): An import alias bound anywhere in a module resolves to the watched module

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:310`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: 16 alias forms: late import, late from-import, late os alias, import in another function with global, try block, if block, class body re-bound at module level, json and subprocess under one name, alias then assignment, assignment then import, del then import, __import__ in a lambda default and in a comprehension, late from os import system, hub.py late alias, import os as posixpath.

Then: push_guard.py runs on each copy.

Expected: Each form breaks a pin (direct, dynamic or imports).

Actual: Each form breaks at least one pin

## TC-cli-107 (VS-15): On the clean tree dynamic is empty, so no file has a rebound import name

- Result: **pass**
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e refutation rule; tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:338`

Given: The clean tree at 39aa68f.

When: push_guard.py runs.

Then: dynamic is read.

Expected: dynamic is empty.

Actual: dynamic is empty

## TC-cli-103 (VS-16): A process call through a submodule attribute chain breaks a pin

- Result: **pass**
- Spec source: tests.md R-119 scope (an attribute chain through a watched module is read as the watched module call)
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:343`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline.

When: 13 chains (os.path.os, posixpath.os, shutil.os, pathlib.os, tempfile._os, urllib.request.os, subprocess.os, glob.os, fnmatch.os, fnmatch.posixpath.os, mimetypes.os, argparse._os, branches.os) and 9 aliased chains each call system or create_subprocess_shell.

Then: push_guard.py runs on each copy.

Expected: Each chain breaks a pin.

Actual: Each chain breaks direct, dynamic or imports. json.decoder.re.purge is a control with no process call.

## TC-cli-104 (VS-17): Each guard-miss mutant from every round pushes a verify branch only when the guard flags it

- Result: **fail**
- Spec source: R-119 acceptance (a verify branch stays local); ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/cli-0/push-guard-r2.verify-cli.test.mjs:386`

Given: A scratch copy of skills/sdlc and hooks at 39aa68f; push_guard.py clean output as the baseline; a work repo with a bare origin and the local branch named by branches.py name --kind verify (sdlc/S-001-v0-cli-0).

When: 12 mutants from rounds 0 and 1 and the round 2 bytes mutant are loaded with module-loader and called.

Then: The guard keys and the bare remote refs are compared.

Expected: No mutant pushes with every key equal.

Actual: All 12 earlier mutants are flagged by the guard. The round 2 bytes mutant pushes the verify branch with every key equal.

Evidence (transcript): TC-cli-104 summary

```
=== TC-cli-104 summary (git version 2.50.1 (Apple Git-155))
r0 D-1 -c core.fsmonitor before diff, state-write.py: guard keys wrapperVerbs, opaque; pushed true
r0 TC-cli-17 late alias import subprocess as sp, janitor.py: guard keys direct, pushes; pushed true
r0 TC-cli-17 late from subprocess import run as _r, state-write.py: guard keys direct, pushes; pushed true
r0 TC-cli-17 late import os as _o, branches.py: guard keys direct, pushes; pushed true
r0 TC-cli-18 -c core.fsmonitor with $IFS, state-write.py: guard keys opaque; pushed true
r0 TC-cli-18 -c core.fsmonitor before rev-parse, suite-receipt.py: guard keys opaque; pushed false
r0 TC-cli-18 -c core.fsmonitor at a direct site, janitor.py: guard keys direct, opaque; pushed true
r1 TC-cli-23 -c glued, state-write.py: guard keys opaque; pushed false
r1 D-1 m1 f-string option, state-write.py: guard keys wrapperVerbs; pushed true
r1 D-1 m3 str() option, next-action.py: guard keys wrapperVerbs; pushed true
r1 TC-cli-27 os.path.os.system, janitor.py: guard keys direct, pushes; pushed true
r1 TC-cli-27 from os import path as _p, _p.os.system, branches.py: guard keys direct, pushes; pushed true
r2 TC-cli-37 bytes --upload-pack option, state-write.py: guard keys <none>; pushed true
```

## Attacks

None. The security profile owns attacks.

## Seeds

- **push_guard.py reads every non-str constant as constant text** (`skills/sdlc/test/push_guard.py`): pieces() returns str(node.value) for any Constant, so b"--upload-pack=..." folds to the token b'--upload-pack=... with no leading dash. value_nodes() skips it as constant. A bytes option after the verb records no wrapperVerbs entry. A bytes argument before the verb is read as the verb, which breaks the pin only by chance. A fix can treat a bytes constant (or any non-str constant) as non-constant, or record it as a value entry.
- **suite-receipt.py git wrapper raises TypeError on a bytes argument** (`skills/sdlc/suite-receipt.py`): The error message joins args with ' '.join, so a bytes argument raises TypeError after the git call ran. Not a defect today, since no caller passes bytes.
