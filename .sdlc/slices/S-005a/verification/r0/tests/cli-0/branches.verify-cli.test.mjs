import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const WT = resolve(process.env.VERIFY_WT || process.cwd())
const SKILL_DIR = join(WT, 'skills', 'sdlc')
const { cliRunner } = await import(join(SKILL_DIR, 'test', 'testkit', 'cli-runner.mjs'))
const { load } = await import(join(SKILL_DIR, 'test', 'testkit', 'attack-corpus.mjs'))

const LOG_DIR = process.env.VERIFY_LOG_DIR
const r = cliRunner({ skillDir: SKILL_DIR })
const PROFILES = ['http-api', 'async', 'concurrency', 'data', 'ui', 'i18n', 'cli', 'contract', 'security', 'limits']

function record(caseId, t, label = '') {
  if (!LOG_DIR) return
  mkdirSync(LOG_DIR, { recursive: true })
  appendFileSync(join(LOG_DIR, `cli-0-${caseId}.txt`), `### ${label}\n${t.text()}\n\n`)
}

function name(repo, args, opts) {
  return r.run('branches.py', ['name', '--repo', repo, ...args], opts)
}

function assertCleanOk(t, branch) {
  assert.equal(t.status, 0, t.text())
  assert.equal(t.stderr, '', t.text())
  assert.equal(t.stdout.split('\n').filter(Boolean).length, 1, t.text())
  assert.equal(t.json.ok, true, t.text())
  if (branch !== undefined) assert.equal(t.json.branch, branch, t.text())
  assert.ok(t.treeUnchanged, t.text())
}

function assertCleanRefusal(t, part) {
  assert.equal(t.status, 2, t.text())
  assert.equal(t.stderr, '', t.text())
  assert.doesNotMatch(t.stdout, /Traceback/, t.text())
  assert.equal(t.stdout.split('\n').filter(Boolean).length, 1, t.text())
  assert.equal(t.json.ok, false, t.text())
  assert.equal(typeof t.json.error, 'string', t.text())
  if (part) assert.match(t.json.error, part, t.text())
  assert.ok(t.treeUnchanged, t.text())
}

const utcStamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)

