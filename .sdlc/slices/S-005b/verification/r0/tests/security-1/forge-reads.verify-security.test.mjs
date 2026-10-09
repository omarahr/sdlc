import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = process.env.SDLC_VERIFY_ROOT || resolve(HERE, '..', '..', '..', '..', '..', '..', '..')
const GUARD = join(ROOT, 'skills', 'sdlc', 'test', 'push_guard.py')
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const BR = 'skills/sdlc/branches.py'
const NA = 'skills/sdlc/next-action.py'
const READ_KEYS = ['direct', 'forge', 'wrapperVerbs']

function copyTree() {
  const dir = mkdtempSync(join(tmpdir(), 'verify-security-forge-reads-'))
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(ROOT, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

function guard(dir) {
  const r = spawnSync('python3', [GUARD, dir], { encoding: 'utf8' })
  assert.equal(r.status, 0, `push_guard.py exit ${r.status}: ${r.stderr}`)
  return JSON.parse(r.stdout)
}

const BASE = guard(copyTree())

const py = (...lines) => `\n\ndef _verify_read(repo, slug, owner, name, s, enc, method):\n${lines.map(l => `    ${l}`).join('\n')}\n`

function mutate(file, code, top = '') {
  const dir = copyTree()
  const path = join(dir, file)
  if (top) writeFileSync(path, readFileSync(path, 'utf8') + `\n${top}\n`)
  appendFileSync(path, code)
  return guard(dir)
}

function changed(out) {
  return Object.keys(BASE).filter(k => JSON.stringify(out[k]) !== JSON.stringify(BASE[k]))
}

const READS = [
  ['A-1', 'S-013 GitHub read as T-R-119f writes it', BR, py('subprocess.run(["gh", "api", f"repos/{slug}/rules/branches/{quote(s, safe=\'\')}"], capture_output=True, text=True)')],
  ['A-2', 'S-013 GitHub read with owner and repo split', BR, py('subprocess.run(["gh", "api", f"repos/{owner}/{name}/rules/branches/{enc}"], capture_output=True, text=True, timeout=30)')],
  ['A-3', 'S-013 GitHub read with an Accept header, --jq and --paginate', BR, py('subprocess.run(["gh", "api", "-H", "Accept: application/vnd.github+json", "--paginate", "--jq", ".[]", f"repos/{slug}/rules/branches/{enc}"], capture_output=True, text=True)')],
  ['A-4', 'S-013 GitHub read with the path built by + concatenation', BR, py('subprocess.run(["gh", "api", "repos/" + slug + "/rules/branches/" + enc], capture_output=True, text=True)')],
  ['A-5', 'S-013 GitHub read split over lines with implicit concatenation', BR, py('subprocess.run(', '    ["gh", "api",', '     "repos/" f"{slug}" "/rules/branches/" f"{enc}"],', '    capture_output=True, text=True)')],
  ['A-6', 'gh api -X GET through run', NA, py('run(repo, "gh", "api", "-X", "GET", "repos/o/r/rules/branches/x")')],
  ['A-7', 'gh api -X get in lower case through run', NA, py('run(repo, "gh", "api", "-X", "get", f"repos/{slug}/rules/branches/{enc}")')],
  ['A-8', 'gh api --method GET through run', NA, py('run(repo, "gh", "api", "--method", "GET", f"repos/{slug}/rules/branches/{enc}")')],
  ['A-9', 'gh api --method=GET through run', NA, py('run(repo, "gh", "api", "--method=GET", f"repos/{slug}/rules/branches/{enc}")')],
  ['A-10', 'gh api -XGET glued through run', NA, py('run(repo, "gh", "api", "-XGET", f"repos/{slug}/rules/branches/{enc}")')],
  ['A-11', 'gh api --method get in lower case through run', NA, py('run(repo, "gh", "api", "--method", "get", f"repos/{slug}/rules/branches/{enc}")')],
  ['A-12', 'gh api -X Get in mixed case after the path', NA, py('run(repo, "gh", "api", f"repos/{slug}/rules/branches/{enc}", "-X", "Get")')],
  ['A-13', 'S-013 GitLab push rule read through run', NA, py('run(repo, "glab", "api", "projects/:fullpath/push_rule")')],
  ['A-14', 'S-013 GitLab push rule read at a direct site', BR, py('subprocess.run(["glab", "api", "projects/:fullpath/push_rule"], capture_output=True, text=True)')],
]

const WRITES = [
  ['N-1', 'gh api -X POST on the rules path', NA, py('run(repo, "gh", "api", "-X", "POST", f"repos/{slug}/rules/branches/{enc}")'), 'method POST'],
  ['N-2', 'gh api --method=patch on the rules path', NA, py('run(repo, "gh", "api", "--method=patch", f"repos/{slug}/rules/branches/{enc}")'), 'method patch'],
  ['N-3', 'gh api -X GET with a -f field', NA, py('run(repo, "gh", "api", "-X", "GET", "-f", "a=b", f"repos/{slug}/rules/branches/{enc}")'), 'field -f'],
  ['N-4', 'gh api -X GET then -X POST', NA, py('run(repo, "gh", "api", "-X", "GET", "-X", "POST", f"repos/{slug}/rules/branches/{enc}")'), 'method POST'],
  ['N-5', 'gh api -X with a non-constant method', NA, py('run(repo, "gh", "api", "-X", method, f"repos/{slug}/rules/branches/{enc}")'), 'method is not constant'],
  ['N-6', 'gh api -X with a Cyrillic E confusable of GET', NA, py('run(repo, "gh", "api", "-X", "GЕT", f"repos/{slug}/rules/branches/{enc}")'), 'method GЕT'],
  ['N-7', 'gh api -X GET with --input', BR, py('subprocess.run(["gh", "api", "-X", "GET", "--input", "-", f"repos/{slug}/rules/branches/{enc}"], capture_output=True, text=True)'), 'field --input'],
  ['N-8', 'gh api graphql with -X GET', NA, py('run(repo, "gh", "api", "-X", "GET", "graphql")'), 'path holds graphql'],
  ['N-9', 'gh api -X GET on a pulls path', NA, py('run(repo, "gh", "api", "-X", "GET", f"repos/{slug}/pulls")'), 'path holds pulls'],
  ['N-10', 'gh api --method GET with --raw-field', NA, py('run(repo, "gh", "api", "--method", "GET", "--raw-field", "x=y", f"repos/{slug}/rules/branches/{enc}")'), 'field --raw-field'],
]

test('baseline: the unmutated tree has no forge violation and no opaque call', () => {
  assert.deepEqual(BASE.forgeViolations, [])
  assert.deepEqual(BASE.opaque, [])
})

for (const [id, label, file, code] of READS) {
  test(`verify security ${id}: ${label} changes only the direct, forge and wrapperVerbs keys`, () => {
    const out = mutate(file, code)
    const keys = changed(out)
    assert.ok(keys.includes('forge'), `${id}: forge did not change: ${keys.join(', ')}`)
    assert.deepEqual(keys.filter(k => !READ_KEYS.includes(k)), [], `${id}: changed ${keys.join(', ')}`)
    assert.deepEqual(out.forgeViolations, [], `${id}: forge violations`)
    assert.deepEqual(out.opaque, [], `${id}: opaque calls`)
    assert.deepEqual(out.pushes, BASE.pushes, `${id}: pushes`)
  })
}

test('verify security A-15: the S-013 GitHub read with its import of urllib.parse in branches.py hits no ban', () => {
  const out = mutate(BR, py('subprocess.run(["gh", "api", f"repos/{slug}/rules/branches/{urllib.parse.quote(s, safe=\'\')}"], capture_output=True, text=True)'), 'import urllib.parse')
  const keys = changed(out)
  assert.deepEqual(out.forgeViolations, [])
  assert.deepEqual(out.opaque, [])
  assert.deepEqual(out.dynamic, BASE.dynamic)
  assert.deepEqual(keys.filter(k => ![...READ_KEYS, 'network'].includes(k)), [], `changed ${keys.join(', ')}`)
  assert.deepEqual(out.network.filter(x => !BASE.network.includes(x)), ['branches.py import urllib.parse'])
})

test('verify security A-16: the S-013 GitHub read with from urllib.parse import quote in branches.py hits no ban', () => {
  const out = mutate(BR, py('subprocess.run(["gh", "api", f"repos/{slug}/rules/branches/{quote(s, safe=\'\')}"], capture_output=True, text=True)'), 'from urllib.parse import quote')
  const keys = changed(out)
  assert.deepEqual(out.forgeViolations, [])
  assert.deepEqual(out.opaque, [])
  assert.deepEqual(out.dynamic, BASE.dynamic)
  assert.deepEqual(keys.filter(k => ![...READ_KEYS, 'network'].includes(k)), [], `changed ${keys.join(', ')}`)
  assert.deepEqual(out.network.filter(x => !BASE.network.includes(x)), ['branches.py import urllib.parse'])
})

for (const [id, label, file, code, violation] of WRITES) {
  test(`verify security ${id}: ${label} is a forge violation`, () => {
    const out = mutate(file, code)
    assert.ok(out.forgeViolations.some(v => v.endsWith(`-- ${violation}`)), `${id}: ${JSON.stringify(out.forgeViolations)}`)
  })
}
