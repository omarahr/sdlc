# S-019 · SKILL.md names the run branch and checks the user's branch
Verdict: RELEASED
Commit under test: 0f46840 · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 5 | 30 | 30 | 0 | 0 | 0 / 0 | 8 |

## Summary
The slice teaches the `/sdlc` driver to name the run branch through `branches.py`. `SKILL.md` gains a Worktree path bullet. The Run worktree bullet moves after the Branch format bullet and sets `RUN_BRANCH`. On a relaunch, the worktree goes back onto the last listed run branch. Three profiles checked it: `cli`, `contract` and `security`, with 30 cases in round 0. All 30 passed. Both core verifiers and the Gate held. `npm test` gave 670 passed, 0 failed, 1 skipped. No blocking defect was found. Eight non-blocking seeds stay open.

## Open risks
- The tests pin the wording of `SKILL.md` with character-window regexes. A harmless rewording can break them.
- No test runs the driver itself. The tests check the bullet text, the bullet order and the quoted commands (TC-contract-12).
- The format mismatch check runs after the driver creates, checks out and merges the worktree. The old bullet had the same order.
- `branches.py parse` takes `sdlc/S-002x` as a slice and `sdlc/run-` plus a non-ASCII digit as a run. The spec names only `sdlc/feature-x`. A user branch of that shape triggers a rename ask or counts as a run branch.
- The plan changed ADR-20261010-014200-decision-judge-S-019-b1d3. ADR-20261010-014356-planner-S-019-7374 supersedes it: the Git mode bullet keeps the `$WT`-first read.
- The Run worktree bullet holds many separate steps. A split into sub-bullets would ease reading and testing.
- The Default branch bullet, the stack-mode text and the cleanup text keep the literal `sdlc/run-<n>`. A later slice owns them.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-047 | The **Run worktree** bullet names the run branch through the module: `RUN_BRANCH=$(python3 "$SKILL_DIR/branches.py" name --repo "$REPO" --format "$FMT" --kind run --n <n>)` where `<n>` is one more than the count of `branches.py list --kind run` on a first run … | VS-1, VS-5 | TC-cli-1, TC-cli-2, TC-cli-3, TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-10, TC-contract-11, TC-contract-12, TC-security-1, TC-security-2, TC-security-3, TC-security-4; unit `T-R-047a`, `T-R-047b`, `T-R-047c`, `T-R-047d`, `T-R-047e` | pass |
| R-121 | … on a relaunch the run branch is the last entry of that list, and the worktree is put back on it. | VS-2, VS-5 | TC-cli-4, TC-cli-5, TC-contract-4, TC-contract-5, TC-contract-6, TC-contract-10, TC-contract-11, TC-contract-12; unit `T-R-121` | pass |
| R-118 | **The user's branch is `feature/PROJ-1-S-002` under that format**: it parses as a slice; the driver asks for a rename before the first run. | VS-4 | TC-cli-9, TC-cli-10, TC-cli-11, TC-contract-7, TC-contract-8, TC-contract-9, TC-security-7; unit `T-R-118`, `T-R-118b` | pass |
| R-101 | **The user's branch is `sdlc/feature-x`**: not a loop kind; no rename asked. | VS-3 | TC-cli-6, TC-cli-7, TC-cli-8, TC-security-5, TC-security-6; unit `T-R-101`, `T-R-101b` | pass |

