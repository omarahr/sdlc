import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const KIT = `${WT}/skills/sdlc/test/testkit`
const SKILL = `${WT}/skills/sdlc`
const STATE = `${SKILL}/state-write.py`
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)
const { rng, callPython, defaultSeed } = await import(`${KIT}/property.mjs`)
const { all } = await import(`${KIT}/attack-corpus.mjs`)

const tmp = () => mkdtempSync(join(tmpdir(), 'vc-'))
const sh = (repo, ...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } }).trim()
const slices = [{ id: 'S-001', title: 'One', requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 } }]
function mkRepo(r, config, { branches = [], files = {} } = {}) {
  const base = { specPath: 'spec.md', gitMode: 'direct', defaultBranch: 'main', commitFormat: '' }
  return r.gitRepo({ files: { 'spec.md': '# s\n', ...(config === null ? {} : { '.sdlc/config.json': { ...base, ...config } }), '.sdlc/slices.json': slices, '.sdlc/milestones.json': [], '.sdlc/requirements.json': [], '.sdlc/log.jsonl': '{}\n', '.sdlc/DECISIONS.md': '# d\n', ...files }, branches })
}
const probe = (r, body, ...args) => {
  const t = r.exec('python3', ['-I', '-c', `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(STATE)})
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
${body}`, ...args], {})
  return t
}

test('verify contract: surface of the changed and added functions', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {})
  const t = probe(r, `
import inspect
out = {n: str(inspect.signature(getattr(mod, n))) for n in ("patch_slice", "slice_side_branches", "format_of")}
print(json.dumps(out))`)
  assert.equal(t.status, 0, t.stderr)
  assert.deepEqual(t.json, { patch_slice: '(repo, slice_id, patch, fmt)', slice_side_branches: '(repo, fmt, slice_id)', format_of: '(repo, config)' })
})

test('verify contract: patch_slice refuses a call without fmt', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {})
  const t = probe(r, `
try:
    mod.patch_slice(sys.argv[1], "S-001", {"notes": "x"})
    print(json.dumps({"raised": None}))
except TypeError as e:
    print(json.dumps({"raised": "TypeError"}))`, repo)
  assert.equal(t.json.raised, 'TypeError')
})

test('verify contract: fmt argument that differs from config wins and nothing else derives it', () => {
  const r = cliRunner()
  const repo = mkRepo(r, { branchFormat: 'feature/PROJ-1-{name}' })
  const t = probe(r, `
mod.format_of = lambda *a: (_ for _ in ()).throw(AssertionError("derived"))
print(json.dumps(mod.patch_slice(sys.argv[1], "S-001", {"notes": "x"}, "other/{name:lower}")))`, repo)
  assert.equal(t.status, 0, t.stderr)
  assert.equal(t.json.branch, 'other/s-001')
  assert.equal(sh(repo, 'branch', '--show-current'), 'other/s-001')
})

const PATCH = (repo) => ['patch-slice', '--repo', repo, '--slice', 'S-001']
function cliPatch(r, repo, script = STATE) { return r.exec('python3', [script, ...PATCH(repo)], { input: JSON.stringify({ notes: 'n' }) }) }

for (const [label, cfg, expectBranch] of [
  ['custom format', { branchFormat: 'feature/PROJ-123-{name}' }, 'feature/PROJ-123-S-001'],
  ['lowercase format', { branchFormat: 'feature/{name:lower}' }, 'feature/s-001'],
  ['default format written', { branchFormat: 'sdlc/{name}' }, 'sdlc/S-001'],
  ['no branchFormat', {}, 'sdlc/S-001'],
  ['empty branchFormat falls back', { branchFormat: '' }, 'sdlc/S-001'],
  ['non-string branchFormat falls back', { branchFormat: 7 }, 'sdlc/S-001'],
]) {
  test(`verify contract: patch-slice branch under ${label}`, () => {
    const r = cliRunner()
    const repo = mkRepo(r, cfg)
    const t = cliPatch(r, repo)
    assert.equal(t.status, 0, t.text())
    assert.equal(t.json.branch, expectBranch)
    assert.equal(sh(repo, 'branch', '--show-current'), expectBranch)
  })
}

