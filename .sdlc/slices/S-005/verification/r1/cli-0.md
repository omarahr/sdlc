# S-005 verification: cli profile, part 0, round 1

- Slice: S-005 (tails: state, verify, attempt)
- Profile: cli
- Round: 1 (plan round 0)
- Commit: 112b45b
- Verdict: REFUTED. 4 of 17 cases fail: TC-cli-55, TC-cli-56, TC-cli-57, TC-cli-58.
- Scenarios: VS-9, VS-11

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0; push_guard.py run as a CLI on copied trees in temp dirs (cli-runner); local bare git origin; local HTTP stub on 127.0.0.1

## Summary

The round 0 refutations TC-cli-40 to TC-cli-44 now pass. The guard reports module rebinds, posix calls, foreign encodings, network rebinds and escaped loop names. VS-11 holds: parse failures, new file types, encoding cookies and a crash all fail closed.

Four new in-scope forms keep the guard output equal to the pins. Each one runs a real verify push or a pull-request POST:

- TC-cli-55: `P = subprocess.Popen` and three other capitalized-API forms.
- TC-cli-56: `globals()["subprocess"].run(...)` and two `globals()` forms.
- TC-cli-57: `e = exec`, `i = __import__`, a default `ev=eval`.
- TC-cli-58: `pydoc.pipepager`, `pydoc.tempfilepager` and `logging.handlers.HTTPHandler`.

## TC-cli-12 (VS-9): The guard on the unchanged tree and on a copy under a path with spaces and unicode gives the pinned output

- Given: The worktree of sdlc/S-005 at 112b45b, and a copy of skills/sdlc and hooks under 'copy with spaces ü'
- When: python3 skills/sdlc/test/push_guard.py <root> for both roots
- Then: exit 0 and output equal to the pins
- Expected: exit 0, no changed key, 3 pushes, empty ban keys
- Actual: exit 0 for both roots, no changed key; node --test skills/sdlc/test/push-guard.test.mjs passes 6 of 6
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:203`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-12 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
$ python3 <worktree>/skills/sdlc/test/push_guard.py <worktree>
exit: 0
changed keys: (none: output equals the pins)
$ node --test skills/sdlc/test/push-guard.test.mjs
ℹ tests 6  ℹ pass 6  ℹ fail 0
```

## TC-cli-13 (VS-9): Every round 0 to 2 mutant changes the guard output

- Given: 25 mutants from rounds 0 to 2, each in a fresh copied tree
- When: push_guard.py runs on each copy
- Then: each output differs from the pins
- Expected: no mutant leaves the pins equal
- Actual: all 25 mutants change at least one key
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:218`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-13 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
see .sdlc/slices/S-005/verification/r1/logs/cli-0-transcripts.txt rows '### TC-cli-13 …'; every row shows exit 0 and a changed key
```

## TC-cli-15 (VS-9): The new in-scope forms named by the plan change the guard output

- Given: 32 forms from the plan notes (aliases, posix_spawn, exec*, pty, asyncio, starred and tuple argv, args=, f-string verb, lambda, partial, -c alias, gh api spellings, getattr, __import__, importlib, JS global forms)
- When: push_guard.py runs on each copy
- Then: each output differs from the pins
- Expected: no form leaves the pins equal
- Actual: all 32 forms change at least one key
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:223`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-15 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
see .sdlc/slices/S-005/verification/r1/logs/cli-0-transcripts.txt rows '### TC-cli-15 …'
```

## TC-cli-40 (VS-9): A process module rebound to another name is reported (re-run of the round 0 refutation)

- Given: janitor.py with sp = subprocess, a default parameter sp=subprocess, a walrus, [subprocess][0], and o = os
- When: push_guard.py runs on each copy; the first mutant also runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key for each of the 5 forms
- Actual: all 5 forms add a 'dynamic … value subprocess' or 'value os' entry. The proof mutant still pushes refs/heads/sdlc/S-001-v0-http-api-0, and the guard now reports it.
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:228`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-40 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-40 proof mutant
exit: 0
changed keys: dynamic
  + dynamic: janitor.py _m value subprocess
### run _m from the mutated janitor.py
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

file-tree: mutated file in the copied tree

```
skills/sdlc/janitor.py (appended)
def _m(repo, b):
    sp = subprocess
    sp.run(["git", "-C", repo, "push", "origin", b], check=True)
