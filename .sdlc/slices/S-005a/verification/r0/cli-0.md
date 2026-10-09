# S-005a verification: cli profile, part 0, round 0

- Slice: S-005a
- Profile: cli
- Round: 0
- Commit: de9cf46
- Verdict: not refuted. 13 cases, 13 pass.

## Environment

macOS (Darwin 25.6.0), Node v24.19.0, Python 3.14.7, git; branches.py run as a real process through testkit cli-runner from scratch cwd and scratch git repos; worktree of sdlc/S-005a at de9cf46

Full run log: `.sdlc/slices/S-005a/verification/r0/logs/cli-0-run.txt`.

## TC-cli-1 (VS-1, R-008): State name is sdlc/state- plus 14 UTC digits under far time zones

- **Given:** A scratch git repo with no config
- **When:** branches.py name --repo <repo> --kind state runs under TZ Pacific/Kiritimati, America/Adak, Etc/GMT+12, Etc/GMT-14 and unset
- **Then:** Each run exits 0 with one JSON line and empty stderr; the branch is sdlc/state-<14 digits>; the digits are a valid UTC %Y%m%d%H%M%S between two UTC clock reads
- **Expected:** sdlc/state- plus the current UTC time in 14 digits, in every TZ
- **Actual:** All five runs exit 0; e.g. TZ=Pacific/Kiritimati gave sdlc/state-20261009075249, inside the UTC read window
- **Result:** pass
- **Spec source:** R-008 acceptance
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:47`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-1.txt`.

**transcript: key output**

```
$ TZ=Pacific/Kiritimati python3 branches.py name --repo <repo> --kind state
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "state", "branch": "sdlc/state-20261009075249"}
--- stderr (empty)
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-2 (VS-1, R-008): State name keeps its tail under custom formats and ignores extra flags

- **Given:** A scratch repo, and a repo with branchFormat team/{name}/wip
- **When:** name --kind state with --format feature/PROJ-1-{name}, {name:lower}, extra --id/--n/--round/--profile/--part flags, and the config format
- **Then:** Exit 0; the tail stays state-<14 digits> inside the prefix and suffix
- **Expected:** feature/PROJ-1-state-<14>, sdlc/state-<14>, team/state-<14>/wip
- **Actual:** All match
- **Result:** pass
- **Spec source:** R-008 acceptance; spec section 1 table
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:65`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-2.txt`.

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-3 (VS-3, R-009): Verify name matches the spec example, the loop builder and every catalog profile

- **Given:** A scratch repo
- **When:** name --kind verify --id S-001 --round 0 --profile http-api --part 0; then 50 combinations of 5 ids (S-001, S-fix-3, S-fix-M-1-2, S-013a, S-999), 10 profiles, rounds 0-12 and parts 0-10
- **Then:** Exit 0, one JSON line, no stderr; branch equals sdlc/<id>-v<round>-<profile>-<part> and the sdlc-loop.js builder; a second run prints the same line
- **Expected:** sdlc/S-001-v0-http-api-0
- **Actual:** sdlc/S-001-v0-http-api-0; all 50 combinations equal the loop builder output
- **Result:** pass
- **Spec source:** R-009 acceptance
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:85`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-3.txt`.

**transcript: key output**

```
$ python3 branches.py name --repo <repo> --kind verify --id S-001 --round 0 --profile http-api --part 0
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "verify", "branch": "sdlc/S-001-v0-http-api-0"}
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-4 (VS-4, R-009): Verify name with a missing or empty part exits 2 with one JSON error naming it

- **Given:** A scratch repo
- **When:** name --kind verify with each of --id, --round, --profile, --part left out; with empty --id and --profile; with a --repo that does not exist
- **Then:** Exit 2, one JSON line {ok:false,error} that names the part, no traceback, empty stderr, no tree change
- **Expected:** Error names id, round, profile, part
- **Actual:** "a verify branch name needs a non-empty <part>" for each part; "--repo ... is not a directory" for the missing dir
- **Result:** pass
- **Spec source:** R-009 (spec section 2: exit 2 with {"ok": false, "error"} on bad input)
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:115`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-4.txt`.

**transcript: key output**

```
without --round -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty round"}
without --part  -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty part"}
empty --profile -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty profile"}
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-5 (VS-4, R-009): Malformed --round and --part are refused or give an ASCII integer

- **Given:** A scratch repo
- **When:** name --kind verify with --round and --part set to 1.5, 0x1, empty, spaced, 1_0, +1, -1, 00, unicode digits, huge integers and the integer-forms corpus
- **Then:** Each run exits 2 with a JSON error that names the flag, or exits 0 with an ASCII integer in the tail; never a traceback, never stderr
- **Expected:** No crash; output is ASCII
- **Actual:** Non-integers are refused with exit 2; unicode digits and huge values are accepted and normalized to ASCII (see seeds)
- **Result:** pass
- **Spec source:** Spec section 2: exit 2 with {"ok": false, "error"} on bad input
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:136`

