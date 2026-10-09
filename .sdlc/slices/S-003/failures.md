
## Fix round 1

- [review] Promote the verifier tests where the flag beats a broken config. The slice owns R-015, the format resolution order. No committed test gives --format together with a broken config.json. cmd_preflight computes given as `ns.format is not None or _config_format(repo) is not None`, so the operand order matters. If the operands swap, preflight with --format fails on a broken config. Promote TC-cli-18 and TC-cli-10 from `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` into `skills/sdlc/test/branches.test.mjs`, and record the promotion in tests.md.
