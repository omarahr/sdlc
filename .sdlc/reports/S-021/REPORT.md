# S-021 · next-action.py recognizes branches through parse
Verdict: RELEASED
Commit under test: 4693587 · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 7 | 31 | 31 | 0 | 0 | 0 / 0 | 16 |

## Summary
`next-action.py` now reads `branchFormat` once and recognizes every branch through `branches.parse`. This covers the active slice branch, slice and state heads, e2e heads and the stack milestone hold. A missing or empty format falls back to `sdlc/{name}`. The cli, contract and security profiles ran 31 cases in round 0. All cases passed. 585 default-format comparisons against main showed no difference, and two property runs of 1000 fixtures each found no violation. The core verifiers held both rounds. Round 1 followed one review finding: two security tests were promoted into the suite. The gate ran the full suite: 685 tests, 684 passed, 0 failed, 1 skipped. No blocking defect was found. 16 non-blocking seeds remain open.

## Open risks
- Default-format stack hold changed. Main held the run on `sdlc/M-2-e2e-ui` and `sdlc/M-1-`. The branch ignores both. This follows the R-054 quote, but it changes old behavior (TC-contract-8).
- `branches.parse` accepts Unicode digits and a trailing newline. A fork PR head such as `feature/PROJ-1-M-` plus a fullwidth 2 holds the stack. Git forbids newlines. Fix: `re.ASCII` and `\Z`.
- The state prefix fallback merges any ready head that starts with `state-`. The spec requires it. A fork head that is green and mergeable gets `gh pr merge` in pr mode. No test pins the fallback.
- Under `{name:lower}`, `re.IGNORECASE` folds the Kelvin sign into ASCII. Branch creation needs repo write access, which the threat model trusts.
- `next-action.py` does not run `validate_format`. A hand-edited format with whitespace passes through. Preflight rejects it earlier.
- `merged_heads` is keyed by the parsed id, not looked up with `name()` as the R-054 quote says. All 585 comparisons and TC-cli-5 show the same behavior.
- No number in the spec limits the cost of listing every local branch. The cost was not measured.
- Round 1 held no profile evidence. Round 1 results are the core verifier summaries only.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-053 | `active_branch(repo, current)`: enumerate `refs/heads/` (all local branches), keep those `parse` classifies as `slice`, and use the parsed `id` as `sid`. | VS-1 | TC-cli-1, TC-cli-2, TC-cli-3, TC-contract-4, TC-security-1, TC-security-2, TC-security-3, TC-security-4 | pass |
| R-054 | Pull-request heads: `state_prs` keeps heads that parse to `state`; `e2e_prs` keeps heads that parse to `e2e` (not `e2e-area`); the slice map keeps heads that parse to `slice`, with `ids=by_id` so a lowercased head resolves to the ledger id; `merged_heads` is looked up with `name(fmt, "slice", id=s["id"])`; the stack milestone hold keeps heads that parse to `milestone`. | VS-2, VS-3, VS-4 | TC-cli-4, TC-cli-5, TC-cli-6, TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-5, TC-contract-6, TC-contract-8, TC-security-5, TC-security-6, TC-security-7, TC-security-8 | pass |
| R-055 | The format comes from the `config` the decision already read (`load_format` semantics: `config.get("branchFormat") or "sdlc/{name}"`). | VS-5 | TC-cli-7, TC-contract-7, TC-contract-9 | pass |
| R-076 | `the active slice branch, slice PR heads, the state PR, the e2e PR and the stack milestone hold are recognized under a custom format`: fixture with `branchFormat: "feature/PROJ-1-{name}"`; a `feature/PROJ-1-sdlc-foo`-style foreign head is ignored. | VS-6 | TC-cli-8, TC-security-9, TC-security-10 | pass |
| R-077 | The existing tests keep passing under the default. | VS-5, VS-7 | TC-cli-7, TC-cli-9, TC-cli-1 (part 1), TC-cli-2 (part 1), TC-cli-3 (part 1), TC-contract-8 | pass |

