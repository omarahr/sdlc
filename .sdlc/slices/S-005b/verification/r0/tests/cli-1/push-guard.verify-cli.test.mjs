import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, chmodSync, cpSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const REPO = process.env.VERIFY_REPO || '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const GUARD = join(REPO, 'skills/sdlc/test/push_guard.py')
const LOG = process.env.VERIFY_LOG || null
const SKIPPED = new Set(['test', 'fixtures', 'prompts', '__pycache__', 'node_modules'])
const EXTENSIONS = /\.(py|js|json|md|html)$/
const SCRIPT = /\.(py|js)$/

const r = cliRunner()
const record = (title, text) => { if (LOG) appendFileSync(LOG, `===== ${title}\n${text}\n`) }

function guardAt(root, title) {
  const t = r.exec('python3', [GUARD, root], { cwd: r.dir('cwd'), watch: [] })
  record(title, `$ python3 skills/sdlc/test/push_guard.py <scratch copy>\nexit: ${t.status} (${t.durationMs} ms)\n${t.stderr}`)
  assert.equal(t.status, 0, t.stderr)
  return t.json
}

const BASE = guardAt(REPO, 'baseline on the slice tip')
const FILES = BASE.files.filter(f => SCRIPT.test(f))
const KEYS = Object.keys(BASE).filter(k => k !== 'files')

function breaches(out) {
  const found = []
  if (JSON.stringify(out.files.filter(f => SCRIPT.test(f))) !== JSON.stringify(FILES)) found.push('files')
  if (out.files.some(f => !EXTENSIONS.test(f))) found.push('extensions')
  for (const k of KEYS) if (JSON.stringify(out[k]) !== JSON.stringify(BASE[k])) found.push(k)
  return found
}

function copyTree(name = 'tree') {
  const dir = r.dir(name)
  for (const base of ['skills/sdlc', 'hooks']) cpSync(join(REPO, base), join(dir, base), { recursive: true, filter: s => !SKIPPED.has(basename(s)) })
  return dir
}

function diffOf(out, title) {
  const found = breaches(out)
  const detail = found.map(k => {
    if (k === 'files' || k === 'extensions') return `${k}: +${out.files.filter(f => !BASE.files.includes(f)).join(', ')}`
    return `${k}: +${(out[k] || []).filter(x => !BASE[k].includes(x)).join(' | ')} -${BASE[k].filter(x => !(out[k] || []).includes(x)).length} removed`
  })
  record(title, `breaches: ${JSON.stringify(found)}\n${detail.join('\n')}`)
  return found
}

const V = 'sdlc/S-001-v0-cli-0'
const PUSH_PY = `import subprocess\nsubprocess.run(["git", "push", "origin", "${V}"])\n`
const PUSH_SH = `#!/bin/sh\ngit push origin ${V}\n`
const PUSH_JS = `require('child_process').execSync('git push origin ${V}')\n`

test('verify cli: TC-cli-1 the guard on the clean tip and on a copy at a path with spaces and unicode gives the same output', () => {
  assert.equal(FILES.length, 13)
  assert.equal(BASE.wrapperBodies.length, 5)
  assert.deepEqual(BASE.opaque, [])
  assert.deepEqual(BASE.forgeViolations, [])
  const dir = join(r.dir('space'), 'a dir ü 名')
  mkdirSync(dir)
  for (const base of ['skills/sdlc', 'hooks']) cpSync(join(REPO, base), join(dir, base), { recursive: true, filter: s => !SKIPPED.has(basename(s)) })
  assert.deepEqual(diffOf(guardAt(dir, 'TC-cli-1 unicode path'), 'TC-cli-1 unicode path'), [])
})

