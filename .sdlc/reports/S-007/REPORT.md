# S-007 · parse classifies a branch tail
Verdict: RELEASED
Commit under test: ca640fc · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 6 | 8 | 36 | 36 | 0 | 0 | 0 / 0 | 15 |

## Summary
The slice adds `parse(fmt, branch, ids=None)` to `skills/sdlc/branches.py`. It tells the loop whether a branch belongs to it and what kind it is. A foreign branch gives `None`. Any other branch gets a kind, its parts and a `known` flag from the ledger ids. The `parse` command prints the same result as one flat JSON object. Three profiles checked it at commit `ca640fc`: contract (property runs against a reference model written from spec section 2), cli, and security, with no defect and no failed case. The verifiers found no blocking defect. They found 15 distinct seeds, all outside the spec text or against inputs that git refs cannot hold. The review found no blocking finding. The gate ran 524 tests with 0 failures.

## Open risks
- A digit run of more than 4300 digits in `run`, `round`, `part` or `attempt` makes `int()` raise `ValueError`. The CLI then prints a traceback. A git ref cannot hold such a branch. The spec states no limit.
- Rows 6 and 7 backtrack in quadratic time on long tails. 100000 characters of `v0-a-` took 7.6 s. 40000 characters took about 1.1 s. The spec states no limit, and a real branch name is far shorter.
- A final newline and non-ASCII digits classify, because the rows use `$`, `\d` and `re.search` as the spec text gives. A stricter rule needs a spec decision.
- Non-string items in `ids` raise `AttributeError` under `{name:lower}`. A bare string as `ids` iterates by character. The spec says `ids` holds ledger ids.
- Under `{name:lower}`, a prefix whose lowercase form has a different length (for example `İ`) gives a wrong `None`. The spec does not cover this case.
- The code compares the prefix and suffix without case under `{name:lower}`. Spec section 2 names only the row regexes. ADR-20261009-171409-implementer-S-007-f520 records the choice. Tests pin it.
- Row 8 accepts any `S-` tail, so `S-001-attempt-` classifies as a slice. The spec regex allows it.
- No requirement is blocked. No case is blocked.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-021 | `parse(fmt, branch, ids=None)`: `None` unless `branch` starts with `prefix` and ends with `suffix`; | VS-1, VS-2, VS-7, VS-8 | `cli-0:TC-cli-1`, `cli-0:TC-cli-2`, `cli-0:TC-cli-6`, `contract-0:TC-contract-1`, `contract-0:TC-contract-2`, `contract-0:TC-contract-3`, `contract-0:TC-contract-14`, `contract-1:TC-contract-1`, `contract-1:TC-contract-2`, `security-0:TC-security-1`, `security-0:TC-security-2`, `security-0:TC-security-3`; unit: T-R-021a, T-R-021b | pass |
| R-022 | otherwise the tail between them is classified by the first regex that matches, in this order, compiled with `re.IGNORECASE` when `lower` is set: | VS-3, VS-4, VS-7 | `cli-0:TC-cli-3`, `cli-0:TC-cli-4`, `contract-0:TC-contract-4`, `contract-0:TC-contract-5`, `contract-0:TC-contract-6`, `contract-0:TC-contract-7`, `contract-0:TC-contract-8`, `contract-1:TC-contract-1`, `contract-1:TC-contract-3`, `contract-1:TC-contract-4`, `contract-1:TC-contract-5`, `contract-1:TC-contract-6`, `security-0:TC-security-3`, `security-0:TC-security-4`, `security-0:TC-security-5`, `security-0:TC-security-7`, `security-0:TC-security-8`, `security-0:TC-security-9`; unit: T-R-022a, T-R-022b | pass |
| R-023 | The result is `{"kind", "tail", "id", "n", "area", "round", "profile", "part", "ts", "known"}` with the parts that apply. | VS-5, VS-7, VS-8 | `cli-0:TC-cli-5`, `cli-0:TC-cli-6`, `contract-0:TC-contract-9`, `contract-0:TC-contract-10`, `contract-1:TC-contract-1`, `contract-1:TC-contract-3`, `contract-1:TC-contract-4`, `security-0:TC-security-4`, `security-0:TC-security-5`, `security-0:TC-security-6`; unit: T-R-023a, T-R-023b | pass |
| R-024 | When `ids` (an iterable of ledger ids) is given, `id` is replaced by the ledger's spelling that matches it, case-insensitively under `lower`, and `known` says whether one matched; without `ids`, `known` is `None`. | VS-3, VS-4, VS-6, VS-7 | `cli-0:TC-cli-4`, `contract-0:TC-contract-6`, `contract-0:TC-contract-8`, `contract-0:TC-contract-11`, `contract-0:TC-contract-12`, `contract-0:TC-contract-13`, `security-0:TC-security-8`, `security-0:TC-security-10`; unit: T-R-024a, T-R-024b | pass |
| R-068 | `name and parse round-trip every kind under the default, a prefixed and a lowercased format`: for each kind and the formats `sdlc/{name}`, `feature/PROJ-1-{name}`, `feature/PROJ-1-{name:lower}`. | none (unit test only) | unit test only: T-R-068a (parse assertion T-R-068c), `skills/sdlc/test/branches.test.mjs:739` | pass (unit test; no verifier case) |
| R-069 | `parse returns null for a foreign branch and resolves ids against the ledger`: `main`, `feature/PROJ-1-foo`, `sdlc/feature-x` give `null`; `feature/proj-1-s-001` with ids `['S-001']` gives `S-001`, `known: true`. | VS-1, VS-6 | `cli-0:TC-cli-1`, `contract-0:TC-contract-1`, `contract-0:TC-contract-11`; unit: T-R-069a | pass |

