# Review S-025, lens security, round 0

The slice adds a Branch names bullet and a table to `skills/sdlc/prompts/_common.md`. It adds tests in `prompts.test.mjs`.

No findings. The change is prose and read-only tests. It adds no input parsing, no secret handling and no network access.
The commands in the table pass fixed placeholders to `branches.py`. The `--kind` option is validated against a fixed list in `branches.py`.

needsVerify: false. The slice is rated medium and the rating fits.
