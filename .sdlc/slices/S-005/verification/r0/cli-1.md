# S-005 verify cli, part 1, round 0

- Slice: S-005
- Profile: cli
- Round: 0 (plan round 0), part 1
- Commit: 9e1e71b
- Verdict: refuted. Five cases fail (TC-cli-40 to TC-cli-44).

## Environment

macOS (Darwin 25.6.0), Python 3.14.7, Node v24.19.0, git; push_guard.py run as a subprocess on copies of skills/sdlc and hooks in cli-runner scratch directories; proof pushes go to a local bare origin.

Run log: `.sdlc/slices/S-005/verification/r0/logs/cli-1-run.txt`. Transcripts: `.sdlc/slices/S-005/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-12 (VS-9): The guard on the unchanged tree and on a copy under a path with spaces and unicode gives the pinned output

- Result: **pass**
- Spec source: R-119 acceptance; tests.md refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Given: the slice commit 9e1e71b, unmodified
- When: python3 skills/sdlc/test/push_guard.py <root> runs on the worktree and on a copy under 'copy with spaces ü'
- Then: both runs exit 0 with the same report: 3 pushes, and empty dynamic, forgeViolations, opaque, wrapperValues and jsHits
- Expected: exit 0, output equal to the pins
- Actual: exit 0 for both roots, no changed key; node --test skills/sdlc/test/push-guard.test.mjs passes 6 of 6
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:203`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-12 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard on the unchanged roots**

```
### TC-cli-12 unchanged worktree
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-12 copy under a path with spaces and unicode
exit: 0
changed keys: (none: output equals the pins)
$ node --test skills/sdlc/test/push-guard.test.mjs
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

## TC-cli-13 (VS-9): Every round 0 to 2 mutant changes the guard output

- Result: **pass**
- Spec source: R-119 acceptance; tests.md refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Given: a copy of skills/sdlc and hooks
- When: 25 mutants from rounds 0 to 2 are appended one at a time: quoted paths and paths over 80 characters between git and push, 'pu' + 'sh', split shell=True strings, os.system shell strings, gh pr create with --repo before the verb, gh api .../pulls, execSync, execFileSync and spawnSync with and without require
- Then: push_guard.py runs on each copy
- Expected: each mutant changes at least one key or the extension check
- Actual: all 25 mutants change pushes, direct, opaque, forge, forgeViolations, wrapperVerbs or jsHits
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:218`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-13 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: mutant transcripts (one block per mutant)**

See `.sdlc/slices/S-005/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-15 (VS-9): The new in-scope forms named by the plan change the guard output

- Result: **pass**
- Spec source: R-119 acceptance; tests.md refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- Given: a copy of skills/sdlc and hooks
- When: 32 forms are appended one at a time: import aliases, os.posix_spawn, os.execvp, pty, asyncio.create_subprocess_exec, starred, tuple and args= argv, an f-string verb, the wrapper through a lambda and functools.partial, -c alias.x=push, gh api -X post, --method=POST, -XPOST, --field=, a pulls path split by +, glab mr create, graphql with no flags, gh pr new, getattr, __import__, importlib, and the sdlc-loop.js forms global.process, global['child'+'_process'], globalThis, Function, a fourth 'global', "global" and `global`
- Then: push_guard.py runs on each copy
- Expected: each form changes at least one key
- Actual: all 32 forms change at least one key
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:223`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-15 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: mutant transcripts (one block per mutant)**

See `.sdlc/slices/S-005/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-40 (VS-9): A process module rebound to another name hides a real verify push

- Result: **fail**
- Spec source: R-119 acceptance; tests.md R-119 scope 'Any call to subprocess.*, os.system ...'; refutation rule: a process call in a scanned file that leaves the output equal to the pins
- Given: a copy with janitor.py extended by def _m(repo, b): sp = subprocess; sp.run(['git', '-C', repo, 'push', 'origin', b], check=True)
- When: push_guard.py runs on the copy; then _m is called on a scratch repo with a bare origin and the branch sdlc/S-001-v0-http-api-0
- Then: the guard must change a key, because the form is a process call in a scanned file
- Expected: a changed key (direct) for each rebind form
- Actual: exit 0 and output equal to the pins for 5 forms: sp = subprocess, a default parameter sp=subprocess, a walrus (sp := subprocess), [subprocess][0], o = os then o.system(...). The proof run pushed refs/heads/sdlc/S-001-v0-http-api-0 to the bare origin.
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:228`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-40 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output and proof push**