R-076 has a committed test with the exact spec name: `skills/sdlc/test/next-action.test.mjs:601`. R-053 to R-055 have committed tests at lines 523, 540, 571 and 589. Lines 634 and 644 hold the two promoted security tests.

## Scenarios

### VS-1 · The active slice branch is found by parsing local branches under a custom format
Profiles: cli, security. Risk: A wrong parse resumes the wrong slice, so a foreign branch must never read as active.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Active slice found by parse; sdlc/S-1 and foreign branches are not active | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:51` |
| TC-cli-2 | A checked-out slice branch is active and needs no checkout | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:74` |
| TC-cli-3 | Hostile branch names are never active and cause no traceback | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:84` |
| TC-security-1 | Hostile branch names never read as the active slice | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:52` |
| TC-security-2 | A slice-shaped branch without an in-progress entry stays inactive | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:70` |
| TC-security-3 | The checked-out branch wins over another in-progress branch | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:77` |
| TC-security-4 | A decision on a foreign branch makes no gh call and moves no ref | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:97` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-1 · Active slice found by parse; sdlc/S-1 and foreign branches are not active · PASS
- **Given** one repo, in-progress slice on `feature/PROJ-1-S-1`; a second repo with only foreign branches **When** run `next-action.py --repo` **Then** `checkout` is `feature/PROJ-1-S-1` in the first repo; null in the second
- **Expected** `checkout` is `feature/PROJ-1-S-1` in the first repo; null in the second **Actual** equal
- **Spec source:** R-053 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-cli-2 · A checked-out slice branch is active and needs no checkout · PASS
- **Given** two in-progress branches, S-2 checked out **When** run `next-action.py` **Then** `checkout` null, `next.slice.id` S-2
- **Expected** `checkout` null, `next.slice.id` S-2 **Actual** equal
- **Spec source:** R-053 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-cli-3 · Hostile branch names are never active and cause no traceback · PASS
- **Given** 8 hostile branches (fullwidth digit, flag-like, 200 characters, confusable, zero-width, unicode, huge integer) whose ledger marks S-1 in progress **When** run `next-action.py` **Then** `checkout` null, no Traceback
- **Expected** `checkout` null, no Traceback **Actual** equal
- **Spec source:** R-053 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-security-1 · Hostile branch names never read as the active slice · PASS
- **Given** 15 hostile or foreign names, each with an in-progress ledger entry **When** run `next-action.py` **Then** no decision changes; no ref, file or gh call changes
- **Expected** no decision changes; no ref, file or gh call changes **Actual** `checkout` null; refs equal before and after
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-2 · A slice-shaped branch without an in-progress entry stays inactive · PASS
- **Given** `feature/PROJ-1-S-002` and a todo S-3 **When** run `next-action.py` **Then** `checkout` null
- **Expected** `checkout` null **Actual** `checkout` null
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-3 · The checked-out branch wins over another in-progress branch · PASS
- **Given** two in-progress branches, one checked out **When** run `next-action.py` **Then** no checkout
- **Expected** no checkout **Actual** `checkout` null, `next.sliceId` S-2
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-4 · A decision on a foreign branch makes no gh call and moves no ref · PASS
- **Given** foreign branch **When** run `next-action.py` **Then** no gh call, no ref change
- **Expected** no gh call, no ref change **Actual** gh stub log empty, refs equal
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

</details>

### VS-2 · State and e2e pull request heads are recognized, and e2e-area heads are ignored
Profiles: cli, security. Risk: A wrong head match merges the wrong pull request.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | State and e2e heads give merge commands; e2e-area and foreign heads give none | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:99` |
| TC-security-5 | Hostile state and e2e heads give no merge command | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:110` |
| TC-security-6 | Unready state and e2e heads give no merge | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:124` |
| TC-security-7 | A null, number, list or object head does not crash the decision | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:132` |
| TC-security-8 | The state prefix fallback merges only the ready PR and runs no shell text | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:141` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-4 · State and e2e heads give merge commands; e2e-area and foreign heads give none · PASS
- **Given** pr mode, custom format, PR list file **When** run `next-action.py --prs` **Then** merge 12 (state), merge 13 (e2e); none for e2e-ui, foreign and default-format heads; merge 17 for `state-abc`; wait for a blocked state head; none in stack or direct mode
- **Expected** merge 12 (state), merge 13 (e2e); none for e2e-ui, foreign and default-format heads; merge 17 for `state-abc`; wait for a blocked state head; none in stack or direct mode **Actual** equal
- **Spec source:** R-054 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-security-5 · Hostile state and e2e heads give no merge command · PASS
- **Given** 11 heads: sdlc/ prefix, other project, e2e-area, run, attempt, 5000-character area **When** run `next-action.py --prs` **Then** no merge
- **Expected** no merge **Actual** `merges` empty
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-6 · Unready state and e2e heads give no merge · PASS
- **Given** CONFLICTING, REVIEW_REQUIRED and failed-check variants **When** run `next-action.py --prs` **Then** no merge
- **Expected** no merge **Actual** `merges` empty
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-7 · A null, number, list or object head does not crash the decision · PASS
- **Given** four non-string `headRefName` values **When** run `next-action.py --prs` **Then** exit 0, no merge
- **Expected** exit 0, no merge **Actual** exit 0 and no merge
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-8 · The state prefix fallback merges only the ready PR and runs no shell text · PASS
- **Given** `state-2026` head; a head with `$(touch pwn)` **When** run `next-action.py --prs` **Then** merge only the ready PR; no shell run
- **Expected** merge only the ready PR; no shell run **Actual** `state-2026` merges 21; the second head yields only its own `gh pr merge` string
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

