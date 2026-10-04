import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync, statSync } from 'node:fs'
import { createServer } from 'node:net'
import vm from 'node:vm'
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
  assert.equal(html.match(/<\/script>/g).length, 3, 'a </script> inside the data must not close the tag early')
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

// a Workflow run folder as Claude Code writes it: a journal plus one transcript per agent
function runFolder(root, name, agents) {
  const dir = join(root, 'workflows', name)
  mkdirSync(dir, { recursive: true })
  const lines = [{ type: 'launched' }]
  for (const a of agents) {
    lines.push({ type: 'started', agentId: a.id, label: a.label, phase: a.phase })
    if (a.end) lines.push({ type: a.end, agentId: a.id })
    const t = [{ type: 'user', timestamp: a.from, message: { role: 'user' } }]
    if (a.to) t.push({ type: 'assistant', timestamp: a.to, message: { model: 'model-x', usage: { input_tokens: 400, output_tokens: 100, cache_read_input_tokens: 44000, cache_creation_input_tokens: 406 } } })
    if (!a.noTranscript) writeFileSync(join(dir, `agent-${a.id}.jsonl`), t.map(e => JSON.stringify(e)).join('\n') + '\n')
  }
  writeFileSync(join(dir, 'journal.jsonl'), lines.map(e => JSON.stringify(e)).join('\n') + '\nnot json\n')
  return join(dir, 'journal.jsonl')
}

test('collector adds the workflow view: phases, agents with status, model, tokens and time, and earlier runs', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const old = runFolder(repo, 'wf_old', [
    { id: 'o1', label: 'state-reader', phase: 'Read state', end: 'result', from: '2026-01-12T08:00:00Z', to: '2026-01-12T08:01:00Z' },
    { id: 'o2', label: 'planner:S-001', phase: 'Plan', from: '2026-01-12T08:01:00Z', to: '2026-01-12T08:03:00Z' },
  ])
  runFolder(repo, 'wf_other', [{ id: 'x1', label: 'something', phase: 'Not ours', end: 'result', from: '2026-01-12T07:00:00Z', to: '2026-01-12T07:01:00Z' }])
  const past = new Date('2026-01-12T08:03:00Z')
  utimesSync(old, past, past)
  const journal = runFolder(repo, 'wf_new', [
    { id: 'a1', label: 'state-reader', phase: 'Read state', end: 'result', from: '2026-01-12T09:00:00Z', to: '2026-01-12T09:00:30Z' },
    { id: 'a2', label: 'reviewer:S-002a:security', phase: 'Review', end: 'result', from: '2026-01-12T09:01:00Z', to: '2026-01-12T09:02:32Z' },
    { id: 'a3', label: 'reviewer:S-002a:architecture', phase: 'Review', end: 'failed', from: '2026-01-12T09:01:00Z', to: '2026-01-12T09:01:10Z' },
    { id: 'a4', label: 'reviewer:S-002a:test-quality', phase: 'Review', from: '2026-01-12T09:01:00Z' },
    { id: 'a5', label: 'reviewer:S-002a:architecture', phase: 'Review', from: '2026-01-12T09:01:20Z', noTranscript: true },
  ])
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal])
  const out = join(repo, '.sdlc', 'tracker')
  const wf = JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).workflow
  assert.equal(wf.name, 'sdlc-loop')
  assert.deepEqual(wf.phases.slice(0, 3), ['Read state', 'Bootstrap', 'Plan'])
  assert.equal(wf.phases.length, 15)
  assert.equal(wf.run.id, 'wf_new')
  assert.equal(wf.run.live, true)
  assert.equal(wf.run.startedAt, '2026-01-12T09:00:00Z')
  assert.deepEqual(wf.run.agents.map(a => a.status), ['done', 'done', 'failed', 'running', 'running'])
  const sec = wf.run.agents[1]
  assert.deepEqual([sec.label, sec.phase, sec.model, sec.tokens, sec.seconds], ['reviewer:S-002a:security', 'Review', 'model-x', 44906, 92])
  assert.equal(wf.run.agents[4].tokens, 0)
  // the earlier run of this loop is summarised; its unfinished agent was cut off; another workflow's run is left out
  assert.deepEqual(wf.earlier.map(r => [r.id, r.agents, r.done, r.stopped]), [['wf_old', 2, 1, 1]])
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /workflowCard/)
})

