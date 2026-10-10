# Verification: S-027b, profile cli, round 0

Commit: f346b0b. Verdict: pass (9 of 9 cases).

Environment: Node test runner, python3 branches.py, git with scratch repos and a bare origin under a temp dir; executor runs the prompt's command text with argv, no shell

## TC-cli-1 (VS-1): Default format: list returns two attempt branches and delete removes only them

- Given: Repo with sdlc/S-001-attempt-1, -attempt-2, sdlc/S-001, sdlc/S-001-v0
- When: Run the list command from integrator.md step 2, filter id S-001, run git branch -D per entry
- Then: Only the two attempt branches go; sdlc/S-001 and sdlc/S-001-v0 stay
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-1`

## TC-cli-2 (VS-2): Lowercase format: id s-001 matches S-001 case-blind; S-0010 and S-001a stay

- Given: branchFormat feature/PROJ-1-{name:lower}
- When: List, filter ignoring case, delete
- Then: List prints id s-001; an exact-case filter finds 0; the case-blind filter finds 2; other ids stay
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-2`

## TC-cli-3 (VS-2): Mixed-case format and letter-suffix id S-027b

- Given: branchFormat work/{name}, branches for S-027, S-027b, S-027bc
- When: Filter with id s-027B
- Then: Only work/S-027b-attempt-1 is deleted
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-2b`

## TC-cli-4 (VS-3): Other slices and non-attempt branches survive

- Given: Branches of S-002, S-0010, S-001a, run-3, verify, user and bare names
- When: List, filter S-001, delete
- Then: Only attempt-1 and attempt-12 of S-001 go
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-3`

## TC-cli-5 (VS-3): Hostile format prefixes do not break the delete commands

- Given: Formats with unicode, leading dash, whitespace, shell characters; flag-like corpus branch names
- When: Run name, list and delete
- Then: Unicode name deletes cleanly; dash-leading and whitespace formats are refused by branches.py; no injected file appears
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-3b`

## TC-cli-6 (VS-4): pr/mr/stack: remote attempt ref vanishes, missing remote ref is tolerated

- Given: Bare origin holds attempt-1 only; attempt-2 is local
- When: Run local delete and git push origin --delete for each
- Then: attempt-1 vanishes on origin; push for attempt-2 exits 1 with 'remote ref does not exist' and the run continues; S-002 ref stays
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-4`

## TC-cli-7 (VS-4): Direct mode text names no push and no push happens

- Given: Prompt step 2 text; origin holds attempt-1
- When: Run local-only cleanup
- Then: Text lists only pr, mr and stack; origin keeps its ref
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-4b`

## TC-cli-8 (VS-4): No origin remote: failed push does not stop the other deletions

- Given: Repo without origin
- When: Run delete and push for two attempt branches
- Then: Both local branches go; push exits non-zero
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-4c`

## TC-cli-9 (VS-5): Parent walk: step 3 text and per-parent list under a custom format

- Given: S-013 and its children S-013a, S-013b under feature/{name:lower}
- When: Run step 2 for the parent id, then for S-013a
- Then: Parent attempts go, child attempts stay until their own id runs; text keeps splitInto and never-delete-unfinished
- Result: pass
- Spec source: R-093 acceptance
- Test: `.sdlc/slices/S-027b/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:VS-5`

## Transcripts (excerpts)

### VS-1
```json
{
 "before": [
  "main",
  "sdlc/S-001",
  "sdlc/S-001-attempt-1",
  "sdlc/S-001-attempt-2",
  "sdlc/S-001-v0"
 ],
 "list": "{\"ok\": true, \"command\": \"list\", \"format\": \"sdlc/{name}\", \"kind\": \"attempt\", \"branches\": [{\"branch\": \"sdlc/S-001-attempt-1\", \"kind\": \"attempt\", \"tail\": \"S-001-attempt-1\", \"id\": \"S-001\", \"n\": 1, \"known\": null}, {\"branch\": \"sdlc/S-001-attempt-2\", \"kind\": \"attempt\", \"tail\": \"S-001-attempt-2\", \"id\": \"S-001\", \"n\": 2, \"known\": null}]}\n",
 "out": [
  {
   "cmd": "git branch -D sdlc/S-001-attempt-1",
   "status": 0,
   "stderr": ""
  },
  {
   "cmd": "git branch -D sdlc/S-001-attempt-2",
   "status": 0,
   "stderr": ""
  }
 ],
 "after": [
  "main",
  "sdlc/S-001",
  "sdlc/S-001-v0"
 ]
}
```

