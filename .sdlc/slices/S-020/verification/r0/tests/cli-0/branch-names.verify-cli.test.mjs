import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { loadInternals } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-020-v0-cli-0/skills/sdlc/test/harness.mjs'

const FORMATS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}']
const IDS = ['S-001', 'S-fix-M-1-2', 'S-013a', 'S-100']
const ROUNDS = [0, 1, 12]
const PROFILES = ['http-api', 'cli', 'Http-API', 'ui', 'db-schema']
const PARTS = [0, 3]
const log = []

for (const fmt of FORMATS) {
  test('verify cli: loop script and branches.py agree on the verifier branch for ' + fmt, async () => {
    const rt = await loadInternals(undefined, { branchFormat: fmt })
    const r = cliRunner({ skillDir: '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-020-v0-cli-0/skills/sdlc' })
    const repo = r.gitRepo({})
    let n = 0
    for (const id of IDS) for (const round of ROUNDS) for (const profile of PROFILES) for (const part of PARTS) {
      const args = ['name', '--repo', repo, '--kind', 'verify', '--id', id, '--round', String(round), '--profile', profile, '--part', String(part), '--format', fmt]
      const t = r.run('branches.py', args)
      const tail = id + '-v' + round + '-' + profile + '-' + part
      const mine = rt.I.branchName(tail)
      log.push(fmt + ' | ' + tail + ' | exit=' + t.status + ' | py=' + (t.json && t.json.branch) + ' | js=' + mine)
      assert.equal(t.status, 0, t.text())
      assert.equal(t.treeUnchanged, true, t.text())
      assert.equal(t.json.branch, mine, t.text())
      n++
    }
    assert.equal(n, IDS.length * ROUNDS.length * PROFILES.length * PARTS.length)
  })
}

test('verify cli: config file format is used by branches.py and matches the loop script', async () => {
  const fmt = 'feature/PROJ-1-{name:lower}'
  const rt = await loadInternals(undefined, { branchFormat: fmt })
  const r = cliRunner({ skillDir: '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-020-v0-cli-0/skills/sdlc' })
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } } })
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-020', '--round', '0', '--profile', 'http-api', '--part', '0'])
  log.push('config | ' + t.text())
  assert.equal(t.status, 0, t.text())
  assert.equal(t.json.branch, rt.I.branchName('S-020-v0-http-api-0'))
  assert.equal(t.json.branch, 'feature/PROJ-1-s-020-v0-http-api-0')
})

test('verify cli: empty branchFormat falls back to the default and matches the default name', async () => {
  const rt = await loadInternals(undefined, { branchFormat: '' })
  const r = cliRunner({ skillDir: '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-020-v0-cli-0/skills/sdlc' })
  const repo = r.gitRepo({})
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', 'S-020', '--round', '1', '--profile', 'cli', '--part', '0'])
  assert.equal(t.status, 0, t.text())
  assert.equal(t.json.branch, rt.I.branchName('S-020-v1-cli-0'))
  assert.equal(t.json.branch, 'sdlc/S-020-v1-cli-0')
})

test.after(() => writeFileSync('/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/.sdlc/slices/S-020/verification/r0/logs/cli-0-names.txt', log.slice(-2000).join('\n') + '\n'))
