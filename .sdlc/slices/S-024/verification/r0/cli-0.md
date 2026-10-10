# Verification: S-024, profile cli, part 0, round 0

Commit: d23dd8a. Verdict: verified (14 cases pass, 0 fail, 5 seeds).

Environment: python3 janitor.py from a worktree of sdlc/S-024 at d23dd8a, node test runner, cli-runner testkit with scratch HOME, git identity and TMPDIR, macOS.

Full transcripts: `.sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt`.

## TC-cli-1 (VS-1): Default format removes done, rejected and unknown verify branches only

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: exit 0; removedBranches = S-001 (done), S-003 (rejected), S-999 (unknown) verify branches; in_progress, todo, no-status verify branches and 10 other names stay
- Actual: as expected; refs diff shows only the 3 refs removed
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:23`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-2 (VS-1): Slice, attempt, run, milestone, e2e and state branches of finished ids stay

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: removedBranches empty; tree unchanged
- Actual: as expected
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:37`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-3 (VS-2): Unicode, nested, wrong-prefix, attempt-verify and empty-part names stay

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: removedBranches empty, refs unchanged
- Actual: as expected
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:46`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-4 (VS-3): Custom format feature/sdlc/{name} sweeps verify branches and spares run, attempt, slice, milestone, todo-slice and prefix-collision names

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: removedBranches = done and unknown verify branches only
- Actual: as expected
- Result: pass
- Spec source: R-079 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:57`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-5 (VS-4): Derived format leaves old-format verify branch; parse of sdlc/S-001 gives kind null and list --kind slice is empty

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: branch stays, removedBranches empty; parse kind null; list branches []
- Actual: as expected
- Result: pass
- Spec source: R-085 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:70`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-6 (VS-5): Lowercase format resolves s-001 to S-001 (removed), s-002 todo stays, s-999 removed, run-1 stays

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: as stated
- Actual: as expected
- Result: pass
- Spec source: R-086 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:85`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-7 (VS-5): Mixed-case ledger id S-Ab resolves from s-ab; todo stays

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: s-ab verify branch removed, s-003 stays
- Actual: as expected
- Result: pass
- Spec source: R-086 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:98`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-8 (VS-6): Format without placeholder or with two placeholders gives a note, no branch removed, exit 0

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: note names the format; refs unchanged
- Actual: as expected (2 formats)
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-9 (VS-6): Malformed config.json gives a note, no branch removed, exit 0

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: no branch removed
- Actual: as expected
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-10 (VS-6): Missing, malformed, object, null, string, empty and unreadable slices.json: exit 0, a note, no branch removed

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: no branch removed, note present
- Actual: as expected (7 ledger shapes)
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:126`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-11 (VS-6): Scratch reaping still runs when the format is unusable

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: removedDirs 1, no branch removed, note names the format
- Actual: as expected
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:159`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-12 (VS-1): Stale worktree pinning a finished verify branch is pruned and the branch removed

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: removedBranches holds the branch
- Actual: as expected
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:179`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-13 (VS-1): Second run is idempotent; repo path with spaces and unicode works; --help exits 0

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: second run removes nothing; unicode path removes the verify branch
- Actual: as expected
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:190`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## TC-cli-14 (VS-1): janitor.py text holds no V_BRANCH or V_ID

- Given: a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches
- When: python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir
- Then / expected: no match
- Actual: no match
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:215`

```
see .sdlc/slices/S-024/verification/r0/logs/cli-0-run.txt
```

## Attacks

None beyond the cases. The security profile covers hostile names.

## Seeds

- janitor sweeps a verify-shaped branch whose id embeds the format prefix: Under feature/sdlc/{name}, the branch feature/sdlc/feature/sdlc/S-001-v0-http-api-0 parses with id feature/sdlc/S-001, which the ledger does not hold, so the janitor deletes it as unknown. Within spec (unknown ids go), but a nested name is deleted without a ledger match.
- janitor does not validate the format before the sweep: It calls branches.split only, not validate_format. A format with a stray brace (a/{x}-{name}) or whitespace gives no note, and branch a/{x}-S-999-v0-http-api-0 is deleted as unknown. A non-string branchFormat (5) falls back to the default silently (load_format design).
- janitor stops early on a non-object config.json before scratch reaping: With config.json holding [1,2], scratch_days calls config.get on a list. main() catches it and prints the note 'the janitor stopped early', but old sdlc- scratch dirs are not reaped. No branch is deleted. This code predates S-024.
- unusable format skips git worktree prune: The prune runs inside sweep_branches, so a stale worktree registration stays when the format cannot be read. No branch is deleted, so no harm to the slice.
- ledger of non-objects counts as an empty ledger: slices.json holding [1,'a',null] is a list, so it yields no ids and every verify branch is swept as unknown. An empty list [] behaves the same.
