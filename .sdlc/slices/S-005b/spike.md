# S-005b spike: why the push guard fails in each fix round

Escalation step 3. Scratch branch `sdlc/S-005b-spike` was cut from `main` at 15720e4. It held the `push_guard.py` and `push-guard.test.mjs` files from `sdlc/S-005b-attempt-1` (639556c). The branch is deleted. Only this file is kept.

## Experiment 1: reproduce the round 2 failure
I added seven mutants, one at a time, to a scratch copy of `skills` and `hooks`. Each mutant puts a call inside a pinned wrapper body. I then compared every key of the `push_guard.py` output with the clean output.
- D-1 m1: `run(repo, 'gh', 'api', '-X', 'POST', *cmd)` in the `next-action.py` `run` body. Result: all keys equal.
- D-1 m2: `run(repo, 'gh', 'api', '-f', 'head=...', '-f', 'base=main', *cmd)` in the same body. Result: all keys equal.
- D-1 m3: `run(repo, 'gh', 'api', '--method=POST', *cmd)` in the same body. Result: all keys equal.
- TC-cli-18: `git(repo, '-c', 'remote.origin.push=...', check)` in the `state-write.py` `git` body. Result: all keys equal.
- TC-cli-18: `git('.', repo)` in the `state-write.py` `git` body. Result: all keys equal.
- TC-cli-18: `run(['git', cwd], '.')` in the `impact.py` `run` body. Result: all keys equal.
- TC-cli-18: `run('.', 'git', repo)` in the `next-action.py` `run` body. Result: all keys equal.

The failure is reproduced: 7 of 7 mutants leave every key equal to the pins. The guard tests still pass 6 of 6 on the clean tree.

## Cause
Every failure in rounds 0, 1 and 2 of S-005b is in one place: a call inside a pinned wrapper body. The scanner reads such a call by data flow. It marks a wrapper parameter as a "forwarded" token, and then it hides the opaque entry because "the caller gives the verb". Each fix round changed the rule for forwarded tokens. Each new rule left a new gap: a parameter other than the argument list, a forwarded `api` path in `forge()`, a conditional verb. A static scanner cannot decide data flow in general. So this rule race does not end.

The wrapper bodies are small and fixed. There are five: `state-write.py` `git`, `suite-receipt.py` `git`, `next-action.py` `run`, `impact.py` `run` and `impact.py` `git_lines`. They have 2 to 6 lines each. The scanner does not need to read inside them. It needs only to see that they did not change.

## Experiment 2: pin the wrapper bodies and remove the forwarding logic
I changed a scratch copy of `push_guard.py` in three places:
1. A new key `wrapperBodies` records one entry for each function whose name is in `WRAPPERS` for its file: the file, the name and a fingerprint of the function.
2. `is_forward()` always returns `False`. No token is forwarded anywhere.
3. `direct()` and `wrapper_call()` return early inside a pinned wrapper body, after `direct()` adds its `direct` entry. The body pin covers those calls.

Results:
- The clean tree output is equal to the old output, except for the new `wrapperBodies` key. `opaque` and `forgeViolations` stay empty. `pushes` holds the same three entries. `forge` holds only `next-action.py load_prs gh pr list`.
- The seven experiment 1 mutants each change `wrapperBodies`. 7 of 7 are caught.
- I added the `wrapperBodies` pin to `PINS` in `push-guard.test.mjs` and ran `node --test skills/sdlc/test/push-guard.test.mjs`. Result: 6 tests, 6 pass. T-R-119e still catches all 95 rows of its mutant table and the 2 tree mutants. T-R-119f still passes.
- A first variant made a wrapper call inside a wrapper body opaque. That flags the clean tree, because `impact.py` `git_lines` calls `run`. The body pin covers that call, so the final variant skips it.

## Experiment 3: a fingerprint that is the same on every Python version
CI runs `python-version: '3.x'` on Linux and macOS. The output of `ast.dump` changed in Python 3.13, so an `ast.dump` hash can differ between CI and a local run. I tested a token text instead. Read the function source lines, remove the indent, and run `tokenize`. Drop the `COMMENT`, `NL`, `NEWLINE`, `INDENT`, `DEDENT` and `ENDMARKER` tokens. Join the token strings with one space. For `impact.py` `git_lines` this gives one readable line:
`def git_lines ( args , repo ) : try : r = run ( [ "git" ] + args , repo ) except OSError : return None return r . stdout . splitlines ( ) if r . returncode == 0 else None`
- A change to a comment only gives the same text.
- A new call in the body gives a different text.
The token text is readable in the pin, and a reviewer can see the change in the test diff.

## Recommended approach
1. Start from `push_guard.py` and `push-guard.test.mjs` on `sdlc/S-005b-attempt-1` (639556c). Keep every mutant in T-R-119e.
2. Add the `wrapperBodies` key. Record each function in a scanned file whose name is in `WRAPPERS` for that file. Use the token text of experiment 3, not a hash. A second `def` with a wrapper name, or a method with that name, adds a second entry and breaks the pin.
3. Remove the forwarding logic: `is_forward()`, the `forwarded` token flag, `unread()`, and the forwarded checks in `classify()`, `forge()` and `direct()`. Outside a wrapper body, a non-constant program, verb, option or `api` path is opaque.
4. Inside a pinned wrapper body, `direct()` still adds its `direct` entry, then returns. `wrapper_call()` returns at once. Do not classify a call inside a wrapper body.
5. Pin `wrapperBodies` in T-R-119a. The failure message must say "a wrapper body changed: review it for a verify push, then update the pin".
6. Add the seven experiment 1 mutants and the round 2 forms TC-cli-18 to TC-cli-20 to T-R-119e. Each one must change `wrapperBodies`.
7. Add the R-119 scope line to tests.md: "A change to the token text of a pinned wrapper body breaks the `wrapperBodies` pin." This closes the "calls inside a wrapper body" class. It ends the race of new forwarded-token spellings.
8. The verify planner writes a fresh plan. The `verification/` files of `sdlc/S-005b-attempt-1` are stale.

## Open seeds
- S1 data flow from a caller into a pinned site stays a seed under ADR-20261009-062930-decision-judge-S-005-388e. An example is a variable verb passed to `git(repo, *args)` from outside the body. Outside a body, a non-constant verb is already opaque.
- The scanner skips calls inside a wrapper body. A process call added to a wrapper body still changes the `direct` pin and the `wrapperBodies` pin.
