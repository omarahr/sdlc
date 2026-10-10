# Verify security: S-027b, round 0, part 0
Commit: f346b0b. Verdict: pass (6 of 6 cases, 7 attacks, all held).

Threat model: branch names in the user's repo are untrusted data; the integrator must delete only the attempt branches of its slice. Source: R-093 and plan step 4.

Environment: Node 24, python3, git on macOS APFS, scratch repos from cli-runner, no network

Charter: explore the Clean up list-and-delete with hostile and look-alike branch names to find a delete outside the slice's attempts.

## TC-security-1 Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like
- Given: scratch git repo with the branches named in the test
- When: run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell)
- Then: Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like names survive; only the two S-001 attempt branches go
- Expected: survive; deleted == [attempt-1, attempt-2]
- Actual: survive; deleted == [attempt-1, attempt-2]
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:39`
- Command: `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence: run log at `.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt`

## TC-security-2 Corpus-named attempt branches of other slices (injection, flag-like, format strings, confu
- Given: scratch git repo with the branches named in the test
- When: run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell)
- Then: Corpus-named attempt branches of other slices (injection, flag-like, format strings, confusables, traversal) survive; no shell runs
- Expected: only sdlc/S-001-attempt-1 deleted; no pwned file
- Actual: only sdlc/S-001-attempt-1 deleted; no pwned file
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:48`
- Command: `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence: run log at `.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt`

## TC-security-3 Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing
- Given: scratch git repo with the branches named in the test
- When: run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell)
- Then: Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing
- Expected: no match, no deletion, no pwned file
- Actual: no match, no deletion, no pwned file
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:67`
- Command: `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence: run log at `.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt`

## TC-security-4 Under format {name}, a branch deletes through one argv entry; a dash-leading name is refus
- Given: scratch git repo with the branches named in the test
- When: run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell)
- Then: Under format {name}, a branch deletes through one argv entry; a dash-leading name is refused by git check-ref-format so it cannot become a flag
- Expected: S-001-attempt-1 deleted, neighbour kept
- Actual: S-001-attempt-1 deleted, neighbour kept
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:77`
- Command: `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence: run log at `.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt`

## TC-security-5 Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-cas
- Given: scratch git repo with the branches named in the test
- When: run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell)
- Then: Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-casing would fold the long s
- Expected: no lookalike deleted
- Actual: no lookalike deleted
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:87`
- Command: `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence: run log at `.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt`

## TC-security-6 Arabic-Indic digit attempt numbers match only their own slice id
- Given: scratch git repo with the branches named in the test
- When: run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell)
- Then: Arabic-Indic digit attempt numbers match only their own slice id
- Expected: S-001 branch deleted, S-002 kept
- Actual: S-001 branch deleted, S-002 kept
- Result: pass
- Test: `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:98`
- Command: `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence: run log at `.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt`

## Attacks
- A-1 [held] Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like names survive; only the two S-001 attempt branches go -> survive; deleted == [attempt-1, attempt-2]
- A-2 [held] Corpus-named attempt branches of other slices (injection, flag-like, format strings, confusables, traversal) survive; no shell runs -> only sdlc/S-001-attempt-1 deleted; no pwned file
- A-3 [held] Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing -> no match, no deletion, no pwned file
- A-4 [held] Under format {name}, a branch deletes through one argv entry; a dash-leading name is refused by git check-ref-format so it cannot become a flag -> S-001-attempt-1 deleted, neighbour kept
- A-5 [held] Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-casing would fold the long s -> no lookalike deleted
- A-6 [held] Arabic-Indic digit attempt numbers match only their own slice id -> S-001 branch deleted, S-002 kept
- A-7 [out-of-scope] Branch sdlc/ſ-001-attempt-1 (U+017F), filter by upper-casing instead of lower-casing -> upper-casing folds it onto S-001 and would delete it; the prompt says ignoring case and lower-casing does not match. On macOS APFS git itself cannot hold both sdlc/ſ-001 and sdlc/S-001 branches

## Seeds
- Integrator step 2 says 'ignoring case' without naming a method: A literal reader who upper-cases or casefolds the id would match a branch named with U+017F (long s) as S-001. Lower-casing is safe. Naming 'lower-case both sides' would remove the doubt. Needs a branch name an attacker already made in the repo, so it is outside the threat model. (skills/sdlc/prompts/integrator.md)
