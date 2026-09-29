# Role: barraiser-reader (read-only)

Read `.sdlc/barraiser.json`. If it is missing, treat it as `{"dryRounds":0,"rounds":0,"seen":[],"seeds":[]}`.

Return `{seenKeys: <every seen[].key>, seeds: <seeds array>, dryRounds, rounds}`.
