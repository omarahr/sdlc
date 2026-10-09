# S-013 · read_rules reads GitHub branch name patterns
Verdict: RELEASED
Commit under test: fe02f01 (verified); branch head 51c3037 (state commits only) · Rounds: 1 (round 0) · Attempts: 1 · Risk: medium · Written: 2026-10-09 UTC

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 6 | 38 | 38 | 0 | 0 | 0 / 0 | 18 |

## Summary
The slice adds `read_rules(repo, samples)` to `skills/sdlc/branches.py`. It reads the GitHub branch name patterns that apply to each sample branch name. It makes one `gh api` call per sample and keeps only `branch_name_pattern` rules. A failed `gh` call gives one note and the samples stay `unchecked`. The slice adds no command; S-015 calls the function. Two profiles ran in round 0 against a `gh` shim: contract (24 cases) and security (14 cases, 14 attacks). Both passed on the first run, and the full suite and the Gate passed. The verifiers found no blocking defect. They recorded 18 non-blocking seeds, mostly about rule fields with odd JSON types and raw stderr in notes. R-084 is covered for the `gh` half only. The `glab` half belongs to S-014 and the preflight half to S-015 (ADR 74ec).

## Open risks
- R-084 stays open after this slice. Only the `gh` half is proven. S-014 adds the `glab` half. S-015 adds the preflight half and closes it (ADR 74ec).
- A rule with a non-string `pattern` or `kind` passes through `read_rules`. `judge` then raises `TypeError` on 4 of 8 hostile rules (ATK-7). GitHub validates these types, so a real call is unlikely to trigger it. Fix: set `kind` to `None` in `github_rule` when the pattern is not a string.
- The failure note keeps the whole `gh` stderr text, with escape codes and any length (ATK-8, 1 MB tested). S-015 prints the note to a terminal. Collapse control characters and cap the length before it does.
- `unchecked` is true both for a forge other than `github` and for a failed `gh` call. Only the notes tell the two apart. S-014 must keep the notes distinct.
- The rule union uses list membership, so it is quadratic. 20000 rules take about 6 s. Real GitHub bodies are small.
- The 60 second timeout per sample is a plan choice. The spec states no number. No committed test covers the timeout path; the verifiers ran it (TC-contract-15, TC-security-10).
- The spec names `read_rules(repo)`. The code takes `(repo, samples)` (ADR f2cc). `by_sample` is a design choice. S-015 must judge each sample against `by_sample[sample]`.
- R-026 (rule shape) is owned by S-014 (ADR 9094). This slice proves the GitHub half only (T-R-028e, TC-contract-4).

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-027 | for each sample, `gh api "repos/{owner}/{repo}/rules/branches/<sample>"` with `/` in the sample encoded as `%2F` (`urllib.parse.quote(sample, safe="")`). | VS-1, VS-2, VS-3, VS-6 | TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-9, TC-contract-20, TC-contract-21, TC-contract-22, TC-contract-23, TC-contract-24, TC-security-1, TC-security-2, TC-security-3, TC-security-4, TC-security-11, TC-security-12, TC-security-13 | pass |
| R-028 | Keep the objects whose `type` is `branch_name_pattern`: `kind` is `parameters.operator`, `pattern` is `parameters.pattern`, `negate` is `parameters.negate` or `false`, `label` is `parameters.name` when present, else `ruleset <ruleset_id>` when present, else `branch_name_pattern`. | VS-2, VS-3 | TC-contract-4, TC-contract-5, TC-contract-6, TC-contract-7, TC-contract-8, TC-contract-23 | pass |
| R-029 | A `gh api` failure (not signed in, no access, a network error) is one note, `rules unknown on github: <stderr>`, and the samples are `unchecked`. | VS-4 | TC-contract-10, TC-contract-11, TC-contract-12, TC-contract-13, TC-contract-14, TC-contract-15, TC-contract-16, TC-security-5, TC-security-6, TC-security-7, TC-security-8, TC-security-9, TC-security-10, TC-security-14 | pass |
| R-084 | **`gh` or `glab` not available or not signed in**: `unchecked`, a note, the run launches. | VS-5 | TC-contract-17, TC-contract-18, TC-contract-19 | pass (gh half only) |

