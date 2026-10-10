# Run: parse-list (M-1)

Test file: `e2e/tests/parse-list.test.mjs` on branch `sdlc/M-1-e2e-parse-list`.
Each test ran `branches.py` (and `janitor.py`, `next-action.py` for SC-M-1-080) in a scratch git repo.
Each call was checked for empty stderr, no `Traceback` and one JSON object on stdout.

## SC-M-1-014 pass
All eight kinds parse with the expected parts. `known` is null in each.

## SC-M-1-015 pass
Dashed ids and areas parse whole (`a-b`, `api-v2`, `S-fix-M-1-2-attempt-3`, `S-fix-M-1-2-v1-cli-0`).

## SC-M-1-016 pass
`main`, `sdlc/feature-x`, `sdlc/`, the empty string and `feature/PROJ-1-foo` give kind null with exit 0.
`feature/PROJ-1-S-002` gives slice `S-002`. Refs and files are byte-equal before and after.

## SC-M-1-017 fail
Expected: kind null for `sdlc/state-` plus 14 Arabic-Indic digits (spec: ASCII timestamps only).
Observed: kind `state`, `ts` = the Arabic-Indic digits.
```
{"kind": "state", "tail": "state-٢٠٢٦١٠٠٨١٠١٥٠٠", "ts": "٢٠..."}
```
The 13-digit, 15-digit, letter-suffixed, `run-x` and `run-` cases give null. `run-007` gives n 7. The huge run number does not crash.
Cause (read from the code): the state row uses `\d`, which matches Unicode digits in Python 3 `str` patterns.

## SC-M-1-018 pass
`M-2-e2e` gives e2e, `M-2-e2e-api` gives e2e-area, and the other four forms give null.

## SC-M-1-019 pass
Probe: `S-001` known true; `s-009` known false; no ids gives null. `FEATURE/PROJ-1-S-001` still parses as slice `S-001`.
Milestone probes: `M-1` known true for both forms; `m-2` known false.
Test fix: the CLI gives id `s-001` (the branch text) with `known` null. The first draft of the test expected `S-001` from the CLI. The spec gives the canonical id only when an id list is passed. The test now checks the id without case.

## SC-M-1-020 pass
Run order is 1, 2, 10. Slice list is `S-001`, `S-002` with no attempt or verify branches.
Attempt order is `S-002-attempt-1`, `S-001-attempt-2`, `S-001-attempt-10`.
Test fix: the scenario text lists `S-001-attempt-2`, `S-001-attempt-10`, `S-002-attempt-1`. That order breaks the spec (sort by `n`) and ADR-20261009-182640 (key `n`, then branch name). `S-002-attempt-1` has n 1, so it sorts first. The test asserts the order the spec requires.

## SC-M-1-021 pass
Custom-format list holds only `feature/sdlc/S-002`. Parse of `sdlc/S-001` under it gives null. Default list holds only `sdlc/S-001`.

## SC-M-1-022 pass
Non-git directory and `/nonexistent`: exit 2, `ok` false, an error text. Empty git repo: exit 0, `branches` []. State of the empty repo is unchanged. No file appears in the plain directory.

## SC-M-1-023 pass
Only `sdlc/S-001` is a slice. The three non-ASCII branches parse to null. Output is valid UTF-8.

## SC-M-1-024 pass
8 parallel list and 8 parallel parse calls with 6 branch create/delete cycles: every call exit 0, empty stderr, one JSON object. Refs after = refs before plus `scenario-made`.

## SC-M-1-075 pass
For `sdlc/{name}-dev`, `sdlc/team-a/{name}` and `sdlc/{name}-attempt-1`, name then parse gives the same kind and parts for all eight kinds. `sdlc/S-001` under the `-dev` format gives null. `a-a` under `a-{name}-a` gives null. No write to refs, config, slices or log.

## SC-M-1-080 fail
Under `feature/p-1-{name:lower}`, parse classified look-alike branches (U+017F long s, U+212A Kelvin sign):
```
feature/p-1-S-00K          -> slice   (K = U+212A)
feature/p-1-s-001ſ         -> slice
feature/p-1-ſ-001          -> slice
feature/p-1-s-00K-v0-cli-0 -> verify
```
Expected: null for all. The janitor then deleted `feature/p-1-s-00K-v0-cli-0` (id unknown to the ledger). `next-action.py` ran without a traceback.
Cause (read from the code): `re.IGNORECASE` on a Unicode pattern lets `[A-Za-z]` match U+017F and U+212A.
`feature/p-1-K-1` and `feature/p-1-m-1-e2eK` (look-alike in a non-matching position) parse to null.
