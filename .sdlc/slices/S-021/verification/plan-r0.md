# Verification plan S-021 round 0

Risk: medium. next-action drives every slice decision from branch state; a wrong parse resumes the wrong slice.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The active slice branch is found by parsing local branches under a custom format | R-053 | cli, security |
| VS-2 | State and e2e pull request heads are recognized, and e2e-area heads are ignored | R-054 | cli, security |
| VS-3 | A lowercased slice head resolves to the ledger id | R-054 | cli, contract |
| VS-4 | The stack milestone hold keeps milestone heads and skips e2e and foreign heads | R-054 | cli |
| VS-5 | A missing or empty branchFormat falls back to sdlc/{name} | R-055, R-077 | cli, contract |
| VS-6 | All five recognitions hold in one fixture and the foreign head is ignored | R-076 | cli, security |
| VS-7 | The default format keeps the existing behavior | R-077 | cli |

## Notes per scenario
- VS-1: Format feature/PROJ-1-{name}. Branch feature/PROJ-1-S-1 with an in-progress slice gives checkout of that branch. Foreign branches feature/PROJ-1-sdlc-foo, sdlc/S-1 and feature/PROJ-1-S-002 without a matching slice never read as active. Try branch names with unicode, flag-like and long values from the attack corpus. A checked-out branch wins over other branches.
- VS-2: Pull request list from a prs file. A ready state head feature/PROJ-1-state-20261010000000 gives a merge command. A ready e2e head gives a merge command in pr mode only. An e2e-area head and a foreign head give no command. A state head without an eight-digit timestamp still counts through the prefix fallback.
- VS-3: Format feature/PROJ-1-{name:lower}. Head feature/proj-1-s-1 marks S-1 awaiting-merge. A ready head gives retryMerge. A merged head gives retryMerge with the pr recorded. Check ids that differ only in case, and unknown ids that must stay ignored.
- VS-4: Stack mode. Head feature/PROJ-1-M-2 gives wait with the milestone id and url. Head feature/PROJ-1-M-2-e2e gives no hold. A foreign head gives no hold. In pr mode the milestone head gives no hold.
- VS-5: Config with the key absent, an empty string, and null. Branch sdlc/S-1, sdlc/state-<stamp>, sdlc/M-1-e2e and sdlc/M-1 are recognized as before. A non-string or invalid format must fail clearly, not crash with a trace.
- VS-6: One repo with the custom format: active branch, slice PR head, state PR, e2e PR and stack milestone hold together. The foreign head feature/PROJ-1-sdlc-foo must change no decision. Check the decision output is identical with and without the foreign head.
- VS-7: Run the existing next-action tests and npm test with no branchFormat. Compare the decision on a default-format fixture against main for the same inputs.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run next-action.py from a scratch repo with controlled env and tree diff | True |
| stub-server | security | Stub gh so no network call is made while the decision runs | True |
| attack-corpus | security | Hostile branch and head names (unicode, flag-like, traversal, oversized) | True |
| property | contract | Call parse-based helpers in batch with generated branch names | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-053 | VS-1 |
| R-054 | VS-2, VS-3, VS-4 |
| R-055 | VS-5 |
| R-076 | VS-6 |
| R-077 | VS-5, VS-7 |

Only the cli, security and contract profiles apply. The slice has no HTTP, UI, data or async boundary. Limits concern: active_branch now lists every local branch, so a repo with many branches costs more git calls. No number in the spec, so no limits tag.
