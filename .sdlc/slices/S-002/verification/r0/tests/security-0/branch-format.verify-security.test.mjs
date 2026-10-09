import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.SDLC_VERIFY_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const KIT = join(ROOT, 'skills/sdlc/test/testkit')
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const { callPython, BRANCHES } = await import(join(KIT, 'property.mjs'))
const { load } = await import(join(KIT, 'attack-corpus.mjs'))

const candidateOf = (fmt) => fmt.includes('{name:lower}') ? fmt.replace('{name:lower}', 's-001') : fmt.replace('{name}', 'S-001')

function gitVerdict(name) {
  const r = spawnSync('git', ['check-ref-format', '--branch', name], { encoding: 'utf8', env: { PATH: process.env.PATH } })
  return { ok: r.status === 0, stderr: r.stderr.trim() }
}

function pythonWhitespace(formats) {
  const out = execFileSync('python3', ['-I', '-c', 'import json,re,sys; print(json.dumps([bool(re.search(r"\\s", f)) for f in json.load(sys.stdin)]))'], { input: JSON.stringify(formats), encoding: 'utf8' })
  return JSON.parse(out)
}

function validate(formats) {
  return callPython(BRANCHES, 'validate_format', formats.map((f) => [f]))
}

function oneJson(t, label) {
  const lines = t.stdout.split('\n').filter((l) => l.trim() !== '')
  assert.equal(lines.length, 1, `${label}: stdout has ${lines.length} lines: ${t.stdout}`)
  return JSON.parse(lines[0])
}

const NO_SPACE_SHELL = [
  '$(>pwned){name}',
  '`>pwned`{name}',
  'x;>pwned;{name}',
  'x|>pwned|{name}',
  'x&&>pwned&&{name}',
  '$IFS>pwned/{name}',
]

test('verify security: VS-2 unicode whitespace and control characters in the format raise Fail, never another exception', () => {
  const formats = [
    ...load('unicode-whitespace').map((e) => `a${e.value}/{name}`),
    ...load('control-chars').map((e) => `a${e.value}/{name}`),
    'sdlc/{ name }', 'sdlc/{name}\t', '\n{name}', 'a\u00a0{name}', 'a\u3000{name}',
  ]
  const results = validate(formats)
  const pyWhitespace = pythonWhitespace(formats)
  formats.forEach((f, i) => {
    const r = results[i]
    assert.ok(r.outcome === 'return' || r.outcome === 'Fail', `${JSON.stringify(f)} raised ${r.type}: ${r.message}`)
    const expectFail = pyWhitespace[i] || !gitVerdict(candidateOf(f)).ok
    assert.equal(r.outcome, expectFail ? 'Fail' : 'return', `${JSON.stringify(f)}: whitespace=${pyWhitespace[i]} gave ${r.outcome} ${r.message ?? ''}`)
  })
})

test('verify security: VS-2 zero-width characters get the same verdict as a direct git check-ref-format call', () => {
  const formats = ['a\u200b/{name}', 'a\ufeff/{name}', '\u200b{name}', 'a/{name}\u200d', 'a\u2060/{name}']
  const results = validate(formats)
  formats.forEach((f, i) => {
    const g = gitVerdict(candidateOf(f))
    const accepted = results[i].outcome === 'return'
    assert.ok(results[i].outcome === 'return' || results[i].outcome === 'Fail', `${JSON.stringify(f)} raised ${results[i].type}`)
    assert.equal(accepted, g.ok, `${JSON.stringify(f)}: validate_format ${results[i].outcome}, git ok=${g.ok}`)
    if (accepted) assert.equal(results[i].value, f)
  })
})

test('verify security: VS-3 git-refused literal parts raise Fail with check-ref-format and the same verdict as git', () => {
  const formats = [
    'sdlc/{name}..', 'sdlc/{name}.lock', '-{name}', '--{name}', '--help{name}', '--normalize{name}',
    '--upload-pack=touch{name}', '/{name}', '{name}/', 'a//{name}', 'a~/{name}', 'a^/{name}', 'a:/{name}',
    'a?/{name}', 'a*/{name}', 'a[/{name}', 'a\\/{name}', 'a/.b/{name}', '.{name}', 'a/{name}.',
    'a\x01/{name}', 'a\x7f/{name}', 'a\x1b/{name}',
  ]
  const results = validate(formats)
  formats.forEach((f, i) => {
    const r = results[i]
    const g = gitVerdict(candidateOf(f))
    assert.equal(g.ok, false, `${JSON.stringify(f)}: git itself accepts ${candidateOf(f)}`)
    assert.equal(r.outcome, 'Fail', `${JSON.stringify(f)} gave ${r.outcome} ${r.type ?? ''}`)
    assert.match(r.message, /check-ref-format/, `${JSON.stringify(f)}: ${r.message}`)
    assert.match(r.message, /is not a valid branch name/, `${JSON.stringify(f)}: ${r.message}`)
  })
})

test('verify security: VS-3 a leading dash reaches git as the branch name, not as an option', () => {
  for (const f of ['-{name}', '--{name}', '--help{name}', '--normalize{name}', '--branch{name}', '-h{name}']) {
    const [r] = validate([f])
    assert.equal(r.outcome, 'Fail', `${f}: ${r.outcome}`)
    assert.ok(r.message.includes(`'${candidateOf(f)}' is not a valid branch name`), `${f}: ${r.message}`)
    assert.doesNotMatch(r.message, /usage:/i, `${f}: git printed usage, so it read the name as an option`)
  }
})

