# S-004 · tails: run, slice, milestone, e2e, e2e-area
Verdict: RELEASED
Commit under test: fa30f17 (gate ran at c0be01d; last product change 2b1960c) · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-09

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 6 | 34 | 34 | 0 | 0 | 1 / 0 | 14 |

## Summary
The slice adds the `run`, `milestone` and `e2e` rows to the `TAILS` table in `skills/sdlc/branches.py`. Now `branches.py name` prints the section 1 default branch for all five kinds: `sdlc/run-1`, `sdlc/S-001`, `sdlc/M-1`, `sdlc/M-1-e2e` and `sdlc/M-1-e2e-api`. The cli, contract and security profiles ran 34 cases at the CLI and Python API boundaries, with team formats, edge run counters and hostile ids. All 34 cases passed in round 0, and the spec-fidelity, regression and gate checks held. The test-quality review marked one finding as blocking: T-025 repeats checks that T-022 already makes. The code does not show a fix, and the state files do not record how the loop settled it. Fourteen non-blocking seeds stay open, most of them about names that git refuses for hostile input (ADR-20261009-045048).

## Open risks
- Test-quality review r0, finding 1 (blocking): T-025 repeats the slice and e2e-area checks of T-022 (`skills/sdlc/test/branches.test.mjs:490`). The finding is not fixed, and no record says why. The risk is test duplication only, not wrong behavior.
- `name` does not check its output with `git check-ref-format`. Of 380 hostile milestone ids and e2e areas, 144 give a branch that git refuses, for example `sdlc/../..` (ADR-20261009-045048). A consumer that pushes such a name fails late, at git.
- Under a plain `{name}` format, an id with a leading `-` gives a name that git can read as a flag. The slices that wire consumers (S-008 and later) must put `--` before the name or check it.
- `--n -1` gives `sdlc/run--1`, and `parse` cannot read it back. ADR-20261009-045048 accepts this. S-007 owns the round-trip proof.
- `--n` accepts padded, signed, underscored and non-ASCII digit forms. `--n=٣` and `--n=3` give the same branch.
- `tail('run', n=10**5000)` raises `ValueError`, not `Fail`. Only the Python API can reach this; argparse refuses the same value.
- `verify` and `attempt` still exit 2 with "no branch name is defined for kind". S-005 adds those rows.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-003 | "\| `run` \| `run-<n>` \| `sdlc/run-1` \| stack \|" | VS-1, VS-2, VS-3, VS-4 | 25 | pass |
| R-004 | "\| `slice` \| `<sliceId>` \| `sdlc/S-001` \| pr, stack \|" | VS-1, VS-6 | 10 | pass |
| R-005 | "\| `milestone` \| `<milestoneId>` \| `sdlc/M-1` \| stack \|" | VS-1, VS-2, VS-3, VS-5 | 22 | pass |
| R-006 | "\| `e2e` \| `<milestoneId>-e2e` \| `sdlc/M-1-e2e` \| pr \|" | VS-1, VS-2, VS-3, VS-5 | 21 | pass |
| R-007 | "\| `e2e-area` \| `<milestoneId>-e2e-<area>` \| `sdlc/M-1-e2e-api` \| never \|" | VS-1, VS-3, VS-5, VS-6 | 18 | pass |

The slice's committed tests in `skills/sdlc/test/branches.test.mjs`:
- T-025 `name prints the default branch for the run, slice, milestone, e2e and e2e-area kinds` (R-003 to R-007): `skills/sdlc/test/branches.test.mjs:578`
- T-026 `tail builds the run, milestone and e2e tails and fails on a missing part` (R-003, R-005, R-006): `skills/sdlc/test/branches.test.mjs:600`
- T-027 `name for the run, milestone and e2e kinds follows a prefixed and a lowercased format and fails without its part` (R-003, R-005, R-006): `skills/sdlc/test/branches.test.mjs:625`

The spec-fidelity verifier ran the tests against the parent commit's `branches.py`. T-025, T-026 and T-027 failed there, and the other 28 tests passed. So the tests assert the requirements.

## Scenarios
Round 0 ran all 34 cases at commit 2b1960c. No fix round followed, so each result below is the round 0 result. The gate ran the 22 verifier tests again at c0be01d, and all passed. Test paths under `.sdlc/slices/S-004/verification/` are the verifiers' tests. The retention prune can remove them after merge.

