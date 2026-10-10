# S-023 · state-write.py threads the format through its remaining paths
Verdict: RELEASED
Commit under test: c592bd9 (verified; branch head fb7d4e8 adds state commits only) · Rounds: 2 (round 0, round 1) · Attempts: 1 · Risk: medium · Written: 2026-10-10 UTC

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 4 | 29 | 29 | 0 | 0 | 0 / 0 | 12 |

## Summary
The slice makes `main()` in `skills/sdlc/state-write.py` derive the branch format once from `config.json`. `main()` passes it to `patch_slice`, which now requires a `fmt` argument. The slice also adds `slice_side_branches(repo, fmt, slice_id)`, which lists the verify and attempt branches of one slice through `branches.parse`. Three verifiers ran in round 0: `cli`, `contract` and `security`. They ran the real scripts in scratch git repos and compared the result with the parent commit. They found no blocking defect. Round 1 followed one review request: promote two verifier tests into the repo suite. The Gate and both core verifiers held. No case is blocked.

## Open risks
- R-083 holds as a helper plus a source test only. `ship-prune` and `collect-verification` do not exist in the code. ADR-20261010-043504-decision-judge-S-023-770f accepts this. The loop-economy slices must call `slice_side_branches` and hold no local regex.
- `slice_side_branches` has no caller yet. It deletes and writes nothing.
- Under `feature/{name:lower}`, `branches.parse` also matches upper-case tails. `feature/S-001-attempt-3` counts as a side branch of S-001. The plan note expected no match. The branch-format spec does not forbid it. A future prune command would select such a look-alike branch.
- `base-branch` with an invalid `branchFormat` exits 0 when the answer never builds a branch name. The behavior is the same before the change.
- A `config.json` that holds a JSON array, or is a directory, gives a Python traceback. The behavior is the same before the change.
- `patch-slice` with a format that git refuses (`has space/{name}`, `a//{name}`, `{name}.lock`) fails with a raw git message. The failure is clean: exit 2, `ok:false`.
- Two repo tests tie to internals: they spy on `format_of` and `patch_slice`, and one greps the source text. They match the spec guard, but unrelated source text can break the grep test.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-059 | "A `fmt` argument is threaded from `main()` where `config` is read, with `load_format(repo)` as the fallback." | VS-1, VS-2 | TC-cli-1 to TC-cli-8, TC-contract-1 to TC-contract-6 | pass |
| R-083 | "Whichever of the two specs lands second adapts the other's matching to `branches.parse`." | VS-3, VS-4 | TC-contract-7 to TC-contract-13, TC-security-1 to TC-security-8 | pass |

## Scenarios

### VS-1 · patch-slice names the slice branch from the configured format
Profiles: cli, contract. Risk: a wrong format would put the slice branch under the wrong name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | A custom format names `feature/PROJ-1-S-001` and checks it out | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:21` |
| TC-cli-2 | A lowercase format names `feature/s-001` | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:27` |
| TC-cli-3 | No, empty, null, numeric or list `branchFormat` falls back to `sdlc/S-001` | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:33` |
| TC-cli-4 | An invalid `branchFormat` gives exit 2, `ok:false`, no traceback | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:46` |
| TC-cli-5 | Missing or invalid config gives the same error as before the change | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:54` |
| TC-contract-1 | `patch_slice` requires `fmt`; a call without it raises `TypeError` | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:32` |
| TC-contract-2 | A `fmt` argument that differs from config wins | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:55` |
| TC-contract-3 | Six config shapes give the expected branch | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:77` |
| TC-contract-4 | 16 bad-config pairs match the error before the change | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:106` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-1 · patch-slice names the branch from a custom format · PASS
- **Given** `branchFormat` `feature/PROJ-1-{name}` **When** `state-write.py patch-slice --repo R --slice S-001` with `{"phase":"tests"}` **Then** exit 0, branch `feature/PROJ-1-S-001`, checked out.
- **Expected** as Then **Actual** exit 0, branch `feature/PROJ-1-S-001`, checked out.
- **Spec source:** R-059 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`
```console
head custom 0 {"ok": true, "branch": "feature/PROJ-1-S-001", "commit": "ed21a11"}
exit 0
```
Full log: [cli-0-run.log](../../slices/S-023/verification/r0/logs/cli-0-run.log)

