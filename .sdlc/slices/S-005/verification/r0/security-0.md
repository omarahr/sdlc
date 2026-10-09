# S-005 verification: security, part 0, round 0

- Slice: S-005
- Profile: security
- Round: 0
- Commit: 6aa869e
- Verdict: not refuted. 13 cases, 13 pass.

Environment: macOS, Python 3.14.7, Node test runner, git; scratch git repos from the testkit cli-runner (TZ=UTC, scratch HOME).

## Threat model

The callers of `branches.py name` are the loop and its scripts. They are trusted. The spec does not say that `name` must give a valid git ref. Hostile part values are therefore seeds, not blockers. The spec requires one JSON object per command and exit 2 on bad input. R-119 requires that no script pushes a verify branch or opens a request for it.

## Charters

- VS-2: Explore the explicit state ts with traversal, control and non-string values to find a crash or a lost prefix (R-008 acceptance).
- VS-4: Explore verify parts with missing, malformed and corpus values to find a crash, a side effect or an unnamed refusal (R-009, spec section 2).
- VS-6: Explore attempt parts the same way (R-010, spec section 2).
- VS-8: Explore the scripts and prompts for a push or a request that names a verify branch, and mutate the loop to test T-R-119 (R-119 acceptance).

## TC-security-1 (VS-2): An explicit state ts is used as given; empty and None generate a timestamp

- Given: branches.py loaded by path through python3 -I
- When: name('sdlc/{name}','state', ts=...) with '20261008101500', '', None, 0, '0'
- Then: the explicit value is in the tail as given
- Expected: sdlc/state-20261008101500; 14 UTC digits for '' and None; sdlc/state-0 for 0 and '0'
- Actual: as expected
- Result: pass
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:71`
- Command: `node --test --test-name-pattern "VS-2 an explicit" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

ts values:

```
ts='20261008101500' -> sdlc/state-20261008101500
ts='' -> sdlc/state-<14 digits>
ts=None -> sdlc/state-<14 digits>
ts=0 -> sdlc/state-0
ts='0' -> sdlc/state-0
```

## TC-security-2 (VS-2): Hostile ts values never raise an unhandled exception and keep the prefix

- Given: 103 ts values: traversal, control chars, injection, format strings, unicode whitespace and confusables, oversized, NUL, non-strings
- When: name('sdlc/{name}','state', ts=v) for each
- Then: each call returns a name that starts with sdlc/state-
- Expected: no exception other than Fail; prefix kept
- Actual: no exception; prefix kept; 48 of 103 names fail git check-ref-format (seed)
- Result: pass
- Spec source: spec section 2: every command prints one JSON object, exit 2 on bad input
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:86`
- Command: `node --test --test-name-pattern "VS-2 hostile ts" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

ts corpus:

```
see log
```

attack log: `.sdlc/slices/S-005/verification/r0/logs/security-0-attacks.txt`

## TC-security-3 (VS-2): The CLI refuses --ts with one JSON error

- Given: a scratch git repo
- When: name --kind state --ts 20261008101500, --ts=x, --t 1
- Then: exit 2, one JSON line, ok false, no traceback, no file or ref change
- Expected: exit 2 with one JSON error
- Actual: exit 2, {"ok": false, "error": "unrecognized arguments: ..."}, tree unchanged
- Result: pass
- Spec source: spec section 2 CLI synopsis (no --ts) and exit 2 rule
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:98`
- Command: `node --test --test-name-pattern "VS-2 the CLI has no" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

--ts:

```
name --kind state --ts 20261008101500 -> exit 2, ok false, tree unchanged
```

## TC-security-4 (VS-4): Each missing or empty verify part exits 2 and names the part

- Given: a scratch git repo
- When: name --kind verify with each of --id, --round, --profile, --part dropped or empty; tail('verify') with None or '' for each
- Then: exit 2, one JSON error naming the part; API raises Fail naming the part
- Expected: Fail naming the part
- Actual: as expected; tree unchanged on every call
- Result: pass
- Spec source: spec section 2: a missing part is a Fail; exit 2 on bad input
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:107`
- Command: `node --test --test-name-pattern "VS-4 each missing" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

missing parts:

```
--profile dropped -> exit 2 {"ok": false, "error": "a verify branch name needs a non-empty profile"}
--round '' -> exit 2 (argparse int refuses '')
```

## TC-security-5 (VS-4): Malformed --round and --part exit 2 or give an integer tail, never a crash

