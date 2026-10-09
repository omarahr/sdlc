# S-005a · tails: state, verify, attempt
Verdict: RELEASED
Commit under test: 15c9904 (gate ran at b9e547f; product change de9cf46) · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-09

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 3 | 7 | 44 | 44 | 0 | 0 | 0 / 0 | 13 |

## Summary
The slice adds the `verify` and `attempt` rows to the `TAILS` table in `skills/sdlc/branches.py`. Now `branches.py name` prints `sdlc/S-001-v0-http-api-0` and `sdlc/S-001-attempt-1`, and tests pin the existing `state` row. The cli, contract and security profiles ran 44 cases at the CLI and Python API boundaries. The cases used far time zones, team formats, missing parts and hostile input. All 44 cases passed in round 0, and the spec-fidelity, regression and gate checks held. No verifier and no review found a blocking defect. Thirteen non-blocking seeds stay open. Most of them are about names that git refuses for hostile parts.

## Open risks
- `name` does not check its output with `git check-ref-format`. Hostile `--id` and `--profile` values give names that git refuses. The verifiers counted 73 of 250 verify calls and 38 of 125 attempt calls. Through the API, the count is 26 of 34 calls. ADR-20261009-045048 accepts the same gap for the S-004 rows.
- A part with a leading `-` under a plain `{name}` format can look like a git flag. The consumer slices (S-008 and later) must check the name or put `--` before it.
- Integer parts accept negative, padded and non-ASCII digit forms. `--n -1` gives `sdlc/S-001-attempt--1`, and `--n ٣` and `--n 3` give one branch. Through the API, `round=False` gives `vFalse`.
- `name` accepts a profile such as `Http_API`, but the spec section 2 parse row for `verify` matches only `[a-z0-9-]+?`. That name does not parse back to `verify`. The parse and round-trip slice owns this.
- An explicit state `ts` goes into the name as given, with no 14-digit check. `ts='../../x'` gives `sdlc/state-../../x`. The spec says only that the value is used as given.
- The guard that keeps verify branches off the remote (R-119) is not in this slice. S-005b owns it.
- The evidence of earlier `branches.py` requirements cites verifier tests under `.sdlc/slices/S-001` to `S-004`. These files are not in the tree, so the gate could not run them. Their committed tests ran green in `npm test`.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-008 | "\| `state` \| `state-<UTC timestamp, %Y%m%d%H%M%S>` \| `sdlc/state-20261008101500` \| pr \|" | VS-1, VS-2 | 9 | pass |
| R-009 | "\| `verify` \| `<sliceId>-v<round>-<profile>-<part>` \| `sdlc/S-001-v0-http-api-0` \| never \|" | VS-3, VS-4, VS-5, VS-7 | 25 | pass |
| R-010 | "\| `attempt` \| `<sliceId>-attempt-<n>` \| `sdlc/S-001-attempt-1` \| never (deleted on the remote when present) \|" | VS-3, VS-4, VS-5, VS-6, VS-7 | 20 | pass |

The slice's committed tests in `skills/sdlc/test/branches.test.mjs` (tests.md):
- T-R-008a `name --kind state prints sdlc/state- and the current UTC time` (R-008, characterization): `skills/sdlc/test/branches.test.mjs:486`
- T-R-008b `an explicit state ts is used as given under a prefixed format, and an empty ts generates one` (R-008, characterization): `skills/sdlc/test/branches.test.mjs:461`
- T-R-009a and T-R-010a, the verify and attempt rows in `name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds`: `skills/sdlc/test/branches.test.mjs:606`
- T-R-009b and T-R-010b, the verify and attempt keys in `tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part`: `skills/sdlc/test/branches.test.mjs:632`
- T-R-009b and T-R-010b, `verify_lower` and `attempt_lower` in `name for the run, milestone, e2e, verify and attempt kinds follows a prefixed and a lowercased format and fails without its part`: `skills/sdlc/test/branches.test.mjs:673`
- T-R-009c and T-R-010c, the rows "verify without --profile" and "attempt without --n" in `name without a required part exits 2 with one JSON error and no traceback`: `skills/sdlc/test/branches.test.mjs:500`

The spec-fidelity verifier ran the three acceptance commands at de9cf46, and each printed the expected branch. `node --test skills/sdlc/test/branches.test.mjs` gave 33 pass and 0 fail.

## Scenarios
Round 0 ran all 44 cases at commit de9cf46. No fix round followed, so each result below is the round 0 result. The gate ran the 45 verifier tests again at b9e547f, and all passed. Test paths under `.sdlc/slices/S-005a/verification/` are the verifiers' tests. The retention prune can remove them after merge.

### VS-1 · The loop asks for a state branch with no timestamp and gets sdlc/state- plus 14 UTC digits
Profiles: cli, contract. Risk: a local clock or a fixed value in the state tail gives a wrong or colliding state branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | The state branch is `sdlc/state-` plus the current UTC time in five time zones | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:47` |
| TC-cli-2 | The state tail stays the same inside custom formats and ignores extra flags | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:65` |
| TC-contract-2 | API state names lie in the UTC window under six time zones | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:118` |
| TC-contract-3 | Property (2000 runs): state names stay in the UTC window | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:142` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-1 · State name is sdlc/state- plus 14 UTC digits under far time zones · PASS
- **Given** A scratch git repo with no config. **When** Branches.py name --repo <repo> --kind state runs under TZ Pacific/Kiritimati, America/Adak, Etc/GMT+12, Etc/GMT-14 and unset. **Then** Each run exits 0 with one JSON line and empty stderr. The branch is sdlc/state-<14 digits>. The digits are a valid UTC %Y%m%d%H%M%S between two UTC clock reads.
- **Expected** Sdlc/state- plus the current UTC time in 14 digits, in every TZ. **Actual** All five runs exit 0. E.g. TZ=Pacific/Kiritimati gave sdlc/state-20261009075249, inside the UTC read window.
- **Spec source:** R-008 acceptance · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-1 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
$ TZ=Pacific/Kiritimati python3 branches.py name --repo <repo> --kind state
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "state", "branch": "sdlc/state-20261009075249"}
--- stderr (empty)
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-1.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-1.txt)