```

## TC-cli-41 (VS-9): The posix module running a verify push is reported (re-run)

- Given: janitor.py with import posix and posix.system(...) or posix.posix_spawnp(...)
- When: push_guard.py runs; the first mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key for both forms
- Actual: both forms change direct, dynamic and pushes
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:236`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-41 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-41 proof mutant
exit: 0
changed keys: direct, dynamic, pushes
  + direct: janitor.py _m posix.system('git -C ' + repo + ' push origin ' + b)
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

## TC-cli-42 (VS-11): A unicode_escape source cookie that hides a verify push makes the file opaque (re-run)

- Given: janitor.py with '# coding: unicode_escape' on line 2 and a push hidden behind \u000a in a comment
- When: push_guard.py runs; then python3 janitor.py --help runs with a local bare origin
- Then: the guard output differs from the pins
- Expected: a changed key
- Actual: exit 0, changed keys direct and opaque ('parse encoding unicode-escape'). janitor.py --help still pushes the verify ref, so the cookie is live and the guard catches it.
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:244`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-42 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-42 janitor.py with a unicode_escape cookie and a hidden push
exit: 0
changed keys: direct, opaque
### run the mutated janitor.py --help
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

## TC-cli-43 (VS-9): A network module reached through a rebind or a private name is reported (re-run)

- Given: collect.py with u = urllib.request; janitor.py with import _socket
- When: push_guard.py runs on each copy
- Then: each output differs from the pins
- Expected: a changed key for both
- Actual: rebind: dynamic; _socket: network and dynamic
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:259`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-43 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-43 urllib.request bound to a local name in collect.py
exit: 0
changed keys: dynamic
### TC-cli-43 _socket in janitor.py
exit: 0
changed keys: network, dynamic
```

## TC-cli-44 (VS-9): A banned loop identifier written with a unicode escape is a hit (re-run)

- Given: sdlc-loop.js with glob\u0061lThis, Fun\u0063tion, ev\u0061l
- When: node evaluates the names; push_guard.py runs on each copy
- Then: jsHits changes
- Expected: jsHits changes for all three
- Actual: node prints 'true true true'; jsHits changes for all three
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:264`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-44 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
$ node -e console.log(glob\u0061lThis === globalThis, …)
stdout: true true true
### TC-cli-44 glob\u0061lThis
changed keys: jsHits
### TC-cli-44 Fun\u0063tion
changed keys: jsHits
### TC-cli-44 ev\u0061l
changed keys: jsHits
```

## TC-cli-51 (VS-11): A pinned script the scanner cannot parse is reported as opaque

- Given: hooks/live-poke.py replaced by a syntax error, invalid UTF-8, a NUL byte, a latin-1 file; and a BOM file with a push
- When: push_guard.py runs on each copy
- Then: opaque holds 'hooks/live-poke.py parse', or the push is seen
- Expected: never exit 0 with the pins equal
- Actual: all four parse failures add an opaque entry; the BOM file changes direct and pushes
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:272`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-51 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
see .sdlc/slices/S-005/verification/r1/logs/cli-0-transcripts.txt rows '### TC-cli-51 …'
### TC-cli-51 BOM before a hidden push in hooks/live-poke.py
exit: 0
changed keys: direct, pushes
```

## TC-cli-52 (VS-11): A new script file or a new script type changes the files pin or the extension check

- Given: a new .py in a new subdirectory, a symlinked .py, hooks/x.sh, x.mjs, x.cjs, a shebang file with no extension, x.PY, x.pyc
- When: push_guard.py runs on each copy
- Then: files or extensions changes
- Expected: no case leaves the pins equal
- Actual: each of the 8 cases changes files and/or extensions
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:290`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-52 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-52 hooks/x.sh
exit: 0
changed keys: files, extensions
```

file-tree: mutated file in the copied tree

```
hooks/x.sh
#!/bin/sh
git push origin x
```

## TC-cli-54 (VS-11): A guard crash fails the repo test instead of passing as an empty report

- Given: a copy with hooks/live-poke.py or sdlc-loop.js at mode 000
- When: push_guard.py runs
- Then: non-zero exit and empty stdout; push-guard.test.mjs asserts status 0
- Expected: exit != 0, stdout empty
- Actual: exit 1 with PermissionError on stderr and empty stdout for both; push-guard.test.mjs:105 asserts r.status 0
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:312`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-54 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-54 unreadable .py
exit: 1
stderr: PermissionError: [Errno 13] Permission denied: '<scratch>/crash-186/hooks/live-poke.py'
### TC-cli-54 unreadable .js
exit: 1
stderr: PermissionError: [Errno 13] Permission denied: '<scratch>/crash-188/skills/sdlc/sdlc-loop.js'
```

## TC-cli-55 (VS-9): A capitalized process API bound to a name hides a real verify push

- Given: janitor.py with P = subprocess.Popen, a subclass of subprocess.Popen, Popen as a default parameter value, or [subprocess.Popen][0]
- When: push_guard.py runs on each copy; the first mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key for each form, as for f = subprocess.run (TC-cli-15) and sp = subprocess (TC-cli-40)
- Actual: exit 0 and output equal to the pins for all 4 forms. The proof run pushes refs/heads/sdlc/S-001-v0-http-api-0. Cause: Scanner.check_value returns early when the last name part starts with a capital letter, so subprocess.Popen as a value is never reported.
- Result: **fail**
- Spec source: tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:418`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-55 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-55 subprocess.Popen bound to a local name
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-55 a class that subclasses subprocess.Popen
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-55 subprocess.Popen as a default parameter value
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-55 subprocess.Popen in a list subscript
exit: 0
changed keys: (none: output equals the pins)
### run _m from the mutated janitor.py
exit: 0
stderr: To <scratch>/origin-221 |  * [new branch] sdlc/S-001-v0-http-api-0 -> sdlc/S-001-v0-http-api-0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

