# S-005 verify-security part 1, round 1

- Slice: S-005
- Profile: security
- Round: 1 (plan round 0)
- Commit: 112b45b
- Scenario: VS-10
- Verdict: not refuted. 6 cases, 6 pass.

## Environment

macOS, Python 3.14.7, Node 24.19.0; push_guard.py run on scratch copies of skills/sdlc and hooks from sdlc/S-005 at 112b45b; gh, glab and git shims on PATH for the no-side-effect case.

## Charter

VS-10: Explore the R-119 forge rule with the spec-required GitHub and GitLab reads and wrapper git reads, to find a read that hits a ban (plan R-119 scope: 'Reads are allowed'; Risks: S-013 and S-014 reads 'hit no ban').

## Threat model boundary

Trusted: the skill scripts' authors and the human who reviews a pin change. Untrusted: a later slice's code change that adds a push or a forge write without a visible ban. Per ADR-20261009-062930-decision-judge-S-005-388e, a form refutes R-119 only when the guard output stays equal to the pins.

## TC-security-101: The spec GitHub rules read in branches.py changes only the direct and forge pins

- Given: A copy of skills/sdlc and hooks at 112b45b; the unmutated copy has no ban entry.
- When: A new branches.py function calls gh api on repos/{owner}/{repo}/rules/branches/<quoted sample> in six spellings: spec placeholders, slug f-string, constant plus quote, check_output, --paginate/-i/timeout/env, and -XGET, --method=GET, -X get.
- Then: Only the direct and forge pins gain entries; forgeViolations, opaque, dynamic, wrapperValues, pushes and jsHits stay as before.
- Expected: Only the direct and forge pins gain entries; forgeViolations, opaque, dynamic, wrapperValues, pushes and jsHits stay as before.
- Actual: As expected. The forge pin gains 'branches.py _verify_read gh api repos/{owner}/{repo}/rules/branches/' or 'gh api repos/'. No ban entry.
- Result: pass
- Spec source: VS-10 notes; plan R-119 scope (forge rule: reads are allowed); ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs:70`
- Command: `cd <worktree at sdlc/S-005 112b45b> && SDLC_VERIFY_ROOT=$PWD node --test .sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs`

Evidence (attack): probes A, B, F, G, N, S, AB

See `.sdlc/slices/S-005/verification/r1/logs/security-1-probes.txt`.

Evidence (log): test run

See `.sdlc/slices/S-005/verification/r1/logs/security-1-run.txt`.

## TC-security-102: The spec quote import changes the network pin as well, and hits no ban

- Given: The same copy.
- When: The read uses urllib.parse.quote, as spec section 'GitHub' names it, through 'from urllib.parse import quote' or 'import urllib.parse'.
- Then: No ban key changes; the extra pin change is recorded.
- Expected: No ban key changes; the extra pin change is recorded.
- Actual: No ban entry. The network pin gains 'branches.py import urllib.parse', because push_guard.py lists all of urllib in NET_MODULES. The committed VS-10 test omits the import, so it does not show this pin change. Recorded as a seed.
- Result: pass
- Spec source: VS-10 notes; plan R-119 scope (forge rule: reads are allowed); ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs:87`
- Command: `cd <worktree at sdlc/S-005 112b45b> && SDLC_VERIFY_ROOT=$PWD node --test .sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs`

Evidence (attack): probes C, D

```
== C ... from urllib.parse import quote
   direct [...]
   network ["branches.py import urllib.parse"]
   forge ["branches.py _mutant gh api repos/"]
```

## TC-security-103: gh api -X GET through the next-action run wrapper changes only the forge and wrapper-verb pins

- Given: The same copy.
- When: next-action.py gets run(repo, 'gh', 'api', '-X', 'GET', 'repos/o/r/rules/branches/x') and a run with an f-string rules path.
- Then: Only forge and wrapperVerbs change; wrapperVerbs gains 'next-action.py gh api'.
- Expected: Only forge and wrapperVerbs change; wrapperVerbs gains 'next-action.py gh api'.
- Actual: As expected. No ban entry.
- Result: pass
- Spec source: VS-10 notes; plan R-119 scope (forge rule: reads are allowed); ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs:96`
- Command: `cd <worktree at sdlc/S-005 112b45b> && SDLC_VERIFY_ROOT=$PWD node --test .sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs`

Evidence (attack): probes J, AC

```
== J gh -X GET via run
   wrapperVerbs ["next-action.py gh api"]
   forge ["next-action.py _mutant gh api repos/o/r/rules/branches/x"]
```

## TC-security-104: The spec GitLab push rule read changes only a pin, direct or through run

- Given: The same copy.
- When: branches.py calls glab api projects/:fullpath/push_rule plain, with --hostname, and with -X GET --paginate; next-action.py calls it through run.
- Then: Direct calls change direct and forge only; the run call changes forge and wrapperVerbs only.
- Expected: Direct calls change direct and forge only; the run call changes forge and wrapperVerbs only.
- Actual: As expected. Forge gains '... glab api projects/:fullpath/push_rule'. No ban entry.
- Result: pass
- Spec source: VS-10 notes; plan R-119 scope (forge rule: reads are allowed); ADR-20261009-062930-decision-judge-S-005-388e
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs:108`
- Command: `cd <worktree at sdlc/S-005 112b45b> && SDLC_VERIFY_ROOT=$PWD node --test .sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs`

Evidence (attack): probes H, I, K, Q, T, AD

See `.sdlc/slices/S-005/verification/r1/logs/security-1-probes.txt`.

