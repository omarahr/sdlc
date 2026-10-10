# Verification: S-027a, profile contract, part 0

Round: 0. Commit: a8e86bc. Verdict: pass (5 of 5 cases).

Environment: Node test runner, Python 3 -I through the property testkit, git worktree of sdlc/S-027a

Surface: Prompt files env-detector.md, state-schema.md, slicer.md and _common.md, plus branches.py load_format as a consumer calls it.

Run command: `VERIFY_WT=<worktree of sdlc/S-027a> VERIFY_TESTKIT=<repo>/skills/sdlc/test/testkit VERIFY_SCRATCH=$(mktemp -d) TESTKIT_SEED=27001 node --test .sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`

## TC-contract-1 (VS-1, R-064): env-detector takes branchFormat and holds the quoted rule

- Given: The slice commit a8e86bc of sdlc/S-027a, read as a consumer reads the prompt files.
- When: Read env-detector.md: Inputs line, step 4 text, step numbers, config write step, ste-check.py.
- Then: Inputs lists branchFormat; the R-064 sentence appears once verbatim; steps run 1 to 8; step 7 keeps branchFormat; no cited step number moved; ste-check passes.
- Actual: All assertions held; 17 of 17 tests passed.
- Result: pass
- Spec source: R-064 quote and acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:24`

Evidence (log): node test output for the VS-1 tests, see `.sdlc/slices/S-027a/verification/r0/logs/contract-0.txt`.

## TC-contract-2 (VS-2, R-064): env-detector reads no branch-name rule and keeps commit_message_regex

- Given: The slice commit a8e86bc of sdlc/S-027a, read as a consumer reads the prompt files.
- When: Search env-detector.md for branch-name rule wording and push rule reads.
- Then: No branch-name rule wording exists; the one push rule line names commit_message_regex only; step 4 holds no forge call.
- Actual: All assertions held; 17 of 17 tests passed.
- Result: pass
- Spec source: R-064 acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:56`

Evidence (log): node test output for the VS-2 tests, see `.sdlc/slices/S-027a/verification/r0/logs/contract-0.txt`.

## TC-contract-3 (VS-3, R-002): Fresh run falls back to sdlc/{name}

- Given: The slice commit a8e86bc of sdlc/S-027a, read as a consumer reads the prompt files.
- When: Check the rule order in step 4. Call load_format on 1000 configs with no usable branchFormat, and on 1000 configs with a valid one.
- Then: The order is input, existing value, sdlc/{name}. load_format returns sdlc/{name} for every config without a value and returns the configured value otherwise.
- Actual: All assertions held; 17 of 17 tests passed.
- Result: pass
- Spec source: R-002 acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:75`

Evidence (property-run): load_format, seed 27001, 1000 runs, 0 violations (default), see `.sdlc/slices/S-027a/verification/r0/logs/contract-0.txt`.

Evidence (property-run): load_format, seed 27002, 1000 runs, 0 violations (configured value wins), see `.sdlc/slices/S-027a/verification/r0/logs/contract-0.txt`.

## TC-contract-4 (VS-4, R-065): state-schema documents branchFormat, slice branch and runBranch through the format

- Given: The slice commit a8e86bc of sdlc/S-027a, read as a consumer reads the prompt files.
- When: Parse the config block JSON and read the field descriptions.
- Then: The block holds branchFormat sdlc/{name} after commitFormat; the description matches the spec text; the two phrases exist; no sdlc/run- in the config section; no sdlc/S-001 in the slice example.
- Actual: All assertions held; 17 of 17 tests passed.
- Result: pass
- Spec source: R-065 quote and acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:118`

Evidence (log): node test output for the VS-4 tests, see `.sdlc/slices/S-027a/verification/r0/logs/contract-0.txt`.

## TC-contract-5 (VS-5, R-061): slicer writes the slice branch through the placeholder

- Given: The slice commit a8e86bc of sdlc/S-027a, read as a consumer reads the prompt files.
- When: Read slicer.md and grep all prompts for a branch: sdlc/ instruction.
- Then: slicer.md holds branch: <slice branch> and no sdlc/ literal; no other prompt tells the slicer to write sdlc/<id>; _common.md maps the placeholder to branches.py.
- Actual: All assertions held; 17 of 17 tests passed.
- Result: pass
- Spec source: R-061 acceptance
- Test: `.sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:151`

Evidence (log): node test output for the VS-5 tests, see `.sdlc/slices/S-027a/verification/r0/logs/contract-0.txt`.

## Attacks

None.

## Seeds

- state-schema.md line 220 still names the slice branch as `sdlc/<id>`. It is outside R-061 and R-065.
