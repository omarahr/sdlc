import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MAIN = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const KIT = join(MAIN, 'skills/sdlc/test/testkit')
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const { load, plantDecoy, decoyFired, equalsForm } = await import(join(KIT, 'attack-corpus.mjs'))

const SKILL_DIR = process.env.VERIFY_SKILL_DIR ?? join(MAIN, 'skills/sdlc')
const LOG_DIR = process.env.VERIFY_LOG_DIR ?? join(MAIN, '.sdlc/slices/S-004/verification/r0/logs')
mkdirSync(LOG_DIR, { recursive: true })

const r = cliRunner({ skillDir: SKILL_DIR })
const KEYS = ['branch', 'command', 'format', 'kind', 'ok']

function record(caseId, t) {
  const text = t.text()
  const clipped = text.length > 4000 ? text.slice(0, 1500) + `\n… <${text.length - 3000} chars clipped> …\n` + text.slice(-1500) : text
  appendFileSync(join(LOG_DIR, `cli-0-${caseId}.txt`), clipped + '\n\n')
}

function resetLog(caseId) {
  writeFileSync(join(LOG_DIR, `cli-0-${caseId}.txt`), '')
}

function refOk(branch) {
  return spawnSync('git', ['check-ref-format', '--branch', branch], { encoding: 'utf8' }).status === 0
}

function oneJsonLine(t) {
  const lines = t.stdout.split('\n').filter((l) => l.length)
  assert.equal(lines.length, 1, `stdout must hold one line: ${JSON.stringify(t.stdout)}`)
  return JSON.parse(lines[0])
}

function expectOk(t, kind, branch, format = 'sdlc/{name}') {
  assert.equal(t.status, 0, t.text())
  const j = oneJsonLine(t)
  assert.deepEqual(Object.keys(j).sort(), KEYS)
  assert.deepEqual(j, { ok: true, command: 'name', format, kind, branch })
  assert.equal(t.stderr, '')
  assert.ok(refOk(branch), `git check-ref-format refuses ${branch}`)
  assert.ok(t.treeUnchanged, t.text())
}

function expectFail(t, pattern) {
  assert.equal(t.status, 2, t.text())
  const j = oneJsonLine(t)
  assert.deepEqual(Object.keys(j).sort(), ['error', 'ok'])
  assert.equal(j.ok, false)
  if (pattern) assert.match(j.error, pattern)
  assert.doesNotMatch(t.stderr, /Traceback/)
  assert.ok(t.treeUnchanged, t.text())
  return j
}

const name = (repo, args, opts) => r.run('branches.py', ['name', '--repo', repo, ...args], opts)

const DEFAULT_CASES = [
  ['run', ['--kind', 'run', '--n', '1'], 'sdlc/run-1'],
  ['slice', ['--kind', 'slice', '--id', 'S-001'], 'sdlc/S-001'],
  ['milestone', ['--kind', 'milestone', '--id', 'M-1'], 'sdlc/M-1'],
  ['e2e', ['--kind', 'e2e', '--id', 'M-1'], 'sdlc/M-1-e2e'],
  ['e2e-area', ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api'], 'sdlc/M-1-e2e-api'],
]

test('verify cli: TC-cli-1 default format names the five kinds', () => {
  resetLog('TC-cli-1')
  const repo = r.gitRepo()
  for (const [kind, args, branch] of DEFAULT_CASES) {
    const t = name(repo, args)
    record('TC-cli-1', t)
    expectOk(t, kind, branch)
  }
})

test('verify cli: TC-cli-2 config without a usable branchFormat falls back to sdlc/{name}', () => {
  resetLog('TC-cli-2')
  const shapes = [{ other: 1 }, { branchFormat: '' }, { branchFormat: 7 }, { branchFormat: null }, { branchFormat: ['x/{name}'] }, { branchFormat: false }]
  for (const cfg of shapes) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': cfg } })
    for (const [kind, args, branch] of DEFAULT_CASES) {
      const t = name(repo, args)
      record('TC-cli-2', t)
      expectOk(t, kind, branch)
    }
  }
})

