# S-022 review, lens security, round 1

- Verdict: no blocking finding.
- The scripts call git with argument lists, never through a shell. No injection path exists.
- Branch names come from the format and slice ids. The verifier ran 128 hostile ids. All exit 2 with no traceback.

## Non-blocking

- `format_of` in state-write.py does not call `branches.validate_format`. A format such as `feat~/{name}` gives a name git refuses. Call the validator in `format_of`.
- `patch_slice` creates and checks out the slice branch before it checks that the slice exists. The behavior is the same on main. Check the slice first.
- `_config_value` in branches.py ignores a non-string `branchFormat` and falls back to `sdlc/{name}`. Refuse non-string values with a message.