const NEW_FILES = [
  ['hooks/x.sh', PUSH_SH, 'extensions'],
  ['skills/sdlc/x.sh', PUSH_SH, 'extensions'],
  ['skills/sdlc/x.mjs', PUSH_JS, 'extensions'],
  ['hooks/x.mjs', PUSH_JS, 'extensions'],
  ['skills/sdlc/x.cjs', PUSH_JS, 'extensions'],
  ['skills/sdlc/tracker/x.ts', PUSH_JS, 'extensions'],
  ['skills/sdlc/pre-push', PUSH_SH, 'extensions'],
  ['hooks/post-checkout', PUSH_SH, 'extensions'],
  ['skills/sdlc/x.PY', PUSH_PY, 'extensions'],
  ['skills/sdlc/x.pyw', PUSH_PY, 'extensions'],
  ['skills/sdlc/x.pyc', PUSH_PY, 'extensions'],
  ['hooks/x.bash', PUSH_SH, 'extensions'],
  ['skills/sdlc/.hidden.sh', PUSH_SH, 'extensions'],
  ['skills/sdlc/.x.py', PUSH_PY, 'files'],
  ['skills/sdlc/tracker/a/b/x.py', PUSH_PY, 'files'],
  ['skills/sdlc/push ü.py', PUSH_PY, 'files'],
  ['skills/sdlc/helper.js', PUSH_JS, 'files'],
]

for (const [rel, body, must] of NEW_FILES) {
  test(`verify cli: TC-cli-2 a new executable script ${rel} breaks the ${must} pin`, () => {
    const dir = copyTree()
    const p = join(dir, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, body)
    chmodSync(p, 0o755)
    const found = diffOf(guardAt(dir, `TC-cli-2 ${rel}`), `TC-cli-2 ${rel}`)
    assert.ok(found.includes(must), `${rel}: ${JSON.stringify(found)}`)
  })
}

test('verify cli: TC-cli-3 a symlink to a file or a directory under skills/sdlc or hooks is opaque', () => {
  const lib = r.dir('lib')
  writeFileSync(join(lib, 'x.py'), PUSH_PY)
  writeFileSync(join(lib, 'x.sh'), PUSH_SH)
  const forms = [
    ['directory under skills/sdlc', d => symlinkSync(lib, join(d, 'skills/sdlc/lib')), 'skills/sdlc/lib symlink'],
    ['directory under hooks', d => symlinkSync(lib, join(d, 'hooks/lib')), 'hooks/lib symlink'],
    ['directory under tracker', d => symlinkSync(lib, join(d, 'skills/sdlc/tracker/lib')), 'skills/sdlc/tracker/lib symlink'],
    ['new py file', d => symlinkSync(join(lib, 'x.py'), join(d, 'hooks/y.py')), 'hooks/y.py symlink'],
    ['new md name to a shell script', d => symlinkSync(join(lib, 'x.sh'), join(d, 'skills/sdlc/notes.md')), 'skills/sdlc/notes.md symlink'],
    ['relative link inside the tree', d => symlinkSync('state-write.py', join(d, 'skills/sdlc/sw.py')), 'skills/sdlc/sw.py symlink'],
    ['existing script replaced by a link', d => {
      const target = join(r.dir('lib2'), 'live-poke.py')
      writeFileSync(target, readFileSync(join(REPO, 'hooks/live-poke.py'), 'utf8') + PUSH_PY)
      rmSync(join(d, 'hooks/live-poke.py'))
      symlinkSync(target, join(d, 'hooks/live-poke.py'))
    }, 'hooks/live-poke.py symlink'],
    ['wrapper script replaced by a link', d => {
      const target = join(r.dir('lib3'), 'state-write.py')
      writeFileSync(target, readFileSync(join(REPO, 'skills/sdlc/state-write.py'), 'utf8'))
      rmSync(join(d, 'skills/sdlc/state-write.py'))
      symlinkSync(target, join(d, 'skills/sdlc/state-write.py'))
    }, 'skills/sdlc/state-write.py symlink'],
  ]
  const missed = []
  for (const [label, make, entry] of forms) {
    const dir = copyTree()
    make(dir)
    const out = guardAt(dir, `TC-cli-3 ${label}`)
    const found = diffOf(out, `TC-cli-3 ${label}`)
    if (!found.includes('opaque') || !out.opaque.includes(entry)) missed.push(`${label}: ${JSON.stringify(found)} ${JSON.stringify(out.opaque)}`)
  }
  assert.deepEqual(missed, [])
})

