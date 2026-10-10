import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { up, down, sh, childEnv, skillDir } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { mark, since } from '../helpers/logs.mjs'
import { gitRepo } from '../helpers/repo.mjs'
import { clearRequests, requests } from '../helpers/fakes.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
test.after(() => down(stack))

const SECRET = 'ghp_SECRET123'
const REAL_GIT = sh(stack, 'which', ['git']).stdout.trim()
const REAL_PYTHON = sh(stack, 'python3', ['-c', 'import sys;print(sys.executable)']).stdout.trim()
const SANDBOX_TMP = path.join(stack.dirs.root, 'tmp')
fs.mkdirSync(SANDBOX_TMP, { recursive: true })

let shimCounter = 0
function shimDir(scripts) {
  const dir = path.join(stack.dirs.root, `shims-${++shimCounter}`)
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(scripts)) {
    fs.writeFileSync(path.join(dir, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 })
  }
  return dir
}

function pathWith(dir) {
  return { PATH: `${dir}:${stack.dirs.bin}:${process.env.PATH}`, TMPDIR: SANDBOX_TMP }
}

function restrictedPath() {
  const dir = path.join(stack.dirs.root, `restricted-${++shimCounter}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.symlinkSync(REAL_GIT, path.join(dir, 'git'))
  fs.symlinkSync(REAL_PYTHON, path.join(dir, 'python3'))
  return { PATH: dir, TMPDIR: SANDBOX_TMP }
}

function walk(dir) {
  const out = {}
  const visit = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue
      const p = path.join(d, e.name)
      const rel = path.relative(dir, p)
      if (e.isSymbolicLink()) out[rel] = `link:${fs.readlinkSync(p)}`
      else if (e.isDirectory()) {
        out[rel] = 'dir'
        visit(p)
      } else {
        try {
          out[rel] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
        } catch {
          out[rel] = `unreadable:${(fs.statSync(p).mode & 0o777).toString(8)}`
        }
      }
    }
  }
  visit(dir)
  return out
}

function snapshot(repo) {
  let refs = 'no-refs'
  const r = sh(stack, REAL_GIT, ['-C', repo.dir, 'for-each-ref'])
  if (r.status === 0) refs = r.stdout
  return JSON.stringify({ refs, files: walk(repo.dir) })
}

function refsOf(repo) {
  return repo.git('for-each-ref', '--format=%(refname:short)').split('\n').filter(Boolean)
}

function oneJson(t) {
  assert.ok(!t.stderr.includes('Traceback'), `stderr: ${t.stderr}`)
  assert.ok(!t.stdout.includes('Traceback'), `stdout: ${t.stdout}`)
  assert.notEqual(t.json, null, `stdout is not one JSON object: ${t.stdout.slice(0, 500)}`)
  assert.equal(typeof t.json, 'object')
  assert.ok(!Array.isArray(t.json))
}

function oneLine(t) {
  oneJson(t)
  assert.equal(t.stdout.trim().split('\n').length, 1, t.stdout.slice(0, 500))
}

function noSecret(t, extra = []) {
  const logLines = extra.join('\n')
  for (const [name, text] of [['stdout', t.stdout], ['stderr', t.stderr], ['log', logLines]]) {
    assert.ok(!text.includes(SECRET), `${SECRET} leaked into ${name}: ${text.slice(0, 400)}`)
  }
}

function noHomePath(text) {
  for (const home of new Set([os.homedir(), stack.dirs.home, process.env.HOME].filter(Boolean))) {
    assert.ok(!text.includes(home), `home path ${home} in: ${text.slice(0, 400)}`)
  }
}

function preflight(repo, args, env) {
  return api(stack, 'branches.py', ['preflight', '--repo', repo.dir, ...args], { env, timeoutMs: 170000 })
}

function forgeRepo(forge, extra = {}) {
  const repo = gitRepo(stack, { forge, ...extra })
  clearRequests(stack, 'gh')
  clearRequests(stack, 'glab')
  return repo
}

function allUnchecked(t) {
  for (const s of t.json.samples) assert.equal(s.result, 'unchecked', JSON.stringify(s))
}

function withMark(label, fn) {
  const offset = mark(stack, label)
  const result = fn()
  return { result, log: since(stack, offset) }
}

scenario('SC-M-1-059', 'gh api failure is one note and samples are unchecked', () => {
  const repo = forgeRepo('github')
  const before = snapshot(repo)
  const shims = shimDir({ gh: `echo "token ${SECRET}" >&2\necho "HTTP 403" >&2\nexit 1` })
  const { result: t, log } = withMark('SC-M-1-059', () => preflight(repo, ['--mode', 'pr'], pathWith(shims)))
  oneLine(t)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.notes.length, 1, JSON.stringify(t.json.notes))
  assert.ok(t.json.notes[0].startsWith('rules unknown on github:'), t.json.notes[0])
  assert.ok(t.json.notes[0].includes('403'), t.json.notes[0])
  allUnchecked(t)
  noSecret(t, log)
  assert.equal(snapshot(repo), before)
})

scenario('SC-M-1-060', 'gh absent from PATH gives one note and unchecked samples', () => {
  const repo = forgeRepo('github')
  const before = snapshot(repo)
  const { result: t, log } = withMark('SC-M-1-060', () => preflight(repo, ['--mode', 'stack'], restrictedPath()))
  oneLine(t)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.notes.length, 1, JSON.stringify(t.json.notes))
  assert.equal(t.json.samples.length, 3)
  allUnchecked(t)
  noSecret(t, log)
  assert.deepEqual(requests(stack, 'gh'), [])
  assert.equal(snapshot(repo), before)
})

scenario('SC-M-1-061', 'glab failure or absence gives one rules unknown note', () => {
  const failing = shimDir({ glab: `echo "token ${SECRET}" >&2\necho "HTTP 401" >&2\nexit 1` })
  for (const variant of ['failing', 'absent']) {
    const repo = forgeRepo('gitlab')
    const before = snapshot(repo)
    const env = variant === 'failing' ? pathWith(failing) : restrictedPath()
    const { result: t, log } = withMark(`SC-M-1-061-${variant}`, () => preflight(repo, ['--mode', 'stack'], env))
    oneLine(t)
    assert.equal(t.status, 0, `${variant}: ${t.stdout}`)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.notes.length, 1, `${variant}: ${JSON.stringify(t.json.notes)}`)
    assert.ok(t.json.notes[0].startsWith('rules unknown on gitlab:'), `${variant}: ${t.json.notes[0]}`)
    allUnchecked(t)
    noSecret(t, log)
    assert.equal(snapshot(repo), before)
  }
})

scenario('SC-M-1-062', 'glab success without a rule is not a read failure', () => {
  const variants = [
    ['null', 'null', true],
    ['empty object', '{}', true],
    ['empty regex', '{"branch_name_regex":""}', true],
    ['not json', 'this is not json', false],
  ]
  for (const [label, body, clean] of variants) {
    const repo = forgeRepo('gitlab')
    const before = snapshot(repo)
    const calls = path.join(stack.dirs.root, `glab-calls-${++shimCounter}.log`)
    const shims = shimDir({ glab: `echo "$@" >> "${calls}"\nprintf '%s' '${body}'` })
    const { result: t, log } = withMark(`SC-M-1-062-${label}`, () => preflight(repo, ['--mode', 'stack'], pathWith(shims)))
    oneLine(t)
    assert.equal(t.status, 0, `${label}: ${t.stdout}`)
    assert.equal(t.json.ok, true)
    if (clean) {
      assert.deepEqual(t.json.rules, [], label)
      assert.deepEqual(t.json.notes, [], label)
      for (const s of t.json.samples) assert.notEqual(s.result, 'unchecked', `${label}: ${JSON.stringify(s)}`)
    } else {
      assert.equal(t.json.notes.length, 1, label)
      assert.ok(t.json.notes[0].startsWith('rules unknown on gitlab:'), t.json.notes[0])
      allUnchecked(t)
    }
    const lines = fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean)
    assert.deepEqual(lines, ['api projects/:fullpath/push_rule'], `${label}: ${JSON.stringify(lines)}`)
    assert.equal(snapshot(repo), before)
    void log
  }
})

scenario('SC-M-1-063', 'a pattern Python cannot compile is unevaluated, never a block', () => {
  const patterns = [
    ['(?<=a)b{', true],
    ['[', false],
    ['(?P<n>x)(?P<n>y)', false],
  ]
  for (const [pattern, compiles] of patterns) {
    const repo = forgeRepo('gitlab')
    const before = snapshot(repo)
    const body = JSON.stringify({ branch_name_regex: pattern })
    const shims = shimDir({ glab: `echo "token ${SECRET}" >&2\nprintf '%s' '${body.replace(/'/g, "'\\''")}'` })
    const { result: t, log } = withMark('SC-M-1-063', () => preflight(repo, ['--mode', 'stack'], pathWith(shims)))
    oneLine(t)
    noSecret(t, log)
    assert.equal(snapshot(repo), before)
    if (compiles) {
      assert.ok(!t.json.notes.some((n) => n.startsWith('cannot evaluate')), `${pattern}: ${JSON.stringify(t.json.notes)}`)
      assert.ok(t.status === 0 || t.status === 1)
      continue
    }
    assert.equal(t.status, 0, `${pattern}: ${t.stdout}`)
    assert.equal(t.json.ok, true)
    for (const s of t.json.samples) assert.equal(s.result, 'unevaluated', JSON.stringify(s))
    assert.ok(t.json.notes.length >= 1)
    for (const n of t.json.notes) {
      assert.ok(n.startsWith('cannot evaluate'), n)
      assert.ok(n.includes('push rule'), n)
    }
  }
})