#### TC-cli-2 · State name keeps its tail under custom formats and ignores extra flags · PASS
- **Given** A scratch repo, and a repo with branchFormat team/{name}/wip. **When** Name --kind state with --format feature/PROJ-1-{name}, {name:lower}, extra --id/--n/--round/--profile/--part flags, and the config format. **Then** Exit 0. The tail stays state-<14 digits> inside the prefix and suffix.
- **Expected** Feature/PROJ-1-state-<14>, sdlc/state-<14>, team/state-<14>/wip. **Actual** All match.
- **Spec source:** R-008 acceptance; spec section 1 table · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-2 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-2.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-2.txt)

#### TC-contract-2 · State name gives state- and 14 UTC digits under far time zones · PASS
- **Given** TZ in Pacific/Kiritimati, America/Adak, Etc/GMT+12, Etc/GMT-14, Asia/Kathmandu, UTC. 4 formats. **When** Call name(fmt,'state') and tail('state'). **Then** Digits are in the UTC window between two clock reads.
- **Expected** 14 digits inside UTC window. **Actual** All zones: e.g. state-20261009075236 in window [20261009075236,20261009075236].
- **Spec source:** R-008 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
TZ=Pacific/Kiritimati tail=state-20261009075236 window=[20261009075236,20261009075236]
TZ=Etc/GMT+12 tail=state-20261009075236 window=[20261009075236,20261009075236]
```

#### TC-contract-3 · Property: the state name stays in the UTC window for any extra parts · PASS
- **Given** Random formats and extra parts, TZ=Pacific/Kiritimati. **When** Call name(fmt,'state',...extra). **Then** Prefix+state-+14 digits in window+suffix.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-008 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=state-utc-window seed=3014625680 runs=2000 result=0 violations`

</details>

### VS-2 · A caller gives an explicit state timestamp and it is used as given
Profiles: contract, cli. Risk: an explicit timestamp that is changed or lost breaks the state branch a caller asked for.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-21 | The CLI refuses `--ts` with one JSON error | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:267` |
| TC-contract-4 | An explicit `ts` is kept; empty and `None` generate one | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:166` |
| TC-contract-5 | Property (2000 runs): any 14-digit `ts` passes through unchanged | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:184` |
| TC-contract-6 | Corner `ts` values do not raise; they are used as given | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:193` |
| TC-contract-16 | The CLI refuses `--ts` with one JSON error | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:355` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-21 · An explicit --ts flag is refused with one JSON error and no traceback · PASS
- **Given** A scratch repo. **When** Name --kind state --ts 20261008101500, --ts=..., and the abbreviation --t ... **Then** Exit 2, one JSON error, no branch, no traceback, no tree change.
- **Expected** Clean refusal (the CLI has no --ts flag. The explicit ts is an API part). **Actual** {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"} with exit 2 for each form.
- **Spec source:** Spec section 2: CLI synopsis has no --ts; exit 2 on bad input · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-21 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
$ python3 branches.py name --repo <repo> --kind state --ts 20261008101500
exit: 2
{"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-21.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-21.txt)

#### TC-contract-4 · An explicit ts is used as given; empty and None generate one · PASS
- **Given** Ts='20261008101500', '' and None. **When** Call name and tail with ts. **Then** Explicit ts verbatim. Empty and None give 14 UTC digits.
- **Expected** Sdlc/state-20261008101500. **Actual** Sdlc/state-20261008101500. Feature/PROJ-1-state-20261008101500 under {name:lower}.
- **Spec source:** R-008 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
name('sdlc/{name}','state',ts='20261008101500') -> sdlc/state-20261008101500
```

#### TC-contract-5 · Property: any 14-digit ts passes through unchanged · PASS
- **Given** Random 14-digit ts and formats. **When** Call name(fmt,'state',ts). **Then** Prefix+state-+ts+suffix.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-008 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=state-explicit-ts seed=3014625733 runs=2000 result=0 violations`

#### TC-contract-6 · Corner ts values never raise an unexpected exception · PASS
- **Given** Ts = 0, 1.5, True, list, traversal, newline, ESC, @{-1}, 300 chars, Arabic-Indic digits. **When** Call name('sdlc/{name}','state',ts). **Then** No exception. Values used as given.
- **Expected** Used as given. **Actual** All return. E.g. ts=0 -> sdlc/state-0, ts='../../x' -> sdlc/state-../../x.
- **Spec source:** R-008 acceptance (used as given) · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Files: [contract-0-run.txt](../../slices/S-005a/verification/r0/logs/contract-0-run.txt)

#### TC-contract-16 · Consumer view: the CLI refuses --ts with one JSON error · PASS
- **Given** Scratch repo. **When** Run name --kind state --ts 20261008101500. **Then** Exit 2, one JSON line, no stderr, tree unchanged.
- **Expected** Exit 2. **Actual** Exit=2 {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}.
- **Spec source:** R-008 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```console
exit=2 {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
```

</details>

### VS-3 · The loop names a verify branch for a round, profile and part, round 0 and part 0 included
Profiles: cli, contract. Risk: a truthiness check can drop round 0 or part 0. A wrong tail gives a wrong verify branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | The spec verify example and 50 combinations match the loop builder | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:85` |
| TC-cli-22 | No kind or an unknown kind exits 2; a non-git unicode path works | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:277` |
| TC-contract-1 | The API exposes `tail` and `name` with the verify and attempt kinds | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:86` |
| TC-contract-7 | The spec verify example holds through the API | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:203` |
| TC-contract-8 | Property (2000 runs): verify names equal the spec template and loop builder | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:216` |
| TC-contract-17 | Property (120 runs): CLI output equals the API output | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:367` |
| TC-contract-18 | Property (2000 runs): integer and string parts give the same tail | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:387` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-3 · Verify name matches the spec example, the loop builder and every catalog profile · PASS
- **Given** A scratch repo. **When** Name --kind verify --id S-001 --round 0 --profile http-api --part 0. Then 50 combinations of 5 ids (S-001, S-fix-3, S-fix-M-1-2, S-013a, S-999), 10 profiles, rounds 0-12 and parts 0-10. **Then** Exit 0, one JSON line, no stderr. Branch equals sdlc/<id>-v<round>-<profile>-<part> and the sdlc-loop.js builder. A second run prints the same line.
- **Expected** Sdlc/S-001-v0-http-api-0. **Actual** Sdlc/S-001-v0-http-api-0. All 50 combinations equal the loop builder output.
- **Spec source:** R-009 acceptance · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-3 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
$ python3 branches.py name --repo <repo> --kind verify --id S-001 --round 0 --profile http-api --part 0
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "verify", "branch": "sdlc/S-001-v0-http-api-0"}
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-3.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-3.txt)

