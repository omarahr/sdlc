# Review S-033, lens architecture, round 1

## Result

No blocking findings.

## Notes

- `branch_run` now takes `fmt` and reuses `branch_kind`. The format logic stays in `branches.py`. No local regex is added.
- Both callers pass `fmt`. The naming matches the surrounding functions.
- `janitor.py` needs no change. It already loads the format through the module.

## Non-blocking

- The test `the prune treats only branches that parse to milestone...` overlaps older prune tests. Merge it into them if the overlap grows.
- `branch_run` still fails with AttributeError when the committed config JSON is not an object. This exists on main. Fix it in a later slice.
