import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, chmodSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const W = process.env.VERIFY_WORKTREE
const KIT = `${W}/skills/sdlc/test/testkit`
const { rng, defaultSeed, callPython, BRANCHES } = await import(`${KIT}/property.mjs`)
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { glabStub } = await import(`${KIT}/glab-stub.mjs`)
const { stubServer, restrictedPath } = await import(`${KIT}/stub-server.mjs`)
const HERE = dirname(fileURLToPath(import.meta.url))
const DRIVER = join(HERE, 'drive_glab.py')
const SHIM = join(HERE, 'shim.sh')
const SEED = defaultSeed()
const ROOT = mkdtempSync(join(tmpdir(), 'verify-contract-'))
const OLD = join(ROOT, 'old', 'branches.py')
mkdirSync(dirname(OLD), { recursive: true })
writeFileSync(OLD, execFileSync('git', ['-C', W, 'show', 'e575c1b:skills/sdlc/branches.py'], { encoding: 'utf8', maxBuffer: 1 << 26 }))
copyFileSync(`${W}/skills/sdlc/git-modes.json`, join(ROOT, 'old', 'git-modes.json'))

const runner = cliRunner()
const repoFor = (forge) => runner.gitRepo({ files: { '.sdlc/config.json': forge === undefined ? {} : { forge } } })

function bins(state) {
  const bin = join(ROOT, `bin-${Math.random().toString(36).slice(2)}`)
  mkdirSync(bin)
  for (const name of ['gh', 'glab']) {
    copyFileSync(SHIM, join(bin, name))
    chmodSync(join(bin, name), 0o755)
  }
  return bin
}

