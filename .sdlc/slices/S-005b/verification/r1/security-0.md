# S-005b verification: security, part 0, round 1

- Slice: S-005b
- Profile: security
- Round: 1 (plan round 0)
- Commit: 268c8e8
- Scenarios: VS-4, VS-7
- Verdict: refuted. 6 cases: 4 pass, 2 fail.

## Environment

macOS Darwin 25.6, Python 3.14.7, Node 24; push_guard.py run on scratch copies of skills/sdlc and hooks at 268c8e8 (worktree sdlc/S-005b-v1-security-0); behavior case uses a local bare git remote only; plan-r0 scenarios VS-4 and VS-7

## Charter

- VS-4: explore a new function in each wrapper file with non-constant program, verb, option and api path to find a push or forge write that leaves every pin equal. Guarantee: R-119 scope, "Outside a pinned wrapper body, every non-constant program, verb, option before the verb, or api path is opaque".
- VS-7: explore aliases, values, attribute chains, imports and dynamic code to find a process or network call that leaves every pin equal. Guarantee: R-119 scope and ADR-20261009-062930-decision-judge-S-005-388e.

## Threat model boundary

Trusted: the reviewed scripts and the guard itself. Not trusted: a new literal form in a scanned file. Seeds S1 to S5 (data flow, git state, attribute walks to a loader, prompts, unscanned files) never refute. The guard is a static scanner, so a mutant never runs in the pin checks.

## TC-security-1 (VS-4): A non-constant or opaque form outside a wrapper body changes a pin

- Given: A scratch copy of skills/sdlc and hooks at 268c8e8. A new function in a wrapper file calls the wrapper with a local list spread, a parameter or f-string verb, a variable program, a non-constant -X value, a parameter api path, a variable -c or -C option, keyword and kwargs forms, a rebound wrapper name, a bytes verb, git.exe, env, sh -c and gh -R pr create.
- When: Run push_guard.py on each of 50 mutants (SA-01 to SA-50).
- Then: Each mutant changes at least one pin (opaque, wrapperValues, wrapperVerbs, pushes, direct, forgeViolations or wrapperBodies).
- Expected: 50 of 50 mutants change a pin
- Actual: 50 of 50 change a pin. No forwarded-token logic is left to hide a form.
- Result: pass
- Spec source: R-119 scope: "Outside a pinned wrapper body, every non-constant program, verb, option before the verb, or api path is opaque. No token is forwarded."; ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:229`
- Command: `VERIFY_REPO=<worktree at 268c8e8> node --test .sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

per-attack guard result: `.sdlc/slices/S-005b/verification/r1/logs/security-0-attacks.txt`

test run: `.sdlc/slices/S-005b/verification/r1/logs/security-0-run.txt`

## TC-security-2 (VS-7): A process, network or dynamic-code form reached by alias, value, attribute chain, import or dynamic code changes a pin

- Given: A scratch copy at 268c8e8. Mutants use import aliases bound in a function, from-import aliases, shutil.os.system, glob.os.system, branches.subprocess.run, tempfile._os, posix, nt, _posixsubprocess, _socket, _winapi, runpy, code, codeop, modules as values (rebind, default parameter, walrus, list, dict, lambda, decorator, base class), os.__dict__, vars(os), getattr on os, eval, exec, compile, __import__, importlib, globals, locals, vars(), __builtins__, builtins, breakpoint, urllib.request, http.client, socket, ctypes, os.popen, os.posix_spawnp, os.startfile, os.forkpty, pty, asyncio subprocess, shell=True, star import and module-level code.
- When: Run push_guard.py on each of 70 mutants (SB-01 to SB-65 and SC-07, SC-08).
- Then: Each mutant changes at least one pin.
- Expected: 70 of 70 change a pin
- Actual: 70 of 70 change a pin.
- Result: pass
- Spec source: R-119 scope (aliases, values, attribute chains through a watched module, private attributes, dynamic code, native modules); ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:234`
- Command: `VERIFY_REPO=<worktree at 268c8e8> node --test .sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

per-attack guard result: `.sdlc/slices/S-005b/verification/r1/logs/security-0-attacks.txt`

test run: `.sdlc/slices/S-005b/verification/r1/logs/security-0-run.txt`

## TC-security-4 (VS-7): The guard run has no side effect

