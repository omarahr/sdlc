# S-005 security verification, round 1, part 0

- Slice: S-005
- Profile: security
- Round: 1 (plan round 0)
- Commit: 112b45b
- Verdict: REFUTED. TC-security-1 to 8 and TC-security-15 fail.

## Environment

macOS (Darwin 25.6.0), Python 3.14.7, Node test runner, git 2.50.1, gh 2.97.0; scratch copies of skills/sdlc and hooks; local bare git remote and a 127.0.0.1 HTTP stub.

## Charter

- VS-9: Explore push_guard.py with option-value and unwatched-stdlib forms to find a process, network or push call that keeps the output equal to the pins (ADR-20261009-062930-decision-judge-S-005-388e).
- VS-11: Explore the file walk with links, encodings and new file types to find a skipped file (tests.md R-119 scope).
- VS-2, VS-4, VS-6: Explore branches.py name with the attack corpus to find a crash, a side effect or a name outside the prefix (R-008, R-009, R-010).
- VS-8: Trace each pinned push to its target to find a verify name (R-119).

## Threat model boundary

Trusted: the reviewed pinned sites, git and environment state (S2), agent prompts (S4), files outside the scanned set (S5). Not trusted: any new literal form in a scanned script. Seeds S1 to S5 never refute.

## TC-security-1 (VS-9): git --work-tree <pinned verb> push through the state-write.py git wrapper hides a push

- Given: a copy of skills/sdlc and hooks at commit 112b45b
- When: append git(repo, "--work-tree", "fetch", "push", "origin", "sdlc/S-001-v0-http-api-0") to state-write.py and run push_guard.py
- Then: the output must differ from the pins
- Expected: pushes or wrapperVerbs changes
- Actual: the output equals the pins: the scanner skips --work-tree as a flag and reads its value fetch as the verb; fetch is already pinned
- Result: **fail**
- Spec source: tests.md R-119 scope: a push through a pinned wrapper counts in any spelling of the constant arguments, options before the verb included; ADR-20261009-062930-decision-judge-S-005-388e (constant-folded wrapper verbs, pinned push calls)
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:80`
- Command: `node --test --test-name-pattern 'TC-security-1:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
git(repo, '--work-tree', 'fetch', 'push', 'origin', VERIFY)
-> breaches() = []  (pushes, wrapperVerbs, opaque unchanged)
cause: classify() skips only -C and -c values; --work-tree, --git-dir, --namespace and --config-env take a separate value in git
```

## TC-security-2 (VS-9): git --work-tree show push through the next-action.py run wrapper hides a push

- Given: the same copy
- When: append run(repo, "git", "--work-tree", "show", "push", "origin", VERIFY) to next-action.py
- Then: the output must differ from the pins
- Expected: a pin changes
- Actual: the output equals the pins; the verb reads as show
- Result: **fail**
- Spec source: tests.md R-119 scope: a push through a pinned wrapper counts in any spelling of the constant arguments, options before the verb included; ADR-20261009-062930-decision-judge-S-005-388e (constant-folded wrapper verbs, pinned push calls)
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:81`
- Command: `node --test --test-name-pattern 'TC-security-2:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
run(repo, 'git', '--work-tree', 'show', 'push', 'origin', VERIFY) -> breaches() = []
```

## TC-security-3 (VS-9): git --work-tree diff push through the impact.py git_lines wrapper hides a push

