import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { up, down, sh, skillDir } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { gitRepo, refs } from '../helpers/repo.mjs'
import { respondWith, failNext, requests, clearRequests } from '../helpers/fakes.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
test.after(() => down(stack))

const SAMPLES = ['sdlc/S-001', 'sdlc/M-1-e2e', 'sdlc/run-1', 'sdlc/M-1']

function listFiles(dir) {
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else out.push(path.relative(dir, p))
    }
  }
  walk(dir)
  return out.sort()
}

function snapshot(repo) {
  const cfg = path.join(repo.dir, '.sdlc', 'config.json')
  return JSON.stringify({
    refs: repo.git('for-each-ref'),
    config: fs.existsSync(cfg) ? fs.readFileSync(cfg, 'utf8') : null,
    files: listFiles(repo.dir),
    status: repo.git('status', '--porcelain'),
  })
}

function pf(repo, args, opts) {
  return api(stack, 'branches.py', ['preflight', '--repo', repo.dir, ...args], opts)
}

function clean(t) {
  assert.equal(t.stderr, '')
  assert.ok(!t.stderr.includes('Traceback'))
  assert.ok(!t.stdout.includes('Traceback'))
  assert.notEqual(t.json, null, t.stdout)
  assert.equal(t.stdout.trim().split('\n').length, 1)
}

function ghRepo(rules, extra = {}) {
  const repo = gitRepo(stack, { forge: 'github', ...extra })
  clearRequests(stack, 'gh')
  respondWith(stack, 'gh', rules)
  return repo
}

function glabRepo(body) {
  const repo = gitRepo(stack, { forge: 'gitlab' })
  clearRequests(stack, 'glab')
  respondWith(stack, 'glab', body)
  return repo
}

const pat = (operator, pattern, extra = {}) => ({ type: 'branch_name_pattern', parameters: { operator, pattern, ...extra }, ...(extra.top || {}) })

scenario('SC-M-1-025', 'no config and no forge rules gives the default format unchecked', () => {
  clearRequests(stack, 'gh')
  clearRequests(stack, 'glab')
  const repo = gitRepo(stack)
  const before = snapshot(repo)
  for (const args of [['--mode', 'pr'], ['--mode', 'stack'], ['--mode', 'mr', '--branch', 'my-work'], ['--mode', 'direct'], ['--mode', 'mr']]) {
    const t = pf(repo, args)
    clean(t)
    assert.equal(t.status, 0, t.stdout)
    assert.equal(t.json.ok, true)
    assert.equal(t.json.format, 'sdlc/{name}')
    assert.equal(t.json.derived, false)
    assert.equal(t.json.forge, '')
    assert.deepEqual(t.json.rules, [])
    assert.equal(t.json.suggestion, '')
    for (const s of t.json.samples) {
      if (s.kind === 'working') continue
      assert.equal(s.result, 'unchecked')
    }
  }
  assert.equal(snapshot(repo), before)
  assert.deepEqual(requests(stack, 'gh'), [])
  assert.deepEqual(requests(stack, 'glab'), [])
})

scenario('SC-M-1-026', 'modes sample the loop kinds', () => {
  clearRequests(stack, 'gh')
  clearRequests(stack, 'glab')
  const repo = gitRepo(stack)
  const kinds = (m) => pf(repo, ['--mode', m])
  const pr = kinds('pr')
  const stk = kinds('stack')
  const mr = kinds('mr')
  const direct = kinds('direct')
  for (const t of [pr, stk, mr, direct]) clean(t)
  assert.deepEqual(pr.json.samples.map((s) => s.kind), ['slice', 'state', 'e2e'])
  assert.deepEqual(stk.json.samples.map((s) => s.kind), ['run', 'milestone', 'slice'])
  assert.deepEqual(mr.json.samples, [])
  assert.deepEqual(direct.json.samples, [])
  assert.equal(pr.json.samples[0].name, 'sdlc/S-001')
  assert.match(pr.json.samples[1].name, /^sdlc\/state-\d{14}$/)
  assert.equal(pr.json.samples[2].name, 'sdlc/M-1-e2e')
  assert.deepEqual(stk.json.samples.map((s) => s.name), ['sdlc/run-1', 'sdlc/M-1', 'sdlc/S-001'])
  assert.deepEqual(requests(stack, 'gh'), [])
  assert.deepEqual(requests(stack, 'glab'), [])
})