## Scenarios
### VS-1 · A first run names the run branch from the list count
Profiles: cli, contract, security. Risk: A wrong count or an unsafe format value names a bad run branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | A repo with no run branch gives an empty list and n=1 names sdlc/run-1 | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:12` |
| TC-cli-2 | Count 1 and 3 give n+1; custom format; run branches of an older format are not counted | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:20` |
| TC-cli-3 | Hostile --format values fail with a clear error and no tree change | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:38` |
| TC-contract-1 | list and name give the next run branch for 0, 1 and 3 run branches | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:19` |
| TC-contract-2 | A run branch from another format is not counted | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:42` |
| TC-contract-3 | Hostile --format values fail with JSON error and leave the tree unchanged | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:52` |
| TC-security-1 | name --n count+1 matches the format; older-format run branches are not counted | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:13` |
| TC-security-2 | Hostile --format values fail clearly and change no tree | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:24` |
| TC-security-3 | NUL in --format cannot reach the script | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:44` |
| TC-security-4 | Hostile --n integer forms | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:52` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-cli-1 · A repo with no run branch gives an empty list and n=1 names sdlc/run-1 · PASS
- **Given** scratch repo, branches sdlc/S-001 and sdlc/feature-x **When** list --kind run, then name --kind run --n 1 **Then** empty list; branch value sdlc/run-1; exit 0; tree unchanged
- **Expected** empty list; branch value sdlc/run-1; exit 0; tree unchanged **Actual** empty list; branch value sdlc/run-1; exit 0; tree unchanged
- **Spec source:** R-047 acceptance (plan notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-1 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-2 · Count 1 and 3 give n+1; custom format; run branches of an older format are not counted · PASS
- **Given** branches sdlc/run-1..3, old/run-9, feature/PROJ-1-run-1..2, sdlc/run-7; config branchFormat **When** list and name with default format, --format and config format **Then** list holds only branches under the format; name gives run-4 and feature/PROJ-1-run-3
- **Expected** list holds only branches under the format; name gives run-4 and feature/PROJ-1-run-3 **Actual** list holds only branches under the format; name gives run-4 and feature/PROJ-1-run-3
- **Spec source:** R-047 acceptance (plan notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-2 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-3 · Hostile --format values fail with a clear error and no tree change · PASS
- **Given** 30 values: flag-like, traversal, brace, empty, .lock, .., ~, NUL **When** name --kind run --format=<value>; list --format=--bad **Then** exit 2 with a JSON error, no traceback, refs unchanged; NUL gives a spawn error
- **Expected** exit 2 with a JSON error, no traceback, refs unchanged; NUL gives a spawn error **Actual** exit 2 with a JSON error, no traceback, refs unchanged; NUL gives a spawn error
- **Spec source:** R-047 acceptance (plan notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-3 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-contract-1 · list and name give the next run branch for 0, 1 and 3 run branches · PASS
- **Given** scratch repos with 0, 1, 3 run branches under five formats **When** list --kind run, then name --kind run --n count+1, then parse **Then** the list count equals the branches made; the new name parses as run with n=count+1; no tree change
- **Expected** the list count equals the branches made; the new name parses as run with n=count+1; no tree change **Actual** the list count equals the branches made; the new name parses as run with n=count+1; no tree change
- **Spec source:** R-047 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-2 · A run branch from another format is not counted · PASS
- **Given** branches sdlc/run-1, sdlc/run-2, feature/PROJ-1-run-1 **When** list under three formats **Then** each format lists only its own run branches; an unrelated format lists none
- **Expected** each format lists only its own run branches; an unrelated format lists none **Actual** each format lists only its own run branches; an unrelated format lists none
- **Spec source:** R-047 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-3 · Hostile --format values fail with JSON error and leave the tree unchanged · PASS
- **Given** 11 hostile formats (flag-like, traversal, double placeholder, none, empty, whitespace, newline) **When** name and list with each **Then** exit 0 or 2, JSON on stdout, no Traceback, no unsafe branch value, tree unchanged
- **Expected** exit 0 or 2, JSON on stdout, no Traceback, no unsafe branch value, tree unchanged **Actual** exit 0 or 2, JSON on stdout, no Traceback, no unsafe branch value, tree unchanged
- **Spec source:** R-047 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-security-1 · name --n count+1 matches the format; older-format run branches are not counted · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** list returns 0, 1 and 3 run branches; name prints run-<count+1>; the tree does not change
- **Expected** list returns 0, 1 and 3 run branches; name prints run-<count+1>; the tree does not change **Actual** held for default and custom format wip/{name}-x; old/run-9 not counted; treeUnchanged true
- **Spec source:** R-047 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): list/name on 0,1,3 run branches: counts 0/1/3, names run-1/2/4

#### TC-security-2 · Hostile --format values fail clearly and change no tree · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** corpus values (flag-like, traversal, injection, control chars, whitespace, format strings, {name}/../../x, empty) give exit 0 or JSON error exit 2; no unsafe branch name; no tree change
- **Expected** corpus values (flag-like, traversal, injection, control chars, whitespace, format strings, {name}/../../x, empty) give exit 0 or JSON error exit 2; no unsafe branch name; no tree change **Actual** all held on name and list; no unsafe name accepted
- **Spec source:** R-047 acceptance (scenario notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): about 90 values x 2 commands, treeUnchanged true for each, no unsafe branch printed

#### TC-security-3 · NUL in --format cannot reach the script · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** spawn fails before the script runs; no tree change
- **Expected** spawn fails before the script runs; no tree change **Actual** spawnError, status null, tree unchanged
- **Spec source:** R-047 acceptance (scenario notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): spawnError on NUL argument

#### TC-security-4 · Hostile --n integer forms · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** exit 0 with a numeric run name or exit 2; no tree change
- **Expected** exit 0 with a numeric run name or exit 2; no tree change **Actual** held; negative n gives sdlc/run--5000 (seed)
- **Spec source:** R-047 acceptance (scenario notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): unicode-digits, huge-integers, integer-forms families

</details>

### VS-2 · A relaunch puts the worktree back on the last listed run branch
Profiles: cli, contract. Risk: A text-ordered list picks the wrong run branch on resume.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | The last list entry is the highest n, numeric not text | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:56` |
| TC-cli-5 | No run branch gives an empty list; a non-repo fails cleanly; padded and lower-case names | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:69` |
| TC-contract-4 | Property: list is numerically sorted and the last entry holds the highest n | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:82` |
| TC-contract-5 | Example: runs 2, 9, 10, 11 end at 11; empty repo lists nothing; name for n=11 equals the existing branch | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:105` |
| TC-contract-6 | Property: parse of a run branch name returns run with the same n | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:117` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-4 · The last list entry is the highest n, numeric not text · PASS
- **Given** branches run-2, 10, 9, 100, 11, 1 **When** list --kind run, then name for the last n **Then** order 1,2,9,10,11,100; last is sdlc/run-100; name equals it; no branch created
- **Expected** order 1,2,9,10,11,100; last is sdlc/run-100; name equals it; no branch created **Actual** order 1,2,9,10,11,100; last is sdlc/run-100; name equals it; no branch created
- **Spec source:** R-121 acceptance (plan notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-4 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-5 · No run branch gives an empty list; a non-repo fails cleanly; padded and lower-case names · PASS
- **Given** repo with only a slice branch; a plain directory; run-07, run-7, run-8; format sdlc/{name:lower} **When** list --kind run **Then** exit 0 and [] for no run branch; exit non-zero with no traceback for a non-repo; last is run-8
- **Expected** exit 0 and [] for no run branch; exit non-zero with no traceback for a non-repo; last is run-8 **Actual** exit 0 and [] for no run branch; exit non-zero with no traceback for a non-repo; last is run-8
- **Spec source:** R-121 acceptance (plan notes) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-5 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-contract-4 · Property: list is numerically sorted and the last entry holds the highest n · PASS
- **Given** 1000 random branch sets, n up to 5000, noise branches, five formats **When** list_kind through the module entry against a reference model written from the spec **Then** sorted ascending by integer n; last entry is max n; noise excluded
- **Expected** sorted ascending by integer n; last entry is max n; noise excluded **Actual** sorted ascending by integer n; last entry is max n; noise excluded
- **Spec source:** R-121 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (property-run): seed=424242 runs=1000 violations=0

#### TC-contract-5 · Example: runs 2, 9, 10, 11 end at 11; empty repo lists nothing; name for n=11 equals the existing branch · PASS
- **Given** scratch repo **When** list, name --n 11 **Then** order 2,9,10,11; last sdlc/run-11; name equals it; empty list on no run branch; no tree change
- **Expected** order 2,9,10,11; last sdlc/run-11; name equals it; empty list on no run branch; no tree change **Actual** order 2,9,10,11; last sdlc/run-11; name equals it; empty list on no run branch; no tree change
- **Spec source:** R-121 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-6 · Property: parse of a run branch name returns run with the same n · PASS
- **Given** 1000 random formats and n up to 100000 **When** parse through module entry **Then** kind run and n equal
- **Expected** kind run and n equal **Actual** kind run and n equal
- **Spec source:** R-047 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (property-run): seed=424242 runs=1000 violations=0

</details>

### VS-3 · A user branch outside the loop kinds asks no rename
Profiles: cli, security. Risk: A false match blocks a first run with a needless rename ask.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | User branches outside the loop kinds print no kind | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:85` |
| TC-cli-7 | Near misses are recorded (trailing newline, S-002x, unicode digits) | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:92` |
| TC-cli-8 | The config format and the default format give the same no-kind answer | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:103` |
| TC-security-5 | Near misses do not parse as a loop kind | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:60` |
| TC-security-6 | Characterization of accepted lookalikes | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:65` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-6 · User branches outside the loop kinds print no kind · PASS
- **Given** 15 names: sdlc/feature-x, sdlc/, sdlc/run-, sdlc/feature-S-002, sdlc/s-002, sdlc/S-, trailing slash, RUN-1, sdlc/sdlc/S-002 **When** parse with format sdlc/{name} **Then** kind null, exit 0, empty stderr, tree unchanged for each
- **Expected** kind null, exit 0, empty stderr, tree unchanged for each **Actual** kind null, exit 0, empty stderr, tree unchanged for each
- **Spec source:** R-101 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-6 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-7 · Near misses are recorded (trailing newline, S-002x, unicode digits) · PASS
- **Given** names sdlc/S-002x, S-002 plus newline, run-U+0663, M-1 plus newline, S-U+0663, S-002 plus space **When** parse with format sdlc/{name} **Then** trailing space and S-U+0663 print no kind; S-002x parses as slice id S-002x (slice ids may carry letters); a newline never occurs in a git branch; run-U+0663 parses as run (seed)
- **Expected** trailing space and S-U+0663 print no kind; S-002x parses as slice id S-002x (slice ids may carry letters); a newline never occurs in a git branch; run-U+0663 parses as run (seed) **Actual** trailing space and S-U+0663 print no kind; S-002x parses as slice id S-002x (slice ids may carry letters); a newline never occurs in a git branch; run-U+0663 parses as run (seed)
- **Spec source:** R-101 acceptance; seeds for the rest · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-7 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-8 · The config format and the default format give the same no-kind answer · PASS
- **Given** config branchFormat sdlc/{name}; and a repo without config **When** parse sdlc/feature-x **Then** kind null in both
- **Expected** kind null in both **Actual** kind null in both
- **Spec source:** R-101 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-8 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-security-5 · Near misses do not parse as a loop kind · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** none of 22 near misses prints a kind (feature-x, run-, feature-S-002, case changes, trailing slash, double slash, fullwidth digits in S-, run-1x)
- **Expected** none of 22 near misses prints a kind (feature-x, run-, feature-S-002, case changes, trailing slash, double slash, fullwidth digits in S-, run-1x) **Actual** held
- **Spec source:** R-101 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): 22 branches, kind null each

#### TC-security-6 · Characterization of accepted lookalikes · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** sdlc/feature-x has no kind; documented lookalikes parse as loop kinds
- **Expected** sdlc/feature-x has no kind; documented lookalikes parse as loop kinds **Actual** sdlc/feature-x null; sdlc/S-002x slice; unicode digits after run- parse as run; a trailing newline parses as run
- **Spec source:** R-101 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): see seeds

