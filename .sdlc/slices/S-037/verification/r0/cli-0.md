# Verification: S-037, profile cli, round 0

Commit 0e58a38. Verdict: verified (6 of 6 cases pass).

Environment: node test runner, python3, scratch git repos via cli-runner.

Test file: `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs`. Full log: `.sdlc/slices/S-037/verification/r0/logs/cli-0-state-branch.txt`.

## TC-cli-1: commit-state.md holds no date -u and uses <state branch>
- Scenario VS-3, R-135
- Expected: no date -u, no sdlc/state- literal, <state branch> present
- Actual: as expected
- Result: pass

```
grep -c 'date -u' commit-state.md -> 0
```

## TC-cli-2: _common.md maps <state branch> to branches.py name --kind state
- Scenario VS-3, R-135
- Expected: table row present
- Actual: as expected
- Result: pass

```
| `<state branch>` | `branches.py name --kind state` (it makes the timestamp) |
```

## TC-cli-3: Default format gives sdlc/state-<14 digits>
- Scenario VS-3, R-135
- Expected: valid ref, kind state
- Actual: sdlc/state-20261010132549, check-ref-format 0, parse kind state
- Result: pass

```
$ python3 skills/sdlc/branches.py name --repo <scratch> --kind state
exit: 0
{"ok": true, "kind": "state", "branch": "sdlc/state-20261010132549"}
```

## TC-cli-4: Custom format feature/{name}
- Scenario VS-3, R-135
- Expected: feature/state-<14 digits>
- Actual: feature/state-20261010132549
- Result: pass

```
$ python3 skills/sdlc/branches.py name --repo <scratch> --kind state
exit: 0
{"ok": true, "format": "feature/{name}", "branch": "feature/state-20261010132549"}
```

## TC-cli-5: Format with {name:lower} and suffix
- Scenario VS-3, R-135
- Expected: Team_X/state-<ts>-bot
- Actual: Team_X/state-20261010132550-bot
- Result: pass

```
$ python3 skills/sdlc/branches.py name --repo <scratch> --kind state
exit: 0
{"ok": true, "format": "Team_X/{name:lower}-bot", "branch": "Team_X/state-20261010132550-bot"}
```

## TC-cli-6: Invalid format and extra --id
- Scenario VS-3, R-135
- Expected: invalid format exits 2 with error JSON; --id on state accepted without error
- Actual: exit 2 {"ok": false, "error": "the branch format 'bad format/{name}' holds whitespace"}; --id S-1 exit 0
- Result: pass

```
exit: 2
{"ok": false, "error": "the branch format 'bad format/{name}' holds whitespace"}
```

## Seeds
- branches.py ignores --id with --kind state. It exits 0.
