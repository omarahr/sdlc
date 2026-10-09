# S-005b verification: security, part 1, round 0

- Slice: S-005b
- Profile: security
- Round: 0
- Commit: d0a0c87
- Scenario: VS-8
- Verdict: not refuted. 26 cases, 26 pass.

## Environment

macOS Darwin 25.6, Python 3.14.7, Node 24.19.0; push_guard.py run on scratch copies of skills/sdlc and hooks at d0a0c87 (worktree sdlc/S-005b-v0-security-1)

## Charter

Explore the push_guard.py forge rule with spec-required reads and GET spellings to find a false positive that blocks S-013. The guarantee is T-R-119f: a forge read changes only a pin and hits no ban (tests.md, R-119 scope: "Reads are allowed").

## Threat model boundary

Trusted: the reviewed scripts and the guard itself. Not trusted: a new literal form in a scanned file. Data flow, git state, attribute walks, prompts and unscanned files are seeds S1 to S5 (ADR-388e).

## Run

```
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2502.832708
```

Key diffs for A-1, A-7, A-8, A-15 and N-6:

```
== A-1 skills/sdlc/branches.py
  direct: +["branches.py _verify_read subprocess.run(['gh', 'api', f\"repos/{slug}/rules/branches/{quote(s, safe='')}\"], capture_output=True, text=True)"] -[]
  forge: +["branches.py _verify_read gh api repos/"] -[]
  forgeViolations=[] opaque=[]
== A-7 skills/sdlc/next-action.py
  wrapperVerbs: +["next-action.py gh api"] -[]
  forge: +["next-action.py _verify_read gh api repos/"] -[]
  forgeViolations=[] opaque=[]
== A-8 skills/sdlc/next-action.py
  wrapperVerbs: +["next-action.py gh api"] -[]
  forge: +["next-action.py _verify_read gh api repos/"] -[]
  forgeViolations=[] opaque=[]
== A-15 skills/sdlc/branches.py
  direct: +["branches.py _verify_read subprocess.run(['gh', 'api', f\"repos/{slug}/rules/branches/{urllib.parse.quote(s, safe='')}\"], capture_output=True, text=True)"] -[]
  network: +["branches.py import urllib.parse"] -[]
  forge: +["branches.py _verify_read gh api repos/"] -[]
  forgeViolations=[] opaque=[]
== N-6 skills/sdlc/next-action.py
  wrapperVerbs: +["next-action.py gh api"] -[]
  forge: +["next-action.py _verify_read gh api repos/"] -[]
  forgeViolations: +["next-action.py _verify_read run(repo, 'gh', 'api', '-X', 'GЕT', f'repos/{slug}/rules/branches/{enc}') -- method GЕT"] -[]
  forgeViolations=["next-action.py _verify_read run(repo, 'gh', 'api', '-X', 'GЕT', f'repos/{slug}/rules/branches/{enc}') -- method GЕT"] opaque=[]
```

## TC-security-1: A-1: S-013 GitHub read as T-R-119f writes it, at a direct site in branches.py changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-1 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-1:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-1:

```
S-013 GitHub read as T-R-119f writes it, at a direct site in branches.py
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:48
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-2: A-2: S-013 GitHub read with owner and repo split, timeout keyword changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-2 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-2:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-2:

```
S-013 GitHub read with owner and repo split, timeout keyword
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:49
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-3: A-3: S-013 GitHub read with -H Accept header, --paginate and --jq changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-3 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-3:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-3:

```
S-013 GitHub read with -H Accept header, --paginate and --jq
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:50
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-4: A-4: S-013 GitHub read with the path built by + of constants and names changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-4 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-4:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-4:

```
S-013 GitHub read with the path built by + of constants and names
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:51
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-5: A-5: S-013 GitHub read split over lines with implicit f-string concatenation changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-5 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-5:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-5:

```
S-013 GitHub read split over lines with implicit f-string concatenation
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:52
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-6: A-6: gh api -X GET through the next-action.py run wrapper changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-6 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-6:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-6:

```
gh api -X GET through the next-action.py run wrapper
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:53
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-7: A-7: gh api -X get in lower case through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-7 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-7:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-7:

```
gh api -X get in lower case through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:54
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-8: A-8: gh api --method GET through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-8 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-8:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-8:

```
gh api --method GET through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:55
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-9: A-9: gh api --method=GET through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-9 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-9:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-9:

```
gh api --method=GET through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:56
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-10: A-10: gh api -XGET glued through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-10 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-10:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-10:

```
gh api -XGET glued through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:57
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-11: A-11: gh api --method get in lower case through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-11 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-11:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-11:

