# Verify cli, S-022, round 0

Slice S-022, profile cli, part 0, round 0, commit 7813019. Verdict: all 6 scenarios pass (13 cases).

Environment: Node 24, Python 3.14.7, git; scratch repos with bare local remote; cli-runner, attack-corpus, stub-server (gh shim) from the testkit; no network

Test file: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`. Transcripts: `.sdlc/slices/S-022/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-1 (VS-1): patch-slice creates feature/PROJ-1-S-001 from feature/PROJ-1-M-1

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: slice and milestone branches use the format; no sdlc/S-001, sdlc/M-1; milestone pushed to origin
- Actual: exit 0, branch feature/PROJ-1-S-001; local and remote M-1 exist; no sdlc/ branches
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:38`

## TC-cli-2 (VS-1): lowercase format and default format

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: feature/s-001 and feature/m-1; sdlc/S-001 and sdlc/M-1 by default
- Actual: as expected
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:53`

## TC-cli-3 (VS-1): hostile ids (150 argv runs of traversal, flag-like, unicode digits, control, injection, whitespace, oversized) on patch-slice and base-branch

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: clean refusal (JSON ok false or argparse usage), nonzero exit, no traceback, base-branch leaves tree unchanged
- Actual: all 150 runs refused or answered without traceback; base-branch never changed the tree; patch-slice of an unknown id leaves a branch (see seed 1, pre-existing order)
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:68`

## TC-cli-4 (VS-1): hostile ids present in slices.json

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: no traceback, tree consistent on refusal
- Actual: git refusals come back as JSON exit 2; no traceback; no stray branch after refusal
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:89`

## TC-cli-5 (VS-2): awaiting-merge dependency branch found through the format

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: patch-slice and base-branch answer feature/PROJ-1-S-001; decoy sdlc/S-001 unused; S-002 contains the dependency work
- Actual: as expected
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:103`

## TC-cli-6 (VS-2): dependency not awaiting-merge, or branch gone

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: fall back to the milestone branch
- Actual: feature/PROJ-1-M-1 in both cases; S-002 cut without creating a dependency branch
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:103`

## TC-cli-7 (VS-3): base-branch names the milestone branch

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: feature/PROJ-1-M-1, feature/m-1, run branch for a shipped milestone and for no milestone; unknown id refused
- Actual: as expected; unknown slice gives JSON ok false, exit 2, no traceback; base-branch changes nothing
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:128`

## TC-cli-8 (VS-3): invalid branchFormat (no placeholder, two placeholders) in config

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: clear refusal, nonzero exit, no traceback
- Actual: JSON ok false with the format named, exit 2, for base-branch and patch-slice
- Result: pass (spec source: R-056 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:128`

## TC-cli-9 (VS-4): prune deletes shipped feature/PROJ-1-M-2 and keeps feature/PROJ-1-M-1 held by an awaiting-merge slice

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: M-2 deleted, M-1 kept, M-3 created
- Actual: as expected
- Result: pass (spec source: R-096 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:163`

## TC-cli-10 (VS-5): prune classifies by kind under custom format

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: -e2e, S-, run-, other, extra-slash and look-alike branches stay
- Actual: all stayed; M-1-x stayed
- Result: pass (spec source: R-057 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:163`

## TC-cli-11 (VS-5): default format prune; worktree-held branch; no MILESTONE_BRANCH or sdlc/{ in file

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: sdlc/M-1 deleted, sdlc/M-1-e2e kept, sdlc/M-5 (held in a worktree) kept; file clean
- Actual: as expected
- Result: pass (spec source: R-057 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:198`

## TC-cli-12 (VS-6): run branch is advanced and config.runBranch unchanged (custom format, default format, run branch outside the format)

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: milestone branch contains moved main; config.json bytes unchanged; run branch name not rewritten
- Actual: as expected in all three
- Result: pass (spec source: R-058 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:221`

## TC-cli-13 (VS-5): prune and patch-slice call no gh

- Given: stack-mode scratch repo with bare remote
- When: state-write.py run as built, from a scratch cwd
- Then / expected: gh shim sees 0 calls
- Actual: 0 calls
- Result: pass (spec source: R-057 acceptance)
- Test: `.sdlc/slices/S-022/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:241`

## Attacks

150 hostile slice id runs (traversal, flag-like, unicode digits, control characters, injection, whitespace, oversized) on patch-slice and base-branch: no traceback; base-branch never changed the tree.

## Seeds

- patch-slice makes and checks out a branch for an unknown slice id (skills/sdlc/state-write.py): ensure_slice_branch runs before the slice lookup, so patch-slice with an id absent from slices.json creates feature/PROJ-1-<id> and leaves HEAD on it, then refuses. Same order as before the slice (old code made sdlc/<id>). Seen with ids such as /etc, S-٣, -1.
- state-write does not validate a format for git safety (skills/sdlc/state-write.py): branchFormat values such as 'has space/{name}', 'x~/{name}', '/{name}', 'a/{name}.lock' and '{x}/{name}' reach git. base-branch prints an invalid name with exit 0. patch-slice returns the raw git error as JSON, exit 2, and changes nothing. Format '{x}/{name}' is accepted. branches.validate_format already rejects these but state-write does not call it.
- non-string or empty branchFormat falls back to the default silently (skills/sdlc/branches.py): branchFormat 5 or ["a"] gives sdlc/ names with no warning. This matches load_format semantics in the spec. No repo-level format file exists in this version, so the plan note about a repo file does not apply.
- prune treats M-0, leading zeros and non-ASCII digits as milestone ids (skills/sdlc/branches.py): The parse pattern uses \d on str, so feature/PROJ-1-M-٣ counts as a shipped milestone branch and is deleted. The old regex behaved the same, so this is parity, not a regression.
