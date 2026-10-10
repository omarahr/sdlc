import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.env.VERIFY_REPO
const LOG = process.env.VERIFY_LOG
const kit = (f) => import(join(REPO, 'skills/sdlc/test/testkit', f))
const { cliRunner } = await kit('cli-runner.mjs')
const { stubServer, restrictedPath } = await kit('stub-server.mjs')
const { glabStub } = await kit('glab-stub.mjs')
const { load } = await kit('attack-corpus.mjs')

const r = cliRunner()
const KEYS = ['args', 'command', 'derived', 'forge', 'format', 'given', 'notes', 'ok', 'rules', 'samples', 'suggestion']

function repoFor(forge, extra = {}) {
  return r.gitRepo({ files: { '.sdlc/config.json': { gitMode: 'pr', forge, ...extra } } })
}
const ghObj = (name, operator, pattern, extra = {}) => ({ type: 'branch_name_pattern', parameters: { name, operator, pattern, ...extra } })

function pre({ forge = 'github', body, stub, args = [], mode = 'pr', config = {}, timeoutMs, env } = {}) {
  const repo = repoFor(forge, config)
  const s = stub ?? (forge === 'github'
    ? stubServer({ name: 'gh', fallback: { stdout: typeof body === 'string' ? body : JSON.stringify(body ?? []) } })
    : glabStub({ fallback: { stdout: typeof body === 'string' ? body : JSON.stringify(body ?? null) } }))
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...args], { env: { ...s.env(), ...(env ?? {}) }, timeoutMs })
  return { t, s, repo, out: t.json }
}

function record(entry) {
  if (LOG) appendFileSync(LOG, `${JSON.stringify(entry)}\n`)
}

function attack(id, charter, input, expected, fn, { scope = true } = {}) {
  test(`verify security: ${id} ${charter}`, () => {
    let observed = ''
    let problem = null
    try {
      const res = fn()
      observed = res.observed
      problem = res.problem ?? null
    } catch (e) {
      problem = `test error: ${e.message}`
      observed = problem
    }
    const result = problem === null ? 'held' : scope ? 'broke' : 'out-of-scope'
    record({ id, charter, input, expected, observed: problem === null ? observed : `${problem} | ${observed}`, result })
    if (scope) assert.equal(problem, null, problem ?? '')
  })
}

const names = (o) => o.samples.map((s) => s.name)
const results = (o) => o.samples.map((s) => s.result)
const summary = (p) => `exit ${p.t.status}; ok ${p.out?.ok}; format ${p.out?.format}; derived ${p.out?.derived}; rules ${p.out?.rules?.length}; results ${[...new Set(results(p.out ?? { samples: [] }))]}; suggestion ${JSON.stringify((p.out?.suggestion ?? '').slice(0, 90))}`
const cleanTree = (p) => (p.t.treeUnchanged ? null : 'repo tree changed')
const onlyReads = (s) => s.calls().every((c) => c.argv[0] === 'api' && c.argv.length === 2 && /^repos\/\{owner\}\/\{repo\}\/rules\/branches\/sdlc%2F|^repos\/\{owner\}\/\{repo\}\/rules\/branches\/[^/]+$/.test(c.argv[1]) || (c.argv[0] === 'api' && c.argv[1] === 'projects/:fullpath/push_rule' && c.argv.length === 2))
const first = (...ps) => ps.find((p) => p) ?? null

function expectOk(p, extra = {}) {
  return first(
    p.t.status === 0 ? null : `exit ${p.t.status}`,
    p.out?.ok === true ? null : 'ok not true',
    p.out?.format === (extra.format ?? 'sdlc/{name}') ? null : `format ${p.out?.format}`,
    p.out?.derived === false ? null : 'derived true',
    p.out?.suggestion === '' ? null : 'suggestion not empty',
    results(p.out).includes('fail') ? 'a sample failed' : null,
    cleanTree(p),
    onlyReads(p.s) ? null : 'the shim saw a call that is not a read',
  )
}

for (const forge of ['github', 'glab']) {
  const mk = (pattern) => (forge === 'github' ? [ghObj('r', 'regex', pattern)] : { branch_name_regex: pattern })
  const f = forge === 'github' ? 'github' : 'gitlab'
  attack(`TC-sec-1-${forge}`, 'VS-1 regex rule that the default satisfies', `^[a-z]+/.+ via ${forge}`, 'exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample', () => {
    const p = pre({ forge: f, body: mk('^[a-z]+/.+') })
    return { observed: summary(p), problem: expectOk(p) }
  })
  for (const [tag, pattern, passes] of [
    ['unanchored', '[a-z]+/.+', true],
    ['inline-ignorecase-upper', '(?i)^SDLC/', true],
    ['case-sensitive-upper', '^SDLC/', false],
    ['nested-name', '^[a-z]+/[a-z]+/.+', false],
    ['anchored-end-too-short', '^[a-z]+/.{40,}$', false],
    ['lookahead', '^(?=sdlc/).+', true],
  ]) {
    attack(`TC-sec-1-${forge}-${tag}`, `VS-1 near variant ${tag}`, `${pattern} via ${forge}`, passes ? 'ok with the default, nothing derived' : 'exit 1 and a --branch-format suggestion, not a derived format', () => {
      const p = pre({ forge: f, body: mk(pattern) })
      const problem = passes
        ? expectOk(p)
        : first(p.t.status === 1 ? null : `exit ${p.t.status}`, p.out?.ok === false ? null : 'ok not false', p.out?.derived === false ? null : 'derived true',
            p.out?.suggestion.includes('--branch-format') ? null : 'no suggestion', cleanTree(p))
      return { observed: summary(p), problem }
    })
  }
}

