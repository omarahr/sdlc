import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SCRIPT_PATH = join(SKILL_DIR, 'sdlc-loop.js')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const PARAMS = ['agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow']
const ENTRY = /^return await main\(\) \/\/ @entry\s*$/m

export function scriptSource() {
  return readFileSync(SCRIPT_PATH, 'utf8')
}

function compile({ exportInternals }) {
  let src = scriptSource().replace(/^export const meta\s*=/m, 'const meta =')
  if (!ENTRY.test(src)) throw new Error('entry line "return await main() // @entry" not found')
  if (exportInternals) src = src.replace(ENTRY, 'return { meta, internals: INTERNALS }')
  return new AsyncFunction(...PARAMS, src)
}

export function parseInputs(prompt) {
  const marker = 'Inputs (JSON):\n'
  const i = prompt.indexOf(marker)
  return i < 0 ? null : JSON.parse(prompt.slice(i + marker.length))
}

export function fakeRuntime(responder, args = {}, budgetTotal = null) {
  const calls = [], logs = [], phases = [], errors = []
  const agent = async (prompt, opts = {}) => {
    const label = opts.label || ''
    const call = { prompt, opts, label, role: label.split(':')[0], inputs: parseInputs(prompt) }
    calls.push(call)
    try {
      return await responder(call, calls)
    } catch (e) {
      errors.push(`${label}: ${e.message}`)
      return null
    }
  }
  const parallel = thunks => Promise.all(thunks.map(t => Promise.resolve().then(t).catch(() => null)))
  const pipeline = (items, ...stages) => Promise.all(items.map(async (item, i) => {
    let v = item
    for (const stage of stages) {
      try { v = await stage(v, item, i) } catch { return null }
    }
    return v
  }))
  const budget = {
    total: budgetTotal,
    spent: () => 0,
    remaining: () => (budgetTotal === null ? Infinity : budgetTotal),
  }
  const workflow = async () => { throw new Error('workflow() is not supported in tests') }
  const rt = {
    calls, logs, phases, errors,
    params: [agent, parallel, pipeline, t => phases.push(t), m => logs.push(m), args, budget, workflow],
  }
  rt.roles = () => calls.map(c => c.role)
  return rt
}

export async function runMain(responder, args = {}, budgetTotal = null) {
  const rt = fakeRuntime(responder, args, budgetTotal)
  rt.result = await compile({ exportInternals: false })(...rt.params)
  return rt
}

export async function loadInternals(responder = () => { throw new Error('no agent call expected') }, args = {}) {
  const rt = fakeRuntime(responder, args)
  const out = await compile({ exportInternals: true })(...rt.params)
  rt.I = out.internals
  rt.meta = out.meta
  return rt
}

// Responder from per-role queues (arrays, consumed in order) or functions (call, calls) => response.
// Unknown roles or exhausted queues throw; fakeRuntime records that in rt.errors and returns null.
export function scripted(table) {
  const q = {}
  for (const [k, v] of Object.entries(table)) q[k] = Array.isArray(v) ? [...v] : v
  return (call, calls) => {
    const h = q[call.role]
    if (h === undefined) throw new Error(`unexpected role ${call.role}`)
    if (typeof h === 'function') return h(call, calls)
    if (!h.length) throw new Error(`no scripted response left for ${call.role}`)
    return h.shift()
  }
}

export const ok = () => ({ ok: true })
export const clear = () => ({ refuted: false, evidence: 'checked, holds' })
