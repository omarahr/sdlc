# Review security S-037 r2

The new diff adds two tests to prompts.test.mjs. They read repo prompt files only. No input crosses a trust boundary. No network, no secrets, no path built from input. No finding.
