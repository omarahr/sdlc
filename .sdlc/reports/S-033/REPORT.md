# S-033 · state-write and janitor take their format from the module
Verdict: RELEASED
Commit under test: 4478301 · Rounds: 2 · Attempts: 1 · Risk: high · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 7 | 29 | 29 | 0 | 0 | 2 / 2 | 6 |

## Summary
The slice changes `branch_run`. It takes a stored run branch only when the name parses to kind `run`. A foreign name such as `main` now counts as no run. The prune and `ensure_milestone_branch` pass the format to it. `janitor.py` already took its format from `load_format`, and tests now pin that for R-139. Three profiles checked the slice at round 0: cli (12 cases), contract (7 cases, three property runs) and security (10 cases, 7 attacks). The review found two blocking items in round 0: added comments and a missing non-string `runBranch` test. The fix round removed the comments and promoted the cases into the committed test. Round 1 re-ran the full suite and both core verifiers, and all held.

## Open risks
- Six seeds are open and none blocks the slice. They are listed under Defects.
- `parse` accepts non-ASCII digits and zero-padded ids. The prune deletes a shipped `feature/PROJ-1-M-１` or `feature/PROJ-1-M-01` as a milestone branch. The loop never creates such names, so the risk is low.
- `branch_run` raises `AttributeError` when the committed `config.json` is valid JSON but not an object. This code exists on main. A leftover branch with such a config stops `patch-slice` with a traceback.
- `janitor.py` checks the format with `split` only. Git-unsafe formats delete nothing but print no note. A non-string `branchFormat` makes the janitor sweep under `sdlc/{name}` with no note.
- The janitor deletes a verify branch whose slice is absent from the ledger. The janitor docstring states this rule, but the plan note for VS-5 says the branch stays.
- Round 1 re-ran no profile. The fix changed comments and tests only, so the round 0 profile results stand.
- No number in the spec governs this slice. No `limits` profile ran.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-138 | `prune_stale_milestone_branches` and `branch_run` classify with `parse`. | VS-1, VS-2, VS-3, VS-4 | TC-cli-1, TC-cli-2, TC-cli-3, TC-cli-4, TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-4, TC-security-1, TC-security-2, TC-security-3, TC-security-4, TC-security-5 | pass |
| R-139 | The format comes from `load_format(repo)`. | VS-5, VS-6, VS-7 | TC-cli-5, TC-cli-6, TC-cli-1 (part 1), TC-cli-2 (part 1), TC-cli-3 (part 1), TC-cli-4 (part 1), TC-cli-5 (part 1), TC-cli-6 (part 1), TC-contract-5, TC-contract-6, TC-contract-7, TC-security-6, TC-security-7, TC-security-8, TC-security-9, TC-security-10 | pass |

Committed tests: R-138 in `skills/sdlc/test/scripts.test.mjs:2290`, `:2305` and `:2347`. R-139 in `:2362`, `:2373` and `:2386`.

## Scenarios
### VS-1 · Prune under a custom format removes only branches that parse to milestone
Profiles: cli, security. Risk: A wrong match deletes a real branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Prune under feature/PROJ-1-{name} deletes only branches that parse to milestone | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:61` |
| TC-security-1 | Prune deletes only branches that parse to milestone under feature/PROJ-1-{name} | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:75` |
| TC-security-2 | Classification is case sensitive | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:97` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-1 · Prune under feature/PROJ-1-{name} deletes only branches that parse to milestone · PASS
- **Given** Stack repo with a bare remote, format feature/PROJ-1-{name}. M-1 squash-merged to origin/main. Shipped-equivalent branches: sdlc/M-2, feature/PROJ-1-M-3-e2e, feature/PROJ-1-S-001, feature/PROJ-1-run-1, feature/PROJ-1-M-10, Cyrillic M, lower-case m-7, M-01, fullwidth M-1.
- **When** state-write.py patch-slice for S-020 of M-4 in run 2.
- **Then** Only parsed milestone branches go; every foreign branch stays.
- **Expected** Only parsed milestone branches go; every foreign branch stays.
- **Actual** feature/PROJ-1-M-1 and M-10 went (both parse to milestone). sdlc/M-2, M-3-e2e, S-001, run-1, run-2, Cyrillic M-5, m-7 and main stayed. M-01 and the fullwidth-digit M-1 also went because parse classes them as milestone (seed).
- **Spec source:** R-138 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`
- Evidence (transcript), run transcript and refs: [logs/cli-0-run.log](../../slices/S-033/verification/r0/logs/cli-0-run.log)
- Evidence (file-tree), ref diff after the call:

