Verdict: HELD

Worktree: $TMPDIR/sdlc-S-001-spec-fidelity-r1 (detached). Commit: 4434d71 (sdlc/S-001). Base: main.

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-013 | "Python 3 standard library only. Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable." | Read branches.py: it imports argparse, json, os, re and sys only. Ran the slice tests. Ran all eight kinds through `name` and all four modes through `preflight` by hand: each exits 0. | skills/sdlc/test/branches.test.mjs:63, :76, :95 | holds |
| R-098 | "Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable." | Read the diff: each script inserts `os.path.dirname(os.path.realpath(__file__))` at sys.path[0] and imports branches. The fix round changed abspath to realpath. This still inserts the script directory, and it also resolves a symlink. Ran the scratch-cwd, symlink and recognition tests (ADR-20261009-024047). | skills/sdlc/test/branches.test.mjs:162, :174, :233, :266; skills/sdlc/test/git-modes.test.mjs:53, :74 | holds |
| R-014 | "Every command prints one JSON object; exit 2 with `{"ok": false, "error": "..."}` on bad input." | Read main and the Fail paths. The fix round catches OSError and RecursionError in load_git_modes and RecursionError in load_format. Probed `preflight --format feature/x`: exit 2 with one JSON error. Probed a deeply nested valid config: exit 0 with the default format. | skills/sdlc/test/branches.test.mjs:114, :121, :189, :217 | holds |
| R-088 | "branches.py name --repo DIR --kind KIND [--id ID] [--n N] [--area A] [--round R] [--profile P] [--part K] [--format F] / parse --repo DIR --branch NAME [--format F] / list --repo DIR --kind KIND [--format F] / preflight --repo DIR --mode MODE [--format F] [--branch CURRENT]" | Compared build_parser with each spec line. Flag names, required flags and optional flags match. The success echo follows ADR-20261009-024229 (flags under `args`). | skills/sdlc/test/branches.test.mjs:95, :114 | holds |
| R-016 | "`load_format(repo)`: `config.branchFormat` when `.sdlc/config.json` has a non-empty one, else `"sdlc/{name}"`." | Read load_format. Probed `list` with a config of `feature/{name}`: format is `feature/{name}`. A missing key gives `sdlc/{name}`. | skills/sdlc/test/branches.test.mjs:139, :149, :217 | holds |

Test run: `node --test skills/sdlc/test/branches.test.mjs skills/sdlc/test/git-modes.test.mjs` gave 17 tests, 17 passed, 0 failed.

Verification plan: `plan-r1.json` did not exist when this check ran. The r0 plan covers every requirement (VS-1 to VS-10). Each scenario carries the cli profile, and the contract and security profiles where they can falsify it. The three round-0 refutations now have promoted tests (tests.md, "Promoted in fix round 1").

## Defects

None.

## Seeds (out of scope, no refutation)

- branches.py builds GIT_MODES_PATH with abspath, not realpath. Run through a symlink, `preflight` reads git-modes.json beside the symlink and exits 2 with "is missing". The three scripts now use realpath. The spec does not require a symlinked run of branches.py.