- Given: the same copy
- When: append git_lines(["--work-tree", "diff", "push", "origin", VERIFY], repo) to impact.py
- Then: the output must differ from the pins
- Expected: a pin changes
- Actual: the output equals the pins; the verb reads as diff
- Result: **fail**
- Spec source: tests.md R-119 scope: a push through a pinned wrapper counts in any spelling of the constant arguments, options before the verb included; ADR-20261009-062930-decision-judge-S-005-388e (constant-folded wrapper verbs, pinned push calls)
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:82`
- Command: `node --test --test-name-pattern 'TC-security-3:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
git_lines(['--work-tree', 'diff', 'push', 'origin', VERIFY], repo) -> breaches() = []
```

## TC-security-4 (VS-9): gh pr --milestone list create inside load_prs creates a pull request and keeps every pin

- Given: the same copy
- When: insert run(repo, "gh", "pr", "--milestone", "list", "create", "--fill", "--head", b) as the first line of load_prs in next-action.py
- Then: forgeViolations must hold verb pr create, or a pin must change
- Expected: a forge violation
- Actual: the output equals the pins: --milestone is not in GH_VALUE_OPTS, so its value list becomes the sub-verb and the call reads as the pinned gh pr list
- Result: **fail**
- Spec source: tests.md R-119 scope: a gh or glab call that creates a pull request is covered in any spelling, options before the verb included; forge rule bans the verb pr create
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:83`
- Command: `node --test --test-name-pattern 'TC-security-4:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
run(repo, 'gh', 'pr', '--milestone', 'list', 'create', '--fill', '--head', b) in load_prs -> breaches() = []
other value flags missing from GH_VALUE_OPTS: -m, -r/--reviewer, --recover
```

## TC-security-5 (VS-9): pydoc.pipepager runs a shell command and the scanner does not see it

- Given: the same copy
- When: append import pydoc; pydoc.pipepager("", "git push origin sdlc/S-001-v0-http-api-0") to janitor.py
- Then: a process call must change the direct pin
- Expected: direct changes
- Actual: the output equals the pins; pydoc is not a watched module
- Result: **fail**
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e: a new form in neither list is covered when it is a process or network call in a scanned file
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:84`
- Command: `node --test --test-name-pattern 'TC-security-5:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
pydoc.pipepager('', 'git push origin ' + VERIFY) -> breaches() = []
pipepager calls subprocess.Popen(cmd, shell=True); TC-security-10 proves it runs
```

## TC-security-6 (VS-9): logging.handlers.HTTPHandler POSTs to the pulls API and the scanner does not see it

- Given: the same copy
- When: append HTTPHandler("api.github.com", "/repos/o/r/pulls", method="POST", secure=True).emit(None) to janitor.py
- Then: a network call must change the network pin
- Expected: network changes
- Actual: the output equals the pins; logging is not a watched module
- Result: **fail**
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e: a new form in neither list is covered when it is a process or network call in a scanned file
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:85`
- Command: `node --test --test-name-pattern 'TC-security-6:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
logging.handlers.HTTPHandler(..., '/repos/o/r/pulls', method='POST') -> breaches() = []
```

## TC-security-7 (VS-9): uuid._get_command_stdout runs git push and the scanner does not see it

- Given: the same copy, Python 3.14.7
- When: append import uuid; uuid._get_command_stdout("git", "push", "origin", VERIFY) to janitor.py
- Then: a process call must change the direct pin
- Expected: direct changes
- Actual: the output equals the pins
- Result: **fail**
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e: a new form in neither list is covered when it is a process or network call in a scanned file
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:86`
- Command: `node --test --test-name-pattern 'TC-security-7:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
uuid._get_command_stdout('git', 'push', 'origin', VERIFY) -> breaches() = []
the helper calls subprocess.Popen((executable,) + args)
```

## TC-security-8 (VS-9): xml.dom.minidom.parse fetches a URL and the scanner does not see it

- Given: the same copy
- When: append xml.dom.minidom.parse("https://api.github.com/repos/o/r/pulls") to janitor.py
- Then: a network call must change the network pin
- Expected: network changes
- Actual: the output equals the pins
- Result: **fail**
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e: a new form in neither list is covered when it is a process or network call in a scanned file; a GET only, so it cannot create a pull request
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:87`
- Command: `node --test --test-name-pattern 'TC-security-8:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
xml.dom.minidom.parse('https://api.github.com/...') -> breaches() = []
```

## TC-security-9 (VS-9): git --work-tree fetch push really pushes a verify branch to a remote

