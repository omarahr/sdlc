import fs from 'node:fs'
import path from 'node:path'
import { skillDir, sh } from './stack.mjs'
import { mark } from './logs.mjs'

export function api(stack, script, args = [], opts = {}) {
  const started = Date.now()
  const proc = sh(stack, loadPython(stack), [path.join(skillDir, script), ...args], opts)
  const entry = {
    at: new Date(started).toISOString(),
    script,
    args,
    status: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
  }
  fs.appendFileSync(stack.logFile, JSON.stringify(entry) + '\n')
  let json = null
  try {
    json = JSON.parse(proc.stdout)
  } catch {
    json = null
  }
  return { status: proc.status, stdout: proc.stdout, stderr: proc.stderr, json, durationMs: Date.now() - started }
}

function loadPython(stack) {
  return stack.env.E2E_PYTHON || 'python3'
}

export { mark }
