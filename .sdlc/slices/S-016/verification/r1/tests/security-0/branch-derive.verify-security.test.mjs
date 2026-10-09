import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const MAIN = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const REPO = process.env.REPO_UNDER_TEST || MAIN
const TK = `${REPO}/skills/sdlc/test/testkit`
const { cliRunner } = await import(`${TK}/cli-runner.mjs`)
const { stubServer } = await import(`${TK}/stub-server.mjs`)
const { load } = await import(`${TK}/attack-corpus.mjs`)

const runner = cliRunner({ skillDir: `${REPO}/skills/sdlc` })
const LOG = process.env.ATTACK_LOG || `${MAIN}/.sdlc/slices/S-016/verification/r1/logs/security-0-attacks.json`
const attacks = []
let seq = 0
const record = (a) => attacks.push({ id: `ATK-${++seq}`, ...a })
after(() => {
  mkdirSync(dirname(LOG), { recursive: true })
  writeFileSync(LOG, JSON.stringify(attacks, null, 2))
})

const R = (operator, pattern, negate = false, name = 'R') => ({ operator, pattern, negate, name })

function pf(rules, { mode = 'pr', args = [], config = {}, branch, stderrOk = false } = {}) {
  const body = rules.map((p) => ({ type: 'branch_name_pattern', ruleset_id: 1, parameters: p }))
  const gh = stubServer({ name: 'gh', fallback: { stdout: body } })
  const repo = runner.gitRepo({ files: { '.sdlc/config.json': { gitMode: mode, forge: 'github', ...config } } })
  const a = ['preflight', '--repo', repo, '--mode', mode, ...args]
  if (branch !== undefined) a.push('--branch', branch)
  const t = runner.run('branches.py', a, { env: gh.env(), timeoutMs: 30000 })
  return { t, gh, repo, j: t.json }
}

const noEffect = (x) => {
  assert.equal(x.t.treeUnchanged, true, 'tree and refs unchanged')
  for (const c of x.gh.calls()) {
    assert.equal(c.argv[0], 'api')
    assert.ok(!c.argv.some((v) => /^(-X|--method|-f|-F|--field|--input)/.test(v)), `read-only call: ${c.argv.join(' ')}`)
  }
}

const validFormat = (fmt) => {
  const r = runner.run('branches.py', ['name', '--repo', runner.dir('vf'), '--format', fmt, '--kind', 'slice', '--id', 'S-001'])
  return r.status
}

test('verify security VS-2: refusals derive nothing and have no side effect', () => {
  const cases = [
    ['given by flag', [R('starts_with', 'feature/')], { args: ['--format', 'x-{name}'] }],
    ['given by config', [R('starts_with', 'feature/')], { config: { branchFormat: 'x-{name}' } }],
    ['given config equal to default', [R('starts_with', 'feature/')], { config: { branchFormat: 'sdlc/{name}' } }],
    ['negated starts_with', [R('starts_with', 'x-', true)], { args: ['--format', 'x-{name}'] }],
    ['regex rule', [R('regex', '^a/')], {}],
    ['two rules', [R('starts_with', 'a/'), R('ends_with', 'b')], {}],
    ['two derivable rules same kind', [R('starts_with', 'a/'), R('starts_with', 'b/')], {}],
  ]
  for (const [label, rules, o] of cases) {
    const x = pf(rules, o)
    const expectedFormat = o.args ? o.args[1] : o.config?.branchFormat ?? 'sdlc/{name}'
    record({ charter: 'VS-2 refusal', input: label, expected: 'derived false, original format, exit 1, no side effect', observed: `exit ${x.t.status} derived ${x.j?.derived} format ${x.j?.format}`, result: x.t.status === 1 && x.j.derived === false && x.j.format === expectedFormat ? 'held' : 'broke', test: 'VS-2 refusals' })
    assert.equal(x.t.status, 1, label)
    assert.equal(x.j.derived, false, label)
    assert.equal(x.j.ok, false, label)
    assert.equal(x.j.format, expectedFormat, label)
    assert.ok(x.j.suggestion.startsWith('--branch-format '), label)
    assert.equal(x.t.stderr, '', label)
    noEffect(x)
  }
})

