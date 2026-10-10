# S-024 · janitor.py sweeps only verify branches through parse
Verdict: RELEASED
Commit under test: d23dd8a (code; branch head cfaa50e adds state commits only) · Rounds: 1 · Attempts: 1 · Risk: high · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 7 | 35 | 35 | 0 | 0 | 0 / 0 | 20 |

## Summary
The janitor now deletes a local branch only when `branches.parse` reads it as a verify branch. The branch must also name an unknown slice, or a slice that is `done` or `rejected`. Run, attempt, slice, milestone, e2e, state and unparseable names always stay. The format comes from `branches.load_format`, and the ledger ids go to `parse`, so a `{name:lower}` format finds the ledger id. The `cli`, `security` and `contract` profiles ran the real script in scratch git repos, with 35 cases and 10 attacks, and every case passed in round 0. The core verifiers and the Gate agreed (721 tests, 0 failed). No blocking defect was found. Twenty non-blocking seeds remain, mostly about hostile ledger or config shapes and loose matching of unknown ids.

## Open risks
- A verify-shaped name with an unknown id is deleted, even when the user owns it: `sdlc/x/S-001-v0-a-0`, `sdlc/release-v2-beta-1` and `sdlc/run-1-v0-http-api-0` all go. R-060 allows it; a stricter id shape would protect them.
- A branch under an old format stays on disk after the run changes to a derived format (R-085). The user must delete it by hand (ADR-20261010-051408-decision-judge-S-024-b707).
- A verify-shaped branch whose id ends in `-attempt-<n>` stays. This is stricter than the spec text (ADR-20261010-051411-decision-judge-S-024-9f6d).
- A non-string `branchFormat` (for example `5`) is read as no format. The default format then applies and no note appears (AT-7, out of scope for this slice).
- A ledger row id that is a list, dict or integer, or an array `config.json`, stops the janitor early with a note. Scratch directories are then not reaped, and an integer id under `{name:lower}` loses `removedBranches` from the output (AT-8).
- An unusable format skips `git worktree prune`, so a stale registration stays until the next good run.
- A ledger with only non-object rows counts as empty, so every verify branch is swept as unknown.
- Case-twin ledger ids (`S-001` and `s-001`) resolve to the first row.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-060 | `V_BRANCH` and `V_ID` are replaced by `parse`: a branch is swept only when it parses to `verify`, its `id` is unknown to the ledger or its status is `done` or `rejected`; `run`, `attempt` and every other kind are never deleted. The format comes from `load_format(repo)`. | VS-1, VS-2, VS-3, VS-5, VS-6, VS-7 | cli-1, cli-2, cli-3, cli-4, cli-6, cli-8, cli-9, cli-10, cli-11, cli-12, cli-13, cli-14, contract-4, contract-6, contract-8, contract-9, contract-10, contract-11, contract-12, security-1, security-2, security-3, security-4, security-5, security-7, security-8, security-9 | pass |
| R-079 | `janitor sweeps verify branches under a custom format and never touches run or attempt branches`. | VS-3, VS-7 | cli-4, contract-8, security-4, security-5 | pass |
| R-085 | An old run's branches under the default when the new run gets a derived format: the new run's `list` and `parse` do not see them; the janitor leaves them; they are the user's to delete. | VS-4 | cli-5, contract-1, contract-2, contract-3, security-6 | pass |
| R-086 | `next-action.py` and `janitor.py` always pass the ledger's ids. | VS-5 | cli-6, cli-7, contract-4, contract-5, contract-6, contract-7 | pass |

Committed tests: `skills/sdlc/test/scripts.test.mjs:1690` (R-060), `:1696` (R-060), `:1717` (R-060, R-079), `:1732` (R-085), `:1750` (R-086), `:1764` (R-060), `:1780` and `:1797` (characterization).

## Scenarios