## Scenarios

### VS-1 · A foreign branch gives null
Profiles: contract, cli. A wrong non-null would let a foreign branch into the loop.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-0:TC-cli-1 | A foreign branch gives kind null and no part keys | PASS | `verify tests/cli-0/branches-parse.verify-cli.test.mjs:56` |
| contract-0:TC-contract-1 | Foreign branches give null (examples) | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:143` |
| contract-0:TC-contract-2 | Property: a branch missing the prefix or the suffix, or shorter than both, gives null | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:160` |
| contract-0:TC-contract-14 | Surface and consumer view | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:411` |

<details>
<summary>Case detail (4 cases)</summary>

#### cli-0:TC-cli-1 · A foreign branch gives kind null and no part keys · PASS
- **Given** main, feature/PROJ-1-foo, sdlc/feature-x, a branch shorter than prefix plus suffix, empty branch, case-different prefix **When** branches.py parse runs as a child process in a scratch git repo with a controlled environment **Then** Each prints exactly ok, command, format, branch, kind:null and exits 0; the tree and refs stay unchanged.
- **Expected** Each prints exactly ok, command, format, branch, kind:null and exits 0; the tree and refs stay unchanged. **Actual** All 12 branches gave kind null with five keys and exit 0.
- **Spec source:** R-021 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`
- *transcript, VS-1 first transcripts:*

  ```console
  $ branches.py parse --branch "main" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "main", "kind": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "feature/PROJ-1-foo" (format feature/PROJ-1-{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name}", "branch": "feature/PROJ-1-foo", "kind": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "sdlc/feature-x"  …
  ```