function ghBodyScript(body, { stderr = '', exitCode = 0 } = {}) {
  return `${stderr ? `echo "${stderr}" >&2\n` : ''}${body}\nexit ${exitCode}`
}

function bigPreflight(repo, env) {
  const started = Date.now()
  const proc = spawnSync('python3', [path.join(skillDir, 'branches.py'), 'preflight', '--repo', repo.dir, '--mode', 'pr'], {
    encoding: 'utf8',
    env: childEnv(stack, env),
    cwd: stack.dirs.root,
    timeout: 150000,
    maxBuffer: 256 * 1024 * 1024,
  })
  let json = null
  try {
    json = JSON.parse(proc.stdout)
  } catch {
    json = null
  }
  return { status: proc.status, stdout: proc.stdout || '', stderr: proc.stderr || '', json, durationMs: Date.now() - started, error: proc.error }
}

scenario('SC-M-1-064', 'slow, huge and invalid gh answers finish with a bounded note', () => {
  const variants = [
    ['stall 120s', ghBodyScript(`sleep 120`, { stderr: `token ${SECRET}` })],
    ['10 MB body', ghBodyScript(`head -c 10485760 /dev/zero | tr '\\0' 'A'`, { stderr: `token ${SECRET}` })],
    ['50 MB body', ghBodyScript(`head -c 52428800 /dev/zero | tr '\\0' 'A'`, { stderr: `token ${SECRET}` })],
    ['invalid json', ghBodyScript(`printf '%s' '{oops'`, { stderr: `token ${SECRET}` })],
    ['10 MB stderr failure', `echo "token ${SECRET}" >&2\nhead -c 10485760 /dev/zero | tr '\\0' 'E' >&2\nexit 1`],
  ]
  for (const [label, script] of variants) {
    const repo = forgeRepo('github')
    const before = snapshot(repo)
    const shims = shimDir({ gh: script })
    const { result: t, log } = withMark(`SC-M-1-064-${label}`, () => bigPreflight(repo, pathWith(shims)))
    assert.notEqual(t.status, null, `${label}: process did not finish (killed by the 170s tool limit)`)
    oneJson(t)
    assert.equal(t.status, 0, `${label}: ${t.stdout.slice(0, 300)}`)
    assert.equal(t.json.ok, true, label)
    assert.ok(t.json.notes.length >= 1, label)
    allUnchecked(t)
    noSecret(t, log)
    for (const n of t.json.notes) assert.ok(n.length < 2000, `${label}: note has ${n.length} characters`)
    assert.ok(t.stdout.length < 20000, `${label}: stdout has ${t.stdout.length} characters`)
    assert.equal(snapshot(repo), before)
  }
})