attack('TC-sec-1-calls', 'VS-1 the gh shim is only asked to read', 'one regex rule, three sample names', 'every call is `api repos/{owner}/{repo}/rules/branches/<encoded name>`; slash is percent-encoded', () => {
  const p = pre({ body: [ghObj('r', 'regex', '^[a-z]+/.+')] })
  const argv = p.s.calls().map((c) => c.argv.join(' '))
  const bad = argv.filter((a) => !/^api repos\/\{owner\}\/\{repo\}\/rules\/branches\/[A-Za-z0-9%._-]+$/.test(a) || a.split('branches/')[1].includes('/'))
  return { observed: argv.join(' ; '), problem: bad.length ? `unexpected calls ${JSON.stringify(bad)}` : null }
})

attack('TC-sec-2-two', 'VS-2 two rules, no derivation', 'starts_with feature/ (alpha) + ends_with -x (beta)', 'exit 1, derived false, labels alpha or beta on each failing sample, --branch-format in suggestion', () => {
  const p = pre({ body: [ghObj('alpha', 'starts_with', 'feature/'), ghObj('beta', 'ends_with', '-x')] })
  const fails = p.out.samples.filter((s) => s.result === 'fail')
  return {
    observed: summary(p) + `; fail rules ${fails.map((s) => s.rule)}`,
    problem: first(p.t.status === 1 ? null : `exit ${p.t.status}`, p.out.derived === false ? null : 'derived', p.out.format === 'sdlc/{name}' ? null : `format ${p.out.format}`,
      fails.length && fails.every((s) => ['alpha', 'beta'].includes(s.rule)) ? null : 'a failing sample has a wrong label',
      p.out.suggestion.includes('--branch-format') ? null : 'no suggestion', cleanTree(p)),
  }
})
attack('TC-sec-2-three', 'VS-2 three rules, no derivation', 'three starts_with rules', 'derived false', () => {
  const p = pre({ body: [ghObj('a', 'starts_with', 'f/'), ghObj('b', 'starts_with', 'g/'), ghObj('c', 'contains', 'h')] })
  return { observed: summary(p), problem: first(p.out.derived === false ? null : 'derived', p.t.status === 1 ? null : `exit ${p.t.status}`, cleanTree(p)) }
})
for (const op of ['starts_with', 'ends_with', 'contains', 'regex']) {
  attack(`TC-sec-2-neg-${op}`, `VS-2 negated ${op} rule that the default fails`, `${op} negate true`, 'exit 1, derived false, labelled failing samples, suggestion with --branch-format', () => {
    const pattern = op === 'starts_with' ? 'sdlc/' : op === 'ends_with' ? '001' : op === 'contains' ? 'sdlc' : '^sdlc/'
    const p = pre({ body: [ghObj('neg', op, pattern, { negate: true })] })
    const fails = p.out.samples.filter((s) => s.result === 'fail')
    return {
      observed: summary(p) + `; fail rules ${fails.map((s) => s.rule)}`,
      problem: first(p.t.status === 1 ? null : `exit ${p.t.status}`, p.out.derived === false ? null : 'derived', p.out.format === 'sdlc/{name}' ? null : `format ${p.out.format}`,
        fails.length && fails.every((s) => s.rule === 'neg') ? null : 'wrong label', p.out.suggestion.includes('--branch-format') ? null : 'no suggestion', cleanTree(p)),
    }
  })
}
attack('TC-sec-2-neg-passing', 'VS-2 negated rule that the default passes gives ok', 'not starts_with zzz/', 'exit 0, ok', () => {
  const p = pre({ body: [ghObj('neg', 'starts_with', 'zzz/', { negate: true })] })
  return { observed: summary(p), problem: expectOk(p) }
})
attack('TC-sec-2-dup', 'VS-2 two identical rules collapse into one and may derive', 'two equal starts_with feature/ rules', 'a derived format only when the derived format passes the second verdict', () => {
  const rule = ghObj('same', 'starts_with', 'feature/')
  const p = pre({ body: [rule, rule] })
  return { observed: summary(p), problem: first(p.out.ok === true && p.out.derived === true && p.out.format === 'feature/sdlc/{name}' ? null : 'unexpected result', cleanTree(p)) }
})
attack('TC-sec-2-hostile-derive', 'VS-2 a starts_with pattern that would make an unsafe derived format', 'patterns with a second placeholder, "..", spaces, "@{", "~", a leading dash', 'derived never carries an invalid git ref; the run does not crash', () => {
  const bad = ['{name}', '..', 'a b/', 'a@{b/', '~x/', '-x/', 'a\nb/', '/', '.lock/']
  const seen = []
  let problem = null
  for (const pat of bad) {
    const p = pre({ body: [ghObj('h', 'starts_with', pat)] })
    seen.push(`${JSON.stringify(pat)} -> exit ${p.t.status} derived ${p.out?.derived} format ${p.out?.format}`)
    if (!p.out) problem = `no JSON for ${JSON.stringify(pat)}`
    else if (p.out.derived && !/^[A-Za-z0-9._\/-]+\{name\}$|^[A-Za-z0-9._\/-]*\{name\}[A-Za-z0-9._\/-]*$/.test(p.out.format)) problem = `unsafe derived format ${JSON.stringify(p.out.format)}`
    if (!p.t.treeUnchanged) problem = 'repo tree changed'
  }
  return { observed: seen.join(' | '), problem }
})