```diff
- refs/heads/feature/PROJ-1-M-01
- refs/heads/feature/PROJ-1-M-1
- refs/heads/feature/PROJ-1-M-10
- refs/heads/feature/PROJ-1-M-１
+ refs/heads/feature/PROJ-1-M-4
+ refs/heads/feature/PROJ-1-S-020
```

#### TC-security-1 · Prune deletes only branches that parse to milestone under feature/PROJ-1-{name} · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Only feature/PROJ-1-M-1 and feature/PROJ-1-M-10 go.
- **Expected** Only feature/PROJ-1-M-1 and feature/PROJ-1-M-10 go.
- **Actual** gone = [feature/PROJ-1-M-1, feature/PROJ-1-M-10]; 14 foreign names and the remote refs unchanged.
- **Spec source:** R-138 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
Foreign names kept: sdlc/M-2, -M-3-e2e, -S-001, -run-1, -M-1x, -m-4, xfeature/..., trailing dash, Cyrillic M, non-breaking hyphen, M-9/x, state-, fullwidth M. Trailing slash ref refused by git.
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

#### TC-security-2 · Classification is case sensitive · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Capitalised and lower-cased names give no kind.
- **Expected** Capitalised and lower-cased names give no kind.
- **Actual** kinds [null,null,null,'milestone'].
- **Spec source:** R-138 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
Feature/PROJ-1-M-5, feature/PROJ-1-m-5, feature/proj-1-M-5 give null
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

### VS-2 · branch_run returns a stored name only when it parses to kind run
Profiles: contract, cli, security. Risk: A foreign stored name could count as the run.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | A stored runBranch that is foreign or malformed is read as no run | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:98` |
| TC-contract-1 | branch_run returns a stored name only for kind run, under custom and default format | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:73` |
| TC-contract-2 | Property: branch_run equals a reference model written from the spec | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:96` |
| TC-contract-3 | Property: malformed or non-string format gives Fail or a string | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:120` |
| TC-contract-4 | Hostile committed config text does not raise for object-shaped or broken JSON | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:109` |
| TC-security-3 | branch_run returns a stored name only when it parses to kind run | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:111` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-2 · A stored runBranch that is foreign or malformed is read as no run · PASS
- **Given** Leftover milestone branch with unshipped work. Its committed config names runBranch: main, sdlc/run-1, release/x, empty, absent, 123, ["a"], {a:1}, null, a slice name, a milestone name (custom format); main, a custom-format run, release/x (default format). Current run is run-2.
- **When** patch-slice for S-001 (runs ensure_milestone_branch).
- **Then** No 'belongs to run' refusal, branch and tip intact, no traceback.
- **Expected** No 'belongs to run' refusal, branch and tip intact, no traceback.
- **Actual** 14 of 14 variants: exit 0, no refusal, branch tip unchanged, no traceback.
- **Spec source:** R-138 acceptance (a foreign branch is not taken as the run branch) · **Run:** `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`
- Evidence (transcript), run transcript and refs: [logs/cli-0-run.log](../../slices/S-033/verification/r0/logs/cli-0-run.log)

#### TC-contract-1 · branch_run returns a stored name only for kind run, under custom and default format · PASS
- **Given** a repo with branches holding runBranch values feature/PROJ-1-run-1, sdlc/run-1, main, release/x, empty, 5, null, list, object, true, missing key, invalid JSON, [] and null.
- **When** branch_run(repo, branch, fmt) under feature/PROJ-1-{name} and sdlc/{name}, and for a missing branch.
- **Then** the matching run name comes back; every other value gives the empty string; no exception.
- **Expected** the matching run name comes back; every other value gives the empty string; no exception.
- **Actual** 14 values x 2 formats all matched.
- **Spec source:** R-138 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (property-run), examples:

```text
examples test passed; see log
```
  Full file: [logs/contract-0-run4.log](../../slices/S-033/verification/r0/logs/contract-0-run4.log)

