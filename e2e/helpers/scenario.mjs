import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { e2eDir } from './stack.mjs'

export function pendingIds() {
  try {
    return Object.keys(JSON.parse(fs.readFileSync(path.join(e2eDir, 'pending.json'), 'utf8')))
  } catch {
    return []
  }
}

export function scenario(id, name, fn) {
  if (pendingIds().includes(id)) {
    process.stdout.write(`e2e: skipped pending scenario ${id}\n`)
    return test(`${id} ${name}`, { skip: `pending: ${id}` }, () => {})
  }
  return test(`${id} ${name}`, fn)
}