scenario('SC-M-1-027', 'bad modes are bad input', () => {
  const repo = gitRepo(stack)
  const before = snapshot(repo)
  for (const args of [['--mode', 'bogus'], [], ['--mode', 'PR']]) {
    const t = pf(repo, args)
    assert.equal(t.status, 2, t.stdout)
    assert.ok(!t.stderr.includes('Traceback'))
    assert.equal(t.stderr, '', t.stderr)
    assert.equal(t.json.ok, false)
    assert.ok(t.json.error)
    assert.equal(t.stdout.trim().split('\n').length, 1)
  }
  assert.equal(snapshot(repo), before)
})

scenario('SC-M-1-028', 'gh rules path encodes slashes', () => {
  const repo = ghRepo([])
  repo.git('remote', 'add', 'origin', 'https://github.com/octo/hello.git')
  const run = (mode, n) => {
    clearRequests(stack, 'gh')
    const t = pf(repo, ['--mode', mode])
    clean(t)
    assert.equal(t.json.ok, true)
    const seen = requests(stack, 'gh')
    assert.equal(seen.length, n)
    assert.ok(seen.every((r) => r.args[0] === 'api' && r.args.length === 2))
    return seen.map((r) => r.args[1])
  }
  const names = (mode) => pf(repo, ['--mode', mode]).json.samples.map((s) => s.name)
  const prPaths = run('pr', 3)
  const prNames = names('pr')
  const stamp = (x) => x.replace(/state-\d{14}/, 'state-T')
  assert.deepEqual(prPaths.map(stamp), prNames.map((n) => 'repos/{owner}/{repo}/rules/branches/' + stamp(n).replaceAll('/', '%2F')))
  assert.ok(prPaths.every((p) => !p.slice('repos/{owner}/{repo}/rules/branches/'.length).includes('/')))
  assert.ok(prPaths[0].endsWith('sdlc%2FS-001'))
  const stPaths = run('stack', 3)
  assert.ok(stPaths.every((p) => p.includes('%2F')))
})

scenario('SC-M-1-029', 'only pattern rules; labels fall back', () => {
  const rules = [
    { type: 'required_signatures' },
    { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 'sdlc/', name: 'named' } },
    { type: 'branch_name_pattern', ruleset_id: 7, parameters: { operator: 'contains', pattern: 'ZZZ' } },
    { type: 'branch_name_pattern', parameters: { operator: 'ends_with', pattern: '-qq' } },
    { type: 'branch_name_pattern', parameters: { operator: 'starts_with', pattern: 'nope/', negate: true, name: 'neg' } },
    { type: 'branch_name_pattern', parameters: { operator: 'regex', pattern: 'sdlc', name: 'sat' } },
  ]
  const repo = ghRepo(rules)
  const t = pf(repo, ['--mode', 'pr', '--format', 'zzz/{name}'])
  clean(t)
  assert.equal(t.json.rules.length, 5)
  assert.ok(t.json.rules.every((r) => r.kind))
  assert.deepEqual(t.json.rules.map((r) => r.label), ['named', 'ruleset 7', 'branch_name_pattern', 'neg', 'sat'])
  assert.deepEqual(t.json.rules.map((r) => r.negate), [false, false, false, true, false])
  assert.equal(t.json.ok, false)
  for (const s of t.json.samples) {
    assert.equal(s.result, 'fail')
    assert.equal(s.rule, 'named')
  }
})

scenario('SC-M-1-030', 'single rule derives a format', () => {
  const cases = [
    [pat('starts_with', 'feature/'), 'feature/sdlc/{name}'],
    [pat('ends_with', '-dev'), 'sdlc/{name}-dev'],
    [pat('contains', 'team-a'), 'sdlc/team-a/{name}'],
  ]
  for (const mode of ['pr', 'stack']) {
    for (const [rule, fmt] of cases) {
      const repo = ghRepo([rule])
      const t = pf(repo, ['--mode', mode])
      clean(t)
      assert.equal(t.status, 0, t.stdout)
      assert.equal(t.json.ok, true)
      assert.equal(t.json.derived, true)
      assert.equal(t.json.format, fmt)
      assert.equal(t.json.suggestion, '')
      assert.ok(t.json.samples.length > 0 && t.json.samples.every((s) => s.result === 'pass'))
      assert.ok(t.json.samples.every((s) => s.name.includes(fmt.split('{name}')[0])))
    }
  }
})

