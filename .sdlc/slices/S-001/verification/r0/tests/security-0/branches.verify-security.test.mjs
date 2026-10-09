import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, chmodSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../../../../../../..')
const TESTKIT = join(REPO, 'skills/sdlc/test/testkit')
const { cliRunner } = await import(join(TESTKIT, 'cli-runner.mjs'))
const { load, abbreviations, duplicated, equalsForm, plantDecoy, decoyEnv, decoyFired } = await import(join(TESTKIT, 'attack-corpus.mjs'))
const { callPython } = await import(join(TESTKIT, 'property.mjs'))

const LOG = join(HERE, '../../logs/security-0-transcripts.txt')
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, '')
const clip = (s) => (s.length > 1200 ? `${s.slice(0, 1200)}\n<clipped ${s.length - 1200} chars>` : s)
const record = (label, t) => appendFileSync(LOG, `### ${label}\n${clip(t.text())}\n\n`)

const r = cliRunner()
const repo = r.gitRepo()
const SCRIPTS = ['next-action.py', 'state-write.py', 'janitor.py']
const KINDS = ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state', 'verify', 'attempt']
const MODES = ['pr', 'direct', 'mr', 'stack']

const base = {
  name: ['name', '--repo', repo, '--kind', 'slice'],
  parse: ['parse', '--repo', repo, '--branch', 'sdlc/S-1'],
  list: ['list', '--repo', repo, '--kind', 'slice'],
  preflight: ['preflight', '--repo', repo, '--mode', 'pr'],
}

function oneJson(t, label) {
  assert.equal(t.spawnError, null, `${label}: spawn error ${t.spawnError}`)
  assert.ok(!/Traceback/.test(t.stderr), `${label}: traceback\n${t.stderr}`)
  assert.ok(!/^usage:/m.test(t.stdout), `${label}: usage text on stdout`)
  const lines = t.stdout.split('\n').filter((l) => l !== '')
  assert.equal(lines.length, 1, `${label}: stdout must hold one line, got ${JSON.stringify(t.stdout.slice(0, 300))}`)
  const obj = JSON.parse(lines[0])
  assert.equal(typeof obj, 'object')
  assert.ok(obj && !Array.isArray(obj))
  return obj
}

function refused(t, label) {
  const obj = oneJson(t, label)
  assert.equal(t.status, 2, `${label}: exit ${t.status}`)
  assert.deepEqual(Object.keys(obj).sort(), ['error', 'ok'])
  assert.equal(obj.ok, false)
  assert.equal(typeof obj.error, 'string')
  assert.ok(obj.error.length > 0)
  assert.ok(t.treeUnchanged, `${label}: refusal changed a file`)
  return obj
}

function accepted(t, label) {
  const obj = oneJson(t, label)
  assert.equal(t.status, 0, `${label}: exit ${t.status} ${t.stdout}`)
  assert.equal(obj.ok, true)
  assert.ok(t.treeUnchanged, `${label}: accepted run changed a file`)
  return obj
}

const bp = (args, opts) => r.run('branches.py', args, opts)

test('verify security: VS-2 a flag that the command does not name is refused with no side effect', () => {
  const cases = [
    [...base.parse, '--kind', 'slice'],
    [...base.list, '--branch', 'x'],
    [...base.preflight, '--kind', 'slice'],
    [...base.name, '--branch', 'x'],
    [...base.list, '--id', 'S-1'],
    [...base.parse, '--mode', 'pr'],
    [...base.parse, '--n', '1'],
    [...base.preflight, '--area', 'api'],
  ]
  for (const args of cases) {
    const t = bp(args)
    record(`VS-2 unnamed flag ${args.join(' ')}`, t)
    refused(t, args.join(' '))
  }
})

test('verify security: VS-2 a missing required flag, a missing or unknown command and an extra positional are refused', () => {
  const cases = [
    ['parse', '--repo', repo],
    ['name', '--repo', repo],
    ['preflight', '--repo', repo],
    ['list', '--repo', repo],
    ['name', '--kind', 'slice'],
    ['parse', '--branch', 'x'],
    ['list', '--kind', 'slice'],
    ['preflight', '--mode', 'pr'],
    [],
    ['bogus'],
    ['--repo', repo],
    [...base.parse, 'extra'],
    [...base.name, '--'],
    [...base.name, '--', 'extra'],
    [...base.name, '--repo'],
  ]
  for (const args of cases) {
    const t = bp(args)
    record(`VS-2 missing/unknown ${args.join(' ')}`, t)
    refused(t, args.join(' ') || '<no args>')
  }
})