- *transcript, VS-1 all transcripts:* [`cli-0-transcripts.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt)

- More evidence: [`cli-0.md`](../../slices/S-007/verification/r0/cli-0.md)


#### contract-0:TC-contract-1 · Foreign branches give null (examples) · PASS
- **Given** main under the default; feature/PROJ-1-foo under feature/PROJ-1-{name}; sdlc/feature-x; empty, short and overlapping prefix/suffix branches **When** parse is called **Then** every call returns None
- **Expected** every call returns None **Actual** every call returns None
- **Spec source:** R-021 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, examples:*

  ```console
  10 examples, all null; see test source
  ```


#### contract-0:TC-contract-2 · Property: a branch missing the prefix or the suffix, or shorter than both, gives null · PASS
- **Given** 1500 generated format and branch pairs, 457 of them foreign by the reference model **When** parse is called **Then** null for every foreign pair, no exception
- **Expected** null for every foreign pair, no exception **Actual** null for every foreign pair, no exception
- **Spec source:** R-021 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *property-run, foreign-null:*

  ```text
  property-run foreign-null: seed=3739127874 runs=1500 foreignCases=457 violations=0
  ```


#### contract-0:TC-contract-14 · Surface and consumer view · PASS
- **Given** branches.py imported as a consumer does (sys.path to the script directory) **When** the module is listed **Then** parse(fmt, branch, ids=None) is exported; PARSE_ROWS holds 8 rows; imports are the standard library only
- **Expected** parse(fmt, branch, ids=None) is exported; PARSE_ROWS holds 8 rows; imports are the standard library only **Actual** parse(fmt, branch, ids=None) is exported; PARSE_ROWS holds 8 rows; imports are the standard library only
- **Spec source:** R-021 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *type-check, surface listing:*

  ```console
  {"public":["Fail","JsonArgumentParser","build_parser","cmd_list","cmd_name","cmd_parse","cmd_preflight","load_format","load_git_modes","main","name","parse","split","tail","validate_format"],"sigs":{"build_parser":"()","cmd_list":"(ns)","cmd_name":"(ns)","cmd_parse":"(ns)","cmd_preflight":"(ns)","load_format":"(repo)","load_git_modes":"(path='/private/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-007-v0-contract-0/skills/sdlc/git-modes.json')","main":"(argv=None)","name":"(fmt, kind, ** …
  ```


</details>

### VS-2 · A branch that passes prefix and suffix but matches no row gives null
Profiles: contract, cli, security. A wrong match would hide or invent a slice branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-0:TC-cli-2 | Prefix and suffix pass but no row matches gives null | PASS | `verify tests/cli-0/branches-parse.verify-cli.test.mjs:71` |
| contract-0:TC-contract-3 | A branch that passes prefix and suffix but matches no row gives null | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:186` |
| security-0:TC-security-1 | Empty and overlapping tails give null | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:17` |

<details>
<summary>Case detail (3 cases)</summary>

#### cli-0:TC-cli-2 · Prefix and suffix pass but no row matches gives null · PASS
- **Given** sdlc/, sdlc/run-, sdlc/run-x, S-001 and S-001-wip under {name}-wip, overlapping prefix and suffix (aba, abba under ab{name}ba, aaa under aa{name}aa) **When** branches.py parse runs as a child process in a scratch git repo with a controlled environment **Then** null for each; S-001-wip gives slice S-001; abS-1ba gives slice.
- **Expected** null for each; S-001-wip gives slice S-001; abS-1ba gives slice. **Actual** All matched expectations; overlap and empty tails gave null with no wrong slice.
- **Spec source:** R-021 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`
- *transcript, VS-2 first transcripts:*

  ```console
  $ branches.py parse --branch "sdlc/" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/", "kind": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "sdlc/run-" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-", "kind": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "sdlc/run-x" (format sdlc/{name} via config)
  exit 0
  s …
  ```

- *transcript, VS-2 all transcripts:* [`cli-0-transcripts.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt)

- More evidence: [`cli-0.md`](../../slices/S-007/verification/r0/cli-0.md)


#### contract-0:TC-contract-3 · A branch that passes prefix and suffix but matches no row gives null · PASS
- **Given** sdlc/, sdlc/run-, sdlc/run-x, sdlc/M-, sdlc/state-<13 or 15 digits>, T-001-v0-X-0, T-001-attempt-, suffix format {name}-wip with S-001 and S-001-wip **When** parse is called **Then** null for the 16 non-matching tails; S-001-wip gives slice S-001
- **Expected** null for the 16 non-matching tails; S-001-wip gives slice S-001 **Actual** null for the 16 non-matching tails; S-001-wip gives slice S-001
- **Spec source:** R-021 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, examples:*

  ```console
  all null except S-001-wip (slice)
  ```


#### security-0:TC-security-1 · Empty and overlapping tails give null · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Ten degenerate branches give null; S-001-wip under {name}-wip gives slice S-001
- **Expected** Ten degenerate branches give null; S-001-wip under {name}-wip gives slice S-001 **Actual** All ten gave null. S-001-wip gave slice S-001.
- **Spec source:** R-021 acceptance · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs2-1 to 11:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)

- *log, no side effect: parse is a pure function and stdout and stderr stay empty:*

  ```text
  A-vs2-noside: stdout '' stderr '' value null
  ```


</details>

### VS-3 · Each tail is classified by the first matching row
Profiles: contract, cli. A wrong row order would give the wrong kind and parts.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-0:TC-cli-3 | Each tail is classified by the first matching row | PASS | `verify tests/cli-0/branches-parse.verify-cli.test.mjs:87` |
| contract-0:TC-contract-4 | One branch per row 1 to 8 and overlap precedence (examples) | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:212` |
| contract-0:TC-contract-5 | Property: classification equals a reference table written from the spec (plain format) | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:245` |
| contract-0:TC-contract-8 | Property: mixed formats equal the reference table | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:277` |

<details>
<summary>Case detail (4 cases)</summary>

#### cli-0:TC-cli-3 · Each tail is classified by the first matching row · PASS
- **Given** one branch per row, S-fix-M-1-2, M-1-e2e-api, M-1-e2e, M-1-e2e-a-b, double-match tails S-001-v0-x-attempt-3 and M-1-e2e-api-v0-x-0 **When** branches.py parse runs as a child process in a scratch git repo with a controlled environment **Then** Row order decides: verify beats attempt, e2e-area beats verify, area a-b parses whole, profile http-api parses with lazy group.
- **Expected** Row order decides: verify beats attempt, e2e-area beats verify, area a-b parses whole, profile http-api parses with lazy group. **Actual** All kinds and parts matched the table order.
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`
- *transcript, VS-3 first transcripts:*

  ```console
  $ branches.py parse --branch "sdlc/run-2" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-2", "kind": "run", "tail": "run-2", "n": 2, "known": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "sdlc/M-1" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-1", "kind": "milestone", "tail": "M-1", "id": "M-1", "known": null}
  stderr: 
  tree …
  ```

- *transcript, VS-3 all transcripts:* [`cli-0-transcripts.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt)

- More evidence: [`cli-0.md`](../../slices/S-007/verification/r0/cli-0.md)


#### contract-0:TC-contract-4 · One branch per row 1 to 8 and overlap precedence (examples) · PASS
- **Given** 20 tails: one per row, S-fix-M-1-2, M-1-e2e-a-b, M-1-v0-api-0, and tails matching two rows **When** parse is called **Then** the first matching row wins: S-001-attempt-3 is attempt, S-001-v0-x-0-attempt-4 is verify (row 6 before 7), M-1-e2e-v0-x-0 is e2e-area
- **Expected** the first matching row wins: S-001-attempt-3 is attempt, S-001-v0-x-0-attempt-4 is verify (row 6 before 7), M-1-e2e-v0-x-0 is e2e-area **Actual** the first matching row wins: S-001-attempt-3 is attempt, S-001-v0-x-0-attempt-4 is verify (row 6 before 7), M-1-e2e-v0-x-0 is e2e-area
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, examples:*

  ```console
  20 cases pass
  ```


#### contract-0:TC-contract-5 · Property: classification equals a reference table written from the spec (plain format) · PASS
- **Given** 1500 generated plain-format branches, tails drawn from every row and from noise **When** parse and the JS reference model run **Then** results equal, including null
- **Expected** results equal, including null **Actual** results equal, including null
- **Spec source:** R-022 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *property-run, classification-plain:*

  ```text
  property-run classification-plain: seed=3739127874 runs=1500 violations=0 nonNull=410
  ```


#### contract-0:TC-contract-8 · Property: mixed formats equal the reference table · PASS
- **Given** 1500 branches under random plain or lower formats **When** parse and the reference model run **Then** results equal
- **Expected** results equal **Actual** results equal
- **Spec source:** R-022 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *property-run, classification-mixed:*

  ```text
  property-run classification-mixed: seed=3739127874 runs=1500 violations=0 nonNull=508
  ```


</details>

### VS-4 · Case-insensitive matching applies only under {name:lower}
Profiles: contract, cli. Wrong case rules would hide a lowercased slice from the loop.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-0:TC-cli-4 | Case-insensitive matching applies only under {name:lower} | PASS | `verify tests/cli-0/branches-parse.verify-cli.test.mjs:117` |
| contract-0:TC-contract-6 | Case-insensitive matching applies only under {name:lower} (examples) | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:249` |
| contract-0:TC-contract-7 | Property: lower-format classification equals the reference table | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:273` |

<details>
<summary>Case detail (3 cases)</summary>

#### cli-0:TC-cli-4 · Case-insensitive matching applies only under {name:lower} · PASS
- **Given** feature/PROJ-1-s-001, m-1-e2e-api, run-2, mixed-case prefix, sdlc/{name:lower}-wip with -WIP **When** branches.py parse runs as a child process in a scratch git repo with a controlled environment **Then** Lower format classifies lowercase tails; plain format gives null for s-001 and m-1-e2e-api and RUN-2. run-2 is lowercase in the table, so it classifies under both formats.
- **Expected** Lower format classifies lowercase tails; plain format gives null for s-001 and m-1-e2e-api and RUN-2. run-2 is lowercase in the table, so it classifies under both formats. **Actual** Matched. Plan note says run-2 gives null under the plain format; the spec regex ^run-(\d+)$ matches it, so the note is wrong, not the product.
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`
- *transcript, VS-4 first transcripts:*

  ```console
  $ branches.py parse --branch "feature/PROJ-1-s-001" (format feature/PROJ-1-{name:lower} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name:lower}", "branch": "feature/PROJ-1-s-001", "kind": "slice", "tail": "s-001", "id": "s-001", "known": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "feature/PROJ-1-m-1-e2e-api" (format feature/PROJ-1-{name:lower} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{na …
  ```

- *transcript, VS-4 all transcripts:* [`cli-0-transcripts.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt)

- More evidence: [`cli-0.md`](../../slices/S-007/verification/r0/cli-0.md)


#### contract-0:TC-contract-6 · Case-insensitive matching applies only under {name:lower} (examples) · PASS
- **Given** feature/PROJ-1-s-001, m-1-e2e-api, run-2, mixed-case prefix and suffix under both formats **When** parse is called **Then** lower formats classify; plain formats give null for upper-case-needed tails; prefix and suffix compare without case only under lower
- **Expected** lower formats classify; plain formats give null for upper-case-needed tails; prefix and suffix compare without case only under lower **Actual** lower formats classify; plain formats give null for upper-case-needed tails; prefix and suffix compare without case only under lower
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, examples:*

  ```console
  13 cases pass
  ```


#### contract-0:TC-contract-7 · Property: lower-format classification equals the reference table · PASS
- **Given** 1500 branches under {name:lower} with random case flips in tail, prefix and suffix **When** parse and the reference model run **Then** results equal
- **Expected** results equal **Actual** results equal
- **Spec source:** R-022 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *property-run, classification-lower:*

  ```text
  property-run classification-lower: seed=3739127874 runs=1500 violations=0 nonNull=612
  ```


</details>

### VS-5 · The result holds the parts that apply
Profiles: contract, cli. A wrong key or type would break the later slices that read the parts.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-0:TC-cli-5 | The result holds the parts that apply | PASS | `verify tests/cli-0/branches-parse.verify-cli.test.mjs:139` |
| contract-0:TC-contract-9 | The result holds exactly the parts that apply; n, round and part are integers (examples) | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:281` |
| contract-0:TC-contract-10 | Property: key set per kind, integer types, tail is a slice of the branch | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:305` |

<details>
<summary>Case detail (3 cases)</summary>

#### cli-0:TC-cli-5 · The result holds the parts that apply · PASS
- **Given** run-2, run-0042, state ts, verify, e2e-area, attempt, slice, milestone, e2e, a 30-digit run number **When** branches.py parse runs as a child process in a scratch git repo with a controlled environment **Then** Key order and set per kind; n, round, part are JSON integers; tail always present; no key outside the table.
- **Expected** Key order and set per kind; n, round, part are JSON integers; tail always present; no key outside the table. **Actual** Matched. run-0042 gives n 42 and tail run-0042. A 30-digit n prints as an integer.
- **Spec source:** R-023 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`
- *transcript, VS-5 first transcripts:*

  ```console
  $ branches.py parse --branch "sdlc/run-2" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-2", "kind": "run", "tail": "run-2", "n": 2, "known": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --branch "sdlc/run-0042" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-0042", "kind": "run", "tail": "run-0042", "n": 42, "known": null}
  stderr:  …
  ```

- *transcript, VS-5 all transcripts:* [`cli-0-transcripts.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt)

