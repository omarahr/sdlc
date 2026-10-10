import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const { measure, sizeOf, environment, summarize } = await import(`${WT}/skills/sdlc/test/testkit/measure.mjs`)
const BRANCHES = `${WT}/skills/sdlc/branches.py`
const SECRET = 'ghp_SECRET123'
const NOTE_LIMIT = 200
const STDOUT_LIMIT = 20000
const PREFIX = 'rules unknown on github: '

function repo() {
  const d = mkdtempSync(join(tmpdir(), 'vl-repo-'))
  execFileSync('git', ['init', '-q', d])
  mkdirSync(join(d, '.sdlc'))
  writeFileSync(join(d, '.sdlc/config.json'), JSON.stringify({ gitMode: 'pr', forge: 'github', defaultBranch: 'main' }))
  return d
}

function shim(script) {
  const d = mkdtempSync(join(tmpdir(), 'vl-shim-'))
  writeFileSync(join(d, 'gh'), `#!/bin/sh\n${script}\n`)
  chmodSync(join(d, 'gh'), 0o755)
  return d
}

function preflight(r, bin, extraEnv = {}) {
  const res = spawnSync('python3', [BRANCHES, 'preflight', '--repo', r, '--mode', 'pr'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: tmpdir(),
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...extraEnv },
  })
  return res
}

function notesOf(res) {
  const out = JSON.parse(res.stdout)
  return out
}

const bigStderr = (kind) => {
  const mid = 'x'.repeat(5 * 1024 * 1024)
  if (kind === 'first') return `token ${SECRET}\n${'x'.repeat(10 * 1024 * 1024)}\nHTTP 403\n`
  if (kind === 'last') return `${'x'.repeat(10 * 1024 * 1024)}\ntoken ${SECRET}\n`
  return `${mid}\ntoken ${SECRET}\n${mid}\nHTTP 403\n`
}

for (const kind of ['first', 'middle', 'last']) {
  test(`verify limits: 10 MB gh stderr, secret ${kind}, note under ${NOTE_LIMIT} and stdout under ${STDOUT_LIMIT}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'vl-err-'))
    writeFileSync(join(dir, 'err'), bigStderr(kind))
    const bin = shim(`cat "${dir}/err" >&2\nexit 1`)
    const res = preflight(repo(), bin)
    assert.equal(res.status, 0, res.stderr.slice(0, 500))
    const out = notesOf(res)
    const blob = res.stdout + res.stderr
    assert.ok(!blob.includes(SECRET))
    const notes = out.notes ?? out.rules_notes ?? []
    const all = JSON.stringify(out)
    const m = [...all.matchAll(/rules unknown on github: [^"]*/g)].map((x) => x[0])
    assert.equal(m.length >= 1, true, all.slice(0, 500))
    const unique = new Set(m)
    assert.equal(unique.size, 1)
    for (const n of unique) assert.ok(n.length < NOTE_LIMIT, String(n.length))
    assert.ok(res.stdout.length < STDOUT_LIMIT, String(res.stdout.length))
    assert.ok(res.stderr.length < STDOUT_LIMIT, 'stderr ' + res.stderr.length)
    globalThis.__last = { note: [...unique][0], stdoutChars: res.stdout.length, stderrChars: res.stderr.length, ok: out.ok }
    console.log(JSON.stringify({ kind, ...globalThis.__last }))
  })
}

test('verify limits: stdout and note sizes do not grow with stderr size (1 KB, 1 MB, 10 MB)', () => {
  const sizes = []
  for (const n of [1024, 1024 * 1024, 10 * 1024 * 1024]) {
    const dir = mkdtempSync(join(tmpdir(), 'vl-err-'))
    writeFileSync(join(dir, 'err'), `token ${SECRET}\n${'x'.repeat(n)}\nHTTP 403\n`)
    const res = preflight(repo(), shim(`cat "${dir}/err" >&2\nexit 1`))
    sizes.push(res.stdout.length)
  }
  assert.equal(new Set(sizes).size, 1, JSON.stringify(sizes))
  console.log(JSON.stringify({ sizes }))
})

test('verify limits: median wall time of the 10 MB failure case, 10 runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vl-err-'))
  writeFileSync(join(dir, 'err'), bigStderr('first'))
  const bin = shim(`cat "${dir}/err" >&2\nexit 1`)
  const r = repo()
  const { result, ...stats } = measure(() => preflight(r, bin), { warmup: 2, runs: 10 }) ?? {}
  const s = stats.medianMs !== undefined ? stats : summarize([])
  console.log(JSON.stringify({ env: environment(), s }))
})

test('verify limits: slow gh stalls past FORGE_TIMEOUT gives a one-line note under the limit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vl-err-'))
  const bin = shim(`sleep 30`)
  const code = `
import sys, json, importlib.util
spec = importlib.util.spec_from_file_location('b', '${BRANCHES}')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.FORGE_TIMEOUT = 1
import time
t = time.time()
print(json.dumps(m.read_rules(sys.argv[1], ['sdlc/A'])), file=sys.stderr)
print(round(time.time()-t, 2))
`
  const res = spawnSync('python3', ['-c', code, repo()], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, cwd: tmpdir() })
  console.log('timeout-case', res.stdout.trim(), res.stderr.slice(0, 600))
  const got = JSON.parse(res.stderr.trim().split('\n').pop())
  const notes = got.notes ?? got[0]?.notes ?? JSON.stringify(got)
  const text = JSON.stringify(got)
  const m = text.match(/rules unknown on github: [^"]*/)
  assert.ok(m, text)
  assert.ok(m[0].length < NOTE_LIMIT + PREFIX.length)
  assert.ok(!m[0].includes('\\n'))
  assert.ok(Number(res.stdout.trim()) < 5)
})