```
### TC-cli-40 module bound to a local name
$ python3 <wt>/skills/sdlc/test/push_guard.py <copy>
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-40 module as a default parameter value
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-40 module through a walrus
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-40 module through a list subscript
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-40 os bound to a local name
exit: 0
changed keys: (none: output equals the pins)
### run _m from the mutated janitor.py
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

**file-tree: bare origin refs**

```
before: (none)
after:  refs/heads/sdlc/S-001-v0-http-api-0
```

## TC-cli-41 (VS-9): The posix module runs a verify push that the guard does not see

- Result: **fail**
- Spec source: R-119 acceptance; tests.md refutation rule: a new form that is a process call in a scanned file refutes when the output stays equal to the pins
- Given: a copy with janitor.py extended by import posix and posix.system('git -C ' + repo + ' push origin ' + b), and by posix.posix_spawnp('git', [...push...], {})
- When: push_guard.py runs on the copy; then _m is called on a scratch repo with a bare origin
- Then: the guard must change a key: posix.system is os.system under its native module name
- Expected: a changed key (direct or dynamic)
- Actual: exit 0 and output equal to the pins for both forms. The proof run pushed refs/heads/sdlc/S-001-v0-http-api-0.
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:236`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-41 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output and proof push**

```
### TC-cli-41 posix.system
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-41 posix.posix_spawnp
exit: 0
changed keys: (none: output equals the pins)
### run _m from the mutated janitor.py
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

**file-tree: bare origin refs**

```
before: (none)
after:  refs/heads/sdlc/S-001-v0-http-api-0
```

## TC-cli-42 (VS-11): A unicode_escape source cookie hides a verify push from the AST scan

- Result: **fail**
- Spec source: R-119 acceptance; tests.md R-119 scope 'Any call to subprocess.*'; refutation rule: a literal form in a scanned file that leaves the output equal to the pins
- Given: a copy with janitor.py line 2 set to '# coding: unicode_escape' and line 3 set to '#\u000aimport subprocess as _h, os as _o\u000aif ...: _h.run(["git", "-C", ..., "push", "origin", "sdlc/S-001-v0-http-api-0"], check=True)'
- When: push_guard.py runs on the copy; then python3 <copy>/skills/sdlc/janitor.py --help runs with VERIFY_REMOTE_REPO set to a scratch repo
- Then: the guard must report the file or change a key: it parses the text as UTF-8 and ignores the cookie, so it reads a different program than Python runs
- Expected: a changed key or a non-zero exit
- Actual: guard exit 0, output equal to the pins (the scanner sees one comment line). janitor.py --help exits 0 and pushes refs/heads/sdlc/S-001-v0-http-api-0 to the bare origin.
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:244`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-42 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output and proof push**

```
### TC-cli-42 janitor.py with a unicode_escape cookie and a hidden push
$ python3 <wt>/skills/sdlc/test/push_guard.py <copy>
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-42 run the mutated janitor.py --help
$ VERIFY_REMOTE_REPO=<work repo> python3 <copy>/skills/sdlc/janitor.py --help
exit: 0
remote refs after: refs/heads/sdlc/S-001-v0-http-api-0
```

**file-tree: bare origin refs**

```
before: (none)
after:  refs/heads/sdlc/S-001-v0-http-api-0
```

## TC-cli-43 (VS-9): A network module reached through a rebind or a private name is not reported

- Result: **fail**
- Spec source: R-119 acceptance; tests.md R-119 scope 'Any call to urllib.request.*, http.client.* or socket.*'; refutation rule for a network call in a scanned file
- Given: a copy with collect.py extended by u = urllib.request; u.urlopen(u.Request('https://api.github.com/repos/o/r/pulls', data=b'{}', method='POST')), and janitor.py extended by import _socket; _socket.socket().connect(('api.github.com', 443))
- When: push_guard.py runs on each copy
- Then: the guard must change the network key
- Expected: a changed key (network)
- Actual: exit 0 and output equal to the pins for both forms. The calls were not executed: no network access in the test.
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:259`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-43 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-43 urllib.request bound to a local name in collect.py
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-43 _socket in janitor.py
exit: 0
changed keys: (none: output equals the pins)
```

