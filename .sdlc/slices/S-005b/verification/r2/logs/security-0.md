# S-005b verification: security, part 0, round 2

- Slice: S-005b
- Profile: security
- Round: 2
- Commit: 639556c
- Scenarios: VS-1, VS-2, VS-3, VS-4, VS-5, VS-7
- Verdict: refuted. 8 cases: 4 pass, 4 fail.

## Environment

macOS Darwin 25.6, Python 3.14.7, Node 24; push_guard.py run on scratch copies of skills/sdlc and hooks at 639556c (worktree sdlc/S-005b-v2-security-0); behavior cases use a local bare git remote only

## Charter

- VS-2, VS-3: explore pinned wrapper bodies with forwarded parameters to find a push or pr create the guard hides. Guarantee: tests.md R-119 scope, fix round 2 forwarded-token rule.
- VS-4: explore aliases, attribute chains and process APIs to find a process or network call the guard misses (ADR-388e).
- VS-5: explore escapes and quoting in sdlc-loop.js to find a banned identifier with no jsHits entry.
- VS-7: explore new file kinds to find a script the guard does not see.
- VS-1: confirm the clean tree equals every pin.

## Threat model boundary

Trusted: the reviewed scripts and the guard. Not trusted: a new literal form in a scanned file. Seeds S1 to S5 (data flow, git state, attribute walks, prompts, unscanned files) never refute (ADR-388e).

## TC-security-1 (VS-2): A push or pr create carried in a non-verb wrapper parameter breaks a pin

- Given: A scratch copy of skills/sdlc and hooks at 639556c. A pinned wrapper body gains one recursive call that passes a non-verb parameter (repo or cwd) as the verb, bare or starred. A new function calls the wrapper with a pinned verb and puts the push argv in that parameter.
- When: Run push_guard.py on each of 7 mutants (next-action.py run, impact.py run and git_lines, state-write.py git, suite-receipt.py git).
- Then: Each mutant breaks a pin or adds an opaque entry or a violation.
- Expected: 7 of 7 mutants break a pin.
- Actual: 0 of 7 break a pin. The body call holds only a forwarded token, so classify() and forge() hide it. The caller's verb is a pinned verb. The push argv sits in the first argument, which wrapper_call does not read.
- Result: fail
- Spec source: tests.md R-119 scope (forwarded token rule of fix round 2; 'A verb, program or option before the verb that is not a constant string makes the call opaque'); ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:110`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

mutant na-run-repo-list-push (attack):

```
def run(repo, *cmd):
    if isinstance(repo, list):
        return run(".", *repo)
...
def _verify_sec(repo, b, slug):
    return run(["git", "push", "origin", b], "git", "show")
-> guard breaches: []  opaque: []  pushes: 3 (pinned)
```

mutant sw-git-repo-verb-push (attack):

```
def git(repo, *args, check=True):
    if check is None:
        return git(".", repo)
...
    return git("push", "show", check=None)
-> guard breaches: []
```

guard results per mutant (log):

`.sdlc/slices/S-005b/verification/r2/logs/security-0-transcripts.txt`

## TC-security-2 (VS-2): The next-action.py bypass pushes a verify branch to a bare remote while the guard reports no breach

- Given: The na-run-repo-list-push mutant tree. A scratch repo with branch sdlc/S-001-v0-security-0 and a local bare remote as origin.
- When: Load the mutant next-action.py and call _verify_sec(None, 'sdlc/S-001-v0-security-0', None) in the scratch repo.
- Then: The guard reports a breach, or the bare remote holds no verify ref.
- Expected: A guard breach or a clean remote.
- Actual: Guard breaches []. The bare remote holds refs/heads/sdlc/S-001-v0-security-0. Exit 0.
- Result: fail
- Spec source: tests.md R-119 scope (forwarded token rule of fix round 2; 'A verb, program or option before the verb that is not a constant string makes the call opaque'); ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:134`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

behavior run (transcript):

```
### behavior na-run-repo-list-push
breaches: []
opaque: []
pushes: 3 forgeViolations: 0
$ python3 -c '<load next-action.py>; m._verify_sec(None, "sdlc/S-001-v0-security-0", None)'
exit: 0
remote refs: refs/heads/sdlc/S-001-v0-security-0
```

bare remote refs before and after (db-diff):

```
before: (none)
after:  refs/heads/sdlc/S-001-v0-security-0
```

## TC-security-3 (VS-2): The state-write.py bypass pushes a verify branch to a bare remote while the guard reports no breach

