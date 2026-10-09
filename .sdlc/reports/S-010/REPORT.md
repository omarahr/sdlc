# S-010 · list enumerates local branches of one kind
Verdict: RELEASED
Commit under test: 79efa1c · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 7 | 39 | 39 | 0 | 0 | 0 / 0 | 13 |

## Summary
The `list` command now prints every local branch of one kind, with the parts that `parse` gives. Run and attempt branches sort by `n` as integers, so `attempt-2` comes before `attempt-10`. Foreign branches, tags and remote refs never appear. A directory that is not a git repository gives exit 2 and a JSON error. Three verification profiles ran in round 0: cli, contract and security. All 39 cases passed, and no blocking defect was found. The spec-fidelity, regression and three review lenses all returned no blocking finding. The full suite passed (550 pass, 1 skipped). Thirteen non-blocking seeds stay open.

## Open risks
- Non-ASCII digits (for example Arabic-Indic or fullwidth) count as digits in run and attempt names. `sdlc/run-١` lists as run 1 next to `sdlc/run-1`. Run numbering in S-018 reads this list. Fix with `[0-9]+` or `re.ASCII` in `PARSE_ROWS`.
- Three older verification tests (TC-cli-10, TC-cli-11, VS-8) for push-guard pins fail on this branch and on base `cac97cf`. This slice does not cause them. They are not part of `npm test`.
- `list` entries for `run` and `state` have no `id` key, because `parse` gives none (ADR bd10). A caller that reads `id` must skip them.
- `list_kind` returns `[]` for an unknown kind through the API. The CLI rejects it with exit 2. A typo in a later caller looks like no branches.
- Malformed names such as `sdlc/S-001-attempt-x` list as `slice` with an odd id. This follows the parse table.
- The code reads full ref names, not `%(refname:short)` as the spec text says. The branch set is the same except where a tag shares a branch name.
- A repo with no commit where HEAD names an unborn branch lists nothing. This follows `for-each-ref`.
- Limits: the spec gives no number for `list`. The cli profile measured 3000 run branches as fast and sorted. No spec number was measured.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-025 | `list_kind(repo, fmt, kind)`: every local branch … that parses to `kind`, with its parts, sorted by `n` for `run` and `attempt` and by name otherwise. | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-7 | cli-1, cli-2, cli-3, cli-4, cli-5, cli-6, cli-7, cli-8, contract-1, contract-2, contract-3, contract-4, contract-5, contract-6, contract-7, contract-8, contract-9, contract-10, contract-11, contract-12, contract-13, contract-14, contract-15, security-1, security-2, security-3, security-4, security-5, security-6, security-7, security-8, security-9, security-10, security-11, security-12, security-13, security-14, security-15, security-16; repo tests T-R-025a to T-R-025f | pass (39 cases) |
| R-094 | `list_kind(repo, fmt, kind)`: every local branch … that parses to `kind`, with its parts, sorted by `n` for `run` and `attempt` and by name otherwise. Acceptance: `sdlc/S-001-attempt-2` precedes `sdlc/S-001-attempt-10`. | VS-2, VS-6 | cli-2, contract-4, contract-5, contract-10, security-10, security-11, security-12; repo tests T-R-094a, T-R-094b | pass (7 cases) |

## Scenarios
### VS-1 · An operator lists slice branches and sees only slices, sorted by name
Risk: a wrong kind filter, or a sort that is not by name.