#### TC-cli-22 · Name with no --kind or an unknown kind is refused; a non-git directory with a space and unicode works · PASS
- **Given** A scratch repo and a plain directory "not a repo ü". **When** Name without --kind. Name --kind verif. Name --kind attempt and --kind verify with --repo and cwd set to the plain directory. **Then** The first two exit 2 with a JSON error. The last two exit 0 with the default names.
- **Expected** Clean refusals. Sdlc/S-001-attempt-1 and sdlc/S-001-v0-http-api-0. **Actual** As expected.
- **Spec source:** Spec section 2: exit 2 on bad input; R-009 and R-010 acceptance · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-22 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-22.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-22.txt)

#### TC-contract-1 · The public surface exposes tail and name with verify and attempt kinds · PASS
- **Given** Branches.py loaded by path as a consumer. **When** List public names, signatures and imports. **Then** Tail and name signatures hold, KINDS holds verify and attempt, imports are stdlib only.
- **Expected** As stated. **Actual** As stated.
- **Spec source:** R-009 quote, R-010 quote · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```console
tail(kind, **parts); name(fmt, kind, **parts); split(fmt); load_format(repo); validate_format(fmt); class Fail
KINDS=('run','slice','milestone','e2e','e2e-area','state','verify','attempt')
imports: argparse json os re subprocess sys (stdlib only)
```

#### TC-contract-7 · Spec example: verify round 0 part 0 · PASS
- **Given** Id S-001, round 0, profile http-api, part 0. Also S-fix-M-1-2 and S-013a. **When** Call name and tail. **Then** Sdlc/S-001-v0-http-api-0.
- **Expected** Sdlc/S-001-v0-http-api-0. **Actual** Sdlc/S-001-v0-http-api-0, S-001-v0-http-api-0, sdlc/S-fix-M-1-2-v12-concurrency-7, sdlc/S-013a-v1-i18n-0.
- **Spec source:** R-009 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
name('sdlc/{name}','verify',id='S-001',round=0,profile='http-api',part=0) -> sdlc/S-001-v0-http-api-0
```

#### TC-contract-8 · Property: verify name equals the spec template, is deterministic and matches the loop builder · PASS
- **Given** Random ids (split, fix), rounds and parts incl. 0, every catalog profile, 9 formats. **When** Call name twice and tail. **Then** Reference model from the spec row.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-009 quote · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=verify-template seed=3014625699 runs=2000 result=0 violations`

#### TC-contract-17 · Consumer view: CLI output equals API name for sampled inputs · PASS
- **Given** 120 sampled verify and attempt inputs. **When** Run the CLI and the API. **Then** Same branch, exit 0, no stderr.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-009, R-010 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=cli-equals-api seed=3014625767 runs=120 result=0 violations (CLI-bound sample)`

#### TC-contract-18 · Property: integer and string parts give the same tail · PASS
- **Given** Random rounds, parts and n as int and as str. **When** Call tail for both. **Then** Same tail, equal to reference.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-009, R-010 quote · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=int-string-equal seed=3014625560 runs=2000 result=0 violations`

</details>

### VS-4 · A verify branch request with a missing or malformed part is refused cleanly
Profiles: cli, security, contract. Risk: a missing or hostile verify part crashes the CLI, gets a silent default, or changes a ref.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | Each missing or empty verify part exits 2 with a JSON error that names it | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:115` |
| TC-cli-5 | Malformed `--round` and `--part` exit 2 or give an ASCII integer | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:136` |
| TC-cli-6 | Hostile `--profile` and `--id` never crash and stay behind the prefix | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:162` |
| TC-cli-24 | Seed probe: six of seven hostile verify names fail `git check-ref-format` | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:310` |
| TC-contract-9 | A missing, `None` or empty verify part raises `Fail` that names it | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:235` |
| TC-contract-10 | Property (2000 runs): the first missing verify part is the one named | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:254` |
| TC-contract-19 | Hostile API values do not raise; 26 of 34 names fail `git check-ref-format` | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:407` |
| TC-security-1 | The spec verify example holds as the attack baseline | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:72` |
| TC-security-2 | Each missing or empty verify part is refused at the CLI and the API | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:79` |
| TC-security-3 | 150 malformed `--round` and `--part` calls: no crash, only ASCII integers | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:100` |
| TC-security-4 | 250 hostile `--id` and `--profile` calls: no crash, no state change | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:119` |
| TC-security-5 | A placeholder in a profile is not expanded a second time | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:142` |
| TC-security-6 | Abbreviated, repeated and equals-form flags resolve to one flag or exit 2 | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:151` |
| TC-security-12 | `name` calls git only for `check-ref-format`, never a ref change | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:241` |

<details>
<summary>Case detail (14 cases)</summary>

#### TC-cli-4 · Verify name with a missing or empty part exits 2 with one JSON error naming it · PASS
- **Given** A scratch repo. **When** Name --kind verify with each of --id, --round, --profile, --part left out. With empty --id and --profile. With a --repo that does not exist. **Then** Exit 2, one JSON line {ok:false,error} that names the part, no traceback, empty stderr, no tree change.
- **Expected** Error names id, round, profile, part. **Actual** "a verify branch name needs a non-empty <part>" for each part. "--repo ... is not a directory" for the missing dir.
- **Spec source:** R-009 (spec section 2: exit 2 with {"ok": false, "error"} on bad input) · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-4 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
without --round -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty round"}
without --part  -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty part"}
empty --profile -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty profile"}
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-4.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-4.txt)