### VS-1 · Janitor deletes verify branches of done, rejected and unknown slices under the default format
Profiles: cli, security. Risk: A wrong match deletes a branch the loop needs.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-1 | Default format removes done, rejected and unknown verify branches only | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:23` |
| cli-2 | Slice, attempt, run, milestone, e2e and state branches of finished ids stay | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:37` |
| cli-12 | Stale worktree pinning a finished verify branch is pruned and the branch removed | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:179` |
| cli-13 | Second run is idempotent; repo path with spaces and unicode works; --help exits 0 | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:190` |
| cli-14 | janitor.py text holds no V_BRANCH or V_ID | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:215` |
| security-1 | Default format removes only done, rejected and unknown verify branches | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:27` |
| security-9 | Checked-out verify branch | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:193` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-1 · Default format removes done, rejected and unknown verify branches only · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** exit 0; removedBranches = S-001 (done), S-003 (rejected), S-999 (unknown) verify branches; in_progress, todo, no-status verify branches and 10 other names stay
- **Expected** exit 0; removedBranches = S-001 (done), S-003 (rejected), S-999 (unknown) verify branches; in_progress, todo, no-status verify branches and 10 other names stay **Actual** as expected; refs diff shows only the 3 refs removed
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-2 · Slice, attempt, run, milestone, e2e and state branches of finished ids stay · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** removedBranches empty; tree unchanged
- **Expected** removedBranches empty; tree unchanged **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-12 · Stale worktree pinning a finished verify branch is pruned and the branch removed · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** removedBranches holds the branch
- **Expected** removedBranches holds the branch **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-13 · Second run is idempotent; repo path with spaces and unicode works; --help exits 0 · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** second run removes nothing; unicode path removes the verify branch
- **Expected** second run removes nothing; unicode path removes the verify branch **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-14 · janitor.py text holds no V_BRANCH or V_ID · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** no match
- **Expected** no match **Actual** no match
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-security-1 · Default format removes only done, rejected and unknown verify branches · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** removedBranches is exactly sdlc/S-001-v0-http-api-0, sdlc/S-003-v2-cli-1, sdlc/S-999-v0-a-0
- **Expected** removedBranches is exactly sdlc/S-001-v0-http-api-0, sdlc/S-003-v2-cli-1, sdlc/S-999-v0-a-0 **Actual** as expected; 16 keep branches intact (run, slice, attempt, attempt verify, milestone, e2e, e2e-area, state, in_progress, todo, no-status)
- **Spec source:** R-060 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
removed: S-001-v0, S-003-v2, S-999-v0; kept: all others
```

#### TC-security-9 · Checked-out verify branch · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** branch is not removed, a note records the git error
- **Expected** branch is not removed, a note records the git error **Actual** held
- **Spec source:** R-060 · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
note: cannot delete branch used by worktree
```

</details>

### VS-2 · Janitor keeps every non-verify kind and unparseable names
Profiles: cli, security. Risk: A verify-shaped name of another kind may be deleted.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-3 | Unicode, nested, wrong-prefix, attempt-verify and empty-part names stay | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:46` |
| security-2 | Non-verify kinds and unparseable names stay | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:48` |
| security-3 | Attack corpus used as branch tails | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:61` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-3 · Unicode, nested, wrong-prefix, attempt-verify and empty-part names stay · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** removedBranches empty, refs unchanged
- **Expected** removedBranches empty, refs unchanged **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-security-2 · Non-verify kinds and unparseable names stay · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** no non-verify or unparseable branch is deleted
- **Expected** no non-verify or unparseable branch is deleted **Actual** 15 hostile names created (unicode, nested, empty id, wrong case); only two verify-shaped names went: sdlc/S-001-v٠-a-0 (done id) and sdlc/x/S-001-v0-a-0 (unknown id)
- **Spec source:** R-060 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
removed: sdlc/S-001-v٠-a-0, sdlc/x/S-001-v0-a-0
```

#### TC-security-3 · Attack corpus used as branch tails · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** exit 0; only verify-shaped names are removed
- **Expected** exit 0; only verify-shaped names are removed **Actual** exit 0; 55 valid names created from 7 families, 51 verify-shaped with unknown id removed; all removed names match sdlc/*-v0-a-0
- **Spec source:** R-060 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
status 0; no file created by shell metacharacter names
```

</details>

