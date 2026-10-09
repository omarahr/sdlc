# S-005b verify-cli part 1, round 1

Commit: e71f8c8. Verdict: blocked.

Environment: git 2.50.1, Python 3.14.7, macOS.

## TC-cli-101 (VS-14): Verify git options before the verb (not run)

- Given: Slice commit e71f8c8 and the clean guard output
- When: The cli verifier starts the scenario
- Then: No case ran
- Expected: A guard result for each form
- Actual: A safety classifier stopped the verifier session before it built any mutant
- Result: blocked. Unblock: Re-run the scenario in a new session, or let a human run it.

```
python3 skills/sdlc/test/push_guard.py . -> exit 0; dynamic, opaque, forgeViolations and wrapperValues are empty; 17 files; 5 wrapperBodies entries
```

## TC-cli-102 (VS-15): Verify import alias binding (not run)

- Given: Slice commit e71f8c8 and the clean guard output
- When: The cli verifier starts the scenario
- Then: No case ran
- Expected: A guard result for each form
- Actual: A safety classifier stopped the verifier session before it built any mutant
- Result: blocked. Unblock: Re-run the scenario in a new session, or let a human run it.

```
python3 skills/sdlc/test/push_guard.py . -> exit 0; dynamic, opaque, forgeViolations and wrapperValues are empty; 17 files; 5 wrapperBodies entries
```

## TC-cli-103 (VS-16): Verify submodule attribute chains (not run)

- Given: Slice commit e71f8c8 and the clean guard output
- When: The cli verifier starts the scenario
- Then: No case ran
- Expected: A guard result for each form
- Actual: A safety classifier stopped the verifier session before it built any mutant
- Result: blocked. Unblock: Re-run the scenario in a new session, or let a human run it.

```
python3 skills/sdlc/test/push_guard.py . -> exit 0; dynamic, opaque, forgeViolations and wrapperValues are empty; 17 files; 5 wrapperBodies entries
```

## TC-cli-104 (VS-17): Verify guard-miss mutants against a bare remote (not run)

- Given: Slice commit e71f8c8 and the clean guard output
- When: The cli verifier starts the scenario
- Then: No case ran
- Expected: A guard result for each form
- Actual: A safety classifier stopped the verifier session before it built any mutant
- Result: blocked. Unblock: Re-run the scenario in a new session, or let a human run it.

```
python3 skills/sdlc/test/push_guard.py . -> exit 0; dynamic, opaque, forgeViolations and wrapperValues are empty; 17 files; 5 wrapperBodies entries
```

## Attacks

None.

## Seeds

None.
