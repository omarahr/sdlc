# S-009 · parse precedence: state, verify, attempt, slice rows
Verdict: RELEASED
Commit under test: e072f4e · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 7 | 23 | 23 | 0 | 0 | 0 / 0 | 14 |

## Summary
The slice pins how `parse` classifies the last four branch rows: state, verify, attempt and slice. A tail that fits two rows must go to the earlier row. For example, `S-001-v0-http-api-0` is a verify branch and not a slice branch. The slice adds 11 tests to `skills/sdlc/test/branches.test.mjs` and changes no product code. Three profiles checked it at commit d29cba7: contract (model and property run), cli (the command from a scratch repo) and security (hostile branch names). The verifiers found no blocking defect. Mutation checks showed that the tests fail when the slice row moves before the verify row, or when the state row accepts any number of digits. The open items are seeds that S-007 already left open, such as a trailing newline and non-ASCII digits.

## Open risks
- A trailing newline in a branch name still gives kind state, verify, attempt or slice. Python `$` matches before a final newline. S-007 left this open.
- Non-ASCII digits (for example Arabic-Indic) pass `\d` in the state, verify and attempt rows. `int()` converts them. No spec number or rule forbids them.
- The verify and attempt rows accept any id text, including flag-like text and NUL. A caller that passes `id` to a shell or to git must treat it as untrusted.
- The verify row backtracks in quadratic time: 8000 repeats of `-v0-a` took 1.1 s. The spec states no limit, so no case blocks on it.
- Huge digit runs (5000 digits) give unbounded integers in `round`, `part` and `n`.
- The CLI `parse` command has no flag for ledger ids. The `known` flag is `null` at the CLI. Only the function path checks it.
- The run worktree held an uncommitted edit that removed `parse` during verification. Verifiers tested a separate worktree at d29cba7, so the result holds.
- Two testkit runs timed out once (`property.mjs`, `callPython`). Later runs passed. The cause was probably machine load.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-106 | `| 5 | `state` | `^state-(\d{14})$` | `ts` |` | VS-1, VS-2, VS-6 | TC-contract-1, TC-contract-6, TC-contract-8, TC-cli-1, TC-cli-7 | pass |
| R-107 | `| 6 | `verify` | `^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$` | `id`, `round`, `profile`, `part` |` | VS-2, VS-3, VS-6, VS-7 | TC-contract-2, TC-contract-3, TC-contract-6, TC-contract-7, TC-contract-8, TC-contract-9, TC-cli-2, TC-cli-3, TC-cli-4, TC-cli-7, TC-cli-8, TC-security-1, TC-security-2, TC-security-3, TC-security-5, TC-security-6, TC-security-7 | pass |
| R-108 | `| 7 | `attempt` | `^(.+)-attempt-(\d+)$` | `id`, `n` |` | VS-2, VS-4, VS-6, VS-7 | TC-contract-4, TC-contract-6, TC-contract-7, TC-contract-8, TC-cli-5, TC-cli-7, TC-cli-8 | pass |
| R-109 | `| 8 | `slice` | `^(S-[A-Za-z0-9-]+)$` | `id` |` | VS-2, VS-3, VS-5, VS-6, VS-7 | TC-contract-3, TC-contract-5, TC-contract-6, TC-contract-7, TC-contract-8, TC-cli-4, TC-cli-6, TC-cli-7, TC-cli-8 | pass |

## Scenarios

### VS-1 · A state branch with exactly 14 digits is classified as state
Profiles: contract, cli. Risk: Try sdlc/state-20261008101500 through parse and the CLI.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | State needs exactly 14 digits; ts stays a string | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:53` |
| TC-cli-1 | State branch with 14 digits parses as state; near misses give null | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:47` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-1 · State needs exactly 14 digits; ts stays a string · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** state-20261008101500 gives kind state, ts string; 13 digits, 15 digits, empty, letter in digits, trailing letter give null; CLI agrees
- **Expected** state-20261008101500 gives kind state, ts string; 13 digits, 15 digits, empty, letter in digits, trailing letter give null; CLI agrees **Actual** As expected; CLI parse gives kind state and ts string; CLI on 13 digits gives no kind
- **Spec source:** R-106 acceptance · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): calls; see the profile evidence file in the Appendix.
- Evidence (type-check): surface listing; see the profile evidence file in the Appendix.

