# S-003 verification: cli, part 1, round 0

- Slice: S-003
- Profile: cli
- Round: 0
- Commit: 13b17f1
- Scenarios: VS-9, VS-10
- Verdict: pass. 10 cases ran and 10 passed.

## Environment

macOS Darwin 25.6.0, Node v24.19.0, Python 3.14.7, git 2.50.1; testkit cli-runner with scratch HOME, TZ=UTC, PYTHONUTF8=1; branches.py run as a script from the slice worktree at 13b17f1.

Test file: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs`.

Run the cases with this command from the repo root:

```
VERIFY_LOG_DIR=$PWD/.sdlc/slices/S-003/verification/r0/logs node --test .sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs
```

## TC-cli-101: A hostile --id reaches the slice tail as literal text

- Scenario: VS-9
- Requirements: R-099, R-018
- Result: pass
- Spec source: R-099 acceptance (one JSON object, no traceback); R-018 quote (the tail from the table); plan-r0 VS-9 notes (a placeholder inside a part is literal text)
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:57`

**Given** A scratch git repo with no config. 125 argv-safe values from ten attack-corpus families: control-chars, flag-like-values, format-strings, injection, oversized (to 200 kB), traversal, unicode-confusables, unicode-whitespace, unicode-digits, integer-forms.

**When** Run `branches.py name --repo <repo> --kind slice --id=<value>` from a new scratch cwd for each value.

**Then** Each run exits 0 or 2. stdout is one JSON line. stderr is empty, with no traceback. The tree is unchanged. A non-empty value gives branch `sdlc/<value>` exactly. An empty value exits 2 with an error that names id. The transcript log clips each run at 4000 characters, so the oversized runs show no exit line there; the test asserts their exit code.

- Expected: exit 0 with branch `sdlc/<value>`, or exit 2 with one JSON error for the empty value; no traceback; no side effect
- Actual: 123 values exit 0 with branch `sdlc/<value>` byte for byte. The two empty values (format-strings/empty, integer-forms/empty) exit 2 with `a slice branch name needs a non-empty id`. stderr is empty in all 125 runs. No tree or ref changes.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-101.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-102: A hostile --area reaches the e2e-area tail as literal text

- Scenario: VS-9
- Requirements: R-099, R-018
- Result: pass
- Spec source: R-099 acceptance; R-018 quote
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:77`

**Given** The same repo and the same 125 values.

**When** Run `branches.py name --repo <repo> --kind e2e-area --id M-1 --area=<value>` for each value.

**Then** Each run gives one JSON object, exit 0 or 2, no traceback and no side effect. A non-empty value gives `sdlc/M-1-e2e-<value>`. An empty value exits 2 with an error that names area.

- Expected: branch `sdlc/M-1-e2e-<value>` or one JSON error naming area
- Actual: 123 values give `sdlc/M-1-e2e-<value>` exactly. The two empty values exit 2 with `a e2e-area branch name needs a non-empty area`. stderr is empty. No tree or ref changes.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-102.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-103: A placeholder inside a part is never expanded, with a flag format or a config format

- Scenario: VS-9
- Requirements: R-018, R-099
- Result: pass
- Spec source: plan-r0 VS-9 notes (a placeholder inside a part is literal text, never re-expanded); R-018 quote
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:93`

**Given** The format-strings family without the empty value (17 values). A repo with no config, and a repo whose config holds `feature/{name:lower}`.

**When** Run name with `--format team/{name}-x --id=<value>`, then with the config format and no flag. Also run `--kind e2e-area --id {name} --area {name:lower}`.

**Then** The flag format gives `team/<value>-x`. The config format gives `feature/<lowercased value>`. The last run gives `sdlc/{name}-e2e-{name:lower}`.

- Expected: literal parts, never re-expanded
- Actual: All 35 runs match. For example `--id={name}{name}` gives `team/{name}{name}-x`, and `--id={0.__class__}` stays literal.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-103.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-104: A flag-like value in the separate form gives one JSON error, never help text