### VS-1 · An operator names the run, slice, milestone, e2e and e2e-area branches under the default format
Profiles: cli, contract. Risk: a wrong default tail gives a wrong pushed branch for each family.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | The default format names the five kinds as section 1 says | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:70` |
| TC-cli-2 | A config without a usable `branchFormat` falls back to `sdlc/{name}` | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:80` |
| TC-cli-13 | Two runs, one in CI, give the same output and write nothing | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:297` |
| TC-cli-14 | A unicode repo path works; a missing repo, bad JSON and a bad format give one JSON error | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:311` |
| TC-contract-1 | The CLI prints the five section 1 default names, and git accepts each | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:90` |
| TC-contract-2 | Ten config shapes without a usable `branchFormat` give `sdlc/{name}` | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:102` |
| TC-contract-3 | A consumer import of `tail` and `name` gives the CLI tails | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:116` |
| TC-contract-13 | `branches.py` imports only the standard library | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:374` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-cli-1 · Default format names the run, slice, milestone, e2e and e2e-area branches · PASS
- **Given** a scratch git repo with no `.sdlc/config.json` and no `--format` **When** `branches.py name` runs once per kind with the acceptance arguments **Then** each run exits 0 with one JSON object
- **Expected** `sdlc/run-1`, `sdlc/S-001`, `sdlc/M-1`, `sdlc/M-1-e2e`, `sdlc/M-1-e2e-api`; keys `ok, command, format, kind, branch`; empty stderr; git accepts each **Actual** all five match; stderr empty; tree and refs unchanged
- **Spec source:** R-003 to R-007 acceptance · **Run:** `VERIFY_SKILL_DIR="$PWD/skills/sdlc" node --test --test-name-pattern "TC-cli-1 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

```console
--kind run --n 1 -> exit 0 {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "run", "branch": "sdlc/run-1"}
--kind milestone --id M-1 -> exit 0 branch sdlc/M-1
--kind e2e --id M-1 -> exit 0 branch sdlc/M-1-e2e
--kind e2e-area --id M-1 --area api -> exit 0 branch sdlc/M-1-e2e-api
--kind slice --id S-001 -> exit 0 branch sdlc/S-001
```
```diff
every run: tree unchanged, no new ref
```
Full transcripts: [cli-0-TC-cli-1.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-1.txt)

#### TC-cli-2 · A config without a usable branchFormat falls back to sdlc/{name} · PASS
- **Given** six configs: key absent, empty string, 7, null, an array, false **When** `name` runs for the five kinds on each config **Then** each run gives the default branch
- **Expected** format `sdlc/{name}` and the five default branches **Actual** all 30 runs match
- **Spec source:** R-003 to R-007 acceptance (default format) · **Run:** `node --test --test-name-pattern "TC-cli-2 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-2.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-2.txt)

#### TC-cli-13 · Running twice and in CI gives the same output and writes nothing · PASS
- **Given** config `branchFormat` `feature/{name}` **When** `name` runs twice per kind, the second time with `CI=true`, `TERM=dumb` and stdin `y` **Then** stdout is the same both times
- **Expected** identical stdout, exit 0, no prompt, tree unchanged **Actual** all match
- **Spec source:** R-003 to R-007 acceptance · **Run:** `node --test --test-name-pattern "TC-cli-13 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-13.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-13.txt)

#### TC-cli-14 · Repo paths with spaces and unicode, a missing repo, broken config and a bad format · PASS
- **Given** a repo at `wörk space-*/my repo ✓` with `branchFormat` `feature/{name}` **When** `name` runs for the five kinds, then on a missing path, on invalid config JSON, and with `--format feature/{name}/{name}` **Then** the valid path works, and each error exits 2 with one JSON error
- **Expected** `feature/<tail>` for each kind; "not a directory"; "not valid JSON"; "exactly one" **Actual** all match
- **Spec source:** R-003 to R-007 acceptance; spec section 2 failure contract · **Run:** `node --test --test-name-pattern "TC-cli-14 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-14.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-14.txt)

#### TC-contract-1 · The CLI prints the five section 1 default names · PASS
- **Given** a scratch git repo with no config and no `--format` **When** `name` runs for run 1, slice S-001, milestone M-1, e2e M-1 and e2e-area M-1 api **Then** exit 0, one JSON object, empty stderr, no tree or ref change
- **Expected** the five default branches; each passes `git check-ref-format --branch` **Actual** all five names match; key set, empty stderr, unchanged tree and ref check pass
- **Spec source:** R-003 to R-007 acceptance · **Run:** `VERIFY_WORKTREE=<worktree> TESTKIT_SEED=20261009 node --test --test-name-pattern='TC-contract-1:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
run --n 1 -> sdlc/run-1
slice --id S-001 -> sdlc/S-001
milestone --id M-1 -> sdlc/M-1
e2e --id M-1 -> sdlc/M-1-e2e
e2e-area --id M-1 --area api -> sdlc/M-1-e2e-api
```
Surface listing: [contract-0-surface.txt](../../slices/S-004/verification/r0/logs/contract-0-surface.txt) · run log: [contract-0-run.txt](../../slices/S-004/verification/r0/logs/contract-0-run.txt)

#### TC-contract-2 · An absent, empty or non-string branchFormat falls back to sdlc/{name} · PASS
- **Given** a config without `branchFormat`, and with it set to `''`, null, 5, 0, true, false, `[]`, `['x/{name}']` and `{}` **When** the five spec examples run against each config **Then** each run prints format `sdlc/{name}` and the default branch
- **Expected** the default format and branch in all runs **Actual** all 50 runs print the default format and branch
- **Spec source:** spec section 2 `load_format` · **Run:** `node --test --test-name-pattern='TC-contract-2:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

#### TC-contract-3 · A consumer import of branches gives the same tails as the CLI · PASS
- **Given** a scratch cwd; `python3 -I` puts the skill directory on `sys.path` and runs `import branches`, as `next-action.py` does **When** `tail` and `name` run for the five kinds **Then** `tail` gives `run-1`, `S-001`, `M-1`, `M-1-e2e`, `M-1-e2e-api` as str
- **Expected** the CLI branches from `name` with `sdlc/{name}` **Actual** all values match and are str
- **Spec source:** spec section 2 Python API · **Run:** `node --test --test-name-pattern='TC-contract-3:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
sys.path.insert(0, skill_dir); import branches
tail('run', n=1)='run-1' tail('milestone', id='M-1')='M-1' tail('e2e', id='M-1')='M-1-e2e'
```

#### TC-contract-13 · branches.py imports only the standard library · PASS
- **Given** the slice commit's `branches.py` **When** its imports are parsed with `ast` and compared with `sys.stdlib_module_names` **Then** no import is outside the standard library
- **Expected** no non-stdlib import **Actual** `argparse, datetime, json, os, re, subprocess, sys`; none outside the standard library
- **Spec source:** spec section 2: Python 3 standard library only · **Run:** `node --test --test-name-pattern='TC-contract-13:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

