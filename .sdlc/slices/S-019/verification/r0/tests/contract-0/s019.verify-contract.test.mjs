import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

const ROOT = process.env.S019_ROOT
const SKILL = join(ROOT, 'skills/sdlc')
const BR = join(SKILL, 'branches.py')
const { cliRunner } = await import(`${ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { rng, defaultSeed, callPython } = await import(`${ROOT}/skills/sdlc/test/testkit/property.mjs`)

const r = cliRunner()
const run = (args) => r.run('branches.py', args)
const FORMATS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'x/{name:lower}', '{name}-sdlc', 'a.b/{name}/z']

test('verify contract: VS-1 list/name run branches (0,1,3 under default and custom formats)', () => {
  for (const fmt of FORMATS) {
    for (const count of [0, 1, 3]) {
      const names = []
      for (let n = 1; n <= count; n++) {
        const t = run(['name', '--repo', r.gitRepo({}), '--format', fmt, '--kind', 'run', '--n', String(n)])
        names.push(t.json.branch)
      }
      const repo = r.gitRepo({ branches: names })
      const l = run(['list', '--repo', repo, '--format', fmt, '--kind', 'run'])
      assert.equal(l.status, 0)
      assert.equal(l.json.branches.length, count)
      const nx = run(['name', '--repo', repo, '--format', fmt, '--kind', 'run', '--n', String(l.json.branches.length + 1)])
      assert.equal(nx.status, 0)
      const p = run(['parse', '--repo', repo, '--format', fmt, '--branch', nx.json.branch])
      assert.equal(p.json.kind, 'run')
      assert.equal(p.json.n, count + 1)
      assert.ok(!names.includes(nx.json.branch))
      assert.equal(nx.treeUnchanged, true)
    }
  }
})

test('verify contract: VS-1 a run branch from an older format is not counted', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-1', 'sdlc/run-2', 'feature/PROJ-1-run-1'] })
  const l = run(['list', '--repo', repo, '--format', 'feature/PROJ-1-{name}', '--kind', 'run'])
  assert.deepEqual(l.json.branches.map((b) => b.branch), ['feature/PROJ-1-run-1'])
  const l2 = run(['list', '--repo', repo, '--format', 'sdlc/{name}', '--kind', 'run'])
  assert.deepEqual(l2.json.branches.map((b) => b.branch), ['sdlc/run-1', 'sdlc/run-2'])
  const none = run(['list', '--repo', repo, '--format', 'other/{name}', '--kind', 'run'])
  assert.deepEqual(none.json.branches, [])
})

test('verify contract: VS-1 hostile --format values fail clearly, tree unchanged', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-1'] })
  for (const fmt of ['--help', '-x/{name}', '../{name}', 'a/../{name}', '{name}{name}', 'nothing', '', '{name:upper}', 'a b/{name}', 'x/{name}\n', '{name}/..']) {
    for (const cmd of [['name', '--kind', 'run', '--n', '2'], ['list', '--kind', 'run']]) {
      const t = run([cmd[0], '--repo', repo, `--format=${fmt}`, ...cmd.slice(1)])
      assert.equal(t.treeUnchanged, true, `tree changed for ${JSON.stringify(fmt)}`)
      assert.ok(t.status === 0 || t.status === 2, `status ${t.status} for ${JSON.stringify(fmt)}`)
      assert.ok(t.json, `no JSON for ${JSON.stringify(fmt)}: ${t.stdout} ${t.stderr}`)
      assert.equal(t.stderr.includes('Traceback'), false)
      if (t.status === 2) { assert.equal(t.json.ok, false); assert.ok(t.json.error.length > 3) }
      else assert.ok(!t.json.branch || !/(^|\/)\.\.(\/|$)|^-/.test(t.json.branch), `unsafe branch ${t.json.branch}`)
    }
  }
})


const refRepo = r.gitRepo({})
const sh = (args, input) => spawnSync('git', ['-C', refRepo, ...args], { input, encoding: 'utf8' })
const head = sh(['rev-parse', 'HEAD']).stdout.trim()
function setBranches(names, previous) {
  const lines = [...previous.filter((b) => !names.includes(b)).map((b) => `delete refs/heads/${b}\n`), ...names.filter((b) => !previous.includes(b)).map((b) => `create refs/heads/${b} ${head}\n`)].join('')
  const o = sh(['update-ref', '--stdin'], lines)
  assert.equal(o.status, 0, o.stderr)
}
const modelName = (fmt, n) => {
  const lower = fmt.includes('{name:lower}')
  const [pre, suf] = fmt.split(lower ? '{name:lower}' : '{name}')
  return pre + `run-${n}` + suf
}

test('verify contract: VS-2 property: list --kind run is sorted by numeric n, last entry is max n (1000 runs)', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? defaultSeed()); const g = rng(seed)
  let prev = []
  const runs = 1000
  for (let i = 0; i < runs; i++) {
    const fmt = FORMATS[g.int(0, FORMATS.length - 1)]
    const k = Math.floor(g.next() * 7)
    const ns = new Set()
    while (ns.size < k) ns.add(1 + Math.floor(g.next() * (g.next() < 0.5 ? 14 : 5000)))
    const noise = ['sdlc/S-001', 'sdlc/run-x', 'other/run-3', 'feature/PROJ-1-run-9', 'sdlc/run-007x', 'sdlc/M-1'].filter(() => g.next() < 0.3)
    const names = [...[...ns].map((n) => modelName(fmt, n)), ...noise.filter((b) => !ns.has(0))]
    const uniq = [...new Set(names)]
    setBranches(uniq, prev); prev = uniq
    const [res] = callPython(BR, 'list_kind', [[refRepo, fmt, 'run']])
    assert.equal(res.outcome, 'return', JSON.stringify(res))
    const got = res.value.map((e) => e.branch)
    const expectNs = [...uniq].map((b) => { const lower = fmt.includes('{name:lower}'); const [pre, suf] = fmt.split(lower ? '{name:lower}' : '{name}'); if (!b.startsWith(pre) || !b.endsWith(suf)) return null; const mid = b.slice(pre.length, b.length - suf.length); const m = /^run-(\d+)$/.exec(mid); return m ? Number(m[1]) : null }).filter((x) => x !== null).sort((a, b) => a - b)
    assert.deepEqual(res.value.map((e) => e.n), expectNs, `seed=${seed} fmt=${fmt} got=${got}`)
    if (expectNs.length) assert.equal(res.value.at(-1).n, Math.max(...expectNs))
  }
  console.log(`property-run list_kind seed=${seed} runs=${runs}`)
})

test('verify contract: VS-2 example: runs 2, 9, 10, 11 end at 11, empty repo gives empty list', () => {
  const repo = r.gitRepo({ branches: ['sdlc/run-9', 'sdlc/run-10', 'sdlc/run-2', 'sdlc/run-11'] })
  const l = run(['list', '--repo', repo, '--format', 'sdlc/{name}', '--kind', 'run'])
  assert.deepEqual(l.json.branches.map((b) => b.n), [2, 9, 10, 11])
  assert.equal(l.json.branches.at(-1).branch, 'sdlc/run-11')
  const nm = run(['name', '--repo', repo, '--format', 'sdlc/{name}', '--kind', 'run', '--n', '11'])
  assert.equal(nm.json.branch, 'sdlc/run-11')
  assert.equal(l.treeUnchanged, true)
  const empty = run(['list', '--repo', r.gitRepo({}), '--format', 'sdlc/{name}', '--kind', 'run'])
  assert.deepEqual(empty.json, { ok: true, command: 'list', format: 'sdlc/{name}', kind: 'run', branches: [] })
})

test('verify contract: VS-2 property: name then parse round-trips for run n (1000 runs)', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? defaultSeed()); const g = rng(seed)
  const calls = []
  for (let i = 0; i < 1000; i++) calls.push([FORMATS[g.int(0, FORMATS.length - 1)], 1 + Math.floor(g.next() * 100000)])
  const parsed = callPython(BR, 'parse', calls.map(([f, n]) => [f, modelName(f, n)]))
  parsed.forEach((res, i) => {
    assert.equal(res.outcome, 'return')
    assert.equal(res.value.kind, 'run'); assert.equal(res.value.n, calls[i][1])
  })
  console.log(`property-run parse seed=${seed} runs=1000`)
})

const PARSE_FMT = 'feature/PROJ-1-{name}'
test('verify contract: VS-4 parse feature/PROJ-1-S-002 is slice S-002; feature/PROJ-1-foo has no kind', () => {
  const repo = r.gitRepo({})
  const a = run(['parse', '--repo', repo, '--format', PARSE_FMT, '--branch', 'feature/PROJ-1-S-002'])
  assert.equal(a.status, 0); assert.equal(a.json.kind, 'slice'); assert.equal(a.json.id, 'S-002'); assert.equal(a.stderr, '')
  const b = run(['parse', '--repo', repo, '--format', PARSE_FMT, '--branch', 'feature/PROJ-1-foo'])
  assert.equal(b.status, 0); assert.equal(b.json.kind, null); assert.equal(b.stderr, '')
  assert.equal(a.treeUnchanged && b.treeUnchanged, true)
})

test('verify contract: VS-4 regex-character prefix is literal; repeated prefix', () => {
  const repo = r.gitRepo({})
  const cases = [
    ['f.+(x)/{name}', 'f.+(x)/S-002', 'slice'],
    ['f.+(x)/{name}', 'fooooo(x)/S-002', null],
    ['f.+(x)/{name}', 'f.+x/S-002', null],
    ['a+b/{name}', 'a+b/S-002', 'slice'],
    ['a+b/{name}', 'aab/S-002', null],
    ['a$b|c/{name}', 'a$b|c/S-002', 'slice'],
    ['a$b|c/{name}', 'a/S-002', null],
    ['{name}$', 'S-002$', 'slice'],
    ['{name}$', 'S-002', null],
    [PARSE_FMT, 'feature/PROJ-1-feature/PROJ-1-S-002', null],
    [PARSE_FMT, 'feature/PROJ-1-S-002/feature/PROJ-1-S-002', null],
    [PARSE_FMT, 'xfeature/PROJ-1-S-002', null],
    [PARSE_FMT, 'feature/PROJ-1-', null],
    [PARSE_FMT, 'feature/proj-1-S-002', null],
    [PARSE_FMT, 'feature/PROJ-1-s-002', null],
  ]
  for (const [fmt, branch, kind] of cases) {
    const t = run(['parse', '--repo', repo, '--format', fmt, '--branch', branch])
    assert.equal(t.status, 0, `${fmt} ${branch}`)
    assert.equal(t.json.kind ?? null, kind, `${fmt} ${JSON.stringify(branch)} -> ${t.stdout}`)
    assert.equal(t.stderr, '')
  }
})

test('verify contract: VS-4 exit codes and stderr stable', () => {
  const repo = r.gitRepo({})
  const missing = run(['parse', '--repo', repo, '--format', PARSE_FMT])
  assert.equal(missing.status, 2); assert.equal(missing.json.ok, false)
  const badfmt = run(['parse', '--repo', repo, '--format', 'noplaceholder', '--branch', 'x'])
  assert.equal(badfmt.status, 2); assert.equal(badfmt.json.ok, false)
  const ok = run(['parse', '--repo', repo, '--format', PARSE_FMT, '--branch', 'feature/PROJ-1-S-002'])
  const ok2 = run(['parse', '--repo', repo, '--format', PARSE_FMT, '--branch', 'feature/PROJ-1-S-002'])
  assert.equal(ok.stdout, ok2.stdout)
})

const skill = readFileSync(join(SKILL, 'SKILL.md'), 'utf8')
const bullets = skill.split('\n').filter((l) => l.startsWith('   - '))
const idx = (re) => { const i = bullets.findIndex((b) => re.test(b)); assert.ok(i >= 0, `no bullet ${re}`); return i }
const lineIdx = (re) => { const i = skill.split('\n').findIndex((b) => re.test(b)); assert.ok(i >= 0, `no line ${re}`); return i }

test('verify contract: VS-5 bullet order', () => {
  const wtp = lineIdx(/^   - \*\*Worktree path:\*\*/), gm = lineIdx(/^   - \*\*Git mode:\*\*/), bf = lineIdx(/^   - \*\*Branch format:\*\*/)
  const rw = lineIdx(/^   - \*\*Run worktree:\*\*/), sp = lineIdx(/^   - If `\$WT\/\.sdlc\/config\.json` exists and its `specPath`/), stop = lineIdx(/^   - `rm -f "\$REPO\/\.sdlc\/STOP"`/)
  assert.ok(wtp < gm && wtp < bf)
  assert.ok(bf < rw && rw < sp && sp < stop)
  const mism = skill.split('\n').filter((l) => /branchFormat` that differs from `\$FMT`/.test(l))
  assert.equal(mism.length, 1); assert.ok(mism[0].startsWith('   - **Run worktree:**'))
  assert.equal((skill.match(/WT="\$REPO\/\.claude\/worktrees\/sdlc-run"/g) ?? []).length, 1)
})