</details>

### VS-4 · A user branch that parses as a slice asks for a rename
Profiles: cli, contract, security. Risk: A missed collision breaks resume.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 | feature/PROJ-1-S-002 parses as slice S-002; foo, other prefix and a repeated prefix do not | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:111` |
| TC-cli-10 | A prefix with regex characters is taken literally | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:125` |
| TC-cli-11 | Exit codes and stderr are stable on bad input | PASS | `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:135` |
| TC-contract-7 | feature/PROJ-1-S-002 parses as slice S-002; feature/PROJ-1-foo has no kind | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:130` |
| TC-contract-8 | Regex characters in the prefix are literal; repeated or shifted prefix is not a kind | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:139` |
| TC-contract-9 | Exit codes and stderr are stable | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:166` |
| TC-security-7 | feature/PROJ-1-S-002 parses as slice; near misses and regex-character prefixes | PASS | `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:74` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-9 · feature/PROJ-1-S-002 parses as slice S-002; foo, other prefix and a repeated prefix do not · PASS
- **Given** format feature/PROJ-1-{name} **When** parse for four branches **Then** kind slice and id S-002 with empty stderr; kind null for foo, PROJ-2 and the repeated prefix
- **Expected** kind slice and id S-002 with empty stderr; kind null for foo, PROJ-2 and the repeated prefix **Actual** kind slice and id S-002 with empty stderr; kind null for foo, PROJ-2 and the repeated prefix
- **Spec source:** R-118 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-9 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-10 · A prefix with regex characters is taken literally · PASS
- **Given** formats a.b+c(x)/, (a|b)$/, p.d+/, pre-{name}-post and Feat/{name:lower} **When** parse a matching and a near-matching branch **Then** the matching branch gives slice S-002; the near match gives kind null; git-unsafe characters (square brackets, star, caret, backslash) give a clear exit 2 error
- **Expected** the matching branch gives slice S-002; the near match gives kind null; git-unsafe characters (square brackets, star, caret, backslash) give a clear exit 2 error **Actual** the matching branch gives slice S-002; the near match gives kind null; git-unsafe characters (square brackets, star, caret, backslash) give a clear exit 2 error
- **Spec source:** R-118 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-10 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-cli-11 · Exit codes and stderr are stable on bad input · PASS
- **Given** missing flags, bad format, double placeholder, missing repo, flag-like branch values **When** each command run twice **Then** same exit code and stderr on both runs; no traceback; tree unchanged
- **Expected** same exit code and stderr on both runs; no traceback; tree unchanged **Actual** same exit code and stderr on both runs; no traceback; tree unchanged
- **Spec source:** R-118 acceptance (plan notes: stable exit codes and stderr) · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence (transcript): [TC-cli-11 transcripts (command, stdout, stderr, exit code, tree diff)](../../slices/S-019/verification/r0/logs/cli-0-transcripts.txt)
- Evidence (file-tree): treeUnchanged: true for every run (cli-runner tree diff, git refs included)

#### TC-contract-7 · feature/PROJ-1-S-002 parses as slice S-002; feature/PROJ-1-foo has no kind · PASS
- **Given** format feature/PROJ-1-{name} **When** parse CLI **Then** kind slice id S-002 exit 0 stderr empty; kind null exit 0
- **Expected** kind slice id S-002 exit 0 stderr empty; kind null exit 0 **Actual** kind slice id S-002 exit 0 stderr empty; kind null exit 0
- **Spec source:** R-118 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-8 · Regex characters in the prefix are literal; repeated or shifted prefix is not a kind · PASS
- **Given** formats with . + ( ) | $ and near-miss branches **When** parse CLI **Then** literal match gives slice; look-alike branches, repeated prefix, case changes, empty tail give null
- **Expected** literal match gives slice; look-alike branches, repeated prefix, case changes, empty tail give null **Actual** literal match gives slice; look-alike branches, repeated prefix, case changes, empty tail give null
- **Spec source:** R-118 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-9 · Exit codes and stderr are stable · PASS
- **Given** missing --branch, format without placeholder, repeated call **When** parse CLI **Then** exit 2 with ok false JSON for bad input; same stdout on repeat
- **Expected** exit 2 with ok false JSON for bad input; same stdout on repeat **Actual** exit 2 with ok false JSON for bad input; same stdout on repeat
- **Spec source:** R-118 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-security-7 · feature/PROJ-1-S-002 parses as slice; near misses and regex-character prefixes · PASS
- **Given** a scratch git repo **When** branches.py runs with the attack input **Then** slice S-002 for the example; null for foo, repeated prefix, empty tail, wrong case; regex characters in the prefix stay literal; stderr empty; exit 0
- **Expected** slice S-002 for the example; null for foo, repeated prefix, empty tail, wrong case; regex characters in the prefix stay literal; stderr empty; exit 0 **Actual** held
- **Spec source:** R-118 acceptance · **Run:** `node --test .sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Evidence (attack): parse exit 0, stderr empty, kind slice id S-002; prefixes a.b(c)+, p[1]*, x|y, a^b, a$b, (?i)