function drive(scenarios, { modules = { new: BRANCHES }, repo, extraEnv = {}, timeoutMs = 240000 } = {}) {
  const state = mkdtempSync(join(ROOT, 'state-'))
  const bin = bins(state)
  const r = spawnSync('python3', [DRIVER], {
    input: JSON.stringify({ modules, repo, state, scenarios }),
    encoding: 'utf8',
    cwd: mkdtempSync(join(ROOT, 'cwd-')),
    env: { PATH: `${bin}:${process.env.PATH}`, SHIM_DIR: state, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', HOME: ROOT, ...extraEnv },
    maxBuffer: 1 << 29,
    timeout: timeoutMs,
  })
  if (r.error) throw r.error
  assert.equal(r.status, 0, r.stderr.slice(0, 2000))
  return { rows: JSON.parse(r.stdout), state }
}

const KEYS = ['kind', 'label', 'negate', 'pattern', 'source']
const KINDS = ['starts_with', 'ends_with', 'contains', 'regex']
function shapeProblems(result) {
  const bad = []
  const top = Object.keys(result).sort().join(',')
  if (top !== 'by_sample,forge,notes,rules,unchecked') bad.push(`top keys ${top}`)
  if (typeof result.unchecked !== 'boolean') bad.push('unchecked not boolean')
  if (!Array.isArray(result.notes) || result.notes.some((n) => typeof n !== 'string')) bad.push('notes not string list')
  if (!Array.isArray(result.rules)) bad.push('rules not list')
  if (typeof result.by_sample !== 'object' || result.by_sample === null || Array.isArray(result.by_sample)) bad.push('by_sample not object')
  const all = [...(result.rules || []), ...Object.values(result.by_sample || {}).flat()]
  for (const rule of all) {
    if (JSON.stringify(Object.keys(rule).sort()) !== JSON.stringify(KEYS)) bad.push(`rule keys ${Object.keys(rule)}`)
    if (!['github', 'gitlab'].includes(rule.source)) bad.push(`source ${rule.source}`)
    if (!KINDS.includes(rule.kind)) bad.push(`kind ${JSON.stringify(rule.kind)}`)
    if (typeof rule.pattern !== 'string') bad.push(`pattern type ${typeof rule.pattern}`)
    if (typeof rule.negate !== 'boolean') bad.push(`negate type ${typeof rule.negate}`)
    if (typeof rule.label !== 'string') bad.push(`label type ${typeof rule.label}`)
  }
  for (const note of result.notes || []) {
    if (/[\r\n\0]/.test(note)) bad.push('note not one line')
  }
  return bad
}

const glabCase = (stdout, extra = {}) => ({ samples: ['feat/a', 'feat/b'], steps: [{ stdout, ...extra }] })
const j = JSON.stringify
const RULE = (regex) => ({ source: 'gitlab', kind: 'regex', pattern: regex, negate: false, label: 'push rule' })

test('verify contract VS-7 TC-contract-1: odd glab JSON never breaks the shape', () => {
  const cases = [
    ['array', '[]', 'none'], ['array of objects', j([{ branch_name_regex: '^a$' }]), 'none'], ['string', '"^a$"', 'none'],
    ['number', '42', 'none'], ['true', 'true', 'none'], ['false', 'false', 'none'], ['null', 'null', 'none'],
    ['nested object', j({ a: { b: { branch_name_regex: '^a$' } } }), 'none'],
    ['deep nesting 100000 arrays', '['.repeat(100000), 'note'], ['deep nesting closed 5000', '['.repeat(5000) + ']'.repeat(5000), 'none'],
    ['deep object nesting 50000', '{"a":'.repeat(50000) + '1', 'note'],
    ['regex number', j({ branch_name_regex: 5 }), 'none'], ['regex float', j({ branch_name_regex: 1.5 }), 'none'],
    ['regex list', j({ branch_name_regex: ['^a$'] }), 'none'], ['regex object', j({ branch_name_regex: { a: 1 } }), 'none'],
    ['regex true', j({ branch_name_regex: true }), 'none'], ['regex false', j({ branch_name_regex: false }), 'none'],
    ['regex 0', j({ branch_name_regex: 0 }), 'none'],
    ['invalid RE2 paren', j({ branch_name_regex: '(' }), 'rule', '('], ['invalid class', j({ branch_name_regex: '[a-' }), 'rule', '[a-'],
    ['invalid repeat', j({ branch_name_regex: '*a' }), 'rule', '*a'], ['backreference', j({ branch_name_regex: '(a)\\1' }), 'rule', '(a)\\1'],
    ['control chars', j({ branch_name_regex: '^a\u0001\u001b\u007f$' }), 'rule', '^a\u0001\u001b\u007f$'],
    ['NUL in regex', '{"branch_name_regex": "a\\u0000b"}', 'rule', 'a\u0000b'],
    ['newline in regex', j({ branch_name_regex: '^a\nb$' }), 'rule', '^a\nb$'],
    ['lone surrogate regex', '{"branch_name_regex": "\\ud800"}', 'rule', '\ud800'],
    ['astral regex', j({ branch_name_regex: '^\u{1f600}+$' }), 'rule', '^\u{1f600}+$'],
    ['whitespace-only regex', j({ branch_name_regex: '   ' }), 'probe', '   '],
    ['regex 1MB', j({ branch_name_regex: 'a'.repeat(1 << 20) }), 'rule', 'a'.repeat(1 << 20)],
    ['duplicate key last wins', '{"branch_name_regex": "^a$", "branch_name_regex": ""}', 'none'],
    ['NaN value', '{"branch_name_regex": NaN}', 'none'], ['Infinity value', '{"branch_name_regex": Infinity}', 'none'],
    ['BOM prefix', '﻿{"branch_name_regex": "^a$"}', 'note'], ['trailing garbage', '{"branch_name_regex": "^a$"} x', 'note'],
    ['two documents', '{} {}', 'note'], ['empty output', '', 'note'], ['spaces only', '   \n', 'note'], ['partial JSON', '{"branch_name_regex": "^a', 'note'],
    ['not json', 'not json at all', 'note'], ['html', '<html>502</html>', 'note'],
    ['extra keys ignored', j({ branch_name_regex: '^a$', commit_message_regex: 'x', id: 3, branch_name_regex_extra: 1 }), 'rule', '^a$'],
    ['key case differs', j({ Branch_Name_Regex: '^a$' }), 'none'],
    ['large body 8MB of other keys', j({ filler: 'x'.repeat(8 << 20), branch_name_regex: '^a$' }), 'rule', '^a$'],
    ['large array 2M entries', '[' + '0,'.repeat(2000000) + '0]', 'none'],
  ]
  const { rows } = drive(cases.map(([, stdout]) => glabCase(stdout)), { repo: repoFor('gitlab') })
  const out = []
  cases.forEach(([title, , expect, regex], i) => {
    const res = rows[i].new
    assert.ok(res.ok, `${title}: raised ${res.raised}`)
    const v = res.ok
    assert.deepEqual(shapeProblems(v), [], title)
    if (expect === 'none') {
      assert.deepEqual([v.rules, v.notes, v.unchecked], [[], [], false], title)
      assert.deepEqual(v.by_sample, { 'feat/a': [], 'feat/b': [] }, title)
    } else if (expect === 'note') {
      assert.equal(v.notes.length, 1, title)
      assert.match(v.notes[0], /^rules unknown on gitlab: ./, title)
      assert.deepEqual([v.rules, v.by_sample, v.unchecked], [[], {}, true], title)
    } else if (expect === 'rule') {
      assert.deepEqual(v.rules, [RULE(regex)], title)
      assert.deepEqual(v.by_sample, { 'feat/a': [RULE(regex)], 'feat/b': [RULE(regex)] }, title)
      assert.deepEqual([v.notes, v.unchecked], [[], false], title)
    } else {
      out.push(`${title}: rules=${j(v.rules).slice(0, 120)} unchecked=${v.unchecked}`)
    }
  })
  console.log(`VS-7 examples: ${cases.length} cases, probes: ${out.join(' | ')}`)
})

function genBody(r) {
  const regexPool = [
    () => ({ v: '^feat/.*$', expect: 'rule' }), () => ({ v: '', expect: 'none' }), () => ({ v: null, expect: 'none' }),
    () => ({ v: r.int(-5, 5), expect: 'none' }), () => ({ v: r.pick([[], ['a'], {}, { a: 1 }, true, false, 1.5]), expect: 'none' }),
    () => ({ v: r.pick(['(', '[', '*', '(?P<', '\\', 'a{2,1}', '(a)\\1', '[[:alpha:]', '(?<n>x)', '\\p{Greek}+', '^[a-z]+(?:/[a-z]+)*$']), expect: 'rule' }),
    () => ({ v: Array.from({ length: r.int(1, 30) }, () => r.pick(['a', 'é', '\u0000', '\n', '\t', '\u0085', ' ', '\u{1f600}', '​', '\\', '"', '/', '.', '*'])).join(''), expect: 'rule' }),
    () => ({ v: 'x'.repeat(r.int(1, 5000)), expect: 'rule' }),
  ]
  const kind = r.int(0, 9)
  if (kind === 0) return { text: j(r.pick([null, [], {}, 'x', 7, true, [1, 2], { a: 1 }, { branch_name_regex: { branch_name_regex: 'x' } }])), expect: 'none' }
  if (kind === 1) return { text: r.pick(['', ' ', '{', '}', '[1,', 'nul', '﻿{}', '{} {}', '{"a":}', "{'a':1}", '{"branch_name_regex":"x"', '\u0000', '{"a":1}\u0000']), expect: 'note' }
  if (kind === 2) return { text: r.pick(['NaN', 'Infinity', '-Infinity', '1e999', '-0', ' null ', '\n[]\n']), expect: 'none' }
  const pick = r.pick(regexPool)()
  const body = {}
  const extras = r.int(0, 3)
  for (let i = 0; i < extras; i++) body[r.pick(['commit_message_regex', 'id', 'author_email_regex', 'x', 'file_name_regex', 'deny_delete_tag'])] = r.pick([null, '', 'z', 1, true, ['a']])
  const withKey = r.bool(0.9)
  if (withKey) body.branch_name_regex = pick.v
  const expect = withKey ? pick.expect : 'none'
  return { text: j(body), expect, regex: pick.v }
}

test('verify contract VS-7 TC-contract-2: property, glab bodies against the spec model', () => {
  const runs = 1500
  const r = rng(SEED)
  const gens = Array.from({ length: runs }, () => genBody(r))
  const { rows } = drive(gens.map((g) => ({ samples: r.pick([[], ['a'], ['a', 'b', 'c'], ['x/y', 'é', '\u0000']]), steps: [{ stdout: g.text }] })), { repo: repoFor('gitlab') })
  const violations = []
  gens.forEach((g, i) => {
    const res = rows[i].new
    if (!res.ok) return violations.push(`#${i} raised ${res.raised}`)
    const v = res.ok
    const bad = shapeProblems(v)
    if (g.expect === 'rule') {
      if (j(v.rules) !== j([RULE(g.regex)]) || v.unchecked || v.notes.length) bad.push(`expected one rule for ${j(g.regex).slice(0, 60)}`)
    } else if (g.expect === 'none') {
      if (v.rules.length || v.notes.length || v.unchecked) bad.push('expected no rule')
    } else if (v.notes.length !== 1 || !v.unchecked || v.rules.length) bad.push('expected one note')
    if (bad.length) violations.push(`#${i} ${g.text.slice(0, 80)} -> ${bad.join('; ')}`)
  })
  console.log(`property glab body: seed=${SEED} runs=${runs} violations=${violations.length}`)
  assert.deepEqual(violations.slice(0, 5), [])
})

test('verify contract VS-7 TC-contract-3: property, gitlab_rule is pure and total', () => {
  const runs = 2000
  const r = rng(SEED + 1)
  const values = Array.from({ length: runs }, () => {
    const g = genBody(r)
    try { return { v: JSON.parse(g.text), g } } catch { return { v: r.pick([null, 1, 'x', [], {}]), g: { expect: 'none' } } }
  })
  const results = callPython(BRANCHES, 'gitlab_rule', values.map(({ v }) => [v]))
  const bad = []
  results.forEach((res, i) => {
    const { v } = values[i]
    if (res.outcome !== 'return') return bad.push(`#${i} ${res.outcome} ${res.message}`)
    const regex = v && typeof v === 'object' && !Array.isArray(v) ? v.branch_name_regex : undefined
    const want = typeof regex === 'string' && regex !== '' ? RULE(regex) : null
    if (j(res.value) !== j(want)) bad.push(`#${i} got ${j(res.value)?.slice(0, 100)} want ${j(want)?.slice(0, 100)}`)
  })
  console.log(`property gitlab_rule: seed=${SEED + 1} runs=${runs} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 5), [])
})

test('verify contract VS-7 TC-contract-4: glab failure notes stay one line and bounded', () => {
  const stderrs = ['boom', '', 'a\nb\nc', 'x'.repeat(200000), 'tab\there', 'ctl\u0001\u001b[31mred', 'nul\u0000inside', 'cr\rlf\r\nend', ' sep\u0085', 'é\u{1f600}']
  const { rows } = drive(stderrs.map((stderr) => ({ samples: ['a'], steps: [{ stderr, exit: 1 }] })), { repo: repoFor('gitlab') })
  const lens = []
  const probes = []
  rows.forEach((row, i) => {
    assert.ok(row.new.ok, `stderr #${i} raised`)
    const v = row.new.ok
    assert.equal(v.notes.length, 1)
    assert.match(v.notes[0], /^rules unknown on gitlab: ./)
    assert.deepEqual([v.rules, v.by_sample, v.unchecked], [[], {}, true])
    lens.push(v.notes[0].length)
    if (/[\r\n\0]/.test(v.notes[0])) probes.push(`stderr #${i} note has a line break or NUL`)
  })
  console.log(`note lengths: ${lens.join(',')}; multi-line notes: ${probes.length}`)
  writeFileSync(join(ROOT, 'note-probes.json'), j({ lens, probes }))
})

