# S-003 · tail contract and format resolution order
Verdict: RELEASED
Commit under test: bb2bd91 (gate ran at a04f40b; last product change 13b17f1) · Rounds: 2 · Attempts: 2 · Risk: medium · Written: 2026-10-09

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 10 | 59 | 59 | 0 | 0 | 1 / 1 | 18 |

## Summary
The slice gives `tail` two more rows, `state` and `e2e-area`, in `skills/sdlc/branches.py`. The `state` tail takes the current UTC time when no `ts` is given. The `name` command now builds a real branch name, with the format from `--format`, then `config.branchFormat`, then `sdlc/{name}`. `preflight` reports the resolved format and a `given` flag. The contract, cli and security profiles ran 59 cases at the module and CLI boundaries, under extreme time zones and with hostile parts. All 59 passed in round 0. The test-quality review then found one blocking gap: no committed test gave `--format` with a broken config. Fix round 1 added T-024, and a mutation check proved that T-024 guards the operand order. Open items are 18 non-blocking seeds, and R-002 stays partial until S-027.

## Open risks
- `name` does not check the parts it puts in a branch. `--id=-c` gives the branch `-c`, and `../x`, `a b` or `HEAD@{1}` give names that git refuses (A-security-17, out of scope). The slices that create branches must check the full name and put `--` before it.
- R-002 is partial by design (ADR-20261009-041833). This slice proves only clause 1. The fresh-run config write closes in S-027 with R-064.
- `--n`, `--round` and `--part` accept Unicode digits, padding and underscores (A-security-13). When S-004 to S-006 consume these parts, `--n=٣` and `--n=3` give the same branch.
- No committed test pins the zero-part filter in `cmd_name`. TC-cli-112 shows it with a patched `TAILS` row. S-004 to S-006 must pin it on their real rows (test-quality review r0, finding 3).
- `cmd_preflight` reads the config two times, and `given` depends on operand order. T-024 now guards the order, but the trap stays in the code.
- Until S-004 to S-006 land, `name` for `run`, `milestone`, `e2e`, `verify` and `attempt` exits 2 with one JSON error (ADR-20261009-041711).
- Later consumers must read the `branch` field of the `name` object, not raw stdout (ADR-20261009-041713).
- The `TC-*` evidence of the done requirements from S-001 and S-002 is pruned, so the regression and gate runs could not run it.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-018 | "`tail(kind, **parts)`: the tail from the table in section 1. `state` without `ts` generates the timestamp. A missing part is a `Fail`." | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-9, VS-10 | 26 | pass |
| R-099 | "A missing part is a `Fail`." | VS-4, VS-5, VS-6, VS-8, VS-9, VS-10 | 27 | pass |
| R-015 | "`--format` overrides the repo's `config.branchFormat`; without either, the default applies. `--repo` is the target repo, whose `.sdlc/config.json` holds the format once a run exists." | VS-5, VS-6, VS-8 | 14 | pass |
| R-012 | "The format is resolved like `commitFormat`: the `--branch-format` flag, else `config.branchFormat` on resume, else the pre-flight's derivation (section 4), else the default." | VS-7, VS-8 | 6 | pass (derivation belongs to S-015 to S-017) |
| R-002 | "The default is `sdlc/{name}`." | VS-5, VS-8 | 5 | pass for clause 1; clause 2 closes in S-027 (ADR-20261009-041833) |

The slice's committed tests in `skills/sdlc/test/branches.test.mjs`:
- T-019 `tail builds the slice, state and e2e-area tails and fails on a missing part` (R-018): `skills/sdlc/test/branches.test.mjs:436`
- T-020 `the state tail is the current UTC time` (R-018): `skills/sdlc/test/branches.test.mjs:461`
- T-021 `name without a required part exits 2 with one JSON error and no traceback` (R-099): `skills/sdlc/test/branches.test.mjs:474`
- T-022 `name takes the format from the flag, then the config, then the default` (R-015): `skills/sdlc/test/branches.test.mjs:490`
- T-023 `preflight reports the resolved format and whether it was given` (R-012, R-002): `skills/sdlc/test/branches.test.mjs:523`
- T-024 `the --format flag wins over a broken config in name and preflight` (R-015, fix round 1): `skills/sdlc/test/branches.test.mjs:560`
- T-006 `load_format returns the config value or the default` (R-002 clause 1): `skills/sdlc/test/branches.test.mjs:142`

## Scenarios
Round 0 ran all 59 cases at commit 13b17f1. Round 1 ran no scenario, because its fix commit 1921d70 changed only tests (plan-r1, "Changes since round 0"). The regression verifier re-ran the whole suite in round 1. So each result below is the round 0 result. Test paths under `.sdlc/slices/S-003/verification/` are the verifiers' tests; the retention prune can remove them after merge.

### VS-1 · a caller builds the slice tail through the Python API
Profiles: contract. Risk: a wrong slice tail renames every slice branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | tail("slice", id="S-001") returns the str "S-001" | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:81` |
| TC-contract-2 | A slice tail with a missing, empty or None id raises Fail | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:86` |
| TC-contract-3 | Property: the slice tail equals the id and extra parts do not change it | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:94` |
| TC-contract-11 | tail is deterministic for the same input | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:195` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-1 · tail("slice", id="S-001") returns the str "S-001" · PASS
- **Given** branches.py imported by path from a scratch cwd **When** tail("slice", id="S-001") **Then** the value is "S-001" and its type is str
- **Expected** return "S-001", type str **Actual** return "S-001", type str
- **Spec source:** R-018 acceptance · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (file-tree): surface listing of branches.py.

  ```diff
  python3 -I (scratch cwd): sys.path.insert(0, 'skills/sdlc'); import branches
  def tail(kind, **parts)
  def name(fmt, kind, **parts)
  def split(fmt)
  def load_format(repo)
  def validate_format(fmt)
  def load_git_modes(path=<skill>/git-modes.json)
  def main(argv=None); build_parser(); cmd_name/cmd_parse/cmd_list/cmd_preflight(ns)
  class Fail(Exception)   mro: Fail, Exception, BaseException, object
  class JsonArgumentParser(argparse.ArgumentParser)
  DEFAULT_FORMAT = 'sdlc/{name}'; PLACEHOLDERS = ('{name}', '{name:lower}')
  KINDS = ('run','slice','milestone','e2e','e2e-area','state','verify','attempt')
  NAME_PARTS = ('id','n','area','round','profile','part')
  TAILS rows: ['slice', 'state', 'e2e-area']
  re-exported imports: datetime, timezone
  not yet present (later slices): parse, list_kind, read_rules, evaluate, derive
  ```

- Evidence (property-run): tail('slice', id='S-001') -> {'outcome': 'return', 'value': 'S-001', 'type': 'str'}
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-2 · A slice tail with a missing, empty or None id raises Fail · PASS
- **Given** the slice kind requires id **When** tail('slice'), tail('slice', id=''), tail('slice', id=None), tail('slice', area='api') **Then** each call raises branches.Fail and the message names id
- **Expected** Fail naming id; no KeyError or TypeError **Actual** Fail: a slice branch name needs a non-empty id (all four calls)
- **Spec source:** R-018 quote: A missing part is a Fail · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): 4 calls -> outcome Fail, type Fail, message 'a slice branch name needs a non-empty id'; mutation check: with the empty-string test removed from tail(), this case fails
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-3 · Property: the slice tail equals the id and extra parts do not change it · PASS
- **Given** 1000 generated non-empty ids (unicode, braces, format strings, 300-char ids) with random extra parts n, round, part, profile, ts, unknown **When** tail('slice', id=<id>, **extra) **Then** the result is exactly the id as a str
- **Expected** tail == id for every input **Actual** 0 violations in 1000 runs
- **Spec source:** R-018 quote; spec section 1 table (slice tail is <sliceId>) · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): property tail slice: seed=20261009 runs=1000 violations=0; reference model written from the spec text; no shrinking in the toolkit; no counterexample
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-11 · tail is deterministic for the same input · PASS
- **Given** slice, e2e-area and state (with ts) inputs **When** each call made three times in one process **Then** the three results are equal
- **Expected** equal results **Actual** equal results
- **Spec source:** R-018 quote (the tail from the table) · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): 3 x [S-001, M-1-e2e-ui, state-20261008101500] identical
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

</details>