- More evidence: [`cli-0.md`](../../slices/S-007/verification/r0/cli-0.md)


#### contract-0:TC-contract-9 · The result holds exactly the parts that apply; n, round and part are integers (examples) · PASS
- **Given** run, state, verify, e2e-area, e2e, milestone, slice and attempt branches, with and without ids **When** parse is called **Then** key set equals kind, tail, known plus the row parts; n, round, part are ints
- **Expected** key set equals kind, tail, known plus the row parts; n, round, part are ints **Actual** key set equals kind, tail, known plus the row parts; n, round, part are ints
- **Spec source:** R-023 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, examples:*

  ```console
  8 kinds, 2 passes
  ```


#### contract-0:TC-contract-10 · Property: key set per kind, integer types, tail is a slice of the branch · PASS
- **Given** 1500 generated cases **When** parse is called **Then** no key outside the table; ints are ints; known is null or boolean
- **Expected** no key outside the table; ints are ints; known is null or boolean **Actual** no key outside the table; ints are ints; known is null or boolean
- **Spec source:** R-023 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *property-run, result-shape:*

  ```text
  property-run result-shape: seed=3739127874 runs=1500 violations=0
  ```


</details>

### VS-6 · ids resolve the ledger spelling and set known
Profiles: contract. A wrong id spelling or known flag would mislead the ledger lookup.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-11 | ids resolve the ledger spelling and set known (examples) | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:333` |
| contract-0:TC-contract-12 | Property: ids resolution equals the reference model | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:358` |
| contract-0:TC-contract-13 | Iterator, tuple, generator, set and dict keys work as ids; the caller list is not mutated; results are deterministic and fresh | PASS | `verify tests/contract-0/parse.verify-contract.test.mjs:366` |

