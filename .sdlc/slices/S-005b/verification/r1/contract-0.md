# S-005b verify contract, part 0, round 1

Slice: S-005b. Profile: contract. Round: 1. Commit: 1fa953b (product e71f8c8). Verdict: refuted (32 of 34 cases pass; VS-13 fails).

## Environment

macOS, node --test, git 2.50.1, python 3.14.7 (homebrew), 3.12.14 (uv), 3.9.6 (/usr/bin); scratch copies of skills and hooks; module-loader with a local bare remote. Product commit e71f8c8.

## Surface

The surface listing is in `logs/contract-0-surface.txt`. The contract is the `push_guard.py` JSON output (14 keys) and `body_text`.

## TC-contract-1 (VS-1): A conditional verb added in the state-write.py git body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:50`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-2 (VS-1): A parameter rebind before the call in the state-write.py git body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:51`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-3 (VS-1): A try/finally push in the next-action.py run body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:52`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-4 (VS-1): A with block push in the impact.py run body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:53`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-5 (VS-1): A lambda push in the suite-receipt.py git body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:54`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-6 (VS-1): A comprehension push in the next-action.py run body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:55`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-7 (VS-1): A call to an outside helper from the impact.py git_lines body changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:56`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-8 (VS-2): A new decorator on suite-receipt.py git changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:57`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-9 (VS-2): A changed default check=False on state-write.py git changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:58`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-10 (VS-2): A new keyword-only parameter on state-write.py git changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:59`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-11 (VS-2): A return annotation on impact.py run changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:60`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-12 (VS-2): A duplicate module-level def run in impact.py changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:61`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-13 (VS-2): A nested def git in another state-write.py function changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:62`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-14 (VS-2): A class method run in next-action.py changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:63`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-15 (VS-2): An async def git in suite-receipt.py changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:64`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-16 (VS-2): A shadowing def git after the pinned one in state-write.py changes wrapperBodies

