// Ensaio da implantação: do banco zerado (só migrations + db:admin) até a primeira retirada.
// uso: node ensaio.mjs <outDir>   (lê o link de convite de <outDir>/db-admin.log)
import fs from 'node:fs'
const dir = process.argv[2]
const B = 'http://localhost:3998/v1'
const passos = []
async function req(method, path, { token, body, csv } = {}) {
  const h = {}
  if (token) h.authorization = `Bearer ${token}`
  if (csv) h['content-type'] = 'text/csv'
  else if (body) h['content-type'] = 'application/json'
  const s = performance.now()
  const r = await fetch(B + path, { method, headers: h, body: csv ?? (body && JSON.stringify(body)) })
  const j = await r.json().catch(() => null)
  return { status: r.status, j, ms: performance.now() - s }
}
async function passo(nome, fn) {
  const s = performance.now()
  const det = await fn()
  const ms = performance.now() - s
  passos.push({ nome, ms: +ms.toFixed(0), ...det })
  console.log(nome, ms.toFixed(0) + ' ms', JSON.stringify(det).slice(0, 160))
  return det
}
const csvDe = (cab, linhas) => [cab.map((c) => `"${c}"`).join(';'), ...linhas.map((l) => l.map((c) => `"${c}"`).join(';'))].join('\n')
const resumo = (r) => ({ status: r.status, ...(r.j?.data?.resumo ?? {}), erro: r.j?.error?.code })

const link = fs.readFileSync(`${dir}/db-admin.log`, 'utf8').match(/\/c\/([\w-]+)/)[1]
let A, M
await passo('1. Admin abre o link de convite', async () => { const r = await req('GET', `/auth/convites/${link}`); return { status: r.status, nome: r.j?.data?.nome } })
await passo('2. Admin define o PIN e entra', async () => { const r = await req('POST', `/auth/convites/${link}/senha`, { body: { senha: '482913' } }); A = r.j?.data?.token; return { status: r.status, papel: r.j?.data?.usuario?.papel } })
await passo('3. Link usado de novo é recusado', async () => { const r = await req('POST', `/auth/convites/${link}/senha`, { body: { senha: '111111' } }); return { status: r.status, erro: r.j?.error?.code } })
const setores = ['Manutenção Geral', 'Usinagem', 'Montagem', 'Caldeiraria', 'Expedição', 'Qualidade', 'Pintura', 'Elétrica']
const cats = ['Ferramentas Elétricas', 'Ferramentas Manuais', 'Ferramentas Pneumáticas', 'Instrumentos de Medição', 'Equipamentos de Solda', 'Extensões e Cabos']
const modelo = async (r) => (await fetch(`${B}/importacoes/${r}/modelo`, { headers: { authorization: `Bearer ${A}` } }).then((x) => x.text())).replace(/^﻿/, '').split(/\r?\n/)[0].split(';').map((c) => c.replace(/"/g, ''))
await passo('4. Importa setores (CSV)', async () => resumo(await req('POST', '/importacoes/setores', { token: A, csv: csvDe(await modelo('setores'), setores.map((s) => [s])) })))
await passo('5. Importa categorias (CSV)', async () => resumo(await req('POST', '/importacoes/categorias', { token: A, csv: csvDe(await modelo('categorias'), cats.map((s) => [s])) })))
const cabC = await modelo('colaboradores')
const colabs = Array.from({ length: 400 }, (_, i) => ({ matricula: String(100 + i).padStart(4, '0'), nome: `Colaborador Ensaio ${i + 1}`, setor: setores[i % setores.length] }))
await passo('6. Importa 400 colaboradores (CSV)', async () => resumo(await req('POST', '/importacoes/colaboradores', { token: A, csv: csvDe(cabC, colabs.map((c) => cabC.map((k) => c[k] ?? ''))) })))
const cabF = await modelo('ferramentas')
const tipos = ['Lixadeira', 'Extensão elétrica', 'Furadeira', 'Esmerilhadeira', 'Chave de impacto', 'Multímetro', 'Parafusadeira', 'Serra mármore', 'Torquímetro', 'Talha']
const ferr = Array.from({ length: 1000 }, (_, i) => ({ nome: `${tipos[i % 10]} ${Math.floor(i / 10) + 1}`, categoria: cats[i % cats.length], marca: ['Bosch', 'Makita', 'DeWalt'][i % 3], modelo: `M-${i}`, setor: setores[i % setores.length], localizacao: `Armário ${(i % 12) + 1}`, descricao: '', valor: '350,00' }))
await passo('7. Importa 1.000 ferramentas (CSV, banco vazio)', async () => resumo(await req('POST', '/importacoes/ferramentas', { token: A, csv: csvDe(cabF, ferr.map((f) => cabF.map((k) => f[k] ?? ''))) })))
let operador
await passo('8. Admin gera link de acesso de um operador', async () => {
  const c = (await req('GET', '/colaboradores?q=Colaborador%20Ensaio%201&limit=1', { token: A })).j.data[0]
  const r = await req('POST', `/colaboradores/${c.id}/convite`, { token: A })
  operador = r.j?.data?.token
  return { status: r.status, colaborador: c.matricula }
})
await passo('9. Operador define PIN e entra', async () => { const r = await req('POST', `/auth/convites/${operador}/senha`, { body: { senha: '735204' } }); M = r.j?.data?.token; return { status: r.status, papel: r.j?.data?.usuario?.papel } })
let emp
await passo('10. Primeira retirada (código lido + matrícula)', async () => {
  const f = (await req('GET', '/ferramentas/por-codigo/0001', { token: M })).j.data
  const c = (await req('GET', '/colaboradores/identificar?termo=0150', { token: M })).j.data
  const colab = Array.isArray(c) ? c[0] : c.colaborador ?? c
  const prev = (await req('GET', '/emprestimos/previsao-sugerida?dias=1', { token: M })).j.data.previsaoDevolucao
  const r = await req('POST', '/emprestimos', { token: M, body: { ferramentaId: f.id, colaboradorId: colab.id, setorDestinoId: colab.setor_id, previsaoDevolucao: prev } })
  emp = r.j?.data
  return { status: r.status, ferramenta: f.nome, colaborador: colab.nome, registradoPor: emp?.usuario_retirada_nome }
})
await passo('11. Dashboard reflete a retirada', async () => { const r = await req('GET', '/dashboard', { token: M }); return { status: r.status, ...r.j.data.kpis } })
await passo('12. Devolução com avaria abre ocorrência', async () => { const r = await req('PATCH', `/emprestimos/${emp.id}/devolucao`, { token: M, body: { condicaoDevolucao: 'avaria', observacaoDevolucao: 'cabo partido', custoEstimado: 80 } }); return { status: r.status, resumo: r.j?.data?.resumo } })
await passo('13. Quiosque consulta disponibilidade', async () => {
  const s = await req('POST', '/consulta/sessao', { body: { identificador: '0200' } })
  const r = await req('GET', '/consulta/ferramentas?q=lixadeira&limit=5', { token: s.j.data.token })
  return { status: r.status, total: r.j?.meta?.total, campos: Object.keys(r.j?.data?.[0] ?? {}).join(',') }
})
fs.writeFileSync(`${dir}/ensaio.json`, JSON.stringify({ passos, tokens: { A, M } }, null, 1))