test('verify security: VS-2 flag-like values in a flag slot never leak argparse usage text', () => {
  for (const e of load('flag-like-values', { argv: true })) {
    for (const args of [
      ['parse', '--repo', repo, '--branch', e.value],
      ['name', '--repo', repo, '--kind', 'slice', '--id', e.value],
      ['preflight', '--repo', repo, '--mode', 'pr', '--branch', e.value],
    ]) {
      const t = bp(args)
      record(`VS-2 flag-like ${e.id}`, t)
      if (['help-short', 'help-long'].includes(e.id) && t.status === 0 && /^usage:/m.test(t.stdout)) continue
      const obj = oneJson(t, `${e.id} ${args.join(' ')}`)
      assert.ok([0, 2].includes(t.status))
      assert.equal(obj.ok, t.status === 0)
      assert.ok(t.treeUnchanged)
    }
  }
})

test('verify security: VS-2 observe flag prefixes, duplicate flags, --flag=value and --help', () => {
  const seen = []
  for (const ab of abbreviations('--repo')) {
    const t = bp(['parse', ab, repo, '--branch', 'x'])
    record(`VS-2 abbrev ${ab}`, t)
    oneJson(t, ab)
    seen.push(`${ab}:${t.status}`)
  }
  for (const ab of abbreviations('--format')) {
    const t = bp([...base.parse, ab, 'feature/{name}'])
    record(`VS-2 abbrev ${ab}`, t)
    const obj = oneJson(t, ab)
    seen.push(`${ab}:${t.status}:${obj.format ?? ''}`)
  }
  const dupOk = bp(['parse', ...duplicated('--repo', ['/nonexistent-sdlc-verify', repo]), '--branch', 'x'])
  record('VS-2 duplicate --repo bad then good', dupOk)
  oneJson(dupOk, 'dup')
  seen.push(`dup-repo-bad-then-good:${dupOk.status}`)
  const dupFmt = bp([...base.parse, ...duplicated('--format', ['bad', 'sdlc/{name}'])])
  record('VS-2 duplicate --format bad then good', dupFmt)
  oneJson(dupFmt, 'dup fmt')
  seen.push(`dup-format-bad-then-good:${dupFmt.status}`)
  const eq = bp(['parse', equalsForm('--repo', repo), equalsForm('--branch', 'x'), equalsForm('--format', 'a/{name}')])
  record('VS-2 equals form', eq)
  accepted(eq, 'equals form')
  for (const args of [['-h'], ['--help'], ['parse', '-h'], ['name', '--help']]) {
    const t = bp(args)
    record(`VS-2 help ${args.join(' ')}`, t)
    seen.push(`${args.join(' ')}:${t.status}:${/^usage:/m.test(t.stdout) ? 'usage-on-stdout' : 'json'}`)
  }
  console.log(`observed: ${seen.join(' | ')}`)
})

test('verify security: VS-3 non-integer values for --n, --round and --part are refused', () => {
  const values = ['two', '1.5', '', '0x1', '1e3', 'inf', 'nan', '+-1', '0o7', '0b1', '١.٥', '--1']
  for (const flag of ['--n', '--round', '--part']) {
    for (const v of values) {
      const t = bp([...base.name, flag, v])
      record(`VS-3 ${flag} ${JSON.stringify(v)}`, t)
      refused(t, `${flag} ${JSON.stringify(v)}`)
    }
  }
  for (const e of load('integer-forms', { argv: true })) {
    const t = bp([...base.name, '--n', e.value])
    record(`VS-3 integer-forms ${e.id}`, t)
    const obj = oneJson(t, e.id)
    assert.ok([0, 2].includes(t.status), `${e.id}: exit ${t.status}`)
    assert.equal(obj.ok, t.status === 0)
    if (t.status === 0) assert.equal(typeof obj.args.n, 'number', `${e.id}: echoed n is not a number`)
  }
})

