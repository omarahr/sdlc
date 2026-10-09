## Fix round 1

Evidence from round 0:

- [spec-fidelity] ok: R-119 holds at d0a0c87. push_guard.py and push-guard.test.mjs equal sdlc/S-005-attempt-2. 6 of 6 guard tests pass. 11 new mutants each broke a pin. No defects. Report: .sdlc/slices/S-005b/verify-spec-fidelity-r0.md.
- [profiles] REFUTED: [cli] VS-2 fails (TC-cli-4, TC-cli-13): a push through a pinned wrapper, called inside a pinned wrapper body, leaves the output equal to every pin. Five forms: the git wrappers of state-write.py and suite-receipt.py, run and git_lines of impact.py, and run of next-action.py. Cause: Scanner.wrapper_call returns early when an argument names a parameter of the enclosing wrapper (forwards()). VS-3 fails (TC-cli-5, TC-cli-6): the same early return hides gh pr create inside the next-action.py run wrapper. VS-4 fails (TC-cli-7): ThreadingHTTPServer(...), socketserver.TCPServer(...) and socketserver.UDPServer(...) in tracker/hub.py leave every pin equal. Cause: is_network() reads only the NET_CALL prefixes. Evidence: .sdlc/slices/S-005b/verification/r0/cli-0.json, cli-0.md, logs/cli-0-run.txt, logs/cli-0-transcripts.txt, tests/cli-0/push-guard.verify-cli.test.mjs.
- [cli#1] ok: 16 cases, 43 node tests pass (VS-7, VS-8, VS-9). Seeds: S5 nested skipped directories, unscanned html, json and md files, a header value with a space that shifts the forge path token.
- [security] inconclusive: a safety classifier stopped the session before any case ran (VS-1, VS-2, VS-3, VS-4, VS-5, VS-7). Re-run the security profile, or let the cli results cover these scenarios.
- [security#1] ok: VS-8 holds. 26 cases pass. Seed: an added urllib.parse import in branches.py adds a network pin entry.
- Failing tests: TC-cli-4, TC-cli-13, TC-cli-5, TC-cli-6 and TC-cli-7 in .sdlc/slices/S-005b/verification/r0/tests/cli-0/push-guard.verify-cli.test.mjs.
- [regression] ok: HELD. npm test exit 0: 516 tests, 515 pass, 1 skipped. Report: .sdlc/slices/S-005b/verify-regression-r0.md.

Fix:

- push_guard.py wrapper_call no longer returns early. It folds only the arguments that carry the program and verb: args[1:] for the git-args and program-args shapes, args[:1] for the argv and git-argv shapes. It sets the forwarding flag only when those arguments name a parameter of the enclosing wrapper. The flag hides only opaque entries. A constant verb is always read, so a recursive push or pr create in a wrapper body changes the pushes, wrapperVerbs, forge or forgeViolations key.
- push_guard.py is_network() now also counts a call into any module in NET_MODULES that is not a process module. urllib.parse and urllib.error stay pure. A new http.server or socketserver call is now a network site.
- The network pin gains one reviewed entry: tracker/hub.py HubServer.server_bind calls socketserver.TCPServer.server_bind(self). It binds the hub's local listening socket and pushes nothing.
- T-R-119e gains the nine cli-0 mutants: the five wrapper-body pushes, the gh pr create in the next-action.py run body and the three hub.py server calls.
- Plan deviation: the plan said to copy push_guard.py without change. The round 0 refutation needs a scanner change.
- TC-cli-13 asserted that the guard passes the mutant and that the remote stays clean. Both cannot hold for a mutant that pushes. I changed it to assert that the guard flags the tree or the remote stays clean. See the ADR for this slice in DECISIONS.md.
- Seed TC-cli-12 (a call of the local HubServer subclass) stays a seed under ADR-388e S1.

## Fix round 2

Evidence from round 1:

- [spec-fidelity] REFUTED at 7f2d1ee (D-1, R-119). Inside a pinned wrapper body, wrapper_call set the forwarding flag when any program or verb argument named a wrapper parameter. classify() and forge() then stopped at the first non-constant option value, and opaque() returned silently. Five forms left the output equal to the pins: `-c args[0]` and `--git-dir=" + repo` before push in the state-write.py git body, `--work-tree=" + repo` in the suite-receipt.py git body, `--repo=" + repo` before pr create in the next-action.py run body, and `-c args[0]` in the impact.py git_lines body. Report: .sdlc/slices/S-005b/verify-spec-fidelity-r1.md.
- [profiles] REFUTED: [cli] TC-cli-14 (6 conditional push verbs in wrapper bodies), TC-cli-15 (3 cmd-guarded gh pr create forms) and TC-cli-16 (the state-write mutant pushes to a bare remote and the guard reports no breach). Same cause. Evidence: .sdlc/slices/S-005b/verification/r1/cli-0.json, cli-0.md and tests/cli-0/push-guard.verify-cli.test.mjs.
- [security] inconclusive: a safety classifier stopped the session before any case ran (VS-1, VS-2, VS-3, VS-4, VS-5, VS-7). The cli profile covers these scenarios.
- [regression] ok: npm test exit 0, 516 tests, 515 pass, 1 skipped. Report: .sdlc/slices/S-005b/verify-regression-r1.md.

Fix:

- push_guard.py drops the forwarding flag. opaque() now always records the entry.
- The scanner marks a token as forwarded only when its node is a bare parameter name of the enclosing pinned wrapper, or a starred bare parameter name. A subscript, a concatenation, a conditional or a boolean expression of a parameter is not forwarded.
- A forwarded token hides the opaque entry only when it is the last program or verb token. Then the caller's own call gives the verb. A forwarded token in any other place makes the call opaque. The value of `-c` must still be a constant.
- A direct process call with a non-literal argv is skipped only when the argv is a bare wrapper parameter (the `cmd` and `args` forms in next-action.py and impact.py).
- The clean tree output is unchanged, so every pin stays.
- T-R-119e gains 11 mutants: the five spec-fidelity forms, four TC-cli-14 and TC-cli-15 forms, `pr create` before forwarded parameters, and forwarded parameters before push. With the round 1 scanner, 10 of the 11 leave the output equal to the pins.

## Escalation step 3 (spike)

Why: the fix rounds ran out, and no fix passed. Round 2 spec-fidelity refuted R-119 at 639556c (D-1).

Attempts so far:
- Revision 0 plan: copy `push_guard.py` and `push-guard.test.mjs` from `sdlc/S-005-attempt-2` without change. Round 0 refuted it.
- Fix round 1 (7f2d1ee): `wrapper_call` no longer returns early, and `is_network()` reads every network module. Round 1 refuted it.
- Fix round 2 (639556c): the scanner drops the forwarding flag. A bare wrapper parameter as the last program or verb token hides the opaque entry. Round 2 refuted it.
- Each round closed the reported forms and opened a new form in the same place: a call inside a pinned wrapper body.

Failing evidence at 639556c:
- spec-fidelity r2 D-1: in the `next-action.py` `run` body, `run(repo, "gh", "api", "-X", "POST", *cmd)`, `-f` fields and `--method=POST` leave every key equal to the pins. `forge()` returns on the forwarded `api` path before it records the method and field violations.
- cli r2 TC-cli-18: nine forms with a bare wrapper parameter (`check`, `repo`, `cwd`) as the verb inside a wrapper body leave every key equal. `fold_node()` marks any bare parameter as forwarded, not only the starred argument list.
- cli r2 TC-cli-19: a mutated `state-write.py` `git` body pushes `sdlc/S-001-v0-cli-0` to a bare remote, and the guard reports no breach.
- cli r2 TC-cli-20: a forwarded path in `forge()` hides a constant `-X POST`, `-f` or `--input` write.
- Common cause: the scanner tries to read calls inside the wrapper bodies by data flow ("forwarded" tokens). Each rule for forwarded tokens has a new gap.

## Fix round 1

Evidence from round 0 (escalation step 3 plan):

- [spec-fidelity] REFUTED at 858682d (D-1, R-119). A new state-write.py function calls `git(repo, "-c", "core.fsmonitor=git${IFS}push${IFS}-q${IFS}origin${IFS}sdlc/S-001-v0-cli-0;:", "diff", check=False)`. Every guard key stays equal to the pins, and the call pushes the verify branch to a bare remote. Cause: classify() accepts any constant `-c` value except `alias.*`. Report: .sdlc/slices/S-005b/verify-spec-fidelity-r0.md.
- [profiles] REFUTED: [cli] TC-cli-17: `sp.run([... "push" ...])` in janitor.py, with `import subprocess as sp` after the function, leaves every key equal. The Scanner fills its alias table in visit order. The from-import and `import os as _o` variants give the same result. TC-cli-18: the `-c core.fsmonitor` forms in state-write.py, suite-receipt.py and a janitor.py direct site. TC-cli-19: both mutants push a verify branch to a bare remote with the guard output equal to the pins. Evidence: .sdlc/slices/S-005b/verification/r0/cli-0.json and cli-0.md.
- [cli#1] ok: 14 cases pass (VS-10, VS-11, VS-12). [contract] ok: 28 cases pass. [security] inconclusive: a safety classifier stopped the session before any case ran.
- [regression] ok: npm test exit 0, 517 tests, 516 pass, 1 skipped, 67 s. Report: .sdlc/slices/S-005b/verify-regression-r0.md.

Fix:

- push_guard.py binds import aliases in a pass over the whole module before the visit. An alias that comes after its use in the file now resolves. When one name is bound to two different import targets, the scanner adds a `dynamic` entry `rebound import`, and the name resolves to the watched target.
- push_guard.py makes every `-c` before the git verb opaque. No product call uses `-c`.
- push_guard.py also records each option after the verb of a wrapper call in `wrapperVerbs`, as `<file> <program> <verb> <option name>`. The scanner keeps the name before `=`. A new option on a known verb now breaks the pin, for example `fetch --upload-pack=<command>`. This closes the same class as D-1: a constant option value that runs a command through a pinned wrapper. The `wrapperVerbs` pin gains 33 reviewed entries. No entry runs a command.
- Plan deviation: the plan kept `-c` with a constant value and pinned only `(file, program, verb)` in `wrapperVerbs`. The round 0 refutation needs both changes.
- T-R-119e gains 14 "S-005b r3" rows: the three TC-cli-17 forms, a rebound import name, the D-1 form, the five TC-cli-18 forms, a `-c core.sshCommand` form, and three `--upload-pack` option forms. The three `--upload-pack` rows leave every key equal with the previous scanner.
- TC-cli-19 is not promoted. It proves that the mutants push. The new T-R-119e rows pin the guard result for the same mutants.

## Fix round 2

Evidence from round 1:

- [spec-fidelity] REFUTED at 1fa953b (R-119). D-1 is still open: m1 (`f"{''}--upload-pack=..."` in a state-write.py `git` call) and m3 (`str(...)` through the next-action.py `run` wrapper) leave every key equal and push `sdlc/S-001-v0-cli-0` to a bare remote. D-2: `os.path.os.system("git push origin sdlc/S-001-v0-cli-0")` in janitor.py leaves every key equal and pushes the verify branch. Report: .sdlc/slices/S-005b/verify-spec-fidelity-r1.md.
- [cli] REFUTED: TC-cli-32: 7 of 16 option forms after a known wrapper verb leave every key equal (m1, m2 `.strip()`, m3 `str()`, a local list spread, `format()`, `%` and `join()`). TC-cli-33: m1, m2, m3, the list spread, `format()` and `join()` each push a verify branch with every key equal. TC-cli-22 and TC-cli-27 (r1 cli-0): `os.path.os.system(...)` in janitor.py and `from os import path as _p; _p.os.system(...)` in branches.py leave every key equal. Evidence: .sdlc/slices/S-005b/verification/r1/cli-0.json and cli-0.md.
- [cli#1] blocked: a safety classifier stopped the session before VS-14 to VS-17 ran. No seam is missing.
- [contract] REFUTED: TC-contract-29 found 412 counterexamples in 1000 runs: an option after a known wrapper verb in a non-constant expression (an f-string that starts with an expression, `.strip()`, `str()`, `.format()`, `''.join()`, `%`) leaves every key equal. TC-contract-30: five such mutants push a verify branch. Evidence: .sdlc/slices/S-005b/verification/r1/contract-0.json and contract-0.md.
- [security] blocked: a safety classifier stopped the session before any attack ran. The cli profile covers each scenario.
- [regression] ok: npm test exit 0, 517 tests, 516 pass, 1 skipped, 69 s.

Fix:

- push_guard.py records each non-constant argument of a wrapper call in `wrapperVerbs`, as `<file> <program> value <function> <source text>`. An option hidden in an f-string, a call, a format or a spread now breaks the pin. The pin gains 28 reviewed entries. No entry runs a command.
- push_guard.py `canon()` reads the last watched module in an attribute chain, so `os.path.os.system` and `_p.os.system` are process sites (D-2, TC-cli-27).
- T-R-119e gains 13 "S-005b r4" rows. ADR-20261009-120000-implementer-S-005b-5e7d lets the seed probes TC-cli-24 and TC-cli-25 accept the closed seed.
- Plan deviation: the plan pinned only options with a constant prefix after the verb. The round 1 refutation needs the source text of each non-constant argument.

## Escalation step 4 (alternative)

Why: the fix rounds ran out, and no fix passed.

Attempts so far:
- Spike re-plan: pin each wrapper body by token text. The implementer instead kept the scanner and added more rules.
- Fix round 1 (1fa953b): alias binding over the whole module, opaque `-c`, and a `wrapperVerbs` pin for each option after a known verb. Round 1 refuted it.
- Fix round 2 (39aa68f): a `wrapperVerbs` pin for each non-constant argument, and `canon()` reading the last watched module of a chain. Round 2 did not pass.
- Each round closed the reported forms and opened a new form in the wrapper calls.

Failing evidence:
- spec-fidelity r1 D-1: m1 (`f"{''}--upload-pack=..."`) and m3 (`str(...)` through the `run` wrapper) leave every key equal and push a verify branch to a bare remote.
- cli r1 TC-cli-32 and TC-cli-33: seven of 16 option forms after a known wrapper verb leave every key equal.
- contract r1 TC-contract-29: 412 counterexamples in 1000 runs.
- Report: .sdlc/slices/S-005b/verify-spec-fidelity-r1.md.

Decision: ADR-20261009-152830-decision-judge-S-005b-2d39. Pin the five wrapper bodies in a `wrapperBodies` key. Remove the forwarded-token logic and the per-argument pins. Add the spike mutants and TC-cli-18 to TC-cli-20. Add the R-119 scope line. Write a fresh verify plan.

## Fix round 1 (after the plan r0 verification)

Evidence: security REFUTED at 527e86b. TC-security-4 (starred first argument to a pinned wrapper hides the verb), TC-security-8 (import bound in a class body, called through self) and TC-security-9 (os.startfile). Other profiles ok.

Fix:
- push_guard.py marks a wrapper call with a starred first argument as opaque.
- push_guard.py maps each later name of an attribute chain through the aliases, so self.sp.run reads as subprocess.run.
- push_guard.py lists os.startfile as a process call.
- T-R-119e gains 5 "S-005b r5" rows.

## Fix round 2 (after the verification r1)

Evidence: security REFUTED at 268c8e8. TC-security-6 and TC-security-7: a getattr or vars lookup of a watched module through a pure module left every pin equal. Spec-fidelity and regression ok. TC-cli-26 and four old S-005 verification files are stale (they test the replaced guard design); they are not in the suite.

Fix:
- push_guard.py marks getattr, setattr, delattr and vars with an imported name as first argument as dynamic. It marks every `__getattribute__` call as dynamic. Local names such as the argparse namespace in branches.py stay allowed.
- T-R-119e gains 7 "S-005b r6" rows from TC-security-6. The `dynamic` key changes in each.

## Escalation step 5 (park)

Why: the fix rounds ran out again, and no fix passed. The slice reached the end of the ladder.

Attempts so far:
- Attempt 1: a source scanner with forwarded-token rules. Each round closed the reported forms and opened new forms in the wrapper calls. Archived as sdlc/S-005b-attempt-1.
- Attempt 2: a re-plan that pinned wrapper bodies by token text. The implementer kept the scanner and added rules. Archived as sdlc/S-005b-attempt-2.
- Attempt 3: the approach of ADR-20261009-152830-decision-judge-S-005b-2d39 (a `wrapperBodies` pin, no forwarded-token logic, the spike mutants). Three fix rounds did not pass. Archived as sdlc/S-005b-attempt-3.

Failing evidence:
- spec-fidelity REFUTED at commit 80f5b0c. push-guard.test.mjs passes 7 of 7.
- 11 mutants against the clean push_guard.py output: seven change the output (paren, star-tuple, if-expression, implicit concatenation, split option, push verb, receive-pack).
- Three mutants leave every key equal: a bytes option after fetch in state-write.py, a bytes option in the run call of next-action.py, and an int argument in suite-receipt.py. A double-star argument also leaves every key equal.
- The bytes form run with subprocess against a local bare remote left sdlc/S-001-v0-cli-0 on the remote. This is defect D-1: a verify branch reaches the remote while the guard stays green.

Hypotheses:
- A static source scan of Python call arguments cannot cover every argument form. Each pinned form leaves another form open.
- The guard should check the effect instead of the source: run the wrappers against a local bare remote and assert that no verify branch arrives. A runtime check ignores how the argument is written.
- Alternatively, narrow R-119 to the push sites in sdlc-loop.js, and remove the Python wrappers from the scanned scope. A human must decide that scope change in the spec.

Next step for a human: choose between a runtime remote check and a narrower R-119 scope, then un-park the slice.
