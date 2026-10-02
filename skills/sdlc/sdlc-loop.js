export const meta = {
  name: 'sdlc-loop',
  description: 'Implement a spec end-to-end through an adversarial SDLC loop, then raise the bar',
  whenToUse: 'Launched by the /sdlc skill. One run advances .sdlc/ state until done, livelock, stop, waiting, stalled, stuck, or the per-run agent cap.',
  phases: [
    { title: 'Read state' },
    { title: 'Bootstrap' },
    { title: 'Plan' },
    { title: 'Tests first' },
    { title: 'Implement' },
    { title: 'Verify' },
    { title: 'Review' },
    { title: 'Report' },
    { title: 'Integrate' },
    { title: 'Escalate' },
    { title: 'Behavior plan' },
    { title: 'Behavior run' },
    { title: 'Behavior judge' },
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
// roles that run on a different model than the one that planned and wrote the code, so one model's blind
// spots are not graded by the same model: the spec-fidelity verifier and the code reviewers. Pass
// args.reviewModel null to inherit the session model everywhere.
const REVIEW_MODEL = A.reviewModel === undefined ? 'fable' : A.reviewModel
const COST = { bootstrap: 40, slice: 60, parkedRetry: 60, retryMerge: 5, milestonePlan: 5, milestone: 90, audit: 80, barRaiserRound: 90, livelock: 2 }

// ---------- shared schemas ----------
const str = { type: 'string' }
const OK = { type: 'object', properties: { ok: { type: 'boolean' }, notes: str }, required: ['ok'] }
const NEXT = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['stop', 'bootstrap', 'slice', 'parkedRetry', 'retryMerge', 'milestonePlan', 'milestone', 'audit', 'barRaiserRound', 'livelock', 'done', 'wait'] },
    sliceId: str,
    slice: { type: 'object' },
    milestoneId: str,
    milestone: { type: 'object' },
    reason: str,
    summary: str,
  },
  required: ['action', 'reason'],
}
const SEED = { type: 'object', properties: { title: str, detail: str, file: str }, required: ['title', 'detail'] }
const VOTE = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, evidence: str, failingTest: str, seeds: { type: 'array', items: SEED } },
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
  // each vote looks at something the others do not, so one refutation is enough: the spec-fidelity verifier
  // often has no failing test to name, and a majority rule would let the other two outvote it
  return { pass: failingTests.length === 0 && refutations === 0, refutations, failingTests }
}

// the verifier group: one agent per verification profile, each covering the scenarios tagged with it
const PROFILES = ['http-api', 'async', 'concurrency', 'data', 'ui', 'i18n', 'cli', 'contract', 'security', 'limits']
const PROFILE_CHUNK = 6
const PROFILE_AGENT_LIMIT = 8
// the planner rates the slice's risk; the group is sized to it
const RISK_AGENTS = { low: 2, medium: 4, high: PROFILE_AGENT_LIMIT }
// profile agents each start their own database and test runs; batches keep one laptop from overheating
const PROFILE_BATCH = 4

// keeps at most `max` profiles (those tagging the most scenarios; on ties, the one the planner tagged first) and strips the rest
function capProfiles(scenarios, max) {
  const count = new Map()
  for (const sc of scenarios || []) for (const p of new Set(sc.profiles || [])) if (PROFILES.includes(p)) count.set(p, (count.get(p) || 0) + 1)
  // a Map keeps insertion order, which is the order the planner first tagged each profile
  const tagged = [...count.keys()]
  const ranked = [...tagged].sort((a, b) => count.get(b) - count.get(a) || tagged.indexOf(a) - tagged.indexOf(b))
  const keep = new Set(ranked.slice(0, max))
  return {
    scenarios: (scenarios || []).map(sc => ({ ...sc, profiles: (sc.profiles || []).filter(p => keep.has(p)) })),
    dropped: ranked.slice(max),
  }
}

// [{profile, scenarioId}] pairs back into scenarios, for a later round that re-runs only what failed
function pairsToScenarios(pairs) {
  const by = new Map()
  for (const { profile, scenarioId } of pairs || []) {
    if (!by.has(scenarioId)) by.set(scenarioId, { id: scenarioId, profiles: [] })
    if (!by.get(scenarioId).profiles.includes(profile)) by.get(scenarioId).profiles.push(profile)
  }
  return [...by.values()]
}

