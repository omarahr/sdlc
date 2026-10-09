# S-008 failures
## Round 0
- The new tests pass with no product code change. S-007 built all parse rows.
- Lint, typecheck and build commands are empty in config. They do not apply.

## Fix round 1
- The cli verifier refuted the slice: `parse` with a run number of 5000 digits raised ValueError from `int()`. The CLI printed a traceback and no JSON.
- Fix: branches.py lifts the int string digit limit at import. Test T-R-102b pins the behavior.
- Seeds (newline tail, unicode digits, slash in area) stay as recorded. No change.