#### TC-cli-2 · patch-slice under a lowercase format · PASS
- **Given** `feature/{name:lower}` **When** `patch-slice S-001` **Then** branch `feature/s-001`.
- **Expected** as Then **Actual** branch `feature/s-001`.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-cli-1
```console
head lower 0 {"ok": true, "branch": "feature/s-001", "commit": "0c5fd87"}
exit 0
```

#### TC-cli-3 · patch-slice falls back to the default format · PASS
- **Given** no `branchFormat`, or an empty, null, numeric or list value **When** `patch-slice S-001` **Then** branch `sdlc/S-001` each time.
- **Expected** as Then **Actual** as Then.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-cli-1
```console
head bf "" 0 {"ok": true, "branch": "sdlc/S-001"}
head bf 5 0 {"ok": true, "branch": "sdlc/S-001"}
exit 0
```

#### TC-cli-4 · Invalid branchFormat gives a clean Fail from patch-slice · PASS
- **Given** `bad{x}`, `x`, `has space/{name}`, `a//{name}`, `{name}.lock` **When** `patch-slice S-001` **Then** non-zero exit, JSON `ok:false`, no traceback.
- **Expected** as Then **Actual** exit 2, `ok:false`, no traceback; output equals the output before the change.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-cli-1
```console
head badfmt "bad{x}" 2 {"ok": false, "error": "the branch format 'bad{x}' must hold exactly one {name} or {name:lower}, found 0"}
exit 2
```

#### TC-cli-5 · Missing, invalid and no-.sdlc config give the same error as before · PASS
- **Given** `config.json` absent, invalid JSON, or a repo without `.sdlc` **When** `patch-slice S-001` on the head build and on parent commit 4a15c07 **Then** identical exit code and message.
- **Expected** as Then **Actual** identical: exit 2 with "missing <repo>/.sdlc/config.json", "... is not valid JSON ..." and "no .sdlc/ in <repo>".
- **Spec source:** R-059 acceptance · **Run:** same command as TC-cli-1
```console
head missingConfig 2 {"ok": false, "error": "missing <repo>/.sdlc/config.json"}
base missingConfig 2 {"ok": false, "error": "missing <repo>/.sdlc/config.json"}
exit 2
```

#### TC-contract-1 · Signatures · PASS
- **Given** a scratch git repo with `.sdlc` state **When** the functions load through the module entry **Then** signatures match the plan and a call without `fmt` raises `TypeError`.
- **Expected** as Then **Actual** `patch_slice (repo, slice_id, patch, fmt)`, `slice_side_branches (repo, fmt, slice_id)`, `format_of (repo, config)`; the call without `fmt` raised `TypeError`.
- **Spec source:** R-059 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`
- Evidence: [contract-0.md](../../slices/S-023/verification/r0/contract-0.md)

#### TC-contract-2 · A fmt argument that differs from config wins · PASS
- **Given** config with one format and a different `fmt` argument **When** `patch_slice(repo, id, patch, fmt)` runs **Then** the branch follows the argument.
- **Expected** `other/s-001` **Actual** `other/s-001`, checked out. `format_of` is not called inside `patch_slice`.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-contract-1

#### TC-contract-3 · Six config shapes · PASS
- **Given** custom, lowercase, default, absent, empty and non-string `branchFormat` **When** `patch-slice` runs **Then** `feature/PROJ-123-S-001`, `feature/s-001`, and `sdlc/S-001` four times.
- **Expected** as Then **Actual** all six as expected.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-contract-1

#### TC-contract-4 · Bad or missing config: same error as before · PASS
- **Given** eight configs, run through `patch-slice` and `base-branch` **When** compared with parent commit 38e600f **Then** 16 pairs identical.
- **Expected** as Then **Actual** identical. Two tracebacks (non-object JSON, `config.json` a directory) occur before and after the change.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-contract-1

</details>

### VS-2 · base-branch uses the same single format derivation
Profiles: cli, contract. Risk: a second derivation path could disagree with `patch-slice` on the branch name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | `base-branch` follows a lowercase format and changes nothing | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:66` |
| TC-cli-7 | A bad format gives a clean Fail when the answer needs it | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:81` |
| TC-cli-8 | A bad or absent `config.json` gives a clean Fail | PASS | `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:97` |
| TC-contract-5 | `main` calls `format_of` once per run; `load_format` is the fallback | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:127` |
| TC-contract-6 | `base-branch` under lowercase format and fallback | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:177` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-6 · base-branch uses the custom lowercase format and changes nothing · PASS
- **Given** `feature/{name:lower}`; S-001 awaiting-merge on `feature/s-001`; S-002 depends on it **When** `base-branch --slice S-002` **Then** branch `feature/s-001`; file tree and refs unchanged.
- **Expected** as Then **Actual** branch `feature/s-001`; tree unchanged. Stack mode gives `feature/m-1`. The default format gives `sdlc/S-001`.
- **Spec source:** R-059 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs`