// what the next round must re-run: every scenario a profile agent failed or could not run, per profile
function pendingPairs(votes, groups) {
  const out = []
  votes.forEach((v, i) => {
    const g = groups[i]
    if (!g || !PROFILES.includes(g.profile)) return
    const ids = !v ? g.scenarioIds : [...(v.failedScenarios || []), ...(v.blocked || []).map(b => b.scenarioId)]
    for (const scenarioId of new Set(ids)) if (g.scenarioIds.includes(scenarioId)) out.push({ profile: g.profile, scenarioId })
  })
  return out
}

// [{profile, part, scenarioIds}]: scenarios grouped per profile, chunked so no round runs more than `max` profile agents
function groupScenarios(scenarios, max = PROFILE_AGENT_LIMIT) {
  const by = new Map()
  for (const sc of scenarios || []) {
    for (const p of new Set(sc.profiles || [])) {
      if (!PROFILES.includes(p)) continue
      if (!by.has(p)) by.set(p, [])
      by.get(p).push(sc.id)
    }
  }
  const profiles = PROFILES.filter(p => by.has(p))
  if (!profiles.length) return []
  let size = PROFILE_CHUNK
  const count = n => profiles.reduce((t, p) => t + Math.ceil(by.get(p).length / n), 0)
  while (count(size) > Math.max(max, profiles.length)) size++
  return profiles.flatMap(p => chunk(by.get(p), size).map((ids, part) => ({ profile: p, part, scenarioIds: ids })))
}

// folds the profile agents into one vote: any in-scope failing test or blocked scenario refutes it
function profileVote(votes, groups) {
  const failing = []
  const blocked = []
  const refuters = []
  votes.forEach((v, i) => {
    const g = groups[i]
    const tag = `[${g.profile}${g.part ? `#${g.part}` : ''}]`
    if (!v) {
      blocked.push(...g.scenarioIds.map(id => `${tag} ${id}: profile verifier failed to report`))
      return
    }
    if (v.failingTest) failing.push(`${tag} ${v.failingTest}`)
    for (const b of v.blocked || []) blocked.push(`${tag} ${b.scenarioId}: ${b.reason}`)
    if (isRefuting(v)) refuters.push(`${tag} ${v.evidence}`)
  })
  const failingTest = [...failing, ...blocked.map(b => `blocked: ${b}`)].join(' | ')
  const evidence = groups.length
    ? votes.map((v, i) => `[${groups[i].profile}${groups[i].part ? `#${groups[i].part}` : ''}] ${v ? `${v.refuted ? 'REFUTED' : 'ok'}: ${v.evidence}` : 'failed to report'}`).join(' ; ')
    : 'no scenarios to verify'
  const seeds = votes.filter(Boolean).flatMap(v => v.seeds || [])
  return { refuted: failing.length > 0 || blocked.length > 0 || refuters.length > 0, evidence, failingTest, seeds }
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
    `Prompts directory: ${SKILL_DIR}/prompts (every prompt file named in these instructions is there).`,
    `Target repo: ${REPO}`,
    'Inputs (JSON):',
    JSON.stringify(vars || {}, null, 2),
  ].join('\n')
  const { label, ...rest } = opts
  const fullLabel = label ? `${role}:${label}` : role
  let o = { ...rest, label: fullLabel }
  for (let attempt = 0; attempt < 2; attempt++) {
    spent++
    let out = null
    let err = ''
    try {
      out = await agent(prompt, o)
    } catch (e) {
      out = null
      err = e && e.message ? e.message : String(e)
    }
    if (out !== null && out !== undefined) return out
    // an unavailable model must never cost the slice a verdict: the retry inherits the session model
    if (o.model) {
      log(`${fullLabel}: model ${o.model} failed (${err || 'no result'}); retrying on the session model`)
      const { model, ...inherit } = o
      o = inherit
    }
  }
  return null
}

function reviewOpts(opts) {
  return REVIEW_MODEL ? { ...opts, model: REVIEW_MODEL } : opts
}

async function persist(sliceId, patch) {
  return run('state-writer', { op: 'patch-slice', sliceId, patch }, { schema: OK, effort: 'low', label: sliceId })
}

// the no-progress streak survives relaunches: the driver passes lastKey/streak back in args
let lastKey = A.lastKey || ''
let streak = A.streak || 0
// runs in a row that ended stalled; the driver passes it back like the streak. An action with a new outcome resets it.
let stalledRuns = A.stalledRuns || 0
// the driver relaunches a stalled run every 30 minutes, so this is about 12 hours without progress
const STUCK_LIMIT = 24

function finish(state, reason, history) {
  return { state, reason, agentsSpent: spent, iterations: history, lastKey, streak, stalledRuns }
}

