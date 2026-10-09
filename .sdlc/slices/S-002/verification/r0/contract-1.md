# Verification: S-002, contract profile, part 1

- Slice: S-002
- Profile: contract
- Round: 0
- Commit: 8138c9f
- Scenario: VS-7
- Verdict: verified. Every in-scope case passes.

Environment: macOS Darwin 25.6.0, Python 3.14.7, Node 24.19.0, git 2.50.1; branches.py loaded by path through testkit pycall.py with python3 -I.

## TC-contract-71: Surface: name and tail have the signatures the spec defines

- Given: branches.py at 8138c9f, loaded by its file path as a consumer loads it
- When: List every public function the module defines, with inspect.signature
- Then: name is (fmt, kind, **parts) and tail is (kind, **parts)
- Expected: name(fmt, kind, **parts) and tail(kind, **parts), as spec section 2 states
- Actual: name (fmt, kind, **parts); tail (kind, **parts); other exports listed in the evidence
- Result: pass
- Spec source: R-019 quote; spec section 2
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:43`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs --test-name-pattern surface`

type-check: surface listing

```
load_format (repo)
validate_format (fmt)
tail (kind, **parts)
split (fmt)
name (fmt, kind, **parts)
load_git_modes (path=<skill>/git-modes.json)
cmd_name (ns)  cmd_parse (ns)  cmd_list (ns)  cmd_preflight (ns)
build_parser ()  main (argv=None)
class Fail(Exception)
```

## TC-contract-72: A slice name without id, with an empty id or with id None raises Fail

- Given: The formats sdlc/{name} and feature/PROJ-1-{name:lower}
- When: Call name(fmt, "slice") with no id, with id="" and with id=None
- Then: Each call raises Fail, never another exception and never a return value, and prints nothing
- Expected: Fail for each of the 6 calls
- Actual: Fail for each of the 6 calls: a slice branch name needs a non-empty id
- Result: pass
- Spec source: spec section 2 tail: a missing part is a Fail; ADR-20261009-034220
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:51`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

log: outcomes

```
["sdlc/{name}","slice",{}] -> Fail a slice branch name needs a non-empty id
["sdlc/{name}","slice",{"id":""}] -> Fail a slice branch name needs a non-empty id
["sdlc/{name}","slice",{"id":null}] -> Fail a slice branch name needs a non-empty id
(same three for feature/PROJ-1-{name:lower})
```

## TC-contract-73: A kind outside the spec table raises Fail

- Given: The format sdlc/{name} and id S-001
- When: Call name with the kinds bogus, empty, SLICE, Slice, ' slice', 'slice ', 'slice\n', a Cyrillic look-alike of slice, S-001, slices, kind, None, 7, 0, True and 1.5
- Then: Each call raises Fail
- Expected: Fail for each of the 16 kinds
- Actual: Fail for each of the 16 kinds: no branch name is defined for kind <kind>
- Result: pass
- Spec source: ADR-20261009-034220: a kind not in the table raises Fail
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:70`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

log: full output

See `.sdlc/slices/S-002/verification/r0/logs/contract-1-run.txt`.

## TC-contract-74: Property: a slice name with a missing or empty id always raises Fail

- Given: A generated format with exactly one placeholder from arb.formatString, and parts with no usable id: {}, id empty, id None, ID, Id, n, area, and mixes
- When: Call name(fmt, "slice", **parts)
- Then: The outcome is Fail. The reference model from the spec: a missing part is a Fail
- Expected: 0 violations
- Actual: seed 20261009, 1000 runs, 0 violations; seed 777, 3000 runs, 0 violations
- Result: pass
- Spec source: spec section 2 tail: a missing part is a Fail
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:80`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

property-run: name-missing-id

```
property name-missing-id: seed=20261009 runs=1000 violations=0
property name-missing-id: seed=777 runs=3000 violations=0
no counterexample to shrink
```

## TC-contract-75: Property: a generated kind string outside the spec table always raises Fail

- Given: A generated kind string from pieces such as slice, run, e2e, verify, state, a Cyrillic letter, the dotted capital I, whitespace, NUL and a lone surrogate, not equal to any of the 8 spec kinds
- When: Call name(fmt, kind, **parts) with id S-001 or with missing parts
- Then: The outcome is Fail
- Expected: 0 violations
- Actual: seed 20261009, 1000 runs, 0 violations; seed 777, 3000 runs, 0 violations
- Result: pass
- Spec source: ADR-20261009-034220: a kind not in the table raises Fail
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:91`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