</details>

### VS-2 · A team format with a prefix or a lowercase placeholder applies to the run, milestone and e2e branches
Profiles: cli, contract. Risk: a team format that changes the prefix or misses the tail breaks every branch on that team's forge.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | A config prefix, suffix, leading placeholder or `{name:lower}` applies to the new kinds | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:107` |
| TC-cli-4 | The `--format` flag wins over the config `branchFormat` | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:122` |
| TC-contract-4 | A team prefix applies from config and from `--format`, and the flag wins | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:131` |
| TC-contract-5 | `{name:lower}` lowercases only the tail; prefix and suffix keep their case | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:154` |
| TC-contract-6 | Property: `name` equals prefix + tail + suffix for run, milestone and e2e | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:226` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-3 · A config branchFormat with a prefix, suffix, leading placeholder or {name:lower} applies to the new kinds · PASS
- **Given** configs `feature/PROJ-1-{name}`, `feature/PROJ-1-{name:lower}`, `x/{name}-wip`, `{name}/sdlc` **When** `name` runs for run, milestone, e2e and e2e-area **Then** the branch is prefix + tail + suffix, and only the tail is lowercased
- **Expected** `feature/PROJ-1-M-1`, `feature/PROJ-1-run-1`, `feature/PROJ-1-m-1-e2e`, `x/M-1-e2e-wip`, `M-1/sdlc` **Actual** all 16 runs match; `PROJ` keeps its case
- **Spec source:** R-003, R-005, R-006 quote with the section 1 format rule · **Run:** `node --test --test-name-pattern "TC-cli-3 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

```console
--kind e2e --id M-1, branchFormat feature/PROJ-1-{name:lower} -> exit 0 branch feature/PROJ-1-m-1-e2e
```
Transcripts: [cli-0-TC-cli-3.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-3.txt)

#### TC-cli-4 · The --format flag wins over the config branchFormat · PASS
- **Given** config `branchFormat` `team/{name}` **When** `name` runs with `--format` for four formats and four kinds, then once without `--format` **Then** the flag format is used and echoed; without the flag the config applies
- **Expected** flag results as in TC-cli-3; without the flag, `team/run-1` **Actual** all 17 runs match
- **Spec source:** R-003, R-005, R-006 quote with the section 1 format rule · **Run:** `node --test --test-name-pattern "TC-cli-4 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-4.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-4.txt)

#### TC-contract-4 · A team prefix applies from config and from --format, and the flag wins · PASS
- **Given** `branchFormat` `feature/PROJ-1-{name}` in config, and a bare repo with `--format` **When** `name` runs for milestone M-1, run 1 and e2e M-1; then `--format team/{name:lower}` over the config **Then** the same branches both ways; the flag gives `team/m-1-e2e`
- **Expected** `feature/PROJ-1-M-1`, `feature/PROJ-1-run-1`, `feature/PROJ-1-M-1-e2e`; `team/m-1-e2e` with format echo `team/{name:lower}` **Actual** all match
- **Spec source:** spec section 2: `--format` overrides `config.branchFormat` · **Run:** `node --test --test-name-pattern='TC-contract-4:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

#### TC-contract-5 · Lowercase, suffix and placeholder-first formats · PASS
- **Given** formats `feature/PROJ-1-{name:lower}`, `x/{name}-wip`, `{name}/sdlc`, `{name:lower}/SDLC` **When** `name` runs for run, milestone and e2e **Then** `{name:lower}` lowercases only the tail
- **Expected** literal text before and after the placeholder keeps its case **Actual** `feature/PROJ-1-m-1-e2e`, `x/run-3-wip`, `x/M-2-e2e-wip`, `M-1/sdlc`, `run-1/sdlc`, `m-1-e2e/SDLC`; 8 cases pass and git accepts each
- **Spec source:** spec section 1: `{name:lower}` lowercases the tail · **Run:** `node --test --test-name-pattern='TC-contract-5:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

#### TC-contract-6 · Property: name equals prefix + tail + suffix for run, milestone and e2e · PASS
- **Given** generated formats with literal prefix and suffix, `{name}` or `{name:lower}`, and generated ids and counters **When** `name` runs twice and `tail` once per input; 40 generated formats also run through the CLI **Then** `name` equals prefix + model tail + suffix, the two calls agree, and the CLI echoes the format
- **Expected** 0 violations **Actual** 0 violations in 1500 API runs and 40 CLI runs
- **Spec source:** spec section 2 `name` and `split`; section 1 tail table · **Run:** `node --test --test-name-pattern='TC-contract-6:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`
- Property `name(run|milestone|e2e)`: seed 20261009, 1500 runs, 0 violations. Property `cli format echo`: seed 20280011, 40 runs, 0 violations.

</details>

### VS-3 · A caller leaves out the part a run, milestone, e2e or e2e-area branch needs
Profiles: cli, security, contract. Risk: a missing part that does not fail gives a branch such as `sdlc/run-None`, or a traceback in place of the JSON contract.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | A missing, empty or wrong part exits 2 and names the needed part | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:137` |
| TC-contract-7 | The Python API raises `Fail` that names a missing part; `n=0` gives `run-0` | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:252` |
| TC-contract-8 | The CLI exits 2 with one JSON error for a missing or wrong part | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:276` |
| TC-security-1 | 11 omission and wrong-part calls exit 2 with no side effect | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:91` |
| TC-security-2 | `tail` raises only `Fail` for a missing part, never `KeyError` or `TypeError` | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:118` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-5 · A missing, empty or wrong part exits 2 and names the needed part · PASS
- **Given** a scratch git repo **When** `name` runs with run and no `--n`; milestone and e2e with no `--id` or `--id ''`; e2e-area with no `--area` or `--area ''`; run with `--id` only; milestone with `--n` only **Then** each run exits 2 with one JSON error
- **Expected** `ok: false`; the error names `n`, `id` or `area`; no Traceback; tree unchanged **Actual** all 10 runs exit 2 with the expected part named
- **Spec source:** spec section 2: a missing part is a Fail · **Run:** `node --test --test-name-pattern "TC-cli-5 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

