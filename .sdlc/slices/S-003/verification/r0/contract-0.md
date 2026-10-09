# Verification: S-003, profile contract, part 0, round 0

- Commit: `13b17f1`
- Verdict: verified. 17 cases ran, and 17 passed.
- Environment: macOS (Darwin 25.6), Python 3.14.7, Node v24.19.0; branches.py imported by path from a scratch cwd with python3 -I; worktree sdlc/S-003-v0-contract-0 at 13b17f1
- Command: `TESTKIT_SEED=20261009 node --test --test-reporter=spec .sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-003/verification/r0/logs/contract-0-run.txt`

## Surface

```
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

## TC-contract-1 (VS-1, R-018): tail("slice", id="S-001") returns the str "S-001"

- Given: branches.py imported by path from a scratch cwd
- When: tail("slice", id="S-001")
- Then: the value is "S-001" and its type is str
- Expected: return "S-001", type str
- Actual: return "S-001", type str
- Result: pass
- Spec source: R-018 acceptance
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:81`

example:

```
tail('slice', id='S-001') -> {'outcome': 'return', 'value': 'S-001', 'type': 'str'}
```

## TC-contract-2 (VS-1, R-018): A slice tail with a missing, empty or None id raises Fail

- Given: the slice kind requires id
- When: tail('slice'), tail('slice', id=''), tail('slice', id=None), tail('slice', area='api')
- Then: each call raises branches.Fail and the message names id
- Expected: Fail naming id; no KeyError or TypeError
- Actual: Fail: a slice branch name needs a non-empty id (all four calls)
- Result: pass
- Spec source: R-018 quote: A missing part is a Fail
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:86`

missing id:

```
4 calls -> outcome Fail, type Fail, message 'a slice branch name needs a non-empty id'
mutation check: with the empty-string test removed from tail(), this case fails
```

## TC-contract-3 (VS-1, R-018): Property: the slice tail equals the id and extra parts do not change it

- Given: 1000 generated non-empty ids (unicode, braces, format strings, 300-char ids) with random extra parts n, round, part, profile, ts, unknown
- When: tail('slice', id=<id>, **extra)
- Then: the result is exactly the id as a str
- Expected: tail == id for every input
- Actual: 0 violations in 1000 runs
- Result: pass
- Spec source: R-018 quote; spec section 1 table (slice tail is <sliceId>)
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:94`

property tail slice:

```
property tail slice: seed=20261009 runs=1000 violations=0
reference model written from the spec text; no shrinking in the toolkit; no counterexample
```

## TC-contract-4 (VS-2, R-018): The state tail without ts is the current UTC time, also under extreme time zones

- Given: TZ=Pacific/Kiritimati (UTC+14) and TZ=Etc/GMT+12 (UTC-12); the probe confirms local time differs from UTC
- When: tail('state'), tail('state', ts=''), tail('state', ts=None)
- Then: each value matches ^state-\d{14}$, its digits lie between UTC before and after the call, and they form a valid date
- Expected: UTC stamp in %Y%m%d%H%M%S
- Actual: UTC stamp within the bracket for both zones, valid date
- Result: pass
- Spec source: R-018 quote; spec section 1 table (state-<UTC timestamp, %Y%m%d%H%M%S>)
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:102`

TZ bracket:

```
TZ=Pacific/Kiritimati: local != UTC by hours; 3 calls in [before, after] UTC
TZ=Etc/GMT+12: same
mutation check: datetime.now() without timezone.utc fails this case
```

## TC-contract-5 (VS-2, R-018): The state tail keeps a given ts

- Given: ts='20261008101500'
- When: tail('state', ts='20261008101500') and the same call with id='S-001', n=0
- Then: both return 'state-20261008101500'
- Expected: state-20261008101500
- Actual: state-20261008101500 (both calls)
- Result: pass
- Spec source: spec section 1 table, sample sdlc/state-20261008101500
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:118`

example:

```
tail('state', ts='20261008101500') -> 'state-20261008101500'
```

## TC-contract-6 (VS-2, R-018): Property: the state tail keeps a given ts and stamps UTC when ts is absent, empty or None

- Given: 1000 inputs under TZ=Pacific/Kiritimati: half a non-empty ts, half absent, '' or None
- When: tail('state', **k)
- Then: a given ts gives state-<ts>; otherwise 14 UTC digits within the call bracket and a valid date
- Expected: model holds for every input
- Actual: 0 violations in 1000 runs
- Result: pass
- Spec source: R-018 quote: state without ts generates the timestamp
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:123`

property tail state:

```
property tail state: seed=20261010 runs=1000 violations=0
reference model written from the spec text; no shrinking in the toolkit; no counterexample
```

## TC-contract-7 (VS-3, R-018): The e2e-area tail joins milestone and area in any keyword order

- Given: id='M-1', area='api'
- When: tail('e2e-area', id='M-1', area='api') and tail('e2e-area', area='api', id='M-1')
- Then: both return 'M-1-e2e-api'
- Expected: M-1-e2e-api
- Actual: M-1-e2e-api (both orders)
- Result: pass
- Spec source: spec section 1 table, sample sdlc/M-1-e2e-api
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:138`

