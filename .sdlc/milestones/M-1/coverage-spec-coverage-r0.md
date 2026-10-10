# Coverage report: spec-coverage, revision 0

The plan has gaps. No scenario cites these requirements: R-020, R-026, R-044 and R-059.

## Missing scenarios

1. R-020, spec §2 `split(fmt)`. Run `split` on `a/{name}.x` and `a/{name:lower}`. Expect `("a/", ".x", false)` and `("a/", "", true)`.
2. R-026, spec §3 rule shape. Read rules from a github shim and a gitlab shim. Expect exactly the keys source, kind, pattern, negate, label. Expect `kind` in the four values.
3. R-044, spec §4 output shape. Run preflight on an ok, a not-ok and a bad-input case. Expect the listed output keys, exit codes 0, 1 and 2, and the first failing rule's label.
4. R-059, spec §7. Run `state-write.py` with a custom `branchFormat`. Expect one derivation of `fmt` in `main()`, with `load_format` as fallback, passed to the branch helpers.

R-032 is covered by SC-M-1-025. The planner adds R-032 to that scenario's requirement list.
