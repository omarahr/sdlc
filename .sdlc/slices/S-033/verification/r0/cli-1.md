# S-033 verify-cli part 1, round 0

Commit: 94e98a7. Scenario: VS-7. Verdict: pass (6 cases, 16 tests).

Environment: python3, node test runner, scratch git repos from cli-runner; --days 36500 keeps the real temp dir safe

## TC-cli-1: Source: janitor.py calls branches.load_format(repo) and holds no sdlc/ literal in code

- Given: scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-
- When: janitor.py --repo <scratch> --days 36500 runs with the stated config
- Then: branches and notes match the title
- Result: pass
- Spec source: R-139 acceptance
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:23`
- Command: `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`

## TC-cli-2: Custom format feature/PROJ-1-{name} sweeps only the feature/ verify branches of done or unknown slices

- Given: scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-
- When: janitor.py --repo <scratch> --days 36500 runs with the stated config
- Then: branches and notes match the title
- Result: pass
- Spec source: R-139 acceptance
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:30`
- Command: `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`

## TC-cli-3: Unusable format (no placeholder, unbalanced braces, two or unknown placeholders) deletes no branch and prints a note

- Given: scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-
- When: janitor.py --repo <scratch> --days 36500 runs with the stated config
- Then: branches and notes match the title
- Result: pass
- Spec source: R-139 quote
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:38`
- Command: `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`

## TC-cli-4: Git-unsafe or odd format (space, tilde, colon, double dot, leading dash, .lock, extra braces) deletes no branch

- Given: scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-
- When: janitor.py --repo <scratch> --days 36500 runs with the stated config
- Then: branches and notes match the title
- Result: pass
- Spec source: R-139 quote
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:38`
- Command: `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`

## TC-cli-5: Non-string branchFormat counts as absent; sweep runs under sdlc/{name}

- Given: scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-
- When: janitor.py --repo <scratch> --days 36500 runs with the stated config
- Then: branches and notes match the title
- Result: pass
- Spec source: R-139 acceptance (no branchFormat)
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:68`
- Command: `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`

## TC-cli-6: Config file with invalid JSON deletes no branch and prints a note

- Given: scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-
- When: janitor.py --repo <scratch> --days 36500 runs with the stated config
- Then: branches and notes match the title
- Result: pass
- Spec source: R-139 quote
- Test: `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:38`
- Command: `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`

## Evidence

```
$ janitor.py --repo <scratch> --days 36500  (branchFormat "feature/{name")
{"removedDirs": 0, "removedBranches": [], "notes": ["the branch format is unusable; no branch was deleted (the branch format 'feature/{name' must hold exactly one {name} or {name:lower}, found 0)"]}
exit=0
* main
  sdlc/S-001-v0-x-0
```

Full test log: `logs/cli-1-node-test.txt`.

## Attacks

None beyond the cases above.

## Seeds

- janitor: git-unsafe format gives no note: janitor.py calls only branches.split, not validate_format. A format such as feat ure/{name} or a{b}/{name} passes split. The sweep deletes nothing, because no branch can parse, but it prints no note. VS-7 notes ask for a report. The spec rejects such formats at pre-flight, so this is a gap in defence only. (skills/sdlc/janitor.py)
- load_format: non-string branchFormat falls back to default silently: _config_value returns None for a non-string value (123, array, object, true). The janitor then sweeps under sdlc/{name} and prints no note. A repo that meant a custom format loses the custom scope and sweeps the default one. (skills/sdlc/branches.py)
