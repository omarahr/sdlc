# Review S-034, lens architecture, round 0

Verdict: no blocking finding. The diff is four prose insertions in the Branch format bullet and four tests in prompts.test.mjs.

- Non-blocking: the last sentence repeats the sentence before it. "This check is first run only: on a resume ..." and "On a resume, run no `parse` check and ask for no rename" say the same thing. Merge them into one sentence in a later edit.
- Non-blocking: "With none, give preflight no `--format` argument" repeats "with `--format` when you have one". The sentence is explicit, so it does no harm.
- Non-blocking: on a resume, a failed `working` sample still sets `ok` false, so the driver ends. The new "ask for no rename" sentence does not say this. The plan records the case in an ADR.
- Fit: the tests reuse `branchFormatBullet`, `skillText` and `promptText`. T-R-002d pins the env-detector rule, which owns the `config.json` write.
