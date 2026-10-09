# Verification: S-001, contract profile, part 0, round 1

- Slice: S-001
- Profile: contract
- Round: 1 (plan round 0)
- Commit: 4434d71
- Verdict: verified. 7 of 7 cases pass.

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0, git; module loaded by path with python3 -I from a scratch cwd; testkit property and cli-runner from skills/sdlc/test/testkit at 4434d71.

## Scope

Round 1 re-runs the round 0 failures TC-contract-6, TC-contract-7 and TC-contract-8. It then checks the code that the fix changed in `load_format` and `main`. TC-contract-12 to TC-contract-15 are new.

## TC-contract-6 (VS-6): load_format resolves each named config state, and a read error raises Fail

- Given: 15 scratch repos: branchFormat feature/{name}, key missing, empty string, file absent, no .sdlc, null, number, list, top-level list, top-level string, BOM, invalid JSON, directory, mode 000, 200000 nested [
- When: load_format(repo) is called in one python3 -I process through the testkit pycall.py
- Then: each state gives the config value, sdlc/{name}, or Fail; no other exception

- Expected: feature/{name} for the first state, sdlc/{name} for the 9 fallback states, Fail for the 5 error states
- Actual: 15 of 15 as expected. Deep nesting now raises Fail: '<path> is not valid JSON: RecursionError: ...'
- Result: pass
- Spec source: R-016 acceptance; R-014 quote; VS-6 note (a read error must raise Fail)
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:54`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-6 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

surface listing (file-tree):

```
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

named states (re-run of the round 0 failure) (property-run):

```
deep nesting -> outcome Fail, type Fail
message: <repo>/.sdlc/config.json is not valid JSON: RecursionError: maximum recursion depth exceeded ...
all other 14 rows unchanged from round 0
```

full run log (log):

See `.sdlc/slices/S-001/verification/r1/logs/contract-0-run.txt`.

## TC-contract-7 (VS-6): Property: load_format returns the config string, the default, or Fail, and never another exception

- Given: arb.configShape from the testkit: absent, no .sdlc, directory, valid and non-object JSON, invalid text, deep nesting, invalid UTF-8, symlinks, unreadable files
- When: load_format is called 1000 times with seed 20261009
- Then: no outcome is a raw exception; JSON shapes match the reference model written from R-016

- Expected: 0 violations
- Actual: 0 violations. Distribution: json:return 301, absent:return 66, no-sdlc-dir:return 71, bytes:Fail 69, dir:Fail 70, text:Fail 183, dangling-symlink:return 76, symlink-loop:Fail 72, text:return 27, unreadable:Fail 65
- Result: pass
- Spec source: R-016 acceptance; R-014 quote; VS-6 note
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:83`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-7 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

load_format property (property-run):

```
property load_format: seed=20261009 runs=1000 violations=0
round 0 had 34 RecursionError violations at the same seed
no shrinking (testkit has none); no counterexample
```

## TC-contract-8 (VS-7): A command without --format uses the config format, --format wins, and a bad config exits 2 with one JSON error

- Given: repos with config feature/{name}, feature/x, 'a {name}', truncated JSON, and 200000 nested [
- When: parse, list and name run through the testkit cli-runner with and without --format
- Then: the config value or the flag value is the format; a bad config without the flag exits 2 with one JSON error

- Expected: 11 of 11 rows as expected
- Actual: 11 of 11 pass. parse and name on the deeply nested config now exit 2 with one JSON line, ok false, and empty stderr. Malformed config plus a valid --format exits 0 (recorded, as in round 0)
- Result: pass
- Spec source: R-014 quote; R-016 acceptance
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:105`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-8 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

CLI rows (property-run):

```
parse config            0 feature/{name}
list config             0 feature/{name}
parse flag wins         0 sdlc/{name}
list flag wins          0 sdlc/{name}
invalid config          2 ok:false
invalid config + flag   0 sdlc/{name}
spaced config           2 ok:false
malformed config        2 ok:false
malformed config + flag 0 sdlc/{name}
deeply nested config    2 ok:false, 1 line, stderr ''
deeply nested, name     2 ok:false, 1 line, stderr ''
```

## TC-contract-12 (VS-6): load_format turns every parse and read error near the fix into Fail, and still reads valid nested JSON

- Given: 12 config texts: deep arrays, deep objects, deep mixed, deep under branchFormat, 100000 closed arrays, 400-deep valid nesting beside branchFormat, a 5000-digit integer, invalid UTF-8, an empty file, a NaN literal, a duplicate key, a non-ASCII format
- When: load_format(repo) is called through pycall.py
- Then: each error gives Fail with no stdout and no stderr; each valid JSON gives the model value

- Expected: Fail for the 4 unclosed deep texts, the huge integer, invalid UTF-8 and the empty file; sdlc/{name} for the closed top-level list; a/{name}, a/{name}, b/{name}, é/{name} for the rest
- Actual: 12 of 12 as expected. Messages name the cause: RecursionError, ValueError (int digits limit), UnicodeDecodeError, JSONDecodeError
- Result: pass
- Spec source: R-016 acceptance; R-014 quote; VS-6 note
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:139`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-12 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

fix-adjacent states (property-run):

```
deep arrays              Fail RecursionError
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
unicode format           return é/{name}
```

## TC-contract-13 (VS-7): main(argv) in-process returns 2 with one JSON error for each deep config, and the next call still works

- Given: a module loaded by path; repos with 200000 nested [, 100000 nested {"a":, and feature/{name}
- When: main() runs parse, name, list, preflight on the deep repos, then parse on the good repo and parse with --format on a deep repo, in one process
- Then: no exception escapes; each call prints one JSON line; later calls are not damaged by the earlier RecursionError

- Expected: rc 2 2 2 2 2 0 0; formats feature/{name} and sdlc/{name} for the last two; empty stderr
- Actual: rc 2 2 2 2 2 0 0; exc none; one line each; formats feature/{name}, sdlc/{name}; stderr ''
- Result: pass
- Spec source: R-014 quote; R-013 (main callable by an importer)
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:162`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-13 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

in-process calls (property-run):

```
parse     rc 2 ok false
name      rc 2 ok false
list      rc 2 ok false
preflight rc 2 ok false
parse     rc 2 ok false
parse     rc 0 ok true format feature/{name}
parse     rc 0 ok true format sdlc/{name} (--format given, config not read)
stderr: ''
```

## TC-contract-14 (VS-7): The CLI gives one JSON error with exit 2 for each deep config on all four commands

- Given: repos with 200000 nested [ and 100000 nested {"a":
- When: name, parse, list and preflight run through the testkit cli-runner without --format
- Then: exit 2, one JSON line, ok false, empty stderr, no file change

- Expected: 8 of 8 rows exit 2 with one JSON error
- Actual: 8 of 8 as expected; stderr empty; tree unchanged
- Result: pass
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:205`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-14 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

CLI rows (property-run):

```
arrays parse/name/list/preflight   2 ok:false 1 line stderr ''
objects parse/name/list/preflight  2 ok:false 1 line stderr ''
```

## TC-contract-15 (VS-6): load_format gives the same outcome for the same config across two processes

- Given: arb.configShape with seed 20261010
- When: two separate batches of 300 load_format calls run on identical materialized configs
- Then: each pair has the same outcome, value and type

- Expected: 0 differences, 0 violations
- Actual: 0 differences, 0 violations in either batch
- Result: pass
- Spec source: Contract profile determinism corner; R-016
- Test: `.sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs:223`
- Command: `VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern "TC-contract-15 " .sdlc/slices/S-001/verification/r1/tests/contract-0/branches.verify-contract.test.mjs`

determinism (property-run):

```
seed=20261010 runs=300 differences=0 violationsA=0 violationsB=0
```

## Attacks

None. The security profile covers hostile inputs.

## Seeds

- branches.py: load_format reports a NUL in the repo path as invalid JSON (`skills/sdlc/branches.py`): An in-process caller that passes a repo path with a NUL gets Fail with '<path> is not valid JSON: ValueError: embedded null byte'. The file is never read, so the message names the wrong cause. The CLI cannot receive a NUL in argv. Catch the path error before the JSON parse, or word the message by cause.
- branches.py: a config.json with an integer over 4300 digits is refused (`skills/sdlc/branches.py`): Valid JSON with a 5000-digit integer in any key makes load_format raise Fail (Python int digits limit, ValueError). The branchFormat key is valid, but the whole config is refused. This is an unlikely config; record it for the bar raiser.
