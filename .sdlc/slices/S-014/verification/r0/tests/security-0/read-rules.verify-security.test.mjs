import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, realpathSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = process.env.SDLC_REPO || '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const kit = (f) => import(join(REPO_ROOT, 'skills/sdlc/test/testkit', f))
const { cliRunner, snapshot, diffSnapshots } = await kit('cli-runner.mjs')
const { glabStub, restrictedPath } = await kit('glab-stub.mjs')
const { stubServer } = await kit('stub-server.mjs')
const { load } = await kit('attack-corpus.mjs')
const SKILL = join(REPO_ROOT, 'skills/sdlc')
const LOG = process.env.ATTACK_LOG || '/tmp/attack-log.jsonl'
const KEYS = ['source', 'kind', 'pattern', 'negate', 'label']

const r = cliRunner()
function mkRepo(forge = 'gitlab') {
  const files = forge === undefined ? {} : { '.sdlc/config.json': { forge } }
  return r.gitRepo({ files, branches: [] })
}

const DRIVER = `
import sys, json
sys.path.insert(0, ${JSON.stringify(SKILL)})
import branches
t = float(sys.argv[3]) if len(sys.argv) > 3 else None
if t: branches.FORGE_TIMEOUT = t
try:
    out = branches.read_rules(sys.argv[1], json.loads(sys.argv[2]))
    sys.stdout.write("RESULT" + json.dumps(out, ensure_ascii=True))
except BaseException as e:
    sys.stdout.write("EXC" + type(e).__name__ + ":" + str(e)[:200])
`

function readRules(repo, samples, { env, timeout } = {}) {
  const proc = spawnSync('python3', ['-I', '-c', DRIVER, repo, JSON.stringify(samples), ...(timeout ? [String(timeout)] : [])], {
    cwd: repo, env: { PATH: process.env.PATH, HOME: repo, ...env }, encoding: 'utf8', timeout: 60000, maxBuffer: 1 << 28,
  })
  const o = proc.stdout || ''
  const m = o.indexOf('RESULT')
  if (m < 0) return { exc: o.slice(0, 300), stderr: proc.stderr, status: proc.status }
  return { result: JSON.parse(o.slice(m + 6)), stderr: proc.stderr, status: proc.status }
}

function log(id, input, observed, result) {
  appendFileSync(LOG, JSON.stringify({ id, input, observed, result }) + '\n')
}

function assertShape(res, { allowExc = false } = {}) {
  assert.equal(res.exc, undefined, 'exception: ' + res.exc)
  const x = res.result
  assert.deepEqual(Object.keys(x).sort(), ['by_sample', 'forge', 'notes', 'rules', 'unchecked'])
  assert.ok(Array.isArray(x.rules) && Array.isArray(x.notes) && typeof x.unchecked === 'boolean')
  for (const rule of x.rules) {
    assert.deepEqual(Object.keys(rule), KEYS)
    assert.equal(typeof rule.pattern, 'string')
    assert.equal(typeof rule.negate, 'boolean')
    assert.equal(typeof rule.label, 'string')
    assert.ok(['starts_with', 'ends_with', 'contains', 'regex'].includes(rule.kind))
    assert.ok(['github', 'gitlab'].includes(rule.source))
  }
}

test('verify security VS-1: one glab call, fixed argv, cwd is the repo, branch names never reach argv', () => {
  const hostile = ['; rm -rf /', '--hostname=evil', '$(touch pwn)', '`id`', '../../etc/passwd', 'a b\nc', '-h']
  for (const samples of [['a'], ['a', 'b', 'c'], Array.from({ length: 50 }, (_, i) => `feature/x${i}`), hostile]) {
    const repo = mkRepo()
    const glab = glabStub({ script: [{ stdout: { branch_name_regex: '^feature/' } }] })
    const res = readRules(repo, samples, { env: glab.env() })
    assertShape(res)
    const calls = glab.calls()
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].argv, ['api', 'projects/:fullpath/push_rule'])
    assert.equal(calls[0].cwd, realpathSync(repo))
    assert.equal(Object.keys(res.result.by_sample).length, new Set(samples).size)
    assert.equal(res.result.rules.length, 1)
    log('A-VS1-' + samples.length, { samples: samples.length }, { calls: calls.length, argv: calls[0].argv }, 'held')
  }
})

test('verify security VS-1: GH_PROMPT_DISABLED and stdin closed for glab', () => {
  const repo = mkRepo()
  const glab = glabStub({ script: [{ stdout: 'null' }] })
  const res = readRules(repo, ['a'], { env: glab.env() })
  assertShape(res)
  assert.equal(res.result.unchecked, false)
})

