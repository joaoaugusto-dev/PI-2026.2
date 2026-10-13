// Chrome headless via CDP: telas x larguras (overflow, console, axe), fluxos E2E pela interface e carga em rede lenta.
// uso: node browser2.mjs <outDir> <axe.min.js>
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const [, , dir, axePath] = process.argv
const NOVO = 'http://localhost:4174', ANTIGO = 'http://localhost:4173', API = 'http://localhost:3998/v1'
const rd = (f) => fs.readFileSync(`${dir}/${f}`, 'utf8').trim()
const tokM = rd('.mtoken'), usrM = rd('.musr'), tokA = rd('.admintoken'), usrA = rd('.ausr'), FID = rd('.fid')
const AXE = fs.readFileSync(axePath, 'utf8')
fs.mkdirSync(`${dir}/shots`, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = spawn('google-chrome', ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${dir}/chrome-prof`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
let wsUrl
for (let i = 0; i < 50 && !wsUrl; i++) { await sleep(200); try { wsUrl = (await (await fetch('http://127.0.0.1:9334/json/list')).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl } catch {} }
const ws = new WebSocket(wsUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map(), logs = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') logs.push({ type: 'exception', text: m.params.exceptionDetails.exception?.description?.split('\n')[0] ?? m.params.exceptionDetails.text })
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push({ type: 'error', text: m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200) })
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) logs.push({ type: 'http', text: `${m.params.response.status} ${m.params.response.url.replace(/^https?:\/\/[^/]+/, '')}` })
})
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
const goto = async (url, wait = 2200) => { await send('Page.navigate', { url }); await sleep(wait) }
const esperar = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return Date.now() - t; await sleep(100) } throw new Error('timeout: ' + expr) }
const digitar = async (txt) => send('Input.insertText', { text: txt })
const enter = async () => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? { text: '\r' } : {}) }) }
const clicarTexto = (sel, txt) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.innerText.trim().startsWith(${JSON.stringify(txt)}) && !x.disabled); if (e) { e.click(); return true } return false })()`)
const focar = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e?.focus(); return !!e })()`)
const sessao = async (base, token, usuario) => { await goto(base + '/login', 700); await ev(token ? `localStorage.setItem('soufer:sessao:v2', JSON.stringify({token:${JSON.stringify(token)}, usuario:${usuario}}))` : 'localStorage.clear()') }
const api = async (path, token = tokM) => (await fetch(API + path, { headers: { authorization: `Bearer ${token}` } })).json()

// ---------------- A) telas x larguras
const telas = [['login', null, '/login'], ['consulta-quiosque', null, '/consulta'], ['dashboard', 'm', '/'], ['ferramentas', 'm', '/ferramentas'],
  ['ferramenta-detalhe', 'm', `/ferramentas/${FID}`], ['retirada', 'm', '/retiradas/nova'], ['devolucao', 'm', '/devolucoes'], ['indisponiveis', 'm', '/indisponiveis'],
  ['calendario', 'm', '/calendario'], ['emprestimos', 'm', '/emprestimos'], ['cadastro-colab-como-manutencao', 'm', '/cadastros/colaboradores'], ['rota-inexistente', 'm', '/nao-existe'],
  ['status', 'a', '/status'], ['cadastro-colaboradores', 'a', '/cadastros/colaboradores'], ['cadastro-ferramentas', 'a', '/cadastros/ferramentas'],
  ['cadastro-setores', 'a', '/cadastros/setores'], ['cadastro-categorias', 'a', '/cadastros/categorias']]
const results = []
for (const width of [360, 768, 1280]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 780 : 900, deviceScaleFactor: 1, mobile: width < 768 })
  let atual = 'x'
  for (const [nome, quem, rota] of telas) {
    if (quem !== atual) { await sessao(NOVO, quem === 'm' ? tokM : quem === 'a' ? tokA : null, quem === 'm' ? usrM : usrA); atual = quem }
    logs.length = 0
    await goto(NOVO + rota)
    const m = await ev(`(() => { const d = document.documentElement
      return { scrollWidth: d.scrollWidth, overflowX: d.scrollWidth > innerWidth + 1, titulo: document.querySelector('header h1')?.innerText ?? document.querySelector('h1')?.innerText ?? null,
        aba: document.title, texto404: /não existe ou mudou de lugar/i.test(document.body.innerText) } })()`)
    let axe = null
    if (width !== 768) {
      await ev(AXE + ';true')
      axe = await ev(`axe.run(document, { resultTypes: ['violations'] }).then(r => r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })))`)
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(`${dir}/shots/${nome}-${width}.png`, Buffer.from(shot.result.data, 'base64'))
    results.push({ nome, width, rota, ...m, axe, logs: [...logs] })
    console.log(width, nome, m.overflowX ? 'OVERFLOW' : 'ok', '|', m.titulo, '| axe', axe ? axe.length : '-', logs.length ? JSON.stringify(logs).slice(0, 140) : '')
  }
}

// ---------------- B) fluxos ponta a ponta pela interface (1280 px)
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
const fluxos = []
async function fluxo(nome, fn) {
  const t = Date.now()
  try { const det = await fn(); fluxos.push({ nome, ok: true, ms: Date.now() - t, ...det }); console.log('E2E OK', nome, Date.now() - t, 'ms', JSON.stringify(det)) }
  catch (e) { fluxos.push({ nome, ok: false, ms: Date.now() - t, erro: String(e.message) }); console.log('E2E FALHOU', nome, e.message) ; await send('Page.captureScreenshot', { format: 'png' }).then((s) => fs.writeFileSync(`${dir}/shots/falha-${nome.replace(/\W+/g, '-')}.png`, Buffer.from(s.result.data, 'base64'))) }
}
await fluxo('Login digitando matrícula e PIN', async () => {
  await sessao(NOVO, null); await goto(NOVO + '/login', 1500)
  await focar('input[inputmode=numeric]'); await digitar('0100')
  const ok = await ev(`(() => { const i = [...document.querySelectorAll('input')].filter(x => x.inputMode === 'numeric'); i[i.length-1].focus(); return i.length })()`)
  await digitar('735204'); await enter()
  const ms = await esperar(`location.pathname === '/' && !!document.querySelector('header h1')`, 10000)
  return { camposNumericos: ok, aposEnterMs: ms }
})
const disp = (await api('/ferramentas?status=disponivel&limit=3&page=7')).data
const alvo = disp[0]
const codigo = String(alvo.codigo_identificacao).padStart(4, '0')
await fluxo('Retirada pelo leitor (código + Enter, matrícula + Enter, setor, Hoje, confirmar)', async () => {
  await sessao(NOVO, tokM, usrM); await goto(NOVO + '/retiradas/nova', 1800)
  const t0 = Date.now()
  await focar('input[placeholder^="Código de patrimônio"]'); await digitar(codigo); await enter()
  const reconhecida = await esperar(`document.body.innerText.includes(${JSON.stringify(alvo.nome)})`)
  await focar('input[placeholder^="Matrícula ou nome"]'); await digitar('0300'); await enter()
  await esperar(`document.body.innerText.includes('Colaborador Ensaio 201')`)
  if (!(await clicarTexto('button', 'Usinagem'))) throw new Error('setor não encontrado')
  if (!(await clicarTexto('button', 'Hoje'))) throw new Error('botão Hoje não encontrado')
  await esperar(`[...document.querySelectorAll('button[type=submit]')].some(b => !b.disabled)`)
  await ev(`document.querySelector('button[type=submit]').click()`)
  const t = Date.now(); let st
  while (Date.now() - t < 8000) { st = (await api(`/ferramentas/${alvo.id}`)).data.status; if (st === 'em_uso') break; await sleep(150) }
  if (st !== 'em_uso') throw new Error('ferramenta não ficou em_uso: ' + st)
  return { ferramenta: alvo.nome, codigoLido: codigo, reconhecimentoMs: reconhecida, operacaoMs: Date.now() - t0, statusApi: st }
})
await fluxo('Devolução com avaria (código + Enter, Avaria, descrição, confirmação)', async () => {
  await goto(NOVO + '/devolucoes', 1800)
  await focar('input[placeholder^="Código de patrimônio"]'); await digitar(codigo); await enter()
  await esperar(`document.body.innerText.includes('Colaborador Ensaio 201')`)
  if (!(await clicarTexto('button, label', 'Avaria'))) throw new Error('opção Avaria não encontrada')
  await esperar(`!!document.querySelector('textarea[placeholder^="O que aconteceu"]')`)
  await focar('textarea[placeholder^="O que aconteceu"]'); await digitar('Disco empenado no uso')
  await ev(`document.querySelector('input[type=checkbox]').click()`)
  await esperar(`[...document.querySelectorAll('button[type=submit]')].some(b => !b.disabled)`)
  await ev(`document.querySelector('button[type=submit]').click()`)
  const t = Date.now(); let f
  while (Date.now() - t < 8000) { f = (await api(`/ferramentas/${alvo.id}`)).data; if (f.status === 'indisponivel') break; await sleep(150) }
  if (f.status !== 'indisponivel') throw new Error('status final ' + f.status)
  return { statusApi: f.status, motivo: f.motivo_indisponivel }
})
await fluxo('Imprimir lista de cobrança no dashboard', async () => {
  await goto(NOVO + '/', 2500)
  await ev(`window.print = () => { window.__linhas = document.querySelectorAll('.lista-impressao tbody tr').length; window.__titulos = [...document.querySelectorAll('.lista-impressao h2')].map(h => h.innerText) }`)
  if (!(await clicarTexto('button', 'Imprimir'))) throw new Error('botão Imprimir não encontrado')
  await esperar('window.__linhas !== undefined', 10000)
  const linhas = await ev('window.__linhas'), titulos = await ev('window.__titulos')
  const d = (await api('/dashboard')).data
  const esperado = d.atrasados.total + d.cobrar_hoje.total
  if (linhas !== esperado) throw new Error(`linhas ${linhas} != ${esperado}`)
  // o PDF real da impressão (mídia print, página nomeada A4) para conferir o layout
  // o componente desmonta a lista logo depois do print(): guarda uma cópia no body para o printToPDF
  await ev(`window.print = () => { const n = document.querySelector('.lista-impressao'); if (n) document.body.appendChild(n.cloneNode(true)) }`)
  await clicarTexto('button', 'Imprimir'); await sleep(1500)
  const pdf = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true })
  if (pdf.result?.data) fs.writeFileSync(`${dir}/lista-cobranca.pdf`, Buffer.from(pdf.result.data, 'base64'))
  return { linhasImpressas: linhas, esperado, secoes: titulos.join(' / ') }
})
await fluxo('Operador (manutenção) abre /cadastros pela URL', async () => {
  await goto(NOVO + '/cadastros/colaboradores', 2000)
  const r = await ev(`({ titulo: document.querySelector('header h1')?.innerText, aba: document.title, menu: [...document.querySelectorAll('nav, [data-sidebar]')].some(n => /Cadastros/.test(n.innerText)), notFound: /não existe/i.test(document.body.innerText) })`)
  if (!r.notFound || /Cadastro/.test(r.titulo) || /Cadastro/.test(r.aba) || r.menu) throw new Error(JSON.stringify(r))
  return r
})

// ---------------- C) primeira carga em rede lenta: build antigo x novo
await send('Network.setCacheDisabled', { cacheDisabled: true })
const redes = { '4G': { latency: 80, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 }, '3G': { latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 } }
const frio = []
for (const [rede, cond] of Object.entries(redes)) {
  await send('Network.emulateNetworkConditions', { offline: false, ...cond })
  for (const [build, base] of [['antigo', ANTIGO], ['novo', NOVO]]) {
    for (const [tela, rota, tok, usr] of [['login', '/login', null], ['dashboard logado', '/', tokM, usrM]]) {
      const xs = []
      for (let i = 0; i < 3; i++) {
        await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
        await goto(base + '/login', 600)
        await ev(tok ? `localStorage.setItem('soufer:sessao:v2', JSON.stringify({token:${JSON.stringify(tok)}, usuario:${usr}}))` : 'localStorage.clear()')
        await send('Network.emulateNetworkConditions', { offline: false, ...cond })
        await goto(base + rota, rede === '3G' ? 12000 : 5000)
        xs.push(await ev(`(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint').find(x => x.name === 'first-contentful-paint'); const js = performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).reduce((s, r) => s + r.transferSize, 0) + 0; return { fcp: p ? Math.round(p.startTime) : null, load: Math.round(n.loadEventEnd), js } })()`))
      }
      const med = (k) => xs.map((x) => x[k]).sort((a, b) => a - b)[1]
      frio.push({ rede, build, tela, fcp: med('fcp'), load: med('load'), jsKB: Math.round(med('js') / 1024) })
      console.log('rede', rede, build, tela, JSON.stringify(frio.at(-1)))
    }
  }
}
fs.writeFileSync(`${dir}/browser2.json`, JSON.stringify({ results, fluxos, frio }, null, 1))
ws.close(); chrome.kill(); process.exit(0)
