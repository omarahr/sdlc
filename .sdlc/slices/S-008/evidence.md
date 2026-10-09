# S-008 evidence

This slice pins the parse precedence rows.

## Requirements
- R-070: skills/sdlc/test/branches.test.mjs :: T-R-070a
- R-102: skills/sdlc/test/branches.test.mjs :: T-R-102a, skills/sdlc/test/branches.test.mjs :: T-R-102b
- R-103: skills/sdlc/test/branches.test.mjs :: T-R-103a
- R-104: skills/sdlc/test/branches.test.mjs :: T-R-104a
- R-105: skills/sdlc/test/branches.test.mjs :: T-R-105a, skills/sdlc/test/branches.test.mjs :: T-R-105b, skills/sdlc/test/branches.test.mjs :: T-R-105c

## Verifier cases (round 1, all pass)
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:22
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:39
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:49
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:58
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:65
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:79
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:107
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:23
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:34
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:41
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:57
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:66
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:72
- .sdlc/slices/S-008/verification/r1/tests/cli-0/parse-fix.verify-cli.test.mjs:86

The fix in round 1 lifts the int string limit so a long run number gives one JSON object (T-R-102b). This slice is a spec slice, so no benchmark applies.