const TEAM = [
  ['run', ['--kind', 'run', '--n', '1'], 'run-1'],
  ['milestone', ['--kind', 'milestone', '--id', 'M-1'], 'M-1'],
  ['e2e', ['--kind', 'e2e', '--id', 'M-1'], 'M-1-e2e'],
  ['e2e-area', ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api'], 'M-1-e2e-api'],
]

function applyFmt(fmt, tail) {
  const lower = fmt.includes('{name:lower}')
  const ph = lower ? '{name:lower}' : '{name}'
  const [pre, suf] = fmt.split(ph)
  return pre + (lower ? tail.toLowerCase() : tail) + suf
}

test('verify cli: TC-cli-3 config branchFormat applies to run, milestone and e2e', () => {
  resetLog('TC-cli-3')
  for (const fmt of ['feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}', 'x/{name}-wip', '{name}/sdlc']) {
    const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } } })
    for (const [kind, args, tail] of TEAM) {
      const t = name(repo, args)
      record('TC-cli-3', t)
      expectOk(t, kind, applyFmt(fmt, tail), fmt)
    }
  }
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name:lower}' } } })
  const t = name(repo, ['--kind', 'e2e', '--id', 'M-1'])
  expectOk(t, 'e2e', 'feature/PROJ-1-m-1-e2e', 'feature/PROJ-1-{name:lower}')
})

test('verify cli: TC-cli-4 the --format flag wins over the config', () => {
  resetLog('TC-cli-4')
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'team/{name}' } } })
  for (const fmt of ['feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}', 'x/{name}-wip', '{name}/sdlc']) {
    for (const [kind, args, tail] of TEAM) {
      const t = name(repo, [...args, '--format', fmt])
      record('TC-cli-4', t)
      expectOk(t, kind, applyFmt(fmt, tail), fmt)
    }
  }
  const t = name(repo, ['--kind', 'run', '--n', '1'])
  record('TC-cli-4', t)
  expectOk(t, 'run', 'team/run-1', 'team/{name}')
})

test('verify cli: TC-cli-5 a missing or empty part exits 2 and names the part', () => {
  resetLog('TC-cli-5')
  const repo = r.gitRepo()
  const cases = [
    [['--kind', 'run'], /\bn\b/],
    [['--kind', 'milestone'], /\bid\b/],
    [['--kind', 'milestone', '--id', ''], /\bid\b/],
    [['--kind', 'e2e'], /\bid\b/],
    [['--kind', 'e2e', '--id', ''], /\bid\b/],
    [['--kind', 'e2e-area', '--id', 'M-1'], /\barea\b/],
    [['--kind', 'e2e-area', '--id', 'M-1', '--area', ''], /\barea\b/],
    [['--kind', 'run', '--id', '1'], /\bn\b/],
    [['--kind', 'milestone', '--n', '1'], /\bid\b/],
    [['--kind', 'e2e', '--n', '1', '--area', 'api'], /\bid\b/],
  ]
  for (const [args, pat] of cases) {
    const t = name(repo, args)
    record('TC-cli-5', t)
    expectFail(t, pat)
  }
})

test('verify cli: TC-cli-6 valid run counters give run-<int> and pass git', () => {
  resetLog('TC-cli-6')
  const repo = r.gitRepo()
  const cases = [['0', 'run-0'], ['1', 'run-1'], ['12', 'run-12'], [' 1', 'run-1'], ['+1', 'run-1'], ['1_000', 'run-1000'], ['010', 'run-10'], ['١', 'run-1'], ['99999999999999999999', 'run-99999999999999999999']]
  for (const [n, tail] of cases) {
    const t = name(repo, ['--kind', 'run', `--n=${n}`])
    record('TC-cli-6', t)
    expectOk(t, 'run', `sdlc/${tail}`)
  }
})

test('verify cli: TC-cli-7 refused run counters exit 2 with one JSON error', () => {
  resetLog('TC-cli-7')
  const repo = r.gitRepo()
  for (const n of ['1.5', 'abc', '0x1', '', '1e3', 'one']) {
    const t = name(repo, ['--kind', 'run', `--n=${n}`])
    record('TC-cli-7', t)
    expectFail(t, /n/)
  }
})

