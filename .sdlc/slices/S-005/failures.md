# S-005 failures

## Fix round 1

- [review] T-R-119 misses variable-built and multi-line verify pushes; promote verifier TC-cli-10: The committed scan checks each push line alone. The cli-0 verifier proved that a push of a verify name built on an earlier line passes T-R-119, and a git(repo, "push", ...) call split over two lines passes it too (TC-cli-11, logs/cli-0-TC-cli-11.txt). .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs TC-cli-10 (line 256) catches all three mutants. It joins lines and pins the exact set of push sites. Fix: promote that approach into T-R-119. Join continuation lines and pin the exact list of push and create sites. Use repo-relative imports, not absolute worktree paths. Record the promotion in tests.md. (skills/sdlc/test/branches.test.mjs)

Fix: T-R-119 now joins continuation lines before the scan. It pins the exact list of push and create sites in the skill scripts. All three TC-cli-11 mutants now fail T-R-119.

## Fix round 2

- [spec-fidelity] ok: no defects. Report: .sdlc/slices/S-005/verify-spec-fidelity-r1.md.
- [profiles] REFUTED. [cli] TC-cli-15: nine push and create forms still pass T-R-119. The forms are a single-quoted git(repo, 'push', ...), git(root, "push", ...), ["git", "-C", repo, "push", ...], os.system and shell=True strings "git -C x push", execFileSync and spawnSync in sdlc-loop.js, ["gh", "pr", "--repo", slug, "create", ...], and a rewrite of the excluded text "git push --delete <branch>". Test: .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs.
- [profiles] REFUTED. [security] TC-security-16: a verify push in the ["git", "-C", repo, "push", ...] form passes T-R-119. TC-security-17: a "git -C {repo} push" shell string passes. TC-security-18: a verify push in tracker/collect.py passes, because T-R-119 reads only sdlc-loop.js and the top-level *.py files. Test: .sdlc/slices/S-005/verification/r1/tests/security-0/guard.verify-security.test.mjs.
- [regression] ok: no defects. Report: .sdlc/slices/S-005/verify-regression-r1.md.

Fix: T-R-119 now walks every script under skills/sdlc, tracker included. It skips test, fixtures, prompts, __pycache__ and node_modules. It finds each line with a quoted push token, a "git ... push" text, a quoted gh or glab token, a "gh pr" or "glab mr" text, or a pr or mr word before a create word. It pins the exact list of these lines, with the exclusion filter removed. It also checks each site and the next two lines for a verify name. All 16 cli-0 tests pass. The security-0 tests for TC-security-16, 17 and 18 pass. The security-0 blind-spot test records seeds and now fails, because T-R-119 catches seven of its nine forms. A-11 (a push verb built at run time) and A-16 (the run variable bound to a verify name) still pass T-R-119. They remain seeds.

## Escalation step 1 (replan)

### Why

Three fix rounds ended and no fix passed. The spec-fidelity and regression lenses held at commit 3780ee1 in round 2. The cli and security profiles refuted T-R-119 again.

### Attempts made

- Plan round 1 adds the `verify` and `attempt` rows to `TAILS` in `skills/sdlc/branches.py`. Those rows hold: R-008, R-009 and R-010 pass their acceptance commands and their tests.
- T-R-119 is a text scan for git pushes and pull-request creation that name a verify branch.
- Fix round 1 joins continuation lines and pins the exact list of push and create sites.
- Fix round 2 walks every script under `skills/sdlc`, tracker included. It widens the token patterns and pins each matching line.
- Each round closes the reported mutants. Each next round finds new literal forms that the patterns miss.

### Failing evidence

- Round 2, cli profile, TC-cli-17: six literal push and pull-request forms of a verify branch pass T-R-119. File: `.sdlc/slices/S-005/verification/r2/cli-0.md`.
- N1 puts a quoted path between `git` and `push`. N2 builds the command by string concatenation. N3 puts more than 80 characters between `git` and `push`.
- N4 splits a `shell=True` string over two lines. N5 opens a pull request through `gh api .../pulls`. N6 uses `execSync` with concatenation in `sdlc-loop.js`.
- The cause: the pattern `\bgit\b[^"'\n]{0,80}?\bpush\b` stops at a quote, a newline or 80 characters. No pattern matches `gh api`.
- Round 2, security profile: TC-security-22, 23 and 24 fail with the same quote-stop cause. File: `.sdlc/slices/S-005/verification/r2/security-0.md`.
- Product code holds the guarantee today. The defect is in the test, not in the product.

### Lesson for the re-plan

- A regex scan for every push form is an open-ended race. Each fix round closes old mutants, and the verifiers find new ones.
- Do not widen the regex again. Choose a check whose coverage does not depend on the spelling of a push call.
- One option: pin the exact set of lines in the skill scripts that name `git`, `gh` or `glab` at all. Any new process call then changes the pinned set and fails the test.
- Another option: a behavior test. Run the loop's verify helpers against a local bare remote and a fake `gh`, then assert that no verify ref reaches the remote and no pull request call names one.
- Record in the plan which push forms the check covers and which forms stay seeds. Agree that scope with the verifiers through the plan, before the tests.

