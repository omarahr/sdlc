# Run: names (M-1)

Test file: `e2e/tests/names.test.mjs` on branch `sdlc/M-1-e2e-names`. Channels used: api, logs, events (state-tree and ref checks stand in for db).

## Summary
- Pass: SC-M-1-001 to 006, 008, 010, 011, 013, 071.
- Fail: SC-M-1-007, 009, 012, 076, 077.

## SC-M-1-001..006, 008, 010, 011, 013, 071: pass
Every expected channel matched. Each call printed one JSON object. Stderr held no Traceback. Refs and files were byte-equal before and after where the scenario asks for it. SC-M-1-011: `branches.py` imports only stdlib modules (argparse, datetime, json, os, re, sre_parse, subprocess, sys, urllib).
SC-M-1-002 note: the CLI has no `--ts` flag (exit 2, "unrecognized arguments"). The scenario allows the Python API fallback; `tail('state', ts='20261008101500')` gave `state-20261008101500`.

## SC-M-1-007: fail
Expected: invalid JSON in `.sdlc/config.json` gives `sdlc/S-001` with exit 0.
Observed: exit 2, `{"ok": false, "error": ".../.sdlc/config.json is not valid JSON: JSONDecodeError: Expecting value: line 1 column 1 (char 0)"}`.
The other four variants passed. The code raises `Fail` in `_config_value` on `ValueError`.

## SC-M-1-009: fail
Expected: `name --kind attempt --id S-001 --n -1` exits 2 with ok false.
Observed: exit 0, `{"ok": true, ..., "branch": "sdlc/S-001-attempt--1"}`.
The other six bad calls exited 2 with a JSON error.

## SC-M-1-012: fail
Expected: each call exits 2 with ok false, or prints a branch that `git check-ref-format --branch` accepts.
Observed: four calls exit 0 and print a branch that git refuses (exit 128 from `git check-ref-format`):
- `--id 'S-001; touch /tmp/pwn-<R>'` printed `sdlc/S-001; touch /tmp/pwn-<R>`;
- `--id $'S-001\nS-002'` printed `sdlc/S-001\nS-002`;
- `--id ../../etc/passwd` printed `sdlc/../../etc/passwd`;
- `--kind e2e-area --id M-1 --area 'a b'` printed `sdlc/M-1-e2e-a b` (added variant, because `--kind area` is no kind and exits 2).
The `name` command never calls `ref_format_error` on the branch it builds.
No `pwn-*` file was created. No secret leaked to stdout or stderr. Each output stayed one JSON object. The format with a trailing newline exited 2.

## SC-M-1-076: fail
Expected: a printed branch parses back to the named kind and parts, or the command refuses.
Observed:
- `name --kind slice --id S-001-attempt-2` printed `sdlc/S-001-attempt-2`; `parse` returned kind `attempt`, id `S-001`, n 2.
- `name --kind slice --id S-001-v0-cli-0` printed `sdlc/S-001-v0-cli-0`; `parse` returned kind `verify`.
- `S-001-e2e` as slice id round-trips as slice. The right-to-left override area round-trips as e2e-area.

## SC-M-1-077: fail
Passed parts: the state timestamp equals `date -u` in `Pacific/Kiritimati` and `America/Los_Angeles`; ts `20261231235959` and `20260101000000` are used as given; `20261332250000` is used as given with no traceback.
Expected: ts `2026123123595` (13 digits) exits 2 with ok false.
Observed: `tail('state', ts='2026123123595')` returned `{"ok": true, "tail": "state-2026123123595"}`. The module has no check on ts length. The CLI has no `--ts` flag, so it exits 2 for "unrecognized arguments" on every ts, which does not test the rule.