## TC-cli-44 (VS-9): A banned identifier written with a unicode escape passes the loop scan

- Result: **fail**
- Spec source: R-119 acceptance; tests.md R-119 scope 'any use of a banned identifier, in code or in strings' in sdlc-loop.js
- Given: a copy with sdlc-loop.js extended by glob\u0061lThis['pro' + 'cess'], Fun\u0063tion('return 1')() or ev\u0061l('1')
- When: push_guard.py runs on each copy; node -e reads the escaped names
- Then: jsHits must change: the escaped names are the banned identifiers globalThis, Function and eval
- Expected: a changed key (jsHits)
- Actual: node prints 'true true true' (each escaped name is the same binding). The guard exits 0 with output equal to the pins for all three.
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:264`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-44 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: node identity check and guard output**

```
$ node -e 'console.log(glob\u0061lThis === globalThis, Fun\u0063tion === Function, ev\u0061l === eval)'
exit: 0
stdout: true true true
### TC-cli-44 glob\u0061lThis
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-44 Fun\u0063tion
exit: 0
changed keys: (none: output equals the pins)
### TC-cli-44 ev\u0061l
exit: 0
changed keys: (none: output equals the pins)
```

## TC-cli-47 (VS-10): The S-013 gh api rules read in branches.py changes only the direct and forge pins

- Result: **pass**
- Spec source: R-119 acceptance; VS-10 over-block rule
- Given: a copy with branches.py extended by subprocess.run(['gh', 'api', f'repos/{slug}/rules/branches/{quote(s, safe="")}'], ...)
- When: push_guard.py runs on the copy
- Then: only direct and forge change; forgeViolations, opaque, dynamic and wrapperValues stay empty
- Expected: changed keys direct, forge; no ban
- Actual: changed keys: direct, forge; the four ban keys are empty
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:274`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-47 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-47 S-013 rules read
exit: 0
changed keys: direct, forge
```

## TC-cli-48 (VS-10): A GET read through the next-action run wrapper hits no ban in any spelling

- Result: **pass**
- Spec source: R-119 acceptance; VS-10 over-block rule
- Given: a copy with next-action.py extended by run(repo, 'gh', 'api', <method>, 'repos/o/r/rules/branches/x') for -X GET, -X get, --method=GET, -XGET and no method
- When: push_guard.py runs on each copy
- Then: only forge and wrapperVerbs change; no ban key changes
- Expected: changed keys wrapperVerbs, forge
- Actual: changed keys: wrapperVerbs, forge for all five spellings
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:281`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-48 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-48 -X GET / -X get / --method=GET / -XGET / no method
exit: 0 (each)
changed keys: wrapperVerbs, forge (each)
```

## TC-cli-49 (VS-10): The glab push_rule read changes only the direct and forge pins

- Result: **pass**
- Spec source: R-119 acceptance; VS-10 over-block rule
- Given: a copy with branches.py extended by subprocess.run(['glab', 'api', 'projects/:fullpath/push_rule'], ...)
- When: push_guard.py runs on the copy
- Then: only direct and forge change
- Expected: changed keys direct, forge
- Actual: changed keys: direct, forge
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:293`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-49 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-49 glab api push_rule
exit: 0
changed keys: direct, forge
```

## TC-cli-50 (VS-10): A git log or git fetch through the state-write wrapper hits no ban

- Result: **pass**
- Spec source: R-119 acceptance; VS-10 over-block rule
- Given: a copy with state-write.py extended by git(repo, 'log', '-1', '--format=%H') or git(repo, 'fetch', '-q', 'origin')
- When: push_guard.py runs on each copy
- Then: git log changes only the wrapperVerbs pin; git fetch changes nothing, because fetch is a pinned verb
- Expected: log: wrapperVerbs only; fetch: no change
- Actual: log: changed keys wrapperVerbs (adds 'state-write.py git log'); fetch: no change. T-R-119b needs a pin update for a new verb, which is a review step, not a ban.
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:300`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-50 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-50 git log
exit: 0
changed keys: wrapperVerbs
  + wrapperVerbs: state-write.py git log
