import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { scratch } from '../harness.mjs'

const SHIM = `#!/bin/sh
root=$(dirname "$0")/.state
n=$(ls "$root/calls" | wc -l | tr -d ' ')
n=$((n + 1))
call="$root/calls/$n"
mkdir "$call"
for a in "$@"; do printf '%s\\0' "$a"; done > "$call/argv"
pwd -P > "$call/cwd"
script="$root/script/$n"
[ -d "$script" ] || script="$root/script/default"
[ -d "$script" ] || exit 0
[ -f "$script/delay" ] && sleep "$(cat "$script/delay")"
[ -f "$script/stall" ] && exec sleep 600
[ -f "$script/stdout" ] && cat "$script/stdout"
[ -f "$script/stderr" ] && cat "$script/stderr" >&2
[ -f "$script/exit" ] && exit "$(cat "$script/exit")"
exit 0
`

function writeStep(dir, step) {
  mkdirSync(dir, { recursive: true })
  const { stdout, stderr, exit, delaySeconds, stall } = step
  if (stdout !== undefined) writeFileSync(join(dir, 'stdout'), typeof stdout === 'string' || Buffer.isBuffer(stdout) ? stdout : JSON.stringify(stdout))
  if (stderr !== undefined) writeFileSync(join(dir, 'stderr'), stderr)
  if (exit !== undefined) writeFileSync(join(dir, 'exit'), String(exit))
  if (delaySeconds !== undefined) writeFileSync(join(dir, 'delay'), String(delaySeconds))
  if (stall) writeFileSync(join(dir, 'stall'), '1')
}

export function stubServer({ name = 'gh', script = [], fallback } = {}) {
  const dir = scratch('stub-bin-')
  const root = join(dir, '.state')
  mkdirSync(join(root, 'calls'), { recursive: true })
  mkdirSync(join(root, 'script'), { recursive: true })
  const shim = join(dir, name)
  writeFileSync(shim, SHIM)
  chmodSync(shim, 0o755)
  const api = {
    dir,
    shim,
    script(steps) {
      steps.forEach((step, i) => writeStep(join(root, 'script', String(i + 1)), step))
      return api
    },
    failNext(count, { exit = 1, stderr = '', stdout } = {}) {
      const done = api.calls().length
      for (let i = 1; i <= count; i++) writeStep(join(root, 'script', String(done + i)), { exit, stderr, stdout })
      return api
    },
    setFallback(step) {
      writeStep(join(root, 'script', 'default'), step)
      return api
    },
    calls() {
      const names = existsSync(join(root, 'calls')) ? readdirSync(join(root, 'calls')) : []
      return names
        .map(Number)
        .sort((a, b) => a - b)
        .map((n) => {
          const base = join(root, 'calls', String(n))
          const raw = readFileSync(join(base, 'argv'), 'utf8')
          const argv = raw === '' ? [] : raw.slice(0, -1).split('\0')
          return { n, argv, cwd: readFileSync(join(base, 'cwd'), 'utf8').replace(/\n$/, '') }
        })
    },
    count() {
      return api.calls().length
    },
    path(rest = process.env.PATH || '/usr/bin:/bin') {
      return `${dir}:${rest}`
    },
    env(extra = {}) {
      return { ...extra, PATH: api.path(extra.PATH) }
    },
  }
  script.length && api.script(script)
  fallback && api.setFallback(fallback)
  return api
}

export function restrictedPath(keep = ['python3', 'git']) {
  const dir = scratch('path-only-')
  for (const cmd of keep) {
    for (const p of (process.env.PATH || '').split(':')) {
      const full = join(p, cmd)
      if (p && existsSync(full)) {
        symlinkSync(full, join(dir, cmd))
        break
      }
    }
  }
  return dir
}
