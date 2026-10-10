# S-017 · preflight edge cases and the forge shim suite
Verdict: RELEASED
Commit under test: 811aaac (code at da88101) · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 6 | 49 | 49 | 0 | 0 | 1 / 1 | 8 |

## Summary
This slice pins how `preflight` behaves in four edge cases. A regex rule that the default passes gives `ok`. Two rules, or a negated rule, give no derived format. A rule for other branches leaves the verdict `ok`. The seven shim scenarios run in one test.
Three profiles checked it at the public command line: cli, contract and security. The boundary was the `gh` and `glab` shims, with no network.
Round 0 found one blocking defect. A rule with a non-string pattern made `preflight` stop with a TypeError. The fix in round 1 treats such a rule as unevaluated.
Round 1 re-ran every case on the fixed code. All 49 cases pass. The full suite passes with 654 tests, 0 failures and 1 skipped.
Eight non-blocking seeds remain open. None blocks the release.

## Open risks
- `preflight` takes time quadratic in the rule count: 5000 rules took 1.5 s and 20000 rules took 18.9 s. The spec states no bound.
- A rule pattern goes whole into the output. A 20 MB pattern gave 41 MB of stdout. The spec states no limit.
- `gh` stderr goes whole into `notes`, with no limit and no redaction. A token-like string reached the JSON output.
- The suggestion line repeats rule text as shell syntax. Rule authors are repo admins, so the threat is low.
- `derive` treats an empty `starts_with` pattern as not derivable. The result is the same in practice.
- The `preflight` output holds the extra keys `args` and `command`. The spec example shows none. ADR on the shared echo covers this.
- The negate guard in `derive` is not needed for safety. The second verdict already rejects those formats.
- The non-string pattern guard sits in three places in `branches.py`. One helper could hold the kind list.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-091 | **The default already satisfies the rule** (a regex like `^[a-z]+/.+`): `ok` with the default, nothing derived. | VS-1 | 5: cli-1, cli-2, cli-3, cli-4, security-1 | pass |
| R-092 | **Several rules, or a negated one, and no format given**: no derivation; the verdict lists each failing sample with the rule, and the suggestion asks for a format. | VS-2 | 6: cli-5, cli-6, cli-7, cli-8, cli-9, security-2 | pass |
| R-100 | **A rule that targets only the default branch**: the GitHub endpoint returns no `branch_name_pattern` for the samples; `ok`. | VS-3, VS-5, VS-6 | 22: cli-10, cli-11, cli-12, cli-16, cli-17, cli-18, cli-19, cli-20, cli-21, cli-22, cli-23, cli-24, cli-25, cli-26, cli-27, cli-28, cli-29, cli-30, cli-31, security-3, security-5, security-6 | pass |
| R-074 | `preflight` on a fixture repo with `gh` and `glab` shims on `PATH` (shell scripts printing canned JSON): no rules gives `ok` with the default; a `starts_with feature/` ruleset derives `feature/sdlc/{name}`; a regex that the default fails gives exit 1 with a suggestion; a regex the default passes gives `ok`; a shim that exits 1 gives `ok` with `rules unknown` in `notes` and `unchecked` samples; `--mode mr --branch bad-name` against a GitLab regex fails the `working` sample; an invalid `--format` exits 2. | VS-4, VS-5, VS-6 | 34: cli-13, cli-14, cli-15, cli-16, cli-17, cli-18, cli-19, cli-20, cli-21, cli-22, cli-23, cli-24, cli-25, cli-26, cli-27, cli-28, cli-29, cli-30, cli-31, contract-1, contract-2, contract-3, contract-4, contract-5, contract-6, contract-7, contract-8, contract-9, contract-10, contract-11, contract-12, security-4, security-5, security-6 | pass |

Slice tests in `skills/sdlc/test/branches.test.mjs`: R-091 `:2553`, `:2563`. R-092 `:2574`, `:2583`, `:2592`. R-100 `:2601`, `:2611`, `:2618`, `:2629`. R-074 `:2649`. All pass in the full suite.

## Scenarios