file-tree: mutated file in the copied tree

```
skills/sdlc/janitor.py (appended)
def _m(repo, b):
    P = subprocess.Popen
    P(["git", "-C", repo, "push", "origin", b]).wait()
```

## TC-cli-56 (VS-9): A process module reached through a globals() subscript hides a real verify push

- Given: janitor.py with globals()["subprocess"].run(...), globals().get("os").system(...), globals()["os"].system(...)
- When: push_guard.py runs on each copy; the first mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key: tests.md covers any globals() or vars() subscript call, and any call to subprocess.* or os.system
- Actual: exit 0 and output equal to the pins for all 3 forms. The proof run pushes refs/heads/sdlc/S-001-v0-http-api-0. Cause: visit_Call checks only a call whose func is the subscript itself, and qualify returns None for an attribute on a subscript or a call.
- Result: **fail**
- Spec source: tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:425`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-56 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-56 globals()["subprocess"].run
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-56 globals().get("os").system
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-56 globals()["os"].system
exit: 0
changed keys: (none: output equals the pins)
### run _m from the mutated janitor.py
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

file-tree: mutated file in the copied tree

```
skills/sdlc/janitor.py (appended)
def _m(repo, b):
    globals()["subprocess"].run(["git", "-C", repo, "push", "origin", b], check=True)
```

## TC-cli-57 (VS-9): exec, eval or __import__ bound to a name hides a real verify push

- Given: janitor.py with e = exec, i = __import__, or a default parameter ev=eval, each then called
- When: push_guard.py runs on each copy; the exec mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key: tests.md covers any call to eval, exec, compile or __import__; the fix reports the same rebind for process modules
- Actual: exit 0 and output equal to the pins for all 3 forms. The exec proof run pushes refs/heads/sdlc/S-001-v0-http-api-0. Cause: check_value skips a Name that is not an import alias, so a builtin used as a value is never reported.
- Result: **fail**
- Spec source: tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:432`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-57 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-57 exec bound to a local name
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-57 __import__ bound to a local name
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-57 eval as a default parameter value
exit: 0
changed keys: (none: output equals the pins)
### run _m from the mutated janitor.py
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

file-tree: mutated file in the copied tree

```
skills/sdlc/janitor.py (appended)
def _m(repo, b):
    e = exec
    e("import subprocess\nsubprocess.run(['git', '-C', r, 'push', 'origin', x], check=True)", {"r": repo, "x": b})
```

## TC-cli-58 (VS-9): A standard library helper outside the watched modules runs a verify push or a pull-request POST

- Given: ste-check.py with import pydoc and pydoc.pipepager('', 'git -C <repo> push origin <verify>'); janitor.py with pydoc.tempfilepager; janitor.py with logging.handlers.HTTPHandler(host, '/repos/o/r/pulls', method='POST').emit(...)
- When: push_guard.py runs on each copy; pipepager runs against a local bare origin; HTTPHandler runs against a local HTTP stub
- Then: each output differs from the pins
- Expected: a changed key: the refutation rule covers a new form that is a process call or a network call in a scanned file
- Actual: exit 0 and output equal to the pins for all 3 forms. pipepager pushes refs/heads/sdlc/S-001-v0-http-api-0. The stub receives 'POST /repos/o/r/pulls'. Cause: pydoc and logging are not in WATCHED, and is_process and is_network name only subprocess, os, pty, asyncio, multiprocessing, ctypes, posix and the listed network modules.
- Result: **fail**
- Spec source: tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:439`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-58 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
### TC-cli-58 pydoc.pipepager in ste-check.py
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-58 pydoc.tempfilepager in janitor.py
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-58 logging.handlers.HTTPHandler POST in janitor.py
exit: 0
changed keys: (none: output equals the pins)
### run _m from the mutated skills/sdlc/ste-check.py
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
### run the mutated janitor.py HTTPHandler against a local stub
exit: 0
stub saw: POST /repos/o/r/pulls
```

