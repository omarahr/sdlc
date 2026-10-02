import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const ROOT = join(SKILL_DIR, '..', '..')
const POKE = join(ROOT, 'hooks', 'live-poke.py')
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }

const run = (input, cwd) => spawnSync('python3', [POKE], { input, cwd, encoding: 'utf8' })

function project({ watching }) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-hook-'))
  const tracker = join(repo, '.sdlc', 'tracker')
  mkdirSync(tracker, { recursive: true })
  mkdirSync(join(repo, 'src', 'deep'), { recursive: true })
  if (watching) writeFileSync(join(tracker, 'watch.pid'), '12345')
  return { repo, poke: join(tracker, 'poke') }
}

test('the hook pokes the watcher of the project it runs in, from any subfolder', opts, () => {
  const { repo, poke } = project({ watching: true })
  const r = run(JSON.stringify({ hook_event_name: 'SubagentStop', cwd: join(repo, 'src', 'deep') }), tmpdir())
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', ''])
  assert.ok(existsSync(poke))
})

test('the hook does nothing when no watcher is running', opts, () => {
  const { repo, poke } = project({ watching: false })
  const r = run(JSON.stringify({ hook_event_name: 'SubagentStart', cwd: repo }), tmpdir())
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', ''])
  assert.equal(existsSync(poke), false)
})

test('the hook exits 0 silently on empty, garbage or odd input', opts, () => {
  const { repo } = project({ watching: true })
  for (const input of ['', 'not json', '[1, 2]', '{"cwd": 5}', '{"cwd": null}']) {
    const r = run(input, join(repo, 'src'))
    assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', ''], `input ${JSON.stringify(input)}`)
  }
})

test('hooks.json registers the poke on agent start and stop, through the plugin root', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8'))
  assert.deepEqual(Object.keys(cfg.hooks).sort(), ['PostToolUse', 'SubagentStart', 'SubagentStop'])
  assert.equal(cfg.hooks.PostToolUse[0].matcher, 'Agent|Task|Workflow')
  for (const groups of Object.values(cfg.hooks)) {
    for (const h of groups.flatMap(g => g.hooks)) {
      assert.equal(h.type, 'command')
      assert.equal(h.command, 'python3 "${CLAUDE_PLUGIN_ROOT}/hooks/live-poke.py"')
      assert.ok(h.timeout <= 5)
    }
  }
  assert.ok(existsSync(POKE))
})
