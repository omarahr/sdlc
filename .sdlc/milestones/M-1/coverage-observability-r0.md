# Coverage critique for M-1, lens observability, revision 0

The plan has gaps. Many scenarios check only stdout. They do not check that failures stored nothing and that stderr stayed clean.

## Gap 1: failures that do not check for partial state

Scenarios SC-M-1-009, SC-M-1-010, SC-M-1-016, SC-M-1-017, SC-M-1-032, SC-M-1-033, SC-M-1-035, SC-M-1-036, SC-M-1-059 to SC-M-1-065 and SC-M-1-067 fail or degrade with no `db` check. Add to each: `git for-each-ref` and `.sdlc/config.json` are byte-equal before and after. No new file exists in the repo.

## Gap 2: write scenarios do not check the stored rows

SC-M-1-041 checks only branch names. Add a check that `.sdlc/slices.json` holds the new status, and that the `branch` field of each slice equals the branch that git holds. Add a check that no other slice row changed.

## Gap 3: no stderr or traceback check

SC-M-1-007, 013, 014 to 021, 023, 025 to 031, 034, 037, 038, 047 and 058 have no `logs` check. Add: stderr is empty and contains no `Traceback`. Stdout holds exactly one JSON object.

## Gap 4: no check that no forge call happens

SC-M-1-025 (no forge) has no `events` check. Add: the gh and glab shim logs are empty. Also check that `--mode direct` and `--mode mr` without `--branch` make zero gh calls (spec section 3: mr and direct sample no kinds).

## Gap 5: notes can leak secrets

SC-M-1-059 and SC-M-1-061 copy the forge stderr into a note. Add a shim that prints `token ghp_SECRET123` on stderr. Expected: the note holds the forge reason. Report as a defect if the secret text appears in a note or in a log. Spec source: section 3, "rules unknown on github: <stderr>".

## Gap 6: janitor reports and log

SC-M-1-044 to 046 and 068 check removedBranches. Add: `.sdlc/log.jsonl` and `slices.json` are unchanged after the janitor runs. Add: each removed branch is absent from `git for-each-ref`. Each refused branch stays in the notes with the git reason.