</details>

### VS-3 · A lowercased slice head resolves to the ledger id
Profiles: cli, contract. Risk: A lowercased head must find its ledger id, or a merged slice stays unmerged.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | Lowercased head resolves to ledger id S-1 | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:120` |
| TC-contract-1 | Lowercased open and merged heads resolve to the ledger id | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:60` |
| TC-contract-2 | Unknown ids stay ignored; case folding exists only under :lower | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:70` |
| TC-contract-3 | Ledger ids that differ only in case resolve deterministically | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:83` |
| TC-contract-4 | Active branch under :lower resolves by case folding; a foreign number does not | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:94` |
| TC-contract-5 | Unicode and hostile heads never resolve and never crash | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:107` |
| TC-contract-6 | Property: head resolution matches a model written from the spec | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:117` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-5 · Lowercased head resolves to ledger id S-1 · PASS
- **Given** format `feature/PROJ-1-{name:lower}` **When** run `next-action.py` with open and merged PR lists **Then** `retryMerge` for S-1 with `awaiting-merge` and the merged PR url; none for `s-9`; none for a lowercased head under a strict format
- **Expected** `retryMerge` for S-1 with `awaiting-merge` and the merged PR url; none for `s-9`; none for a lowercased head under a strict format **Actual** equal
- **Spec source:** R-054 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-contract-1 · Lowercased open and merged heads resolve to the ledger id · PASS
- **Given** format `feature/PROJ-1-{name:lower}`; slice S-1; head `feature/proj-1-s-1` **When** run `next-action.py` with an open PR, then a merged PR on an awaiting-merge slice **Then** `retryMerge` for S-1 in both runs
- **Expected** `retryMerge` for S-1 in both runs **Actual** open: S-1 awaiting-merge; merged: `slice.pr` equals the merged url
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (transcript): command output in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-2 · Unknown ids stay ignored; case folding exists only under :lower · PASS
- **Given** formats `:lower` and plain; slice S-1 **When** open and merged heads for S-99 and S-98; lowercased id and prefix under the plain format **Then** no `retryMerge` for unknown ids; the plain format resolves only the exact head
- **Expected** no `retryMerge` for unknown ids; the plain format resolves only the exact head **Actual** as expected
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (transcript): command output in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-3 · Ledger ids that differ only in case resolve deterministically · PASS
- **Given** ledger S-a and S-A; format `:lower`; head `feature/proj-1-s-a` **When** run twice **Then** `retryMerge` for one ledger id, same output both times
- **Expected** `retryMerge` for one ledger id, same output both times **Actual** S-a (first in ledger order); identical JSON
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (transcript): command output in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-4 · Active branch under :lower resolves by case folding; a foreign number does not · PASS
- **Given** `feature/proj-1-s-1` holds S-1 in progress; `feature/proj-1-s-2` holds S-1 in progress **When** run `next-action.py`, then compare the tree **Then** `checkout` is `feature/proj-1-s-1`; none for the s-2 branch; tree unchanged
- **Expected** `checkout` is `feature/proj-1-s-1`; none for the s-2 branch; tree unchanged **Actual** as expected
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (transcript): command output in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-5 · Unicode and hostile heads never resolve and never crash · PASS
- **Given** format `:lower`; slices S-1, S-12 **When** 11 heads: fullwidth digit, dotless i, Kelvin sign, trailing space, NUL, emoji, 15000 characters, flag-like, empty, traversal **Then** exit 0 and no `retryMerge`
- **Expected** exit 0 and no `retryMerge` **Actual** all 11 heads exit 0 with no `retryMerge`
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (transcript): command output in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-6 · Property: head resolution matches a model written from the spec · PASS
- **Given** 5 formats (3 `:lower`, 2 plain), random ledgers of 1 to 4 ids, random heads **When** run `decide()` on 1000 generated fixtures **Then** `retryMerge` exactly when a head equals prefix + id + suffix
- **Expected** `retryMerge` exactly when a head equals prefix + id + suffix **Actual** 0 violations in 1000 runs
- **Spec source:** R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (property-run): seed 20261010 runs 1000, result pass, 0 unexplained violations. Detail in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

</details>

### VS-4 · The stack milestone hold keeps milestone heads and skips e2e and foreign heads
Profiles: cli. Risk: A wrong hold stops the run or lets it pass early.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | Stack milestone head holds the run; e2e, foreign and default-format heads do not | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:140` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-cli-6 · Stack milestone head holds the run; e2e, foreign and default-format heads do not · PASS
- **Given** stack mode, milestone M-2, custom format **When** run `next-action.py` **Then** `wait` naming M-2 and the PR url; no `wait` for the other heads; no hold in pr mode
- **Expected** `wait` naming M-2 and the PR url; no `wait` for the other heads; no hold in pr mode **Actual** equal
- **Spec source:** R-054 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

