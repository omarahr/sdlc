import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = process.env.VERIFY_REPO ?? resolve(HERE, '../../../../../../..')
const BRANCHES = join(REPO, 'skills/sdlc/branches.py')
const { rng, defaultSeed, arb, FORMAT_PIECES } = await import(join(REPO, 'skills/sdlc/test/testkit/property.mjs'))
const { load } = await import(join(REPO, 'skills/sdlc/test/testkit/attack-corpus.mjs'))
const PYTHON = spawnSync('python3', ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).stdout.trim()
const GIT = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim()

const PY = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("branches", sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
def dec(v):
    if isinstance(v, dict) and "$str" in v:
        return "".join(chr(c) for c in v["$str"])
    if isinstance(v, dict) and "$bytes" in v:
        return bytes(v["$bytes"])
    return v
results = []
for c in json.loads(sys.stdin.read()):
    fn = getattr(m, c["fn"])
    args = [dec(a) for a in c.get("args", [])]
    kwargs = {k: dec(v) for k, v in c.get("kwargs", {}).items()}
    try:
        value = fn(*args, **kwargs)
        same = len(args) > 0 and value is args[0]
        if isinstance(value, tuple):
            value = {"tuple": [list(map(ord, x)) if isinstance(x, str) else x for x in value]}
        elif isinstance(value, str):
            value = {"$str": list(map(ord, value))}
        results.append({"outcome": "return", "value": value, "same": same})
    except m.Fail as e:
        results.append({"outcome": "Fail", "message": str(e)})
    except BaseException as e:
        results.append({"outcome": "exception", "type": type(e).__name__, "message": str(e)})
print(json.dumps(results))
`

const enc = (v) => (typeof v === 'string' ? { $str: Array.from(v, (c) => c.codePointAt(0)) } : v)
const decStr = (codes) => String.fromCodePoint(...codes)
const decValue = (v) => (v && v.$str ? decStr(v.$str) : v && v.tuple ? v.tuple.map((x) => (Array.isArray(x) ? decStr(x) : x)) : v)

export function py(calls, { env = {}, cwd } = {}) {
  const payload = calls.map((c) => ({ fn: c.fn, args: (c.args ?? []).map(enc), kwargs: Object.fromEntries(Object.entries(c.kwargs ?? {}).map(([k, v]) => [k, enc(v)])) }))
  const r = spawnSync(PYTHON, ['-I', '-c', PY, BRANCHES], {
    cwd: cwd ?? mkdtempSync(join(tmpdir(), 'verify-contract-cwd-')),
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', ...env },
    maxBuffer: 256 * 1024 * 1024,
  })
  if (r.status !== 0) throw new Error(`driver exit ${r.status}: ${r.stderr}`)
  return JSON.parse(r.stdout).map((x) => (x.outcome === 'return' ? { ...x, value: decValue(x.value) } : x))
}

const vf = (fmt, opts) => py([{ fn: 'validate_format', args: [fmt] }], opts)[0]
const gitBranchCheck = (candidate) => {
  if (candidate.includes('\0')) return { ok: false, nul: true, stderr: 'NUL' }
  const r = spawnSync(GIT, ['check-ref-format', '--branch', candidate], { encoding: 'utf8', cwd: tmpdir() })
  return { ok: r.status === 0, stderr: (r.stderr ?? '').trim() }
}
const PLACEHOLDERS = ['{name}', '{name:lower}']
const countPh = (s) => PLACEHOLDERS.reduce((n, p) => n + s.split(p).length - 1, 0)
const hasLoneSurrogate = (s) => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s)

function modelValidate(fmt) {
  if (typeof fmt !== 'string') return { ok: false, why: 'non-string' }
  if (countPh(fmt) !== 1) return { ok: false, why: 'placeholder count' }
  const ph = PLACEHOLDERS.find((p) => fmt.includes(p))
  const i = fmt.indexOf(ph)
  const prefix = fmt.slice(0, i), suffix = fmt.slice(i + ph.length)
  if (/[{}]/.test(prefix + suffix)) return { ok: false, why: 'brace' }
  if (/\p{White_Space}/u.test(fmt)) return { ok: false, why: 'whitespace' }
  if (hasLoneSurrogate(fmt)) return { ok: false, why: 'lone surrogate' }
  const candidate = prefix + (ph === '{name:lower}' ? 's-001' : 'S-001') + suffix
  const g = gitBranchCheck(candidate)
  return { ok: g.ok, why: g.ok ? '' : g.nul ? 'nul' : /[\x1c-\x1f]/.test(fmt) ? 'python-space' : 'git', candidate, stderr: g.stderr }
}

test('verify contract: TC-contract-1 validate_format returns the exact input for valid formats', () => {
  const formats = ['sdlc/{name}', 'sdlc/{name:lower}', 'feature/PROJ-1-{name}', '{name}', 'a/b/c-{name}-x', 'équipe/{name}', 'FEATURE/{name:lower}.X', 'name/{name}lower']
  const res = py(formats.map((f) => ({ fn: 'validate_format', args: [f] })))
  res.forEach((r, i) => {
    assert.equal(r.outcome, 'return', `${formats[i]}: ${JSON.stringify(r)}`)
    assert.equal(r.value, formats[i])
    assert.equal(r.same, true, `${formats[i]} was not returned as the same object`)
  })
})

test('verify contract: TC-contract-2 a valid format is accepted from any cwd and with GIT_DIR set', () => {
  const nonRepo = mkdtempSync(join(tmpdir(), 'verify-contract-norepo-'))
  const repo = mkdtempSync(join(tmpdir(), 'verify-contract-repo-'))
  spawnSync(GIT, ['init', '-q', repo])
  const variants = [
    { cwd: nonRepo },
    { cwd: repo },
    { cwd: nonRepo, env: { GIT_DIR: '/nonexistent/sdlc-verify' } },
    { cwd: repo, env: { GIT_DIR: nonRepo } },
    { cwd: nonRepo, env: { GIT_CEILING_DIRECTORIES: '/' } },
  ]
  for (const v of variants) {
    for (const f of ['sdlc/{name}', 'feature/PROJ-1-{name:lower}']) {
      const r = vf(f, v)
      assert.equal(r.outcome, 'return', `${f} ${JSON.stringify(v)}: ${JSON.stringify(r)}`)
      assert.equal(r.value, f)
    }
  }
})

test('verify contract: TC-contract-3 property validate_format agrees with the spec model and git', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? 20261009)
  const runs = Number(process.env.VERIFY_RUNS ?? 1500)
  const r = rng(seed)
  const inputs = Array.from({ length: runs }, () => (r.bool(0.5) ? arb.format(r) : safeFormat(r)))
  const results = py(inputs.map((f) => ({ fn: 'validate_format', args: [f] })))
  const violations = []
  let accepted = 0
  inputs.forEach((fmt, i) => {
    const got = results[i]
    const want = modelValidate(fmt)
    if (got.outcome === 'exception') violations.push({ fmt, why: `exception ${got.type}: ${got.message}` })
    else if (want.ok && !(got.outcome === 'return' && got.value === fmt)) violations.push({ fmt, why: `model accepts, got ${got.outcome} ${got.message ?? ''}` })
    else if (!want.ok && got.outcome !== 'Fail') violations.push({ fmt, why: `model refuses (${want.why}), got ${got.outcome}` })
    else if (!want.ok && want.why === 'git' && !(got.message.includes('check-ref-format') && got.message.includes(want.stderr.replace(/^fatal: /, '')))) violations.push({ fmt, why: `git reason missing: ${got.message}` })
    if (got.outcome === 'return') accepted++
  })
  console.log(`property validate_format-model: seed=${seed} runs=${runs} accepted=${accepted} violations=${violations.length}`)
  assert.deepEqual(violations.slice(0, 5).map((v) => ({ fmt: JSON.stringify(v.fmt), why: v.why })), [])
})

function safeFormat(r) {
  const pieces = ['sdlc', 'feature', 'PROJ-1', 'x', '/', '-', '_', '.', 'é', 'İ', 'Ω', '\u{1f600}', 'name', 'lower', '@', '#', '+', '=', ',', '!', '%', '&', "'", '"', '..', '.lock', '~', '^', ':', '?', '*', '[', '\\', '//', '\u007f', '\u0001', '\u200b']
  const parts = []
  const n = r.int(0, 5)
  for (let i = 0; i < n; i++) parts.push(r.pick(pieces))
  parts.splice(r.int(0, parts.length), 0, r.pick(PLACEHOLDERS))
  return parts.join('')
}

test('verify contract: TC-contract-4 structurally malformed formats raise Fail and nothing else', () => {
  const bad = ['sdlc/', '{name}{name}', '{name}{name:lower}', '{{name}', '{name}}', '{}', 'sdlc/{ name }', 'sdlc/\t{name}', 'sdlc/{name}\n', 'sdlc/\u00a0{name}', 'sdlc/\u3000{name}', 'sdlc/\u2028{name}', '{NAME}', '{name:upper}', '{Name}', '', null, 7, 1.5, true, [], ['sdlc/{name}'], { name: 'x' }]
  const res = py(bad.map((f) => ({ fn: 'validate_format', args: [f] })))
  res.forEach((r, i) => assert.equal(r.outcome, 'Fail', `${JSON.stringify(bad[i])}: ${JSON.stringify(r)}`))
  const bytes = py([{ fn: 'validate_format', args: [{ $bytes: [...Buffer.from('sdlc/{name}')] }] }])[0]
  assert.equal(bytes.outcome, 'Fail', JSON.stringify(bytes))
  for (const e of load('unicode-whitespace')) {
    const f = `sdlc/${e.value}/{name}`
    const got = vf(f)
    const want = modelValidate(f)
    assert.notEqual(got.outcome, 'exception', `${e.id}: ${JSON.stringify(got)}`)
    console.log(`unicode-whitespace ${e.id}: ${got.outcome} model=${want.ok ? 'accept' : want.why}`)
  }
})

test('verify contract: TC-contract-5 git-refused literal parts raise Fail with the git reason, same verdict as git', () => {
  const formats = ['sdlc/{name}..', 'sdlc/{name}.lock', '-{name}', '/{name}', '{name}/', 'a//{name}', 'a~/{name}', 'a^/{name}', 'a:/{name}', 'a?/{name}', 'a*/{name}', 'a[/{name}', 'a\\/{name}', '@/{name}', 'a/.b/{name}', 'a\u0001/{name}', 'a\u001f/{name}', 'a\u007f/{name}', 'sdlc/{name}\u0000', '.{name}', 'a..b/{name}', '{name}.', '--format/{name}', '-h{name}']
  const res = py(formats.map((f) => ({ fn: 'validate_format', args: [f] })))
  const lines = []
  res.forEach((r, i) => {
    const f = formats[i]
    const want = modelValidate(f)
    lines.push(`${JSON.stringify(f)} -> ${r.outcome}; git=${want.ok ? 'accept' : want.stderr || want.why}`)
    if (f === '@/{name}') {
      assert.equal(want.ok, r.outcome === 'return', `${f}: verdict differs from git`)
      return
    }
    assert.equal(r.outcome, 'Fail', `${JSON.stringify(f)}: ${JSON.stringify(r)}`)
    assert.equal(want.ok, false)
    if (want.why === 'git') {
      assert.match(r.message, /check-ref-format/)
      assert.ok(r.message.includes(want.stderr.replace(/^fatal: /, '')), `${f}: ${r.message} lacks ${want.stderr}`)
    }
  })
  console.log(lines.join('\n'))
})

test('verify contract: TC-contract-6 shell metacharacters in the format reach git as one argv item', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verify-contract-inj-'))
  const marker = join(dir, 'pwned')
  const formats = [`\`touch$IFS${marker}\`/{name}`, `a;touch$IFS${marker};/{name}`, `$(touch$IFS${marker})/{name}`, `a|touch$IFS${marker}/{name}`, `a&&touch$IFS${marker}/{name}`]
  const res = py(formats.map((f) => ({ fn: 'validate_format', args: [f] })), { cwd: dir })
  res.forEach((r, i) => {
    const want = modelValidate(formats[i])
    assert.notEqual(r.outcome, 'exception')
    assert.equal(r.outcome === 'return', want.ok, `${formats[i]}: ${JSON.stringify(r)} model=${JSON.stringify(want)}`)
  })
  assert.equal(existsSync(marker), false, 'a shell ran the format')
})