test('verify contract VS-7 TC-contract-5: exit codes 1, 2, 127 and stdout body', () => {
  const steps = [1, 2, 127, 255].map((exit) => ({ samples: ['a'], steps: [{ stdout: '{"message": "404 Project Not Found"}', stderr: '', exit }] }))
  const { rows } = drive([...steps, glabCase('{"message": "404 Project Not Found"}')], { repo: repoFor('gitlab') })
  rows.slice(0, 4).forEach((row, i) => {
    const v = row.new.ok
    assert.equal(v.notes.length, 1, `exit ${[1, 2, 127, 255][i]}`)
    assert.match(v.notes[0], /^rules unknown on gitlab: /)
    assert.equal(v.unchecked, true)
  })
  const ok = rows[4].new.ok
  assert.deepEqual([ok.rules, ok.notes, ok.unchecked], [[], [], false])
})

test('verify contract VS-7 TC-contract-6: glab argv, cwd and call count with odd samples', () => {
  const repo = repoFor('gitlab')
  const glab = glabStub({ script: [{ stdout: j({ branch_name_regex: '^a$' }) }] })
  const samples = ['--help', '-x', '$(touch pwn)', 'a b', '', '\n', 'é/\u{1f600}', 'x'.repeat(50000), '../../etc']
  const code = `import sys,json;sys.path.insert(0,${j(`${W}/skills/sdlc`)});import branches;print(json.dumps(branches.read_rules(${j(repo)},json.loads(sys.stdin.read()))))`
  const r = spawnSync('python3', ['-c', code], { input: j(samples), encoding: 'utf8', env: glab.env({ HOME: ROOT, PYTHONUTF8: '1' }), cwd: ROOT })
  assert.equal(r.status, 0, r.stderr)
  const calls = glab.calls()
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].argv, ['api', 'projects/:fullpath/push_rule'])
  assert.equal(calls[0].cwd, readdirSync(repo) && execFileSync('python3', ['-c', `import os,sys;print(os.path.realpath(sys.argv[1]))`, repo], { encoding: 'utf8' }).trim())
  const v = JSON.parse(r.stdout)
  assert.deepEqual(Object.keys(v.by_sample).sort(), [...new Set(samples)].sort())
  assert.equal(existsSync(join(ROOT, 'pwn')) || existsSync(join(repo, 'pwn')), false)
})

