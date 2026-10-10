# Verification: S-019, profile cli, round 0

Commit: f22f644 · Verdict: verified (11 cases, 11 pass)

Environment: Node 24.19, python3, git; real branches.py from worktree of sdlc/S-019, scratch git repos from cli-runner with controlled HOME, TZ and PYTHONUTF8

Run: `node --test .sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` (transcripts in `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt`)

## TC-cli-1 (VS-1): A repo with no run branch gives an empty list and n=1 names sdlc/run-1

- Given: scratch repo, branches sdlc/S-001 and sdlc/feature-x
- When: list --kind run, then name --kind run --n 1
- Then: empty list; branch value sdlc/run-1; exit 0; tree unchanged
- Result: pass · spec source: R-047 acceptance (plan notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:12`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-1`

## TC-cli-2 (VS-1): Count 1 and 3 give n+1; custom format; run branches of an older format are not counted

- Given: branches sdlc/run-1..3, old/run-9, feature/PROJ-1-run-1..2, sdlc/run-7; config branchFormat
- When: list and name with default format, --format and config format
- Then: list holds only branches under the format; name gives run-4 and feature/PROJ-1-run-3
- Result: pass · spec source: R-047 acceptance (plan notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:20`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-2`

## TC-cli-3 (VS-1): Hostile --format values fail with a clear error and no tree change

- Given: 30 values: flag-like, traversal, brace, empty, .lock, .., ~, NUL
- When: name --kind run --format=<value>; list --format=--bad
- Then: exit 2 with a JSON error, no traceback, refs unchanged; NUL gives a spawn error
- Result: pass · spec source: R-047 acceptance (plan notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:38`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-3`

## TC-cli-4 (VS-2): The last list entry is the highest n, numeric not text

- Given: branches run-2, 10, 9, 100, 11, 1
- When: list --kind run, then name for the last n
- Then: order 1,2,9,10,11,100; last is sdlc/run-100; name equals it; no branch created
- Result: pass · spec source: R-121 acceptance (plan notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:56`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-4`

## TC-cli-5 (VS-2): No run branch gives an empty list; a non-repo fails cleanly; padded and lower-case names

- Given: repo with only a slice branch; a plain directory; run-07, run-7, run-8; format sdlc/{name:lower}
- When: list --kind run
- Then: exit 0 and [] for no run branch; exit non-zero with no traceback for a non-repo; last is run-8
- Result: pass · spec source: R-121 acceptance (plan notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:69`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-5`

## TC-cli-6 (VS-3): User branches outside the loop kinds print no kind

- Given: 15 names: sdlc/feature-x, sdlc/, sdlc/run-, sdlc/feature-S-002, sdlc/s-002, sdlc/S-, trailing slash, RUN-1, sdlc/sdlc/S-002
- When: parse with format sdlc/{name}
- Then: kind null, exit 0, empty stderr, tree unchanged for each
- Result: pass · spec source: R-101 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:85`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-6`

## TC-cli-7 (VS-3): Near misses are recorded (trailing newline, S-002x, unicode digits)

- Given: names sdlc/S-002x, S-002 plus newline, run-U+0663, M-1 plus newline, S-U+0663, S-002 plus space
- When: parse with format sdlc/{name}
- Then: trailing space and S-U+0663 print no kind; S-002x parses as slice id S-002x (slice ids may carry letters); a newline never occurs in a git branch; run-U+0663 parses as run (seed)
- Result: pass · spec source: R-101 acceptance; seeds for the rest
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:92`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-7`

## TC-cli-8 (VS-3): The config format and the default format give the same no-kind answer

- Given: config branchFormat sdlc/{name}; and a repo without config
- When: parse sdlc/feature-x
- Then: kind null in both
- Result: pass · spec source: R-101 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:103`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-8`

## TC-cli-9 (VS-4): feature/PROJ-1-S-002 parses as slice S-002; foo, other prefix and a repeated prefix do not

- Given: format feature/PROJ-1-{name}
- When: parse for four branches
- Then: kind slice and id S-002 with empty stderr; kind null for foo, PROJ-2 and the repeated prefix
- Result: pass · spec source: R-118 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:111`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-9`

## TC-cli-10 (VS-4): A prefix with regex characters is taken literally

- Given: formats a.b+c(x)/, (a|b)$/, p.d+/, pre-{name}-post and Feat/{name:lower}
- When: parse a matching and a near-matching branch
- Then: the matching branch gives slice S-002; the near match gives kind null; git-unsafe characters (square brackets, star, caret, backslash) give a clear exit 2 error
- Result: pass · spec source: R-118 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:125`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-10`

## TC-cli-11 (VS-4): Exit codes and stderr are stable on bad input

- Given: missing flags, bad format, double placeholder, missing repo, flag-like branch values
- When: each command run twice
- Then: same exit code and stderr on both runs; no traceback; tree unchanged
- Result: pass · spec source: R-118 acceptance (plan notes: stable exit codes and stderr)
- Test: `.sdlc/slices/S-019/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:135`
- Evidence: `.sdlc/slices/S-019/verification/r0/logs/cli-0-transcripts.txt` section `TC-cli-11`

## Attacks

- 30 hostile --format values (flag-like, traversal, braces, empty, NUL): all refused with exit 2 and a JSON error, or a spawn error for NUL; no tree change

## Seeds

- branches.py parse: a letter suffix after the slice id parses as a slice: parse sdlc/S-002x prints kind slice, id S-002x. The slice row accepts S-[A-Za-z0-9-]+ on purpose (split ids, fix ids), so a user branch like sdlc/S-002x triggers a rename ask. No spec text forbids it. (`skills/sdlc/branches.py`)
- branches.py parse: unicode digits count as run numbers: parse sdlc/run-U+0663 prints kind run. The pattern uses \d, which matches non-ASCII digits. list --kind run would count that branch, and n+1 could then name a different branch. A [0-9] class would close it. (`skills/sdlc/branches.py`)
- branches.py: a trailing newline matches the $ anchor: parse sdlc/S-002 plus newline prints kind slice. Git refuses such names, so no real branch triggers it. Use \Z for an exact match. (`skills/sdlc/branches.py`)