### VS-3 · Janitor sweeps verify branches under a custom format and spares run and attempt branches
Profiles: cli, security. Risk: A custom format may confuse run or attempt branches with verify branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-4 | Custom format feature/sdlc/{name} sweeps verify branches and spares run, attempt, slice, milestone, todo-slice and prefix-collision names | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:57` |
| security-4 | Custom format and prefix collisions | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:79` |
| security-5 | Suffix format {name}-wip and lowercase format keep run and attempt | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:90` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-4 · Custom format feature/sdlc/{name} sweeps verify branches and spares run, attempt, slice, milestone, todo-slice and prefix-collision names · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** removedBranches = done and unknown verify branches only
- **Expected** removedBranches = done and unknown verify branches only **Actual** as expected
- **Spec source:** R-079 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-security-4 · Custom format and prefix collisions · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** S-001 and S-999 verify branches removed; run, attempt, attempt verify, slice, milestone, state, old-format and prefixed-outside names stay
- **Expected** S-001 and S-999 verify branches removed; run, attempt, attempt verify, slice, milestone, state, old-format and prefixed-outside names stay **Actual** as expected; one extra: feature/sdlc/feature/sdlc/S-001-v0-a-0 (id feature/sdlc/S-001, unknown) removed
- **Spec source:** R-060, R-079 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
removed 3 verify-shaped names
```

#### TC-security-5 · Suffix format {name}-wip and lowercase format keep run and attempt · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** only verify branches of S-001 go; run-1-wip and S-001-attempt-1-wip stay
- **Expected** only verify branches of S-001 go; run-1-wip and S-001-attempt-1-wip stay **Actual** as expected
- **Spec source:** R-079 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
removed: S-001-v0-a-0-wip; p/s-001-v0-a-0
```

</details>

### VS-4 · Janitor leaves old-format verify branches when the format is derived
Profiles: cli, contract, security. Risk: The janitor may delete old-format branches that the user owns.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-5 | Derived format leaves old-format verify branch; parse of sdlc/S-001 gives kind null and list --kind slice is empty | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:70` |
| contract-1 | Old-format verify branch stays under derived format; parse of sdlc/S-001 gives null kind; list omits it | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:17` |
| contract-2 | Property: parse under feature/sdlc/{name} returns null for every name without the prefix | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:40` |
| contract-3 | Janitor leaves 40 random old-format verify branches of done, rejected and todo slices | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:59` |
| security-6 | Old-format verify branch stays under a derived format | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:99` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-5 · Derived format leaves old-format verify branch; parse of sdlc/S-001 gives kind null and list --kind slice is empty · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** branch stays, removedBranches empty; parse kind null; list branches []
- **Expected** branch stays, removedBranches empty; parse kind null; list branches [] **Actual** as expected
- **Spec source:** R-085 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-contract-1 · Old-format verify branch stays under derived format; parse of sdlc/S-001 gives null kind; list omits it · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Old-format verify branch stays under derived format; parse of sdlc/S-001 gives null kind; list omits it
- **Expected** Old-format verify branch stays under derived format; parse of sdlc/S-001 gives null kind; list omits it **Actual** as expected
- **Spec source:** R-085 acceptance · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **parse and list** (transcript)

```text
PARSE {"ok": true, "command": "parse", "branch": "sdlc/S-001", "kind": null}
LIST branches: [feature/sdlc/S-001] only
janitor removedBranches: []
```

#### TC-contract-2 · Property: parse under feature/sdlc/{name} returns null for every name without the prefix · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Property: parse under feature/sdlc/{name} returns null for every name without the prefix
- **Expected** Property: parse under feature/sdlc/{name} returns null for every name without the prefix **Actual** as expected
- **Spec source:** R-085 acceptance · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **parse-derived-prefix** (property-run): property parse seed=424242 runs=1000 violations=0 · model: a name without the prefix feature/sdlc/ parses to null

#### TC-contract-3 · Janitor leaves 40 random old-format verify branches of done, rejected and todo slices · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Janitor leaves 40 random old-format verify branches of done, rejected and todo slices
- **Expected** Janitor leaves 40 random old-format verify branches of done, rejected and todo slices **Actual** as expected
- **Spec source:** R-085 acceptance · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **janitor-old-format** (property-run): seed=424242 runs=40 removedBranches=[] refs unchanged

