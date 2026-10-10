# Plan S-027b: integrator deletes attempt branches found through branches.py list

## Approach
This slice changes one prompt, `integrator.md`, and the tests that read it. The Clean up section names attempt branches by the literal `sdlc/<id>-attempt-*`. Under a custom format that pattern misses them. The integrator now runs `python3 "<skill>/branches.py" list --repo . --kind attempt` and keeps the entries whose `id` equals the slice id, ignoring case, because `list` prints the format's spelling of the id. It deletes each kept branch locally. In `pr`, `mr` and `stack` modes it also runs `git push origin --delete <branch>` for each one. The parent walk (split slices, `splitInto`, finished parents) keeps its rules and uses the same list command per parent id. The `branches.py list` command already exists (S-008 to S-010), so no script changes. All text stays in STE and passes `ste-check.py`. The other integrator literals (`sdlc/<id>` x9, `sdlc/run-<n>` x3, `sdlc/<id>-v*`) belong to S-027c.

## Files
- Modify `skills/sdlc/prompts/integrator.md`: rewrite the Clean up intro sentence that spells `sdlc/<id>-attempt-<n>`, step 1 (drop its attempt half; the verify half `sdlc/<id>-v*` stays for S-027c), step 2 and step 3. Step 2 holds the list command, the id filter, the local delete and the remote delete. Step 3 repeats step 2 for each finished parent id. Step 4 stays.
- Modify `skills/sdlc/test/prompts.test.mjs`: change the test `the integrator deletes archived attempt branches once a slice ships` (it asserts the old literal) and add the tests below.

## Tests
- R-093: `T-R-093a: integrator finds attempt branches through branches.py list`, in `skills/sdlc/test/prompts.test.mjs`. It reads `integrator.md`. It asserts the Clean up section holds `branches.py" list --repo . --kind attempt` and says to keep the entries of this slice. It asserts the section holds no `sdlc/<id>-attempt` and no `-attempt-*`. It asserts the parent step still holds `splitInto` and the sentence "Never delete a branch of a slice that is not finished".
- R-093: `T-R-093b: integrator deletes each attempt branch locally and on the remote in pr, mr and stack modes`. It asserts the Clean up section holds `git branch -D`, holds `git push origin --delete`, names `pr`, `mr` and `stack` for the remote delete, and says a name the remote lacks is fine.
- R-093: `T-R-093c: the attempt list command gives a filterable id under a custom format`. This is a behavior test of the output the prompt relies on. It makes a scratch repo with `config.json` `branchFormat` `feature/PROJ-1-{name:lower}` and the branches `feature/PROJ-1-s-001-attempt-1`, `feature/PROJ-1-s-001-attempt-2`, `feature/PROJ-1-s-002-attempt-1` and `feature/PROJ-1-s-001`. It runs the exact command text the test extracts from `integrator.md`, with `<skill>` replaced by the skill directory. It filters the entries as the prompt says (id equals `S-001`, ignoring case) and asserts that the result is the two attempt branches of `S-001`, in order. It repeats the run under the default format with `sdlc/S-001-attempt-1`.
- Existing tests stay: `the integrator trusts the gate receipt ...` (still finds `sdlc/<id>-v*`), the `base-branch` tests and the placeholder tests. The old test `the integrator deletes archived attempt branches once a slice ships` keeps its `**Clean up**`, `splitInto` and "Never delete a branch of a slice that is not finished" assertions. Only its `sdlc\/<id>-attempt-\*` assertion changes, because the spec replaces that literal.

## Steps
1. Add T-R-093a to T-R-093c and run `npm test`. Confirm they fail for the right reason (old literal present, no list command).
2. Edit the Clean up intro, steps 1, 2 and 3 of `integrator.md`.
3. Edit the old attempt test as listed in Tests.
4. Run `python3 skills/sdlc/ste-check.py` on `integrator.md`, then `npm test` in full.
5. Hand-check: put `sdlc/<id>-attempt-*` back in step 2 and confirm T-R-093a fails. Remove `--kind attempt` and confirm T-R-093c fails.

## Risks
- The `id` that `list` prints is the format's spelling. Under `{name:lower}` it is `s-001`. A prompt that compares it with `S-001` without ignoring case finds nothing and leaves dead branches. Mitigation: the prompt says "ignoring case" and T-R-093c runs a lowercase format.
- An attempt id can look like another slice's verify id (`S-004-attempt-1-v0-...`). `list --kind attempt` parses only attempt tails, so verify branches are not listed. T-R-093c includes no such name, because R-093 does not ask for it.
- `list` reads local branches only. A branch that exists only on the remote is not deleted. The old text had the same limit. Record it in the ADR below.
- Step 1 loses its attempt half. If a reader expects the stale-branch sweep to cover attempts, step 2 covers them. T-R-093a asserts step 2.

## Critique responses
- ADR-20261010-071940-decision-judge-S-027b-af8c: the integrator filters the listed attempt branches by the slice id, ignoring case. The prompt says "ignoring case". T-R-093c runs a lowercase format and asserts the two `S-001` attempt branches in order. The plan adds no `--ids` option to `branches.py`.
- ADR-20261010-071945-decision-judge-S-027b-d798: step 1 changes only its attempt half. The `sdlc/<id>-v*` half and its test stay for S-027c.
- ADR-20261010-071945-decision-judge-S-027b-e7d5: step 2 deletes each listed branch locally, then runs `git push origin --delete <branch>` and accepts a missing remote ref. `list` stays local-only, so a remote-only attempt branch stays. This limit is recorded in Risks.
