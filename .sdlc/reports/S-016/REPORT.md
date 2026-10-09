# S-016 · preflight derives a format from one simple rule
Verdict: RELEASED
Commit under test: ea15f87 (verified); branch head 23f36bf (state commits only) · Rounds: 3 (rounds 0 to 2) · Attempts: 1 · Risk: medium · Written: 2026-10-09 UTC

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 7 | 44 | 44 | 0 | 0 | 1 / 1 | 26 |

## Summary
Preflight now derives a branch format from one simple forge rule. A `starts_with`, `ends_with` or `contains` rule gives a format, and preflight tests the samples again under it. When a rule is a regex, or the derivation still fails, the verdict carries a `--branch-format` suggestion. A failed `working` branch gets a rename line. The verifiers used three profiles: cli, contract and security. They ran preflight with `gh` and `glab` shims, called `derive`, `suggest` and `_regex_literal` directly, and sent hostile rule text. One security case failed in round 0: a derived format with a brace or white space printed `ok: true`, but `validate_format` refused it. Fix round 1 closed it, and round 1 re-ran the case. Round 2 deleted one duplicate test and changed no product code. The review notes about size limits and quoting in the suggestion line stay open as seeds.

## Open risks
- The regex literal builder expands repeat counts in memory. A 35-byte pattern such as `^(a{99999}){99999}$` used 4 GB to 10 GB, and `^a{999999999}$` took 13 s (seeds, security review rounds 1 and 2). The spec states no limit. The rule text comes from the repo admin.
- The suggestion line prints rule text, labels and branch names raw. A line break splits it into two lines, and a quote or `$(id)` pastes as a command. The rename line has the same fault for the branch name (seeds). The text comes from a trusted party.
- Test-quality review round 2 named one blocking finding: T-R-043a duplicates T-R-087a. The fix in round 2 deleted T-R-073a instead (failures.md). T-R-043a is still in `skills/sdlc/test/branches.test.mjs:2438` and in tests.md. Verification rounds ran after that and passed. No source records that the finding was dismissed.
- No test now carries the spec title `derive follows the table and refuses regex, negate and several rules` for R-073. T-R-042b, T-R-042c and T-R-042f hold the same checks. A tracker that matches by title will miss it.
- A rule with a non-string `pattern` makes preflight exit 1 with a traceback and no JSON. A catastrophic regex rule makes it hang (S-015 code, not in the S-016 diff).
- The regex literal is tested only with the tail `S-001`, as R-122 says. A pattern that rejects `state-<digits>` or `M-1-e2e` can still fail the next preflight run. A pattern with a case-sensitive tail, such as `^(feat|fix)/[a-z0-9-]+$`, gets the text fallback (ADR 13d6).
- `_regex_literal` uses the private `re._parser`. A Python version that changes it gives the text fallback, not an error.
- 50 old verification tests under `.sdlc/slices` fail on the base commit too. They are not in `npm test`. The slice adds no new failure.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-042 | Otherwise, when `given` is false and the rules are exactly one rule with `negate` false and `kind` in `starts_with`, `ends_with`, `contains`: derive `fmt2` from the table below, evaluate the samples again under it, and when they all pass, `ok` is `true` with `fmt2` and `derived` `true`. | VS-1, VS-2, VS-3, VS-4, VS-7 | TC-cli-1/p0, TC-cli-2/p0, TC-cli-3/p0, TC-cli-4/p0, TC-cli-5/p0, TC-cli-6/p0, TC-cli-7/p0, TC-cli-8/p0, TC-cli-1/p1, TC-cli-2/p1, TC-cli-3/p1, TC-cli-4/p1, TC-cli-5/p1, TC-contract-2/p0, TC-contract-3/p0, TC-contract-4/p0, TC-contract-5/p0, TC-contract-7/p0, TC-contract-8/p0, TC-contract-9/p0, TC-security-1/p0, TC-security-2/p0, TC-security-3/p0, TC-security-4/p0, TC-security-7/p0 | pass |
| R-043 | Otherwise `ok` is `false`, and `suggestion` is a `--branch-format` line: for a derivable rule whose derivation still failed, the derived format; for a `regex` rule, `--branch-format "<literal that your rule accepts>/{name}"` with the pattern quoted beside it; for a `working` failure, the rename the user has to do. | VS-5, VS-6, VS-7 | TC-cli-11/p0, TC-cli-12/p0, TC-cli-13/p0, TC-cli-15/p0, TC-cli-1/p1, TC-cli-2/p1, TC-cli-3/p1, TC-cli-4/p1, TC-cli-5/p1, TC-contract-10/p0, TC-contract-11/p0, TC-contract-12/p0, TC-contract-13/p0, TC-contract-14/p0, TC-contract-15/p0, TC-security-5/p0, TC-security-7/p0 | pass |
| R-087 | for a derivable rule whose derivation still failed, the derived format | VS-4 | TC-cli-8/p0, TC-cli-9/p0, TC-cli-10/p0, TC-security-3/p0 | pass |
| R-122 | for a `regex` rule, `--branch-format "<literal that your rule accepts>/{name}"` with the pattern quoted beside it | VS-6, VS-7 | TC-cli-13/p0, TC-cli-14/p0, TC-cli-15/p0, TC-cli-1/p1, TC-cli-2/p1, TC-cli-3/p1, TC-cli-4/p1, TC-cli-5/p1, TC-contract-14/p0, TC-contract-15/p0, TC-contract-16/p0, TC-contract-17/p0, TC-security-5/p0, TC-security-6/p0, TC-security-7/p0 | pass |
| R-073 | `derive follows the table and refuses regex, negate and several rules`. | VS-1, VS-2 | TC-cli-1/p0, TC-cli-4/p0, TC-contract-1/p0, TC-contract-2/p0, TC-contract-5/p0, TC-contract-6/p0, TC-contract-7/p0, TC-security-1/p0 | pass |

The committed tests `T-R-042a` to `T-R-122c` and `T-R-073b` in `skills/sdlc/test/branches.test.mjs:2290-2549` also guard these requirements. The regression verifier ran the suite in round 2: 645 tests, 644 pass, 0 fail, 1 skipped.

