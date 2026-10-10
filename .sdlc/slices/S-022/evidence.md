# Evidence S-022

The slice makes state-write.py name and classify branches through branches.py.

- R-056: tests state-write creates the slice and milestone branches under a custom format; state-write finds the dependency branch through the module under a custom format; base-branch names the milestone branch through the format; 27 final-round cases pass.
- R-057: tests the prune deletes a shipped milestone branch recognized by kind, under a custom format; the prune keeps a branch of another kind under the default format; state-write.py holds no MILESTONE_BRANCH regex; 18 final-round cases pass.
- R-058: tests a run branch with a custom format is advanced and kept as a full name; 2 final-round cases pass.
- R-078: tests state-write creates the slice and milestone branches under a custom format; state-write finds the dependency branch through the module under a custom format; 3 final-round cases pass.
- R-096: tests a milestone branch with a slice pull request open against it is kept under a custom format; milestone_branches_with_open_slice_pr returns the milestone branch name from the format; 4 final-round cases pass.

Files changed: skills/sdlc/state-write.py, skills/sdlc/test/scripts.test.mjs.
The full suite passed on the final commit fc812fe: receipt valid.
