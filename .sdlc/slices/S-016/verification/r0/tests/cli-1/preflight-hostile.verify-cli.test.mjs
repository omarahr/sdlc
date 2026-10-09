import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, writeFileSync } from 'node:fs'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { stubServer } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/stub-server.mjs'
import { glabStub } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/glab-stub.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const LOG = process.env.VERIFY_LOG
if (LOG) { writeFileSync(LOG, ''); writeFileSync(LOG + '.seeds', '') }
const note = (s) => LOG && appendFileSync(LOG, s + '\n')

function prRun({ rule, mode = 'pr', args = [], timeoutMs = 20000 }) {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { forge: 'github', gitMode: mode } } })
  const gh = stubServer({ name: 'gh', fallback: { stdout: [{ type: 'branch_name_pattern', parameters: rule }] } })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...args], { env: { PATH: gh.path(process.env.PATH) }, timeoutMs })
  return t
}

function mrRun({ pattern, branch, timeoutMs = 20000 }) {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { forge: 'gitlab', gitMode: 'mr' } } })
  const glab = glabStub({ fallback: { stdout: { branch_name_regex: pattern } } })
  return r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'mr', '--branch', branch], { env: { PATH: glab.path(process.env.PATH) }, timeoutMs })
}

const hasEol = (v) => /[\r\n]/.test(v)
const seedNote = (s) => LOG && appendFileSync(LOG + '.seeds', s + '\n')

function sane(t, id, codes = [0, 1]) {
  note(`--- ${id}\n${t.text ? t.text() : JSON.stringify(t)}`)
  assert.ok(!t.spawnError, `${id} spawn error ${t.spawnError}`)
  assert.ok(codes.includes(t.status), `${id} exit ${t.status}`)
  assert.ok(!/Traceback/.test(t.stderr), `${id} traceback: ${t.stderr}`)
  assert.ok(t.json && typeof t.json === 'object', `${id} stdout not one JSON object: ${t.stdout.slice(0, 200)}`)
  assert.equal(t.json.ok, t.status === 0, `${id} ok/exit mismatch`)
  if (t.status === 1) assert.ok(t.json.suggestion.length > 0, `${id} empty suggestion`)
  return t.json
}

function checkLines(out, input, id) {
  if (out.ok || out.suggestion === undefined) return
  const lines = out.suggestion.split('\n')
  const good = lines.every((l) => LINE.test(l))
  if (hasEol(input)) {
    if (!good) seedNote(`${id}: input holds a line break; suggestion splits into ${lines.length} lines ${JSON.stringify(out.suggestion.slice(0, 200))}`)
    return
  }
  assert.ok(good && lines.length <= 2, `${id}: injected line ${JSON.stringify(out.suggestion)}`)
}

const LINE = /^(--branch-format |rename the branch )/
const families = ['injection', 'control-chars', 'flag-like-values', 'format-strings', 'oversized']

for (const op of ['starts_with', 'ends_with', 'contains']) {
  for (const fam of families) {
    for (const e of load(fam)) {
      test(`verify cli: TC-cli-V7-derive ${op} ${fam}/${e.id}`, () => {
        const t = prRun({ rule: { name: 'hostile', operator: op, pattern: e.value } })
        const out = sane(t, `${op}/${fam}/${e.id}`)
        if (out.derived) assert.equal(out.ok, true)
        else assert.equal(out.format, 'sdlc/{name}')
        checkLines(out, e.value, `${op}/${fam}/${e.id}`)
      })
    }
  }
}

const REGEX_EXTRA = [
  { id: 'catastrophic', value: '^(a+)+$' },
  { id: 'catastrophic2', value: '^(a|aa)+$' },
  { id: 'unbalanced', value: '(' },
  { id: 'bad-escape', value: '\\' },
  { id: 'lookahead', value: '^(?=x)abc$' },
  { id: 'backref', value: '^(a)\\1/.*$' },
  { id: 'flags', value: '(?i)^FEATURE/.*$' },
  { id: 'unicode-class', value: '^\\p{L}+/.*$' },
  { id: 'huge-repeat', value: '^a{100000}/x$' },
  { id: 'nested-repeat', value: '^((a{1000}){1000}){1000}/x$' },
  { id: 'nested-repeat2', value: '^(((a{100}){100}){100}){100}/x$' },
  { id: 'deep-nest', value: '('.repeat(500) + 'a' + ')'.repeat(500) },
  { id: 'long', value: '^' + 'a'.repeat(100000) + '$' },
  { id: 'dot-star', value: '.*' },
  { id: 'empty-alt', value: '^(|a)/x$' },
  { id: 'slash-only', value: '^/$' },
  { id: 'quote', value: '^feature"/.*$' },
  { id: 'newline-literal', value: '^feat\\nure/.*$' },
  { id: 'real-newline', value: '^feat\nure/.*$' },
  { id: 'verbose-comment', value: '(?x) ^ feature/ # c\n .*$' },
]
for (const e of [...REGEX_EXTRA, ...families.flatMap((f) => load(f).map((x) => ({ id: `${f}/${x.id}`, value: x.value })))]) {
  test(`verify cli: TC-cli-V7-regex ${e.id}`, () => {
    const t = prRun({ rule: { name: 'rx', operator: 'regex', pattern: e.value } })
    const out = sane(t, `regex/${e.id}`)
    assert.ok(t.durationMs < 15000, `slow ${t.durationMs}`)
    checkLines(out, e.value, `regex/${e.id}`)
  })
}

test('verify cli: TC-cli-V7-label hostile rule name', () => {
  for (const e of [...load('injection'), ...load('control-chars'), ...load('format-strings')]) {
    const t = prRun({ rule: { name: e.value, operator: 'regex', pattern: '^(feature|bugfix)/[A-Z]+-\\d+$' } })
    const out = sane(t, `label/${e.id}`)
    checkLines(out, e.value, `label/${e.id}`)
  }
})

for (const e of [...load('injection', { argv: true }), ...load('control-chars', { argv: true }), ...load('flag-like-values', { argv: true }), ...load('format-strings', { argv: true }), ...load('oversized', { argv: true })]) {
  test(`verify cli: TC-cli-V7-branch ${e.id}`, () => {
    const t = mrRun({ pattern: '^feature/.*$', branch: e.value })
    const out = sane(t, `branch/${e.id}`, [0, 1, 2])
    if (t.status === 2) {
      assert.equal(out.ok, false)
      return
    }
    if (e.value === '') return
    checkLines(out, e.value, `branch/${e.id}`)
    assert.ok(!out.suggestion.startsWith('-'), 'suggestion starts with dash')
  })
}

test('verify cli: TC-cli-V7-branch-flaglike branch passed as --branch=value form and dash', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { forge: 'gitlab', gitMode: 'mr' } } })
  const glab = glabStub({ fallback: { stdout: { branch_name_regex: '^feature/.*$' } } })
  for (const b of ['--help', '-x', '--format=evil/{name}']) {
    const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'mr', `--branch=${b}`], { env: { PATH: glab.path(process.env.PATH) } })
    const out = sane(t, `branch=${b}`)
    assert.equal(out.ok, false)
    assert.equal(out.format, 'sdlc/{name}')
    assert.equal(out.derived, false)
  }
})