scenario('SC-M-1-065', 'odd gh answers never crash', () => {
  const variants = [
    ['not found object', `printf '%s' '{"message":"Not Found"}'`],
    ['odd list', `printf '%s' '[null, 3, {"type":"branch_name_pattern"}]'`],
  ]
  for (const [label, body] of variants) {
    const repo = forgeRepo('github')
    const before = snapshot(repo)
    const shims = shimDir({ gh: ghBodyScript(body, { stderr: `token ${SECRET}` }) })
    const { result: t, log } = withMark(`SC-M-1-065-${label}`, () => preflight(repo, ['--mode', 'pr'], pathWith(shims)))
    oneLine(t)
    assert.ok(t.status === 0 || t.status === 1, `${label}: exit ${t.status}`)
    assert.equal(typeof t.json.ok, 'boolean')
    noSecret(t, log)
    assert.equal(snapshot(repo), before)
  }
})

function prepareSdlcRepo({ remote = true, branches = [], slices = [{ id: 'S-001', status: 'todo' }], config = {} } = {}) {
  const repo = gitRepo(stack, {
    files: {
      '.sdlc/config.json': { gitMode: 'direct', forge: 'github', defaultBranch: 'main', commands: {}, ...config },
      '.sdlc/slices.json': slices,
      '.sdlc/log.jsonl': '{"event":"start"}\n',
    },
    branches,
  })
  if (remote) {
    const bare = path.join(stack.dirs.repos, `bare-${shimCounter++}.git`)
    sh(stack, REAL_GIT, ['init', '-q', '--bare', '-b', 'main', bare])
    repo.git('remote', 'add', 'origin', bare)
    repo.git('push', '-q', 'origin', 'main')
    repo.remote = bare
  }
  return repo
}

