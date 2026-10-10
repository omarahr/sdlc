import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const JANITOR = join(WT, 'skills/sdlc/janitor.py')
const env = (cwd) => ({ PATH: process.env.PATH, HOME: cwd, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@e', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@e', PYTHONUTF8: '1' })
const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8', env: env(cwd) }).stdout

function repoFor(configText) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-verify-jan-'))
  git(repo, 'init', '-q', '-b', 'main')
  mkdirSync(join(repo, '.sdlc'))
  if (configText !== null) writeFileSync(join(repo, '.sdlc/config.json'), configText)
  writeFileSync(join(repo, '.sdlc/slices.json'), JSON.stringify([{ id: 'S-001', status: 'done' }, { id: 'S-002', status: 'in_progress' }]))
  git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'i')
  for (const b of ['sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-001-v0-http-api-0', 'sdlc/S-999-v0-cli-0']) git(repo, 'branch', b)
  return repo
}
const refs = (repo) => git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').trim().split('\n').sort()
const run = (repo) => {
  const r = spawnSync('python3', [JANITOR, '--repo', repo, '--days', '3650'], { encoding: 'utf8', env: env(repo) })
  return { status: r.status, stderr: r.stderr, out: JSON.parse(r.stdout) }
}

const malformed = [
  ['no placeholder', 'feature/PROJ-1'],
  ['two placeholders', 'a/{name}/{name}'],
  ['unbalanced open', 'a/{name'],
  ['unbalanced close', 'a/name}'],
  ['extra brace', 'a{/{name}'],
  ['whitespace', 'a b/{name}'],
  ['double dot', 'a..b/{name}'],
  ['tilde', 'a~/{name}'],
  ['colon', 'a:/{name}'],
  ['question mark', 'a?/{name}'],
  ['bracket', 'a[/{name}'],
  ['backslash', 'a\\/{name}'],
  ['ends with .lock', '{name}.lock'],
  ['at brace', '@{/{name}'],
  ['control char', 'a\u0001/{name}'],
  ['unknown modifier', '{name:upper}'],
  ['bare braces', '{}'],
]

for (const [label, fmt] of malformed) {
  test(`verify contract: janitor with malformed branchFormat (${label}) deletes no branch and reports it`, () => {
    const repo = repoFor(JSON.stringify({ branchFormat: fmt }))
    const before = refs(repo)
    const { status, out } = run(repo)
    assert.equal(status, 0)
    assert.deepEqual(out.removedBranches, [])
    assert.deepEqual(refs(repo), before)
    const reported = out.notes.some((n) => /branch format|format/i.test(n))
    console.log(`malformed ${label}: reported=${reported} notes=${JSON.stringify(out.notes)}`)
    if (['no placeholder', 'two placeholders', 'unbalanced open', 'unbalanced close'].includes(label)) assert.ok(reported)
  })
}

for (const [label, value] of [['number', 5], ['array', ['feature/{name}']], ['object', { a: 1 }], ['true', true], ['null', null]]) {
  test(`verify contract: janitor with non-string branchFormat (${label}) probe`, () => {
    const repo = repoFor(JSON.stringify({ branchFormat: value }))
    const before = refs(repo)
    const { out } = run(repo)
    console.log(`non-string ${label}: removed=${JSON.stringify(out.removedBranches)} notes=${JSON.stringify(out.notes)}`)
    assert.equal(refs(repo).includes('feature/PROJ-1-S-001-v0-http-api-0'), true)
    assert.equal(before.length >= 4, true)
  })
}

for (const [label, text] of [['invalid json', '{"branchFormat":'], ['non-object json', '[]'], ['directory-like text', 'null']]) {
  test(`verify contract: janitor with broken config (${label}) never raises and keeps foreign branches`, () => {
    const repo = repoFor(text)
    const { status, out } = run(repo)
    console.log(`${label}: status=${status} removed=${JSON.stringify(out.removedBranches)} notes=${JSON.stringify(out.notes)}`)
    assert.equal(status, 0)
    assert.equal(refs(repo).includes('feature/PROJ-1-S-001-v0-http-api-0'), true)
  })
}
