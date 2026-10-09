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
