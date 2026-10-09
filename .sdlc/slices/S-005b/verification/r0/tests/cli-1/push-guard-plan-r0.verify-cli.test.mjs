import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.VERIFY_ROOT ?? resolve(HERE, '../../../../../../..')
const GUARD = join(ROOT, 'skills/sdlc/test/push_guard.py')
const LOG = process.env.VERIFY_LOG ?? resolve(HERE, '../../logs/cli-1-plan-r0-transcripts.txt')
const { cliRunner } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/cli-runner.mjs')).href)
const { moduleLoader } = await import(pathToFileURL(join(ROOT, 'skills/sdlc/test/testkit/module-loader.mjs')).href)

const r = cliRunner()
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `push_guard.py verify-cli plan r0 transcripts, root ${ROOT}\n`)
const log = text => appendFileSync(LOG, `${text}\n`)

const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const JA = 'skills/sdlc/janitor.py'
const BR = 'skills/sdlc/branches.py'
const V = 'sdlc/S-001-v0-http-api-0'
const PY = '/opt/homebrew/bin/python3'

function copyTree() {
  const dir = r.dir('tree')
  for (const base of ['skills/sdlc', 'hooks']) {
    cpSync(join(ROOT, base), join(dir, base), { recursive: true, filter: src => !SKIPPED.has(basename(src)) })
  }
  return dir
}

function guard(dir, python = PY) {
  const t = r.exec(python, ['-I', GUARD, dir])
  assert.equal(t.status, 0, `push_guard.py exit ${t.status}: ${t.stderr}`)
  assert.ok(t.treeUnchanged, 'push_guard.py changed the scanned tree')
  return { out: JSON.parse(t.stdout), t }
}

const CLEAN_RUN = guard(copyTree())
const CLEAN = CLEAN_RUN.out
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function delta(out, base = CLEAN) {
  const changed = {}
  for (const k of new Set([...Object.keys(base), ...Object.keys(out)])) {
    if (same(out[k], base[k])) continue
    changed[k] = {
      added: (out[k] ?? []).filter(x => !(base[k] ?? []).includes(x)),
      removed: (base[k] ?? []).filter(x => !(out[k] ?? []).includes(x)),
      count: `${(base[k] ?? []).length} -> ${(out[k] ?? []).length}`,
    }
  }
  return changed
}

function apply(dir, file, edit) {
  const path = join(dir, file)
  const src = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const next = typeof edit === 'function' ? edit(src) : src + edit
  assert.notEqual(next, src, `${file}: the edit changed nothing`)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
}

function report(id, label, t, changed) {
  log(`\n=== ${id} ${label}\n$ ${t.argv.join(' ')}\nexit: ${t.status} (${t.durationMs} ms) tree unchanged: ${t.treeUnchanged}\nchanged keys: ${Object.keys(changed).join(', ') || '<none>'}`)
  for (const [k, d] of Object.entries(changed)) {
    log(`  ${k} (${d.count})`)
    for (const a of d.added) log(`    + ${a.slice(0, 300)}`)
    for (const x of d.removed) log(`    - ${x.slice(0, 300)}`)
  }
}

function probe(id, label, file, code) {
  const dir = copyTree()
  apply(dir, file, code)
  const { out, t } = guard(dir)
  const changed = delta(out)
  report(id, label, t, changed)
  return { keys: Object.keys(changed), changed, out }
}

function treeProbe(id, label, make) {
  const dir = copyTree()
  make(dir)
  const t = r.exec(PY, ['-I', GUARD, dir])
  if (t.status !== 0) {
    log(`\n=== ${id} ${label}\n$ ${t.argv.join(' ')}\nexit: ${t.status} (${t.durationMs} ms)\n  stderr tail: ${t.stderr.trim().split('\n').slice(-1)[0]}`)
    return { keys: [`exit ${t.status}`], out: null, exit: t.status }
  }
  const out = JSON.parse(t.stdout)
  const changed = delta(out)
  report(id, label, t, changed)
  return { keys: Object.keys(changed), changed, out, exit: 0 }
}