</details>

### VS-5 · SKILL.md orders the bullets so WT and FMT exist before use
Profiles: contract. Risk: A wrong bullet order leaves WT or FMT unset when a bullet uses it.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-10 | Bullet order in SKILL.md | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:182` |
| TC-contract-11 | Run worktree bullet content | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:193` |
| TC-contract-12 | Quoted commands run as written in a scratch repo | PASS | `.sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs:207` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-10 · Bullet order in SKILL.md · PASS
- **Given** skills/sdlc/SKILL.md at the slice commit **When** read the bullet list **Then** Worktree path before Git mode and Branch format; Branch format before Run worktree before specPath before STOP removal; one WT assignment; the mismatch sentence sits only in Run worktree
- **Expected** Worktree path before Git mode and Branch format; Branch format before Run worktree before specPath before STOP removal; one WT assignment; the mismatch sentence sits only in Run worktree **Actual** Worktree path before Git mode and Branch format; Branch format before Run worktree before specPath before STOP removal; one WT assignment; the mismatch sentence sits only in Run worktree
- **Spec source:** R-047 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-11 · Run worktree bullet content · PASS
- **Given** SKILL.md **When** read the bullet **Then** RUN_BRANCH command, count rule, relaunch rule, checkout, no new branch on relaunch, mismatch sentence, no literal sdlc/run-<n>
- **Expected** RUN_BRANCH command, count rule, relaunch rule, checkout, no new branch on relaunch, mismatch sentence, no literal sdlc/run-<n> **Actual** RUN_BRANCH command, count rule, relaunch rule, checkout, no new branch on relaunch, mismatch sentence, no literal sdlc/run-<n>
- **Spec source:** R-047 and R-121 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

