# Tests S-023

- `main derives the format once and patch-slice uses it` — R-059-a — fails: main passes no format to `patch_slice`, which receives three arguments.
- `main derives the format once and base-branch uses it` — R-059-a — characterization: `base-branch` already derives the format once.
- `patch_slice takes fmt as an argument` — R-059-b — fails: `patch_slice()` takes 3 positional arguments but 4 were given.
- `a config without branchFormat falls back to load_format` — R-059-c — characterization: the fallback already names `sdlc/S-001`.
- `slice_side_branches matches verify and attempt tails under a custom format` — R-083-a — fails: module has no attribute `slice_side_branches`.
- `slice_side_branches matches under a lowercase format` — R-083-c — fails: module has no attribute `slice_side_branches`.
- `state-write.py holds no local regex for verify or attempt names` — R-083-b — characterization: the source holds no such pattern now. The test guards the future.