- Given: a scratch repo with branch sdlc/S-001-v0-http-api-0 and a local bare remote
- When: run git -C w --work-tree fetch push origin sdlc/S-001-v0-http-api-0
- Then: the remote gets the verify ref
- Expected: the push succeeds
- Actual: exit 0; the bare remote holds refs/heads/sdlc/S-001-v0-http-api-0
- Result: **pass**
- Spec source: proof for TC-security-1 to 3
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:97`
- Command: `node --test --test-name-pattern 'TC-security-9:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

remote refs before and after (db-diff):

```
before: (none)
after:  refs/heads/sdlc/S-001-v0-http-api-0
```

## TC-security-10 (VS-9): pydoc.pipepager runs a command and HTTPHandler sends a POST

- Given: a stub HTTP server on 127.0.0.1
- When: emit a record through HTTPHandler and call pydoc.pipepager with touch <marker>
- Then: the stub sees one POST and the marker exists
- Expected: both side effects occur
- Actual: [["POST","/repos/o/r/pulls"]] and the marker file exists
- Result: **pass**
- Spec source: proof for TC-security-5 and 6
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:112`
- Command: `node --test --test-name-pattern 'TC-security-10:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

stub server (http-exchange):

```
POST /repos/o/r/pulls
-> 201
```

## TC-security-11 (VS-9): gh routes pr --milestone list create to the pr create command

- Given: gh 2.97.0
- When: run gh pr --milestone list create --help
- Then: the create help prints
- Expected: gh reads create as the sub-verb
- Actual: "Create a pull request on GitHub."
- Result: **pass**
- Spec source: proof for TC-security-4
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:134`
- Command: `node --test --test-name-pattern 'TC-security-11:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

gh help (transcript):

```
$ gh pr --milestone list create --help
Create a pull request on GitHub.
```

## TC-security-12 (VS-9): 35 VS-9 plan forms each break a pin

- Given: the same copy
- When: apply each form: import aliases, posix_spawn, execvp, pty, asyncio, starred, tuple and args= argv, f-string verb, lambda, partial, -c alias, -C value, --git-dir=, gh api -X post, --method=POST, -XPOST, --field=, -ftitle=x, pulls split by +, graphql, glab mr create, gh pr create, getattr, __import__, importlib, and seven JS global forms
- Then: each output differs from the pins
- Expected: no form missed
- Actual: no form missed
- Result: **pass**
- Spec source: tests.md R-119 scope: a push through a pinned wrapper counts in any spelling of the constant arguments, options before the verb included; ADR-20261009-062930-decision-judge-S-005-388e (constant-folded wrapper verbs, pinned push calls)
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:177`
- Command: `node --test --test-name-pattern 'TC-security-12:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
35 forms, 0 missed; see the HELD table in the test file
```

## TC-security-13 (VS-11): new, unreadable and odd files fail closed

- Given: the same copy
- When: add a syntax error, invalid UTF-8, a BOM, a latin-1 cookie, a NUL byte, a new subdirectory, a symlinked .py file, hooks/x.sh, x.mjs, x.cjs, a shebang file with no extension and x.PY
- Then: each case breaks a pin or exits non-zero
- Expected: no case missed
- Actual: no case missed
- Result: **pass**
- Spec source: tests.md R-119 scope: scanned files and the pinned file list; ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:184`
- Command: `node --test --test-name-pattern 'TC-security-13:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
12 cases, 0 missed
```

## TC-security-14 (VS-11): a crash of push_guard.py is a non-zero exit, not an empty report

- Given: janitor.py with mode 000
- When: run push_guard.py
- Then: a non-zero exit with no stdout
- Expected: PermissionError
- Actual: exit 1, empty stdout, PermissionError on stderr; the T-R-119 guard() helper asserts exit 0, so the suite fails
- Result: **pass**
- Spec source: tests.md R-119 scope
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:213`
- Command: `node --test --test-name-pattern 'TC-security-14:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

stderr (log):

```
PermissionError: [Errno 13] Permission denied: '.../skills/sdlc/janitor.py'
```

## TC-security-15 (VS-11): a .py file under a symlinked directory is skipped and the output equals the pins