#### TC-contract-12 · Quoted commands run as written in a scratch repo · PASS
- **Given** scratch repo, FMT feature/{name} **When** run the quoted list and name commands, create the worktree, add run-9 and run-10, detach HEAD, run the quoted checkout **Then** empty list then feature/run-1; worktree add succeeds; relaunch list ends with feature/run-10; no new run branch; checkout puts HEAD back on feature/run-10
- **Expected** empty list then feature/run-1; worktree add succeeds; relaunch list ends with feature/run-10; no new run branch; checkout puts HEAD back on feature/run-10 **Actual** empty list then feature/run-1; worktree add succeeds; relaunch list ends with feature/run-10; no new run branch; checkout puts HEAD back on feature/run-10
- **Spec source:** R-047 and R-121 acceptance · **Run:** `S019_ROOT=<slice worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-019/verification/r0/tests/contract-0/s019.verify-contract.test.mjs`
- Evidence (log): [node --test output](../../slices/S-019/verification/r0/logs/contract-0.log)

</details>

## How it was attacked
One security session ran in round 0 (`security-0`, commit f22f644). Its charter: find a wrong `n`, an unsafe branch name or a tree change in `branches.py list`, `name` and `parse` (R-047, R-101, R-118). The threat-model boundary is the `--format`, `--n` and `--branch` arguments that reach the module. The session tried 7 attacks. Five held, none broke, and two were out of scope (negative `--n`, and lookalike branches the spec does not name).