<details>
<summary>Case detail (3 cases)</summary>

#### contract-0:TC-contract-11 · ids resolve the ledger spelling and set known (examples) · PASS
- **Given** feature/proj-1-s-001 with [S-001]; absent id; no ids; run and state with ids; duplicate ids differing in case; milestone and verify ids; exact match under plain format **When** parse is called **Then** id takes ledger spelling; known true or false; null for run, state and no ids; first duplicate wins
- **Expected** id takes ledger spelling; known true or false; null for run, state and no ids; first duplicate wins **Actual** id takes ledger spelling; known true or false; null for run, state and no ids; first duplicate wins
- **Spec source:** R-024 acceptance; R-069 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, examples:*

  ```console
  all assertions pass
  ```


#### contract-0:TC-contract-12 · Property: ids resolution equals the reference model · PASS
- **Given** 1500 generated cases with 0 to 4 ids in random case **When** parse and the reference model run **Then** results equal
- **Expected** results equal **Actual** results equal
- **Spec source:** R-024 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *property-run, ids-resolution:*

  ```text
  property-run ids-resolution: seed=3739127874 runs=1500 violations=0 nonNull=492
  ```


#### contract-0:TC-contract-13 · Iterator, tuple, generator, set and dict keys work as ids; the caller list is not mutated; results are deterministic and fresh · PASS
- **Given** python3 -I script that imports branches by path **When** parse is called with each iterable **Then** known true for each; list unchanged; two calls equal; mutating a result does not affect the next call
- **Expected** known true for each; list unchanged; two calls equal; mutating a result does not affect the next call **Actual** known true for each; list unchanged; two calls equal; mutating a result does not affect the next call
- **Spec source:** R-024 quote (an iterable of ledger ids) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007-v0-contract-0> node --test .sdlc/slices/S-007/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- *transcript, python run:*

  ```console
  tuple, iter, gen, set, frozenset, dict_keys all give S-001/true
  ```


</details>

### VS-7 · Hostile and odd input does not crash or misclassify
Profiles: security, contract. A crash or a wrong accept on odd input would stop the loop or misclassify a branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-1:TC-contract-1 | parse equals a spec reference model on random formats, branches and ledgers | PASS | `verify tests/contract-1/parse-hostile.verify-contract.test.mjs:18` |
| contract-1:TC-contract-2 | A non-string branch, NUL, a lone surrogate, an empty or short branch and a prefix and suffix overlap give None and do not raise | PASS | `verify tests/contract-1/parse-hostile.verify-contract.test.mjs:38` |
| contract-1:TC-contract-3 | A trailing newline follows the spec regex text | PASS | `verify tests/contract-1/parse-hostile.verify-contract.test.mjs:47` |
| contract-1:TC-contract-4 | Non-ASCII digits match the digit groups, with no ASCII flag | PASS | `verify tests/contract-1/parse-hostile.verify-contract.test.mjs:54` |
| contract-1:TC-contract-5 | Unicode case folding under {name:lower} does not raise | PASS | `verify tests/contract-1/parse-hostile.verify-contract.test.mjs:62` |
| contract-1:TC-contract-6 | Long tails of 40000 characters finish in bounded time | PASS | `verify tests/contract-1/parse-hostile.verify-contract.test.mjs:69` |
| security-0:TC-security-2 | Non-string branch gives null | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:43` |
| security-0:TC-security-3 | NUL, control characters, spaces and traversal | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:52` |
| security-0:TC-security-4 | Trailing newline | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:70` |
| security-0:TC-security-5 | Non-ASCII digits | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:87` |
| security-0:TC-security-6 | Digit runs over 4300 characters | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:104` |
| security-0:TC-security-7 | Long tails and backtracking | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:116` |
| security-0:TC-security-8 | Unicode case folding under lower | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:134` |
| security-0:TC-security-9 | Plain format stays case-exact; regex metacharacters in the format stay literal | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:152` |
| security-0:TC-security-10 | Ledger id list holding non-strings | PASS | `verify tests/security-0/branches-parse.verify-security.test.mjs:163` |

