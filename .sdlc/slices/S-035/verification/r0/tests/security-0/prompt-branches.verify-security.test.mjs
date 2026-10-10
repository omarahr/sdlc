import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const SKILL = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc'
const P = (n) => readFileSync(join(SKILL, 'prompts', n + '.md'), 'utf8')
const LIT = /(?<![.\w])sdlc\/(?!tracker|STOP|\{name)/
const strip = (t) => t.replace(/```[^\n]*\n[\s\S]*?```/g, (b) => (b.includes('branches.py') ? '' : b))
const NAMED = [/sdlc\/<id>/, /sdlc\/run-<n>/, /sdlc\/<id>-attempt-\*/]
const integrator = () => P('integrator')
const clean = () => { const t = integrator(); return t.slice(t.indexOf('**Clean up**'), t.indexOf('## mode: retry-merge')) }
const hits = (t) => LIT.test(strip(t)) || NAMED.some((r) => r.test(strip(t)))

test('verify security: VS-1 filter keeps only S-1 attempts, not S-10, s-1 or others', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-2', 'sdlc/S-10-attempt-1', 'sdlc/S-1a-attempt-1', 'sdlc/S-11-attempt-3', 'sdlc/S-1'] })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.equal(t.status, 0)
  const rows = Array.isArray(t.json) ? t.json : t.json.branches ?? t.json
  const mine = rows.filter((e) => String(e.id).toLowerCase() === 's-1')
  assert.deepEqual(mine.map((e) => e.branch ?? e.name).sort(), ['sdlc/S-1-attempt-1', 'sdlc/S-1-attempt-2'])
  assert.equal(t.treeUnchanged, true)
})

test('verify security: VS-1 slice with no attempt branches yields nothing', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-10-attempt-1', 'sdlc/S-2'] })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  const rows = Array.isArray(t.json) ? t.json : t.json.branches ?? t.json
  assert.equal(rows.filter((e) => String(e.id).toLowerCase() === 's-5').length, 0)
})

test('verify security: VS-1 hostile branch names never parse as attempts of S-1 and the listing does not crash', () => {
  const r = cliRunner()
  const bad = ['sdlc/S-1-attempt-1/../x', 'sdlc/S-1-attempt-', 'sdlc/S-1-attempt-x', 'sdlc/S-1-attempt-1-attempt-2', 'sdlc/S-1-attempt-\u0661', 'sdlc/S-1\u2011attempt-1']
  const ok = []
  for (const b of bad) { try { r.gitRepo({ branches: [b] }); ok.push(b) } catch {} }
  const repo = r.gitRepo({ branches: ['sdlc/S-1-attempt-1', ...ok.filter((b) => !b.includes('..'))] })
  const t = r.run('branches.py', ['list', '--repo', repo, '--kind', 'attempt'])
  assert.equal(t.status, 0, t.stderr)
  const rows = Array.isArray(t.json) ? t.json : t.json.branches ?? t.json
  const mine = rows.filter((e) => String(e.id).toLowerCase() === 's-1')
  const odd = mine.map((e) => e.branch).filter((b) => !/^sdlc\/S-1-attempt-[0-9]+$/.test(b))
  assert.ok(odd.every((b) => /[^\x00-\x7f]/.test(b)), 'only a non-ascii digit branch may parse as an S-1 attempt: ' + odd)
})

test('verify security: VS-1 flag-like and injection ids cannot reach --repo/--kind of the documented command', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ branches: ['sdlc/S-1-attempt-1'] })
  for (const e of load('flag-like-values', { argv: true }).slice(0, 8)) {
    const t = r.run('branches.py', ['list', '--repo', repo, '--kind', e.value])
    assert.notEqual(t.status, null)
    assert.equal(t.treeUnchanged, true)
  }
})

test('verify security: VS-1 section holds no glob, and the documented command is the only discovery path', () => {
  const s = clean()
  assert.ok(s.includes('python3 "<skill>/branches.py" list --repo . --kind attempt'))
  assert.doesNotMatch(s, /-attempt-\*|--list|for-each-ref/)
  assert.match(s, /Keep the entries whose `id` equals this slice id, ignoring case/)
})

test('verify security: VS-2 current integrator holds no literal and the scan flags planted variants', () => {
  const t = integrator()
  assert.equal(hits(t), false)
  assert.ok(t.includes('<slice branch>') && t.includes('<run branch>'))
  const plants = ['sdlc/<id>', 'sdlc/run-<n>', 'sdlc/<id>-attempt-*', 'sdlc/S-001', 'sdlc/S-1-attempt-2', 'sdlc/run-3', '`sdlc/S-001`', '| sdlc/run-1 | x |', '"sdlc/S-9"', '(sdlc/S-9)', '```\ngit push origin sdlc/S-001\n```']
  for (const p of plants) assert.equal(hits(t + '\n' + p + '\n'), true, 'missed ' + JSON.stringify(p))
})

test('verify security: VS-2 literal hidden inside a fenced block that mentions branches.py is NOT seen (exemption width)', () => {
  const t = integrator()
  const hidden = t + '\n```\npython3 branches.py list\ngit push origin sdlc/S-001\n```\n'
  assert.equal(hits(hidden), false)
})

test('verify security: VS-2 unclosed fence and lookalike separators', () => {
  const t = integrator()
  assert.equal(hits(t + '\nsdlc\u2215S-001\n'), false)
  assert.equal(hits(t + '\nsdlc/\u200bS-001\n'), true)
  assert.equal(hits(t + '\n```\nbranches.py\nsdlc/S-001\n'), true)
  assert.equal(hits(t + '\n```\nbranches.py\n```\nsdlc/S-001\n'), true)
})

for (const [name, ph] of [['escalator', ['<slice branch>', '<attempt branch>', '<run branch>']], ['state-writer', ['<slice branch>', '<attempt branch>']]]) {
  test('verify security: VS-3/4 ' + name + ' clean and flags a planted literal but not .sdlc/ paths', () => {
    const t = P(name)
    assert.equal(LIT.test(strip(t)), false)
    for (const p of ph) assert.ok(t.includes(p))
    assert.equal(LIT.test(strip(t + '\nrename to sdlc/S-001-attempt-1')), true)
    assert.equal(LIT.test(strip(t + '\nsee .sdlc/slices/x')), false)
  })
}
