# S-027b · integrator deletes attempt branches found through branches.py list
Verdict: RELEASED
Commit under test: bb39272 (verified at f346b0b, gate at 2094ebb) · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 24 | 24 | 0 | 0 | 0 / 0 | 9 |

## Summary
The integrator now finds the attempt branches of a slice with `branches.py list --kind attempt`. It keeps the entries whose id equals the slice id, ignoring case. It deletes each one locally. In `pr`, `mr` and `stack` modes it also deletes the branch on origin. This works under a custom branch format, and the parent walk uses the same step.
Three verifiers ran in round 0: cli, contract and security. They ran the exact command text of the prompt in scratch git repos. Seven attacks with hostile and look-alike branch names all held.
The verifiers found no blocking defect. The spec-fidelity and regression verifiers held. The review found nothing. The gate passed with 743 tests, 742 passed, 0 failed, 1 skipped.
Nine seeds stay open. All are non-blocking.

## Open risks
- Step 1 of Clean up still spells `sdlc/<id>-v*`. It misses verify branches under a custom format. Slice S-027c must fix it.
- `branches.py list` reads local branches only. An attempt branch that exists only on origin stays there.
- The prompt writes the branch unquoted in `git branch -D` and `git push origin --delete`. `branches.py` accepts shell characters in a format. The format is owner-controlled, so the risk is low. Quote the branch in the prompt.
- The prompt does not say to continue with the next branch after a failed command in step 2. Step 4 sends failures to `notes`.
- The prompt says "ignoring case" without a method. Lower-casing both sides is safe. Upper-casing or case folding would match a long s (U+017F) as S. This needs a branch name that an attacker already made in the repo.
- Test T-R-093c copies the id filter of the prompt. A change to the prompt rule would not fail that test.
- Two tests pin the same `splitInto` and never-delete sentences. The old attempt test no longer checks attempt branches.
- No number in the spec was measured. No case is blocked.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-093 | "In `pr`, `mr` and `stack` modes the integrator deletes every attempt branch of the slice locally and on the remote with `git push origin --delete`. It finds them through `branches.py list --kind attempt` filtered to the slice, under a custom format too." | VS-1 to VS-6 | TC-cli-1 to 9, TC-contract-1 to 9, TC-security-1 to 6 | pass |

## Scenarios
### VS-1 · Default format: the list command gives the slice's attempt branches and the prompt's steps delete them
Profiles: cli, contract. Risk: A wrong list or filter leaves dead branches in the default layout.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Default format: list returns two attempt branches and delete removes only them | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-1` |
| TC-contract-1 | Default format: list gives both attempt branches; local delete leaves the rest | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:35` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-1 · Default format: list returns two attempt branches and delete removes only them · PASS
- **Given** Repo with sdlc/S-001-attempt-1, -attempt-2, sdlc/S-001, sdlc/S-001-v0 **When** Run the list command from integrator.md step 2, filter id S-001, run git branch -D per entry **Then** Only the two attempt branches go; sdlc/S-001 and sdlc/S-001-v0 stay
- **Expected** Only the two attempt branches go; sdlc/S-001 and sdlc/S-001-v0 stay **Actual** Only the two attempt branches go; sdlc/S-001 and sdlc/S-001-v0 stay
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-contract-1 · Default format: list gives both attempt branches; local delete leaves the rest · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** list gives sdlc/S-001-attempt-1, -attempt-2; after git branch -D, main, sdlc/S-001, sdlc/S-001-v0, sdlc/S-002-attempt-1 remain
- **Expected** list gives sdlc/S-001-attempt-1, -attempt-2; after git branch -D, main, sdlc/S-001, sdlc/S-001-v0, sdlc/S-002-attempt-1 remain **Actual** list gives sdlc/S-001-attempt-1, -attempt-2; after git branch -D, main, sdlc/S-001, sdlc/S-001-v0, sdlc/S-002-attempt-1 remain
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (log): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

</details>

