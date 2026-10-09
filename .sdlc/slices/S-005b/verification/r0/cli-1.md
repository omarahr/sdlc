# verify-cli part 1, S-005b, round 0

- Slice: S-005b
- Profile: cli, part 1
- Round: 0, plan round 0
- Commit: 527e86b
- Verdict: verified (13 of 13 cases pass)
- Run: `cd /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run && VERIFY_ROOT=$PWD node --test --test-reporter=spec .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs`
- Run output: .sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-run.txt
- Transcripts: .sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt

## Environment

macOS, node test runner, Python 3.14.7 (/opt/homebrew/bin/python3), git real bare remotes, gh absent from PATH in the script runs. Plan: plan-r0.json (fresh plan for ladder step 4). Earlier cli-1 evidence stays in git history.

## TC-cli-1 (VS-10): The scanned list is exactly the 13 scripts, and the guard on the real tip equals the guard on a copy

- Given: The branch tip, and a copy of skills/sdlc and hooks without test, fixtures and prompts
- When: Run push_guard.py on both
- Then: 13 .py and .js files; opaque, dynamic, forgeViolations and jsHits are empty; both outputs are equal
- Actual: 13 scripts, 17 files in all; the lists are empty; outputs equal
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:114

Evidence (transcript): guard transcript on the clean tree
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

Evidence (file-tree): scanned files (17)
```
13 scripts: hooks/live-poke.py, skills/sdlc/{branches,impact,janitor,next-action,state-write,ste-check,suite-receipt}.py, sdlc-loop.js, tracker/{collect,hub,reports,workflow}.py; plus 4 non-script files
```

## TC-cli-2 (VS-10): A new script type, a symlink or a non-UTF-8 source in the scanned tree fails the guard

- Given: A copy of the scanned tree
- When: Add .sh, .mjs, .cjs, .ts, .pl and extension-less files; symlinks to files and directories; a latin-1 and a cp1252 coding line; invalid UTF-8; a NUL byte; a BOM file
- Then: Each change alters files or opaque (or the pins); a BOM alone alters nothing
- Actual: All 24 cases alter files, opaque or a push pin. Invalid UTF-8 and NUL bytes in a .py file give an opaque entry. The BOM control gives no change.
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:129

Evidence (transcript): 24 guard transcripts with changed keys
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

Evidence (transcript): sample
```
new .sh under skills/sdlc -> changed keys: files
symlink to a directory under hooks -> opaque
latin-1 coding line on janitor.py -> imports, direct, opaque
NUL byte in a new .py under hooks -> files, opaque
invalid UTF-8 byte in impact.py -> imports, direct, wrapperBodies, wrapperVerbs, opaque
BOM on four wrapper files (control) -> <none>
```

## TC-cli-3 (VS-10): A dangling symlink exits non-zero, and a symlink loop is opaque

- Given: A copy with a dangling symlink in hooks, then a loop in skills/sdlc
- When: Run the guard
- Then: Never a silent pass
- Actual: Dangling link: exit 1 (FileNotFoundError), so the pin test fails closed. Loop: files and opaque change.
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:187

Evidence (transcript): exit codes and stderr tail
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-4 (VS-10): Push scripts in test, fixtures and prompts directories stay unscanned (seed S5)

- Given: A copy with evil.py and evil.sh in the three skipped directories
- When: Run the guard
- Then: Observation only: no key changes by design
- Actual: No key changed. Recorded as seed S5.
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:194

Evidence (transcript): guard transcript
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-5 (VS-11): A spec-required forge read changes only a pin and hits no ban

- Given: A copy with a new gh or glab read at a wrapper or a direct site
- When: Run the guard
- Then: forge changes; forgeViolations and opaque stay empty; wrapperBodies is equal
- Actual: All 9 reads (gh pr list, gh pr view, gh api GET with and without -X, glab mr list, glab api push_rule, two direct sites, glab direct) change only forge, wrapperVerbs or direct
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:207

Evidence (transcript): 9 guard transcripts
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-6 (VS-11): A forge read with a graphql path and every forge write hit the ban

- Given: A copy with gh api graphql (4 spellings, 2 sites), glab api graphql, gh pr create, glab mr create, gh api -X POST, -f head=, --method=PATCH
- When: Run the guard
- Then: forgeViolations or opaque is not empty
- Actual: All 10 give forgeViolations. gh pr merge is not banned but changes forge and wrapperVerbs (seed).
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:231

Evidence (transcript): 10 guard transcripts plus the gh pr merge observation
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

Evidence (transcript): gh pr merge
```
changed keys: wrapperVerbs, forge
  + next-action.py gh pr merge
  + next-action.py _verify_read gh pr merge
forgeViolations 0
```

## TC-cli-7 (VS-12): A verify branch stays local when the CLI scripts run against a real bare remote