const fn = (head, ...lines) => `\n\ndef ${head}:\n${lines.map(l => `    ${l}`).join('\n')}\n`
const PUSH_PY = `import subprocess\nsubprocess.run(["git", "push", "origin", "${V}"])\n`
const PUSH_SH = `#!/bin/sh\ngit push origin ${V}\n`
const PUSH_JS = `require('child_process').execSync('git push origin ${V}')\n`

const writeAt = (rel, body, mode = 0o755) => dir => {
  const p = join(dir, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, body)
  chmodSync(p, mode)
}

test('verify cli TC-cli-1: the scanned list is exactly the 13 scripts and the clean tree reports no drift', () => {
  const scripts = CLEAN.files.filter(f => /\.(py|js)$/.test(f))
  log(`\n=== TC-cli-1 scanned files (${CLEAN.files.length})\n${CLEAN.files.join('\n')}`)
  assert.equal(scripts.length, 13)
  assert.deepEqual(CLEAN.opaque, [])
  assert.deepEqual(CLEAN.dynamic, [])
  assert.deepEqual(CLEAN.forgeViolations, [])
  assert.deepEqual(CLEAN.jsHits, [])
  const real = r.exec(PY, ['-I', GUARD, ROOT])
  assert.equal(real.status, 0)
  assert.ok(real.treeUnchanged)
  log(`guard on the real tip: exit ${real.status}, ${real.durationMs} ms`)
  assert.deepEqual(JSON.parse(real.stdout), CLEAN, 'the real tip differs from a copy of skills/sdlc and hooks')
})

test('verify cli TC-cli-2: a new script type, a symlink or a non-UTF-8 source in the scanned tree fails the guard', () => {
  const lib = r.dir('lib')
  writeFileSync(join(lib, 'x.py'), PUSH_PY)
  writeFileSync(join(lib, 'x.sh'), PUSH_SH)
  const latin = (rel, cookie) => dir => {
    const p = join(dir, rel)
    const src = existsSync(p) ? readFileSync(p) : Buffer.from('')
    writeFileSync(p, Buffer.concat([Buffer.from(cookie), src, Buffer.from(`\n# caf`), Buffer.from([0xe9]), Buffer.from(`\n${PUSH_PY}`)]))
  }
  const rawBytes = (rel, bytes) => dir => {
    const p = join(dir, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, Buffer.concat([Buffer.from('import subprocess\n'), Buffer.from(bytes), Buffer.from(`\nsubprocess.run(["git", "push", "origin", "${V}"])\n`)]))
  }
  const cases = [
    ['new .sh under skills/sdlc', writeAt('skills/sdlc/x.sh', PUSH_SH), ['files']],
    ['new .sh under hooks', writeAt('hooks/x.sh', PUSH_SH), ['files']],
    ['new .mjs under skills/sdlc', writeAt('skills/sdlc/x.mjs', PUSH_JS), ['files']],
    ['new .cjs under hooks', writeAt('hooks/x.cjs', PUSH_JS), ['files']],
    ['new .ts under tracker', writeAt('skills/sdlc/tracker/x.ts', PUSH_JS), ['files']],
    ['new extension-less executable under skills/sdlc', writeAt('skills/sdlc/pre-push', PUSH_SH), ['files']],
    ['new extension-less executable under hooks', writeAt('hooks/post-checkout', PUSH_SH), ['files']],
    ['new .pl under skills/sdlc', writeAt('skills/sdlc/x.pl', 'system("git push origin x");\n'), ['files']],
    ['symlink to a directory under skills/sdlc', d => symlinkSync(lib, join(d, 'skills/sdlc/lib')), ['opaque']],
    ['symlink to a directory under hooks', d => symlinkSync(lib, join(d, 'hooks/lib')), ['opaque']],
    ['symlink to a file under hooks', d => symlinkSync(join(lib, 'x.py'), join(d, 'hooks/y.py')), ['opaque']],
    ['symlink to a file under skills/sdlc/tracker', d => symlinkSync(join(lib, 'x.sh'), join(d, 'skills/sdlc/tracker/y.sh')), ['opaque']],
    ['wrapper file replaced by a symlink', d => {
      const target = join(r.dir('lib2'), 'state-write.py')
      writeFileSync(target, readFileSync(join(d, SW), 'utf8'))
      rmSync(join(d, SW))
      symlinkSync(target, join(d, SW))
    }, ['opaque']],
    ['latin-1 coding line on janitor.py', latin(JA, '# -*- coding: latin-1 -*-\n'), ['opaque']],
    ['latin-1 coding line on a new file under hooks', d => latin('hooks/x.py', '# -*- coding: latin-1 -*-\n')(d), ['opaque']],
    ['cp1252 coding line on suite-receipt.py', latin(SR, '# coding: cp1252\n'), ['opaque']],
    ['invalid UTF-8 byte 0xff in a new .py under hooks', rawBytes('hooks/x.py', [0xff, 0xfe]), ['opaque']],
    ['invalid UTF-8 byte 0xc3 0x28 in a new .py under skills/sdlc/tracker', rawBytes('skills/sdlc/tracker/x.py', [0xc3, 0x28]), ['opaque']],
    ['NUL byte in a new .py under hooks', rawBytes('hooks/x.py', [0x00]), ['opaque']],
    ['NUL byte in branches.py', d => apply(d, BR, src => `${src}\n\0\n`), ['opaque']],
    ['invalid UTF-8 byte in impact.py', d => writeFileSync(join(d, IM), Buffer.concat([readFileSync(join(d, IM)), Buffer.from([0xff, 0x0a])])), ['opaque']],
    ['new BOM Python file with a push', writeAt('skills/sdlc/x.py', `﻿${PUSH_PY}`), ['files', 'direct']],
    ['BOM on state-write.py with a new verify push', d => apply(d, SW, src => `﻿${src}${fn('_m(repo)', `git(repo, "push", "origin", "${V}")`)}`), ['pushes']],
  ]
  const missed = []
  for (const [label, make, must] of cases) {
    const p = treeProbe('TC-cli-2', label, make)
    const ok = p.out ? must.every(k => p.keys.includes(k)) : true
    if (!ok) missed.push(`${label}: ${p.keys.join(', ') || 'no key'}`)
    if (!p.out) log(`  guard exits ${p.exit}: the pin test fails closed`)
  }
  assert.deepEqual(missed, [], missed.join('\n'))
  const bomOnly = treeProbe('TC-cli-2', 'BOM only on the four wrapper files (control)', d => {
    for (const f of [SW, SR, NA, IM]) apply(d, f, src => `﻿${src}`)
  })
  assert.deepEqual(bomOnly.keys, [])
})

