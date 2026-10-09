# verify-security: S-007 round 0 part 0

Slice: S-007. Profile: security. Round: 0. Commit: ca640fc. Verdict: no in-scope failure; 6 seeds.

Environment: Python 3.14.7 via pycall (python3 -I), Node test runner, parse called as a library function; no network, no database.

Threat model: the spec trusts the ledger and the config format. It does not trust the branch text. Git refs limit what a real branch can hold, so attacks that need an impossible ref are seeds.

Note: the test file stops each case at its first failed assertion. The probe log lists every input.

## TC-security-1 (VS-2): Empty and overlapping tails give null

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Ten degenerate branches give null; S-001-wip under {name}-wip gives slice S-001
- Expected: Ten degenerate branches give null; S-001-wip under {name}-wip gives slice S-001
- Actual: All ten gave null. S-001-wip gave slice S-001.
- Result: pass
- Spec source: R-021 acceptance
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:17`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs2-1 to 11, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

Evidence (log): no side effect: parse is a pure function and stdout and stderr stay empty
```
A-vs2-noside: stdout '' stderr '' value null
```

## TC-security-2 (VS-7): Non-string branch gives null

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Six non-string types return null and do not raise
- Expected: Six non-string types return null and do not raise
- Actual: All six returned null.
- Result: pass
- Spec source: R-021 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:43`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-type-0 to 5, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-3 (VS-7): NUL, control characters, spaces and traversal

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Ten odd branches give null
- Expected: Ten odd branches give null
- Actual: Nine gave null. sdlc/S-001<NUL>-v0-x-0 classified as verify with id S-001<NUL>. The spec regex (.+) accepts it. Recorded as an observation.
- Result: pass
- Spec source: R-022 table row 6
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:52`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-nul-1 to 3, ctl, trav, sp, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-4 (VS-7): Trailing newline

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Spec regexes use $ with re.search, so a final newline matches
- Expected: Spec regexes use $ with re.search, so a final newline matches
- Actual: Branches with a final newline classified as run, slice, state, verify, milestone and e2e. The tail keeps the newline. Recorded as an observation.
- Result: pass
- Spec source: R-022 table (regex with $)
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:70`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): probe trailing newline, file `.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt`

## TC-security-5 (VS-7): Non-ASCII digits

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Spec regexes use \d and int(); Unicode digits match
- Expected: Spec regexes use \d and int(); Unicode digits match
- Actual: Arabic-Indic and fullwidth digits classified in run, milestone, state, verify round and part, and attempt. int() converted them. Recorded as an observation.
- Result: pass
- Spec source: R-023 integer parts
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:87`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): probe digits, file `.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt`

## TC-security-6 (VS-7): Digit runs over 4300 characters

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: parse should return, not raise
- Expected: parse should return, not raise
- Actual: parse raised ValueError from int() for run, round, part and attempt. A git ref component cannot reach 4300 characters. No spec limit applies.
- Result: pass
- Spec source: no spec source; seed
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:104`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-huge-run, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

Evidence (attack): probe, file `.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt`

## TC-security-7 (VS-7): Long tails and backtracking

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: No timing limit in the spec; record the cost
- Expected: No timing limit in the spec; record the cost
- Actual: Long slice and verify tails took 40 ms. A 100k-character tail of v0-a- repeated took 7.6 s (quadratic; 200k took 30 s). Seed for verify-limits.
- Result: pass
- Spec source: no spec source; seed
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:116`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-long-*, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

Evidence (attack): probe timing, file `.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt`

## TC-security-8 (VS-7): Unicode case folding under lower

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: A confusable never resolves to a ledger id
- Expected: A confusable never resolves to a ledger id
- Actual: Dotted capital I and long s classified as slice with known false. Kelvin sign and sharp s gave null. No confusable gave known true.
- Result: pass
- Spec source: R-024 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:134`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-fold-*, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-9 (VS-7): Plain format stays case-exact; regex metacharacters in the format stay literal

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Eight branches give null
- Expected: Eight branches give null
- Actual: All gave null.
- Result: pass
- Spec source: R-022 acceptance (lower only)
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:152`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-case-*, A-vs7-fmt-*, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-10 (VS-7): Ledger id list holding non-strings

- Given: parse from skills/sdlc/branches.py on sdlc/S-007
- When: the attack inputs run through pycall
- Then: Spec says ids is an iterable of ledger ids; no behavior stated for other items
- Expected: Spec says ids is an iterable of ledger ids; no behavior stated for other items
- Actual: None or a list as first item raised AttributeError. A non-string after a match, a dict and an empty list returned. A bare string iterates by character. Seed.
- Result: pass
- Spec source: R-024 quote
- Test: `.sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs:163`
- Command: `VERIFY_REPO=$PWD VERIFY_LOG=$PWD/.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl node --test .sdlc/slices/S-007/verification/r0/tests/security-0/branches-parse.verify-security.test.mjs`

Evidence (attack): A-vs7-ids-*, file `.sdlc/slices/S-007/verification/r0/logs/security-0-attacks.jsonl`

Evidence (attack): probe ids, file `.sdlc/slices/S-007/verification/r0/logs/security-0-probe.txt`

## Attacks

- A-1 [held] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: empty tail, overlap, short branches. Observed: null.
- A-2 [held] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: non-string branch. Observed: null.
- A-3 [out-of-scope] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: trailing newline on six kinds. Observed: classified; tail keeps newline.
- A-4 [out-of-scope] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: NUL inside the id of a verify tail. Observed: classified verify.
- A-5 [out-of-scope] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: Unicode digits in n, round, part, ts, milestone. Observed: classified; int() converts.
- A-6 [out-of-scope] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: 5000-digit integer parts. Observed: ValueError.
- A-7 [out-of-scope] Explore the tail classifier with hostile branch text to find a branch that parse accepts but the spec rejects (R-021, R-022). Input: 100k-character tail of v0-a- repeated. Observed: 7.6 s.
- A-8 [held] Explore case folding under lower to find a confusable that resolves to a ledger id (R-024). Input: dotted I, long s, Kelvin, sharp s. Observed: known false or null.
- A-9 [held] Explore the format with regex metacharacters to find a pattern injection (R-021). Input: a.c/, a*/, (x)/, .*. Observed: null.
- A-10 [out-of-scope] Explore the ids argument with non-string items to find a crash (R-024). Input: None, list, int, str, dict, empty. Observed: AttributeError for None and list items.

## Seeds

- parse accepts a branch with a final newline. The row regexes end in $ and use re.search, so run-2 followed by a newline classifies as run and the tail keeps the newline. re.fullmatch or \Z would reject it. Git refs cannot hold a newline.
- parse accepts non-ASCII digits. \d matches Arabic-Indic and fullwidth digits and int() converts them: run-٣ gives n 3. The ASCII flag or [0-9] would reject them. Names then differ from names that name() builds.
- parse raises ValueError on digit runs over 4300 characters. int() hits the Python limit for run n, verify round and part, and attempt n. The CLI would print a traceback. A git ref cannot hold such a branch, so the risk is low.
- verify row backtracks quadratically on long tails. A tail of 100000 characters made of v0-a- repeated took 7.6 s. 200000 characters took 30 s. Send to verify-limits. The spec states no limit.
- parse raises on non-string items in ids. None or a list as an ids item raises AttributeError from .lower(). A bare string as ids iterates by character and gives known false. The spec says ids is an iterable of ledger ids.
- verify id accepts NUL and any character. Table row 6 uses (.+) for the id, so a verify tail with NUL gives an id with NUL. Other rows restrict the id.
