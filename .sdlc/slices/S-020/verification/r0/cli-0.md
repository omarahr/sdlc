# Verification: S-020, profile cli, round 0

Commit: b07ace1. Verdict: pass (3 of 3 cases). Scenario: VS-3.

Environment: Node test runner, python3, cli-runner with scratch git repos.

## TC-cli-1: loop script and branches.py agree for three formats
- Given: a scratch git repo and the formats `sdlc/{name}`, `feature/PROJ-1-{name}`, `feature/PROJ-1-{name:lower}`.
- When: run `branches.py name --kind verify` for 4 ids, 3 rounds, 5 profiles (with `Http-API`) and 2 parts. Compare with `branchName`.
- Then: 360 pairs are equal, all exit codes are 0, the tree does not change.
- Result: pass. Spec source: R-075, R-051.
- Test: `.sdlc/slices/S-020/verification/r0/tests/cli-0/branch-names.verify-cli.test.mjs:12`

```
sdlc/{name} | S-001-v0-http-api-0 | exit=0 | py=sdlc/S-001-v0-http-api-0 | js=sdlc/S-001-v0-http-api-0
feature/PROJ-1-{name} | S-001-v0-Http-API-0 | exit=0 | py=feature/PROJ-1-S-001-v0-Http-API-0 | js=feature/PROJ-1-S-001-v0-Http-API-0
```
All pairs: `logs/cli-0-names.txt`.

## TC-cli-2: format from the config file
`branches.py` reads `feature/PROJ-1-{name:lower}` from config and gives `feature/PROJ-1-s-020-v0-http-api-0`, equal to `branchName`. Result: pass.

## TC-cli-3: empty format falls back
Both give `sdlc/S-020-v1-cli-0`. Result: pass.

## Attacks and seeds
None.
