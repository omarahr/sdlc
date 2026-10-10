# Coverage critique for M-1, lens observability, revision 2

Revision 2 closes gaps A to H. A few failure scenarios still check only stdout. Each scenario below needs the added checks.

## Gap 1: failures with no partial-state check

Standard `db` check: `git for-each-ref` output, `.sdlc/config.json`, `.sdlc/slices.json` and `.sdlc/log.jsonl` are byte-equal before and after the run. No new file exists in the repo.

- SC-M-1-006 (invalid-ref literals), SC-M-1-022 (non-git and unborn repos), SC-M-1-027 (unknown mode), SC-M-1-069 (`git check-ref-format` unavailable): add the standard `db` check.
- SC-M-1-070 (locked or mid-rebase repo): `db` covers only `slices.json`. Add the refs and the other state files. Add that a failed `state-write` leaves no branch half-created.
- SC-M-1-066 (bad config files): `db` covers only branches. Add that the bad config files are byte-equal after the run.
- SC-M-1-077 (clock edges), SC-M-1-075 and SC-M-1-071: add that no ref and no file is written. Spec source: section 2, "name, parse and list only print".

## Gap 2: missing stderr and traceback check

Standard `logs` check: stderr has no `Traceback`. Stdout holds exactly one JSON object.

- Add it to SC-M-1-002 to SC-M-1-006, SC-M-1-008, SC-M-1-022, SC-M-1-024, SC-M-1-027 (its check exists; add the secret scan), SC-M-1-040, SC-M-1-041, SC-M-1-066, SC-M-1-067, SC-M-1-069, SC-M-1-070.
- SC-M-1-041 writes branches and rows. It needs the standard `logs` check.
- SC-M-1-069 and SC-M-1-070 name an error path. Add that the `error` text holds no absolute home path and no token.

## Gap 3: no check for secrets in the hostile-input outputs

- SC-M-1-012 and SC-M-1-078 feed hostile text. Add: the error text echoes the hostile input at most once. Add: no `ghp_SECRET123` and no environment value appears in stdout or stderr. Plant `ghp_SECRET123` in the environment of the run.

## Gap 4: no event check for failure paths of janitor and state-write

- SC-M-1-046, SC-M-1-066 and SC-M-1-070 run with no `git push`, no `gh` and no `glab` call. Add an `events` check: the gh and glab shim logs are empty. A local failure makes no forge call.
- SC-M-1-044 and SC-M-1-045: add the same `events` check. The janitor deletes local branches only. The remote refs (`git ls-remote`) stay equal before and after.

## Gap 5: no check of the JSON error contract on state-write

- SC-M-1-074 and SC-M-1-041: for each `ok: false` result, check that stdout holds one JSON object with a non-empty `error`. Check that the exit code is 2.