function remoteState(repo) {
  return sh(stack, REAL_GIT, ['-C', repo.dir, 'ls-remote', 'origin']).stdout
}

function noForgeCalls() {
  assert.deepEqual(requests(stack, 'gh'), [])
  assert.deepEqual(requests(stack, 'glab'), [])
}

function lockedShims() {
  return shimDir({
    gh: `echo gh >> "${stack.dirs.logs}/forge-calls.log"`,
    glab: `echo glab >> "${stack.dirs.logs}/forge-calls.log"`,
  })
}

function forgeCallLog() {
  try {
    return fs.readFileSync(path.join(stack.dirs.logs, 'forge-calls.log'), 'utf8')
  } catch {
    return ''
  }
}

scenario('SC-M-1-066', 'bad config never crashes a script', () => {
  const fixtures = {
    'unreadable config': (repo) => {
      fs.chmodSync(path.join(repo.dir, '.sdlc/config.json'), 0o000)
    },
    'config is a directory': (repo) => {
      const p = path.join(repo.dir, '.sdlc/config.json')
      fs.rmSync(p)
      fs.mkdirSync(p)
    },
    'config symlink loop': (repo) => {
      const p = path.join(repo.dir, '.sdlc/config.json')
      fs.rmSync(p)
      fs.symlinkSync('config.json', p)
    },
    'bad branchFormat': (repo) => {
      fs.writeFileSync(path.join(repo.dir, '.sdlc/config.json'), JSON.stringify({ gitMode: 'direct', branchFormat: 'x y/{name}{' }))
    },
  }
  const problems = []
  for (const [label, mutate] of Object.entries(fixtures)) {
    const repo = prepareSdlcRepo({ slices: [{ id: 'S-001', status: 'done' }] })
    const verifyName = api(stack, 'branches.py', ['name', '--repo', repo.dir, '--kind', 'verify', '--id', 'S-001', '--round', '1', '--profile', 'qa', '--part', '1']).json
    const verify = verifyName && verifyName.branch
    if (verify) repo.git('branch', verify)
    mutate(repo)
    const refsBefore = refsOf(repo)
    const remoteBefore = remoteState(repo)
    const shims = lockedShims()
    const env = pathWith(shims)
    const commands = {
      name: () => api(stack, 'branches.py', ['name', '--repo', repo.dir, '--kind', 'slice', '--id', 'S-001'], { env }),
      janitor: () => api(stack, 'janitor.py', ['--repo', repo.dir], { env }),
      'next-action': () => api(stack, 'next-action.py', ['--repo', repo.dir], { env }),
      'state-write status': () => api(stack, 'state-write.py', ['status', '--repo', repo.dir], { env }),
    }
    for (const [cmd, run] of Object.entries(commands)) {
      const beforeFiles = JSON.stringify(walk(repo.dir))
      const t = run()
      const where = `${label} / ${cmd}`
      const check = (cond, msg) => {
        if (!cond) problems.push(`${where}: ${msg}`)
      }
      check(!t.stderr.includes('Traceback') && !t.stdout.includes('Traceback'), `Traceback: ${(t.stderr + t.stdout).slice(0, 300)}`)
      check(t.json !== null, `stdout is not one JSON object: ${t.stdout.slice(0, 200)} | ${t.stderr.slice(0, 200)}`)
      if (cmd === 'name') check(t.status === 0 || t.status === 2, `exit ${t.status}`)
      if (cmd === 'janitor' && t.json) check(Array.isArray(t.json.removedBranches) && t.json.removedBranches.length === 0, `removed ${JSON.stringify(t.json.removedBranches)}`)
      if (cmd === 'next-action' && t.json) check(t.json.next && typeof t.json.next.action === 'string', `no action: ${t.stdout.slice(0, 200)}`)
      check(JSON.stringify(walk(repo.dir)) === beforeFiles, `files changed: ${JSON.stringify(Object.keys(walk(repo.dir)).filter((k) => walk(repo.dir)[k] !== JSON.parse(beforeFiles)[k] || !(k in JSON.parse(beforeFiles))))}`)
      check(JSON.stringify(refsOf(repo)) === JSON.stringify(refsBefore), 'refs changed')
    }
    if (verify && !refsOf(repo).includes(verify)) problems.push(`${label}: janitor deleted ${verify}`)
    if (remoteState(repo) !== remoteBefore) problems.push(`${label}: remote changed`)
    if (forgeCallLog() !== '') problems.push(`${label}: forge called: ${forgeCallLog()}`)
    noForgeCalls()
    try { fs.chmodSync(path.join(repo.dir, '.sdlc/config.json'), 0o644) } catch {}
  }
  assert.deepEqual(problems, [])
})

