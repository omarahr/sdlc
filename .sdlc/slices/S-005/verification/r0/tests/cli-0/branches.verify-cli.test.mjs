import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { cpSync } from 'node:fs'
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
  const broken = r.gitRepo({ files: { '.sdlc/config.json': '{ not json' } })
  const t = name(broken, a)
  record('TC-cli-9', t, 'invalid config.json')
  assertCleanRefusal(t, /not valid JSON/)
})

const GUARD = join(SKILL_DIR, 'test', 'push_guard.py')
const GUARD_TEST = join(SKILL_DIR, 'test', 'push-guard.test.mjs')

function guardOut(root, opts = {}) {
  const t = r.exec('python3', [GUARD, root], { watch: [], ...opts })
  record('TC-cli-10', t, `push_guard.py ${root === WT ? '<worktree>' : root}`)
  assert.equal(t.status, 0, t.text())
  assert.equal(t.stderr, '', t.text())
  return JSON.parse(t.stdout)
}

function pinsFromTest() {
  const src = readFileSync(GUARD_TEST, 'utf8')
  const start = src.indexOf('const PINS = {')
  const end = src.indexOf('\n}\n', start)
  return new Function(`${src.slice(start, end + 2)}; return PINS`)()
}

function funcOf(file, lineNo) {
  const lines = readFileSync(join(SKILL_DIR, file), 'utf8').split('\n')
  for (let i = lineNo - 1; i >= 0; i--) {
    const m = /^def (\w+)\(/.exec(lines[i])
    if (m) return m[1]
  }
  return null
}

test('verify cli: TC-cli-10 push_guard.py output equals the pins and each pinned push site is in the source', () => {
  const out = guardOut(WT)
  const pins = pinsFromTest()
  for (const key of Object.keys(pins)) assert.deepEqual(out[key], pins[key], `${key} differs from the pin`)
  assert.equal(pins.direct.length, 11)
  assert.equal(pins.network.length, 6)
  assert.equal(pins.pushes.length, 3)
  assert.deepEqual(pins.forge, ['next-action.py load_prs gh pr list'])

  const sw = readFileSync(join(SKILL_DIR, 'state-write.py'), 'utf8').split('\n')
  const pushLines = sw.map((l, i) => [i + 1, l]).filter(([, l]) => /git\(repo, "push"/.test(l))
  const sites = pushLines.map(([n, l]) => `${funcOf('state-write.py', n)} ${l.trim().replace(/"/g, "'")}`)
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-10.txt'), `### state-write.py push lines\n${pushLines.map(([n, l]) => `${n}: ${l.trim()}`).join('\n')}\n\n`)
  assert.deepEqual(sites.sort(), pins.pushes.map(p => p.replace(/^state-write\.py /, '')).sort())

  const na = readFileSync(join(SKILL_DIR, 'next-action.py'), 'utf8').split('\n')
  const prList = na.map((l, i) => [i + 1, l]).filter(([, l]) => /run\(repo, "gh", "pr", "list"/.test(l))
  assert.equal(prList.length, 2)
  for (const [n] of prList) assert.equal(funcOf('next-action.py', n), 'load_prs')

  const swText = sw.join('\n')
  assert.match(swText, /MILESTONE_BRANCH = re\.compile\(r"\^sdlc\/M-\\d\+\$"\)/)
  assert.match(swText, /if not MILESTONE_BRANCH\.match\(branch\)/)
  assert.match(swText, /want = f"sdlc\/\{milestone_id\}"/)
  assert.match(swText, /def advance_run_branch\(repo, config, run\)/)
  assert.ok(sw.filter(l => /advance_run_branch\(repo, config, run\)/.test(l)).length >= 2)
  assert.doesNotMatch('sdlc/S-001-v0-http-api-0', /^sdlc\/M-\d+$/)
})

test('verify cli: TC-cli-11 push-guard.test.mjs passes from the repo root, from another cwd and from a copied path with spaces', () => {
  const runs = [['repo root', WT, GUARD_TEST]]
  runs.push(['unrelated cwd', r.dir('elsewhere'), GUARD_TEST])
  const copy = join(r.root, 'copy with space ü')
  for (const base of ['skills', 'hooks']) cpSync(join(WT, base), join(copy, base), { recursive: true, filter: src => !src.includes('__pycache__') })
  runs.push(['copied tree', copy, join(copy, 'skills', 'sdlc', 'test', 'push-guard.test.mjs')])
  for (const [label, cwd, file] of runs) {
    const t = r.exec('node', ['--test', file], { cwd, watch: [] })
    record('TC-cli-11', t, label)
    assert.equal(t.status, 0, t.text())
    assert.match(t.stdout, /ℹ tests 6\b/, t.text())
    assert.match(t.stdout, /ℹ pass 6\b/, t.text())
    assert.match(t.stdout, /ℹ fail 0\b/, t.text())
    assert.match(t.stdout, /ℹ skipped 0\b/, t.text())
  }
})

test('verify cli: TC-cli-19 the loop gives its verify branch builder only to the profile agent and the collector', () => {
  const src = readFileSync(join(SKILL_DIR, 'sdlc-loop.js'), 'utf8')
  const start = src.indexOf('async function verifyPhase')
  const body = src.slice(start, start + src.slice(start).search(/\n}\s*\n/))
  const refs = body.split('\n').filter(l => /(?<![\w.])branch(?![\w:])/.test(l)).map(l => l.trim())
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-19.txt'), refs.join('\n') + '\n')
  assert.equal(refs.length, 3, refs.join('\n'))
  assert.equal(refs[0], 'const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`')
  assert.match(refs[1], /^const profileRun = g => run\(`verify-\$\{g\.profile\}`, \{[^}]*branch: branch\(g\)/)
  assert.match(refs[2], /run\('verify-collector', \{ sliceId: id, round, branches: groups\.map\(branch\) \}/)
  const outside = src.slice(0, start) + src.slice(start + body.length)
  assert.doesNotMatch(outside, /-v\$\{round\}-\$\{g\.profile\}/)
})

test('verify cli: TC-cli-20 the verify prompts hold no push or pull-request command', () => {
  const dir = join(SKILL_DIR, 'prompts')
  const files = readdirSync(dir).filter(f => /^verify-.*\.md$/.test(f))
  const hits = []
  for (const f of files) {
    readFileSync(join(dir, f), 'utf8').split('\n').forEach((l, i) => {
      if (/git push|\bpush\b|gh pr create|glab mr create|gh api/.test(l)) hits.push(`${f}:${i + 1}: ${l.trim()}`)
    })
  }
  if (LOG_DIR) appendFileSync(join(LOG_DIR, 'cli-0-TC-cli-20.txt'), `files: ${files.join(', ')}\nhits:\n${hits.join('\n') || '(none)'}\n`)
  assert.ok(files.includes('verify-collector.md'))
  assert.deepEqual(hits, [])
})