property-run: name-unknown-kind

```
property name-unknown-kind: seed=20261009 runs=1000 violations=0
property name-unknown-kind: seed=777 runs=3000 violations=0
no counterexample to shrink
```

## TC-contract-76: A non-string id is converted by str: the result is recorded

- Given: The format sdlc/{name} and the kind slice
- When: Call name with id 7, 0, -1, 1.5, False, True, [], ['S-1'], {}, a space, a tab, 'S 001', '..' and 'S-001.lock'
- Then: Record each result. The spec states no type or content rule for id, so only id=7 -> sdlc/7 is asserted
- Expected: id=7 gives sdlc/7
- Actual: 7 -> sdlc/7; 0 -> sdlc/0; False -> sdlc/False; [] -> sdlc/[]; {} -> sdlc/{}; ' ' -> 'sdlc/ '; '..' -> sdlc/..; every call returns, none raises Fail
- Result: pass
- Spec source: verification plan VS-7 notes: report the result
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:116`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

log: non-string ids

```
7 -> "sdlc/7"
0 -> "sdlc/0"
-1 -> "sdlc/-1"
1.5 -> "sdlc/1.5"
false -> "sdlc/False"
true -> "sdlc/True"
[] -> "sdlc/[]"
["S-1"] -> "sdlc/['S-1']"
{} -> "sdlc/{}"
" " -> "sdlc/ "
"\t" -> "sdlc/\t"
"S 001" -> "sdlc/S 001"
".." -> "sdlc/.."
"S-001.lock" -> "sdlc/S-001.lock"
```

## TC-contract-77: An unhashable kind gives TypeError, not Fail: the result is recorded

- Given: The format sdlc/{name} and id S-001
- When: Call name with the kinds [], ['slice'], {} and {slice: 1}
- Then: Record the outcome. The spec defines kind as one of the named kinds, so a list or a dict is a type misuse with no stated error
- Expected: no assertion; outcome recorded
- Actual: TypeError: cannot use 'list' as a dict key (unhashable type: 'list'); the same for dict
- Result: pass
- Spec source: none; recorded as a seed
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:110`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

log: unhashable kinds

```
[] -> exception TypeError cannot use 'list' as a dict key (unhashable type: 'list')
["slice"] -> exception TypeError cannot use 'list' as a dict key
{} -> exception TypeError cannot use 'dict' as a dict key (unhashable type: 'dict')
{"slice":1} -> exception TypeError cannot use 'dict' as a dict key
```

## TC-contract-78: The same missing-part call gives the same outcome every time

- Given: name("sdlc/{name}", "slice") with no id
- When: Call it three times in one process
- Then: The outcome, type and message are equal each time
- Expected: three equal Fail outcomes
- Actual: three equal Fail outcomes
- Result: pass
- Spec source: R-019 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs:124`
- Command: `VERIFY_WT=<verifier worktree at 8138c9f> TESTKIT_SEED=20261009 node --test .sdlc/slices/S-002/verification/r0/tests/contract-1/name-parts.verify-contract.test.mjs`

log: run summary

See `.sdlc/slices/S-002/verification/r0/logs/contract-1-run.txt`.

## Attacks

None. The contract profile ran no attack cases.

## Seeds

- name accepts a non-string id and stringifies it (`skills/sdlc/branches.py`): name("sdlc/{name}", "slice", id=False) gives sdlc/False, id=[] gives sdlc/[] and id={} gives sdlc/{}. tail checks only None and the empty string. A type check on parts, or a Fail for a non-str id, keeps such names out of git.
- name does not check the id text against git (`skills/sdlc/branches.py`): name gives sdlc/.., 'sdlc/ ' and sdlc/S-001.lock without Fail. validate_format checks only the sample id S-001. A caller that passes an operator id gets a name that git check-ref-format refuses later.
- an unhashable kind raises TypeError, not Fail (`skills/sdlc/branches.py`): tail uses TAILS.get(kind), so a list or a dict kind raises TypeError. Every other unknown kind raises Fail. An isinstance check on kind makes the Fail contract total.
- testkit: pycall cannot pass keyword arguments (`skills/sdlc/test/testkit/pycall.py`): callPython calls fn(*args) only. name and tail take **parts, so the verifier wrote a shim module with name_kw(fmt, kind, parts). A kwargs field in the pycall request removes the shim.