### VS-1 · One regex rule that the default satisfies gives ok and no derivation, through gh and glab
Profiles: cli, security. Risk: a wrong pass here hides a forge rule that rejects the push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | VS-1: one regex the default satisfies gives ok and no derivation (gh) | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:44` |
| TC-cli-2 | VS-1: same through glab | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:58` |
| TC-cli-3 | VS-1: near variants the default fails give exit 1 and no derived format | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:70` |
| TC-cli-4 | VS-1: given format is kept and a passing regex still gives ok | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:82` |
| TC-security-1 | Rule that the default satisfies gives ok and no derivation (gh and glab, 14 attacks) | PASS | `verification/r1/tests/security-0/preflight.verify-security.test.mjs:1` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-1 · VS-1: one regex the default satisfies gives ok and no derivation (gh) · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-091 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: one regex" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-2 · VS-1: same through glab · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-091 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: same through glab" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-3 · VS-1: near variants the default fails give exit 1 and no derived format · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-091 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: near variants" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-4 · VS-1: given format is kept and a passing regex still gives ok · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-091 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-1: given format" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-security-1 · Rule that the default satisfies gives ok and no derivation (gh and glab, 14 attacks) · PASS
- **Given** A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON **When** preflight runs with each of the 15 attacks: TC-sec-1-github, TC-sec-1-github-unanchored, TC-sec-1-github-inline-ignorecase-upper, TC-sec-1-github-case-sensitive-upper, TC-sec-1-github-nested-name, TC-sec-1-github-anchored-end-too-short, TC-sec-1-github-lookahead, TC-sec-1-glab, TC-sec-1-glab-unanchored, TC-sec-1-glab-inline-ignorecase-upper, TC-sec-1-glab-case-sensitive-upper, TC-sec-1-glab-nested-name, TC-sec-1-glab-anchored-end-too-short, TC-sec-1-glab-lookahead, TC-sec-1-calls **Then** Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- **Expected** every call is `api repos/{owner}/{repo}/rules/branches/<encoded name>`; slash is percent-encoded; exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample; exit 1 and a --branch-format suggestion, not a derived format; ok with the default, nothing derived **Actual** Re-run in round 1 on da88101: every attack in this scenario held. 
- **Spec source:** R-091 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-017/verification/r1/logs/security-0-attacks.jsonl)
- Evidence (log): [test run (51 pass, 0 fail)](../../slices/S-017/verification/r1/logs/security-0-run.txt)

</details>

### VS-2 · Two rules or a negated rule and no format give no derivation and a generic suggestion
Profiles: cli, security. Risk: a wrong pass here hides a forge rule that rejects the push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | VS-2: starts_with plus ends_with, no format: no derivation, generic suggestion | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:90` |
| TC-cli-6 | VS-2: negated contains, starts_with, ends_with, regex never derive | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:104` |
| TC-cli-7 | VS-2: three rules, and a given format, give no derivation | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:122` |
| TC-cli-8 | VS-2: one starts_with rule derives (control) | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:136` |
| TC-cli-9 | VS-2: rule label fallbacks name the failing rule | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:143` |
| TC-security-2 | Two, three or negated rules give no derivation and a generic suggestion | PASS | `verification/r1/tests/security-0/preflight.verify-security.test.mjs:106` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-5 · VS-2: starts_with plus ends_with, no format: no derivation, generic suggestion · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-092 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: starts_with plus" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-6 · VS-2: negated contains, starts_with, ends_with, regex never derive · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-092 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: negated" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-7 · VS-2: three rules, and a given format, give no derivation · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-092 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: three rules" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-8 · VS-2: one starts_with rule derives (control) · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-092 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: one starts_with" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-9 · VS-2: rule label fallbacks name the failing rule · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-092 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-2: rule label" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-security-2 · Two, three or negated rules give no derivation and a generic suggestion · PASS
- **Given** A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON **When** preflight runs with each of the 9 attacks: TC-sec-2-two, TC-sec-2-three, TC-sec-2-neg-starts_with, TC-sec-2-neg-ends_with, TC-sec-2-neg-contains, TC-sec-2-neg-regex, TC-sec-2-neg-passing, TC-sec-2-dup, TC-sec-2-hostile-derive **Then** Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- **Expected** a derived format only when the derived format passes the second verdict; derived false; derived never carries an invalid git ref; the run does not crash; exit 0, ok; exit 1, derived false, labelled failing samples, suggestion with --branch-format; exit 1, derived false, labels alpha or beta on each failing sample, --branch-format in suggestion **Actual** Re-run in round 1 on da88101: every attack in this scenario held. 
- **Spec source:** R-092 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-017/verification/r1/logs/security-0-attacks.jsonl)
- Evidence (log): [test run (51 pass, 0 fail)](../../slices/S-017/verification/r1/logs/security-0-run.txt)

</details>

### VS-3 · A rule that targets only other branches leaves rules empty and the verdict ok
Profiles: cli, security. Risk: a wrong pass here hides a forge rule that rejects the push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-10 | VS-3: rules of another type or an empty list leave rules empty and ok | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:152` |
| TC-cli-11 | VS-3: a rule for one sample name only fails only that sample | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:167` |
| TC-cli-12 | VS-3: mr mode on gitlab with no rule, and null body, give ok | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:185` |
| TC-security-3 | Rules of another type or none leave rules empty and the verdict ok | PASS | `verification/r1/tests/security-0/preflight.verify-security.test.mjs:155` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-10 · VS-3: rules of another type or an empty list leave rules empty and ok · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-3: rules of another" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-11 · VS-3: a rule for one sample name only fails only that sample · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-3: a rule for one" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-12 · VS-3: mr mode on gitlab with no rule, and null body, give ok · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-3: mr mode" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-security-3 · Rules of another type or none leave rules empty and the verdict ok · PASS
- **Given** A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON **When** preflight runs with each of the 5 attacks: TC-sec-3-othertype, TC-sec-3-typeconfusion, TC-sec-3-empty, TC-sec-3-glab-other, TC-sec-3-persample **Then** Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- **Expected** only the slice sample can fail; the others pass; rules empty, every sample pass (not unchecked), ok, derived false, exit 0; rules empty, ok; rules empty, pass on every sample; rules empty, pass, ok **Actual** Re-run in round 1 on da88101: every attack in this scenario held. 
- **Spec source:** R-100 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-017/verification/r1/logs/security-0-attacks.jsonl)
- Evidence (log): [test run (51 pass, 0 fail)](../../slices/S-017/verification/r1/logs/security-0-run.txt)