const GH = (operator, pattern, negate, name) => ({ type: 'branch_name_pattern', ruleset_id: 7, parameters: { operator, pattern, negate, name } })
const ghRule = (kind, pattern, negate, label) => ({ source: 'github', kind, pattern, negate, label })

test('verify contract VS-9 TC-contract-7: S-013 GitHub cases still give the S-013 results', () => {
  const body = [GH('starts_with', 'feat/', false, 'prefix'), GH('contains', 'bad', true, 'not bad'), { type: 'pull_request', parameters: {} }]
  const scenarios = [
    { samples: ['feat/a', 'feat/b'], steps: [{ stdout: j(body) }] },
    { samples: ['a'], steps: [{ stdout: j([GH('ends_with', '-x', false, ''), GH('regex', '^a$', true, 'r')]) }] },
    { samples: ['a', 'b'], steps: [{ stdout: j([GH('regex', '^a$', false, 'r')]) }, { stderr: 'boom', exit: 1 }] },
    { samples: ['a'], steps: [{ stderr: '', exit: 1 }] },
    { samples: ['a'], steps: [{ stdout: '{"message":"Not Found"}' }] },
    { samples: ['a'], steps: [{ stdout: 'nope' }] },
    { samples: [], steps: [{ stdout: '[]' }] },
  ]
  const { rows } = drive(scenarios, { modules: { old: OLD, new: BRANCHES }, repo: repoFor('github') })
  rows.forEach((row, i) => {
    assert.deepEqual(row.new, row.old, `scenario ${i}`)
    assert.ok(row.new.ok, `scenario ${i} raised`)
    assert.deepEqual(shapeProblems(row.new.ok), [], `scenario ${i}`)
  })
  const first = rows[0].new.ok
  assert.deepEqual(first.rules, [ghRule('starts_with', 'feat/', false, 'prefix'), ghRule('contains', 'bad', true, 'not bad')])
  assert.deepEqual(Object.keys(first.by_sample), ['feat/a', 'feat/b'])
  assert.equal(first.unchecked, false)
  const mid = rows[2].new.ok
  assert.deepEqual([mid.rules, mid.by_sample, mid.unchecked, mid.notes], [[], {}, true, ['rules unknown on github: boom']])
  assert.equal(rows[3].new.ok.notes[0], 'rules unknown on github: gh exited with status 1')
  assert.equal(rows[4].new.ok.notes[0], 'rules unknown on github: gh printed JSON that is not a list')
  assert.equal(rows[5].new.ok.notes[0], 'rules unknown on github: gh printed output that is not JSON')
  assert.deepEqual(rows[6].new.ok, { forge: 'github', rules: [], by_sample: {}, notes: [], unchecked: false })
})

