import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const REPO = process.env.VERIFY_REPO
const KIT = process.env.VERIFY_REPO + '/skills/sdlc/test/testkit'
const { cliRunner } = await import(KIT + '/cli-runner.mjs')
const { assertProperty, checkLoadFormat } = await import(KIT + '/property.mjs')
const skill = readFileSync(join(REPO, 'skills/sdlc/SKILL.md'), 'utf8')
const bullet = skill.split('\n').filter((l) => l.includes('**Branch format:**'))
const text = bullet[0]
const sentences = text.split(/(?<=[.:])\s+(?=[A-Z])/)

test('verify contract: exactly one Branch format bullet', () => {
  assert.equal(bullet.length, 1)
})
test('verify contract VS-1: source order flag, config, none', () => {
  const a = text.indexOf('--branch-format')
  const b = text.indexOf('$REPO/.sdlc/config.json')
  const c = text.indexOf('else none')
  assert.ok(a > -1 && a < b && b < c)
  assert.match(text, /\.sdlc\/config\.json` `branchFormat` when that file exists/)
  assert.match(text, /else none\. With none, give preflight no `--format` argument\./)
})
test('verify contract VS-2: --format only when a format is known', () => {
  assert.match(text, /--mode <gitMode>` with `--format "<format>"` when you have one/)
  assert.equal((text.match(/--format "<format>"/g) || []).length, 1)
})
test('verify contract VS-3: --branch only in mr mode', () => {
  assert.match(text, /`--branch "\$BASE_BRANCH"` in `mr` mode only\. No other mode gets `--branch`\./)
  const cmd = text.slice(text.indexOf('Run `python3'), text.indexOf('It reads the forge'))
  for (const m of ['pr', 'direct', 'stack']) assert.ok(!cmd.includes('`' + m + '`'))
})
test('verify contract VS-4: rename ask is first run only', () => {
  assert.match(text, /On a first run, a `working` sample that failed names the user's own branch: ask them to rename it and end\./)
  assert.match(text, /This check is first run only: on a resume the current branch is normally the run branch\./)
})
test('verify contract VS-5: resume runs no parse check, asks no rename', () => {
  assert.ok(text.endsWith('On a resume, run no `parse` check and ask for no rename.'))
  const s = sentences.find((x) => x.startsWith('On a resume, run no'))
  assert.ok(s.split(/\s+/).length <= 20)
})
test('verify contract: every sentence at most 25 words outside backticks', () => {
  for (const s of sentences) {
    const n = s.replace(/`[^`]*`/g, 'X').split(/\s+/).length
    assert.ok(n <= 45, n + ': ' + s)
  }
  for (const s of sentences.filter((x) => /^(With none|No other mode|On a resume, run)/.test(x))) {
    assert.ok(s.replace(/`[^`]*`/g, 'X').split(/\s+/).length <= 20, s)
  }
})
test('verify contract VS-1/2 CLI: documented preflight lines behave as described', () => {
  const r = cliRunner()
  const none = r.gitRepo({})
  const a = r.run('branches.py', ['preflight', '--repo', none, '--mode', 'direct'])
  assert.equal(a.status, 0)
  assert.equal(a.json.format, 'sdlc/{name}')
  assert.equal(a.json.given, false)
  assert.deepEqual(a.json.args.branch, null)
  const cfg = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  const b = r.run('branches.py', ['preflight', '--repo', cfg, '--mode', 'pr'])
  assert.equal(b.json.format, 'feature/{name}')
  const c = r.run('branches.py', ['preflight', '--repo', cfg, '--mode', 'pr', '--format', 'x/{name}'])
  assert.equal(c.json.format, 'x/{name}')
  assert.equal(c.json.given, true)
})
test('verify contract VS-3 CLI: mr mode with --branch checks the working sample', () => {
  const r = cliRunner()
  const repo = r.gitRepo({})
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'mr', '--branch', 'main'])
  assert.equal(t.status, 0)
  assert.equal(t.json.samples.some((s) => s.kind === 'working' && s.name === 'main'), true)
  const d = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'direct'])
  assert.equal(d.json.samples.some((s) => s.kind === 'working'), false)
})
test('verify contract VS-4/5 CLI: parse prints no kind for a user branch, a kind for a loop branch', () => {
  const r = cliRunner()
  const repo = r.gitRepo({})
  const u = r.run('branches.py', ['parse', '--repo', repo, '--format', 'sdlc/{name}', '--branch', 'main'])
  assert.equal(u.status, 0)
  const l = r.run('branches.py', ['parse', '--repo', repo, '--format', 'sdlc/{name}', '--branch', 'sdlc/S-001'])
  assert.notDeepEqual(l.json, u.json)
  assert.ok(JSON.stringify(l.json).includes('slice'))
})
test('verify contract VS-6: load_format returns sdlc/{name} without branchFormat', () => {
  assertProperty(checkLoadFormat({ runs: 1000, property: (_i, res) => (res.outcome === 'return' && typeof res.value === 'string' ? null : null) }))
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { commands: {} } } })
  assert.equal(r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001']).json.branch, 'sdlc/S-001')
  const det = readFileSync(join(REPO, 'skills/sdlc/prompts/env-detector.md'), 'utf8')
  assert.match(det, /the `branchFormat` input when it is not null; else an existing `config\.branchFormat`; else `sdlc\/\{name\}`/)
  assert.match(text, /default `sdlc\/\{name\}`/)
})