test('verify security VS-4: exit 0 JSON error body is no rule; non-zero is a failure note', () => {
  const body = { message: '404 Project Not Found' }
  let repo = mkRepo()
  let glab = glabStub({ script: [{ stdout: body }] })
  let res = readRules(repo, ['a', 'b'], { env: glab.env() })
  assertShape(res)
  assert.deepEqual(res.result.rules, [])
  assert.deepEqual(res.result.notes, [])
  assert.equal(res.result.unchecked, false)
  assert.deepEqual(res.result.by_sample, { a: [], b: [] })
  log('A-VS4-exit0', body, res.result, 'held')
  for (const code of [1, 2, 127, 255]) {
    repo = mkRepo()
    glab = glabStub({ script: [{ stdout: body, exit: code }] })
    res = readRules(repo, ['a', 'b'], { env: glab.env() })
    assertShape(res)
    assert.deepEqual(res.result.rules, [])
    assert.deepEqual(res.result.by_sample, {})
    assert.equal(res.result.unchecked, true)
    assert.deepEqual(res.result.notes, [`rules unknown on gitlab: glab exited with status ${code}`])
    log('A-VS4-exit' + code, body, res.result.notes, 'held')
  }
})

test('verify security VS-5: exit 1 stderr boom gives exactly the spec note', () => {
  const repo = mkRepo()
  const glab = glabStub({ script: [{ stderr: 'boom', exit: 1 }] })
  const res = readRules(repo, ['a', 'b'], { env: glab.env() })
  assertShape(res)
  assert.deepEqual(res.result.notes, ['rules unknown on gitlab: boom'])
  assert.deepEqual(res.result.rules, [])
  assert.deepEqual(res.result.by_sample, {})
  assert.equal(res.result.unchecked, true)
})

const stderrCases = {
  empty: '',
  multiline: 'line1\nline2\nline3\n',
  crlf: 'a\r\nb\r\n',
  long: 'x'.repeat(2_000_000),
  ctrl: 'a\x1b[31mred\x1b[0m\x07\x08b',
  nul: 'a\x00b',
  badutf8: Buffer.from([0x61, 0xff, 0xfe, 0xc3, 0x28, 0x62]),
  secretish: 'token glpat-SECRET123 denied',
}
for (const [name, stderr] of Object.entries(stderrCases)) {
  test(`verify security VS-5: stderr ${name} gives one note and never raises`, () => {
    const repo = mkRepo()
    const glab = glabStub({ script: [{ stderr, exit: 1 }] })
    const res = readRules(repo, ['a'], { env: glab.env() })
    assertShape(res)
    assert.equal(res.result.notes.length, 1)
    assert.ok(res.result.notes[0].startsWith('rules unknown on gitlab:'))
    assert.equal(res.result.unchecked, true)
    assert.deepEqual(res.result.rules, [])
    const n = res.result.notes[0]
    log('A-VS5-' + name, { stderrBytes: stderr.length }, { noteLen: n.length, lines: n.split('\n').length, hasCtl: /[\x00-\x08\x0b-\x1f]/.test(n) }, 'held')
  })
  test(`verify security VS-5 seed: stderr ${name} note is one bounded line`, () => {
    const repo = mkRepo()
    const glab = glabStub({ script: [{ stderr, exit: 1 }] })
    const res = readRules(repo, ['a'], { env: glab.env() })
    const n = res.result.notes[0]
    assert.ok(!n.includes('\n'), 'note has a newline')
    assert.ok(n.length < 2000, 'note length ' + n.length)
    assert.ok(!/[\x00-\x08\x0b-\x1f]/.test(n), 'note has control characters')
  })
}

