import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT
const MAIN = resolve(HERE, '../../../../../../..')
const LOG = join(MAIN, '.sdlc/slices/S-017/verification/r1/logs/cli-0-transcripts.txt')
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href)
const { cliRunner } = await imp('skills/sdlc/test/testkit/cli-runner.mjs')
const { stubServer, restrictedPath } = await imp('skills/sdlc/test/testkit/stub-server.mjs')
const { glabStub } = await imp('skills/sdlc/test/testkit/glab-stub.mjs')
const { load } = await imp('skills/sdlc/test/testkit/attack-corpus.mjs')

const r = cliRunner({ skillDir: join(ROOT, 'skills/sdlc') })
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `S-017 verify-cli r1 transcripts, root ${ROOT}\n`)
const log = (title, t) => appendFileSync(LOG, `\n=== ${title}\n${t.text().slice(0, 1500)}\n`)

const rule = (operator, pattern, o = {}) => ({
  type: 'branch_name_pattern',
  ruleset_id: o.id ?? 7,
  parameters: { operator, pattern, negate: o.negate ?? false, ...(o.name ? { name: o.name } : {}) },
})

function repoFor(forge, gitMode = 'pr', extra = {}) {
  return r.gitRepo({ files: { '.sdlc/config.json': { gitMode, forge, ...extra } } })
}

function pre(title, { forge = 'github', mode = 'pr', gitMode, steps, fallback, args = [], stub, config, env, timeoutMs } = {}) {
  const repo = repoFor(forge, gitMode ?? mode, config)
  const shim = stub ?? (forge === 'gitlab' ? glabStub({ script: steps ?? [], fallback }) : stubServer({ script: steps ?? [], fallback }))
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', mode, ...args], { env: { ...(shim ? shim.env() : {}), ...(env ?? {}) }, timeoutMs })
  log(title, t)
  return { t, repo, shim, j: t.json }
}

const body = (x) => ({ stdout: x })
const failing = (j) => j.samples.filter((s) => s.result === 'fail')
const glabBody = (regex) => ({ branch_name_regex: regex })

test('verify cli VS-1: one regex the default satisfies gives ok and no derivation (gh)', () => {
  for (const pat of ['^[a-z]+/.+', '[a-z]+/.+$', '^sdlc/', '/S-001|/M-1|/state', 'sdlc', '^(sdlc|feat)/.+', '^[a-z]+/[A-Za-z0-9-]+$']) {
    const { t, j } = pre(`VS-1 gh ${pat}`, { fallback: body([rule('regex', pat)]) })
    assert.equal(t.status, 0, pat)
    assert.equal(j.ok, true, pat)
    assert.equal(j.format, 'sdlc/{name}', pat)
    assert.equal(j.derived, false, pat)
    assert.equal(j.suggestion, '')
    assert.equal(failing(j).length, 0)
    assert.equal(j.rules.length, 1)
    assert.ok(t.treeUnchanged)
  }
})

test('verify cli VS-1: same through glab', () => {
  for (const pat of ['^[a-z]+/.+', '^sdlc/']) {
    const { t, j } = pre(`VS-1 glab ${pat}`, { forge: 'gitlab', fallback: body(glabBody(pat)) })
    assert.equal(t.status, 0)
    assert.equal(j.ok, true)
    assert.equal(j.derived, false)
    assert.equal(j.suggestion, '')
    assert.equal(j.forge, 'gitlab')
    assert.equal(failing(j).length, 0)
  }
})

test('verify cli VS-1: near variants the default fails give exit 1 and no derived format', () => {
  for (const pat of ['^[A-Z]+/.+', '^[a-z]+/.+/.+', '^Sdlc/', '^[a-z]+/$', '^sdlc/[a-z]']) {
    const { t, j } = pre(`VS-1 near ${pat}`, { fallback: body([rule('regex', pat)]) })
    assert.equal(t.status, 1, pat)
    assert.equal(j.ok, false)
    assert.equal(j.derived, false)
    assert.equal(j.format, 'sdlc/{name}')
    assert.match(j.suggestion, /--branch-format/)
    assert.ok(failing(j).every((s) => s.rule === 'ruleset 7'))
  }
})

