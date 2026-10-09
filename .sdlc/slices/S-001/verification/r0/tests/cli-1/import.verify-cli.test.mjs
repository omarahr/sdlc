import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = process.env.VERIFY_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const BASE_REF = process.env.VERIFY_BASE_REF ?? 'main'
const { cliRunner } = await import(join(REPO, 'skills/sdlc/test/testkit/cli-runner.mjs'))
const { plantDecoy, decoyEnv, decoyFired } = await import(join(REPO, 'skills/sdlc/test/testkit/attack-corpus.mjs'))
const LOG = process.env.VERIFY_LOG
const SKILL = join(REPO, 'skills/sdlc')
const SCRIPTS = ['next-action.py', 'state-write.py', 'janitor.py']

const r = cliRunner({ skillDir: SKILL })

function record(caseId, t) {
  if (LOG) appendFileSync(LOG, `\n===== ${caseId}\n${t.text()}\n`)
  return t
}

function helpOk(caseId, t, decoy) {
  record(caseId, t)
  assert.equal(t.status, 0, t.text())
  assert.match(t.stdout, /usage:/, t.text())
  assert.doesNotMatch(t.stderr, /DECOY/, t.text())
  if (decoy) assert.equal(decoyFired(decoy), null, `decoy imported: ${t.text()}`)
}

test('verify cli: TC-cli-11 a decoy branches.py in the working directory does not shadow the real module', () => {
  for (const name of SCRIPTS) {
    const cwd = r.dir('decoycwd')
    const decoy = plantDecoy(cwd)
    helpOk('TC-cli-11', r.run(name, ['--help'], { cwd }), decoy)
    const code = `import importlib.util,os,sys\nspec=importlib.util.spec_from_file_location("m",sys.argv[1])\nmod=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(mod)\nprint(os.path.realpath(mod.branches.__file__))`
    const t = record('TC-cli-11', r.exec('python3', ['-c', code, join(SKILL, name)], { cwd }))
    assert.equal(t.status, 0, t.text())
    assert.equal(t.stdout.trim(), join(realpathSync(SKILL), 'branches.py'), t.text())
    assert.equal(decoyFired(decoy), null, t.text())
  }
})

test('verify cli: TC-cli-12 a decoy branches module on PYTHONPATH does not shadow the real module', () => {
  for (const name of SCRIPTS) {
    for (const behavior of ['exit', 'shadow']) {
      const d = r.dir('decoypath')
      const decoy = plantDecoy(d, { behavior })
      helpOk('TC-cli-12', r.run(name, ['--help'], { env: decoyEnv(d) }), decoy)
    }
    const pkg = r.dir('decoypkg')
    mkdirSync(join(pkg, 'branches'))
    writeFileSync(join(pkg, 'branches', '__init__.py'), 'raise SystemExit(97)\n')
    helpOk('TC-cli-12', r.run(name, ['--help'], { env: { PYTHONPATH: pkg } }))
  }
})

test('verify cli: TC-cli-13 each script runs through a symlink in another directory, a relative path and python3 -I', () => {
  for (const name of SCRIPTS) {
    const linkDir = r.dir('links')
    symlinkSync(join(SKILL, name), join(linkDir, name))
    helpOk('TC-cli-13', r.exec('python3', [join(linkDir, name), '--help']))
    const cwd = r.dir('relcwd')
    helpOk('TC-cli-13', r.exec('python3', [relative(realpathSync(cwd), realpathSync(join(SKILL, name))), '--help'], { cwd }))
    helpOk('TC-cli-13', r.exec('python3', ['-I', join(SKILL, name), '--help']))
  }
})

