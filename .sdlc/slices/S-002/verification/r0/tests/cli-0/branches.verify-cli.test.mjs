import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const TREE = resolve(process.env.VERIFY_TREE ?? '.')
const { cliRunner } = await import(join(TREE, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const LOG = process.env.VERIFY_LOG
const PYTHON = execFileSync('/bin/sh', ['-c', 'command -v python3'], { encoding: 'utf8' }).trim()

const transcripts = []
after(() => {
  if (LOG) writeFileSync(LOG, transcripts.join('\n\n'))
})

function rec(caseId, t) {
  transcripts.push(`### ${caseId}\n${t.text()}`)
  return t
}

function commandArgs(command, repo) {
  if (command === 'name') return ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001']
  if (command === 'parse') return ['parse', '--repo', repo, '--branch', 'sdlc/S-001']
  if (command === 'list') return ['list', '--repo', repo, '--kind', 'slice']
  return ['preflight', '--repo', repo, '--mode', 'pr']
}
const COMMANDS = ['name', 'parse', 'list', 'preflight']

function oneJson(t) {
  const lines = t.stdout.split('\n').filter((l) => l.length)
  assert.equal(lines.length, 1, `stdout must hold one line: ${JSON.stringify(t.stdout)}`)
  const obj = JSON.parse(lines[0])
  assert.equal(typeof obj, 'object')
  assert.ok(obj && !Array.isArray(obj))
  return obj
}

function assertBad(t, label) {
  assert.equal(t.status, 2, `${label}: exit ${t.status}\n${t.text()}`)
  const obj = oneJson(t)
  assert.equal(obj.ok, false, label)
  assert.equal(typeof obj.error, 'string', label)
  assert.ok(obj.error.length > 0, label)
  assert.equal(t.stderr, '', `${label}: stderr must be empty, got ${t.stderr}`)
  assert.ok(!/Traceback/.test(t.stdout + t.stderr), label)
  return obj
}

function assertGood(t, fmt, label) {
  assert.equal(t.status, 0, `${label}: exit ${t.status}\n${t.text()}`)
  const obj = oneJson(t)
  assert.equal(obj.ok, true, label)
  assert.equal(obj.format, fmt, `${label}: format must be the exact input`)
  assert.equal(t.stderr, '', label)
  return obj
}

function gitVerdict(sample) {
  const r = spawnSync('git', ['check-ref-format', '--branch', sample], { encoding: 'utf8' })
  return { status: r.status, stderr: (r.stderr ?? '').trim() }
}

const VALID = ['sdlc/{name}', 'sdlc/{name:lower}', 'feature/PROJ-1-{name}', '{name}', 'a/b/c-{name}-x', 'ünïcode/{name}', 'Ärger-{name:lower}']

test('verify cli: TC-cli-1 a valid --format exits 0 on every command and echoes the exact format', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  for (const fmt of VALID) {
    for (const c of COMMANDS) {
      const t = rec('TC-cli-1', r.run('branches.py', [...commandArgs(c, repo), '--format', fmt]))
      assertGood(t, fmt, `${c} ${fmt}`)
      assert.ok(t.treeUnchanged, `${c} ${fmt} changed the tree`)
    }
  }
})

test('verify cli: TC-cli-2 a valid config.json branchFormat exits 0 on every command', () => {
  const r = cliRunner()
  for (const fmt of VALID) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } }, branches: ['sdlc/S-001'] })
    for (const c of COMMANDS) {
      const t = rec('TC-cli-2', r.run('branches.py', commandArgs(c, repo)))
      assertGood(t, fmt, `${c} config ${fmt}`)
      assert.ok(t.treeUnchanged)
    }
  }
})

test('verify cli: TC-cli-3 a valid format is accepted from a non-repo dir, a non-repo cwd and a bogus GIT_DIR', () => {
  const r = cliRunner()
  const plain = r.dir('plain')
  const cwd = r.dir('cwd-nonrepo')
  for (const c of COMMANDS) {
    assertGood(rec('TC-cli-3', r.run('branches.py', [...commandArgs(c, plain), '--format', 'feature/PROJ-1-{name}'], { cwd })), 'feature/PROJ-1-{name}', `${c} plain`)
    assertGood(rec('TC-cli-3', r.run('branches.py', [...commandArgs(c, plain), '--format', 'sdlc/{name:lower}'], { env: { GIT_DIR: join(plain, 'no-such-git-dir') } })), 'sdlc/{name:lower}', `${c} GIT_DIR`)
  }
})

