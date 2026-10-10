T-R-022-ascii (skills/sdlc/test/branches.test.mjs) — R-022 — parse reads look-alike K sign, long s and Arabic-Indic digit tails as loop branches.
T-R-022-area (skills/sdlc/test/branches.test.mjs) — R-022 — characterization: passes now. It pins that a non-ASCII area stays an e2e-area.
T-R-022-order (skills/sdlc/test/branches.test.mjs) — R-022 — characterization: passes now. It pins the row order for valid ASCII tails in both modes.
T-R-024-ids (skills/sdlc/test/branches.test.mjs) — R-024 — lowering maps the K sign to k, so a look-alike id reports known true.
T-R-024-affix (skills/sdlc/test/branches.test.mjs) — R-024 — lowering maps the K sign to k, so a look-alike prefix or suffix matches.
SC-M-1-080 (e2e/tests/parse-list.test.mjs) — R-024 — parse reads look-alike branches as loop branches, and janitor deletes one. The entry left e2e/pending.json.