test('verify cli: TC-cli-8 corpus run counters never crash and accepted ones pass git', () => {
  resetLog('TC-cli-8')
  const repo = r.gitRepo()
  const accepted = []
  for (const fam of ['integer-forms', 'unicode-digits', 'huge-integers']) {
    for (const e of load(fam, { argv: true })) {
      const t = name(repo, ['--kind', 'run', equalsForm('--n', e.value)])
      if (e.value.length < 200) record('TC-cli-8', t)
      else appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-8.txt'), `${fam}/${e.id}: exit ${t.status} stdout ${t.stdout.slice(0, 160)}… stderr ${JSON.stringify(t.stderr.slice(0, 200))}\n\n`)
      assert.ok(t.status === 0 || t.status === 2, `${fam}/${e.id}: ${t.text()}`)
      assert.doesNotMatch(t.stderr, /Traceback/, `${fam}/${e.id}`)
      assert.ok(t.treeUnchanged, `${fam}/${e.id}`)
      const j = oneJsonLine(t)
      if (t.status === 0) {
        assert.match(j.branch, /^sdlc\/run--?\d+$/, `${fam}/${e.id}`)
        const n = BigInt(j.branch.slice('sdlc/run-'.length))
        if (n >= 0n) assert.ok(refOk(j.branch), `${fam}/${e.id} gives ${j.branch} which git refuses`)
        accepted.push(`${fam}/${e.id} -> ${j.branch.length > 60 ? j.branch.slice(0, 60) + '…' : j.branch}`)
      } else {
        assert.equal(j.ok, false)
      }
    }
  }
  appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-8.txt'), 'accepted:\n' + accepted.join('\n') + '\n')
})

const HOSTILE = ['traversal', 'control-chars', 'flag-like-values', 'injection', 'format-strings', 'unicode-whitespace', 'unicode-confusables', 'oversized']

test('verify cli: TC-cli-9 hostile id and area values never crash, write or expand', () => {
  resetLog('TC-cli-9')
  const repo = r.gitRepo()
  const cwd = r.dir('cwd-decoy')
  const decoys = ['json', 'argparse', 'subprocess', 'os', 're'].map((m) => plantDecoy(cwd, { module: m }))
  const refused = []
  for (const fam of HOSTILE) {
    for (const e of load(fam, { argv: true })) {
      const runs = [
        ['milestone', ['--kind', 'milestone', equalsForm('--id', e.value)], (v) => v],
        ['e2e', ['--kind', 'e2e', equalsForm('--id', e.value)], (v) => `${v}-e2e`],
        ['e2e-area', ['--kind', 'e2e-area', '--id', 'M-1', equalsForm('--area', e.value)], (v) => `M-1-e2e-${v}`],
      ]
      for (const [kind, args, tailOf] of runs) {
        const t = name(repo, args, { cwd })
        if (e.value.length < 300) record('TC-cli-9', t)
        else appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-9.txt'), `${fam}/${e.id} ${kind}: exit ${t.status} stdout-len ${t.stdout.length} stderr ${JSON.stringify(t.stderr.slice(0, 200))}\n\n`)
        const tag = `${fam}/${e.id} ${kind}`
        assert.ok(t.status === 0 || t.status === 2, `${tag}: ${t.text()}`)
        assert.doesNotMatch(t.stderr, /Traceback/, tag)
        assert.ok(t.treeUnchanged, tag)
        const j = oneJsonLine(t)
        if (t.status === 0) {
          assert.equal(j.branch, `sdlc/${tailOf(e.value)}`, `${tag} must appear literally`)
          if (!refOk(j.branch)) refused.push(`${tag} -> ${JSON.stringify(j.branch.length > 80 ? j.branch.slice(0, 80) + '…' : j.branch)}`)
        } else {
          assert.equal(j.ok, false, tag)
        }
      }
    }
  }
  for (const d of decoys) assert.equal(decoyFired(d), null, `decoy ${d.path} imported`)
  writeFileSync(join(LOG_DIR, 'cli-0-TC-cli-9-git-refused.txt'), refused.join('\n') + '\n')
})

test('verify cli: TC-cli-10 format-string ids appear literally', () => {
  resetLog('TC-cli-10')
  const repo = r.gitRepo()
  for (const v of ['{name}', '%s', '{0}', '${HOME}', '$(id)']) {
    const t = name(repo, ['--kind', 'milestone', '--id', v])
    record('TC-cli-10', t)
    assert.equal(t.status, 0, t.text())
    assert.equal(oneJsonLine(t).branch, `sdlc/${v}`)
    assert.ok(t.treeUnchanged)
  }
  const t = name(repo, ['--kind', 'e2e', '--id', '{name}', '--format', 'feature/{name:lower}'])
  record('TC-cli-10', t)
  assert.equal(oneJsonLine(t).branch, 'feature/{name}-e2e')
})