test('verify cli: TC-cli-1 state name is sdlc/state- plus 14 UTC digits under far time zones', () => {
  const repo = r.gitRepo()
  for (const tz of ['Pacific/Kiritimati', 'America/Adak', 'Etc/GMT+12', 'Etc/GMT-14', undefined]) {
    const before = utcStamp()
    const t = name(repo, ['--kind', 'state'], { env: { TZ: tz } })
    const after = utcStamp()
    record('TC-cli-1', t, `TZ=${tz}`)
    assertCleanOk(t)
    assert.equal(t.json.kind, 'state')
    const m = /^sdlc\/state-(\d{14})$/.exec(t.json.branch)
    assert.ok(m, `${tz}: ${t.json.branch}`)
    assert.ok(m[1] >= before && m[1] <= after, `${tz}: ${m[1]} is not between ${before} and ${after}`)
    const d = m[1]
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}:${d.slice(12, 14)}Z`
    assert.equal(new Date(iso).toISOString().replace('.000', ''), iso, `${d} is not a valid %Y%m%d%H%M%S`)
  }
})

test('verify cli: TC-cli-2 state name keeps its tail under custom formats and ignores extra flags', () => {
  const repo = r.gitRepo()
  const cases = [
    [['--format', 'feature/PROJ-1-{name}'], /^feature\/PROJ-1-state-\d{14}$/],
    [['--format', 'feature/PROJ-1-{name:lower}'], /^feature\/PROJ-1-state-\d{14}$/],
    [['--id', 'S-001', '--n', '7', '--round', '3', '--profile', 'cli', '--part', '2'], /^sdlc\/state-\d{14}$/],
  ]
  for (const [args, re] of cases) {
    const t = name(repo, ['--kind', 'state', ...args])
    record('TC-cli-2', t, args.join(' '))
    assertCleanOk(t)
    assert.match(t.json.branch, re, t.text())
  }
  const cfg = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'team/{name}/wip' } } })
  const t = name(cfg, ['--kind', 'state'])
  record('TC-cli-2', t, 'config team/{name}/wip')
  assertCleanOk(t)
  assert.match(t.json.branch, /^team\/state-\d{14}\/wip$/)
})

test('verify cli: TC-cli-3 verify name matches the spec example, the loop builder and every catalog profile', () => {
  const repo = r.gitRepo()
  const acc = name(repo, ['--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'])
  record('TC-cli-3', acc, 'R-009 acceptance')
  assertCleanOk(acc, 'sdlc/S-001-v0-http-api-0')
  assert.equal(acc.json.kind, 'verify')
  const again = name(repo, ['--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'])
  assert.equal(again.stdout, acc.stdout, 'a second run printed a different line')

  const loopSrc = readFileSync(join(SKILL_DIR, 'sdlc-loop.js'), 'utf8')
  const line = loopSrc.split('\n').find(l => /^\s*const branch = g => `/.test(l))
  assert.ok(line, 'sdlc-loop.js has no verify branch builder')
  const tmpl = line.slice(line.indexOf('`'), line.lastIndexOf('`') + 1)
  const loopBranch = new Function('id', 'round', `return g => ${tmpl}`)

  const ids = ['S-001', 'S-fix-3', 'S-fix-M-1-2', 'S-013a', 'S-999']
  const rounds = [0, 1, 7, 12]
  const parts = [0, 1, 3, 10]
  let n = 0
  for (const id of ids) for (const profile of PROFILES) {
    const round = rounds[n % rounds.length]
    const part = parts[(n >> 2) % parts.length]
    n++
    const t = name(repo, ['--kind', 'verify', '--id', id, '--round', String(round), '--profile', profile, '--part', String(part)])
    if (n % 10 === 1) record('TC-cli-3', t, `${id} ${round} ${profile} ${part}`)
    assertCleanOk(t, `sdlc/${id}-v${round}-${profile}-${part}`)
    assert.equal(t.json.branch, loopBranch(id, round)({ profile, part }))
  }
})

test('verify cli: TC-cli-4 verify name with a missing or empty part exits 2 with one JSON error naming it', () => {
  const repo = r.gitRepo()
  const full = { '--id': 'S-001', '--round': '0', '--profile': 'http-api', '--part': '0' }
  const partName = { '--id': /\bid\b/, '--round': /\bround\b/, '--profile': /\bprofile\b/, '--part': /\bpart\b/ }
  for (const drop of Object.keys(full)) {
    const args = Object.entries(full).filter(([k]) => k !== drop).flat()
    const t = name(repo, ['--kind', 'verify', ...args])
    record('TC-cli-4', t, `without ${drop}`)
    assertCleanRefusal(t, partName[drop])
  }
  for (const empty of ['--id', '--profile']) {
    const args = Object.entries({ ...full, [empty]: '' }).flat()
    const t = name(repo, ['--kind', 'verify', ...args])
    record('TC-cli-4', t, `empty ${empty}`)
    assertCleanRefusal(t, partName[empty])
  }
  const nodir = name(join(r.root, 'no such dir'), ['--kind', 'verify', ...Object.entries(full).flat()])
  record('TC-cli-4', nodir, 'missing --repo directory')
  assertCleanRefusal(nodir, /not a directory/)
})

