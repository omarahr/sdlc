# verify-contract report: S-009, round 0, part 0

- Slice: S-009
- Profile: contract
- Commit: d29cba7
- Verdict: verified. 9 cases pass, 0 fail.

- Environment: Node v24.19.0, Python 3 (python3 -I probe), testkit property.mjs and cli-runner.mjs, worktree of sdlc/S-009 at d29cba7

## Surface
```
const DEFAULT_FORMAT
class Fail
const GIT_MODES_PATH
const INTEGER_PARTS
class JsonArgumentParser
const KINDS
const NAME_PARTS
const PARSE_ROWS
const PLACEHOLDERS
const TAILS
def build_parser ()
def cmd_list (ns)
def cmd_name (ns)
def cmd_parse (ns)
def cmd_preflight (ns)
def load_format (repo)
def load_git_modes (path='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-009-v0-contract-0/skills/sdlc/git-modes.json')
def main (argv=None)
def name (fmt, kind, **parts)
def parse (fmt, branch, ids=None)
def split (fmt)
def tail (kind, **parts)
def validate_format (fmt)
{'kind': 'slice', 'tail': 'S-001', 'id': 'S-001', 'known': True}
ids after ['S-001']
```

## TC-contract-1 (VS-1): State needs exactly 14 digits; ts stays a string

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: state-20261008101500 gives kind state, ts string; 13 digits, 15 digits, empty, letter in digits, trailing letter give null; CLI agrees
- Actual: As expected; CLI parse gives kind state and ts string; CLI on 13 digits gives no kind
- Result: pass
- Spec source: R-106 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:53`

calls (transcript):
```
strictEqual(ts,'20261008101500'); 9 null tails; CLI parse exit 0
```

surface listing (type-check):
```
const DEFAULT_FORMAT
class Fail
const GIT_MODES_PATH
const INTEGER_PARTS
class JsonArgumentParser
const KINDS
const NAME_PARTS
const PARSE_ROWS
const PLACEHOLDERS
const TAILS
def build_parser ()
def cmd_list (ns)
def cmd_name (ns)
def cmd_parse (ns)
def cmd_preflight (ns)
def load_format (repo)
def load_git_modes (path='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-009-v0-contract-0/skills/sdlc/git-modes.json')
def main (argv=None)
def name (fmt, kind, **parts)
def parse (fmt, branch, ids=None)
def split (fmt)
def tail (kind, **parts)
def validate_format (fmt)
{'kind': 'slice', 'tail': 'S-001', 'id': 'S-001', 'known': True}
ids after ['S-001']
```

## TC-contract-2 (VS-2): Verify row splits id, round, profile, part

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: S-001-v0-http-api-0 and S-001-v12-cli-3 give integer round and part; profile a-b-c is kept; missing part, round or profile is not verify
- Actual: As expected
- Result: pass
- Spec source: R-107 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:66`

calls (transcript):
```
{kind:'verify',id:'S-001',round:0,profile:'http-api',part:0}; round 12 part 3 profile cli; profile 'a-b-c' part 4
```

## TC-contract-3 (VS-3): Verify wins over slice row, under four formats

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: S-001-v0-http-api-0 and S-fix-M-1-2-v1-cli-0 give kind verify under default, prefix, suffix and lower formats; id S-fix-M-1-2
- Actual: As expected
- Result: pass
- Spec source: R-107, R-109 quote and acceptance (first match wins, section 2 table order)
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:81`

formats (transcript):
```
sdlc/{name}, feature/PROJ-1-{name}, {name}-wip, sdlc/{name:lower}
```

## TC-contract-4 (VS-4): Attempt row gives id and integer n and wins over slice row

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: S-001-attempt-2 gives n 2, S-005b-attempt-10 gives n 10; missing, letter and trailing-hyphen numbers are not attempt
- Actual: As expected
- Result: pass
- Spec source: R-108 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:91`

calls (transcript):
```
{kind:'attempt',id:'S-001',n:2}; S-001-attempt- is kind slice
```

