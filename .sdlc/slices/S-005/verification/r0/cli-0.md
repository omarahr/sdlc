# S-005 verify-cli, part 0, round 0

- Slice: S-005
- Profile: cli
- Round: 0 (plan round 0, re-plan)
- Commit: 9e1e71b
- Verdict: pass, 13 of 13 cases pass, no refutation
- Environment: macOS (Darwin 25.6), Python 3.14.7, Node v24.19.0, git 2.50.1; branches.py and push_guard.py run as subprocesses through the testkit cli-runner in scratch git repos (TZ=UTC unless set, scratch HOME)
- Run log: `.sdlc/slices/S-005/verification/r0/logs/cli-0-run.txt`

## TC-cli-1 (VS-1): State name is sdlc/state- plus 14 UTC digits under far time zones

- Requirements: R-008
- Spec source: R-008 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:48`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-1 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch git repo with no config, and TZ set to Pacific/Kiritimati, America/Adak, Etc/GMT+12, Etc/GMT-14 and unset.

**When** branches.py name --repo <repo> --kind state runs once per TZ value.

**Then** Each run exits 0 with one JSON line, and the tail is the UTC time between the times taken before and after the call.

- Expected: sdlc/state-<%Y%m%d%H%M%S in UTC>, exit 0, empty stderr, no file change
- Actual: All five runs printed sdlc/state-<14 digits> in UTC inside the window, exit 0, stderr empty, tree unchanged

**transcript: five TZ runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-1.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-2 (VS-1): State name keeps its tail under custom formats and ignores extra flags

- Requirements: R-008
- Spec source: R-008 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:66`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-2 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo, and a second repo whose config sets branchFormat team/{name}/wip.

**When** name --kind state runs with --format feature/PROJ-1-{name}, with feature/PROJ-1-{name:lower}, with extra --id --n --round --profile --part flags, and under the config format.

**Then** The format wraps the state tail, and extra flags do not change it.

- Expected: feature/PROJ-1-state-<14>, sdlc/state-<14>, team/state-<14>/wip
- Actual: All outputs matched, exit 0, stderr empty, tree unchanged

**transcript: format and extra-flag runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-2.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-3 (VS-3): Verify name matches the spec example, the loop builder and every catalog profile

- Requirements: R-009
- Spec source: R-009 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:86`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-3 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo with the default format; ids S-001, S-fix-3, S-fix-M-1-2, S-013a, S-999; the ten catalog profiles; rounds 0, 1, 7, 12 and parts 0, 1, 3, 10.

**When** name --kind verify --id <id> --round <r> --profile <p> --part <n> runs 51 times.

**Then** The output equals sdlc/<id>-v<r>-<p>-<n> and the verifyPhase template in sdlc-loop.js evaluated on the same values.

- Expected: sdlc/S-001-v0-http-api-0 for the acceptance example; equal to the loop builder in every run; a repeat run prints the same line
- Actual: All 51 runs matched both the template and the loop builder; the repeat run printed the same line

**transcript: acceptance run**

```
$ python3 skills/sdlc/branches.py name --repo <repo> --kind verify --id S-001 --round 0 --profile http-api --part 0
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "verify", "branch": "sdlc/S-001-v0-http-api-0"}
--- stderr
(empty)
```

**transcript: sampled runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-3.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-4 (VS-4): Verify name with a missing or empty part exits 2 with one JSON error naming the part

- Requirements: R-009
- Spec source: R-009 acceptance (a missing part is refused)
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:116`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-4 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo; a full verify argument set.

**When** name --kind verify runs with each of --id, --round, --profile, --part dropped in turn, with an empty --id and --profile, and with a missing --repo directory.

**Then** Each run exits 2 with one JSON line, ok false, an error that names the part, no traceback, empty stderr, no file or ref change.

- Expected: exit 2, {"ok": false, "error": "... <part> ..."}
- Actual: All seven runs exited 2 with one JSON line naming the part, for example "a verify branch name needs a non-empty id"; trees unchanged

**transcript: refusal runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-4.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-5 (VS-4): Malformed --round and --part are refused or give an ASCII integer

- Requirements: R-009
- Spec source: R-009 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:137`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-5 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo; values 1.5, 0x1, empty, " 1", 1_0, +1, -1, 00, Arabic-Indic digits, 5000 nines, and the integer-forms, unicode-digits and huge-integers corpus families.

**When** name --kind verify runs with each value in --round and in --part.

**Then** Each run exits 2 with a JSON error naming the flag, or exits 0 with an ASCII branch of the template shape; never a traceback or a file change.

- Expected: exit 2 or an ASCII integer result
- Actual: Non-integers (1.5, 0x1, empty) exit 2 naming the flag. argparse int() accepts whitespace, +, _, leading zeros, -1 and non-ASCII digits; the output is always ASCII. Negative values give sdlc/S-001-v-1-... (seed). Trees unchanged

**transcript: accepted values list**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-5.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-6 (VS-4): Hostile --profile and --id values never crash and never escape the format prefix

- Requirements: R-009
- Spec source: R-009 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:163`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-6 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo; the traversal, control-chars, flag-like-values, unicode-whitespace, injection, format-strings, unicode-confusables and oversized corpus families.

