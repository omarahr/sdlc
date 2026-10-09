# S-015 plan: preflight tests the mode's branch names and prints a verdict (revision 0)

## Approach
This slice turns `cmd_preflight` in `skills/sdlc/branches.py` from a format echo into the verdict of spec section 4, steps 1 to 4. S-014 finished `read_rules(repo, samples)`. `judge(rules, sample)` and `name(...)` already exist.
A new pure helper `verdict(repo, fmt, mode, current)` does the whole verdict step. It builds the samples with `build_samples`, calls `read_rules` once, and judges each sample only against `by_sample[sample]` (ADR f2cc). It returns the rows, the union `rules`, the `forge`, the merged `notes` and the `ok` flag. It reads no `ns` and prints nothing. `cmd_preflight` resolves `fmt` and `given`, calls `verdict` once, and prints. S-016 calls `verdict` a second time with `fmt2`. That call builds new sample names and reads the rules again, because `by_sample` is keyed by sample name.
The git ref-format check is local, so it applies in every case. When `read_rules` reports `unchecked` or lists no rules for a sample, `verdict` calls `judge([], sample)`. A `fail` from that call stays `fail` with the rule `git check-ref-format`, because git refuses the name and no push can succeed. Any other result becomes `unchecked`. This follows the spec text "every sample must pass `git check-ref-format`", and "unchecked never blocks" applies to the forge rules only (ADR to record).
Notes merge in this order: the notes from `read_rules` first, then the `cannot evaluate <label>: ...` notes from each `judge` call in sample order. `verdict` removes duplicates and keeps first-seen order.
The command prints `ok`, `format`, `derived`, `forge`, `rules`, `samples`, `notes` and `suggestion`. It keeps the keys `command`, `args` and `given` that earlier tests need. `derived` is always false and `suggestion` is `""` in this slice, because derivation and the suggestion text belong to S-016 (R-042, R-043).
`ok` is false when any sample has the result `fail`. The exit code is 0 when `ok`, 1 when not, 2 on bad input. `main` must return 1 for a not-ok result without printing a second object.
`--branch` adds one `working` sample, only in `mr` mode, named as given and judged as it is. In every other mode `--branch` is ignored.

