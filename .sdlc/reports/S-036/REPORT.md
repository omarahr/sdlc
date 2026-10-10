# S-036 · scenario-runner, env-detector, milestone-writer and e2e-harness prompts use branch placeholders
Verdict: RELEASED
Commit under test: 9305783 · Rounds: 3 (r0, r1, r2) · Attempts: 1 · Risk: low (plan); medium (slice) · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 5 | 15 | 15 | 0 | 0 | 2 / 2 | 0 |

## Summary
The four prompts steer agents that create e2e worktrees and branches. They now name every branch through a placeholder, so a changed branch format cannot break them. S-027c had already made the edits. This slice adds tests that pin each prompt, and the slice changes no product file. The contract and cli profiles checked the prompt text, the `branches.py parse` output and a guard that fails on a bad sample. The test-quality review found two blocking problems: tests that repeated T-R-063a and T-R-080. Two fix rounds removed the repeats. Nothing remains open.

## Open risks
- The verifier cases ran only in round r0, at commit 28d6cce. Rounds r1 and r2 re-ran the full suite and did not re-run these cases.
- TC-contract-7 names T-R-144 and T-R-148. Fix rounds removed both tests. T-R-063a and T-R-080 now guard those prompts, and TC-cli-7 shows both fail on a literal.
- R-144 and R-148 have no dedicated test id. T-R-063a and T-R-080 hold their acceptance.
- The default format `sdlc/{name}` stays in `env-detector.md` by design (ADR-20261010-074453-decision-judge-S-027c-1782). The tests do not forbid it.
- No lint, typecheck, build or e2e command is configured. The gate ran `npm test` only.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-132 | scenario-runner.md writes the worktree command as `-b <e2e area branch> <e2e branch>` with no sdlc/ literal | VS-1, VS-5 | TC-contract-1, TC-cli-1, TC-cli-2, TC-contract-6, TC-contract-7, TC-contract-8, TC-cli-5, TC-cli-6, TC-cli-7 | pass |
| R-133 | env-detector.md uses `<run branch>` for the three run-branch literals and says "a branch that parses as kind `run`" in place of the `sdlc/run-*` glob. | VS-2, VS-5 | TC-contract-2, TC-contract-3, TC-cli-3, TC-cli-4, TC-contract-6, TC-contract-7, TC-contract-8, TC-cli-5, TC-cli-6, TC-cli-7 | pass |
| R-144 | milestone-writer.md holds no `sdlc/` branch literal. It uses `<e2e area branch>`, `<e2e branch>` and `<milestone branch>` in their places. | VS-3, VS-5 | TC-contract-4, TC-contract-6, TC-contract-7, TC-contract-8, TC-cli-5, TC-cli-6, TC-cli-7 | pass |
| R-148 | e2e-harness.md holds no `sdlc/` branch literal. It uses `<e2e branch>` and `<milestone branch>`. | VS-4, VS-5 | TC-contract-5, TC-contract-6, TC-contract-7, TC-contract-8, TC-cli-5, TC-cli-6, TC-cli-7 | pass |

## Scenarios
Repo tests that guard the slice: `skills/sdlc/test/prompts.test.mjs:1355` (T-R-132), `:1360` (T-R-133), `:1317` (T-R-063a), `:1367` (T-R-080).

