# S-005b tests: verify branches stay local (the push guard)

All seven tests are in `skills/sdlc/test/push-guard.test.mjs`. The scanner is `skills/sdlc/test/push_guard.py`. The test file comes from `sdlc/S-005b-attempt-2` (83ed043), as ADR-20261009-152830-decision-judge-S-005b-2d39 decides. The scanner on this branch is the attempt 2 scanner without the `wrapperBodies` behavior: it has no `wrapperBodies` key and does not call `body_text()` in `visit_FunctionDef`. The implementer restores the full scanner from `sdlc/S-005b-attempt-2` (plan step 6).
Binding decisions: ADR-20261009-062930-decision-judge-S-005-388e (scope and refutation rule) and ADR-20261009-063408-decision-judge-S-005-368d (graphql ban).

## Tests
T-R-119a every process and network call in the scripts sits at a pinned site — R-119 — fails now: the attempt 1 scanner prints no `wrapperBodies` key, so the new five-entry pin is not met ("a wrapper body changed: review it for a verify push, then update the pin")
T-R-119b every wrapper call gives a constant verb, and only the three reviewed calls push — R-119 — characterization: passes now; fails on a new push, an opaque call, a wrapper value or a forge violation
T-R-119c the loop script has no process or network access — R-119 — characterization: passes now; fails on a banned identifier in `sdlc-loop.js`
T-R-119d the loop gives its verify branch builder only to the profile agent and the collector — R-119 — characterization: passes now; fails on a new `branch` reference in `verifyPhase`
T-R-119e each known push and pull-request form fails the guard — R-119 — fails now: the unmutated copy breaks the `wrapperBodies` pin, and 22 of the 26 new "S-005b r2" rows leave every attempt 1 key equal
T-R-119f a spec-required forge read changes only a pin and hits no ban — R-119 — fails now: the attempt 1 output has no `wrapperBodies` key, so each read also breaks that pin
T-R-119g a comment or a blank line in a wrapper body keeps every pin — R-119 — fails now: the attempt 1 output has no `wrapperBodies` key

## T-R-119e rows
T-R-119e keeps all 95 attempt 1 rows and the 2 tree mutants. It adds 26 rows with the label prefix "S-005b r2". A row with a fourth element must break that key:
- `wrapperBodies` (24 rows): D-1 m1 to m3, nine TC-cli-18 forms, seven TC-cli-20 forms, a nested `def`, a decorator, a changed default, a second identical `def git` in `suite-receipt.py` (it proves the key is not de-duplicated), and a class with a `run` method in `next-action.py`.
- `opaque` (2 rows): a local list spread into `git` and a parameter `api` path, each in a new function outside a wrapper body.

The `wrapperBodies` pin holds the five token texts that the plan's `body_text` rule gives on Python 3.14.7. I computed them with a scratch copy of that rule. The implementer must check them against the real scanner output (plan step 6).

## Red evidence
Run on this branch: `node --test skills/sdlc/test/push-guard.test.mjs` gives 7 tests, 3 pass, 4 fail.
- T-R-119a, T-R-119e, T-R-119f and T-R-119g fail now. Each failure is the missing `wrapperBodies` key ("the scanner output has no wrapperBodies key").
- T-R-119b, T-R-119c and T-R-119d are characterization tests and pass now.

I ran each "S-005b r2" row against the attempt 1 scanner, with the `wrapperBodies` pin removed:
- Every key stays equal for all three D-1 rows, all nine TC-cli-18 rows and all seven TC-cli-20 rows.
- Every key stays equal for the decorator, the changed default and the second identical `def git`.
- The nested `def` changes `pushes`. The class method changes `wrapperVerbs` and `pushes`. Both still fail T-R-119e now, because `wrapperBodies` does not change.
- The two outside-body rows change `opaque`. They pass now and pin the "no forwarded token" rule.

I also ran the T-R-119g comment and blank-line edits through the scratch `body_text` rule. The five token texts stay equal to the clean tree.

## R-119 scope
Scanned files: every file under `skills/sdlc` and `hooks`, except the directories `test`, `fixtures`, `prompts`, `__pycache__` and `node_modules`. A scanned file must have one of the extensions `py`, `js`, `json`, `md` or `html`. The test pins the exact list of 13 `*.py` and `*.js` files. A new script of another type (for example `*.sh`, `*.mjs`) fails the test. A symlink under the scanned tree is opaque.