Profiles: cli, contract

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | list --kind slice returns only slice branches sorted by name | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:18` |
| TC-cli-7 | Help, idempotency, unicode and spaces in the repo path, equals-form flags, relative --repo | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:158` |
| TC-contract-1 | Public surface lists list_kind(repo, fmt, kind) and the stdlib-only import set | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:25` |
| TC-contract-2 | list --kind slice returns only slices, sorted by name, with parts | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:64` |
| TC-contract-3 | Sort is by name, not by creation order | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:78` |
| TC-contract-13 | Determinism, purity and cwd independence via the public entry point | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:319` |
| TC-contract-14 | A tag or remote-tracking ref with a branch name does not change the result | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:347` |
| TC-contract-15 | PROPERTY list_kind equals a reference model for 1200 random repos | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:356` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-cli-1 · list --kind slice returns only slice branches sorted by name · PASS
- **Given** A fixture repo holds slice, milestone, run, state, verify, attempt, e2e, foreign and tag-free branches **When** branches.py list --kind slice **Then** exit 0, empty stderr, keys ok/command/format/kind/branches, branches sdlc/S-001, sdlc/S-002, sdlc/S-fix-M-1-2, each with kind slice and id equal to tail, known null
- **Expected** exit 0, empty stderr, keys ok/command/format/kind/branches, branches sdlc/S-001, sdlc/S-002, sdlc/S-fix-M-1-2, each with kind slice and id equal to tail, known null **Actual** exactly as expected; foreign branches (main, other/S-009, S-003, sdlc/feature-x) absent; tree unchanged
- **Spec source:** R-025 acceptance · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-1'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-cli-7 · Help, idempotency, unicode and spaces in the repo path, equals-form flags, relative --repo · PASS
- **Given** Wide fixture repo; repo path with spaces and unicode **When** list --help; two identical runs; --repo=<path> --kind=slice; --repo . with cwd **Then** help exit 0; identical stdout twice; the unicode path lists sdlc/S-001; equals form equals spaced form
- **Expected** help exit 0; identical stdout twice; the unicode path lists sdlc/S-001; equals form equals spaced form **Actual** exactly as expected
- **Spec source:** R-025 acceptance · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-7'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-contract-1 · Public surface lists list_kind(repo, fmt, kind) and the stdlib-only import set · PASS
- **Given** branches.py imported as a consumer imports it **When** Inspect signatures and imports **Then** list_kind(repo, fmt, kind), parse(fmt, branch, ids=None), name(fmt, kind, **parts); only stdlib imports
- **Expected** list_kind(repo, fmt, kind), parse(fmt, branch, ids=None), name(fmt, kind, **parts); only stdlib imports **Actual** list_kind(repo, fmt, kind), parse(fmt, branch, ids=None), name(fmt, kind, **parts); only stdlib imports (observed)
- **Spec source:** R-025 quote · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="surface"`
- Evidence (type-check): surface listing

```console
build_parser ()
cmd_list (ns)
cmd_name (ns)
cmd_parse (ns)
cmd_preflight (ns)
list_kind (repo, fmt, kind)
load_format (repo)
load_git_modes (path=...)
main (argv=None)
name (fmt, kind, **parts)
parse (fmt, branch, ids=None)
split (fmt)
tail (kind, **parts)
validate_format (fmt)
imports: argparse, datetime, json, os, re, subprocess, sys
```

#### TC-contract-2 · list --kind slice returns only slices, sorted by name, with parts · PASS
- **Given** Repo with 12 branches of every kind plus zeta **When** list --kind slice **Then** sdlc/S-001, S-002, S-010, S-fix-M-1-2 in that order; kind slice, id equals tail; tree unchanged
- **Expected** sdlc/S-001, S-002, S-010, S-fix-M-1-2 in that order; kind slice, id equals tail; tree unchanged **Actual** sdlc/S-001, S-002, S-010, S-fix-M-1-2 in that order; kind slice, id equals tail; tree unchanged (observed)
- **Spec source:** R-025 acceptance · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="spec example"`
- Evidence (transcript): list --kind slice

```console
branches: sdlc/S-001, sdlc/S-002, sdlc/S-010, sdlc/S-fix-M-1-2 (each {branch,kind:slice,tail,id,known:null})
```

#### TC-contract-3 · Sort is by name, not by creation order · PASS
- **Given** Slice branches created in reverse and mixed order **When** list --kind slice **Then** Result equals the code-point sorted names
- **Expected** Result equals the code-point sorted names **Actual** Result equals the code-point sorted names (observed)
- **Spec source:** R-025 quote · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="VS-1: sort is by name"`
- Evidence (log): order

```text
created S-9, S-100, S-10, S-1, S-a, S-B, S-fix-M-2-1, S-fix-M-1-1; listed in sorted order
```

#### TC-contract-13 · Determinism, purity and cwd independence via the public entry point · PASS
- **Given** Fixture repo **When** list_kind five times; CLI from another cwd and with --repo . **Then** Equal results; snapshot including refs unchanged; CLI equals API
- **Expected** Equal results; snapshot including refs unchanged; CLI equals API **Actual** Equal results; snapshot including refs unchanged; CLI equals API (observed)
- **Spec source:** R-025 quote · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="determinism"`
- Evidence (log): result

```text
5 equal results; repo snapshot diff empty; CLI branches equal API value
```

#### TC-contract-14 · A tag or remote-tracking ref with a branch name does not change the result · PASS
- **Given** Tags sdlc/S-001 and sdlc/S-003, remote ref origin/sdlc/S-009 **When** list --kind slice **Then** sdlc/S-001 and sdlc/S-002 only
- **Expected** sdlc/S-001 and sdlc/S-002 only **Actual** sdlc/S-001 and sdlc/S-002 only (observed)
- **Spec source:** R-025 acceptance · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="tag or remote"`
- Evidence (log): result

```text
[sdlc/S-001, sdlc/S-002]
```

#### TC-contract-15 · PROPERTY list_kind equals a reference model for 1200 random repos · PASS
- **Given** 1200 formats (prefix, suffix, name and name:lower), 0 to 14 branches of random kinds, foreign names **When** list_kind(repo, fmt, kind) via python3 -I; 120 of them also through the CLI **Then** Branch set, order and parts equal the model built from construction; foreign names absent; CLI equals API
- **Expected** Branch set, order and parts equal the model built from construction; foreign names absent; CLI equals API **Actual** Branch set, order and parts equal the model built from construction; foreign names absent; CLI equals API (observed)
- **Spec source:** R-025 quote; R-094 acceptance; ADR 7c1e · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="PROPERTY"`
- Evidence (property-run): list_kind vs model

```text
property-run list_kind-vs-model: seed=1288679427 runs=1200 violations=0 nonEmptyResults=640 maxEntries=6 lowerWorlds=443
property-run cli-agrees-with-api: seed=1288679427 runs=120 violations=0
Earlier run seed=253635815 runs=1200: 3 violations, all from a model error (foreign tail S-1-v1-x is a slice by the table); model fixed, then 0 violations
```