### VS-1 · scenario-runner prompt creates the area worktree through placeholders
Profiles: contract, cli. A literal branch here would send the area worktree to the wrong branch name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | Exact worktree command appears once; variants are absent | PASS | `.sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:20` |
| TC-cli-1 | Exact command present; no loop literal after stripBranchesOutput | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:13` |
| TC-cli-2 | Literal, swapped and respelled variants break the exact-command check | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:19` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-1 · scenario-runner holds the exact worktree command and no literal · PASS
- **Given** slice commit 28d6cce, prompt files read from disk **When** the test reads the prompt text and applies the guard **Then** exact command appears once; swapped, literal and respelled variants are absent; guard matches a literal variant
- **Expected** exact command appears once; swapped, literal and respelled variants are absent; guard matches a literal variant **Actual** as expected.
- **Spec source:** R-132 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`
- Log: [contract-0-verify.log](../../slices/S-036/verification/r0/logs/contract-0-verify.log)

#### TC-cli-1 · scenario-runner.md holds the exact worktree command and no loop literal · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** exact command present; no loop literal after stripBranchesOutput
- **Expected** exact command present; no loop literal after stripBranchesOutput **Actual** as expected.
- **Spec source:** plan-r0 VS-1; R-132 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Log: [cli-0-verify.txt](../../slices/S-036/verification/r0/logs/cli-0-verify.txt)

#### TC-cli-2 · Variants break the exact-command check · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** each variant removes the exact command; the literal variant trips the guard
- **Expected** each variant removes the exact command; the literal variant trips the guard **Actual** as expected.
- **Spec source:** plan-r0 VS-1; R-132 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Log: [cli-0-verify.txt](../../slices/S-036/verification/r0/logs/cli-0-verify.txt)

</details>

### VS-2 · env-detector prompt reads the run branch through the placeholder and the parsed kind
Profiles: contract, cli. A leftover `sdlc/run-` text would break runs that use another branch format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | Three `<run branch>`, the kind phrase, no `sdlc/run-`, default format kept | PASS | `.sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:39` |
| TC-contract-3 | `branches.py parse` gives kind run for `sdlc/run-2` | PASS | `.sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:49` |
| TC-cli-3 | Same prompt checks from the cli profile | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:28` |
| TC-cli-4 | `branches.py parse` gives kind run, tail `run-2`; `feature/x` gives null | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:37` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-2 · env-detector holds three run branch placeholders, the kind phrase and the sdlc/{name} default · PASS
- **Given** slice commit 28d6cce, prompt files read from disk **When** the test reads the prompt text and applies the guard **Then** count of `<run branch>` is at least 3, phrase present, no `sdlc/run-` or glob, `sdlc/{{name}}` still present
- **Expected** count of `<run branch>` is at least 3, phrase present, no `sdlc/run-` or glob, `sdlc/{{name}}` still present **Actual** as expected.
- **Spec source:** R-133 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`
- Log: [contract-0-verify.log](../../slices/S-036/verification/r0/logs/contract-0-verify.log)

#### TC-contract-3 · branches.py parse returns kind run for sdlc/run-2 under the default format · PASS
- **Given** slice commit 28d6cce, prompt files read from disk **When** the test reads the prompt text and applies the guard **Then** `sdlc/run-2` gives kind run, `sdlc/S-003` slice, `sdlc/M-1` milestone, `sdlc/run-2-x` null; tree unchanged
- **Expected** `sdlc/run-2` gives kind run, `sdlc/S-003` slice, `sdlc/M-1` milestone, `sdlc/run-2-x` null; tree unchanged **Actual** as expected.
- **Spec source:** R-133 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`
- ```text
sdlc/run-2 -> exit 0 kind=run n=2
sdlc/S-003 -> kind=slice
sdlc/M-1 -> kind=milestone
sdlc/run-2-x -> kind=null
```

#### TC-cli-3 · env-detector.md has 3 run placeholders, the kind phrase, no sdlc/run- text, and keeps sdlc/{name} · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** 3 placeholders, phrase present, default format allowed
- **Expected** 3 placeholders, phrase present, default format allowed **Actual** as expected.
- **Spec source:** plan-r0 VS-2; R-133 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Log: [cli-0-verify.txt](../../slices/S-036/verification/r0/logs/cli-0-verify.txt)

#### TC-cli-4 · branches.py parse under sdlc/{name} reports kind run for sdlc/run-2 · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** exit 0, kind run, tail run-2; feature/x gives kind null
- **Expected** exit 0, kind run, tail run-2; feature/x gives kind null **Actual** as expected.
- **Spec source:** plan-r0 VS-2; R-133 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- ```console
$ python3 branches.py parse --repo <scratch> --branch sdlc/run-2 --format sdlc/{name}
exit 0 {"ok":true,"branch":"sdlc/run-2","kind":"run","tail":"run-2","n":2}
$ ... --branch feature/x
exit 0 {"ok":true,"branch":"feature/x","kind":null}
```

</details>

### VS-3 · milestone-writer prompt names e2e area, e2e and milestone branches through placeholders
Profiles: contract. The prompt had six `sdlc/M-<n>` literals before S-027c.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | Three placeholders present; no literal, including in code spans | PASS | `.sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:65` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-contract-4 · milestone-writer holds all three placeholders and no literal, including in code spans · PASS
- **Given** slice commit 28d6cce, prompt files read from disk **When** the test reads the prompt text and applies the guard **Then** three placeholders present; no `sdlc/M-`, `sdlc/<id>-e2e` or loop literal in any code span
- **Expected** three placeholders present; no `sdlc/M-`, `sdlc/<id>-e2e` or loop literal in any code span **Actual** as expected.
- **Spec source:** R-144 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`
- Log: [contract-0-verify.log](../../slices/S-036/verification/r0/logs/contract-0-verify.log)

