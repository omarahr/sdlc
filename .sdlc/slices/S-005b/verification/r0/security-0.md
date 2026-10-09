# S-005b security-0, round 0

Slice: S-005b. Profile: security. Round: 0. Commit: 527e86b. Verdict: REFUTED (failing cases: TC-security-4, TC-security-8, TC-security-9).

Environment: node --test, Python 3.14.7 (macOS), git bare remote in a scratch directory; testkit cli-runner; branch sdlc/S-005b-v0-security-0 at sdlc/S-005b 527e86b.

Threat model: the scripts are reasonably trusted. R-119 must catch a literal push, forge write, process call or network call that a later edit adds. Items S1 to S5 of ADR-388e are seeds.

Test file: `.sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`. Run log: `.sdlc/slices/S-005b/verification/r0/logs/security-0-run.txt`. Attack log: `.sdlc/slices/S-005b/verification/r0/logs/security-0-attacks.txt`.

## TC-security-1 (VS-1): An edit inside any of the five pinned bodies breaks wrapperBodies

Result: **pass**. Spec source: R-119 acceptance; plan.md body pin.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Each of 35 inserted statements (push tuple, -c remote.origin.push, --no-pager, -X POST, --method=PATCH, -f, --input, graphql, a rebound repo or cwd) and 11 replaced tokens changes wrapperBodies.
- Actual: All edits changed wrapperBodies.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-1 insert and replace rows all list wrapperBodies (logs/security-0-attacks.txt)
```

## TC-security-2 (VS-2): A changed or extra wrapper definition breaks a pin

Result: **pass**. Spec source: R-119 plan: wrapperBodies is not de-duplicated.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Duplicate def, nested def, class method, async def, def under if or try, decorator, changed default, added parameter, annotations, confusable identifier, f-string and t-string edits, value uses of a wrapper, and a rebind to subprocess.run or os.system each change a pin.
- Actual: All forms changed a pin. An identical duplicate def adds a second wrapperBodies entry. Python 3.14.7 only; 3.11 and 3.12 were not on this host.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-2 rows; Python 3.14.7
```

## TC-security-3 (VS-4): A local list, a parameter verb, a parameter api path, a parameter program or a parameter argv gives an opaque or wrapperVerbs value entry

Result: **pass**. Spec source: R-119 plan: outside a body non-constant is opaque.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Nine non-constant forms change opaque or wrapperVerbs.
- Actual: All nine changed one of them.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-4 non-constant rows
```

## TC-security-4 (VS-4): A starred first argument to git() in state-write.py or suite-receipt.py, or to run() in next-action.py, with a trailing reviewed verb, leaves every pin equal

Result: **fail**. Spec source: ADR-20261009-062930-decision-judge-S-005-388e (refutation rule) and R-119 acceptance; plan.md: a push through a pinned wrapper in any spelling of the constant arguments.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: A push through a pinned wrapper breaks a pin.
- Actual: git(*(repo, "push", "origin", b), "show") in a new function of state-write.py leaves all keys equal. A run against a bare remote created refs/heads/sdlc/S-001-v0-security-0 there. The scanner drops node.args[0] as the repo even when it is a Starred that expands to many tokens, so it reads only the trailing "show".
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
def _verify_sec(...): return git(*(repo, "push", "origin", b), "show")
-> breaches: []
remote refs after call: refs/heads/sdlc/S-001-v0-security-0, refs/heads/show
Five forms leave every pin equal: sw tuple, sw list, sw via local, sr ls-tree, na run(*(".", "git", "push", "origin", b), "git", "show"). The gh forms and impact.py forms do break a pin.
```

## TC-security-5 (VS-5): Every other push spelling at a direct site or wrapper changes a pin

Result: **pass**. Spec source: R-119 plan VS-5 scope.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Split lines, implicit concat, + of constants, -C, five flag options, -c, -P, shell=True, one-string argv, argv from a variable, os.system, os.popen, os.exec*, os.spawn*, os.posix_spawnp, pty, asyncio, multiprocessing each change a pin.
- Actual: All 28 spellings changed a pin; ten sampled spellings changed pushes, direct or opaque.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-5 rows
```

## TC-security-6 (VS-6): Each forge write form is a forge violation, every unknown shape is opaque, a lowercase get is allowed

Result: **pass**. Spec source: ADR-20261009-063408-decision-judge-S-005-368d; R-119 plan VS-6.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: gh pr create, glab mr create, -X POST, --method PATCH, --method=DELETE, -f, -F, --field, --raw-field, --input, pulls, merge_requests, graphql with and without flags and with -X GET, GRAPHQL upper case, a path with ../graphql, a direct site, -XPOST glued, -fa=b glued, a method after the path give the stated violation.
- Actual: All 23 forms gave the stated violation; five unknown shapes gave opaque or a violation; -X get gave none.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-6 rows
```