- Given: integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like values, -1, 1.5, 0x1, ' 1'
- When: name --kind verify --round v / --part v
- Then: exit 0 with an integer tail or exit 2 with one JSON error; no traceback; no file or ref change
- Expected: clean refusal or integer tail
- Actual: no crash; argparse int() accepts -1, +1, 1_000, padded whitespace, unicode digits and up to 4300 digits; 4301 digits exits 2. Negative values give S-001-v-1-... (seed)
- Result: pass
- Spec source: spec section 2: exit 2 with ok false on bad input
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:124`
- Command: `node --test --test-name-pattern "VS-4 malformed" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

accepted integer forms: `.sdlc/slices/S-005/verification/r0/logs/security-0-attacks.txt`

## TC-security-6 (VS-4): Hostile --id and --profile never crash, never change state, keep the sdlc/ prefix

- Given: every argv-safe attack-corpus entry (125)
- When: name --kind verify --id v / --profile v (250 calls)
- Then: exit 0 or 2, one JSON line, no traceback, tree unchanged, branch starts with sdlc/
- Expected: no crash, no side effect
- Actual: as expected; 73 names fail git check-ref-format (seed)
- Result: pass
- Spec source: spec section 2: one JSON object per command
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:141`
- Command: `node --test --test-name-pattern "VS-4 hostile" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

ref-unsafe examples: `.sdlc/slices/S-005/verification/r0/logs/security-0-attacks.txt`

## TC-security-7 (VS-6): A missing attempt part exits 2 and names the part

- Given: a scratch git repo
- When: name --kind attempt without --id or --n, or with ''; tail('attempt') without id or n
- Then: exit 2 naming the part; Fail naming the part
- Expected: Fail naming the part
- Actual: as expected
- Result: pass
- Spec source: spec section 2: a missing part is a Fail
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:161`
- Command: `node --test --test-name-pattern "VS-6 a missing" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

missing n:

```
--n dropped -> exit 2 {"ok": false, "error": "a attempt branch name needs a non-empty n"}
```

## TC-security-8 (VS-6): Malformed --n exits 2 or gives an integer tail, never a crash

- Given: integer-forms, unicode-digits, huge-integers, unicode-whitespace, flag-like, injection, -1, abc, 1.0
- When: name --kind attempt --n v
- Then: exit 0 with an integer tail or exit 2 with one JSON error
- Expected: clean refusal or integer tail
- Actual: no crash; abc and 1.0 exit 2; -1 gives S-001-attempt--1 (seed)
- Result: pass
- Spec source: spec section 2: exit 2 with ok false on bad input
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:177`
- Command: `node --test --test-name-pattern "VS-6 malformed" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

accepted --n forms: `.sdlc/slices/S-005/verification/r0/logs/security-0-attacks.txt`

## TC-security-9 (VS-6): Hostile attempt --id never crashes and keeps the prefix and suffix

- Given: every argv-safe attack-corpus entry
- When: name --kind attempt --id v --n 1
- Then: exit 0 or 2, one JSON line, no traceback, tree unchanged; branch is sdlc/...-attempt-1
- Expected: no crash, no side effect
- Actual: as expected
- Result: pass
- Spec source: spec section 2: one JSON object per command
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:192`
- Command: `node --test --test-name-pattern "VS-6 hostile" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

attempt id corpus:

```
125 calls, all exit 0 or 2, tree unchanged
```

## TC-security-10 (VS-8): Every push or request call in the scripts targets a run or milestone branch

