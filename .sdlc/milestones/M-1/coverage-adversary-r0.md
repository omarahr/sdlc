# Coverage critique for M-1, lens adversary, revision 0

The plan covers hostile ids, gh faults, config faults and parallel reads. Seven gaps remain.

## Missing scenarios

1. **Suffix and contains formats round-trip** (R-019, R-042, section 2 `parse`).
   - Steps: for the formats `sdlc/{name}-dev`, `sdlc/team-a/{name}` and `{name}`-style suffix `sdlc/{name}-attempt-1`, run `name` then `parse` for all eight kinds. Then run `parse --branch sdlc/S-001` under `sdlc/{name}-dev`. Then run `parse --branch a-a` under `a-{name}-a`, where prefix and suffix overlap.
   - Expect: each name parses back to the same kind and parts. A branch that lacks the suffix gives `null`. The overlap branch gives `null` with no traceback.
2. **Name and parse invariant for colliding ids** (R-019, R-022).
   - Steps: `name --kind slice --id S-001-attempt-2`, `--id S-001-v0-cli-0`, `--id S-001-e2e`, and `--kind area --id M-1 --area $'‮api'`.
   - Expect: each call exits 2 with `ok: false`, or its printed branch parses back to the kind and parts that were named. A name that parses to another kind fails the scenario.
3. **State timestamp clock edges** (R-008, section 1: UTC).
   - Steps: run `TZ=Pacific/Kiritimati name --kind state` and `TZ=America/Los_Angeles name --kind state`. Run `--ts 20261231235959`, `--ts 20260101000000`, `--ts 2026123123595` and `--ts 20261332250000`.
   - Expect: generated digits equal `date -u` within 5 seconds in both zones. A 14-digit explicit ts is used as given. A 13-digit ts exits 2 with `ok: false`.
4. **Hostile `--branch` in mr mode** (R-037, R-040, R-043).
   - Steps: `preflight --mode mr --branch` with `-x`, `--help`, `''`, `a b`, `@`, `$'a\nb'`, a 300-character name, and `$'feat/‮evil'` against a glab shim with regex `^feat/.+`.
   - Expect: one JSON object per call and no traceback. A `working` sample is `fail` with rule `git check-ref-format` for each invalid name. The output holds no `git` usage text.
5. **Derivation from a hostile rule pattern** (section 4, R-042, `validate_format`).
   - Steps: a gh shim returns `starts_with` with pattern `feat {x}/`, then `contains` with pattern `a..b`, then `ends_with` with pattern `.lock`. Run `preflight --mode pr` without `--format`.
   - Expect: no derivation survives `validate_format`. `ok` is false, `derived` is false, and the failing sample names the rule. No `branchFormat` is written.
6. **Look-alike unicode under a lowercase format** (section 2 table row 8: `[A-Za-z0-9-]`).
   - Steps: under `feature/p-1-{name:lower}`, run `parse` for `feature/p-1-ſ-001` (long s) and `feature/p-1-K-001` (Kelvin sign). Run `janitor.py` and `next-action.py` with a branch of each name.
   - Expect: both parse to `null`. Janitor deletes neither. next-action ignores both.
7. **Regex literal safety in rule patterns** (R-033, R-034).
   - Steps: `evaluate` with `starts_with`, `ends_with` and `contains` and patterns `a.b`, `a+`, `(x`, `[`, `\`. Test against `axb`, `a+`, `(x`, `[`, `\`.
   - Expect: operators match as literal text. `axb` does not match `a.b`. No call raises.

## Verdict

`refuted: true`. Add scenarios 1 to 7.