</details>

### VS-2 · Run and attempt branches sort by n as integers
Risk: a string sort puts run-10 and attempt-10 before run-2 and attempt-2.

Profiles: cli, contract

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | run and attempt sort by n as integers, ties by branch name | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:30` |
| TC-cli-8 | 3000 run branches stay fast and sorted | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:172` |
| TC-contract-4 | run and attempt sort by n as JSON integers; ties by full branch name | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:85` |
| TC-contract-5 | Huge n (41 digits, 200 digits) sorts as an integer and prints exactly | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:104` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-2 · run and attempt sort by n as integers, ties by branch name · PASS
- **Given** Branches created in order run-100, 10, 2, 1 and attempts of S-001, S-002, S-003 with n 1, 2, 10, 100 **When** branches.py list --kind run, then --kind attempt **Then** run n order 1,2,10,100 as JSON integers; attempts order S-001-attempt-1, S-003-attempt-1, S-001-attempt-2, S-002-attempt-2, S-001-attempt-10, S-001-attempt-100
- **Expected** run n order 1,2,10,100 as JSON integers; attempts order S-001-attempt-1, S-003-attempt-1, S-001-attempt-2, S-002-attempt-2, S-001-attempt-10, S-001-attempt-100 **Actual** exactly as expected
- **Spec source:** R-094 acceptance · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-2'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-cli-8 · 3000 run branches stay fast and sorted · PASS
- **Given** 3000 branches sdlc/run-1..3000 made with update-ref --stdin **When** list --kind run **Then** 3000 entries, n from 1 to 3000 in order
- **Expected** 3000 entries, n from 1 to 3000 in order **Actual** 3000 entries in order, 264 ms
- **Spec source:** R-025 acceptance · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-8'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-contract-4 · run and attempt sort by n as JSON integers; ties by full branch name · PASS
- **Given** run-10,2,100,1,007,0 and attempts of S-001 and S-002 with n 1,2,10,100 **When** list --kind run, list --kind attempt **Then** run n: 0,1,2,7,10,100; attempt order S-001-1, S-001-2, S-002-2, S-001-10, S-002-10, S-001-100; n is a number
- **Expected** run n: 0,1,2,7,10,100; attempt order S-001-1, S-001-2, S-002-2, S-001-10, S-002-10, S-001-100; n is a number **Actual** run n: 0,1,2,7,10,100; attempt order S-001-1, S-001-2, S-002-2, S-001-10, S-002-10, S-001-100; n is a number (observed)
- **Spec source:** R-094 acceptance; ADR 7c1e · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="run and attempt sort"`
- Evidence (transcript): run

```console
[["sdlc/run-0",0],["sdlc/run-1",1],["sdlc/run-2",2],["sdlc/run-007",7],["sdlc/run-10",10],["sdlc/run-100",100]]
```
- Evidence (transcript): attempt

```console
[["sdlc/S-001-attempt-1",1],["sdlc/S-001-attempt-2",2],["sdlc/S-002-attempt-2",2],["sdlc/S-001-attempt-10",10],["sdlc/S-002-attempt-10",10],["sdlc/S-001-attempt-100",100]]
```

#### TC-contract-5 · Huge n (41 digits, 200 digits) sorts as an integer and prints exactly · PASS
- **Given** run branches with 40-digit, 41-digit and zero-padded n **When** list --kind run **Then** Integer order; stdout holds the exact digits; 200-digit n gives exit 0
- **Expected** Integer order; stdout holds the exact digits; 200-digit n gives exit 0 **Actual** Integer order; stdout holds the exact digits; 200-digit n gives exit 0 (observed)
- **Spec source:** R-025 quote · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="huge n"`
- Evidence (log): 200-digit n

```text
status=0 stdoutBytes=845 stderr=""
```

</details>

### VS-3 · Foreign branches, remote refs and tags never appear
Risk: for-each-ref short names can clash with a tag of the same name, and a remote-tracking ref can leak in.

Profiles: cli, security

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | Remote refs, tags, notes refs, detached HEAD never appear and never change a real branch | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:44` |
| TC-security-1 | Remote refs, tags, notes, stash, lookalike namespace and detached HEAD never appear | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:20` |
| TC-security-2 | A tag with the same name as a branch does not hide or alter the branch | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:36` |
| TC-security-3 | A tag with no branch of that name gives an empty list | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:50` |
| TC-security-4 | A branch named heads/sdlc/S-002 is not read as sdlc/S-002 | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:58` |
| TC-security-5 | A symbolic ref under refs/heads does not produce a non-slice entry or a crash | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:66` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-3 · Remote refs, tags, notes refs, detached HEAD never appear and never change a real branch · PASS
- **Given** Repo with sdlc/S-001 branch, remote-tracking ref origin/sdlc/S-009, tags sdlc/S-008, sdlc/S-001 and heads/sdlc/S-001, a notes ref, then a detached HEAD **When** branches.py list --kind slice before and after detaching **Then** only sdlc/S-001 both times, exit 0
- **Expected** only sdlc/S-001 both times, exit 0 **Actual** only sdlc/S-001 both times, exit 0
- **Spec source:** R-025 quote (local branches via refs/heads/) · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-3'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-security-1 · Remote refs, tags, notes, stash, lookalike namespace and detached HEAD never appear · PASS
- **Given** Repo with branches sdlc/S-001, sdlc/S-007, feature/x; refs/remotes/origin/sdlc/S-009 and S-001; tag sdlc/S-008; refs/notes/sdlc/S-011; refs/heads-evil/sdlc/S-012; refs/stash; detached HEAD **When** list --kind slice **Then** Only sdlc/S-001 and sdlc/S-007; no ref written
- **Expected** Only sdlc/S-001 and sdlc/S-007; no ref written **Actual** Exact list returned; tree and refs unchanged
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS3-a

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}, {"branch": "sdlc/S-007", "kind": "slice", "tail": "S-007", "id": "S-007", "known": null}]}