- Given: sdlc-loop.js, skills/sdlc/*.py and tracker/*.py
- When: scan code lines for git push argv, a lone "push" argv line, and pr/mr create
- Then: only the three state-write.py pushes: run branch, leased delete gated on MILESTONE_BRANCH, milestone branch; MILESTONE_BRANCH matches no verify name
- Expected: no push or request names a verify branch
- Actual: as expected; no gh pr create or glab mr create anywhere
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:211`
- Command: `node --test --test-name-pattern "VS-8 every push" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

push call lines:

```
state-write.py:248 git(repo, "push", "-q", "origin", run, ...)
state-write.py:425 git(repo, "push", ..., f":{branch}") gated on MILESTONE_BRANCH
state-write.py:464 git(repo, "push", "-q", "-u", "origin", want, ...)
```

## TC-security-11 (VS-8): The verify prompts never tell an agent to push or open a request

- Given: prompts/verify-*.md, verify-collector.md and verify-profile-common.md
- When: search for push, pr create, mr create, pull request, merge request
- Then: no match
- Expected: no instruction to push a verify branch
- Actual: no match
- Result: pass
- Spec source: R-119 acceptance (a verify branch stays local)
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:238`
- Command: `node --test --test-name-pattern "VS-8 the verify-profile" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

prompt scan:

```
prompts/verify-*.md: 0 matches
```

## TC-security-12 (VS-8): The committed T-R-119 passes on the slice and catches a push of branch(g) added to verifyPhase

- Given: a copy of skills/sdlc
- When: run T-R-119 on the copy; then add `const pushIt = g => agent(`git push origin ${branch(g)}`)` to verifyPhase and run it again
- Then: pass on the clean copy; fail on the mutant
- Expected: the test guards the guarantee
- Actual: pass 1 on clean; fail 1 on the mutant
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:259`
- Command: `node --test --test-name-pattern "VS-8 the committed" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

mutation:

```
clean copy: # pass 1
mutant with git push of branch(g): # fail 1
```

## TC-security-13 (VS-8): T-R-119 does not catch a Python push of a verify name built on an earlier line

- Given: a copy of skills/sdlc with a leak() added to state-write.py: vb = f"sdlc/{sid}-v{r}-{prof}-{k}" then git(repo, "push", ..., vb)
- When: run T-R-119 on the copy
- Then: records a blind spot of the text scan
- Expected: blind spot recorded as a seed; no current code has this shape
- Actual: T-R-119 passes on the mutant (exit 0)
- Result: pass
- Spec source: R-119 acceptance (test strength; seed only)
- Test: `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:272`
- Command: `node --test --test-name-pattern "VS-8 T-R-119 misses" .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs`

two-line mutant:

```
T-R-119 exit 0 on the mutant
```

## Attacks

| id | charter | result | test |
|---|---|---|---|
| A-1 | Explore the state tail with an explicit ts to find a value that escapes the prefix or crashes name() | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:86` |
| A-2 | Explore the CLI with a --ts flag to find an undocumented override of the state timestamp | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:98` |
| A-3 | Explore verify parts with missing and empty values to find a branch built from a hole | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:107` |
| A-4 | Explore --round and --part with integer forms and unicode digits to find a crash or a non-ASCII tail | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:124` |
| A-5 | Explore --id and --profile with the full attack corpus to find a crash, a side effect or a name outside sdlc/ | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:141` |
| A-6 | Explore attempt parts with missing and malformed values | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:177` |
| A-7 | Explore the scripts for a push or a request that can name a verify branch | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:211` |
| A-8 | Mutate verifyPhase to push branch(g) to find whether T-R-119 guards R-119 | held | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:259` |
| A-9 | Mutate state-write.py to push a verify name built on an earlier line | out-of-scope | `.sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs:272` |

## Seeds

- **name does not check its output with git check-ref-format** (skills/sdlc/branches.py): Hostile ts, id and profile values give names such as sdlc/state-../../x, sdlc/a\nb-v0-http-api-0 and sdlc/state-@{u}. 48 of 103 ts values and 73 of 250 id/profile values give ref-unsafe names. The spec does not require a valid ref from name, and callers are the loop itself, so this is not a blocker. A check in name or in tail would give a clean exit 2.
- **Negative round, part and n give names that parse cannot read back** (skills/sdlc/branches.py): argparse int() accepts -1, so --round -1 gives sdlc/S-001-v-1-http-api-0 and --n -1 gives sdlc/S-001-attempt--1. The spec parse regexes use \d+, so these names do not round-trip. It also accepts +1, 1_000, padded whitespace, unicode digits and 4300-digit values. Refuse negative values in tail or with a non-negative type.
- **T-R-119 text scan misses a push of a verify name built on another line** (skills/sdlc/test/branches.test.mjs): A mutant adds vb = f"sdlc/{sid}-v{r}-{prof}-{k}" and then git(repo, "push", "-q", "origin", vb) to state-write.py. T-R-119 still passes. The scan also does not read skills/sdlc/tracker/*.py. No current code has this shape; the plan names this risk.
- **Fail message says 'a attempt branch name'** (skills/sdlc/branches.py): tail('attempt') without n raises 'a attempt branch name needs a non-empty n'. The article is wrong for kinds that start with a vowel (attempt, e2e, e2e-area).

Full run: `.sdlc/slices/S-005/verification/r0/logs/security-0-run.txt`. Attack log: `.sdlc/slices/S-005/verification/r0/logs/security-0-attacks.txt`.