test('verify security: VS-3 observe unicode digits, padding, underscores, negatives and huge integers', () => {
  const seen = []
  const probes = [
    ...load('unicode-digits', { argv: true }).map((e) => [e.id, e.value]),
    ['space-3', ' 3'], ['underscore', '1_000'], ['negative', '-1'], ['twenty-digits', '99999999999999999999'],
    ...load('huge-integers', { argv: true }).map((e) => [e.id, e.value]),
  ]
  for (const [id, v] of probes) {
    for (const flag of ['--n', '--part']) {
      const t = bp([...base.name, flag, v])
      record(`VS-3 observe ${flag} ${id}`, t)
      const obj = oneJson(t, `${flag} ${id}`)
      assert.ok([0, 2].includes(t.status))
      seen.push(`${flag}=${id}:${t.status}${t.status === 0 ? `:${String(obj.args[flag.slice(2)]).slice(0, 12)}` : `:errlen=${obj.error.length}`}`)
    }
  }
  console.log(`observed: ${seen.join(' | ')}`)
})

const INVALID_FORMATS = [
  ['no-placeholder', 'feature/x'],
  ['two-same', '{name}{name}'],
  ['mixed', '{name}-{name:lower}'],
  ['stray-open', 'sdlc/{name}{'],
  ['stray-close', 'sdlc/}{name}'],
  ['id', 'sdlc/{id}'],
  ['id-plus', 'sdlc/{id}/{name}'],
  ['upper', '{NAME}'],
  ['upper-spec', '{name:upper}'],
  ['lower-lone-close', '{name:lower}}'],
  ['nested', '{{name}}'],
  ['space', 'sdlc/ {name}'],
  ['tab', 'sdlc/\t{name}'],
  ['newline', 'sdlc/{name}\n'],
  ['cr', 'sdlc/{name}\r'],
  ['vt', 'sdlc/\u000b{name}'],
  ['ff', 'sdlc/\u000c{name}'],
  ['fs-x1c', 'sdlc/\u001c{name}'],
  ['nel', 'sdlc/\u0085{name}'],
  ['nbsp', 'sdlc/{name} '],
  ['ideographic', 'sdlc/　{name}'],
  ['line-sep', 'sdlc/ {name}'],
  ['empty', ''],
]

test('verify security: VS-4 invalid formats are refused on every command with no side effect', () => {
  for (const [cmd, args] of Object.entries(base)) {
    for (const [id, fmt] of INVALID_FORMATS) {
      const t = bp([...args, '--format', fmt])
      record(`VS-4 ${cmd} ${id}`, t)
      refused(t, `${cmd} ${id}`)
    }
  }
})

test('verify security: VS-4 hostile corpus formats give one JSON object and the structural verdict', () => {
  const fams = ['format-strings', 'injection', 'unicode-whitespace', 'unicode-confusables', 'control-chars', 'traversal', 'oversized']
  for (const fam of fams) {
    for (const e of load(fam, { argv: true })) {
      for (const cmd of ['name', 'preflight']) {
        const t = bp([...base[cmd], '--format', e.value])
        record(`VS-4 corpus ${fam}/${e.id} ${cmd}`, t)
        const obj = oneJson(t, `${fam}/${e.id} ${cmd}`)
        const count = (e.value.split('{name}').length - 1) + (e.value.split('{name:lower}').length - 1)
        const rest = count === 1 ? e.value.replace(e.value.includes('{name:lower}') ? '{name:lower}' : '{name}', '') : ''
        const structural = count === 1 && !/[{}]/.test(rest) && !/\s/u.test(e.value) && !/[\u001c-\u001f\u0085]/.test(e.value)
        assert.equal(t.status, structural ? 0 : 2, `${fam}/${e.id} ${cmd}: exit ${t.status}, structural=${structural}`)
        assert.equal(obj.ok, structural)
        assert.ok(t.treeUnchanged)
      }
    }
  }
})