## Scenarios
### VS-1 · A single starts_with, ends_with or contains rule with no format derives the table format and exits 0
Profiles: cli, contract. Risk: wrong operator mapping or wrong placement of the affix.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1/p0 | starts_with, ends_with and contains derive the table format in pr and stack mode | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:28` |
| TC-cli-2/p0 | The derived names are the ones asked of gh and the output holds second-verdict samples | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:48` |
| TC-cli-3/p0 | A rule the default format passes does not derive | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:56` |
| TC-contract-1/p0 | Public surface: derive(rules), suggest(rules, rows, derived), _regex_literal(rule) exist | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:27` |
| TC-contract-2/p0 | derive returns the three table formats for the spec examples | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:38` |
| TC-contract-3/p0 | CLI derives for each operator in pr mode and exits 0 with second-verdict samples | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:110` |
| TC-contract-4/p0 | A rule the default format already passes does not derive | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:125` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-1/p0 · starts_with, ends_with and contains derive the table format in pr and stack mode · PASS
- **Given** gh stub returns one non-negated rule; no format given **When** branches.py preflight --mode pr|stack **Then** ok true, derived true, table format, every sample pass, exit 0
- **Expected** ok true, derived true, table format, every sample pass, exit 0 **Actual** Formats feature/sdlc/{name}, featuresdlc/{name} skipped as odd, sdlc/{name}-x, sdlc/team/{name}, a/b/sdlc/{name} observed; exit 0
- **Spec source:** R-042 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-2/p0 · The derived names are the ones asked of gh and the output holds second-verdict samples · PASS
- **Given** same **When** preflight, then read the gh call log **Then** gh asked for feature%2Fsdlc%2FS-001; samples all start feature/sdlc/
- **Expected** gh asked for feature%2Fsdlc%2FS-001; samples all start feature/sdlc/ **Actual** as expected
- **Spec source:** R-042 quote · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-3/p0 · A rule the default format passes does not derive · PASS
- **Given** starts_with sdlc/ **When** preflight **Then** ok true, derived false, format sdlc/{name}
- **Expected** ok true, derived false, format sdlc/{name} **Actual** as expected
- **Spec source:** R-042 quote · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-contract-1/p0 · Public surface: derive(rules), suggest(rules, rows, derived), _regex_literal(rule) exist · PASS
- **Given** branches.py loaded by path with python3 -I **When** inspect.signature on the three names **Then** signatures match the plan
- **Expected** signatures match the plan **Actual** derive (rules) / suggest (rules, rows, derived) / _regex_literal (rule)
- **Spec source:** R-073 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (type-check), signature listing:

  ```text
  derive (rules)
  suggest (rules, rows, derived)
  _regex_literal (rule)
  ```

#### TC-contract-2/p0 · derive returns the three table formats for the spec examples · PASS
- **Given** one rule per operator **When** derive([rule]) **Then** feature/sdlc/{name}, sdlc/{name}-x, sdlc/team/{name}, plus release/, .lock, a..b
- **Expected** feature/sdlc/{name}, sdlc/{name}-x, sdlc/team/{name}, plus release/, .lock, a..b **Actual** all six equal the table
- **Spec source:** R-042 quote table · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (property-run), examples:

  ```text
  starts_with feature/ -> feature/sdlc/{name}
  ends_with -x -> sdlc/{name}-x
  contains team -> sdlc/team/{name}
  starts_with release/ -> release/sdlc/{name}
  ends_with .lock -> sdlc/{name}.lock
  contains a..b -> sdlc/a..b/{name}
  ```

#### TC-contract-3/p0 · CLI derives for each operator in pr mode and exits 0 with second-verdict samples · PASS
- **Given** gh stub with one rule, no format **When** preflight --mode pr **Then** ok true, derived true, derived format, every sample pass, exit 0, stderr empty
- **Expected** ok true, derived true, derived format, every sample pass, exit 0, stderr empty **Actual** starts_with feature/, ends_with -x, contains team, starts_with team/sub/ all derived; exit 0
- **Spec source:** R-042 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript), CLI results:

  ```console
  ["starts_with","feature/",0,"feature/sdlc/{name}",true,true,""]
  ["ends_with","-x",0,"sdlc/{name}-x",true,true,""]
  ["contains","team",0,"sdlc/team/{name}",true,true,""]
  ["starts_with","team/sub/",0,"team/sub/sdlc/{name}",true,true,""]
  ```

#### TC-contract-4/p0 · A rule the default format already passes does not derive · PASS
- **Given** starts_with sdlc/ (pr) and contains sdlc (stack) **When** preflight **Then** ok true, derived false, default format, exit 0
- **Expected** ok true, derived false, default format, exit 0 **Actual** as expected
- **Spec source:** R-042 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

</details>

### VS-2 · Derivation is refused for a given format, a negated rule, a regex rule, several rules, zero rules and a non-string pattern
Profiles: contract, cli, security. Risk: a wrong derivation writes a format the rule rejects.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4/p0 | Given format (flag and config), negated rule, regex rule and two rules refuse derivation | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:61` |
| TC-cli-5/p0 | Zero rules, unknown kind, null kind, empty pattern and string negate never derive and never crash | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:83` |
| TC-cli-6/p0 | Non-string patterns (list, null, number, object, regex list) never derive | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:99` |
| TC-contract-5/p0 | Property: derive equals a table reference model over random rule lists | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:61` |
| TC-contract-6/p0 | derive and suggest are deterministic and do not mutate their input | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:75` |
| TC-contract-7/p0 | CLI refuses derivation for a given flag format, a config format, a negated rule, a regex rule, two rules, an unknown kind; zero rules gives the default | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:89` |
| TC-security-1/p0 | Refusals: given flag, given config, negated, regex, two rules never derive | PASS | `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs:49` |
| TC-security-2/p0 | Unknown kind, null kind, zero rules, empty pattern, mr and direct mode never derive | PASS | `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs:73` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-cli-4/p0 · Given format (flag and config), negated rule, regex rule and two rules refuse derivation · PASS
- **Given** each refusal input **When** preflight **Then** exit 1, derived false, original format, non-empty suggestion
- **Expected** exit 1, derived false, original format, non-empty suggestion **Actual** as expected for all seven inputs
- **Spec source:** R-042 acceptance, R-073 · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-5/p0 · Zero rules, unknown kind, null kind, empty pattern and string negate never derive and never crash · PASS
- **Given** degenerate rule lists **When** preflight **Then** exit 0 or 1, derived false, no traceback
- **Expected** exit 0 or 1, derived false, no traceback **Actual** as expected
- **Spec source:** R-042 quote · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-6/p0 · Non-string patterns (list, null, number, object, regex list) never derive · PASS
- **Given** pattern is not a string **When** preflight **Then** derived false and exit not 0
- **Expected** derived false and exit not 0 **Actual** derived false, exit 1 with a Python traceback on stderr in all five inputs (seed 1)
- **Spec source:** R-042 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-contract-5/p0 · Property: derive equals a table reference model over random rule lists · PASS
- **Given** 3000 generated rule lists: 0 to 3 rules, kinds incl. regex, bogus, upper-case, null; patterns incl. unicode, brace, newline, 10000 chars; non-string patterns; negate **When** derive(rules) **Then** string from the table for exactly one non-negated table kind with a non-empty string pattern, else None; never raises
- **Expected** string from the table for exactly one non-negated table kind with a non-empty string pattern, else None; never raises **Actual** 0 violations in 3000 runs
- **Spec source:** R-042 quote; R-073 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (property-run), derive:

  ```text
  property derive: seed=2918823855 runs=3000 violations=0
  ```

#### TC-contract-6/p0 · derive and suggest are deterministic and do not mutate their input · PASS
- **Given** rules and rows deep-copied **When** two calls each **Then** equal results, inputs equal to the copy
- **Expected** equal results, inputs equal to the copy **Actual** ok
- **Spec source:** R-073 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (type-check), result:

  ```text
  ok
  ```

#### TC-contract-7/p0 · CLI refuses derivation for a given flag format, a config format, a negated rule, a regex rule, two rules, an unknown kind; zero rules gives the default · PASS
- **Given** gh stub **When** preflight --mode pr **Then** derived false, the original format, exit 1 (or 0 when the default passes), no stderr
- **Expected** derived false, the original format, exit 1 (or 0 when the default passes), no stderr **Actual** as expected for every case
- **Spec source:** R-042 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

#### TC-security-1/p0 · Refusals: given flag, given config, negated, regex, two rules never derive · PASS
- **Given** a gh shim returns the named rule for every sample; no forge write is possible **When** preflight runs with the attack input **Then** the verdict holds the spec guarantee and nothing changes
- **Expected** derived false, original format, exit 1, tree and gh calls read-only **Actual** 7 refusals held; stderr empty; treeUnchanged true
- **Spec source:** R-042 acceptance · **Run:** `cd <worktree of sdlc/S-016> && REPO_UNDER_TEST=$PWD node --test .sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs`
- Evidence (attack): [refusal matrix](../../../.sdlc/slices/S-016/verification/r0/logs/security-0-attacks.json)

#### TC-security-2/p0 · Unknown kind, null kind, zero rules, empty pattern, mr and direct mode never derive · PASS
- **Given** a gh shim returns the named rule for every sample; no forge write is possible **When** preflight runs with the attack input **Then** the verdict holds the spec guarantee and nothing changes
- **Expected** derived false, no traceback **Actual** held for all; mr and direct keep the original format
- **Spec source:** R-042 acceptance; ADR d001 · **Run:** `cd <worktree of sdlc/S-016> && REPO_UNDER_TEST=$PWD node --test .sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs`

</details>

### VS-3 · The derivation guard: derive only when a loop-kind sample fails
Profiles: cli, contract. Risk: derivation in mr or direct mode, where only the working sample exists.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7/p0 | Guard: mr and direct mode with a bad --branch do not derive; pr and stack with a loop-kind failure derive | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:108` |
| TC-contract-8/p0 | mr and direct mode never derive; a bad --branch in mr mode gives one rename line | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:132` |
| TC-contract-9/p0 | pr and stack mode derive when a loop-kind sample fails | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:147` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-7/p0 · Guard: mr and direct mode with a bad --branch do not derive; pr and stack with a loop-kind failure derive · PASS
- **Given** starts_with feature/ rule **When** preflight --mode mr|direct|pr|stack **Then** mr: ok false, one rename line, no format change; direct: no samples; pr, stack: derived
- **Expected** mr: ok false, one rename line, no format change; direct: no samples; pr, stack: derived **Actual** as expected (direct reports ok true with an empty samples list, since no sample exists)
- **Spec source:** R-042 quote, ADR d001 · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-contract-8/p0 · mr and direct mode never derive; a bad --branch in mr mode gives one rename line · PASS
- **Given** one starts_with feature/ rule; --branch bad-name **When** preflight --mode mr / direct **Then** derived false, format sdlc/{name}; mr: exit 1, one-line rename suggestion, no --branch-format
- **Expected** derived false, format sdlc/{name}; mr: exit 1, one-line rename suggestion, no --branch-format **Actual** as expected
- **Spec source:** R-042 quote; ADR d001 · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