```

#### TC-security-2 · A tag with the same name as a branch does not hide or alter the branch · PASS
- **Given** Branches and tags both named sdlc/S-001 and sdlc/run-3; extra tag sdlc/run-4 and tag heads/sdlc/S-001 **When** list --kind slice and --kind run **Then** Real branches listed once with correct parts; tag-only names absent
- **Expected** Real branches listed once with correct parts; tag-only names absent **Actual** Branches listed once, ids and n correct (the implementation uses full refnames)
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS3-b

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```
- Evidence (attack): list exchange: VS3-b

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind run
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "run", "branches": [{"branch": "sdlc/run-3", "kind": "run", "tail": "run-3", "n": 3, "known": null}]}

```

#### TC-security-3 · A tag with no branch of that name gives an empty list · PASS
- **Given** Only tag sdlc/S-050 **When** list --kind slice **Then** branches []
- **Expected** branches [] **Actual** branches []
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS3-c

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": []}

```

#### TC-security-4 · A branch named heads/sdlc/S-002 is not read as sdlc/S-002 · PASS
- **Given** Branch heads/sdlc/S-002 and sdlc/S-001 **When** list --kind slice **Then** Only sdlc/S-001
- **Expected** Only sdlc/S-001 **Actual** Only sdlc/S-001
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS3-d

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(91) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

#### TC-security-5 · A symbolic ref under refs/heads does not produce a non-slice entry or a crash · PASS
- **Given** refs/heads/sdlc/S-077 as symbolic ref to sdlc/S-001 **When** list --kind slice **Then** Exit 0; every entry kind slice
- **Expected** Exit 0; every entry kind slice **Actual** Exit 0; every entry kind slice
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS3-e

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}, {"branch": "sdlc/S-077", "kind": "slice", "tail": "S-077", "id": "S-077", "known": null}]}

```

</details>

### VS-4 · The branch format changes what list returns
Risk: list ignores the format.

Profiles: cli, contract

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | The branch format changes what list returns | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:63` |
| TC-contract-6 | Format changes what list returns; --format overrides config; default applies without either | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:120` |
| TC-contract-7 | Invalid format fails with the same error and exit 2 as parse | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:143` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-4 · The branch format changes what list returns · PASS
- **Given** Repo with sdlc/S-001 and feature/PROJ-1-* and feature/lo-s-001 branches; a repo with config.branchFormat; invalid formats; invalid config JSON **When** list with --format feature/PROJ-1-{name}, feature/lo-{name:lower}, config only, --format over config, no-placeholder format, brace format, bad config **Then** override and config select only matching branches; --format beats config; default format is sdlc/{name}; invalid formats exit 2 with the same error as parse and no traceback
- **Expected** override and config select only matching branches; --format beats config; default format is sdlc/{name}; invalid formats exit 2 with the same error as parse and no traceback **Actual** exactly as expected
- **Spec source:** R-025 acceptance (format from plan notes and parse behavior) · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-4'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-contract-6 · Format changes what list returns; --format overrides config; default applies without either · PASS
- **Given** Repo with config branchFormat team/{name} and branches of four formats **When** list with config, with --format feature/PROJ-1-{name}, {name:lower}, zzz/{name}, sdlc/{name}-x **Then** Each call returns only the branches of its format; format echoed
- **Expected** Each call returns only the branches of its format; format echoed **Actual** Each call returns only the branches of its format; format echoed (observed)
- **Spec source:** R-025 acceptance; spec section 2 (--format overrides config) · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="format changes"`
- Evidence (transcript): lower

```console
[["feature/PROJ-1-S-001","S-001"],["feature/PROJ-1-S-004","S-004"],["feature/proj-1-s-003","s-003"]]
```

#### TC-contract-7 · Invalid format fails with the same error and exit 2 as parse · PASS
- **Given** Seven invalid formats and an invalid config format **When** list --format <bad> vs parse --format <bad> **Then** Exit 2, ok false, same error text, empty stderr
- **Expected** Exit 2, ok false, same error text, empty stderr **Actual** Exit 2, ok false, same error text, empty stderr (observed)
- **Spec source:** spec section 2 (exit 2 with ok false) · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="invalid format"`
- Evidence (transcript): example

