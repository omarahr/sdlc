Verdict: HELD

Worktree: $TMPDIR/sdlc-S-001-spec-fidelity-r0 (detached). Commit: de3dd5c97ca464b799088720ff2d09e4fa7f0fca (sdlc/S-001).

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-013 | "Python 3 standard library only. Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable." | Read branches.py. It imports argparse, json, os, re and sys only. Ran the slice tests. Ran each command by hand. | skills/sdlc/test/branches.test.mjs:63, :76, :95 | holds |
| R-098 | "Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable." | Read the diff of the three scripts: each inserts its own directory at sys.path[0] and imports branches. Ran T-008, T-009 and T-010 from a scratch cwd (ADR-20261009-024047). | skills/sdlc/test/branches.test.mjs:162, :174, :207; skills/sdlc/test/git-modes.test.mjs:53, :74 | holds |
| R-014 | "Every command prints one JSON object; exit 2 with `{"ok": false, "error": "..."}` on bad input." | Ran 25 bad-input probes: format shapes, non-UTF-8 config, config as a directory, missing repo, bad kind, bad mode, non-integer flags, extra positionals. Each gave one JSON error object and exit 2. No traceback reached stderr. | skills/sdlc/test/branches.test.mjs:114, :121 | holds |
| R-088 | "branches.py name --repo DIR --kind KIND [--id ID] [--n N] [--area A] [--round R] [--profile P] [--part K] [--format F] / parse --repo DIR --branch NAME [--format F] / list --repo DIR --kind KIND [--format F] / preflight --repo DIR --mode MODE [--format F] [--branch CURRENT]" | Compared build_parser with each spec line: flag names, required and optional flags match. T-003 runs every command with every flag. | skills/sdlc/test/branches.test.mjs:95, :114 | holds |
| R-016 | "`load_format(repo)`: `config.branchFormat` when `.sdlc/config.json` has a non-empty one, else `"sdlc/{name}"`." | Read load_format. Probed a missing key, an empty value, a non-string value, a list config and a missing file: each gives sdlc/{name}. A non-empty value is returned as given. | skills/sdlc/test/branches.test.mjs:139, :149 | holds |

Verification plan r0: every requirement has at least one scenario (VS-1 to VS-10). Each scenario carries the cli profile, and the contract and security profiles where they can falsify it. No gap.

## Defects

None.

## Seeds (out of scope, no refutation)

- argparse allow_abbrev is on: `parse --rep DIR` is accepted as `--repo`. The spec names no prefix forms.
- `int()` accepts unicode digits: `--n '١'` gives n = 1.
- A repeated flag takes the last value: `--branch x --branch y` gives y.
- `--help` prints argparse usage text, not JSON, and exits 0.
- A non-UTF-8 `--branch` value passes through as a surrogate escape (`x\udcff`).