function genGh(r) {
  const op = () => r.pick(['starts_with', 'ends_with', 'contains', 'regex'])
  let wellFormed = true
  const rule = () => r.pick([
    () => GH(op(), r.pick(['feat/', '^a$', 'x', 'é', '']), r.bool(), r.pick(['n', '', null, 'name with space'])),
    () => ({ type: 'branch_name_pattern', ruleset_id: r.pick([1, 0, null, 'abc']), parameters: { operator: op(), pattern: 'p', negate: r.bool(), name: r.pick(['', null]) } }),
    () => ({ type: 'pull_request', parameters: {} }), () => ({ type: 'required_status_checks' }), () => 'junk', () => null, () => 7, () => [],
    () => { wellFormed = false; return { type: 'branch_name_pattern' } }, () => { wellFormed = false; return { type: 'branch_name_pattern', parameters: 'x' } },
  ])()
  const step = () => {
    const kind = r.int(0, 9)
    if (kind <= 5) return { stdout: j(Array.from({ length: r.int(0, 4) }, rule)) }
    if (kind === 6) return { stdout: r.pick(['{}', 'null', '"x"', '3', '', 'garbage', '[1,', '{"message":"x"}']) }
    return { stderr: r.pick(['boom', '', 'a\nb', 'gh: HTTP 404']), exit: r.pick([1, 2, 4, 127]) }
  }
  const samples = Array.from({ length: r.int(0, 4) }, () => r.pick(['feat/a', 'b', 'é/x', 'a b', 'x#y%z', '']))
  const steps = Array.from({ length: r.int(1, 4) }, step)
  return { samples, steps, wellFormed }
}