test('verify cli VS-1: given format is kept and a passing regex still gives ok', () => {
  const { t, j } = pre('VS-1 given', { fallback: body([rule('regex', '^[a-z]+/.+')]), args: ['--format', 'feat/{name}'] })
  assert.equal(t.status, 0)
  assert.equal(j.format, 'feat/{name}')
  assert.equal(j.derived, false)
  assert.equal(j.given, true)
})

test('verify cli VS-2: starts_with plus ends_with, no format: no derivation, generic suggestion', () => {
  const rules = [rule('starts_with', 'feature/', { name: 'alpha' }), rule('ends_with', '-x', { name: 'beta' })]
  const { t, j } = pre('VS-2 two rules', { fallback: body(rules) })
  assert.equal(t.status, 1)
  assert.equal(j.ok, false)
  assert.equal(j.derived, false)
  assert.equal(j.format, 'sdlc/{name}')
  assert.match(j.suggestion, /--branch-format/)
  assert.deepEqual(j.rules.map((x) => x.label).sort(), ['alpha', 'beta'])
  assert.ok(failing(j).length > 0)
  assert.ok(failing(j).every((s) => s.rule === 'alpha' || s.rule === 'beta'))
  assert.ok(t.treeUnchanged)
})

test('verify cli VS-2: negated contains, starts_with, ends_with, regex never derive', () => {
  const cases = [
    rule('contains', 'sdlc/', { negate: true, name: 'nc' }),
    rule('starts_with', 'sdlc/', { negate: true, name: 'ns' }),
    rule('ends_with', '1', { negate: true, name: 'ne' }),
    rule('regex', '^sdlc/', { negate: true, name: 'nr' }),
  ]
  for (const one of cases) {
    const { t, j } = pre(`VS-2 negated ${one.parameters.operator}`, { fallback: body([one]) })
    assert.equal(t.status, 1, one.parameters.operator)
    assert.equal(j.derived, false)
    assert.equal(j.format, 'sdlc/{name}')
    assert.match(j.suggestion, /--branch-format/)
    assert.ok(failing(j).length > 0)
    assert.ok(failing(j).every((s) => s.rule === one.parameters.name))
  }
})

test('verify cli VS-2: three rules, and a given format, give no derivation', () => {
  const three = [rule('starts_with', 'a/', { name: 'one' }), rule('ends_with', '-z', { name: 'two' }), rule('contains', 'q', { name: 'three' })]
  const a = pre('VS-2 three', { fallback: body(three) })
  assert.equal(a.t.status, 1)
  assert.equal(a.j.derived, false)
  assert.match(a.j.suggestion, /--branch-format/)
  assert.ok(failing(a.j).every((s) => ['one', 'two', 'three'].includes(s.rule)))
  const b = pre('VS-2 single starts_with with given format', { fallback: body([rule('starts_with', 'feature/', { name: 'only' })]), args: ['--format', 'sdlc/{name}'] })
  assert.equal(b.t.status, 1)
  assert.equal(b.j.derived, false)
  assert.equal(b.j.format, 'sdlc/{name}')
  assert.match(b.j.suggestion, /--branch-format/)
})

test('verify cli VS-2: one starts_with rule derives (control)', () => {
  const { t, j } = pre('VS-2 control derive', { fallback: body([rule('starts_with', 'feature/', { name: 'f' })]) })
  assert.equal(t.status, 0)
  assert.equal(j.derived, true)
  assert.equal(j.format, 'feature/sdlc/{name}')
})

test('verify cli VS-2: rule label fallbacks name the failing rule', () => {
  const noName = { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 'x/', negate: false } }
  const a = pre('VS-2 label ruleset', { fallback: body([rule('starts_with', 'x/', { id: 99 }), rule('ends_with', '-q', { id: 98 })]) })
  assert.ok(failing(a.j).every((s) => s.rule === 'ruleset 99' || s.rule === 'ruleset 98'))
  const b = pre('VS-2 label bare', { fallback: body([noName, rule('ends_with', '-q', { name: 'zz' })]) })
  assert.ok(failing(b.j).every((s) => s.rule === 'branch_name_pattern' || s.rule === 'zz'))
  assert.equal(b.j.derived, false)
})