- Given: The sw-git-repo-starred-push mutant tree: the git body gains `if check is None: return git(".", *repo)`. A scratch repo with a local bare remote.
- When: Call _verify_sec(<repo>, 'sdlc/S-001-v0-security-0', None), which calls git(["push", "origin", b], "show", check=None).
- Then: The guard reports a breach, or the bare remote holds no verify ref.
- Expected: A guard breach or a clean remote.
- Actual: Guard breaches []. The bare remote holds refs/heads/sdlc/S-001-v0-security-0.
- Result: fail
- Spec source: tests.md R-119 scope (forwarded token rule of fix round 2; 'A verb, program or option before the verb that is not a constant string makes the call opaque'); ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:144`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

behavior run (transcript):

```
### behavior sw-git-repo-starred-push
breaches: []
opaque: []
pushes: 3 forgeViolations: 0
exit: 0
remote refs: refs/heads/sdlc/S-001-v0-security-0
```

bare remote refs before and after (db-diff):

```
before: (none)
after:  refs/heads/sdlc/S-001-v0-security-0
```

## TC-security-4 (VS-4): os.startfile in a scanned script breaks a pin

- Given: janitor.py gains `os.startfile("push.bat")` in a new function.
- When: Run push_guard.py on the copy.
- Then: The direct or dynamic pin changes.
- Expected: A pin breaks.
- Actual: Every pin stays equal. is_process() does not list os.startfile. The call starts a process on Windows only.
- Result: fail
- Spec source: ADR-20261009-062930-decision-judge-S-005-388e: a new process call that leaves the output equal to the pins refutes R-119
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:154`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

mutant (attack):

```
def _verify_sec(repo, b, slug):
    os.startfile("push.bat")
-> guard breaches: []
```

## TC-security-5 (VS-2): 80 push, forge, process, network and loop forms each break a pin

- Given: One mutant per form: 21 push spellings (VS-2), 21 forge forms (VS-3), 30 process and network forms (VS-4), 8 sdlc-loop.js forms (VS-5).
- When: Run push_guard.py on each mutant.
- Then: Each mutant breaks a pin.
- Expected: 80 of 80 break a pin.
- Actual: 80 of 80 break a pin.
- Result: pass
- Spec source: tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:244`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

per-mutant breaches (log):

`.sdlc/slices/S-005b/verification/r2/logs/security-0-transcripts.txt`

## TC-security-6 (VS-2): Corpus values before push in a wrapper call each break a pin

- Given: The first 40 argv-safe entries of the flag-like-values, injection and unicode-whitespace corpus families.
- When: Put each value before "push" in a state-write.py git call and run the guard.
- Then: Each mutant breaks a pin.
- Expected: 40 of 40.
- Actual: 40 of 40 break a pin.
- Result: pass
- Spec source: tests.md R-119 scope
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:252`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

corpus breaches (log):

`.sdlc/slices/S-005b/verification/r2/logs/security-0-transcripts.txt`

## TC-security-7 (VS-7): A new script type, a symlink or a latin-1 source breaks a pin

- Given: hooks/x.sh, skills/sdlc/x.mjs, x.cjs, a file with no extension, a latin-1 janitor.py, a symlinked directory and a symlinked file.
- When: Run push_guard.py on each tree.
- Then: Each tree breaks the files, extensions or opaque pin.
- Expected: 7 of 7.
- Actual: 7 of 7 break a pin.
- Result: pass
- Spec source: tests.md R-119 scope (scanned files, symlink opaque, encoding opaque)
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:262`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

file kind breaches (log):

`.sdlc/slices/S-005b/verification/r2/logs/security-0-transcripts.txt`

## TC-security-8 (VS-1): The unmutated tree equals every pin

- Given: A clean copy of skills/sdlc and hooks at 639556c.
- When: Run push_guard.py.
- Then: No breach.
- Expected: breaches [].
- Actual: breaches []. pushes holds the 3 reviewed state-write.py pushes.
- Result: pass
- Spec source: T-R-119a, T-R-119b
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs:286`
- Command: `VERIFY_REPO=<worktree at 639556c> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard.verify-security.test.mjs`

clean tree (log):

`.sdlc/slices/S-005b/verification/r2/logs/security-0-transcripts.txt`

## Attacks

