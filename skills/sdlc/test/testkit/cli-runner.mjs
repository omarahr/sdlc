import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { SKILL_DIR, scratch } from '../harness.mjs'

export { SKILL_DIR }

function baseEnv(home) {
  return {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: home,
    TZ: 'UTC',
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
    PYTHONDONTWRITEBYTECODE: '1',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(home, '.gitconfig'),
    GIT_TERMINAL_PROMPT: '0',
  }
}

function mergeEnv(base, overrides = {}) {
  const env = { ...base }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === null) delete env[k]
    else env[k] = String(v)
  }
  return env
}

function entryOf(path) {
  const st = lstatSync(path)
  if (st.isSymbolicLink()) return { type: 'symlink', target: readlinkSync(path) }
  if (st.isDirectory()) return { type: 'dir', mode: (st.mode & 0o777).toString(8) }
  if (st.isFile()) {
    let sha = null
    try { sha = createHash('sha256').update(readFileSync(path)).digest('hex') } catch { sha = 'unreadable' }
    return { type: 'file', size: st.size, mode: (st.mode & 0o777).toString(8), sha }
  }
  return { type: 'other' }
}

function gitRefs(dir, env) {
  if (!existsSync(join(dir, '.git'))) return {}
  const refs = {}
  try {
    const out = execFileSync('git', ['-C', dir, 'for-each-ref', '--format=%(refname) %(objectname)'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'] })
    for (const line of out.split('\n').filter(Boolean)) {
      const i = line.lastIndexOf(' ')
      refs[line.slice(0, i)] = line.slice(i + 1)
    }
    refs.HEAD = execFileSync('git', ['-C', dir, 'symbolic-ref', '-q', 'HEAD'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    refs.HEAD = refs.HEAD ?? 'detached'
  }
  return refs
}

export function snapshot(dir, { env = process.env } = {}) {
  const files = {}
  const walk = (abs) => {
    let names
    try { names = readdirSync(abs).sort() } catch { return }
    for (const name of names) {
      const p = join(abs, name)
      const rel = relative(dir, p)
      if (rel === '.git') continue
      const e = entryOf(p)
      files[rel] = e
      if (e.type === 'dir') walk(p)
    }
  }
  if (existsSync(dir)) walk(dir)
  return { dir, files, refs: gitRefs(dir, env) }
}

export function diffSnapshots(before, after) {
  const added = [], removed = [], changed = []
  const cmp = (a, b, prefix) => {
    for (const k of Object.keys(b)) {
      if (!(k in a)) added.push(prefix + k)
      else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(prefix + k)
    }
    for (const k of Object.keys(a)) if (!(k in b)) removed.push(prefix + k)
  }
  cmp(before.files, after.files, '')
  cmp(before.refs, after.refs, 'ref:')
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort(), empty: !added.length && !removed.length && !changed.length }
}

function quote(arg) {
  const s = String(arg)
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(s)) return s
  if (/^[\x20-\x7e]*$/.test(s) && !s.includes("'")) return `'${s}'`
  return '$' + JSON.stringify(s).replace(/'/g, "\\'").replace(/^"|"$/g, "'")
}

export function formatTranscript(t) {
  const lines = []
  lines.push(`$ cd ${quote(t.cwd)}`)
  const envPart = Object.entries(t.envOverrides).map(([k, v]) => `${k}=${v === undefined ? '<unset>' : quote(v)}`).join(' ')
  lines.push(`$ ${envPart ? envPart + ' ' : ''}${t.argv.map(quote).join(' ')}`)
  if (t.spawnError) lines.push(`spawn error: ${t.spawnError}`)
  lines.push(`exit: ${t.status}${t.signal ? ` signal ${t.signal}` : ''}${t.timedOut ? ' (timed out)' : ''} (${t.durationMs} ms)`)
  lines.push('--- stdout', t.stdout.replace(/\n$/, ''), '--- stderr', t.stderr.replace(/\n$/, ''))
  for (const [dir, d] of Object.entries(t.tree)) {
    lines.push(`--- tree ${dir}${d.diff.empty ? ' (unchanged)' : ''}`)
    for (const p of d.diff.added) lines.push(`+ ${p}`)
    for (const p of d.diff.removed) lines.push(`- ${p}`)
    for (const p of d.diff.changed) lines.push(`~ ${p}`)
  }
  return lines.join('\n')
}

function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const p = join(root, rel)
    mkdirSync(dirname(p), { recursive: true })
    if (content === null) mkdirSync(p, { recursive: true })
    else if (Buffer.isBuffer(content)) writeFileSync(p, content)
    else writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

export function cliRunner({ skillDir = SKILL_DIR, python = 'python3' } = {}) {
  const root = scratch('testkit-cli-')
  const home = join(root, 'home')
  mkdirSync(home)
  writeFileSync(join(home, '.gitconfig'), '[user]\n\temail = testkit@example.com\n\tname = Testkit\n[init]\n\tdefaultBranch = main\n')
  const env = baseEnv(home)
  let counter = 0

  const dir = (name = 'dir') => {
    const d = join(root, `${name}-${++counter}`)
    mkdirSync(d, { recursive: true })
    return d
  }

  const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env }).trim()

  function gitRepo({ files = {}, branches = [], defaultBranch = 'main', name = 'repo' } = {}) {
    const repo = dir(name)
    git(repo, 'init', '-q', '-b', defaultBranch)
    writeFiles(repo, files)
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'init')
    for (const b of branches) git(repo, 'branch', b)
    return repo
  }

  function copySkill({ omit = [], files = {} } = {}) {
    const dest = dir('skill')
    cpSync(skillDir, dest, { recursive: true, filter: (src) => !src.split('/').includes('__pycache__') })
    for (const rel of omit) rmSync(join(dest, rel), { recursive: true, force: true })
    writeFiles(dest, files)
    return dest
  }

  function exec(command, args = [], opts = {}) {
    const cwd = opts.cwd ?? dir('cwd')
    const envOverrides = opts.env ?? {}
    const childEnv = mergeEnv(env, envOverrides)
    const argList = args.map(String)
    const watch = opts.watch ?? [cwd, ...argList.filter((a) => isAbsolute(a) && a.startsWith(root) && existsSync(a) && statSync(a).isDirectory())]
    const watched = [...new Set(watch.map((w) => resolve(w)))]
    const before = Object.fromEntries(watched.map((w) => [w, snapshot(w, { env })]))
    const t0 = performance.now()
    let r
    let spawnError = null
    try {
      r = spawnSync(command, argList, { cwd, env: childEnv, input: opts.input ?? '', encoding: 'utf8', timeout: opts.timeoutMs ?? 30000, maxBuffer: 64 * 1024 * 1024 })
      if (r.error) spawnError = r.error.message
    } catch (e) {
      spawnError = e.message
      r = { stdout: '', stderr: '', status: null, signal: null }
    }
    const durationMs = Math.round(performance.now() - t0)
    const tree = {}
    for (const w of watched) {
      const after = snapshot(w, { env })
      tree[w] = { before: before[w], after, diff: diffSnapshots(before[w], after) }
    }
    let json
    try { json = JSON.parse(r.stdout) } catch { json = undefined }
    const t = {
      argv: [command, ...argList],
      cwd,
      env: childEnv,
      envOverrides,
      stdout: r.stdout ?? '',
      stderr: r.stderr ?? '',
      status: r.status,
      signal: r.signal,
      timedOut: r.error?.code === 'ETIMEDOUT',
      spawnError,
      durationMs,
      json,
      tree,
      treeUnchanged: Object.values(tree).every((d) => d.diff.empty),
    }
    t.text = () => formatTranscript(t)
    return t
  }

  function run(script, args = [], opts = {}) {
    const base = opts.skillDir ?? skillDir
    const scriptPath = isAbsolute(script) ? script : join(base, script)
    return exec(python, [...(opts.pythonFlags ?? []), scriptPath, ...args], opts)
  }

  const chmod = (p, mode) => chmodSync(p, mode)

  return { root, home, env: { ...env }, skillDir, python, dir, git, gitRepo, copySkill, writeFiles: (d, f) => writeFiles(d, f), exec, run, snapshot: (d) => snapshot(d, { env }), diffSnapshots, chmod }
}