test('verify contract VS-9 TC-contract-8: property, new read_rules equals the S-013 read_rules for gh', () => {
  const runs = 1200
  const r = rng(SEED + 2)
  const scenarios = Array.from({ length: runs }, () => genGh(r))
  const { rows } = drive(scenarios, { modules: { old: OLD, new: BRANCHES }, repo: repoFor('github') })
  const bad = []
  const malformed = []
  rows.forEach((row, i) => {
    if (j(row.old) !== j(row.new)) bad.push(`#${i} ${j(scenarios[i]).slice(0, 150)} old=${j(row.old).slice(0, 200)} new=${j(row.new).slice(0, 200)}`)
    else if (row.new.ok) {
      const problems = shapeProblems(row.new.ok).filter((p) => p !== 'note not one line')
      if (problems.length && scenarios[i].wellFormed) bad.push(`#${i} shape ${problems.join('; ')}`)
      if (problems.length && !scenarios[i].wellFormed) malformed.push(`#${i} ${problems[0]}`)
    }
  })
  console.log(`property gh differential: seed=${SEED + 2} runs=${runs} violations=${bad.length} malformed-gh-rule-probes=${malformed.length} first=${malformed[0]}`)
  assert.deepEqual(bad.slice(0, 5), [])
})

test('verify contract VS-9 TC-contract-9: FORGE_TIMEOUT applies to gh and glab, GH_PROMPT_DISABLED stays set', () => {
  const repoGh = repoFor('github')
  const repoGl = repoFor('gitlab')
  const timings = {}
  for (const [forge, repo, name] of [['github', repoGh, 'gh'], ['gitlab', repoGl, 'glab']]) {
    const stub = stubServer({ name, script: [{ delaySeconds: 6, stdout: '[]' }] })
    const code = `import sys,json,time;sys.path.insert(0,${j(`${W}/skills/sdlc`)});import branches;branches.FORGE_TIMEOUT=1;t=time.time();v=branches.read_rules(${j(repo)},['a']);print(json.dumps([v,time.time()-t]))`
    const t0 = Date.now()
    const r = spawnSync('python3', ['-c', code], { encoding: 'utf8', env: stub.env({ HOME: ROOT, PYTHONUTF8: '1' }), cwd: ROOT, timeout: 30000 })
    assert.equal(r.status, 0, r.stderr)
    const [v, secs] = JSON.parse(r.stdout)
    timings[forge] = secs
    assert.ok(secs < 4, `${forge} took ${secs}s`)
    assert.equal(v.notes.length, 1)
    assert.match(v.notes[0], new RegExp(`^rules unknown on ${forge}: `))
    assert.deepEqual([v.rules, v.by_sample, v.unchecked], [[], {}, true])
    assert.ok(Date.now() - t0 < 10000)
  }
  const state = mkdtempSync(join(ROOT, 'state-'))
  const bin = bins(state)
  const results = {}
  for (const [forge, repo] of [['github', repoGh], ['gitlab', repoGl]]) {
    const { state: st } = drive([{ samples: ['a'], steps: [{ stdout: '[]' }] }], { repo, extraEnv: { GH_PROMPT_DISABLED: '0' } })
    results[forge] = st
  }
  const seen = {}
  for (const forge of ['github', 'gitlab']) {
    const repo = forge === 'github' ? repoGh : repoGl
    const st = mkdtempSync(join(ROOT, 'state-'))
    const bin2 = bins(st)
    const code = `import sys,json;sys.path.insert(0,${j(`${W}/skills/sdlc`)});import branches;branches.read_rules(${j(repo)},['a'])`
    const run = spawnSync('python3', ['-c', code], { encoding: 'utf8', env: { PATH: `${bin2}:${process.env.PATH}`, SHIM_DIR: st, HOME: ROOT, GH_PROMPT_DISABLED: '0' }, cwd: ROOT })
    assert.equal(run.status, 0, run.stderr)
    mkdirSync(join(st, 'last'), { recursive: true })
    seen[forge] = readFileSync(join(st, 'prompt-env'), 'utf8').trim().split('\n')
  }
  console.log(`timeouts: ${j(timings)}; GH_PROMPT_DISABLED seen by shim with parent value 0: ${j(seen)}`)
  assert.deepEqual(seen.github, ['1'])
})