test('verify security: VS-4 a NUL byte in the config format gives one JSON object, never a traceback', () => {
  for (const e of load('nul')) {
    const rp = r.gitRepo({ files: { '.sdlc/config.json': JSON.stringify({ branchFormat: e.value }) } })
    for (const cmd of ['name', 'parse', 'list', 'preflight']) {
      const args = base[cmd].map((a) => (a === repo ? rp : a))
      const t = bp(args)
      record(`VS-4 nul config ${e.id} ${cmd}`, t)
      const obj = oneJson(t, `${e.id} ${cmd}`)
      assert.ok([0, 2].includes(t.status))
      assert.equal(obj.ok, t.status === 0)
    }
  }
})

test('verify security: VS-4 valid controls pass on every command', () => {
  for (const fmt of ['sdlc/{name}', 'sdlc/{name:lower}', 'feature/{name}-x', 'feature/PROJ-1-{name}']) {
    for (const [cmd, args] of Object.entries(base)) {
      const t = bp([...args, '--format', fmt])
      record(`VS-4 control ${cmd} ${fmt}`, t)
      const obj = accepted(t, `${cmd} ${fmt}`)
      assert.equal(obj.format, fmt)
    }
  }
})

test('verify security: VS-4 validate_format raises Fail and never another exception for hostile and non-string input', () => {
  const inputs = [...INVALID_FORMATS.map(([, f]) => f), 'sdlc/\u0000{name}', null, 123, ['{name}'], { a: '{name}' }, true, 1.5]
  const results = callPython(join(REPO, 'skills/sdlc/branches.py'), 'validate_format', inputs.map((i) => [i]))
  results.forEach((res, i) => {
    if (i === INVALID_FORMATS.length) {
      assert.ok(['Fail', 'return'].includes(res.outcome))
      return
    }
    assert.equal(res.outcome, 'Fail', `input ${JSON.stringify(inputs[i])}: ${res.outcome} ${res.type} ${res.message}`)
    assert.equal(res.stdout, '')
  })
})

test('verify security: VS-5 unknown kinds and modes are refused, and every documented kind and mode passes', () => {
  const badKinds = ['bogus', 'SLICE', '', 'slice ', ' slice', 'slic', 'slice\n', 'slіce', 'Slice', 'e2e_area']
  for (const cmd of ['name', 'list']) {
    for (const k of badKinds) {
      const t = bp([cmd, '--repo', repo, '--kind', k])
      record(`VS-5 ${cmd} kind ${JSON.stringify(k)}`, t)
      refused(t, `${cmd} kind ${JSON.stringify(k)}`)
    }
    for (const k of KINDS) accepted(bp([cmd, '--repo', repo, '--kind', k]), `${cmd} ${k}`)
  }
  const badModes = ['bogus', 'PR', '', 'pr ', 'ｐｒ', 'Mr', 'stack\t']
  for (const m of badModes) {
    const t = bp(['preflight', '--repo', repo, '--mode', m])
    record(`VS-5 mode ${JSON.stringify(m)}`, t)
    refused(t, `mode ${JSON.stringify(m)}`)
  }
  for (const m of MODES) accepted(bp(['preflight', '--repo', repo, '--mode', m]), `mode ${m}`)
})

test('verify security: VS-5 a --repo that is not a directory is refused on every command', () => {
  const file = join(r.dir('f'), 'plain.txt')
  writeFileSync(file, 'x')
  const dangling = join(r.dir('dl'), 'dangling')
  symlinkSync('/nonexistent-sdlc-verify-target', dangling)
  const targets = [
    '/nonexistent-sdlc-verify', file, dangling, '', '-', `${file}/..x`,
    ...load('traversal', { argv: true }).map((e) => e.value).filter((v) => !['dot', 'trailing-slash'].includes(v)),
  ]
  for (const [cmd, args] of Object.entries(base)) {
    for (const p of [ '/nonexistent-sdlc-verify', file, dangling, '', `${file}/..x`, 'file:///etc', '~/no-such-sdlc-dir']) {
      const t = bp(args.map((a) => (a === repo ? p : a)))
      record(`VS-5 repo ${cmd} ${JSON.stringify(p)}`, t)
      refused(t, `${cmd} repo ${JSON.stringify(p)}`)
    }
  }
  for (const p of targets) {
    const t = bp(base.parse.map((a) => (a === repo ? p : a)))
    record(`VS-5 repo traversal ${JSON.stringify(p)}`, t)
    const obj = oneJson(t, `repo ${JSON.stringify(p)}`)
    assert.ok([0, 2].includes(t.status))
    assert.equal(obj.ok, t.status === 0)
  }
})