## TC-security-7 (VS-7): A process or network call reached by an alias, a value, a chain, an import or dynamic code changes a pin

Result: **pass**. Spec source: R-119 plan VS-7 scope.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Aliases, rebinds, defaults, walrus, list, dict, base class, shutil.os.system, branches.subprocess.run, posix, nt, _posixsubprocess, _socket, runpy, code, private attribute, eval, exec, compile, __import__, importlib, globals, locals, vars(), getattr on os, os.execl, ctypes, pickle, http.client, socket, urllib.request, webbrowser, concurrent.futures each change a pin.
- Actual: All 36 forms changed a pin.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-7 rows
```

## TC-security-8 (VS-7): A process module bound by an import inside a class body and called through self breaks a pin

Result: **fail**. Spec source: ADR-20261009-062930-decision-judge-S-005-388e (refutation rule) and R-119 acceptance (a new process call that leaves the output equal to the pins refutes R-119). The loader walk could also count as S3..

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: A subprocess call in a scanned file changes direct.
- Actual: class _V: import subprocess as sp; def go(self, repo, b): return self.sp.run(["git","-C",repo,"push","origin",b]) appended to janitor.py leaves all keys equal. A run created the branch in a bare remote. The scanner resolves names bound by import, but not an attribute reached through self.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
class _V:
    import subprocess as sp
    def go(self, repo, b):
        return self.sp.run(["git","-C",repo,"push","origin",b])
-> breaches: []
remote refs after call: refs/heads/sdlc/S-001-v0-security-0
```

## TC-security-9 (VS-7): os.startfile in a scanned script breaks a pin

Result: **fail**. Spec source: ADR-20261009-062930-decision-judge-S-005-388e (refutation rule) and R-119 acceptance.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: A process call changes direct.
- Actual: os.startfile("push.bat") in a new janitor.py function leaves every pin equal. This repeats r2 TC-security-4 and is still open.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
def _verify_sec(...): os.startfile("push.bat")
-> breaches: []
```

## TC-security-10 (VS-8): Each banned identifier in sdlc-loop.js, in code, in a string or as a \u escape, reports a hit; the three allowlist lines stay pinned

Result: **pass**. Spec source: R-119 plan VS-8 scope.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: jsHits or jsAllowed change for 27 forms.
- Actual: All forms changed a pin. Removing one allowlist line changes jsAllowed.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-8 rows
```

## TC-security-11 (VS-10): A new script type, a symlink or a non-UTF-8 source in the scanned tree changes a pin; the scanned list is exact