```console
--kind run -> exit 2 {"ok": false, "error": "a run branch name needs a non-empty n"}
--kind milestone --id '' -> exit 2 {"ok": false, "error": "a milestone branch name needs a non-empty id"}
--kind e2e-area --id M-1 --area '' -> exit 2 {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
```
Transcripts: [cli-0-TC-cli-5.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-5.txt)

#### TC-contract-7 · The Python API raises Fail that names a missing part · PASS
- **Given** a consumer import **When** `tail('run')`, `n=None`, `n=''`, `id='1'`; `tail('milestone')`, `id=''`, `n=1`; `tail('e2e')`, `id=None`, `id=''`; `tail('e2e-area', id='M-1')`, `area=''` **Then** each raises `Fail` ending in "non-empty <part>"
- **Expected** 12 `Fail` outcomes; `tail('run', n=0)` gives `run-0` **Actual** all 12 raise `Fail`; `n=0` gives `run-0` and `sdlc/run-0`
- **Spec source:** spec section 2: a missing part is a Fail · **Run:** `node --test --test-name-pattern='TC-contract-7:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
tail('run') -> Fail: a run branch name needs a non-empty n
tail('milestone', id='') -> Fail: ... non-empty id
tail('e2e', id=None) -> Fail: ... non-empty id
```

#### TC-contract-8 · The CLI exits 2 with one JSON error for a missing or wrong part · PASS
- **Given** a scratch git repo **When** `name --kind run` with no `--n` and with `--id 1`; milestone and e2e with no `--id`, `--id ''` and `--n 1`; e2e-area with no `--area` and `--area ''` **Then** exit 2, one JSON line, the error names the part
- **Expected** no Traceback, no tree change; `--n 0` gives `sdlc/run-0` **Actual** all 9 refusals and the `--n 0` case match
- **Spec source:** spec section 2: exit 2 with `{ok: false, error}` on bad input · **Run:** `node --test --test-name-pattern='TC-contract-8:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
--kind run --id 1 -> exit 2 {"ok": false, "error": "a run branch name needs a non-empty n"}
```

#### TC-security-1 · A missing, empty or wrong part exits 2 with one JSON error that names the part · PASS
- **Given** a scratch git repo with no config **When** `name` runs 11 times with an omitted, empty or wrong part **Then** each call exits 2 with one JSON object and an error that ends in "non-empty <part>"
- **Expected** exit 2; the error names `n`, `id` or `area`; no side effect **Actual** all 11 calls exit 2; stderr empty; cwd and repo unchanged
- **Spec source:** spec section 2 `tail`; CLI contract · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

```console
$ branches.py name --repo <repo> --kind run
{"ok": false, "error": "a run branch name needs a non-empty n"}
exit 2
```
All 11 transcripts: [security-0-vs3-cli.txt](../../slices/S-004/verification/r0/logs/security-0-vs3-cli.txt)

#### TC-security-2 · tail raises only Fail for a missing part and keeps 0 as a value · PASS
- **Given** `branches.py` loaded by path with `python3 -I` **When** `tail` runs 14 times with a missing, None, empty or wrong-key part, and once with run `n=0` **Then** every missing-part call raises `Fail`
- **Expected** 14 `Fail` outcomes and one return of `run-0` **Actual** 14 `Fail` outcomes; `tail('run', n=0)` returns `run-0`
- **Spec source:** spec section 2 `tail`: "A missing part is a `Fail`." · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Call results: [security-0-vs3-api.json](../../slices/S-004/verification/r0/logs/security-0-vs3-api.json)

</details>

### VS-4 · A run counter arrives in an edge form
Profiles: cli, security, contract. Risk: an unusual `--n` crashes the CLI or gives a run branch that git refuses.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | Valid run counters give `run-<int>`, and git accepts each | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:159` |
| TC-cli-7 | Refused run counters exit 2 with one JSON error | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:170` |
| TC-cli-8 | Corpus run counters never crash; accepted non-negative values pass git | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:180` |
| TC-contract-9 | Python API run counter edge forms give a str (one `ValueError` seed) | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:294` |
| TC-contract-10 | CLI `--n` edge forms give `run-<int>` or exit 2 | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:306` |
| TC-security-3 | 45 `--n` forms give `run-<int>` or one JSON error | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:132` |
| TC-security-4 | `tail('run', n=True / '7' / 7 / 0)` returns a string | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:159` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-6 · Valid run counters give run-<int> and pass git · PASS
- **Given** a scratch git repo **When** `name --kind run` with `--n` 0, 1, 12, `' 1'`, `+1`, `1_000`, `010`, Arabic-Indic one, a 20-digit integer **Then** each exits 0 with `run-<int as Python prints it>`
- **Expected** `run-0`, `run-1`, `run-12`, `run-1`, `run-1`, `run-1000`, `run-10`, `run-1`, `run-99999999999999999999`; git accepts each **Actual** all match
- **Spec source:** R-003 quote `run-<n>` · **Run:** `node --test --test-name-pattern "TC-cli-6 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-6.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-6.txt)