#### TC-contract-2 · Property: branch_run equals a reference model written from the spec · PASS
- **Given** 1500 generated (format, stored runBranch) pairs, committed as 1500 branches; model: starts with prefix, ends with suffix, middle is run-<ascii digits>.
- **When** branch_run for each pair.
- **Then** the stored value when the model accepts, else the empty string.
- **Expected** the stored value when the model accepts, else the empty string.
- **Actual** 0 violations in 1500 runs.
- **Spec source:** R-138 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (property-run), property branch_run:

```text
property branch_run: seed=2767008703 runs=1500 violations=0
```
  Full file: [logs/contract-0-run4.log](../../slices/S-033/verification/r0/logs/contract-0-run4.log)

#### TC-contract-3 · Property: malformed or non-string format gives Fail or a string · PASS
- **Given** 1000 formats from arb.format (braces, git-unsafe characters, unicode whitespace, NUL, lone surrogates, non-strings).
- **When** branch_run(repo, branch, fmt).
- **Then** outcome is Fail or a string, never another exception.
- **Expected** outcome is Fail or a string, never another exception.
- **Actual** 0 violations in 1000 runs.
- **Spec source:** R-138 acceptance; plan note VS-2 · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (property-run), property malformed fmt:

```text
property branch_run malformed fmt: seed=3593848531 runs=1000 violations=0
```
  Full file: [logs/contract-0-run4.log](../../slices/S-033/verification/r0/logs/contract-0-run4.log)

#### TC-contract-4 · Hostile committed config text does not raise for object-shaped or broken JSON · PASS
- **Given** committed config text: empty, truncated, BOM, concatenated objects, NaN, 100000 open brackets, deep nesting, duplicate keys, lone surrogate.
- **When** branch_run under the default format.
- **Then** Fail or a string.
- **Expected** Fail or a string.
- **Actual** all returned the empty string; a JSON string, number or true at top level raised AttributeError (seed 1).
- **Spec source:** plan note VS-2 only, not a spec source · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (log), non-object probe:

```text
non-object config probe: 8:exception:AttributeError 9:exception:AttributeError 10:exception:AttributeError
```
  Full file: [logs/contract-0-run4.log](../../slices/S-033/verification/r0/logs/contract-0-run4.log)

#### TC-security-3 · branch_run returns a stored name only when it parses to kind run · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Foreign, empty, non-string, missing and malformed values give the empty string; bad formats give Fail or the empty string.
- **Expected** Foreign, empty, non-string, missing and malformed values give the empty string; bad formats give Fail or the empty string.
- **Actual** 16 stored values under custom and default format, missing key, missing branch, invalid JSON all as expected; 6 bad formats gave Fail or empty, no traceback.
- **Spec source:** R-138 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
stored main, release/x, sdlc/run-1 (custom), feature/PROJ-1-run-1 (default), 42, list, null, dict, true -> empty string
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

