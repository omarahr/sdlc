import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SKILL = process.env.SKILL_DIR
const KIT = process.env.KIT_DIR
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const r = cliRunner({ skillDir: SKILL })

const name = (fmt, kind, flags) => {
  const repo = r.gitRepo({ files: {} })
  return r.run('branches.py', ['name', '--repo', repo, '--format', fmt, '--kind', kind, ...flags])
}
const hasFormatFlag = (() => { const t = r.run('branches.py', ['name', '--help']); return t.stdout.includes('--format') })()
const via = (fmt, kind, flags) => {
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: fmt } } })
  return r.run('branches.py', ['name', '--repo', repo, '--kind', kind, ...flags])
}
const refuses = (t) => {
  assert.equal(t.status, 2, t.text())
  assert.equal(t.json.ok, false)
  assert.equal(t.json.branch, undefined)
  assert.ok(!/Traceback/.test(t.stderr))
  assert.equal(t.treeUnchanged, true)
}

const KIND_CONFUSING = ['S-001-attempt-2', 'S-001-v0-cli-0', 'S-001-attempt-0', 'S-001-v10-a-b-3']
for (const fmt of ['{name}', '{name:lower}', 'feature/{name}']) {
  for (const id of KIND_CONFUSING) {
    for (const kind of ['slice', 'milestone']) {
      test(`verify security TC-security-1: ${kind} ${id} refused under ${fmt}`, () => {
        refuses(via(fmt, kind, ['--id', id]))
      })
    }
  }
}

const LOOKALIKES = ['S-00K', 'S-ſ', 'S-café', 'S-１', 'S-001​', 'S-а']
for (const fmt of ['{name}', '{name:lower}']) {
  for (const id of LOOKALIKES) {
    test(`verify security TC-security-2: non-ASCII id ${JSON.stringify(id)} refused under ${fmt}`, () => {
      refuses(via(fmt, 'slice', ['--id', id]))
    })
  }
}

for (const n of ['-1', '0x2', '2.0', '1e2', '2;x']) {
  test(`verify security TC-security-3: integer part ${JSON.stringify(n)} refused`, () => {
    refuses(via('{name}', 'attempt', ['--id', 'S-001', '--n', n]))
  })
}
for (const n of ['\uff12', '\u0662', '2\n', ' 2', '+2']) {
  test(`verify security TC-security-3b: integer part ${JSON.stringify(n)} is normalized to ASCII 2`, () => {
    const t = via('{name}', 'attempt', ['--id', 'S-001', '--n', n])
    assert.equal(t.json.branch, 'S-001-attempt-2')
  })
}

test('verify security TC-security-4: injection-like ids refused with no side effect', () => {
  for (const id of ['S-001; touch pwned', 'S-001$(touch pwned)', 'S-001\nS-002', 'S-001/../../etc', '-S-001', 'S-001..x', 'S-001.lock']) {
    refuses(via('sdlc/{name}', 'slice', ['--id', id]))
  }
})

test('verify security TC-security-5: valid names still succeed', () => {
  const t = via('sdlc/{name:lower}', 'slice', ['--id', 'S-fix-M-1-2'])
  assert.equal(t.status, 0)
  assert.equal(t.json.branch, 'sdlc/s-fix-m-1-2')
  const e = via('sdlc/{name}', 'attempt', ['--id', 'S-001', '--n', '02'])
  assert.equal(e.json.branch, 'sdlc/S-001-attempt-2')
})

test('verify security TC-security-6: ASCII-only parse of kind-confusing ids stays distinct', () => {
  const repo = r.gitRepo({ files: {} })
  const t = r.run('branches.py', ['parse', '--repo', repo, '--format', 'sdlc/{name}', '--branch', 'sdlc/S-001-attempt-2'])
  assert.equal(t.json.kind, 'attempt')
  const v = r.run('branches.py', ['parse', '--repo', repo, '--format', 'sdlc/{name}', '--branch', 'sdlc/S-001-v0-cli-0'])
  assert.equal(v.json.kind, 'verify')
})

const SCRIPT = join(SKILL, 'next-action.py')
const SPEC = '# Spec\n'
const specHash = createHash('sha256').update(SPEC).digest('hex')
const sl = (id, status) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'implement', notes: '' })
const g = (repo, ...a) => execFileSync('git', ['-C', repo, '-c', 'user.email=a@b.c', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
function activeCheckout(fmt, branch, slicesOnBranch) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-vsec-'))
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, 'spec.md'), SPEC)
  const files = {
    'config.json': { specPath: 'spec.md', specHash, overridesSeen: 0, gitMode: 'direct', defaultBranch: 'main', branchFormat: fmt },
    'requirements.json': [], 'slices.json': [sl('S-001', 'todo')], 'milestones.json': [],
  }
  for (const [k, v] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', k), JSON.stringify(v))
  writeFileSync(join(repo, '.sdlc', 'DECISIONS.md'), '# Decisions\n')
  g(repo, 'init', '-q', '-b', 'main'); g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'b')
  g(repo, 'checkout', '-q', '-b', branch)
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify(slicesOnBranch))
  g(repo, 'commit', '-q', '--allow-empty', '-am', 's')
  g(repo, 'checkout', '-q', 'main')
  const before = g(repo, 'for-each-ref')
  const out = JSON.parse(execFileSync('python3', [SCRIPT, '--repo', repo], { encoding: 'utf8' }))
  assert.equal(g(repo, 'for-each-ref'), before)
  return out.checkout ?? null
}

test('verify security TC-security-7: ASCII lowered branch is active', () => {
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-s-001', [sl('S-001', 'in_progress')]), 'feature/p-1-s-001')
})
test('verify security TC-security-8: Kelvin look-alike branch is not active', () => {
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-s-00K', [sl('S-001', 'in_progress')]), null)
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-s-00K', [sl('S-00K', 'in_progress')]), null)
})
test('verify security TC-security-9: Kelvin id in ledger does not match ASCII branch', () => {
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-s-001', [sl('S-00K', 'in_progress')]), null)
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-s-001', [sl('S-001', 'todo')]), null)
})
test('verify security TC-security-10: long s id and foreign branches never active', () => {
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-s-ſ', [sl('S-ſ', 'in_progress')]), null)
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'other/s-001', [sl('S-001', 'in_progress')]), null)
  assert.equal(activeCheckout('feature/p-1-{name}', 'feature/p-1-s-001', [sl('S-001', 'in_progress')]), null)
  assert.equal(activeCheckout('feature/p-1-{name:lower}', 'feature/p-1-S-001-attempt-1', [sl('S-001', 'in_progress')]), null)
})