#### TC-cli-7 · Refused run counters exit 2 with one JSON error · PASS
- **Given** a scratch git repo **When** `name --kind run` with `--n` 1.5, abc, 0x1, `''`, 1e3, one **Then** each exits 2
- **Expected** one JSON error that names `n`, no Traceback **Actual** all exit 2 with "argument --n: invalid int value"
- **Spec source:** spec section 2 failure contract · **Run:** `node --test --test-name-pattern "TC-cli-7 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-7.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-7.txt)

#### TC-cli-8 · Corpus run counters never crash; accepted values pass git · PASS
- **Given** the integer-forms, unicode-digits and huge-integers families **When** `name --kind run --n=<value>` runs for each entry **Then** exit 0 or 2, one JSON object, no Traceback, tree unchanged
- **Expected** no crash; non-negative accepted values pass `git check-ref-format` **Actual** no crash. `-1` gives `sdlc/run--1` (ADR-20261009-045048). 4301 or more digits exit 2 through the Python int limit; 4300 digits exit 0
- **Spec source:** spec section 2 failure contract; R-003 · **Run:** `node --test --test-name-pattern "TC-cli-8 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-8.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-8.txt)

#### TC-contract-9 · The Python API run counter edge forms give a str or Fail · PASS
- **Given** a consumer import **When** `tail('run', n=...)` with 7, `'7'`, True, False, 0, -1, 12, 1.5, nan, inf, -0.0, `[]`, `{}`, `'x'`, `2**53`, `10**4299`, `10**5000` **Then** `n=7`, `'7'` and `True` give a str or `Fail` (plan note)
- **Expected** a str or `Fail` for the three plan values **Actual** 7 and `'7'` give `run-7`; True gives `run-True`. Every value gives a str except `10**5000`, which raises `ValueError` (seed)
- **Spec source:** plan VS-4 note; spec section 2 `tail` · **Run:** `node --test --test-name-pattern='TC-contract-9:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
True -> run-True; 1.5 -> run-1.5; nan -> run-nan; [] -> run-[]; -1 -> run--1 (ADR-20261009-045048)
10**5000 -> ValueError: Exceeds the limit (4300 digits) for integer string conversion
```
Full table: [contract-0-run.txt](../../slices/S-004/verification/r0/logs/contract-0-run.txt)

#### TC-contract-10 · The CLI --n edge forms give run-<int> or exit 2 · PASS
- **Given** a scratch git repo **When** `name --kind run` with `--n` from a hand list and the integer-forms, unicode-digits and huge-integers families **Then** a value `int()` accepts gives `sdlc/run-<int>`; a value `int()` refuses exits 2 with one JSON error
- **Expected** no Traceback; non-negative names pass `git check-ref-format` **Actual** all 52 values match. `١` gives `run-1`. A 4300-digit value gives a 4309-character branch that git accepts (seed)
- **Spec source:** spec section 2: exit 2 on bad input; plan VS-4 note · **Run:** `node --test --test-name-pattern='TC-contract-10:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
"0x1" -> exit 2 invalid int value
" 1" -> sdlc/run-1
"1_000" -> sdlc/run-1000
"١" -> sdlc/run-1
"-1" -> sdlc/run--1 (ADR-20261009-045048)
"9"x4301 -> exit 2 invalid int value
```

#### TC-security-3 · Every --n form gives run-<int> or one JSON error, and git accepts every non-negative accepted value · PASS
- **Given** a scratch git repo; 45 values from the integer-forms, huge-integers and unicode-digits families and the plan values **When** `name --kind run --n=<value>` runs once per value **Then** exit 0 with `sdlc/run-<str(int(value))>`, or exit 2 with one JSON error that names `--n`
- **Expected** no crash; no Traceback; empty stderr; no tree change **Actual** 28 values are accepted, for example `' 3 '` gives `sdlc/run-3`. 17 values are refused with "argument --n: invalid int value". `-1` gives `sdlc/run--1`, the known gap
- **Spec source:** R-003 acceptance; CLI contract; ADR-20261009-045048 · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

```console
--n=0x10          -> exit 2 {"ok": false, "error": "argument --n: invalid int value: '0x10'"}
--n=<4301 nines>  -> exit 2 invalid int value
--n=' 3 '         -> exit 0 sdlc/run-3
--n=-1            -> exit 0 sdlc/run--1 (ADR-20261009-045048 gap)
```
One row per value: [security-0-vs4-cli.jsonl](../../slices/S-004/verification/r0/logs/security-0-vs4-cli.jsonl)

#### TC-security-4 · tail run takes True, '7', 7 and 0 and returns a string · PASS
- **Given** `branches.py` loaded by path with `python3 -I` **When** `tail('run', n=True)`, `n='7'`, `n=7` and `n=0` **Then** each call returns a string tail or raises `Fail`
- **Expected** a string or `Fail`, no other exception **Actual** `run-True`, `run-7`, `run-7` and `run-0`, all strings
- **Spec source:** spec section 2 `tail`; plan VS-4 notes · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Call results: [security-0-vs4-api.json](../../slices/S-004/verification/r0/logs/security-0-vs4-api.json)

</details>