#### TC-cli-5 · Malformed --round and --part are refused or give an ASCII integer · PASS
- **Given** A scratch repo. **When** Name --kind verify with --round and --part set to 1.5, 0x1, empty, spaced, 1_0, +1, -1, 00, unicode digits, huge integers and the integer-forms corpus. **Then** Each run exits 2 with a JSON error that names the flag, or exits 0 with an ASCII integer in the tail. Never a traceback, never stderr.
- **Expected** No crash. Output is ASCII. **Actual** Non-integers are refused with exit 2. Unicode digits and huge values are accepted and normalized to ASCII (see seeds).
- **Spec source:** Spec section 2: exit 2 with {"ok": false, "error"} on bad input · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-5 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

Side effects: Every run: tree unchanged (asserted).

Files: [cli-0-TC-cli-5.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-5.txt)

#### TC-cli-6 · Hostile --profile and --id values never crash and never escape the format prefix · PASS
- **Given** A scratch repo. **When** Name --kind verify with --profile and --id taken from the traversal, control-chars, flag-like-values, unicode-whitespace, injection, format-strings, unicode-confusables and oversized corpus families. **Then** Exit 0 or 2, one JSON line, no stderr, no traceback, no tree change. Any accepted name starts with sdlc/ and ends with -0.
- **Expected** No crash, no escape of the prefix. **Actual** All runs held the contract. Some accepted names are not valid refs (see seed).
- **Spec source:** Spec section 2: one JSON object per command; exit 2 on bad input · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-6 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

Side effects: Every run: tree unchanged (asserted).

Files: [cli-0-TC-cli-6.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-6.txt)

#### TC-cli-24 · Ref safety of accepted verify names (seed probe, not in scope) · PASS
- **Given** A scratch repo. **When** Name --kind verify with --profile ../x, "a b", x~1, x@{1}, a:b, -v and --id S-001.lock/x. Each accepted name goes to git check-ref-format --branch. **Then** Record whether name returns names that git refuses.
- **Expected** A record only. No requirement bounds part values. **Actual** Six of seven probes exit 0 with a name that git check-ref-format refuses, e.g. sdlc/S-001-v0-../x-0.
- **Spec source:** None (seed) · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-24 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
--profile="../x" exit 0 sdlc/S-001-v0-../x-0 check-ref-format=false
--profile="a b" exit 0 sdlc/S-001-v0-a b-0 check-ref-format=false
--profile="x~1" exit 0 sdlc/S-001-v0-x~1-0 check-ref-format=false
--profile="x@{1}" exit 0 sdlc/S-001-v0-x@{1}-0 check-ref-format=false
--profile="a:b" exit 0 sdlc/S-001-v0-a:b-0 check-ref-format=false
--id="S-001.lock/x" exit 0 sdlc/S-001.lock/x-v0-http-api-0 check-ref-format=false
--profile="-v" exit 0 sdlc/S-001-v0--v-0 check-ref-format=true
```

#### TC-contract-9 · A missing, None or empty verify part raises Fail that names the part · PASS
- **Given** Each of id, round, profile, part omitted, None or ''. **When** Call tail and name. **Then** Fail 'a verify branch name needs a non-empty <part>'.
- **Expected** Fail names the part. **Actual** Fail names id, round, profile, part.
- **Spec source:** R-009 quote (all four parts) · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
a verify branch name needs a non-empty id | ... round | ... profile | ... part
```