// a run that made no progress: the driver backs off and relaunches, until STUCK_LIMIT such runs in a row end the loop
function stall(reason, history) {
  stalledRuns++
  return finish(stalledRuns >= STUCK_LIMIT ? 'stuck' : 'stalled', reason, history)
}

// the run cannot go on: relaunch at once if it completed an action, back off if it did nothing
function pause(reason, history) {
  return history.length ? finish('continue', reason, history) : stall(reason, history)
}

// ---------- actions ----------

// bootstrap
const COUNT = { type: 'object', properties: { added: { type: 'number' }, reopened: { type: 'number' }, notes: str }, required: ['added'] }
const ENV = { type: 'object', properties: { gitMode: { type: 'string', enum: ['pr', 'direct', 'mr'] }, commands: { type: 'object' }, notes: str }, required: ['gitMode', 'commands'] }
const CRITIC_ROUND_LIMIT = 8

async function bootstrap(next) {
  const P = 'Bootstrap'
  phase(P)
  const env = await run('env-detector', { specPath: A.specPath || null, gitMode: A.gitMode || null, commitFormat: A.commitFormat || null }, { schema: ENV, phase: P })
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
  if (action === 'park') await testReport(id, 'park')
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
    tooBig: { type: 'boolean' },
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
    // an oversized slice is split before anyone reviews or builds it; critics and fix rounds on it are wasted work
    if (plan && plan.tooBig) return 'tooBig'
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
    const planned = await planPhase(id, counters)
    if (planned === 'tooBig') {
      // jump straight to the split rung of the ladder
      counters.ladderStep = Math.max(counters.ladderStep, 1)
      return escalate(id, s, counters, 'planner judged the slice too big for one reviewable change')
    }
    if (!planned) return escalate(id, s, counters, 'plan refuted 3 times')
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
// inconclusive: a required command could not run to completion (cut off or killed), which is not a failing result
const IMPL = { type: 'object', properties: { green: { type: 'boolean' }, inconclusive: { type: 'boolean' }, notes: str }, required: ['green'] }
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
  properties: { state: { type: 'string', enum: ['merged', 'awaiting-merge', 'failed', 'inconclusive'] }, commit: str, pr: str, notes: str },
  required: ['state'],
}
const VERIFY_LENSES = ['spec-fidelity', 'regression']
const REVIEW_LENSES = ['security', 'architecture', 'test-quality']
const FIX_ROUND_LIMIT = 3
const STREAK_LIMIT = 3
const BLOCKING_JUDGE_LIMIT = 5
const ROUND_COST = 35

async function reviewPhase(id, round) {
  phase('Review')
  const reports = await parallel(REVIEW_LENSES.map(lens => () =>
    run('reviewer', { sliceId: id, lens, round }, reviewOpts({ schema: FINDINGS, phase: 'Review', label: `${id}:${lens}` }))))
  const missing = REVIEW_LENSES
    .filter((lens, i) => !reports[i])
    .map(lens => ({ title: `reviewer ${lens} failed to report`, detail: 'Re-run review; no evidence the slice is clean for this lens.', blocking: true }))
  const findings = reports.filter(Boolean).flatMap(r => r.findings || [])
  const seeds = findings.filter(f => !f.blocking)
  const blockingFound = findings.filter(f => f.blocking)
  if (blockingFound.length > BLOCKING_JUDGE_LIMIT) {
    log(`${id} review r${round}: judging ${blockingFound.length} blocking findings ${BLOCKING_JUDGE_LIMIT} at a time, until one holds; reviewers re-report the rest next round`)
  }
  // a batch that is refuted whole must not let the unjudged findings through: judge on until one holds or none are left
  let held = []
  for (let at = 0; at < blockingFound.length && !held.length; at += BLOCKING_JUDGE_LIMIT) {
    const judged = await parallel(blockingFound.slice(at, at + BLOCKING_JUDGE_LIMIT).map((f, i) => async () => {
      const votes = await parallel([0, 1, 2].map(k => () =>
        run('finding-refuter', { sliceId: id, finding: f, voter: k }, { schema: VOTE, phase: 'Review', label: `${id}:f${at + i}v${k}` })))
      return refutedByMajority(votes) ? null : f
    }))
    held = judged.filter(Boolean)
  }
  return { blocking: [...missing, ...held], seeds }
}

