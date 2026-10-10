# Verification r0, profile cli, part 0

Slice: S-fix-M-1-1b. Round: 0. Commit: 61c3949. Verdict: all 6 cases pass.

Environment: Python 3 branches.py and next-action.py run as built scripts through cliRunner in scratch git repos, HOME and TZ controlled, node --test.
Test file: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`.
Command: `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`.
Full transcripts: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`.

## TC-cli-1 (VS-1): name refuses slice and milestone ids that parse as another kind

- Given: scratch git repo, format sdlc/{name}
- When: branches.py name --kind slice|milestone --id S-001-attempt-2 | S-001-v0-cli-0 | S-001-attempt-0 | S-001-v10-a-b-3
- Then: exit 2, ok false, no branch key, tree unchanged, parse still reads these as attempt or verify
- Actual: all 8 runs exit 2 with ok false and an error naming the kind; tree unchanged; parse did not read a slice
- Result: pass
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:23`

```
exit: 2
{"ok": false, "error": "the slice branch name 'sdlc/S-001-attempt-2' does not parse back as a slice branch: parse reads kind attempt"}
exit: 2
{"ok": false, "error": "the slice branch name 'sdlc/S-001-v0-cli-0' does not parse back as a slice branch: parse reads kind verify"}
```

## TC-cli-2 (VS-2): valid parts of every kind keep names and parse back

- Given: scratch repo, 4 formats (sdlc/{name}, feature/PROJ-{name:lower}-x, {name}, a/{name:lower})
- When: name for run, slice (S-fix-M-1-2, S-001-e2e), milestone, e2e, e2e-area, state, verify, attempt, then parse the output
- Then: exit 0, expected tail, parse returns the same kind and parts
- Actual: 36 name runs and 36 parse runs matched kind and parts
- Result: pass
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:37`

```
name --kind slice --id S-fix-M-1-2 -> sdlc/S-fix-M-1-2 (exit 0); parse -> kind slice
```

## TC-cli-3 (VS-4): integer parts compare by value

- Given: scratch repo
- When: name --n 02; verify --round 007 --part 00; bad ints 2.0, ' 2', '+2', '0x2', True, abc, '', fullwidth digits, -1, 5000-digit string
- Then: valid ones succeed and parse back by value; bad ones give JSON ok false, no traceback
- Actual: --n 02 gives sdlc/run-2 (n parses as 2); 007/00 give S-1-v7-cli-0; 2.0, 0x2, True, abc and empty give 'invalid int value' with exit 2; no traceback in any run
- Result: pass
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:73`

```
--n 02 -> {"ok": true, ... "branch": "sdlc/run-2"}
--n 2.0 -> exit 2 {"ok": false, "error": "argument --n: invalid int value: '2.0'"}
```

## TC-cli-4 (VS-6): formats whose prefix or suffix join the tail into another kind

- Given: formats {name}-e2e, {name}-attempt-1, {name}-v1-a-1, {name}-3, run-{name}, {name}-e2e-x
- When: name slice and milestone ids under each format
- Then: Fail, or a faithful round trip; never a silent mismatch
- Actual: each run either exited 2 with ok false or parsed back to the requested kind and id; run-{name} with run kind gives run-run-1
- Result: pass
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:110`

```
see log
```

## TC-cli-5 (VS-9): name reports refusal without side effects

- Given: scratch repo
- When: name with missing --id, empty id, unknown kind, formats with no placeholder, two placeholders, whitespace, kind-confusing id, missing n, missing round, missing --kind, bad --repo, no subcommand
- Then: exit 2, one JSON line with ok false and an error, empty name, tree unchanged
- Actual: all 12 runs exited 2 with one-line JSON ok false and tree unchanged
- Result: pass
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:133`

```
{"ok": false, "error": "--kind 'bogus' is not one of run, slice, ..."}
{"ok": false, "error": "the branch format '{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
```

## TC-cli-6 (VS-8): next-action active_branch matches slice ids by ASCII lowering

- Given: scratch repos, format feature/p-1-{name:lower}, S-001 in_progress committed on the branch
- When: next-action.py --repo for branch feature/p-1-s-001; look-alike feature/p-1-s-00(U+212A); slices.json id S-00(U+212A); foreign other/s-001 and sdlc/S-001; branch feature/p-1-S-001
- Then: checkout is the ASCII branch; look-alikes and foreign branches give checkout null
- Actual: checkout was feature/p-1-s-001 and feature/p-1-S-001 for the ASCII cases, and null for Kelvin branch, Kelvin id and foreign branches; tree unchanged
- Result: pass
- Test: `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:160`

```
"checkout": "feature/p-1-s-001"
```

## Attacks

None beyond the cases above.

## Seeds

- name accepts fullwidth digits for integer parts: argparse type=int turns --n=１２ into 12, so name prints sdlc/run-12 and the round trip passes. The output is ASCII and faithful, so this is not a defect, but the plan note asked that fullwidth digits do not pass as ints. (skills/sdlc/branches.py)
- name accepts ' 2' and '+2' for --n: int() strips space and sign, so the part is normalised to 2. The round trip is faithful. (skills/sdlc/branches.py)