### VS-2 · Custom lowercase format: the id comes back as s-001 and the case-blind filter still keeps it
Profiles: cli, contract. Risk: A case-sensitive filter finds nothing and leaves dead branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | Lowercase format: id s-001 matches S-001 case-blind; S-0010 and S-001a stay | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-2` |
| TC-cli-3 | Mixed-case format and letter-suffix id S-027b | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-2b` |
| TC-contract-2 | Lowercase format: id is s-001, case-blind filter keeps it, no collision with s-0010 or s-001a | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:43` |
| TC-contract-3 | Mixed-case {name} format and S-027b suffix id | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:55` |
| TC-contract-4 | Attempt numbers 1 to 12 come back in numeric order | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:60` |
| TC-contract-5 | Property: list plus case-blind filter equals a reference model built from the spec text | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:66` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-2 · Lowercase format: id s-001 matches S-001 case-blind; S-0010 and S-001a stay · PASS
- **Given** branchFormat feature/PROJ-1-{name:lower} **When** List, filter ignoring case, delete **Then** List prints id s-001; an exact-case filter finds 0; the case-blind filter finds 2; other ids stay
- **Expected** List prints id s-001; an exact-case filter finds 0; the case-blind filter finds 2; other ids stay **Actual** List prints id s-001; an exact-case filter finds 0; the case-blind filter finds 2; other ids stay
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-cli-3 · Mixed-case format and letter-suffix id S-027b · PASS
- **Given** branchFormat work/{name}, branches for S-027, S-027b, S-027bc **When** Filter with id s-027B **Then** Only work/S-027b-attempt-1 is deleted
- **Expected** Only work/S-027b-attempt-1 is deleted **Actual** Only work/S-027b-attempt-1 is deleted
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-contract-2 · Lowercase format: id is s-001, case-blind filter keeps it, no collision with s-0010 or s-001a · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** S-001 gives 2 branches in order; S-027b and S-0010 give one each; a case-sensitive filter on S-001 finds none
- **Expected** S-001 gives 2 branches in order; S-027b and S-0010 give one each; a case-sensitive filter on S-001 finds none **Actual** S-001 gives 2 branches in order; S-027b and S-0010 give one each; a case-sensitive filter on S-001 finds none
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (log): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

#### TC-contract-3 · Mixed-case {name} format and S-027b suffix id · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** S-027b matches team/S-027b-attempt-1 and -2 only, not S-027
- **Expected** S-027b matches team/S-027b-attempt-1 and -2 only, not S-027 **Actual** S-027b matches team/S-027b-attempt-1 and -2 only, not S-027
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (log): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

#### TC-contract-4 · Attempt numbers 1 to 12 come back in numeric order · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** order 1..12
- **Expected** order 1..12 **Actual** order 1..12
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (log): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

#### TC-contract-5 · Property: list plus case-blind filter equals a reference model built from the spec text · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** 1000 draws over 5 formats and 7 ids, all equal the model
- **Expected** 1000 draws over 5 formats and 7 ids, all equal the model **Actual** 1000 draws over 5 formats and 7 ids, all equal the model
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (property-run): 1000 draws over 5 formats and 7 ids, equal to the reference model, result pass

</details>

### VS-3 · Attempt branches of other slices and non-attempt branches stay
Profiles: cli, security. Risk: A loose filter or an unquoted name deletes a live branch or runs hostile text.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | Other slices and non-attempt branches survive | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-3` |
| TC-cli-5 | Hostile format prefixes do not break the delete commands | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-3b` |
| TC-security-1 | Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like | PASS | `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:39` |
| TC-security-2 | Corpus-named attempt branches of other slices (injection, flag-like, format strings, confu | PASS | `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:48` |
| TC-security-3 | Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing | PASS | `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:67` |
| TC-security-4 | Under format {name}, a branch deletes through one argv entry; a dash-leading name is refus | PASS | `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:77` |
| TC-security-5 | Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-cas | PASS | `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:87` |
| TC-security-6 | Arabic-Indic digit attempt numbers match only their own slice id | PASS | `.sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs:98` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-cli-4 · Other slices and non-attempt branches survive · PASS
- **Given** Branches of S-002, S-0010, S-001a, run-3, verify, user and bare names **When** List, filter S-001, delete **Then** Only attempt-1 and attempt-12 of S-001 go
- **Expected** Only attempt-1 and attempt-12 of S-001 go **Actual** Only attempt-1 and attempt-12 of S-001 go
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-cli-5 · Hostile format prefixes do not break the delete commands · PASS
- **Given** Formats with unicode, leading dash, whitespace, shell characters; flag-like corpus branch names **When** Run name, list and delete **Then** Unicode name deletes cleanly; dash-leading and whitespace formats are refused by branches.py; no injected file appears
- **Expected** Unicode name deletes cleanly; dash-leading and whitespace formats are refused by branches.py; no injected file appears **Actual** Unicode name deletes cleanly; dash-leading and whitespace formats are refused by branches.py; no injected file appears
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-security-1 · Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like · PASS
- **Given** scratch git repo with the branches named in the test **When** run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell) **Then** Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like names survive; only the two S-001 attempt branches go
- **Expected** survive; deleted == [attempt-1, attempt-2] **Actual** survive; deleted == [attempt-1, attempt-2]
- **Spec source:** R-093 acceptance; plan S-027b step 4 'never any other branch' · **Run:** `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence (attack): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt)

#### TC-security-2 · Corpus-named attempt branches of other slices (injection, flag-like, format strings, confu · PASS
- **Given** scratch git repo with the branches named in the test **When** run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell) **Then** Corpus-named attempt branches of other slices (injection, flag-like, format strings, confusables, traversal) survive; no shell runs
- **Expected** only sdlc/S-001-attempt-1 deleted; no pwned file **Actual** only sdlc/S-001-attempt-1 deleted; no pwned file
- **Spec source:** R-093 acceptance; plan S-027b step 4 'never any other branch' · **Run:** `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence (attack): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt)