#### TC-cli-7 · base-branch with a bad branchFormat is a clean Fail when the answer needs the format · PASS
- **Given** `bad{x}`, `zz`, `{name}{name}`; S-002 depends on an awaiting-merge S-001 **When** `base-branch --slice S-002` **Then** non-zero exit, `ok:false`, no traceback.
- **Expected** as Then **Actual** exit 2, `ok:false`, no traceback; same as before the change.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-cli-6

#### TC-cli-8 · base-branch with a bad or absent config.json is a clean Fail · PASS
- **Given** `config.json` absent or invalid JSON **When** `base-branch --slice S-001` **Then** exit 2, `ok:false`, no traceback.
- **Expected** as Then **Actual** as Then.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-cli-6

#### TC-contract-5 · main calls format_of once per run · PASS
- **Given** a scratch repo **When** `main` runs `patch-slice` and `base-branch` with `format_of` and `load_format` spied **Then** `format_of` runs once; `load_format` runs 0 times with `branchFormat` and once without.
- **Expected** as Then **Actual** as expected.
- **Spec source:** R-059 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

#### TC-contract-6 · base-branch under lowercase format and fallback · PASS
- **Given** an awaiting-merge dependency **When** `base-branch` runs under each format **Then** `feature/s-001` and `sdlc/S-001`.
- **Expected** as Then **Actual** as expected.
- **Spec source:** R-059 acceptance · **Run:** same command as TC-contract-5

</details>

### VS-3 · slice_side_branches lists only the verify and attempt branches of one slice
Profiles: contract, security. Risk: a loose match would select the branches of another slice for a later prune.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | 1500 generated runs match a reference model from the spec | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:205` |
| TC-contract-8 | Spec examples return exactly the two tails of S-001 | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:245` |
| TC-contract-9 | 134 hostile slice ids return `[]` or `Fail`, never an uncaught exception | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:255` |
| TC-contract-10 | Refs stay unchanged; each call returns a fresh list | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:284` |
| TC-security-1 | Only verify and attempt tails of S-001, sorted | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:21` |
| TC-security-2 | S-0011 and S-010 do not leak into S-001, and the reverse | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:28` |
| TC-security-3 | A custom prefix-and-suffix format matches only suffixed names | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:34` |
| TC-security-4 | Lowercase format folds case; plain format does not | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:40` |
| TC-security-5 | Hostile ids from 12 corpus families raise nothing and match nothing unrelated | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:48` |
| TC-security-6 | Regex metacharacters in the id match only themselves | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:65` |
| TC-security-7 | A refused id leaves the repo tree unchanged | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:73` |
| TC-security-8 | An invalid format or a missing repo gives a clean `Fail` | PASS | `.sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:80` |

<details>
<summary>Case detail (12 cases)</summary>

#### TC-contract-7 · Property against a reference model · PASS
- **Given** six formats, eight slice ids (including S-001, S-0011, S-010), foreign and look-alike branches **When** `slice_side_branches` runs **Then** the result equals the model, sorted and deterministic.
- **Expected** as Then **Actual** 1500 runs, 0 mismatches.
- **Spec source:** R-083 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`
```text
property: slice_side_branches vs reference model · seed=2643624506 · runs=1500 · result=pass
```

#### TC-contract-8 · Spec examples · PASS
- **Given** `feature/PROJ-1-{name}` and `feature/{name:lower}` with a plain slice branch, other slices and a foreign prefix **When** the helper runs for S-001 **Then** exactly the two tails.
- **Expected** as Then **Actual** as expected.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-contract-7

#### TC-contract-9 · Attack corpus as slice id · PASS
- **Given** 134 corpus entries in 12 families, non-string ids, a non-repo and a bad `fmt` **When** the helper runs **Then** `[]` or `Fail`, never an uncaught exception.
- **Expected** as Then **Actual** all return `[]` or `Fail`; non-string ids return without exception.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-contract-7

#### TC-contract-10 · Purity · PASS
- **Given** a scratch repo **When** the helper runs twice **Then** refs are identical and the lists are not shared.
- **Expected** as Then **Actual** as expected.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-contract-7

