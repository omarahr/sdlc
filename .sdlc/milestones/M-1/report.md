# Report: M-1 The branch format owns every loop branch name

## Summary

Outcome: `bugs`. 71 of 84 scenarios passed. 2 bugs are confirmed. 6 failures are dismissed. 5 failures are unjudged. 0 scenarios are blocked.

Milestone status: `fixing`. Attempt 1. Three fix slices own the 7 open scenarios: `S-fix-M-1-1`, `S-fix-M-1-2` and `S-fix-M-1-3`.

The e2e branches merged into `sdlc/M-1-e2e`. The e2e command ran with the 7 open scenarios and the 6 dismissed scenarios in `e2e/pending.json`. It passed with 75 passing and 13 skipped, so no regression exists.

## Scenarios

| id | status | requirements | behavior |
|---|---|---|---|
| SC-M-1-001 | pass | R-003, R-004, R-005, R-006... | Held: R-003, R-004, R-005, R-006... |
| SC-M-1-002 | pass | R-008, R-018 | Held: R-008, R-018 |
| SC-M-1-003 | pass | R-011, R-019, R-142 | Held: R-011, R-019, R-142 |
| SC-M-1-004 | pass | R-019, R-068 | Held: R-019, R-068 |
| SC-M-1-005 | pass | R-001, R-017 | Held: R-001, R-017 |
| SC-M-1-006 | pass | R-017, R-150 | Held: R-017, R-150 |
| SC-M-1-007 | dismissed spec-gap | R-002, R-016 | Invalid JSON in config gives exit 2, not the default. |
| SC-M-1-008 | pass | R-015, R-012 | Held: R-015, R-012 |
| SC-M-1-009 | dismissed test-bug | R-099, R-014, R-018 | --n=-1 gives sdlc/S-001-attempt--1; the spec sets no sign rule. |
| SC-M-1-010 | pass | R-088, R-014 | Held: R-088, R-014 |
| SC-M-1-011 | pass | R-098, R-013 | Held: R-098, R-013 |
| SC-M-1-012 | dismissed spec-gap | R-017, R-142 | name prints refs that git refuses for hostile ids; no code runs. |
| SC-M-1-013 | pass | R-016, R-055 | Held: R-016, R-055 |
| SC-M-1-014 | pass | R-102, R-103, R-104, R-105... | Held: R-102, R-103, R-104, R-105... |
| SC-M-1-015 | pass | R-022, R-070, R-105 | Held: R-022, R-070, R-105 |
| SC-M-1-016 | pass | R-021, R-101, R-118 | Held: R-021, R-101, R-118 |
| SC-M-1-017 | dismissed spec-gap | R-106, R-102 | Arabic-Indic digits match the state row; the spec names no digit set. |
| SC-M-1-018 | pass | R-103, R-104 | Held: R-103, R-104 |
| SC-M-1-019 | pass | R-024, R-070, R-086 | Held: R-024, R-070, R-086 |
| SC-M-1-020 | pass | R-025, R-094 | Held: R-025, R-094 |
| SC-M-1-021 | pass | R-025, R-085 | Held: R-025, R-085 |
| SC-M-1-022 | pass | R-025 | Held: R-025 |
| SC-M-1-023 | pass | R-025, R-053 | Held: R-025, R-053 |
| SC-M-1-024 | pass | R-024, R-054 | Held: R-024, R-054 |
| SC-M-1-025 | pass | R-041, R-151, R-091, R-032 | Held: R-041, R-151, R-091 |
| SC-M-1-026 | pass | R-039, R-136, R-137 | Held: R-039, R-136, R-137 |
| SC-M-1-027 | pass | R-039 | Held: R-039 |
| SC-M-1-028 | pass | R-027, R-028, R-029, R-140 | Held: R-027, R-028, R-029, R-140 |
| SC-M-1-029 | pass | R-028, R-100 | Held: R-028, R-100 |
| SC-M-1-030 | pass | R-042, R-123, R-124, R-125... | Held: R-042, R-123, R-124, R-125... |
| SC-M-1-031 | pass | R-097, R-012, R-038 | Held: R-097, R-012, R-038 |
| SC-M-1-032 | pass | R-038, R-042 | Held: R-038, R-042 |
| SC-M-1-033 | pass | R-043, R-122 | Held: R-043, R-122 |
| SC-M-1-034 | pass | R-091 | Held: R-091 |
| SC-M-1-035 | pass | R-092, R-087 | Held: R-092, R-087 |
| SC-M-1-036 | pass | R-036, R-037, R-040, R-043 | Held: R-040, R-037, R-043 |
| SC-M-1-037 | pass | R-033, R-034, R-095, R-127 | Held: R-033, R-034, R-095, R-127 |
| SC-M-1-038 | pass | R-036, R-035 | Held: R-036, R-035 |
| SC-M-1-039 | pass | R-053, R-054, R-055, R-076... | Held: R-053, R-054, R-055, R-076... |
| SC-M-1-040 | pass | R-053, R-055, R-077 | Held: R-053, R-055, R-077 |
| SC-M-1-041 | pass | R-056, R-096, R-078, R-023 | Held: R-056, R-096, R-078, R-023 |
| SC-M-1-042 | pass | R-057, R-138, R-058 | Held: R-057, R-138, R-058 |
| SC-M-1-043 | pass | R-083 | Held: R-083 |
| SC-M-1-044 | pass | R-060, R-079, R-086, R-139 | Held: R-060, R-079, R-086, R-139 |
| SC-M-1-045 | pass | R-060, R-139 | Held: R-060, R-139 |
| SC-M-1-046 | pass | R-060, R-139 | Held: R-060, R-139 |
| SC-M-1-047 | pass | R-050, R-051, R-075, R-116 | Held: R-050, R-051, R-075, R-116 |
| SC-M-1-048 | pass | R-050 | Held: R-050 |
| SC-M-1-049 | pass | R-052 | Held: R-052 |
| SC-M-1-050 | pass | R-119, R-120 | Held: R-119, R-120 |
| SC-M-1-051 | pass | R-063, R-080, R-146, R-143... | Held: R-063, R-080, R-146, R-143... |
| SC-M-1-052 | pass | R-062, R-089, R-090, R-110... | Held: R-062, R-089, R-090, R-110... |
| SC-M-1-053 | pass | R-045, R-046, R-047, R-048... | Held: R-045, R-046, R-047, R-048... |
| SC-M-1-054 | pass | R-064, R-065, R-134, R-135... | Held: R-064, R-065, R-134, R-135... |
| SC-M-1-055 | pass | R-066, R-067 | Held: R-066, R-067 |
| SC-M-1-056 | pass | R-082, R-067 | Held: R-082, R-067 |
| SC-M-1-057 | pass | R-068, R-069, R-070, R-071... | Held: R-068, R-069, R-070, R-071... |
| SC-M-1-058 | pass | R-136, R-137 | Held: R-136, R-137 |
| SC-M-1-059 | unjudged fail | R-029, R-084 | The rules unknown note holds the whole gh stderr, secret included. |
| SC-M-1-060 | pass | R-084 | Held: R-084 |
| SC-M-1-061 | unjudged fail | R-031, R-084 | The failing glab variant leaks the shim stderr into the note. |
| SC-M-1-062 | pass | R-030, R-031, R-140 | Held: R-030, R-031, R-140 |
| SC-M-1-063 | pass | R-035, R-036 | Held: R-035, R-036 |
| SC-M-1-064 | unjudged fail | R-029 | A 10 MB gh stderr makes an unbounded note that holds the secret. |
| SC-M-1-065 | pass | R-029, R-028 | Held: R-029, R-028 |
| SC-M-1-066 | unjudged fail | R-016, R-055, R-139 | state-write.py status ends in a traceback on a bad config and writes STATUS.md. |
| SC-M-1-067 | pass | R-099, R-025 | Held: R-099, R-025 |
| SC-M-1-068 | pass | R-060, R-139 | Held: R-060, R-139 |
| SC-M-1-069 | pass | R-040, R-043 | Held: R-040, R-043 |
| SC-M-1-070 | unjudged fail | R-053, R-056 | patch-slice creates a branch and a commit during a rebase. |
| SC-M-1-071 | pass | R-020 | Held: R-020 |
| SC-M-1-072 | pass | R-026 | Held: R-026 |
| SC-M-1-073 | pass | R-044 | Held: R-044 |
| SC-M-1-074 | pass | R-059 | Held: R-059 |
| SC-M-1-075 | pass | R-019, R-042 | Held: R-019, R-042 |
| SC-M-1-076 | confirmed bug | R-019, R-022 | name prints sdlc/S-001-attempt-2 and sdlc/S-001-v0-cli-0, which parse as attempt and verify. |
| SC-M-1-077 | dismissed test-bug | R-008 | A 13-digit ts is used as given; R-008 says so. |
| SC-M-1-078 | dismissed test-bug | R-037, R-040, R-043 | The scenario asserts more than R-037, R-040 and R-043 require. |
| SC-M-1-079 | pass | R-042 | Held: R-042 |
| SC-M-1-080 | confirmed bug | R-024, R-053 | parse reads look-alike unicode tails as slice and verify; the janitor deleted one. |
| SC-M-1-081 | pass | R-033, R-034 | Held: R-033, R-034 |
| SC-M-1-082 | pass | R-044, R-084 | Held: R-044, R-084 |
| SC-M-1-083 | pass | R-042, R-043, R-087 | Held: R-042, R-043, R-087 |
| SC-M-1-084 | pass | R-035, R-036 | Held: R-035, R-036 |

