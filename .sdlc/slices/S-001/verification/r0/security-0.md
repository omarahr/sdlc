# S-001 verification: security, part 0, round 0

- Slice: S-001
- Profile: security
- Round: 0
- Commit: de3dd5c
- Verdict: **refuted** (1 in-scope case failed: TC-security-20, scenario VS-9)
- Environment: macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0, git; local CLI only; testkit cli-runner, attack-corpus and property (pycall) from skills/sdlc/test/testkit at de3dd5c
- Test file: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`
- Command: `node --test .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

## Threat model

The spec states no threat model. Untrusted: the CLI argument values a caller passes, and the cwd and PYTHONPATH a script runs with. Trusted: the skill directory contents (git-modes.json) and the repo's .sdlc state, which only the loop writes. Attacks that need write access to a trusted location are out of scope and become seeds.

## Charters

- **VS-2**: Explore the argparse layer with unnamed, missing, prefixed, duplicate and flag-like arguments to find a run that exits other than 2 or prints other than one JSON object (R-014 quote, R-088 acceptance).
- **VS-3**: Explore --n, --round and --part with non-integer, unicode-digit and oversized values to find a non-integer that is accepted or a run with no JSON object (R-014 quote).
- **VS-4**: Explore --format on every command with structural, whitespace, control, injection and NUL payloads to find an invalid format that passes or a run that breaks the JSON contract (R-014 quote and acceptance).
- **VS-5**: Explore --kind, --mode, --repo and a broken git-modes.json to find a bad value that passes, an exit 1 or a traceback (R-014 quote, ADR-20261009-024048).
- **VS-9**: Explore module resolution with decoy branches.py files in the cwd, on PYTHONPATH and beside a symlink to find a run that imports a module other than the one in the script directory (R-098 quote and acceptance).

## TC-security-1 (VS-2): A flag that the command does not name is refused with no side effect

- Requirements: R-088, R-014
- Spec source: R-014 quote; R-088 acceptance
- Result: **pass**

**Given** A scratch git repo as --repo.

**When** Run parse --kind, list --branch, preflight --kind, name --branch, list --id, parse --mode, parse --n and preflight --area.

**Then** Each run exits 2 and prints only {ok:false,error}.

- Expected: Exit 2, one JSON error object, no usage text, no file change.
- Actual: All 8 runs exit 2 with one JSON error object. Stderr is empty. The repo and cwd trees do not change.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:66`
- Command: `node --test --test-name-pattern="VS-2 a flag that the command" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): unnamed flags — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs2.txt`

```
parse --repo R --branch sdlc/S-1 --kind slice
-> exit 2 {"ok": false, "error": "unrecognized arguments: --kind slice"}
```

Evidence (file-tree): tree diff — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs2.txt`

```
every watched tree: unchanged
```

## TC-security-2 (VS-2): A missing required flag, a missing or unknown command and an extra positional are refused

- Requirements: R-088, R-014
- Spec source: R-014 quote
- Result: **pass**

**Given** A scratch git repo.

**When** Run each command without its required flag, each without --repo, no arguments, 'bogus', a lone --repo, an extra positional, a trailing '--', and --repo with no value.

**Then** Each run exits 2 with one JSON error object.

- Expected: Exit 2, one JSON error, no file change.
- Actual: All 15 runs exit 2 with one JSON error object and no usage text.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:84`
- Command: `node --test --test-name-pattern="VS-2 a missing required flag" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): missing and unknown — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs2.txt`

```
parse --repo R
-> exit 2 {"ok": false, "error": "the following arguments are required: --branch"}
```

Evidence (file-tree): tree diff

```
every watched tree: unchanged
```

## TC-security-3 (VS-2): Flag-like values in a value slot never leak argparse usage text

- Requirements: R-014
- Spec source: R-014 quote
- Result: **pass**

**Given** The flag-like-values corpus (8 entries: --, -h, --help, --x=y, -1, -, --format, --repo=).

**When** Pass each value as --branch on parse and preflight and as --id on name.

**Then** Each run prints one JSON object with exit 0 or 2, except -h/--help which argparse treats as help.

- Expected: One JSON object; ok matches the exit code; no file change.
- Actual: Every run printed one JSON object or, for -h/--help, the argparse help (exit 0). No traceback.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:109`
- Command: `node --test --test-name-pattern="VS-2 flag-like values" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): flag-like corpus — `.sdlc/slices/S-001/verification/r0/logs/security-0-transcripts.txt`

## TC-security-4 (VS-2): Observe flag prefixes, duplicate flags, --flag=value and --help

- Requirements: R-088
- Spec source: none (record only; see seeds)
- Result: **pass**

**Given** A scratch git repo.

**When** Run parse with --r, --re, --rep for --repo and --f to --forma for --format; give --repo and --format twice (bad then good); use --flag=value; run -h and --help.

**Then** Record only: the spec names full flags only and does not define help.

- Expected: Recorded behavior.
- Actual: Every prefix is accepted (exit 0) and the prefix --form sets the format. A duplicate flag silently keeps the last value: --repo /nonexistent --repo R exits 0. --flag=value passes. -h and --help print usage text on stdout and exit 0.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:127`
- Command: `node --test --test-name-pattern="VS-2 observe" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): prefix and duplicate — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs2.txt`