- Given: A mutant whose module-level code would run os.system("touch <marker>") and write the marker file.
- When: Run push_guard.py on the mutant.
- Then: The guard flags the mutant and the marker file does not exist. The cli-runner tree diff of the mutant tree is empty.
- Expected: marker absent; tree unchanged
- Actual: marker absent; treeUnchanged true on every scan
- Result: pass
- Spec source: R-119 acceptance: a source check
- Test: `.sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:250`
- Command: `VERIFY_REPO=<worktree at 268c8e8> node --test .sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

marker file after the scan:

```
existsSync(MARKER) = false
treeUnchanged = true for all 130 scans
```

## TC-security-5 (VS-4): The clean tree equals every pin

- Given: A copy of skills/sdlc and hooks at 268c8e8.
- When: Run push_guard.py once.
- Then: No pin differs. opaque and forgeViolations are empty.
- Expected: no breach
- Actual: no breach
- Result: pass
- Spec source: R-119 scope; T-R-119a, T-R-119b
- Test: `.sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:272`
- Command: `VERIFY_REPO=<worktree at 268c8e8> node --test .sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

clean scan:

```
clean	NO PIN CHANGED (the log prints this for an empty breach list)
```

## TC-security-6 (VS-7): A getattr or vars lookup of a watched module through a pure module changes a pin

- Given: A scratch copy at 268c8e8. janitor.py already imports branches and shutil. branches re-exports subprocess and os. The mutant calls getattr(branches, "subprocess").run(["git", "push", "origin", b]).
- When: Run push_guard.py on 7 mutants (SD-01 to SD-07): getattr with a literal name, vars(branches)["subprocess"], getattr(shutil, "os").system, getattr with a variable name, object.__getattribute__, getattr(branches, "os").popen, getattr(hub, "http").client.
- Then: Each mutant changes a pin, as the attribute chain branches.subprocess.run does.
- Expected: 7 of 7 change a pin
- Actual: 0 of 7 change a pin. The getattr check reads only a base that is itself a watched module. A pure module such as branches is not watched. vars(x) with an argument is allowed.
- Result: fail
- Spec source: R-119 scope: "An attribute chain through a watched module, such as shutil.os.system or branches.subprocess.run, is read as the watched module call"; ADR-20261009-062930-decision-judge-S-005-388e: a new form in neither list is covered when it is a process or network call in a scanned file
- Test: `.sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:239`
- Command: `VERIFY_REPO=<worktree at 268c8e8> node --test .sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

SD-01 to SD-07:

```
SD-01 no pin changed
SD-02 no pin changed
SD-03 no pin changed
SD-04 no pin changed
SD-05 no pin changed
SD-06 no pin changed
SD-07 no pin changed
```

SD-01 source:

```
skills/sdlc/janitor.py: def _verify_sec(repo, b, slug, verb=None, extra=(), path=None, prog=None, method=None, cfg=None, d=None):
    return getattr(branches, "subprocess").run(["git", "push", "origin", b])
```

## TC-security-7 (VS-7): The getattr form pushes a verify branch to a bare remote while every pin is equal

- Given: The SD-01 mutant of janitor.py with "-C", repo added to the argv, and a local bare remote created by module-loader.
- When: Call janitor._verify_sec(repo, "sdlc/S-9-v1-security-0", "s") through module-loader. Run push_guard.py on the same tree.
- Then: The guard changes a pin or the remote gets no ref.
- Expected: guard hit or no ref on the remote
- Actual: The remote gains refs/heads/sdlc/S-9-v1-security-0 and the guard output equals every pin.
- Result: fail
- Spec source: R-119 acceptance: "A verify branch stays local" and a source check that finds no git push; ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs:260`
- Command: `VERIFY_REPO=<worktree at 268c8e8> node --test .sdlc/slices/S-005b/verification/r1/tests/security-0/push-guard.verify-security.test.mjs`

bare remote refs after the call:

```
behavior pins changed: [] pushed=true refsAdded=["refs/heads/sdlc/S-9-v1-security-0"]
```

## Attacks

One line per attack. Held means the guard changed a pin. Broke means all pins stayed equal. The full input of each attack is in the JSON file.

