# Security review, S-030, round 2

Fix round 2 deletes test T-R-126a and adds one `rule` null assertion to T-R-042a.
The change touches only `skills/sdlc/test/branches.test.mjs`. It adds no product code, no I/O boundary and no secret.
The added assertion reads a value the test already holds.

No finding. `needsVerify` stays false.