### VS-5 · Hostile text arrives in the milestone id or the e2e area
Profiles: security, cli. Risk: a hostile id runs a shell, writes a file, imports a planted module or breaks the JSON line.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 | 273 hostile ids and areas never crash, write, import a decoy or expand | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:208` |
| TC-cli-10 | Format-string ids appear literally in the branch | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:243` |
| TC-security-5 | 380 hostile calls never run a shell, write a file, import a planted module or expand a format | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:167` |
| TC-security-6 | A format-string id under `{name:lower}` stays literal and is lowercased once | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:208` |
| TC-security-7 | A flag-like value after a space-form `--id` or `--area` gives one JSON error, never help text | PASS | `.sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs:226` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-9 · Hostile milestone ids and e2e areas never crash, write, import a decoy or expand · PASS
- **Given** decoy modules `json`, `argparse`, `subprocess`, `os`, `re` planted in the cwd; eight hostile corpus families **When** `name` runs for milestone, e2e and e2e-area with `--id=<value>` or `--area=<value>` **Then** exit 0 or 2, one JSON object, the value appears literally
- **Expected** no crash and no side effect **Actual** 273 runs: 270 exit 0 with the literal value, 3 empty values exit 2; no Traceback; no decoy fired; 109 accepted branches fail `git check-ref-format` (seed, ADR-20261009-045048)
- **Spec source:** ADR-20261009-045048; spec section 2 failure contract · **Run:** `node --test --test-name-pattern "TC-cli-9 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-9.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-9.txt) · refused list: [cli-0-TC-cli-9-git-refused.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-9-git-refused.txt)

#### TC-cli-10 · Format-string ids appear literally in the branch · PASS
- **Given** a scratch git repo **When** `name --kind milestone --id` with `{name}`, `%s`, `{0}`, `${HOME}`, `$(id)`; e2e `--id {name}` with `--format feature/{name:lower}` **Then** the value is not expanded
- **Expected** `sdlc/{name}`, `sdlc/%s`, `sdlc/{0}`, `sdlc/${HOME}`, `sdlc/$(id)`, `feature/{name}-e2e` **Actual** all match
- **Spec source:** VS-5 notes; R-005, R-006 tail column · **Run:** `node --test --test-name-pattern "TC-cli-10 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-10.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-10.txt)

#### TC-security-5 · Hostile --id and --area values never run a shell, write a file, import a planted module or expand a format · PASS
- **Given** a repo with planted `json.py` and `subprocess.py`; a cwd with five decoy modules; 95 values from eight attack-corpus families **When** `name` runs 380 times across milestone `--id`, e2e `--id`, e2e-area `--area` and e2e-area `--id` **Then** exit 0 with the literal tail, or exit 2 for the empty value
- **Expected** no shell, no write, no import, a literal tail **Actual** 376 calls exit 0 with the exact literal tail; 4 calls exit 2 for the empty value; no `pwned` file; no decoy marker
- **Spec source:** CLI contract; plan VS-5 notes; ADR-20261009-045048 · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

```console
$ branches.py name --repo <repo> --kind milestone '--id=$(touch pwned)'
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "milestone", "branch": "sdlc/$(touch pwned)"}
exit 0
pwned files: none; decoy markers: none
```
380 rows: [security-0-vs5-cli.jsonl](../../slices/S-004/verification/r0/logs/security-0-vs5-cli.jsonl) · refused list: [security-0-vs5-git-refused.txt](../../slices/S-004/verification/r0/logs/security-0-vs5-git-refused.txt)

#### TC-security-6 · A format-string id under a lowercase format stays literal and is not expanded again · PASS
- **Given** a repo with `branchFormat` `feature/{name:lower}` **When** `name` for milestone `--id={NAME}`, e2e `--id={name:lower}`, milestone `--id=%S%N` and e2e `--id={0.__CLASS__}` **Then** the tail is lowercased once and stays literal
- **Expected** `feature/{name}`, `feature/{name:lower}-e2e`, `feature/%s%n`, `feature/{0.__class__}-e2e` **Actual** the four branches are exact; stderr empty; tree unchanged
- **Spec source:** spec section 2 `name`; plan VS-5 notes · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

```console
$ branches.py name --repo <repo> --kind milestone '--id={NAME}'
{"ok": true, "command": "name", "format": "feature/{name:lower}", "kind": "milestone", "branch": "feature/{name}"}
exit 0
```
Transcripts: [security-0-vs5-lower.txt](../../slices/S-004/verification/r0/logs/security-0-vs5-lower.txt)

#### TC-security-7 · A flag-like value after a space-form --id or --area gives one JSON error, never help text · PASS
- **Given** a scratch git repo **When** `name` with `--id V` and with `--area V`, for V in `--help`, `-h`, `--`, `--repo` and `--format=x/{name}` **Then** exit 2, one JSON error, no usage text
- **Expected** exit 2 with a JSON error **Actual** all 10 calls exit 2 with "argument --id: expected one argument" or the `--area` form; no `usage:` text
- **Spec source:** CLI contract · **Run:** `node --test .sdlc/slices/S-004/verification/r0/tests/security-0/branches.verify-security.test.mjs`

```console
$ branches.py name --repo <repo> --kind milestone --id --help
{"ok": false, "error": "argument --id: expected one argument"}
exit 2
```
Transcripts: [security-0-vs5-flaglike.txt](../../slices/S-004/verification/r0/logs/security-0-vs5-flaglike.txt)

</details>

### VS-6 · The new rows leave the existing slice, state and e2e-area tails and the unknown kinds unchanged
Profiles: contract, cli. Risk: a new row changes an earlier tail, or `e2e` and `e2e-area` give the same name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-11 | The slice, e2e-area and state tails stay; e2e and e2e-area do not collide | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:258` |
| TC-cli-12 | `verify`, `attempt` and unknown kinds exit 2 without a traceback | PASS | `.sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs:278` |
| TC-contract-11 | The slice, state and e2e-area tails stay; verify, attempt and unknown kinds are refused | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:336` |
| TC-contract-12 | Property: every `TAILS` kind gives a str, and `sdlc/{name}` names start with `sdlc/` | PASS | `.sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs:359` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-11 · The slice, e2e-area and state tails stay; e2e and e2e-area do not collide · PASS
- **Given** a scratch git repo **When** `name` for slice S-001, e2e-area M-1 api, e2e M-1, and state **Then** the existing tails are unchanged
- **Expected** `sdlc/S-001`, `sdlc/M-1-e2e-api`, `sdlc/M-1-e2e` (not equal), `sdlc/state-<14 digits>` **Actual** all match
- **Spec source:** R-004, R-007 acceptance · **Run:** `node --test --test-name-pattern "TC-cli-11 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`
- Transcripts: [cli-0-TC-cli-11.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-11.txt)

