# S-005b verification plan, round 0

Risk: medium. A push form that the guard misses lets a verify branch reach the remote, but the slice adds only a test scanner and no product behavior.

Fresh plan for ladder step 4 (ADR-20261009-152830-decision-judge-S-005b-2d39): the scanner pins the five wrapper bodies in wrapperBodies and has no forwarded-token logic. The attempt-2 verification files are stale; this plan replaces them. Apply ADR-20261009-062930-decision-judge-S-005-388e (scope and refutation rule) and ADR-20261009-063408-decision-judge-S-005-368d (graphql ban). Seeds S1 to S5 are never refutations; record each in the report. The spec states no number, so limits is not tagged. The slice has no HTTP, async, data or UI boundary. Earlier rounds saw a safety classifier stop security sessions, so cli is tagged on every scenario that security covers. Keep earlier verification files as evidence.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A push or forge write added inside a pinned wrapper body fails the guard | R-119 | cli, security, contract |
| VS-2 | A changed wrapper definition (signature, default, decorator, duplicate, nested def or method) fails the guard | R-119 | cli, security, contract |
| VS-3 | A comment or a blank line in a wrapper body keeps every pin | R-119 | contract, cli |
| VS-4 | Outside a wrapper body, a non-constant program, verb, option or api path is opaque, and no token counts as forwarded | R-119 | cli, security |
| VS-5 | A new git push of a branch outside the wrapper bodies fails the guard in every covered spelling | R-119 | cli, security |
| VS-6 | A pull-request creation or other forge write fails the guard | R-119 | cli, security |
| VS-7 | A process or network call reached by an alias, a value, an attribute chain, an import or dynamic code fails the guard | R-119 | cli, security |
| VS-8 | The loop script gains no process or network access | R-119 | cli, security |
| VS-9 | The loop hands its verify branch builder only to the profile agent and the collector | R-119 | cli |
| VS-10 | A new script type, a symlink or a non-UTF-8 source in the scanned tree fails the guard | R-119 | cli, security |
| VS-11 | A spec-required forge read changes only a pin and hits no ban | R-119 | cli, security |
| VS-12 | A verify branch stays local when a push-capable script runs against a real bare remote | R-119 | cli |
| VS-13 | Each guard-miss mutant from every round changes a pin, and the clean tree shows no drift | R-119 | cli, contract |

## Scenario notes

- VS-1: Risk: a call inside one of the five bodies (state-write git, suite-receipt git, next-action run, impact run, impact git_lines) is not classified, so the body pin is the only guard. Try the forms of spec-fidelity r2 D-1 and cli r2 TC-cli-18 and TC-cli-20: -X POST, --method=PATCH, -f, --input, -c remote.origin.push, --no-pager, a verb or program that comes from a parameter. Every body edit must change wrapperBodies.
- VS-2: Risk: a second identical def, a nested def with a push, a class method named like a wrapper, a decorator or a changed default escapes the body pin. wrapperBodies is sorted and not de-duplicated, so a duplicate def adds an entry. Try Python 3.11 and 3.12+ f-string and t-string tokens.
- VS-3: The pin must break on code only. Add comments and blank lines inside each of the five bodies, change the existing comment in impact git_lines, vary indent and trailing whitespace, and use a comment that contains a quote or a hash. Every key must equal the clean output.
- VS-4: Risk: the forwarded-token logic is removed. A local list spread into git, a parameter api path, a variable verb passed to a wrapper and a rebind of a wrapper name must give an opaque entry or a wrapperValues entry. Data flow into a pinned site is seed S1.
- VS-5: Try quotes, split lines, implicit concatenation, a + of two constants, an option before the verb (-C, -c, five flag options, any other option opaque), a direct subprocess list-literal argv and shell=True. A push must change pushes, direct or opaque.
- VS-6: Try gh pr create, glab mr create, gh api with -X POST, --method, -f, -F, --field, --raw-field, --input, an api path with pulls or merge_requests, a path with no constant prefix, and every graphql form (ADR-368d bans graphql, with or without flags). A lowercase get method is allowed.
- VS-7: Try import aliases bound anywhere in a module, a watched module used as a value (rebind, default parameter, walrus, list element, base class), shutil.os.system, branches.subprocess.run, posix, nt, _posixsubprocess, _socket, imports of runpy and code, a private attribute of a module, eval, exec, compile, __import__, importlib, globals, locals and vars().
- VS-8: Try each banned identifier in sdlc-loop.js in code, in a string and as a \uXXXX or \u{...} escape. The only allowlist entry is the single-quoted 'global'. The three decisionPanel lines stay pinned. A constructor walk through this is seed S3.
- VS-9: Add a branch reference in verifyPhase and check that T-R-119d fails. The test reads sdlc-loop.js only.
- VS-10: Add a .sh or .mjs file, a symlink to a file and to a directory, a Python file with a latin-1 coding line, invalid UTF-8 and a NUL byte under skills/sdlc and hooks. The scanned list of 13 files is exact. The test, fixtures and prompts directories are outside the scan (seed S5).
- VS-11: The only reviewed forge call is next-action.py load_prs gh pr list. A new gh or glab read with a constant verb or api path must change forge and nothing in forgeViolations. A read with a graphql path must hit the ban.
- VS-12: Use module-loader with a bare remote. Create a verify branch and run the push-capable calls in state-write.py, janitor.py and the other scripts. Compare the remote refs before and after. A guard-flagged mutant may push; an unflagged one must not.
- VS-13: Replay the 95 attempt 1 rows, the 2 tree mutants and the 26 'S-005b r2' rows of T-R-119e. A mutant that leaves every key equal is a refutation. Run the scanner twice on the clean tree: the output must be byte-equal. Run it from a different cwd and with a symlinked root.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run push_guard.py and the push-capable scripts from a scratch cwd, record exit codes, stderr and the tree diff. | yes |
| module-loader | cli | Load a script by path, call one function and record the bare remote refs before and after. | yes |
| attack-corpus | security | Hostile values for argv, paths and format strings; decoy modules. | yes |
| property | contract | Seeded generators that call the scanner functions through pycall.py. | yes |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-119 | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-7, VS-8, VS-9, VS-10, VS-11, VS-12, VS-13 |