| id | scenario | result | observed |
|---|---|---|---|
| SA-01  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-02  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-03  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-04  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-05  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-06  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-07  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-08  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-09  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-10  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-11  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-12  | VS-4 | held | guard hit: opaque |
| SA-13  | VS-4 | held | guard hit: wrapperVerbs,forge,forgeViolations |
| SA-14  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-15  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-16  | VS-4 | held | guard hit: wrapperVerbs,pushes |
| SA-17  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-18  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-19  | VS-4 | held | guard hit: wrapperVerbs |
| SA-20  | VS-4 | held | guard hit: wrapperVerbs |
| SA-21  | VS-4 | held | guard hit: opaque |
| SA-22  | VS-4 | held | guard hit: opaque |
| SA-23  | VS-4 | held | guard hit: wrapperVerbs |
| SA-24  | VS-4 | held | guard hit: opaque |
| SA-25  | VS-4 | held | guard hit: wrapperVerbs |
| SA-26  | VS-4 | held | guard hit: wrapperValues |
| SA-27  | VS-4 | held | guard hit: wrapperValues |
| SA-28  | VS-4 | held | guard hit: wrapperValues |
| SA-29  | VS-4 | held | guard hit: wrapperValues |
| SA-30  | VS-4 | held | guard hit: wrapperValues |
| SA-31  | VS-4 | held | guard hit: dynamic |
| SA-32  | VS-4 | held | guard hit: wrapperValues |
| SA-33  | VS-4 | held | guard hit: opaque |
| SA-34  | VS-4 | held | guard hit: wrapperBodies |
| SA-35  | VS-4 | held | guard hit: wrapperVerbs |
| SA-36  | VS-4 | held | guard hit: wrapperVerbs |
| SA-37  | VS-4 | held | guard hit: wrapperVerbs |
| SA-38  | VS-4 | held | guard hit: wrapperVerbs,pushes |
| SA-39  | VS-4 | held | guard hit: wrapperVerbs |
| SA-40  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-41  | VS-4 | held | guard hit: opaque |
| SA-42  | VS-4 | held | guard hit: wrapperVerbs,opaque |
| SA-43  | VS-4 | held | guard hit: opaque |
| SA-44  | VS-4 | held | guard hit: wrapperVerbs |
| SA-45  | VS-4 | held | guard hit: wrapperVerbs,pushes |
| SA-46  | VS-4 | held | guard hit: wrapperVerbs,pushes |
| SA-47  | VS-4 | held | guard hit: wrapperVerbs,pushes |
| SA-48  | VS-4 | held | guard hit: wrapperVerbs |
| SA-49  | VS-4 | held | guard hit: wrapperVerbs |
| SA-50  | VS-4 | held | guard hit: wrapperVerbs,forge,forgeViolations |
| SB-01  | VS-7 | held | guard hit: direct,pushes |
| SB-02  | VS-7 | held | guard hit: direct,pushes |
| SB-03  | VS-7 | held | guard hit: direct,pushes |
| SB-04  | VS-7 | held | guard hit: direct,pushes |
| SB-05  | VS-7 | held | guard hit: direct,pushes |
| SB-06  | VS-7 | held | guard hit: direct,pushes |
| SB-07  | VS-7 | held | guard hit: dynamic |
| SB-08  | VS-7 | held | guard hit: imports,direct,dynamic,pushes |
| SB-09  | VS-7 | held | guard hit: imports,dynamic |
| SB-10  | VS-7 | held | guard hit: imports,dynamic |
| SB-11  | VS-7 | held | guard hit: imports,network,dynamic |
| SB-12  | VS-7 | held | guard hit: imports,dynamic |
| SB-13  | VS-7 | held | guard hit: imports,dynamic |
| SB-14  | VS-7 | held | guard hit: imports,dynamic |
| SB-15  | VS-7 | held | guard hit: imports,dynamic |
| SB-16  | VS-7 | held | guard hit: dynamic |
| SB-17  | VS-7 | held | guard hit: dynamic |
| SB-18  | VS-7 | held | guard hit: dynamic |
| SB-19  | VS-7 | held | guard hit: dynamic |
| SB-20  | VS-7 | held | guard hit: dynamic |
| SB-21  | VS-7 | held | guard hit: dynamic |
| SB-22  | VS-7 | held | guard hit: dynamic |
| SB-23  | VS-7 | held | guard hit: dynamic |
| SB-24  | VS-7 | held | guard hit: dynamic |
| SB-25  | VS-7 | held | guard hit: dynamic |
| SB-26  | VS-7 | held | guard hit: dynamic |
| SB-27  | VS-7 | held | guard hit: dynamic |
| SB-28  | VS-7 | held | guard hit: dynamic |
| SB-29  | VS-7 | held | guard hit: dynamic |
| SB-30  | VS-7 | held | guard hit: dynamic |
| SB-31  | VS-7 | held | guard hit: dynamic |
| SB-32  | VS-7 | held | guard hit: dynamic |
| SB-33  | VS-7 | held | guard hit: dynamic |
| SB-34  | VS-7 | held | guard hit: dynamic |
| SB-35  | VS-7 | held | guard hit: dynamic |
| SB-36  | VS-7 | held | guard hit: imports,dynamic |
| SB-37  | VS-7 | held | guard hit: dynamic |
| SB-38  | VS-7 | held | guard hit: dynamic |
| SB-39  | VS-7 | held | guard hit: dynamic |
| SB-40  | VS-7 | held | guard hit: dynamic |
| SB-41  | VS-7 | held | guard hit: dynamic |
| SB-42  | VS-7 | held | guard hit: imports |
| SB-43  | VS-7 | held | guard hit: dynamic |
| SB-44  | VS-7 | held | guard hit: imports,network |
| SB-45  | VS-7 | held | guard hit: direct,pushes |
| SB-46  | VS-7 | held | guard hit: imports,network |
| SB-47  | VS-7 | held | guard hit: imports,network |
| SB-48  | VS-7 | held | guard hit: imports,direct,network |
| SB-49  | VS-7 | held | guard hit: direct,pushes |
| SB-50  | VS-7 | held | guard hit: direct |
| SB-51  | VS-7 | held | guard hit: direct |
| SB-52  | VS-7 | held | guard hit: direct |
| SB-53  | VS-7 | held | guard hit: imports,direct,network,pushes |
| SB-54  | VS-7 | held | guard hit: imports,direct,network,pushes |
| SB-55  | VS-7 | held | guard hit: direct,pushes,opaque |
| SB-56  | VS-7 | held | guard hit: dynamic |
| SB-57  | VS-7 | held | guard hit: dynamic |
| SB-58  | VS-7 | held | guard hit: imports,direct,pushes |
| SB-59  | VS-7 | held | guard hit: dynamic |
| SB-61  | VS-7 | held | guard hit: direct,pushes |
| SB-62  | VS-7 | held | guard hit: dynamic |
| SB-63  | VS-7 | held | guard hit: direct,pushes |
| SB-64  | VS-7 | held | guard hit: network |
| SB-65  | VS-7 | held | guard hit: network |
| SB-60  | VS-7 | held | guard hit: direct,pushes |
| SD-01  | VS-7 | broke | no pin changed |
| SD-02  | VS-7 | broke | no pin changed |
| SD-03  | VS-7 | broke | no pin changed |
| SD-04  | VS-7 | broke | no pin changed |
| SD-05  | VS-7 | broke | no pin changed |
| SD-06  | VS-7 | broke | no pin changed |
| SD-07  | VS-7 | broke | no pin changed |
| SC-04  | VS-7 | out-of-scope | no pin changed |
| SC-05  | VS-7 | out-of-scope | no pin changed |
| SC-06  | VS-7 | out-of-scope | no pin changed |
| SC-07  | VS-7 | held | guard hit: dynamic |
| SC-09  | VS-7 | out-of-scope | no pin changed |
| SC-08  | VS-7 | held | guard hit: direct,pushes |