### VS-2 · the state tail takes the current UTC time when no ts is given
Profiles: contract, cli. Risk: a local-time or wrongly ordered stamp gives state branches that are hours off.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | The state tail without ts is the current UTC time, also under extreme time zones | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:102` |
| TC-contract-5 | The state tail keeps a given ts | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:118` |
| TC-contract-6 | Property: the state tail keeps a given ts and stamps UTC when ts is absent, empty or None | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:123` |
| TC-cli-1 | name --kind state takes the current UTC time under extreme TZ | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:94` |
| TC-cli-2 | name refuses --ts with one JSON error | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:106` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-contract-4 · The state tail without ts is the current UTC time, also under extreme time zones · PASS
- **Given** TZ=Pacific/Kiritimati (UTC+14) and TZ=Etc/GMT+12 (UTC-12); the probe confirms local time differs from UTC **When** tail('state'), tail('state', ts=''), tail('state', ts=None) **Then** each value matches ^state-\d{14}$, its digits lie between UTC before and after the call, and they form a valid date
- **Expected** UTC stamp in %Y%m%d%H%M%S **Actual** UTC stamp within the bracket for both zones, valid date
- **Spec source:** R-018 quote; spec section 1 table (state-<UTC timestamp, %Y%m%d%H%M%S>) · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): TZ=Pacific/Kiritimati: local != UTC by hours; 3 calls in [before, after] UTC; TZ=Etc/GMT+12: same; mutation check: datetime.now() without timezone.utc fails this case
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-5 · The state tail keeps a given ts · PASS
- **Given** ts='20261008101500' **When** tail('state', ts='20261008101500') and the same call with id='S-001', n=0 **Then** both return 'state-20261008101500'
- **Expected** state-20261008101500 **Actual** state-20261008101500 (both calls)
- **Spec source:** spec section 1 table, sample sdlc/state-20261008101500 · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): tail('state', ts='20261008101500') -> 'state-20261008101500'
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-6 · Property: the state tail keeps a given ts and stamps UTC when ts is absent, empty or None · PASS
- **Given** 1000 inputs under TZ=Pacific/Kiritimati: half a non-empty ts, half absent, '' or None **When** tail('state', **k) **Then** a given ts gives state-<ts>; otherwise 14 UTC digits within the call bracket and a valid date
- **Expected** model holds for every input **Actual** 0 violations in 1000 runs
- **Spec source:** R-018 quote: state without ts generates the timestamp · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): property tail state: seed=20261010 runs=1000 violations=0; reference model written from the spec text; no shrinking in the toolkit; no counterexample
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-cli-1 · name --kind state takes the current UTC time under extreme TZ · PASS
- **Given** A scratch git repo with no config **When** Run name --kind state under TZ=Pacific/Kiritimati, TZ=Etc/GMT+12 and TZ=UTC **Then** The branch is sdlc/state-<14 digits>, and the stamp is a valid UTC date between the times before and after the call
- **Expected** Exit 0, one JSON line, branch ^sdlc/state-\d{14}$, stamp inside the UTC bracket **Actual** As expected in all three zones: for example sdlc/state-20261009042759 under UTC+14
- **Spec source:** R-018 acceptance (tail("state") is 14 digits); R-018 quote (state without ts generates the timestamp) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-1 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-1 transcript.

  ```console
  === TC-cli-1
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-2
  $ TZ=Pacific/Kiritimati python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-1 --kind state
  exit: 0 (68 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "state", "branch": "sdlc/state-20261009042759"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-2 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-2 · name refuses --ts with one JSON error · PASS
- **Given** A scratch git repo **When** Run name --kind state --ts 20261008101500 **Then** Exit 2, one JSON error, no traceback, no tree change
- **Expected** Exit 2 and {ok:false, error naming ts} **Actual** Exit 2, error "unrecognized arguments: --ts 20261008101500", stderr empty
- **Spec source:** Plan VS-2 notes; R-099 one JSON error rule · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-2 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-2 transcript.

  ```console
  === TC-cli-2
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-6
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-5 --kind state --ts 20261008101500
  exit: 2 (47 ms)
  --- stdout
  {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-6 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-5 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

</details>

### VS-3 · the e2e-area tail joins milestone and area, and a missing part fails with its name
Profiles: contract. Risk: a missing part that crashes, or an error that does not name the part, hides the cause from the caller.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | The e2e-area tail joins milestone and area in any keyword order | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:138` |
| TC-contract-8 | An e2e-area tail with a missing part raises the module Fail that names the part | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:143` |
| TC-contract-9 | Property: the e2e-area tail matches the reference model | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:163` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-7 · The e2e-area tail joins milestone and area in any keyword order · PASS
- **Given** id='M-1', area='api' **When** tail('e2e-area', id='M-1', area='api') and tail('e2e-area', area='api', id='M-1') **Then** both return 'M-1-e2e-api'
- **Expected** M-1-e2e-api **Actual** M-1-e2e-api (both orders)
- **Spec source:** spec section 1 table, sample sdlc/M-1-e2e-api · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): tail('e2e-area', id='M-1', area='api') -> 'M-1-e2e-api'; tail('e2e-area', area='api', id='M-1') -> 'M-1-e2e-api'
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-8 · An e2e-area tail with a missing part raises the module Fail that names the part · PASS
- **Given** id or area absent, '' or None, and both missing **When** tail('e2e-area', ...) for 8 combinations **Then** each raises branches.Fail (type Fail, mro Fail > Exception) and the message names the missing part, the text 'e2e-area' excluded
- **Expected** Fail naming area or id **Actual** Fail 'a e2e-area branch name needs a non-empty area' / '... id'; both missing names id
- **Spec source:** R-018 acceptance: tail('e2e-area', id='M-1') raises Fail because area is missing · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): Fail.__mro__ = Fail, Exception, BaseException, object (no built-in error base); 8/8 calls -> Fail naming the missing part; mutation check: dropping the empty-string test fails this case
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-9 · Property: the e2e-area tail matches the reference model · PASS
- **Given** 1000 inputs; each of id and area is a generated string (70%) or absent, '' or None; random numeric extras **When** tail('e2e-area', **k) **Then** both present gives <id>-e2e-<area>; one missing gives Fail naming it; both missing gives Fail naming one
- **Expected** model holds **Actual** 0 violations in 1000 runs
- **Spec source:** R-018 quote and acceptance · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): property tail e2e-area: seed=20261011 runs=1000 violations=0; reference model written from the spec text; no shrinking in the toolkit; no counterexample
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

</details>