```
--rep R -> exit 0
--form feature/{name} -> exit 0, format feature/{name}
--repo /nonexistent --repo R -> exit 0
-h -> exit 0, usage text on stdout
```

## TC-security-5 (VS-3): Non-integer values for --n, --round and --part are refused

- Requirements: R-014, R-088
- Spec source: R-014 quote
- Result: **pass**

**Given** name --repo R --kind slice.

**When** Pass two, 1.5, '', 0x1, 1e3, inf, nan, +-1, 0o7, 0b1, Arabic-Indic '1.5' and --1 to each integer flag; then the integer-forms corpus to --n.

**Then** Non-integers exit 2 with one JSON error; accepted values echo a number.

- Expected: Exit 2 for each non-integer; one JSON object always.
- Actual: All 36 non-integer runs exit 2 with one JSON error. The integer-forms corpus gives one JSON object each; accepted values echo a number.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:160`
- Command: `node --test --test-name-pattern="VS-3 non-integer" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): non-integers — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs3.txt`

```
name ... --n two
-> exit 2 {"ok": false, "error": "argument --n: invalid int value: 'two'"}
```

## TC-security-6 (VS-3): Observe unicode digits, padding, underscores, negatives and huge integers

- Requirements: R-014
- Spec source: none (record only; see seeds)
- Result: **pass**

**Given** name --repo R --kind slice.

**When** Pass the unicode-digits corpus, ' 3', '1_000', '-1', a 20-digit value and the huge-integers corpus to --n and --part.

**Then** Record only: the spec names no integer range.

- Expected: Recorded behavior.
- Actual: Exit 0 for Arabic-Indic, fullwidth, Devanagari, Bengali, NKo, math-bold and Thai digits, ' 3', '1_000', '-1', 20 digits and 4300 digits. Exit 2 for superscript, Roman and circled forms and for 4301 digits and more; the error then echoes the whole value (100035 chars for 100k digits).
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:179`
- Command: `node --test --test-name-pattern="VS-3 observe" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): integer forms — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs3.txt`

```
--n ٣ -> exit 0, n=3
--n ' 3' -> exit 0, n=3
--part -1 -> exit 0, part=-1
--n <100k digits> -> exit 2, error length 100035
```

## TC-security-7 (VS-4): Invalid formats are refused on every command with no side effect

- Requirements: R-014
- Spec source: R-014 quote and acceptance
- Result: **pass**

**Given** A scratch git repo.

**When** Run name, parse, list and preflight with 23 invalid formats: no placeholder, two placeholders, stray braces, {id}, {NAME}, {name:upper}, {{name}}, space, tab, LF, CR, VT, FF, U+001C, NEL, U+00A0, U+3000, U+2028 and the empty string.

**Then** Each run exits 2 with one JSON error; no file changes.