**When** name --kind verify runs with each value as --profile=<v> and as --id=<v>.

**Then** No traceback, empty stderr, one JSON line, exit 0 or 2, no file change; an accepted branch starts with sdlc/ and ends with -0.

- Expected: No crash, no branch outside the sdlc/ prefix
- Actual: 188 values gave exit 0 and the rest exit 2; none crashed; every accepted branch starts with sdlc/. Some are ref-unsafe, for example sdlc/../..-v0-http-api-0 (seed)

**transcript: one line per value**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-6.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-7 (VS-5): Attempt name matches the spec example for plain and fix ids, and extra flags do not leak

- Requirements: R-010
- Spec source: R-010 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:185`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-7 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo with the default format.

**When** name --kind attempt runs with S-001/1, S-fix-M-1-2/3, S-013a/0, S-001/123456789, and S-001/2 plus --round --profile --part --area.

**Then** The output is sdlc/<id>-attempt-<n>, and extra flags do not change it.

- Expected: sdlc/S-001-attempt-1, sdlc/S-fix-M-1-2-attempt-3, sdlc/S-013a-attempt-0, sdlc/S-001-attempt-123456789, sdlc/S-001-attempt-2
- Actual: All five outputs matched, exit 0, stderr empty, tree unchanged

**transcript: attempt runs**

```
$ python3 skills/sdlc/branches.py name --repo <repo> --kind attempt --id S-001 --n 1
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "attempt", "branch": "sdlc/S-001-attempt-1"}
--- stderr
(empty)
--- tree <cwd> (unchanged)
--- tree <repo> (unchanged)
```

**transcript: all runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-7.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-8 (VS-6): Attempt name with a missing or malformed number exits 2 or gives an ASCII integer

- Requirements: R-010
- Spec source: R-010 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:202`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-8 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo; abc, 1.0, empty, -1, and the integer-forms, unicode-digits and huge-integers families.

**When** name --kind attempt runs without --n, without --id, with an empty --id, and with each value as --n=<v>.

**Then** A missing or empty part exits 2 with one JSON error naming it; a malformed --n exits 2 naming --n or gives sdlc/S-001-attempt-<ASCII integer>.

- Expected: exit 2 or an ASCII integer result, no traceback, no file change
- Actual: Missing and empty parts exit 2 naming id or n. abc, 1.0 and empty exit 2 naming --n. Accepted forms give ASCII integers; -1 gives sdlc/S-001-attempt--1 (seed). Trees unchanged

**transcript: refusals and accepted values**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-8.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-9 (VS-7): Custom branch formats wrap verify and attempt tails, --format wins, a bad format exits 2

- Requirements: R-009, R-010
- Spec source: R-009 and R-010 acceptance
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:229`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-9 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** A scratch repo whose .sdlc/config.json sets branchFormat feature/PROJ-1-{name:lower}.

**When** name runs for verify and attempt under the config, under --format x/{name}/y, Team/PROJ-1-{name:lower} and sdlc/{name}, under six invalid formats, and against an invalid config.json.

**Then** The format wraps the tail; {name:lower} lowercases the tail only; --format wins over config; an invalid format or config exits 2 with no branch.

- Expected: feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1, x/S-001-v0-http-api-0/y, x/S-001-attempt-1/y, Team/PROJ-1-s-001-v0-http-api-0, sdlc/S-001-attempt-1; exit 2 for bad formats
- Actual: All outputs matched. The six bad formats exit 2 with an error naming the format and no branch key. The invalid config exits 2 with "not valid JSON". Trees unchanged

**transcript: format runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-9.txt`.

**file-tree: scratch repo and cwd before and after**

```
every run: tree of cwd and --repo unchanged, git refs included (see "--- tree ... (unchanged)" lines in the transcript log)
```

## TC-cli-10 (VS-8): push_guard.py output equals the pins, and each pinned push site is in the source