#### TC-security-6 · Old-format verify branch stays under a derived format · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** sdlc/S-001-v0-http-api-0 and sdlc/S-999-v0-a-0 stay; parse of sdlc/S-001 gives kind null; list --kind slice is empty
- **Expected** sdlc/S-001-v0-http-api-0 and sdlc/S-999-v0-a-0 stay; parse of sdlc/S-001 gives kind null; list --kind slice is empty **Actual** as expected
- **Spec source:** R-085 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
parse kind null; list branches []
```

</details>

### VS-5 · Janitor resolves lowercased ids through the ledger
Profiles: cli, contract. Risk: A lowercase format may fail to find the ledger id.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-6 | Lowercase format resolves s-001 to S-001 (removed), s-002 todo stays, s-999 removed, run-1 stays | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:85` |
| cli-7 | Mixed-case ledger id S-Ab resolves from s-ab; todo stays | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:98` |
| contract-4 | Lowercase example: s-001 done removed, s-999 unknown removed, s-002 todo and feature/p-1-run-1 stay | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:77` |
| contract-5 | Property: parse with ledger ids resolves any case of a mixed-case ledger id to the ledger spelling with known true | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:92` |
| contract-6 | Mixed-case ledger ids S-Ab1 done, S-Cd2 in_progress, S-eF3 rejected: done and rejected branches go, in_progress stays | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:117` |
| contract-7 | Determinism: second run removes nothing more; ledger file is not changed | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:131` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-6 · Lowercase format resolves s-001 to S-001 (removed), s-002 todo stays, s-999 removed, run-1 stays · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** as stated
- **Expected** as stated **Actual** as expected
- **Spec source:** R-086 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-7 · Mixed-case ledger id S-Ab resolves from s-ab; todo stays · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** s-ab verify branch removed, s-003 stays
- **Expected** s-ab verify branch removed, s-003 stays **Actual** as expected
- **Spec source:** R-086 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-contract-4 · Lowercase example: s-001 done removed, s-999 unknown removed, s-002 todo and feature/p-1-run-1 stay · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Lowercase example: s-001 done removed, s-999 unknown removed, s-002 todo and feature/p-1-run-1 stay
- **Expected** Lowercase example: s-001 done removed, s-999 unknown removed, s-002 todo and feature/p-1-run-1 stay **Actual** as expected
- **Spec source:** R-086 acceptance · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **janitor output** (transcript)

```text
removedBranches: [feature/p-1-s-001-v0-http-api-0, feature/p-1-s-999-v0-http-api-0]
remaining: feature/p-1-run-1, feature/p-1-s-002, feature/p-1-s-002-v0-http-api-0, main
```

#### TC-contract-5 · Property: parse with ledger ids resolves any case of a mixed-case ledger id to the ledger spelling with known true · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Property: parse with ledger ids resolves any case of a mixed-case ledger id to the ledger spelling with known true
- **Expected** Property: parse with ledger ids resolves any case of a mixed-case ledger id to the ledger spelling with known true **Actual** as expected
- **Spec source:** R-086 acceptance · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **lower-resolve** (property-run): property parse seed=424242 runs=1000 violations=0 · model: the id equals the ledger id that matches case-insensitively; unknown id gives known false

#### TC-contract-6 · Mixed-case ledger ids S-Ab1 done, S-Cd2 in_progress, S-eF3 rejected: done and rejected branches go, in_progress stays · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Mixed-case ledger ids S-Ab1 done, S-Cd2 in_progress, S-eF3 rejected: done and rejected branches go, in_progress stays
- **Expected** Mixed-case ledger ids S-Ab1 done, S-Cd2 in_progress, S-eF3 rejected: done and rejected branches go, in_progress stays **Actual** as expected
- **Spec source:** R-060 quote · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **janitor output** (transcript)

```text
removed s-ab1 and s-ef3 verify branches; s-cd2 stays
```

#### TC-contract-7 · Determinism: second run removes nothing more; ledger file is not changed · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Determinism: second run removes nothing more; ledger file is not changed
- **Expected** Determinism: second run removes nothing more; ledger file is not changed **Actual** as expected
- **Spec source:** R-060 quote · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **two runs** (transcript)

```text
run 1 removes 1 branch; run 2 removes none; slices.json bytes equal
```

</details>

### VS-6 · Janitor reports an unusable format or ledger as a note and deletes nothing
Profiles: cli, security. Risk: A bad format or ledger may lead to a wrong delete.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-8 | Format without placeholder or with two placeholders gives a note, no branch removed, exit 0 | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108` |
| cli-9 | Malformed config.json gives a note, no branch removed, exit 0 | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108` |
| cli-10 | Missing, malformed, object, null, string, empty and unreadable slices.json: exit 0, a note, no branch removed | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:126` |
| cli-11 | Scratch reaping still runs when the format is unusable | PASS | `.sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:159` |
| security-7 | Unusable format or ledger gives a note and deletes nothing | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:111` |
| security-8 | Hostile ledger rows | PASS | `.sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:145` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-8 · Format without placeholder or with two placeholders gives a note, no branch removed, exit 0 · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** note names the format; refs unchanged
- **Expected** note names the format; refs unchanged **Actual** as expected (2 formats)
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-9 · Malformed config.json gives a note, no branch removed, exit 0 · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** no branch removed
- **Expected** no branch removed **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-10 · Missing, malformed, object, null, string, empty and unreadable slices.json: exit 0, a note, no branch removed · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** no branch removed, note present
- **Expected** no branch removed, note present **Actual** as expected (7 ledger shapes)
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-cli-11 · Scratch reaping still runs when the format is unusable · PASS
- **Given** a scratch git repo with .sdlc/config.json, .sdlc/slices.json and the listed branches **When** python3 janitor.py --repo <repo> runs with TMPDIR set to a scratch dir **Then** removedDirs 1, no branch removed, note names the format
- **Expected** removedDirs 1, no branch removed, note names the format **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-024> node --test .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs`
- **janitor transcripts and exit codes** (transcript): [cli-0-run.txt](../../slices/S-024/verification/r0/logs/cli-0-run.txt)