### VS-4 · an operator runs name without a required part and gets one JSON error
Profiles: cli, security. Risk: a traceback or a second output line breaks every caller that reads one JSON object.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | name --kind e2e-area without --area exits 2 with one JSON error | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:111` |
| TC-cli-4 | An empty or absent required part exits 2 with one JSON error naming it | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:119` |
| TC-cli-5 | Kinds without a TAILS row and an unknown kind exit 2 with one JSON error | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:130` |
| TC-security-1 | A missing or empty required part gives one JSON error and exit 2 | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:58` |
| TC-security-2 | Kinds with no TAILS row yet give one JSON error and no traceback | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:69` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-3 · name --kind e2e-area without --area exits 2 with one JSON error · PASS
- **Given** A scratch git repo and a separate scratch cwd **When** Run name --kind e2e-area --id M-1 **Then** Exit 2, one JSON object {ok:false, error} naming area, empty stderr, no change to the repo, the cwd or git refs
- **Expected** Exit 2, error names area, no traceback, tree diff empty **Actual** Exit 2, error "a e2e-area branch name needs a non-empty area", stderr empty, both trees unchanged
- **Spec source:** R-099 acceptance · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-3 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-3 transcript.

  ```console
  === TC-cli-3
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-8
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-7 --kind e2e-area --id M-1
  exit: 2 (68 ms)
  --- stdout
  {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-8 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-7 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-4 · An empty or absent required part exits 2 with one JSON error naming it · PASS
- **Given** A scratch git repo **When** Run name for e2e-area with --area "", without --id, with --id "", with no parts; and slice without --id, with --id "", and with --format but no --id **Then** Each call gives exit 2 and one JSON error that names the missing part
- **Expected** Exit 2, one JSON error naming area or id, no traceback, tree unchanged **Actual** As expected for all seven calls
- **Spec source:** R-018 quote (a missing part is a Fail); R-099 acceptance · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-4 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-4 transcript.

  ```console
  === TC-cli-4
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-10
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-9 --kind e2e-area --id M-1 --area ''
  exit: 2 (74 ms)
  --- stdout
  {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-10 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-9 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-5 · Kinds without a TAILS row and an unknown kind exit 2 with one JSON error · PASS
- **Given** A scratch git repo **When** Run name for kinds run, milestone, e2e, verify, attempt with every part flag, and for kind bogus **Then** Each call gives exit 2 and one JSON error, with no traceback
- **Expected** Exit 2 and one JSON error each **Actual** Exit 2, error "no branch name is defined for kind '<kind>'" for each; bogus names the kind. Interim behavior per ADR, recorded only
- **Spec source:** ADR-20261009-041711-decision-judge-S-003-4882 · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-5 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-5 transcript.

  ```console
  === TC-cli-5
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-18
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-17 --kind run --id S-001 --n 1 --round 0 --profile cli --part 0 --area api
  exit: 2 (73 ms)
  --- stdout
  {"ok": false, "error": "no branch name is defined for kind 'run'"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-18 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-17 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-security-1 · A missing or empty required part gives one JSON error and exit 2 · PASS
- **Given** A scratch git repo with no config, and a repo with branchFormat team/{name:lower}-x. **When** Run name for e2e-area with no --area, with --area '', with no --id, with --id ''; and for slice with no --id and with --id ''. **Then** Each run exits 2 and prints one JSON object with ok false and an error that names the missing part.
- **Expected** Exit 2, one JSON object, ok false, the error names area or id, empty stderr, no tree or ref change. **Actual** 8 of 8 runs: exit 2, for example {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}; stderr empty; every tree unchanged.
- **Spec source:** R-099 acceptance; R-018 quote 'A missing part is a Fail' · **Run:** `node --test --test-name-pattern 'VS-4 a missing' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): name --kind e2e-area --id M-1.

  ```console
  $ python3 branches.py name --repo <repo> --kind e2e-area --id M-1
  exit: 2
  --- stdout
  {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
  --- stderr

  --- tree <cwd> (unchanged)
  --- tree <repo> (unchanged)
  ```

- More evidence: [all VS-4 transcripts with tree diffs](../../slices/S-003/verification/r0/logs/security-0-vs4.txt).

#### TC-security-2 · Kinds with no TAILS row yet give one JSON error and no traceback · PASS
- **Given** A scratch git repo. **When** Run name for run, milestone, e2e, verify and attempt, bare and with every part flag. **Then** Each run exits 2 with one JSON error and no traceback (ADR-20261009-041711).
- **Expected** Exit 2, one JSON error, empty stderr, no side effect. Not asserted as final behavior: S-004 to S-006 change it. **Actual** 10 of 10 runs: exit 2, {"ok": false, "error": "no branch name is defined for kind 'run'"} and the same for each kind; trees unchanged.
- **Spec source:** ADR-20261009-041711; R-099 acceptance (no traceback) · **Run:** `node --test --test-name-pattern 'VS-4 kinds' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): name --kind run with all parts.

  ```console
  $ python3 branches.py name --repo <repo> --kind run --id S-001 --n 1 --area api --round 1 --profile cli --part 0
  exit: 2
  --- stdout
  {"ok": false, "error": "no branch name is defined for kind 'run'"}
  ```

- More evidence: [VS-4 transcripts](../../slices/S-003/verification/r0/logs/security-0-vs4.txt).

</details>

### VS-5 · name takes the format from the flag, then the config, then the default
Profiles: cli, contract. Risk: a wrong resolution order silently renames future branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-13 | load_format raises Fail for invalid JSON, deep nesting and an unreadable file | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:231` |
| TC-contract-14 | name follows the resolved format and {name:lower} lowercases the tail | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:239` |
| TC-contract-15 | Property: name is prefix + tail + suffix, lowercased for {name:lower} | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:250` |
| TC-contract-17 | The CLI name format field agrees with load_format on each config shape | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:307` |
| TC-cli-6 | The flag wins over the config, and the config wins over the default | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:138` |
| TC-cli-7 | A config without a usable branchFormat falls back to sdlc/{name} | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:163` |
| TC-cli-8 | A broken config gives exit 2 and one JSON error, no traceback | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:185` |
| TC-cli-9 | An explicit empty --format fails validation and does not fall back | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:193` |
| TC-cli-10 | --format wins even when the config is broken | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:200` |
| TC-cli-11 | {name:lower} in the config lowercases the tail | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:206` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-contract-13 · load_format raises Fail for invalid JSON, deep nesting and an unreadable file · PASS
- **Given** config text '{', 200000 '[' characters, 50000 nested objects, a chmod 000 file **When** load_format(repo) **Then** each raises branches.Fail, never RecursionError or PermissionError
- **Expected** Fail **Actual** Fail for all four
- **Spec source:** spec section 2: exit 2 with {ok: false} on bad input; VS-5 notes · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): 4/4 -> outcome Fail
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-14 · name follows the resolved format and {name:lower} lowercases the tail · PASS
- **Given** formats sdlc/{name}, feature/PROJ-1-{name}, feature/{name:lower} **When** name(fmt, kind, **parts) **Then** sdlc/S-001, feature/PROJ-1-S-001, feature/s-001, feature/m-1-e2e-api, sdlc/state-20261008101500
- **Expected** as listed **Actual** as listed
- **Spec source:** R-015 acceptance; spec section 1 ({name:lower} lowercases the tail) · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): name('feature/PROJ-1-{name}','slice',id='S-001') -> feature/PROJ-1-S-001; name('feature/{name:lower}','slice',id='S-001') -> feature/s-001
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-15 · Property: name is prefix + tail + suffix, lowercased for {name:lower} · PASS
- **Given** 1000 formats from literal prefixes and suffixes around one placeholder; slice, e2e-area and state parts **When** name(fmt, kind, **parts) **Then** the result equals the model built from the spec text
- **Expected** model holds **Actual** 0 violations in 1000 runs
- **Spec source:** spec section 2 name(fmt, kind, **parts) · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): property name: seed=20261012 runs=1000 violations=0; reference model written from the spec text; no shrinking in the toolkit; no counterexample
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-17 · The CLI name format field agrees with load_format on each config shape · PASS
- **Given** 200 config shapes from arb.configShape, no --format **When** branches.py name --repo <r> --kind slice --id S-001, and load_format(r) plus validate_format in the API **Then** a valid resolved format gives exit 0 and the same format field; otherwise exit 2 with one JSON error; never a traceback
- **Expected** CLI and API agree **Actual** 0 violations in 200 runs
- **Spec source:** R-015 quote; spec section 2 (every command prints one JSON object) · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): property cli-name-vs-load_format: seed=20261014 runs=200 violations=0; reference model written from the spec text; no shrinking in the toolkit; no counterexample
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-cli-6 · The flag wins over the config, and the config wins over the default · PASS
- **Given** A repo with branchFormat feature/PROJ-1-{name}, a repo with no config, and a plain directory **When** Run name --kind slice --id S-001 with and without --format sdlc/{name} **Then** The branch is sdlc/S-001 with the flag, feature/PROJ-1-S-001 without it, and sdlc/S-001 with no config
- **Expected** The three R-015 names **Actual** As expected
- **Spec source:** R-015 acceptance; R-002 acceptance clause 1 · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-6 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-6 transcript.

  ```console
  === TC-cli-6
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-25
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-24 --kind slice --id S-001 --format 'sdlc/{name}'
  exit: 0 (64 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-25 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-24 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-7 · A config without a usable branchFormat falls back to sdlc/{name} · PASS
- **Given** Twelve config shapes: branchFormat "", null, 5, a list, an object, true, no key, {}, and a JSON array, string, number or null as the whole file **When** Run name --kind slice --id S-001 with no flag, and call load_format(repo) through python3 -I **Then** Each gives format sdlc/{name}, branch sdlc/S-001, and load_format agrees
- **Expected** format sdlc/{name} and load_format equal to it **Actual** As expected for all twelve shapes
- **Spec source:** R-015 quote (without either, the default applies); R-002 acceptance clause 1 · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-7 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-7 transcript.

  ```console
  === TC-cli-7 empty string
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-32
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-31 --kind slice --id S-001
  exit: 0 (63 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-32 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-31 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-8 · A broken config gives exit 2 and one JSON error, no traceback · PASS
- **Given** Config files that are invalid JSON, 200000-deep nesting, unreadable (mode 000), a directory, and invalid UTF-8 **When** Run name --kind slice --id S-001 with no flag **Then** Exit 2 and one JSON error each; load_format raises Fail
- **Expected** Exit 2, one JSON error, empty stderr **Actual** As expected; deep nesting gives a RecursionError message inside the JSON error
- **Spec source:** R-099 one JSON error rule; plan VS-5 notes · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-8 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-8 transcript.

  ```console
  === TC-cli-8 deep nesting
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-74
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-68 --kind slice --id S-001
  exit: 2 (48 ms)
  --- stdout
  {"ok": false, "error": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-68/.sdlc/config.json is not valid JSON: RecursionError: Stack overflow (used 16352 kB) while decoding a JSON array from a unicode string"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-74 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-68 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-9 · An explicit empty --format fails validation and does not fall back · PASS
- **Given** A repo with branchFormat feature/{name} and a repo with no config **When** Run name --kind slice --id S-001 --format "" **Then** Exit 2 and one JSON error; the config is not used
- **Expected** Exit 2 **Actual** Exit 2, error "the branch format '' must hold exactly one {name} or {name:lower}, found 0"
- **Spec source:** R-015 quote (--format overrides config.branchFormat) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-9 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-9 transcript.

  ```console
  === TC-cli-9
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-83
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-82 --kind slice --id S-001 --format ''
  exit: 2 (46 ms)
  --- stdout
  {"ok": false, "error": "the branch format '' must hold exactly one {name} or {name:lower}, found 0"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-83 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-82 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-10 · --format wins even when the config is broken · PASS
- **Given** The five broken config repos of TC-cli-8 **When** Run name --kind slice --id S-001 --format team/{name} **Then** Exit 0 and branch team/S-001; the config is not read
- **Expected** Exit 0, team/S-001 **Actual** As expected for all five
- **Spec source:** R-015 quote (--format overrides config.branchFormat) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-10 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-10 transcript.

  ```console
  === TC-cli-10 invalid JSON
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-91
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-86 --kind slice --id S-001 --format 'team/{name}'
  exit: 0 (62 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "team/{name}", "kind": "slice", "branch": "team/S-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-91 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-86 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-11 · {name:lower} in the config lowercases the tail · PASS
- **Given** A repo with branchFormat feature/{name:lower} **When** Run name for slice S-001, e2e-area M-1/API and state **Then** feature/s-001, feature/m-1-e2e-api, feature/state-<14 digits>; load_format returns the raw format
- **Expected** Lowercased tails **Actual** As expected
- **Spec source:** R-015 acceptance (the config format applies); plan VS-5 notes · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-11 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-11 transcript.

  ```console
  === TC-cli-11
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-97
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-96 --kind slice --id S-001
  exit: 0 (58 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "feature/{name:lower}", "kind": "slice", "branch": "feature/s-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-97 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-96 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

</details>

### VS-6 · the name output carries exactly the resolved format, kind and branch
Profiles: cli. Risk: an extra or a missing output key breaks the callers that read the branch field.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-12 | The name output holds exactly ok, command, format, kind and branch | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:214` |
| TC-cli-13 | Unused part flags do not change the branch or crash | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:230` |
| TC-cli-14 | name is idempotent and does not read the cwd, with spaces and unicode in the repo path | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:238` |
| TC-cli-15 | A --repo that is not a directory exits 2 with one JSON error | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:248` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-12 · The name output holds exactly ok, command, format, kind and branch · PASS
- **Given** A repo with branchFormat feature/PROJ-1-{name} **When** Run name for slice, e2e-area and state, each with and without --format **Then** Each call prints one JSON line with exactly the five keys, empty stderr, exit 0
- **Expected** Key set {ok, command, format, kind, branch} **Actual** As expected for all six calls
- **Spec source:** ADR-20261009-041713-decision-judge-S-003-c3ba · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-12 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-12 transcript.

  ```console
  === TC-cli-12
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-102
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-101 --kind slice --id S-001
  exit: 0 (64 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "feature/PROJ-1-{name}", "kind": "slice", "branch": "feature/PROJ-1-S-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-102 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-101 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-13 · Unused part flags do not change the branch or crash · PASS
- **Given** A repo with no config **When** Run name for slice and e2e-area with --n 0 --part 0 --round 0 --profile x, and with non-zero values **Then** The branch stays sdlc/S-001 or sdlc/M-1-e2e-api
- **Expected** Branch unchanged, exit 0 **Actual** As expected
- **Spec source:** R-018 quote (the tail from the table in section 1); ADR-20261009-041713-decision-judge-S-003-c3ba · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-13 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-13 transcript.

  ```console
  === TC-cli-13
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-109
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-108 --kind slice --id S-001 --n 0 --part 0 --round 0 --profile x
  exit: 0 (63 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-109 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-108 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-14 · name is idempotent and does not read the cwd, with spaces and unicode in the repo path · PASS
- **Given** A non-git repo path with a space, ü and CJK characters and config feature/{name}; a second cwd that is a repo with config other/{name} **When** Run the same name call twice, the second from the other cwd **Then** Both calls print the same stdout, feature/S-001
- **Expected** Identical outputs **Actual** As expected
- **Spec source:** R-015 quote (--repo is the target repo) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-14 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-14 transcript.

  ```console
  === TC-cli-14
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-113
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $'$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo with space ü 名前-112' --kind slice --id S-001
  exit: 0 (60 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "feature/{name}", "kind": "slice", "branch": "feature/S-001"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-113 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo with space ü 名前-112 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-15 · A --repo that is not a directory exits 2 with one JSON error · PASS
- **Given** A path that does not exist **When** Run name --repo <missing> --kind slice --id S-001 **Then** Exit 2, one JSON error naming --repo
- **Expected** Exit 2 **Actual** As expected
- **Spec source:** R-099 one JSON error rule · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-15 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-15 transcript.

  ```console
  === TC-cli-15
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-116
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/gone-115/nope --kind slice --id S-001
  exit: 2 (43 ms)
  --- stdout
  {"ok": false, "error": "--repo '$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/gone-115/nope' is not a directory"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-116 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

</details>

### VS-7 · preflight reports the given format and given true
Profiles: cli. Risk: a resume that does not report its format as given derives a new format and renames branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-16 | preflight --format reports that format with given true in every git mode | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:267` |
| TC-cli-17 | preflight with no flag reads config.branchFormat with given true | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:277` |
| TC-cli-18 | preflight --format with a broken config still reports the flag | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:286` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-16 · preflight --format reports that format with given true in every git mode · PASS
- **Given** A repo with config feature/{name}, and a repo with no config **When** Run preflight --mode <m> --format team/{name} and --format sdlc/{name} for pr, direct, mr and stack **Then** format equals the flag and given is the JSON boolean true
- **Expected** given true, format from the flag **Actual** As expected for all twelve calls
- **Spec source:** R-012 acceptance (preflight with --format reports that format with given true) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-16 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-16 transcript.

  ```console
  === TC-cli-16
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-119
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-117 --mode pr --format 'team/{name}'
  exit: 0 (61 ms)
  --- stdout
  {"ok": true, "command": "preflight", "format": "team/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-117", "mode": "pr", "branch": null}, "given": true}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-119 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-117 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-17 · preflight with no flag reads config.branchFormat with given true · PASS
- **Given** Repos with config feature/{name} and sdlc/{name} **When** Run preflight --mode <m> for every git mode **Then** format equals the config value and given is true, also when the value equals the default
- **Expected** given true **Actual** As expected for all eight calls
- **Spec source:** R-012 acceptance (with no flag it reads config.branchFormat) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-17 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-17 transcript.

  ```console
  === TC-cli-17
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-133
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-131 --mode pr
  exit: 0 (59 ms)
  --- stdout
  {"ok": true, "command": "preflight", "format": "feature/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-131", "mode": "pr", "branch": null}, "given": true}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-133 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-131 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-18 · preflight --format with a broken config still reports the flag · PASS
- **Given** The five broken config repos of TC-cli-8 **When** Run preflight --mode pr --format team/{name} **Then** Exit 0, format team/{name}, given true; the config is not read
- **Expected** given true **Actual** As expected for all five; this matches name, which also skips the config when the flag is given
- **Spec source:** R-012 quote (the --branch-format flag comes first) · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-18 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-18 transcript.

  ```console
  === TC-cli-18 invalid JSON
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-146
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-141 --mode pr --format 'team/{name}'
  exit: 0 (57 ms)
  --- stdout
  {"ok": true, "command": "preflight", "format": "team/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-141", "mode": "pr", "branch": null}, "given": true}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-146 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-141 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

</details>

### VS-8 · preflight falls back to the default when no format is given
Profiles: cli, contract. Risk: a given flag that disagrees with the format sends the run to the derivation path by mistake.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-12 | load_format returns the config value or the default | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:211` |
| TC-contract-16 | Property: load_format over arb.configShape matches the spec model | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:288` |
| TC-cli-19 | preflight with no format given falls back to sdlc/{name} with given false | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:292` |
| TC-cli-20 | preflight with no flag and a broken config exits 2 with one JSON error | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:303` |
| TC-cli-21 | preflight with an unknown mode or an invalid --format exits 2 | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:309` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-contract-12 · load_format returns the config value or the default · PASS
- **Given** configs: feature/PROJ-1-{name}; no config; no key; '' ; null; 5; list; object; a JSON array; a JSON string; sdlc/{name}; no .sdlc directory **When** load_format(repo) **Then** a non-empty string value is returned; every other shape gives sdlc/{name}
- **Expected** per spec section 2 load_format **Actual** all 12 repos as expected
- **Spec source:** R-002 acceptance clause 1; spec section 2 load_format · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): {'branchFormat':'feature/PROJ-1-{name}'} -> feature/PROJ-1-{name}; absent / no key / '' / null / 5 / [..] / {..} / [] / "sdlc/{name}" / no .sdlc -> sdlc/{name}
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-contract-16 · Property: load_format over arb.configShape matches the spec model · PASS
- **Given** 1000 config shapes from arb.configShape: absent, directory, valid and non-object JSON, invalid text, deep nesting, invalid UTF-8, symlinks, unreadable **When** load_format(repo) **Then** a non-empty string branchFormat of an object is returned; other valid shapes give the default; unreadable or invalid input gives Fail; no other exception
- **Expected** model holds **Actual** 0 violations in 1000 runs; Python accepts the non-standard texts NaN and Infinity and gives the default
- **Spec source:** R-002 acceptance clause 1; spec section 2 load_format · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): property load_format: seed=20261013 runs=1000 violations=0; lenient non-strict JSON accepted as default: ["NaN","Infinity"]; reference model written from the spec text; no shrinking in the toolkit; no counterexample
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-cli-19 · preflight with no format given falls back to sdlc/{name} with given false · PASS
- **Given** A repo with no config, a plain directory, and the twelve fallback shapes of TC-cli-7 **When** Run preflight --mode <m> for every git mode, and call load_format(repo) **Then** format sdlc/{name}, given false, exit 0, one JSON object; load_format returns sdlc/{name}
- **Expected** given false only with the default format **Actual** As expected for all 56 calls
- **Spec source:** R-012 acceptance (with neither it falls back to sdlc/{name}); R-002 acceptance clause 1 · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-19 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-19 transcript.

  ```console
  === TC-cli-19 number
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-185
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-155 --mode pr
  exit: 0 (67 ms)
  --- stdout
  {"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-155", "mode": "pr", "branch": null}, "given": false}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-185 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-155 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-20 · preflight with no flag and a broken config exits 2 with one JSON error · PASS
- **Given** The five broken config repos of TC-cli-8 **When** Run preflight --mode pr **Then** Exit 2 and one JSON error, not given false
- **Expected** Exit 2 **Actual** As expected for all five
- **Spec source:** R-099 one JSON error rule; plan VS-8 notes · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-20 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-20 transcript.

  ```console
  === TC-cli-20 invalid JSON
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-240
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-235 --mode pr
  exit: 2 (41 ms)
  --- stdout
  {"ok": false, "error": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-235/.sdlc/config.json is not valid JSON: JSONDecodeError: Expecting ',' delimiter: line 1 column 34 (char 33)"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-240 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-235 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-21 · preflight with an unknown mode or an invalid --format exits 2 · PASS
- **Given** A repo with no config **When** Run preflight --mode bogus, --format "" and --format no-placeholder **Then** Exit 2 and one JSON error each
- **Expected** Exit 2 **Actual** As expected
- **Spec source:** R-099 one JSON error rule · **Run:** `cd <repo> && node --test --test-name-pattern='TC-cli-21 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-21 transcript.

  ```console
  === TC-cli-21
  $ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-246
  $ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-245 --mode bogus
  exit: 2 (41 ms)
  --- stdout
  {"ok": false, "error": "--mode 'bogus' is not one of pr, direct, mr, stack"}
  --- stderr

  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-246 (unchanged)
  --- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-245 (unchanged)
  ```

- Evidence (file-tree): Every watched tree (unchanged); git refs unchanged. Full record in the log file.
- More evidence: [all transcripts](../../slices/S-003/verification/r0/logs/cli-0-transcripts.txt).

</details>

### VS-9 · hostile part values reach name through the CLI
Profiles: security, cli. Risk: a hostile part crashes the CLI, expands a placeholder or changes files.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-101 | A hostile --id reaches the slice tail as literal text | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:57` |
| TC-cli-102 | A hostile --area reaches the e2e-area tail as literal text | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:77` |
| TC-cli-103 | A placeholder inside a part is never expanded, with a flag format or a config format | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:93` |
| TC-cli-104 | A flag-like value in the separate form gives one JSON error, never help text | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:113` |
| TC-cli-105 | The integer flags refuse non-integers with one JSON error | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:138` |
| TC-cli-106 | No hostile part creates a git ref or a file, and a second run gives the same output | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:162` |
| TC-cli-107 | branches.py imports no module from the cwd | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:177` |
| TC-security-3 | Hostile --kind values are refused | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:76` |
| TC-security-4 | Hostile --id and --area values are literal text and cause no side effect | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:85` |
| TC-security-5 | A placeholder inside a part is never re-expanded | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:99` |
| TC-security-6 | Flag-like part values never switch a flag | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:121` |
| TC-security-7 | A non-integer --n, --round or --part gives one JSON error and exit 2 | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:142` |
| TC-security-8 | Integer forms, unicode digits and huge integers never crash | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:153` |
| TC-security-9 | Invalid UTF-8 bytes in a part give one JSON object | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:163` |
| TC-security-10 | branches.py imports no module from the cwd | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:180` |
| TC-security-11 | A hostile --repo path gives one JSON object and writes nothing | PASS | `.sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs:194` |

<details>
<summary>Case detail (16 cases)</summary>

#### TC-cli-101 · A hostile --id reaches the slice tail as literal text · PASS
- **Given** A scratch git repo with no config. 125 argv-safe values from ten attack-corpus families: control-chars, flag-like-values, format-strings, injection, oversized (to 200 kB), traversal, unicode-confusables, unicode-whitespace, unicode-digits, integer-forms. **When** Run `branches.py name --repo <repo> --kind slice --id=<value>` from a new scratch cwd for each value. **Then** Each run exits 0 or 2. stdout is one JSON line. stderr is empty, with no traceback. The tree is unchanged. A non-empty value gives branch `sdlc/<value>` exactly. An empty value exits 2 with an error that names id. The transcript log clips each run at 4000 characters, so the oversized runs show no exit line there; the test asserts their exit code.
- **Expected** exit 0 with branch `sdlc/<value>`, or exit 2 with one JSON error for the empty value; no traceback; no side effect **Actual** 123 values exit 0 with branch `sdlc/<value>` byte for byte. The two empty values (format-strings/empty, integer-forms/empty) exit 2 with `a slice branch name needs a non-empty id`. stderr is empty in all 125 runs. No tree or ref changes.
- **Spec source:** R-099 acceptance (one JSON object, no traceback); R-018 quote (the tail from the table); plan-r0 VS-9 notes (a placeholder inside a part is literal text) · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-101'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # format-strings/double
  $ cd <scratch>/cwd-101-3
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice '--id={name}{name}'
  exit: 0 (63 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/{name}{name}"}
  --- stderr

  --- tree <scratch>/cwd-101-3 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # injection/json-break
  $ cd <scratch>/cwd-101-3
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice '--id="}, "ok": true, "x": {"'
  exit: 0 (60 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/\"}, \"ok\": true, \"x\": {\""}
  --- stderr

  --- tree <scratch>/cwd-101-3 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # traversal/dotdot-etc
  $ cd <scratch>/cwd-101-3
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id=../../../../etc/passwd
  exit: 0 (67 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/../../../../etc/passwd"}
  --- stderr

  --- tree <scratch>/cwd-101-3 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-101.txt).

#### TC-cli-102 · A hostile --area reaches the e2e-area tail as literal text · PASS
- **Given** The same repo and the same 125 values. **When** Run `branches.py name --repo <repo> --kind e2e-area --id M-1 --area=<value>` for each value. **Then** Each run gives one JSON object, exit 0 or 2, no traceback and no side effect. A non-empty value gives `sdlc/M-1-e2e-<value>`. An empty value exits 2 with an error that names area.
- **Expected** branch `sdlc/M-1-e2e-<value>` or one JSON error naming area **Actual** 123 values give `sdlc/M-1-e2e-<value>` exactly. The two empty values exit 2 with `a e2e-area branch name needs a non-empty area`. stderr is empty. No tree or ref changes.
- **Spec source:** R-099 acceptance; R-018 quote · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-102'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # format-strings/double
  $ cd <scratch>/cwd-102-4
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id M-1 '--area={name}{name}'
  exit: 0 (65 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/M-1-e2e-{name}{name}"}
  --- stderr

  --- tree <scratch>/cwd-102-4 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # injection/json-break
  $ cd <scratch>/cwd-102-4
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id M-1 '--area="}, "ok": true, "x": {"'
  exit: 0 (67 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/M-1-e2e-\"}, \"ok\": true, \"x\": {\""}
  --- stderr

  --- tree <scratch>/cwd-102-4 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # traversal/dotdot-etc
  $ cd <scratch>/cwd-102-4
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id M-1 --area=../../../../etc/passwd
  exit: 0 (72 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/M-1-e2e-../../../../etc/passwd"}
  --- stderr

  --- tree <scratch>/cwd-102-4 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-102.txt).

#### TC-cli-103 · A placeholder inside a part is never expanded, with a flag format or a config format · PASS
- **Given** The format-strings family without the empty value (17 values). A repo with no config, and a repo whose config holds `feature/{name:lower}`. **When** Run name with `--format team/{name}-x --id=<value>`, then with the config format and no flag. Also run `--kind e2e-area --id {name} --area {name:lower}`. **Then** The flag format gives `team/<value>-x`. The config format gives `feature/<lowercased value>`. The last run gives `sdlc/{name}-e2e-{name:lower}`.
- **Expected** literal parts, never re-expanded **Actual** All 35 runs match. For example `--id={name}{name}` gives `team/{name}{name}-x`, and `--id={0.__class__}` stays literal.
- **Spec source:** plan-r0 VS-9 notes (a placeholder inside a part is literal text, never re-expanded); R-018 quote · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-103'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # flag double
  $ cd <scratch>/cwd-103-5
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --format 'team/{name}-x' '--id={name}{name}'
  exit: 0 (65 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "team/{name}-x", "kind": "slice", "branch": "team/{name}{name}-x"}
  --- stderr

  --- tree <scratch>/cwd-103-5 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # config lower upper
  $ cd <scratch>/cwd-103-5
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-2 --kind slice '--id=sdlc/{NAME}'
  exit: 0 (64 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "feature/{name:lower}", "kind": "slice", "branch": "feature/sdlc/{name}"}
  --- stderr

  --- tree <scratch>/cwd-103-5 (unchanged)
  --- tree <scratch>/repo-2 (unchanged)

  # id and area both placeholders
  $ cd <scratch>/cwd-103-5
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id '{name}' --area '{name:lower}'
  exit: 0 (61 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/{name}-e2e-{name:lower}"}
  --- stderr

  --- tree <scratch>/cwd-103-5 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-103.txt).

#### TC-cli-104 · A flag-like value in the separate form gives one JSON error, never help text · PASS
- **Given** The same repo. **When** Run name with `--id --help`, `--id -h`, `--id --format`, `--id --repo`, `--area --format`, `--area --help` and `--area -h`. Then run `--area=--format`. **Then** The seven separate-form runs exit 2 with one JSON error and no help text. The equals form keeps the value literal.
- **Expected** exit 2 and `{ok: false, error}` for the separate form; branch `sdlc/M-1-e2e---format` for the equals form **Actual** Each separate-form run exits 2 with `argument --id: expected one argument` or the --area form. The equals form exits 0 with `sdlc/M-1-e2e---format`, and the format stays `sdlc/{name}`.
- **Spec source:** R-099 acceptance; plan-r0 VS-9 notes (every command prints one JSON object and exits 0 or 2) · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-104'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # --kind slice --id --help
  $ cd <scratch>/cwd-104-6
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id --help
  exit: 2 (43 ms)
  --- stdout
  {"ok": false, "error": "argument --id: expected one argument"}
  --- stderr

  --- tree <scratch>/cwd-104-6 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --kind slice --id -h
  $ cd <scratch>/cwd-104-6
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id -h
  exit: 2 (42 ms)
  --- stdout
  {"ok": false, "error": "argument --id: expected one argument"}
  --- stderr

  --- tree <scratch>/cwd-104-6 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --area=--format
  $ cd <scratch>/cwd-104-6
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id M-1 --area=--format
  exit: 0 (64 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/M-1-e2e---format"}
  --- stderr

  --- tree <scratch>/cwd-104-6 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-104.txt).

#### TC-cli-105 · The integer flags refuse non-integers with one JSON error · PASS
- **Given** 35 values from integer-forms, unicode-digits and huge-integers, for each of --n, --round and --part (105 runs). **When** Run `name --kind slice --id S-001 --<flag>=<value>`. The oracle is Python `int()` on the same value. **Then** A value that `int()` refuses exits 2 with one JSON error `invalid int value`. A value that `int()` takes exits 0 with branch `sdlc/S-001`.
- **Expected** exit 2 with one JSON error for non-integers; no traceback for huge values **Actual** The empty value, hex, float, exp, word, inf, nan, superscript, roman, circled, digits-4301, digits-100k, negative-5000 and zeros-10k exit 2 with one JSON error. 21 forms per flag exit 0 with `sdlc/S-001`, among them unicode digits and padded values. No traceback.
- **Spec source:** plan-r0 VS-9 notes (argparse must refuse non-integers with one JSON error and exit 2); R-099 acceptance · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-105'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # --n integer-forms/empty
  $ cd <scratch>/cwd-105-7
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id S-001 --n=
  exit: 2 (50 ms)
  --- stdout
  {"ok": false, "error": "argument --n: invalid int value: ''"}
  --- stderr

  --- tree <scratch>/cwd-105-7 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --n integer-forms/float
  $ cd <scratch>/cwd-105-7
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id S-001 --n=1.5
  exit: 2 (44 ms)
  --- stdout
  {"ok": false, "error": "argument --n: invalid int value: '1.5'"}
  --- stderr

  --- tree <scratch>/cwd-105-7 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --n unicode-digits/arabic-indic
  $ cd <scratch>/cwd-105-7
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id S-001 $'--n=٣'
  exit: 0 (68 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
  --- stderr

  --- tree <scratch>/cwd-105-7 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --n huge-integers/digits-100k
  $ cd <scratch>/cwd-105-7
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id S-001 --n=999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
  …(196673 more chars)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-105.txt).

#### TC-cli-106 · No hostile part creates a git ref or a file, and a second run gives the same output · PASS
- **Given** The repo with branch `sdlc/S-001`. The injection family (13 values). **When** Run `name --kind e2e-area --id=<value> --area=<value>` two times for each value. **Then** Both runs give the same stdout. The repo refs and `git status --porcelain` are the same as before. No `pwned` file appears.
- **Expected** no side effect; same output on a second run **Actual** All 26 runs give one JSON object with exit 0; the two outputs match. `for-each-ref` and `status --porcelain` do not change, and no file appears in the cwd.
- **Spec source:** plan-r0 VS-9 notes (no side effect with the tree diff and no git ref created) · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-106'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # first cmd-subst
  $ cd <scratch>/cwd-106-8
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area '--id=$(touch pwned)' '--area=$(touch pwned)'
  exit: 0 (57 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/$(touch pwned)-e2e-$(touch pwned)"}
  --- stderr

  --- tree <scratch>/cwd-106-8 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # first git-option
  $ cd <scratch>/cwd-106-8
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area '--id=--upload-pack=touch pwned' '--area=--upload-pack=touch pwned'
  exit: 0 (61 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/--upload-pack=touch pwned-e2e---upload-pack=touch pwned"}
  --- stderr

  --- tree <scratch>/cwd-106-8 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-106.txt).

#### TC-cli-107 · branches.py imports no module from the cwd · PASS
- **Given** A cwd with exit-type decoy modules from `plantDecoy` for branches, json, argparse, re, subprocess, datetime, os and sys. **When** Run `name --kind slice --id S-001` and `name --kind e2e-area --id M-1` from that cwd. **Then** The first run gives `sdlc/S-001`, exit 0. The second run exits 2 with one JSON error. No decoy marker is written.
- **Expected** no decoy import; normal output **Actual** exit 0 with `sdlc/S-001`, then exit 2 with `a e2e-area branch name needs a non-empty area`. The marker file does not exist.
- **Spec source:** plan-r0 VS-9 notes (use plantDecoy to confirm branches.py does not import a module from the cwd) · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-107'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # decoys in cwd: branches, json, argparse, re, subprocess, datetime, os, sys
  $ cd <scratch>/cwd-107-9
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id S-001
  exit: 0 (59 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
  --- stderr

  --- tree <scratch>/repo-1 (unchanged)

  # error path with decoys in cwd
  $ cd <scratch>/cwd-107-9
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id M-1
  exit: 2 (62 ms)
  --- stdout
  {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
  --- stderr

  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-107.txt).

#### TC-security-3 · Hostile --kind values are refused · PASS
- **Given** A scratch git repo. **When** Run name with --kind slіce (Cyrillic i), SLICE, '', ../slice and 'slice '. **Then** Each run exits 2 with one JSON error that names the kind.
- **Expected** Exit 2, one JSON error, no traceback, no side effect. **Actual** 5 of 5 runs refused with "--kind ... is not one of ..."; trees unchanged.
- **Spec source:** R-099 acceptance; spec rule that every command prints one JSON object · **Run:** `node --test --test-name-pattern 'hostile kind' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-4 · Hostile --id and --area values are literal text and cause no side effect · PASS
- **Given** A repo with the default format and a repo with team/{name:lower}-x. **When** Feed every argv-safe entry of control-chars, traversal, unicode-whitespace, unicode-confusables, format-strings, injection and oversized as --id (slice) and as --id and --area (e2e-area). **Then** Each run exits 0 or 2 with one JSON object, no traceback, and no tree or ref change. On success the branch is the literal part in the format.
- **Expected** Every run exits 0 or 2 with one JSON object. Success branches equal 'sdlc/'+value and 'sdlc/'+value+'-e2e-'+value byte for byte. **Actual** About 290 runs: all exit 0 with one JSON object; for example --id 'x; touch pwned' gives branch 'sdlc/x; touch pwned' and no file pwned appears; 200k-char values return in one line; every tree unchanged.
- **Spec source:** Spec: every command prints one JSON object and exits 0 or 2; R-099 acceptance (no traceback) · **Run:** `node --test --test-name-pattern 'literal text' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): injection part.

  ```console
  $ python3 branches.py name --repo /tmp --kind slice --id 'x; touch pwned'
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/x; touch pwned"}
  $ ls /tmp/pwned
  No such file or directory
  ```

- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-5 · A placeholder inside a part is never re-expanded · PASS
- **Given** A repo with the default format and a repo with team/{name:lower}-x. **When** Run name with --id and --area set to {name}, {name:lower}, {0}, %s, {id}, {0.__class__}, {name}{name}; and with --format a/{name}/b. **Then** The branch holds the placeholder as literal text.
- **Expected** Literal text, no second expansion. **Actual** --id '{name}' gives 'sdlc/{name}'; --id '{NAME}' with {name:lower} gives 'team/{name}-x'; --format a/{name}/b with --id '{name}' gives 'a/{name}/b'.
- **Spec source:** VS-9 guarantee from the R-018 tail contract: the tail is the part value · **Run:** `node --test --test-name-pattern 're-expanded' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): placeholder part.

  ```console
  $ python3 branches.py name --repo /tmp --kind slice --id '{name}'
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/{name}"}
  ```

- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-6 · Flag-like part values never switch a flag · PASS
- **Given** A scratch git repo. **When** Pass flag-like-values in --id=<v>, --id <v> and --area=<v>; pass --id=--format=evil/{name}; --id --help; a duplicated --id. **Then** A value in = form stays a literal part; a separated flag-like value is refused with one JSON error; the format never changes.
- **Expected** No value changes the format or the command. **Actual** --id=--format=evil/{name} gives format 'sdlc/{name}' and branch 'sdlc/--format=evil/{name}'; --id --help exits 2 with one JSON error; duplicated --id takes the last value.
- **Spec source:** Spec: every command prints one JSON object and exits 0 or 2 · **Run:** `node --test --test-name-pattern 'flag-like' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): format smuggled in a part.

  ```console
  $ python3 branches.py name --repo /tmp --kind slice --id=--format=evil/{name}
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/--format=evil/{name}"}
  ```

- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-7 · A non-integer --n, --round or --part gives one JSON error and exit 2 · PASS
- **Given** A scratch git repo. **When** Pass '', 1.5, 1e3, two, inf, nan, 0x10, 4301 and 100000 digits, -<5000 digits>, Ⅷ, ², ① to each integer flag. **Then** argparse refuses each with one JSON error that names the flag, and exit 2.
- **Expected** Exit 2 and one JSON error naming the flag. **Actual** 39 of 39 runs: exit 2, for example {"ok": false, "error": "argument --n: invalid int value: '1.5'"}; no traceback for the 4301-digit limit error.
- **Spec source:** VS-9 notes; spec rule that every command prints one JSON object and exits 0 or 2 · **Run:** `node --test --test-name-pattern 'non-integer' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): float and huge integer.

  ```console
  $ python3 branches.py name --repo /tmp --kind slice --id S-1 --n 1.5
  {"ok": false, "error": "argument --n: invalid int value: '1.5'"}
  exit 2
  $ ... --round <4301 nines>
  {"ok": false, "error": "argument --round: invalid int value: '9999…"}
  ```

- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-8 · Integer forms, unicode digits and huge integers never crash · PASS
- **Given** A scratch git repo. **When** Pass every argv-safe entry of integer-forms, unicode-digits and huge-integers to each integer flag. **Then** Exit 0 or 2 with one JSON object; on success the slice branch is unchanged.
- **Expected** No traceback and no change to the branch. **Actual** 105 runs: exit 0 or 2 with one JSON object; ' 3 ', '1_000', '٣' and '１２' are accepted (see seeds); branch stays 'sdlc/S-001'.
- **Spec source:** Spec rule that every command prints one JSON object and exits 0 or 2 · **Run:** `node --test --test-name-pattern 'never crash' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-9 · Invalid UTF-8 bytes in a part give one JSON object · PASS
- **Given** A scratch git repo. **When** Spawn branches.py with raw bytes \xff\xfe, S-\xc0\xaf and \xed\xa0\x80 in --id and --area. **Then** Exit 0 or 2 with one JSON object and no traceback.
- **Expected** One JSON object. **Actual** 6 of 6 runs exit 0; the branch holds escaped lone surrogates such as "sdlc/\udcff\udcfe" (see seeds).
- **Spec source:** Spec rule that every command prints one JSON object and exits 0 or 2 · **Run:** `node --test --test-name-pattern 'invalid UTF-8' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (transcript): raw bytes relay.

  ```console
  0	{"ok": true, ..., "kind": "slice", "branch": "sdlc/\udcff\udcfe"}
  0	{"ok": true, ..., "kind": "e2e-area", "branch": "sdlc/M-1-e2e-\udcff\udcfe"}
  ```

- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-10 · branches.py imports no module from the cwd · PASS
- **Given** A cwd that holds decoy branches, json, argparse, re, subprocess, datetime, os and sys modules (exit 97 on import). **When** Run name --kind slice and name --kind state from that cwd. **Then** No decoy marker is written and the real names come back.
- **Expected** No decoy import. **Actual** No marker file; exit 0, branch 'sdlc/S-001' and 'sdlc/state-<14 digits>'.
- **Spec source:** VS-9 notes (plantDecoy check) · **Run:** `node --test --test-name-pattern 'imports no module' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): decoy check.

  ```text
  decoyFired(...) == null for 8 decoys; exit 0
  ```


#### TC-security-11 · A hostile --repo path gives one JSON object and writes nothing · PASS
- **Given** The traversal family as --repo. **When** Run name --kind slice --id S-001 with each value. **Then** Exit 0 or 2 with one JSON object, no change in the cwd.
- **Expected** One JSON object, no write. **Actual** 10 of 10 runs: one JSON object; non-directories exit 2 with '--repo ... is not a directory'; cwd unchanged.
- **Spec source:** Spec rule that every command prints one JSON object and exits 0 or 2 · **Run:** `node --test --test-name-pattern 'hostile --repo' .sdlc/slices/S-003/verification/r0/tests/security-0/name.verify-security.test.mjs` · **Latest run:** round 0
- More evidence: [tree diff of cwd and repo, git refs included](../../slices/S-003/verification/r0/logs/security-0-transcripts.txt).

</details>

### VS-10 · a zero-valued numeric part is kept, not dropped as absent
Profiles: contract, cli. Risk: a truthiness filter drops a zero part, so a later kind gets a wrong name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-10 | Zero-valued numeric parts are accepted and do not change the tail | PASS | `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:184` |
| TC-cli-110 | Zero-valued integer parts are accepted for slice, e2e-area and state | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:193` |
| TC-cli-111 | A zero-valued string part is kept, not dropped as absent | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:214` |
| TC-cli-112 | The name part filter passes a zero n, round and part to a row that needs them | PASS | `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:231` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-10 · Zero-valued numeric parts are accepted and do not change the tail · PASS
- **Given** n=0, round=0, part=0 passed beside the required parts; and id=0 **When** tail for slice, e2e-area and state with the zero parts; tail('slice', id=0) **Then** no Fail; tails are S-001, M-1-e2e-api, state-20261008101500 and '0'
- **Expected** zero kept as a value, not treated as absent **Actual** S-001, M-1-e2e-api, state-20261008101500, '0'
- **Spec source:** R-018 quote: only a missing part is a Fail · **Run:** `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): tail('slice', id='S-001', n=0, round=0, part=0) -> 'S-001'; tail('slice', id=0) -> '0' (0 is not treated as missing)
- More evidence: [test run](../../slices/S-003/verification/r0/logs/contract-0-run.txt).