test('verify security VS-2: unknown kind, zero rules and negated rule never derive and never crash', () => {
  for (const [label, rules] of [['unknown kind', [R('weird', 'x')]], ['null kind', [R(null, 'x')]], ['zero rules', []], ['negated rule the default passes', [R('starts_with', 'zzz/', true)]], ['empty pattern', [R('starts_with', '')]]]) {
    const x = pf(rules)
    record({ charter: 'VS-2 refusal', input: label, expected: 'derived false, exit 0 or 1, no traceback', observed: `exit ${x.t.status} derived ${x.j?.derived}`, result: x.j && x.j.derived === false && x.t.stderr === '' ? 'held' : 'broke', test: 'VS-2 kinds' })
    assert.ok(x.j, label)
    assert.equal(x.j.derived, false, label)
    assert.ok([0, 1].includes(x.t.status), label)
    assert.equal(x.t.stderr, '')
    noEffect(x)
  }
})

test('verify security VS-2: mr and direct mode never derive a format', () => {
  for (const mode of ['mr', 'direct']) {
    const x = pf([R('starts_with', 'feature/')], { mode, branch: 'bad-name' })
    record({ charter: 'VS-2 guard', input: `${mode} mode, bad working branch`, expected: 'derived false', observed: `exit ${x.t.status} derived ${x.j?.derived} format ${x.j?.format}`, result: x.j.derived === false && x.j.format === 'sdlc/{name}' ? 'held' : 'broke', test: 'VS-2 guard' })
    assert.equal(x.j.derived, false)
    assert.equal(x.j.format, 'sdlc/{name}')
    noEffect(x)
  }
})

test('verify security VS-2 todo: a non-string pattern in a forge rule does not crash preflight', { todo: 'seed: crash is in S-015 evaluate, outside S-016 scope' }, () => {
  for (const p of [null, [], ['a'], {}, 1, true, 0]) {
    for (const op of ['starts_with', 'ends_with', 'contains', 'regex']) {
      const x = pf([R(op, p)])
      record({ charter: 'VS-2 non-string pattern', input: `${op} pattern=${JSON.stringify(p)}`, expected: 'JSON verdict, no traceback', observed: `exit ${x.t.status}; stderr ${x.t.stderr.includes('Traceback') ? 'Traceback (TypeError in evaluate)' : 'clean'}`, result: x.j ? 'held' : 'out-of-scope', test: 'VS-2 non-string todo' })
      assert.ok(x.j, `${op} ${JSON.stringify(p)}`)
      assert.ok(!x.t.stderr.includes('Traceback'))
    }
  }
})

const AFFIXES = ['a b', 'a~', 'a^', 'a:', 'a.', '.lock', 'a..b', 'a@{', 'a?', 'a*', 'a[', 'a\\', 'a\nb', 'a\tb', 'a\u007fb', '-x', '/', 'x/', '//', '{name}', '{name:lower}', '{', '}', '%s', '%(x)s', '$(id)', '`id`', 'a"b', "a'b", '@', '.', '..', 'é', '‮', 'a/.b', '.hidden', 'a.lock/', 'a//b', ' ', ' ', '\u0085', '　', 'a b', 'x'.repeat(4000)]
const OPS = ['starts_with', 'ends_with', 'contains']
const deriveOf = (op, a) => (op === 'starts_with' ? `${a}sdlc/{name}` : op === 'ends_with' ? `sdlc/{name}${a}` : `sdlc/${a}/{name}`)

test('verify security VS-4: failed derivation keeps the first verdict and suggests the derived format', () => {
  for (const op of OPS) {
    for (const a of AFFIXES) {
      const x = pf([R(op, a)])
      const derived = deriveOf(op, a)
      const label = `${op} ${JSON.stringify(a).slice(0, 40)}`
      assert.ok(x.j, label)
      assert.ok([0, 1].includes(x.t.status), `${label}: exit ${x.t.status}`)
      assert.equal(x.t.stderr, '', label)
      if (!x.j.ok) {
        const held = x.t.status === 1 && x.j.derived === false && x.j.format === 'sdlc/{name}' && x.j.suggestion === `--branch-format "${derived}"` && x.j.samples.every((s) => s.name.startsWith('sdlc/') && s.result === 'fail')
        record({ charter: 'VS-4 failed derivation', input: label, expected: 'ok false, exit 1, original format, suggestion is the derived format, first-verdict samples', observed: `exit ${x.t.status} derived ${x.j.derived} suggestion ${JSON.stringify(x.j.suggestion).slice(0, 80)}`, result: held ? 'held' : 'broke', test: 'VS-4 matrix' })
        assert.equal(x.t.status, 1, label)
        assert.equal(x.j.derived, false, label)
        assert.equal(x.j.format, 'sdlc/{name}', label)
        assert.equal(x.j.suggestion, `--branch-format "${derived}"`, label)
        for (const s of x.j.samples) {
          assert.ok(s.name.startsWith('sdlc/'), `${label}: second-verdict name ${s.name}`)
          assert.equal(s.result, 'fail', label)
        }
        assert.deepEqual(x.j.rules.map((r) => r.pattern), [a], label)
        noEffect(x)
      }
    }
  }
})