test('verify cli VS-3: rules of another type or an empty list leave rules empty and ok', () => {
  const others = [{ type: 'pull_request', parameters: {} }, { type: 'creation' }, { type: 'tag_name_pattern', parameters: { operator: 'regex', pattern: '^zzz$' } }, { type: 'commit_message_pattern', parameters: { operator: 'starts_with', pattern: 'zzz' } }]
  for (const [title, b] of [['other types', others], ['empty', []], ['nulls', [null, 1, 'x', []]]]) {
    const { t, j } = pre(`VS-3 ${title}`, { fallback: body(b) })
    assert.equal(t.status, 0, title)
    assert.equal(j.ok, true)
    assert.deepEqual(j.rules, [])
    assert.equal(j.derived, false)
    assert.equal(j.suggestion, '')
    assert.deepEqual(j.notes, [])
    assert.ok(j.samples.length >= 3)
    assert.ok(j.samples.every((s) => s.result === 'pass' && s.rule === null), JSON.stringify(j.samples))
  }
})

test('verify cli VS-3: a rule for one sample name only fails only that sample', () => {
  const steps = [body([rule('regex', '^zzz/', { name: 'only-slice' })]), body([]), body([])]
  const { t, j, shim } = pre('VS-3 per sample', { steps, fallback: body([]) })
  assert.equal(shim.calls().length >= 3, true)
  assert.equal(j.rules.length, 1)
  assert.equal(j.rules[0].label, 'only-slice')
  const f = failing(j)
  assert.deepEqual(f.map((s) => s.kind), ['slice'])
  assert.equal(f[0].rule, 'only-slice')
  assert.equal(j.samples.filter((s) => s.result === 'pass').length, j.samples.length - 1)
  assert.equal(t.status, 1)
  assert.equal(j.derived, false)
  assert.match(j.suggestion, /--branch-format/)
  const steps2 = [body([]), body([]), body([rule('regex', '^zzz/', { name: 'only-e2e' })])]
  const k = pre('VS-3 per sample e2e', { steps: steps2, fallback: body([]) })
  assert.deepEqual(failing(k.j).map((s) => s.kind), ['e2e'])
})

test('verify cli VS-3: mr mode on gitlab with no rule, and null body, give ok', () => {
  for (const b of ['null', JSON.stringify({ branch_name_regex: '' }), JSON.stringify({})]) {
    const { t, j } = pre(`VS-3 glab ${b}`, { forge: 'gitlab', mode: 'mr', args: ['--branch', 'anything-goes'], fallback: body(b) })
    assert.equal(t.status, 0)
    assert.equal(j.ok, true)
    assert.deepEqual(j.rules, [])
    assert.deepEqual(j.samples.map((s) => [s.kind, s.result]), [['working', 'pass']])
  }
})

test('verify cli VS-4: seven shim scenarios at the public boundary', () => {
  const keys = ['ok', 'format', 'derived', 'given', 'forge', 'rules', 'samples', 'notes', 'suggestion', 'mode', 'command']
  const s1 = pre('VS-4.1 no rules', { fallback: body([]) })
  assert.equal(s1.t.status, 0)
  assert.equal(s1.j.format, 'sdlc/{name}')
  for (const k of ['ok', 'format', 'derived', 'forge', 'rules', 'samples', 'notes', 'suggestion']) assert.ok(k in s1.j, k)
  const s2 = pre('VS-4.2 derive', { fallback: body([rule('starts_with', 'feature/', { name: 'feature branches' })]) })
  assert.equal(s2.t.status, 0)
  assert.equal(s2.j.format, 'feature/sdlc/{name}')
  assert.equal(s2.j.derived, true)
  assert.ok(s2.j.samples.every((s) => s.name.startsWith('feature/sdlc/') && s.result === 'pass'))
  assert.deepEqual(s2.j.rules[0], { source: 'github', kind: 'starts_with', pattern: 'feature/', negate: false, label: 'feature branches' })
  const s3 = pre('VS-4.3 failing regex', { fallback: body([rule('regex', '^zzz/')]) })
  assert.equal(s3.t.status, 1)
  assert.equal(s3.j.ok, false)
  assert.match(s3.j.suggestion, /^--branch-format/)
  const s4 = pre('VS-4.4 passing regex', { fallback: body([rule('regex', '^[a-z]+/.+')]) })
  assert.equal(s4.t.status, 0)
  assert.equal(s4.j.derived, false)
  const s5 = pre('VS-4.5 gh exit 1', { fallback: { exit: 1, stderr: 'gh: not signed in' } })
  assert.equal(s5.t.status, 0)
  assert.equal(s5.j.ok, true)
  assert.ok(s5.j.notes.some((n) => typeof n === 'string' && n.includes('rules unknown')))
  assert.match(s5.j.notes[0], /rules unknown on github: gh: not signed in/)
  assert.ok(s5.j.samples.every((s) => s.result === 'unchecked'))
  const s6 = pre('VS-4.6 mr bad-name glab', { forge: 'gitlab', mode: 'mr', args: ['--branch', 'bad-name'], fallback: body(glabBody('^feat/')) })
  assert.equal(s6.t.status, 1)
  const w = s6.j.samples.find((s) => s.kind === 'working')
  assert.equal(w.result, 'fail')
  assert.equal(w.name, 'bad-name')
  assert.equal(w.rule, 'push rule')
  assert.match(s6.j.suggestion, /rename the branch "bad-name"/)
  const s6b = pre('VS-4.6b mr good-name glab', { forge: 'gitlab', mode: 'mr', args: ['--branch', 'feat/x'], fallback: body(glabBody('^feat/')) })
  assert.equal(s6b.t.status, 0)
  const s7 = pre('VS-4.7 invalid format', { args: ['--format', 'feature/x'], fallback: body([]) })
  assert.equal(s7.t.status, 2)
  assert.equal(s7.t.stdout.trim().split('\n').length, 1)
  assert.equal(s7.j.ok, false)
  assert.equal(typeof s7.j.error, 'string')
  assert.equal(s7.shim.calls().length, 0)
  void keys
})

