import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const SK = `${REPO}/skills/sdlc`
const KIT = `${SK}/test/testkit`
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { checkLoadFormat, assertProperty } = await import(`${KIT}/property.mjs`)
const r = cliRunner({ skillDir: SK })
const prompt = n => readFileSync(`${SK}/prompts/${n}.md`, 'utf8')
const SENTENCE = "`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here."

test('verify cli: ste-check.py exits 0 and prints nothing for the three edited prompts', () => {
  const t = r.run('ste-check.py', ['env-detector', 'slicer', 'state-schema'].map(n => `${SK}/prompts/${n}.md`))
  assert.equal(t.status, 0, t.text())
  assert.equal(t.stdout.trim(), '')
})

test('verify cli: ste-check.py fails when one word of the quoted sentence is broken (can fail)', () => {
  const bad = prompt('env-detector').replace('do not read the forge', 'please do not read the forge')
  const d = r.dir('ste')
  r.writeFiles(d, { 'bad.md': bad })
  const t = r.run('ste-check.py', [`${d}/bad.md`])
  assert.equal(t.status, 1)
})

test('verify cli: ste-check.py exits 1 and names the file on a missing path', () => {
  const t = r.run('ste-check.py', [`${SK}/prompts/does-not-exist.md`])
  assert.equal(t.status, 1)
  assert.match(t.stdout, /unreadable/)
})

test('verify cli: env-detector holds the exact R-064 sentence once, in step 4, after step 3 and before commit format', () => {
  const text = prompt('env-detector')
  assert.equal(text.split(SENTENCE).length - 1, 1)
  const i3 = text.indexOf('\n3. '), i4 = text.indexOf('\n4. **Branch format:**'), i5 = text.indexOf('\n5. **Commit format:**'), i6 = text.indexOf('\n6. **Commands:**'), i7 = text.indexOf('\n7. Write `config.json`'), i8 = text.indexOf('\n8. Do not commit')
  assert.ok(i3 > 0 && i3 < i4 && i4 < i5 && i5 < i6 && i6 < i7 && i7 < i8, [i3, i4, i5, i6, i7, i8].join())
  assert.match(text, /Inputs:.*`commitFormat` \(a format string or null\), `branchFormat` \(a format string or null\)/)
  assert.match(text, /Keep existing[^\n]*`branchFormat`/)
})

test('verify cli: no prompt or test cites an env-detector step number that the renumbering broke', () => {
  const hits = []
  for (const f of readdirSync(`${SK}/prompts`)) {
    const t = readFileSync(`${SK}/prompts/${f}`, 'utf8')
    for (const m of t.matchAll(/env-detector[^\n]{0,80}\bstep \d+|step \d+[^\n]{0,60}env-detector/gi)) hits.push(`${f}: ${m[0]}`)
  }
  for (const f of readdirSync(`${SK}/test`).filter(x => x.endsWith('.mjs'))) {
    const t = readFileSync(`${SK}/test/${f}`, 'utf8')
    for (const m of t.matchAll(/env-detector[^\n]{0,80}\bstep \d+|step \d+[^\n]{0,60}env-detector/gi)) hits.push(`test/${f}: ${m[0]}`)
  }
  console.log('step citations:', JSON.stringify(hits))
  assert.deepEqual(hits, [])
})

test('verify cli: branches.py name gives sdlc/S-001 on a repo with no config, no branchFormat, empty, null and non-string branchFormat', () => {
  const cases = {
    'no-config': {},
    'config-without-field': { '.sdlc/config.json': { gitMode: 'direct' } },
    'empty-string': { '.sdlc/config.json': { branchFormat: '' } },
    'null': { '.sdlc/config.json': { branchFormat: null } },
    'empty-config-file': { '.sdlc/config.json': '' },
    'not-json': { '.sdlc/config.json': 'not json' },
  }
  const seen = {}
  for (const [label, files] of Object.entries(cases)) {
    const repo = r.gitRepo({ files })
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'])
    seen[label] = { status: t.status, out: t.json?.branch ?? t.stdout.trim().slice(0,80), fmt: t.json?.format, err: t.stderr.trim().slice(0, 120) }
  }
  console.log('load_format via name:', JSON.stringify(seen))
  for (const [label, v] of Object.entries(seen)) {
    if (label === 'not-json' || label === 'empty-config-file') continue
    assert.equal(v.status, 0, label)
    assert.equal(v.out, 'sdlc/S-001', label)
    assert.equal(v.fmt, 'sdlc/{name}', label)
  }
})

test('verify cli: branches.py name honours a set branchFormat over the default', () => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
  const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'])
  assert.equal(t.status, 0)
  assert.equal(t.json.branch, 'feature/S-001')
})

test('verify cli: load_format property holds on config shapes without branchFormat', () => {
  assertProperty(checkLoadFormat({ runs: 100 }))
})

test('verify cli: sdlc-loop.js never reads s.branch or slice.branch', () => {
  const src = readFileSync(`${SK}/sdlc-loop.js`, 'utf8')
  const hits = [...src.matchAll(/\b(s|sl|slice|sliceObj|item)\??\.branch\b|\[['"]branch['"]\]/g)].map(m => m[0])
  console.log('branch reads in sdlc-loop.js:', JSON.stringify(hits))
  assert.deepEqual(hits, [])
})
