import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const TK = process.env.VERIFY_TESTKIT
const P = join(WT, 'skills/sdlc/prompts')
const read = (f) => readFileSync(join(P, f), 'utf8')
const prop = await import(join(TK, 'property.mjs'))
const SEED = Number.parseInt(process.env.TESTKIT_SEED ?? '27001', 10)

const RULE = "`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here."
const SCHEMA_TEXT = "the format of every branch the loop makes: literal text around one `{name}` (or `{name:lower}`) placeholder, which carries the loop's own tail per branch kind (`branches.py`). Set at the first launch; a resume keeps it."

test('verify contract: VS-1 env-detector Inputs line lists branchFormat as a format string or null', () => {
  const t = read('env-detector.md')
  const inputs = t.split('\n').find((l) => l.startsWith('Inputs:'))
  assert.match(inputs, /`branchFormat` \(a format string or null\)/)
  assert.match(inputs, /`commitFormat` \(a format string or null\)/)
})

test('verify contract: VS-1 env-detector holds the quoted R-064 sentence verbatim, once', () => {
  const t = read('env-detector.md')
  assert.equal(t.split(RULE).length - 1, 1)
})

test('verify contract: VS-1 steps are numbered 1..8 in order with branch format before commit format', () => {
  const t = read('env-detector.md')
  const nums = [...t.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.match(t, /^4\. \*\*Branch format:\*\*/m)
  assert.match(t, /^5\. \*\*Commit format:\*\*/m)
  assert.match(t, /^7\. Write `config\.json`/m)
})

test('verify contract: VS-1 no prompt or script cites an env-detector step number that moved', () => {
  const r = spawnSync('grep', ['-rnEi', 'env-detector[^\\n]{0,60}step [0-9]|step [0-9][^\\n]{0,60}env-detector', join(WT, 'skills/sdlc')], { encoding: 'utf8' })
  assert.equal(r.stdout.trim(), '')
})

test('verify contract: VS-1 config write step keeps an existing branchFormat', () => {
  const t = read('env-detector.md')
  const line = t.split('\n').find((l) => l.startsWith('7. Write `config.json`'))
  assert.match(line, /Keep existing [^.]*`branchFormat`/)
})

test('verify contract: VS-1 changed files pass ste-check.py', () => {
  for (const f of ['env-detector.md', 'state-schema.md', 'slicer.md', '_common.md']) {
    const r = spawnSync('python3', ['-I', join(WT, 'skills/sdlc/ste-check.py'), join(P, f)], { encoding: 'utf8' })
    assert.equal(r.status, 0, `${f}: ${r.stdout}${r.stderr}`)
  }
})

test('verify contract: VS-2 env-detector never reads branch-name rules', () => {
  const t = read('env-detector.md')
  for (const re of [/branch_name_regex/i, /branch[- ]name (rule|regex|policy|pattern)/i, /branch_name/i, /protected branch/i, /naming (rule|convention)/i]) {
    assert.doesNotMatch(t, re, String(re))
  }
  const pushRuleLines = t.split('\n').filter((l) => /push[ _]rule/i.test(l))
  assert.equal(pushRuleLines.length, 1)
  assert.match(pushRuleLines[0], /commit_message_regex/)
  assert.doesNotMatch(pushRuleLines[0], /branch/i)
})

test('verify contract: VS-2 commit format step still reads commit_message_regex under glab push_rule', () => {
  const t = read('env-detector.md')
  assert.match(t, /glab api "projects\/:fullpath\/push_rule"`, field `commit_message_regex`/)
  const branchStep = t.slice(t.indexOf('4. **Branch format:**'), t.indexOf('5. **Commit format:**'))
  assert.doesNotMatch(branchStep, /glab|gh api|push_rule|commit_message_regex/)
  assert.match(branchStep, /do not read the forge's rules here/)
})

test('verify contract: VS-3 rule order is input, existing config value, sdlc/{name}', () => {
  const t = read('env-detector.md')
  const i = t.indexOf('the `branchFormat` input when it is not null')
  const j = t.indexOf('else an existing `config.branchFormat`')
  const k = t.indexOf('else `sdlc/{name}`')
  assert.ok(i > 0 && j > i && k > j)
  assert.match(t, /^4\. \*\*Branch format:\*\* write `config\.branchFormat`\./m)
})

test('verify contract: VS-3 property: load_format returns sdlc/{name} for configs with no usable branchFormat (>=1000 runs)', () => {
  const rep = prop.check({
    fn: 'load_format',
    seed: SEED,
    runs: 1000,
    module: join(WT, 'skills/sdlc/branches.py'),
    gen: (r) => {
      const shape = r.pick([
        { kind: 'absent' }, { kind: 'no-sdlc-dir' },
        { kind: 'json', value: {} }, { kind: 'json', value: { commands: { test: 'npm test' }, gitMode: 'pr' } },
        { kind: 'json', value: { commitFormat: '', runBranch: `x${r.int(0, 99)}` } },
        { kind: 'json', value: { branchFormat: null } }, { kind: 'json', value: { branchFormat: '' } },
      ])
      return { shape }
    },
    toArgs: (i) => [prop.materializeConfig(process.env.VERIFY_SCRATCH, i.shape)],
    property: (_i, res) => (res.outcome === 'return' && res.value === 'sdlc/{name}' ? null : `got ${JSON.stringify(res)}`),
  })
  assert.equal(rep.violations.length, 0, prop.describeViolations(rep))
})

test('verify contract: VS-3 property: a valid configured format wins over the default (model: config value else default)', () => {
  const rep = prop.check({
    fn: 'load_format',
    seed: SEED + 1,
    runs: 1000,
    module: join(WT, 'skills/sdlc/branches.py'),
    gen: (r) => ({ fmt: `${r.pick(['feature', 'team', 'x', 'a/b', 'v1'])}/${r.pick(['{name}', '{name:lower}'])}${r.pick(['', '-z', '.t'])}` }),
    toArgs: (i) => [prop.materializeConfig(process.env.VERIFY_SCRATCH, { kind: 'json', value: { branchFormat: i.fmt } })],
    property: (i, res) => (res.outcome === 'return' && res.value === i.fmt ? null : `got ${JSON.stringify(res)}`),
  })
  assert.equal(rep.violations.length, 0, prop.describeViolations(rep))
})

test('verify contract: VS-4 state-schema config block holds branchFormat sdlc/{name} and the spec text', () => {
  const t = read('state-schema.md')
  const block = t.slice(t.indexOf('## config.json'), t.indexOf('## requirements.json'))
  const json = block.match(/```json\n([\s\S]*?)```/)[1]
  const cfg = JSON.parse(json)
  assert.equal(cfg.branchFormat, 'sdlc/{name}')
  assert.deepEqual(Object.keys(cfg).slice(Object.keys(cfg).indexOf('commitFormat'), Object.keys(cfg).indexOf('commitFormat') + 3), ['commitFormat', 'branchFormat', 'runRequest'])
  assert.ok(block.includes('- `branchFormat` is ' + SCHEMA_TEXT))
})

test('verify contract: VS-4 slice branch and runBranch use the quoted phrases', () => {
  const t = read('state-schema.md')
  assert.ok(t.includes('the slice branch under `config.branchFormat`'))
  assert.ok(t.includes('the run branch (`run` kind under `config.branchFormat`)'))
  assert.match(t, /^- `runBranch` is `""` outside `stack` mode\. In `stack` mode it is the run branch/m)
})

test('verify contract: VS-4 no sdlc/run-<n> in the config section, no sdlc/S-001 in the slice example', () => {
  const t = read('state-schema.md')
  const cfg = t.slice(t.indexOf('## config.json'), t.indexOf('## requirements.json'))
  assert.doesNotMatch(cfg, /sdlc\/run-/)
  const slice = t.slice(t.indexOf('## slices.json'), t.indexOf('## milestones.json'))
  assert.doesNotMatch(slice, /sdlc\/S-001/)
  assert.match(slice, /"branch": "<slice branch>"/)
})

test('verify contract: VS-4 the run-branch test line in prompts.test.mjs still finds a runBranch line', () => {
  const tests = readFileSync(join(WT, 'skills/sdlc/test/prompts.test.mjs'), 'utf8')
  const t = read('state-schema.md')
  assert.ok(t.split('\n').some((l) => l.startsWith('- `runBranch` is')))
  assert.match(tests, /runBranch/)
})

test('verify contract: VS-5 slicer writes branch: <slice branch> and no sdlc/ literal', () => {
  const t = read('slicer.md')
  assert.ok(t.includes('`branch: <slice branch>`'))
  assert.doesNotMatch(t, /branch: sdlc\//)
  assert.doesNotMatch(t, /sdlc\/</)
})

test('verify contract: VS-5 no other prompt tells the slicer to write sdlc/<id>', () => {
  const r = spawnSync('grep', ['-rnE', 'branch: ?`?sdlc/|`branch`[^.]{0,40}sdlc/<', P], { encoding: 'utf8' })
  assert.equal(r.stdout.trim(), '')
  const common = read('_common.md')
  assert.match(common, /\| `<slice branch>` \| `branches\.py name --kind slice --id <sliceId>` \|/)
})