```
gh api --method get in lower case through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:58
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-12: A-12: gh api -X Get in mixed case after the path through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-12 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-12:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-12:

```
gh api -X Get in mixed case after the path through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:59
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-13: A-13: S-013 GitLab push_rule read through run changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-13 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-13:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-13:

```
S-013 GitLab push_rule read through run
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:60
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-14: A-14: S-013 GitLab push_rule read at a direct site in branches.py changes only a pin and hits no ban

- Given: A copy of skills/sdlc and hooks at the slice tip d0a0c87
- When: Append the form A-14 in a new function and run push_guard.py on the copy
- Then: Only the direct, forge and wrapperVerbs keys change; forgeViolations and opaque stay empty; pushes stay equal
- Expected: forge changes; no key outside direct, forge, wrapperVerbs changes; forgeViolations == []; opaque == []
- Actual: forge gains '<file> _verify_read gh|glab api <prefix>'; only direct or wrapperVerbs change besides it; forgeViolations == []; opaque == []
- Result: pass
- Spec source: tests.md T-R-119f and R-119 scope (Reads are allowed; -X/--method GET in any case)
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:82`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-14:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-14:

```
S-013 GitLab push_rule read at a direct site in branches.py
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:61
```

guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-15: A-15: the S-013 GitHub read with 'import urllib.parse' added to branches.py hits no ban

- Given: A copy of the tree at d0a0c87
- When: Add 'import urllib.parse' and the S-013 gh api read to branches.py, run push_guard.py
- Then: No forge violation, no opaque call, no dynamic entry; the network key gains one entry
- Expected: forgeViolations == []; opaque == []; dynamic unchanged
- Actual: forgeViolations == []; opaque == []; network gains 'branches.py import urllib.parse'; direct and forge change
- Result: pass
- Spec source: tests.md T-R-119f; spec section 3 requires urllib.parse.quote(sample, safe="")
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:94`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-15:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-15 guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-16: A-16: the S-013 GitHub read with 'from urllib.parse import quote' added to branches.py hits no ban

- Given: A copy of the tree at d0a0c87
- When: Add 'from urllib.parse import quote' and the S-013 gh api read to branches.py, run push_guard.py
- Then: No forge violation, no opaque call, no dynamic entry; the network key gains one entry
- Expected: forgeViolations == []; opaque == []; dynamic unchanged
- Actual: forgeViolations == []; opaque == []; network gains 'branches.py import urllib.parse'; direct and forge change
- Result: pass
- Spec source: tests.md T-R-119f; spec section 3 requires urllib.parse.quote(sample, safe="")
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:104`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='A-16:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

A-15 guard key diffs:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-diffs.txt
```

## TC-security-17: N-1: gh api -X POST on the rules path next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-1 and run push_guard.py
- Then: forgeViolations holds '-- method POST'
- Expected: a violation '-- method POST'
- Actual: forgeViolations holds '-- method POST'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-1:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-1:

```
gh api -X POST on the rules path
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:65
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-18: N-2: gh api --method=patch on the rules path next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-2 and run push_guard.py
- Then: forgeViolations holds '-- method patch'
- Expected: a violation '-- method patch'
- Actual: forgeViolations holds '-- method patch'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-2:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-2:

```
gh api --method=patch on the rules path
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:66
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-19: N-3: gh api -X GET with -f a=b next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-3 and run push_guard.py
- Then: forgeViolations holds '-- field -f'
- Expected: a violation '-- field -f'
- Actual: forgeViolations holds '-- field -f'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-3:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-3:

```
gh api -X GET with -f a=b
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:67
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-20: N-4: gh api -X GET then -X POST next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-4 and run push_guard.py
- Then: forgeViolations holds '-- method POST'
- Expected: a violation '-- method POST'
- Actual: forgeViolations holds '-- method POST'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-4:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-4:

```
gh api -X GET then -X POST
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:68
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-21: N-5: gh api -X with a non-constant method next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-5 and run push_guard.py
- Then: forgeViolations holds '-- method is not constant'
- Expected: a violation '-- method is not constant'
- Actual: forgeViolations holds '-- method is not constant'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-5:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-5:

```
gh api -X with a non-constant method
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:69
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-22: N-6: gh api -X with a Cyrillic E confusable of GET next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-6 and run push_guard.py
- Then: forgeViolations holds '-- method GЕT'
- Expected: a violation '-- method GЕT'
- Actual: forgeViolations holds '-- method GЕT'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-6:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-6:

```
gh api -X with a Cyrillic E confusable of GET
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:70
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-23: N-7: gh api -X GET with --input - next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-7 and run push_guard.py
- Then: forgeViolations holds '-- field --input'
- Expected: a violation '-- field --input'
- Actual: forgeViolations holds '-- field --input'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-7:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-7:

```
gh api -X GET with --input -
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:71
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-24: N-8: gh api -X GET graphql next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-8 and run push_guard.py
- Then: forgeViolations holds '-- path holds graphql'
- Expected: a violation '-- path holds graphql'
- Actual: forgeViolations holds '-- path holds graphql'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-8:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-8:

```
gh api -X GET graphql
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:72
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-25: N-9: gh api -X GET on a pulls path next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-9 and run push_guard.py
- Then: forgeViolations holds '-- path holds pulls'
- Expected: a violation '-- path holds pulls'
- Actual: forgeViolations holds '-- path holds pulls'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-9:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-9:

```
gh api -X GET on a pulls path
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:73
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## TC-security-26: N-10: gh api --method GET with --raw-field next to the read allowance is a forge violation

- Given: A copy of the tree at d0a0c87
- When: Append N-10 and run push_guard.py
- Then: forgeViolations holds '-- field --raw-field'
- Expected: a violation '-- field --raw-field'
- Actual: forgeViolations holds '-- field --raw-field'
- Result: pass
- Spec source: tests.md R-119 scope forge rule and ADR-368d graphql ban
- Test: `.sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:114`
- Command: `SDLC_VERIFY_ROOT=<slice tip checkout> node --test --test-name-pattern='N-10:' .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs`

N-10:

```
gh api --method GET with --raw-field
source line .sdlc/slices/S-005b/verification/r0/tests/security-1/forge-reads.verify-security.test.mjs:74
```

run:

```
.sdlc/slices/S-005b/verification/r0/logs/security-1-run.txt
```

## Attacks

| id | input | expected | observed | result |
|---|---|---|---|---|
| A-1 | S-013 GitHub read as T-R-119f writes it, at a direct site in branches.py | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-2 | S-013 GitHub read with owner and repo split, timeout keyword | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-3 | S-013 GitHub read with -H Accept header, --paginate and --jq | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-4 | S-013 GitHub read with the path built by + of constants and names | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-5 | S-013 GitHub read split over lines with implicit f-string concatenation | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-6 | gh api -X GET through the next-action.py run wrapper | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-7 | gh api -X get in lower case through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-8 | gh api --method GET through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-9 | gh api --method=GET through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-10 | gh api -XGET glued through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-11 | gh api --method get in lower case through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-12 | gh api -X Get in mixed case after the path through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-13 | S-013 GitLab push_rule read through run | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-14 | S-013 GitLab push_rule read at a direct site in branches.py | pin change only, no ban | pin change only (direct/forge/wrapperVerbs), no forge violation, no opaque call | held |
| A-15 | import urllib.parse plus gh api repos/{slug}/rules/branches/{quote(s, safe='')} | pin change only, no ban | no ban; the network pin also changes (urllib is a NET_MODULES top) | held |
| A-16 | from urllib.parse import quote plus gh api repos/{slug}/rules/branches/{quote(s, safe='')} | pin change only, no ban | no ban; the network pin also changes (urllib is a NET_MODULES top) | held |
| N-1 | gh api -X POST on the rules path | violation method POST | violation method POST | held |
| N-2 | gh api --method=patch on the rules path | violation method patch | violation method patch | held |
| N-3 | gh api -X GET with -f a=b | violation field -f | violation field -f | held |
| N-4 | gh api -X GET then -X POST | violation method POST | violation method POST | held |
| N-5 | gh api -X with a non-constant method | violation method is not constant | violation method is not constant | held |
| N-6 | gh api -X with a Cyrillic E confusable of GET | violation method GЕT | violation method GЕT | held |
| N-7 | gh api -X GET with --input - | violation field --input | violation field --input | held |
| N-8 | gh api -X GET graphql | violation path holds graphql | violation path holds graphql | held |
| N-9 | gh api -X GET on a pulls path | violation path holds pulls | violation path holds pulls | held |
| N-10 | gh api --method GET with --raw-field | violation field --raw-field | violation field --raw-field | held |

## Seeds

- **T-R-119f mutant omits the import that the S-013 read needs** (skills/sdlc/test/push_guard.py): Spec section 3 requires urllib.parse.quote. Adding 'import urllib.parse' or 'from urllib.parse import quote' to branches.py adds 'branches.py import urllib.parse' to the network key (urllib is in NET_MODULES). The real S-013 change must update the network pin too, while T-R-119f lets only direct, forge and wrapperVerbs change. No ban fires, so this is no refutation. Consider adding the import to the T-R-119f mutant, or treat urllib.parse as pure in the network key.
- **The forge pin holds only the constant path prefix** (skills/sdlc/test/push_guard.py): Every gh api read at one function records 'gh api repos/'. A second read of another repos/ endpoint in the same function leaves the forge key unchanged. Writes still give a violation, so no push or PR escapes; the pin only gives less review signal for reads.