test('verify security VS-4: ok true with derived true only for a format validate_format accepts', () => {
  const broken = []
  for (const op of OPS) {
    for (const a of AFFIXES) {
      const x = pf([R(op, a)])
      if (x.j?.ok && x.j.derived) {
        const status = validFormat(x.j.format)
        if (status !== 0) broken.push({ op, affix: a, format: x.j.format, nameExit: status })
      }
    }
  }
  record({ charter: 'VS-4 derived format validity', input: 'all affixes x three operators', expected: 'a derived ok true format passes validate_format', observed: broken.length ? `${broken.length} derived formats rejected by validate_format, for example ${JSON.stringify(broken[0])}` : 'none', result: broken.length ? 'broke' : 'held', test: 'VS-4 derived validity' })
  assert.deepEqual(broken, [], 'preflight printed ok true for a format that validate_format refuses')
})

const PATTERNS = ['^(feature|bugfix)/[A-Z]+-\\d+$', '^(user|team)-[a-z]+/.*', '^[a-z]+/S-\\d+$', '^team/.*', '^(a|b)/', '^a?b/', '^x{0}y/', '^(?:feat)/S', '^(?P<n>feat)/S', '(?i)^FEAT/', '^é/', '^[é-ü]/', '^(?i:feat)/', '^feat\\/', '^\\Afeat/', '^(?:a|b){2}/', '^[\\u0041]/', '^\\x66eat/', '^a..b/', "^'/", '^"/', '^\\$\\(id\\)/', '^a|b', '^(feat/)+', '^[\\d]+/', '^[A-Z]{2,5}-\\d+/', '^(?=feat)feat/', '^(?!bad)feat/', '^(a)\\1/', '^[a-z]+$', '^$', '^a*/x', '^[^a]/x', '^\\w+/\\d+$', '^feat[/]x', '^\\.hidden/', '^/x', '^[ ]x/']

function pyAccepts(pattern, text) {
  const r = spawnSync('python3', ['-I', '-c', 'import re,sys; sys.exit(0 if re.search(sys.argv[1], sys.argv[2]) else 1)', pattern, text])
  return r.status === 0
}

