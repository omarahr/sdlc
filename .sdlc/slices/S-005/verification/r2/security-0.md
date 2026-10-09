# S-005 verify-security part 0, round 2

- Slice: S-005
- Profile: security
- Round: 2 (plan round 1)
- Commit: 3780ee1
- Verdict: refuted. Three cases fail: TC-security-22, TC-security-23, TC-security-24.

## Environment

macOS (Darwin 25.6), Node v24.19.0, python3; T-R-119 run with node --test on temp copies of skills/sdlc

## Charter

Explore the round 2 T-R-119 guard with push forms around its new token scan. Find a verify push that it lets through. The guarantee is the R-119 acceptance: a source check over `sdlc-loop.js` and the skill scripts finds no `git push` or pull-request creation for a verify branch.

## Threat model boundary

The attacker is a later change to the skill scripts that pushes a verify branch. The guard is a text scan, so the attacks are code forms. Forms that the plan notes name, and their plain variants, are in scope. Contrived forms (run-time string edits, variable rebinding, plumbing commands, odd file layouts) are seeds.

## Cases

### TC-security-14: T-R-119 passes on the unchanged skill from the repo root and from a moved copy

- Given: The skill at commit 3780ee1.
- When: Run T-R-119 with cwd at the repo root, then on a copy of skills/sdlc in the temp folder.
- Then: Both runs pass, and branches.test.mjs names no absolute or worktree path.
- Expected: Exit 0 twice; no absolute path.
- Actual: Exit 0 twice; imports resolve through harness.mjs SKILL_DIR.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:56`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

clean runs:

```
clean tree from repo root: exit 0 PASSED
clean copy outside the repo: exit 0 PASSED
```

### TC-security-15: The three TC-cli-11 mutants fail T-R-119

- Given: A copy of the skill with one mutant in state-write.py.
- When: Add M-1, M-2 and M-3.
- Then: T-R-119 fails on each mutant.
- Expected: Exit 1 for M-1, M-2, M-3.
- Actual: Exit 1 for each.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:67`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

TC-cli-11 mutants:

```
M-1 verify name built on an earlier line, then pushed: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tes
M-2 git(repo, "push", ...) split over lines: T-R-119 exit 1 FAILED (mutant caught) - a script pushes or opens a request for a verify branch: state-write.py: git(repo, "push", "-q",
M-3 split create call: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","next-action.py: ok, out =
```

### TC-security-16: T-R-119 catches a verify push in the ["git", "-C", repo, "push", ...] form

- Given: A copy of the skill with subprocess.run(["git", "-C", repo, "push", "origin", vb]) in state-write.py.
- When: Run T-R-119 on the copy.
- Then: T-R-119 fails.
- Expected: Exit 1.
- Actual: Exit 1. The quoted push token is a new site, so the pinned list changes.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:76`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

A-3:

```
A-3 ["git", "-C", repo, "push", "origin", vb]: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","n
```

### TC-security-17: T-R-119 catches a verify push in a git -C {repo} push shell string

- Given: A copy of the skill with subprocess.run(f"git -C {repo} push origin {vb}", shell=True).
- When: Run T-R-119 on the copy.
- Then: T-R-119 fails.
- Expected: Exit 1.
- Actual: Exit 1.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:81`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

A-4:

```
A-4 shell string git -C {repo} push: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","next-action
```

### TC-security-18: T-R-119 catches a verify push in a tracker skill script

- Given: A copy of the skill with a git push of a verify name in tracker/collect.py.
- When: Run T-R-119 on the copy.
- Then: T-R-119 fails.
- Expected: Exit 1.
- Actual: Exit 1. T-R-119 now walks every script under skills/sdlc.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:86`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

A-13:

```
A-13 tracker/collect.py git push of a verify name: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).
```

### TC-security-19: Round 1 blind spots: seven of nine forms are now caught

- Given: The nine round 1 blind-spot mutants.
- When: Run T-R-119 on each copy.
- Then: Record the forms that still pass.
- Expected: Only A-11 and A-16 pass, as the fix notes state.
- Actual: Only A-11 (push verb built at run time) and A-16 (run rebound to a verify name) pass. Both stay seeds.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:91`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

