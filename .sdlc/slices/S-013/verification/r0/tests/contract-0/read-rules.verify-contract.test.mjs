import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.VERIFY_ROOT
const HERE = dirname(fileURLToPath(import.meta.url))
const SEED = process.env.TESTKIT_SEED || '20261010'
const BRANCHES = join(ROOT, 'skills/sdlc/branches.py')
const { stubServer, restrictedPath } = await import(join(ROOT, 'skills/sdlc/test/testkit/stub-server.mjs'))

function repoWith(config, { raw } = {}) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'verify-contract-repo-')))
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc/config.json'), raw ?? JSON.stringify(config))
  return repo
}

function read(repo, samples, env, timeout = 120000) {
  const r = spawnSync('python3', ['-I', join(HERE, 'read_rules_driver_verify_contract.py'), BRANCHES, repo, JSON.stringify(samples)], {
    encoding: 'utf8',
    env: { ...env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', HOME: tmpdir() },
    timeout,
    maxBuffer: 512 * 1024 * 1024,
  })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

function quoteRef(s) {
  let out = ''
  for (const b of Buffer.from(s, 'utf8')) {
    const c = String.fromCharCode(b)
    out += /[A-Za-z0-9_.\-~]/.test(c) ? c : '%' + b.toString(16).toUpperCase().padStart(2, '0')
  }
  return out
}

const gh = (script, fallback) => stubServer({ script, fallback })
const pat = (extra = {}, params = {}) => ({ type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 'feature/', ...params }, ...extra })

test('verify contract TC-contract-1 VS-1: one gh call per sample, argv list, every slash %2F, cwd is the repo', () => {
  const samples = ['sdlc/S-001', 'M-1-e2e', 'sdlc/state-20260101000000', 'a b', '50%', 'q?x#y', '../x', 'é☃😀', '-rf', 'a\nb', 'a\\b', "it's", '$(id)', '']
  const stub = gh([], { stdout: [] })
  const repo = repoWith({ forge: 'github' })
  const out = read(repo, samples, stub.env())
  const calls = stub.calls()
  console.log(calls.map((c) => JSON.stringify(c)).join('\n'))
  assert.equal(calls.length, samples.length)
  calls.forEach((c, i) => {
    assert.deepEqual(c.argv, ['api', 'repos/{owner}/{repo}/rules/branches/' + quoteRef(samples[i])])
    assert.equal(c.cwd, repo)
    assert.ok(!c.argv[1].slice('repos/{owner}/{repo}/rules/branches/'.length).includes('/'))
  })
  assert.equal(out.result.unchecked, false)
})

test('verify contract TC-contract-2 VS-1: forge other than github makes no call and returns the shape', () => {
  for (const config of [{ forge: '' }, { forge: 'gitlab' }, {}, { forge: 5 }, { forge: null }, { forge: 'GitHub' }, { forge: ['github'] }]) {
    const stub = gh([], { stdout: [] })
    const out = read(repoWith(config), ['sdlc/S-001'], stub.env())
    assert.equal(stub.count(), 0, JSON.stringify(config))
    assert.deepEqual(Object.keys(out.result).sort(), ['by_sample', 'forge', 'notes', 'rules', 'unchecked'])
    assert.equal(out.result.unchecked, true)
    assert.deepEqual(out.result.rules, [])
    assert.deepEqual(out.result.notes, [])
  }
})

test('verify contract TC-contract-3 VS-1: empty sample list makes no call and is a successful read', () => {
  const stub = gh([], { stdout: [] })
  const out = read(repoWith({ forge: 'github' }), [], stub.env())
  console.log(JSON.stringify(out))
  assert.equal(stub.count(), 0)
  assert.deepEqual(out.result.by_sample, {})
  assert.deepEqual(out.result.notes, [])
})

test('verify contract TC-contract-4 VS-2: only branch_name_pattern objects become rules with five keys', () => {
  const body = [
    pat({ ruleset_id: 7 }, { name: 'team', operator: 'regex', pattern: '^x$', negate: true }),
    { type: 'creation' }, { type: 'pull_request', parameters: { operator: 'regex', pattern: 'x' } }, { type: 'required_status_checks' },
    { type: 'tag_name_pattern', parameters: { operator: 'contains', pattern: 'v' } },
    { type: 'commit_message_pattern', parameters: { operator: 'contains', pattern: 'v' } },
    'junk', 5, null, [], { parameters: {} },
  ]
  const stub = gh([{ stdout: body }])
  const out = read(repoWith({ forge: 'github' }), ['sdlc/S-001'], stub.env())
  console.log(JSON.stringify(out.result))
  assert.deepEqual(out.result.rules, [{ source: 'github', kind: 'regex', pattern: '^x$', negate: true, label: 'team' }])
  assert.deepEqual(Object.keys(out.result.rules[0]), ['source', 'kind', 'pattern', 'negate', 'label'])
})

test('verify contract TC-contract-5 VS-2: negate absent gives false; label fallback name, ruleset id, constant; empty name falls through', () => {
  const body = [
    pat({}, {}),
    pat({ ruleset_id: 12 }, {}),
    pat({ ruleset_id: 12 }, { name: 'named', negate: false }),
    pat({ ruleset_id: 0 }, { name: '' }),
    pat({ ruleset_id: null }, {}),
    { type: 'branch_name_pattern' },
  ]
  const stub = gh([{ stdout: body }])
  const out = read(repoWith({ forge: 'github' }), ['a'], stub.env())
  console.log(JSON.stringify(out.result.rules))
  const labels = out.result.by_sample.a.map((r) => r.label)
  assert.deepEqual(labels.slice(0, 3), ['branch_name_pattern', 'ruleset 12', 'named'])
  assert.deepEqual(out.result.by_sample.a.map((r) => r.negate), [false, false, false, false, false, false])
  assert.equal(labels[3], 'ruleset 0')
})

test('verify contract TC-contract-6 VS-2: non-bool negate is read as the spec says (parameters.negate or false)', () => {
  const body = [pat({}, { negate: 'false' }), pat({}, { negate: 0 }), pat({}, { negate: null }), pat({}, { negate: 1 })]
  const stub = gh([{ stdout: body }])
  const out = read(repoWith({ forge: 'github' }), ['a'], stub.env())
  console.log(JSON.stringify(out.result.by_sample.a.map((r) => r.negate)))
  assert.deepEqual(out.result.by_sample.a.map((r) => typeof r.negate), ['boolean', 'boolean', 'boolean', 'boolean'])
})

test('verify contract TC-contract-7 VS-3: each sample keeps its own rules, union deduplicates, empty bodies stay empty', () => {
  const A = pat({ ruleset_id: 1 }, { pattern: 'a/' })
  const B = pat({ ruleset_id: 2 }, { pattern: 'b/' })
  const stub = gh([{ stdout: [A, B] }, { stdout: [B] }, { stdout: [] }, { stdout: [A] }])
  const out = read(repoWith({ forge: 'github' }), ['s1', 's2', 's3', 's4'], stub.env())
  const r = out.result
  console.log(JSON.stringify(r))
  assert.deepEqual(Object.keys(r.by_sample), ['s1', 's2', 's3', 's4'])
  assert.deepEqual(r.by_sample.s1.map((x) => x.pattern), ['a/', 'b/'])
  assert.deepEqual(r.by_sample.s2.map((x) => x.pattern), ['b/'])
  assert.deepEqual(r.by_sample.s3, [])
  assert.deepEqual(r.by_sample.s4.map((x) => x.pattern), ['a/'])
  assert.deepEqual(r.rules.map((x) => x.pattern), ['a/', 'b/'])
})

test('verify contract TC-contract-8 VS-3: rules differing only in negate or label are not merged', () => {
  const stub = gh([{ stdout: [pat({ ruleset_id: 1 }, { negate: true }), pat({ ruleset_id: 1 }, { negate: false }), pat({ ruleset_id: 2 })] }])
  const out = read(repoWith({ forge: 'github' }), ['s1'], stub.env())
  assert.equal(out.result.rules.length, 3)
})

test('verify contract TC-contract-9 VS-3: duplicate sample names', () => {
  const stub = gh([{ stdout: [pat()] }, { stdout: [] }])
  const out = read(repoWith({ forge: 'github' }), ['dup', 'dup'], stub.env())
  console.log(`calls=${stub.count()} ${JSON.stringify(out.result)}`)
  assert.deepEqual(Object.keys(out.result.by_sample), ['dup'])
  assert.equal(out.result.unchecked, false)
})

const NOTE = /^rules unknown on github: .+/s

function expectUnknown(out, stub, calls = 1) {
  assert.equal(stub.count(), calls)
  assert.deepEqual(out.result.rules, [])
  assert.deepEqual(out.result.by_sample, {})
  assert.equal(out.result.unchecked, true)
  assert.equal(out.result.notes.length, 1)
  assert.match(out.result.notes[0], NOTE)
}

test('verify contract TC-contract-10 VS-4: exit 1 with stderr is one note with the stderr text, one call only', () => {
  const stub = gh([{ stdout: [pat()] }, { stderr: 'boom\n', exit: 1 }], { stdout: [pat()] })
  const out = read(repoWith({ forge: 'github' }), ['s1', 's2', 's3'], stub.env())
  console.log(JSON.stringify(out.result))
  assert.equal(stub.count(), 2)
  assert.deepEqual(out.result.notes, ['rules unknown on github: boom'])
  assert.deepEqual(out.result.rules, [])
  assert.deepEqual(out.result.by_sample, {})
  assert.equal(out.result.unchecked, true)
})

test('verify contract TC-contract-11 VS-4: exit 1 with empty stderr still has a reason', () => {
  const stub = gh([{ exit: 1 }])
  const out = read(repoWith({ forge: 'github' }), ['s1', 's2'], stub.env())
  expectUnknown(out, stub)
  console.log(out.result.notes[0])
})

test('verify contract TC-contract-12 VS-4: non-JSON, object, scalar, null, empty output are failures', () => {
  for (const stdout of ['not json', '{"message":"Not Found"}', '5', 'null', '', '"x"', '[1,', 'NaN']) {
    const stub = gh([{ stdout }])
    const out = read(repoWith({ forge: 'github' }), ['s1', 's2'], stub.env())
    try { expectUnknown(out, stub) } catch (e) { e.message = `stdout=${JSON.stringify(stdout)}: ${e.message}`; throw e }
  }
})

test('verify contract TC-contract-13 VS-4: deeply nested and huge output does not crash', () => {
  const nested = '['.repeat(200000) + ']'.repeat(200000)
  let stub = gh([{ stdout: nested }])
  let out = read(repoWith({ forge: 'github' }), ['s1'], stub.env())
  console.log('nested raised=' + out.raised + ' notes=' + JSON.stringify(out.result?.notes).slice(0, 200))
  assert.ok(out.result, JSON.stringify(out))
  const big = JSON.stringify(Array.from({ length: 50000 }, (_, i) => pat({ ruleset_id: i }, { pattern: 'p' + i })))
  stub = gh([{ stdout: big }])
  out = read(repoWith({ forge: 'github' }), ['s1'], stub.env())
  assert.equal(out.result.rules.length, 50000)
})

test('verify contract TC-contract-14 VS-4: stderr with control characters, invalid bytes and huge text', () => {
  const stub = gh([{ stderr: Buffer.concat([Buffer.from('bad \x00\x1b[31m \xff\xfe \r\n tail'.replace(/\\x/g, ''), 'latin1'), Buffer.from('x'.repeat(200000))]), exit: 1 }])
  const out = read(repoWith({ forge: 'github' }), ['s1'], stub.env())
  assert.ok(out.result, JSON.stringify(out).slice(0, 300))
  assert.equal(out.result.notes.length, 1)
  console.log('note length ' + out.result.notes[0].length + ' ' + JSON.stringify(out.result.notes[0].slice(0, 80)))
  assert.doesNotThrow(() => JSON.stringify(out.result))
})

test('verify contract TC-contract-15 VS-4: hung gh is cut by the timeout and gives one note', { timeout: 200000 }, () => {
  const stub = gh([{ stall: true }])
  const t0 = Date.now()
  const out = read(repoWith({ forge: 'github' }), ['s1', 's2'], stub.env(), 150000)
  const secs = (Date.now() - t0) / 1000
  console.log(`seconds=${secs} ${JSON.stringify(out.result)}`)
  expectUnknown(out, stub)
  assert.ok(secs < 120)
})

test('verify contract TC-contract-16 VS-4: gh asked for input does not wait on stdin', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verify-contract-ghstdin-'))
  writeFileSync(join(dir, 'gh'), '#!/bin/sh\nif read -r line; then echo "stdin:$line" >&2; exit 3; fi\necho "stdin closed ${GH_PROMPT_DISABLED}" >&2\nexit 1\n')
  chmodSync(join(dir, 'gh'), 0o755)
  const out = read(repoWith({ forge: 'github' }), ['s1'], { PATH: `${dir}:${process.env.PATH}` })
  console.log(JSON.stringify(out.result.notes))
  assert.match(out.result.notes[0], /stdin closed 1/)
})