test('verify cli: TC-cli-5 malformed --round and --part are refused or give an ASCII integer', () => {
  const repo = r.gitRepo()
  const values = ['1.5', '0x1', '', ' 1', '1_0', '+1', '-1', '00', '١', '٣', '9'.repeat(5000),
    ...load('integer-forms', { argv: true }).map(e => e.value),
    ...load('unicode-digits', { argv: true }).map(e => e.value),
    ...load('huge-integers', { argv: true }).map(e => e.value)]
  const accepted = []
  for (const flag of ['--round', '--part']) for (const v of values) {
    const args = { '--id': 'S-001', '--round': '0', '--profile': 'http-api', '--part': '0', [flag]: v }
    const t = name(repo, ['--kind', 'verify', ...Object.entries(args).flat()])
    assert.doesNotMatch(t.stdout + t.stderr, /Traceback/, t.text())
    assert.equal(t.stderr, '', t.text())
    assert.ok(t.treeUnchanged, t.text())
    if (t.status === 2) {
      assert.equal(t.json.ok, false)
      assert.match(t.json.error, flag === '--round' ? /--round/ : /--part/)
      continue
    }
    assert.equal(t.status, 0, t.text())
    assert.match(t.json.branch, /^sdlc\/S-001-v-?\d+-http-api--?\d+$/, t.text())
    assert.match(t.json.branch, /^[\x20-\x7e]+$/, t.text())
    accepted.push(`${flag} ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + '…' : v)} -> ${t.json.branch.length > 80 ? t.json.branch.slice(0, 80) + '…' : t.json.branch}`)
  }
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-5.txt'), `accepted values:\n${accepted.join('\n')}\n`)
})

test('verify cli: TC-cli-6 hostile --profile and --id values never crash and never escape the format prefix', () => {
  const repo = r.gitRepo()
  const families = ['traversal', 'control-chars', 'flag-like-values', 'unicode-whitespace', 'injection', 'format-strings', 'unicode-confusables', 'oversized']
  const outcomes = []
  for (const fam of families) for (const e of load(fam, { argv: true })) for (const flag of ['--profile', '--id']) {
    const args = { '--id': 'S-001', '--round': '0', '--profile': 'http-api', '--part': '0' }
    const t = name(repo, ['--kind', 'verify', ...Object.entries(args).flatMap(([k, v]) => k === flag ? [`${k}=${e.value}`] : [k, v])])
    assert.doesNotMatch(t.stdout + t.stderr, /Traceback/, t.text())
    assert.equal(t.stderr, '', t.text())
    assert.ok(t.treeUnchanged, t.text())
    assert.ok(t.status === 0 || t.status === 2, t.text())
    assert.equal(t.stdout.split('\n').filter(Boolean).length, 1, t.text())
    if (t.status === 0) {
      assert.ok(t.json.branch.startsWith('sdlc/'), t.text())
      if (flag === '--profile') assert.ok(t.json.branch.startsWith('sdlc/S-001-v0-'), t.text())
      assert.ok(t.json.branch.endsWith('-0'), t.text())
    }
    outcomes.push(`${fam}/${e.id} ${flag}: exit ${t.status} ${t.status === 0 ? JSON.stringify(t.json.branch).slice(0, 90) : t.json.error.slice(0, 90)}`)
  }
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-6.txt'), outcomes.join('\n') + '\n')
})

test('verify cli: TC-cli-7 attempt name matches the spec example for plain and fix ids, and extra flags do not leak', () => {
  const repo = r.gitRepo()
  const cases = [
    [['--id', 'S-001', '--n', '1'], 'sdlc/S-001-attempt-1'],
    [['--id', 'S-fix-M-1-2', '--n', '3'], 'sdlc/S-fix-M-1-2-attempt-3'],
    [['--id', 'S-013a', '--n', '0'], 'sdlc/S-013a-attempt-0'],
    [['--id', 'S-001', '--n', '123456789'], 'sdlc/S-001-attempt-123456789'],
    [['--id', 'S-001', '--n', '2', '--round', '5', '--profile', 'cli', '--part', '9', '--area', 'x'], 'sdlc/S-001-attempt-2'],
  ]
  for (const [args, want] of cases) {
    const t = name(repo, ['--kind', 'attempt', ...args])
    record('TC-cli-7', t, args.join(' '))
    assertCleanOk(t, want)
    assert.equal(t.json.kind, 'attempt')
  }
})

