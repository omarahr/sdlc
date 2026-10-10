# verify-security S-023 r0 part 0

Slice S-023, profile security, round 0, commit 1365f3a. Verdict: pass (8 of 8).

Threat model: branch names in the repo are untrusted input; the slice id comes from state. Attacks on the slice id outside that stay in scope as hardening only.

Environment: Python 3 -I via pycall, Node test runner, scratch git repos, macOS

## TC-security-1: only verify and attempt tails of S-001, sorted; plain, foreign-prefix, look-alike names excluded

- Given: default format, 18 branches incl. plain, S-0011, S-010, other/, xsdlc/, confusable hyphen, Arabic digit
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: only verify and attempt tails of S-001, sorted
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:21

Attack AT-1: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-2: S-0011 and S-010 do not leak into S-001 and the reverse

- Given: same repo
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: S-0011 and S-010 results are their own
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:28

Attack AT-2: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-3: custom prefix-and-suffix format

- Given: feature/PROJ-1-{name}-wip
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: only names carrying the suffix
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:34

Attack AT-3: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-4: lowercase format case-insensitive; plain format case-sensitive

- Given: f/{name:lower} and f/{name}
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: lowercase matches s-001 and S-001; plain matches S-001 only
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:40

Attack AT-4: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-5: hostile slice ids from 12 corpus families

- Given: every family value as slice id
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: return or Fail, never an exception, and no match on unrelated ids
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:48

Attack AT-5: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-6: regex metacharacters in slice id

- Given: S-a.b, S-.*, empty
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: exact match only
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:65

Attack AT-6: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-7: refusal leaves the repo tree unchanged

- Given: traversal-like id
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: exit 0, treeUnchanged
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:73

Attack AT-7: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## TC-security-8: invalid format and missing repo give clean Fail

- Given: no placeholder, double placeholder, ../ prefix, missing dir
- When: slice_side_branches(repo, fmt, slice_id) is called through pycall
- Then: return or Fail
- Result: pass
- Test: .sdlc/slices/S-023/verification/r0/tests/security-0/slice-side-branches.verify-security.test.mjs:80

Attack AT-8: held. Log: `.sdlc/slices/S-023/verification/r0/logs/security-0-test.txt`

## Seeds

None.