### VS-3 · A foreign branch is not taken as the run branch
Profiles: cli, security. Risk: A false refusal or a prune could hit a leftover branch with unshipped work.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | A foreign branch is not taken as the run branch and is not pruned | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:98` |
| TC-security-4 | A foreign stored run does not block or prune a leftover milestone branch with unshipped work | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:150` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-3 · A foreign branch is not taken as the run branch and is not pruned · PASS
- **Given** As TC-cli-2 with runBranch main and sdlc/run-1 under the custom format.
- **When** patch-slice for S-001.
- **Then** ensure_milestone_branch does not fail with 'belongs to run'. The unshipped branch and its commit stay.
- **Expected** ensure_milestone_branch does not fail with 'belongs to run'. The unshipped branch and its commit stay.
- **Actual** Exit 0, branch feature/PROJ-1-S-001 cut, leftover milestone branch tip unchanged.
- **Spec source:** R-138 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`
- Evidence (transcript), run transcript and refs: [logs/cli-0-run.log](../../slices/S-033/verification/r0/logs/cli-0-run.log)

#### TC-security-4 · A foreign stored run does not block or prune a leftover milestone branch with unshipped work · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** ensure_milestone_branch returns the branch; branch, remote tip and commit stay.
- **Expected** ensure_milestone_branch returns the branch; branch, remote tip and commit stay.
- **Actual** 5 foreign values (main, sdlc/run-1, release/x, feature/PROJ-1-S-001, feature/PROJ-1-run-x): no Fail, tips equal, unshipped.txt still readable, prune returned [].
- **Spec source:** R-138 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
local and remote tips compared before and after
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

### VS-4 · A branch that names another real run branch still refuses
Profiles: cli, security. Risk: The change could weaken the refusal.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | A branch that names another real run still refuses | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:111` |
| TC-security-5 | A branch naming another real run still refuses | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:167` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-4 · A branch that names another real run still refuses · PASS
- **Given** Leftover milestone branch whose config names feature/PROJ-1-run-1 or run-7 (custom), sdlc/run-1 or run-9 (default and empty format). Current run is run-2.
- **When** patch-slice for S-001.
- **Then** Exit 2 with 'belongs to run <name>'. The branch stays.
- **Expected** Exit 2 with 'belongs to run <name>'. The branch stays.
- **Actual** All 4 variants exit 2 with the 'belongs to run' message; branch tip unchanged.
- **Spec source:** R-138 acceptance, existing refusal in ensure_milestone_branch · **Run:** `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`
- Evidence (transcript), run transcript and refs: [logs/cli-0-run.log](../../slices/S-033/verification/r0/logs/cli-0-run.log)
- Evidence (transcript), refusal:

```console
{"ok": false, "error": "feature/PROJ-1-M-1 belongs to run feature/PROJ-1-run-1, not to feature/PROJ-1-run-2, and its work is not on origin/main: merge or drop it by hand, then cut again"}  (exit 2)
```

#### TC-security-5 · A branch naming another real run still refuses · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Fail 'belongs to run' under both formats; no ref changes.
- **Expected** Fail 'belongs to run' under both formats; no ref changes.
- **Actual** custom and default format both refused; run-01 and Arabic-digit run still refused; heads equal before and after.
- **Spec source:** R-138 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
feature/PROJ-1-run-2 and sdlc/run-2 refuse
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

### VS-5 · A repo whose config holds feature/PROJ-1-{name} makes the janitor sweep under that format
Profiles: cli, security. Risk: The janitor deletes branches, so a wrong format removes real work.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | Janitor sweeps under feature/PROJ-1-{name} from config | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:146` |
| TC-security-6 | Custom format janitor sweeps only its verify branches | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:198` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-5 · Janitor sweeps under feature/PROJ-1-{name} from config · PASS
- **Given** config.json branchFormat feature/PROJ-1-{name}. Ledger: S-001 done, S-002 todo, S-003 rejected. Branches for S-001 (custom and sdlc/), S-002, S-003, S-099, and feature/PROJ-1-S-001.
- **When** janitor.py --repo.
- **Then** Done-slice verify branch under the custom format goes. sdlc/ branch, unfinished slice, slice branch and main stay.
- **Expected** Done-slice verify branch under the custom format goes. sdlc/ branch, unfinished slice, slice branch and main stay.
- **Actual** removedBranches: feature/PROJ-1-S-001-v0-http-api-0, ...S-003..., ...S-099... . sdlc/S-001-v0-http-api-0, S-002 branch, feature/PROJ-1-S-001 and main stayed. S-003 (rejected) and S-099 (absent from ledger) went, as janitor.py's docstring says. The plan note for VS-5 says an unlisted id stays; the code and docstring say it goes (seed).
- **Spec source:** R-139 acceptance; janitor.py docstring · **Run:** `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`
- Evidence (transcript), run transcript and refs: [logs/cli-0-run.log](../../slices/S-033/verification/r0/logs/cli-0-run.log)

#### TC-security-6 · Custom format janitor sweeps only its verify branches · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Done slice's custom verify branch goes; sdlc/, in-progress, attempt, slice, run, milestone and release names stay.
- **Expected** Done slice's custom verify branch goes; sdlc/, in-progress, attempt, slice, run, milestone and release names stay.
- **Actual** removed [feature/PROJ-1-S-001-v0-http-api-0, feature/PROJ-1-S-099-v0-http-api-0]; all others stay.
- **Spec source:** R-139 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
S-099 is not in the ledger and goes by the janitor's documented rule
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

### VS-6 · A repo with no branchFormat or an empty one makes the janitor sweep under sdlc/{name}
Profiles: cli, security. Risk: A wrong default would sweep the wrong branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | Janitor sweeps under sdlc/{name} when branchFormat is absent, empty or the config is missing | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs:156` |
| TC-security-7 | Default format janitor with no key, empty key, no config file, explicit default | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:211` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-6 · Janitor sweeps under sdlc/{name} when branchFormat is absent, empty or the config is missing · PASS
- **Given** Same ledger. Config {}, {branchFormat: ''}, and no config.json.
- **When** janitor.py --repo.
- **Then** sdlc/S-001-v0-http-api-0 goes; feature/PROJ-1-S-001-v0-http-api-0, sdlc/S-002 branch and main stay.
- **Expected** sdlc/S-001-v0-http-api-0 goes; feature/PROJ-1-S-001-v0-http-api-0, sdlc/S-002 branch and main stay.
- **Actual** All 3 variants: removed sdlc/S-001-v0-http-api-0 and the ledger-absent sdlc/S-099-v0-http-api-0; the custom-format branch stayed.
- **Spec source:** R-139 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033-v0-cli-0> node --test .sdlc/slices/S-033/verification/r0/tests/cli-0/branch-format.verify-cli.test.mjs`
- Evidence (transcript), run transcript and refs: [logs/cli-0-run.log](../../slices/S-033/verification/r0/logs/cli-0-run.log)