#### TC-security-3 · Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing · PASS
- **Given** scratch git repo with the branches named in the test **When** run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell) **Then** Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing
- **Expected** no match, no deletion, no pwned file **Actual** no match, no deletion, no pwned file
- **Spec source:** R-093 acceptance; plan S-027b step 4 'never any other branch' · **Run:** `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence (attack): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt)

#### TC-security-4 · Under format {name}, a branch deletes through one argv entry; a dash-leading name is refus · PASS
- **Given** scratch git repo with the branches named in the test **When** run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell) **Then** Under format {name}, a branch deletes through one argv entry; a dash-leading name is refused by git check-ref-format so it cannot become a flag
- **Expected** S-001-attempt-1 deleted, neighbour kept **Actual** S-001-attempt-1 deleted, neighbour kept
- **Spec source:** R-093 acceptance; plan S-027b step 4 'never any other branch' · **Run:** `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence (attack): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt)

#### TC-security-5 · Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-cas · PASS
- **Given** scratch git repo with the branches named in the test **When** run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell) **Then** Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-casing would fold the long s
- **Expected** no lookalike deleted **Actual** no lookalike deleted
- **Spec source:** R-093 acceptance; plan S-027b step 4 'never any other branch' · **Run:** `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence (attack): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt)

#### TC-security-6 · Arabic-Indic digit attempt numbers match only their own slice id · PASS
- **Given** scratch git repo with the branches named in the test **When** run branches.py list --repo . --kind attempt, keep entries whose id equals S-001 ignoring case, run git branch -D per entry (argv, no shell) **Then** Arabic-Indic digit attempt numbers match only their own slice id
- **Expected** S-001 branch deleted, S-002 kept **Actual** S-001 branch deleted, S-002 kept
- **Spec source:** R-093 acceptance; plan S-027b step 4 'never any other branch' · **Run:** `node --test .sdlc/slices/S-027b/verification/r0/tests/security-0/integrator-cleanup.verify-security.test.mjs`
- Evidence (attack): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/security-0-run.txt)

</details>

### VS-4 · pr, mr and stack modes delete each attempt branch on origin; a missing remote ref is fine
Profiles: cli. Risk: A missing remote ref must not stop the other deletions.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | pr/mr/stack: remote attempt ref vanishes, missing remote ref is tolerated | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-4` |
| TC-cli-7 | Direct mode text names no push and no push happens | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-4b` |
| TC-cli-8 | No origin remote: failed push does not stop the other deletions | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-4c` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-6 · pr/mr/stack: remote attempt ref vanishes, missing remote ref is tolerated · PASS
- **Given** Bare origin holds attempt-1 only; attempt-2 is local **When** Run local delete and git push origin --delete for each **Then** attempt-1 vanishes on origin; push for attempt-2 exits 1 with 'remote ref does not exist' and the run continues; S-002 ref stays
- **Expected** attempt-1 vanishes on origin; push for attempt-2 exits 1 with 'remote ref does not exist' and the run continues; S-002 ref stays **Actual** attempt-1 vanishes on origin; push for attempt-2 exits 1 with 'remote ref does not exist' and the run continues; S-002 ref stays
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-cli-7 · Direct mode text names no push and no push happens · PASS
- **Given** Prompt step 2 text; origin holds attempt-1 **When** Run local-only cleanup **Then** Text lists only pr, mr and stack; origin keeps its ref
- **Expected** Text lists only pr, mr and stack; origin keeps its ref **Actual** Text lists only pr, mr and stack; origin keeps its ref
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-cli-8 · No origin remote: failed push does not stop the other deletions · PASS
- **Given** Repo without origin **When** Run delete and push for two attempt branches **Then** Both local branches go; push exits non-zero
- **Expected** Both local branches go; push exits non-zero **Actual** Both local branches go; push exits non-zero
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

