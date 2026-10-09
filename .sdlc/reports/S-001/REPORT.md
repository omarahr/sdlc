# S-001 · branches.py skeleton: importable CLI, JSON contract, load_format
Verdict: RELEASED
Commit under test: fe71369 (gate ran at 658b419; last product change 4434d71) · Rounds: 3 · Attempts: 3 · Risk: medium · Written: 2026-10-09

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 10 | 79 | 79 | 0 | 0 | 4 / 4 | 25 |

## Summary
The slice adds `skills/sdlc/branches.py`, a stdlib-only module with four commands: `name`, `parse`, `list` and `preflight`. Each command prints one JSON object, and bad input exits 2 with `{"ok": false, "error": ...}`. The three scripts `next-action.py`, `state-write.py` and `janitor.py` now import the module from their own directory. The cli, contract and security profiles ran 79 cases from scratch working directories. They tested the CLI boundary and the module boundary. Round 0 found three crashes or shadow imports, and the review then found one gap in the committed tests; all four are fixed and guarded by committed tests. The open items are 25 non-blocking seeds, mainly loose argparse behavior and format characters that S-002 must refuse.

## Open risks
- `validate_format` accepts a leading `-`, `NUL`, control and bidi characters. S-002 must add `git check-ref-format --branch` and give every git argument after `--`.
- Zero-width, right-to-left and Cyrillic look-alike characters pass the format checks, and `git check-ref-format` also accepts them (attack A-12). The spec does not forbid them.
- `--n`, `--round` and `--part` accept Unicode digits, negatives, padding and underscores (TC-cli-10, A-8). The slices that build `name` must refuse these values.
- The argparse layer accepts flag prefixes. It keeps the last value of a repeated flag. `-h` and `--help` print usage text, not JSON, and `main` raises `SystemExit`.
- `GIT_MODES_PATH` uses `abspath`. A `branches.py` run through a symlink then reads the wrong `git-modes.json`. A hard link to a script beside a decoy `branches.py` imports the decoy (A-30, out of scope).
- A valid `--format` hides a malformed `config.json`, and an unreadable `--repo` passes when `--format` is given (TC-cli-23). A `FIFO` at `.sdlc/config.json` blocks every command without `--format`.
- The success body is an interim echo under `args` (ADR-20261009-024048, ADR-20261009-024229). Consumers must not read result fields from it until S-002 to S-017 land.
- The spec states no size or time number, so the limits profile did not run. A refusal echoes the whole hostile value, up to 100035 characters (A-9).

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-013 | "Python 3 standard library only. Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable." | VS-1, VS-8 | 7 | pass |
| R-098 | "Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable." | VS-9, VS-10 | 17 | pass |
| R-014 | "Every command prints one JSON object; exit 2 with `{"ok": false, "error": "..."}` on bad input." | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-7 | 50 | pass |
| R-088 | "branches.py name --repo DIR --kind KIND [--id ID] [--n N] [--area A] [--round R] [--profile P] [--part K] [--format F] … parse --repo DIR --branch NAME [--format F] … list --repo DIR --kind KIND [--format F] … preflight --repo DIR --mode MODE [--format F] [--branch CURRENT]" | VS-1, VS-2, VS-3 | 12 | pass |
| R-016 | "`load_format(repo)`: `config.branchFormat` when `.sdlc/config.json` has a non-empty one, else `"sdlc/{name}"`." | VS-4, VS-6, VS-7 | 16 | pass |

## Scenarios
Profile `cli` ran in two parts in round 0, and both parts use the ids `TC-cli-1` to `TC-cli-17`. This report marks the part-1 cases with `(cli-1)`. A result such as `PASS (r0: FAIL)` shows a case that failed in round 0 and passed when round 1 ran it again. Round 2 ran no scenario, because its fix commit changed only tests.

### VS-1 · A developer runs each of the four commands with every flag its spec line names and reads one JSON object
Profiles: cli, contract. Risk: A command that prints more than one object, or changes files, breaks every consumer of the contract.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | name with every spec flag prints one JSON object, twice, from a repo path with a space and unicode | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:64` |
| TC-cli-2 | parse, list, preflight and name with every flag, in other orders and with --flag=value | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:72` |
| TC-cli-3 | Each command with its optional flags left out | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:88` |
| TC-contract-3 | main(argv) in-process: every command with all its flags returns 0 and prints one JSON object; bad input returns 2 | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:115` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-1 · name with every spec flag prints one JSON object, twice, from a repo path with a space and unicode · PASS
- **Given** A scratch git repo at a path with a space and 'ünï'. **When** python3 branches.py name --repo <repo> --kind verify --id S-001 --n 1 --area api --round 0 --profile http-api --part 0 --format feature/{name}, run twice. **Then** Exit 0, stdout is one JSON line with ok true, command name, format feature/{name}; stderr empty; repo and cwd tree unchanged; both runs equal.
- **Expected** One JSON object, exit 0, no stderr, no file change, same output twice. **Actual** As expected. args echoes every flag with ints for n, round, part.
- **Spec source:** R-088 acceptance; R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-1:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): name with all flags.

  ```console
  ### TC-cli-1
  $ cd $TMPDIR/sdlc-test-yPZFGX/testkit-cli-KtDNh0/cwd-3
  $ python3 $TMPDIR/sdlc-S-001-v0-cli-0/skills/sdlc/branches.py name --repo $'$TMPDIR/sdlc-test-yPZFGX/testkit-cli-KtDNh0/repo with space ünï-1' --kind verify --id S-001 --n 1 --area api --round 0 --profile http-api --part 0 --format 'feature/{name}'
  exit: 0 (45 ms)
  --- stdout
  {"ok": true, "command": "name", "format": "feature/{name}", "args": {"repo": "$TMPDIR/sdlc-test-yPZFGX/testkit-cli-KtDNh0/repo with space \u00fcn\u00ef-1", "kind": "verify", "id": "S-001", "n": 1, "area": "api", "round": 0, "profile": "http-api", "part": 0}}
  --- stderr
  
  --- tree $TMPDIR/sdlc-test-yPZFGX/testkit-cli-KtDNh0/cwd-3 (unchanged)
  --- tree $TMPDIR/sdlc-test-yPZFGX/testkit-cli-KtDNh0/repo with space ünï-1 (unchanged)
  ```

- Evidence (file-tree): repo and cwd tree.

  ```diff
    tree <cwd> (unchanged)
    tree <repo with space ünï> (unchanged)
  ```


#### TC-cli-2 · parse, list, preflight and name with every flag, in other orders and with --flag=value · PASS
- **Given** A scratch git repo. **When** Run each command with all its flags in spec order, then in reverse order with --flag=value syntax; run each twice. **Then** Exit 0, one JSON object, ok true, matching command, empty stderr, unchanged tree, same output twice.
- **Expected** All seven argv shapes pass. **Actual** As expected for all 14 runs.
- **Spec source:** R-088 acceptance · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-2:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-2 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-3 · Each command with its optional flags left out · PASS
- **Given** A scratch git repo. **When** name --kind slice; parse --branch only; list --kind run; preflight --mode pr with and without --branch; name --kind attempt --id --n. **Then** Exit 0 and one JSON object each.
- **Expected** Exit 0, one JSON object, ok true. **Actual** As expected.
- **Spec source:** R-088 acceptance · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-3:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-3 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-contract-3 · main(argv) in-process: every command with all its flags returns 0 and prints one JSON object; bad input returns 2 · PASS
- **Given** A repo whose config holds feature/{name} **When** The probe calls main() with: name with all eight optional flags; name in --flag=value form with only --repo and --kind; parse; list; preflight with --branch; parse without --branch; name --format ''; an unknown command; no command **Then** Each call returns an int, does not raise SystemExit, and writes exactly one JSON object line to stdout
- **Expected** rc 0 0 0 0 0 2 2 2 2; ok true on 0; ok false with a non-empty error on 2; format feature/{name} when --format is absent **Actual** rc 0 0 0 0 0 2 2 2 2; one JSON line each; stderr empty; format feature/{name} for the two calls without --format
- **Spec source:** R-088 acceptance, R-014 quote · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-3 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (transcript): main() results (excerpt).

  ```console
  main(["name","--repo",R,"--kind","slice","--id","S-001","--n","2","--area","a","--round","1","--profile","cli","--part","0","--format","sdlc/{name}"]) -> 0
    {"ok": true, "command": "name", "format": "sdlc/{name}", "args": {..., "n": 2, "round": 1, "part": 0}}
  main(["parse","--repo",R]) -> 2  {"ok": false, "error": "the following arguments are required: --branch"}
  main(["name","--repo",R,"--kind","slice","--format",""]) -> 2  {"ok": false, "error": "the branch format '' must hold exactly one {name} or {name:lower}, found 0"}
  main(["bogus"]) -> 2  {"ok": false, "error": "argument command: invalid choice: 'bogus' ..."}
  main([]) -> 2  {"ok": false, "error": "the following arguments are required: command"}
  ```

- Evidence (log): full run. Full text: [contract-0-run.txt](../../slices/S-001/verification/r0/logs/contract-0-run.txt).

</details>

### VS-2 · A caller passes a flag that the command does not name, or leaves out a required flag
Profiles: cli, security. Risk: Argparse can leak usage text, or exit with a code other than 2, on a bad flag.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | A flag that the command does not name exits 2 with one JSON error | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:97` |
| TC-cli-5 | Missing required flag, no command, unknown command | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:111` |
| TC-cli-6 | A flag given twice and an extra positional argument | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:128` |
| TC-cli-7 | Flag prefixes (allow_abbrev) are recorded | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:137` |
| TC-cli-8 | -h and --help are recorded | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:151` |
| TC-security-1 | A flag that the command does not name is refused with no side effect | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:66` |
| TC-security-2 | A missing required flag, a missing or unknown command and an extra positional are refused | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:84` |
| TC-security-3 | Flag-like values in a value slot never leak argparse usage text | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:109` |
| TC-security-4 | Observe flag prefixes, duplicate flags, --flag=value and --help | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:127` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-4 · A flag that the command does not name exits 2 with one JSON error · PASS
- **Given** A scratch git repo. **When** parse --kind; list --branch; preflight --kind; name --branch; list --id; parse --mode; preflight --n; name --bogus. **Then** Exit 2; stdout is exactly {ok:false, error:<non-empty string>}; no usage text on stdout.
- **Expected** Exit 2 with the JSON error object. **Actual** All eight exit 2 with 'unrecognized arguments: ...'; stderr empty.
- **Spec source:** R-088 acceptance ("accepts the flags its line names"); R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-4:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-4 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-5 · Missing required flag, no command, unknown command · PASS
- **Given** A scratch git repo. **When** parse/name/preflight/list without their required --branch/--kind/--mode; each command without --repo; no argument; 'bogus'; '--repo X' with no command. **Then** Exit 2 with one JSON error object each.
- **Expected** Exit 2 with the JSON error object. **Actual** As expected for all eleven; stderr empty.
- **Spec source:** R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-5:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-5 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-6 · A flag given twice and an extra positional argument · PASS
- **Given** A scratch git repo. **When** parse --branch a --branch b; parse --branch a extra; name extra --repo R --kind slice. **Then** One JSON object each; the positional extra exits 2.
- **Expected** Duplicate flag: one JSON object. Positional extra: exit 2 JSON error. **Actual** Duplicate --branch exits 0 and keeps the last value ('b'). Both extra-positional runs exit 2 with 'unrecognized arguments: extra'.
- **Spec source:** R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-6:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-6 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-7 · Flag prefixes (allow_abbrev) are recorded · PASS
- **Given** A scratch git repo. **When** parse with --r/--re/--rep for --repo and --f/--fo/--for/--form/--forma for --format. **Then** One JSON object each; behavior recorded.
- **Expected** Record only: the spec does not name prefixes. **Actual** All eight prefixes exit 0 and act as the full flag. Reported as a seed.
- **Spec source:** R-014 quote (one JSON object) · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-7:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): prefix outcomes.

  ```console
  {"--r":0,"--re":0,"--rep":0,"--f":0,"--fo":0,"--for":0,"--form":0,"--forma":0}
  ```


#### TC-cli-8 · -h and --help are recorded · PASS
- **Given** None. **When** branches.py --help; -h; name --help; preflight -h. **Then** Behavior recorded; the spec does not define help.
- **Expected** Record only. **Actual** Each prints argparse usage text on stdout and exits 0, not JSON. Reported as a seed.
- **Spec source:** none (record only; plan.md Risks accepts this) · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-8:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-8 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-security-1 · A flag that the command does not name is refused with no side effect · PASS
- **Given** A scratch git repo as --repo. **When** Run parse --kind, list --branch, preflight --kind, name --branch, list --id, parse --mode, parse --n and preflight --area. **Then** Each run exits 2 and prints only {ok:false,error}.
- **Expected** Exit 2, one JSON error object, no usage text, no file change. **Actual** All 8 runs exit 2 with one JSON error object. Stderr is empty. The repo and cwd trees do not change.
- **Spec source:** R-014 quote; R-088 acceptance · **Run:** `node --test --test-name-pattern="VS-2 a flag that the command" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): unnamed flags. Full text: [security-0-vs2.txt](../../slices/S-001/verification/r0/logs/security-0-vs2.txt).

  ```console
  parse --repo R --branch sdlc/S-1 --kind slice
  -> exit 2 {"ok": false, "error": "unrecognized arguments: --kind slice"}
  ```

