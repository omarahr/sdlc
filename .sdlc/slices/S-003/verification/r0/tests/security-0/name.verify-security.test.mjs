import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = process.env.SDLC_VERIFY_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', '..')
const KIT = join(REPO, 'skills', 'sdlc', 'test', 'testkit')
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const { load, plantDecoy, decoyFired } = await import(join(KIT, 'attack-corpus.mjs'))

const r = cliRunner()
const transcripts = []

after(() => {
  const out = process.env.SECURITY_LOG
  if (!out) return
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, transcripts.join('\n\n') + '\n')
})

function name(repo, args, opts = {}) {
  const t = r.run('branches.py', ['name', '--repo', repo, ...args], opts)
  transcripts.push(t.text().split('\n').map((l) => (l.length > 300 ? l.slice(0, 300) + ` …(${l.length} chars)` : l)).join('\n'))
  return t
}

function contract(t, label) {
  assert.notEqual(t.status, null, `${label}: no exit code: ${t.spawnError}`)
  assert.ok(t.status === 0 || t.status === 2, `${label}: exit ${t.status}\n${t.stderr}`)
  assert.doesNotMatch(t.stderr, /Traceback/, `${label}: traceback on stderr`)
  assert.equal(t.stderr, '', `${label}: stderr not empty`)
  const lines = t.stdout.split('\n').filter((l) => l !== '')
  assert.equal(lines.length, 1, `${label}: stdout must be one line, got ${lines.length}`)
  const obj = JSON.parse(lines[0])
  assert.equal(typeof obj, 'object', `${label}: stdout is not an object`)
  assert.ok(obj !== null && !Array.isArray(obj), `${label}: stdout is not an object`)
  if (t.status === 0) assert.equal(obj.ok, true, `${label}: exit 0 with ok ${obj.ok}`)
  else {
    assert.equal(obj.ok, false, `${label}: exit 2 with ok ${obj.ok}`)
    assert.equal(typeof obj.error, 'string', `${label}: error not a string`)
    assert.ok(obj.error.length > 0, `${label}: empty error`)
  }
  assert.ok(t.treeUnchanged, `${label}: tree changed ${JSON.stringify(Object.values(t.tree).map((d) => d.diff))}`)
  return obj
}

function refused(t, label, mention) {
  const obj = contract(t, label)
  assert.equal(t.status, 2, `${label}: expected exit 2, got ${t.status} ${t.stdout}`)
  if (mention) assert.match(obj.error, mention, `${label}: error does not name ${mention}`)
  return obj
}

const repo = r.gitRepo({ files: { 'README.md': 'x\n' } })
const lowerRepo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'team/{name:lower}-x' } } })

test('verify security: VS-4 a missing or empty required part gives one JSON error, exit 2, no side effect', () => {
  refused(name(repo, ['--kind', 'e2e-area', '--id', 'M-1']), 'e2e-area no area', /\barea\b/)
  refused(name(repo, ['--kind', 'e2e-area', '--id', 'M-1', '--area', '']), 'e2e-area empty area', /\barea\b/)
  refused(name(repo, ['--kind', 'e2e-area', '--area', 'api']), 'e2e-area no id', /\bid\b/)
  refused(name(repo, ['--kind', 'e2e-area', '--id', '', '--area', 'api']), 'e2e-area empty id', /\bid\b/)
  refused(name(repo, ['--kind', 'slice']), 'slice no id', /\bid\b/)
  refused(name(repo, ['--kind', 'slice', '--id', '']), 'slice empty id', /\bid\b/)
  refused(name(repo, ['--kind', 'slice', '--id', '', '--format', 'feature/{name}']), 'slice empty id with format flag', /\bid\b/)
  refused(name(lowerRepo, ['--kind', 'e2e-area', '--id', 'M-1']), 'e2e-area no area with config format', /\barea\b/)
})

test('verify security: VS-4 kinds with no TAILS row yet give one JSON error, exit 2, no traceback', () => {
  for (const kind of ['run', 'milestone', 'e2e', 'verify', 'attempt']) {
    refused(name(repo, ['--kind', kind, '--id', 'S-001', '--n', '1', '--area', 'api', '--round', '1', '--profile', 'cli', '--part', '0']), `kind ${kind}`)
    refused(name(repo, ['--kind', kind]), `kind ${kind} bare`)
  }
})