<details>
<summary>Case detail (15 cases)</summary>

#### contract-1:TC-contract-1 · parse equals a spec reference model on random formats, branches and ledgers · PASS
- **Given** Formats from 5 prefixes, 4 suffixes and both placeholders; tails built from the 8 rows, their case variants, newlines, NUL, non-ASCII digits and junk; ids as list, tuple, iterator or absent. **When** parse runs 5000 times per seed for seeds 20261010, 7 and 99, and a model written from the section 2 table runs on the same input. **Then** Both give the same result, or both give None.
- **Expected** 0 differences **Actual** 0 differences in 15000 runs; every kind and null occurred (null 2678, verify 409, attempt 355, e2e 338, milestone 377, run 305, e2e-area 291, slice 202, state 45 for seed 20261010)
- **Spec source:** R-021, R-022, R-023 acceptance · **Run:** `VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs`
- *property-run, reference-model property:*

  ```text
  property=parse equals model; seeds=20261010,7,99; runs=5000 each; result=pass; shrunk counterexample=none (no shrinking)
  ```

- *log, run log:* [`contract-1-run.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/contract-1-run.txt)


#### contract-1:TC-contract-2 · A non-string branch, NUL, a lone surrogate, an empty or short branch and a prefix and suffix overlap give None and do not raise · PASS
- **Given** Branch values None, 5, 5.5, bytes, list, dict, True, a class, NUL in the tail and in the prefix, a lone surrogate, '', 'sdl', 'sdlc/', and format ab{name}ba with aba and abba. **When** parse runs on each. **Then** None, no exception.
- **Expected** None for all **Actual** None for all 21 inputs
- **Spec source:** R-021 quote · **Run:** `VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs`
- *log, run log:* [`contract-1-run.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/contract-1-run.txt)


#### contract-1:TC-contract-3 · A trailing newline follows the spec regex text · PASS
- **Given** sdlc/run-2, sdlc/S-001, sdlc/M-1 and sdlc/S-001-v0-cli-0, each with one final newline; a final newline after a literal suffix; two final newlines. **When** parse runs under the default format and under sdlc/{name}-wip. **Then** The row regex uses re.search and $, which matches before a final newline. The spec gives the regex text, so the branch classifies and tail keeps the newline. A newline after the suffix gives None. Two newlines give None.
- **Expected** as the spec regex text **Actual** run n=2, slice S-001, milestone M-1 and verify classified with tail ending in a newline; newline after suffix None; double newline None
- **Spec source:** R-022 quote (regex text), R-021 · **Run:** `VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs`
- *transcript, parse of sdlc/run-2\n:*

  ```console
  parse('sdlc/{name}','sdlc/run-2\n') -> {'kind':'run','tail':'run-2\n','n':2,'known':None}
  ```


#### contract-1:TC-contract-4 · Non-ASCII digits match the digit groups, with no ASCII flag · PASS
- **Given** sdlc/run-<ARABIC-INDIC 3>, sdlc/run-<FULLWIDTH 2>, a verify tail with Arabic-Indic round and part, a state tail with 14 Arabic-Indic digits. **When** parse runs. **Then** The regexes use \d without re.ASCII, as the spec text gives, so each classifies; int() converts n, round and part.
- **Expected** classified as the spec regex text **Actual** run n=3, run n=2, verify round 0 part 1, state ts kept as text
- **Spec source:** R-022 quote (regex text) · **Run:** `VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs`
- *transcript, non-ASCII digits:*

  ```console
  parse('sdlc/{name}','sdlc/run-\u0663') -> {'kind':'run','tail':'run-\u0663','n':3,'known':None}
  ```


#### contract-1:TC-contract-5 · Unicode case folding under {name:lower} does not raise · PASS
- **Given** Kelvin sign, long s (U+017F), dotted capital I in the prefix and in the branch, sharp capital S, upper-case prefix. **When** parse runs under sdlc/{name:lower}. **Then** No exception.
- **Expected** no exception **Actual** no exception; U+017F matches S under re.IGNORECASE, so sdlc/<U+017F>-001 is a slice (spec says IGNORECASE; seed)
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs`
- *log, run log:* [`contract-1-run.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/contract-1-run.txt)


#### contract-1:TC-contract-6 · Long tails of 40000 characters finish in bounded time · PASS
- **Given** 14 tails of 40000 characters aimed at rows 4 to 8. **When** parse runs and the time is recorded. **Then** Each call ends in under 5 seconds. The spec states no limit.
- **Expected** under 5 s **Actual** slowest 1979 ms (quadratic growth on row 6: 2000 chars 2.9 ms, 4000 chars 11.4 ms, 8000 chars 45.5 ms)
- **Spec source:** none (spec states no limit; seed) · **Run:** `VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs`
- *measurement, row 6 backtracking:*

  ```text
  tail a-v1- repeated, then '!':
  2000 chars 2.9 ms
  4000 chars 11.4 ms
  8000 chars 54.9 ms
  40000 chars about 1100 ms (lower: 1979 ms)
  ```


