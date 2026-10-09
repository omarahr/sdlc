# S-005b verification plan, round 1 (ladder step 3)

Slice: verify branches stay local: the push guard. Requirement: R-119.
Risk: medium. A push form that the guard misses lets a verify branch reach the remote. Two rounds found such forms. The slice adds only a test scanner and no product behavior.

## What changed since the previous plan
- Fix round 1 (e71f8c8) changed the scanner in three places:
  - It binds import aliases in one pass over the whole module. A name bound to two targets gives a `dynamic` entry.
  - It makes every `-c` before the git verb opaque.
  - It records each option after the verb of a wrapper call in `wrapperVerbs`.
- The plan keeps VS-1 to VS-12 and their ids.
- VS-13 tests the new option pin. Spec-fidelity r1 D-1 refuted it: an option with no constant prefix is not recorded.
- VS-14 tests the `-c` rule and every other git option before the verb that can run a command.
- VS-15 tests the new alias pass (r0 TC-cli-17).
- VS-16 tests submodule attribute chains such as `os.path.os.system` (r1 TC-cli-22 and TC-cli-27).
- VS-17 runs each guard-miss mutant from every round against a bare remote.
- A new tool, `module-loader`, loads a mutated module and calls one function.

## Rules
- Apply the scope and the refutation rule of ADR-20261009-062930-decision-judge-S-005-388e.
- Apply the graphql ban of ADR-20261009-063408-decision-judge-S-005-368d.
- Seeds S1 to S5 are never refutations. Record each seed in the report.
- When you add a call inside a wrapper body, check `wrapperBodies` first. A change is a guard hit, not a miss.
- Keep the evidence. Do not delete earlier verification files.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A push or forge write added inside a pinned wrapper body fails the guard | R-119 | security, cli, contract |
| VS-2 | A changed wrapper definition (signature, default, decorator, duplicate, nested or method) fails the guard | R-119 | security, cli, contract |
| VS-3 | A comment or a blank line in a wrapper body keeps every pin | R-119 | contract, cli |
| VS-4 | Outside a wrapper body, a non-constant program, verb, option or api path is opaque | R-119 | security, cli |
| VS-5 | A new git push of a branch outside the wrapper bodies fails the guard, in every covered spelling | R-119 | security, cli |
| VS-6 | A pull-request creation or other forge write fails the guard | R-119 | security, cli |
| VS-7 | A process or network call reached by an alias, a value, an attribute chain, an import or dynamic code fails the guard | R-119 | security, cli |
| VS-8 | The loop script gains no process or network access | R-119 | security, cli |
| VS-9 | The loop hands its verify branch builder only to the profile agent and the collector | R-119 | cli |
| VS-10 | A new script type, a symlink or a non-UTF-8 source in the scanned tree fails the guard | R-119 | cli, security |
| VS-11 | A spec-required forge read changes only a pin and hits no ban | R-119 | cli, security |
| VS-12 | A verify branch stays local when the push-capable scripts run against a real remote | R-119 | cli |
| VS-13 | A new option after a known wrapper verb, in any spelling, breaks a pin or is opaque | R-119 | cli, security, contract |
| VS-14 | A git option before the verb that can run a command or change the target is opaque | R-119 | cli, security |
| VS-15 | An import alias bound anywhere in a module resolves to the watched module | R-119 | cli, security, contract |
| VS-16 | A process call reached through a submodule attribute chain breaks a pin | R-119 | cli, security |
| VS-17 | Each guard-miss mutant from every round pushes a verify branch only when the guard flags it | R-119 | cli |

The notes for each scenario are in `plan-r1.json`.

## Key notes for the new scenarios
- VS-13: try `f"{''}--upload-pack=..."`, `"--upload-pack=...".strip()`, `str("--upload-pack=...")`, a variable option, a starred list after the verb, and `--receive-pack` and `--exec`. Run m1 and m3 of r1 D-1 against a bare remote.
- VS-14: try `-ccore.fsmonitor=...`, `--config-env`, `--exec-path`, `--git-dir`, `--work-tree` and abbreviated long options. Try each at a wrapper call, at a list-literal direct site and at a `shell=True` site.
- VS-15: try an alias bound after use, in a function, in a `try` or `if` block, in a class body, and one name bound to two targets. The class attribute form `_K.sp.run` is seed S3.
- VS-16: try `os.path.os`, `posixpath.os`, `shutil.os`, `pathlib.os`, `subprocess.os` and the same chains through an alias. The scope names this class, so a miss that runs a process refutes R-119.
- VS-17: re-prove r0 D-1, TC-cli-17, TC-cli-18, r1 D-1 m1 and m3, and TC-cli-27 against a bare remote.

## Coverage
| Requirement | Scenarios |
|---|---|
| R-119 | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-7, VS-8, VS-9, VS-10, VS-11, VS-12, VS-13, VS-14, VS-15, VS-16, VS-17 |

## Defects found so far and the scenario that re-proves each
| Defect | Round | Scenario |
|---|---|---|
| spec-fidelity D-1: a constant `-c core.fsmonitor` value pushes through `git` | r0 | VS-14, VS-17 |
| cli TC-cli-17: an import alias bound after its use | r0 | VS-15, VS-17 |
| cli TC-cli-18: `-c` forms in wrappers and a direct site | r0 | VS-14, VS-17 |
| spec-fidelity D-1: an option after the verb with no constant prefix | r1 | VS-13, VS-17 |
| cli TC-cli-22 and TC-cli-27: `os.path.os.system` and `_p.os.system` | r1 | VS-16, VS-17 |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run `push_guard.py` and the skill scripts in a scratch cwd. Build mutated copies and scratch repos with a bare remote. | yes |
| attack-corpus | security | Supply confusable, whitespace, control-character and injection spellings. | yes |
| property | contract | Call `body_text` and the scanner functions in batch. | yes |
| module-loader | cli | Load a mutated skill module by path and call one function. Return the exit code, output and bare remote refs. | no |

## Notes
- The spec states no number, so `limits` is not tagged.
- In rounds 0 to 2 a safety classifier stopped the security sessions. `cli` is on every scenario, so `cli` covers each one if `security` is blocked again.