test('verify security: VS-9 hostile kind values are refused with one JSON error', () => {
  for (const e of [...load('unicode-confusables', { argv: true }).filter((x) => x.id.startsWith('kind-')), { id: 'empty', value: '' }, { id: 'traversal', value: '../slice' }, { id: 'space', value: 'slice ' }]) {
    refused(name(repo, ['--kind', e.value, '--id', 'S-001']), `kind ${e.id}`, /kind/)
  }
})

const PART_FAMILIES = ['control-chars', 'traversal', 'unicode-whitespace', 'unicode-confusables', 'format-strings', 'injection', 'oversized']

for (const family of PART_FAMILIES) {
  test(`verify security: VS-9 ${family} values in --id and --area are literal text, one JSON object, no side effect`, () => {
    for (const e of load(family, { argv: true })) {
      if (e.value === '') continue
      const s = contract(name(repo, ['--kind', 'slice', '--id', e.value]), `slice id ${family}/${e.id}`)
      assert.equal(s.branch, 'sdlc/' + e.value, `slice id ${family}/${e.id}: branch is not the literal part`)
      const a = contract(name(repo, ['--kind', 'e2e-area', '--id', e.value, '--area', e.value]), `e2e-area ${family}/${e.id}`)
      assert.equal(a.branch, `sdlc/${e.value}-e2e-${e.value}`, `e2e-area ${family}/${e.id}: branch is not the literal parts`)
      const l = contract(name(lowerRepo, ['--kind', 'slice', '--id', e.value]), `lower ${family}/${e.id}`)
      assert.equal(typeof l.branch, 'string')
      assert.ok(l.branch.startsWith('team/') && l.branch.endsWith('-x'), `lower ${family}/${e.id}: prefix or suffix lost`)
    }
  })
}

test('verify security: VS-9 a placeholder inside a part is never re-expanded', () => {
  const cases = [
    ['{name}', 'sdlc/{name}'],
    ['{name:lower}', 'sdlc/{name:lower}'],
    ['{0}', 'sdlc/{0}'],
    ['%s', 'sdlc/%s'],
    ['{id}', 'sdlc/{id}'],
    ['{0.__class__}', 'sdlc/{0.__class__}'],
    ['{name}{name}', 'sdlc/{name}{name}'],
  ]
  for (const [value, expected] of cases) {
    const s = contract(name(repo, ['--kind', 'slice', '--id', value]), `placeholder ${value}`)
    assert.equal(s.branch, expected)
    const a = contract(name(repo, ['--kind', 'e2e-area', '--id', 'M-1', '--area', value]), `placeholder area ${value}`)
    assert.equal(a.branch, `sdlc/M-1-e2e-${value}`)
  }
  const l = contract(name(lowerRepo, ['--kind', 'slice', '--id', '{NAME}']), 'lower placeholder')
  assert.equal(l.branch, 'team/{name}-x')
  const f = contract(name(repo, ['--kind', 'slice', '--id', '{name}', '--format', 'a/{name}/b']), 'placeholder with format flag')
  assert.equal(f.branch, 'a/{name}/b')
})

test('verify security: VS-9 flag-like part values never switch a flag or hide a part', () => {
  for (const e of load('flag-like-values', { argv: true })) {
    const eq = contract(name(repo, ['--kind', 'slice', `--id=${e.value}`]), `id= ${e.id}`)
    if (eq.ok) assert.equal(eq.branch, 'sdlc/' + e.value, `id= ${e.id}`)
    else assert.match(eq.error, /\bid\b/, `id= ${e.id}`)
    const sep = contract(name(repo, ['--kind', 'slice', '--id', e.value]), `id sep ${e.id}`)
    if (sep.ok) assert.equal(sep.branch, 'sdlc/' + e.value, `id sep ${e.id}`)
    const area = contract(name(repo, ['--kind', 'e2e-area', '--id', 'M-1', `--area=${e.value}`]), `area= ${e.id}`)
    if (area.ok) assert.equal(area.branch, `sdlc/M-1-e2e-${e.value}`)
  }
  const fmt = contract(name(repo, ['--kind', 'slice', '--id=--format=evil/{name}']), 'id carries a format flag')
  assert.equal(fmt.format, 'sdlc/{name}')
  assert.equal(fmt.branch, 'sdlc/--format=evil/{name}')
  const help = contract(name(repo, ['--kind', 'slice', '--id', 'S-1', '--area=--help']), 'area carries help')
  assert.equal(help.branch, 'sdlc/S-1')
  refused(name(repo, ['--kind', 'slice', '--id', '--help']), 'id swallows --help')
  refused(name(repo, ['--kind', 'slice', '--id', '--format', 'x/{name}']), 'id followed by format flag')
  const twice = contract(name(repo, ['--kind', 'slice', '--id', 'S-1', '--id', 'S-2']), 'duplicated id')
  assert.equal(twice.branch, 'sdlc/S-2')
})

