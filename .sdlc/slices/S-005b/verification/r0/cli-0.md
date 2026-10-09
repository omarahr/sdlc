# verify-cli, S-005b, round 0, part 0

- Plan round: 0. Commit: 527e86b. Verdict: verified (no in-scope failing case).
- Scenarios: VS-1 to VS-9. Cases: 11, passed 11.
- Environment: macOS, Python 3.14.7 (3.9.6 spot check; 3.11 and 3.12 not installed), Node 24.19.0, real push_guard.py on scratch copies of skills/sdlc and hooks; cli-runner from the testkit
- Run: `node --test .sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs` (11 tests, 11 pass). Transcripts: `.sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt`.
- Note: the profile ran from the main tree with scratch copies. It made no worktree and no product change.

## TC-cli-1 (VS-1): VS-1: 20 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 20 mutants put a push, a gh api -X/--method/-f/--input form, a -c remote.origin.push option, a changed string, f-string expression, timeout or return, a docstring or a global statement inside the five wrapper bodies
- Then: Each mutant changes wrapperBodies
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each mutant changes wrapperBodies
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:83`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-2 (VS-2): VS-2: 14 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 14 mutants: a duplicate def (state-write git, impact run), a nested def, a class method, an async def, a changed default, a reordered signature, two decorators, a return annotation, a lambda rebind, a def added to janitor.py
- Then: Each mutant changes wrapperBodies, direct or wrapperValues; the rebind of git to a pure function changes no key (no process site, not a push path)
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each mutant changes wrapperBodies, direct or wrapperValues; the rebind of git to a pure function changes no key (no process site, not a push path)
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:109`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-3 (VS-3): VS-3: a comment or a blank line keeps every key

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: Comments and blank lines (with quote, single quote and hash characters, backslash end, tab indent, shebang-like text, trailing comment on the def line) in all five bodies; a two-space re-indent with trailing spaces
- Then: All 14 keys equal the clean output
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: All 14 keys equal the clean output
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:130`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-4 (VS-4): VS-4: 26 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 26 forms outside a body: local list spread, parameter api path, variable and suffixed verbs, ternary, call, subscript, variable option, variable program, rebinds of git in a name, list, map and default parameter, unpacked first argument, keyword argv, globals() lookup, bytes and int verbs
- Then: Each form changes opaque, wrapperValues, wrapperVerbs, dynamic or forgeViolations. getattr(sys.modules[__name__], 'git') leaves every key equal (seed S3)
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each form changes opaque, wrapperValues, wrapperVerbs, dynamic or forgeViolations. getattr(sys.modules[__name__], 'git') leaves every key equal (seed S3)
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:157`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-5 (VS-5): VS-5: 35 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 35 spellings of a new git push or process site: quotes, triple quotes, implicit and plus concatenation, split lines, -C, --no-pager, --bare, -c, --git-dir, stuck -C, all wrappers, direct subprocess forms, shell=True, os.system, os.popen, os.exec, os.spawn, non-literal argv, send-pack; edits to the three reviewed pushes
- Then: Each form changes pushes, opaque, direct or wrapperVerbs. A quote-style change of a reviewed push leaves every key equal (same token text)
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each form changes pushes, opaque, direct or wrapperVerbs. A quote-style change of a reviewed push leaves every key equal (same token text)
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:189`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-6 (VS-6): VS-6: 41 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 41 forge forms: gh pr create, glab mr create, pr merge/edit, issue create, release create, gh api with -X, --method, -XPOST, --method=, -f, -F, --field, --raw-field, -fref, --input, pulls, PULLS, graphql in six spellings with and without flags, glab api, a path from a variable, an unknown leading option, git push -o merge_request.create, curl
- Then: Each form changes forgeViolations, opaque, wrapperVerbs, direct or pushes; a lowercase get method changes only forge
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each form changes forgeViolations, opaque, wrapperVerbs, direct or pushes; a lowercase get method changes only forge
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:234`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-7 (VS-7): VS-7: 75 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 75 forms: import aliases bound late or in try, from-imports, shutil/tempfile/glob/fnmatch/mimetypes/posixpath/branches/hub/reports/workflow chains to os, modules as values (dict, tuple, argument, lambda, walrus, default, base class, class attribute), vars/getattr/__dict__, network modules, posix, nt, _socket, _posixsubprocess, _winapi, runpy, code, codeop, private attributes, eval, exec, compile, __import__, breakpoint, importlib, globals, locals, vars(), __builtins__, multiprocessing, ctypes, pty, asyncio, os.fork family, star imports
- Then: Each in-scope form changes a pin. sys.modules chain, print.__self__ walk and __subclasses__ walk leave every key equal (seed S3)
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each in-scope form changes a pin. sys.modules chain, print.__self__ walk and __subclasses__ walk leave every key equal (seed S3)
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:282`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-8 (VS-8): VS-8: 46 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of skills/sdlc and hooks (test, fixtures, prompts, node_modules and __pycache__ skipped), and the clean push_guard.py output as the baseline
- When: 46 JS lines: each banned identifier in code, in a double-quoted string, in a template, in a comment, as \uXXXX and \u{...} escapes, double-escaped, with the allowed literal on the same line; a fourth 'global' literal; hex and octal escapes, concatenation, this walk, SharedWorker/importScripts/WebTransport/RTCPeerConnection
- Then: Each in-scope line changes jsHits or jsAllowed. Hex or octal escapes, concatenation, this walk and browser-only names leave every key equal (seed S3)
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: Each in-scope line changes jsHits or jsAllowed. Hex or octal escapes, concatenation, this walk and browser-only names leave every key equal (seed S3)
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:364`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-9 (VS-9): VS-9: 7 mutants run against the real push_guard.py on a scratch copy of the plugin tree