- Expected: Exit 2 and unchanged trees for all 92 runs.
- Actual: All 92 runs exit 2 with one JSON error object. The empty --format is refused, not replaced by the config value.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:224`
- Command: `node --test --test-name-pattern="VS-4 invalid formats" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): invalid formats — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs4.txt`

```
preflight ... --format "sdlc/{name}\u00a0"
-> exit 2 {"ok": false, "error": "the branch format 'sdlc/{name}\xa0' holds whitespace"}
```

Evidence (file-tree): tree diff

```
every watched tree: unchanged
```

## TC-security-8 (VS-4): Hostile corpus formats give one JSON object and the structural verdict

- Requirements: R-014
- Spec source: R-014 quote; ADR-20261009-024036 (structural checks only in S-001)
- Result: **pass**

**Given** The format-strings, injection, unicode-whitespace, unicode-confusables, control-chars, traversal and oversized families.

**When** Pass each value as --format to name and preflight.

**Then** Each run prints one JSON object; exit 0 exactly when the S-001 structural rules hold, else exit 2.

- Expected: Exit code equals the structural verdict; no file change.
- Actual: Every run matched the structural verdict. No traceback. Shell metacharacters ($(), backticks, ;, |) stay inert text. ESC, ZWSP, U+202E and Cyrillic letters pass the S-001 checks, as planned until S-002.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:234`
- Command: `node --test --test-name-pattern="VS-4 hostile corpus" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): corpus formats — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs4.txt`

## TC-security-9 (VS-4): A NUL byte in the config format gives one JSON object

- Requirements: R-014, R-016
- Spec source: R-014 quote
- Result: **pass**

**Given** A repo whose config.json branchFormat holds NUL (the nul corpus), since argv cannot carry NUL.

**When** Run all four commands without --format.

**Then** One JSON object, exit 0 or 2, no traceback.

- Expected: One JSON object each.
- Actual: All 16 runs printed one JSON object. A NUL inside sdlc/\u0000{name} passes the S-001 structural check; S-002 git check-ref-format owns it.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:253`
- Command: `node --test --test-name-pattern="VS-4 a NUL byte" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): nul config — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs4.txt`

## TC-security-10 (VS-4): Valid controls pass on every command

- Requirements: R-014
- Spec source: R-014 acceptance
- Result: **pass**

**Given** A scratch git repo.

**When** Run each command with sdlc/{name}, sdlc/{name:lower}, feature/{name}-x and feature/PROJ-1-{name}.

**Then** Exit 0 with ok true and the format echoed.

- Expected: Exit 0 for 16 runs.
- Actual: All 16 runs exit 0 with the given format and no file change.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:267`
- Command: `node --test --test-name-pattern="VS-4 valid controls" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): controls — `.sdlc/slices/S-001/verification/r0/logs/security-0-transcripts.txt`

## TC-security-11 (VS-4): validate_format raises Fail for hostile and non-string input

- Requirements: R-014
- Spec source: R-014 quote; ADR-20261009-024036
- Result: **pass**

**Given** branches.py loaded by path with python3 -I through pycall.

**When** Call validate_format with the 23 invalid formats, NUL, None, 123, a list, a dict, True and 1.5.

**Then** Fail for each, never another exception, no stdout.

- Expected: Fail.
- Actual: Every input raised Fail. The NUL format returned (structural check only).
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:278`
- Command: `node --test --test-name-pattern="validate_format raises Fail" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): pycall — `.sdlc/slices/S-001/verification/r0/logs/security-0-transcripts.txt`

```
29 calls: 28 Fail, 1 return (NUL), 0 other exceptions
```

## TC-security-12 (VS-5): Unknown kinds and modes are refused; every documented kind and mode passes

- Requirements: R-014
- Spec source: R-014 quote
- Result: **pass**

**Given** A scratch git repo.

**When** Run name and list with bogus, SLICE, '', 'slice ', ' slice', slic, 'slice\n', Cyrillic slіce, Slice and e2e_area; preflight with bogus, PR, '', 'pr ', fullwidth pr, Mr and 'stack\t'; then all 8 kinds and 4 modes.

**Then** Bad values exit 2; documented values exit 0.

- Expected: Exit 2 then exit 0.
- Actual: All 27 bad values exit 2 with one JSON error and no file change. All 8 kinds and all 4 modes exit 0.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:291`
- Command: `node --test --test-name-pattern="VS-5 unknown kinds" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): kinds and modes — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs5.txt`

```
name --kind "slice "
-> exit 2 {"ok": false, "error": "--kind 'slice ' is not one of run, slice, ..."}
```

## TC-security-13 (VS-5): A --repo that is not a directory is refused on every command

- Requirements: R-014
- Spec source: R-014 quote
- Result: **pass**

**Given** A regular file, a dangling symlink, a missing path, '', file/..x, file:///etc, ~/no-such-dir; then the traversal corpus on parse.

**When** Run each command with each path.

**Then** Exit 2 with one JSON error for non-directories; one JSON object for every traversal value.