- Requirements: R-119
- Spec source: R-119 acceptance; tests.md R-119 scope
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:287`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-10 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** The slice tree at the verified commit.

**When** python3 skills/sdlc/test/push_guard.py <tree> runs; the PINS object is read from push-guard.test.mjs; the push and pr list lines are read from state-write.py and next-action.py.

**Then** Every output key equals its pin. There are 11 direct sites, 6 network entries, 3 pushes and one forge site. The pushes sit in advance_run_branch, ensure_milestone_branch and prune_stale_milestone_branches. The two gh pr list reads sit in load_prs. The push targets are config.runBranch, sdlc/<milestone_id>, and branches that match ^sdlc/M-\d+$.

- Expected: Output equal to the pins; no push target is a verify name
- Actual: All keys equal the pins. The three pushes and the two pr list reads are at the named functions. Targets: run (config.runBranch), want = f"sdlc/{milestone_id}", and a deletion of a branch that matches MILESTONE_BRANCH. A verify name does not match ^sdlc/M-\d+$. No target is built from a verify name

**transcript: push_guard.py output and push lines**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-10.txt`.

**transcript: state-write.py push lines**

```
248: git(repo, "push", "-q", "origin", run, check=False)                      # advance_run_branch
425: git(repo, "push", "-q", "origin", f"--force-with-lease=...", f":{branch}", check=False)  # prune_stale_milestone_branches
464: git(repo, "push", "-q", "-u", "origin", want, check=False)                # ensure_milestone_branch
```

## TC-cli-11 (VS-8): push-guard.test.mjs passes from the repo root, from another cwd and from a copied path with spaces

- Requirements: R-119
- Spec source: R-119 acceptance; T-R-119a to T-R-119e2
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:316`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-11 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** The slice tree, an unrelated scratch cwd, and a copy of skills/ and hooks/ under a path with a space and ü.

**When** node --test skills/sdlc/test/push-guard.test.mjs runs from each place.

**Then** Each run exits 0 with 6 tests, 6 pass, 0 fail, 0 skipped.

- Expected: exit 0, 6 of 6 pass, no dependence on the worktree path
- Actual: All three runs exited 0 with 6 of 6 passing and none skipped

**transcript: three runs**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-11.txt`.

## TC-cli-19 (VS-8): The loop gives its verify branch builder only to the profile agent and the collector

- Requirements: R-119
- Spec source: R-119 acceptance; T-R-119d
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:333`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-19 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** sdlc-loop.js at the verified commit.

**When** The verifyPhase body is read and every reference to branch is listed; the rest of the file is searched for the builder template.

**Then** Exactly three references: the builder, the verify-<profile> branch input and the verify-collector branches input; no other copy of the template.

- Expected: Three references, as listed
- Actual: Three references, as expected; no other copy of the template outside verifyPhase

**transcript: branch references**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-19.txt`.

## TC-cli-20 (VS-8): The verify prompts hold no push or pull-request command

- Requirements: R-119
- Spec source: tests.md seed S4 (record only)
- Result: **pass**
- Test: `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:347`
- Command: `cd "$TMPDIR/sdlc-S-005-v0-cli-0" && VERIFY_WT="$PWD" node --test --test-name-pattern "TC-cli-20 " .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`

**Given** skills/sdlc/prompts/verify-*.md, verify-collector.md included.

**When** Each line is searched for git push, push, gh pr create, glab mr create and gh api.

**Then** No hit; a hit is seed S4, not a refutation.

- Expected: No hit
- Actual: No hit in 14 files

**transcript: files and hits**

See `.sdlc/slices/S-005/verification/r0/logs/cli-0-TC-cli-20.txt`.

## Attacks

None. The security profile covers the attack corpus. This profile used the corpus only through the CLI in TC-cli-5, TC-cli-6 and TC-cli-8.

## Seeds

- **Negative --round, --part and --n are accepted** (`skills/sdlc/branches.py`): argparse int() accepts -1, so name prints sdlc/S-001-v-1-http-api-0, sdlc/S-001-v0-http-api--1 and sdlc/S-001-attempt--1. The spec does not bound name inputs.
- **Integer parts accept whitespace, '+', '_' and non-ASCII digits** (`skills/sdlc/branches.py`): ' 3', '+1', '1_000', '010', '٣' and '１２' are accepted and normalized to ASCII integers. Two inputs can give one branch name.
- **name returns ref-unsafe names for hostile --id and --profile values** (`skills/sdlc/branches.py`): For example --id ../.. gives sdlc/../..-v0-http-api-0. The output is not passed through git check-ref-format. Every accepted name keeps the sdlc/ prefix.
- **Pinned pushes take their target from config and milestone data (seed S1)** (`skills/sdlc/state-write.py`): advance_run_branch pushes config.runBranch, and ensure_milestone_branch pushes sdlc/<milestone_id>. A runBranch or milestone id equal to a verify name would push it. The guard pins the call site, not the data.
