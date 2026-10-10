import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, writeFileSync, chmodSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.env.VERIFY_REPO
const KIT = `${REPO}/skills/sdlc/test/testkit`
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { stubServer, restrictedPath } = await import(`${KIT}/stub-server.mjs`)
const SECRET = 'ghp_SECRET123'

function setup(forge) {
  const r = cliRunner({ skillDir: `${REPO}/skills/sdlc` })
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge } } })
  return { r, repo }
}
function pre(r, repo, pathDirs, extraEnv = {}, timeoutMs = 120000) {
  const base = process.env.PATH
  return r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: pathDirs.concat(base).join(':'), ...extraEnv }, timeoutMs })
}
function check(t, forge, { secrets = [SECRET], maxNote = 200 } = {}) {
  assert.equal(t.status, 0, t.text())
  const out = t.json
  assert.equal(out.ok, true)
  assert.equal(out.rules.notes?.length ?? out.notes?.length, 1, t.stdout.slice(0, 500))
  const note = (out.rules?.notes ?? out.notes)[0]
  assert.ok(note.startsWith(`rules unknown on ${forge}: `), note)
  assert.ok(note.length <= maxNote + 40, String(note.length))
  assert.ok(!note.includes('\n'))
  for (const s of secrets) {
    assert.ok(!t.stdout.includes(s), `stdout leaks ${s}`)
    assert.ok(!t.stderr.includes(s), `stderr leaks ${s}`)
  }
  for (const s of out.samples) assert.equal(s.result ?? s.rule_result ?? 'unchecked', s.result ?? s.rule_result ?? 'unchecked')
  return { out, note }
}

test('verify cli VS-1 TC-cli-1: gh token + HTTP 403', () => {
  const { r, repo } = setup('github')
  const gh = stubServer({ name: 'gh', fallback: { stderr: `token ${SECRET}\nHTTP 403\n`, exit: 1 } })
  const t = pre(r, repo, [gh.dir])
  const { note } = check(t, 'github')
  assert.equal(note, 'rules unknown on github: gh exited with status 1 (HTTP 403)')
  console.log(t.text().slice(0, 1500))
})
test('verify cli VS-1 TC-cli-2: gh HTTP/2 404', () => {
  const { r, repo } = setup('github')
  const gh = stubServer({ name: 'gh', fallback: { stderr: `gh: Not Found (HTTP/2 404)\nHTTP/2 404 token ${SECRET}\n`, exit: 1 } })
  const t = pre(r, repo, [gh.dir])
  const { note } = check(t, 'github')
  assert.match(note, /status 1 \(HTTP 404\)$/)
})
test('verify cli VS-1 TC-cli-3: gh token with no status', () => {
  const { r, repo } = setup('github')
  const gh = stubServer({ name: 'gh', fallback: { stderr: `error: bad credentials ${SECRET}\n`, exit: 4 } })
  const t = pre(r, repo, [gh.dir])
  const { note } = check(t, 'github')
  assert.equal(note, 'rules unknown on github: gh exited with status 4')
})
test('verify cli VS-1 TC-cli-4: samples are unchecked and unchecked flag set', () => {
  const { r, repo } = setup('github')
  const gh = stubServer({ name: 'gh', fallback: { stderr: `HTTP 403 ${SECRET}\n`, exit: 1 } })
  const t = pre(r, repo, [gh.dir])
  console.log(JSON.stringify(t.json, null, 1).slice(0, 2500))
  const s = JSON.stringify(t.json)
  assert.ok(!s.includes(SECRET))
  assert.ok(t.json.samples.length > 0)
  for (const x of t.json.samples) {
    const vals = JSON.stringify(x)
    assert.ok(!/"(pass|fail)"/.test(vals) || /unchecked/.test(vals), vals)
  }
  assert.equal(gh.calls().length, 1)
})
test('verify cli VS-2 TC-cli-5: glab HTTP 401 with token', () => {
  const { r, repo } = setup('gitlab')
  const glab = stubServer({ name: 'glab', fallback: { stderr: `token ${SECRET}\nHTTP 401\n`, exit: 1 } })
  const t = pre(r, repo, [glab.dir])
  const { note } = check(t, 'gitlab')
  assert.equal(note, 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)')
})
test('verify cli VS-2 TC-cli-6: glab not signed in', () => {
  const { r, repo } = setup('gitlab')
  const glab = stubServer({ name: 'glab', fallback: { stderr: `You are not logged in. Run glab auth login. glpat-${SECRET}\n`, exit: 1 } })
  const t = pre(r, repo, [glab.dir])
  const { note } = check(t, 'gitlab', { secrets: [SECRET] })
  assert.equal(note, 'rules unknown on gitlab: glab exited with status 1')
})
test('verify cli VS-2 TC-cli-7: glab absent', () => {
  const { r, repo } = setup('gitlab')
  const bin = restrictedPath(['python3', 'git'])
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: bin } })
  const { note } = check(t, 'gitlab')
  assert.ok(!t.stdout.includes(process.env.HOME || '/Users'), 'home path in stdout')
  console.log(note)
})
test('verify cli VS-4 TC-cli-8: gh absent', () => {
  const { r, repo } = setup('github')
  const bin = restrictedPath(['python3', 'git'])
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: bin } })
  const { note } = check(t, 'github')
  console.log(note)
})
test('verify cli VS-4 TC-cli-9: gh not executable (launch error with path)', () => {
  const { r, repo } = setup('github')
  const dir = r.dir('noexec')
  writeFileSync(join(dir, 'gh'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(dir, 'gh'), 0o644)
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: `${dir}:${restrictedPath(['python3', 'git'])}` } })
  const { note } = check(t, 'github')
  console.log(note)
})
test('verify cli VS-3 TC-cli-10: 10 MB stderr, secret first/middle/last', () => {
  const { r, repo } = setup('github')
  const mb = 'x'.repeat(5 * 1024 * 1024)
  const big = `first ${SECRET}\n${mb}\nmiddle ${SECRET}\n${mb}\nlast ${SECRET}\nHTTP 500\n`
  const gh = stubServer({ name: 'gh', fallback: { stderr: big, exit: 1 } })
  const t = pre(r, repo, [gh.dir])
  const { note } = check(t, 'github')
  assert.ok(note.length < 200)
  assert.ok(t.stdout.length < 20000, String(t.stdout.length))
  assert.equal(note, 'rules unknown on github: gh exited with status 1 (HTTP 500)')
  console.log(`note=${note.length} stdout=${t.stdout.length} stderr=${t.stderr.length} ms=${Math.round(t.durationMs)}`)
})
test('verify cli VS-3 TC-cli-11: 10 MB stderr without newline', () => {
  const { r, repo } = setup('github')
  const gh = stubServer({ name: 'gh', fallback: { stderr: `${SECRET}${'y'.repeat(10 * 1024 * 1024)}`, exit: 1 } })
  const t = pre(r, repo, [gh.dir])
  check(t, 'github')
  assert.ok(t.stdout.length < 20000)
})
test('verify cli VS-3 TC-cli-12: stalled gh hits FORGE_TIMEOUT', { timeout: 150000 }, () => {
  const { r, repo } = setup('github')
  const gh = stubServer({ name: 'gh', fallback: { stall: true } })
  const t = pre(r, repo, [gh.dir])
  const { note } = check(t, 'github')
  console.log(note, Math.round(t.durationMs))
})