- Given: the same copy with skills/sdlc/lib a symlink to a directory that holds x.py with a subprocess push; janitor.py imports lib.x
- When: run push_guard.py
- Then: the file is scanned or reported, or the guard exits non-zero
- Expected: files or direct changes
- Actual: exit 0 and the output equals the pins: os.walk does not follow directory links, so skills/sdlc/lib/x.py is never listed
- Result: **fail**
- Spec source: tests.md R-119 scope: scanned files are every file under skills/sdlc and hooks; ADR-20261009-062930-decision-judge-S-005-388e covers the pinned list of scanned files. The link target lives outside the tree, so a judge can read this as S5
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:223`
- Command: `node --test --test-name-pattern 'TC-security-15:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

attack (attack):

```
symlink skills/sdlc/lib -> <tmp>/lib (x.py holds subprocess.run(['git','push',...]))
import lib.x appended to janitor.py
-> exit 0, breaches() = []
```

## TC-security-16 (VS-4): hostile id and profile values never crash and stay under the prefix

- Given: a scratch git repo
- When: run name --kind verify and --kind attempt with each argv-safe entry of traversal, control-chars, flag-like-values, unicode-whitespace, unicode-confusables, injection and format-strings as --id or --profile
- Then: exit 0 or 2, one JSON line, no traceback, no tree change, and every name under sdlc/
- Expected: all hold
- Actual: all hold; 36 entries give a ref-unsafe name (seed)
- Result: **pass**
- Spec source: R-009 and R-010 acceptance; the plan's VS-4 and VS-6 notes
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:248`
- Command: `node --test --test-name-pattern 'TC-security-16:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

tree diff (file-tree):

```
treeUnchanged = true for every run
```

run log (log):

```
see .sdlc/slices/S-005/verification/r1/logs/security-0-run.txt
```

## TC-security-17 (VS-6): malformed round, part and n exit 2 or give an ASCII name

- Given: a scratch git repo
- When: run integer-forms, huge-integers and unicode-digits as --round, --part and --n
- Then: exit 0 or 2, one JSON line, no traceback, no tree change, ASCII names
- Expected: all hold
- Actual: all hold; 63 values are accepted, negatives give S-001-v-1-http-api-0 and S-001-attempt--1
- Result: **pass**
- Spec source: R-009 and R-010 acceptance
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:270`
- Command: `node --test --test-name-pattern 'TC-security-17:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

tree diff (file-tree):

```
treeUnchanged = true for every run
```

## TC-security-18 (VS-6): a missing part exits 2 with one JSON error that names the part

- Given: a scratch git repo
- When: drop each of --id, --round, --profile, --part for verify, and --id or --n for attempt; pass --ts for state
- Then: exit 2 and an error that names the part; --ts exits 2
- Expected: all hold
- Actual: all hold
- Result: **pass**
- Spec source: R-009 and R-010 acceptance; tests.md T-R-009c and T-R-010c
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:291`
- Command: `node --test --test-name-pattern 'TC-security-18:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

one example (transcript):

```
name --kind verify (no --profile)
-> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty profile"}
```

## TC-security-19 (VS-2): an explicit state ts is used as given, and empty or None generates one

- Given: branches.py loaded by path
- When: call name(fmt, 'state', ts=...) for '20261008101500', '', None, 0 and hostile values
- Then: the explicit ts is used as given; empty and None give 14 digits
- Expected: all hold
- Actual: sdlc/state-20261008101500 and feature/PROJ-1-state-20261008101500; ts 0 gives sdlc/state-0; ts '../../x' is used as given
- Result: **pass**
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:315`
- Command: `node --test --test-name-pattern 'TC-security-19:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

API results (log):

```
ts 0 -> sdlc/state-0
ts '../../x' -> sdlc/state-../../x
ts 'a@{1} b\x01' -> used as given
```

## TC-security-20 (VS-8): the three pinned pushes target the run branch and milestone branches only