#### TC-contract-9/p0 · pr and stack mode derive when a loop-kind sample fails · PASS
- **Given** starts_with feature/ **When** preflight --mode pr and --mode stack **Then** derived true, feature/sdlc/{name}, exit 0
- **Expected** derived true, feature/sdlc/{name}, exit 0 **Actual** as expected
- **Spec source:** R-042 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

</details>

### VS-4 · A derived format that still fails keeps the first verdict and suggests the derived format
Profiles: cli, security. Risk: a Fail from the second verdict escapes, or second-verdict names leak into the output.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-8/p0 | A derived format that still fails keeps the first verdict (19 git-unsafe affixes in pr and stack) | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:126` |
| TC-cli-9/p0 | samples, rules and notes of a failed derivation equal those of the first verdict | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:141` |
| TC-cli-10/p0 | Format-like affixes ({name}, {, }, {0}, %s, $(id)) do not crash | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:150` |
| TC-security-3/p0 | Failed derivation keeps the first verdict and suggests the derived format | PASS | `.sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138` |
| TC-security-4/p0 | A derived ok true format passes validate_format (r0 failure re-run) | PASS | `.sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-8/p0 · A derived format that still fails keeps the first verdict (19 git-unsafe affixes in pr and stack) · PASS
- **Given** ends_with .lock, contains a..b, space, ~, ^, :, trailing dot, ?, *, [, backslash, @{, leading dash, leading dot, /., //, trailing slash, tab, leading slash **When** preflight **Then** exit 1 (not 2), derived false, format sdlc/{name}, suggestion equals the --branch-format line with the derived format, one rule
- **Expected** exit 1 (not 2), derived false, format sdlc/{name}, suggestion equals the --branch-format line with the derived format, one rule **Actual** as expected for all 38 runs
- **Spec source:** R-087 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-9/p0 · samples, rules and notes of a failed derivation equal those of the first verdict · PASS
- **Given** ends_with .lock **When** compare with a run under --format sdlc/{name} **Then** same samples (timestamps normalised), rules and notes
- **Expected** same samples (timestamps normalised), rules and notes **Actual** as expected
- **Spec source:** ADR b19f · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-10/p0 · Format-like affixes ({name}, {, }, {0}, %s, $(id)) do not crash · PASS
- **Given** 24 affix and operator pairs **When** preflight **Then** exit 0 or 1, no traceback
- **Expected** exit 0 or 1, no traceback **Actual** as expected
- **Spec source:** R-042 quote · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-security-3/p0 · Failed derivation keeps the first verdict and suggests the derived format · PASS
- **Given** One starts_with, ends_with or contains rule with 44 hostile affixes, no format given, pr mode **When** preflight runs **Then** ok false: exit 1, derived false, original format, suggestion equals the derived --branch-format line, first-verdict samples and rules
- **Expected** exit 1, never 2 **Actual** All 132 operator and affix pairs held. No stderr, no write, gh calls read-only.
- **Spec source:** R-087 acceptance; ADR b19f · **Run:** `REPO_UNDER_TEST=<worktree of sdlc/S-016> node --test --test-name-pattern='VS-4' .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs`
- Evidence (attack): [matrix run](../../../.sdlc/slices/S-016/verification/r1/logs/security-0-run.txt)

#### TC-security-4/p0 · A derived ok true format passes validate_format (r0 failure re-run) · PASS
- **Given** Every affix with all three operators, including braces, NBSP, U+0085, U+2003, U+3000 **When** preflight derives, then branches.py name --format <derived> runs **Then** ok true only when the name command exits 0
- **Expected** no derived format rejected **Actual** 0 derived formats rejected. The r0 failure no longer reproduces.
- **Spec source:** R-042; plan risk for VS-2 and VS-4 · **Run:** `REPO_UNDER_TEST=<worktree of sdlc/S-016> node --test --test-name-pattern='VS-4' .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs`
- Evidence (attack): [validity attack](../../../.sdlc/slices/S-016/verification/r1/logs/security-0-attacks.json)

</details>

### VS-5 · A failing verdict always carries a suggestion; a working failure names the rename
Profiles: cli, contract. Risk: empty suggestion or wrong line order.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-11/p0 | A failing verdict carries a suggestion: negated rule, two rules, given format, mr working failure | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:158` |
| TC-cli-12/p0 | Rename line for hostile branch names stays on a failing exit 1 without a traceback | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:171` |
| TC-contract-10/p0 | suggest with a loop row and a working row gives two lines, format first; working alone gives the rename alone; no rule gives the check-ref-format line; derived row gives the derived line | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:154` |
| TC-contract-11/p0 | Property: a failing row always gives a non-empty suggestion, format line first, one line per cause, no raise | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:177` |
| TC-contract-12/p0 | CLI: negated rule, two rules, given format, and no rule with an invalid ref format | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:205` |
| TC-contract-13/p0 | mr mode working failure for branch names with spaces, quotes, dashes, $(), backslash: exit 1, one rename line, no stderr | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:221` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-11/p0 · A failing verdict carries a suggestion: negated rule, two rules, given format, mr working failure · PASS
- **Given** see title **When** preflight **Then** --branch-format line naming labels, derived format for a given format, rename line in mr mode
- **Expected** --branch-format line naming labels, derived format for a given format, rename line in mr mode **Actual** as expected
- **Spec source:** R-043 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-12/p0 · Rename line for hostile branch names stays on a failing exit 1 without a traceback · PASS
- **Given** --branch=<name> for quote, space, dash, double quote, $(id), backtick, newline, backslash **When** preflight --mode mr **Then** exit 1, suggestion names the rename
- **Expected** exit 1, suggestion names the rename **Actual** exit 1 for all. The rename line puts the name in unquoted (seed 3)
- **Spec source:** R-043 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-contract-10/p0 · suggest with a loop row and a working row gives two lines, format first; working alone gives the rename alone; no rule gives the check-ref-format line; derived row gives the derived line · PASS
- **Given** hand-built rows **When** suggest(rules, rows, derived) **Then** as listed
- **Expected** as listed **Actual** two lines [--branch-format "feature/{name}" (rule "rx": regex "..."), rename the branch "bad name" ...]; others as expected
- **Spec source:** R-043 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript), suggest outputs:

  ```console
  two: --branch-format "feature/{name}" (rule "rx": regex "^(feature|bugfix)/[A-Z]+-\d+$")\nrename the branch "bad name" (rule "rx"), for example: git branch -m bad name <new-name>
  derived: --branch-format "release/sdlc/{name}"
  generic: --branch-format "<prefix>{name}<suffix>" (every branch name must pass: git check-ref-format)
  ```

#### TC-contract-11/p0 · Property: a failing row always gives a non-empty suggestion, format line first, one line per cause, no raise · PASS
- **Given** 2000 generated rule and row lists, incl. newline and quote names **When** suggest(rules, rows, derived) **Then** non-empty exactly when a row failed; line count equals the cause count; format line first
- **Expected** non-empty exactly when a row failed; line count equals the cause count; format line first **Actual** 0 violations in 2000 runs
- **Spec source:** R-043 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (property-run), suggest:

  ```text
  property suggest: seed=1490840770 runs=2000 violations=0
  ```

#### TC-contract-12/p0 · CLI: negated rule, two rules, given format, and no rule with an invalid ref format · PASS
- **Given** gh stub **When** preflight --mode pr **Then** exit 1 and a --branch-format suggestion; the invalid ref format exits 2 with a JSON error
- **Expected** exit 1 and a --branch-format suggestion; the invalid ref format exits 2 with a JSON error **Actual** as expected
- **Spec source:** R-043 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

#### TC-contract-13/p0 · mr mode working failure for branch names with spaces, quotes, dashes, $(), backslash: exit 1, one rename line, no stderr · PASS
- **Given** glab stub with branch_name_regex ^feat/ **When** preflight --mode mr --branch=<name> **Then** rename line names the branch; exit 1
- **Expected** rename line names the branch; exit 1 **Actual** as expected. The line puts the name in double quotes, then unquoted after git branch -m (see seed)
- **Spec source:** R-043 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript), rename lines:

  ```console
  "bad name" => rename the branch "bad name" (rule "push rule"), for example: git branch -m bad name <new-name>
  "--force" => ... git branch -m --force <new-name>
  "$(id)" => ... git branch -m $(id) <new-name>
  ```