```console
list --format 'a b/{name}' -> 2 {"ok": false, "error": "the branch format 'a b/{name}' holds whitespace"}; parse -> 2 same error
```

</details>

### VS-5 · An empty repo or a non-git directory gives a clear result
Risk: a traceback, or exit 0 for a non-git directory.

Profiles: cli, security

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | Empty repo, non-git directory, missing path, file path, bare repo, bad kind | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:93` |
| TC-security-6 | Repo with no commit gives an empty list; unknown kind gives exit 2 | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:76` |
| TC-security-7 | Non-git dir, missing path, file path and empty --repo give exit 2 and JSON, no traceback | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:85` |
| TC-security-8 | Subdirectory of a repo, bare repo, broken .git file and corrupt packed-refs give defined JSON results | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:98` |
| TC-security-9 | git missing from PATH gives a defined result | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:114` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-5 · Empty repo, non-git directory, missing path, file path, bare repo, bad kind · PASS
- **Given** Repo with no commit; unborn branch; plain directory; missing path; file path; bare repo with pushed branch; unknown kind; missing flags; empty --repo **When** branches.py list in each state **Then** empty repo: exit 0 and branches []; non-git: exit 2, ok false, 'not a git repository', no traceback; missing and file paths: exit 2 JSON; bare repo lists the pushed branch; unknown kind exit 2; scanned trees unchanged
- **Expected** empty repo: exit 0 and branches []; non-git: exit 2, ok false, 'not a git repository', no traceback; missing and file paths: exit 2 JSON; bare repo lists the pushed branch; unknown kind exit 2; scanned trees unchanged **Actual** exactly as expected
- **Spec source:** R-025 plan notes and ADR e3f4 · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-5'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-security-6 · Repo with no commit gives an empty list; unknown kind gives exit 2 · PASS
- **Given** git init with no commit **When** list --kind slice; list --kind bogus **Then** [] with exit 0; exit 2 with ok false
- **Expected** [] with exit 0; exit 2 with ok false **Actual** As expected; tree unchanged
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS5-a

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": []}

```
- Evidence (attack): list exchange: VS5-a

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind bogus
-> exit 2; tree unchanged: True
{"ok": false, "error": "--kind 'bogus' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}

```

#### TC-security-7 · Non-git dir, missing path, file path and empty --repo give exit 2 and JSON, no traceback · PASS
- **Given** Plain dir, missing path, regular file, empty string **When** list --kind slice **Then** exit 2, ok false, message 'not a git repository' for the plain dir, no traceback, tree unchanged
- **Expected** exit 2, ok false, message 'not a git repository' for the plain dir, no traceback, tree unchanged **Actual** As expected
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS5-b

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
-> exit 2; tree unchanged: True
{"ok": false, "error": "not a git repository: /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IPRTHX/plain-15"}

```
- Evidence (attack): list exchange: VS5-b

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(98) --kind slice
-> exit 2; tree unchanged: True
{"ok": false, "error": "--repo '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IPRTHX/plain-15/nope' is not a directory"}

```
- 2 more evidence items in [security-0.json](../../slices/S-010/verification/r0/security-0.json).

#### TC-security-8 · Subdirectory of a repo, bare repo, broken .git file and corrupt packed-refs give defined JSON results · PASS
- **Given** Four fixtures **When** list --kind slice **Then** One JSON object, exit 0 or 2, no traceback
- **Expected** One JSON object, exit 0 or 2, no traceback **Actual** Subdir lists branches; bare repo, broken gitdir and corrupt packed-refs give defined JSON
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS5-f

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(96) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```
- Evidence (attack): list exchange: VS5-f

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(96) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": []}

```
- 2 more evidence items in [security-0.json](../../slices/S-010/verification/r0/security-0.json).

#### TC-security-9 · git missing from PATH gives a defined result · PASS
- **Given** PATH=/nonexistent **When** list --kind slice **Then** Exit 2 JSON error, no traceback
- **Expected** Exit 2 JSON error, no traceback **Actual** Defined error, no traceback
- **Spec source:** R-025 acceptance: Foreign branches are absent · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS5-j

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
-> exit None; tree unchanged: True

```

</details>

### VS-6 · Hostile branch names and arguments do not break or fool list
Risk: names that parse oddly.

Profiles: security, contract

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-10 | Hostile branch names classify by the spec table or drop out; list never crashes | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:210` |
| TC-contract-11 | Attack corpus for --repo, --kind and --format (650 invocations) gives one JSON object, exit 0 or 2, tree unchanged | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:262` |
| TC-contract-12 | Flag-like and abbreviated arguments give a JSON error or a defined result | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:295` |
| TC-security-10 | attempt-0, attempt-007, attempt-7 and run-0/007 sort by integer n with ties by branch name | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:121` |
| TC-security-11 | Unicode digit tails (12 corpus entries, run and attempt) never crash list | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:129` |
| TC-security-12 | Huge integers in branch names (4300, 4301, 5000 digits) do not crash list | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:145` |
| TC-security-13 | Confusable and traversal corpus names as branches never produce a wrong-kind entry or crash, across all 8 kinds | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:159` |
| TC-security-14 | Flag-like corpus values as --repo, --kind and --format give one JSON object with exit 0 or 2 | PASS | none (run inside the profile log) |
| TC-security-15 | Injection strings and traversal paths as --repo run no command and write nothing | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:201` |
| TC-security-16 | Repo git config (core.fsmonitor, alias) does not run code during list | PASS | `.sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs:217` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-contract-10 · Hostile branch names classify by the spec table or drop out; list never crashes · PASS
- **Given** 84 refs: attempt-0/007, unicode digits, confusables, ZWSP, leading dash, shell metacharacters, 40 non-ASCII digit run names **When** list for all eight kinds **Then** Exit 0, one JSON object, empty stderr, tree unchanged; bad names absent; attempt-007 and attempt-0 present
- **Expected** Exit 0, one JSON object, empty stderr, tree unchanged; bad names absent; attempt-007 and attempt-0 present **Actual** Exit 0, one JSON object, empty stderr, tree unchanged; bad names absent; attempt-007 and attempt-0 present (observed)
- **Spec source:** R-025 acceptance (foreign branches absent) · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="hostile"`
- Evidence (log): rerun

```text
.sdlc/slices/S-010/verification/r0/logs/contract-0-hostile-rerun.log: pass; 46 non-ASCII digit names classified (seed)
```

#### TC-contract-11 · Attack corpus for --repo, --kind and --format (650 invocations) gives one JSON object, exit 0 or 2, tree unchanged · PASS
- **Given** 11 corpus families, five argv forms each **When** branches.py list <value> **Then** Never a traceback; ok equals (exit 0); no mutation
- **Expected** Never a traceback; ok equals (exit 0); no mutation **Actual** Never a traceback; ok equals (exit 0); no mutation (observed)
- **Spec source:** spec section 2 (one JSON object, exit 2 on bad input) · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="corpus values"`
- Evidence (log): corpus

```text
EX VS-6 corpus invocations=650; the only successes are valid formats such as %s/{name} and {name}
```

#### TC-contract-12 · Flag-like and abbreviated arguments give a JSON error or a defined result · PASS
- **Given** Eleven argv shapes **When** list with --repo --kind, --kind --help, --, duplicate --kind, --rep, --kin, unknown flag, missing flags **Then** Exit 0 or 2, JSON, no traceback
- **Expected** Exit 0 or 2, JSON, no traceback **Actual** Exit 0 or 2, JSON, no traceback (observed)
- **Spec source:** spec section 2 · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="option-like"`
- Evidence (transcript): samples

```console
list --repo <repo> --kind --help -> 2 argument --kind: expected one argument
list --repo <repo> --kind slice --kind run -> 0 (last wins)
list --repo <repo> --kin slice -> 0 (abbreviation)
```

#### TC-security-10 · attempt-0, attempt-007, attempt-7 and run-0/007 sort by integer n with ties by branch name · PASS
- **Given** Branches attempt-0, 007, 7, 10, 2 and run-0, 007, 10, 2 **When** list --kind attempt and run **Then** n order 0,2,7,7,10 and 0,2,7,10 as JSON integers
- **Expected** n order 0,2,7,7,10 and 0,2,7,10 as JSON integers **Actual** As expected
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-a

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "attempt", "branches": [{"branch": "sdlc/S-001-attempt-0", "kind": "attempt", "tail": "S-001-attempt-0", "id": "S-001", "n": 0, "known": null}, {"branch": "sdlc/S-001-attempt-2", "kind": "attempt", "tail": "S-001-attempt-2", "id": "S-001", "n": 2, "known": null}, {"branch": "sdlc/S-001-attempt-007", "kind": "attempt", "tail": "S-001-attempt-007", "id": "S-001", "n": 7, "known": null}, {"branch": "sdlc/S-001-attempt-7", "kind": "att
```
- Evidence (attack): list exchange: VS6-a

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "run", "branches": [{"branch": "sdlc/run-0", "kind": "run", "tail": "run-0", "n": 0, "known": null}, {"branch": "sdlc/run-2", "kind": "run", "tail": "run-2", "n": 2, "known": null}, {"branch": "sdlc/run-007", "kind": "run", "tail": "run-007", "n": 7, "known": null}, {"branch": "sdlc/run-10", "kind": "run", "tail": "run-10", "n": 10, "known": null}]}

