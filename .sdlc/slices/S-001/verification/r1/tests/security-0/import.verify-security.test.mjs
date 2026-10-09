import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, linkSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = process.env.SDLC_VERIFY_REPO ? resolve(process.env.SDLC_VERIFY_REPO) : resolve(HERE, '../../../../../../..')
const SKILL = join(REPO, 'skills/sdlc')
const TESTKIT = join(SKILL, 'test/testkit')
const { cliRunner } = await import(join(TESTKIT, 'cli-runner.mjs'))
const { plantDecoy, decoyEnv, decoyFired } = await import(join(TESTKIT, 'attack-corpus.mjs'))

const LOG = join(HERE, '../../logs/security-0-transcripts.txt')
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(LOG, `skill directory under test: ${SKILL}\n\n`)
const record = (label, t) => appendFileSync(LOG, `### ${label}\n${t.text()}\n\n`)

const r = cliRunner({ skillDir: SKILL })
const SCRIPTS = ['next-action.py', 'state-write.py', 'janitor.py']
const REAL_BRANCHES = realpathSync(join(SKILL, 'branches.py'))

const loadAndPrint = (path) => `import importlib.util\nspec=importlib.util.spec_from_file_location("m", ${JSON.stringify(path)})\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nprint(m.branches.__file__)`

function heldClean(t, decoys, label) {
  assert.equal(t.status, 0, `${label}: exit ${t.status}\n${t.stderr}`)
  for (const d of decoys) assert.equal(decoyFired(d), null, `${label}: decoy imported from ${decoyFired(d)}`)
  assert.ok(!/Traceback/.test(t.stderr), `${label}: traceback\n${t.stderr}`)
}

test('verify security: VS-9 a decoy branches.py in the cwd or on PYTHONPATH never wins', () => {
  for (const s of SCRIPTS) {
    const cwd = r.dir('decoy-cwd')
    const inCwd = plantDecoy(cwd)
    const ppDir = r.dir('decoy-pp')
    const onPath = plantDecoy(ppDir)
    const t = r.run(s, ['--help'], { cwd, env: decoyEnv(ppDir) })
    record(`TC-security-17 decoy cwd+PYTHONPATH ${s}`, t)
    heldClean(t, [inCwd, onPath], s)
    const rel = r.exec('python3', [relative(realpathSync(cwd), realpathSync(join(SKILL, s))), '--help'], { cwd, env: decoyEnv(ppDir) })
    record(`TC-security-17 relative path ${s}`, rel)
    heldClean(rel, [inCwd, onPath], `${s} relative`)
    const shadowDir = r.dir('shadow-pp')
    const shadow = plantDecoy(shadowDir, { behavior: 'shadow' })
    const ts = r.run(s, ['--help'], { cwd, env: { PYTHONPATH: shadowDir, PYTHONSAFEPATH: '1' } })
    record(`TC-security-17 shadow PYTHONSAFEPATH ${s}`, ts)
    heldClean(ts, [shadow, inCwd], `${s} shadow`)
    const isolated = r.run(s, ['--help'], { cwd, pythonFlags: ['-I'] })
    record(`TC-security-17 python -I ${s}`, isolated)
    heldClean(isolated, [inCwd], `${s} -I`)
  }
})

test('verify security: VS-9 a script loaded by path through importlib from a decoy cwd binds the real branches module', () => {
  for (const s of SCRIPTS) {
    const cwd = r.dir('decoy-import')
    const d = plantDecoy(cwd)
    const ppDir = r.dir('decoy-import-pp')
    const dp = plantDecoy(ppDir)
    const t = r.exec('python3', ['-c', loadAndPrint(join(SKILL, s))], { cwd, env: decoyEnv(ppDir) })
    record(`TC-security-18 importlib ${s}`, t)
    heldClean(t, [d, dp], s)
    assert.equal(realpathSync(t.stdout.trim()), REAL_BRANCHES)
  }
})

test('verify security: VS-9 a script run through a symlink without a decoy still runs', () => {
  for (const s of SCRIPTS) {
    const linkDir = r.dir('link-clean')
    symlinkSync(join(SKILL, s), join(linkDir, s))
    const t = r.exec('python3', [join(linkDir, s), '--help'], { cwd: r.dir('cwd') })
    record(`TC-security-19 symlink clean ${s}`, t)
    heldClean(t, [], s)
  }
})

test('verify security: VS-9 a script run through a symlink imports branches from its own directory, not the symlink directory', () => {
  const fired = []
  for (const s of SCRIPTS) {
    const linkDir = r.dir('link-decoy')
    const d = plantDecoy(linkDir)
    symlinkSync(join(SKILL, s), join(linkDir, s))
    const t = r.exec('python3', [join(linkDir, s), '--help'], { cwd: r.dir('cwd') })
    record(`TC-security-20 symlink with decoy beside the link ${s}`, t)
    if (t.status !== 0 || decoyFired(d)) fired.push(`${s}: exit ${t.status}, decoy imported from ${decoyFired(d)}`)
  }
  assert.deepEqual(fired, [], `the decoy beside the symlink won:\n${fired.join('\n')}`)
})

