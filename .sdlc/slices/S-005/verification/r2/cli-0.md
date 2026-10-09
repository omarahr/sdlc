# S-005 verify cli, part 0, round 2

- Commit: 9e1b1e8
- Verdict: held. All 17 cases pass.
- Environment: macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0; push_guard.py run as a CLI on copied trees in temp dirs (cli-runner); local bare git origin; local HTTP stub on 127.0.0.1

This is a fix round. The agent ran the round 1 cases again on the fix commit. TC-cli-55 to TC-cli-58 failed in round 1. They pass now. The repo test `skills/sdlc/test/push-guard.test.mjs` passes (6 of 6, log `r2/logs/cli-0-repo-guard.txt`).

## TC-cli-12: The guard on the unchanged tree and on a copy under a path with spaces and unicode gives the pinned output

- Given: The worktree of sdlc/S-005 at 112b45b, and a copy of skills/sdlc and hooks under 'copy with spaces ü'
- When: python3 skills/sdlc/test/push_guard.py <root> for both roots
- Then: exit 0 and output equal to the pins
- Expected: exit 0, no changed key, 3 pushes, empty ban keys
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:203`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-12 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-13: Every round 0 to 2 mutant changes the guard output

- Given: 25 mutants from rounds 0 to 2, each in a fresh copied tree
- When: push_guard.py runs on each copy
- Then: each output differs from the pins
- Expected: no mutant leaves the pins equal
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:218`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-13 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-15: The new in-scope forms named by the plan change the guard output

- Given: 32 forms from the plan notes (aliases, posix_spawn, exec*, pty, asyncio, starred and tuple argv, args=, f-string verb, lambda, partial, -c alias, gh api spellings, getattr, __import__, importlib, JS global forms)
- When: push_guard.py runs on each copy
- Then: each output differs from the pins
- Expected: no form leaves the pins equal
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:223`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-15 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-40: A process module rebound to another name is reported (re-run of the round 0 refutation)

- Given: janitor.py with sp = subprocess, a default parameter sp=subprocess, a walrus, [subprocess][0], and o = os
- When: push_guard.py runs on each copy; the first mutant also runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key for each of the 5 forms
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:228`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-40 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-41: The posix module running a verify push is reported (re-run)

- Given: janitor.py with import posix and posix.system(...) or posix.posix_spawnp(...)
- When: push_guard.py runs; the first mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key for both forms
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:236`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-41 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-42: A unicode_escape source cookie that hides a verify push makes the file opaque (re-run)

- Given: janitor.py with '# coding: unicode_escape' on line 2 and a push hidden behind \u000a in a comment
- When: push_guard.py runs; then python3 janitor.py --help runs with a local bare origin
- Then: the guard output differs from the pins
- Expected: a changed key
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:244`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-42 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-43: A network module reached through a rebind or a private name is reported (re-run)

- Given: collect.py with u = urllib.request; janitor.py with import _socket
- When: push_guard.py runs on each copy
- Then: each output differs from the pins
- Expected: a changed key for both
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:259`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-43 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-44: A banned loop identifier written with a unicode escape is a hit (re-run)

- Given: sdlc-loop.js with glob\u0061lThis, Fun\u0063tion, ev\u0061l
- When: node evaluates the names; push_guard.py runs on each copy
- Then: jsHits changes
- Expected: jsHits changes for all three
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:264`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-44 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-51: A pinned script the scanner cannot parse is reported as opaque

- Given: hooks/live-poke.py replaced by a syntax error, invalid UTF-8, a NUL byte, a latin-1 file; and a BOM file with a push
- When: push_guard.py runs on each copy
- Then: opaque holds 'hooks/live-poke.py parse', or the push is seen
- Expected: never exit 0 with the pins equal
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:272`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-51 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-52: A new script file or a new script type changes the files pin or the extension check

- Given: a new .py in a new subdirectory, a symlinked .py, hooks/x.sh, x.mjs, x.cjs, a shebang file with no extension, x.PY, x.pyc
- When: push_guard.py runs on each copy
- Then: files or extensions changes
- Expected: no case leaves the pins equal
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:290`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-52 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-54: A guard crash fails the repo test instead of passing as an empty report

- Given: a copy with hooks/live-poke.py or sdlc-loop.js at mode 000
- When: push_guard.py runs
- Then: non-zero exit and empty stdout; push-guard.test.mjs asserts status 0
- Expected: exit != 0, stdout empty
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:312`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-54 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-55: A capitalized process API bound to a name hides a real verify push

- Given: janitor.py with P = subprocess.Popen, a subclass of subprocess.Popen, Popen as a default parameter value, or [subprocess.Popen][0]
- When: push_guard.py runs on each copy; the first mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key for each form, as for f = subprocess.run (TC-cli-15) and sp = subprocess (TC-cli-40)
- Actual: Exit 0 for each form. Each output differs from the pins in the dynamic key. The proof run still shows that the form can push, so the guard now catches a real push form.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:418`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-55 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-56: A process module reached through a globals() subscript hides a real verify push