#### TC-contract-10 · Property: dropping any subset of verify parts fails on the first missing part · PASS
- **Given** Random subsets dropped by omit, None or ''. **When** Call tail('verify'). **Then** Fail on first missing part in order.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-009 quote · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=verify-missing-part seed=3014625748 runs=2000 result=0 violations`

#### TC-contract-19 · Hostile profiles and ids through the API never raise; unsafe names recorded · PASS
- **Given** 17 hostile values as profile and as attempt id. **When** Call name. Run git check-ref-format on each result. **Then** No exception.
- **Expected** No exception. 26 of 34 names refused by check-ref-format (seed). **Actual** No exception.
- **Spec source:** R-009, R-010 (no requirement covers unsafe values; seed) · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Files: [contract-0-run.txt](../../slices/S-005a/verification/r0/logs/contract-0-run.txt)

#### TC-security-1 · The acceptance verify name holds as the attack baseline · PASS
- **Given** A scratch git repo with sdlc/S-001. **When** Name --kind verify --id S-001 --round 0 --profile http-api --part 0. **Then** Exit 0, one JSON line, branch sdlc/S-001-v0-http-api-0.
- **Expected** Exit 0, one JSON line, branch sdlc/S-001-v0-http-api-0. **Actual** Sdlc/S-001-v0-http-api-0, exit 0, tree unchanged.
- **Spec source:** R-009 acceptance · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: name --kind verify --id S-001 --round 0 --profile http-api --part 0
observed: sdlc/S-001-v0-http-api-0, exit 0, tree unchanged
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt)

#### TC-security-2 · Each missing or empty verify part exits 2 with one JSON error that names the part · PASS
- **Given** The baseline verify arguments. **When** Omit, or give as empty, each of --id, --round, --profile, --part. Call tail('verify') with None and '' for each part. **Then** Exit 2, one JSON error naming the part, no traceback, no ref. Tail raises Fail naming the part. Round 0 and part 0 are kept.
- **Expected** Exit 2, one JSON error naming the part, no traceback, no ref. Tail raises Fail naming the part. Round 0 and part 0 are kept. **Actual** 8 of 8 CLI calls exit 2 and name the part (empty --round and --part are refused by argparse with 'argument --round: invalid int value'). 8 of 8 API calls raise Fail naming the part. Tail with round 0 and part 0 gives S-001-v0-http-api-0.
- **Spec source:** R-009 acceptance; VS-4 notes · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: omit, or give as empty, each of --id, --round, --profile, --part; call tail('verify') with None and '' for each part
observed: 8 of 8 CLI calls exit 2 and name the part (empty --round and --part are refused by argparse with 'argument --round: invalid int value'); 8 of 8 API calls raise Fail naming the part; tail with round 0 and part 0 gives S-001-v0-http-api-0
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-3 · Malformed --round and --part exit 2 or give an ASCII integer, never a crash · PASS
- **Given** The baseline verify arguments. **When** Give 75 hostile values to --round and to --part (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, 1.5, 0x1, ' 1', abc). **Then** Each call exits 0 with an ASCII integer in the name, or exits 2 with one JSON error. No traceback, no stderr, no tree change.
- **Expected** Each call exits 0 with an ASCII integer in the name, or exits 2 with one JSON error. No traceback, no stderr, no tree change. **Actual** 150 calls: 102 exit 2, 48 exit 0. Every exit 0 holds an ASCII integer. Accepted forms include -1, +1, 1_000, padded, unicode digits and 4300 digits (argparse int). No crash.
- **Spec source:** VS-4 notes; R-009 tail shape · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: give 75 hostile values to --round and to --part (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, 1.5, 0x1, ' 1', abc)
observed: 150 calls: 102 exit 2, 48 exit 0. Every exit 0 holds an ASCII integer. Accepted forms include -1, +1, 1_000, padded, unicode digits and 4300 digits (argparse int). No crash
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-4 · Hostile --id and --profile never crash, never change state, and are used verbatim behind the sdlc/ prefix · PASS
- **Given** The baseline verify arguments. **When** Give each of 125 argv-safe corpus values to --id and to --profile. **Then** Exit 0 with sdlc/<id>-v0-<profile>-0 verbatim, or exit 2. One JSON line. No tree change.
- **Expected** Exit 0 with sdlc/<id>-v0-<profile>-0 verbatim, or exit 2. One JSON line. No tree change. **Actual** 250 calls, all clean. Every exit 0 is the verbatim tail behind sdlc/. 73 ok names fail git check-ref-format (control chars, '..', '@{', spaces): no requirement for this kind asks name to check the full ref, so this is a known seed, not a failure.
- **Spec source:** VS-4 notes; seed already in barraiser.json (name does not run git check-ref-format on the full name) · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: give each of 125 argv-safe corpus values to --id and to --profile
observed: 250 calls, all clean. Every exit 0 is the verbatim tail behind sdlc/. 73 ok names fail git check-ref-format (control chars, '..', '@{', spaces): no requirement for this kind asks name to check the full ref, so this is a known seed, not a failure
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-5 · A profile that holds a placeholder is not expanded a second time · PASS
- **Given** A lower format feature/{name:lower}. **When** --profile '{name}' and --profile '{name:lower}{0}%s'. **Then** The profile text stays literal.
- **Expected** The profile text stays literal. **Actual** Feature/s-001-v0-{name}-0 and sdlc/S-001-v0-{name:lower}{0}%s-0.
- **Spec source:** R-009 tail; spec section 2 name(fmt, kind, **parts) · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: --profile '{name}' and --profile '{name:lower}{0}%s'
observed: feature/s-001-v0-{name}-0 and sdlc/S-001-v0-{name:lower}{0}%s-0
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-6 · Abbreviated, duplicated and equals-form flags resolve to one flag or exit 2 · PASS
- **Given** The baseline verify arguments. **When** Append --p, --pr, --pa, --r, --ro and longer prefixes with 7. Give --profile twice. Give --profile=--format. **Then** An ambiguous prefix exits 2. Others resolve to one flag. No crash.
- **Expected** An ambiguous prefix exits 2. Others resolve to one flag. No crash. **Actual** --p and --r exit 2 (ambiguous). --pr/--pa/--ro resolve to profile/part/round (allow_abbrev, seed already in barraiser.json). Last --profile wins. --profile=--format gives sdlc/S-001-v0---format-0.
- **Spec source:** VS-4 notes · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: append --p, --pr, --pa, --r, --ro and longer prefixes with 7; give --profile twice; give --profile=--format
observed: --p and --r exit 2 (ambiguous). --pr/--pa/--ro resolve to profile/part/round (allow_abbrev, seed already in barraiser.json). Last --profile wins. --profile=--format gives sdlc/S-001-v0---format-0
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-12 · name runs git only for check-ref-format, never a ref-changing command · PASS
- **Given** A git shim first on PATH that logs each call and then runs the real git. **When** 6 verify and attempt calls, valid and hostile. **Then** Every git call is check-ref-format --branch.
- **Expected** Every git call is check-ref-format --branch. **Actual** 5 git calls, each 'check-ref-format --branch sdlc/S-001'. The argparse refusal makes no git call. No push, branch or update-ref.
- **Spec source:** VS-4 and VS-6 notes (no ref created) · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: 6 verify and attempt calls, valid and hostile
observed: 5 git calls, each 'check-ref-format --branch sdlc/S-001'; the argparse refusal makes no git call; no push, branch or update-ref
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

</details>

### VS-5 · The loop names an attempt branch for a slice and attempt number
Profiles: cli, contract. Risk: a wrong attempt tail gives a branch that later sweeps cannot find.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7 | Attempt names for plain, fix and split ids; `--n 0` is kept | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:184` |
| TC-cli-23 | Verify and attempt output is the same in CI and under another locale | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:294` |
| TC-contract-11 | The spec attempt example, a fix id, `n=0` and a huge `n` hold | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:279` |
| TC-contract-12 | Property (2000 runs): attempt names equal the spec template | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:291` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-7 · Attempt name matches the spec example for plain, fix and split ids · PASS
- **Given** A scratch repo. **When** Name --kind attempt with --id S-001 --n 1. S-fix-M-1-2 --n 3. S-013a --n 0. S-001 --n 123456789. And extra --round/--profile/--part/--area flags. **Then** Exit 0, one JSON line, no stderr. Branch is sdlc/<id>-attempt-<n>. N=0 is kept.
- **Expected** Sdlc/S-001-attempt-1 etc. **Actual** Sdlc/S-001-attempt-1, sdlc/S-fix-M-1-2-attempt-3, sdlc/S-013a-attempt-0, sdlc/S-001-attempt-123456789, sdlc/S-001-attempt-2.
- **Spec source:** R-010 acceptance · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-7 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
$ python3 branches.py name --repo <repo> --kind attempt --id S-001 --n 1
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "attempt", "branch": "sdlc/S-001-attempt-1"}
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-7.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-7.txt)

#### TC-cli-23 · Verify and attempt names are the same on every run, in CI and under another locale · PASS
- **Given** A scratch repo. **When** Name --kind verify --id S-005a --round 0 --profile cli --part 0 and --kind attempt --id S-005a --n 0, three times each: plain env, CI=true, LC_ALL=tr_TR.UTF-8, stdin empty. **Then** Exit 0 and the same stdout line on every run.
- **Expected** Sdlc/S-005a-v0-cli-0 and sdlc/S-005a-attempt-0. **Actual** As expected.
- **Spec source:** R-009 and R-010 acceptance · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-23 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-23.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-23.txt)

#### TC-contract-11 · Spec example: attempt n=1, fix id, n=0, huge n, extra parts ignored · PASS
- **Given** Id S-001 / S-fix-M-1-2, n 0, 1, 3, 10**15. **When** Call name and tail. **Then** Sdlc/S-001-attempt-1.
- **Expected** Sdlc/S-001-attempt-1. **Actual** Sdlc/S-001-attempt-1, S-001-attempt-1, sdlc/S-fix-M-1-2-attempt-3, sdlc/S-001-attempt-0, sdlc/S-001-attempt-1000000000000000.
- **Spec source:** R-010 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
tail('attempt',id='S-001',n=1) -> S-001-attempt-1
```

