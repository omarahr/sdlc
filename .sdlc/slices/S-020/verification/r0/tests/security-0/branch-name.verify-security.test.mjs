import { test } from 'node:test'
import assert from 'node:assert/strict'
const H = process.env.SDLC_WORKTREE + '/skills/sdlc/test/harness.mjs'
const { loadInternals } = await import(H)
const FMTS = ['sdlc/{name}', 'feature/PROJ-1-{name}', 'feature/PROJ-1-{name:lower}']
const TAILS = ['S-001', 'S-001-v0-http-api-0', 'S-001-V0-Http-API-0', '$&', '$1', '$$', '$`', "$'", 'a/b', '../../x', 'é-ÄÖ-İ', '', 'S-1‮', 'x{name}y', 'x{name:lower}y']
function expected(fmt, tail) {
  const lower = fmt.includes('{name:lower}')
  const t = lower ? tail.toLowerCase() : tail
  const ph = lower ? '{name:lower}' : '{name}'
  const i = fmt.indexOf(ph)
  return fmt.slice(0, i) + t + fmt.slice(i + ph.length)
}
for (const fmt of FMTS) {
  for (const tail of TAILS) {
    test('verify security: branchName(' + JSON.stringify(tail) + ') under ' + fmt + ' inserts the tail literally', async () => {
      const rt = await loadInternals(undefined, { branchFormat: fmt })
      assert.equal(rt.I.branchName(tail), expected(fmt, tail))
    })
  }
}
test('verify security: format with no placeholder and with both placeholders do not throw', async () => {
  for (const fmt of ['plain', '{name}-{name:lower}', '{name}{name}']) {
    const rt = await loadInternals(undefined, { branchFormat: fmt })
    assert.equal(typeof rt.I.branchName('S-1'), 'string')
  }
})
test('verify security: empty branchFormat falls back to default', async () => {
  const rt = await loadInternals(undefined, { branchFormat: '' })
  assert.equal(rt.I.branchName('S-1'), 'sdlc/S-1')
})
