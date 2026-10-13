// Chrome headless via CDP: screenshots + overflow horizontal + erros de console por tela e largura.
// uso: node browser.mjs <outDir> <tokenManutencao> <usuarioManutJSON> <tokenAdmin> <usuarioAdminJSON>
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const [, , outDir, tokM, usrM, tokA, usrA] = process.argv
const BASE = 'http://localhost:4173'
fs.mkdirSync(`${outDir}/shots`, { recursive: true })
const chrome = spawn('google-chrome', ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${outDir}/chrome-prof`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let wsUrl
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200)
  try { wsUrl = (await (await fetch('http://127.0.0.1:9333/json/list')).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl } catch {}
}
const ws = new WebSocket(wsUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
const logs = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') logs.push({ type: 'exception', text: m.params.exceptionDetails.exception?.description?.split('\n')[0] ?? m.params.exceptionDetails.text })
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200) })
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) logs.push({ type: 'http', text: `${m.params.response.status} ${m.params.response.url.replace(/^https?:\/\/[^/]+/, '')}` })
})
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')

async function goto(path, wait = 2500) {
  await send('Page.navigate', { url: BASE + path })
  await sleep(wait)
}
async function sessao(token, usuario) {
  await goto('/login', 800)
  await evaluate(token ? `localStorage.setItem('soufer:sessao:v2', JSON.stringify({token:${JSON.stringify(token)}, usuario:${usuario}}))` : `localStorage.clear()`)
}

const telas = [
  ['login', null, '/login'],
  ['consulta-quiosque', null, '/consulta'],
  ['dashboard', 'm', '/'],
  ['ferramentas', 'm', '/ferramentas'],
  ['ferramenta-detalhe', 'm', '/ferramentas/__FID__'],
  ['retirada', 'm', '/retiradas/nova'],
  ['devolucao', 'm', '/devolucoes'],
  ['indisponiveis', 'm', '/indisponiveis'],
  ['calendario', 'm', '/calendario'],
  ['emprestimos', 'm', '/emprestimos'],
  ['status', 'm', '/status'],
  ['cadastro-colab-como-manutencao', 'm', '/cadastros/colaboradores'],
  ['cadastro-colaboradores', 'a', '/cadastros/colaboradores'],
  ['cadastro-ferramentas', 'a', '/cadastros/ferramentas'],
  ['cadastro-setores', 'a', '/cadastros/setores'],
  ['cadastro-categorias', 'a', '/cadastros/categorias'],
  ['rota-inexistente', 'm', '/nao-existe'],
]
const fid = process.env.FID ?? '1'
const results = []
for (const width of [360, 768, 1280]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 780 : 900, deviceScaleFactor: 1, mobile: width < 768 })
  let atual = 'x'
  for (const [nome, quem, rota] of telas) {
    if (quem !== atual) { await sessao(quem === 'm' ? tokM : quem === 'a' ? tokA : null, quem === 'm' ? usrM : usrA); atual = quem }
    logs.length = 0
    const t = Date.now()
    await goto(rota.replace('__FID__', fid))
    const m = await evaluate(`(() => {
      const d = document.documentElement
      const nav = performance.getEntriesByType('navigation')[0]
      const largos = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' }).length
      return { scrollWidth: d.scrollWidth, innerWidth, overflowX: d.scrollWidth > innerWidth + 1, elementosForaDaTela: largos,
        dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null, load: nav ? Math.round(nav.loadEventEnd) : null,
        titulo: document.querySelector('h1')?.innerText?.slice(0,80) ?? null, texto404: /não encontrad/i.test(document.body.innerText),
        pequenos: [...document.querySelectorAll('button, a, input, select')].filter(e => { const r = e.getBoundingClientRect(); return r.width>0 && r.height>0 && r.height < 32 }).length }
    })()`)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    const file = `${nome}-${width}.png`
    fs.writeFileSync(`${outDir}/shots/${file}`, Buffer.from(shot.result.data, 'base64'))
    results.push({ nome, width, rota, file, ms: Date.now() - t, ...m, logs: [...logs] })
    console.log(width, nome, m?.overflowX ? 'OVERFLOW' : 'ok', m?.titulo, logs.length ? JSON.stringify(logs).slice(0, 160) : '')
  }
}
// tempo de primeira carga a frio (sem cache)
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
const frio = []
for (let i = 0; i < 5; i++) {
  await goto('/login', 2000)
  frio.push(await evaluate(`(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint'); return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: p ? Math.round(p.startTime) : null, transfer: performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize, n.transferSize) } })()`))
}
fs.writeFileSync(`${outDir}/browser.json`, JSON.stringify({ results, frio }, null, 1))
console.log('frio', JSON.stringify(frio))
ws.close(); chrome.kill()
process.exit(0)
