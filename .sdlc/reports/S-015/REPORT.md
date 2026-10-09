# S-015 · preflight tests the mode's branch names and prints a verdict
Verdict: RELEASED
Commit under test: 7f87721 (verified); branch head 4e2ef89 (state commits only) · Rounds: 1 (round 0) · Attempts: 1 · Risk: medium · Written: 2026-10-09 UTC

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 6 | 9 | 89 | 89 | 0 | 0 | 0 / 0 | 17 |

## Summary
Preflight now tests the branch names that the loop will push and prints one verdict. The verdict holds `ok`, the format, the samples for the mode, the forge rules and the notes. A sample that a forge rule or `git check-ref-format` refuses gives `ok: false` and exit 1. Samples that pass, are unevaluated or are unchecked never block. A missing or signed-out `gh` or `glab` gives one note and unchecked samples. Three profiles ran in round 0: cli (52 cases), contract (9 cases) and security (28 cases, 28 attacks). All 89 cases passed. The verifiers and reviewers found no blocking defect, but 6 attacks found real gaps that the spec does not cover. The full suite and the Gate passed.

## Open risks
- A forge rule with a non-string `pattern` (null, number, list, dict) raises `TypeError`. Preflight then exits 1 with a traceback and no JSON, so a caller reads it as not ok (attack A8, seed). No spec text covers it.
- A forge regex such as `^(a+)+$` hangs preflight on a 41-character working branch (attack A26). `re.search` has no time limit and the spec states no limit.
- The note `rules unknown on <forge>: <stderr>` holds the whole stderr, up to 300000 bytes tested (attack A27). A token in stderr would reach the output. The spec says the note holds stderr.
- `@{-1}` passes `git check-ref-format --branch` and gives a verdict that depends on the current directory (attacks A17, A18). Reviewers also raised it.
- A working branch `..` or `.` reaches `gh` as a path segment, so `gh api` reads another endpoint (attack A25). The call only reads.
- In direct mode on GitHub, a missing `gh` gives no note. On GitLab, a missing `glab` gives one note (attack A20). The R-084 acceptance covers samples only.
- The output holds `command`, `args` and `given` besides the eight spec keys (ADR ba66). A consumer that compares key sets sees three extra keys. `derived` is always false and `suggestion` is empty until S-016 (ADR 3a7c).
- Judge decisions that the spec leaves open: an invalid ref name gives `fail` even when rules are unknown (ADR 33cd, ADR r1f0). R-084 closes in this slice (ADR 251f). Two cases, a shared sample name and an empty `--branch`, cannot occur through the CLI.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-038 | `fmt` is `--format` when given, else `load_format(repo)`; `given` is whether a format came from the flag or the config. `validate_format(fmt)` or exit 2. | VS-1 | TC-cli-1/p0, TC-cli-2/p0, TC-cli-3/p0, TC-cli-4/p0, TC-cli-5/p0, TC-contract-1/p0, TC-contract-2/p0 | pass |
| R-039 | Samples, by mode: `pr`: `slice` (`S-001`), `state` (a generated timestamp), `e2e` (`M-1-e2e`); `stack`: `run` (`run-1`), `milestone` (`M-1`), `slice`; `mr` and `direct`: none of the loop's kinds. | VS-2 | TC-cli-6/p0, TC-cli-7/p0, TC-cli-8/p0, TC-cli-9/p0, TC-cli-10/p0, TC-contract-3/p0, TC-contract-4/p0 | pass |
| R-040 | In `mr` mode only, `--branch CURRENT` adds the user's working branch as one more sample of kind `working`, evaluated as it is, because that is the branch the loop pushes in `mr` mode: this folds the existing `mr`-mode push-rule check into the same verdict. In every other mode `--branch` is ignored; the user's branch already exists and is never pushed by the loop. | VS-3, VS-6, VS-9 | TC-cli-11/p0, TC-cli-12/p0, TC-cli-13/p0, TC-cli-14/p0, TC-cli-15/p0, TC-cli-28/p0, TC-cli-29/p0, TC-cli-30/p0, TC-cli-31/p0, TC-cli-32/p0, TC-cli-33/p0, TC-cli-34/p0, TC-cli-15/p1, TC-security-1, TC-security-2, TC-security-3, TC-security-4, TC-security-5, TC-security-16, TC-security-17 | pass |
| R-041 | When every sample passes or is unevaluated or unchecked: `ok` is `true` with `fmt`. | VS-4, VS-5, VS-7, VS-8, VS-9 | TC-cli-16/p0, TC-cli-17/p0, TC-cli-18/p0, TC-cli-19/p0, TC-cli-35/p0, TC-cli-1/p1, TC-cli-3/p1, TC-cli-4/p1, TC-cli-5/p1, TC-cli-7/p1, TC-cli-8/p1, TC-cli-9/p1, TC-cli-10/p1, TC-cli-11/p1, TC-contract-5/p0, TC-contract-6/p0, TC-contract-7/p0, TC-security-6, TC-security-7, TC-security-8, TC-security-9, TC-security-10, TC-security-21, TC-security-22, TC-security-26, TC-security-27 | pass |
| R-044 | `result` is `pass`, `fail`, `unevaluated` or `unchecked`; `rule` is the label of the first failing rule. Exit 0 when `ok`, 1 when not, 2 on bad input. | VS-5, VS-6, VS-7, VS-8, VS-9 | TC-cli-20/p0, TC-cli-21/p0, TC-cli-22/p0, TC-cli-23/p0, TC-cli-24/p0, TC-cli-25/p0, TC-cli-26/p0, TC-cli-27/p0, TC-cli-28/p0, TC-cli-29/p0, TC-cli-30/p0, TC-cli-31/p0, TC-cli-32/p0, TC-cli-33/p0, TC-cli-34/p0, TC-cli-2/p1, TC-cli-7/p1, TC-cli-8/p1, TC-cli-11/p1, TC-cli-12/p1, TC-cli-13/p1, TC-cli-14/p1, TC-cli-15/p1, TC-cli-16/p1, TC-cli-17/p1, TC-contract-5/p0, TC-contract-6/p0, TC-contract-7/p0, TC-contract-8/p0, TC-contract-9/p0, TC-security-11, TC-security-12, TC-security-13, TC-security-14, TC-security-15, TC-security-16, TC-security-17, TC-security-18, TC-security-19, TC-security-20, TC-security-24, TC-security-28 | pass |
| R-084 | **`gh` or `glab` not available or not signed in**: `unchecked`, a note, the run launches. | VS-4, VS-7 | TC-cli-16/p0, TC-cli-17/p0, TC-cli-18/p0, TC-cli-19/p0, TC-cli-35/p0, TC-cli-1/p1, TC-cli-2/p1, TC-cli-3/p1, TC-cli-4/p1, TC-cli-5/p1, TC-cli-6/p1, TC-security-8, TC-security-21, TC-security-22, TC-security-23, TC-security-24, TC-security-25 | pass |