test('verify contract: TC-contract-7 a missing or broken git gives Fail, never a crash', () => {
  const empty = mkdtempSync(join(tmpdir(), 'verify-contract-empty-'))
  const missing = vf('sdlc/{name}', { env: { PATH: empty } })
  assert.equal(missing.outcome, 'Fail', JSON.stringify(missing))
  assert.match(missing.message, /git/)
  const fake = (body) => {
    const d = mkdtempSync(join(tmpdir(), 'verify-contract-fakegit-'))
    writeFileSync(join(d, 'git'), `#!/bin/sh\n${body}\n`)
    chmodSync(join(d, 'git'), 0o755)
    return d
  }
  const exit1 = vf('sdlc/{name}', { env: { PATH: fake('exit 1') } })
  assert.equal(exit1.outcome, 'Fail', JSON.stringify(exit1))
  assert.match(exit1.message, /exit 1/)
  const exit128 = vf('sdlc/{name}', { env: { PATH: fake('echo boom >&2; exit 128') } })
  assert.equal(exit128.outcome, 'Fail')
  assert.match(exit128.message, /boom/)
  const notExec = mkdtempSync(join(tmpdir(), 'verify-contract-noexec-'))
  writeFileSync(join(notExec, 'git'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(notExec, 'git'), 0o644)
  const noexec = vf('sdlc/{name}', { env: { PATH: notExec } })
  assert.equal(noexec.outcome, 'Fail', JSON.stringify(noexec))
  const exit0 = vf('sdlc/{name}..', { env: { PATH: fake('exit 0') } })
  console.log(`fake git exit 0 with sdlc/{name}..: ${exit0.outcome}`)
  console.log(JSON.stringify({ missing, exit1, exit128, noexec, exit0 }, null, 1))
})

test('verify contract: TC-contract-8 split spec examples and corner formats', () => {
  const cases = [
    ['a/{name}.x', ['a/', '.x', false]],
    ['a/{name:lower}', ['a/', '', true]],
    ['{name}', ['', '', false]],
    ['{name:lower}', ['', '', true]],
    ['name/{name}lower', ['name/', 'lower', false]],
    ['lower-{name:lower}-name', ['lower-', '-name', true]],
    ['{name:lower}name}', ['', 'name}', true]],
  ]
  const res = py(cases.map(([f]) => ({ fn: 'split', args: [f] })))
  res.forEach((r, i) => {
    assert.equal(r.outcome, 'return', JSON.stringify(r))
    assert.deepEqual(r.value, cases[i][1], cases[i][0])
  })
  const bad = ['sdlc/', '', '{name}{name}', '{name:lower}{name}', '{name:lower}{name:lower}', '{NAME}', null, 3]
  py(bad.map((f) => ({ fn: 'split', args: [f] }))).forEach((r, i) => assert.equal(r.outcome, 'Fail', `${JSON.stringify(bad[i])}: ${JSON.stringify(r)}`))
})

test('verify contract: TC-contract-9 property split rebuilds its input and refuses other placeholder counts', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? 20261009)
  const runs = Number(process.env.VERIFY_RUNS ?? 1500)
  const r = rng(seed)
  const inputs = Array.from({ length: runs }, () => {
    const parts = []
    for (let i = r.int(0, 6); i > 0; i--) parts.push(r.pick([...FORMAT_PIECES.filter((p) => !/[\ud800-\udfff]/.test(p)), 'name', 'lower', ':lower}', '{name:']))
    for (let k = r.pick([0, 1, 1, 1, 2, 3]); k > 0; k--) parts.splice(r.int(0, parts.length), 0, r.pick(PLACEHOLDERS))
    return parts.join('')
  })
  const res = py(inputs.map((f) => ({ fn: 'split', args: [f] })))
  const violations = []
  inputs.forEach((f, i) => {
    const got = res[i]
    const n = countPh(f)
    if (n !== 1) { if (got.outcome !== 'Fail') violations.push({ f, why: `count ${n} gave ${got.outcome}` }); return }
    if (got.outcome !== 'return') { violations.push({ f, why: `one placeholder gave ${got.outcome} ${got.message}` }); return }
    const [pre, suf, lower] = got.value
    const ph = lower ? '{name:lower}' : '{name}'
    if (pre + ph + suf !== f) violations.push({ f, why: `rebuild ${JSON.stringify(pre + ph + suf)}` })
    if (countPh(pre) + countPh(suf) !== 0) violations.push({ f, why: 'placeholder left in prefix or suffix' })
  })
  console.log(`property split-rebuild: seed=${seed} runs=${runs} violations=${violations.length}`)
  assert.deepEqual(violations.slice(0, 5), [])
})

