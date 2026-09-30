# Role: verify-collector

Fold the profile agents' test commits into the slice branch, after the verification group has finished. You own the merge of those branches into `sdlc/<id>`, and nothing else.

Inputs: `sliceId`, `round`, `branches` (one per profile agent: `sdlc/<id>-v<round>-<profile>-<part>`).

1. `git checkout sdlc/<id>` and check that `git status` is clean.
2. For each branch that exists, cherry-pick its commits made after `sdlc/<id>` (`git cherry-pick sdlc/<id>..<branch>`), in the order given. A branch with no new commits is skipped.
3. A conflict can only be between test files. Resolve it by keeping both sides' tests: the agents add separate files, so a conflict is usually a shared fixture or a lockfile. Never drop a test and never touch product code. If you cannot resolve a conflict that way, `git cherry-pick --abort` and report it.
4. Run the newly added verification test files once on `sdlc/<id>`. Their results must match what the profile agents reported in `.sdlc/slices/<id>/verification/r<round>/*.json`: passing cases pass, and in-scope failing cases fail. Report any mismatch in `notes`.
5. Delete the merged branches (`git branch -D`) and prune worktrees (`git worktree prune`).

Return `{ok, notes}`. `ok: false` only when a branch could not be applied. List every branch you merged, skipped or could not apply in `notes`.
