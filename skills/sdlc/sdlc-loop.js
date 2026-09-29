export const meta = {
  name: 'sdlc-loop',
  description: 'Implement a spec end-to-end through an adversarial SDLC loop, then raise the bar',
  whenToUse: 'Launched by the /sdlc skill. One run advances .sdlc/ state until done, livelock, stop, waiting, stalled, or the per-run agent cap.',
  phases: [
    { title: 'Read state' },
    { title: 'Bootstrap' },
    { title: 'Plan' },
    { title: 'Tests first' },
    { title: 'Implement' },
    { title: 'Verify' },
    { title: 'Review' },
    { title: 'Integrate' },
    { title: 'Escalate' },
    { title: 'Audit' },
    { title: 'Bar raiser' },
  ],
}

// ---------- config ----------
const A = args || {}
const SKILL_DIR = A.skillDir || '~/.claude/skills/sdlc'
const REPO = A.repoRoot || '.'
const CAP = A.runAgentCap || 850
const MAX_ITER = A.maxIterations === undefined || A.maxIterations === null ? Infinity : A.maxIterations
// bar raiser is opt-in: 0 (default) means stop at spec-complete; N allows up to N polish rounds in total
const BAR_RAISER_ROUNDS = A.barRaiserRounds > 0 ? A.barRaiserRounds : 0
const COST = { bootstrap: 40, slice: 60, parkedRetry: 60, retryMerge: 5, audit: 80, barRaiserRound: 90, livelock: 2 }

// ---------- shared schemas ----------
const str = { type: 'string' }
const OK = { type: 'object', properties: { ok: { type: 'boolean' }, notes: str }, required: ['ok'] }
const NEXT = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['stop', 'bootstrap', 'slice', 'parkedRetry', 'retryMerge', 'audit', 'barRaiserRound', 'livelock', 'done', 'wait'] },
    sliceId: str,
    slice: { type: 'object' },
    reason: str,
    summary: str,
  },
  required: ['action', 'reason'],
}
const VOTE = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, evidence: str, failingTest: str },
  required: ['refuted', 'evidence'],
}

// ---------- pure helpers ----------
function isRefuting(v) {
  return !v || v.refuted !== false
}

function tallyVerify(votes, lenses = []) {
  const failingTests = votes.filter(v => v && v.failingTest).map(v => v.failingTest)
  votes.forEach((v, i) => {
    if (lenses[i] === 'regression' && isRefuting(v) && !(v && v.failingTest)) failingTests.push(`regression: ${v ? v.evidence : 'verifier failed to report'}`)
  })
  const refutations = votes.filter(isRefuting).length
  return { pass: failingTests.length === 0 && refutations * 2 < votes.length, refutations, failingTests }
}

function allClear(votes) {
  return votes.length > 0 && votes.every(v => !isRefuting(v))
}

function survives(votes) {
  return votes.filter(v => !isRefuting(v)).length * 2 > votes.length
}

// a finding or idea is dropped only by explicit refutations; dead voters never make it disappear
function refutedByMajority(votes) {
  return votes.filter(v => v && v.refuted === true).length * 2 > votes.length
}

function ideaKey(idea) {
  return String(idea.key || idea.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function dedupeIdeas(ideas, seenKeys) {
  const seen = new Set((seenKeys || []).map(k => ideaKey({ key: k })))
  const out = []
  for (const idea of ideas) {
    const key = ideaKey(idea)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ ...idea, key })
  }
  return out
}

function tallyAudit(ids, results) {
  const out = []
  for (const id of ids) {
    const reasons = []
    for (const r of results) {
      if (!r) { reasons.push('auditor failed to report'); continue }
      const hit = (r.refuted || []).find(x => x.id === id)
      if (hit) reasons.push(hit.reason)
    }
    if (reasons.length * 2 > results.length) out.push({ id, reasons })
  }
  return out
}