test('verify cli: TC-cli-11 slice, e2e-area and state tails stay, e2e never collides with e2e-area', () => {
  resetLog('TC-cli-11')
  const repo = r.gitRepo()
  const s = name(repo, ['--kind', 'slice', '--id', 'S-001'])
  record('TC-cli-11', s)
  expectOk(s, 'slice', 'sdlc/S-001')
  const a = name(repo, ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api'])
  record('TC-cli-11', a)
  expectOk(a, 'e2e-area', 'sdlc/M-1-e2e-api')
  const e = name(repo, ['--kind', 'e2e', '--id', 'M-1'])
  record('TC-cli-11', e)
  expectOk(e, 'e2e', 'sdlc/M-1-e2e')
  assert.notEqual(e.json.branch, a.json.branch)
  const st = name(repo, ['--kind', 'state'])
  record('TC-cli-11', st)
  assert.equal(st.status, 0, st.text())
  assert.match(oneJsonLine(st).branch, /^sdlc\/state-\d{14}$/)
  assert.ok(refOk(st.json.branch))
})

test('verify cli: TC-cli-12 verify, attempt and unknown kinds exit 2 without a traceback', () => {
  resetLog('TC-cli-12')
  const repo = r.gitRepo()
  for (const kind of ['verify', 'attempt']) {
    const t = name(repo, ['--kind', kind, '--id', 'S-001', '--round', '1', '--profile', 'cli', '--part', '0', '--n', '1'])
    record('TC-cli-12', t)
    expectFail(t, /no branch name is defined for kind/)
  }
  const t = name(repo, ['--kind', 'foo', '--id', 'M-1'])
  record('TC-cli-12', t)
  const j = expectFail(t, /foo/)
  for (const k of ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state']) assert.ok(j.error.includes(k), `error lists ${k}`)
  for (const k of ['RUN', 'Milestone', 'e2e ', 'E2E']) {
    const u = name(repo, ['--kind', k, '--id', 'M-1', '--n', '1'])
    record('TC-cli-12', u)
    expectFail(u, /is not one of/)
  }
})

test('verify cli: TC-cli-13 running twice gives the same output and writes nothing', () => {
  resetLog('TC-cli-13')
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  for (const [, args] of DEFAULT_CASES) {
    const a = name(repo, args)
    const b = name(repo, args, { env: { CI: 'true', TERM: 'dumb' }, input: 'y\n' })
    record('TC-cli-13', a)
    record('TC-cli-13', b)
    assert.equal(a.stdout, b.stdout)
    assert.equal(a.status, 0)
    assert.ok(a.treeUnchanged && b.treeUnchanged)
  }
})

test('verify cli: TC-cli-14 repo paths with spaces and unicode, a missing repo and broken config', () => {
  resetLog('TC-cli-14')
  const base = r.dir('wörk space')
  const repo = join(base, 'my repo ✓')
  mkdirSync(repo)
  execFileSync('git', ['-C', repo, 'init', '-q'], { env: r.env })
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc/config.json'), JSON.stringify({ branchFormat: 'feature/{name}' }))
  for (const [kind, args, branch] of DEFAULT_CASES) {
    const t = name(repo, args)
    record('TC-cli-14', t)
    expectOk(t, kind, branch.replace('sdlc/', 'feature/'), 'feature/{name}')
  }
  const missing = name(join(base, 'nope'), ['--kind', 'run', '--n', '1'])
  record('TC-cli-14', missing)
  expectFail(missing, /not a directory/)
  const broken = r.gitRepo({ files: { '.sdlc/config.json': '{"branchFormat": ' } })
  const bt = name(broken, ['--kind', 'milestone', '--id', 'M-1'])
  record('TC-cli-14', bt)
  expectFail(bt, /not valid JSON/)
  const badFmt = name(r.gitRepo(), ['--kind', 'e2e', '--id', 'M-1', '--format', 'feature/{name}/{name}'])
  record('TC-cli-14', badFmt)
  expectFail(badFmt, /exactly one/)
})