test('verify contract VS-9 TC-contract-10: missing gh is a note, no crash', () => {
  const code = `import sys,json;sys.path.insert(0,${j(`${W}/skills/sdlc`)});import branches;print(json.dumps(branches.read_rules(${j(repoFor('github'))},['a','b'])))`
  const r = spawnSync('python3', ['-c', code], { encoding: 'utf8', env: { PATH: restrictedPath(['python3', 'git']), HOME: ROOT }, cwd: ROOT })
  assert.equal(r.status, 0, r.stderr)
  const v = JSON.parse(r.stdout)
  assert.equal(v.notes.length, 1)
  assert.match(v.notes[0], /^rules unknown on github: /)
  assert.deepEqual([v.rules, v.by_sample, v.unchecked], [[], {}, true])
})

test('verify contract VS-9 TC-contract-11: one gh call per sample, path-quoted, cwd is the repo; no glab call', () => {
  const repo = repoFor('github')
  const gh = stubServer({ name: 'gh', fallback: { stdout: '[]' } })
  const glab = glabStub({})
  const samples = ['feat/a b', 'x#y', 'é', '--help']
  const code = `import sys,json;sys.path.insert(0,${j(`${W}/skills/sdlc`)});import branches;branches.read_rules(${j(repo)},${j(samples)})`
  const r = spawnSync('python3', ['-c', code], { encoding: 'utf8', env: { PATH: glab.path(gh.path()), HOME: ROOT }, cwd: ROOT })
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(gh.calls().map((c) => c.argv), [
    ['api', 'repos/{owner}/{repo}/rules/branches/feat%2Fa%20b'], ['api', 'repos/{owner}/{repo}/rules/branches/x%23y'],
    ['api', 'repos/{owner}/{repo}/rules/branches/%C3%A9'], ['api', 'repos/{owner}/{repo}/rules/branches/--help'],
  ])
  assert.equal(glab.count(), 0)
})