</details>

### VS-4 · e2e-harness prompt names e2e and milestone branches through placeholders
Profiles: contract. A literal here would tie the harness to one branch format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | Both placeholders present; no literal | PASS | `.sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:78` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-contract-5 · e2e-harness holds both placeholders and no literal · PASS
- **Given** slice commit 28d6cce, prompt files read from disk **When** the test reads the prompt text and applies the guard **Then** both placeholders present; no `sdlc/<milestoneId>-e2e` or `sdlc/M-`
- **Expected** both placeholders present; no `sdlc/<milestoneId>-e2e` or `sdlc/M-` **Actual** as expected.
- **Spec source:** R-148 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`
- Log: [contract-0-verify.log](../../slices/S-036/verification/r0/logs/contract-0-verify.log)

</details>

### VS-5 · the branch literal guard fails on a bad sample and ignores allowed text
Profiles: contract, cli. A guard that cannot fail would hide a returning literal.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | 1200 seeded mutations: every literal matches; allowed text never matches | PASS | `.sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs:86` |
| TC-contract-7 | A literal in a scratch copy of each prompt fails its pinned test | PASS | manual probe |
| TC-contract-8 | `npm test` passes on the slice commit | PASS | manual probe |
| TC-cli-5 | Guard matches bad samples; ignores `sdlc/{name}`, `.sdlc/` and similar | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:48` |
| TC-cli-6 | A literal injected into each prompt trips the guard, bare or in a fence | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:56` |
| TC-cli-7 | A literal in a scratch `milestone-writer.md` fails T-R-063a, T-R-144 and T-R-080 | PASS | `.sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:66` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-contract-6 · guard property: 1200 seeded mutations of the four prompts · PASS
- **Given** slice commit 28d6cce, prompt files read from disk **When** the test reads the prompt text and applies the guard **Then** every injected literal matches in 5 wrappers and 10 forms; `sdlc/{{name}}` never matches
- **Expected** every injected literal matches in 5 wrappers and 10 forms; `sdlc/{{name}}` never matches **Actual** as expected.
- **Spec source:** R-132, R-133, R-144, R-148 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-036/verification/r0/tests/contract-0/prompt-branch-literals.verify-contract.test.mjs`
- property-run seed=20261010 runs=1200 result=pass

#### TC-contract-7 · Injecting a literal into a scratch copy of each prompt fails its pinned test · PASS
- **Given** a scratch copy of skills/sdlc **When** one line per prompt changes to a literal and the matching T-R test runs **Then** each pinned test fails
- **Expected** each pinned test fails **Actual** as expected.
- **Spec source:** R-132, R-133, R-144, R-148 acceptance · **Run:** `node --test --test-name-pattern=<id> skills/sdlc/test/prompts.test.mjs (scratch copy)`
- ```console
scenario-runner -b sdlc/M-1-e2e-x -> T-R-132 fail
env-detector git checkout -b sdlc/run-2 -> T-R-133 fail
milestone-writer <milestone branch> -> sdlc/M-1 -> T-R-144 fail
e2e-harness <e2e branch> -> sdlc/M-1-e2e -> T-R-148 fail
```
T-R-144 and T-R-148 no longer exist (see Defects).