test('verify cli: TC-cli-8 attempt name with a missing or malformed number exits 2 or gives an ASCII integer', () => {
  const repo = r.gitRepo()
  const noN = name(repo, ['--kind', 'attempt', '--id', 'S-001'])
  record('TC-cli-8', noN, 'without --n')
  assertCleanRefusal(noN, /\bn\b/)
  const noId = name(repo, ['--kind', 'attempt', '--n', '1'])
  record('TC-cli-8', noId, 'without --id')
  assertCleanRefusal(noId, /\bid\b/)
  const emptyId = name(repo, ['--kind', 'attempt', '--id', '', '--n', '1'])
  record('TC-cli-8', emptyId, 'empty --id')
  assertCleanRefusal(emptyId, /\bid\b/)
  const values = ['abc', '1.0', '', '-1', ...load('integer-forms', { argv: true }).map(e => e.value),
    ...load('unicode-digits', { argv: true }).map(e => e.value), ...load('huge-integers', { argv: true }).map(e => e.value)]
  const accepted = []
  for (const v of values) {
    const t = name(repo, ['--kind', 'attempt', '--id', 'S-001', `--n=${v}`])
    assert.doesNotMatch(t.stdout + t.stderr, /Traceback/, t.text())
    assert.equal(t.stderr, '', t.text())
    assert.ok(t.treeUnchanged, t.text())
    if (t.status === 2) { assert.match(t.json.error, /--n/, t.text()); continue }
    assert.equal(t.status, 0, t.text())
    assert.match(t.json.branch, /^sdlc\/S-001-attempt--?\d+$/, t.text())
    accepted.push(`--n ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + '…' : v)} -> ${t.json.branch.slice(0, 80)}`)
  }
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-8.txt'), `accepted values:\n${accepted.join('\n')}\n`)
})

test('verify cli: TC-cli-9 custom branch formats wrap verify and attempt tails, --format wins, a bad format exits 2', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name:lower}' } } })
  const v = ['--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0']
  const a = ['--kind', 'attempt', '--id', 'S-001', '--n', '1']
  const cases = [
    [v, 'feature/PROJ-1-s-001-v0-http-api-0', 'config lower verify'],
    [a, 'feature/PROJ-1-s-001-attempt-1', 'config lower attempt'],
    [[...v, '--format', 'x/{name}/y'], 'x/S-001-v0-http-api-0/y', '--format suffix verify'],
    [[...a, '--format', 'x/{name}/y'], 'x/S-001-attempt-1/y', '--format suffix attempt'],
    [[...v, '--format', 'Team/PROJ-1-{name:lower}'], 'Team/PROJ-1-s-001-v0-http-api-0', 'lower keeps prefix case'],
    [[...a, '--format', 'sdlc/{name}'], 'sdlc/S-001-attempt-1', '--format over config'],
  ]
  for (const [args, want, label] of cases) {
    const t = name(repo, args)
    record('TC-cli-9', t, label)
    assertCleanOk(t, want)
  }
  for (const bad of ['feature/{name}/{name}', 'feature/{nam}', 'feat ure/{name}', 'feature/{name}.lock', 'x..y/{name}', 'nobraces']) {
    for (const args of [v, a]) {
      const t = name(repo, [...args, '--format', bad])
      record('TC-cli-9', t, `bad format ${bad}`)
      assertCleanRefusal(t, /format/)
      assert.equal(t.json.branch, undefined)
    }
  }
  const plain = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name}' } } })
  for (const [args, want] of [[v, 'feature/PROJ-1-S-001-v0-http-api-0'], [a, 'feature/PROJ-1-S-001-attempt-1']]) {
    const t = name(plain, args)
    record('TC-cli-9', t, 'config feature/PROJ-1-{name}')
    assertCleanOk(t, want)
    assert.equal(t.json.format, 'feature/PROJ-1-{name}')
  }
  const broken = r.gitRepo({ files: { '.sdlc/config.json': '{ not json' } })
  const t = name(broken, a)
  record('TC-cli-9', t, 'invalid config.json')
  assertCleanRefusal(t, /not valid JSON/)
})