- Evidence (file-tree): tree diff. Full text: [security-0-vs2.txt](../../slices/S-001/verification/r0/logs/security-0-vs2.txt).

  ```diff
    every watched tree: unchanged
  ```


#### TC-security-2 · A missing required flag, a missing or unknown command and an extra positional are refused · PASS
- **Given** A scratch git repo. **When** Run each command without its required flag, each without --repo, no arguments, 'bogus', a lone --repo, an extra positional, a trailing '--', and --repo with no value. **Then** Each run exits 2 with one JSON error object.
- **Expected** Exit 2, one JSON error, no file change. **Actual** All 15 runs exit 2 with one JSON error object and no usage text.
- **Spec source:** R-014 quote · **Run:** `node --test --test-name-pattern="VS-2 a missing required flag" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): missing and unknown. Full text: [security-0-vs2.txt](../../slices/S-001/verification/r0/logs/security-0-vs2.txt).

  ```console
  parse --repo R
  -> exit 2 {"ok": false, "error": "the following arguments are required: --branch"}
  ```

- Evidence (file-tree): tree diff.

  ```diff
    every watched tree: unchanged
  ```


#### TC-security-3 · Flag-like values in a value slot never leak argparse usage text · PASS
- **Given** The flag-like-values corpus (8 entries: --, -h, --help, --x=y, -1, -, --format, --repo=). **When** Pass each value as --branch on parse and preflight and as --id on name. **Then** Each run prints one JSON object with exit 0 or 2, except -h/--help which argparse treats as help.
- **Expected** One JSON object; ok matches the exit code; no file change. **Actual** Every run printed one JSON object or, for -h/--help, the argparse help (exit 0). No traceback.
- **Spec source:** R-014 quote · **Run:** `node --test --test-name-pattern="VS-2 flag-like values" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): flag-like corpus. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-4 · Observe flag prefixes, duplicate flags, --flag=value and --help · PASS
- **Given** A scratch git repo. **When** Run parse with --r, --re, --rep for --repo and --f to --forma for --format; give --repo and --format twice (bad then good); use --flag=value; run -h and --help. **Then** Record only: the spec names full flags only and does not define help.
- **Expected** Recorded behavior. **Actual** Every prefix is accepted (exit 0) and the prefix --form sets the format. A duplicate flag silently keeps the last value: --repo /nonexistent --repo R exits 0. --flag=value passes. -h and --help print usage text on stdout and exit 0.
- **Spec source:** none (record only; see seeds) · **Run:** `node --test --test-name-pattern="VS-2 observe" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): prefix and duplicate. Full text: [security-0-vs2.txt](../../slices/S-001/verification/r0/logs/security-0-vs2.txt).

  ```console
  --rep R -> exit 0
  --form feature/{name} -> exit 0, format feature/{name}
  --repo /nonexistent --repo R -> exit 0
  -h -> exit 0, usage text on stdout
  ```


</details>

### VS-3 · A caller passes a non-integer or odd value to --n, --round or --part
Profiles: cli, security. Risk: A loose integer parse can put a value in a later branch name that the caller did not type.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-9 | A non-integer --n, --round or --part exits 2 with one JSON error | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:158` |
| TC-cli-10 | Odd integer values for --n, --round and --part are recorded | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:166` |
| TC-security-5 | Non-integer values for --n, --round and --part are refused | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:160` |
| TC-security-6 | Observe unicode digits, padding, underscores, negatives and huge integers | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:179` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-9 · A non-integer --n, --round or --part exits 2 with one JSON error · PASS
- **Given** A scratch git repo. **When** name --kind verify with --n two, 1.5, '', --round 0x1, 1e3, --part one, --n '٣x', both as two argv items and as --flag=value. **Then** Exit 2 with one JSON error object each.
- **Expected** Exit 2 with the JSON error object. **Actual** As expected for all 14 runs ('argument --n: invalid int value: ...').
- **Spec source:** R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-9:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-9 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-10 · Odd integer values for --n, --round and --part are recorded · PASS
- **Given** A scratch git repo. **When** --part=-1, --n=99999999999999999999, --n=' 3', --n=٣ (Arabic-Indic 3), --round=0003, --n=1_000, --n=+4. **Then** One JSON object each; behavior recorded.
- **Expected** Record only in this slice. **Actual** All exit 0. Parsed values: -1, 100000000000000000000, 3, 3, 3, 1000, 4. Reported as a seed for the slices that build tails.
- **Spec source:** R-014 quote (one JSON object) · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-10:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): odd integer outcomes.

  ```console
  {"--part=-1":-1,"--n=99999999999999999999":100000000000000000000,"--n= 3":3,"--n=٣":3,"--round=0003":3,"--n=1_000":1000,"--n=+4":4}
  ```


#### TC-security-5 · Non-integer values for --n, --round and --part are refused · PASS
- **Given** name --repo R --kind slice. **When** Pass two, 1.5, '', 0x1, 1e3, inf, nan, +-1, 0o7, 0b1, Arabic-Indic '1.5' and --1 to each integer flag; then the integer-forms corpus to --n. **Then** Non-integers exit 2 with one JSON error; accepted values echo a number.
- **Expected** Exit 2 for each non-integer; one JSON object always. **Actual** All 36 non-integer runs exit 2 with one JSON error. The integer-forms corpus gives one JSON object each; accepted values echo a number.
- **Spec source:** R-014 quote · **Run:** `node --test --test-name-pattern="VS-3 non-integer" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): non-integers. Full text: [security-0-vs3.txt](../../slices/S-001/verification/r0/logs/security-0-vs3.txt).

  ```console
  name ... --n two
  -> exit 2 {"ok": false, "error": "argument --n: invalid int value: 'two'"}
  ```


#### TC-security-6 · Observe unicode digits, padding, underscores, negatives and huge integers · PASS
- **Given** name --repo R --kind slice. **When** Pass the unicode-digits corpus, ' 3', '1_000', '-1', a 20-digit value and the huge-integers corpus to --n and --part. **Then** Record only: the spec names no integer range.
- **Expected** Recorded behavior. **Actual** Exit 0 for Arabic-Indic, fullwidth, Devanagari, Bengali, NKo, math-bold and Thai digits, ' 3', '1_000', '-1', 20 digits and 4300 digits. Exit 2 for superscript, Roman and circled forms and for 4301 digits and more; the error then echoes the whole value (100035 chars for 100k digits).
- **Spec source:** none (record only; see seeds) · **Run:** `node --test --test-name-pattern="VS-3 observe" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): integer forms. Full text: [security-0-vs3.txt](../../slices/S-001/verification/r0/logs/security-0-vs3.txt).

  ```console
  --n ٣ -> exit 0, n=3
  --n ' 3' -> exit 0, n=3
  --part -1 -> exit 0, part=-1
  --n <100k digits> -> exit 2, error length 100035
  ```


</details>

### VS-4 · A caller passes an invalid --format to each command
Profiles: cli, contract, security. Risk: An invalid format that passes gives branch names that later slices cannot parse.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-11 | An invalid --format exits 2 with one JSON error on every command | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:184` |
| TC-cli-12 | Valid --format controls pass on every command | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:193` |
| TC-contract-4 | validate_format raises Fail for each structural bad format and for non-strings, and returns each valid control | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:158` |
| TC-contract-5 | Property: validate_format agrees with a reference model built from the spec text | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:170` |
| TC-contract-11 | validate_format gives the same outcome for the same input across two processes | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:327` |
| TC-security-7 | Invalid formats are refused on every command with no side effect | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:224` |
| TC-security-8 | Hostile corpus formats give one JSON object and the structural verdict | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:234` |
| TC-security-9 | A NUL byte in the config format gives one JSON object | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:253` |
| TC-security-10 | Valid controls pass on every command | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:267` |
| TC-security-11 | validate_format raises Fail for hostile and non-string input | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:278` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-cli-11 · An invalid --format exits 2 with one JSON error on every command · PASS
- **Given** A scratch git repo. **When** 19 formats on name, parse, list and preflight: no placeholder, two placeholders, stray { or }, {id}, {NAME}, {name:upper}, space, tab, newline, CR, U+00A0, U+3000, and ''. **Then** Exit 2 with one JSON error object on all 76 runs.
- **Expected** Exit 2 with the JSON error object. **Actual** As expected; '' is refused and does not fall back to config.
- **Spec source:** R-014 acceptance (invalid --format exits 2); spec §2 validate_format · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-11:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-11 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-12 · Valid --format controls pass on every command · PASS
- **Given** A scratch git repo. **When** sdlc/{name}, sdlc/{name:lower}, feature/{name}-x, feature/PROJ-123-{name}, {name} on all four commands. **Then** Exit 0, one JSON object, format equals the input.
- **Expected** Exit 0 and format echoed. **Actual** As expected for all 20 runs.
- **Spec source:** spec §1 format; R-014 · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-12:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-12 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-contract-4 · validate_format raises Fail for each structural bad format and for non-strings, and returns each valid control · PASS
- **Given** The plan inputs: no placeholder, {name}{name}, {name}-{name:lower}, stray braces, {id}, {NAME}, {name:upper}, space, tab, LF, CR, U+00A0, U+3000, empty string, {{name}}; non-strings null, 5, a list, a dict, true **When** The probe calls validate_format on each through the module loaded by path **Then** Each bad input raises Fail and no other exception; sdlc/{name}, sdlc/{name:lower}, feature/{name}-x and {name} return unchanged
- **Expected** Fail x24, return x4 **Actual** Fail x24, return x4 with the input value
- **Spec source:** ADR-20261009-024036 (structural checks in S-001); spec §2 validate_format · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-4 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (log): per-input outcomes. Full text: [contract-0-run.txt](../../slices/S-001/verification/r0/logs/contract-0-run.txt).

#### TC-contract-5 · Property: validate_format agrees with a reference model built from the spec text · PASS
- **Given** arb.format (placeholders, braces, git-unsafe characters, unicode whitespace, control characters, NUL, lone surrogates, non-strings); a JS model: exactly one {name} or {name:lower}, no other brace, no Unicode White_Space character **When** check() calls validate_format 3000 times through pycall.py **Then** Model-invalid input gives Fail; model-valid input of plain characters returns the input; no other exception
- **Expected** 0 violations **Actual** 0 violations (1980 model-invalid, 1020 model-valid)
- **Spec source:** ADR-20261009-024036; R-014 quote · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-5 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): validate_format vs model.
  `property validate_format: seed=20261009 runs=3000 violations=0 modelInvalid=1980 modelValid=1020`

#### TC-contract-11 · validate_format gives the same outcome for the same input across two processes · PASS
- **Given** 1000 generated format strings (seed 20261009) **When** Two separate pycall batches call validate_format on the same inputs **Then** Outcomes, values and messages are equal
- **Expected** 0 differences **Actual** 0 differences
- **Spec source:** Contract profile determinism corner; R-014 · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-11 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (property-run): determinism.
  `determinism validate_format seed=20261009 runs=1000 diffs=0`

#### TC-security-7 · Invalid formats are refused on every command with no side effect · PASS
- **Given** A scratch git repo. **When** Run name, parse, list and preflight with 23 invalid formats: no placeholder, two placeholders, stray braces, {id}, {NAME}, {name:upper}, {{name}}, space, tab, LF, CR, VT, FF, U+001C, NEL, U+00A0, U+3000, U+2028 and the empty string. **Then** Each run exits 2 with one JSON error; no file changes.
- **Expected** Exit 2 and unchanged trees for all 92 runs. **Actual** All 92 runs exit 2 with one JSON error object. The empty --format is refused, not replaced by the config value.
- **Spec source:** R-014 quote and acceptance · **Run:** `node --test --test-name-pattern="VS-4 invalid formats" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): invalid formats. Full text: [security-0-vs4.txt](../../slices/S-001/verification/r0/logs/security-0-vs4.txt).

  ```console
  preflight ... --format "sdlc/{name}\u00a0"
  -> exit 2 {"ok": false, "error": "the branch format 'sdlc/{name}\xa0' holds whitespace"}
  ```

