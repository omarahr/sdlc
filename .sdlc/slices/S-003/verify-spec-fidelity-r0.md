Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-003-spec-fidelity-r0`, detached at `13b17f1` (sdlc/S-003).

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-018 | "`tail(kind, **parts)`: the tail from the table in section 1. `state` without `ts` generates the timestamp. A missing part is a `Fail`." | Read the `TAILS` rows and `_state_tail`. Probed `tail` with a missing, empty and `None` id, an extra part, `ts=None`, and both e2e-area parts missing. Ran `name --kind state` under `TZ=Etc/GMT+12` and `TZ=Pacific/Kiritimati`; both gave the UTC stamp of `date -u`. | skills/sdlc/test/branches.test.mjs:436, skills/sdlc/test/branches.test.mjs:461 | holds |
| R-099 | "A missing part is a `Fail`." | Ran `name --kind e2e-area --id M-1` with no `--area` and with `--area ""`: exit 2, one JSON error that names area, no traceback. Unrowed kinds (`verify`) also exit 2 with one JSON error (ADR-20261009-041711). | skills/sdlc/test/branches.test.mjs:474 | holds |
| R-015 | "`--format` overrides the repo's `config.branchFormat`; without either, the default applies. `--repo` is the target repo, whose `.sdlc/config.json` holds the format once a run exists." | Read `_format` and `cmd_name`. The flag wins and the config is not read when the flag is given: an invalid config.json with `--format x/{name}` still names `x/S-001`. `{name:lower}` gives `feature/s-001`. The key set is exactly ok, command, format, kind, branch (ADR-20261009-041713). | skills/sdlc/test/branches.test.mjs:490 | holds |
| R-012 | "The format is resolved like `commitFormat`: the `--branch-format` flag, else `config.branchFormat` on resume, else the pre-flight's derivation (section 4), else the default." | Read `cmd_preflight`. `given` short-circuits on the flag, so an invalid config with `--format` gives `given: true`, exit 0. With no flag, an invalid config exits 2. A null `branchFormat` gives the default and `given: false`. Derivation belongs to S-015 to S-017. | skills/sdlc/test/branches.test.mjs:523 | holds |
| R-002 | "The default is `sdlc/{name}`." | Clause 1 only, per ADR-20261009-041833: `load_format` and the preflight default cases return `sdlc/{name}`. Clause 2 (fresh-run config write) closes in S-027. | skills/sdlc/test/branches.test.mjs (T-006 `load_format returns the config value or the default`), skills/sdlc/test/branches.test.mjs:523 | holds (partial, as the ADR intends) |

Verification plan r0: every requirement has at least one scenario, and each scenario carries the profiles that can falsify it (contract for the Python API, cli for the commands, security for hostile parts). No test gap.

Test run: `node --test skills/sdlc/test/branches.test.mjs` exit 0, 27 pass, 0 fail.

## Defects

None.

## Seeds

- The Fail message reads "a e2e-area branch name needs ..."; the article is wrong before a vowel. The spec does not define the message text.