test('collector leaves the workflow view out when the run folder cannot be read', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', join(repo, 'missing', 'journal.jsonl')])
  assert.equal(JSON.parse(readFileSync(join(repo, '.sdlc', 'tracker', 'status.json'), 'utf8')).workflow, null)
})

test('a watcher keeps rebuilding until --stop-watch, and a newer watcher replaces it', { skip: !python && 'python3 not installed' }, async () => {
  const repo = fixtureRepo()
  const journal = runFolder(repo, 'wf_new', [{ id: 'a1', label: 'state-reader', phase: 'Read state', from: '2026-01-12T09:00:00Z' }])
  const out = join(repo, '.sdlc', 'tracker')
  const pid = join(out, 'watch.pid')
  const exited = p => new Promise(res => p.on('exit', res))
  const until = async cond => { for (let i = 0; i < 100 && !cond(); i++) await new Promise(r => setTimeout(r, 100)) }
  const first = spawn('python3', [COLLECT, '--repo', repo, '--journal', journal, '--watch', '1'], { stdio: 'ignore' })
  const firstDone = exited(first)
  await until(() => existsSync(join(out, 'status.json')) && existsSync(pid))
  assert.equal(readFileSync(pid, 'utf8'), String(first.pid))
  const second = spawn('python3', [COLLECT, '--repo', repo, '--journal', journal, '--watch', '1'], { stdio: 'ignore' })
  const secondDone = exited(second)
  await firstDone
  assert.equal(readFileSync(pid, 'utf8'), String(second.pid))
  const before = JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).updatedAt
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal, '--stop-watch'])
  await secondDone
  assert.equal(existsSync(pid), false)
  assert.ok(JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).updatedAt >= before)
})

// runs a live.js file the way the page does, and returns the payloads it passed to SDLC_LIVE
function loadLive(path) {
  const got = []
  vm.runInNewContext(readFileSync(path, 'utf8'), { window: { SDLC_LIVE: p => got.push(JSON.parse(JSON.stringify(p))) } })
  return got
}

test('a build writes live.js with the same workflow block the page embeds, safe inside a script tag', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const journal = runFolder(repo, 'wf_new', [
    { id: 'a1', label: 'state-reader', phase: 'Read state', end: 'result', from: '2026-01-12T09:00:00Z', to: '2026-01-12T09:00:30Z' },
    { id: 'a2', label: 'odd</script>\u2028label', phase: 'Plan', from: '2026-01-12T09:01:00Z' },
  ])
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal])
  const out = join(repo, '.sdlc', 'tracker')
  const text = readFileSync(join(out, 'live.js'), 'utf8')
  assert.ok(!text.includes('</script>'))
  const got = loadLive(join(out, 'live.js'))
  assert.equal(got.length, 1)
  assert.match(got[0].builtAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
  assert.deepEqual(got[0].workflow, JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).workflow)
  assert.equal(got[0].workflow.run.agents[1].label, 'odd</script>\u2028label')
})

test('a poke rebuilds live.js within a second or two without rebuilding the page, and live.js refreshes on its own every 5 s', { skip: !python && 'python3 not installed' }, async () => {
  const repo = fixtureRepo()
  const journal = runFolder(repo, 'wf_new', [{ id: 'a1', label: 'state-reader', phase: 'Read state', from: '2026-01-12T09:00:00Z' }])
  const out = join(repo, '.sdlc', 'tracker')
  const live = join(out, 'live.js')
  const builtAt = () => existsSync(live) ? loadLive(live)[0].builtAt : ''
  const until = async (cond, ms) => { const end = Date.now() + ms; while (!cond() && Date.now() < end) await new Promise(r => setTimeout(r, 50)); return cond() }
  const w = spawn('python3', [COLLECT, '--repo', repo, '--journal', journal, '--watch', '60'], { stdio: 'ignore' })
  const done = new Promise(res => w.on('exit', res))
  try {
    assert.ok(await until(() => builtAt() !== '' && existsSync(join(out, 'index.html')), 10000))
    const page = statSync(join(out, 'index.html')).mtimeMs
    const first = builtAt()
    writeFileSync(join(out, 'poke'), '')
    const poked = Date.now()
    assert.ok(await until(() => builtAt() !== first, 2500), 'live.js rebuilt after a poke')
    assert.ok(Date.now() - poked < 2500)
    assert.equal(statSync(join(out, 'index.html')).mtimeMs, page, 'a poke does not rebuild the page')
    const second = builtAt()
    assert.ok(await until(() => builtAt() !== second, 6500), 'live.js rebuilt by the 5 s fallback')
  } finally {
    execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal, '--stop-watch'])
    await done
  }
})