scenario('SC-M-1-067', 'bad repo paths are bad input, not crashes', () => {
  const problems = []
  const commands = (repoPath) => ({
    name: ['branches.py', ['name', '--repo', repoPath, '--kind', 'slice', '--id', 'S-001']],
    parse: ['branches.py', ['parse', '--repo', repoPath, '--branch', 'sdlc/S-001']],
    list: ['branches.py', ['list', '--repo', repoPath, '--kind', 'slice']],
    preflight: ['branches.py', ['preflight', '--repo', repoPath, '--mode', 'pr']],
  })
  const file = path.join(stack.dirs.repos, 'plain-file.txt')
  fs.writeFileSync(file, 'x')
  const fancy = path.join(stack.dirs.repos, 're po é ü 日本')
  fs.mkdirSync(fancy, { recursive: true })
  sh(stack, REAL_GIT, ['init', '-q', '-b', 'main'], { cwd: fancy })
  fs.writeFileSync(path.join(fancy, 'a.txt'), 'a')
  sh(stack, REAL_GIT, ['add', '-A'], { cwd: fancy })
  sh(stack, REAL_GIT, ['commit', '-q', '-m', 'init'], { cwd: fancy })
  const corrupt = gitRepo(stack)
  fs.writeFileSync(path.join(corrupt.dir, '.git', 'HEAD'), 'garbage not a ref\n')
  const cases = {
    nonexistent: { p: path.join(stack.dirs.repos, 'does-not-exist'), expect: 'bad' },
    'a file': { p: file, expect: 'bad' },
    'spaces and unicode': { p: fancy, expect: 'ok' },
    'corrupt HEAD': { p: corrupt.dir, expect: 'either' },
  }
  for (const [label, { p, expect }] of Object.entries(cases)) {
    const before = fs.existsSync(p) && fs.statSync(p).isDirectory() ? JSON.stringify(walk(p)) : null
    const headBefore = fs.existsSync(path.join(p, '.git/HEAD')) ? fs.readFileSync(path.join(p, '.git/HEAD'), 'utf8') : null
    for (const [cmd, [script, args]] of Object.entries(commands(p))) {
      const t = api(stack, script, args)
      const where = `${label} / ${cmd}`
      const check = (cond, msg) => {
        if (!cond) problems.push(`${where}: ${msg}`)
      }
      check(!t.stderr.includes('Traceback') && !t.stdout.includes('Traceback'), `Traceback: ${(t.stderr + t.stdout).slice(0, 300)}`)
      check(t.json !== null && t.stdout.trim().split('\n').length === 1, `not one JSON object: ${t.stdout.slice(0, 200)} | ${t.stderr.slice(0, 200)}`)
      if (!t.json) continue
      if (expect === 'bad') check(t.status === 2 && t.json.ok === false && typeof t.json.error === 'string', `exit ${t.status}: ${t.stdout.slice(0, 200)}`)
      if (expect === 'ok') check(t.status === 0 && t.json.ok === true, `exit ${t.status}: ${t.stdout.slice(0, 200)}`)
      if (expect === 'either' && cmd === 'list') check((t.status === 2 && t.json.ok === false) || (t.status !== 2 && Array.isArray(t.json.notes) && t.json.notes.length > 0), `exit ${t.status} with no error and no note: ${t.stdout.slice(0, 200)}`)
    }
    if (before !== null) assert.equal(JSON.stringify(walk(p)), before, `${label}: files changed`)
    if (headBefore !== null) assert.equal(fs.readFileSync(path.join(p, '.git/HEAD'), 'utf8'), headBefore)
  }
  assert.deepEqual(problems, [])
})