```

#### TC-security-11 · Unicode digit tails (12 corpus entries, run and attempt) never crash list · PASS
- **Given** Each corpus entry created as a branch **When** list --kind run / attempt **Then** Exit 0, one JSON object, n an integer
- **Expected** Exit 0, one JSON object, n an integer **Actual** No crash; non-ASCII digit tails are listed as loop branches (see seeds)
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-ud-arabic-indic-attempt

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "attempt", "branches": [{"branch": "sdlc/S-001-attempt-1", "kind": "attempt", "tail": "S-001-attempt-1", "id": "S-001", "n": 1, "known": null}, {"branch": "sdlc/S-001-attempt-\u0663", "kind": "attempt", "tail": "S-001-attempt-\u0663", "id": "S-001", "n": 3, "known": null}]}

```

#### TC-security-12 · Huge integers in branch names (4300, 4301, 5000 digits) do not crash list · PASS
- **Given** Branches run-<N nines> written via packed-refs **When** list --kind run / attempt **Then** Exit 0, one JSON object
- **Expected** Exit 0, one JSON object **Actual** Exit 0, one JSON object
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-huge

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind run
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "run", "branches": [{"branch": "sdlc/run-1", "kind": "run", "tail": "run-1", "n": 1, "known": null}, {"branch": "sdlc/run-9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
```
- Evidence (attack): list exchange: VS6-huge

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind attempt
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "attempt", "branches": []}

```

#### TC-security-13 · Confusable and traversal corpus names as branches never produce a wrong-kind entry or crash, across all 8 kinds · PASS
- **Given** Branches from unicode-confusables and traversal corpora under sdlc/, sdlc/S- and bare **When** list for each of 8 kinds **Then** Exit 0, kind matches, slice ids match S-[A-Za-z0-9-]+
- **Expected** Exit 0, kind matches, slice ids match S-[A-Za-z0-9-]+ **Actual** As expected
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-conf-slice

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(92) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}, {"branch": "sdlc/S-SLICE", "kind": "slice", "tail": "S-SLICE", "id": "S-SLICE", "known": null}]}