#### security-0:TC-security-2 · Non-string branch gives null · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Six non-string types return null and do not raise
- **Expected** Six non-string types return null and do not raise **Actual** All six returned null.
- **Spec source:** R-021 quote · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-type-0 to 5:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)


#### security-0:TC-security-3 · NUL, control characters, spaces and traversal · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Ten odd branches give null
- **Expected** Ten odd branches give null **Actual** Nine gave null. sdlc/S-001<NUL>-v0-x-0 classified as verify with id S-001<NUL>. The spec regex (.+) accepts it. Recorded as an observation.
- **Spec source:** R-022 table row 6 · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-nul-1 to 3, ctl, trav, sp:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)


#### security-0:TC-security-4 · Trailing newline · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Spec regexes use $ with re.search, so a final newline matches
- **Expected** Spec regexes use $ with re.search, so a final newline matches **Actual** Branches with a final newline classified as run, slice, state, verify, milestone and e2e. The tail keeps the newline. Recorded as an observation.
- **Spec source:** R-022 table (regex with $) · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, probe trailing newline:* [`security-0-probe.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt)


#### security-0:TC-security-5 · Non-ASCII digits · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Spec regexes use \d and int(); Unicode digits match
- **Expected** Spec regexes use \d and int(); Unicode digits match **Actual** Arabic-Indic and fullwidth digits classified in run, milestone, state, verify round and part, and attempt. int() converted them. Recorded as an observation.
- **Spec source:** R-023 integer parts · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, probe digits:* [`security-0-probe.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt)


#### security-0:TC-security-6 · Digit runs over 4300 characters · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** parse should return, not raise
- **Expected** parse should return, not raise **Actual** parse raised ValueError from int() for run, round, part and attempt. A git ref component cannot reach 4300 characters. No spec limit applies.
- **Spec source:** no spec source; seed · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-huge-run:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)

- *attack, probe:* [`security-0-probe.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt)


#### security-0:TC-security-7 · Long tails and backtracking · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** No timing limit in the spec; record the cost
- **Expected** No timing limit in the spec; record the cost **Actual** Long slice and verify tails took 40 ms. A 100k-character tail of v0-a- repeated took 7.6 s (quadratic; 200k took 30 s). Seed for verify-limits.
- **Spec source:** no spec source; seed · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-long-*:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)

- *attack, probe timing:* [`security-0-probe.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt)


#### security-0:TC-security-8 · Unicode case folding under lower · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** A confusable never resolves to a ledger id
- **Expected** A confusable never resolves to a ledger id **Actual** Dotted capital I and long s classified as slice with known false. Kelvin sign and sharp s gave null. No confusable gave known true.
- **Spec source:** R-024 quote · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-fold-*:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)


#### security-0:TC-security-9 · Plain format stays case-exact; regex metacharacters in the format stay literal · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Eight branches give null
- **Expected** Eight branches give null **Actual** All gave null.
- **Spec source:** R-022 acceptance (lower only) · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-case-*, A-vs7-fmt-*:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)


#### security-0:TC-security-10 · Ledger id list holding non-strings · PASS
- **Given** parse from skills/sdlc/branches.py on sdlc/S-007 **When** the attack inputs run through pycall **Then** Spec says ids is an iterable of ledger ids; no behavior stated for other items
- **Expected** Spec says ids is an iterable of ledger ids; no behavior stated for other items **Actual** None or a list as first item raised AttributeError. A non-string after a match, a dict and an empty list returned. A bare string iterates by character. Seed.
- **Spec source:** R-024 quote · **Run:** `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`
- *attack, A-vs7-ids-*:* [`security-0-attacks.jsonl`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl)

