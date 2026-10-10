# Verification: S-030, profile contract, round 0

Commit: ac20dc6. Verdict: pass (8 of 8 cases).

Environment: Python 3 (python3 -I via pycall.py), Node 24, no network

Surface: `derive(rules)` in `skills/sdlc/branches.py`, loaded by path as a consumer. Helper table `DERIVE_FORMATS` is internal.

## TC-contract-1 (VS-1): starts_with feature/ derives feature/sdlc/{name}

- Given: one rule starts_with feature/
- When: derive is called through pycall.py with the module loaded by path
- Then: the return value
- Expected: feature/sdlc/{name}
- Actual: feature/sdlc/{name}
- Result: pass
- Spec source: R-123 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:20`

**property-run: example**
```
derive([starts_with 'feature/']) -> 'feature/sdlc/{name}'
```

## TC-contract-2 (VS-2): ends_with -dev derives sdlc/{name}-dev

- Given: one rule ends_with -dev
- When: derive is called through pycall.py with the module loaded by path
- Then: the return value
- Expected: sdlc/{name}-dev
- Actual: sdlc/{name}-dev
- Result: pass
- Spec source: R-124 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:23`

**property-run: example**
```
derive([ends_with '-dev']) -> 'sdlc/{name}-dev'
```

## TC-contract-3 (VS-3): contains team-a derives sdlc/team-a/{name}

- Given: one rule contains team-a
- When: derive is called through pycall.py with the module loaded by path
- Then: the return value
- Expected: sdlc/team-a/{name}
- Actual: sdlc/team-a/{name}
- Result: pass
- Spec source: R-125 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:26`

**property-run: example**
```
derive([contains 'team-a']) -> 'sdlc/team-a/{name}'
```

## TC-contract-4 (VS-5): No format for regex, negated (each operator), two rules, empty list, unknown or null kind

- Given: those inputs
- When: derive is called through pycall.py with the module loaded by path
- Then: the return value
- Expected: None for every input
- Actual: None for every input
- Result: pass
- Spec source: R-141 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:29`

**property-run: examples**
```
regex, negated starts_with/ends_with/contains, two rules, [], kind 'bogus', kind null -> None
```

## TC-contract-5 (VS-1): Odd patterns are spliced verbatim, with a 100000 character pattern, unicode, braces and spaces

- Given: 11 odd patterns for three operators
- When: derive is called through pycall.py with the module loaded by path
- Then: the return values
- Expected: equal the reference model
- Actual: equal the reference model
- Result: pass
- Spec source: R-141 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:38`

**property-run: odd patterns**
```
33 calls, all equal to the model output
```

## TC-contract-6 (VS-1): Property: derive equals the reference model for 3000 generated rule lists (0 to 3 rules, six kinds, negate, unicode patterns)

- Given: seeded generator
- When: derive is called through pycall.py with the module loaded by path
- Then: the return values
- Expected: equal the model written from the R-141 text; inputs not changed; second call equal
- Actual: equal the model written from the R-141 text; inputs not changed; second call equal
- Result: pass
- Spec source: R-141 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:44`

**property-run: property run**
```
property-run derive seed=3368312828 runs=3000 violations=0 (replay with TESTKIT_SEED=3368312828)
```

## TC-contract-7 (VS-5): derive does not mutate its input and is deterministic

- Given: one rule
- When: derive is called through pycall.py with the module loaded by path
- Then: two calls
- Expected: equal values and equal rules after
- Actual: equal values and equal rules after
- Result: pass
- Spec source: R-141 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:65`

**log: test run**
```
see .sdlc/slices/S-030/verification/r0/logs/contract-0.log
```

## TC-contract-8 (VS-1): Consumer view: derive(rules) is the single entry, loaded by path

- Given: module loaded as a consumer
- When: derive is called through pycall.py with the module loaded by path
- Then: inspect.signature
- Expected: (rules) with only DERIVE_FORMATS and derive named derive*
- Actual: (rules) with only DERIVE_FORMATS and derive named derive*
- Result: pass
- Spec source: R-141 acceptance
- Test: `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:77`

**type-check: surface**
```
derive (rules)
names matching derive: DERIVE_FORMATS, derive
No extra public name defined by the spec; DERIVE_FORMATS is an internal table.
```

## Attacks

None.

## Seeds

- derive returns None for an empty pattern. Spec text is silent. File: `skills/sdlc/branches.py`.
