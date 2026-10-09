import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { appendFileSync, chmodSync, cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.SDLC_VERIFY_ROOT || resolve(HERE, '..', '..', '..', '..', '..', '..', '..')
const GUARD = join(ROOT, 'skills', 'sdlc', 'test', 'push_guard.py')
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const BANS = ['forgeViolations', 'opaque', 'dynamic', 'wrapperValues', 'pushes', 'jsHits', 'jsAllowed']

const BR = 'skills/sdlc/branches.py'
const NA = 'skills/sdlc/next-action.py'
const SW = 'skills/sdlc/state-write.py'

function guard(root, env = process.env) {
  const r = spawnSync('python3', [GUARD, root], { encoding: 'utf8', env })
  assert.equal(r.status, 0, `push_guard.py exit ${r.status}, stderr ${r.stderr}`)
  return JSON.parse(r.stdout)
}

function copyTree() {
  const dir = mkdtempSync(join(tmpdir(), 'verify-security-vs10-'))
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(ROOT, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

const py = (...lines) => `\n\ndef _verify_read(repo, slug, sample, s, b):\n${lines.map(l => `    ${l}`).join('\n')}\n`

function mutate(file, code, top = '') {
  const dir = copyTree()
  const path = join(dir, file)
  if (top) writeFileSync(path, `${top}\n${readFileSync(path, 'utf8')}`)
  appendFileSync(path, code)
  return { dir, out: guard(dir) }
}

const BASE = guard(copyTree())

function delta(out) {
  const d = {}
  for (const key of Object.keys(BASE)) {
    const before = new Set(BASE[key])
    const after = new Set(out[key])
    const added = [...after].filter(x => !before.has(x))
    const removed = [...before].filter(x => !after.has(x))
    if (added.length || removed.length) d[key] = { added, removed }
  }
  return d
}

function assertReadOnlyPins(label, out, allowed) {
  const d = delta(out)
  for (const key of BANS) assert.deepEqual(out[key], BASE[key], `${label}: ban key ${key} changed: ${JSON.stringify(d[key])}`)
  assert.deepEqual(Object.keys(d).filter(k => !allowed.includes(k)), [], `${label}: unexpected pin change ${JSON.stringify(d)}`)
  for (const key of Object.keys(d)) assert.deepEqual(d[key].removed, [], `${label}: ${key} lost an entry`)
  return d
}

test('verify security: the unmutated copy has no ban entry', () => {
  for (const key of ['forgeViolations', 'opaque', 'dynamic', 'wrapperValues', 'jsHits']) assert.deepEqual(BASE[key], [], key)
  assert.equal(BASE.pushes.length, 3)
})

test('verify security: the spec GitHub rules read in branches.py changes only the direct and forge pins', () => {
  const forms = [
    ['spec placeholders with quote', `subprocess.run(["gh", "api", f"repos/{{owner}}/{{repo}}/rules/branches/{quote(sample, safe='')}"], capture_output=True, text=True)`, 'branches.py _verify_read gh api repos/{owner}/{repo}/rules/branches/'],
    ['slug f-string, plan shape', `subprocess.run(['gh', 'api', f'repos/{slug}/rules/branches/{quote(s, safe="")}'], capture_output=True, text=True)`, 'branches.py _verify_read gh api repos/'],
    ['constant plus quote', `subprocess.run(["gh", "api", "repos/{owner}/{repo}/rules/branches/" + quote(sample, safe="")], capture_output=True, text=True)`, 'branches.py _verify_read gh api repos/{owner}/{repo}/rules/branches/'],
    ['check_output', `subprocess.check_output(["gh", "api", f"repos/{slug}/rules/branches/{s}"], text=True)`, 'branches.py _verify_read gh api repos/'],
    ['paginate, include, timeout and env', `subprocess.run(["gh", "api", "--paginate", "-i", f"repos/{slug}/rules/branches/{s}"], capture_output=True, text=True, timeout=30, env={**os.environ, "GH_PROMPT_DISABLED": "1"}, check=False)`, 'branches.py _verify_read gh api repos/'],
    ['explicit GET spellings', `subprocess.run(["gh", "api", "-XGET", f"repos/{slug}/rules/branches/{s}"], capture_output=True, text=True)\nsubprocess.run(["gh", "api", "--method=GET", f"repos/{slug}/rules/branches/{s}"], capture_output=True, text=True)\nsubprocess.run(["gh", "api", "-X", "get", f"repos/{slug}/rules/branches/{s}"], capture_output=True, text=True)`, 'branches.py _verify_read gh api repos/'],
  ]
  for (const [label, code, forge] of forms) {
    const { out } = mutate(BR, py(...code.split('\n')))
    const d = assertReadOnlyPins(label, out, ['direct', 'forge'])
    assert.deepEqual(d.forge.added, [forge], `${label}: forge pin`)
    assert.ok(d.direct.added.length >= 1, `${label}: direct pin did not change`)
  }
})

test('verify security: the spec quote import adds a network pin entry and no ban', () => {
  for (const top of ['from urllib.parse import quote', 'import urllib.parse']) {
    const call = top.startsWith('from') ? 'quote' : 'urllib.parse.quote'
    const { out } = mutate(BR, py(`subprocess.run(["gh", "api", f"repos/{slug}/rules/branches/{${call}(s, safe='')}"], capture_output=True, text=True)`), top)
    const d = assertReadOnlyPins(top, out, ['direct', 'forge', 'network'])
    assert.deepEqual(d.network.added, ['branches.py import urllib.parse'], `${top}: network pin`)
  }
})

test('verify security: gh api -X GET through the next-action run wrapper changes only the forge and wrapper-verb pins', () => {
  for (const code of [
    `run(repo, "gh", "api", "-X", "GET", "repos/o/r/rules/branches/x")`,
    `run(repo, 'gh', 'api', f'repos/{slug}/rules/branches/{quote(s, safe="")}')`,
  ]) {
    const { out } = mutate(NA, py(code))
    const d = assertReadOnlyPins(code, out, ['forge', 'wrapperVerbs'])
    assert.deepEqual(d.wrapperVerbs.added, ['next-action.py gh api'])
    assert.equal(d.forge.added.length, 1)
  }
})

test('verify security: the spec GitLab push rule read changes only a pin, direct or through run', () => {
  const direct = [
    `subprocess.run(["glab", "api", "projects/:fullpath/push_rule"], capture_output=True, text=True, cwd=repo)`,
    `subprocess.run(["glab", "api", "--hostname", "gitlab.example.com", "projects/:fullpath/push_rule"], capture_output=True, text=True)`,
    `subprocess.run(["glab", "api", "-X", "GET", "--paginate", "projects/:fullpath/push_rule"], capture_output=True, text=True)`,
  ]
  for (const code of direct) {
    const { out } = mutate(BR, py(code))
    const d = assertReadOnlyPins(code, out, ['direct', 'forge'])
    assert.deepEqual(d.forge.added, ['branches.py _verify_read glab api projects/:fullpath/push_rule'])
  }
  const { out } = mutate(NA, py(`run(repo, "glab", "api", "projects/:fullpath/push_rule")`))
  const d = assertReadOnlyPins('glab through run', out, ['forge', 'wrapperVerbs'])
  assert.deepEqual(d.wrapperVerbs.added, ['next-action.py glab api'])
  assert.deepEqual(d.forge.added, ['next-action.py _verify_read glab api projects/:fullpath/push_rule'])
})

test('verify security: a git fetch through the state-write wrapper changes no pin, and a git log adds one known verb', () => {
  const fetch = mutate(SW, py(`git(repo, "fetch", "-q", "origin", b, check=False)`)).out
  assert.deepEqual(delta(fetch), {}, 'git fetch changed a pin')
  const log = mutate(SW, py(`git(repo, "log", "-1", "--format=%H")`, `git(repo, "fetch", "origin")`)).out
  const d = assertReadOnlyPins('git log', log, ['wrapperVerbs'])
  assert.deepEqual(d.wrapperVerbs.added, ['state-write.py git log'])
  assert.deepEqual(log.pushes, BASE.pushes)
})

test('verify security: the guard reads the reads and never runs them', () => {
  const dir = copyTree()
  const bin = mkdtempSync(join(tmpdir(), 'verify-security-shim-'))
  const marker = join(bin, 'called')
  for (const tool of ['gh', 'glab', 'git']) {
    writeFileSync(join(bin, tool), `#!/bin/sh\necho "${tool} $*" >> "${marker}"\n`)
    chmodSync(join(bin, tool), 0o755)
  }
  const planted = join(bin, 'imported')
  appendFileSync(join(dir, BR), `\nopen(${JSON.stringify(planted)}, "w").write("ran")\n` + py(`subprocess.run(["gh", "api", f"repos/{slug}/rules/branches/{s}"])`, `subprocess.run(["glab", "api", "projects/:fullpath/push_rule"])`))
  const out = guard(dir, { ...process.env, PATH: `${bin}:${process.env.PATH}` })
  assert.equal(out.forge.length, BASE.forge.length + 2)
  assert.equal(existsSync(marker), false, 'the guard ran gh, glab or git')
  assert.equal(existsSync(planted), false, 'the guard executed scanned module code')
})

test('verify security seed: a list item with a space shifts the forge parse, so a POST to pulls gives no forge violation', () => {
  const { out } = mutate(NA, py(`run(repo, "gh", "api", "-H", "A: --jq", "-X", "POST", "repos/o/r/pulls")`))
  assert.deepEqual(out.forgeViolations, [])
  assert.deepEqual(delta(out).forge.added, ['next-action.py _verify_read gh api POST'])
  const hidden = mutate(BR, py(`subprocess.run(["gh", "api", "-H", "Accept: x", "graphql"])`)).out
  assert.deepEqual(hidden.forgeViolations, [])
  assert.deepEqual(delta(hidden).forge.added, ['branches.py _verify_read gh api x'])
})