const MALFORMED = ['sdlc/', '{name}{name}', '{name}{name:lower}', '{{name}', '{name}}', '{}', 'sdlc/{ name }', 'sdlc/\t{name}', 'sdlc/\n{name}', 'sdlc/\u00a0{name}', 'sdlc/\u3000{name}', '{NAME}', '{name:upper}']

test('verify cli: TC-cli-4 a structurally malformed --format exits 2 with one JSON object on every command', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-001'] })
  for (const fmt of MALFORMED) {
    for (const c of COMMANDS) {
      const t = rec('TC-cli-4', r.run('branches.py', [...commandArgs(c, repo), `--format=${fmt}`]))
      assertBad(t, `${c} ${JSON.stringify(fmt)}`)
      assert.ok(t.treeUnchanged)
    }
  }
})

test('verify cli: TC-cli-5 a zero-width character in the format follows the git verdict', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  for (const fmt of ['a\u200bb/{name}', '\ufeffa/{name}', 'a/{name}\u200d']) {
    const g = gitVerdict(fmt.replace('{name}', 'S-001'))
    const t = rec('TC-cli-5', r.run('branches.py', [...commandArgs('name', repo), '--format', fmt]))
    if (g.status === 0) assertGood(t, fmt, JSON.stringify(fmt))
    else assertBad(t, JSON.stringify(fmt))
  }
})

const GIT_REFUSED = ['sdlc/{name}..', 'sdlc/{name}.lock', '-{name}', '--help{name}', '/{name}', '{name}/', 'a//{name}', 'a~/{name}', 'a^/{name}', 'a:/{name}', 'a?/{name}', 'a*/{name}', 'a[/{name}', 'a\\/{name}', '@/{name}', 'a/.b/{name}', 'a\x01/{name}', 'a\x1f/{name}', 'a\x7f/{name}', 'a@{-1}{name}']

test('verify cli: TC-cli-6 the CLI verdict on each git-unsafe format equals git, and a refusal carries the reason of git', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  for (const fmt of GIT_REFUSED) {
    const sample = fmt.replace('{name}', 'S-001')
    const g = gitVerdict(sample)
    for (const c of COMMANDS) {
      const t = rec('TC-cli-6', r.run('branches.py', [...commandArgs(c, repo), `--format=${fmt}`]))
      if (g.status === 0 && !fmt.includes('@{')) {
        assertGood(t, fmt, `${c} ${JSON.stringify(fmt)} matches the direct git verdict`)
        continue
      }
      const obj = assertBad(t, `${c} ${JSON.stringify(fmt)}`)
      if (fmt.includes('@{')) continue
      if (fmt.includes('\x1f')) {
        assert.match(obj.error, /holds whitespace/)
        continue
      }
      assert.notEqual(g.status, 0, `direct git accepts ${JSON.stringify(sample)}`)
      assert.match(obj.error, /check-ref-format/, `${c} ${JSON.stringify(fmt)}: ${obj.error}`)
      assert.match(obj.error, /is not a valid branch name/, `${c} ${JSON.stringify(fmt)}: ${obj.error}`)
      assert.ok(obj.error.includes(g.stderr), `${c} ${JSON.stringify(fmt)}: ${obj.error} lacks ${g.stderr}`)
    }
  }
})

test('verify cli: TC-cli-7 a NUL in config.json branchFormat exits 2 with one JSON object', () => {
  const r = cliRunner()
  for (const fmt of ['sdlc/{name}\u0000', '\u0000{name}']) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } } })
    for (const c of COMMANDS) {
      const t = rec('TC-cli-7', r.run('branches.py', commandArgs(c, repo)))
      const obj = assertBad(t, `${c} NUL`)
      assert.match(obj.error, /check-ref-format/)
      assert.ok(t.treeUnchanged)
    }
  }
})

