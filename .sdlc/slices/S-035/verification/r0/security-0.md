# S-035 security part 0, round 0

Commit: 5040928. Verdict: verified (9 of 9 cases pass).

Threat model: prompt authors and branch creators are trusted. The guarantee is that Clean up deletes only the slice's attempt branches and that prompts hold no branch literal.

Test file: `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs`

Run: `node --test .sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs`

## TC-security-1 (VS-1): Scratch repo with S-1, S-10, S-1a, S-11 attempts: filter keeps only S-1

- Expected: Only sdlc/S-1-attempt-1 and -2 remain after the id filter
- Actual: kept S-1-attempt-1 and S-1-attempt-2; S-10, S-1a, S-11 dropped; repo refs unchanged by list
- Result: pass
- Source: R-131 acceptance

## TC-security-2 (VS-1): Slice with no attempt branches

- Expected: Filter returns nothing
- Actual: zero entries kept; no branch named for deletion
- Result: pass
- Source: R-131 acceptance

## TC-security-3 (VS-1): Hostile names (trailing dash, non-numeric n, nested attempt, unicode hyphen, traversal)

- Expected: Only real S-1 attempts match the S-1 filter
- Actual: list exit 0; nested name gets id S-1-attempt-1 so S-1 filter drops it; non-ascii digit name parses as S-1 (seed)
- Result: pass
- Source: R-131 acceptance

## TC-security-4 (VS-1): Flag-like corpus values as --kind

- Expected: list refuses with no tree change
- Actual: 8 flag-like values: nonzero exit, tree unchanged
- Result: pass
- Source: R-131 acceptance

## TC-security-5 (VS-1): Clean up section text

- Expected: No glob, no -attempt-*, no --list, no for-each-ref; names the filter
- Actual: all asserts hold
- Result: pass
- Source: R-131 acceptance

## TC-security-6 (VS-2): Planted literals in integrator.md (11 variants incl. code span, table cell, quotes, fenced block)

- Expected: scan flags each
- Actual: all 11 flagged; real file clean; holds <slice branch> and <run branch>
- Result: pass
- Source: R-143 acceptance

## TC-security-7 (VS-2): Literal inside a fenced block that also names branches.py

- Expected: scan sees it only if exemption is narrow
- Actual: literal in such a block is NOT flagged (exemption covers whole block); unclosed fence is not exempt; paired fence plus later literal is flagged
- Result: pass
- Source: R-143 acceptance

## TC-security-8 (VS-2): Lookalike separator (U+2215) and zero-width space after slash

- Expected: Zero-width variant flagged; lookalike slash not a branch literal
- Actual: zero-width flagged; U+2215 not flagged (not a real branch)
- Result: pass
- Source: R-143 acceptance

## TC-security-9 (VS-3): escalator.md and state-writer.md clean; planted literal flagged; .sdlc/ paths not flagged

- Expected: no false positive on .sdlc/
- Actual: clean; planted flagged; .sdlc/slices not flagged
- Result: pass
- Source: R-145 / R-147 acceptance

## Attacks

- A-1 (held): Explore branch filtering with prefix ids to find deletion of another slice's attempts. Input: S-10, S-11, S-1a attempts vs slice S-1. Observed: only S-1 kept.
- A-2 (held): Explore branch parsing with nested attempt names. Input: sdlc/S-1-attempt-1-attempt-2. Observed: id parsed as S-1-attempt-1; S-1 filter drops it.
- A-3 (out-of-scope): Explore unicode digits in the attempt number. Input: sdlc/S-1-attempt-U+0663. Observed: parsed as S-1 attempt n=3; the integrator would delete it.
- A-4 (held): Explore flag-like values in --kind. Input: flag-like corpus, 8 values. Observed: nonzero exit; tree unchanged.
- A-5 (out-of-scope): Explore the scan exemption for branches.py output blocks. Input: fenced block with branches.py and a literal. Observed: literal hidden.
- A-6 (held): Explore literal variants in code span, table cell, quotes. Input: 11 planted variants. Observed: all flagged.

## Seeds

- scan exemption hides literals in any fenced block that names branches.py: stripBranchesOutput drops a whole fenced block when it holds the text branches.py. A block with a literal branch and a branches.py command passes the scan. Narrow the exemption to the output lines. Needs a prompt author who writes such a block.
- branches.py parses a non-ascii digit attempt number: sdlc/S-1-attempt-U+0663 parses as an attempt of S-1 with n=3, so Clean up would delete it. Needs write access to the repo's branches, so it is inside the trusted boundary.
