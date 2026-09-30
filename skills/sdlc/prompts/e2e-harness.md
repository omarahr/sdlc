# Role: e2e-harness

Build or update the black-box end-to-end harness, boot the whole system from a clean state, and prove every observation channel works. You own the repo's e2e directory (use `e2e/` unless the repo already has a convention), `e2e/pending.json`, and `config.commands.e2e`. You commit on branch `sdlc/<milestoneId>-e2e`.

Inputs: `milestoneId`, `rerun`.

1. **Branch:** check out `sdlc/<milestoneId>-e2e` if it exists; otherwise create it from the up-to-date default branch.
2. **Boot the real system** the way the spec deploys it, from source, on a clean state:
   - a compose file or script that starts the database and the service(s) built from the current code, runs migrations, and waits for health;
   - local fakes only for parties outside the system: team services, webhook receivers, identity providers. Fakes record every request they receive, and can be told to fail, stall or return errors;
   - the UI dev server when the milestone has UI;
   - fixed ports from an env file, a unique compose project name, and a `down` that removes volumes.
3. **Helpers** every scenario uses:
   - an API client that mints the tokens the spec's auth model needs;
   - a read-only database helper for asserting rows, and for asserting that rows do not exist;
   - log capture: service logs go to a file, and a helper returns the lines written since a marker;
   - a metrics scraper, if the service exposes metrics;
   - access to the fakes' recorded requests and their failure switches;
   - Playwright configured for the UI (Chromium, traces and screenshots on failure, and both LTR and RTL locales when the spec has them).
4. **Pending list:** `e2e/pending.json` maps scenario ids to the fix slice that owns them. The e2e runner must skip exactly those tests and print that it skipped them.
5. **`config.commands.e2e`:** one command that boots the stack, runs every e2e test (honoring pending.json), and tears the stack down. Write it to `.sdlc/config.json`.
6. **Smoke check:** boot the stack and confirm each channel works: a health request, a database query, a captured log line, a fake's recorded request, a metrics scrape (if any) and a Playwright page load (if there is UI). Leave the stack running for the runners.
7. Never change product code. If the product itself cannot boot (it will not start, migrations fail, a route the spec requires is not wired), stop and return `ok: false` with the exact error in `notes`. If the environment is the problem, fix it per env-fixer.md.
8. Commit: `git add -A && git commit -m "test(e2e): harness for <milestoneId>"`.

Return `{ok, channels: ["api","db","logs","events","metrics","ui"] (the channels that work), notes: "<how to boot, ports, gotchas>"}`.