### TC-cli-50 git fetch
exit: 0
changed keys: (none: output equals the pins)
```

## TC-cli-51 (VS-11): A pinned script the scanner cannot parse is reported as opaque

- Result: **pass**
- Spec source: R-119 acceptance; VS-11 fail-closed rule
- Given: a copy with hooks/live-poke.py replaced by a syntax error, invalid UTF-8, a NUL byte, a latin-1 cookie with a latin-1 byte, or a BOM before a push
- When: push_guard.py runs on each copy
- Then: each copy changes the opaque key or another key
- Expected: opaque holds 'hooks/live-poke.py parse <error>'
- Actual: exit 0 and a 'hooks/live-poke.py parse' entry in opaque for all five
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:309`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-51 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-51 syntax error / invalid UTF-8 / NUL byte / latin-1 cookie / BOM
exit: 0 (each)
changed keys: opaque (each)
```

## TC-cli-52 (VS-11): A new script file or a new script type changes the files pin or the extension check

- Result: **pass**
- Spec source: R-119 acceptance; tests.md 'A new script file of another type fails the test'
- Given: a copy with one of: a .py in a new subdirectory, a symlinked .py file, hooks/x.sh, x.mjs, x.cjs, a file with no extension and a shebang, x.PY, x.pyc
- When: push_guard.py runs on each copy
- Then: each copy changes files, or adds a file outside the allowed extensions
- Expected: files or extensions change
- Actual: new .py: files; symlinked .py: files and direct; the other six: files and extensions
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:327`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-52 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

See `.sdlc/slices/S-005/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-54 (VS-11): A guard crash fails the repo test instead of passing as an empty report

- Result: **pass**
- Spec source: R-119 acceptance; VS-11 fail-closed rule
- Given: a copy with hooks/live-poke.py or sdlc-loop.js at mode 000
- When: push_guard.py runs on each copy
- Then: the guard exits non-zero with empty stdout; push-guard.test.mjs guard() asserts exit 0 before it parses stdout
- Expected: non-zero exit, empty stdout
- Actual: exit 1 with PermissionError on stderr and empty stdout for both; push-guard.test.mjs:105 asserts r.status 0
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs:349`
- Command: `VERIFY_WT=$PWD node --test --test-name-pattern 'TC-cli-54 ' .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs  (run from the repo root on sdlc/S-005 at 9e1e71b)`

**transcript: guard output**

```
### TC-cli-54 unreadable .py
exit: 1
stderr: PermissionError: [Errno 13] Permission denied: '<copy>/hooks/live-poke.py'
### TC-cli-54 unreadable .js
exit: 1
stderr: PermissionError: [Errno 13] Permission denied: '<copy>/skills/sdlc/sdlc-loop.js'
```

## Attacks

None in this profile.

## Seeds

- **S1: a second top-level def with a pinned name hides a new push** (`skills/sdlc/test/push_guard.py`): A second 'def advance_run_branch(repo, run)' appended to state-write.py with git(repo, 'push', '-q', 'origin', run, check=False) leaves the output equal to the pins. The pushes key is a set of (file, function, text), so a duplicate site collapses into the pinned one. Recorded under S1 (data flow into a pinned site). A count of each pinned site would close it.
- **S3: module attribute walks are not tracked** (`skills/sdlc/test/push_guard.py`): subprocess.__dict__['run'](...), operator.attrgetter('run')(subprocess)(...) and (() => 0).constructor('...') in sdlc-loop.js leave the output equal to the pins.
- **Code runners outside the listed modules** (`skills/sdlc/test/push_guard.py`): runpy.run_path, code.InteractiveInterpreter().runsource and import _posixsubprocess leave the output equal to the pins. Each can run code that the scan never reads.
- **S5: excluded directory names apply at any depth** (`skills/sdlc/test/push_guard.py`): skills/sdlc/tracker/test/x.py holding subprocess.run(['git', 'push', ...]) is not scanned: SKIPPED matches a directory name at any depth, not only skills/sdlc/test. The scope text names the directories by name, so this is recorded as S5.
- **S5: a symlinked directory is not walked** (`skills/sdlc/test/push_guard.py`): skills/sdlc/lib as a symlink to a directory that holds x.py with a push leaves the output equal to the pins: os.walk does not follow directory symlinks and the files key does not list the link.
- **hooks/hooks.json commands are not checked** (`hooks/hooks.json`): A SubagentStop hook entry with command 'git push origin sdlc/S-001-v0-http-api-0' in hooks/hooks.json leaves the output equal to the pins. The file is in the scanned set as .json, but the scan reads only .py and .js content. Claude Code runs these commands on each agent start and stop.