// the template's live decision block, run on its own: it must not touch the DOM
function createLive() {
  const src = readFileSync(join(SKILL_DIR, 'tracker', 'template.html'), 'utf8')
  const m = src.match(/\/\* live:begin \*\/([\s\S]*?)\/\* live:end \*\//)
  assert.ok(m, 'template has a live:begin … live:end block')
  const ctx = {}
  vm.runInNewContext(m[1], ctx)
  return ctx.SDLC_createLive
}

test('the page redraws the workflow card only for a newer live payload, and flags a live run gone quiet', () => {
  let now = Date.parse('2026-01-12T09:00:10Z')
  const draws = []
  const live = createLive()({ now: () => now, redraw: (wf, paused) => draws.push([wf.run.id, paused]) })
  const wf = id => ({ run: { id, live: true, agents: [] } })
  assert.equal(live.tick(), false, 'nothing to flag before the first payload')
  for (const bad of [null, {}, { builtAt: 'soon' }, { builtAt: 7 }]) assert.equal(live.apply(bad), false)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: wf('r1') }), true)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: wf('r2') }), false)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:01.000Z', workflow: wf('r3') }), false)
  assert.deepEqual(draws, [['r1', false]])
  assert.equal(live.tick(), false)
  now += 31000
  assert.equal(live.tick(), true, 'the watcher went quiet')
  assert.equal(live.tick(), false, 'flagged once')
  assert.deepEqual(draws.at(-1), ['r1', true])
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:45.000Z', workflow: wf('r1') }), true)
  assert.deepEqual(draws.at(-1), ['r1', false])
})

test('the page keeps its last card for an empty live payload, and never flags a finished run', () => {
  let now = Date.parse('2026-01-12T09:00:10Z')
  const draws = []
  const live = createLive()({ now: () => now, redraw: (wf, paused) => draws.push([wf.run.id, paused]) })
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: null }), false)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:06.000Z', workflow: { run: { id: 'r1', live: false, agents: [] } } }), true)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:07.000Z', workflow: null }), false)
  now += 10 * 60 * 1000
  assert.equal(live.tick(), false)
  assert.deepEqual(draws, [['r1', false]])
})

test('the page redraws again only when the workflow data changed, not for a payload that differs in builtAt alone', () => {
  const now = Date.parse('2026-01-12T09:00:10Z')
  const draws = []
  const live = createLive()({ now: () => now, redraw: (wf, paused) => draws.push([wf.run.id, paused]) })
  const wf = (id, n = 0) => ({ run: { id, live: true, agents: Array.from({ length: n }, (_, i) => ({ id: 'a' + i })) } })
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:01.000Z', workflow: wf('r1') }), true)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:02.000Z', workflow: wf('r1') }), false, 'same data, newer builtAt')
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:03.000Z', workflow: wf('r1') }), false)
  assert.equal(draws.length, 1)
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:04.000Z', workflow: wf('r1', 1) }), true, 'a new agent')
  assert.equal(draws.length, 2)
})

test('a payload with unchanged data still resets the paused clock, with exactly one redraw', () => {
  let now = Date.parse('2026-01-12T09:00:10Z')
  const draws = []
  const live = createLive()({ now: () => now, redraw: (wf, paused) => draws.push(paused) })
  const wf = () => ({ run: { id: 'r1', live: true, agents: [] } })
  live.apply({ builtAt: '2026-01-12T09:00:05.000Z', workflow: wf() })
  now += 31000
  assert.equal(live.tick(), true)
  assert.deepEqual(draws, [false, true])
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:40.000Z', workflow: wf() }), true)
  assert.deepEqual(draws, [false, true, false])
  now += 20000
  assert.equal(live.tick(), false, 'the newer builtAt counts: not paused 20 s later')
  assert.equal(live.apply({ builtAt: '2026-01-12T09:00:55.000Z', workflow: wf() }), false)
  assert.equal(draws.length, 3)
})

