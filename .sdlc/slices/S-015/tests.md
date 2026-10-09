# S-015 tests

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-R-038a — R-038 — characterization: passes now, pins the flag format and `given` true
- T-R-038b — R-038 — characterization: passes now, pins the config format and `given` true
- T-R-038c — R-038 — characterization: passes now, pins the default format and `given` false
- T-R-038d — R-038 — characterization: passes now, pins exit 2 for an invalid format
- T-R-039a — R-039 — preflight prints no `samples` for the pr mode
- T-R-039b — R-039 — preflight prints no `samples` for the stack mode
- T-R-039c — R-039 — preflight prints no `samples` for the mr and direct modes
- T-R-039d — R-039 — preflight prints no `samples` under a lowercase format
- T-R-040a — R-040 — no `working` sample in the mr mode
- T-R-040b — R-040 — no `working` sample, so the forge rule is not judged
- T-R-040c — R-040 — preflight prints no `samples` to compare across modes
- T-R-041a — R-041 — preflight prints no `samples`
- T-R-041b — R-041 — preflight prints no `samples` and no rule results
- T-R-041c — R-041 — preflight prints no `samples` and no `rules unknown` note
- T-R-041d — R-041 — preflight prints no merged `cannot evaluate` notes
- T-R-044a — R-044 — output lacks `derived`, `forge`, `rules`, `samples`, `notes`, `suggestion`
- T-R-044b — R-044 — no sample result and no first failing rule
- T-R-044c — R-044 — a failing verdict exits 0 instead of 1
- T-R-044d — R-044 — no `working` sample with rule `git check-ref-format`
- T-R-044e — R-044 — no `working` sample with rule `git check-ref-format`
- T-R-044f — R-044 — no `working` sample, no `rules unknown` note, exit 0
- T-R-084a — R-084 — preflight prints no `samples` and no `rules unknown` note without gh and glab