test('verify security: VS-3 a NUL in the format raises Fail, not ValueError', () => {
  const formats = [...load('nul').map((e) => `sdlc/{name}${e.value}`), 'sdlc/{name}\x00', '\x00{name}', 'a\x00b/{name}']
  const results = validate(formats)
  formats.forEach((f, i) => {
    assert.equal(results[i].outcome, 'Fail', `${JSON.stringify(f)} gave ${results[i].outcome} ${results[i].type ?? ''}`)
  })
})

test('verify security: VS-3 shell metacharacters reach git as one argv item and run no shell', () => {
  const r = cliRunner()
  const formats = [...NO_SPACE_SHELL, ...load('injection', { argv: true }).map((e) => `${e.value}/{name}`)]
  for (const f of formats) {
    const repo = r.gitRepo()
    const cwd = r.dir('cwd')
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1', '--format', f], { cwd })
    const out = oneJson(t, f)
    assert.ok(t.status === 0 || t.status === 2, `${f}: exit ${t.status}\n${t.text()}`)
    assert.equal(t.stderr, '', `${f}: stderr ${t.stderr}`)
    assert.ok(!existsSync(join(cwd, 'pwned')) && !existsSync(join(repo, 'pwned')), `${f}: a shell ran and wrote pwned`)
    assert.ok(t.treeUnchanged, `${f}: tree changed\n${t.text()}`)
    const g = gitVerdict(candidateOf(f))
    const structural = /\s/.test(f) || /[{}]/.test(f.replace('{name}', ''))
    const expectOk = !structural && g.ok
    assert.equal(out.ok, expectOk, `${f}: ok=${out.ok}, git ok=${g.ok}, structural=${structural}: ${t.stdout}`)
    if (expectOk) assert.equal(out.format, f)
  }
})

test('verify security: VS-3 a hostile cwd repo config does not run code or change the verdict', () => {
  const r = cliRunner()
  const cwd = r.gitRepo({ name: 'evil' })
  r.git(cwd, 'config', 'core.fsmonitor', 'touch FSMON_PWNED; echo')
  r.git(cwd, 'config', 'alias.check-ref-format', '!touch ALIAS_PWNED')
  const repo = r.gitRepo()
  const ok = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1', '--format', 'sdlc/{name}'], { cwd })
  assert.equal(ok.status, 0, ok.text())
  const bad = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1', '--format', 'sdlc/{name}..'], { cwd })
  assert.equal(bad.status, 2, bad.text())
  assert.deepEqual(readdirSync(cwd).filter((n) => n.includes('PWNED')), [])
})

const COMMANDS = (repo) => ({
  name: ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-1'],
  parse: ['parse', '--repo', repo, '--branch', 'sdlc/S-1'],
  list: ['list', '--repo', repo, '--kind', 'slice'],
  preflight: ['preflight', '--repo', repo, '--mode', 'pr'],
})

const HOSTILE_CONFIG = ['sdlc/{name}..', '-{name}', '--upload-pack=touch{name}', 'a~/{name}', 'a\x01/{name}', '/{name}', 'sdlc/{name}.lock']

test('verify security: VS-8 a git-refused branchFormat in config.json stops every command with one JSON error and no change', () => {
  const r = cliRunner()
  for (const fmt of HOSTILE_CONFIG) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } }, branches: ['sdlc/S-1'] })
    for (const [cmd, args] of Object.entries(COMMANDS(repo))) {
      const t = r.run('branches.py', args)
      assert.equal(t.status, 2, `${cmd} ${JSON.stringify(fmt)}\n${t.text()}`)
      const out = oneJson(t, `${cmd} ${JSON.stringify(fmt)}`)
      assert.equal(out.ok, false)
      assert.match(out.error, /is not a valid branch name/, `${cmd} ${JSON.stringify(fmt)}: ${out.error}`)
      assert.equal(t.stderr, '', `${cmd}: stderr ${t.stderr}`)
      assert.ok(t.treeUnchanged, `${cmd} ${JSON.stringify(fmt)}: tree or refs changed\n${t.text()}`)
    }
  }
})

test('verify security: VS-8 --format overrides config.json in both directions', () => {
  const r = cliRunner()
  const goodCfg = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } }, branches: ['sdlc/S-1'] })
  const badCfg = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: '-{name}' } }, branches: ['sdlc/S-1'] })
  for (const [cmd, args] of Object.entries(COMMANDS(goodCfg))) {
    const t = r.run('branches.py', [...args, '--format', 'sdlc/{name}..'])
    assert.equal(t.status, 2, `${cmd}\n${t.text()}`)
    assert.match(oneJson(t, cmd).error, /is not a valid branch name/)
    assert.ok(t.treeUnchanged, t.text())
  }
  for (const [cmd, args] of Object.entries(COMMANDS(badCfg))) {
    const t = r.run('branches.py', [...args, '--format', 'sdlc/{name}'])
    assert.equal(t.status, 0, `${cmd}\n${t.text()}`)
    const out = oneJson(t, cmd)
    assert.equal(out.ok, true)
    assert.equal(out.format, 'sdlc/{name}')
    assert.ok(t.treeUnchanged, t.text())
  }
})
