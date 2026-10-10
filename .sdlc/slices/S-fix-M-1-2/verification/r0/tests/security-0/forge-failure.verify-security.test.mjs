import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { cliRunner } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-fix-M-1-2-v0-security-0/skills/sdlc/test/testkit/cli-runner.mjs'
import { stubServer } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-fix-M-1-2-v0-security-0/skills/sdlc/test/testkit/stub-server.mjs'
import { callPython } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-fix-M-1-2-v0-security-0/skills/sdlc/test/testkit/property.mjs'

const BRANCHES = '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-fix-M-1-2-v0-security-0/skills/sdlc/branches.py'
const SECRET = 'ghp_SECRETabc123XYZ'

function setup(forge, step, tool = forge === 'github' ? 'gh' : 'glab') {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge } } })
  const stub = stubServer({ name: tool, script: [step], fallback: step })
  stub.setFallback(step)
  return { r, repo, stub }
}

function preflight({ r, repo, stub }, extraEnv = {}) {
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: stub ? stub.path() : undefined, ...extraEnv } })
  return t
}

function notesOf(t) {
  const out = t.json
  assert.ok(out, `no JSON: ${t.stdout.slice(0, 300)} ${t.stderr.slice(0, 300)}`)
  return out
}

function rulesInfo(out) {
  return out.rules ?? out
}

function find(out, key) {
  const seen = []
  const walk = (v) => {
    if (v && typeof v === 'object') {
      if (!Array.isArray(v) && key in v) seen.push(v[key])
      for (const x of Object.values(v)) walk(x)
    }
  }
  walk(out)
  return seen
}

function check(t, { forge, secrets = [SECRET] }) {
  const out = notesOf(t)
  const notes = find(out, 'notes').flat().filter((n) => typeof n === 'string' && n.startsWith('rules unknown'))
  assert.equal(notes.length, 1, `notes: ${JSON.stringify(find(out, 'notes'))}`)
  assert.ok(notes[0].startsWith(`rules unknown on ${forge}: `))
  for (const s of secrets) {
    assert.ok(!t.stdout.includes(s), 'secret in stdout')
    assert.ok(!t.stderr.includes(s), 'secret in stderr')
  }
  assert.equal(t.status, 0)
  return { out, note: notes[0] }
}

test('verify security: VS-1 gh stderr with token and HTTP 403 leaks nothing', () => {
  const s = setup('github', { stderr: `error: token ${SECRET}\nHTTP 403: Forbidden\n`, exit: 1 })
  const t = preflight(s)
  const { note } = check(t, { forge: 'github' })
  assert.equal(note, 'rules unknown on github: gh exited with status 1 (HTTP 403)')
  assert.equal(find(notesOf(t), 'unchecked').every((x) => x === true), true)
  assert.equal(JSON.stringify(notesOf(t)).includes('"pass"') || JSON.stringify(notesOf(t)).includes('"fail"'), false)
})

test('verify security: VS-1 HTTP/2 404 form and token line without status', () => {
  const a = setup('github', { stderr: `gh: HTTP/2 404\ntoken ${SECRET}\n`, exit: 1 })
  assert.equal(check(preflight(a), { forge: 'github' }).note, 'rules unknown on github: gh exited with status 1 (HTTP 404)')
  const b = setup('github', { stderr: `Authorization: token ${SECRET}\n`, exit: 4 })
  assert.equal(check(preflight(b), { forge: 'github' }).note, 'rules unknown on github: gh exited with status 4')
})

test('verify security: VS-1 token containing digits after HTTP is not echoed beyond three digits', () => {
  const s = setup('github', { stderr: `HTTP ${SECRET}\nHTTP 123456789\n`, exit: 1 })
  const { note } = check(preflight(s), { forge: 'github' })
  assert.equal(note, 'rules unknown on github: gh exited with status 1')
})

test('verify security: VS-2 glab 401 with token line', () => {
  const s = setup('gitlab', { stderr: `glab: 401 Unauthorized\nHTTP 401\nPRIVATE-TOKEN: ${SECRET}\n`, exit: 1 })
  const { note } = check(preflight(s), { forge: 'gitlab' })
  assert.equal(note, 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)')
})