</details>

### VS-4 · The seven preflight shim scenarios hold in one run
Profiles: cli, security, contract. Risk: a wrong pass here hides a forge rule that rejects the push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-13 | VS-4: seven shim scenarios at the public boundary | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:195` |
| TC-cli-14 | VS-4: invalid input forms all exit 2 with one JSON error | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:238` |
| TC-cli-15 | VS-4: stdout is one JSON line for ok, fail and unchecked | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:260` |
| TC-contract-1 | Seven preflight scenarios hold through gh and glab shims | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:61` |
| TC-contract-2 | glab ok path, mr without branch, pr mode regex failure | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:140` |
| TC-contract-3 | Bad input exits 2 with one JSON error | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:153` |
| TC-contract-4 | Same input gives the same output and the repo stays unchanged | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:165` |
| TC-contract-5 | derive matches the spec table (property, seed 230190388, 1500 runs) | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:204` |
| TC-contract-6 | judge matches rule semantics (property, seed 2021877485, 1500 runs) | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:220` |
| TC-contract-7 | suggest carries --branch-format after a loop failure (property, seed 2310852601, 1200 runs) | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:241` |
| TC-contract-8 | CLI exit code equals ok across 60 random rule sets (seed 2390322430) | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:265` |
| TC-contract-9 | Consumer view from a scratch cwd | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:290` |
| TC-contract-10 | judge and derive accept a non-string pattern without an exception and never derive from it (fix round 1 change) | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:304` |
| TC-contract-11 | CLI with a non-string pattern in all four kinds, with and without a good rule: exit 0 or 1, no traceback, note cannot evaluate, no derived format | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:322` |
| TC-contract-12 | glab push rule with a non-string regex does not crash | PASS | `verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:342` |
| TC-security-4 | Seven shim scenarios and refused input at the public boundary | PASS | `verification/r1/tests/security-0/preflight.verify-security.test.mjs:193` |

<details>
<summary>Case detail (16 cases)</summary>

