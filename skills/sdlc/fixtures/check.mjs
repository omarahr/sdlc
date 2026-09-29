import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const [sandbox, fixture] = process.argv.slice(2)
if (!sandbox || !fixture) {
  console.error('usage: node check.mjs <sandbox> <tiny-cli|contradiction|impossible|stub|resume>')
  process.exit(2)
}
const sdlc = p => join(sandbox, '.sdlc', p)
const json = p => JSON.parse(readFileSync(sdlc(p), 'utf8'))
const text = p => (existsSync(sdlc(p)) ? readFileSync(sdlc(p), 'utf8') : '')
const fails = []
const expect = (cond, msg) => { if (!cond) fails.push(msg) }

const reqs = json('requirements.json')
expect(reqs.length > 0, 'ledger is empty')
for (const r of reqs.filter(r => r.status !== 'parked' && !(r.flags || []).includes('obsolete'))) {
  expect(r.status === 'done', `${r.id} is ${r.status}, expected done`)
  expect(r.evidence && r.evidence.files.length > 0, `${r.id} has no evidence files`)
  expect(r.evidence && r.evidence.tests.length > 0, `${r.id} has no evidence tests`)
  expect(r.evidence && r.evidence.commit && r.evidence.commit !== 'pending', `${r.id} has no commit sha`)
}
const parked = reqs.filter(r => r.status === 'parked')
const adrs = (text('DECISIONS.md').match(/^### ADR-/gm) || []).length
const proposals = (text('SPEC-PROPOSALS.md').match(/^### P-/gm) || []).length
const br = existsSync(sdlc('barraiser.json')) ? json('barraiser.json') : { dryRounds: 0 }
const auditPassed = existsSync(sdlc('audit.json')) && json('audit.json').passed === true

if (fixture === 'tiny-cli' || fixture === 'resume') {
  expect(parked.length === 0, `parked requirements: ${parked.map(r => r.id)}`)
  expect(auditPassed, 'audit.json not passed')
  expect(br.dryRounds >= 2 || br.rounds >= 10, `bar raiser neither dry (dryRounds ${br.dryRounds}) nor at the 10-round cap (rounds ${br.rounds})`)
}
if (fixture === 'resume') {
  const merged = text('log.jsonl').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(e => e.type === 'slice-merged').map(e => e.slice)
  expect(merged.length === new Set(merged).size, `a slice was merged twice: ${merged}`)
}
if (fixture === 'contradiction') {
  expect(adrs >= 1, 'no ADR recorded for the contradiction')
  expect(proposals >= 1, 'no SPEC-PROPOSALS entry for the contradiction')
  expect(parked.length === 0, 'contradiction should be resolved, not parked')
}
if (fixture === 'impossible') {
  expect(existsSync(sdlc('STUCK.md')), 'STUCK.md missing')
  expect(parked.length >= 1, 'the invert requirement was not parked')
  expect(parked.every(r => /invert/i.test(r.quote)), `non-invert requirement parked: ${parked.map(r => r.id)}`)
}
if (fixture === 'stub') {
  expect(reqs.some(r => (r.flags || []).includes('external-stub')), 'no requirement flagged external-stub')
  expect(/fake|stub/i.test(text('DECISIONS.md')), 'no ADR about the stand-in')
}

if (fails.length) {
  console.log(`FAIL ${fixture}\n- ${fails.join('\n- ')}`)
  process.exit(1)
}
console.log(`PASS ${fixture}`)