function normalizeCounters(c) {
  return { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, ...(c || {}) }
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---------- core ----------
let spent = 0

function hasHeadroom(action) {
  if (spent + (COST[action] || 60) > CAP) return false
  if (budget && budget.total && budget.remaining() < 50000) return false
  return true
}

async function run(role, vars, opts = {}) {
  const prompt = [
    `You are the "${role}" agent of the SDLC workflow.`,
    `Read ${SKILL_DIR}/prompts/_common.md, then ${SKILL_DIR}/prompts/${role}.md, and follow them exactly.`,
    `Target repo: ${REPO}`,
    'Inputs (JSON):',
    JSON.stringify(vars || {}, null, 2),
  ].join('\n')
  const { label, ...rest } = opts
  const fullLabel = label ? `${role}:${label}` : role
  for (let attempt = 0; attempt < 2; attempt++) {
    spent++
    let out = null
    try {
      out = await agent(prompt, { ...rest, label: fullLabel })
    } catch (e) {
      out = null
    }
    if (out !== null && out !== undefined) return out
  }
  return null
}

async function persist(sliceId, patch) {
  return run('state-writer', { op: 'patch-slice', sliceId, patch }, { schema: OK, effort: 'low', label: sliceId })
}

// the no-progress streak survives relaunches: the driver passes lastKey/streak back in args
let lastKey = A.lastKey || ''
let streak = A.streak || 0

function finish(state, reason, history) {
  return { state, reason, agentsSpent: spent, iterations: history, lastKey, streak }
}

// ---------- actions ----------

// bootstrap
const COUNT = { type: 'object', properties: { added: { type: 'number' }, reopened: { type: 'number' }, notes: str }, required: ['added'] }
const ENV = { type: 'object', properties: { gitMode: { type: 'string', enum: ['pr', 'direct'] }, commands: { type: 'object' }, notes: str }, required: ['gitMode', 'commands'] }
const CRITIC_ROUND_LIMIT = 8

async function bootstrap(next) {
  const P = 'Bootstrap'
  phase(P)
  const env = await run('env-detector', { specPath: A.specPath || null, gitMode: A.gitMode || null }, { schema: ENV, phase: P })
  if (!env) return 'bootstrap aborted: env-detector failed'
  const ext = await run('requirements-extractor', { reason: next.reason }, { schema: COUNT, phase: P })
  if (!ext) return 'bootstrap aborted: requirements-extractor failed'
  let dry = 0
  let round = 0
  while (dry < 2 && round < CRITIC_ROUND_LIMIT) {
    const c = await run('completeness-critic', { round }, { schema: COUNT, phase: P, label: `r${round}` })
    round++
    dry = c && c.added === 0 ? dry + 1 : 0
  }
  if (dry < 2) log(`completeness critic stopped at the ${CRITIC_ROUND_LIMIT}-round limit without two dry rounds`)
  const sl = await run('slicer', {}, { schema: COUNT, phase: P })
  if (!sl) return 'bootstrap aborted: slicer failed'
  await run('state-writer', { op: 'bootstrap-complete' }, { schema: OK, effort: 'low', phase: P })
  return `bootstrap: ${ext.added} extracted, ${ext.reopened || 0} reopened, ${round} critic rounds, ${sl.added} slices added`
}

// escalation
const PROPOSAL = { type: 'object', properties: { option: str, rationale: str, reversibility: str }, required: ['option', 'rationale'] }
const DECISION = { type: 'object', properties: { adrId: str, choice: str }, required: ['adrId', 'choice'] }
const LADDER = ['none', 'replan', 'split', 'spike', 'alternative', 'park']
const PANEL_ANGLES = ['spec-intent', 'simplest', 'most-reversible']

async function decisionPanel(q) {
  const proposals = (await parallel(PANEL_ANGLES.map(angle => () =>
    run('decision-proposer', { ...q, angle }, { schema: PROPOSAL, phase: 'Escalate', label: `${q.sliceId || 'global'}:${angle}` })))).filter(Boolean)
  if (!proposals.length) {
    log(`decision panel for ${q.sliceId || 'global'} got no proposals: ${q.question}`)
    return null
  }
  return run('decision-judge', { ...q, proposals }, { schema: DECISION, phase: 'Escalate', label: q.sliceId || 'global' })
}

async function escalate(id, slice, counters, why) {
  const step = Math.min(counters.ladderStep + 1, 5)
  const kind = (slice && slice.kind) || 'spec'
  const action = step === 5 && kind === 'improvement' ? 'revert-reject' : LADDER[step]
  phase('Escalate')
  log(`${id} escalates to step ${step} (${action}): ${why}`)
  const adr = step === 4
    ? await decisionPanel({
        kind: 'approach',
        sliceId: id,
        question: `Pick a different implementation approach for slice ${id}. What failed so far: ${why}`,
        context: `Read .sdlc/slices/${id}/failures.md and .sdlc/slices/${id}/spike.md first.`,
      })
    : null
  const r = await run('escalator', { sliceId: id, step, action, why, adr }, { schema: OK, phase: 'Escalate', label: `${id}:${action}` })
  return `${id} escalated to ${action}${r && r.ok ? '' : ' (escalator did not confirm)'}`
}

// slice: plan + tests first
const PLAN = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    ambiguities: {
      type: 'array',
      items: { type: 'object', properties: { question: str, context: str, kind: { type: 'string', enum: ['ambiguity', 'contradiction'] } }, required: ['question'] },
    },
    notes: str,
  },
  required: ['ok'],
}
const TESTCHECK = { type: 'object', properties: { allFailCorrectly: { type: 'boolean' }, problems: { type: 'array', items: str } }, required: ['allFailCorrectly'] }
const PHASE_ORDER = ['plan', 'tests', 'implement', 'integrate']
const PLAN_LENSES = ['spec-fidelity', 'architecture']
const AMBIGUITY_ROUND_LIMIT = 3

