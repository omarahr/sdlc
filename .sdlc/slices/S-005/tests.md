# S-005 tests (re-plan, revision 3)

## Tests
- T-R-008a "name takes the format from the flag, then the config, then the default" and "the state tail is the current UTC time" (branches.test.mjs, existing) — R-008 — passes now: the state tail exists since S-003. The plan adds no new test for this.
- T-R-008b "an explicit state ts is used as given under a prefixed format, and an empty ts generates one" (branches.test.mjs) — R-008 — passes now (characterization): it pins the explicit ts and the empty ts through the Python API.
- T-R-009a "name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds" (branches.test.mjs, verify rows) — R-009 — fails: exit 2 with "no branch name is defined for kind 'verify'".
- T-R-009b "tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part" (branches.test.mjs, verify keys) and "name for the run, milestone, e2e, verify and attempt kinds follows a prefixed and a lowercased format" (verify_lower) — R-009 — fails: tail("verify") raises "no branch name is defined for kind 'verify'".
- T-R-009c "name without a required part exits 2 with one JSON error and no traceback" (row "verify without --profile") — R-009 — fails: the error names the kind, not the part "profile".
- T-R-010a same name test as T-R-009a (attempt rows) — R-010 — fails: exit 2 with "no branch name is defined for kind 'attempt'".
- T-R-010b same tail test and same format test as T-R-009b (attempt keys, attempt_lower) — R-010 — fails: tail("attempt") raises "no branch name is defined for kind 'attempt'".
- T-R-010c same missing-part test as T-R-009c (row "attempt without --n") — R-010 — fails: the error names the kind, not the part "n".
- T-R-119a "every process and network call in the scripts sits at a pinned site" (push-guard.test.mjs) — R-119 — passes now (guard): the current scripts match the pins.
- T-R-119b "every wrapper call gives a constant verb, and only the three reviewed calls push" (push-guard.test.mjs) — R-119 — passes now (guard).
- T-R-119c "the loop script has no process or network access" (push-guard.test.mjs) — R-119 — passes now (guard).
- T-R-119d "the loop gives its verify branch builder only to the profile agent and the collector" (push-guard.test.mjs) — R-119 — passes now (guard).
- T-R-119e "each known push and pull-request form fails the guard" (push-guard.test.mjs) — R-119 — passes now (guard): every mutant from rounds 0 to 2 and every new form breaks a pin or adds a violation. The unmutated copy matches the pins.
- T-R-119e (promoted, fix round 1): the mutant table now holds the TC-cli-40 to TC-cli-44 forms from .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs. These are five module rebinds, two posix calls, a unicode_escape cookie, a urllib.request rebind, an _socket import and three escaped loop identifiers. File: skills/sdlc/test/push-guard.test.mjs.
- T-R-119e (promoted, fix round 2): the mutant table now holds the TC-cli-55 to TC-cli-58 forms from .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs and the TC-security-1 to 4, 7, 8 and 15 forms from .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs. TC-security-5 and 6 duplicate TC-cli-58, so they are not added twice. T-R-119a now pins the `imports` key. File: skills/sdlc/test/push-guard.test.mjs.
- T-R-119e2 "a spec-required forge read changes only a pin and hits no ban" (push-guard.test.mjs) — R-119 — passes now (guard): the S-013 read shape changes only the direct, forge and wrapper-verb pins.

R-093 has no test in this slice. ADR-20261009-062918-decision-judge-S-005-7fbd moves it to S-027.

The guard scanner is `skills/sdlc/test/push_guard.py`. It is test code. The implementer adds only the two `TAILS` rows to `skills/sdlc/branches.py`.

## R-119 scope (ADR-20261009-062930-decision-judge-S-005-388e)
Scanned files: every file under `skills/sdlc` and `hooks`, except the directories `test`, `fixtures`, `prompts`, `__pycache__` and `node_modules`. A scanned file must end in `.py`, `.js`, `.json`, `.md` or `.html`. The test pins the exact list of `*.py` and `*.js` files. A new script file of another type fails the test.