- Scenario: VS-9
- Requirements: R-099
- Result: pass
- Spec source: R-099 acceptance; plan-r0 VS-9 notes (every command prints one JSON object and exits 0 or 2)
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:113`

**Given** The same repo.

**When** Run name with `--id --help`, `--id -h`, `--id --format`, `--id --repo`, `--area --format`, `--area --help` and `--area -h`. Then run `--area=--format`.

**Then** The seven separate-form runs exit 2 with one JSON error and no help text. The equals form keeps the value literal.

- Expected: exit 2 and `{ok: false, error}` for the separate form; branch `sdlc/M-1-e2e---format` for the equals form
- Actual: Each separate-form run exits 2 with `argument --id: expected one argument` or the --area form. The equals form exits 0 with `sdlc/M-1-e2e---format`, and the format stays `sdlc/{name}`.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-104.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-105: The integer flags refuse non-integers with one JSON error

- Scenario: VS-9
- Requirements: R-099
- Result: pass
- Spec source: plan-r0 VS-9 notes (argparse must refuse non-integers with one JSON error and exit 2); R-099 acceptance
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:138`

**Given** 35 values from integer-forms, unicode-digits and huge-integers, for each of --n, --round and --part (105 runs).

**When** Run `name --kind slice --id S-001 --<flag>=<value>`. The oracle is Python `int()` on the same value.

**Then** A value that `int()` refuses exits 2 with one JSON error `invalid int value`. A value that `int()` takes exits 0 with branch `sdlc/S-001`.

- Expected: exit 2 with one JSON error for non-integers; no traceback for huge values
- Actual: The empty value, hex, float, exp, word, inf, nan, superscript, roman, circled, digits-4301, digits-100k, negative-5000 and zeros-10k exit 2 with one JSON error. 21 forms per flag exit 0 with `sdlc/S-001`, among them unicode digits and padded values. No traceback.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-105.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-106: No hostile part creates a git ref or a file, and a second run gives the same output

- Scenario: VS-9
- Requirements: R-099
- Result: pass
- Spec source: plan-r0 VS-9 notes (no side effect with the tree diff and no git ref created)
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:162`

**Given** The repo with branch `sdlc/S-001`. The injection family (13 values).

**When** Run `name --kind e2e-area --id=<value> --area=<value>` two times for each value.

**Then** Both runs give the same stdout. The repo refs and `git status --porcelain` are the same as before. No `pwned` file appears.

- Expected: no side effect; same output on a second run
- Actual: All 26 runs give one JSON object with exit 0; the two outputs match. `for-each-ref` and `status --porcelain` do not change, and no file appears in the cwd.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-106.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-107: branches.py imports no module from the cwd

- Scenario: VS-9
- Requirements: R-099
- Result: pass
- Spec source: plan-r0 VS-9 notes (use plantDecoy to confirm branches.py does not import a module from the cwd)
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:177`

**Given** A cwd with exit-type decoy modules from `plantDecoy` for branches, json, argparse, re, subprocess, datetime, os and sys.

**When** Run `name --kind slice --id S-001` and `name --kind e2e-area --id M-1` from that cwd.

**Then** The first run gives `sdlc/S-001`, exit 0. The second run exits 2 with one JSON error. No decoy marker is written.

- Expected: no decoy import; normal output
- Actual: exit 0 with `sdlc/S-001`, then exit 2 with `a e2e-area branch name needs a non-empty area`. The marker file does not exist.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-107.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-110: Zero-valued integer parts are accepted for slice, e2e-area and state

