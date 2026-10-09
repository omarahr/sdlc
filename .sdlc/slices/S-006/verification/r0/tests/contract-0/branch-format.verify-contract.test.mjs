import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.VERIFY_ROOT
const HERE = dirname(fileURLToPath(import.meta.url))
const SEED = Number.parseInt(process.env.TESTKIT_SEED || '20261010', 10)
const { rng } = await import(join(ROOT, 'skills/sdlc/test/testkit/property.mjs'))
const BRANCHES = join(ROOT, 'skills/sdlc/branches.py')
const KINDS = ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state', 'verify', 'attempt']
const WORDS = ['S-001', 'S-fix-M-1-2', 'M-12', 'api-v2', 'API', 'Ünï', 'İstanbul', 'ß', 'ǅ', 'ΑΣ', 'x', 'ts', 'http-api', 'Http-API', '日本', '\u{1f600}']
const PREFIXES = ['', 'sdlc/', 'feature/PROJ-1-', 'Feat/PROJ-', 'TEAM/Ünï-', 'A.B/']
const SUFFIXES = ['', '-X', '-END', '_Z', '/TAIL']

function genCase(r) {
  const kind = r.pick(KINDS)
  const w = () => r.pick(WORDS)
  const parts = {
    run: { n: r.int(0, 99999) }, slice: { id: w() }, milestone: { id: w() }, e2e: { id: w() }, 'e2e-area': { id: w(), area: w() },
    state: { ts: String(r.int(10000000000000, 99999999999999)) },
    verify: { id: w(), round: r.int(0, 9), profile: w(), part: r.int(0, 9) }, attempt: { id: w(), n: r.int(1, 99) },
  }[kind]
  const ph = r.pick(['{name}', '{name:lower}'])
  return { fmt: r.pick(PREFIXES) + ph + r.pick(SUFFIXES), kind, parts }
}

