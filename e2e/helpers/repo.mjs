import fs from 'node:fs'
import path from 'node:path'
import { sh } from './stack.mjs'

let counter = 0

export function gitRepo(stack, { files = {}, branches = [], forge } = {}) {
  const dir = path.join(stack.dirs.repos, `repo-${++counter}`)
  fs.mkdirSync(dir, { recursive: true })
  const git = (...args) => {
    const proc = sh(stack, 'git', args, { cwd: dir })
    if (proc.status !== 0) throw new Error(`git ${args.join(' ')}: ${proc.stderr}`)
    return proc.stdout
  }
  git('init', '-q', '-b', 'main')
  const all = { ...files }
  if (forge) {
    const config = { ...(all['.sdlc/config.json'] || {}), forge }
    all['.sdlc/config.json'] = config
  }
  for (const [name, content] of Object.entries(all)) {
    const target = path.join(dir, name)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
  fs.writeFileSync(path.join(dir, 'README.md'), 'e2e\n')
  git('add', '-A')
  git('commit', '-q', '-m', 'init')
  for (const branch of branches) git('branch', branch)
  return { dir, git }
}

export function refs(repo) {
  return repo.git('for-each-ref', '--format=%(refname)').split('\n').filter(Boolean)
}