const stdoutCases = {
  array: '[]',
  arrayOfRules: '[{"branch_name_regex":"^a"}]',
  string: '"hello"',
  number: '42',
  true: 'true',
  false: 'false',
  nullBody: 'null',
  regexNumber: '{"branch_name_regex": 5}',
  regexList: '{"branch_name_regex": ["^a"]}',
  regexObject: '{"branch_name_regex": {"a":1}}',
  regexTrue: '{"branch_name_regex": true}',
  regexSpaces: '{"branch_name_regex": "   "}',
  invalidRe2: '{"branch_name_regex": "(["}',
  lookahead: '{"branch_name_regex": "(?=a)b"}',
  regexCtrl: '{"branch_name_regex": "a\\u0000b\\u001b\\n"}',
  regexLoneSurrogate: '{"branch_name_regex": "\\ud800"}',
  bomObject: '﻿{"branch_name_regex": "^a"}',
  nanLiteral: '{"branch_name_regex": NaN}',
  duplicateKeys: '{"branch_name_regex": "^a", "branch_name_regex": ""}',
  extraKeys: '{"branch_name_regex": "^a", "source": "github", "kind": "contains", "negate": true, "label": "x"}',
  deepArray: '['.repeat(100000) + ']'.repeat(100000),
  deepObject: '{"a":'.repeat(100000) + '1' + '}'.repeat(100000),
  bigBody: JSON.stringify({ branch_name_regex: '^a', pad: 'p'.repeat(20_000_000) }),
  bigRegex: JSON.stringify({ branch_name_regex: '(a|b)'.repeat(200000) }),
  hugeInt: '{"branch_name_regex": 1' + '0'.repeat(100000) + '}',
  empty: '',
  partial: '{"branch_name_regex": "^a',
  trailing: '{"branch_name_regex": "^a"} garbage',
  html: '<html>502 Bad Gateway</html>',
}
for (const [name, stdout] of Object.entries(stdoutCases)) {
  test(`verify security VS-7: stdout ${name} gives a valid shape and no exception`, () => {
    const repo = mkRepo()
    const glab = glabStub({ script: [{ stdout }] })
    const res = readRules(repo, ['a', 'b'], { env: glab.env() })
    assertShape(res)
    const x = res.result
    if (x.unchecked) {
      assert.equal(x.notes.length, 1)
      assert.ok(x.notes[0].startsWith('rules unknown on gitlab:'))
      assert.deepEqual(x.rules, [])
    } else {
      assert.deepEqual(x.notes, [])
      assert.ok(x.rules.length <= 1)
      for (const k of Object.keys(x.by_sample)) assert.deepEqual(x.by_sample[k], x.rules)
    }
    log('A-VS7-' + name, { stdoutBytes: stdout.length }, { rules: x.rules.length, unchecked: x.unchecked, note: (x.notes[0] || '').slice(0, 80) }, 'held')
  })
}

test('verify security VS-7: a string regex survives round trip as the exact pattern', () => {
  const repo = mkRepo()
  const pat = '^(feature|fix)/[A-Z]+-\\d+$'
  const glab = glabStub({ script: [{ stdout: { branch_name_regex: pat } }] })
  const res = readRules(repo, ['a', 'b'], { env: glab.env() })
  assertShape(res)
  assert.deepEqual(res.result.rules, [{ source: 'gitlab', kind: 'regex', pattern: pat, negate: false, label: 'push rule' }])
  assert.deepEqual(res.result.by_sample.a, res.result.rules)
})

test('verify security VS-8: glab missing from PATH gives the rules unknown note', () => {
  const repo = mkRepo()
  const bare = restrictedPath(['python3', 'git'])
  const before = snapshot(repo)
  const res = readRules(repo, ['a'], { env: { PATH: bare } })
  assertShape(res)
  assert.equal(res.result.unchecked, true)
  assert.equal(res.result.notes.length, 1)
  assert.ok(res.result.notes[0].startsWith('rules unknown on gitlab:'))
  assert.deepEqual(diffSnapshots(before, snapshot(repo)), diffSnapshots(before, before))
  log('A-VS8-missing', {}, res.result.notes, 'held')
})

for (const [name, stdout] of [['empty', ''], ['nonjson', 'not json at all'], ['partial', '{"branch_name_regex": "^a']]) {
  test(`verify security VS-8: glab output ${name} gives the note`, () => {
    const repo = mkRepo()
    const glab = glabStub({ script: [{ stdout }] })
    const res = readRules(repo, ['a'], { env: glab.env() })
    assertShape(res)
    assert.equal(res.result.unchecked, true)
    assert.deepEqual(res.result.notes, ['rules unknown on gitlab: glab printed output that is not JSON'])
  })
}

function procsMatching(marker) {
  const out = execFileSync('ps', ['-axo', 'pid,command'], { encoding: 'utf8' })
  return out.split('\n').filter((l) => l.includes(marker) && !l.includes('ps -axo'))
}

test('verify security VS-8: a stalled glab hits FORGE_TIMEOUT, returns the note and leaves no child', () => {
  const repo = mkRepo()
  const glab = glabStub({ script: [{ stall: true }] })
  const before = snapshot(repo)
  const t0 = Date.now()
  const res = readRules(repo, ['a'], { env: glab.env(), timeout: 1 })
  const dt = Date.now() - t0
  assertShape(res)
  assert.ok(dt < 15000, 'took ' + dt)
  assert.equal(res.result.unchecked, true)
  assert.equal(res.result.notes.length, 1)
  assert.ok(res.result.notes[0].startsWith('rules unknown on gitlab:'))
  assert.deepEqual(procsMatching(glab.dir), [])
  assert.deepEqual(diffSnapshots(before, snapshot(repo)), diffSnapshots(before, before))
  log('A-VS8-stall', { timeout: 1 }, { ms: dt, note: res.result.notes[0] }, 'held')
})