#### TC-contract-12 · Property: attempt name equals the spec template; extra parts never leak · PASS
- **Given** Random ids, n, extra round/profile/part/area, 9 formats. **When** Call name and tail. **Then** Reference model from the spec row.
- **Expected** 0 violations. **Actual** 0 violations.
- **Spec source:** R-010 quote · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

Property run: `property=attempt-template seed=3014625782 runs=2000 result=0 violations`

</details>

### VS-6 · An attempt branch request with a missing or malformed number is refused cleanly
Profiles: cli, security, contract. Risk: a missing or hostile attempt number crashes the CLI, runs a shell or changes a file.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-8 | A missing or malformed attempt number exits 2 or gives an ASCII integer | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:201` |
| TC-contract-13 | A missing, `None` or empty attempt part raises `Fail` that names it | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:308` |
| TC-security-7 | The spec attempt example holds, and `n = 0` is kept | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:168` |
| TC-security-8 | A missing or empty attempt part is refused at the CLI and the API | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:177` |
| TC-security-9 | 73 malformed `--n` calls: no crash, only ASCII integers | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:195` |
| TC-security-10 | 125 hostile attempt ids: no crash, used as given | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:212` |
| TC-security-11 | Shell metacharacters run no shell and change no file | PASS | `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:227` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-8 · Attempt name with a missing or malformed number exits 2 or gives an ASCII integer · PASS
- **Given** A scratch repo. **When** Name --kind attempt without --n, without --id, with empty --id, and with --n from abc, 1.0, empty, -1 and the integer-forms, unicode-digits and huge-integers corpus. **Then** Missing parts: exit 2 with one JSON error naming n or id. Malformed n: exit 2 naming --n, or exit 0 with an ASCII integer. Never a traceback.
- **Expected** Clean refusals. **Actual** Without --n -> "a attempt branch name needs a non-empty n". Without --id -> "... non-empty id". Non-integers refused. Unicode digits normalized.
- **Spec source:** Spec section 2: exit 2 with {"ok": false, "error"} on bad input · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-8 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
without --n  -> exit 2 {"ok": false, "error": "a attempt branch name needs a non-empty n"}
without --id -> exit 2 {"ok": false, "error": "a attempt branch name needs a non-empty id"}
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-8.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-8.txt)