test('verify security: VS-5 a symlink to a directory and a path with .. pass', () => {
  const ln = join(r.dir('ln'), 'repo-link')
  symlinkSync(repo, ln)
  const dotted = join(repo, '..', repo.split('/').pop())
  for (const p of [ln, dotted]) {
    for (const [cmd, args] of Object.entries(base)) {
      const t = bp(args.map((a) => (a === repo ? p : a)))
      record(`VS-5 repo ok ${cmd} ${p}`, t)
      accepted(t, `${cmd} ${p}`)
    }
  }
})

test('verify security: VS-5 a missing or malformed git-modes.json fails preflight with exit 2 and leaves the other commands running', () => {
  const variants = {
    removed: { omit: ['git-modes.json'] },
    'invalid-json': { files: { 'git-modes.json': '{"gitModes": [' } },
    'invalid-utf8': { files: { 'git-modes.json': Buffer.from([0xff, 0xfe, 0x7b]) } },
    'no-key': { files: { 'git-modes.json': '{}' } },
    'top-list': { files: { 'git-modes.json': '["pr"]' } },
    'modes-string': { files: { 'git-modes.json': '{"gitModes": "pr"}' } },
    'modes-empty': { files: { 'git-modes.json': '{"gitModes": []}' } },
    'modes-number': { files: { 'git-modes.json': '{"gitModes": [1]}' } },
    'modes-null': { files: { 'git-modes.json': '{"gitModes": null}' } },
    empty: { files: { 'git-modes.json': '' } },
  }
  for (const [id, v] of Object.entries(variants)) {
    const skillDir = r.copySkill(v)
    const t = r.run('branches.py', base.preflight, { skillDir })
    record(`VS-5 git-modes ${id} preflight`, t)
    refused(t, `git-modes ${id}`)
    for (const cmd of ['name', 'parse', 'list']) accepted(r.run('branches.py', base[cmd], { skillDir }), `git-modes ${id} ${cmd}`)
  }
})

test('verify security: VS-5 observe git-modes.json and config.json shapes that only a trusted writer can make', () => {
  const seen = []
  const gm = {
    'gm-directory': { files: { 'git-modes.json': null }, omit: ['git-modes.json'] },
    'gm-deep-nesting': { files: { 'git-modes.json': '['.repeat(200000) + ']'.repeat(200000) } },
  }
  for (const [id, v] of Object.entries(gm)) {
    const skillDir = r.copySkill({ omit: v.omit ?? [] })
    r.writeFiles(skillDir, v.files)
    const t = r.run('branches.py', base.preflight, { skillDir })
    record(`VS-5 observe ${id}`, t)
    seen.push(`${id}:${t.status}:${/Traceback/.test(t.stderr) ? (t.stderr.trim().split('\n').pop()) : 'json'}`)
  }
  const unreadable = r.copySkill()
  chmodSync(join(unreadable, 'git-modes.json'), 0o000)
  const tu = r.run('branches.py', base.preflight, { skillDir: unreadable })
  record('VS-5 observe gm-unreadable', tu)
  seen.push(`gm-unreadable:${tu.status}:${/Traceback/.test(tu.stderr) ? tu.stderr.trim().split('\n').pop() : 'json'}`)
  chmodSync(join(unreadable, 'git-modes.json'), 0o644)
  const deep = r.gitRepo({ files: { '.sdlc/config.json': '['.repeat(200000) + ']'.repeat(200000) } })
  const td = bp(base.parse.map((a) => (a === repo ? deep : a)))
  record('VS-5 observe config deep nesting', td)
  seen.push(`config-deep:${td.status}:${/Traceback/.test(td.stderr) ? td.stderr.trim().split('\n').pop() : 'json'}`)
  const fifoRepo = r.gitRepo()
  mkdirSync(join(fifoRepo, '.sdlc'), { recursive: true })
  r.exec('mkfifo', [join(fifoRepo, '.sdlc', 'config.json')])
  const tf = bp(base.parse.map((a) => (a === repo ? fifoRepo : a)), { timeoutMs: 3000 })
  record('VS-5 observe config fifo', tf)
  seen.push(`config-fifo:timedOut=${tf.timedOut}:status=${tf.status}`)
  console.log(`observed: ${seen.join(' | ')}`)
})