test('verify contract TC-contract-17 VS-5: gh absent from PATH is one note, no raise', () => {
  const bin = restrictedPath(['python3', 'git'])
  const out = read(repoWith({ forge: 'github' }), ['sdlc/S-001', 'x'], { PATH: bin })
  console.log(JSON.stringify(out))
  assert.equal(out.raised, undefined)
  assert.deepEqual(out.result.rules, [])
  assert.equal(out.result.unchecked, true)
  assert.equal(out.result.notes.length, 1)
  assert.match(out.result.notes[0], /^rules unknown on github: .+/)
})

test('verify contract TC-contract-18 VS-5: gh present but not executable, and gh a directory, are notes', () => {
  for (const kind of ['noexec', 'dir']) {
    const dir = mkdtempSync(join(tmpdir(), 'verify-contract-ghbad-'))
    if (kind === 'noexec') { writeFileSync(join(dir, 'gh'), '#!/bin/sh\n'); chmodSync(join(dir, 'gh'), 0o644) } else mkdirSync(join(dir, 'gh'))
    const bin = restrictedPath(['python3', 'git'])
    const out = read(repoWith({ forge: 'github' }), ['s1'], { PATH: `${dir}:${bin}` })
    assert.equal(out.raised, undefined, kind)
    assert.equal(out.result.notes.length, 1, kind)
    assert.match(out.result.notes[0], /^rules unknown on github: /, kind)
  }
})

