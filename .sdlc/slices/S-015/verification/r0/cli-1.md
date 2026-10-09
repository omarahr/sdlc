# S-015 cli part 1, round 0

Commit: 7f87721. Verdict: all 17 cases pass (VS-7, VS-8, VS-9).

Environment: Node test runner, python3, git; gh and glab shims from the testkit (stub-server, glab-stub); restrictedPath for absent tools

## TC-cli-1 (VS-7): No gh and no glab: ok true, one rules unknown note, all unchecked
- Given: Github and gitlab repos, modes pr and stack, PATH holds python3 and git only
- When: preflight --mode pr|stack
- Then: exit 0, ok true, 1 note "rules unknown on <forge>:", 3 unchecked samples
- Actual: as expected: note "rules unknown on github: [Errno 2] No such file or directory: 'gh'"
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:14
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-2 (VS-7): Missing gh with bad ref: only the ref fails
- Given: mr mode, --branch a..b, no gh
- When: preflight
- Then: exit 1, one working sample fail git check-ref-format, one note
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:29
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-3 (VS-7): Signed-out gh gives one note and unchecked
- Given: gh exits 4 with auth login text on stderr
- When: preflight --mode pr
- Then: exit 0, ok true, note carries stderr
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:40
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-4 (VS-7): Signed-out glab gives one note and unchecked
- Given: glab exits 1, 401 on stderr
- When: preflight --mode pr
- Then: exit 0, ok true, note on gitlab
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:52
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-5 (VS-7): Garbage, empty, non-list, binary and null output never crash
- Given: gh or glab print 8 kinds of bad stdout
- When: preflight --mode pr
- Then: exit 0, empty stderr, ok true, no traceback
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:62
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-6 (VS-7): gh exit 127 gives one note, ok true
- Given: gh exits 127
- When: preflight
- Then: exit 0, ok true, one note
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:87
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-7 (VS-8): Same bad regex on every sample gives one cannot evaluate note
- Given: gh returns one uncompilable regex for each sample
- When: preflight --mode pr
- Then: 1 note, 3 unevaluated, ok true
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:95
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-8 (VS-8): Distinct bad rules: notes in first-seen order without duplicates
- Given: Rules zeta, alpha, overlapping across samples
- When: preflight --mode pr
- Then: notes [zeta, alpha]
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:107
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-9 (VS-8): Stack mode: unknown kind and bad regex each give a note
- Given: rule kind weird and regex (?P< on 3 samples
- When: preflight --mode stack
- Then: notes order odd, bad; ok true
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:123
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-10 (VS-8): GitLab bad push rule gives one note across samples
- Given: glab returns branch_name_regex "("
- When: preflight --mode pr
- Then: 1 note "cannot evaluate push rule", all unevaluated
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:132
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-11 (VS-8): A read_rules failure on call 2 yields one note and all unchecked
- Given: gh call 1 returns a bad regex, call 2 fails
- When: preflight --mode pr
- Then: 1 note rules unknown; samples unchecked; rules []
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:141
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-12 (VS-9): A rule for one sample does not fail the others
- Given: gh returns starts_with feature/ for call 1 only
- When: preflight --mode pr
- Then: slice fail with label, state and e2e pass; 3 calls with the encoded names
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:151
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-13 (VS-9): Overlapping rules give per-sample first failing label
- Given: Rules a,b,c vary per sample
- When: preflight --mode pr
- Then: [pass,null],[fail,b],[fail,c]; union rules a,b,c
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:175
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-14 (VS-9): Negated rule applies per sample
- Given: negate on call 1 and 2
- When: preflight --mode pr
- Then: fail, pass, pass
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:188
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-15 (VS-9): Working sample equal to a slice name keeps its own row
- Given: mr mode, --branch sdlc/S-001
- When: preflight --mode mr
- Then: one working row failing; one gh call
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:199
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-16 (VS-9): Rule is judged on the formatted name
- Given: --format team/{name:lower}, regex ^team/s-001$
- When: preflight --mode pr
- Then: slice name team/s-001 passes
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:210
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## TC-cli-17 (VS-9): GitLab push rule applies to every sample with its own result
- Given: branch_name_regex ^sdlc/(S|M)-
- When: preflight --mode pr
- Then: [pass],[fail push rule],[pass]; 1 glab call
- Actual: as expected
- Result: pass
- Test: .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:223
- Evidence: .sdlc/slices/S-015/verification/r0/logs/cli-1-run.log

## Seeds
- R-040 duplicate name unreachable: A working sample can equal a slice name only in mr mode, but mr mode has no other sample. The shared by_sample entry case cannot occur through the CLI.