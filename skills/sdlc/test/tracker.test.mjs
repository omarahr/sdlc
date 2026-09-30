import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const COLLECT = join(SKILL_DIR, 'tracker', 'collect.py')
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }

function fixtureRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-tracker-'))
  const s = join(repo, '.sdlc')
  mkdirSync(s)
  writeFileSync(join(repo, 'spec.md'), '# Bookmarks </script> Service\n')
  writeFileSync(join(s, 'config.json'), JSON.stringify({ specPath: 'spec.md' }))
  writeFileSync(join(s, 'requirements.json'), JSON.stringify([
    { id: 'R-1', status: 'done', flags: [] }, { id: 'R-2', status: 'todo', flags: [] },
    { id: 'R-3', status: 'parked', flags: [] }, { id: 'R-4', status: 'done', flags: ['obsolete'] },
  ]))
  writeFileSync(join(s, 'slices.json'), JSON.stringify([
    { id: 'S-001', title: 'Scaffold', status: 'done' },
    { id: 'S-002', title: 'Too big', status: 'rejected' },
    { id: 'S-002a', title: 'Half', status: 'in_progress', phase: 'implement' },
  ]))
  writeFileSync(join(s, 'milestones.json'), JSON.stringify([{ id: 'M-1', title: 'API', slices: ['S-001', 'S-002'], status: 'pending', ui: false }]))
  writeFileSync(join(s, 'log.jsonl'), [
    { ts: '2026-01-12T09:00:00Z', type: 'bootstrap', detail: 'ledger' },
    { ts: '2026-01-12T10:00:00Z', type: 'slice-merged', slice: 'S-001', detail: 'Scaffold done' },
  ].map(e => JSON.stringify(e)).join('\n') + '\n')
  writeFileSync(join(s, 'DECISIONS.md'), '# Decisions\n### ADR-1\n### ADR-2\n')
  return repo
}

test('collector turns .sdlc state into a self-contained tracker page', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const journal = join(repo, 'journal.jsonl')
  writeFileSync(journal, '{"type":"started","label":"verifier:S-002a:behavior"}\n{"type":"started","label":"scenario-runner:M-1:api"}\n')
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal, '--run-label', 'Run 1'])
  const out = join(repo, '.sdlc', 'tracker')
  const data = JSON.parse(readFileSync(join(out, 'status.json'), 'utf8'))
  assert.equal(data.title, 'Bookmarks </script> Service')
  assert.deepEqual(data.requirements, { done: 1, total: 3, parked: 1 })
  assert.deepEqual(data.slices.map(s => s.id), ['S-001', 'S-002a'])
  assert.equal(data.slices[0].doneAt, '2026-01-12T10:00:00Z')
  assert.equal(data.current.id, 'S-002a')
  assert.deepEqual(data.activity, { role: 'scenario-runner', target: 'M-1' })
  assert.equal(data.run.agents, 2)
  assert.equal(data.decisions, 2)
  assert.equal(data.milestones[0].status, 'pending')
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  assert.doesNotMatch(html, /__SDLC_STATUS__/)
  assert.equal(html.match(/<\/script>/g).length, 2, 'a </script> inside the data must not close the tag early')
  assert.equal(readFileSync(join(out, '.gitignore'), 'utf8'), '*\n')
})

test('collector refuses a repo without .sdlc', { skip: !python && 'python3 not installed' }, () => {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-tracker-empty-'))
  assert.throws(() => execFileSync('python3', [COLLECT, '--repo', repo], { stdio: 'pipe' }))
  assert.equal(existsSync(join(repo, '.sdlc')), false)
})