test('verify cli: TC-cli-14 a dangling symlink makes the guard exit non-zero, so the pin test fails closed', () => {
  const lib = r.dir('lib')
  const forms = [['py', 'skills/sdlc/gone.py'], ['js', 'hooks/gone.js'], ['sh', 'skills/sdlc/gone.sh']]
  const res = {}
  for (const [ext, rel] of forms) {
    const dir = copyTree()
    symlinkSync(join(lib, `gone.${ext}`), join(dir, rel))
    const t = r.exec('python3', [GUARD, dir], { cwd: r.dir('cwd'), watch: [] })
    record(`TC-cli-14 dangling ${rel}`, `$ python3 skills/sdlc/test/push_guard.py <scratch copy>\nexit: ${t.status}\n--- stderr tail\n${t.stderr.trim().split('\n').slice(-1).join('\n')}`)
    res[rel] = t.status === 0 ? diffOf(t.json, `TC-cli-14 dangling ${rel}`) : `exit ${t.status}`
    assert.ok(t.status !== 0 || res[rel].includes('opaque'), `${rel}: exit 0 with ${JSON.stringify(res[rel])}`)
  }
  record('TC-cli-14 summary', JSON.stringify(res, null, 1))
})

const latin = (head, src, tail) => Buffer.concat([Buffer.from(head), Buffer.from(src), Buffer.from('\n# caf'), Buffer.from([0xe9]), Buffer.from('\n' + tail)])

const ENCODINGS = [
  ['latin-1 cookie on line 1 of janitor.py', 'skills/sdlc/janitor.py', src => latin('# -*- coding: latin-1 -*-\n', src, PUSH_PY)],
  ['latin-1 cookie after the shebang of live-poke.py', 'hooks/live-poke.py', src => latin('', src.replace('\n', '\n# -*- coding: latin-1 -*-\n'), PUSH_PY)],
  ['iso-8859-1 cookie on state-write.py', 'skills/sdlc/state-write.py', src => latin('# coding=iso-8859-1\n', src, '')],
  ['vim fileencoding cp1252 on impact.py', 'skills/sdlc/impact.py', src => latin('', src.replace('\n', '\n# vim: set fileencoding=cp1252 :\n'), PUSH_PY)],
  ['utf-16 cookie on branches.py', 'skills/sdlc/branches.py', src => Buffer.from(`# coding: utf-16\n${src}\n${PUSH_PY}`)],
  ['invalid UTF-8 bytes with no cookie on next-action.py', 'skills/sdlc/next-action.py', src => Buffer.concat([Buffer.from(src + '\n' + PUSH_PY), Buffer.from([0x23, 0xff, 0xfe, 0x0a])])],
  ['new latin-1 file', 'skills/sdlc/x.py', () => latin('# -*- coding: latin-1 -*-\n', '', PUSH_PY)],
  ['new latin-1 file under hooks', 'hooks/x.py', () => latin('# -*- coding: latin-1 -*-\n', '', PUSH_PY)],
]

for (const [label, rel, edit] of ENCODINGS) {
  test(`verify cli: TC-cli-4 ${label} is opaque`, () => {
    const dir = copyTree()
    const p = join(dir, rel)
    let src = ''
    try { src = readFileSync(p, 'utf8') } catch {}
    writeFileSync(p, edit(src))
    const out = guardAt(dir, `TC-cli-4 ${label}`)
    const found = diffOf(out, `TC-cli-4 ${label}`)
    assert.ok(found.includes('opaque'), `${label}: ${JSON.stringify(found)}`)
    assert.ok(out.opaque.some(o => o.startsWith(`${rel} parse`)), JSON.stringify(out.opaque))
  })
}

const BOM = '﻿'

test('verify cli: TC-cli-5 a BOM file is still scanned: a new BOM file breaks files, and a push in a BOM script breaks pushes', () => {
  const d1 = copyTree()
  writeFileSync(join(d1, 'skills/sdlc/x.py'), BOM + PUSH_PY)
  const f1 = diffOf(guardAt(d1, 'TC-cli-5 new BOM file'), 'TC-cli-5 new BOM file')
  assert.ok(f1.includes('files') && f1.includes('direct'), JSON.stringify(f1))
  const d2 = copyTree()
  const sw = join(d2, 'skills/sdlc/state-write.py')
  writeFileSync(sw, BOM + readFileSync(sw, 'utf8') + `\n\ndef _verify(repo):\n    git(repo, "push", "origin", "${V}")\n`)
  const o2 = guardAt(d2, 'TC-cli-5 BOM state-write.py with a verify push')
  const f2 = diffOf(o2, 'TC-cli-5 BOM state-write.py with a verify push')
  assert.ok(f2.includes('pushes'), JSON.stringify(f2))
  assert.ok(o2.pushes.some(p => p.includes(V)), JSON.stringify(o2.pushes))
  const d3 = copyTree()
  const sw3 = join(d3, 'skills/sdlc/state-write.py')
  writeFileSync(sw3, BOM + readFileSync(sw3, 'utf8').replace('def git(repo, *args, check=True):', 'def git(repo, *args, check=False):'))
  const f3 = diffOf(guardAt(d3, 'TC-cli-5 BOM state-write.py with a changed wrapper default'), 'TC-cli-5 BOM state-write.py with a changed wrapper default')
  assert.ok(f3.includes('wrapperBodies'), JSON.stringify(f3))
  const d4 = copyTree()
  for (const rel of ['skills/sdlc/state-write.py', 'skills/sdlc/suite-receipt.py', 'skills/sdlc/next-action.py', 'skills/sdlc/impact.py']) {
    const p = join(d4, rel)
    writeFileSync(p, BOM + readFileSync(p, 'utf8'))
  }
  const f4 = diffOf(guardAt(d4, 'TC-cli-5 BOM only on the four wrapper files'), 'TC-cli-5 BOM only on the four wrapper files')
  assert.deepEqual(f4, [])
})