- Expected: Exit 2 and no file change.
- Actual: All 28 non-directory runs exit 2. Traversal values that name a real directory (/etc, ../../..) exit 0, as the spec allows any directory; others exit 2.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:310`
- Command: `node --test --test-name-pattern="VS-5 a --repo that is not" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): repo paths — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs5.txt`

```
parse --repo /nonexistent-sdlc-verify ...
-> exit 2 {"ok": false, "error": "--repo '/nonexistent-sdlc-verify' is not a directory"}
```

## TC-security-14 (VS-5): A symlink to a directory and a path with .. pass

- Requirements: R-014
- Spec source: R-014 acceptance
- Result: **pass**

**Given** A symlink to the scratch repo and the path <parent>/../<repo>.

**When** Run every command with each path.

**Then** Exit 0.

- Expected: Exit 0, no file change.
- Actual: All 8 runs exit 0.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:335`
- Command: `node --test --test-name-pattern="VS-5 a symlink to a directory" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): repo symlink — `.sdlc/slices/S-001/verification/r0/logs/security-0-transcripts.txt`

## TC-security-15 (VS-5): A missing or malformed git-modes.json fails preflight with exit 2 and the other commands still run

- Requirements: R-014
- Spec source: R-014 quote; ADR-20261009-024048 (no exit 1)
- Result: **pass**

**Given** A copied skill directory with git-modes.json removed, invalid JSON, invalid UTF-8, {}, a top-level list, gitModes as a string, empty, [1] or null, or an empty file.

**When** Run preflight, then name, parse and list.

**Then** preflight exits 2 with one JSON error; the other commands exit 0.

- Expected: Exit 2 then exit 0.
- Actual: All 10 variants: preflight exits 2 with one JSON error and the other three commands exit 0.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:348`
- Command: `node --test --test-name-pattern="VS-5 a missing or malformed git-modes" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): git-modes variants — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs5.txt`

## TC-security-16 (VS-5): Observe git-modes.json and config.json shapes that only a trusted writer can make

- Requirements: R-014
- Spec source: none (out of scope; see seeds)
- Result: **pass**

**Given** A copied skill directory and scratch repos.

**When** Make git-modes.json a directory, unreadable (mode 000) or nested 200000 deep; make config.json nested 200000 deep or a FIFO.

**Then** Record only: these need write access to the skill directory or the repo state.

- Expected: Recorded behavior.
- Actual: git-modes.json as a directory, unreadable or deeply nested: preflight exits 1 with a Python traceback (IsADirectoryError, PermissionError, RecursionError). Deep config.json: every command exits 1 with RecursionError. config.json as a FIFO: the command blocks until killed.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:370`
- Command: `node --test --test-name-pattern="VS-5 observe" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): trusted-writer shapes — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs5-observe.txt`

```
gm-directory -> exit 1 IsADirectoryError
gm-unreadable -> exit 1 PermissionError
gm-deep-nesting -> exit 1 RecursionError
config-deep -> exit 1 RecursionError
config-fifo -> no exit, killed after 3 s
```

## TC-security-17 (VS-9): A decoy branches.py in the cwd or on PYTHONPATH never wins

- Requirements: R-098
- Spec source: R-098 quote and acceptance
- Result: **pass**

**Given** A decoy branches.py (exits 97) in the cwd and another on PYTHONPATH; a shadow decoy on PYTHONPATH with PYTHONSAFEPATH=1.

**When** Run each of next-action.py, state-write.py and janitor.py with --help by absolute path, by a path relative to the cwd, and with python3 -I.

**Then** Exit 0; no decoy import is recorded.

- Expected: Exit 0; decoy markers absent.
- Actual: All runs exit 0 and no decoy marker file exists.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:402`
- Command: `node --test --test-name-pattern="VS-9 a decoy branches.py in the cwd" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): decoy cwd and PYTHONPATH — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs9.txt`

Evidence (file-tree): decoy markers

```
decoyFired(cwd decoy) = null
decoyFired(PYTHONPATH decoy) = null
```

## TC-security-18 (VS-9): A script loaded by path through importlib from a decoy cwd binds the real module

- Requirements: R-098
- Spec source: R-098 acceptance
- Result: **pass**

**Given** A decoy branches.py in the cwd and on PYTHONPATH.

**When** python3 -c loads each script with spec_from_file_location and prints mod.branches.__file__.