test('verify security: VS-9 a chain of symlinks with a decoy beside each link resolves to the real script directory', () => {
  for (const s of SCRIPTS) {
    const a = r.dir('chain-a')
    const b = r.dir('chain-b')
    const da = plantDecoy(a)
    const db = plantDecoy(b)
    symlinkSync(join(SKILL, s), join(b, s))
    symlinkSync(join(b, s), join(a, s))
    const t = r.exec('python3', [join(a, s), '--help'], { cwd: a })
    record(`TC-security-23 symlink chain ${s}`, t)
    heldClean(t, [da, db], s)
  }
})

test('verify security: VS-9 a relative symlink run by a relative path from a cwd that holds a decoy module and a decoy package resolves to the real module', () => {
  for (const s of SCRIPTS) {
    const cwd = r.dir('rel-link')
    const d = plantDecoy(cwd)
    const pkgDir = join(r.dir('rel-link-pkg'), 'branches')
    const pkg = plantDecoy(pkgDir, { module: '__init__' })
    symlinkSync(relative(realpathSync(cwd), realpathSync(join(SKILL, s))), join(cwd, s))
    const t = r.exec('python3', [`./${s}`, '--help'], { cwd, env: decoyEnv(dirname(pkgDir)) })
    record(`TC-security-24 relative symlink ${s}`, t)
    heldClean(t, [d, pkg], s)
  }
})

test('verify security: VS-9 a script reached through a symlinked skill directory binds the real branches module', () => {
  for (const s of SCRIPTS) {
    const holder = r.dir('dir-link')
    const linkedSkill = join(holder, 'skill')
    symlinkSync(SKILL, linkedSkill)
    const d = plantDecoy(holder)
    const t = r.exec('python3', ['-c', loadAndPrint(join(linkedSkill, s))], { cwd: holder })
    record(`TC-security-25 symlinked skill directory ${s}`, t)
    heldClean(t, [d], s)
    assert.equal(realpathSync(t.stdout.trim()), REAL_BRANCHES)
    const run = r.exec('python3', [join(linkedSkill, s), '--help'], { cwd: holder })
    record(`TC-security-25 symlinked skill directory run ${s}`, run)
    heldClean(run, [d], `${s} run`)
  }
})

test('verify security: VS-9 a script loaded through importlib by a symlink path with a decoy beside the link binds the real branches module', () => {
  for (const s of SCRIPTS) {
    const linkDir = r.dir('import-link')
    const d = plantDecoy(linkDir)
    symlinkSync(join(SKILL, s), join(linkDir, s))
    const t = r.exec('python3', ['-c', loadAndPrint(join(linkDir, s))], { cwd: linkDir, env: decoyEnv(linkDir) })
    record(`TC-security-26 importlib through symlink ${s}`, t)
    heldClean(t, [d], s)
    assert.equal(realpathSync(t.stdout.trim()), REAL_BRANCHES)
  }
})

test('verify security: VS-9 observe a hard link to a script with a decoy beside it', () => {
  const seen = []
  for (const s of SCRIPTS) {
    const dir = r.dir('hardlink')
    const d = plantDecoy(dir)
    let t
    try {
      linkSync(join(SKILL, s), join(dir, s))
      t = r.exec('python3', [join(dir, s), '--help'], { cwd: r.dir('cwd') })
    } catch (e) {
      seen.push(`${s}: hard link failed ${e.code}`)
      continue
    }
    record(`A-hardlink observe ${s}`, t)
    seen.push(`${s}: exit ${t.status} decoy=${decoyFired(d) ? 'imported' : 'absent'}`)
  }
  console.log(`observed: ${seen.join(' | ')}`)
})

test('verify security: VS-9 observe a process that already holds a branches module before it loads a script', () => {
  const seen = []
  for (const s of SCRIPTS) {
    const ppDir = r.dir('preloaded')
    const d = plantDecoy(ppDir, { behavior: 'shadow' })
    const code = `import branches\n${loadAndPrint(join(SKILL, s))}`
    const t = r.exec('python3', ['-c', code], { cwd: r.dir('cwd'), env: decoyEnv(ppDir) })
    record(`A-preloaded observe ${s}`, t)
    seen.push(`${s}: exit ${t.status} bound=${t.stdout.trim().startsWith(realpathSync(ppDir)) ? 'decoy' : t.stdout.trim()}`)
  }
  console.log(`observed: ${seen.join(' | ')}`)
})