- Given: A scratch copy of skills and hooks at the slice commit 1fa953b.
- When: The edit is applied and push_guard.py scans the copy.
- Then: The wrapperBodies key differs from the clean output.
- Expected: wrapperBodies changes. Actual: wrapperBodies changes. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (wrapper body pin).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:65`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-17 (VS-2): A wrapper name rebound by a lambda, then a push call in a new function breaks another pin

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: imports, pushes, wrapperValues, opaque or direct differs from the clean output.
- Expected: another pin breaks. Actual: another pin breaks. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:76`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-18 (VS-2): A wrapper name bound by an import alias, then a push call in a new function breaks another pin

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: imports, pushes, wrapperValues, opaque or direct differs from the clean output.
- Expected: another pin breaks. Actual: another pin breaks. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:77`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-19 (VS-3): A comment line in each wrapper body keeps every key

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: Every output key equals the clean output.
- Expected: no key changes. Actual: no key changes. Result: pass.
- Spec source: plan R-119 scope (a comment or a blank line does not change the text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:98`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-20 (VS-3): A blank line and a trailing comment in each wrapper body keeps every key

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: Every output key equals the clean output.
- Expected: no key changes. Actual: no key changes. Result: pass.
- Spec source: plan R-119 scope (a comment or a blank line does not change the text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:98`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-21 (VS-3): A changed existing comment in impact.py git_lines keeps every key

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: Every output key equals the clean output.
- Expected: no key changes. Actual: no key changes. Result: pass.
- Spec source: plan R-119 scope (a comment or a blank line does not change the text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:98`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-22 (VS-3): A backslash continuation in the next-action.py run body keeps every key

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: Every output key equals the clean output.
- Expected: no key changes. Actual: no key changes. Result: pass.
- Spec source: plan R-119 scope (a comment or a blank line does not change the text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:98`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-23 (VS-3): CRLF line ends in all four wrapper files keeps every key

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: Every output key equals the clean output.
- Expected: no key changes. Actual: no key changes. Result: pass.
- Spec source: plan R-119 scope (a comment or a blank line does not change the text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:98`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-24 (VS-3): A tab indent in the impact.py run body keeps every key

- Given: A scratch copy of skills and hooks.
- When: The edit is applied and push_guard.py scans the copy.
- Then: Every output key equals the clean output.
- Expected: no key changes. Actual: no key changes. Result: pass.
- Spec source: plan R-119 scope (a comment or a blank line does not change the text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:98`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-25 (VS-3): A comment between decorators keeps the body text

- Given: Two copies with two decorators on impact.py run.
- When: One copy adds a comment and a blank line between the decorators.
- Then: wrapperBodies is equal in both copies.
- Expected: equal. Actual: equal. Result: pass.
- Spec source: plan R-119 scope.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:111`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-26 (VS-3): The clean output is equal on Python 3.14.7, 3.12.14 and 3.9.6

- Given: The slice tree.
- When: push_guard.py runs under each local python.
- Then: The full JSON output is equal, wrapperBodies included.
- Expected: equal on every version. Actual: equal on every version. Result: pass.
- Spec source: plan Risks (version drift in the body text).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:120`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-27 (VS-3): A re-quoted string changes the body text

- Given: The impact.py git_lines body.
- When: "git" is re-quoted as 'git'.
- Then: Only wrapperBodies changes.
- Expected: observation: a token-equal reformat breaks the pin. Actual: only wrapperBodies changes. Result: pass.
- Spec source: plan VS-3 notes (record the token-equal case).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:125`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

## TC-contract-28 (VS-3): body_text keeps its text under neutral edits and changes it under a code edit

- Given: The five pinned bodies.
- When: 1000 seeded runs apply 1 to 4 neutral edits (comment, blank, trailing comment, CRLF), then one code statement.
- Then: The neutral text equals the clean text, and the code edit changes it.
- Expected: 0 violations on each python. Actual: 0 violations on 3.14.7, 3.12.14 and 3.9.6. Result: pass.
- Spec source: plan R-119 scope.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs:130`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/push-guard.verify-contract.test.mjs`.

node test run, 28 of 28 pass (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run.txt
```

body_text property (property-run):

```
property: neutral edit keeps body_text, code edit changes it
seed=20261009 runs=1000 per python
3.14.7: 0 failures
3.12.14: 0 failures
3.9.6: 0 failures
kinds: blank 828, comment 553, trailing 403, crlf 501
shrunk counterexample: none
```

scanner surface listing (file-tree):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-surface.txt
```

## TC-contract-29 (VS-13): A literal option after a known wrapper verb, in any spelling, changes wrapperVerbs, opaque or pushes

- Given: state-write.py and next-action.py at 1fa953b, and a reference model from the VS-13 title: each option token after a wrapper verb is recorded or opaque.
- When: A seeded generator appends a new function with one wrapper call: a known verb, then an option (--upload-pack, --receive-pack, --exec, -u, --upl, --upload-p, --config) in 15 spellings; the scanner runs on the file.
- Then: wrapperVerbs, opaque or pushes differs from the clean scan of that file.
- Expected: 0 counterexamples among the literal spellings. Actual: 412 counterexamples in 1000 runs. Every f-string with a leading expression, .strip(), str(), .format(), join() and % spelling leaves every key equal. The plain constant, the two-token, the + of two constants and the whitespace-padded spellings are recorded.. Result: fail.
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new form that is a process call refutes when the output stays equal to the pins).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs:42`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs --test-name-pattern TC-contract-29`.

option spellings after a known verb (property-run):

```
seed 20261009, runs 1000, python 3.14.7 / 3.12.14 / 3.9.6: failures 412 on each
kinds (runs/hits): const 60/60, two-tokens 61/61, concat-const 67/67, whitespace-pad 72/72
fstring-leading-expr 78/0, strip-call 66/0, str-call 61/0, format-call 84/0, join-call 55/0, percent 68/0
first counterexample: git(repo, 'checkout', 'origin', f"{''}--receive-pack=git push origin sdlc/S-001-v0-cli-0;:", check=False) -> changed keys []
seed S1 (data flow, not counted): variable, starred-list, fstring-leading-var, concat-var-first: 0 hits
observation (not counted): confusable dash 77/0; git does not read it as an option
```

property on three pythons (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-pythons.txt
```

node test run of the new cases, 9 pass, 6 fail (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run-new-cases.txt
```

## TC-contract-30 (VS-13): Five hidden-option mutants push a verify branch to a bare remote while the guard output equals the clean output

- Given: A scratch copy of skills and hooks at 1fa953b, and a work repo with a bare origin and a local branch sdlc/S-001-v0-cli-0.
- When: A function with one wrapper call (m1, m2, a format call, m3, a join call) is appended to state-write.py or next-action.py; push_guard.py scans the copy; module-loader calls the function on the work repo.
- Then: The guard output differs from the clean output, or the bare remote holds no verify ref.
- Expected: A changed key, or no refs/heads/sdlc/S-001-v0-cli-0 on the remote. Actual: All five mutants leave every key equal, and each one creates refs/heads/sdlc/S-001-v0-cli-0 on the bare remote. Result: fail.
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new form that is a process call refutes when the output stays equal to the pins); spec-fidelity r1 D-1.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs:55`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs --test-name-pattern TC-contract-30`.

guard keys and remote refs per mutant (transcript):

```
git 2.50.1 (Apple Git-155); bare origin, local branch sdlc/S-001-v0-cli-0
m1 state-write.py git(repo, "fetch", "origin", f"{''}--upload-pack=git push origin sdlc/S-001-v0-cli-0;:", check=False)
   changed keys: <none>; outcome: return; refs added: refs/heads/sdlc/S-001-v0-cli-0
m2 state-write.py ... "--upload-pack=...".strip()  -> changed keys: <none>; refs added: refs/heads/sdlc/S-001-v0-cli-0
   state-write.py ... "{}".format("--upload-pack=...") -> changed keys: <none>; refs added: refs/heads/sdlc/S-001-v0-cli-0
m3 next-action.py run(repo, "git", "fetch", "origin", str("--upload-pack=...")) -> changed keys: <none>; refs added: refs/heads/sdlc/S-001-v0-cli-0
   next-action.py ... "".join(["--upload-pack=..."]) -> changed keys: <none>; refs added: refs/heads/sdlc/S-001-v0-cli-0
```

node test run of the new cases, 9 pass, 6 fail (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run-new-cases.txt
```

## TC-contract-31 (VS-13): The clean tree has no opaque entry and no command-running option in wrapperVerbs

- Given: The clean tree at 1fa953b.
- When: push_guard.py scans it.
- Then: opaque is empty, and no option entry in wrapperVerbs is a command-running option.
- Expected: opaque [], 0 command-running options. Actual: opaque []; 63 wrapperVerbs entries, none names --upload-pack, --receive-pack, --exec, --config, -c or -u outside push. Result: pass.
- Spec source: R-119 acceptance; plan-r1 VS-13 notes.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs:71`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs --test-name-pattern TC-contract-31`.

node test run of the new cases, 9 pass, 6 fail (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run-new-cases.txt
```

## TC-contract-32 (VS-15): An import alias bound anywhere in a module resolves to the watched module

- Given: janitor.py, branches.py and tracker/collect.py at 1fa953b.
- When: A seeded generator appends a function that calls an alias (10 subprocess and os targets, 9 alias names) and binds the alias after the use: at module end, in another function, try, except, if, while, with, a class body or a nested function.
- Then: direct, dynamic or imports differs from the clean scan.
- Expected: 0 counterexamples. Actual: 0 counterexamples in 1000 runs on python 3.14.7, 3.12.14 and 3.9.6. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (any import alias).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs:79`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs --test-name-pattern TC-contract-32`.

late alias binding (property-run):

```
seed 20261009, runs 1000, failures 0 on 3.14.7, 3.12.14, 3.9.6
places (runs/hits): if 119/119, other-function 121/121, class-body 93/93, except 117/117, module-end 114/114, while 101/101, nested 109/109, with 111/111, try 115/115
```

property on three pythons (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-pythons.txt
```

node test run of the new cases, 9 pass, 6 fail (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run-new-cases.txt
```

## TC-contract-33 (VS-15): A rebound, reassigned or deleted alias breaks a pin

- Given: A scratch copy at 1fa953b.
- When: Six tails are appended to janitor.py: json and subprocess under one name (two placements), import then sp = json, sp = subprocess, del then a late rebind, a lambda default with __import__.
- Then: The expected key (dynamic or direct) changes.
- Expected: dynamic or direct changes in each tail. Actual: Each tail changes the expected key. Result: pass.
- Spec source: R-119 acceptance; plan R-119 scope (alias, value, dynamic code).
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs:95`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs --test-name-pattern TC-contract-33`.

new entries per tail (log):

```
dynamic: janitor.py rebound import sp json subprocess; direct: janitor.py _b sp.run([...])
dynamic: janitor.py rebound import sp json subprocess (late); direct as above
direct: janitor.py _b sp.run([...]) (import then sp = json)
dynamic: janitor.py <module> value subprocess
dynamic: janitor.py <module> value _r
dynamic: janitor.py <module> __import__('subprocess')
```

node test run of the new cases, 9 pass, 6 fail (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run-new-cases.txt
```

## TC-contract-34 (VS-15): The clean tree has no dynamic entry, so no file has a rebound name

- Given: The clean tree at 1fa953b.
- When: push_guard.py scans it.
- Then: dynamic is empty.
- Expected: []. Actual: []. Result: pass.
- Spec source: plan-r1 VS-15 notes.
- Test: `.sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs:106`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r1/tests/contract-0/options-aliases.verify-contract.test.mjs --test-name-pattern TC-contract-34`.

node test run of the new cases, 9 pass, 6 fail (log):

```
see .sdlc/slices/S-005b/verification/r1/logs/contract-0-run-new-cases.txt
```

## Attacks

None.

## Seeds

No new seeds. The data-flow spellings (a variable, a starred list, a parameter before the option) stay seed S1; cli r1 reported them. A confusable dash before an option name is not a git option, so it is an observation.