#### TC-security-1 · Only verify and attempt tails of S-001, sorted · PASS
- **Given** the default format and 18 branches (plain, S-0011, S-010, `other/`, `xsdlc/`, confusables) **When** the helper runs for S-001 **Then** only the verify and attempt tails of S-001, sorted.
- **Expected** as Then **Actual** as Then.
- **Spec source:** R-083 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs`

#### TC-security-2 · Prefix isolation · PASS
- **Given** the same repo **When** the helper runs for S-001, S-0011 and S-010 **Then** each list is its own.
- **Expected** as Then **Actual** exact per-slice lists.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1

#### TC-security-3 · Prefix-and-suffix format · PASS
- **Given** `feature/PROJ-1-{name}-wip` **When** the helper runs **Then** only names that carry the suffix match.
- **Expected** as Then **Actual** as Then.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1

#### TC-security-4 · Case rule · PASS
- **Given** `f/{name:lower}` and `f/{name}` **When** the helper runs **Then** the lowercase format matches `s-001` and `S-001`; the plain format matches `S-001` only.
- **Expected** as Then **Actual** as expected.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1

#### TC-security-5 · Hostile slice ids · PASS
- **Given** every value of 12 corpus families as slice id **When** the helper runs **Then** a return or `Fail`, never an exception.
- **Expected** as Then **Actual** no exception, no unrelated match.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1
- Evidence: [security-0-test.txt](../../slices/S-023/verification/r0/logs/security-0-test.txt)

#### TC-security-6 · Regex metacharacters in the slice id · PASS
- **Given** `S-a.b`, `S-.*`, empty **When** the helper runs **Then** exact match only.
- **Expected** as Then **Actual** exact match only.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1

#### TC-security-7 · Refusal leaves the repo tree unchanged · PASS
- **Given** a traversal-like id **When** the helper runs **Then** exit 0 and `treeUnchanged`.
- **Expected** as Then **Actual** `treeUnchanged` true.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1

| table.column | before | after |
|---|---|---|
| git refs and tree | recorded | identical |

#### TC-security-8 · Invalid format and missing repo · PASS
- **Given** no placeholder, double placeholder, `../` prefix, a missing directory **When** the helper runs **Then** a return or `Fail`.
- **Expected** as Then **Actual** no raw exception.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-security-1

</details>

### VS-4 · verify and attempt names are matched only through branches.parse
Profiles: contract. Risk: a local regex would copy the casing rule and drift from `branches.py`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-11 | Matching goes through `branches.parse` with `ids=[slice_id]` | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:300` |
| TC-contract-12 | The source holds no pattern for `-attempt-` or `-v<digits>` | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:326` |
| TC-contract-13 | The casing rule comes from `branches.py` alone | PASS | `.sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs:338` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-11 · Matching goes through branches.parse · PASS
- **Given** a spy and a stub on `branches.parse` **When** the helper runs **Then** the spy sees `ids ['S-001']` for every branch, and the stub decides the output.
- **Expected** as Then **Actual** as expected.
- **Spec source:** R-083 acceptance · **Run:** `node --test .sdlc/slices/S-023/verification/r0/tests/contract-0/state-write.verify-contract.test.mjs`

#### TC-contract-12 · No local pattern in the source · PASS
- **Given** `state-write.py` **When** the source is searched **Then** no hit for `-attempt-` or `-v<digits>`, and `slice_side_branches` uses no `re`.
- **Expected** as Then **Actual** no hit. Other `re` uses in the file are unrelated.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-contract-11
- The repo suite guards this at `skills/sdlc/test/scripts.test.mjs:2202`.

#### TC-contract-13 · Casing rule comes from branches.py · PASS
- **Given** `feature/{name:lower}` and `feature/{name}` **When** the helper runs **Then** the results follow `branches.parse`.
- **Expected** as Then **Actual** `feature/{name:lower}` matches `S-001-attempt-3`, `S-001-v1-cli-0`, `s-001-attempt-2` and `s-001-v0-cli-0`. `feature/{name}` matches only the S-001 names.
- **Spec source:** R-083 acceptance · **Run:** same command as TC-contract-11

</details>

## How it was attacked
One security session ran in round 0. The charter: explore `slice_side_branches` to find a branch outside the named slice's verify and attempt tails (R-083 acceptance). The threat-model boundary is the slice id and the branch names that reach `branches.parse` and `git for-each-ref`. Eight attacks ran. All eight held. None broke. None were out of scope. The code runs git with a fixed argument list and no shell. The security reviews of round 0 and round 1 found it clean.

<details>
<summary>Attack table (8 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| AT-1 default format, 18 branches including plain, S-0011, S-010, `other/`, `xsdlc/`, confusables | only verify and attempt tails of S-001, sorted | only verify and attempt tails of S-001, sorted | held |
| AT-2 same repo | S-0011 and S-010 results are their own | exact per-slice lists | held |
| AT-3 `feature/PROJ-1-{name}-wip` | only names with the suffix | matched only suffixed names | held |
| AT-4 `f/{name:lower}` and `f/{name}` | lowercase folds case; plain does not | as expected | held |
| AT-5 every value of 12 corpus families as slice id | return or `Fail`, no unrelated match | no exception, no unrelated match | held |
| AT-6 `S-a.b`, `S-.*`, empty | exact match only | exact match only | held |
| AT-7 traversal-like id | exit 0, `treeUnchanged` | `treeUnchanged` true | held |
| AT-8 no placeholder, double placeholder, `../` prefix, missing directory | return or `Fail` | no raw exception | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier, core verifier or reviewer filed one.
- **Review request, round 1:** the architecture review asked to pin two behaviors in the repo suite: id-prefix isolation and the case rule of `slice_side_branches`. Commit 289e293 promoted both tests. They now guard at `skills/sdlc/test/scripts.test.mjs:2172` and `skills/sdlc/test/scripts.test.mjs:2191`.

| Seed | Found by | File |
|---|---|---|
| `base-branch` accepts an invalid `branchFormat` when the answer never uses the format | cli verifier | `skills/sdlc/state-write.py` |
| A `config.json` that is a JSON array gives a Python traceback | cli verifier | `skills/sdlc/state-write.py` |
| `patch-slice` with a format that git refuses fails late with a raw git message | cli verifier | `skills/sdlc/state-write.py` |
| A lowercase format also matches upper-case tails | contract verifier | `skills/sdlc/branches.py` |
| Pre-existing tracebacks for a non-object or directory `config.json` | contract verifier | `skills/sdlc/state-write.py` |
| `slice_side_branches` has no caller | contract verifier, architecture review | `skills/sdlc/state-write.py` |
| The `for-each-ref` loop repeats `branches.list_kind` | architecture review | `skills/sdlc/state-write.py` |
| `head_is` fallback in `next-action.py` is likely dead code | architecture review | `skills/sdlc/next-action.py` |
| `config.json` is read twice on `patch-slice` | architecture review | `skills/sdlc/state-write.py` |
| Tests spy on internals instead of behavior | test review | `skills/sdlc/test/scripts.test.mjs` |
| Source-text grep test can break on unrelated text | test review | `skills/sdlc/test/scripts.test.mjs` |

## Appendix
- Toolkit tools used: `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `property` (`skills/sdlc/test/testkit/property.mjs`), `attack-corpus` (`skills/sdlc/test/testkit/attack-corpus.mjs`).
- Plans: [plan-r0](../../slices/S-023/verification/plan-r0.md), [plan-r1](../../slices/S-023/verification/plan-r1.md).
- Round 0 evidence: [cli-0](../../slices/S-023/verification/r0/cli-0.md), [contract-0](../../slices/S-023/verification/r0/contract-0.md), [security-0](../../slices/S-023/verification/r0/security-0.md). Logs are in [r0/logs](../../slices/S-023/verification/r0/logs/).
- Core verifiers: [spec-fidelity r0](../../slices/S-023/verify-spec-fidelity-r0.md), [spec-fidelity r1](../../slices/S-023/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-023/verify-regression-r0.md), [regression r1](../../slices/S-023/verify-regression-r1.md).
- Reviews: [architecture r0](../../slices/S-023/review-architecture-r0.md), [security r0](../../slices/S-023/review-security-r0.md), [security r1](../../slices/S-023/review-security-r1.md).
- Gate: [gate-r0](../../slices/S-023/gate-r0.md): `npm test` passed, 715 passed, 0 failed, 1 skipped, in 94 s. Receipt: [suite-receipt.json](../../slices/S-023/verification/suite-receipt.json).
- Round 1 ran no profile verifiers. It ran the regression and spec-fidelity verifiers only. Missing source: no architecture review file exists for round 1.
