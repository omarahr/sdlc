# S-005 verification: contract profile, round 0, part 0

- Slice: S-005
- Profile: contract
- Round: 0 (re-plan after escalation step 1)
- Commit: 9e1e71b
- Verdict: verified, 18 of 18 cases pass

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node v24.19.0, git; branches.py imported by path from a scratch cwd with python3 -I; CLI through the testkit cli-runner; base seed 720361592

Run log: `.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt`. TAP output: `.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt.tap`.

## TC-contract-1: The module surface has tail and name with the spec signatures and imports only the standard library

- Scenario: VS-3; requirements: R-009, R-010
- Given: branches.py at 9e1e71b
- When: a consumer imports branches by path with python3 -I and lists the public names and signatures
- Then: tail is (kind, **parts), name is (fmt, kind, **parts), KINDS holds verify and attempt, and only stdlib modules are imported
- Actual: Signatures as expected; KINDS has verify and attempt; modules argparse, json, os, re, subprocess, sys
- Result: pass
- Spec source: R-009 and R-010 acceptance (the name command builds the tail)
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:86`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

type-check: surface listing

```
tail(kind, **parts)
name(fmt, kind, **parts)
split(fmt); load_format(repo); validate_format(fmt); Fail
KINDS=('run','slice','milestone','e2e','e2e-area','state','verify','attempt')
NAME_PARTS=('id','n','area','round','profile','part')
modules: argparse json os re subprocess sys (all stdlib)
full listing: .sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt
```

## TC-contract-2: name(fmt, "state") gives state- and 14 UTC digits under six time zones and four formats

- Scenario: VS-1; requirements: R-008
- Given: TZ in Pacific/Kiritimati, America/Adak, Etc/GMT+12, Etc/GMT-14, Asia/Kathmandu, UTC
- When: name is called for sdlc/{name}, feature/PROJ-1-{name}, feature/PROJ-1-{name:lower}, x/{name}/y with five sets of extra parts
- Then: each result is prefix + state- + 14 digits + suffix, and the digits lie between the UTC times taken before and after the call
- Actual: All 126 calls in the UTC window; extra parts never change the tail
- Result: pass
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:118`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: tails per zone

```
TZ=Pacific/Kiritimati tail=state-20261009065032 window=[20261009065032,20261009065032]
TZ=Etc/GMT+12 tail=state-20261009065033 window=[20261009065033,20261009065033]
(six zones, see .sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt)
```

## TC-contract-3: Property: the state name stays in the UTC window for any format and any extra parts

- Scenario: VS-1; requirements: R-008
- Given: TZ=Pacific/Kiritimati, nine formats, random extra id, n, round, part and profile
- When: 2000 generated name(fmt, 'state', ...) calls
- Then: every result matches the reference model prefix + state-<UTC %Y%m%d%H%M%S> + suffix
- Actual: 0 violations
- Result: pass
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:142`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: state-utc-window

```
property state-utc-window: seed=720361592 runs=2000 violations=0
```

## TC-contract-4: An explicit ts is used as given; an empty or None ts generates one

- Scenario: VS-2; requirements: R-008
- Given: ts='20261008101500', '' and None
- When: name and tail are called under sdlc/{name} and feature/PROJ-1-{name:lower}
- Then: sdlc/state-20261008101500, state-20261008101500, feature/PROJ-1-state-20261008101500; '' and None give 14 digits in the UTC window
- Actual: As expected
- Result: pass
- Spec source: R-008 acceptance (an explicit ts part is used as given)
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:166`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: explicit ts examples

```
name('sdlc/{name}','state',ts='20261008101500') -> sdlc/state-20261008101500
name('feature/PROJ-1-{name:lower}','state',ts=...) -> feature/PROJ-1-state-20261008101500
ts='' and ts=None -> sdlc/state-<14 UTC digits>
```

## TC-contract-5: Property: any 14-digit ts passes through unchanged under any format

- Scenario: VS-2; requirements: R-008
- Given: random 14-digit ts strings and nine formats
- When: 2000 generated calls
- Then: prefix + state- + ts + suffix
- Actual: 0 violations
- Result: pass
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:184`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: state-explicit-ts

```
property state-explicit-ts: seed=720361517 runs=2000 violations=0
```

## TC-contract-6: Corner ts values are recorded and never raise an exception

- Scenario: VS-2; requirements: R-008
- Given: ts 0, '0', 1.5, True, False, a list, traversal, '/', whitespace, newline, ESC, '@{-1}', 300 chars, Arabic digits
- When: name('sdlc/{name}','state',ts=...)
- Then: no uncaught exception; 0 and '0' give sdlc/state-0
- Actual: All return; the name is not ref-checked (seed)
- Result: pass
- Spec source: R-008 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:193`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: corner ts

