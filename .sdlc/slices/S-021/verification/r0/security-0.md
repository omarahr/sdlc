# Verify security S-021 round 0

Slice: S-021. Profile: security. Round: 0. Commit: fecc565. Verdict: verified (10 cases pass, 7 attacks, 3 seeds).

Environment: python3, node 24 test runner, scratch git repos, gh stub shim on PATH, prs file mode (no network).

Scenarios: VS-1, VS-2, VS-6.
Threat model: branch creators with repo write are trusted. PR heads from forks are not.

## TC-security-1 (VS-1): Foreign, attempt, verify, confusable and unicode branch names never read as the active slice
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: 15 hostile names, each with an in-progress ledger entry on its own branch: checkout null; refs equal before and after
- Result: pass
- Source: R-053 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:52

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-2 (VS-1): A slice-shaped branch without a matching in-progress entry stays inactive
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: feature/PROJ-1-S-002 and a todo S-3 give checkout null
- Result: pass
- Source: R-053 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:70

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-3 (VS-1): The checked-out branch wins over another in-progress branch
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: checkout null, next.sliceId S-2
- Result: pass
- Source: R-053 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:77

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-4 (VS-1): Decision on a foreign branch makes no gh call and moves no ref
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: gh stub log empty, refs equal
- Result: pass
- Source: R-053 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:97

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-5 (VS-2): Hostile state and e2e heads give no merge command
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: 11 heads (sdlc/ prefix, other project, e2e-area, run, attempt, 5000-char area): merges []
- Result: pass
- Source: R-054 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:110

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-6 (VS-2): Unready state and e2e heads give no merge
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: CONFLICTING, REVIEW_REQUIRED and failed-check variants: merges []
- Result: pass
- Source: R-054 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:124

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-7 (VS-2): A head that is null, a number, a list or an object does not crash the decision
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: exit 0 and no merge for four non-string heads
- Result: pass
- Source: R-054 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:132

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-8 (VS-2): The state prefix fallback merges only the ready PR and runs no shell text
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: state-2026 merges 21; a head with $(touch pwn) yields only its own gh pr merge string
- Result: pass
- Source: R-054 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:141

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-9 (VS-6): A foreign head changes no decision in the pr and stack fixtures
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: 7 foreign heads: decision JSON deep-equal with and without the head, in pr and stack mode
- Result: pass
- Source: R-076 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:149

```
git for-each-ref output equal before and after; gh stub log empty
```

## TC-security-10 (VS-6): A head without the M anchor never holds the stack
- Given: A scratch git repo with branchFormat set and hostile or foreign branch or head names
- When: next-action.py decides
- Then: The hostile name changes no decision, and no ref, file or gh call changes
- Actual: lowercase m-2, sdlc-M-2 and sdlc/M-2 give no wait
- Result: pass
- Source: R-076 acceptance
- Test: .sdlc/slices/S-021/verification/r0/tests/security-0/next-action.verify-security.test.mjs:167

```
git for-each-ref output equal before and after; gh stub log empty
```

## Attacks
- AT-1 held: Explore active_branch with hostile branch names to find a foreign branch read as active (R-053). Input: 15 branch names: attempt, verify, foreign, sdlc/, lowercase, zero-width, fullwidth digit, Cyrillic dze, other project. Observed: checkout null for all.
- AT-2 held: Explore head recognition with state and e2e lookalikes to find an unintended merge (R-054). Input: 11 heads plus 3 unready variants. Observed: no merge.
- AT-3 held: Explore PR list parsing with non-string headRefName to find a crash. Input: null, 5, list, object. Observed: exit 0.
- AT-4 held: Explore the foreign-head rule (R-076). Input: 7 foreign heads in pr and stack fixtures. Observed: identical.
- AT-5 out-of-scope: Explore lowercased matching with Kelvin sign. Input: branch feature/PROJ-1-s-<U+212A>1 with in-progress S-K1. Observed: checkout is the Kelvin branch.
- AT-6 out-of-scope: Explore head anchors with a trailing newline. Input: feature/PROJ-1-M-1-e2e<LF>, feature/PROJ-1-M-2<LF>. Observed: read as e2e merge and milestone hold (regex $ matches before a final newline).
- AT-7 out-of-scope: Explore digit classes with fullwidth digits. Input: feature/PROJ-1-M-<U+FF12>-e2e and feature/PROJ-1-M-<U+FF12>. Observed: merge command and stack hold (\d matches Unicode digits).

## Seeds
- branches.parse: \d and $ accept Unicode digits and a trailing newline: PARSE_ROWS use \d and $ without re.ASCII. A fork PR head such as feature/PROJ-1-M-<fullwidth 2> holds the stack, and feature/PROJ-1-M-1-e2e<LF> gets a merge command. Git forbids newlines, GitHub rejects them, so only the digit form is reachable. Fix: re.ASCII and \Z. The old sdlc/M-[^/]+ check was looser, so this is no regression.
- lowercased format: re.IGNORECASE folds Kelvin sign and long s into ASCII: A local branch with U+212A matches ledger id S-K1 under {name:lower}. Branch creation needs repo write, which is trusted.
- state prefix fallback merges any ready head starting with state-: The spec requires the fallback. A fork PR head feature/PROJ-1-state-x that is green and mergeable gets gh pr merge in pr mode. Same exposure as sdlc/state- on main. Consider requiring the PR author to be the run owner.
