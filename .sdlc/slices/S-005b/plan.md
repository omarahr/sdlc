# S-005b plan: verify branches stay local: the push guard (revision 0, ladder step 4)

## Approach
This slice proves R-119: no script in the plugin pushes a verify branch or opens a pull request for one. No product code changes. The slice adds the source check only.
Start from `push_guard.py` and `push-guard.test.mjs` on `sdlc/S-005b-attempt-2` (83ed043), as ADR-20261009-152830-decision-judge-S-005b-2d39 decides. That branch already holds `body_text()`, the `wrapperBodies` key, the early returns in `direct()` and `wrapper_call()`, and no forwarded-token logic. Its `push_guard.py` on the current tree gives an empty `opaque` and an empty `forgeViolations`, and five `wrapperBodies` entries. Keep every mutant in T-R-119e. The work left is to check the branch against this plan, close any gap, write tests.md and run the suite.
Three fix rounds failed in one place: a call inside a pinned wrapper body. The scanner read such a call by data flow ("forwarded" tokens), and each rule left a new gap (spike.md, Cause).
The new approach does not read inside the five wrapper bodies. It pins the token text of each body in a new `wrapperBodies` key. Any change to a body, other than a comment or a blank line, breaks that pin, and a human reviews it.
Remove the forwarding logic. Outside a wrapper body, a non-constant program, verb, option or `api` path is always opaque. Inside a wrapper body, the scanner records the `direct` entry and classifies nothing.
The spike proved this on a scratch copy: the clean tree output is unchanged except for the new key, and the seven round 2 mutants each change `wrapperBodies`.
ADR-20261009-062930-decision-judge-S-005-388e (scope and refutation rule) and ADR-20261009-063408-decision-judge-S-005-368d (graphql ban) stay in force. The verify planner writes a fresh verification plan.

## Files
- create `skills/sdlc/test/push_guard.py`: start from `sdlc/S-005b-attempt-2`. The `ast` scanner. It takes a root directory and prints one JSON object with the keys `files`, `imports`, `direct`, `network`, `dynamic`, `wrapperBodies`, `wrapperVerbs`, `pushes`, `forge`, `forgeViolations`, `opaque`, `wrapperValues`, `jsHits` and `jsAllowed`. Changes against attempt 1:
  - add `body_text(source_lines, node)`: take the lines from the first decorator (or the `def` line) to `node.end_lineno`, remove the common indent with `textwrap.dedent`, run `tokenize.generate_tokens`, drop `COMMENT`, `NL`, `NEWLINE`, `INDENT`, `DEDENT` and `ENDMARKER`, and join the token strings with one space. Keep an f-string (and a t-string) as one token: from `FSTRING_START` (or `TSTRING_START`) to its matching end token, take the exact source slice. This gives the same text on Python 3.11 and on Python 3.12 and later.
  - `visit_FunctionDef`: when `node.name` is in the file's `WRAPPERS`, at any depth (module, class or nested), add `"<short> <qualified name> <body text>"` to `wrapperBodies`.
  - `wrapperBodies` is sorted but not de-duplicated, so a second identical `def` adds a second entry.
  - remove `is_forward()`, the `forwarded` token flag in `fold_node()`, and `unread()`. Each former `unread()` call becomes `opaque()`. Remove the forwarded checks in `classify()`, `forge()` and `direct()`.
  - `direct()`: inside a pinned wrapper body (`in_wrapper()` is not `None`), add the `direct` entry, then return.
  - `wrapper_call()`: inside a pinned wrapper body, return at once.
  - `Scanner` gets the source lines of the file, for `body_text`.
- create `skills/sdlc/test/push-guard.test.mjs`: start from `sdlc/S-005b-attempt-2`. Add the `wrapperBodies` pin, the new T-R-119e rows and T-R-119g (below). Remove nothing.
- rewrite `.sdlc/slices/S-005b/tests.md` (test-writer): map R-119 to the seven tests. Copy the "R-119 scope" section, the refutation rule and the seeds. Cite ADR-388e and ADR-368d. Drop the "Promoted in fix round" sections; the rows stay in T-R-119e.
- No product file changes. Do not touch `branches.py`, `branches.test.mjs`, `sdlc-loop.js`, the wrapper scripts or the prompts tests.

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

