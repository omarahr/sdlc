import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { cliRunner } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//vi18n/skills/sdlc/test/testkit/cli-runner.mjs'
import { sample, lookalikes, FOLD_SAMPLES } from '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//vi18n/skills/sdlc/test/testkit/i18n-kit.mjs'

const r = cliRunner({ skillDir: '/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T//vi18n/skills/sdlc' })
const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/{name}' } } })
const name = (args, fmt) => r.run('branches.py', ['name', '--repo', repo, ...(fmt ? ['--format', fmt] : []), ...args])
const parse = (b, fmt) => r.run('branches.py', ['parse', '--repo', repo, '--branch', b, ...(fmt ? ['--format', fmt] : [])])

test('verify i18n VS-3: non-ASCII slice ids refused under {name} and {name:lower}', () => {
  for (const fmt of ['p/{name}', 'p/{name:lower}']) {
    for (const s of [...FOLD_SAMPLES.map((x) => 'S-00' + x.char), 'S-00é', 'S-00１', 'Ｓ-001', 'S-００１']) {
      const t = name(['--kind', 'slice', '--id', s], fmt)
      assert.equal(t.status, 2, fmt + ' ' + s + ' ' + t.stdout)
      assert.equal(t.json.ok, false)
      assert.ok(!('branch' in t.json))
      assert.equal(t.treeUnchanged, true)
    }
  }
})

test('verify i18n VS-3: non-ASCII ids refused for milestone kinds and fullwidth ints refused', () => {
  for (const kind of ['milestone', 'e2e']) {
    const t = name(['--kind', kind, '--id', 'M-é'], 'p/{name}')
    assert.equal(t.status, 2, kind + t.stdout)
  }
  for (const v of ['\uff12', '\u0662']) {
    const t = name(['--kind', 'run', '--n', v], 'p/{name}')
    assert.equal(t.status, 0, 'n ' + v)
    assert.equal(t.json.branch, 'p/run-2')
    assert.equal(parse(t.json.branch, 'p/{name}').json.n, 2)
  }
})

test('verify i18n VS-3: parse also refuses the same ids', () => {
  for (const s of ['S-00\u212a', 'S-00\u00e9']) {
    const t = parse('p/' + s, 'p/{name}')
    assert.equal(t.json.kind === 'slice', false, s + JSON.stringify(t.json))
  }
})

test('verify i18n VS-5: lowering only the tail, ASCII only, parses back', () => {
  const t = name(['--kind', 'slice', '--id', 'S-001'], 'Feat/PROJ-{name:lower}-X')
  assert.equal(t.json.branch, 'Feat/PROJ-s-001-X')
  const p = parse(t.json.branch, 'Feat/PROJ-{name:lower}-X')
  assert.equal(p.json.kind, 'slice')
  for (const id of ['slice']) {}
  for (const area of ['É', 'İ', 'ß', 'ẞ', 'ſ', 'CafÉ-ABC', 'KK']) {
    const n = name(['--kind', 'e2e-area', '--id', 'M-1', '--area', area], 'Feat/PROJ-{name:lower}-X')
    assert.equal(n.status, 0, area + n.stdout + n.stderr)
    const b = n.json.branch
    assert.ok(b.startsWith('Feat/PROJ-') && b.endsWith('-X'), b)
    const mid = b.slice('Feat/PROJ-'.length, -2)
    assert.equal(mid, mid.replace(/[A-Z]/g, (c) => c.toLowerCase()))
    const expected = area.replace(/[A-Z]/g, (c) => c.toLowerCase())
    assert.ok(mid.endsWith(expected), mid + ' vs ' + expected)
    const q = parse(b, 'Feat/PROJ-{name:lower}-X')
    assert.equal(q.json.kind, 'e2e-area', b)
    assert.equal(q.json.area.replace(/[A-Z]/g, (c) => c.toLowerCase()), expected)
  }
})

test('verify i18n VS-5: lowering keeps e2e-area with kelvin area and caps ids consistent', () => {
  const n = name(['--kind', 'milestone', '--id', 'M-1'], 'Feat/PROJ-{name:lower}-X')
  assert.equal(n.json.branch, 'Feat/PROJ-m-1-X')
  assert.equal(parse(n.json.branch, 'Feat/PROJ-{name:lower}-X').json.id, 'm-1')
})

function scratchWithBranch(branch, id, fmt) {
  const rp = r.gitRepo({ files: { '.sdlc/config.json': { specPath: 'spec.md', specHash: '603c828a03383f98b82bf9c6787deeb5c40c02871a1b8d6ba14b0d538020a02b', overridesSeen: 0, gitMode: 'direct', defaultBranch: 'main', branchFormat: fmt }, '.sdlc/slices.json': [], '.sdlc/requirements.json': [], '.sdlc/milestones.json': [], '.sdlc/DECISIONS.md': '# Decisions\n', 'spec.md': '# Spec\n' } })
  r.exec('git', ['-C', rp, 'checkout', '-q', '-b', branch])
  r.writeFiles(rp, { '.sdlc/slices.json': [{ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status: 'in_progress', phase: 'implement', notes: '' }] })
  r.exec('git', ['-C', rp, 'add', '-A'])
  r.exec('git', ['-C', rp, 'commit', '-q', '-m', 'state'])
  r.exec('git', ['-C', rp, 'checkout', '-q', '-b', 'side'])
  return rp
}
const fmt8 = 'feature/p-1-{name:lower}'
const decide = (rp) => { return r.run('next-action.py', ['--repo', rp, '--bar-raiser-rounds', '0']) }

test('verify i18n VS-8: ASCII branch is active for matching id', () => {
  const rp = scratchWithBranch('feature/p-1-s-001', 'S-001', fmt8)
  const t = decide(rp)
  assert.equal(t.json.checkout, 'feature/p-1-s-001', t.stdout + t.stderr)
})

test('verify i18n VS-8: kelvin look-alike branch is not active', () => {
  const rp = scratchWithBranch('feature/p-1-s-00\u212a', 'S-001', fmt8)
  assert.equal(decide(rp).json.checkout, null)
  const rp2 = scratchWithBranch('feature/p-1-s-00\u212a', 'S-00\u212a', fmt8)
  assert.equal(decide(rp2).json.checkout, null)
})

test('verify i18n VS-8: kelvin id in slices.json does not match the ASCII branch', () => {
  const rp = scratchWithBranch('feature/p-1-s-001', 'S-00\u212a', fmt8)
  assert.equal(decide(rp).json.checkout, null)
  const rp2 = scratchWithBranch('feature/p-1-s-00k', 'S-00\u212a', fmt8)
  assert.equal(decide(rp2).json.checkout, null)
})

test('verify i18n VS-8: foreign branches and uppercase id with lower format', () => {
  const rp = scratchWithBranch('other/s-001', 'S-001', fmt8)
  assert.equal(decide(rp).json.checkout, null)
  const rp2 = scratchWithBranch('feature/p-1-S-001', 'S-001', fmt8)
  assert.equal(decide(rp2).json.checkout, 'feature/p-1-S-001')
  const rp3 = scratchWithBranch('feature/p-1-s-001', 'S-001', 'feature/p-1-{name}')
  assert.equal(decide(rp3).json.checkout, null)
})
