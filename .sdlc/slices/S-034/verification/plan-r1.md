# Verification plan S-034, round 1

Risk: low. The change is prose in one SKILL.md bullet, with no I/O boundary and no script change.

Prose-only slice. Only the contract profile applies: the observable output is the text of SKILL.md and the tests that pin it. No ui, http-api or limits profile applies.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The driver orders the format sources: flag, then config.json, else none | R-128 | contract |
| VS-2 | The preflight command passes --format only with a known format | R-129 | contract |
| VS-3 | Only mr mode passes --branch "$BASE_BRANCH" to preflight | R-129 | contract |
| VS-4 | A first run asks for a rename of a failed working sample | R-130 | contract |
| VS-5 | A resume runs no parse check and asks for no rename | R-130 | contract |
| VS-6 | The default format sdlc/{name} still closes for a run without branchFormat | R-002 | contract |

## Notes
- VS-1: Risk: the order text drifts or a source is missing. Check the Branch format bullet in SKILL.md. The flag clause comes before the config.json clause, which comes before 'else none'. The config clause says 'when that file exists'. With none, the bullet says to give preflight no --format argument.
- VS-2: Risk: the bullet makes --format unconditional. Check that --format "<format>" is tied to 'when you have one'. Check that it matches the none case in VS-1.
- VS-3: Risk: another mode receives --branch. Check 'in `mr` mode only' and 'No other mode gets `--branch`'. Check the bullet names no second mode that passes --branch.
- VS-4: Risk: the rename ask applies on every run. Check 'On a first run, a `working` sample that failed' and the parse check text. The existing pins for the ok-false sentence and the parse check must still hold.
- VS-5: Risk: the resume sentence conflicts with the 'first run only' sentence or with the line-68 pin in prompts.test.mjs. Check 'On a resume, run no `parse` check and ask for no rename'. Check that the bullet ends as the pinned last sentence requires. Check that the sentence is under 20 words.
- VS-6: Risk: the SKILL.md edit breaks the default. Check that env-detector.md names branchFormat input, else existing value, else sdlc/{name}. Check that load_format on a config without branchFormat returns sdlc/{name}. Check that the bullet still says 'default `sdlc/{name}`'.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Call load_format on config shapes without branchFormat for VS-6. | True |
| cli-runner | contract | Run branches.py preflight and parse in a scratch repo to check the documented command lines. | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-128 | VS-1 |
| R-129 | VS-2, VS-3 |
| R-130 | VS-4, VS-5 |
| R-002 | VS-6 |

## Changes since round 0
- None. Round 0 passed the contract profile. The gate fix round changed no code. Keep every scenario id.