#### TC-security-7 · Default format janitor with no key, empty key, no config file, explicit default · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** sdlc/S-001-v0-http-api-0 goes; custom-format and other names stay.
- **Expected** sdlc/S-001-v0-http-api-0 goes; custom-format and other names stay.
- **Actual** 4 variants as expected.
- **Spec source:** R-139 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
feature/PROJ-1-S-001-v0-http-api-0 stays in each
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

### VS-7 · janitor.py takes its format from load_format and refuses a malformed format
Profiles: contract, cli, security. Risk: A malformed format could make the janitor delete a wrong branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 (part 1) | Source: janitor.py calls branches.load_format(repo) and holds no sdlc/ literal in code | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:23` |
| TC-cli-2 (part 1) | Custom format feature/PROJ-1-{name} sweeps only the feature/ verify branches of done or unknown slices | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:30` |
| TC-cli-3 (part 1) | Unusable format (no placeholder, unbalanced braces, two or unknown placeholders) deletes no branch and prints a note | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:38` |
| TC-cli-4 (part 1) | Git-unsafe or odd format (space, tilde, colon, double dot, leading dash, .lock, extra braces) deletes no branch | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:38` |
| TC-cli-5 (part 1) | Non-string branchFormat counts as absent; sweep runs under sdlc/{name} | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:68` |
| TC-cli-6 (part 1) | Config file with invalid JSON deletes no branch and prints a note | PASS | `.sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs:38` |
| TC-contract-5 | janitor.py calls branches.load_format(repo) and holds no sdlc/ branch literal outside prose | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:136` |
| TC-contract-6 | janitor with 17 malformed branchFormat values deletes no branch | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:50` |
| TC-contract-7 | Property: load_format over generated config shapes gives Fail or a string | PASS | `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:149` |
| TC-security-8 | janitor.py reads load_format and holds no sdlc/ literal outside prose | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:226` |
| TC-security-9 | Janitor deletes nothing and reports a format with a wrong placeholder count | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:235` |
| TC-security-10 | Non-string branchFormat is read as absent | PASS | `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:258` |

<details>
<summary>Case detail (12 cases)</summary>

#### TC-cli-1 (part 1) · Source: janitor.py calls branches.load_format(repo) and holds no sdlc/ literal in code · PASS
- **Given** scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-.
- **When** janitor.py --repo <scratch> --days 36500 runs with the stated config.
- **Then** branches and notes match the title.
- **Expected** Source: janitor.py calls branches.load_format(repo) and holds no sdlc/ literal in code.
- **Actual** as expected.
- **Spec source:** R-139 acceptance · **Run:** `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`
- Evidence (transcript), janitor with unbalanced format: [logs/cli-1-transcript.txt](../../slices/S-033/verification/r0/logs/cli-1-transcript.txt)
- Evidence (log), node --test run (16 pass): [logs/cli-1-node-test.txt](../../slices/S-033/verification/r0/logs/cli-1-node-test.txt)

#### TC-cli-2 (part 1) · Custom format feature/PROJ-1-{name} sweeps only the feature/ verify branches of done or unknown slices · PASS
- **Given** scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-.
- **When** janitor.py --repo <scratch> --days 36500 runs with the stated config.
- **Then** branches and notes match the title.
- **Expected** Custom format feature/PROJ-1-{name} sweeps only the feature/ verify branches of done or unknown slices.
- **Actual** as expected.
- **Spec source:** R-139 acceptance · **Run:** `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`
- Evidence (transcript), janitor with unbalanced format: [logs/cli-1-transcript.txt](../../slices/S-033/verification/r0/logs/cli-1-transcript.txt)
- Evidence (log), node --test run (16 pass): [logs/cli-1-node-test.txt](../../slices/S-033/verification/r0/logs/cli-1-node-test.txt)

#### TC-cli-3 (part 1) · Unusable format (no placeholder, unbalanced braces, two or unknown placeholders) deletes no branch and prints a note · PASS
- **Given** scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-.
- **When** janitor.py --repo <scratch> --days 36500 runs with the stated config.
- **Then** branches and notes match the title.
- **Expected** Unusable format (no placeholder, unbalanced braces, two or unknown placeholders) deletes no branch and prints a note.
- **Actual** as expected.
- **Spec source:** R-139 quote · **Run:** `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`
- Evidence (transcript), janitor with unbalanced format: [logs/cli-1-transcript.txt](../../slices/S-033/verification/r0/logs/cli-1-transcript.txt)
- Evidence (log), node --test run (16 pass): [logs/cli-1-node-test.txt](../../slices/S-033/verification/r0/logs/cli-1-node-test.txt)

#### TC-cli-4 (part 1) · Git-unsafe or odd format (space, tilde, colon, double dot, leading dash, .lock, extra braces) deletes no branch · PASS
- **Given** scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-.
- **When** janitor.py --repo <scratch> --days 36500 runs with the stated config.
- **Then** branches and notes match the title.
- **Expected** Git-unsafe or odd format (space, tilde, colon, double dot, leading dash, .lock, extra braces) deletes no branch.
- **Actual** as expected.
- **Spec source:** R-139 quote · **Run:** `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`
- Evidence (transcript), janitor with unbalanced format: [logs/cli-1-transcript.txt](../../slices/S-033/verification/r0/logs/cli-1-transcript.txt)
- Evidence (log), node --test run (16 pass): [logs/cli-1-node-test.txt](../../slices/S-033/verification/r0/logs/cli-1-node-test.txt)

#### TC-cli-5 (part 1) · Non-string branchFormat counts as absent; sweep runs under sdlc/{name} · PASS
- **Given** scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-.
- **When** janitor.py --repo <scratch> --days 36500 runs with the stated config.
- **Then** branches and notes match the title.
- **Expected** Non-string branchFormat counts as absent; sweep runs under sdlc/{name}.
- **Actual** as expected.
- **Spec source:** R-139 acceptance (no branchFormat) · **Run:** `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`
- Evidence (transcript), janitor with unbalanced format: [logs/cli-1-transcript.txt](../../slices/S-033/verification/r0/logs/cli-1-transcript.txt)
- Evidence (log), node --test run (16 pass): [logs/cli-1-node-test.txt](../../slices/S-033/verification/r0/logs/cli-1-node-test.txt)

#### TC-cli-6 (part 1) · Config file with invalid JSON deletes no branch and prints a note · PASS
- **Given** scratch git repo with a ledger (S-001 done, S-002 in_progress) and verify branches under sdlc/ and feature/PROJ-1-.
- **When** janitor.py --repo <scratch> --days 36500 runs with the stated config.
- **Then** branches and notes match the title.
- **Expected** Config file with invalid JSON deletes no branch and prints a note.
- **Actual** as expected.
- **Spec source:** R-139 quote · **Run:** `node --test .sdlc/slices/S-033/verification/r0/tests/cli-1/janitor.verify-cli.test.mjs`
- Evidence (transcript), janitor with unbalanced format: [logs/cli-1-transcript.txt](../../slices/S-033/verification/r0/logs/cli-1-transcript.txt)
- Evidence (log), node --test run (16 pass): [logs/cli-1-node-test.txt](../../slices/S-033/verification/r0/logs/cli-1-node-test.txt)

#### TC-contract-5 · janitor.py calls branches.load_format(repo) and holds no sdlc/ branch literal outside prose · PASS
- **Given** janitor.py at the slice commit.
- **When** read the file.
- **Then** load_format call present; no literal sdlc/ outside the docstring and .sdlc paths.
- **Expected** load_format call present; no literal sdlc/ outside the docstring and .sdlc paths.
- **Actual** call present; zero literal hits.
- **Spec source:** R-139 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (log), source check:

```text
includes branches.load_format(repo); literal hits: []
```

#### TC-contract-6 · janitor with 17 malformed branchFormat values deletes no branch · PASS
- **Given** ledger S-001 done; branches sdlc/S-001-v0-http-api-0, feature/PROJ-1-S-001-v0-http-api-0, sdlc/S-999-v0-cli-0.
- **When** run janitor.py with each malformed format.
- **Then** no branch removed; refs unchanged; exit 0.
- **Expected** no branch removed; refs unchanged; exit 0.
- **Actual** all 17 deleted nothing; format errors reported as a note for the four split-detectable shapes only.
- **Spec source:** R-139 acceptance; plan note VS-7 · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (log), reports:

```text
malformed tilde: reported=false notes=[] (and 10 more git-unsafe shapes)
```
  Full file: [logs/contract-0-run4.log](../../slices/S-033/verification/r0/logs/contract-0-run4.log)

#### TC-contract-7 · Property: load_format over generated config shapes gives Fail or a string · PASS
- **Given** 500 config shapes from arb.configShape.
- **When** load_format(repo).
- **Then** Fail or return.
- **Expected** Fail or return.
- **Actual** 0 violations in 500 runs.
- **Spec source:** R-139 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs`
- Evidence (property-run), load_format:

```text
property load_format: seed=191072499 runs=500 violations=0
```
  Full file: [logs/contract-0-run4.log](../../slices/S-033/verification/r0/logs/contract-0-run4.log)

#### TC-security-8 · janitor.py reads load_format and holds no sdlc/ literal outside prose · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Source holds branches.load_format(repo); only prose lines name sdlc/.
- **Expected** Source holds branches.load_format(repo); only prose lines name sdlc/.
- **Actual** confirmed; two note strings name .sdlc/slices.json only.
- **Spec source:** R-139 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
source read
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

#### TC-security-9 · Janitor deletes nothing and reports a format with a wrong placeholder count · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** 14 malformed string formats delete nothing; placeholder-count errors are reported.
- **Expected** 14 malformed string formats delete nothing; placeholder-count errors are reported.
- **Actual** no deletion in 14 cases; placeholder errors reported in 5 of 5.
- **Spec source:** R-139 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
brace, whitespace, NUL, .., ~, .lock, bidi formats pass split and are not reported (seed)
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

#### TC-security-10 · Non-string branchFormat is read as absent · PASS
- **Given** scratch git repo, local bare origin, branches cut from main.
- **When** the function or script runs against the hostile names.
- **Then** Custom-format branches stay.
- **Expected** Custom-format branches stay.
- **Actual** 5 non-string values: sdlc/S-001-v0-http-api-0 swept under default, custom branch stays, no note.
- **Spec source:** R-139 acceptance · **Run:** `SKILL_DIR=<skill dir of sdlc/S-033> node --test .sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs`
- Evidence (attack), attack log:

```text
seed: silent
```
- Evidence (db-diff), ref diff before and after: [logs/security-0-run5.txt](../../slices/S-033/verification/r0/logs/security-0-run5.txt)

</details>

## How it was attacked
One security session ran at round 0 (security-0, 10 cases). Charter: explore the prune, `branch_run`, `ensure_milestone_branch` and the janitor with confusable, foreign and malformed names to find a wrong deletion. Threat model: branch names and committed config on leftover branches are untrusted. The format in the repo config is trusted but may be malformed. It tried 7 attack groups. Four held and three fell outside the slice. No attack broke the slice.

<details>
<summary>Attack table (7 attacks)</summary>

| Input | Expected | Observed | Result |
|---|---|---|---|
| 13 lookalike and prefix-clash names | only parse-kind milestone goes | only M-1 and M-10 went | held |
| feature/PROJ-1-M-\u0663 | no match | kind milestone: Python \d matches Arabic-Indic digits | out-of-scope |
| 16 stored values, 6 bad formats | empty string or Fail | as expected | held |
| config.json holding [1] | empty string or Fail | AttributeError: 'list' object has no attribute 'get' (the line existed before this slice) | out-of-scope |
| main, sdlc/run-1, release/x, S-001, run-x | no refusal, no ref change | as expected | held |
| run-2, run-01, Arabic-digit run | belongs to run | refused | held |
| 14 string formats, 5 non-string values | no deletion, a note | no string format deleted anything; 9 were not reported; non-string values fall back to the default and sweep | out-of-scope |

