import fs from 'node:fs'

export function mark(stack, label = 'mark') {
  const offset = fs.statSync(stack.logFile).size
  fs.appendFileSync(stack.logFile, JSON.stringify({ marker: label }) + '\n')
  return offset
}

export function since(stack, offset) {
  const text = fs.readFileSync(stack.logFile, 'utf8')
  return Buffer.from(text).subarray(offset).toString('utf8').split('\n').filter(Boolean)
}