#### TC-cli-110 · Zero-valued integer parts are accepted for slice, e2e-area and state · PASS
- **Given** The same repo. **When** Run name with `--n 0 --part 0 --round 0` for slice and e2e-area, the equals form with `--profile x`, the forms `-0`, `00` and `+0`, and state with the zero parts. **Then** Each run exits 0 with exactly the keys ok, command, format, kind and branch. The branch does not change.
- **Expected** `sdlc/S-001`, `sdlc/M-1-e2e-api`, `sdlc/state-` plus 14 digits **Actual** All five runs exit 0 with the expected branch, an empty stderr and an unchanged tree.
- **Spec source:** plan-r0 VS-10 notes (--n 0 --part 0 --round 0 with --kind slice must succeed); R-018 quote · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-110'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # --kind slice --id S-001 --n 0 --part 0 --round 0
  $ cd <scratch>/cwd-110-10
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id S-001 --n 0 --part 0 --round 0
  exit: 0 (59 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
  --- stderr

  --- tree <scratch>/cwd-110-10 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --kind e2e-area --id M-1 --area api --n 0 --round 0 --part 0
  $ cd <scratch>/cwd-110-10
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id M-1 --area api --n 0 --round 0 --part 0
  exit: 0 (64 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/M-1-e2e-api"}
  --- stderr

  --- tree <scratch>/cwd-110-10 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-110.txt).

#### TC-cli-111 · A zero-valued string part is kept, not dropped as absent · PASS
- **Given** The same repo. **When** Run name with `--id 0`, `--id 0 --area 0`, `--id M-1 --area 0`, and `--id 0 --format x/{name:lower}`. **Then** The branches are `sdlc/0`, `sdlc/0-e2e-0`, `sdlc/M-1-e2e-0` and `x/0`.
- **Expected** the string `0` counts as present **Actual** All four runs exit 0 with the expected branch.
- **Spec source:** R-018 quote (a missing part is a Fail, so a present part must not fail); plan-r0 VS-10 title · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-111'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # --kind slice --id 0
  $ cd <scratch>/cwd-111-11
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind slice --id 0
  exit: 0 (61 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/0"}
  --- stderr

  --- tree <scratch>/cwd-111-11 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)

  # --kind e2e-area --id 0 --area 0
  $ cd <scratch>/cwd-111-11
  $ python3 <worktree>/skills/sdlc/branches.py name --repo <scratch>/repo-1 --kind e2e-area --id 0 --area 0
  exit: 0 (63 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "e2e-area", "branch": "sdlc/0-e2e-0"}
  --- stderr

  --- tree <scratch>/cwd-111-11 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-111.txt).

