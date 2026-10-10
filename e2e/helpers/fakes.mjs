import fs from 'node:fs'
import path from 'node:path'

const file = (stack, tool, suffix) => path.join(stack.dirs.fakes, `${tool}.${suffix}`)

export function setControl(stack, tool, control) {
  fs.writeFileSync(file(stack, tool, 'control.json'), JSON.stringify(control))
}

export function failNext(stack, tool, stderr = `${tool}: fake failure`) {
  setControl(stack, tool, { mode: 'fail', stderr })
}

export function stall(stack, tool, stallMs) {
  setControl(stack, tool, { mode: 'stall', stallMs })
}

export function respondWith(stack, tool, body, responses = {}) {
  setControl(stack, tool, { mode: 'ok', default: body, responses })
}

export function requests(stack, tool) {
  try {
    return fs.readFileSync(file(stack, tool, 'requests.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  } catch {
    return []
  }
}

export function clearRequests(stack, tool) {
  fs.rmSync(file(stack, tool, 'requests.jsonl'), { force: true })
}
