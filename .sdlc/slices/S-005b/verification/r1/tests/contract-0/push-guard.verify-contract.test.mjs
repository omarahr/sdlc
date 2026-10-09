import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.VERIFY_ROOT
const HERE = dirname(fileURLToPath(import.meta.url))
const PYTHONS = ['/opt/homebrew/bin/python3.14', `${process.env.HOME}/.local/bin/python3.12`, '/usr/bin/python3'].filter(existsSync)

function copyRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'verify-contract-'))
  cpSync(join(ROOT, 'skills'), join(dir, 'skills'), { recursive: true })
  cpSync(join(ROOT, 'hooks'), join(dir, 'hooks'), { recursive: true })
  return dir
}

function scan(dir, python = 'python3') {
  const r = spawnSync(python, ['-I', join(dir, 'skills/sdlc/test/push_guard.py'), dir], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const CLEAN = scan(ROOT)

function mutate(rel, edit) {
  const dir = copyRoot()
  const p = join(dir, rel)
  writeFileSync(p, edit(readFileSync(p, 'utf8')))
  return scan(dir)
}

function changedKeys(out) {
  return Object.keys(CLEAN).filter((k) => JSON.stringify(CLEAN[k]) !== JSON.stringify(out[k]))
}

const SW = 'skills/sdlc/state-write.py'
const SR = 'skills/sdlc/suite-receipt.py'
const NA = 'skills/sdlc/next-action.py'
const IM = 'skills/sdlc/impact.py'
const SW_DEF = 'def git(repo, *args, check=True):\n'
const SW_RET = '    return r\n\n\ndef read_json'
const NA_RET = '    return r.returncode == 0, r.stdout if r.returncode == 0 else r.stderr\n'
const IM_RUN = 'def run(args, cwd):\n    return subprocess.run(args, cwd=cwd, capture_output=True, text=True)\n'
const PUSH = "subprocess.run(['git', 'push', 'origin', 'sdlc/S-1-v0-x-0'])"

const BODY_CHANGES = [
  ['VS-1', 'TC-contract-1', 'conditional verb in state-write git body', SW, (s) => s.replace(SW_RET, "    git(repo, 'push' if check else 'status')\n" + SW_RET)],
  ['VS-1', 'TC-contract-2', 'parameter rebind before the call in state-write git body', SW, (s) => s.replace(SW_DEF, SW_DEF + "    args = ('push', 'origin', 'sdlc/S-1-v0-x-0')\n")],
  ['VS-1', 'TC-contract-3', 'try/finally push in next-action run body', NA, (s) => s.replace(NA_RET, "    try:\n        pass\n    finally:\n        run(repo, 'git', 'push')\n" + NA_RET)],
  ['VS-1', 'TC-contract-4', 'with block push in impact run body', IM, (s) => s.replace(IM_RUN, "def run(args, cwd):\n    with open(cwd):\n        git_lines(['push'], cwd)\n    return subprocess.run(args, cwd=cwd, capture_output=True, text=True)\n")],
  ['VS-1', 'TC-contract-5', 'lambda push inside suite-receipt git body', SR, (s) => s.replace('    return r.stdout\n', "    (lambda: git(repo, 'push'))()\n    return r.stdout\n")],
  ['VS-1', 'TC-contract-6', 'comprehension push inside next-action run body', NA, (s) => s.replace(NA_RET, "    [run(repo, 'git', v) for v in ('push',)]\n" + NA_RET)],
  ['VS-1', 'TC-contract-7', 'call to an outside helper from impact git_lines body', IM, (s) => s.replace('        r = run(["git"] + args, repo)\n', '        r = run(["git"] + args, repo)\n        helper_push(repo)\n')],
  ['VS-2', 'TC-contract-8', 'new decorator on suite-receipt git', SR, (s) => s.replace('def git(repo, *args):\n', '@staticmethod\ndef git(repo, *args):\n')],
  ['VS-2', 'TC-contract-9', 'changed default check=False on state-write git', SW, (s) => s.replace(SW_DEF, 'def git(repo, *args, check=False):\n')],
  ['VS-2', 'TC-contract-10', 'new keyword-only parameter on state-write git', SW, (s) => s.replace(SW_DEF, "def git(repo, *args, check=True, verb='push'):\n")],
  ['VS-2', 'TC-contract-11', 'return annotation on impact run', IM, (s) => s.replace('def run(args, cwd):\n', 'def run(args, cwd) -> object:\n')],
  ['VS-2', 'TC-contract-12', 'duplicate module-level def run in impact', IM, (s) => s + '\n\n' + IM_RUN],
  ['VS-2', 'TC-contract-13', 'nested def git inside another state-write function', SW, (s) => s + `\n\ndef outer():\n    def git(repo):\n        ${PUSH}\n    return git\n`],
  ['VS-2', 'TC-contract-14', 'class method run in next-action', NA, (s) => s + `\n\nclass Pusher:\n    def run(self):\n        ${PUSH}\n`],
  ['VS-2', 'TC-contract-15', 'async def git in suite-receipt', SR, (s) => s + `\n\nasync def git(repo):\n    ${PUSH}\n`],
  ['VS-2', 'TC-contract-16', 'shadowing def git after the pinned one in state-write', SW, (s) => s + `\n\ndef git(repo, *args, check=True):\n    ${PUSH}\n`],
]

for (const [vs, id, title, rel, edit] of BODY_CHANGES) {
  test(`verify contract ${id} ${vs}: ${title} changes wrapperBodies`, () => {
    const out = mutate(rel, edit)
    assert.ok(changedKeys(out).includes('wrapperBodies'), `keys changed: ${changedKeys(out).join(',')}`)
  })
}

const NON_DEF = [
  ['VS-2', 'TC-contract-17', 'wrapper name rebound by a lambda in state-write', SW, (s) => s + "\n\ngit = lambda repo, *a: None\n\n\ndef later(repo):\n    git(repo, 'push', 'origin', 'sdlc/S-1-v0-x-0')\n"],
  ['VS-2', 'TC-contract-18', 'wrapper name bound by an import alias in impact', IM, (s) => s.replace('import subprocess\n', 'import subprocess\nfrom shutil import which as run\n') + "\n\ndef later(cwd):\n    run(['git', 'push', 'origin', 'sdlc/S-1-v0-x-0'], cwd)\n"],
]

for (const [vs, id, title, rel, edit] of NON_DEF) {
  test(`verify contract ${id} ${vs}: ${title} breaks another pin`, () => {
    const out = mutate(rel, edit)
    const keys = changedKeys(out)
    assert.ok(keys.some((k) => ['imports', 'pushes', 'wrapperValues', 'opaque', 'direct'].includes(k)), `keys changed: ${keys.join(',')}`)
  })
}

const NEUTRAL = [
  ['TC-contract-19', 'comment line in each wrapper body', [[SW, (s) => s.replace(SW_DEF, SW_DEF + '    # note\n')], [SR, (s) => s.replace('    return r.stdout\n', '    # note\n    return r.stdout\n')], [NA, (s) => s.replace(NA_RET, '    # note\n' + NA_RET)], [IM, (s) => s.replace(IM_RUN, IM_RUN.replace('    return', '    # note\n    return')).replace('        return None\n', '        # note\n        return None\n')]]],
  ['TC-contract-20', 'blank line and trailing comment in each wrapper body', [[SW, (s) => s.replace(SW_DEF, SW_DEF + '\n').replace('    return r\n\n\ndef read_json', '    return r  # tail\n\n\ndef read_json')], [SR, (s) => s.replace('    return r.stdout\n', '\n    return r.stdout  # tail\n')], [NA, (s) => s.replace(NA_RET, '\n' + NA_RET)], [IM, (s) => s.replace('    try:\n        r = run', '    try:  # tail\n\n        r = run')]]],
  ['TC-contract-21', 'changed existing comment in impact git_lines', [[IM, (s) => s.replace('# no git on PATH', '# reworded: no git on PATH')]]],
  ['TC-contract-22', 'backslash continuation in next-action run body', [[NA, (s) => s.replace('timeout=120)', '\\\n            timeout=120)')]]],
  ['TC-contract-23', 'CRLF line ends in all four wrapper files', [[SW, (s) => s.replace(/\n/g, '\r\n')], [SR, (s) => s.replace(/\n/g, '\r\n')], [NA, (s) => s.replace(/\n/g, '\r\n')], [IM, (s) => s.replace(/\n/g, '\r\n')]]],
  ['TC-contract-24', 'tab indent in impact run body', [[IM, (s) => s.replace(IM_RUN, IM_RUN.replace('    return', '\treturn'))]]],
]

for (const [id, title, edits] of NEUTRAL) {
  test(`verify contract ${id} VS-3: ${title} keeps every key`, () => {
    const dir = copyRoot()
    for (const [rel, edit] of edits) {
      const p = join(dir, rel)
      const before = readFileSync(p, 'utf8')
      const after = edit(before)
      assert.notEqual(after, before, `edit did not apply to ${rel}`)
      writeFileSync(p, after)
    }
    assert.deepEqual(changedKeys(scan(dir)), [])
  })
}

test('verify contract TC-contract-25 VS-3: comment between decorators keeps the body text', () => {
  const a = copyRoot()
  const b = copyRoot()
  const deco = (extra) => (s) => s.replace('def run(args, cwd):\n', `@staticmethod\n${extra}@staticmethod\ndef run(args, cwd):\n`)
  writeFileSync(join(a, IM), deco('')(readFileSync(join(a, IM), 'utf8')))
  writeFileSync(join(b, IM), deco('# between\n\n')(readFileSync(join(b, IM), 'utf8')))
  assert.deepEqual(scan(a).wrapperBodies, scan(b).wrapperBodies)
})

test('verify contract TC-contract-26 VS-3: clean output is equal on every local python', () => {
  const outs = PYTHONS.map((py) => [py, scan(ROOT, py)])
  for (const [py, out] of outs) assert.deepEqual(out, CLEAN, `differs on ${py}`)
})

test('verify contract TC-contract-27 VS-3: re-quoted string changes the body text (observation)', () => {
  const out = mutate(IM, (s) => s.replace('r = run(["git"] + args, repo)', "r = run(['git'] + args, repo)"))
  assert.deepEqual(changedKeys(out), ['wrapperBodies'])
})

test('verify contract TC-contract-28 VS-3: body_text property over 1000 neutral and code edits on every local python', () => {
  for (const py of PYTHONS) {
    const r = spawnSync(py, ['-I', join(HERE, 'body_text_verify_contract.py'), join(ROOT, 'skills/sdlc/test/push_guard.py'), ROOT, process.env.TESTKIT_SEED || '20261009', '1000'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    const res = JSON.parse(r.stdout)
    console.log(JSON.stringify(res))
    assert.equal(res.failureCount, 0, JSON.stringify(res.failures))
  }
})