#### TC-cli-112 · The name part filter passes a zero n, round and part to a row that needs them · PASS
- **Given** No S-003 row consumes n, round or part. A probe loads branches.py by path with `python3 -I`, adds a `verify` row that needs n, round and part, and calls the real `main` with the real argv. **When** Run the probe with `name --kind verify --n 0 --round 0 --part 0`. **Then** The row gets the integer 0 for each part, and the branch is `sdlc/0-0-0`.
- **Expected** exit 0 with `sdlc/0-0-0`; a truthiness filter would give exit 2 **Actual** exit 0 with `sdlc/0-0-0`. The filter tests `is not None`.
- **Spec source:** plan-r0 VS-10 notes (the CLI part filter must test is not None, not truthiness) · **Run:** `VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs --test-name-pattern 'TC-cli-112'` · **Latest run:** round 0
- Evidence (transcript): excerpt of the transcript.

  ```console
  # probe row verify needs n, round and part
  $ cd <scratch>/cwd-112-12
  $ python3 -I -c $'import importlib.util, json, sys\nspec = importlib.util.spec_from_file_location(\"b\", \"<worktree>/skills/sdlc/branches.py\")\nb = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)\nb.TAILS[\"verify\"] = ((\"n\", \"round\", \"part\"), lambda p: f\"{p[\'n\']!r}-{p[\'round\']!r}-{p[\'part\']!r}\")\nsys.exit(b.main(sys.argv[1:]))' name --repo <scratch>/repo-1 --kind verify --n 0 --round 0 --part 0
  exit: 0 (69 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "verify", "branch": "sdlc/0-0-0"}
  --- stderr

  --- tree <scratch>/cwd-112-12 (unchanged)
  --- tree <scratch>/repo-1 (unchanged)
  ```

- Evidence (file-tree): Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
- More evidence: [full transcripts of every run in this case](../../slices/S-003/verification/r0/logs/cli-1-TC-cli-112.txt).