// verify one round: plan scenarios and their profiles, build missing tools, then the core lenses and the
// profile group in parallel, then fold the profile agents' test commits into the slice branch
const VPLAN = {
  type: 'object',
  properties: {
    scenarios: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: str, title: str, requirementIds: { type: 'array', items: str }, profiles: { type: 'array', items: { type: 'string', enum: PROFILES } } },
        required: ['id', 'title', 'requirementIds', 'profiles'],
      },
    },
    tools: {
      type: 'array',
      items: { type: 'object', properties: { id: str, profile: str, purpose: str, exists: { type: 'boolean' } }, required: ['id', 'profile', 'purpose', 'exists'] },
    },
    risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    riskReason: str,
    // only on a plan made after a review fix: the ids of the scenarios it added for the fix
    added: { type: 'array', items: str },
    notes: str,
  },
  required: ['scenarios', 'tools', 'risk'],
}
const TOOLS = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    built: { type: 'array', items: str },
    failed: { type: 'array', items: { type: 'object', properties: { id: str, reason: str }, required: ['id', 'reason'] } },
    notes: str,
  },
  required: ['ok'],
}
const PVOTE = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    evidence: str,
    failingTest: str,
    seeds: { type: 'array', items: SEED },
    blocked: { type: 'array', items: { type: 'object', properties: { scenarioId: str, reason: str }, required: ['scenarioId', 'reason'] } },
    failedScenarios: { type: 'array', items: str },
    cases: { type: 'number' },
    passed: { type: 'number' },
  },
  required: ['refuted', 'evidence'],
}