test('--stop-watch marks the run as not running in status.json and live.js, and fixes its end time', { skip: !python && 'python3 not installed' }, () => {
  const repo = fixtureRepo()
  const journal = runFolder(repo, 'wf_new', [
    { id: 'a1', label: 'state-reader', phase: 'Read state', end: 'result', from: '2026-01-12T09:00:00Z', to: '2026-01-12T09:00:30Z' },
  ])
  execFileSync('python3', [COLLECT, '--repo', repo, '--journal', journal, '--stop-watch'])
  const out = join(repo, '.sdlc', 'tracker')
  const run = JSON.parse(readFileSync(join(out, 'status.json'), 'utf8')).workflow.run
  const liveRun = loadLive(join(out, 'live.js'))[0].workflow.run
  assert.equal(run.live, false)
  assert.equal(liveRun.live, false)
  assert.equal(liveRun.endedAt, '2026-01-12T09:00:30+00:00')
})

test('an agent cut off in an earlier run is read once, not on every rebuild', { skip: !python && 'python3 not installed' }, () => {
  const code = `
import sys, os, tempfile, json
sys.path.insert(0, ${JSON.stringify(join(SKILL_DIR, 'tracker'))})
import workflow
d = tempfile.mkdtemp()
with open(os.path.join(d, 'journal.jsonl'), 'w') as f:
    f.write(json.dumps({'type': 'started', 'agentId': 'x', 'label': 'l', 'phase': 'Plan'}) + '\\n')
with open(os.path.join(d, 'agent-x.jsonl'), 'w') as f:
    f.write(json.dumps({'type': 'user', 'timestamp': '2026-01-12T08:00:00Z', 'message': {}}) + '\\n')
c = {}
workflow.read_run(os.path.join(d, 'journal.jsonl'), False, c)
print(len(c))
os.remove(os.path.join(d, 'agent-x.jsonl'))
a = workflow.read_run(os.path.join(d, 'journal.jsonl'), False, c)['agents'][0]
print(a['status'], a['startedAt'])
c2 = {}
workflow.read_run(os.path.join(d, 'journal.jsonl'), True, c2)
print(len(c2))
`
  assert.equal(execFileSync('python3', ['-c', code], { encoding: 'utf8' }), '1\nstopped 2026-01-12T08:00:00Z\n0\n')
})

// the port the server takes when the one asked for is free, and a blocker to hold one
const freePort = () => new Promise(res => {
  const s = createServer()
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
})
const exited = p => new Promise(res => p.on('exit', res))
const until = async (cond, ms = 10000) => { const end = Date.now() + ms; while (!cond() && Date.now() < end) await new Promise(r => setTimeout(r, 50)); return cond() }
// the first build also collects the machine readings, which on macOS reads the whole power log and can
// take up to the 20 s collect.py allows it, so the first url gets room the rest of the waits do not need
const FIRST_BUILD_MS = 45000