async function planPhase(id, counters) {
  phase('Plan')
  let critiques = []
  let ambiguityRounds = 0
  while (counters.planRevisions < 3) {
    const plan = await run('planner', { sliceId: id, revision: counters.planRevisions, critiques }, { schema: PLAN, phase: 'Plan', label: id })
    const amb = (plan && plan.ambiguities) || []
    if (amb.length && ambiguityRounds < AMBIGUITY_ROUND_LIMIT) {
      ambiguityRounds++
      const asked = amb.slice(0, AMBIGUITY_ROUND_LIMIT)
      if (amb.length > asked.length) log(`${id}: resolving ${asked.length} of ${amb.length} ambiguities this round`)
      const adrs = await parallel(asked.map(a => () =>
        decisionPanel({ kind: a.kind || 'ambiguity', sliceId: id, question: a.question, context: a.context || '' })))
      critiques = adrs.map((d, i) => d
        ? `Resolved by ${d.adrId}: ${d.choice}`
        : `Unresolved: ${asked[i].question}. Choose the most spec-consistent, reversible option and record an ADR.`)
      continue
    }
    if (plan && plan.ok) {
      const votes = await parallel(PLAN_LENSES.map(lens => () =>
        run('plan-critic', { sliceId: id, lens }, { schema: VOTE, phase: 'Plan', label: `${id}:${lens}` })))
      if (allClear(votes)) return true
      critiques = votes.map((v, i) => (v ? `[${PLAN_LENSES[i]}] ${v.evidence}` : `[${PLAN_LENSES[i]}] critic failed to report`))
    } else {
      critiques = [plan ? `planner reported not ok: ${plan.notes || ''}` : 'planner failed to report']
    }
    counters.planRevisions++
    log(`${id} plan revision ${counters.planRevisions}/3`)
  }
  return false
}