scenario('SC-M-1-068', 'janitor reports refused branch deletes and removes only what git removed', () => {
  const realGit = REAL_GIT
  const makeRepo = () => {
    const repo = prepareSdlcRepo({
      remote: false,
      slices: [{ id: 'S-001', status: 'done' }, { id: 'S-002', status: 'done' }],
    })
    const names = ['S-001', 'S-002'].map((id) => api(stack, 'branches.py', ['name', '--repo', repo.dir, '--kind', 'verify', '--id', id, '--round', '1', '--profile', 'qa', '--part', '1']).json.branch)
    for (const n of names) repo.git('branch', n)
    return { repo, names }
  }
  {
    const { repo, names } = makeRepo()
    const shims = shimDir({
      git: `case "$*" in *"branch -D ${names[0]}"*) echo "fatal: injected refusal for ${names[0]}" >&2; exit 1;; esac\nexec ${realGit} "$@"`,
    })
    const slicesBefore = fs.readFileSync(path.join(repo.dir, '.sdlc/slices.json'), 'utf8')
    const logBefore = fs.readFileSync(path.join(repo.dir, '.sdlc/log.jsonl'), 'utf8')
    const t = api(stack, 'janitor.py', ['--repo', repo.dir], { env: pathWith(shims) })
    oneJson(t)
    assert.deepEqual(t.json.removedBranches, [names[1]], t.stdout)
    assert.ok(refsOf(repo).includes(names[0]))
    assert.ok(!refsOf(repo).includes(names[1]))
    assert.ok(t.json.notes.some((n) => n.includes(names[0]) && n.includes('injected refusal')), JSON.stringify(t.json.notes))
    assert.equal(fs.readFileSync(path.join(repo.dir, '.sdlc/slices.json'), 'utf8'), slicesBefore)
    assert.equal(fs.readFileSync(path.join(repo.dir, '.sdlc/log.jsonl'), 'utf8'), logBefore)
  }
  {
    const { repo, names } = makeRepo()
    const shims = shimDir({
      git: `case "$*" in *for-each-ref*) echo "fatal: injected for-each-ref failure" >&2; exit 1;; esac\nexec ${realGit} "$@"`,
    })
    const refsBefore = refsOf(repo)
    const t = api(stack, 'janitor.py', ['--repo', repo.dir], { env: pathWith(shims) })
    oneJson(t)
    assert.deepEqual(t.json.removedBranches, [])
    assert.ok(t.json.notes.length >= 1)
    assert.ok(t.json.notes.some((n) => n.includes('injected for-each-ref failure')), JSON.stringify(t.json.notes))
    assert.deepEqual(refsOf(repo), refsBefore)
    for (const n of names) assert.ok(refsOf(repo).includes(n))
  }
})