#### TC-contract-8 · prompts.test.mjs and the full npm test pass on the slice commit · PASS
- **Given** slice commit 28d6cce **When** `npm test` runs **Then** exit 0
- **Expected** exit 0 **Actual** as expected.
- **Spec source:** R-132, R-133, R-144, R-148 acceptance · **Run:** `npm test`
- Log: [contract-0-npm-test.log](../../slices/S-036/verification/r0/logs/contract-0-npm-test.log)

#### TC-cli-5 · Guard matches sdlc/M-1, sdlc/run-2, sdlc/S-003 and e2e forms; ignores allowed text · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** all bad samples match; all allowed samples do not
- **Expected** all bad samples match; all allowed samples do not **Actual** as expected.
- **Spec source:** plan-r0 VS-5; R-132, R-133, R-144, R-148 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Log: [cli-0-verify.txt](../../slices/S-036/verification/r0/logs/cli-0-verify.txt)

#### TC-cli-6 · A literal injected into each of the four prompts trips the guard · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** 8 injections and 4 fence injections all match
- **Expected** 8 injections and 4 fence injections all match **Actual** as expected.
- **Spec source:** plan-r0 VS-5; R-132, R-133, R-144, R-148 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Log: [cli-0-verify.txt](../../slices/S-036/verification/r0/logs/cli-0-verify.txt)

#### TC-cli-7 · A literal in a scratch copy of milestone-writer.md fails three tests · PASS
- **Given** the prompts on sdlc/S-036 at 28d6cce **When** the test reads the prompt files from disk and runs the guard regex **Then** the real suite exits non-zero and names the three tests
- **Expected** the real suite exits non-zero and names the three tests **Actual** as expected.
- **Spec source:** plan-r0 VS-5; R-132, R-133, R-144, R-148 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-036> node --test .sdlc/slices/S-036/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- ```console
scratch copy + "Create sdlc/M-1 now." -> failed: T-R-063a, T-R-144, T-R-080
```

</details>

## How it was attacked
No security profile was needed. The security review found no attack surface: the tests read repo files, open no connection, run no shell command and write no file.

## Defects found on the way
- **Blocking defects**
  - T-R-148 duplicated T-R-063a. Found by review-test-quality, round 0 (`review-test-quality-r0.md`). Spec source: test-quality lens. Reproduce: compare the e2e-harness row of T-R-063a with T-R-148. Fixed in 099a714 (fix round 2). Guard: T-R-063a and T-R-080.
  - T-R-132, T-R-133 and T-R-144 repeated the loop literal scan and the placeholder list. Found by review-test-quality, round 0. Reproduce: compare each test with T-R-063a and T-R-080. Fixed in 06c6f19 (fix round 1). Guard: T-R-132 keeps the exact command; T-R-133 keeps the placeholder count and the kind phrase.
  - The core verifiers found no defect in any round (`verify-spec-fidelity-r0.md` to `r2.md`, `verify-regression-r0.md` to `r2.md`).
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| none open | | |

## Appendix
- Toolkit: `cli-runner` (cli profile; `branches.py parse` and `node --test` in a scratch repo), listed in `.sdlc/testkit.json`.
- Plans: [r0](../../slices/S-036/verification/plan-r0.md), [r1](../../slices/S-036/verification/plan-r1.md), [r2](../../slices/S-036/verification/plan-r2.md).
- Profile evidence: [contract-0](../../slices/S-036/verification/r0/contract-0.md), [cli-0](../../slices/S-036/verification/r0/cli-0.md).
- Core verifiers: [spec-fidelity r0](../../slices/S-036/verify-spec-fidelity-r0.md), [r1](../../slices/S-036/verify-spec-fidelity-r1.md), [r2](../../slices/S-036/verify-spec-fidelity-r2.md); [regression r0](../../slices/S-036/verify-regression-r0.md), [r1](../../slices/S-036/verify-regression-r1.md), [r2](../../slices/S-036/verify-regression-r2.md).
- Gate: [gate-r0](../../slices/S-036/gate-r0.md): `npm test` passed at 9305783 in 94 s.
- Missing sources: no profile evidence exists for rounds r1 and r2, because those rounds ran only the core verifiers.
