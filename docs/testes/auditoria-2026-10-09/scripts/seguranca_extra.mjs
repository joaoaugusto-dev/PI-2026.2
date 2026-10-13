// Casos novos da 2ª rodada: ciclo de vida do token, revogação, X-Forwarded-For, CSV e uploads reais.
import fs from 'node:fs'
import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'

export async function extras({ req, caso, code, A, M, C, dir }) {
  // a força bruta do convite logo antes deixa o limite de 10/min esgotado: espera a janela virar
  await new Promise((r) => setTimeout(r, 61000))
  const segredo = fs.readFileSync(`${dir}/.jwtsecret`, 'utf8').trim()
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const assinar = (payload) => { const c = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`; return `${c}.${createHmac('sha256', segredo).update(c).digest('base64url')}` }
  const agora = Math.floor(Date.now() / 1000)
  const pM = JSON.parse(Buffer.from(M.split('.')[1], 'base64url'))
  const pC = JSON.parse(Buffer.from(C.split('.')[1], 'base64url'))

  // --- ciclo de vida do token (assinados com o segredo real do servidor de teste)
  let r = await req('GET', '/v1/emprestimos', { token: assinar({ ...pM, iat: agora - 8 * 86400, exp: agora - 86400 }) })
  caso('Sessão', 'Token da manutenção vencido há 1 dia (7 dias de validade)', '401 TOKEN_EXPIRED', code(r), r.j?.error?.code === 'TOKEN_EXPIRED')
  r = await req('GET', '/v1/consulta/ferramentas', { token: assinar({ ...pC, iat: agora - 16 * 60, exp: agora - 60 }) })
  caso('Sessão', 'Sessão do quiosque depois dos 15 min', '401 TOKEN_EXPIRED', code(r), r.j?.error?.code === 'TOKEN_EXPIRED')
  r = await req('GET', '/v1/emprestimos', { token: assinar({ ...pM, papel: 'almoxarife', exp: agora + 3600 }) })
  caso('Sessão', 'Token de versão antiga (papel almoxarife)', '401 TOKEN_OUTDATED', code(r), r.j?.error?.code === 'TOKEN_OUTDATED')
  r = await req('GET', '/v1/emprestimos', { token: assinar({ ...pC, exp: agora + 600 }) })
  caso('Sessão', 'Token de quiosque válido nas rotas do balcão', '403', code(r), r.status === 403)

  // --- revogação: operador desativado perde o acesso na requisição seguinte
  const col = (await req('POST', '/v1/colaboradores', { token: A, body: { nome: 'Operador Revogado', matricula: '0601', setorId: 1 } })).j?.data
  const conv = (await req('POST', `/v1/colaboradores/${col.id}/convite`, { token: A })).j?.data?.token
  const tokOp = (await req('POST', `/v1/auth/convites/${conv}/senha`, { body: { senha: '246813' } })).j?.data?.token
  const antes = (await req('GET', '/v1/emprestimos?limit=1', { token: tokOp })).status
  await req('DELETE', `/v1/colaboradores/${col.id}`, { token: A })
  r = await req('GET', '/v1/emprestimos?limit=1', { token: tokOp })
  caso('Sessão', 'Operador inativado pelo admin no meio da sessão de 7 dias', '401 USER_INACTIVE na próxima chamada', `antes ${antes} → depois ${code(r)}`, antes === 200 && r.j?.error?.code === 'USER_INACTIVE')

  // --- X-Forwarded-For: instância com TRUST_PROXY_HOPS=1 exposta sem proxy (porta 3997)
  const tenta = async (porta, xff) => (await fetch(`http://localhost:${porta}/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', ...(xff ? { 'x-forwarded-for': xff } : {}) }, body: JSON.stringify({ matricula: '9876', senha: '000000' }) })).status
  const exposta = []
  for (let i = 0; i < 14; i++) exposta.push(await tenta(3997, `10.0.${i}.${i}`))
  caso('Proxy', 'API com TRUST_PROXY_HOPS=1 acessada SEM proxy, IP forjado por tentativa', 'risco documentado: limite contornado', `${exposta.filter((s) => s === 429).length}/14 bloqueadas`, true, 'por isso a porta da API não pode ser publicada; só o proxy chega nela')
  const protegida = []
  for (let i = 0; i < 14; i++) protegida.push(await tenta(3998, `10.1.${i}.${i}`))
  caso('Proxy', 'Configuração atual (TRUST_PROXY_HOPS=0) ignora X-Forwarded-For forjado', '429 após 10', `${protegida.filter((s) => s === 429).length}/14 bloqueadas`, protegida.includes(429))

  // --- CSV: injeção de fórmula na exportação
  await req('POST', '/v1/colaboradores', { token: A, body: { nome: '=HYPERLINK("http://evil.example","clique")', matricula: '0602', setorId: 1 } })
  const csv = await (await fetch('http://localhost:3998/v1/exportacoes/colaboradores', { headers: { authorization: `Bearer ${A}` } })).text()
  const linha = csv.split(/\r?\n/).find((l) => l.includes('HYPERLINK')) ?? ''
  caso('CSV', 'Nome com fórmula exportado para planilha', "célula começa com ' (neutralizada)", linha.slice(0, 50), /;"'=HYPERLINK|^"'=HYPERLINK|"'=/.test(linha))

  // --- uploads reais (imagens geradas na hora)
  // gradiente + ruído leve: tamanho de arquivo parecido com foto de celular (12 MP ≈ 3,8 MB)
  const img = (w, h, q, f, ruido = 0.25) => execFileSync('python3', ['-I', '-c', `from PIL import Image; g=Image.linear_gradient('L').resize((${w},${h})).convert('RGB'); n=Image.effect_noise((${w},${h}),40).convert('RGB'); Image.blend(g,n,${ruido}).save('${f}', quality=${q})`])
  const fdir = `${dir}/imgs`; fs.mkdirSync(fdir, { recursive: true })
  img(4000, 3000, 88, `${fdir}/12mp.jpg`); img(8000, 6000, 40, `${fdir}/48mp.jpg`, 0.12); img(4000, 4000, 100, `${fdir}/grande.jpg`, 0.6)
  const fid = JSON.parse(fs.readFileSync(`${dir}/.fid`, 'utf8'))
  const up = async (f) => { const s = performance.now(); const x = await req('PUT', `/v1/ferramentas/${fid}/foto`, { token: A, raw: fs.readFileSync(f), headers: { 'content-type': 'image/jpeg' } }); return { ...x, ms: performance.now() - s, kb: Math.round(fs.statSync(f).size / 1024) } }
  let u = await up(`${fdir}/12mp.jpg`)
  const webp = u.j?.data?.foto_url ? await fetch('http://localhost:3998/v1' + u.j.data.foto_url) : null
  const tamWebp = webp ? (await webp.arrayBuffer()).byteLength : 0
  caso('Upload', `Foto de celular 12 MP (${u.kb} KB)`, '200, convertida p/ webp ≤ 1280 px', `${u.status} em ${u.ms.toFixed(0)} ms → ${Math.round(tamWebp / 1024)} KB webp`, u.status === 200 && tamWebp > 0)
  u = await up(`${fdir}/48mp.jpg`)
  caso('Upload', `Imagem de 48 MP (${u.kb} KB) acima do limite de 40 MP`, '400 (não estoura memória)', `${code(u)} em ${u.ms.toFixed(0)} ms`, u.status === 400)
  u = await up(`${fdir}/grande.jpg`)
  caso('Upload', `Arquivo de ${u.kb} KB (limite 5 MB)`, u.kb > 5120 ? '413' : '200', `${code(u)}`, u.kb > 5120 ? u.status === 413 : u.status === 200)
  const par = await Promise.all(Array.from({ length: 10 }, () => up(`${fdir}/12mp.jpg`)))
  caso('Upload', '10 fotos de 12 MP enviadas ao mesmo tempo', 'todas 200, sem derrubar a API', `${par.filter((x) => x.status === 200).length}/10 em até ${Math.max(...par.map((x) => x.ms)).toFixed(0)} ms`, par.every((x) => x.status === 200))
}