async function testsPhase(id) {
  phase('Tests first')
  let problems = []
  for (let attempt = 0; attempt < 3; attempt++) {
    const w = await run('test-writer', { sliceId: id, attempt, problems }, { schema: OK, phase: 'Tests first', label: id })
    if (!w || !w.ok) {
      problems = [w ? `test-writer reported not ok: ${w.notes || ''}` : 'test-writer failed to report']
      continue
    }
    const chk = await run('test-checker', { sliceId: id }, { schema: TESTCHECK, effort: 'low', phase: 'Tests first', label: id })
    if (chk && chk.allFailCorrectly) return true
    problems = chk ? chk.problems || ['test-checker gave no problems'] : ['test-checker failed to report']
  }
  return false
}

async function sliceAction(next) {
  const id = next.sliceId
  const s = next.slice || {}
  const counters = normalizeCounters(s.counters)
  let at = Math.max(0, PHASE_ORDER.indexOf(s.phase || 'plan'))
  if (at === 0) {
    if (!(await planPhase(id, counters))) return escalate(id, s, counters, 'plan refuted 3 times')
    await persist(id, { status: 'in_progress', phase: 'tests', counters })
    at = 1
  }
  if (at === 1) {
    if (!(await testsPhase(id))) return escalate(id, s, counters, 'tests could not be made to fail for the right reason')
    await persist(id, { phase: 'implement', counters })
    at = 2
  }
  let seeds = s.seeds || []
  if (at === 2) {
    const b = await buildLoop(id, counters)
    if (b.paused) return `${id} paused: agent cap`
    if (!b.ok) return escalate(id, s, counters, `fix rounds exhausted: ${b.lastEvidence.join(' | ').slice(0, 600)}`)
    seeds = b.seeds
    await persist(id, { phase: 'integrate', counters, seeds })
  }
  return integrate(id, s, counters, seeds)
}

// slice: implement + verify + review + integrate
const IMPL = { type: 'object', properties: { green: { type: 'boolean' }, notes: str }, required: ['green'] }
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: { type: 'object', properties: { title: str, detail: str, file: str, blocking: { type: 'boolean' } }, required: ['title', 'detail', 'blocking'] },
    },
  },
  required: ['findings'],
}
const INTEGRATE = {
  type: 'object',
  properties: { state: { type: 'string', enum: ['merged', 'awaiting-merge', 'failed'] }, commit: str, pr: str, notes: str },
  required: ['state'],
}
const VERIFY_LENSES = ['spec-fidelity', 'breaker', 'regression']
const REVIEW_LENSES = ['security', 'architecture', 'test-quality']
const FIX_ROUND_LIMIT = 3
const STREAK_LIMIT = 3
const BLOCKING_JUDGE_LIMIT = 5
const ROUND_COST = 25

async function reviewPhase(id, round) {
  phase('Review')
  const reports = await parallel(REVIEW_LENSES.map(lens => () =>
    run('reviewer', { sliceId: id, lens, round }, { schema: FINDINGS, phase: 'Review', label: `${id}:${lens}` })))
  const missing = REVIEW_LENSES
    .filter((lens, i) => !reports[i])
    .map(lens => ({ title: `reviewer ${lens} failed to report`, detail: 'Re-run review; no evidence the slice is clean for this lens.', blocking: true }))
  const findings = reports.filter(Boolean).flatMap(r => r.findings || [])
  const seeds = findings.filter(f => !f.blocking)
  const blockingFound = findings.filter(f => f.blocking)
  if (blockingFound.length > BLOCKING_JUDGE_LIMIT) {
    log(`${id} review r${round}: judging ${BLOCKING_JUDGE_LIMIT} of ${blockingFound.length} blocking findings; reviewers re-report the rest next round`)
  }
  const judged = await parallel(blockingFound.slice(0, BLOCKING_JUDGE_LIMIT).map((f, fi) => async () => {
    const votes = await parallel([0, 1, 2].map(k => () =>
      run('finding-refuter', { sliceId: id, finding: f, voter: k }, { schema: VOTE, phase: 'Review', label: `${id}:f${fi}v${k}` })))
    return refutedByMajority(votes) ? null : f
  }))
  return { blocking: [...missing, ...judged.filter(Boolean)], seeds }
}