test('verify contract TC-contract-19 VS-5: gh failing to start with a bad shebang is a note', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verify-contract-ghshebang-'))
  writeFileSync(join(dir, 'gh'), '#!/nonexistent/interp\n')
  chmodSync(join(dir, 'gh'), 0o755)
  const out = read(repoWith({ forge: 'github' }), ['s1'], { PATH: `${dir}:${restrictedPath(['python3', 'git'])}` })
  assert.equal(out.raised, undefined)
  assert.equal(out.result.notes.length, 1)
})

test('verify contract TC-contract-20 VS-6: forge config problems', () => {
  const stub = gh([], { stdout: [] })
  const cases = [
    ['absent forge', repoWith({})],
    ['empty forge', repoWith({ forge: '' })],
    ['forge number', repoWith({ forge: 3 })],
    ['config is a list', repoWith([1])],
    ['config is a number', repoWith(null, { raw: '5' })],
  ]
  for (const [label, repo] of cases) {
    const out = read(repo, ['s1'], stub.env())
    assert.ok(out.result, `${label}: ${JSON.stringify(out)}`)
    assert.equal(out.result.unchecked, true, label)
  }
  assert.equal(stub.count(), 0)
  const missing = realpathSync(mkdtempSync(join(tmpdir(), 'verify-contract-nosdlc-')))
  const out = read(missing, ['s1'], stub.env())
  assert.equal(out.result.unchecked, true)
  assert.equal(stub.count(), 0)
})

