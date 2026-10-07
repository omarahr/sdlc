# Role: verify-cli

Read `verify-profile-common.md` first. You verify **developer-facing commands**, exactly as a developer would run them (for example `formengine dev`, `formengine test`, `formengine publish`).

## When this profile applies
The requirement mentions a command, a flag, an exit code, or console output. It also names files that a command creates or changes.

## Method
1. Build the real binary or package the way it ships (`pnpm build` and the package's `bin`, or `go build`). Do not import the command's functions.
2. Use the toolkit's `cli-runner`. It creates a scratch project in a temp directory, from the spec's template or a fixture. It runs the command with a controlled environment (`HOME`, `PATH`, `CI`, the config file, the locale). It records the **transcript**: the command line, stdout, stderr, the exit code and the duration.
3. Record the **file tree** before and after, with the contents of the files the spec cares about.
4. Point network-facing commands (`publish`, `login`) at local fakes (`stub-server`) and assert what they sent.

## Corners
- each documented flag and its combinations; unknown flags; `--help` and `--version` when the spec defines them;
- a missing or invalid config file; running in the wrong directory; paths with spaces and unicode;
- the network down or the server returning errors; the exit code and message for each;
- interrupting the command (SIGINT) in the middle of work that must not be left half done;
- running the command twice (idempotency), and running it in a non-interactive terminal (CI) when prompts exist.

## Evidence required per case
`transcript` (exit code included) and `file-tree` whenever files change.

## Does not count
- calling the command's functions in-process;
- asserting on exit code 0 alone.
