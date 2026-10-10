# Judge report: SC-M-1-007, voter 0

Verdict: refuted. Classification: spec-gap.

- R-016 lists three default cases: missing key, empty value, absent file. Invalid JSON is not one of them.
- The spec says commands exit 2 with an error JSON on bad input (section 2). No ADR covers invalid JSON.
- I reproduced the runner's result three times. A scratch repo with config.json holding `{bad` gave exit 2 with "is not valid JSON" each time.
- The scenario expectation (default on invalid JSON) goes beyond the spec text.
- Proposal P-20261010-M1-SC007 is already in SPEC-PROPOSALS.md with Source: behavior-campaign.