```

#### TC-security-14 · Flag-like corpus values as --repo, --kind and --format give one JSON object with exit 0 or 2 · PASS
- **Given** 8 flag-like values in 3 slots (24 runs) **When** list **Then** Exit 0 or 2, ok matches exit, JSON, no traceback, tree unchanged
- **Expected** Exit 0 or 2, ok matches exit, JSON, no traceback, tree unchanged **Actual** As expected
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-flag-double-dash-repo

```text
branches.py list --repo -- --kind slice
-> exit 2; tree unchanged: True
{"ok": false, "error": "argument --repo: expected one argument"}

```

#### TC-security-15 · Injection strings and traversal paths as --repo run no command and write nothing · PASS
- **Given** Shell metacharacters touching a marker file; corpus injection and traversal values **When** list --repo <value> **Then** Exit 2 JSON; marker file absent
- **Expected** Exit 2 JSON; marker file absent **Actual** Marker absent; exit 2
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-inj

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(101) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

#### TC-security-16 · Repo git config (core.fsmonitor, alias) does not run code during list · PASS
- **Given** Marker-touching fsmonitor and rev-parse alias set in the repo **When** list --kind slice **Then** Branch listed; marker absent
- **Expected** Branch listed; marker absent **Actual** Marker absent
- **Spec source:** R-025 acceptance; R-094 acceptance · **Run:** `node --test .sdlc/slices/S-010/verification/r0/tests/security-0/list.verify-security.test.mjs`
- Evidence (attack): list exchange: VS6-cfg

```text
branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-ks0oIN/testkit-cli-IP...(93) --kind slice
-> exit 0; tree unchanged: True
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": [{"branch": "sdlc/S-001", "kind": "slice", "tail": "S-001", "id": "S-001", "known": null}]}

```

</details>

### VS-7 · Each kind returns its parts in the list output
Risk: missing or renamed parts.

Profiles: contract, cli

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | Each kind returns its parts and the branch and id keys | PASS | `.sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs:126` |
| TC-contract-8 | Each kind returns its parts; output keys are ok, command, format, kind, branches; parse agrees | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:172` |
| TC-contract-9 | id key holds for every kind that has an id | PASS | `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:197` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-6 · Each kind returns its parts and the branch and id keys · PASS
- **Given** Fixture repo with one branch of each kind **When** branches.py list --kind <each kind>, and parse on the first branch **Then** every kind returns its parts (id, n, ts, round, profile, part, area), keys ok/command/format/kind/branches, known null, entry equals parse output without ok/command/format; kinds with no branch give []
- **Expected** every kind returns its parts (id, n, ts, round, profile, part, area), keys ok/command/format/kind/branches, known null, entry equals parse output without ok/command/format; kinds with no branch give [] **Actual** exactly as expected
- **Spec source:** R-025 plan notes (branches[].branch and branches[].id) · **Run:** `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-010/verification/r0/tests/cli-0/list.verify-cli.test.mjs --test-name-pattern 'TC-cli-6'`
- Evidence (transcript): command lines, stdout, stderr, exit codes: [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)
- Evidence (file-tree): tree diff of the scanned repo after the call (unchanged): [cli-0-run.txt](../../slices/S-010/verification/r0/logs/cli-0-run.txt)