test('verify security: VS-2 glab not signed in', () => {
  const s = setup('gitlab', { stderr: `You are not logged in. token=${SECRET}\n`, exit: 1 })
  const { note } = check(preflight(s), { forge: 'gitlab' })
  assert.ok(!note.includes('logged'))
})

test('verify security: VS-2 and VS-4 glab and gh absent from PATH', () => {
  for (const forge of ['github', 'gitlab']) {
    const r = cliRunner()
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge } } })
    const bare = r.dir('bare')
    const py = r.exec('sh', ['-c', 'command -v python3']).stdout.trim()
    const git = r.exec('sh', ['-c', 'command -v git']).stdout.trim()
    const { symlinkSync } = require_fs()
    symlinkSync(py, join(bare, 'python3'))
    symlinkSync(git, join(bare, 'git'))
    const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: bare } })
    const { note } = check(t, { forge })
    assert.ok(!note.includes('\n'))
    assert.ok(note.length <= 200 + `rules unknown on ${forge}: `.length, note.length)
    assert.ok(!note.includes(r.home), 'home path in note')
    assert.ok(!t.stdout.includes(r.home))
  }
})

import * as fs from 'node:fs'
function require_fs() { return fs }

test('verify security: VS-3 10 MB stderr with secret first, middle and last', () => {
  const filler = 'x'.repeat(1023) + '\n'
  const body = `first ${SECRET}\n` + filler.repeat(5000) + `middle ${SECRET}\n` + filler.repeat(5000) + `last ${SECRET}\n`
  const s = setup('github', { stderr: body, exit: 1 })
  assert.ok(body.length > 10_000_000)
  const t = preflight(s)
  const { note } = check(t, { forge: 'github' })
  assert.ok(note.length < 200, note.length)
  assert.ok(t.stdout.length < 20000, t.stdout.length)
  assert.ok(!t.stdout.includes(SECRET))
})

test('verify security: VS-3 10 MB stderr on glab', () => {
  const body = `first ${SECRET}\n` + ('y'.repeat(1023) + '\n').repeat(10000) + `last ${SECRET}`
  const s = setup('gitlab', { stderr: body, exit: 2 })
  const t = preflight(s)
  const { note } = check(t, { forge: 'gitlab' })
  assert.ok(note.length < 200)
  assert.ok(t.stdout.length < 20000)
})

test('verify security: VS-3 slow gh hits the timeout with a bounded one-line note', () => {
  const s = setup('github', { stall: true, stderr: SECRET })
  const driver = `
import importlib.util, sys
spec = importlib.util.spec_from_file_location("b", ${JSON.stringify(BRANCHES)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.FORGE_TIMEOUT = 1
print(repr(m._run_forge_cli(["gh", "api", "x"], ${JSON.stringify(s.repo)})))
`
  const t0 = Date.now()
  const r = s.r.exec('python3', ['-I', '-c', driver], { env: { PATH: s.stub.path() } })
  const dt = Date.now() - t0
  assert.ok(dt < 20000, dt)
  assert.ok(r.stdout.includes('None'), r.stdout + r.stderr)
  assert.ok(!r.stdout.includes(SECRET))
  assert.ok(r.stdout.length <= 260, r.stdout)
  assert.ok(!r.stdout.includes('\\n'), r.stdout)
})

const DEC = (tool, rc, err) => callPython(BRANCHES, '_forge_failure', [[tool, rc, err]])[0]