async function buildLoop(id, counters) {
  let evidence = []
  while (counters.fixRounds < FIX_ROUND_LIMIT) {
    if (spent + ROUND_COST > CAP) return { ok: false, paused: true, seeds: [], lastEvidence: evidence }
    const round = counters.fixRounds
    phase('Implement')
    const impl = await run('implementer', { sliceId: id, fixRound: round, evidence }, { schema: IMPL, phase: 'Implement', label: `${id}:r${round}` })
    if (!impl || !impl.green) {
      evidence = [impl ? `implementer could not get green: ${impl.notes || ''}` : 'implementer failed to report']
    } else {
      phase('Verify')
      const votes = await parallel(VERIFY_LENSES.map(lens => () =>
        run('verifier', { sliceId: id, lens, round }, { schema: VOTE, phase: 'Verify', label: `${id}:${lens}` })))
      const v = tallyVerify(votes, VERIFY_LENSES)
      log(`${id} verify r${round}: ${v.refutations}/${votes.length} refuted, ${v.failingTests.length} failing test(s)`)
      if (!v.pass) {
        evidence = votes.map((x, i) => (x
          ? `[${VERIFY_LENSES[i]}] ${x.refuted ? 'REFUTED' : 'ok'}: ${x.evidence}${x.failingTest ? ` failing test: ${x.failingTest}` : ''}`
          : `[${VERIFY_LENSES[i]}] verifier failed to report`))
      } else {
        const review = await reviewPhase(id, round)
        log(`${id} review r${round}: ${review.blocking.length} blocking, ${review.seeds.length} seed(s)`)
        if (!review.blocking.length) return { ok: true, seeds: review.seeds, lastEvidence: [] }
        evidence = review.blocking.map(f => `[review] ${f.title}: ${f.detail}${f.file ? ` (${f.file})` : ''}`)
      }
    }
    counters.fixRounds++
    await persist(id, { counters })
  }
  return { ok: false, seeds: [], lastEvidence: evidence }
}

async function integrate(id, s, counters, seeds, mode = 'ship') {
  phase('Integrate')
  const r = await run('integrator', { sliceId: id, mode, seeds }, { schema: INTEGRATE, phase: 'Integrate', label: id })
  if (!r || r.state === 'failed') return escalate(id, s, counters, `integration failed: ${r ? r.notes || '' : 'integrator did not report'}`)
  return `${id} ${r.state}${r.pr ? ' ' + r.pr : ''}${r.commit ? ' ' + r.commit : ''}`
}

async function parkedRetry(next) {
  const s = next.slice || {}
  const counters = { ...normalizeCounters(s.counters), planRevisions: 0, fixRounds: 0, ladderStep: 0 }
  await run('state-writer', { op: 'unpark', sliceId: next.sliceId }, { schema: OK, effort: 'low', label: next.sliceId })
  return sliceAction({ ...next, slice: { ...s, status: 'in_progress', phase: 'plan', counters } })
}

async function retryMerge(next) {
  const s = next.slice || {}
  return integrate(next.sliceId, s, normalizeCounters(s.counters), [], 'retry-merge')
}

// final audit + livelock
const AUDIT_PLAN = { type: 'object', properties: { chunks: { type: 'array', items: { type: 'array', items: str } } }, required: ['chunks'] }
const AUDIT = {
  type: 'object',
  properties: { refuted: { type: 'array', items: { type: 'object', properties: { id: str, reason: str }, required: ['id', 'reason'] } } },
  required: ['refuted'],
}