test('verify cli VS-4: invalid input forms all exit 2 with one JSON error', () => {
  const repo = repoFor('github')
  const cases = [
    ['--mode', 'pr', '--format', ''],
    ['--mode', 'pr', '--format', '{name}{name}'],
    ['--mode', 'pr', '--format', '{bogus}/{name}'],
    ['--mode', 'pr', '--format', '/{name}'],
    ['--mode', 'nope'],
    ['--mode'],
    [],
  ]
  for (const a of cases) {
    const t = r.run('branches.py', ['preflight', '--repo', repo, ...a], { env: stubServer({ fallback: body([]) }).env() })
    log(`VS-4 invalid ${JSON.stringify(a)}`, t)
    assert.equal(t.status, 2, JSON.stringify(a))
    assert.equal(t.stdout.trim().split('\n').length, 1)
    assert.equal(t.json.ok, false)
    assert.equal(typeof t.json.error, 'string')
    assert.ok(t.treeUnchanged)
  }
})

test('verify cli VS-4: stdout is one JSON line for ok, fail and unchecked', () => {
  for (const f of [body([]), body([rule('regex', '^zzz/')]), { exit: 1, stderr: 'x' }]) {
    const { t } = pre('VS-4 json line', { fallback: f })
    assert.equal(t.stdout.trim().split('\n').length, 1)
    assert.ok(t.json)
  }
})

test('verify cli VS-5: malformed, non-list, huge bodies never corrupt the verdict', () => {
  const huge = JSON.stringify(Array.from({ length: 5000 }, (_, i) => rule('starts_with', `p${i}/`, { name: `n${i}`, id: i })))
  const cases = [
    ['malformed', body('{not json'), /rules unknown on github/],
    ['truncated', body('[{"type":"branch_name_pattern","parameters":{"operator":'), /rules unknown/],
    ['object', body({ message: 'Not Found' }), /rules unknown/],
    ['string', body('"hello"'), /rules unknown/],
    ['empty stdout', body(''), /rules unknown/],
    ['binary', body(Buffer.from([0xff, 0xfe, 0x00, 0x80])), /rules unknown/],
    ['deep', body('['.repeat(200000) + ']'.repeat(200000)), /rules unknown/],
  ]
  for (const [title, step, re] of cases) {
    const { t, j } = pre(`VS-5 ${title}`, { fallback: step })
    assert.equal(t.status, 0, title)
    assert.equal(j.ok, true, title)
    assert.ok(j.notes.some((n) => re.test(n)), `${title}: ${JSON.stringify(j.notes)}`)
    assert.ok(j.samples.every((s) => s.result === 'unchecked'), title)
    assert.deepEqual(j.rules, [])
    assert.equal(t.stderr, '', title)
    assert.ok(t.treeUnchanged, title)
  }
  const h = pre('VS-5 huge', { fallback: body(huge), timeoutMs: 60000 })
  assert.ok([0, 1].includes(h.t.status))
  assert.ok(h.j)
  assert.equal(h.j.derived, false)
  assert.ok(h.t.treeUnchanged)
  assert.ok(h.t.durationMs < 20000, `huge body took ${h.t.durationMs} ms`)
})