test('verify security: VS-9 a non-integer --n, --round or --part gives one JSON error and exit 2', () => {
  const nonIntegers = load('integer-forms', { argv: true }).filter((e) => ['empty', 'float', 'exp', 'word', 'inf', 'nan', 'hex'].includes(e.id))
  nonIntegers.push({ id: 'digits-4301', value: '9'.repeat(4301) }, { id: 'digits-100k', value: '9'.repeat(100000) }, { id: 'neg-5000', value: '-' + '9'.repeat(5000) }, { id: 'roman', value: 'Ⅷ' }, { id: 'superscript', value: '²' }, { id: 'circled', value: '①' })
  for (const flag of ['--n', '--round', '--part']) {
    for (const e of nonIntegers) {
      const o = refused(name(repo, ['--kind', 'slice', '--id', 'S-001', flag, e.value]), `${flag} ${e.id}`)
      assert.match(o.error, new RegExp(flag.slice(2)), `${flag} ${e.id}: error does not name the flag`)
    }
  }
})

test('verify security: VS-9 integer forms and unicode digits in --n, --round, --part never crash', () => {
  const values = [...load('integer-forms', { argv: true }), ...load('unicode-digits', { argv: true }), ...load('huge-integers', { argv: true })]
  for (const flag of ['--n', '--round', '--part']) {
    for (const e of values) {
      const o = contract(name(repo, ['--kind', 'slice', '--id', 'S-001', flag, e.value]), `${flag} ${e.family}/${e.id}`)
      if (o.ok) assert.equal(o.branch, 'sdlc/S-001')
    }
  }
})

test('verify security: VS-9 invalid UTF-8 bytes in a part give one JSON object and no traceback', () => {
  const script = join(r.skillDir, 'branches.py')
  const relay = 'import subprocess,sys\nb=sys.argv[1].encode()\nrepo=sys.argv[2].encode()\nfor part in (b"\\xff\\xfe", b"S-\\xc0\\xaf", b"\\xed\\xa0\\x80"):\n  for args in ([b"--kind", b"slice", b"--id", part], [b"--kind", b"e2e-area", b"--id", b"M-1", b"--area", part]):\n    p=subprocess.run([b"python3", b, b"name", b"--repo", repo, *args], capture_output=True)\n    sys.stdout.write("%d\\t%s\\t%s\\n" % (p.returncode, p.stdout.decode("utf-8","backslashreplace").strip(), p.stderr.decode("utf-8","backslashreplace").replace("\\n"," ")))\n'
  const t = r.exec('python3', ['-I', '-c', relay, script, repo])
  transcripts.push(t.text())
  assert.equal(t.status, 0, t.stderr)
  const rows = t.stdout.trim().split('\n').map((l) => l.split('\t'))
  assert.equal(rows.length, 6)
  for (const [code, out, err] of rows) {
    assert.ok(code === '0' || code === '2', `exit ${code}`)
    assert.doesNotMatch(err ?? "", /Traceback/)
    const obj = JSON.parse(out)
    assert.equal(typeof obj.ok, 'boolean')
  }
  assert.ok(t.treeUnchanged)
})

test('verify security: VS-9 branches.py imports no module from the cwd', () => {
  const cwd = r.dir('cwd-decoy')
  const decoys = ['branches', 'json', 'argparse', 're', 'subprocess', 'datetime', 'os', 'sys'].map((m) => plantDecoy(cwd, { module: m }))
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'], { cwd })
  transcripts.push(t.text())
  for (const d of decoys) assert.equal(decoyFired(d), null, `decoy ${d.path} was imported`)
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.json.branch, 'sdlc/S-001')
  const s = r.run('branches.py', ['name', '--repo', repo, '--kind', 'state'], { cwd })
  transcripts.push(s.text())
  for (const d of decoys) assert.equal(decoyFired(d), null, `decoy ${d.path} was imported by the state kind`)
  assert.match(s.json.branch, /^sdlc\/state-\d{14}$/)
})

test('verify security: VS-9 a hostile --repo path gives one JSON object and writes nothing', () => {
  for (const e of load('traversal', { argv: true })) {
    const t = r.run('branches.py', ['name', '--repo', e.value, '--kind', 'slice', '--id', 'S-001'])
    transcripts.push(t.text())
    contract(t, `repo ${e.id}`)
  }
})
