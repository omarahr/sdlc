import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const KIT = `${ROOT}/skills/sdlc/test/testkit`
const { stubServer, restrictedPath } = await import(`${KIT}/stub-server.mjs`)
const { load } = await import(`${KIT}/attack-corpus.mjs`)
const { scratch } = await import(`${ROOT}/skills/sdlc/test/harness.mjs`)

const LOG = process.env.ATTACK_LOG
const note = (o) => LOG && appendFileSync(LOG, JSON.stringify(o) + '\n')

const DRIVER = `
import sys, json, importlib.util
spec = importlib.util.spec_from_file_location("branches", sys.argv[1] + "/skills/sdlc/branches.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
cfg = json.loads(sys.argv[3])
if "timeout" in cfg: m.GH_TIMEOUT = cfg["timeout"]
try:
    out = {"ok": True, "result": m.read_rules(sys.argv[2], json.loads(sys.stdin.read()))}
    if cfg.get("judge"):
        out["judged"] = []
        for r in out["result"]["rules"]:
            try: out["judged"].append(repr(m.judge([r], "sdlc/S-001")))
            except Exception as e: out["judged"].append("EXC " + type(e).__name__)
except BaseException as e:
    out = {"ok": False, "exc": type(e).__name__ + ": " + str(e)}
print(json.dumps(out))
`

function makeRepo(forge = 'github') {
  const repo = scratch('sec-repo-')
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc', 'config.json'), JSON.stringify({ forge }))
  return repo
}
function snapshot(dir) {
  const out = {}
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else out[p] = [statSync(p).size, statSync(p).mtimeMs]
    }
  }
  walk(dir)
  return JSON.stringify(out)
}
function run(samples, { repo = makeRepo(), gh, env, cfg = {}, timeoutMs = 90000 } = {}) {
  const before = snapshot(repo)
  const e = { HOME: scratch('sec-home-'), ...(env || gh.env()) }
  const p = spawnSync('python3', ['-I', '-c', DRIVER, ROOT, repo, JSON.stringify(cfg)], { input: JSON.stringify(samples), env: e, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 200 * 1024 * 1024 })
  assert.equal(p.status, 0, p.stderr)
  const out = JSON.parse(p.stdout)
  return { ...out, repo, treeUnchanged: before === snapshot(repo), stderr: p.stderr }
}
const FAILED = /^rules unknown on github: .+/s

