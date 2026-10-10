# Architecture review, S-032, round 0

The slice adds five tests and no product code. The tests duplicate existing coverage.

- T-R-039a pins the exact kind list for `pr`: slice, state, e2e. T-R-136a, T-R-137a (pr half) and T-R-137b (pr half) repeat it.
- T-R-039b pins the exact kind list for `stack`. T-R-136a, T-R-137a and T-R-137b (stack halves) repeat it.
- T-R-039c and T-R-040a/T-R-040c pin `mr` and `direct`, with and without `--branch`. T-R-136b repeats them.
- T-R-137c repeats the exact-list checks above. A list with only known kinds cannot hold `e2e-area`, `verify` or `attempt`.

Blocking: delete the five tests, or reduce them to the one assertion no existing test makes. Record the result in tests.md.
