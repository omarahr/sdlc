# Verification: contract, part 0

- Slice: S-027c
- Round: 0
- Commit: afe9bbe
- Verdict: all cases pass; 4 seeds

## Environment
Node test runner, python3, macOS; verify worktree sdlc/S-027c-v0-contract-0 at afe9bbe

## Surface
Contract surface: 54 prompt .md files plus SKILL.md. No code exports. Placeholders defined in _common.md: run, slice, milestone, e2e, e2e area, state, attempt, verify branch.

Meaning review (VS-5): each edited sentence was read. Slice, run, milestone, e2e, state and attempt placeholders sit in the steps that match their kind. The verify branch appears only in the collector input. No kind is swapped.

## TC-contract-1 (VS-1): Each section 8 row holds its mapped placeholders

- Given: The 23 prompt files of the table on branch sdlc/S-027c
- When: Read each file and look for each mapped placeholder
- Then: Every placeholder is present
- Actual: All 23 files hold their placeholders
- Result: pass
- Spec source: R-063 acceptance
- Test: `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:56`

Evidence (log): run
```
VS-1 pass; 23 rows checked
```

## TC-contract-2 (VS-2): The six extra literals are gone and sdlc/{name} stays

- Given: commit-state, escalator, SKILL.md, state-schema, four other prompts
- When: Scan for old literals and the default format text
- Then: No old literal; default text stays in SKILL.md and state-schema.md
- Actual: As expected; escalator spike phrase is present
- Result: pass
- Spec source: ADR-20261010-074457-decision-judge-S-027c-44f1
- Test: `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:73`

Evidence (log): run
```
VS-2 pass
```

## TC-contract-3 (VS-3): Independent line-based scan finds no literal

- Given: 55 files (54 under prompts plus SKILL.md)
- When: Scan with a line parser that handles ``` and ~~~ fences, and again with no fence exemption
- Then: No hit in either scan; sdlc/S-001 matches; .sdlc/slices, sdlc/tracker, sdlc/STOP, sdlc/{name} do not match
- Actual: files=55, exempt=[], bad=[], raw hits=[]. No fenced block exempts anything.
- Result: pass
- Spec source: R-063 acceptance, R-080 quote
- Test: `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:28`

Evidence (log): scan output
```
see .sdlc/slices/S-027c/verification/r0/logs/contract-0-scan.txt
```

## TC-contract-4 (VS-4): Shipped scan helper at fence boundaries

- Given: Fixtures with a branches.py output block plus an unfenced literal, an unclosed fence, tilde fences, an inline span and an empty text
- When: Run the shipped stripBranchesOutput and the pattern
- Then: Unfenced literal fails; unclosed, tilde and inline cases fail; empty text passes
- Actual: All fixtures behave as expected
- Result: pass
- Spec source: R-080 quote
- Test: `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:92`

Evidence (log): fixtures
```
output block exempt; literal after or before it fails; plain block fails; ~~~ fails; unclosed fails; inline span fails; literal between two blocks fails
```

## TC-contract-5 (VS-4): Property: scan helper against a reference model

- Given: Random documents of safe text, literals, branches.py blocks and plain blocks
- When: Compare the helper with the model (a literal outside a branches.py block must match)
- Then: No disagreement in 1500 runs
- Actual: seed=1008863937 runs=1500 failures=0
- Result: pass
- Spec source: R-080 quote
- Test: `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:115`

Evidence (property-run): property
```
property-run seed=1008863937 runs=1500 failures=0 counterexample=null
```

## TC-contract-6 (VS-6): ste-check passes on all prompts

- Given: All 54 prompt files
- When: Run ste-check.py
- Then: Exit 0
- Actual: Exit 0
- Result: pass
- Spec source: R-063 (edited prompts keep STE)
- Test: `.sdlc/slices/S-027c/verification/r0/tests/contract-0/scan.verify-contract.test.mjs:138`

Evidence (log): ste-check
```
exit 0, no output
```

## TC-contract-7 (VS-7): Updated assertions keep their sentences; suite runs green

- Given: The diff of prompts.test.mjs and the repo test file
- When: Read the diff and run node --test skills/sdlc/test/prompts.test.mjs
- Then: No test skipped or deleted; 91 of 91 pass
- Actual: 91 of 91 pass. Each literal assertion now holds its placeholder in the same sentence. One assertion was dropped (see seeds).
- Result: pass
- Spec source: R-080 acceptance
- Test: `skills/sdlc/test/prompts.test.mjs:1`

Evidence (log): suite
```
ℹ tests 91 · pass 91 · fail 0
```

## Seeds

- scan helper exempts a whole fenced block that only mentions branches.py: stripBranchesOutput removes any ``` block whose text contains the word branches.py. A hand-written literal inside such a block passes. Probe: a block with a branches.py line and git checkout sdlc/S-001 gives no match. The prompts have no such block today (no fenced block holds a literal). Tighten the helper to exempt only the output lines. (skills/sdlc/test/prompts.test.mjs)
- the env-detector count assertion was dropped: The old test asserted 'count of `sdlc/run-*` branches) + 1' and refs/heads/sdlc/run-*. The edit replaced both with a doesNotMatch on sdlc/run-. The prompt still says '(count of branches of kind `run`) + 1', so the test no longer pins the numbering rule. Add an assertion for that sentence. (skills/sdlc/test/prompts.test.mjs)
- the spike phrase sits inside a code span: escalator.md writes `a scratch branch named like <slice branch> with -spike added` in backticks, although the phrase is prose. The ADR gives the phrase without backticks. The meaning is clear. (skills/sdlc/prompts/escalator.md)
- the scan helper ignores tilde fences: ~~~ fences are never exempt, so the scan is strict there. No prompt uses them. No action needed unless a prompt adds one. (skills/sdlc/test/prompts.test.mjs)
