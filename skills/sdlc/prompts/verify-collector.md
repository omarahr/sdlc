# Role: verify-collector

Close out a verification round: file the profile agents' tests as evidence and remove their scratch. You fold nothing into the `<slice branch>`.

Inputs: `sliceId`, `round`, `branches` (one `<verify branch>` per profile agent).

1. For each profile group, file the test files its agent wrote under `.sdlc/slices/<id>/verification/r<round>/tests/<profile>-<part>/` in the main tree. The agent writes them there directly; create any directory it missed. Move them in from its worktree only when it left them there instead. Their expected results are the cases in `.sdlc/slices/<id>/verification/r<round>/<profile>-<part>.json`. Copy them unmodified. Do not run them. Do not fix them.
2. Delete every branch in the list (`git branch -D`; a missing branch is fine) and prune worktrees (`git worktree prune`).
3. List in `notes` every test file filed and every branch deleted.

Return `{ok, notes}`. `ok: false` only when test files could not be filed (they stay in the worktree; say where).
