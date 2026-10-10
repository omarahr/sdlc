# Security verification, S-032, round 0

- Slice: S-032
- Profile: security, part 0
- Commit: bf55a29
- Verdict: verified. Every attack held.

Threat model: the branch name and the branch format come from the user and are not trusted. The mode table is trusted code.

Charter: Explore the preflight command with hostile --branch, --format and branchFormat values to find a sampled kind outside the table of R-137.

## TC-security-1: Baseline: each mode samples only its own kinds
- Given: A scratch git repo and branches.py preflight
- When: preflight runs in modes pr, stack, mr, direct
- Then: kinds are checked per mode and stderr holds no traceback
- Expected: Sampled kinds stay inside the allowed set for the mode. No sample has kind e2e-area, verify or attempt. No traceback.
- Actual: Held. The test passed.
- Result: pass
- Spec source: R-137 acceptance
- Test: .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:24

Evidence: `.sdlc/slices/S-032/verification/r0/logs/security-0-test.log`

## TC-security-2: Hostile --branch values add no sampled kind
- Given: A scratch git repo and branches.py preflight
- When: preflight runs in all 4 modes with each argv-safe entry of 7 corpus families as --branch
- Then: kinds are checked per run and stderr holds no traceback
- Expected: Sampled kinds stay inside the allowed set for the mode. No sample has kind e2e-area, verify or attempt. No traceback.
- Actual: Held. The test passed.
- Result: pass
- Spec source: R-137 acceptance
- Test: .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:33

Evidence: `.sdlc/slices/S-032/verification/r0/logs/security-0-test.log`

## TC-security-3: Hostile --format values add no sampled kind and do not crash
- Given: A scratch git repo and branches.py preflight
- When: preflight runs in all 4 modes with each corpus entry as --format
- Then: kinds are checked and stderr holds no traceback and stderr holds no traceback
- Expected: Sampled kinds stay inside the allowed set for the mode. No sample has kind e2e-area, verify or attempt. No traceback.
- Actual: Held. The test passed.
- Result: pass
- Spec source: R-137 acceptance
- Test: .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:46

Evidence: `.sdlc/slices/S-032/verification/r0/logs/security-0-test.log`

## TC-security-4: Hostile branchFormat in config adds no sampled kind and does not crash
- Given: A scratch git repo and branches.py preflight
- When: preflight runs in all 4 modes with each corpus entry as config branchFormat
- Then: kinds are checked and stderr holds no traceback and stderr holds no traceback
- Expected: Sampled kinds stay inside the allowed set for the mode. No sample has kind e2e-area, verify or attempt. No traceback.
- Actual: Held. The test passed.
- Result: pass
- Spec source: R-137 acceptance
- Test: .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:58

Evidence: `.sdlc/slices/S-032/verification/r0/logs/security-0-test.log`

## Attacks

- A-1: Explore --branch with flag-like, traversal, control-char, confusable, injection, format-string and whitespace values to find a sampled kind outside the mode table (R-137). Result: held.
- A-2: Explore --format with the same families to find a new sampled kind or a crash. Result: held.
- A-3: Explore config branchFormat with the same families to find a new sampled kind or a crash. Result: held.

## Seeds

- Hostile-input test cannot see a refusal that yields no samples. When preflight refuses a hostile format, it prints no samples, so the kinds check holds for an empty set. The test proves no extra kind and no traceback, not the refusal text. Other lenses cover the refusal.
