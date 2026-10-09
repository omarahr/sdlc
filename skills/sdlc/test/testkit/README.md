# Verification testkit

The SDLC verifiers use these tools in their tests. Product code never imports them. Import each module by its absolute path from a test file. The self-tests run with `node --test skills/sdlc/test/testkit/*.test.mjs`. The repo suite does not run them.

## cli-runner (`cli-runner.mjs`)

Runs a skill script with `python3` from a new scratch directory. The environment is controlled: `PATH`, a scratch `HOME` with its own git identity, `TZ=UTC`, `PYTHONUTF8=1` and `PYTHONDONTWRITEBYTECODE=1`. The parent environment does not leak in.

```js
const r = cliRunner()
const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } }, branches: ['sdlc/S-1'] })
const t = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/S-1'], { env: { EXTRA: '1', TZ: undefined } })
t.status; t.stdout; t.stderr; t.json; t.durationMs; t.treeUnchanged; t.tree[repo].diff
console.log(t.text())
```

- `run(script, args, opts)` resolves `script` in the skill directory. Options: `cwd`, `env` (an `undefined` value removes the key), `input`, `timeoutMs`, `pythonFlags`, `skillDir`, `watch`.
- `exec(command, args, opts)` runs any command with the same recording.
- The runner watches the cwd and every scratch directory in the arguments. The tree diff lists added, removed and changed paths, and git refs as `ref:<name>`.
- A NUL argument cannot pass through argv. The transcript then holds `spawnError` and `status: null`.
- `copySkill({ omit, files })` copies the skill directory, so a test can remove or change a file such as `git-modes.json`.

## property (`property.mjs`)

Generates inputs from a seeded generator. It calls a Python function in the module loaded by its path, through `python3 -I` from a scratch cwd. Each result has the outcome `return`, `Fail` or `exception`, with the captured stdout and stderr.

```js
const report = check({ fn: 'validate_format', gen: arb.format, runs: 500 })
assertProperty(report)
assertProperty(checkLoadFormat({ runs: 200 }))
```

- The default property accepts `return` or `Fail`, and refuses every other exception. Give `property: (input, result) => reason | null` to add checks.
- `check` prints `seed=<n> runs=<n>`. Set `TESTKIT_SEED=<n>` to replay a run.
- `arb.configShape` covers absent files, a missing `.sdlc`, a directory, valid JSON, non-object JSON, invalid text, deep nesting, invalid UTF-8, symlinks and unreadable files. `materializeConfig(root, shape)` writes one shape and returns the repo path.

## attack-corpus (`attack-corpus.mjs`, `attack-corpus/*.json`)

Hostile payloads by family. Each entry is `{id, family, value, note}`.

```js
for (const e of load('unicode-digits', { argv: true })) r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--n', e.value])
const decoy = plantDecoy(r.dir('decoy'))
const t = r.run('next-action.py', ['--help'], { env: decoyEnv(dirname(decoy.path)) })
decoyFired(decoy)
```

- Families: control-chars, flag-like-values, format-strings, huge-integers, injection, integer-forms, nul, oversized, traversal, unicode-confusables, unicode-digits, unicode-whitespace.
- `{ argv: true }` drops values that argv cannot carry (NUL, lone surrogates). Use the `nul` family in files or stdin.
- `abbreviations(flag)`, `duplicated(flag, values)` and `equalsForm(flag, value)` build flag variants.
- `plantDecoy(dir, { module, behavior })` writes a decoy module. With `behavior: 'exit'` it exits with code 97. With `behavior: 'shadow'` it returns decoy values. Each import appends the decoy path to its marker file, and `decoyFired` reads it.

## stub-server (`stub-server.mjs`)

A shell shim that stands in for an outside command such as `gh`. It writes its argv and its cwd to a log, then prints the scripted stdout and stderr and exits with the scripted code. It opens no network port.

```js
const gh = stubServer({ script: [{ stdout: [{ id: 1 }] }, { stderr: 'boom', exit: 1 }] })
spawnSync('python3', [...], { env: gh.env() })
gh.calls()
gh.count()
gh.failNext(2, { exit: 1, stderr: 'down' })
const bin = restrictedPath(['python3', 'git'])
```

- `stubServer({ name, script, fallback })` makes the shim `<dir>/<name>`. `gh.dir` goes at the front of `PATH`: use `gh.env()` or `gh.path()`.
- A step is `{ stdout, stderr, exit, delaySeconds, stall }`. `stdout` takes a string, a Buffer or a JSON value. `stall` makes the shim sleep until the caller kills it.
- Step N answers call N. `fallback` answers every later call. `failNext(count, step)` fails the next calls.
- `calls()` returns `[{n, argv, cwd}]`. The argv log keeps spaces, newlines and empty arguments. `cwd` is the real path.
- `restrictedPath(keep)` returns a directory that holds links to the kept commands only. Use it as `PATH` to test an absent command.

## glab-stub (`glab-stub.mjs`)

A `glab` shim for tests of GitLab code paths. It wraps `stub-server` with the shim named `glab`. It opens no network port.

```js
const glab = glabStub({ script: [{ stdout: [] }, { stderr: 'boom', exit: 1 }] })
spawnSync('python3', [...], { env: glab.env() })
glab.calls()
const env = { PATH: glab.path(gh.path()) }
```

- It takes the same options and steps as `stubServer`. Step N answers call N.
- Each stub keeps its own log. Put both stubs on one `PATH` to test a run that calls both tools.
- `restrictedPath(keep)` is re-exported. Use it to test an absent `glab`.