</details>

### VS-5 · Parent walk: a finished rejected parent gets the same list-and-delete, an unfinished parent keeps its branches
Profiles: cli, contract. Risk: The parent walk must not delete the branches of a slice that is not finished.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 | Parent walk: step 3 text and per-parent list under a custom format | PASS | `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-5` |
| TC-contract-6 | Parent id list under a custom format keeps child attempts | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:89` |
| TC-contract-7 | Parent walk text keeps splitInto, stop rule, rejected rule and never-delete sentence | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:96` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-9 · Parent walk: step 3 text and per-parent list under a custom format · PASS
- **Given** S-013 and its children S-013a, S-013b under feature/{name:lower} **When** Run step 2 for the parent id, then for S-013a **Then** Parent attempts go, child attempts stay until their own id runs; text keeps splitInto and never-delete-unfinished
- **Expected** Parent attempts go, child attempts stay until their own id runs; text keeps splitInto and never-delete-unfinished **Actual** Parent attempts go, child attempts stay until their own id runs; text keeps splitInto and never-delete-unfinished
- **Spec source:** R-093 acceptance · **Run:** `SDLC_ROOT=$PWD LOG_DIR=$PWD/.sdlc/slices/S-027b/verification/r0/logs node --test .sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence (transcript): [run transcript](../../../.sdlc/slices/S-027b/verification/r0/logs/cli-0-transcripts.json)

#### TC-contract-6 · Parent id list under a custom format keeps child attempts · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** S-013 gives only s-013 attempts; S-013a gives only s-013a attempts
- **Expected** S-013 gives only s-013 attempts; S-013a gives only s-013a attempts **Actual** S-013 gives only s-013 attempts; S-013a gives only s-013a attempts
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (log): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

#### TC-contract-7 · Parent walk text keeps splitInto, stop rule, rejected rule and never-delete sentence · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** all phrases present
- **Expected** all phrases present **Actual** all phrases present
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (transcript): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

</details>

### VS-6 · Prompt text: no literal attempt pattern remains in Clean up, and the text passes the STE check
Profiles: contract. Risk: A leftover literal pattern misses branches under a custom format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-8 | Clean up holds no literal attempt pattern; step 1 points to step 2; mode list and remote-missing sentence present | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:106` |
| TC-contract-9 | ste-check.py passes on integrator.md | PASS | `.sdlc/slices/S-027b/verification/r0/tests/contract-0/integrator.verify-contract.test.mjs:119` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-8 · Clean up holds no literal attempt pattern; step 1 points to step 2; mode list and remote-missing sentence present · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** no sdlc/<id>-attempt, no -attempt-*; sdlc/<id>-v* kept in step 1
- **Expected** no sdlc/<id>-attempt, no -attempt-*; sdlc/<id>-v* kept in step 1 **Actual** no sdlc/<id>-attempt, no -attempt-*; sdlc/<id>-v* kept in step 1
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (transcript): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

#### TC-contract-9 · ste-check.py passes on integrator.md · PASS
- **Given** scratch git repo built by the test **When** the test runs the exact command text from integrator.md Clean up step 2 **Then** exit 0
- **Expected** exit 0 **Actual** exit 0
- **Spec source:** R-093 acceptance · **Run:** `npm-free: cd .sdlc/slices/S-027b/verification/r0 && VERIFY_WT=<worktree of sdlc/S-027b> node --test tests/contract-0/integrator.verify-contract.test.mjs`
- Evidence (log): [test run](../../../.sdlc/slices/S-027b/verification/r0/logs/contract-0-run.txt)

</details>