test('verify cli: TC-cli-8 shell metacharacters in the format reach git as one argv item and run nothing', () => {
  const r = cliRunner()
  const repo = r.gitRepo()
  const bin = r.dir('bin')
  const marker = join(r.root, 'pwned-marker')
  const trap = join(bin, 'touch_pwned')
  writeFileSync(trap, `#!/bin/sh\necho fired >> '${marker}'\n`)
  chmodSync(trap, 0o755)
  const env = { PATH: `${bin}:${r.env.PATH}` }
  for (const fmt of ['`touch_pwned`/{name}', ';touch_pwned;{name}', '$(touch_pwned)/{name}', '|touch_pwned|{name}', '&&touch_pwned&&{name}']) {
    const g = gitVerdict(fmt.replace('{name}', 'S-001'))
    for (const c of COMMANDS) {
      const t = rec('TC-cli-8', r.run('branches.py', [...commandArgs(c, repo), '--format', fmt], { env }))
      if (g.status === 0) assertGood(t, fmt, `${c} ${fmt}`)
      else assertBad(t, `${c} ${fmt}`)
      assert.ok(t.treeUnchanged, `${c} ${fmt} changed the tree`)
    }
  }
  assert.equal(existsSync(marker), false, 'a shell ran the trap command')
})

test('verify cli: TC-cli-9 git missing from PATH exits 2 with one JSON object that names git', () => {
  const r = cliRunner({ python: PYTHON })
  const repo = r.gitRepo()
  const empty = r.dir('empty-path')
  for (const c of COMMANDS) {
    const t = rec('TC-cli-9', r.run('branches.py', [...commandArgs(c, repo), '--format', 'sdlc/{name}'], { env: { PATH: empty } }))
    const obj = assertBad(t, `${c} no git`)
    assert.match(obj.error, /git/)
    assert.ok(t.treeUnchanged)
  }
})

test('verify cli: TC-cli-10 a fake git that exits 1 with empty stderr gives exit 2 and an exit-code reason', () => {
  const r = cliRunner({ python: PYTHON })
  const repo = r.gitRepo()
  const bin = r.dir('fake-git-1')
  writeFileSync(join(bin, 'git'), '#!/bin/sh\nexit 1\n')
  chmodSync(join(bin, 'git'), 0o755)
  for (const c of COMMANDS) {
    const t = rec('TC-cli-10', r.run('branches.py', [...commandArgs(c, repo), '--format', 'sdlc/{name}'], { env: { PATH: bin } }))
    const obj = assertBad(t, `${c} fake git 1`)
    assert.match(obj.error, /exit 1/)
  }
})

test('verify cli: TC-cli-11 a fake git that exits 0 decides the verdict', () => {
  const r = cliRunner({ python: PYTHON })
  const repo = r.gitRepo()
  const bin = r.dir('fake-git-0')
  writeFileSync(join(bin, 'git'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(bin, 'git'), 0o755)
  const t = rec('TC-cli-11', r.run('branches.py', [...commandArgs('name', repo), '--format', 'sdlc/{name}..'], { env: { PATH: bin } }))
  assertGood(t, 'sdlc/{name}..', 'fake git 0 admits a refused format')
})

test('verify cli: TC-cli-12 a config.json format that git refuses stops every command with one JSON error and changes nothing', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}..' } }, branches: ['sdlc/S-001', 'feature/x'] })
  for (const c of COMMANDS) {
    for (let i = 0; i < 2; i++) {
      const t = rec('TC-cli-12', r.run('branches.py', commandArgs(c, repo)))
      const obj = assertBad(t, `${c} config invalid run ${i}`)
      assert.match(obj.error, /is not a valid branch name/)
      assert.match(obj.error, /check-ref-format/)
      assert.ok(t.treeUnchanged, `${c} changed the repo tree or refs`)
      assert.deepEqual(t.tree[repo].after.refs, t.tree[repo].before.refs)
    }
  }
})

test('verify cli: TC-cli-13 --format overrides config.json in both directions', () => {
  const r = cliRunner()
  const goodRepo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  const badRepo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}.lock' } } })
  for (const c of COMMANDS) {
    const bad = rec('TC-cli-13', r.run('branches.py', [...commandArgs(c, goodRepo), '--format', 'sdlc/{name}..']))
    const obj = assertBad(bad, `${c} bad --format over good config`)
    assert.match(obj.error, /is not a valid branch name/)
    const good = rec('TC-cli-13', r.run('branches.py', [...commandArgs(c, badRepo), '--format', 'sdlc/{name}']))
    assertGood(good, 'sdlc/{name}', `${c} good --format over bad config`)
    assert.ok(bad.treeUnchanged && good.treeUnchanged)
  }
})