test('verify security: VS-9 a decoy branches.py in the cwd or on PYTHONPATH never wins', () => {
  for (const s of SCRIPTS) {
    const cwd = r.dir('decoy-cwd')
    const inCwd = plantDecoy(cwd)
    const ppDir = r.dir('decoy-pp')
    const onPath = plantDecoy(ppDir)
    const t = r.run(s, ['--help'], { cwd, env: decoyEnv(ppDir) })
    record(`VS-9 decoy cwd+PYTHONPATH ${s}`, t)
    assert.equal(t.status, 0, `${s}: exit ${t.status} ${t.stderr}`)
    assert.equal(decoyFired(inCwd), null)
    assert.equal(decoyFired(onPath), null)
    const rel = r.exec('python3', [relative(realpathSync(cwd), realpathSync(join(r.skillDir, s))), '--help'], { cwd, env: decoyEnv(ppDir) })
    record(`VS-9 relative path ${s}`, rel)
    assert.equal(rel.status, 0)
    assert.equal(decoyFired(onPath), null)
    const shadowDir = r.dir('shadow-pp')
    const shadow = plantDecoy(shadowDir, { behavior: 'shadow' })
    const ts = r.run(s, ['--help'], { cwd, env: { PYTHONPATH: shadowDir, PYTHONSAFEPATH: '1' } })
    assert.equal(ts.status, 0)
    assert.equal(decoyFired(shadow), null)
    const isolated = r.run(s, ['--help'], { cwd, pythonFlags: ['-I'] })
    assert.equal(isolated.status, 0)
    assert.equal(decoyFired(inCwd), null)
  }
})

test('verify security: VS-9 a script loaded by path through importlib from a decoy cwd binds the real branches module', () => {
  for (const s of SCRIPTS) {
    const cwd = r.dir('decoy-import')
    const d = plantDecoy(cwd)
    const ppDir = r.dir('decoy-import-pp')
    const dp = plantDecoy(ppDir)
    const code = `import importlib.util,sys\nspec=importlib.util.spec_from_file_location("m", ${JSON.stringify(join(r.skillDir, s))})\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nprint(m.branches.__file__)`
    const t = r.exec('python3', ['-c', code], { cwd, env: decoyEnv(ppDir) })
    record(`VS-9 importlib ${s}`, t)
    assert.equal(t.status, 0, t.stderr)
    assert.equal(resolve(t.stdout.trim()), resolve(join(r.skillDir, 'branches.py')))
    assert.equal(decoyFired(d), null)
    assert.equal(decoyFired(dp), null)
  }
})

test('verify security: VS-9 a script run through a symlink without a decoy still runs', () => {
  for (const s of SCRIPTS) {
    const linkDir = r.dir('link-clean')
    symlinkSync(join(r.skillDir, s), join(linkDir, s))
    const t = r.exec('python3', [join(linkDir, s), '--help'], { cwd: r.dir('cwd') })
    record(`VS-9 symlink clean ${s}`, t)
    assert.equal(t.status, 0, t.stderr)
  }
})

test('verify security: VS-9 a script run through a symlink imports branches from its own directory, not the symlink directory', () => {
  const fired = []
  for (const s of SCRIPTS) {
    const linkDir = r.dir('link-decoy')
    const d = plantDecoy(linkDir)
    symlinkSync(join(r.skillDir, s), join(linkDir, s))
    const t = r.exec('python3', [join(linkDir, s), '--help'], { cwd: r.dir('cwd') })
    record(`VS-9 symlink with decoy beside the link ${s}`, t)
    if (t.status !== 0 || decoyFired(d)) fired.push(`${s}: exit ${t.status}, decoy imported from ${decoyFired(d)}`)
  }
  assert.deepEqual(fired, [], `the decoy beside the symlink won:\n${fired.join('\n')}`)
})
