import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { scriptSource, SKILL_DIR } from './harness.mjs'

test('every agent role used by the script has a prompt file', () => {
  const roles = [...new Set([...scriptSource().matchAll(/run\('([a-z-]+)'/g)].map(m => m[1]))]
  assert.ok(roles.length > 0)
  assert.deepEqual(roles.filter(r => !existsSync(join(SKILL_DIR, 'prompts', `${r}.md`))), [])
})

test('shared prompt files exist', () => {
  for (const f of ['_common', 'state-schema', 'commit-state', 'env-fixer']) {
    assert.ok(existsSync(join(SKILL_DIR, 'prompts', `${f}.md`)), `${f}.md missing`)
  }
})

test('script avoids APIs the workflow runtime forbids', () => {
  const src = scriptSource()
  assert.doesNotMatch(src, /Date\.now\(|Math\.random\(|new Date\(\)/)
  assert.doesNotMatch(src, /^\s*import\s/m)
  assert.doesNotMatch(src, /require\(/)
  assert.match(src, /^export const meta = \{/m)
})