## Seeds

- S3: sys.modules lookup reaches any module: sys.modules["subprocess"].run([... push ...]) leaves every pin equal (SC-04). The plan names sys.modules[...] as seed S3. (`skills/sdlc/test/push_guard.py`)
- S3: subclasses walk: ().__class__.__base__.__subclasses__() leaves every pin equal (SC-05). Seed S3. (`skills/sdlc/test/push_guard.py`)
- S3: print.__self__ is the builtins module: print.__self__.__import__("os").system(...) leaves every pin equal (SC-09), because the private-attribute check needs a base name bound to an import. The walk matches seed S3 (attribute walk to a loader), not a literal named form. (`skills/sdlc/test/push_guard.py`)
- S3/S5: a re-exported network class under a pure module name: hub.ThreadingHTTPServer((...), hub.BaseHTTPRequestHandler) leaves every pin equal (SC-06). It opens a listening socket and is no egress. Recorded only. (`skills/sdlc/tracker/hub.py`)
- Guard design note for the SD forms: The SD-01 to SD-07 gap has one cause: the getattr and vars checks look at watched bases only. A fix is to treat getattr, setattr, delattr, vars and object.__getattribute__ with an imported-module first argument as dynamic, whatever the module. (`skills/sdlc/test/push_guard.py`)