<details>
<summary>Attack table (7 attacks)</summary>

| Input | Expected | Observed | Result |
|---|---|---|---|
| A-1: 0, 1, 3 run branches; custom format; `old/run-9` | n = count + 1 | correct | held |
| A-2: flag-like, traversal, injection, control characters, `{name}/../../x`, `../{name}`, `{name}.lock`, `{name}{name}`, empty | clear error, no change | exit 2 JSON errors or safe names, tree unchanged | held |
| A-3: `a\0{name}` | refused | argv cannot carry NUL | held |
| A-4: Unicode digits, huge and negative `--n` | numeric name or error | `--n -5000` gives `sdlc/run--5000` | out-of-scope |
| A-5: 22 near misses under `sdlc/{name}` | no kind | no kind | held |
| A-6: `sdlc/run-` plus a Unicode digit, `sdlc/S-002x`, newline tail | spec names only `sdlc/feature-x` | parse as run or slice | out-of-scope |
| A-7: `feature/PROJ-1-feature/PROJ-1-S-002` and 6 prefixes | literal match | literal match | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No agent or round found one. The spec-fidelity and architecture critiques changed the plan before any code existed (ADR-20261010-014356-planner-S-019-7374). The plan gave T-R-047e as the guard.
- **Seeds** (all non-blocking, duplicates merged):

