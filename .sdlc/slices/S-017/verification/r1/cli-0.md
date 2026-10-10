# verify-cli S-017 round 1

- Slice: S-017
- Profile: cli, part 0
- Round: 1
- Commit: da88101
- Verdict: verified (31 of 31 cases pass)

## Environment
python3 branches.py from the S-017 worktree, node --test, gh and glab shell shims on PATH, scratch HOME, TZ=UTC

## Method
The test file runs the real `branches.py preflight` command through `cli-runner`. A `gh` or `glab` shim prints canned JSON. Each case records the command line, stdout, stderr, exit code and the tree diff. The full transcript is in `.sdlc/slices/S-017/verification/r1/logs/cli-0-transcripts.txt`.

Round 1 re-ran VS-1 to VS-5 unchanged and added VS-6 for the round 0 defect (TC-cli-18, a TypeError for a non-string pattern). The fix commit da88101 closes that defect.

## Cases
### TC-cli-1 (VS-1): One regex rule the default satisfies gives ok, no derivation (gh, glab, near variants, given format) - VS-1: one regex the default satisfies gives ok and no derivation (gh)
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-091 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:44`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: one regex" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-2 (VS-1): One regex rule the default satisfies gives ok, no derivation (gh, glab, near variants, given format) - VS-1: same through glab
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-091 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:58`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: same through glab" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-3 (VS-1): One regex rule the default satisfies gives ok, no derivation (gh, glab, near variants, given format) - VS-1: near variants the default fails give exit 1 and no derived format
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-091 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:70`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: near variants" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-4 (VS-1): One regex rule the default satisfies gives ok, no derivation (gh, glab, near variants, given format) - VS-1: given format is kept and a passing regex still gives ok
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-091 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:82`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: given format" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-5 (VS-2): Two rules or a negated rule, no format: no derivation, generic suggestion, labelled failing samples - VS-2: starts_with plus ends_with, no format: no derivation, generic suggestion
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-092 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:90`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: starts_with plus" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-6 (VS-2): Two rules or a negated rule, no format: no derivation, generic suggestion, labelled failing samples - VS-2: negated contains, starts_with, ends_with, regex never derive
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-092 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:104`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: negated" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-7 (VS-2): Two rules or a negated rule, no format: no derivation, generic suggestion, labelled failing samples - VS-2: three rules, and a given format, give no derivation
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-092 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:122`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: three rules" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-8 (VS-2): Two rules or a negated rule, no format: no derivation, generic suggestion, labelled failing samples - VS-2: one starts_with rule derives (control)
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-092 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:136`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: one starts_with" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-9 (VS-2): Two rules or a negated rule, no format: no derivation, generic suggestion, labelled failing samples - VS-2: rule label fallbacks name the failing rule
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-092 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:143`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: rule label" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-10 (VS-3): Rules of another type or an empty list leave rules empty and ok; per-sample rule fails only its sample - VS-3: rules of another type or an empty list leave rules empty and ok
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:152`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-3: rules of another" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-11 (VS-3): Rules of another type or an empty list leave rules empty and ok; per-sample rule fails only its sample - VS-3: a rule for one sample name only fails only that sample
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:167`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-3: a rule for one" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-12 (VS-3): Rules of another type or an empty list leave rules empty and ok; per-sample rule fails only its sample - VS-3: mr mode on gitlab with no rule, and null body, give ok
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:185`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-3: mr mode" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-13 (VS-4): Seven shim scenarios at the public boundary; invalid input exits 2 with one JSON error - VS-4: seven shim scenarios at the public boundary
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:195`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-4: seven" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-14 (VS-4): Seven shim scenarios at the public boundary; invalid input exits 2 with one JSON error - VS-4: invalid input forms all exit 2 with one JSON error
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:238`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-4: invalid" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-15 (VS-4): Seven shim scenarios at the public boundary; invalid input exits 2 with one JSON error - VS-4: stdout is one JSON line for ok, fail and unchecked
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:260`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-4: stdout" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-16 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: malformed, non-list, huge bodies never corrupt the verdict
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:268`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: malformed" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-17 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: glab broken answers
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:297`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: glab broken" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-18 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: hostile pattern and label text never crash or leak
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:318`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: hostile" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-19 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: bad regex is unevaluated and never blocks; wrong-typed fields do not crash
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:335`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: bad regex" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-20 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: rules with odd operator or parameters give unevaluated, not a crash
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:358`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: rules with odd" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-21 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: absent gh and absent glab are reported as unknown, not as a crash
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:375`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: absent" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-22 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: a hanging shim ends with unknown rules and leaves the repo alone
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:389`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: a hanging" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-23 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: running twice gives the same verdict and no repo change (idempotency)
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:399`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: running twice" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-24 (VS-5): Broken forge answers never corrupt the verdict or change the repo - VS-5: unicode and spaced repo path, and CI env, work
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-074 and R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:413`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: unicode" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-25 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: every non-string pattern on every string operator is unevaluated on gh
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:431`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: every non-string" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-26 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: a missing pattern key is unevaluated too
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:449`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a missing" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-27 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: a bad rule mixed with a good rule, in both orders, never derives and never crashes
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:459`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a bad rule mixed" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-28 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: a bad regex rule mixed with a passing regex rule
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:475`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a bad regex rule" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-29 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: a non-string pattern with a given format keeps the given format
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:487`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a non-string pattern with" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-30 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: glab non-string branch_name_regex never crashes
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:495`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: glab non-string" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

### TC-cli-31 (VS-6): A non-string pattern is unevaluated and never crashes preflight - VS-6: gh rule fields of odd types (ruleset_id, name, negate) do not crash
- Given: A scratch git repo with a gh or glab shim on PATH that prints canned JSON
- When: Run the real branches.py preflight with the command line shown in the transcript log
- Then: Exit code, JSON keys and the repo tree match the spec
- Expected: As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged
- Actual: All assertions held
- Result: pass
- Spec source: R-100 acceptance; round 0 defect TC-cli-18
- Test: `.sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:508`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: gh rule fields" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`

```
treeUnchanged: true; see transcript log
```

## VS-6 coverage
Patterns tried: 5, 0, 1.5, true, false, null, ['a'], [], {}, {a:1}, -1, 1e400. Operators tried: starts_with, ends_with, contains, regex, each with negate true and false, on gh. Also a missing pattern key, a bad rule mixed with a good rule in both orders, a bad regex mixed with a passing regex, a given format, glab `branch_name_regex` in `pr` and `mr` mode, and odd `ruleset_id`, `name` and `negate` values. Every run exited 0 or 1 with one JSON object, no traceback and an unchanged tree. Bad rules gave `unevaluated` samples and a `cannot evaluate` note. No bad rule derived a format.

## Attacks
None beyond the cases above.

## Seeds
- preflight is quadratic in the number of forge rules (`skills/sdlc/branches.py`). Round 0 measured 20000 rules at 18.9 s. Real forges cap rules far below this.