- Evidence (file-tree): tree diff.

  ```diff
    every watched tree: unchanged
  ```


#### TC-security-8 · Hostile corpus formats give one JSON object and the structural verdict · PASS
- **Given** The format-strings, injection, unicode-whitespace, unicode-confusables, control-chars, traversal and oversized families. **When** Pass each value as --format to name and preflight. **Then** Each run prints one JSON object; exit 0 exactly when the S-001 structural rules hold, else exit 2.
- **Expected** Exit code equals the structural verdict; no file change. **Actual** Every run matched the structural verdict. No traceback. Shell metacharacters ($(), backticks, ;, \|) stay inert text. ESC, ZWSP, U+202E and Cyrillic letters pass the S-001 checks, as planned until S-002.
- **Spec source:** R-014 quote; ADR-20261009-024036 (structural checks only in S-001) · **Run:** `node --test --test-name-pattern="VS-4 hostile corpus" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): corpus formats. Full text: [security-0-vs4.txt](../../slices/S-001/verification/r0/logs/security-0-vs4.txt).

#### TC-security-9 · A NUL byte in the config format gives one JSON object · PASS
- **Given** A repo whose config.json branchFormat holds NUL (the nul corpus), since argv cannot carry NUL. **When** Run all four commands without --format. **Then** One JSON object, exit 0 or 2, no traceback.
- **Expected** One JSON object each. **Actual** All 16 runs printed one JSON object. A NUL inside sdlc/\u0000{name} passes the S-001 structural check; S-002 git check-ref-format owns it.
- **Spec source:** R-014 quote · **Run:** `node --test --test-name-pattern="VS-4 a NUL byte" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): nul config. Full text: [security-0-vs4.txt](../../slices/S-001/verification/r0/logs/security-0-vs4.txt).

#### TC-security-10 · Valid controls pass on every command · PASS
- **Given** A scratch git repo. **When** Run each command with sdlc/{name}, sdlc/{name:lower}, feature/{name}-x and feature/PROJ-1-{name}. **Then** Exit 0 with ok true and the format echoed.
- **Expected** Exit 0 for 16 runs. **Actual** All 16 runs exit 0 with the given format and no file change.
- **Spec source:** R-014 acceptance · **Run:** `node --test --test-name-pattern="VS-4 valid controls" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): controls. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-11 · validate_format raises Fail for hostile and non-string input · PASS
- **Given** branches.py loaded by path with python3 -I through pycall. **When** Call validate_format with the 23 invalid formats, NUL, None, 123, a list, a dict, True and 1.5. **Then** Fail for each, never another exception, no stdout.
- **Expected** Fail. **Actual** Every input raised Fail. The NUL format returned (structural check only).
- **Spec source:** R-014 quote; ADR-20261009-024036 · **Run:** `node --test --test-name-pattern="validate_format raises Fail" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): pycall. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r0/logs/security-0-transcripts.txt).

  ```console
  29 calls: 28 Fail, 1 return (NUL), 0 other exceptions
  ```


</details>

### VS-5 · A caller passes an unknown --kind, an unknown --mode or a --repo that is not a directory
Profiles: cli, security. Risk: A bad kind, mode, repo or skill file can end in a traceback, not one JSON error.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-13 | An unknown --kind or --mode exits 2 with one JSON error | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:62` |
| TC-cli-14 | All eight kinds and all four git modes pass | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:72` |
| TC-cli-15 | A --repo that is not a directory exits 2; a symlink to a directory and a path with .. pass | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:82` |
| TC-cli-16 | A missing or malformed git-modes.json fails preflight with one JSON error; the other commands still run | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:100` |
| TC-cli-20 | A git-modes.json that cannot be read fails preflight with one JSON error and exit 2, not exit 1 | PASS (r0: FAIL) | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:120` |
| TC-security-12 | Unknown kinds and modes are refused; every documented kind and mode passes | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:291` |
| TC-security-13 | A --repo that is not a directory is refused on every command | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:310` |
| TC-security-14 | A symlink to a directory and a path with .. pass | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:335` |
| TC-security-15 | A missing or malformed git-modes.json fails preflight with exit 2 and the other commands still run | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:348` |
| TC-security-16 | Observe git-modes.json and config.json shapes that only a trusted writer can make | PASS | `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:370` |
| TC-cli-21 | Other git-modes.json shapes near the fix fail preflight with one JSON error and exit 2 | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:138` |
| TC-cli-22 | A bad --repo beside a bad --kind, --mode or git-modes.json still gives one JSON error and exit 2 | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:160` |
| TC-cli-23 | A --repo directory that cannot be read, a FIFO and a non-git directory give exit 0 or a JSON error, never a traceback | PASS | `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:171` |

<details>
<summary>Case detail (13 cases)</summary>

#### TC-cli-13 · An unknown --kind or --mode exits 2 with one JSON error · PASS
- **Given** A scratch git repo and the shipped skill directory. **When** name and list run with --kind bogus, SLICE, '', 'slice ', Slice, e2e_area; preflight runs with --mode bogus, PR, '', 'pr ', Direct. **Then** Each run exits 2 and prints one {ok:false, error} line, empty stderr, no usage text.
- **Expected** Exit 2 with the JSON error object. **Actual** As expected for all 17 runs.
- **Spec source:** R-014 quote; spec §1 kinds · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-13:' branches.verify-cli.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (transcript): re-run of r0 case.

  ```console
  $ python3 <skill>/branches.py list --repo <repo> --kind SLICE
  exit: 2
  --- stdout
  {"ok": false, "error": "--kind 'SLICE' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}
  --- stderr
  (empty)
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-cli-14 · All eight kinds and all four git modes pass · PASS
- **Given** A scratch git repo. **When** name and list run with each of the eight kinds; preflight runs with pr, direct, mr and stack. **Then** Each run exits 0 with one {ok:true} object and empty stderr.
- **Expected** Exit 0. **Actual** As expected for all 20 runs.
- **Spec source:** spec §1 kind table; git-modes.json · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-14:' branches.verify-cli.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (transcript): re-run of r0 case.

  ```console
  $ python3 <skill>/branches.py preflight --repo <repo> --mode stack
  exit: 0
  --- stdout
  {"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {...}}
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-cli-15 · A --repo that is not a directory exits 2; a symlink to a directory and a path with .. pass · PASS
- **Given** A missing path, a regular file, a dangling symlink, an empty string, a symlink to the repo and a path with '..'. **When** All four commands run with each bad --repo; parse runs with the symlink and the '..' path. **Then** Bad paths exit 2 with one JSON error; the symlink and '..' paths exit 0.
- **Expected** As stated. **Actual** As expected for all 18 runs.
- **Spec source:** R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-15:' branches.verify-cli.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (transcript): re-run of r0 case.

  ```console
  $ python3 <skill>/branches.py preflight --repo <base>/missing --mode pr
  exit: 2
  --- stdout
  {"ok": false, "error": "--repo '<base>/missing' is not a directory"}
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-cli-16 · A missing or malformed git-modes.json fails preflight with one JSON error; the other commands still run · PASS
- **Given** Eight copied skill directories: git-modes.json absent, invalid JSON, empty list, wrong key, top-level list, string value, non-string entry, invalid UTF-8. **When** preflight, name, parse and list run with each copy. **Then** preflight exits 2 with one JSON error; the other three exit 0.
- **Expected** As stated. **Actual** As expected for all eight shapes.
- **Spec source:** R-014 quote; ADR-20261009-024048 (no exit 1) · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-16:' branches.verify-cli.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (transcript): re-run of r0 case.

  ```console
  $ python3 <skill-copy>/branches.py preflight --repo <repo> --mode pr   (git-modes.json absent)
  exit: 2
  --- stdout
  {"ok": false, "error": "<skill-copy>/git-modes.json is missing: restore it from git"}
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-cli-20 · A git-modes.json that cannot be read fails preflight with one JSON error and exit 2, not exit 1 · PASS
- **Given** Two copied skill directories: git-modes.json is a directory; git-modes.json has mode 000. **When** preflight --mode pr runs with each copy; parse, name and list run with each copy. **Then** preflight exits 2 with one {ok:false, error} line and empty stderr; the other commands exit 0.
- **Expected** Exit 2 with {ok:false, error}; no traceback. **Actual** Exit 2 for both shapes. The error reads 'cannot read <path>: [Errno 21] Is a directory' and '[Errno 13] Permission denied'. Stderr is empty. The other three commands exit 0. The r0 failure is fixed by 4434d71.
- **Spec source:** ADR-20261009-024048 (no exit 1); R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-20:' branches.verify-cli.test.mjs` · **Latest run:** round 1 (round 0: FAIL)
- Evidence (transcript): r0 failure re-run.

  ```console
  $ python3 <skill-98>/branches.py preflight --repo <plain-1> --mode pr
  exit: 2 (40 ms)
  --- stdout
  {"ok": false, "error": "cannot read <skill-98>/git-modes.json: [Errno 21] Is a directory: '<skill-98>/git-modes.json'"}
  --- stderr
  (empty)
  --- tree <cwd-100> (unchanged)
  --- tree <plain-1> (unchanged)
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-security-12 · Unknown kinds and modes are refused; every documented kind and mode passes · PASS
- **Given** A scratch git repo. **When** Run name and list with bogus, SLICE, '', 'slice ', ' slice', slic, 'slice\n', Cyrillic slіce, Slice and e2e_area; preflight with bogus, PR, '', 'pr ', fullwidth pr, Mr and 'stack\t'; then all 8 kinds and 4 modes. **Then** Bad values exit 2; documented values exit 0.
- **Expected** Exit 2 then exit 0. **Actual** All 27 bad values exit 2 with one JSON error and no file change. All 8 kinds and all 4 modes exit 0.
- **Spec source:** R-014 quote · **Run:** `node --test --test-name-pattern="VS-5 unknown kinds" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): kinds and modes. Full text: [security-0-vs5.txt](../../slices/S-001/verification/r0/logs/security-0-vs5.txt).

  ```console
  name --kind "slice "
  -> exit 2 {"ok": false, "error": "--kind 'slice ' is not one of run, slice, ..."}
  ```