test('verify cli: TC-cli-6 seed probes outside the scanned set are recorded', () => {
  const probes = [
    ['S5 tracker/test dir', 'skills/sdlc/tracker/test/x.py', PUSH_PY],
    ['S5 hooks/node_modules', 'hooks/node_modules/x.py', PUSH_PY],
    ['S5 skills/sdlc/__pycache__ bytecode', 'skills/sdlc/__pycache__/branches.cpython-314.pyc', 'x'],
    ['md file with a shebang', 'hooks/x.md', PUSH_SH],
    ['json file with a shebang', 'skills/sdlc/x.json', PUSH_SH],
    ['html page with a forge POST', 'skills/sdlc/tracker/x.html', "<script>fetch('https://api.github.com/repos/o/r/pulls', { method: 'POST' })</script>\n"],
  ]
  const res = {}
  for (const [label, rel, body] of probes) {
    const dir = copyTree()
    const p = join(dir, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, body)
    chmodSync(p, 0o755)
    res[label] = diffOf(guardAt(dir, `TC-cli-6 ${label}`), `TC-cli-6 ${label}`)
  }
  record('TC-cli-6 summary', JSON.stringify(res, null, 1))
  assert.equal(Object.keys(res).length, probes.length)
})

const BR = 'skills/sdlc/branches.py'
const NA = 'skills/sdlc/next-action.py'
const SW = 'skills/sdlc/state-write.py'
const fn = (...lines) => `\n\ndef _verify_read(repo, slug, n):\n${lines.map(l => `    ${l}`).join('\n')}\n`

const READS = [
  ['gh pr list through run', NA, fn('run(repo, "gh", "pr", "list", "--state", "closed", "--json", "number")')],
  ['gh pr view through run', NA, fn('run(repo, "gh", "pr", "view", "12", "--json", "state")')],
  ['gh pr view -R through run', NA, fn('run(repo, "gh", "-R", "o/r", "pr", "view", "12")')],
  ['gh pr checks through run', NA, fn('run(repo, "gh", "pr", "checks", "12")')],
  ['gh api GET through run', NA, fn('run(repo, "gh", "api", "-X", "GET", "repos/o/r/branches/main/protection")')],
  ['gh api no method through run', NA, fn('run(repo, "gh", "api", "repos/o/r/rules/branches/main")')],
  ['gh api --method=get through run', NA, fn('run(repo, "gh", "api", "--method=get", "repos/o/r/rules/branches/main")')],
  ['glab mr list through run', NA, fn('run(repo, "glab", "mr", "list", "--state", "opened")')],
  ['glab mr view through run', NA, fn('run(repo, "glab", "mr", "view", "7")')],
  ['glab api push_rule through run', NA, fn('run(repo, "glab", "api", "projects/:fullpath/push_rule")')],
  ['gh pr list at a new direct site in state-write.py', SW, fn('subprocess.run(["gh", "pr", "list", "--json", "number"], capture_output=True, text=True)')],
  ['gh pr view at a direct site', BR, fn('subprocess.run(["gh", "pr", "view", "12", "--json", "state"], capture_output=True, text=True)')],
  ['glab mr list at a direct site', BR, fn('subprocess.run(["glab", "mr", "list"], capture_output=True, text=True)')],
  ['gh api GET at a direct site', BR, fn('subprocess.run(["gh", "api", "-X", "GET", f"repos/{slug}/rules/branches/main"], capture_output=True, text=True)')],
]