attack('TC-sec-3-othertype', 'VS-3 only rules of another type', 'pull_request, creation, required_status_checks objects', 'rules empty, every sample pass (not unchecked), ok, derived false, exit 0', () => {
  const p = pre({ body: [{ type: 'pull_request', parameters: {} }, { type: 'creation' }, { type: 'required_status_checks', parameters: {} }] })
  return { observed: summary(p) + `; rules ${JSON.stringify(p.out.rules)}`, problem: first(p.out.rules.length === 0 ? null : 'rules not empty', results(p.out).every((x) => x === 'pass') ? null : 'a sample is not pass', expectOk(p)) }
})
attack('TC-sec-3-typeconfusion', 'VS-3 a failing pattern under the wrong type must not apply', 'commit_message_pattern regex ^zzz/, branch_name_pattern under a changed case, nested wrapper', 'rules empty, ok', () => {
  const p = pre({ body: [
    { type: 'commit_message_pattern', parameters: { operator: 'regex', pattern: '^zzz/' } },
    { type: 'Branch_Name_Pattern', parameters: { operator: 'regex', pattern: '^zzz/' } },
    { type: 'tag_name_pattern', parameters: { operator: 'regex', pattern: '^zzz/' } },
    { rule: { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: '^zzz/' } } },
  ] })
  return { observed: summary(p), problem: first(p.out.rules.length === 0 ? null : 'rules not empty', expectOk(p)) }
})
attack('TC-sec-3-empty', 'VS-3 empty list', '[]', 'rules empty, pass on every sample', () => {
  const p = pre({ body: [] })
  return { observed: summary(p), problem: first(results(p.out).every((x) => x === 'pass') ? null : 'not all pass', expectOk(p)) }
})
attack('TC-sec-3-glab-other', 'VS-3 a GitLab push rule with only other fields', 'commit_message_regex only, empty branch_name_regex, number, list, null body', 'rules empty, pass, ok', () => {
  const seen = []
  let problem = null
  for (const body of [{ commit_message_regex: '^zzz' }, { branch_name_regex: '' }, { branch_name_regex: 5 }, { branch_name_regex: ['^zzz'] }, null, []]) {
    const p = pre({ forge: 'gitlab', body })
    seen.push(`${JSON.stringify(body)} -> exit ${p.t.status} rules ${p.out?.rules?.length} ${[...new Set(results(p.out))]}`)
    problem = problem ?? first(p.out.rules.length === 0 ? null : 'rules not empty', results(p.out).every((x) => x === 'pass') ? null : 'not pass', expectOk(p))
  }
  return { observed: seen.join(' | '), problem }
})
attack('TC-sec-3-persample', 'VS-3 a rule for one sample only fails only that sample', 'gh answers a failing rule for sdlc%2FS-001 and [] for the others', 'only the slice sample can fail; the others pass', () => {
  const repo = repoFor('github')
  const gh = stubServer({ name: 'gh', script: [{ stdout: [ghObj('only', 'regex', '^zzz/')] }], fallback: { stdout: [] } })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: gh.env() })
  const fails = t.json.samples.filter((s) => s.result === 'fail')
  return {
    observed: `exit ${t.status}; ${t.json.samples.map((s) => `${s.kind}:${s.result}`)}`,
    problem: first(fails.length === 1 && fails[0].kind === 'slice' ? null : 'wrong failing samples', t.json.rules.length === 1 ? null : 'rules count', t.json.derived === false ? null : 'derived', t.treeUnchanged ? null : 'tree changed'),
  }
})

