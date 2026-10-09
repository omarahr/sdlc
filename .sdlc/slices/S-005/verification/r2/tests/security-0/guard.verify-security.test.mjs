import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const SKILL = join(REPO, 'skills/sdlc')
const LOG = join(REPO, '.sdlc/slices/S-005/verification/r2/logs/security-0-mutants.txt')
const PATTERN = 'no script pushes a verify branch'
const lines = []
const copies = []

after(() => {
  writeFileSync(LOG, lines.join('\n') + '\n')
  for (const c of copies) rmSync(c, { recursive: true, force: true })
})

function cleanEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'))
}

function runGuard(skillDir, cwd) {
  const t = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern', PATTERN, join(skillDir, 'test', 'branches.test.mjs')], { cwd: cwd ?? skillDir, encoding: 'utf8', timeout: 120000, env: cleanEnv() })
  const pass = /^# pass 1$/m.test(t.stdout) && t.status === 0
  const fail = /^# fail 1$/m.test(t.stdout) && t.status !== 0
  const reason = (t.stdout.match(/error: \|-?\n\s+(.*)|error: '([^\n]*)'/) || []).slice(1).find(Boolean) || ''
  return { status: t.status, pass, fail, reason, out: t.stdout + t.stderr }
}

function skillCopy(edit = () => {}) {
  const dest = mkdtempSync(join(tmpdir(), 'verify-security-s005-'))
  copies.push(dest)
  cpSync(SKILL, dest, { recursive: true, filter: s => !s.split('/').some(p => p === '__pycache__' || p === 'node_modules') })
  edit(dest)
  return dest
}

function append(file, text) {
  return d => {
    const p = join(d, file)
    writeFileSync(p, readFileSync(p, 'utf8') + text)
  }
}

function probe(id, label, edit) {
  const r = runGuard(skillCopy(edit))
  lines.push(`${id} ${label}: T-R-119 exit ${r.status} ${r.pass ? 'PASSED (mutant not caught)' : r.fail ? 'FAILED (mutant caught)' : 'UNCLEAR'}${r.reason ? ' - ' + r.reason.slice(0, 220) : ''}`)
  return r
}

const PY_VERIFY = '\n\ndef leak_verify(repo, sid, rnd, prof, part):\n    vb = f"sdlc/{sid}-v{rnd}-{prof}-{part}"\n'

test('verify security: VS-9 T-R-119 passes on the unchanged skill, from the repo root and from a moved copy', () => {
  const inRepo = runGuard(SKILL, REPO)
  lines.push(`clean tree from repo root: exit ${inRepo.status} ${inRepo.pass ? 'PASSED' : 'NOT PASSED'}`)
  assert.ok(inRepo.pass, inRepo.out)
  const moved = runGuard(skillCopy(), tmpdir())
  lines.push(`clean copy outside the repo: exit ${moved.status} ${moved.pass ? 'PASSED' : 'NOT PASSED'}`)
  assert.ok(moved.pass, moved.out)
  const src = readFileSync(join(SKILL, 'test', 'branches.test.mjs'), 'utf8')
  assert.doesNotMatch(src, /worktrees|\/Users\/|sdlc-run/, 'the guard test names an absolute or worktree path')
})

test('verify security: VS-9 the three TC-cli-11 mutants fail T-R-119', () => {
  const a = probe('M-1', 'verify name built on an earlier line, then pushed', append('state-write.py', PY_VERIFY + '    git(repo, "push", "-q", "origin", vb, check=False)\n'))
  const b = probe('M-2', 'git(repo, "push", ...) split over lines', append('state-write.py', '\n\ndef leak_split(repo, sid, rnd, prof, part):\n    git(repo, "push", "-q",\n        "origin", f"sdlc/{sid}-v{rnd}-{prof}-{part}", check=False)\n'))
  const c = probe('M-3', 'split create call', append('state-write.py', PY_VERIFY + '    subprocess.run(["gh", "pr",\n                    "create", "--head", vb])\n'))
  assert.ok(a.fail, a.out)
  assert.ok(b.fail, b.out)
  assert.ok(c.fail, c.out)
})

test('verify security: VS-9 T-R-119 catches a push in the git -C argv form the scripts already use', () => {
  const r = probe('A-3', '["git", "-C", repo, "push", "origin", vb]', append('state-write.py', PY_VERIFY + '    subprocess.run(["git", "-C", repo, "push", "origin", vb], capture_output=True, text=True)\n'))
  assert.ok(r.fail, `T-R-119 passed with a verify push in the ["git", "-C", repo, "push", ...] form:\n${r.out}`)
})

