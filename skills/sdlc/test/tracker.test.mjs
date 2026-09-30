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

test('verifier test reports render as pages with the referenced test source', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const s = join(repo, '.sdlc', 'slices')
  mkdirSync(join(s, 'S-001', 'reports', 'logs'), { recursive: true })
  mkdirSync(join(s, 'S-002a'), { recursive: true })
  mkdirSync(join(repo, 'src'))
  writeFileSync(join(repo, 'src', 'add.test.ts'), "import { add } from './add'\n\ntest('adds <b>', () => {\n  expect(add(1, 2)).toBe(3)\n})\n\ntest('next', () => {})\n")
  writeFileSync(join(s, 'S-001', 'verify-behavior-r0.md'), '# short\nVerdict: NOT refuted\n')
  writeFileSync(join(s, 'S-001', 'reports', 'logs', 'verify-behavior-r0-1.log'), 'full output\n')
  writeFileSync(join(s, 'S-001', 'reports', 'verify-behavior-r0.md'), [
    '# S-001 verify — behavior — r0', 'Verdict: HELD', '',
    '| TC | Requirement | Steps | Expected | Actual | Result | Test source |', '|---|---|---|---|---|---|---|',
    '| TC-1 | R-1 | add 1 and 2 | 3 | 3 | PASS | `src/add.test.ts:3` |', '',
    '### Step 1', '```sh', 'npx vitest run src/add.test.ts', '```', 'Full output: [log](logs/verify-behavior-r0-1.log)', '',
    'Escape [out](../../../../../etc/passwd) and [js](javascript:alert(1)) and <script>x</script>',
  ].join('\n'))
  writeFileSync(join(s, 'S-002a', 'verify-regression-r1.md'), 'Verdict: **REFUTED**\nRan `src/add.test.ts`.\n')
  execFileSync('python3', [COLLECT, '--repo', repo])
  const out = join(repo, '.sdlc', 'tracker')
  const data = JSON.parse(readFileSync(join(out, 'status.json'), 'utf8'))
  assert.deepEqual(data.reports.map(r => [r.id, r.reports, r.full]), [['S-001', 1, 1], ['S-002a', 1, 0]])
  assert.deepEqual(data.reports[0].lenses, { behavior: { round: 0, verdict: 'held' } })
  assert.equal(data.reports[1].lenses.regression.verdict, 'refuted')
  const page = readFileSync(join(out, 'reports', 'S-001.html'), 'utf8')
  // the full report wins over the short summary, and the test at line 3 is shown up to its closing line
  assert.doesNotMatch(page, /# short/)
  assert.match(page, /Test source: <code>src\/add\.test\.ts:3<\/code>/)
  assert.match(page, /adds &lt;b&gt;/)
  assert.match(page, /toBe\(3\)/)
  assert.doesNotMatch(page, /test\(&#x27;next/)
  assert.match(page, /href="\.\.\/\.\.\/slices\/S-001\/reports\/logs\/verify-behavior-r0-1\.log"/)
  assert.doesNotMatch(page, /etc\/passwd"|javascript:|<script>x/)
  // a bare test file path embeds the whole file
  const summary = readFileSync(join(out, 'reports', 'S-002a.html'), 'utf8')
  assert.match(summary, /Test source: <code>src\/add\.test\.ts<\/code>/)
  assert.match(summary, /test\(&#x27;next/)
  assert.match(readFileSync(join(out, 'reports', 'index.html'), 'utf8'), /href="S-002a\.html"/)
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /Test reports/)
})

test('a slice test report leads the page, with the verification rounds as an appendix and screenshots inline', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const d = join(repo, '.sdlc', 'slices', 'S-001')
  mkdirSync(join(d, 'verification', 'r0', 'assets', 'ui-0'), { recursive: true })
  writeFileSync(join(d, 'verification', 'r0', 'assets', 'ui-0', 'error.png'), 'png')
  writeFileSync(join(d, 'verification', 'plan-r0.md'), '# Plan\n| VS | Title |\n|---|---|\n| VS-1 | submit |\n')
  writeFileSync(join(d, 'verification', 'r0', 'ui-0.md'), '# ui r0\nVerdict: HELD\n![error state](assets/ui-0/error.png)\n')
  writeFileSync(join(d, 'verification', 'r0', 'http-api-1.md'), 'Verdict: REFUTED\n')
  writeFileSync(join(d, 'verify-spec-fidelity-r0.md'), 'Verdict: NOT refuted\n')
  writeFileSync(join(d, 'REPORT.md'), '# S-001 · Scaffold\nVerdict: RELEASED\n\n## Traceability\n| Requirement | Result |\n|---|---|\n| R-1 | pass |\n\n![error state](verification/r0/assets/ui-0/error.png)\n\n<details>\n<summary>Case detail (1 case) <script>x</script></summary>\n\n#### TC-ui-1 · PASS\n- **Given** a form\n\n</details>\n')
  execFileSync('python3', [COLLECT, '--repo', repo])
  const out = join(repo, '.sdlc', 'tracker')
  const r = JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).reports.find(x => x.id === 'S-001')
  assert.equal(r.hasReport, true)
  assert.equal(r.verdict, 'released')
  assert.deepEqual(r.lenses, { 'spec-fidelity': { round: 0, verdict: 'held' }, 'http-api#1': { round: 0, verdict: 'refuted' }, ui: { round: 0, verdict: 'held' } })
  const page = readFileSync(join(out, 'reports', 'S-001.html'), 'utf8')
  assert.ok(page.indexOf('Test completion report') < page.indexOf('Verification rounds'))
  assert.match(page, /<img alt="error state" src="\.\.\/\.\.\/slices\/S-001\/verification\/r0\/assets\/ui-0\/error\.png"/)
  assert.match(page, /verification plan/)
  assert.match(page, /tag released/)
  assert.match(page, /<details class="rec">\s*<summary>Case detail \(1 case\) &lt;script&gt;/)
  assert.match(page, /<h5>TC-ui-1 · PASS<\/h5>[\s\S]*<\/details>/)
})