#### TC-cli-13 · VS-4: seven shim scenarios at the public boundary · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-4: seven" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-14 · VS-4: invalid input forms all exit 2 with one JSON error · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-4: invalid" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-15 · VS-4: stdout is one JSON line for ok, fail and unchecked · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-4: stdout" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-contract-1 · Seven preflight scenarios hold through gh and glab shims · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-2 · glab ok path, mr without branch, pr mode regex failure · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-3 · Bad input exits 2 with one JSON error · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-4 · Same input gives the same output and the repo stays unchanged · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-5 · derive matches the spec table (property, seed 230190388, 1500 runs) · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-6 · judge matches rule semantics (property, seed 2021877485, 1500 runs) · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-7 · suggest carries --branch-format after a loop failure (property, seed 2310852601, 1200 runs) · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-8 · CLI exit code equals ok across 60 random rule sets (seed 2390322430) · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (property-run): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-9 · Consumer view from a scratch cwd · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-10 · judge and derive accept a non-string pattern without an exception and never derive from it (fix round 1 change) · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-11 · CLI with a non-string pattern in all four kinds, with and without a good rule: exit 0 or 1, no traceback, note cannot evaluate, no derived format · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-contract-12 · glab push rule with a non-string regex does not crash · PASS
- **Given** A scratch repo and gh or glab shims, or the module called by path **When** The case runs at the preflight command boundary or through the module functions **Then** The outcome matches the spec text
- **Expected** Matches the spec **Actual** Matches the spec
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`
- Evidence (transcript): [run log](../../slices/S-017/verification/r1/logs/contract-0-run.txt)
- Evidence (log): [surface listing](../../slices/S-017/verification/r1/logs/contract-0-surface.txt)

#### TC-security-4 · Seven shim scenarios and refused input at the public boundary · PASS
- **Given** A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON **When** preflight runs with each of the 3 attacks: TC-sec-4-shape, TC-sec-4-format-corpus, TC-sec-4-branch-corpus **Then** Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- **Expected** every value gives one JSON object, exit 0, 1 or 2, no traceback, no tree change; a refusal (exit 2) leaves the verdict out and calls no forge tool; one JSON object, exit 0, 1 or 2, no traceback, no tree change; the key set is the same in every JSON result; exit codes 0, 0, 1, 0, 0, 1, 2 **Actual** Re-run in round 1 on da88101: every attack in this scenario held. 
- **Spec source:** R-074 acceptance · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-017/verification/r1/logs/security-0-attacks.jsonl)
- Evidence (log): [test run (51 pass, 0 fail)](../../slices/S-017/verification/r1/logs/security-0-run.txt)

</details>

### VS-5 · A broken forge answer never corrupts the verdict or touches the repo
Profiles: security, cli. Risk: a wrong pass here hides a forge rule that rejects the push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-16 | VS-5: malformed, non-list, huge bodies never corrupt the verdict | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:268` |
| TC-cli-17 | VS-5: glab broken answers | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:297` |
| TC-cli-18 | VS-5: hostile pattern and label text never crash or leak | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:318` |
| TC-cli-19 | VS-5: bad regex is unevaluated and never blocks; wrong-typed fields do not crash | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:335` |
| TC-cli-20 | VS-5: rules with odd operator or parameters give unevaluated, not a crash | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:358` |
| TC-cli-21 | VS-5: absent gh and absent glab are reported as unknown, not as a crash | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:375` |
| TC-cli-22 | VS-5: a hanging shim ends with unknown rules and leaves the repo alone | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:389` |
| TC-cli-23 | VS-5: running twice gives the same verdict and no repo change (idempotency) | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:399` |
| TC-cli-24 | VS-5: unicode and spaced repo path, and CI env, work | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:413` |
| TC-security-5 | Broken forge answers never corrupt the verdict or touch the repo | PASS | `verification/r1/tests/security-0/preflight.verify-security.test.mjs:251` |

<details>
<summary>Case detail (10 cases)</summary>

#### TC-cli-16 · VS-5: malformed, non-list, huge bodies never corrupt the verdict · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: malformed" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-17 · VS-5: glab broken answers · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: glab broken" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-18 · VS-5: hostile pattern and label text never crash or leak · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: hostile" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-19 · VS-5: bad regex is unevaluated and never blocks; wrong-typed fields do not crash · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: bad regex" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-20 · VS-5: rules with odd operator or parameters give unevaluated, not a crash · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: rules with odd" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-21 · VS-5: absent gh and absent glab are reported as unknown, not as a crash · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: absent" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-22 · VS-5: a hanging shim ends with unknown rules and leaves the repo alone · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: a hanging" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-23 · VS-5: running twice gives the same verdict and no repo change (idempotency) · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: running twice" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-24 · VS-5: unicode and spaced repo path, and CI env, work · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-074 and R-100 acceptance · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-5: unicode" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-security-5 · Broken forge answers never corrupt the verdict or touch the repo · PASS
- **Given** A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON **When** preflight runs with each of the 8 attacks: TC-sec-5-malformed, TC-sec-5-glab-malformed, TC-sec-5-huge, TC-sec-5-control, TC-sec-5-glab-control, TC-sec-5-exit-with-json, TC-sec-5-gh-missing, TC-sec-5-hang **Then** Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- **Expected** no crash within 30 s; ok; tree unchanged; no crash; one JSON object; a note starting rules unknown on github (or an empty-rule pass for a valid list); verdict never fail; tree unchanged; no crash; unknown or empty-rule pass; verdict never fail; ok, unchecked, a note naming the missing tool, no crash; ok, unchecked, a timeout note, within about 70 s, only one call, no child left running; one JSON line; no raw control byte; one JSON object on one line of stdout; no raw control byte in stdout; tree unchanged; treated as unknown, unchecked, ok; the printed rule is ignored **Actual** Re-run in round 1 on da88101: every attack in this scenario held. 
- **Spec source:** R-074 quote (forge shim exits 1 gives rules unknown, unchecked); spec Edge cases (gh or glab unavailable gives unchecked) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-017/verification/r1/logs/security-0-attacks.jsonl)
- Evidence (log): [test run (51 pass, 0 fail)](../../slices/S-017/verification/r1/logs/security-0-run.txt)