#### TC-cli-1 · State branch with 14 digits parses as state; near misses give null · PASS
- **Given** Scratch git repo, format sdlc/{name} **When** branches.py parse for sdlc/state-20261008101500 and nine malformed state tails (13 digits, 15 digits, empty, letters, extra parts) **Then** Kind state with ts string and no id; all malformed tails give kind null; exit 0; tree unchanged
- **Expected** state / ts '20261008101500'; null for malformed **Actual** as expected
- **Spec source:** R-106 acceptance · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [state transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

</details>

### VS-2 · A verify branch splits into id, round, profile and part
Profiles: contract, cli, security. Risk: Try S-001-v0-http-api-0 and S-001-v12-cli-3: round and part are integers.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | Verify row splits id, round, profile, part | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:66` |
| TC-contract-8 | Property: parse equals the spec model, never raises | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:146` |
| TC-contract-9 | Hostile tails never raise; parse is deterministic and does not change ids | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:198` |
| TC-cli-2 | Verify branch splits into id, round, profile, part; boundaries do not give verify | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:65` |
| TC-cli-3 | Hostile tails never crash parse | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:79` |
| TC-security-1 | 1072 corpus tails across 8 wrappers never raise | PASS | `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:22` |
| TC-security-2 | Huge digit runs (5k, 100k) in round, part, n, state | PASS | `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:38` |
| TC-security-3 | Shape attacks on the verify row | PASS | `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:45` |
| TC-security-5 | Wrong prefix or suffix | PASS | `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:82` |
| TC-security-6 | Ledger known flag with hostile ids | PASS | `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:96` |
| TC-security-7 | CLI parse of hostile branches | PASS | `.sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:108` |

<details>
<summary>Case detail (11 cases)</summary>

#### TC-contract-2 · Verify row splits id, round, profile, part · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** S-001-v0-http-api-0 and S-001-v12-cli-3 give integer round and part; profile a-b-c is kept; missing part, round or profile is not verify
- **Expected** S-001-v0-http-api-0 and S-001-v12-cli-3 give integer round and part; profile a-b-c is kept; missing part, round or profile is not verify **Actual** As expected
- **Spec source:** R-107 acceptance · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): calls; see the profile evidence file in the Appendix.

#### TC-contract-8 · Property: parse equals the spec model, never raises · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** For 3000 generated branches under four formats, parse returns the model result, or null where the model gives none
- **Expected** For 3000 generated branches under four formats, parse returns the model result, or null where the model gives none **Actual** 3000 runs, seed 7, 1253 non-null, 0 violations; 41 further seeds (100 to 140) and seeds 1 to 6 and 1208331620 also gave 0 violations
- **Spec source:** R-106 to R-109 quotes · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (property-run): property-run; see the profile evidence file in the Appendix.
- Evidence (log): [property log](../../slices/S-009/verification/r0/logs/contract-0-property.txt)

#### TC-contract-9 · Hostile tails never raise; parse is deterministic and does not change ids · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** 5000-digit round, part, n and ts; control characters; NUL; lone surrogate; 100000-char tails return a value or null
- **Expected** 5000-digit round, part, n and ts; control characters; NUL; lone surrogate; 100000-char tails return a value or null **Actual** 15 hostile inputs all returned; repeated call equal; ids list unchanged
- **Spec source:** VS-2 notes: parse must return a value or null · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): hostile results; see the profile evidence file in the Appendix.
- Evidence (log): [hostile results](../../slices/S-009/verification/r0/logs/contract-0-hostile.txt)

#### TC-cli-2 · Verify branch splits into id, round, profile, part; boundaries do not give verify · PASS
- **Given** format sdlc/{name} **When** parse S-001-v0-http-api-0, S-001-v12-cli-3, S-001-v3-a-b-c-7, S-005b-v1-security-10 and eight malformed tails **Then** Integers for round and part; profile a-b-c whole; malformed tails are not verify
- **Expected** verify rows with integer parts; no verify for malformed **Actual** as expected; a trailing hyphen tail falls to slice by the slice row
- **Spec source:** R-107 acceptance · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [verify transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

#### TC-cli-3 · Hostile tails never crash parse · PASS
- **Given** attack-corpus families huge-integers, control-chars, flag-like-values, oversized, unicode-digits, unicode-whitespace, integer-forms, format-strings, injection, traversal, unicode-confusables (argv-safe) **When** each value is placed in the round, part, attempt n, state ts and id positions: 650 CLI runs **Then** Every run exits 0 with ok true JSON and no traceback
- **Expected** exit 0, ok true, no Traceback **Actual** 650 of 650 as expected
- **Spec source:** R-107 scenario note: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (log): [test run](../../slices/S-009/verification/r0/logs/cli-0-run.txt)

#### TC-security-1 · 1072 corpus tails across 8 wrappers never raise · PASS
- **Given** branch format sdlc/{name} and a hostile tail **When** parse is called through the Python probe or the CLI **Then** every call returns a value or null; round, part and n are integers
- **Expected** every call returns a value or null; round, part and n are integers **Actual** every call returns a value or null; round, part and n are integers
- **Spec source:** R-107 acceptance; VS-2 notes: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Evidence (attack): 1072 corpus tails across 8 wrappers never raise; see the profile evidence file in the Appendix.

#### TC-security-2 · Huge digit runs (5k, 100k) in round, part, n, state · PASS
- **Given** branch format sdlc/{name} and a hostile tail **When** parse is called through the Python probe or the CLI **Then** return without raising
- **Expected** return without raising **Actual** return without raising
- **Spec source:** R-107 acceptance; VS-2 notes: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Evidence (attack): Huge digit runs (5k, 100k) in round, part, n, state; see the profile evidence file in the Appendix.

#### TC-security-3 · Shape attacks on the verify row · PASS
- **Given** branch format sdlc/{name} and a hostile tail **When** parse is called through the Python probe or the CLI **Then** empty profile, missing part: not verify; traversal and shell tails: null; confusable profile: null
- **Expected** empty profile, missing part: not verify; traversal and shell tails: null; confusable profile: null **Actual** empty profile, missing part: not verify; traversal and shell tails: null; confusable profile: null
- **Spec source:** R-107 acceptance; VS-2 notes: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Evidence (attack): Shape attacks on the verify row; see the profile evidence file in the Appendix.

#### TC-security-5 · Wrong prefix or suffix · PASS
- **Given** branch format sdlc/{name} and a hostile tail **When** parse is called through the Python probe or the CLI **Then** null under feature/PROJ-1-{name} and {name}-wip; suffix does not leak into part
- **Expected** null under feature/PROJ-1-{name} and {name}-wip; suffix does not leak into part **Actual** null under feature/PROJ-1-{name} and {name}-wip; suffix does not leak into part
- **Spec source:** R-107 acceptance; VS-2 notes: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Evidence (attack): Wrong prefix or suffix; see the profile evidence file in the Appendix.

#### TC-security-6 · Ledger known flag with hostile ids · PASS
- **Given** branch format sdlc/{name} and a hostile tail **When** parse is called through the Python probe or the CLI **Then** S-002 false, S-0011 false, S-001 true, ledger spelling under {name:lower}
- **Expected** S-002 false, S-0011 false, S-001 true, ledger spelling under {name:lower} **Actual** S-002 false, S-0011 false, S-001 true, ledger spelling under {name:lower}
- **Spec source:** R-107 acceptance; VS-2 notes: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Evidence (attack): Ledger known flag with hostile ids; see the profile evidence file in the Appendix.

#### TC-security-7 · CLI parse of hostile branches · PASS
- **Given** branch format sdlc/{name} and a hostile tail **When** parse is called through the Python probe or the CLI **Then** exit 0 or 2, JSON output, no traceback, repo tree unchanged
- **Expected** exit 0 or 2, JSON output, no traceback, repo tree unchanged **Actual** exit 0 or 2, JSON output, no traceback, repo tree unchanged
- **Spec source:** R-107 acceptance; VS-2 notes: parse returns a value or null and never raises · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Evidence (attack): CLI parse of hostile branches; see the profile evidence file in the Appendix.

</details>

### VS-3 · A verify tail wins over the slice row
Profiles: contract, cli. Risk: S-001-v0-http-api-0 also fits the slice regex.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | Verify wins over slice row, under four formats | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:81` |
| TC-cli-4 | Verify wins over slice and attempt, in all formats | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:97` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-3 · Verify wins over slice row, under four formats · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** S-001-v0-http-api-0 and S-fix-M-1-2-v1-cli-0 give kind verify under default, prefix, suffix and lower formats; id S-fix-M-1-2
- **Expected** S-001-v0-http-api-0 and S-fix-M-1-2-v1-cli-0 give kind verify under default, prefix, suffix and lower formats; id S-fix-M-1-2 **Actual** As expected
- **Spec source:** R-107, R-109 quote and acceptance (first match wins, section 2 table order) · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): formats; see the profile evidence file in the Appendix.

#### TC-cli-4 · Verify wins over slice and attempt, in all formats · PASS
- **Given** formats sdlc/{name}, feature/PROJ-1-{name}, {name}-wip **When** parse S-001-v0-http-api-0, S-fix-M-1-2-v1-cli-0, the same under prefix and suffix, and S-001-attempt-2-v0-cli-0 **Then** kind verify with the right id each time
- **Expected** verify **Actual** as expected
- **Spec source:** R-107, R-109 acceptance · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [precedence transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

</details>

### VS-4 · An attempt branch gives id and an integer n
Profiles: contract, cli. Risk: Try S-001-attempt-2 and S-005b-attempt-10.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | Attempt row gives id and integer n and wins over slice row | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:91` |
| TC-cli-5 | Attempt branch gives id and integer n; malformed tails are not attempt | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:105` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-4 · Attempt row gives id and integer n and wins over slice row · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** S-001-attempt-2 gives n 2, S-005b-attempt-10 gives n 10; missing, letter and trailing-hyphen numbers are not attempt
- **Expected** S-001-attempt-2 gives n 2, S-005b-attempt-10 gives n 10; missing, letter and trailing-hyphen numbers are not attempt **Actual** As expected
- **Spec source:** R-108 acceptance · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): calls; see the profile evidence file in the Appendix.

#### TC-cli-5 · Attempt branch gives id and integer n; malformed tails are not attempt · PASS
- **Given** format sdlc/{name} **When** parse S-001-attempt-2, S-005b-attempt-10, S-fix-M-1-2-attempt-0 and six malformed tails **Then** attempt with integer n; malformed are not attempt; attempt- falls to slice
- **Expected** attempt rows; no attempt for malformed **Actual** as expected
- **Spec source:** R-108 acceptance · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [attempt transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

</details>

### VS-5 · A slice branch gives kind slice and keeps the full id
Profiles: contract, cli. Risk: Try S-001, S-fix-M-1-2 and S-005b.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | Slice row keeps full id; foreign shapes give null | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:102` |
| TC-cli-6 | Slice branch keeps the full id; foreign shapes give null | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:115` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-5 · Slice row keeps full id; foreign shapes give null · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** S-001, S-fix-M-1-2, S-005b give kind slice with full id; sdlc/S-, sdlc/X-001, sdlc/S-001/x, sdlc/s-001 give null; s-001 is slice under {name:lower}
- **Expected** S-001, S-fix-M-1-2, S-005b give kind slice with full id; sdlc/S-, sdlc/X-001, sdlc/S-001/x, sdlc/s-001 give null; s-001 is slice under {name:lower} **Actual** As expected
- **Spec source:** R-109 acceptance · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): calls; see the profile evidence file in the Appendix.

#### TC-cli-6 · Slice branch keeps the full id; foreign shapes give null · PASS
- **Given** format sdlc/{name} and feature/PROJ-1-{name:lower} **When** parse S-001, S-fix-M-1-2, S-005b, eight null shapes, and s-001 under the lower format **Then** slice rows with full id; nulls; lower format gives slice
- **Expected** as the plan notes **Actual** as expected
- **Spec source:** R-109 acceptance · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [slice transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

</details>

### VS-6 · Rows 5 to 8 classify the same under prefixed and suffixed formats
Profiles: contract, cli. Risk: Run one branch per row under feature/PROJ-1-{name} and {name}-wip.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | Rows 5 to 8 give the model result under prefix and suffix formats | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:114` |
| TC-cli-7 | Rows 5 to 8 classify the same under prefix and suffix formats | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:125` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-6 · Rows 5 to 8 give the model result under prefix and suffix formats · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** Seven tails under three formats equal the model; suffix does not leak into part or n; wrong prefix or suffix gives null
- **Expected** Seven tails under three formats equal the model; suffix does not leak into part or n; wrong prefix or suffix gives null **Actual** As expected
- **Spec source:** R-106 to R-109 quotes · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): calls; see the profile evidence file in the Appendix.

#### TC-cli-7 · Rows 5 to 8 classify the same under prefix and suffix formats · PASS
- **Given** formats feature/PROJ-1-{name} and {name}-wip **When** parse one branch per row, plus wrong prefix and wrong suffix branches **Then** Same kind and parts; tail excludes prefix and suffix; wrong prefix or suffix gives null
- **Expected** same classification **Actual** as expected
- **Spec source:** R-106 to R-109 acceptance · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [format transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

</details>

### VS-7 · The ledger flag known follows the id on rows 6 to 8
Profiles: contract, cli. Risk: With ids [S-001], slice, attempt and verify branches of S-001 give known true.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | Known flag follows the id on rows 6 to 8 | PASS | `.sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs:126` |
| TC-cli-8 | Without ids the CLI gives known null on rows 6 to 8 | PASS | `.sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs:146` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-7 · Known flag follows the id on rows 6 to 8 · PASS
- **Given** parse(fmt, branch, ids=None) imported by path from skills/sdlc/branches.py through the property probe (python3 -I) **When** The test calls parse with the branches named in the scenario notes, and compares with a model written from the spec table **Then** ids [S-001]: slice, attempt, verify of S-001 known true; S-002 false; state null; {name:lower} returns ledger spelling S-001
- **Expected** ids [S-001]: slice, attempt, verify of S-001 known true; S-002 false; state null; {name:lower} returns ledger spelling S-001 **Actual** As expected
- **Spec source:** Section 2 text on ids and known · **Run:** `SDLC_REPO=<worktree of sdlc/S-009 at d29cba7> node --test .sdlc/slices/S-009/verification/r0/tests/contract-0/parse-rows.verify-contract.test.mjs`
- Evidence (transcript): calls; see the profile evidence file in the Appendix.

#### TC-cli-8 · Without ids the CLI gives known null on rows 6 to 8 · PASS
- **Given** parse has no --ids flag **When** parse slice, attempt, verify and state branches; parse under the lower format **Then** known is null; id keeps the branch spelling
- **Expected** known null (the CLI has no ledger input) **Actual** as expected; ledger known true or false is reachable only through the function, which the contract profile covers
- **Spec source:** R-107 to R-109 acceptance (id and kind) · **Run:** `node --test .sdlc/slices/S-009/verification/r0/tests/cli-0/parse-rows.verify-cli.test.mjs`
- Evidence (transcript): [help and known transcripts](../../slices/S-009/verification/r0/logs/cli-0-transcripts-core.txt)

</details>

## How it was attacked
Security session, round 0, charter VS-2. The charter was to explore the verify, attempt and state rows with the attack corpus and find a raise or a wrong verify. The threat model treats branch names as untrusted text. The spec states no size limit. The session tried 8 attacks: 6 held and 2 were out of scope (trailing newline with non-ASCII digits, and quadratic backtracking). No attack broke the slice.

<details>
<summary>Attack table</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| AT-1 raise search | 134 corpus tails x 8 wrappers | no exception | no exception | held |
| AT-2 huge digits | 5k and 100k digit runs | integer or null | returns | held |
| AT-3 verify shape | empty profile, no part, unicode, traversal, shell | no wrong verify | empty profile and no part give slice; others null | held |
| AT-4 newline and digits | trailing newline, Arabic-Indic digits | seed only | newline gives verify; digits give integer 3 | out of scope |
| AT-5 format spoofing | wrong prefixes and suffixes | null | null | held |
| AT-6 ledger spoofing | `S-0011`, `s-001` | known false | known false | held |
| AT-7 CLI | `-x`, `--help`, 100 kB tail | JSON, no side effect | JSON, tree unchanged | held |
| AT-8 backtracking | `S-001` plus 8000 repeats of `-v0-a` | no spec limit | 1.1 s at 8000, 0.28 s at 4000 | out of scope |

</details>

The contract session also ran four mutations of `branches.py`. Moving the slice row before the verify row failed 6 of 10 tests. Changing the state row to `\d+` failed VS-1. Changing the attempt row to `\d*` failed VS-4 and the property run. A greedy verify profile group failed no test. It is an equivalent mutant, because the part group takes the last digits.

## Defects found on the way
- **Blocking defects:** none. The core verifiers (spec fidelity r0, regression r0) and the reviews (architecture, security) found no blocking defect.
- **Seeds:** open seeds only.

| Seed | Found by | File |
|---|---|---|
| T-R-108b repeats a check that T-R-108a makes | test review | `skills/sdlc/test/branches.test.mjs` |
| Trailing newline accepted by rows 5 to 8 | verify-contract, verify-cli, verify-security | `skills/sdlc/branches.py` |
| Non-ASCII digits accepted by `\d` | verify-contract, verify-cli, verify-security | `skills/sdlc/branches.py` |
| Attempt and verify rows accept any id text | verify-contract | `skills/sdlc/branches.py` |
| Verify id is not checked against the slice id shape | verify-security | `skills/sdlc/branches.py` |
| Huge digit runs give unbounded integers | verify-contract | `skills/sdlc/branches.py` |
| Verify row backtracks in quadratic time | verify-security | `skills/sdlc/branches.py` |
| Public names beyond the spec API (`PARSE_ROWS`, `INTEGER_PARTS`) | verify-contract | `skills/sdlc/branches.py` |
| CLI parse has no way to pass ledger ids | verify-cli | `skills/sdlc/branches.py` |
| Run worktree edited during verification | verify-contract | `skills/sdlc/branches.py` |
| One property batch timed out once | verify-contract | `skills/sdlc/test/testkit/property.mjs` |
| `callPython` hangs intermittently on a 200 kB input | verify-security | `skills/sdlc/test/testkit/property.mjs` |

## Appendix
- Toolkit tools used: `property` (`skills/sdlc/test/testkit/property.mjs`), `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `attack-corpus` (`skills/sdlc/test/testkit/attack-corpus.mjs`).
- Plan: [plan-r0.md](../../slices/S-009/verification/plan-r0.md), [plan-r0.json](../../slices/S-009/verification/plan-r0.json).
- Profile evidence r0: [contract](../../slices/S-009/verification/r0/contract-0.md), [cli](../../slices/S-009/verification/r0/cli-0.md), [security](../../slices/S-009/verification/r0/security-0.md).
- Core verifiers: [spec fidelity r0](../../slices/S-009/verify-spec-fidelity-r0.md), [regression r0](../../slices/S-009/verify-regression-r0.md). Reviews: [architecture](../../slices/S-009/review-architecture-r0.md), [security](../../slices/S-009/review-security-r0.md). Gate: [gate-r0](../../slices/S-009/gate-r0.md).
- Missing sources: `failures.md` does not exist for this slice, because no round failed.
