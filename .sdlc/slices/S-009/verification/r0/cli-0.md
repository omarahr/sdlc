# S-009 verify-cli round 0 part 0

- Slice: S-009
- Profile: cli
- Commit: d29cba7
- Verdict: all 8 cases pass

## Environment
Python 3.14.7, Node 24.19.0, macOS; branches.py parse run through cli-runner from scratch cwd with scratch HOME; commit d29cba7 checked out in worktree sdlc/S-009-v0-cli-0

## TC-cli-1 (VS-1): State branch with 14 digits parses as state; near misses give null

- Given: Scratch git repo, format sdlc/{name}
- When: branches.py parse for sdlc/state-20261008101500 and nine malformed state tails (13 digits, 15 digits, empty, letters, extra parts)
- Then: Kind state with ts string and no id; all malformed tails give kind null; exit 0; tree unchanged
- Expected: state / ts '20261008101500'; null for malformed
- Actual: as expected
- Result: pass
- Spec source: R-106 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:47`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: state transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## TC-cli-2 (VS-2): Verify branch splits into id, round, profile, part; boundaries do not give verify

- Given: format sdlc/{name}
- When: parse S-001-v0-http-api-0, S-001-v12-cli-3, S-001-v3-a-b-c-7, S-005b-v1-security-10 and eight malformed tails
- Then: Integers for round and part; profile a-b-c whole; malformed tails are not verify
- Expected: verify rows with integer parts; no verify for malformed
- Actual: as expected; a trailing hyphen tail falls to slice by the slice row
- Result: pass
- Spec source: R-107 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:65`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: verify transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## TC-cli-3 (VS-2): Hostile tails never crash parse

- Given: attack-corpus families huge-integers, control-chars, flag-like-values, oversized, unicode-digits, unicode-whitespace, integer-forms, format-strings, injection, traversal, unicode-confusables (argv-safe)
- When: each value is placed in the round, part, attempt n, state ts and id positions: 650 CLI runs
- Then: Every run exits 0 with ok true JSON and no traceback
- Expected: exit 0, ok true, no Traceback
- Actual: 650 of 650 as expected
- Result: pass
- Spec source: R-107 scenario note: parse returns a value or null and never raises
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:79`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- log: test run, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-run.txt`

## TC-cli-4 (VS-3): Verify wins over slice and attempt, in all formats

- Given: formats sdlc/{name}, feature/PROJ-1-{name}, {name}-wip
- When: parse S-001-v0-http-api-0, S-fix-M-1-2-v1-cli-0, the same under prefix and suffix, and S-001-attempt-2-v0-cli-0
- Then: kind verify with the right id each time
- Expected: verify
- Actual: as expected
- Result: pass
- Spec source: R-107, R-109 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:97`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: precedence transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## TC-cli-5 (VS-4): Attempt branch gives id and integer n; malformed tails are not attempt

- Given: format sdlc/{name}
- When: parse S-001-attempt-2, S-005b-attempt-10, S-fix-M-1-2-attempt-0 and six malformed tails
- Then: attempt with integer n; malformed are not attempt; attempt- falls to slice
- Expected: attempt rows; no attempt for malformed
- Actual: as expected
- Result: pass
- Spec source: R-108 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:105`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: attempt transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## TC-cli-6 (VS-5): Slice branch keeps the full id; foreign shapes give null

- Given: format sdlc/{name} and feature/PROJ-1-{name:lower}
- When: parse S-001, S-fix-M-1-2, S-005b, eight null shapes, and s-001 under the lower format
- Then: slice rows with full id; nulls; lower format gives slice
- Expected: as the plan notes
- Actual: as expected
- Result: pass
- Spec source: R-109 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:115`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: slice transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## TC-cli-7 (VS-6): Rows 5 to 8 classify the same under prefix and suffix formats

- Given: formats feature/PROJ-1-{name} and {name}-wip
- When: parse one branch per row, plus wrong prefix and wrong suffix branches
- Then: Same kind and parts; tail excludes prefix and suffix; wrong prefix or suffix gives null
- Expected: same classification
- Actual: as expected
- Result: pass
- Spec source: R-106 to R-109 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:125`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: format transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## TC-cli-8 (VS-7): Without ids the CLI gives known null on rows 6 to 8

- Given: parse has no --ids flag
- When: parse slice, attempt, verify and state branches; parse under the lower format
- Then: known is null; id keeps the branch spelling
- Expected: known null (the CLI has no ledger input)
- Actual: as expected; ledger known true or false is reachable only through the function, which the contract profile covers
- Result: pass
- Spec source: R-107 to R-109 acceptance (id and kind)
- Test: `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:146`
- Command: `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`

Evidence:
- transcript: help and known transcripts, see `.sdlc/slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt`

## Attacks

The 650 hostile runs are case TC-cli-3. None failed.

## Seeds

- state row accepts a trailing newline and non-ASCII digits: parse sdlc/state-20261008101500 followed by a newline gives kind state, because $ matches before a final newline. Fullwidth and Arabic-Indic digits give kind state with a non-ASCII ts. S-007 left both open. (`skills/sdlc/branches.py`)
- CLI parse has no way to pass ledger ids: branches.py parse has no --ids flag, so the known flag is always null at the CLI. The ledger check is reachable only through the function. (`skills/sdlc/branches.py`)