- Given: Bare remotes in pr, direct, mr and stack mode, two verify branches made by branches.py name, gh absent from PATH
- When: Run state-write patch-slice twice, base-branch, status, janitor and next-action
- Then: The remote never holds a verify ref; refs before equal refs after in pr, direct and mr; the verify branches stay local
- Actual: Remote refs in stack mode: main, sdlc/M-1, sdlc/run-1 only. No leak in any step.
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:311

Evidence (transcript): remote refs after each step
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-8 (VS-12): The three push functions of state-write.py push no verify branch (module-loader, real bare remote)

- Given: A bare remote that holds main and sdlc/run-1, a local verify branch, and main moved
- When: Call advance_run_branch, prune_stale_milestone_branches and ensure_milestone_branch
- Then: pushed(verify branch) is false and no added ref has a -v0- name
- Actual: No verify ref reached the remote in all three calls
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:357

Evidence (transcript): three module-loader transcripts with refs before and after
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-9 (VS-12): janitor sweep_branches deletes a finished verify branch locally and pushes nothing

- Given: A bare remote and a finished verify branch
- When: Call sweep_branches
- Then: Returns the branch; no ref added to the remote
- Actual: Returned the branch; refsAdded empty
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:391

Evidence (transcript): module-loader transcript
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-10 (VS-12): A guard-flagged mutant may push, and no mutant pushes with every key equal

- Given: Nine mutants (two push controls, hidden-option, fsmonitor, late alias, os.path.os.system, two body edits)
- When: Run the guard, then call the mutant against a bare remote
- Then: No mutant pushes while the guard keys are equal; the controls push and the guard flags them
- Actual: All 7 mutants that ran pushed and the guard flagged each. The 2 body edits did not import (importError) and the guard flagged them.
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:420

Evidence (transcript): summary
```
control git push in state-write.py: keys wrapperVerbs, pushes; pushed true
control subprocess push in janitor.py: keys direct, pushes; pushed true
fetch --upload-pack f-string: keys wrapperVerbs; pushed true
fetch --upload-pack str() in next-action run: keys wrapperVerbs; pushed true
-c core.fsmonitor before diff: keys wrapperVerbs, opaque; pushed true
late alias import: keys direct, pushes; pushed true
os.path.os.system: keys direct, pushes; pushed true
body edits (2): keys wrapperBodies; importError
```

Evidence (transcript): full transcripts
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-11 (VS-13): Each guard-miss mutant row of T-R-119e changes a pin, and the named key when one is named

- Given: The 148 rows of the MUTANTS table in skills/sdlc/test/push-guard.test.mjs, loaded from the file, which hold the 95 attempt 1 rows and the 26 "S-005b r2" rows
- When: Apply each row to a copy and run the guard
- Then: Every row changes at least one key; a named key changes
- Actual: 148 of 148 rows change a key; 0 rows miss
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:454

Evidence (transcript): counts
```
148 ok, 0 MISS
```

Evidence (transcript): one line per row with changed keys
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-12 (VS-13): The guard output is byte-equal across runs, cwd, a symlinked root, a path with spaces and unicode, and hash seeds

- Given: A copy of the tree
- When: Run twice; from another cwd; with no argument from the root; on a symlinked root; on a copy under "a b é ü 日本"; with PYTHONHASHSEED 1 and 12345
- Then: All outputs are byte-equal; the tree is unchanged
- Actual: All outputs byte-equal
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:472

Evidence (transcript): transcripts
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## TC-cli-13 (VS-13): A comment or a blank line in a wrapper body keeps every key

- Given: A copy with a comment and a blank line in the next-action run body and the state-write git body
- When: Run the guard
- Then: No key changes
- Actual: No key changed
- Result: pass
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e
- Test: .sdlc/slices/S-005b/verification/r0/tests/cli-1/push-guard-plan-r0.verify-cli.test.mjs:501

Evidence (transcript): guard transcript
See `.sdlc/slices/S-005b/verification/r0/logs/cli-1-plan-r0-transcripts.txt`.

## Attacks

None beyond the cases.

## Seeds

- gh pr merge is not a forgeViolation: A new gh pr merge call through the run wrapper changes forge and wrapperVerbs only. A reviewer sees it as a pin change. It does not push a verify branch, so it is not a refutation. (skills/sdlc/test/push_guard.py)
- S5: test, fixtures and prompts directories are outside the scan: A push script in skills/sdlc/test, fixtures or prompts changes no key. This is the stated design. Recorded as seed S5. (skills/sdlc/test/push_guard.py)
- A dangling symlink makes the guard crash with exit 1: The traceback ends in FileNotFoundError. The pin test fails closed, but the message does not name the symlink. (skills/sdlc/test/push_guard.py)
- testkit: module-loader cannot import a mutant that edits a wrapper body in place: Two body-edit mutants gave importError, so their push behavior is untested. The guard flags both with wrapperBodies. (skills/sdlc/test/testkit/module-loader.mjs)