</details>

### VS-6 · A regex rule gives a --branch-format literal that the rule accepts before S-001, with the pattern quoted
Profiles: cli, contract, security. Risk: a literal the rule rejects, or a crash in the stdlib regex parser.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-13/p0 | A regex rule gives a --branch-format literal the rule accepts before S-001, in pr and stack mode | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:191` |
| TC-cli-14/p0 | No-candidate, invalid, long and counted-repeat patterns fall back to text without hang or raise | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:209` |
| TC-cli-15/p0 | GitLab push-rule regex in pr, mr and stack mode | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:223` |
| TC-contract-14/p0 | CLI regex rules in pr and stack mode give a literal that the rule accepts at S-001, with the pattern quoted | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:238` |
| TC-contract-15/p0 | Unsatisfiable, unparseable and unusual regex rules never crash and give the quoted-pattern text | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:259` |
| TC-contract-16/p0 | _regex_literal on repeat counts and nesting that finish quickly returns without raising | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:268` |
| TC-contract-17/p0 | Property: every literal that _regex_literal returns is accepted by the rule at the S-001 tail and passes validate_format | PASS | `.sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:287` |
| TC-security-5/p0 | Regex literals across 38 patterns in pr and stack mode: literal accepted at S-001 or text fallback, pattern quoted | PASS | `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs:160` |
| TC-security-6/p0 | Invalid, deeply nested (40000), 100k literal, 5000 alternation and catastrophic patterns | PASS | `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs:188` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-13/p0 · A regex rule gives a --branch-format literal the rule accepts before S-001, in pr and stack mode · PASS
- **Given** 14 patterns incl. alternation, class, group, repeat min 0, dot, anchors, lookahead, backreference, flags **When** preflight **Then** literal/S-001 matches the pattern (checked with python re)
- **Expected** literal/S-001 matches the pattern (checked with python re) **Actual** as expected; lookahead, backreference, (a|b)*, \w+ and counted-group patterns fall back to text with the pattern quoted
- **Spec source:** R-122 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-14/p0 · No-candidate, invalid, long and counted-repeat patterns fall back to text without hang or raise · PASS
- **Given** ^[a-z]+$, (, [, *, (a+)+$, 5000 chars, 300 parens, ^(a{1000}){1000}$, ^.{0,99999999}x/, a{99999999999}, backslash, unicode **When** preflight **Then** exit 0 or 1, no traceback, under 20 s, text fallback quotes the pattern
- **Expected** exit 0 or 1, no traceback, under 20 s, text fallback quotes the pattern **Actual** as expected for these inputs (but see seeds 2 and 4 for others)
- **Spec source:** R-122 quote · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-15/p0 · GitLab push-rule regex in pr, mr and stack mode · PASS
- **Given** glab stub regex rule **When** preflight --branch bad-name **Then** exit 1; pr, stack: --branch-format "feature/{name}" with quoted pattern; mr: rename line
- **Expected** exit 1; pr, stack: --branch-format "feature/{name}" with quoted pattern; mr: rename line **Actual** as expected
- **Spec source:** R-122 acceptance · **Run:** `KIT=<worktree>/skills/sdlc/test/testkit VLOG=.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence (transcript): [preflight transcripts (command, stdout, stderr, exit code, tree diff)](../../../.sdlc/slices/S-016/verification/r0/logs/cli-0-transcripts.txt)

#### TC-contract-14/p0 · CLI regex rules in pr and stack mode give a literal that the rule accepts at S-001, with the pattern quoted · PASS
- **Given** 14 patterns incl. alternation, classes, groups, repeats with minimum 0, dot, anchors, non-capturing groups **When** preflight --mode pr / stack, then re.search(pattern, literal + '/S-001') in a separate Python **Then** literal accepted; pattern quoted; text fallback otherwise
- **Expected** literal accepted; pattern quoted; text fallback otherwise **Actual** every literal accepted: feature, user-a, a, feat, y, ac; seven patterns used the text fallback; one pattern passed by default
- **Spec source:** R-122 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

#### TC-contract-15/p0 · Unsatisfiable, unparseable and unusual regex rules never crash and give the quoted-pattern text · PASS
- **Given** ^[a-z]+$, lookahead, backreference, (?i) flag, \p{L}, invalid patterns, empty pattern **When** preflight --mode pr **Then** exit 0 or 1, empty stderr; text fallback quotes the pattern
- **Expected** exit 0 or 1, empty stderr; text fallback quotes the pattern **Actual** (?i)^FEATURE/ gives literal FEATURE; the others give the text fallback or an unevaluated note; no traceback
- **Spec source:** R-043 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (transcript): [log](../../../.sdlc/slices/S-016/verification/r0/logs/contract-0-final-run.txt)

#### TC-contract-16/p0 · _regex_literal on repeat counts and nesting that finish quickly returns without raising · PASS
- **Given** 8 hostile patterns incl. a{4294967295}, (a{9999}){9999}, (a*)*b, 500 nested groups, 200000 characters **When** _regex_literal(rule) **Then** returns a value, never raises
- **Expected** returns a value, never raises **Actual** no exception for any of the eight
- **Spec source:** R-122 acceptance (no timing limit in the spec) · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (measurement): [measurements](../../../.sdlc/slices/S-016/verification/r0/logs/regex-literal-hostile-measure.txt)

#### TC-contract-17/p0 · Property: every literal that _regex_literal returns is accepted by the rule at the S-001 tail and passes validate_format · PASS
- **Given** 2000 generated regex patterns **When** _regex_literal, evaluate, validate_format **Then** 0 violations; no raise
- **Expected** 0 violations; no raise **Actual** 540 literals, 0 violations, 0 raises
- **Spec source:** R-122 acceptance · **Run:** `VROOT=<slice worktree> VLOGS=.sdlc/slices/S-016/verification/r0/logs node --test .sdlc/slices/S-016/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence (property-run), regex literal:

  ```text
  property _regex_literal: seed=1029771664 runs=2000 literals=540 violations=0
  ```

#### TC-security-5/p0 · Regex literals across 38 patterns in pr and stack mode: literal accepted at S-001 or text fallback, pattern quoted · PASS
- **Given** a gh shim returns the named rule for every sample; no forge write is possible **When** preflight runs with the attack input **Then** the verdict holds the spec guarantee and nothing changes
- **Expected** substituting S-001 gives a name the pattern accepts **Actual** held for every pattern that gave a literal; patterns with no fit (^[a-z]+$, lookahead, backreference, ^$) gave the text fallback with the pattern quoted
- **Spec source:** R-122 acceptance · **Run:** `cd <worktree of sdlc/S-016> && REPO_UNDER_TEST=$PWD node --test .sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs`

#### TC-security-6/p0 · Invalid, deeply nested (40000), 100k literal, 5000 alternation and catastrophic patterns · PASS
- **Given** a gh shim returns the named rule for every sample; no forge write is possible **When** preflight runs with the attack input **Then** the verdict holds the spec guarantee and nothing changes
- **Expected** JSON verdict, exit 0 or 1, no traceback, under 20 seconds **Actual** held for all 20
- **Spec source:** R-122 acceptance; spec section 3 bad regex gives unevaluated · **Run:** `cd <worktree of sdlc/S-016> && REPO_UNDER_TEST=$PWD node --test .sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs`

</details>

### VS-7 · Hostile rule and branch input never crashes preflight or breaks the suggestion
Profiles: security, cli. Risk: quotes, newlines, NUL and control characters in a pattern, label or branch name break the suggestion line or inject a second line.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1/p1 | Hostile affix for starts_with, ends_with and contains never crashes preflight | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:44` |
| TC-cli-2/p1 | Hostile regex pattern never crashes preflight and keeps one suggestion line | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:72` |
| TC-cli-3/p1 | Hostile rule label does not break exit code or JSON | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:88` |
| TC-cli-4/p1 | Hostile --branch value in mr mode gives a rename line, exit 1, no traceback | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:96` |
| TC-cli-5/p1 | Flag-like --branch=<value> form keeps format and derived | PASS | `.sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs:108` |
| TC-security-7/p0 | Hostile corpus (injection, control-chars, flag-like, format-strings, oversized, traversal, confusables, whitespace, nul) in pattern, label, --branch, --format and config | PASS | `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs:224` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-1/p1 · Hostile affix for starts_with, ends_with and contains never crashes preflight · PASS
- **Given** pr mode, gh shim returns one derivable rule whose pattern comes from the injection, control-chars, flag-like-values, format-strings and oversized families (195 runs) **When** run branches.py preflight **Then** exit 0 or 1, one JSON object, no traceback, ok matches the exit code, a failing verdict has a suggestion, no line break except from the input
- **Expected** exit 0 or 1, one JSON object, no traceback, ok matches the exit code, a failing verdict has a suggestion, no line break except from the input **Actual** 195 of 195 runs hold; derived false keeps format sdlc/{name}; when the pattern has no CR or LF the suggestion stays one line
- **Spec source:** R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes · **Run:** `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`
- Evidence (transcript): [derive transcripts](../../../.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt)

#### TC-cli-2/p1 · Hostile regex pattern never crashes preflight and keeps one suggestion line · PASS
- **Given** pr mode, regex rule from the corpus plus catastrophic, unbalanced, bad escape, lookahead, backreference, flags, unicode class, huge repeat, deep nesting, 100000-char and verbose patterns **When** run preflight **Then** exit 0 or 1, no traceback, under 15 s, suggestion one line without CR or LF in input
- **Expected** exit 0 or 1, no traceback, under 15 s, suggestion one line without CR or LF in input **Actual** every run passes; one run took 14.7 s (nested repeat a{1000}^3); see seed
- **Spec source:** R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes · **Run:** `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`
- Evidence (transcript): [regex transcripts](../../../.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt)
- Evidence (log): [memory probe](../../../.sdlc/slices/S-016/verification/r0/logs/cli-1-oom-probe.txt)

#### TC-cli-3/p1 · Hostile rule label does not break exit code or JSON · PASS
- **Given** pr mode, regex rule named by each injection, control-chars and format-strings value **When** run preflight **Then** exit 1, JSON intact, suggestion non-empty
- **Expected** exit 1, JSON intact, suggestion non-empty **Actual** all runs hold; labels with CR or LF split the suggestion (seed)
- **Spec source:** R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes · **Run:** `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`
- Evidence (transcript): [label transcripts](../../../.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt)

#### TC-cli-4/p1 · Hostile --branch value in mr mode gives a rename line, exit 1, no traceback · PASS
- **Given** mr mode, glab shim returns regex ^feature/.*$, --branch takes each corpus value that argv can carry **When** run preflight --mode mr --branch <value> **Then** exit 1 with one rename line, or the documented exit 2 JSON error for a value that argparse reads as a flag; no traceback; suggestion never starts with a dash
- **Expected** exit 1 with one rename line, or the documented exit 2 JSON error for a value that argparse reads as a flag; no traceback; suggestion never starts with a dash **Actual** all runs hold; values with CR or LF give a multi-line rename line (seed); flag-like values give exit 2 with a JSON error
- **Spec source:** R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes · **Run:** `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`
- Evidence (transcript): [branch transcripts](../../../.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt)

#### TC-cli-5/p1 · Flag-like --branch=<value> form keeps format and derived · PASS
- **Given** mr mode, --branch=--help, --branch=-x and --branch=--format=evil/{name} **When** run preflight **Then** ok false, format sdlc/{name}, derived false, exit 1
- **Expected** ok false, format sdlc/{name}, derived false, exit 1 **Actual** holds for all three
- **Spec source:** R-043 acceptance: a failing verdict prints ok false, exits 1 and carries a suggestion; plan VS-7 notes · **Run:** `VERIFY_LOG=$PWD/.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt node --test .sdlc/slices/S-016/verification/r0/tests/cli-1/preflight-hostile.verify-cli.test.mjs`
- Evidence (transcript): [branch equals transcripts](../../../.sdlc/slices/S-016/verification/r0/logs/cli-1-transcripts.txt)

#### TC-security-7/p0 · Hostile corpus (injection, control-chars, flag-like, format-strings, oversized, traversal, confusables, whitespace, nul) in pattern, label, --branch, --format and config · PASS
- **Given** a gh shim returns the named rule for every sample; no forge write is possible **When** preflight runs with the attack input **Then** the verdict holds the spec guarantee and nothing changes
- **Expected** exit 0, 1 or 2, JSON, no traceback, stderr empty, no derivation from a given format or in mr mode **Actual** held for all entries
- **Spec source:** R-043 acceptance · **Run:** `cd <worktree of sdlc/S-016> && REPO_UNDER_TEST=$PWD node --test .sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs`

</details>

## How it was attacked
One security session ran in round 0 and one in round 1. Its charter was to find a derivation that writes a format the rule rejects, a leaked second verdict, a bad regex literal, and a crash or broken suggestion line on hostile text. The trusted parties are the repo admin who sets forge rules and the user who runs preflight. Nothing from a submitter reaches this CLI, so attacks that need hostile rule text are seeds, not blockers.

Round 0 (commit e55f687) tried 745 attacks: 738 held, 1 broke and 6 were out of scope. The break was ATK-90: 21 derived formats printed `ok: true` and `validate_format` refused them. Round 1 (commit 35e4a69) re-ran the failed-derivation and validity attacks: 96 tried, 96 held. The cli profile also ran a hostile corpus (injection, control characters, flag-like values, format strings, oversized): 5 families, no crash.

<details>
<summary>Attack table, security round 0 (745 attacks, grouped by charter)</summary>

| Charter | Attacks | Result | Example input · expected · observed |
|---|---|---|---|
| VS-2 refusal | 12 | held 12 | given by flag · derived false, original format, exit 1, no side effect · exit 1 derived false format x-{name} |
| VS-2 guard | 2 | held 2 | mr mode, bad working branch · derived false · exit 1 derived false format sdlc/{name} |
| VS-2 non-string pattern | 2 | out-of-scope 2 | starts_with pattern=null · JSON verdict, no traceback · exit 1; stderr Traceback (TypeError in evaluate) |
| VS-4 failed derivation | 74 | held 74 | starts_with "a b" · ok false, exit 1, original format, suggestion is the derived format, first-verdict samples · exit 1 derived false suggestion "--branch-format \"a bsdlc/{name}\"" |
| VS-4 derived format validity | 1 | broke 1 | all affixes x three operators · a derived ok true format passes validate_format · 21 derived formats rejected by validate_format, for example {"op":"starts_with","affix":"{","format":"{sdlc/{name}","nam |
| VS-6 regex literal | 76 | held 76 | pr ^(feature\|bugfix)/[A-Z]+-\d+$ · literal accepted at S-001 or text fallback, pattern quoted · literal "feature"; feature/S-001 accepted=true |
| VS-6 pathological patterns | 20 | held 20 | unbalanced paren · JSON verdict, exit 0 or 1, no traceback, under 20 seconds · exit 0, 392 ms, stderr clean |
| VS-7 hostile pattern | 396 | held 396 | injection/cmd-subst starts_with: "$(touch pwned)" · JSON verdict, exit 0 or 1, no traceback · exit 1 |
| VS-7 hostile label | 63 | held 63 | injection/cmd-subst: "$(touch pwned)" · JSON verdict, exit 1, no traceback · exit 1 |
| VS-7 hostile branch | 95 | held 95 | injection/cmd-subst: "$(touch pwned)" · exit 0, 1 or 2, JSON, no traceback · exit 1 |
| VS-7 line injection | 1 | out-of-scope 1 | regex pattern with newline then --branch-format · one line · 2 lines; second line "--branch-format \"evil/{name}\"\"; choose a literal that the pattern accepts before S-001)" |
| VS-7 shell quoting | 1 | out-of-scope 1 | ends_with $(id)".lock · inert text · --branch-format "sdlc/{name}$(id)".lock" |
| VS-6 memory amplification | 1 | out-of-scope 1 | regex ^(a{99999}){99999}$ and ^a{4000000000}$ and ^(((a{1000}){1000}){1000}){1000}$ (manual probe) · bounded work · _regex_literal expands the minimum repeat count into a string: 4 GB to 10 GB peak resident memory for a 35 byte pattern; |
| VS-7 line and shell injection | 1 | out-of-scope 1 | pattern with newline then --branch-format line; derived affix with quote and $(id) · one line, inert · suggestion has 2 lines; quote and $(id) are printed raw inside the double quotes |

</details>

<details>
<summary>Attack table, security round 1 (96 attacks, grouped by charter)</summary>

| Charter | Attacks | Result | Example input · expected · observed |
|---|---|---|---|
| VS-4 failed derivation | 95 | held 95 | starts_with "a b" · ok false, exit 1, original format, suggestion is the derived format, first-verdict samples · exit 1 derived false suggestion "--branch-format \"a bsdlc/{name}\"" |
| VS-4 derived format validity | 1 | held 1 | all affixes x three operators · a derived ok true format passes validate_format · none |

</details>

## Defects found on the way
- **Blocking defects**
  - A derived format that `validate_format` refuses printed `ok: true` (verify-security round 0, TC-security-4 and ATK-90). Spec source: R-042 and the spec section 2 rules for `validate_format`. Reproduce: a `starts_with "{"` rule with no format gives `ok true`, format `{sdlc/{name}`, and then `branches.py name --format` exits 2. Fixed in commit 35e4a69: `cmd_preflight` runs `validate_format` on the derived format, and a refusal counts as a failed derivation. Guard: `T-R-073b` at `skills/sdlc/test/branches.test.mjs:2537`. Round 1 re-ran TC-security-4 and it passed.
  - The test-quality review of round 2 reported T-R-043a as a duplicate of T-R-087a. See Open risks: the fix removed T-R-073a, and T-R-043a stays.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| Open round 1 notes remain | review-security r1, r2 | `skills/sdlc/branches.py` |
| Regex parser import sits mid-file | review-architecture r1, r2 | `skills/sdlc/branches.py` |
| labels built too early in _format_line | review-architecture r1, r2 | `skills/sdlc/branches.py` |
| Plan text differs from code | review-architecture r1, r2 | `.sdlc/slices/S-016/plan.md` |
| Private re._parser dependency | review-architecture r1, r2 | `skills/sdlc/branches.py` |
| T-R-042i overlaps T-R-042e | review-test-quality r2 | `skills/sdlc/test/branches.test.mjs` |
| T-R-042h pins the call count of a faked verdict | review-test-quality r2 | `skills/sdlc/test/branches.test.mjs` |
| Regex literal fails for patterns with a case-sensitive tail | verify-spec-fidelity | `skills/sdlc/branches.py` |
| preflight crashes with a traceback on a non-string rule pattern | verify-cli r0 p0 | `skills/sdlc/branches.py` |
| preflight hangs on a catastrophic regex rule | verify-cli r0 p0 | `skills/sdlc/branches.py` |
| rename suggestion puts the branch name unquoted into a shell line | verify-cli r0 p0 | `skills/sdlc/branches.py` |
| _regex_literal builds an unbounded string for nested counted repeats | verify-cli r0 p0 | `skills/sdlc/branches.py` |
| suggestion holds raw CR or LF from a rule pattern, rule label or branch name | verify-cli r0 p1 | `skills/sdlc/branches.py` |
| _regex_literal expands nested repeats without a size limit | verify-cli r0 p1 | `skills/sdlc/branches.py` |
| _regex_literal builds a huge string for large repeat counts | verify-contract r0 | `skills/sdlc/branches.py` |
| Rename line puts the branch name unquoted after git branch -m | verify-contract r0 | `skills/sdlc/branches.py` |
| A pattern with a newline splits the suggestion into two lines | verify-contract r0 | `skills/sdlc/branches.py` |
| A non-string pattern in a rule crashes preflight with a traceback | verify-contract r0 | `skills/sdlc/branches.py` |
| An empty-prefix regex candidate is skipped | verify-contract r0 | `skills/sdlc/branches.py` |
| A bare --branch value that starts with a dash is refused by argparse | verify-contract r0 | `skills/sdlc/branches.py` |
| suggestion line embeds rule text unescaped | verify-security r0 | `skills/sdlc/branches.py` |
| non-string rule pattern crashes preflight with a traceback | verify-security r0 | `skills/sdlc/branches.py` |
| verify-limits: regex literal builder expands repeat counts in memory | verify-security r0 | `skills/sdlc/branches.py` |
| FutureWarning on stderr for a regex with a nested set | verify-security r0 | `skills/sdlc/branches.py` |
| Stale verification tests fail | verify-regression r0 | `.sdlc/slices` |
| No test carries the exact spec title for R-073 | verify-spec-fidelity r2 | `skills/sdlc/test/branches.test.mjs` |

## Appendix
- Toolkit tools used: cli-runner, stub-server, glab-stub, property, attack-corpus (all under `skills/sdlc/test/testkit/`).
- Plans: [plan-r0.md](../../slices/S-016/verification/plan-r0.md), [plan-r0.json](../../slices/S-016/verification/plan-r0.json), [plan-r2.md](../../slices/S-016/verification/plan-r2.md), [plan-r2.json](../../slices/S-016/verification/plan-r2.json). Round 1 had no new plan file; the round 2 plan is the round 0 plan plus a note.
- Profile evidence: cli-0 r0 ([json](../../slices/S-016/verification/r0/cli-0.json), [md](../../slices/S-016/verification/r0/cli-0.md)), cli-1 r0 ([json](../../slices/S-016/verification/r0/cli-1.json), [md](../../slices/S-016/verification/r0/cli-1.md)), contract-0 r0 ([json](../../slices/S-016/verification/r0/contract-0.json), [md](../../slices/S-016/verification/r0/contract-0.md)), security-0 r0 ([json](../../slices/S-016/verification/r0/security-0.json), [md](../../slices/S-016/verification/r0/security-0.md)), security-0 r1 ([json](../../slices/S-016/verification/r1/security-0.json), [md](../../slices/S-016/verification/r1/security-0.md)).
- Logs: [r0/logs](../../slices/S-016/verification/r0/logs/), [r1/logs](../../slices/S-016/verification/r1/logs/).
- Core verifiers: spec fidelity ([r0](../../slices/S-016/verify-spec-fidelity-r0.md), [r1](../../slices/S-016/verify-spec-fidelity-r1.md), [r2](../../slices/S-016/verify-spec-fidelity-r2.md)), regression ([r0](../../slices/S-016/verify-regression-r0.md), [r1](../../slices/S-016/verify-regression-r1.md), [r2](../../slices/S-016/verify-regression-r2.md)). Reviews: architecture ([r1](../../slices/S-016/review-architecture-r1.md), [r2](../../slices/S-016/review-architecture-r2.md)), security ([r1](../../slices/S-016/review-security-r1.md), [r2](../../slices/S-016/review-security-r2.md)), test quality ([r2](../../slices/S-016/review-test-quality-r2.md)). Gate: [gate-r0.md](../../slices/S-016/gate-r0.md), receipt [suite-receipt.json](../../slices/S-016/verification/suite-receipt.json).
- Missing sources: none. Round 1 and round 2 ran only the cases that failed or changed; the other cases keep their round 0 result. There is no review-test-quality or review-architecture file for round 0. The `verification/` folder may be pruned after merge.