## Tests
All tests are in `skills/sdlc/test/push-guard.test.mjs` and map to R-119. Each test that runs Python skips with "python3 not installed" when `python3` is missing.
- `T-R-119a` ("every process and network call in the scripts sits at a pinned site"): run `push_guard.py` on the plugin root. Assert the exact list of 13 scanned `*.py` and `*.js` files, and that no scanned file has another extension. Assert the exact `imports`, `direct`, `network`, `dynamic` (empty) and new `wrapperBodies` pins. `wrapperBodies` holds exactly five entries, one per pinned wrapper, each with its full token text. Its failure message says "a wrapper body changed: review it for a verify push, then update the pin".
- `T-R-119b` ("every wrapper call gives a constant verb, and only the three reviewed calls push"): unchanged. `opaque`, `wrapperValues` and `forgeViolations` are empty; the `wrapperVerbs` set; exactly three pushes in `state-write.py`; `forge` holds only `next-action.py load_prs gh pr list`.
- `T-R-119c` ("the loop script has no process or network access"): unchanged.
- `T-R-119d` ("the loop gives its verify branch builder only to the profile agent and the collector"): unchanged.
- `T-R-119e` ("each known push and pull-request form fails the guard"): keep the non-vacuity check and every row from attempt 1 (95 rows and 2 tree mutants). Add these rows, each with the label prefix "S-005b r2". Each must break a pin; the body rows must change `wrapperBodies`:
  - spec-fidelity r2 D-1 m1 to m3: `run(repo, "gh", "api", "-X", "POST", *cmd)`, the `-f head=... -f base=main` form and the `--method=POST` form in the `next-action.py` `run` body.
  - cli r2 TC-cli-18, nine forms: `git(repo, check)`, `git(repo, "-c", "remote.origin.push=<refspec>", check)`, `git(repo, "--no-pager", check)` and `git(".", repo)` in the `state-write.py` `git` body; `git(".", "-c", "...", repo)` in the `suite-receipt.py` `git` body; `run(["git", repo], ".")` and `git_lines([repo], ".")` in the `impact.py` `git_lines` body; `run(["git", cwd], ".")` in the `impact.py` `run` body; `run(".", "git", repo)` in the `next-action.py` `run` body.
  - cli r2 TC-cli-20, seven forms in the `next-action.py` `run` body: `-X POST`, `--method=PATCH`, `-f ref=...` and `--input -` before `*cmd`; `run(".", "gh", "pr", repo)`; `run(".", "gh", "-R", "o/r", repo)`; `run(".", "gh", "api", repo)`.
  - new body forms: a nested `def` with a push inside the `state-write.py` `git` body; a decorator added to the `impact.py` `run` wrapper; a changed default (`check=False`) in the `state-write.py` `git` signature; a second module-level `def git(repo, *args):` with the same body appended to `suite-receipt.py` (it proves that the key is not de-duplicated); a class with a `def run(self, *cmd):` method appended to `next-action.py`.
  - outside-body forms: `git(repo, *extra)` in a new function of `state-write.py`, where `extra` is a local list, gives an `opaque` entry; `run(repo, "gh", "api", path)` in a new function of `next-action.py` gives an `opaque` entry.
- `T-R-119f` ("a spec-required forge read changes only a pin and hits no ban"): unchanged.
- `T-R-119g` (new, "a comment or a blank line in a wrapper body keeps every pin"): add a comment line and a blank line inside each of the five wrapper bodies of a scratch copy, and change the existing comment in the `impact.py` `git_lines` body. Assert that every key equals the clean output. This proves that the body pin breaks only on a code change, so a reviewer is not asked to update it for prose.

Test-writer note: the slice adds no product code, so T-R-119a to T-R-119d, T-R-119f and T-R-119g pass on the current tree once the scanner change lands. The red evidence is T-R-119e. Run the "S-005b r2" rows against the attempt 1 scanner (`git show sdlc/S-005b-attempt-1:skills/sdlc/test/push_guard.py`) and record in tests.md that the D-1, TC-cli-18 and TC-cli-20 rows leave every key equal there. Write the test file before the scanner change, so the new rows fail first.

