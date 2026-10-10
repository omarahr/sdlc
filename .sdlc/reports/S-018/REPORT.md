# S-018 · SKILL.md: the flag, the pre-flight bullet and the launch arg
Verdict: RELEASED
Commit under test: beabb98 · Rounds: 1 · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 6 | 19 | 19 | 0 | 0 | 0 / 0 | 11 |

## Summary
The slice teaches the `/sdlc` driver about branch formats. `SKILL.md` gains the `--branch-format` flag, a Branch format pre-flight bullet and a `branchFormat` launch arg. A second bullet ends the run when the worktree holds a different format. Two profiles checked it: `contract` (text order, mutants, 1500 seeded edits) and `cli` (the named `branches.py` commands run in a scratch repo). All 19 cases passed in round 0. Both core verifiers and the Gate held, and `npm test` gave 660 passed, 0 failed, 1 skipped. The verifiers found no blocking defect. Eleven non-blocking seeds stay open.

## Open risks
- The tests pin the wording of `SKILL.md`. A later slice that rewords a bullet must update them.
- No test runs the driver decision to end the run. The tests check only the wording and the commands (seed in the table).
- The mismatch bullet sits in Pre-flight, before the worktree exists. ADR-20261010-012412-decision-judge-S-018-fd46 records this placement. S-019 may move it.
- The slice rewrote one old assertion (`the skill documents the stack flag...`), as ADR-20261010-012416-decision-judge-S-018-b1c1 allows.
- `branches.py` gained `isinstance` checks that the spec does not require. They do not break a requirement.
- A preflight verdict with `error` and no `samples` has no instruction in the bullet.
- The `--branch-format` value passes to a shell command. The driver must keep the double quotes and must not use `eval`.
- Gate time rose from 74 s to 114 s. This is below the 60 s limit for the added time.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-045 | The Commands table gains `--branch-format "<format>"` beside `--commit-format`. | VS-1 | TC-cli-1, TC-cli-2, TC-contract-1, TC-contract-2; unit `T-R-045` | pass |
| R-046 | **Branch format:** the loop names every branch it makes from one format … Run `python3 "$SKILL_DIR/branches.py" preflight --repo "$REPO" --mode <gitMode>` … This check is first run only … | VS-2, VS-6 | TC-cli-3, TC-cli-4, TC-cli-5, TC-contract-3, TC-contract-4, TC-contract-5, TC-contract-9, TC-contract-10, TC-contract-11; unit `T-R-046a`, `T-R-046b` | pass |
| R-097 | When `ok` is true, `FMT` is its `format`; when `derived` is true, tell the user the format you derived and that it is now in config.json. | VS-2, VS-3 | TC-cli-3, TC-cli-6, TC-contract-3, TC-contract-6; unit `T-R-097` | pass |
| R-048 | After the worktree exists, when `$WT/.sdlc/config.json` holds a `branchFormat` that differs from `$FMT`, report both and end: a run in progress keeps its names. | VS-4 | TC-cli-7, TC-cli-8, TC-contract-7; unit `T-R-048` | pass |
| R-049 | In **Launch**, the workflow args gain `branchFormat: "$FMT"`. | VS-5 | TC-contract-8; unit `T-R-049` | pass |

## Scenarios
### VS-1 · The Commands line and flag bullet document --branch-format
Profiles: contract, cli. Risk: A missing or misplaced flag leaves users without the option.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Flag sits after --commit-format; bullet follows | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:27` |
| TC-cli-2 | Mutated SKILL.md (flag missing or first) is rejected | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:31` |
| TC-contract-1 | Commands line holds the flag; bullet follows the commit bullet | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:47` |
| TC-contract-2 | Three mutants fail the reference model | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:54` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-1 · Flag sits after --commit-format; bullet follows · PASS
- **Spec source:** R-045 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-cli-2 · Mutated SKILL.md (flag missing or first) is rejected · PASS
- **Spec source:** R-045 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-contract-1 · Commands line holds the flag; bullet follows the commit bullet · PASS
- **Spec source:** R-045 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

#### TC-contract-2 · Three mutants fail the reference model · PASS
- **Spec source:** R-045 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

</details>

### VS-2 · The Branch format bullet replaces the old Branch name bullet
Profiles: contract, cli. Risk: A wrong bullet ends runs early or skips the pre-flight check.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | Bullet sits after Git mode, before STOP removal; old text gone | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:38` |
| TC-cli-4 | The preflight and parse commands run against branches.py | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:53` |
| TC-cli-5 | Preflight with an invalid format reports ok false | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:74` |
| TC-cli-6 | Preflight with no flag takes the config.json branchFormat | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:82` |
| TC-contract-3 | Placement holds; branch_name_regex and push_rule are gone | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:68` |
| TC-contract-4 | The commands run in direct, pr, mr and stack | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:78` |
| TC-contract-5 | Invalid format gives ok false, error, exit 2 | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:98` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-3 · Bullet sits after Git mode, before STOP removal; old text gone · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-cli-4 · The preflight and parse commands run against branches.py · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-cli-5 · Preflight with an invalid format reports ok false · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-cli-6 · Preflight with no flag takes the config.json branchFormat · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-contract-3 · Placement holds; branch_name_regex and push_rule are gone · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

#### TC-contract-4 · The commands run in direct, pr, mr and stack · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

#### TC-contract-5 · Invalid format gives ok false, error, exit 2 · PASS
- **Spec source:** R-046, R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

</details>

### VS-3 · A resume takes the format from config.json without the flag
Profiles: contract. Risk: A resume without the flag could pick another format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | A resume reads branchFormat from config.json; a derived format is reported | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:111` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-contract-6 · A resume reads branchFormat from config.json; a derived format is reported · PASS
- **Spec source:** R-097 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