const rwBullet = skill.split('\n').find((l) => l.startsWith('   - **Run worktree:**'))
test('verify contract: VS-5 Run worktree bullet content', () => {
  assert.ok(rwBullet.includes('RUN_BRANCH=$(python3 "$SKILL_DIR/branches.py" name --repo "$REPO" --format "$FMT" --kind run --n <n>)'))
  assert.ok(!rwBullet.includes('sdlc/run-<n>'))
  assert.ok(rwBullet.includes('git -C "$REPO" worktree add "$WT" -b "$RUN_BRANCH"'))
  assert.ok(rwBullet.includes('git -C "$WT" checkout "$RUN_BRANCH"'))
  assert.ok(/one more than the count of `branches\.py list --repo "\$REPO" --format "\$FMT" --kind run`/.test(rwBullet))
  assert.ok(/relaunch[^.]*last entry of `branches\.py list/.test(rwBullet))
  assert.ok(rwBullet.includes('The driver creates no new run branch on a relaunch.'))
  assert.ok(rwBullet.includes('report both and end: a run in progress keeps its names.'))
})

function bashQuoted(script, env) {
  return spawnSync('bash', ['-c', script], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: env.HOME, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', ...env } })
}
test('verify contract: VS-5 quoted commands run as written: first run, then relaunch, against a scratch repo', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'sdlc-s019-v5-'))
  const REPO = join(scratch, 'repo'); mkdirSync(REPO)
  const env = { HOME: scratch, SKILL_DIR: SKILL, REPO, FMT: 'feature/{name}' }
  const g = (a) => spawnSync('git', ['-C', REPO, ...a], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: scratch, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } })
  g(['init', '-q', '-b', 'main']); g(['commit', '-q', '--allow-empty', '-m', 'i'])
  const nameCmd = (n) => rwBullet.match(/`(RUN_BRANCH=\$\(python3 "\$SKILL_DIR\/branches\.py" name[^`]*<n>\))`/)[1].replace('<n>', n)
  const listCmd = rwBullet.match(/`(branches\.py list --repo "\$REPO" --format "\$FMT" --kind run)`/)[1].replace('branches.py', 'python3 "$SKILL_DIR/branches.py"')
  const count = (out) => JSON.parse(out).branches.length
  const first = bashQuoted(`${listCmd}`, env); assert.equal(first.status, 0, first.stderr)
  assert.equal(count(first.stdout), 0)
  let sc = bashQuoted(`${nameCmd(1)}; printf %s "$RUN_BRANCH" | python3 -c 'import sys,json; print(json.load(sys.stdin)["branch"])'`, env)
  assert.equal(sc.status, 0, sc.stderr)
  assert.equal(sc.stdout.trim().split('\n').at(-1), 'feature/run-1')
  const WT = join(REPO, '.claude/worktrees/sdlc-run')
  const created = bashQuoted(`RUN_BRANCH=$(${nameCmd(1).slice('RUN_BRANCH=$('.length, -1)} | python3 -c 'import sys,json; print(json.load(sys.stdin)["branch"])'); git -C "$REPO" worktree add "${WT}" -b "$RUN_BRANCH"`, env)
  assert.equal(created.status, 0, created.stderr)
  g(['branch', 'feature/run-10', 'main'])
  g(['branch', 'feature/run-9', 'main'])
  const rel = bashQuoted(`${listCmd}`, env)
  const arr = JSON.parse(rel.stdout).branches
  assert.deepEqual(arr.map((b) => b.n), [1, 9, 10])
  const last = arr.at(-1).branch
  assert.equal(last, 'feature/run-10')
  assert.equal(g(['branch', '--list', 'feature/run-*']).stdout.split('\n').filter(Boolean).length, 3)
  const wtg = (a) => spawnSync('git', ['-C', WT, ...a], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: scratch } })
  wtg(['checkout', '-q', '--detach'])
  const co = bashQuoted(`WT="${WT}"; RUN_BRANCH="${last}"; git -C "$WT" checkout "$RUN_BRANCH"`, env)
  assert.equal(co.status, 0, co.stderr)
  assert.equal(wtg(['branch', '--show-current']).stdout.trim(), 'feature/run-10')
})

test('verify contract: VS-4 seed probe: a trailing newline in the branch still parses as slice (git cannot hold such a name)', () => {
  const t = run(['parse', '--repo', r.gitRepo({}), '--format', PARSE_FMT, '--branch', 'feature/PROJ-1-S-002\n'])
  assert.equal(t.json.kind, 'slice')
})