Result: **pass**. Spec source: R-119 plan VS-10 scope.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Ten new file kinds, seven encodings and seven symlink shapes change a pin; the clean tree equals every pin and scans 13 files.
- Actual: All changed a pin. A dangling symlink makes push_guard.py exit 1 with FileNotFoundError, so the guard test fails closed, but it gives a traceback and not an opaque entry. An unreadable file does the same.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-10 rows; dangling symlink: GUARD CRASH exit 1 FileNotFoundError
```

## TC-security-12 (VS-11): A new gh or glab read with a constant verb changes forge and hits no ban

Result: **pass**. Spec source: R-119 plan VS-11.

- Given: A scratch copy of skills/sdlc and hooks with one edit.
- When: Run push_guard.py on the copy and compare every key with the pins in push-guard.test.mjs.
- Expected: Six read forms change forge, and give no violation and no opaque entry.
- Actual: All six did.
- Command: `VERIFY_REPO=<worktree at 527e86b> node --test .sdlc/slices/S-005b/verification/r0/tests/security-0/push-guard-bodies.verify-security.test.mjs`

```
VS-11 rows
```

## Attacks

| id | input | result | observed |
|---|---|---|---|
| ATK-1 | VS-1 sw insert args = ("push", "-q", "origin", "x") | held | pin keys changed: ["wrapperBodies"] |
| ATK-2 | VS-1 sw insert args = ("-c", "remote.origin.push=x") + args | held | pin keys changed: ["wrapperBodies"] |
| ATK-3 | VS-1 sw insert args = ("--no-pager",) + args | held | pin keys changed: ["wrapperBodies"] |
| ATK-4 | VS-1 sw insert repo = "." | held | pin keys changed: ["wrapperBodies"] |
| ATK-5 | VS-1 sw insert args = ("push",) + tuple(args[1:]) | held | pin keys changed: ["wrapperBodies"] |
| ATK-6 | VS-1 sw insert args = args[:0] + ("send-pack",) | held | pin keys changed: ["wrapperBodies"] |
| ATK-7 | VS-1 sr insert args = ("push", "origin", "x") | held | pin keys changed: ["wrapperBodies"] |
| ATK-8 | VS-1 sr insert args = ("-c", "remote.origin.push=x") + args | held | pin keys changed: ["wrapperBodies"] |
| ATK-9 | VS-1 sr insert repo = "." | held | pin keys changed: ["wrapperBodies"] |
| ATK-10 | VS-1 sr insert args = ("--no-pager",) + args | held | pin keys changed: ["wrapperBodies"] |
| ATK-11 | VS-1 na insert cmd = ("gh", "pr", "create") | held | pin keys changed: ["wrapperBodies"] |
| ATK-12 | VS-1 na insert cmd = ("gh", "api", "-X", "POST") + cmd | held | pin keys changed: ["wrapperBodies"] |
| ATK-13 | VS-1 na insert cmd = ("gh", "api", "--method=PATCH", *cmd) | held | pin keys changed: ["wrapperBodies"] |
| ATK-14 | VS-1 na insert cmd = ("gh", "api", "-f", "ref=x") + cmd | held | pin keys changed: ["wrapperBodies"] |
| ATK-15 | VS-1 na insert cmd = ("gh", "api", "--input", "-") + cmd | held | pin keys changed: ["wrapperBodies"] |
| ATK-16 | VS-1 na insert cmd = ("git", "push", "origin", "x") | held | pin keys changed: ["wrapperBodies"] |
| ATK-17 | VS-1 na insert repo = "." | held | pin keys changed: ["wrapperBodies"] |
| ATK-18 | VS-1 na insert cmd = ("gh", "api", "graphql") + cmd | held | pin keys changed: ["wrapperBodies"] |
| ATK-19 | VS-1 imr insert args = ["git", "push"] | held | pin keys changed: ["wrapperBodies"] |
| ATK-20 | VS-1 imr insert args = ["gh", "pr", "create"] | held | pin keys changed: ["wrapperBodies"] |
| ATK-21 | VS-1 imr insert args = list(args) + ["push"] | held | pin keys changed: ["wrapperBodies"] |
| ATK-22 | VS-1 imr insert cwd = "." | held | pin keys changed: ["wrapperBodies"] |
| ATK-23 | VS-1 img insert args = ["push"] | held | pin keys changed: ["wrapperBodies"] |
| ATK-24 | VS-1 img insert repo = "." | held | pin keys changed: ["wrapperBodies"] |
| ATK-25 | VS-1 img insert args = ["-c", "remote.origin.push=x"] + list(args) | held | pin keys changed: ["wrapperBodies"] |
| ATK-26 | VS-1 replace skills/sdlc/state-write.py "-C", repo | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-27 | VS-1 replace skills/sdlc/state-write.py capture_output=True, text=True) | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-28 | VS-1 replace skills/sdlc/state-write.py if check and r.returncode != 0: | held | pin keys changed: ["wrapperBodies"] |
| ATK-29 | VS-1 replace skills/sdlc/state-write.py return r | held | pin keys changed: ["wrapperBodies"] |
| ATK-30 | VS-1 replace skills/sdlc/suite-receipt.py ["git", "-C", repo, *args] | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-31 | VS-1 replace skills/sdlc/suite-receipt.py return r.stdout | held | pin keys changed: ["wrapperBodies"] |
| ATK-32 | VS-1 replace skills/sdlc/next-action.py cwd=repo, capture_output=True | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-33 | VS-1 replace skills/sdlc/next-action.py timeout=120 | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-34 | VS-1 replace skills/sdlc/next-action.py subprocess.run(cmd, | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-35 | VS-1 replace skills/sdlc/impact.py return subprocess.run(args, cwd=cwd, capture_output=True, text=True) | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-36 | VS-1 replace skills/sdlc/impact.py ["git"] + args | held | pin keys changed: ["wrapperBodies"] |
| ATK-37 | VS-2 identical duplicate def sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-38 | VS-2 second def with push sr | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-39 | VS-2 nested def in other function sw | held | pin keys changed: ["direct","wrapperBodies","wrapperValues"] |
| ATK-40 | VS-2 class method run na | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-41 | VS-2 class method git_lines im | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-42 | VS-2 async def git sw | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-43 | VS-2 async def run na | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-44 | VS-2 def under if sw | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-45 | VS-2 def under try na | held | pin keys changed: ["direct","wrapperBodies"] |
| ATK-46 | VS-2 decorator on run im | held | pin keys changed: ["wrapperBodies"] |
| ATK-47 | VS-2 decorator with call on git sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-48 | VS-2 changed default sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-49 | VS-2 added kwonly param na | held | pin keys changed: ["wrapperBodies"] |
| ATK-50 | VS-2 return annotation sr | held | pin keys changed: ["wrapperBodies"] |
| ATK-51 | VS-2 parameter annotation im | held | pin keys changed: ["wrapperBodies"] |
| ATK-52 | VS-2 unicode confusable name in body sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-53 | VS-2 rebind wrapper name to subprocess.run sw | held | pin keys changed: ["dynamic"] |
| ATK-54 | VS-2 rebind wrapper name to os.system na | held | pin keys changed: ["dynamic"] |
| ATK-55 | VS-2 alias of wrapper then call sw | held | pin keys changed: ["wrapperValues"] |
| ATK-56 | VS-2 partial of wrapper sw | held | pin keys changed: ["imports","wrapperValues"] |
| ATK-57 | VS-2 wrapper in list na | held | pin keys changed: ["wrapperValues"] |
| ATK-58 | VS-2 wrapper via globals sw | held | pin keys changed: ["dynamic"] |
| ATK-59 | VS-2 wrapper default param sr | held | pin keys changed: ["wrapperValues"] |
| ATK-60 | VS-2 wrapper as base class attr sw | held | pin keys changed: ["wrapperValues"] |
| ATK-61 | VS-2 f-string body change sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-62 | VS-2 nested f-string same quote body change sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-63 | VS-2 t-string added to body sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-64 | VS-2 f-string format spec change sw | held | pin keys changed: ["wrapperBodies"] |
| ATK-65 | VS-2 semicolon statement in body im | held | pin keys changed: ["wrapperBodies"] |
| ATK-66 | VS-2 duplicate | held | pin keys changed: ["wrapperBodies"] |
| ATK-67 | VS-4 sw starred repo tuple then show | broke | every pin equal |
| ATK-68 | VS-4 sw starred repo list then show | broke | every pin equal |
| ATK-69 | VS-4 sw starred via local then show | broke | every pin equal |
| ATK-70 | VS-4 sr starred repo then ls-tree | broke | every pin equal |
| ATK-71 | VS-4 na starred dot git push then git show | broke | every pin equal |
| ATK-72 | VS-4 na starred dot gh pr create then gh pr list | held | pin keys changed: ["forge"] |
| ATK-73 | VS-4 na starred repo only gh api post | held | pin keys changed: ["forge"] |
| ATK-74 | VS-4 im starred argv then cwd | held | pin keys changed: ["wrapperVerbs","pushes"] |
| ATK-75 | VS-4 im git_lines starred | held | pin keys changed: ["wrapperVerbs","pushes"] |
| ATK-76 | VS-7 class-body import then self.sp.run | broke | every pin equal; a run pushed the branch to a bare remote |
| ATK-77 | VS-7 os.startfile | broke | every pin equal |
| ATK-78 | VS-4 local list spread into git | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-79 | VS-4 param verb into git | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-80 | VS-4 param api path | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-81 | VS-4 param verb into run gh | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-82 | VS-4 param program into run | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-83 | VS-4 method param into gh api | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-84 | VS-4 cmd list into run | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-85 | VS-4 im argv param | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-86 | VS-4 im git_lines param | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-87 | VS-5 git split across lines | held | pin keys changed: ["direct","pushes"] |
| ATK-88 | VS-5 git implicit concat | held | pin keys changed: ["direct","pushes"] |
| ATK-89 | VS-5 git plus constants | held | pin keys changed: ["direct","pushes"] |
| ATK-90 | VS-5 git -C before verb | held | pin keys changed: ["direct","pushes"] |
| ATK-91 | VS-5 git five flags before verb | held | pin keys changed: ["direct","pushes"] |
| ATK-92 | VS-5 git -c before verb | held | pin keys changed: ["direct","opaque"] |
| ATK-93 | VS-5 git --exec-path before verb | held | pin keys changed: ["direct","opaque"] |
| ATK-94 | VS-5 git -P before verb | held | pin keys changed: ["direct","opaque"] |
| ATK-95 | VS-5 git double dash | held | pin keys changed: ["direct","opaque"] |
| ATK-96 | VS-5 shell true | held | pin keys changed: ["direct","pushes","opaque"] |
| ATK-97 | VS-5 shell true popen | held | pin keys changed: ["direct","opaque"] |
| ATK-98 | VS-5 one string argv | held | pin keys changed: ["direct","opaque"] |
| ATK-99 | VS-5 argv from var | held | pin keys changed: ["direct","opaque"] |
| ATK-100 | VS-5 os.system push | held | pin keys changed: ["direct","pushes"] |
| ATK-101 | VS-5 os.popen push | held | pin keys changed: ["direct","pushes"] |
| ATK-102 | VS-5 os.execvp push | held | pin keys changed: ["direct"] |
| ATK-103 | VS-5 os.spawnlp push | held | pin keys changed: ["direct"] |
| ATK-104 | VS-5 os.posix_spawnp push | held | pin keys changed: ["direct"] |
| ATK-105 | VS-5 pty.spawn push | held | pin keys changed: ["imports","direct","network","pushes"] |
| ATK-106 | VS-5 asyncio subprocess exec | held | pin keys changed: ["imports","direct","network","pushes"] |
| ATK-107 | VS-5 multiprocessing Process | held | pin keys changed: ["imports","direct","network"] |
| ATK-108 | VS-5 git case Git | held | pin keys changed: ["direct"] |
| ATK-109 | VS-5 git.exe | held | pin keys changed: ["direct"] |
| ATK-110 | VS-5 git tab verb | held | pin keys changed: ["direct","pushes"] |
| ATK-111 | VS-5 git newline verb | held | pin keys changed: ["direct","pushes"] |
| ATK-112 | VS-5 git push with verb after refspec options | held | pin keys changed: ["direct","pushes"] |
| ATK-113 | VS-5 git push-via-remote helper | held | pin keys changed: ["direct"] |
| ATK-114 | VS-5 git ls-remote push-url | held | pin keys changed: ["direct"] |
| ATK-115 | VS-6 gh pr create | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-116 | VS-6 glab mr create | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-117 | VS-6 gh api -X POST | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-118 | VS-6 gh api --method PATCH | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-119 | VS-6 gh api --method=DELETE | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-120 | VS-6 gh api -f | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-121 | VS-6 gh api -F | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-122 | VS-6 gh api --field | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-123 | VS-6 gh api --raw-field | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-124 | VS-6 gh api --input | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-125 | VS-6 gh api pulls path | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-126 | VS-6 glab api merge_requests path | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-127 | VS-6 gh api graphql | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-128 | VS-6 gh api graphql with -f | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-129 | VS-6 gh api -X GET graphql | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-130 | VS-6 gh api graphql with paginate | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-131 | VS-6 glab api graphql | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-132 | VS-6 gh api path prefix graphql | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-133 | VS-6 gh api post at direct site | held | pin keys changed: ["direct","forge","forgeViolations"] |
| ATK-134 | VS-6 gh api -XPOST glued | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-135 | VS-6 gh api -fa=b glued | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-136 | VS-6 gh api method after path | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-137 | VS-6 gh api GRAPHQL upper | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-138 | VS-6 api path no prefix | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-139 | VS-6 api path param only with -X | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-140 | VS-6 gh verb param | held | pin keys changed: ["wrapperVerbs","opaque"] |
| ATK-141 | VS-6 gh unknown leading option | held | pin keys changed: ["opaque"] |
| ATK-142 | VS-6 gh api mixed-case Post | held | pin keys changed: ["wrapperVerbs","forge","forgeViolations"] |
| ATK-143 | VS-6 lowercase get | held | pin keys changed: ["wrapperVerbs","forge"] |
| ATK-144 | VS-7 import os as alias in function | held | pin keys changed: ["direct"] |
| ATK-145 | VS-7 from os import system | held | pin keys changed: ["direct","dynamic"] |
| ATK-146 | VS-7 from subprocess import run late | held | pin keys changed: ["direct","pushes"] |
| ATK-147 | VS-7 import subprocess as sp at module end | held | pin keys changed: ["direct","pushes"] |
| ATK-148 | VS-7 subprocess as value default | held | pin keys changed: ["dynamic"] |
| ATK-149 | VS-7 walrus | held | pin keys changed: ["dynamic"] |
| ATK-150 | VS-7 list element | held | pin keys changed: ["dynamic"] |
| ATK-151 | VS-7 base class | held | pin keys changed: ["dynamic"] |
| ATK-152 | VS-7 dict value | held | pin keys changed: ["dynamic"] |
| ATK-153 | VS-7 conditional expression | held | pin keys changed: ["dynamic"] |
| ATK-154 | VS-7 shutil.os.system | held | pin keys changed: ["direct"] |
| ATK-155 | VS-7 branches.subprocess.run | held | pin keys changed: ["direct","pushes"] |
| ATK-156 | VS-7 posix.system | held | pin keys changed: ["imports","direct","dynamic"] |
| ATK-157 | VS-7 nt.system | held | pin keys changed: ["imports","direct","dynamic"] |
| ATK-158 | VS-7 _posixsubprocess | held | pin keys changed: ["imports","direct","dynamic"] |
| ATK-159 | VS-7 _socket | held | pin keys changed: ["imports","network","dynamic"] |
| ATK-160 | VS-7 runpy | held | pin keys changed: ["imports","dynamic"] |
| ATK-161 | VS-7 code module | held | pin keys changed: ["imports","dynamic"] |
| ATK-162 | VS-7 private attribute | held | pin keys changed: ["dynamic"] |
| ATK-163 | VS-7 eval | held | pin keys changed: ["dynamic"] |
| ATK-164 | VS-7 exec | held | pin keys changed: ["dynamic"] |
| ATK-165 | VS-7 compile | held | pin keys changed: ["dynamic"] |
| ATK-166 | VS-7 __import__ | held | pin keys changed: ["dynamic"] |
| ATK-167 | VS-7 importlib import_module | held | pin keys changed: ["imports","dynamic"] |
| ATK-168 | VS-7 globals | held | pin keys changed: ["dynamic"] |
| ATK-169 | VS-7 locals | held | pin keys changed: ["dynamic"] |
| ATK-170 | VS-7 vars none | held | pin keys changed: ["dynamic"] |
| ATK-171 | VS-7 getattr on os | held | pin keys changed: ["dynamic"] |
| ATK-172 | VS-7 os.execl | held | pin keys changed: ["direct"] |
| ATK-173 | VS-7 ctypes | held | pin keys changed: ["imports","direct","network"] |
| ATK-174 | VS-7 pickle import | held | pin keys changed: ["imports"] |
| ATK-175 | VS-7 http.client conn | held | pin keys changed: ["imports","network"] |
| ATK-176 | VS-7 socket create | held | pin keys changed: ["imports","network"] |
| ATK-177 | VS-7 urllib.request via existing import | held | pin keys changed: ["network"] |
| ATK-178 | VS-7 webbrowser | held | pin keys changed: ["imports","network"] |
| ATK-179 | VS-7 concurrent futures import | held | pin keys changed: ["imports"] |
| ATK-180 | VS-8 require | held | pin keys changed: ["jsHits"] |
| ATK-181 | VS-8 string with process | held | pin keys changed: ["jsHits"] |
| ATK-182 | VS-8 unicode escape process | held | pin keys changed: ["jsHits"] |
| ATK-183 | VS-8 braced escape process | held | pin keys changed: ["jsHits"] |
| ATK-184 | VS-8 fetch call | held | pin keys changed: ["jsHits"] |
| ATK-185 | VS-8 globalThis | held | pin keys changed: ["jsHits"] |
| ATK-186 | VS-8 global double quote | held | pin keys changed: ["jsHits"] |
| ATK-187 | VS-8 global template | held | pin keys changed: ["jsHits"] |
| ATK-188 | VS-8 global in comment | held | pin keys changed: ["jsHits"] |
| ATK-189 | VS-8 Function ctor | held | pin keys changed: ["jsHits"] |
| ATK-190 | VS-8 eval | held | pin keys changed: ["jsHits"] |
| ATK-191 | VS-8 import dynamic | held | pin keys changed: ["jsHits"] |
| ATK-192 | VS-8 Deno | held | pin keys changed: ["jsHits"] |
| ATK-193 | VS-8 Bun | held | pin keys changed: ["jsHits"] |
| ATK-194 | VS-8 navigator | held | pin keys changed: ["jsHits"] |
| ATK-195 | VS-8 WebSocket | held | pin keys changed: ["jsHits"] |
| ATK-196 | VS-8 spawn | held | pin keys changed: ["jsHits"] |
| ATK-197 | VS-8 exec word | held | pin keys changed: ["jsHits"] |
| ATK-198 | VS-8 fork | held | pin keys changed: ["jsHits"] |
| ATK-199 | VS-8 execFileSync | held | pin keys changed: ["jsHits"] |
| ATK-200 | VS-8 Worker | held | pin keys changed: ["jsHits"] |
| ATK-201 | VS-8 global with allowed on same line | held | pin keys changed: ["jsHits","jsAllowed"] |
| ATK-202 | VS-8 allowed literal twice and bare | held | pin keys changed: ["jsHits","jsAllowed"] |
| ATK-203 | VS-8 surrogate pair escape | held | pin keys changed: ["jsHits"] |
| ATK-204 | VS-8 line separator comment | held | pin keys changed: ["jsHits"] |
| ATK-205 | VS-8 process in regex | held | pin keys changed: ["jsHits"] |
| ATK-206 | VS-8 process.env member | held | pin keys changed: ["jsHits"] |
| ATK-207 | VS-8 identifier via computed unicode | held | pin keys changed: ["jsHits"] |
| ATK-208 | VS-8 removing one allowlist line | held | pin keys changed: ["jsAllowed"] |
| ATK-209 | VS-10 file hooks/x.sh | held | pin keys changed: ["extensions"] |
| ATK-210 | VS-10 file skills/sdlc/x.mjs | held | pin keys changed: ["extensions"] |
| ATK-211 | VS-10 file skills/sdlc/x.cjs | held | pin keys changed: ["extensions"] |
| ATK-212 | VS-10 file skills/sdlc/x.ts | held | pin keys changed: ["extensions"] |
| ATK-213 | VS-10 file skills/sdlc/x.pyw | held | pin keys changed: ["extensions"] |
| ATK-214 | VS-10 file skills/sdlc/x.ps1 | held | pin keys changed: ["extensions"] |
| ATK-215 | VS-10 file skills/sdlc/Makefile | held | pin keys changed: ["extensions"] |
| ATK-216 | VS-10 file skills/sdlc/x.py.txt | held | pin keys changed: ["extensions"] |
| ATK-217 | VS-10 file hooks/.hidden.py | held | pin keys changed: ["files","imports","direct"] |
| ATK-218 | VS-10 file skills/sdlc/x.PY | held | pin keys changed: ["extensions"] |
| ATK-219 | VS-10 latin-1 coding line | held | pin keys changed: ["files","opaque"] |
| ATK-220 | VS-10 invalid utf-8 | held | pin keys changed: ["files","opaque"] |
| ATK-221 | VS-10 NUL byte | held | pin keys changed: ["files","opaque"] |
| ATK-222 | VS-10 utf-16 bom | held | pin keys changed: ["files","opaque"] |
| ATK-223 | VS-10 utf-8 bom file | held | pin keys changed: ["files","imports","direct"] |
| ATK-224 | VS-10 js invalid utf-8 | held | pin keys changed: ["files","jsHits"] |
| ATK-225 | VS-10 cp1252 coding line | held | pin keys changed: ["files","opaque"] |
| ATK-226 | VS-10 symlink to file | held | pin keys changed: ["files","imports","direct","opaque"] |
| ATK-227 | VS-10 symlink to directory | held | pin keys changed: ["opaque"] |
| ATK-228 | VS-10 symlink to outside file | held | pin keys changed: ["files","opaque"] |
| ATK-229 | VS-10 dangling symlink | held | guard exits 1 with a traceback (fails closed) |
| ATK-230 | VS-10 symlink replacing a scanned file | held | pin keys changed: ["direct","opaque"] |
| ATK-231 | VS-10 symlink in hooks | held | pin keys changed: ["files","imports","direct","opaque"] |
| ATK-232 | VS-10 symlink to skipped dir | held | pin keys changed: ["extensions","opaque"] |
| ATK-233 | VS-10 dir named test2 | held | pin keys changed: ["files","imports","direct"] |
| ATK-234 | VS-10 clean | held | every pin equal |
| ATK-235 | VS-11 gh pr view const | held | pin keys changed: ["wrapperVerbs","forge"] |
| ATK-236 | VS-11 gh issue list | held | pin keys changed: ["wrapperVerbs","forge"] |
| ATK-237 | VS-11 gh api repos get | held | pin keys changed: ["wrapperVerbs","forge"] |
| ATK-238 | VS-11 glab mr list | held | pin keys changed: ["wrapperVerbs","forge"] |
| ATK-239 | VS-11 glab api push_rule | held | pin keys changed: ["wrapperVerbs","forge"] |
| ATK-240 | VS-11 gh direct list | held | pin keys changed: ["direct","forge"] |
| ATK-241 | OOS S3 sys.modules wrapper call | out-of-scope | every pin equal |
| ATK-242 | OOS S3 sys.modules os system | out-of-scope | every pin equal |
| ATK-243 | OOS S2 os.environ GIT_SSH_COMMAND | out-of-scope | every pin equal |
| ATK-244 | OOS os.kill is not a process start | out-of-scope | every pin equal |
| ATK-245 | OOS rebind wrapper to a non-process function | out-of-scope | every pin equal |
| ATK-246 | OOS rebind wrapper to lambda | out-of-scope | every pin equal |
| ATK-247 | OOS JS capital P escape is not process | out-of-scope | every pin equal |
| ATK-248 | OOS JS zero width joiner is not process | out-of-scope | every pin equal |
| ATK-249 | OOS JS cyrillic lookalike is not process | out-of-scope | every pin equal |
| ATK-250 | VS-10 unreadable file | held | guard exits 1 with a traceback (fails closed) |

## Seeds

- **Starred first argument to a wrapper hides the verb** (skills/sdlc/test/push_guard.py): See TC-security-4. wrapper_call() takes node.args[1:] for git-args and program-args. A fix reads a Starred or a non-constant first argument as opaque.
- **Process module reached through a class attribute and self** (skills/sdlc/test/push_guard.py): See TC-security-8. An import in a class body used as self.sp.run escapes. Make any import inside a class body a dynamic entry, or resolve an Attribute call on self or cls.
- **os.startfile and other process starters are not in is_process()** (skills/sdlc/test/push_guard.py): Open since r2. Add os.startfile, or ban every os.* call outside a short allowed list.
- **Dangling symlink or unreadable file crashes push_guard.py** (skills/sdlc/test/push_guard.py): main() catches SyntaxError, UnicodeDecodeError and ValueError only. OSError gives a traceback and exit 1. The test fails closed, but the spec says a symlink is opaque.
- **Sets de-duplicate an identical second call** (skills/sdlc/test/push_guard.py): pushes, direct and opaque are sorted sets. A second identical push line in the same function leaves every key equal. This is S1 territory.
- **Indentation is not part of the body pin** (skills/sdlc/test/push_guard.py): body_text() drops INDENT, DEDENT and NEWLINE tokens. Moving a statement out of an if block keeps the pin. No push results because callers supply the verb. Seed only.
- **Store of a wrapper name is not recorded** (skills/sdlc/test/push_guard.py): git = lambda ... or run = _other leaves every pin equal. A new process call in the target still changes direct. Seed only (S1).
- **testkit: no Python 3.11 or 3.12 on this host** (skills/sdlc/test/testkit/README.md): The body_text f-string and t-string parity claim was tested on 3.14.7 only.