- Scenario: VS-10
- Requirements: R-018, R-099
- Result: pass
- Spec source: plan-r0 VS-10 notes (--n 0 --part 0 --round 0 with --kind slice must succeed); R-018 quote
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:193`

**Given** The same repo.

**When** Run name with `--n 0 --part 0 --round 0` for slice and e2e-area, the equals form with `--profile x`, the forms `-0`, `00` and `+0`, and state with the zero parts.

**Then** Each run exits 0 with exactly the keys ok, command, format, kind and branch. The branch does not change.

- Expected: `sdlc/S-001`, `sdlc/M-1-e2e-api`, `sdlc/state-` plus 14 digits
- Actual: All five runs exit 0 with the expected branch, an empty stderr and an unchanged tree.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-110.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-111: A zero-valued string part is kept, not dropped as absent

- Scenario: VS-10
- Requirements: R-018, R-099
- Result: pass
- Spec source: R-018 quote (a missing part is a Fail, so a present part must not fail); plan-r0 VS-10 title
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:214`

**Given** The same repo.

**When** Run name with `--id 0`, `--id 0 --area 0`, `--id M-1 --area 0`, and `--id 0 --format x/{name:lower}`.

**Then** The branches are `sdlc/0`, `sdlc/0-e2e-0`, `sdlc/M-1-e2e-0` and `x/0`.

- Expected: the string `0` counts as present
- Actual: All four runs exit 0 with the expected branch.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-111.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## TC-cli-112: The name part filter passes a zero n, round and part to a row that needs them

- Scenario: VS-10
- Requirements: R-018
- Result: pass
- Spec source: plan-r0 VS-10 notes (the CLI part filter must test is not None, not truthiness)
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-1/hostile-parts.verify-cli.test.mjs:231`

**Given** No S-003 row consumes n, round or part. A probe loads branches.py by path with `python3 -I`, adds a `verify` row that needs n, round and part, and calls the real `main` with the real argv.

**When** Run the probe with `name --kind verify --n 0 --round 0 --part 0`.

**Then** The row gets the integer 0 for each part, and the branch is `sdlc/0-0-0`.

- Expected: exit 0 with `sdlc/0-0-0`; a truthiness filter would give exit 2
- Actual: exit 0 with `sdlc/0-0-0`. The filter tests `is not None`.

transcript: excerpt of the transcript

```
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

transcript: full transcripts of every run in this case: `.sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-112.txt`

file-tree: tree diff of the cwd and the repo, git refs included

```
Every run in this case reports the cwd tree and the repo tree as unchanged; no ref is added. The full log holds a `--- tree ... (unchanged)` line per watched directory per run.
```

## Attacks

No separate attack entries. The hostile inputs are in TC-cli-101 to TC-cli-107.

## Seeds

### name gives a branch that git refuses for a part with git-unsafe characters

validate_format checks only the format with the sample id S-001. name does not run `git check-ref-format --branch` on the full name. The ids `../x`, `a b`, `x..y`, `x~1`, `a:b`, `x.lock`, `*` and `@{1}` give branches that git refuses, with exit 0. The spec validates only the format, so this is out of scope here. A later slice that creates branches from these names must check them. Transcripts: .sdlc/slices/S-003/verification/r0/logs/cli-1-seeds.txt.

File: `skills/sdlc/branches.py`

### the integer flags take unicode digits, padded values and underscores

argparse `type=int` uses Python int(), so `--n=٣`, `--n=１２`, `--n=' 3 '`, `--n=1_000`, `--n=+1` and `--n=9223372036854775808` all exit 0. No S-003 row consumes these parts. When the verify and attempt rows land in S-004 to S-006, the branch shows the normalized int, so `--n=٣` and `--n=3` give the same branch. Record whether that is intended. List: .sdlc/slices/S-003/verification/r0/logs/cli-1-TC-cli-105-accepted.txt.

File: `skills/sdlc/branches.py`

### name --help prints plain help text and exits 0, not one JSON object

`branches.py name --help` prints the argparse usage text and exits 0. Every other path prints one JSON object. The spec does not define --help. A caller that parses stdout as JSON fails on it. A flag-like part value never reaches this path (TC-cli-104).

File: `skills/sdlc/branches.py`