- Given: A scratch copy of the suite with sdlc-loop.js mutated
- When: Run T-R-119d from a scratch copy of the suite against 7 mutated sdlc-loop.js: a log line, the toolsmith, the verifier lens, a new line, a name rebuilt by template, an alias on the collector line
- Then: T-R-119d fails on a new reference on its own line (4 of 4). It passes when the alias is made on the collector line or the name is rebuilt by template (seeds)
- Expected: Every in-scope form changes at least one key; comments and blanks change none
- Actual: T-R-119d fails on a new reference on its own line (4 of 4). It passes when the alias is made on the collector line or the name is rebuilt by template (seeds)
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e; ADR-20261009-063408-decision-judge-S-005-368d
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:424`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-10 (VS-3): VS-3: re-indent and trailing spaces keep every key

- Given: state-write.py git body
- When: Re-indent to two spaces and add three trailing spaces to each line
- Then: All keys equal the clean output
- Expected: No change
- Actual: No change
- Result: pass
- Spec source: R-119 scope (a comment or a blank line does not break a pin)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard-plan-r0.verify-cli.test.mjs:145`

```text
see .sdlc/slices/S-005b/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-11 (VS-1): Clean tree: byte-equal output twice, from a symlinked root, and under Python 3.9.6

- Given: The clean tree
- When: Run push_guard.py twice, on a symlinked root, and with /usr/bin/python3 (3.9.6)
- Then: cmp reports equal output for the first two; the 3.9 output equals the 3.14.7 output on all 14 keys
- Expected: No drift
- Actual: No drift. Python 3.11 and 3.12 are not installed here
- Result: pass
- Spec source: R-119 scope; plan Risks (Python version drift)
- Test: ``

```text
byte-equal
symlink-root-equal
[] (no key differs under Python 3.9.6)
```

## Attacks

None beyond the mutants above.

## Seeds

- S3: sys.modules chain reaches a wrapper or subprocess unseen: getattr(sys.modules[__name__], 'git')(repo, 'push', 'origin') in state-write.py, and sys.modules['subprocess'].run([...]) in janitor.py, leave all 14 keys equal. Plan S3 lists sys.modules[...] as a seed. (`skills/sdlc/test/push_guard.py`)
- S3: print.__self__.__import__ builtins walk: print.__self__.__import__('subprocess').run([...]) leaves all keys equal: the attribute __import__ and __self__ of a builtin name are not read. It is an attribute walk the scanner does not name (S3). (`skills/sdlc/test/push_guard.py`)
- S3: JS hex and octal escapes and concatenation: '\x70rocess', '\160rocess' and 'pro' + 'cess' in sdlc-loop.js leave jsHits empty. The scanner decodes only \u escapes. They are strings, not a loader. (`skills/sdlc/test/push_guard.py`)
- S3: browser-only names outside the JS list: SharedWorker, importScripts, WebTransport and RTCPeerConnection are not in the banned list. A Node workflow runtime does not define them. (`skills/sdlc/test/push_guard.py`)
- S1: variable pushed by a reviewed call can change: A for loop that rebinds want before the reviewed git(repo, 'push', '-q', '-u', 'origin', want) leaves all keys equal. A duplicate line with the same text also leaves all keys equal (pins are sets). (`skills/sdlc/state-write.py`)
- S5: python files in nested fixtures or test directories are not scanned: skills/sdlc/tracker/fixtures/x.py and skills/sdlc/tracker/test/x.py with a subprocess push leave all keys equal. The skip list matches a directory name at any depth. (`skills/sdlc/test/push_guard.py`)
- T-R-119d counts lines, not references: const _l = branch; added on the collector line leaves T-R-119d green, and the alias _l can reach another agent. A branch name rebuilt by template in the toolsmith call also passes. tests.md says the test fails on a new branch reference in verifyPhase. The loop has no process access (T-R-119c), so this is not a push path. (`skills/sdlc/test/push-guard.test.mjs`)