## TC-security-105: A git fetch through the state-write wrapper changes no pin; a git log adds one verb

- Given: The same copy.
- When: state-write.py gets git(repo, 'fetch', ...) alone, then git(repo, 'log', ...) with git(repo, 'fetch', ...).
- Then: git fetch changes nothing, so T-R-119b passes; git log adds only 'state-write.py git log' to wrapperVerbs; pushes stay at three.
- Expected: git fetch changes nothing, so T-R-119b passes; git log adds only 'state-write.py git log' to wrapperVerbs; pushes stay at three.
- Actual: As expected. The fetch-only tree gives a zero delta. The log tree changes only wrapperVerbs.
- Result: pass
- Spec source: VS-10 notes (T-R-119b verb set); plan Risks ('A new call with a known verb does not fail T-R-119b')
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs:125`
- Command: `cd <worktree at sdlc/S-005 112b45b> && SDLC_VERIFY_ROOT=$PWD node --test .sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs`

Evidence (attack): probes L, M

```
== L git log and fetch via state-write git
   wrapperVerbs ["state-write.py git log"]
== M git fetch only via state-write
(no delta)
```

## TC-security-106: The guard reads the forge reads and never runs them

- Given: gh, glab and git shims first on PATH write a marker file; branches.py gets a module-level line that writes a second marker, and two forge reads.
- When: push_guard.py scans the copy.
- Then: The forge pin gains two entries; neither marker file exists.
- Expected: The forge pin gains two entries; neither marker file exists.
- Actual: As expected. No shim call and no module execution: the scan is a pure AST read.
- Result: pass
- Spec source: verify-security step 4 (prove no side effect)
- Test: `.sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs:134`
- Command: `cd <worktree at sdlc/S-005 112b45b> && SDLC_VERIFY_ROOT=$PWD node --test .sdlc/slices/S-005/verification/r1/tests/security-1/forge-reads.verify-security.test.mjs`

Evidence (attack): no side effect

```
forge entries: base + 2
existsSync(<shim dir>/called) = false
existsSync(<shim dir>/imported) = false
```

## Attacks

| id | charter | input | expected | observed | result |
|---|---|---|---|---|---|
| VS10-A-1 | Explore the forge rule with the spec GitHub rules read in many spellings, to find a spec-required read that hits a ban. | probes A, B, F, G, N, S, AB | only direct and forge change | only direct and forge change | held |
| VS10-A-2 | Explore the network pin with the spec's own urllib.parse.quote import. | probes C, D | no ban | no ban; network pin gains 'branches.py import urllib.parse' | held |
| VS10-A-3 | Explore the run wrapper with explicit GET reads. | probes J, AC | forge and wrapperVerbs only | forge and wrapperVerbs only | held |
| VS10-A-4 | Explore the GitLab push rule read, direct and wrapped. | probes H, I, K, Q, T, AD | a pin change only | a pin change only | held |
| VS10-A-5 | Explore T-R-119b with git fetch and git log through the state-write wrapper. | probes L, M | fetch: no delta; log: one new verb | as expected | held |
| VS10-A-6 | Explore whether the guard executes scanned code or forge tools. | shims for gh, glab, git; module-level marker write | no marker | no marker | held |
| VS10-A-7 | Explore read spellings the spec does not fix: a path in a variable, an argv list in a variable, % and .format paths, a helper with *args. | probes O, P, U, V, W | no spec-required spelling is banned | each gives an opaque entry; the spec f-string spelling passes, so a later slice can choose it | out-of-scope |
| VS10-A-8 | Explore reads with extra options: a GET with -F per_page, a constant sample that holds 'pulls'. | probes Z, R | not spec-required | both give a forge violation (fails closed) | out-of-scope |
| VS10-A-9 | Explore the forge parse with list items that hold a space, to find a write it reads as a read. | run(repo, 'gh', 'api', '-H', 'A: --jq', '-X', 'POST', 'repos/o/r/pulls'); gh api -H 'Accept: x' graphql | forge violation | no forge violation; forge pin shows 'gh api POST' and 'gh api x'. The forge pin still changes, so the refutation rule of ADR-388e does not apply | out-of-scope |

## Seeds

- **push_guard.py splits list-literal argv items on whitespace, so a POST to pulls gives no forge violation** (skills/sdlc/test/push_guard.py). split_tokens splits every constant on whitespace, also one argv list item. A header value 'A: --jq' gives an extra '--jq' token that eats '-X'. run(repo, 'gh', 'api', '-H', 'A: --jq', '-X', 'POST', 'repos/o/r/pulls') then gives no forge violation, and the forge pin reads 'gh api POST'. gh api -H 'Accept: x' graphql escapes the graphql ban the same way. The forge pin still changes, so ADR-388e does not refute. Fix: split shell strings only, and keep each list item as one token.
- **The spec's urllib.parse.quote import changes the network pin of T-R-119a** (skills/sdlc/test/push-guard.test.mjs). Spec section GitHub names urllib.parse.quote for the rules read. push_guard.py lists all of urllib in NET_MODULES, so S-013 also changes the network pin. The plan Risks and the committed VS-10 test say only direct and forge change; the test omits the import. Narrow the network import rule to urllib.request, or name the network pin in the plan Risks.
- **Read paths built with %, .format or a variable are opaque** (skills/sdlc/test/push_guard.py). A rules path built with %, str.format, a local variable, or an argv list in a variable gives an opaque entry. The f-string and '+' spellings pass. S-013 and S-014 must use an f-string or '+' in the call; say so in the R-119 scope so those slices do not weaken the guard.
