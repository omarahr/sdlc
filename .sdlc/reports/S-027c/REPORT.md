# S-027c · remaining prompts replace branch literals and a test guards the sweep
Verdict: RELEASED
Commit under test: 3990648 · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 7 | 11 | 11 | 0 | 0 | 1 / 1 | 6 |

## Summary
The slice replaces every loop branch name in the prompt files and `SKILL.md` with the placeholders that `_common.md` defines. A new test scans all of these files and fails when a literal branch name comes back. The contract and cli profiles checked the result in round 0. They read each edited sentence, ran an independent scan over 55 files, and ran the STE linter. All 11 cases passed. The review found one defect: an edit dropped the env-detector numbering assertion. The fix restored it. Round 1 re-ran the core verifiers and the gate. Both passed with 746 tests and 0 failures. Six non-blocking seeds remain open.

## Open risks
- The scan helper removes a whole fenced block that only mentions `branches.py`. A hand-written literal inside such a block would pass. No prompt has such a block today.
- `SKILL.md` is outside the STE linter gate. It holds 57 violations, and the base held 56.
- The spec regex matches the default format text `sdlc/{name}`. The slice adds `{name` to the lookahead (ADR-20261010-074453-decision-judge-S-027c-1782). The spec text still shows the old regex.
- The escalator spike phrase sits inside code backticks. It reads like a literal branch name. The meaning is clear.
- Round 1 ran no profile agents. The profile evidence is from round 0 at `afe9bbe`. Round 1 changed one test assertion only.
- The gate had no lint, typecheck, build or e2e command to run.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-063 | Every prompt that spells a branch today uses the placeholder instead. The literals to replace, by file (paths under `.sdlc/` are not branches and stay): | VS-1, VS-2, VS-3, VS-5, VS-6, VS-7 | TC-cli-1, TC-cli-2, TC-cli-3, TC-cli-4, TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-6, TC-contract-7 | pass |
| R-080 | `no prompt spells a loop branch literally`: for every prompt file and `SKILL.md`, no match for `(?<![.\w])sdlc/(?!tracker\|STOP)` outside fenced blocks that quote `branches.py` output. | VS-3, VS-4, VS-7 | TC-cli-2, TC-contract-3, TC-contract-4, TC-contract-5, TC-contract-7 | pass |

## Scenarios

### VS-1 · Every file row of the section 8 table uses its mapped placeholders and no literal
Profiles: contract, cli. A wrong placeholder misdirects one role at run time.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | 22 table-row files hold their placeholders and no literal | PASS | `.sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:50` |
| TC-contract-1 | 23 files hold every mapped placeholder | PASS | `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:56` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-1 · Each of 22 table-row files holds its mapped placeholders and no literal · PASS
- **Given** the worktree of `sdlc/S-027c` at `afe9bbe` **When** the check runs from a scratch cwd **Then** no placeholder is missing and no literal is left.
- **Expected** 22 files, 0 missing placeholders, 0 literals outside fences. **Actual** the same.
- **Spec source:** R-063 acceptance, spec section 8 table · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Transcript: [cli-0-vs1.txt](../../slices/S-027c/verification/r0/logs/cli-0-vs1.txt)

#### TC-contract-1 · Each section 8 row holds its mapped placeholders · PASS
- **Given** the 23 prompt files of the table **When** each file is read for each mapped placeholder **Then** every placeholder is present.
- **Expected** every placeholder present. **Actual** all 23 files hold their placeholders.
- **Spec source:** R-063 acceptance · **Run:** `VERIFY_ROOT=$PWD VERIFY_REPO=$PWD node --test .sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs`
- Log: `VS-1 pass; 23 rows checked`

</details>

### VS-2 · The six extra literals are gone
Profiles: contract. The sweep must also cover literals that the spec table omits.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | The extra literals are gone and `sdlc/{name}` stays | PASS | `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:73` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-2 · The six extra literals are gone and sdlc/{name} stays · PASS
- **Given** commit-state, escalator, `SKILL.md`, state-schema and four other prompts **When** the files are scanned for old literals and the default format text **Then** no old literal remains and the default text stays.
- **Expected** no old literal; default text in `SKILL.md` and `state-schema.md`. **Actual** as expected; the escalator spike phrase is present.
- **Spec source:** ADR-20261010-074457-decision-judge-S-027c-44f1 · **Run:** `VERIFY_ROOT=$PWD VERIFY_REPO=$PWD node --test .sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs`
- Log: `VS-2 pass`

