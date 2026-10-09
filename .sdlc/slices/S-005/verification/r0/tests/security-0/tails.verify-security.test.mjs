import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const SKILL = join(REPO, 'skills/sdlc')
const TESTKIT = join(SKILL, 'test/testkit')
const { cliRunner } = await import(join(TESTKIT, 'cli-runner.mjs'))
const { load, all } = await import(join(TESTKIT, 'attack-corpus.mjs'))

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

const r = cliRunner()
const repo = r.gitRepo({ branches: ['sdlc/S-001'] })

function assertCleanCli(t, label) {
  assert.ok(t.status === 0 || t.status === 2, `${label}: exit ${t.status}\n${t.text()}`)
  assert.doesNotMatch(t.stdout + t.stderr, /Traceback/, `${label}: traceback\n${t.text()}`)
  const lines = t.stdout.split('\n').filter(l => l !== '')
  assert.equal(lines.length, 1, `${label}: stdout is not one JSON line\n${t.text()}`)
  assert.ok(t.json && typeof t.json === 'object', `${label}: stdout is not JSON\n${t.text()}`)
  assert.equal(t.json.ok, t.status === 0, `${label}: ok does not match the exit code\n${t.text()}`)
  assert.ok(t.treeUnchanged, `${label}: the call changed a file or a ref\n${t.text()}`)
}

const verifyArgs = (o = {}) => {
  const v = { id: 'S-001', round: '0', profile: 'http-api', part: '0', ...o }
  return ['name', '--repo', repo, '--kind', 'verify', ...Object.entries(v).filter(([, x]) => x !== undefined).flatMap(([k, x]) => [`--${k}`, x])]
}
const attemptArgs = (o = {}) => {
  const v = { id: 'S-001', n: '1', ...o }
  return ['name', '--repo', repo, '--kind', 'attempt', ...Object.entries(v).filter(([, x]) => x !== undefined).flatMap(([k, x]) => [`--${k}`, x])]
}

const log = []
process.on('exit', () => {
  const out = process.env.VERIFY_SECURITY_LOG
  if (out) writeFileSync(out, log.join('\n') + '\n')
})

test('verify security: VS-2 an explicit state ts is used as given, empty and None generate one', () => {
  const [given, empty, none, intZero, strZero] = api([
    ['name', ['sdlc/{name}', 'state'], { ts: '20261008101500' }],
    ['name', ['sdlc/{name}', 'state'], { ts: '' }],
    ['name', ['sdlc/{name}', 'state'], { ts: null }],
    ['name', ['sdlc/{name}', 'state'], { ts: 0 }],
    ['name', ['sdlc/{name}', 'state'], { ts: '0' }],
  ])
  assert.deepEqual(given, { ret: 'sdlc/state-20261008101500' })
  assert.match(empty.ret, /^sdlc\/state-\d{14}$/)
  assert.match(none.ret, /^sdlc\/state-\d{14}$/)
  assert.deepEqual(intZero, { ret: 'sdlc/state-0' })
  assert.deepEqual(strZero, { ret: 'sdlc/state-0' })
})

test('verify security: VS-2 hostile ts values never raise an unhandled exception and keep the prefix', () => {
  const values = ['a/b', '../../x', ' 1\t', '\u0001', '@{u}', '..', 'x.lock', 1.5, [1], { a: 1 }, true, false,
    ...all({ only: ['traversal', 'control-chars', 'injection', 'format-strings', 'unicode-whitespace', 'unicode-confusables', 'oversized', 'nul'] }).map(e => e.value)]
  const out = api(values.map(ts => ['name', ['sdlc/{name}', 'state'], { ts }]))
  values.forEach((ts, i) => {
    assert.ok(!('exc' in out[i]), `ts ${JSON.stringify(ts).slice(0, 60)} raised ${out[i].exc}`)
    assert.ok(out[i].ret.startsWith('sdlc/state-'), `ts ${JSON.stringify(ts).slice(0, 60)} gave ${out[i].ret.slice(0, 80)}`)
  })
  const unsafe = values.map((ts, i) => [ts, out[i].ret]).filter(([, b]) => b.includes('\u0000') || spawnSync('git', ['check-ref-format', '--branch', b]).status !== 0)
  log.push(`VS-2 ts: ${values.length} values, ${unsafe.length} give a name git check-ref-format refuses; examples: ${JSON.stringify(unsafe.slice(0, 6).map(([t, b]) => [String(t).slice(0, 20), b.slice(0, 40)]))}`)
})

