# S-001 verification: contract, round 0, part 0

- Slice: S-001
- Profile: contract
- Round: 0
- Commit: de3dd5c
- Verdict: **refuted** (3 of 11 cases fail; scenarios VS-6 and VS-7)

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0, git; module loaded by path from a scratch cwd with python3 -I; testkit property and cli-runner from skills/sdlc/test/testkit at de3dd5c

## TC-contract-1: A consumer imports branches.py by path and finds Fail, load_format, validate_format and main

- Scenario: VS-8; requirements: R-013
- Given: skills/sdlc/branches.py at the slice commit; a scratch cwd; python3 -I (no PYTHONPATH, no site)
- When: The probe loads the module through importlib.util.spec_from_file_location and lists its public names and signatures with inspect
- Then: Fail subclasses Exception; load_format(repo), validate_format(fmt) and main(argv=None) are callable
- Expected: The spec §2 functions exist with the spec signatures; Fail is an Exception
- Actual: All present: load_format(repo), validate_format(fmt), main(argv=None); Fail MRO Fail -> Exception
- Result: **pass**
- Spec source: R-013 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:55`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-1 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

surface listing (file-tree):

```
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

## TC-contract-2: The import has no side effect and pulls only stdlib modules

- Scenario: VS-8; requirements: R-013
- Given: Spies on builtins.open and subprocess.Popen; a listing of the scratch cwd
- When: The probe imports branches.py by path, then parses its source with ast
- Then: No stdout or stderr output; no read of git-modes.json or config.json; no subprocess; no new file in cwd; every imported top-level name is in sys.stdlib_module_names
- Expected: No side effect; stdlib only
- Actual: stdout "", stderr "", opened [], subprocess [], cwd unchanged, imports [argparse, json, os, re, sys], nonStdlib []
- Result: **pass**
- Spec source: R-013 quote and acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:72`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-2 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

probe output (log):

```
{"stdout":"","stderr":"","opened":[],"subprocess":[],"cwdChanged":false,"imports":["argparse","json","os","re","sys"],"nonStdlib":[]}
```

## TC-contract-3: main(argv) in-process: every command with all its flags returns 0 and prints one JSON object; bad input returns 2

- Scenario: VS-1; requirements: R-088, R-014, R-013
- Given: A repo whose config holds feature/{name}
- When: The probe calls main() with: name with all eight optional flags; name in --flag=value form with only --repo and --kind; parse; list; preflight with --branch; parse without --branch; name --format ''; an unknown command; no command
- Then: Each call returns an int, does not raise SystemExit, and writes exactly one JSON object line to stdout
- Expected: rc 0 0 0 0 0 2 2 2 2; ok true on 0; ok false with a non-empty error on 2; format feature/{name} when --format is absent
- Actual: rc 0 0 0 0 0 2 2 2 2; one JSON line each; stderr empty; format feature/{name} for the two calls without --format
- Result: **pass**
- Spec source: R-088 acceptance, R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:115`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-3 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

main() results (excerpt) (transcript):

```
main(["name","--repo",R,"--kind","slice","--id","S-001","--n","2","--area","a","--round","1","--profile","cli","--part","0","--format","sdlc/{name}"]) -> 0
  {"ok": true, "command": "name", "format": "sdlc/{name}", "args": {..., "n": 2, "round": 1, "part": 0}}
main(["parse","--repo",R]) -> 2  {"ok": false, "error": "the following arguments are required: --branch"}
main(["name","--repo",R,"--kind","slice","--format",""]) -> 2  {"ok": false, "error": "the branch format '' must hold exactly one {name} or {name:lower}, found 0"}
main(["bogus"]) -> 2  {"ok": false, "error": "argument command: invalid choice: 'bogus' ..."}
main([]) -> 2  {"ok": false, "error": "the following arguments are required: command"}
```

full run (log): `.sdlc/slices/S-001/verification/r0/logs/contract-0-run.txt`

## TC-contract-4: validate_format raises Fail for each structural bad format and for non-strings, and returns each valid control

