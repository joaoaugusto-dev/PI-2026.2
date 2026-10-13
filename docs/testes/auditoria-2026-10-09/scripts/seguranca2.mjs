// Bateria de segurança: cada caso tem o esperado e o obtido. uso: node seguranca.mjs <outDir>
import fs from 'node:fs'
const dir = process.argv[2]
const rd = (f) => fs.readFileSync(`${dir}/${f}`, 'utf8').trim()
const M = rd('.mtoken'), A = rd('.admintoken'), C = rd('.ctoken'), FID = rd('.fid')
const B = 'http://localhost:3998'
const casos = []
async function req(method, path, { token, body, headers = {}, raw } = {}) {
  const h = { ...headers }
  if (token) h.authorization = `Bearer ${token}`
  if (body !== undefined && !raw) h['content-type'] = 'application/json'
  const s = performance.now()
  const r = await fetch(B + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) })
  const text = await r.text()
  let j = null; try { j = JSON.parse(text) } catch {}
  return { status: r.status, j, text, headers: r.headers, ms: performance.now() - s }
}
function caso(cat, nome, esperado, obtido, ok, nota = '') {
  casos.push({ cat, nome, esperado, obtido, ok, nota })
  console.log(ok ? 'PASS' : 'FAIL', cat, '|', nome, '|', obtido)
}
const code = (r) => `${r.status} ${r.j?.error?.code ?? ''}`.trim()
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const [h0, p0, s0] = M.split('.')
const payloadM = JSON.parse(Buffer.from(p0, 'base64url'))

// --- Autenticação
let r = await req('GET', '/v1/emprestimos'); caso('Autenticação', 'Sem token', '401', code(r), r.status === 401)
r = await req('GET', '/v1/emprestimos', { headers: { authorization: 'Token abc' } }); caso('Autenticação', 'Cabeçalho malformado', '401', code(r), r.status === 401)
r = await req('GET', '/v1/emprestimos', { token: `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...payloadM, papel: 'admin' })}.` }); caso('Autenticação', 'JWT alg=none', '401', code(r), r.status === 401)
r = await req('GET', '/v1/emprestimos', { token: `${h0}.${b64({ ...payloadM, papel: 'admin' })}.${s0}` }); caso('Autenticação', 'Payload adulterado (manutenção→admin)', '401', code(r), r.status === 401)
const { createHmac } = await import('node:crypto')
const forj = `${h0}.${b64({ ...payloadM, papel: 'admin' })}`
r = await req('GET', '/v1/emprestimos', { token: `${forj}.${createHmac('sha256', 'soufer_tools_fallback_secret').update(forj).digest('base64url')}` }); caso('Autenticação', 'JWT assinado com segredo padrão do código', '401', code(r), r.status === 401)
r = await req('GET', '/v1/emprestimos', { token: `${h0}.${b64({ ...payloadM, exp: 1 })}.${s0}` }); caso('Autenticação', 'exp alterado (token vencido)', '401', code(r), r.status === 401)

// --- Autorização entre perfis
const t = async (nome, method, path, token, esperado, body) => { const x = await req(method, path, { token, body }); caso('Autorização', nome, String(esperado), code(x), x.status === esperado) }
await t('Manutenção edita colaborador (só admin)', 'PATCH', '/v1/colaboradores/1', M, 403, { nome: 'X' })
await t('Manutenção gera link de acesso (só admin)', 'POST', '/v1/colaboradores/1/convite', M, 403)
await t('Manutenção inativa ferramenta (só admin)', 'DELETE', `/v1/ferramentas/${FID}`, M, 403)
await t('Manutenção cria setor (só admin)', 'POST', '/v1/setores', M, 403, { nome: 'Setor invasor' })
await t('Consulta lista ferramentas internas', 'GET', '/v1/ferramentas', C, 403)
await t('Consulta lê histórico de empréstimos', 'GET', '/v1/emprestimos', C, 403)
await t('Consulta lê histórico da ferramenta', 'GET', `/v1/ferramentas/${FID}/historico`, C, 403)
await t('Consulta registra retirada', 'POST', '/v1/emprestimos', C, 403, { ferramentaId: 1 })
await t('Consulta lê dashboard', 'GET', '/v1/dashboard', C, 403)
await t('Manutenção usa rota do quiosque (isolamento)', 'GET', '/v1/consulta/ferramentas', M, 403)
await t('Admin acessa rota de balcão (regra: admin ⊇ manutenção)', 'GET', '/v1/emprestimos', A, 200)
r = await req('GET', '/v1/consulta/ferramentas?limit=5', { token: C })
const campos = Object.keys(r.j?.data?.[0] ?? {})
const proibidos = campos.filter((k) => /colaborador|valor|historico|motivo|usuario/i.test(k))
caso('Autorização', 'Quiosque não expõe quem está com a ferramenta/valores', 'sem campos sensíveis', campos.join(','), r.status === 200 && proibidos.length === 0)