## Confirmed bugs

### SC-M-1-076 (R-019, R-022)
- Expected: each call exits 2 with ok false, or the printed branch parses back to the named kind and parts.
- Observed: `name --kind slice --id S-001-attempt-2` exits 0 and prints `sdlc/S-001-attempt-2`. `parse` reads it as kind attempt. `--id S-001-v0-cli-0` prints a name that parse reads as verify.
- Reproduction: `python3 skills/sdlc/branches.py name --kind slice --id S-001-attempt-2 --repo <scratch repo>`, then `parse --branch sdlc/S-001-attempt-2`.
- Fix slice: `S-fix-M-1-1`. Judge reports: `judge-SC-M-1-076-v0.md` to `v2.md`.

### SC-M-1-080 (R-024, R-053)
- Expected: parse returns null for look-alike unicode branches. The janitor deletes none. next-action ignores them.
- Observed: `feature/p-1-S-00K` (U+212A) and the U+017F variants parse as slice. The verify look-alike parses as verify, and the janitor deleted it.
- Reproduction: call `branches.parse("feature/p-1-{name:lower}", "feature/p-1-s-001\u017f")` from `skills/sdlc/branches.py`.
- Cause: `re.IGNORECASE` without `re.ASCII` at `branches.py` line 339.
- Fix slice: `S-fix-M-1-1`. Judge reports: `judge-SC-M-1-080-v1.md`, `v2.md`.

