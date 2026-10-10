# Verification: S-026, cli, round 0, part 0

- Commit: 48d8ffe
- Verdict: verified. 6 of 6 cases pass.
- Environment: macOS, Node 24.19, python3, cli-runner scratch git repos, repo at sdlc/S-026

## TC-cli-1 (VS-1): Milestone row command runs and gives a format-following name

- Given: A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name}
- When: Read the row in _common.md; run branches.py name --kind milestone --id M-3 with sdlc/{name} and feature/{name}
- Then: The row holds the exact command; exit 0; ok true; branch sdlc/M-3 and feature/M-3; file tree unchanged
- Actual: As expected
- Result: pass (R-111 acceptance)
- Test: `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:15`

```
$ branches.py name --repo <scratch> --kind milestone --id M-3
→ exit 0 {"ok": true, "kind": "milestone", "branch": "sdlc/M-3"}
feature/{name} → feature/M-3
```

## TC-cli-2 (VS-2): E2E row has no --area and its name differs from e2e-area

- Given: A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name}
- When: Check row text; run --kind e2e --id M-3 and --kind e2e-area --id M-3 --area A-1
- Then: Row holds no --area; names differ
- Actual: sdlc/M-3-e2e and sdlc/M-3-e2e-A-1
- Result: pass (R-112 acceptance)
- Test: `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:26`

```
e2e → sdlc/M-3-e2e
e2e-area → sdlc/M-3-e2e-A-1
```

## TC-cli-3 (VS-3): E2E area row works with plain and hyphenated areas; missing --area is refused

- Given: A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name}
- When: Run e2e-area with area auth, user-profile; without --area; with odd areas
- Then: Plain and hyphenated give sdlc/M-1-e2e-<area>; missing area exits 2 with a clear error
- Actual: auth and user-profile pass; missing area: exit 2, error 'a e2e-area branch name needs a non-empty area'
- Result: pass (R-113 acceptance)
- Test: `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:36`

```
auth → sdlc/M-1-e2e-auth
user-profile → sdlc/M-1-e2e-user-profile
no --area → exit 2 {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
odd area 'a b' → exit 0 sdlc/M-1-e2e-a b (see seed)
```

## TC-cli-4 (VS-4): State row takes no --id and the command makes the timestamp

- Given: A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name}
- When: Run --kind state twice with no --id
- Then: Row holds no --id and says it makes the timestamp; both names match sdlc/state-<14 digits>
- Actual: sdlc/state-20261010063108 twice, exit 0
- Result: pass (R-114 acceptance)
- Test: `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:48`

```
state → sdlc/state-20261010063108
state → sdlc/state-20261010063108
```

## TC-cli-5 (VS-5): Attempt row with n = 2; bad n never gives a malformed name

- Given: A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name}
- When: Run --kind attempt --id S-026 --n 2; then n = 0, -1, abc, 1.5, empty, huge, unicode digits
- Then: n = 2 gives sdlc/S-026-attempt-2; each other value is refused (exit 2, no branch) or gives a branch of safe characters
- Actual: abc, 1.5, empty, superscript two refused with exit 2; 0, -1, huge, ' 2', Arabic-indic 2 give safe-character names
- Result: pass (R-115 acceptance)
- Test: `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:56`

```
n=2 → sdlc/S-026-attempt-2
0 → sdlc/S-026-attempt-0
-1 → sdlc/S-026-attempt--1
abc → exit 2
99999999999999999999 → sdlc/S-026-attempt-99999999999999999999
' 2' → sdlc/S-026-attempt-2
```

## TC-cli-6 (VS-6): Table has eight rows and each name command runs

- Given: A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name}
- When: Count rows in _common.md; run name for slice, milestone, e2e, e2e-area, state, attempt; run prompts.test.mjs (STE check)
- Then: Eight rows; every command exits 0; prompts.test.mjs 77 of 77 pass
- Actual: As expected
- Result: pass (R-111..R-115 acceptance)
- Test: `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70`

```
slice sdlc/S-1
milestone sdlc/M-1
e2e sdlc/M-1-e2e
e2e-area sdlc/M-1-e2e-a
state sdlc/state-20261010063111
attempt sdlc/S-1-attempt-1
prompts.test.mjs: tests 77 pass 77 fail 0
```

## Attacks

None.

## Seeds

- branches.py name accepts ids that make an invalid git ref. --area 'a b' gives sdlc/M-1-e2e-a b, and --id 'a b' with --kind slice gives sdlc/a b. git check-ref-format refuses both. branches.py does not check id, area or n for git-unsafe characters. Not required by R-111..R-115; earlier slices own branches.py.
- branches.py name accepts n = 0, negative n and very large n. --n 0 gives sdlc/S-026-attempt-0, --n -1 gives sdlc/S-026-attempt--1, a 20-digit n is accepted, and the Arabic-indic digit gives attempt-2. The names are valid refs but may be unintended.