</details>

### VS-6 · A forge rule with a non-string pattern is reported as unevaluated and never crashes preflight
Profiles: cli, security. Risk: a wrong pass here hides a forge rule that rejects the push.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-25 | VS-6: every non-string pattern on every string operator is unevaluated on gh | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:431` |
| TC-cli-26 | VS-6: a missing pattern key is unevaluated too | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:449` |
| TC-cli-27 | VS-6: a bad rule mixed with a good rule, in both orders, never derives and never crashes | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:459` |
| TC-cli-28 | VS-6: a bad regex rule mixed with a passing regex rule | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:475` |
| TC-cli-29 | VS-6: a non-string pattern with a given format keeps the given format | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:487` |
| TC-cli-30 | VS-6: glab non-string branch_name_regex never crashes | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:495` |
| TC-cli-31 | VS-6: gh rule fields of odd types (ruleset_id, name, negate) do not crash | PASS | `verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:508` |
| TC-security-6 | A non-string rule pattern is unevaluated and never crashes preflight | PASS | `verification/r1/tests/security-0/preflight.verify-security.test.mjs:324` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-cli-25 · VS-6: every non-string pattern on every string operator is unevaluated on gh · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: every non-string" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-26 · VS-6: a missing pattern key is unevaluated too · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a missing" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-27 · VS-6: a bad rule mixed with a good rule, in both orders, never derives and never crashes · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a bad rule mixed" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-28 · VS-6: a bad regex rule mixed with a passing regex rule · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a bad regex rule" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-29 · VS-6: a non-string pattern with a given format keeps the given format · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: a non-string pattern with" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-30 · VS-6: glab non-string branch_name_regex never crashes · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: glab non-string" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-cli-31 · VS-6: gh rule fields of odd types (ruleset_id, name, negate) do not crash · PASS
- **Given** A scratch git repo with a gh or glab shim on PATH that prints canned JSON **When** Run the real branches.py preflight with the command line shown in the transcript log **Then** Exit code, JSON keys and the repo tree match the spec
- **Expected** As R-091, R-092, R-100 and R-074 acceptance state; no traceback; tree unchanged **Actual** All assertions held
- **Spec source:** R-100 acceptance; round 0 defect TC-cli-18 · **Run:** `VERIFY_ROOT=<worktree of sdlc/S-017-v1-cli-0> node --test --test-name-pattern="VS-6: gh rule fields" .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs`
- Evidence (transcript): [command lines, stdout, stderr and exit codes](../../slices/S-017/verification/r1/logs/cli-0-transcripts.txt)
- Evidence (file-tree, tree unchanged (treeUnchanged asserted in each case)):

  ```text
  treeUnchanged: true
  ```