</details>

### VS-4 · A different branchFormat in the worktree ends the run with both values
Profiles: contract, cli. Risk: A missed mismatch lets a run in progress change its branch names.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7 | Mismatch bullet follows the Branch format bullet and reports both | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:90` |
| TC-cli-8 | Worktree value and flag value both stay readable | PASS | `.sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:100` |
| TC-contract-7 | Mismatch bullet reports both, ends, run keeps its names | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:120` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-7 · Mismatch bullet follows the Branch format bullet and reports both · PASS
- **Spec source:** R-048 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-cli-8 · Worktree value and flag value both stay readable · PASS
- **Spec source:** R-048 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/cli-0.json`.
- Transcript: `.sdlc/slices/S-018/verification/r0/logs/cli-0.txt` (8 tests, 8 pass, 0 fail, `exit 0`).

#### TC-contract-7 · Mismatch bullet reports both, ends, run keeps its names · PASS
- **Spec source:** R-048 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

</details>

### VS-5 · The Launch args pass branchFormat on every launch
Profiles: contract. Risk: A missing arg gives the workflow no format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-8 | Launch args hold branchFormat between commitFormat and maxIterations | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:128` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-contract-8 · Launch args hold branchFormat between commitFormat and maxIterations · PASS
- **Spec source:** R-049 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

</details>

### VS-6 · The rest of SKILL.md and the existing suites stay intact
Profiles: contract. Risk: An edit could remove text that other pre-flight bullets need.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-9 | Against main, 4 lines removed and 6 added, all expected | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:139` |
| TC-contract-10 | 1500 seeded deletions and swaps: the model detects each required-line change | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs:151` |
| TC-contract-11 | Existing prompts, bootstrap, hub and branches suites stay green | PASS | `.sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-9 · Against main, 4 lines removed and 6 added, all expected · PASS
- **Spec source:** R-046 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

#### TC-contract-10 · 1500 seeded deletions and swaps: the model detects each required-line change · PASS
- **Spec source:** R-046 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

#### TC-contract-11 · Existing prompts, bootstrap, hub and branches suites stay green · PASS
- **Spec source:** R-046 acceptance · **Run:** `cd <worktree of sdlc/S-018> && VERIFY_ROOT=$PWD node --test .sdlc/slices/S-018/verification/r0/tests/contract-0/skill-md.verify-contract.test.mjs`
- **Expected** and **Actual** match. See `.sdlc/slices/S-018/verification/r0/contract-0.json`.
- Log: `.sdlc/slices/S-018/verification/r0/logs/contract-0-run.txt` (file missing, see Appendix). The case result comes from `contract-0.json`.

</details>

## How it was attacked
No security profile was needed. The slice edits driver text only and adds no new I/O boundary. The round 0 security review (`review-security-r0.md`) found no blocking finding. It notes that the driver must keep the double quotes around the user-supplied format.

## Defects found on the way
- **Blocking defects:** none. Both core verifiers, both profiles, the review and the Gate reported none.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| User-supplied branch format reaches a shell command | review | `skills/sdlc/SKILL.md` |
| Mismatch bullet sits before the worktree is created | review | `skills/sdlc/SKILL.md` |
| Rewritten stack-flag assertion matches across a wide span | review | `skills/sdlc/test/prompts.test.mjs` |
| Weak needles in T-R-046a | review | `skills/sdlc/test/prompts.test.mjs` |
| Weak match for the end clause in T-R-048 | review | `skills/sdlc/test/prompts.test.mjs` |
| Prose-pinning tests are brittle to rewording | review | `skills/sdlc/test/prompts.test.mjs` |
| branches.py non-string pattern hardening is outside the slice | review | `skills/sdlc/branches.py` |
| cli: driver end-the-run paths have no run-time check | cli verifier, round 0 | `skills/sdlc/SKILL.md` |
| preflight invalid-format verdict lacks samples, notes and suggestion | cli verifier, round 0 | `skills/sdlc/SKILL.md` |
| Branch format bullet adds a sentence to the spec text | contract verifier, round 0 | `skills/sdlc/SKILL.md` |
| Launch text states the arg as shorthand | contract verifier, round 0 | `skills/sdlc/SKILL.md` |

## Appendix
- Toolkit tools: `cli-runner` (profile cli, runs `branches.py` in a scratch repo); `property` (profile contract, checks `SKILL.md` text and 1500 seeded edits).
- Plan: `../../slices/S-018/verification/plan-r0.json` and `plan-r0.md`.
- Profile evidence, round 0: `../../slices/S-018/verification/r0/cli-0.json`, `cli-0.md`, `contract-0.json`, `contract-0.md`.
- Core verifier summaries: `../../slices/S-018/verify-spec-fidelity-r0.md`, `../../slices/S-018/verify-regression-r0.md`. Also `review-security-r0.md` and `gate-r0.md` in the same folder.
- Missing sources: `logs/contract-0-run.txt` and `logs/contract-0-suites.txt` are not in the evidence folder. The report uses `contract-0.json` for those cases. The seeds table does not record which reviewer found the review seeds, so the table says `review`.