**transcript: accepted values**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-5.txt`.

**file-tree: tree diff**

```
Every run: tree unchanged (asserted).
```

## TC-cli-6 (VS-4, R-009): Hostile --profile and --id values never crash and never escape the format prefix

- **Given:** A scratch repo
- **When:** name --kind verify with --profile and --id taken from the traversal, control-chars, flag-like-values, unicode-whitespace, injection, format-strings, unicode-confusables and oversized corpus families
- **Then:** Exit 0 or 2, one JSON line, no stderr, no traceback, no tree change; any accepted name starts with sdlc/ and ends with -0
- **Expected:** No crash, no escape of the prefix
- **Actual:** All runs held the contract; some accepted names are not valid refs (see seed)
- **Result:** pass
- **Spec source:** Spec section 2: one JSON object per command; exit 2 on bad input
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:162`

**transcript: outcomes per corpus entry**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-6.txt`.

**file-tree: tree diff**

```
Every run: tree unchanged (asserted).
```

## TC-cli-7 (VS-5, R-010): Attempt name matches the spec example for plain, fix and split ids

- **Given:** A scratch repo
- **When:** name --kind attempt with --id S-001 --n 1; S-fix-M-1-2 --n 3; S-013a --n 0; S-001 --n 123456789; and extra --round/--profile/--part/--area flags
- **Then:** Exit 0, one JSON line, no stderr; branch is sdlc/<id>-attempt-<n>; n=0 is kept
- **Expected:** sdlc/S-001-attempt-1 etc.
- **Actual:** sdlc/S-001-attempt-1, sdlc/S-fix-M-1-2-attempt-3, sdlc/S-013a-attempt-0, sdlc/S-001-attempt-123456789, sdlc/S-001-attempt-2
- **Result:** pass
- **Spec source:** R-010 acceptance
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:184`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-7.txt`.

**transcript: key output**

```
$ python3 branches.py name --repo <repo> --kind attempt --id S-001 --n 1
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "attempt", "branch": "sdlc/S-001-attempt-1"}
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-8 (VS-6, R-010): Attempt name with a missing or malformed number exits 2 or gives an ASCII integer

- **Given:** A scratch repo
- **When:** name --kind attempt without --n, without --id, with empty --id, and with --n from abc, 1.0, empty, -1 and the integer-forms, unicode-digits and huge-integers corpus
- **Then:** Missing parts: exit 2 with one JSON error naming n or id; malformed n: exit 2 naming --n, or exit 0 with an ASCII integer; never a traceback
- **Expected:** Clean refusals
- **Actual:** without --n -> "a attempt branch name needs a non-empty n"; without --id -> "... non-empty id"; non-integers refused; unicode digits normalized
- **Result:** pass
- **Spec source:** Spec section 2: exit 2 with {"ok": false, "error"} on bad input
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:201`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-8.txt`.

**transcript: key output**

```
without --n  -> exit 2 {"ok": false, "error": "a attempt branch name needs a non-empty n"}
without --id -> exit 2 {"ok": false, "error": "a attempt branch name needs a non-empty id"}
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-9 (VS-7, R-009, R-010): Custom branch formats wrap verify and attempt tails, --format wins, a bad format exits 2

- **Given:** Repos with branchFormat feature/PROJ-1-{name:lower}, feature/PROJ-1-{name}, and an invalid config.json
- **When:** name --kind verify and --kind attempt with the config format, with --format x/{name}/y, Team/PROJ-1-{name:lower} and sdlc/{name}, and with six invalid formats
- **Then:** Config formats wrap the tail; the suffix stays after the tail; --format wins over config; invalid formats and invalid JSON exit 2 with no branch
- **Expected:** feature/PROJ-1-S-001-v0-http-api-0, feature/PROJ-1-S-001-attempt-1, feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1, x/S-001-attempt-1/y
- **Actual:** All as expected; every invalid format exits 2 with an error that names the format
- **Result:** pass
- **Spec source:** R-009 and R-010 (spec section 1: tail goes into the format)
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:228`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-9.txt`.

**transcript: key output**

```
config feature/PROJ-1-{name:lower} --kind verify -> {"ok": true, ..., "branch": "feature/PROJ-1-s-001-v0-http-api-0"}
config feature/PROJ-1-{name} --kind attempt -> "feature/PROJ-1-S-001-attempt-1"
--format x/{name}/y --kind verify -> "x/S-001-v0-http-api-0/y"
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-21 (VS-2, R-008): An explicit --ts flag is refused with one JSON error and no traceback