| Seed | Found by | File |
|---|---|---|
| The format mismatch check runs after the worktree is created, checked out and fast-forwarded | slice seed list | `skills/sdlc/SKILL.md` |
| Prose pins depend on exact wording | slice seed list | `skills/sdlc/test/prompts.test.mjs` |
| The Run worktree bullet merges many separate steps | slice seed list | `skills/sdlc/SKILL.md` |
| Slice rated low-risk but touches the launch driver | slice seed list | `skills/sdlc/SKILL.md` |
| `parse`: a letter suffix after the slice id parses as a slice | cli-0 | `skills/sdlc/branches.py` |
| `parse`: Unicode digits count as run numbers | cli-0, security-0 | `skills/sdlc/branches.py` |
| `parse`: a trailing newline matches the `$` anchor | cli-0, contract-0, security-0 | `skills/sdlc/branches.py` |
| `name` accepts a negative `--n` | security-0 | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: `cli-runner`, `attack-corpus`, `property` (listed in `.sdlc/testkit.json`).
- Plan: [plan-r0.json](../../slices/S-019/verification/plan-r0.json), [plan-r0.md](../../slices/S-019/verification/plan-r0.md).
- Profile evidence: [cli-0](../../slices/S-019/verification/r0/cli-0.json), [contract-0](../../slices/S-019/verification/r0/contract-0.json), [security-0](../../slices/S-019/verification/r0/security-0.json).
- Core verifiers: [spec fidelity](../../slices/S-019/verify-spec-fidelity-r0.md), [regression](../../slices/S-019/verify-regression-r0.md), [security review](../../slices/S-019/review-security-r0.md), [Gate](../../slices/S-019/gate-r0.md).
- Unit tests: `skills/sdlc/test/prompts.test.mjs:927`, `:935`, `:943`, `:950`, `:957`, `:966`, `:978`, `:984`; `skills/sdlc/test/branches.test.mjs:2683`, `:2692`.
- Missing source: no `failures.md` exists, as the slice never failed.