const OLD = tmp()
{
  const dest = `${OLD}/skill`
  execFileSync('cp', ['-R', SKILL, dest])
  writeFileSync(`${dest}/state-write.py`, execFileSync('git', ['-C', WT, 'show', '38e600ffe03634965c87f7c9df3f3e402f69d822:skills/sdlc/state-write.py']))
}

const BAD_CONFIGS = {
  'missing config.json': { config: null },
  'invalid json': { config: null, files: { '.sdlc/config.json': '{"branchFormat":' } },
  'non-object json': { config: null, files: { '.sdlc/config.json': '[1]' } },
  'format without placeholder': { config: { branchFormat: 'feature/x' } },
  'format with two placeholders': { config: { branchFormat: '{name}/{name}' } },
  'format with whitespace': { config: { branchFormat: 'a b/{name}' } },
  'unknown git mode': { config: { gitMode: 'bogus' } },
  'config is a directory': { config: null, files: { '.sdlc/config.json': null } },
}
for (const cmd of ['patch-slice', 'base-branch']) {
  for (const [label, spec] of Object.entries(BAD_CONFIGS)) {
    test(`verify contract: ${cmd} with ${label} fails cleanly, same error class as before the change`, () => {
      const r = cliRunner()
      const make = () => mkRepo(r, spec.config, { files: spec.files })
      const run = (script) => r.exec('python3', [script, cmd, '--repo', make(), '--slice', 'S-001'], { input: '{"notes":"n"}' })
      const now = run(STATE)
      const before = run(`${OLD}/skill/state-write.py`)
      const tb = (t) => (/Traceback/.test(t.stderr) ? (t.stderr.trim().split('\n').pop().replace(/\/[^' ]*repo-\d+/g, '<repo>')) : null)
      assert.equal(tb(now), tb(before), `traceback differs from before the change\nnow: ${tb(now)}\nbefore: ${tb(before)}`)
      assert.equal(now.status, before.status, `${now.text()}\n---before\n${before.text()}`)
      if (tb(now)) console.log(`preexisting traceback (same before and after) for ${cmd} with ${label}: ${tb(now)}`)
      else assert.ok(!/Traceback/.test(now.stderr), now.stderr)
      if (now.status !== 0 && !tb(now)) {
        assert.equal(now.status, 2)
        assert.equal(now.json?.ok, false)
        const norm = (s) => s.replace(/\/[^"]*?\/(cfg|repo)-\d+/g, '<repo>').replace(/\/[^ "']*\/repo-\d+/g, '<repo>')
        assert.equal(norm(now.json.error), norm(before.json.error))
      }
    })
  }
}

test('verify contract: main calls format_of exactly once per run and passes the result on', () => {
  for (const cmd of ['patch-slice', 'base-branch']) {
    const r = cliRunner()
    const repo = mkRepo(r, { branchFormat: 'feature/{name:lower}' })
    const t = r.exec('python3', ['-I', '-c', `
import importlib.util, io, json, sys
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(STATE)})
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
calls = []
orig = mod.format_of
def counted(repo, cfg):
    calls.append(1); return orig(repo, cfg)
mod.format_of = counted
loads = []
orig_lf = mod.branches.load_format
mod.branches.load_format = lambda r: (loads.append(1), orig_lf(r))[1]
sys.argv = ["state-write.py", sys.argv[1], "--repo", sys.argv[2], "--slice", "S-001"]
sys.stdin = io.StringIO('{"notes": "n"}')
try:
    mod.main()
except SystemExit as e:
    code = e.code
else:
    code = None
sys.stderr.write(json.dumps({"calls": len(calls), "loads": len(loads), "code": code}))
`, cmd, repo], {})
    const m = JSON.parse(t.stderr.trim().split('\n').pop().replace(/\/[^' ]*repo-\d+/g, '<repo>'))
    assert.equal(m.calls, 1, `${cmd}: ${t.stderr}`)
    assert.equal(m.loads, 0, 'config branchFormat present: load_format must not run')
  }
})

test('verify contract: with no branchFormat, load_format is the fallback and runs once', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {})
  const t = r.exec('python3', ['-I', '-c', `
import importlib.util, io, json, sys
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(STATE)})
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
loads = []
orig_lf = mod.branches.load_format
mod.branches.load_format = lambda r: (loads.append(1), orig_lf(r))[1]
sys.argv = ["state-write.py", "base-branch", "--repo", sys.argv[1], "--slice", "S-001"]
try: mod.main()
except SystemExit: pass
sys.stderr.write(json.dumps({"loads": len(loads)}))
`, repo], {})
  assert.equal(JSON.parse(t.stderr.trim().split('\n').pop().replace(/\/[^' ]*repo-\d+/g, '<repo>')).loads, 1)
})

test('verify contract: base-branch under custom format and fallback', () => {
  const r = cliRunner()
  const a = r.exec('python3', [STATE, 'base-branch', '--repo', mkRepo(r, { branchFormat: 'feature/{name:lower}' }), '--slice', 'S-001'])
  assert.equal(a.status, 0, a.text()); assert.equal(a.json.branch, 'main')
  const dep = [{ ...slices[0], status: 'awaiting-merge' }, { ...slices[0], id: 'S-002', dependsOn: ['S-001'] }]
  const repo = mkRepo(r, { branchFormat: 'feature/{name:lower}' }, { files: { '.sdlc/slices.json': dep }, branches: ['feature/s-001'] })
  const b = r.exec('python3', [STATE, 'base-branch', '--repo', repo, '--slice', 'S-002'])
  assert.equal(b.json.branch, 'feature/s-001', b.text())
  const repo2 = mkRepo(r, {}, { files: { '.sdlc/slices.json': dep }, branches: ['sdlc/S-001'] })
  assert.equal(r.exec('python3', [STATE, 'base-branch', '--repo', repo2, '--slice', 'S-002']).json.branch, 'sdlc/S-001')
})

const FORMATS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/{name:lower}', 'team-{name}-x', '{name}', 'a/b/{name:lower}.tmp']
const IDS = ['S-001', 'S-0011', 'S-010', 'S-1', 'S-fix-1', 'S-fix', 'S-fix-M-1-2', 'S-001a']
function tails(id) {
  return [id, `${id}-attempt-1`, `${id}-attempt-12`, `${id}-attempt-`, `${id}-attempts-2`, `${id}-attempt-x`, `${id}-v0-http-api-0`, `${id}-v3-cli-12`, `${id}-v0-Http-0`, `${id}-v-cli-0`, `${id}-v0-cli-`, `x${id}-attempt-2`, `${id}-attempt-2-extra`]
}
const modelMatch = (fmt, id, branch) => {
  const lower = fmt.includes('{name:lower}')
  const [pre, suf] = fmt.split(lower ? '{name:lower}' : '{name}')
  const fold = (s) => (lower ? s.toLowerCase() : s)
  if (!fold(branch).startsWith(fold(pre)) || !fold(branch).endsWith(fold(suf))) return false
  if (branch.length < pre.length + suf.length) return false
  const mid = fold(branch.slice(pre.length, branch.length - suf.length))
  const esc = fold(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${esc}-attempt-[0-9]+$`).test(mid) || new RegExp(`^${esc}-v[0-9]+-[a-z0-9-]+-[0-9]+$`).test(mid)
}

test('verify contract: slice_side_branches property against a reference model (1500 runs)', () => {
  const seed = defaultSeed()
  const r = rng(seed)
  const kit = cliRunner()
  let runs = 0, nonEmpty = 0
  for (const fmt of FORMATS) {
    const lower = fmt.includes('{name:lower}')
    const [pre, suf] = fmt.split(lower ? '{name:lower}' : '{name}')
    const pool = []
    for (const id of IDS) for (const t of tails(id)) {
      const mid = lower && r.bool(0.3) ? t : lower ? t.toLowerCase() : t
      pool.push(pre + mid + suf)
      if (r.bool(0.2)) pool.push(pre.toUpperCase() + mid + suf)
      pool.push('other/' + mid, mid + 'zz', pre + 'run-1' + suf)
    }
    const names = [...new Set(pool)].filter((n) => { try { execFileSync('git', ['check-ref-format', '--branch', n], { stdio: 'ignore' }); return !n.includes('..') } catch { return false } })
    const repo = mkRepo(kit, { branchFormat: fmt })
    for (const n of names) try { sh(repo, 'branch', n) } catch {}
    const present = sh(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/').split('\n')
    const calls = []
    const n = 250
    for (let i = 0; i < n; i++) calls.push([repo, fmt, r.pick(IDS)])
    const res = callPython(STATE, 'slice_side_branches', calls)
    for (let i = 0; i < n; i++) {
      const [, , id] = calls[i]
      const want = present.filter((b) => modelMatch(fmt, id, b)).sort()
      assert.equal(res[i].outcome, 'return', `${fmt} ${id}: ${JSON.stringify(res[i])}`)
      assert.deepEqual(res[i].value, want, `seed=${seed} fmt=${fmt} id=${id}`)
      const sorted = [...res[i].value].sort()
      assert.deepEqual(res[i].value, sorted)
      if (want.length) nonEmpty++
      runs++
    }
    const again = callPython(STATE, 'slice_side_branches', calls.slice(0, 20))
    assert.deepEqual(again.map((x) => x.value), res.slice(0, 20).map((x) => x.value))
  }
  console.log(`property slice_side_branches: seed=${seed} runs=${runs} nonEmpty=${nonEmpty}`)
  assert.ok(runs >= 1000 && nonEmpty > 100)
})

test('verify contract: spec examples for slice_side_branches', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {}, { branches: ['feature/PROJ-1-S-001-v0-http-api-0', 'feature/PROJ-1-S-001-attempt-2', 'feature/PROJ-1-S-002-attempt-1', 'feature/PROJ-1-S-001', 'sdlc/S-001-v0-http-api-0', 'feature/PROJ-1-S-0011-attempt-1', 'feature/PROJ-1-S-010-v0-cli-0'] })
  const [a] = callPython(STATE, 'slice_side_branches', [[repo, 'feature/PROJ-1-{name}', 'S-001']])
  assert.deepEqual(a.value, ['feature/PROJ-1-S-001-attempt-2', 'feature/PROJ-1-S-001-v0-http-api-0'])
  const r2 = mkRepo(r, {}, { branches: ['feature/s-001-attempt-2', 'feature/s-001-v0-http-api-0', 'feature/s-002-attempt-1', 'feature/s-001', 'feature/s-0011-attempt-1'] })
  const [b] = callPython(STATE, 'slice_side_branches', [[r2, 'feature/{name:lower}', 'S-001']])
  assert.deepEqual(b.value, ['feature/s-001-attempt-2', 'feature/s-001-v0-http-api-0'])
})

test('verify contract: attack corpus as slice id never raises an uncaught exception', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {}, { branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-v0-cli-0', 'sdlc/S-001'] })
  const entries = all()
  const calls = entries.map((e) => [repo, 'sdlc/{name}', e.value])
  const res = callPython(STATE, 'slice_side_branches', calls)
  const bad = res.map((x, i) => ({ x, e: entries[i] })).filter(({ x }) => !['return', 'Fail'].includes(x.outcome))
  assert.deepEqual(bad.map((b) => `${b.e.id}: ${b.b?.x?.type} ${b.x.message}`), [])
  for (let i = 0; i < res.length; i++) if (res[i].outcome === 'return') assert.deepEqual(res[i].value, [], entries[i].id)
  console.log(`attack corpus entries=${entries.length}`)
})

test('verify contract: odd slice id types and odd repos', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {}, { branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-v0-cli-0'] })
  const odd = [null, 0, 1.5, true, [], {}, ['S-001']]
  const res = callPython(STATE, 'slice_side_branches', odd.map((v) => [repo, 'sdlc/{name}', v]))
  const types = res.map((x, i) => `${JSON.stringify(odd[i])}=>${x.outcome}${x.type ? ':' + x.type : ''}`)
  console.log(types.join(' | '))
  const notRepo = tmp()
  const [nr] = callPython(STATE, 'slice_side_branches', [[notRepo, 'sdlc/{name}', 'S-001']])
  assert.ok(['Fail'].includes(nr.outcome) || (nr.outcome === 'return' && nr.value.length === 0), JSON.stringify(nr))
  const [badfmt] = callPython(STATE, 'slice_side_branches', [[repo, 'no-placeholder', 'S-001']])
  assert.equal(badfmt.outcome, 'Fail', JSON.stringify(badfmt))
  const [nonstr] = callPython(STATE, 'slice_side_branches', [[repo, 7, 'S-001']])
  assert.ok(['Fail', 'return'].includes(nonstr.outcome), JSON.stringify(nonstr))
  assert.ok(res.every((x) => x.outcome !== 'exception'), types.join(' | '))
})

test('verify contract: slice_side_branches does not change the repo and returns a fresh list', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {}, { branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-v0-cli-0'] })
  const before = sh(repo, 'for-each-ref')
  const t = r.exec('python3', ['-I', '-c', `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(STATE)})
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
a = mod.slice_side_branches(sys.argv[1], "sdlc/{name}", "S-001")
a.append("mutated")
b = mod.slice_side_branches(sys.argv[1], "sdlc/{name}", "S-001")
print(json.dumps([a is b, b]))`, repo], {})
  assert.deepEqual(t.json, [false, ['sdlc/S-001-attempt-1', 'sdlc/S-001-v0-cli-0']])
  assert.equal(sh(repo, 'for-each-ref'), before)
})

test('verify contract: matching goes through branches.parse (spy and stub)', () => {
  const r = cliRunner()
  const repo = mkRepo(r, {}, { branches: ['sdlc/S-001-attempt-1', 'sdlc/S-001-v0-cli-0', 'sdlc/S-002-attempt-1', 'sdlc/weird-branch'] })
  const t = r.exec('python3', ['-I', '-c', `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("sw", ${JSON.stringify(STATE)})
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
seen = []
orig = mod.branches.parse
def spy(fmt, branch, ids=None):
    seen.append([branch, ids]); return orig(fmt, branch, ids=ids)
mod.branches.parse = spy
real = mod.slice_side_branches(sys.argv[1], "sdlc/{name}", "S-001")
n_real = len(seen)
def stub(fmt, branch, ids=None):
    if branch == "sdlc/weird-branch": return {"kind": "attempt", "known": True}
    return None
mod.branches.parse = stub
stubbed = mod.slice_side_branches(sys.argv[1], "sdlc/{name}", "S-001")
print(json.dumps({"real": real, "ids_args": sorted({json.dumps(x[1]) for x in seen}), "n_real": n_real, "stubbed": stubbed}))`, repo], {})
  assert.deepEqual(t.json.real, ['sdlc/S-001-attempt-1', 'sdlc/S-001-v0-cli-0'])
  assert.deepEqual(t.json.ids_args, ['["S-001"]'])
  assert.ok(t.json.n_real >= 5)
  assert.deepEqual(t.json.stubbed, ['sdlc/weird-branch'])
})

test('verify contract: state-write.py source holds no local pattern for verify or attempt names', () => {
  const src = readFileSync(STATE, 'utf8')
  const code = src.split('\n').filter((l) => !l.trim().startsWith('#'))
  const hits = code.filter((l) => /attempt-|-v\\d|-v\[0-9\]|-v\{|"-v"|'-v'|-v\d/.test(l))
  assert.deepEqual(hits, [])
  const regexUses = code.filter((l) => /\bre\.(compile|match|search|fullmatch|findall|sub)\b/.test(l))
  console.log('re uses in state-write.py:\n' + regexUses.join('\n'))
  const body = src.slice(src.indexOf('def slice_side_branches'), src.indexOf('def patch_slice'))
  assert.ok(!/\bre\./.test(body))
  assert.ok(/branches\.parse\(fmt, branch, ids=\[slice_id\]\)/.test(body))
})

test('verify contract: casing rule comes from branches.py alone', () => {
  const r = cliRunner()
  const lowerNames = ['feature/s-001-attempt-2', 'feature/s-001-v0-cli-0']
  const upperNames = ['feature/S-001-attempt-3', 'feature/S-001-v1-cli-0']
  const repo = mkRepo(r, {}, { branches: [...lowerNames, ...upperNames] })
  const [low] = callPython(STATE, 'slice_side_branches', [[repo, 'feature/{name:lower}', 'S-001']])
  const [def] = callPython(STATE, 'slice_side_branches', [[repo, 'feature/{name}', 'S-001']])
  const [defLower] = callPython(STATE, 'slice_side_branches', [[repo, 'feature/{name}', 's-001']])
  console.log(JSON.stringify({ low: low.value, def: def.value, defLower: defLower.value }))
  const [direct] = callPython(`${SKILL}/branches.py`, 'parse', [['feature/{name:lower}', 'feature/S-001-attempt-3', ['S-001']]])
  assert.deepEqual(low.value, [...lowerNames, ...upperNames].sort(), JSON.stringify(low))
  assert.deepEqual(def.value, ['feature/S-001-attempt-3', 'feature/S-001-v1-cli-0'])
  assert.deepEqual(defLower.value, lowerNames)
  assert.equal(direct.value.known, true)
})