The committed tests `T-R-038a` to `T-R-084a` in `skills/sdlc/test/branches.test.mjs:2048-2200` also guard these requirements. The regression verifier ran the suite: 623 tests, 622 pass, 0 fail, 1 skipped.

## Scenarios
### VS-1 · Format resolves from flag, config or default
Profiles: cli, contract. Risk: A wrong format or a wrong given value changes every branch name that the loop pushes.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1/p0 | flag beats broken config | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:27` |
| TC-cli-2/p0 | config alone gives given true; neither gives false | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:37` |
| TC-cli-3/p0 | empty config format counts as none; broken config with no flag exits 2 | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:49` |
| TC-cli-4/p0 | invalid formats exit 2 with one JSON object | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:61` |
| TC-cli-5/p0 | valid unusual formats | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:76` |
| TC-contract-1/p0 | Format resolves from flag, config or default (property) | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:89` |
| TC-contract-2/p0 | Spec examples and corner formats | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:134` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-1/p0 · VS-1 flag beats broken config · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-038 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-1 --mode direct --format 'team/{name}'
exit: 0 (62 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-2/p0 · VS-1 config alone gives given true; neither gives false · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-038 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-3 --mode pr
exit: 0 (120 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-5 --mode pr
exit: 0 (126 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-3/p0 · VS-1 empty config format counts as none; broken config with no flag exits 2 · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-038 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-7 --mode pr
exit: 0 (117 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-9 --mode pr
exit: 2 (40 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-4/p0 · VS-1 invalid formats exit 2 with one JSON object · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-038 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command transcripts](../../slices/S-015/verification/r0/logs/cli-0-TC-cli-4-transcript.txt)

#### TC-cli-5/p0 · VS-1 valid unusual formats · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-038 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-23 --mode pr --format '{name:lower}'
exit: 0 (137 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-23 --mode pr --format $'é/{name}'
exit: 0 (115 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-23 --mode pr --format 'feature/PROJ-123-{name}'
exit: 0 (124 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-contract-1/p0 · Format resolves from flag, config or default (property) · PASS
- **Given** 1000 random repos: config absent or holding strings, empty, null, number, bad formats; flag absent or random **When** preflight runs through main() **Then** Flag beats config beats default; given is true for flag or config; a format git or the placeholder rules refuse gives exit 2 with a one-object error
- **Expected** Flag beats config beats default; given is true for flag or config; a format git or the placeholder rules refuse gives exit 2 with a one-object error **Actual** 1000 runs, 0 violations against the reference model (placeholder count, braces, Python whitespace set, git check-ref-format)
- **Spec source:** R-038 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): property: format resolution against reference model; seed=424242 runs=1000 violations=0

#### TC-contract-2/p0 · Spec examples and corner formats · PASS
- **Given** Broken config JSON with --format; config only; neither; 12 invalid and 4 valid corner formats (empty, {name}{name}, spaces, a..b, .lock, leading slash, NBSP, ideographic space, emoji, accents) **When** preflight runs **Then** Flag wins over a broken config; given false and sdlc/{name} for neither; invalid formats exit 2 with ok false and error
- **Expected** Flag wins over a broken config; given false and sdlc/{name} for neither; invalid formats exit 2 with ok false and error **Actual** as expected for every example
- **Spec source:** R-038 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): result pass

</details>

### VS-2 · Samples follow the mode
Profiles: cli, contract. Risk: A wrong sample list means preflight tests names the loop never pushes, or misses names it does push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6/p0 | pr samples | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:91` |
| TC-cli-7/p0 | stack samples | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:101` |
| TC-cli-8/p0 | mr and direct give none | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:109` |
| TC-cli-9/p0 | names follow prefix and lowercase transform | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:120` |
| TC-cli-10/p0 | unknown mode and missing mode exit 2 | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:131` |
| TC-contract-3/p0 | build_samples follows the mode (property) | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:162` |
| TC-contract-4/p0 | Preflight samples per mode with prefix and lowercase formats | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:187` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-6/p0 · VS-2 pr samples · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-039 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-28 --mode pr
exit: 0 (127 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-7/p0 · VS-2 stack samples · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-039 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-30 --mode stack
exit: 0 (117 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-8/p0 · VS-2 mr and direct give none · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-039 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-32 --mode mr
exit: 0 (66 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-32 --mode direct
exit: 0 (61 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-9/p0 · VS-2 names follow prefix and lowercase transform · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-039 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-35 --mode pr --format 'Feat/PROJ-{name:lower}'
exit: 0 (116 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-35 --mode stack --format 'feature/{name:lower}'
exit: 0 (121 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-10/p0 · VS-2 unknown mode and missing mode exit 2 · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-039 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command transcripts](../../slices/S-015/verification/r0/logs/cli-0-TC-cli-10-transcript.txt)

#### TC-contract-3/p0 · build_samples follows the mode (property) · PASS
- **Given** 1000 random valid formats, modes pr, stack, mr, direct and an unknown mode, working branch values **When** build_samples is called through the module **Then** pr: slice, state, e2e; stack: run, milestone, slice; mr adds working last only when a name is given; other modes none; names follow the format and the lower transform
- **Expected** pr: slice, state, e2e; stack: run, milestone, slice; mr adds working last only when a name is given; other modes none; names follow the format and the lower transform **Actual** 1000 runs, 0 violations; every sample has exactly kind and name; every state name holds 14 digits
- **Spec source:** R-039 acceptance, R-040 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): property: build_samples against reference model; seed=424243 runs=1000 violations=0

#### TC-contract-4/p0 · Preflight samples per mode with prefix and lowercase formats · PASS
- **Given** 4 formats (sdlc/{name}, feature/{name:lower}, pre-{name}, {name}) in 4 modes; --branch in direct and pr **When** preflight runs **Then** Sample kinds and names equal the reference; state timestamp is current UTC; --branch adds nothing in pr and direct
- **Expected** Sample kinds and names equal the reference; state timestamp is current UTC; --branch adds nothing in pr and direct **Actual** as expected
- **Spec source:** R-039 acceptance, R-040 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): result pass

</details>

### VS-3 · The mr working branch is judged as given
Profiles: cli, security. Risk: A renamed or mis-scoped working branch tests the wrong branch, or tests it in a mode that never pushes it.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-11/p0 | mr adds working sample last; modes ignore it | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:142` |
| TC-cli-12/p0 | working name is judged as given under gitlab regex | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:155` |
| TC-cli-13/p0 | working name equal to a slice name is not renamed | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:171` |
| TC-cli-14/p0 | hostile working names | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:180` |
| TC-cli-15/p0 | empty --branch value in mr mode | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:209` |
| TC-security-1 | mr working branch equal to a slice name is kept as given, last | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:29` |
| TC-security-2 | pr, stack and direct ignore a hostile --branch | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:39` |
| TC-security-3 | option-like, spaced and empty --branch=<v> never become git or gh options | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:53` |
| TC-security-4 | separate option-like value for --branch exits 2 with one error object | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:76` |
| TC-security-5 | attack corpus (7 families) as working branch | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:87` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-cli-11/p0 · VS-3 mr adds working sample last; modes ignore it · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-040 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command transcripts](../../slices/S-015/verification/r0/logs/cli-0-TC-cli-11-transcript.txt)

#### TC-cli-12/p0 · VS-3 working name is judged as given under gitlab regex · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-040 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (198 ms)
exit: 0 (107 ms)
exit: 0 (109 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-13/p0 · VS-3 working name equal to a slice name is not renamed · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-040 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-57 --mode mr --branch S-001
exit: 0 (77 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-57 --mode mr --branch feature/S-001
exit: 0 (77 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-14/p0 · VS-3 hostile working names · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-040 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command transcripts](../../slices/S-015/verification/r0/logs/cli-0-TC-cli-14-transcript.txt)

#### TC-cli-15/p0 · VS-3 empty --branch value in mr mode · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-040 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-69 --mode mr --branch ''
exit: 0 (63 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-security-1 · mr working branch equal to a slice name is kept as given, last · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** one working sample named sdlc/S-001, exit 0, tree unchanged
- **Expected** one working sample named sdlc/S-001, exit 0, tree unchanged **Actual** as expected
- **Spec source:** R-040 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-3 A1:'`
- Evidence (attack A1): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-2 · pr, stack and direct ignore a hostile --branch · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** no working sample; no gh argv carries the value
- **Expected** no working sample; no gh argv carries the value **Actual** as expected
- **Spec source:** R-040 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-3 A2:'`
- Evidence (attack A2): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-3 · option-like, spaced and empty --branch=<v> never become git or gh options · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** working name verbatim; option-like and spaced names fail; empty adds no sample; gh path stays one quoted segment
- **Expected** working name verbatim; option-like and spaced names fail; empty adds no sample; gh path stays one quoted segment **Actual** as expected
- **Spec source:** R-040 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-3 A3:'`
- Evidence (attack A3): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-4 · separate option-like value for --branch exits 2 with one error object · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 2, {ok:false,error}
- **Expected** exit 2, {ok:false,error} **Actual** as expected
- **Spec source:** R-040 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-3 A3b:'`
- Evidence (attack A3b): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-5 · attack corpus (7 families) as working branch · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** no crash, name verbatim, tree unchanged, exit 1 iff fail
- **Expected** no crash, name verbatim, tree unchanged, exit 1 iff fail **Actual** as expected
- **Spec source:** R-040 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-3 A4:'`
- Evidence (attack A4): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

</details>

### VS-4 · Passing, unevaluated and unchecked samples never block
Profiles: cli, security. Risk: A wrong block on a pass, unevaluated or unchecked sample stops a launch that the spec allows.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-16/p0 | no forge gives ok and unchecked | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:217` |
| TC-cli-17/p0 | matching rule passes; bad regex unevaluated; failing gh unchecked | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:231` |
| TC-cli-18/p0 | gh garbage, empty, non-list JSON, gh timeout-free failure variants never block | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:253` |
| TC-cli-19/p0 | gitlab null body, empty regex, glab failure | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:280` |
| TC-cli-35/p0 | gh and glab absent from PATH | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:479` |
| TC-security-6 | no forge: ok true, all unchecked, zero gh calls, all four modes | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:106` |
| TC-security-7 | matching rule passes; uncompilable regexes are unevaluated with a note | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:121` |
| TC-security-8 | gh exit 1, non-JSON, JSON object, empty output give one rules-unknown note | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:136` |
| TC-security-9 | forge rule with a non-string pattern (null, 5, list, dict) | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:150` |
| TC-security-10 | glab malformed push-rule bodies | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:174` |
| TC-security-26 | working branch .. and . reach gh as repos/{owner}/{repo}/rules/branches/.. and /. | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:400` |
| TC-security-27 | forge regex ^(a+)+$ against a 41-character working branch | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:413` |

<details>
<summary>Case detail (12 cases)</summary>

#### TC-cli-16/p0 · VS-4 no forge gives ok and unchecked · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-041 acceptance; R-084 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-71 --mode pr
exit: 0 (113 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-17/p0 · VS-4 matching rule passes; bad regex unevaluated; failing gh unchecked · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-041 acceptance; R-084 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 0 (288 ms)
exit: 0 (276 ms)
exit: 0 (235 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-18/p0 · VS-4 gh garbage, empty, non-list JSON, gh timeout-free failure variants never block · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-041 acceptance; R-084 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command transcripts](../../slices/S-015/verification/r0/logs/cli-0-TC-cli-18-transcript.txt)

#### TC-cli-19/p0 · VS-4 gitlab null body, empty regex, glab failure · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-041 acceptance; R-084 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 0 (296 ms)
exit: 0 (234 ms)
exit: 0 (189 ms)
exit: 0 (204 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-35/p0 · VS-4 gh and glab absent from PATH · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-041 acceptance; R-084 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 0 (116 ms)
exit: 0 (84 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-security-6 · no forge: ok true, all unchecked, zero gh calls, all four modes · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** as stated
- **Expected** as stated **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A5:'`
- Evidence (attack A5): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-7 · matching rule passes; uncompilable regexes are unevaluated with a note · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 0, pass / unevaluated, cannot evaluate note
- **Expected** exit 0, pass / unevaluated, cannot evaluate note **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A6:'`
- Evidence (attack A6): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-8 · gh exit 1, non-JSON, JSON object, empty output give one rules-unknown note · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 0, unchecked, one gh call
- **Expected** exit 0, unchecked, one gh call **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A7:'`
- Evidence (attack A7): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-9 · forge rule with a non-string pattern (null, 5, list, dict) · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 0 and a JSON object
- **Expected** exit 0 and a JSON object **Actual** exit 1, Python traceback, no JSON, for 6 of 9 shapes (TypeError in evaluate)
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A8:'`
- Evidence (attack A8): result out-of-scope · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-10 · glab malformed push-rule bodies · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** no crash
- **Expected** no crash **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A9:'`
- Evidence (attack A9): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-26 · working branch .. and . reach gh as repos/{owner}/{repo}/rules/branches/.. and /. · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** no request for an invalid ref name
- **Expected** no request for an invalid ref name **Actual** gh api called with a dot segment, a different endpoint
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A25:'`
- Evidence (attack A25): result out-of-scope · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-27 · forge regex ^(a+)+$ against a 41-character working branch · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** finishes
- **Expected** finishes **Actual** still running after 8 s (catastrophic backtracking)
- **Spec source:** R-041 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-4 A26:'`
- Evidence (attack A26): result out-of-scope · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

</details>

### VS-5 · A failing sample blocks and names its rule
Profiles: cli, contract, security. Risk: A wrong ok or exit code breaks the one gate that the launch reads.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-20/p0 | output keys, exit 1, one JSON object | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:296` |
| TC-cli-21/p0 | first failing rule label, later failing rules ignored; passing sample rule null | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:318` |
| TC-cli-22/p0 | negate rule and contains | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:330` |
| TC-cli-23/p0 | exit codes 0, 1, 2 for the same repo | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:340` |
| TC-cli-24/p0 | exit 1 only from preflight; other commands exit 0 on ok:true | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:352` |
| TC-cli-25/p0 | repo path with space and unicode; missing repo; non-git dir | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:361` |
| TC-cli-26/p0 | twice gives the same verdict and leaves tree unchanged | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:374` |
| TC-cli-27/p0 | CI env and no tty | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:384` |
| TC-contract-5/p0 | Verdict rows, first failing rule, exit code, per-sample rules (property) | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:249` |
| TC-contract-8/p0 | Consumer view: CLI process with a gh shim | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:404` |
| TC-contract-9/p0 | Hostile --branch values keep the output shape | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:429` |
| TC-security-11 | keys, exit 1, one JSON object, first failing rule label | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:187` |
| TC-security-12 | hostile rule labels (newline, ANSI, JSON break-out, 100000 chars, RLO) | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:205` |
| TC-security-13 | negate as string, 0, null; ok never true with a failing sample | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:218` |
| TC-security-14 | bad mode and format inputs exit 2, no side effect, shell metacharacters inert | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:231` |
| TC-security-15 | attack corpus as a format prefix; gh path stays one quoted segment | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:244` |
| TC-security-28 | gh stderr holding a token is echoed into notes | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:421` |

<details>
<summary>Case detail (17 cases)</summary>

#### TC-cli-20/p0 · VS-5 output keys, exit 1, one JSON object · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (245 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-21/p0 · VS-5 first failing rule label, later failing rules ignored; passing sample rule null · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (259 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-22/p0 · VS-5 negate rule and contains · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (242 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-23/p0 · VS-5 exit codes 0, 1, 2 for the same repo · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (248 ms)
exit: 0 (192 ms)
exit: 2 (42 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-24/p0 · VS-5 exit 1 only from preflight; other commands exit 0 on ok:true · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py name --repo <tmp>/testkit-cli-FN2e6J/repo-104 --kind slice --id S-001
exit: 0 (61 ms)
$ python3 <worktree>/skills/sdlc/branches.py parse --repo <tmp>/testkit-cli-FN2e6J/repo-104 --branch zzz
exit: 0 (60 ms)
$ python3 <worktree>/skills/sdlc/branches.py list --repo <tmp>/testkit-cli-FN2e6J/repo-104 --kind slice
exit: 0 (100 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-25/p0 · VS-5 repo path with space and unicode; missing repo; non-git dir · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo $'<tmp>/testkit-cli-FN2e6J/my répo ü-108' --mode pr
exit: 0 (116 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo /nonexistent/path/xyz --mode pr
exit: 2 (49 ms)
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/plain-111 --mode pr
exit: 0 (119 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-26/p0 · VS-5 twice gives the same verdict and leaves tree unchanged · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (194 ms)
exit: 1 (88 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-27/p0 · VS-5 CI env and no tty · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 acceptance · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 0 (114 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-contract-5/p0 · Verdict rows, first failing rule, exit code, per-sample rules (property) · PASS
- **Given** 1000 cases: github repo, random formats, modes, working branches (valid and invalid refs), per-sample rule sets of 4 operators with negate, bad regexes, unknown kinds, noise objects, and gh errors **When** main() runs with a fake gh **Then** Each row result and rule equal the model; the rule is the label of the first failing rule; ok false exactly when a row fails; exit 1 then, else 0; gh call list equals the model; output holds all required keys; row keys are exactly kind, name, result, rule
- **Expected** Each row result and rule equal the model; the rule is the label of the first failing rule; ok false exactly when a row fails; exit 1 then, else 0; gh call list equals the model; output holds all required keys; row keys are exactly kind, name, result, rule **Actual** 1000 runs, 0 violations; 396 cases had a failing row and 86 had an unevaluated row
- **Spec source:** R-044 acceptance, R-041 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): property: verdict model; seed=424244 runs=1000 violations=0 casesWithFail=396 casesWithUnevaluated=86 notesSeen=267

#### TC-contract-8/p0 · Consumer view: CLI process with a gh shim · PASS
- **Given** Scratch git repo with forge github, gh shim, cwd outside the repo **When** python3 branches.py preflight runs for pr, stack, bogus mode, mr with a..b **Then** Exit 1 with one JSON line and empty stderr when a sample fails; exit 0 when all pass; exit 2 with ok false for a bad mode; a..b fails with git check-ref-format; repo tree unchanged
- **Expected** Exit 1 with one JSON line and empty stderr when a sample fails; exit 0 when all pass; exit 2 with ok false for a bad mode; a..b fails with git check-ref-format; repo tree unchanged **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript, first calls only):

```console

```

  Full text: [log](../../slices/S-015/verification/r0/logs/contract-0-results.jsonl)

#### TC-contract-9/p0 · Hostile --branch values keep the output shape · PASS
- **Given** 17 hostile names: option-like, empty, spaces, unicode, 5000 characters, tab, bidi mark, @{-1}, @, double slash, .lock, backslash **When** preflight runs in mr mode **Then** Exit is 0, 1 or 2; non-error output holds every required key; the working sample name equals the input
- **Expected** Exit is 0, 1 or 2; non-error output holds every required key; the working sample name equals the input **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): result pass

#### TC-security-11 · keys, exit 1, one JSON object, first failing rule label · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** as stated
- **Expected** as stated **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-5 A10:'`
- Evidence (attack A10): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-12 · hostile rule labels (newline, ANSI, JSON break-out, 100000 chars, RLO) · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** one JSON line, label verbatim
- **Expected** one JSON line, label verbatim **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-5 A11:'`
- Evidence (attack A11): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-13 · negate as string, 0, null; ok never true with a failing sample · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** ok equals no fail
- **Expected** ok equals no fail **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-5 A12:'`
- Evidence (attack A12): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-14 · bad mode and format inputs exit 2, no side effect, shell metacharacters inert · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 2 or 0, one JSON object, tree unchanged
- **Expected** exit 2 or 0, one JSON object, tree unchanged **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-5 A13:'`
- Evidence (attack A13): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-15 · attack corpus as a format prefix; gh path stays one quoted segment · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** no crash; no raw / ? # or space in the gh path
- **Expected** no crash; no raw / ? # or space in the gh path **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-5 A14:'`
- Evidence (attack A14): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-28 · gh stderr holding a token is echoed into notes · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** no secret in output
- **Expected** no secret in output **Actual** the token text appears in notes
- **Spec source:** R-044 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-5 A27:'`
- Evidence (attack A27): result out-of-scope · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

</details>

### VS-6 · An invalid git ref name fails even without forge rules
Profiles: cli, security. Risk: An invalid ref name that gets through only fails at push time.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-28/p0 | a..b fails with git check-ref-format with no forge | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:391` |
| TC-cli-29/p0 | a..b fails with rules present; other samples keep their result (stack has no working) | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:400` |
| TC-cli-30/p0 | a..b fails when rules unknown; with unevaluated rule | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:418` |
| TC-cli-31/p0 | invalid ref names, no forge | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:434` |
| TC-cli-32/p0 | loop-kind samples with a invalid literal format part fail validation (exit 2) rather than reach forge | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:448` |
| TC-cli-33/p0 | working branch invalid in pr mode is ignored | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:457` |
| TC-cli-34/p0 | gh path for hostile working name is one encoded argument | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:465` |
| TC-security-16 | 21 invalid ref names x (no forge, rules, rules unknown) | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:261` |
| TC-security-17 | spec example a..b, exact samples array | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:281` |
| TC-security-18 | @{-1} and @{-2} as working branch, run from a repo with branch history | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:289` |
| TC-security-19 | same name from two cwds gives the same verdict | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:304` |
| TC-security-20 | odd but valid names are not refused | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:316` |

<details>
<summary>Case detail (12 cases)</summary>

#### TC-cli-28/p0 · VS-6 a..b fails with git check-ref-format with no forge · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-118 --mode mr --branch a..b
exit: 1 (79 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-29/p0 · VS-6 a..b fails with rules present; other samples keep their result (stack has no working) · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (210 ms)
exit: 0 (105 ms)
exit: 1 (217 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-30/p0 · VS-6 a..b fails when rules unknown; with unevaluated rule · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (227 ms)
exit: 1 (199 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-31/p0 · VS-6 invalid ref names, no forge · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command transcripts](../../slices/S-015/verification/r0/logs/cli-0-TC-cli-31-transcript.txt)

#### TC-cli-32/p0 · VS-6 loop-kind samples with a invalid literal format part fail validation (exit 2) rather than reach forge · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 2 (61 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-33/p0 · VS-6 working branch invalid in pr mode is ignored · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
$ python3 <worktree>/skills/sdlc/branches.py preflight --repo <tmp>/testkit-cli-FN2e6J/repo-152 --mode pr --branch a..b
exit: 0 (123 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-cli-34/p0 · VS-6 gh path for hostile working name is one encoded argument · PASS
- **Given** A scratch git repo built by cli-runner, with the forge shims named in the test **When** branches.py preflight runs as a real process; see the transcript **Then** The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- **Expected** As the test asserts **Actual** All assertions held
- **Spec source:** R-044 quote and spec section 3 (git check-ref-format) · **Run:** `cd .sdlc/slices/S-015/verification/r0 && node --test tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript, first calls only):

```console
exit: 1 (220 ms)
```

  Full text: [log](../../slices/S-015/verification/r0/logs/cli-0-run.txt)

#### TC-security-16 · 21 invalid ref names x (no forge, rules, rules unknown) · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** fail with git check-ref-format (or the forge label when a rule fails first); other samples unchecked
- **Expected** fail with git check-ref-format (or the forge label when a rule fails first); other samples unchecked **Actual** as expected
- **Spec source:** R-044 acceptance; spec §3 line 118 · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-6 A15:'`
- Evidence (attack A15): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-17 · spec example a..b, exact samples array · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** [{working,a..b,fail,git check-ref-format}] exit 1
- **Expected** [{working,a..b,fail,git check-ref-format}] exit 1 **Actual** as expected
- **Spec source:** R-044 acceptance; spec §3 line 118 · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-6 A16:'`
- Evidence (attack A16): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-18 · @{-1} and @{-2} as working branch, run from a repo with branch history · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** fail (refs/heads/@{-1} is not a valid ref)
- **Expected** fail (refs/heads/@{-1} is not a valid ref) **Actual** unchecked, exit 0: git check-ref-format --branch expands @{-n} against the cwd repo
- **Spec source:** R-044 acceptance; spec §3 line 118 · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-6 A17:'`
- Evidence (attack A17): result out-of-scope · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-19 · same name from two cwds gives the same verdict · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** same result
- **Expected** same result **Actual** unchecked from a repo with history, fail from a plain directory
- **Spec source:** R-044 acceptance; spec §3 line 118 · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-6 A18:'`
- Evidence (attack A18): result out-of-scope · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-20 · odd but valid names are not refused · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** unchecked, exit 0
- **Expected** unchecked, exit 0 **Actual** as expected
- **Spec source:** R-044 acceptance; spec §3 line 118 · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-6 A19:'`
- Evidence (attack A19): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

</details>

### VS-7 · Missing gh or glab does not crash or block
Profiles: cli, security. Risk: A missing or signed-out forge tool that crashes or blocks stops a launch that the spec allows.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1/p1 | No gh and no glab: ok true, one rules unknown note, all unchecked | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:14` |
| TC-cli-2/p1 | Missing gh with bad ref: only the ref fails | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:29` |
| TC-cli-3/p1 | Signed-out gh gives one note and unchecked | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:40` |
| TC-cli-4/p1 | Signed-out glab gives one note and unchecked | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:52` |
| TC-cli-5/p1 | Garbage, empty, non-list, binary and null output never crash | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:62` |
| TC-cli-6/p1 | gh exit 127 gives one note, ok true | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:87` |
| TC-security-21 | gh or glab absent from PATH, four modes | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:327` |
| TC-security-22 | signed-out gh, invalid UTF-8, truncated JSON, 100000-deep JSON, 300000-byte stderr | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:346` |
| TC-security-23 | glab signed-out and garbage | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:368` |
| TC-security-24 | a..b with gh missing | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:380` |
| TC-security-25 | executable gh planted in the repo with an empty PATH entry | PASS | `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:389` |

<details>
<summary>Case detail (11 cases)</summary>

#### TC-cli-1/p1 · No gh and no glab: ok true, one rules unknown note, all unchecked · PASS
- **Given** Github and gitlab repos, modes pr and stack, PATH holds python3 and git only **When** preflight --mode pr|stack **Then** exit 0, ok true, 1 note "rules unknown on <forge>:", 3 unchecked samples
- **Expected** exit 0, ok true, 1 note "rules unknown on <forge>:", 3 unchecked samples **Actual** as expected: note "rules unknown on github: [Errno 2] No such file or directory: 'gh'"
- **Spec source:** R-084 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-2/p1 · Missing gh with bad ref: only the ref fails · PASS
- **Given** mr mode, --branch a..b, no gh **When** preflight **Then** exit 1, one working sample fail git check-ref-format, one note
- **Expected** exit 1, one working sample fail git check-ref-format, one note **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-3/p1 · Signed-out gh gives one note and unchecked · PASS
- **Given** gh exits 4 with auth login text on stderr **When** preflight --mode pr **Then** exit 0, ok true, note carries stderr
- **Expected** exit 0, ok true, note carries stderr **Actual** as expected
- **Spec source:** R-084 quote · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-4/p1 · Signed-out glab gives one note and unchecked · PASS
- **Given** glab exits 1, 401 on stderr **When** preflight --mode pr **Then** exit 0, ok true, note on gitlab
- **Expected** exit 0, ok true, note on gitlab **Actual** as expected
- **Spec source:** R-084 quote · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-5/p1 · Garbage, empty, non-list, binary and null output never crash · PASS
- **Given** gh or glab print 8 kinds of bad stdout **When** preflight --mode pr **Then** exit 0, empty stderr, ok true, no traceback
- **Expected** exit 0, empty stderr, ok true, no traceback **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-6/p1 · gh exit 127 gives one note, ok true · PASS
- **Given** gh exits 127 **When** preflight **Then** exit 0, ok true, one note
- **Expected** exit 0, ok true, one note **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-security-21 · gh or glab absent from PATH, four modes · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 0, ok true, one note, unchecked (direct on github has no sample and no note)
- **Expected** exit 0, ok true, one note, unchecked (direct on github has no sample and no note) **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-7 A20:'`
- Evidence (attack A20): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-22 · signed-out gh, invalid UTF-8, truncated JSON, 100000-deep JSON, 300000-byte stderr · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 0, one note, unchecked
- **Expected** exit 0, one note, unchecked **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-7 A21:'`
- Evidence (attack A21): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-23 · glab signed-out and garbage · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 0, ok true
- **Expected** exit 0, ok true **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-7 A22:'`
- Evidence (attack A22): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-24 · a..b with gh missing · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** exit 1, git check-ref-format, one note
- **Expected** exit 1, git check-ref-format, one note **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-7 A23:'`
- Evidence (attack A23): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

#### TC-security-25 · executable gh planted in the repo with an empty PATH entry · PASS
- **Given** a scratch git repo, a gh or glab shim, a controlled PATH **When** preflight runs with the attack input **Then** planted tool not run
- **Expected** planted tool not run **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern 'verify security VS-7 A24:'`
- Evidence (attack A24): result held · [attack log](../../slices/S-015/verification/r0/logs/security-0-attacks.jsonl)

</details>

### VS-8 · Notes merge without duplicates in first-seen order
Profiles: cli, contract. Risk: Repeated or misordered notes hide the one note that matters.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7/p1 | Same bad regex on every sample gives one cannot evaluate note | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:95` |
| TC-cli-8/p1 | Distinct bad rules: notes in first-seen order without duplicates | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:107` |
| TC-cli-9/p1 | Stack mode: unknown kind and bad regex each give a note | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:123` |
| TC-cli-10/p1 | GitLab bad push rule gives one note across samples | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:132` |
| TC-cli-11/p1 | A read_rules failure on call 2 yields one note and all unchecked | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:141` |
| TC-contract-6/p0 | Notes merge without duplicates in first-seen order | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:337` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-7/p1 · Same bad regex on every sample gives one cannot evaluate note · PASS
- **Given** gh returns one uncompilable regex for each sample **When** preflight --mode pr **Then** 1 note, 3 unevaluated, ok true
- **Expected** 1 note, 3 unevaluated, ok true **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-8/p1 · Distinct bad rules: notes in first-seen order without duplicates · PASS
- **Given** Rules zeta, alpha, overlapping across samples **When** preflight --mode pr **Then** notes [zeta, alpha]
- **Expected** notes [zeta, alpha] **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-9/p1 · Stack mode: unknown kind and bad regex each give a note · PASS
- **Given** rule kind weird and regex (?P< on 3 samples **When** preflight --mode stack **Then** notes order odd, bad; ok true
- **Expected** notes order odd, bad; ok true **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-10/p1 · GitLab bad push rule gives one note across samples · PASS
- **Given** glab returns branch_name_regex "(" **When** preflight --mode pr **Then** 1 note "cannot evaluate push rule", all unevaluated
- **Expected** 1 note "cannot evaluate push rule", all unevaluated **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-11/p1 · A read_rules failure on call 2 yields one note and all unchecked · PASS
- **Given** gh call 1 returns a bad regex, call 2 fails **When** preflight --mode pr **Then** 1 note rules unknown; samples unchecked; rules []
- **Expected** 1 note rules unknown; samples unchecked; rules [] **Actual** as expected
- **Spec source:** R-041 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-contract-6/p0 · Notes merge without duplicates in first-seen order · PASS
- **Given** Same bad regex on three samples; two bad rules in mixed order; unknown kind; gh error on the second sample **When** preflight runs with a fake gh **Then** One cannot evaluate note for the same rule; order is first seen; a rules unknown note stands alone and all samples are unchecked
- **Expected** One cannot evaluate note for the same rule; order is first seen; a rules unknown note stands alone and all samples are unchecked **Actual** notes: one note for the repeated rule; bad-two before bad-one; one note for the unknown kind; one rules unknown note. The property test also checks no duplicate notes in 1000 cases
- **Spec source:** R-041 acceptance, spec section 3 · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): see logs/contract-0-results.jsonl (VS-8 row)

</details>

### VS-9 · Each sample is judged against its own rules
Profiles: cli, contract. Risk: A rule for one branch name that fails another branch name gives a wrong verdict.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-12/p1 | A rule for one sample does not fail the others | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:151` |
| TC-cli-13/p1 | Overlapping rules give per-sample first failing label | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:175` |
| TC-cli-14/p1 | Negated rule applies per sample | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:188` |
| TC-cli-15/p1 | Working sample equal to a slice name keeps its own row | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:199` |
| TC-cli-16/p1 | Rule is judged on the formatted name | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:210` |
| TC-cli-17/p1 | GitLab push rule applies to every sample with its own result | PASS | `.sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:223` |
| TC-contract-7/p0 | Each sample is judged against its own rules | PASS | `.sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:375` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-12/p1 · A rule for one sample does not fail the others · PASS
- **Given** gh returns starts_with feature/ for call 1 only **When** preflight --mode pr **Then** slice fail with label, state and e2e pass; 3 calls with the encoded names
- **Expected** slice fail with label, state and e2e pass; 3 calls with the encoded names **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-13/p1 · Overlapping rules give per-sample first failing label · PASS
- **Given** Rules a,b,c vary per sample **When** preflight --mode pr **Then** [pass,null],[fail,b],[fail,c]; union rules a,b,c
- **Expected** [pass,null],[fail,b],[fail,c]; union rules a,b,c **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-14/p1 · Negated rule applies per sample · PASS
- **Given** negate on call 1 and 2 **When** preflight --mode pr **Then** fail, pass, pass
- **Expected** fail, pass, pass **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-15/p1 · Working sample equal to a slice name keeps its own row · PASS
- **Given** mr mode, --branch sdlc/S-001 **When** preflight --mode mr **Then** one working row failing; one gh call
- **Expected** one working row failing; one gh call **Actual** as expected
- **Spec source:** R-040 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-16/p1 · Rule is judged on the formatted name · PASS
- **Given** --format team/{name:lower}, regex ^team/s-001$ **When** preflight --mode pr **Then** slice name team/s-001 passes
- **Expected** slice name team/s-001 passes **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-cli-17/p1 · GitLab push rule applies to every sample with its own result · PASS
- **Given** branch_name_regex ^sdlc/(S|M)- **When** preflight --mode pr **Then** [pass],[fail push rule],[pass]; 1 glab call
- **Expected** [pass],[fail push rule],[pass]; 1 glab call **Actual** as expected
- **Spec source:** R-044 acceptance · **Run:** `cd <worktree> && VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs`
- Evidence (transcript): [full transcripts including exit codes and stdout](../../slices/S-015/verification/r0/logs/cli-1-run.log)
- Evidence (file-tree): Each run: repo and cwd trees unchanged (treeUnchanged).

#### TC-contract-7/p0 · Each sample is judged against its own rules · PASS
- **Given** gh returns different rules per sample; overlapping rules A, B, C on all samples; a duplicate-name pair (white-box probe) **When** preflight and verdict run **Then** A rule for one sample fails only that sample; overlapping rules give the first failing label per sample; the union rules list is deduplicated; a duplicate name shares one gh call and keeps two rows
- **Expected** A rule for one sample fails only that sample; overlapping rules give the first failing label per sample; the union rules list is deduplicated; a duplicate name shares one gh call and keeps two rows **Actual** as expected; replacing by_sample with the union rules makes this test and the property fail
- **Spec source:** R-044 acceptance · **Run:** `VERIFY_WT=<worktree> VERIFY_MAIN=<repo> TESTKIT_SEED=424242 node --test .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): result pass; mutation check: union rules -> VS-9 test fails and property gives 357 violations

</details>

## How it was attacked
One security session ran in round 0 (security-0, 28 cases, 28 attacks). The charter: hostile branch names, formats, forge output and rule bodies must never change the verdict rules, run a command, crash preflight or leak data. The boundary is the `preflight` command line and the output of the `gh` and `glab` tools it calls. 22 attacks held. 0 broke a spec rule. 6 were out of scope because the spec states no behavior (A8, A17, A18, A25, A26, A27). Those 6 are seeds. The Security review found no blocking finding.

<details>
<summary>Attack table (28 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A1 | mr working branch equal to a slice name is kept as given, last | one working sample named sdlc/S-001, exit 0, tree unchanged | as expected | held |
| A2 | pr, stack and direct ignore a hostile --branch | no working sample; no gh argv carries the value | as expected | held |
| A3 | option-like, spaced and empty --branch=<v> never become git or gh options | working name verbatim; option-like and spaced names fail; empty adds no sample; gh path stays one quoted segment | as expected | held |
| A3b | separate option-like value for --branch exits 2 with one error object | exit 2, {ok:false,error} | as expected | held |
| A4 | attack corpus (7 families) as working branch | no crash, name verbatim, tree unchanged, exit 1 iff fail | as expected | held |
| A5 | no forge: ok true, all unchecked, zero gh calls, all four modes | as stated | as expected | held |
| A6 | matching rule passes; uncompilable regexes are unevaluated with a note | exit 0, pass / unevaluated, cannot evaluate note | as expected | held |
| A7 | gh exit 1, non-JSON, JSON object, empty output give one rules-unknown note | exit 0, unchecked, one gh call | as expected | held |
| A8 | forge rule with a non-string pattern (null, 5, list, dict) | exit 0 and a JSON object | exit 1, Python traceback, no JSON, for 6 of 9 shapes (TypeError in evaluate) | out-of-scope |
| A9 | glab malformed push-rule bodies | no crash | as expected | held |
| A10 | keys, exit 1, one JSON object, first failing rule label | as stated | as expected | held |
| A11 | hostile rule labels (newline, ANSI, JSON break-out, 100000 chars, RLO) | one JSON line, label verbatim | as expected | held |
| A12 | negate as string, 0, null; ok never true with a failing sample | ok equals no fail | as expected | held |
| A13 | bad mode and format inputs exit 2, no side effect, shell metacharacters inert | exit 2 or 0, one JSON object, tree unchanged | as expected | held |
| A14 | attack corpus as a format prefix; gh path stays one quoted segment | no crash; no raw / ? # or space in the gh path | as expected | held |
| A15 | 21 invalid ref names x (no forge, rules, rules unknown) | fail with git check-ref-format (or the forge label when a rule fails first); other samples unchecked | as expected | held |
| A16 | spec example a..b, exact samples array | [{working,a..b,fail,git check-ref-format}] exit 1 | as expected | held |
| A17 | @{-1} and @{-2} as working branch, run from a repo with branch history | fail (refs/heads/@{-1} is not a valid ref) | unchecked, exit 0: git check-ref-format --branch expands @{-n} against the cwd repo | out-of-scope |
| A18 | same name from two cwds gives the same verdict | same result | unchecked from a repo with history, fail from a plain directory | out-of-scope |
| A19 | odd but valid names are not refused | unchecked, exit 0 | as expected | held |
| A20 | gh or glab absent from PATH, four modes | exit 0, ok true, one note, unchecked (direct on github has no sample and no note) | as expected | held |
| A21 | signed-out gh, invalid UTF-8, truncated JSON, 100000-deep JSON, 300000-byte stderr | exit 0, one note, unchecked | as expected | held |
| A22 | glab signed-out and garbage | exit 0, ok true | as expected | held |
| A23 | a..b with gh missing | exit 1, git check-ref-format, one note | as expected | held |
| A24 | executable gh planted in the repo with an empty PATH entry | planted tool not run | as expected | held |
| A25 | working branch .. and . reach gh as repos/{owner}/{repo}/rules/branches/.. and /. | no request for an invalid ref name | gh api called with a dot segment, a different endpoint | out-of-scope |
| A26 | forge regex ^(a+)+$ against a 41-character working branch | finishes | still running after 8 s (catastrophic backtracking) | out-of-scope |
| A27 | gh stderr holding a token is echoed into notes | no secret in output | the token text appears in notes | out-of-scope |

</details>

## Defects found on the way
- **Blocking defects:** none. Round 0 had no refuted case, no failing test and no fix round. The architecture and security reviews found no blocking finding.
- **Seeds**, open (no fix round ran):

| Seed | Found by | File |
|---|---|---|
| @{-1} passes the ref-format check | review security | `skills/sdlc/branches.py` |
| Dead branch in verdict | review architecture | `skills/sdlc/branches.py` |
| preflight result built in two steps | review architecture | `skills/sdlc/branches.py` |
| read_rules swallows a broken config | review architecture | `skills/sdlc/branches.py` |
| Prose of tests.md | review architecture | `.sdlc/slices/S-015/tests.md` |
| testkit: stub-server cannot answer by argv | verifier cli-0 | `skills/sdlc/test/testkit/stub-server.mjs` |
| R-040 duplicate name unreachable | verifier cli-1 | `skills/sdlc/branches.py` |
| --branch with an empty value is ignored in mr mode | verifier contract-0 | `skills/sdlc/branches.py` |
| No real mode can give two samples with one name | verifier contract-0 | `skills/sdlc/branches.py` |
| Preflight output carries command, args and given beyond the spec keys | verifier contract-0 | `skills/sdlc/branches.py` |
| A forge rule with a non-string pattern crashes preflight | verifier security-0 (A8) | `skills/sdlc/branches.py` |
| ref_format_error uses --branch in the process cwd, so @{-n} gives a cwd-dependent verdict | verifier security-0 (A17, A18) | `skills/sdlc/branches.py` |
| Dot-segment names reach gh as a path segment | verifier security-0 (A25) | `skills/sdlc/branches.py` |
| Forge regex with catastrophic backtracking hangs preflight | verifier security-0 (A26) | `skills/sdlc/branches.py` |
| Forge CLI stderr is copied into notes verbatim | verifier security-0 (A27) | `skills/sdlc/branches.py` |
| github direct mode gives no rules-unknown note when gh is missing, gitlab does | verifier security-0 (A20) | `skills/sdlc/branches.py` |
| testkit: attack-corpus has no ref-name family | verifier security-0 | `skills/sdlc/test/testkit/attack-corpus/` |

## Appendix
- Toolkit tools used: cli-runner, stub-server, glab-stub, attack-corpus, property (all under `skills/sdlc/test/testkit/`).
- Plan: [plan-r0.md](../../slices/S-015/verification/r0/../plan-r0.md), [plan-r0.json](../../slices/S-015/verification/r0/../plan-r0.json).
- Profile evidence: cli-0 ([json](../../slices/S-015/verification/r0/cli-0.json), [md](../../slices/S-015/verification/r0/cli-0.md)), cli-1 ([json](../../slices/S-015/verification/r0/cli-1.json), [md](../../slices/S-015/verification/r0/cli-1.md)), contract-0 ([json](../../slices/S-015/verification/r0/contract-0.json), [md](../../slices/S-015/verification/r0/contract-0.md)), security-0 ([json](../../slices/S-015/verification/r0/security-0.json), [md](../../slices/S-015/verification/r0/security-0.md)).
- Logs: [../../slices/S-015/verification/r0/logs](../../slices/S-015/verification/r0/logs/).
- Core verifiers: [spec fidelity](../../slices/S-015/verify-spec-fidelity-r0.md), [regression](../../slices/S-015/verify-regression-r0.md). Reviews: [architecture](../../slices/S-015/review-architecture-r0.md), [security](../../slices/S-015/review-security-r0.md). Gate: [gate-r0.md](../../slices/S-015/gate-r0.md).
- Missing sources: none. The `verification/` folder holds the round 0 test files, which the later cleanup may prune.