#### TC-security-6 · A non-string rule pattern is unevaluated and never crashes preflight · PASS
- **Given** A gh rule of type branch_name_pattern with operator starts_with, ends_with, contains or regex and a pattern of int, float, null, list, object, true, false, empty list or an overflowing number; or a glab branch_name_regex of those types **When** preflight runs alone on each rule, next to a passing rule, next to a failing rule in both orders, and with odd operator, name, negate and parameters types **Then** exit 0 or 1 with one JSON object and no traceback; a cannot evaluate note; derived false and format unchanged; failing samples keep their rule label; a bad rule never hides a failing rule; repo tree unchanged
- **Expected** No TypeError, no derived format from such a rule, cannot evaluate note (R-074, R-100) **Actual** All 7 VS-6 attacks held on da88101. The same tests fail on 78833d2 (5 of 8 fail, with a traceback), so they detect the round 0 defect.
- **Spec source:** R-074 and R-100 acceptance (plan notes for VS-6) · **Run:** `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs`
- Evidence (attack, VS-6 attacks):

  ```text
  TC-sec-6-gh-matrix: held - starts_with/int:0 starts_with/float:0 starts_with/null:0 starts_with/list:0 starts_with/object:0 starts_with/true:0 starts_with/false:0 starts_with/em
TC-sec-6-gh-no-derive: held - int: format sdlc/{name} derived false sugg "" | float: format sdlc/{name} derived false sugg
  ```
- Evidence (log): [test run](../../slices/S-017/verification/r1/logs/security-0-run.txt)

</details>

## How it was attacked
One security session ran in round 1. Charter: hostile forge answers and hostile rule text at the `preflight` command line. Boundary: the `gh` and `glab` shims on `PATH`, a scratch repo, no network. The verifier tried 51 attacks. 49 held, 0 broke and 2 were out of scope. Both out-of-scope attacks became seeds. Round 0 tried 44 attacks.