test('verify security: VS-5 _forge_failure reads status and one HTTP code only', () => {
  const cases = [
    ['', 'gh exited with status 1'],
    ['boom', 'gh exited with status 1'],
    ['HTTP 403', 'gh exited with status 1 (HTTP 403)'],
    ['HTTP 4031', 'gh exited with status 1'],
    ['HTTP 40', 'gh exited with status 1'],
    ['http 403', 'gh exited with status 1'],
    ['HTTP/1.1 502 Bad Gateway', 'gh exited with status 1 (HTTP 502)'],
    ['HTTP/2 404', 'gh exited with status 1 (HTTP 404)'],
    ['HTTP 401 then HTTP 500', 'gh exited with status 1 (HTTP 401)'],
    [`token_HTTP 403_${SECRET}`, 'gh exited with status 1'],
    ['HTTP\r\n403', 'gh exited with status 1'],
    ['HTTP 403\r\n' + SECRET, 'gh exited with status 1 (HTTP 403)'],
    ['\u0000HTTP 403\u0000', 'gh exited with status 1 (HTTP 403)'],
    ['HTTP 403‮', 'gh exited with status 1 (HTTP 403)'],
    ['HTTP  403', 'gh exited with status 1'],
    ['HTTP 403' + 'a', 'gh exited with status 1'],
  ]
  const results = callPython(BRANCHES, '_forge_failure', cases.map(([e]) => ['gh', 1, e]))
  cases.forEach(([e, want], i) => {
    assert.equal(results[i].outcome, 'return', JSON.stringify(e) + JSON.stringify(results[i]))
    assert.equal(results[i].value, want, JSON.stringify(e))
  })
})

test('verify security: VS-5 unicode digits never reach the note', () => {
  const r = DEC('gh', 1, 'HTTP ٣٠٣ and HTTP ４０３')
  assert.equal(r.outcome, 'return')
  assert.equal(r.value, 'gh exited with status 1')
})

test('verify security: VS-4/5 _bounded one line at most 200 and never raises', () => {
  const inputs = ['', '\n\n', '  \n x \n y', 'a'.repeat(5000), 'line1\nline2', '\r\nfoo\r\nbar', '\u0000', 'a b', 'a\u0085b', 'a\x0bb', 'a\x1cb\x1dc', '/Users/omar.ragab/secret\nmore', 'é'.repeat(300)]
  const res = callPython(BRANCHES, '_bounded', inputs.map((i) => [i]))
  res.forEach((x, i) => {
    assert.equal(x.outcome, 'return', JSON.stringify(inputs[i]))
    assert.ok(x.value.length <= 200)
    assert.equal([...x.value].filter((c) => '\r\n\u2028\u2029\u0085\u000b\u000c\u001c\u001d\u001e'.includes(c)).length, 0, JSON.stringify(inputs[i]) + ' -> ' + JSON.stringify(x.value))
  })
})

test('verify security: VS-1 invalid UTF-8 stderr with a token gives a bounded note', () => {
  const s = setup('github', { stderr: Buffer.concat([Buffer.from(`token ${SECRET} `), Buffer.from([0xff, 0xfe, 0x80]), Buffer.from('\nHTTP 403\n')]), exit: 1 })
  const t = preflight(s)
  const { note } = check(t, { forge: 'github' })
  assert.ok(note.length < 200, note)
  assert.ok(!note.includes('\n'))
})

test('verify security: VS-4 gh present but not executable gives a one-line bounded note', () => {
  const s = setup('github', { stderr: SECRET, exit: 1 })
  s.r.chmod(s.stub.shim, 0o644)
  const t = preflight(s)
  const { note } = check(t, { forge: 'github' })
  assert.ok(note.length <= 200 + 'rules unknown on github: '.length)
  assert.ok(!note.includes('\n'))
  assert.ok(!t.stdout.includes(s.r.home))
})

test('verify security: VS-1 no outbound side effect and tree unchanged after a refusal', () => {
  const s = setup('github', { stderr: `token ${SECRET}\nHTTP 403`, exit: 1 })
  const before = s.r.snapshot(s.repo)
  const t = preflight(s)
  check(t, { forge: 'github' })
  const after = s.r.snapshot(s.repo)
  const d = s.r.diffSnapshots(before, after)
  assert.ok(d.empty, JSON.stringify(d))
  assert.ok(s.stub.count() >= 1)
  for (const c of s.stub.calls()) assert.deepEqual(c.argv.slice(0, 1), ['api'])
})