example:

```
tail('e2e-area', id='M-1', area='api') -> 'M-1-e2e-api'
tail('e2e-area', area='api', id='M-1') -> 'M-1-e2e-api'
```

## TC-contract-8 (VS-3, R-018): An e2e-area tail with a missing part raises the module Fail that names the part

- Given: id or area absent, '' or None, and both missing
- When: tail('e2e-area', ...) for 8 combinations
- Then: each raises branches.Fail (type Fail, mro Fail > Exception) and the message names the missing part, the text 'e2e-area' excluded
- Expected: Fail naming area or id
- Actual: Fail 'a e2e-area branch name needs a non-empty area' / '... id'; both missing names id
- Result: pass
- Spec source: R-018 acceptance: tail('e2e-area', id='M-1') raises Fail because area is missing
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:143`

missing parts:

```
Fail.__mro__ = Fail, Exception, BaseException, object (no built-in error base)
8/8 calls -> Fail naming the missing part
mutation check: dropping the empty-string test fails this case
```

## TC-contract-9 (VS-3, R-018): Property: the e2e-area tail matches the reference model

- Given: 1000 inputs; each of id and area is a generated string (70%) or absent, '' or None; random numeric extras
- When: tail('e2e-area', **k)
- Then: both present gives <id>-e2e-<area>; one missing gives Fail naming it; both missing gives Fail naming one
- Expected: model holds
- Actual: 0 violations in 1000 runs
- Result: pass
- Spec source: R-018 quote and acceptance
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:163`

property tail e2e-area:

```
property tail e2e-area: seed=20261011 runs=1000 violations=0
reference model written from the spec text; no shrinking in the toolkit; no counterexample
```

## TC-contract-10 (VS-10, R-018, R-099): Zero-valued numeric parts are accepted and do not change the tail

- Given: n=0, round=0, part=0 passed beside the required parts; and id=0
- When: tail for slice, e2e-area and state with the zero parts; tail('slice', id=0)
- Then: no Fail; tails are S-001, M-1-e2e-api, state-20261008101500 and '0'
- Expected: zero kept as a value, not treated as absent
- Actual: S-001, M-1-e2e-api, state-20261008101500, '0'
- Result: pass
- Spec source: R-018 quote: only a missing part is a Fail
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:184`

zero parts:

```
tail('slice', id='S-001', n=0, round=0, part=0) -> 'S-001'
tail('slice', id=0) -> '0' (0 is not treated as missing)
```

## TC-contract-11 (VS-1, R-018): tail is deterministic for the same input

- Given: slice, e2e-area and state (with ts) inputs
- When: each call made three times in one process
- Then: the three results are equal
- Expected: equal results
- Actual: equal results
- Result: pass
- Spec source: R-018 quote (the tail from the table)
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:195`

determinism:

```
3 x [S-001, M-1-e2e-ui, state-20261008101500] identical
```

## TC-contract-12 (VS-8, R-015, R-002): load_format returns the config value or the default

- Given: configs: feature/PROJ-1-{name}; no config; no key; '' ; null; 5; list; object; a JSON array; a JSON string; sdlc/{name}; no .sdlc directory
- When: load_format(repo)
- Then: a non-empty string value is returned; every other shape gives sdlc/{name}
- Expected: per spec section 2 load_format
- Actual: all 12 repos as expected
- Result: pass
- Spec source: R-002 acceptance clause 1; spec section 2 load_format
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:211`

config shapes:

```
{'branchFormat':'feature/PROJ-1-{name}'} -> feature/PROJ-1-{name}
absent / no key / '' / null / 5 / [..] / {..} / [] / "sdlc/{name}" / no .sdlc -> sdlc/{name}
```

## TC-contract-13 (VS-5, R-015): load_format raises Fail for invalid JSON, deep nesting and an unreadable file

- Given: config text '{', 200000 '[' characters, 50000 nested objects, a chmod 000 file
- When: load_format(repo)
- Then: each raises branches.Fail, never RecursionError or PermissionError
- Expected: Fail
- Actual: Fail for all four
- Result: pass
- Spec source: spec section 2: exit 2 with {ok: false} on bad input; VS-5 notes
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:231`

bad configs:

```
4/4 -> outcome Fail
```

## TC-contract-14 (VS-5, R-015): name follows the resolved format and {name:lower} lowercases the tail

- Given: formats sdlc/{name}, feature/PROJ-1-{name}, feature/{name:lower}
- When: name(fmt, kind, **parts)
- Then: sdlc/S-001, feature/PROJ-1-S-001, feature/s-001, feature/m-1-e2e-api, sdlc/state-20261008101500
- Expected: as listed
- Actual: as listed
- Result: pass
- Spec source: R-015 acceptance; spec section 1 ({name:lower} lowercases the tail)
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:239`

examples:

```
name('feature/PROJ-1-{name}','slice',id='S-001') -> feature/PROJ-1-S-001
name('feature/{name:lower}','slice',id='S-001') -> feature/s-001
```

## TC-contract-15 (VS-5, R-015, R-018): Property: name is prefix + tail + suffix, lowercased for {name:lower}

- Given: 1000 formats from literal prefixes and suffixes around one placeholder; slice, e2e-area and state parts
- When: name(fmt, kind, **parts)
- Then: the result equals the model built from the spec text
- Expected: model holds
- Actual: 0 violations in 1000 runs
- Result: pass
- Spec source: spec section 2 name(fmt, kind, **parts)
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:250`

property name:

```
property name: seed=20261012 runs=1000 violations=0
reference model written from the spec text; no shrinking in the toolkit; no counterexample
```

## TC-contract-16 (VS-8, R-002, R-015): Property: load_format over arb.configShape matches the spec model

- Given: 1000 config shapes from arb.configShape: absent, directory, valid and non-object JSON, invalid text, deep nesting, invalid UTF-8, symlinks, unreadable
- When: load_format(repo)
- Then: a non-empty string branchFormat of an object is returned; other valid shapes give the default; unreadable or invalid input gives Fail; no other exception
- Expected: model holds
- Actual: 0 violations in 1000 runs; Python accepts the non-standard texts NaN and Infinity and gives the default
- Result: pass
- Spec source: R-002 acceptance clause 1; spec section 2 load_format
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:288`

property load_format:

```
property load_format: seed=20261013 runs=1000 violations=0
lenient non-strict JSON accepted as default: ["NaN","Infinity"]
reference model written from the spec text; no shrinking in the toolkit; no counterexample
```

## TC-contract-17 (VS-5, R-015): The CLI name format field agrees with load_format on each config shape

- Given: 200 config shapes from arb.configShape, no --format
- When: branches.py name --repo <r> --kind slice --id S-001, and load_format(r) plus validate_format in the API
- Then: a valid resolved format gives exit 0 and the same format field; otherwise exit 2 with one JSON error; never a traceback
- Expected: CLI and API agree
- Actual: 0 violations in 200 runs
- Result: pass
- Spec source: R-015 quote; spec section 2 (every command prints one JSON object)
- Test: `.sdlc/slices/S-003/verification/r0/tests/contract-0/tail.verify-contract.test.mjs:307`

property cli-name-vs-load_format:

```
property cli-name-vs-load_format: seed=20261014 runs=200 violations=0
reference model written from the spec text; no shrinking in the toolkit; no counterexample
```

## Attacks

None. The contract profile ran no attacks.

## Seeds

- branches.py exposes helpers the spec does not name (`skills/sdlc/branches.py`): The module exposes cmd_name, cmd_parse, cmd_list, cmd_preflight, build_parser, JsonArgumentParser, NAME_PARTS, TAILS and the imported datetime and timezone as public names. The spec API names load_format, validate_format, tail, name, split, parse, list_kind, read_rules, evaluate and derive. Prefix the helpers with an underscore, or declare __all__, so importers do not depend on them.
- load_format accepts the non-standard JSON values NaN and Infinity (`skills/sdlc/branches.py`): A config.json whose text is NaN or Infinity, or {"branchFormat": NaN}, gives the default and not a Fail. Python json accepts these tokens. A config file with a UTF-8 BOM gives a Fail. No requirement covers these shapes.
- testkit: callPython has no keyword arguments and no TZ control (`skills/sdlc/test/testkit/property.mjs`): callPython in property.mjs passes positional arguments only and fixes the environment. tail and name take keyword parts, and the state tail check needs TZ. The contract tests use a small local consumer helper. Add kwargs and env options to callPython.
- tail accepts a non-string part and a non-digit ts (`skills/sdlc/branches.py`): tail('slice', id=0) returns '0', and tail('state', ts='abc') returns 'state-abc'. parse() in a later slice reads state tails with ^state-(\d{14})$, so a non-digit ts gives a branch that parse does not classify. No S-003 requirement covers it.
