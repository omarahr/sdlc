# Judge report: SC-M-1-078 (voter 1)

Verdict: refuted. Class: test-bug.

I ran preflight in a scratch repo. Equals-form values `-x` and `a b` fail with rule `git check-ref-format`, exit 1, one JSON object. The separate value `-x` exits 2 with one error object. No secret leaks. No git usage text appears.

R-037, R-040 and R-043 require a working sample that is judged as given and fails with `git check-ref-format`. They do not require one mention of the name per output. They do not require a sample for an empty value. Git accepts `@` in `check-ref-format --branch`, so the sample is valid.
The argparse exit 2 for a separate option-like value is the designed behavior. S-015 security tests assert it.
The scenario asserts more than the spec says.
