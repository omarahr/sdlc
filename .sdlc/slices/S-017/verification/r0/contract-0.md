# Verify contract part 0: S-017 round 0

- Slice: S-017
- Profile: contract
- Round: 0
- Commit: b67230c
- Verdict: pass (9 of 9 cases)

## Environment
Python 3.14.7, Node 24.19.0, gh and glab stub shims from the testkit, scratch git repos, worktree of sdlc/S-017 on branch sdlc/S-017-v0-contract-0

## Surface
```
Command boundary: python3 skills/sdlc/branches.py preflight --repo DIR --mode MODE [--format F] [--branch CURRENT]
Success keys (sorted): args, command, derived, forge, format, given, notes, ok, rules, samples, suggestion
Rule keys: kind, label, negate, pattern, source
Sample keys: kind, name, result, rule  (result in pass, fail, unevaluated, unchecked)
Error keys (exit 2): error, ok  (one JSON line, stderr empty, no usage text)
Exit: 0 when ok, 1 when not ok, 2 on bad input.
Python functions exercised through the module path (python3 -I, pycall): derive, judge, suggest.
Extra export check: the spec names only the preflight command in section 4; extra keys args and command come from the shared echo of the other commands.
```

## TC-contract-1: Seven preflight scenarios hold through gh and glab shims
- Scenario: VS-4 (R-074)
- Given: A fixture repo with forge github or gitlab and a gh or glab shim on PATH.
- When: Run preflight for the seven R-074 scenarios, one after the other.
- Then: Exit codes 0,0,1,0,0,1,2. Keys match the surface listing. Scenario 2 derives feature/sdlc/{name}. Scenario 5 has rules unknown and only unchecked samples. Scenario 6 fails the working sample bad-name with rule push rule. Scenario 7 gives one JSON error.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:61`

```
see .sdlc/slices/S-017/verification/r0/logs/contract-0-surface.txt
```

```
see .sdlc/slices/S-017/verification/r0/logs/contract-0-run.txt
```

## TC-contract-2: glab ok path, mr without branch, pr mode regex failure
- Scenario: VS-4 (R-074)
- Given: A glab shim with branch_name_regex ^feat/.
- When: Run preflight in mr mode with feat/x, in mr mode without --branch, and in pr mode.
- Then: feat/x passes, no sample without --branch, pr mode fails with derived false.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:140`

```
see .sdlc/slices/S-017/verification/r0/logs/contract-0-run.txt
```

## TC-contract-3: Bad input exits 2 with one JSON error
- Scenario: VS-4 (R-074)
- Given: A fixture repo.
- When: Run preflight with a repeated placeholder, an unknown mode, an empty format, an unknown flag and no arguments.
- Then: Every run exits 2, prints one JSON line with the keys ok and error, and prints no usage text.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:153`

```
see .sdlc/slices/S-017/verification/r0/logs/contract-0-run.txt
```

## TC-contract-4: Same input gives the same output and the repo stays unchanged
- Scenario: VS-4 (R-074)
- Given: A gh shim with a starts_with rule.
- When: Run preflight twice.
- Then: The two outputs are equal after the timestamp is masked. The scratch tree and git refs do not change.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:165`

```
see .sdlc/slices/S-017/verification/r0/logs/contract-0-run.txt
```

## TC-contract-5: derive matches the spec table (property)
- Scenario: VS-4 (R-074)
- Given: Random rule lists of length 0 to 3 with kinds starts_with, ends_with, contains and regex, negated at 30 percent.
- When: Call derive. Compare with a reference model written from the spec table.
- Then: derive returns the table format for exactly one non-negated starts_with, ends_with or contains rule, else null.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:204`

```
property=derive seed=3599166825 runs=1500 result=pass violations=0
mutant check: negate guard removed gave violations=131, for example starts_with zzz/ negate true -> want null got zzz/sdlc/{name}
```

## TC-contract-6: judge matches rule semantics (property)
- Scenario: VS-4 (R-074)
- Given: Random rule lists and sample names.
- When: Call judge. Compare with a reference model of the four rule kinds and negate.
- Then: Result is fail with the first failing rule label, else pass with rule null.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:220`

```
property=judge seed=4061633534 runs=1500 result=pass violations=0
```

## TC-contract-7: suggest always carries --branch-format after a loop failure (property)
- Scenario: VS-4 (R-074)
- Given: Random rule lists and three failing loop samples.
- When: Call suggest with the reference derived value.
- Then: The suggestion starts with --branch-format and holds the derived format when one exists.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:241`

```
property=suggest seed=2532558692 runs=1200 result=pass violations=0
```

## TC-contract-8: CLI exit code equals ok across random rule sets
- Scenario: VS-4 (R-074)
- Given: 60 random rule lists served by a gh shim.
- When: Run preflight in pr mode.
- Then: Exit code follows ok. ok equals no failing sample. A derived format equals the reference derivation and every sample passes under it. A single negated rule never derives. A failing run has a suggestion with --branch-format. A passing run has an empty suggestion.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:265`

```
property=cli seed=2106450994 runs=60 result=pass
```

## TC-contract-9: Consumer view from a scratch cwd
- Scenario: VS-4 (R-074)
- Given: The command run by its script path from a scratch directory.
- When: Run preflight in direct mode.
- Then: ok true and no samples, with the same surface.
- Actual: Matches expected. The test passed.
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:290`

```
see .sdlc/slices/S-017/verification/r0/logs/contract-0-run.txt
```

## Attacks
None. The security profile covers hostile forge answers.

## Seeds
- derive treats an empty pattern as not derivable: The spec table would give sdlc/{name} for starts_with with an empty pattern. derive returns None. The result is the same in practice, because an empty pattern passes every sample.
- preflight output holds the extra keys args and command: The spec output example in section 4 shows no args or command keys. They come from the shared echo. The surface test pins them.