**Then** The path is skills/sdlc/branches.py.

- Expected: Real module path; no decoy import.
- Actual: All three print skills/sdlc/branches.py; no decoy marker.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:428`
- Command: `node --test --test-name-pattern="VS-9 a script loaded by path" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): importlib — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs9.txt`

## TC-security-19 (VS-9): A script run through a symlink without a decoy still runs

- Requirements: R-098
- Spec source: R-098 acceptance
- Result: **pass**

**Given** A symlink to each script in a scratch directory.

**When** Run python3 <link> --help.

**Then** Exit 0.

- Expected: Exit 0.
- Actual: All three exit 0.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:444`
- Command: `node --test --test-name-pattern="VS-9 a script run through a symlink without" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): symlink clean — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs9.txt`

## TC-security-20 (VS-9): A script run through a symlink imports branches from the script directory, not the symlink directory

- Requirements: R-098
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Result: **fail**

**Given** A directory that holds a symlink to the script and a decoy branches.py (exits 97).

**When** Run python3 <dir>/next-action.py --help (and the same for state-write.py and janitor.py).

**Then** The script imports skills/sdlc/branches.py from its own directory and exits 0.

- Expected: Exit 0; no decoy import.
- Actual: All three scripts exit 97 and print 'DECOY branches IMPORTED'. Each script inserts os.path.dirname(os.path.abspath(__file__)); abspath keeps the symlink, so the symlink directory goes first on sys.path and its branches.py shadows the real module.
- Test: `.sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs:454`
- Command: `node --test --test-name-pattern="VS-9 a script run through a symlink imports" .sdlc/slices/S-001/verification/r0/tests/security-0/branches.verify-security.test.mjs`

Evidence (attack): symlink with decoy — `.sdlc/slices/S-001/verification/r0/logs/security-0-vs9.txt`

```
$ python3 <scratch>/link-decoy-646/next-action.py --help
exit: 97
--- stderr
DECOY branches IMPORTED
```

Evidence (file-tree): decoy marker

```
decoy marker lists <scratch>/link-decoy-<n>/branches.py for next-action.py, state-write.py and janitor.py
```

## Attacks

| id | charter | input | expected | observed | result |
|---|---|---|---|---|---|
| A-1 | VS-2 unnamed flags | parse --kind slice; list --branch x; preflight --kind slice; name --branch x; list --id S-1 | exit 2 JSON error | exit 2 JSON error, no tree change | held |
| A-2 | VS-2 missing/unknown command and flags | no args; bogus; missing --repo/--branch/--kind/--mode; extra positional; trailing -- | exit 2 JSON error | exit 2 JSON error | held |
| A-3 | VS-2 flag-like values | --branch -- / -1 / --x=y / --repo= | one JSON object | one JSON object; -h/--help gives help | held |
| A-4 | VS-2 flag prefixes | --rep R; --form feature/{name} | refuse (spec names full flags only) | accepted, exit 0; prefix sets the value | out-of-scope |
| A-5 | VS-2 duplicate flags | --repo /nonexistent --repo R | refuse or reject the bad value | last value wins silently, exit 0 | out-of-scope |
| A-6 | VS-2 help flags | -h; --help; parse -h | undefined by spec | usage text on stdout, exit 0 | out-of-scope |
| A-7 | VS-3 non-integers | two, 1.5, '', 0x1, 1e3, inf, nan, 0o7, 0b1 | exit 2 JSON error | exit 2 JSON error | held |
| A-8 | VS-3 unicode digits and odd integer forms | --n ٣, fullwidth digits, ' 3', 1_000, -1, 4300 digits | undefined by spec | accepted, exit 0 | out-of-scope |
| A-9 | VS-3 oversized integers | --n with 4301 to 100000 digits | exit 2 JSON error | exit 2; error echoes the whole value (up to 100035 chars) | held |
| A-10 | VS-4 structural format attacks | {name}{name}, stray braces, {id}, {NAME}, '', whitespace incl. NBSP, U+3000, U+2028, NEL, U+001C | exit 2 JSON error | exit 2 JSON error on all four commands | held |
| A-11 | VS-4 injection in --format | $(id){name}, `id`{name}, ;rm, \|, &&, >file, JSON-breaking quotes | no execution, one JSON object | inert text, one JSON object, no file change | held |
| A-12 | VS-4 confusables and invisible chars in --format | ZWSP, U+202E, ESC, Cyrillic S, fullwidth braces | refused by S-002 git check (R-017) where git refuses | pass S-001 structural check; git check-ref-format accepts ZWSP, U+202E and Cyrillic | out-of-scope |
| A-13 | VS-4 NUL in config format | branchFormat with NUL | one JSON object | one JSON object | held |
| A-14 | VS-4 non-string to validate_format | None, 123, list, dict, True, 1.5 | Fail | Fail | held |
| A-15 | VS-5 kind and mode confusables | SLICE, 'slice ', Cyrillic і, fullwidth pr, 'stack\t' | exit 2 JSON error | exit 2 JSON error | held |
| A-16 | VS-5 --repo non-directory and traversal | missing path, file, dangling link, '', file:///etc, ~/x, ../../.. | exit 2 for non-directories | exit 2 for non-directories; real directories accepted | held |
| A-17 | VS-5 broken git-modes.json | removed, invalid JSON, invalid UTF-8, wrong shapes, empty | preflight exit 2, others exit 0 | as expected | held |
| A-18 | VS-5 git-modes.json directory/unreadable/deep nesting | trusted-writer shapes of the skill file | JSON error | exit 1 with traceback | out-of-scope |
| A-19 | VS-5 config.json deep nesting and FIFO | repo state written by a hostile writer | JSON error | deep: exit 1 RecursionError; FIFO: blocks | out-of-scope |
| A-20 | VS-9 decoy in cwd and PYTHONPATH | branches.py decoy in cwd and on PYTHONPATH; relative path; -I | real module wins | real module wins | held |
| A-21 | VS-9 importlib from decoy cwd | spec_from_file_location from decoy cwd | real module bound | real module bound | held |
| A-22 | VS-9 decoy beside a symlink to the script | <dir>/next-action.py -> skills/sdlc/next-action.py, <dir>/branches.py decoy | real module wins | decoy wins, exit 97 on all three scripts | broke |