- Given: the slice tree at 112b45b
- When: run push_guard.py and read the three push sites in state-write.py; run node --test skills/sdlc/test/push-guard.test.mjs
- Then: three pushes: advance_run_branch (config.runBranch), ensure_milestone_branch (sdlc/<milestone id>) and prune_stale_milestone_branches (^sdlc/M-\d+$); one forge read; T-R-119a to e2 pass
- Expected: all hold
- Actual: all hold; push-guard.test.mjs passes 6 of 6
- Result: **pass**
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:355`
- Command: `node --test --test-name-pattern 'TC-security-20:' .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

push-guard.test.mjs run (log):

```
see .sdlc/slices/S-005/verification/r1/logs/security-0-vs8.txt
```

## Attacks

| id | scenario | input | observed | result |
|---|---|---|---|---|
| A-1 | VS-9 | append git(repo, "--work-tree", "fetch", "push", "origin", "sdlc/S-001-v0-http-api-0") to state-write.py and run push_guard.py | the output equals the pins: the scanner skips --work-tree as a flag and reads its value fetch as the verb; fetch is already pinned | broke |
| A-2 | VS-9 | append run(repo, "git", "--work-tree", "show", "push", "origin", VERIFY) to next-action.py | the output equals the pins; the verb reads as show | broke |
| A-3 | VS-9 | append git_lines(["--work-tree", "diff", "push", "origin", VERIFY], repo) to impact.py | the output equals the pins; the verb reads as diff | broke |
| A-4 | VS-9 | insert run(repo, "gh", "pr", "--milestone", "list", "create", "--fill", "--head", b) as the first line of load_prs in next-action.py | the output equals the pins: --milestone is not in GH_VALUE_OPTS, so its value list becomes the sub-verb and the call reads as the pinned gh pr list | broke |
| A-5 | VS-9 | append import pydoc; pydoc.pipepager("", "git push origin sdlc/S-001-v0-http-api-0") to janitor.py | the output equals the pins; pydoc is not a watched module | broke |
| A-6 | VS-9 | append HTTPHandler("api.github.com", "/repos/o/r/pulls", method="POST", secure=True).emit(None) to janitor.py | the output equals the pins; logging is not a watched module | broke |
| A-7 | VS-9 | append import uuid; uuid._get_command_stdout("git", "push", "origin", VERIFY) to janitor.py | the output equals the pins | broke |
| A-8 | VS-9 | append xml.dom.minidom.parse("https://api.github.com/repos/o/r/pulls") to janitor.py | the output equals the pins | broke |
| A-9 | VS-9 | run git -C w --work-tree fetch push origin sdlc/S-001-v0-http-api-0 | exit 0; the bare remote holds refs/heads/sdlc/S-001-v0-http-api-0 | held |
| A-10 | VS-9 | emit a record through HTTPHandler and call pydoc.pipepager with touch <marker> | [["POST","/repos/o/r/pulls"]] and the marker file exists | held |
| A-11 | VS-9 | run gh pr --milestone list create --help | "Create a pull request on GitHub." | held |
| A-12 | VS-9 | apply each form: import aliases, posix_spawn, execvp, pty, asyncio, starred, tuple and args= argv, f-string verb, lambda, partial, -c alias, -C value, --git-dir=, gh api -X post, --method=POST, -XPOST, --field=, -ftitle=x, pulls split by +, graphql, glab mr create, gh pr create, getattr, __import__, importlib, and seven JS global forms | no form missed | held |
| A-13 | VS-11 | add a syntax error, invalid UTF-8, a BOM, a latin-1 cookie, a NUL byte, a new subdirectory, a symlinked .py file, hooks/x.sh, x.mjs, x.cjs, a shebang file with no extension and x.PY | no case missed | held |
| A-14 | VS-11 | run push_guard.py | exit 1, empty stdout, PermissionError on stderr; the T-R-119 guard() helper asserts exit 0, so the suite fails | held |
| A-15 | VS-11 | run push_guard.py | exit 0 and the output equals the pins: os.walk does not follow directory links, so skills/sdlc/lib/x.py is never listed | broke |
| A-16 | VS-4 | run name --kind verify and --kind attempt with each argv-safe entry of traversal, control-chars, flag-like-values, unicode-whitespace, unicode-confusables, injection and format-strings as --id or --profile | all hold; 36 entries give a ref-unsafe name (seed) | held |
| A-17 | VS-6 | run integer-forms, huge-integers and unicode-digits as --round, --part and --n | all hold; 63 values are accepted, negatives give S-001-v-1-http-api-0 and S-001-attempt--1 | held |
| A-18 | VS-6 | drop each of --id, --round, --profile, --part for verify, and --id or --n for attempt; pass --ts for state | all hold | held |
| A-19 | VS-2 | call name(fmt, 'state', ts=...) for '20261008101500', '', None, 0 and hostile values | sdlc/state-20261008101500 and feature/PROJ-1-state-20261008101500; ts 0 gives sdlc/state-0; ts '../../x' is used as given | held |
| A-20 | VS-8 | run push_guard.py and read the three push sites in state-write.py; run node --test skills/sdlc/test/push-guard.test.mjs | all hold; push-guard.test.mjs passes 6 of 6 | held |
| A-21 | VS-9 | import shutil; shutil.os.system('git push origin ' + VERIFY), and os.path.os.system | output equals the pins; S3: an attribute walk reaches os through another module | out-of-scope |
| A-22 | VS-9 | sdlc-loop.js: (() => 1).constructor('return pro' + 'cess') | output equals the pins; S3: an attribute walk reaches Function with no banned identifier | out-of-scope |
| A-23 | VS-9 | git(repo, '--exec-path=/tmp/x', 'fetch') | output equals the pins; S2: the option changes what a constant verb runs | out-of-scope |
| A-24 | VS-11 | skills/sdlc/tracker/test/x.py with a push | output equals the pins; S5: test directories are skipped at every depth | out-of-scope |
| A-25 | VS-9 | cProfile.run('import subprocess') in janitor.py | output equals the pins; other new form: string code execution outside DYNAMIC_NAMES (cProfile, profile, timeit, pdb, trace) | out-of-scope |
| A-26 | VS-9 | fetch('https://api.github.com/repos/o/r/pulls', {method: 'POST'}) in tracker/template.html | output equals the pins; other new form: browser script in an .html template, not a skill script | out-of-scope |