async function audit() {
  const P = 'Audit'
  phase(P)
  const plan = await run('audit-planner', {}, { schema: AUDIT_PLAN, effort: 'low', phase: P })
  if (!plan) return 'audit aborted: audit-planner failed'
  const perChunk = await pipeline(
    plan.chunks,
    (ids, _item, i) => parallel([0, 1, 2].map(k => () =>
      run('auditor', { requirementIds: ids, voter: k }, { schema: AUDIT, phase: P, label: `c${i}v${k}` }))),
    (results, ids) => tallyAudit(ids, results))
  const refuted = perChunk.filter(Boolean).flat()
  const auditedIds = plan.chunks.flat()
  await run('state-writer', { op: 'audit-result', auditedIds, refuted }, { schema: OK, effort: 'low', phase: P })
  return refuted.length
    ? `audit reopened ${refuted.map(r => r.id).join(', ')}`
    : `audit passed (${auditedIds.length} requirements)`
}

async function livelock(next) {
  await run('stuck-writer', { reason: next.reason }, { schema: OK, phase: 'Audit' })
  return next.summary || next.reason
}

// bar raiser
const BR_STATE = {
  type: 'object',
  properties: { seenKeys: { type: 'array', items: str }, seeds: { type: 'array', items: { type: 'object' } }, dryRounds: { type: 'number' }, rounds: { type: 'number' } },
  required: ['seenKeys', 'seeds', 'dryRounds'],
}
const IDEAS = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: { type: 'object', properties: { key: str, title: str, detail: str, lens: str, file: str, behaviorChange: { type: 'boolean' } }, required: ['key', 'title', 'detail', 'behaviorChange'] },
    },
  },
  required: ['ideas'],
}
const BAR_LENSES = ['performance', 'security-hardening', 'test-gaps', 'accessibility-rtl', 'resilience', 'observability', 'code-health-dx']
const JUDGE_BATCH_LIMIT = 20

async function barRaiserRound() {
  const P = 'Bar raiser'
  phase(P)
  const st = await run('barraiser-reader', {}, { schema: BR_STATE, effort: 'low', phase: P })
  if (!st) return 'bar raiser aborted: barraiser-reader failed'
  const round = (st.rounds || 0) + 1
  const backlog = st.seeds || []
  // drain a full backlog before looking for more, or finders outpace judging and the loop never goes dry
  const reports = backlog.length >= JUDGE_BATCH_LIMIT
    ? []
    : await parallel(BAR_LENSES.map(lens => () =>
        run('bar-finder', { lens, seenKeys: st.seenKeys }, { schema: IDEAS, phase: P, label: lens })))
  const finderFailed = reports.some(r => !r)
  if (finderFailed) log(`bar raiser: ${reports.filter(r => !r).length} finder(s) failed; this round cannot count as dry`)
  const found = reports.filter(Boolean).flatMap(r => r.ideas || [])
  if (backlog.length >= JUDGE_BATCH_LIMIT) log(`bar raiser: backlog of ${backlog.length} ideas; skipping finders this round`)
  const fresh = dedupeIdeas([...backlog, ...found], st.seenKeys)
  const batch = fresh.slice(0, JUDGE_BATCH_LIMIT)
  const deferred = fresh.slice(JUDGE_BATCH_LIMIT)
  if (deferred.length) log(`bar raiser: judging ${batch.length} of ${fresh.length} fresh ideas; ${deferred.length} deferred to the next round`)
  const judged = await parallel(batch.map((idea, i) => async () => {
    if (idea.behaviorChange) return { idea, verdict: 'proposal' }
    const votes = await parallel([0, 1, 2].map(k => () =>
      run('bar-judge', { idea, voter: k, round }, { schema: VOTE, phase: P, label: `i${i}v${k}` })))
    if (survives(votes)) return { idea, verdict: 'accepted' }
    if (refutedByMajority(votes)) return { idea, verdict: 'rejected' }
    return { idea, verdict: 'unjudged' }
  }))
  const verdicts = judged.filter(v => v.verdict !== 'unjudged')
  const unjudged = judged.filter(v => v.verdict === 'unjudged').map(v => v.idea)
  deferred.push(...unjudged)
  const accepted = verdicts.filter(v => v.verdict === 'accepted').length
  const dry = accepted === 0 && deferred.length === 0 && !finderFailed
  const w = await run('barraiser-writer', { verdicts, deferred, dry }, { schema: OK, phase: P })
  if (!w || !w.ok) return 'bar raiser: writer failed'
  return `bar raiser: ${found.length} found, ${fresh.length} fresh, ${accepted} accepted${dry ? ' (dry)' : ''}`
}

