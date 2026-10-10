import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const repoRoot = path.resolve(e2eDir, '..')
export const skillDir = path.join(repoRoot, 'skills', 'sdlc')

export function loadEnv() {
  const values = {}
  for (const line of fs.readFileSync(path.join(e2eDir, 'e2e.env'), 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    if (match) values[match[1]] = match[2]
  }
  return values
}

export function up() {
  const env = loadEnv()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${env.E2E_PROJECT}-`))
  const dirs = {
    root,
    bin: path.join(root, 'bin'),
    fakes: path.join(root, 'fakes'),
    home: path.join(root, 'home'),
    repos: path.join(root, 'repos'),
    logs: path.join(root, 'logs'),
  }
  for (const key of ['bin', 'fakes', 'home', 'repos', 'logs']) fs.mkdirSync(dirs[key], { recursive: true })
  for (const tool of ['gh', 'glab']) {
    const shim = path.join(dirs.bin, tool)
    fs.writeFileSync(shim, `#!/bin/sh\nE2E_TOOL=${tool} exec node "${path.join(e2eDir, 'fake-forge.mjs')}" "$@"\n`, { mode: 0o755 })
  }
  const logFile = path.join(dirs.logs, 'service.log')
  fs.writeFileSync(logFile, '')
  return { env, dirs, logFile }
}

export function down(stack) {
  if (stack && stack.dirs) fs.rmSync(stack.dirs.root, { recursive: true, force: true })
}

export function childEnv(stack, extra = {}) {
  return {
    PATH: `${stack.dirs.bin}:${process.env.PATH}`,
    HOME: stack.dirs.home,
    TZ: 'UTC',
    PYTHONUTF8: '1',
    PYTHONDONTWRITEBYTECODE: '1',
    GIT_AUTHOR_NAME: 'e2e',
    GIT_AUTHOR_EMAIL: 'e2e@example.invalid',
    GIT_COMMITTER_NAME: 'e2e',
    GIT_COMMITTER_EMAIL: 'e2e@example.invalid',
    E2E_FAKE_DIR: stack.dirs.fakes,
    ...extra,
  }
}

export function sh(stack, command, args, opts = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: childEnv(stack, opts.env),
    cwd: opts.cwd || stack.dirs.root,
    input: opts.input,
    timeout: opts.timeoutMs || 60000,
  })
}