## Files
- Modify `skills/sdlc/branches.py`: add `SAMPLE_KINDS` (mode to sample list), `build_samples(fmt, mode, current)`, `_sample_row(...)` and the pure helper `verdict(repo, fmt, mode, current)`. Rewrite `cmd_preflight` to call `verdict` once. Let `main` map `ok: false` from preflight to exit 1.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below, with a `gh` shim helper (S-013 has `ghShim`).
- No other file changes.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run with `node --test skills/sdlc/test/branches.test.mjs`.
- T-R-038a (R-038) "flag gives given true and the flag format": `--format team/{name}` gives `given` true and `format` `team/{name}`, even when config holds another format.
- T-R-038b (R-038) "config gives given true": config `branchFormat` and no flag gives `given` true and the config format.
- T-R-038c (R-038) "neither gives given false": no flag and no config gives `given` false and `sdlc/{name}`.
- T-R-038d (R-038) "invalid format exits 2": `--format feature/x` exits 2 with `{"ok": false, "error": ...}`.
- T-R-039a (R-039) "pr samples": `--mode pr` gives sample kinds `slice`, `state`, `e2e` in that order. Names are `sdlc/S-001`, `sdlc/state-<14 digits>`, `sdlc/M-1-e2e`.
- T-R-039b (R-039) "stack samples": `--mode stack` gives `run`, `milestone`, `slice`: `sdlc/run-1`, `sdlc/M-1`, `sdlc/S-001`.
- T-R-039c (R-039) "mr and direct sample none": `--mode mr` and `--mode direct` give `samples` equal to `[]` when no `--branch` is given.
- T-R-039d (R-039) "samples follow the format": format `feature/{name:lower}` gives `feature/s-001` for the slice sample.
- T-R-040a (R-040) "mr adds a working sample": `--mode mr --branch bad-name` adds a sample with kind `working` and name `bad-name`, last in the list.
- T-R-040b (R-040) "working is judged as given": a gitlab shim with regex `^feat/` makes `bad-name` fail and `feat/x` pass. The name is not renamed or reformatted.
- T-R-040c (R-040) "other modes ignore --branch": `--mode pr`, `stack` and `direct` with `--branch X` give no `working` sample, and the samples equal the run without the flag.
- T-R-041a (R-041) "no rules gives ok": a repo with no forge gives `ok` true, `format` `sdlc/{name}`, exit 0, every sample `unchecked`.
- T-R-041b (R-041) "passing and unevaluated never block": a gh shim that returns a matching `starts_with` rule gives `pass` samples. A shim with an uncompilable regex gives `unevaluated` samples and a top-level `notes` entry starting `cannot evaluate`. Both give `ok` true and exit 0.
- T-R-041c (R-041) "unchecked never blocks": a gh shim that exits 1 gives a note `rules unknown on github:`, `unchecked` samples, `ok` true, exit 0.
- T-R-044a (R-044) "output keys": the output has the keys `ok`, `format`, `derived`, `forge`, `rules`, `samples`, `notes`, `suggestion`. `derived` is false. Each sample has exactly `kind`, `name`, `result`, `rule`. `result` is one of `pass`, `fail`, `unevaluated`, `unchecked`.
- T-R-044b (R-044) "a failed sample names the first failing rule": a gh shim returns two failing rules. The failed sample's `rule` is the label of the first. A passing sample has `rule` null.
- T-R-044c (R-044) "exit codes": a failing sample gives `ok` false and exit 1. The same repo with a passing format gives exit 0. A bad mode gives exit 2.
- T-R-044d (R-044) "ref-format failure with forge rules": a gh shim returns a matching `starts_with` rule for every sample. `--mode mr --branch "a..b"` gives the `working` sample result `fail` with rule `git check-ref-format`, `ok` false and exit 1. The other samples pass.
- T-R-044e (R-044) "ref-format failure without a forge": a repo with no forge and `--mode mr --branch "a..b"` gives the `working` sample result `fail` with rule `git check-ref-format`, and exit 1. A valid branch in the same repo gives `unchecked`.
- T-R-044f (R-044) "ref-format failure when rules are unknown": a gh shim that exits 1 and `--branch "a..b"` give `fail` for `working`, `unchecked` for the other samples, and the note `rules unknown on github:`.
- T-R-041d (R-041) "notes merge without duplicates": two samples with the same uncompilable regex rule give exactly one `cannot evaluate` note. A `read_rules` note and a judge note both appear when both occur, in first-seen order.
- T-R-084a (R-084) "no gh and no glab": `PATH` holds `python3` and `git` only, with forge `github`. Preflight gives `ok` true, one note starting `rules unknown on github:`, and every sample `unchecked`. The same holds for gitlab with `glab` absent. This test closes R-084 (ADR 74ec).
- Existing preflight tests (`every command runs`, `resolved format and given`, `--format wins over a broken config`) stay green with no edit. The `command`, `args` and `given` keys remain for them.
- Each test can fail: Step 5 breaks the code on purpose.

## Steps
1. Test-writer: add the gh and glab shim helpers and the tests. Run them. They fail because preflight prints no samples.
2. Add `build_samples` and the mode table. Check T-R-039*.
3. Add `verdict`: read the rules, judge each sample against `by_sample[sample]`, apply the ref-format rule to unchecked samples, merge the notes. Rewrite `cmd_preflight` to call it and print. Check T-R-038*, T-R-041*, T-R-044*.
4. Add the `working` sample and the exit code 1 in `main`. Check T-R-040*, T-R-044c. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.
5. Show that the tests can fail, in a scratch copy only. Judge against the union `rules` instead of `by_sample` and see a per-sample test fail. Add `working` in every mode and see T-R-040c fail. Return exit 0 on `ok` false and see T-R-044c fail. Do not commit these edits.

## Risks
- A wrong `ok` true lets a launch push a name the forge rejects. The push reports the rejection, so the harm is small. Tests T-R-040b and T-R-044b guard the failing path.
- `main` returns 0 today for every handled result. A change to return 1 must not touch `name`, `parse` or `list`. The exit code comes from the preflight result only.
- The `state` sample uses a generated timestamp. Tests match the 14-digit shape, not a value.
- `by_sample` is keyed by sample name. Two samples with the same name (for example a `working` branch equal to the slice name) share one entry. The sample list is de-duplicated for the rule read only. Each sample row stays in the output.
- `read_rules` for GitHub stops at the first `gh` failure. All samples then become `unchecked`, as the spec asks.

## Critique responses
- Spec-fidelity critique: the plan now says an invalid ref name gives `fail` with rule `git check-ref-format` even when samples are otherwise unchecked. Tests T-R-044d names its shim setup. Tests T-R-044e and T-R-044f pin the unchecked plus invalid ref case. The notes merge is in the Approach and in T-R-041d.
- Architecture critique: the plan adds the pure helper `verdict(repo, fmt, mode, current)`. `cmd_preflight` calls it once and S-016 calls it again with `fmt2`. The notes merge removes duplicates in first-seen order.
