# Verification plan, round 1 (after review fix)

This plan copies plan-r0. The review fix removed comments and promoted non-string runBranch cases into the committed test. VS-2 already covers them. No scenario is added.


Risk: high. Janitor deletes branches, so a wrong classification removes real work.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | Prune under a custom format removes only branches that parse to milestone | R-138 | cli, security |
| VS-2 | branch_run returns a stored name only when it parses to kind run | R-138 | contract, cli |
| VS-3 | A foreign branch is not taken as the run branch | R-138 | cli, security |
| VS-4 | A branch that names another real run branch still refuses | R-138 | cli, security |
| VS-5 | A repo whose config holds feature/PROJ-1-{name} makes the janitor sweep under that format | R-139 | cli, security |
| VS-6 | A repo with no branchFormat or an empty one makes the janitor sweep under sdlc/{name} | R-139 | cli, security |
| VS-7 | janitor.py takes its format from load_format and refuses a malformed format | R-139 | contract, cli, security |

## Notes

- VS-1: Format feature/PROJ-1-{name}. Shipped branches: feature/PROJ-1-M-1 (goes), sdlc/M-2, feature/PROJ-1-M-3-e2e, feature/PROJ-1-S-001, feature/PROJ-1-run-1, main (stay). Also try names with a trailing slash, a prefix clash such as feature/PROJ-1-M-10, and a unicode lookalike. A wrong match deletes real work.
- VS-2: Call branch_run(repo, branch, fmt) with runBranch feature/PROJ-1-run-1, sdlc/run-1, main, release/x, empty, a non-string and a missing key. Run under the custom and the default format. A stored name that is foreign gives the empty string. A malformed config or format gives Fail or the empty string, never a traceback.
- VS-3: A leftover milestone branch with unshipped work whose committed config names main or sdlc/run-1 under the custom format. ensure_milestone_branch must not fail with 'belongs to run' and the prune must not delete it. Check the branch and its commits still exist after the call.
- VS-4: Control case for VS-3. The committed config names feature/PROJ-1-run-2 while the current run is run-1. ensure_milestone_branch fails with 'belongs to run'. The default format behaves the same with sdlc/run-2. The change must not weaken this refusal.
- VS-5: Ledger marks S-001 done. feature/PROJ-1-S-001-v0-http-api-0 goes. sdlc/S-001-v0-http-api-0 and main stay. Try a branch of an unfinished slice and a branch that is not in the ledger: both stay.
- VS-6: Same ledger as VS-5. sdlc/S-001-v0-http-api-0 goes. feature/PROJ-1-S-001-v0-http-api-0 stays. Repeat with branchFormat set to the empty string, with the key absent and with no config file.
- VS-7: Read janitor.py: it calls branches.load_format(repo) and holds no sdlc/ literal outside prose. Run the janitor with a malformed branchFormat (no {name}, unbalanced braces, git-unsafe characters, a non-string). It must delete no branch and must report the problem.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run state-write.py and janitor.py in scratch git repos and diff the refs. | yes |
| attack-corpus | security | Supply hostile branch names, formats and config values. | yes |
| property | contract | Call branch_run and load_format with generated inputs. | yes |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-138 | VS-1, VS-2, VS-3, VS-4 |
| R-139 | VS-5, VS-6, VS-7 |

Profiles are tagged in order of value: cli, security, contract. The slice has no stated number, so limits is not tagged. No http-api, async, concurrency, data, ui or i18n boundary exists.