file-tree: mutated file in the copied tree

```
skills/sdlc/ste-check.py (appended)
import pydoc

def _m(repo, b):
    pydoc.pipepager("", "git -C " + repo + " push origin " + b)
```

## TC-cli-60 (VS-11): Every source encoding cookie is read as UTF-8 or makes the file opaque

- Given: hooks/live-poke.py replaced by files with an emacs utf-8 cookie, a BOM and utf-8 cookie, a latin-1 cookie, a utf8 cookie, '# coding=unicode-escape', a vim raw_unicode_escape cookie, and a unicode_escape cookie on line 2 after a shebang
- When: push_guard.py runs on each copy
- Then: UTF-8 files show the push in direct; other encodings add an opaque entry
- Expected: never exit 0 with the pins equal
- Actual: utf-8 forms change direct and pushes; latin-1, utf8, unicode-escape, raw_unicode_escape and the line-2 cookie add 'parse encoding <name>' to opaque
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:461`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-60 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
see .sdlc/slices/S-005/verification/r1/logs/cli-0-transcripts.txt rows '### TC-cli-60 …'
### TC-cli-60 unicode_escape cookie on line 2 after a shebang
exit: 0
changed keys: opaque
```

## TC-cli-61 (VS-9): Every unicode escape spelling of a banned loop identifier is a hit

- Given: sdlc-loop.js with \u{67}lobal, \u{0000067}lobal, \u0072equire, pro\u0063ess, \u0069mport(), ev\u0061\u006C
- When: push_guard.py runs on each copy
- Then: jsHits changes
- Expected: jsHits changes for all six
- Actual: jsHits changes for all six
- Result: **pass**
- Spec source: R-119 acceptance; tests.md R-119 scope and refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Test: `.sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:482`
- Command: `VERIFY_WT=<worktree of sdlc/S-005 at 112b45b> node --test --test-name-pattern 'TC-cli-61 ' .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs`

transcript: guard runs

```
see .sdlc/slices/S-005/verification/r1/logs/cli-0-transcripts.txt rows '### TC-cli-61 …'
```

## Attacks

None in this profile.

## Seeds

- **S3: a process or network module re-exported by another module** (skills/sdlc/test/push_guard.py): shutil.os.system(...), tempfile._os.system(...), branches.subprocess.run(...) in janitor.py and socketserver.socket.create_connection(...) in hub.py leave the output equal to the pins. The shutil.os proof run pushes refs/heads/sdlc/S-001-v0-http-api-0. These are attribute walks to a module, so they are S3. Report a chain whose last name is a process call (for example any q ending in .system or .run where a middle part is a watched module) to close it. Test: TC-cli-59 at .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:449.
- **S1: a second top-level def with a pinned name hides a new push** (skills/sdlc/test/push_guard.py): Still open at 112b45b. A second 'def advance_run_branch(repo, run)' with the pinned push text leaves the output equal to the pins, because pushes is a set.
- **S3: a JS constructor walk passes the loop scan** (skills/sdlc/test/push_guard.py): (() => 0).constructor('return 1')() in sdlc-loop.js leaves the output equal to the pins at 112b45b.
- **S5: excluded directory names and symlinked directories** (skills/sdlc/test/push_guard.py): skills/sdlc/tracker/test/x.py and a symlinked skills/sdlc/lib directory holding a push are still not scanned at 112b45b.
- **hooks/hooks.json commands are not checked** (hooks/hooks.json): A SubagentStop hook command 'git push origin sdlc/S-001-v0-http-api-0' still leaves the output equal to the pins at 112b45b.
- **A utf8 cookie spelled without a dash makes a file opaque** (skills/sdlc/test/push_guard.py): tokenize.detect_encoding returns 'utf8' for '# coding: utf8', and the scanner accepts only 'utf-8' and 'utf-8-sig'. This fails closed, so it is safe, but a valid UTF-8 file with that cookie breaks the opaque pin. Normalise with codecs.lookup(encoding).name.

Full transcripts: `.sdlc/slices/S-005/verification/r1/logs/cli-0-transcripts.txt`. Test run: `.sdlc/slices/S-005/verification/r1/logs/cli-0-run.txt`.