test('verify security: VS-9 T-R-119 catches a shell string git -C <repo> push', () => {
  const r = probe('A-4', 'shell string git -C {repo} push', append('state-write.py', PY_VERIFY + '    subprocess.run(f"git -C {repo} push origin {vb}", shell=True)\n'))
  assert.ok(r.fail, `T-R-119 passed with a verify push in a git -C shell string:\n${r.out}`)
})

test('verify security: VS-9 T-R-119 catches a verify push in a tracker skill script', () => {
  const r = probe('A-13', 'tracker/collect.py git push of a verify name', append('tracker/collect.py', PY_VERIFY + '    subprocess.run(["git", "push", "origin", vb])\n'))
  assert.ok(r.fail, `T-R-119 does not read tracker/*.py:\n${r.out}`)
})

test('verify security: VS-9 forms outside the scripts idiom, recorded as blind spots', () => {
  const blind = [
    ['A-1', "single-quoted git(repo, 'push', ...)", append('state-write.py', PY_VERIFY + "    git(repo, 'push', '-q', 'origin', vb, check=False)\n")],
    ['A-2', 'receiver other than repo: git(root, "push", ...)', append('state-write.py', PY_VERIFY.replace('(repo,', '(root,') + '    git(root, "push", "-q", "origin", vb, check=False)\n')],
    ['A-6', "sdlc-loop.js execFileSync('git', ['push', ...])", append('sdlc-loop.js', "\nconst leakPush = g => execFileSync('git', ['push', 'origin', `sdlc/${g.id}-v${g.round}-${g.profile}-${g.part}`])\n")],
    ['A-7', 'sdlc-loop.js spawn(git, [-C, repo, push, ...])', append('sdlc-loop.js', "\nconst leakSpawn = (repo, b) => spawn('git', ['-C', repo, 'push', 'origin', b])\n")],
    ['A-8', 'gh pr create built from a list with flags between parts', append('state-write.py', PY_VERIFY + '    subprocess.run(["gh", "pr", "--repo", repo, "create", "--head", vb])\n')],
    ['A-10', 'shell string with two spaces: git  push', append('state-write.py', PY_VERIFY + '    os.system(f"git  push origin {vb}")\n')],
    ['A-11', 'push verb in a constant: git(repo, PUSH, ...)', append('state-write.py', PY_VERIFY + '    PUSH = "pu" + "sh"\n    git(repo, PUSH, "origin", vb, check=False)\n')],
    ['A-12', "template text 'git push --delete <branch>' rewritten at run time", append('state-write.py', PY_VERIFY + '    os.system("git push --delete <branch>".replace("--delete <branch>", "origin " + vb))\n')],
    ['A-16', 'the pinned run-branch push site with run rebound to a verify name', d => {
      const p = join(d, 'state-write.py')
      const src = readFileSync(p, 'utf8')
      const anchor = '    git(repo, "checkout", "-q", run)\n    before = git(repo, "rev-parse", run).stdout.strip()\n'
      assert.ok(src.includes(anchor), 'advance_run_branch anchor moved')
      writeFileSync(p, src.replace(anchor, '    run = config.get("verifyBranch") or run\n' + anchor))
    }],
  ]
  const escaped = []
  for (const [id, label, edit] of blind) {
    const r = probe(id, label, edit)
    if (r.pass) escaped.push(id)
  }
  lines.push(`blind spots that passed T-R-119: ${escaped.join(', ')}`)
  assert.deepEqual(escaped, ['A-11', 'A-16'])
})