- Given: janitor.py with globals()["subprocess"].run(...), globals().get("os").system(...), globals()["os"].system(...)
- When: push_guard.py runs on each copy; the first mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key: tests.md covers any globals() or vars() subscript call, and any call to subprocess.* or os.system
- Actual: Exit 0 for each form. Each output differs from the pins in the dynamic key. The proof run still shows that the form can push, so the guard now catches a real push form.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:425`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-56 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-57: exec, eval or __import__ bound to a name hides a real verify push

- Given: janitor.py with e = exec, i = __import__, or a default parameter ev=eval, each then called
- When: push_guard.py runs on each copy; the exec mutant runs against a local bare origin
- Then: each output differs from the pins
- Expected: a changed key: tests.md covers any call to eval, exec, compile or __import__; the fix reports the same rebind for process modules
- Actual: Exit 0 for each form. Each output differs from the pins in the dynamic key. The proof run still shows that the form can push, so the guard now catches a real push form.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:432`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-57 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-58: A standard library helper outside the watched modules runs a verify push or a pull-request POST

- Given: ste-check.py with import pydoc and pydoc.pipepager('', 'git -C <repo> push origin <verify>'); janitor.py with pydoc.tempfilepager; janitor.py with logging.handlers.HTTPHandler(host, '/repos/o/r/pulls', method='POST').emit(...)
- When: push_guard.py runs on each copy; pipepager runs against a local bare origin; HTTPHandler runs against a local HTTP stub
- Then: each output differs from the pins
- Expected: a changed key: the refutation rule covers a new form that is a process call or a network call in a scanned file
- Actual: Exit 0 for each form. Each output differs from the pins in the imports key. The proof run still shows that the form can push, so the guard now catches a real push form.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:439`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-58 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-60: Every source encoding cookie is read as UTF-8 or makes the file opaque

- Given: hooks/live-poke.py replaced by files with an emacs utf-8 cookie, a BOM and utf-8 cookie, a latin-1 cookie, a utf8 cookie, '# coding=unicode-escape', a vim raw_unicode_escape cookie, and a unicode_escape cookie on line 2 after a shebang
- When: push_guard.py runs on each copy
- Then: UTF-8 files show the push in direct; other encodings add an opaque entry
- Expected: never exit 0 with the pins equal
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:461`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-60 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## TC-cli-61: Every unicode escape spelling of a banned loop identifier is a hit

- Given: sdlc-loop.js with \u{67}lobal, \u{0000067}lobal, \u0072equire, pro\u0063ess, \u0069mport(), ev\u0061\u006C
- When: push_guard.py runs on each copy
- Then: jsHits changes
- Expected: jsHits changes for all six
- Actual: The re-run at 9e1b1e8 gives the same result as round 1: pass.
- Result: pass
- Test: `.sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs:482`

```
VERIFY_WT=<worktree of sdlc/S-005 at 9e1b1e8> node --test --test-name-pattern 'TC-cli-61 ' .sdlc/slices/S-005/verification/r2/tests/cli-0/push-guard.verify-cli.test.mjs
```

## Seeds

- S3: a process or network module re-exported by another module: shutil.os.system(...), tempfile._os.system(...), branches.subprocess.run(...) in janitor.py and socketserver.socket.create_connection(...) in hub.py leave the output equal to the pins. The shutil.os proof run pushes refs/heads/sdlc/S-001-v0-http-api-0. These are attribute walks to a module, so they are S3. Report a chain whose last name is a process call (for example any q ending in .system or .run where a middle part is a watched module) to close it. Test: TC-cli-59 at .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs:449.
- S1: a second top-level def with a pinned name hides a new push: Still open at 112b45b. A second 'def advance_run_branch(repo, run)' with the pinned push text leaves the output equal to the pins, because pushes is a set.
- S3: a JS constructor walk passes the loop scan: (() => 0).constructor('return 1')() in sdlc-loop.js leaves the output equal to the pins at 112b45b.
- S5: excluded directory names and symlinked directories: skills/sdlc/tracker/test/x.py and a symlinked skills/sdlc/lib directory holding a push are still not scanned at 112b45b.
- hooks/hooks.json commands are not checked: A SubagentStop hook command 'git push origin sdlc/S-001-v0-http-api-0' still leaves the output equal to the pins at 112b45b.
