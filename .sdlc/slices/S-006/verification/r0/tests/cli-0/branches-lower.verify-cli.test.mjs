import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT
const LOG = process.env.VERIFY_LOG ?? resolve(HERE, '../../logs/cli-0-transcripts.txt')
const { cliRunner } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs')).href)
const SKILL = join(ROOT, 'skills/sdlc')
const r = cliRunner()
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `branches.py verify-cli r0 transcripts, root ${ROOT}\n`)
const log = t => appendFileSync(LOG, `${t.text ? t.text() : t}\n`)

const FORMATS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}']
const CASES = [
  ['run', { n: 1 }], ['slice', { id: 'S-001' }], ['milestone', { id: 'M-1' }], ['e2e', { id: 'M-1' }],
  ['e2e-area', { id: 'M-1', area: 'api-v2' }], ['state', { ts: '20261008101500' }],
  ['verify', { id: 'S-001', round: 0, profile: 'http-api', part: 0 }], ['attempt', { id: 'S-001', n: 1 }],
]
const FLAG = { id: '--id', n: '--n', area: '--area', round: '--round', profile: '--profile', part: '--part' }

function pyName(fmt, kind, parts) {
  const code = 'import sys,json,importlib.util as u\ns=u.spec_from_file_location("b",sys.argv[1]);m=u.module_from_spec(s);s.loader.exec_module(m)\nprint(m.name(sys.argv[2],sys.argv[3],**json.loads(sys.argv[4])))'
  return execFileSync('python3', ['-I', '-c', code, join(SKILL, 'branches.py'), fmt, kind, JSON.stringify(parts)], { encoding: 'utf8', cwd: r.dir('pycwd') }).trim()
}
function cli(repo, fmt, kind, parts, extra = []) {
  const args = ['name', '--repo', repo, '--kind', kind]
  if (fmt !== null) args.push('--format', fmt)
  for (const [k, v] of Object.entries(parts)) if (FLAG[k]) args.push(FLAG[k], String(v))
  const t = r.run('branches.py', [...args, ...extra], { skillDir: SKILL })
  log(t)
  return t
}
function expectedTail(kind, p) {
  return { run: `run-${p.n}`, slice: p.id, milestone: p.id, e2e: `${p.id}-e2e`, 'e2e-area': `${p.id}-e2e-${p.area}`,
    state: `state-${p.ts}`, verify: `${p.id}-v${p.round}-${p.profile}-${p.part}`, attempt: `${p.id}-attempt-${p.n}` }[kind]
}

test('verify cli: TC-cli-1 CLI name equals Python name and the expected tail for all 24 cases', () => {
  const repo = r.gitRepo({})
  let n = 0
  for (const fmt of FORMATS) for (const [kind, parts] of CASES) {
    const cliParts = kind === 'state' ? {} : parts
    const t = cli(repo, fmt, kind, cliParts)
    assert.equal(t.status, 0, `${fmt} ${kind}: ${t.stderr}`)
    assert.equal(t.stderr, '')
    const branch = t.json.branch
    if (kind !== 'state') assert.equal(branch, pyName(fmt, kind, parts), `${fmt} ${kind}`)
    const [prefix, suffix] = fmt.split(/\{name(?::lower)?\}/)
    assert.ok(branch.startsWith(prefix) && branch.endsWith(suffix))
    const mid = branch.slice(prefix.length, branch.length - suffix.length)
    if (kind === 'state') assert.match(mid, /^state-\d{14}$/)
    else assert.equal(mid, fmt.includes(':lower') ? expectedTail(kind, parts).toLowerCase() : expectedTail(kind, parts))
    execFileSync('git', ['check-ref-format', '--branch', branch])
    assert.ok(t.treeUnchanged)
    n++
  }
  assert.equal(n, 24)
})