</details>
## How it was attacked
The security profile ran one session in round 0, at commit 13b17f1. Its charter was to explore the `name` CLI with missing and empty parts (VS-4) and with the attack corpus in `--id`, `--area`, `--kind` and the integer flags (VS-9). It looked for a traceback, a second output line, a re-expanded placeholder or a side effect. The threat-model boundary: the operator and the loop agents supply the CLI arguments, and their values are not trusted. The skill directory, `PYTHONPATH` and the config file are trusted. The git validity of a full name is out of scope as a blocker, because the spec validates only the format. The session tried 17 attacks: 16 held, none broke, and 1 was out of scope (A-security-17, recorded as a seed). The cli profile part 1 ran the same hostile families from the CLI side (TC-cli-101 to TC-cli-107), and all of its cases passed.

<details>
<summary>Attack table (17 attacks)</summary>

| Attack | Charter | Input | Expected | Observed | Result |
|---|---|---|---|---|---|
| A-security-1 | Missing part | e2e-area --id M-1 (no --area), --area '' | exit 2, one JSON error naming area | exit 2, error names area, no side effect | held |
| A-security-2 | Missing part | slice with no --id, --id '' | exit 2, one JSON error naming id | exit 2, error names id | held |
| A-security-3 | Kinds without a TAILS row | run, milestone, e2e, verify, attempt | exit 2, one JSON error | exit 2, 'no branch name is defined for kind' | held |
| A-security-4 | Kind confusables | slіce, SLICE, '', ../slice, 'slice ' | exit 2 | exit 2 | held |
| A-security-5 | Control characters in parts | tab, newline, CR, ESC, BEL, DEL, C1 in --id/--area | one JSON object, literal part | exit 0, literal part, JSON-escaped | held |
| A-security-6 | Traversal in parts | ../.., /etc, ..\.., file:///etc in --id/--area | literal text, no file access | exit 0, literal text, tree unchanged | held |
| A-security-7 | Unicode whitespace and confusables in parts | NBSP, ZWSP, BOM, RTL override, fullwidth braces | one JSON object | exit 0, literal text | held |
| A-security-8 | Shell and JSON injection in parts | $(touch pwned), backticks, '"}, "ok": true', newline+JSON | no command runs, one JSON object | no pwned file, one JSON line, ok key not forged | held |
| A-security-9 | Oversized parts | 10k, 200k chars, 5000-level path | one JSON object | exit 0 in about 70 ms, one line | held |
| A-security-10 | Placeholder re-expansion | {name}, {name:lower}, {0}, %s, {0.__class__} | literal text | literal text in every format | held |
| A-security-11 | Flag smuggling | --id=--format=evil/{name}, --id --help, --area=--help | format unchanged | format stays sdlc/{name}; separated flag-like value refused | held |
| A-security-12 | Non-integer integer flags | 1.5, inf, nan, 0x10, 4301+ digits, Ⅷ, ① | exit 2, one JSON error | exit 2, argparse error naming the flag | held |
| A-security-13 | Unicode digits and odd integer forms | ٣, １２, ' 3 ', 1_000 | exit 0 or 2, one JSON object | exit 0, accepted as integers (seed) | held |
| A-security-14 | Invalid UTF-8 argv | \xff\xfe, \xc0\xaf, \xed\xa0\x80 | one JSON object | exit 0, lone surrogates escaped in JSON (seed) | held |
| A-security-15 | Module shadowing from the cwd | decoy branches/json/argparse/re/subprocess/datetime/os/sys in cwd | no decoy import | no decoy import | held |
| A-security-16 | Hostile --repo | traversal family as --repo | one JSON object, no write | one JSON object, cwd unchanged | held |
| A-security-17 | Git-unsafe parts | --id '../..', 'a b', 'HEAD@{1}', '*', tab | out of scope as a blocker (spec validates the format only) | exit 0 with branches that git check-ref-format refuses | out-of-scope |

</details>

## Defects found on the way
**Blocking defects**
- **No committed test gave `--format` together with a broken `config.json`.** Found by the test-quality review, round 0 (`review-test-quality-r0.md`, finding 1). Spec source: R-015, the format resolution order. Reproduce: swap the operands of `given` in `cmd_preflight`, then run `preflight --format x/{name}` on a repo with invalid `config.json`; it exits 2, and no committed test fails. Fix: commit 1921d70 promoted TC-cli-10 and TC-cli-18 into the suite as T-024. The spec-fidelity verifier in round 1 swapped the operands, and T-024 failed (27 pass, 1 fail). Guard: `skills/sdlc/test/branches.test.mjs:560`.

**Seeds** (open, duplicates merged)

| Seed | Found by | File |
|---|---|---|
| `name` does not check its parts: `--id=-c` gives the branch `-c`, and `../x`, `a b`, `HEAD@{1}`, `*` give branches git refuses | review-security r0 and r1; cli-1 r0; security-0 r0 | `skills/sdlc/branches.py` |
| `--n`, `--round` and `--part` accept Unicode digits, padding, underscores and `+1` | cli-1 r0; security-0 r0 | `skills/sdlc/branches.py` |
| `cmd_preflight` reads the config two times; `given` depends on operand order | review-architecture r0 and r1 | `skills/sdlc/branches.py` |
| `NAME_PARTS` repeats the part flags of the `name` sub-parser | review-architecture r0 and r1 | `skills/sdlc/branches.py` |
| `brokenConfigRepos` overlaps the existing broken-config fixtures | review-architecture r1 | `skills/sdlc/test/branches.test.mjs` |
| T-024 does not restore the mode of the unreadable config | review-test-quality r1 | `skills/sdlc/test/branches.test.mjs` |
| T-019 has no case for an empty `ts` | review-test-quality r0 and r1 | `skills/sdlc/test/branches.test.mjs` |
| The missing-part error reads "a e2e-area branch name" | verify-spec-fidelity r0 and r1; cli-0 r0 | `skills/sdlc/branches.py` |
| `--help` prints argparse text and exits 0, not one JSON object | cli-0 r0; cli-1 r0 | `skills/sdlc/branches.py` |
| The `preflight` output still echoes an interim `args` object with the absolute repo path | cli-0 r0 | `skills/sdlc/branches.py` |
| `branches.py` exposes helpers the spec does not name | contract-0 r0 | `skills/sdlc/branches.py` |
| `load_format` accepts the JSON values `NaN` and `Infinity` | contract-0 r0 | `skills/sdlc/branches.py` |
| `tail` accepts a non-string part and a non-digit `ts` | contract-0 r0; review-architecture r0 | `skills/sdlc/branches.py` |
| Invalid UTF-8 in a part gives lone surrogate escapes in the JSON output | security-0 r0 | `skills/sdlc/branches.py` |
| An argparse error echoes an oversized value in full | security-0 r0 | `skills/sdlc/branches.py` |
| testkit: `callPython` has no keyword arguments and no TZ control | contract-0 r0 | `skills/sdlc/test/testkit/property.mjs` |
| testkit: `cli-runner` cannot pass raw bytes in argv | security-0 r0 | `skills/sdlc/test/testkit/cli-runner.mjs` |
| Done-requirement evidence points at pruned verification tests | verify-regression r0 and r1; gate r0 | `.sdlc/requirements.json` |

## Appendix
- Toolkit: `property` (`skills/sdlc/test/testkit/property.mjs`, with `skills/sdlc/test/testkit/pycall.py`), `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `attack-corpus` (`skills/sdlc/test/testkit/attack-corpus.mjs`).
- Plans: [plan-r0.md](../../slices/S-003/verification/plan-r0.md), [plan-r1.md](../../slices/S-003/verification/plan-r1.md).
- Round 0 profile evidence: [contract-0.md](../../slices/S-003/verification/r0/contract-0.md), [cli-0.md](../../slices/S-003/verification/r0/cli-0.md), [cli-1.md](../../slices/S-003/verification/r0/cli-1.md), [security-0.md](../../slices/S-003/verification/r0/security-0.md), and their JSON files beside them.
- Round 1 profile evidence: none; round 1 ran no scenario (plan-r1.md).
- Core verifiers: [verify-spec-fidelity-r0.md](../../slices/S-003/verify-spec-fidelity-r0.md), [verify-spec-fidelity-r1.md](../../slices/S-003/verify-spec-fidelity-r1.md), [verify-regression-r0.md](../../slices/S-003/verify-regression-r0.md), [verify-regression-r1.md](../../slices/S-003/verify-regression-r1.md).
- Reviews: [architecture r0](../../slices/S-003/review-architecture-r0.md), [architecture r1](../../slices/S-003/review-architecture-r1.md), [security r0](../../slices/S-003/review-security-r0.md), [security r1](../../slices/S-003/review-security-r1.md), [test-quality r0](../../slices/S-003/review-test-quality-r0.md), [test-quality r1](../../slices/S-003/review-test-quality-r1.md).
- Gate: [gate-r0.md](../../slices/S-003/gate-r0.md), `npm test` 504 pass, 0 fail, 1 skip (Go not installed), at a04f40b; receipt [suite-receipt.json](../../slices/S-003/verification/suite-receipt.json).
- ADRs: ADR-20261009-041704 (state tail), ADR-20261009-041711 (TAILS rows), ADR-20261009-041713 (name output), ADR-20261009-041833 (R-002 split), ADR-20261009-034220 (tail table from S-002). Spec proposal P-20261009-041704 carries the R-018 text fix.
- Missing sources: none. The verification test files cited above can be pruned after merge.