// the workflow card's own scroll box, and the page's behaviour around it
// ---- a DOM small enough to run the page's own script ---------------------------------------
// enough of the element interface for render() and for the live redraw, and nothing more
function fakeDom() {
  const RealDate = Date
  const clock = { t: RealDate.parse('2026-01-12T10:00:00Z') }
  const kept = new Map()
  const sessionStorage = {
    getItem: k => (kept.has(k) ? kept.get(k) : null),
    setItem: (k, v) => kept.set(k, String(v)),
    removeItem: k => kept.delete(k),
  }
  const doc = { activeElement: null, title: '', focusCalls: [], ids: {} }

  class E {
    constructor(tag) {
      this.tagName = tag; this.className = ''; this.dataset = {}; this.style = {}; this.attrs = {}; this.on = {};
      this.children = []; this.parentNode = null; this._text = '';
      this.title = ''; this.type = ''; this.hidden = false; this.open = false; this.scrollTop = 0;
    }
    get lastChild() { return this.children[this.children.length - 1] || null }
    set textContent(v) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = String(v) }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join('') }
    setAttribute(k, v) { this.attrs[k] = String(v) }
    append(...nodes) {
      for (const n of nodes) {
        const c = typeof n === 'string' ? doc.createTextNode(n) : n;
        if (c.parentNode) c.remove();
        c.parentNode = this; this.children.push(c);
      }
    }
    replaceChildren(...nodes) { for (const c of this.children) c.parentNode = null; this.children = []; this.append(...nodes) }
    remove() {
      const p = this.parentNode; if (!p) return;
      const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1);
      this.parentNode = null;
    }
    addEventListener(type, fn) { (this.on[type] || (this.on[type] = [])).push(fn) }
    click() { for (const fn of this.on.click || []) fn({ target: this }) }
    focus(opts) { doc.activeElement = this; doc.focusCalls.push({ node: this, opts }) }
    contains(n) { for (let p = n; p; p = p.parentNode) if (p === this) return true; return false }
    querySelectorAll(sel) {
      const out = [];
      (function walk(n) { for (const c of n.children) { if (matches(c, sel)) out.push(c); walk(c) } })(this);
      return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
  }
  // enough selector support for what the page asks for: tags, classes, [data-*], descendants
  function matches(node, sel) {
    const parts = sel.trim().split(/\s+/);
    if (!compound(node, parts[parts.length - 1])) return false;
    for (let i = parts.length - 2, n = node; i >= 0; i--) {
      for (n = n.parentNode; n && !compound(n, parts[i]); n = n.parentNode) { /* try the ancestor */ }
      if (!n) return false;
    }
    return true;
  }
  function compound(node, part) {
    const tag = part.match(/^[a-zA-Z][\w-]*/);
    if (tag && node.tagName !== tag[0]) return false;
    const have = node.className ? node.className.split(/\s+/) : [];
    for (const c of part.match(/\.[\w-]+/g) || []) if (!have.includes(c.slice(1))) return false;
    for (const a of part.match(/\[[^\]]+\]/g) || []) {
      const m = a.slice(1, -1).match(/^([\w-]+)(?:=["']?([^"'\]]*)["']?)?$/);
      const v = node.dataset[m[1].replace(/^data-/, '')];
      if (v === undefined) return false;
      if (m[2] !== undefined && v !== m[2]) return false;
    }
    return true;
  }

  doc.createElement = tag => new E(tag)
  doc.createElementNS = (ns, tag) => new E(tag)
  doc.createTextNode = t => { const n = new E('#text'); n.textContent = t; return n }
  doc.documentElement = new E('html')
  doc.body = new E('body')
  doc.documentElement.append(doc.body)
  doc.querySelector = sel => sel[0] === '#' ? (doc.ids[sel.slice(1)] || null) : doc.documentElement.querySelector(sel)
  doc.querySelectorAll = sel => doc.documentElement.querySelectorAll(sel)
  // the skeleton the template ships with
  const wrap = doc.createElement('div'); wrap.className = 'wrap';
  const head = doc.createElement('header');
  const h1 = doc.createElement('h1'); h1.textContent = 'SDLC Build Tracker';
  const fresh = doc.createElement('div'); fresh.className = 'fresh';
  const app = doc.createElement('div');
  head.append(h1, fresh); wrap.append(head, app); doc.body.append(wrap);
  doc.ids = { title: h1, fresh, app };

  class FauxDate extends RealDate { static now() { return clock.t } }
  return { document: doc, sessionStorage, FauxDate, clock }
}

