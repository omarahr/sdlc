import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'attack-corpus')

export function families() {
  return readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
}

function expand(family, e) {
  const value = 'value' in e ? e.value : (e.prefix ?? '') + e.repeat.repeat(e.times) + (e.suffix ?? '')
  return { id: e.id, family, value, note: e.note ?? '' }
}

const hasNul = (s) => s.includes('\u0000')
const hasLoneSurrogate = (s) => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s)

export const argvSafe = (entries) => entries.filter((e) => !hasNul(e.value) && !hasLoneSurrogate(e.value))

export function load(family, { argv = false } = {}) {
  const path = join(CORPUS_DIR, `${family}.json`)
  if (!existsSync(path)) throw new Error(`unknown attack-corpus family ${family}; known: ${families().join(', ')}`)
  const entries = JSON.parse(readFileSync(path, 'utf8')).map((e) => expand(family, e))
  return argv ? argvSafe(entries) : entries
}

export function all({ argv = false, only } = {}) {
  return (only ?? families()).flatMap((f) => load(f, { argv }))
}

export function abbreviations(flag) {
  const out = []
  for (let i = 3; i < flag.length; i++) out.push(flag.slice(0, i))
  return out
}

export function duplicated(flag, values) {
  return values.flatMap((v) => [flag, v])
}

export function equalsForm(flag, value) {
  return `${flag}=${value}`
}

const DECOY_EXIT = 97

export function plantDecoy(dir, { module = 'branches', marker, behavior = 'exit' } = {}) {
  mkdirSync(dir, { recursive: true })
  const markerPath = marker ?? join(dir, `${module}.decoy-imported`)
  const path = join(dir, `${module}.py`)
  const record = `import sys as _s\nwith open(${JSON.stringify(markerPath)}, "a", encoding="utf-8") as _f:\n    _f.write(__file__ + "\\n")\n`
  const body = behavior === 'exit'
    ? `${record}_s.stderr.write("DECOY ${module} IMPORTED\\n")\nraise SystemExit(${DECOY_EXIT})\n`
    : `${record}DEFAULT_FORMAT = "decoy/{name}"\nclass Fail(Exception):\n    pass\ndef load_format(repo):\n    return "decoy/{name}"\ndef validate_format(fmt):\n    return fmt\ndef main(argv=None):\n    print('{"decoy": true}')\n    return 0\ndef __getattr__(name):\n    return lambda *a, **k: "decoy"\n`
  writeFileSync(path, body)
  return { path, marker: markerPath, exitCode: behavior === 'exit' ? DECOY_EXIT : null }
}

export function decoyFired(decoy) {
  if (!existsSync(decoy.marker)) return null
  return readFileSync(decoy.marker, 'utf8').split('\n').filter(Boolean)
}

export const decoyEnv = (dir) => ({ PYTHONPATH: dir })
