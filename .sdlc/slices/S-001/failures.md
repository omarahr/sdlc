# Failures: S-001

## Fix round 1

Evidence from round 0:

- [spec-fidelity] ok. No defect.
- [profiles] REFUTED. [cli] TC-cli-20: preflight exits 1 with a traceback when git-modes.json is a directory or has mode 000. load_git_modes does not catch OSError.
- [profiles] REFUTED. [contract] TC-contract-6, TC-contract-7, TC-contract-8: a deeply nested config.json makes load_format raise RecursionError. parse and name then exit 1 with a traceback.
- [profiles] REFUTED. [security] TC-security-20: a script run through a symlink imports a decoy branches.py from the symlink directory. The sys.path line uses abspath, which does not resolve the symlink.
- [regression] ok. No regression.

Fixes:

- load_git_modes catches OSError and RecursionError and raises Fail.
- load_format catches RecursionError beside ValueError and raises Fail.
- next-action.py, state-write.py and janitor.py insert os.path.dirname(os.path.realpath(__file__)) into sys.path.

## Fix round 2

Evidence from round 1:

- [review] Promote verifier test TC-cli-16 (bad git-modes.json on branches.py). No committed test pins preflight on a missing or malformed git-modes.json. No committed test pins that name, parse and list still run when that file is bad. Promote cli-0 TC-cli-16 into skills/sdlc/test/branches.test.mjs with a copied skill directory, and record it in tests.md.

Fixes:

- Promote TC-cli-16 into branches.test.mjs. The test copies branches.py into a scratch skill directory for each bad git-modes.json shape. No product code changed.