// --- Entrada / injeção
for (const [nome, path] of [['SQLi na busca de ferramentas', "/v1/ferramentas?q=' OR 1=1--"], ['SQLi na busca de empréstimos', "/v1/emprestimos?q=x'; DROP TABLE emprestimos;--"], ['SQLi no identificar colaborador', "/v1/colaboradores/identificar?termo=' UNION SELECT senha_hash FROM usuarios--"]]) {
  r = await req('GET', encodeURI(path), { token: M }); caso('Injeção', nome, '200/404/409 sem erro 500', code(r), r.status < 500)
}
r = await req('GET', '/v1/ferramentas/1%20OR%201=1', { token: M }); caso('Injeção', 'ID não numérico', '400', code(r), r.status === 400)
r = await req('GET', '/v1/ferramentas?q=' + 'a'.repeat(300), { token: M }); caso('Entrada', 'Busca com 300 caracteres', '400', code(r), r.status === 400)
r = await req('POST', '/v1/emprestimos', { token: M, raw: '{"ferramentaId": 1,', headers: { 'content-type': 'application/json' } }); caso('Entrada', 'JSON malformado', '400', code(r), r.status === 400, r.status === 500 ? 'cai no 500 genérico e gera log de erro' : '')
r = await req('POST', '/v1/emprestimos', { token: M, raw: JSON.stringify({ a: 'x'.repeat(11 * 1024 * 1024) }), headers: { 'content-type': 'application/json' } }); caso('Entrada', 'Corpo JSON de 11 MB', '413', code(r), r.status === 413)
r = await req('POST', '/v1/emprestimos', { token: M, body: JSON.parse('{"__proto__":{"admin":true},"ferramentaId":"abc"}') }); caso('Entrada', 'Prototype pollution + tipo inválido', '400', code(r), r.status === 400)
r = await req('PUT', `/v1/ferramentas/${FID}/foto`, { token: A, raw: 'isto não é uma imagem', headers: { 'content-type': 'image/png' } }); caso('Upload', 'Texto disfarçado de PNG', '400/415', code(r), r.status === 400 || r.status === 415)
r = await req('PUT', `/v1/ferramentas/${FID}/foto`, { token: A, raw: '<svg onload=alert(1)></svg>', headers: { 'content-type': 'image/svg+xml' } }); caso('Upload', 'SVG (vetor de XSS)', '400/415', code(r), r.status === 400 || r.status === 415)
r = await req('GET', '/v1/uploads/..%2f..%2f..%2fetc%2fpasswd'); caso('Upload', 'Path traversal em /v1/uploads', '404', String(r.status), r.status === 404 && !r.text.includes('root:'))
r = await req('GET', '/v1/uploads/'); caso('Upload', 'Listagem do diretório de fotos', '404', String(r.status), r.status === 404)

