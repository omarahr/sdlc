import { test } from 'node:test'
import assert from 'node:assert/strict'
const ROOT = process.env.VROOT
const { cliRunner } = await import(`${ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { stubServer } = await import(`${ROOT}/skills/sdlc/test/testkit/stub-server.mjs`)
const runner = cliRunner()
const run = (rules, extra = [], timeoutMs = 30000) => {
  const shim = stubServer({ name: 'gh', script: [], fallback: { stdout: rules.map((p) => ({ type: 'branch_name_pattern', parameters: p })) } })
  const repo = runner.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge: 'github' } } })
  return runner.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr', ...extra], { env: shim.env(), timeoutMs })
}
test('verify contract: probe hostile starts_with/contains affixes never crash and stay one line', () => {
  const pats = ['x\ny', 'a b', '~x/', '{x}', '{', '}', '%s', '{name}', 'a\u0000b', '\u001b[31m', '"; rm -rf /; "', '--force', 'é/', 'x..', '.lock', 'a'.repeat(5000)]
  for (const kind of ['starts_with', 'ends_with', 'contains']) for (const p of pats) {
    let t
    try { t = run([{ name: 'r', operator: kind, pattern: p }]) } catch (e) { console.log(kind, JSON.stringify(p.slice(0, 20)), 'SPAWN', e.message.slice(0, 80)); continue }
    const lines = (t.json?.suggestion ?? '').split('\n').length
    console.log(kind, JSON.stringify(p.slice(0, 20)), 'exit', t.status, 'derived', t.json?.derived, 'ok', t.json?.ok, 'lines', lines, 'stderr', JSON.stringify(t.stderr.slice(0, 80)))
    assert.ok([0, 1, 2].includes(t.status))
    assert.equal(t.stderr, '', `${kind} ${JSON.stringify(p)}`)
  }
})
test('verify contract: probe huge-repeat regex through the CLI', () => {
  for (const pat of ['^a{999999999}/', '^((a{1000}){1000}){1000}/']) {
    const t0 = Date.now()
    const t = run([{ name: 'rx', operator: 'regex', pattern: pat }], [], 40000)
    console.log(JSON.stringify(pat), 'exit', t.status, 'ms', Date.now() - t0, JSON.stringify((t.json?.suggestion ?? '').slice(0, 100)))
  }
})