#### TC-security-13 · A --repo that is not a directory is refused on every command · PASS
- **Given** A regular file, a dangling symlink, a missing path, '', file/..x, file:///etc, ~/no-such-dir; then the traversal corpus on parse. **When** Run each command with each path. **Then** Exit 2 with one JSON error for non-directories; one JSON object for every traversal value.
- **Expected** Exit 2 and no file change. **Actual** All 28 non-directory runs exit 2. Traversal values that name a real directory (/etc, ../../..) exit 0, as the spec allows any directory; others exit 2.
- **Spec source:** R-014 quote · **Run:** `node --test --test-name-pattern="VS-5 a --repo that is not" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): repo paths. Full text: [security-0-vs5.txt](../../slices/S-001/verification/r0/logs/security-0-vs5.txt).

  ```console
  parse --repo /nonexistent-sdlc-verify ...
  -> exit 2 {"ok": false, "error": "--repo '/nonexistent-sdlc-verify' is not a directory"}
  ```


#### TC-security-14 · A symlink to a directory and a path with .. pass · PASS
- **Given** A symlink to the scratch repo and the path <parent>/../<repo>. **When** Run every command with each path. **Then** Exit 0.
- **Expected** Exit 0, no file change. **Actual** All 8 runs exit 0.
- **Spec source:** R-014 acceptance · **Run:** `node --test --test-name-pattern="VS-5 a symlink to a directory" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): repo symlink. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r0/logs/security-0-transcripts.txt).

#### TC-security-15 · A missing or malformed git-modes.json fails preflight with exit 2 and the other commands still run · PASS
- **Given** A copied skill directory with git-modes.json removed, invalid JSON, invalid UTF-8, {}, a top-level list, gitModes as a string, empty, [1] or null, or an empty file. **When** Run preflight, then name, parse and list. **Then** preflight exits 2 with one JSON error; the other commands exit 0.
- **Expected** Exit 2 then exit 0. **Actual** All 10 variants: preflight exits 2 with one JSON error and the other three commands exit 0.
- **Spec source:** R-014 quote; ADR-20261009-024048 (no exit 1) · **Run:** `node --test --test-name-pattern="VS-5 a missing or malformed git-modes" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): git-modes variants. Full text: [security-0-vs5.txt](../../slices/S-001/verification/r0/logs/security-0-vs5.txt).

#### TC-security-16 · Observe git-modes.json and config.json shapes that only a trusted writer can make · PASS
- **Given** A copied skill directory and scratch repos. **When** Make git-modes.json a directory, unreadable (mode 000) or nested 200000 deep; make config.json nested 200000 deep or a FIFO. **Then** Record only: these need write access to the skill directory or the repo state.
- **Expected** Recorded behavior. **Actual** git-modes.json as a directory, unreadable or deeply nested: preflight exits 1 with a Python traceback (IsADirectoryError, PermissionError, RecursionError). Deep config.json: every command exits 1 with RecursionError. config.json as a FIFO: the command blocks until killed.
- **Spec source:** none (out of scope; see seeds) · **Run:** `node --test --test-name-pattern="VS-5 observe" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Latest run:** round 0
- Evidence (attack): trusted-writer shapes. Full text: [security-0-vs5-observe.txt](../../slices/S-001/verification/r0/logs/security-0-vs5-observe.txt).

  ```console
  gm-directory -> exit 1 IsADirectoryError
  gm-unreadable -> exit 1 PermissionError
  gm-deep-nesting -> exit 1 RecursionError
  config-deep -> exit 1 RecursionError
  config-fifo -> no exit, killed after 3 s
  ```


#### TC-cli-21 · Other git-modes.json shapes near the fix fail preflight with one JSON error and exit 2 · PASS
- **Given** Eight copied skill directories: 100000-deep nested list, a symlink loop, a dangling symlink, an empty file, UTF-16 with BOM, top-level null, gitModes as an object, an empty-string mode. **When** preflight runs with --mode pr and --mode bogus on each copy; name and list run on each copy. **Then** Both preflight runs exit 2 with one JSON error and empty stderr; name and list exit 0.
- **Expected** As stated. **Actual** As expected for all eight shapes. The symlink loop gives '[Errno 62] Too many levels of symbolic links' through the new OSError branch. The deep list parses and fails the shape check.
- **Spec source:** R-014 quote; ADR-20261009-024048 (no exit 1) · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-21:' branches.verify-cli.test.mjs` · **Latest run:** round 1
- Evidence (transcript): fix-adjacent shapes.

  ```console
  $ python3 <skill-113>/branches.py preflight --repo <repo> --mode pr   (symlink loop)
  exit: 2
  --- stdout
  {"ok": false, "error": "cannot read <skill-113>/git-modes.json: [Errno 62] Too many levels of symbolic links: ..."}
  $ ... (utf16)
  exit: 2
  {"ok": false, "error": "<skill-128>/git-modes.json must hold {\"gitModes\": [...]}: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte"}
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-cli-22 · A bad --repo beside a bad --kind, --mode or git-modes.json still gives one JSON error and exit 2 · PASS
- **Given** A missing --repo path and a skill copy whose git-modes.json is a directory. **When** name, list and preflight run with two bad inputs at once. **Then** Each run exits 2 with one JSON error and empty stderr.
- **Expected** As stated. **Actual** As expected for all five runs.
- **Spec source:** R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-22:' branches.verify-cli.test.mjs` · **Latest run:** round 1
- Evidence (transcript): combined bad inputs.

  ```console
  $ python3 <skill-copy>/branches.py preflight --repo <combo>/missing --mode pr
  exit: 2
  --- stdout
  {"ok": false, "error": "--repo '<combo>/missing' is not a directory"}
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

#### TC-cli-23 · A --repo directory that cannot be read, a FIFO and a non-git directory give exit 0 or a JSON error, never a traceback · PASS
- **Given** A directory with mode 000, a FIFO and a plain directory with no .git. **When** parse and preflight run on the FIFO; name and preflight run on the plain directory; parse and list run on the mode-000 directory with and without --format. **Then** The FIFO exits 2. The plain directory exits 0. The mode-000 directory gives one JSON object with exit 0 or 2.
- **Expected** No traceback; one JSON object. **Actual** FIFO: exit 2, not a directory. Plain directory: exit 0. Mode 000 without --format: exit 2, 'cannot read <repo>/.sdlc/config.json: [Errno 13] Permission denied'. Mode 000 with --format: exit 0. Bad --kind on it: exit 2.
- **Spec source:** R-014 quote · **Run:** `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-23:' branches.verify-cli.test.mjs` · **Latest run:** round 1
- Evidence (transcript): repo permission shapes.

  ```console
  $ python3 <skill>/branches.py parse --repo <repo-perm>/locked --branch x
  exit: 2 (43 ms)
  --- stdout
  {"ok": false, "error": "cannot read <repo-perm>/locked/.sdlc/config.json: [Errno 13] Permission denied: ..."}
  --- stderr
  (empty)
  $ ... parse --repo <repo-perm>/locked --branch x --format 'sdlc/{name}'
  exit: 0 (40 ms)
  ```

- Evidence (transcript): all transcripts with tree diffs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r1/logs/cli-0-transcripts.txt).
- 1 more evidence items: [cli-0.md](../../slices/S-001/verification/r1/cli-0.md).

</details>

### VS-6 · load_format resolves the branch format from the repo config or falls back to the default
Profiles: contract, cli. Risk: A wrong fallback or a raw exception in load_format misleads every command that relies on it.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-17 | parse and list without --format print the config format or the default | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:270` |
| TC-cli-18 | An unreadable or malformed config exits 2 with one JSON error, not a traceback | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:292` |
| TC-cli-19 | A config with a UTF-8 BOM is recorded | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:312` |
| TC-contract-6 | load_format resolves each named config state, and a read error raises Fail | PASS (r0: FAIL) | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:54` |
| TC-contract-7 | Property: load_format returns the config string, the default, or Fail, and never another exception | PASS (r0: FAIL) | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:83` |
| TC-contract-12 | load_format turns every parse and read error near the fix into Fail, and still reads valid nested JSON | PASS | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:139` |
| TC-contract-15 | load_format gives the same outcome for the same config across two processes | PASS | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:223` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-17 · parse and list without --format print the config format or the default · PASS
- **Given** Scratch repos whose config holds feature/{name}, x/{name:lower}, no key, '', null, 7, a list; a top-level list or string; no config.json; no .sdlc. **When** parse --branch x and list --kind slice with no --format. **Then** format is the config value when it is a non-empty string, else sdlc/{name}.
- **Expected** Config value for the two string cases; sdlc/{name} for the other nine. **Actual** As expected for all 11 states.
- **Spec source:** R-016 quote and acceptance · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-17:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-17 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-18 · An unreadable or malformed config exits 2 with one JSON error, not a traceback · PASS
- **Given** Config is truncated JSON, a directory, invalid UTF-8, or mode 000. **When** parse --branch x with no --format. **Then** Exit 2 with one JSON error object; no traceback.
- **Expected** As expected. **Actual** As expected for all four states.
- **Spec source:** R-014 quote; ADR-20261009-024048 (no exit 1) · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-18:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-18 runs. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-cli-19 · A config with a UTF-8 BOM is recorded · PASS
- **Given** Config holds a UTF-8 BOM, then {"branchFormat":"feature/{name}"}. **When** parse --branch x with no --format. **Then** One JSON object; behavior recorded.
- **Expected** Record only. **Actual** Exit 2: 'is not valid JSON: Unexpected UTF-8 BOM'. Reported as a seed.
- **Spec source:** R-014 quote (one JSON object) · **Run:** `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-19:' branches.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): TC-cli-19 run. Full text: [cli-0-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-0-transcripts.txt).