// ---------- registry + main ----------
const ACTIONS = { bootstrap, slice: sliceAction, parkedRetry, retryMerge, audit, livelock, barRaiserRound }

const INTERNALS = {
  run, persist, hasHeadroom, spent: () => spent,
  tallyVerify, allClear, survives, refutedByMajority, ideaKey, dedupeIdeas, tallyAudit, normalizeCounters, chunk,
  bootstrap,
  decisionPanel, escalate,
  planPhase, testsPhase, sliceAction,
  reviewPhase, buildLoop, integrate, parkedRetry, retryMerge,
  audit, livelock,
  barRaiserRound,
}

async function main() {
  const history = []
  for (let iteration = 0; ; iteration++) {
    if (iteration >= MAX_ITER) return finish('continue', `max iterations (${MAX_ITER}) reached`, history)
    phase('Read state')
    const next = await run('state-reader', { iteration, specPath: A.specPath || null, barRaiserRounds: BAR_RAISER_ROUNDS }, { schema: NEXT, effort: 'low', phase: 'Read state' })
    if (!next) return finish('continue', 'state reader failed twice', history)
    log(`#${iteration} → ${next.action}${next.sliceId ? ' ' + next.sliceId : ''}: ${next.reason}`)
    if (next.action === 'stop') return finish('stopped', next.reason, history)
    if (next.action === 'done') return finish('done', next.summary || next.reason, history)
    if (next.action === 'wait') return finish('waiting', next.reason, history)
    if (next.action === 'barRaiserRound' && !BAR_RAISER_ROUNDS) {
      return finish('done', `spec complete; bar raiser off (run /sdlc with --bar-raiser N to polish). ${next.reason}`, history)
    }
    if (!hasHeadroom(next.action)) {
      return finish('continue', `agent cap or budget: ${spent}/${CAP} agents spent, ${next.action} needs ~${COST[next.action] || 60}`, history)
    }
    const act = ACTIONS[next.action]
    if (!act) return finish('continue', `unknown action: ${next.action}`, history)
    const outcome = await act(next)
    history.push({ action: next.action, sliceId: next.sliceId || null, outcome })
    if (next.action === 'livelock') return finish('livelock', outcome, history)
    const key = `${next.action}|${next.sliceId || ''}|${outcome}`
    streak = key === lastKey ? streak + 1 : 1
    lastKey = key
    if (streak >= STREAK_LIMIT) {
      if (!next.sliceId) return finish('stalled', `no progress: "${key}" repeated ${STREAK_LIMIT} times`, history)
      // a PR that keeps waiting needs a human, not a park
      if (next.action === 'retryMerge') return finish('waiting', `${next.sliceId} still awaiting merge: ${outcome}`, history)
      const kind = (next.slice && next.slice.kind) || 'spec'
      const fp = await run('state-writer', { op: 'force-park', sliceId: next.sliceId, kind, reason: `no progress: ${outcome} (x${STREAK_LIMIT})` }, { schema: OK, effort: 'low', label: next.sliceId })
      if (!fp || !fp.ok) return finish('stalled', `force-park failed for ${next.sliceId} after: ${outcome}`, history)
      log(`${next.sliceId} force-parked after ${STREAK_LIMIT} identical outcomes`)
      lastKey = ''
      streak = 0
    }
  }
}

return await main() // @entry
