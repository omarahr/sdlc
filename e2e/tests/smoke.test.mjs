import assert from 'node:assert/strict'
import test from 'node:test'
import { up, down } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { mark, since } from '../helpers/logs.mjs'
import { gitRepo, refs } from '../helpers/repo.mjs'
import { respondWith, failNext, requests, clearRequests } from '../helpers/fakes.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
test.after(() => down(stack))

scenario('SMOKE-api', 'branches.py prints one JSON object', () => {
  const repo = gitRepo(stack)
  const t = api(stack, 'branches.py', ['name', '--repo', repo.dir, '--kind', 'run', '--n', '1'])
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.branch, 'sdlc/run-1')
})

scenario('SMOKE-repo', 'repo helper reads refs', () => {
  const repo = gitRepo(stack, { branches: ['sdlc/S-001'] })
  assert.ok(refs(repo).includes('refs/heads/sdlc/S-001'))
  const t = api(stack, 'branches.py', ['list', '--repo', repo.dir, '--kind', 'slice'])
  assert.equal(t.json.ok, true)
})

scenario('SMOKE-logs', 'log capture returns lines since a marker', () => {
  const offset = mark(stack, 'smoke')
  api(stack, 'branches.py', ['name', '--repo', stack.dirs.repos, '--kind', 'slice', '--id', 'S-001'])
  const lines = since(stack, offset)
  assert.ok(lines.some((line) => line.includes('"script":"branches.py"')))
})

scenario('SMOKE-events', 'fake forge records requests and obeys failure switches', () => {
  const repo = gitRepo(stack, { forge: 'github' })
  clearRequests(stack, 'gh')
  respondWith(stack, 'gh', [])
  const ok = api(stack, 'branches.py', ['preflight', '--repo', repo.dir, '--mode', 'pr'])
  assert.equal(ok.json.ok, true, ok.stdout)
  const seen = requests(stack, 'gh')
  assert.ok(seen.length >= 1)
  assert.equal(seen[0].args[0], 'api')
  clearRequests(stack, 'gh')
  failNext(stack, 'gh', 'gh: boom')
  const failed = api(stack, 'branches.py', ['preflight', '--repo', repo.dir, '--mode', 'pr'])
  assert.equal(failed.json.ok, true, failed.stdout)
  assert.ok(requests(stack, 'gh').length >= 1)
})