#### TC-contract-6 · load_format resolves each named config state, and a read error raises Fail · PASS
- **Given** 15 scratch repos: branchFormat feature/{name}, key missing, empty string, file absent, no .sdlc, null, number, list, top-level list, top-level string, BOM, invalid JSON, directory, mode 000, 200000 nested [ **When** load_format(repo) is called in one python3 -I process through the testkit pycall.py **Then** each state gives the config value, sdlc/{name}, or Fail; no other exception
- **Expected** feature/{name} for the first state, sdlc/{name} for the 9 fallback states, Fail for the 5 error states **Actual** 15 of 15 as expected. Deep nesting now raises Fail: '<path> is not valid JSON: RecursionError: ...'
- **Spec source:** R-016 acceptance; R-014 quote; VS-6 note (a read error must raise Fail) · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-6 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1 (round 0: FAIL)
- Evidence (file-tree): surface listing.

  ```diff
    branches.py loaded by path (python3 -I, scratch cwd), commit 4434d71:
    DEFAULT_FORMAT = 'sdlc/{name}'
    Fail(Exception)
    load_format(repo)
    validate_format(fmt)
    load_git_modes(path=<skill>/git-modes.json)
    main(argv=None)
    build_parser(), cmd_name/cmd_parse/cmd_list/cmd_preflight(ns), JsonArgumentParser
    KINDS, PLACEHOLDERS, GIT_MODES_PATH
    Unchanged from round 0 (TC-contract-1).
  ```

- Evidence (property-run): named states (re-run of the round 0 failure).
  `deep nesting -> outcome Fail, type Fail
message: <repo>/.sdlc/config.json is not valid JSON: RecursionError: maximum recursion depth exceeded ...
all other 14 rows unchanged from round 0`
- 1 more evidence items: [contract-0.md](../../slices/S-001/verification/r1/contract-0.md).

#### TC-contract-7 · Property: load_format returns the config string, the default, or Fail, and never another exception · PASS
- **Given** arb.configShape from the testkit: absent, no .sdlc, directory, valid and non-object JSON, invalid text, deep nesting, invalid UTF-8, symlinks, unreadable files **When** load_format is called 1000 times with seed 20261009 **Then** no outcome is a raw exception; JSON shapes match the reference model written from R-016
- **Expected** 0 violations **Actual** 0 violations. Distribution: json:return 301, absent:return 66, no-sdlc-dir:return 71, bytes:Fail 69, dir:Fail 70, text:Fail 183, dangling-symlink:return 76, symlink-loop:Fail 72, text:return 27, unreadable:Fail 65
- **Spec source:** R-016 acceptance; R-014 quote; VS-6 note · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-7 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1 (round 0: FAIL)
- Evidence (property-run): load_format property.
  `property load_format: seed=20261009 runs=1000 violations=0
round 0 had 34 RecursionError violations at the same seed
no shrinking (testkit has none); no counterexample`

#### TC-contract-12 · load_format turns every parse and read error near the fix into Fail, and still reads valid nested JSON · PASS
- **Given** 12 config texts: deep arrays, deep objects, deep mixed, deep under branchFormat, 100000 closed arrays, 400-deep valid nesting beside branchFormat, a 5000-digit integer, invalid UTF-8, an empty file, a NaN literal, a duplicate key, a non-ASCII format **When** load_format(repo) is called through pycall.py **Then** each error gives Fail with no stdout and no stderr; each valid JSON gives the model value
- **Expected** Fail for the 4 unclosed deep texts, the huge integer, invalid UTF-8 and the empty file; sdlc/{name} for the closed top-level list; a/{name}, a/{name}, b/{name}, é/{name} for the rest **Actual** 12 of 12 as expected. Messages name the cause: RecursionError, ValueError (int digits limit), UnicodeDecodeError, JSONDecodeError
- **Spec source:** R-016 acceptance; R-014 quote; VS-6 note · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-12 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1
- Evidence (property-run): fix-adjacent states.
  `deep arrays              Fail RecursionError
deep objects             Fail RecursionError
deep mixed               Fail RecursionError
deep under branchFormat  Fail RecursionError
deep closed arrays       return sdlc/{name}
nested 400 with format   return a/{name}
huge integer             Fail ValueError
invalid utf-8            Fail UnicodeDecodeError
empty file               Fail JSONDecodeError
NaN literal              return a/{name}
duplicate key            return b/{name}
unicode format           return é/{name}`

#### TC-contract-15 · load_format gives the same outcome for the same config across two processes · PASS
- **Given** arb.configShape with seed 20261010 **When** two separate batches of 300 load_format calls run on identical materialized configs **Then** each pair has the same outcome, value and type
- **Expected** 0 differences, 0 violations **Actual** 0 differences, 0 violations in either batch
- **Spec source:** Contract profile determinism corner; R-016 · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-15 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1
- Evidence (property-run): determinism.
  `seed=20261010 runs=300 differences=0 violationsA=0 violationsB=0`

</details>

### VS-7 · A command without --format uses the config format, and --format wins over the config
Profiles: cli, contract. Risk: The wrong precedence between the config and --format gives the wrong branch names.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 (cli-1) | A command without --format prints the config format | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:60` |
| TC-cli-2 (cli-1) | --format wins over the config format | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:65` |
| TC-cli-3 (cli-1) | An invalid config format fails without --format, and a valid --format overrides it | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:73` |
| TC-cli-4 (cli-1) | Malformed config JSON fails without --format; with --format the config is not read | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:81` |
| TC-cli-5 (cli-1) | An empty, missing or non-string config value falls back to sdlc/{name} | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:101` |
| TC-cli-6 (cli-1) | An empty --format is refused, not replaced by the config format | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:111` |
| TC-cli-7 (cli-1) | An unreadable config or a directory in its place gives one JSON error | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:117` |
| TC-contract-8 | A command without --format uses the config format, --format wins, and a bad config exits 2 with one JSON error | PASS (r0: FAIL) | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:105` |
| TC-contract-13 | main(argv) in-process returns 2 with one JSON error for each deep config, and the next call still works | PASS | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:162` |
| TC-contract-14 | The CLI gives one JSON error with exit 2 for each deep config on all four commands | PASS | `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:205` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-cli-1 (cli-1) · A command without --format prints the config format · PASS
- **Given** A scratch git repo with .sdlc/config.json {gitMode: pr, branchFormat: feature/{name}} **When** name, parse, list and preflight run from a scratch cwd without --format **Then** Each prints one JSON object with format feature/{name}
- **Expected** exit 0, one JSON object, ok true, format feature/{name}, empty stderr, repo and cwd trees unchanged **Actual** All four commands: exit 0, format feature/{name}, stderr empty, trees unchanged
- **Spec source:** R-016 quote; R-014 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): parse without --format.

  ```console
  $ python3 branches.py parse --repo <scratch>/repo --branch feature/S-1
  exit: 0
  --- stdout
  {"ok": true, "command": "parse", "format": "feature/{name}", "args": {...}}
  --- stderr
  (empty)
  ```

- Evidence (transcript): all four commands. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).
- 1 more evidence items: [cli-1.md](../../slices/S-001/verification/r0/cli-1.md).

#### TC-cli-2 (cli-1) · --format wins over the config format · PASS
- **Given** Config branchFormat feature/{name} **When** Each command runs with --format sdlc/{name}, with --format=sdlc/{name:lower}, and with --format before the other flags **Then** format is the --format value
- **Expected** exit 0 and format sdlc/{name} or sdlc/{name:lower}, never feature/{name} **Actual** 9 runs: exit 0, format equals the --format value in each
- **Spec source:** R-016 quote (config is the fallback); R-014 acceptance (documented flags) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): override runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).
- Evidence (file-tree): repo and cwd.

  ```diff
    unchanged
  ```


#### TC-cli-3 (cli-1) · An invalid config format fails without --format, and a valid --format overrides it · PASS
- **Given** Config branchFormat in: feature/x, 'a {name}', {name}{name}, x/{name}}, x/{id}, x/{name}+TAB **When** Each command runs without --format, then with --format sdlc/{name} **Then** Without --format exit 2 with one {ok:false,error}; with --format exit 0
- **Expected** exit 2, stdout exactly {ok:false,error:<non-empty>}, no traceback; then exit 0 **Actual** 48 runs as expected. Example: exit 2, {"ok": false, "error": "the branch format 'feature/x' must hold exactly one {name} or {name:lower}, found 0"}
- **Spec source:** R-014 quote (exit 2 on bad input); ADR-20261009-024036 (structural checks in S-001) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): config feature/x, name without --format.

  ```console
  $ python3 branches.py name --repo <scratch>/repo --kind slice --id S-1
  exit: 2
  --- stdout
  {"ok": false, "error": "the branch format 'feature/x' must hold exactly one {name} or {name:lower}, found 0"}
  --- stderr
  (empty)
  ```

- Evidence (transcript): all runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).
- 1 more evidence items: [cli-1.md](../../slices/S-001/verification/r0/cli-1.md).

#### TC-cli-4 (cli-1) · Malformed config JSON fails without --format; with --format the config is not read · PASS
- **Given** config.json holds '{not json', a trailing comma object, or a UTF-8 BOM before valid JSON **When** Each command runs without --format, then with --format sdlc/{name} **Then** Without --format: exit 2 with one JSON error. With --format: recorded only
- **Expected** exit 2 and one {ok:false,error} for invalid JSON **Actual** Invalid JSON: exit 2 with one JSON error. BOM: exit 2 ('Unexpected UTF-8 BOM'), recorded as a seed. With --format: exit 0 for all three files, because load_format is not called
- **Spec source:** R-014 quote; spec silent on malformed config with --format (recorded) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): malformed config with --format.

  ```console
  $ python3 branches.py parse --repo <scratch>/repo --branch feature/S-1 --format 'sdlc/{name}'
  exit: 0
  --- stdout
  {"ok": true, "command": "parse", "format": "sdlc/{name}", ...}
  ```

- Evidence (transcript): all runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-cli-5 (cli-1) · An empty, missing or non-string config value falls back to sdlc/{name} · PASS
- **Given** No config, {}, branchFormat '', null, 7, a list, top-level list, top-level string, and a repo without .sdlc **When** Each command runs without --format **Then** format is sdlc/{name}
- **Expected** exit 0, format sdlc/{name} **Actual** 33 runs: exit 0, format sdlc/{name}
- **Spec source:** R-016 quote and acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): fallback runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).
- Evidence (file-tree): repo and cwd.

  ```diff
    unchanged
  ```


#### TC-cli-6 (cli-1) · An empty --format is refused, not replaced by the config format · PASS
- **Given** Config branchFormat feature/{name} **When** Each command runs with --format '' and --format= **Then** exit 2 with one JSON error
- **Expected** exit 2, {ok:false,error} **Actual** 8 runs: exit 2, error "the branch format '' must hold exactly one {name} or {name:lower}, found 0"
- **Spec source:** R-014 quote; ADR-20261009-024036 · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): empty --format.

  ```console
  $ python3 branches.py name --repo <scratch>/repo --kind slice --id S-1 --format ''
  exit: 2
  --- stdout
  {"ok": false, "error": "the branch format '' must hold exactly one {name} or {name:lower}, found 0"}
  ```


#### TC-cli-7 (cli-1) · An unreadable config or a directory in its place gives one JSON error · PASS
- **Given** config.json is a directory, or a file with mode 000 **When** Each command runs without --format **Then** exit 2 with one JSON error, no traceback
- **Expected** exit 2, {ok:false,error} **Actual** 8 runs: exit 2 with 'cannot read ...' JSON error, stderr empty
- **Spec source:** R-014 quote · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): unreadable config runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-contract-8 · A command without --format uses the config format, --format wins, and a bad config exits 2 with one JSON error · PASS
- **Given** repos with config feature/{name}, feature/x, 'a {name}', truncated JSON, and 200000 nested [ **When** parse, list and name run through the testkit cli-runner with and without --format **Then** the config value or the flag value is the format; a bad config without the flag exits 2 with one JSON error
- **Expected** 11 of 11 rows as expected **Actual** 11 of 11 pass. parse and name on the deeply nested config now exit 2 with one JSON line, ok false, and empty stderr. Malformed config plus a valid --format exits 0 (recorded, as in round 0)
- **Spec source:** R-014 quote; R-016 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-8 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1 (round 0: FAIL)
- Evidence (property-run): CLI rows.
  `parse config            0 feature/{name}
list config             0 feature/{name}
parse flag wins         0 sdlc/{name}
list flag wins          0 sdlc/{name}
invalid config          2 ok:false
invalid config + flag   0 sdlc/{name}
spaced config           2 ok:false
malformed config        2 ok:false
malformed config + flag 0 sdlc/{name}
deeply nested config    2 ok:false, 1 line, stderr ''
deeply nested, name     2 ok:false, 1 line, stderr ''`

#### TC-contract-13 · main(argv) in-process returns 2 with one JSON error for each deep config, and the next call still works · PASS
- **Given** a module loaded by path; repos with 200000 nested [, 100000 nested {"a":, and feature/{name} **When** main() runs parse, name, list, preflight on the deep repos, then parse on the good repo and parse with --format on a deep repo, in one process **Then** no exception escapes; each call prints one JSON line; later calls are not damaged by the earlier RecursionError
- **Expected** rc 2 2 2 2 2 0 0; formats feature/{name} and sdlc/{name} for the last two; empty stderr **Actual** rc 2 2 2 2 2 0 0; exc none; one line each; formats feature/{name}, sdlc/{name}; stderr ''
- **Spec source:** R-014 quote; R-013 (main callable by an importer) · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-13 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1
- Evidence (property-run): in-process calls.
  `parse     rc 2 ok false
name      rc 2 ok false
list      rc 2 ok false
preflight rc 2 ok false
parse     rc 2 ok false
parse     rc 0 ok true format feature/{name}
parse     rc 0 ok true format sdlc/{name} (--format given, config not read)
stderr: ''`

#### TC-contract-14 · The CLI gives one JSON error with exit 2 for each deep config on all four commands · PASS
- **Given** repos with 200000 nested [ and 100000 nested {"a": **When** name, parse, list and preflight run through the testkit cli-runner without --format **Then** exit 2, one JSON line, ok false, empty stderr, no file change
- **Expected** 8 of 8 rows exit 2 with one JSON error **Actual** 8 of 8 as expected; stderr empty; tree unchanged
- **Spec source:** R-014 quote · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-14 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 1
- Evidence (property-run): CLI rows.
  `arrays parse/name/list/preflight   2 ok:false 1 line stderr ''
objects parse/name/list/preflight  2 ok:false 1 line stderr ''`

</details>

### VS-8 · A probe imports branches.py by path and finds a stdlib-only module with its public functions
Profiles: contract, cli. Risk: A side effect or a non-stdlib import at import time breaks the three scripts that import the module.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-8 (cli-1) | python3 branches.py <command> runs from a scratch cwd under -I, and with spaces and unicode in paths | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:129` |
| TC-cli-9 (cli-1) | Import by path: no side effect, public functions present, stdlib only, main returns a code | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:197` |
| TC-cli-10 (cli-1) | The module imports and parse runs without git-modes.json and without git | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:223` |
| TC-contract-1 | A consumer imports branches.py by path and finds Fail, load_format, validate_format and main | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:55` |
| TC-contract-2 | The import has no side effect and pulls only stdlib modules | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:72` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-8 (cli-1) · python3 branches.py <command> runs from a scratch cwd under -I, and with spaces and unicode in paths · PASS
- **Given** Scratch repo with config feature/{name}; empty PYTHONPATH **When** python3 -I branches.py <cmd> from a scratch cwd; then parse with cwd 'with space é' and repo 'repo ü x' **Then** Each prints one JSON object with exit 0
- **Expected** exit 0, format feature/{name}, empty stderr **Actual** 5 runs: exit 0, one JSON object, format feature/{name}
- **Spec source:** R-013 acceptance ('python3 branches.py <command> runs') · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): -I runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-cli-9 (cli-1) · Import by path: no side effect, public functions present, stdlib only, main returns a code · PASS
- **Given** A copy of the skill directory, bytecode writing on, open() and subprocess spied **When** A probe under python3 -I from a scratch cwd loads branches.py via spec_from_file_location, parses its imports with ast, and calls main() with 8 argv lists **Then** No stdout, no file open, no subprocess at import; Fail subclasses Exception; load_format, validate_format, main callable; all imports in sys.stdlib_module_names; main returns 0 or 2 for every command input
- **Expected** As stated **Actual** Import stdout empty; no open; no subprocess; Fail is an Exception; all three callable; nonStdlib []; only __pycache__ added. main returns 0 for valid parse and name, 2 for 'name', [], 'bogus' and a bad --format. main(['--help']) and main(['parse','-h']) raise SystemExit(0) after printing usage (spec does not define --help; seed)
- **Spec source:** R-013 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): probe run and main() outcomes. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).
- Evidence (file-tree): skill copy, cwd, repo.

  ```diff
    + __pycache__/branches.cpython-314.pyc only
  ```


