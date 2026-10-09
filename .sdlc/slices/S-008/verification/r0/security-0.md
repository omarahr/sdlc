# verify-security S-008 r0 part 0

Slice: S-008. Profile: security. Round: 0. Commit: 3ce4bff. Verdict: pass (no in-scope break).

Environment: Python 3.14.7, Node test runner, scratch git repo from cli-runner; no network.

Charter: explore parse rows 1 to 4 with hostile tails to find a tail that gains a kind that a clean tail would not get. Source: spec section 2 table and R-102 to R-105.

Threat model: branch names come from the local repository and from forge pull request heads. The spec treats them as untrusted text. It states no limit on length.

## Case TC-security-1 (VS-7)
Given the three formats. When the corpus, newline tails, unicode digits and flag-like values go to parse and the CLI. Then no state changes and the rows classify as the spec regexes say. Result: pass.

Test: `.sdlc/slices/S-008/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs:8`. Command: `BRANCHES_PY=<repo>/skills/sdlc/branches.py node --test .sdlc/slices/S-008/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`.

## Attacks

- A-1 (out-of-scope): Explore parse with the trailing-newline family to find a hostile tail that gains a kind a clean tail would not get (spec §2 rows 1 to 4 anchors). Input: `sdlc/run-3\n, sdlc/M-2\n, sdlc/M-2-e2e\n`. Observed: kind run n 3, milestone M-2, e2e M-2. Python $ matches before a final newline; tail keeps the newline. sdlc/M-2-e2e\n\n gives null. The regex text is the spec's own, so the guarantee is met as written. A git branch cannot hold a newline (check-ref-format).
- A-2 (out-of-scope): Explore parse with unicode digits to find a run or milestone id that differs from the ASCII form. Input: `sdlc/run-٣, sdlc/run-３, sdlc/M-２, sdlc/M-٢-e2e`. Observed: Python \d matches them: run n 3; milestone id M-２ keeps its spelling. Seed.
- A-3 (held): Explore parse with control characters and NUL to find a crash or a kind. Input: `sdlc/run-3\r, sdlc/run-\u0000, sdlc/run-3 + U+200B, sdlc/M-2-e2e-a\nb`. Observed: All null, no raise.
- A-4 (out-of-scope): Explore parse with the whole attack corpus (12 families) in 6 tail shapes under 3 formats to find a raise. Input: `2814 calls: run-, M-, M-2-e2e-, run-3, M-2, M-2e2e plus each corpus value`. Observed: 21 calls raise ValueError: Exceeds the limit (4300 digits) for integer string conversion, for run-<more than 4300 digits>. All other 2793 return or null.
- A-5 (out-of-scope): Explore the CLI with the huge-integer tail to find a crash that breaks the one-JSON-object output. Input: `branches.py parse --branch sdlc/run-<4400 nines>`. Observed: Python traceback ValueError on stderr, no JSON, exit 1. git check-ref-format accepts the name; a ref this long cannot be a loose ref file on common file systems.
- A-6 (held): Explore the CLI with flag-like and shell values to find option injection, command execution or a tree change. Input: `--help, -x, $(touch pwn), `touch pwn`, ;touch pwn, 'sdlc/run-3 --format x', also --branch=<value>`. Observed: --help and -x as separate argv give exit 2 JSON 'expected one argument'; the --branch= form parses them. The rest gives kind null. No file written, no ref change (treeUnchanged true).
- A-7 (out-of-scope): Explore row 4 with a slash inside the area to find a kind the spec forbids. Input: `sdlc/M-2-e2e-a/b`. Observed: kind e2e-area, id M-2, area a/b. Noted, not failed, per the ADR.
- A-8 (held): Explore the CLI with newline tails to confirm that the CLI and the function agree. Input: `--branch 'sdlc/run-3\n'`. Observed: CLI gives kind run n 3, the same as the function.

## Seeds

- parse raises ValueError for run-N or attempt-N with more than 4300 digits: int(value) in parse hits Python's int string limit. The CLI prints a traceback and no JSON, against spec section 2 'every command prints one JSON object'. next-action.py would crash if such a branch head existed. Guard the conversion or cap the digits. No requirement in R-102 to R-105 states it. (skills/sdlc/branches.py)
- Trailing newline accepted by $ in rows 1 to 4: parse('sdlc/{name}','sdlc/run-3\n') gives kind run. Use re.fullmatch or \Z to match the strict intent. Real branches cannot hold a newline, so impact is low. The spec gives the regex with $. (skills/sdlc/branches.py)
- Unicode digits accepted in run-N and M-N: Python \d matches Arabic-Indic and fullwidth digits, so run-٣ is n 3 and M-２ is a milestone with a non-ASCII id. Use [0-9] or re.ASCII. (skills/sdlc/branches.py)
- Slash in an e2e-area tail is classified as e2e-area: M-2-e2e-a/b gives area a/b. The ADR keeps this behavior. (skills/sdlc/branches.py)

Log: `.sdlc/slices/S-008/verification/r0/logs/security-0-run.txt`. The corpus test fails by design: it pins seed 1.