test('verify cli VS-5: glab broken answers', () => {
  const cases = [
    ['malformed', body('{oops')],
    ['list', body('[1,2]')],
    ['regex not string', body({ branch_name_regex: 5 })],
    ['regex array', body({ branch_name_regex: ['^a'] })],
    ['exit 1', { exit: 1, stderr: '401 Unauthorized' }],
  ]
  for (const [title, step] of cases) {
    const { t, j } = pre(`VS-5 glab ${title}`, { forge: 'gitlab', fallback: step })
    assert.ok(t.json, title)
    assert.equal(t.stderr, '')
    assert.ok(t.treeUnchanged)
    assert.equal(j.derived, false)
    assert.equal(t.status, 0, title)
  }
  const e = pre('VS-5 glab 401', { forge: 'gitlab', fallback: { exit: 1, stderr: '401 Unauthorized' } })
  assert.match(e.j.notes[0], /^rules unknown on gitlab: 401 Unauthorized/)
  assert.ok(e.j.samples.every((s) => s.result === 'unchecked'))
})

test('verify cli VS-5: hostile pattern and label text never crash or leak', () => {
  const entries = [...load('control-chars'), ...load('injection'), ...load('format-strings'), ...load('unicode-confusables'), ...load('oversized')].slice(0, 80)
  for (const e of entries) {
    const v = String(e.value)
    for (const op of ['regex', 'starts_with', 'contains']) {
      const { t, j } = pre(`VS-5 hostile ${e.id} ${op}`, { fallback: body([rule(op, v, { name: v, negate: false })]) })
      assert.ok(t.json, `${e.id} ${op}: ${t.stderr}`)
      assert.ok([0, 1].includes(t.status), `${e.id} ${op} status ${t.status}`)
      assert.equal(t.stderr, '', `${e.id} ${op}`)
      assert.ok(t.treeUnchanged, `${e.id} ${op}`)
      assert.ok(Array.isArray(j.samples))
      if (j.ok) assert.equal(t.status, 0)
      else assert.equal(t.status, 1)
    }
  }
})

test('verify cli VS-5: bad regex is unevaluated and never blocks; wrong-typed fields do not crash', () => {
  const a = pre('VS-5 bad regex', { fallback: body([rule('regex', '(unclosed')]) })
  assert.equal(a.t.status, 0)
  assert.ok(a.j.samples.every((s) => s.result === 'unevaluated'))
  assert.ok(a.j.notes.some((n) => n.startsWith('cannot evaluate ')))
  const odd = [
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: 5, negate: 'yes' } },
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: null } },
    { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 5 } },
    { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: null } },
    { type: 'branch_name_pattern', parameters: { operator: 'contains', pattern: {} } },
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: ['a'] } },
  ]
  const crashed = []
  for (const o of odd) {
    const { t, j } = pre(`VS-5 odd ${JSON.stringify(o)}`, { fallback: body([o]) })
    if (!t.json) { crashed.push(`${JSON.stringify(o.parameters)} -> exit ${t.status}, no JSON, ${t.stderr.trim().split('\n').pop()}`); continue }
    assert.equal(t.status, 0)
    assert.equal(j.derived, false)
  }
  assert.deepEqual(crashed, [], 'a rule with a non-string pattern crashes preflight with a traceback and no JSON')
})

test('verify cli VS-5: rules with odd operator or parameters give unevaluated, not a crash', () => {
  const odd = [
    { type: 'branch_name_pattern', parameters: 'x' },
    { type: 'branch_name_pattern' },
    { type: 'branch_name_pattern', parameters: { operator: ['x'], pattern: 'a' } },
    { type: 'branch_name_pattern', parameters: { pattern: 'a' } },
  ]
  for (const o of odd) {
    const { t, j } = pre(`VS-5 odd operator ${JSON.stringify(o)}`, { fallback: body([o]) })
    assert.ok(t.json)
    assert.equal(t.status, 0)
    assert.equal(t.stderr, '')
    assert.ok(j.samples.every((s) => s.result === 'unevaluated'))
    assert.ok(t.treeUnchanged)
  }
})