#### TC-cli-10 (cli-1) · The module imports and parse runs without git-modes.json and without git · PASS
- **Given** A skill copy without git-modes.json; PATH starts with a fake git that records each call **When** Load the module by path and call load_format and validate_format; run parse and preflight **Then** Import and parse succeed; git is never called; preflight fails with one JSON error
- **Expected** stdout 'feature/{name} sdlc/{name}'; parse exit 0; preflight exit 2 JSON **Actual** As expected; the fake git marker file was never written
- **Spec source:** R-013 acceptance (importable, runnable) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): no git-modes, fake git. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).
- Evidence (file-tree): fake git dir.

  ```diff
    unchanged: git was not called
  ```


#### TC-contract-1 · A consumer imports branches.py by path and finds Fail, load_format, validate_format and main · PASS
- **Given** skills/sdlc/branches.py at the slice commit; a scratch cwd; python3 -I (no PYTHONPATH, no site) **When** The probe loads the module through importlib.util.spec_from_file_location and lists its public names and signatures with inspect **Then** Fail subclasses Exception; load_format(repo), validate_format(fmt) and main(argv=None) are callable
- **Expected** The spec §2 functions exist with the spec signatures; Fail is an Exception **Actual** All present: load_format(repo), validate_format(fmt), main(argv=None); Fail MRO Fail -> Exception
- **Spec source:** R-013 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-1 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (file-tree): surface listing.

  ```diff
    branches.py (loaded by path with python3 -I, importlib.util.spec_from_file_location, scratch cwd)
    Fail                 class, MRO Fail -> Exception -> BaseException
    load_format          function (repo)
    validate_format      function (fmt)
    main                 function (argv=None)
    load_git_modes       function (path=<skill dir>/git-modes.json)
    build_parser         function ()
    cmd_name/cmd_parse/cmd_list/cmd_preflight  function (ns)
    JsonArgumentParser   class
    DEFAULT_FORMAT='sdlc/{name}'  KINDS(tuple)  PLACEHOLDERS(tuple)  GIT_MODES_PATH(str)
    module imports: argparse, json, os, re, sys (all in sys.stdlib_module_names)
  ```


#### TC-contract-2 · The import has no side effect and pulls only stdlib modules · PASS
- **Given** Spies on builtins.open and subprocess.Popen; a listing of the scratch cwd **When** The probe imports branches.py by path, then parses its source with ast **Then** No stdout or stderr output; no read of git-modes.json or config.json; no subprocess; no new file in cwd; every imported top-level name is in sys.stdlib_module_names
- **Expected** No side effect; stdlib only **Actual** stdout "", stderr "", opened [], subprocess [], cwd unchanged, imports [argparse, json, os, re, sys], nonStdlib []
- **Spec source:** R-013 quote and acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-2 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (log): probe output.

  ```text
  {"stdout":"","stderr":"","opened":[],"subprocess":[],"cwdChanged":false,"imports":["argparse","json","os","re","sys"],"nonStdlib":[]}
  ```


</details>

### VS-9 · next-action.py, state-write.py and janitor.py import branches from their own directory when run from another directory
Profiles: cli, contract, security. Risk: A decoy branches module can shadow the real one and run foreign code inside the loop.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-11 (cli-1) | A decoy branches.py in the cwd does not shadow the real module | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:32` |
| TC-cli-12 (cli-1) | A decoy branches module on PYTHONPATH does not shadow the real module | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:45` |
| TC-cli-13 (cli-1) | Each script runs through a symlink, a relative path and python3 -I | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:59` |
| TC-contract-9 | Each script loaded by path binds mod.branches to the real branches.py, past a decoy in cwd and on PYTHONPATH | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:270` |
| TC-contract-10 | Each script runs --help through a symlink in another directory and through a relative path | PASS | `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:310` |
| TC-security-17 | A decoy branches.py in the cwd or on PYTHONPATH never wins | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:31` |
| TC-security-18 | A script loaded by path through importlib from a decoy cwd binds the real module | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:54` |
| TC-security-19 | A script run through a symlink without a decoy still runs | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:67` |
| TC-security-20 | A script run through a symlink imports branches from the script directory, not the symlink directory | PASS (r0: FAIL) | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:77` |
| TC-security-23 | A chain of two symlinks with a decoy beside each link resolves to the real script directory | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:90` |
| TC-security-24 | A relative symlink run by a relative path from a decoy cwd resolves to the real module | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:104` |
| TC-security-25 | A script reached through a symlinked skill directory binds the real module | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:117` |
| TC-security-26 | A script loaded through importlib by a symlink path with a decoy beside the link binds the real module | PASS | `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:133` |

<details>
<summary>Case detail (13 cases)</summary>

#### TC-cli-11 (cli-1) · A decoy branches.py in the cwd does not shadow the real module · PASS
- **Given** A scratch cwd that holds a decoy branches.py which records its import and exits 97 **When** Each script runs --help from that cwd, and is loaded by path through importlib from that cwd **Then** --help exits 0; mod.branches.__file__ is the skill's branches.py; the decoy never runs
- **Expected** exit 0 and the real path **Actual** All three scripts: exit 0, real path, decoy marker absent. A mutant without the sys.path.insert line fails this case
- **Spec source:** R-098 acceptance (import resolves through the script directory) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): decoy cwd runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-cli-12 (cli-1) · A decoy branches module on PYTHONPATH does not shadow the real module · PASS
- **Given** PYTHONPATH names a dir with an exiting decoy, a shadowing decoy, or a branches package that exits 97 **When** Each script runs --help **Then** exit 0, usage printed, decoy never imported
- **Expected** exit 0 **Actual** 9 runs: exit 0, decoy marker absent
- **Spec source:** R-098 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): PYTHONPATH decoy runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-cli-13 (cli-1) · Each script runs through a symlink, a relative path and python3 -I · PASS
- **Given** A symlink to each script in another directory; a scratch cwd **When** python3 <symlink> --help; python3 <relative path> --help; python3 -I <script> --help **Then** exit 0 each
- **Expected** exit 0 **Actual** 9 runs: exit 0. A mutant without the sys.path.insert line fails the -I run
- **Spec source:** R-098 acceptance (runs with the cwd outside the skill directory) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): symlink, relative and -I runs. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-contract-9 · Each script loaded by path binds mod.branches to the real branches.py, past a decoy in cwd and on PYTHONPATH · PASS
- **Given** A scratch cwd that holds a decoy branches.py; a second decoy directory on PYTHONPATH (non-isolated python3) **When** The probe loads next-action.py, state-write.py and janitor.py through importlib from that cwd **Then** mod.branches.__file__ resolves to skills/sdlc/branches.py; no decoy import is recorded
- **Expected** The real module for all three scripts in both runs **Actual** All six bindings name skills/sdlc/branches.py; neither decoy fired
- **Spec source:** R-098 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-9 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (log): bindings.

  ```text
  {"next-action.py": ".../skills/sdlc/branches.py", "state-write.py": ".../skills/sdlc/branches.py", "janitor.py": ".../skills/sdlc/branches.py"} (x2 runs)
  decoyFired(cwd decoy) = null, decoyFired(PYTHONPATH decoy) = null
  ```


#### TC-contract-10 · Each script runs --help through a symlink in another directory and through a relative path · PASS
- **Given** A symlink to each script in a scratch directory; a relative path ../<script> from skills/sdlc/test **When** python3 <path> --help runs from a scratch cwd **Then** Exit 0 in both forms
- **Expected** exit 0 **Actual** link 0 and relative 0 for all three scripts. Recorded: with a decoy branches.py beside the symlink, the decoy is imported and exits 97 (see seeds)
- **Spec source:** R-098 acceptance; R-013 quote · **Run:** `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-10 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs` · **Latest run:** round 0
- Evidence (log): per-script status.

  ```text
  next-action.py  link 0  relative 0  linkBesideDecoy 97 (decoy fired)
  state-write.py  link 0  relative 0  linkBesideDecoy 97 (decoy fired)
  janitor.py      link 0  relative 0  linkBesideDecoy 97 (decoy fired)
  ```


#### TC-security-17 · A decoy branches.py in the cwd or on PYTHONPATH never wins · PASS
- **Given** A decoy branches.py (exits 97) in the cwd and one on PYTHONPATH; a shadow decoy on PYTHONPATH with PYTHONSAFEPATH=1. **When** Run each of next-action.py, state-write.py and janitor.py with --help by absolute path, by a relative path, and with python3 -I. **Then** Exit 0, no traceback, and no decoy import recorded.
- **Expected** Exit 0, no traceback, and no decoy import recorded. **Actual** All 12 runs exit 0. No decoy marker file exists.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a decoy branches.py in the cwd" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (attack): decoy in cwd and on PYTHONPATH. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).
- Evidence (file-tree): decoy markers.

  ```diff
    decoyFired(cwd decoy) = null
    decoyFired(PYTHONPATH decoy) = null
    decoyFired(shadow decoy) = null
  ```


#### TC-security-18 · A script loaded by path through importlib from a decoy cwd binds the real module · PASS
- **Given** A decoy branches.py in the cwd and on PYTHONPATH. **When** python3 -c loads each script with spec_from_file_location and prints mod.branches.__file__. **Then** The printed path is skills/sdlc/branches.py; no decoy import.
- **Expected** The printed path is skills/sdlc/branches.py; no decoy import. **Actual** All three print skills/sdlc/branches.py. No decoy marker exists.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script loaded by path through importlib from a decoy cwd" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (attack): importlib from a decoy cwd. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

#### TC-security-19 · A script run through a symlink without a decoy still runs · PASS
- **Given** A symlink to each script in a scratch directory. **When** Run python3 <link> --help. **Then** Exit 0.
- **Expected** Exit 0. **Actual** All three exit 0 and print their usage.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script run through a symlink without" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1 (round 0: PASS)
- Evidence (attack): clean symlink. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

#### TC-security-20 · A script run through a symlink imports branches from the script directory, not the symlink directory · PASS
- **Given** A directory that holds a symlink to the script and a decoy branches.py (exits 97). **When** Run python3 <dir>/<script> --help for next-action.py, state-write.py and janitor.py. **Then** Exit 0; no decoy import.
- **Expected** Exit 0; no decoy import. **Actual** All three exit 0 and print their usage. No decoy marker exists. Round 0 failed here with exit 97; the fix in 4434d71 inserts os.path.dirname(os.path.realpath(__file__)).
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script run through a symlink imports" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1 (round 0: FAIL)
- Evidence (attack): symlink with a decoy beside the link. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

  ```console
  $ python3 <scratch>/link-decoy-22/next-action.py --help
  exit: 0 (50 ms)
  --- stdout
  usage: next-action.py [-h] --repo REPO [--main-root MAIN_ROOT] [--spec SPEC] ...
  --- tree <scratch>/cwd-23 (unchanged)
  ```

- Evidence (file-tree): decoy marker.

  ```diff
    decoyFired(link-decoy decoy) = null for all three scripts
  ```


#### TC-security-23 · A chain of two symlinks with a decoy beside each link resolves to the real script directory · PASS
- **Given** Directory a holds a link to b/<script>; directory b holds a link to the real script. Each directory holds a decoy branches.py. The cwd is a. **When** Run python3 a/<script> --help. **Then** Exit 0; neither decoy is imported.
- **Expected** Exit 0; neither decoy is imported. **Actual** All three exit 0. Neither decoy marker exists.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a chain of symlinks" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1
- Evidence (attack): symlink chain. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

#### TC-security-24 · A relative symlink run by a relative path from a decoy cwd resolves to the real module · PASS
- **Given** The cwd holds a relative symlink to the script and a decoy branches.py. PYTHONPATH holds a decoy branches package (__init__.py exits 97). **When** Run python3 ./<script> --help from that cwd. **Then** Exit 0; neither decoy is imported.
- **Expected** Exit 0; neither decoy is imported. **Actual** All three exit 0. Neither decoy marker exists.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a relative symlink" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1
- Evidence (attack): relative symlink, decoy module and decoy package. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

#### TC-security-25 · A script reached through a symlinked skill directory binds the real module · PASS
- **Given** A directory holds a symlink to the whole skill directory and a decoy branches.py. **When** Load each script through the linked directory with importlib and print mod.branches.__file__; also run it with --help. **Then** The bound file resolves to skills/sdlc/branches.py; exit 0; no decoy import.
- **Expected** The bound file resolves to skills/sdlc/branches.py; exit 0; no decoy import. **Actual** All three bind the real branches.py and exit 0. No decoy marker exists.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script reached through a symlinked skill directory" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1
- Evidence (attack): symlinked skill directory. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

#### TC-security-26 · A script loaded through importlib by a symlink path with a decoy beside the link binds the real module · PASS
- **Given** A directory holds a symlink to the script and a decoy branches.py; the cwd and PYTHONPATH are that directory. **When** python3 -c loads <dir>/<script> with spec_from_file_location and prints mod.branches.__file__. **Then** The bound file resolves to skills/sdlc/branches.py; no decoy import.
- **Expected** The bound file resolves to skills/sdlc/branches.py; no decoy import. **Actual** All three bind the real branches.py. No decoy marker exists.
- **Spec source:** R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path') · **Run:** `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script loaded through importlib by a symlink path" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs` · **Latest run:** round 1
- Evidence (attack): importlib through a symlink. Full text: [security-0-transcripts.txt](../../slices/S-001/verification/r1/logs/security-0-transcripts.txt).