- Scenario: VS-4; requirements: R-014
- Given: The plan inputs: no placeholder, {name}{name}, {name}-{name:lower}, stray braces, {id}, {NAME}, {name:upper}, space, tab, LF, CR, U+00A0, U+3000, empty string, {{name}}; non-strings null, 5, a list, a dict, true
- When: The probe calls validate_format on each through the module loaded by path
- Then: Each bad input raises Fail and no other exception; sdlc/{name}, sdlc/{name:lower}, feature/{name}-x and {name} return unchanged
- Expected: Fail x24, return x4
- Actual: Fail x24, return x4 with the input value
- Result: **pass**
- Spec source: ADR-20261009-024036 (structural checks in S-001); spec §2 validate_format
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:158`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-4 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

per-input outcomes (log): `.sdlc/slices/S-001/verification/r0/logs/contract-0-run.txt`

## TC-contract-5: Property: validate_format agrees with a reference model built from the spec text

- Scenario: VS-4; requirements: R-014
- Given: arb.format (placeholders, braces, git-unsafe characters, unicode whitespace, control characters, NUL, lone surrogates, non-strings); a JS model: exactly one {name} or {name:lower}, no other brace, no Unicode White_Space character
- When: check() calls validate_format 3000 times through pycall.py
- Then: Model-invalid input gives Fail; model-valid input of plain characters returns the input; no other exception
- Expected: 0 violations
- Actual: 0 violations (1980 model-invalid, 1020 model-valid)
- Result: **pass**
- Spec source: ADR-20261009-024036; R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:170`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-5 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

validate_format vs model (property-run):

```
property validate_format: seed=20261009 runs=3000 violations=0 modelInvalid=1980 modelValid=1020
```

## TC-contract-6: load_format resolves each named config state, and a read error raises Fail

- Scenario: VS-6; requirements: R-016, R-014
- Given: 15 repos: feature/{name}; key missing; empty string; file absent; no .sdlc; null; number; list; top-level list; top-level string; UTF-8 BOM; invalid JSON; directory in place of config.json; unreadable file; a config of 200000 "[" characters
- When: The probe calls load_format(repo) through the module loaded by path
- Then: The first ten give feature/{name} or sdlc/{name}; the last five raise Fail
- Expected: Deep nesting raises Fail like the other unreadable configs
- Actual: 14 of 15 as expected. Deep nesting raises RecursionError, not Fail: load_format catches ValueError and OSError only, and RecursionError is neither
- Result: **fail**
- Spec source: R-014 quote ("Every command prints one JSON object; exit 2 ... on bad input"); verification plan VS-6 note (a read error must raise Fail, not a raw exception)
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:185`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-6 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

deep nesting row (log):

```
{"label": "deep nesting", "expected": "Fail", "outcome": "exception", "type": "RecursionError",
 "message": "Stack overflow (used 16352 kB) while decoding a JSON array from a unicode string"}
```

full run (log): `.sdlc/slices/S-001/verification/r0/logs/contract-0-run.txt`

## TC-contract-7: Property: load_format returns the config string, the default, or Fail, and never another exception

- Scenario: VS-6; requirements: R-016, R-014
- Given: arb.configShape: absent, no .sdlc, directory, JSON values, non-object JSON, invalid text, deep nesting, invalid UTF-8, symlinks, unreadable
- When: checkLoadFormat calls load_format 1000 times; the model gives the config value when it is a non-empty string in a JSON object, else sdlc/{name}
- Then: JSON shapes match the model; absent shapes give the default; no exception other than Fail
- Expected: 0 violations
- Actual: 34 violations, all RecursionError from deeply nested "[" text; every JSON shape matches the model
- Result: **fail**
- Spec source: R-014 quote; R-016 acceptance; VS-6 note
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:214`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-7 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

load_format property (property-run):

```
property load_format: seed=20261009 runs=1000 violations=34
outcomes: json:return 301, absent:return 66, no-sdlc-dir:return 71, dangling-symlink:return 76, text:return 27,
  bytes:Fail 69, dir:Fail 70, text:Fail 149, symlink-loop:Fail 72, unreadable:Fail 65, text:exception 34
first counterexample: config.json = "[" repeated (1000..200000) -> RecursionError: Stack overflow while decoding a JSON array
replay: TESTKIT_SEED=20261009
```

## TC-contract-8: A command without --format uses the config format, --format wins, and a bad config exits 2 with one JSON error

- Scenario: VS-7; requirements: R-016, R-014
- Given: Repos with config feature/{name}, feature/x, "a {name}", truncated JSON, and 200000 "[" characters
- When: The cli-runner runs parse, list and name from a scratch cwd, with and without --format
- Then: Config format is used without the flag; the flag wins; every bad config without the flag exits 2 with one JSON error object
- Expected: All rows exit 0 or 2 with exactly one JSON object
- Actual: 9 of 11 rows pass. parse and name on the deeply nested config exit 1 with no stdout and a RecursionError traceback on stderr. Malformed config with a valid --format exits 0 (recorded: the flag skips load_format)
- Result: **fail**
- Spec source: R-014 quote ("Every command prints one JSON object; exit 2 with {ok: false, error} on bad input")
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:236`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-8 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

deeply nested config (transcript):

```
$ python3 skills/sdlc/branches.py parse --repo <repo> --branch x
  (.sdlc/config.json holds '[' * 200000)