scenario('SC-M-1-069', 'git check-ref-format failing never yields a passing verdict', () => {
  const repo = forgeRepo(undefined)
  const before = snapshot(repo)
  const shims = shimDir({
    git: `for a in "$@"; do [ "$a" = check-ref-format ] && { echo "fatal: injected check-ref-format failure" >&2; exit 128; }; done\nexec ${REAL_GIT} "$@"`,
  })
  const { result: t, log } = withMark('SC-M-1-069', () => preflight(repo, ['--mode', 'pr'], pathWith(shims)))
  oneLine(t)
  noSecret(t, log)
  const text = t.stdout
  noHomePath(text)
  if (t.status === 2) {
    assert.equal(t.json.ok, false)
    assert.equal(typeof t.json.error, 'string')
  } else {
    assert.ok(Array.isArray(t.json.notes) && t.json.notes.length >= 1, text)
    assert.notEqual(t.json.ok && t.json.samples.some((s) => s.result === 'pass'), true, text)
    allUnchecked(t)
  }
  assert.equal(snapshot(repo), before)
})

scenario('SC-M-1-070', 'mid-rebase and locked index give errors, not tracebacks', () => {
  const problems = []
  const fixtures = {
    'rebase in progress': (repo) => fs.mkdirSync(path.join(repo.dir, '.git/rebase-merge')),
    'locked index': (repo) => fs.writeFileSync(path.join(repo.dir, '.git/index.lock'), ''),
  }
  for (const [label, mutate] of Object.entries(fixtures)) {
    const repo = prepareSdlcRepo()
    mutate(repo)
    const remoteBefore = remoteState(repo)
    const shims = lockedShims()
    const env = pathWith(shims)
    const refsBefore = sh(stack, REAL_GIT, ['-C', repo.dir, 'for-each-ref']).stdout
    const filesBefore = JSON.stringify(walk(repo.dir))
    const gitInternals = () => [fs.existsSync(path.join(repo.dir, '.git/rebase-merge')), fs.existsSync(path.join(repo.dir, '.git/index.lock'))]
    const next = api(stack, 'next-action.py', ['--repo', repo.dir], { env })
    const nextOk = next.json && next.json.next && typeof next.json.next.action === 'string'
    if (!nextOk || next.stderr.includes('Traceback')) problems.push(`${label} / next-action: ${next.stdout.slice(0, 200)} | ${next.stderr.slice(0, 200)}`)
    if (JSON.stringify(walk(repo.dir)) !== filesBefore) problems.push(`${label} / next-action: files changed`)
    const sw = api(stack, 'state-write.py', ['patch-slice', '--repo', repo.dir, '--slice', 'S-001'], { env, input: JSON.stringify({ status: 'in_progress' }) })
    if (sw.stderr.includes('Traceback') || sw.stdout.includes('Traceback')) problems.push(`${label} / state-write: Traceback`)
    if (sw.json === null) problems.push(`${label} / state-write: not JSON: ${sw.stdout.slice(0, 200)}`)
    else {
      if (sw.status !== 2 || sw.json.ok !== false) problems.push(`${label} / state-write: expected exit 2 and ok false, got exit ${sw.status}: ${sw.stdout.slice(0, 300)}`)
      else {
        noHomePath(sw.stdout)
        if (typeof sw.json.error !== 'string' || !sw.json.error) problems.push(`${label} / state-write: no error text`)
      }
      if (sw.status === 2 && JSON.stringify(walk(repo.dir)) !== filesBefore) problems.push(`${label} / state-write: files changed after failure`)
      if (sw.status === 2 && sh(stack, REAL_GIT, ['-C', repo.dir, 'for-each-ref']).stdout !== refsBefore) problems.push(`${label} / state-write: refs changed after failure`)
    }
    void gitInternals
    if (remoteState(repo) !== remoteBefore) problems.push(`${label}: remote changed`)
    if (forgeCallLog() !== '') problems.push(`${label}: forge called`)
    noForgeCalls()
  }
  assert.deepEqual(problems, [])
})