#### TC-contract-13 · A missing, None or empty attempt part raises Fail that names the part · PASS
- **Given** Id or n omitted, None or ''. **When** Call tail and name. **Then** Fail 'a attempt branch name needs a non-empty <part>'.
- **Expected** Fail names the part. **Actual** As expected.
- **Spec source:** R-010 quote · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
n=-1 -> sdlc/S-001-attempt--1; n=False -> sdlc/S-001-attempt-False; n=1.0 -> sdlc/S-001-attempt-1
```

#### TC-security-7 · The acceptance attempt name holds and n = 0 is not dropped · PASS
- **Given** A scratch git repo. **When** Name --kind attempt --id S-001 --n 1, then --n 0. **Then** Sdlc/S-001-attempt-1 and sdlc/S-001-attempt-0.
- **Expected** Sdlc/S-001-attempt-1 and sdlc/S-001-attempt-0. **Actual** As expected, exit 0, tree unchanged.
- **Spec source:** R-010 acceptance · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: name --kind attempt --id S-001 --n 1, then --n 0
observed: as expected, exit 0, tree unchanged
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt)

#### TC-security-8 · A missing or empty attempt part exits 2 with one JSON error that names it · PASS
- **Given** The baseline attempt arguments. **When** Omit, or give as empty, --id and --n. Call tail('attempt') without id, without n, with id '' and n None, and with n 0. **Then** Exit 2 and an error naming the part. Tail Fail naming the part. N 0 kept.
- **Expected** Exit 2 and an error naming the part. Tail Fail naming the part. N 0 kept. **Actual** 4 of 4 CLI calls exit 2 and name the part. 4 API calls raise Fail naming the part. Tail with n 0 gives S-001-attempt-0.
- **Spec source:** R-010 acceptance; VS-6 notes · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: omit, or give as empty, --id and --n; call tail('attempt') without id, without n, with id '' and n None, and with n 0
observed: 4 of 4 CLI calls exit 2 and name the part; 4 API calls raise Fail naming the part; tail with n 0 gives S-001-attempt-0
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-9 · Malformed --n exits 2 or gives an ASCII integer, never a crash · PASS
- **Given** The baseline attempt arguments. **When** Give 73 hostile values to --n (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, abc, 1.0). **Then** Exit 0 with an ASCII integer, or exit 2. No traceback. No tree change.
- **Expected** Exit 0 with an ASCII integer, or exit 2. No traceback. No tree change. **Actual** 73 calls: 50 exit 2, 23 exit 0, all with ASCII integers. -1 gives sdlc/S-001-attempt--1 (seed already in barraiser.json).
- **Spec source:** VS-6 notes · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: give 73 hostile values to --n (integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like-values, injection, -1, abc, 1.0)
observed: 73 calls: 50 exit 2, 23 exit 0, all with ASCII integers. -1 gives sdlc/S-001-attempt--1 (seed already in barraiser.json)
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-10 · Hostile attempt --id never crashes and is used verbatim behind the prefix · PASS
- **Given** The baseline attempt arguments. **When** Give each of 125 argv-safe corpus values to --id. **Then** Exit 0 with sdlc/<id>-attempt-1 verbatim, or exit 2. No tree change.
- **Expected** Exit 0 with sdlc/<id>-attempt-1 verbatim, or exit 2. No tree change. **Actual** 125 calls, all clean and verbatim. 38 ok names fail git check-ref-format (known seed).
- **Spec source:** VS-6 notes · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: give each of 125 argv-safe corpus values to --id
observed: 125 calls, all clean and verbatim; 38 ok names fail git check-ref-format (known seed)
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

#### TC-security-11 · Shell metacharacters in --id and --profile run no shell and change no file · PASS
- **Given** A marker path in a scratch directory that the runner watches. **When** --id and --profile with $(touch M), backticks, ';touch M', '&& touch M', '|touch M' and a newline. **Then** The payload appears verbatim in the name. The marker file does not exist. The watched trees do not change.
- **Expected** The payload appears verbatim in the name. The marker file does not exist. The watched trees do not change. **Actual** 12 calls clean. Payloads verbatim. Marker absent. Repo and marker directory unchanged.
- **Spec source:** VS-6 notes (no shell runs, no file outside the scratch repo changes) · **Run:** `node --test .sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs`

```text
input: --id and --profile with $(touch M), backticks, ';touch M', '&& touch M', '|touch M' and a newline
observed: 12 calls clean; payloads verbatim; marker absent; repo and marker directory unchanged
```

Side effects: cli-runner tree diff of the scratch repo (files and refs) is empty for every call (treeUnchanged asserted per call); stderr is empty for every call

Files: [security-0-run.txt](../../slices/S-005a/verification/r0/logs/security-0-run.txt), [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

</details>

### VS-7 · A team with a custom branch format gets verify and attempt branches inside that format
Profiles: cli, contract. Risk: a team format that loses its prefix or suffix gives branches outside the team's forge rules.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 | Config and flag formats wrap both tails; `--format` wins; bad formats exit 2 | PASS | `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:228` |
| TC-contract-14 | Custom formats wrap both tails and lowercase only the tail | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:320` |
| TC-contract-15 | `--format` wins over `config.branchFormat` at the CLI | PASS | `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:337` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-9 · Custom branch formats wrap verify and attempt tails, --format wins, a bad format exits 2 · PASS
- **Given** Repos with branchFormat feature/PROJ-1-{name:lower}, feature/PROJ-1-{name}, and an invalid config.json. **When** Name --kind verify and --kind attempt with the config format, with --format x/{name}/y, Team/PROJ-1-{name:lower} and sdlc/{name}, and with six invalid formats. **Then** Config formats wrap the tail. The suffix stays after the tail. --format wins over config. Invalid formats and invalid JSON exit 2 with no branch.
- **Expected** Feature/PROJ-1-S-001-v0-http-api-0, feature/PROJ-1-S-001-attempt-1, feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1, x/S-001-attempt-1/y. **Actual** All as expected. Every invalid format exits 2 with an error that names the format.
- **Spec source:** R-009 and R-010 (spec section 1: tail goes into the format) · **Run:** `VERIFY_WT=<worktree> node --test --test-name-pattern="TC-cli-9 " .sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

```console
config feature/PROJ-1-{name:lower} --kind verify -> {"ok": true, ..., "branch": "feature/PROJ-1-s-001-v0-http-api-0"}
config feature/PROJ-1-{name} --kind attempt -> "feature/PROJ-1-S-001-attempt-1"
--format x/{name}/y --kind verify -> "x/S-001-v0-http-api-0/y"
```

Side effects: Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).

Files: [cli-0-TC-cli-9.txt](../../slices/S-005a/verification/r0/logs/cli-0-TC-cli-9.txt)

#### TC-contract-14 · A custom format wraps verify and attempt tails and lowercases only the tail · PASS
- **Given** Feature/PROJ-1-{name:lower}, x/{name}/y, ABC/{name:lower}/DEF. **When** Call name. **Then** Feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1, suffix kept.
- **Expected** As expected. **Actual** As expected. ABC/s-fix-m-1-2-attempt-3/DEF.
- **Spec source:** R-009, R-010 quote; spec format rule · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```text
x/{name}/y verify -> x/S-001-v0-http-api-0/y
```

#### TC-contract-15 · Consumer view: --format wins over config.branchFormat · PASS
- **Given** Scratch repo with branchFormat feature/PROJ-1-{name:lower}. **When** Run branches.py name with and without --format. **Then** Config form, then flag form. Invalid format exits 2, one JSON line, no stderr, tree unchanged.
- **Expected** As expected. **Actual** Config=feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1. Flag=x/S-001-v0-http-api-0/y.
- **Spec source:** R-009, R-010 acceptance · **Run:** `VERIFY_REPO=<worktree> node --test .sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

```console
VS-7 cli: config=feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1 flag=x/S-001-v0-http-api-0/y invalid={"ok": false, "error": "the branch format 'x/{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
```

</details>

## How it was attacked
One security session ran in round 0 at commit de9cf46. The charters were two attack lines: the verify CLI and `tail('verify')` (VS-4), and the attempt CLI and `tail('attempt')` (VS-6). Each line looked for a crash, a silent default, a shell run, or a ref or file change. The threat-model boundary treats the loop and its agents as trusted callers. The spec states no rule for part values beyond a non-empty part. Thus a branch that git refuses is a seed, not a refutation. The session tried 10 attacks: 10 held, 0 broke and 0 were out of scope.