function py(args) {
  const r = spawnSync('python3', ['-I', ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' }, cwd: mkdtempSync(join(tmpdir(), 'vc-')), maxBuffer: 1 << 28 })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

test('verify contract: name, tail and split agree with a spec reference model over 3000 cases', () => {
  const r = rng(SEED)
  const cases = Array.from({ length: 3000 }, () => genCase(r))
  const f = join(mkdtempSync(join(tmpdir(), 'vc-')), 'cases.json')
  writeFileSync(f, JSON.stringify(cases))
  const out = py([join(HERE, 'branch_format_verify_contract.py'), BRANCHES, f])
  console.log(`property name-vs-model: seed=${SEED} runs=${out.checked} violations=${out.badCount}`)
  assert.equal(out.checked, 3000)
  assert.deepEqual(out.bad, [])
})

test('verify contract: the spec examples hold verbatim', () => {
  const calls = [
    ['feature/PROJ-1-{name:lower}', 'slice', { id: 'S-001' }, 'feature/PROJ-1-s-001'],
    ['feature/PROJ-1-{name}', 'slice', { id: 'S-001' }, 'feature/PROJ-1-S-001'],
    ['Feat/PROJ-{name:lower}-X', 'slice', { id: 'S-001' }, 'Feat/PROJ-s-001-X'],
    ['FEAT/{name:lower}', 'e2e-area', { id: 'M-1', area: 'API' }, 'FEAT/m-1-e2e-api'],
    ['sdlc/{name}', 'e2e-area', { id: 'M-1', area: 'api' }, 'sdlc/M-1-e2e-api'],
    ['sdlc/{name}', 'e2e', { id: 'M-1' }, 'sdlc/M-1-e2e'],
    ['sdlc/{name}', 'verify', { id: 'S-001', round: 0, profile: 'http-api', part: 0 }, 'sdlc/S-001-v0-http-api-0'],
  ]
  const f = join(mkdtempSync(join(tmpdir(), 'vc-')), 'cases.json')
  writeFileSync(f, JSON.stringify(calls.map(([fmt, kind, parts]) => ({ fmt, kind, parts }))))
  const out = py([join(HERE, 'branch_format_verify_contract.py'), BRANCHES, f])
  assert.equal(out.badCount, 0)
  const names = spawnSync('python3', ['-I', '-c', `
import importlib.util, json, sys
s = importlib.util.spec_from_file_location("t", sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(json.dumps([m.name(c["fmt"], c["kind"], **c["parts"]) for c in json.load(open(sys.argv[2]))]))`, BRANCHES, f], { encoding: 'utf8' })
  assert.deepEqual(JSON.parse(names.stdout), calls.map((c) => c[3]))
})

test('verify contract: all 24 spec cases pass git check-ref-format and have no placeholder left', () => {
  const sample = { run: { n: 1 }, slice: { id: 'S-001' }, milestone: { id: 'M-1' }, e2e: { id: 'M-1' }, 'e2e-area': { id: 'M-1', area: 'api-v2' }, state: { ts: '20261008101500' }, verify: { id: 'S-001', round: 0, profile: 'http-api', part: 0 }, attempt: { id: 'S-001', n: 1 } }
  const fmts = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}']
  const cases = fmts.flatMap((fmt) => KINDS.map((kind) => ({ fmt, kind, parts: sample[kind] })))
  assert.equal(cases.length, 24)
  const f = join(mkdtempSync(join(tmpdir(), 'vc-')), 'cases.json')
  writeFileSync(f, JSON.stringify(cases))
  const names = JSON.parse(spawnSync('python3', ['-I', '-c', `
import importlib.util, json, sys
s = importlib.util.spec_from_file_location("t", sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(json.dumps([m.name(c["fmt"], c["kind"], **c["parts"]) for c in json.load(open(sys.argv[2]))]))`, BRANCHES, f], { encoding: 'utf8' }).stdout)
  for (const b of names) {
    execFileSync('git', ['check-ref-format', '--branch', b])
    assert.ok(!b.includes('{') && !b.includes('}'), b)
  }
  console.log(names.join('\n'))
})

function extractScanner() {
  const src = readFileSync(join(ROOT, 'skills/sdlc/test/branches.test.mjs'), 'utf8')
  const start = src.indexOf('const PUSH_SITE')
  const end = src.indexOf("test('T-R-120a")
  assert.ok(start > 0 && end > start)
  return new Function(`${src.slice(start, end)}\nreturn findE2eAreaPushViolations`)()
}

test('verify contract: scanner flags planted pushes, pr create, wrapped pushes and ignores comments', () => {
  const scan = extractScanner()
  const hit = (s) => scan(s).violations.length
  assert.equal(hit('git(repo, "push", "-u", "origin", name(fmt, "e2e-area", id=m, area=a))\n'), 1)
  assert.equal(hit('gh pr create --head sdlc/M-1-e2e-api --base main\n'), 1)
  assert.equal(hit('git(repo, "pr", "create", "--head", name(fmt, "e2e-area", id=m))\n'), 0, 'pr create split in two strings is not matched: limit')
  assert.equal(hit('subprocess.run(["gh", "pr", "create", "--head", "x-e2e-api"])\n'), 0, 'documented limit: list-form pr create')
  assert.equal(hit('git(repo,\n"push",\n"origin",\n"x",\n"y",\nname(fmt, "e2e-area"))\n'), 0, 'documented limit: e2e-area more than 3 lines after the push line')
  assert.equal(hit('git(repo,\n"push",\n"origin",\nname(fmt, "e2e-area"))\n'), 1)
  assert.equal(hit('# git push e2e-area\n// git push e2e-area\n'), 0)
  assert.equal(hit('git(repo, "push", "origin", name(fmt, "e2e", id=m))\n'), 0, 'plain e2e branch is allowed')
  assert.equal(hit('git(repo, "push", "origin", branch)\n'), 0, 'documented limit: variable-built branch')
  assert.equal(hit('git(repo, "push", "origin", "sdlc/M-1-e2e-api")  # trailing comment\n'), 1)
  assert.equal(scan('git push\n').sites.length, 1)
  assert.equal(scan('').sites.length, 0)
})

test('verify contract: mutation, the real T-R-120 and T-R-011 tests fail on planted defects in a scratch copy', () => {
  const copy = mkdtempSync(join(tmpdir(), 'vc-mut-'))
  cpSync(join(ROOT, 'skills'), join(copy, 'skills'), { recursive: true })
  const runIn = (pattern) => spawnSync('node', ['--test', '--test-name-pattern', pattern, join(copy, 'skills/sdlc/test/branches.test.mjs')], { encoding: 'utf8', cwd: copy, env: { PATH: process.env.PATH, HOME: process.env.HOME } })
  assert.equal(runIn('T-R-120a|T-R-011a|T-R-068a').status, 0, 'clean copy passes')
  const sw = join(copy, 'skills/sdlc/state-write.py')
  appendFileSync(sw, '\ngit(repo, "push", "-u", "origin", name(fmt, "e2e-area", id=m, area=a))\n')
  const r1 = runIn('T-R-120a')
  console.log('mutation e2e-area push in state-write.py: exit', r1.status)
  assert.notEqual(r1.status, 0)
  writeFileSync(sw, readFileSync(join(ROOT, 'skills/sdlc/state-write.py')))
  const br = join(copy, 'skills/sdlc/branches.py')
  const orig = readFileSync(br, 'utf8')
  assert.ok(orig.includes('middle = middle.lower()'))
  writeFileSync(br, orig.replace('middle = middle.lower()', 'middle = middle'))
  const r2 = runIn('T-R-011a|T-R-068a')
  console.log('mutation drop lower: exit', r2.status)
  assert.notEqual(r2.status, 0)
  writeFileSync(br, orig.replace('return prefix + middle + suffix', 'return (prefix + middle + suffix).lower()'))
  const r3 = runIn('T-R-011a')
  console.log('mutation lower whole branch: exit', r3.status)
  assert.notEqual(r3.status, 0)
  writeFileSync(br, orig.replace('return prefix + middle + suffix', 'return prefix.lower() + middle + suffix'))
  const r4 = runIn('T-R-011a')
  console.log('mutation lower prefix only: exit', r4.status)
  assert.notEqual(r4.status, 0)
})

test('verify contract: no import of forbidden modules and consumer view via the CLI entry point', () => {
  const src = readFileSync(BRANCHES, 'utf8')
  const imports = [...src.matchAll(/^(?:import|from)\s+(\w+)/gm)].map((m) => m[1])
  console.log('imports:', imports.join(','))
  assert.deepEqual([...new Set(imports)].sort(), ['argparse', 'datetime', 'json', 'os', 're', 'subprocess', 'sys'])
})