test('verify cli VS-5: absent gh and absent glab are reported as unknown, not as a crash', () => {
  for (const forge of ['github', 'gitlab']) {
    const repo = repoFor(forge)
    const bin = restrictedPath(['python3', 'git'])
    const t = r.exec('python3', [join(ROOT, 'skills/sdlc/branches.py'), 'preflight', '--repo', repo, '--mode', 'pr'], { env: { PATH: bin } })
    log(`VS-5 absent ${forge}`, t)
    assert.equal(t.status, 0)
    assert.equal(t.json.ok, true)
    assert.ok(t.json.notes[0].startsWith(`rules unknown on ${forge}`))
    assert.ok(t.json.samples.every((s) => s.result === 'unchecked'))
    assert.ok(t.treeUnchanged)
  }
})

test('verify cli VS-5: a hanging shim ends with unknown rules and leaves the repo alone', { timeout: 175000 }, () => {
  const { t, j } = pre('VS-5 stall', { fallback: { stall: true }, timeoutMs: 170000 })
  assert.equal(t.status, 0)
  assert.equal(j.ok, true)
  assert.ok(j.notes.some((n) => n.startsWith('rules unknown on github')))
  assert.ok(j.samples.every((s) => s.result === 'unchecked'))
  assert.ok(t.treeUnchanged)
  assert.ok(t.durationMs < 90000, `took ${t.durationMs}`)
})

test('verify cli VS-5: running twice gives the same verdict and no repo change (idempotency)', () => {
  const repo = repoFor('github')
  const gh = stubServer({ fallback: body([rule('starts_with', 'feature/')]) })
  const a = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: gh.env() })
  const b = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: gh.env() })
  log('VS-5 twice a', a)
  log('VS-5 twice b', b)
  const strip = (j) => ({ ...j, samples: j.samples.map((s) => (s.kind === 'state' ? { ...s, name: 'x' } : s)) })
  assert.deepEqual(strip(a.json), strip(b.json))
  assert.ok(a.treeUnchanged && b.treeUnchanged)
  for (const c of gh.calls()) assert.deepEqual(c.argv.slice(0, 2), ['api', c.argv[1]])
  assert.ok(gh.calls().every((c) => c.argv[0] === 'api' && c.argv.length === 2 && c.argv[1].startsWith('repos/{owner}/{repo}/rules/branches/')))
})

test('verify cli VS-5: unicode and spaced repo path, and CI env, work', () => {
  const repo = r.gitRepo({ name: 'répo wïth spaces', files: { '.sdlc/config.json': { gitMode: 'pr', forge: 'github' } } })
  const gh = stubServer({ fallback: body([rule('regex', '^[a-z]+/.+')]) })
  const t = r.run('branches.py', ['preflight', '--repo', repo, '--mode', 'pr'], { env: gh.env({ CI: 'true', LANG: 'C', LC_ALL: 'C' }) })
  log('VS-5 unicode path', t)
  assert.equal(t.status, 0)
  assert.equal(t.json.ok, true)
  assert.ok(t.treeUnchanged)
})

const NONSTR = [5, 0, 1.5, true, false, null, ['a'], [], {}, { a: 1 }, -1, 1e400]
const STRING_OPS = ['starts_with', 'ends_with', 'contains', 'regex']
const noTrace = (t, label) => {
  assert.ok(t.json, `${label}: no JSON: ${t.stderr.trim().split('\n').pop()}`)
  assert.ok(!/Traceback/.test(t.stderr), label)
  assert.ok(t.treeUnchanged, label)
}

test('verify cli VS-6: every non-string pattern on every string operator is unevaluated on gh', () => {
  for (const op of STRING_OPS) {
    for (const p of NONSTR) {
      for (const negate of [false, true]) {
        const label = `${op} ${JSON.stringify(p)} negate=${negate}`
        const { t, j } = pre(`VS-6 gh ${label}`, { fallback: body([{ type: 'branch_name_pattern', ruleset_id: 3, parameters: { operator: op, pattern: p, negate } }]) })
        noTrace(t, label)
        assert.equal(t.status, 0, label)
        assert.equal(j.ok, true, label)
        assert.equal(j.derived, false, label)
        assert.equal(j.format, 'sdlc/{name}', label)
        assert.ok(j.samples.every((s) => s.result === 'unevaluated'), label)
        assert.ok(j.notes.some((n) => /^cannot evaluate /.test(n)), label)
      }
    }
  }
})