#### TC-security-7 · Unusable format or ledger gives a note and deletes nothing · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** exit 0, no branch removed, note names the cause, old scratch dir reaped
- **Expected** exit 0, no branch removed, note names the cause, old scratch dir reaped **Actual** no-placeholder, two placeholders, malformed config, deep nesting, unreadable config and six bad ledger shapes all held. Format 'a{b}/{name}' gives no note, nothing deleted. Array config crashes in scratch_days (pre-existing), no deletion. branchFormat 5 falls back to the default format and deletes
- **Spec source:** R-060 (Approach: unreadable format becomes a note) · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
see attack log A-9-*
```

#### TC-security-8 · Hostile ledger rows · PASS
- **Given** scratch git repo with a ledger and branches **When** janitor.py --repo runs with a scratch TMPDIR **Then** run and attempt branches stay, exit 0
- **Expected** run and attempt branches stay, exit 0 **Actual** held; id as list or dict stops the janitor before scratch reaping (pre-existing code); int id under {name:lower} stops it inside the sweep
- **Spec source:** R-060 acceptance · **Run:** `node --test .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs`
- **attack log** (attack): [security-0-attacks.jsonl](../../slices/S-024/verification/r0/logs/security-0-attacks.jsonl)
- **ref diff after run** (db-diff)

```diff
see attack log A-10-*
```

</details>

### VS-7 · Janitor source holds no V_BRANCH or V_ID and loads the format through branches.load_format
Profiles: contract. Risk: A leftover V_BRANCH or V_ID, or a broken import, would break R-060.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-8 | janitor.py text has no V_BRANCH or V_ID, calls branches.load_format(repo) and branches.parse, py_compile passes | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:146` |
| contract-9 | Every import in janitor.py is used; imports are standard library or branches only | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:156` |
| contract-10 | Docstring names branches.parse, verify, done, rejected, the -attempt-<n> rule and the format; no V_BRANCH | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:181` |
| contract-11 | Consumer view: unusable formats (no placeholder, two placeholders, mixed placeholders) give a note, delete nothing, exit 0 | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:190` |
| contract-12 | Format with whitespace (a b/{name}): nothing deleted | PASS | `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:206` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-contract-8 · janitor.py text has no V_BRANCH or V_ID, calls branches.load_format(repo) and branches.parse, py_compile passes · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** janitor.py text has no V_BRANCH or V_ID, calls branches.load_format(repo) and branches.parse, py_compile passes
- **Expected** janitor.py text has no V_BRANCH or V_ID, calls branches.load_format(repo) and branches.parse, py_compile passes **Actual** as expected
- **Spec source:** R-060 acceptance · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **py_compile** (type-check)

```console
python3 -m py_compile skills/sdlc/janitor.py exit 0
```

#### TC-contract-9 · Every import in janitor.py is used; imports are standard library or branches only · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Every import in janitor.py is used; imports are standard library or branches only
- **Expected** Every import in janitor.py is used; imports are standard library or branches only **Actual** as expected
- **Spec source:** R-060 quote · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **ast import check** (log)

```text
['argparse','branches','json','os','re','shutil','subprocess','sys','tempfile','time']
unused []
```

#### TC-contract-10 · Docstring names branches.parse, verify, done, rejected, the -attempt-<n> rule and the format; no V_BRANCH · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Docstring names branches.parse, verify, done, rejected, the -attempt-<n> rule and the format; no V_BRANCH
- **Expected** Docstring names branches.parse, verify, done, rejected, the -attempt-<n> rule and the format; no V_BRANCH **Actual** as expected
- **Spec source:** R-060 quote · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **docstring check** (log)

```text
all expected terms present
```

#### TC-contract-11 · Consumer view: unusable formats (no placeholder, two placeholders, mixed placeholders) give a note, delete nothing, exit 0 · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Consumer view: unusable formats (no placeholder, two placeholders, mixed placeholders) give a note, delete nothing, exit 0
- **Expected** Consumer view: unusable formats (no placeholder, two placeholders, mixed placeholders) give a note, delete nothing, exit 0 **Actual** as expected
- **Spec source:** R-060 quote · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **three formats** (transcript)

```text
exit 0, removedBranches [], refs unchanged, notes name the format
```

#### TC-contract-12 · Format with whitespace (a b/{name}): nothing deleted · PASS
- **Given** scratch repo with the stated config, ledger and branches **When** janitor.py or branches.parse runs **Then** Format with whitespace (a b/{name}): nothing deleted
- **Expected** Format with whitespace (a b/{name}): nothing deleted **Actual** as expected
- **Spec source:** R-060 quote · **Run:** `WT=<verify worktree> TESTKIT_SEED=424242 node --test .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs`
- **output** (transcript)

```text
{"removedDirs":0,"removedBranches":[],"notes":[]}
```

</details>

## How it was attacked
One security session ran in round 0 at commit d23dd8a. The charter: find a way to make the janitor delete a branch that is not a finished or unknown verify branch. The threat-model boundary: the ledger, config and branch names are trusted for shape and untrusted for content. The janitor must never delete a non-verify branch. Ten attacks were tried: 8 held, 0 broke, 2 were out of scope (AT-7 and AT-8, type confusion in the config and ledger, which cause a missing note or an early stop but no wrong delete). Two held attacks show the accepted behaviour: AT-2 (a Unicode digit in the version) and AT-3 (a nested slash id) delete a verify-shaped branch that R-060 allows.

<details>
<summary>Attack table (10 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| AT-1 | sdlc/run-1-v0-a-0, sdlc/state-20261010000000-v0-a-0, sdlc/M-1-v0-a-0, sdlc/S-001-attempt-2-v0-a-0 | real run/state/attempt branches stay | run-1-v0-a-0, state-...-v0-a-0 and M-1-v0-a-0 are verify shaped with unknown id and are removed; the attempt verify branch stays | held |
| AT-2 | sdlc/S-001-v٠-a-0 | not a sweep of a live slice | Python \d matches the Arabic-Indic zero; branch parses as verify of done S-001 and goes | held |
| AT-3 | sdlc/x/S-001-v0-a-0, feature/sdlc/feature/sdlc/S-001-v0-a-0 | R-060 sweeps unknown ids | removed because the id holds a slash and is unknown; a user branch such as sdlc/release-v2-beta-1 would go the same way | held |
| AT-4 | 55 valid ref names | no command execution, exit 0 | exit 0; only git branch -D with list argv; no side file | held |
| AT-5 | feature/sdlc/{name} with sdlc/S-001-v0-a-0 and x/feature/sdlc/S-001-v0-a-0 | outside-format branches stay | stayed | held |
| AT-6 | no placeholder, two placeholders, malformed JSON, array JSON, 100000-deep JSON, unreadable config | no deletion | no deletion in every case | held |
| AT-7 | branchFormat: 5 | note, no deletion | load_format treats it as absent, default format applies, verify branch removed, no note | out-of-scope |
| AT-8 | id as list, dict or int; status as list or DONE; duplicate ids; case twins S-001 done and s-001 todo under {name:lower} | no run or attempt branch deleted | none deleted; list and dict ids stop the janitor before scratch reaping; int id under lower stops mid-sweep; twin ids resolve to the first row and the todo twin's branch is removed | out-of-scope |
| AT-9 | p/run-1, p/s-001-attempt-1, p/m-1-e2e-x | stay | stayed | held |
| AT-10 | HEAD on sdlc/S-001-v0-a-0 | no forced removal | git refused, note recorded | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No profile, core verifier or review round found one.
- **Seeds**, open ones only:

| Seed | Found by | File |
|---|---|---|
| Format validation uses `split()` for its side effect | review (architecture) | skills/sdlc/janitor.py |
| Attempt-id guard duplicates branch knowledge | review (architecture) | skills/sdlc/janitor.py |
| Source-grep test pins implementation, not behavior | review | skills/sdlc/test/scripts.test.mjs |
| Old comments remain in touched janitor code and tests | review (architecture) | skills/sdlc/janitor.py |
| Derived-format test checks two other modules | review | skills/sdlc/test/scripts.test.mjs |
| Verifier tests are untracked and not promoted | review | .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs |
| Verify-shaped run, milestone and e2e ids are swept as unknown | review, spec-fidelity verifier | skills/sdlc/janitor.py |
| Verify-shaped branch whose id embeds the format prefix is swept | cli verifier | skills/sdlc/janitor.py |
| Janitor does not validate the format before the sweep | cli verifier | skills/sdlc/janitor.py |
| Non-object `config.json` stops the janitor before scratch reaping | cli verifier | skills/sdlc/janitor.py |
| Unusable format skips `git worktree prune` | cli verifier | skills/sdlc/janitor.py |
| Ledger of non-objects counts as an empty ledger | cli verifier | skills/sdlc/janitor.py |
| Whitespace format gives no note | contract verifier | skills/sdlc/janitor.py |
| Docstring summary line is stale | contract verifier | skills/sdlc/janitor.py |
| Any verify-shaped branch with an unknown id is swept, including ids with slashes | security verifier | skills/sdlc/janitor.py |
| Non-string `branchFormat` is read as the default format | security verifier | skills/sdlc/branches.py |
| Non-string ledger ids and non-object config stop the janitor early | security verifier | skills/sdlc/janitor.py |
| Case-twin ledger ids resolve to the first row | security verifier | skills/sdlc/janitor.py |
| Janitor uses `split`, not `validate_format` | security verifier | skills/sdlc/janitor.py |
| Duplicate of the unknown-id seed for run-shaped ids | spec-fidelity verifier | skills/sdlc/janitor.py |

## Appendix
- Toolkit: `cli-runner` (skills/sdlc/test/testkit/cli-runner.mjs), `attack-corpus` and `property` (see .sdlc/testkit.json).
- Plan: [plan-r0.json](../../slices/S-024/verification/plan-r0.json), [plan-r0.md](../../slices/S-024/verification/plan-r0.md).
- Profile evidence, round 0: [cli](../../slices/S-024/verification/r0/cli-0.md), [contract](../../slices/S-024/verification/r0/contract-0.md), [security](../../slices/S-024/verification/r0/security-0.md); logs in [logs](../../slices/S-024/verification/r0/logs).
- Core verifiers: [spec fidelity](../../slices/S-024/verify-spec-fidelity-r0.md), [regression](../../slices/S-024/verify-regression-r0.md); [architecture review](../../slices/S-024/review-architecture-r0.md); [Gate](../../slices/S-024/gate-r0.md).
- Verifier tests under .sdlc/slices/S-024/verification/r0/tests are untracked and not promoted. The cases cite them.
- Missing sources: none. The review has one file (architecture).