for (const mode of ['pr', 'stack']) {
  test(`verify security VS-6 (${mode}): regex literal accepted by the rule before S-001, pattern quoted`, () => {
    for (const p of PATTERNS) {
      const x = pf([R('regex', p)], { mode })
      assert.ok(x.j, p)
      assert.ok([0, 1].includes(x.t.status), p)
      assert.equal(x.t.stderr, '', p)
      if (x.j.ok) continue
      const s = x.j.suggestion
      const m = /^--branch-format "(.*)\/\{name\}" \(rule "R": regex "/s.exec(s)
      let verdict = 'held'
      let observed = s
      if (m && m[1] !== '<literal>') {
        const probe = `${m[1]}/S-001`
        const accepted = pyAccepts(p, probe)
        observed = `literal ${JSON.stringify(m[1])}; ${probe} accepted=${accepted}`
        if (!accepted) verdict = 'broke'
        assert.ok(accepted, `${p}: literal ${m[1]} gives ${probe}, which the rule rejects`)
      } else {
        assert.ok(s.startsWith('--branch-format "<literal>/{name}"'), p)
        assert.ok(s.includes('choose a literal that the pattern accepts before S-001'), p)
      }
      assert.ok(s.includes(`regex "${p}"`), `${p}: pattern is quoted`)
      record({ charter: 'VS-6 regex literal', input: `${mode} ${p}`, expected: 'literal accepted at S-001 or text fallback, pattern quoted', observed, result: verdict, test: 'VS-6 patterns' })
      noEffect(x)
    }
  })
}

test('verify security VS-6: invalid, deep, long and catastrophic patterns do not hang or raise', () => {
  const pats = {
    'unbalanced paren': '(',
    'unbalanced class': '[',
    'lone star': '*',
    'bad group name': '(?P<',
    'bad escape': '\\',
    'deep nesting 1500': '('.repeat(1500) + 'a' + ')'.repeat(1500),
    'deep nesting 40000': '('.repeat(40000) + ')'.repeat(40000),
    'long literal 100k': '^' + 'a'.repeat(100000) + '/',
    'long alternation 5000': '^(' + Array.from({ length: 5000 }, (_, i) => `x${i}`).join('|') + ')/',
    'catastrophic (a+)+$': '(a+)+$',
    'catastrophic (a|aa)+$': '^(a|aa)+$',
    'catastrophic (x+x+)+y': '^(x+x+)+y',
    'lookbehind': '(?<=a)b/',
    'conditional': '^(a)?(?(1)b|c)/',
    'inline flag mid': 'a(?i)b',
    'possessive': '^a++/',
    'atomic': '^(?>a)/',
    'unicode class': '^\\p{Lu}+/',
    'repeat max small': '^a{0,5}/',
    'repeat reversed': '^a{5,2}/',
  }
  for (const [label, p] of Object.entries(pats)) {
    const x = pf([R('regex', p)])
    const t0 = x.t.durationMs
    const clean = !x.t.stderr.includes('Traceback') && x.j && [0, 1].includes(x.t.status) && t0 < 20000
    record({ charter: 'VS-6 pathological patterns', input: label, expected: 'JSON verdict, exit 0 or 1, no traceback, under 20 seconds', observed: `exit ${x.t.status}, ${Math.round(t0)} ms, ${x.t.stderr ? 'stderr ' + JSON.stringify(x.t.stderr.slice(-80)) : 'stderr clean'}`, result: clean ? 'held' : 'broke', test: 'VS-6 pathological' })
    assert.ok(x.j, `${label}: no JSON; stderr ${x.t.stderr.slice(-200)}`)
    assert.ok([0, 1].includes(x.t.status), label)
    assert.ok(!x.t.stderr.includes('Traceback'), label)
    assert.ok(t0 < 20000, `${label}: ${t0} ms`)
    noEffect(x)
  }
})

test('verify security VS-7: hostile corpus in a rule pattern never crashes preflight', () => {
  const families = ['injection', 'control-chars', 'flag-like-values', 'format-strings', 'oversized', 'traversal', 'unicode-confusables', 'unicode-whitespace', 'nul']
  for (const fam of families) {
    for (const e of load(fam)) {
      for (const op of [...OPS, 'regex']) {
        const value = e.value
        const x = pf([R(op, value)])
        const label = `${fam}/${e.id} ${op}`
        const clean = x.j && [0, 1].includes(x.t.status) && !x.t.stderr.includes('Traceback')
        record({ charter: 'VS-7 hostile pattern', input: `${label}: ${JSON.stringify(value).slice(0, 50)}`, expected: 'JSON verdict, exit 0 or 1, no traceback', observed: `exit ${x.t.status}${x.t.stderr ? ', stderr ' + JSON.stringify(x.t.stderr.slice(-60)) : ''}`, result: clean ? 'held' : 'broke', test: 'VS-7 pattern corpus' })
        assert.ok(x.j, `${label}: ${x.t.stderr.slice(-200)}`)
        assert.ok([0, 1].includes(x.t.status), label)
        assert.ok(!x.t.stderr.includes('Traceback'), label)
        assert.equal(x.t.stderr, '', `${label}: stderr not clean`)
        noEffect(x)
      }
    }
  }
})

test('verify security VS-7: hostile rule label never crashes preflight', () => {
  for (const fam of ['injection', 'control-chars', 'format-strings', 'oversized', 'unicode-whitespace']) {
    for (const e of load(fam)) {
      const x = pf([R('regex', '^a/', false, e.value)])
      const label = `${fam}/${e.id}`
      record({ charter: 'VS-7 hostile label', input: `${label}: ${JSON.stringify(e.value).slice(0, 40)}`, expected: 'JSON verdict, exit 1, no traceback', observed: `exit ${x.t.status}`, result: x.j && x.t.status === 1 && !x.t.stderr ? 'held' : 'broke', test: 'VS-7 label corpus' })
      assert.ok(x.j, label)
      assert.equal(x.t.status, 1, label)
      assert.equal(x.t.stderr, '', label)
    }
  }
})

test('verify security VS-7: hostile --branch in mr mode and hostile --format never crash', () => {
  for (const fam of ['injection', 'control-chars', 'flag-like-values', 'format-strings', 'oversized', 'traversal', 'unicode-confusables', 'unicode-whitespace']) {
    for (const e of load(fam, { argv: true })) {
      const viaBranch = pf([R('starts_with', 'feature/')], { mode: 'mr', args: [], branch: e.value.startsWith('-') ? undefined : e.value })
      const label = `${fam}/${e.id}`
      record({ charter: 'VS-7 hostile branch', input: `${label}: ${JSON.stringify(e.value).slice(0, 40)}`, expected: 'exit 0, 1 or 2, JSON, no traceback', observed: `exit ${viaBranch.t.status}`, result: viaBranch.t.stdout && [0, 1, 2].includes(viaBranch.t.status) && !viaBranch.t.stderr.includes('Traceback') ? 'held' : 'broke', test: 'VS-7 branch corpus' })
      assert.ok([0, 1, 2].includes(viaBranch.t.status), label)
      assert.ok(viaBranch.t.json, label)
      assert.ok(!viaBranch.t.stderr.includes('Traceback'), label)
      assert.notEqual(viaBranch.t.json.derived, true, `${label}: mr never derives`)
      const viaFormat = pf([R('starts_with', 'feature/')], { args: ['--format', e.value] })
      assert.ok([0, 1, 2].includes(viaFormat.t.status), label)
      assert.ok(viaFormat.t.json, label)
      assert.ok(!viaFormat.t.stderr.includes('Traceback'), label)
      assert.notEqual(viaFormat.t.json.derived, true, `${label}: a given format never derives`)
    }
  }
})

test('verify security VS-7: hostile config branchFormat exits 0, 1 or 2 without a traceback', () => {
  for (const fam of ['injection', 'control-chars', 'format-strings', 'oversized', 'unicode-whitespace', 'unicode-confusables']) {
    for (const e of load(fam)) {
      if (e.value === '') continue
      const x = pf([R('starts_with', 'feature/')], { config: { branchFormat: e.value } })
      assert.ok([0, 1, 2].includes(x.t.status), `${fam}/${e.id}`)
      assert.ok(!x.t.stderr.includes('Traceback'), `${fam}/${e.id}`)
      assert.notEqual(x.j?.derived, true)
    }
  }
})

test('verify security VS-7: a rename line holds one line for a branch name without line breaks', () => {
  const x = pf([R('starts_with', 'feature/')], { mode: 'mr', branch: 'bad name$(id)' })
  assert.equal(x.j.suggestion.split('\n').length, 1)
  assert.ok(x.j.suggestion.startsWith('rename the branch "bad name$(id)"'))
})

test('verify security VS-7 todo: a pattern with a line break cannot start a second suggestion line', { todo: 'seed: suggestion embeds the pattern unescaped' }, () => {
  const evil = '^x\n--branch-format "evil/{name}"'
  const x = pf([R('regex', evil)])
  const lines = x.j.suggestion.split('\n')
  record({ charter: 'VS-7 line injection', input: 'regex pattern with newline then --branch-format', expected: 'one line', observed: `${lines.length} lines; second line ${JSON.stringify(lines[1])}`, result: lines.length === 1 ? 'held' : 'out-of-scope', test: 'VS-7 line injection todo' })
  assert.equal(lines.length, 1)
})

test('verify security VS-7 todo: quote and command substitution in a derived suggestion are escaped', { todo: 'seed: suggestion is not shell-quoted' }, () => {
  const x = pf([R('ends_with', '$(id)".lock')])
  record({ charter: 'VS-7 shell quoting', input: 'ends_with $(id)".lock', expected: 'inert text', observed: x.j.suggestion, result: 'out-of-scope', test: 'VS-7 quoting todo' })
  assert.ok(!/\$\(/.test(x.j.suggestion))
})