// The first round plans and runs the whole group. A fix round reuses that plan and re-runs only the
// (scenario, profile) pairs that failed or were blocked: the regression lens re-runs every committed test.
// reviewFix: the last round passed verification and the code then changed to fix review findings, so nothing is
// pending and the new code has no boundary tests yet; the planner adds scenarios for the fix and only those run
async function verifyPhase(id, round, prev = null, reviewFix = false) {
  phase('Verify')
  let plan = prev && prev.plan
  let planRound = prev ? prev.planRound : round
  let groups = []
  let tools = []
  const replan = plan && reviewFix
    ? await run('verify-planner', { sliceId: id, round, after: 'review-fix' }, { schema: VPLAN, phase: 'Verify', label: `${id}:r${round}` })
    : null
  if (plan && reviewFix && !replan) log(`${id} verify r${round}: verify-planner could not plan the review fix; keeping the plan from r${planRound}`)
  if (replan) {
    plan = replan
    planRound = round
    const added = new Set(plan.added || [])
    const cap = RISK_AGENTS[plan.risk] || PROFILE_AGENT_LIMIT
    const capped = capProfiles((plan.scenarios || []).filter(sc => added.has(sc.id)), cap)
    groups = groupScenarios(capped.scenarios, cap)
    tools = (plan.tools || []).filter(t => !t.exists)
    log(`${id} verify r${round}: ${added.size} scenario(s) added for the review fix`)
  } else if (plan) {
    groups = groupScenarios(pairsToScenarios(prev.pending), RISK_AGENTS[plan.risk] || PROFILE_AGENT_LIMIT)
    const failedTools = new Set((prev.unavailable || []).map(u => u.id))
    tools = (prev.missing || []).filter(t => failedTools.has(t.id))
    log(`${id} verify r${round}: re-running ${prev.pending.length} failed (scenario, profile) pair(s) from plan r${planRound}`)
  } else {
    plan = await run('verify-planner', { sliceId: id, round }, { schema: VPLAN, phase: 'Verify', label: `${id}:r${round}` })
    planRound = round
    if (plan) {
      const cap = RISK_AGENTS[plan.risk] || PROFILE_AGENT_LIMIT
      const capped = capProfiles(plan.scenarios, cap)
      if (capped.dropped.length) log(`${id} verify r${round}: ${plan.risk} risk allows ${cap} profile(s); dropped ${capped.dropped.join(', ')}`)
      groups = groupScenarios(capped.scenarios, cap)
      tools = (plan.tools || []).filter(t => !t.exists)
    }
  }
  let unavailable = []
  if (tools.length) {
    const t = await run('verify-toolsmith', { sliceId: id, round, tools }, { schema: TOOLS, phase: 'Verify', label: `${id}:r${round}` })
    unavailable = t ? t.failed || [] : tools.map(m => ({ id: m.id, reason: 'verify-toolsmith failed to report' }))
    if (unavailable.length) log(`${id} verify r${round}: ${unavailable.length} tool(s) unavailable: ${unavailable.map(u => u.id).join(', ')}`)
  }
  const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`
  const profileRun = g => run(`verify-${g.profile}`, { sliceId: id, round, planRound, part: g.part, scenarioIds: g.scenarioIds, branch: branch(g), unavailableTools: unavailable },
    { schema: PVOTE, phase: 'Verify', label: `${id}:r${round}:${g.profile}${g.part ? `#${g.part}` : ''}` })
  const all = await parallel([
    ...VERIFY_LENSES.map(lens => () => {
      const opts = { schema: VOTE, phase: 'Verify', label: `${id}:${lens}` }
      return run('verifier', { sliceId: id, lens, round }, lens === 'spec-fidelity' ? reviewOpts(opts) : opts)
    }),
    async () => {
      const out = []
      for (const batch of chunk(groups, PROFILE_BATCH)) out.push(...(await parallel(batch.map(g => () => profileRun(g)))))
      return out
    },
  ])
  const core = all.slice(0, VERIFY_LENSES.length)
  const profiles = all[VERIFY_LENSES.length] || groups.map(() => null)
  let pending = pendingPairs(profiles, groups)
  if (groups.length) {
    const c = await run('verify-collector', { sliceId: id, round, branches: groups.map(branch) }, { schema: OK, phase: 'Verify', label: `${id}:r${round}` })
    if (!c || !c.ok) {
      // the tests never reached the slice branch, so the next round runs this round's pairs again
      pending = groups.flatMap(g => g.scenarioIds.map(scenarioId => ({ profile: g.profile, scenarioId })))
      profiles.push({ refuted: true, evidence: `verify-collector could not fold the profile tests into sdlc/${id}: ${c ? c.notes || '' : 'no report'}` })
      groups.push({ profile: 'collector', part: 0, scenarioIds: [] })
    }
  }
  const pv = plan
    ? profileVote(profiles, groups)
    : { refuted: true, evidence: 'verify-planner failed to report; no scenario was verified at its boundary', failingTest: '' }
  if (plan && !groups.length && !prev) log(`${id} verify r${round}: planner tagged no scenario with a known profile`)
  const next = plan ? { plan, planRound, pending, unavailable, missing: tools.length ? tools : (prev && prev.missing) || [] } : null
  return { votes: [core[0], pv, core[1]], lenses: ['spec-fidelity', 'profiles', 'regression'], next }
}

async function buildLoop(id, counters) {
  let evidence = []
  // out-of-scope hardening ideas from verifiers never block; they ride along to the bar raiser
  const verifySeeds = []
  // the round-0 plan carries into fix rounds within this run; a resumed run plans again
  let prevVerify = null
  // set when a review finding sends the slice back to the implementer, until the next verification has run
  let reviewFix = false
  while (counters.fixRounds < FIX_ROUND_LIMIT) {
    if (spent + ROUND_COST > CAP) return { ok: false, paused: true, seeds: [], lastEvidence: evidence }
    const round = counters.fixRounds
    phase('Implement')
    let impl = await run('implementer', { sliceId: id, fixRound: round, evidence }, { schema: IMPL, phase: 'Implement', label: `${id}:r${round}` })
    if (impl && !impl.green && impl.inconclusive) {
      // a command that never finished proves nothing, so it must not spend a fix round
      log(`${id} r${round}: implementer could not finish a required command; re-running it (no fix round spent)`)
      impl = await run('implementer', { sliceId: id, fixRound: round, evidence, rerun: 'inconclusive' }, { schema: IMPL, phase: 'Implement', label: `${id}:r${round}:rerun` })
    }
    if (!impl || !impl.green) {
      evidence = [impl
        ? `implementer could not get green${impl.inconclusive ? ' (a required command still did not finish)' : ''}: ${impl.notes || ''}`
        : 'implementer failed to report']
    } else {
      const { votes, lenses, next } = await verifyPhase(id, round, prevVerify, reviewFix)
      prevVerify = next
      reviewFix = false
      const v = tallyVerify(votes, lenses)
      verifySeeds.push(...votes.filter(Boolean).flatMap(x => x.seeds || []))
      log(`${id} verify r${round}: ${v.refutations}/${votes.length} refuted, ${v.failingTests.length} failing test(s)`)
      if (!v.pass) {
        evidence = votes.map((x, i) => (x
          ? `[${lenses[i]}] ${x.refuted ? 'REFUTED' : 'ok'}: ${x.evidence}${x.failingTest ? ` failing test: ${x.failingTest}` : ''}`
          : `[${lenses[i]}] verifier failed to report`))
      } else {
        const review = await reviewPhase(id, round)
        log(`${id} review r${round}: ${review.blocking.length} blocking, ${review.seeds.length} seed(s)`)
        if (!review.blocking.length) return { ok: true, seeds: [...review.seeds, ...verifySeeds], lastEvidence: [] }
        evidence = review.blocking.map(f => `[review] ${f.title}: ${f.detail}${f.file ? ` (${f.file})` : ''}`)
        reviewFix = true
      }
    }
    counters.fixRounds++
    await persist(id, { counters })
  }
  return { ok: false, seeds: [], lastEvidence: evidence }
}

async function integrate(id, s, counters, seeds, mode = 'ship') {
  if (mode === 'ship') await testReport(id, 'ship')
  phase('Integrate')
  let r = await run('integrator', { sliceId: id, mode, seeds }, { schema: INTEGRATE, phase: 'Integrate', label: id })
  if (r && r.state === 'inconclusive') {
    log(`${id}: final check could not finish (${r.notes || 'no notes'}); re-running the integrator`)
    r = await run('integrator', { sliceId: id, mode, seeds, rerun: 'inconclusive' }, { schema: INTEGRATE, phase: 'Integrate', label: `${id}:rerun` })
    // still unfinished: stay in integrate for the next iteration instead of spending a ladder step on an unknown result
    if (r && r.state === 'inconclusive') return `${id} integrate inconclusive: ${r.notes || 'final check did not finish'}`
  }
  if (!r || r.state === 'failed') return escalate(id, s, counters, `integration failed: ${r ? r.notes || '' : 'integrator did not report'}`)
  return `${id} ${r.state}${r.pr ? ' ' + r.pr : ''}${r.commit ? ' ' + r.commit : ''}`
}

// the slice's test completion report (REPORT.md), for the human; it never blocks the slice
async function testReport(id, mode) {
  phase('Report')
  const r = await run('test-reporter', { sliceId: id, mode }, { schema: OK, phase: 'Report', label: id })
  if (!r || !r.ok) log(`${id}: test-reporter did not write REPORT.md (${r ? r.notes || '' : 'no report'})`)
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

// milestone behavior verification: a black-box campaign against the running system.
// Scenarios come from the spec (every expected outcome cites it), critics hunt for missing corner cases,
// runners drive the real stack (API, UI, database, logs, metrics), and judges reproduce every failure
// before it becomes a fix slice.
const SCENARIO_PLAN = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    areas: { type: 'array', items: { type: 'object', properties: { id: str, scenarioIds: { type: 'array', items: str } }, required: ['id', 'scenarioIds'] } },
    notes: str,
  },
  required: ['ok', 'areas'],
}
const HARNESS = { type: 'object', properties: { ok: { type: 'boolean' }, channels: { type: 'array', items: str }, notes: str }, required: ['ok'] }
const SCENARIO_RESULTS = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          scenarioId: str,
          status: { type: 'string', enum: ['pass', 'fail', 'blocked'] },
          requirementIds: { type: 'array', items: str },
          specRef: str,
          expected: str,
          observed: str,
          evidence: str,
          test: str,
        },
        required: ['scenarioId', 'status', 'evidence'],
      },
    },
  },
  required: ['results'],
}
const JUDGED = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    classification: { type: 'string', enum: ['product-bug', 'test-bug', 'spec-gap', 'out-of-scope', 'flaky'] },
    evidence: str,
  },
  required: ['refuted', 'evidence'],
}
const MS_WRITE = { type: 'object', properties: { ok: { type: 'boolean' }, status: str, attempt: { type: 'number' }, fixSlices: { type: 'array', items: str }, notes: str }, required: ['ok'] }
const COVERAGE_LENSES = ['spec-coverage', 'adversary', 'observability']
const COVERAGE_ROUND_LIMIT = 3
const RUNNER_BATCH = 3
const FAIL_JUDGE_LIMIT = 8

// the classification most refuting voters agree on; ties fall back to the first refuting voter
function dismissalClass(votes) {
  const counts = {}
  for (const v of votes) if (v && v.refuted === true && v.classification) counts[v.classification] = (counts[v.classification] || 0) + 1
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : 'test-bug'
}

async function milestonePlan(next) {
  phase('Behavior plan')
  const r = await run('milestone-planner', { reason: next.reason }, { schema: COUNT, phase: 'Behavior plan' })
  if (!r) return 'milestone planning aborted: milestone-planner failed'
  return `milestones planned: ${r.added}${r.notes ? ` (${r.notes})` : ''}`
}

async function scenarioPlan(mid, rerun) {
  let critiques = []
  let latest = null
  for (let rev = 0; rev <= COVERAGE_ROUND_LIMIT; rev++) {
    const p = await run('scenario-planner', { milestoneId: mid, revision: rev, rerun, critiques },
      { schema: SCENARIO_PLAN, effort: rerun ? 'low' : undefined, phase: 'Behavior plan', label: `${mid}:r${rev}` })
    if (!p || !p.ok || !(p.areas || []).length) {
      critiques = [p ? `scenario-planner reported not ok: ${p.notes || ''}` : 'scenario-planner failed to report']
      continue
    }
    latest = p
    // a re-run replays the scenarios already planned and reviewed; the last revision gets no further critique
    if (rerun || rev === COVERAGE_ROUND_LIMIT) return latest
    const votes = await parallel(COVERAGE_LENSES.map(lens => () =>
      run('coverage-critic', { milestoneId: mid, lens, revision: rev }, { schema: VOTE, phase: 'Behavior plan', label: `${mid}:${lens}` })))
    if (allClear(votes)) return latest
    critiques = votes
      .map((v, i) => (!isRefuting(v) ? null : v ? `[${COVERAGE_LENSES[i]}] ${v.evidence}` : `[${COVERAGE_LENSES[i]}] critic failed to report`))
      .filter(Boolean)
    log(`${mid} scenario coverage r${rev}: ${critiques.length}/${votes.length} critics found gaps`)
  }
  return latest
}

async function writeMilestone(mid, report) {
  const w = await run('milestone-writer', { milestoneId: mid, ...report }, { schema: MS_WRITE, phase: 'Behavior judge', label: mid })
  if (!w || !w.ok) return `${mid} ${report.outcome}; milestone-writer did not confirm`
  const fixes = (w.fixSlices || []).length ? `; fix slices ${w.fixSlices.join(', ')}` : ''
  return `${mid} ${w.status || report.outcome} (attempt ${w.attempt || '?'}): ${report.summary}${fixes}`
}

async function milestoneAction(next) {
  const mid = next.milestoneId
  const m = next.milestone || {}
  const rerun = m.status === 'fixing'
  phase('Behavior plan')
  const plan = await scenarioPlan(mid, rerun)
  if (!plan) return writeMilestone(mid, { outcome: 'blocked', summary: 'scenario planning failed', results: [], confirmed: [], dismissed: [], unjudged: [], blocked: [] })
  phase('Behavior run')
  const h = await run('e2e-harness', { milestoneId: mid, rerun }, { schema: HARNESS, phase: 'Behavior run', label: mid })
  if (!h || !h.ok) {
    return writeMilestone(mid, { outcome: 'blocked', summary: `stack or harness not runnable: ${h ? h.notes || '' : 'e2e-harness failed to report'}`, results: [], confirmed: [], dismissed: [], unjudged: [], blocked: [] })
  }
  const results = []
  // batches keep the number of agents hammering one local stack (and the laptop) bounded
  for (const batch of chunk(plan.areas, RUNNER_BATCH)) {
    const outs = await parallel(batch.map(a => () =>
      run('scenario-runner', { milestoneId: mid, areaId: a.id, scenarioIds: a.scenarioIds, channels: h.channels || [] },
        { schema: SCENARIO_RESULTS, phase: 'Behavior run', label: `${mid}:${a.id}` })))
    outs.forEach((o, i) => {
      if (o) results.push(...(o.results || []))
      else results.push(...batch[i].scenarioIds.map(scenarioId => ({ scenarioId, status: 'blocked', evidence: 'scenario-runner failed to report' })))
    })
  }
  const fails = results.filter(r => r.status === 'fail')
  const blocked = results.filter(r => r.status === 'blocked')
  const passed = results.filter(r => r.status === 'pass').length
  if (fails.length > FAIL_JUDGE_LIMIT) log(`${mid}: judging ${FAIL_JUDGE_LIMIT} of ${fails.length} failures; the rest carry to the re-run`)
  phase('Behavior judge')
  const judged = await parallel(fails.slice(0, FAIL_JUDGE_LIMIT).map((f, fi) => async () => {
    const votes = await parallel([0, 1, 2].map(k => () =>
      run('behavior-judge', { milestoneId: mid, result: f, voter: k }, { schema: JUDGED, phase: 'Behavior judge', label: `${mid}:f${fi}v${k}` })))
    const notes = votes.filter(Boolean).map(v => v.evidence)
    // like review findings: only explicit refutations dismiss a failure, dead judges never do
    return refutedByMajority(votes)
      ? { ...f, verdict: dismissalClass(votes), judgeNotes: notes }
      : { ...f, verdict: 'product-bug', judgeNotes: notes }
  }))
  const confirmed = judged.filter(j => j.verdict === 'product-bug')
  const dismissed = judged.filter(j => j.verdict !== 'product-bug')
  const unjudged = fails.slice(FAIL_JUDGE_LIMIT)
  const outcome = confirmed.length || unjudged.length ? 'bugs' : blocked.length ? 'partial' : 'verified'
  const summary = `${passed}/${results.length} scenarios passed, ${confirmed.length} confirmed bug(s), ${dismissed.length} dismissed, ${blocked.length} blocked`
  log(`${mid} behavior: ${summary}`)
  // passing results stay in the runners' reports; only what needs a decision travels on
  return writeMilestone(mid, { outcome, summary, total: results.length, passed, confirmed, dismissed, unjudged, blocked })
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
const ACTIONS = { bootstrap, slice: sliceAction, parkedRetry, retryMerge, milestonePlan, milestone: milestoneAction, audit, livelock, barRaiserRound }

const INTERNALS = {
  run, persist, hasHeadroom, spent: () => spent,
  tallyVerify, allClear, survives, refutedByMajority, ideaKey, dedupeIdeas, tallyAudit, normalizeCounters, chunk,
  PROFILES, RISK_AGENTS, PROFILE_BATCH, REVIEW_MODEL, reviewOpts, groupScenarios, capProfiles, pairsToScenarios, pendingPairs, profileVote,
  bootstrap,
  decisionPanel, escalate,
  planPhase, testsPhase, sliceAction,
  reviewPhase, verifyPhase, buildLoop, integrate, testReport, parkedRetry, retryMerge,
  dismissalClass, milestonePlan, scenarioPlan, milestoneAction,
  audit, livelock,
  barRaiserRound,
}

async function main() {
  const history = []
  for (let iteration = 0; ; iteration++) {
    if (iteration >= MAX_ITER) return finish('continue', `max iterations (${MAX_ITER}) reached`, history)
    phase('Read state')
    const next = await run('state-reader', { iteration, specPath: A.specPath || null, barRaiserRounds: BAR_RAISER_ROUNDS }, { schema: NEXT, effort: 'low', phase: 'Read state' })
    if (!next) return pause('state reader failed twice', history)
    log(`#${iteration} → ${next.action}${next.sliceId ? ' ' + next.sliceId : ''}${next.milestoneId ? ' ' + next.milestoneId : ''}: ${next.reason}`)
    if (next.action === 'stop') return finish('stopped', next.reason, history)
    if (next.action === 'done') return finish('done', next.summary || next.reason, history)
    if (next.action === 'wait') return finish('waiting', next.reason, history)
    if (next.action === 'barRaiserRound' && !BAR_RAISER_ROUNDS) {
      return finish('done', `spec complete; bar raiser off (run /sdlc with --bar-raiser N to polish). ${next.reason}`, history)
    }
    if (!hasHeadroom(next.action)) {
      return pause(`agent cap or budget: ${spent}/${CAP} agents spent, ${next.action} needs ~${COST[next.action] || 60}`, history)
    }
    const act = ACTIONS[next.action]
    if (!act) return pause(`unknown action: ${next.action}`, history)
    const outcome = await act(next)
    history.push({ action: next.action, sliceId: next.sliceId || null, outcome })
    if (next.action === 'livelock') return finish('livelock', outcome, history)
    const key = `${next.action}|${next.sliceId || next.milestoneId || ''}|${outcome}`
    streak = key === lastKey ? streak + 1 : 1
    if (streak === 1) stalledRuns = 0
    lastKey = key
    if (streak >= STREAK_LIMIT) {
      if (!next.sliceId) return stall(`no progress: "${key}" repeated ${streak} times`, history)
      // a PR that keeps waiting needs a human, not a park
      if (next.action === 'retryMerge') return finish('waiting', `${next.sliceId} still awaiting merge: ${outcome}`, history)
      const kind = (next.slice && next.slice.kind) || 'spec'
      const fp = await run('state-writer', { op: 'force-park', sliceId: next.sliceId, kind, reason: `no progress: ${outcome} (x${STREAK_LIMIT})` }, { schema: OK, effort: 'low', label: next.sliceId })
      if (!fp || !fp.ok) return stall(`force-park failed for ${next.sliceId} after: ${outcome}`, history)
      log(`${next.sliceId} force-parked after ${STREAK_LIMIT} identical outcomes`)
      lastKey = ''
      streak = 0
    }
  }
}

return await main() // @entry