// the page's own scripts, on that DOM: the live block and the page, as the browser runs them
function loadPage(status) {
  const src = readFileSync(join(SKILL_DIR, 'tracker', 'template.html'), 'utf8')
  const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  assert.equal(scripts.length, 3, 'the template has its three script blocks')
  const dom = fakeDom()
  let poll = null, built = 0
  const win = { SDLC_STATUS: status, addEventListener() {}, scrollTo() {}, scrollY: 0 }
  vm.runInNewContext(scripts[1] + '\n' + scripts[2], {
    window: win, document: dom.document, sessionStorage: dom.sessionStorage,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    setInterval: (fn) => { poll = fn; return 0 },
    Date: dom.FauxDate, console,
  })
  const app = dom.document.querySelector('#app')
  assert.doesNotMatch(app.textContent, /Couldn't draw the status/, 'the page drew itself on the test DOM')
  return {
    document: dom.document, clock: dom.clock,
    poll: () => poll(),                       // the 2 s poll the page sets going
    live: (p) => win.SDLC_LIVE(p),            // what live.js does when the watcher rebuilds it
    // a payload the watcher just rebuilt: newer than the last, and as fresh as the clock allows
    next: (workflow) => ({ builtAt: new Date(dom.clock.t + ++built).toISOString(), workflow }),
  }
}

const agent = (id, label, phase, status, extra = {}) => Object.assign({ id, label, phase, status, tokens: 1000, seconds: 60 }, extra)
function runFixture(agents) {
  return {
    name: 'sdlc-loop', description: 'Autonomous slice loop', earlier: [],
    phases: ['Read state', 'Plan', 'Implement', 'Review'],
    run: { id: 'wf_new', live: true, startedAt: '2026-01-12T09:00:00Z', agents },
  }
}
// a long run: 14 finished agents in one phase, and the loop working in the last one
const longRun = () => runFixture([
  ...Array.from({ length: 14 }, (_, i) => agent('i' + i, 'implementer:S-00' + i, 'Implement', 'done')),
  agent('p1', 'planner:S-003', 'Plan', 'done'),
  agent('r1', 'reviewer:S-003:security', 'Review', 'running', { startedAt: '2026-01-12T09:55:00Z', seconds: 0 }),
])
const trackerStatus = (workflow) => ({
  title: 'Bookmarks', updatedAt: '2026-01-12T10:00:00Z', startedAt: '2026-01-12T07:00:00Z',
  requirements: { done: 1, total: 3, parked: 1 }, slices: [], milestones: [], recent: [], workflow,
})

test('the workflow card is drawn into a bounded scroll box that a redraw does not replace', () => {
  const wf = longRun()
  const page = loadPage(trackerStatus(wf))
  const box = page.document.querySelector('.wf-scroll')
  assert.ok(box, 'the card is drawn into a scroll box of its own')
  const card = box.querySelector('.wf')
  assert.ok(card, 'and the card is inside it')
  assert.equal(card.querySelector('.wf-scroll'), null, 'the box wraps the card, not the other way round')
  assert.equal(card.contains(box), false)
  assert.equal(box.querySelectorAll('.wf-agent').length, 1, 'the phase the loop is in is the one on show')
  // the person has read a way down the list; a redraw must not take them back to the top
  box.scrollTop = 120
  const more = longRun()
  more.run.agents.push(agent('r2', 'reviewer:S-003:architecture', 'Review', 'running', { startedAt: '2026-01-12T09:56:00Z', seconds: 0 }))
  page.live(page.next(more))
  const after = page.document.querySelector('.wf-scroll')
  assert.equal(page.document.querySelectorAll('.wf-scroll').length, 1, 'there is still exactly one box')
  assert.equal(after, box, 'and it is the same node, not one the redraw built')
  assert.notEqual(after.querySelector('.wf'), card, 'the card inside it really was replaced')
  assert.equal(after.scrollTop, 120, 'so the box kept where the person had scrolled to')
  assert.equal(after.querySelectorAll('.wf-agent').length, 2, 'and the new agent is in it')
})

test('picking a phase and following the live phase bring that phase into view', () => {
  const page = loadPage(trackerStatus(longRun()))
  const box = page.document.querySelector('.wf-scroll')
  const heading = () => box.querySelector('.wf-agents h3').textContent
  const phase = (n) => box.querySelectorAll('.wf-phase').find((b) => b.dataset.phase === n)
  assert.match(heading(), /^Review /, 'a fresh page follows the phase the loop is in')
  phase('Implement').click()
  assert.match(heading(), /^Implement /, 'the picked phase is the one the box shows')
  assert.equal(box.scrollTop, 0, 'shown from the top')
  assert.equal(phase('Implement').className, 'wf-phase sel')
  const follow = box.querySelectorAll('button').find((b) => b.dataset.follow)
  assert.ok(follow, 'the follow control appears once a phase is pinned away from the live one')
  assert.equal(follow.textContent, 'Follow the live phase')
  box.scrollTop = 90
  follow.click()
  assert.match(heading(), /^Review /, 'back to the phase the loop is in')
  assert.equal(page.document.querySelector('.wf-scroll').scrollTop, 0, 'and it comes into view from the top of the box')
  assert.equal(box.querySelectorAll('button').some((b) => b.dataset.follow), false, 'nothing left to follow')
  // and the pin is forgotten, so a redraw keeps following
  page.live(page.next(longRun()))
  assert.match(heading(), /^Review /)
})

test("the running agents' clocks still tick between redraws, inside the box", () => {
  const wf = longRun()
  const page = loadPage(trackerStatus(wf))
  const box = page.document.querySelector('.wf-scroll')
  const running = () => box.querySelector('.wf-agent.running[data-start]')
  const time = () => running().querySelector('.time').textContent
  assert.equal(time(), '5m00s', 'the running agent shows how long it has been going')
  page.clock.t += 60 * 1000
  page.poll()
  assert.equal(time(), '6m00s', 'and keeps counting between redraws')
  box.scrollTop = 30
  page.live(page.next(wf))
  assert.equal(time(), '6m00s', 'a redraw does not lose the running agent')
  assert.equal(page.document.querySelector('.wf-scroll').scrollTop, 30, 'nor the place in the list')
})

test('a redraw puts the focus back on the same control without moving the page or the list', () => {
  const page = loadPage(trackerStatus(longRun()))
  const box = page.document.querySelector('.wf-scroll')
  const phase = (n) => box.querySelectorAll('.wf-phase').find((b) => b.dataset.phase === n)
  phase('Plan').focus() // the person is on this button when the watcher rebuilds the card
  page.document.focusCalls.length = 0
  box.scrollTop = 64
  page.live(page.next(longRun()))
  const last = page.document.focusCalls.at(-1)
  assert.ok(last, 'the focus was put back')
  assert.equal(last.node.dataset.phase, 'Plan', 'on the same phase button')
  assert.equal(last.opts && last.opts.preventScroll, true, 'without scrolling the page or the box to do it')
  assert.equal(page.document.querySelector('.wf-scroll').scrollTop, 64, 'and without disturbing the list')
})

// the source side: the cap, and where the box is built
function cssRule(src, selector) {
  const style = src.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of style.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(',').map((s) => s.trim()).includes(selector)) return m[2];
  }
  return null;
}
function jsFunction(src, name) {
  const start = src.indexOf('function ' + name + '(')
  assert.ok(start > 0, name + ' is defined')
  const end = src.indexOf('\n  function ', start)
  return src.slice(start, end < 0 ? src.length : end)
}