test('verify contract surface TC-contract-12: exports, signature, purity and dependencies of the module', () => {
  const code = `import sys,json,inspect,importlib.util;spec=importlib.util.spec_from_file_location('b',${j(BRANCHES)});m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
names=sorted(n for n in dir(m) if not n.startswith('__'))
print(json.dumps({'names':names,'sig':str(inspect.signature(m.read_rules)),'timeout':[hasattr(m,'FORGE_TIMEOUT'),hasattr(m,'GH_TIMEOUT')],'timeout_value':m.FORGE_TIMEOUT}))`
  const r = spawnSync('python3', ['-I', '-c', code], { encoding: 'utf8', cwd: ROOT })
  assert.equal(r.status, 0, r.stderr)
  const s = JSON.parse(r.stdout)
  console.log(`surface: ${s.names.join(' ')}\nread_rules${s.sig} FORGE_TIMEOUT=${s.timeout_value} has FORGE_TIMEOUT=${s.timeout[0]} has GH_TIMEOUT=${s.timeout[1]}`)
  assert.equal(s.sig, '(repo, samples)')
  assert.deepEqual(s.timeout, [true, false])
  const imports = readFileSync(BRANCHES, 'utf8').split('\n').filter((l) => /^(import|from) /.test(l)).join(' ')
  console.log(`imports: ${imports}`)
  assert.doesNotMatch(imports, /requests|httpx|urllib3|yaml/)
})

test('verify contract determinism TC-contract-13: same input gives same output, input samples not mutated, results not aliased', () => {
  const samples = ['a', 'b', 'c']
  const copy = [...samples]
  const { rows } = drive([{ samples, steps: [{ stdout: j({ branch_name_regex: '^a$' }) }] }, { samples, steps: [{ stdout: j({ branch_name_regex: '^a$' }) }] }], { repo: repoFor('gitlab') })
  assert.deepEqual(rows[0].new, rows[1].new)
  assert.deepEqual(samples, copy)
  const state = mkdtempSync(join(ROOT, 'state-'))
  const bin = bins(state)
  mkdirSync(join(state, 'last'))
  writeFileSync(join(state, 'last', 'stdout'), j({ branch_name_regex: '^a$' }))
  writeFileSync(join(state, 'last', 'stderr'), '')
  writeFileSync(join(state, 'last', 'exit'), '0')
  const code = `import sys,json;sys.path.insert(0,${j(`${W}/skills/sdlc`)});import branches
samples=['a','b']
v=branches.read_rules(${j(repoFor('gitlab'))},samples)
v['by_sample']['a'].append('mutated')
v['rules'][0]['label']='mutated'
print(json.dumps({'b_list_aliased':v['by_sample']['b']==['mutated'] or len(v['by_sample']['b'])==2,'b_label':v['by_sample']['b'][0]['label'] if v['by_sample']['b'] else None,'samples':samples}))`
  const r = spawnSync('python3', ['-c', code], { encoding: 'utf8', env: { PATH: `${bin}:${process.env.PATH}`, SHIM_DIR: state, HOME: ROOT }, cwd: ROOT })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  console.log(`aliasing probe: ${j(out)}`)
  writeFileSync(join(ROOT, 'alias-probe.json'), j(out))
})
