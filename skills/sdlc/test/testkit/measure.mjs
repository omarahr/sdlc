import { spawnSync } from 'node:child_process'
import { arch, cpus, platform } from 'node:os'

export function sizeOf(value) {
  const text = typeof value === 'string' ? value : value === undefined || value === null ? '' : Buffer.isBuffer(value) ? value.toString('utf8') : JSON.stringify(value)
  const lines = text === '' ? 0 : text.split('\n').length
  return { chars: text.length, bytes: Buffer.byteLength(text, 'utf8'), lines, maxLineChars: text.split('\n').reduce((m, l) => Math.max(m, l.length), 0) }
}

export function environment() {
  return { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model ?? 'unknown', cpus: cpus().length }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, i)]
}

export function summarize(samplesMs) {
  const sorted = [...samplesMs].sort((a, b) => a - b)
  return { runs: sorted.length, medianMs: percentile(sorted, 50), p95Ms: percentile(sorted, 95), worstMs: sorted.at(-1) ?? null, bestMs: sorted[0] ?? null, samplesMs: [...samplesMs] }
}

export function measure(fn, { warmup = 1, runs = 5 } = {}) {
  if (!Number.isInteger(runs) || runs < 1) throw new Error('runs must be a positive integer')
  for (let i = 0; i < warmup; i++) fn()
  const samples = []
  let last
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint()
    last = fn()
    samples.push(Number(process.hrtime.bigint() - start) / 1e6)
  }
  return { ...summarize(samples), warmup, last, env: environment() }
}

export function measureCommand(command, args = [], { warmup = 1, runs = 5, spawnOptions = {}, maxBuffer = 256 * 1024 * 1024 } = {}) {
  const outputs = []
  const result = measure(() => {
    const r = spawnSync(command, args, { encoding: 'utf8', maxBuffer, ...spawnOptions })
    outputs.push(r)
    return r
  }, { warmup, runs })
  const last = outputs.at(-1)
  const { last: _drop, ...rest } = result
  return { ...rest, status: last.status, stdout: sizeOf(last.stdout), stderr: sizeOf(last.stderr), statuses: outputs.slice(warmup).map((o) => o.status) }
}

export function formatReport(report, label = 'measure') {
  const parts = [`${label}: runs=${report.runs} median=${report.medianMs.toFixed(1)}ms p95=${report.p95Ms.toFixed(1)}ms worst=${report.worstMs.toFixed(1)}ms`]
  if (report.stdout) parts.push(`stdout=${report.stdout.chars} chars`)
  if (report.stderr) parts.push(`stderr=${report.stderr.chars} chars`)
  parts.push(`env=${report.env.node} ${report.env.platform}/${report.env.arch} cpus=${report.env.cpus}`)
  return parts.join(' ')
}