test('the agents, milestones and pace chart are plain open regions, so a reload never folds them shut', () => {
  const st = trackerStatus(longRun())
  st.slices = [
    { id: 'S-001', title: 'Scaffold', status: 'done', doneAt: '2026-01-12T08:00:00Z' },
    { id: 'S-002', title: 'Store', status: 'in_progress' },
    { id: 'S-003', title: 'List', status: 'todo' },
    { id: 'S-004', title: 'Search', status: 'parked' },
  ]
  st.milestones = [{ id: 'M1', title: 'Bookmarks you can keep', demo: 'save and list', slices: ['S-001', 'S-002', 'S-003', 'S-004'] }]
  const page = loadPage(st)
  const app = page.document.querySelector('#app')
  assert.equal(app.querySelector('details'), null, 'nothing on the page is a fold')
  assert.doesNotMatch(app.textContent, /\b(Show|Hide)\b(?! all| fewer)/, 'and no region carries a Show/Hide toggle')
  const titles = app.querySelectorAll('.panel h2').map((h) => h.textContent)
  assert.deepEqual(titles, ['Agents in this run', 'Slices finished over time', 'Milestones'])
  // the chart sits in the three-column section, as a full-width row under the three cards
  const grid = app.querySelector('.grid3')
  assert.equal(grid.querySelector('.wide h2').textContent, 'Slices finished over time')
  assert.equal(grid.children.filter((c) => c.className === 'card').length, 3)
  // each milestone draws one cell per slice, coloured by status, with the count and the finish window
  const row = app.querySelector('.ms-row')
  assert.deepEqual(row.querySelectorAll('.mini i').map((i) => i.className), ['done', 'in_progress', 'todo', 'parked'])
  assert.equal(row.querySelector('.cnt').textContent, '1/4 done · 1 parked')
  assert.ok(row.querySelector('.ms-eta b').textContent, 'the likely finish is the bold line')
  assert.match(row.querySelector('.ms-eta span').textContent, / – /, 'with the range under it')
})