</details>

The cli profile also ran two attack rows in cli-0 (hostile branch names and hostile stored values). Both held, and the zero-padded and fullwidth-digit milestone names are seed 3 below.

## Defects found on the way
- **Blocking defect 1.** Added comments in the slice. Found by the test-quality review, round 0. The rule is: no comments in code. The test file gained a banner comment and `branch_run` gained a docstring paragraph. Fixed in 2cee0c3. The comment check of the review guards it.
- **Blocking defect 2.** No committed test covered the `isinstance(stored, str)` guard. Found by the test-quality review, round 0. Reproduce: set `runBranch` to `5`, `null`, a list, an object or `true`. Fixed in 2cee0c3, and tests.md records the promotion. The test at `skills/sdlc/test/scripts.test.mjs:2305` guards it.
- No open blocking defect remains. The core verifiers and the security review found none.

| Seed | Found by | File |
|---|---|---|
| Prune test overlaps older prune tests | `skills/sdlc/test/scripts.test.mjs` | review test-quality r0, review architecture r1 |
| `branch_run` raises `AttributeError` when the committed config is valid JSON but not an object (exists on main) | `skills/sdlc/state-write.py` | cli-0, contract-0, security-0, review architecture r1 |
| `parse` accepts Unicode digits, leading zeros and a trailing newline, so the prune deletes `feature/PROJ-1-M-１` and `M-01`, and `branch_run` returns such run names | `skills/sdlc/branches.py` | cli-0, contract-0, security-0 |
| Plan note for VS-5 contradicts the janitor rule for a branch absent from the ledger | `skills/sdlc/janitor.py` | cli-0, security-0 |
| The janitor checks the format with `split` only, so git-unsafe formats give no note | `skills/sdlc/janitor.py` | cli-1, contract-0, security-0, review test-quality r0 |
| A non-string `branchFormat` reads as absent, so the janitor sweeps under `sdlc/{name}` with no note | `skills/sdlc/branches.py` | cli-1, contract-0, security-0 |

## Appendix
- Toolkit tools used: `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `attack-corpus` and `property` (listed in `verification/plan-r1.json` as existing).
- Round 0 plan: [plan-r0.md](../../slices/S-033/verification/plan-r0.md). Round 1 plan: [plan-r1.md](../../slices/S-033/verification/plan-r1.md).
- Profile evidence, round 0: [cli-0](../../slices/S-033/verification/r0/cli-0.md), [cli-1](../../slices/S-033/verification/r0/cli-1.md), [contract-0](../../slices/S-033/verification/r0/contract-0.md), [security-0](../../slices/S-033/verification/r0/security-0.md). Round 1 has no profile evidence.
- Core verifiers: [spec-fidelity r0](../../slices/S-033/verify-spec-fidelity-r0.md), [spec-fidelity r1](../../slices/S-033/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-033/verify-regression-r0.md), [regression r1](../../slices/S-033/verify-regression-r1.md). Gate: [gate-r0](../../slices/S-033/gate-r0.md).
- Reviews: [security r0](../../slices/S-033/review-security-r0.md), [security r1](../../slices/S-033/review-security-r1.md), [test-quality r0](../../slices/S-033/review-test-quality-r0.md), [architecture r1](../../slices/S-033/review-architecture-r1.md).
- Missing sources: none.