</details>

### VS-5 · A missing or empty branchFormat falls back to sdlc/{name}
Profiles: cli, contract. Risk: A project with no format must behave as before.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7 | Absent, empty and null branchFormat fall back to sdlc/{name}; invalid formats give a clear error | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:155` |
| TC-contract-7 | Absent, empty, null and explicit default branchFormat give equal decisions | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:172` |
| TC-contract-8 | Property: default-format decisions equal main for generated sdlc heads | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:221` |
| TC-contract-9 | A non-string or invalid branchFormat fails clearly | PASS | `.sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs:255` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-7 · Absent, empty and null branchFormat fall back to sdlc/{name}; invalid formats give a clear error · PASS
- **Given** config variants, direct and pr mode **When** run `next-action.py` **Then** fallback recognized for all five recognitions; error reason names the branch format; no trace
- **Expected** fallback recognized for all five recognitions; error reason names the branch format; no trace **Actual** equal
- **Spec source:** R-055, R-077 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-contract-7 · Absent, empty, null and explicit default branchFormat give equal decisions · PASS
- **Given** four configs; heads `sdlc/S-1`, `sdlc/state-<stamp>`, `sdlc/M-1-e2e`, `sdlc/M-1-e2e-ui`, `sdlc/M-1`; pr, stack and direct mode **When** run the script for each config and for main **Then** identical JSON across the four configs and equal to main
- **Expected** identical JSON across the four configs and equal to main **Actual** 4 configs x 6 scenarios identical; 6 scenarios equal to main
- **Spec source:** R-055 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (transcript): command output in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-8 · Property: default-format decisions equal main for generated sdlc heads · PASS
- **Given** no `branchFormat`; 3 modes; 20 head shapes; open and merged **When** run `decide()` of the branch and of main on 1000 fixtures **Then** equal output
- **Expected** equal output **Actual** 980 equal; 20 differ, all in stack mode on `sdlc/M-2-e2e-ui`, `sdlc/M-1-`, `sdlc/M-` or `sdlc/M-1/x`: main held the run, the branch does not. This follows the R-054 quote.
- **Spec source:** R-077, R-054 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (property-run): seed 20261011 runs 1000, result pass, 0 unexplained violations. Detail in [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

#### TC-contract-9 · A non-string or invalid branchFormat fails clearly · PASS
- **Given** `branchFormat` 7, true, array, object, `x`, `sdlc/{name`, `{name}{name}`, `sdlc/{id}`, 1.5 and more **When** run `next-action.py` with PRs and with a branch **Then** exit 0, action `error`, a reason that names the format, no Traceback
- **Expected** exit 0, action `error`, a reason that names the format, no Traceback **Actual** no Traceback for 12 values
- **Spec source:** R-055 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/contract-0/next-action.verify-contract.test.mjs`
- **Evidence** (log): see [contract-0.md](../../slices/S-021/verification/r0/contract-0.md).

</details>

### VS-6 · All five recognitions hold in one fixture and the foreign head is ignored
Profiles: cli, security. Risk: A foreign head must change no decision.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-8 | Output is identical with and without a foreign head | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:183` |
| TC-security-9 | A foreign head changes no decision in the pr and stack fixtures | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:149` |
| TC-security-10 | A head without the M anchor never holds the stack | PASS | `.sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:167` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-8 · Output is identical with and without a foreign head · PASS
- **Given** one custom-format repo per decision **When** run `next-action.py` twice, with and without `feature/PROJ-1-sdlc-foo` **Then** deep-equal JSON for the sync, slice-PR, stack-hold and active-branch decisions; merges are 12 and 13 only
- **Expected** deep-equal JSON for the sync, slice-PR, stack-hold and active-branch decisions; merges are 12 and 13 only **Actual** equal
- **Spec source:** R-076 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-security-9 · A foreign head changes no decision in the pr and stack fixtures · PASS
- **Given** 7 foreign heads **When** run with and without each head, in pr and stack mode **Then** deep-equal decision JSON
- **Expected** deep-equal decision JSON **Actual** deep-equal in all runs
- **Spec source:** R-076 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

#### TC-security-10 · A head without the M anchor never holds the stack · PASS
- **Given** heads `m-2`, `sdlc-M-2`, `sdlc/M-2` under the custom format **When** run `next-action.py` in stack mode **Then** no `wait`
- **Expected** no `wait` **Actual** no `wait`
- **Spec source:** R-076 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs`
- **Evidence** (log): see [security-0.md](../../slices/S-021/verification/r0/security-0.md).

</details>

### VS-7 · The default format keeps the existing behavior
Profiles: cli. Risk: The default path must not regress.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 | Default format gives byte-equal decisions to main | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs:202` |
| TC-cli-1 (part 1) | The full suite passes with no branchFormat | PASS | `npm test` (whole suite) |
| TC-cli-2 (part 1) | Decisions equal main over 585 comparisons | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-1/default-format.verify-cli.test.mjs:49` |
| TC-cli-3 (part 1) | A milestone branch is not a slice branch | PASS | `.sdlc/slices/S-021/verification/r0/tests/cli-1/default-format.verify-cli.test.mjs` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-9 · Default format gives byte-equal decisions to main · PASS
- **Given** five PR-list shapes and one active branch **When** run the script from main and from the slice on the same repo **Then** equal exit status and JSON
- **Expected** equal exit status and JSON **Actual** equal
- **Spec source:** R-077 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_BASE=<main worktree> VERIFY_LOG=<file> node --test .sdlc/slices/S-021/verification/r0/tests/cli-0/next-action.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-0.md](../../slices/S-021/verification/r0/logs/cli-0-transcripts.txt). Every tree diff reads unchanged.

#### TC-cli-1 (part 1) · The full suite passes with no branchFormat · PASS
- **Given** `sdlc/S-021` at `fecc565`, no `branchFormat` **When** run `npm test` **Then** all tests pass
- **Expected** all tests pass **Actual** 683 tests, 682 pass, 0 fail, 1 skipped; the next-action file alone: 39 pass
- **Spec source:** R-077 acceptance · **Run:** `npm test`
- **Evidence** (transcript): command output in [cli-1.md](../../slices/S-021/verification/r0/cli-1.md).

#### TC-cli-2 (part 1) · Decisions equal main over 585 comparisons · PASS
- **Given** 195 fixtures in pr, stack and direct mode, each with the key absent, empty and null **When** run `next-action.py` from main and from the branch **Then** equal exit code and stdout
- **Expected** equal exit code and stdout **Actual** 585 comparisons, 0 differences
- **Spec source:** R-077 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/cli-1/default-format.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-1.md](../../slices/S-021/verification/r0/cli-1.md).

#### TC-cli-3 (part 1) · A milestone branch is not a slice branch · PASS
- **Given** branches `sdlc/S-fix-M-1-1` and `sdlc/M-1`, both with an in-progress entry **When** run `next-action.py` **Then** the branch picks `sdlc/S-fix-M-1-1`
- **Expected** the branch picks `sdlc/S-fix-M-1-1` **Actual** main picked `sdlc/M-1`; the state never writes such an entry, so this is a seed only
- **Spec source:** R-077 acceptance · **Run:** `node --test .sdlc/slices/S-021/verification/r0/tests/cli-1/default-format.verify-cli.test.mjs`
- **Evidence** (transcript): command output in [cli-1.md](../../slices/S-021/verification/r0/cli-1.md).

</details>

## How it was attacked
One security session ran in round 0 (security-0, commit `fecc565`). Charter: find a foreign or hostile branch or head that changes a decision. Threat-model boundary: branch creators with repo write are trusted, and PR heads from forks are not. The session tried 7 attacks. 4 held (AT-1 to AT-4). 3 were out of scope (AT-5 to AT-7). Nothing broke. Three more cli attacks (hostile branch names and invalid formats) held in the cli session.

<details>
<summary>Attack table (7 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| 15 branch names: attempt, verify, foreign, `sdlc/`, lowercase, zero-width, fullwidth digit, Cyrillic dze, other project | never active | `checkout` null for all | held (AT-1) |
| 11 state and e2e lookalike heads plus 3 unready variants | no merge | no merge | held (AT-2) |
| `headRefName` null, 5, list, object | no crash | exit 0 | held (AT-3) |
| 7 foreign heads in pr and stack fixtures | identical decisions | identical | held (AT-4) |
| `feature/PROJ-1-s-` plus U+212A plus `1` with in-progress S-K1 | not active | checkout is the Kelvin branch | out of scope (AT-5): repo write is trusted |
| `feature/PROJ-1-M-1-e2e` plus LF; `feature/PROJ-1-M-2` plus LF | no merge, no hold | merge command and stack hold, because `$` matches before a final newline | out of scope (AT-6): git and GitHub refuse newlines |
| `feature/PROJ-1-M-` plus fullwidth 2, with `-e2e` and without | no merge, no hold | merge command and stack hold, because `\d` matches Unicode digits | out of scope (AT-7): reachable from a fork PR, see seeds |

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier, core verifier or reviewer found one.
- **Review finding, fixed in fix round 1:** the test-quality review found that the security tests TC-security-2 and TC-security-3 were keep-worthy and not in the suite. Commit `9b38e43` promoted both into `skills/sdlc/test/next-action.test.mjs` (lines 634 and 644). Both now guard R-053.
- **Test change recorded as an ADR:** `ADR-20261010-030412-implementer-S-021-985f`. The merged-head case of the lowercased-head test uses an awaiting-merge slice, because the script records a merged PR only for that status.
- **Plan deviations** (`failures.md`): merged heads resolve through `parse` into a map keyed by ledger id, because a lowercased format keeps the prefix case. A state head that does not parse still counts when it holds `<prefix>state-` and a suffix.

| Seed | Found by | File |
|---|---|---|
| State-head fallback bypasses parse | review architecture r1 | `skills/sdlc/next-action.py` |
| Thin `head_kind` wrapper | review architecture r1 | `skills/sdlc/next-action.py` |
| Milestone head pattern narrowed without a test | review architecture r1 | `skills/sdlc/test/next-action.test.mjs` |
| Spec-named test repeats earlier assertions | review test-quality r1 | `skills/sdlc/test/next-action.test.mjs` |
| Edited comments in `next-action.py` are long | review test-quality r1 | `skills/sdlc/next-action.py` |
| `merged_heads` uses `parse`, not `name()` | spec-fidelity r0, verify cli r0 | `skills/sdlc/next-action.py` |
| Non-string `branchFormat` crashes with a trace (the cli and contract sessions found a clear error JSON instead) | ledger | `skills/sdlc/next-action.py` |
| No test for the state head prefix fallback | ledger | `skills/sdlc/test/next-action.test.mjs` |
| `active_branch` compares ids without case under a case-sensitive format | verify cli r0 | `skills/sdlc/next-action.py` |
| Default-format decision differs from main for a milestone branch with an in-progress entry | verify cli r0 part 1 | `skills/sdlc/next-action.py` |
| Default-format stack hold changed for e2e-area and malformed milestone heads | verify contract r0 | `skills/sdlc/next-action.py` |
| `branches.parse` accepts a trailing newline in a head | verify contract r0 | `skills/sdlc/branches.py` |
| `branches.parse`: `\d` and `$` accept Unicode digits and a trailing newline | verify security r0 | `skills/sdlc/branches.py` |
| Lowercased format: `IGNORECASE` folds the Kelvin sign into ASCII | verify security r0 | `skills/sdlc/branches.py` |
| State prefix fallback merges any ready head that starts with `state-` | verify security r0 | `skills/sdlc/next-action.py` |
| `next-action.py` does not run `validate_format` | verify contract r0 | `skills/sdlc/next-action.py` |

## Appendix
- Toolkit tools used (from `.sdlc/testkit.json`): cli-runner, stub-server, attack-corpus, property.
- Plans: [plan-r0](../../slices/S-021/verification/plan-r0.md) · [plan-r1](../../slices/S-021/verification/plan-r1.md) (JSON files beside them).
- Round 0 evidence: [cli-0](../../slices/S-021/verification/r0/cli-0.md) · [cli-1](../../slices/S-021/verification/r0/cli-1.md) · [contract-0](../../slices/S-021/verification/r0/contract-0.md) · [security-0](../../slices/S-021/verification/r0/security-0.md) · [logs](../../slices/S-021/verification/r0/logs/).
- Core verifiers: [spec-fidelity r0](../../slices/S-021/verify-spec-fidelity-r0.md) · [spec-fidelity r1](../../slices/S-021/verify-spec-fidelity-r1.md) · [regression r0](../../slices/S-021/verify-regression-r0.md) · [regression r1](../../slices/S-021/verify-regression-r1.md).
- Reviews: [architecture r1](../../slices/S-021/review-architecture-r1.md) · [security r0](../../slices/S-021/review-security-r0.md) · [test-quality r1](../../slices/S-021/review-test-quality-r1.md). Gate: [gate-r0](../../slices/S-021/gate-r0.md).
- Missing sources: round 1 has no profile evidence files (the `r1` folder is empty). Cases keep their round 0 result, and the round 1 regression run re-ran every test.