<details>
<summary>Attack table (51 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| ^[a-z]+/.+ via github | exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| [a-z]+/.+ via github | ok with the default, nothing derived | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| (?i)^SDLC/ via github | ok with the default, nothing derived | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| ^SDLC/ via github | exit 1 and a --branch-format suggestion, not a derived format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"SDLC | held |
| ^[a-z]+/[a-z]+/.+ via github | exit 1 and a --branch-format suggestion, not a derived format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"a/a/ | held |
| ^[a-z]+/.{40,}$ via github | exit 1 and a --branch-format suggestion, not a derived format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<lit | held |
| ^(?=sdlc/).+ via github | ok with the default, nothing derived | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| ^[a-z]+/.+ via glab | exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| [a-z]+/.+ via glab | ok with the default, nothing derived | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| (?i)^SDLC/ via glab | ok with the default, nothing derived | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| ^SDLC/ via glab | exit 1 and a --branch-format suggestion, not a derived format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"SDLC | held |
| ^[a-z]+/[a-z]+/.+ via glab | exit 1 and a --branch-format suggestion, not a derived format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"a/a/ | held |
| ^[a-z]+/.{40,}$ via glab | exit 1 and a --branch-format suggestion, not a derived format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<lit | held |
| ^(?=sdlc/).+ via glab | ok with the default, nothing derived | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| one regex rule, three sample names | every call is `api repos/{owner}/{repo}/rules/branches/<encoded name>`; slash is percent-encoded | api repos/{owner}/{repo}/rules/branches/sdlc%2FS-001 ; api repos/{owner}/{repo}/rules/branches/sdlc%2Fstate-20 | held |
| starts_with feature/ (alpha) + ends_with -x (beta) | exit 1, derived false, labels alpha or beta on each failing sample, --branch-format in suggestion | exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<pre | held |
| three starts_with rules | derived false | exit 1; ok false; format sdlc/{name}; derived false; rules 3; results fail; suggestion "--branch-format \"<pre | held |
| starts_with negate true | exit 1, derived false, labelled failing samples, suggestion with --branch-format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<pre | held |
| ends_with negate true | exit 1, derived false, labelled failing samples, suggestion with --branch-format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail,pass; suggestion "--branch-format \ | held |
| contains negate true | exit 1, derived false, labelled failing samples, suggestion with --branch-format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<pre | held |
| regex negate true | exit 1, derived false, labelled failing samples, suggestion with --branch-format | exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<pre | held |
| not starts_with zzz/ | exit 0, ok | exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion "" | held |
| two equal starts_with feature/ rules | a derived format only when the derived format passes the second verdict | exit 0; ok true; format feature/sdlc/{name}; derived true; rules 1; results pass; suggestion "" | held |
| patterns with a second placeholder, "..", spaces, "@{", "~", a leading dash | derived never carries an invalid git ref; the run does not crash | "{name}" -> exit 1 derived false format sdlc/{name} / ".." -> exit 1 derived false format sdlc/{name} / "a b/" | held |
| pull_request, creation, required_status_checks objects | rules empty, every sample pass (not unchecked), ok, derived false, exit 0 | exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""; rules [] | held |
| commit_message_pattern regex ^zzz/, branch_name_pattern under a changed case, nested wrapper | rules empty, ok | exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion "" | held |
| [] | rules empty, pass on every sample | exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion "" | held |
| commit_message_regex only, empty branch_name_regex, number, list, null body | rules empty, pass, ok | {"commit_message_regex":"^zzz"} -> exit 0 rules 0 pass / {"branch_name_regex":""} -> exit 0 rules 0 pass / {"b | held |
| gh answers a failing rule for sdlc%2FS-001 and [] for the others | only the slice sample can fail; the others pass | exit 1; slice:fail,state:pass,e2e:pass | held |
| seven scenarios through gh and glab shims | the key set is the same in every JSON result; exit codes 0, 0, 1, 0, 0, 1, 2 | 1 none: exit 0 keys true / 2 derive: exit 0 keys true / 3 fail: exit 1 keys true / 4 pass: exit 0 keys true /  | held |
| injection,traversal,control-chars,flag-like-values,format-strings,unicode-whitespace,unicode-confusables,overs | every value gives one JSON object, exit 0, 1 or 2, no traceback, no tree change; a refusal (exit 2) leaves the | 95 values; injection/cmd-subst:2 injection/backticks:2 injection/semicolon:2 injection/pipe:2 injection/ampers | held |
| injection, traversal, control-chars, flag-like-values, unicode-whitespace | one JSON object, exit 0, 1 or 2, no traceback, no tree change | 59 values; injection/cmd-subst:1 injection/backticks:1 injection/semicolon:1 injection/pipe:1 injection/ampers | held |
| empty,open-brace,truncated-list,null,string,number,true,object,trailing-garbage,two-docs,bom,html,deep | no crash; one JSON object; a note starting rules unknown on github (or an empty-rule pass for a valid list); v | empty: exit 0 unknown true unchecked / open-brace: exit 0 unknown true unchecked / truncated-list: exit 0 unkn | held |
| empty, {, null, [], "x", 5, huge nesting | no crash; unknown or empty-rule pass; verdict never fail | empty: exit 0 notes ["rules unknown on gitlab: glab printed output that is not JSON"] / brace: exit 0 notes [" | held |
| 20 MB list of other-type objects; 20 MB single string rule pattern | no crash within 30 s; ok; tree unchanged | 31.6MB list: exit 0 1099ms rules 0; 20MB pattern: exit 1 514ms ok false out 41943715 bytes | held |
| ESC, CR, NUL, U+2028, bidi override in label and pattern | one JSON object on one line of stdout; no raw control byte in stdout; tree unchanged | exit 1; stdout lines 1; raw control in stdout false; suggestion "--branch-format \"<prefix>{name}<suffix>\" (e | held |
| ESC and newline in branch_name_regex | one JSON line; no raw control byte | exit 0; lines 1 | held |
| exit 3 with a failing rule on stdout | treated as unknown, unchecked, ok; the printed rule is ignored | exit 0; ok true; format sdlc/{name}; derived false; rules 0; results unchecked; suggestion ""; notes ["rules u | held |
| PATH holds python3 and git only | ok, unchecked, a note naming the missing tool, no crash | exit 0; notes ["rules unknown on github: [Errno 2] No such file or directory: 'gh'"] | held |
| stall; one call; limit is the 60 s FORGE_TIMEOUT | ok, unchecked, a timeout note, within about 70 s, only one call, no child left running | exit 0; 60149ms; calls 1; notes ["rules unknown on github: Command '['gh', 'api', 'repos/{owner}/{repo}/rules/ | held |
| 4 operators x 9 non-string values as the only rule | exit 0 or 1, one JSON object, no traceback, cannot-evaluate note, derived false, tree unchanged | starts_with/int:0 starts_with/float:0 starts_with/null:0 starts_with/list:0 starts_with/object:0 starts_with/t | held |
| starts_with 5, null, list, object | format stays sdlc/{name}; derived false; suggestion has no repr of the value as a format | int: format sdlc/{name} derived false sugg "" / float: format sdlc/{name} derived false sugg "" / null: format | held |
| bad (each non-string, each op) + good starts_with "sdlc/"; bad + failing regex ^zzz/ | exit 0 with the good rule alone; with the failing rule exit 1, and the bad rule never hides the failure | starts_with/int:0/1/1 starts_with/float:0/1/1 starts_with/null:0/1/1 starts_with/list:0/1/1 starts_with/object | held |
| bad regex pattern 5 + failing starts_with "feature/" labelled alpha | every failing sample names alpha | exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<pre | held |
| branch_name_regex as 5, null, list, object, true, false | never a traceback; exit 0 or 1; no derived format; tree unchanged | int: exit 0 rules 0 notes [] / float: exit 0 rules 0 notes [] / null: exit 0 rules 0 notes [] / list: exit 0 r | held |
| branch_name_regex string plus commit_message_regex 5; regex list-wrapped | no traceback; string regex still judged | exit 1 ok false; list body exit 0 | held |
| operator non-string, name non-string, negate string, parameters list, parameters null, type non-string | no traceback; one JSON object | op-int:0 op-list:0 name-int:0 name-null:0 negate-str:0 negate-list:0 params-list:0 params-null:0 params-str:0  | held |
| lone surrogate escape, very long regex, invalid regex, regex with NUL | one JSON object, no traceback | starts_with/surrogate:1 ends_with/surrogate:1 contains/surrogate:1 regex/surrogate:1 starts_with/invalid-re:0  | held |
| starts_with pattern `x" ; touch PWN #` | suggestion is a safe literal or a refusal | suggestion carries rule text as shell syntax / "--branch-format \"x\" ; touch PWN #sdlc/{name}\""; derived fal | out-of-scope |
| stderr holds a token-like string and 200 KB of text | secret-looking text and unbounded text do not reach the verdict | stderr copied into notes without a limit or redaction / notes bytes 200068; has token true | out-of-scope |
| pattern (a*)*b-style against sample names | finishes quickly | 643ms exit 1 | held |

</details>

## Defects found on the way
- **Blocking defects**
  - A rule with a non-string pattern stopped `preflight` with a TypeError. Found by the cli verifier in round 0 (TC-cli-18) and by the security verifier. Spec source: section 3 ("cannot evaluate", never blocks) and section 4, output and exit codes. Reproduce: a `gh` shim returns one `branch_name_pattern` rule with `parameters.pattern` set to `5`, then run `preflight --mode pr`. Fixed in commit da88101 in `regex_error`, `_raw_result` and `judge`. Guarded by T-R-100d (`skills/sdlc/test/branches.test.mjs:2629`) and by TC-cli-25 to TC-cli-31, TC-contract-10 to TC-contract-12 and TC-security-6.

- **Seeds** (open only)

| Seed | Found by | File |
|---|---|---|
| Preflight is quadratic in the number of forge rules | cli verifier, round 0 | `skills/sdlc/branches.py` |
| Derive treats an empty pattern as not derivable | contract verifier | `skills/sdlc/branches.py` |
| Preflight output holds the extra keys args and command | contract verifier | `skills/sdlc/branches.py` |
| The suggestion repeats rule text as shell syntax | security verifier | `skills/sdlc/branches.py` |
| Gh stderr goes whole into notes | security verifier | `skills/sdlc/branches.py` |
| A rule pattern is echoed whole into the output | security verifier | `skills/sdlc/branches.py` |
| The negate guard in derive is not needed for safety | security verifier | `skills/sdlc/branches.py` |
| The non-string pattern guard is repeated in three places | implementer | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: cli-runner (`skills/sdlc/test/testkit/cli-runner.mjs`), property (`skills/sdlc/test/testkit/property.mjs`), attack-corpus, and the `gh` and `glab` shims in `skills/sdlc/test/branches.test.mjs`.
- Plans: [round 0](../../slices/S-017/verification/plan-r0.md), [round 1](../../slices/S-017/verification/plan-r1.md).
- Profile evidence, round 0: [cli](../../slices/S-017/verification/r0/cli-0.md), [contract](../../slices/S-017/verification/r0/contract-0.md), [security](../../slices/S-017/verification/r0/security-0.md).
- Profile evidence, round 1: [cli](../../slices/S-017/verification/r1/cli-0.md), [contract](../../slices/S-017/verification/r1/contract-0.md), [security](../../slices/S-017/verification/r1/security-0.md).
- Core verifiers: [spec fidelity r0](../../slices/S-017/verify-spec-fidelity-r0.md), [spec fidelity r1](../../slices/S-017/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-017/verify-regression-r0.md), [regression r1](../../slices/S-017/verify-regression-r1.md), [security review r1](../../slices/S-017/review-security-r1.md), [gate r0](../../slices/S-017/gate-r0.md).
- Missing sources: none. No `evidence.md` exists for this slice.