## Steps
1. Restore the files from attempt 2: `git checkout sdlc/S-005b-attempt-2 -- skills/sdlc/test/push_guard.py skills/sdlc/test/push-guard.test.mjs skills/sdlc/test/testkit`. Read both files against this plan. List each item of Files and Tests that attempt 2 does not hold. Do steps 2 to 5 only for those items.
2. Test-writer: add the "S-005b r2" rows to T-R-119e, add T-R-119g, and add the `wrapperBodies` pin to `PINS` (leave the five token texts empty at first). Run `node --test skills/sdlc/test/push-guard.test.mjs` and record which tests fail.
3. In `push_guard.py`, add `body_text()` with the f-string rule and record `wrapperBodies` in `visit_FunctionDef`. Exclude `wrapperBodies` from the `sorted(set(...))` de-duplication in `main()`; sort it only.
4. Remove `is_forward()`, the `forwarded` flag in `fold_node()` and `unread()`. Replace each `unread(...)` call with `self.opaque(...)`. Remove the forwarded branches in `classify()` (program and last-verb checks), in `forge()` (the "forward" check) and in `direct()` (the `is_forward(argv)` skip).
5. Add the early returns: `direct()` adds its `direct` entry, then returns when `self.in_wrapper()` is not `None`. `wrapper_call()` returns at once in the same case.
6. Run `python3 skills/sdlc/test/push_guard.py .`. Confirm that every key except `wrapperBodies` equals the attempt 1 output on the clean tree, and that `opaque` and `forgeViolations` stay empty. Read the five `wrapperBodies` entries against the source. Check that no body pushes a verify branch. Then copy the five texts into the pin.
7. Run `node --test skills/sdlc/test/push-guard.test.mjs`. Expect 7 tests, 7 pass.
8. Write `.sdlc/slices/S-005b/tests.md` per the Files section, with the scope line for `wrapperBodies` and the red evidence from step 2.
9. Run `npm test` in the background per _common.md and confirm the whole suite passes.
10. The verify planner writes a fresh `.sdlc/slices/S-005b/verification/plan-r0.json` from this plan. The `verification/` files from attempt 1 rounds r0 to r2 are stale. Do not reuse them. The profiles test against the "R-119 scope" and the refutation rule. A verifier that adds a call inside a wrapper body must first check whether `wrapperBodies` changed; such a change is a guard hit, not a miss.

## Risks
- Python version drift in the body text. CI uses `python-version: '3.x'` (3.14 today); the local run is 3.14.7. Python 3.12 split f-strings into several tokens. Two of the five bodies (`state-write.py` `git` and `suite-receipt.py` `git`) hold f-strings. The source-slice rule in `body_text()` keeps them as one token, so the text is the same on 3.11 and on 3.12 and later. Do not use `ast.dump` or `ast.unparse`: their output changes between Python versions.
- A legitimate change to a wrapper body breaks the pin. This is intended: the failure message names the review step. S-021 to S-024 touch `next-action.py` and `state-write.py`. They must update the pin if they change a body.
- Removing the forwarding logic can flag a clean-tree call outside a body that passes a parameter as the verb. The spike found none: `opaque` stays empty. Step 6 checks this again.
- A wrapper body can call a helper outside the body (for example `impact.py` `git_lines` calls `run`). The scanner skips the call inside the body. The helper's own body is pinned, or its process calls are in the `direct` pin.
- Data flow from a caller into a pinned body stays seed S1 under ADR-388e. A non-constant verb outside a body is opaque, so only a literal verb reaches a body.
- Size: the two files are about 950 lines in the test tree (about 594 scanner, about 358 test), plus about 40 changed scanner lines and about 60 new test lines. This exceeds the 300-line guide. The slice came out of a split and has one requirement, so it does not return `tooBig`. Most lines are the reviewed attempt 1 code, and no product line changes.
- The verify planner might reuse the stale attempt 1 verification plans. Step 10 forbids that.

## Critique responses
- No critiques at revision 0.
- Slice note "Start from push_guard.py and push-guard.test.mjs on sdlc/S-005b-attempt-2": Approach and Step 1 restore attempt 2 and check it against this plan. Attempt 2 also keeps the `wrapperVerbs` pins and the `canon()` change of fix rounds 1 and 2; they stay, because they pin reviewed calls outside the bodies.
- Slice note "Re-plan from scratch with the simplest approach; read failures.md": the plan drops the data-flow rules that failed in rounds 0 to 2 and pins the five bodies instead (Approach, Steps 3 to 5).
- Slice note "Read spike.md: pin each wrapper body by its token text and remove the forwarding logic": Files and Steps 3 to 5 follow the spike's recommended approach. The plan adds one point the spike did not test: the f-string rule for Python 3.12 and later (Risks).
- Slice note "Start from push_guard.py and push-guard.test.mjs on sdlc/S-005b-attempt-1": Step 1 restores both files, and T-R-119e keeps every attempt 1 row.
- Slice note "Write a fresh verification plan; the attempt-1 verification files are stale": Step 10 and the last risk cover it.
