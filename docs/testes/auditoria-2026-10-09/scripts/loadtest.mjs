// Gerador de carga mínimo: N "usuários virtuais" em laço fechado por D segundos.
// uso: node loadtest.mjs <cenario.json> <saida.json>
// cenario: { base, duration, concurrency, token, requests: [{name, method, path, body?, weight}] }
import fs from 'node:fs'

const [, , cenarioPath, outPath] = process.argv
const c = JSON.parse(fs.readFileSync(cenarioPath, 'utf8'))
const reqs = c.requests
const totalW = reqs.reduce((s, r) => s + (r.weight ?? 1), 0)
const pick = () => {
  let x = Math.random() * totalW
  for (const r of reqs) if ((x -= r.weight ?? 1) < 0) return r
  return reqs[0]
}
const fill = (s) => s.replace(/\{rand(\d+)\}/g, (_, n) => String(1 + Math.floor(Math.random() * Number(n))))

const samples = []
const t0 = performance.now()
const end = t0 + c.duration * 1000

async function vu() {
  while (performance.now() < end) {
    const r = pick()
    const s = performance.now()
    let status = 0
    try {
      const res = await fetch(c.base + fill(r.path), {
        method: r.method ?? 'GET',
        headers: { authorization: `Bearer ${r.token ?? c.token}`, 'content-type': 'application/json' },
        body: r.body ? fill(JSON.stringify(r.body)) : undefined,
        signal: AbortSignal.timeout(30000),
      })
      await res.arrayBuffer()
      status = res.status
    } catch {
      status = -1
    }
    samples.push([r.name, Math.round(s - t0), +(performance.now() - s).toFixed(2), status])
  }
}

await Promise.all(Array.from({ length: c.concurrency }, vu))
const elapsed = (performance.now() - t0) / 1000
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))]
const summarize = (rows) => {
  const lat = rows.map((x) => x[2]).sort((a, b) => a - b)
  const ok = rows.filter((x) => x[3] >= 200 && x[3] < 400).length
  return {
    count: rows.length,
    rps: +(rows.length / elapsed).toFixed(1),
    ok,
    errors: rows.length - ok,
    errorRate: +((rows.length - ok) / Math.max(1, rows.length)).toFixed(4),
    statuses: rows.reduce((m, x) => ((m[x[3]] = (m[x[3]] ?? 0) + 1), m), {}),
    p50: pct(lat, 50), p90: pct(lat, 90), p95: pct(lat, 95), p99: pct(lat, 99), max: lat.at(-1),
    mean: +(lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length)).toFixed(2),
  }
}
const byName = {}
for (const r of reqs) byName[r.name] = summarize(samples.filter((x) => x[0] === r.name))
fs.writeFileSync(outPath, JSON.stringify({ concurrency: c.concurrency, duration: elapsed, total: summarize(samples), byName, samples: c.keepSamples ? samples : undefined }))
const t = summarize(samples)
console.log(`c=${c.concurrency} rps=${t.rps} p50=${t.p50} p95=${t.p95} p99=${t.p99} err=${t.errorRate}`)
