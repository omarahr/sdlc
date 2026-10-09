# S-013 verify-contract, round 0, part 0

- Slice: S-013
- Profile: contract
- Round: 0
- Commit: fe02f01
- Verdict: verified. 24 of 24 cases pass.

Environment: Python 3.14.7, Node test runner, gh shim from testkit stub-server, property seed 20261010.

## Surface

Listing at `.sdlc/slices/S-013/verification/r0/logs/contract-0-surface.txt`. The new exports are `read_rules(repo, samples)`, `make_rule`, `github_rule`, `RULE_KEYS` and `GH_TIMEOUT`.

## TC-contract-1 (VS-1): One gh call per sample, argv list, every slash %2F, cwd is the repo

- Given: 14 samples incl. space, %, ?, #, .., unicode, leading dash, newline, quote, $(id), empty
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: One gh call per sample, argv list, every slash %2F, cwd is the repo
- Actual: as expected
- Result: pass
- Spec source: R-027 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:45`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-2 (VS-1): Forge absent, empty, gitlab, non-string or wrong case makes no call and keeps the result shape

- Given: 7 forge values
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Forge absent, empty, gitlab, non-string or wrong case makes no call and keeps the result shape
- Actual: as expected
- Result: pass
- Spec source: R-027 quote; plan: forge other than github
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:61`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-3 (VS-1): Empty sample list makes no call and is a successful read

- Given: samples []
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Empty sample list makes no call and is a successful read
- Actual: as expected
- Result: pass
- Spec source: R-027 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:73`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-4 (VS-2): Only branch_name_pattern objects become rules with the five keys; junk items are skipped

- Given: 11 mixed items
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Only branch_name_pattern objects become rules with the five keys; junk items are skipped
- Actual: as expected
- Result: pass
- Spec source: R-028 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:82`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-5 (VS-2): negate defaults false; label falls back name, ruleset id, constant; empty name falls through

- Given: 6 objects
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: negate defaults false; label falls back name, ruleset id, constant; empty name falls through
- Actual: as expected
- Result: pass
- Spec source: R-028 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:97`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-6 (VS-2): Non-bool negate values still give a bool

- Given: negate "false", 0, null, 1
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Non-bool negate values still give a bool
- Actual: as expected
- Result: pass
- Spec source: R-028 quote
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:115`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-7 (VS-3): Each sample keeps its own rules; union has no duplicates; empty body stays empty

- Given: 4 samples, overlapping bodies
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Each sample keeps its own rules; union has no duplicates; empty body stays empty
- Actual: as expected
- Result: pass
- Spec source: ADR f2cc; R-028
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:123`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-8 (VS-3): Rules that differ in negate or label are not merged

- Given: 3 near-equal rules
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Rules that differ in negate or label are not merged
- Actual: as expected
- Result: pass
- Spec source: R-028 (rule identity)
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:138`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-9 (VS-3): Duplicate sample names

- Given: samples [dup, dup]
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Duplicate sample names
- Actual: as expected
- Result: pass
- Spec source: R-027 acceptance (one call per sample)
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:144`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-10 (VS-4): Exit 1 with stderr gives one note with the stderr text; the read ends at the first failure

- Given: second of three calls fails
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Exit 1 with stderr gives one note with the stderr text; the read ends at the first failure
- Actual: as expected
- Result: pass
- Spec source: R-029 quote and acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:163`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-11 (VS-4): Exit 1 with empty stderr still gives a reason

- Given: exit 1, no stderr
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Exit 1 with empty stderr still gives a reason
- Actual: as expected
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:174`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-12 (VS-4): Non-JSON, object, scalar, null, empty output are failures with one note

- Given: 8 outputs
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Non-JSON, object, scalar, null, empty output are failures with one note
- Actual: as expected
- Result: pass
- Spec source: R-029 quote
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:181`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-13 (VS-4): Deeply nested JSON (200000 levels) and 50000 rules do not crash

- Given: nested and big bodies
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Deeply nested JSON (200000 levels) and 50000 rules do not crash
- Actual: as expected
- Result: pass
- Spec source: R-029 (failure is a note, never a crash)
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:189`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-14 (VS-4): Stderr with NUL, escape codes, invalid bytes and 200 KB of text gives one note and serializable result

- Given: stderr 200 KB
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Stderr with NUL, escape codes, invalid bytes and 200 KB of text gives one note and serializable result
- Actual: as expected
- Result: pass
- Spec source: R-029 quote
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:201`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-15 (VS-4): Hung gh ends by the timeout and gives one note