test('verify cli TC-cli-3: a dangling symlink exits non-zero or is opaque, never silent', () => {
  const p = treeProbe('TC-cli-3', 'dangling symlink in hooks', d => symlinkSync('/nonexistent/target.py', join(d, 'hooks/dangling.py')))
  assert.ok(p.exit !== 0 || p.keys.includes('opaque'), p.keys.join(','))
  const q = treeProbe('TC-cli-3', 'symlink loop in skills/sdlc', d => symlinkSync(join(d, 'skills/sdlc/loop'), join(d, 'skills/sdlc/loop')))
  assert.ok(q.exit !== 0 || q.keys.includes('opaque'), q.keys.join(','))
})

test('verify cli TC-cli-4: files outside the scan (test, fixtures, prompts) stay unscanned (seed S5)', () => {
  const dir = copyTree()
  for (const sub of ['test', 'fixtures', 'prompts']) {
    mkdirSync(join(dir, 'skills/sdlc', sub), { recursive: true })
    writeFileSync(join(dir, 'skills/sdlc', sub, 'evil.py'), PUSH_PY)
    writeFileSync(join(dir, 'skills/sdlc', sub, 'evil.sh'), PUSH_SH)
  }
  const { out, t } = guard(dir)
  const changed = delta(out)
  report('TC-cli-4 (seed S5)', 'push scripts in test, fixtures and prompts directories', t, changed)
  assert.deepEqual(Object.keys(changed), [], 'observation: these directories are outside the scan by design')
})