#### TC-contract-8 · Each kind returns its parts; output keys are ok, command, format, kind, branches; parse agrees · PASS
- **Given** Fixture with every kind **When** list --kind <each kind> **Then** Parts match parse; known null; key order ok,command,format,kind,branches
- **Expected** Parts match parse; known null; key order ok,command,format,kind,branches **Actual** Parts match parse; known null; key order ok,command,format,kind,branches (observed)
- **Spec source:** ADR bd10 · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="each kind"`
- Evidence (transcript): verify and e2e-area entries

```console
{"branch":"sdlc/S-001-v0-http-api-0","kind":"verify","tail":"S-001-v0-http-api-0","id":"S-001","round":0,"profile":"http-api","part":0,"known":null}
{"branch":"sdlc/M-1-e2e-api","kind":"e2e-area","tail":"M-1-e2e-api","id":"M-1","area":"api","known":null}
```

#### TC-contract-9 · id key holds for every kind that has an id · PASS
- **Given** Fixture with every kind **When** list per kind **Then** slice, milestone, e2e, e2e-area, verify and attempt entries carry a string id
- **Expected** slice, milestone, e2e, e2e-area, verify and attempt entries carry a string id **Actual** slice, milestone, e2e, e2e-area, verify and attempt entries carry a string id (observed)
- **Spec source:** ADR bd10 (branch and id for S-005 and S-027) · **Run:** `S010_WT=<worktree of sdlc/S-010-v0-contract-0> node --test .sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs --test-name-pattern="id key presence"`
- Evidence (log): kinds without id

```text
run and state entries have no id key (parse gives none); see seeds
```

</details>

## How it was attacked
One security session ran in round 0. Its charters were: hostile branch names and arguments (R-025, R-094); numeric tails with Unicode digits (R-094); ref listing with tag, remote-ref and namespace clashes (R-025); and odd or non-git repo arguments (R-025). The threat model says branch names in a repo and the CLI arguments are untrusted, and the operator who runs the CLI is trusted. The session tried 121 attacks. 103 held, 0 broke and 18 were out of scope. The contract profile also ran an attack corpus of 11 families (650 invocations of `--repo`, `--kind` and `--format`). Each gave one JSON object, exit 0 or 2 and an unchanged tree.

<details>
<summary>Attack table (121 attacks, sample of 3 rows)</summary>

| input | expected | observed | result |
|---|---|---|---|
| `list --repo <fixture> --kind slice` with a tag, remote refs and a lookalike namespace | Only real loop branches listed | exit 0; only `sdlc/S-001` and `sdlc/S-007` | held |
| `list` with a tag named like a branch | The branch is neither hidden nor changed | branch listed as before | held |
| `list` with `sdlc/run-١` (Arabic-Indic digit) | No crash; one JSON object | exit 0; listed as run 1 (see seeds) | held |

The full table has 121 rows in [security-0.json](../../slices/S-010/verification/r0/security-0.json). The transcripts are in [security-0-attacks.jsonl](../../slices/S-010/verification/r0/logs/security-0-attacks.jsonl).

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier, review lens or Gate run found a blocking defect in round 0. No fix round ran.

| Seed | Found by | File |
|---|---|---|
| Subprocess pattern duplicated (`_git` repeats the `validate_format` pattern) | architecture review | `skills/sdlc/branches.py` |
| Constant placement (`NUMERIC_SORT_KINDS` mid-file) | architecture review | `skills/sdlc/branches.py` |
| T-R-094b repeats T-R-094a | test-quality review | `skills/sdlc/test/branches.test.mjs` |
| list ignores a checked-out unborn branch | cli verifier | `skills/sdlc/branches.py` |
| testkit: fixtures with case-only branch names fail on case-insensitive file systems | cli verifier | `skills/sdlc/test/testkit/cli-runner.mjs` |
| Non-ASCII Unicode digits count as digits in loop branch names | contract verifier | `skills/sdlc/branches.py` |
| run and state entries have no id key | contract verifier | `skills/sdlc/branches.py` |
| Malformed attempt names list as slice | contract verifier | `skills/sdlc/branches.py` |
| list_kind returns [] for an unknown kind through the API | contract verifier | `skills/sdlc/branches.py` |
| argparse accepts abbreviated flags and a repeated --kind | contract verifier | `skills/sdlc/branches.py` |
| list uses %(refname), not the spec's %(refname:short) | contract verifier | `skills/sdlc/branches.py` |
| testkit: no helper to create many refs in one repo | contract verifier | `skills/sdlc/test/testkit/cli-runner.mjs` |
| parse accepts non-ASCII digits in run and attempt tails | security verifier | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: cli-runner, property and attack-corpus, all in `skills/sdlc/test/testkit/`.
- Plan: [plan-r0.json](../../slices/S-010/verification/plan-r0.json) and [plan-r0.md](../../slices/S-010/verification/plan-r0.md).
- Profile evidence, round 0: [cli-0](../../slices/S-010/verification/r0/cli-0.md), [contract-0](../../slices/S-010/verification/r0/contract-0.md), [security-0](../../slices/S-010/verification/r0/security-0.md).
- Core verifiers: [spec fidelity](../../slices/S-010/verify-spec-fidelity-r0.md), [regression](../../slices/S-010/verify-regression-r0.md).
- Reviews: [architecture](../../slices/S-010/review-architecture-r0.md), [security](../../slices/S-010/review-security-r0.md), [test quality](../../slices/S-010/review-test-quality-r0.md). Gate: [gate-r0](../../slices/S-010/gate-r0.md).
- Repo tests: `skills/sdlc/test/branches.test.mjs:1304` (T-R-025a) to `:1400` (T-R-094b). Decisions: ADR 7c1e, bd10 and e3f4.
- Missing sources: `failures.md` does not exist, because the slice never failed. The `ui`, `http-api`, `async`, `concurrency`, `data` and `i18n` profiles could not observe this slice and did not run.