test('verify contract: TC-contract-10 name spec examples, lowercase only the tail', () => {
  const cases = [
    [['sdlc/{name}', 'slice'], { id: 'S-001' }, 'sdlc/S-001'],
    [['feature/PROJ-1-{name}', 'slice'], { id: 'S-001' }, 'feature/PROJ-1-S-001'],
    [['feature/PROJ-1-{name:lower}', 'slice'], { id: 'S-001' }, 'feature/PROJ-1-s-001'],
    [['FEATURE/PROJ-1-{name:lower}.X', 'slice'], { id: 'S-001' }, 'FEATURE/PROJ-1-s-001.X'],
    [['A/{name:lower}', 'slice'], { id: 'S-İ' }, 'A/s-i\u0307'],
    [['A/{name:lower}', 'slice'], { id: 'S-fix-M-1-2' }, 'A/s-fix-m-1-2'],
  ]
  const res = py(cases.map(([args, kwargs]) => ({ fn: 'name', args, kwargs })))
  res.forEach((r, i) => {
    assert.equal(r.outcome, 'return', JSON.stringify(r))
    assert.equal(r.value, cases[i][2])
  })
  const again = py(cases.map(([args, kwargs]) => ({ fn: 'name', args, kwargs })))
  assert.deepEqual(again, res)
})

