# Security review S-026, round 0

The slice adds five string-match tests to `prompts.test.mjs`. It changes no product code.
The tests read a repo file and run no commands, no network and no deserialization.
No secrets, no path input and no trust boundary are touched.

No findings. `needsVerify` stays false.