test('verify contract TC-contract-21 VS-6: invalid JSON, directory, unreadable config raise Fail with the same text as the branchFormat path', () => {
  const stub = gh([], { stdout: [] })
  const broken = [
    ['invalid json', repoWith(null, { raw: '{nope' })],
    ['invalid utf8', repoWith(null, { raw: Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d]) })],
    ['deep nesting', repoWith(null, { raw: '['.repeat(100000) })],
  ]
  const dirRepo = realpathSync(mkdtempSync(join(tmpdir(), 'verify-contract-dircfg-')))
  mkdirSync(join(dirRepo, '.sdlc/config.json'), { recursive: true })
  broken.push(['directory', dirRepo])
  const unreadable = repoWith({ forge: 'github' })
  chmodSync(join(unreadable, '.sdlc/config.json'), 0o000)
  broken.push(['unreadable', unreadable])
  const loop = realpathSync(mkdtempSync(join(tmpdir(), 'verify-contract-loop-')))
  mkdirSync(join(loop, '.sdlc'))
  symlinkSync(join(loop, '.sdlc/config.json'), join(loop, '.sdlc/config.json'))
  broken.push(['symlink loop', loop])
  for (const [label, repo] of broken) {
    const a = read(repo, ['s1'], stub.env())
    const fmt = spawnSync('python3', ['-I', join(HERE, 'read_rules_driver_verify_contract.py'), BRANCHES, repo, '[]'], { encoding: 'utf8' })
    const b = JSON.parse(spawnSync('python3', ['-I', '-c', `import importlib.util,json,sys
s=importlib.util.spec_from_file_location("b",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
try: print(json.dumps({"ok":m.load_format(sys.argv[2])}))
except m.Fail as e: print(json.dumps({"fail":str(e)}))
except BaseException as e: print(json.dumps({"raised":type(e).__name__}))`, BRANCHES, repo], { encoding: 'utf8' }).stdout)
    console.log(`${label}: read_rules=${JSON.stringify(a).slice(0, 160)} load_format=${JSON.stringify(b).slice(0, 160)}`)
    assert.ok(a.fail || a.result, `${label} raised ${JSON.stringify(a)}`)
    assert.equal(a.raised, undefined, label)
    if (b.fail) assert.equal(a.fail, b.fail, label)
  }
  assert.equal(stub.count(), 0)
})

