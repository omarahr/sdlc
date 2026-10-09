# Tests: S-001

All tests are in `skills/sdlc/test/branches.test.mjs`, except the two git-modes lines.

- T-001 `branches.py imports from its path and exposes the public functions` — R-013 — fails because `skills/sdlc/branches.py` does not exist (FileNotFoundError names branches.py).
- T-002 `branches.py imports only standard library modules` — R-013 — fails because `skills/sdlc/branches.py` does not exist.
- T-003 `every command runs and prints one JSON object` — R-013, R-088 — fails because python3 cannot open `branches.py`, so each command exits 2 with no JSON.
- T-004 `a flag that a command does not name is bad input` — R-088 — fails because `branches.py` does not exist, so stdout holds no JSON error object.
- T-005 `bad input exits 2 with one JSON error object` — R-014 — fails because `branches.py` does not exist, so stdout holds no JSON error object.
- T-006 `load_format returns the config value or the default` — R-016 — fails because `branches.py` and its `load_format` do not exist.
- T-007 `a command without --format uses the config format` — R-016 — fails because `branches.py` does not exist, so `parse` prints no format.
- T-008 `the three scripts import branches from their own directory` — R-098 — fails because the scripts do not import `branches` (AttributeError on `mod.branches`).
- T-009 `the three scripts run with the working directory outside the skill directory` — R-098 — passes now; it pins that `--help` still exits 0 after the import lands.
- T-010 `branch recognition in the three scripts still resolves from a scratch working directory` — R-098 — passes now; it records the pre-import recognition result for `next-action.py`, `state-write.py base-branch` and `janitor.py`.
- git-modes.test.mjs `each python script resolves its modes from the file beside it, not from a literal` — R-098 — the test now copies `branches.py` beside the script copy; it fails until `branches.py` exists (ENOENT names branches.py).
- git-modes.test.mjs `a missing or malformed git-modes.json stops the scripts instead of falling back to a list` — R-098 — the same copy change and the same failure reason; no assertion changed.