```
ts=0 -> sdlc/state-0
ts=true -> sdlc/state-True
ts="../../x" -> sdlc/state-../../x
ts="2026\n" -> sdlc/state-2026\n
ts="@{-1}" -> sdlc/state-@{-1}
(full list in .sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt)
```

## TC-contract-7: Spec example: the verify branch for round 0 and part 0

- Scenario: VS-3; requirements: R-009
- Given: id S-001, round 0, profile http-api, part 0; also S-fix-M-1-2 and S-013a
- When: name and tail under sdlc/{name}
- Then: sdlc/S-001-v0-http-api-0 and S-001-v0-http-api-0
- Actual: As expected; S-fix-M-1-2-v12-concurrency-7 and S-013a-v1-i18n-0 also correct
- Result: pass
- Spec source: R-009 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:203`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: spec example

```
name('sdlc/{name}','verify',id='S-001',round=0,profile='http-api',part=0) -> sdlc/S-001-v0-http-api-0
```

## TC-contract-8: Property: the verify name equals the spec template, the loop builder and itself on a second call

- Scenario: VS-3; requirements: R-009
- Given: generated ids (plain, fix, milestone fix, split), ints 0 to 2^31, ten catalog profiles, nine formats
- When: 2000 x (name, tail, name) calls
- Then: equal to the reference model, equal to sdlc-loop.js `sdlc/${id}-v${round}-${g.profile}-${g.part}` under the default format, deterministic
- Actual: 0 violations
- Result: pass
- Spec source: R-009 quote and acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:216`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: verify-template

```
property verify-template: seed=720361547 runs=2000 violations=0
```

## TC-contract-9: A missing, None or empty verify part raises Fail that names the part

- Scenario: VS-4; requirements: R-009
- Given: each of id, round, profile, part omitted, None or ''
- When: tail('verify') and name(feature/PROJ-1-{name:lower}, 'verify')
- Then: Fail whose message names the missing part
- Actual: Fail: a verify branch name needs a non-empty <part>
- Result: pass
- Spec source: R-009 acceptance (the four parts make the name)
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:235`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: messages

```
a verify branch name needs a non-empty id | ... round | ... profile | ... part
```

## TC-contract-10: Property: any dropped subset of verify parts fails on the first missing part

- Scenario: VS-4; requirements: R-009
- Given: random subsets dropped by omit, None or ''
- When: 2000 tail('verify') calls
- Then: Fail naming the first missing part in id, round, profile, part order
- Actual: 0 violations
- Result: pass
- Spec source: R-009 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:254`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: verify-missing-part

```
property verify-missing-part: seed=720361532 runs=2000 violations=0
```

## TC-contract-11: Corner verify part values through the API are recorded

- Scenario: VS-4; requirements: R-009
- Given: round -1, False, 1.5, '0'; part -1; profile '../x', 'a b', ESC; id '-x', dotted capital I
- When: name('sdlc/{name:lower}','verify',...)
- Then: no exception; every result keeps the sdlc/ prefix
- Actual: All return under sdlc/; negative and non-int parts are accepted (seed)
- Result: pass
- Spec source: R-009 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:270`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: corners

```
round=-1 -> sdlc/s-001-v-1-http-api-0
round=false -> sdlc/s-001-vfalse-http-api-0
profile="../x" -> sdlc/s-001-v0-../x-0
id="-x" -> sdlc/-x-v0-http-api-0
```

## TC-contract-12: Spec example: the attempt branch, n 0, a large n and extra parts

- Scenario: VS-5; requirements: R-010
- Given: S-001 n 1; S-fix-M-1-2 n 3; n 0; n 10^15; extra round, profile, part, area, ts
- When: name and tail under sdlc/{name}
- Then: sdlc/S-001-attempt-1, S-001-attempt-1, sdlc/S-fix-M-1-2-attempt-3, sdlc/S-001-attempt-0, sdlc/S-001-attempt-1, sdlc/S-001-attempt-1000000000000000
- Actual: As expected
- Result: pass
- Spec source: R-010 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:279`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: spec example

```
name('sdlc/{name}','attempt',id='S-001',n=1) -> sdlc/S-001-attempt-1
```

## TC-contract-13: Property: the attempt name equals the spec template and extra parts never leak