## How it was attacked
Security session, part 0. Charter: explore the Clean up list-and-delete with hostile and look-alike branch names to find a delete outside the slice's attempts. Threat-model boundary: branch names in the user's repo are untrusted data. The integrator must delete only the attempt branches of its slice. Seven attacks were tried: 7 held, 0 broke, 0 were out of scope. The cli verifier also tried hostile format prefixes: dash-leading, double-dash and whitespace formats are refused, and unicode works.

<details>
<summary>Attack table (7 attacks)</summary>

| Input | Expected | Observed | Result |
|---|---|---|---|
| Branches of S-002, S-0010, S-001a, S-0001, run, verify, user, feature and odd attempt-like names survive; only the two S-001 attempt branches go | survive; deleted == [attempt-1, attempt-2] | survive; deleted == [attempt-1, attempt-2] | held |
| Corpus-named attempt branches of other slices (injection, flag-like, format strings, confusables, traversal) survive; no shell runs | only sdlc/S-001-attempt-1 deleted; no pwned file | only sdlc/S-001-attempt-1 deleted; no pwned file | held |
| Ids with $(..), ;, backticks come back as JSON data, do not match S-001, run nothing | no match, no deletion, no pwned file | no match, no deletion, no pwned file | held |
| Under format {name}, a branch deletes through one argv entry; a dash-leading name is refused by git check-ref-format so it cannot become a flag | S-001-attempt-1 deleted, neighbour kept | S-001-attempt-1 deleted, neighbour kept | held |
| Long s, hyphen U+2010 and Kelvin sign ids do not equal S-001 under lower-casing; upper-casing would fold the long s | no lookalike deleted | no lookalike deleted | held |
| Arabic-Indic digit attempt numbers match only their own slice id | S-001 branch deleted, S-002 kept | S-001 branch deleted, S-002 kept | held |
| Branch sdlc/ſ-001-attempt-1 (U+017F), filter by upper-casing instead of lower-casing | not the slice | upper-casing folds it onto S-001 and would delete it; the prompt says ignoring case and lower-casing does not match. On macOS APFS git itself cannot hold both sdlc/ſ-001 and sdlc/S-001 branches | out-of-scope |

</details>

## Defects found on the way
- **Blocking defects:** none. No round, profile, core verifier or review found one.
- **Seeds**, all open:

| Seed | Found by | File |
|---|---|---|
| Step 1 still hardcodes the verify-branch literal | review | `skills/sdlc/prompts/integrator.md` |
| Old attempt test name no longer matches what it checks | review | `skills/sdlc/test/prompts.test.mjs` |
| T-R-093c re-implements the prompt's id filter in the test | review | `skills/sdlc/test/prompts.test.mjs` |
| list reads local branches only | plan | `skills/sdlc/prompts/integrator.md` |
| Prompt leaves the branch unquoted in git branch -D and git push origin --delete | verify cli | `skills/sdlc/prompts/integrator.md` |
| Failed remote delete for a missing ref exits 1 | verify cli | `skills/sdlc/prompts/integrator.md` |
| branches.py list reads local branches only | verify cli | `skills/sdlc/branches.py` |
| {name:upper} is not a valid branch format | verify contract | `skills/sdlc/branches.py` |
| Integrator step 2 says "ignoring case" without naming a method | verify security | `skills/sdlc/prompts/integrator.md` |

## Appendix
- Toolkit tools used: cli-runner (`skills/sdlc/test/testkit/cli-runner.mjs`), property (`skills/sdlc/test/testkit/property.mjs`), attack-corpus (see `.sdlc/testkit.json`).
- Tests that stay in the repo: `skills/sdlc/test/prompts.test.mjs:292` (T-R-093a), `:303` (T-R-093b), `:313` (T-R-093c) and `:277` (old attempt test).
- Plan: [plan-r0.json](../../slices/S-027b/verification/plan-r0.json).
- Profile evidence: [cli-0](../../slices/S-027b/verification/r0/cli-0.md), [contract-0](../../slices/S-027b/verification/r0/contract-0.md), [security-0](../../slices/S-027b/verification/r0/security-0.md).
- Core verifiers: [spec fidelity](../../slices/S-027b/verify-spec-fidelity-r0.md), [regression](../../slices/S-027b/verify-regression-r0.md), [security review](../../slices/S-027b/review-security-r0.md), [gate](../../slices/S-027b/gate-r0.md).
- Missing sources: failures.md does not exist (no failure was recorded). Only the security review lens ran. The integrator prune may delete the verification files linked above.