### VS-4
```json
{
 "before": [
  "main",
  "sdlc/S-001",
  "sdlc/S-001-attempt-1",
  "sdlc/S-002-attempt-1"
 ],
 "out": [
  {
   "cmd": "git branch -D sdlc/S-001-attempt-1",
   "status": 0,
   "stderr": ""
  },
  {
   "cmd": "git push origin --delete sdlc/S-001-attempt-1",
   "status": 0,
   "stderr": "To /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-FgAeMF/testkit-cli-lT5sof/origin.git-33\n - [deleted]         sdlc/S-001-attempt-1"
  },
  {
   "cmd": "git branch -D sdlc/S-001-attempt-2",
   "status": 0,
   "stderr": ""
  },
  {
   "cmd": "git push origin --delete sdlc/S-001-attempt-2",
   "status": 1,
   "stderr": "error: unable to delete 'sdlc/S-001-attempt-2': remote ref does not exist\nerror: failed to push some refs to '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-FgAeMF/testkit-cli-lT5sof/origin.git-33'"
  }
 ],
 "remoteAfter": [
  "main",
  "sdlc/S-001",
  "sdlc/S-002-attempt-1"
 ]
}
```

### VS-3b
```json
[
 {
  "fmt": "ünï/{name}",
  "branch": "ünï/S-001-attempt-1",
  "out": [
   {
    "cmd": "git branch -D ünï/S-001-attempt-1",
    "status": 0,
    "stderr": ""
   }
  ]
 },
 {
  "fmt": "-x/{name}",
  "rejectedByName": "{\"ok\": false, \"error\": \"the branch format '-x/{name}' gives '-x/S-001', which git check-ref-format refuses: fatal: '-x/S-001' is not a valid branch name\"}"
 },
 {
  "fmt": "--x{name}",
  "rejectedByName": "{\"ok\": false, \"error\": \"the branch format '--x{name}' gives '--xS-001', which git check-ref-format refuses: fatal: '--xS-001' is not a valid branch name\"}"
 },
 {
  "fmt": "a b/{name}",
  "rejectedByName": "{\"ok\": false, \"error\": \"the branch format 'a b/{name}' holds whitespace\"}"
 },
 {
  "fmt": "f$(touch PWNED)/{name}",
  "rejectedByName": "{\"ok\": false, \"error\": \"the branch format 'f$(touch PWNED)/{name}' holds whitespace\"}"
 },
 {
  "fmt": "f';touch PWNED;'/{name}",
  "rejectedByName": "{\"ok\": false, \"error\": \"the branch format \\\"f';touch PWNED;'/{name}\\\" holds whitespace\"}"
 }
]
```

## Attacks

Hostile branch formats: see TC-cli-5.

## Seeds

- Prompt writes git branch -D <branch> unquoted; branches.py accepts shell characters in a format: A branchFormat such as f$(id)/{name} or f;id;/{name} passes branches.py name. An agent that pastes the listed branch into a shell without quotes would run the text. The format is owner-controlled, so the risk is low. Quote the branch in the prompt. (skills/sdlc/prompts/integrator.md)
- A failed git push origin --delete exits 1 for a missing ref: The prompt says a missing name is fine. An agent must read exit 1 plus 'remote ref does not exist' as fine and still continue. The prompt does not say to continue after any failure of step 2 for one branch, though step 4 sends failures to notes. (skills/sdlc/prompts/integrator.md)
- branches.py list reads local branches only: A remote-only attempt branch stays on origin. The plan records this limit in its risks. (skills/sdlc/branches.py)