<details>
<summary>Attack table (10 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| ATK-1 missing verify parts | `--id`, `--round`, `--profile`, `--part` omitted or `''` | exit 2, one JSON error naming the part | exit 2, part named; argparse refuses an empty integer | held |
| ATK-2 integer forms on `--round` and `--part` | 75 integer-like and hostile values each | exit 2 or an ASCII integer | 102 refused, 48 ASCII integers, no crash | held |
| ATK-3 hostile verify text | 125 argv-safe corpus values on `--id` and on `--profile` | clean exit, verbatim tail, `sdlc/` prefix, no tree change | all clean; 73 names are ref-unsafe (no requirement covers it) | held |
| ATK-4 placeholders in a part | `--profile '{name}'`, `'{name:lower}{0}%s'` | literal text | literal text | held |
| ATK-5 flag confusion | `--p`, `--pr`, `--ro`, `--par`, `--profile` twice, `--profile=--format` | exit 2 on ambiguity, one flag otherwise | as expected; `allow_abbrev` is a known seed | held |
| ATK-6 missing attempt parts | `--id` and `--n` omitted or `''`; `n` 0 | exit 2 naming the part; `n` 0 kept | as expected | held |
| ATK-7 integer forms on `--n` | 73 values | exit 2 or an ASCII integer | 50 refused, 23 ASCII integers | held |
| ATK-8 hostile attempt ids | 125 corpus values on `--id` | clean, verbatim | clean, verbatim; 38 ref-unsafe (known seed) | held |
| ATK-9 shell metacharacters | `$(touch M)`, backticks, `;`, `&&`, `\|`, newline | no shell runs, no file changes | marker absent, trees unchanged | held |
| ATK-10 git calls through a PATH shim | 6 valid and hostile calls | only `check-ref-format` | only `check-ref-format --branch sdlc/S-001` | held |

Attack log: [security-0-attacks.txt](../../slices/S-005a/verification/r0/logs/security-0-attacks.txt)

</details>

## Defects found on the way

**Blocking defects**

None. No verifier and no review found a blocking defect in S-005a. The spec-fidelity, regression and gate checks held in round 0. All 44 verification cases passed. The architecture, security and test-quality reviews gave only non-blocking findings.

S-005a is a split of S-005, after escalation step 2. The S-005 fix rounds failed on the R-119 push-guard test, not on these tail rows (`.sdlc/slices/S-005/failures.md`). S-005b owns R-119 now. The `verify` and `attempt` rows held spec-fidelity, cli and contract in every S-005 round, and this slice reused them.

**Seeds**

| Seed | Found by | File |
|---|---|---|
| Branch names are not checked as valid refs | security review r0 | `skills/sdlc/branches.py` |
| The `utc` helper occurs twice in `branches.test.mjs` | architecture review r0 | `skills/sdlc/test/branches.test.mjs` |
| The new CLI state test overlaps the existing state tests | test-quality review r0 | `skills/sdlc/test/branches.test.mjs` |
| CLI missing-part rows for verify cover only `--profile` | test-quality review r0 | `skills/sdlc/test/branches.test.mjs` |
| A verify profile such as `Http_API` does not match the spec parse regex | verify-spec-fidelity r0 | `skills/sdlc/branches.py` |
| Grammar in the attempt missing-part error ("a attempt") | verify-spec-fidelity r0 | `skills/sdlc/branches.py` |
| `name` returns ref-unsafe verify and attempt names for hostile `--profile` and `--id` | verify-cli r0 | `skills/sdlc/branches.py` |
| Integer parts accept unicode digits, whitespace and huge values | verify-cli r0 | `skills/sdlc/branches.py` |
| Error text says "a attempt branch name" | verify-cli r0 | `skills/sdlc/branches.py` |
| `tail` and `name` return ref names git refuses (26 of 34 API calls) | verify-contract r0 | `skills/sdlc/branches.py` |
| Verify and attempt parts accept non-integer and negative values through the API | verify-contract r0 | `skills/sdlc/branches.py` |
| An explicit state `ts` is not checked for 14 digits | verify-contract r0 | `skills/sdlc/branches.py` |
| Evidence tests for done requirements are missing from the tree | verify-regression r0 | `.sdlc/requirements.json` |

Some seeds from different agents describe the same gap. The ledger keeps each one as a separate entry.

## Appendix
- Toolkit: `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `property` (`skills/sdlc/test/testkit/property.mjs`, with `skills/sdlc/test/testkit/pycall.py`), `attack-corpus` (`skills/sdlc/test/testkit/attack-corpus.mjs`).
- Round 0 plan: [plan-r0.json](../../slices/S-005a/verification/plan-r0.json), [plan-r0.md](../../slices/S-005a/verification/plan-r0.md).
- Round 0 profile evidence: [cli-0.md](../../slices/S-005a/verification/r0/cli-0.md), [cli-0.json](../../slices/S-005a/verification/r0/cli-0.json), [contract-0.md](../../slices/S-005a/verification/r0/contract-0.md), [contract-0.json](../../slices/S-005a/verification/r0/contract-0.json), [security-0.md](../../slices/S-005a/verification/r0/security-0.md), [security-0.json](../../slices/S-005a/verification/r0/security-0.json).
- Core verifiers: [verify-spec-fidelity-r0.md](../../slices/S-005a/verify-spec-fidelity-r0.md), [verify-regression-r0.md](../../slices/S-005a/verify-regression-r0.md), [gate-r0.md](../../slices/S-005a/gate-r0.md), [suite-receipt.json](../../slices/S-005a/verification/suite-receipt.json).
- Reviews: [review-architecture-r0.md](../../slices/S-005a/review-architecture-r0.md), [review-security-r0.md](../../slices/S-005a/review-security-r0.md), [review-test-quality-r0.md](../../slices/S-005a/review-test-quality-r0.md).
- Plan and tests: [plan.md](../../slices/S-005a/plan.md), [tests.md](../../slices/S-005a/tests.md). ADRs in `.sdlc/DECISIONS.md`:
  - `ADR-20261009-041704-decision-judge-S-003-9e7b`: the state tail is "state-" plus 14 UTC digits.
  - `ADR-20261009-062918-decision-judge-S-005-7fbd`: R-093 moves to S-027.
  - `ADR-20261009-045048-decision-judge-S-004-7815`: tail rows check only for a missing or empty part.
- Slice commits on `sdlc/S-005a` over `origin/main`: f983c13, 7b83b92 (failing tests), a271400, de9cf46 (product change), b9e547f, 813be17, 15c9904. The local `main` is behind `origin/main`. Thus `git log main..sdlc/S-005a` also lists the S-001 to S-004 commits and the split commit cd4371d.
- Missing: `failures.md` does not exist for this slice, because no round failed. The S-005 history is in [S-005 failures.md](../../slices/S-005/failures.md).