The check covers these forms in Python scripts:
- Any call to `subprocess.*`, `os.system`, `os.popen`, `os.exec*`, `os.spawn*`, `os.posix_spawn*`, `os.fork*`, `pty.*` or `asyncio.create_subprocess_*`, under any import alias.
- Calls to `posix.*`, `nt.*`, `_posixsubprocess.*` and `_winapi.*` are process sites. Calls to `_socket.*` and `_ssl.*` are network sites.
- An import of a module outside the pinned pure list. The `imports` key lists each one, and T-R-119a pins it. A new import of `pydoc`, `logging.handlers`, `uuid` or `xml` changes the pin.
- An import of `posix`, `nt`, `runpy`, `code`, `codeop`, or any module whose name starts with `_` (except `__future__`) is a dynamic site.
- Any call to `urllib.request.*`, `http.client.*`, `socket.*`, `ssl.*` and the other network modules (the network sites).
- A process or network module, or a process or network API, used as a value, in any case: a rebind, a default parameter, a walrus, a list element, a subclass base. Only all-caps constants and the `Error`, `Exception`, `Expired` and `Warning` classes are skipped.
- Dynamic code: `eval`, `exec`, `compile`, `__import__`, `breakpoint` and `importlib.*`, called or used as a value; any reference to `globals`, `locals` or `__builtins__`; a `vars()` call with no argument.
- A private attribute (a name that starts with `_`) of an imported module.
- An attribute chain through a watched module, such as `shutil.os.system` or `branches.subprocess.run`, is read as the watched module call.
- A Python file with a source encoding other than UTF-8 is opaque.
- A push through a pinned wrapper or a direct site, in any spelling of the constant arguments: quoted with `'` or `"`, split over lines, with implicit string concatenation, or with a `+` of two string constants. `push_guard.py` folds these to tokens before it reads the verb.
- A verb, program or option before the verb that is not a constant string makes the call opaque. A git option before the verb other than `-C`, `-c` and five flag options makes the call opaque. A gh or glab option before the verb other than `-R` or `--repo` makes the call opaque. An opaque call is a violation.
- The forge rule for gh and glab calls, through a wrapper or at a direct site with a list-literal argv. Each call is recorded as `(file, enclosing function, program, verb, constant path prefix)`, and the test pins that set. Reads are allowed. These forms are violations: the verbs `pr create` and `mr create`; a `gh api` or `glab api` call with `-X` or `--method` set to a value other than `GET` (any case) or not a constant; a `gh api` or `glab api` call with `-f`, `-F`, `--field`, `--raw-field` or `--input`; an `api` call whose constant positionals hold `pulls`, `merge_requests` or `graphql`. An `api` path with no constant prefix is opaque.
- The graphql ban (ADR-368d): every `gh api` or `glab api` call whose constant path holds `graphql` is a forge violation, with or without flags. The scanner does not read the query text. A later graphql read needs an ADR that lifts the ban for one pinned `(file, function)` site and adds a query-only test case.
- A pinned wrapper name used as a value, not called.
- A change to the token text of a pinned wrapper body breaks the `wrapperBodies` pin. The pinned bodies are `state-write.py` `git`, `suite-receipt.py` `git`, `next-action.py` `run`, `impact.py` `run` and `impact.py` `git_lines`. A second `def`, a method or a nested function with a wrapper name in the same file adds an entry. A change to a decorator, a default value or the signature changes the text. A comment or a blank line does not. The scanner does not classify a call inside a pinned body; the body pin covers it. This closes the "calls inside a wrapper body" class.
- Outside a pinned wrapper body, every non-constant program, verb, option before the verb, or `api` path is opaque. No token is "forwarded".
- A `shell=True` call, or a direct process call whose argv is not a list literal, outside the pinned direct sites.

The check covers these forms in `sdlc-loop.js`: any use of a banned identifier, in code or in strings, after the scanner decodes `\uXXXX` and `\u{...}` escapes. The banned identifiers are `require`, `import`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `child_process`, `process`, `globalThis`, `global`, `eval`, `Function`, `Deno`, `Bun`, `navigator`, `Worker`, `exec`, `execSync`, `execFile`, `execFileSync`, `spawn`, `spawnSync` and `fork`. One allowlist applies: the exact single-quoted literal `'global'`. The scanner reports each one in `jsAllowed`, and the test pins the three `decisionPanel` lines.

Refutation rule (ADR-388e):
- A verifier refutes R-119 only with a literal form in a scanned file. The form must be inside the covered scope above. It must leave the `push_guard.py` output equal to the pins.
- A new form that is in neither list is covered when it is a process call or a network call in a scanned file. Such a form refutes R-119 when the output stays equal to the pins.
- Any other new form is a seed. The seeds S1 to S5 are never refutations. The verifier records each seed in its report.