attack('TC-sec-4-shape', 'VS-4 public JSON keys and exit codes in all seven scenarios', 'seven scenarios through gh and glab shims', 'the key set is the same in every JSON result; exit codes 0, 0, 1, 0, 0, 1, 2', () => {
  const rows = []
  const run = (label, p, status) => { rows.push(`${label}: exit ${p.t.status} keys ${p.out ? (status === 2 ? Object.keys(p.out).sort().join(',') === 'error,ok' : Object.keys(p.out).sort().join(',') === KEYS.join(',')) : 'n/a'}`); return p.t.status === status }
  const oks = []
  oks.push(run('1 none', pre({ body: [] }), 0))
  const s2 = pre({ body: [ghObj('s', 'starts_with', 'feature/')] })
  oks.push(run('2 derive', s2, 0) && s2.out.format === 'feature/sdlc/{name}' && s2.out.derived === true)
  const s3 = pre({ body: [ghObj('z', 'regex', '^zzz/')] })
  oks.push(run('3 fail', s3, 1) && s3.out.suggestion.startsWith('--branch-format'))
  oks.push(run('4 pass', pre({ body: [ghObj('p', 'regex', '^[a-z]+/.+')] }), 0))
  const s5 = pre({ stub: stubServer({ name: 'gh', fallback: { stdout: '', stderr: 'boom', exit: 1 } }) })
  oks.push(run('5 shim exit 1', s5, 0) && s5.out.notes.some((n) => n.includes('rules unknown')) && results(s5.out).every((x) => x === 'unchecked'))
  const s6 = pre({ forge: 'gitlab', mode: 'mr', args: ['--branch', 'bad-name'], body: { branch_name_regex: '^feat/' } })
  oks.push(run('6 mr bad-name', s6, 1) && s6.out.samples.find((s) => s.kind === 'working')?.result === 'fail')
  const s7 = pre({ args: ['--format', 'feature/x'], body: [] })
  oks.push(run('7 bad format', s7, 2) && Object.keys(s7.out).sort().join() === 'error,ok' && s7.out.ok === false && s7.t.stdout.trim().split('\n').length === 1)
  const keysOk = rows.every((x) => x.endsWith('true') || x.endsWith('n/a') || /keys false/.test(x) === false)
  return { observed: rows.join(' | '), problem: first(oks.every(Boolean) ? null : `scenario mismatch ${oks}`, rows.filter((x) => /keys false/.test(x)).length ? 'key set differs' : null, keysOk ? null : 'keys') }
})

const FORMAT_FAMILIES = ['injection', 'traversal', 'control-chars', 'flag-like-values', 'format-strings', 'unicode-whitespace', 'unicode-confusables', 'oversized']
attack('TC-sec-4-format-corpus', 'VS-4 invalid --format values from the attack corpus', FORMAT_FAMILIES.join(','), 'every value gives one JSON object, exit 0, 1 or 2, no traceback, no tree change; a refusal (exit 2) leaves the verdict out and calls no forge tool', () => {
  const lines = []
  let problem = null
  const gh = stubServer({ name: 'gh', fallback: { stdout: [] } })
  for (const fam of FORMAT_FAMILIES) {
    for (const e of load(fam, { argv: true })) {
      const repo = repoFor('github')
      const before = gh.count()
      const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr', `--format=${e.value}`], { env: gh.env() })
      const called = gh.count() - before
      const one = t.json && typeof t.json === 'object'
      if (!one || ![0, 1, 2].includes(t.status) || /Traceback/.test(t.stderr) || !t.treeUnchanged) problem = `${fam}/${e.id}: exit ${t.status} json ${!!one} tree ${t.treeUnchanged} ${t.stderr.slice(0, 100)}`
      if (t.status === 2 && called) problem = `${fam}/${e.id}: refusal still called the forge ${called} times`
      lines.push(`${fam}/${e.id}:${t.status}`)
    }
  }
  return { observed: `${lines.length} values; ${lines.slice(0, 12).join(' ')} ...`, problem }
})
attack('TC-sec-4-branch-corpus', 'VS-4 --branch values in mr mode against a glab regex', 'injection, traversal, control-chars, flag-like-values, unicode-whitespace', 'one JSON object, exit 0, 1 or 2, no traceback, no tree change', () => {
  const lines = []
  let problem = null
  for (const fam of ['injection', 'traversal', 'control-chars', 'flag-like-values', 'unicode-whitespace']) {
    for (const e of load(fam, { argv: true })) {
      const p = pre({ forge: 'gitlab', mode: 'mr', args: [`--branch=${e.value}`], body: { branch_name_regex: '^feat/' } })
      const one = p.out && typeof p.out === 'object'
      if (!one || ![0, 1, 2].includes(p.t.status) || /Traceback/.test(p.t.stderr) || !p.t.treeUnchanged) problem = `${fam}/${e.id}: exit ${p.t.status} json ${!!one} ${p.t.stderr.slice(0, 100)}`
      lines.push(`${fam}/${e.id}:${p.t.status}`)
    }
  }
  return { observed: `${lines.length} values; ${lines.slice(0, 10).join(' ')} ...`, problem }
})

