import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-023-v0-cli-0/skills/sdlc/test/testkit/cli-runner.mjs'

const HEAD = '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-023-v0-cli-0/skills/sdlc'
const BASE = '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//sdlc-S-023-v0-cli-0-base/skills/sdlc'
const SLICES = [{ id: 'S-001', title: 't', requirements: [], dependsOn: [], status: 'todo', phase: 'plan', counters: {} }]
const files = (cfg) => ({
  '.sdlc/config.json': { gitMode: 'pr', defaultBranch: 'main', commands: {}, ...cfg },
  '.sdlc/slices.json': SLICES,
  '.sdlc/milestones.json': [],
  '.sdlc/requirements.json': [],
})
const patch = (r, repo, sk, args = ['patch-slice', '--slice', 'S-001'], input = '{"phase":"tests"}') =>
  r.run('state-write.py', ['--repo', repo, ...args].slice(0, 0).concat(args.slice(0, 1), ['--repo', repo], args.slice(1)), { skillDir: sk, input })
const branchOf = (r, repo) => r.exec('git', ['-C', repo, 'branch', '--show-current']).stdout.trim()

for (const [label, sk] of [['head', HEAD], ['base', BASE]]) {
  test(`verify cli: ${label} patch-slice custom format names the branch`, () => {
    const r = cliRunner(); const repo = r.gitRepo({ files: files({ branchFormat: 'feature/PROJ-1-{name}' }) })
    const t = patch(r, repo, sk)
    console.log(label, 'custom', t.status, t.stdout.trim(), t.stderr.trim())
    assert.equal(t.status, 0); assert.equal(t.json.branch, 'feature/PROJ-1-S-001'); assert.equal(branchOf(r, repo), 'feature/PROJ-1-S-001')
  })
  test(`verify cli: ${label} patch-slice lowercase format`, () => {
    const r = cliRunner(); const repo = r.gitRepo({ files: files({ branchFormat: 'feature/{name:lower}' }) })
    const t = patch(r, repo, sk)
    console.log(label, 'lower', t.status, t.stdout.trim())
    assert.equal(t.status, 0); assert.equal(t.json.branch, 'feature/s-001')
  })
  test(`verify cli: ${label} patch-slice no branchFormat gives sdlc/S-001`, () => {
    const r = cliRunner(); const repo = r.gitRepo({ files: files({}) })
    const t = patch(r, repo, sk)
    assert.equal(t.status, 0); assert.equal(t.json.branch, 'sdlc/S-001')
  })
  test(`verify cli: ${label} patch-slice empty and non-string branchFormat fall back`, () => {
    for (const bf of ['', 5, null, ['x']]) {
      const r = cliRunner(); const repo = r.gitRepo({ files: files({ branchFormat: bf }) })
      const t = patch(r, repo, sk)
      console.log(label, 'bf', JSON.stringify(bf), t.status, t.stdout.trim().slice(0, 120))
      assert.equal(t.status, 0); assert.equal(t.json.branch, 'sdlc/S-001')
    }
  })
  test(`verify cli: ${label} patch-slice invalid branchFormat is a clean Fail`, () => {
    for (const bf of ['bad{x}', 'has space/{name}', 'a//{name}', '{name}.lock', 'x']) {
      const r = cliRunner(); const repo = r.gitRepo({ files: files({ branchFormat: bf }) })
      const t = patch(r, repo, sk)
      console.log(label, 'badfmt', JSON.stringify(bf), t.status, t.stdout.trim().slice(0, 160), '|', t.stderr.trim().split('\n').pop())
      assert.notEqual(t.status, 0); assert.ok(!/Traceback/.test(t.stderr)); assert.equal(t.json?.ok, false)
    }
  })
  test(`verify cli: ${label} patch-slice missing and invalid config`, () => {
    const cases = { missingConfig: null, invalidJson: '{nope', nonObject: '[1]', noSdlc: undefined }
    for (const [k, v] of Object.entries(cases)) {
      const f = files({}); if (v === null) delete f['.sdlc/config.json']; else if (v !== undefined) f['.sdlc/config.json'] = v
      if (v === undefined) for (const key of Object.keys(f)) delete f[key]
      if (v === undefined) f['x'] = 'y'
      const r = cliRunner(); const repo = r.gitRepo({ files: f })
      const t = patch(r, repo, sk)
      console.log(label, k, t.status, t.stdout.trim().slice(0, 200).replace(repo, '<repo>'), '|', /Traceback/.test(t.stderr) ? 'TRACEBACK' : 'no-traceback')
      assert.notEqual(t.status, 0)
    }
  })
  test(`verify cli: ${label} base-branch custom format with awaiting-merge dependency`, () => {
    const f = files({ branchFormat: 'feature/{name:lower}' })
    f['.sdlc/slices.json'] = [{ id: 'S-001', status: 'awaiting-merge', dependsOn: [] }, { id: 'S-002', status: 'todo', dependsOn: ['S-001'] }]
    const r = cliRunner(); const repo = r.gitRepo({ files: f, branches: ['feature/s-001'] })
    const t = patch(r, repo, sk, ['base-branch', '--slice', 'S-002'], '')
    console.log(label, 'base', t.status, t.stdout.trim())
    assert.equal(t.status, 0); assert.equal(t.json.branch, 'feature/s-001'); assert.equal(t.treeUnchanged, true)
  })
  test(`verify cli: ${label} base-branch default and fallback`, () => {
    const f = files({}); f['.sdlc/slices.json'] = [{ id: 'S-001', status: 'awaiting-merge', dependsOn: [] }, { id: 'S-002', status: 'todo', dependsOn: ['S-001'] }]
    const r = cliRunner(); const repo = r.gitRepo({ files: f, branches: ['sdlc/S-001'] })
    assert.equal(patch(r, repo, sk, ['base-branch', '--slice', 'S-002'], '').json.branch, 'sdlc/S-001')
    const r2 = cliRunner(); const repo2 = r2.gitRepo({ files: files({}) })
    assert.equal(patch(r2, repo2, sk, ['base-branch', '--slice', 'S-001'], '').json.branch, 'main')
  })
  test(`verify cli: ${label} base-branch bad format that the answer needs is a clean Fail`, () => {
    for (const bf of ['bad{x}', 'zz', '{name}{name}']) {
      const f = files({ branchFormat: bf }); f['.sdlc/slices.json'] = [{ id: 'S-001', status: 'awaiting-merge', dependsOn: [] }, { id: 'S-002', status: 'todo', dependsOn: ['S-001'] }]
      const r = cliRunner(); const repo = r.gitRepo({ files: f })
      const t = patch(r, repo, sk, ['base-branch', '--slice', 'S-002'], '')
      console.log(label, 'base-badfmt-dep', JSON.stringify(bf), t.status, t.stdout.trim().slice(0, 160), '|', /Traceback/.test(t.stderr) ? 'TRACEBACK' : 'no-traceback')
      assert.notEqual(t.status, 0); assert.ok(!/Traceback/.test(t.stderr)); assert.equal(t.json?.ok, false)
    }
  })
  test(`verify cli: ${label} base-branch bad format that the answer never uses`, () => {
    const f = files({ branchFormat: 'bad{x}' }); f['.sdlc/slices.json'] = [{ id: 'S-001', status: 'todo', dependsOn: [] }]
    const r = cliRunner(); const repo = r.gitRepo({ files: f })
    const t = patch(r, repo, sk, ['base-branch', '--slice', 'S-001'], '')
    console.log(label, 'base-badfmt-unused', t.status, t.stdout.trim())
    assert.equal(t.status, 0); assert.equal(t.json.branch, 'main')
  })
  test(`verify cli: ${label} base-branch bad config files`, () => {
    for (const v of [null, '{nope']) {
      const f = files({}); if (v === null) delete f['.sdlc/config.json']; else f['.sdlc/config.json'] = v
      const r = cliRunner(); const repo = r.gitRepo({ files: f })
      const t = patch(r, repo, sk, ['base-branch', '--slice', 'S-001'], '')
      console.log(label, 'base-cfg', JSON.stringify(v), t.status, t.stdout.trim().slice(0, 200).replace(repo, '<repo>'), '|', /Traceback/.test(t.stderr) ? 'TRACEBACK' : 'no-traceback')
      assert.equal(t.status, 2); assert.equal(t.json.ok, false)
    }
  })
  test(`verify cli: ${label} config that is a JSON array fails as before the change`, () => {
    for (const cmd of [['base-branch', '--slice', 'S-001'], ['patch-slice', '--slice', 'S-001']]) {
      const f = files({}); f['.sdlc/config.json'] = [1]
      const r = cliRunner(); const repo = r.gitRepo({ files: f })
      const t = patch(r, repo, sk, cmd, '{}')
      console.log(label, 'array-config', cmd[0], t.status, /Traceback/.test(t.stderr) ? 'TRACEBACK ' + t.stderr.trim().split('\n').pop() : 'no-traceback')
      assert.equal(t.status, 1)
    }
  })
  test(`verify cli: ${label} stack-mode milestone base uses the format`, () => {
    const f = files({ gitMode: 'stack', runBranch: 'run/1', branchFormat: 'feature/{name:lower}' })
    f['.sdlc/slices.json'] = [{ id: 'S-001', status: 'todo', dependsOn: [] }]
    f['.sdlc/milestones.json'] = [{ id: 'M-1', slices: ['S-001'], status: 'pending' }]
    const r = cliRunner(); const repo = r.gitRepo({ files: f })
    const t = patch(r, repo, sk, ['base-branch', '--slice', 'S-001'], '')
    console.log(label, 'stack', t.status, t.stdout.trim())
    assert.equal(t.status, 0); assert.equal(t.json.branch, 'feature/m-1')
  })
}