round 1 blind spots:

```
A-1 single-quoted git(repo, 'push', ...): T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","next-a
A-2 receiver other than repo: git(root, "push", ...): T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (test
A-6 sdlc-loop.js execFileSync('git', ['push', ...]): T-R-119 exit 1 FAILED (mutant caught)
A-7 sdlc-loop.js spawn(git, [-C, repo, push, ...]): T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests)
A-8 gh pr create built from a list with flags between parts: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling g
A-10 shell string with two spaces: git  push: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","ne
A-11 push verb in a constant: git(repo, PUSH, ...): T-R-119 exit 0 PASSED (mutant not caught)
A-12 template text 'git push --delete <branch>' rewritten at run time: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of
A-16 the pinned run-branch push site with run rebound to a verify name: T-R-119 exit 0 PASSED (mutant not caught)
```

### TC-security-20: T-R-119 catches the common push and request forms

- Given: Seven mutants: A-5, A-9, A-14, A-15, A-17, A-18, A-19.
- When: Run T-R-119 on each copy.
- Then: T-R-119 fails on each.
- Expected: Exit 1 for all seven.
- Actual: Exit 1 for all seven.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:118`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

caught forms:

```
A-5 os.system(f"git push origin {vb}"): T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","next-act
A-9 git(repo,"push") with no spaces and a new target: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (test
A-14 branches.py push of a name built from tail(): T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["branches.py: subprocess.run([\"git\", \"push\", \"origin\", t])","next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} i
A-15 push call whose argument holds a nested call: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).
A-17 sdlc-loop.js agent prompt with git push of branch(g): T-R-119 exit 1 FAILED (mutant caught) - a script pushes or opens a request for a verify branch: sdlc-loop.js: const pushIt = g => agent(`git push origin ${branch(g)}`)
A-18 sdlc-loop.js extra use of branch(g) with no push words: T-R-119 exit 1 FAILED (mutant caught) - the verify branch builder has 4 references, not 3: ["const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`","const publish = g => agent(`publish ${
A-19 glab mr create shell string: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","next-action.py
```

### TC-security-21: The scripts on the slice commit hold no push or request of a verify branch

- Given: Every .py, .js, .mjs and .sh file under skills/sdlc, tests excluded.
- When: Scan with the round 1 broad pattern.
- Then: No hit names a verify branch.
- Expected: Only the run, milestone and remote-delete sites and the ste-check.py word list.
- Actual: As expected.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:147`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

broad scan:

`.sdlc/slices/S-005/verification/r2/logs/security-0-mutants.txt`

### TC-security-22: T-R-119 catches a git -C shell string with a quoted repo path

- Given: A copy of the skill. state-write.py gets subprocess.run(f'git -C "{repo}" push origin {vb}', shell=True) (B-1), or os.system(f"git -C '{repo}' push origin {vb}") (B-2). vb is a verify name.
- When: Run T-R-119 on each copy.
- Then: T-R-119 fails: this is the plan's 'shell string with git -C x push' form with a quoted path.
- Expected: Exit 1 for B-1 and B-2.
- Actual: Exit 0 for both. The pattern \bgit\b[^"'`\n]{0,80}?\bpush\b stops at the first quote character, so a quoted path between git and push hides the push.
- Result: fail
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:170`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

B-1, B-2:

```
B-1 shell string with a double-quoted repo path: git -C "{repo}" push: T-R-119 exit 0 PASSED (mutant not caught)
B-2 shell string with a single-quoted repo path: git -C '{repo}' push: T-R-119 exit 0 PASSED (mutant not caught)
```

### TC-security-23: T-R-119 catches git -C "$repo" push in a new .sh skill script

- Given: A copy of the skill with a new publish.sh: git -C "$repo" push origin "$vb", with vb="sdlc/$2-v$3-$4-$5".
- When: Run T-R-119 on the copy.
- Then: T-R-119 fails: the fix adds .sh to the scanned scripts, and this is the standard quoted shell form.
- Expected: Exit 1.
- Actual: Exit 0. The quoted "$repo" stops the git ... push pattern, and push has no quote next to it.
- Result: fail
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:177`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

B-4:

```
B-4 new .sh skill script: git -C "$repo" push origin "$vb": T-R-119 exit 0 PASSED (mutant not caught)
```

### TC-security-24: T-R-119 catches a git -C x push shell string built by concatenation

- Given: A copy of the skill. state-write.py gets os.system("git -C " + repo + " push origin " + vb).
- When: Run T-R-119 on the copy.
- Then: T-R-119 fails.
- Expected: Exit 1.
- Actual: Exit 0. The closing quote after -C stops the git ... push pattern.
- Result: fail
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:182`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

B-3:

```
B-3 shell string built by concatenation: "git -C " + repo + " push origin ": T-R-119 exit 0 PASSED (mutant not caught)
```

### TC-security-25: Round 2 forms outside the scripts idiom pass T-R-119 (recorded blind spots)

- Given: Five mutants: gh api POST to /pulls, git send-pack, git and push over 80 characters apart, a script in a folder named fixtures, an extensionless script.
- When: Run T-R-119 on each copy.
- Then: Record which pass. The test asserts the exact list.
- Expected: The five forms pass T-R-119.
- Actual: All five pass. They go to seeds: no requirement names them.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:187`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

round 2 blind spots:

```
B-6 gh api POST to the pulls endpoint in a shell string: T-R-119 exit 0 PASSED (mutant not caught)
B-7 git send-pack of a verify name in the git helper: T-R-119 exit 0 PASSED (mutant not caught)
B-8 git and push more than 80 characters apart in one shell string: T-R-119 exit 0 PASSED (mutant not caught)
B-9 script in a skipped folder name: tracker/fixtures/publish.py: T-R-119 exit 0 PASSED (mutant not caught)
B-10 extensionless python script with a shebang: T-R-119 exit 0 PASSED (mutant not caught)
```

### TC-security-26: T-R-119 catches the round 2 forms near the fix

- Given: Five mutants: a .sh push with a continuation line, a second copy of the pinned run push line, a .cjs execFileSync push, a push token in tracker/template.html, an argv with push on the next line.
- When: Run T-R-119 on each copy.
- Then: T-R-119 fails on each.
- Expected: Exit 1 for all five.
- Actual: Exit 1 for all five. The row-keyed site set catches a copy of a pinned line.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:201`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

round 2 caught forms:

```
B-5 new .sh skill script: git push with the branch on a continuation line: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instea
B-11 second copy of the pinned run push line, fed a verify name: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calli
B-12 push token in a .cjs script: T-R-119 exit 1 FAILED (mutant caught)
B-13 push in a tracker/template.html script: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests).","nex
B-14 argv split: "git", "-C", repo, on one line and "push" on the next: T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead o
```

### TC-security-27: A quote-tolerant scan of every skill file finds no verify push or request

- Given: Every non-md, non-json file under skills/sdlc, tests, fixtures and prompts excluded.
- When: Scan each line for git ... push with quotes allowed, a quoted push, send-pack, /pulls, merge_requests, pr or mr ... create.
- Then: No hit names a verify branch.
- Expected: Only the pinned run, milestone and remote-delete lines and the ste-check.py word list.
- Actual: Six hits, all pinned sites. The product code holds the guarantee today.
- Result: pass
- Spec source: R-119 acceptance
- Test: `.sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs:214`
- Command: `node --test .sdlc/slices/S-005/verification/r2/tests/security-0/guard.verify-security.test.mjs`

quote-tolerant scan:

`.sdlc/slices/S-005/verification/r2/logs/security-0-mutants.txt`

## Run

Full output: `.sdlc/slices/S-005/verification/r2/logs/security-0-run.txt`

```
✔ verify security: VS-9 T-R-119 passes on the unchanged skill, from the repo root and from a moved copy (228.079084ms)
✔ verify security: VS-9 the three TC-cli-11 mutants fail T-R-119 (360.099208ms)
✔ verify security: VS-9 T-R-119 catches a push in the git -C argv form the scripts already use (119.615125ms)
✔ verify security: VS-9 T-R-119 catches a shell string git -C <repo> push (122.020458ms)
✔ verify security: VS-9 T-R-119 catches a verify push in a tracker skill script (119.16125ms)
✔ verify security: VS-9 forms outside the scripts idiom, recorded as blind spots (1088.618417ms)
✔ verify security: VS-9 forms the guard does catch (865.948166ms)
✔ verify security: VS-9 the scripts on the slice commit hold no push or request of a verify branch (1.42075ms)
✖ verify security: VS-9 T-R-119 catches a shell string git -C with a quoted repo path (236.756416ms)
✖ verify security: VS-9 T-R-119 catches git -C "$repo" push in a new .sh skill script (112.466625ms)
✖ verify security: VS-9 T-R-119 catches a shell string git -C x push built by concatenation (113.42625ms)
✔ verify security: VS-9 round 2 forms outside the scripts idiom, recorded as blind spots (617.626083ms)
✔ verify security: VS-9 round 2 forms the guard does catch (601.051917ms)
✔ verify security: VS-9 a quote-tolerant scan of every skill file finds no verify push or request (2.108083ms)
ℹ tests 14
ℹ suites 0
ℹ pass 11
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
```

## Attacks

| id | input | observed | result |
|---|---|---|---|
| M-1 | `verify name on an earlier line, then git(repo, "push", ..., vb)` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tes | held |
| M-2 | `git(repo, "push", "-q",\n "origin", f"sdlc/{sid}-v{rnd}-...")` | T-R-119 exit 1 FAILED (mutant caught) - a script pushes or opens a request for a verify branch: state-write.py: git(repo, "push", "-q", | held |
| M-3 | `subprocess.run(["gh", "pr",\n "create", "--head", vb])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-3 | `subprocess.run(["git", "-C", repo, "push", "origin", vb])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-4 | `subprocess.run(f"git -C {repo} push origin {vb}", shell=True)` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-13 | `tracker/collect.py: subprocess.run(["git", "push", "origin", vb])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-1 | `git(repo, 'push', '-q', 'origin', vb)` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-2 | `git(root, "push", "-q", "origin", vb)` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (test | held |
| A-6 | `sdlc-loop.js: execFileSync('git', ['push', 'origin', <verify name>])` | T-R-119 exit 1 FAILED (mutant caught) | held |
| A-7 | `sdlc-loop.js: spawn('git', ['-C', repo, 'push', 'origin', b])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-8 | `subprocess.run(["gh", "pr", "--repo", repo, "create", "--head", vb])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling g | held |
| A-10 | `os.system(f"git  push origin {vb}")` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-11 | `PUSH = "pu" + "sh"; git(repo, PUSH, "origin", vb)` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| A-12 | `os.system("git push --delete <branch>".replace(...))` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of | held |
| A-16 | `run = config.get("verifyBranch") or run, before the pinned run push` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| A-5 | `os.system(f"git push origin {vb}")` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-9 | `git(repo,"push","origin",vb)` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (test | held |
| A-14 | `branches.py: subprocess.run(["git", "push", "origin", tail("verify", **p)])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["branches.py: subprocess.run([\"git\", \"push\", \"origin\", t])","next-action.py: --prs takes {\"open\": [...], \"merged\": [...]}  | held |
| A-15 | `git(repo, "push", "origin", str(vb))` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| A-17 | `sdlc-loop.js: agent(`git push origin ${branch(g)}`)` | T-R-119 exit 1 FAILED (mutant caught) - a script pushes or opens a request for a verify branch: sdlc-loop.js: const pushIt = g => agent(`git push origin ${branch(g)}`) | held |
| A-18 | `sdlc-loop.js: agent(`publish ${branch(g)} to origin`)` | T-R-119 exit 1 FAILED (mutant caught) - the verify branch builder has 4 references, not 3: ["const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`","const publish = g => agent(`publish ${ | held |
| A-19 | `os.system(f"glab mr create --source-branch {vb}")` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| B-1 | `subprocess.run(f'git -C "{repo}" push origin {vb}', shell=True)` | T-R-119 exit 0 PASSED (mutant not caught) | broke |
| B-2 | `os.system(f"git -C '{repo}' push origin {vb}")` | T-R-119 exit 0 PASSED (mutant not caught) | broke |
| B-4 | `publish.sh: git -C "$repo" push origin "$vb"` | T-R-119 exit 0 PASSED (mutant not caught) | broke |
| B-3 | `os.system("git -C " + repo + " push origin " + vb)` | T-R-119 exit 0 PASSED (mutant not caught) | broke |
| B-6 | `os.system(f"gh api -X POST repos/{repo}/pulls -f head={vb} -f base=main")` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| B-7 | `git(repo, "send-pack", "origin", vb)` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| B-8 | `os.system(f"git -C {repo} -c ... (over 80 characters) push origin {vb}")` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| B-9 | `tracker/fixtures/publish.py with a git push of vb` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| B-10 | `extensionless python script publish with a git push of vb` | T-R-119 exit 0 PASSED (mutant not caught) | out-of-scope |
| B-5 | `publish2.sh: git push origin \\\n "$vb"` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instea | held |
| B-11 | `run = vb; git(repo, "push", "-q", "origin", run, check=False) as a second copy` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calli | held |
| B-12 | `publish.cjs: execFileSync('git', ['push', 'origin', `sdlc/${id}-v${r}-...`])` | T-R-119 exit 1 FAILED (mutant caught) | held |
| B-13 | `tracker/template.html: args: ['push', 'origin', vb]` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead of calling gh (tests) | held |
| B-14 | `subprocess.run(["git", "-C", repo,\n "push", "origin", vb])` | T-R-119 exit 1 FAILED (mutant caught) - the push and create sites changed: ["next-action.py: --prs takes {\"open\": [...], \"merged\": [...]} in the shape of `gh pr list --json`, instead o | held |

## Seeds

- T-R-119 misses gh api pull-request creation (`skills/sdlc/test/branches.test.mjs`): A shell string gh api -X POST repos/<slug>/pulls -f head=<verify name> creates a pull request and passes T-R-119 (B-6). The scan looks for pr or mr words, not the pulls endpoint. Add /pulls and merge_requests to the site patterns.
- T-R-119 misses git push plumbing and long gaps (`skills/sdlc/test/branches.test.mjs`): git(repo, "send-pack", "origin", vb) pushes a verify name and passes (B-7). A git ... push text with more than 80 characters between git and push passes (B-8).
- T-R-119 skips scripts by folder name and by extension (`skills/sdlc/test/branches.test.mjs`): A script in any folder named fixtures, test or prompts is skipped, also under tracker (B-9). An extensionless script with a shebang is skipped (B-10). Consider a skip list of exact paths, and a scan of files with a shebang.
- A text scan cannot see a push verb built at run time or a rebound variable (`skills/sdlc/state-write.py`): A-11 (PUSH = "pu" + "sh") and A-16 (run rebound before the pinned run push) still pass T-R-119. A behavior test that runs advance_run_branch against a bare remote and lists the remote refs would close A-16.
