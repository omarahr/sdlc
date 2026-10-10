# Role: e2e-harness

Build or update the black-box end-to-end harness. Boot the whole system from a clean state. Prove every observation channel works. You own the repo's e2e directory (use `e2e/` unless the repo already has a convention), `e2e/pending.json`, and `config.commands.e2e`. You commit on branch `<e2e branch>`. In `stack` mode the branch is cut from `<milestone branch>`, the milestone branch, not the default branch. The suite then lands with the milestone it proves.

Inputs: `milestoneId`, `rerun`.

1. **Branch:** check out `<e2e branch>` if it exists; otherwise create it. In `stack` mode cut it from the milestone branch `<milestone branch>`. The milestone's first slice already created it. If it is missing, stop and say so rather than creating it. In `pr` mode cut it from the default branch's fetched tip: run `git fetch origin <defaultBranch>` (none when the repo has no remote), then `git checkout -b <e2e branch> --no-track origin/<defaultBranch>`. With no remote, cut it from the local `<defaultBranch>` ref instead. In `direct` and `mr` mode cut it from the run branch. That branch is the loop's working branch, which in `mr` mode is also `config.defaultBranch`. Branching from a ref is always allowed: git refuses only *checking out* a branch another worktree holds, never branching from it. Never cut it from the default branch in `stack` mode.
2. **Boot the real system** the way the spec deploys it. Boot it from source, on a clean state:
   - a compose file or script that starts the database and the service(s) built from the current code. It runs migrations and waits for health;
   - local fakes only for parties outside the system: team services, webhook receivers, identity providers. Fakes record every request they receive. They can be told to fail, stall or return errors;
   - the UI dev server when the milestone has UI;
   - fixed ports from an env file, a unique compose project name, and a `down` that removes volumes.
3. **Helpers** every scenario uses:
   - an API client that mints the tokens the spec's auth model needs;
   - a read-only database helper for asserting rows, and for asserting that rows do not exist;
   - log capture: service logs go to a file, and a helper returns the lines written since a marker;
   - a metrics scraper, if the service exposes metrics;
   - access to the fakes' recorded requests and their failure switches;
   - Playwright configured for the UI: Chromium, traces and screenshots on failure, and both LTR and RTL locales when the spec has them.
4. **Pending list:** `e2e/pending.json` maps scenario ids to the fix slice that owns them. The e2e runner must skip exactly those tests and print that it skipped them.
5. **`config.commands.e2e`:** one command that boots the stack, runs every e2e test (honoring pending.json), and tears the stack down. Write it to `.sdlc/config.json`.
6. **Smoke check:** boot the stack and confirm each channel works: a health request; a database query; a captured log line; a fake's recorded request; a metrics scrape (if any); and a Playwright page load (if there is UI). Leave the stack running for the runners.
7. Never change product code. If the product itself cannot boot, stop. Return `ok: false` with the exact error in `notes`. It may fail in these ways: it will not start, migrations fail, or a route the spec requires is not wired. If the environment is the problem, fix it per env-fixer.md.
8. Commit: `git add -A && git commit -m "test(e2e): harness for <milestoneId>"`.

Return `{ok, channels: ["api","db","logs","events","metrics","ui"] (the channels that work), notes: "<how to boot, ports, gotchas>"}`.