test('verify cli TC-cli-5: a spec-required forge read changes only a pin and hits no ban', () => {
  const read = (...lines) => fn('_verify_read(repo, slug)', ...lines)
  const cases = [
    ['gh pr list through run', NA, read('run(repo, "gh", "pr", "list", "--state", "closed", "--json", "number")')],
    ['gh pr view through run', NA, read('run(repo, "gh", "pr", "view", "12", "--json", "state")')],
    ['gh api GET through run', NA, read('run(repo, "gh", "api", "-X", "GET", "repos/o/r/rules/branches/main")')],
    ['gh api with no method through run', NA, read('run(repo, "gh", "api", "repos/o/r/rules/branches/main")')],
    ['glab mr list through run', NA, read('run(repo, "glab", "mr", "list", "--state", "opened")')],
    ['glab api push_rule through run', NA, read('run(repo, "glab", "api", "projects/:fullpath/push_rule")')],
    ['gh pr list at a new direct site', BR, read('subprocess.run(["gh", "pr", "list", "--json", "number"], capture_output=True, text=True)')],
    ['gh api GET at a new direct site', BR, read('subprocess.run(["gh", "api", "-X", "GET", f"repos/{slug}/rules/branches/main"], capture_output=True, text=True)')],
    ['glab api GET at a new direct site', BR, read('subprocess.run(["glab", "api", "projects/x/push_rule"], capture_output=True, text=True)')],
  ]
  const bad = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-5', label, file, code)
    const extra = p.keys.filter(k => !['forge', 'wrapperVerbs', 'direct'].includes(k))
    if (!p.keys.includes('forge') || extra.length || p.out.forgeViolations.length || p.out.opaque.length || !same(p.out.wrapperBodies, CLEAN.wrapperBodies)) {
      bad.push(`${label}: ${p.keys.join(', ')} violations ${JSON.stringify(p.out.forgeViolations)}`)
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'))
})

test('verify cli TC-cli-6: a forge read with a graphql path and every forge write hit the ban', () => {
  const read = (...lines) => fn('_verify_read(repo, slug)', ...lines)
  const cases = [
    ['gh api graphql through run', NA, read('run(repo, "gh", "api", "graphql", "-f", "query=query{viewer{login}}")')],
    ['gh api -X GET graphql through run', NA, read('run(repo, "gh", "api", "-X", "GET", "graphql")')],
    ['gh api /graphql through run', NA, read('run(repo, "gh", "api", "/graphql")')],
    ['glab api graphql through run', NA, read('run(repo, "glab", "api", "graphql")')],
    ['gh api graphql at a direct site', BR, read('subprocess.run(["gh", "api", "graphql"], capture_output=True, text=True)')],
    ['gh pr create through run', NA, read('run(repo, "gh", "pr", "create", "--head", "x")')],
    ['glab mr create through run', NA, read('run(repo, "glab", "mr", "create")')],
    ['gh api -X POST through run', NA, read('run(repo, "gh", "api", "-X", "POST", "repos/o/r/pulls")')],
    ['gh api -f head= through run', NA, read(`run(repo, "gh", "api", "repos/o/r/pulls", "-f", "head=${V}")`)],
    ['gh api --method=PATCH through run', NA, read('run(repo, "gh", "api", "--method=PATCH", "repos/o/r/pulls/1")')],
  ]
  const missed = []
  for (const [label, file, code] of cases) {
    const p = probe('TC-cli-6', label, file, code)
    if (!(p.out.forgeViolations.length || p.out.opaque.length)) missed.push(`${label}: keys ${p.keys.join(', ') || '<none>'}`)
  }
  assert.deepEqual(missed, [], missed.join('\n'))
  const merge = probe('TC-cli-6', 'observation (seed): gh pr merge through run', NA, read('run(repo, "gh", "pr", "merge", "1")'))
  log(`observation: gh pr merge is not a forgeViolation; it changes ${merge.keys.join(', ')}; forgeViolations ${merge.out.forgeViolations.length}`)
  assert.ok(merge.keys.includes('forge'), 'gh pr merge changes no pin')
})

const slice = (id, extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function noForgePath() {
  const bin = r.dir('nogh')
  for (const tool of ['git', 'python3', 'sh', 'env']) {
    const real = r.exec('/usr/bin/which', [tool], { watch: [] }).stdout.trim()
    if (real) symlinkSync(real, join(bin, tool))
  }
  return bin
}

function world(config, { slices = [], milestones = [] } = {}) {
  const env = { PATH: noForgePath(), TMPDIR: r.dir('tmpdir') }
  const g = (dir, ...a) => r.git(dir, ...a)
  const bare = r.dir('remote')
  g(bare, 'init', '-q', '--bare', '-b', 'main')
  const repo = r.gitRepo({
    files: {
      '.sdlc/config.json': { specPath: 'spec.md', defaultBranch: 'main', commitFormat: '', ...config },
      '.sdlc/requirements.json': [],
      '.sdlc/slices.json': slices,
      '.sdlc/milestones.json': milestones,
      '.sdlc/log.jsonl': '',
      'spec.md': '# spec\n',
      'src/app.txt': 'v1\n',
    },
  })
  g(repo, 'remote', 'add', 'origin', bare)
  g(repo, 'push', '-q', '-u', 'origin', 'main')
  return { repo, bare, env, g }
}

function plantVerify(w, from) {
  const specs = [['S-001', 0, 'cli', 0], ['S-002a', 3, 'security', 1]]
  return specs.map(([id, round, profile, part]) => {
    const t = r.run('branches.py', ['name', '--repo', w.repo, '--kind', 'verify', '--id', id, '--round', String(round), '--profile', profile, '--part', String(part)], { cwd: w.repo })
    log(`\n=== TC-cli-7 branches.py name --kind verify\n${t.text()}`)
    assert.equal(t.status, 0, t.stdout + t.stderr)
    const b = t.json.branch
    w.g(w.repo, 'checkout', '-q', '-b', b, from)
    writeFileSync(join(w.repo, 'src', `${b.replace(/\//g, '_')}.txt`), `${b}\n`)
    w.g(w.repo, 'add', '-A')
    w.g(w.repo, 'commit', '-q', '-m', `work on ${b}`)
    return b
  })
}

const heads = w => w.g(w.bare, 'for-each-ref', '--format=%(refname)').split('\n').filter(Boolean).sort()

function noVerify(w, names, label, t) {
  const refs = heads(w)
  log(`\n=== TC-cli-7 ${label}\n${t ? t.text() : ''}\n--- bare remote refs after\n${refs.join('\n')}`)
  return refs.filter(x => names.some(v => x.endsWith(`/${v}`)) || /-v\d+-/.test(x)).map(x => `${label}: ${x}`)
}

test('verify cli TC-cli-7: a verify branch stays local when the push-capable scripts run against a real bare remote', () => {
  const leaks = []
  const sw = (w, args, input = '') => r.run('state-write.py', args, { input, env: w.env, cwd: w.repo })
  for (const mode of ['pr', 'direct', 'mr']) {
    const w = world({ gitMode: mode, runBranch: '' }, { slices: [slice('S-001')] })
    const names = plantVerify(w, 'main')
    w.g(w.repo, 'checkout', '-q', names[0])
    const before = heads(w)
    for (const [label, args, input] of [
      ['patch-slice in_progress', ['patch-slice', '--repo', w.repo, '--slice', 'S-001'], JSON.stringify({ status: 'in_progress' })],
      ['patch-slice second run', ['patch-slice', '--repo', w.repo, '--slice', 'S-001'], JSON.stringify({ phase: 'tests' })],
      ['base-branch', ['base-branch', '--repo', w.repo, '--slice', 'S-001'], ''],
      ['status', ['status', '--repo', w.repo], ''],
    ]) {
      const t = sw(w, args, input)
      assert.equal(t.status, 0, `${mode} ${label}: ${t.stdout}${t.stderr}`)
      leaks.push(...noVerify(w, names, `${mode} ${label}`, t))
    }
    assert.deepEqual(heads(w), before, `${mode}: the remote refs changed`)
    for (const v of names) assert.ok(w.g(w.repo, 'branch', '--list', v), `${mode}: ${v} was lost locally`)
  }
  const w = world({ gitMode: 'stack', runBranch: 'sdlc/run-1' }, {
    slices: [slice('S-014'), slice('S-001')],
    milestones: [{ id: 'M-1', title: 'One', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  })
  w.g(w.repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  w.g(w.repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  const names = plantVerify(w, 'sdlc/run-1')
  w.g(w.repo, 'checkout', '-q', names[0])
  w.g(w.repo, 'branch', '--set-upstream-to=origin/main')
  const t = sw(w, ['patch-slice', '--repo', w.repo, '--slice', 'S-014'], JSON.stringify({ status: 'in_progress' }))
  assert.equal(t.status, 0, t.stdout + t.stderr)
  leaks.push(...noVerify(w, names, 'stack patch-slice', t))
  assert.deepEqual(heads(w), ['refs/heads/main', 'refs/heads/sdlc/M-1', 'refs/heads/sdlc/run-1'])
  const again = sw(w, ['patch-slice', '--repo', w.repo, '--slice', 'S-014'], JSON.stringify({ phase: 'tests' }))
  assert.equal(again.status, 0, again.stdout + again.stderr)
  leaks.push(...noVerify(w, names, 'stack patch-slice again', again))
  const j = r.run('janitor.py', ['--repo', w.repo, '--days', '36500'], { env: w.env, cwd: w.repo })
  assert.equal(j.status, 0, j.stdout + j.stderr)
  leaks.push(...noVerify(w, names, 'janitor', j))
  const n = r.run('next-action.py', ['--repo', w.repo], { env: w.env, cwd: w.repo })
  assert.notEqual(n.status, null, n.text())
  leaks.push(...noVerify(w, names, 'next-action with gh absent', n))
  assert.deepEqual(leaks, [], leaks.join('\n'))
})

test('verify cli TC-cli-8: module-loader calls of the three push functions and the janitor sweep send no verify branch', () => {
  const ml = moduleLoader({ runner: r, python: PY })
  const skill = r.dir('skill-copy')
  cpSync(join(ROOT, 'skills/sdlc'), skill, { recursive: true })
  const leaks = []
  const cfg = { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' }
  for (const [label, file, fnName, mk] of [
    ['advance_run_branch', 'state-write.py', 'advance_run_branch', repo => [repo, cfg, 'sdlc/run-1']],
    ['prune_stale_milestone_branches', 'state-write.py', 'prune_stale_milestone_branches', repo => [repo, cfg, 'sdlc/M-9']],
    ['ensure_milestone_branch', 'state-write.py', 'ensure_milestone_branch', repo => [repo, cfg, [{ id: 'M-1', status: 'pending', slices: [], fixSlices: [] }], 'M-1']],
  ]) {
    const { remote, repo } = ml.bareRemote({})
    r.git(repo, 'branch', '-M', 'main')
    r.git(repo, 'push', '-q', 'origin', 'main')
    r.git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
    r.git(repo, 'push', '-q', 'origin', 'sdlc/run-1')
    r.git(repo, 'checkout', '-q', '-b', V)
    writeFileSync(join(repo, 'v.txt'), 'v\n')
    r.git(repo, 'add', '-A')
    r.git(repo, 'commit', '-q', '-m', 'verify work')
    r.git(repo, 'checkout', '-q', 'main')
    writeFileSync(join(repo, 'm.txt'), 'm\n')
    r.git(repo, 'add', '-A')
    r.git(repo, 'commit', '-q', '-m', 'main moved')
    r.git(repo, 'push', '-q', 'origin', 'main')
    r.git(repo, 'checkout', '-q', 'sdlc/run-1')
    const t = ml.call(file, fnName, mk(repo), { root: skill, remote })
    log(`\n=== TC-cli-8 ${label}\n${t.text()}\npushed ${V}: ${t.pushed(V)}`)
    if (t.pushed(V) || t.refsAdded.some(x => x.includes('-v0-'))) leaks.push(`${label}: pushed ${V}`)
    assert.notEqual(t.outcome, 'importError', t.text())
  }
  assert.deepEqual(leaks, [])
})

test('verify cli TC-cli-9: janitor sweep_branches deletes a finished verify branch locally and pushes nothing', () => {
  const ml = moduleLoader({ runner: r, python: PY })
  const skill = r.dir('skill-copy2')
  cpSync(join(ROOT, 'skills/sdlc'), skill, { recursive: true })
  const { remote, repo } = ml.bareRemote({ branches: [V] })
  r.git(repo, 'push', '-q', 'origin', 'main')
  const t = ml.call('janitor.py', 'sweep_branches', [repo, { 'S-001': 'done' }, []], { root: skill, remote })
  log(`\n=== TC-cli-9 sweep_branches\n${t.text()}\nlocal branches: ${r.git(repo, 'branch', '--list')}`)
  assert.equal(t.outcome, 'return', t.text())
  assert.deepEqual(t.value, [V])
  assert.deepEqual(t.refsAdded, [])
  assert.equal(t.pushed(V), false)
})

const UP = `--upload-pack=git push origin ${V};:`
const cmd = '"git -C " + repo + " push -q origin " + b'

function behave(id, label, file, code) {
  const ml = moduleLoader({ runner: r, python: PY })
  const dir = copyTree()
  apply(dir, file, code)
  const { out } = guard(dir)
  const keys = Object.keys(delta(out))
  const { remote, repo } = ml.bareRemote({ branches: [V] })
  const t = ml.call(file, '_mutant', [repo, V], { root: dir, remote })
  log(`\n=== ${id} behavior ${label}\nguard changed keys: ${keys.join(', ') || '<none>'}\n${t.text()}\npushed ${V}: ${t.pushed(V)}`)
  return { keys, pushed: t.pushed(V), t }
}

test('verify cli TC-cli-10: a guard-flagged mutant may push, and no mutant pushes with every key equal', () => {
  const mutants = [
    ['control: plain git push in state-write.py', SW, fn('_mutant(repo, b)', 'git(repo, "push", "origin", b, check=False)')],
    ['control: subprocess push in janitor.py', JA, fn('_mutant(repo, b)', 'subprocess.run(["git", "-C", repo, "push", "-q", "origin", b])')],
    ['fetch --upload-pack f-string option, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "fetch", "origin", f"{''}${UP}", check=False)`)],
    ['fetch --upload-pack str() through next-action run', NA, fn('_mutant(repo, b)', `run(repo, "git", "fetch", "origin", str("${UP}"))`)],
    ['-c core.fsmonitor before diff, state-write.py', SW, fn('_mutant(repo, b)', `git(repo, "-c", "core.fsmonitor=git push -q origin " + b + "; echo", "diff", check=False)`)],
    ['late alias import subprocess as sp, janitor.py', JA, `\n\ndef _mutant(repo, b):\n    sp.run(["git", "-C", repo, "push", "-q", "origin", b])\n\n\nimport subprocess as sp\n`],
    ['os.path.os.system, janitor.py', JA, fn('_mutant(repo, b)', `os.path.os.system(${cmd})`)],
    ['forwarded cmd with gh api -X POST in next-action run body', NA, src => src.replace('def run(repo, *cmd):', 'def run(repo, *cmd):\n    if cmd and cmd[0] == "git":\n        run(repo, "git", "-C", repo, "push", "-q", "origin", "' + V + '")')],
    ['push inside the state-write git body', SW, src => src.replace('def git(repo, *args, check=True):', `def git(repo, *args, check=True):\n    if args and args[0] == "fetch":\n        git(repo, "push", "-q", "origin", "${V}", check=False)`)],
  ]
  const leaked = []
  const rows = []
  for (const [label, file, code] of mutants) {
    const b = behave('TC-cli-10', label, file, code)
    rows.push(`${label}: guard keys ${b.keys.join(', ') || '<none>'}; outcome ${b.t.outcome}; pushed ${b.pushed}`)
    if (b.pushed && b.keys.length === 0) leaked.push(label)
    if (label.startsWith('control') && !(b.pushed && b.keys.length)) leaked.push(`${label}: the control did not push or the guard did not flag it`)
  }
  log(`\n=== TC-cli-10 summary\n${rows.join('\n')}`)
  assert.deepEqual(leaked, [], leaked.join('\n'))
})

function loadMutants() {
  const src = readFileSync(join(ROOT, 'skills/sdlc/test/push-guard.test.mjs'), 'utf8')
  const start = src.indexOf("const SW = 'skills/sdlc/state-write.py'")
  const end = src.indexOf('const NOTES = [')
  assert.ok(start > 0 && end > start, 'the MUTANTS table moved')
  let body = src.slice(start, end).replace(/function mutate\(file, code\) \{[\s\S]*?\n\}\n/, '')
  body += '\nreturn { MUTANTS, V }'
  return new Function('assert', body)(assert)
}

test('verify cli TC-cli-11: each guard-miss mutant row of T-R-119e changes a pin, and the named key when one is named', () => {
  const { MUTANTS } = loadMutants()
  log(`\n=== TC-cli-11 rows replayed: ${MUTANTS.length}`)
  assert.ok(MUTANTS.length >= 90, `expected the attempt 1 and later rows, got ${MUTANTS.length}`)
  const missed = []
  for (const [label, file, code, key] of MUTANTS) {
    const dir = copyTree()
    apply(dir, file, code)
    const { out, t } = guard(dir)
    const changed = delta(out)
    const keys = Object.keys(changed)
    log(`${keys.length ? 'ok  ' : 'MISS'} ${label} -> ${keys.join(', ') || '<none>'}${key ? ` (want ${key})` : ''} [${t.durationMs} ms]`)
    if (!keys.length) missed.push(label)
    else if (key && !keys.includes(key)) missed.push(`${label}: ${key} did not change (${keys.join(', ')})`)
  }
  assert.deepEqual(missed, [], missed.join('\n'))
})

test('verify cli TC-cli-12: the guard output is byte-equal across runs, cwd, a symlinked root and a path with spaces and unicode', () => {
  const dir = copyTree()
  const a = r.exec(PY, ['-I', GUARD, dir])
  const b = r.exec(PY, ['-I', GUARD, dir])
  assert.equal(a.status, 0)
  assert.equal(a.stdout, b.stdout, 'two runs differ')
  const other = r.dir('othercwd')
  const c = r.exec(PY, ['-I', GUARD, dir], { cwd: other })
  assert.equal(c.stdout, a.stdout, 'a different cwd changes the output')
  const noArg = r.exec(PY, ['-I', GUARD], { cwd: dir })
  assert.equal(noArg.stdout, a.stdout, 'no argument and cwd = root differ from an explicit root')
  const link = join(r.dir('linkparent'), 'rootlink')
  symlinkSync(dir, link)
  const d = r.exec(PY, ['-I', GUARD, link])
  log(`\n=== TC-cli-12 symlinked root\n$ ${d.argv.join(' ')}\nexit ${d.status}; equal ${d.stdout === a.stdout}\n${d.stderr.slice(0, 500)}`)
  assert.equal(d.status, 0)
  assert.equal(d.stdout, a.stdout, 'a symlinked root changes the output')
  const spaced = join(r.dir('sp'), 'a b é ü 日本')
  cpSync(dir, spaced, { recursive: true })
  const e = r.exec(PY, ['-I', GUARD, spaced])
  assert.equal(e.stdout, a.stdout, 'a path with spaces and unicode changes the output')
  for (const [name, py] of [['PYTHONHASHSEED=1', { PYTHONHASHSEED: '1' }], ['PYTHONHASHSEED=12345', { PYTHONHASHSEED: '12345' }]]) {
    const f = r.exec(PY, ['-I', GUARD, dir], { env: py })
    assert.equal(f.stdout, a.stdout, `${name} changes the output`)
  }
  assert.ok(a.treeUnchanged && c.treeUnchanged && d.treeUnchanged)
  log(`runs equal: ${a.stdout === b.stdout}; cwd equal: ${c.stdout === a.stdout}; symlink root equal: ${d.stdout === a.stdout}; spaced path equal: ${e.stdout === a.stdout}`)
})

test('verify cli TC-cli-13: a comment, a blank line or a line continuation in a wrapper body keeps every pin', () => {
  const dir = copyTree()
  apply(dir, NA, src => src.replace('def run(repo, *cmd):', 'def run(repo, *cmd):\n    # a reviewer note\n\n'))
  apply(dir, SW, src => src.replace('def git(repo, *args, check=True):', 'def git(repo, *args, check=True):\n    # a reviewer note\n'))
  const { out, t } = guard(dir)
  const changed = delta(out)
  report('TC-cli-13', 'comment and blank line in two wrapper bodies', t, changed)
  assert.deepEqual(Object.keys(changed), [])
})