#### TC-cli-12 · verify, attempt and unknown kinds exit 2 without a traceback · PASS
- **Given** a scratch git repo **When** `name --kind` verify, attempt (with every part), foo, RUN, Milestone, `'e2e '`, E2E **Then** each exits 2
- **Expected** verify and attempt: "no branch name is defined for kind"; others: "is not one of" with the kind list **Actual** all match
- **Spec source:** ADR-20261009-041711; spec section 2 failure contract · **Run:** `node --test --test-name-pattern "TC-cli-12 " .sdlc/slices/S-004/verification/r0/tests/cli-0/tails.verify-cli.test.mjs`

```console
--kind foo -> exit 2 {"ok": false, "error": "--kind 'foo' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}
```
Transcripts: [cli-0-TC-cli-12.txt](../../slices/S-004/verification/r0/logs/cli-0-TC-cli-12.txt)

#### TC-contract-11 · The slice, state and e2e-area tails stay; verify, attempt and unknown kinds are refused · PASS
- **Given** a consumer import and a scratch git repo **When** `tail` for slice, state, e2e-area and e2e; `name` for verify, attempt and foo **Then** `S-001`, `state-20261008101500`, `M-1-e2e-api`, `M-1-e2e`
- **Expected** an extra `area` does not change the e2e tail; verify and attempt exit 2; foo exits 2 and lists the kinds **Actual** all match
- **Spec source:** R-004, R-007 acceptance; ADR-20261009-041711 · **Run:** `node --test --test-name-pattern='TC-contract-11:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`

```console
tail('e2e', id='M-1', area='api') -> M-1-e2e
--kind verify -> exit 2 no branch name is defined for kind 'verify'
```

#### TC-contract-12 · Property: every TAILS kind gives a str and sdlc/ names · PASS
- **Given** generated non-empty parts for run, slice, milestone, e2e, e2e-area and state **When** `tail` and `name` run **Then** `tail` returns the model tail as str; `name` with `sdlc/{name}` equals `sdlc/` + tail
- **Expected** 0 violations **Actual** 0 violations
- **Spec source:** spec section 1 tail table; section 2 `name` · **Run:** `node --test --test-name-pattern='TC-contract-12:' .sdlc/slices/S-004/verification/r0/tests/contract-0/branches-tails.verify-contract.test.mjs`
- Property `tail(all kinds)`: seed 20265637, 1500 runs, 0 violations. Property `name(sdlc/{name})`: seed 20262886, 1500 runs, 0 violations.

</details>

## How it was attacked
One security session ran in round 0 at commit 2b1960c. The charter was three attack lines: omitted and wrong parts (VS-3), edge run counters (VS-4), and hostile milestone ids and e2e areas (VS-5). The threat-model boundary trusts the skill code, the git binary, PATH and the Python environment. The untrusted input is the values of `--id`, `--area` and `--n`. ADR-20261009-045048 accepts that the rows check no id shape and no sign, so a branch that git refuses is a seed, not a refutation. The session tried 14 attacks: 12 held, 0 broke and 2 were out of scope. The cli profile also planted decoy modules during 810 hostile runs, and no decoy fired.

