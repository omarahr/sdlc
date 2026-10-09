import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILL_DIR, scratch } from '../harness.mjs'

export const BRANCHES = join(SKILL_DIR, 'branches.py')
const PYCALL = join(dirname(fileURLToPath(import.meta.url)), 'pycall.py')

export function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1))
  const pick = (arr) => arr[int(0, arr.length - 1)]
  const bool = (p = 0.5) => next() < p
  return { seed: seed >>> 0, next, int, pick, bool }
}

export function defaultSeed() {
  const fromEnv = Number.parseInt(process.env.TESTKIT_SEED ?? '', 10)
  return Number.isFinite(fromEnv) ? fromEnv >>> 0 : (Math.random() * 4294967296) >>> 0
}

export const FORMAT_PIECES = [
  'sdlc', 'feature', 'team', 'x', 'a.b', 'v1', '-', '_', '.', '..', '/', '//', '@', '@{', '~', '^', ':', '?', '*', '[', '\\', '.lock',
  'é', 'İ', '{', '}', '{{', '}}', '{}', '{0}', '{id}', '{name', 'name}', '{NAME}', '{name:upper}', '{name!r}', '{name:>9}',
  ' ', '\t', '\n', '\r', '\u00a0', '\u2003', '\u3000', '\u200b', '\u0085', '\u2028', '\u0000', '\u001b', '\u007f', '\ufeff', '\ud800', '\u{1f600}',
  '\uff5bname\uff5d', '{n\u0430me}',
]

export const PLACEHOLDERS = ['{name}', '{name:lower}']

export const arb = {
  formatString(r) {
    const parts = []
    const n = r.int(0, 6)
    for (let i = 0; i < n; i++) parts.push(r.bool(0.6) ? r.pick(['sdlc', 'feature', 'team', 'x', '/', '-', '.']) : r.pick(FORMAT_PIECES))
    const placeholders = r.pick([0, 1, 1, 1, 2])
    for (let i = 0; i < placeholders; i++) parts.splice(r.int(0, parts.length), 0, r.pick(PLACEHOLDERS))
    return parts.join('')
  },
  format(r) {
    if (r.bool(0.05)) return r.pick([null, 0, 42, -1, true, false, [], ['sdlc/{name}'], {}, { name: 'x' }, 1.5])
    return arb.formatString(r)
  },
  configValue(r) {
    return r.pick([
      () => arb.formatString(r), () => '', () => null, () => 7, () => 0, () => true, () => false, () => [], () => ['sdlc/{name}'],
      () => ({}), () => ({ branchFormat: 'x/{name}' }), () => 'x'.repeat(r.int(1000, 100000)) + '/{name}',
    ])()
  },
  configShape(r) {
    return r.pick([
      () => ({ kind: 'absent' }),
      () => ({ kind: 'no-sdlc-dir' }),
      () => ({ kind: 'dir' }),
      () => ({ kind: 'json', value: { branchFormat: arb.configValue(r) } }),
      () => ({ kind: 'json', value: { branchFormat: arb.configValue(r), gitMode: 'pr', commands: {} } }),
      () => ({ kind: 'json', value: { commands: { test: 'npm test' } } }),
      () => ({ kind: 'json', value: r.pick([[], ['branchFormat'], 'sdlc/{name}', 1, null, true, 1.5]) }),
      () => ({ kind: 'text', text: r.pick(['', ' ', '{', '}', '{"branchFormat":', '{"branchFormat": "a/{name}"}{"x":1}', 'NaN', 'Infinity', '{"branchFormat": NaN}', '\ufeff{"branchFormat": "a/{name}"}', '{"branchFormat": "a/{name}", "branchFormat": 5}', '{"branchFormat": "\\ud800/{name}"}', '// comment\n{}', "{'branchFormat': 'a/{name}'}"]) }),
      () => ({ kind: 'text', text: '['.repeat(r.int(1000, 200000)) }),
      () => ({ kind: 'text', text: '{"a":'.repeat(r.int(1000, 50000)) + '1' }),
      () => ({ kind: 'bytes', base64: r.pick(['gA==', 'eyJicmFuY2hGb3JtYXQiOiAi/y97bmFtZX0ifQ==', '//4=', 'AAAA']) }),
      () => ({ kind: 'dangling-symlink' }),
      () => ({ kind: 'symlink-loop' }),
      () => ({ kind: 'unreadable', value: { branchFormat: 'a/{name}' } }),
    ])()
  },
}

