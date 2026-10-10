# Review security S-037 r0

The diff adds four tests to prompts.test.mjs. They read repo prompt files only. No input crosses a trust boundary, no network, no secrets, no path built from input. No finding.
