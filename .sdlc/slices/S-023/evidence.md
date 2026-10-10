# Evidence S-023

## R-059
state-write.py derives the branch format once in main(). It passes the format to patch_slice. A config without branchFormat falls back to load_format.
Tests:
- main derives the format once and patch-slice uses it
- main derives the format once and base-branch uses it
- patch_slice takes fmt as an argument
- a config without branchFormat falls back to load_format

## R-083
slice_side_branches matches verify and attempt tails through branches.parse. The source holds no local regex for these names. ship-prune and collect-verification do not exist yet. The helper has no caller (see ADR-20261010-043504-decision-judge-S-023-770f).
Tests:
- slice_side_branches matches verify and attempt tails under a custom format
- slice_side_branches matches under a lowercase format
- state-write.py holds no local regex for verify or attempt names
- slice_side_branches does not match a slice id that is a prefix of another id
- slice_side_branches ignores case only under a lowercase format

Files changed: skills/sdlc/state-write.py, skills/sdlc/test/scripts.test.mjs.
The full suite passed on commit c592bd9 (suite receipt valid).