test('verify cli: TC-cli-21 an explicit --ts flag is refused with one JSON error and no traceback', () => {
  const repo = r.gitRepo()
  for (const args of [['--ts', '20261008101500'], ['--ts=20261008101500'], ['--t', '20261008101500']]) {
    const t = name(repo, ['--kind', 'state', ...args])
    record('TC-cli-21', t, args.join(' '))
    assertCleanRefusal(t, /--t|unrecognized/)
    assert.equal(t.json.branch, undefined)
  }
})

test('verify cli: TC-cli-22 name with no --kind, an unknown kind, and from a cwd that is not a repo', () => {
  const repo = r.gitRepo()
  const noKind = name(repo, ['--id', 'S-001', '--n', '1'])
  record('TC-cli-22', noKind, 'without --kind')
  assertCleanRefusal(noKind, /--kind/)
  const unknown = name(repo, ['--kind', 'verif', '--id', 'S-001', '--round', '0', '--profile', 'cli', '--part', '0'])
  record('TC-cli-22', unknown, 'unknown kind verif')
  assertCleanRefusal(unknown, /verif/)
  const away = r.dir('not a repo ü')
  const t = r.run('branches.py', ['name', '--repo', away, '--kind', 'attempt', '--id', 'S-001', '--n', '1'], { cwd: away })
  record('TC-cli-22', t, 'repo dir that is not a git repo, with a space and unicode')
  assertCleanOk(t, 'sdlc/S-001-attempt-1')
  const v = r.run('branches.py', ['name', '--repo', away, '--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'], { cwd: away })
  record('TC-cli-22', v, 'verify in a non-git dir')
  assertCleanOk(v, 'sdlc/S-001-v0-http-api-0')
})

test('verify cli: TC-cli-23 name output for verify and attempt is the same on every run and in CI', () => {
  const repo = r.gitRepo()
  const v = ['--kind', 'verify', '--id', 'S-005a', '--round', '0', '--profile', 'cli', '--part', '0']
  const a = ['--kind', 'attempt', '--id', 'S-005a', '--n', '0']
  for (const [args, want] of [[v, 'sdlc/S-005a-v0-cli-0'], [a, 'sdlc/S-005a-attempt-0']]) {
    const outs = []
    for (const env of [{}, { CI: 'true' }, { LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8' }]) {
      const t = name(repo, args, { env, input: '' })
      record('TC-cli-23', t, `${args[1]} env ${JSON.stringify(env)}`)
      assertCleanOk(t, want)
      outs.push(t.stdout)
    }
    assert.equal(new Set(outs).size, 1)
  }
})

test('verify cli: TC-cli-24 ref safety of accepted verify and attempt names (seed probe)', () => {
  const repo = r.gitRepo()
  const rows = []
  const probes = [['--profile', '../x'], ['--profile', 'a b'], ['--profile', 'x~1'], ['--profile', 'x@{1}'], ['--profile', 'a:b'], ['--id', 'S-001.lock/x'], ['--profile', '-v']]
  for (const [flag, value] of probes) {
    const base = { '--id': 'S-001', '--round': '0', '--profile': 'http-api', '--part': '0', [flag]: value }
    const t = name(repo, ['--kind', 'verify', ...Object.entries(base).flatMap(([k, v]) => [`${k}=${v}`])])
    assert.doesNotMatch(t.stdout + t.stderr, /Traceback/, t.text())
    assert.ok(t.treeUnchanged, t.text())
    let refOk = null
    if (t.status === 0) refOk = r.exec('git', ['check-ref-format', '--branch', t.json.branch], { watch: [] }).status === 0
    rows.push(`${flag}=${JSON.stringify(value)} exit ${t.status} ${t.status === 0 ? t.json.branch : t.json.error} check-ref-format=${refOk}`)
  }
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-24.txt'), rows.join('\n') + '\n')
})