<details>
<summary>Attack table (14 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-1 omit the part | `--kind run` with no `--n`; milestone and e2e with no `--id` or `--id ''`; e2e-area with no `--area` or `--area ''` | exit 2; the error names the part | exit 2; names `n`, `id` or `area`; no side effect | held |
| A-2 wrong part | `--kind run --id 1`; `--kind milestone --n 1` | exit 2; the error names the needed part | "needs a non-empty n", "needs a non-empty id" | held |
| A-3 API missing parts | `tail('run')`, `tail('milestone', id='')`, `tail('e2e', id=None)` and 11 more | `Fail` only | `Fail` for all 14; `n=0` gives `run-0` | held |
| A-4 integer forms on `--n` | `0x10, 1.5, 1e3, inf, nan, two, '', ' 3 ', +1, -0, 1_000, 010` | `run-<int>` or exit 2 JSON error | padded, signed, underscored and leading-zero forms normalize; the rest exit 2 | held |
| A-5 huge integers on `--n` | 4300, 4301 and 100k nines; -5000 digits; 10k zeros | no crash | 4300 digits accepted; longer values exit 2 through the Python int limit | held |
| A-6 unicode digits on `--n` | Arabic-Indic, fullwidth, Devanagari, Bengali, NKo, math bold, Thai, mixed | an ASCII branch or exit 2 | normalized to ASCII `run-<int>`; git accepts it | held |
| A-7 non-int API values | `n=True`, `n='7'` | a string or `Fail` | `run-True`, `run-7` | held |
| A-8 API `n` above the print limit | `tail('run', n=10**5000)` | a string or `Fail` | `ValueError`; the CLI cannot reach it | out of scope |
| A-9 shell injection | `$(touch pwned)`, backticks, `; && \| >` forms, `--upload-pack=touch pwned` | no shell; a literal tail | literal; no `pwned` file; tree unchanged | held |
| A-10 planted modules | decoy `json`, `re`, `argparse`, `subprocess`, `os` in cwd; `json.py`, `subprocess.py` in repo | no import | no decoy marker; no exit 97 | held |
| A-11 format strings | `{name}`, `{0.__class__}`, `%s%n`, `{{name}}`, `${name}`, `{name:>9}` | literal | literal; under `{name:lower}` lowercased once | held |
| A-12 break the JSON line | newline + `{"ok": true}`, CR, ESC ANSI, BEL, `'"}, "ok": true'` | one JSON line | `json.dumps` escapes every value | held |
| A-13 flag-like values | `--help, -h, --, --repo, --format=x/{name}, -1, -, =` | one JSON object, never help text | space form: exit 2 "expected one argument"; equals form: a literal tail | held |
| A-14 traversal, confusables, oversized | `../..`, `/etc`, `file:///etc`, Cyrillic look-alikes, NBSP, 200k characters | no write; one JSON object | literal tail; tree unchanged; 144 of 380 branches fail `git check-ref-format` | out of scope |

</details>

## Defects found on the way

**Blocking defects**
- **T-025 repeats coverage that a committed test already pins.** Found by: test-quality review, round 0. Spec source: none; the finding is about test quality. Reproduce: compare the slice and e2e-area rows of T-025 (`skills/sdlc/test/branches.test.mjs:578`) with T-022 (`skills/sdlc/test/branches.test.mjs:490`). Fix: none in the code. T-025 still holds the two rows at commit fa30f17. The state files hold no ADR, seed or fix commit for this finding. Guard: not applicable.

No verifier found a blocking defect. The spec-fidelity, regression and gate checks held in round 0, and the 34 verification cases passed.

**Seeds**

| Seed | Found by | File |
|---|---|---|
| `name` output is not checked as a valid ref or a non-flag | security review r0 | `skills/sdlc/branches.py` |
| The `run_lower` case in T-027 does not prove lowercasing | test-quality review r0 | `skills/sdlc/test/branches.test.mjs` |
| The empty-part cases are not the same for each new row | test-quality review r0 | `skills/sdlc/test/branches.test.mjs` |
| T-027 makes a second copy of the CLI missing-part loop | test-quality review r0 | `skills/sdlc/test/branches.test.mjs` |
| Accepted milestone ids and e2e areas give branches git refuses (109 of 270) | verify-cli r0 | `skills/sdlc/branches.py` |
| Run counter accepts unicode digits, padding and a negative sign | verify-cli r0 | `skills/sdlc/branches.py` |
| Error text uses "a e2e" and "a e2e-area" | verify-cli r0 | `skills/sdlc/branches.py` |
| `tail('run', n=10**5000)` raises `ValueError`, not `Fail` | verify-contract r0 | `skills/sdlc/branches.py` |
| The CLI accepts a 4300-digit `--n` and prints a 4309-character branch | verify-contract r0 | `skills/sdlc/branches.py` |
| `tail('run', n=...)` accepts any type | verify-contract r0 | `skills/sdlc/branches.py` |
| `name` prints branch names that git refuses for a hostile milestone id or e2e area (144 of 380) | verify-security r0 | `skills/sdlc/branches.py` |
| `tail('run', n=<int over 4300 digits>)` raises `ValueError`, not `Fail` | verify-security r0 | `skills/sdlc/branches.py` |
| `--n` accepts padded, signed, underscored and non-ASCII digit forms | verify-security r0 | `skills/sdlc/branches.py` |
| The tail error text says "a e2e branch name" | verify-security r0 | `skills/sdlc/branches.py` |

Some seeds from different verifiers describe the same gap. The ledger keeps each one as a separate entry.

## Appendix
- Toolkit: `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `property` (`skills/sdlc/test/testkit/property.mjs`, with `skills/sdlc/test/testkit/pycall.py`), `attack-corpus` (`skills/sdlc/test/testkit/attack-corpus.mjs`).
- Round 0 plan: [plan-r0.json](../../slices/S-004/verification/plan-r0.json), [plan-r0.md](../../slices/S-004/verification/plan-r0.md).
- Round 0 profile evidence: [cli-0.md](../../slices/S-004/verification/r0/cli-0.md), [cli-0.json](../../slices/S-004/verification/r0/cli-0.json), [contract-0.md](../../slices/S-004/verification/r0/contract-0.md), [contract-0.json](../../slices/S-004/verification/r0/contract-0.json), [security-0.md](../../slices/S-004/verification/r0/security-0.md), [security-0.json](../../slices/S-004/verification/r0/security-0.json).
- Core verifiers: [verify-spec-fidelity-r0.md](../../slices/S-004/verify-spec-fidelity-r0.md), [verify-regression-r0.md](../../slices/S-004/verify-regression-r0.md), [gate-r0.md](../../slices/S-004/gate-r0.md), [suite-receipt.json](../../slices/S-004/verification/suite-receipt.json).
- Reviews: [review-architecture-r0.md](../../slices/S-004/review-architecture-r0.md), [review-security-r0.md](../../slices/S-004/review-security-r0.md), [review-test-quality-r0.md](../../slices/S-004/review-test-quality-r0.md).
- Plan and tests: [plan.md](../../slices/S-004/plan.md), [tests.md](../../slices/S-004/tests.md). ADR: ADR-20261009-045048-decision-judge-S-004-7815 in `.sdlc/DECISIONS.md`.
- Slice commits on `sdlc/S-004` over `origin/main`: a309162, b599525 (failing tests), 59c8235, 2b1960c (product change), c0be01d, 7dd0885, fa30f17. The local `main` is behind `origin/main`, so `git log main..sdlc/S-004` also lists the merged S-001 to S-003 commits.
- Missing: `failures.md` does not exist for this slice, because no round failed. No source records how the loop settled test-quality finding 1.
