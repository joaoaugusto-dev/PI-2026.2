// Servidor da apresentação: entrega o index.html (deck inteiro embutido) e faz
// a ponte palco <-> controle do celular por SSE. Sem dependências.
//   GET  /api/sala/:id/eventos?papel=palco|controle  -> stream de eventos
//   POST /api/sala/:id/estado  {slide,total}  (palco avisa onde está)
//   POST /api/sala/:id/ir      {slide}        (controle manda ir para o slide)
//   POST /api/sala/:id/laser   {x,y,on}       (ponteiro laser, x/y de 0 a 1)
//   POST /api/sala/:id/destaque {slide,id}    (celular escolhe um objeto do mapa)
// O :id é aleatório e só aparece no QR do palco: é ele que impede um estranho
// de passar os slides.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('./index.html', import.meta.url))
const ID = /^[a-z0-9]{10,24}$/
const MAX_SALAS = 200 // ponytail: limite fixo em memória; uma instância só
const salas = new Map() // id -> { estado, clientes: Set<{res, papel}> }
const TIPOS = new Set(['celular', 'titulo', 'imagem', 'codigo', 'kpi', 'grafico', 'diagrama', 'lista', 'grupo'])
const ID_OBJETO = /^[a-z]+-\d{1,3}$/
const fracao = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0)
// mapa de objetos que o palco manda para o celular: só o formato esperado passa
function limparObjetos(lista) {
  if (!Array.isArray(lista)) return []
  return lista.slice(0, 40)
    .filter((o) => o && typeof o.id === 'string' && ID_OBJETO.test(o.id) && TIPOS.has(o.tipo))
    .map((o) => ({ id: o.id, tipo: o.tipo, nome: String(o.nome ?? '').slice(0, 60), x: fracao(o.x), y: fracao(o.y), w: fracao(o.w), h: fracao(o.h) }))
}

function abrirSala(id) {
  let s = salas.get(id)
  if (!s) {
    if (salas.size >= MAX_SALAS) return null
    s = { estado: null, clientes: new Set() }
    salas.set(id, s)
  }
  return s
}
const linha = (evento, dados) => `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`
function enviar(s, evento, dados, papel) {
  for (const c of s.clientes) if (!papel || c.papel === papel) c.res.write(linha(evento, dados))
}
function avisarPresenca(s) {
  const n = { palco: 0, controle: 0 }
  for (const c of s.clientes) n[c.papel]++
  enviar(s, 'presenca', n)
}
function lerJson(req) {
  return new Promise((ok, falha) => {
    let d = ''
    req.on('data', (c) => { d += c; if (d.length > 8192) { req.destroy(); falha() } })
    req.on('end', () => { try { ok(JSON.parse(d)) } catch { falha() } })
    req.on('error', falha)
  })
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local')
  const m = url.pathname.match(/^\/api\/sala\/([^/]+)\/(eventos|estado|ir|laser|destaque)$/)

  if (!m) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end()
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' })
    return res.end(req.method === 'HEAD' ? undefined : html)
  }

  const [, id, acao] = m
  if (!ID.test(id)) return res.writeHead(400).end()
  const s = abrirSala(id)
  if (!s) return res.writeHead(503).end()

  if (acao === 'eventos') {
    if (req.method !== 'GET') return res.writeHead(405).end()
    const papel = url.searchParams.get('papel') === 'palco' ? 'palco' : 'controle'
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })
    res.write(': ok\n\n')
    const cliente = { res, papel }
    s.clientes.add(cliente)
    if (s.estado && papel === 'controle') res.write(linha('estado', s.estado))
    avisarPresenca(s)
    const pulso = setInterval(() => res.write(': pulso\n\n'), 15000) // túnel derruba conexão parada
    req.on('close', () => {
      clearInterval(pulso)
      s.clientes.delete(cliente)
      avisarPresenca(s)
      if (!s.clientes.size) setTimeout(() => { if (!s.clientes.size) salas.delete(id) }, 60 * 60 * 1000)
    })
    return
  }

  if (req.method !== 'POST') return res.writeHead(405).end()
  let dados
  try { dados = await lerJson(req) } catch { return res.writeHead(400).end() }

  if (acao === 'laser') {
    const num = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null)
    const x = num(dados?.x), y = num(dados?.y)
    if (x === null || y === null) return res.writeHead(400).end()
    enviar(s, 'laser', { x, y, on: dados.on === true, seq: Number.isInteger(dados.seq) ? dados.seq : 0 }, 'palco')
    return res.writeHead(204).end()
  }

  const slide = dados?.slide
  if (!Number.isInteger(slide) || slide < 0 || slide > 99) return res.writeHead(400).end()

  if (acao === 'destaque') {
    const id = typeof dados.id === 'string' && ID_OBJETO.test(dados.id) ? dados.id : null
    enviar(s, 'destaque', { slide, id }, 'palco')
    return res.writeHead(204).end()
  }

  if (acao === 'estado') {
    s.estado = {
      slide,
      total: Number.isInteger(dados.total) ? dados.total : null,
      objetos: limparObjetos(dados.objetos),
      destaque: typeof dados.destaque === 'string' && ID_OBJETO.test(dados.destaque) ? dados.destaque : null,
    }
    enviar(s, 'estado', s.estado, 'controle')
  } else {
    enviar(s, 'ir', { slide }, 'palco')
  }
  res.writeHead(204).end()
}).listen(Number(process.env.PORT) || 3000, () => console.log('apresentação no ar'))