scenario('SC-M-1-031', 'derived format recorded in config is reused', () => {
  const repo = ghRepo([pat('starts_with', 'feature/')])
  const first = pf(repo, ['--mode', 'pr'])
  clean(first)
  assert.equal(first.json.format, 'feature/sdlc/{name}')
  const cfgPath = path.join(repo.dir, '.sdlc', 'config.json')
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  cfg.branchFormat = first.json.format
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
  const second = pf(repo, ['--mode', 'pr'])
  clean(second)
  assert.equal(second.status, 0)
  assert.equal(second.json.given, true)
  assert.equal(second.json.derived, false)
  assert.equal(second.json.format, 'feature/sdlc/{name}')
  assert.equal(JSON.parse(fs.readFileSync(cfgPath, 'utf8')).branchFormat, 'feature/sdlc/{name}')
})

scenario('SC-M-1-032', 'a given format does not derive', () => {
  for (const viaConfig of [false, true]) {
    const repo = ghRepo([pat('starts_with', 'feature/', { name: 'feat rule' })])
    if (viaConfig) {
      const p = path.join(repo.dir, '.sdlc', 'config.json')
      fs.writeFileSync(p, JSON.stringify({ forge: 'github', branchFormat: 'sdlc/{name}' }))
      repo.git('add', '-A')
      repo.git('commit', '-q', '-m', 'cfg')
    }
    const before = snapshot(repo)
    const t = pf(repo, viaConfig ? ['--mode', 'pr'] : ['--mode', 'pr', '--format', 'sdlc/{name}'])
    clean(t)
    assert.equal(t.status, 1, t.stdout)
    assert.equal(t.json.ok, false)
    assert.equal(t.json.derived, false)
    assert.equal(t.json.given, true)
    assert.ok(t.json.samples.every((s) => s.result === 'fail' && s.rule === 'feat rule'))
    assert.ok(t.json.suggestion.includes('--branch-format'))
    assert.equal(snapshot(repo), before)
  }
})

scenario('SC-M-1-033', 'a regex rule gives a literal suggestion', () => {
  const repo = glabRepo({ branch_name_regex: '^(feat|fix)/.+' })
  repo.git('remote', 'add', 'origin', 'https://gitlab.com/g/p.git')
  const before = snapshot(repo)
  const t = pf(repo, ['--mode', 'stack'])
  clean(t)
  assert.equal(t.status, 1, t.stdout)
  assert.equal(t.json.ok, false)
  assert.ok(t.json.suggestion.includes('--branch-format'))
  assert.ok(t.json.suggestion.includes('^(feat|fix)/.+'))
  assert.equal(snapshot(repo), before)
  const m = /--branch-format "([^"]+)\/\{name\}"/.exec(t.json.suggestion)
  assert.ok(m, t.json.suggestion)
  const literal = m[1]
  const check = sh(stack, 'python3', ['-I', '-c', 'import re,sys; sys.exit(0 if re.search(r"^(feat|fix)/.+", sys.argv[1]) else 1)', `${literal}/S-001`])
  assert.equal(check.status, 0, `${literal}/S-001`)
  const third = pf(repo, ['--mode', 'stack', '--format', `${literal}/{name}`])
  clean(third)
  assert.equal(third.status, 0, third.stdout)
  assert.equal(third.json.ok, true)
})

scenario('SC-M-1-034', 'regex satisfied by the default format', () => {
  const repo = glabRepo({ branch_name_regex: '^[a-z]+/.+' })
  const t = pf(repo, ['--mode', 'stack'])
  clean(t)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.format, 'sdlc/{name}')
  assert.equal(t.json.derived, false)
  assert.equal(t.json.forge, 'gitlab')
  assert.ok(t.json.samples.length === 3 && t.json.samples.every((s) => s.result === 'pass'))
})