</details>

### VS-10 · Branch recognition in the three scripts gives the same result after the import lands
Profiles: cli. Risk: The new import line can change how the three scripts recognize slice branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-14 (cli-1) | next-action.py finds an in-progress slice on its own branch, same as on main | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:111` |
| TC-cli-15 (cli-1) | state-write.py base-branch names the awaiting-merge dependency branch, same as on main | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:128` |
| TC-cli-16 (cli-1) | janitor.py removes v-branches of a done and an unknown slice and keeps live branches, same as on main | PASS | `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:147` |
| TC-cli-17 (cli-1) | The existing next-action, scripts, git-modes and branches suites pass, with no assertion changed | PASS | manual |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-14 (cli-1) · next-action.py finds an in-progress slice on its own branch, same as on main · PASS
- **Given** A ledger repo on main; branch sdlc/S-1 marks S-1 in_progress at phase implement **When** next-action.py --repo <repo> --bar-raiser-rounds 0 from a scratch cwd, with the slice skill and with the skill from main **Then** next.action slice, checkout sdlc/S-1, and output identical to main
- **Expected** identical decisions **Actual** Both: action slice, slice S-1, checkout sdlc/S-1; whole JSON equal after the repo path is masked
- **Spec source:** ADR-20261009-024047 (no-regression reading of R-098) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): next-action slice vs main. Full text: [cli-1-transcripts.txt](../../slices/S-001/verification/r0/logs/cli-1-transcripts.txt).

#### TC-cli-15 (cli-1) · state-write.py base-branch names the awaiting-merge dependency branch, same as on main · PASS
- **Given** Stack mode: S-1 awaiting-merge with branch sdlc/S-1 at its own commit, S-2 depends on S-1; plus a direct-mode repo **When** state-write.py base-branch --repo <repo> --slice S-2, slice skill and main skill **Then** Stack: {ok:true, branch:sdlc/S-1}; both outputs equal main
- **Expected** identical **Actual** Stack: {"ok": true, "slice": "S-2", "branch": "sdlc/S-1"} on both; direct mode equal on both
- **Spec source:** ADR-20261009-024047 · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): base-branch slice.

  ```console
  $ python3 state-write.py base-branch --repo <scratch>/ledger --slice S-2
  exit: 0
  --- stdout
  {"ok": true, "slice": "S-2", "branch": "sdlc/S-1"}
  ```