- **Given:** A scratch repo
- **When:** name --kind state --ts 20261008101500, --ts=..., and the abbreviation --t ...
- **Then:** Exit 2, one JSON error, no branch, no traceback, no tree change
- **Expected:** Clean refusal (the CLI has no --ts flag; the explicit ts is an API part)
- **Actual:** {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"} with exit 2 for each form
- **Result:** pass
- **Spec source:** Spec section 2: CLI synopsis has no --ts; exit 2 on bad input
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:267`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-21.txt`.

**transcript: key output**

```
$ python3 branches.py name --repo <repo> --kind state --ts 20261008101500
exit: 2
{"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
```

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-22 (VS-3, R-009, R-010): Name with no --kind or an unknown kind is refused; a non-git directory with a space and unicode works

- **Given:** A scratch repo and a plain directory "not a repo ü"
- **When:** name without --kind; name --kind verif; name --kind attempt and --kind verify with --repo and cwd set to the plain directory
- **Then:** The first two exit 2 with a JSON error; the last two exit 0 with the default names
- **Expected:** Clean refusals; sdlc/S-001-attempt-1 and sdlc/S-001-v0-http-api-0
- **Actual:** As expected
- **Result:** pass
- **Spec source:** Spec section 2: exit 2 on bad input; R-009 and R-010 acceptance
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:277`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-22.txt`.

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-23 (VS-5, R-009, R-010): Verify and attempt names are the same on every run, in CI and under another locale

- **Given:** A scratch repo
- **When:** name --kind verify --id S-005a --round 0 --profile cli --part 0 and --kind attempt --id S-005a --n 0, three times each: plain env, CI=true, LC_ALL=tr_TR.UTF-8, stdin empty
- **Then:** Exit 0 and the same stdout line on every run
- **Expected:** sdlc/S-005a-v0-cli-0 and sdlc/S-005a-attempt-0
- **Actual:** As expected
- **Result:** pass
- **Spec source:** R-009 and R-010 acceptance
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:294`

**transcript: transcript**

See `.sdlc/slices/S-005a/verification/r0/logs/cli-0-TC-cli-23.txt`.

**file-tree: tree diff of cwd and repo**

```
Every run: cwd and scratch repo trees unchanged, no refs added (see the transcript file).
```

## TC-cli-24 (VS-4, R-009): Ref safety of accepted verify names (seed probe, not in scope)

- **Given:** A scratch repo
- **When:** name --kind verify with --profile ../x, "a b", x~1, x@{1}, a:b, -v and --id S-001.lock/x; each accepted name goes to git check-ref-format --branch
- **Then:** Record whether name returns names that git refuses
- **Expected:** A record only; no requirement bounds part values
- **Actual:** Six of seven probes exit 0 with a name that git check-ref-format refuses, e.g. sdlc/S-001-v0-../x-0
- **Result:** pass
- **Spec source:** None (seed)
- **Test:** `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:310`

**transcript: probe results**

```
--profile="../x" exit 0 sdlc/S-001-v0-../x-0 check-ref-format=false
--profile="a b" exit 0 sdlc/S-001-v0-a b-0 check-ref-format=false
--profile="x~1" exit 0 sdlc/S-001-v0-x~1-0 check-ref-format=false
--profile="x@{1}" exit 0 sdlc/S-001-v0-x@{1}-0 check-ref-format=false
--profile="a:b" exit 0 sdlc/S-001-v0-a:b-0 check-ref-format=false
--id="S-001.lock/x" exit 0 sdlc/S-001.lock/x-v0-http-api-0 check-ref-format=false
--profile="-v" exit 0 sdlc/S-001-v0--v-0 check-ref-format=true
```

## Attacks

None. The security profile covers attacks.

## Seeds

- **name returns ref-unsafe verify and attempt names for hostile --profile and --id** (`skills/sdlc/branches.py`): --profile ../x gives sdlc/S-001-v0-../x-0 with exit 0. git check-ref-format refuses it. The same holds for spaces, ~, @{, : and .lock in an id. No requirement bounds the parts, so this is not a refutation.
- **Integer parts accept unicode digits, whitespace and huge values** (`skills/sdlc/branches.py`): --part ٣, --n １２, --round ' 3' and 9999... are accepted and normalized to ASCII. Two inputs give one branch name. Negative values give names such as sdlc/S-001-attempt--1.
- **Error text says 'a attempt branch name'** (`skills/sdlc/branches.py`): The missing-part error for the attempt kind reads 'a attempt branch name needs a non-empty n'. The article is wrong before a vowel.
