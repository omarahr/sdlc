# Coverage report: spec-coverage, revision 2

The plan has five gaps. Each one comes from an ADR or a spec row that no scenario exercises.

## Gap 1: SC-M-1-036 contradicts ADR-20261009-194834-decision-judge-S-012-f284

- Requirement: R-036, R-040, R-043.
- Source: ADR f284: "A forge rule label wins over git check-ref-format". The ref-format rule is reported only when no forge rule failed.
- Problem: step 3 of SC-M-1-036 runs `preflight --mode mr --branch bad..name` with glab regex `^feat/.+`. The name fails the regex too. The scenario expects rule `git check-ref-format`. The ADR requires the regex label (`push rule`).
- Fix: keep step 3 with a glab shim that has no rule (or a regex the name satisfies, for example `.*`). Expect rule `git check-ref-format`. Add step 5 with regex `^feat/.+` and `--branch bad..name`. Expect rule `push rule`.

## Gap 2: no scenario for a bad ref name when the forge is unknown

- Requirement: R-044, R-084.
- Source: ADR-20261009-215738-decision-judge-S-015-33cd and ADR-20261010-000100-planner-S-015-r1f0: an invalid ref name fails when the forge rules are unknown. The ref check is local.
- Steps: use a gh shim that exits 1. Run `preflight --mode mr --branch bad..name`. Then run `preflight --mode mr --branch feat/ok`.
- Expect: the first call gives exit 1, `ok` false, a `working` sample with result `fail` and rule `git check-ref-format`. The second call gives exit 0 and the working sample `unchecked`. Both calls give the note `rules unknown on github:`.
- db: refs and `.sdlc/config.json` stay byte-equal.

## Gap 3: no scenario for a working-only failure with a derivable rule

- Requirement: R-042, R-043, R-087.
- Source: ADR-20261009-223042-decision-judge-S-016-d001: a working-only failure in `mr` mode does not derive a format.
- Steps: use a glab shim or gh shim with one `starts_with feature/` rule and no format given. Run `preflight --mode mr --branch main`.
- Expect: exit 1, `ok` false, `derived` false, `format` `sdlc/{name}`, and the working sample failed. The suggestion names the rename. No `branchFormat` is written to config.

## Gap 4: no scenario for a rule of unknown kind

- Requirement: R-035, R-036.
- Source: ADR-20261009-191759-decision-judge-S-011-6e23: `evaluate` returns None for an unknown kind. The sample is `unevaluated` with the note `cannot evaluate <label>: unknown kind <kind>`. It never blocks.
- Steps: use a gh shim that returns a `branch_name_pattern` rule with operator `equals`. Run `preflight --mode pr`.
- Expect: exit 0, `ok` true, every sample `unevaluated`, one note that starts with `cannot evaluate` and names `equals`. No Traceback. Refs and config stay byte-equal.

## Gap 5: no scenario for lowercase resolution of milestone ids

- Requirement: R-024, R-070.
- Source: ADR-20261009-170812-decision-judge-S-007-35cd: under `lower`, `parse` resolves every id kind through `ids`, milestones included.
- Steps: under `feature/p-1-{name:lower}`, call `parse(fmt, "feature/p-1-m-1", ids=["M-1"])`, then `parse(fmt, "feature/p-1-m-1-e2e", ids=["M-1"])`, then `parse(fmt, "feature/p-1-m-2", ids=["M-1"])`.
- Expect: the first two give `id` `M-1` and `known` true. The third gives `known` false. Kinds without an id part give `known` null.

## Covered

- Every requirement in `requirements.json` appears in a scenario.
- The `source` quotes of the other scenarios support their `expect`.