scenario('SC-M-1-082', 'unknown forge rules still fail a bad ref name', () => {
  const shims = shimDir({ gh: `echo "HTTP 500" >&2\nexit 1` })
  const env = pathWith(shims)
  {
    const repo = forgeRepo('github')
    const before = snapshot(repo)
    const t = preflight(repo, ['--mode', 'mr', '--branch', 'bad..name'], env)
    oneLine(t)
    assert.equal(t.status, 1, t.stdout)
    assert.equal(t.json.ok, false)
    const working = t.json.samples.find((s) => s.kind === 'working')
    assert.ok(working, t.stdout)
    assert.equal(working.result, 'fail')
    assert.equal(working.rule, 'git check-ref-format')
    assert.equal(t.json.notes.length, 1, JSON.stringify(t.json.notes))
    assert.ok(t.json.notes[0].startsWith('rules unknown on github:'), t.json.notes[0])
    assert.equal(snapshot(repo), before)
  }
  {
    const repo = forgeRepo('github')
    const before = snapshot(repo)
    const t = preflight(repo, ['--mode', 'mr', '--branch', 'feat/ok'], env)
    oneLine(t)
    assert.equal(t.status, 0, t.stdout)
    assert.equal(t.json.ok, true)
    const working = t.json.samples.find((s) => s.kind === 'working')
    assert.ok(working, t.stdout)
    assert.equal(working.result, 'unchecked')
    assert.equal(snapshot(repo), before)
  }
})

scenario('SC-M-1-084', 'a rule of unknown kind is noted and samples stay unevaluated', () => {
  const repo = forgeRepo('github')
  const before = snapshot(repo)
  const body = JSON.stringify([{ type: 'branch_name_pattern', parameters: { operator: 'equals', pattern: 'x', negate: false } }])
  const shims = shimDir({ gh: `printf '%s' '${body}'` })
  const t = preflight(repo, ['--mode', 'pr'], pathWith(shims))
  oneLine(t)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(t.json.ok, true)
  for (const s of t.json.samples) assert.equal(s.result, 'unevaluated', JSON.stringify(s))
  assert.equal(t.json.notes.length, 1, JSON.stringify(t.json.notes))
  assert.ok(t.json.notes[0].startsWith('cannot evaluate'), t.json.notes[0])
  assert.ok(t.json.notes[0].includes('equals'), t.json.notes[0])
  assert.equal(snapshot(repo), before)
})