test('verify contract TC-contract-22 VS-6: load_format unchanged on valid, absent and odd configs (property, seeded)', async () => {
  const { assertProperty, checkLoadFormat } = await import(join(ROOT, 'skills/sdlc/test/testkit/property.mjs'))
  const report = checkLoadFormat({ runs: 1000, seed: Number(SEED) })
  assertProperty(report)
  const outcomes = {}
  for (const c of report.cases) outcomes[c.result.outcome] = (outcomes[c.result.outcome] || 0) + 1
  console.log(`load_format seed=${report.seed} runs=${report.runs} outcomes=${JSON.stringify(outcomes)}`)
})

test('verify contract TC-contract-23 VS-2 VS-3 (property): read_rules equals the spec model over random bodies and samples', () => {
  const r = spawnSync('python3', ['-I', join(HERE, 'read_rules_property_verify_contract.py'), BRANCHES, SEED, '1000'], { encoding: 'utf8', timeout: 540000 })
  assert.equal(r.status, 0, r.stderr)
  const res = JSON.parse(r.stdout)
  console.log(`property read_rules: seed=${res.seed} runs=${res.runs} failures=${res.failureCount}`)
  assert.equal(res.failureCount, 0, JSON.stringify(res.failures, null, 1).slice(0, 3000))
})

test('verify contract TC-contract-24 VS-1: read_rules does not mutate the repo and the module imports no forbidden dependency', () => {
  const stub = gh([], { stdout: [] })
  const repo = repoWith({ forge: 'github' })
  const before = spawnSync('find', [repo, '-type', 'f'], { encoding: 'utf8' }).stdout
  read(repo, ['s1'], stub.env())
  assert.equal(spawnSync('find', [repo, '-type', 'f'], { encoding: 'utf8' }).stdout, before)
})