test('the scroll box is capped and scrolls, and only the slot ever builds it', () => {
  const src = readFileSync(join(SKILL_DIR, 'tracker', 'template.html'), 'utf8')
  const rule = cssRule(src, '.wf-scroll')
  assert.ok(rule, '.wf-scroll has a rule of its own')
  assert.match(rule, /max-height:\s*(?:min\([^)]*\)|\d+(?:\.\d+)?(?:px|vh|rem|em|%))/, 'the box has a maximum height')
  assert.doesNotMatch(rule, /(?:^|;)\s*height:/, 'a cap, not a fixed height, so a short run is not padded out')
  assert.match(rule, /overflow-y:\s*auto|overflow:\s*(?:hidden\s+)?auto/, 'and the box scrolls on its own')
  // at the narrow breakpoint the columns stack: the card gets taller, so the same cap bounds it
  const narrow = src.match(/@media \(max-width: 720px\) \{\n([\s\S]*?)\n\}/)
  assert.ok(narrow, 'the 720px breakpoint is still there')
  assert.doesNotMatch(narrow[1], /\.wf-scroll/, 'and the cap is unchanged when they stack')
  // the card a redraw replaces never carries the box; the slot builds it once, and it is the box
  // itself that a redraw empties
  assert.doesNotMatch(jsFunction(src, 'workflowCard'), /wf-scroll/, 'the redrawn card does not build the box')
  assert.match(jsFunction(src, 'drawWorkflow'), /wfScroll\.replaceChildren\(/, 'the box is the node a redraw empties')
  assert.match(jsFunction(src, 'render'), /wfScroll = el\("div", "wf-scroll"\)/, 'the slot builds the box once')
})

// --serve implies --watch, so a served tracker keeps rebuilding until the watcher stops
async function serving(args) {
  const repo = fixtureRepo()
  const out = join(repo, '.sdlc', 'tracker')
  const s = spawn('python3', [COLLECT, '--repo', repo, ...args], { stdio: 'ignore' })
  const done = exited(s)
  const stop = async () => {
    try { execFileSync('python3', [COLLECT, '--repo', repo, '--stop-watch'], { stdio: 'ignore' }) } catch {}
    await done
  }
  return { repo, out, urlFile: join(out, 'url'), stop }
}

test('--serve publishes a url for the page, and takes the next free port when that one is taken', { skip: !python && 'python3 not installed' }, async () => {
  const port = await freePort()
  const first = await serving(['--serve', String(port)])
  try {
    assert.ok(await until(() => existsSync(first.urlFile), FIRST_BUILD_MS), 'published a url')
    // the url appears only once there is a page behind it, so opening it never lands on a blank page
    assert.ok(existsSync(join(first.out, 'index.html')), 'the page was built before the url was published')
    assert.equal(readFileSync(first.urlFile, 'utf8').trim(), `http://localhost:${port}/`)
    const res = await fetch(`http://localhost:${port}/index.html`)
    assert.equal(res.status, 200)
    assert.match(await res.text(), /SDLC_STATUS/)
    // the live view and the report pages are served from the same root
    assert.equal((await fetch(`http://localhost:${port}/live.js`)).status, 200)
    assert.equal((await fetch(`http://localhost:${port}/reports/index.html`)).status, 200)
  } finally {
    await first.stop()
  }
  assert.equal(existsSync(first.urlFile), false, 'the url is withdrawn when the watcher stops')

  // another process holding the port, the way a second tracker or an unrelated tool would
  const ready = join(tmpdir(), `sdlc-serve-blocked-${port}`)
  const blocker = spawn('python3', ['-c', `
import socket, time
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("127.0.0.1", ${port}))
s.listen(1)
open(${JSON.stringify(ready)}, "w").close()
time.sleep(60)
`], { stdio: 'ignore' })
  const blockerDone = exited(blocker)
  assert.ok(await until(() => existsSync(ready), 5000), 'the blocker holds the port')
  const second = await serving(['--serve', String(port)])
  try {
    assert.ok(await until(() => existsSync(second.urlFile), FIRST_BUILD_MS), 'published a url on another port')
    const url = readFileSync(second.urlFile, 'utf8').trim()
    assert.notEqual(url, `http://localhost:${port}/`, 'a busy port is not an error')
    assert.ok(Number(new URL(url).port) > port, 'moved forward to the next port')
    assert.equal((await fetch(`${url}index.html`)).status, 200)
  } finally {
    await second.stop()
    blocker.kill()
    await blockerDone
  }
})
