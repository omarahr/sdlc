#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const tool = process.env.E2E_TOOL
const dir = process.env.E2E_FAKE_DIR
const args = process.argv.slice(2)
const read = (name, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))
  } catch {
    return fallback
  }
}
fs.appendFileSync(
  path.join(dir, `${tool}.requests.jsonl`),
  JSON.stringify({ at: new Date().toISOString(), cwd: process.cwd(), args }) + '\n'
)
const control = read(`${tool}.control.json`, {})
const mode = control.mode || 'ok'
if (mode === 'stall') {
  setTimeout(() => process.exit(0), Number(control.stallMs || 60000))
} else if (mode === 'fail') {
  process.stderr.write(`${control.stderr || `${tool}: fake failure`}\n`)
  process.exit(control.exitCode || 1)
} else if (mode === 'garbage') {
  process.stdout.write(control.stdout || 'not json')
} else {
  const target = args[args.length - 1]
  const responses = control.responses || {}
  const body = Object.prototype.hasOwnProperty.call(responses, target) ? responses[target] : control.default
  process.stdout.write(JSON.stringify(body === undefined ? [] : body))
}