## Unjudged failures

The runners saw these failures. The judge did not run on them. Each has a fix slice.

- SC-M-1-059, SC-M-1-061, SC-M-1-064 (R-029, R-031, R-084): the rules unknown note holds unfiltered forge stderr. A token in stderr reaches stdout. `S-fix-M-1-2`.
- SC-M-1-066 (R-016, R-055, R-139): `state-write.py status` ends in a traceback on an unreadable config, a config directory and a symlink loop. It also writes `.sdlc/STATUS.md`. `S-fix-M-1-3`.
- SC-M-1-070 (R-053, R-056): `state-write.py patch-slice` creates a branch and a commit while `.git/rebase-merge` exists. `S-fix-M-1-3`.

## Dismissed failures

- SC-M-1-007: dismissed spec-gap. Invalid JSON in config gives exit 2, not the default.
- SC-M-1-009: dismissed test-bug. --n=-1 gives sdlc/S-001-attempt--1; the spec sets no sign rule.
- SC-M-1-012: dismissed spec-gap. name prints refs that git refuses for hostile ids; no code runs.
- SC-M-1-017: dismissed spec-gap. Arabic-Indic digits match the state row; the spec names no digit set.
- SC-M-1-077: dismissed test-bug. A 13-digit ts is used as given; R-008 says so.
- SC-M-1-078: dismissed test-bug. The scenario asserts more than R-037, R-040 and R-043 require.

The spec-gap items are in `.sdlc/SPEC-PROPOSALS.md`. The test-bug scenarios assert more than the spec requires. Their e2e tests are in `e2e/pending.json` with the value `dismissed` until a person fixes or drops them.

## Blocked scenarios

None.