- Scenario: VS-5; requirements: R-010
- Given: generated ids and n, random extra parts, nine formats
- When: 2000 x (name with extras, tail) calls
- Then: equal to the reference model
- Actual: 0 violations
- Result: pass
- Spec source: R-010 quote and acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:291`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: attempt-template

```
property attempt-template: seed=720361502 runs=2000 violations=0
```

## TC-contract-14: A missing, None or empty attempt part raises Fail that names the part

- Scenario: VS-6; requirements: R-010
- Given: id or n omitted, None or ''; both omitted
- When: tail('attempt') and name('x/{name}/y','attempt')
- Then: Fail naming id or n
- Actual: Fail: a attempt branch name needs a non-empty <part>; n=-1 gives sdlc/S-001-attempt--1 (seed)
- Result: pass
- Spec source: R-010 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:308`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: corners

```
n=-1 -> sdlc/S-001-attempt--1; n=false -> sdlc/S-001-attempt-False
```

## TC-contract-15: A custom format wraps verify and attempt tails and lowercases only the tail

- Scenario: VS-7; requirements: R-009, R-010
- Given: formats feature/PROJ-1-{name:lower}, x/{name}/y, ABC/{name:lower}/DEF
- When: name for verify and attempt
- Then: feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1, x/S-001-v0-http-api-0/y, x/S-001-attempt-1/y, ABC/s-fix-m-1-2-attempt-3/DEF
- Actual: As expected
- Result: pass
- Spec source: R-009 and R-010 acceptance with the spec format rule
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:320`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: format examples

```
ABC/{name:lower}/DEF + attempt S-FIX-M-1-2 n 3 -> ABC/s-fix-m-1-2-attempt-3/DEF
```

## TC-contract-16: Consumer view: config.branchFormat applies, --format wins, an invalid format exits 2

- Scenario: VS-7; requirements: R-009, R-010
- Given: a scratch git repo with branchFormat feature/PROJ-1-{name:lower}
- When: branches.py name for verify and attempt, then with --format x/{name}/y, then with x/{name}{name}
- Then: config format used; flag wins; invalid format exits 2 with one JSON line, empty stderr, unchanged tree
- Actual: As expected
- Result: pass
- Spec source: R-009 and R-010 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:337`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: cli

```
config=feature/PROJ-1-s-001-v0-http-api-0, feature/PROJ-1-s-001-attempt-1
flag=x/S-001-v0-http-api-0/y
invalid={"ok": false, "error": "the branch format 'x/{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
```

## TC-contract-17: Consumer view: the CLI has no --ts flag and refuses it with one JSON error

- Scenario: VS-2; requirements: R-008
- Given: a scratch git repo
- When: branches.py name --kind state --ts 20261008101500
- Then: exit 2, one JSON line with ok false, empty stderr, unchanged tree
- Actual: exit 2, {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
- Result: pass
- Spec source: R-008 acceptance (the CLI prints sdlc/state- plus 14 UTC digits)
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:355`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

log: cli --ts

```
exit=2 {"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
```

## TC-contract-18: Consumer view: the CLI output equals the API name for sampled verify and attempt inputs

- Scenario: VS-3; requirements: R-009, R-010
- Given: a scratch git repo, generated ids, ints and every catalog profile
- When: 120 branches.py name calls, half verify and half attempt
- Then: exit 0, branch equals name() and the spec template, empty stderr
- Actual: 0 violations
- Result: pass
- Spec source: R-009 and R-010 acceptance
- Test: `.sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:367`
- Command: `VERIFY_REPO=<worktree of sdlc/S-005 at 9e1e71b> VERIFY_LOG=.sdlc/slices/S-005/verification/r0/logs/contract-0-run.txt node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs`

property-run: cli-equals-api

```
consumer cli-equals-api: seed=720361487 runs=120 violations=0
```

## Attacks

None. The security profile covers hostile inputs.

## Seeds

- name() returns ref-unsafe names for hostile parts (`skills/sdlc/branches.py`): tail and name do not pass the result through git check-ref-format. ts '../../x', '@{-1}', a newline, profile 'a b' or ESC give names that git refuses. The spec does not bound name inputs.
- Negative, boolean and float parts give names that parse cannot read back (`skills/sdlc/branches.py`): round -1 gives S-001-v-1-..., n -1 gives S-001-attempt--1, round False gives vFalse. The CLI int() type rejects some forms, but the API accepts all of them.
- Fail message grammar for kinds that start with a vowel (`skills/sdlc/branches.py`): The message reads 'a attempt branch name needs a non-empty n'. The message names the part as required, but the article is wrong.
