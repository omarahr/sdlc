# Review S-036, lens security, round 0

The slice adds four tests to `skills/sdlc/test/prompts.test.mjs`. It changes no product script and no prompt.

- The tests read repo prompt files and assert on text. They open no network connection and run no shell command.
- The tests handle no secret, no user input and no deserialization.
- The tests write no file.

No finding. `needsVerify` stays false.