exit 1, stdout: <empty>
stderr (last line): RecursionError: Stack overflow (used 16352 kB) while decoding a JSON array from a unicode string
$ python3 skills/sdlc/branches.py name --repo <repo> --kind slice
exit 1, stdout: <empty>, same RecursionError traceback
```

all rows (log): `.sdlc/slices/S-001/verification/r0/logs/contract-0-run.txt`

## TC-contract-9: Each script loaded by path binds mod.branches to the real branches.py, past a decoy in cwd and on PYTHONPATH

- Scenario: VS-9; requirements: R-098
- Given: A scratch cwd that holds a decoy branches.py; a second decoy directory on PYTHONPATH (non-isolated python3)
- When: The probe loads next-action.py, state-write.py and janitor.py through importlib from that cwd
- Then: mod.branches.__file__ resolves to skills/sdlc/branches.py; no decoy import is recorded
- Expected: The real module for all three scripts in both runs
- Actual: All six bindings name skills/sdlc/branches.py; neither decoy fired
- Result: **pass**
- Spec source: R-098 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:270`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-9 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

bindings (log):

```
{"next-action.py": ".../skills/sdlc/branches.py", "state-write.py": ".../skills/sdlc/branches.py", "janitor.py": ".../skills/sdlc/branches.py"} (x2 runs)
decoyFired(cwd decoy) = null, decoyFired(PYTHONPATH decoy) = null
```

## TC-contract-10: Each script runs --help through a symlink in another directory and through a relative path

- Scenario: VS-9; requirements: R-098
- Given: A symlink to each script in a scratch directory; a relative path ../<script> from skills/sdlc/test
- When: python3 <path> --help runs from a scratch cwd
- Then: Exit 0 in both forms
- Expected: exit 0
- Actual: link 0 and relative 0 for all three scripts. Recorded: with a decoy branches.py beside the symlink, the decoy is imported and exits 97 (see seeds)
- Result: **pass**
- Spec source: R-098 acceptance; R-013 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:310`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-10 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

per-script status (log):

```
next-action.py  link 0  relative 0  linkBesideDecoy 97 (decoy fired)
state-write.py  link 0  relative 0  linkBesideDecoy 97 (decoy fired)
janitor.py      link 0  relative 0  linkBesideDecoy 97 (decoy fired)
```

## TC-contract-11: validate_format gives the same outcome for the same input across two processes

- Scenario: VS-4; requirements: R-014
- Given: 1000 generated format strings (seed 20261009)
- When: Two separate pycall batches call validate_format on the same inputs
- Then: Outcomes, values and messages are equal
- Expected: 0 differences
- Actual: 0 differences
- Result: **pass**
- Spec source: Contract profile determinism corner; R-014
- Test: `.sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:327`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001> node --test --test-name-pattern "TC-contract-11 " .sdlc/slices/S-001/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`

determinism (property-run):

```
determinism validate_format seed=20261009 runs=1000 diffs=0
```

## Attacks

None. The security profile owns the hostile inputs.

## Seeds

- **branches.py: a decoy branches.py beside a symlinked script wins the import** (`skills/sdlc/next-action.py`): The three scripts insert os.path.dirname(os.path.abspath(__file__)) into sys.path. abspath does not resolve symlinks, so when a script runs through a symlink, the symlink directory comes first. A branches.py in that directory is imported instead of the real one (decoy exit 97 for all three scripts). Use os.path.realpath(__file__) to bind to the real skill directory. The spec does not say which directory "the script directory" is for a symlink, so this is a seed.

- **branches.py: main(["-h"]) raises SystemExit instead of returning** (`skills/sdlc/branches.py`): main(["-h"]) and main(["parse","--help"]) print argparse usage text and raise SystemExit(0). The spec does not define -h; a caller that imports main() and expects an int return gets an exception, and the CLI stdout is not a JSON object.

- **branches.py: load_format drops a non-string branchFormat, but spec §4 uses config.get("branchFormat") or default** (`skills/sdlc/branches.py`): load_format returns sdlc/{name} for a truthy non-string branchFormat such as 5 or ["a/{name}"]. Spec §4 describes next-action semantics as config.get("branchFormat") or "sdlc/{name}", which would return 5 and then fail validation. The two readings diverge when later slices thread fmt through next-action.py.

- **branches.py: validate_format accepts NUL and control characters in S-001** (`skills/sdlc/branches.py`): validate_format("sdlc/{name}\x00") and validate_format("a\x01/{name}") return the input. ADR-20261009-024036 assigns git check-ref-format to S-002 (R-017), so S-002 must refuse these.

- **branches.py: a valid --format succeeds although the config is malformed** (`skills/sdlc/branches.py`): parse --format sdlc/{name} exits 0 when .sdlc/config.json is truncated JSON, because the flag skips load_format. The plan asked only to record this. Preflight may want to report a malformed config even when the flag is given.
