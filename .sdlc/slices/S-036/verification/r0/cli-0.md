# S-036 verify-cli r0

Slice S-036. Profile cli, part 0, round 0. Commit 28d6cce. Verdict: pass (7 of 7 cases).

Environment: Node node:test, python3 branches.py, scratch repo from the cli-runner. `npm test` on the slice branch: 782 tests, 781 pass, 0 fail.

## TC-cli-1 (VS-1): scenario-runner.md holds the exact worktree command and no loop literal

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: exact command present; no loop literal after stripBranchesOutput
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:13`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

## TC-cli-2 (VS-1): Variants (literal branch, swapped placeholders, other spelling) break the exact-command check

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: each variant removes the exact command; the literal variant trips the guard
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:19`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

## TC-cli-3 (VS-2): env-detector.md has 3 run placeholders, the kind phrase, no sdlc/run- text, and keeps sdlc/{name}

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: 3 placeholders, phrase present, default format allowed
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:28`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

## TC-cli-4 (VS-2): branches.py parse under sdlc/{name} reports kind run for sdlc/run-2

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: exit 0, kind run, tail run-2; feature/x gives kind null
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:37`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

```
$ python3 branches.py parse --repo <scratch> --branch sdlc/run-2 --format sdlc/{name}
exit 0 {"ok":true,"branch":"sdlc/run-2","kind":"run","tail":"run-2","n":2}
$ ... --branch feature/x
exit 0 {"ok":true,"branch":"feature/x","kind":null}
```

## TC-cli-5 (VS-5): Guard matches sdlc/M-1, sdlc/run-2, sdlc/S-003 and e2e forms; ignores sdlc/{name}, .sdlc/, tracker, STOP and branches.py fences

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: all bad samples match; all allowed samples do not
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:48`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

## TC-cli-6 (VS-5): A literal injected into each of the four prompts trips the guard, bare or in a fence

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: 8 injections and 4 fence injections all match
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:56`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

## TC-cli-7 (VS-5): A literal appended to a scratch copy of milestone-writer.md fails T-R-144, T-R-063a and T-R-080 in the real prompts.test.mjs

- Given: the prompts on branch sdlc/S-036 at 28d6cce
- When: the test reads the prompt files from disk and runs the guard regex
- Then: real suite exits non-zero and names the three tests
- Result: pass
- Test: `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:66`

Log: `.sdlc/slices/S-036/verification/r0/logs/cli-0-verify.txt`

```
scratch copy + "Create sdlc/M-1 now." -> failed: T-R-063a, T-R-144, T-R-080
```

## Attacks

None.

## Seeds

None.