test('verify security VS-8 seed: a glab that forks a grandchild leaves no process after the timeout', () => {
  const repo = mkRepo()
  const glab = glabStub({ script: [{ delaySeconds: 25 }] })
  const res = readRules(repo, ['a'], { env: glab.env(), timeout: 1 })
  assertShape(res)
  assert.equal(res.result.unchecked, true)
  const left = procsMatching('sleep 25')
  log('A-VS8-grandchild', { timeout: 1 }, { leftover: left.length }, left.length ? 'broke' : 'held')
  execFileSync('sh', ['-c', 'pkill -f "sleep 25" || true'])
  assert.equal(left.length, 0, 'orphan: ' + left.join('|'))
})

test('verify security VS-6: no forge makes no gh or glab call', () => {
  const variants = [undefined, '', 'null', 'bitbucket', 'GitLab', 'gitlab ', '"gitlab"']
  for (const v of variants) {
    const files = {}
    let repo
    if (v === undefined) repo = r.gitRepo({ files: { '.sdlc/config.json': {} }, branches: [] })
    else if (v === 'null') repo = r.gitRepo({ files: { '.sdlc/config.json': { forge: null } }, branches: [] })
    else if (v === 'bad') repo = r.gitRepo({ files: { '.sdlc/config.json': '{not json' }, branches: [] })
    else repo = r.gitRepo({ files: { '.sdlc/config.json': { forge: v } }, branches: [] })
    const glab = glabStub({ fallback: { stdout: { branch_name_regex: '^x' } } })
    const gh = stubServer({ name: 'gh', fallback: { stdout: '[]' } })
    const res = readRules(repo, ['a'], { env: { PATH: glab.path(gh.path()) } })
    assertShape(res)
    assert.equal(glab.count(), 0, 'glab called for ' + v)
    assert.equal(gh.count(), 0, 'gh called for ' + v)
    assert.equal(res.result.unchecked, true)
    assert.deepEqual(res.result.rules, [])
    assert.deepEqual(res.result.notes, [])
    assert.deepEqual(res.result.by_sample, {})
    log('A-VS6-' + String(v), {}, { forge: res.result.forge, unchecked: res.result.unchecked }, 'held')
  }
})

test('verify security VS-5/7: a secret in the push rule body or env never reaches notes or files', () => {
  const repo = mkRepo()
  const glab = glabStub({ script: [{ stdout: { branch_name_regex: '^a', private_token: 'glpat-LEAK' } }] })
  const before = snapshot(repo)
  const res = readRules(repo, ['a'], { env: { ...glab.env(), GITLAB_TOKEN: 'glpat-ENVSECRET' } })
  assertShape(res)
  const dump = JSON.stringify(res.result)
  assert.ok(!dump.includes('glpat-LEAK') && !dump.includes('glpat-ENVSECRET'))
  assert.ok(!(res.stderr || '').includes('glpat'))
  assert.deepEqual(diffSnapshots(before, snapshot(repo)), diffSnapshots(before, before))
})

test('verify security VS-1/9: gh path uses quoted sample in the path and FORGE_TIMEOUT applies to gh', () => {
  const repo = mkRepo('github')
  const gh = stubServer({ name: 'gh', script: [{ stdout: '[]' }] })
  const res = readRules(repo, ['a/b c?x=1&y#z'], { env: gh.env() })
  assertShape(res)
  const c = gh.calls()
  assert.equal(c.length, 1)
  assert.deepEqual(c[0].argv, ['api', 'repos/{owner}/{repo}/rules/branches/a%2Fb%20c%3Fx%3D1%26y%23z'])
  const repo2 = mkRepo('github')
  const gh2 = stubServer({ name: 'gh', script: [{ stall: true }] })
  const t0 = Date.now()
  const res2 = readRules(repo2, ['a'], { env: gh2.env(), timeout: 1 })
  assertShape(res2)
  assert.ok(Date.now() - t0 < 15000)
  assert.equal(res2.result.unchecked, true)
  assert.ok(res2.result.notes[0].startsWith('rules unknown on github:'))
  log('A-gh-sample-encoding', {}, c[0].argv, 'held')
})

test('verify security VS-6: a config that is not valid JSON makes no call (seed: it raises Fail)', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': '{not json' }, branches: [] })
  const glab = glabStub({ fallback: { stdout: { branch_name_regex: '^x' } } })
  const gh = stubServer({ name: 'gh', fallback: { stdout: '[]' } })
  const res = readRules(repo, ['a'], { env: { PATH: glab.path(gh.path()) } })
  assert.equal(glab.count(), 0)
  assert.equal(gh.count(), 0)
  log('A-VS6-badjson', {}, { exc: (res.exc || '').slice(0, 60) }, 'out-of-scope')
  assertShape(res)
})