These forms stay seeds:
- S1. Data flow into a pinned site, for example a rebind of the `run` variable before the reviewed run-branch push in `state-write.py`.
- S2. Repository or environment state that changes what a constant git verb does: a git alias, a hook, `GIT_*` variables, a `.gitconfig` file.
- S3. A loader reached through attribute walks the scanner does not name: `this` in `sdlc-loop.js`, `().__class__.__base__.__subclasses__()`, `sys.modules[...]`, a re-exported module the scanner does not watch, a JS constructor walk.
- S4. Agents and prompts. R-119 covers the scripts, not agent prose. S-027 owns the prompt text.
- S5. Code outside the scanned file set: `test`, `fixtures`, `prompts`, tools outside the plugin, and the commands in `hooks/hooks.json` (today they run only `hooks/live-poke.py`, which the scanner reads).
- S1 also covers data flow from a caller into a pinned wrapper, for example a variable verb passed to `git(repo, *args)`. Outside a body, a non-constant verb is already opaque.

## Implementer check (plan step 6)
The real scanner prints the same five `wrapperBodies` texts as the pin, on Python 3.14.7. Every other key equals the attempt 1 output on the clean tree. `opaque` and `forgeViolations` stay empty. No pinned body pushes a verify branch.

## Fix round 1 rows
T-R-119e gains 14 rows with the label prefix "S-005b r3". These come from the round 0 verifiers (spec-fidelity D-1, cli TC-cli-17 and TC-cli-18). Each row names the key it must break:
- `direct` (3 rows): an import alias bound after its use (`import subprocess as sp`, `from subprocess import run as _r`, `import os as _o`).
- `dynamic` (1 row): one name bound to `json` and to `subprocess` by two imports.
- `opaque` (7 rows): a `-c` option before the git verb (D-1, five TC-cli-18 forms, and `-c core.sshCommand`).
- `wrapperVerbs` (3 rows): a new `--upload-pack` option, or an abbreviated `--upl` option, after a known verb.

The `wrapperVerbs` pin now holds one entry per option after the verb of each wrapper call. The previous scanner leaves every key equal for the three `--upload-pack` rows. The verifier tests TC-cli-17 and TC-cli-18 failed on the previous scanner and pass now.

## Fix round 2 rows
T-R-119e gains 13 rows with the label prefix "S-005b r4". These come from the round 1 verifiers (spec-fidelity D-1 and D-2, cli TC-cli-27 and TC-cli-32, contract TC-contract-29). Each row names the key it must break:
- `wrapperVerbs` (9 rows): an option after a known verb in a non-constant expression. The forms are an f-string that starts with an expression (m1), `.strip()` (m2), `str()` (m3), a local list spread, `.format()`, `%`, `"".join()`, a `str()` option added to the reviewed fetch in `next-action.py` `decide`, and an f-string option after `gh pr list`.
- `direct` (4 rows): a process call through a submodule chain: `os.path.os.system`, `from os import path as _p` then `_p.os.system`, `shutil.os.system` and `tempfile.os.system` through an alias.

The `wrapperVerbs` pin now also holds one `value` entry for each non-constant argument of a wrapper call: `<file> <program> value <function> <source text>`. A new or changed non-constant argument breaks the pin. Data flow into an existing argument name stays seed S1.
`canon()` now reads the last watched module in a chain that has a name after it, so `os.path.os.system` reads as `os.system`.
Ten of the 13 rows leave every key equal with the previous scanner. The `shutil.os` and `tempfile.os` rows already broke `direct`. The `gh pr list` row broke `forge` but not `wrapperVerbs`. The `wrapperBodies` pin does not change. The clean-tree output is the same on Python 3.9.6, 3.12.14 and 3.14.7.
The r1 verifier tests TC-cli-32, TC-cli-33, TC-contract-29 and TC-contract-30 failed on the previous scanner and pass now. TC-cli-33 and TC-contract-30 are not promoted: they prove that the mutants push, and the new T-R-119e rows pin the guard result for the same mutants.

## Fix round 3 rows
T-R-119e gains 5 rows with the label prefix "S-005b r5". They come from the round 2 security verifier (TC-security-4, 8 and 9):
- `opaque` (3 rows): a starred first argument to a pinned wrapper in `state-write.py`, `suite-receipt.py` and `next-action.py`.
- `direct` (2 rows): an import bound in a class body and called through `self`, and `os.startfile`.

push_guard.py now marks a starred first argument of a wrapper call as opaque. It reads a name bound by an alias after the first name of a chain, so `self.sp.run` reads as `subprocess.run`. It lists `os.startfile` as a process call.
All five rows leave every key equal with the previous scanner.

## Fix round 2 rows
T-R-119e gains 7 rows with the label prefix "S-005b r6" (promoted from security TC-security-6 and TC-security-7, SD-01 to SD-07). Each row breaks the `dynamic` key. The previous scanner left every key equal for them.

## Fix round 2 rows
T-R-119e gains 7 rows with the label prefix "S-005b r6" (promoted from security TC-security-6 and TC-security-7, SD-01 to SD-07). Each row breaks the `dynamic` key. The previous scanner left every key equal for them.
