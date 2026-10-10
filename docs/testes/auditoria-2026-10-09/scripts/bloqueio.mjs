// Latência de uma rota leve (sonda a cada 50 ms) enquanto N exportações rodam. uso: node bloqueio.mjs <admin> <manut> <N> <saida>
import fs from 'node:fs'
const [, , t, m, n, out] = process.argv
const sonda = []; let fim = false
const probe = (async () => { while (!fim) { const s = performance.now(); await fetch('http://localhost:3998/v1/ferramentas/por-codigo/0123', { headers: { authorization: 'Bearer ' + m } }).then((r) => r.arrayBuffer()); sonda.push(performance.now() - s); await new Promise((r) => setTimeout(r, 50)) } })()
await new Promise((r) => setTimeout(r, 1000)); const base = [...sonda]
const s = performance.now()
const ex = await Promise.all(Array.from({ length: +n }, async () => { const a = performance.now(); const r = await fetch('http://localhost:3998/v1/exportacoes/emprestimos', { headers: { authorization: 'Bearer ' + t } }); const b = await r.arrayBuffer(); return { st: r.status, ms: Math.round(performance.now() - a), kb: Math.round(b.byteLength / 1024) } }))
const dur = performance.now() - s; const durante = sonda.slice(base.length); fim = true; await probe
const q = (a, p) => { a = [...a].sort((x, y) => x - y); return +a[Math.floor(p * (a.length - 1))].toFixed(1) }
const r = { exportacoes: +n, total_ms: Math.round(dur), exports: ex, sonda_antes: { p50: q(base, .5), max: q(base, 1) }, sonda_durante: { n: durante.length, p50: q(durante, .5), p95: q(durante, .95), max: q(durante, 1) } }
fs.writeFileSync(out, JSON.stringify(r)); console.log(JSON.stringify({ ...r, exports: undefined }), 'export ms', ex.map((x) => x.ms).join(','))
