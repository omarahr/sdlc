import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = process.env.VERIFY_ROOT
const { cliRunner } = await import(`${ROOT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const SKILL = `${ROOT}/skills/sdlc`
const r = cliRunner({ skillDir: SKILL })
const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'sdlc/{name}' } } })
const name = (args, fmt) => r.run('branches.py', ['name', '--repo', repo, ...args, ...(fmt ? ['--format', fmt] : [])], { cwd: repo, watch: [repo] })
const parse = (branch, fmt) => r.run('branches.py', ['parse', '--repo', repo, '--branch', branch, ...(fmt ? ['--format', fmt] : [])], { cwd: repo, watch: [repo] })
const log = (t) => { process.stderr.write('\n=====\n' + t.text() + '\n') }

function refused(t) {
  assert.equal(t.status, 2, t.text())
  assert.equal(t.json.ok, false, t.text())
  assert.equal(t.json.branch, undefined)
  assert.ok(t.json.error && t.json.error.length > 0)
  assert.equal(t.treeUnchanged, true)
  assert.equal(t.stderr, '')
}

test('verify cli VS-1: slice and milestone refuse ids that parse as another kind', () => {
  for (const kind of ['slice', 'milestone']) {
    for (const id of ['S-001-attempt-2', 'S-001-v0-cli-0', 'S-001-attempt-0', 'S-001-v10-a-b-3']) {
      const t = name(['--kind', kind, '--id', id])
      log(t)
      refused(t)
      assert.match(t.json.error, /does not parse back/)
      assert.match(t.json.error, new RegExp(kind))
      const p = parse('sdlc/' + id)
      assert.notEqual(p.json.kind, 'slice')
    }
  }
})

test('verify cli VS-2: valid parts keep names and parse back under several formats', () => {
  const cases = [
    [['run', '--n', '3'], 'run-3', { kind: 'run', n: 3 }],
    [['slice', '--id', 'S-fix-M-1-2'], 'S-fix-M-1-2', { kind: 'slice', id: 'S-fix-M-1-2' }],
    [['slice', '--id', 'S-001-e2e'], 'S-001-e2e', { kind: 'slice', id: 'S-001-e2e' }],
    [['milestone', '--id', 'M-3'], 'M-3', { kind: 'milestone', id: 'M-3' }],
    [['e2e', '--id', 'M-3'], 'M-3-e2e', { kind: 'e2e', id: 'M-3' }],
    [['e2e-area', '--id', 'M-3', '--area', 'ui'], 'M-3-e2e-ui', { kind: 'e2e-area', id: 'M-3', area: 'ui' }],
    [['state'], null, { kind: 'state' }],
    [['verify', '--id', 'S-001', '--round', '2', '--profile', 'http-api', '--part', '1'], 'S-001-v2-http-api-1', { kind: 'verify', id: 'S-001', round: 2, profile: 'http-api', part: 1 }],
    [['attempt', '--id', 'S-001', '--n', '4'], 'S-001-attempt-4', { kind: 'attempt', id: 'S-001', n: 4 }],
  ]
  for (const fmt of ['sdlc/{name}', 'feature/PROJ-{name:lower}-x', '{name}', 'a/{name:lower}']) {
    for (const [args, tailText, expect] of cases) {
      const t = name(['--kind', ...args], fmt)
      assert.equal(t.status, 0, t.text())
      assert.equal(t.json.ok, true)
      assert.equal(t.treeUnchanged, true)
      const branch = t.json.branch
      if (tailText) {
        const lowered = fmt.includes('lower') ? tailText.toLowerCase() : tailText
        assert.equal(branch, fmt.replace(/\{name(:lower)?\}/, lowered), t.text())
      }
      const p = parse(branch, fmt)
      assert.equal(p.status, 0)
      for (const [k, v] of Object.entries(expect)) {
        if (fmt.includes('lower') && typeof v === 'string' && k !== 'kind') assert.equal(String(p.json[k]).toLowerCase(), v.toLowerCase(), p.text())
        else assert.equal(p.json[k], v, p.text())
      }
    }
  }
  log(name(['--kind', 'slice', '--id', 'S-fix-M-1-2']))
  log(name(['--kind', 'state']))
})

test('verify cli VS-4: integer parts compare by value', () => {
  const t = name(['--kind', 'run', '--n', '02'])
  log(t)
  assert.equal(t.status, 0, t.text())
  assert.equal(t.json.branch, 'sdlc/run-2')
  assert.equal(parse('sdlc/run-2').json.n, 2)
  const v = name(['--kind', 'verify', '--id', 'S-1', '--round', '007', '--profile', 'cli', '--part', '00'])
  log(v)
  assert.equal(v.status, 0, v.text())
  assert.equal(v.json.branch, 'sdlc/S-1-v7-cli-0')
  assert.equal(parse(v.json.branch).json.round, 7)
  for (const bad of ['2.0', ' 2', '+2', '0x2', 'True', 'abc', '', '１２']) {
    const b = name(['--kind', 'run', `--n=${bad}`])
    log(b)
    if (b.json.ok) { assert.match(b.json.branch, /^sdlc\/run-[0-9]+$/, b.text()); assert.equal(parse(b.json.branch).json.n, bad === '１２' ? 12 : 2) }
    assert.ok(b.status === 2 || b.status === 0)
    assert.ok(!b.stderr.includes('Traceback'), b.text())
    assert.ok(b.json, 'stdout must be JSON: ' + b.text())
  }
  const neg = name(['--kind', 'run', '--n=-1'])
  log(neg)
  assert.equal(neg.status, 2)
  assert.ok(!neg.stderr.includes('Traceback'))
  const huge = name(['--kind', 'run', '--n', '9'.repeat(5000)])
  log(huge)
  assert.ok(!huge.stderr.includes('Traceback'), huge.text())
  assert.ok(huge.json)
  const plus = name(['--kind', 'run', '--n=+2'])
  const sp = name(['--kind', 'run', '--n= 2'])
  log(plus); log(sp)
  for (const t of [plus, sp]) { assert.ok(!t.stderr.includes('Traceback')); if (t.json.ok) assert.equal(t.json.branch, 'sdlc/run-2') }
})

test('verify cli VS-6: formats whose prefix or suffix joins the tail into another kind', () => {
  const rows = [
    ['{name}-e2e', 'slice', 'M-1'],
    ['{name}-attempt-1', 'slice', 'S-001'],
    ['{name}-v1-a-1', 'slice', 'S-001'],
    ['{name}-3', 'slice', 'S-001'],
    ['{name}-e2e', 'milestone', 'M-1'],
    ['{name}-attempt-1', 'milestone', 'M-1'],
    ['run-{name}', 'slice', 'S-001'],
    ['{name}-e2e-x', 'milestone', 'M-1'],
  ]
  for (const [fmt, kind, id] of rows) {
    const t = name(['--kind', kind, '--id', id], fmt)
    log(t)
    if (t.status === 0) {
      const p = parse(t.json.branch, fmt)
      assert.equal(p.json.kind, kind, `silent mismatch: ${t.text()}\n${p.text()}`)
      assert.equal(p.json.id, id)
    } else refused(t)
  }
  const ok = name(['--kind', 'slice', '--id', 'S-001'], 'run-{name}')
  log(ok)
  const run = name(['--kind', 'run', '--n', '1'], 'run-{name}')
  log(run)
  assert.equal(run.json.branch, 'run-run-1')
})

test('verify cli VS-9: the name command reports refusal without side effects', () => {
  const checks = [
    [['--kind', 'slice'], /id/],
    [['--kind', 'slice', '--id', ''], /id/],
    [['--kind', 'bogus', '--id', 'S-1'], /bogus/],
    [['--kind', 'slice', '--id', 'S-1', '--format', 'no-placeholder'], /placeholder|name/],
    [['--kind', 'slice', '--id', 'S-1', '--format', '{name}{name}'], /exactly one/],
    [['--kind', 'slice', '--id', 'S-1', '--format', 'a b/{name}'], /whitespace/],
    [['--kind', 'slice', '--id', 'S-001-attempt-2'], /slice.*sdlc\/S-001-attempt-2/],
    [['--kind', 'run'], /n/],
    [['--kind', 'verify', '--id', 'S-1'], /round|profile|part/],
  ]
  for (const [args, re] of checks) {
    const t = name(args)
    log(t)
    refused(t)
    assert.match(t.json.error, re, t.text())
    assert.equal(t.stdout.trim().split('\n').length, 1)
  }
  const noKind = r.run('branches.py', ['name', '--repo', repo], { cwd: repo, watch: [repo] })
  log(noKind); refused(noKind)
  const badRepo = r.run('branches.py', ['name', '--repo', '/nonexistent path', '--kind', 'slice', '--id', 'S-1'], { cwd: repo, watch: [repo] })
  log(badRepo); refused(badRepo)
  const none = r.run('branches.py', [], { cwd: repo, watch: [repo] })
  log(none); assert.equal(none.status, 2)
})

test('verify cli VS-8: active_branch matches slice ids by ASCII lowering', () => {
  const fmt = 'feature/p-1-{name:lower}'
  const mk = (branches, sliceId, status = 'in_progress') => {
    const rp = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt, gitMode: 'direct', defaultBranch: 'main', specPath: 'docs/spec.md', specHash: createHash('sha256').update('# Spec\n').digest('hex'), overridesSeen: 0 }, 'docs/spec.md': '# Spec\n', '.sdlc/DECISIONS.md': '# Decisions\n', '.sdlc/slices.json': [{ id: sliceId, title: 't', requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', branch: '', pr: '', risk: '', riskReason: '', seeds: [], ideaKeys: [], notes: '', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, verifyDemanded: false, infraRetries: 0, gateCommit: '' } }], '.sdlc/requirements.json': [], '.sdlc/milestones.json': [] } })
    for (const b of branches) {
      r.git(rp, 'checkout', '-q', '-b', b)
      writeFileSync(join(rp, '.sdlc', 'slices.json'), JSON.stringify([{ id: sliceId, title: 't', requirements: [], dependsOn: [], kind: 'spec', status, phase: 'implement', branch: b, pr: '', risk: '', riskReason: '', seeds: [], ideaKeys: [], notes: '', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, verifyDemanded: false, infraRetries: 0, gateCommit: '' } }]))
      r.git(rp, 'commit', '-q', '-am', 'wip')
      r.git(rp, 'checkout', '-q', 'main')
    }
    return rp
  }
  const next = (rp) => r.run('next-action.py', ['--repo', rp], { cwd: rp, watch: [rp] })
  const a = mk(['feature/p-1-s-001'], 'S-001')
  const ta = next(a); log(ta)
  assert.equal(ta.json.checkout, 'feature/p-1-s-001', ta.text())
  assert.equal(ta.treeUnchanged, true)
  const k = mk(['feature/p-1-s-00K'], 'S-001')
  const tk = next(k); log(tk)
  assert.equal(tk.json.checkout, null, tk.text())
  const kid = mk(['feature/p-1-s-001'], 'S-00K')
  const tkid = next(kid); log(tkid)
  assert.equal(tkid.json.checkout, null, tkid.text())
  const foreign = mk(['other/s-001', 'sdlc/S-001'], 'S-001')
  const tf = next(foreign); log(tf)
  assert.equal(tf.json.checkout, null, tf.text())
  const upper = mk(['feature/p-1-S-001'], 'S-001')
  const tu = next(upper); log(tu)
  assert.equal(tu.json.checkout, 'feature/p-1-S-001', tu.text())
})
