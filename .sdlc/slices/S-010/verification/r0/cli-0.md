# Verification report: S-010, profile cli, round 0, part 0

- Commit: 79efa1c
- Verdict: all 8 cases pass
- Environment: python3 and git on macOS (Darwin 25.6), node test runner, cli-runner testkit with scratch HOME, real branches.py from branch sdlc/S-010
- Run log: `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-1 (VS-1): list --kind slice returns only slice branches sorted by name

- Given: A fixture repo holds slice, milestone, run, state, verify, attempt, e2e, foreign and tag-free branches
- When: branches.py list --kind slice
- Then: exit 0, empty stderr, keys ok/command/format/kind/branches, branches sdlc/S-001, sdlc/S-002, sdlc/S-fix-M-1-2, each with kind slice and id equal to tail, known null
- Actual: exactly as expected; foreign branches (main, other/S-009, S-003, sdlc/feature-x) absent; tree unchanged
- Result: pass
- Spec source: R-025 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:18`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-1'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-2 (VS-2): run and attempt sort by n as integers, ties by branch name

- Given: Branches created in order run-100, 10, 2, 1 and attempts of S-001, S-002, S-003 with n 1, 2, 10, 100
- When: branches.py list --kind run, then --kind attempt
- Then: run n order 1,2,10,100 as JSON integers; attempts order S-001-attempt-1, S-003-attempt-1, S-001-attempt-2, S-002-attempt-2, S-001-attempt-10, S-001-attempt-100
- Actual: exactly as expected
- Result: pass
- Spec source: R-094 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:30`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-2'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-3 (VS-3): Remote refs, tags, notes refs, detached HEAD never appear and never change a real branch

- Given: Repo with sdlc/S-001 branch, remote-tracking ref origin/sdlc/S-009, tags sdlc/S-008, sdlc/S-001 and heads/sdlc/S-001, a notes ref, then a detached HEAD
- When: branches.py list --kind slice before and after detaching
- Then: only sdlc/S-001 both times, exit 0
- Actual: only sdlc/S-001 both times, exit 0
- Result: pass
- Spec source: R-025 quote (local branches via refs/heads/)
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:44`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-3'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-4 (VS-4): The branch format changes what list returns

- Given: Repo with sdlc/S-001 and feature/PROJ-1-* and feature/lo-s-001 branches; a repo with config.branchFormat; invalid formats; invalid config JSON
- When: list with --format feature/PROJ-1-{name}, feature/lo-{name:lower}, config only, --format over config, no-placeholder format, brace format, bad config
- Then: override and config select only matching branches; --format beats config; default format is sdlc/{name}; invalid formats exit 2 with the same error as parse and no traceback
- Actual: exactly as expected
- Result: pass
- Spec source: R-025 acceptance (format from plan notes and parse behavior)
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:63`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-4'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-5 (VS-5): Empty repo, non-git directory, missing path, file path, bare repo, bad kind

- Given: Repo with no commit; unborn branch; plain directory; missing path; file path; bare repo with pushed branch; unknown kind; missing flags; empty --repo
- When: branches.py list in each state
- Then: empty repo: exit 0 and branches []; non-git: exit 2, ok false, 'not a git repository', no traceback; missing and file paths: exit 2 JSON; bare repo lists the pushed branch; unknown kind exit 2; scanned trees unchanged
- Actual: exactly as expected
- Result: pass
- Spec source: R-025 plan notes and ADR e3f4
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:93`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-5'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-6 (VS-7): Each kind returns its parts and the branch and id keys

- Given: Fixture repo with one branch of each kind
- When: branches.py list --kind <each kind>, and parse on the first branch
- Then: every kind returns its parts (id, n, ts, round, profile, part, area), keys ok/command/format/kind/branches, known null, entry equals parse output without ok/command/format; kinds with no branch give []
- Actual: exactly as expected
- Result: pass
- Spec source: R-025 plan notes (branches[].branch and branches[].id)
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:126`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-6'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-7 (VS-1): Help, idempotency, unicode and spaces in the repo path, equals-form flags, relative --repo

- Given: Wide fixture repo; repo path with spaces and unicode
- When: list --help; two identical runs; --repo=<path> --kind=slice; --repo . with cwd
- Then: help exit 0; identical stdout twice; the unicode path lists sdlc/S-001; equals form equals spaced form
- Actual: exactly as expected
- Result: pass
- Spec source: R-025 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:158`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-7'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## TC-cli-8 (VS-2): 3000 run branches stay fast and sorted

- Given: 3000 branches sdlc/run-1..3000 made with update-ref --stdin
- When: list --kind run
- Then: 3000 entries, n from 1 to 3000 in order
- Actual: 3000 entries in order, 264 ms
- Result: pass
- Spec source: R-025 acceptance
- Test: `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:172`
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-8'`
- Evidence: transcripts and tree diffs in `.sdlc/slices/S-010/verification/r0/logs/cli-0-run.txt`

## Attacks

None. The security profile covers hostile values (VS-6).

## Seeds

- list ignores a checked-out unborn branch: In a repo with no commit where HEAD points at sdlc/S-001, list --kind slice returns []. This follows from for-each-ref and the plan says an empty repo gives []. No action needed unless a caller expects the unborn branch. (skills/sdlc/branches.py)
- cli-runner reaps nothing for git case-insensitive branch names: On a case-insensitive filesystem git refuses two branches that differ only by case (feature/PROJ-1-S-001 and feature/proj-1-s-001). A fixture using {name:lower} needs a distinct name. Not a product defect. (skills/sdlc/test/testkit/cli-runner.mjs)
