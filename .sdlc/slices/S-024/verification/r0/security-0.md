# Verification: security part 0

- Slice: S-024
- Profile: security
- Round: 0
- Commit: d23dd8a
- Verdict: pass, no in-scope failure

Environment: python3 janitor.py in scratch git repos via cli-runner, macOS case-insensitive filesystem, node --test.

Threat model: the ledger, config and branch names in the repo are trusted for shape, untrusted for content. The janitor must not delete a non-verify branch.

## TC-security-1 (VS-1): Default format removes only done, rejected and unknown verify branches

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: removedBranches is exactly sdlc/S-001-v0-http-api-0, sdlc/S-003-v2-cli-1, sdlc/S-999-v0-a-0
- Expected: removedBranches is exactly sdlc/S-001-v0-http-api-0, sdlc/S-003-v2-cli-1, sdlc/S-999-v0-a-0
- Actual: as expected; 16 keep branches intact (run, slice, attempt, attempt verify, milestone, e2e, e2e-area, state, in_progress, todo, no-status)
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:27`

```
removed: S-001-v0, S-003-v2, S-999-v0; kept: all others
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-2 (VS-2): Non-verify kinds and unparseable names stay

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: no non-verify or unparseable branch is deleted
- Expected: no non-verify or unparseable branch is deleted
- Actual: 15 hostile names created (unicode, nested, empty id, wrong case); only two verify-shaped names went: sdlc/S-001-v٠-a-0 (done id) and sdlc/x/S-001-v0-a-0 (unknown id)
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:48`

```
removed: sdlc/S-001-v٠-a-0, sdlc/x/S-001-v0-a-0
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-3 (VS-2): Attack corpus used as branch tails

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: exit 0; only verify-shaped names are removed
- Expected: exit 0; only verify-shaped names are removed
- Actual: exit 0; 55 valid names created from 7 families, 51 verify-shaped with unknown id removed; all removed names match sdlc/*-v0-a-0
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:61`

```
status 0; no file created by shell metacharacter names
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-4 (VS-3): Custom format and prefix collisions

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: S-001 and S-999 verify branches removed; run, attempt, attempt verify, slice, milestone, state, old-format and prefixed-outside names stay
- Expected: S-001 and S-999 verify branches removed; run, attempt, attempt verify, slice, milestone, state, old-format and prefixed-outside names stay
- Actual: as expected; one extra: feature/sdlc/feature/sdlc/S-001-v0-a-0 (id feature/sdlc/S-001, unknown) removed
- Result: pass
- Spec source: R-060, R-079 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:79`

```
removed 3 verify-shaped names
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-5 (VS-3): Suffix format {name}-wip and lowercase format keep run and attempt

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: only verify branches of S-001 go; run-1-wip and S-001-attempt-1-wip stay
- Expected: only verify branches of S-001 go; run-1-wip and S-001-attempt-1-wip stay
- Actual: as expected
- Result: pass
- Spec source: R-079 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:90`

```
removed: S-001-v0-a-0-wip; p/s-001-v0-a-0
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-6 (VS-4): Old-format verify branch stays under a derived format

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: sdlc/S-001-v0-http-api-0 and sdlc/S-999-v0-a-0 stay; parse of sdlc/S-001 gives kind null; list --kind slice is empty
- Expected: sdlc/S-001-v0-http-api-0 and sdlc/S-999-v0-a-0 stay; parse of sdlc/S-001 gives kind null; list --kind slice is empty
- Actual: as expected
- Result: pass
- Spec source: R-085 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:99`

```
parse kind null; list branches []
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-7 (VS-6): Unusable format or ledger gives a note and deletes nothing

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: exit 0, no branch removed, note names the cause, old scratch dir reaped
- Expected: exit 0, no branch removed, note names the cause, old scratch dir reaped
- Actual: no-placeholder, two placeholders, malformed config, deep nesting, unreadable config and six bad ledger shapes all held. Format 'a{b}/{name}' gives no note, nothing deleted. Array config crashes in scratch_days (pre-existing), no deletion. branchFormat 5 falls back to the default format and deletes
- Result: pass
- Spec source: R-060 (Approach: unreadable format becomes a note)
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:111`

```
see attack log A-9-*
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-8 (VS-6): Hostile ledger rows

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: run and attempt branches stay, exit 0
- Expected: run and attempt branches stay, exit 0
- Actual: held; id as list or dict stops the janitor before scratch reaping (pre-existing code); int id under {name:lower} stops it inside the sweep
- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:145`

```
see attack log A-10-*
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-9 (VS-1): Checked-out verify branch

- Given: scratch git repo with a ledger and branches
- When: janitor.py --repo runs with a scratch TMPDIR
- Then: branch is not removed, a note records the git error
- Expected: branch is not removed, a note records the git error
- Actual: held
- Result: pass
- Spec source: R-060
- Test: `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:193`

```
note: cannot delete branch used by worktree
```
Attack log: `.sdlc/slices/S-024/verification/r0/logs/security-0-attacks.jsonl`

## Attacks

- AT-1 (held): Explore branch classification with verify-shaped lookalikes (run-1-v0-a-0, state-ts-v0-a-0, M-1-v0-a-0, attempt verify) to find deletion of a run, state or attempt branch. Input: sdlc/run-1-v0-a-0, sdlc/state-20261010000000-v0-a-0, sdlc/M-1-v0-a-0, sdlc/S-001-attempt-2-v0-a-0. Observed: run-1-v0-a-0, state-...-v0-a-0 and M-1-v0-a-0 are verify shaped with unknown id and are removed; the attempt verify branch stays.
- AT-2 (held): Explore parse with unicode digits to find a non-verify branch swept. Input: sdlc/S-001-v٠-a-0. Observed: Python \d matches the Arabic-Indic zero; branch parses as verify of done S-001 and goes.
- AT-3 (held): Explore namespace collisions with nested slashes and repeated prefix. Input: sdlc/x/S-001-v0-a-0, feature/sdlc/feature/sdlc/S-001-v0-a-0. Observed: removed because the id holds a slash and is unknown; a user branch such as sdlc/release-v2-beta-1 would go the same way.
- AT-4 (held): Explore the attack corpus (traversal, injection, flags, control chars, format strings) as branch names. Input: 55 valid ref names. Observed: exit 0; only git branch -D with list argv; no side file.
- AT-5 (held): Explore format prefix confusion. Input: feature/sdlc/{name} with sdlc/S-001-v0-a-0 and x/feature/sdlc/S-001-v0-a-0. Observed: stayed.
- AT-6 (held): Explore unusable formats. Input: no placeholder, two placeholders, malformed JSON, array JSON, 100000-deep JSON, unreadable config. Observed: no deletion in every case.
- AT-7 (out-of-scope): Explore config type confusion. Input: branchFormat: 5. Observed: load_format treats it as absent, default format applies, verify branch removed, no note.
- AT-8 (out-of-scope): Explore ledger type confusion. Input: id as list, dict or int; status as list or DONE; duplicate ids; case twins S-001 done and s-001 todo under {name:lower}. Observed: none deleted; list and dict ids stop the janitor before scratch reaping; int id under lower stops mid-sweep; twin ids resolve to the first row and the todo twin's branch is removed.
- AT-9 (held): Explore lowercase format against run, attempt, milestone, e2e-area branches in upper case. Input: p/run-1, p/s-001-attempt-1, p/m-1-e2e-x. Observed: stayed.
- AT-10 (held): Explore a checked-out verify branch. Input: HEAD on sdlc/S-001-v0-a-0. Observed: git refused, note recorded.

## Seeds

- janitor sweeps any verify-shaped branch with an unknown id, including ids with slashes: Under sdlc/{name}, a user branch like sdlc/x/S-001-v0-a-0 or sdlc/release-v2-beta-1 parses as verify with an unknown id and is deleted. R-060 allows it; a stricter id shape (S-... or M-...) would protect user branches. (`skills/sdlc/janitor.py`)
- janitor accepts a non-string branchFormat as the default format: branchFormat 5 in config.json makes load_format return the default, so the janitor sweeps sdlc/* with no note. A wrong-typed value should be a note and no sweep. (`skills/sdlc/branches.py`)
- janitor stops before scratch reaping on ledger ids that are not strings, and on a non-object config: Ledger row id as list or dict raises TypeError in main; array config raises AttributeError in scratch_days. Both end in the 'stopped early' note with no scratch reaping. An int id under {name:lower} raises inside parse after earlier deletions, so removedBranches is lost from the output. State files are trusted, so this is a hardening gap. (`skills/sdlc/janitor.py`)
- janitor resolves case-twin ledger ids to the first row: Under {name:lower} with S-001 done and s-001 todo, p/s-001-v0-a-0 is removed. Ledger ids are unique in practice. (`skills/sdlc/janitor.py`)
- janitor uses split, not validate_format: A format such as a{b}/{name} produces no note; nothing is deleted because no branch matches. (`skills/sdlc/janitor.py`)
