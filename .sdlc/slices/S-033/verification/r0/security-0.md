# Verification: security-0

Slice S-033, profile security, round 0, commit 94e98a7, verdict: all 10 cases pass; no in-scope break.

Environment: macOS, Python 3, Node 24, scratch git repos with a local bare origin, TMPDIR set to a scratch directory; macOS refs are case-insensitive, so names differing only by case were tested at function level.

Charter: explore the prune, branch_run, ensure_milestone_branch and janitor with confusable, foreign and malformed names to find a wrong deletion. Threat model: branch names and committed config on leftover branches are untrusted; the format in the repo config is trusted but may be malformed.

## TC-security-1 (VS-1, R-138): Prune deletes only branches that parse to milestone under feature/PROJ-1-{name}

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Only feature/PROJ-1-M-1 and feature/PROJ-1-M-10 go
- Actual: gone = [feature/PROJ-1-M-1, feature/PROJ-1-M-10]; 14 foreign names and the remote refs unchanged
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:75`

```
Foreign names kept: sdlc/M-2, -M-3-e2e, -S-001, -run-1, -M-1x, -m-4, xfeature/..., trailing dash, Cyrillic M, non-breaking hyphen, M-9/x, state-, fullwidth M. Trailing slash ref refused by git.
```

## TC-security-2 (VS-1, R-138): Classification is case sensitive

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Capitalised and lower-cased names give no kind
- Actual: kinds [null,null,null,'milestone']
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:97`

```
Feature/PROJ-1-M-5, feature/PROJ-1-m-5, feature/proj-1-M-5 give null
```

## TC-security-3 (VS-2, R-138): branch_run returns a stored name only when it parses to kind run

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Foreign, empty, non-string, missing and malformed values give the empty string; bad formats give Fail or the empty string
- Actual: 16 stored values under custom and default format, missing key, missing branch, invalid JSON all as expected; 6 bad formats gave Fail or empty, no traceback
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:111`

```
stored main, release/x, sdlc/run-1 (custom), feature/PROJ-1-run-1 (default), 42, list, null, dict, true -> empty string
```

## TC-security-4 (VS-3, R-138): A foreign stored run does not block or prune a leftover milestone branch with unshipped work

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: ensure_milestone_branch returns the branch; branch, remote tip and commit stay
- Actual: 5 foreign values (main, sdlc/run-1, release/x, feature/PROJ-1-S-001, feature/PROJ-1-run-x): no Fail, tips equal, unshipped.txt still readable, prune returned []
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:150`

```
local and remote tips compared before and after
```

## TC-security-5 (VS-4, R-138): A branch naming another real run still refuses

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Fail 'belongs to run' under both formats; no ref changes
- Actual: custom and default format both refused; run-01 and Arabic-digit run still refused; heads equal before and after
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:167`

```
feature/PROJ-1-run-2 and sdlc/run-2 refuse
```

## TC-security-6 (VS-5, R-139): Custom format janitor sweeps only its verify branches

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Done slice's custom verify branch goes; sdlc/, in-progress, attempt, slice, run, milestone and release names stay
- Actual: removed [feature/PROJ-1-S-001-v0-http-api-0, feature/PROJ-1-S-099-v0-http-api-0]; all others stay
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:198`

```
S-099 is not in the ledger and goes by the janitor's documented rule
```

## TC-security-7 (VS-6, R-139): Default format janitor with no key, empty key, no config file, explicit default

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: sdlc/S-001-v0-http-api-0 goes; custom-format and other names stay
- Actual: 4 variants as expected
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:211`

```
feature/PROJ-1-S-001-v0-http-api-0 stays in each
```

## TC-security-8 (VS-7, R-139): janitor.py reads load_format and holds no sdlc/ literal outside prose

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Source holds branches.load_format(repo); only prose lines name sdlc/
- Actual: confirmed; two note strings name .sdlc/slices.json only
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:226`

```
source read
```

## TC-security-9 (VS-7, R-139): Janitor deletes nothing and reports a format with a wrong placeholder count

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: 14 malformed string formats delete nothing; placeholder-count errors are reported
- Actual: no deletion in 14 cases; placeholder errors reported in 5 of 5
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:235`

```
brace, whitespace, NUL, .., ~, .lock, bidi formats pass split and are not reported (seed)
```

## TC-security-10 (VS-7, R-139): Non-string branchFormat is read as absent

- Given: scratch git repo, local bare origin, branches cut from main
- When: the function or script runs against the hostile names
- Expected: Custom-format branches stay
- Actual: 5 non-string values: sdlc/S-001-v0-http-api-0 swept under default, custom branch stays, no note
- Result: pass
- Test: `.sdlc/slices/S-033/verification/r0/tests/security-0/branch-classify.verify-security.test.mjs:258`

```
seed: silent
```

## Attacks

- AT-1 held: Explore prune with confusable names to find a deletion of a non-milestone branch. Input: 13 lookalike and prefix-clash names. Observed: only M-1 and M-10 went.
- AT-2 out-of-scope: Explore prune with unicode digits to find a milestone match for a non-ASCII id. Input: feature/PROJ-1-M-\u0663. Observed: kind milestone: Python \d matches Arabic-Indic digits.
- AT-3 held: Explore branch_run with hostile stored values to find a foreign name taken as run. Input: 16 stored values, 6 bad formats. Observed: as expected.
- AT-4 out-of-scope: Explore branch_run with a non-object committed config to find a traceback. Input: config.json holding [1]. Observed: AttributeError: 'list' object has no attribute 'get' (the line existed before this slice).
- AT-5 held: Explore ensure_milestone_branch with a foreign stored run to find deletion or a false refusal. Input: main, sdlc/run-1, release/x, S-001, run-x. Observed: as expected.
- AT-6 held: Explore the refusal for a real other run to find a weakened guard. Input: run-2, run-01, Arabic-digit run. Observed: refused.
- AT-7 out-of-scope: Explore janitor with malformed and non-string formats to find a wrong deletion. Input: 14 string formats, 5 non-string values. Observed: no string format deleted anything; 9 were not reported; non-string values fall back to the default and sweep.

## Seeds

- branches.parse accepts non-ASCII digits: The row patterns use \d on str, so feature/PROJ-1-M-٣ parses as a milestone and feature/PROJ-1-run-٢ as a run. The prune would delete such a shipped branch. Use [0-9] or re.ASCII. (skills/sdlc/branches.py)
- branch_run raises on a committed config that is not an object: config.json holding [1] on a leftover branch gives AttributeError from .get. The line is older than S-033 but the slice names this function. ensure_milestone_branch would stop with a traceback. (skills/sdlc/state-write.py)
- janitor does not validate the format it loads: Only split() runs. Formats with an unbalanced brace, whitespace, NUL, .., ~ or .lock pass silently. A non-string branchFormat reads as absent, so the janitor sweeps under sdlc/{name} with no note. Call validate_format and add a note for a non-string value. (skills/sdlc/janitor.py)
- scenario VS-5 note differs from the janitor rule: The plan says a branch whose slice is not in the ledger stays. The janitor docstring says it goes. The run followed the docstring. (skills/sdlc/janitor.py)
