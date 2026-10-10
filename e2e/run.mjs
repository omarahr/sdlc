#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { e2eDir, repoRoot } from './helpers/stack.mjs'
import { pendingIds } from './helpers/scenario.mjs'

const pending = pendingIds()
process.stdout.write(`e2e: ${pending.length} pending scenarios skipped: ${pending.join(', ') || 'none'}\n`)
const testsDir = path.join(e2eDir, 'tests')
const files = fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => path.join(testsDir, f))
const proc = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: repoRoot })
process.exit(proc.status === null ? 1 : proc.status)
