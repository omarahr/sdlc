import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const SKILL = process.env.VERIFY_SKILL_DIR || join(REPO, 'skills/sdlc')
const TESTKIT = join(REPO, 'skills/sdlc/test/testkit')
const { cliRunner } = await import(join(TESTKIT, 'cli-runner.mjs'))
const { load, all, abbreviations, duplicated, equalsForm } = await import(join(TESTKIT, 'attack-corpus.mjs'))

const BRANCHES = join(SKILL, 'branches.py')
const DRIVER = `
import importlib.util, json, sys
s = importlib.util.spec_from_file_location("b", sys.argv[1])
b = importlib.util.module_from_spec(s)
s.loader.exec_module(b)
out = []
for call in json.load(sys.stdin):
    try:
        out.append({"ret": getattr(b, call["fn"])(*call["args"], **call["kw"])})
    except b.Fail as e:
        out.append({"fail": str(e)})
    except BaseException as e:
        out.append({"exc": type(e).__name__ + ": " + str(e)})
print(json.dumps(out))
`

function api(calls) {
  const r = spawnSync('python3', ['-I', '-c', DRIVER, BRANCHES], {
    cwd: mkdtempSync(join(tmpdir(), 'verify-security-')),
    input: JSON.stringify(calls.map(c => ({ fn: c[0], args: c[1], kw: c[2] ?? {} }))),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', TZ: 'UTC' },
    maxBuffer: 64 * 1024 * 1024,
  })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const r = cliRunner({ skillDir: SKILL })
const repo = r.gitRepo({ branches: ['sdlc/S-001'] })

function assertCleanCli(t, label) {
  assert.ok(t.status === 0 || t.status === 2, `${label}: exit ${t.status}\n${t.text()}`)
  assert.doesNotMatch(t.stdout + t.stderr, /Traceback/, `${label}: traceback\n${t.text()}`)
  assert.equal(t.stderr, '', `${label}: stderr is not empty\n${t.text()}`)
  const lines = t.stdout.split('\n').filter(l => l !== '')
  assert.equal(lines.length, 1, `${label}: stdout is not one JSON line\n${t.text()}`)
  assert.ok(t.json && typeof t.json === 'object', `${label}: stdout is not JSON\n${t.text()}`)
  assert.equal(t.json.ok, t.status === 0, `${label}: ok does not match the exit code\n${t.text()}`)
  if (t.status === 2) assert.ok(typeof t.json.error === 'string' && t.json.error.length > 0, `${label}: no error text`)
  assert.ok(t.treeUnchanged, `${label}: the call changed a file or a ref\n${t.text()}`)
}

const argsOf = (kind, base, o) => {
  const v = { ...base, ...o }
  return ['name', '--repo', repo, '--kind', kind, ...Object.entries(v).filter(([, x]) => x !== undefined).flatMap(([k, x]) => [`--${k}`, x])]
}
const verifyArgs = (o = {}) => argsOf('verify', { id: 'S-001', round: '0', profile: 'http-api', part: '0' }, o)
const attemptArgs = (o = {}) => argsOf('attempt', { id: 'S-001', n: '1' }, o)
const refOk = b => !b.includes('\u0000') && spawnSync('git', ['check-ref-format', '--branch', b]).status === 0

const log = []
process.on('exit', () => {
  const out = process.env.VERIFY_SECURITY_LOG
  if (out) writeFileSync(out, log.join('\n') + '\n')
})

test('verify security: VS-4 the acceptance verify name holds as the baseline for every attack', () => {
  const t = r.run('branches.py', verifyArgs())
  assertCleanCli(t, 'baseline')
  assert.equal(t.status, 0)
  assert.equal(t.json.branch, 'sdlc/S-001-v0-http-api-0')
})

test('verify security: VS-4 each missing or empty verify part exits 2 with one JSON error naming the part', () => {
  for (const part of ['id', 'round', 'profile', 'part']) {
    for (const value of [undefined, '']) {
      const t = r.run('branches.py', verifyArgs({ [part]: value }))
      assertCleanCli(t, `verify ${part}=${JSON.stringify(value)}`)
      assert.equal(t.status, 2, t.text())
      assert.match(t.json.error, new RegExp(`\\b${part}\\b`), t.text())
      log.push(`VS-4 missing ${part}=${JSON.stringify(value)} -> exit 2 ${JSON.stringify(t.json.error)}`)
    }
  }
  const parts = ['id', 'round', 'profile', 'part']
  const out = api(parts.flatMap(p => [null, ''].map(v => ['tail', ['verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0, [p]: v }])))
  out.forEach((o, i) => {
    const p = parts[Math.floor(i / 2)]
    assert.ok(o.fail, `tail verify ${p}: ${JSON.stringify(o)}`)
    assert.match(o.fail, new RegExp(`\\b${p}\\b`))
  })
  const zero = api([['tail', ['verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0 }]])
  assert.deepEqual(zero[0], { ret: 'S-001-v0-http-api-0' })
})

test('verify security: VS-4 malformed --round and --part exit 2 or give an ASCII integer, never a crash', () => {
  const values = [...load('integer-forms', { argv: true }), ...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true }),
    ...load('unicode-whitespace', { argv: true }), ...load('flag-like-values', { argv: true }), ...load('injection', { argv: true }),
    { id: 'neg', value: '-1' }, { id: 'float', value: '1.5' }, { id: 'hex', value: '0x1' }, { id: 'lead-space', value: ' 1' }, { id: 'abc', value: 'abc' }]
  const accepted = []
  let refused = 0
  for (const flag of ['round', 'part']) {
    for (const e of values) {
      const t = r.run('branches.py', verifyArgs({ [flag]: e.value }))
      assertCleanCli(t, `--${flag} ${e.family}/${e.id}`)
      if (t.status === 0) {
        assert.match(t.json.branch, /^sdlc\/S-001-v-?\d+-http-api--?\d+$/, `--${flag} ${e.id}: ${t.json.branch}`)
        accepted.push(`--${flag} ${e.id} ${JSON.stringify(e.value).slice(0, 20)} -> ${t.json.branch.slice(0, 60)}`)
      } else refused++
    }
  }
  log.push(`VS-4 int flags: ${values.length * 2} calls, ${refused} refused, ${accepted.length} accepted:\n  ${accepted.join('\n  ')}`)
})

test('verify security: VS-4 hostile --id and --profile never crash, never change state, keep the sdlc/ prefix', () => {
  const entries = all({ argv: true }).filter(e => e.value !== '' && e.value.length < 100000)
  let unsafe = 0
  let total = 0
  const examples = []
  for (const flag of ['id', 'profile']) {
    for (const e of entries) {
      const t = r.run('branches.py', verifyArgs({ [flag]: e.value }))
      assertCleanCli(t, `--${flag} ${e.family}/${e.id}`)
      total++
      if (t.status === 0) {
        assert.ok(t.json.branch.startsWith('sdlc/'), `--${flag} ${e.id}: ${t.json.branch}`)
        assert.equal(t.json.branch, `sdlc/${flag === 'id' ? e.value : 'S-001'}-v0-${flag === 'profile' ? e.value : 'http-api'}-0`)
        if (!refOk(t.json.branch)) {
          unsafe++
          if (examples.length < 8) examples.push(`--${flag} ${e.family}/${e.id} -> ${JSON.stringify(t.json.branch.slice(0, 50))}`)
        }
      }
    }
  }
  log.push(`VS-4 hostile id/profile: ${total} calls, ${unsafe} ok results that git check-ref-format refuses; examples:\n  ${examples.join('\n  ')}`)
})

test('verify security: VS-4 a profile holding a placeholder is not expanded a second time', () => {
  const lower = r.run('branches.py', [...verifyArgs({ profile: '{name}' }), '--format', 'feature/{name:lower}'])
  assertCleanCli(lower, 'profile {name} under lower format')
  assert.equal(lower.json.branch, 'feature/s-001-v0-{name}-0')
  const plain = r.run('branches.py', verifyArgs({ profile: '{name:lower}{0}%s' }))
  assertCleanCli(plain, 'profile placeholder')
  assert.equal(plain.json.branch, 'sdlc/S-001-v0-{name:lower}{0}%s-0')
})

test('verify security: VS-4 abbreviated, duplicated and equals-form flags resolve to one flag or exit 2', () => {
  const seen = []
  for (const ab of [...abbreviations('--profile'), ...abbreviations('--part'), ...abbreviations('--round'), '--p', '--pr']) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0', ab, '7'])
    assertCleanCli(t, `abbrev ${ab}`)
    seen.push(`${ab} 7 -> ${t.status === 0 ? t.json.branch : 'exit 2 ' + t.json.error}`)
  }
  const dup = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--part', '0', ...duplicated('--profile', ['http-api', 'security'])])
  assertCleanCli(dup, 'duplicated profile')
  seen.push(`--profile twice -> ${dup.json.branch}`)
  const eq = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--part', '0', equalsForm('--profile', '--format')])
  assertCleanCli(eq, 'equals form')
  assert.equal(eq.json.branch, 'sdlc/S-001-v0---format-0')
  seen.push(`--profile=--format -> ${eq.json.branch}`)
  log.push(`VS-4 flag variants:\n  ${seen.join('\n  ')}`)
})

test('verify security: VS-6 the acceptance attempt name holds and n = 0 is not dropped', () => {
  const t = r.run('branches.py', attemptArgs())
  assertCleanCli(t, 'baseline')
  assert.equal(t.json.branch, 'sdlc/S-001-attempt-1')
  const z = r.run('branches.py', attemptArgs({ n: '0' }))
  assertCleanCli(z, 'n 0')
  assert.equal(z.json.branch, 'sdlc/S-001-attempt-0')
})

test('verify security: VS-6 a missing or empty attempt part exits 2 with one JSON error naming it', () => {
  for (const part of ['id', 'n']) {
    for (const value of [undefined, '']) {
      const t = r.run('branches.py', attemptArgs({ [part]: value }))
      assertCleanCli(t, `attempt ${part}=${JSON.stringify(value)}`)
      assert.equal(t.status, 2, t.text())
      assert.match(t.json.error, new RegExp(`\\b${part}\\b`), t.text())
      log.push(`VS-6 missing ${part}=${JSON.stringify(value)} -> exit 2 ${JSON.stringify(t.json.error)}`)
    }
  }
  const out = api([['tail', ['attempt'], { n: 1 }], ['tail', ['attempt'], { id: 'S-001' }], ['tail', ['attempt'], { id: '', n: 1 }], ['tail', ['attempt'], { id: 'S-001', n: null }], ['tail', ['attempt'], { id: 'S-001', n: 0 }]])
  assert.match(out[0].fail, /\bid\b/)
  assert.match(out[1].fail, /\bn\b/)
  assert.match(out[2].fail, /\bid\b/)
  assert.match(out[3].fail, /\bn\b/)
  assert.deepEqual(out[4], { ret: 'S-001-attempt-0' })
})

test('verify security: VS-6 malformed --n exits 2 or gives an ASCII integer, never a crash', () => {
  const values = [...load('integer-forms', { argv: true }), ...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true }),
    ...load('unicode-whitespace', { argv: true }), ...load('flag-like-values', { argv: true }), ...load('injection', { argv: true }),
    { id: 'neg', value: '-1' }, { id: 'abc', value: 'abc' }, { id: 'float', value: '1.0' }]
  const accepted = []
  let refused = 0
  for (const e of values) {
    const t = r.run('branches.py', attemptArgs({ n: e.value }))
    assertCleanCli(t, `--n ${e.family}/${e.id}`)
    if (t.status === 0) {
      assert.match(t.json.branch, /^sdlc\/S-001-attempt--?\d+$/, `--n ${e.id}: ${t.json.branch}`)
      accepted.push(`--n ${e.id} ${JSON.stringify(e.value).slice(0, 20)} -> ${t.json.branch.slice(0, 60)}`)
    } else refused++
  }
  log.push(`VS-6 --n: ${values.length} calls, ${refused} refused, ${accepted.length} accepted:\n  ${accepted.join('\n  ')}`)
})

test('verify security: VS-6 hostile attempt --id never crashes, is used verbatim and keeps the prefix', () => {
  let unsafe = 0
  let total = 0
  for (const e of all({ argv: true }).filter(x => x.value !== '' && x.value.length < 100000)) {
    const t = r.run('branches.py', attemptArgs({ id: e.value }))
    assertCleanCli(t, `--id ${e.family}/${e.id}`)
    total++
    if (t.status === 0) {
      assert.equal(t.json.branch, `sdlc/${e.value}-attempt-1`)
      if (!refOk(t.json.branch)) unsafe++
    }
  }
  log.push(`VS-6 hostile attempt id: ${total} calls, ${unsafe} ok results that git check-ref-format refuses`)
})

test('verify security: VS-6 shell metacharacters in --id run no shell and touch no file outside the scratch repo', () => {
  const dir = r.dir('marks')
  const mark = join(dir, 'pwned')
  const payloads = [`$(touch ${mark})`, `\`touch ${mark}\``, `S-001;touch ${mark}`, `S-001 && touch ${mark}`, `S-001|touch ${mark}`, `S-001\ntouch ${mark}`]
  for (const p of payloads) {
    const t = r.run('branches.py', attemptArgs({ id: p }), { watch: [repo, dir] })
    assertCleanCli(t, `shell ${JSON.stringify(p)}`)
    assert.equal(t.json.branch, `sdlc/${p}-attempt-1`)
    const v = r.run('branches.py', verifyArgs({ profile: p }), { watch: [repo, dir] })
    assertCleanCli(v, `shell profile ${JSON.stringify(p)}`)
  }
  assert.ok(!existsSync(mark), 'a shell ran a payload')
})

test('verify security: VS-4 VS-6 name runs git only for check-ref-format, never push, branch or update-ref', () => {
  const shimDir = r.dir('shim')
  const record = join(shimDir, 'calls.log')
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim()
  const shim = join(shimDir, 'git')
  writeFileSync(shim, `#!/bin/sh\nprintf '%s\\n' "$*" >> '${record}'\nexec '${realGit}' "$@"\n`)
  chmodSync(shim, 0o755)
  const env = { PATH: `${shimDir}:${r.env.PATH}` }
  const runs = [verifyArgs(), verifyArgs({ profile: '../../x' }), verifyArgs({ part: undefined }), attemptArgs(), attemptArgs({ id: '@{u}' }), attemptArgs({ n: 'x' })]
  for (const a of runs) assertCleanCli(r.run('branches.py', a, { env }), a.join(' '))
  const calls = existsSync(record) ? readFileSync(record, 'utf8').split('\n').filter(Boolean) : []
  log.push(`git calls seen by the PATH shim:\n  ${calls.join('\n  ')}`)
  assert.ok(calls.length > 0, 'the shim saw no git call; the check is not live')
  for (const c of calls) assert.match(c, /^check-ref-format --branch /, `unexpected git call: ${c}`)
})