for (const [label, file, code] of READS) {
  test(`verify cli: TC-cli-7 ${label} changes only a pin and hits no ban`, () => {
    const dir = copyTree()
    appendFileSync(join(dir, file), code)
    const out = guardAt(dir, `TC-cli-7 ${label}`)
    const found = diffOf(out, `TC-cli-7 ${label}`)
    record(`TC-cli-7 ${label} new forge entries`, JSON.stringify(out.forge.filter(f => !BASE.forge.includes(f))))
    assert.ok(found.includes('forge'), `${label}: forge pin unchanged: ${JSON.stringify(found)}`)
    assert.deepEqual(found.filter(k => !['direct', 'forge', 'wrapperVerbs'].includes(k)), [], `${label}: ${JSON.stringify(found)}`)
    assert.deepEqual(out.forgeViolations, [], `${label}: ${JSON.stringify(out.forgeViolations)}`)
    assert.deepEqual(out.opaque, [], `${label}: ${JSON.stringify(out.opaque)}`)
    assert.deepEqual(out.wrapperBodies, BASE.wrapperBodies, `${label}: wrapperBodies changed`)
  })
}

const slice = (id, extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function fakeForge() {
  const bin = r.dir('fakebin')
  const log = join(bin, 'forge.log')
  writeFileSync(log, '')
  for (const name of ['gh', 'glab']) {
    const p = join(bin, name)
    writeFileSync(p, `#!/bin/sh\nprintf '%s' "${name}" >> "${log}"\nfor a in "$@"; do printf ' %s' "$a" >> "${log}"; done\nprintf '\\n' >> "${log}"\necho '[]'\nexit 0\n`)
    chmodSync(p, 0o755)
  }
  return { bin, log }
}

function noForgePath() {
  const bin = r.dir('nogh')
  for (const tool of ['git', 'python3', 'sh', 'env']) {
    const real = r.exec('/usr/bin/which', [tool], { watch: [] }).stdout.trim()
    if (real) symlinkSync(real, join(bin, tool))
  }
  return bin
}

function world(config, { slices = [], milestones = [], forge = true } = {}) {
  const fake = fakeForge()
  const env = { PATH: forge ? `${fake.bin}:${r.env.PATH}` : noForgePath(), TMPDIR: r.dir('tmpdir') }
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
  return { repo, bare, forge: fake, env, g }
}

function verifyNames(repo) {
  const specs = [['S-001', 0, 'cli', 0], ['S-001', 1, 'http-api', 2], ['S-002a', 3, 'security', 1], ['M-1', 0, 'cli', 0]]
  return specs.map(([id, round, profile, part]) => {
    const t = r.run('branches.py', ['name', '--repo', repo, '--kind', 'verify', '--id', id, '--round', String(round), '--profile', profile, '--part', String(part)], { cwd: repo })
    record('branches.py name --kind verify', t.text())
    assert.equal(t.status, 0, t.stdout + t.stderr)
    return t.json.branch
  })
}

function plantVerify(w, from) {
  const names = verifyNames(w.repo)
  for (const b of names) {
    w.g(w.repo, 'checkout', '-q', '-b', b, from)
    writeFileSync(join(w.repo, 'src', `${b.replace(/\//g, '_')}.txt`), `${b}\n`)
    w.g(w.repo, 'add', '-A')
    w.g(w.repo, 'commit', '-q', '-m', `work on ${b}`)
  }
  return names
}

function remoteHeads(w) {
  return w.g(w.bare, 'for-each-ref', '--format=%(refname)').split('\n').filter(Boolean).sort()
}

function assertNoVerifyOnRemote(w, names, label, t) {
  const refs = remoteHeads(w)
  const log = readFileSync(w.forge.log, 'utf8')
  record(label, `${t ? t.text() : ''}\n--- bare remote refs after\n${refs.join('\n')}\n--- fake forge log\n${log || '(empty)'}\n--- local branches\n${w.g(w.repo, 'branch', '--format=%(refname:short)')}`)
  for (const v of names) assert.ok(!refs.some(x => x.endsWith(`/${v}`)), `${label}: ${v} reached the remote`)
  assert.ok(refs.every(x => !/-v\d+-/.test(x)), `${label}: a verify-shaped ref on the remote: ${refs.join(', ')}`)
  assert.doesNotMatch(log, /\b(pr|mr) create\b/, `${label}: the fake forge logged a create`)
  return refs.map(x => x.replace('refs/heads/', ''))
}

const STATE = 'state-write.py'

test('verify cli: TC-cli-8 stack mode patch-slice pushes the run branch and the milestone branch, and no verify branch, run twice', () => {
  const w = world({ gitMode: 'stack', runBranch: 'sdlc/run-1' }, {
    slices: [slice('S-014'), slice('S-001')],
    milestones: [{ id: 'M-1', title: 'One', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  })
  w.g(w.repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  w.g(w.repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  const pub = r.dir('pub')
  w.g(pub, 'clone', '-q', w.bare, '.')
  writeFileSync(join(pub, 'src', 'app.txt'), 'moved\n')
  w.g(pub, 'commit', '-q', '-am', 'main moved')
  w.g(pub, 'push', '-q', 'origin', 'HEAD:main')
  w.g(w.repo, 'fetch', '-q', 'origin')
  const names = plantVerify(w, 'sdlc/run-1')
  w.g(w.repo, 'checkout', '-q', names[0])
  w.g(w.repo, 'branch', '--set-upstream-to=origin/main')
  const before = remoteHeads(w)
  const t = r.run(STATE, ['patch-slice', '--repo', w.repo, '--slice', 'S-014'], { input: JSON.stringify({ status: 'in_progress' }), env: w.env, cwd: w.repo })
  assert.equal(t.status, 0, t.stdout + t.stderr)
  const heads = assertNoVerifyOnRemote(w, names, 'TC-cli-8 stack patch-slice', t)
  assert.deepEqual(before, ['refs/heads/main', 'refs/heads/sdlc/run-1'])
  assert.deepEqual(heads, ['main', 'sdlc/M-1', 'sdlc/run-1'])
  assert.equal(w.g(w.bare, 'rev-parse', 'sdlc/run-1'), w.g(w.repo, 'rev-parse', 'sdlc/run-1'))
  w.g(w.repo, 'checkout', '-q', names[1])
  const t2 = r.run(STATE, ['patch-slice', '--repo', w.repo, '--slice', 'S-014'], { input: JSON.stringify({ phase: 'tests' }), env: w.env, cwd: w.repo })
  assert.equal(t2.status, 0, t2.stdout + t2.stderr)
  assert.deepEqual(assertNoVerifyOnRemote(w, names, 'TC-cli-8 stack patch-slice second run', t2), heads)
  for (const v of names) assert.ok(w.g(w.repo, 'branch', '--list', v), `${v} was lost locally`)
})

test('verify cli: TC-cli-9 stack mode prune of a shipped milestone branch deletes it on the remote and sends no verify branch', () => {
  const w = world({ gitMode: 'stack', runBranch: 'sdlc/run-2' }, {
    slices: [slice('S-001')],
    milestones: [{ id: 'M-2', title: 'Two', status: 'pending', slices: ['S-001'], fixSlices: [] }],
  })
  w.g(w.repo, 'checkout', '-q', '-b', 'sdlc/run-2')
  w.g(w.repo, 'push', '-q', '-u', 'origin', 'sdlc/run-2')
  w.g(w.repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  writeFileSync(join(w.repo, 'src', 'm1.txt'), 'm1\n')
  w.g(w.repo, 'add', '-A')
  w.g(w.repo, 'commit', '-q', '-m', 'M-1 work')
  w.g(w.repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1')
  const names = plantVerify(w, 'sdlc/M-1')
  const pub = r.dir('pub')
  w.g(pub, 'clone', '-q', w.bare, '.')
  w.g(pub, 'merge', '-q', '--squash', 'origin/sdlc/M-1')
  w.g(pub, 'commit', '-q', '-m', 'M-1 squash')
  w.g(pub, 'push', '-q', 'origin', 'HEAD:main')
  w.g(w.repo, 'checkout', '-q', 'sdlc/run-2')
  const t = r.run(STATE, ['patch-slice', '--repo', w.repo, '--slice', 'S-001'], { input: JSON.stringify({ status: 'in_progress' }), env: w.env, cwd: w.repo })
  assert.equal(t.status, 0, t.stdout + t.stderr)
  const heads = assertNoVerifyOnRemote(w, names, 'TC-cli-9 stack prune', t)
  assert.ok(!heads.includes('sdlc/M-1'), `the shipped milestone branch was not pruned: ${heads.join(', ')}`)
  assert.ok(heads.includes('sdlc/M-2'), heads.join(', '))
  for (const v of names) assert.ok(w.g(w.repo, 'branch', '--list', v), `${v} was lost locally`)
})

for (const mode of ['pr', 'direct', 'mr']) {
  test(`verify cli: TC-cli-10 ${mode} mode patch-slice, base-branch and status push nothing with verify branches present`, () => {
    const w = world({ gitMode: mode, runBranch: '' }, { slices: [slice('S-001')] })
    const names = plantVerify(w, 'main')
    w.g(w.repo, 'checkout', '-q', names[2])
    const before = remoteHeads(w)
    const runs = [
      ['patch-slice', ['patch-slice', '--repo', w.repo, '--slice', 'S-001'], JSON.stringify({ status: 'in_progress' })],
      ['base-branch', ['base-branch', '--repo', w.repo, '--slice', 'S-001'], ''],
      ['status', ['status', '--repo', w.repo], ''],
    ]
    for (const [label, args, input] of runs) {
      const t = r.run(STATE, args, { input, env: w.env, cwd: w.repo })
      assert.equal(t.status, 0, `${label}: ${t.stdout}${t.stderr}`)
      assertNoVerifyOnRemote(w, names, `TC-cli-10 ${mode} ${label}`, t)
    }
    assert.deepEqual(remoteHeads(w), before)
  })
}

test('verify cli: TC-cli-11 janitor.py deletes finished verify branches locally and pushes no ref', () => {
  const w = world({ gitMode: 'pr' }, { slices: [slice('S-001', { status: 'done' }), slice('S-002a', { status: 'in_progress' }), slice('M-1', { status: 'done' })] })
  const names = plantVerify(w, 'main')
  w.g(w.repo, 'checkout', '-q', 'main')
  const before = remoteHeads(w)
  const t = r.run('janitor.py', ['--repo', w.repo, '--days', '36500'], { env: w.env, cwd: w.repo })
  assert.equal(t.status, 0, t.stdout + t.stderr)
  assertNoVerifyOnRemote(w, names, 'TC-cli-11 janitor', t)
  assert.deepEqual(remoteHeads(w), before)
  assert.equal(readFileSync(w.forge.log, 'utf8'), '')
})

for (const forge of [false, true]) {
  test(`verify cli: TC-cli-12 next-action.py forge reads with gh ${forge ? 'faked' : 'absent'} push nothing and create nothing`, () => {
    const w = world({ gitMode: 'pr' }, { slices: [slice('S-001', { status: 'in_progress', phase: 'verify' })], forge })
    const names = plantVerify(w, 'main')
    w.g(w.repo, 'checkout', '-q', names[0])
    const before = remoteHeads(w)
    const t = r.run('next-action.py', ['--repo', w.repo], { env: w.env, cwd: w.repo })
    assertNoVerifyOnRemote(w, names, `TC-cli-12 next-action gh ${forge ? 'faked' : 'absent'}`, t)
    assert.deepEqual(remoteHeads(w), before)
    assert.notEqual(t.status, null, t.text())
    if (forge) assert.match(readFileSync(w.forge.log, 'utf8'), /^gh pr list/m)
    else assert.match(t.stdout + t.stderr, /gh|No such file/, t.text())
  })
}

test('verify cli: TC-cli-13 seed probe: a milestone id shaped like a verify name in milestones.json', () => {
  const w = world({ gitMode: 'stack', runBranch: 'sdlc/run-1' }, {
    slices: [slice('S-014')],
    milestones: [{ id: 'S-001-v0-cli-0', title: 'Odd', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  })
  w.g(w.repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  w.g(w.repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  const t = r.run(STATE, ['patch-slice', '--repo', w.repo, '--slice', 'S-014'], { input: JSON.stringify({ status: 'in_progress' }), env: w.env, cwd: w.repo })
  const refs = remoteHeads(w)
  record('TC-cli-13 seed probe milestone id shaped like a verify name', `${t.text()}\n--- bare remote refs after\n${refs.join('\n')}`)
  assert.notEqual(t.status, null)
})