test('verify security: VS-9 forms the guard does catch', () => {
  const caught = [
    ['A-5', 'os.system(f"git push origin {vb}")', append('state-write.py', PY_VERIFY + '    os.system(f"git push origin {vb}")\n')],
    ['A-9', 'git(repo,"push") with no spaces and a new target', append('state-write.py', PY_VERIFY + '    git(repo,"push","origin",vb)\n')],
    ['A-14', 'branches.py push of a name built from tail()', append('branches.py', '\n\ndef leak(repo, p):\n    t = tail("verify", **p)\n    subprocess.run(["git", "push", "origin", t])\n')],
    ['A-15', 'push call whose argument holds a nested call', append('state-write.py', PY_VERIFY + '    git(repo, "push", "origin", str(vb), check=False)\n')],
    ['A-17', 'sdlc-loop.js agent prompt with git push of branch(g)', d => {
      const p = join(d, 'sdlc-loop.js')
      const src = readFileSync(p, 'utf8')
      const m = src.match(/\n  const branch = g => [^\n]*\n/)
      assert.ok(m, 'the verify branch builder moved')
      writeFileSync(p, src.replace(m[0], m[0] + '  const pushIt = g => agent(`git push origin ${branch(g)}`)\n'))
    }],
    ['A-18', 'sdlc-loop.js extra use of branch(g) with no push words', d => {
      const p = join(d, 'sdlc-loop.js')
      const src = readFileSync(p, 'utf8')
      const m = src.match(/\n  const branch = g => [^\n]*\n/)
      writeFileSync(p, src.replace(m[0], m[0] + '  const publish = g => agent(`publish ${branch(g)} to origin`)\n'))
    }],
    ['A-19', 'glab mr create shell string', append('state-write.py', PY_VERIFY + '    os.system(f"glab mr create --source-branch {vb}")\n')],
  ]
  const missed = []
  for (const [id, label, edit] of caught) {
    const r = probe(id, label, edit)
    if (!r.fail) missed.push(id)
  }
  assert.deepEqual(missed, [])
})

