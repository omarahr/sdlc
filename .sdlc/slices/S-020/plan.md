# Plan S-020: sdlc-loop.js names branches through the format

## Approach
Add `BRANCH_FORMAT` and `branchName` to the config section of `skills/sdlc/sdlc-loop.js`, as the spec shows them. `BRANCH_FORMAT` comes from `A.branchFormat` and falls back to `sdlc/{name}`. `verifyPhase` builds the verifier branch with `branchName`, so no `sdlc/` literal stays in the script. The env-detector call gains `branchFormat: A.branchFormat || null`. `INTERNALS` exports `branchName` and `BRANCH_FORMAT`. A new test in `branches.test.mjs` compares `rt.I.branchName` with `branches.py name` for three formats and the verify tail. Existing tests that pin the env-detector inputs or the default verify branch need only the new key. Only one source file changes.

## Files
- Modify `skills/sdlc/sdlc-loop.js`: define `BRANCH_FORMAT` and `branchName` after `REPO`; change the `branch` arrow in `verifyPhase`; add `branchFormat` to the env-detector inputs; add both names to `INTERNALS`.
- Modify `skills/sdlc/test/branches.test.mjs`: add the loop-script tests.
- Modify `skills/sdlc/test/bootstrap.test.mjs`: add `branchFormat: null` to the pinned env-detector inputs.
- Modify `skills/sdlc/test/verify.test.mjs` only if a test pins a branch under a custom format (none now; default-format assertions stay).

## Tests
- T-R-050a, `branches.test.mjs`: `loadInternals` with no `branchFormat` gives `BRANCH_FORMAT === 'sdlc/{name}'`. With `args.branchFormat = 'feature/PROJ-1-{name}'` it gives that value.
- T-R-050b, `branches.test.mjs`: `branchName('S-001')` gives `sdlc/S-001` by default and `feature/PROJ-1-S-001` for a prefixed format. For `feature/PROJ-1-{name:lower}` it gives `feature/PROJ-1-s-001`, and the tail `S-001-v0-Http-0` is lowercased whole.
- T-R-116a, `branches.test.mjs`: `rt.I.branchName` is a function and `rt.I.BRANCH_FORMAT` is a string.
- T-R-051a, `verify.test.mjs`: with `args.branchFormat = 'feature/PROJ-1-{name:lower}'`, `verifyPhase` passes `branch: 'feature/PROJ-1-s-1-v2-ui-0'` to the profile agent and the collector gets the same names. Default-format tests keep `sdlc/S-1-v2-ui-0`.
- T-R-051b, `branches.test.mjs`: the source of `sdlc-loop.js` holds no template literal that starts with `sdlc/` followed by `${`. The verify branch equals `branches.py name --kind verify` output for the same parts.
- T-R-052a, `bootstrap.test.mjs`: the env-detector inputs equal `{ specPath, gitMode, commitFormat, defaultBranch, branchFormat: null }` without the arg, and carry the string when `args.branchFormat` is set.
- T-R-075a, `branches.test.mjs` ("the loop script and the module name branches the same way"): for `sdlc/{name}`, `feature/PROJ-1-{name}` and `feature/PROJ-1-{name:lower}`, compare `rt.I.branchName(tail)` with the `branch` value of `branches.py name --kind verify --id S-001 --round 2 --profile http-api --part 3 --format <fmt>`. The loop gets the format through `args.branchFormat`; the tail is `S-001-v2-http-api-3`.

## Steps
1. Write the tests above and see them fail.
2. Add `BRANCH_FORMAT` and `branchName` to `sdlc-loop.js`, with no comments in the code.
3. Replace the `branch` arrow in `verifyPhase`.
4. Add `branchFormat: A.branchFormat || null` to the env-detector call.
5. Export both names in `INTERNALS`.
6. Update the pinned env-detector inputs in `bootstrap.test.mjs`.
7. Run `npm test`.

## Risks
- The loop's lowercase rule differs from `branches.py` for a tail with uppercase profile names. The T-R-075a test covers the verify tail; the loop and module both lowercase the whole tail.
- `String.replace` treats `$` patterns in the replacement. A tail has no `$`, and the spec code stays as written.
- Other tests may pin the env-detector inputs. Step 7 finds them.

## Critique responses
- None. No critiques came with this revision.
