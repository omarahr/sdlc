# Verification plan r0: S-fix-M-1-1b

Risk: medium. One pure function and its CLI cross one boundary, and the change decides which branch names the loop trusts.

Slice is code complete on sdlc/S-fix-M-1-1b. Profiles are ordered by scenario count: contract, cli, security, i18n. Medium risk caps the run at 4 profiles. No limits profile: the spec states no number.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | name refuses ids that parse as another kind | R-019 | contract, cli, security |
| VS-2 | valid parts of every kind keep their names and parse back | R-019 | contract, cli |
| VS-3 | non-ASCII ids and parts are refused where parse refuses them | R-019 | contract, i18n, security |
| VS-4 | integer parts compare by value | R-019 | contract, cli |
| VS-5 | lowering touches only the tail and follows one ASCII rule | R-019 | i18n, contract |
| VS-6 | formats whose prefix or suffix joins the tail into another kind | R-019 | contract, cli |
| VS-7 | state names keep the given ts and build one when absent | R-019 | contract |
| VS-8 | active_branch matches slice ids by ASCII lowering | R-053 | cli, security, i18n |
| VS-9 | the name command reports refusal without side effects | R-019 | cli |

## Scenario notes

- VS-1: Ids S-001-attempt-2, S-001-v0-cli-0, S-001-attempt-0, S-001-v10-a-b-3 under slice and milestone kinds. Each must raise Fail (exit 2, ok false), never print a name. parse must still read the same strings as attempt or verify.
- VS-2: run, slice, milestone, e2e, e2e-area, state, verify, attempt with valid parts, incl. S-fix-M-1-2 and S-001-e2e. Each name parses back to the same kind and parts under several formats.
- VS-3: U+212A (Kelvin), U+017F (long s), accented letters, fullwidth digits in id, under {name} and {name:lower}. Slice id must raise Fail. Fullwidth digits in integer parts must not pass as ints.
- VS-4: n='02', 2, '2', ' 2', '+2', '-1', '0x2', huge digit strings, True, 2.0. Valid ones succeed and parse back by value. Invalid ones raise Fail, not an exception trace.
- VS-5: Format Feat/PROJ-{name:lower}-X with uppercase prefix kept. e2e-area with area 'É', 'İ', 'ß'. Output must lower ASCII only and parse back. name and parse must agree.
- VS-6: Formats with suffix '-e2e', '-attempt-1', '-v1-a-1', numeric suffix, and prefix 'run-'. Slice id may then parse as another kind. Expect Fail, or a faithful round trip. Never a silent mismatch.
- VS-7: state with no ts builds a UTC stamp and still succeeds. Explicit 14-digit ts is used as given. A bad ts (short, letters) must raise Fail. The check must skip ts only when none was given.
- VS-8: Scratch repo, format feature/p-1-{name:lower}, S-001 in progress. Branch feature/p-1-s-001 is active. Look-alike feature/p-1-s-00K (U+212A) is not. A U+212A id in slices.json does not match the ASCII branch. Foreign branches never read as active.
- VS-9: Exit 2, JSON ok false, an error message that names kind and branch, empty stdout name, no change to the repo tree. Check missing --id, empty id, unknown kind, bad format.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py name and parse, and next-action.py, in scratch repos | True |
| property | contract | Generate ids, parts and formats; check the round-trip property of name | True |
| attack-corpus | security | Look-alike Unicode and kind-confusing ids | True |
| i18n-kit | i18n | Unicode case-folding samples (Kelvin, long s, dotted I, sharp s) | False |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-019 | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-7, VS-9 |
| R-053 | VS-8 |