test('verify security: VS-9 the scripts on the slice commit hold no push or request of a verify branch', () => {
  const files = []
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['__pycache__', 'node_modules', 'test', 'fixtures', 'prompts'].includes(e.name)) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(py|js|mjs|sh)$/.test(e.name)) files.push(p)
    }
  }
  walk(SKILL)
  const hits = []
  for (const f of files) {
    const flat = readFileSync(f, 'utf8').replace(/\\\n/g, ' ').replace(/\n\s*/g, ' ')
    for (const m of flat.matchAll(/["'`]push["'`][^)\]]*|\bgit\b[^"'`\n]{0,40}\bpush\b[^"'`\n]*|\b(?:pr|mr)\b["'`,\s\w-]{0,40}\bcreate\b/g)) {
      hits.push(`${f.slice(SKILL.length + 1)}: ${m[0].slice(0, 120)}`)
    }
  }
  lines.push('broad scan hits on the slice commit:', ...hits.map(h => '  ' + h))
  for (const h of hits) assert.doesNotMatch(h, /-v\$?\{|verify|branch\(g\)/, h)
  assert.ok(hits.some(h => h.startsWith('state-write.py: "push", "-q", "origin", run')), 'the broad scan is vacuous')
})

test('verify security: VS-9 T-R-119 catches a shell string git -C with a quoted repo path', () => {
  const a = probe('B-1', 'shell string with a double-quoted repo path: git -C "{repo}" push', append('state-write.py', PY_VERIFY + "    subprocess.run(f'git -C \"{repo}\" push origin {vb}', shell=True)\n"))
  const b = probe('B-2', "shell string with a single-quoted repo path: git -C '{repo}' push", append('state-write.py', PY_VERIFY + "    os.system(f\"git -C '{repo}' push origin {vb}\")\n"))
  assert.ok(a.fail, `T-R-119 passed with git -C "{repo}" push of a verify name:\n${a.out}`)
  assert.ok(b.fail, `T-R-119 passed with git -C '{repo}' push of a verify name:\n${b.out}`)
})

test('verify security: VS-9 T-R-119 catches git -C "$repo" push in a new .sh skill script', () => {
  const r = probe('B-4', 'new .sh skill script: git -C "$repo" push origin "$vb"', d => writeFileSync(join(d, 'publish.sh'), '#!/bin/sh\nrepo="$1"\nvb="sdlc/$2-v$3-$4-$5"\ngit -C "$repo" push origin "$vb"\n'))
  assert.ok(r.fail, `T-R-119 passed with a quoted git -C push in a .sh skill script:\n${r.out}`)
})

test('verify security: VS-9 T-R-119 catches a shell string git -C x push built by concatenation', () => {
  const r = probe('B-3', 'shell string built by concatenation: "git -C " + repo + " push origin "', append('state-write.py', PY_VERIFY + '    os.system("git -C " + repo + " push origin " + vb)\n'))
  assert.ok(r.fail, `T-R-119 passed with "git -C " + repo + " push origin " + vb:\n${r.out}`)
})

test('verify security: VS-9 round 2 forms outside the scripts idiom, recorded as blind spots', () => {
  const forms = [
    ['B-6', 'gh api POST to the pulls endpoint in a shell string', append('state-write.py', PY_VERIFY + '    os.system(f"gh api -X POST repos/{repo}/pulls -f head={vb} -f base=main")\n')],
    ['B-7', 'git send-pack of a verify name in the git helper', append('state-write.py', PY_VERIFY + '    git(repo, "send-pack", "origin", vb, check=False)\n')],
    ['B-8', 'git and push more than 80 characters apart in one shell string', append('state-write.py', PY_VERIFY + '    os.system(f"git -C {repo} -c user.name=sdlc-loop-bot -c user.email=sdlc-loop-bot@example.invalid -c core.hooksPath=/dev/null push origin {vb}")\n')],
    ['B-9', 'script in a skipped folder name: tracker/fixtures/publish.py', d => { mkdirSync(join(d, 'tracker', 'fixtures'), { recursive: true }); writeFileSync(join(d, 'tracker', 'fixtures', 'publish.py'), PY_VERIFY + '    subprocess.run(["git", "push", "origin", vb])\n') }],
    ['B-10', 'extensionless python script with a shebang', d => writeFileSync(join(d, 'publish'), '#!/usr/bin/env python3\nimport subprocess\n' + PY_VERIFY + '    subprocess.run(["git", "push", "origin", vb])\n')],
  ]
  const escaped = []
  for (const [id, label, edit] of forms) if (probe(id, label, edit).pass) escaped.push(id)
  lines.push(`round 2 blind spots that passed T-R-119: ${escaped.join(', ')}`)
  assert.deepEqual(escaped, ['B-6', 'B-7', 'B-8', 'B-9', 'B-10'])
})

test('verify security: VS-9 round 2 forms the guard does catch', () => {
  const forms = [
    ['B-5', 'new .sh skill script: git push with the branch on a continuation line', d => writeFileSync(join(d, 'publish2.sh'), '#!/bin/sh\nvb="sdlc/$1-v$2-$3-$4"\ngit push origin \\\n  "$vb"\n')],
    ['B-11', 'second copy of the pinned run push line, fed a verify name', append('state-write.py', PY_VERIFY + '    run = vb\n    git(repo, "push", "-q", "origin", run, check=False)\n')],
    ['B-12', 'push token in a .cjs script', d => writeFileSync(join(d, 'publish.cjs'), "const { execFileSync } = require('child_process')\nmodule.exports = (id, r, p, n) => execFileSync('git', ['push', 'origin', `sdlc/${id}-v${r}-${p}-${n}`])\n")],
    ['B-13', 'push in a tracker/template.html script', append('tracker/template.html', "\n<script>fetch('/api/git', {method: 'POST', body: JSON.stringify({args: ['push', 'origin', vb]})})</script>\n")],
    ['B-14', 'argv split: "git", "-C", repo, on one line and "push" on the next', append('state-write.py', PY_VERIFY + '    subprocess.run(["git", "-C", repo,\n                    "push", "origin", vb])\n')],
  ]
  const missed = []
  for (const [id, label, edit] of forms) if (!probe(id, label, edit).fail) missed.push(id)
  assert.deepEqual(missed, [])
})

test('verify security: VS-9 a quote-tolerant scan of every skill file finds no verify push or request', () => {
  const files = []
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['__pycache__', 'node_modules', 'test', 'fixtures', 'prompts'].includes(e.name)) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (!/\.(md|json)$/.test(e.name)) files.push(p)
    }
  }
  walk(SKILL)
  const hits = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    text.split('\n').forEach((l, i) => {
      if (/\bgit\b.*\bpush\b|["'`]push["'`]|send-pack|\/pulls\b|merge_requests|\b(?:pr|mr)\b.*\bcreate\b/.test(l)) hits.push(`${f.slice(SKILL.length + 1)}:${i + 1}: ${l.trim().slice(0, 140)}`)
    })
  }
  lines.push('quote-tolerant scan hits on the slice commit:', ...hits.map(h => '  ' + h))
  for (const h of hits) assert.doesNotMatch(h, /-v\$?\{|verify|branch\(g\)/, h)
  assert.ok(hits.some(h => h.includes('"push", "-q", "origin", run')), 'the scan is vacuous')
})