test('verify cli: TC-cli-2 lower lowercases only the tail', () => {
  const repo = r.gitRepo({})
  const a = cli(repo, 'feature/PROJ-1-{name:lower}', 'slice', { id: 'S-001' })
  assert.equal(a.json.branch, 'feature/PROJ-1-s-001')
  const b = cli(repo, 'Feat/PROJ-{name:lower}-X', 'slice', { id: 'S-001' })
  assert.equal(b.json.branch, 'Feat/PROJ-s-001-X')
  const c = cli(repo, 'Feat/PROJ-{name}-X', 'slice', { id: 'S-001' })
  assert.equal(c.json.branch, 'Feat/PROJ-S-001-X')
  const d = cli(repo, 'FEATURE/{name:lower}', 'e2e-area', { id: 'M-1', area: 'API-V2' })
  assert.equal(d.json.branch, 'FEATURE/m-1-e2e-api-v2')
  const e = cli(repo, 'feature/PROJ-1-{name:lower}', 'verify', { id: 'S-001', round: 0, profile: 'HTTP-API', part: 0 })
  assert.equal(e.json.branch, 'feature/PROJ-1-s-001-v0-http-api-0')
})

test('verify cli: TC-cli-3 format from config file, flag overrides config', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name:lower}' } } })
  assert.equal(cli(repo, null, 'slice', { id: 'S-009' }).json.branch, 'feature/PROJ-1-s-009')
  assert.equal(cli(repo, 'sdlc/{name}', 'slice', { id: 'S-009' }).json.branch, 'sdlc/S-009')
  const none = r.gitRepo({})
  assert.equal(cli(none, null, 'slice', { id: 'S-009' }).json.branch, 'sdlc/S-009')
})

test('verify cli: TC-cli-4 bad kind, bad format, missing part exit non-zero with JSON error and no stack trace', () => {
  const repo = r.gitRepo({})
  const BADFMT = ['sdlc/x', 'a/{name}{name:lower}', '{name:upper}', 'a b/{name:lower}', '..{name:lower}']
  const bad = [cli(repo, 'sdlc/{name}', 'nope', { id: 'S-001' })]
  for (const f of BADFMT) bad.push(cli(repo, f, 'slice', { id: 'S-001' }))
  bad.push(cli(repo, 'sdlc/{name}', 'slice', {}))
  bad.push(cli(repo, 'sdlc/{name}', 'verify', { id: 'S-001', round: 0, profile: 'cli' }))
  bad.push(cli(repo, 'sdlc/{name}', 'slice', { id: '' }))
  bad.push(cli(repo, 'sdlc/{name}', 'run', { n: 'x' }))
  for (const t of bad) {
    assert.notEqual(t.status, 0, t.text())
    assert.ok(!/Traceback/.test(t.stderr + t.stdout), t.text())
    assert.ok(t.treeUnchanged)
  }
  for (const t of bad) if (t.json) assert.equal(t.json.ok, false)
  const missing = r.run('branches.py', ['name', '--repo', join(repo, 'nope'), '--kind', 'slice', '--id', 'S-1'], { skillDir: SKILL })
  log(missing)
  assert.notEqual(missing.status, 0)
  assert.ok(!/Traceback/.test(missing.stderr))
})

test('verify cli: TC-cli-5 unicode ids, spaces in repo path, repeat run is idempotent', () => {
  const repo = r.gitRepo({})
  const sp = r.dir('a dir with spaces é')
  const t1 = cli(sp, 'feature/PROJ-1-{name:lower}', 'slice', { id: 'S-001' })
  const t2 = cli(sp, 'feature/PROJ-1-{name:lower}', 'slice', { id: 'S-001' })
  assert.equal(t1.status, 0)
  assert.equal(t1.stdout, t2.stdout)
  const u = cli(repo, 'feature/{name:lower}', 'slice', { id: 'ÄÖ-İ' })
  log(u)
  assert.equal(u.status, 0)
  assert.equal(u.json.branch, 'feature/' + 'ÄÖ-İ'.toLowerCase())
  const ci = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'], { skillDir: SKILL, env: { CI: '1', LANG: 'C', LC_ALL: 'C' } })
  log(ci)
  assert.equal(ci.json.branch, 'sdlc/S-001')
})

test('verify cli: TC-cli-6 unknown flag, help, no args', () => {
  const unk = r.run('branches.py', ['name', '--repo', '.', '--kind', 'slice', '--id', 'S-1', '--bogus', 'x'], { skillDir: SKILL })
  log(unk)
  assert.equal(unk.status, 2)
  assert.ok(!/Traceback/.test(unk.stderr))
  const none = r.run('branches.py', [], { skillDir: SKILL })
  log(none)
  assert.notEqual(none.status, 0)
  assert.ok(!/Traceback/.test(none.stderr))
})