The check covers these forms in Python scripts:
- Any call to `subprocess.*`, `os.system`, `os.popen`, `os.exec*`, `os.spawn*`, `os.posix_spawn*`, `os.fork*`, `pty.*`, `asyncio.create_subprocess_*`, under any import alias.
- Any import of `ctypes`, `multiprocessing`, `pty`, `socket`, `ssl`, `http.client`, `urllib.request`, `requests`, `httpx`, `asyncio`.
- Any call to `urllib.request.*`, `http.client.*` or `socket.*`.
- Any call to `eval`, `exec`, `compile`, `__import__`, `importlib.*`, `getattr` or `setattr` with a process or network module as the first argument, and any `globals()` or `vars()` subscript call.
- A push through a pinned wrapper or a direct site, a gh or glab call that creates a pull request or merge request, or a `gh api` or `glab api` call that writes. Any spelling of the constant arguments counts: either quote, split lines, options before the verb, implicit concatenation, or a `+` of two string constants.
- A verb, program or option before the verb that is not a constant string. The call is then opaque. An opaque call is a violation.
- The forge rule for gh and glab calls. The scanner records each call as `(file, enclosing function, program, verb, constant path prefix)`, and the test pins that set. Reads are allowed. These forms are violations: the verbs `pr create` and `mr create`; `-X` or `--method` with a value other than `GET` or a value that is not constant; any of `-f`, `-F`, `--field`, `--raw-field` or `--input`; an `api` path whose constant parts hold `pulls`, `merge_requests` or `graphql`. An `api` path with no constant prefix is opaque.
- The graphql ban (ADR-20261009-063408-decision-judge-S-005-368d). Every `gh api` or `glab api` call whose constant path holds `graphql` is a violation, with or without flags. A later graphql read needs an ADR that lifts the ban for one pinned `(file, function)` site and adds a query-only test case.
- A pinned wrapper name used as a value, not called.
- A `shell=True` call, or a direct process call whose argv is not a literal, outside the pinned wrapper bodies.

The check covers these forms in `sdlc-loop.js`: any use of a banned identifier, in code or in strings. The banned identifiers are `require`, `import`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `child_process`, `process`, `globalThis`, `global`, `eval`, `Function`, `Deno`, `Bun`, `navigator`, `Worker`, `exec`, `execSync`, `execFile`, `execFileSync`, `spawn`, `spawnSync` and `fork`.

One allowlist applies. The exact single-quoted literal `'global'` is allowed. The test pins the three `decisionPanel` lines that hold it. A fourth `'global'` literal changes the pin. A bare `global`, `global.x`, `global[...]` or `"global"` still fails.

## Refutation rule (ADR-20261009-062930-decision-judge-S-005-388e)
- A verifier refutes R-119 only with a literal form in a scanned file. The form must be inside the covered scope above. It must leave the `push_guard.py` output equal to the pins.
- A new form that is in neither list is covered when it is a process call or a network call in a scanned file. Such a form refutes R-119 when the output stays equal to the pins.
- Any other new form is a seed.
- The seeds S1 to S5 are never refutations. The verifier records each seed that it finds in its report.

## Seeds
- S1. Data flow into a pinned site, for example a rebind of `run` before the reviewed run-branch push in `state-write.py`.
- S2. Repository or environment state that changes what a constant git verb does: a git alias or hook in `.git/config`, `GIT_*` variables, a `.gitconfig` file.
- S3. A loader reached through attribute walks the scanner does not name: `this` in `sdlc-loop.js`, `().__class__.__base__.__subclasses__()`, `sys.modules[...]`, `builtins` access.
- S4. Agents and prompts. R-119 covers the scripts, not agent prose. S-027 owns the prompt text.
- S5. Code outside the scanned file set: the `test`, `fixtures` and `prompts` directories, and tools outside the plugin.
