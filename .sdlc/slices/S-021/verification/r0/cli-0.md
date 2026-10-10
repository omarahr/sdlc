# Verification: S-021, profile cli, round 0

- Commit: fecc565
- Verdict: all 9 cases pass (no refutation)
- Environment: Node 24.19, Python 3.14.7, git, scratch repos from testkit cli-runner, PR lists from --prs files (no gh, no network)
- Test file: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- Transcripts: `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt`
- Command: `VERIFY_WT=<worktree of sdlc/S-021> VERIFY_BASE=<worktree of main> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`

## TC-cli-1 (VS-1, R-053): Active slice branch found by parse under feature/PROJ-1-{name}; sdlc/S-1, feature/PROJ-1-sdlc-foo and a branch whose ledger lacks its id are not active

- Given: one repo, in-progress slice on feature/PROJ-1-S-1 (and, in a second repo, only foreign branches)
- When: run next-action.py --repo
- Then: checkout is feature/PROJ-1-S-1 in the first repo; null and a plan-phase S-1 in the second
- Expected vs actual: equal
- Result: pass
- Spec source: R-053 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:51`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-2 (VS-1, R-053): A checked-out slice branch is the active one and needs no checkout

- Given: two in-progress branches, S-2 checked out
- When: run next-action.py
- Then: checkout null, next.slice.id S-2
- Expected vs actual: equal
- Result: pass
- Spec source: R-053 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:74`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-3 (VS-1, R-053): Hostile branch names (fullwidth digit, flag-like, 200 chars, confusable, zero-width, unicode, huge int) are never active and cause no traceback

- Given: 8 hostile branches whose ledger marks S-1 in progress
- When: run next-action.py
- Then: checkout null, no Traceback
- Expected vs actual: equal
- Result: pass
- Spec source: R-053 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:84`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-4 (VS-2, R-054): State and e2e heads give merge commands; e2e-area, foreign and default-format heads give none; prefix fallback for a state head with no timestamp; none in stack or direct mode

- Given: pr mode, custom format, PR list file
- When: run next-action.py with --prs
- Then: merge 12 (state), merge 13 (e2e), none for e2e-ui/foreign/sdlc heads, merge 17 for state-abc, wait for a blocked state head
- Expected vs actual: equal
- Result: pass
- Spec source: R-054 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:99`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-5 (VS-3, R-054): Lowercased head resolves to ledger id S-1; merged lowercased head gives retryMerge with pr recorded; unknown id ignored; non-lower format rejects a lowercased head

- Given: format feature/PROJ-1-{name:lower}
- When: run next-action.py with open and merged PR lists
- Then: retryMerge for S-1 with awaiting-merge and pr https://example.test/pr/4; no retryMerge for s-9 or for lowercase head under the strict format
- Expected vs actual: equal
- Result: pass
- Spec source: R-054 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:120`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-6 (VS-4, R-054): Stack milestone head holds the run with id and url; e2e, foreign and default-format heads do not; pr mode does not hold

- Given: stack mode, milestone M-2, custom format
- When: run next-action.py
- Then: wait naming M-2 and the pr url; not wait for the other heads
- Expected vs actual: equal
- Result: pass
- Spec source: R-054 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:140`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-7 (VS-5, R-055, R-077): Absent, empty and null branchFormat fall back to sdlc/{name} for all five recognitions; non-string and invalid formats return a clear error JSON without a trace

- Given: config variants, direct and pr mode
- When: run next-action.py
- Then: fallback recognized; error reason names the branch format
- Expected vs actual: equal
- Result: pass
- Spec source: R-055 acceptance R-077 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:155`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-8 (VS-6, R-076): Decision output is identical with and without the foreign head feature/PROJ-1-sdlc-foo across the sync, slice-PR, stack-hold and active-branch decisions

- Given: one custom-format repo per decision
- When: run next-action.py twice, with and without the foreign head
- Then: deep-equal JSON; merges are 12 and 13 only
- Expected vs actual: equal
- Result: pass
- Spec source: R-076 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:183`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## TC-cli-9 (VS-7, R-077): Default format gives byte-equal decisions to main for the same inputs

- Given: five PR-list shapes and one active branch
- When: run main's and the slice's next-action.py on the same repo
- Then: equal exit status and JSON
- Expected vs actual: equal
- Result: pass
- Spec source: R-077 acceptance
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:202`
- Evidence: transcript and file-tree in `.sdlc/slices/S-021/verification/r0/logs/cli-0-transcripts.txt` (section named for the case id; every tree diff reads unchanged)

## Attacks
- hostile branch names: no traceback, never active (TC-cli-3)
- invalid branchFormat values (123, list, object, true, no placeholder, wrong placeholder, doubled, unclosed): clear error JSON, exit 0, no traceback (TC-cli-7)

## Seeds
- spec-vs-code: merged_heads uses parse, not name: R-054 quote says merged_heads is looked up with name(fmt, "slice", id=...). The code keys merged_heads by the parsed id instead. Behavior matches in every case run (TC-cli-5, TC-cli-9), so this is a wording difference only. (`skills/sdlc/next-action.py`)
- active_branch matches ledger ids without case under a non-lower format: active_branch compares ids with .lower() even when the format does not lower-case names. The slice parse pattern is case-sensitive, so no case was found where it changes a decision. (`skills/sdlc/next-action.py`)
