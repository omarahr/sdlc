# Run: faults (M-1)

Test file: e2e/tests/faults.test.mjs on branch sdlc/M-1-e2e-faults. Command: node --test e2e/tests/faults.test.mjs. Result: 9 pass, 5 fail.

Harness note: the tests build their own gh, glab and git shims in a temporary directory placed first on PATH. The shared fake forge cannot print on stderr, stall with a secret or wrap git. The janitor runs with TMPDIR set to an empty sandbox. The harness `sh` helper has a 1 MB output limit, so SC-M-1-064 starts python3 itself with a larger limit.

Test fixes (the test was wrong, not the product):
- SC-M-1-063: the regex `(?<=a)b{` compiles in Python. The test now expects a normal verdict for it (no `cannot evaluate` note, no crash). The other two patterns give `unevaluated`.
- SC-M-1-066 and SC-M-1-070: in `pr` mode, next-action.py calls `gh pr list` by design. The fixtures use `gitMode: direct`, so the "no forge call" check can hold.
- SC-M-1-067: name and parse never read git, so they answer correctly for a corrupt HEAD. Only `list` must give an error or a note there.

## Status pass
SC-M-1-060, 062, 063, 065, 067, 068, 069, 082, 084. Each one met every expected channel.

## SC-M-1-059: fail
Expected: one note `rules unknown on github:` with 403; samples unchecked; the text `ghp_SECRET123` in no note, no stdout, no log.
Observed: exit 0, ok true, one note, samples unchecked, repo state byte-equal. The note holds the shim's whole stderr, so `ghp_SECRET123` is in stdout.
Evidence: note = `rules unknown on github: token ghp_SECRET123\nHTTP 403`. Cause: `_run_forge_cli` returns `proc.stderr.strip()` unfiltered (branches.py).

## SC-M-1-061: fail
Expected: one note starting `rules unknown on gitlab:`, samples unchecked, no secret in the output.
Observed: failing glab variant: note = `rules unknown on gitlab: token ghp_SECRET123\nHTTP 401`. The secret leaks. Absent glab variant: pass (note `rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'`, samples unchecked).

## SC-M-1-064: fail
Expected: each variant finishes; ok true; one bounded note; no secret.
Observed:
- gh sleeps 120 seconds: pass. The module stops it after 60 seconds (FORGE_TIMEOUT). One note of 127 characters. The note names the gh command, not the secret.
- 10 MB body, 50 MB body, invalid JSON with exit 0: pass. One note, `gh printed output that is not JSON`, 59 characters. No secret.
- gh exits 1 and writes 10 MB on stderr: fail. The single note holds the whole stderr. stdout is 10 486 340 bytes long and holds `ghp_SECRET123`.
Evidence: exit 0, ok true, note length about 10.5 million characters.

## SC-M-1-066: fail
Expected: each script prints JSON with no traceback; no file is created; repo state is byte-equal.
Observed: branches.py name, janitor.py and next-action.py pass for all four fixtures. janitor deletes nothing, next-action returns an action, no forge call, remote unchanged. Failures:
- `state-write.py status` ends with a Python traceback and no JSON on stdout for an unreadable config (`PermissionError`), a config that is a directory, and a config symlink loop (`OSError: Too many levels of symbolic links`). The traceback starts in `read_json` (state-write.py line 108, called from main line 750).
- `state-write.py status` creates `.sdlc/STATUS.md` in all four fixtures, also in the three that crash. The scenario says no new file may exist.
- With a bad `branchFormat`, status exits with JSON but still writes `.sdlc/STATUS.md`.

## SC-M-1-070: fail
Expected: next-action prints a JSON action; state-write exits 2 with ok false and a git message; state unchanged.
Observed:
- Locked index: pass. exit 2, `{"ok": false, "error": "git add .sdlc: fatal: Unable to create '.../.git/index.lock': File exists. ..."}`. slices.json and refs unchanged. No home path, no forge call.
- Rebase in progress (`.git/rebase-merge` present): fail. state-write exits 0 with `{"ok": true, "branch": "sdlc/S-001", "commit": "..."}`. It creates a branch and a commit in the middle of a rebase.
- next-action prints a JSON action in both fixtures.

## Notes on passing scenarios
- SC-M-1-069: with check-ref-format failing, preflight exits 2 with an error from validate_format. No pass verdict. No home path.
- SC-M-1-068: with `branch -D` refused for one branch, removedBranches holds only the other branch. The note holds git's reason. With for-each-ref failing, nothing is removed and the note holds the git reason.
- SC-M-1-067: nonexistent path and file path exit 2 with ok false. Spaces and unicode work. Corrupt HEAD gives no traceback.