- *attack, probe ids:* [`security-0-probe.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt)


</details>

### VS-8 · The parse command prints one flat JSON object
Profiles: cli. A changed CLI shape would break the callers of the parse command.

| Case | What it proves | Result | Test |
|---|---|---|---|
| cli-0:TC-cli-6 | The parse command prints one flat JSON object | PASS | `verify tests/cli-0/branches-parse.verify-cli.test.mjs:168` |

<details>
<summary>Case detail (1 cases)</summary>

#### cli-0:TC-cli-6 · The parse command prints one flat JSON object · PASS
- **Given** one-line output; missing --branch; invalid formats (nobrace, double placeholder, open brace, whitespace, git-unsafe, empty); missing repo dir; invalid config.json; unknown flag; directory with spaces and unicode; repeat run **When** branches.py parse runs as a child process in a scratch git repo with a controlled environment **Then** Exit 2 with {ok:false,error} for every error input; no nested objects; repeated runs give identical output; tree and refs unchanged.
- **Expected** Exit 2 with {ok:false,error} for every error input; no nested objects; repeated runs give identical output; tree and refs unchanged. **Actual** Matched.
- **Spec source:** R-023 quote and R-021 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`
- *transcript, VS-8 first transcripts:*

  ```console
  $ branches.py parse --branch "sdlc/S-001-v0-http-api-0" (format sdlc/{name} via config)
  exit 0
  stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/S-001-v0-http-api-0", "kind": "verify", "tail": "S-001-v0-http-api-0", "id": "S-001", "round": 0, "profile": "http-api", "part": 0, "known": null}
  stderr: 
  tree unchanged: true
  $ branches.py parse --repo <repo>
  exit 2
  stdout: {"ok": false, "error": "the following arguments are required: --branch"}
  stderr: 
  tree unchanged: …
  ```

- *transcript, VS-8 all transcripts:* [`cli-0-transcripts.txt`](../../../.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt)

- More evidence: [`cli-0.md`](../../slices/S-007/verification/r0/cli-0.md)


</details>

## How it was attacked
One security session ran (`security-0`). Its charters: explore the tail classifier with hostile branch text for a branch that `parse` accepts and the spec rejects (R-021, R-022); explore case folding under `{name:lower}` for a confusable that resolves to a ledger id (R-024); explore regex metacharacters in the format for a pattern injection (R-021); explore the `ids` argument with non-string items for a crash (R-024). The threat-model boundary is the `parse` function and the `parse` command: a branch name and a format from the repo, and a ledger id list. Parse runs no shell command and opens no path. The session tried 10 attacks. 4 held. 0 broke a stated rule. 6 were out of scope, because the spec gives no limit or the input is out of contract. The review (security lens) agrees: no blocking finding.

<details>
<summary>Attack table (10 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-1 | empty tail, overlap, short branches | null | null | held |
| A-2 | non-string branch | null, no raise | null | held |
| A-3 | trailing newline on six kinds | no spec row demands rejection | classified; tail keeps newline | out-of-scope |
| A-4 | NUL inside the id of a verify tail | no spec row demands rejection | classified verify | out-of-scope |
| A-5 | Unicode digits in n, round, part, ts, milestone | no spec row demands rejection | classified; int() converts | out-of-scope |
| A-6 | 5000-digit integer parts | a return | ValueError | out-of-scope |
| A-7 | 100k-character tail of v0-a- repeated | a return in bounded time | 7.6 s | out-of-scope |
| A-8 | dotted I, long s, Kelvin, sharp s | known not true | known false or null | held |
| A-9 | a.c/, a*/, (x)/, .* | literal match, null | null | held |
| A-10 | None, list, int, str, dict, empty | a return | AttributeError for None and list items | out-of-scope |

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier, core verifier or review lens found a blocking defect in round 0. The spec-fidelity and regression verifiers and both review lenses (test-quality, security) gave no blocking finding.
- **Seeds**, open only:

| Seed | Found by | File |
|---|---|---|
| Huge digit run crashes parse CLI (more than 4300 digits) | review-security, contract-1, security-0 | skills/sdlc/branches.py |
| Trailing newline accepted in a tail | review-security, spec-fidelity, contract-1, security-0 | skills/sdlc/branches.py |
| Non-ASCII digits accepted and not pinned by a test | review-test-quality, contract-1, security-0 | skills/sdlc/branches.py |
| Case-fold logic is spelled twice in parse (style) | review | skills/sdlc/branches.py |
| T-R-069a overlaps T-R-021a and T-R-024a (R-069 needs its own test) | review-test-quality | skills/sdlc/test/branches.test.mjs |
| Lowercase length change in prefix gives a wrong null | spec-fidelity | skills/sdlc/branches.py |
| Plan note for VS-4 is wrong about `run-2` under the plain format | cli-0 | skills/sdlc/branches.py |
| A branch that starts with a dash cannot pass as `--branch -x` | cli-0 | skills/sdlc/branches.py |
| Slice row accepts any `S-` tail | cli-0 | skills/sdlc/branches.py |
| Spec silent on case of prefix and suffix under lower | contract-0 | skills/sdlc/branches.py |
| Row 6 takes attempt-like tails as verify | contract-0 | skills/sdlc/branches.py |
| AttributeError for non-string ledger ids under lower | contract-1, security-0 | skills/sdlc/branches.py |
| Row 6 regex backtracks quadratically on long tails (7.6 s at 100000 characters) | contract-1, security-0 | skills/sdlc/branches.py |
| U+017F folds to `s` under `re.IGNORECASE` | contract-1 | skills/sdlc/branches.py |
| Verify id accepts NUL and any character | security-0 | skills/sdlc/branches.py |

## Appendix
- Toolkit tools used: cli-runner (cli profile), property (contract profile), attack-corpus (security profile). All three exist in the testkit (`.sdlc/testkit.json`).
- Round 0 plan: [plan-r0.md](../../slices/S-007/verification/plan-r0.md), [plan-r0.json](../../slices/S-007/verification/plan-r0.json).
- Profile evidence, round 0: [cli-0](../../slices/S-007/verification/r0/cli-0.md), [contract-0](../../slices/S-007/verification/r0/contract-0.md), [contract-1](../../slices/S-007/verification/r0/contract-1.md), [security-0](../../slices/S-007/verification/r0/security-0.md).
- Core verifiers: [spec-fidelity](../../slices/S-007/verify-spec-fidelity-r0.md), [regression](../../slices/S-007/verify-regression-r0.md).
- Review: [security](../../slices/S-007/review-security-r0.md), [test-quality](../../slices/S-007/review-test-quality-r0.md). Gate: [gate-r0](../../slices/S-007/gate-r0.md).
- Verification ran at commit `ca640fc`. The branch head `753e3c3` adds only state commits. The gate ran at `1d38bb4`.
- Unit tests: `node --test skills/sdlc/test/branches.test.mjs` ran 47 tests, 47 passed (spec-fidelity verifier).
- Missing sources: none. The ledger lists R-068 under no slice requirement yet, so the report cites its unit test only.