const BROKEN = [
  ['empty', ''], ['open-brace', '{'], ['truncated-list', '[{"type":"branch_name_pattern"'], ['null', 'null'], ['string', '"x"'], ['number', '123'], ['true', 'true'],
  ['object', '{"type":"branch_name_pattern"}'], ['trailing-garbage', '[] junk'], ['two-docs', '[][]'], ['bom', '\ufeff[]'], ['html', '<html>502 Bad Gateway</html>'],
  ['deep', '['.repeat(200000) + ']'.repeat(200000)],
]
attack('TC-sec-5-malformed', 'VS-5 malformed and non-list gh bodies', BROKEN.map((b) => b[0]).join(','), 'no crash; one JSON object; a note starting rules unknown on github (or an empty-rule pass for a valid list); verdict never fail; tree unchanged', () => {
  const lines = []
  let problem = null
  for (const [tag, body] of BROKEN) {
    const p = pre({ body })
    const unknown = (p.out?.notes ?? []).some((n) => n.startsWith('rules unknown on github'))
    lines.push(`${tag}: exit ${p.t.status} unknown ${unknown} ${[...new Set(results(p.out ?? { samples: [] }))]}`)
    if (!p.out) problem = `${tag}: no JSON, stderr ${p.t.stderr.slice(-120)}`
    else if (p.out.ok !== true || results(p.out).includes('fail') || p.t.status !== 0) problem = `${tag}: verdict ${p.t.status}`
    else if (!unknown || !results(p.out).every((x) => x === 'unchecked')) problem = `${tag}: not reported as unknown`
    if (!p.t.treeUnchanged) problem = `${tag}: tree changed`
  }
  return { observed: lines.join(' | '), problem }
})
attack('TC-sec-5-glab-malformed', 'VS-5 malformed glab push-rule bodies', 'empty, {, null, [], "x", 5, huge nesting', 'no crash; unknown or empty-rule pass; verdict never fail', () => {
  const lines = []
  let problem = null
  for (const [tag, body] of [['empty', ''], ['brace', '{'], ['list', '[]'], ['str', '"x"'], ['num', '5'], ['deep', '{"a":' .repeat(100000)]]) {
    const p = pre({ forge: 'gitlab', body })
    lines.push(`${tag}: exit ${p.t.status} notes ${JSON.stringify(p.out?.notes)}`)
    if (!p.out || p.out.ok !== true || p.t.status !== 0 || results(p.out).includes('fail')) problem = `${tag}: bad verdict ${p.t.status}`
    if (!p.t.treeUnchanged) problem = `${tag}: tree changed`
  }
  return { observed: lines.join(' | '), problem }
})
attack('TC-sec-5-huge', 'VS-5 very large gh bodies', '20 MB list of other-type objects; 20 MB single string rule pattern', 'no crash within 30 s; ok; tree unchanged', () => {
  const big = JSON.stringify(Array.from({ length: 400000 }, () => ({ type: 'pull_request', parameters: { note: 'x'.repeat(30) } })))
  const p1 = pre({ body: big, timeoutMs: 60000 })
  const p2 = pre({ body: JSON.stringify([ghObj('big', 'contains', 'x'.repeat(20 * 1024 * 1024))]), timeoutMs: 60000 })
  return {
    observed: `${(big.length / 1e6).toFixed(1)}MB list: exit ${p1.t.status} ${p1.t.durationMs.toFixed(0)}ms rules ${p1.out?.rules?.length}; 20MB pattern: exit ${p2.t.status} ${p2.t.durationMs.toFixed(0)}ms ok ${p2.out?.ok} out ${p2.t.stdout.length} bytes`,
    problem: first(p1.out?.ok === true ? null : 'huge list failed', p2.out ? null : 'huge pattern: no JSON', p1.t.treeUnchanged && p2.t.treeUnchanged ? null : 'tree changed'),
  }
})
attack('TC-sec-5-control', 'VS-5 control characters in rule text', 'ESC, CR, NUL, U+2028, bidi override in label and pattern', 'one JSON object on one line of stdout; no raw control byte in stdout; tree unchanged', () => {
  const label = 'a\u001b[31m\r\u0000\u2028\u202eb'
  const p = pre({ body: [ghObj(label, 'starts_with', 'x\u001b]0;pwn\u0007/'), ghObj('second', 'regex', '^zzz\n/')] })
  const raw = p.t.stdout
  const rawCtl = /[\u0000-\u0008\u000b-\u001f\u007f\u2028\u202e]/.test(raw.trimEnd())
  return {
    observed: `exit ${p.t.status}; stdout lines ${raw.trimEnd().split('\n').length}; raw control in stdout ${rawCtl}; suggestion ${JSON.stringify(p.out?.suggestion).slice(0, 80)}`,
    problem: first(p.out ? null : 'no JSON', raw.trimEnd().split('\n').length === 1 ? null : 'stdout has several lines', rawCtl ? 'raw control byte in stdout' : null, cleanTree(p)),
  }
})
attack('TC-sec-5-glab-control', 'VS-5 control characters in the glab regex', 'ESC and newline in branch_name_regex', 'one JSON line; no raw control byte', () => {
  const p = pre({ forge: 'gitlab', body: { branch_name_regex: '^zzz\u001b[2J\n/' } })
  const raw = p.t.stdout.trimEnd()
  return { observed: `exit ${p.t.status}; lines ${raw.split('\n').length}`, problem: first(p.out ? null : 'no JSON', raw.split('\n').length === 1 ? null : 'several lines', /[\u0000-\u001f]/.test(raw) ? 'raw control byte' : null, cleanTree(p)) }
})
attack('TC-sec-5-exit-with-json', 'VS-5 gh exits non-zero but prints valid rules', 'exit 3 with a failing rule on stdout', 'treated as unknown, unchecked, ok; the printed rule is ignored', () => {
  const p = pre({ stub: stubServer({ name: 'gh', fallback: { stdout: [ghObj('z', 'regex', '^zzz/')], stderr: 'HTTP 403', exit: 3 } }) })
  return { observed: summary(p) + `; notes ${JSON.stringify(p.out.notes)}`, problem: first(p.out.ok === true && results(p.out).every((x) => x === 'unchecked') ? null : 'rule used or verdict failed', cleanTree(p)) }
})
attack('TC-sec-5-gh-missing', 'VS-5 gh absent from PATH', 'PATH holds python3 and git only', 'ok, unchecked, a note naming the missing tool, no crash', () => {
  const repo = repoFor('github')
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: restrictedPath(['python3', 'git']) } })
  return { observed: `exit ${t.status}; notes ${JSON.stringify(t.json?.notes)}`, problem: first(t.json?.ok === true && t.json.samples.every((s) => s.result === 'unchecked') && t.json.notes.length ? null : 'bad result', t.treeUnchanged ? null : 'tree changed') }
})
attack('TC-sec-5-hang', 'VS-5 a gh shim that never answers', 'stall; one call; limit is the 60 s FORGE_TIMEOUT', 'ok, unchecked, a timeout note, within about 70 s, only one call, no child left running', () => {
  const g = stubServer({ name: 'gh', script: [{ stall: true }] })
  const repo = repoFor('github')
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: g.env(), timeoutMs: 120000 })
  return {
    observed: `exit ${t.status}; ${t.durationMs.toFixed(0)}ms; calls ${g.count()}; notes ${JSON.stringify(t.json?.notes)}`,
    problem: first(t.json?.ok === true && t.json.samples.every((s) => s.result === 'unchecked') ? null : 'bad verdict', t.durationMs < 75000 ? null : 'too slow', g.count() === 1 ? null : `calls ${g.count()}`, t.treeUnchanged ? null : 'tree changed'),
  }
})