## Fix round 1 (after the re-plan)

- [spec-fidelity] ok: verdict HELD at commit 9e1e71b. Report: .sdlc/slices/S-005/verify-spec-fidelity-r0.md.
- [profiles] REFUTED. [cli] (part 0) ok: 13 cases pass. [contract] ok: 18 cases pass.
- [profiles] REFUTED. [cli#1] TC-cli-40: a process module bound to another name hides a push (sp = subprocess, a default parameter, a walrus, [subprocess][0], o = os).
- [profiles] REFUTED. [cli#1] TC-cli-41: posix.system and posix.posix_spawnp are not seen.
- [profiles] REFUTED. [cli#1] TC-cli-42: a '# coding: unicode_escape' cookie hides a push behind a comment.
- [profiles] REFUTED. [cli#1] TC-cli-43: u = urllib.request in collect.py and import _socket in janitor.py are not reported.
- [profiles] REFUTED. [cli#1] TC-cli-44: globalThis, Function and eval pass the jsHits scan.
- [profiles] [security] the session stopped before any case ran. VS-2, VS-4, VS-6, VS-8, VS-9, VS-10 and VS-11 have no coverage from this profile. No product change can address this item. The security profile must run again.
- [regression] ok: 533 tests, 532 pass, 1 skipped. Report: .sdlc/slices/S-005/verify-regression-r0.md.
- Tests: .sdlc/slices/S-005/verification/r0/tests/cli-1/push-guard.verify-cli.test.mjs (TC-cli-40 to TC-cli-44).

Fix: push_guard.py now reports these forms.
- A bare process or network module name used as a value is a dynamic site. This covers a rebind, a default parameter, a walrus and a list element. A network module path such as urllib.request used as a value is a dynamic site too.
- An import of posix, nt, runpy, code, codeop, or any module whose name starts with "_" (except __future__) is a dynamic site. Calls to posix.*, nt.*, _posixsubprocess.* and _winapi.* are process sites. Calls to _socket.* and _ssl.* are network sites.
- The scanner reads each Python file as bytes and detects the source encoding. A file with an encoding other than UTF-8 is opaque ("parse encoding <name>"). The scanner parses the bytes, so it reads the same program that Python runs.
- The scanner decodes \uXXXX and \u{...} escapes in sdlc-loop.js before the ban match.
- T-R-119e holds the 13 TC-cli-40 to TC-cli-44 forms as mutants. Each mutant fails the old scanner and breaks a pin with the new scanner.
- The old security-0 test file (from the earlier plan) still fails its VS-8 case. It fails the same way on commit 9e1e71b. It tests the removed regex T-R-119, so it is not evidence for this plan.

## Fix round 2 (after the re-plan)

- [spec-fidelity] ok: verdict HELD at commit 112b45b. Report: .sdlc/slices/S-005/verify-spec-fidelity-r1.md. No defects.
- [profiles] REFUTED. [cli] TC-cli-55: a capitalized process API used as a value hides a push (P = subprocess.Popen, a Popen subclass, a Popen default parameter, [subprocess.Popen][0]). check_value skips a last name that starts with a capital letter.
- [profiles] REFUTED. [cli] TC-cli-56: globals()["subprocess"].run and globals().get("os").system are not seen. The globals() check sees only a direct subscript call.
- [profiles] REFUTED. [cli] TC-cli-57: e = exec, i = __import__ and a default ev=eval are not seen.
- [profiles] REFUTED. [cli] TC-cli-58: pydoc.pipepager, pydoc.tempfilepager and logging.handlers.HTTPHandler are not seen.
- [profiles] REFUTED. [security] TC-security-1 to 3: an option with a separate value before the git verb (--work-tree fetch push) hides the push verb.
- [profiles] REFUTED. [security] TC-security-4: gh pr --milestone list create reads as the pinned pr list.
- [profiles] REFUTED. [security] TC-security-5 to 8: pydoc.pipepager, logging.handlers.HTTPHandler, uuid._get_command_stdout and xml.dom.minidom.parse are not seen.
- [profiles] REFUTED. [security] TC-security-15: os.walk does not follow a symlinked directory, so a push under it is not seen.
- [security#1] ok: VS-10 holds in 6 cases.
- [regression] ok: 533 tests, 532 pass, 1 skipped. Report: .sdlc/slices/S-005/verify-regression-r1.md.
- Tests: .sdlc/slices/S-005/verification/r1/tests/cli-0/push-guard.verify-cli.test.mjs (TC-cli-55 to 58) and .sdlc/slices/S-005/verification/r1/tests/security-0/push-guard.verify-security.test.mjs (TC-security-1 to 8 and 15).

Fix: push_guard.py now reports these forms.
- A new `imports` key lists every import of a module outside a pinned pure list. T-R-119a pins it. A new import of pydoc, logging.handlers, uuid, xml or a symlinked package changes the pin.
- A process or network name used as a value is reported whatever its case. Only all-caps constants and Error, Exception, Expired and Warning classes are skipped. A capitalized network class value goes to `network`, every other value goes to `dynamic`.
- Any reference to globals, locals or __builtins__, a vars() call with no argument, and eval, exec, compile, __import__ or breakpoint used as a value are dynamic.
- A private attribute (a name that starts with "_") of an imported module is dynamic.
- An attribute chain from an imported module through a watched module, such as shutil.os.system or branches.subprocess.run, is read as the watched module call.
- A git option before the verb other than -C, -c and five flag options makes the call opaque.
- A gh or glab option before the verb other than -R or --repo makes the call opaque. For `api`, the known api options are allowed. The forge words are checked in every positional, not only the path.
- A symlink under the scanned tree is opaque.
- The urllib.parse import is pure, so the tracker/hub.py network pin keeps it and the imports pin does not list it.
- T-R-119e holds the TC-cli-55 to 58 and TC-security-1 to 4, 7, 8 and 15 forms as mutants, and three S3 re-export forms.
- The seed probe in r1/tests/security-1 ("a list item with a space shifts the forge parse") now fails, because the pulls word in any positional is a violation. That probe recorded a seed, so it is not a requirement.

## Escalation step 2 (split)

### Why

Three fix rounds after the re-plan ended, and the loop counted no passed fix. In round 2 the spec-fidelity lens held at commit 9e1b1e8. Report: `.sdlc/slices/S-005/verify-spec-fidelity-r2.md`. The command `node --test skills/sdlc/test/branches.test.mjs skills/sdlc/test/push-guard.test.mjs` gave 38 tests, 38 pass, 0 fail. The R-008, R-009 and R-010 acceptance commands printed the expected names, with exit 0.

### Attempts made

- Attempt 1 (archived as `sdlc/S-005-attempt-1`): a regex text scan for push calls (T-R-119). Three fix rounds each closed the reported spellings, and the verifiers found new ones.
- Attempt 2, re-plan revision 3 (archived as `sdlc/S-005-attempt-2`): the two `TAILS` rows in `skills/sdlc/branches.py`, and an `ast` scanner `skills/sdlc/test/push_guard.py` with `skills/sdlc/test/push-guard.test.mjs` (T-R-119a to T-R-119e2).
- Fix round 1 added module rebinds, native process modules, foreign source encodings and escaped loop identifiers to the scanner.
- Fix round 2 added the imports pin, capitalized process values, reflection, private module names, options before a verb and symlinks.
- The product change held in every round. R-008, R-009 and R-010 passed spec-fidelity, cli and contract in rounds 0, 1 and 2.

### Failing evidence

- Round 2 ledger row: `refuted`, 1 refutation, 0 failing tests.
- Round 2 cli profile at 9e1b1e8 held: all 17 cases pass. File: `.sdlc/slices/S-005/verification/r2/cli-0.md`.
- Round 2 regression held: 533 tests, 532 pass, 1 skipped. Spec-fidelity held.
- The only refuted report in round 2 is `.sdlc/slices/S-005/verification/r2/security-0.md`. It names commit 3780ee1 and the removed regex T-R-119. Commit 321b8aa (escalation step 1) carried it over from attempt 1. No security run of round 2 replaced it.
- So the round 2 refutation is stale evidence from attempt 1, not a defect of commit 9e1b1e8. The security profile has no valid round 2 result for the new scanner.
- No `verification/plan-r2.json` exists. The profiles of the re-plan ran from the stale `plan-r1.json` of attempt 1.
- Open seeds at 9e1b1e8 (cli r2): S3 re-exported modules, S1 a second def with a pinned name, S3 a JS constructor walk, S5 excluded or symlinked directories, and `hooks/hooks.json` commands.

### Split

- The tails rows and the push guard fail for different reasons, and only the guard keeps the slice open. Split them so the proven tails can ship.
- S-005a "tails: state, verify, attempt": R-008, R-009, R-010. Depends on S-004. Reuse the `TAILS` rows and the `branches.test.mjs` cases from `sdlc/S-005-attempt-2`.
- S-005b "verify branches stay local: the push guard": R-119. Depends on S-005a. Start from `push_guard.py` and `push-guard.test.mjs` on `sdlc/S-005-attempt-2`. Write a fresh `verification/plan-r0.json`, and remove the stale `verification/r*` files of attempt 1 before round 0.
- R-093 goes to S-027, per ADR-20261009-053059-decision-judge-S-005-23a9 and ADR-20261009-062918-decision-judge-S-005-7fbd. The split applies that move: R-093 is now `todo` under S-027.
- S-006 and S-020 depended on S-005. They now depend on S-005a and S-005b.