test('verify security: VS-2 the CLI has no --ts flag and refuses it with one JSON error', () => {
  for (const args of [['--ts', '20261008101500'], ['--ts=x'], ['--t', '1']]) {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'state', ...args])
    assertCleanCli(t, `--ts ${args.join(' ')}`)
    assert.equal(t.status, 2, t.text())
    assert.equal(t.json.ok, false)
  }
})

test('verify security: VS-4 each missing verify part exits 2 with one JSON error naming the part', () => {
  for (const part of ['id', 'round', 'profile', 'part']) {
    for (const value of [undefined, '']) {
      const t = r.run('branches.py', verifyArgs({ [part]: value }))
      assertCleanCli(t, `verify ${part}=${JSON.stringify(value)}`)
      assert.equal(t.status, 2, t.text())
      assert.match(t.json.error, new RegExp(`\\b${part}\\b`), t.text())
    }
  }
  const out = api(['id', 'round', 'profile', 'part'].flatMap(p => [null, ''].map(v => ['tail', ['verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0, [p]: v }])))
  out.forEach((o, i) => {
    const p = ['id', 'round', 'profile', 'part'][Math.floor(i / 2)]
    assert.ok(o.fail, `tail verify ${p}: ${JSON.stringify(o)}`)
    assert.match(o.fail, new RegExp(`\\b${p}\\b`))
  })
})

test('verify security: VS-4 malformed --round and --part exit 2 or give an ASCII integer, never a crash', () => {
  const values = [...load('integer-forms', { argv: true }), ...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true }),
    ...load('unicode-whitespace', { argv: true }), ...load('flag-like-values', { argv: true }), { id: 'neg', value: '-1' }, { id: 'float', value: '1.5' }, { id: 'hex', value: '0x1' }, { id: 'lead-space', value: ' 1' }]
  const accepted = []
  for (const flag of ['round', 'part']) {
    for (const e of values) {
      const t = r.run('branches.py', verifyArgs({ [flag]: e.value }))
      assertCleanCli(t, `--${flag} ${e.id}`)
      if (t.status === 0) {
        assert.match(t.json.branch, /^sdlc\/S-001-v-?\d+-http-api--?\d+$/, `--${flag} ${e.id}: ${t.json.branch}`)
        accepted.push(`--${flag} ${e.id} ${JSON.stringify(e.value).slice(0, 20)} -> ${t.json.branch.slice(0, 60)}`)
      }
    }
  }
  log.push(`VS-4 int flags accepted:\n  ${accepted.join('\n  ')}`)
})

test('verify security: VS-4 hostile --id and --profile never crash, never change state, keep the sdlc/ prefix', () => {
  const entries = all({ argv: true }).filter(e => e.value !== '' && e.value.length < 100000)
  let unsafe = 0
  const examples = []
  for (const flag of ['id', 'profile']) {
    for (const e of entries) {
      const t = r.run('branches.py', verifyArgs({ [flag]: e.value }))
      assertCleanCli(t, `--${flag} ${e.family}/${e.id}`)
      if (t.status === 0) {
        assert.ok(t.json.branch.startsWith('sdlc/'), `--${flag} ${e.id}: ${t.json.branch}`)
        if (spawnSync('git', ['check-ref-format', '--branch', t.json.branch]).status !== 0) {
          unsafe++
          if (examples.length < 8) examples.push(`--${flag} ${e.family}/${e.id} -> ${JSON.stringify(t.json.branch.slice(0, 50))}`)
        }
      }
    }
  }
  log.push(`VS-4 hostile id/profile: ${entries.length * 2} calls, ${unsafe} ref-unsafe names; examples:\n  ${examples.join('\n  ')}`)
})

test('verify security: VS-6 a missing attempt part exits 2 with one JSON error naming it', () => {
  for (const part of ['id', 'n']) {
    for (const value of [undefined, '']) {
      const t = r.run('branches.py', attemptArgs({ [part]: value }))
      assertCleanCli(t, `attempt ${part}=${JSON.stringify(value)}`)
      assert.equal(t.status, 2, t.text())
      assert.match(t.json.error, new RegExp(`\\b${part}\\b`), t.text())
    }
  }
  const out = api([['tail', ['attempt'], { n: 1 }], ['tail', ['attempt'], { id: 'S-001' }], ['tail', ['attempt'], { id: '', n: 1 }], ['tail', ['attempt'], { id: 'S-001', n: null }]])
  assert.match(out[0].fail, /\bid\b/)
  assert.match(out[1].fail, /\bn\b/)
  assert.match(out[2].fail, /\bid\b/)
  assert.match(out[3].fail, /\bn\b/)
})

test('verify security: VS-6 malformed --n exits 2 or gives an ASCII integer, never a crash', () => {
  const values = [...load('integer-forms', { argv: true }), ...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true }),
    ...load('unicode-whitespace', { argv: true }), ...load('flag-like-values', { argv: true }), ...load('injection', { argv: true }), { id: 'neg', value: '-1' }, { id: 'abc', value: 'abc' }, { id: 'float', value: '1.0' }]
  const accepted = []
  for (const e of values) {
    const t = r.run('branches.py', attemptArgs({ n: e.value }))
    assertCleanCli(t, `--n ${e.id}`)
    if (t.status === 0) {
      assert.match(t.json.branch, /^sdlc\/S-001-attempt--?\d+$/, `--n ${e.id}: ${t.json.branch}`)
      accepted.push(`--n ${e.id} ${JSON.stringify(e.value).slice(0, 20)} -> ${t.json.branch.slice(0, 60)}`)
    }
  }
  log.push(`VS-6 --n accepted:\n  ${accepted.join('\n  ')}`)
})

test('verify security: VS-6 hostile attempt --id never crashes and keeps the sdlc/ prefix', () => {
  for (const e of all({ argv: true }).filter(x => x.value !== '' && x.value.length < 100000)) {
    const t = r.run('branches.py', attemptArgs({ id: e.value }))
    assertCleanCli(t, `--id ${e.family}/${e.id}`)
    if (t.status === 0) assert.ok(t.json.branch.startsWith('sdlc/') && t.json.branch.endsWith('-attempt-1'), t.json.branch)
  }
})

const ARGV_PUSH = /\b(?:git|run|subprocess\.run|spawnSync|execFileSync|execSync|exec)\s*\([^)]*["'](?:git )?push\b/
const LONE_PUSH = /^["']push["'],?$/
const CREATE = /\b(?:pr|mr) create\b|["'](?:pr|mr)["']\s*,\s*["']create["']/

function scriptSources(dir) {
  const files = [['sdlc-loop.js', join(dir, 'sdlc-loop.js')]]
  for (const f of readdirSync(dir).filter(f => f.endsWith('.py')).sort()) files.push([f, join(dir, f)])
  for (const f of readdirSync(join(dir, 'tracker')).filter(f => f.endsWith('.py')).sort()) files.push([`tracker/${f}`, join(dir, 'tracker', f)])
  return files.map(([n, p]) => [n, readFileSync(p, 'utf8')])
}

test('verify security: VS-8 every push or request call in the scripts targets a run or milestone branch', () => {
  const hits = []
  for (const [file, text] of scriptSources(SKILL)) {
    text.split('\n').forEach((line, i) => {
      const code = line.trim()
      if (code.startsWith('#') || code.startsWith('//')) return
      if (ARGV_PUSH.test(code) || LONE_PUSH.test(code) || CREATE.test(code)) hits.push(`${file}:${i + 1}: ${code}`)
    })
  }
  log.push(`VS-8 push/create call lines:\n  ${hits.join('\n  ')}`)
  assert.deepEqual(hits.map(h => h.replace(/:\d+:/, ':')), [
    'state-write.py: git(repo, "push", "-q", "origin", run, check=False)',
    'state-write.py: git(repo, "push", "-q", "origin", f"--force-with-lease=refs/heads/{branch}:{lease}", f":{branch}", check=False)',
    'state-write.py: git(repo, "push", "-q", "-u", "origin", want, check=False)',
  ])
  const sw = readFileSync(join(SKILL, 'state-write.py'), 'utf8')
  assert.match(sw, /if not MILESTONE_BRANCH\.match\(branch\)[^\n]*:\n\s+continue/, 'the leased delete is not gated on MILESTONE_BRANCH')
  const mb = sw.match(/^MILESTONE_BRANCH\s*=\s*re\.compile\((r?["'][^"']+["'])\)/m)
  assert.ok(mb, 'MILESTONE_BRANCH is not a literal regex')
  const rx = new RegExp(mb[1].replace(/^r?["']|["']$/g, ''))
  for (const v of ['sdlc/S-001-v0-http-api-0', 'sdlc/M-1-v0-security-0', 'sdlc/S-fix-M-1-2-v3-cli-1']) assert.ok(!rx.test(v), `MILESTONE_BRANCH matches ${v}`)
  for (const loopFile of ['sdlc-loop.js']) {
    const src = readFileSync(join(SKILL, loopFile), 'utf8')
    assert.doesNotMatch(src, /\bgh\b[^\n]*\bpr\b[^\n]*\bcreate\b|\bglab\b[^\n]*\bmr\b[^\n]*\bcreate\b/)
  }
})

test('verify security: VS-8 the verify-profile and verify-collector prompts never tell an agent to push or open a request', () => {
  const dir = join(SKILL, 'prompts')
  for (const f of readdirSync(dir).filter(f => /^verify-/.test(f))) {
    const text = readFileSync(join(dir, f), 'utf8')
    assert.doesNotMatch(text, /git push|\bpush\b|pr create|mr create|pull request|merge request/i, `${f} mentions a push or a request`)
  }
})

function runCommittedT119(skillDir) {
  const testDir = join(skillDir, 'test')
  const t = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern', 'no script pushes a verify branch', join(testDir, 'branches.test.mjs')], { encoding: 'utf8', timeout: 120000, env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')) })
  return t
}

function mutatedSkill(edit) {
  const dest = mkdtempSync(join(tmpdir(), 'verify-security-skill-'))
  cpSync(SKILL, dest, { recursive: true, filter: s => !s.split('/').includes('__pycache__') && !s.split('/').includes('node_modules') })
  edit(dest)
  return dest
}

test('verify security: VS-8 the committed T-R-119 passes on the slice and catches a verify push added to the loop', () => {
  const clean = runCommittedT119(mutatedSkill(() => {}))
  assert.equal(clean.status, 0, clean.stdout + clean.stderr)
  assert.match(clean.stdout, /# pass 1/)
  const loopPush = runCommittedT119(mutatedSkill(d => {
    const p = join(d, 'sdlc-loop.js')
    const src = readFileSync(p, 'utf8').replace(/(\n  const branch = g => [^\n]*\n)/, '$1  const pushIt = g => agent(`git push origin ${branch(g)}`)\n')
    writeFileSync(p, src)
  }))
  assert.notEqual(loopPush.status, 0, 'T-R-119 missed a push of branch(g) added to verifyPhase')
  assert.match(loopPush.stdout, /# fail 1/)
})

test('verify security: VS-8 T-R-119 misses a python push of a verify name built on another line', () => {
  const skill = mutatedSkill(d => {
    const p = join(d, 'state-write.py')
    writeFileSync(p, readFileSync(p, 'utf8') + '\n\ndef leak(repo, sid, r, prof, k):\n    vb = f"sdlc/{sid}-v{r}-{prof}-{k}"\n    git(repo, "push", "-q", "origin", vb, check=False)\n')
  })
  const t = runCommittedT119(skill)
  log.push(`VS-8 two-line verify push mutant: T-R-119 exit ${t.status}`)
  assert.match(t.stdout, /# pass 1/, t.stdout + t.stderr)
  assert.equal(t.status, 0, 'expected a known blind spot; the scan now catches it')
})