// --- Informação exposta
r = await req('GET', '/v1/emprestimos/abc/devolucao'); caso('Exposição', 'Erro não vaza stack em produção', 'sem stack', r.text.slice(0, 80), !/at .*\.js/.test(r.text))
r = await req('GET', '/'); caso('Exposição', 'Cabeçalho X-Powered-By', 'ausente', r.headers.get('x-powered-by') ?? 'ausente', !r.headers.get('x-powered-by'))
r = await req('GET', '/v1/health'); caso('Exposição', '/v1/health público', 'sem detalhes internos', JSON.stringify(r.j?.data?.database ?? {}).slice(0, 80), !r.j?.data?.database?.name, 'expõe nome do banco e ambiente (baixo risco)')
r = await req('GET', '/docs/'); caso('Exposição', 'Swagger UI em produção', 'restrito', String(r.status), r.status !== 200, 'documentação completa da API pública (baixo risco)')
const hd = (await req('GET', '/v1/health')).headers
for (const hname of ['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'x-frame-options', 'referrer-policy']) caso('Cabeçalhos', hname, 'presente', hd.get(hname) ? 'presente' : 'ausente', !!hd.get(hname))

// --- CORS
r = await req('GET', '/v1/health', { headers: { origin: 'https://evil.example' } }); caso('CORS', 'Origem não autorizada', 'sem Access-Control-Allow-Origin', r.headers.get('access-control-allow-origin') ?? 'ausente', !r.headers.get('access-control-allow-origin'))
r = await req('GET', '/v1/health', { headers: { origin: 'http://localhost:4174' } }); caso('CORS', 'Origem do front autorizada', 'http://localhost:4174', r.headers.get('access-control-allow-origin') ?? 'ausente', r.headers.get('access-control-allow-origin') === 'http://localhost:4174')
r = await req('GET', '/v1/health', { headers: { origin: 'http://localhost:5173' } }); caso('CORS', 'Origem de dev (5173) em produção', 'bloqueada', r.headers.get('access-control-allow-origin') ?? 'ausente', !r.headers.get('access-control-allow-origin'))

// --- Bloqueio por conta (0002): 5 erradas + 1 certa = 6 tentativas (cabe na janela de 10/min por IP)
await new Promise((ok) => setTimeout(ok, 61000))
const tent = []
for (let i = 0; i < 5; i++) tent.push(code(await req('POST', '/v1/auth/login', { body: { matricula: '0101', senha: '99999' + i } })))
r = await req('POST', '/v1/auth/login', { body: { matricula: '0101', senha: '123456' } })
caso('Força bruta', 'Conta bloqueia após 5 senhas erradas (mesmo com a senha certa depois)', '429 CONTA_BLOQUEADA', `${tent.join(', ')} → certa: ${code(r)}`, r.j?.error?.code === 'CONTA_BLOQUEADA')
// --- Enumeração de matrícula por tempo de resposta (2 de cada)
const tempo = async (mat) => { const xs = []; for (let i = 0; i < 2; i++) xs.push((await req('POST', '/v1/auth/login', { body: { matricula: mat, senha: '000000' } })).ms); return Math.min(...xs) }
const tInex = await tempo('9876'), tExist = await tempo('0042')
caso('Força bruta', 'Login: tempo matrícula inexistente × com conta', 'tempos parecidos', `${tInex.toFixed(0)} ms × ${tExist.toFixed(0)} ms`, tExist / tInex < 3, 'diferença permite descobrir quais matrículas têm conta (bcrypt só roda quando a conta existe)')
// --- Limite por IP: 10 já usadas na janela; as próximas devem dar 429
const lim = []
for (let i = 0; i < 3; i++) lim.push((await req('POST', '/v1/auth/login', { body: { matricula: '9876', senha: '000000' } })).status)
caso('Força bruta', 'Limite de 10 logins/min por IP', '429 a partir da 11ª', lim.join(','), lim.every((x) => x === 429))

// --- Quiosque
const qs = []
for (let i = 0; i < 7; i++) qs.push((await req('POST', '/v1/consulta/sessao', { body: { identificador: '9998' } })).status)
caso('Força bruta', 'Quiosque: 6ª falha na mesma matrícula', '429', qs.join(','), qs.slice(5).includes(429))
const qip = []
for (let i = 0; i < 30; i++) qip.push((await req('POST', '/v1/consulta/sessao', { body: { identificador: String(9000 + i) } })).status)
caso('Força bruta', 'Quiosque: varredura de matrículas por IP (30/min)', '429', `${qip.filter((s) => s === 429).length} de 30 bloqueadas`, qip.includes(429))

// --- Convite
const cv = []
for (let i = 0; i < 12; i++) cv.push((await req('GET', '/v1/auth/convites/' + 'x'.repeat(43))).status)
caso('Força bruta', 'Adivinhar link de convite (10/min)', '404 e depois 429', cv.join(','), cv.includes(429) && !cv.includes(200))

await (await import('./seguranca_extra.mjs')).extras({ req, caso, code, A, M, C, dir })
fs.writeFileSync(`${dir}/seguranca.json`, JSON.stringify(casos, null, 1))
console.log(`\n${casos.filter((c) => c.ok).length}/${casos.length} passaram`)
