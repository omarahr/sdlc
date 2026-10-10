# Review S-022, lens architecture, round 0

The slice fits the plan. No blocking finding.

- format_of repeats the lookup in branches.load_format. Both read branchFormat. Keep it until S-023 moves the derivation into main().
- Three wrappers (format_of, branch_name, branch_kind) each convert branches.Fail to Fail. This is consistent. Fold them into one decorator or helper later.
- Docstrings of branch_run and nearby comments still name sdlc/run-<n> and sdlc/M-1. Reword them to speak of the format.