scenario('SC-M-1-035', 'two rules or a negated rule fail with a suggestion', () => {
  const two = ghRepo([pat('starts_with', 'feature/', { name: 'A' }), pat('ends_with', '-dev', { name: 'B' })])
  let before = snapshot(two)
  let t = pf(two, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(t.json.ok, false)
  assert.equal(t.json.derived, false)
  assert.ok(t.json.samples.every((s) => s.result === 'fail' && s.rule === 'A'))
  assert.ok(t.json.suggestion.includes('--branch-format'))
  assert.equal(snapshot(two), before)

  const neg = ghRepo([pat('starts_with', 'sdlc/', { negate: true, name: 'N' })])
  before = snapshot(neg)
  t = pf(neg, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(t.json.ok, false)
  assert.equal(t.json.derived, false)
  assert.ok(t.json.samples.every((s) => s.result === 'fail' && s.rule === 'N'))
  assert.ok(t.json.suggestion.includes('--branch-format'))
  assert.equal(snapshot(neg), before)

  const single = ghRepo([pat('starts_with', 'feat {x}/', { name: 'S' })])
  t = pf(single, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.json.ok, false)
  assert.equal(t.json.derived, false)
  const one = ghRepo([pat('contains', 'a..b', { name: 'S' })])
  t = pf(one, ['--mode', 'pr', '--format', 'sdlc/{name}'])
  assert.equal(t.json.ok, false)
  assert.equal(t.json.suggestion, '--branch-format "sdlc/a..b/{name}"')
})

scenario('SC-M-1-036', 'working branch sample in mr mode', () => {
  const repo = glabRepo({ branch_name_regex: '^feat/.+' })
  const before = snapshot(repo)
  const working = (t) => t.json.samples.find((s) => s.kind === 'working')
  let t = pf(repo, ['--mode', 'mr', '--branch', 'bad-name'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(working(t).result, 'fail')
  assert.ok(t.json.suggestion.includes('rename'))
  assert.ok(t.json.suggestion.includes('bad-name'))
  t = pf(repo, ['--mode', 'mr', '--branch', 'feat/ok'])
  clean(t)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(working(t).result, 'pass')

  const none = glabRepo({})
  failNext(stack, 'glab', 'glab: no rule')
  t = pf(none, ['--mode', 'mr', '--branch', 'bad..name'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(working(t).rule, 'git check-ref-format')
  respondWith(stack, 'glab', {})
  t = pf(none, ['--mode', 'mr', '--branch', 'bad..name'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(working(t).rule, 'git check-ref-format')

  respondWith(stack, 'glab', { branch_name_regex: '^feat/.+' })
  t = pf(repo, ['--mode', 'mr', '--branch', 'bad..name'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(working(t).rule, 'push rule')

  t = pf(repo, ['--mode', 'pr', '--branch', 'bad-name'])
  clean(t)
  assert.equal(t.json.samples.find((s) => s.kind === 'working'), undefined)
  assert.equal(snapshot(repo), before)
})

function probe(code) {
  const script = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("branches", ${JSON.stringify(path.join(skillDir, 'branches.py'))})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
${code}
`
  const proc = sh(stack, 'python3', ['-I', '-c', script])
  return { status: proc.status, stderr: proc.stderr, json: (() => { try { return JSON.parse(proc.stdout) } catch { return null } })(), stdout: proc.stdout }
}

scenario('SC-M-1-037', 'evaluate is case-sensitive, unanchored, negate flips', () => {
  const t = probe(`
out = {}
def r(kind, pattern, negate=False):
    return {"kind": kind, "pattern": pattern, "negate": negate}
cases = [
 ("starts_with","feature/","feature/x"),("starts_with","Feature/","feature/x"),("starts_with","feature/","x/feature/"),
 ("ends_with","-dev","a-dev"),("ends_with","-DEV","a-dev"),("ends_with","-dev","-dev/a"),
 ("contains","team","x/team/y"),("contains","Team","x/team/y"),("contains","zz","x/team/y"),
 ("regex","feature","x/feature/y"),("regex","^feature/","sdlc/S-001"),
 ("starts_with","","abc"),("ends_with","","abc"),("contains","","abc"),
]
rows = []
for k,p,s in cases:
    rows.append([k,p,s,m.evaluate(r(k,p),s),m.evaluate(r(k,p,True),s)])
print(json.dumps(rows))
`)
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.stderr, '')
  const expected = [true, false, false, true, false, false, true, false, false, true, false, true, true, true]
  t.json.forEach((row, i) => {
    assert.equal(row[3], expected[i], JSON.stringify(row))
    assert.equal(row[4], !expected[i], JSON.stringify(row))
  })
})

scenario('SC-M-1-038', 'one fail fails; none failed with an unevaluable rule is unevaluated', () => {
  const good = pat('starts_with', 'sdlc/', { name: 'good' })
  const bad = pat('contains', 'ZZZ', { name: 'bad' })
  const rx = pat('regex', '(', { name: 'rx' })
  const repo = ghRepo([good, bad, rx])
  let t = pf(repo, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.status, 1)
  assert.ok(t.json.samples.every((s) => s.result === 'fail' && s.rule === 'bad'))
  const r2 = ghRepo([good, rx])
  t = pf(r2, ['--mode', 'pr'])
  clean(t)
  assert.ok(t.json.samples.every((s) => s.result === 'unevaluated'))
  assert.ok(t.json.notes.length > 0 && t.json.notes.every((n) => n.startsWith('cannot evaluate')))
  const r3 = ghRepo([rx])
  t = pf(r3, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.status, 0, t.stdout)
  assert.equal(t.json.ok, true)
})

scenario('SC-M-1-072', 'rules carry exactly the five keys', () => {
  const keys = ['kind', 'label', 'negate', 'pattern', 'source']
  const repo = ghRepo([
    pat('starts_with', 'sdlc/', { name: 'a' }),
    pat('ends_with', '-x', { name: 'b' }),
    pat('contains', 'sdlc', { name: 'c' }),
    pat('regex', 'sdlc', { name: 'd' }),
  ])
  let t = pf(repo, ['--mode', 'pr', '--format', 'sdlc/{name}-x'])
  clean(t)
  assert.deepEqual(t.json.rules.map((r) => r.kind).sort(), ['contains', 'ends_with', 'regex', 'starts_with'])
  for (const r of t.json.rules) {
    assert.deepEqual(Object.keys(r).sort(), keys)
    assert.equal(r.source, 'github')
  }
  const gl = glabRepo({ branch_name_regex: '^sdlc/.+' })
  t = pf(gl, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.json.rules.length, 1)
  assert.deepEqual(Object.keys(t.json.rules[0]).sort(), keys)
  assert.equal(t.json.rules[0].source, 'gitlab')
  assert.equal(t.json.rules[0].kind, 'regex')
})

scenario('SC-M-1-073', 'output shape and exit codes', () => {
  const keys = ['derived', 'forge', 'format', 'notes', 'ok', 'rules', 'samples', 'suggestion']
  const repo = gitRepo(stack)
  let t = pf(repo, ['--mode', 'pr'])
  clean(t)
  assert.equal(t.status, 0)
  for (const k of keys) assert.ok(k in t.json, k)
  for (const s of t.json.samples) assert.deepEqual(Object.keys(s).sort(), ['kind', 'name', 'result', 'rule'])
  const g = ghRepo([pat('starts_with', 'feature/', { name: 'lbl' })])
  t = pf(g, ['--mode', 'pr', '--format', 'sdlc/{name}'])
  clean(t)
  assert.equal(t.status, 1)
  assert.equal(t.json.ok, false)
  for (const k of keys) assert.ok(k in t.json, k)
  for (const s of t.json.samples) {
    assert.deepEqual(Object.keys(s).sort(), ['kind', 'name', 'result', 'rule'])
    assert.equal(s.rule, 'lbl')
  }
  t = pf(repo, ['--mode', 'bogus'])
  assert.equal(t.status, 2)
  assert.equal(t.json.ok, false)
  assert.ok(!t.stderr.includes('Traceback'))
})

scenario('SC-M-1-078', 'hostile working branch names stay contained', () => {
  const withRegex = glabRepo({ branch_name_regex: '^feat/.+' })
  const bare = gitRepo(stack)
  const before = [snapshot(withRegex), snapshot(bare)]
  const names = ['-x', '--help', '', 'a b', '@', 'a\nb', 'x'.repeat(300), 'a\u202Eb']
  const env = { GHP_TOKEN: 'ghp_SECRET123', SDLC_PROBE_ENV: 'env-value-7' }
  const failures = []
  for (const [repo, accepted] of [[withRegex, ['push rule', 'git check-ref-format']], [bare, ['git check-ref-format']]]) {
    for (const n of names) {
      for (const form of ['space', 'equals']) {
        const args = form === 'space' ? ['--mode', 'mr', '--branch', n] : ['--mode', 'mr', `--branch=${n}`]
        const t = pf(repo, args, { env })
        const label = `${repo === bare ? 'norule' : 'regex'} ${form} ${JSON.stringify(n.slice(0, 20))}`
        assert.ok(!t.stderr.includes('Traceback'), label)
        assert.ok(!t.stderr.includes('ghp_SECRET123') && !t.stdout.includes('ghp_SECRET123'), label)
        assert.ok(!t.stderr.includes('env-value-7') && !t.stdout.includes('env-value-7'), label)
        assert.ok(!/usage: git/i.test(t.stdout + t.stderr), label)
        assert.notEqual(t.json, null, label + ' ' + t.stdout)
        assert.equal(t.stdout.trim().split('\n').length, 1, label)
        const needle = JSON.stringify(n).slice(1, -1)
        if (n.length > 1 && t.stdout.split(needle).length - 1 > 1) failures.push(`${label}: hostile text appears ${t.stdout.split(needle).length - 1} times in stdout`)
        const w = (t.json.samples || []).find((x) => x.kind === 'working')
        if (!w || w.result !== 'fail' || !accepted.includes(w.rule)) failures.push(`${label}: no failing working sample: ${t.stdout.slice(0, 60)}`)
      }
    }
  }
  assert.deepEqual([snapshot(withRegex), snapshot(bare)], before)
  assert.deepEqual(failures, [])
})

scenario('SC-M-1-079', 'a derived format that fails validation is not used', () => {
  for (const [op, pattern] of [['starts_with', 'feat {x}/'], ['contains', 'a..b'], ['ends_with', '.lock']]) {
    const repo = ghRepo([pat(op, pattern, { name: 'R' })])
    const before = snapshot(repo)
    const t = pf(repo, ['--mode', 'pr'])
    clean(t)
    assert.equal(t.status, 1, `${op} ${pattern} ${t.stdout}`)
    assert.equal(t.json.ok, false)
    assert.equal(t.json.derived, false)
    assert.ok(t.json.samples.some((s) => s.result === 'fail' && s.rule === 'R'))
    assert.equal(snapshot(repo), before)
    const cfg = path.join(repo.dir, '.sdlc', 'config.json')
    assert.ok(!JSON.parse(fs.readFileSync(cfg, 'utf8')).branchFormat)
  }
})

scenario('SC-M-1-081', 'pattern operators match literal text', () => {
  const t = probe(`
pats = ["a.b","a+","(x","[","\\\\"]
subjects = ["axb","a+","(x","[","\\\\"]
rows = []
for p in pats:
    for s in subjects:
        for k in ("starts_with","ends_with","contains"):
            rows.append([k,p,s,m.evaluate({"kind":k,"pattern":p,"negate":False},s)])
print(json.dumps(rows))
`)
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.stderr, '')
  for (const [k, p, s, res] of t.json) {
    const expected = k === 'starts_with' ? s.startsWith(p) : k === 'ends_with' ? s.endsWith(p) : s.includes(p)
    assert.equal(res, expected, JSON.stringify([k, p, s]))
    if (p === 'a.b' && s === 'axb') assert.equal(res, false)
  }
})

scenario('SC-M-1-083', 'only the working branch fails with a derivable rule', () => {
  const repo = ghRepo([pat('starts_with', 'feature/', { name: 'F' })])
  const before = snapshot(repo)
  const t = pf(repo, ['--mode', 'mr', '--branch', 'main'])
  clean(t)
  assert.equal(t.status, 1, t.stdout)
  assert.equal(t.json.ok, false)
  assert.equal(t.json.derived, false)
  assert.equal(t.json.format, 'sdlc/{name}')
  const w = t.json.samples.find((s) => s.kind === 'working')
  assert.equal(w.result, 'fail')
  assert.ok(/rename/.test(t.json.suggestion) && t.json.suggestion.includes('main'))
  assert.equal(snapshot(repo), before)
  assert.ok(!fs.existsSync(path.join(repo.dir, '.sdlc', 'config.json')) || !JSON.parse(fs.readFileSync(path.join(repo.dir, '.sdlc', 'config.json'), 'utf8')).branchFormat)
})
