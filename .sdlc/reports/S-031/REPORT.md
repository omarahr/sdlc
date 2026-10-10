# S-031 · evaluate regex, name literals and preflight edge formats
Verdict: RELEASED
Commit under test: 80597dc (gate receipt covers f620dd4) · Rounds: 1 (round 0) · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 5 | 21 | 21 | 0 | 0 | 0 / 0 | 3 |

## Summary
The slice adds eight tests to `skills/sdlc/test/branches.test.mjs`. They pin the acceptance text of R-127, R-140, R-142, R-150 and R-151 for `branches.py`. No product file changed, because earlier slices built the code. The verifiers ran the cli and contract profiles on all five scenarios, and the security profile on the invalid-ref scenario. Every one of the 21 cases passed in round 0. The core verifiers found no defect. The gate passed with `npm test`. Three non-blocking seeds remain open, and one review finding about a duplicate test is not resolved.

## Open risks
- The test-quality review asked to delete T-R-150a. Existing tests already pin the same exit code and error text. The test is still in the file. It costs time only and hides no defect.
- Seed: T-R-127a repeats cases near line 1441 of `branches.test.mjs`. Keep it if the literal acceptance values are wanted.
- Seed: T-R-140a partly repeats T-R-030a. It adds the preflight path and the no-group check.
- The `git check-ref-format` message differs between git versions. The tests assert only the words `check-ref-format` and `not a valid branch name`.
- The security profile ran one attack family set (flag-like values, control characters, injection). No separate security session was planned.
- Nothing was measured without a spec number. Test time was 94 s against an 88 s baseline.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-127 | "`regex`: `re.search(pattern, sample) is not None`." | VS-1 | TC-cli-1, TC-cli-2, TC-cli-3, TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-4, TC-contract-5, TC-contract-6 | pass |
| R-140 | "GitLab group push rules seed new projects and are not evaluated at push time beside the project rule, so only the project rule is read." | VS-2 | TC-cli-4, TC-cli-5, TC-contract-7 | pass |
| R-142 | "A ticket key or a type prefix a convention wants is literal text: `feature/PROJ-123-{name}` names the first slice `feature/PROJ-123-S-001`." | VS-3 | TC-cli-6, TC-contract-8, TC-contract-9, TC-contract-10 | pass |
| R-150 | "**A literal part that makes an invalid ref**: `validate_format` rejects the format at pre-flight with `git check-ref-format`'s reason." | VS-4 | TC-cli-7, TC-cli-8, TC-cli-9 | pass |
| R-151 | "**No format, no rules**: the default; nothing changes for any repo that has no rule." | VS-5 | TC-cli-10, TC-cli-11 | pass |

The slice tests are T-R-127a and T-R-127b (R-127), T-R-140a and T-R-140b (R-140), T-R-142a (R-142), T-R-150a (R-150), T-R-151a and T-R-151b (R-151). They are in `skills/sdlc/test/branches.test.mjs` at lines 2817, 2829, 2841, 2851, 2862, 2882, 2891 and 2900. All eight passed in the gate run.

## Scenarios

