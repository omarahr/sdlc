# Verification plan, round 1 (after review fix)

The review fix made `_forge_failure` read ASCII digits only. This plan copies plan-r0 and adds one scenario.

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A failing gh rules read gives one bounded note without the token | R-029, R-084 | cli, security |
| VS-2 | A failing glab rules read gives one bounded note without the token | R-031, R-084 | cli, security |
| VS-3 | A gh failure with 10 MB of stderr finishes with a short note | R-029 | cli, security, limits |
| VS-4 | A missing tool or a timeout gives a one-line note of at most 200 characters | R-084, R-029, R-031 | cli, security, contract |
| VS-5 | The failure text reads the exit status and the HTTP code only | R-029, R-031 | contract, security |
| VS-6 | Non-ASCII digits in gh stderr never reach the note | R-029, R-031, R-084 | contract, security |

Added: VS-6. It would have caught the defect where non-ASCII digits entered the note.

Tools: unchanged from plan-r0. Risk: medium.

Coverage: R-029 and R-031 are covered by VS-1 to VS-6. R-084 is covered by VS-1, VS-2, VS-4 and VS-6.