## Seeds

- **argparse accepts flag prefixes** (`skills/sdlc/branches.py`): build_parser keeps allow_abbrev=True. --rep, --r, --form and --f are accepted as --repo and --format. When a later slice adds a flag with a shared prefix, a short form changes meaning or turns ambiguous. Set allow_abbrev=False on the parser and the subparsers.
- **A duplicate flag keeps its last value silently** (`skills/sdlc/branches.py`): --repo /nonexistent --repo R exits 0, and --format bad --format sdlc/{name} exits 0. A caller that appends a flag can override an earlier one without notice.
- **--n, --round and --part accept unicode digits, padding, underscores and negatives** (`skills/sdlc/branches.py`): type=int accepts '٣', fullwidth digits, ' 3', '1_000', '-1' and up to 4300 digits. Later slices put these values in branch names (run-<n>, -v<round>-, -attempt-<n>). Use a strict ^[0-9]+$ check when name lands.
- **Refusal errors echo the whole hostile value** (`skills/sdlc/branches.py`): A 100000-digit --n gives a 100035-char error, and a 200000-char --format gives an error of the same size. Clip the echoed value. This is for verify-limits: the spec states no size limit.
- **-h and --help print argparse usage on stdout** (`skills/sdlc/branches.py`): Help exits 0 with plain text, not one JSON object. The spec does not define help; the plan accepts it. A caller that parses stdout as JSON breaks on it.
- **load_git_modes lets OSError and RecursionError escape** (`skills/sdlc/branches.py`): git-modes.json as a directory (IsADirectoryError), unreadable (PermissionError) or nested 200000 deep (RecursionError) makes preflight exit 1 with a traceback. load_git_modes catches only ValueError, KeyError and TypeError. A broken install then breaks the JSON contract. Catch OSError and RecursionError and raise Fail.
- **load_format lets RecursionError escape and blocks on a FIFO** (`skills/sdlc/branches.py`): A config.json nested 200000 deep makes every command exit 1 with RecursionError. A FIFO at .sdlc/config.json blocks the command forever. For verify-contract (VS-6) and verify-limits.
- **Invisible and confusable characters pass the format checks** (`skills/sdlc/branches.py`): ZWSP, U+202E (right-to-left override) and Cyrillic letters pass validate_format, and git check-ref-format accepts them too, so S-002 does not refuse them. A format such as 'sdlc/\u202e{name}' gives branch names that read differently from their bytes. The spec does not forbid them.