## TC-contract-5 (VS-5): Slice row keeps full id; foreign shapes give null

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: S-001, S-fix-M-1-2, S-005b give kind slice with full id; sdlc/S-, sdlc/X-001, sdlc/S-001/x, sdlc/s-001 give null; s-001 is slice under {name:lower}
- Actual: As expected
- Result: pass
- Spec source: R-109 acceptance
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:102`

calls (transcript):
```
CLI parse of sdlc/S-fix-M-1-2 gives slice, id S-fix-M-1-2
```

## TC-contract-6 (VS-6): Rows 5 to 8 give the model result under prefix and suffix formats

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: Seven tails under three formats equal the model; suffix does not leak into part or n; wrong prefix or suffix gives null
- Actual: As expected
- Result: pass
- Spec source: R-106 to R-109 quotes
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:114`

calls (transcript):
```
S-001-v0-http-api-0-wip part 0; S-001-attempt-2-wip n 2; bare S-001 under {name}-wip null
```

## TC-contract-7 (VS-7): Known flag follows the id on rows 6 to 8

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: ids [S-001]: slice, attempt, verify of S-001 known true; S-002 false; state null; {name:lower} returns ledger spelling S-001
- Actual: As expected
- Result: pass
- Spec source: Section 2 text on ids and known
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:126`

calls (transcript):
```
sdlc/s-001-v0-cli-0 under lower gives id S-001, known true
```

## TC-contract-8 (VS-2): Property: parse equals the spec model, never raises

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: For 3000 generated branches under four formats, parse returns the model result, or null where the model gives none
- Actual: 3000 runs, seed 7, 1253 non-null, 0 violations; 41 further seeds (100 to 140) and seeds 1 to 6 and 1208331620 also gave 0 violations
- Result: pass
- Spec source: R-106 to R-109 quotes
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:146`

property-run (property-run):
```
property: parse vs spec model; seed=7 runs=3000 nonNull=1253 violations=0; extra seeds 1-6, 100-140, 1208331620: runs=3000 each, violations=0
```

property log: `.sdlc/slices/S-009/verification/r0/logs/contract-0-property.txt`

## TC-contract-9 (VS-2): Hostile tails never raise; parse is deterministic and does not change ids

- Given: parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I)
- When: The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table
- Then: 5000-digit round, part, n and ts; control characters; NUL; lone surrogate; 100000-char tails return a value or null
- Actual: 15 hostile inputs all returned; repeated call equal; ids list unchanged
- Result: pass
- Spec source: VS-2 notes: parse must return a value or null
- Test: `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:198`

hostile results (transcript):
```
see logs/contract-0-hostile.txt (kinds listed per input)
```

hostile results: `.sdlc/slices/S-009/verification/r0/logs/contract-0-hostile.txt`

## Attacks
- Mutation: slice row moved before verify row: 6 of 10 tests fail (VS-2, VS-3, VS-4, VS-6, VS-7, property)
- Mutation: state row changed to \d+: VS-1 fails
- Mutation: attempt row changed to \d*: VS-4 and property fail
- Mutation: verify profile made greedy: no test fails; the mutant matches the same strings (equivalent mutant)

## Seeds
- Trailing newline accepted by rows 5 to 8: parse('sdlc/{name}','sdlc/S-001\n') gives kind slice, and the same for state, attempt and verify tails. Python `$` matches before a final newline. Same open item as S-007.
- Non-ASCII digits accepted by \d: sdlc/state-٢٠٢٦١٠٠٨١٠١٥٠٠ gives kind state; sdlc/S-001-attempt-٣ gives kind attempt; sdlc/S-001-v٠-cli-٠ gives kind verify. int() converts them, so n becomes 3.
- Attempt and verify rows accept any id text: Rows 6 and 7 use (.+) for id. sdlc/--flag-attempt-1 and a tail with a NUL or a lone surrogate before -attempt-1 give kind attempt with that text as id. Callers that pass id to a shell or git must treat it as untrusted.
- Huge digit runs give unbounded integers: A 5000-digit round, part or n parses to a Python int, because set_int_max_str_digits(0) removes the limit. Output JSON holds the full integer.
- Public names beyond the spec API: The module exports PARSE_ROWS and INTEGER_PARTS as public names. The spec lists neither.
- Shared run worktree was edited during verification: At the start of the round, the working copy of skills/sdlc/branches.py in the run worktree held an uncommitted change that removed parse. It was restored later. This agent tested a separate worktree on commit d29cba7. A parallel mutation check probably caused it.
- One property batch timed out once: One run of 3000 calls hit the 120 s spawn limit in the first attempt. Ten later runs of the same size took under 100 ms each, and 47 seeds gave no failure. The cause was probably machine load. The run is inconclusive, not a defect.
