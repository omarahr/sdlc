# verify-limits: S-fix-M-1-2

Profile: limits, part 0, round 0, commit 5676593. Verdict: pass (6 of 6 cases).

Environment: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr.

## TC-limits-1 (VS-3): 10 MB gh stderr, secret in the first part, gives a short note
- Given: gh shim exits 1 with 10 MB stderr, token line in the first part
- When: preflight --mode pr runs
- Then: Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr
- Actual: note 'rules unknown on github: gh exited with status 1 (HTTP 403)' (59 chars), stdout 597 chars, stderr 0 chars, ok true, secret absent
- Result: pass
- Spec source: slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029)
```
number: 200 note / 20000 stdout (slice plan)
note=59 chars; stdout=597 (586 for last); runs=1; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr
```

## TC-limits-2 (VS-3): 10 MB gh stderr, secret in the middle part, gives a short note
- Given: gh shim exits 1 with 10 MB stderr, token line in the middle part
- When: preflight --mode pr runs
- Then: Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr
- Actual: note 'rules unknown on github: gh exited with status 1 (HTTP 403)' (59 chars), stdout 597 chars, stderr 0 chars, ok true, secret absent
- Result: pass
- Spec source: slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029)
```
number: 200 note / 20000 stdout (slice plan)
note=59 chars; stdout=597 (586 for last); runs=1; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr
```

## TC-limits-3 (VS-3): 10 MB gh stderr, secret in the last part, gives a short note
- Given: gh shim exits 1 with 10 MB stderr, token line in the last part
- When: preflight --mode pr runs
- Then: Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr
- Actual: note 'rules unknown on github: gh exited with status 1' (48 chars), stdout 597 chars, stderr 0 chars, ok true, secret absent
- Result: pass
- Spec source: slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029)
```
number: 200 note / 20000 stdout (slice plan)
note=48 chars; stdout=597 (586 for last); runs=1; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr
```

## TC-limits-4 (VS-3): Output size does not grow with stderr size
- Given: stderr of 1 KB, 1 MB, 10 MB
- When: preflight runs for each
- Then: Same stdout size each time
- Actual: stdout size 597, 597, 597
- Result: pass
- Spec source: slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029)
```
stdout chars: [597, 597, 597]; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr
```

## TC-limits-5 (VS-3): Wall time of the 10 MB failure case
- Given: 10 MB stderr gh shim
- When: preflight, 2 warm-up runs, 10 runs
- Then: No budget stated in the spec; record only
- Actual: median 198.2 ms, p95 221.9 ms, worst 221.9 ms
- Result: pass
- Spec source: none: no time budget stated; measurement only
```
number: none stated (seed only)
runs=10, median=198.2ms, p95=221.9ms, worst=221.9ms; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr
```

## TC-limits-6 (VS-3): A stalled gh ends at FORGE_TIMEOUT with a one-line note
- Given: gh shim sleeps 30 s; FORGE_TIMEOUT set to 1 s
- When: read_rules runs
- Then: One-line note under 200 characters plus prefix, returns in under 5 s
- Actual: returned in 1.01 s; one-line note about 100 characters naming the argv, no home path
- Result: pass
- Spec source: slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029)
```
number: FORGE_TIMEOUT=1 (set for test; production value 60 in branches.py:91)
elapsed=1.01s, note='rules unknown on github: Command ... timed out after 1 seconds'; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr
```

## Seeds
- Timeout note carries the gh argv: The timeout note holds the full argv, for example the encoded branch path. It holds no secret or home path in this run, and stays under 200 characters.
- 10 MB stderr is read into memory: subprocess.run with capture_output reads all 10 MB before the cap applies. The run took about 200 ms median. The plan accepts this.
