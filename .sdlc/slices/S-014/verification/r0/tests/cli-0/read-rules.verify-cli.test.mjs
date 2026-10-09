import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = process.env.SDLC_REPO
const KIT = `${REPO_ROOT}/skills/sdlc/test/testkit`
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { stubServer, restrictedPath } = await import(`${KIT}/stub-server.mjs`)
const { glabStub } = await import(`${KIT}/glab-stub.mjs`)
const BRANCHES = `${REPO_ROOT}/skills/sdlc/branches.py`
const DRIVER = new URL('./readrules_driver.py', import.meta.url).pathname
const EMPTY = { rules: [], by_sample: {}, notes: [], unchecked: true }

const r = cliRunner()
const mkRepo = (config, raw) => r.gitRepo({ files: { '.sdlc/config.json': raw ?? config } })
const call = (repo, samples, env, extra = []) => r.exec('python3', ['-I', DRIVER, BRANCHES, repo, JSON.stringify(samples), ...extra], { env, cwd: r.dir('cwd'), watch: [repo] })

test('verify cli: VS-6 no forge value makes no gh or glab call', () => {
  const cases = { empty: { forge: '' }, absent: { gitMode: 'pr' }, null: { forge: null }, unknown: { forge: 'bitbucket' }, upper: { forge: 'GitHub' }, number: { forge: 7 } }
  for (const [name, cfg] of Object.entries(cases)) {
    const gh = stubServer({ name: 'gh' }), glab = glabStub()
    const repo = mkRepo(cfg)
    const t = call(repo, ['a', 'b'], { PATH: glab.path(gh.path(process.env.PATH)) })
    assert.equal(t.status, 0, name + t.text())
    const { ret } = t.json
    assert.deepEqual({ rules: ret.rules, by_sample: ret.by_sample, notes: ret.notes, unchecked: ret.unchecked }, EMPTY, name)
    assert.equal(gh.count(), 0, name + ' gh'); assert.equal(glab.count(), 0, name + ' glab')
    assert.ok(t.treeUnchanged, name)
  }
})

test('verify cli: VS-6 no sdlc config at all makes no call', () => {
  const gh = stubServer({ name: 'gh' }), glab = glabStub()
  const repo = r.gitRepo({ files: { 'x.txt': 'x' } })
  const t = call(repo, ['a'], { PATH: glab.path(gh.path(process.env.PATH)) })
  assert.deepEqual(t.json.ret.rules, []); assert.equal(t.json.ret.unchecked, true)
  assert.equal(gh.count() + glab.count(), 0)
})

test('verify cli: VS-6 config that is not valid JSON makes no call and raises Fail (characterization)', () => {
  const gh = stubServer({ name: 'gh' }), glab = glabStub()
  const repo = mkRepo(null, '{ not json')
  const t = call(repo, ['a'], { PATH: glab.path(gh.path(process.env.PATH)) })
  console.log(t.text())
  assert.equal(gh.count() + glab.count(), 0)
  assert.equal(t.status, 0)
  assert.match(t.json.fail, /is not valid JSON/)
  assert.equal(t.json.ret, undefined)
})

test('verify cli: VS-6 forge gitlab with no samples still shaped', () => {
  const glab = glabStub({ script: [{ stdout: { branch_name_regex: '^a$' } }] })
  const t = call(mkRepo({ forge: 'gitlab' }), [], glab.env({ PATH: process.env.PATH }))
  assert.equal(t.status, 0); console.log(JSON.stringify(t.json))
  assert.equal(t.json.ret.unchecked, false)
})

test('verify cli: VS-8 PATH with python3 and git only gives the unknown note', () => {
  const repo = mkRepo({ forge: 'gitlab' })
  const t = call(repo, ['a', 'b'], { PATH: restrictedPath(['python3', 'git']) })
  console.log(t.text())
  assert.equal(t.status, 0)
  const ret = t.json.ret
  assert.equal(ret.notes.length, 1); assert.match(ret.notes[0], /^rules unknown on gitlab: \S/)
  assert.deepEqual([ret.rules, ret.by_sample, ret.unchecked], [[], {}, true])
  assert.ok(t.treeUnchanged)
})

