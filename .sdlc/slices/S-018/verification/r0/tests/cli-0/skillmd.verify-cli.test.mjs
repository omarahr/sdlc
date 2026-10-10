import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'

const SKILL = process.env.VERIFY_SKILL_DIR
const md = readFileSync(`${SKILL}/SKILL.md`, 'utf8')
const lines = md.split('\n')
const find = (s, from = 0) => lines.findIndex((l, i) => i >= from && l.includes(s))

function flagChecks(text) {
  const ls = text.split('\n')
  const cmd = ls.findIndex((l) => l.startsWith('- `/sdlc <spec-path>'))
  const line = ls[cmd] ?? ''
  const cf = line.indexOf('--commit-format'), bf = line.indexOf('--branch-format'), mi = line.indexOf('--max-iterations')
  const bullet = ls.findIndex((l) => l.startsWith('  - `--branch-format`'))
  const cb = ls.findIndex((l) => l.startsWith('  - `--commit-format`'))
  const bb = ls.findIndex((l) => l.startsWith('  - `--bar-raiser'))
  const out = []
  if (!(cf > -1 && bf > cf && mi > bf)) out.push('commands line order')
  if (!(bullet > cb && bullet < bb && cb > -1)) out.push('bullet order')
  const b = ls[bullet] ?? ''
  for (const w of ['{name}', 'sdlc/{name}', 'config.json']) if (!b.includes(w)) out.push('bullet lacks ' + w)
  return out
}

test('verify cli: VS-1 flag line and bullet order', () => {
  assert.deepEqual(flagChecks(md), [])
})

test('verify cli: VS-1 mutants of SKILL.md are caught', () => {
  const noFlag = md.replace(' [--branch-format "<format>"]', '')
  assert.ok(flagChecks(noFlag).length > 0)
  const before = md.replace(' [--commit-format "<format>"] [--branch-format "<format>"]', ' [--branch-format "<format>"] [--commit-format "<format>"]')
  assert.ok(flagChecks(before).length > 0)
})

test('verify cli: VS-2 branch format bullet position and old text gone', () => {
  const git = find('- **Git mode')
  const bf = find('- **Branch format:**')
  const stop = find('rm -f "$REPO/.sdlc/STOP"')
  assert.ok(git > -1 && bf > git && stop > bf, `${git} ${bf} ${stop}`)
  for (const gone of ['Branch name (first run only)', 'branch_name_regex', 'push_rule', 'push rule']) assert.ok(!md.includes(gone), gone)
  const bullet = lines[bf]
  for (const w of ['preflight', 'parse', '`ok` is false', 'samples', 'notes', 'suggestion', 'derived', '`working`', 'rename', 'first run only', '--mode <gitMode>', '--format "<format>"', '--branch "$BASE_BRANCH"', '`mr` mode']) assert.ok(bullet.includes(w), w)
})

function commandsInBullet() {
  const bullet = lines[find('- **Branch format:**')]
  return [...bullet.matchAll(/`(python3 "\$SKILL_DIR\/branches\.py"[^`]*)`/g)].map((m) => m[1])
}

test('verify cli: VS-2 documented commands run against branches.py', () => {
  const cmds = commandsInBullet()
  assert.equal(cmds.length, 2)
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: ['feature/x'] })
  const sub = (c, extra) => c.replace(/^python3 "\$SKILL_DIR\/branches\.py"\s*/, '').replace(/"\$REPO"/g, repo).replace(/"\$FMT"/g, 'sdlc/{name}').replace(/"\$BASE_BRANCH"/g, 'sdlc/S-001').replace('<gitMode>', 'mr').trim()
  const args = (c) => [...c.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2])
  const pre = r.run('branches.py', [...args(sub(cmds[0])), '--format', 'sdlc/{name}', '--branch', 'sdlc/S-001'])
  assert.equal(pre.status, 0, pre.text())
  assert.equal(pre.json.ok, true)
  assert.equal(pre.json.format, 'sdlc/{name}')
  assert.ok('derived' in pre.json && 'samples' in pre.json && 'notes' in pre.json && 'suggestion' in pre.json)
  assert.ok(pre.json.samples.some((s) => s.kind === 'working'))
  const par = r.run('branches.py', args(sub(cmds[1])))
  assert.equal(par.status, 0, par.text())
  assert.equal(par.json.kind, 'slice')
  const other = r.run('branches.py', args(sub(cmds[1]).replace('sdlc/S-001', 'main')))
  assert.equal(other.json.kind, null)
  assert.ok(pre.treeUnchanged && par.treeUnchanged)
})

test('verify cli: VS-2 preflight reports ok false for a format without a placeholder', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: {}, branches: [] })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'direct', '--format', 'nofield'])
  assert.notEqual(t.status, undefined)
  assert.ok(t.json?.ok === false || t.status !== 0, t.text())
})

test('verify cli: VS-2 preflight on a derived format from a config.json fallback', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } }, branches: [] })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'])
  assert.equal(t.status, 0, t.text())
  assert.equal(t.json.format, 'feature/{name}')
})

test('verify cli: VS-4 mismatch bullet follows Branch format and reports both', () => {
  const bf = find('- **Branch format:**')
  const mm = find('when `$WT/.sdlc/config.json` holds a `branchFormat` that differs from `$FMT`')
  assert.ok(mm === bf + 1, `${bf} ${mm}`)
  const l = lines[mm]
  for (const w of ['After the worktree exists', 'report both', 'end', 'a run in progress keeps its names']) assert.ok(l.includes(w), w)
  const stop = find('rm -f "$REPO/.sdlc/STOP"')
  assert.ok(stop > mm)
})

test('verify cli: VS-4 the worktree value and the flag value differ and both are readable', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } }, branches: [] })
  const cfg = JSON.parse(readFileSync(`${repo}/.sdlc/config.json`, 'utf8'))
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'direct', '--format', 'team/{name}'])
  assert.equal(t.json.format, 'team/{name}')
  assert.notEqual(cfg.branchFormat, t.json.format)
})