test('verify contract: TC-contract-11 property name is prefix + tail (lowercased under {name:lower}) + suffix', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? 20261009)
  const runs = Number(process.env.VERIFY_RUNS ?? 1500)
  const r = rng(seed)
  const idPieces = ['S-', '001', 'fix', 'M-1', 'İ', 'ß', 'Σ', 'ǅ', 'Ω', 'K', 'ﬃ', 'É', 'a', 'Z', '\u{1f600}', '-', '_', 'ΣΑ']
  const lits = ['sdlc/', 'FEATURE/', 'PROJ-1-', '.X', 'Ünïcode/', '-SUFFIX', '', 'İ/']
  const inputs = Array.from({ length: runs }, () => {
    const ph = r.pick(PLACEHOLDERS)
    const fmt = r.pick(lits) + ph + r.pick(lits)
    let id = ''
    for (let i = r.int(1, 5); i > 0; i--) id += r.pick(idPieces)
    return { fmt, id }
  })
  const res = py(inputs.map(({ fmt, id }) => ({ fn: 'name', args: [fmt, 'slice'], kwargs: { id } })))
  const splits = py(inputs.map(({ fmt }) => ({ fn: 'split', args: [fmt] })))
  const lowers = py(inputs.map(({ id }) => ({ fn: 'name', args: ['{name:lower}', 'slice'], kwargs: { id } })))
  const violations = []
  inputs.forEach(({ fmt, id }, i) => {
    const got = res[i]
    if (got.outcome !== 'return') { violations.push({ fmt, id, why: `${got.outcome} ${got.message}` }); return }
    const lower = fmt.includes('{name:lower}')
    const ph = lower ? '{name:lower}' : '{name}'
    const [pre, suf] = fmt.split(ph)
    const pyLower = lowers[i].value
    const expectTail = lower ? pyLower : id
    if (got.value !== pre + expectTail + suf) violations.push({ fmt, id, why: `got ${JSON.stringify(got.value)}` })
    const [sp, ss] = splits[i].value
    const stripped = got.value.slice(sp.length, got.value.length - ss.length)
    if (!got.value.startsWith(sp) || !got.value.endsWith(ss) || stripped !== expectTail) violations.push({ fmt, id, why: 'strip does not give the tail' })
    if (lower && pyLower !== id.toLowerCase() && !/[İ]/.test(id)) violations.push({ fmt, id, why: `python lower ${JSON.stringify(pyLower)} vs model ${JSON.stringify(id.toLowerCase())}` })
  })
  console.log(`property name-tail: seed=${seed} runs=${runs} violations=${violations.length}`)
  assert.deepEqual(violations.slice(0, 5), [])
})