The committed tests `T-R-027a` to `T-R-084a` in `skills/sdlc/test/branches.test.mjs:1724-1857` also guard these requirements. The regression verifier ran them: 112 pass, 0 fail.

## Scenarios
### VS-1 · read_rules makes one gh call per sample with every slash encoded as %2F
Profiles: contract, security. Risk: Samples sdlc/S-001, M-1-e2e, and odd ones (space, %, ?, #, .

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | One gh call per sample, argv list, every slash %2F, cwd is the repo | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:45` |
| TC-contract-2 | Forge absent, empty, gitlab, non-string or wrong case makes no call and keeps the result shape | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:61` |
| TC-contract-3 | Empty sample list makes no call and is a successful read | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:73` |
| TC-contract-24 | read_rules does not change the repo files | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:332` |
| TC-security-1 | Corpus values stay one path segment in a two-item argv | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:62` |
| TC-security-2 | Dot-only samples stay unencoded | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:84` |
| TC-security-3 | Placeholders and shell syntax are encoded; no marker file | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:95` |
| TC-security-4 | NUL in a sample is encoded as %00 | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:114` |
| TC-security-11 | A gh planted in the repo never runs | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:219` |
| TC-security-12 | Hostile forge values never reach gh | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:235` |
| TC-security-13 | gh runs with cwd equal to the repo and the tree stays unchanged | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:257` |

<details>
<summary>Case detail (11 cases)</summary>

#### TC-contract-1 · One gh call per sample, argv list, every slash %2F, cwd is the repo · PASS
- **Given** 14 samples incl. space, %, ?, #, .., unicode, leading dash, newline, quote, $(id), empty **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** One gh call per sample, argv list, every slash %2F, cwd is the repo
- **Expected** One gh call per sample, argv list, every slash %2F, cwd is the repo **Actual** as expected
- **Spec source:** R-027 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-2 · Forge absent, empty, gitlab, non-string or wrong case makes no call and keeps the result shape · PASS
- **Given** 7 forge values **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Forge absent, empty, gitlab, non-string or wrong case makes no call and keeps the result shape
- **Expected** Forge absent, empty, gitlab, non-string or wrong case makes no call and keeps the result shape **Actual** as expected
- **Spec source:** R-027 quote; plan: forge other than github · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-3 · Empty sample list makes no call and is a successful read · PASS
- **Given** samples [] **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Empty sample list makes no call and is a successful read
- **Expected** Empty sample list makes no call and is a successful read **Actual** as expected
- **Spec source:** R-027 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-24 · read_rules does not change the repo files · PASS
- **Given** file list before and after **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** read_rules does not change the repo files
- **Expected** read_rules does not change the repo files **Actual** as expected
- **Spec source:** Mutation rule (inputs not mutated) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-security-1 · Corpus values stay one path segment in a two-item argv · PASS
- **Given** a github repo and a gh shim **When** read_rules runs on 8 corpus families (injection, traversal, flag-like, format strings, control chars, confusables, whitespace, oversized) **Then** each sample gives one gh call, argv exactly [api, repos/{owner}/{repo}/rules/branches/<one segment>], tree unchanged
- **Expected** each sample gives one gh call, argv exactly [api, repos/{owner}/{repo}/rules/branches/<one segment>], tree unchanged **Actual** each sample gives one gh call, argv exactly [api, repos/{owner}/{repo}/rules/branches/<one segment>], tree unchanged (observed)
- **Spec source:** R-027 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-1: all entries held; only dot-only samples differ (see ATK-2)
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-2 · Dot-only samples stay unencoded · PASS
- **Given** samples . and .. **When** read_rules runs **Then** path ends in branches/. and branches/.. (quote leaves dots alone)
- **Expected** path ends in branches/. and branches/.. (quote leaves dots alone) **Actual** path ends in branches/. and branches/.. (quote leaves dots alone) (observed)
- **Spec source:** R-027 acceptance (quote safe empty) · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-2: repos/{owner}/{repo}/rules/branches/.. . Seed: dot segment.
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-3 · Placeholders and shell syntax are encoded; no marker file · PASS
- **Given** samples with {owner}, $(..), backticks, ;, &&, |, newline, quote, -X, --hostname, :owner, {branch} **When** read_rules runs **Then** 12 calls, each argv length 2, tail has none of { } : $ ` ; & | newline quote space; marker file absent
- **Expected** 12 calls, each argv length 2, tail has none of { } : $ ` ; & | newline quote space; marker file absent **Actual** 12 calls, each argv length 2, tail has none of { } : $ ` ; & | newline quote space; marker file absent (observed)
- **Spec source:** R-027 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-3: all paths encoded
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-4 · NUL in a sample is encoded as %00 · PASS
- **Given** sample a<NUL>b **When** read_rules runs **Then** one call, path ends a%00b
- **Expected** one call, path ends a%00b **Actual** one call, path ends a%00b (observed)
- **Spec source:** R-027 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-4: argv a%00b
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-11 · A gh planted in the repo never runs · PASS
- **Given** repo holds ./gh and bin/gh that touch a marker; PATH has python3 and git only **When** read_rules runs **Then** marker absent; one note; unchecked
- **Expected** marker absent; one note; unchecked **Actual** marker absent; one note; unchecked (observed)
- **Spec source:** R-027 acceptance (cwd=repo) · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-11: marker absent
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-12 · Hostile forge values never reach gh · PASS
- **Given** forge values GitHub, 'github ', 'github\n', GITHUB, 'github\0', gitlab, lists, objects, numbers, duplicate keys **When** read_rules runs **Then** 0 gh calls; no raise
- **Expected** 0 gh calls; no raise **Actual** 0 gh calls; no raise (observed)
- **Spec source:** R-027 (github only) · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-12
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-13 · gh runs with cwd equal to the repo and the tree stays unchanged · PASS
- **Given** a repo **When** read_rules runs **Then** logged cwd equals the repo real path
- **Expected** logged cwd equals the repo real path **Actual** logged cwd equals the repo real path (observed)
- **Spec source:** R-027 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-13
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

</details>

### VS-2 · only branch_name_pattern objects become rules, with the five-key shape and field mapping
Profiles: contract. Risk: Mixed rule types; missing parameters; non-dict items; negate absent, true, non-bool; label falls back name, ruleset id, branch_name_pattern; empty name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | Only branch_name_pattern objects become rules with the five keys; junk items are skipped | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:82` |
| TC-contract-5 | negate defaults false; label falls back name, ruleset id, constant; empty name falls through | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:97` |
| TC-contract-6 | Non-bool negate values still give a bool | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:115` |
| TC-contract-23 | read_rules equals the model written from the spec over random bodies and samples (property, 1000 runs, seed 20261010) | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:324` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-4 · Only branch_name_pattern objects become rules with the five keys; junk items are skipped · PASS
- **Given** 11 mixed items **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Only branch_name_pattern objects become rules with the five keys; junk items are skipped
- **Expected** Only branch_name_pattern objects become rules with the five keys; junk items are skipped **Actual** as expected
- **Spec source:** R-028 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-5 · negate defaults false; label falls back name, ruleset id, constant; empty name falls through · PASS
- **Given** 6 objects **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** negate defaults false; label falls back name, ruleset id, constant; empty name falls through
- **Expected** negate defaults false; label falls back name, ruleset id, constant; empty name falls through **Actual** as expected
- **Spec source:** R-028 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-6 · Non-bool negate values still give a bool · PASS
- **Given** negate "false", 0, null, 1 **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Non-bool negate values still give a bool
- **Expected** Non-bool negate values still give a bool **Actual** as expected
- **Spec source:** R-028 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-23 · read_rules equals the model written from the spec over random bodies and samples (property, 1000 runs, seed 20261010) · PASS
- **Given** 1000 runs, 0-3 samples, 0-4 objects each **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** read_rules equals the model written from the spec over random bodies and samples (property, 1000 runs, seed 20261010)
- **Expected** read_rules equals the model written from the spec over random bodies and samples (property, 1000 runs, seed 20261010) **Actual** as expected
- **Spec source:** R-027, R-028 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (property-run): property read_rules: seed=20261010 runs=1000 failures=0
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

</details>

### VS-3 · rules stay with their own sample and the union has no duplicates
Profiles: contract. Risk: Two or more samples with different, overlapping and empty bodies.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | Each sample keeps its own rules; union has no duplicates; empty body stays empty | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:123` |
| TC-contract-8 | Rules that differ in negate or label are not merged | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:138` |
| TC-contract-9 | Duplicate sample names | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:144` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-7 · Each sample keeps its own rules; union has no duplicates; empty body stays empty · PASS
- **Given** 4 samples, overlapping bodies **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Each sample keeps its own rules; union has no duplicates; empty body stays empty
- **Expected** Each sample keeps its own rules; union has no duplicates; empty body stays empty **Actual** as expected
- **Spec source:** ADR f2cc; R-028 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-8 · Rules that differ in negate or label are not merged · PASS
- **Given** 3 near-equal rules **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Rules that differ in negate or label are not merged
- **Expected** Rules that differ in negate or label are not merged **Actual** as expected
- **Spec source:** R-028 (rule identity) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-9 · Duplicate sample names · PASS
- **Given** samples [dup, dup] **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Duplicate sample names
- **Expected** Duplicate sample names **Actual** as expected
- **Spec source:** R-027 acceptance (one call per sample) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

</details>

### VS-4 · a failing gh gives one note and unchecked samples
Profiles: contract, security. Risk: Exit 1 with stderr, exit 1 with empty stderr, non-JSON output, JSON object not list, huge or deeply nested JSON, hung gh (timeout), failure on the second sample.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-10 | Exit 1 with stderr gives one note with the stderr text; the read ends at the first failure | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:163` |
| TC-contract-11 | Exit 1 with empty stderr still gives a reason | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:174` |
| TC-contract-12 | Non-JSON, object, scalar, null, empty output are failures with one note | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:181` |
| TC-contract-13 | Deeply nested JSON (200000 levels) and 50000 rules do not crash | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:189` |
| TC-contract-14 | Stderr with NUL, escape codes, invalid bytes and 200 KB of text gives one note and serializable result | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:201` |
| TC-contract-15 | Hung gh ends by the timeout and gives one note | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:210` |
| TC-contract-16 | gh does not wait on stdin and sees GH_PROMPT_DISABLED=1 | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:220` |
| TC-security-5 | Failure on the second sample leaks no partial rules | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:124` |
| TC-security-6 | Hostile gh stdout never raises | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:136` |
| TC-security-7 | Rule fields from gh output reach judge with odd types | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:162` |
| TC-security-8 | Stderr with ANSI escapes, CR/LF, NUL and 1 MB text gives one note | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:181` |
| TC-security-9 | Token-like text in stderr appears in the note; env token never appears on success | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:196` |
| TC-security-10 | Hung gh ends in one note after the timeout | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:206` |
| TC-security-14 | A 20000-rule body stays bounded | PASS | `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:268` |

<details>
<summary>Case detail (14 cases)</summary>

#### TC-contract-10 · Exit 1 with stderr gives one note with the stderr text; the read ends at the first failure · PASS
- **Given** second of three calls fails **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Exit 1 with stderr gives one note with the stderr text; the read ends at the first failure
- **Expected** Exit 1 with stderr gives one note with the stderr text; the read ends at the first failure **Actual** as expected
- **Spec source:** R-029 quote and acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-11 · Exit 1 with empty stderr still gives a reason · PASS
- **Given** exit 1, no stderr **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Exit 1 with empty stderr still gives a reason
- **Expected** Exit 1 with empty stderr still gives a reason **Actual** as expected
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-12 · Non-JSON, object, scalar, null, empty output are failures with one note · PASS
- **Given** 8 outputs **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Non-JSON, object, scalar, null, empty output are failures with one note
- **Expected** Non-JSON, object, scalar, null, empty output are failures with one note **Actual** as expected
- **Spec source:** R-029 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-13 · Deeply nested JSON (200000 levels) and 50000 rules do not crash · PASS
- **Given** nested and big bodies **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Deeply nested JSON (200000 levels) and 50000 rules do not crash
- **Expected** Deeply nested JSON (200000 levels) and 50000 rules do not crash **Actual** as expected
- **Spec source:** R-029 (failure is a note, never a crash) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-14 · Stderr with NUL, escape codes, invalid bytes and 200 KB of text gives one note and serializable result · PASS
- **Given** stderr 200 KB **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Stderr with NUL, escape codes, invalid bytes and 200 KB of text gives one note and serializable result
- **Expected** Stderr with NUL, escape codes, invalid bytes and 200 KB of text gives one note and serializable result **Actual** as expected
- **Spec source:** R-029 quote · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-15 · Hung gh ends by the timeout and gives one note · PASS
- **Given** gh sleeps 600 s **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Hung gh ends by the timeout and gives one note
- **Expected** Hung gh ends by the timeout and gives one note **Actual** as expected
- **Spec source:** R-029 quote (network error) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-16 · gh does not wait on stdin and sees GH_PROMPT_DISABLED=1 · PASS
- **Given** gh reads stdin **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** gh does not wait on stdin and sees GH_PROMPT_DISABLED=1
- **Expected** gh does not wait on stdin and sees GH_PROMPT_DISABLED=1 **Actual** as expected
- **Spec source:** R-029 quote (not signed in is a note) · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-security-5 · Failure on the second sample leaks no partial rules · PASS
- **Given** gh answers rules for sample 1, exit 1 for sample 2 **When** read_rules runs on 3 samples **Then** 2 calls, rules [], by_sample {}, unchecked, one note
- **Expected** 2 calls, rules [], by_sample {}, unchecked, one note **Actual** 2 calls, rules [], by_sample {}, unchecked, one note (observed)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-5
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-6 · Hostile gh stdout never raises · PASS
- **Given** stdout deep list (200000), deep object, NaN, 100000-digit int, trailing NUL, invalid UTF-8, non-dict items, bad parameters and type values, empty, blanks **When** read_rules runs **Then** no exception; tree unchanged; one gh call
- **Expected** no exception; tree unchanged; one gh call **Actual** no exception; tree unchanged; one gh call (observed)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-6
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-7 · Rule fields from gh output reach judge with odd types · PASS
- **Given** gh returns patterns that are int, dict, list, null and kind list **When** rules pass to branches.judge **Then** read_rules does not raise; judge raises TypeError on 4 of 8 rules (out of scope: judge belongs to earlier slices, GitHub validates pattern types)
- **Expected** read_rules does not raise; judge raises TypeError on 4 of 8 rules (out of scope: judge belongs to earlier slices, GitHub validates pattern types) **Actual** read_rules does not raise; judge raises TypeError on 4 of 8 rules (out of scope: judge belongs to earlier slices, GitHub validates pattern types) (observed)
- **Spec source:** none (seed) · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-7: 4 TypeError. Seed filed.
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-8 · Stderr with ANSI escapes, CR/LF, NUL and 1 MB text gives one note · PASS
- **Given** gh exits 1 with hostile stderr **When** read_rules runs on 2 samples **Then** one call, one note, no rules
- **Expected** one call, one note, no rules **Actual** one call, one note, no rules (observed)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-8: note keeps ESC and newline raw; 1 MB note length 1000025. Seed.
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-9 · Token-like text in stderr appears in the note; env token never appears on success · PASS
- **Given** GH_TOKEN in env; gh stderr with ghp_ text **When** read_rules runs **Then** success result holds no token; failure note carries stderr as the spec says
- **Expected** success result holds no token; failure note carries stderr as the spec says **Actual** success result holds no token; failure note carries stderr as the spec says (observed)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-9: note echoes stderr verbatim (spec text). Seed.
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-10 · Hung gh ends in one note after the timeout · PASS
- **Given** gh stalls, GH_TIMEOUT set to 1 second **When** read_rules runs on 2 samples **Then** 1 call, one note naming the timeout, unchecked, 1 s
- **Expected** 1 call, one note naming the timeout, unchecked, 1 s **Actual** 1 call, one note naming the timeout, unchecked, 1 s (observed)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-10: 1038 ms
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

#### TC-security-14 · A 20000-rule body stays bounded · PASS
- **Given** gh returns 20000 distinct rules **When** read_rules runs **Then** all 20000 kept in 6.2 s (quadratic dedupe). Seed.
- **Expected** all 20000 kept in 6.2 s (quadratic dedupe). Seed. **Actual** all 20000 kept in 6.2 s (quadratic dedupe). Seed. (observed)
- **Spec source:** none (seed) · **Run:** `node --test .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): ATK-14: 6159 ms
- Evidence (log): [run](../../slices/S-013/verification/r0/logs/security-0-run.txt)

</details>

### VS-5 · gh absent from PATH does not crash the read
Profiles: contract. Risk: PATH holds python3 and git only.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-17 | gh absent from PATH is one note and unchecked; no raise | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:229` |
| TC-contract-18 | gh not executable or a directory is one note | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:240` |
| TC-contract-19 | gh with a broken shebang is one note | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:252` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-17 · gh absent from PATH is one note and unchecked; no raise · PASS
- **Given** PATH holds python3 and git **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** gh absent from PATH is one note and unchecked; no raise
- **Expected** gh absent from PATH is one note and unchecked; no raise **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-18 · gh not executable or a directory is one note · PASS
- **Given** 2 variants **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** gh not executable or a directory is one note
- **Expected** gh not executable or a directory is one note **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-19 · gh with a broken shebang is one note · PASS
- **Given** shebang to a missing interpreter **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** gh with a broken shebang is one note
- **Expected** gh with a broken shebang is one note **Actual** as expected
- **Spec source:** R-084 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

</details>

### VS-6 · config problems keep one message and the old format loader still works
Profiles: contract. Risk: forge absent, empty, wrong type, invalid JSON, directory, unreadable config, missing .

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-20 | Forge config problems (absent, empty, wrong type, non-object JSON, missing .sdlc) give an unchecked result and no call | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:261` |
| TC-contract-21 | Invalid JSON, invalid UTF-8, deep nesting, directory, unreadable, symlink loop raise Fail with the load_format text | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:282` |
| TC-contract-22 | load_format results unchanged (property, 1000 runs, seed 20261010) | PASS | `.sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:315` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-20 · Forge config problems (absent, empty, wrong type, non-object JSON, missing .sdlc) give an unchecked result and no call · PASS
- **Given** 6 configs **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Forge config problems (absent, empty, wrong type, non-object JSON, missing .sdlc) give an unchecked result and no call
- **Expected** Forge config problems (absent, empty, wrong type, non-object JSON, missing .sdlc) give an unchecked result and no call **Actual** as expected
- **Spec source:** R-027; plan T-R-027b · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-21 · Invalid JSON, invalid UTF-8, deep nesting, directory, unreadable, symlink loop raise Fail with the load_format text · PASS
- **Given** 6 broken configs **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** Invalid JSON, invalid UTF-8, deep nesting, directory, unreadable, symlink loop raise Fail with the load_format text
- **Expected** Invalid JSON, invalid UTF-8, deep nesting, directory, unreadable, symlink loop raise Fail with the load_format text **Actual** as expected
- **Spec source:** plan: config errors keep one message · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

#### TC-contract-22 · load_format results unchanged (property, 1000 runs, seed 20261010) · PASS
- **Given** arb.configShape **When** read_rules(repo, samples) runs with a gh shim on PATH (or no gh) **Then** load_format results unchanged (property, 1000 runs, seed 20261010)
- **Expected** load_format results unchanged (property, 1000 runs, seed 20261010) **Actual** as expected
- **Spec source:** plan: load_format results unchanged · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-013> node --test .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (property-run): property load_format: seed=20261010 runs=1000 violations=0
- Evidence (log): [run output](../../slices/S-013/verification/r0/logs/contract-0-run.txt)

</details>

## How it was attacked
One security session ran in round 0 at commit fe02f01. The charter came from the threat model in spec section 3. The samples, the `gh` output and the repo config are untrusted input. `gh` and the test host are trusted. The session tried 14 attacks: 10 held, none broke the boundary, and 4 were out of scope (dot-only samples, odd rule field types, raw stderr, quadratic dedupe). Each out-of-scope result is a seed below.

<details>
<summary>Attack table (14 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| ATK-1 | corpus values as samples | one call, argv [api, path], one segment | held except dot-only | held |
| ATK-2 | samples . and .. | encoded path | path ends in branches/.. unencoded; urllib.parse.quote leaves dots; the spec requires that call | out-of-scope |
| ATK-3 | 12 hostile samples | encoded, no marker file | all encoded, marker absent | held |
| ATK-4 | a<NUL>b | encoded | a%00b | held |
| ATK-5 | 2nd call exit 1 | no rules, one note | no rules, one note, 2 calls | held |
| ATK-6 | 12 stdout shapes | note or rules, no raise | no raise | held |
| ATK-7 | non-string pattern and kind | judge copes | judge raises TypeError on 4 rules | out-of-scope |
| ATK-8 | ANSI, CR LF, 1 MB | one clean note | one note; control characters and 1 MB kept | out-of-scope |
| ATK-9 | GH_TOKEN env and token in stderr | no token from env | env token absent; stderr echoed as the spec says | held |
| ATK-10 | stall | one note after timeout | 1038 ms with timeout 1 | held |
| ATK-11 | planted ./gh | not run | not run | held |
| ATK-12 | 12 forge forms | no call | no call | held |
| ATK-13 | normal run | cwd=repo, no writes | as expected | held |
| ATK-14 | 20000 rules | bounded | 6159 ms, quadratic dedupe | out-of-scope |

Full log: [security-0-attacks.jsonl](../../slices/S-013/verification/r0/logs/security-0-attacks.jsonl)

</details>

## Defects found on the way
- **Blocking defects:** none. Verification, regression, the Gate, the architecture review and the security review all returned no blocking finding in round 0.
- **Seeds:** open seeds only. 18 were recorded; the table merges duplicates.

| Seed | Found by | File |
|---|---|---|
| Non-string pattern or kind from the API can crash `judge` | security review, security verifier (ATK-7) | skills/sdlc/branches.py |
| Dot-only samples are not encoded in the API path | security review, security verifier (ATK-2) | skills/sdlc/branches.py |
| `unchecked` covers two cases | architecture review | skills/sdlc/branches.py |
| No committed test for the gh timeout path | spec-fidelity verifier | skills/sdlc/test/branches.test.mjs |
| `ghShim` duplicates the stub-server testkit | architecture review | skills/sdlc/test/branches.test.mjs |
| Non-dict list items and empty sample list not pinned by a committed test | spec-fidelity verifier | skills/sdlc/test/branches.test.mjs |
| Empty `parameters.name` falls back to the ruleset label | spec-fidelity verifier, contract verifier | skills/sdlc/branches.py |
| 60 second timeout per sample is a plan choice | contract verifier | skills/sdlc/branches.py |
| `read_rules` takes samples; the spec names `read_rules(repo)` | contract verifier | skills/sdlc/branches.py |
| Rule union dedupe is quadratic | contract and security verifiers (ATK-14) | skills/sdlc/branches.py |
| Duplicate sample names overwrite `by_sample` | contract verifier (TC-contract-9) | skills/sdlc/branches.py |
| Non-bool `negate` becomes true through `bool()` | contract verifier (TC-contract-6) | skills/sdlc/branches.py |
| Failure note keeps raw stderr, any length | contract and security verifiers (ATK-8) | skills/sdlc/branches.py |
| Timeout note shows the argv text | contract verifier | skills/sdlc/branches.py |

## Appendix
- Verification toolkit: `skills/sdlc/test/testkit/stub-server.mjs` (added in round 0), `skills/sdlc/test/testkit/property.mjs`, `skills/sdlc/test/testkit/cli-runner.mjs`, `skills/sdlc/test/testkit/attack-corpus.mjs`.
- Plan: [plan-r0.md](../../slices/S-013/verification/plan-r0.md) and [plan-r0.json](../../slices/S-013/verification/plan-r0.json).
- Round 0 evidence: [contract-0.md](../../slices/S-013/verification/r0/contract-0.md), [contract-0.json](../../slices/S-013/verification/r0/contract-0.json), [security-0.md](../../slices/S-013/verification/r0/security-0.md), [security-0.json](../../slices/S-013/verification/r0/security-0.json).
- Core verifiers: [verify-spec-fidelity-r0.md](../../slices/S-013/verify-spec-fidelity-r0.md), [verify-regression-r0.md](../../slices/S-013/verify-regression-r0.md), [gate-r0.md](../../slices/S-013/gate-r0.md).
- Reviews: [review-architecture-r0.md](../../slices/S-013/review-architecture-r0.md), [review-security-r0.md](../../slices/S-013/review-security-r0.md).
- Missing sources: `failures.md` does not exist for this slice, because nothing failed.
