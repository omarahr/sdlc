# Verify cli: S-014 r0 part 0

Slice S-014. Profile cli. Round 0. Commit c1b5dff. Verdict: verified, 12 cases pass, 0 fail.

Environment: python3 -I driver calls read_rules in a scratch cwd; cli-runner (scratch HOME, controlled env), glab/gh stub-server shims, restrictedPath; node --test. No CLI command calls read_rules yet (S-015), so the real boundary is the function plus its glab child process.

Test file: `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
Run log: `.sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt`

## TC-cli-1 (VS-6): Six forge values make no gh or glab call

- Given: config forge is empty, absent, null, bitbucket, GitHub or 7; gh and glab stubs on PATH
- When: python3 runs read_rules on two samples
- Then: no rules, no notes, empty by_sample, unchecked true, zero stub calls, tree unchanged
- Actual: All six gave the empty shape; gh and glab call counts were 0; tree unchanged
- Result: pass
- Spec source: R-032 acceptance
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-2 (VS-6): No .sdlc config at all makes no call

- Given: repo with no .sdlc
- When: read_rules
- Then: empty shape, no call
- Actual: Empty shape, unchecked true, 0 calls
- Result: pass
- Spec source: R-032 quote
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-3 (VS-6): Invalid JSON config makes no call

- Given: config.json holds '{ not json'
- When: read_rules
- Then: no gh or glab call
- Actual: 0 calls. read_rules raises Fail 'config.json is not valid JSON' instead of the empty shape (seed, no spec source)
- Result: pass
- Spec source: none: spec states no behavior for an invalid config
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-4 (VS-8): PATH with only python3 and git gives the unknown note

- Given: forge gitlab, no glab on PATH
- When: read_rules two samples
- Then: one note rules unknown on gitlab: <reason>, no rules, unchecked true, tree unchanged
- Actual: Note: rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'; unchecked true; tree unchanged
- Result: pass
- Spec source: R-031 acceptance
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-5 (VS-8): Slow glab: timeout gives the note, no hang

- Given: glab shim sleeps 30 s; FORGE_TIMEOUT 1
- When: read_rules
- Then: note, returned in under 10 s, no child alive
- Actual: Returned in 1052 ms with the timeout note; the sleeper pid was gone; tree unchanged
- Result: pass
- Spec source: R-031 quote
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-6 (VS-8): Stalled glab (exec sleep 600) leaves no child

- Given: glab stub with stall
- When: read_rules, timeout 1
- Then: note; no sleep 600 process
- Actual: Note given; no sleep 600 process found
- Result: pass
- Spec source: R-031 quote
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-7 (VS-8): Non-JSON, empty and partial JSON output give one note

- Given: glab exits 0 with each body
- When: read_rules
- Then: one note, unchecked true, one glab call
- Actual: All three gave 'glab printed output that is not JSON'
- Result: pass
- Spec source: R-031 acceptance and ADR f2c2
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-8 (VS-8): Exit 127 and exit 2 (with JSON body) give one note

- Given: glab exits 127; glab exits 2 with a JSON body
- When: read_rules
- Then: one note each, rules empty
- Actual: Notes 'glab exited with status 127' and '... 2'
- Result: pass
- Spec source: R-031 acceptance and ADR f2c2
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-9 (VS-8): NUL and invalid UTF-8 in stderr do not raise

- Given: glab exits 1 with NUL, ESC and 0xff bytes in stderr
- When: read_rules
- Then: one note, no exception
- Actual: One note; NUL and ESC kept in the text, bad bytes replaced; no exception
- Result: pass
- Spec source: R-031 quote
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-10 (VS-8): Long multi-line stderr is passed through

- Given: glab exits 1 with 200 KB and newlines on stderr
- When: read_rules
- Then: one note starting with the stderr (spec: <stderr>)
- Actual: One note; it holds the whole stderr, 200037 chars, with newlines (seed: not one line, not bounded)
- Result: pass
- Spec source: R-031 quote ('<stderr>')
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-11 (VS-8): Repo path with spaces and unicode: argv and cwd right

- Given: repo dir 'rép o é 日本'
- When: read_rules three samples
- Then: one glab call, argv api projects/:fullpath/push_rule, cwd the repo
- Actual: One call; argv and cwd right; unchecked false
- Result: pass
- Spec source: R-030
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## TC-cli-12 (VS-6): gitlab forge with no samples is shaped

- Given: glab returns a regex
- When: read_rules with []
- Then: valid shape
- Actual: rules holds one rule, by_sample empty, unchecked false
- Result: pass
- Spec source: R-030
- Command: `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`

```
see .sdlc/slices/S-014/verification/r0/logs/cli-0-run.txt
```

## Attacks

None beyond the cases above.

## Seeds

- read_rules raises Fail for an invalid config.json instead of returning the no-forge shape: With config.json = '{ not json', read_rules raises Fail ('... is not valid JSON'). It makes no forge call. The spec states no behavior; this matches the repo's config convention. A caller (S-015 preflight) must catch Fail. (skills/sdlc/branches.py)
- A forge note carries stderr unbounded and multi-line: glab stderr of 200 KB with newlines gives one note of 200037 characters with newlines kept; NUL and ESC bytes stay in it. R-031 says '<stderr>' so this follows the spec, but a preflight JSON line or terminal may suffer. The gh path behaves the same. (skills/sdlc/branches.py)