test('verify cli: VS-8 glab slower than FORGE_TIMEOUT gives the note, no hang, no orphan', () => {
  const marker = join(r.dir('mk'), 'alive')
  const bin = r.dir('bin')
  writeFileSync(join(bin, 'glab'), `#!/bin/sh\necho $$ > "${marker}.pid"\nsleep 30\ntouch "${marker}"\n`, { mode: 0o755 })
  const repo = mkRepo({ forge: 'gitlab' })
  const t = call(repo, ['a'], { PATH: `${bin}:${process.env.PATH}` }, ['1'])
  console.log(t.text())
  assert.equal(t.status, 0)
  assert.ok(t.durationMs < 10000, `took ${t.durationMs}`)
  assert.match(t.json.ret.notes[0], /^rules unknown on gitlab: /)
  assert.equal(t.json.ret.notes.length, 1); assert.equal(t.json.ret.unchecked, true)
  assert.deepEqual(t.json.ret.rules, [])
  const pid = execFileSync('cat', [`${marker}.pid`], { encoding: 'utf8' }).trim()
  const alive = spawnSync('sh', ['-c', `kill -0 ${pid} 2>/dev/null && ps -p ${pid} -o pid=,command=`], { encoding: 'utf8' })
  assert.equal(alive.stdout.trim(), '', 'sleeper process: ' + alive.stdout)
  assert.ok(t.treeUnchanged)
})

test('verify cli: VS-8 glab that stalls with exec sleep leaves no child', () => {
  const glab = glabStub({ script: [{ stall: true }] })
  const t = call(mkRepo({ forge: 'gitlab' }), ['a'], glab.env({ PATH: process.env.PATH }), ['1'])
  assert.match(t.json.ret.notes[0], /^rules unknown on gitlab: /)
  const ps = spawnSync('sh', ['-c', 'ps -axo pid=,command= | grep "sleep 600" | grep -v grep'], { encoding: 'utf8' })
  console.log('sleep 600 survivors:', JSON.stringify(ps.stdout))
  assert.equal(ps.stdout.trim(), '')
})

for (const [name, step] of [['non-JSON text', { stdout: 'not json at all' }], ['empty output', { stdout: '' }], ['partial JSON', { stdout: '{"branch_name_regex": "^a' }], ['exit 127', { exit: 127 }], ['exit 2 with JSON body', { exit: 2, stdout: { message: '404' } }], ['NUL stderr', { exit: 1, stderr: Buffer.from('a\0b\n\x1b[31mred') }], ['bad utf8 stderr', { exit: 1, stderr: Buffer.from([0xff, 0xfe, 0x0a, 0x41]) }]]) {
  test(`verify cli: VS-8 ${name} gives one note`, () => {
    const glab = glabStub({ script: [step] })
    const repo = mkRepo({ forge: 'gitlab' })
    const t = call(repo, ['a', 'b'], glab.env({ PATH: process.env.PATH }))
    console.log(name, JSON.stringify(t.json))
    assert.equal(t.status, 0, t.text())
    const ret = t.json.ret
    assert.equal(ret.notes.length, 1); assert.match(ret.notes[0], /^rules unknown on gitlab: /)
    assert.deepEqual([ret.rules, ret.by_sample, ret.unchecked], [[], {}, true])
    assert.equal(glab.count(), 1)
    assert.ok(t.treeUnchanged)
  })
}

test('verify cli: VS-8 long and multi-line stderr passes stderr through unbounded (characterization)', () => {
  const glab = glabStub({ script: [{ exit: 1, stderr: 'line1\nline2\n' + 'x'.repeat(200000) }] })
  const t = call(mkRepo({ forge: 'gitlab' }), ['a'], glab.env({ PATH: process.env.PATH }))
  const note = t.json.ret.notes[0]
  console.log('note length', note.length, JSON.stringify(note.slice(0, 60)))
  assert.equal(t.json.ret.notes.length, 1)
  assert.ok(note.startsWith('rules unknown on gitlab: line1\nline2\n'))
  assert.equal(note.length, 'rules unknown on gitlab: '.length + 'line1\nline2\n'.length + 200000)
})

test('verify cli: VS-8 success path argv and cwd with spaces and unicode in repo path', () => {
  const glab = glabStub({ script: [{ stdout: { branch_name_regex: '^feat/.*$' } }] })
  const repo = r.gitRepo({ name: 'rép o é 日本', files: { '.sdlc/config.json': { forge: 'gitlab' } } })
  const t = call(repo, ['a', 'b', 'c'], glab.env({ PATH: process.env.PATH }))
  assert.equal(t.json.ret.unchecked, false)
  const calls = glab.calls()
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].argv, ['api', 'projects/:fullpath/push_rule'])
  assert.ok(calls[0].cwd.endsWith('rép o é 日本') || calls[0].cwd.includes('日本'), calls[0].cwd)
})