let configCounter = 0
export function materializeConfig(root, shape) {
  const repo = join(root, `cfg-${++configCounter}`)
  mkdirSync(repo, { recursive: true })
  if (shape.kind === 'no-sdlc-dir') return repo
  const dir = join(repo, '.sdlc')
  mkdirSync(dir)
  const file = join(dir, 'config.json')
  switch (shape.kind) {
    case 'absent': break
    case 'dir': mkdirSync(file); break
    case 'json': writeFileSync(file, JSON.stringify(shape.value)); break
    case 'text': writeFileSync(file, shape.text); break
    case 'bytes': writeFileSync(file, Buffer.from(shape.base64, 'base64')); break
    case 'dangling-symlink': symlinkSync(join(dir, 'missing.json'), file); break
    case 'symlink-loop': symlinkSync(file, file); break
    case 'unreadable': writeFileSync(file, JSON.stringify(shape.value)); chmodSync(file, 0o000); break
    default: throw new Error(`unknown config shape ${shape.kind}`)
  }
  return repo
}

export function callPython(modulePath, fn, calls, { python = 'python3', cwd, timeoutMs = 120000 } = {}) {
  const r = spawnSync(python, ['-I', PYCALL], {
    cwd: cwd ?? scratch('testkit-pycall-'),
    input: JSON.stringify({ module: modulePath, fn, calls }),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' },
    timeout: timeoutMs,
    maxBuffer: 256 * 1024 * 1024,
  })
  if (r.error) throw new Error(`pycall did not finish: ${r.error.message}`)
  let out
  try { out = JSON.parse(r.stdout) } catch { throw new Error(`pycall printed no JSON (exit ${r.status}): ${r.stdout.slice(0, 500)} ${r.stderr.slice(0, 2000)}`) }
  if (out.importError) throw new Error(`cannot import ${modulePath}: ${out.importError.type}: ${out.importError.message}`)
  return out.results
}

export const failOrReturn = (_input, result) =>
  result.outcome === 'return' || result.outcome === 'Fail' ? null : `raised ${result.type}: ${result.message}`

export function check({ module = BRANCHES, fn, gen, toArgs = (input) => [input], seed = defaultSeed(), runs = 200, property = failOrReturn, log = true, python }) {
  const r = rng(seed)
  const inputs = Array.from({ length: runs }, () => gen(r))
  const results = callPython(module, fn, inputs.map(toArgs), { python })
  const cases = inputs.map((input, i) => ({ index: i, input, result: results[i] }))
  const violations = []
  for (const c of cases) {
    const why = property(c.input, c.result)
    if (why) violations.push({ ...c, why })
  }
  const label = `property ${fn}: seed=${seed} runs=${runs} violations=${violations.length}`
  if (log) console.log(label)
  return { fn, seed, runs, label, cases, violations }
}

export function describeViolations(report, limit = 5) {
  const show = report.violations.slice(0, limit).map((v) => `  #${v.index} input=${JSON.stringify(v.input)?.slice(0, 300)} -> ${v.why}`)
  return `${report.label}\nreplay with TESTKIT_SEED=${report.seed}\n${show.join('\n')}`
}

export function assertProperty(report) {
  if (report.violations.length) throw new Error(describeViolations(report))
}

export function checkLoadFormat({ module = BRANCHES, seed = defaultSeed(), runs = 100, property = failOrReturn, log = true } = {}) {
  const root = scratch('testkit-cfg-')
  return check({
    module, fn: 'load_format', seed, runs, property, log,
    gen: (r) => { const shape = arb.configShape(r); return { repo: materializeConfig(root, shape), shape } },
    toArgs: (input) => [input.repo],
  })
}