## Seeds

- **S3: os reached through another module's attribute** (skills/sdlc/test/push_guard.py): shutil.os.system(...) and os.path.os.system(...) qualify as shutil.os.system and os.path.os.system, so is_process misses them. The output equals the pins.
- **S3: JS Function reached through .constructor** (skills/sdlc/test/push_guard.py): (() => 1).constructor('return pro' + 'cess') in sdlc-loop.js uses no banned identifier. jsHits stays empty.
- **S2: git --exec-path= before a pinned verb** (skills/sdlc/test/push_guard.py): git(repo, '--exec-path=/tmp/x', 'fetch') keeps every pin. The option selects another git-fetch binary.
- **S5: skipped directory names match at every depth** (skills/sdlc/test/push_guard.py): skills/sdlc/tracker/test/x.py is not scanned. A scanned script can import it.
- **String code execution outside DYNAMIC_NAMES** (skills/sdlc/test/push_guard.py): cProfile.run, profile.run, timeit.timeit, pdb.run and trace run a code string. The scanner does not report them.
- **Browser script in tracker/template.html is not scanned** (skills/sdlc/tracker/template.html): A fetch POST in the .html template keeps every pin. The page holds no forge token today.
- **Hostile state ts is used as given** (skills/sdlc/branches.py): name(fmt, 'state', ts='../../x') gives sdlc/state-../../x, and ts 0 gives sdlc/state-0. The name is not checked with git check-ref-format. Negative round, part and n were reported in earlier rounds.
- **testkit: pycall.py takes positional arguments only** (skills/sdlc/test/testkit/pycall.py): name(fmt, kind, **parts) and tail(kind, **parts) need keyword arguments. The test loads branches.py with its own script.