const sliceRow = (id, status = 'todo', extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

function ledgerRepo(slices, config = {}) {
  const spec = '# Spec\n'
  const repo = r.gitRepo({
    name: 'ledger',
    files: {
      'spec.md': spec,
      '.sdlc/config.json': { specPath: 'spec.md', specHash: createHash('sha256').update(spec).digest('hex'), overridesSeen: 0, gitMode: 'direct', defaultBranch: 'main', commitFormat: '', ...config },
      '.sdlc/requirements.json': [],
      '.sdlc/slices.json': slices,
      '.sdlc/milestones.json': [],
      '.sdlc/DECISIONS.md': '# Decisions\n',
    },
  })
  return repo
}

let baseSkill
function mainSkill() {
  if (baseSkill) return baseSkill
  const dest = r.dir('mainskill')
  const tar = execFileSync('git', ['-C', REPO, 'archive', BASE_REF, 'skills/sdlc'], { maxBuffer: 256 * 1024 * 1024 })
  execFileSync('tar', ['-x', '-C', dest], { input: tar })
  baseSkill = join(dest, 'skills/sdlc')
  return baseSkill
}

function both(caseId, makeRepo, script, argsOf) {
  const out = {}
  for (const [label, skillDir] of [['slice', SKILL], [BASE_REF, mainSkill()]]) {
    const repo = makeRepo()
    const t = record(`${caseId} (${label})`, r.run(script, argsOf(repo), { skillDir }))
    assert.equal(t.status, 0, t.text())
    out[label] = { json: JSON.parse(t.stdout), repo, t }
  }
  return out
}

const strip = (v, repo) => JSON.parse(JSON.stringify(v).split(repo).join('<repo>'))

test('verify cli: TC-cli-14 next-action.py finds an in-progress slice on its own branch, same as before the import', () => {
  const make = () => {
    const repo = ledgerRepo([sliceRow('S-1')])
    r.git(repo, 'checkout', '-q', '-b', 'sdlc/S-1')
    writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify([sliceRow('S-1', 'in_progress', { phase: 'implement' })], null, 2))
    r.git(repo, 'commit', '-q', '-am', 'state S-1')
    r.git(repo, 'checkout', '-q', 'main')
    return repo
  }
  const o = both('TC-cli-14', make, 'next-action.py', (repo) => ['--repo', repo, '--bar-raiser-rounds', '0'])
  const now = o.slice.json
  assert.equal(now.next.action, 'slice', JSON.stringify(now))
  assert.equal(now.next.slice.id, 'S-1')
  assert.equal(now.checkout, 'sdlc/S-1')
  assert.deepEqual(strip(now, o.slice.repo), strip(o[BASE_REF].json, o[BASE_REF].repo))
})

test('verify cli: TC-cli-15 state-write.py base-branch names the awaiting-merge dependency branch, same as before the import', () => {
  const make = () => {
    const repo = ledgerRepo([sliceRow('S-1', 'awaiting-merge', { pr: 'u' }), sliceRow('S-2', 'todo', { dependsOn: ['S-1'] })], { gitMode: 'stack', runBranch: 'sdlc/run-1' })
    r.git(repo, 'branch', 'sdlc/run-1')
    r.git(repo, 'checkout', '-q', '-b', 'sdlc/S-1')
    writeFileSync(join(repo, 'one.txt'), 'one\n')
    r.git(repo, 'add', '-A')
    r.git(repo, 'commit', '-q', '-m', 'S-1 work')
    r.git(repo, 'checkout', '-q', 'main')
    return repo
  }
  const o = both('TC-cli-15', make, 'state-write.py', (repo) => ['base-branch', '--repo', repo, '--slice', 'S-2'])
  assert.equal(o.slice.json.ok, true, JSON.stringify(o.slice.json))
  assert.equal(o.slice.json.branch, 'sdlc/S-1')
  assert.deepEqual(o.slice.json, o[BASE_REF].json)
  const pr = both('TC-cli-15', () => ledgerRepo([sliceRow('S-1', 'awaiting-merge', { pr: 'u' }), sliceRow('S-2', 'todo', { dependsOn: ['S-1'] })]), 'state-write.py', (repo) => ['base-branch', '--repo', repo, '--slice', 'S-2'])
  assert.deepEqual(pr.slice.json, pr[BASE_REF].json)
})

test('verify cli: TC-cli-16 janitor.py removes the v-branch of a done slice and keeps the slice branch, same as before the import', () => {
  const make = () => {
    const repo = ledgerRepo([sliceRow('S-1', 'done'), sliceRow('S-2', 'in_progress')])
    for (const b of ['sdlc/S-1-v1', 'sdlc/S-1', 'sdlc/S-2-v1', 'sdlc/S-9-v3', 'sdlc/run-1']) r.git(repo, 'branch', b)
    return repo
  }
  const o = both('TC-cli-16', make, 'janitor.py', (repo) => ['--repo', repo, '--days', '36500'])
  assert.deepEqual(o.slice.json.removedBranches.sort(), ['sdlc/S-1-v1', 'sdlc/S-9-v3'])
  const left = (repo) => r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').sort()
  assert.deepEqual(left(o.slice.repo), ['main', 'sdlc/S-1', 'sdlc/S-2-v1', 'sdlc/run-1'])
  assert.deepEqual(o.slice.json.removedBranches.sort(), o[BASE_REF].json.removedBranches.sort())
  assert.deepEqual(left(o.slice.repo), left(o[BASE_REF].repo))
  assert.deepEqual(o.slice.json.notes, o[BASE_REF].json.notes)
})