</details>

### VS-3 · The scan finds no literal outside fenced blocks that quote branches.py output
Profiles: contract, cli. A weak scan could pass with a literal still in place.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | An independent scan of 55 files finds 0 hits | PASS | `.sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:64` |
| TC-contract-3 | A line-based scan finds no hit, with or without a fence exemption | PASS | `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:28` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-2 · Independent scan over 55 .md files finds no loop branch literal · PASS
- **Given** the worktree at `afe9bbe` **When** the scan runs from a scratch cwd **Then** it finds no hit, and the positive and negative fixtures behave.
- **Expected** 55 files scanned, 0 hits. **Actual** the same.
- **Spec source:** R-063, R-080 · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Transcript: [cli-0-vs3.txt](../../slices/S-027c/verification/r0/logs/cli-0-vs3.txt)

#### TC-contract-3 · Independent line-based scan finds no literal · PASS
- **Given** 55 files (54 under `prompts/` plus `SKILL.md`) **When** a line parser handles ``` and ~~~ fences, and again with no exemption **Then** neither scan hits. `sdlc/S-001` matches. `.sdlc/slices`, `sdlc/tracker`, `sdlc/STOP` and `sdlc/{name}` do not.
- **Expected** no hit in either scan. **Actual** `files=55, exempt=[], bad=[], raw hits=[]`. No fenced block exempts anything.
- **Spec source:** R-063 acceptance, R-080 quote · **Run:** `VERIFY_ROOT=$PWD VERIFY_REPO=$PWD node --test .sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs`
- Log: [contract-0-scan.txt](../../slices/S-027c/verification/r0/logs/contract-0-scan.txt)

</details>

### VS-4 · The scan resists false passes and false failures at fence boundaries
Profiles: contract. A fence edge case could hide a literal or fail a clean file.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | The shipped helper fails an unfenced literal and passes an empty text | PASS | `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:92` |
| TC-contract-5 | The helper agrees with a reference model in 1500 random documents | PASS | `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:115` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-4 · Shipped scan helper at fence boundaries · PASS
- **Given** fixtures with a `branches.py` output block plus an unfenced literal, an unclosed fence, tilde fences, an inline span and an empty text **When** the shipped `stripBranchesOutput` and the pattern run **Then** the unfenced literal fails, and so do the unclosed, tilde and inline cases. The empty text passes.
- **Expected** as stated. **Actual** all fixtures behave as expected.
- **Spec source:** R-080 quote · **Run:** `VERIFY_ROOT=$PWD VERIFY_REPO=$PWD node --test .sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs`
- Log: output block exempt; literal after or before it fails; plain block fails; `~~~` fails; unclosed fails; inline span fails; literal between two blocks fails.

#### TC-contract-5 · Property: scan helper against a reference model · PASS
- **Given** random documents of safe text, literals, `branches.py` blocks and plain blocks **When** the helper runs against the model **Then** the two never disagree.
- **Expected** no disagreement in 1500 runs. **Actual** no disagreement.
- **Spec source:** R-080 quote · **Run:** `VERIFY_ROOT=$PWD VERIFY_REPO=$PWD node --test .sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs`
- Property run: `property-run seed=1008863937 runs=1500 failures=0 counterexample=null`

</details>

### VS-5 · Each placeholder stands for the right branch kind at its place
Profiles: contract. A swapped kind would send a role to the wrong branch.

The contract verifier read each edited sentence. No test case records this check. The note in `contract-0.md` says the slice, run, milestone, e2e, state and attempt placeholders sit in matching steps. The verify branch placeholder appears only in the collector input. No kind is swapped.

### VS-6 · Edited prompts pass the STE linter and keep their commands whole
Profiles: cli, contract. Longer placeholder phrases could break the sentence limit.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | `ste-check.py` exits 0 on 23 edited prompts | PASS | `.sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:83` |
| TC-cli-4 | Git commands keep one placeholder per argument | PASS | `.sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:98` |
| TC-contract-6 | `ste-check.py` exits 0 on all 54 prompts | PASS | `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:138` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-3 · ste-check.py exits 0 with empty stdout on 23 edited prompts; unreadable file exits 1 · PASS
- **Given** the worktree at `afe9bbe` **When** the linter runs **Then** it reports no violation.
- **Expected** exit 0. **Actual** exit 0, no violations.
- **Spec source:** R-063 (STE rule, `_common.md`) · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Transcript: [cli-0-ste.txt](../../slices/S-027c/verification/r0/logs/cli-0-ste.txt)

#### TC-cli-4 · Git commands keep one placeholder per argument and the worktree rule stays · PASS
- **Given** the worktree at `afe9bbe` **When** every git command in the prompts is scanned **Then** none is malformed, and the worktree add line keeps `<slice branch>`.
- **Expected** 0 malformed commands. **Actual** the same.
- **Spec source:** R-063, plan Risks · **Run:** `VERIFY_WT=<worktree> node --test .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs`
- Transcript: [cli-0-cmds.txt](../../slices/S-027c/verification/r0/logs/cli-0-cmds.txt)

#### TC-contract-6 · ste-check passes on all prompts · PASS
- **Given** all 54 prompt files **When** `ste-check.py` runs **Then** it exits 0.
- **Expected** exit 0. **Actual** exit 0, no output.
- **Spec source:** R-063 (edited prompts keep STE) · **Run:** `VERIFY_ROOT=$PWD VERIFY_REPO=$PWD node --test .sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs`

</details>

### VS-7 · The updated old assertions still check the same sentences
Profiles: contract. A weakened assertion would let a bad edit pass.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | Each literal assertion now holds its placeholder in the same sentence | PASS | `skills/sdlc/test/prompts.test.mjs:1` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-7 · Updated assertions keep their sentences; suite runs green · PASS
- **Given** the diff of `skills/sdlc/test/prompts.test.mjs` **When** each changed assertion is read and the file runs **Then** every assertion keeps its sentence.
- **Expected** all tests pass with no weakened assertion. **Actual** 91 of 91 pass. One assertion was dropped. The review found it, and fix round 1 restored it.
- **Spec source:** R-063, R-080 · **Run:** `node --test skills/sdlc/test/prompts.test.mjs`
- Log: `tests 91 · pass 91 · fail 0`

</details>

The slice's own tests are `T-R-063a` (`skills/sdlc/test/prompts.test.mjs:1306`), `T-R-063b` (`skills/sdlc/test/prompts.test.mjs:1328`) and `T-R-080` (`skills/sdlc/test/prompts.test.mjs:1344`).

## How it was attacked
No security profile was needed. The slice changes prompt text and tests only. The security review (round 0 and round 1) found no blocking issue. Every force-push rule still names one branch. No user text reaches a shell.

## Defects found on the way
- **Blocking defects**
  - **env-detector numbering assertion dropped.** The test-quality review found it in round 0. Spec source: R-063 (the edit must not weaken a test). Reproduce: read the env-detector test in `skills/sdlc/test/prompts.test.mjs`; it had only a `doesNotMatch` on the old literal. The fix is commit `b45d932`. The test now asserts "(count of branches of kind `run`) + 1".
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| Spike branch phrase sits inside code backticks | review (architecture), verifiers | `skills/sdlc/prompts/escalator.md` |
| Fence stripping can hide a hand-written literal | review (test-quality), contract verifier | `skills/sdlc/test/prompts.test.mjs` |
| `tests.md` describes tests by their failing state | review (test-quality) | `.sdlc/slices/S-027c/tests.md` |
| T-R-063a partly repeats per-file assertions | review (test-quality) | `skills/sdlc/test/prompts.test.mjs` |
| Spec regex matches the default format text | plan critique | `docs/superpowers/specs/2026-10-08-branch-format-design.md` |
| `SKILL.md` is outside the STE linter gate and holds 57 violations | cli verifier | `skills/sdlc/SKILL.md` |

## Appendix
- Verification tools: `cli-runner`, `property`, `attack-corpus` (planned); the cases ran as node tests under `.sdlc/slices/S-027c/verification/r0/tests/`.
- Plans: [plan-r0](../../slices/S-027c/verification/plan-r0.md), [plan-r1](../../slices/S-027c/verification/plan-r1.md).
- Profile evidence: [cli-0](../../slices/S-027c/verification/r0/cli-0.md), [contract-0](../../slices/S-027c/verification/r0/contract-0.md).
- Core verifiers: [spec-fidelity r0](../../slices/S-027c/verify-spec-fidelity-r0.md), [spec-fidelity r1](../../slices/S-027c/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-027c/verify-regression-r0.md), [regression r1](../../slices/S-027c/verify-regression-r1.md), [gate r0](../../slices/S-027c/gate-r0.md).
- Missing sources: no profile evidence exists for round 1. Round 1 ran the core verifiers and the gate only.
