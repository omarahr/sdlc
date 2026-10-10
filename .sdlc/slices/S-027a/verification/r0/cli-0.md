# Verification: cli, part 0

- Slice: S-027a
- Round: 0
- Commit: a8e86bc
- Verdict: pass (4 of 4 cases)
- Environment: Node test runner, python3, scratch git repos from the cli-runner with a scratch HOME; no network

## TC-cli-1 (VS-1): ste-check.py passes the three edited prompts and the env-detector rule sits in step 4

- Given: The edited env-detector.md, slicer.md and state-schema.md
- When: Run ste-check.py on them; read the step order and the Inputs line
- Then: Exit 0 with no output; the exact R-064 sentence appears once in step 4; steps 5 to 8 follow in order; no step citation breaks
- Actual: Exit 0, empty stdout. The sentence appears once in step 4. Steps 4 to 8 are in order. No prompt or test cites an env-detector step number. A copy with one added banned word makes ste-check exit 1, and a missing path exits 1 with 'unreadable'.
- Result: pass
- Spec source: R-064 quote and acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs:15`
- Command: `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs`

ste-check.py run:
```
$ python3 skills/sdlc/ste-check.py prompts/env-detector.md prompts/slicer.md prompts/state-schema.md
(no output)
exit 0
```

## TC-cli-2 (VS-3): A repo with no branchFormat names the slice branch through the default sdlc/{name}

- Given: Repos with no config, a config without the field, branchFormat empty string and null
- When: Run branches.py name --kind slice --id S-001
- Then: Exit 0, format sdlc/{name}, branch sdlc/S-001 for each; a set format feature/{name} wins
- Actual: All four cases print format sdlc/{name} and branch sdlc/S-001 with exit 0. The set format gives feature/S-001. The load_format property run (seed 268470099, 100 runs) had 0 violations. An unparseable config exits 2 with a clear error.
- Result: pass
- Spec source: R-002 clause 2
- Test: `.sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs:58`
- Command: `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs`

branches.py name on a repo with no config:
```
$ python3 skills/sdlc/branches.py name --repo <repo> --kind slice --id S-001
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
exit 0
```

## TC-cli-3 (VS-6): No script reads a slice's branch field (38 variants)

- Given: A ledger of 3 slices and a git repo, with valid state
- When: Run next-action.py, state-write.py status, base-branch and patch-slice, and janitor.py with the branch field removed, null, number, bool, list, object, empty, newline, traversal, huge (2 MB), flag-like, and 24 attack-corpus values (2 per family)
- Then: Every output, STATUS.md and the resulting slices.json equal the original run apart from branch and commit hash
- Actual: All 38 variants equal the original. next-action.py reports action 'slice' for S-002, so slice logic ran. A planted read of s.get('branch') in a copy of next-action.py made 3 of 3 sampled variants fail, so the test can fail.
- Result: pass
- Spec source: R-061 acceptance (no script reads the field)
- Test: `.sdlc/slices/S-027a/verification/r0/tests/cli-0/branch-field.verify-cli.test.mjs:74`
- Command: `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/branch-field.verify-cli.test.mjs`

run of the variant tests:
```
$ node --test branch-field.verify-cli.test.mjs
ℹ tests 40
ℹ pass 40
ℹ fail 0
```

planted-read check:
```
copy of next-action.py with "pr": s.get("pr","") + str(s.get("branch",""))
✖ removed, ✖ null, ✖ number  (pass 0, fail 3)
```

## TC-cli-4 (VS-6): sdlc-loop.js never reads a slice's branch field

- Given: sdlc-loop.js source
- When: Scan for s.branch, slice.branch and ['branch'] reads
- Then: No hit
- Actual: No hit.
- Result: pass
- Spec source: R-061 acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs:93`
- Command: `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs`

scan:
```
branch reads in sdlc-loop.js: []
```

## Attacks

Hostile branch values changed no script output or state.

## Seeds

None.