| id | input | expected | observed | result |
|---|---|---|---|---|
| A-1 | next-action.py run body: run(".", *repo); caller run(["git","push","origin",b], "git", "show") | pin breaks | all pins equal; a real push lands on a bare remote | broke |
| A-2 | next-action.py run body: run(".", *repo); caller run(["gh","pr","create","--fill","--head",b], "git", "show") | forge violation | all pins equal | broke |
| A-3 | impact.py git_lines body: run(repo, "."); caller git_lines(["diff"], ["git","push","origin",b]) | pin breaks | all pins equal | broke |
| A-4 | impact.py run body: run(cwd, "."); caller run(["git","diff"], ["git","push","origin",b]) | pin breaks | all pins equal | broke |
| A-5 | state-write.py git body: git(".", *repo); caller git(["push","origin",b], "show", check=None) | pin breaks | all pins equal; a real push lands on a bare remote | broke |
| A-6 | state-write.py git body: git(".", repo); caller git("push", "show", check=None) | pin breaks | all pins equal | broke |
| A-7 | suite-receipt.py git body: git(".", *repo); caller git(["push","origin",b], "ls-tree") | pin breaks | all pins equal | broke |
| A-8 | suite-receipt.py git body: git(".", repo) when no args; caller git("push") | pin breaks | wrapperVerbs gains 'suite-receipt.py git ' (held only because the caller has no pinned verb) | held |
| A-9 | os.startfile("push.bat") in janitor.py | direct pin breaks | all pins equal | broke |
| A-10 | starred tuple, f-string, bytes decode, % format, join, Alias upper case, one-string verb, tab and NBSP in -C, --git-dir=, send-pack, subtree push, keyword repo, dict splat, direct tuple, args=, check_output, /usr/bin/git, env, sh -c, xargs | pin breaks | each breaks pushes, opaque, direct or wrapperVerbs | held |
| A-11 | -Xpost, --method=PATCH, --raw-field=, -F attached, --input after path, pr Create, pr new, pr merge, alias set, user alias, glab mr create, GraphQL, method override header, -X after path, %6C path, --hostname, /usr/local/bin/gh, --repo=, -R attached, --, workflow run | violation or pin change | each breaks forge, forgeViolations, wrapperVerbs or opaque | held |
| A-12 | os alias, getoutput alias, execvpe, shutil.os, tempfile._os, tempfile.os, branches.subprocess, branches.os, globmod.os, glob.os, mimetypes.os, hub.subprocess, hub.socketserver, socketserver.socket, ThreadingHTTPServer(), urllib.request.Request, getattr built name, operator.attrgetter, webbrowser, smtplib, urlopen alias, http.client, platform.os, forkpty, lambda default, decorator, metaclass, with Popen, annotation default, match capture, second def run, __builtins__ | pin breaks | each breaks a pin | held |
| A-13 | globalThis bracket, \u0070rocess, im\u{70}ort, "global", `global`, 'global'['constructor'], CR line, U+2028 line | jsHits or jsAllowed changes | each changes jsHits or jsAllowed | held |
| A-14 | 40 entries of flag-like-values, injection, unicode-whitespace | pin breaks | 40 of 40 break a pin | held |
| A-15 | x.sh, x.mjs, x.cjs, no extension, latin-1 coding line, symlinked dir and file | pin breaks | 7 of 7 break a pin | held |
| A-16 | getattr(shutil, "os").system(...) in janitor.py; sys.modules["os"].system(...) in hub.py | pin breaks | all pins equal | out-of-scope |
| A-17 | git(repo, "-c", "remote.origin.mirror=true", "fetch"); git(repo, "fetch", "ext::sh -c ...") | pin breaks | all pins equal; wrapperVerbs git fetch is pinned | out-of-scope |
| A-18 | '\x70rocess', '\160rocess', 'pro'+'cess', String.fromCharCode, (()=>{}).constructor, Reflect.get(this), module.createRequire, zero-width and Cyrillic names | jsHits | all pins equal; none of these reach a process alone | out-of-scope |

## Seeds

- getattr on a pure module reaches os: getattr(shutil, "os").system(...) leaves every pin equal. The getattr rule fires only when the target is a watched module. ADR-388e S3 covers attribute walks, so this is a seed. (`skills/sdlc/test/push_guard.py`)
- git -c with constant config values and ext:: transport: -c accepts any constant key except alias.*. Keys such as core.hooksPath, core.sshCommand or protocol.ext.allow change what a pinned verb (fetch, commit) runs. A constant ext:: URL on a pinned fetch runs a command when the protocol is allowed. S2 territory. (`skills/sdlc/test/push_guard.py`)
- JS global object through a constructor walk: (()=>{}).constructor plus a built string such as 'pro'+'cess' reaches process with no banned identifier. S3 seed already named in tests.md. (`skills/sdlc/sdlc-loop.js`)
