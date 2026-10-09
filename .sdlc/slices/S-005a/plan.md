# S-005a plan: tails: state, verify, attempt (revision 0)

## Approach
This slice comes from the split of S-005. It carries only R-008, R-009 and R-010. R-119 goes to S-005b, and R-093 goes to S-027 (ADR-20261009-062918-decision-judge-S-005-7fbd).
The product change is two rows in the `TAILS` table of `skills/sdlc/branches.py`: `verify` and `attempt`. `KINDS` and the `--round`, `--profile` and `--part` CLI flags exist on main already.
The `state` row exists since S-003. R-008 needs only tests that pin the CLI output and an explicit `ts`.
Reuse the two `TAILS` rows and the `branches.test.mjs` cases from `sdlc/S-005-attempt-2` (commits e4e0882 and 9e1e71b). They held spec-fidelity, cli and contract in every round of S-005.
Do not take `push_guard.py`, `push-guard.test.mjs` or any `.sdlc/slices/S-005/verification/` file from that branch. They belong to S-005b.
Add one CLI test for R-008: `name --kind state` prints `sdlc/state-` and 14 UTC digits between two UTC clock reads.

## Files
- Modify `skills/sdlc/branches.py`: add the `verify` row (parts `id`, `round`, `profile`, `part`; tail `<id>-v<round>-<profile>-<part>`) and the `attempt` row (parts `id`, `n`; tail `<id>-attempt-<n>`) to `TAILS`. About 5 lines.
- Modify `skills/sdlc/test/branches.test.mjs`: add the attempt-2 cases and one new CLI state test. About 60 lines.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`.
- T-R-008a (new) "name --kind state prints sdlc/state- and the current UTC time": run `branches.py name --repo <git repo> --kind state` with `TZ=Pacific/Kiritimati`. Assert exit 0, `branch` matches `^sdlc/state-(\d{14})$`, and the digits lie between UTC reads before and after the call. Passes now (characterization of the S-003 row).
- T-R-008b (from attempt-2) "an explicit state ts is used as given under a prefixed format, and an empty ts generates one": `name("feature/PROJ-1-{name}", "state", ts="20261008101500")` returns `feature/PROJ-1-state-20261008101500`. `tail("state", ts="")` matches `^state-\d{14}$`. Passes now (characterization).
- T-R-009a (from attempt-2) rows in "name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds": `--kind verify --id S-001 --round 0 --profile http-api --part 0` prints `sdlc/S-001-v0-http-api-0`; round 2 part 3 prints `sdlc/S-001-v2-http-api-3`. Fails now: exit 2, no tail row for `verify`.
- T-R-009b (from attempt-2) verify keys in "tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part": `tail("verify", ...)` returns `S-001-v0-http-api-0`. A missing `id`, `round`, `profile` or `part`, and an empty `profile`, each raise `Fail` that names the part. Also `verify_lower` in the format test: `feature/PROJ-1-{name:lower}` gives `feature/PROJ-1-s-001-v0-http-api-0`. Fails now.
- T-R-009c (from attempt-2) row "verify without --profile" in "name without a required part exits 2 with one JSON error and no traceback": exit 2, one JSON error that names `profile`. Fails now: the error names the kind.
- T-R-010a (from attempt-2) rows in the same name test as T-R-009a: `--kind attempt --id S-001 --n 1` prints `sdlc/S-001-attempt-1`; `--id S-fix-M-1-2 --n 3` prints `sdlc/S-fix-M-1-2-attempt-3`. Fails now.
- T-R-010b (from attempt-2) attempt keys in the tail test and `attempt_lower` in the format test: `tail("attempt", id="S-001", n=1)` returns `S-001-attempt-1`; a missing `id` or `n` raises `Fail` that names the part; the lowercased format gives `feature/PROJ-1-s-001-attempt-1`. Fails now.
- T-R-010c (from attempt-2) row "attempt without --n" in the missing-part test: exit 2, one JSON error that names `n`. Fails now.

## Steps
1. Test-writer: apply the `skills/sdlc/test/branches.test.mjs` hunks of `git diff origin/main...sdlc/S-005-attempt-2 -- skills/sdlc/test/branches.test.mjs`. Add T-R-008a. Run the file and confirm that only the verify and attempt cases fail.
2. Implementer: add the `verify` and `attempt` rows to `TAILS` in `skills/sdlc/branches.py`, as on `sdlc/S-005-attempt-2` (`git diff origin/main...sdlc/S-005-attempt-2 -- skills/sdlc/branches.py`).
3. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.
4. Run the three acceptance commands and check their output:
   - `python3 skills/sdlc/branches.py name --repo . --kind state`
   - `python3 skills/sdlc/branches.py name --repo . --kind verify --id S-001 --round 0 --profile http-api --part 0`
   - `python3 skills/sdlc/branches.py name --repo . --kind attempt --id S-001 --n 1`

## Risks
- Scope bleed from attempt-2: a whole-branch merge or cherry-pick brings in `push_guard.py` and the stale S-005 verification files. Take only the two file hunks named above.
- The verify parts `round` and `part` are integers on the CLI and free values in the Python API. The tail formats them with `str`, as the run row does with `n`. A later parse slice (R-068 round trip) must accept the same shape.
- `{name:lower}` lowercases the slice id (`s-001`). This matches the existing kinds and the spec. Parse must reverse it in a later slice.
- The state test reads the wall clock. A second boundary between the reads does not break it, because it checks a range.

## Critique responses
- No critiques at revision 0.