const NONSTR = [['int', 5], ['float', 1.5], ['null', null], ['list', ['x']], ['object', { a: 1 }], ['true', true], ['false', false], ['empty-list', []], ['bigint', 1e400]]
const OPS = ['starts_with', 'ends_with', 'contains', 'regex']
const noTrace = (p) => (/Traceback|TypeError/.test(p.t.stderr) ? `traceback: ${p.t.stderr.trim().split('\n').pop()}` : null)
const cannot = (p) => ((p.out?.notes ?? []).some((n) => /cannot evaluate/.test(n)) ? null : `no cannot-evaluate note: ${JSON.stringify(p.out?.notes)}`)

attack('TC-sec-6-gh-matrix', 'VS-6 non-string pattern on every operator, gh', '4 operators x 9 non-string values as the only rule', 'exit 0 or 1, one JSON object, no traceback, cannot-evaluate note, derived false, tree unchanged', () => {
  const lines = []
  let problem = null
  for (const op of OPS) for (const [tag, pat] of NONSTR) {
    const p = pre({ body: [ghObj('n', op, pat)] })
    lines.push(`${op}/${tag}:${p.t.status}`)
    const bad = first(p.out ? null : 'no JSON', [0, 1].includes(p.t.status) ? null : `exit ${p.t.status}`, noTrace(p), p.out && cannot(p), p.out?.derived === false ? null : 'derived', cleanTree(p), p.out && results(p.out).includes('fail') ? 'a sample failed from an unevaluable rule' : null)
    if (bad) problem = problem ?? `${op}/${tag}: ${bad}`
  }
  return { observed: lines.join(' '), problem }
})
attack('TC-sec-6-gh-no-derive', 'VS-6 a non-string starts_with never gives a derived format', 'starts_with 5, null, list, object', 'format stays sdlc/{name}; derived false; suggestion has no repr of the value as a format', () => {
  const lines = []
  let problem = null
  for (const [tag, pat] of NONSTR) {
    const p = pre({ body: [ghObj('n', 'starts_with', pat)] })
    lines.push(`${tag}: format ${p.out?.format} derived ${p.out?.derived} sugg ${JSON.stringify((p.out?.suggestion ?? '').slice(0, 60))}`)
    if (!p.out || p.out.derived !== false || p.out.format !== 'sdlc/{name}' || /--branch-format "(None|\[|\{|True|False|\d)/.test(p.out.suggestion)) problem = problem ?? `${tag}: derived something`
  }
  return { observed: lines.join(' | '), problem }
})
attack('TC-sec-6-gh-mixed', 'VS-6 one bad rule next to one good rule', 'bad (each non-string, each op) + good starts_with "sdlc/"; bad + failing regex ^zzz/', 'exit 0 with the good rule alone; with the failing rule exit 1, and the bad rule never hides the failure', () => {
  const lines = []
  let problem = null
  for (const op of OPS) for (const [tag, pat] of NONSTR) {
    const a = pre({ body: [ghObj('bad', op, pat), ghObj('good', 'starts_with', 'sdlc/')] })
    const b = pre({ body: [ghObj('bad', op, pat), ghObj('z', 'regex', '^zzz/')] })
    const c = pre({ body: [ghObj('z', 'regex', '^zzz/'), ghObj('bad', op, pat)] })
    lines.push(`${op}/${tag}:${a.t.status}/${b.t.status}/${c.t.status}`)
    const bad = first(
      a.out && a.t.status === 0 && a.out.ok === true && a.out.derived === false ? null : `good+bad exit ${a.t.status} ${noTrace(a) ?? ''}`,
      b.out && b.t.status === 1 && b.out.ok === false ? null : `bad+failing exit ${b.t.status} ${noTrace(b) ?? ''}`,
      c.out && c.t.status === 1 && c.out.ok === false ? null : `failing+bad exit ${c.t.status} ${noTrace(c) ?? ''}`,
      cleanTree(a), cleanTree(b), cleanTree(c))
    if (bad) problem = problem ?? `${op}/${tag}: ${bad}`
  }
  return { observed: lines.join(' '), problem }
})
attack('TC-sec-6-gh-sample-label', 'VS-6 failing samples still name their rule next to an unevaluable one', 'bad regex pattern 5 + failing starts_with "feature/" labelled alpha', 'every failing sample names alpha', () => {
  const p = pre({ body: [ghObj('bad', 'regex', 5), ghObj('alpha', 'starts_with', 'feature/')] })
  const fails = p.out?.samples.filter((s) => s.result === 'fail') ?? []
  return { observed: summary(p) + `; fail rules ${fails.map((s) => s.rule)}`, problem: first(p.out ? null : noTrace(p) ?? 'no JSON', fails.length && fails.every((s) => s.rule === 'alpha') ? null : 'wrong or missing label', cleanTree(p)) }
})
attack('TC-sec-6-glab', 'VS-6 non-string branch_name_regex on glab', 'branch_name_regex as 5, null, list, object, true, false', 'never a traceback; exit 0 or 1; no derived format; tree unchanged', () => {
  const lines = []
  let problem = null
  for (const [tag, pat] of NONSTR) {
    const p = pre({ forge: 'gitlab', body: { branch_name_regex: pat } })
    lines.push(`${tag}: exit ${p.t.status} rules ${p.out?.rules?.length} notes ${JSON.stringify(p.out?.notes)}`)
    const bad = first(p.out ? null : 'no JSON', [0, 1].includes(p.t.status) ? null : `exit ${p.t.status}`, noTrace(p), p.out?.derived === false ? null : 'derived', cleanTree(p))
    if (bad) problem = problem ?? `${tag}: ${bad}`
  }
  return { observed: lines.join(' | '), problem }
})
attack('TC-sec-6-glab-push-rule-fields', 'VS-6 other glab push-rule fields with odd types', 'branch_name_regex string plus commit_message_regex 5; regex list-wrapped', 'no traceback; string regex still judged', () => {
  const p = pre({ forge: 'gitlab', body: { branch_name_regex: '^zzz/', commit_message_regex: 5, author_email_regex: null } })
  const q = pre({ forge: 'gitlab', body: [{ branch_name_regex: 5 }] })
  return { observed: `exit ${p.t.status} ok ${p.out?.ok}; list body exit ${q.t.status}`, problem: first(p.out ? null : 'no JSON', p.t.status === 1 ? null : `string regex not judged: exit ${p.t.status}`, noTrace(p), q.out ? null : 'list body: no JSON', noTrace(q), cleanTree(p), cleanTree(q)) }
})
attack('TC-sec-6-other-fields', 'VS-6 odd types in the other fields of a gh rule', 'operator non-string, name non-string, negate string, parameters list, parameters null, type non-string', 'no traceback; one JSON object', () => {
  const lines = []
  let problem = null
  const bodies = {
    'op-int': [{ type: 'branch_name_pattern', parameters: { name: 'n', operator: 5, pattern: 'x' } }],
    'op-list': [{ type: 'branch_name_pattern', parameters: { name: 'n', operator: ['regex'], pattern: 'x' } }],
    'name-int': [ghObj(7, 'starts_with', 'feature/')],
    'name-null': [ghObj(null, 'starts_with', 'feature/')],
    'negate-str': [ghObj('n', 'starts_with', 'feature/', { negate: 'yes' })],
    'negate-list': [ghObj('n', 'contains', 'x', { negate: [] })],
    'params-list': [{ type: 'branch_name_pattern', parameters: ['x'] }],
    'params-null': [{ type: 'branch_name_pattern', parameters: null }],
    'params-str': [{ type: 'branch_name_pattern', parameters: 'x' }],
    'type-int': [{ type: 5, parameters: {} }],
    'item-null': [null, 5, 'x', []],
    'no-pattern': [{ type: 'branch_name_pattern', parameters: { name: 'n', operator: 'regex' } }],
  }
  for (const [tag, body] of Object.entries(bodies)) {
    const p = pre({ body })
    lines.push(`${tag}:${p.t.status}`)
    const bad = first(p.out ? null : 'no JSON', [0, 1].includes(p.t.status) ? null : `exit ${p.t.status}`, noTrace(p), cleanTree(p))
    if (bad) problem = problem ?? `${tag}: ${bad}`
  }
  return { observed: lines.join(' '), problem }
})
attack('TC-sec-6-surrogate-pattern', 'VS-6 pattern text that is a string but odd', 'lone surrogate escape, very long regex, invalid regex, regex with NUL', 'one JSON object, no traceback', () => {
  const lines = []
  let problem = null
  for (const [tag, pat] of [['surrogate', '\ud800/'], ['invalid-re', '('], ['nul', 'a\u0000b'], ['bad-escape', '\\q'], ['huge-repeat', 'a{99999999999}'], ['empty', '']]) {
    for (const op of OPS) {
      const p = pre({ body: [ghObj('s', op, pat)] })
      lines.push(`${op}/${tag}:${p.t.status}`)
      const bad = first(p.out ? null : 'no JSON', [0, 1].includes(p.t.status) ? null : `exit ${p.t.status}`, noTrace(p), cleanTree(p))
      if (bad) problem = problem ?? `${op}/${tag}: ${bad}`
    }
  }
  return { observed: lines.join(' '), problem }
})
attack('SEED-suggestion-injection', 'VS-2 the suggestion repeats rule text into a copy-paste command', 'starts_with pattern `x" ; touch PWN #`', 'suggestion is a safe literal or a refusal', () => {
  const p = pre({ body: [ghObj('i', 'starts_with', 'x" ; touch PWN #')] })
  const risky = /touch PWN/.test(p.out.suggestion)
  return { observed: `${JSON.stringify(p.out.suggestion)}; derived ${p.out.derived}; tree unchanged ${p.t.treeUnchanged}`, problem: risky ? 'suggestion carries rule text as shell syntax' : null }
}, { scope: false })
attack('SEED-stderr-echo', 'VS-5 gh stderr is copied whole into notes', 'stderr holds a token-like string and 200 KB of text', 'secret-looking text and unbounded text do not reach the verdict', () => {
  const p = pre({ stub: stubServer({ name: 'gh', fallback: { stdout: '', stderr: `auth failed token=ghp_SECRET0123456789 ${'z'.repeat(200000)}`, exit: 1 } }) })
  const text = JSON.stringify(p.out.notes)
  return { observed: `notes bytes ${text.length}; has token ${text.includes('ghp_SECRET')}`, problem: text.includes('ghp_SECRET') || text.length > 10000 ? 'stderr copied into notes without a limit or redaction' : null }
}, { scope: false })
attack('SEED-redos', 'VS-5 catastrophic regex from the forge', 'pattern (a*)*b-style against sample names', 'finishes quickly', () => {
  const p = pre({ body: [ghObj('redos', 'regex', '^(?:[a-z/0-9-]+)+!$')], timeoutMs: 60000 })
  return { observed: `${p.t.durationMs.toFixed(0)}ms exit ${p.t.status}`, problem: p.t.durationMs > 5000 ? `took ${p.t.durationMs.toFixed(0)}ms` : null }
}, { scope: false })
