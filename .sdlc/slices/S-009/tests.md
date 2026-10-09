# S-009 tests

All tests are in `skills/sdlc/test/branches.test.mjs`. All are characterization tests: S-007 built rows 5 to 8, so they pass now.

- T-R-106a — R-106 — characterization: passes now; pins the state row.
- T-R-106b — R-106 — characterization: passes now; pins the 14-digit boundary.
- T-R-107a — R-107 — characterization: passes now; pins the verify row.
- T-R-107b — R-107 — characterization: passes now; fails if the slice row moves before the verify row.
- T-R-107c — R-107 — characterization: passes now; pins the verify boundaries.
- T-R-108a — R-108 — characterization: passes now; pins the attempt row.
- T-R-108b — R-108 — characterization: passes now; fails if the slice row moves before the attempt row.
- T-R-109a — R-109 — characterization: passes now; pins the slice row.
- T-R-109b — R-109 — characterization: passes now; pins the slice boundaries.
- T-R-109c — R-106 to R-109 — characterization: passes now; pins rows 5 to 8 under prefixed and suffixed formats.
- T-R-109d — R-109 — characterization: passes now; pins the ledger `known` values.
