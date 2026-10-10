# Contract verification, S-033, round 0

Profile: contract. Commit: 94e98a7. Verdict: pass (7 cases, 0 failures, 4 seeds).

Environment: Node test runner, python3 -I via pycall, git fast-import scratch repos; no network.

Surface: state-write.py: branch_run(repo, branch, fmt) -> str; Fail. janitor.py: CLI --repo --days. branches.py: load_format(repo), split(fmt), parse(fmt, branch, ids=None).

## TC-contract-1 (VS-2): branch_run returns a stored name only for kind run, under custom and default format

- Given: a repo with branches holding runBranch values feature/PROJ-1-run-1, sdlc/run-1, main, release/x, empty, 5, null, list, object, true, missing key, invalid JSON, [] and null
- When: branch_run(repo, branch, fmt) under feature/PROJ-1-{name} and sdlc/{name}, and for a missing branch
- Then: the matching run name comes back; every other value gives the empty string; no exception
- Actual: 14 values x 2 formats all matched
- Result: pass
- Spec source: R-138 acceptance
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:73

```
examples test passed; see log
```

## TC-contract-2 (VS-2): Property: branch_run equals a reference model written from the spec

- Given: 1500 generated (format, stored runBranch) pairs, committed as 1500 branches; model: starts with prefix, ends with suffix, middle is run-<ascii digits>
- When: branch_run for each pair
- Then: the stored value when the model accepts, else the empty string
- Actual: 0 violations in 1500 runs
- Result: pass
- Spec source: R-138 acceptance
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:96

```
property branch_run: seed=2767008703 runs=1500 violations=0
```

## TC-contract-3 (VS-2): Property: malformed or non-string format gives Fail or a string

- Given: 1000 formats from arb.format (braces, git-unsafe characters, unicode whitespace, NUL, lone surrogates, non-strings)
- When: branch_run(repo, branch, fmt)
- Then: outcome is Fail or a string, never another exception
- Actual: 0 violations in 1000 runs
- Result: pass
- Spec source: R-138 acceptance; plan note VS-2
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:120

```
property branch_run malformed fmt: seed=3593848531 runs=1000 violations=0
```

## TC-contract-4 (VS-2): Hostile committed config text does not raise for object-shaped or broken JSON

- Given: committed config text: empty, truncated, BOM, concatenated objects, NaN, 100000 open brackets, deep nesting, duplicate keys, lone surrogate
- When: branch_run under the default format
- Then: Fail or a string
- Actual: all returned the empty string; a JSON string, number or true at top level raised AttributeError (seed 1)
- Result: pass
- Spec source: plan note VS-2 only, not a spec source
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:109

```
non-object config probe: 8:exception:AttributeError 9:exception:AttributeError 10:exception:AttributeError
```

## TC-contract-5 (VS-7): janitor.py calls branches.load_format(repo) and holds no sdlc/ branch literal outside prose

- Given: janitor.py at the slice commit
- When: read the file
- Then: load_format call present; no literal sdlc/ outside the docstring and .sdlc paths
- Actual: call present; zero literal hits
- Result: pass
- Spec source: R-139 acceptance
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:136

```
includes branches.load_format(repo); literal hits: []
```

## TC-contract-6 (VS-7): janitor with 17 malformed branchFormat values deletes no branch

- Given: ledger S-001 done; branches sdlc/S-001-v0-http-api-0, feature/PROJ-1-S-001-v0-http-api-0, sdlc/S-999-v0-cli-0
- When: run janitor.py with each malformed format
- Then: no branch removed; refs unchanged; exit 0
- Actual: all 17 deleted nothing; format errors reported as a note for the four split-detectable shapes only
- Result: pass
- Spec source: R-139 acceptance; plan note VS-7
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:50

```
malformed tilde: reported=false notes=[] (and 10 more git-unsafe shapes)
```

## TC-contract-7 (VS-7): Property: load_format over generated config shapes gives Fail or a string

- Given: 500 config shapes from arb.configShape
- When: load_format(repo)
- Then: Fail or return
- Actual: 0 violations in 500 runs
- Result: pass
- Spec source: R-139 acceptance
- Test: .sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs:149

```
property load_format: seed=191072499 runs=500 violations=0
```

## Attacks

None.

## Seeds

- Stored run name with a trailing newline or a non-ASCII digit parses as run: branch_run returns 'feature/PROJ-1-run-1\n' and 'feature/PROJ-1-run-١' because parse uses $ and \d. A real branch name cannot hold either, so the effect is small. (skills/sdlc/branches.py)
- branch_run raises AttributeError when the committed config is a JSON string, number or true: state-write.py calls .get on the loaded value without a type check. The same code was on main before this slice. (skills/sdlc/state-write.py)
- janitor.py checks the format with split only, so git-unsafe formats give no note: Eleven formats (whitespace, .., ~, :, ?, [, backslash, .lock, @{, control char, extra brace) delete nothing but report nothing. validate_format would report them. (skills/sdlc/janitor.py)
- A non-string branchFormat makes the janitor sweep under sdlc/{name}: load_format treats a number, list, object, true or null as absent. The janitor then deletes sdlc/S-001-v0-http-api-0 and sdlc/S-999-v0-cli-0 with no note. The same happens when config.json holds a JSON list. (skills/sdlc/branches.py)
