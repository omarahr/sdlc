# Judge report SC-M-1-077 voter 0

- Verdict: refuted, test-bug.
- R-008 says: "An explicit ts part is used as given."
- The spec does not say that a 13-digit ts is refused.
- Repro: branches.tail("state", ts="2026123123595") returns state-2026123123595. This agrees with R-008.
- The CLI has no --ts flag. The scenario step cannot run through the CLI.
- UTC digits and 14-digit ts values passed in the runner result.
- The scenario expectation "the 13-digit ts exits 2" has no source in the spec.