test('verify cli VS-6: a missing pattern key is unevaluated too', () => {
  for (const op of STRING_OPS) {
    const { t, j } = pre(`VS-6 missing pattern ${op}`, { fallback: body([{ type: 'branch_name_pattern', parameters: { operator: op } }]) })
    noTrace(t, op)
    assert.equal(t.status, 0)
    assert.equal(j.derived, false)
    assert.ok(j.samples.every((s) => s.result === 'unevaluated'))
  }
})

test('verify cli VS-6: a bad rule mixed with a good rule, in both orders, never derives and never crashes', () => {
  const good = rule('starts_with', 'feature/', { name: 'good', id: 1 })
  const bad = { type: 'branch_name_pattern', ruleset_id: 2, parameters: { operator: 'starts_with', pattern: 5, name: 'bad' } }
  for (const order of [[good, bad], [bad, good]]) {
    const { t, j } = pre('VS-6 mixed', { fallback: body(order) })
    noTrace(t, 'mixed')
    assert.equal(t.status, 1)
    assert.equal(j.ok, false)
    assert.equal(j.derived, false)
    assert.equal(j.format, 'sdlc/{name}')
    assert.match(j.suggestion, /--branch-format/)
    assert.ok(j.notes.some((n) => /cannot evaluate/.test(n) && /bad/.test(n)), JSON.stringify(j.notes))
    assert.ok(failing(j).every((s) => s.rule === 'good'))
  }
})

test('verify cli VS-6: a bad regex rule mixed with a passing regex rule', () => {
  const ok = rule('regex', '^[a-z]+/.+', { name: 'ok', id: 1 })
  const bad = { type: 'branch_name_pattern', ruleset_id: 2, parameters: { operator: 'regex', pattern: null, name: 'bad' } }
  const { t, j } = pre('VS-6 mixed regex', { fallback: body([ok, bad]) })
  noTrace(t, 'mixed regex')
  assert.equal(t.status, 0)
  assert.equal(j.ok, true)
  assert.equal(j.derived, false)
  assert.equal(failing(j).length, 0)
  assert.ok(j.notes.some((n) => /cannot evaluate/.test(n)))
})

test('verify cli VS-6: a non-string pattern with a given format keeps the given format', () => {
  const { t, j } = pre('VS-6 given', { fallback: body([rule('contains', 5)]), args: ['--format', 'feat/{name}'] })
  noTrace(t, 'given')
  assert.equal(t.status, 0)
  assert.equal(j.format, 'feat/{name}')
  assert.equal(j.derived, false)
})

test('verify cli VS-6: glab non-string branch_name_regex never crashes', () => {
  for (const p of NONSTR) {
    for (const mode of ['pr', 'mr']) {
      const label = `glab ${mode} ${JSON.stringify(p)}`
      const { t, j } = pre(`VS-6 ${label}`, { forge: 'gitlab', mode, fallback: body({ branch_name_regex: p }) })
      noTrace(t, label)
      assert.ok([0, 1].includes(t.status), `${label}: exit ${t.status}`)
      assert.equal(j.derived, false, label)
      assert.ok(j.samples.every((s) => ['pass', 'unevaluated'].includes(s.result)), `${label}: ${JSON.stringify(j.samples.map((s) => s.result))}`)
    }
  }
})

test('verify cli VS-6: gh rule fields of odd types (ruleset_id, name, negate) do not crash', () => {
  const variants = [
    { ruleset_id: null }, { ruleset_id: {} }, { ruleset_id: ['x'] }, { ruleset_id: 5, parameters: { operator: 'starts_with', pattern: 'sdlc/', name: 5 } },
    { ruleset_id: 5, parameters: { operator: 'starts_with', pattern: 'sdlc/', name: null } },
    { ruleset_id: 5, parameters: { operator: 'starts_with', pattern: 'sdlc/', name: {} } },
    { ruleset_id: 5, parameters: { operator: 'starts_with', pattern: 'sdlc/', negate: 'yes' } },
    { ruleset_id: 5, parameters: { operator: 'starts_with', pattern: 'sdlc/', negate: null } },
  ]
  for (const v of variants) {
    const o = { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 'sdlc/' }, ...v }
    const label = JSON.stringify(v)
    const { t, j } = pre(`VS-6 fields ${label}`, { fallback: body([o]) })
    noTrace(t, label)
    assert.ok([0, 1].includes(t.status), label)
    assert.equal(typeof j.ok, 'boolean')
  }
})