#### TC-cli-16 (cli-1) · janitor.py removes v-branches of a done and an unknown slice and keeps live branches, same as on main · PASS
- **Given** S-1 done, S-2 in_progress; branches sdlc/S-1-v1, sdlc/S-1, sdlc/S-2-v1, sdlc/S-9-v3, sdlc/run-1 **When** janitor.py --repo <repo> --days 36500, slice skill and main skill **Then** removedBranches [sdlc/S-1-v1, sdlc/S-9-v3]; sdlc/S-1 kept; same as main
- **Expected** identical sweep **Actual** Both remove sdlc/S-1-v1 and sdlc/S-9-v3; left: main, sdlc/S-1, sdlc/S-2-v1, sdlc/run-1; notes []
- **Spec source:** ADR-20261009-024047 · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs` · **Latest run:** round 0
- Evidence (transcript): janitor slice.

  ```console
  $ python3 janitor.py --repo <scratch>/ledger --days 36500
  exit: 0
  --- stdout
  {"removedDirs": 0, "removedBranches": ["sdlc/S-1-v1", "sdlc/S-9-v3"], "notes": []}
  ```

- Evidence (file-tree): ledger refs.

  ```diff
    - ref:refs/heads/sdlc/S-1-v1
    - ref:refs/heads/sdlc/S-9-v3
  ```


#### TC-cli-17 (cli-1) · The existing next-action, scripts, git-modes and branches suites pass, with no assertion changed · PASS
- **Given** Branch sdlc/S-001 at de3dd5c **When** Run the four suites; diff the suite files against main **Then** All pass; next-action and scripts suites unchanged; git-modes change is fixture setup only
- **Expected** 0 failures **Actual** 110 tests: 109 pass, 1 skipped (go not installed), 0 fail. next-action.test.mjs and scripts.test.mjs have no diff. git-modes.test.mjs adds only a BRANCHES_PATH constant and two copyFileSync fixture lines
- **Spec source:** ADR-20261009-024047 (existing suites unchanged) · **Run:** `cd <worktree> && node --test skills/sdlc/test/next-action.test.mjs skills/sdlc/test/scripts.test.mjs skills/sdlc/test/git-modes.test.mjs skills/sdlc/test/branches.test.mjs` · **Latest run:** round 0
- Evidence (log): suite summary. Full text: [cli-1-suites.txt](../../slices/S-001/verification/r0/logs/cli-1-suites.txt).
- Evidence (log): git-modes.test.mjs diff.

  ```text
  +const BRANCHES_PATH = join(SKILL_DIR, 'branches.py')
  +    copyFileSync(BRANCHES_PATH, join(dir, 'branches.py'))
  +      copyFileSync(BRANCHES_PATH, join(dir, 'branches.py'))
  ```


</details>

## How it was attacked
**Round 0, security-0.** Charter: explore the argparse layer, the integer flags, `--format`, `--kind`, `--mode`, `--repo`, a broken `git-modes.json` and module resolution (VS-2, VS-3, VS-4, VS-5, VS-9). Threat-model boundary: the CLI argument values, the working directory and `PYTHONPATH` are untrusted. The skill directory and the repo's `.sdlc` state are trusted. An attack that needs a write to a trusted location is out of scope. Such an attack becomes a seed. The session tried 22 attacks: 14 held, 1 broke and 7 were out of scope. A-22 broke: a decoy `branches.py` beside a symlink to a script won the import (TC-security-20, fixed in 4434d71).

<details>
<summary>Round 0 attack table (22 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-1 VS-2 unnamed flags | parse --kind slice; list --branch x; preflight --kind slice; name --branch x; list --id S-1 | exit 2 JSON error | exit 2 JSON error, no tree change | held |
| A-2 VS-2 missing/unknown command and flags | no args; bogus; missing --repo/--branch/--kind/--mode; extra positional; trailing -- | exit 2 JSON error | exit 2 JSON error | held |
| A-3 VS-2 flag-like values | --branch -- / -1 / --x=y / --repo= | one JSON object | one JSON object; -h/--help gives help | held |
| A-4 VS-2 flag prefixes | --rep R; --form feature/{name} | refuse (spec names full flags only) | accepted, exit 0; prefix sets the value | out-of-scope |
| A-5 VS-2 duplicate flags | --repo /nonexistent --repo R | refuse or reject the bad value | last value wins silently, exit 0 | out-of-scope |
| A-6 VS-2 help flags | -h; --help; parse -h | undefined by spec | usage text on stdout, exit 0 | out-of-scope |
| A-7 VS-3 non-integers | two, 1.5, '', 0x1, 1e3, inf, nan, 0o7, 0b1 | exit 2 JSON error | exit 2 JSON error | held |
| A-8 VS-3 unicode digits and odd integer forms | --n ٣, fullwidth digits, ' 3', 1_000, -1, 4300 digits | undefined by spec | accepted, exit 0 | out-of-scope |
| A-9 VS-3 oversized integers | --n with 4301 to 100000 digits | exit 2 JSON error | exit 2; error echoes the whole value (up to 100035 chars) | held |
| A-10 VS-4 structural format attacks | {name}{name}, stray braces, {id}, {NAME}, '', whitespace incl. NBSP, U+3000, U+2028, NEL, U+001C | exit 2 JSON error | exit 2 JSON error on all four commands | held |
| A-11 VS-4 injection in --format | $(id){name}, `id`{name}, ;rm, \|, &&, >file, JSON-breaking quotes | no execution, one JSON object | inert text, one JSON object, no file change | held |
| A-12 VS-4 confusables and invisible chars in --format | ZWSP, U+202E, ESC, Cyrillic S, fullwidth braces | refused by S-002 git check (R-017) where git refuses | pass S-001 structural check; git check-ref-format accepts ZWSP, U+202E and Cyrillic | out-of-scope |
| A-13 VS-4 NUL in config format | branchFormat with NUL | one JSON object | one JSON object | held |
| A-14 VS-4 non-string to validate_format | None, 123, list, dict, True, 1.5 | Fail | Fail | held |
| A-15 VS-5 kind and mode confusables | SLICE, 'slice ', Cyrillic і, fullwidth pr, 'stack\t' | exit 2 JSON error | exit 2 JSON error | held |
| A-16 VS-5 --repo non-directory and traversal | missing path, file, dangling link, '', file:///etc, ~/x, ../../.. | exit 2 for non-directories | exit 2 for non-directories; real directories accepted | held |
| A-17 VS-5 broken git-modes.json | removed, invalid JSON, invalid UTF-8, wrong shapes, empty | preflight exit 2, others exit 0 | as expected | held |
| A-18 VS-5 git-modes.json directory/unreadable/deep nesting | trusted-writer shapes of the skill file | JSON error | exit 1 with traceback | out-of-scope |
| A-19 VS-5 config.json deep nesting and FIFO | repo state written by a hostile writer | JSON error | deep: exit 1 RecursionError; FIFO: blocks | out-of-scope |
| A-20 VS-9 decoy in cwd and PYTHONPATH | branches.py decoy in cwd and on PYTHONPATH; relative path; -I | real module wins | real module wins | held |
| A-21 VS-9 importlib from decoy cwd | spec_from_file_location from decoy cwd | real module bound | real module bound | held |
| A-22 VS-9 decoy beside a symlink to the script | <dir>/next-action.py -> skills/sdlc/next-action.py, <dir>/branches.py decoy | real module wins | decoy wins, exit 97 on all three scripts | broke |

</details>

**Round 1, security-0.** Charter: explore the `branches` import in the three scripts with decoy modules in the working directory, on `PYTHONPATH` and beside symlinks (VS-9, R-098). Threat-model boundary: the files in the skill directory and the Python interpreter are trusted. The working directory, `PYTHONPATH` and the start path of a script are untrusted. The session tried 9 attacks: 7 held, none broke and 2 were out of scope. A-30 (a hard link beside a decoy) and A-31 (a `branches` module already in `sys.modules`) still bind the decoy. Both need control of the skill directory or the caller's own process.

<details>
<summary>Round 1 attack table (9 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-23 VS-9 re-run of TC-security-17: decoy in cwd, on PYTHONPATH, shadow with PYTHONSAFEPATH, python -I | decoy branches.py (exit 97 and shadow) | real module wins | exit 0, no decoy import | held |
| A-24 VS-9 re-run of TC-security-18: importlib load from a decoy cwd | decoy branches.py in cwd and on PYTHONPATH | mod.branches is the real file | real file bound | held |
| A-25 VS-9 re-run of TC-security-20: decoy beside a symlink to the script | <dir>/branches.py decoy, <dir>/<script> symlink | real module wins | exit 0, no decoy import (round 0: exit 97) | held |
| A-26 VS-9 chain of two symlinks with decoys beside each link | a/<script> -> b/<script> -> skills/sdlc/<script> | real module wins | exit 0, no decoy import | held |
| A-27 VS-9 relative symlink run as ./<script>, decoy module in cwd, decoy package on PYTHONPATH | ./<script> (relative link), branches.py, branches/__init__.py | real module wins | exit 0, no decoy import | held |
| A-28 VS-9 symlinked skill directory with decoy beside the link | <dir>/skill -> skills/sdlc | real module wins | real file bound, exit 0 | held |
| A-29 VS-9 importlib load through a symlink path with decoy beside the link and on PYTHONPATH | spec_from_file_location(<dir>/<script>) | real module wins | real file bound | held |
| A-30 VS-9 hard link to a script with a decoy beside it | <dir>/<script> hard link, <dir>/branches.py decoy | none stated: a hard link is a second directory entry, and its directory is the script directory | all three exit 97; the decoy beside the hard link is imported | out-of-scope |
| A-31 VS-9 a process that already imported another branches module loads a script by path | import branches (shadow decoy from PYTHONPATH), then importlib load of the script | none stated: the caller controls its own process | exit 0; mod.branches is the preloaded decoy from sys.modules | out-of-scope |

</details>

## Defects found on the way
**Blocking defects**

1. **An unreadable `git-modes.json` crashes `preflight`.** Found by: cli profile, round 0 (TC-cli-20). Spec source: R-014 quote, ADR-20261009-024048 ("no exit 1"). Reproduce: make `git-modes.json` a directory in a copied skill directory, then run `python3 <copy>/branches.py preflight --repo <repo> --mode pr`; it exits 1 with an `IsADirectoryError` traceback. Fix: commit 4434d71, `load_git_modes` catches `OSError` and `RecursionError` and raises `Fail`. Guard: `skills/sdlc/test/branches.test.mjs:189`.
2. **A deeply nested `config.json` crashes `load_format`.** Found by: contract profile, round 0 (TC-contract-6, TC-contract-7, TC-contract-8). Spec source: R-014 quote, R-016 acceptance. Reproduce: write a `config.json` of deeply nested `[`, then run `parse`; it exits 1 with a `RecursionError` traceback. Fix: commit 4434d71, `load_format` catches `RecursionError` beside `ValueError`. Guard: `skills/sdlc/test/branches.test.mjs:257`.
3. **A script run through a symlink imports a decoy `branches.py`.** Found by: security profile, round 0 (TC-security-20, attack A-22). Spec source: R-098 quote and acceptance. Reproduce: link `next-action.py` into a directory that holds a decoy `branches.py`, then run the link with `--help`; it exits 97 from the decoy. Fix: commit 4434d71, the three scripts insert `os.path.dirname(os.path.realpath(__file__))`. Guard: `skills/sdlc/test/branches.test.mjs:174`.
4. **No committed test pins `preflight` on a missing or malformed `git-modes.json`.** Found by: test-quality review, round 1. Spec source: R-014 quote, R-098 acceptance. Reproduce: read the round-1 suite; only verifier test TC-cli-16 covers these shapes. Fix: commit 90d3251 promotes TC-cli-16 for eight shapes, with `name`, `parse` and `list` still running. Guard: `skills/sdlc/test/branches.test.mjs:217`.

**Seeds**

| Seed | Found by | File |
|---|---|---|
| `validate_format` accepts a leading `-`, NUL, control and bidi characters | contract-0 r0; security review r1, r2 | `skills/sdlc/branches.py` |
| Invisible and confusable characters pass the format checks and `git check-ref-format` | security-0 r0 (A-12) | `skills/sdlc/branches.py` |
| `--n`, `--round` and `--part` accept Unicode digits, padding, underscores, negatives and huge values | spec-fidelity r0; cli-0 r0 (TC-cli-10); security-0 r0 (A-8) | `skills/sdlc/branches.py` |
| argparse accepts flag prefixes (`allow_abbrev` is on) | spec-fidelity r0; cli-0 r0 (TC-cli-7); security-0 r0 (A-4) | `skills/sdlc/branches.py` |
| A flag given twice keeps its last value silently | spec-fidelity r0; cli-0 r0 (TC-cli-6); security-0 r0 (A-5) | `skills/sdlc/branches.py` |
| `-h` and `--help` print usage text, not JSON, and `main` raises `SystemExit` | spec-fidelity r0; cli-0 r0 (TC-cli-8); cli-1 r0; contract-0 r0; security-0 r0 (A-6) | `skills/sdlc/branches.py` |
| Non-UTF-8 argv passes through as surrogate escapes | spec-fidelity r0 | `skills/sdlc/branches.py` |
| A `config.json` with a UTF-8 BOM is refused | cli-0 r0 (TC-cli-19); cli-1 r0 | `skills/sdlc/branches.py` |
| A valid `--format` hides a malformed `config.json` | cli-1 r0; contract-0 r0 | `skills/sdlc/branches.py` |
| `load_format` drops a non-string `branchFormat`, but spec section 4 keeps it | contract-0 r0 | `skills/sdlc/branches.py` |
| A `FIFO` at `.sdlc/config.json` blocks the command (the `RecursionError` part is fixed) | security-0 r0 (A-19) | `skills/sdlc/branches.py` |
| Refusal errors echo the whole hostile value | security-0 r0 (A-9) | `skills/sdlc/branches.py` |
| `GIT_MODES_PATH` uses `abspath`, not `realpath` | architecture review r1, r2; security review r2; spec-fidelity r1, r2; cli-0 r1 | `skills/sdlc/branches.py` |
| A `--repo` directory that cannot be read passes when `--format` is given | cli-0 r1 (TC-cli-23) | `skills/sdlc/branches.py` |
| `load_format` reports a NUL in the repo path as invalid JSON | contract-0 r1 | `skills/sdlc/branches.py` |
| A `config.json` with an integer over 4300 digits is refused | contract-0 r1 | `skills/sdlc/branches.py` |
| A cached `branches` module in `sys.modules` binds in place of the skill's module | security-0 r1 (A-31) | `skills/sdlc/next-action.py` |
| The three scripts now need `branches.py` beside them | regression r0 | `skills/sdlc/next-action.py` |
| Three copies of `load_git_modes`, and the `npm test` glob skips `test/testkit/*.test.mjs` | architecture review r1, r2 | `skills/sdlc/branches.py` |
| testkit `copySkill` cannot turn an existing file into a directory | cli-0 r0 | `skills/sdlc/test/testkit/cli-runner.mjs` |
| No committed test pins the `RecursionError` catch in `load_git_modes` | test-quality review r2 | `skills/sdlc/test/branches.test.mjs` |
| Two tests build the same skill copy | architecture review r2 | `skills/sdlc/test/branches.test.mjs` |
| T-009 adds almost nothing beside T-010 | test-quality review r1 | `skills/sdlc/test/branches.test.mjs` |
| T-003 does not check the `format` value | test-quality review r1 | `skills/sdlc/test/branches.test.mjs` |
| No test accepts `{name:lower}` | test-quality review r1 | `skills/sdlc/test/branches.test.mjs` |

## Appendix
- Toolkit: `cli-runner`, `property` and `attack-corpus` in `skills/sdlc/test/testkit/` (`cli-runner.mjs`, `pycall.py`), recorded in `.sdlc/testkit.json`.
- Plans: [plan-r0.json](../../slices/S-001/verification/plan-r0.json), [plan-r0.md](../../slices/S-001/verification/plan-r0.md), [plan-r2.json](../../slices/S-001/verification/plan-r2.json), [plan-r2.md](../../slices/S-001/verification/plan-r2.md).
- Round 0 evidence: [cli-0](../../slices/S-001/verification/r0/cli-0.md), [cli-1](../../slices/S-001/verification/r0/cli-1.md), [contract-0](../../slices/S-001/verification/r0/contract-0.md), [security-0](../../slices/S-001/verification/r0/security-0.md).
- Round 1 evidence: [cli-0](../../slices/S-001/verification/r1/cli-0.md), [contract-0](../../slices/S-001/verification/r1/contract-0.md), [security-0](../../slices/S-001/verification/r1/security-0.md).
- Core verifiers: spec fidelity [r0](../../slices/S-001/verify-spec-fidelity-r0.md), [r1](../../slices/S-001/verify-spec-fidelity-r1.md), [r2](../../slices/S-001/verify-spec-fidelity-r2.md); regression [r0](../../slices/S-001/verify-regression-r0.md), [r1](../../slices/S-001/verify-regression-r1.md), [r2](../../slices/S-001/verify-regression-r2.md); gate [gate-r0.md](../../slices/S-001/gate-r0.md).
- Reviews: architecture [r1](../../slices/S-001/review-architecture-r1.md), [r2](../../slices/S-001/review-architecture-r2.md); security [r1](../../slices/S-001/review-security-r1.md), [r2](../../slices/S-001/review-security-r2.md); test quality [r1](../../slices/S-001/review-test-quality-r1.md), [r2](../../slices/S-001/review-test-quality-r2.md).
- Gate: `npm test` passed at 658b419 with 490 of 491 tests (1 skipped, no Go toolchain) in 69 s. The receipt is `verification/suite-receipt.json`.
- Round 2 has no profile evidence. Its plan ran no scenario, because commit 90d3251 changed only tests.
- The integrator deletes the round folders, logs and verifier tests at the merge. The verifier test paths and evidence links above then stop resolving.
- The transcripts in this report replace the macOS temporary folder prefix with `$TMPDIR/`.
- The slice ledger holds 41 seed entries. This report merges the duplicates. It drops the entries for the fixed defects: the symlink decoy and the escaped `OSError` and `RecursionError`.
- No source was missing.