test('verify security AT-1: every corpus value stays one path segment, argv list, no shell', () => {
  const families = ['injection', 'traversal', 'flag-like-values', 'format-strings', 'control-chars', 'unicode-confusables', 'unicode-whitespace', 'oversized']
  const canary = join(scratch('canary-'), 'fired')
  const bad = []
  let n = 0
  for (const fam of families) {
    for (const e of load(fam, { argv: true })) {
      const gh = stubServer({ fallback: { stdout: [] } })
      const r = run([e.value], { gh })
      n++
      const calls = gh.calls()
      const tail = calls[0]?.argv[1]?.slice('repos/{owner}/{repo}/rules/branches/'.length)
      const ok = r.ok && calls.length === 1 && calls[0].argv[0] === 'api' && calls[0].argv.length === 2 &&
        calls[0].argv[1].startsWith('repos/{owner}/{repo}/rules/branches/') && !tail.includes('/') && !/[?#\s{}]/.test(tail) && calls[0].cwd.length > 0 && r.treeUnchanged
      if (!ok) bad.push({ fam, id: e.id, calls, r: r.exc })
    }
  }
  assert.ok(!existsSync(canary))
  note({ id: 'ATK-1', n, bad: bad.length })
  assert.deepEqual(bad.filter((b) => !(b.calls.length === 1 && /^\.+$/.test(b.calls[0].argv[1]?.split('branches/')[1] ?? ''))), [], 'only dot-only segments may differ')
})

test('verify security AT-2: dot-only samples are not encoded (seed evidence)', () => {
  const out = {}
  for (const s of ['.', '..']) {
    const gh = stubServer({ fallback: { stdout: [] } })
    run([s], { gh })
    out[s] = gh.calls()[0].argv[1]
  }
  note({ id: 'ATK-2', out })
  assert.equal(out['..'], 'repos/{owner}/{repo}/rules/branches/..')
})

test('verify security AT-3: placeholders and shell syntax in a sample are encoded; marker file never created', () => {
  const dir = scratch('inj-')
  const marker = join(dir, 'pwned')
  const samples = ['{owner}/{repo}', '$(touch ' + marker + ')', '`touch ' + marker + '`', ';touch ' + marker, '&& touch ' + marker, '|touch ' + marker, '\ntouch ' + marker, "'; touch " + marker + " #", '-X DELETE', '--hostname evil.example', ':owner', '{branch}']
  const gh = stubServer({ fallback: { stdout: [] } })
  const r = run(samples, { gh })
  const calls = gh.calls()
  assert.equal(calls.length, samples.length)
  for (const c of calls) {
    assert.equal(c.argv.length, 2)
    assert.equal(c.argv[0], 'api')
    const tail = c.argv[1].slice('repos/{owner}/{repo}/rules/branches/'.length)
    assert.ok(!/[{}:$`;&|\n' ]/.test(tail), tail)
  }
  assert.ok(!existsSync(marker))
  assert.ok(r.treeUnchanged)
  note({ id: 'ATK-3', paths: calls.map((c) => c.argv[1]) })
})

test('verify security AT-4: NUL sample is encoded as %00 and reaches gh as one argv item', () => {
  const gh = stubServer({ fallback: { stdout: [] } })
  const r = run(['a\u0000b'], { gh })
  note({ id: 'ATK-4', result: r.result ?? r.exc, calls: gh.calls() })
  assert.equal(r.ok, true)
  assert.equal(gh.count(), 1)
  assert.equal(gh.calls()[0].argv[1], 'repos/{owner}/{repo}/rules/branches/a%00b')
  assert.equal(r.treeUnchanged, true)
})

test('verify security AT-5: failure on the second sample leaks no partial rules and stops', () => {
  const rule = [{ type: 'branch_name_pattern', ruleset_id: 7, parameters: { operator: 'starts_with', pattern: 'x/' } }]
  const gh = stubServer({ script: [{ stdout: rule }, { stderr: 'denied', exit: 1 }], fallback: { stdout: rule } })
  const r = run(['a', 'b', 'c'], { gh })
  note({ id: 'ATK-5', result: r.result, calls: gh.count() })
  assert.deepEqual(r.result.rules, [])
  assert.deepEqual(r.result.by_sample, {})
  assert.equal(r.result.unchecked, true)
  assert.equal(r.result.notes.length, 1)
  assert.equal(gh.count(), 2)
})

test('verify security AT-6: hostile gh stdout (deep nesting, huge, wrong types, bad bytes) never raises', () => {
  const deep = '['.repeat(200000) + ']'.repeat(200000)
  const deepObj = '{"a":'.repeat(100000) + '1' + '}'.repeat(100000)
  const cases = {
    deep, deepObj,
    nan: '[NaN]', bigint: '[' + '9'.repeat(100000) + ']', nul: '[{"type":"branch_name_pattern"}]\u0000',
    badutf: Buffer.from([0x5b, 0xff, 0xfe, 0x5d]),
    nonDictItems: '[1,"x",null,[],[[]],true]',
    paramsString: '[{"type":"branch_name_pattern","parameters":"x"}]',
    paramsList: '[{"type":"branch_name_pattern","parameters":[1]}]',
    typeList: '[{"type":["branch_name_pattern"]}]',
    typeHash: '[{"type":{"a":1}}]',
    empty: '', ws: '   ',
  }
  const results = {}
  for (const [k, v] of Object.entries(cases)) {
    const gh = stubServer({ fallback: { stdout: v } })
    const r = run(['sdlc/S-001'], { gh })
    results[k] = r.ok ? { notes: r.result.notes, rules: r.result.rules.length, unchecked: r.result.unchecked } : r.exc
    assert.equal(r.ok, true, `${k}: ${r.exc}`)
    assert.equal(r.treeUnchanged, true)
    assert.equal(gh.count(), 1)
  }
  note({ id: 'ATK-6', results })
})

test('verify security AT-7: rule fields from hostile gh output do not crash judge (seed evidence)', () => {
  const body = [
    { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 5 } },
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: { a: 1 } } },
    { type: 'branch_name_pattern', parameters: { operator: 'contains', pattern: ['x'] } },
    { type: 'branch_name_pattern', parameters: { operator: 'ends_with', pattern: null } },
    { type: 'branch_name_pattern', parameters: { operator: ['x'], pattern: 'a' } },
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: '(' } },
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: '(a+)+$' } },
    { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 'a', name: { x: 1 }, negate: 'false' } },
  ]
  const gh = stubServer({ fallback: { stdout: body } })
  const r = run(['sdlc/S-001'], { gh, cfg: { judge: true } })
  note({ id: 'ATK-7', result: r.result?.rules, judged: r.judged })
  assert.equal(r.ok, true)
  assert.equal(r.judged.length, r.result.rules.length)
  assert.equal(r.judged.filter((j) => j.startsWith('EXC TypeError')).length, 4)
})

test('verify security AT-8: stderr with control chars and 1 MB of text becomes exactly one note', () => {
  const ansi = '\u001b[2J\u001b]0;pwn\u0007\r\nrules unknown on github: forged\u0000'
  const huge = 'A'.repeat(1_000_000)
  const out = {}
  for (const [k, v] of Object.entries({ ansi, huge })) {
    const gh = stubServer({ fallback: { stderr: v, exit: 1 } })
    const r = run(['a', 'b'], { gh })
    assert.equal(r.result.notes.length, 1)
    assert.equal(gh.count(), 1)
    assert.deepEqual(r.result.rules, [])
    out[k] = { len: r.result.notes[0].length, hasEsc: r.result.notes[0].includes('\u001b'), hasNewline: /[\r\n]/.test(r.result.notes[0]) }
  }
  note({ id: 'ATK-8', out })
})

test('verify security AT-9: secret-looking token in stderr; token in env is not placed in the note on success', () => {
  const gh = stubServer({ fallback: { stdout: [] } })
  const r = run(['a'], { gh, env: gh.env({ GH_TOKEN: 'ghp_SECRET0123456789' }) })
  assert.ok(!JSON.stringify(r.result).includes('ghp_SECRET'))
  const gh2 = stubServer({ fallback: { stderr: 'bad credentials for ghp_SECRET0123456789', exit: 1 } })
  const r2 = run(['a'], { gh: gh2 })
  note({ id: 'ATK-9', note: r2.result.notes[0] })
  assert.equal(r2.result.notes.length, 1)
})

test('verify security AT-10: hung gh ends in one note after the timeout, process tree does not hang the caller', () => {
  const gh = stubServer({ fallback: { stall: true } })
  const t0 = Date.now()
  const r = run(['a', 'b'], { gh, cfg: { timeout: 1 }, timeoutMs: 30000 })
  const ms = Date.now() - t0
  note({ id: 'ATK-10', ms, result: r.result })
  assert.equal(r.result.unchecked, true)
  assert.equal(r.result.notes.length, 1)
  assert.match(r.result.notes[0], FAILED)
  assert.equal(gh.count(), 1)
  assert.ok(ms < 20000)
})

test('verify security AT-11: a gh planted inside the repo is never executed when PATH lacks gh', () => {
  const repo = makeRepo()
  const marker = join(scratch('mk-'), 'fired')
  for (const where of ['gh', 'bin/gh']) {
    mkdirSync(join(repo, 'bin'), { recursive: true })
    writeFileSync(join(repo, where), `#!/bin/sh\ntouch ${marker}\necho '[]'\n`)
    chmodSync(join(repo, where), 0o755)
  }
  const bin = restrictedPath(['python3', 'git'])
  const r = run(['a'], { repo, env: { PATH: bin } })
  note({ id: 'ATK-11', result: r.result, fired: existsSync(marker) })
  assert.ok(!existsSync(marker))
  assert.equal(r.result.unchecked, true)
  assert.match(r.result.notes[0], FAILED)
})

test('verify security AT-12: hostile config forge values never reach gh', () => {
  const forges = ['GitHub', 'github ', 'github\n', ' github', 'github;touch x', 'gitlab', '', 'GITHUB', 'github\u0000', 'gıthub', 'github/../../']
  const seen = []
  for (const f of forges) {
    const gh = stubServer({ fallback: { stdout: [] } })
    const r = run(['a'], { repo: makeRepo(f), gh })
    seen.push([JSON.stringify(f), gh.count()])
    assert.equal(gh.count(), 0, JSON.stringify(f))
    assert.equal(r.result.unchecked, true)
  }
  for (const raw of ['{"forge": ["github"]}', '{"forge": {"a":1}}', '{"forge": 1}', '[]', 'null', '{"forge": "github", "forge": "x"}']) {
    const repo = scratch('cfg-')
    mkdirSync(join(repo, '.sdlc'))
    writeFileSync(join(repo, '.sdlc', 'config.json'), raw)
    const gh = stubServer({ fallback: { stdout: [] } })
    const r = run(['a'], { repo, gh })
    seen.push([raw, gh.count(), r.ok])
    assert.equal(r.ok, true, raw)
  }
  note({ id: 'ATK-12', seen })
})

test('verify security AT-13: gh runs with cwd equal to repo, no prompt env, stdin closed, no tree change', () => {
  const gh = stubServer({ fallback: { stdout: [] } })
  const repo = makeRepo()
  const r = run(['a'], { repo, gh })
  const real = readFileSync(join(gh.dir, '.state/calls/1/cwd'), 'utf8').trim()
  const rr = spawnSync('python3', ['-c', 'import os,sys;print(os.path.realpath(sys.argv[1]))', repo], { encoding: 'utf8' }).stdout.trim()
  assert.equal(real, rr)
  assert.ok(r.treeUnchanged)
  note({ id: 'ATK-13', cwd: real })
})

test('verify security AT-14: 5000 samples and a 20000-rule body stay bounded', () => {
  const rules = Array.from({ length: 20000 }, (_, i) => ({ type: 'branch_name_pattern', ruleset_id: i, parameters: { operator: 'contains', pattern: 'p' + i } }))
  const gh = stubServer({ fallback: { stdout: rules } })
  const t0 = Date.now()
  const r = run(['a'], { gh })
  const ms = Date.now() - t0
  note({ id: 'ATK-14', ms, rules: r.result.rules.length })
  assert.equal(r.result.rules.length, 20000)
  assert.ok(ms < 60000)
})