### VS-1 · A regex rule matches anywhere in the sample
Profiles: cli, contract. Risk: a mistaken anchor would make `feature` stop matching `x/feature/y`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | A GitHub regex rule `feature` passes the format `x/feature/{name}` | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:15` |
| TC-cli-2 | Rule `^feature/` fails the default format and passes `feature/{name}` | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:25` |
| TC-cli-3 | Invalid or empty patterns do not crash the command | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:40` |
| TC-contract-1 | Spec examples give True, False, True | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:42` |
| TC-contract-2 | Empty, invalid, newline and multiline corners hold search semantics | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:50` |
| TC-contract-3 | 2000 generated patterns match a reference model | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:65` |
| TC-contract-4 | Same input gives the same output | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:82` |
| TC-contract-5 | A consumer preflight passes with a derivable format and fails with the default | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:139` |
| TC-contract-6 | An invalid regex rule gives no traceback | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:156` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-1 · Github regex rule feature matches x/feature/{name} · PASS
- **Given** a scratch git repo with a controlled HOME and PATH. **When** `preflight` in pr mode runs with `--format x/feature/{name}` and the gh shim returns the regex rule `feature`. **Then** every sample passes.
- **Expected** every sample passes, exit 0, tree unchanged. **Actual** the same.
- **Spec source:** R-127 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
```console
node test run, 11 of 11 pass
exit 0
```
Full log: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

#### TC-cli-2 · Rule ^feature/ fails the default format and passes feature/{name} · PASS
- **Given** the rule `^feature/`. **When** `preflight` runs with the default format, then `feature/{name}`, then `x/feature/{name}`. **Then** the results differ by format.
- **Expected** default: exit 1 and slice sample fail; `feature/`: exit 0; `x/feature/`: exit 1. **Actual** the same.
- **Spec source:** R-127 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

#### TC-cli-3 · Invalid or empty regex patterns do not crash the command · PASS
- **Given** the patterns `(`, `[`, `*abc` and the empty string. **When** each goes through the gh shim. **Then** the command ends cleanly.
- **Expected** exit 0 to 2, JSON on stdout, no Traceback, tree unchanged. **Actual** the same.
- **Spec source:** R-127 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

#### TC-contract-1 · Spec examples for regex evaluate · PASS
- **Given** `evaluate` with a regex rule. **When** `feature` meets `x/feature/y`, `^feature/` meets `sdlc/S-001`, and `^feature/` meets `feature/S-001`. **Then** the results are True, False, True.
- **Expected** True, False, True. **Actual** True, False, True.
- **Spec source:** R-127 acceptance · **Run:** `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`
```console
regex_eval('feature','x/feature/y') -> true
regex_eval('^feature/','sdlc/S-001') -> false
regex_eval('^feature/','feature/S-001') -> true
```

#### TC-contract-2 · Corners: empty, invalid, newline, multiline anchors · PASS
- **Given** edge patterns. **When** the empty pattern, `(`, `[`, `^a$` on `a\n`, and `^feature` on `x\nfeature` run. **Then** search semantics hold.
- **Expected** empty matches; invalid gives None without an exception. **Actual** the same.
- **Spec source:** R-127 acceptance · **Run:** same command as TC-contract-1
- Evidence: property-run, see [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

#### TC-contract-3 · Property: regex search equals reference model · PASS
- **Given** generated literal patterns with optional `^` and `$`. **When** 2000 runs execute with seed 4227400405, negation included. **Then** no run differs from the model.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-127 acceptance · **Run:** same command as TC-contract-1
- Evidence: property-run, 2000 runs, seed 4227400405, pass. See [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

#### TC-contract-4 · Determinism: same input, same output · PASS
- **Given** 500 generated pairs. **When** each pair runs twice. **Then** both results are equal.
- **Expected** identical results. **Actual** identical results.
- **Spec source:** R-127 acceptance · **Run:** same command as TC-contract-1
- Evidence: property-run, 500 pairs, pass. See [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

#### TC-contract-5 · Consumer view: preflight with GitHub regex rule · PASS
- **Given** pr mode and the rule `^feature/`. **When** `preflight` runs with `feature/{name}`, then with the default format. **Then** the first passes and the second fails the slice sample.
- **Expected** exit 0 and all pass; exit 1 and slice sample fail. **Actual** the same.
- **Spec source:** R-127 acceptance · **Run:** same command as TC-contract-1
- Evidence: [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

#### TC-contract-6 · Consumer view: invalid regex rule · PASS
- **Given** pr mode and the rule pattern `(`. **When** `preflight` runs. **Then** no traceback appears.
- **Expected** no traceback; samples unevaluated with a note. **Actual** the same.
- **Spec source:** R-127 acceptance · **Run:** same command as TC-contract-1
- Evidence: [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

</details>

### VS-2 · A GitLab forge reads only the project push rule
Profiles: cli, contract. Risk: a group endpoint call or an extra glab call would read a rule that is not evaluated at push time.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | One glab call, `api projects/:fullpath/push_rule`, no group path | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:53` |
| TC-cli-5 | An empty body and a glab failure keep one call and give no rules | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:71` |
| TC-contract-7 | Pr and stack modes call only the project push rule | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:176` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-4 · Gitlab reads exactly one call · PASS
- **Given** a scratch repo and the glab stub. **When** `preflight` runs in pr and stack modes with a `branch_name_regex` body. **Then** the stub records one argv.
- **Expected** one argv `[api, projects/:fullpath/push_rule]`, no group path, one rule with source `gitlab` and label `push rule`. **Actual** the same.
- **Spec source:** R-140 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

#### TC-cli-5 · Empty body and glab failure · PASS
- **Given** the glab stub. **When** it returns `{}`, then exits 1 with `boom`. **Then** preflight reports no rules and one call.
- **Expected** empty body: no rules, one call. Failure: no rules, the note holds `boom`, all samples unchecked, one call. **Actual** the same.
- **Spec source:** R-140 acceptance · **Run:** same command as TC-cli-4
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

#### TC-contract-7 · Preflight calls only the project push rule · PASS
- **Given** the glab stub with bodies `branch_name_regex`, empty, null and failure. **When** `preflight --mode pr` and `--mode stack` run. **Then** the call list holds one entry per run.
- **Expected** exactly one call, argv `api projects/:fullpath/push_rule`, no group path. **Actual** the same.
- **Spec source:** R-140 acceptance · **Run:** `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`
- Evidence: [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

</details>

### VS-3 · A literal prefix with a ticket key names the slice branch
Profiles: cli, contract. Risk: a changed digit or hyphen in the literal text would name the wrong branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | `name` and `preflight` give `feature/PROJ-123-S-001` | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:88` |
| TC-contract-8 | Spec example holds, `validate_format` accepts, a trailing slash is refused | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:90` |
| TC-contract-9 | 1500 generated formats keep prefix and suffix byte for byte | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:104` |
| TC-contract-10 | A consumer `name` and `preflight` give the same branch | PASS | `.sdlc/slices/S-031/verification/r0/tests/contract-0/contract.verify-contract.test.mjs:201` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-6 · Literal prefix with ticket key names the slice branch · PASS
- **Given** the format `feature/PROJ-123-{name}`. **When** `name` runs for S-001, S-002, S-027a, S-fix-3 and milestone M-1, then `preflight` in pr mode, then a trailing-slash variant. **Then** the branch keeps the literal text.
- **Expected** `feature/PROJ-123-S-001`; preflight `ok` true, `given` true, slice sample `feature/PROJ-123-S-001`; the trailing slash gives a JSON verdict. **Actual** the same.
- **Spec source:** R-142 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt), [cli-0-probe.txt](../../slices/S-031/verification/r0/logs/cli-0-probe.txt)

#### TC-contract-8 · Spec example for the literal prefix format · PASS
- **Given** the format `feature/PROJ-123-{name}`. **When** `name` runs for S-001, S-002, S-012a and M-1, `validate_format` runs, and a trailing-slash variant runs. **Then** names keep the prefix.
- **Expected** `feature/PROJ-123-S-001` and variants; validate accepts; the trailing slash is refused by `check-ref-format`. **Actual** the same.
- **Spec source:** R-142 acceptance · **Run:** `cd .sdlc/slices/S-031/verification/r0/tests/contract-0 && VERIFY_REPO=<worktree> node --test contract.verify-contract.test.mjs`
- Evidence: property-run, see [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

#### TC-contract-9 · Property: prefix and suffix kept byte for byte · PASS
- **Given** 1500 generated literal formats. **When** `name` runs for a slice. **Then** the result is prefix, id, suffix.
- **Expected** prefix + id + suffix; all formats pass `validate_format`. **Actual** the same for the 300 formats checked by `validate_format`.
- **Spec source:** R-142 acceptance · **Run:** same command as TC-contract-8
- Evidence: property-run, see [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

#### TC-contract-10 · Consumer view: name and preflight · PASS
- **Given** a repo with no config. **When** `name` and `preflight --format` run. **Then** both give the literal branch.
- **Expected** branch `feature/PROJ-123-S-001`; `ok` true, `given` true. **Actual** the same.
- **Spec source:** R-142 acceptance · **Run:** same command as TC-contract-8
- Evidence: [contract-0.log](../../slices/S-031/verification/r0/logs/contract-0.log)

</details>

### VS-4 · A format with an invalid ref is refused at pre-flight
Profiles: cli, security. Risk: a bad format could pass pre-flight, crash the tool, or run as a command.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7 | `sdlc/{name}..` exits 2 with the `check-ref-format` reason | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:113` |
| TC-cli-8 | Other invalid parts and hostile values end cleanly | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:125` |
| TC-cli-9 | Format text never runs as a command | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:147` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-7 · Format sdlc/{name}.. is refused with check-ref-format reason · PASS
- **Given** a scratch repo. **When** `preflight pr --format sdlc/{name}..` runs. **Then** the tool refuses the format.
- **Expected** exit 2, one JSON line, `ok` false, an error with `check-ref-format` and `not a valid branch name`, tree unchanged. **Actual** the same.
- **Spec source:** R-150 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt), [cli-0-probe.txt](../../slices/S-031/verification/r0/logs/cli-0-probe.txt)

#### TC-cli-8 · Other invalid parts and hostile values · PASS
- **Given** formats with a space, `~`, `:`, a trailing dot, `.lock`, a leading dash, BEL, newline, `^`, `[`, `?` and `//`. **When** `preflight` runs on each, then on corpus values. **Then** each ends cleanly.
- **Expected** invalid parts: exit 2 and `ok` false. Corpus values: JSON, no Traceback, exit 0 to 2, tree unchanged. **Actual** the same.
- **Spec source:** R-150 acceptance · **Run:** same command as TC-cli-7
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

#### TC-cli-9 · Format text is never run as a command · PASS
- **Given** formats with `$(touch M)`, backticks and `;touch M;`. **When** `preflight` runs on each. **Then** the marker file `M` does not exist.
- **Expected** marker file never created. **Actual** the same.
- **Spec source:** R-150 acceptance · **Run:** same command as TC-cli-7
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

</details>

### VS-5 · A repo with no format and no rules keeps the default
Profiles: cli. Risk: a repo with no rule would change its branch names.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-10 | No format and no forge keep `sdlc/{name}` in four modes | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:159` |
| TC-cli-11 | An empty GitHub rule list keeps the default in four modes | PASS | `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:177` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-10 · No format and no rules keeps default in four modes · PASS
- **Given** a repo with no config. **When** `preflight` runs in pr, stack, mr and direct modes. **Then** each prints the default.
- **Expected** exit 0, `ok` true, format `sdlc/{name}`, `derived` false, `given` false, rules empty, samples `pass` or `unchecked`, state sample starts with `sdlc/state-`. **Actual** the same.
- **Spec source:** R-151 acceptance · **Run:** `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt), [cli-0-probe.txt](../../slices/S-031/verification/r0/logs/cli-0-probe.txt)

#### TC-cli-11 · Empty GitHub list keeps default in four modes · PASS
- **Given** forge github and a gh shim that returns `[]`. **When** `preflight` runs in each mode. **Then** each prints the default.
- **Expected** exit 0, `ok` true, default format, `derived` false, rules empty, samples `pass` or `unchecked`. **Actual** the same.
- **Spec source:** R-151 acceptance · **Run:** same command as TC-cli-10
- Evidence: [cli-0-run.txt](../../slices/S-031/verification/r0/logs/cli-0-run.txt)

</details>

## How it was attacked
One security charter ran inside scenario VS-4, with no separate security session. The target was `preflight --format`. The threat-model boundary is the format value that a user or a forge rule supplies. The families were flag-like values, control characters and injection, plus twelve invalid ref parts. The verifier ran the cases in TC-cli-8 and TC-cli-9. Every attack held: no crash, no tree change and no command run. None broke the tool, and none was out of scope. The per-attack table is not in the verifier's evidence file. The summary line is in the details block.

<details>
<summary>Attack summary (1 family set)</summary>

| input | expected | observed | result |
|---|---|---|---|
| `preflight --format` with flag-like values, control characters and injection | no crash, no tree change, no command run | no crash, no tree change, no command run | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No round, profile, core verifier or review found one.
- **Unresolved review finding:** the test-quality lens (round 0) marked T-R-150a as a duplicate of two existing tests and asked to delete it. The slice shipped with the test in place. The finding is about cost and not about correctness.

| Seed | Found by | File |
|---|---|---|
| T-R-140a partly repeats T-R-030a | plan critique, architecture review | `skills/sdlc/test/branches.test.mjs` |
| T-R-127a partly repeats existing evaluate cases | test-quality review | `skills/sdlc/test/branches.test.mjs` |
| Trailing-slash format refused only by git check-ref-format | contract verifier (TC-contract-8) | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: `cli-runner` (run `branches.py` in a scratch cwd), `glab-stub` (record glab argv), `property` (generated input for `evaluate`, `validate_format`, `name`) and `attack-corpus` (hostile format values), all from `.sdlc/testkit.json`.
- Plan: [plan-r0.json](../../slices/S-031/verification/plan-r0.json), [plan-r0.md](../../slices/S-031/verification/plan-r0.md).
- Round 0 evidence: [cli-0.json](../../slices/S-031/verification/r0/cli-0.json), [cli-0.md](../../slices/S-031/verification/r0/cli-0.md), [contract-0.json](../../slices/S-031/verification/r0/contract-0.json), [contract-0.md](../../slices/S-031/verification/r0/contract-0.md).
- Core verifiers: [spec-fidelity](../../slices/S-031/verify-spec-fidelity-r0.md), [regression](../../slices/S-031/verify-regression-r0.md). Reviews: [architecture](../../slices/S-031/review-architecture-r0.md), [security](../../slices/S-031/review-security-r0.md), [test-quality](../../slices/S-031/review-test-quality-r0.md). Gate: [gate-r0.md](../../slices/S-031/gate-r0.md).
- Missing sources: no security-profile evidence file exists. The planned security profile for VS-4 is covered by the attack cases in `cli-0.json`. `failures.md` does not exist, because the slice never failed.