- Given: gh sleeps 600 s
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Hung gh ends by the timeout and gives one note
- Actual: as expected
- Result: pass
- Spec source: R-029 quote (network error)
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:210`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-16 (VS-4): gh does not wait on stdin and sees GH_PROMPT_DISABLED=1

- Given: gh reads stdin
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: gh does not wait on stdin and sees GH_PROMPT_DISABLED=1
- Actual: as expected
- Result: pass
- Spec source: R-029 quote (not signed in is a note)
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:220`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-17 (VS-5): gh absent from PATH is one note and unchecked; no raise

- Given: PATH holds python3 and git
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: gh absent from PATH is one note and unchecked; no raise
- Actual: as expected
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:229`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-18 (VS-5): gh not executable or a directory is one note

- Given: 2 variants
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: gh not executable or a directory is one note
- Actual: as expected
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:240`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-19 (VS-5): gh with a broken shebang is one note

- Given: shebang to a missing interpreter
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: gh with a broken shebang is one note
- Actual: as expected
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:252`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-20 (VS-6): Forge config problems (absent, empty, wrong type, non-object JSON, missing .sdlc) give an unchecked result and no call

- Given: 6 configs
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Forge config problems (absent, empty, wrong type, non-object JSON, missing .sdlc) give an unchecked result and no call
- Actual: as expected
- Result: pass
- Spec source: R-027; plan T-R-027b
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:261`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-21 (VS-6): Invalid JSON, invalid UTF-8, deep nesting, directory, unreadable, symlink loop raise Fail with the load_format text

- Given: 6 broken configs
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: Invalid JSON, invalid UTF-8, deep nesting, directory, unreadable, symlink loop raise Fail with the load_format text
- Actual: as expected
- Result: pass
- Spec source: plan: config errors keep one message
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:282`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-22 (VS-6): load_format results unchanged (property, 1000 runs, seed 20261010)

- Given: arb.configShape
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: load_format results unchanged (property, 1000 runs, seed 20261010)
- Actual: as expected
- Result: pass
- Spec source: plan: load_format results unchanged
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:315`
- Evidence:
  - property run: `property load_format: seed=20261010 runs=1000 violations=0`
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-23 (VS-2): read_rules equals the model written from the spec over random bodies and samples (property, 1000 runs, seed 20261010)

- Given: 1000 runs, 0-3 samples, 0-4 objects each
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: read_rules equals the model written from the spec over random bodies and samples (property, 1000 runs, seed 20261010)
- Actual: as expected
- Result: pass
- Spec source: R-027, R-028 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:324`
- Evidence:
  - property run: `property read_rules: seed=20261010 runs=1000 failures=0`
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## TC-contract-24 (VS-1): read_rules does not change the repo files

- Given: file list before and after
- When: read_rules(repo, samples) runs with a gh shim on PATH (or no gh)
- Then and expected: read_rules does not change the repo files
- Actual: as expected
- Result: pass
- Spec source: Mutation rule (inputs not mutated)
- Test: `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:332`
- Evidence:
  - run output: `.sdlc/slices/S-013/verification/r0/logs/contract-0-run.txt`

## Attacks

None. The security profile covers hostile samples.

## Seeds

- read_rules takes samples, the spec names read_rules(repo): Spec section 2 lists read_rules(repo). The code has read_rules(repo, samples) per ADR f2cc. It also exports make_rule, github_rule, RULE_KEYS and GH_TIMEOUT, which the spec does not list.
- Rule union deduplication is quadratic: `if rule not in result["rules"]` scans a list. 5000 rules take 0.31 s, 10000 take 1.24 s, 20000 take 4.87 s. One call with 50000 rules took about 37 s. Real GitHub bodies are small.
- Duplicate sample names overwrite by_sample: samples [dup, dup] make two gh calls. The second body replaces the first under one key. A first body with rules and a second with [] gives by_sample {dup: []}.
- A non-bool negate turns into True by bool(): negate "false" gives true, and 1 gives true. GitHub sends a bool, so the effect is small. The spec says parameters.negate or false.
- The failure note keeps all stderr text: 200 KB of stderr with NUL and escape codes gives one note of 200045 characters, passed on unchanged. S-015 prints the note to a terminal.
- Timeout note exposes the argv text: The hung gh note reads: Command '['gh', 'api', 'repos/{owner}/{repo}/rules/branches/s1']' timed out after 60 seconds. It is correct but long.
